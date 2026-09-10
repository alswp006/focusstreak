# SPEC — FocusStreak

> 포모도로 집중 타이머 · 스트릭 캘린더 · 리워드 광고 기반 주간 리포트
> Platform: 앱인토스 (Vite + React + TypeScript + TDS + React Router + localStorage)

---

## Common Principles

### CP-1. 기술 스택 / 제약
- **UI는 TDS(@toss/tds-mobile) 컴포넌트만 사용**한다. shadcn/ui, MUI, Ant Design, Chakra UI 사용 금지.
- 여백은 **TDS `Spacing`(size prop 필수)**으로만 조절한다. TDS 컴포넌트에 Tailwind/인라인 style로 padding·margin을 덮어쓰지 않는다.
- 커스텀 CSS는 TDS가 제공하지 않는 **레이아웃 배치(flex/grid)**에만 허용한다.
- 모든 페이지는 **`ScreenScaffold`**로 감싼다(raw `div` 골격 금지). 1차 액션은 **`SubmitFooter`(하단 고정)** 또는 **`display="block"` TDS Button**을 사용한다(좌측 글자폭 버튼 금지).
- 라우팅은 `react-router-dom`(BrowserRouter) 기반 클라이언트 사이드 라우팅. 하단 탭은 템플릿 제공 `src/components/FloatingTabBar` 사용(TDS에 TabBar 없음). TDS `Tab`은 화면 내부 콘텐츠 전환에만 사용.
- **서버 코드 없음.** 모든 데이터는 localStorage에 저장한다. 외부 API 호출 없음.
- 인증은 토스 앱이 자동 제공한다. 로그인 함수 호출·커스텀 인증 없음. 사용자 식별이 필요한 지점은 없으며(로컬 전용), 필요 시 `getIsTossLoginIntegratedService()`로 연동 여부만 확인한다.

### CP-2. 광고 / 수익화
- 배너: 템플릿 제공 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`
- 보상형: 템플릿 제공 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>{children}</TossRewardAd>`
- 배너는 **콘텐츠 섹션 사이 또는 콘텐츠 최하단**에만 배치하며, 어떤 경우에도 콘텐츠 위에 겹치지 않는다.
- **타이머 실행 중(state = `running`)에는 배너를 렌더링하지 않는다**(집중 방해 방지).
- 보상형 광고 게이트는 **주간 집중 리포트(S4 `/report`)** 1곳에만 적용한다.
- 프로모션 리워드는 MVP 범위에 포함하지 않는다. 추후 사용 시 `grantPromotionReward({ promotionCode, amount })`의 `amount ≤ 5000`을 코드에서 검증한다.

### CP-3. 모바일 / 접근성
- 모든 탭 가능한 요소의 터치 타깃은 **최소 44×44px**.
- 색상은 `var(--tds-color-*)` CSS 변수 또는 TDS 컴포넌트 기본값만 사용한다. **HEX 하드코딩 금지**(다크모드 필수 지원).
- 숫자 입력 필드는 `inputMode="numeric"`, 텍스트 입력은 `enterKeyHint="done"`을 지정하고, 포커스 시 하단 고정 버튼이 키보드에 가려지지 않도록 `SubmitFooter`가 키보드 위로 밀려 올라간다.
- 리스트가 100개를 초과할 수 있는 화면은 20개 단위 `더 보기` 페이지네이션을 적용한다.

### CP-4. 시간 기준
- 모든 날짜 계산은 **Asia/Seoul(KST, UTC+9)** 고정. `dateKey`는 `YYYY-MM-DD`.
- 주(week)는 **월요일 시작**, `weekKey`는 `YYYY-Www`(ISO 주차, 예: `2026-W37`).
- 타이머는 `setInterval` 카운트다운이 아니라 **`endsAt` 절대 타임스탬프 기준으로 매 틱 재계산**한다(백그라운드/절전 복귀 시 오차 방지).

### CP-5. AI 고지
- MVP는 **생성형 AI를 사용하지 않는다**. 주간 리포트·배지·랭킹은 모두 로컬 통계 연산 결과다. 따라서 생성형 AI 고지 의무 대상이 아니다.
- 추후 "AI 집중 코멘트" 등이 추가되면 (a) 첫 이용 시 "이 서비스는 생성형 AI를 활용합니다" 1회 다이얼로그, (b) 모든 AI 결과물에 "AI가 생성한 결과입니다" 배지를 반드시 추가한다. (Open Question OQ-3)

---

## Data Models

### TimerSettings — 타이머/목표 설정
```ts
export type FocusTag = 'study' | 'work' | 'exercise';

export interface TimerSettings {
  focusMin: number;      // 집중 길이(분). 정수, 5 ≤ v ≤ 60. default 25
  breakMin: number;      // 휴식 길이(분). 정수, 1 ≤ v ≤ 30. default 5
  goalMinPerDay: number; // 하루 목표 집중 분. 정수, 10 ≤ v ≤ 720. default 120
  defaultTag: FocusTag;  // default 'study'
  soundEnabled: boolean; // 종료 시 in-app 사운드(Web Audio beep). default true
  version: 1;
}
```
- key: `fs:settings:v1` · shape: `TimerSettings` (단일 객체)
- 크기: ~120 B

### FocusSession — 완료/중단된 집중 세션 1건
```ts
export interface FocusSession {
  id: string;          // crypto.randomUUID()
  dateKey: string;     // 'YYYY-MM-DD' (KST, startedAt 기준)
  startedAt: number;   // epoch ms
  endedAt: number;     // epoch ms
  plannedSec: number;  // 계획 집중 초 (focusMin * 60)
  durationSec: number; // 실제 집중 초. 0 < v ≤ plannedSec
  tag: FocusTag;
  completed: boolean;  // 계획 시간을 끝까지 채웠으면 true
}
```
- key: `fs:sessions:v1` · shape: `FocusSession[]` (최신순 정렬, `startedAt` DESC)
- **보존 정책**: 길이가 2000을 초과하면 오래된 항목부터 잘라 2000개를 유지한다.
- 크기: 1건 ≈ 190 B → 2000건 ≈ **380 KB**

### StreakState — 스트릭 집계(파생 캐시)
```ts
export interface StreakState {
  currentStreak: number;        // 오늘(또는 어제)까지 이어진 목표 달성 연속 일수. ≥ 0
  longestStreak: number;        // ≥ 0
  lastAchievedDateKey: string | null; // 마지막으로 목표를 달성한 날
  version: 1;
}
```
- key: `fs:streak:v1` · shape: `StreakState` · 크기 ~90 B
- 파생값이므로 손상 시 `fs:sessions:v1`에서 **재계산 가능**하다.

### BadgeState — 획득 배지
```ts
export type BadgeId =
  | 'first_session'  // 첫 세션 완료
  | 'daily_60'       // 하루 누적 60분
  | 'daily_180'      // 하루 누적 180분
  | 'streak_3'       // 3일 연속 목표 달성
  | 'streak_7'       // 7일 연속 목표 달성
  | 'streak_30'      // 30일 연속 목표 달성
  | 'total_1000';    // 누적 1000분

export interface BadgeState {
  unlocked: Record<BadgeId, number>; // BadgeId -> unlockedAt(epoch ms). 미획득 키는 부재
  version: 1;
}
```
- key: `fs:badges:v1` · shape: `BadgeState` · 크기 ~250 B

