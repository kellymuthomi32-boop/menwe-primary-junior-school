import { BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, CreditCard, FileText, LogOut, MessageSquare, NotebookTabs, PenLine, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { PortalLayout } from "@/components/PortalLayout";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";

type Row = Record<string, any>;
const modules = [
  { title: "Enter learner marks", href: "/portal/exams", icon: PenLine, text: "Select an assessment and your assigned subject, enter learner scores, and save results.", featured: true },
  { title: "My learners", href: "#my-learners", icon: Users, text: "See the learners currently enrolled in the classes you teach." },
  { title: "My classes & subjects", href: "/portal/profile", icon: BookOpen, text: "Review or update the classes and subjects you teach." },
  { title: "Homework", href: "/portal/homework", icon: NotebookTabs, text: "Create, review and manage learner work." },
  { title: "Attendance", href: "/portal/attendance", icon: ClipboardCheck, text: "Open an authorised class register and record attendance." },
  { title: "Timetable", href: "/portal/timetable", icon: CalendarDays, text: "See your current teaching timetable." },
  { title: "Exams & results", href: "/portal/exams", icon: FileText, text: "Enter marks and review authorised results." },
  { title: "Class marksheet", href: "/portal/class-marksheet", icon: FileText, text: "Generate a professional printable class performance sheet." },
  { title: "Messages", href: "/portal/messages", icon: MessageSquare, text: "Communicate through the protected school directory." },
] as const;

export default function TeacherDashboardPage() {
  const { profile, user, signOut } = useSchoolAuth();
  const [, go] = useLocation();
  const [teacherId, setTeacherId] = useState("");
  const [assignments, setAssignments] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
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
        const id = String(tr.data.id);
        const [a, r] = await Promise.all([
          db.from("teacher_assignments").select("id,class_id,subject_id").eq("teacher_id", id),
          db.from("teacher_class_roles").select("class_id,is_class_teacher").eq("teacher_id", id),
        ]);
        if (a.error) throw a.error; if (r.error) throw r.error;
        const classIds = [...new Set([...(a.data ?? []).map(x => String(x.class_id)), ...(r.data ?? []).map(x => String(x.class_id))])];
        const [c, e] = classIds.length ? await Promise.all([
          db.from("classes").select("id,name,code,level,academic_year_id,status").in("id", classIds),
          db.from("enrollments").select("student_id,class_id").in("class_id", classIds).eq("status", "ACTIVE"),
        ]) : [{ data: [], error: null } as any, { data: [], error: null } as any];
        if (c.error) throw c.error; if (e.error) throw e.error;
        const learnerIds = [...new Set((e.data ?? []).map(x => String(x.student_id)))];
        const s = learnerIds.length ? await db.from("students").select("id,admission_number,first_name,middle_name,last_name").in("id", learnerIds).order("first_name") : { data: [], error: null } as any;
        if (s.error) throw s.error;
        if (active) { setTeacherId(id); setAssignments(a.data ?? []); setRoles(r.data ?? []); setClasses(c.data ?? []); setLearners((s.data ?? []).map(student => ({ ...student, class_id: (e.data ?? []).find(x => String(x.student_id) === String(student.id))?.class_id }))); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Teacher workspace could not be loaded."); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [user?.id]);

  const classIds = useMemo(() => [...new Set(assignments.map(a => String(a.class_id)))], [assignments]);
  const classTeacherIds = useMemo(() => new Set(roles.filter(r => r.is_class_teacher).map(r => String(r.class_id))), [roles]);
  const subjectIdsByClass = useMemo(() => { const map = new Map<string, Set<string>>(); assignments.forEach(a => { const set = map.get(String(a.class_id)) ?? new Set<string>(); set.add(String(a.subject_id)); map.set(String(a.class_id), set); }); return map; }, [assignments]);
  const learnerCountByClass = useMemo(() => { const map = new Map<string, number>(); learners.forEach(s => { const id = String(s.class_id); map.set(id, (map.get(id) ?? 0) + 1); }); return map; }, [learners]);
  const isClassTeacher = classTeacherIds.size > 0;

  return <PortalLayout role="TEACHER"><main className="mx-auto w-full max-w-[1440px] space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
    <header className="menwe-admin-hero rounded-[2.25rem] p-6 text-white shadow-2xl sm:p-9 lg:p-11">
      <p className="menwe-admin-kicker"><BookOpen size={14}/> Teacher workspace</p>
      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-4xl font-extrabold leading-[1.02] tracking-[-.045em] sm:text-5xl lg:text-6xl">Good day, {firstName}.</h1><p className="mt-5 max-w-3xl text-[15px] leading-7 text-white/80">Your classes, learners, teaching subjects, attendance, assessments and class-teacher responsibilities in one secure workspace.</p></div>{isClassTeacher && <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-black text-[var(--ink)]"><CheckCircle2 size={16}/> Class Teacher</span>}</div>
      <div className="mt-7 flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-3.5 py-2 text-xs font-bold text-white/80"><span className="menwe-live-dot"/> Live school data</span><span className="rounded-full border border-white/10 bg-white/[.07] px-3.5 py-2 text-xs font-bold text-white/80">{classIds.length} assigned class{classIds.length === 1 ? "" : "es"}</span></div>
      <button type="button" onClick={() => void logout()} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-4 font-extrabold text-[var(--ink)] shadow-lg transition hover:brightness-105"><LogOut size={16}/> Sign out</button>
    </header>

    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article className="menwe-admin-metric rounded-[1.35rem]"><p className="menwe-premium-label">Assigned classes</p><p className="mt-3 text-3xl font-black">{loading ? "…" : classIds.length}</p><p className="mt-2 text-sm leading-6 text-[var(--ink)]/65">Classes available to your teaching profile.</p></article>
      <article className="menwe-admin-metric rounded-[1.35rem]"><p className="menwe-premium-label">Teaching subjects</p><p className="mt-3 text-3xl font-black">{loading ? "…" : assignments.length}</p><p className="mt-2 text-sm leading-6 text-[var(--ink)]/65">Class-subject assignments authorised for marks entry.</p></article>
      <article className="menwe-admin-metric rounded-[1.35rem]"><p className="menwe-premium-label">My learners</p><p className="mt-3 text-3xl font-black">{loading ? "…" : learners.length}</p><p className="mt-2 text-sm leading-6 text-[var(--ink)]/65">Active learners in your assigned classes.</p></article>
      <article className="menwe-admin-metric rounded-[1.35rem]"><p className="menwe-premium-label">Class-teacher role</p><p className="mt-3 text-xl font-extrabold">{loading ? "Checking…" : isClassTeacher ? `${classTeacherIds.size} class${classTeacherIds.size === 1 ? "" : "es"}` : "Subject teacher"}</p><p className="mt-2 text-sm leading-6 text-[var(--ink)]/65">Fee access is enabled only for classes where you are designated class teacher.</p></article>
    </section>

    <section className="menwe-card rounded-[1.75rem] p-6 sm:p-8"><div className="flex items-end justify-between gap-4"><div><p className="menwe-premium-label">My classes & subjects</p><h2 className="menwe-premium-title mt-1">Your current teaching allocation</h2></div><Link href="/portal/profile" className="text-sm font-extrabold text-[var(--accent)]">Edit profile →</Link></div><div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{classes.map(cls => { const id=String(cls.id); return <article key={id} className="rounded-2xl border border-[var(--ink)]/8 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-extrabold">{cls.name}</h3><p className="mt-1 text-xs text-[var(--ink)]/50">{cls.level || cls.code}</p></div>{classTeacherIds.has(id) && <span className="rounded-full bg-[var(--gold)]/10 px-3 py-1 text-xs font-bold uppercase text-[var(--gold)]">Class Teacher</span>}</div><p className="mt-4 text-sm font-semibold">{learnerCountByClass.get(id) ?? 0} active learner{(learnerCountByClass.get(id) ?? 0) === 1 ? "" : "s"}</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-[var(--mist)] px-3 py-1 text-xs font-bold">{subjectIdsByClass.get(id)?.size ?? 0} subject assignment{(subjectIdsByClass.get(id)?.size ?? 0) === 1 ? "" : "s"}</span>{classTeacherIds.has(id) && <Link href="/portal/finance" className="inline-flex items-center gap-1 rounded-full bg-[var(--gold)]/10 px-3 py-1 text-xs font-bold text-[var(--gold)]"><CreditCard size={12}/> Class fees</Link>}</div></article>; })}{!loading && !classes.length && <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-[var(--ink)]/15 p-10 text-center text-sm text-[var(--ink)]/55">No teaching assignments yet. Open <Link href="/portal/profile" className="font-bold text-[var(--accent)]">My Profile</Link> to configure your classes and subjects.</div>}</div></section>

    <section id="my-learners" className="menwe-card rounded-[1.75rem] p-6 sm:p-8"><p className="menwe-premium-label">My Learners</p><h2 className="menwe-premium-title mt-1">Filtered student roster</h2><p className="menwe-premium-copy mt-2">Only active learners enrolled in your assigned classes are shown.</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b border-[var(--ink)]/10 text-xs font-bold uppercase tracking-[.1em] text-[var(--ink)]/45"><th className="p-3">Learner</th><th className="p-3">Admission</th><th className="p-3">Class</th></tr></thead><tbody>{learners.map(student => { const cls=classes.find(c=>String(c.id)===String(student.class_id)); return <tr key={String(student.id)} className="border-b border-[var(--ink)]/7"><td className="p-3 font-semibold">{[student.first_name,student.middle_name,student.last_name].filter(Boolean).join(" ")}</td><td className="p-3">{student.admission_number}</td><td className="p-3">{cls?.name ?? "—"}</td></tr>; })}</tbody></table>{!loading && !learners.length && <p className="py-10 text-center text-sm text-[var(--ink)]/55">No active learners are currently enrolled in your assigned classes.</p>}</div></section>

    <section aria-label="Teacher modules"><div className="mb-5"><p className="menwe-premium-label">Teaching tools</p><h2 className="menwe-premium-title mt-1">Everything you need, without the clutter.</h2></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{modules.map(({ title, href, icon: Icon, text, featured }) => <Link key={`${title}-${href}`} href={href} className={`menwe-card menwe-interactive group rounded-[1.35rem] p-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold)] ${featured ? "ring-2 ring-[var(--gold)]/35 shadow-lg" : ""}`}><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${featured ? "bg-[var(--gold)]/15 text-[var(--accent)]" : "bg-[var(--mist)] text-[var(--accent)]"}`}><Icon size={22}/></span><div className="mt-5 flex flex-wrap items-center gap-2"><h2 className="text-lg font-extrabold text-[var(--ink)]">{title}</h2>{featured && <span className="rounded-full bg-[var(--gold)]/10 px-3 py-1 text-xs font-bold uppercase text-[var(--gold)]">Start here</span>}</div><p className="mt-2 text-sm leading-6 text-[var(--ink)]/65">{text}</p><span className="mt-6 inline-flex text-sm font-extrabold text-[var(--accent)] transition-transform group-hover:translate-x-1">{featured ? "Enter marks →" : "Open workspace →"}</span></Link>)}</div></section>
    <section className="menwe-card rounded-[1.75rem] p-6 sm:p-8"><p className="menwe-premium-label">Class fees</p><h2 className="menwe-premium-title mt-2">Class-teacher finance access</h2><p className="menwe-premium-copy mt-3">{isClassTeacher ? "Open class fees to view and record payment activity for learners in your designated class(es). Other classes are blocked by Supabase RLS." : "Fee records are restricted to designated class teachers. If you become a class teacher, the class fees workspace will appear here automatically."}</p>{isClassTeacher && <Link href="/portal/finance" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white"><CreditCard size={16}/> Open class fees</Link>}</section>
  </main></PortalLayout>;
}
