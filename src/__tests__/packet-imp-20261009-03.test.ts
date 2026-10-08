import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FILES = ["pages/Home.tsx", "pages/Badges.tsx", "pages/Calendar.tsx"];
const read = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf8");
const all = () => FILES.map((f) => ({ f, src: read(f) }));
const count = (src: string, re: RegExp) => (src.match(re) ?? []).length;

const CLICK = /\blogClick\(\s*(['"`])([^'"`$]*)\1/g;
const IMPRESSION = /\blogImpression\(\s*(['"`])([^'"`$]*)\1/g;

describe("[개선] 행동 로그·리뷰·공유 3가지 추가", () => {
  it("AC-1[P0]: 세 화면 합쳐 logClick 호출이 3곳 이상이고 각 화면에 1곳 이상 있다", () => {
    const counts = all().map(({ src }) => count(src, /\blogClick\(/g));
    expect(counts.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(3);
    for (const c of counts) expect(c).toBeGreaterThanOrEqual(1);
  });

  it("AC-2: 결과·핵심 카드 노출에 logImpression이 1곳 이상 있다", () => {
    const total = all().reduce((n, { src }) => n + count(src, /\blogImpression\(/g), 0);
    expect(total).toBeGreaterThanOrEqual(1);
  });

  it("AC-3[P0]: 로그 이름은 고정 snake_case 문자열 리터럴이다(변수·템플릿 금지)", () => {
    const names: string[] = [];
    for (const { f, src } of all()) {
      const calls = count(src, /\blog(Click|Impression)\(/g);
      const literal = [...src.matchAll(CLICK), ...src.matchAll(IMPRESSION)];
      expect(literal.length, f).toBe(calls);
      for (const m of literal) names.push(m[2]);
    }
    expect(names.length).toBeGreaterThanOrEqual(4);
    for (const n of names) expect(n).toMatch(/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/);
  });

  it("AC-4: 기존 @/lib/analytics 래퍼를 쓰고 새 의존성·래퍼를 만들지 않는다", () => {
    for (const { f, src } of all()) {
      if (/\blog(Click|Impression)\(/.test(src)) {
        expect(src, f).toMatch(/from\s+['"](@|\.\.)\/lib\/analytics['"]|from\s+['"]\.\.\/lib\/analytics['"]/);
      }
      expect(src, f).not.toMatch(/function\s+log(Click|Impression)\b/);
      expect(src, f).not.toMatch(/Analytics\.(click|impression|screen)\(/);
    }
  });

  it("AC-5[P0]: requestReviewOnce()가 세 화면 통틀어 정확히 1곳 호출되고 lib/review에서 온다", () => {
    const hits = all().filter(({ src }) => /\brequestReviewOnce\(\)/.test(src));
    expect(hits).toHaveLength(1);
    expect(count(hits[0].src, /\brequestReviewOnce\(\)/g)).toBe(1);
    expect(hits[0].src).toMatch(/lib\/review['"]/);
  });

  it("AC-6[P0]: 진입 직후(마운트 useEffect)·오류 경로에서는 리뷰를 요청하지 않는다", () => {
    for (const { f, src } of all()) {
      for (const m of src.matchAll(/useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*\[[^\]]*\]\s*\)/g)) {
        expect(m[0], f).not.toMatch(/requestReviewOnce/);
      }
      for (const m of src.matchAll(/catch\s*(\([^)]*\))?\s*\{[\s\S]*?\}/g)) {
        expect(m[0], f).not.toMatch(/requestReviewOnce/);
      }
    }
  });

  it("AC-7: shareApp({ ... }) 공유 버튼이 1곳 있고 lib/share에서 온다", () => {
    const hits = all().filter(({ src }) => /\bshareApp\(\s*\{/.test(src));
    expect(hits).toHaveLength(1);
    expect(count(hits[0].src, /\bshareApp\(\s*\{/g)).toBe(1);
    expect(hits[0].src).toMatch(/lib\/share['"]/);
    expect(hits[0].src).not.toMatch(/getTossShareLink|import[^;]*\bshare\b[^;]*web-framework/);
  });

  it("AC-8: 공유 핸들러에 logClick이 함께 붙는다", () => {
    const { src } = all().find(({ src }) => /\bshareApp\(\s*\{/.test(src)) ?? { src: "" };
    const idx = src.search(/\bshareApp\(\s*\{/);
    expect(idx).toBeGreaterThan(-1);
    const window = src.slice(Math.max(0, idx - 400), idx + 400);
    expect(window).toMatch(/\blogClick\(\s*['"][a-z0-9_]*share[a-z0-9_]*['"]/);
  });
});
