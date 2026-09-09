import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, BarChart3, Bell, BookOpen, BookOpenCheck, CalendarDays, CheckCircle2, Clock3, CreditCard, FileText, GraduationCap, LibraryBig, LogOut, MessageSquare, RefreshCw, TrendingUp, UserRound } from "lucide-react";
import { Link, useLocation } from "wouter";
import { PortalLayout } from "@/components/PortalLayout";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import ParentAssistant from "@/components/ParentAssistant";
import { getSupabase } from "@/lib/supabase";

type Student = { id: string; name: string; admission_number: string; gender: string | null };
type AttendanceSummary = { total: number; present: number; absent: number; late: number; excused: number };
type Enrollment = { student_id: string; class_id: string; stream_id: string | null };
type ClassRow = { id: string; name: string; code: string; level: string };
type Subject = { id: string; name: string; code: string };
type Exam = { id: string; name: string; exam_type: string | null; starts_on: string | null; ends_on: string | null; class_id: string; term_id: string };
type Result = { exam_id: string; subject_id: string; score: number; maximum_score: number; grade: string | null; teacher_comment: string | null };
type Homework = { id: string; class_id: string; subject_id: string; title: string; instructions: string; due_at: string | null; status: string };
type Submission = { homework_id: string; submitted_at: string; marked_at: string | null; mark: number | null; feedback: string | null };
type Invoice = { id: string; invoice_number: string; amount?: number; status: string; due_on: string | null };
type Payment = { invoice_id: string; amount: number; status: string; paid_at: string | null };
type Notification = { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };
type Announcement = { id: string; title: string; body: string; target_class_id: string | null; published_at: string | null; created_at: string };
type TimetableEntry = { id: string; class_id: string; subject_id: string; day_of_week: number; starts_at: string; ends_at: string; room: string | null };

