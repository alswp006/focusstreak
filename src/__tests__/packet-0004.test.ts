import { describe, it, expect, beforeEach } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import React from "react";

import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { toDateKey } from "@/lib/datetime";

mockAll();

import History from "@/pages/History";

const SESSIONS_KEY = "fs:sessions:v1";

describe("S3 일별 기록 화면 (state 방어 · 필터 · 수정/삭제)", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("AC-1[P0]: location.state가 없으면(undefined) 크래시 없이 오늘 dateKey 기록을 렌더한다", () => {
    const todayKey = toDateKey(Date.now());
    seedLocalStorage({
      [SESSIONS_KEY]: [{ startedAt: todayKey, minutes: 42, tag: "공부" }],
    });

    const { container } = renderWithRouter(React.createElement(History), {
      initialEntries: ["/history"],
    });

    expect(container.textContent).toContain("42");
    expect(screen.queryByText("이 날은 집중 기록이 없어요")).toBeNull();
  });

  it("AC-1[P0]: dateKey가 '2026-13-99'처럼 유효하지 않으면 크래시 없이 오늘 dateKey 기록으로 폴백한다", () => {
    const todayKey = toDateKey(Date.now());
    seedLocalStorage({
      [SESSIONS_KEY]: [{ startedAt: todayKey, minutes: 57, tag: "업무" }],
    });

    const { container } = renderWithRouter(React.createElement(History), {
      initialEntries: [{ pathname: "/history", state: { dateKey: "2026-13-99" } }],
    });

    expect(container.textContent).toContain("57");
    expect(screen.queryByText("이 날은 집중 기록이 없어요")).toBeNull();
  });

  it("AC-2: 태그 Chip 선택 시 해당 태그 세션만 남고 상단 합계도 필터 기준으로 갱신된다", () => {
    const todayKey = toDateKey(Date.now());
    seedLocalStorage({
      [SESSIONS_KEY]: [
        { startedAt: todayKey, minutes: 45, tag: "공부" },
        { startedAt: todayKey, minutes: 62, tag: "업무" },
        { startedAt: todayKey, minutes: 89, tag: "운동" },
      ],
    });

    const { container } = renderWithRouter(React.createElement(History), {
      initialEntries: [{ pathname: "/history", state: { dateKey: todayKey } }],
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(container.textContent).toContain("196");

    fireEvent.click(screen.getByRole("button", { name: "업무" }));

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(container.textContent).not.toContain("196");
    expect(container.textContent).toContain("62");
    expect(container.textContent).not.toContain("45");
    expect(container.textContent).not.toContain("89");
  });

  it("AC-3: 세션이 20건을 초과하면 '더 보기'로 20건씩 추가 렌더되고 전부 노출되면 버튼이 사라진다", () => {
    const todayKey = toDateKey(Date.now());
    const sessions = Array.from({ length: 25 }, (_, i) => ({
      startedAt: todayKey,
      minutes: i + 1,
      tag: "공부",
    }));
    seedLocalStorage({ [SESSIONS_KEY]: sessions });

    renderWithRouter(React.createElement(History), {
      initialEntries: [{ pathname: "/history", state: { dateKey: todayKey } }],
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    const moreButton = screen.getByRole("button", { name: /더 보기/ });
    expect(moreButton.tagName).toBe("BUTTON");

    fireEvent.click(moreButton);

    expect(screen.getAllByRole("listitem")).toHaveLength(25);
    expect(screen.queryByRole("button", { name: /더 보기/ })).toBeNull();
  });

  it("AC-4[P0]: 삭제를 확정하면 세션이 목록·localStorage에서 제거되고 삭제 완료 Toast가 뜬다", () => {
    const todayKey = toDateKey(Date.now());
    seedLocalStorage({
      [SESSIONS_KEY]: [{ startedAt: todayKey, minutes: 77, tag: "공부" }],
    });

    const { container } = renderWithRouter(React.createElement(History), {
      initialEntries: [{ pathname: "/history", state: { dateKey: todayKey } }],
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(1);

    const deleteTrigger = screen.getAllByRole("button", { name: /삭제/ })[0];
    fireEvent.click(deleteTrigger);

    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /삭제/ }));

    expect(screen.getByText("기록을 삭제했어요").textContent).toBe("기록을 삭제했어요");
    expect(container.textContent).not.toContain("77");

    const stored = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? "[]");
    expect(stored).toHaveLength(0);
  });

  it("AC-5: 해당 날짜 세션이 0건이면 빈 상태와 '집중 시작하기' 버튼이 렌더되고 클릭 시 '/'로 이동한다", () => {
    seedLocalStorage({ [SESSIONS_KEY]: [] });

    const { container } = renderWithRouter(React.createElement(History), {
      initialEntries: [{ pathname: "/history", state: { dateKey: "2020-01-01" } }],
    });

    expect(screen.getByText("이 날은 집중 기록이 없어요").textContent).toBe("이 날은 집중 기록이 없어요");
    expect(container.querySelector("[data-content-icon]")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "집중 시작하기" }));

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
