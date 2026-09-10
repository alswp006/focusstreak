# TASK — FocusStreak

> SPEC 기준 총 **64개 AC** (F1~F8 × 8) → **20개 작업 패킷**
> 순서 엄수: 타입 → 저장소/도메인 → 스토어/엔진 → 페이지(1페이지 1패킷) → 통합·검수

---

## Epic 1. 타입 & 시간 계약 (Foundation)

**Risk Assessment**
- **Complexity**: Low
- **Risk factors**
  - `RouteState`를 나중에 정의하면 `/history`의 `dateKey` 계약이 페이지별로 어긋나 런타임 크래시(실사고 SplitMate 사례)
  - KST 계산을 페이지마다 따로 구현하면 `dateKey`/`weekKey` 불일치로 캘린더·리포트 수치가 서로 다르게 나옴
  - `crypto.randomUUID` 미지원(Android 7 WebView)에서 세션 id가 `undefined`가 되어 삭제/수정 불가
- **Mitigation**: 타입·시간 유틸을 **모든 런타임 코드보다 먼저** 단일 파일로 고정. 이후 모든 패킷은 이 파일을 import만 하며 자체 날짜 계산 금지.

---

### Task 1.1 도메인 타입 + RouteState 정의
- **Description**: SPEC의 8개 데이터 모델과 화면 간 네비게이션 상태 계약을 순수 타입으로 정의한다. 런타임 코드는 작성하지 않는다(상수 테이블만 허용). `BadgeId`별 표시 라벨/조건 텍스트 상수(`BADGE_DEFS`)와 `STORAGE_KEYS`, 기본 설정값 상수(`DEFAULT_SETTINGS`)를 함께 export한다.
- **DoD**:
  - `FocusTag`, `TimerSettings`, `FocusSession`, `StreakState`, `BadgeId`, `BadgeState`, `FriendEntry`, `ReportUnlockState`, `TimerPhase`, `RunningTimer`, `AppFlags`가 SPEC 필드/제약과 1:1로 정의됨
  - `WeeklyReport` 타입 정의: `{ weekKey: string; totalMin: number; avgMin: number; goalMetDays: number; dayMin: [number,number,number,number,number,number,number]; tagMin: Record<FocusTag, number> }`
  - `RouteState` 정의:
    ```ts
    export type RouteState = {
      "/": undefined;
      "/calendar": undefined;
      "/history": { dateKey: string } | undefined;
      "/report": undefined;
      "/more": undefined;
      "/badges": undefined;
      "/rank": undefined;
      "/settings": undefined;
    };
    ```
  - `STORAGE_KEYS = { settings: 'fs:settings:v1', sessions: 'fs:sessions:v1', timer: 'fs:timer:v1', streak: 'fs:streak:v1', badges: 'fs:badges:v1', friends: 'fs:friends:v1', reportUnlock: 'fs:report_unlock:v1', flags: 'fs:flags:v1' } as const`
  - `DEFAULT_SETTINGS: TimerSettings = { focusMin: 25, breakMin: 5, goalMinPerDay: 120, defaultTag: 'study', soundEnabled: true, version: 1 }`
  - `BADGE_DEFS: Record<BadgeId, { title: string; condition: string }>` 7종 (예: `streak_7 → { title: '7일 연속', condition: '7일 연속 목표 달성' }`)
  - `LIMITS = { maxSessions: 2000, maxFriends: 20, maxUnlockWeeks: 12, minRecordSec: 60, quotaTrim: 500 }`
  - `npx tsc --noEmit` 통과, HEX 색상 리터럴 0건
- **Covers**: [기반 — 직접 AC 없음 / F1·F2·F3·F4·F5·F6·F7 전 AC의 타입 전제]
- **Files**: `src/lib/types.ts`
- **Depends on**: none

---

### Task 1.2 KST 날짜·주차 유틸 + 안전 ID 생성기
- **Description**: 모든 날짜 계산의 단일 출처. KST(UTC+9) 고정으로 `dateKey`/`weekKey`를 만들고, 월요일 시작 ISO 주차를 계산한다. `crypto.randomUUID` fallback도 여기서 제공한다.
- **DoD**:
  - `toDateKey(ms: number): string` — KST 기준 `YYYY-MM-DD`. `ms`가 `NaN`/`Infinity`/비숫자면 **예외를 던지지 않고** `Date.now()` 기준 dateKey를 반환 (`'1970-01-01'` 반환 금지)
  - `toWeekKey(ms: number): string` — `YYYY-Www` (월요일 시작). `2026-09-11`(금) → `'2026-W37'`. 잘못된 입력은 현재 시각 기준으로 폴백
  - `isValidDateKey(key: unknown): boolean` — `'2026-13-99'`, `'abc'`, `null`, `undefined` 모두 `false`; `'2026-09-10'`은 `true` (실제 달력 존재 여부까지 검사)
  - `weekRange(weekKey: string): string[]` — 월~일 7개 dateKey 배열 반환
  - `startOfMonthGrid(year, month): string[]` — 캘린더 7열 그리드용 dateKey 배열(앞뒤 빈칸은 `''`)
  - `formatMmSs(sec: number): string` — `1500 → '25:00'`, 음수는 `'00:00'`
  - `safeId(): string` — `typeof crypto?.randomUUID === 'function'`이면 사용, 아니면 `` `${Date.now()}-${Math.random().toString(36).slice(2,10)}` ``
  - `Array.prototype.at`, `Object.groupBy`, `structuredClone`, `findLast` 미사용
- **Covers**: [F1-AC8, F8-AC7]
- **Files**: `src/lib/date.ts`
- **Depends on**: Task 1.1

---

## Epic 2. 데이터 계층 (Storage → Domain → Store → Timer Engine)

**Risk Assessment**
- **Complexity**: Medium~High
- **Risk factors**
  - 손상 JSON/QuotaExceededError를 UI 계층에서 만나면 흰 화면 + `console.error` → 검수 반려(F8-AC5)
  - 세션 2000건 상한 로직과 스트릭 재계산이 한 패킷에 섞이면 10분 초과
  - 타이머를 `setInterval` 카운트다운으로 구현하면 백그라운드 복귀 시 시간이 어긋남(F2-AC2 실패)
  - 파생 캐시(`streak`/`badges`)가 원본(`sessions`)과 어긋나면 캘린더·배지 화면이 서로 다른 값 표시
- **Mitigation**: 저장소(2.1) → 순수 계산(2.2) → 코덱(2.3) → 스토어(2.4/2.5) → 엔진(2.6) 순으로 쌓아, UI 패킷은 예외 처리 코드를 한 줄도 쓰지 않는다. 파생값은 **항상 sessions에서 재계산**하고 캐시는 쓰기 전용으로만 취급한다.

