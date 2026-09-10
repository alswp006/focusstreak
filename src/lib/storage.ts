export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

const MAX_SESSIONS = 2000;

/** value가 세션 배열(각 항목에 문자열 startedAt 보유)인지 판별 */
function isSessionArray(value: unknown): value is Array<{ startedAt: string }> {
  return (
    Array.isArray(value) &&
    value.every((item) => item !== null && typeof item === "object" && typeof (item as { startedAt?: unknown }).startedAt === "string")
  );
}

/**
 * JSON 파싱 실패·스키마 불일치 시 예외를 던지지 않고 기본값을 반환
 */
export function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * 값을 localStorage에 저장. sessions 저장 시 startedAt DESC 정렬 + 2000건 초과분 절단
 */
export function write<T>(key: string, value: T): void {
  try {
    let toStore: unknown = value;
    if (isSessionArray(value)) {
      toStore = [...value].sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0)).slice(0, MAX_SESSIONS);
    }
    localStorage.setItem(key, JSON.stringify(toStore));
  } catch {
    // 저장 실패(quota 초과 등)는 조용히 무시 — 화면을 깨뜨리지 않음
  }
}

/**
 * fs: 프리픽스 키만 제거
 */
export function clearAllFocusData(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("fs:")) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
