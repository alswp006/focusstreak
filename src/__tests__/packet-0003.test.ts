import { describe, it, expect, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import React from "react";

import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { getDayLevel } from "@/lib/domain";
import { toDateKey, addMonths } from "@/lib/datetime";

mockAll();

import Calendar from "@/pages/Calendar";

const SESSIONS_KEY = "fs:sessions:v1";
const SETTINGS_KEY = "fs:settings:v1";

describe("S2 캘린더 화면", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("AC-1[P0]: 오늘 날짜 셀의 data-level이 domain.getDayLevel 결과와 일치한다", () => {
    const todayKey = toDateKey(Date.now());
    const goalMinPerDay = 60;
    const minutes = 40;
    const expectedLevel = getDayLevel(minutes, goalMinPerDay);
    expect(expectedLevel).toBe(1);

    seedLocalStorage({
      [SESSIONS_KEY]: [{ startedAt: todayKey, minutes }],
      [SETTINGS_KEY]: { goalMinPerDay },
    });

    const { container } = renderWithRouter(React.createElement(Calendar));

    const cell = container.querySelector(`[data-date-key="${todayKey}"]`);
    expect(cell).not.toBeNull();
    expect(cell?.getAttribute("data-level")).toBe(String(expectedLevel));
  });

  it("AC-1[P0]: 세션 없는 날의 data-level은 0이다", () => {
    seedLocalStorage({
      [SESSIONS_KEY]: [],
      [SETTINGS_KEY]: { goalMinPerDay: 60 },
    });

    const { container } = renderWithRouter(React.createElement(Calendar));

    const cells = container.querySelectorAll("[data-date-key]");
    expect(cells.length).toBeGreaterThan(0);
    cells.forEach((cell) => {
      expect(cell.getAttribute("data-level")).toBe("0");
    });
  });

  it("AC-2: 각 날짜 셀은 44px 이상 크기이고 배경색은 CSS 변수 토큰만 사용한다", () => {
    const todayKey = toDateKey(Date.now());
    seedLocalStorage({
      [SESSIONS_KEY]: [{ startedAt: todayKey, minutes: 90 }],
      [SETTINGS_KEY]: { goalMinPerDay: 60 },
    });

    const { container } = renderWithRouter(React.createElement(Calendar));

    const cell = container.querySelector(`[data-date-key="${todayKey}"]`) as HTMLElement;
    expect(cell).not.toBeNull();

    const minWidth = parseInt(cell.style.minWidth || "0", 10);
    const minHeight = parseInt(cell.style.minHeight || "0", 10);
    expect(minWidth).toBeGreaterThanOrEqual(44);
    expect(minHeight).toBeGreaterThanOrEqual(44);

    const bg = cell.style.backgroundColor;
    expect(bg).toMatch(/^var\(--tds-color-/);
    expect(bg).not.toMatch(/#([0-9a-fA-F]{3}){1,2}/);
  });

  it("AC-3[P0]: 이번 달을 표시 중일 때 '다음 달' 버튼은 비활성, '이전 달'은 항상 활성이다", () => {
    renderWithRouter(React.createElement(Calendar));

    const nextButton = screen.getByRole("button", { name: /다음 달/ }) as HTMLButtonElement;
    const prevButton = screen.getByRole("button", { name: /이전 달/ }) as HTMLButtonElement;

    expect(nextButton.disabled).toBe(true);
    expect(prevButton.disabled).toBe(false);

    fireEvent.click(prevButton);

    const nextButtonAfterPrev = screen.getByRole("button", { name: /다음 달/ }) as HTMLButtonElement;
    const prevButtonAfterPrev = screen.getByRole("button", { name: /이전 달/ }) as HTMLButtonElement;
    expect(nextButtonAfterPrev.disabled).toBe(false);
    expect(prevButtonAfterPrev.disabled).toBe(false);
  });

  it("AC-4[P0]: 셀 탭 시 navigate('/history', { state: { dateKey } })가 'YYYY-MM-DD' 형식으로 호출된다", () => {
    const todayKey = toDateKey(Date.now());
    seedLocalStorage({
      [SESSIONS_KEY]: [{ startedAt: todayKey, minutes: 30 }],
      [SETTINGS_KEY]: { goalMinPerDay: 60 },
    });

    const { container } = renderWithRouter(React.createElement(Calendar));

    const cell = container.querySelector(`[data-date-key="${todayKey}"]`) as HTMLElement;
    expect(cell).not.toBeNull();

    fireEvent.click(cell);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const [path, options] = mockNavigate.mock.calls[0];
    expect(path).toBe("/history");
    expect(options).toEqual({ state: { dateKey: todayKey } });
    expect(options.state.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("AC-5: 표시 월에 세션이 0건이면 그리드는 유지되고 빈 상태 안내가 렌더된다", () => {
    seedLocalStorage({
      [SESSIONS_KEY]: [],
      [SETTINGS_KEY]: { goalMinPerDay: 60 },
    });

    const { container } = renderWithRouter(React.createElement(Calendar));

    const cells = container.querySelectorAll("[data-date-key]");
    expect(cells.length).toBeGreaterThan(0);

    const emptyText = screen.getByText("이번 달 집중 기록이 아직 없어요");
    expect(emptyText.textContent).toBe("이번 달 집중 기록이 아직 없어요");
    expect(container.querySelector("[data-content-icon]")).not.toBeNull();
  });

  it("AC-3: 이전 달로 두 번 이동해도 미래 달로는 이동할 수 없다 (다음 달 disabled 유지 조건 검증용 왕복)", () => {
    renderWithRouter(React.createElement(Calendar));

    const prevButton = screen.getByRole("button", { name: /이전 달/ });
    fireEvent.click(prevButton);
    fireEvent.click(screen.getByRole("button", { name: /이전 달/ }));

    // 두 달 전으로 이동한 뒤 다시 다음 달로 두 번 이동하면 이번 달로 돌아와야 하고
    // 그 시점엔 '다음 달'이 다시 비활성이어야 한다 (미래 달 이동 불가 검증)
    fireEvent.click(screen.getByRole("button", { name: /다음 달/ }));
    fireEvent.click(screen.getByRole("button", { name: /다음 달/ }));

    const nextButton = screen.getByRole("button", { name: /다음 달/ }) as HTMLButtonElement;
    expect(nextButton.disabled).toBe(true);

    const thisMonthKey = toDateKey(Date.now());
    const staleMonthKey = toDateKey(addMonths(Date.now(), -2));
    expect(thisMonthKey).not.toBe(staleMonthKey);
  });
});
