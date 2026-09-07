import { FileText, Loader2, Printer, RefreshCw, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";

type Row = Record<string, any>;
const text = (v: unknown, fallback = "—") => v == null || v === "" ? fallback : String(v);
const ADMINS = ["SUPER_ADMIN", "ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI"];
const input = "min-h-11 rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--accent)]";
const cleanType = (v: unknown) => String(v ?? "").trim().toLowerCase().replace(/[-_\s]+/g, "");
const isOpener = (r: Row) => { const type = cleanType(r.exam_type); const name = cleanType(r.name); return ["opener", "opening", "openerexam", "openingexam"].includes(type) || name.includes("opener") || name.includes("opening"); };
const isEndTerm = (r: Row) => { const type = cleanType(r.exam_type); const name = cleanType(r.name); return ["endterm", "endofterm", "final", "terminal", "terminalexam"].includes(type) || name.includes("endterm") || name.includes("endofterm") || name.includes("terminal") || name.includes("final"); };
const pct = (score: unknown, maximum: unknown) => { const s = Number(score), m = Number(maximum); return Number.isFinite(s) && Number.isFinite(m) && m > 0 ? (s / m) * 100 : null; };
const fmt = (v: number | null, suffix = "") => v == null || !Number.isFinite(v) ? "—" : `${Number.isInteger(v) ? v : v.toFixed(1)}${suffix}`;

function performanceLevel(score: number | null, fallback: unknown = null) {
  if (fallback) return String(fallback);
  if (score == null) return "—";
  if (score >= 80) return "Exceeding Expectation";
  if (score >= 60) return "Meeting Expectation";
  if (score >= 40) return "Approaching Expectation";
  return "Below Expectation";
}

function assessmentValue(rows: Row[]) {
  if (!rows.length) return null;
  const values = rows.map(r => pct(r.score, r.maximum_score)).filter((v): v is number => v != null);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export default function ReportCardsDirectory() {
  const { user, profile } = useSchoolAuth();
  const admin = ADMINS.includes(profile?.role ?? "");
  const teacher = profile?.role === "TEACHER";
  const [students, setStudents] = useState<Row[]>([]), [years, setYears] = useState<Row[]>([]), [terms, setTerms] = useState<Row[]>([]);
  const [studentId, setStudentId] = useState(""), [yearId, setYearId] = useState(""), [termId, setTermId] = useState("");
  const [mode, setMode] = useState<"term" | "annual">("term");
  const [results, setResults] = useState<Row[]>([]), [attendance, setAttendance] = useState<Row[]>([]), [report, setReport] = useState<Row | null>(null), [items, setItems] = useState<Row[]>([]);
  const [annualRows, setAnnualRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [message, setMessage] = useState<string | null>(null);

  useEffect(() => { void (async () => {
    if (!user) return;
    setLoading(true); setMessage(null);
    try {
      const db = getSupabase();
      const [s, y, t] = await Promise.all([
        db.from("students").select("id,admission_number,first_name,middle_name,last_name").eq("status", "ACTIVE").order("first_name").order("last_name"),
        db.from("academic_years").select("id,name,starts_on,ends_on,is_current,status").eq("status", "ACTIVE").order("starts_on", { ascending: false }),
        db.from("terms").select("id,academic_year_id,name,starts_on,ends_on,is_current,status").eq("status", "ACTIVE").order("starts_on", { ascending: false })
      ]);
      for (const q of [s, y, t]) if (q.error) throw q.error;
      setStudents(s.data ?? []); setYears(y.data ?? []); setTerms(t.data ?? []);
      setYearId(String(y.data?.find((x: any) => x.is_current)?.id ?? y.data?.[0]?.id ?? ""));
    } catch (e) { setMessage(e instanceof Error ? e.message : "Report-card workspace could not be loaded."); }
    finally { setLoading(false); }
  })(); }, [user]);

  const visibleTerms = useMemo(() => terms.filter(t => !yearId || String(t.academic_year_id) === yearId), [terms, yearId]);
  const selected = students.find(s => String(s.id) === studentId);
  const selectedYear = years.find(y => String(y.id) === yearId);
  const selectedTerm = terms.find(t => String(t.id) === termId);
  const fullName = selected ? [selected.first_name, selected.middle_name, selected.last_name].filter(Boolean).join(" ") : "";

  const resetReport = () => { setMessage(null); setReport(null); setItems([]); setResults([]); setAttendance([]); setAnnualRows([]); };

  const generateTermReport = async () => {
    if (!studentId || !yearId || !termId) { setMessage("Select learner, academic year and term first."); return; }
    setBusy(true); resetReport();
    try {
      const db = getSupabase();
      const [en, r, a, existing] = await Promise.all([
        db.from("enrollments").select("class_id").eq("student_id", studentId).eq("academic_year_id", yearId).eq("status", "ACTIVE").limit(1),
        db.from("exam_results").select("id,exam_id,subject_id,score,maximum_score,grade,teacher_comment,exams!inner(id,term_id,class_id,name,exam_type,starts_on,ends_on),subjects(id,name,code)").eq("student_id", studentId).eq("exams.term_id", termId),
        db.from("attendance_records").select("id,status,attendance_sessions!inner(class_id,session_date)").eq("student_id", studentId),
        db.from("report_cards").select("id,student_id,term_id,class_id,attendance_percentage,average_score,teacher_remark,headteacher_remark,generated_at").eq("student_id", studentId).eq("term_id", termId).maybeSingle()
      ]);
      for (const q of [en, r, a, existing]) if (q.error) throw q.error;
      const resultRows = r.data ?? [];
      setResults(resultRows); setAttendance(a.data ?? []);
      const classId = String(en.data?.[0]?.class_id ?? existing.data?.class_id ?? "");
      if (existing.data) {
        const ri = await db.from("report_card_items").select("id,report_card_id,subject_id,score,maximum_score,grade").eq("report_card_id", existing.data.id).select("id,report_card_id,subject_id,score,maximum_score,grade,subjects(id,name,code)");
        if (ri.error) throw ri.error;
        setReport(existing.data); setItems(ri.data ?? []);
      }
      if (!resultRows.length && !existing.data) { setMessage("No examination results have been recorded for this learner and term yet."); return; }
      if (admin && resultRows.length) {
        const bySubject = new Map<string, Row[]>();
        for (const row of resultRows) { const key = String(row.subject_id); bySubject.set(key, [...(bySubject.get(key) ?? []), row]); }
        const itemRows = [...bySubject.entries()].map(([subject_id, rows]) => ({ subject_id, score: rows.reduce((n, x) => n + Number(x.score ?? 0), 0), maximum_score: rows.reduce((n, x) => n + Number(x.maximum_score ?? 0), 0) || 100, grade: rows.map(x => x.grade).find(Boolean) ?? null }));
        const totalScore = itemRows.reduce((n, x) => n + Number(x.score), 0), totalMax = itemRows.reduce((n, x) => n + Number(x.maximum_score), 0);
        const present = (a.data ?? []).filter((x: any) => ["PRESENT", "LATE", "Present", "Late"].includes(String(x.status))).length;
        const attendancePct = (a.data ?? []).length ? present / (a.data ?? []).length * 100 : null;
        const rc = await db.from("report_cards").upsert({ student_id: studentId, term_id: termId, class_id: classId || null, attendance_percentage: attendancePct, average_score: totalMax ? totalScore / totalMax * 100 : null, generated_by: user?.id ?? null, generated_at: new Date().toISOString() }, { onConflict: "student_id,term_id" }).select("id,student_id,term_id,class_id,attendance_percentage,average_score,teacher_remark,headteacher_remark,generated_at").single();
        if (rc.error) throw rc.error;
        if (itemRows.length) { const ir = await db.from("report_card_items").upsert(itemRows.map(x => ({ ...x, report_card_id: rc.data.id })), { onConflict: "report_card_id,subject_id" }); if (ir.error) throw ir.error; }
        setReport(rc.data); setItems(itemRows); setMessage("Term report generated and saved successfully.");
      } else if (existing.data) setMessage("Showing the saved individual report. Only authorised administrators can regenerate it.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "The individual report could not be generated."); }
    finally { setBusy(false); }
  };

  const generateAnnualReport = async () => {
    if (!studentId || !yearId) { setMessage("Select learner and academic year first."); return; }
    setBusy(true); resetReport();
    try {
      const db = getSupabase();
      const yearTerms = terms.filter(t => String(t.academic_year_id) === yearId);
      const termIds = yearTerms.map(t => t.id);
      if (!termIds.length) { setMessage("No terms are configured for this academic year yet."); return; }
      const [en, examsQ, attQ] = await Promise.all([
        db.from("enrollments").select("class_id").eq("student_id", studentId).eq("academic_year_id", yearId).eq("status", "ACTIVE").limit(1),
        db.from("exams").select("id,term_id,class_id,name,exam_type,starts_on,ends_on,status").in("term_id", termIds).eq("status", "PUBLISHED"),
        db.from("attendance_records").select("id,status,attendance_sessions!inner(session_date)").eq("student_id", studentId).gte("attendance_sessions.session_date", selectedYear?.starts_on ?? "1900-01-01").lte("attendance_sessions.session_date", selectedYear?.ends_on ?? "2999-12-31")
      ]);
      for (const q of [en, examsQ, attQ]) if (q.error) throw q.error;
      const exams = examsQ.data ?? [];
      const examIds = exams.map((x: any) => x.id);
      if (!examIds.length) { setMessage("No published Opener or End Term examinations are available for this academic year yet."); return; }
      const resultsQ = await db.from("exam_results").select("id,exam_id,subject_id,score,maximum_score,grade,teacher_comment,exams!inner(id,term_id,class_id,name,exam_type,starts_on,ends_on),subjects(id,name,code)").eq("student_id", studentId).in("exam_id", examIds);
      if (resultsQ.error) throw resultsQ.error;
      const rows = resultsQ.data ?? [];
      const bySubject = new Map<string, Row>();
      for (const row of rows) {
        const key = String(row.subject_id); const current = bySubject.get(key) ?? { subject_id: row.subject_id, subject: row.subjects?.name ?? row.subject_id, openerRows: [], endRows: [], openerGrade: null, endGrade: null, comment: null };
        if (isOpener(row.exams)) { current.openerRows.push(row); current.openerGrade ||= row.grade ?? null; }
        if (isEndTerm(row.exams)) { current.endRows.push(row); current.endGrade ||= row.grade ?? null; current.comment ||= row.teacher_comment ?? null; }
        bySubject.set(key, current);
      }
      const annual = [...bySubject.values()].map(row => { const opener = assessmentValue(row.openerRows), endTerm = assessmentValue(row.endRows); const average = opener != null && endTerm != null ? (opener + endTerm) / 2 : opener ?? endTerm; return { ...row, opener, endTerm, average, performance: performanceLevel(average, row.endGrade ?? row.openerGrade) }; }).filter(row => row.opener != null || row.endTerm != null);
      if (!annual.length) { setMessage("No Opener or End Term learner marks have been recorded for this academic year yet."); return; }
      setAnnualRows(annual); setAttendance(attQ.data ?? []); setMessage("End-of-year learner report prepared from Opener and End Term results.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "The end-of-year report could not be prepared."); }
    finally { setBusy(false); }
  };

  const generate = () => mode === "annual" ? generateAnnualReport() : generateTermReport();
  const attendancePct = attendance.length ? attendance.filter((x: any) => ["PRESENT", "LATE", "Present", "Late"].includes(String(x.status))).length / attendance.length * 100 : report?.attendance_percentage != null ? Number(report.attendance_percentage) : null;
  const termAverage = report?.average_score != null ? Number(report.average_score) : results.length ? results.reduce((n, x) => n + Number(x.score ?? 0), 0) / Math.max(1, results.reduce((n, x) => n + Number(x.maximum_score ?? 100), 0)) * 100 : null;
  const annualAverage = annualRows.length ? annualRows.reduce((n, x) => n + Number(x.average), 0) / annualRows.length : null;
  const annualOpener = annualRows.length ? annualRows.filter(x => x.opener != null).reduce((n, x) => n + Number(x.opener), 0) / Math.max(1, annualRows.filter(x => x.opener != null).length) : null;
  const annualEnd = annualRows.length ? annualRows.filter(x => x.endTerm != null).reduce((n, x) => n + Number(x.endTerm), 0) / Math.max(1, annualRows.filter(x => x.endTerm != null).length) : null;

  if (loading) return <PortalLayout role={profile?.role ?? "PARENT"}><section className="menwe-card mx-auto mt-8 grid min-h-[40vh] max-w-7xl place-items-center rounded-[1.75rem] p-7"><Loader2 className="animate-spin" /></section></PortalLayout>;
  return <PortalLayout role={profile?.role ?? "PARENT"}><main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7 print:p-0">
      <div className="print:hidden flex flex-wrap items-start justify-between gap-4"><div><span className="text-xs font-black uppercase tracking-[.14em] text-[var(--gold)]">Academic records</span><h1 className="mt-2 font-serif text-3xl font-semibold">Learner reports</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink)]/60">Professional term reports and end-of-year reports built directly from the learner's recorded assessment results.</p></div><FileText className="text-[var(--accent)]" size={28} /></div>
      <div className="print:hidden mt-6 grid gap-3 md:grid-cols-5"><select value={studentId} onChange={e => { setStudentId(e.target.value); resetReport(); }} className={input}><option value="">Select learner</option>{students.map(s => <option key={text(s.id)} value={text(s.id)}>{[s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ")} · {text(s.admission_number)}</option>)}</select><select value={yearId} onChange={e => { setYearId(e.target.value); setTermId(""); resetReport(); }} className={input}><option value="">Academic year</option>{years.map(y => <option key={text(y.id)} value={text(y.id)}>{text(y.name)}</option>)}</select><select value={mode} onChange={e => { setMode(e.target.value as "term" | "annual"); resetReport(); }} className={input}><option value="term">Term report</option><option value="annual">End-of-year report</option></select>{mode === "term" ? <select value={termId} onChange={e => { setTermId(e.target.value); resetReport(); }} className={input}><option value="">Term</option>{visibleTerms.map(t => <option key={text(t.id)} value={text(t.id)}>{text(t.name)}</option>)}</select> : <div className="flex min-h-11 items-center rounded-xl border border-[var(--gold)]/25 bg-[var(--gold)]/10 px-3 text-sm font-bold text-[var(--ink)]">Opener + End Term</div>}<button type="button" disabled={busy || !studentId || !yearId || (mode === "term" && !termId)} onClick={() => void generate()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}{busy ? "Preparing…" : mode === "annual" ? "Prepare annual report" : "Generate term report"}</button></div>

      {(report || items.length || results.length || annualRows.length) && selected && <article className="report-print mt-8 rounded-2xl border border-[var(--ink)]/15 bg-white p-6 print:border-0 print:p-0">
        <style>{`.report-print{box-shadow:0 18px 50px rgba(6,18,41,.08)}@media print{@page{size:A4 portrait;margin:10mm}body *{visibility:hidden}.report-print,.report-print *{visibility:visible}.report-print{position:absolute!important;left:0;top:0;width:100%;margin:0!important;box-shadow:none!important;border:0!important}.report-print .no-print{display:none!important}}`}</style>
        <header className="border-b-2 border-[var(--ink)]/15 pb-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--gold)]">Menwe Primary & Junior School</p><h2 className="mt-2 font-serif text-3xl font-black tracking-tight">{mode === "annual" ? "END-OF-YEAR LEARNER REPORT" : "INDIVIDUAL TERM REPORT"}</h2><p className="mt-1 text-sm font-semibold text-[var(--ink)]/55">Academic performance record</p></div><button type="button" onClick={() => window.print()} className="no-print inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"><Printer size={16} /> Print / Save PDF</button></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-4"><div><span className="text-[var(--ink)]/50">Learner</span><p className="font-bold">{fullName}</p></div><div><span className="text-[var(--ink)]/50">Assessment No.</span><p className="font-bold">{text(selected.admission_number)}</p></div><div><span className="text-[var(--ink)]/50">Academic year</span><p className="font-bold">{text(selectedYear?.name)}</p></div><div><span className="text-[var(--ink)]/50">Report</span><p className="font-bold">{mode === "annual" ? "Opener + End Term" : text(selectedTerm?.name)}</p></div></div></header>
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[var(--ink)]/5 p-4"><span className="text-xs font-bold uppercase text-[var(--ink)]/50">{mode === "annual" ? "Year average" : "Average"}</span><p className="mt-1 text-2xl font-black">{fmt(mode === "annual" ? annualAverage : termAverage, "%")}</p></div><div className="rounded-xl bg-[var(--ink)]/5 p-4"><span className="text-xs font-bold uppercase text-[var(--ink)]/50">Attendance</span><p className="mt-1 text-2xl font-black">{fmt(attendancePct, "%")}</p></div><div className="rounded-xl bg-[var(--ink)]/5 p-4"><span className="text-xs font-bold uppercase text-[var(--ink)]/50">Subjects</span><p className="mt-1 text-2xl font-black">{mode === "annual" ? annualRows.length : items.length || new Set(results.map(x => String(x.subject_id))).size}</p></div></div>
        {mode === "annual" ? <><div className="mt-7 overflow-x-auto"><table className="w-full min-w-[700px] border-collapse text-sm"><thead><tr className="bg-[var(--ink)] text-white"><th className="p-3 text-left">Learning Area</th><th className="p-3 text-center">Opener</th><th className="p-3 text-center">End Term</th><th className="p-3 text-center">Average</th><th className="p-3 text-left">Performance Level</th></tr></thead><tbody>{annualRows.map((r, i) => <tr key={text(r.subject_id, String(i))} className="border-b border-[var(--ink)]/10"><td className="p-3 font-bold">{text(r.subject)}</td><td className="p-3 text-center">{fmt(r.opener, "%")}</td><td className="p-3 text-center">{fmt(r.endTerm, "%")}</td><td className="p-3 text-center font-black">{fmt(r.average, "%")}</td><td className="p-3 font-semibold">{text(r.performance)}</td></tr>)}</tbody><tfoot><tr className="border-t-2 border-[var(--ink)]/25 bg-[var(--gold)]/10 font-black"><td className="p-3 uppercase">Overall average</td><td className="p-3 text-center">{fmt(annualOpener, "%")}</td><td className="p-3 text-center">{fmt(annualEnd, "%")}</td><td className="p-3 text-center">{fmt(annualAverage, "%")}</td><td className="p-3">{performanceLevel(annualAverage)}</td></tr></tfoot></table></div><div className="mt-5 flex items-center gap-2 rounded-xl bg-[var(--gold)]/10 px-4 py-3 text-sm font-semibold"><TrendingUp size={17} /> Annual average is calculated from the Opener and End Term results for each learning area.</div></> : <div className="mt-7 overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-sm"><thead><tr className="border-b-2"><th className="p-3 text-left">Learning Area</th><th className="p-3 text-left">Score</th><th className="p-3 text-left">Maximum</th><th className="p-3 text-left">Grade</th><th className="p-3 text-left">Teacher comment</th></tr></thead><tbody>{(results.length ? results : items).map((r, i) => <tr key={text(r.id, `${text(r.subject_id)}-${i}`)} className="border-b"><td className="p-3 font-semibold">{text(r.subjects?.name || r.subject_id)}</td><td className="p-3">{text(r.score)}</td><td className="p-3">{text(r.maximum_score)}</td><td className="p-3 font-bold">{text(r.grade)}</td><td className="p-3">{text(r.teacher_comment, "")}</td></tr>)}</tbody></table></div>}
        {mode === "term" && <div className="mt-8 grid gap-5 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase text-[var(--ink)]/50">Teacher remark</p><div className="mt-2 min-h-16 rounded-xl border p-3">{text(report?.teacher_remark, "")}</div></div><div><p className="text-xs font-bold uppercase text-[var(--ink)]/50">Headteacher / Principal remark</p><div className="mt-2 min-h-16 rounded-xl border p-3">{text(report?.headteacher_remark, "")}</div></div></div>}
        {mode === "annual" && <div className="mt-8 grid gap-5 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase text-[var(--ink)]/50">Overall performance</p><div className="mt-2 rounded-xl border p-4"><p className="text-2xl font-black">{performanceLevel(annualAverage)}</p><p className="mt-1 text-sm text-[var(--ink)]/55">Based on the learner's annual subject averages.</p></div></div><div><p className="text-xs font-bold uppercase text-[var(--ink)]/50">School remark</p><div className="mt-2 min-h-20 rounded-xl border p-3">{annualAverage == null ? "" : annualAverage >= 60 ? "Keep building on this year's progress and continue working consistently." : "Continue practising consistently and use teacher feedback to strengthen learning."}</div></div></div>}
        <p className="mt-6 text-[10px] text-[var(--ink)]/45">Generated from Menwe academic records. Results shown are based only on marks recorded in the school system.</p>
      </article>}
      {message && <p role="status" className="mt-5 rounded-xl bg-[var(--gold)]/10 px-4 py-3 text-sm font-semibold">{message}</p>}
      {!admin && teacher && <p className="print:hidden mt-4 text-xs text-[var(--ink)]/50">Teachers can view authorised learner reports. Report regeneration is restricted to school administrators.</p>}
    </section>
  </main></PortalLayout>;
}
