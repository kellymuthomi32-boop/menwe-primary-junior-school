import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, RefreshCw, Trash2, UploadCloud, X } from "lucide-react";
import { PortalLayout } from "@/components/PortalLayout";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";
import { cacheBustedUrl, fetchSiteMedia, type SiteMedia } from "@/lib/siteMedia";

const BUCKET = "public-media";
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const text = (v: unknown, fallback = "") => v == null || v === "" ? fallback : String(v);

type GalleryRow = { id: string; album_id: string; file_id: string; caption: string | null; status: string; uploaded_files?: { filename?: string; public_url?: string; mime_type?: string; byte_size?: number } | null };
type Album = { id: string; title: string; description: string | null; status: string };

const slots = [
  ["homepage_hero_1", "Homepage hero — learning", "homepage"], ["homepage_hero_2", "Homepage hero — community", "homepage"],
  ["homepage_hero_3", "Homepage hero — arts", "homepage"], ["homepage_hero_4", "Homepage hero — sport", "homepage"],
  ["homepage_hero_5", "Homepage hero — science", "homepage"], ["principal_photo", "Principal photo", "about"],
  ["about_banner", "About page banner", "about"], ["contact_banner", "Contact page banner", "contact"],
  ["gallery_banner", "Gallery page banner", "gallery"],
] as const;