### FriendEntry — 로컬 공유 랭킹 참가자
```ts
export interface FriendEntry {
  id: string;        // crypto.randomUUID()
  nickname: string;  // 1~10자, 공백 trim 후 비어있지 않음
  weekKey: string;   // 'YYYY-Www'
  focusMin: number;  // 정수, 0 ≤ v ≤ 10080
  addedAt: number;   // epoch ms
}
```
- key: `fs:friends:v1` · shape: `FriendEntry[]` · 최대 **20개**
- 크기: 1건 ≈ 130 B → 20건 ≈ 2.6 KB

### ReportUnlockState — 주간 리포트 광고 해제 기록
```ts
export interface ReportUnlockState {
  unlocked: Record<string, number>; // weekKey -> unlockedAt(epoch ms)
  adFailCount: Record<string, number>; // weekKey -> 연속 광고 실패 횟수
  version: 1;
}
```
- key: `fs:report_unlock:v1` · shape: `ReportUnlockState`
- `unlocked` 항목은 최근 12개 weekKey만 유지(초과 시 오래된 것부터 삭제). 크기 ≈ 500 B

### RunningTimer — 진행 중 타이머 복원용
```ts
export type TimerPhase = 'idle' | 'running' | 'paused' | 'break';

export interface RunningTimer {
  phase: TimerPhase;
  startedAt: number;    // 현재 phase 세션의 최초 시작 시각(epoch ms)
  endsAt: number;       // 종료 예정 절대 시각(epoch ms)
  pausedAt: number | null; // phase==='paused'일 때 일시정지 시각
  accumulatedSec: number;  // 이번 세션에서 이미 집중한 초
  plannedSec: number;
  tag: FocusTag;
  version: 1;
}
```
- key: `fs:timer:v1` · shape: `RunningTimer | null` · 크기 ~160 B

### AppFlags — 온보딩/일회성 플래그
```ts
export interface AppFlags {
  onboardingSeenAt: number | null;
  version: 1;
}
```
- key: `fs:flags:v1` · 크기 ~50 B

### 총 용량 추정
| key | 최대 |
|---|---|
| `fs:sessions:v1` | 380 KB |
| `fs:friends:v1` | 2.6 KB |
| `fs:report_unlock:v1` | 0.5 KB |
| 나머지 5개 키 합 | 0.7 KB |
| **합계** | **≈ 384 KB (5MB 한도의 7.7%)** |

---

## Feature List

### F1. 저장소 계층 & 도메인 계산 (Storage + Domain Core)

- **Description**: localStorage 읽기/쓰기를 타입 안전하게 감싸는 저장소 모듈과, 세션 배열로부터 일별 합계·스트릭·배지·주간 리포트를 계산하는 순수 함수 계층을 구현한다. 모든 화면은 이 계층만 통해 데이터에 접근하며, UI 코드는 `localStorage`를 직접 호출하지 않는다. 손상된 JSON·용량 초과 같은 저장소 예외를 한 곳에서 흡수한다.
- **Data**: `TimerSettings`, `FocusSession`, `StreakState`, `BadgeState`, `FriendEntry`, `ReportUnlockState`, `RunningTimer`, `AppFlags`
- **API**: 없음 (외부 API 호출 없음)
- **Requirements**: 순수 함수 `getDailyTotalSec(sessions, dateKey)`, `computeStreak(sessions, goalMinPerDay, todayKey)`, `evaluateBadges(sessions, streak, goalMinPerDay)`, `buildWeeklyReport(sessions, weekKey, goalMinPerDay)`, `toDateKey(ms)`, `toWeekKey(ms)` 제공.

- **AC-1 [U][P0]**: Scenario: 기본값 반환
  Given `fs:settings:v1` 키가 localStorage에 없을 때
  When `loadSettings()`를 호출하면
  Then `{ focusMin: 25, breakMin: 5, goalMinPerDay: 120, defaultTag: 'study', soundEnabled: true, version: 1 }`을 반환한다
  And localStorage에 쓰기를 수행하지 않는다

- **AC-2 [W][P1]**: Scenario: 손상된 JSON 복구
  Given `fs:sessions:v1`의 값이 `"{{{not-json"`일 때
  When `loadSessions()`를 호출하면
  Then 빈 배열 `[]`을 반환한다
  And 해당 키를 `"[]"`로 덮어쓴다
  And `console.error`를 호출하지 않는다(내부 `console.warn`만 개발 모드에서 허용)

- **AC-3 [W][P1]**: Scenario: localStorage 용량 초과
  Given `saveSessions()` 호출 시 `localStorage.setItem`이 `QuotaExceededError`를 던질 때
  When 저장을 시도하면
  Then 배열의 오래된 항목 500개를 잘라내고 1회 재시도한다
  And 재시도도 실패하면 `{ ok: false, reason: 'quota' }`를 반환한다(예외를 상위로 던지지 않는다)

- **AC-4 [U][P0]**: Scenario: 세션 상한 유지
  Given `fs:sessions:v1`에 세션이 2000건 있을 때
  When `appendSession(newSession)`을 호출하면
  Then 저장된 배열 길이가 2000이 된다
  And 가장 오래된 `startedAt` 1건이 제거되고 `newSession`이 배열 맨 앞에 위치한다

- **AC-5 [U][P0]**: Scenario: 스트릭 계산
  Given `goalMinPerDay = 120`이고, 세션 합계가 `2026-09-09: 130분`, `2026-09-10: 125분`, `2026-09-11: 60분`일 때
  When `computeStreak(sessions, 120, '2026-09-11')`을 호출하면
  Then `currentStreak === 2`를 반환한다 (오늘 미달성이면 어제까지의 연속을 유지)
  And `longestStreak >= 2`이다

- **AC-6 [E][P0]**: Scenario: 배지 평가
  Given 누적 세션 합이 1000분 미만이고 하루 합계가 65분인 날이 있을 때
  When `evaluateBadges()`를 호출하면
  Then 반환 배열에 `'daily_60'`과 `'first_session'`이 포함된다
  And `'daily_180'`, `'total_1000'`은 포함되지 않는다

- **AC-7 [S][P1]**: Scenario: 데이터 로딩 중 상태
  Given 앱 최초 마운트로 저장소 hydrate가 아직 끝나지 않았을 때
  While `storeStatus === 'loading'`이면
  Then `useFocusStore()`는 `{ status: 'loading', sessions: [] }`를 반환한다
  And 화면은 TDS `Skeleton`을 렌더링하고 빈 상태 문구를 렌더링하지 않는다

- **AC-8 [W][P1]**: Scenario: 잘못된 dateKey 방어
  Given `toDateKey`에 `NaN`이 전달될 때
  When 호출하면
  Then `'1970-01-01'`이 아닌 현재 시각 기준 `dateKey`를 반환한다
  And 예외를 던지지 않는다

---

### F2. 포모도로 타이머 (Timer Core + 홈 화면)

- **Description**: 설정된 집중 시간(기본 25분)과 휴식 시간(기본 5분)을 오가는 포모도로 타이머를 제공한다. 남은 시간은 `endsAt` 절대 타임스탬프로 매 250ms 재계산하여 백그라운드 복귀 후에도 오차가 없다. 시작/일시정지/재개/포기를 지원하고, 진행 상태는 `fs:timer:v1`에 저장되어 앱을 껐다 켜도 복원된다.
- **Data**: `RunningTimer`, `TimerSettings`, `FocusSession`
- **API**: 없음
- **Requirements**: 홈 화면(S1 `/`)에 원형 진행 인디케이터 + 남은 시간(mm:ss) + 1차 액션 버튼.

