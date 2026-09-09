import { BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, CreditCard, FileText, MessageSquare, NotebookTabs, PenLine, RefreshCw, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { PortalLayout } from "@/components/PortalLayout";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";

type Row = Record<string, any>;
type DashboardModule = { title: string; href: string; icon: typeof PenLine; text: string; featured?: boolean };
const modules: DashboardModule[] = [
  { title: "Enter learner marks", href: "/portal/exams", icon: PenLine, text: "Select an assessment and your assigned subject, enter learner scores, and save results.", featured: true },
  { title: "My learners", href: "#my-learners", icon: Users, text: "See active learners in your assigned classes." },
  { title: "Attendance", href: "/portal/attendance", icon: ClipboardCheck, text: "Open an authorised class register and record attendance." },
  { title: "Homework", href: "/portal/homework", icon: NotebookTabs, text: "Create, review and manage learner work." },
  { title: "Timetable", href: "/portal/timetable", icon: CalendarDays, text: "See your current teaching timetable." },
  { title: "Class marksheet", href: "/portal/class-marksheet", icon: FileText, text: "Generate a professional class performance sheet." },
  { title: "Messages", href: "/portal/messages", icon: MessageSquare, text: "Communicate through the protected school directory." },
];

export default function TeacherDashboardPage() {
  const { profile, user } = useSchoolAuth();
  const [, go] = useLocation();
  const [assignments, setAssignments] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [learners, setLearners] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "Teacher";

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user?.id) return;
      setLoading(true); setError("");
      try {
        const db = getSupabase();
        const tr = await db.from("teachers").select("id").eq("profile_id", user.id).maybeSingle();
        if (tr.error) throw tr.error;
        if (!tr.data?.id) throw new Error("Your teacher record is not linked yet. Open My Profile or ask an administrator to link it.");
        const teacherId = String(tr.data.id);
        const [a, r] = await Promise.all([
          db.from("teacher_assignments").select("id,class_id,subject_id").eq("teacher_id", teacherId),
          db.from("teacher_class_roles").select("class_id,is_class_teacher").eq("teacher_id", teacherId),
        ]);
        if (a.error) throw a.error; if (r.error) throw r.error;
        const classIds = [...new Set([...(a.data ?? []).map(x => String(x.class_id)), ...(r.data ?? []).map(x => String(x.class_id))])];
        if (!classIds.length) { if (active) { setAssignments([]); setRoles(r.data ?? []); setClasses([]); setSubjects([]); setLearners([]); } return; }
        const [c, s, e] = await Promise.all([
          db.from("classes").select("id,name,code,level,academic_year_id,status").in("id", classIds),
          db.from("subjects").select("id,code,name,status").eq("status", "ACTIVE"),
          db.from("enrollments").select("student_id,class_id").in("class_id", classIds).eq("status", "ACTIVE"),
        ]);
        if (c.error) throw c.error; if (s.error) throw s.error; if (e.error) throw e.error;
        const learnerIds = [...new Set((e.data ?? []).map(x => String(x.student_id)))];
        const st = learnerIds.length ? await db.from("students").select("id,admission_number,first_name,middle_name,last_name").in("id", learnerIds).order("first_name") : { data: [], error: null } as any;
        if (st.error) throw st.error;
        if (active) {
          setAssignments(a.data ?? []); setRoles(r.data ?? []); setClasses(c.data ?? []); setSubjects(s.data ?? []);
          setLearners((st.data ?? []).map((student: Row) => ({ ...student, class_id: (e.data ?? []).find(x => String(x.student_id) === String(student.id))?.class_id })));
        }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Teacher workspace could not be loaded."); }
      finally { if (active) setLoading(false); }
    };
    void load(); return () => { active = false; };
  }, [user?.id]);

  const classTeacherIds = useMemo(() => new Set(roles.filter(r => r.is_class_teacher).map(r => String(r.class_id))), [roles]);
  const subjectsByClass = useMemo(() => {
    const map = new Map<string, Row[]>();
    assignments.forEach(a => { const classId = String(a.class_id); const subject = subjects.find(s => String(s.id) === String(a.subject_id)); if (!subject) return; const list = map.get(classId) ?? []; if (!list.some(s => String(s.id) === String(subject.id))) list.push(subject); map.set(classId, list); });
    return map;
  }, [assignments, subjects]);
  const learnerCountByClass = useMemo(() => { const map = new Map<string, number>(); learners.forEach(s => { const id = String(s.class_id); map.set(id, (map.get(id) ?? 0) + 1); }); return map; }, [learners]);
  const learnersByClass = useMemo(() => {
    const classNumber = (value: unknown) => Number(String(value ?? "").match(/\d+/)?.[0] ?? 999);
    const learnerName = (s: Row) => [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");
    return [...classes].sort((a,b) => classNumber(a.name ?? a.level ?? a.code) - classNumber(b.name ?? b.level ?? b.code) || String(a.name ?? "").localeCompare(String(b.name ?? ""))).map(cls => ({ cls, learners: learners.filter(s => String(s.class_id) === String(cls.id)).sort((a,b) => learnerName(a).localeCompare(learnerName(b))) })).filter(group => group.learners.length > 0);
  }, [classes, learners]);
  const isClassTeacher = classTeacherIds.size > 0;

  const primaryActions = [
    ["Enter marks", "Record learner scores", PenLine, "/portal/exams"],
    ["Take attendance", "Open today's register", ClipboardCheck, "/portal/attendance"],
    ["Open homework", "Manage learner work", NotebookTabs, "/portal/homework"],
    ["View timetable", "Check today's lessons", CalendarDays, "/portal/timetable"],
  ] as const;

  return <PortalLayout role="TEACHER"><main className="mx-auto w-full max-w-[1440px] space-y-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
    <header className="menwe-admin-hero relative overflow-hidden rounded-[2.25rem] p-6 text-white shadow-2xl sm:p-9 lg:p-11">
      <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"><div>
        <p className="menwe-admin-kicker"><BookOpen size={14}/> Teacher workspace</p>
        <h1 className="mt-5 text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">Good day, {firstName}.</h1>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-white/75">Everything you need for today's teaching work—marks, attendance, homework, timetable and your assigned learners.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white/10 px-3 py-1.5">{classes.length} assigned class{classes.length === 1 ? "" : "es"}</span><span className="rounded-full bg-white/10 px-3 py-1.5">{learners.length} active learners</span><span className="rounded-full bg-white/10 px-3 py-1.5">{isClassTeacher ? "Class Teacher" : "Subject Teacher"}</span></div>
      </div></div>
    </header>

    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"><span>{error}</span><button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-white px-3 py-2 text-xs font-bold">Retry</button></div>}

    <section aria-labelledby="teacher-actions" className="menwe-card rounded-[1.75rem] p-5 sm:p-6"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--gold)]/15 text-[var(--gold)]"><PenLine size={17}/></span><div><p className="menwe-premium-label">Daily work</p><h2 id="teacher-actions" className="text-lg font-black text-[var(--ink)]">Start with what you need to do</h2></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{primaryActions.map(([label,detail,Icon,href]) => <button key={label} type="button" onClick={() => go(href)} className="group flex min-h-[78px] items-center gap-3 rounded-xl border border-[var(--ink)]/8 bg-white p-3 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[var(--gold)]/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><Icon size={19}/></span><span className="min-w-0 flex-1"><b className="block text-sm">{label}</b><span className="mt-0.5 block text-xs text-[var(--ink)]/50">{detail}</span></span><span className="text-[var(--gold)]">→</span></button>)}</div></section>

    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Assigned classes" value={loading ? "…" : classes.length} detail="Classes linked to you." icon={Users}/>
      <Metric label="Subject assignments" value={loading ? "…" : assignments.length} detail="Class-subject permissions." icon={BookOpen}/>
      <Metric label="My learners" value={loading ? "…" : learners.length} detail="Active learners in your classes." icon={Users}/>
      <Metric label="Class-teacher role" value={loading ? "Checking…" : isClassTeacher ? `${classTeacherIds.size} class${classTeacherIds.size === 1 ? "" : "es"}` : "Subject teacher"} detail="Class fees are available only to designated class teachers." icon={CheckCircle2}/>
    </section>

    <section className="menwe-card rounded-[1.75rem] p-6 sm:p-8"><div className="flex items-end justify-between gap-4"><div><p className="menwe-premium-label">My classes & subjects</p><h2 className="menwe-premium-title mt-1">Current teaching allocation</h2></div><Link href="/portal/profile" className="text-sm font-extrabold text-[var(--accent)]">My profile →</Link></div><div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{classes.map(cls => { const id=String(cls.id); const ss=subjectsByClass.get(id) ?? []; const count=learnerCountByClass.get(id) ?? 0; return <article key={id} className="rounded-2xl border border-[var(--ink)]/8 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"><div className="flex items-start justify-between gap-3"><div><h3 className="font-extrabold">{cls.name}</h3><p className="mt-1 text-xs text-[var(--ink)]/50">{cls.level || cls.code}</p></div>{classTeacherIds.has(id)&&<span className="rounded-full bg-[var(--gold)]/10 px-3 py-1 text-xs font-bold uppercase text-[var(--gold)]">Class Teacher</span>}</div><p className="mt-4 text-sm font-semibold">{count} active learner{count===1?"":"s"}</p><div className="mt-3 flex flex-wrap gap-2">{ss.map(s=><span key={String(s.id)} className="rounded-full bg-[var(--mist)] px-3 py-1 text-xs font-bold">{s.name}</span>)}{classTeacherIds.has(id)&&<Link href="/portal/finance" className="inline-flex items-center gap-1 rounded-full bg-[var(--gold)]/10 px-3 py-1 text-xs font-bold text-[var(--gold)]"><CreditCard size={12}/> Class fees</Link>}</div></article>; })}{!loading&&!classes.length&&<div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-[var(--ink)]/15 p-10 text-center text-sm text-[var(--ink)]/55">No teaching assignments yet. Open <Link href="/portal/profile" className="font-bold text-[var(--accent)]">My Profile</Link> to configure them.</div>}</div></section>

    <section id="my-learners" className="menwe-card rounded-[1.75rem] p-6 sm:p-8"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="menwe-premium-label">My learners</p><h2 className="menwe-premium-title mt-1">Your active class rosters</h2><p className="mt-2 text-sm text-[var(--ink)]/60">Only learners from your assigned classes are shown.</p></div>{!loading&&learnersByClass.length>0&&<span className="inline-flex w-fit items-center rounded-full bg-[var(--mist)] px-3 py-1.5 text-xs font-extrabold text-[var(--accent)]">{learners.length} learners · {learnersByClass.length} classes</span>}</div><div className="mt-5 space-y-4">{learnersByClass.map(({cls,learners:classLearners})=>{const id=String(cls.id);const classTeacher=classTeacherIds.has(id);return <details key={id} className="group overflow-hidden rounded-2xl border border-[var(--ink)]/10 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-extrabold">{cls.name}</h3>{classTeacher&&<span className="rounded-full bg-[var(--gold)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-[var(--gold)]">Class Teacher</span>}</div><p className="mt-1 text-xs text-[var(--ink)]/50">{classLearners.length} active learner{classLearners.length===1?"":"s"}</p></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--mist)] text-lg font-bold text-[var(--accent)] transition-transform group-open:rotate-45">+</span></summary><div className="overflow-x-auto border-t border-[var(--ink)]/8"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="bg-[var(--mist)]/45 text-xs font-bold uppercase tracking-[.1em] text-[var(--ink)]/45"><th className="p-3 sm:p-4">#</th><th className="p-3 sm:p-4">Learner</th><th className="p-3 sm:p-4">Admission</th></tr></thead><tbody>{classLearners.map((s,index)=><tr key={String(s.id)} className="border-b border-[var(--ink)]/7 last:border-b-0"><td className="p-3 text-[var(--ink)]/45 sm:p-4">{index+1}</td><td className="p-3 font-semibold sm:p-4">{[s.first_name,s.middle_name,s.last_name].filter(Boolean).join(" ")}</td><td className="p-3 sm:p-4">{s.admission_number}</td></tr>)}</tbody></table></div></details>})}{!loading&&!learners.length&&<p className="rounded-2xl border border-dashed border-[var(--ink)]/15 py-10 text-center text-sm text-[var(--ink)]/55">No active learners are currently enrolled in your assigned classes.</p>}</div></section>

    <section><div className="mb-4"><p className="menwe-premium-label">Teaching tools</p><h2 className="menwe-premium-title mt-1">Everything else in one place</h2></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{modules.map(({title,href,icon:Icon,text,featured}) => <Link key={title} href={href} className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${featured?"border-[var(--gold)]/35 bg-[var(--gold)]/5":"border-[var(--ink)]/8 bg-white"}`}><div className="flex items-start justify-between gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--ink)]/5 text-[var(--ink)] group-hover:bg-[var(--gold)]/15 group-hover:text-[var(--gold)]"><Icon size={19}/></span><span className="text-[var(--gold)]">→</span></div><h3 className="mt-5 font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--ink)]/55">{text}</p></Link>)}</div></section>
  </main></PortalLayout>;
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof Users }) {
  return <article className="menwe-admin-metric rounded-[1.35rem] p-5"><div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><Icon size={20}/></span><span className="text-right text-2xl font-black text-[var(--ink)]">{value}</span></div><p className="mt-5 text-sm font-extrabold text-[var(--ink)]">{label}</p><p className="mt-1 text-xs leading-5 text-[var(--ink)]/55">{detail}</p></article>;
}
