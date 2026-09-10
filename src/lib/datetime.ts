/**
 * Asia/Seoul(UTC+9) 고정 날짜 유틸. 호스트 시스템 타임존과 무관하게 항상 KST 기준으로
 * 계산한다 — 모든 계산은 UTC getter만 사용하고 "timestamp + 9h"로 KST 벽시계를 흉내낸다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function toKSTWallClock(timestamp: number): Date {
  return new Date(timestamp + KST_OFFSET_MS);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** timestamp(ms) → 'YYYY-MM-DD' (KST 기준) */
export function toDateKey(timestamp: number): string {
  const d = toKSTWallClock(timestamp);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** 'YYYY-MM-DD' 형식이며 실제 존재하는 날짜인지 검사 */
export function isValidDateKey(value: string): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12) return false;
  const check = new Date(Date.UTC(y, m - 1, d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d;
}

/** ISO 8601 주차 계산 (월요일 시작, Thursday 기준 연도 소속) */
function isoWeekOf(y: number, m: number, d: number): { year: number; week: number } {
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = (date.getUTCDay() + 6) % 7; // 월=0 ... 일=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // 이 주의 목요일

  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);

  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return { year: date.getUTCFullYear(), week };
}

/** timestamp(ms) → 'YYYY-Www' (KST 기준, ISO 월요일 시작 주차) */
export function toWeekKey(timestamp: number): string {
  const d = toKSTWallClock(timestamp);
  const { year, week } = isoWeekOf(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  return `${year}-W${pad2(week)}`;
}

/** 해당 dateKey가 속한 주의 월요일 00:00(KST)을 epoch ms로 반환 */
export function startOfWeek(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dayOfWeek = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 월=0 ... 일=6
  const kstMidnightUtcMs = Date.UTC(y, m - 1, d) - KST_OFFSET_MS;
  return kstMidnightUtcMs - dayOfWeek * DAY_MS;
}

/** timestamp에 개월 수를 더한 새 timestamp(ms) (KST 벽시계 기준) */
export function addMonths(timestamp: number, months: number): number {
  const d = toKSTWallClock(timestamp);
  const shifted = new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth() + months,
      d.getUTCDate(),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds()
    )
  );
  return shifted.getTime() - KST_OFFSET_MS;
}

/** timestamp의 KST 연-월이 현재(KST)보다 미래인지 여부 */
export function isFutureMonth(timestamp: number): boolean {
  const target = toKSTWallClock(timestamp);
  const now = toKSTWallClock(Date.now());
  const targetYM = target.getUTCFullYear() * 12 + target.getUTCMonth();
  const nowYM = now.getUTCFullYear() * 12 + now.getUTCMonth();
  return targetYM > nowYM;
}
