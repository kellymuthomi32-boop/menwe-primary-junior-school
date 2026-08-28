import { AlertCircle, ImageOff, Loader2, School } from "lucide-react";
import { useEffect, useState } from "react";
import PublicLayout from "@/components/PublicLayout";
import { getSupabase } from "@/lib/supabase";

type ImageItem = { id: string; caption: string | null; sort_order: number; storage_path: string; original_name: string };
type Album = { id: string; title: string; description: string | null; images: ImageItem[] };

export default function PublicGalleryPage() {
  const [albums, setAlbums] = useState<Album[]>([]); const [loading, setLoading] = useState(true); const [failed, setFailed] = useState<string | null>(null); const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => { let active = true; const created: string[] = []; void (async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("gallery_albums").select("id,title,description,gallery_images(id,caption,sort_order,documents(storage_path,original_name))").eq("status", "Published").order("created_at", { ascending: false });
      if (error) throw error;
      const normalized = (data ?? []).map((album: any) => ({ id: album.id, title: album.title, description: album.description, images: (album.gallery_images ?? []).map((image: any) => ({ id: image.id, caption: image.caption, sort_order: image.sort_order ?? 0, storage_path: image.documents?.storage_path, original_name: image.documents?.original_name ?? "Gallery image" })).filter((image: ImageItem) => Boolean(image.storage_path)).sort((a: ImageItem, b: ImageItem) => a.sort_order - b.sort_order) }));
      const nextUrls: Record<string, string> = {};
      await Promise.all(normalized.flatMap((album: Album) => album.images.map(async image => { const { data: file, error: downloadError } = await supabase.storage.from("public-assets").download(image.storage_path); if (!downloadError && file) { const url = URL.createObjectURL(file); created.push(url); nextUrls[image.id] = url; } })));
      if (active) { setAlbums(normalized); setUrls(nextUrls); }
    } catch (cause) { if (active) setFailed(cause instanceof Error ? cause.message : "Published gallery media could not be loaded."); }
    finally { if (active) setLoading(false); }
  })(); return () => { active = false; created.forEach(URL.revokeObjectURL); }; }, []);
  return <PublicLayout><section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24"><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--accent)]">School life</p><h1 className="mt-4 font-serif text-5xl font-semibold">Gallery</h1><p className="mt-5 max-w-2xl text-lg text-[var(--ink)]/65">Only albums and images deliberately published by the school are available here.</p>{loading ? <div className="py-20 text-center"><Loader2 className="mx-auto animate-spin text-[var(--accent)]" /></div> : failed ? <div className="menwe-card mt-10 flex items-center gap-3 rounded-3xl p-8 text-red-700"><AlertCircle /><span>{failed}</span></div> : albums.length === 0 ? <div className="menwe-card mt-10 rounded-3xl border-dashed p-10 text-center"><School className="mx-auto text-[var(--accent)]"/><h2 className="mt-4 font-serif text-2xl font-semibold">No published gallery albums yet.</h2><p className="mt-2 text-sm text-[var(--ink)]/60">The school can publish approved albums when media is ready.</p></div> : <div className="mt-10 grid gap-10">{albums.map(album => <article key={album.id}><div className="mb-5"><h2 className="font-serif text-3xl font-semibold">{album.title}</h2>{album.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink)]/65">{album.description}</p>}</div>{album.images.length === 0 ? <div className="menwe-card rounded-3xl border-dashed p-8 text-sm text-[var(--ink)]/55">This published album has no published images yet.</div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{album.images.map(image => <figure className="menwe-card overflow-hidden rounded-3xl" key={image.id}>{urls[image.id] ? <img src={urls[image.id]} alt={image.caption || image.original_name} className="aspect-[4/3] w-full object-cover" loading="lazy" onError={event => { event.currentTarget.style.display = "none"; }} /> : <div className="grid aspect-[4/3] place-items-center bg-[var(--mist)] text-[var(--ink)]/45"><ImageOff /></div>}{image.caption && <figcaption className="p-4 text-sm text-[var(--ink)]/70">{image.caption}</figcaption>}</figure>)}</div>}</article>)}</div>}</section></PublicLayout>;
}
