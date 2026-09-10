# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 일별 타이머 기록 (구현: 패킷 heal-1-02) */
export type FocusRecord = { id: string; date: string; tagId: string; durationMs: number; note: string };

/** 현재 진행 중인 세션 상태 (구현: 패킷 heal-1-02) */
export type SessionData = { startTime: number; elapsedMs: number; status: 'idle' | 'running' | 'paused' };

/** 배지 달성 정보 (구현: 패킷 heal-1-02) */
export type Badge = { id: string; name: string; description: string; achieved: boolean; achievedAt?: string };

/** 태그 메타데이터 (구현: 패킷 heal-1-02) */
export type Tag = { id: string; name: string; colorHex: string };

/** 주간 통계 집계 (구현: 패킷 heal-1-02) */
export type WeeklyStats = { totalDurationMs: number; dayStats: Record<string, number>; tagBreakdown: Record<string, number> };

/** 라우트 정의 스키마 (구현: 패킷 heal-1-01) */
export type RouteConfig = { path: string; name: string; component: React.ComponentType<any>; icon?: string };

/** 현재 KST 타임스탬프 반환 (구현: 패킷 heal-1-02) */
export type getKSTNowFn = () => number;

/** 타임스탬프를 KST 날짜 문자열로 변환 (YYYY-MM-DD) (구현: 패킷 heal-1-02) */
export type getKSTDateFn = (timestamp?: number) => string;

/** 밀리초를 '1h 23m' 형식으로 포맷 (구현: 패킷 heal-1-02) */
export type formatDurationFn = (ms: number) => string;

/** 현재 진행 중인 세션 조회 (구현: 패킷 heal-1-02) */
export type getSessionFn = () => Promise<SessionData | null>;

/** 세션 상태 저장 (구현: 패킷 heal-1-02) */
export type saveSessionFn = (session: SessionData) => Promise<void>;

/** 날짜 범위 내 기록 조회 (구현: 패킷 heal-1-02) */
export type getRecordsFn = (startDate?: string, endDate?: string) => Promise<FocusRecord[]>;

/** 새 기록 저장, 생성된 FocusRecord 반환 (구현: 패킷 heal-1-02) */
export type saveRecordFn = (record: Omit<FocusRecord, 'id'>) => Promise<FocusRecord>;

/** 기록 삭제 (구현: 패킷 heal-1-02) */
export type deleteRecordFn = (id: string) => Promise<void>;

/** 주간 통계 계산 (weekStart: YYYY-MM-DD) (구현: 패킷 heal-1-02) */
export type getWeeklyStatsFn = (weekStart: string) => Promise<WeeklyStats>;

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Domain types — add your app-specific types here

/** navigate(path, { state }) 페이로드 계약. 화면은 이 타입으로 캐스팅해 state를 주고받는다. */
export type RouteState = {
  "/history": { dateKey: string };
};

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    contract.ts
    datetime.ts
    domain.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Badges.tsx
    Calendar.tsx
    History.tsx
    Home.tsx
    More.tsx
    Rank.tsx
    Report.tsx
    Settings.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- contract.ts: export type FocusRecord =; export type SessionData =; export type Badge =; export type Tag =; export type WeeklyStats =; export type RouteConfig =; export type getKSTNowFn = () => number; export type getKSTDateFn = (timestamp?: number) => string
