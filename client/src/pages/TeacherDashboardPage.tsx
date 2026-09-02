import { BookOpen, CalendarDays, ClipboardCheck, FileText, LogOut, MessageSquare, NotebookTabs, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { PortalLayout } from "@/components/PortalLayout";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";

const modules = [
  { title: "My classes & subjects", href: "/portal/academics", icon: Users, text: "See the classes and subjects assigned to your teaching account." },
  { title: "Homework", href: "/portal/homework", icon: NotebookTabs, text: "Create, review and manage assigned learner work." },
  { title: "Attendance", href: "/portal/attendance", icon: ClipboardCheck, text: "Open an authorised class register and record daily attendance." },
  { title: "Timetable", href: "/portal/timetable", icon: CalendarDays, text: "View the current teaching timetable." },
  { title: "Exams & results", href: "/portal/exams", icon: FileText, text: "Open examination and result workflows." },
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

  return <PortalLayout role="TEACHER"><main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <header className="menwe-admin-hero rounded-[2rem] p-6 text-white shadow-xl sm:p-8 lg:p-10">
      <p className="menwe-admin-kicker"><BookOpen size={14}/> Teacher workspace</p>
      <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight sm:text-5xl">Good day, {firstName}.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">A secure teaching workspace for classes, attendance, homework, timetable, examinations, results and school communication.</p>
      <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-white/65"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><span className="menwe-live-dot"/> Live Supabase modules</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Authorised staff access</span></div>
      <button type="button" onClick={() => void logout()} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 font-bold transition hover:bg-white/10"><LogOut size={16}/> Sign out</button>
    </header>

    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article className="menwe-card rounded-2xl p-5"><p className="text-xs font-extrabold uppercase tracking-[.15em] text-[var(--accent)]">Teaching assignments</p><p className="mt-2 text-3xl font-black">{assignmentError ? "—" : assignmentCount ?? "…"}</p><p className="mt-1 text-sm text-[var(--ink)]/55">Class and subject assignments linked to your teacher account.</p></article>
      <article className="menwe-card rounded-2xl p-5"><p className="text-xs font-extrabold uppercase tracking-[.15em] text-[var(--accent)]">Lower primary</p><p className="mt-2 text-lg font-bold">Grades 1–3</p><p className="mt-1 text-sm text-[var(--ink)]/55">English, Mathematics, Kiswahili and Integrated Science are available in the current setup.</p></article>
      <article className="menwe-card rounded-2xl p-5"><p className="text-xs font-extrabold uppercase tracking-[.15em] text-[var(--accent)]">Ready state</p><p className="mt-2 text-lg font-bold">{assignmentCount === 0 ? "Awaiting assignment" : assignmentCount === null ? "Checking access…" : "Teaching access ready"}</p><p className="mt-1 text-sm text-[var(--ink)]/55">An administrator must assign a class and subject before restricted teaching actions become available.</p></article>
    </section>

    <section aria-label="Teacher modules" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{modules.map(({ title, href, icon: Icon, text }) => <Link key={href} href={href} className="menwe-card menwe-interactive group rounded-2xl p-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold)]"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><Icon size={22}/></span><h2 className="mt-5 text-lg font-bold text-[var(--ink)]">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--ink)]/60">{text}</p><span className="mt-5 inline-block text-sm font-bold text-[var(--accent)] transition-transform group-hover:translate-x-1">Open workspace →</span></Link>)}</section>
    <section className="menwe-card rounded-[1.75rem] p-6 sm:p-7"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[var(--accent)]">Secure workflow</p><h2 className="mt-2 font-serif text-2xl font-semibold">Your teaching access follows real school assignments.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink)]/60">Teachers can only work with classes and subjects assigned to their staff record. When there is no assignment yet, the portal explains what needs to happen instead of presenting a broken or misleading workspace.</p></section>
  </main></PortalLayout>;
}
