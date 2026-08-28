import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { isAdministrator, type AppRole, useSchoolAuth } from "@/contexts/SupabaseAuthContext";

type Row = Record<string, unknown>;
type Status = "Present" | "Absent" | "Late";

const today = new Date().toISOString().slice(0, 10);
const inputClass = "w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]";

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
  }, [canAccess, profile?.id, role]);

  useEffect(() => {
    if (loading) return;
    if (!user) { setLocation("/portal/login"); return; }
    if (!canAccess) { setLocation("/portal/overview"); return; }
    void load().catch(error => setMessage(error instanceof Error ? error.message : "Attendance setup could not be loaded."));
  }, [canAccess, load, loading, setLocation, user]);

  const loadStudents = useCallback(async () => {
    if (!selectedClass || !selectedPeriod) { setStudents([]); setRecords({}); return; }
    setBusy(true); setMessage(null);
    try {
      const supabase = getSupabase();
      let enrollmentQuery = supabase.from("enrollments").select("student_id,students(id,name,admission_number)").eq("class_id", selectedClass).eq("academic_period_id", selectedPeriod).eq("status", "Active");
      if (selectedTerm) enrollmentQuery = enrollmentQuery.eq("academic_term_id", selectedTerm);
      const [enrollmentResult, attendanceResult] = await Promise.all([
        enrollmentQuery,
        supabase.from("attendance").select("id,student_id,status").eq("class_id", selectedClass).eq("attendance_date", date)
      ]);
      if (enrollmentResult.error) throw enrollmentResult.error;
      if (attendanceResult.error) throw attendanceResult.error;
      const unique = new Map<string, Row>();
      for (const row of enrollmentResult.data || []) {
        const student = (row as any).students;
        if (student?.id) unique.set(student.id, student);
      }
      const nextStudents = [...unique.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
      setStudents(nextStudents);
      const next: Record<string, Status> = {};
      for (const student of nextStudents) {
        const existing = (attendanceResult.data || []).find((record: any) => record.student_id === student.id);
        next[String(student.id)] = (existing?.status as Status) || "Present";
      }
      setRecords(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Students could not be loaded.");
    } finally { setBusy(false); }
  }, [date, selectedClass, selectedPeriod, selectedTerm]);

  useEffect(() => { void loadStudents(); }, [loadStudents]);

  const save = async () => {
    if (!selectedClass || !selectedPeriod || !students.length || !profile?.id) return;
    setBusy(true); setMessage(null);
    try {
      const supabase = getSupabase();
      for (const student of students) {
        const studentId = String(student.id);
        const existing = await supabase.from("attendance").select("id").eq("student_id", studentId).eq("class_id", selectedClass).eq("attendance_date", date).limit(1);
        if (existing.error) throw existing.error;
        const payload = { student_id: studentId, class_id: selectedClass, academic_period_id: selectedPeriod, academic_term_id: selectedTerm || null, attendance_date: date, status: records[studentId] || "Present", recorded_by: profile.id };
        const id = existing.data?.[0]?.id;
        const result = id ? await supabase.from("attendance").update(payload).eq("id", id) : await supabase.from("attendance").insert(payload);
        if (result.error) throw result.error;
      }
      setMessage("Attendance saved to Supabase. Reloading verifies the persisted records.");
      await loadStudents();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Attendance could not be saved.");
    } finally { setBusy(false); }
  };

  if (loading) return <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin" /></div>;

  return <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8"><div className="grid gap-6">
    <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--accent)]">Attendance</p><h1 className="mt-2 font-serif text-4xl font-semibold">Daily attendance</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink)]/60">Records are written directly to the canonical attendance table. The page does not create legacy attendance sessions.</p></div>
    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="grid gap-1.5 text-sm font-semibold">Academic period<select className={inputClass} value={selectedPeriod} onChange={e => { setSelectedPeriod(e.target.value); setSelectedTerm(""); }}><option value="">Select period</option>{periods.map(p => <option key={String(p.id)} value={String(p.id)}>{String(p.name)}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-semibold">Academic term<select className={inputClass} value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}><option value="">All / period level</option>{terms.filter(t => !selectedPeriod || String(t.academic_period_id) === selectedPeriod).map(t => <option key={String(t.id)} value={String(t.id)}>{String(t.name)}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-semibold">Class<select className={inputClass} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}><option value="">Select class</option>{classes.map(c => <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-semibold">Date<input className={inputClass} type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
    </div>{message && <p className={`mt-4 rounded-xl px-4 py-3 text-sm ${message.includes("could not") || message.includes("denied") ? "bg-red-50 text-red-800" : "bg-[var(--sage)]/16 text-[var(--accent)]"}`}>{message}</p>}</section>
    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="flex items-center justify-between gap-4"><div><h2 className="font-serif text-2xl font-semibold">Students</h2><p className="mt-1 text-sm text-[var(--ink)]/60">Only active canonical enrolments are loaded.</p></div><button disabled={busy || !students.length} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}Save attendance</button></div>
      {!selectedClass || !selectedPeriod ? <p className="mt-6 text-sm text-[var(--ink)]/55">Choose an academic period and class to load enrolled students.</p> : students.length === 0 ? <p className="mt-6 text-sm text-[var(--ink)]/55">No active enrolments matched the selected class and period.</p> : <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-[.12em] text-[var(--ink)]/45"><th className="px-3 py-3">Student</th><th className="px-3 py-3">Admission</th><th className="px-3 py-3">Status</th></tr></thead><tbody>{students.map(student => <tr key={String(student.id)} className="border-b border-[var(--ink)]/7"><td className="px-3 py-3 font-medium">{String(student.name)}</td><td className="px-3 py-3">{String(student.admission_number)}</td><td className="px-3 py-3"><select className={inputClass} value={records[String(student.id)] || "Present"} onChange={e => setRecords(current => ({ ...current, [String(student.id)]: e.target.value as Status }))}><option>Present</option><option>Absent</option><option>Late</option></select></td></tr>)}</tbody></table></div>}
    </section>
  </div></main>;
}