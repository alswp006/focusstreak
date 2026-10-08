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
/**
 * 전 화면이 공유하는 도메인 타입·스토리지 키 계약.
 *
 * 단일 정의 원칙: 이미 `src/lib/domain.ts`가 구현과 함께 들고 있는 집계 타입
 * (FocusSession / StreakState / BadgeId)은 여기서 다시 선언하지 않고 그대로 re-export한다.
 * 화면은 `@/lib/types` 하나만 import하면 되고, 정의는 여전히 한 곳에만 있다.
 */

export type { FocusSession, StreakState, BadgeId, BadgeInfo, WeeklyReport } from "./domain";

import type { BadgeId } from "./domain";

/** navigate(path, { state }) 페이로드 계약. 화면은 이 타입으로 캐스팅해 state를 주고받는다. */
export type RouteState = {
  "/history": { dateKey: string };
};

/** 집중 세션 분류 태그. 화면 표시는 TAG_LABEL을 쓴다. */
export type FocusTag = "study" | "work" | "exercise";

export const TAG_LABEL: Record<FocusTag, string> = {
  study: "공부",
  work: "업무",
  exercise: "운동",
};

/** 타이머/목표 설정 (fs:settings:v1) */
export interface TimerSettings {
  /** 집중 길이(분). 5 ≤ v ≤ 60 */
  focusMin: number;
  /** 휴식 길이(분). 1 ≤ v ≤ 30 */
  breakMin: number;
  /** 하루 목표 집중 분. 10 ≤ v ≤ 720 */
  goalMinPerDay: number;
  defaultTag: FocusTag;
  /** 종료 시 in-app 사운드 */
  soundEnabled: boolean;
  version: 1;
}

export const DEFAULT_SETTINGS: TimerSettings = {
  focusMin: 25,
  breakMin: 5,
  goalMinPerDay: 120,
  defaultTag: "study",
  soundEnabled: true,
  version: 1,
};

/** 설정 입력 검증 범위 — Settings 화면과 도메인이 함께 참조한다. */
export const SETTINGS_RANGE = {
  focusMin: { min: 5, max: 60 },
  breakMin: { min: 1, max: 30 },
  goalMinPerDay: { min: 10, max: 720 },
} as const;

/** 획득 배지 (fs:badges:v1). unlocked: BadgeId → 획득 시각(epoch ms), 미획득 키는 부재 */
export interface BadgeState {
  unlocked: Partial<Record<BadgeId, number>>;
  version: 1;
}

/** 로컬 공유 랭킹 참가자 (fs:friends:v1) */
export interface FriendEntry {
  id: string;
  /** 1~10자 */
  nickname: string;
  /** 'YYYY-Www' */
  weekKey: string;
  focusMin: number;
  addedAt: number;
}

/** 주간 리포트 광고 해제 기록 (fs:report_unlock:v1) */
export interface ReportUnlockState {
  /** weekKey → 해제 시각(epoch ms) */
  unlocked: Record<string, number>;
  /** weekKey → 연속 광고 실패 횟수 */
  adFailCount: Record<string, number>;
  version: 1;
}

/** 앱 전역 플래그 (fs:flags:v1) */
export interface AppFlags {
  /** 온보딩을 본 시각(epoch ms). 아직이면 null */
  onboardingSeenAt: number | null;
  version: 1;
}

// ── 스토리지 키 (localStorage) ─────────────────────────────────────────────
// 키 문자열을 화면마다 다시 적지 마라 — 오타 하나가 조용히 다른 저장소를 가리킨다.
export const SETTINGS_KEY = "fs:settings:v1";
export const SESSIONS_KEY = "fs:sessions:v1";
export const STREAK_KEY = "fs:streak:v1";
export const BADGES_KEY = "fs:badges:v1";
export const FRIENDS_KEY = "fs:friends:v1";
/** 랭킹 코드에 담을 내 표시 이름 */
export const NICKNAME_KEY = "fs:nickname:v1";
export const REPORT_UNLOCK_KEY = "fs:report_unlock:v1";
export const FLAGS_KEY = "fs:flags:v1";

