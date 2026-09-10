/**
 * 원형 진행 인디케이터 — SVG 기반, TDS에 없는 커스텀 시각 요소.
 *
 * Pre-built (재구현 금지 대상 후보): 타이머 카드 등에서 남은/경과 비율을 원형으로 표시할 때.
 * 색상은 adaptive 토큰만 사용(다크모드 자동, HEX 금지).
 */
export function CircularProgress({
  ratio,
  size = 180,
  strokeWidth = 12,
  testId,
}: {
  /** 0..1 진행률(범위 밖은 클램프) */
  ratio: number;
  size?: number;
  strokeWidth?: number;
  testId?: string;
}) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <svg
      data-testid={testId}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="집중 진행률"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--adaptiveGrey100)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--adaptiveBlue500)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
