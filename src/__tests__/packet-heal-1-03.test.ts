import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import React from "react";

import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage, advanceTimers } from "@/__tests__/__helpers__/test-utils";
import { toDateKey } from "@/lib/datetime";

mockAll();

import Home from "@/pages/Home";

const SESSIONS_KEY = "fs:sessions:v1";
const SETTINGS_KEY = "fs:settings:v1";
const DEFAULT_GOAL_MIN_PER_DAY = 120;

/** "mm:ss" 텍스트를 총 초로 변환 — 기본 집중 시간(분) 값을 가정하지 않기 위해 delta만 검증 */
function parseClockToSeconds(text: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) throw new Error(`unexpected clock format: "${text}"`);
  return Number(match[1]) * 60 + Number(match[2]);
}

describe("S1 타이머 홈 화면 실구현 (플레이스홀더 대체)", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("AC-1[P0]: 오늘 누적 0분이면 히어로 caption이 '오늘 첫 집중을 시작해보세요'다", async () => {
    seedLocalStorage({
      [SESSIONS_KEY]: [],
      [SETTINGS_KEY]: { goalMinPerDay: DEFAULT_GOAL_MIN_PER_DAY },
    });

    renderWithRouter(React.createElement(Home));
    await advanceTimers(200); // hydrate 완료 대기

    expect(screen.getByText("오늘 첫 집중을 시작해보세요")).toBeInTheDocument();
    expect(screen.queryByText(/^목표 \d+분 중 \d+%$/)).toBeNull();
  });

  it("AC-1[P0]: 오늘 누적이 1분 이상이면 caption이 '목표 {goalMin}분 중 {pct}%'로 렌더된다", async () => {
    const todayKey = toDateKey(Date.now());
    seedLocalStorage({
      [SESSIONS_KEY]: [{ startedAt: todayKey, minutes: 30, tag: "공부" }],
      [SETTINGS_KEY]: { goalMinPerDay: DEFAULT_GOAL_MIN_PER_DAY },
    });

    renderWithRouter(React.createElement(Home));
    await advanceTimers(200);

    // 30 / 120 = 25%
    expect(screen.getByText("목표 120분 중 25%")).toBeInTheDocument();
    expect(screen.queryByText("오늘 첫 집중을 시작해보세요")).toBeNull();
  });

  it("AC-2[P0]: hydrate 완료 전엔 today-hero/timer-card에 Skeleton이 보이고, 완료 후 실제 콘텐츠로 바뀐다", async () => {
    seedLocalStorage({
      [SESSIONS_KEY]: [],
      [SETTINGS_KEY]: { goalMinPerDay: DEFAULT_GOAL_MIN_PER_DAY },
    });

    renderWithRouter(React.createElement(Home));

    // 렌더 직후(hydrate effect의 매크로태스크가 아직 flush되지 않은 시점) — Skeleton이 자리를 채우고
    // 빈 상태 문구는 아직 노출되지 않아야 한다.
    const heroSkeletons = screen.getByTestId("today-hero").querySelectorAll("[data-skeleton]");
    const cardSkeletons = screen.getByTestId("timer-card").querySelectorAll("[data-skeleton]");
    expect(heroSkeletons.length + cardSkeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText("오늘 첫 집중을 시작해보세요")).toBeNull();

    await advanceTimers(200);

    expect(screen.getByTestId("today-hero").querySelectorAll("[data-skeleton]")).toHaveLength(0);
    expect(screen.getByTestId("timer-card").querySelectorAll("[data-skeleton]")).toHaveLength(0);
    expect(screen.getByText("오늘 첫 집중을 시작해보세요")).toBeInTheDocument();
  });

  it("AC-3[P0]: primary 버튼 라벨이 idle→'집중 시작', running→'일시정지', paused→'이어서 집중' 순으로 바뀐다", async () => {
    seedLocalStorage({
      [SESSIONS_KEY]: [],
      [SETTINGS_KEY]: { goalMinPerDay: DEFAULT_GOAL_MIN_PER_DAY },
    });

    renderWithRouter(React.createElement(Home));
    await advanceTimers(200);

    const button = screen.getByTestId("timer-primary-button");
    expect(button.tagName).toBe("BUTTON");
    expect(button.querySelector("button")).toBeNull(); // button>button 중첩 금지
    expect(button.textContent).toBe("집중 시작");

    fireEvent.click(screen.getByTestId("timer-primary-button"));
    expect(screen.getByTestId("timer-primary-button").textContent).toBe("일시정지");

    fireEvent.click(screen.getByTestId("timer-primary-button"));
    expect(screen.getByTestId("timer-primary-button").textContent).toBe("이어서 집중");
  });

  it("AC-4: phase가 running인 동안 AdSlot이 사라지고, idle/paused에서는 콘텐츠 하단에 1개 존재한다", async () => {
    seedLocalStorage({
      [SESSIONS_KEY]: [],
      [SETTINGS_KEY]: { goalMinPerDay: DEFAULT_GOAL_MIN_PER_DAY },
    });

    const { container } = renderWithRouter(React.createElement(Home));
    await advanceTimers(200);

    expect(container.querySelectorAll(".ad-slot")).toHaveLength(1); // idle

    fireEvent.click(screen.getByTestId("timer-primary-button")); // idle -> running
    expect(container.querySelectorAll(".ad-slot")).toHaveLength(0);

    fireEvent.click(screen.getByTestId("timer-primary-button")); // running -> paused
    expect(container.querySelectorAll(".ad-slot")).toHaveLength(1);
  });

  it("AC-5[P0]: 백그라운드 후 복귀해도 endsAt 기준으로 남은 시간이 정확히 재계산된다(누산 카운트다운 아님)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    seedLocalStorage({
      [SESSIONS_KEY]: [],
      [SETTINGS_KEY]: { goalMinPerDay: DEFAULT_GOAL_MIN_PER_DAY },
    });

    renderWithRouter(React.createElement(Home));
    vi.advanceTimersByTime(500); // hydrate defer(setTimeout/rAF 등) flush

    fireEvent.click(screen.getByTestId("timer-primary-button")); // idle -> running
    const before = parseClockToSeconds(screen.getByTestId("timer-clock").textContent ?? "");

    // 65초간 백그라운드(인터벌 틱 없이 시스템 시계만 흐름)를 시뮬레이션 — endsAt 기준 재계산이면
    // 정확히 65초가 줄어야 하고, setInterval 누산(1틱=1초) 방식이면 오차가 생긴다.
    vi.setSystemTime(new Date(Date.now() + 65_000));
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(1000); // 인터벌이 있다면 한 틱 흘려보냄

    const after = parseClockToSeconds(screen.getByTestId("timer-clock").textContent ?? "");
    expect(before - after).toBe(65);

    vi.useRealTimers();
  });

  it("AC-6: 렌더된 마크업에 HEX 색상 리터럴이 없다(TDS/adaptive 토큰만 사용)", async () => {
    seedLocalStorage({
      [SESSIONS_KEY]: [],
      [SETTINGS_KEY]: { goalMinPerDay: DEFAULT_GOAL_MIN_PER_DAY },
    });

    const { container } = renderWithRouter(React.createElement(Home));
    await advanceTimers(200);
    fireEvent.click(screen.getByTestId("timer-primary-button")); // running 상태 마크업도 함께 검사

    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
});
