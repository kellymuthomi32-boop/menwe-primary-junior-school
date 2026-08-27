import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";

const roles = ["ADMIN", "TEACHER", "STUDENT", "PARENT"] as const;
type InviteRole = (typeof roles)[number];

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed." }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return response({ error: "Authentication is required." }, 401);

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const token = authorization.slice("Bearer ".length);
    const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await callerClient.auth.getUser(token);
    if (userError || !user) return response({ error: "Session verification failed." }, 401);

    const { data: callerProfile, error: callerError } = await callerClient
      .from("profiles")
      .select("role,status")
      .eq("id", user.id)
      .maybeSingle();
    if (callerError || callerProfile?.role !== "SUPER_ADMIN" || callerProfile.status !== "ACTIVE") {
      return response({ error: "Only an active Super Administrator can issue school account invitations." }, 403);
    }

    const payload = await req.json() as { email?: string; fullName?: string; role?: InviteRole; recordType?: "teacher" | "parent" | "student"; recordId?: string };
    const email = payload.email?.trim().toLowerCase();
    const fullName = payload.fullName?.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || !fullName || !roles.includes(payload.role as InviteRole)) {
      return response({ error: "Provide a name, a valid email address, and an allowed school role." }, 400);
    }
    if (!payload.recordType || !payload.recordId) return response({ error: "Link the invited account to a school record before sending the invitation." }, 400);

    const serviceClient = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: invitation, error: invitationError } = await serviceClient.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName } });
    if (invitationError || !invitation.user) return response({ error: invitationError?.message || "The invitation could not be created." }, 400);

    const { error: profileError } = await serviceClient.from("profiles").update({ role: payload.role, full_name: fullName, email }).eq("id", invitation.user.id);
    if (profileError) return response({ error: "The account was invited but the school role could not be assigned. Contact the system owner." }, 500);

    const table = payload.recordType === "teacher" ? "teachers" : payload.recordType === "parent" ? "parents" : "students";
    const { error: recordError } = await serviceClient.from(table).update({ profile_id: invitation.user.id }).eq("id", payload.recordId).is("profile_id", null);
    if (recordError) return response({ error: "The account was invited but could not be linked to the selected school record." }, 500);

    await serviceClient.from("audit_logs").insert({ actor_id: user.id, action: "INVITE", entity_type: "profile", entity_id: invitation.user.id, metadata: { role: payload.role, recordType: payload.recordType, recordId: payload.recordId } });
    return response({ id: invitation.user.id, message: "Invitation issued. The account role is set before the first sign-in." });
  } catch {
    return response({ error: "The invitation service could not complete this request." }, 500);
  }
});
