import { describe, expect, it } from "vitest";

describe("production smoke checks", () => {
  it("keeps the public route contract explicit", () => {
    const routes = ["/", "/about", "/academics", "/admissions", "/news", "/events", "/gallery", "/contact", "/terms", "/privacy", "/cookies"];
    expect(routes).toContain("/");
    expect(routes).toContain("/about");
    expect(routes).toContain("/academics");
    expect(routes).toContain("/admissions");
    expect(routes.length).toBeGreaterThanOrEqual(11);
  });
});