// ── KST 날짜 유틸 시그니처 (구현: src/lib/datetime.ts) ─────────────────────
/** epoch ms → 'YYYY-MM-DD' (Asia/Seoul 고정) */
export type ToDateKeyFn = (timestamp: number) => string;
/** epoch ms → 'YYYY-Www' ISO 주차 (Asia/Seoul 고정) */
export type ToWeekKeyFn = (timestamp: number) => string;
/** 'YYYY-MM-DD'가 실제 존재하는 날짜인지 */
export type IsValidDateKeyFn
// ...truncated
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
    analytics.ts
    contract.ts
    datetime.ts
    domain.ts
    review.ts
    share.ts
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
- analytics.ts: export type LogFields = Record<string, string | number | boolean | null>; export const DWELL_MS = 3000; export function fireAndForget(call: () => unknown): void; export function logScreen(page: string, extra?: LogFields): void; export function logClick(name: string, extra?: LogFields): void; export function logImpression(name: string, extra?: LogFields): void; export function useScreenLog(page: string): void
- contract.ts: export type FocusRecord =; export type SessionData =; export type Badge =; export type Tag =; export type WeeklyStats =; export type RouteConfig =; export type getKSTNowFn = () => number; export type getKSTDateFn = (timestamp?: number) => string
- datetime.ts: export function toDateKey(timestamp: number): string; export function isValidDateKey(value: string): boolean; export function toWeekKey(timestamp: number): string; export function startOfWeek(dateKey: string): number; export function addMonths(timestamp: number, months: number): number; export function isFutureMonth(timestamp: number): boolean
- domain.ts: export interface FocusSession; export interface StreakState; export interface WeeklyReport; export type BadgeId = | "first-step" | "streak-3" | "streak-7" | "streak-30" | "total-10h" | "total-50h" | "deep-focus"; export interface BadgeInfo; export function getDayLevel(totalMin: number, goalMinPerDay: number): 0 | 1 | 2 | 3; export function sumMinutesByDate(sessions: FocusSession[]): Record<string, number>; export function computeStreak(sessions: FocusSession[], goalMinPerDay: number): StreakState
- review.ts: export function requestReviewOnce(key: string = REVIEW_REQUESTED_KEY): void
- share.ts: export interface ShareAppOptions; export async function shareApp(opts: ShareAppOptions): Promise<void>
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void; export function read<T>(key: string, fallback: T): T; export function write<T>(key: string, value: T): void; export function clearAllFocusData(): void
- types.ts: export type RouteState =; export type FocusTag = "study" | "work" | "exercise"; export const TAG_LABEL: Record<FocusTag, string> =; export interface TimerSettings; export const DEFAULT_SETTINGS: TimerSettings =; export const SETTINGS_RANGE =; export interface BadgeState; export interface FriendEntry
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
- 0001: S1 타이머 홈 — 히어로 + 타이머 카드 + 1차 액션 (files: src/pages/Home.tsx, src/components/CircularProgress.tsx)
- 0002: S1 홈 — 태그 저장 BottomSheet · 포기 확인 · 배지 축하 (files: src/pages/Home.tsx, src/components/TagSheet.tsx, src/components/BadgeCelebrationSheet.tsx)
- 0003: S2 캘린더 화면 (files: src/pages/Calendar.tsx)
- 0004: S3 일별 기록 화면 (state 방어 · 필터 · 수정/삭제) (files: src/pages/History.tsx)
- 0005: S4 주간 리포트 — 잠금 상태 & 리워드 광고 게이트 (files: src/pages/Report.tsx)
- 0006: S4 주간 리포트 — 결과 카드 (히어로 · 추이 · 태그 비중) (files: src/components/WeeklyReportResult.tsx, src/pages/Report.tsx)
- 0007: [부가] S5 더보기 화면 (files: src/pages/More.tsx)
- 0008: [부가] S6 배지 화면 (files: src/pages/Badges.tsx)
- 0009: [부가] S7 친구 랭킹 화면 (files: src/components/MonthNav.tsx, src/components/SummaryHero.tsx, src/components/Sparkline.tsx, src/components/MiniBar.tsx, src/components/RecentRecordsCard.tsx, src/components/AddRecordCTA.tsx, src/components/AdSlotBanner.tsx)
- 0010: [부가] S8 설정 화면 (검증 · 저장 · 초기화) (files: src/pages/RecordNew.tsx, src/pages/RecordEdit.tsx)
- 0011: 라우터 + 앱 셸 + FloatingTabBar 배선 (진입점 소유자) (files: src/App.tsx, src/components/AppShell.tsx, src/components/RouteFallback.tsx)
- 0012: 온보딩 시트 · 전역 ErrorBoundary · 검수 정책 스윕 (files: src/components/OnboardingSheet.tsx, src/components/ErrorBoundary.tsx, src/hooks/useBannerVisible.ts)
- heal-1-01: 진입점 배선 복구 — 라우터 + ScreenScaffold 셸 + FloatingTabBar + 전 라우트 플레이스홀더 (files: .gitignore, src/main.tsx, src/App.tsx, src/components/FloatingTabBar.tsx, src/lib/types.ts, src/pages/Home.tsx, src/pages/Calendar.tsx, src/pages/History.tsx, src/pages/Report.tsx, src/pages/More.tsx, src/pages/Badges.tsx, src/pages/Rank.tsx, src/pages/Settings.tsx)
- heal-1-02: 공용 스토리지·도메인 레이어 — localStorage 어댑터와 KST 날짜/집계 순수 함수 (files: src/lib/storage.ts, src/lib/datetime.ts, src/lib/domain.ts)
- heal-1-03: S1 타이머 홈 화면 실구현 (플레이스홀더 대체) (files: src/pages/Home.tsx, src/components/CircularProgress.tsx)
- imp-20261009-01: [개선] 갈 수 없는 화면 6개에 진입점 만들기 (files: src/pages/Home.tsx, src/pages/Badges.tsx, src/pages/Calendar.tsx)

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

