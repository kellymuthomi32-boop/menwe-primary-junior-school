import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const key = ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined))?.trim();

// Public Supabase reads must never be satisfied by a cached response from an older
// deployment/configuration. The publishable key is intentionally browser-safe;
// never use a service-role key here.
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    cache: "no-store",
    headers: new Headers(init?.headers),
  });

export const supabase: SupabaseClient | null = url && key
  ? createClient(url, key, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
      global: { fetch: noStoreFetch },
    })
  : null;

export function getSupabase(): SupabaseClient {
  if (!supabase) throw new Error("Supabase public configuration is unavailable");
  return supabase;
}

export function getUserPortalRole(user: { email?: string | null; app_metadata?: Record<string, unknown> } | null): "staff" | "parent" {
  if (user?.email?.trim().toLowerCase() === "menweprimaryandjunior@gmail.com") return "staff";
  const role = user?.app_metadata?.role;
  return typeof role === "string" && ["staff", "teacher", "class_teacher", "classroom_teacher", "admin", "head_of_institution", "deputy_hoi"].includes(role.toLowerCase()) ? "staff" : "parent";
}
