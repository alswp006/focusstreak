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
    CircularProgress.tsx
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
    WeeklyReportResult.tsx
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
- CircularProgress.tsx: CircularProgress
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
- WeeklyReportResult.tsx: WeeklyReportResult
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- heal-1-02: 공용 스토리지·도메인 레이어 — localStorage 어댑터와 KST 날짜/집계 순수 함수 (files: src/lib/storage.ts, src/lib/datetime.ts, src/lib/domain.ts)
- 0003: S2 캘린더 화면 (files: src/pages/Calendar.tsx)
- 0004: S3 일별 기록 화면 (state 방어 · 필터 · 수정/삭제) (files: src/pages/History.tsx)
- 0005: S4 주간 리포트 — 잠금 상태 & 리워드 광고 게이트 (files: src/pages/Report.tsx)
- 0006: S4 주간 리포트 — 결과 카드 (히어로 · 추이 · 태그 비중) (files: src/components/WeeklyReportResult.tsx, src/pages/Report.tsx)
- heal-1-03: S1 타이머 홈 화면 실구현 (플레이스홀더 대체) (files: src/pages/Home.tsx, src/components/CircularProgress.tsx)