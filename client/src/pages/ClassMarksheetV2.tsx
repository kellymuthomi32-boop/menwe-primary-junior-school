import { FileText, Loader2, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import "../marksheet-print.css";

type Row = Record<string, any>;
type Subject = { id: string; code: string; name: string; status?: string };
type Band = "LOWER_PRIMARY" | "UPPER_PRIMARY" | "JUNIOR_SCHOOL";

type Achievement = { band: string; code: string; level: number; points: number; remark: string };

const str = (v: unknown) => v == null ? "" : String(v);
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const fmt = (v: number | null) => v == null ? "" : Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, "");
const learnerName = (s: Row) => [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");

/** KJSEA/CBE 8-level achievement mapping. The level is derived from percentage, never selected manually. */
function achievementForPercentage(value: number | null): Achievement | null {
  if (value == null || !Number.isFinite(value)) return null;
  const p = Math.max(0, Math.min(100, value));
  if (p >= 90) return { band: "Exceeding Expectations", code: "EE1", level: 8, points: 8, remark: "Exceptional" };
  if (p >= 75) return { band: "Exceeding Expectations", code: "EE2", level: 7, points: 7, remark: "Very Good" };
  if (p >= 58) return { band: "Meeting Expectations", code: "ME1", level: 6, points: 6, remark: "Good" };
  if (p >= 41) return { band: "Meeting Expectations", code: "ME2", level: 5, points: 5, remark: "Fair" };
  if (p >= 31) return { band: "Approaching Expectations", code: "AE1", level: 4, points: 4, remark: "Needs Improvement" };
  if (p >= 21) return { band: "Approaching Expectations", code: "AE2", level: 3, points: 3, remark: "Below Average" };
  if (p >= 11) return { band: "Below Expectations", code: "BE1", level: 2, points: 2, remark: "Well Below Average" };
  return { band: "Below Expectations", code: "BE2", level: 1, points: 1, remark: "Minimal" };
}

function getGrade(c?: Row) {
  const raw = `${str(c?.name)} ${str(c?.code)} ${str(c?.level)}`.toUpperCase();
  const match = raw.match(/(?:GRADE|CLASS|STD|STANDARD|G)\s*([1-9])\b/);
  return match ? Number(match[1]) : null;
}
function getBand(c?: Row): Band {
  const n = getGrade(c);
  if (n && n <= 3) return "LOWER_PRIMARY";
  if (n && n <= 6) return "UPPER_PRIMARY";
  const raw = `${str(c?.name)} ${str(c?.code)} ${str(c?.level)}`.toUpperCase();
  if (/LOWER|PRIMARY 1|PRIMARY 2|PRIMARY 3/.test(raw)) return "LOWER_PRIMARY";
  if (/UPPER|PRIMARY 4|PRIMARY 5|PRIMARY 6/.test(raw)) return "UPPER_PRIMARY";
  return "JUNIOR_SCHOOL";
}

const priority = (s: Subject) => {
  const order: Record<string, number> = { ENG: 10, KSW: 20, MAT: 30, SCI: 40, SSA: 40, SST: 50, AGR: 60, CAS: 70, PRE: 80, CRE: 90, IRE: 100, HRE: 110 };
  return order[str(s.code).toUpperCase()] ?? 1000;
};
const sortSubjects = (items: Subject[]) => [...items].sort((a, b) => priority(a) - priority(b) || str(a.name).localeCompare(str(b.name)));
const CAS_CODES = ["ART", "MUS", "PE"];
const isCasComponent = (s: Subject) => CAS_CODES.includes(str(s.code).toUpperCase());
const resultsFor = (row: Row, subjectId: string) => (row.results ?? []).filter((r: Row) => str(r.subject_id) === str(subjectId));

function latestPercentage(row: Row, subjectId: string) {
  const values = resultsFor(row, subjectId).map((r: Row) => {
    const score = num(r.score); const max = num(r.maximum_score);
    return score != null && max != null && max > 0 ? (score / max) * 100 : null;
  }).filter((v: number | null): v is number => v != null);
  return values.length ? values[values.length - 1] : null;
}

function latestRaw(row: Row, subjectId: string) {
  const values = resultsFor(row, subjectId).map((r: Row) => num(r.score)).filter((v: number | null): v is number => v != null);
  return values.length ? values[values.length - 1] : null;
}

function casComposite(row: Row, subjects: Subject[]) {
  const components = subjects.filter(isCasComponent);
  if (components.length < 3) return null;
  const values = components.map(s => latestPercentage(row, s.id));
  return values.every(v => v != null) ? values.reduce((a, b) => a + (b ?? 0), 0) / values.length : null;
}

export default function ClassMarksheetV2() {
  const { user, profile } = useSchoolAuth();
  const admin = ["SUPER_ADMIN", "ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI"].includes(profile?.role ?? "");
  const [years, setYears] = useState<Row[]>([]), [terms, setTerms] = useState<Row[]>([]), [classes, setClasses] = useState<Row[]>([]), [allSubjects, setAllSubjects] = useState<Subject[]>([]), [subjects, setSubjects] = useState<Subject[]>([]), [rows, setRows] = useState<Row[]>([]);
  const [yearId, setYearId] = useState(""), [termId, setTermId] = useState(""), [classId, setClassId] = useState(""), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [message, setMessage] = useState("");

  useEffect(() => { void (async () => {
    if (!user) return;
    try {
      const db = getSupabase();
      const [y, t, c, s] = await Promise.all([
        db.from("academic_years").select("id,name,is_current,status").eq("status", "ACTIVE").order("starts_on", { ascending: false }),
        db.from("terms").select("id,academic_year_id,name,is_current,status").eq("status", "ACTIVE").order("starts_on", { ascending: false }),
        db.from("classes").select("id,academic_year_id,code,name,level,status").eq("status", "ACTIVE").order("name"),
        db.from("subjects").select("id,code,name,status").eq("status", "ACTIVE")
      ]);
      for (const q of [y, t, c, s]) if (q.error) throw q.error;
      setYears(y.data ?? []); setTerms(t.data ?? []); setClasses(c.data ?? []); setAllSubjects((s.data ?? []) as Subject[]);
      setYearId(str(y.data?.find(x => x.is_current)?.id ?? y.data?.[0]?.id ?? ""));
    } catch (e) { setMessage(e instanceof Error ? e.message : "Marksheet setup could not be loaded."); }
    finally { setLoading(false); }
  })(); }, [user]);

  const visibleTerms = useMemo(() => terms.filter(t => !yearId || str(t.academic_year_id) === yearId), [terms, yearId]);
  const visibleClasses = useMemo(() => classes.filter(c => !yearId || str(c.academic_year_id) === yearId), [classes, yearId]);
  const selectedClass = classes.find(c => str(c.id) === classId);
  const selectedTerm = terms.find(t => str(t.id) === termId);
  const band = getBand(selectedClass);
  const grade = getGrade(selectedClass);
  const bandTitle = band === "LOWER_PRIMARY" ? "LOWER PRIMARY CBC ASSESSMENT MARKSHEET" : band === "UPPER_PRIMARY" ? "UPPER PRIMARY CBC ASSESSMENT MARKSHEET" : "JUNIOR SCHOOL PERFORMANCE MARKSHEET";

  const loadSubjectsForClass = async (selectedClassId: string) => {
    try {
      const mapping = await getSupabase().from("class_subjects").select("subject_id").eq("class_id", selectedClassId);
      if (mapping.error) throw mapping.error;
      const ids = [...new Set((mapping.data ?? []).map(x => str(x.subject_id)))];
      setSubjects(sortSubjects(ids.length ? allSubjects.filter(s => ids.includes(str(s.id))) : allSubjects));
    } catch { setSubjects(sortSubjects(allSubjects)); }
  };

  useEffect(() => { setSubjects([]); setRows([]); setMessage(""); if (classId && allSubjects.length) void loadSubjectsForClass(classId); }, [classId, allSubjects]);

  const generate = async () => {
    if (!classId || !yearId || !termId) { setMessage("Select academic year, term and class first."); return; }
    setBusy(true); setMessage("");
    try {
      const db = getSupabase();
      if (!admin) {
        const tr = await db.from("teachers").select("id").eq("profile_id", user?.id ?? "").maybeSingle();
        if (tr.error) throw tr.error;
        if (!tr.data) throw new Error("Your teacher record is not linked yet.");
        const ta = await db.from("teacher_assignments").select("class_id").eq("teacher_id", tr.data.id).eq("class_id", classId);
        if (ta.error) throw ta.error;
        if (!(ta.data ?? []).length) throw new Error("You are not assigned to this class.");
      }
      const mapping = await db.from("class_subjects").select("subject_id").eq("class_id", classId);
      if (mapping.error) throw mapping.error;
      const ids = [...new Set((mapping.data ?? []).map(x => str(x.subject_id)))];
      const selectedSubjects = sortSubjects(ids.length ? allSubjects.filter(s => ids.includes(str(s.id))) : subjects);
      setSubjects(selectedSubjects);
      const en = await db.from("enrollments").select("student_id").eq("class_id", classId).eq("academic_year_id", yearId).eq("status", "ACTIVE");
      if (en.error) throw en.error;
      let enrollmentRows = en.data ?? [];
      if (!enrollmentRows.length) {
        const fallback = await db.from("enrollments").select("student_id").eq("class_id", classId).eq("status", "ACTIVE");
        if (fallback.error) throw fallback.error;
        enrollmentRows = fallback.data ?? [];
      }
      const studentIds = [...new Set(enrollmentRows.map(x => str(x.student_id)))];
      if (!studentIds.length) { setRows([]); setMessage("No active learners are enrolled in this class."); return; }
      const subjectIds = selectedSubjects.map(s => str(s.id)).filter(Boolean);
      const [st, rr] = await Promise.all([
        db.from("students").select("id,admission_number,first_name,middle_name,last_name,gender").in("id", studentIds).order("first_name").order("last_name"),
        subjectIds.length ? db.from("exam_results").select("student_id,subject_id,score,maximum_score,grade,subjects(id,code,name),exams!inner(id,term_id,class_id,name,exam_type)").eq("exams.term_id", termId).eq("exams.class_id", classId).in("student_id", studentIds).in("subject_id", subjectIds) : Promise.resolve({ data: [], error: null } as any)
      ]);
      if (st.error) throw st.error; if (rr.error) throw rr.error;
      const results = rr.data ?? [];
      setRows((st.data ?? []).map((s: Row) => ({ ...s, results: results.filter((r: Row) => str(r.student_id) === str(s.id)) })));
      if (!results.length) setMessage("Learners loaded. No persisted assessment results exist for this class and term yet.");
    } catch (e) { setRows([]); setMessage(e instanceof Error ? e.message : "The marksheet could not be generated."); }
    finally { setBusy(false); }
  };

  const displaySubjects = useMemo(() => band === "UPPER_PRIMARY" ? subjects.filter(s => !isCasComponent(s)) : subjects, [subjects, band]);
  const levelFor = (row: Row, subject: Subject) => {
    const pct = str(subject.code).toUpperCase() === "CAS" ? casComposite(row, subjects) : latestPercentage(row, subject.id);
    return achievementForPercentage(pct);
  };
  const markFor = (row: Row, subject: Subject) => {
    if (str(subject.code).toUpperCase() === "CAS") { const p = casComposite(row, subjects); return p == null ? "" : fmt(p) + "%"; }
    const raw = latestRaw(row, subject.id); const result = resultsFor(row, subject.id).slice(-1)[0]; const max = num(result?.maximum_score);
    return raw == null ? "" : max && max > 0 ? `${fmt(raw)}/${fmt(max)}` : fmt(raw);
  };
  const learnerAverage = (row: Row) => {
    const levels = displaySubjects.map(s => str(s.code).toUpperCase() === "CAS" ? casComposite(row, subjects) : latestPercentage(row, s.id)).filter((v): v is number => v != null);
    return levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : null;
  };
  const subjectSummary = (subject: Subject) => {
    const values = rows.map(r => str(subject.code).toUpperCase() === "CAS" ? casComposite(r, subjects) : latestPercentage(r, subject.id)).filter((v): v is number => v != null);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };
  const overallAverage = rows.length ? (() => { const v = rows.map(learnerAverage).filter((x): x is number => x != null); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; })() : null;
  const overallAchievement = achievementForPercentage(overallAverage);

  if (loading) return <PortalLayout role={profile?.role ?? "TEACHER"}><main className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin" /></main></PortalLayout>;

  return <PortalLayout role={profile?.role ?? "TEACHER"}>
    <main className="mx-auto w-full max-w-[1800px] space-y-5 px-3 py-4 sm:px-6 lg:px-8">
      <section className="rounded-[1.5rem] border border-[var(--ink)]/10 bg-white shadow-sm print-hide">
        <div className="bg-[var(--ink)] px-5 py-6 text-white sm:px-7"><span className="text-xs font-black uppercase tracking-[.16em] text-[var(--gold)]">Class marksheet</span><h1 className="mt-2 font-serif text-3xl font-semibold">CBC assessment marksheet</h1><p className="mt-2 max-w-3xl text-sm text-white/65">Marks, achievement levels and points are calculated automatically from each learner's percentage.</p></div>
        <div className="grid gap-3 p-5 md:grid-cols-3"><label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink)]/60">Academic year<select value={yearId} onChange={e=>{setYearId(e.target.value);setTermId("");setClassId("");setRows([])}} className="min-h-11 rounded-xl border border-[var(--ink)]/15 bg-white px-3 text-sm font-semibold normal-case"><option value="">Select year</option>{years.map(y=><option key={str(y.id)} value={str(y.id)}>{str(y.name)}</option>)}</select></label><label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink)]/60">Term<select value={termId} onChange={e=>{setTermId(e.target.value);setRows([])}} className="min-h-11 rounded-xl border border-[var(--ink)]/15 bg-white px-3 text-sm font-semibold normal-case"><option value="">Select term</option>{visibleTerms.map(t=><option key={str(t.id)} value={str(t.id)}>{str(t.name)}</option>)}</select></label><label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink)]/60">Class<select value={classId} onChange={e=>{setClassId(e.target.value);setRows([])}} className="min-h-11 rounded-xl border border-[var(--ink)]/15 bg-white px-3 text-sm font-semibold normal-case"><option value="">Select class</option>{visibleClasses.map(c=><option key={str(c.id)} value={str(c.id)}>{str(c.name)}</option>)}</select></label></div>
        <div className="flex flex-wrap gap-3 px-5 pb-5 sm:px-7"><button type="button" onClick={()=>void generate()} disabled={busy||!classId||!termId} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--ink)] px-5 text-sm font-bold text-white disabled:opacity-50">{busy?<Loader2 size={16} className="animate-spin"/>:<FileText size={16}/>} {busy?"Generating…":"Generate marksheet"}</button><button type="button" onClick={()=>window.print()} disabled={!rows.length} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--ink)]/15 bg-white px-5 text-sm font-bold disabled:opacity-40"><Printer size={16}/> Print / Save PDF</button></div>
        {message&&<p role="status" className="mx-5 mb-5 rounded-xl bg-[var(--gold)]/10 px-4 py-3 text-sm font-semibold sm:mx-7">{message}</p>}
      </section>

      {classId&&<section className="marksheet-v2 overflow-hidden rounded-none bg-white shadow-sm">
        <header className="marksheet-header border-b border-[#D89B28]/40 bg-[var(--ink)] px-5 py-5 text-white sm:px-7"><h2 className="text-2xl font-black uppercase">MENWE PRIMARY SCHOOL</h2><p className="text-xs font-semibold text-white/75">P.O. BOX 19, KIONYO, MERU | menwejuniorss23@gmail.com</p><h3 className="mt-2 text-base font-black uppercase">{bandTitle} — {str(selectedClass?.name) || "CLASS"} · {str(selectedTerm?.name) || "TERM"} · {str(years.find(y=>str(y.id)===yearId)?.name) || "YEAR"}</h3><p className="mt-1 text-[10px] font-semibold text-white/65">Achievement levels are derived automatically from percentage performance.</p></header>
        {!displaySubjects.length?<div className="p-8 text-center text-sm font-semibold">No subjects are configured for this class.</div>:<div className="marksheet-table-wrap overflow-x-auto p-2 sm:p-4"><table className="marksheet-table w-full min-w-[980px] border-collapse text-[10px]"><thead><tr><th rowSpan={2}>No.</th><th rowSpan={2}>Assessment No.</th><th rowSpan={2} className="name-column">Learner</th>{displaySubjects.map(s=><th key={s.id} colSpan={2}><span className="subject-code">{str(s.code)||"—"}</span><span className="subject-name">{str(s.name)}</span></th>)}<th rowSpan={2}>MEAN %</th><th rowSpan={2}>LEVEL</th><th rowSpan={2}>PTS</th></tr><tr>{displaySubjects.map(s=><span key={s.id} className="contents"><th>MARK</th><th>LEVEL</th></span>)}</tr></thead><tbody>{rows.map((row,i)=>{const avg=learnerAverage(row),achievement=achievementForPercentage(avg);return <tr key={str(row.id)}><td>{i+1}</td><td>{str(row.admission_number)||"—"}</td><td className="name-cell">{learnerName(row)}</td>{displaySubjects.map(s=>{const a=levelFor(row,s);return <td key={`${row.id}-${s.id}-mark`} className="mark-cell">{markFor(row,s)} </td>}).flatMap((_,idx)=>{const s=displaySubjects[idx];const a=levelFor(row,s);return [<td key={`${row.id}-${s.id}-level`} className="level-cell">{a?.code||"—"}</td>];})}<td className="mean-cell">{avg==null?"":`${fmt(avg)}%`}</td><td className="level-cell">{achievement?.code||"—"}</td><td className="points-cell">{achievement?.points??"—"}</td></tr>})}</tbody><tfoot><tr className="marksheet-summary-row"><td colSpan={3}>CLASS MEAN</td>{displaySubjects.map(s=><td colSpan={2} key={`mean-${s.id}`}>{subjectSummary(s)==null?"":`${fmt(subjectSummary(s))}%`}</td>)}<td>{overallAverage==null?"":`${fmt(overallAverage)}%`}</td><td>{overallAchievement?.code||"—"}</td><td>{overallAchievement?.points??"—"}</td></tr></tfoot></table></div>}
        <div className="level-legend border-t border-[var(--ink)]/10 px-4 py-3 sm:px-6"><strong>Achievement scale:</strong> EE1 90–100% (8) · EE2 75–89% (7) · ME1 58–74% (6) · ME2 41–57% (5) · AE1 31–40% (4) · AE2 21–30% (3) · BE1 11–20% (2) · BE2 0–10% (1).</div>
      </section>}
    </main>
  </PortalLayout>;
}
