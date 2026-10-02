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
    if (callerError || !["SUPER_ADMIN", "ADMIN"].includes(callerProfile?.role ?? "") || callerProfile.status !== "ACTIVE") {
      return response({ error: "Only an active Administrator or Super Administrator can issue school account invitations." }, 403);
    }

    const payload = await req.json() as {
      action?: "invite" | "resend" | "set_password" | "direct" | "deactivate_teacher" | "reactivate_teacher" | "delete_teacher";
      email?: string;
      fullName?: string;
      role?: InviteRole;
      recordType?: RecordType;
      recordId?: string;
      password?: string;
    };
    const action = payload.action ?? (payload.password ? "direct" : "invite");
    const recordType = payload.recordType;

    // Resending an existing invitation only needs the existing account email.
    // It must not require the UI to resend a school record type.
    if (!["deactivate_teacher", "reactivate_teacher", "delete_teacher"].includes(action) && action !== "resend" && action !== "set_password" && (!recordType || !["teacher", "parent", "student"].includes(recordType))) {
      return response({ error: "Select a valid school record type." }, 400);
    }

    const serviceClient = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    if (action === "delete_teacher") {
      const teacherId = payload.recordId?.trim();
      if (!teacherId) return response({ error: "A teacher record is required." }, 400);
      const { data: teacherRecord, error: teacherLookupError } = await serviceClient
        .from("teachers")
        .select("id,profile_id,first_name,last_name,status")
        .eq("id", teacherId)
        .maybeSingle();
      if (teacherLookupError || !teacherRecord) return response({ error: "The selected teacher could not be found." }, 404);

      const [attendance, homework, duties, loans] = await Promise.all([
        serviceClient.from("attendance_sessions").select("id", { count: "exact", head: true }).eq("taken_by", teacherId),
        serviceClient.from("homework").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId),
        serviceClient.from("teacher_duty_roster_entries").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId),
        serviceClient.from("teacher_library_loans").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId)
      ]);
      const failedCheck = [attendance, homework, duties, loans].find(x => x.error);
      if (failedCheck?.error) return response({ error: "The teacher's protected school history could not be checked before deletion." }, 500);
      const protectedCount = (attendance.count ?? 0) + (homework.count ?? 0) + (duties.count ?? 0) + (loans.count ?? 0);
      if (protectedCount > 0) {
        return response({
          error: "This teacher cannot be permanently deleted because protected school history is linked to the record.",
          protectedRecords: {
            attendanceSessions: attendance.count ?? 0,
            homework: homework.count ?? 0,
            dutyRosterEntries: duties.count ?? 0,
            libraryLoans: loans.count ?? 0
          },
          message: "Use Remove access instead. It keeps the teacher's historical records safe."
        }, 409);
      }

      await serviceClient.from("audit_logs").insert({
        actor_id: user.id,
        action: "DELETE_TEACHER",
        entity_type: "teacher",
        entity_id: teacherId,
        metadata: { profileId: teacherRecord.profile_id, name: teacherRecord.first_name + " " + teacherRecord.last_name }
      });

      const { error: teacherDeleteError } = await serviceClient.from("teachers").delete().eq("id", teacherId);
      if (teacherDeleteError) return response({ error: "The teacher record could not be deleted. No school data was removed." }, 409);

      if (teacherRecord.profile_id) {
        const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(teacherRecord.profile_id);
        if (authDeleteError) {
          return response({ error: "The teacher record was deleted, but the linked portal account could not be removed. The account has been left inactive for safety; contact the administrator to finish cleanup." }, 500);
        }
      }

      return response({
        id: teacherId,
        deleted: true,
        message: "Teacher deleted permanently. No protected historical school records were removed."
      });
    }

    if (action === "deactivate_teacher" || action === "reactivate_teacher") {
      const teacherId = payload.recordId?.trim();
      if (!teacherId) return response({ error: "A teacher record is required." }, 400);
      const { data: teacherRecord, error: teacherLookupError } = await serviceClient
        .from("teachers")
        .select("id,profile_id,first_name,last_name,status")
        .eq("id", teacherId)
        .maybeSingle();
      if (teacherLookupError || !teacherRecord) return response({ error: "The selected teacher could not be found." }, 404);
      const nextStatus = action === "reactivate_teacher" ? "ACTIVE" : "INACTIVE";
      const { error: teacherStatusError } = await serviceClient
        .from("teachers")
        .update({ status: nextStatus })
        .eq("id", teacherId);
      if (teacherStatusError) return response({ error: "The teacher record could not be updated." }, 400);
      if (teacherRecord.profile_id) {
        const { error: profileStatusError } = await serviceClient
          .from("profiles")
          .update({ status: nextStatus })
          .eq("id", teacherRecord.profile_id);
        if (profileStatusError) {
          await serviceClient.from("teachers").update({ status: teacherRecord.status }).eq("id", teacherId);
          return response({ error: "The teacher record changed but the login access could not be updated. No partial change was kept." }, 500);
        }
      }
      await serviceClient.from("audit_logs").insert({
        actor_id: user.id,
        action: nextStatus === "ACTIVE" ? "REACTIVATE_TEACHER" : "DEACTIVATE_TEACHER",
        entity_type: "teacher",
        entity_id: teacherId,
        metadata: { profileId: teacherRecord.profile_id, status: nextStatus }
      });
      return response({
        id: teacherId,
        status: nextStatus,
        message: nextStatus === "ACTIVE"
          ? "Teacher reactivated. Portal access is active again."
          : "Teacher deactivated. Portal access is disabled, while the teacher's school history remains intact."
      });
    }

    if (action === "set_password") {
      const email = payload.email?.trim().toLowerCase();
      const password = (payload as { password?: string }).password ?? "";
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) return response({ error: "Provide a valid teacher email address." }, 400);
      if (password.length < 8) return response({ error: "Password must be at least 8 characters long." }, 400);
      const { data: existingProfile, error: profileLookupError } = await serviceClient
        .from("profiles")
        .select("id,full_name,role,status")
        .eq("email", email)
        .maybeSingle();
      if (profileLookupError || !existingProfile) return response({ error: "No school account was found for this email." }, 404);
      if (existingProfile.role !== "TEACHER" || existingProfile.status !== "ACTIVE") return response({ error: "Only an active teacher account can be given a teacher password." }, 400);
      const { data: teacherRecord, error: teacherLookupError } = await serviceClient
        .from("teachers")
        .select("id")
        .eq("profile_id", existingProfile.id)
        .maybeSingle();
      if (teacherLookupError || !teacherRecord) return response({ error: "The school teacher record is not linked to this account." }, 400);
      const { error: passwordError } = await serviceClient.auth.admin.updateUserById(existingProfile.id, { password });
      if (passwordError) return response({ error: passwordError.message || "The teacher password could not be updated." }, 400);
      await serviceClient.from("audit_logs").insert({ actor_id: user.id, action: "SET_TEACHER_PASSWORD", entity_type: "profile", entity_id: existingProfile.id, metadata: { teacherId: teacherRecord.id } });
      return response({ id: existingProfile.id, message: "Teacher password updated successfully." });
    }
    const table = recordType === "teacher" ? "teachers" : recordType === "parent" ? "parents" : "students";
    const roleForRecord = { teacher: "TEACHER", parent: "PARENT", student: "STUDENT" } as const;

    if (action === "resend") {
      const email = payload.email?.trim().toLowerCase();
      const fullName = payload.fullName?.trim() || "Menwe School User";
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) return response({ error: "Provide a valid email address to resend the invitation." }, 400);
      const { data: existingProfile, error: profileLookupError } = await serviceClient.from("profiles").select("id,full_name,role,status").eq("email", email).maybeSingle();
      if (profileLookupError) return response({ error: "The existing school account could not be located." }, 500);
      if (!existingProfile) return response({ error: "No existing school account was found for this email. Send a new invitation instead." }, 404);
      if (!["ADMIN", "SUPER_ADMIN", "TEACHER", "STUDENT", "PARENT"].includes(existingProfile.role)) return response({ error: "The existing account has an unsupported school role." }, 400);
      const siteUrl = normaliseSiteUrl(Deno.env.get("SITE_URL") ?? req.headers.get("origin"));
      const redirectTo = siteUrl ? siteUrl + "/portal/password" : undefined;
      const linkOptions = redirectTo ? { redirectTo, data: { full_name: existingProfile.full_name || fullName } } : { data: { full_name: existingProfile.full_name || fullName } };
      const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({ type: "invite", email, options: linkOptions });
      if (linkError || !linkData.properties?.action_link) return response({ error: linkError?.message || "Supabase could not generate a new invitation link." }, 502);
      const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
      const resendFrom = (Deno.env.get("RESEND_FROM_EMAIL") ?? Deno.env.get("RESEND_FROM") ?? "").trim();
      if (!resendApiKey || !resendFrom) return response({ error: "Invitation resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL in Supabase Edge Function Secrets, or configure Supabase Auth SMTP/Send Email Hook for the project.", code: "RESEND_EMAIL_CONFIGURATION_REQUIRED" }, 503);
      const displayName = existingProfile.full_name || fullName;
      const safeName = displayName.replace(/[<>&]/g, "");
      const emailResponse = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + resendApiKey, "Content-Type": "application/json" }, body: JSON.stringify({ from: resendFrom, to: [email], subject: "Your Menwe School portal invitation", html: "<p>Hello " + safeName + ",</p><p>You have been invited to access the Menwe Primary &amp; Junior School portal.</p><p><a href=\"" + linkData.properties.action_link + "\">Accept invitation and set your password</a></p><p>If you did not expect this message, you can ignore it.</p>" }) });
      if (!emailResponse.ok) return response({ error: "The invitation link was generated, but the email provider rejected the message." }, 502);
      return response({ id: existingProfile.id, message: "Invitation resent to " + email + ". Ask the recipient to check inbox and spam." });
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

    // Direct teacher entry: when an administrator supplies a password, create/activate the account immediately.
    // This intentionally avoids invitation emails and password-confirmation flows for school staff.
    if (action === "direct") {
      if (payload.role !== "TEACHER" || recordType !== "teacher") return response({ error: "Direct entry is currently available for teacher accounts only." }, 400);
      const password = payload.password ?? "";
      if (password.length < 8) {
        if (createdTeacherId) await serviceClient.from("teachers").delete().eq("id", createdTeacherId).is("profile_id", null);
        return response({ error: "Password must be at least 8 characters long." }, 400);
      }
      const { data: createdAuth, error: authError } = await serviceClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
      if (authError || !createdAuth.user) {
        if (createdTeacherId) await serviceClient.from("teachers").delete().eq("id", createdTeacherId).is("profile_id", null);
        return response({ error: authError?.message || "The teacher login could not be created." }, 400);
      }
      const authId = createdAuth.user.id;
      const removeDirectAccount = async () => {
        await serviceClient.auth.admin.deleteUser(authId);
        if (createdTeacherId) await serviceClient.from("teachers").delete().eq("id", createdTeacherId).is("profile_id", null);
      };
      const { error: profileError } = await serviceClient.from("profiles").update({ role: "TEACHER", full_name: fullName, email }).eq("id", authId);
      if (profileError) {
        await removeDirectAccount();
        return response({ error: "The teacher account could not be prepared for portal access." }, 500);
      }
      const { error: recordError } = await serviceClient.from("teachers").update({ profile_id: authId, email, first_name: fullName.split(/\\s+/)[0] ?? fullName, last_name: fullName.split(/\\s+/).slice(-1)[0] ?? fullName, status: "ACTIVE" }).eq("id", recordId).is("profile_id", null);
      if (recordError) {
        await removeDirectAccount();
        return response({ error: "The teacher account could not be linked to the staff record." }, 500);
      }
      await serviceClient.from("audit_logs").insert({ actor_id: user.id, action: "DIRECT_TEACHER_ACCOUNT_CREATED", entity_type: "profile", entity_id: authId, metadata: { role: "TEACHER", recordType: "teacher", recordId } });
      return response({ id: authId, recordId, message: "Teacher account created and ready for direct login." });
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
