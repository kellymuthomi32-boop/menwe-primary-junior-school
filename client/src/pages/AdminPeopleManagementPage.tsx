import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Search, UserRound, Users } from "lucide-react";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";

type Row = Record<string, unknown>;
const PAGE_SIZE = 20;
const text = (v: unknown, fallback = "—") => v == null || v === "" ? fallback : String(v);
const field = (row: Row, names: string[]) => names.map(name => row[name]).find(v => v != null && v !== "") ?? null;

function Pager({ page, total, onChange }: { page: number; total: number; onChange: (next: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages < 2) return null;
  return <div className="mt-5 flex items-center justify-between gap-3 text-sm text-[var(--ink)]/60"><button disabled={page === 0} onClick={() => onChange(page - 1)} className="rounded-xl border border-[var(--ink)]/15 px-4 py-2 font-semibold disabled:opacity-40">Previous</button><span>Page {page + 1} of {pages}</span><button disabled={page + 1 >= pages} onClick={() => onChange(page + 1)} className="rounded-xl border border-[var(--ink)]/15 px-4 py-2 font-semibold disabled:opacity-40">Next</button></div>;
}

export default function AdminPeopleManagementPage() {
  const { user, profile, loading: authLoading } = useSchoolAuth();
  const [, navigate] = useLocation();
  const [students, setStudents] = useState<Row[]>([]);
  const [admissions, setAdmissions] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("ALL");
  const [admissionStatus, setAdmissionStatus] = useState("ALL");
  const [tab, setTab] = useState<"learners" | "admissions">("learners");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !profile || !isAdministrator(profile.role)) return;
    setLoading(true); setMessage(null);
    try {
      const db = getSupabase();
      const [studentsResult, admissionsResult] = await Promise.all([
        db.from("students").select("*").order("created_at", { ascending: false }),
        db.from("admissions").select("*").order("created_at", { ascending: false }),
      ]);
      if (studentsResult.error) throw studentsResult.error;
      if (admissionsResult.error) throw admissionsResult.error;
      setStudents((studentsResult.data ?? []) as Row[]);
      setAdmissions((admissionsResult.data ?? []) as Row[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "People records could not be loaded.");
    } finally { setLoading(false); }
  }, [profile, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile) { navigate("/portal/login"); return; }
    if (!isAdministrator(profile.role)) { navigate("/portal/parent"); return; }
    void load();
  }, [authLoading, load, navigate, profile, user]);

  useEffect(() => { setPage(0); }, [query, grade, admissionStatus, tab]);

  const learnerGrades = useMemo(() => {
    const values = students.map(row => text(field(row, ["grade", "grade_level", "level"]), "")).filter(Boolean);
    return ["ALL", ...Array.from(new Set(values)).sort()];
  }, [students]);
  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students.filter(row => {
      const rowGrade = text(field(row, ["grade", "grade_level", "level"]), "");
      const haystack = Object.values(row).map(v => text(v, "")).join(" ").toLowerCase();
      return (!needle || haystack.includes(needle)) && (grade === "ALL" || rowGrade === grade);
    });
  }, [grade, query, students]);
  const filteredAdmissions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return admissions.filter(row => {
      const haystack = Object.values(row).map(v => text(v, "")).join(" ").toLowerCase();
      const rowStatus = text(row.status, "").toLowerCase();
      const rowGrade = text(field(row, ["grade_applied", "grade", "grade_level"]), "");
      return (!needle || haystack.includes(needle)) && (admissionStatus === "ALL" || rowStatus === admissionStatus.toLowerCase()) && (grade === "ALL" || rowGrade === grade);
    });
  }, [admissionStatus, admissions, grade, query]);
  const rows = tab === "learners" ? filteredStudents : filteredAdmissions;
  const paged = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const updateAdmission = async (id: string, status: string) => {
    const previous = admissions;
    setAdmissions(current => current.map(row => String(row.id) === id ? { ...row, status } : row));
    try {
      const { error } = await getSupabase().from("admissions").update({ status }).eq("id", id);
      if (error) throw error;
      setMessage(`Application ${status.replaceAll("_", " ")} and saved.`);
    } catch (error) {
      setAdmissions(previous);
      setMessage(error instanceof Error ? error.message : "Application status could not be updated.");
    }
  };

  if (authLoading || loading) return <main className="mx-auto grid min-h-[60vh] place-items-center p-8"><div className="flex items-center gap-3 text-sm text-[var(--ink)]/60"><Loader2 className="animate-spin text-[var(--accent)]" size={18} />Loading people & enrolment…</div></main>;

  return <main className="mx-auto w-full max-w-[1440px] min-w-0 space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <header className="rounded-[2rem] bg-[var(--ink)] p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><span className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-[var(--gold)]"><Users size={14}/> Administration</span><h1 className="mt-4 font-serif text-4xl font-semibold sm:text-5xl">People & enrolment</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">A dedicated workspace for the live learner directory and the admissions pipeline. Search and review records without leaving the command center.</p></div><div className="grid grid-cols-2 gap-2 text-center sm:min-w-[280px]"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-2xl font-black">{students.length}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.14em] text-white/45">Learners</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-2xl font-black">{admissions.filter(row => ["pending", "under_review"].includes(text(row.status, "").toLowerCase())).length}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.14em] text-white/45">To review</p></div></div></div></header>
    {message && <div role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="flex flex-wrap gap-2"><button onClick={() => setTab("learners")} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === "learners" ? "bg-[var(--ink)] text-white" : "border border-[var(--ink)]/15"}`}>Learner directory</button><button onClick={() => setTab("admissions")} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === "admissions" ? "bg-[var(--ink)] text-white" : "border border-[var(--ink)]/15"}`}>Admissions</button></div><div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]"><label className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--ink)]/15 bg-white px-3"><Search size={17} className="text-[var(--accent)]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, UPI, admission number, phone…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"/></label><select value={grade} onChange={e => setGrade(e.target.value)} className="min-h-12 rounded-xl border border-[var(--ink)]/15 bg-white px-3 text-sm font-semibold"><option value="ALL">All grades</option>{learnerGrades.slice(1).map(item => <option key={item} value={item}>{item}</option>)}</select>{tab === "admissions" && <select value={admissionStatus} onChange={e => setAdmissionStatus(e.target.value)} className="min-h-12 rounded-xl border border-[var(--ink)]/15 bg-white px-3 text-sm font-semibold"><option value="ALL">All statuses</option><option value="pending">Pending</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>}</div></section>
    <section className="menwe-card overflow-hidden rounded-[1.75rem] p-5 sm:p-7">{paged.length === 0 ? <div className="py-14 text-center text-sm text-[var(--ink)]/55">No matching records found.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead><tr className="border-b border-[var(--ink)]/10 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/45">{tab === "learners" ? <><th className="px-3 py-3">Learner</th><th className="px-3 py-3">Admission / UPI</th><th className="px-3 py-3">Grade</th><th className="px-3 py-3">Details</th><th className="px-3 py-3">View</th></> : <><th className="px-3 py-3">Application</th><th className="px-3 py-3">Parent</th><th className="px-3 py-3">Grade</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Review</th></>}</tr></thead><tbody>{paged.map(row => { const name = text(field(row, ["name", "student_name", "learner_full_name", "full_name"])); const admission = text(field(row, ["admission_number", "admission_no", "reference_code", "reference"])); const upi = text(field(row, ["upi_number", "upi"])); const rowGrade = text(field(row, ["grade", "grade_level", "grade_applied", "level"])); return <tr key={text(row.id)} className="border-b border-[var(--ink)]/7 last:border-0"><td className="px-3 py-3 font-semibold">{name}</td><td className="px-3 py-3">{admission} <span className="text-[var(--ink)]/45">· {upi}</span></td><td className="px-3 py-3">{rowGrade}</td>{tab === "learners" ? <><td className="px-3 py-3">{text(field(row, ["stream", "class_name", "gender", "status"]))}</td><td className="px-3 py-3"><button onClick={() => setSelected(row)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--ink)]/15 px-2.5 py-1.5 text-xs font-bold"><Eye size={13}/>View</button></td></> : <><td className="px-3 py-3">{text(field(row, ["parent_full_name", "parent_name", "guardian_name"]))}</td><td className="px-3 py-3"><span className="rounded-full bg-[var(--gold)]/10 px-2.5 py-1 text-xs font-bold">{text(row.status)}</span></td><td className="px-3 py-3"><select value={text(row.status, "pending").toLowerCase()} onChange={e => void updateAdmission(text(row.id), e.target.value)} className="rounded-lg border border-[var(--ink)]/15 bg-white px-2 py-1.5 text-xs font-semibold"><option value="pending">Pending</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></td></>}</tr>; })}</tbody></table></div>}<Pager page={page} total={rows.length} onChange={setPage}/></section>
    {selected && <div className="fixed inset-0 z-50 bg-[var(--ink)]/55 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}><aside className="ml-auto h-full w-full max-w-lg overflow-y-auto rounded-[1.75rem] bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--ink)]/5 text-[var(--ink)]"><UserRound size={22}/></span><h2 className="mt-4 font-serif text-2xl font-semibold">Learner record</h2></div><button onClick={() => setSelected(null)} className="rounded-xl border px-3 py-2 text-sm font-bold">Close</button></div><dl className="mt-6 divide-y divide-[var(--ink)]/10">{Object.entries(selected).filter(([, value]) => value != null && typeof value !== "object").map(([key, value]) => <div key={key} className="grid grid-cols-[.8fr_1.2fr] gap-4 py-3 text-sm"><dt className="font-semibold text-[var(--ink)]/50">{key.replaceAll("_", " ")}</dt><dd className="break-words font-medium text-[var(--ink)]">{String(value)}</dd></div>)}</dl></aside></div>}
  </main>;
}
