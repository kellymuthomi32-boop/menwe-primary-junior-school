import { FileText, Loader2, Printer, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";

type Row = Record<string, any>;
const text = (v: unknown, fallback = "—") => v == null || v === "" ? fallback : String(v);
const ADMINS = ["SUPER_ADMIN", "ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI"];
const input = "min-h-11 rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]";

export default function ReportCardsDirectory() {
  const { user, profile } = useSchoolAuth();
  const admin = ADMINS.includes(profile?.role ?? "");
  const teacher = profile?.role === "TEACHER";
  const [students,setStudents] = useState<Row[]>([]), [years,setYears] = useState<Row[]>([]), [terms,setTerms] = useState<Row[]>([]);
  const [studentId,setStudentId] = useState(""), [yearId,setYearId] = useState(""), [termId,setTermId] = useState("");
  const [results,setResults] = useState<Row[]>([]), [attendance,setAttendance] = useState<Row[]>([]), [report,setReport] = useState<Row|null>(null), [items,setItems] = useState<Row[]>([]);
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [message,setMessage] = useState<string|null>(null);

  useEffect(() => { void (async () => {
    if (!user) return;
    setLoading(true); setMessage(null);
    try {
      const db = getSupabase();
      const [s,y,t] = await Promise.all([
        db.from("students").select("id,admission_number,first_name,middle_name,last_name").eq("status","ACTIVE").order("first_name").order("last_name"),
        db.from("academic_years").select("id,name,starts_on,ends_on,is_current,status").eq("status","ACTIVE").order("starts_on",{ascending:false}),
        db.from("terms").select("id,academic_year_id,name,starts_on,ends_on,is_current,status").eq("status","ACTIVE").order("starts_on",{ascending:false})
      ]);
      for (const q of [s,y,t]) if (q.error) throw q.error;
      setStudents(s.data ?? []); setYears(y.data ?? []); setTerms(t.data ?? []);
      setYearId(String(y.data?.find((x:any)=>x.is_current)?.id ?? y.data?.[0]?.id ?? ""));
    } catch (e) { setMessage(e instanceof Error ? e.message : "Report-card workspace could not be loaded."); }
    finally { setLoading(false); }
  })(); }, [user]);

  const visibleTerms = useMemo(() => terms.filter(t => !yearId || String(t.academic_year_id) === yearId), [terms,yearId]);

  const generate = async () => {
    if (!studentId || !yearId || !termId) { setMessage("Select learner, academic year and term first."); return; }
    setBusy(true); setMessage(null); setReport(null); setItems([]); setResults([]); setAttendance([]);
    try {
      const db = getSupabase();
      const [en, r, a, existing] = await Promise.all([
        db.from("enrollments").select("class_id").eq("student_id",studentId).eq("academic_year_id",yearId).eq("status","ACTIVE").limit(1),
        db.from("exam_results").select("id,exam_id,subject_id,score,maximum_score,grade,teacher_comment,exams!inner(id,term_id,class_id,name,exam_type,starts_on,ends_on),subjects(id,name,code)").eq("student_id",studentId).eq("exams.term_id",termId),
        db.from("attendance_records").select("id,status,attendance_sessions!inner(class_id,session_date)").eq("student_id",studentId),
        db.from("report_cards").select("id,student_id,term_id,class_id,attendance_percentage,average_score,teacher_remark,headteacher_remark,generated_at").eq("student_id",studentId).eq("term_id",termId).maybeSingle()
      ]);
      for (const q of [en,r,a,existing]) if (q.error) throw q.error;
      const classId = String(en.data?.[0]?.class_id ?? existing.data?.class_id ?? "");
      const resultRows = r.data ?? [];
      setResults(resultRows); setAttendance(a.data ?? []);
      if (existing.data) {
        const ri = await db.from("report_card_items").select("id,report_card_id,subject_id,score,maximum_score,grade").eq("report_card_id",existing.data.id);
        if (ri.error) throw ri.error;
        setReport(existing.data); setItems(ri.data ?? []);
      }
      if (!resultRows.length && !existing.data) { setMessage("No examination results have been recorded for this learner and term yet."); return; }
      if (admin && resultRows.length) {
        const bySubject = new Map<string,Row[]>();
        for (const row of resultRows) { const key = String(row.subject_id); bySubject.set(key,[...(bySubject.get(key) ?? []),row]); }
        const itemRows = [...bySubject.entries()].map(([subject_id,rows]) => {
          const score = rows.reduce((n,x)=>n+Number(x.score ?? 0),0);
          const max = rows.reduce((n,x)=>n+Number(x.maximum_score ?? 0),0);
          return { subject_id, score, maximum_score:max || 100, grade:rows.map(x=>x.grade).find(Boolean) ?? null };
        });
        const totalScore = itemRows.reduce((n,x)=>n+Number(x.score),0);
        const totalMax = itemRows.reduce((n,x)=>n+Number(x.maximum_score),0);
        const present = (a.data ?? []).filter((x:any)=>["PRESENT","LATE","Present","Late"].includes(String(x.status))).length;
        const attendancePct = (a.data ?? []).length ? present/(a.data ?? []).length*100 : null;
        const rc = await db.from("report_cards").upsert({student_id:studentId,term_id:termId,class_id:classId||null,attendance_percentage:attendancePct,average_score:totalMax?totalScore/totalMax*100:null,generated_by:user?.id ?? null,generated_at:new Date().toISOString()},{onConflict:"student_id,term_id"}).select("id,student_id,term_id,class_id,attendance_percentage,average_score,teacher_remark,headteacher_remark,generated_at").single();
        if (rc.error) throw rc.error;
        const rowsWithId = itemRows.map(x=>({...x,report_card_id:rc.data.id}));
        if (rowsWithId.length) { const ir = await db.from("report_card_items").upsert(rowsWithId,{onConflict:"report_card_id,subject_id"}); if (ir.error) throw ir.error; }
        setReport(rc.data); setItems(itemRows); setMessage("Individual report generated and saved successfully.");
      } else if (existing.data) {
        setMessage("Showing the saved individual report. Only authorised administrators can regenerate it.");
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : "The individual report could not be generated."); }
    finally { setBusy(false); }
  };

  const selected = students.find(s=>String(s.id)===studentId);
  const fullName = selected ? [selected.first_name,selected.middle_name,selected.last_name].filter(Boolean).join(" ") : "";
  const attendancePct = report?.attendance_percentage != null ? Number(report.attendance_percentage) : attendance.length ? attendance.filter(x=>["PRESENT","LATE","Present","Late"].includes(String(x.status))).length/attendance.length*100 : null;
  const average = report?.average_score != null ? Number(report.average_score) : results.length ? results.reduce((n,x)=>n+Number(x.score ?? 0),0)/Math.max(1,results.reduce((n,x)=>n+Number(x.maximum_score ?? 100),0))*100 : null;

  if (loading) return <section className="menwe-card grid min-h-[40vh] place-items-center rounded-[1.75rem] p-7"><Loader2 className="animate-spin"/></section>;
  return <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7 print:p-0">
    <div className="print:hidden flex flex-wrap items-start justify-between gap-4"><div><span className="text-xs font-black uppercase tracking-[.14em] text-[var(--gold)]">Academic records</span><h1 className="mt-2 font-serif text-3xl font-semibold">Individual reports</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink)]/60">Generate a clean term report from persisted marks, grades, attendance and report-card records. No scores are invented.</p></div><FileText className="text-[var(--accent)]" size={26}/></div>
    <div className="print:hidden mt-6 grid gap-3 md:grid-cols-4"><select value={studentId} onChange={e=>setStudentId(e.target.value)} className={input}><option value="">Select learner</option>{students.map(s=><option key={text(s.id)} value={text(s.id)}>{[s.first_name,s.middle_name,s.last_name].filter(Boolean).join(" ")} · {text(s.admission_number)}</option>)}</select><select value={yearId} onChange={e=>{setYearId(e.target.value);setTermId("")}} className={input}><option value="">Academic year</option>{years.map(y=><option key={text(y.id)} value={text(y.id)}>{text(y.name)}</option>)}</select><select value={termId} onChange={e=>setTermId(e.target.value)} className={input}><option value="">Term</option>{visibleTerms.map(t=><option key={text(t.id)} value={text(t.id)}>{text(t.name)}</option>)}</select><button type="button" disabled={busy||!studentId||!termId} onClick={()=>void generate()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white disabled:opacity-50">{busy?<Loader2 size={16} className="animate-spin"/>:<RefreshCw size={16}/>} {busy?"Generating…":"Generate report"}</button></div>
    {selected && <article className="mt-8 rounded-2xl border border-[var(--ink)]/15 bg-white p-6 print:border-0 print:p-0"><header className="border-b-2 border-[var(--ink)]/20 pb-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-serif text-3xl font-black">MENWE PRIMARY & JUNIOR SCHOOL</h2><p className="mt-1 text-sm font-semibold text-[var(--ink)]/55">INDIVIDUAL ACADEMIC REPORT</p></div><button type="button" onClick={()=>window.print()} className="print:hidden inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"><Printer size={16}/>Print / Save PDF</button></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-4"><div><span className="text-[var(--ink)]/50">Learner</span><p className="font-bold">{fullName}</p></div><div><span className="text-[var(--ink)]/50">Assessment No.</span><p className="font-bold">{text(selected.admission_number)}</p></div><div><span className="text-[var(--ink)]/50">Year</span><p className="font-bold">{text(years.find(y=>String(y.id)===yearId)?.name)}</p></div><div><span className="text-[var(--ink)]/50">Term</span><p className="font-bold">{text(terms.find(t=>String(t.id)===termId)?.name)}</p></div></div></header>
      <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[var(--ink)]/5 p-4"><span className="text-xs uppercase text-[var(--ink)]/50">Average</span><p className="mt-1 text-2xl font-black">{average == null ? "—" : `${average.toFixed(1)}%`}</p></div><div className="rounded-xl bg-[var(--ink)]/5 p-4"><span className="text-xs uppercase text-[var(--ink)]/50">Attendance</span><p className="mt-1 text-2xl font-black">{attendancePct == null ? "—" : `${attendancePct.toFixed(1)}%`}</p></div><div className="rounded-xl bg-[var(--ink)]/5 p-4"><span className="text-xs uppercase text-[var(--ink)]/50">Subjects</span><p className="mt-1 text-2xl font-black">{items.length || new Set(results.map(x=>String(x.subject_id))).size}</p></div></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-sm"><thead><tr className="border-b-2"><th className="p-3 text-left">Subject</th><th className="p-3 text-left">Score</th><th className="p-3 text-left">Maximum</th><th className="p-3 text-left">Grade</th><th className="p-3 text-left">Teacher comment</th></tr></thead><tbody>{(results.length ? results : items).map((r,i)=><tr key={text(r.id,`${text(r.subject_id)}-${i}`)} className="border-b"><td className="p-3 font-semibold">{text(r.subjects?.name || r.subject_id)}</td><td className="p-3">{text(r.score)}</td><td className="p-3">{text(r.maximum_score)}</td><td className="p-3 font-bold">{text(r.grade)}</td><td className="p-3">{text(r.teacher_comment,"")}</td></tr>)}</tbody></table></div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase text-[var(--ink)]/50">Teacher remark</p><div className="mt-2 min-h-16 rounded-xl border p-3">{text(report?.teacher_remark,"")}</div></div><div><p className="text-xs font-bold uppercase text-[var(--ink)]/50">Headteacher / Principal remark</p><div className="mt-2 min-h-16 rounded-xl border p-3">{text(report?.headteacher_remark,"")}</div></div></div>
      <p className="mt-6 text-[10px] text-[var(--ink)]/45">Generated from Menwe academic records. Saved report cards are shown to authorised users according to school access rules.</p>
    </article>}
    {message && <p role="status" className="mt-5 rounded-xl bg-[var(--gold)]/10 px-4 py-3 text-sm font-semibold">{message}</p>}
    {!admin && teacher && <p className="print:hidden mt-4 text-xs text-[var(--ink)]/50">Teachers can view authorised learner reports. Report regeneration is restricted to school administrators.</p>}
  </section>;
}
