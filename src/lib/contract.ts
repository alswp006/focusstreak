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
