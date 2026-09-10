/**
 * @ai-factory:placeholder
 * getDayLevel(totalMin, goalMinPerDay)→0|1|2|3, sumMinutesByDate(sessions),
 * computeStreak(sessions, goalMinPerDay)→StreakState, buildWeeklyReport(sessions, weekKey, goalMinPerDay),
 * BADGE_DEFS(7종), evaluateBadges(sessions, streak)
 */

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

export interface BadgeInfo {
  id: string;
  title: string;
  condition: (sessions: any[], streak: StreakState) => boolean;
}

export const BADGE_DEFS: BadgeInfo[] = [];

export function getDayLevel(totalMin: number, goalMinPerDay: number): 0 | 1 | 2 | 3 {
  throw new Error("not implemented");
}

export function sumMinutesByDate(sessions: any[]): Record<string, number> {
  throw new Error("not implemented");
}

export function computeStreak(sessions: any[], goalMinPerDay: number): StreakState {
  throw new Error("not implemented");
}

export function buildWeeklyReport(
  sessions: any[],
  weekKey: string,
  goalMinPerDay: number
): WeeklyReport {
  throw new Error("not implemented");
}

export function evaluateBadges(sessions: any[], streak: StreakState): string[] {
  throw new Error("not implemented");
}
