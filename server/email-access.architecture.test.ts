import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

describe("email access and invitation controls", () => {
  it("offers passwordless email links without allowing the form to create arbitrary accounts", async () => {
    const authContext = await read("../client/src/contexts/SupabaseAuthContext.tsx");
    expect(authContext).toContain("signInWithOtp");
    expect(authContext).toContain("shouldCreateUser: false");
    expect(authContext).toContain("resetPasswordForEmail");
    expect(authContext).toContain("signInWithPassword");
    expect(authContext).toContain("/portal/overview");
  });

  it("keeps invitation creation on the server and restricts it to an active Super Administrator", async () => {
    const invitationFunction = await read("../supabase/functions/school-invite/index.ts");
    expect(invitationFunction).toContain("callerProfile?.role !== \"SUPER_ADMIN\"");
    expect(invitationFunction).toContain("serviceClient.auth.admin.inviteUserByEmail");
    expect(invitationFunction).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(invitationFunction).not.toContain("return response({ serviceKey");
  });
});
