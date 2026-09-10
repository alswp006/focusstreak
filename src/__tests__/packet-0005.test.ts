import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import React from "react";

import { mockTds, mockRouter } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { toWeekKey } from "@/lib/datetime";

mockTds();
mockRouter();

// 광고 성공/실패 시나리오를 테스트마다 다르게 제어해야 하므로 mockAppsInToss()의 고정
// auto-success 구현 대신 직접 목을 정의한다(loadFullScreenAd/showFullScreenAd만 필요).
const { loadFullScreenAdMock, showFullScreenAdMock } = vi.hoisted(() => ({
  loadFullScreenAdMock: vi.fn(),
  showFullScreenAdMock: vi.fn(),
}));

vi.mock("@apps-in-toss/web-framework", () => ({
  loadFullScreenAd: loadFullScreenAdMock,
  showFullScreenAd: showFullScreenAdMock,
  generateHapticFeedback: vi.fn(),
  Analytics: { screen: vi.fn(async () => {}), click: vi.fn(async () => {}), impression: vi.fn(async () => {}) },
  Storage: {
    setItem: vi.fn(async () => {}),
    getItem: vi.fn(async () => null),
    removeItem: vi.fn(async () => {}),
  },
}));

import Report from "@/pages/Report";

const UNLOCK_KEY = "fs:report_unlock:v1";

function currentWeekKey(): string {
  return toWeekKey(Date.now());
}

function readUnlockState(): { unlocked: Record<string, number>; adFailCount: Record<string, number>; version: number } {
  return JSON.parse(localStorage.getItem(UNLOCK_KEY) ?? "{}");
}

describe("S4 주간 리포트 — 잠금 상태 & 리워드 광고 게이트", () => {
  beforeEach(() => {
    localStorage.clear();
    loadFullScreenAdMock.mockReset();
    showFullScreenAdMock.mockReset();
    loadFullScreenAdMock.mockImplementation((opts: { onEvent?: (e: { type: string }) => void }) => {
      setTimeout(() => opts.onEvent?.({ type: "loaded" }), 0);
    });
  });

  it("AC-1[P0]: 이번 주 unlocked 기록이 없으면 잠금 카드와 해제 버튼만 보이고 리포트 수치는 렌더되지 않는다", () => {
    renderWithRouter(React.createElement(Report));

    expect(screen.getByRole("button", { name: /광고 보고 리포트 열기/ })).not.toBeNull();
    expect(screen.queryByTestId("report-content")).toBeNull();
  });

  it("AC-2[P0]: 광고 시청 완료 콜백이 오면 unlocked[weekKey]가 저장되고 리포트 결과 영역이 즉시 렌더된다", async () => {
    showFullScreenAdMock.mockImplementation((opts: { onEvent?: (e: { type: string }) => void }) => {
      setTimeout(() => opts.onEvent?.({ type: "rewarded" }), 0);
    });

    renderWithRouter(React.createElement(Report));
    fireEvent.click(screen.getByRole("button", { name: /광고 보고 리포트 열기/ }));

    await waitFor(() => {
      expect(screen.getByTestId("report-content")).not.toBeNull();
    });
    expect(screen.queryByRole("button", { name: /광고 보고 리포트 열기/ })).toBeNull();

    const weekKey = currentWeekKey();
    const stored = readUnlockState();
    expect(stored.unlocked[weekKey]).toBeGreaterThan(0);
    expect(stored.version).toBe(1);
  });

  it("AC-3: 이미 unlocked된 weekKey는 재마운트해도 광고 게이트가 다시 나타나지 않는다", () => {
    const weekKey = currentWeekKey();
    localStorage.setItem(
      UNLOCK_KEY,
      JSON.stringify({ unlocked: { [weekKey]: Date.now() }, adFailCount: {}, version: 1 }),
    );

    renderWithRouter(React.createElement(Report));

    expect(screen.queryByRole("button", { name: /광고 보고 리포트 열기/ })).toBeNull();
    expect(screen.getByTestId("report-content")).not.toBeNull();
  });

  it("AC-4[P0]: 광고 실패 시 Toast와 다시 시도 버튼이 보이고 adFailCount가 1 증가한다", async () => {
    showFullScreenAdMock.mockImplementation((opts: { onError?: (e: { code: string }) => void }) => {
      setTimeout(() => opts.onError?.({ code: "AD_LOAD_FAILED" }), 0);
    });

    renderWithRouter(React.createElement(Report));
    fireEvent.click(screen.getByRole("button", { name: /광고 보고 리포트 열기/ }));

    await waitFor(() => {
      expect(screen.getByText("광고를 불러오지 못했어요")).not.toBeNull();
    });
    expect(screen.getByRole("button", { name: /다시 시도/ })).not.toBeNull();

    const weekKey = currentWeekKey();
    const stored = readUnlockState();
    expect(stored.adFailCount[weekKey]).toBe(1);
    expect(stored.unlocked[weekKey]).toBeUndefined();
  });

  it("AC-4: 다시 시도 클릭 시 광고를 재시도하고, 이번엔 성공하면 리포트 잠금이 해제된다", async () => {
    showFullScreenAdMock.mockImplementationOnce((opts: { onError?: (e: { code: string }) => void }) => {
      setTimeout(() => opts.onError?.({ code: "AD_LOAD_FAILED" }), 0);
    });
    showFullScreenAdMock.mockImplementationOnce((opts: { onEvent?: (e: { type: string }) => void }) => {
      setTimeout(() => opts.onEvent?.({ type: "rewarded" }), 0);
    });

    renderWithRouter(React.createElement(Report));
    fireEvent.click(screen.getByRole("button", { name: /광고 보고 리포트 열기/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /다시 시도/ })).not.toBeNull();
    });
    fireEvent.click(screen.getByRole("button", { name: /다시 시도/ }));

    await waitFor(() => {
      expect(screen.getByTestId("report-content")).not.toBeNull();
    });
    expect(showFullScreenAdMock).toHaveBeenCalledTimes(2);

    const weekKey = currentWeekKey();
    const stored = readUnlockState();
    expect(stored.unlocked[weekKey]).toBeGreaterThan(0);
  });

  it("AC-5: adFailCount가 3 이상이면 광고 없이 리포트가 열리고 unlocked에도 기록된다", async () => {
    const weekKey = currentWeekKey();
    localStorage.setItem(
      UNLOCK_KEY,
      JSON.stringify({ unlocked: {}, adFailCount: { [weekKey]: 3 }, version: 1 }),
    );

    renderWithRouter(React.createElement(Report));

    await waitFor(() => {
      expect(screen.getByTestId("report-content")).not.toBeNull();
    });
    expect(screen.queryByRole("button", { name: /광고 보고 리포트 열기/ })).toBeNull();
    expect(showFullScreenAdMock).not.toHaveBeenCalled();

    const stored = readUnlockState();
    expect(stored.unlocked[weekKey]).toBeGreaterThan(0);
  });
});