---

### Task 2.1 localStorage 저장소 래퍼 (손상·용량 복구 포함)
- **Description**: 8개 키에 대한 타입 안전 read/write. 모든 예외를 이 파일에서 흡수하고, UI는 `localStorage`를 직접 호출하지 않는다.
- **DoD**:
  - `loadSettings()`: 키 부재 시 `DEFAULT_SETTINGS` 반환 + **`setItem` 호출 0회**(spy로 검증). 필드 누락 시 기본값으로 병합
  - `loadSessions()`: 값이 `"{{{not-json"`이면 `[]` 반환 + 해당 키를 `"[]"`로 덮어쓰기 + `console.error` 호출 0회(`import.meta.env.DEV`에서 `console.warn`만)
  - `loadSessions()`는 항상 `startedAt` DESC 정렬 보장, 배열이 아닌 값(객체/숫자)도 `[]`로 복구
  - `saveSessions(list)`: `setItem`이 `QuotaExceededError`(name 검사)를 던지면 가장 오래된 **500건**을 잘라 1회 재시도. 재시도 실패 시 `{ ok: false, reason: 'quota' }` 반환, 예외 상위 전파 없음. 성공 시 `{ ok: true }`
  - `appendSession(s)`: 배열 맨 앞 삽입 후 길이가 2000 초과면 오래된 `startedAt`부터 잘라 정확히 2000 유지 → 저장 결과 반환
  - `loadStreak()/saveStreak()`: `currentStreak`/`longestStreak`가 음수·비정수·비숫자면 `null` 반환(호출자가 재계산하도록)
  - `loadBadges()/saveBadges()`, `loadFriends()/saveFriends()`(비배열 → `[]`), `loadTimer()/saveTimer(null 허용)`, `loadFlags()/saveFlags()`
  - `loadReportUnlock()/saveReportUnlock()`: 저장 시 `unlocked` 키를 weekKey 내림차순 최근 **12개**만 유지, `adFailCount`도 동일 키 집합으로 정리
  - `clearAll()`: `fs:` 프리픽스 키만 삭제(다른 키 보존)
  - 모든 함수가 try/catch로 감싸져 있고, 저장소 접근 불가(Safari private mode 등)에서도 기본값을 반환
- **Covers**: [F1-AC1, F1-AC2, F1-AC3, F1-AC4]
- **Files**: `src/lib/storage.ts`
- **Depends on**: Task 1.1, Task 1.2

---

### Task 2.2 도메인 순수 계산 함수 (일별 합계·스트릭·배지·주간 리포트)
- **Description**: 세션 배열만 입력으로 받아 모든 파생 지표를 계산하는 순수 함수 모듈. localStorage·React 의존성 0.
- **DoD**:
  - `getDailyTotalSec(sessions, dateKey): number` — 해당 `dateKey` 세션 `durationSec` 합
  - `getDayLevel(totalMin, goalMinPerDay): 0|1|2|3` — `0분→0`, `1 ≤ m < goal*0.5 →1`, `goal*0.5 ≤ m < goal →2`, `m ≥ goal →3`. `goal=120`에서 `0/20/70/130 → 0/1/2/3` 단위 테스트 통과
  - `computeStreak(sessions, goalMinPerDay, todayKey): StreakState` — 오늘 미달성이면 **어제까지의 연속**을 `currentStreak`으로 유지. 픽스처 `2026-09-09:130 / 09-10:125 / 09-11:60`, goal 120, today `'2026-09-11'` → `currentStreak === 2`, `longestStreak >= 2`, `lastAchievedDateKey === '2026-09-10'`
  - 오늘 달성 시에는 오늘을 포함해 계산, 이틀 이상 공백이면 `currentStreak === 0`
  - `evaluateBadges(sessions, streak, goalMinPerDay): BadgeId[]` — 조건 충족 배지 전체 반환(획득 이력 무관). 픽스처: 누적 < 1000분, 하루 합 65분 → 결과에 `'first_session'`, `'daily_60'` 포함 / `'daily_180'`, `'total_1000'` 미포함
  - `buildWeeklyReport(sessions, weekKey, goalMinPerDay): WeeklyReport` — 픽스처(월130/화0/수60/목200/금90/토0/일45, goal 120) → `totalMin === 525`, `avgMin === 75`(총분/7 반올림), `goalMetDays === 2`, `dayMin` 길이 7, `tagMin` 3키 합 === totalMin
  - 세션 0건 입력에서 모든 함수가 예외 없이 0/빈값 반환
  - 위 픽스처 케이스가 주석 또는 `src/lib/__tests__/domain.test.ts`로 검증 가능
- **Covers**: [F1-AC5, F1-AC6, F4-AC1, F5-AC4]
- **Files**: `src/lib/domain.ts`
- **Depends on**: Task 1.1, Task 1.2

---

### Task 2.3 친구 코드 인코더/디코더 + 랭킹 규칙
- **Description**: `FS1.` + base64url 코드 생성/파싱과, 친구 목록 갱신 규칙(주차 검증·닉네임 병합·20명 상한)을 순수 함수로 구현한다. UI 메시지는 다음 패킷에서 붙인다.
- **DoD**:
  - `encodeFriendCode({ n, w, m }): string` — `'FS1.'` + base64url(JSON). `=` 패딩 제거, `+/` → `-_` 치환. `{ n:'민재', w:'2026-W37', m:525 }` 왕복 테스트 통과(한글 UTF-8 안전: `encodeURIComponent` 경유)
  - `decodeFriendCode(raw: string): { ok: true; value: {n,w,m} } | { ok: false; reason: 'format' | 'week' }` — `'hello-world'` → `{ ok:false, reason:'format' }`, 예외 미발생. `n` trim 후 1~10자, `m` 정수 0~10080 검증 실패도 `'format'`
  - `decodeFriendCode`에 현재 weekKey를 두 번째 인자로 받아 `w !== currentWeekKey`면 `{ ok:false, reason:'week' }`
  - `upsertFriend(list, entry, currentWeekKey): { ok: true; list: FriendEntry[] } | { ok: false; reason: 'limit' }` — 같은 `nickname`+`weekKey` 존재 시 **새 항목 추가 없이** `focusMin`만 갱신(길이 불변). 이번 주 항목이 이미 20건이고 신규 닉네임이면 `{ ok:false, reason:'limit' }`
  - `buildRanking(friends, myFocusMin, currentWeekKey): { rank: number; nickname: string; focusMin: number; isMe: boolean }[]` — 이번 주 항목만 필터, `focusMin` DESC, 내 항목(`isMe: true`, 기본 닉네임 `'나'`)을 합쳐 정렬. 픽스처: 친구 지훈 610 + 내 525 → 1위 지훈, 2위 나
  - `window.open`/`navigator.share` 미사용
