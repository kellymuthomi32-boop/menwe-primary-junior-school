import { FileText, Loader2, Printer } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";

type Row = Record<string, any>;
type Subject = { id: string; code: string; name: string; status?: string };

const str = (v: unknown) => v == null ? "" : String(v);
const learnerName = (s: Row) => [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");
const mark = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const fmt = (v: number | null) => v == null ? "" : Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");

function getBand(c?: Row) {
  const raw = `${str(c?.name)} ${str(c?.code)} ${str(c?.level)}`.toUpperCase();
  const grade = raw.match(/(?:GRADE|CLASS|STD|STANDARD|G)\s*([1-9])\b/)?.[1];
  if (grade) {
    const n = Number(grade);
    if (n <= 3) return "LOWER_PRIMARY" as const;
    if (n <= 6) return "UPPER_PRIMARY" as const;
    return "JUNIOR_SCHOOL" as const;
  }
  if (/LOWER|PRIMARY 1|PRIMARY 2|PRIMARY 3/.test(raw)) return "LOWER_PRIMARY" as const;
  if (/UPPER|PRIMARY 4|PRIMARY 5|PRIMARY 6/.test(raw)) return "UPPER_PRIMARY" as const;
  return "JUNIOR_SCHOOL" as const;
}

const curriculumCodes: Record<string, string[]> = {
  LOWER_PRIMARY: ["ENG", "KSW", "MAT", "SCI"],
  UPPER_PRIMARY: ["ENG", "KSW", "MAT", "SSA", "SST", "CAS"],
  JUNIOR_SCHOOL: ["ENG", "KSW", "MAT", "SCI", "SST", "AGR", "CAS", "PRE", "CRE"]
};

const priority = (s: Subject) => {
  const code = str(s.code).toUpperCase();
  const order: Record<string, number> = { ENG: 10, KSW: 20, MAT: 30, SCI: 40, SSA: 40, SST: 50, AGR: 60, CAS: 70, PRE: 80, CRE: 90, IRE: 100, HRE: 110 };
  return order[code] ?? 1000;
};

const sortSubjects = (items: Subject[]) => [...items].sort((a, b) => priority(a) - priority(b) || str(a.name).localeCompare(str(b.name)));

export default function ClassMarksheetV2() {
  const { user, profile } = useSchoolAuth();
  const admin = ["SUPER_ADMIN", "ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI"].includes(profile?.role ?? "");
  const [years, setYears] = useState<Row[]>([]), [terms, setTerms] = useState<Row[]>([]), [classes, setClasses] = useState<Row[]>([]), [allSubjects, setAllSubjects] = useState<Subject[]>([]), [subjects, setSubjects] = useState<Subject[]>([]), [rows, setRows] = useState<Row[]>([]);
  const [yearId, setYearId] = useState(""), [termId, setTermId] = useState(""), [classId, setClassId] = useState(""), [loading, setLoading] = useState(true), [subjectsLoading, setSubjectsLoading] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");

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
  const bandTitle = band === "LOWER_PRIMARY" ? "LOWER PRIMARY CBC ASSESSMENT MARKSHEET" : band === "UPPER_PRIMARY" ? "UPPER PRIMARY CBC ASSESSMENT MARKSHEET" : "JUNIOR SCHOOL PERFORMANCE MARKSHEET";

  const loadSubjectsForClass = async (selectedClassId: string) => {
    setSubjectsLoading(true);
    try {
      const db = getSupabase();
      const mapping = await db.from("class_subjects").select("subject_id").eq("class_id", selectedClassId);
      if (mapping.error) throw mapping.error;
      const mappedIds = [...new Set((mapping.data ?? []).map(x => str(x.subject_id)))];
      const mapped = allSubjects.filter(s => mappedIds.includes(str(s.id)));
      if (mapped.length) {
        setSubjects(sortSubjects(mapped));
        return;
      }
      const codes = curriculumCodes[band] ?? curriculumCodes.JUNIOR_SCHOOL;
      const fallback = allSubjects.filter(s => codes.includes(str(s.code).toUpperCase()));
      setSubjects(sortSubjects(fallback));
      if (!fallback.length) setMessage("No subjects are configured for this class yet.");
    } catch (e) {
      const codes = curriculumCodes[band] ?? curriculumCodes.JUNIOR_SCHOOL;
      setSubjects(sortSubjects(allSubjects.filter(s => codes.includes(str(s.code).toUpperCase()))));
      setMessage(e instanceof Error ? `The class curriculum could not be read. Showing the CBC class subject template instead.` : "Showing the CBC class subject template.");
    } finally { setSubjectsLoading(false); }
  };

  useEffect(() => {
    setSubjects([]); setRows([]); setMessage("");
    if (classId && allSubjects.length) void loadSubjectsForClass(classId);
  }, [classId, allSubjects]);

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
      const mappedIds = [...new Set((mapping.data ?? []).map(x => str(x.subject_id)))];
      const selectedSubjects = mappedIds.length ? sortSubjects(allSubjects.filter(s => mappedIds.includes(str(s.id)))) : subjects;
      setSubjects(selectedSubjects);

      const en = await db.from("enrollments").select("student_id").eq("class_id", classId).eq("academic_year_id", yearId).eq("status", "ACTIVE");
      if (en.error) throw en.error;
      const ids = [...new Set((en.data ?? []).map(x => str(x.student_id)))];
      if (!ids.length) { setRows([]); setMessage("No active learners are enrolled in this class."); return; }
      const subjectIds = selectedSubjects.map(s => str(s.id)).filter(Boolean);
      const [st, rr] = await Promise.all([
        db.from("students").select("id,admission_number,first_name,middle_name,last_name,gender").in("id", ids).order("first_name").order("last_name"),
        subjectIds.length ? db.from("exam_results").select("student_id,subject_id,score,maximum_score,grade,exams!inner(id,term_id,class_id,name,exam_type)").eq("exams.term_id", termId).eq("exams.class_id", classId).in("student_id", ids).in("subject_id", subjectIds) : Promise.resolve({ data: [], error: null } as any)
      ]);
      if (st.error) throw st.error; if (rr.error) throw rr.error;
      const results = rr.data ?? [];
      setRows((st.data ?? []).map(s => ({ ...s, results: results.filter(r => str(r.student_id) === str(s.id)) })));
      if (!results.length) setMessage("Subjects are loaded correctly. No persisted assessment results exist for this class and term, so marks remain blank.");
    } catch (e) { setRows([]); setMessage(e instanceof Error ? e.message : "The marksheet could not be generated."); }
    finally { setBusy(false); }
  };

  const subjectRows = useMemo(() => subjects.map(s => {
    const id = str(s.id);
    const vals = rows.flatMap(r => (r.results ?? []).filter((x: Row) => str(x.subject_id) === id).map((x: Row) => mark(x.score)).filter((x: number | null): x is number => x != null));
    const total = vals.reduce((a, b) => a + b, 0);
    return { ...s, id, total, mean: vals.length ? total / vals.length : null };
  }), [subjects, rows]);

  const simpleMark = (r: Row, subjectId: string) => {
    const vals = (r.results ?? []).filter((x: Row) => str(x.subject_id) === subjectId).map((x: Row) => mark(x.score)).filter((x: number | null): x is number => x != null);
    return vals.length ? fmt(vals.reduce((a, b) => a + b, 0)) : "";
  };
  const simpleGrade = (r: Row, subjectId: string) => (r.results ?? []).filter((x: Row) => str(x.subject_id) === subjectId).map((x: Row) => str(x.grade)).filter(Boolean).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(" / ");
  const junior = (r: Row, subjectId: string, kind: "SC" | "L") => {
    const values = (r.results ?? []).filter((x: Row) => str(x.subject_id) === subjectId).filter((x: Row) => {
      const e = `${str(x.exams?.exam_type)} ${str(x.exams?.name)}`.toUpperCase();
      return kind === "SC" ? /\bSC\b|SCHOOL|WRITTEN|STRUCTURED/.test(e) : /\bL\b|LISTENING|ORAL|LANGUAGE/.test(e);
    }).map((x: Row) => mark(x.score)).filter((x: number | null): x is number => x != null);
    return values.length ? fmt(values[0]) : "";
  };

  const subjectHeader = (s: Subject) => <div className="flex min-w-0 flex-col items-center justify-center gap-0.5 leading-tight"><span className="block max-w-[120px] whitespace-normal break-words text-center text-[11px] font-black uppercase leading-tight text-white">{str(s.name) || str(s.code)}</span><span className="text-[9px] font-bold tracking-wider text-[#D89B28]">{str(s.code)}</span></div>;

  if (loading) return <PortalLayout role={profile?.role ?? "TEACHER"}><main className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin" /></main></PortalLayout>;
  return <PortalLayout role={profile?.role ?? "TEACHER"}><style>{`\n@media print{body *{visibility:hidden}.marksheet-v2,.marksheet-v2 *{visibility:visible}.marksheet-v2{position:absolute;inset:0;width:100%;padding:0!important;border:0!important;box-shadow:none!important}@page{size:A4 landscape;margin:5mm}}\n.marksheet-v2 table{table-layout:auto}.marksheet-v2 thead th{background:#061229!important;color:#fff!important;vertical-align:middle!important;text-align:center!important;height:52px!important;min-width:76px!important;padding:7px 5px!important;white-space:normal!important;overflow:visible!important}.marksheet-v2 thead th:first-child{min-width:42px}.marksheet-v2 thead th:nth-child(2){min-width:105px}.marksheet-v2 thead th:nth-child(3){min-width:150px}.marksheet-v2 thead th:nth-child(4){min-width:58px}.marksheet-v2 tbody td{vertical-align:middle}.marksheet-v2 .subject-heading{display:block!important;visibility:visible!important;color:#fff!important}`}</style>
    <main className="mx-auto w-full max-w-[1800px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm print:hidden"><div className="bg-[#061229] px-6 py-6 text-white"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[.16em] text-[#D89B28]">Class marksheet</div><h1 className="mt-2 text-3xl font-black">Level-specific assessment sheet</h1><p className="mt-2 text-sm text-white/70">Subjects come from the selected class curriculum. Grade 1–3: Lower Primary · Grade 4–6: Upper Primary · Grade 7–9: Junior School</p></div>{classId && <div className="rounded-2xl bg-white/10 px-4 py-3 text-center"><div className="text-xs uppercase text-white/60">Format</div><div className="font-black">{band === "LOWER_PRIMARY" ? "LOWER" : band === "UPPER_PRIMARY" ? "UPPER" : "JUNIOR"}</div></div>}</div></div><div className="grid gap-3 p-6 md:grid-cols-3"><select value={yearId} onChange={e => { setYearId(e.target.value); setTermId(""); setClassId(""); setSubjects([]); setRows([]); }} className="min-h-12 rounded-xl border px-3 font-semibold"><option value="">Academic year</option>{years.map(y => <option key={str(y.id)} value={str(y.id)}>{str(y.name)}</option>)}</select><select value={termId} onChange={e => { setTermId(e.target.value); setRows([]); }} className="min-h-12 rounded-xl border px-3 font-semibold"><option value="">Term</option>{visibleTerms.map(t => <option key={str(t.id)} value={str(t.id)}>{str(t.name)}</option>)}</select><select value={classId} onChange={e => { setClassId(e.target.value); setSubjects([]); setRows([]); }} className="min-h-12 rounded-xl border px-3 font-semibold"><option value="">Class</option>{visibleClasses.map(c => <option key={str(c.id)} value={str(c.id)}>{str(c.name)}</option>)}</select><div className="md:col-span-3 flex flex-wrap gap-3"><button onClick={() => void generate()} disabled={busy || subjectsLoading || !classId || !termId} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#061229] px-5 font-bold text-white disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin"/> : <FileText size={16}/>} {busy ? "Generating…" : subjectsLoading ? "Loading subjects…" : "Generate marksheet"}</button><button onClick={() => window.print()} disabled={!rows.length} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-5 font-bold disabled:opacity-40"><Printer size={16}/> Print / Save PDF</button></div>{message && <div className="md:col-span-3 rounded-xl bg-[#D89B28]/10 px-4 py-3 text-sm font-semibold">{message}</div>}</div></section>
      {classId && <section className="marksheet-v2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-md"><header className="border-b-4 border-[#D89B28] bg-[#061229] p-5 text-white"><h2 className="text-2xl font-black">MENWE PRIMARY & JUNIOR SCHOOL</h2><p className="text-xs opacity-75">P.O. BOX 19, KIONYO, MERU</p><h3 className="mt-2 text-lg font-black">{bandTitle}</h3><p className="text-xs font-semibold">{str(selectedClass?.name)} · {str(selectedTerm?.name)} · {str(years.find(y => str(y.id) === yearId)?.name)}</p></header>
        {subjectsLoading && <div className="border-x border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">Loading the subjects assigned to {str(selectedClass?.name)}…</div>}
        {!subjectsLoading && !subjects.length && <div className="border-x border-b border-[#D89B28]/30 bg-[#D89B28]/10 px-4 py-3 text-sm font-bold">No subjects are configured for this class.</div>}
        {!subjectsLoading && subjectRows.length > 0 && (band !== "JUNIOR_SCHOOL" ? <table className="w-full min-w-[1000px] border-collapse text-xs"><thead><tr><th className="border p-2">No.</th><th className="border p-2">Assessment No.</th><th className="border p-2 text-left">Learner Name</th><th className="border p-2">Gender</th>{subjectRows.map(s => <th key={s.id} className="border p-2"><span className="subject-heading">{subjectHeader(s)}</span></th>)}<th className="border p-2">TOTAL MARKS</th><th className="border p-2">{band === "LOWER_PRIMARY" ? "ACHIEVEMENT" : "GRADE / LEVEL"}</th></tr></thead><tbody>{rows.map((r, i) => <tr key={str(r.id)} className="even:bg-slate-50"><td className="border p-2 text-center">{i + 1}</td><td className="border p-2">{str(r.admission_number)}</td><td className="border p-2 font-semibold">{learnerName(r)}</td><td className="border p-2 text-center">{str(r.gender).toUpperCase().startsWith("M") ? "M" : str(r.gender).toUpperCase().startsWith("F") ? "F" : ""}</td>{subjectRows.map(s => <td key={s.id} className="border p-2 text-center font-semibold">{simpleMark(r, s.id)}</td>)}<td className="border p-2 text-center font-black">{fmt((r.results ?? []).map((x: Row) => mark(x.score)).filter((x: number | null): x is number => x != null).reduce((a: number, b: number) => a + b, 0) || null)}</td><td className="border p-2 text-center font-bold">{subjectRows.map(s => simpleGrade(r, s.id)).filter(Boolean).join(" / ")}</td></tr>)}<tr className="bg-[#D89B28]/15 font-black"><td colSpan={4} className="border p-2 text-right">TOTAL MARKS</td>{subjectRows.map(s => <td key={s.id} className="border p-2 text-center">{fmt(s.total)}</td>)}<td className="border p-2 text-center">{fmt(subjectRows.reduce((a, s) => a + s.total, 0) || null)}</td><td className="border p-2"/></tr><tr className="bg-[#D89B28]/10 font-black"><td colSpan={4} className="border p-2 text-right">MEAN MARK</td>{subjectRows.map(s => <td key={s.id} className="border p-2 text-center">{fmt(s.mean)}</td>)}<td className="border p-2 text-center">{fmt(rows.length ? subjectRows.reduce((a, s) => a + (s.mean ?? 0), 0) : null)}</td><td className="border p-2"/></tr></tbody></table> : <table className="w-full min-w-[1100px] border-collapse text-xs"><thead><tr><th rowSpan={2} className="border p-2">No.</th><th rowSpan={2} className="border p-2">Assessment No.</th><th rowSpan={2} className="border p-2 text-left">Learner Name</th><th rowSpan={2} className="border p-2">Gender</th>{subjectRows.map(s => <th key={s.id} colSpan={2} className="border p-2"><span className="subject-heading">{subjectHeader(s)}</span></th>)}<th rowSpan={2} className="border p-2">TOTAL MARKS</th><th rowSpan={2} className="border p-2">PERF LEVEL</th></tr><tr className="bg-[#D89B28]/20">{subjectRows.map(s => <Fragment key={s.id}><th className="border p-1">SC</th><th className="border p-1">L</th></Fragment>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={str(r.id)} className="even:bg-slate-50"><td className="border p-2">{i + 1}</td><td className="border p-2">{str(r.admission_number)}</td><td className="border p-2 font-semibold">{learnerName(r)}</td><td className="border p-2 text-center">{str(r.gender).toUpperCase().startsWith("M") ? "M" : str(r.gender).toUpperCase().startsWith("F") ? "F" : ""}</td>{subjectRows.map(s => <Fragment key={s.id}><td className="border p-2 text-center">{junior(r, s.id, "SC")}</td><td className="border p-2 text-center">{junior(r, s.id, "L")}</td></Fragment>)}<td className="border p-2 text-center font-black">{fmt((r.results ?? []).map((x: Row) => mark(x.score)).filter((x: number | null): x is number => x != null).reduce((a: number, b: number) => a + b, 0) || null)}</td><td className="border p-2 text-center font-bold">{(r.results ?? []).map((x: Row) => str(x.grade)).filter(Boolean).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(" / ")}</td></tr>)}<tr className="bg-[#D89B28]/15 font-black"><td colSpan={4} className="border p-2 text-right">TOTAL MARKS</td>{subjectRows.map(s => <td colSpan={2} key={s.id} className="border p-2 text-center">{fmt(s.total)}</td>)}<td className="border p-2 text-center">{fmt(subjectRows.reduce((a, s) => a + s.total, 0) || null)}</td><td className="border p-2"/></tr><tr className="bg-[#D89B28]/10 font-black"><td colSpan={4} className="border p-2 text-right">MEAN MARK</td>{subjectRows.map(s => <td colSpan={2} key={s.id} className="border p-2 text-center">{fmt(s.mean)}</td>)}<td className="border p-2 text-center">{fmt(rows.length ? subjectRows.reduce((a, s) => a + (s.mean ?? 0), 0) : null)}</td><td className="border p-2"/></tr></tbody></table>)}
      </section>}
    </main>
  </PortalLayout>;
}
