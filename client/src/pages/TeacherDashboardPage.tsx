import { BookOpen, CalendarDays, ClipboardCheck, FileText, LogOut, MessageSquare, NotebookTabs, PenLine, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { PortalLayout } from "@/components/PortalLayout";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";

const modules = [
  { title: "Enter learner marks", href: "/portal/exams", icon: PenLine, text: "Select an assessment and subject, enter every learner's score, and save the results to the live report-card records.", featured: true },
  { title: "My classes & subjects", href: "/portal/academics", icon: Users, text: "Your assigned classes, streams and teaching subjects." },
  { title: "Homework", href: "/portal/homework", icon: NotebookTabs, text: "Create, review and manage learner work." },
  { title: "Attendance", href: "/portal/attendance", icon: ClipboardCheck, text: "Open an authorised class register and record attendance." },
  { title: "Timetable", href: "/portal/timetable", icon: CalendarDays, text: "See your current teaching timetable." },
  { title: "Exams & results", href: "/portal/exams", icon: FileText, text: "Create assessments and review authorised results." },
  { title: "Class marksheet", href: "/portal/class-marksheet", icon: FileText, text: "Generate a professional printable class performance sheet." },
  { title: "Messages", href: "/portal/messages", icon: MessageSquare, text: "Communicate through the protected school directory." },
] as const;

export default function TeacherDashboardPage() {
  const { profile, signOut } = useSchoolAuth();
  const [, go] = useLocation();
  const [assignmentCount, setAssignmentCount] = useState<number | null>(null);
  const [assignmentError, setAssignmentError] = useState(false);
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "Teacher";
  const logout = async () => { await signOut(); go("/portal/login"); };

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!profile?.id) return;
      try {
        const db = getSupabase();
        const teacher = await db.from("teachers").select("id").eq("profile_id", profile.id).maybeSingle();
        if (teacher.error) throw teacher.error;
        if (!teacher.data?.id) { if (active) setAssignmentCount(0); return; }
        const result = await db.from("teacher_assignments").select("id", { count: "exact", head: true }).eq("teacher_id", teacher.data.id);
        if (result.error) throw result.error;
        if (active) setAssignmentCount(result.count ?? 0);
      } catch { if (active) setAssignmentError(true); }
    };
    void load();
    return () => { active = false; };
  }, [profile?.id]);

  return <PortalLayout role="TEACHER"><main className="mx-auto w-full max-w-[1440px] space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
    <header className="menwe-admin-hero rounded-[2.25rem] p-6 text-white shadow-2xl sm:p-9 lg:p-11">
      <p className="menwe-admin-kicker"><BookOpen size={14}/> Teacher workspace</p>
      <h1 className="mt-5 text-4xl font-extrabold leading-[1.02] tracking-[-.045em] sm:text-5xl lg:text-6xl">Good day, {firstName}.</h1>
      <p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/80 sm:text-base">A focused professional workspace for the classes, learners, attendance, coursework and assessments you are authorised to manage.</p>
      <div className="mt-7 flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-3.5 py-2 text-xs font-bold text-white/80"><span className="menwe-live-dot"/> Live school data</span><span className="rounded-full border border-white/10 bg-white/[.07] px-3.5 py-2 text-xs font-bold text-white/80">Staff access</span></div>
      <button type="button" onClick={() => void logout()} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-4 font-extrabold text-[var(--ink)] shadow-lg transition hover:brightness-105"><LogOut size={16}/> Sign out</button>
    </header>

    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article className="menwe-admin-metric rounded-[1.35rem]"><p className="menwe-premium-label">Teaching assignments</p><p className="mt-3 text-3xl font-black">{assignmentError ? "—" : assignmentCount ?? "…"}</p><p className="mt-2 text-sm leading-6 text-[var(--ink)]/65">Classes and subjects currently linked to your teacher account.</p></article>
      <article className="menwe-admin-metric rounded-[1.35rem]"><p className="menwe-premium-label">Lower primary</p><p className="mt-3 text-xl font-extrabold">Grades 1–3</p><p className="mt-2 text-sm leading-6 text-[var(--ink)]/65">English, Kiswahili, Mathematics and Integrated Science are configured.</p></article>
      <article className="menwe-admin-metric rounded-[1.35rem]"><p className="menwe-premium-label">Access status</p><p className="mt-3 text-xl font-extrabold">{assignmentCount === 0 ? "Awaiting assignment" : assignmentCount === null ? "Checking access…" : "Teaching access ready"}</p><p className="mt-2 text-sm leading-6 text-[var(--ink)]/65">Restricted teaching actions follow your live staff assignments.</p></article>
    </section>

    <section aria-label="Teacher modules"><div className="mb-5"><p className="menwe-premium-label">Teaching tools</p><h2 className="menwe-premium-title mt-1">Everything you need, without the clutter.</h2><p className="menwe-premium-copy mt-2 max-w-2xl">Clear actions, strong hierarchy and real school records make the workspace faster to use during the school day.</p></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{modules.map(({ title, href, icon: Icon, text, featured }) => <Link key={`${title}-${href}`} href={href} className={`menwe-card menwe-interactive group rounded-[1.35rem] p-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold)] ${featured ? "ring-2 ring-[var(--gold)]/35 shadow-lg" : ""}`}><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${featured ? "bg-[var(--gold)]/15 text-[var(--accent)]" : "bg-[var(--mist)] text-[var(--accent)]"}`}><Icon size={22}/></span><div className="mt-5 flex flex-wrap items-center gap-2"><h2 className="text-lg font-extrabold text-[var(--ink)]">{title}</h2>{featured && <span className="rounded-full bg-[var(--gold)]/10 px-3 py-1 text-xs font-bold uppercase text-[var(--gold)]">Start here</span>}</div><p className="mt-2 text-sm leading-6 text-[var(--ink)]/65">{text}</p><span className="mt-6 inline-flex text-sm font-extrabold text-[var(--accent)] transition-transform group-hover:translate-x-1">{featured ? "Enter marks →" : "Open workspace →"}</span></Link>)}</div></section>
    <section className="menwe-card rounded-[1.75rem] p-6 sm:p-8"><p className="menwe-premium-label">Marks workflow</p><h2 className="menwe-premium-title mt-2">Enter marks first, then review the marksheet.</h2><p className="menwe-premium-copy mt-3 max-w-3xl">Use <strong>Enter learner marks</strong> to choose the assessment and subject, enter scores for the enrolled learners, and save them. Use <strong>Class marksheet</strong> afterward to review the class performance.</p></section>
    <section className="menwe-card rounded-[1.75rem] p-6 sm:p-8"><p className="menwe-premium-label">Secure workflow</p><h2 className="menwe-premium-title mt-2">Your access follows real school assignments.</h2><p className="menwe-premium-copy mt-3 max-w-3xl">Teachers can only work with classes and subjects assigned to their staff record. When an assignment is missing, the portal explains the state instead of presenting misleading controls.</p></section>
  </main></PortalLayout>;
}
