import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export type SiteMedia = {
  id: string;
  media_key: string;
  image_url: string | null;
  storage_key: string | null;
  alt_text: string;
  label: string;
  section: string;
  mime_type: string | null;
  byte_size: number | null;
  updated_at: string;
};

const MEDIA_TIMEOUT_MS = 8_000;

export function cacheBustedUrl(url: string | null | undefined, version?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set("v", version || "1");
    return parsed.toString();
  } catch {
    const hashIndex = url.indexOf("#");
    const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
    const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}v=${encodeURIComponent(version || "1")}${hash}`;
  }
}

function withTimeout<T>(promise: PromiseLike<T>, ms = MEDIA_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Media request timed out.")), ms);
    Promise.resolve(promise).then(resolve, reject).finally(() => window.clearTimeout(timer));
  });
}

export async function fetchSiteMedia(keys?: string[]) {
  let query = getSupabase()
    .from("site_media")
    .select("id,media_key,image_url,storage_key,alt_text,label,section,mime_type,byte_size,updated_at")
    .order("section")
    .order("label");
  if (keys?.length) query = query.in("media_key", keys);
  const { data, error } = await withTimeout(query);
  if (error) throw error;
  return (data ?? []) as SiteMedia[];
}

export function useSiteMedia(keys?: string[]) {
  const keyString = keys?.join(",") ?? "";
  const [media, setMedia] = useState<Record<string, SiteMedia>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchSiteMedia(keys)
      .then(rows => {
        if (!active) return;
        setMedia(Object.fromEntries(rows.map(row => [row.media_key, row])));
      })
      .catch(() => {
        if (active) setMedia({});
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [keyString]);
  return { media, loading };
}

export function resolveSiteImage(media: SiteMedia | undefined, fallback: string) {
  return cacheBustedUrl(media?.image_url, media?.updated_at) || fallback;
}
