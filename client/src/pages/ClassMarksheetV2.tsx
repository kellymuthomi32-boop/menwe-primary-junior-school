import { FileText, Loader2, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import "../marksheet-print.css";

type Row = Record<string, any>;
type Subject = { id: string; code: string; name: string; status?: string };
type Band = "LOWER_PRIMARY" | "UPPER_PRIMARY" | "JUNIOR_SCHOOL";
type Achievement = { code: string; points: number };
type ReportSubject = Subject & { synthetic?: boolean; componentIds?: string[] };

const str = (v: unknown) => v == null ? "" : String(v);
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const fmt = (v: number | null) => v == null ? "" : Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, "");
const learnerName = (s: Row) => [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");

function achievementForPercentage(value: number | null): Achievement | null {
  if (value == null || !Number.isFinite(value)) return null;
  const p = Math.max(0, Math.min(100, value));
  if (p >= 90) return { code: "EE1", points: 8 };
  if (p >= 75) return { code: "EE2", points: 7 };
  if (p >= 58) return { code: "ME1", points: 6 };
  if (p >= 41) return { code: "ME2", points: 5 };
  if (p >= 31) return { code: "AE1", points: 4 };
  if (p >= 21) return { code: "AE2", points: 3 };
  if (p >= 11) return { code: "BE1", points: 2 };
  return { code: "BE2", points: 1 };
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

const normalized = (s: Subject) => `${str(s.code)} ${str(s.name)}`.toUpperCase().replace(/[^A-Z0-9]+/g, " ");
const matches = (s: Subject, patterns: RegExp[]) => patterns.some(p => p.test(normalized(s)));
const subjectCode = (s: Subject) => {
  if (matches(s, [/ENGLISH/, /^ENG\b/])) return "ENG";
  if (matches(s, [/KISWAHILI/, /^KIS\b/, /^KSW\b/])) return "KIS";
  if (matches(s, [/MATHEMATICS/, /^MATH?\b/, /^MAT\b/])) return "MATH";
  if (matches(s, [/INTEGRATED SCIENCE/, /SCIENCE TECHNOLOGY/, /^SCI\b/])) return "INT SCI";
  if (matches(s, [/SOCIAL STUDIES/, /^SST\b/])) return "SST";
  if (matches(s, [/CREATIVE ARTS.*SPORT/, /^CAS\b/])) return "CAS";
  if (matches(s, [/AGRICULTURE.*NUTRITION/, /AGRICULTURE/, /^AGR\b/])) return "AGR NUT";
  if (matches(s, [/RELIGIOUS EDUCATION/, /ISLAMIC RELIGIOUS/, /CHRISTIAN RELIGIOUS/, /^RE\b/, /^IRE\b/, /^CRE\b/])) return "RE";
  if (matches(s, [/PRE TECHNICAL/, /PRE TECH/, /^PRE\b/])) return "PRE TECH";
  if (matches(s, [/HOME SCIENCE/, /^HSC\b/])) return "HSC";
  if (matches(s, [/INFORMATION.*COMMUNICATION TECHNOLOGY/, /^ICT\b/])) return "ICT";
  if (matches(s, [/MUSIC/, /^MUS\b/])) return "MUS";
  if (matches(s, [/PHYSICAL EDUCATION/, /^PE\b/])) return "PE";
  if (matches(s, [/CREATIVE ARTS/, /^ART\b/])) return "ART";
  return str(s.code).trim().toUpperCase().slice(0, 8) || "SUBJ";
};

const priority = (code: string) => ({ ENG: 10, KIS: 20, MATH: 30, "INT SCI": 40, SST: 50, CAS: 60, "AGR NUT": 70, RE: 80, "PRE TECH": 90, HSC: 100, ICT: 110, ART: 120, MUS: 130, PE: 140 }[code] ?? 999);
const sortReportSubjects = (items: ReportSubject[]) => [...items].sort((a, b) => priority(subjectCode(a)) - priority(subjectCode(b)) || subjectCode(a).localeCompare(subjectCode(b)));

const resultsFor = (row: Row, subjectId: string) => (row.results ?? []).filter((r: Row) => str(r.subject_id) === str(subjectId));
function latestPercentage(row: Row, subjectId: string) {
  const values = resultsFor(row, subjectId).map((r: Row) => {
    const score = num(r.score), max = num(r.maximum_score);
    return score != null && max != null && max > 0 ? (score / max) * 100 : null;
  }).filter((v: number | null): v is number => v != null);
  return values.length ? values[values.length - 1] : null;
}
function latestRaw(row: Row, subjectId: string) {
  const values = resultsFor(row, subjectId).map((r: Row) => num(r.score)).filter((v: number | null): v is number => v != null);
  return values.length ? values[values.length - 1] : null;
}

const CAS = (s: Subject) => matches(s, [/CREATIVE ARTS/, /MUSIC/, /PHYSICAL EDUCATION/, /^ART\b/, /^MUS\b/, /^PE\b/]) && !matches(s, [/CREATIVE ARTS.*SPORT/]);
const INT_SCI = (s: Subject) => matches(s, [/AGRICULTURE/, /HOME SCIENCE/, /^HSC\b/, /INFORMATION.*COMMUNICATION TECHNOLOGY/, /^ICT\b/]);

function componentPercentage(row: Row, subjects: Subject[], predicate: (s: Subject) => boolean) {
  const components = subjects.filter(predicate);
  const values = components.map(s => latestPercentage(row, s.id)).filter((v): v is number => v != null);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function fixedJuniorSubject(code: string, subjects: Subject[]): ReportSubject | null {
  const patterns: Record<string, RegExp[]> = {
    ENG: [/ENGLISH/, /^ENG\b/], KIS: [/KISWAHILI/, /^KIS\b/, /^KSW\b/], MATH: [/MATHEMATICS/, /^MATH?\b/, /^MAT\b/],
    "INT SCI": [/INTEGRATED SCIENCE/, /SCIENCE TECHNOLOGY/, /^SCI\b/], SST: [/SOCIAL STUDIES/, /^SST\b/],
    "AGR NUT": [/AGRICULTURE.*NUTRITION/, /AGRICULTURE/, /^AGR\b/], RE: [/RELIGIOUS EDUCATION/, /ISLAMIC RELIGIOUS/, /CHRISTIAN RELIGIOUS/, /^RE\b/, /^IRE\b/, /^CRE\b/],
    "PRE TECH": [/PRE TECHNICAL/, /PRE TECH/, /^PRE\b/]
  };
  const found = subjects.find(s => matches(s, patterns[code] ?? []));
  return found ? { ...found, code } : null;
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
  const selectedClass = classes.find(c => str(c.id) === classId), selectedTerm = terms.find(t => str(t.id) === termId);
  const band = getBand(selectedClass), grade = getGrade(selectedClass);
  const bandTitle = band === "LOWER_PRIMARY" ? "LOWER PRIMARY CBC ASSESSMENT MARKSHEET" : band === "UPPER_PRIMARY" ? "UPPER PRIMARY CBC ASSESSMENT MARKSHEET" : "JUNIOR SCHOOL PERFORMANCE MARKSHEET";

  const loadSubjects = async (cid: string) => {
    const q = await getSupabase().from("class_subjects").select("subject_id").eq("class_id", cid);
    if (q.error) { setSubjects(allSubjects); return; }
    const ids = [...new Set((q.data ?? []).map(x => str(x.subject_id)))];
    setSubjects(ids.length ? allSubjects.filter(s => ids.includes(str(s.id))) : allSubjects);
  };
  useEffect(() => { setRows([]); setSubjects([]); setMessage(""); if (classId && allSubjects.length) void loadSubjects(classId); }, [classId, allSubjects]);

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
      const selectedSubjects = ids.length ? allSubjects.filter(s => ids.includes(str(s.id))) : subjects;
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

  const displaySubjects = useMemo<ReportSubject[]>(() => {
    if (band === "LOWER_PRIMARY") return sortReportSubjects(subjects.map(s => ({ ...s, code: subjectCode(s) })));
    if (band === "UPPER_PRIMARY") {
      const normal = subjects.filter(s => !CAS(s) && !INT_SCI(s) && !matches(s, [/CREATIVE ARTS.*SPORT/, /INTEGRATED SCIENCE/])).map(s => ({ ...s, code: subjectCode(s) }));
      const out: ReportSubject[] = [...normal];
      if (subjects.some(INT_SCI) || subjects.some(s => matches(s, [/INTEGRATED SCIENCE/]))) out.push({ id: "__int_sci__", code: "INT SCI", name: "Integrated Science", synthetic: true, componentIds: subjects.filter(INT_SCI).map(s => s.id) });
      if (subjects.some(CAS) || subjects.some(s => matches(s, [/CREATIVE ARTS.*SPORT/]))) out.push({ id: "__cas__", code: "CAS", name: "Creative Arts & Sports", synthetic: true, componentIds: subjects.filter(CAS).map(s => s.id) });
      return sortReportSubjects(out);
    }
    const codes = ["ENG", "KIS", "MATH", "INT SCI", "SST", "CAS", "AGR NUT", "RE", "PRE TECH"];
    const out: ReportSubject[] = [];
    for (const code of codes) {
      if (code === "INT SCI") {
        const s = subjects.find(x => matches(x, [/INTEGRATED SCIENCE/, /SCIENCE TECHNOLOGY/, /^SCI\b/]));
        if (s) out.push({ ...s, code });
      } else if (code === "CAS") {
        const s = subjects.find(x => matches(x, [/CREATIVE ARTS.*SPORT/]));
        const components = subjects.filter(CAS);
        if (s) out.push({ ...s, code }); else if (components.length) out.push({ id: "__junior_cas__", code, name: "Creative Arts & Sports", synthetic: true, componentIds: components.map(x => x.id) });
      } else {
        const s = fixedJuniorSubject(code, subjects);
        if (s) out.push(s);
      }
    }
    return out.length ? out : sortReportSubjects(subjects.slice(0, 9).map(s => ({ ...s, code: subjectCode(s) })));
  }, [subjects, band]);

  const percentageFor = (row: Row, subject: ReportSubject) => {
    if (!subject.synthetic) return latestPercentage(row, subject.id);
    const ids = subject.componentIds ?? [];
    const values = ids.map(id => latestPercentage(row, id)).filter((v): v is number => v != null);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };
  const markFor = (row: Row, subject: ReportSubject) => {
    const pct = percentageFor(row, subject);
    if (pct == null) return "—";
    if (subject.synthetic) return `${fmt(pct)}%`;
    const raw = latestRaw(row, subject.id), result = resultsFor(row, subject.id).slice(-1)[0], max = num(result?.maximum_score);
    return raw == null ? "—" : `${fmt(raw)}`;
  };
  const stats = (row: Row) => {
    const percentages = displaySubjects.map(s => percentageFor(row, s)).filter((v): v is number => v != null);
    const totalMarks = percentages.length ? percentages.reduce((a, b) => a + b, 0) : null;
    const totalPoints = percentages.length ? percentages.reduce((a, b) => a + (achievementForPercentage(b)?.points ?? 0), 0) : null;
    return { totalMarks, totalPoints, mean: percentages.length ? (totalMarks ?? 0) / percentages.length : null };
  };
  const rankedRows = useMemo(() => {
    const mapped = rows.map(row => ({ row, ...stats(row) }));
    const ordered = [...mapped].sort((a, b) => {
      const av = band === "JUNIOR_SCHOOL" ? (a.totalPoints ?? -1) : (a.totalMarks ?? -1);
      const bv = band === "JUNIOR_SCHOOL" ? (b.totalPoints ?? -1) : (b.totalMarks ?? -1);
      return bv - av || learnerName(a.row).localeCompare(learnerName(b.row));
    });
    let previous: number | null = null, previousRank = 0;
    const ranks = new Map<string, number>();
    ordered.forEach((x, i) => {
      const value = band === "JUNIOR_SCHOOL" ? x.totalPoints : x.totalMarks;
      const rank = value === previous ? previousRank : i + 1;
      ranks.set(str(x.row.id), rank); previous = value; previousRank = rank;
    });
    return mapped.map(x => ({ ...x, rank: ranks.get(str(x.row.id)) ?? null })).sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
  }, [rows, displaySubjects, band]);

  const subjectTotal = (s: ReportSubject) => rows.reduce((sum, row) => sum + (percentageFor(row, s) ?? 0), 0);
  const subjectMean = (s: ReportSubject) => { const vals = rows.map(row => percentageFor(row, s)).filter((v): v is number => v != null); return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null; };
  const classTotalMarks = rankedRows.reduce((sum, x) => sum + (x.totalMarks ?? 0), 0);
  const classTotalPoints = rankedRows.reduce((sum, x) => sum + (x.totalPoints ?? 0), 0);

  if (loading) return <PortalLayout role={profile?.role ?? "TEACHER"}><main className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin" /></main></PortalLayout>;

  return <PortalLayout role={profile?.role ?? "TEACHER"}>
    <main className="mx-auto w-full max-w-[1800px] space-y-5 px-3 py-4 sm:px-6 lg:px-8">
      <section className="rounded-[1.5rem] border border-[var(--ink)]/10 bg-white shadow-sm print-hide">
        <div className="bg-[var(--ink)] px-5 py-6 text-white sm:px-7"><span className="text-xs font-black uppercase tracking-[.16em] text-[var(--gold)]">Class marksheet</span><h1 className="mt-2 font-serif text-3xl font-semibold">CBC assessment marksheet</h1><p className="mt-2 max-w-3xl text-sm text-white/65">Scores are shown first; achievement levels and points are derived automatically from percentage performance.</p></div>
        <div className="grid gap-3 p-5 md:grid-cols-3">
          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink)]/60">Academic year<select value={yearId} onChange={e=>{setYearId(e.target.value);setTermId("");setClassId("");setRows([])}} className="min-h-11 rounded-xl border border-[var(--ink)]/15 bg-white px-3 text-sm font-semibold normal-case"><option value="">Select year</option>{years.map(y=><option key={str(y.id)} value={str(y.id)}>{str(y.name)}</option>)}</select></label>
          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink)]/60">Term<select value={termId} onChange={e=>{setTermId(e.target.value);setRows([])}} className="min-h-11 rounded-xl border border-[var(--ink)]/15 bg-white px-3 text-sm font-semibold normal-case"><option value="">Select term</option>{visibleTerms.map(t=><option key={str(t.id)} value={str(t.id)}>{str(t.name)}</option>)}</select></label>
          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink)]/60">Class<select value={classId} onChange={e=>{setClassId(e.target.value);setRows([])}} className="min-h-11 rounded-xl border border-[var(--ink)]/15 bg-white px-3 text-sm font-semibold normal-case"><option value="">Select class</option>{visibleClasses.map(c=><option key={str(c.id)} value={str(c.id)}>{str(c.name)}</option>)}</select></label>
        </div>
        <div className="flex flex-wrap gap-3 px-5 pb-5 sm:px-7"><button type="button" onClick={()=>void generate()} disabled={busy||!classId||!termId} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--ink)] px-5 text-sm font-bold text-white disabled:opacity-50">{busy?<Loader2 size={16} className="animate-spin"/>:<FileText size={16}/>} {busy?"Generating…":"Generate marksheet"}</button><button type="button" onClick={()=>window.print()} disabled={!rows.length} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--ink)]/15 bg-white px-5 text-sm font-bold disabled:opacity-40"><Printer size={16}/> Print / Save PDF</button></div>
        {message&&<p role="status" className="mx-5 mb-5 rounded-xl bg-[var(--gold)]/10 px-4 py-3 text-sm font-semibold sm:mx-7">{message}</p>}
      </section>

      {classId&&<section className="marksheet-v2 overflow-hidden rounded-none bg-white shadow-sm">
        <header className="marksheet-header border-b border-[#D89B28]/40 bg-[var(--ink)] px-5 py-5 text-white sm:px-7"><h2 className="text-2xl font-black uppercase">MENWE PRIMARY & JUNIOR SCHOOL</h2><p className="text-xs font-semibold text-white/75">P.O. BOX 19, KIONYO, MERU | menwejuniorss23@gmail.com</p><h3 className="mt-2 text-base font-black uppercase">{bandTitle} — {str(selectedClass?.name)||"CLASS"} · {str(selectedTerm?.name)||"TERM"} · {str(years.find(y=>str(y.id)===yearId)?.name)||"YEAR"}</h3><div className="mt-1 text-[10px] font-semibold text-white/70">{band === "JUNIOR_SCHOOL" ? "RANKING: TOTAL POINTS" : "RANKING: TOTAL MARKS"} · GRADE {grade ?? "—"}</div></header>
        {!displaySubjects.length?<div className="p-8 text-center text-sm font-semibold">No reportable subjects are configured for this class.</div>:<div className="marksheet-table-wrap overflow-x-auto p-2 sm:p-4">
          <table className="marksheet-table w-full min-w-[1180px] border-collapse text-[10px]" aria-label="Class marksheet">
            <thead>
              <tr><th rowSpan={2}>NO.</th><th rowSpan={2}>ADM NO.</th><th rowSpan={2} className="name-column">LEARNER</th>{displaySubjects.map(s=><th key={s.id} colSpan={2} className="subject-group"><span className="subject-code">{subjectCode(s)}</span></th>)}<th rowSpan={2}>TOTAL<br/>MARKS</th><th rowSpan={2}>TOTAL<br/>POINTS</th><th rowSpan={2}>RANK</th></tr>
              <tr>{displaySubjects.flatMap(s=>[<th key={`${s.id}-score`}>SCORE</th>,<th key={`${s.id}-level`}>LEVEL</th>])}</tr>
            </thead>
            <tbody>{rankedRows.map((item, i)=><tr key={str(item.row.id)}><td>{i+1}</td><td>{str(item.row.admission_number)||"—"}</td><td className="name-cell">{learnerName(item.row)}</td>{displaySubjects.flatMap(s=>{const a=achievementForPercentage(percentageFor(item.row,s));return [<td key={`${item.row.id}-${s.id}-score`} className="mark-cell">{markFor(item.row,s)}</td>,<td key={`${item.row.id}-${s.id}-level`} className="level-cell">{a?.code||"—"}</td>]})}<td className="total-marks-cell">{item.totalMarks==null?"—":fmt(item.totalMarks)}</td><td className="points-cell">{item.totalPoints==null?"—":item.totalPoints}</td><td className="rank-cell">{item.rank??"—"}</td></tr>)}</tbody>
            <tfoot>
              <tr className="marksheet-summary-row"><td colSpan={3}>TOTAL MARKS</td>{displaySubjects.flatMap(s=>[<td key={`total-${s.id}`} colSpan={2}>{rows.length?fmt(subjectTotal(s)):"—"}</td>])}<td>{rows.length?fmt(classTotalMarks):"—"}</td><td>{rows.length?classTotalPoints:"—"}</td><td>—</td></tr>
              <tr className="marksheet-summary-row marksheet-mean-row"><td colSpan={3}>MEAN</td>{displaySubjects.flatMap(s=>[<td key={`mean-${s.id}`} colSpan={2}>{subjectMean(s)==null?"—":`${fmt(subjectMean(s))}%`}</td>])}<td>{rankedRows.length?fmt(rankedRows.reduce((sum,x)=>sum+(x.mean??0),0)/(rankedRows.filter(x=>x.mean!=null).length||1)):"—"}</td><td>—</td><td>—</td></tr>
            </tfoot>
          </table>
        </div>}
        <div className="level-legend border-t border-[var(--ink)]/10 px-4 py-3 sm:px-6"><strong>Achievement scale:</strong> EE1 90–100% (8) · EE2 75–89% (7) · ME1 58–74% (6) · ME2 41–57% (5) · AE1 31–40% (4) · AE2 21–30% (3) · BE1 11–20% (2) · BE2 0–10% (1).</div>
      </section>}
    </main>
  </PortalLayout>;
}