- **AC-1 [E][P0]**: Scenario: 타이머 시작
  Given `focusMin = 25`, `phase = 'idle'`이고 현재 시각이 `T`일 때
  When `data-testid="timer-primary-button"`("집중 시작") 버튼을 탭하면
  Then `fs:timer:v1`에 `{ phase: 'running', plannedSec: 1500, endsAt: T + 1500000, accumulatedSec: 0 }`가 저장된다
  And 화면에 `25:00`이 표시되고 1초 후 `24:59`로 변한다

- **AC-2 [E][P0]**: Scenario: 백그라운드 복귀 시 시각 보정
  Given `endsAt = T + 1500000`인 `running` 상태에서 앱이 백그라운드로 전환되고 600초 후 복귀할 때
  When `visibilitychange`로 `visible` 이벤트가 발생하면
  Then 화면 표시가 `15:00`으로 갱신된다(오차 ±1초 이내)
  And 경과분을 보상하기 위한 별도 카운트다운 재생을 하지 않는다

- **AC-3 [E][P0]**: Scenario: 집중 완료 → 태그 저장
  Given `plannedSec = 1500`인 `running` 상태에서 `Date.now() >= endsAt`가 될 때
  When 타이머 틱이 실행되면
  Then TDS `BottomSheet`(`data-testid="tag-sheet"`)가 열려 태그 Chip 3개(`공부`/`업무`/`운동`)를 표시한다
  And 사용자가 `공부`를 선택하고 "저장"을 탭하면 `FocusSession { durationSec: 1500, plannedSec: 1500, tag: 'study', completed: true }`가 `fs:sessions:v1`에 추가된다
  And TDS `Toast`에 `"25분 집중 완료!"`가 표시된다

- **AC-4 [E][P0]**: Scenario: 중도 포기 시 부분 기록
  Given `plannedSec = 1500`이고 `accumulatedSec = 420`인 `running` 상태일 때
  When "포기" 버튼 탭 → TDS `AlertDialog`의 "포기하기"를 확인하면
  Then `FocusSession { durationSec: 420, completed: false }`가 저장된다
  And `fs:timer:v1`이 `null`로 초기화되고 `phase = 'idle'`이 된다

- **AC-5 [W][P1]**: Scenario: 60초 미만 세션 폐기
  Given `accumulatedSec = 45`인 `running` 상태일 때
  When "포기"를 확인하면
  Then 세션이 저장되지 않는다(`fs:sessions:v1` 길이 불변)
  And TDS `Toast`에 `"1분 미만은 기록되지 않아요"`가 표시된다

- **AC-6 [S][P1]**: Scenario: 일시정지 상태
  While `phase === 'paused'`이면
  Then 1차 버튼 라벨이 `"이어서 집중"`이고 남은 시간 표시가 정지된다
  And 화면 하단 `AdSlot` 배너가 렌더링된다(`running`일 때는 렌더링되지 않는다)

- **AC-7 [E][P1]**: Scenario: 앱 재실행 시 복원
  Given `fs:timer:v1`에 `{ phase: 'running', endsAt: Date.now() + 300000 }`이 저장된 상태에서 앱을 재실행할 때
  When 홈 화면이 마운트되면
  Then `05:00` 부근(±1초)의 남은 시간이 표시되고 `phase = 'running'`으로 복원된다

- **AC-8 [W][P1]**: Scenario: 만료된 타이머 복원
  Given `fs:timer:v1`의 `endsAt`가 현재 시각보다 3시간 이상 과거일 때
  When 앱이 마운트되면
  Then 세션을 자동 저장하지 않고 `fs:timer:v1`을 `null`로 초기화한다
  And TDS `Toast`에 `"진행 중이던 타이머를 종료했어요"`가 표시된다

---

### F3. 세션 태그 & 일별 기록 목록

- **Description**: 저장된 집중 세션을 태그(공부/업무/운동)별로 분류해 일자별로 조회한다. 캘린더에서 날짜를 탭하거나 홈에서 "오늘 기록"을 탭하면 해당 날짜의 세션 목록 화면으로 이동한다. 잘못 기록된 세션은 태그를 수정하거나 삭제할 수 있다.
- **Data**: `FocusSession`
- **API**: 없음
- **Requirements**: S3 `/history`. 목록은 TDS `ListRow`, 태그 필터는 TDS `Tab`.

- **AC-1 [E][P0]**: Scenario: 특정 날짜 세션 조회
  Given `2026-09-10`에 `{ tag:'study', durationSec:1500 }`, `{ tag:'work', durationSec:900 }` 세션 2건이 있을 때
  When `/history`에 `location.state = { dateKey: '2026-09-10' }`로 진입하면
  Then TDS `ListRow` 2개가 최신순으로 렌더링된다
  And 상단 요약에 `"총 40분 · 2세션"`이 표시된다

- **AC-2 [E][P0]**: Scenario: 태그 필터
  Given AC-1의 상태에서
  When TDS `Tab`의 `업무` 탭을 탭하면
  Then `ListRow`가 1개만 남고 요약이 `"총 15분 · 1세션"`으로 갱신된다

- **AC-3 [E][P0]**: Scenario: 세션 태그 수정
  Given `tag: 'study'`인 세션 행을 탭했을 때
  When `BottomSheet`에서 `운동` Chip 선택 후 "저장"을 탭하면
  Then 해당 `FocusSession.tag`가 `'exercise'`로 갱신되어 `fs:sessions:v1`에 반영된다
  And TDS `Toast`에 `"태그를 변경했어요"`가 표시된다

- **AC-4 [E][P0]**: Scenario: 세션 삭제
  Given 세션이 2건인 날짜에서
  When 행의 삭제 버튼 탭 → `AlertDialog` "삭제"를 확인하면
  Then `fs:sessions:v1`에서 해당 `id`가 제거되고 목록이 1건으로 갱신된다
  And 스트릭이 즉시 재계산되어 `fs:streak:v1`이 갱신된다

- **AC-5 [S][P1]**: Scenario: 빈 상태
  While 선택된 `dateKey`에 세션이 0건이면
  Then `Asset.ContentIcon`과 `"이 날은 집중 기록이 없어요"` 문구, `"타이머 시작하기"` 버튼(`display="block"`)이 표시된다
  And `ListRow`는 렌더링되지 않는다

- **AC-6 [S][P1]**: Scenario: 로딩 상태
  While `storeStatus === 'loading'`이면
  Then TDS `Skeleton` 3개가 표시되고 빈 상태 문구는 표시되지 않는다

- **AC-7 [W][P1]**: Scenario: state 없이 직접 진입
  Given `location.state`가 `null`인 채로 `/history`에 진입할 때
  When 화면이 마운트되면
  Then 오늘 `dateKey`를 기본값으로 사용하고 화면이 정상 렌더링된다
  And 리다이렉트나 에러 화면을 표시하지 않는다

- **AC-8 [W][P1]**: Scenario: 잘못된 dateKey
  Given `location.state = { dateKey: '2026-13-99' }`로 진입할 때
  When 화면이 마운트되면
  Then `"날짜 정보를 불러올 수 없어요"` 안내와 `"오늘 기록 보기"` 버튼을 표시한다
  And `console.error`를 호출하지 않는다