- **Covers**: [F7-AC2, F7-AC3, F7-AC4, F7-AC5, F7-AC6]
- **Files**: `src/lib/friendCode.ts`
- **Depends on**: Task 1.1, Task 1.2

---

### Task 2.4 FocusStore Provider (hydrate + status + 파생 재계산)
- **Description**: 앱 전역 상태를 담는 React Context. 마운트 시 저장소를 hydrate하고, 파생 캐시(streak)가 손상되면 세션에서 재계산해 덮어쓴다. 읽기 전용 셀렉터까지만 이 패킷에서 구현한다(변경 액션은 2.5).
- **DoD**:
  - `FocusStoreProvider` + `useFocusStore()` 제공
  - hydrate 완료 전 `useFocusStore()`가 정확히 `{ status: 'loading', sessions: [] }` 형태(그 외 필드는 기본값)를 반환하고, 완료 후 `status === 'ready'`
  - hydrate 시 `loadStreak()`가 `null`(음수 등 손상)이면 `computeStreak(sessions, goal, todayKey)`로 재계산 → 상태 반영 + `saveStreak()` 덮어쓰기. 상태의 `currentStreak`은 절대 음수가 아님
  - hydrate 시 `settings.goalMinPerDay`가 저장된 스트릭 계산 기준과 달라도 항상 현재 설정 기준으로 재계산
  - 셀렉터 제공: `todayTotalMin`, `dailyTotalSec(dateKey)`, `weeklyReport(weekKey)`, `dayLevel(dateKey)`, `unlockedBadgeIds`
  - `Provider`가 `sessions`, `settings`, `streak`, `badges`, `friends`, `reportUnlock`, `flags`, `status`를 노출
  - `console.error` 호출 0건
- **Covers**: [F1-AC7, F4-AC7, F6-AC8]
- **Files**: `src/lib/store/FocusStoreContext.tsx`, `src/lib/store/index.ts`
- **Depends on**: Task 2.1, Task 2.2

---

### Task 2.5 스토어 변경 액션 (세션 CRUD · 설정 저장 · 배지 지급 · 초기화)
- **Description**: 상태를 바꾸는 모든 액션을 스토어에 추가한다. 세션 변경 시 스트릭·배지를 항상 함께 재계산해 화면 간 불일치를 없앤다.
- **DoD**:
  - `appendSession(input): { saved: boolean; newBadges: BadgeId[]; error?: 'quota' }` — 저장 후 스트릭 재계산·저장, `evaluateBadges` 결과 중 **`badges.unlocked`에 없는 것만** `newBadges`로 반환하고 `unlocked[id] = Date.now()` 기록
  - 이미 `unlocked.daily_60`이 있으면 재충족 시 값이 **변경되지 않고** `newBadges`가 빈 배열 (단위 테스트)
  - `durationSec < 60`이면 저장하지 않고 `{ saved: false, newBadges: [] }` 반환(sessions 길이 불변)
  - `updateSessionTag(id, tag)` — 해당 세션 tag만 갱신, 저장 후 상태 반영. 존재하지 않는 id는 무시(예외 없음)
  - `deleteSession(id)` — 제거 후 스트릭 즉시 재계산 → `fs:streak:v1` 갱신, 배지 `unlocked`는 회수하지 않음
  - `saveSettings(next)` — 저장 후 **새 목표 기준으로 스트릭 재계산 + 저장**. `goal 120 → 300` 시나리오에서 `currentStreak`이 새 기준으로 즉시 바뀜(단위 테스트)
  - `unlockReport(weekKey)`, `bumpAdFail(weekKey)`, `markOnboardingSeen()`
  - `resetAll()` — `clearAll()` 호출 후 상태를 기본값으로 재설정
  - `saveSessions`가 `{ ok:false, reason:'quota' }`를 반환하면 액션이 `error: 'quota'`를 전달하고 예외를 던지지 않음
- **Covers**: [F6-AC5, F3-AC3, F3-AC4]
- **Files**: `src/lib/store/FocusStoreContext.tsx`, `src/lib/store/actions.ts`
- **Depends on**: Task 2.4

---

### Task 2.6 타이머 엔진 훅 (`endsAt` 기준 · 복원 · 만료 처리)
- **Description**: 포모도로 상태 기계를 `useTimerEngine()` 훅으로 구현한다. UI 없음 — 값과 액션만 반환한다.
- **DoD**:
  - 반환 형태: `{ phase, remainSec, plannedSec, accumulatedSec, tag, start(tag?), pause(), resume(), giveUp(), consumeCompletion() }`
  - `start()`: `focusMin=25`, `phase='idle'`, 현재 `T`에서 호출 시 `fs:timer:v1`에 `{ phase:'running', plannedSec:1500, endsAt: T+1500000, accumulatedSec:0 }` 저장. `remainSec === 1500` → 1초 후 `1499`
  - 매 틱(250ms)마다 `remainSec = Math.max(0, Math.ceil((endsAt - Date.now())/1000))`로 **재계산**(감산 카운트다운 금지). 코드에 `remain - 1` 형태 감산 없음
  - `visibilitychange`에서 `visible`이면 즉시 재계산 1회 수행. `endsAt = T+1500000`에서 600초 후 복귀 시 `remainSec === 900`(±1초), 보정용 추가 카운트다운 로직 없음
  - `Date.now() >= endsAt`이면 `phase`를 유지한 채 `pendingCompletion = { durationSec: plannedSec, plannedSec, tag, completed: true }`를 노출(저장은 UI가 태그 확정 후 수행), 타이머 틱 정지
  - `pause()`: `pausedAt` 기록, `accumulatedSec` 누적, `remainSec` 고정(정지). `resume()`: `endsAt = Date.now() + (plannedSec - accumulatedSec)*1000`로 재계산
  - `giveUp()`: `accumulatedSec`을 담은 결과 반환 + `fs:timer:v1`을 `null`로 초기화 + `phase='idle'`. `accumulatedSec=420` → `{ durationSec:420, completed:false }`, `accumulatedSec=45` → `{ discarded: true }`
  - 마운트 시 `fs:timer:v1` 복원: `{ phase:'running', endsAt: now+300000 }` → `remainSec` 300(±1), `phase='running'`
  - 마운트 시 `endsAt`이 현재보다 **3시간 이상 과거**면 세션 저장 없이 `fs:timer:v1 = null`, `phase='idle'`, `expiredOnRestore === true` 플래그 노출
  - 언마운트 시 인터벌·이벤트 리스너 정리(리크 0)
  - `settings.soundEnabled === true`일 때만 완료 시 Web Audio beep 시도, 실패는 조용히 무시(`console.error` 0건)
