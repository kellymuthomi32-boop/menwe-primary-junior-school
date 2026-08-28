import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  try {
    const { email, password, displayName, bootstrapCode } = await req.json() as Record<string, string>;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedName = displayName?.trim();
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) return reply({ error: "Enter a valid email address." }, 400);
    if (!normalizedName || normalizedName.length < 2 || normalizedName.length > 120) return reply({ error: "Enter the administrator's real name." }, 400);
    if (!password || password.length < 12) return reply({ error: "Use a password of at least 12 characters." }, 400);
    if (!bootstrapCode || bootstrapCode.length < 20) return reply({ error: "Enter a valid one-time setup code." }, 400);
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!url || !serviceKey) return reply({ error: "Secure administrator onboarding is not configured." }, 500);
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: claimed, error: claimError } = await admin.rpc("consume_initial_admin_bootstrap", { p_token_hash: await sha256(bootstrapCode) });
    if (claimError) return reply({ error: "The one-time setup code could not be verified." }, 500);
    if (!claimed) return reply({ error: "This setup code is invalid, expired, already used, or the school already has an administrator." }, 403);
    const { data: created, error: createError } = await admin.auth.admin.createUser({ email: normalizedEmail, password, email_confirm: true, user_metadata: { display_name: normalizedName } });
    if (createError || !created.user) return reply({ error: createError?.message || "The administrator account could not be created." }, 400);
    const { error: profileError } = await admin.from("profiles").update({ email: normalizedEmail, display_name: normalizedName, role: "admin", is_approved: true, is_disabled: false }).eq("id", created.user.id);
    if (profileError) { await admin.auth.admin.deleteUser(created.user.id); return reply({ error: "The administrator profile could not be prepared. The setup code has been locked for safety." }, 500); }
    await admin.from("audit_logs").insert({ actor_id: created.user.id, action: "FIRST_ADMIN_CREATED", resource: "profile", record_id: created.user.id, new_value: { role: "admin", bootstrap: true } });
    await admin.from("school_bootstrap_tokens").update({ used_by: created.user.id }).eq("id", true);
    return reply({ message: "The first administrator account is ready." });
  } catch { return reply({ error: "The secure administrator onboarding request could not be completed." }, 500); }
});