---

### F4. 집중 스트릭 캘린더

- **Description**: 월 단위 캘린더에 하루 집중량을 4단계 농도로 표시하고, 현재 스트릭·최장 스트릭을 상단 히어로에 노출한다. 목표(기본 120분) 달성일에는 달성 마크를 표시하며, 날짜 탭 시 F3 기록 화면으로 이동한다.
- **Data**: `FocusSession`, `StreakState`, `TimerSettings`
- **API**: 없음
- **Requirements**: S2 `/calendar`. 월 이동은 TDS `Top`의 좌/우 버튼(각 44×44px).

- **AC-1 [U][P0]**: Scenario: 농도 4단계 규칙
  Given 하루 집중 합계가 각각 `0분 / 20분 / 70분 / 130분`인 날짜 4개가 있고 `goalMinPerDay = 120`일 때
  When 캘린더가 렌더링되면
  Then 각 셀의 `data-level` 속성이 순서대로 `0`, `1`, `2`, `3`이다
  (레벨 규칙: 0분=0, 1~ goal*0.5 미만=1, goal*0.5 이상~goal 미만=2, goal 이상=3)

- **AC-2 [U][P0]**: Scenario: 스트릭 히어로 표기
  Given `currentStreak = 5`, `longestStreak = 12`일 때
  When `/calendar`가 렌더링되면
  Then `data-testid="streak-hero"` 요소 안에 CountUp으로 `5`가 표시되고 라벨 `"일 연속"`이 붙는다
  And 보조 텍스트로 `"최장 12일"`이 표시된다

- **AC-3 [E][P0]**: Scenario: 날짜 탭 → 기록 이동
  Given `2026-09-10` 셀에 기록이 있을 때
  When 해당 셀(44×44px 이상)을 탭하면
  Then `navigate('/history', { state: { dateKey: '2026-09-10' } })`가 호출된다

- **AC-4 [E][P1]**: Scenario: 월 이동
  Given 현재 표시 월이 `2026-09`일 때
  When `Top`의 이전 달 버튼을 탭하면
  Then 표시 월이 `2026-08`로 바뀌고 `Top` 타이틀이 `"2026년 8월"`이 된다
  And 다음 달 버튼은 표시 월이 이번 달일 때 `disabled`가 된다(미래 월 이동 금지)

- **AC-5 [S][P1]**: Scenario: 빈 상태
  While 표시 월에 세션이 0건이면
  Then 캘린더 그리드는 그대로 렌더링하되 하단에 `Asset.ContentIcon` + `"이번 달 집중 기록이 아직 없어요"`를 표시한다

- **AC-6 [S][P1]**: Scenario: 로딩 상태
  While `storeStatus === 'loading'`이면
  Then `data-testid="streak-hero"` 자리에 TDS `Skeleton`이 표시되고 캘린더 셀은 회색 플레이스홀더로 렌더링된다

- **AC-7 [W][P1]**: Scenario: 스트릭 캐시 손상 복구
  Given `fs:streak:v1`이 `{ currentStreak: -3 }`처럼 유효 범위를 벗어난 값일 때
  When `/calendar`가 마운트되면
  Then `fs:sessions:v1`로부터 스트릭을 재계산해 화면에 반영하고 캐시를 덮어쓴다
  And 화면에 음수 값이 표시되지 않는다

- **AC-8 [U][P1]**: Scenario: 배너 배치
  Given `/calendar`가 렌더링될 때
  Then `AdSlot` 배너는 캘린더 그리드와 스트릭 요약 **아래**의 독립 섹션에 1개만 렌더링된다
  And 캘린더 셀 위에 겹치지 않는다(배너 컨테이너는 `position: static`)

---

### F5. 주간 집중 리포트 (리워드 광고 게이트)