const EMPTY_ATTENDANCE: AttendanceSummary = { total: 0, present: 0, absent: 0, late: 0, excused: 0 };
const money = (value: number) => `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
const shortDate = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short" }).format(new Date(value)) : "—";
const friendlyError = (error: unknown) => { const text = error instanceof Error ? error.message : String(error); if (/network|fetch|timeout|429/i.test(text)) return "Connection issue. Please check your network and try again."; if (/row-level security|permission denied|not authorized/i.test(text)) return "Some learner records are restricted by school permissions."; return "Learner information could not be loaded completely. Please try again."; };

export default function ParentDashboardPage() {
  const { user, profile, loading, signOut } = useSchoolAuth();
  const [, go] = useLocation();
  const isStudent = profile?.role === "STUDENT";
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState("");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary>(EMPTY_ATTENDANCE);
  const [results, setResults] = useState<Result[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [termName, setTermName] = useState("Current term");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id || profile?.status !== "ACTIVE" || !["PARENT", "STUDENT"].includes(profile.role)) return;
    setBusy(true); setMessage(null);
    try {
      const db = getSupabase();
      let ids: string[] = [];
      if (isStudent) {
        const { data, error } = await db.from("students").select("id").eq("profile_id", user.id).eq("status", "ACTIVE").maybeSingle();
        if (error) throw error; if (data?.id) ids = [data.id];
      } else {
        const { data: parent, error: parentError } = await db.from("parents").select("id").eq("profile_id", user.id).maybeSingle();
        if (parentError) throw parentError;
        if (!parent) { setStudents([]); setMessage("Your account is active, but the parent record is not linked yet. Please contact school administration."); return; }
        const { data: links, error: linkError } = await db.from("student_parents").select("student_id").eq("parent_id", parent.id);
        if (linkError) throw linkError;
        ids = [...new Set((links ?? []).map((row: { student_id: string | null }) => row.student_id).filter((id): id is string => Boolean(id)))];
      }
      if (!ids.length) { setStudents([]); setMessage(isStudent ? "Your learner record is not linked yet. Please contact school administration." : "Your account is active, but no learner is linked yet. Please contact school administration."); return; }

      const [studentRes, enrollmentRes, yearRes, notificationRes] = await Promise.all([
        db.from("students").select("id,admission_number,first_name,middle_name,last_name,gender").in("id", ids).eq("status", "ACTIVE").order("first_name"),
        db.from("enrollments").select("student_id,class_id,stream_id").in("student_id", ids).eq("status", "ACTIVE"),
        db.from("terms").select("id,name,academic_year_id").eq("is_current", true).eq("status", "ACTIVE").maybeSingle(),
        db.from("notifications").select("id,title,body,link,read_at,created_at").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);
      if (studentRes.error) throw studentRes.error;
      if (enrollmentRes.error) throw enrollmentRes.error;
      const rows: Student[] = (studentRes.data ?? []).map((student: { id: string; admission_number: string; first_name: string | null; middle_name: string | null; last_name: string | null; gender: string | null }) => ({ id: student.id, name: [student.first_name, student.middle_name, student.last_name].filter((part): part is string => Boolean(part?.trim())).join(" ") || "Learner", admission_number: student.admission_number, gender: student.gender }));
      setStudents(rows); setSelected(current => rows.some(row => row.id === current) ? current : rows[0]?.id ?? "");
      setEnrollments(enrollmentRes.data ?? []);
      setTermName(yearRes.data?.name ?? "Current term");
      setNotifications(notificationRes.error ? [] : ((notificationRes.data ?? []) as Notification[]));

      const classIds = [...new Set((enrollmentRes.data ?? []).map((row: Enrollment) => row.class_id))];
      if (!classIds.length) { setClasses([]); return; }
      const [classRes, subjectRes] = await Promise.all([
        db.from("classes").select("id,name,code,level").in("id", classIds).eq("status", "ACTIVE"),
        db.from("subjects").select("id,name,code").eq("status", "ACTIVE").order("name"),
      ]);
      if (classRes.error) throw classRes.error; setClasses((classRes.data ?? []) as ClassRow[]);
      if (!subjectRes.error) setSubjects((subjectRes.data ?? []) as Subject[]);
    } catch (error) { setStudents([]); setMessage(friendlyError(error)); }
    finally { setBusy(false); }
  }, [isStudent, profile?.role, profile?.status, user?.id]);

  useEffect(() => { if (loading) return; if (!user || !profile || profile.status !== "ACTIVE" || !["PARENT", "STUDENT"].includes(profile.role)) { go("/portal/login"); return; } void load(); }, [go, load, loading, profile, user]);

  const learner = useMemo(() => students.find(student => student.id === selected) ?? students[0] ?? null, [selected, students]);
  const learnerEnrollment = useMemo(() => enrollments.find(row => row.student_id === learner?.id) ?? null, [enrollments, learner]);
  const learnerClass = useMemo(() => classes.find(row => row.id === learnerEnrollment?.class_id) ?? null, [classes, learnerEnrollment]);
  const unreadNotifications = notifications.filter(item => !item.read_at).length;

  useEffect(() => {
    if (!learner) { setAttendance(EMPTY_ATTENDANCE); setResults([]); setExams([]); setHomework([]); setSubmissions([]); setInvoices([]); setPayments([]); setAnnouncements([]); setTimetable([]); return; }
    let active = true;
    const loadLearnerData = async () => {
      try {
        const db = getSupabase();
        const classId = learnerEnrollment?.class_id;
        const [sessionsRes, examsRes, homeworkRes, invoicesRes, announcementsRes, timetableRes] = await Promise.all([
          db.from("attendance_sessions").select("id").eq("class_id", classId ?? "").order("session_date", { ascending: false }).limit(120),
          db.from("exams").select("id,name,exam_type,starts_on,ends_on,class_id,term_id").eq("class_id", classId ?? "").eq("status", "PUBLISHED").order("starts_on", { ascending: false }).limit(20),
          db.from("homework").select("id,class_id,subject_id,title,instructions,due_at,status").eq("class_id", classId ?? "").eq("status", "PUBLISHED").order("due_at", { ascending: true }).limit(12),
          db.from("invoices").select("id,invoice_number,status,due_on").eq("student_id", learner.id).order("issued_on", { ascending: false }).limit(20),
          db.from("announcements").select("id,title,body,target_class_id,published_at,created_at").eq("status", "PUBLISHED").order("published_at", { ascending: false }).limit(8),
          db.from("timetable_entries").select("id,class_id,subject_id,day_of_week,starts_at,ends_at,room").eq("class_id", classId ?? "").order("day_of_week").order("starts_at"),
        ]);
        if (!active) return;
        if (sessionsRes.error) throw sessionsRes.error;
        const sessionIds = (sessionsRes.data ?? []).map((row: { id: string }) => row.id);
        let attendanceSummary = EMPTY_ATTENDANCE;
        if (sessionIds.length) {
          const { data, error } = await db.from("attendance_records").select("status").eq("student_id", learner.id).in("session_id", sessionIds);
          if (error) throw error;
          attendanceSummary = (data ?? []).reduce<AttendanceSummary>((out, row: { status: string | null }) => { const status = String(row.status ?? "").toLowerCase(); out.total += 1; if (status === "present") out.present += 1; else if (status === "absent") out.absent += 1; else if (status === "late") out.late += 1; else if (status === "excused") out.excused += 1; return out; }, { ...EMPTY_ATTENDANCE });
        }
        setAttendance(attendanceSummary);
        const examRows = (examsRes.data ?? []) as Exam[]; setExams(examRows);
        if (examRows.length) { const { data } = await db.from("exam_results").select("exam_id,subject_id,score,maximum_score,grade,teacher_comment").eq("student_id", learner.id).in("exam_id", examRows.map(row => row.id)); setResults((data ?? []) as Result[]); } else setResults([]);
        const homeworkRows = (homeworkRes.data ?? []) as Homework[]; setHomework(homeworkRows);
        if (homeworkRows.length) { const { data } = await db.from("homework_submissions").select("homework_id,submitted_at,marked_at,mark,feedback").eq("student_id", learner.id).in("homework_id", homeworkRows.map(row => row.id)); setSubmissions((data ?? []) as Submission[]); } else setSubmissions([]);
        setInvoices((invoicesRes.data ?? []) as Invoice[]);
        if ((invoicesRes.data ?? []).length) { const { data } = await db.from("payments").select("invoice_id,amount,status,paid_at").in("invoice_id", (invoicesRes.data ?? []).map((row: Invoice) => row.id)); setPayments((data ?? []) as Payment[]); } else setPayments([]);
        setAnnouncements(((announcementsRes.data ?? []) as Announcement[]).filter(item => !item.target_class_id || item.target_class_id === classId).slice(0, 4));
        setTimetable((timetableRes.data ?? []) as TimetableEntry[]);
      } catch (error) { if (active) setMessage(friendlyError(error)); }
    };
    void loadLearnerData(); return () => { active = false; };
  }, [learner, learnerEnrollment?.class_id]);

  const attendanceRate = attendance.total ? Math.round(((attendance.present + attendance.late) / attendance.total) * 100) : null;
  const averageScore = results.length ? Math.round(results.reduce((sum, row) => sum + (Number(row.maximum_score) ? (Number(row.score) / Number(row.maximum_score)) * 100 : 0), 0) / results.length) : null;
  const submittedIds = new Set(submissions.map(item => item.homework_id));
  const pendingHomework = homework.filter(item => !submittedIds.has(item.id) && (!item.due_at || new Date(item.due_at).getTime() >= Date.now())).slice(0, 4);
  const outstanding = invoices.reduce((sum, invoice) => { const invoiceTotal = Number((invoice as Invoice & { total_amount?: number }).total_amount ?? 0); const paid = payments.filter(payment => payment.invoice_id === invoice.id && payment.status === "VERIFIED").reduce((p, payment) => p + Number(payment.amount), 0); return sum + Math.max(0, invoiceTotal - paid); }, 0);
  const today = new Date().getDay() || 7;
  const todayLessons = timetable.filter(item => item.day_of_week === today).slice(0, 4);
  const subjectName = (id: string) => subjects.find(subject => subject.id === id)?.name ?? "Subject";
  const examName = (id: string) => exams.find(exam => exam.id === id)?.name ?? "Assessment";
  const firstName = profile?.full_name?.split(/\s+/)[0] || (isStudent ? "Learner" : "Parent");
  const logout = async () => { await signOut(); go("/portal/login"); };

  if (loading || busy) return <PortalLayout role={isStudent ? "STUDENT" : "PARENT"}><main className="mx-auto grid min-h-[70vh] w-full max-w-7xl place-items-center px-4"><div className="grid w-full max-w-5xl gap-4"><div className="h-64 animate-pulse rounded-[2rem] bg-[var(--mist)]"/><div className="grid gap-4 sm:grid-cols-4">{[1,2,3,4].map(item => <div key={item} className="h-28 animate-pulse rounded-2xl bg-[var(--mist)]"/>)}</div></div></main></PortalLayout>;

  const quickLinks = [
    { href: "/portal/homework", label: "Homework", description: pendingHomework.length ? `${pendingHomework.length} work item${pendingHomework.length === 1 ? "" : "s"} need attention.` : "Assignments and learning work.", icon: BookOpenCheck },
    { href: "/portal/report-cards", label: "Report cards", description: averageScore !== null ? `${averageScore}% average across published results.` : "Published academic reports.", icon: FileText },
    { href: "/portal/attendance", label: "Attendance", description: attendanceRate !== null ? `${attendanceRate}% attendance this period.` : "Attendance records and history.", icon: CalendarDays },
    { href: "/portal/finance", label: "Fees & payments", description: outstanding ? `${money(outstanding)} currently outstanding.` : "View fee records and payments.", icon: CreditCard },
    { href: "/portal/timetable", label: "Timetable", description: todayLessons.length ? `${todayLessons.length} lesson${todayLessons.length === 1 ? "" : "s"} on today's timetable.` : "View the school timetable.", icon: Clock3 },
    { href: "/portal/library", label: "Library", description: "Books, loans and reservations.", icon: LibraryBig },
  ];

  return <PortalLayout role={isStudent ? "STUDENT" : "PARENT"}>
    <main className="mx-auto w-full max-w-[1440px] space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <header className="menwe-admin-hero rounded-[2.25rem] p-6 text-white shadow-2xl sm:p-9 lg:p-11">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0"><p className="menwe-admin-kicker"><GraduationCap size={14}/> {isStudent ? "Student workspace" : "Family workspace"}</p><h1 className="mt-5 text-4xl font-extrabold leading-[1.02] tracking-[-.045em] sm:text-5xl lg:text-6xl">Welcome, {firstName}.</h1><p className="mt-5 max-w-3xl text-[15px] leading-7 text-white/80 sm:text-base">Your secure school home for learning, progress, attendance, fees and communication — with the important things surfaced first.</p><div className="mt-7 flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-3.5 py-2 text-xs font-bold text-white/80"><span className="menwe-live-dot"/> {termName}</span>{learnerClass && <span className="rounded-full border border-white/10 bg-white/[.07] px-3.5 py-2 text-xs font-bold text-white/80">{learnerClass.name} · {learnerClass.level}</span>}<span className="rounded-full border border-white/10 bg-white/[.07] px-3.5 py-2 text-xs font-bold text-white/80">Private {isStudent ? "learner" : "family"} access</span></div></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[23rem]"><Link href="/portal/messages" className="rounded-2xl border border-white/10 bg-white/[.06] p-4 transition hover:-translate-y-1 hover:bg-white/[.1]"><div className="flex items-center gap-3"><MessageSquare size={18} className="text-[var(--gold)]"/><div><p className="text-xs font-extrabold uppercase tracking-[.12em] text-white/50">Messages</p><p className="mt-1 text-sm font-semibold text-white/80">Contact the school securely.</p></div></div></Link><Link href="/portal/notifications" className="rounded-2xl border border-white/10 bg-white/[.06] p-4 transition hover:-translate-y-1 hover:bg-white/[.1]"><div className="flex items-center gap-3"><Bell size={18} className="text-[var(--gold)]"/><div><p className="text-xs font-extrabold uppercase tracking-[.12em] text-white/50">Notifications</p><p className="mt-1 text-sm font-semibold text-white/80">{unreadNotifications ? `${unreadNotifications} unread update${unreadNotifications === 1 ? "" : "s"}.` : "You're up to date."}</p></div></div></Link></div>
        </div>
        <button type="button" onClick={() => void logout()} className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--gold)] px-4 font-extrabold text-[var(--ink)] shadow-lg transition hover:brightness-105"><LogOut size={16}/> Sign out</button>
      </header>

      {message && <div role="alert" className="flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"><div className="flex gap-3"><AlertCircle size={18} className="mt-0.5 shrink-0"/><span>{message}</span></div><button type="button" onClick={() => void load()} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-black hover:bg-amber-100"><RefreshCw size={14}/> Retry</button></div>}

      {students.length > 1 && <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="menwe-premium-label">Family account</p><h2 className="mt-1 text-2xl font-extrabold">Switch learner</h2></div><select aria-label="Select learner" value={learner?.id ?? ""} onChange={event => setSelected(event.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--ink)]/15 bg-white px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--accent)] sm:max-w-md">{students.map(student => <option key={student.id} value={student.id}>{student.name} · {student.admission_number}</option>)}</select></div></section>}

      {learner && <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="menwe-admin-metric rounded-[1.35rem]"><UserRound size={20} className="text-[var(--accent)]"/><p className="mt-4 menwe-premium-label">{isStudent ? "Your learner" : "Selected learner"}</p><p className="mt-2 truncate text-xl font-extrabold">{learner.name}</p><p className="mt-1 text-sm font-semibold text-[var(--ink)]/65">Admission No. {learner.admission_number}</p></article>
          <article className="menwe-admin-metric rounded-[1.35rem]"><TrendingUp size={20} className="text-[var(--accent)]"/><p className="mt-4 menwe-premium-label">Academic average</p><p className="mt-2 text-3xl font-black">{averageScore === null ? "—" : `${averageScore}%`}</p><p className="mt-1 text-sm text-[var(--ink)]/65">{results.length ? `${results.length} published result${results.length === 1 ? "" : "s"}` : "No published results yet"}</p></article>
          <article className="menwe-admin-metric rounded-[1.35rem]"><CalendarDays size={20} className="text-[var(--accent)]"/><p className="mt-4 menwe-premium-label">Attendance</p><p className="mt-2 text-3xl font-black">{attendanceRate === null ? "—" : `${attendanceRate}%`}</p><p className="mt-1 text-sm text-[var(--ink)]/65">{attendance.total ? `${attendance.present} present · ${attendance.absent} absent` : "No records yet"}</p></article>
          <Link href="/portal/finance" className="menwe-admin-metric menwe-interactive rounded-[1.35rem]"><CreditCard size={20} className="text-[var(--accent)]"/><p className="mt-4 menwe-premium-label">Fees</p><p className="mt-2 text-xl font-extrabold">{outstanding ? money(outstanding) : "Account clear"}</p><p className="mt-1 text-sm font-bold text-[var(--accent)]">Open finance →</p></Link>
        </section>

        <section><div className="flex items-end justify-between gap-4"><div><p className="menwe-premium-label">School workspace</p><h2 className="mt-1 text-2xl font-extrabold tracking-[-.025em] sm:text-3xl">Everything important, one tap away</h2></div><span className="hidden rounded-full bg-[var(--gold)]/10 px-3 py-1.5 text-xs font-bold text-[var(--gold)] sm:inline-flex">6 core services</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{quickLinks.map(({ href, label, description, icon: Icon }) => <Link key={href} href={href} className="group menwe-card menwe-interactive rounded-[1.5rem] p-6"><div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--ink)]/5 text-[var(--ink)] transition group-hover:bg-[var(--gold)]/12 group-hover:text-[var(--accent)]"><Icon size={21}/></span><ArrowRight size={18} className="text-[var(--ink)]/25 transition group-hover:translate-x-1 group-hover:text-[var(--accent)]"/></div><h3 className="mt-5 text-lg font-extrabold">{label}</h3><p className="mt-2 text-sm leading-6 text-[var(--ink)]/62">{description}</p></Link>)}</div></section>

        <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <div className="menwe-card rounded-[1.75rem] p-6 sm:p-7"><div className="flex items-center justify-between gap-4"><div><p className="menwe-premium-label">Today</p><h2 className="mt-1 text-2xl font-extrabold">Today's learning</h2></div><Link href="/portal/timetable" className="text-sm font-extrabold text-[var(--accent)]">Full timetable →</Link></div>{todayLessons.length ? <div className="mt-5 grid gap-3">{todayLessons.map(entry => <div key={entry.id} className="flex items-center gap-4 rounded-2xl border border-gray-100 p-4 dark:border-slate-800"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--ink)]/5 text-[var(--ink)]"><Clock3 size={18}/></div><div className="min-w-0 flex-1"><p className="font-extrabold">{subjectName(entry.subject_id)}</p><p className="mt-1 text-sm font-semibold text-[var(--ink)]/55">{entry.starts_at.slice(0,5)} – {entry.ends_at.slice(0,5)}{entry.room ? ` · ${entry.room}` : ""}</p></div></div>)}</div> : <div className="mt-5 rounded-2xl bg-[var(--mist)] p-5 text-sm font-semibold text-[var(--ink)]/60">No timetable entries are published for today.</div>}</div>
          <div className="menwe-card rounded-[1.75rem] p-6 sm:p-7"><div className="flex items-center justify-between"><div><p className="menwe-premium-label">Homework</p><h2 className="mt-1 text-2xl font-extrabold">Next to complete</h2></div><Link href="/portal/homework" className="text-sm font-extrabold text-[var(--accent)]">Open →</Link></div>{pendingHomework.length ? <div className="mt-5 grid gap-3">{pendingHomework.map(item => <div key={item.id} className="rounded-2xl border border-gray-100 p-4 dark:border-slate-800"><div className="flex items-start gap-3"><BookOpenCheck size={18} className="mt-0.5 shrink-0 text-[var(--accent)]"/><div className="min-w-0"><p className="font-extrabold">{item.title}</p><p className="mt-1 text-xs font-bold text-[var(--ink)]/50">{subjectName(item.subject_id)}{item.due_at ? ` · Due ${shortDate(item.due_at)}` : ""}</p></div></div></div>)}</div> : <div className="mt-5 rounded-2xl bg-[var(--mist)] p-5 text-sm font-semibold text-[var(--ink)]/60">No pending homework right now.</div>}</div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="menwe-card rounded-[1.75rem] p-6 sm:p-7"><div className="flex items-center justify-between gap-4"><div><p className="menwe-premium-label">Recent performance</p><h2 className="mt-1 text-2xl font-extrabold">Published results</h2></div><Link href="/portal/report-cards" className="text-sm font-extrabold text-[var(--accent)]">View reports →</Link></div>{results.length ? <div className="mt-5 grid gap-3">{results.slice(0, 5).map((result, index) => <div key={`${result.exam_id}-${result.subject_id}-${index}`} className="flex items-center gap-4 rounded-2xl border border-gray-100 p-4 dark:border-slate-800"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--ink)]/5 text-[var(--ink)]"><BarChart3 size={18}/></div><div className="min-w-0 flex-1"><p className="truncate font-extrabold">{subjectName(result.subject_id)}</p><p className="mt-1 text-xs font-semibold text-[var(--ink)]/50">{examName(result.exam_id)}</p></div><div className="text-right"><p className="font-black">{Number(result.score)} / {Number(result.maximum_score)}</p><p className="mt-0.5 text-xs font-bold text-[var(--accent)]">{result.grade || "Score recorded"}</p></div></div>)}</div> : <div className="mt-5 rounded-2xl bg-[var(--mist)] p-5 text-sm font-semibold text-[var(--ink)]/60">No published assessment results are available yet.</div>}</div>
          <div className="menwe-card rounded-[1.75rem] p-6 sm:p-7"><div className="flex items-center justify-between gap-4"><div><p className="menwe-premium-label">School updates</p><h2 className="mt-1 text-2xl font-extrabold">Latest announcements</h2></div><Link href="/portal/notifications" className="text-sm font-extrabold text-[var(--accent)]">Notifications →</Link></div>{announcements.length ? <div className="mt-5 grid gap-3">{announcements.map(item => <div key={item.id} className="rounded-2xl border border-gray-100 p-4 dark:border-slate-800"><div className="flex items-start gap-3"><Bell size={18} className="mt-0.5 shrink-0 text-[var(--accent)]"/><div><p className="font-extrabold">{item.title}</p><p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--ink)]/60">{item.body}</p><p className="mt-2 text-xs font-bold text-[var(--ink)]/40">{shortDate(item.published_at || item.created_at)}</p></div></div></div>)}</div> : <div className="mt-5 rounded-2xl bg-[var(--mist)] p-5 text-sm font-semibold text-[var(--ink)]/60">No new school announcements are published.</div>}</div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3"><Link href="/portal/profile" className="menwe-card menwe-interactive rounded-[1.5rem] p-6"><UserRound className="text-[var(--accent)]"/><h3 className="mt-4 text-lg font-extrabold">My profile</h3><p className="mt-1 text-sm text-[var(--ink)]/60">Keep your account details current.</p></Link><Link href="/portal/messages" className="menwe-card menwe-interactive rounded-[1.5rem] p-6"><MessageSquare className="text-[var(--accent)]"/><h3 className="mt-4 text-lg font-extrabold">School messages</h3><p className="mt-1 text-sm text-[var(--ink)]/60">Communicate with authorised school staff.</p></Link><Link href="/portal/past-papers" className="menwe-card menwe-interactive rounded-[1.5rem] p-6"><BookOpen className="text-[var(--accent)]"/><h3 className="mt-4 text-lg font-extrabold">Revision resources</h3><p className="mt-1 text-sm text-[var(--ink)]/60">Open past papers and learning materials.</p></Link></section>
      </>}

      {!learner && <section className="menwe-card rounded-[1.75rem] p-7"><div className="flex items-start gap-4"><AlertCircle className="mt-0.5 text-[var(--accent)]"/><div><h2 className="text-xl font-extrabold">No learner workspace yet</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink)]/65">Your account can sign in, but a learner record is not linked to it yet. School administration needs to complete the learner or parent relationship before private academic and finance information can appear here.</p></div></div></section>}
      <section><ParentAssistant/></section>
    </main>
  </PortalLayout>;
}
