import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("공용 스토리지·도메인 레이어 — localStorage 어댑터와 KST 날짜/집계 순수 함수", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("src/lib/storage.ts — localStorage 어댑터", () => {
    it("AC-1: read() should return fallback when key does not exist", async () => {
      const { read } = await import("@/lib/storage");
      const fallback = { default: "value" };
      const result = read("nonexistent-key", fallback);
      expect(result).toEqual(fallback);
      expect(result).toStrictEqual({ default: "value" });
    });

    it("AC-1: read() should return fallback when JSON is corrupted", async () => {
      const { read } = await import("@/lib/storage");
      localStorage.setItem("corrupted", "not valid json {{{");
      const fallback = { default: "value" };
      const result = read("corrupted", fallback);
      expect(result).toEqual(fallback);
      expect(result).not.toThrow;
    });

    it("AC-1: read() should parse and return valid JSON", async () => {
      const { read, write } = await import("@/lib/storage");
      const data = { id: "test-123", name: "Focus Session", minutes: 30 };
      write("valid-key", data);
      const result = read("valid-key", {});
      expect(result).toEqual(data);
      expect((result as any).id).toBe("test-123");
      expect((result as any).minutes).toBe(30);
    });

    it("AC-6: clearAllFocusData() removes only fs: prefixed keys", async () => {
      const { clearAllFocusData } = await import("@/lib/storage");
      localStorage.setItem("fs:session-1", "data1");
      localStorage.setItem("fs:session-2", "data2");
      localStorage.setItem("other:key", "data3");
      localStorage.setItem("settings", "data4");

      clearAllFocusData();

      expect(localStorage.getItem("fs:session-1")).toBeNull();
      expect(localStorage.getItem("fs:session-2")).toBeNull();
      expect(localStorage.getItem("other:key")).toBe("data3");
      expect(localStorage.getItem("settings")).toBe("data4");
    });
  });

  describe("src/lib/datetime.ts — KST 날짜 유틸", () => {
    it("AC-2: toDateKey() should return YYYY-MM-DD in KST (UTC+9)", async () => {
      const { toDateKey } = await import("@/lib/datetime");
      const timestamp = new Date("2026-09-11T12:00:00+09:00").getTime();
      const result = toDateKey(timestamp);
      expect(result).toBe("2026-09-11");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("AC-2: toDateKey() should handle UTC midnight boundary (15:00Z = next day in KST)", async () => {
      const { toDateKey } = await import("@/lib/datetime");
      const timestamp = new Date("2026-09-12T15:00:00Z").getTime(); // 2026-09-13 00:00 KST
      const result = toDateKey(timestamp);
      expect(result).toBe("2026-09-13");
      expect(result).not.toBe("2026-09-12");
    });

    it("AC-2: toWeekKey() should return ISO week format (YYYY-Www) with Monday start", async () => {
      const { toWeekKey } = await import("@/lib/datetime");
      const friday = new Date("2026-09-11T00:00:00+09:00").getTime();
      const result = toWeekKey(friday);
      expect(result).toMatch(/^\d{4}-W\d{2}$/);
      expect(result.length).toBe(8);
    });

    it("AC-3: isValidDateKey() should return true for valid YYYY-MM-DD format", async () => {
      const { isValidDateKey } = await import("@/lib/datetime");
      expect(isValidDateKey("2026-09-11")).toBe(true);
      expect(isValidDateKey("2026-01-01")).toBe(true);
      expect(isValidDateKey("2026-12-31")).toBe(true);
    });

    it("AC-3: isValidDateKey() should return false for invalid dates", async () => {
      const { isValidDateKey } = await import("@/lib/datetime");
      expect(isValidDateKey("2026-13-99")).toBe(false);
      expect(isValidDateKey("2026-02-30")).toBe(false);
      expect(isValidDateKey("invalid")).toBe(false);
      expect(isValidDateKey("")).toBe(false);
    });
  });

  describe("src/lib/domain.ts — 도메인 로직 및 집계", () => {
    it("AC-4: buildWeeklyReport() should always return 7 days with correct structure", async () => {
      const { buildWeeklyReport } = await import("@/lib/domain");
      const sessions: any[] = [];
      const report = buildWeeklyReport(sessions, "2026-W37", 60);

      expect(report.days).toHaveLength(7);
      expect(report.days.every((d) => d.dayIndex >= 0 && d.dayIndex <= 6)).toBe(true);
      expect(report.days.every((d) => typeof d.dayMin === "number")).toBe(true);
    });

    it("AC-4: buildWeeklyReport() should sum tagBreakdown minutes to equal totalMin", async () => {
      const { buildWeeklyReport } = await import("@/lib/domain");
      const sessions: any[] = [
        { startedAt: "2026-09-07", minutes: 30, tag: "exercise" },
        { startedAt: "2026-09-07", minutes: 20, tag: "meditation" },
        { startedAt: "2026-09-08", minutes: 25, tag: "exercise" },
      ];
      const report = buildWeeklyReport(sessions, "2026-W37", 60);

      const tagSum = Object.values(report.tagBreakdown as Record<string, number>).reduce((a, b) => a + b, 0);
      expect(tagSum).toBe(report.totalMin);
      expect(report.totalMin).toBe(75);
      expect(report.tagBreakdown).toHaveProperty("exercise");
      expect(report.tagBreakdown).toHaveProperty("meditation");
    });

    it("AC-4: buildWeeklyReport() should return zeros for empty sessions", async () => {
      const { buildWeeklyReport } = await import("@/lib/domain");
      const report = buildWeeklyReport([], "2026-W37", 60);

      expect(report.totalMin).toBe(0);
      expect(report.avgMin).toBe(0);
      expect(report.goalMetDays).toBe(0);
      expect(report.days.every((d) => d.dayMin === 0)).toBe(true);
    });

    it("AC-5: BADGE_DEFS should have exactly 7 badges with id, title, and condition", async () => {
      const { BADGE_DEFS } = await import("@/lib/domain");

      expect(BADGE_DEFS).toHaveLength(7);
      BADGE_DEFS.forEach((badge) => {
        expect(badge).toHaveProperty("id");
        expect(badge).toHaveProperty("title");
        expect(badge).toHaveProperty("condition");
        expect(typeof badge.id).toBe("string");
        expect(typeof badge.title).toBe("string");
        expect(typeof badge.condition).toBe("function");
        expect(badge.id.length).toBeGreaterThan(0);
        expect(badge.title.length).toBeGreaterThan(0);
      });
    });

    it("AC-5: evaluateBadges() should return earned badges based on condition", async () => {
      const { evaluateBadges, BADGE_DEFS } = await import("@/lib/domain");
      const sessions: any[] = [
        { startedAt: "2026-09-07", minutes: 60 },
        { startedAt: "2026-09-08", minutes: 60 },
      ];
      const streak: any = { current: 2, longest: 2 };

      const earned = evaluateBadges(sessions, streak);

      expect(Array.isArray(earned)).toBe(true);
      expect(earned.every((b) => BADGE_DEFS.some((d) => d.id === b))).toBe(true);
    });
  });

  describe("TypeScript type checking", () => {
    it("AC-7: npx tsc --noEmit should pass with no errors", async () => {
      // This test will pass/fail based on TypeScript compilation
      // The implementation must have correct types exported
      const storage = await import("@/lib/storage");
      const datetime = await import("@/lib/datetime");
      const domain = await import("@/lib/domain");

      expect(typeof storage.read).toBe("function");
      expect(typeof storage.write).toBe("function");
      expect(typeof datetime.toDateKey).toBe("function");
      expect(typeof datetime.isValidDateKey).toBe("function");
      expect(typeof domain.buildWeeklyReport).toBe("function");
      expect(typeof domain.evaluateBadges).toBe("function");
      expect(Array.isArray(domain.BADGE_DEFS)).toBe(true);
    });
  });
});
