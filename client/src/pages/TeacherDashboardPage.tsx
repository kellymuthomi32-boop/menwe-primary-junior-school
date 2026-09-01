import { BookOpen, CalendarDays, ClipboardCheck, FileText, LogOut, MessageSquare, NotebookTabs } from "lucide-react";
import { Link, useLocation } from "wouter";
import { PortalLayout } from "@/components/PortalLayout";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";

const modules = [
  { title: "Homework", href: "/portal/homework", icon: NotebookTabs, text: "Create, review and mark assigned learner work." },
  { title: "Attendance", href: "/portal/attendance", icon: ClipboardCheck, text: "Open the authorised attendance workspace." },
  { title: "Timetable", href: "/portal/timetable", icon: CalendarDays, text: "View the current teaching timetable." },
  { title: "Exams & results", href: "/portal/exams", icon: FileText, text: "Open examinations and result workflows." },
  { title: "Messages", href: "/portal/messages", icon: MessageSquare, text: "Communicate through the protected school directory." },
  { title: "Academic workspace", href: "/portal/academics", icon: BookOpen, text: "Open the academic tools available to teaching staff." },
] as const;

export default function TeacherDashboardPage() {
  const { profile, signOut } = useSchoolAuth();
  const [, go] = useLocation();
  const firstName = profile?.display_name?.trim().split(/\s+/)[0] || "Teacher";
  const logout = async () => { await signOut(); go("/portal/login"); };
  return <PortalLayout role="TEACHER"><main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <header className="menwe-admin-hero rounded-[2rem] p-6 text-white shadow-xl sm:p-8 lg:p-10"><p className="menwe-admin-kicker"><BookOpen size={14}/> Teacher workspace</p><h1 className="mt-4 font-serif text-4xl font-semibold leading-tight sm:text-5xl">Good day, {firstName}.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">One secure teaching workspace for homework, attendance, timetable, examinations, academic tools and school communication.</p><div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-white/65"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><span className="menwe-live-dot"/> Live Supabase modules</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Authorised staff access</span></div><button type="button" onClick={() => void logout()} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 font-bold transition hover:bg-white/10"><LogOut size={16}/> Sign out</button></header>
    <section aria-label="Teacher modules" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{modules.map(({ title, href, icon: Icon, text }) => <Link key={href} href={href} className="menwe-card menwe-interactive group rounded-2xl p-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold)]"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><Icon size={22}/></span><h2 className="mt-5 text-lg font-bold text-[var(--ink)]">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--ink)]/60">{text}</p><span className="mt-5 inline-block text-sm font-bold text-[var(--accent)] transition-transform group-hover:translate-x-1">Open workspace →</span></Link>)}</section>
    <section className="menwe-card rounded-[1.75rem] p-6 sm:p-7"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[var(--accent)]">Secure workflow</p><h2 className="mt-2 font-serif text-2xl font-semibold">Your data stays behind the authorised Supabase layer.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink)]/60">The dashboard is intentionally a command center rather than a second database implementation. Each module owns its validated query and empty/error state.</p></section>
  </main></PortalLayout>;
}