- **Covers**: [F2-AC1, F2-AC2, F2-AC4, F2-AC5, F2-AC7, F2-AC8]
- **Files**: `src/lib/timer/useTimerEngine.ts`
- **Depends on**: Task 2.1, Task 2.5

---

## Epic 3. 화면 (1 페이지 = 1 패킷)

**Risk Assessment**
- **Complexity**: Medium
- **Risk factors**
  - `location.state` 미확인 캐스팅으로 새로고침·직접 진입 시 크래시(F3 `/history`가 유일한 state 수신 화면)
  - TDS 컴포넌트에 Tailwind/인라인 padding을 덮어써 검수 반려
  - 배너가 타이머 실행 중 렌더링되거나 콘텐츠 위에 겹쳐 반려
  - 잠금 상태에서 리포트 수치를 DOM에 렌더한 뒤 CSS로만 감추면 F5-AC2 실패
- **Mitigation**: 데이터 계층이 완성된 뒤에만 페이지를 작성 → 페이지 패킷은 렌더링/이벤트만 담당. state 수신 화면은 **null 확인 후 오늘로 폴백**하는 AC를 명시적으로 포함. 잠금 화면은 조건부 렌더(`{unlocked && <>…</>}`)로 구현.

---

### Task 3.1 S1 타이머 홈 — 히어로 + 타이머 카드 + 1차 액션
- **Description**: `/` 화면 골격. 오늘 누적 히어로, 원형 진행 인디케이터, mm:ss, 1차 버튼, 배너 조건부 배치까지. 태그 저장/포기 다이얼로그는 3.2에서 붙인다.
- **DoD**:
  - `ScreenScaffold` + `Top`(타이틀 `"FocusStreak"`, 우측 설정 아이콘 44×44px → `navigate('/settings')`)
  - `data-testid="today-hero"`: 오늘 누적 분 CountUp + `data-testid="today-goal-bar"` MiniBar(목표 대비 %)
  - `data-testid="timer-card"`: Card 안 SVG 원형 인디케이터(색상 `var(--tds-color-*)`만) + mm:ss `Paragraph.Text` t2
  - `SubmitFooter` 안 `display="block"` Button `data-testid="timer-primary-button"`, 높이 56px. 라벨: `idle`→`"집중 시작"`, `running`→`"일시정지"`, `paused`→`"이어서 집중"`, `break`→`"휴식 건너뛰기"`
  - `phase === 'paused'`일 때 남은 시간 표시가 정지하고 하단 `AdSlot` 배너가 렌더링됨
  - `phase === 'running'`일 때 `AdSlot`이 **DOM에 존재하지 않음**(조건부 렌더). 배너는 `timer-card` 아래 독립 섹션이며 컨테이너 `position: static`
  - `status === 'loading'`이면 `today-hero`/`timer-card` 자리에 TDS `Skeleton`, 빈 상태 문구 미표시
  - 오늘 누적 0분이면 히어로 하단에 `"오늘 첫 집중을 시작해보세요"`
  - 앱 재실행 복원 시 `05:00` 부근 표시 + `phase='running'`; `expiredOnRestore === true`면 Toast `"진행 중이던 타이머를 종료했어요"`
  - `"오늘 기록 보기"` 탭 → `navigate('/history', { state: { dateKey: todayKey } })` (RouteState 타입 일치)
  - 포기 버튼(variant weak, 48px)은 `running`/`paused`에서만 표시
  - TDS 컴포넌트에 `style`/`className` 여백 오버라이드 0건, 간격은 `Spacing size={...}`만
- **Covers**: [F2-AC1, F2-AC6, F2-AC7, F2-AC8]
- **Files**: `src/pages/HomePage.tsx`, `src/pages/home/CircularProgress.tsx`
- **Depends on**: Task 2.6, Task 2.4

---

### Task 3.2 S1 홈 — 태그 저장 BottomSheet · 포기 확인 · 배지 축하
- **Description**: 세션 종료 플로우. 완료/포기 시 저장 다이얼로그와 Toast, 신규 배지 축하 시트를 연결한다.
- **DoD**:
  - `pendingCompletion`이 생기면 `data-testid="tag-sheet"` BottomSheet 자동 오픈, 태그 Chip 3개(`공부`/`업무`/`운동`, 각 44px) 표시, 기본 선택은 `settings.defaultTag`
  - `공부` 선택 + `"저장"` → `appendSession({ durationSec:1500, plannedSec:1500, tag:'study', completed:true })` 호출 → `fs:sessions:v1`에 추가 + Toast `"25분 집중 완료!"`(분은 `durationSec/60` 반올림)
  - 저장 결과가 `error:'quota'`면 Toast `"기록을 저장하지 못했어요"` 표시, 크래시 없음
  - `"포기"` 탭 → `AlertDialog`(`"포기하기"`/`"계속하기"`) → `"포기하기"` 확인 시 `accumulatedSec=420`이면 `{ durationSec:420, completed:false }` 저장, `fs:timer:v1 = null`, `phase='idle'`
  - `accumulatedSec < 60`이면 저장 없이(`fs:sessions:v1` 길이 불변) Toast `"1분 미만은 기록되지 않아요"`
  - `appendSession`의 `newBadges`가 비어 있지 않으면 `data-testid="badge-sheet"` BottomSheet 오픈, `BADGE_DEFS[id].title` 기반 문구(예: `"하루 60분 달성!"`) 표시. 여러 개면 순차 표시
  - `newBadges`가 빈 배열이면 `badge-sheet`가 DOM에 마운트되지 않음
  - 시트 닫힘 후 `consumeCompletion()`으로 상태 정리, 시트가 재오픈되지 않음
- **Covers**: [F2-AC3, F2-AC4, F2-AC5, F6-AC4]
- **Files**: `src/pages/HomePage.tsx`, `src/pages/home/TagSaveSheet.tsx`, `src/components/BadgeUnlockSheet.tsx`
- **Depends on**: Task 3.1, Task 2.5

---

