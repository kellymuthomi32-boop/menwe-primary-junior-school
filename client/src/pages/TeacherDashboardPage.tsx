import { BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, CreditCard, FileText, LogOut, MessageSquare, NotebookTabs, PenLine, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { PortalLayout } from "@/components/PortalLayout";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";

type Row = Record<string, any>;
const modules = [
  { title: "Enter learner marks", href: "/portal/exams", icon: PenLine, text: "Select an assessment and your assigned subject, enter learner scores, and save results.", featured: true },
  { title: "My learners", href: "#my-learners", icon: Users, text: "See active learners in your assigned classes." },
  { title: "My classes & subjects", href: "/portal/profile", icon: BookOpen, text: "Review or update the classes and subjects you teach." },
  { title: "Homework", href: "/portal/homework", icon: NotebookTabs, text: "Create, review and manage learner work." },
  { title: "Attendance", href: "/portal/attendance", icon: ClipboardCheck, text: "Open an authorised class register and record attendance." },
  { title: "Timetable", href: "/portal/timetable", icon: CalendarDays, text: "See your current teaching timetable." },
  { title: "Exams & results", href: "/portal/exams", icon: FileText, text: "Enter marks and review authorised results." },
  { title: "Class marksheet", href: "/portal/class-marksheet", icon: FileText, text: "Generate a professional class performance sheet." },
  { title: "Messages", href: "/portal/messages", icon: MessageSquare, text: "Communicate through the protected school directory." },
] as const;

export default function TeacherDashboardPage() {
  const { profile, user, signOut } = useSchoolAuth();
  const [, go] = useLocation();
  const [assignments, setAssignments] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [learners, setLearners] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "Teacher";
  const logout = async () => { await signOut(); go("/portal/login"); };

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
        if (a.error) throw a.error;
        if (r.error) throw r.error;
        const classIds = [...new Set([
          ...(a.data ?? []).map(x => String(x.class_id)),
          ...(r.data ?? []).map(x => String(x.class_id)),
        ])];
        if (!classIds.length) {
          if (active) { setAssignments([]); setRoles(r.data ?? []); setClasses([]); setSubjects([]); setLearners([]); }
          return;
        }
        const [c, s, e] = await Promise.all([
          db.from("classes").select("id,name,code,level,academic_year_id,status").in("id", classIds),
          db.from("subjects").select("id,code,name,status").eq("status", "ACTIVE"),
          db.from("enrollments").select("student_id,class_id").in("class_id", classIds).eq("status", "ACTIVE"),
        ]);
        if (c.error) throw c.error;
        if (s.error) throw s.error;
        if (e.error) throw e.error;
        const learnerIds = [...new Set((e.data ?? []).map(x => String(x.student_id)))];
        const st = learnerIds.length
          ? await db.from("students").select("id,admission_number,first_name,middle_name,last_name").in("id", learnerIds).order("first_name")
          : { data: [], error: null } as any;
        if (st.error) throw st.error;
        if (active) {
          setAssignments(a.data ?? []); setRoles(r.data ?? []); setClasses(c.data ?? []); setSubjects(s.data ?? []);
          setLearners((st.data ?? []).map(student => ({ ...student, class_id: (e.data ?? []).find(x => String(x.student_id) === String(student.id))?.class_id })));
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Teacher workspace could not be loaded.");
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [user?.id]);

  const classTeacherIds = useMemo(() => new Set(roles.filter(r => r.is_class_teacher).map(r => String(r.class_id))), [roles]);
  const subjectsByClass = useMemo(() => {
    const map = new Map<string, Row[]>();
    assignments.forEach(a => {
      const classId = String(a.class_id);
      const subject = subjects.find(s => String(s.id) === String(a.subject_id));
      if (!subject) return;
      const list = map.get(classId) ?? [];
      if (!list.some(s => String(s.id) === String(subject.id))) list.push(subject);
      map.set(classId, list);
    });
    return map;
  }, [assignments, subjects]);
  const learnerCountByClass = useMemo(() => {
    const map = new Map<string, number>();
    learners.forEach(s => { const id = String(s.class_id); map.set(id, (map.get(id) ?? 0) + 1); });
    return map;
  }, [learners]);
  const learnersByClass = useMemo(() => {
    const classNumber = (value: unknown) => Number(String(value ?? "").match(/\d+/)?.[0] ?? 999);
    const learnerName = (s: Row) => [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");
    return [...classes]
      .sort((a, b) => classNumber(a.name ?? a.level ?? a.code) - classNumber(b.name ?? b.level ?? b.code) || String(a.name ?? "").localeCompare(String(b.name ?? "")))
      .map(cls => ({
        cls,
        learners: learners.filter(s => String(s.class_id) === String(cls.id)).sort((a, b) => learnerName(a).localeCompare(learnerName(b))),
      }))
      .filter(group => group.learners.length > 0);
  }, [classes, learners]);
  const isClassTeacher = classTeacherIds.size > 0;

  return <PortalLayout role="TEACHER"><main className="mx-auto w-full max-w-[1440px] space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
    <header className="menwe-admin-hero rounded-[2.25rem] p-6 text-white shadow-2xl sm:p-9 lg:p-11">
      <p className="menwe-admin-kicker"><BookOpen size={14}/> Teacher workspace</p>
      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">Good day, {firstName}.</h1><p className="mt-5 max-w-3xl text-[15px] leading-7 text-white/80">Your classes, learners, subjects, assessments, attendance and class-teacher responsibilities in one secure workspace.</p></div>{isClassTeacher && <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-black text-[var(--ink)]"><CheckCircle2 size={16}/> Class Teacher</span>}</div>
      <div className="mt-7 flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-3.5 py-2 text-xs font-bold"><span className="menwe-live-dot"/> Live school data</span><span className="rounded-full border border-white/10 bg-white/[.07] px-3.5 py-2 text-xs font-bold">{classes.length} assigned class{classes.length === 1 ? "" : "es"}</span></div>
      <button type="button" onClick={() => void logout()} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-4 font-extrabold text-[var(--ink)]"><LogOut size={16}/> Sign out</button>
    </header>
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Assigned classes" value={loading ? "…" : classes.length} detail="Classes linked to your teaching profile." />
      <Metric label="Subject assignments" value={loading ? "…" : assignments.length} detail="Class-subject permissions used by marks entry." />
      <Metric label="My learners" value={loading ? "…" : learners.length} detail="Active learners in your assigned classes." />
      <Metric label="Class-teacher status" value={loading ? "Checking…" : isClassTeacher ? `${classTeacherIds.size} class${classTeacherIds.size === 1 ? "" : "es"}` : "Subject teacher"} detail="Fee access is limited to designated class teachers." />
    </section>
    <section className="menwe-card rounded-[1.75rem] p-6 sm:p-8"><div className="flex items-end justify-between gap-4"><div><p className="menwe-premium-label">My classes & subjects</p><h2 className="menwe-premium-title mt-1">Current teaching allocation</h2></div><Link href="/portal/profile" className="text-sm font-extrabold text-[var(--accent)]">Edit profile →</Link></div><div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{classes.map(cls => { const id=String(cls.id); const ss=subjectsByClass.get(id) ?? []; const count=learnerCountByClass.get(id) ?? 0; return <article key={id} className="rounded-2xl border border-[var(--ink)]/8 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-extrabold">{cls.name}</h3><p className="mt-1 text-xs text-[var(--ink)]/50">{cls.level || cls.code}</p></div>{classTeacherIds.has(id)&&<span className="rounded-full bg-[var(--gold)]/10 px-3 py-1 text-xs font-bold uppercase text-[var(--gold)]">Class Teacher</span>}</div><p className="mt-4 text-sm font-semibold">{count} active learner{count===1?"":"s"}</p><div className="mt-3 flex flex-wrap gap-2">{ss.map(s=><span key={String(s.id)} className="rounded-full bg-[var(--mist)] px-3 py-1 text-xs font-bold">{s.name}</span>)}{classTeacherIds.has(id)&&<Link href="/portal/finance" className="inline-flex items-center gap-1 rounded-full bg-[var(--gold)]/10 px-3 py-1 text-xs font-bold text-[var(--gold)]"><CreditCard size={12}/> Class fees</Link>}</div></article>; })}{!loading&&!classes.length&&<div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-[var(--ink)]/15 p-10 text-center text-sm text-[var(--ink)]/55">No teaching assignments yet. Open <Link href="/portal/profile" className="font-bold text-[var(--accent)]">My Profile</Link> to configure them.</div>}</div></section>
    <section id="my-learners" className="menwe-card rounded-[1.75rem] p-6 sm:p-8"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="menwe-premium-label">My Learners</p><h2 className="menwe-premium-title mt-1">Filtered student roster</h2><p className="mt-2 text-sm text-[var(--ink)]/60">Only active learners in your assigned classes are listed, arranged by class.</p></div>{!loading && learnersByClass.length > 0 && <span className="inline-flex w-fit items-center rounded-full bg-[var(--mist)] px-3 py-1.5 text-xs font-extrabold text-[var(--accent)]">{learners.length} learners · {learnersByClass.length} classes</span>}</div><div className="mt-5 space-y-4">{learnersByClass.map(({ cls, learners: classLearners }) => { const id=String(cls.id); const classTeacher=classTeacherIds.has(id); return <details key={id} open={learnersByClass.length <= 3} className="group overflow-hidden rounded-2xl border border-[var(--ink)]/10 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-extrabold">{cls.name}</h3>{classTeacher&&<span className="rounded-full bg-[var(--gold)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-[var(--gold)]">Class Teacher</span>}</div><p className="mt-1 text-xs text-[var(--ink)]/50">{classLearners.length} active learner{classLearners.length===1?"":"s"}</p></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--mist)] text-lg font-bold text-[var(--accent)] transition-transform group-open:rotate-45">+</span></summary><div className="overflow-x-auto border-t border-[var(--ink)]/8"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="bg-[var(--mist)]/45 text-xs font-bold uppercase tracking-[.1em] text-[var(--ink)]/45"><th className="p-3 sm:p-4">#</th><th className="p-3 sm:p-4">Learner</th><th className="p-3 sm:p-4">Admission</th></tr></thead><tbody>{classLearners.map((s,index)=><tr key={String(s.id)} className="border-b border-[var(--ink)]/7 last:border-b-0"><td className="p-3 text-[var(--ink)]/45 sm:p-4">{index+1}</td><td className="p-3 font-semibold sm:p-4">{[s.first_name,s.middle_name,s.last_name].filter(Boolean).join(" ")}</td><td className="p-3 sm:p-4">{s.admission_number}</td></tr>)}</tbody></table></div></details>})}{!loading&&!learners.length&&<p className="rounded-2xl border border-dashed border-[var(--ink)]/15 py-10 text-center text-sm text-[var(--ink)]/55">No active learners are currently enrolled in your assigned classes.</p>}</div></section>
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{modules.map(({title,href,icon:Icon,text,featured})=><Link key={`${title}-${href}`} href={href} className={`menwe-card menwe-interactive group rounded-[1.35rem] p-6 ${featured?"ring-2 ring-[var(--gold)]/35 shadow-lg":""}`}><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${featured?"bg-[var(--gold)]/15 text-[var(--accent)]":"bg-[var(--mist)] text-[var(--accent)]"}`}><Icon size={22}/></span><div className="mt-5 flex flex-wrap items-center gap-2"><h2 className="text-lg font-extrabold">{title}</h2>{featured&&<span className="rounded-full bg-[var(--gold)]/10 px-3 py-1 text-xs font-bold uppercase text-[var(--gold)]">Start here</span>}</div><p className="mt-2 text-sm leading-6 text-[var(--ink)]/65">{text}</p><span className="mt-6 inline-flex text-sm font-extrabold text-[var(--accent)]">{featured?"Enter marks →":"Open workspace →"}</span></Link>)}</section>
    <section className="menwe-card rounded-[1.75rem] p-6 sm:p-8"><p className="menwe-premium-label">Class fees</p><h2 className="menwe-premium-title mt-2">Protected class-teacher finance access</h2><p className="mt-3 text-sm leading-6 text-[var(--ink)]/65">{isClassTeacher?"Open class fees to view and record payment activity for your designated class(es). Supabase RLS blocks other classes.":"Fee records are not available to subject-only teachers."}</p>{isClassTeacher&&<Link href="/portal/finance" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white"><CreditCard size={16}/> Open class fees</Link>}</section>
  </main></PortalLayout>;
}

function Metric({label,value,detail}:{label:string;value:string|number;detail:string}){return <article className="menwe-admin-metric rounded-[1.35rem]"><p className="menwe-premium-label">{label}</p><p className="mt-3 text-3xl font-black">{value}</p><p className="mt-2 text-sm text-[var(--ink)]/65">{detail}</p></article>}
