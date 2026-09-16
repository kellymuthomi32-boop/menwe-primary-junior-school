import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";

const roles = ["ADMIN", "TEACHER", "STUDENT", "PARENT"] as const;
type InviteRole = (typeof roles)[number];
type RecordType = "teacher" | "parent" | "student";

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function normaliseSiteUrl(value: string | null | undefined) {
  return value?.trim().replace(/\/$/, "") || "";
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
    if (!url || !anonKey || !serviceKey) return response({ error: "Invitation service is not fully configured." }, 500);

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

    const payload = await req.json() as {
      action?: "invite" | "resend";
      email?: string;
      fullName?: string;
      role?: InviteRole;
      recordType?: RecordType;
      recordId?: string;
    };
    const action = payload.action ?? "invite";
    const recordType = payload.recordType;
    if (!recordType || !["teacher", "parent", "student"].includes(recordType)) {
      return response({ error: "Select a valid school record type." }, 400);
    }

    const serviceClient = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const table = recordType === "teacher" ? "teachers" : recordType === "parent" ? "parents" : "students";
    const roleForRecord = { teacher: "TEACHER", parent: "PARENT", student: "STUDENT" } as const;

    if (action === "resend") {
      return response({
        error: "Resending an existing invitation requires the configured Supabase Auth email workflow. The existing account was not changed.",
        code: "RESEND_EMAIL_CONFIGURATION_REQUIRED",
      }, 409);
    }

    const email = payload.email?.trim().toLowerCase();
    const fullName = payload.fullName?.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || !fullName || !roles.includes(payload.role as InviteRole)) {
      return response({ error: "Provide a name, a valid email address, and an allowed school role." }, 400);
    }
    if (payload.role !== roleForRecord[recordType]) {
      return response({ error: "The invitation role must match the selected school record type." }, 400);
    }

    let recordId = payload.recordId ?? null;
    let createdTeacherId: string | null = null;

    if (recordId) {
      const { data: targetRecord, error: targetRecordError } = await serviceClient
        .from(table)
        .select("id")
        .eq("id", recordId)
        .is("profile_id", null)
        .maybeSingle();
      if (targetRecordError || !targetRecord) {
        return response({ error: "The selected school record is unavailable or already linked to an account." }, 400);
      }
    } else if (recordType === "teacher") {
      const nameParts = fullName.split(/\s+/).filter(Boolean);
      const firstName = nameParts.shift() ?? fullName;
      const lastName = nameParts.pop() ?? firstName;
      const middleName = nameParts.length ? nameParts.join(" ") : null;
      const employeeNumber = `TCH-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const { data: newTeacher, error: teacherError } = await serviceClient
        .from("teachers")
        .insert({ employee_number: employeeNumber, first_name: firstName, middle_name: middleName, last_name: lastName, email, status: "ACTIVE" })
        .select("id")
        .single();
      if (teacherError || !newTeacher) {
        return response({ error: "The new teacher record could not be created." }, 500);
      }
      recordId = newTeacher.id;
      createdTeacherId = newTeacher.id;
    } else {
      return response({ error: "Link the invited account to an existing school record before sending the invitation." }, 400);
    }

    const siteUrl = normaliseSiteUrl(Deno.env.get("SITE_URL") ?? req.headers.get("origin"));
    const redirectTo = siteUrl ? `${siteUrl}/portal/password` : undefined;
    const inviteOptions = redirectTo ? { data: { full_name: fullName }, redirectTo } : { data: { full_name: fullName } };
    const { data: invitation, error: invitationError } = await serviceClient.auth.admin.inviteUserByEmail(email, inviteOptions);
    if (invitationError || !invitation.user) {
      if (createdTeacherId) await serviceClient.from("teachers").delete().eq("id", createdTeacherId).is("profile_id", null);
      return response({ error: invitationError?.message || "The invitation could not be created." }, 400);
    }

    const removeNewAccount = async () => {
      await serviceClient.auth.admin.deleteUser(invitation.user.id);
      if (createdTeacherId) await serviceClient.from("teachers").delete().eq("id", createdTeacherId).is("profile_id", null);
    };

    const { error: profileError } = await serviceClient.from("profiles").update({ role: payload.role, full_name: fullName, email }).eq("id", invitation.user.id);
    if (profileError) {
      await removeNewAccount();
      return response({ error: "The account could not be prepared for the selected school role." }, 500);
    }

    const { error: recordError } = await serviceClient.from(table).update({ profile_id: invitation.user.id }).eq("id", recordId).is("profile_id", null);
    if (recordError) {
      await removeNewAccount();
      return response({ error: "The account could not be linked to the selected school record." }, 500);
    }

    await serviceClient.from("audit_logs").insert({ actor_id: user.id, action: "INVITE", entity_type: "profile", entity_id: invitation.user.id, metadata: { role: payload.role, recordType, recordId } });
    return response({ id: invitation.user.id, recordId, message: "Invitation issued. The recipient will be taken to secure password setup after accepting the invitation. Ask them to check their inbox and spam folder." });
  } catch {
    return response({ error: "The invitation service could not complete this request." }, 500);
  }
});
