import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const key = ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined))?.trim();

// Supabase public configuration is unavailable when deployment variables are missing; fail closed without a module-level crash.
export const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }) : null;
export function getSupabase(): SupabaseClient { if (!supabase) throw new Error("Supabase public configuration is unavailable"); return supabase; }
export function getUserPortalRole(user: { email?: string | null; app_metadata?: Record<string, unknown> } | null): "staff" | "parent" {
  if (user?.email?.trim().toLowerCase() === "menweprimaryandjunior@gmail.com") return "staff";
  const role = user?.app_metadata?.role;
  return typeof role === "string" && ["staff", "teacher", "class_teacher", "classroom_teacher", "admin", "head_of_institution", "deputy_hoi"].includes(role.toLowerCase()) ? "staff" : "parent";
}
