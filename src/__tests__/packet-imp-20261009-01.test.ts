import { describe, it, expect, beforeEach } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import React from "react";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage, advanceTimers } from "@/__tests__/__helpers__/test-utils";
import { toDateKey } from "@/lib/datetime";

mockAll();

import Home from "@/pages/Home";
import Calendar from "@/pages/Calendar";

const SESSIONS_KEY = "fs:sessions:v1";
const SETTINGS_KEY = "fs:settings:v1";
const SRC = join(__dirname, "..");
const PAGES_DIR = join(SRC, "pages");

const appSource = readFileSync(join(SRC, "App.tsx"), "utf8");

/** 다른 화면 파일 중 해당 경로로 가는 navigate('/x')·to="/x"·path: '/x'(탭 항목)가 있는 파일 */
function pagesLinkingTo(path: string, ownFile: string): string[] {
  const pattern = new RegExp(
    `(navigate\\(\\s*['"\`]${path}['"\`]|to=["'{\`]+${path}["'\`]|path:\\s*['"]${path}['"])`,
  );
  return readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith(".tsx") && !f.startsWith("__") && f !== ownFile)
    .filter((f) => pattern.test(readFileSync(join(PAGES_DIR, f), "utf8")));
}

/** 홈에서 label로 보이는 버튼/탭을 찾아 누른다 */
function pressEntry(label: RegExp) {
  const candidates = [...screen.queryAllByRole("button"), ...screen.queryAllByRole("tab")].filter(
    (el) => label.test(el.getAttribute("aria-label") ?? el.textContent ?? ""),
  );
  expect(candidates.length).toBeGreaterThanOrEqual(1);
  fireEvent.click(candidates[0]);
}

const ENTRIES: Array<{ path: string; file: string; label: RegExp; acs: string }> = [
  { path: "/calendar", file: "Calendar.tsx", label: /캘린더/, acs: "AC-1,2,3" },
  { path: "/report", file: "Report.tsx", label: /리포트/, acs: "AC-7,8,9" },
  { path: "/more", file: "More.tsx", label: /더보기/, acs: "AC-10,11,12" },
  { path: "/badges", file: "Badges.tsx", label: /배지/, acs: "AC-13,14,15" },
  { path: "/rank", file: "Rank.tsx", label: /랭킹|순위/, acs: "AC-16,17,18" },
];

describe("[개선] 갈 수 없는 화면 6개에 진입점 만들기", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    seedLocalStorage({
      [SESSIONS_KEY]: [{ startedAt: toDateKey(Date.now()), minutes: 30, tag: "공부" }],
      [SETTINGS_KEY]: { goalMinPerDay: 120 },
    });
  });

  for (const e of ENTRIES) {
    it(`${e.acs}: 홈에서 '${e.label.source}' 진입점을 누르면 navigate('${e.path}')가 호출된다`, async () => {
      renderWithRouter(React.createElement(Home));
      await advanceTimers(200);

      pressEntry(e.label);

      expect(mockNavigate).toHaveBeenCalledWith(e.path);
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it(`${e.acs}: ${e.path} 라우트는 App.tsx에 남아 있고 다른 화면 소스에 진입 코드가 있다`, () => {
      expect(appSource).toContain(`path="${e.path}"`);
      expect(pagesLinkingTo(e.path, e.file).length).toBeGreaterThanOrEqual(1);
    });
  }

  it("AC-4,5,6: 캘린더에서 날짜 칸을 누르면 해당 날짜 state와 함께 /history로 이동하고 라우트도 남아 있다", async () => {
    const todayKey = toDateKey(Date.now());
    const { container } = renderWithRouter(React.createElement(Calendar));

    const cell = container.querySelector(`button[data-date-key="${todayKey}"]`) as HTMLElement;
    expect(cell).not.toBeNull();
    fireEvent.click(cell);

    expect(mockNavigate).toHaveBeenCalledWith("/history", { state: { dateKey: todayKey } });
    expect(appSource).toContain('path="/history"');
    expect(pagesLinkingTo("/history", "History.tsx").length).toBeGreaterThanOrEqual(1);
  });

  it("AC-2,5,8,11,14,17: 홈은 타이머 주 CTA를 유지하면서 진입점을 함께 둔다", async () => {
    renderWithRouter(React.createElement(Home));
    await advanceTimers(200);

    expect(screen.getByTestId("timer-primary-button")).toHaveTextContent("집중 시작");
    expect(within(document.body).getAllByRole("button").length).toBeGreaterThanOrEqual(6);
  });
});
