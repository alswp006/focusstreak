import { describe, it, expect } from "vitest";
import React from "react";
import { screen, within, fireEvent } from "@testing-library/react";

import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { WeeklyReport } from "@/lib/domain";

mockAll();

import { WeeklyReportResult } from "@/components/WeeklyReportResult";

/** 7일치(월~일) 데이터가 채워진 표준 리포트 픽스처 — 태그 3종 합계가 totalMin과 일치. */
const FULL_REPORT: WeeklyReport = {
  totalMin: 200,
  avgMin: 29,
  goalMetDays: 3,
  sessionCount: 7,
  days: [
    { dayIndex: 0, dayMin: 30 },
    { dayIndex: 1, dayMin: 0 },
    { dayIndex: 2, dayMin: 50 },
    { dayIndex: 3, dayMin: 0 },
    { dayIndex: 4, dayMin: 70 },
    { dayIndex: 5, dayMin: 0 },
    { dayIndex: 6, dayMin: 50 },
  ],
  tagBreakdown: { "공부": 100, "업무": 60, "운동": 40 },
};

const EMPTY_REPORT: WeeklyReport = {
  totalMin: 0,
  avgMin: 0,
  goalMetDays: 0,
  sessionCount: 0,
  days: Array.from({ length: 7 }, (_, dayIndex) => ({ dayIndex, dayMin: 0 })),
  tagBreakdown: {},
};

describe("S4 주간 리포트 — 결과 카드 (히어로 · 추이 · 태그 비중)", () => {
  it("AC-1: 히어로에 totalMin이 Amount로, 정확한 캡션이 렌더된다", () => {
    renderWithRouter(
      React.createElement(WeeklyReportResult, { report: FULL_REPORT, sessionCount: 7 }),
    );

    expect(screen.getByText("200분")).not.toBeNull();
    expect(screen.getByText("하루 평균 29분 · 목표 달성 3일")).not.toBeNull();
  });

  it("AC-2: 7일 막대가 월~일 순서로 7개 렌더되고 각 막대에 data-day-index와 dayMin이 반영된다", () => {
    const { container } = renderWithRouter(
      React.createElement(WeeklyReportResult, { report: FULL_REPORT, sessionCount: 7 }),
    );

    const bars = container.querySelectorAll("[data-day-index]");
    expect(bars.length).toBe(7);

    const indices = Array.from(bars).map((el) => el.getAttribute("data-day-index"));
    expect(indices).toEqual(["0", "1", "2", "3", "4", "5", "6"]);

    FULL_REPORT.days.forEach((day, i) => {
      expect(within(bars[i] as HTMLElement).getByText(`${day.dayMin}분`)).not.toBeNull();
    });

    // 월요일(index 0)은 실제로 첫 번째 막대여야 한다
    expect(within(bars[0] as HTMLElement).getByText("월")).not.toBeNull();
    expect(within(bars[6] as HTMLElement).getByText("일")).not.toBeNull();
  });

  it("AC-3: 태그 비중 3행의 분 합계가 totalMin과 일치하고 각 비중(%)이 정확하다", () => {
    renderWithRouter(
      React.createElement(WeeklyReportResult, { report: FULL_REPORT, sessionCount: 7 }),
    );

    const rows = screen.getAllByTestId("report-tag-row");
    expect(rows.length).toBe(3);

    const minutesSum = FULL_REPORT.tagBreakdown["공부"] + FULL_REPORT.tagBreakdown["업무"] + FULL_REPORT.tagBreakdown["운동"];
    expect(minutesSum).toBe(FULL_REPORT.totalMin);

    expect(within(rows[0]).getByText("공부")).not.toBeNull();
    expect(within(rows[0]).getByText("100분")).not.toBeNull();
    expect(within(rows[0]).getByText("50%")).not.toBeNull();

    expect(within(rows[1]).getByText("업무")).not.toBeNull();
    expect(within(rows[1]).getByText("60분")).not.toBeNull();
    expect(within(rows[1]).getByText("30%")).not.toBeNull();

    expect(within(rows[2]).getByText("운동")).not.toBeNull();
    expect(within(rows[2]).getByText("40분")).not.toBeNull();
    expect(within(rows[2]).getByText("20%")).not.toBeNull();
  });

  it("AC-3: totalMin이 0이면 태그 비중 3행이 모두 0%로 표시된다(0으로 나누기 방지)", () => {
    // 세션은 있었지만(sessionCount>0) 기록된 분이 0인 방어적 케이스 — 빈 상태 분기가 아닌
    // 비중 계산 자체의 0-division 안전성을 검증한다.
    const zeroMinReport: WeeklyReport = { ...EMPTY_REPORT };
    renderWithRouter(
      React.createElement(WeeklyReportResult, { report: zeroMinReport, sessionCount: 1 }),
    );

    const rows = screen.getAllByTestId("report-tag-row");
    expect(rows.length).toBe(3);
    for (const row of rows) {
      expect(within(row).getByText("0%")).not.toBeNull();
      expect(within(row).queryByText("NaN%")).toBeNull();
    }
  });

  it("AC-4: 이번 주 세션이 0건이면 안내 문구와 '집중 시작하기' 버튼이 렌더되고 클릭 시 '/'로 이동한다", () => {
    renderWithRouter(
      React.createElement(WeeklyReportResult, { report: EMPTY_REPORT, sessionCount: 0 }),
    );

    expect(screen.getByText("이번 주에는 아직 집중 기록이 없어요")).not.toBeNull();
    // 세션이 없으면 히어로/막대/태그 비중은 렌더되지 않는다
    expect(screen.queryByTestId("report-tag-row")).toBeNull();

    const startButton = screen.getByRole("button", { name: "집중 시작하기" });
    fireEvent.click(startButton);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-5: 결과 카드 하단에 AdSlot 배너가 static으로 1개 렌더되고 다른 콘텐츠와 함께 보인다", () => {
    const { container } = renderWithRouter(
      React.createElement(WeeklyReportResult, { report: FULL_REPORT, sessionCount: 7 }),
    );

    const adSlots = container.querySelectorAll("[data-ad-group-id]");
    expect(adSlots.length).toBe(1);
    // 광고가 결과 콘텐츠를 가리지 않음 — 히어로 텍스트가 여전히 문서에 존재
    expect(screen.getByText("200분")).not.toBeNull();
  });
});