// src/components/CircularProgress.tsx
export function CircularProgress({

// src/components/CountUp.tsx
export function CountUp({

// src/components/FloatingTabBar.tsx
export type TabItem = {
export function FloatingTabBar({ items }: { items: TabItem[] }) {

// src/components/MiniBar.tsx
export function MiniBar({

// src/components/PageShell.tsx
export function PageShell({

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

// src/lib/analytics.ts
export type LogFields = Record<string, string | number | boolean | null>;
export const DWELL_MS = 3000;
export function fireAndForget(call: () => unknown): void {
export function logScreen(page: string, extra?: LogFields): void {
export function logClick(name: string, extra?: LogFields): void {
export function logImpression(name: string, extra?: LogFields): void {
export function useScreenLog(page: string): void {

// src/lib/contract.ts
export type FocusRecord = { id: string; date: string; tagId: string; durationMs: number; note: string };
export type SessionData = { startTime: number; elapsedMs: number; status: 'idle' | 'running' | 'paused' };
export type Badge = { id: string; name: strin

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(4), general(14), testing(2), ui(3)

Key lessons (verify against actual code before applying):
- [general] 진입점 라우터 배선은 맨 끝에 두지 말고 기반 패킷 직후 플레이스홀더 페이지와 함께 먼저 병합하라. 화면 패킷은 그 플레이스홀더를 교체하게 해서, 언제 중단돼도 병합된 화면에 도달할 수 있게 하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 파일 생성 전 디렉토리 구조 확인 — mkdir -p로 경로 보장 (60% · 타 앱 1회 — 맹신 금지)
- [general] 화면·라우팅 등 소비자 모듈은 그것이 import하는 생산자 모듈이 병합된 뒤에만 병합하고, 순서를 지킬 수 없으면 소비자 병합과 동시에 최소 플레이스홀더를 만들어 매 병합 직후 타입체크와 빌드가 항상 통과하도록 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 전역 라우팅·탭바·Provider 배선은 개별 화면보다 먼저(초반 20% 안에) 완료하고 미구현 화면은 스텁 라우트로 연결해, 시간 예산이 소진돼도 앱이 항상 실행 가능한 상태를 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 저장·데이터 접근 등 기반 계층 패킷은 이를 import 하는 화면 패킷보다 반드시 먼저 완료·병합하고, 미완료면 상위 화면 패킷 병합을 차단하라 — 빈 기반 모듈 하나가 전 라우트 스모크를 무너뜨린다. (60% · 타 앱 1회 — 맹신 금지)