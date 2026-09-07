import { BookOpen, ExternalLink, FileText, Link2, Loader2, Plus, Search, Sparkles, Upload, Video, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";

type Row = Record<string, unknown>;
const text = (v: unknown, fallback = "") => v == null ? fallback : String(v);
const input = "min-h-11 w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[var(--accent)]";
const typeIcon = (type: string) => type === "VIDEO" ? Video : type === "PDF" || type === "DOCUMENT" ? FileText : type === "NOTES" ? BookOpen : Link2;
const cleanName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);

export default function LearningMaterialsDirectory() {
  const { user, profile } = useSchoolAuth();
  const [rows, setRows] = useState<Row[]>([]), [classes, setClasses] = useState<Row[]>([]), [subjects, setSubjects] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null), [query, setQuery] = useState(""), [subjectFilter, setSubjectFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false), [file, setFile] = useState<File | null>(null), [uploadMode, setUploadMode] = useState<"file" | "link">("file");
  const [form, setForm] = useState({ title: "", description: "", material_type: "PDF", resource_url: "", class_id: "", subject_id: "" });
  const admin = ["SUPER_ADMIN", "ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI"].includes(profile?.role ?? "");
  const teacher = profile?.role === "TEACHER", canCreate = admin || teacher;

  const load = useCallback(async () => {
    if (!user || !profile) return;
    setLoading(true); setMessage(null);
    try {
      const db = getSupabase(); let teacherId = "";
      if (teacher) {
        const tr = await db.from("teachers").select("id").eq("profile_id", user.id).maybeSingle();
        if (tr.error) throw tr.error; if (!tr.data) throw new Error("Your teacher record is not linked yet. Ask an administrator to complete your staff profile.");
        teacherId = String(tr.data.id);
      }
      const assignments = teacher ? await db.from("teacher_assignments").select("class_id,subject_id").eq("teacher_id", teacherId) : null;
      if (assignments?.error) throw assignments.error;
      const classIds = (assignments?.data ?? []).map(x => String(x.class_id)), subjectIds = (assignments?.data ?? []).map(x => String(x.subject_id));
      let cq = db.from("classes").select("id,name,level").eq("status", "ACTIVE").order("name"), sq = db.from("subjects").select("id,code,name").eq("status", "ACTIVE").order("name");
      if (teacher) { cq = cq.in("id", classIds.length ? classIds : ["00000000-0000-0000-0000-000000000000"]); sq = sq.in("id", subjectIds.length ? subjectIds : ["00000000-0000-0000-0000-000000000000"]); }
      const [c, s, r] = await Promise.all([cq, sq, db.from("learning_materials").select("id,title,description,material_type,resource_url,storage_path,class_id,subject_id,teacher_id,status,created_at,classes(name,level),subjects(name,code)").eq("status", "PUBLISHED").order("created_at", { ascending: false })]);
      if (c.error) throw c.error; if (s.error) throw s.error; if (r.error) throw r.error;
      setClasses(c.data ?? []); setSubjects(s.data ?? []); setRows(r.data ?? []);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Learning materials could not be loaded."); }
    finally { setLoading(false); }
  }, [profile, teacher, user]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => rows.filter(r => { const hay = `${text(r.title)} ${text(r.description)} ${text((r.subjects as Row | null)?.name)} ${text((r.classes as Row | null)?.name)}`.toLowerCase(); return hay.includes(query.toLowerCase().trim()) && (subjectFilter === "ALL" || text(r.subject_id) === subjectFilter); }), [rows, query, subjectFilter]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user || !canCreate) return;
    if (uploadMode === "file" && !file) { setMessage("Choose a file to upload."); return; }
    if (uploadMode === "link" && !form.resource_url.trim()) { setMessage("Enter a valid resource link."); return; }
    setBusy(true); setMessage(null);
    try {
      const db = getSupabase(); let teacherId: string | null = null;
      if (teacher) {
        const tr = await db.from("teachers").select("id").eq("profile_id", user.id).maybeSingle();
        if (tr.error) throw tr.error; if (!tr.data) throw new Error("Your teacher record is not linked yet.");
        teacherId = String(tr.data.id);
        const allowed = await db.from("teacher_assignments").select("id").eq("teacher_id", teacherId).eq("class_id", form.class_id).eq("subject_id", form.subject_id).maybeSingle();
        if (allowed.error) throw allowed.error; if (!allowed.data) throw new Error("You are not assigned to this class and subject.");
      }
      let resourceUrl: string | null = uploadMode === "link" ? form.resource_url.trim() : null, storagePath: string | null = null;
      if (file) {
        if (file.size > 50 * 1024 * 1024) throw new Error("Files must be 50 MB or smaller.");
        storagePath = `${user.id}/learning/${crypto.randomUUID()}-${cleanName(file.name)}`;
        const up = await db.storage.from("academic-resources").upload(storagePath, file, { upsert: false, contentType: file.type || undefined });
        if (up.error) throw up.error;
      }
      const r = await db.from("learning_materials").insert({ title: form.title.trim(), description: form.description.trim() || null, material_type: uploadMode === "file" ? form.material_type : "LINK", resource_url: resourceUrl, storage_path: storagePath, class_id: form.class_id || null, subject_id: form.subject_id || null, teacher_id: teacherId, status: "PUBLISHED" }).select("id").single();
      if (r.error) { if (storagePath) await db.storage.from("academic-resources").remove([storagePath]); throw r.error; }
      setForm({ title: "", description: "", material_type: "PDF", resource_url: "", class_id: "", subject_id: "" }); setFile(null); setShowCreate(false); setMessage("Learning material uploaded and published successfully."); await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Learning material could not be published."); }
    finally { setBusy(false); }
  };

  const openMaterial = async (row: Row) => {
    try {
      let url = text(row.resource_url);
      if (row.storage_path) { const signed = await getSupabase().storage.from("academic-resources").createSignedUrl(text(row.storage_path), 3600); if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("Could not create secure download link."); url = signed.data.signedUrl; }
      const parsed = new URL(url); if (!/^https?:$/.test(parsed.protocol)) throw new Error(); window.open(parsed.toString(), "_blank", "noopener,noreferrer");
    } catch { setMessage("This learning resource could not be opened."); }
  };

  if (!profile) return null;
  return <PortalLayout role={profile.role}><main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <header className="menwe-portal-hero overflow-hidden rounded-[2rem] p-6 text-white sm:p-8"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><span className="menwe-portal-kicker"><BookOpen size={14}/> Digital learning</span><h1 className="mt-4 font-serif text-4xl font-semibold sm:text-5xl">Learning Materials</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">A protected learning library for notes, videos, documents and trusted online resources.</p></div><div className="flex gap-2 text-xs font-semibold"><span className="rounded-full bg-white/10 px-3 py-2">{rows.length} resources</span><span className="rounded-full bg-white/10 px-3 py-2">{subjects.length} subjects</span></div></div></header>
    <section className="grid gap-3 sm:grid-cols-3"><div className="menwe-card rounded-2xl p-4"><p className="text-xs font-bold uppercase tracking-wider opacity-50">Resources</p><p className="mt-1 text-2xl font-semibold">{rows.length}</p></div><div className="menwe-card rounded-2xl p-4"><p className="text-xs font-bold uppercase tracking-wider opacity-50">Subjects</p><p className="mt-1 text-2xl font-semibold">{new Set(rows.map(r => text(r.subject_id)).filter(Boolean)).size}</p></div><div className="menwe-card rounded-2xl p-4"><p className="text-xs font-bold uppercase tracking-wider opacity-50">Formats</p><p className="mt-1 text-2xl font-semibold">{new Set(rows.map(r => text(r.material_type))).size}</p></div></section>
    {message && <div role="status" className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/8 px-4 py-3 text-sm font-medium"><span>{message}</span><button onClick={() => setMessage(null)} aria-label="Dismiss"><X size={17}/></button></div>}
    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><label className="relative flex-1"><Search className="absolute left-3 top-3.5 opacity-45" size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search materials, subjects or classes…" className={`${input} pl-10`}/></label><select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className={`${input} lg:w-56`}><option value="ALL">All subjects</option>{subjects.map(s => <option key={text(s.id)} value={text(s.id)}>{text(s.name)}</option>)}</select>{canCreate && <button onClick={() => setShowCreate(v => !v)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white"><Plus size={17}/>{showCreate ? "Close" : "Add material"}</button>}</div>
      {showCreate && canCreate && <form onSubmit={create} className="mt-5 grid gap-3 rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[.02] p-4 md:grid-cols-2"><div className="md:col-span-2 flex items-center gap-2"><Sparkles size={17} className="text-[var(--accent)]"/><h2 className="font-semibold">Publish learning material</h2></div><div className="md:col-span-2 grid grid-cols-2 gap-2 rounded-xl bg-[var(--ink)]/5 p-1"><button type="button" onClick={() => { setUploadMode("file"); setForm({ ...form, material_type: "PDF" }); }} className={`min-h-10 rounded-lg text-sm font-bold ${uploadMode === "file" ? "bg-white shadow-sm" : "opacity-60"}`}>Upload file</button><button type="button" onClick={() => setUploadMode("link")} className={`min-h-10 rounded-lg text-sm font-bold ${uploadMode === "link" ? "bg-white shadow-sm" : "opacity-60"}`}>Use web link</button></div><input required maxLength={160} placeholder="Title e.g. Fractions — Introduction" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={input}/>{uploadMode === "file" ? <select required value={form.material_type} onChange={e => setForm({ ...form, material_type: e.target.value })} className={input}><option value="PDF">PDF</option><option value="DOCUMENT">Document</option><option value="VIDEO">Video</option><option value="NOTES">Notes</option><option value="OTHER">Other</option></select> : <input required type="url" placeholder="https://…" value={form.resource_url} onChange={e => setForm({ ...form, resource_url: e.target.value })} className={input}/>} {uploadMode === "file" && <label className="md:col-span-2 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--ink)]/20 bg-white px-4 text-center"><Upload size={20} className="mb-2 opacity-50"/><span className="text-sm font-semibold">{file ? file.name : "Choose a file"}</span><span className="mt-1 text-xs opacity-50">PDF, Word, PowerPoint, images or video · max 50 MB</span><input type="file" className="sr-only" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp,.mp4,.webm" onChange={e => setFile(e.target.files?.[0] ?? null)}/></label>}<select value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })} className={input}><option value="">All eligible classes</option>{classes.map(c => <option key={text(c.id)} value={text(c.id)}>{text(c.name)} · {text(c.level)}</option>)}</select><select value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })} className={input}><option value="">General / all subjects</option>{subjects.map(s => <option key={text(s.id)} value={text(s.id)}>{text(s.name)} ({text(s.code)})</option>)}</select><textarea maxLength={1200} placeholder="Short learner guidance or description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={`${input} min-h-24 md:col-span-2`}/><button disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-white md:w-max disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin"/> : uploadMode === "file" ? <Upload size={16}/> : <Plus size={16}/>} {busy ? "Publishing…" : "Publish resource"}</button></form>}
      {loading ? <div className="grid min-h-48 place-items-center text-sm opacity-60"><Loader2 className="animate-spin" size={22}/></div> : filtered.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-[var(--ink)]/15 px-5 py-12 text-center"><BookOpen className="mx-auto opacity-30" size={34}/><h2 className="mt-3 font-semibold">No learning materials yet</h2><p className="mx-auto mt-1 max-w-md text-sm leading-6 opacity-55">{canCreate ? "Upload your first resource above. Files are stored securely and learners receive temporary download links." : "Your teachers and school administrators have not published learning resources for your account yet."}</p></div> : <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(r => { const Icon = typeIcon(text(r.material_type)); const subject = r.subjects as Row | null, cls = r.classes as Row | null; return <article key={text(r.id)} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-950"><div className="flex items-start justify-between gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#061229]/5 text-[#061229] dark:bg-white/8 dark:text-white"><Icon size={21}/></span><span className="rounded-full bg-[#D89B28]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#D89B28]">{text(r.material_type)}</span></div><h3 className="mt-4 text-lg font-semibold text-[#061229] dark:text-white">{text(r.title)}</h3>{r.description && <p className="mt-2 line-clamp-3 text-sm leading-6 opacity-60">{text(r.description)}</p>}<div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold"><span className="rounded-full border border-[var(--ink)]/10 px-2.5 py-1">{text(subject?.name, "General")}</span><span className="rounded-full border border-[var(--ink)]/10 px-2.5 py-1">{text(cls?.name, "All eligible classes")}</span></div><button onClick={() => void openMaterial(r)} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white transition hover:opacity-90"><ExternalLink size={16}/>Open learning resource</button></article>})}</div>}
    </section>
  </main></PortalLayout>;
}
