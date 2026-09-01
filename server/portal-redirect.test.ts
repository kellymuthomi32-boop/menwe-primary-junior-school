import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { getPortalRedirect, type SchoolProfile } from "../client/src/contexts/SupabaseAuthContext";

const authUser = (overrides: Partial<User> = {}) => ({
  id: "00000000-0000-0000-0000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "teacher@example.com",
  app_metadata: { provider: "email" },
  user_metadata: { role: "teacher" },
  ...overrides,
}) as User;

const profile = (overrides: Partial<SchoolProfile> = {}) => ({
  id: "00000000-0000-0000-0000-000000000001",
  email: "teacher@example.com",
  display_name: "Teacher",
  phone: null,
  role: "TEACHER",
  canonical_role: "teacher",
  status: "ACTIVE",
  avatar_url: null,
  ...overrides,
}) as SchoolProfile;

describe("portal redirect classification", () => {
  it("uses school-role metadata instead of Supabase's built-in authenticated role", () => {
    expect(getPortalRedirect(authUser())).toBe("/portal/teacher");
  });

  it("uses the canonical profile role when profile hydration succeeds", () => {
    expect(getPortalRedirect(profile(), authUser())).toBe("/portal/teacher");
  });
});
