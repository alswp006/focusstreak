/**
 * @ai-factory:placeholder
 * Asia/Seoul(UTC+9) 고정으로 toDateKey(ms)→'YYYY-MM-DD', isValidDateKey(v),
 * toWeekKey(ms)→'YYYY-Www'(ISO, 월요일 시작), startOfWeek/addMonths/isFutureMonth 유틸
 */

export function toDateKey(timestamp: number): string {
  throw new Error("not implemented");
}

export function isValidDateKey(value: string): boolean {
  throw new Error("not implemented");
}

export function toWeekKey(timestamp: number): string {
  throw new Error("not implemented");
}

export function startOfWeek(dateKey: string): number {
  throw new Error("not implemented");
}

export function addMonths(timestamp: number, months: number): number {
  throw new Error("not implemented");
}

export function isFutureMonth(timestamp: number): boolean {
  throw new Error("not implemented");
}
