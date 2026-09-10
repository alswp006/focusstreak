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

/**
 * JSON 파싱 실패·스키마 불일치 시 예외를 던지지 않고 기본값을 반환
 */
export function read<T>(key: string, fallback: T): T {
  throw new Error("not implemented");
}

/**
 * 값을 localStorage에 저장. sessions 저장 시 startedAt DESC 정렬 + 2000건 초과분 절단
 */
export function write<T>(key: string, value: T): void {
  throw new Error("not implemented");
}

/**
 * fs: 프리픽스 키만 제거
 */
export function clearAllFocusData(): void {
  throw new Error("not implemented");
}
