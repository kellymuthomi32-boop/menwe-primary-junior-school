import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, CalendarDays, FileText, GraduationCap, LogOut, MessageSquare, UserRound } from "lucide-react";
import { Link, useLocation } from "wouter";
import { PortalLayout } from "@/components/PortalLayout";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import ParentAssistant from "@/components/ParentAssistant";
import { getSupabase } from "@/lib/supabase";

type Student = { id: string; name: string; admission_number: string };
type AttendanceSummary = { total: number; present: number; absent: number; late: number };
type StudentParentRow = { student_id: string | null };
type StudentRow = { id: string; admission_number: string; first_name: string | null; middle_name: string | null; last_name: string | null };
type AttendanceRow = { status: string | null };
const EMPTY_ATTENDANCE: AttendanceSummary = { total: 0, present: 0, absent: 0, late: 0 };

function friendlyError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  if (/network|fetch|timeout|429/i.test(text)) return "Connection issue. Please check your network and try again.";
  if (/row-level security|permission denied|not authorized/i.test(text)) return "You are not authorised to view these learner records.";
  return "Learner information could not be loaded. Please try again.";
}

export default function ParentDashboardPage() {
  const { user, profile, loading, signOut } = useSchoolAuth();
  const [, go] = useLocation();
  const isStudent = profile?.role === "STUDENT";
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState("");
  const [attendance, setAttendance] = useState<AttendanceSummary>(EMPTY_ATTENDANCE);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id || profile?.status !== "ACTIVE" || !["PARENT", "STUDENT"].includes(profile.role)) return;
    setBusy(true);
    setMessage(null);
    try {
      const db = getSupabase();
      let ids: string[] = [];
      if (isStudent) {
        const { data, error } = await db.from("students").select("id").eq("profile_id", user.id).eq("status", "ACTIVE").maybeSingle();
        if (error) throw error;
        if (data?.id) ids = [data.id];
      } else {
        const { data: parent, error: parentError } = await db.from("parents").select("id").eq("profile_id", user.id).maybeSingle();
        if (parentError) throw parentError;
        if (!parent) {
          setStudents([]);
          setAttendance(EMPTY_ATTENDANCE);
          setMessage("Your account is active, but the parent record is not linked yet. Please contact school administration.");
          return;
        }
        const { data: links, error: linkError } = await db.from("student_parents").select("student_id").eq("parent_id", parent.id);
        if (linkError) throw linkError;
        ids = [...new Set((links ?? []).map((row: StudentParentRow) => row.student_id).filter((id): id is string => Boolean(id)))];
      }
      if (ids.length === 0) {
        setStudents([]);
        setAttendance(EMPTY_ATTENDANCE);
        setMessage(isStudent ? "Your learner record is not linked yet. Please contact school administration." : "Your account is active, but no learner is linked yet. Please contact school administration.");
        return;
      }
      const { data, error } = await db.from("students").select("id,admission_number,first_name,middle_name,last_name").in("id", ids).eq("status", "ACTIVE").order("first_name");
      if (error) throw error;
      const rows: Student[] = (data ?? []).map((student: StudentRow) => ({ id: student.id, name: [student.first_name, student.middle_name, student.last_name].filter((part): part is string => Boolean(part?.trim())).join(" ") || "Learner", admission_number: student.admission_number }));
      setStudents(rows);
      setSelected(current => rows.some(row => row.id === current) ? current : rows[0]?.id ?? "");
    } catch (error) {
      setStudents([]);
      setAttendance(EMPTY_ATTENDANCE);
      setMessage(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }, [isStudent, profile?.role, profile?.status, user?.id]);

  useEffect(() => {
    if (loading) return;
    if (!user || !profile || profile.status !== "ACTIVE" || !["PARENT", "STUDENT"].includes(profile.role)) {
      go("/portal/login");
      return;
    }
    void load();
  }, [go, load, loading, profile, user]);

  const learner = useMemo(() => students.find(student => student.id === selected) ?? students[0] ?? null, [selected, students]);

  useEffect(() => {
    if (!learner) {
      setAttendance(EMPTY_ATTENDANCE);
      return;
    }
    let active = true;
    const loadAttendance = async () => {
      try {
        const db = getSupabase();
        const { data: student, error: studentError } = await db.from("students").select("upi_number").eq("id", learner.id).maybeSingle();
        if (studentError) throw studentError;
        const upi = typeof student?.upi_number === "string" ? student.upi_number : "";
        if (!upi) {
          if (active) setAttendance(EMPTY_ATTENDANCE);
          return;
        }
        const { data, error } = await db.from("daily_attendance").select("status").eq("learner_upi", upi);
        if (error) throw error;
        const summary = (data ?? []).reduce<AttendanceSummary>((result, row: AttendanceRow) => {
          const status = String(row.status ?? "").toLowerCase();
          result.total += 1;
          if (status === "present") result.present += 1;
          else if (status === "absent") result.absent += 1;
          else if (status === "late") result.late += 1;
          return result;
        }, { ...EMPTY_ATTENDANCE });
        if (active) setAttendance(summary);
      } catch (error) {
        if (active) setMessage(friendlyError(error));
      }
    };
    void loadAttendance();
    return () => { active = false; };
  }, [learner]);

  const attendanceRate = attendance.total > 0 ? Math.round(((attendance.present + attendance.late) / attendance.total) * 100) : null;
  const logout = async () => { await signOut(); go("/portal/login"); };
  const firstName = profile?.display_name?.split(/\s+/)[0] || (isStudent ? "Learner" : "Parent");

  if (loading || busy) return <PortalLayout role={isStudent ? "STUDENT" : "PARENT"}><main className="mx-auto grid min-h-[70vh] w-full max-w-7xl place-items-center px-4"><div className="grid w-full max-w-3xl gap-4"><div className="h-52 animate-pulse rounded-[2rem] bg-[var(--mist)]"/><div className="grid gap-4 sm:grid-cols-3"><div className="h-28 animate-pulse rounded-2xl bg-[var(--mist)]"/><div className="h-28 animate-pulse rounded-2xl bg-[var(--mist)]"/><div className="h-28 animate-pulse rounded-2xl bg-[var(--mist)]"/></div></div></main></PortalLayout>;

  return <PortalLayout role={isStudent ? "STUDENT" : "PARENT"}>
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <header className="menwe-admin-hero rounded-[2rem] p-6 text-white shadow-xl sm:p-8">
        <p className="menwe-admin-kicker"><GraduationCap size={14}/> {isStudent ? "Student workspace" : "Family workspace"}</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold sm:text-5xl">Welcome, {firstName}.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Secure access to {isStudent ? "your" : "linked learner"} progress, attendance, academic records and school communication.</p>
        <button type="button" onClick={() => void logout()} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 font-bold transition hover:bg-white/10"><LogOut size={16}/> Sign out</button>
      </header>
      {message && <div role="alert" className="flex gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800"><AlertCircle size={18} className="mt-0.5 shrink-0"/>{message}</div>}
      {learner && <>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="menwe-card rounded-2xl p-5"><UserRound size={20} className="text-[var(--accent)]"/><p className="mt-3 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/50">{isStudent ? "Your learner record" : "Linked learner"}</p><p className="mt-1 truncate text-xl font-bold">{learner.name}</p><p className="mt-1 text-sm text-[var(--ink)]/55">{learner.admission_number}</p></article>
          <article className="menwe-card rounded-2xl p-5"><CalendarDays size={20} className="text-[var(--accent)]"/><p className="mt-3 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/50">Attendance</p><p className="mt-1 text-2xl font-black">{attendanceRate === null ? "—" : `${attendanceRate}%`}</p><p className="mt-1 text-sm text-[var(--ink)]/55">{attendance.total ? `${attendance.present} present · ${attendance.absent} absent` : "No records yet"}</p></article>
          <Link href="/portal/report-cards" className="menwe-card menwe-interactive rounded-2xl p-5"><BarChart3 size={20} className="text-[var(--accent)]"/><p className="mt-3 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/50">Performance</p><p className="mt-1 text-lg font-bold">Report cards</p><p className="mt-1 text-sm text-[var(--accent)]">View academic results →</p></Link>
          <Link href="/portal/messages" className="menwe-card menwe-interactive rounded-2xl p-5"><MessageSquare size={20} className="text-[var(--accent)]"/><p className="mt-3 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/50">Communication</p><p className="mt-1 text-lg font-bold">School messages</p><p className="mt-1 text-sm text-[var(--accent)]">Open protected inbox →</p></Link>
        </section>
        {students.length > 1 && <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><label className="block text-sm font-bold">Select learner<select aria-label="Select learner" value={learner.id} onChange={event => setSelected(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--ink)]/15 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]">{students.map(student => <option key={student.id} value={student.id}>{student.name} · {student.admission_number}</option>)}</select></label></section>}
        <section className="grid gap-4 lg:grid-cols-2">
          <Link href="/portal/attendance" className="menwe-card menwe-interactive rounded-[1.75rem] p-6"><CalendarDays className="text-[var(--accent)]"/><h2 className="mt-4 font-serif text-2xl font-semibold">Attendance records</h2><p className="mt-2 text-sm leading-6 text-[var(--ink)]/60">Open the protected attendance workspace for records permitted to your account.</p></Link>
          <Link href="/portal/report-cards" className="menwe-card menwe-interactive rounded-[1.75rem] p-6"><FileText className="text-[var(--accent)]"/><h2 className="mt-4 font-serif text-2xl font-semibold">Academic performance</h2><p className="mt-2 text-sm leading-6 text-[var(--ink)]/60">Open report cards and academic results for the linked learner.</p></Link>
        </section>
      </>}
      <section><ParentAssistant/></section>
    </main>
  </PortalLayout>;
}
