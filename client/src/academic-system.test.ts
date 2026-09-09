import { describe, expect, it } from "vitest";

const levelFromScore = (score: number, maximum: number) => {
  if (!Number.isFinite(score) || !Number.isFinite(maximum) || maximum <= 0) return "";
  const pct = (score / maximum) * 100;
  if (pct >= 76) return "EE";
  if (pct >= 51) return "ME";
  if (pct >= 26) return "AE";
  return "BE";
};

describe("academic grading contract", () => {
  it("calculates CBC levels from the assessment maximum", () => {
    expect(levelFromScore(76, 100)).toBe("EE");
    expect(levelFromScore(51, 100)).toBe("ME");
    expect(levelFromScore(26, 100)).toBe("AE");
    expect(levelFromScore(25, 100)).toBe("BE");
    expect(levelFromScore(38, 50)).toBe("EE");
  });

  it("rejects invalid grading inputs", () => {
    expect(levelFromScore(10, 0)).toBe("");
    expect(levelFromScore(Number.NaN, 100)).toBe("");
  });
});
