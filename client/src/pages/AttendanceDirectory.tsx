import { BarChart3, CalendarDays, CheckCircle2, Loader2, Save, Search, Users, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";

type Row = Record<string, unknown>;
type Status = "Present" | "Absent" | "Late";
const today = new Date().toISOString().slice(0, 10);
const input = "min-h-12 w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]";
const text = (v: unknown, fallback = "—") => v == null || v === "" ? fallback : String(v);

export default function AttendanceDirectory() {
  const { user, profile, loading: authLoading } = useSchoolAuth(); const [, navigate] = useLocation();
  const [classes, setClasses] = useState<Row[]>([]); const [years, setYears] = useState<Row[]>([]); const [students, setStudents] = useState<Row[]>([]);
  const [classId, setClassId] = useState(""); const [yearId, setYearId] = useState(""); const [date, setDate] = useState(today); const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Record<string, Status>>({}); const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const role = profile?.role ?? ""; const admin = isAdministrator(role);

  const loadBase = useCallback(async () => {
    if (!user || !profile || (!admin && role !== "TEACHER")) return;
    setLoading(true); setMessage(null);
    try {
      const db = getSupabase();
      const [yearResult, classResult] = await Promise.all([
        db.from("academic_years").select("id,name,starts_on,ends_on,is_current,status").eq("status", "ACTIVE").order("starts_on", { ascending: false }),
        db.from("classes").select("id,academic_year_id,code,name,level,class_teacher_id,status").eq("status", "ACTIVE").order("name")
      ]);
      if (yearResult.error) throw yearResult.error; if (classResult.error) throw classResult.error;
      setYears((yearResult.data ?? []) as Row[]); setClasses((classResult.data ?? []) as Row[]);
      if (!yearId) setYearId(String(yearResult.data?.find(x => x.is_current)?.id ?? yearResult.data?.[0]?.id ?? ""));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Attendance setup could not be loaded."); }
    finally { setLoading(false); }
  }, [admin, profile, role, user, yearId]);

  useEffect(() => { if (authLoading) return; if (!user || !profile) { navigate("/portal/login"); return; } if (!admin && role !== "TEACHER") { navigate("/portal/parent"); return; } void loadBase(); }, [authLoading, admin, loadBase, navigate, profile, role, user]);

  const visibleClasses = useMemo(() => admin ? classes.filter(c => !yearId || String(c.academic_year_id) === yearId) : classes.filter(c => (!yearId || String(c.academic_year_id) === yearId) && String(c.class_teacher_id ?? "") === String(profile?.id ?? "")), [admin, classes, profile?.id, yearId]);

  const loadRegister = useCallback(async () => {
    if (!classId || !yearId) { setStudents([]); setRecords({}); return; }
    setLoading(true); setMessage(null);
    try {
      const db = getSupabase();
      const enrollment = await db.from("enrollments").select("student_id,students(id,admission_number,first_name,middle_name,last_name)").eq("class_id", classId).eq("academic_year_id", yearId).eq("status", "ACTIVE");
      if (enrollment.error) throw enrollment.error;
      const list = (enrollment.data ?? []).map(row => row.students as Row | null).filter(Boolean) as Row[];
      list.sort((a,b) => `${text(a.first_name, "")} ${text(a.last_name, "")}`.localeCompare(`${text(b.first_name, "")} ${text(b.last_name, "")}`)); setStudents(list);
      const session = await db.from("attendance_sessions").select("id").eq("class_id", classId).eq("session_date", date).maybeSingle();
      if (session.error) throw session.error;
      if (!session.data) { setRecords(Object.fromEntries(list.map(s => [String(s.id), "Present"]))); return; }
      const result = await db.from("attendance_records").select("student_id,status").eq("session_id", session.data.id);
      if (result.error) throw result.error;
      const next: Record<string, Status> = Object.fromEntries(list.map(s => [String(s.id), "Present"]));
      for (const row of result.data ?? []) next[String(row.student_id)] = row.status as Status;
      setRecords(next);
    } catch (error) { setStudents([]); setRecords({}); setMessage(error instanceof Error ? error.message : "Attendance register could not be loaded."); }
    finally { setLoading(false); }
  }, [classId, date, yearId]);
  useEffect(() => { void loadRegister(); }, [loadRegister]);

  const visibleStudents = useMemo(() => { const q = query.trim().toLowerCase(); return students.filter(s => !q || [s.first_name,s.middle_name,s.last_name,s.admission_number].map(v => text(v, "")).join(" ").toLowerCase().includes(q)); }, [query, students]);
  const stats = useMemo(() => { const vals = visibleStudents.map(s => records[String(s.id)] ?? "Present"); return { total: vals.length, present: vals.filter(v => v === "Present").length, absent: vals.filter(v => v === "Absent").length, late: vals.filter(v => v === "Late").length }; }, [records, visibleStudents]);

  const save = async () => {
    if (!classId || !yearId || !students.length || !profile?.id) return; setSaving(true); setMessage(null);
    try {
      const db = getSupabase(); let teacherId: string | null = null;
      if (role === "TEACHER") { const teacher = await db.from("teachers").select("id").eq("profile_id", profile.id).maybeSingle(); if (teacher.error) throw teacher.error; teacherId = teacher.data?.id ?? null; if (!teacherId) throw new Error("Your teacher record is not linked yet. Ask an administrator to complete your staff profile."); }
      const sessionResult = await db.from("attendance_sessions").upsert({ class_id: classId, session_date: date, taken_by: teacherId, notes: null }, { onConflict: "class_id,session_date" }).select("id").single();
      if (sessionResult.error) throw sessionResult.error;
      const payload = students.map(student => ({ session_id: sessionResult.data.id, student_id: student.id, status: records[String(student.id)] ?? "Present", remarks: null }));
      const result = await db.from("attendance_records").upsert(payload, { onConflict: "session_id,student_id" }); if (result.error) throw result.error;
      setMessage("Attendance saved to the live register."); await loadRegister();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Attendance could not be saved."); }
    finally { setSaving(false); }
  };

  if (authLoading) return <main className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin text-[var(--accent)]"/></main>;
  return <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8"><header className="rounded-[2rem] bg-[var(--ink)] p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><span className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-[var(--gold)]"><CalendarDays size={14}/> Attendance</span><h1 className="mt-4 font-serif text-4xl font-semibold sm:text-5xl">Attendance command center</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Daily registers are stored as canonical class sessions and learner attendance records.</p></div><button type="button" onClick={() => void loadBase()} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold"><BarChart3 size={17}/>Refresh</button></div></header>{message && <div role="status" className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div>}<section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><article className="menwe-card rounded-2xl p-5"><Users size={20} className="text-[var(--accent)]"/><p className="mt-3 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/50">Learners</p><p className="mt-1 text-3xl font-black">{stats.total}</p></article><article className="menwe-card rounded-2xl p-5"><CheckCircle2 size={20} className="text-[var(--accent)]"/><p className="mt-3 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/50">Present</p><p className="mt-1 text-3xl font-black">{stats.present}</p></article><article className="menwe-card rounded-2xl p-5"><XCircle size={20} className="text-red-600"/><p className="mt-3 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/50">Absent</p><p className="mt-1 text-3xl font-black">{stats.absent}</p></article><article className="menwe-card rounded-2xl p-5"><BarChart3 size={20} className="text-[var(--accent)]"/><p className="mt-3 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/50">Late</p><p className="mt-1 text-3xl font-black">{stats.late}</p></article></section><section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="grid gap-4 md:grid-cols-3"><label className="grid gap-1.5 text-sm font-semibold">Academic year<select className={input} value={yearId} onChange={e => { setYearId(e.target.value); setClassId(""); }}><option value="">Select year</option>{years.map(y => <option key={text(y.id)} value={text(y.id)}>{text(y.name)}</option>)}</select></label><label className="grid gap-1.5 text-sm font-semibold">Class<select className={input} value={classId} onChange={e => setClassId(e.target.value)}><option value="">Select class</option>{visibleClasses.map(c => <option key={text(c.id)} value={text(c.id)}>{text(c.name)} · {text(c.level)}</option>)}</select></label><label className="grid gap-1.5 text-sm font-semibold">Date<input className={input} type="date" value={date} onChange={e => setDate(e.target.value)}/></label></div><label className="mt-4 flex min-h-12 items-center gap-2 rounded-xl border border-[var(--ink)]/15 bg-white px-3"><Search size={17} className="text-[var(--accent)]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search learner or assessment number…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"/></label></section><section className="menwe-card overflow-hidden rounded-[1.75rem] p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-serif text-2xl font-semibold">Daily register</h2><p className="mt-1 text-sm text-[var(--ink)]/55">Select a year and class. A new date starts with Present until the register is saved.</p></div><button type="button" disabled={saving || !students.length} onClick={() => void save()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white disabled:opacity-50 sm:w-auto">{saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}Save attendance</button></div>{!classId || !yearId ? <p className="mt-6 text-sm text-[var(--ink)]/55">Choose an academic year and class to open the live register.</p> : loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[var(--accent)]"/></div> : !visibleStudents.length ? <p className="mt-6 rounded-2xl border border-dashed border-[var(--ink)]/15 px-5 py-10 text-center text-sm text-[var(--ink)]/55">No active learners are enrolled in this class for the selected year.</p> : <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b border-[var(--ink)]/10 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/45"><th className="p-3">Learner</th><th className="p-3">Assessment number</th><th className="p-3">Status</th></tr></thead><tbody>{visibleStudents.map(s => { const full = [s.first_name,s.middle_name,s.last_name].filter(Boolean).join(" "); return <tr key={text(s.id)} className="border-b border-[var(--ink)]/7"><td className="p-3 font-semibold">{full}</td><td className="p-3">{text(s.admission_number)}</td><td className="p-3"><select className={input} value={records[text(s.id)] ?? "Present"} onChange={e => setRecords(current => ({ ...current, [text(s.id)]: e.target.value as Status }))}><option>Present</option><option>Absent</option><option>Late</option></select></td></tr>; })}</tbody></table></div>}</section></main>;
}