export default function MediaManagerPage() {
  const { user, profile, loading: authLoading } = useSchoolAuth();
  const [media, setMedia] = useState<SiteMedia[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [gallery, setGallery] = useState<GalleryRow[]>([]);
  const [selectedKey, setSelectedKey] = useState(slots[0][0]);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [newAlbum, setNewAlbum] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const admin = !!profile && isAdministrator(profile.role);

  const refresh = useCallback(async () => {
    const db = getSupabase();
    const [m, a, g] = await Promise.all([
      fetchSiteMedia(),
      db.from("gallery_albums").select("id,title,description,status").order("created_at", { ascending: false }),
      db.from("gallery_images").select("id,album_id,file_id,caption,status,uploaded_files(filename,public_url,mime_type,byte_size)").order("created_at", { ascending: false }),
    ]);
    if (a.error) throw a.error;
    if (g.error) throw g.error;
    setMedia(m); setAlbums((a.data ?? []) as Album[]); setGallery((g.data ?? []) as GalleryRow[]);
    if (!albumId && a.data?.[0]?.id) setAlbumId(String(a.data[0].id));
  }, [albumId]);

  useEffect(() => { if (!authLoading && admin) void refresh().catch(e => setError(e instanceof Error ? e.message : "Media could not be loaded.")); }, [admin, authLoading, refresh]);

  const selected = useMemo(() => media.find(m => m.media_key === selectedKey), [media, selectedKey]);
  const preview = file ? URL.createObjectURL(file) : cacheBustedUrl(selected?.image_url, selected?.updated_at);

  const acceptFile = (candidate: File | null) => {
    if (!candidate) return;
    setError("");
    if (!TYPES.has(candidate.type)) { setError("Use JPEG, PNG or WebP images."); return; }
    if (candidate.size > MAX_BYTES) { setError("Images must be 5 MB or smaller."); return; }
    setFile(candidate);
  };

  const uploadSiteImage = async () => {
    if (!file || !user) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `site-media/${selectedKey}/${crypto.randomUUID()}.${ext}`;
      const db = getSupabase();
      const upload = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (upload.error) throw upload.error;
      const publicUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      const old = selected;
      const row = await db.from("site_media").upsert({ media_key: selectedKey, image_url: publicUrl, storage_key: path, alt_text: old?.alt_text || file.name.replace(/\.[^.]+$/, ""), label: old?.label || selectedKey, section: old?.section || "site", mime_type: file.type, byte_size: file.size, updated_by: user.id }, { onConflict: "media_key" }).select().single();
      if (row.error) { await db.storage.from(BUCKET).remove([path]); throw row.error; }
      if (old?.storage_key && old.storage_key !== path) await db.storage.from(BUCKET).remove([old.storage_key]);
      setFile(null); setMessage(`${old?.label || selectedKey} updated. The new image is live with a fresh version URL.`); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Image upload failed."); }
    finally { setBusy(false); }
  };

  const saveAlt = async () => {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      const r = await getSupabase().from("site_media").update({ alt_text: selected.alt_text }).eq("id", selected.id);
      if (r.error) throw r.error;
      setMessage("Accessibility text saved."); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save accessibility text."); }
    finally { setBusy(false); }
  };

  const createAlbum = async () => {
    if (!newAlbum.trim() || !user) return;
    setBusy(true); setError("");
    try {
      const r = await getSupabase().from("gallery_albums").insert({ title: newAlbum.trim(), created_by: user.id, status: "PUBLISHED" }).select("id,title,description,status").single();
      if (r.error) throw r.error;
      setNewAlbum(""); setAlbumId(String(r.data.id)); setMessage("Gallery album created and published."); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Album could not be created."); }
    finally { setBusy(false); }
  };

  const uploadGallery = async () => {
    if (!file || !albumId || !user) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `gallery/${albumId}/${crypto.randomUUID()}.${ext}`;
      const db = getSupabase();
      const upload = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (upload.error) throw upload.error;
      const publicUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      const f = await db.from("uploaded_files").insert({ owner_id: user.id, storage_key: path, public_url: publicUrl, filename: file.name, mime_type: file.type, byte_size: file.size, purpose: "gallery" }).select("id").single();
      if (f.error) { await db.storage.from(BUCKET).remove([path]); throw f.error; }
      const g = await db.from("gallery_images").insert({ album_id: albumId, file_id: f.data.id, caption: caption.trim() || null, sort_order: 0, status: "PUBLISHED" });
      if (g.error) { await db.from("uploaded_files").delete().eq("id", f.data.id); await db.storage.from(BUCKET).remove([path]); throw g.error; }
      setFile(null); setCaption(""); setMessage("Gallery image published successfully."); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Gallery upload failed."); }
    finally { setBusy(false); }
  };

  const deleteGallery = async (row: GalleryRow) => {
    if (!window.confirm("Delete this gallery image and its stored file?")) return;
    setBusy(true); setError("");
    try {
      const db = getSupabase();
      const f = await db.from("uploaded_files").select("storage_key").eq("id", row.file_id).maybeSingle();
      if (f.error) throw f.error;
      const d = await db.from("gallery_images").delete().eq("id", row.id); if (d.error) throw d.error;
      if (f.data?.storage_key) await db.storage.from(BUCKET).remove([String(f.data.storage_key)]);
      const fd = await db.from("uploaded_files").delete().eq("id", row.file_id); if (fd.error) throw fd.error;
      setMessage("Gallery image deleted."); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Gallery image could not be deleted."); }
    finally { setBusy(false); }
  };

  if (authLoading) return <PortalLayout role="ADMIN"><div className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin"/></div></PortalLayout>;
  if (!admin) return <PortalLayout role={profile?.role ?? "STUDENT"}><main className="mx-auto max-w-3xl p-6"><div className="menwe-card rounded-3xl p-8">Media management is restricted to authorised administrators.</div></main></PortalLayout>;

  return <PortalLayout role="ADMIN"><main className="mx-auto w-full max-w-[1500px] space-y-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
    <header className="rounded-[2.25rem] bg-[var(--ink)] p-6 text-white shadow-2xl sm:p-9"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[var(--gold)]">Site-wide CMS · Media Manager</p><h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Control the school's images without code.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-white/65">Upload once, assign a site slot or gallery album, preview instantly and publish. Every replacement receives a new version timestamp so browsers and CDNs stop serving the old image.</p></div><button type="button" onClick={() => void refresh()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold"><RefreshCw size={17}/>Refresh media</button></div></header>
    {message && <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><CheckCircle2 size={18}/>{message}</div>}
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}

    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="flex flex-col gap-5 lg:flex-row"><div className="w-full lg:w-[360px]"><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--accent)]">1 · Site slots</p><h2 className="mt-2 text-2xl font-bold text-[var(--ink)]">Choose what to replace</h2><div className="mt-4 space-y-2">{slots.map(([key,label,section]) => <button type="button" key={key} onClick={() => { setSelectedKey(key); setFile(null); }} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selectedKey===key?"border-[var(--gold)] bg-[var(--gold)]/10":"border-[var(--ink)]/10 hover:border-[var(--gold)]/40"}`}><span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--mist)]">{media.find(m=>m.media_key===key)?.image_url?<img src={cacheBustedUrl(media.find(m=>m.media_key===key)?.image_url,media.find(m=>m.media_key===key)?.updated_at)??""} alt="" className="h-full w-full object-cover"/>:<ImagePlus size={17} className="text-[var(--accent)]"/>}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{label}</b><span className="text-[11px] uppercase tracking-wide text-[var(--ink)]/40">{section} · {key}</span></span></button>)}</div></div><div className="min-w-0 flex-1 rounded-2xl border border-[var(--ink)]/10 bg-[var(--mist)] p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--accent)]">2 · Preview & replace</p><h2 className="mt-2 text-2xl font-bold text-[var(--ink)]">{selected?.label || selectedKey}</h2><div className="mt-5 grid gap-5 lg:grid-cols-[1fr_260px]"><div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-[var(--ink)]/10">{preview?<img src={preview} alt={selected?.alt_text || "Selected site media"} className="max-h-[420px] w-full object-contain"/>:<div className="text-center text-sm text-[var(--ink)]/45"><ImagePlus className="mx-auto mb-2"/>No image assigned yet</div>}</div><div className="space-y-3"><label className="block text-sm font-bold">Alt text<input value={selected?.alt_text || ""} onChange={e=>selected&&setMedia(prev=>prev.map(m=>m.id===selected.id?{...m,alt_text:e.target.value}:m))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3 text-sm"/></label><button type="button" onClick={()=>void saveAlt()} disabled={busy||!selected} className="w-full rounded-xl border px-4 py-2.5 text-sm font-bold">Save alt text</button><div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);acceptFile(e.dataTransfer.files?.[0]??null)}} onClick={()=>inputRef.current?.click()} className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition ${dragging?"border-[var(--gold)] bg-[var(--gold)]/10":"border-[var(--ink)]/15 bg-white"}`}><UploadCloud className="mx-auto text-[var(--accent)]"/><p className="mt-2 text-sm font-bold">Drop an image here</p><p className="mt-1 text-xs text-[var(--ink)]/45">JPEG, PNG or WebP · max 5 MB</p><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>acceptFile(e.target.files?.[0]??null)}/></div>{file&&<div className="flex items-center justify-between rounded-xl bg-white p-3 text-xs"><span className="truncate font-semibold">{file.name}</span><button type="button" onClick={()=>setFile(null)}><X size={16}/></button></div>}<button type="button" onClick={()=>void uploadSiteImage()} disabled={busy||!file} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?<Loader2 className="animate-spin" size={17}/>:<UploadCloud size={17}/>}Replace site image</button></div></div></div></div></section>

    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--accent)]">3 · Gallery</p><h2 className="mt-2 text-2xl font-bold text-[var(--ink)]">Upload and publish school gallery images</h2><div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]"><div className="rounded-2xl bg-[var(--mist)] p-5"><label className="block text-sm font-bold">Album<select value={albumId} onChange={e=>setAlbumId(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3"><option value="">Select album</option>{albums.map(a=><option key={a.id} value={a.id}>{a.title} · {a.status}</option>)}</select></label><div className="mt-3 flex gap-2"><input value={newAlbum} onChange={e=>setNewAlbum(e.target.value)} placeholder="New album title" className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--ink)]/15 bg-white px-3 text-sm"/><button type="button" disabled={busy||!newAlbum.trim()} onClick={()=>void createAlbum()} className="rounded-xl bg-[var(--ink)] px-4 text-xs font-bold text-white">Create</button></div><label className="mt-4 block text-sm font-bold">Caption<input value={caption} onChange={e=>setCaption(e.target.value)} maxLength={500} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3 text-sm"/></label><button type="button" disabled={busy||!file||!albumId} onClick={()=>void uploadGallery()} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><ImagePlus size={17}/>Publish gallery image</button></div><div className="grid max-h-[420px] gap-3 overflow-auto sm:grid-cols-2">{gallery.length===0?<div className="rounded-2xl border border-dashed p-8 text-center text-sm text-[var(--ink)]/45">No gallery uploads yet.</div>:gallery.map(g=>{const f=g.uploaded_files;const src=cacheBustedUrl(f?.public_url,g.id);return <article key={g.id} className="rounded-2xl border border-[var(--ink)]/10 bg-white p-3"><div className="aspect-[4/3] overflow-hidden rounded-xl bg-[var(--mist)]">{src&&<img src={src} alt={g.caption||f?.filename||"Gallery image"} className="h-full w-full object-cover"/>}</div><p className="mt-2 truncate text-xs font-bold">{f?.filename||"Gallery image"}</p><button type="button" disabled={busy} onClick={()=>void deleteGallery(g)} className="mt-2 inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-700"><Trash2 size={13}/>Delete</button></article>})}</div></div></section>
  </main></PortalLayout>;
}
