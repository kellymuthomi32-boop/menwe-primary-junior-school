import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers });
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });
  try {
    const body = await req.json();
    const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
    if (!identifier) return json(400, { error: "Enter your registered admission or UPI number." });
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json(500, { error: "Sign-in lookup is not configured. Contact school ICT." });
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: studentId, error: lookupError } = await admin.rpc("verify_learner_registration", { identifier });
    if (lookupError) {
      console.error("Family sign-in lookup failed", lookupError.message);
      return json(500, { error: "Unable to verify the school identifier right now. Try again." });
    }
    if (!studentId) return json(400, { error: "Invalid login credentials or unregistered school identifier." });
    const { data: student, error: studentError } = await admin.from("students")
      .select("id").eq("id", studentId).eq("status", "ACTIVE").is("deleted_at", null).maybeSingle();
    if (studentError || !student) return json(400, { error: "This learner account is not active. Contact the school office." });
    return json(200, { email: `family.${studentId}@accounts.menwe.invalid` });
  } catch {
    return json(400, { error: "Invalid login request." });
  }
});
