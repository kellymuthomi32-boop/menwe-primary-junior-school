import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2, Plus, RefreshCw, Search, Upload, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { isAdministrator, useSchoolAuth, type AppRole } from "@/contexts/SupabaseAuthContext";

const RESOURCE_TYPES = [
  ["SCHEME_OF_WORK", "Scheme of Work"], ["LESSON_PLAN", "Lesson Plan"], ["RECORD_BOOK", "Record Book"],
  ["TEACHER_NOTES", "Teacher Notes"], ["LEARNER_NOTES", "Learner Notes"], ["REVISION_MATERIAL", "Revision Material"],
  ["PAST_PAPER", "Past Paper"], ["ASSIGNMENT", "Assignment"], ["TEACHER_GUIDE", "Teacher Guide"],
  ["CURRICULUM_DESIGN", "Curriculum Design"], ["ANSWER_BOOK", "Answer Book"], ["OTHER", "Other"],
] as const;

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "jpg", "jpeg", "png"];

function typeLabel(value: string) {
  return RESOURCE_TYPES.find(([key]) => key === value)?.[1] ?? value.replaceAll("_", " ");
}

function formatSize(size?: number | null) {
  if (!size) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TeacherResourcesPage() {
  const { profile, user } = useSchoolAuth();
  const admin = isAdministrator(profile?.role as AppRole);
  const teacher = profile?.role === "TEACHER";
  const canUpload = teacher;
  const [resources, setResources] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [audienceFilter, setAudienceFilter] = useState("ALL");
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState("SCHEME_OF_WORK");
  const [audience, setAudience] = useState("TEACHERS");
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true); setError("");
    const s = getSupabase();
    const [r, sub, cls] = await Promise.all([
      s.from("school_resources").select("*,subject:subjects(name,code),class:classes(name),teacher:teachers(first_name,last_name)").eq("status", "PUBLISHED").order("created_at", { ascending: false }),
      s.from("subjects").select("id,name,code").order("name"),
      s.from("classes").select("id,name,level").eq("status", "ACTIVE").order("name"),
    ]);
    const firstError = r.error || sub.error || cls.error;
    if (firstError) setError(firstError.message);
    setResources(r.data || []); setSubjects(sub.data || []); setClasses(cls.data || []); setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => resources.filter(r => {
    const hay = `${r.title} ${r.description || ""} ${r.subject?.name || ""} ${r.class?.name || ""}`.toLowerCase();
    return (!query || hay.includes(query.toLowerCase())) && (typeFilter === "ALL" || r.resource_type === typeFilter) && (audienceFilter === "ALL" || r.audience === audienceFilter);
  }), [resources, query, typeFilter, audienceFilter]);

  const upload = async () => {
    if (!canUpload || !user || !title.trim() || !file) return;
    setBusy(true); setError("");
    try {
      if (file.size > MAX_FILE_SIZE) throw new Error("File is too large. Maximum upload size is 15 MB.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!ALLOWED_EXTENSIONS.includes(ext)) throw new Error(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}.`);
      const s = getSupabase();
      const { data: teacherRow, error: teacherError } = await s.from("teachers").select("id").eq("profile_id", user.id).eq("status", "ACTIVE").maybeSingle();
      if (teacherError || !teacherRow) throw new Error(teacherError?.message || "Your active teacher record could not be found.");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${teacherRow.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: storageError } = await s.storage.from("school-resources").upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (storageError) throw storageError;
      const { error: rowError } = await s.from("school_resources").insert({ title: title.trim(), description: description.trim() || null, resource_type: resourceType, audience, subject_id: subjectId || null, class_id: classId || null, uploaded_by_teacher_id: teacherRow.id, file_path: path, original_file_name: file.name, mime_type: file.type || null, file_size: file.size, status: "PUBLISHED" });
      if (rowError) { await s.storage.from("school-resources").remove([path]); throw rowError; }
      setTitle(""); setDescription(""); setFile(null); setSubjectId(""); setClassId(""); setShowUpload(false); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); }
    finally { setBusy(false); }
  };

  const download = async (resource: any) => {
    setError("");
    const { data, error: e } = await getSupabase().storage.from("school-resources").createSignedUrl(resource.file_path, 300);
    if (e || !data?.signedUrl) { setError(e?.message || "Could not prepare the download."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (loading) return <main className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin" /></main>;

  return <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
    <header className="rounded-3xl bg-[#061229] p-6 text-white shadow-sm md:p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D89B28]">Academic Resources</p><h1 className="mt-2 text-3xl font-black">Teacher & Learner Resource Hub</h1><p className="mt-2 max-w-3xl text-sm text-slate-300">Store, share and download schemes of work, lesson plans, record books, notes, revision materials, curriculum designs and other approved school resources.</p></div>
        <div className="flex gap-2"><button onClick={() => void load()} className="rounded-xl border border-white/20 bg-white/10 p-3" title="Refresh"><RefreshCw size={18} /></button>{canUpload && <button onClick={() => setShowUpload(true)} className="rounded-xl bg-[#D89B28] px-4 py-3 font-bold text-[#061229]"><Upload size={17} className="mr-2 inline" />Upload resource</button>}</div>
      </div>
    </header>

    {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

    <section className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_180px]">
      <label className="flex items-center gap-2 rounded-xl border bg-white px-3"><Search size={17} className="text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search resources, subjects or classes…" className="w-full bg-transparent p-3 outline-none" /></label>
      <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-xl border bg-white p-3"><option value="ALL">All resource types</option>{RESOURCE_TYPES.map(([k,l]) => <option key={k} value={k}>{l}</option>)}</select>
      <select value={audienceFilter} onChange={e => setAudienceFilter(e.target.value)} className="rounded-xl border bg-white p-3"><option value="ALL">All audiences</option><option value="TEACHERS">Teachers</option><option value="LEARNERS">Learners</option><option value="BOTH">Teachers & learners</option></select>
    </section>

    <section className="mt-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-500">Resources</p><p className="mt-1 text-3xl font-black text-[#061229]">{resources.length}</p></div><div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-500">Showing</p><p className="mt-1 text-3xl font-black text-[#061229]">{filtered.length}</p></div><div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-500">Upload access</p><p className="mt-2 font-bold">{canUpload ? "Teacher enabled" : admin ? "Administrator" : "Download only"}</p></div></section>

    <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(r => <article key={r.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-slate-100 p-3"><FileText size={21} /></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold">{r.audience === "BOTH" ? "Teachers + learners" : r.audience === "TEACHERS" ? "Teachers" : "Learners"}</span></div><h2 className="mt-4 font-black text-[#061229]">{r.title}</h2><p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#D89B28]">{typeLabel(r.resource_type)}</p><p className="mt-2 line-clamp-2 text-sm text-slate-600">{r.description || r.original_file_name}</p><div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">{r.subject?.name && <span className="rounded-lg bg-slate-50 px-2 py-1">{r.subject.name}</span>}{r.class?.name && <span className="rounded-lg bg-slate-50 px-2 py-1">{r.class.name}</span>}<span className="rounded-lg bg-slate-50 px-2 py-1">{formatSize(r.file_size)}</span></div><div className="mt-4 flex items-center justify-between border-t pt-3"><span className="text-xs text-slate-500">{r.teacher ? `Uploaded by ${r.teacher.first_name} ${r.teacher.last_name}` : "School resource"}</span><button onClick={() => void download(r)} className="rounded-lg bg-[#061229] px-3 py-2 text-xs font-bold text-white"><Download size={14} className="mr-1 inline" />Download</button></div></article>)}{!filtered.length && <div className="rounded-2xl border bg-white p-10 text-center text-slate-500 md:col-span-2 xl:col-span-3">No resources match your search.</div>}</section>

    {showUpload && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#D89B28]">Teacher upload</p><h2 className="text-2xl font-black text-[#061229]">Add academic resource</h2></div><button onClick={() => setShowUpload(false)} className="rounded-xl border p-2"><X size={18} /></button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="md:col-span-2"><span className="text-sm font-bold">Title</span><input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border p-3" placeholder="e.g. Grade 6 Mathematics Term 1 Scheme" /></label><label className="md:col-span-2"><span className="text-sm font-bold">Description</span><textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 min-h-24 w-full rounded-xl border p-3" placeholder="Briefly describe what the resource contains…" /></label><label><span className="text-sm font-bold">Resource type</span><select value={resourceType} onChange={e => setResourceType(e.target.value)} className="mt-1 w-full rounded-xl border p-3">{RESOURCE_TYPES.map(([k,l]) => <option key={k} value={k}>{l}</option>)}</select></label><label><span className="text-sm font-bold">Who can access it?</span><select value={audience} onChange={e => setAudience(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="TEACHERS">Teachers</option><option value="LEARNERS">Learners</option><option value="BOTH">Teachers & learners</option></select></label><label><span className="text-sm font-bold">Subject (optional)</span><select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="">All / not specified</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>)}</select></label><label><span className="text-sm font-bold">Class (optional)</span><select value={classId} onChange={e => setClassId(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="">All / not specified</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="md:col-span-2"><span className="text-sm font-bold">File</span><input type="file" accept={ALLOWED_EXTENSIONS.map(x => `.${x}`).join(",")} onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1 w-full rounded-xl border p-3" />{file && <p className="mt-1 text-xs text-slate-500">{file.name} · {formatSize(file.size)} · Maximum 15 MB</p>}</label></div><div className="mt-6 flex justify-end gap-2"><button onClick={() => setShowUpload(false)} className="rounded-xl border px-4 py-3 font-bold">Cancel</button><button disabled={busy || !title.trim() || !file} onClick={() => void upload()} className="rounded-xl bg-[#061229] px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? <><Loader2 size={16} className="mr-2 inline animate-spin" />Uploading…</> : <><Upload size={16} className="mr-2 inline" />Upload</>}</button></div></div></div>}
  </main>;
}
