import { useState, useEffect, useRef } from "react";
import {
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";
import "@/styles/reward-ad.css";

interface TossRewardAdProps {
  /** 광고 슬롯 ID (앱인토스 콘솔에서 발급) */
  slotId: string;
  /** 광고 시청 완료 후 보여줄 콘텐츠 */
  children: React.ReactNode;
  /** 광고 시청 전 표시할 안내 문구 */
  description?: string;
  /** 광고 버튼 텍스트 */
  buttonText?: string;
  /** 실패 후 재시도 버튼 텍스트 (onError를 준 경우에만 쓰임) */
  retryButtonText?: string;
  /** 광고 시청 완료 콜백 */
  onRewarded?: () => void;
  /**
   * 광고 로드/재생 실패 콜백. 주면 실패 시 자동 언락하지 않고 대신 이 콜백을 호출한 뒤
   * 버튼을 retryButtonText로 바꿔 재시도할 수 있게 한다(호출자가 실패 횟수 등을 직접 관리).
   * 생략하면 기존 동작(실패 시 자동 언락)을 유지한다.
   */
  onError?: (info: { phase: "load" | "show" }) => void;
  /** 광고 로드 타임아웃 (ms). 초과 시 자동 언락 */
  timeoutMs?: number;
  /** 트리거 버튼 data-testid (선택) */
  testId?: string;
}

/**
 * 보상형 광고 게이트 컴포넌트.
 * 광고 시청 완료 전까지 children을 숨기고, 시청 후 노출합니다.
 * 광고 로드 실패 / 타임아웃 / 앱인토스 외 환경(개발 브라우저 등) → 자동 언락.
 * onError를 주면 실패를 호출자에게 위임(자동 언락하지 않음) — 실패 횟수 추적 후
 * 일정 횟수 초과 시 광고 없이 열어주는 등의 정책을 호출자가 구현할 수 있다.
 *
 * SDK는 loadFullScreenAd + showFullScreenAd를 imperative API로 제공하므로
 * 이 컴포넌트가 React 래핑 레이어 역할을 합니다.
 *
 * ```tsx
 * <TossRewardAd slotId="result-unlock">
 *   <ResultContent data={result} />
 * </TossRewardAd>
 * ```
 */
export function TossRewardAd({
  slotId,
  children,
  description = "광고를 시청하면 결과를 확인할 수 있어요",
  buttonText = "광고 보고 확인하기",
  retryButtonText = "다시 시도",
  onRewarded,
  onError,
  timeoutMs = 15000,
  testId,
}: TossRewardAdProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [isShowing, setIsShowing] = useState(false);
  const [failed, setFailed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the ad on mount
  useEffect(() => {
    try {
      loadFullScreenAd({
        slotId,
        onEvent: () => {},
        onError: () => {
          // Load failed (e.g., local browser) — auto-unlock, unless caller wants to handle it
          if (onError) {
            setFailed(true);
            onError({ phase: "load" });
            return;
          }
          setUnlocked(true);
          onRewarded?.();
        },
      } as Parameters<typeof loadFullScreenAd>[0]);
    } catch {
      // SDK not available (e.g., jsdom) — auto-unlock regardless (feature unavailable in this env)
      setUnlocked(true);
      onRewarded?.();
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId]);

  if (unlocked) {
    return <>{children}</>;
  }

  const handleWatch = () => {
    setIsShowing(true);
    setFailed(false);

    // Timeout fallback
    timeoutRef.current = setTimeout(() => {
      setUnlocked(true);
      onRewarded?.();
    }, timeoutMs);

    try {
      showFullScreenAd({
        slotId,
        onEvent: (event: { type?: string }) => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          // event.type === 'rewarded' indicates completion (SDK version-dependent)
          // For safety, unlock on any event that finishes the ad
          setUnlocked(true);
          setIsShowing(false);
          if (event?.type === "rewarded" || event?.type === "completed") {
            onRewarded?.();
          } else {
            // dismissed or other — still unlock for UX (policy: gate only final payoff)
            onRewarded?.();
          }
        },
        onError: () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setIsShowing(false);
          // Playback failed — unlock as fallback, unless caller wants to handle it
          if (onError) {
            setFailed(true);
            onError({ phase: "show" });
            return;
          }
          setUnlocked(true);
          onRewarded?.();
        },
      } as Parameters<typeof showFullScreenAd>[0]);
    } catch {
      // SDK call threw
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsShowing(false);
      if (onError) {
        setFailed(true);
        onError({ phase: "show" });
        return;
      }
      setUnlocked(true);
      onRewarded?.();
    }
  };

  const label = isShowing ? "광고 재생 중..." : failed ? retryButtonText : buttonText;

  return (
    <div className="reward-ad-gate">
      <p className="reward-ad-description">{description}</p>
      <button
        className={`reward-ad-button${isShowing ? " reward-ad-button--loading" : ""}${failed ? " reward-ad-button--failed" : ""}`}
        onClick={handleWatch}
        disabled={isShowing}
        aria-label={label}
        data-testid={testId}
      >
        {label}
      </button>
    </div>
  );
}
