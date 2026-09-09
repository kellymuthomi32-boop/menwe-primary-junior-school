import { describe, expect, it } from "vitest";
import { levelFromScore } from "@/lib/grading";

describe("academic grading contract", () => {
  it("calculates CBC levels from the assessment maximum", () => {
    expect(levelFromScore(76, 100)).toBe("EE");
    expect(levelFromScore(51, 100)).toBe("ME");
    expect(levelFromScore(26, 100)).toBe("AE");
    expect(levelFromScore(25, 100)).toBe("BE");
    expect(levelFromScore(38, 50)).toBe("EE");
  });

  it("rejects invalid and out-of-range grading inputs", () => {
    expect(levelFromScore(10, 0)).toBe("");
    expect(levelFromScore(Number.NaN, 100)).toBe("");
    expect(levelFromScore(-1, 100)).toBe("");
    expect(levelFromScore(101, 100)).toBe("");
  });
});
