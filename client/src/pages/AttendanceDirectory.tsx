import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { isAdministrator, type AppRole, useSchoolAuth } from "@/contexts/SupabaseAuthContext";

type Row = Record<string, unknown>;
type Status = "Present" | "Absent" | "Late";

const today = new Date().toISOString().slice(0, 10);
const inputClass = "box-border min-h-12 w-full min-w-0 max-w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]";

function friendlyError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  if (/row-level security|permission denied|not authorized/i.test(text)) return "You are not authorized to manage attendance for this school.";
  if (/duplicate|unique constraint|23505/i.test(text)) return "Attendance for one or more learners already exists for this date. Your latest status will be used when you save again.";
  if (/network|fetch|timeout|rate limit|429/i.test(text)) return "Connection issue. Please check your network and try again.";
  return "Attendance could not be saved or loaded. Please try again.";
}

export default function AttendanceDirectory() {
  const { user, profile, loading } = useSchoolAuth();
  const [, setLocation] = useLocation();
  const [classes, setClasses] = useState<Row[]>([]);
  const [periods, setPeriods] = useState<Row[]>([]);
  const [terms, setTerms] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [date, setDate] = useState(today);
  const [records, setRecords] = useState<Record<string, Status>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const role = String(profile?.role || "").toUpperCase() as AppRole;
  const canAccess = useMemo(() => isAdministrator(role) || role === "TEACHER", [role]);

  const load = useCallback(async () => {
    if (!profile?.id || !canAccess) return;
    try {
      const supabase = getSupabase();
      const [periodResult, termResult] = await Promise.all([
        supabase.from("academic_periods").select("id,name,start_date,end_date,is_active").order("start_date", { ascending: false }),
        supabase.from("academic_terms").select("id,name,academic_period_id,start_date,end_date").order("start_date", { ascending: false }),
      ]);
      if (periodResult.error) throw periodResult.error;
      if (termResult.error) throw termResult.error;
      setPeriods(periodResult.data || []);
      setTerms(termResult.data || []);
      if (isAdministrator(role)) {
        const result = await supabase.from("classes").select("id,name,level,grade,teacher_id,teacher_name").order("name");
        if (result.error) throw result.error;
        setClasses(result.data || []);
        return;
      }
      const [assignments, homeroom] = await Promise.all([
        supabase.from("teacher_assignments").select("class_id").eq("teacher_id", profile.id),
        supabase.from("classes").select("id,name,level,grade,teacher_id,teacher_name").eq("teacher_id", profile.id),
      ]);
      if (assignments.error) throw assignments.error;
      if (homeroom.error) throw homeroom.error;
      const ids = [...new Set([...(assignments.data || []).map(item => item.class_id), ...(homeroom.data || []).map(item => item.id)])];
      if (!ids.length) { setClasses([]); return; }
      const result = await supabase.from("classes").select("id,name,level,grade,teacher_id,teacher_name").in("id", ids).order("name");
      if (result.error) throw result.error;
      setClasses(result.data || []);
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }, [canAccess, profile?.id, role]);

  useEffect(() => {
    if (loading) return;
    if (!user) { setLocation("/portal/login"); return; }
    if (!canAccess) { setLocation("/portal/overview"); return; }
    void load();
  }, [canAccess, load, loading, setLocation, user]);

  const loadStudents = useCallback(async () => {
    if (!selectedClass || !selectedPeriod) { setStudents([]); setRecords({}); return; }
    setBusy(true); setMessage(null);
    try {
      const supabase = getSupabase();
      let enrollmentQuery = supabase
        .from("enrollments")
        .select("student_id,students(id,name,admission_number,upi_number)")
        .eq("class_id", selectedClass)
        .eq("academic_period_id", selectedPeriod)
        .eq("status", "Active");
      if (selectedTerm) enrollmentQuery = enrollmentQuery.eq("academic_term_id", selectedTerm);
      const enrollmentResult = await enrollmentQuery;
      if (enrollmentResult.error) throw enrollmentResult.error;
      const unique = new Map<string, Row>();
      for (const row of enrollmentResult.data || []) {
        const student = (row as any).students;
        if (student?.id && student?.upi_number) unique.set(String(student.id), student);
      }
      const nextStudents = [...unique.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
      setStudents(nextStudents);

      const upis = nextStudents.map(student => String(student.upi_number));
      if (!upis.length) { setRecords({}); return; }
      const attendanceResult = await supabase
        .from("daily_attendance")
        .select("id,date,grade_level,learner_upi,status,recorded_by_email")
        .eq("date", date)
        .in("learner_upi", upis);
      if (attendanceResult.error) throw attendanceResult.error;
      const next: Record<string, Status> = {};
      for (const student of nextStudents) {
        const existing = (attendanceResult.data || []).find(record => record.learner_upi === student.upi_number);
        next[String(student.id)] = (existing?.status as Status) || "Present";
      }
      setRecords(next);
    } catch (error) {
      setStudents([]);
      setRecords({});
      setMessage(friendlyError(error));
    } finally { setBusy(false); }
  }, [date, selectedClass, selectedPeriod, selectedTerm]);

  useEffect(() => { void loadStudents(); }, [loadStudents]);

  const save = async () => {
    if (!selectedClass || !selectedPeriod || !students.length || !profile?.id) return;
    setBusy(true); setMessage(null);
    try {
      const supabase = getSupabase();
      const selectedClassRow = classes.find(item => String(item.id) === selectedClass);
      const payload = students.map(student => ({
        date,
        grade_level: String(selectedClassRow?.grade || selectedClassRow?.level || selectedClass),
        learner_upi: String(student.upi_number),
        status: records[String(student.id)] || "Present",
        recorded_by_email: profile.email || user?.email || null,
      }));
      const { error } = await supabase
        .from("daily_attendance")
        .upsert(payload, { onConflict: "date,learner_upi" });
      if (error) throw error;
      setMessage("Attendance saved successfully. Re-marking the same date updates each learner's status.");
      await loadStudents();
    } catch (error) {
      setMessage(friendlyError(error));
    } finally { setBusy(false); }
  };

  if (loading) return <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin" /></div>;

  return <main className="mx-auto w-full max-w-6xl min-w-0 box-border p-4 sm:p-6 lg:p-8"><div className="grid gap-6">
    <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--accent)]">Attendance</p><h1 className="mt-2 font-serif text-4xl font-semibold">Daily attendance</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink)]/60">Attendance is stored in the canonical <code>daily_attendance</code> table using the learner UPI and date as the unique record.</p></div>
    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="grid gap-1.5 text-sm font-semibold">Academic period<select className={inputClass} value={selectedPeriod} onChange={e => { setSelectedPeriod(e.target.value); setSelectedTerm(""); }}><option value="">Select period</option>{periods.map(p => <option key={String(p.id)} value={String(p.id)}>{String(p.name)}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-semibold">Academic term<select className={inputClass} value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}><option value="">All / period level</option>{terms.filter(t => !selectedPeriod || String(t.academic_period_id) === selectedPeriod).map(t => <option key={String(t.id)} value={String(t.id)}>{String(t.name)}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-semibold">Class<select className={inputClass} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}><option value="">Select class</option>{classes.map(c => <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-semibold">Date<input className={inputClass} type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
    </div>{message && <p role="status" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p>}</section>
    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-serif text-2xl font-semibold">Students</h2><p className="mt-1 text-sm text-[var(--ink)]/60">Only active enrolments with a learner UPI can be recorded.</p></div><button disabled={busy || !students.length} onClick={() => void save()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[.98] disabled:opacity-50 sm:w-auto">{busy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}Save attendance</button></div>
      {!selectedClass || !selectedPeriod ? <p className="mt-6 text-sm text-[var(--ink)]/55">Choose an academic period and class to load enrolled students.</p> : students.length === 0 ? <p className="mt-6 text-sm text-[var(--ink)]/55">No active enrolments with UPI numbers matched the selected class and period.</p> : <div className="mt-6 grid grid-cols-1 gap-3 md:hidden">{students.map(student => { const id = String(student.id); return <article key={id} className="w-full min-w-0 max-w-full box-border rounded-2xl border border-[var(--ink)]/10 p-4"><div className="min-w-0"><p className="break-words font-semibold">{String(student.name)}</p><p className="mt-1 break-words text-xs text-[var(--ink)]/55">UPI: {String(student.upi_number)}</p></div><select aria-label={`Attendance status for ${String(student.name)}`} className={`${inputClass} mt-3`} value={records[id] || "Present"} onChange={e => setRecords(current => ({ ...current, [id]: e.target.value as Status }))}><option>Present</option><option>Absent</option><option>Late</option></select></article>; })}</div>}
      {students.length > 0 && <div className="mt-6 hidden overflow-x-auto md:block"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-[.12em] text-[var(--ink)]/45"><th className="px-3 py-3">Student</th><th className="px-3 py-3">UPI</th><th className="px-3 py-3">Status</th></tr></thead><tbody>{students.map(student => <tr key={String(student.id)} className="border-b border-[var(--ink)]/7"><td className="px-3 py-3 font-medium">{String(student.name)}</td><td className="px-3 py-3">{String(student.upi_number)}</td><td className="px-3 py-3"><select aria-label={`Attendance status for ${String(student.name)}`} className={inputClass} value={records[String(student.id)] || "Present"} onChange={e => setRecords(current => ({ ...current, [String(student.id)]: e.target.value as Status }))}><option>Present</option><option>Absent</option><option>Late</option></select></td></tr>)}</tbody></table></div>}
    </section>
  </div></main>;
}