### Task 3.3 S2 캘린더 화면
- **Description**: `/calendar` — 스트릭 히어로 + 월 단위 7열 그리드(농도 4단계) + 범례 + 배너.
- **DoD**:
  - `Top` 타이틀 `"2026년 9월"` 형식, 좌/우 월 이동 아이콘 버튼 각 44×44px. 이전 달 탭 시 타이틀 `"2026년 8월"`로 변경. 표시 월이 이번 달이면 다음 달 버튼 `disabled`
  - `data-testid="streak-hero"`: CountUp `currentStreak` + 라벨 `"일 연속"`, 보조 텍스트 `"최장 12일"`
  - `data-testid="calendar-card"` 내부 CSS grid 7열. 각 셀에 `data-date-key="YYYY-MM-DD"`, `data-level="0|1|2|3"`. goal 120에서 `0/20/70/130분` 날짜가 각각 level `0/1/2/3`
  - 셀 크기 ≥ 44×44px, 탭 시 `navigate('/history', { state: { dateKey } })`
  - 농도 범례 4단계 표시, 색상은 `var(--tds-color-*)` 변수만(HEX 0건)
  - `AdSlot`은 히어로·그리드·범례 **아래** 독립 섹션에 정확히 1개, 컨테이너 `position: static`, 셀과 겹치지 않음
  - `status === 'loading'`이면 히어로 자리에 `Skeleton` + 셀은 회색 플레이스홀더
  - 표시 월 세션 0건이면 그리드는 그대로 렌더 + 하단 `Asset.ContentIcon` + `"이번 달 집중 기록이 아직 없어요"`
  - 손상된 스트릭 캐시 상태에서도 화면에 음수 표시 없음(스토어 재계산 결과 사용), 사용자 노출 에러 없음
  - `Spacing size={24}`로 히어로↔그리드 간격 처리, TDS 여백 오버라이드 0건
- **Covers**: [F4-AC1, F4-AC2, F4-AC3, F4-AC4, F4-AC5, F4-AC6, F4-AC7, F4-AC8]
- **Files**: `src/pages/CalendarPage.tsx`, `src/pages/calendar/MonthGrid.tsx`
- **Depends on**: Task 2.4, Task 2.2

---

### Task 3.4 S3 일별 기록 화면 (state 방어 · 필터 · 수정/삭제)
- **Description**: `/history` — 유일한 `location.state` 수신 화면. null·잘못된 값 방어를 최우선으로 구현한다.
- **DoD**:
  - state 수신 패턴 준수:
    ```ts
    const state = (useLocation().state as RouteState["/history"]) ?? null;
    const rawKey = state?.dateKey ?? null;
    ```
    구조분해 캐스팅(`const { dateKey } = useLocation().state as X`) 및 `(...state as X).x.map()` 형태 **0건**
  - **state 없이 `/history`로 직접 진입(새로고침 포함)해도 크래시하지 않고** 오늘 `dateKey`로 폴백하여 정상 렌더링. 리다이렉트·에러 화면 없음
  - `isValidDateKey(rawKey) === false`(예: `'2026-13-99'`)면 `"날짜 정보를 불러올 수 없어요"` + `"오늘 기록 보기"` Button(`display="block"`) 표시, `console.error` 0건
  - `Top` 타이틀 `"9월 10일"` 형식 + 뒤로가기(44×44px, `navigate(-1)`)
  - `data-testid="history-summary-card"`에 `"총 40분 · 2세션"`(t3 강조). 픽스처 study 1500s + work 900s → `"총 40분 · 2세션"`
  - TDS `Tab`(전체/공부/업무/운동, 아이템 높이 48px). `업무` 탭 → `ListRow` 1개, 요약 `"총 15분 · 1세션"`
  - `ListRow` 높이 ≥ 56px, 좌측 태그 라벨 / 중앙 `"14:20 – 14:45"` / 우측 `"25분"` + 더보기 아이콘(44×44px). 최신순 정렬. `ListRow`에 `padding` prop 미사용
  - 행 탭 → `BottomSheet`에서 Chip 선택 후 `"저장"` → `updateSessionTag(id,'exercise')` 반영 + Toast `"태그를 변경했어요"`
  - 삭제 아이콘 → `AlertDialog` `"삭제"` 확인 → `deleteSession(id)`로 목록 2건→1건, `fs:streak:v1` 갱신 확인
  - 20개 렌더 후 하단 `"더 보기"` Button, 100건 이상에서도 DOM `ListRow` 수가 페이지 크기 이하
  - `status === 'loading'`이면 `Skeleton` 3개, 빈 상태 문구 미표시
  - 세션 0건이면 `Asset.ContentIcon` + `"이 날은 집중 기록이 없어요"` + `"타이머 시작하기"` Button(`display="block"`, → `navigate('/')`), `ListRow` 0개
- **Covers**: [F3-AC1, F3-AC2, F3-AC3, F3-AC4, F3-AC5, F3-AC6, F3-AC7, F3-AC8]
- **Files**: `src/pages/HistoryPage.tsx`, `src/pages/history/SessionRow.tsx`, `src/pages/history/TagEditSheet.tsx`
- **Depends on**: Task 2.5, Task 1.2

---

