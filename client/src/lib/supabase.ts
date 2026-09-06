import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const key = ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined))?.trim();

// Auth requests must bypass cache; public reads may use the normal request cache.
const noStoreFetch: typeof fetch = (input, init) => {
  const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (!requestUrl.includes("/auth/v1/")) return fetch(input, init);
  return fetch(input, {
    ...init,
    cache: "no-store",
    headers: new Headers(init?.headers),
  });
};

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
