import { describe, it, expect, vi } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";
import { FloatingTabBar } from "@/components/FloatingTabBar";

// ─────────────────────────────────────────────────────────────────────────
// 이 파일은 실제 경로(pathname) 기반 동작(미정의 경로 리다이렉트, FloatingTabBar 활성
// 탭 판정)을 검증해야 하므로, 공용 헬퍼 mocks.ts는 쓰지 않는다 — mocks.ts의
// mockRouter()는 plain vi.mock()으로 작성돼 hoisting에 의해 "그 파일을 import하기만
// 해도"(mockRouter()를 호출하지 않아도) react-router-dom의 useLocation/useNavigate가
// 고정값으로 치환된다(다른 mockXxx들과 동일한 hoisting 함정 — mockAppsInToss 주석 참조).
// 그래서 실제 경로 기반 렌더 테스트를 하려면 이 파일 안에서 TDS/SDK만 로컬로 mock하고
// react-router-dom은 절대 건드리지 않는다(= 실제 MemoryRouter 라우팅을 그대로 쓴다).
// ─────────────────────────────────────────────────────────────────────────

vi.mock("@toss/tds-mobile", () => ({
  Button: ({ children, onClick, ...props }: any) =>
    React.createElement("button", { onClick, ...props }, children),

  FixedBottomCTA: ({ children, onClick, disabled, loading, ...props }: any) =>
    React.createElement(
      "button",
      { onClick, disabled: disabled || loading || undefined, ...props },
      children,
    ),

  ListRow: Object.assign(
    ({ children, contents, left, right, onClick, ...props }: any) =>
      React.createElement("div", { onClick, role: "listitem", ...props }, left, contents ?? children, right),
    {
      Text: ({ children }: any) => React.createElement("span", null, children),
      Texts: ({ top, bottom, type }: any) =>
        React.createElement(
          React.Fragment,
          null,
          React.createElement("span", { "data-type": type, "data-slot": "top" }, top),
          React.createElement("span", { "data-slot": "bottom" }, bottom),
        ),
    },
  ),

  Spacing: ({ size }: any) => React.createElement("div", { "data-spacing": size }),

  Paragraph: {
    Text: ({ children, typography, ...props }: any) =>
      React.createElement("span", { "data-typography": typography, ...props }, children),
  },

  Badge: ({ children }: any) => React.createElement("span", { role: "status" }, children),

  AlertDialog: Object.assign(
    ({ open, title, description, alertButton, onClose }: any) =>
      open
        ? React.createElement(
            "div",
            { role: "alertdialog", "aria-label": title },
            React.createElement("h2", null, title),
            React.createElement("p", null, description),
            alertButton,
            React.createElement("button", { onClick: onClose, "aria-label": "닫기" }, "닫기"),
          )
        : null,
    { AlertButton: ({ children, onClick }: any) => React.createElement("button", { onClick }, children) },
  ),

  Toast: ({ open, text, position }: any) =>
    open ? React.createElement("div", { role: "status", "data-position": position }, text) : null,

  Tab: Object.assign(
    ({ children }: any) => React.createElement("div", { role: "tablist" }, children),
    {
      Item: ({ children, selected, onClick }: any) =>
        React.createElement("button", { role: "tab", "aria-selected": selected, onClick }, children),
    },
  ),

  Asset: {
    Icon: ({ name, alt }: any) => React.createElement("span", { "data-asset": name, role: "img", "aria-label": alt ?? name }),
    Image: ({ src, alt }: any) => React.createElement("img", { src, alt }),
    ContentIcon: ({ name, alt }: any) => React.createElement("span", { "data-content-icon": name, role: "img", "aria-label": alt ?? name }),
    ContentImage: ({ src, alt }: any) => React.createElement("img", { src, alt }),
    Lottie: () => React.createElement("span", { "data-asset": "lottie" }),
    Text: ({ children }: any) => React.createElement("span", null, children),
    Video: () => React.createElement("span", { "data-asset": "video" }),
  },

  Skeleton: () => React.createElement("div", { "data-skeleton": "true", role: "presentation" }),
  Loader: () => React.createElement("div", { role: "progressbar" }),

  IconButton: ({ "aria-label": ariaLabel, name, onClick }: any) =>
    React.createElement("button", { "aria-label": ariaLabel, "data-icon": name, onClick }),

  TextButton: ({ children, onClick }: any) => React.createElement("button", { onClick }, children),

  TextField: React.forwardRef(({ label, help, hasError, variant, ...props }: any, ref: any) =>
    React.createElement(
      "div",
      null,
      React.createElement("label", null, label),
      React.createElement("input", { ref, "data-variant": variant, ...props }),
      hasError && help && React.createElement("span", { role: "alert" }, help),
    ),
  ),

  Top: Object.assign(
    ({ children, title, right }: any) =>
      React.createElement("nav", { role: "navigation" }, title && React.createElement("h1", null, title), right, children),
    { TitleParagraph: ({ children }: any) => React.createElement("span", null, children) },
  ),

  Border: () => React.createElement("hr"),
  BottomCTA: ({ children }: any) => React.createElement("div", { "data-slot": "bottom-cta" }, children),

  BottomSheet: Object.assign(
    ({ children, open }: any) => (open ? React.createElement("div", { role: "dialog" }, children) : null),
    { Header: ({ children }: any) => React.createElement("div", null, children) },
  ),

  Chip: ({ children }: any) => React.createElement("div", { role: "group" }, children),
  ChipItem: ({ children, selected, onClick, disabled }: any) =>
    React.createElement("button", { role: "button", "aria-pressed": selected, onClick, disabled }, children),

  Switch: ({ checked, onChange }: any) => React.createElement("input", { type: "checkbox", checked, onChange, role: "switch" }),
}));

