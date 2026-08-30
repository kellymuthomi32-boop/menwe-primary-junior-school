import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const key = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
)?.trim();

// Keep the client nullable when deployment configuration is incomplete. UI callers use getSupabase()
// so missing environment variables become a controlled, user-facing error instead of a module crash.
export const supabase: SupabaseClient | null = url && key
  ? createClient(url, key, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    })
  : null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in the deployment environment.");
  }
  return supabase;
}

export function getUserPortalRole(user: { user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } | null): "staff" | "parent" {
  const role = user?.app_metadata?.role ?? user?.user_metadata?.role;
  return typeof role === "string" && ["staff", "teacher", "class_teacher", "classroom_teacher", "admin", "head_of_institution", "deputy_hoi"].includes(role.toLowerCase()) ? "staff" : "parent";
}