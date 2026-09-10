/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 홈→저장, 캘린더/히스토리/리포트에서 표시 (구현: 패킷 0001) */
export type TimerSession = { id: string; date: string; startedAt: number; endedAt: number; durationMs: number; amountKrw: number; tags: string[]; status: 'completed' | 'abandoned' };

/** 캘린더, 리포트, 히스토리에서 조회 (구현: 패킷 0004) */
export type DailyRecord = { date: string; sessions: TimerSession[]; totalDurationMs: number; totalAmountKrw: number };

/** 홈(축하 시트), 배지 화면, 리포트(리워드) (구현: 패킷 0008) */
export type Badge = { id: string; name: string; description: string; icon: string; criterion: string; unlockedAt?: string };

/** 홈(입력), 히스토리(필터), 리포트(비중) (구현: 패킷 0002) */
export type Tag = { id: string; name: string; emoji?: string };

/** 리포트 결과 카드 (구현: 패킷 0006) */
export type WeeklyStats = { week: string; totalDurationMs: number; totalAmountKrw: number; tagDistribution: Record<string, number>; newBadges: Badge[] };

/** 모든 화면에서 타이머 데이터 접근 (구현: 패킷 0001) */
export type useTimerStoreFn = () => { sessions: TimerSession[]; saveSession: (s: TimerSession) => void; deleteSession: (id: string) => void; clearAll: () => void };

/** 캘린더, 히스토리, 리포트에서 특정 날짜 기록 조회 (구현: 패킷 0004) */
export type useDailyRecordFn = (date: string) => DailyRecord | null;

/** 홈(축하), 배지 화면 (구현: 패킷 0008) */
export type useBadgeProgressFn = () => { all: Badge[]; unlocked: Badge[]; newly: Badge[] };

/** 홈(태그 저장), 히스토리(필터), 리포트 (구현: 패킷 0002) */
export type useUserTagsFn = () => { tags: Tag[]; addTag: (name: string, emoji?: string) => void; deleteTag: (id: string) => void };

/** 모든 화면의 시간 표시 (구현: 패킷 0001) */
export type formatDurationFn = (ms: number, format?: 'short' | 'long') => string;

/** 리포트, 더보기에서 금액 표시 (구현: 패킷 0005) */
export type formatCurrencyFn = (krw: number) => string;

/** 리포트 결과 계산 (구현: 패킷 0006) */
export type calculateWeeklyStatsFn = (sessions: TimerSession[], week: string) => WeeklyStats;

/** 배지 달성 여부 판정 (구현: 패킷 0008) */
export type getBadgeUnlockStatusFn = (badge: Badge, sessions: TimerSession[]) => boolean;

/** 타이머 기본값, 홈에서 사용 (구현: 패킷 0010) */
export type TIMER_MODES = { focus: { durationMs: number; rewardKrw: number }; break: { durationMs: number } };

/** 모든 화면에서 설정 접근 (구현: 패킷 0010) */
export type useAppConfigFn = () => { timerMode: 'focus' | 'break'; rewardPerMin: number; updateConfig: (cfg: Partial<{ timerMode: 'focus' | 'break'; rewardPerMin: number }>) => void };
