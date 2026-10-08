import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf8");

// 태그 한 개(<TextField ... />)씩 잘라낸다
function textFieldTags(src: string): string[] {
  return src.match(/<TextField[\s\S]*?\n\s*\/>/g) ?? [];
}

describe("[개선] TDS 컴포넌트 3곳을 벤더 모양대로 고치기", () => {
  it("AC-1/2: Rank의 TextField 모두 labelOption=\"sustain\"을 준다", () => {
    const tags = textFieldTags(read("pages/Rank.tsx"));
    expect(tags).toHaveLength(2);
    for (const tag of tags) {
      expect(tag).toContain('labelOption="sustain"');
      expect(tag).toMatch(/placeholder=/);
    }
  });

  it("AC-4/5: History 시트 버튼은 children이 아니라 cta 슬롯(BottomSheet.CTA)에 둔다", () => {
    const src = read("pages/History.tsx");
    const sheet = src.slice(src.indexOf("<BottomSheet"), src.indexOf("</BottomSheet>"));
    expect(sheet).toMatch(/cta=\{\s*<BottomSheet\.CTA/);
    const body = sheet.slice(sheet.indexOf(">\n") + 2);
    const afterCta = sheet.replace(/cta=\{[\s\S]*?<\/BottomSheet\.CTA>\s*\}/, "");
    expect(afterCta).not.toMatch(/<Button\b/);
    expect(body.length).toBeGreaterThan(0);
  });

  it("AC-7: 목 BottomSheet가 벤더 모양(cta 슬롯, BottomSheet.CTA)을 지원한다", () => {
    const mocks = read("__tests__/__helpers__/mocks.ts");
    const sheet = mocks.slice(mocks.indexOf("BottomSheet: Object.assign"));
    expect(sheet).toMatch(/\bcta\b/);
    expect(sheet).toMatch(/\bCTA:/);
  });

  it("AC-8/9/11: Home 제목은 한국어 앱 이름 '포커스스트릭'이고 영문 제목이 없다", () => {
    const src = read("pages/Home.tsx");
    expect(src).toMatch(/<Top\.TitleParagraph>\s*포커스스트릭\s*<\/Top\.TitleParagraph>/);
    expect(src).not.toMatch(/<Top\.TitleParagraph>\s*FocusStreak/);
  });

  it("AC-3/6/10: 세 페이지 모두 as any / as unknown as 캐스트가 없다", () => {
    for (const f of ["pages/Rank.tsx", "pages/History.tsx", "pages/Home.tsx"]) {
      const src = read(f);
      expect(src, f).not.toMatch(/\bas any\b/);
      expect(src, f).not.toMatch(/as unknown as/);
    }
  });
});
