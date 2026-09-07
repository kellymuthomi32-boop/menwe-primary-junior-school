import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Loader2, Plus, Save } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";

type Row = Record<string, any>;
const ADMINS = ["SUPER_ADMIN","ADMIN","HEAD_OF_INSTITUTION","DEPUTY_HOI"];
const input = "min-h-11 w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]";
const text = (v: unknown, fallback = "—") => v == null || v === "" ? fallback : String(v);

export default function EntryExamsPage() {
  const { user, profile } = useSchoolAuth();
  const admin = ADMINS.includes(profile?.role ?? "");
  const [exams,setExams] = useState<Row[]>([]), [applications,setApplications] = useState<Row[]>([]), [results,setResults] = useState<Row[]>([]);
  const [name,setName] = useState("Entry Assessment"), [grade,setGrade] = useState(""), [date,setDate] = useState(new Date().toISOString().slice(0,10)), [duration,setDuration] = useState("60"), [max,setMax] = useState("100");
  const [examId,setExamId] = useState(""), [applicationId,setApplicationId] = useState(""), [score,setScore] = useState(""), [remarks,setRemarks] = useState(""), [status,setStatus] = useState("DRAFT");
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [message,setMessage] = useState<string|null>(null);

  const refresh = async () => {
    if (!admin) return;
    setLoading(true); setMessage(null);
    try {
      const db = getSupabase();
      const [e,a] = await Promise.all([
        db.from("entry_exams").select("id,name,grade_applying_for,exam_date,duration_minutes,maximum_score,status,created_at").order("exam_date",{ascending:false}),
        db.from("admission_applications").select("id,reference,student_first_name,student_last_name,grade_applying_for,status").order("created_at",{ascending:false})
      ]);
      if (e.error) throw e.error; if (a.error) throw a.error;
      setExams(e.data ?? []); setApplications(a.data ?? []);
      if (!examId && e.data?.[0]) setExamId(String(e.data[0].id));
    } catch (e) { setMessage(e instanceof Error ? e.message : "Entry exam workspace could not be loaded."); }
    finally { setLoading(false); }
  };
  useEffect(()=>{void refresh()},[admin]);

  const selectedExam = exams.find(x=>String(x.id)===examId);
  const visibleApplications = useMemo(()=>applications.filter(a=>!selectedExam?.grade_applying_for || String(a.grade_applying_for).toLowerCase()===String(selectedExam.grade_applying_for).toLowerCase() || String(a.grade_applying_for).toLowerCase().includes(String(selectedExam.grade_applying_for).toLowerCase())),[applications,selectedExam]);

  const createExam = async (e: React.FormEvent) => {
    e.preventDefault(); if (!admin || !user || !name.trim() || !grade.trim()) return;
    setBusy(true); setMessage(null);
    try {
      const r = await getSupabase().from("entry_exams").insert({name:name.trim(),grade_applying_for:grade.trim(),exam_date:date,duration_minutes:Number(duration),maximum_score:Number(max),status,created_by:user.id}).select("id").single();
      if (r.error) throw r.error;
      setExamId(String(r.data.id)); setMessage("Entry exam created successfully."); await refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : "The entry exam could not be created."); }
    finally { setBusy(false); }
  };

  const loadResult = async (appId:string) => {
    setApplicationId(appId); setScore(""); setRemarks(""); if (!examId) return;
    const r = await getSupabase().from("entry_exam_results").select("score,maximum_score,grade,remarks").eq("entry_exam_id",examId).eq("application_id",appId).maybeSingle();
    if (r.error) { setMessage(r.error.message); return; }
    if (r.data) { setScore(text(r.data.score,"")); setRemarks(text(r.data.remarks,"")); }
  };

  const saveResult = async () => {
    if (!admin || !user || !examId || !applicationId) return;
    const n = Number(score), m = Number(selectedExam?.maximum_score ?? max);
    if (!Number.isFinite(n) || n < 0 || n > m) { setMessage(`Score must be between 0 and ${m}.`); return; }
    setBusy(true); setMessage(null);
    try {
      const r = await getSupabase().from("entry_exam_results").upsert({entry_exam_id:examId,application_id:applicationId,score:n,maximum_score:m,remarks:remarks.trim()||null,entered_by:user.id},{onConflict:"entry_exam_id,application_id"});
      if (r.error) throw r.error;
      setMessage("Entry exam result saved successfully.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "The entry exam result could not be saved."); }
    finally { setBusy(false); }
  };

  if (!admin) return <PortalLayout role={profile?.role ?? "PARENT"}><main className="mx-auto max-w-5xl p-6"><section className="menwe-card rounded-[1.75rem] p-7"><h1 className="font-serif text-3xl font-semibold">Entry examinations</h1><p className="mt-2 text-sm text-[var(--ink)]/60">Entry examination management is restricted to school administrators.</p></section></main></PortalLayout>;
  return <PortalLayout role={profile?.role ?? "ADMIN"}><main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="flex items-start gap-3"><ClipboardCheck className="mt-1 text-[var(--gold)]"/><div><span className="text-xs font-black uppercase tracking-[.14em] text-[var(--gold)]">Admissions</span><h1 className="mt-2 font-serif text-3xl font-semibold">Entry examinations</h1><p className="mt-2 text-sm text-[var(--ink)]/60">Create entry assessments for applicants and record their results securely.</p></div></div>
      <form onSubmit={createExam} className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5"><input className={input} value={name} onChange={e=>setName(e.target.value)} placeholder="Assessment name" required/><input className={input} value={grade} onChange={e=>setGrade(e.target.value)} placeholder="Grade / class applying for" required/><input className={input} type="date" value={date} onChange={e=>setDate(e.target.value)} required/><input className={input} type="number" min="1" value={duration} onChange={e=>setDuration(e.target.value)} placeholder="Minutes"/><input className={input} type="number" min="1" value={max} onChange={e=>setMax(e.target.value)} placeholder="Maximum score"/><select className={input} value={status} onChange={e=>setStatus(e.target.value)}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select><button disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white disabled:opacity-50 md:col-span-2 xl:col-span-4">{busy?<Loader2 size={16} className="animate-spin"/>:<Plus size={16}/>}Create entry exam</button></form>
    </section>
    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><h2 className="font-serif text-2xl font-semibold">Record applicant result</h2>{loading?<div className="flex justify-center py-10"><Loader2 className="animate-spin"/></div>:<div className="mt-5 grid gap-4 md:grid-cols-2"><select className={input} value={examId} onChange={e=>{setExamId(e.target.value);setApplicationId("")}}><option value="">Select entry exam</option>{exams.map(e=><option key={text(e.id)} value={text(e.id)}>{text(e.name)} · {text(e.grade_applying_for)} · {text(e.exam_date)} · {text(e.status)}</option>)}</select><select className={input} value={applicationId} onChange={e=>void loadResult(e.target.value)} disabled={!examId}><option value="">Select applicant</option>{visibleApplications.map(a=><option key={text(a.id)} value={text(a.id)}>{text(a.reference)} · {[a.student_first_name,a.student_last_name].filter(Boolean).join(" ")} · {text(a.status)}</option>)}</select><input className={input} type="number" min="0" max={selectedExam?.maximum_score ?? max} step="0.01" value={score} onChange={e=>setScore(e.target.value)} placeholder={`Score / ${selectedExam?.maximum_score ?? max}`}/><input className={input} value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Remarks"/><button type="button" disabled={busy||!examId||!applicationId} onClick={()=>void saveResult()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white disabled:opacity-50 md:col-span-2">{busy?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>}Save applicant result</button></div>}{message&&<p role="status" className="mt-5 rounded-xl bg-[var(--gold)]/10 px-4 py-3 text-sm font-semibold">{message}</p>}</section>
  </main></PortalLayout>;
}
