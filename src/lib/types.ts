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
export type IsValidDateKeyFn = (value: string) => boolean;
