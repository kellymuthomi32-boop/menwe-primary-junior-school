import { describe, expect, it } from "vitest";
import { isAdministrator, normalizeRole, toSchoolProfile } from "../client/src/contexts/SupabaseAuthContext";

describe("normalizeRole", () => {
  it("normalizes supported roles case-insensitively and with whitespace", () => {
    expect(normalizeRole(" parent ")).toBe("PARENT");
    expect(normalizeRole(" student ")).toBe("STUDENT");
    for (const value of ["teacher", "CLASS_TEACHER", "classroom_teacher", " staff "]) expect(normalizeRole(value)).toBe("TEACHER");
    expect(normalizeRole("super_admin")).toBe("SUPER_ADMIN");
    expect(normalizeRole("HEAD_OF_INSTITUTION")).toBe("HEAD_OF_INSTITUTION");
    expect(normalizeRole(" deputy_hoi ")).toBe("DEPUTY_HOI");
    expect(normalizeRole("ADMIN")).toBe("ADMIN");
  });
  it("returns null for unknown or missing roles", () => {
    expect(normalizeRole("unknown")).toBeNull();
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
  });
});

describe("toSchoolProfile", () => {
  const base = { id: "1", email: "a@example.com", full_name: "A", phone: null, avatar_url: null };
  it("normalizes a valid ACTIVE profile", () => {
    expect(toSchoolProfile({ ...base, role: "CLASS_TEACHER", status: "ACTIVE" })).toMatchObject({ role: "TEACHER", canonical_role: "class_teacher", status: "ACTIVE" });
  });
  it("rejects unsupported and missing canonical roles", () => {
    expect(toSchoolProfile({ ...base, role: "unknown", status: "ACTIVE" })).toBeNull();
    expect(toSchoolProfile({ ...base, status: "ACTIVE" })).toBeNull();
  });
  it("preserves INACTIVE status", () => {
    expect(toSchoolProfile({ ...base, role: "TEACHER", status: "INACTIVE" })).toMatchObject({ status: "INACTIVE" });
  });
});

describe("isAdministrator", () => {
  it("is true for all four administrator roles", () => {
    for (const role of ["SUPER_ADMIN", "ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI"] as const) expect(isAdministrator(role)).toBe(true);
  });
  it("is false for non-administrators and undefined", () => {
    for (const role of ["TEACHER", "PARENT", "STUDENT"] as const) expect(isAdministrator(role)).toBe(false);
    expect(isAdministrator(undefined)).toBe(false);
  });
});