vi.mock("@apps-in-toss/web-framework", () => ({
  generateHapticFeedback: vi.fn(),
  loadFullScreenAd: vi.fn(),
  showFullScreenAd: vi.fn(),
  TossAds: {
    initialize: vi.fn(),
    attachBanner: vi.fn(),
  },
}));

vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: ({ children, onRewarded }: any) => {
    if (onRewarded) setTimeout(onRewarded, 0);
    return children;
  },
  default: ({ children }: any) => children,
}));

const ROUTES = ["/", "/calendar", "/history", "/report", "/more", "/badges", "/rank", "/settings"];

/** PageShell 특유의 inline style(minHeight: 100dvh)을 가진 div가 렌더 트리에 있는지 검사 */
function hasPageShellRoot(container: HTMLElement): boolean {
  return Array.from(container.querySelectorAll("div")).some((el) => el.style.minHeight === "100dvh");
}

describe("진입점 배선 복구 — 라우터 + ScreenScaffold 셸 + FloatingTabBar + 전 라우트 플레이스홀더", () => {
  describe("AC-1,2[P0]: App.tsx의 8개 라우트가 실제 페이지 모듈을 크래시 없이 렌더한다", () => {
    it.each(ROUTES)("경로 %s가 크래시 없이 렌더된다", (route) => {
      const { container, unmount } = render(
        React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(App)),
      );
      expect(container.textContent).not.toBe("");
      expect(container.querySelector("body")).not.toThrow;
      unmount();
    });
  });

  it("AC-3[P0]: 정의되지 않은 경로는 크래시 없이 홈(/)으로 replace 이동한다", () => {
    const { container } = render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/no-such-route-xyz"] },
        React.createElement(App),
      ),
    );
    // Home 화면의 고유 타이틀 텍스트가 보이면 홈으로 리다이렉트된 것 (History의 "/history"는
    // 별도 고유 텍스트를 쓰므로 혼동되지 않는다)
    expect(screen.getByText("FocusStreak")).toBeInTheDocument();
    expect(container.querySelector('[data-testid="today-hero"]')).not.toBeNull();
  });

  describe("AC-6[P0]: 모든 페이지 모듈이 ScreenScaffold(PageShell)로 감싼 default export 컴포넌트다", () => {
    it.each(ROUTES)("경로 %s의 페이지가 PageShell(minHeight: 100dvh)로 감싸져 있다", (route) => {
      const { container } = render(
        React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(App)),
      );
      expect(hasPageShellRoot(container)).toBe(true);
    });
  });

  describe("AC-4[P0]: FloatingTabBar가 홈/캘린더/리포트/더보기 4탭을 렌더하고 pathname으로 활성 탭을 판정한다", () => {
    const items = [
      { label: "홈", path: "/" },
      { label: "캘린더", path: "/calendar" },
      { label: "리포트", path: "/report" },
      { label: "더보기", path: "/more" },
    ];

    it("현재 경로(/report)에 해당하는 탭만 aria-selected=true다", () => {
      render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/report"] },
          React.createElement(FloatingTabBar, { items }),
        ),
      );

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(4);

      const active = tabs.filter((tab) => tab.getAttribute("aria-selected") === "true");
      expect(active).toHaveLength(1);
      expect(within(active[0]).getByText("리포트")).toBeInTheDocument();

      const inactiveLabels = tabs
        .filter((tab) => tab.getAttribute("aria-selected") !== "true")
        .map((tab) => tab.textContent);
      expect(inactiveLabels).toEqual(["홈", "캘린더", "더보기"]);
    });

    it("탭 버튼 터치 영역이 44px 이상이다", () => {
      render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/"] },
          React.createElement(FloatingTabBar, { items }),
        ),
      );

      const tabs = screen.getAllByRole("tab");
      for (const tab of tabs) {
        const minHeight = parseInt((tab as HTMLElement).style.minHeight, 10);
        expect(minHeight).toBeGreaterThanOrEqual(44);
      }
    });
  });

  it("AC-5[P0]: 리포지토리 .gitignore에 CLAUDE.md가 등록되어 git status에서 항상 제외된다", () => {
    const gitignorePath = path.resolve(__dirname, "../../.gitignore");
    const content = fs.readFileSync(gitignorePath, "utf-8");
    expect(fs.existsSync(gitignorePath)).toBe(true);
    expect(/^\/?CLAUDE\.md\s*$/m.test(content)).toBe(true);
  });

  it("패킷 산출물: src/lib/types.ts가 공유 스토리지 키 상수를 정확한 값으로 export한다", async () => {
    const types = await import("@/lib/types");
    expect((types as any).SESSIONS_KEY).toBe("fs:sessions:v1");
    expect((types as any).SETTINGS_KEY).toBe("fs:settings:v1");
    expect((types as any).STREAK_KEY).toBe("fs:streak:v1");
  });
});