- datetime.ts: export function toDateKey(timestamp: number): string; export function isValidDateKey(value: string): boolean; export function toWeekKey(timestamp: number): string; export function startOfWeek(dateKey: string): number; export function addMonths(timestamp: number, months: number): number; export function isFutureMonth(timestamp: number): boolean
- domain.ts: export interface FocusSession; export interface StreakState; export interface WeeklyReport; export type BadgeId = | "first-step" | "streak-3" | "streak-7" | "streak-30" | "total-10h" | "total-50h" | "deep-focus"; export interface BadgeInfo; export function getDayLevel(totalMin: number, goalMinPerDay: number): 0 | 1 | 2 | 3; export function sumMinutesByDate(sessions: FocusSession[]): Record<string, number>; export function computeStreak(sessions: FocusSession[], goalMinPerDay: number): StreakState
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void; export function read<T>(key: string, fallback: T): T; export function write<T>(key: string, value: T): void; export function clearAllFocusData(): void
- types.ts: export type RouteState =
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- heal-1-02: 공용 스토리지·도메인 레이어 — localStorage 어댑터와 KST 날짜/집계 순수 함수 (files: src/lib/storage.ts, src/lib/datetime.ts, src/lib/domain.ts)
- 0003: S2 캘린더 화면 (files: src/pages/Calendar.tsx)
- 0004: S3 일별 기록 화면 (state 방어 · 필터 · 수정/삭제) (files: src/pages/History.tsx)
- 0005: S4 주간 리포트 — 잠금 상태 & 리워드 광고 게이트 (files: src/pages/Report.tsx)
- 0006: S4 주간 리포트 — 결과 카드 (히어로 · 추이 · 태그 비중) (files: src/components/WeeklyReportResult.tsx, src/pages/Report.tsx)

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/AdSlot.tsx
export function AdSlot({ adGroupId, className, variant, theme }: AdSlotProps) {

// src/components/Amount.tsx
export function Amount({

// src/components/BottomCTA.tsx
export function SubmitFooter({
export function ButtonStack({

// src/components/Card.tsx
export function Card({

// src/components/CountUp.tsx
export function CountUp({

// src/components/FloatingTabBar.tsx
export type TabItem = {
export function FloatingTabBar({ items }: { items: TabItem[] }) {

// src/components/MiniBar.tsx
export function MiniBar({

// src/components/PageShell.tsx
export function PageShell({ children, style }: { children: ReactNode; style?: CSSProperties }) {

// src/components/ScreenScaffold.tsx
export function ScreenScaffold({

// src/components/Sparkline.tsx
export function Sparkline({

// src/components/StateView.tsx
export function EmptyState({
export function LoadingState({

// src/components/SummaryHero.tsx
export function SummaryHero({

// src/components/TossPurchase.tsx
export interface TossPurchaseResult {
export function TossPurchase({

// src/components/TossRewardAd.tsx
export function TossRewardAd({

// src/components/WeeklyReportResult.tsx
export function WeeklyReportResult({

// src/lib/contract.ts
export type FocusRecord = { id: string; date: string; tagId: string; durationMs: number; note: string };
export type SessionData = { startTime: number; elapsedMs: number; status: 'idle' | 'running' | 'paused' };
export type Badge = { id: string; name: string; description: string; achieved: boolean; achievedAt?: string };
export type Tag = { id: string; name: string; colorHex: string };
export type WeeklyStats = { totalDurationMs: number; dayStats: Record<string, number>; tagBreakdown: Record<string, number> };
export type RouteConfig = { path: string; name: string; component: React.ComponentType<any>; icon?: string };
export type getKSTNowFn = () => number;
export type getKSTDateFn = (timestamp?: 

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(3), general(12), testing(1), ui(1)

Key lessons (verify against actual code before applying):
- [general] 화면·라우팅 등 소비자 모듈은 그것이 import하는 생산자 모듈이 병합된 뒤에만 병합하고, 순서를 지킬 수 없으면 소비자 병합과 동시에 최소 플레이스홀더를 만들어 매 병합 직후 타입체크와 빌드가 항상 통과하도록 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 전역 라우팅·탭바·Provider 배선은 개별 화면보다 먼저(초반 20% 안에) 완료하고 미구현 화면은 스텁 라우트로 연결해, 시간 예산이 소진돼도 앱이 항상 실행 가능한 상태를 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 저장·데이터 접근 등 기반 계층 패킷은 이를 import 하는 화면 패킷보다 반드시 먼저 완료·병합하고, 미완료면 상위 화면 패킷 병합을 차단하라 — 빈 기반 모듈 하나가 전 라우트 스모크를 무너뜨린다. (60% · 타 앱 1회 — 맹신 금지)
- [general] 외부에서 들어온 모든 값(라우터 state, 로컬 저장소, 부분 입력 폼)은 사용 직전에 배열·객체 기본값으로 정규화하고, 테이블/맵 조회 결과는 존재 확인 후에만 하위 속성이나 length에 접근하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 의존 그래프 최하층의 타입·계약 파일은 런타임 코드 0줄의 순수 선언으로 가장 먼저 단독 타입체크를 통과시키고, 파일 생성은 셸 명령이 아닌 허용된 편집 도구로만 하게 강제하라. (60% · 타 앱 1회 — 맹신 금지)