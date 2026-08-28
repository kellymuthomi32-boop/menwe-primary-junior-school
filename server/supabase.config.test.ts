import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

describe("Supabase public configuration", () => {
  it("fails closed when public configuration is absent", async () => {
    const source = await read("../client/src/lib/supabase.ts");
    expect(source).toContain("VITE_SUPABASE_URL");
    expect(source).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
    expect(source).toContain("if (!supabase)");
    expect(source).toContain("Supabase public configuration is unavailable");
    expect(source).toContain("persistSession: true");
  });

  it("can validate a live Auth endpoint when CI provides the public variables", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    expect(url).toMatch(/^https:\/\/[a-z0-9-]+\.supabase\.co$/);
    expect(key).toMatch(/^sb_publishable_/);
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    expect(response.ok).toBe(true);
  }, 12000);
});