- **Description**: 최근 7일(월~일)의 집중 분포를 요약한 주간 리포트를 제공한다. 해당 주 리포트를 처음 열람할 때는 `TossRewardAd`로 보상형 광고를 시청해야 결과가 공개되며, 한 번 해제한 주는 이후 재열람 시 광고 없이 바로 열린다. 리포트에는 총 집중시간, 일평균, 목표 달성일 수, 요일별 추이, 태그 비중이 포함된다.
- **Data**: `FocusSession`, `ReportUnlockState`, `TimerSettings`
- **API**: 없음
- **Requirements**: S4 `/report`. 게이트는 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`로 결과 영역을 감싼다.

- **AC-1 [E][P0]**: Scenario: 결과 보기 전 보상형 광고
  Given `weekKey = '2026-W37'`이 `fs:report_unlock:v1.unlocked`에 없을 때
  When 사용자가 `data-testid="report-unlock-button"`("광고 보고 리포트 열기")를 탭하고 `TossRewardAd` 시청을 완료하면
  Then `unlocked['2026-W37'] = Date.now()`가 저장된다
  And 리포트 결과 카드가 화면에 표시된다

- **AC-2 [S][P0]**: Scenario: 잠금 상태 화면
  While `unlocked[currentWeekKey]`가 없으면
  Then 총 집중시간·요일별 추이·태그 비중 수치가 DOM에 렌더링되지 않는다(블러 처리만으로 감추지 않는다)
  And `data-testid="report-lock-card"` Card에 `"이번 주 리포트가 준비됐어요"` 문구와 해제 버튼(`display="block"`)이 표시된다

- **AC-3 [S][P0]**: Scenario: 해제된 주 재열람
  Given `unlocked['2026-W37']`이 존재할 때
  While 사용자가 `/report`에 다시 진입하면
  Then 광고 없이 즉시 결과 카드가 표시된다
  And `TossRewardAd`가 마운트되지 않는다

- **AC-4 [U][P0]**: Scenario: 리포트 수치 정확성
  Given `2026-W37`의 세션 합이 월 130분, 화 0분, 수 60분, 목 200분, 금 90분, 토 0분, 일 45분이고 `goalMinPerDay = 120`일 때
  When 리포트가 표시되면
  Then `data-testid="report-hero"`의 CountUp 값이 `525`(분)이다
  And `"일평균 75분"`, `"목표 달성 2일"`이 표시된다

- **AC-5 [U][P0]**: Scenario: 리포트 레이아웃 계약
  Given 리포트가 해제된 상태에서 렌더링될 때
  Then `SummaryHero`(`data-testid="report-hero"`) 1개, Card 2개(`data-testid="report-trend-card"`, `data-testid="report-tag-card"`)가 존재한다
  And `report-trend-card`는 요일 7개 값의 `Sparkline`(`data-testid="report-sparkline"`)을 포함한다
  And `report-tag-card`는 태그 3종의 `MiniBar`(`data-testid="report-tag-bar"`)를 포함하고 각 항목에 퍼센트 텍스트가 붙는다
  And 핵심 값(총 집중시간)은 t2~t3 강조 타이포로 표시된다

- **AC-6 [W][P1]**: Scenario: 광고 로드 실패
  Given `TossRewardAd`가 `onFailed`를 호출할 때
  When 실패가 발생하면
  Then TDS `Toast`에 `"광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요"`가 표시된다
  And `adFailCount[weekKey]`가 1 증가하며 화면은 잠금 상태를 유지한다
  And `console.error`를 호출하지 않는다

- **AC-7 [W][P1]**: Scenario: 광고 3회 연속 실패 시 무료 공개
  Given `adFailCount['2026-W37'] === 3`일 때
  When 사용자가 해제 버튼을 다시 탭하면
  Then 광고 없이 `unlocked['2026-W37']`이 설정되고 리포트가 표시된다
  And TDS `Toast`에 `"광고 없이 열었어요"`가 표시된다

- **AC-8 [S][P1]**: Scenario: 데이터 없는 주 / 로딩
  While `storeStatus === 'loading'`이면 `report-hero` 자리에 TDS `Skeleton`이 표시된다
  And 해제 후 해당 주 세션이 0건이면 `Asset.ContentIcon`과 `"이번 주 집중 기록이 없어요"`, `"타이머 시작하기"` 버튼이 표시되고 `report-sparkline`은 렌더링되지 않는다

---

### F6. 목표 설정 & 배지 획득

- **Description**: 사용자는 집중/휴식 길이와 하루 목표 집중시간을 설정할 수 있고, 누적 기록에 따라 7종 배지를 자동 획득한다. 세션 저장 직후 배지 조건을 평가해 새로 달성한 배지가 있으면 축하 BottomSheet를 띄운다. 배지 목록 화면에서 획득/미획득 배지와 달성 조건을 확인한다.
- **Data**: `TimerSettings`, `BadgeState`, `FocusSession`, `StreakState`
- **API**: 없음
- **Requirements**: S8 `/settings`, S6 `/badges`.

- **AC-1 [E][P0]**: Scenario: 설정 저장
  Given `/settings`에서 집중 `25 → 50`, 휴식 `5 → 10`, 목표 `120 → 180`으로 입력할 때
  When `SubmitFooter`의 "저장"을 탭하면
  Then `fs:settings:v1`이 `{ focusMin: 50, breakMin: 10, goalMinPerDay: 180 }`으로 갱신된다
  And TDS `Toast`에 `"설정을 저장했어요"`가 표시되고 `navigate(-1)`이 호출된다

- **AC-2 [W][P1]**: Scenario: 범위 밖 입력 거부
  Given `/settings`에서 집중 시간에 `0`을 입력할 때
  When "저장"을 탭하면
  Then TDS `TextField` 하단에 `"집중 시간은 5~60분 사이로 입력해주세요"`가 표시된다
  And `fs:settings:v1`은 변경되지 않는다

- **AC-3 [W][P1]**: Scenario: 비숫자 입력 거부
  Given 목표 시간 필드에 `"abc"`가 입력될 때
  When "저장"을 탭하면
  Then `"숫자만 입력해주세요"`가 표시되고 저장이 수행되지 않는다
  And 필드는 `inputMode="numeric"`으로 숫자 키패드를 띄운다

- **AC-4 [E][P0]**: Scenario: 배지 획득 알림
  Given `badges.unlocked`에 `daily_60`이 없고 오늘 누적이 55분일 때
  When `durationSec = 600`인 세션이 저장되어 누적이 65분이 되면
  Then `fs:badges:v1.unlocked.daily_60`에 현재 시각이 기록된다
  And `data-testid="badge-sheet"` BottomSheet가 열려 `"하루 60분 달성!"`이 표시된다

- **AC-5 [U][P0]**: Scenario: 배지 중복 지급 방지
  Given `unlocked.daily_60`이 이미 존재할 때
  When 오늘 누적이 다시 60분을 넘기는 세션이 저장되면
  Then `unlocked.daily_60`의 값이 변경되지 않는다
  And `badge-sheet`가 열리지 않는다

- **AC-6 [U][P1]**: Scenario: 배지 목록 표시
  Given 7종 중 3종을 획득한 상태에서 `/badges`에 진입할 때
  Then `data-testid="badge-grid"` 안에 Card 7개가 렌더링되고, 미획득 3종 이상은 흐린 상태 + 조건 텍스트(예: `"7일 연속 목표 달성"`)를 함께 표시한다
  And 상단에 `"3 / 7 획득"`이 표시된다

- **AC-7 [S][P1]**: Scenario: 배지 빈 상태 / 로딩
  While 획득 배지가 0개이면 상단에 `Asset.ContentIcon`과 `"첫 집중을 시작하면 배지가 열려요"`가 표시된다
  And `storeStatus === 'loading'`이면 Card 자리에 TDS `Skeleton` 4개가 표시된다

- **AC-8 [W][P1]**: Scenario: 목표 변경 시 스트릭 재계산
  Given `goalMinPerDay = 120`에서 `currentStreak = 5`일 때
  When 목표를 `300`으로 저장하면
  Then 스트릭이 새 목표 기준으로 즉시 재계산되어 `fs:streak:v1`에 반영된다
  And 캘린더 셀의 `data-level`도 새 목표 기준으로 갱신된다

---

### F7. 친구 집중시간 비교 랭킹 (로컬 공유)

- **Description**: 서버 없이 주간 집중시간을 문자열 코드로 주고받아 로컬 랭킹을 만든다. 사용자는 자신의 이번 주 기록을 코드로 복사해 친구에게 전달하고, 받은 코드를 붙여넣어 랭킹 목록에 추가한다. 랭킹은 이번 주(`weekKey`) 기준으로 내림차순 정렬되며 최대 20명까지 저장한다.
- **Data**: `FriendEntry`, `FocusSession`
- **API**: 없음 (코드 문자열은 로컬 인코딩/디코딩)
- **Requirements**: S7 `/rank`. 코드 포맷 = `FS1.` + base64url(JSON `{ n: string, w: string, m: number }`).

- **AC-1 [E][P0]**: Scenario: 내 코드 생성 및 복사
  Given 이번 주 내 집중 합계가 `525분`이고 닉네임이 `"민재"`, `weekKey = '2026-W37'`일 때
  When `data-testid="rank-copy-button"`("내 기록 코드 복사")를 탭하면
  Then `navigator.clipboard.writeText`에 `FS1.`로 시작하는 코드가 전달된다
  And TDS `Toast`에 `"코드를 복사했어요"`가 표시된다

- **AC-2 [E][P0]**: Scenario: 친구 코드 추가
  Given `{ n: "지훈", w: "2026-W37", m: 610 }`을 인코딩한 유효 코드가 있을 때
  When `BottomSheet`의 TDS `TextField`에 코드를 붙여넣고 "추가"를 탭하면
  Then `fs:friends:v1`에 `FriendEntry { nickname: '지훈', weekKey: '2026-W37', focusMin: 610 }`이 저장된다
  And 랭킹 목록 1위가 `"지훈 610분"`, 2위가 `"나 525분"`으로 표시된다

- **AC-3 [W][P1]**: Scenario: 잘못된 코드 거부
  Given 입력값이 `"hello-world"`일 때
  When "추가"를 탭하면
  Then `TextField` 하단에 `"코드를 확인해주세요"`가 표시된다
  And `fs:friends:v1`의 길이가 변하지 않고 예외가 던져지지 않는다

- **AC-4 [W][P1]**: Scenario: 지난 주 코드 거부
  Given 코드의 `w`가 `'2026-W36'`이고 현재 주가 `'2026-W37'`일 때
  When "추가"를 탭하면
  Then `"이번 주 기록 코드가 아니에요"`가 표시되고 저장되지 않는다

- **AC-5 [E][P1]**: Scenario: 동일 닉네임 갱신
  Given `nickname: '지훈', weekKey: '2026-W37'` 항목이 이미 있을 때
  When 같은 닉네임·같은 주의 `m: 700` 코드를 추가하면
  Then 새 항목이 추가되지 않고 기존 항목의 `focusMin`이 `700`으로 갱신된다
  And 목록 길이가 변하지 않는다

- **AC-6 [W][P1]**: Scenario: 20명 상한
  Given `fs:friends:v1`에 이번 주 항목이 20건 있을 때
  When 21번째 코드를 추가하면
  Then `"친구는 최대 20명까지 추가할 수 있어요"` Toast가 표시되고 저장되지 않는다

- **AC-7 [S][P1]**: Scenario: 빈 상태 / 로딩
  While 이번 주 친구 항목이 0건이면 `Asset.ContentIcon`과 `"친구 코드를 추가하면 순위가 보여요"`, `"코드 붙여넣기"` 버튼(`display="block"`)이 표시된다
  And `storeStatus === 'loading'`이면 TDS `Skeleton` 3개가 표시된다

- **AC-8 [W][P0]**: Scenario: 외부 공유 이탈 금지
  Given 코드 공유 기능을 사용할 때
  Then 구현은 `navigator.clipboard`(미지원 시 TDS `TextField`에 코드 표시 + 길게 눌러 복사 안내)만 사용한다
  And `window.open`, `window.location.href`, `navigator.share`로 외부 앱/웹으로 이동하지 않는다

---

### F8. 앱 셸 · 네비게이션 · 검수 정책

- **Description**: FloatingTabBar 기반 4탭 셸, 라우트 정의, 최초 진입 온보딩 1회 안내, 그리고 토스 검수 통과를 위한 전역 정책(색상 변수, 콘솔 에러 0, 외부 이탈 차단, 호환성)을 담당한다. 모든 화면은 동일한 `ScreenScaffold` 골격과 `Top` 헤더 규칙을 따른다.
- **Data**: `AppFlags`
- **API**: 없음
- **Requirements**: 탭 = 타이머 `/`, 캘린더 `/calendar`, 리포트 `/report`, 더보기 `/more`.

- **AC-1 [U][P0]**: Scenario: 라우트 정의
  Given 앱이 부팅될 때
  Then `/`, `/calendar`, `/history`, `/report`, `/more`, `/badges`, `/rank`, `/settings` 8개 라우트가 등록된다
  And 정의되지 않은 경로(`/foo`)는 `/`로 리다이렉트된다

- **AC-2 [U][P0]**: Scenario: 탭바 노출 규칙
  Given `/`, `/calendar`, `/report`, `/more` 중 하나가 활성일 때
  Then `FloatingTabBar`가 렌더링되고 활성 탭이 하이라이트된다
  And `/history`, `/badges`, `/rank`, `/settings`에서는 `FloatingTabBar`가 렌더링되지 않고 `Top`에 뒤로가기 버튼(44×44px)이 표시된다

- **AC-3 [E][P1]**: Scenario: 최초 진입 온보딩
  Given `fs:flags:v1.onboardingSeenAt`가 `null`일 때
  When 앱이 처음 마운트되면
  Then `"25분 집중 · 5분 휴식으로 시작해보세요"` 안내 `BottomSheet`가 1회 표시된다
  And "시작하기" 탭 시 `onboardingSeenAt`에 현재 시각이 저장되고 재실행 시 다시 표시되지 않는다

- **AC-4 [W][P0]**: Scenario: 외부 도메인 이탈 금지
  Given 앱 코드 전체를 정적 검사할 때
  Then `window.open(`, `window.location.href =`, `<a target="_blank">`를 사용해 외부 URL로 이동하는 코드가 0건이다
  And `"앱을 설치"`, `"다운로드"` 등 외부 앱 설치 유도 문구/배너/링크가 0건이다

- **AC-5 [U][P0]**: Scenario: 콘솔 에러 / CORS 0건
  Given 프로덕션 빌드(`vite build` 결과)를 실행하고 8개 라우트를 모두 방문할 때
  Then `console.error` 호출이 0건이다
  And 외부 네트워크 요청이 0건이므로 CORS 에러가 0건이다

- **AC-6 [W][P0]**: Scenario: 외부 로깅 금지 & HEX 하드코딩 금지
  Given 소스와 `package.json`을 검사할 때
  Then Google Analytics·Amplitude·Sentry 등 외부 분석/로깅 SDK 의존성이 0건이다
  And `src/**/*.{ts,tsx,css}`에서 `#RRGGBB` / `#RGB` 리터럴 색상 매칭이 0건이며 색상은 `var(--tds-color-*)` 또는 TDS 컴포넌트 기본값만 사용한다

- **AC-7 [U][P1]**: Scenario: Android 7+ / iOS 16+ 호환
  Given 빌드 타깃을 검사할 때
  Then `Array.prototype.at`, `Object.groupBy`, `structuredClone`, `Array.prototype.findLast`, CSS `:has()` 사용이 0건이다
  And `crypto.randomUUID` 미지원 환경을 위한 fallback(`Date.now()+Math.random()` 기반 id) 이 구현되어 있다

- **AC-8 [S][P1]**: Scenario: 전역 에러 경계
  While 하위 화면에서 렌더 예외가 발생하면
  Then `ErrorBoundary`가 `"화면을 불러오지 못했어요"` 문구와 `"다시 시도"` 버튼(`display="block"`)을 표시한다
  And 흰 화면(white screen)이 노출되지 않는다

---

## Screen Definitions

### 공통 골격
모든 화면: `ScreenScaffold` → `Top`(타이틀/뒤로가기) → 콘텐츠 → (필요 시) `SubmitFooter`. `FloatingTabBar`는 탭 화면 4곳에서만 렌더링. 모든 탭 가능 요소는 `min-height: 44px`.

---

### S1. 타이머 홈 — `/`
- **TDS 컴포넌트**: `Top`(타이틀 `"FocusStreak"`, 우측 설정 아이콘 버튼), `SummaryHero`(CountUp: 오늘 누적 분), 커스텀 원형 진행 인디케이터(SVG, 색상은 `var(--tds-color-*)`), `Paragraph.Text`(mm:ss, t1 강조), `Button`(`display="block"` 1차 액션), `Button`(variant weak, 포기), `Chip`(태그 3종), `BottomSheet`(세션 저장 태그 선택), `AlertDialog`(포기 확인), `Toast`, `Spacing`, `AdSlot`
- **레이아웃 계약**:
  - 히어로 영역 `data-testid="today-hero"`: 오늘 누적 집중 분을 CountUp으로 표시 + 목표 대비 `MiniBar`(`data-testid="today-goal-bar"`)
  - 타이머 카드 `data-testid="timer-card"`: Card 1개 안에 원형 인디케이터 + mm:ss(t2)
  - 1차 액션은 `SubmitFooter` 안의 `display="block"` Button (`data-testid="timer-primary-button"`)
  - `AdSlot`은 `timer-card` **아래** 독립 섹션, `phase !== 'running'`일 때만 렌더링
- **상태**: Loading = `today-hero`/`timer-card`에 `Skeleton` / Empty = 오늘 기록 0분이면 히어로 하단에 `"오늘 첫 집중을 시작해보세요"` / Error = 저장 실패 시 Toast `"기록을 저장하지 못했어요"`
- **터치**: 1차 버튼 높이 56px, 포기 버튼 48px, 태그 Chip 44px, 설정 아이콘 44×44px
- **네비게이션 상태 계약**:
  - Outgoing: 설정 아이콘 → `navigate('/settings')` (state 없음)
  - Outgoing: `"오늘 기록 보기"` → `navigate('/history', { state: { dateKey: string } })`
  - Incoming: `location.state`: 없음(`null` 허용)

### S2. 캘린더 — `/calendar`
- **TDS 컴포넌트**: `Top`(타이틀 `"2026년 9월"`, 좌/우 월 이동 아이콘 버튼), `SummaryHero`(`data-testid="streak-hero"`, CountUp 현재 스트릭), 커스텀 CSS grid 7열 캘린더, `Paragraph.Text`, `Spacing`, `AdSlot`, `Asset.ContentIcon`, `Skeleton`
- **레이아웃 계약**: 스트릭 히어로 → `Spacing size={24}` → 캘린더 Card(`data-testid="calendar-card"`) → 농도 범례 → `AdSlot`. 각 셀은 `data-level="0|1|2|3"`, `data-date-key="YYYY-MM-DD"` 속성 보유
- **상태**: Loading = 히어로 `Skeleton` + 셀 플레이스홀더 / Empty = 그리드 하단 `Asset.ContentIcon` + `"이번 달 집중 기록이 아직 없어요"` / Error = 스트릭 캐시 손상 시 자동 재계산(사용자 노출 없음)
- **터치**: 셀 44×44px, 월 이동 버튼 44×44px. 스크롤 = 세로 네이티브 스크롤(월 단위이므로 가상 스크롤 불필요)
- **네비게이션 상태 계약**:
  - Outgoing: 셀 탭 → `navigate('/history', { state: { dateKey: string } })`
  - Incoming: 없음

### S3. 일별 기록 — `/history`
- **TDS 컴포넌트**: `Top`(타이틀 `"9월 10일"`, 뒤로가기), `Tab`(전체/공부/업무/운동), `ListRow`(세션 1건: 좌측 태그 라벨, 중앙 `"14:20 – 14:45"`, 우측 `"25분"` + 더보기 아이콘), `BottomSheet`(태그 수정), `Chip`, `AlertDialog`(삭제 확인), `Toast`, `Asset.ContentIcon`, `Skeleton`, `Spacing`
- **레이아웃 계약**: 상단 요약 Card(`data-testid="history-summary-card"`, `"총 40분 · 2세션"` t3 강조) → `Tab` → `ListRow` 리스트. `ListRow`에 padding prop을 넣지 않으며 간격은 `Spacing`으로만 제어
- **상태**: Loading = `Skeleton` 3개 / Empty = `Asset.ContentIcon` + `"이 날은 집중 기록이 없어요"` + `"타이머 시작하기"` Button(`display="block"`) / Error = 잘못된 dateKey 시 `"날짜 정보를 불러올 수 없어요"` + `"오늘 기록 보기"` Button
- **스크롤**: 20개 렌더 후 하단 `"더 보기"` Button. 총 세션이 100건을 넘어도 DOM 노드는 페이지네이션으로 제한
- **터치**: `ListRow` 높이 ≥ 56px, 더보기 아이콘 44×44px, `Tab` 아이템 높이 48px
- **네비게이션 상태 계약**:
  - Incoming: `location.state = { dateKey: string } | null` (`null`이면 오늘로 폴백)
  - Outgoing: `"타이머 시작하기"` → `navigate('/')`; 뒤로가기 → `navigate(-1)`

### S4. 주간 리포트 — `/report`
- **TDS 컴포넌트**: `Top`(타이틀 `"주간 리포트"`), `Card`, `SummaryHero`, `TossRewardAd`, `Button`(`display="block"`), `Sparkline`, `MiniBar`, `Chip`(주차 배지 `"2026년 37주차"`), `Toast`, `Asset.ContentIcon`, `Skeleton`, `Spacing`, `AdSlot`
- **레이아웃 계약** (핵심 가치 화면):
  - 잠금 시: `data-testid="report-lock-card"` Card 1개 + 해제 Button(`data-testid="report-unlock-button"`, `SubmitFooter` 내부, `display="block"`). 잠금 상태에서 수치는 DOM에 없음
  - 해제 시: `SummaryHero`(`data-testid="report-hero"`, CountUp 총 집중 분, t2 강조 + 주차 `Chip` 배지) → Card 2개: `data-testid="report-trend-card"`(요일 7값 `Sparkline` `data-testid="report-sparkline"` + 최고 요일 라벨), `data-testid="report-tag-card"`(태그 3종 `MiniBar` `data-testid="report-tag-bar"` + 퍼센트)
  - `AdSlot`은 `report-trend-card`와 `report-tag-card` **사이** 섹션에 1개
- **상태**: Loading = `report-hero`/Card `Skeleton` / Empty = 해제 후 세션 0건이면 `Asset.ContentIcon` + `"이번 주 집중 기록이 없어요"` + `"타이머 시작하기"` Button / Error = 광고 실패 Toast `"광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요"`
- **터치**: 해제 버튼 높이 56px
- **네비게이션 상태 계약**:
  - Incoming: 없음(현재 주 자동 계산)
  - Outgoing: `"타이머 시작하기"` → `navigate('/')`

### S5. 더보기 — `/more`
- **TDS 컴포넌트**: `Top`(타이틀 `"더보기"`), `ListRow`(배지 / 친구 랭킹 / 설정, 우측 chevron), `Spacing`, `AdSlot`
- **레이아웃 계약**: `ListRow` 3개 → `Spacing size={24}` → `AdSlot`(목록 아래)
- **상태**: Loading/Empty 없음(정적 목록). Error = 없음
- **터치**: `ListRow` 높이 ≥ 56px
- **네비게이션 상태 계약**: Outgoing: `navigate('/badges')` / `navigate('/rank')` / `navigate('/settings')` (모두 state 없음). Incoming: 없음

### S6. 배지 — `/badges`
- **TDS 컴포넌트**: `Top`(타이틀 `"배지"`, 뒤로가기), `Paragraph.Text`(`"3 / 7 획득"`), `Card`(배지 1개), `Asset.ContentIcon`, `Skeleton`, `BottomSheet`(획득 축하 `data-testid="badge-sheet"`), `Spacing`
- **레이아웃 계약**: 헤더 카운트 → `data-testid="badge-grid"` (CSS grid 2열) 안에 Card 7개. 미획득 Card는 `data-locked="true"`
- **상태**: Loading = `Skeleton` 4개 / Empty = 0개 획득 시 `Asset.ContentIcon` + `"첫 집중을 시작하면 배지가 열려요"` / Error = 없음
- **터치**: 배지 Card 최소 높이 88px
- **네비게이션 상태 계약**: Incoming: 없음. Outgoing: 뒤로가기 → `navigate(-1)`

### S7. 친구 랭킹 — `/rank`
- **TDS 컴포넌트**: `Top`(타이틀 `"이번 주 랭킹"`, 뒤로가기), `ListRow`(순위·닉네임·분), `Chip`(`"나"` 표시), `Button`(`data-testid="rank-copy-button"`, `display="block"`), `BottomSheet` + `TextField`(코드 붙여넣기), `AlertDialog`(친구 삭제 확인), `Toast`, `Asset.ContentIcon`, `Skeleton`, `Spacing`
- **레이아웃 계약**: 내 기록 Card(`data-testid="rank-my-card"`, CountUp 이번 주 분) → `Spacing size={16}` → `ListRow` 랭킹 목록(최대 21행) → `SubmitFooter`에 `"내 기록 코드 복사"`(`display="block"`) + 보조 텍스트 버튼 `"친구 코드 붙여넣기"`
- **상태**: Loading = `Skeleton` 3개 / Empty = `Asset.ContentIcon` + `"친구 코드를 추가하면 순위가 보여요"` + `"코드 붙여넣기"` Button / Error = `TextField` 하단 `"코드를 확인해주세요"` / `"이번 주 기록 코드가 아니에요"`
- **키보드**: `TextField`는 `enterKeyHint="done"`, 포커스 시 `BottomSheet`가 키보드 높이만큼 상승해 "추가" 버튼이 가려지지 않는다
- **스크롤**: 최대 21행이므로 네이티브 스크롤(가상 스크롤 불필요)
- **네비게이션 상태 계약**: Incoming: 없음. Outgoing: 뒤로가기 → `navigate(-1)`

### S8. 설정 — `/settings`
- **TDS 컴포넌트**: `Top`(타이틀 `"설정"`, 뒤로가기), `TextField`(집중 분/휴식 분/목표 분, `inputMode="numeric"`), `Chip`(기본 태그 3종), `Switch`(종료 사운드 — Toggle 아님), `ListRow`(데이터 초기화), `AlertDialog`(초기화 확인), `SubmitFooter` + `Button`(`display="block"`, `"저장"`), `Toast`, `Spacing`
- **레이아웃 계약**: 섹션 Card 2개 — `data-testid="settings-timer-card"`(집중/휴식/기본 태그), `data-testid="settings-goal-card"`(목표 분 + 목표 안내 문구). 하단에 `ListRow` `"모든 기록 삭제"`
- **상태**: Loading = 필드 `Skeleton` / Empty 없음 / Error = 필드별 인라인 에러 메시지(`"집중 시간은 5~60분 사이로 입력해주세요"`, `"휴식 시간은 1~30분 사이로 입력해주세요"`, `"목표 시간은 10~720분 사이로 입력해주세요"`, `"숫자만 입력해주세요"`)
- **키보드**: 숫자 키패드 노출, 포커스된 필드가 키보드에 가려지지 않도록 스크롤 보정, `SubmitFooter`가 키보드 위로 이동
- **터치**: `TextField` 높이 ≥ 56px, `Switch` 터치 영역 44×44px, 저장 버튼 56px
- **네비게이션 상태 계약**: Incoming: 없음. Outgoing: 저장 성공 → `navigate(-1)`; 초기화 확인 → 모든 `fs:*` 키 삭제 후 `navigate('/', { replace: true })`

---

## Data Storage 요약

| Key | Shape | 최대 크기 | 손상 시 동작 |
|---|---|---|---|
| `fs:settings:v1` | `TimerSettings` | 120 B | 기본값 반환 |
| `fs:sessions:v1` | `FocusSession[]` (max 2000) | 380 KB | `[]`로 초기화 |
| `fs:timer:v1` | `RunningTimer \| null` | 160 B | `null`로 초기화 |
| `fs:streak:v1` | `StreakState` | 90 B | 세션에서 재계산 |
| `fs:badges:v1` | `BadgeState` | 250 B | 세션에서 재평가 |
| `fs:friends:v1` | `FriendEntry[]` (max 20) | 2.6 KB | `[]`로 초기화 |
| `fs:report_unlock:v1` | `ReportUnlockState` (최근 12주) | 500 B | 빈 객체로 초기화 |
| `fs:flags:v1` | `AppFlags` | 50 B | 기본값 반환 |
| **합계** | | **≈ 384 KB / 5 MB (7.7%)** | |

---

## API Contract

**외부 API 호출 없음.** 모든 데이터는 localStorage에 로컬 저장되며 네트워크 요청은 토스 SDK(광고)만 수행한다. 따라서 REST 엔드포인트, CORS 설정, 에러 코드 정의가 필요 없다.

향후 서버 기반 랭킹(OQ-2)이 도입될 경우 적용할 규약:
- Base URL: `import.meta.env.VITE_API_BASE_URL` (별도 Railway 배포)
- 에러 응답은 예외 없이 `{ error: string }` 단일 형태
- 예: `POST /rank { weekKey: string; nickname: string; focusMin: number } → { rank: number; total: number }` | errors: `400 { error: "invalid_week_key" }`, `429 { error: "rate_limited" }`, `500 { error: "internal" }`

---

## Assumptions

1. `AdSlot`, `TossRewardAd`, `TossPurchase`, localStorage helper, `FloatingTabBar`, `ScreenScaffold`, `SubmitFooter`는 템플릿에 이미 존재하며 재설계하지 않는다.
2. 광고 ID(`VITE_TOSS_AD_GROUP_ID`, `VITE_TOSS_AD_SLOT_ID`)는 앱인토스 콘솔에서 발급되어 환경변수로 주입된다(재빌드 불필요).
3. 수익 모델은 광고 단독이며 IAP(`TossPurchase`)는 MVP에서 사용하지 않는다.
4. 토스 앱이 세션을 자동 제공하므로 로그인 UI가 없다. 로컬 데이터는 기기 단위로만 존재하며 기기 간 동기화는 제공하지 않는다.
5. 푸시 알림이 없으므로 타이머 종료 알림은 앱이 포그라운드일 때의 in-app 사운드/화면 전환으로만 전달된다.
6. 시간대는 KST 고정으로 처리한다(해외 사용자 비율이 무시할 수준이라고 가정).
7. 랭킹 닉네임은 사용자가 설정 없이 기본 `"나"`로 표시되고, 코드 생성 시 `BottomSheet`에서 1회 입력받아 `fs:friends:v1`과 별도로 다루지 않는다(내 항목은 저장하지 않고 세션에서 실시간 계산).
8. 생성형 AI를 사용하지 않으므로 AI 고지 의무 대상이 아니다.

---

## Open Questions

- **OQ-1**: 닉네임을 설정 화면에 영구 저장할지, 코드 생성 시마다 입력받을지? (현재 SPEC은 코드 생성 시 입력 → 마지막 값 캐시 없음)
- **OQ-2**: 랭킹을 로컬 코드 교환이 아닌 외부 API 서버 기반으로 확장할 경우, 앱인토스 정책상 사용자 식별자를 어디까지 저장할 수 있는가?
- **OQ-3**: 주간 리포트에 "AI 집중 코멘트"를 추가할 계획이 있는가? 있다면 생성형 AI 고지 ACs(사전 고지 다이얼로그 + 결과물 라벨)를 F5에 반드시 추가해야 한다.
- **OQ-4**: 보상형 광고 3회 실패 시 무료 공개(F5 AC-7) 정책이 광고 수익 목표와 충돌하지 않는지 확인 필요.
- **OQ-5**: 타이머 종료 사운드가 토스 앱 내 웹뷰에서 Web Audio API로 재생 가능한지(iOS 자동재생 정책) 실기기 검증 필요.
- **OQ-6**: 세션 보존 상한 2000건 초과 시 오래된 기록 삭제가 스트릭 계산(최장 스트릭)에 영향을 주는데, 별도 집계 스냅샷을 남길지?