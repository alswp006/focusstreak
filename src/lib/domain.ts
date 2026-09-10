/**
 * 순수 집계/도메인 로직. DOM·React 의존 없음.
 * getDayLevel/sumMinutesByDate/computeStreak/buildWeeklyReport/BADGE_DEFS/evaluateBadges
 */
import { isValidDateKey, toDateKey } from "./datetime";

export interface FocusSession {
  startedAt: string; // 'YYYY-MM-DD' 또는 파싱 가능한 날짜 문자열
  minutes: number;
  tag?: string;
}

export interface StreakState {
  current: number;
  longest: number;
}

export interface WeeklyReport {
  totalMin: number;
  avgMin: number;
  goalMetDays: number;
  days: Array<{
    dayIndex: number; // 0 = 월, 6 = 일
    dayMin: number;
  }>;
  tagBreakdown: Record<string, number>;
}

export type BadgeId =
  | "first-step"
  | "streak-3"
  | "streak-7"
  | "streak-30"
  | "total-10h"
  | "total-50h"
  | "deep-focus";

export interface BadgeInfo {
  id: BadgeId;
  title: string;
  condition: (sessions: FocusSession[], streak: StreakState) => boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function sessionDateKey(session: FocusSession): string {
  if (isValidDateKey(session.startedAt)) return session.startedAt;
  const parsed = Date.parse(session.startedAt);
  return Number.isNaN(parsed) ? session.startedAt : toDateKey(parsed);
}

function totalMinutes(sessions: FocusSession[]): number {
  return sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
}

function isNextDay(dateKeyA: string, dateKeyB: string): boolean {
  const [ay, am, ad] = dateKeyA.split("-").map(Number);
  const [by, bm, bd] = dateKeyB.split("-").map(Number);
  const aUtc = Date.UTC(ay, am - 1, ad);
  const bUtc = Date.UTC(by, bm - 1, bd);
  return bUtc - aUtc === DAY_MS;
}

/** 하루 총 집중 시간 대비 목표 달성 레벨 (0=없음, 1=일부, 2=목표 달성, 3=목표 초과 달성) */
export function getDayLevel(totalMin: number, goalMinPerDay: number): 0 | 1 | 2 | 3 {
  if (!totalMin || totalMin <= 0) return 0;
  if (!goalMinPerDay || goalMinPerDay <= 0) return 3;
  if (totalMin < goalMinPerDay) return 1;
  if (totalMin < goalMinPerDay * 1.5) return 2;
  return 3;
}

/** 세션 배열 → 날짜별 총 분(min) */
export function sumMinutesByDate(sessions: FocusSession[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const session of sessions) {
    const key = sessionDateKey(session);
    result[key] = (result[key] ?? 0) + (session.minutes ?? 0);
  }
  return result;
}

/** 목표 달성 연속일 계산 (current: 오늘/어제까지 이어진 연속일, longest: 역대 최장 연속일) */
export function computeStreak(sessions: FocusSession[], goalMinPerDay: number): StreakState {
  const dailyTotals = sumMinutesByDate(sessions);
  const metDates = Object.keys(dailyTotals)
    .filter((key) => dailyTotals[key] >= goalMinPerDay)
    .sort();

  if (metDates.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < metDates.length; i++) {
    run = isNextDay(metDates[i - 1], metDates[i]) ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const todayKey = toDateKey(Date.now());
  const mostRecent = metDates[metDates.length - 1];
  let current = 0;
  if (mostRecent === todayKey || isNextDay(mostRecent, todayKey)) {
    current = 1;
    for (let i = metDates.length - 1; i > 0; i--) {
      if (isNextDay(metDates[i - 1], metDates[i])) {
        current += 1;
      } else {
        break;
      }
    }
  }

  return { current, longest };
}

function isoWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4DayNum = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4.getTime() - jan4DayNum * DAY_MS);
  return new Date(week1Monday.getTime() + (week - 1) * 7 * DAY_MS);
}

function weekDateKeys(weekKey: string): string[] {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!match) return [];
  const year = Number(match[1]);
  const week = Number(match[2]);
  const monday = isoWeekMonday(year, week);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime() + i * DAY_MS);
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`);
  }
  return keys;
}

/** 특정 주(weekKey)의 요약 리포트. days는 항상 길이 7, dayIndex 0(월)~6(일). */
export function buildWeeklyReport(sessions: FocusSession[], weekKey: string, goalMinPerDay: number): WeeklyReport {
  const weekDates = weekDateKeys(weekKey);
  const dayMinutes = new Array(7).fill(0) as number[];
  const tagBreakdown: Record<string, number> = {};
  let totalMin = 0;

  for (const session of sessions) {
    const dateKey = sessionDateKey(session);
    const dayIndex = weekDates.indexOf(dateKey);
    if (dayIndex === -1) continue;

    const minutes = session.minutes ?? 0;
    dayMinutes[dayIndex] += minutes;
    totalMin += minutes;

    const tag = session.tag ?? "기타";
    tagBreakdown[tag] = (tagBreakdown[tag] ?? 0) + minutes;
  }

  const goalMetDays = goalMinPerDay > 0 ? dayMinutes.filter((min) => min >= goalMinPerDay).length : 0;
  const avgMin = totalMin === 0 ? 0 : Math.round(totalMin / 7);

  return {
    totalMin,
    avgMin,
    goalMetDays,
    days: dayMinutes.map((dayMin, dayIndex) => ({ dayIndex, dayMin })),
    tagBreakdown,
  };
}

export const BADGE_DEFS: BadgeInfo[] = [
  {
    id: "first-step",
    title: "첫 기록",
    condition: (sessions) => sessions.length > 0,
  },
  {
    id: "streak-3",
    title: "3일 연속 집중",
    condition: (_sessions, streak) => streak.current >= 3,
  },
  {
    id: "streak-7",
    title: "일주일 연속 집중",
    condition: (_sessions, streak) => streak.current >= 7,
  },
  {
    id: "streak-30",
    title: "한 달 연속 집중",
    condition: (_sessions, streak) => streak.longest >= 30,
  },
  {
    id: "total-10h",
    title: "누적 10시간 달성",
    condition: (sessions) => totalMinutes(sessions) >= 600,
  },
  {
    id: "total-50h",
    title: "누적 50시간 달성",
    condition: (sessions) => totalMinutes(sessions) >= 3000,
  },
  {
    id: "deep-focus",
    title: "2시간 몰입",
    condition: (sessions) => sessions.some((s) => (s.minutes ?? 0) >= 120),
  },
];

/** 조건을 만족하는 배지 id 목록 */
export function evaluateBadges(sessions: FocusSession[], streak: StreakState): BadgeId[] {
  return BADGE_DEFS.filter((badge) => badge.condition(sessions, streak)).map((badge) => badge.id);
}
