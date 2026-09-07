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

const VERIFIED_PUBLIC_MEDIA_FALLBACKS: Record<string, Pick<SiteMedia, "image_url" | "alt_text" | "label" | "section" | "mime_type" | "byte_size" | "updated_at">> = {
  homepage_hero_1: {
    image_url: "https://zpmrwdvtchblgntnaloh.supabase.co/storage/v1/object/public/public-media/site-media/homepage_hero_1/714a8da9-5f94-4438-944c-0c65e8ead8d5.jpeg",
    alt_text: "Menwe learners in a learning environment",
    label: "Homepage hero — learning",
    section: "homepage",
    mime_type: "image/jpeg",
    byte_size: 228568,
    updated_at: "2026-09-05T10:37:34.305019+00:00",
  },
  homepage_hero_2: {
    image_url: "https://zpmrwdvtchblgntnaloh.supabase.co/storage/v1/object/public/public-media/site-media/homepage_hero_2/85b56186-c249-45db-8ea8-39c3e10d2042.jpeg",
    alt_text: "Menwe school community",
    label: "Homepage hero — community",
    section: "homepage",
    mime_type: "image/jpeg",
    byte_size: 228568,
    updated_at: "2026-09-05T10:39:46.041648+00:00",
  },
};

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
    .eq("is_published", true)
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
    const db = getSupabase();
    const load = async () => {
      try {
        const rows = await fetchSiteMedia(keys);
        if (active) setMedia(Object.fromEntries(rows.map(row => [row.media_key, row])));
      } catch {
        if (active) {
          const fallbackEntries = (keys ?? [])
            .map(key => [key, VERIFIED_PUBLIC_MEDIA_FALLBACKS[key]] as const)
            .filter((entry): entry is readonly [string, NonNullable<typeof entry[1]>] => Boolean(entry[1]))
            .map(([key, fallback]) => [key, {
              id: `verified-fallback-${key}`,
              media_key: key,
              image_url: fallback.image_url,
              storage_key: null,
              alt_text: fallback.alt_text,
              label: fallback.label,
              section: fallback.section,
              mime_type: fallback.mime_type,
              byte_size: fallback.byte_size,
              updated_at: fallback.updated_at,
            } satisfies SiteMedia]);
          setMedia(Object.fromEntries(fallbackEntries));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    setLoading(true);
    void load();

    const channel = db
      .channel(`site-media-${keyString || "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_media" }, () => { void load(); })
      .subscribe();

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      void db.removeChannel(channel);
    };
  }, [keyString]);

  return { media, loading };
}

export function resolveSiteImage(media: SiteMedia | undefined, fallback: string) {
  return cacheBustedUrl(media?.image_url, media?.updated_at) || fallback;
}
