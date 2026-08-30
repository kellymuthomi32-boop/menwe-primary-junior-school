import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rubricGuidance: Record<string, string> = {
  EE: "Exceeding Expectations: extend challenge, deepen application and encourage leadership.",
  ME: "Meeting Expectations: reinforce mastery and encourage consistent independent application.",
  AE: "Approaching Expectations: identify the specific skill needing practice and suggest supportive next steps.",
  BE: "Below Expectations: use encouraging language, identify a foundational gap and recommend targeted support.",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) throw new Error("Authentication required.");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Your staff session is invalid or expired.");

    const role = String(user.app_metadata?.role ?? "").toLowerCase();
    const masterAdmin = user.email?.trim().toLowerCase() === "menweprimaryandjunior@gmail.com";
    if (!masterAdmin && !["admin", "teacher", "staff", "class_teacher", "classroom_teacher"].includes(role)) {
      return new Response(JSON.stringify({ error: "Only authorized school staff can use the CBC assistant." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const input = await request.json();
    const gradeLevel = String(input.grade_level ?? "").trim();
    const learningArea = String(input.learning_area ?? "").trim();
    const rubricScore = String(input.rubric_score ?? "").trim().toUpperCase();
    const currentRemarks = String(input.current_remarks ?? "").trim().slice(0, 1000);
    if (!gradeLevel || !learningArea || !rubricGuidance[rubricScore]) throw new Error("Please provide a valid grade, learning area and CBC rubric.");

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "The school AI assistant is not configured yet. A teacher can still enter remarks manually." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const prompt = `You are a Kenyan CBC formative-assessment writing assistant for Menwe Primary & Junior School. Draft one concise, constructive teacher remark (2-3 sentences) for ${gradeLevel}, learning area ${learningArea}, rubric ${rubricScore}. ${rubricGuidance[rubricScore]} Use age-appropriate, strengths-based language. Do not invent marks, diagnoses, personal facts, or learner names. Focus on observable learning evidence and one practical next step. Existing teacher note, if any: ${currentRemarks || "none"}. Return only the remark.`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini", temperature: 0.4, max_tokens: 140, messages: [{ role: "system", content: "Write safe, concise educational feedback. Never claim facts not supplied." }, { role: "user", content: prompt }] }),
    });
    if (!response.ok) throw new Error("AI provider request failed.");
    const result = await response.json();
    const remark = result.choices?.[0]?.message?.content?.trim();
    if (!remark) throw new Error("The AI assistant returned no remark.");
    return new Response(JSON.stringify({ remark }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate remarks.";
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
