import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

describe("email access and invitation controls", () => {
  it("offers passwordless access without allowing arbitrary account creation", async () => {
    const authContext = await read("../client/src/contexts/SupabaseAuthContext.tsx");
    expect(authContext).toContain("signInWithOtp"); expect(authContext).toContain("shouldCreateUser: false");
    expect(authContext).toContain("resetPasswordForEmail"); expect(authContext).toContain("signInWithPassword");
  });

  it("keeps invitations server-side and restricted to active privileged callers", async () => {
    const invitationFunction = await read("../supabase/functions/school-invite/index.ts");
    expect(invitationFunction).toContain('callerProfile?.role !== "SUPER_ADMIN"');
    expect(invitationFunction).toContain("serviceClient.auth.admin.inviteUserByEmail");
    expect(invitationFunction).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(invitationFunction).not.toContain("return response({ serviceKey");
  });

  it("requires invitation roles to match the selected school record", async () => {
    const invitationFunction = await read("../supabase/functions/school-invite/index.ts");
    expect(invitationFunction).toContain('const roleForRecord = { teacher: "TEACHER", parent: "PARENT", student: "STUDENT" } as const');
    expect(invitationFunction).toContain("The invitation role must match the selected school record type.");
    expect(invitationFunction).toContain("The selected school record is unavailable or already linked to an account.");
    expect(invitationFunction).toContain("const removeNewAccount = async () => { await serviceClient.auth.admin.deleteUser(invitation.user.id); };");
    expect(invitationFunction).toContain("The account could not be linked to the selected school record.");
  });
});