### Task 3.5 S4 주간 리포트 — 잠금 상태 & 리워드 광고 게이트
- **Description**: `/report`의 잠금 화면과 `TossRewardAd` 해제 흐름. 결과 카드는 3.6에서 구현(이 패킷에서는 해제 시 플레이스홀더 렌더).
- **DoD**:
  - `unlocked[currentWeekKey]`가 없으면 `data-testid="report-lock-card"` Card에 `"이번 주 리포트가 준비됐어요"` + `SubmitFooter` 안 `data-testid="report-unlock-button"` Button(`display="block"`, 높이 56px, 라벨 `"광고 보고 리포트 열기"`)
  - 잠금 상태에서 총 집중시간·요일별 추이·태그 비중 **수치가 DOM에 렌더링되지 않음**(조건부 렌더, CSS 블러/`visibility` 감춤 금지) — `report-hero`/`report-sparkline`/`report-tag-bar` 모두 부재
  - 해제 버튼 탭 시 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`로 결과 영역을 감싸 시청 유도. 시청 완료 → `unlockReport(weekKey)` 호출로 `unlocked['2026-W37'] = Date.now()` 저장 + 결과 영역 표시
  - 광고 `onFailed` → Toast `"광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요"` + `bumpAdFail(weekKey)`로 `adFailCount[weekKey]` 1 증가 + 화면은 잠금 유지, `console.error` 0건
  - `adFailCount[weekKey] === 3`인 상태에서 해제 버튼 재탭 → `TossRewardAd` 마운트 없이 `unlockReport` 실행 + Toast `"광고 없이 열었어요"`
  - 이미 해제된 주에 재진입하면 광고 없이 즉시 결과 표시되고 `TossRewardAd`가 **마운트되지 않음**(DOM 부재로 검증)
  - `Top` 타이틀 `"주간 리포트"`, `status === 'loading'`이면 `report-hero` 자리에 `Skeleton`
- **Covers**: [F5-AC1, F5-AC2, F5-AC3, F5-AC6, F5-AC7]
- **Files**: `src/pages/ReportPage.tsx`, `src/pages/report/ReportLockCard.tsx`
- **Depends on**: Task 2.5, Task 2.2

---

### Task 3.6 S4 주간 리포트 — 결과 카드 (히어로 · 추이 · 태그 비중)
- **Description**: 해제 후 표시되는 리포트 본문 레이아웃과 수치 렌더링.
- **DoD**:
  - `data-testid="report-hero"` `SummaryHero` 1개: 총 집중 분 CountUp(t2~t3 강조) + 주차 `Chip` 배지 `"2026년 37주차"`
  - 픽스처(월130/화0/수60/목200/금90/토0/일45, goal 120) → 히어로 CountUp 값 `525`, 보조 텍스트 `"일평균 75분"`, `"목표 달성 2일"`
  - Card 2개 존재: `data-testid="report-trend-card"`(내부 `data-testid="report-sparkline"` Sparkline에 요일 7개 값 + 최고 요일 라벨 `"목요일"`), `data-testid="report-tag-card"`(태그 3종 `data-testid="report-tag-bar"` MiniBar + 각 항목 퍼센트 텍스트, 합계 100%±1)
  - `AdSlot`은 `report-trend-card`와 `report-tag-card` **사이** 섹션에 정확히 1개, 카드 위에 겹치지 않음
  - `status === 'loading'`이면 히어로/카드 자리에 `Skeleton`
  - 해제 후 해당 주 세션 0건이면 `Asset.ContentIcon` + `"이번 주 집중 기록이 없어요"` + `"타이머 시작하기"` Button(→ `navigate('/')`)이 표시되고 `report-sparkline`은 **렌더링되지 않음**
  - 간격은 `Spacing`만 사용, 색상 HEX 0건
- **Covers**: [F5-AC4, F5-AC5, F5-AC8]
- **Files**: `src/pages/report/ReportResult.tsx`, `src/pages/report/TrendCard.tsx`, `src/pages/report/TagShareCard.tsx`
- **Depends on**: Task 3.5, Task 2.2

---

### Task 3.7 S5 더보기 화면
- **Description**: `/more` — 정적 3행 목록 + 배너.
- **DoD**:
  - `ScreenScaffold` + `Top` 타이틀 `"더보기"`
  - `ListRow` 3개(각 높이 ≥ 56px, 우측 chevron): `"배지"` → `navigate('/badges')`, `"친구 랭킹"` → `navigate('/rank')`, `"설정"` → `navigate('/settings')` (모두 state 없이)
  - `Spacing size={24}` 후 목록 **아래** `AdSlot` 1개
  - Loading/Empty 상태 분기 없음, `ListRow`에 `padding` prop 미사용
  - 외부 링크·`window.open` 0건
- **Covers**: [F8-AC2 (일부: 비탭 화면 전환 경로 검증은 4.1)]
- **Files**: `src/pages/MorePage.tsx`
- **Depends on**: Task 1.1

---

### Task 3.8 S6 배지 화면
- **Description**: `/badges` — 7종 배지 그리드와 획득 카운트.
- **DoD**:
  - `Top` 타이틀 `"배지"` + 뒤로가기(44×44px, `navigate(-1)`)
  - 헤더에 `"3 / 7 획득"` 형식 `Paragraph.Text`(획득 수 = `Object.keys(badges.unlocked).length`)
  - `data-testid="badge-grid"` CSS grid 2열 안에 Card 정확히 7개, 각 최소 높이 88px
  - 미획득 Card는 `data-locked="true"` + 흐린 표현(opacity, HEX 미사용) + `BADGE_DEFS[id].condition` 텍스트(예: `"7일 연속 목표 달성"`) 표시. 획득 Card는 `data-locked="false"`
  - 획득 0개면 상단에 `Asset.ContentIcon` + `"첫 집중을 시작하면 배지가 열려요"` (그리드는 유지)
  - `status === 'loading'`이면 Card 자리에 `Skeleton` 4개
  - 3.2에서 만든 `BadgeUnlockSheet`(`data-testid="badge-sheet"`)를 재사용 가능하도록 import 경로 유지
- **Covers**: [F6-AC6, F6-AC7]
- **Files**: `src/pages/BadgesPage.tsx`, `src/pages/badges/BadgeCard.tsx`
- **Depends on**: Task 2.4, Task 3.2

---

### Task 3.9 S7 친구 랭킹 화면
- **Description**: `/rank` — 내 기록 카드, 코드 복사, 코드 붙여넣기 시트, 랭킹 목록.
- **DoD**:
  - `Top` 타이틀 `"이번 주 랭킹"` + 뒤로가기
  - `data-testid="rank-my-card"`: 이번 주 내 집중 분 CountUp
  - `SubmitFooter`에 `data-testid="rank-copy-button"` Button(`display="block"`, `"내 기록 코드 복사"`) + 보조 텍스트 버튼 `"친구 코드 붙여넣기"`
  - 복사 탭 시 닉네임 입력 `BottomSheet`(기본값 `"나"`, 1~10자) → `navigator.clipboard.writeText`에 `FS1.`로 시작하는 코드 전달 + Toast `"코드를 복사했어요"`. `navigator.clipboard` 미지원이면 `TextField`에 코드를 표시하고 `"길게 눌러 복사해주세요"` 안내
  - `window.open`, `window.location.href = `, `navigator.share`, `<a target="_blank">` 사용 **0건**(정적 검사)
  - 붙여넣기 `BottomSheet`: `TextField`(`enterKeyHint="done"`, 포커스 시 키보드 위로 상승해 `"추가"` 버튼 미가림) + `"추가"` 버튼
  - 유효 코드(`{ n:'지훈', w:'2026-W37', m:610 }`) 추가 → `fs:friends:v1`에 저장 + 목록 1위 `"지훈 610분"`, 2위 `"나 525분"`(`Chip`으로 `"나"` 표시)
  - `"hello-world"` 입력 → `TextField` 하단 `"코드를 확인해주세요"`, `fs:friends:v1` 길이 불변, 예외 0건
  - `w='2026-W36'` 코드 → `"이번 주 기록 코드가 아니에요"` 표시 후 저장 안 함
  - 이번 주 20건 상태에서 신규 추가 → Toast `"친구는 최대 20명까지 추가할 수 있어요"`, 저장 안 함
  - 친구 행 삭제는 `AlertDialog` 확인 후 제거
  - 이번 주 친구 0건이면 `Asset.ContentIcon` + `"친구 코드를 추가하면 순위가 보여요"` + `"코드 붙여넣기"` Button(`display="block"`). `status === 'loading'`이면 `Skeleton` 3개
  - `ListRow` 최대 21행, 네이티브 스크롤
- **Covers**: [F7-AC1, F7-AC2, F7-AC3, F7-AC4, F7-AC6, F7-AC7, F7-AC8]
- **Files**: `src/pages/RankPage.tsx`, `src/pages/rank/CodePasteSheet.tsx`, `src/pages/rank/NicknameSheet.tsx`
- **Depends on**: Task 2.3, Task 2.4

---

### Task 3.10 S8 설정 화면 (검증 · 저장 · 초기화)
- **Description**: `/settings` — 집중/휴식/목표 입력, 기본 태그, 사운드 스위치, 전체 삭제.
- **DoD**:
  - `Top` 타이틀 `"설정"` + 뒤로가기. Card 2개: `data-testid="settings-timer-card"`(집중 분/휴식 분/기본 태그 Chip 3종), `data-testid="settings-goal-card"`(목표 분 + 안내 문구)
  - `TextField` 3개 모두 `inputMode="numeric"`, 높이 ≥ 56px. `Switch`(종료 사운드, 터치 영역 44×44px) — `Toggle` 미사용
  - 집중 `50`, 휴식 `10`, 목표 `180` 입력 후 `SubmitFooter` `"저장"`(`display="block"`, 56px) → `fs:settings:v1`이 `{ focusMin:50, breakMin:10, goalMinPerDay:180 }`으로 갱신 + Toast `"설정을 저장했어요"` + `navigate(-1)` 호출
  - 집중 `0` 입력 후 저장 → 해당 `TextField` 하단 `"집중 시간은 5~60분 사이로 입력해주세요"` 표시, `fs:settings:v1` 불변. 휴식 범위 밖 → `"휴식 시간은 1~30분 사이로 입력해주세요"`, 목표 범위 밖 → `"목표 시간은 10~720분 사이로 입력해주세요"`
  - 목표 필드에 `"abc"` → `"숫자만 입력해주세요"` 표시, 저장 미수행. 소수점·공백·음수도 동일 처리
  - 목표를 `120 → 300`으로 저장하면 스트릭이 새 기준으로 즉시 재계산되어 `fs:streak:v1`에 반영되고, `/calendar` 셀 `data-level`도 새 목표 기준으로 갱신됨
  - 하단 `ListRow` `"모든 기록 삭제"` → `AlertDialog` 확인 → `resetAll()`로 모든 `fs:*` 키 삭제 후 `navigate('/', { replace: true })`
  - `status === 'loading'`이면 필드 자리에 `Skeleton`. 포커스 시 `SubmitFooter`가 키보드 위로 이동하고 필드가 가려지지 않음
- **Covers**: [F6-AC1, F6-AC2, F6-AC3, F6-AC8]
- **Files**: `src/pages/SettingsPage.tsx`
- **Depends on**: Task 2.5

---

## Epic 4. 통합 · 온보딩 · 검수 정책

**Risk Assessment**
- **Complexity**: Medium
- **Risk factors**
  - 라우트 누락/오타로 특정 화면 진입 불가, 미정의 경로에서 흰 화면
  - 상세 화면(`/history` 등)에서 `FloatingTabBar`가 함께 떠서 하단 버튼을 가림
  - HEX 색상·`console.error`·외부 SDK 잔존으로 검수 반려(가장 흔한 반려 사유)
  - `ErrorBoundary` 없으면 렌더 예외 1건이 전체 흰 화면으로 확대
- **Mitigation**: 모든 페이지가 완성된 뒤 마지막에 배선하므로 라우트/탭 규칙을 한 번에 검증 가능. 정책 스윕(4.3)을 최종 패킷으로 두어 그 이후 코드 추가가 없도록 한다.

---

### Task 4.1 라우터 + 앱 셸 + FloatingTabBar 배선
- **Description**: `BrowserRouter` 라우트 8개 등록, 탭/비탭 화면 규칙 적용, `FocusStoreProvider` 마운트.
- **DoD**:
  - `/`, `/calendar`, `/history`, `/report`, `/more`, `/badges`, `/rank`, `/settings` 8개 라우트가 등록되고 각 화면이 정상 렌더
  - `<Route path="*" element={<Navigate to="/" replace />} />`로 `/foo` 진입 시 `/`로 리다이렉트(흰 화면 없음)
  - `/`, `/calendar`, `/report`, `/more`에서만 템플릿 `FloatingTabBar`가 렌더되고 현재 경로 탭이 하이라이트됨
  - `/history`, `/badges`, `/rank`, `/settings`에서 `FloatingTabBar`가 **DOM에 없고**, `Top`에 뒤로가기 버튼(44×44px)이 있음
  - `App`이 `FocusStoreProvider`로 감싸져 모든 페이지에서 `useFocusStore()` 사용 가능
  - 탭 화면에서 `FloatingTabBar` 높이만큼 콘텐츠 하단 여백이 확보되어 마지막 요소/`AdSlot`이 가려지지 않음
  - 8개 라우트 전부 방문 시 크래시·흰 화면 0건
- **Covers**: [F8-AC1, F8-AC2]
- **Files**: `src/App.tsx`, `src/routes.tsx`, `src/components/AppShell.tsx`
- **Depends on**: Task 3.1~3.10

---

### Task 4.2 최초 온보딩 시트 + 전역 ErrorBoundary
- **Description**: 1회성 온보딩 안내와 렌더 예외 안전망.
- **DoD**:
  - `flags.onboardingSeenAt === null`이고 `status === 'ready'`이면 `BottomSheet`가 1회 열려 `"25분 집중 · 5분 휴식으로 시작해보세요"` 표시
  - `"시작하기"` 탭 → `markOnboardingSeen()`으로 `fs:flags:v1.onboardingSeenAt = Date.now()` 저장, 시트 닫힘. 앱 재실행(재마운트) 시 시트가 다시 열리지 않음
  - `status === 'loading'` 중에는 온보딩 시트를 열지 않음(플래시 방지)
  - `ErrorBoundary`가 라우터 전체를 감싸며, 하위에서 렌더 예외 발생 시 `"화면을 불러오지 못했어요"` 문구 + `"다시 시도"` Button(`display="block"`)을 표시하고 흰 화면이 노출되지 않음
  - `"다시 시도"` 탭 시 에러 상태가 초기화되어 `/`로 복귀 렌더 가능
  - `ErrorBoundary`의 `componentDidCatch`에서 `console.error` 호출 없음(개발 모드 `console.warn`만)
- **Covers**: [F8-AC3, F8-AC8]
- **Files**: `src/components/ErrorBoundary.tsx`, `src/components/OnboardingSheet.tsx`, `src/App.tsx`
- **Depends on**: Task 4.1, Task 2.5

---

### Task 4.3 검수 정책 스윕 (색상 · 콘솔 · 외부 이탈 · 호환성 · 배너 배치)
- **Description**: 전체 소스를 정적 검사해 토스 검수 반려 요인을 0으로 만드는 마무리 패킷. 기능 추가 없음 — 위반 발견 시 수정만 한다.
- **DoD**:
  - `grep -rEn "#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?\b" src --include=*.ts --include=*.tsx --include=*.css` 결과 **0건**(모두 `var(--tds-color-*)` 또는 TDS 기본값으로 치환). 다크모드에서 텍스트/배경 대비 확인
  - `grep -rn "window.open\|window.location.href\|navigator.share\|target=\"_blank\"" src` 결과 **0건**
  - `"앱을 설치"`, `"다운로드"` 등 외부 앱 설치 유도 문구/배너/링크 **0건**
  - `grep -rn "console.error" src` 결과 0건(로그는 DEV 가드된 `console.warn`만)
  - `package.json` 의존성에 Google Analytics·Amplitude·Sentry 등 외부 분석/로깅 SDK **0건**, shadcn/ui·MUI·Ant Design·Chakra UI **0건**
  - `grep -rn "\.at(\|Object.groupBy\|structuredClone\|findLast\|:has(" src` 결과 0건, `safeId()` fallback이 모든 id 생성 지점에서 사용됨(`crypto.randomUUID` 직접 호출 0건)
  - TDS 컴포넌트에 인라인 `style`/`className` 여백 오버라이드 0건, 커스텀 CSS는 flex/grid 배치 파일에만 존재
  - `AdSlot` 배치 점검: `/`(타이머 카드 아래, `phase!=='running'`일 때만), `/calendar`(그리드·범례 아래), `/report`(trend↔tag 카드 사이), `/more`(목록 아래) — 각 화면 1개, 모두 `position: static`, 콘텐츠와 겹침 0건
  - `TossRewardAd`는 `/report` 1곳에서만 사용됨(`grep`으로 사용처 1건 확인). `grantPromotionReward`·`TossPurchase` 사용 0건
  - 모든 탭 가능 요소의 최소 터치 영역 44×44px 확인(버튼/Chip/셀/아이콘)
  - `npx tsc --noEmit` + `npx vite build` 성공, 프로덕션 빌드에서 8개 라우트 전부 방문 시 `console.error` 0건 · 외부 네트워크 요청 0건(광고 SDK 제외) → CORS 에러 0건
- **Covers**: [F8-AC4, F8-AC5, F8-AC6, F8-AC7, F4-AC8, F2-AC6]
- **Files**: `src/**/*.{ts,tsx,css}` (수정 대상 파일만), `package.json`
- **Depends on**: Task 4.2

---

## AC Coverage

- **Total ACs in SPEC**: **64** (F1~F8 각 8개)
- **Covered by tasks**: **64**

| Feature | AC | 담당 Task |
|---|---|---|
| F1 | AC-1 | 2.1 |
| F1 | AC-2 | 2.1 |
| F1 | AC-3 | 2.1 |
| F1 | AC-4 | 2.1 |
| F1 | AC-5 | 2.2 |
| F1 | AC-6 | 2.2 |
| F1 | AC-7 | 2.4 |
| F1 | AC-8 | 1.2 |
| F2 | AC-1 | 2.6, 3.1 |
| F2 | AC-2 | 2.6 |
| F2 | AC-3 | 3.2 |
| F2 | AC-4 | 2.6, 3.2 |
| F2 | AC-5 | 2.6, 3.2 |
| F2 | AC-6 | 3.1, 4.3 |
| F2 | AC-7 | 2.6, 3.1 |
| F2 | AC-8 | 2.6, 3.1 |
| F3 | AC-1 | 3.4 |
| F3 | AC-2 | 3.4 |
| F3 | AC-3 | 2.5, 3.4 |
| F3 | AC-4 | 2.5, 3.4 |
| F3 | AC-5 | 3.4 |
| F3 | AC-6 | 3.4 |
| F3 | AC-7 | 3.4 |
| F3 | AC-8 | 3.4 |
| F4 | AC-1 | 2.2, 3.3 |
| F4 | AC-2 | 3.3 |
| F4 | AC-3 | 3.3 |
| F4 | AC-4 | 3.3 |
| F4 | AC-5 | 3.3 |
| F4 | AC-6 | 3.3 |
| F4 | AC-7 | 2.4, 3.3 |
| F4 | AC-8 | 3.3, 4.3 |
| F5 | AC-1 | 3.5 |
| F5 | AC-2 | 3.5 |
| F5 | AC-3 | 3.5 |
| F5 | AC-4 | 2.2, 3.6 |
| F5 | AC-5 | 3.6 |
| F5 | AC-6 | 3.5 |
| F5 | AC-7 | 3.5 |
| F5 | AC-8 | 3.6 |
| F6 | AC-1 | 3.10 |
| F6 | AC-2 | 3.10 |
| F6 | AC-3 | 3.10 |
| F6 | AC-4 | 3.2 |
| F6 | AC-5 | 2.5 |
| F6 | AC-6 | 3.8 |
| F6 | AC-7 | 3.8 |
| F6 | AC-8 | 2.4, 2.5, 3.10 |
| F7 | AC-1 | 3.9 |
| F7 | AC-2 | 2.3, 3.9 |
| F7 | AC-3 | 2.3, 3.9 |
| F7 | AC-4 | 2.3, 3.9 |
| F7 | AC-5 | 2.3 |
| F7 | AC-6 | 2.3, 3.9 |
| F7 | AC-7 | 3.9 |
| F7 | AC-8 | 3.9, 4.3 |
| F8 | AC-1 | 4.1 |
| F8 | AC-2 | 4.1, 3.7 |
| F8 | AC-3 | 4.2 |
| F8 | AC-4 | 4.3 |
| F8 | AC-5 | 4.3 |
| F8 | AC-6 | 4.3 |
| F8 | AC-7 | 1.2, 4.3 |
| F8 | AC-8 | 4.2 |

- **Uncovered**: **0** ✅

---

## 부가 확인 사항 (구현 중 준수)

- **RouteState 계약**: state를 수신하는 화면은 `/history` **단 1곳**. Task 3.4가 `state ?? null` 확인 → 오늘 폴백 → `isValidDateKey` 검증의 3단 방어를 반드시 구현한다. 다른 화면(`/report`, `/badges`, `/rank`, `/settings`, `/calendar`, `/more`)은 `location.state`를 읽지 않는다.
- **템플릿 재사용(재설계 금지)**: `AdSlot`, `TossRewardAd`, `FloatingTabBar`, `ScreenScaffold`, `SubmitFooter`, localStorage helper. 로그인·TDS 셋업·광고 래퍼 작성 패킷은 없음.
- **미사용 확정**: `TossPurchase`(IAP), `grantPromotionReward`, 서버 API, 생성형 AI 고지 컴포넌트(OQ-3 확정 시 F5에 AC 추가 후 별도 패킷 필요).