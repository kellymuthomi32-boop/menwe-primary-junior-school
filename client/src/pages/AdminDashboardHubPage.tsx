import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Activity, BookOpen, CalendarDays, ClipboardCheck, FileText, GraduationCap, LogOut, Megaphone, Users } from "lucide-react";
import { useSchoolAuth, isAdministrator } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";
import { PortalLayout } from "@/components/PortalLayout";

const modules = [
  { title: "Academic Management", href: "/portal/admin/academics", subtitle: "Manage CBC rubrics, subject allocations, and exam scores.", icon: BookOpen },
  { title: "Attendance Directory", href: "/portal/admin/attendance", subtitle: "Track daily learner attendance, roll calls, and termly reports.", icon: ClipboardCheck },
  { title: "Content Management", href: "/portal/admin/content", subtitle: "Publish academic calendar events, news, and school notices.", icon: Megaphone },
  { title: "Academic Directory", href: "/portal/admin/directory", subtitle: "Manage faculty profiles, learner UPI records, and class lists.", icon: Users },
];

export default function AdminDashboardHubPage() {
  const { user, profile, loading, signOut } = useSchoolAuth();
  const [, navigate] = useLocation();
  const [stats, setStats] = useState({ learners: 0, inquiries: 0, events: 0 });

  useEffect(() => { if (!loading && (!user || !profile)) navigate("/portal/login"); }, [loading, user, profile, navigate]);
  useEffect(() => {
    if (!user || !profile || (!isAdministrator(profile.role) && profile.role !== "TEACHER")) return;
    const load = async () => {
      const db = getSupabase();
      const [learners, inquiries, events] = await Promise.all([
        db.from("students").select("id", { count: "exact", head: true }),
        db.from("admissions_inquiries").select("id", { count: "exact", head: true }),
        db.from("events").select("id", { count: "exact", head: true }).gte("starts_at", "2026-01-01T00:00:00+03:00").lte("starts_at", "2026-12-31T23:59:59+03:00"),
      ]);
      setStats({ learners: learners.count ?? 0, inquiries: inquiries.count ?? 0, events: events.count ?? 0 });
    };
    void load();
  }, [user, profile]);

  if (loading) return <div className="grid min-h-screen place-items-center bg-[var(--paper)] text-[var(--ink)]">Loading command center…</div>;
  if (!user || !profile) return null;
  if (!isAdministrator(profile.role) && profile.role !== "TEACHER") return <PortalLayout role={profile.role}><main className="mx-auto max-w-3xl p-6"><div className="menwe-admin-card rounded-2xl p-6"><h1 className="text-2xl font-bold text-[var(--ink)]">Access restricted</h1><p className="mt-2 text-[var(--ink)]/60">Your account does not have staff command-center access.</p></div></main></PortalLayout>;

  const logout = async () => { await signOut(); navigate("/portal/login"); };
  return <PortalLayout role={profile.role}><main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
    <section className="menwe-admin-hero relative overflow-hidden rounded-[2rem] p-6 text-white sm:p-8"><div className="menwe-admin-orb"/><div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><span className="menwe-admin-kicker">Staff & Admin Command Center</span><h1 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">Good day, {profile.display_name || "Staff Member"}</h1><p className="mt-2 max-w-2xl text-white/70">Menwe Primary & Junior School · {profile.canonical_role.replaceAll("_", " ")}</p></div><button onClick={logout} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 font-semibold transition hover:bg-white/10 active:scale-[.98]"><LogOut size={18}/> Sign out</button></div></section>
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={GraduationCap} label="Enrolled Learners" value={String(stats.learners)} /><Stat icon={Users} label="Active TSC/BOM Faculty" value="23" /><Stat icon={FileText} label="Admission Inquiries" value={String(stats.inquiries)} /><Stat icon={CalendarDays} label="2026 Events" value={String(stats.events)} /></section>
    <section><div className="mb-4"><h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">Management modules</h2><p className="mt-1 text-[var(--ink)]/55">Open a secure workspace for the area you manage.</p></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">{modules.map(({ title, href, subtitle, icon: Icon }) => <Link key={href} href={href} className="menwe-admin-action group"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><Icon size={23}/></span><h3 className="mt-5 font-bold text-[var(--ink)]">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--ink)]/55">{subtitle}</p><span className="mt-5 inline-flex text-sm font-bold text-[var(--accent)]">Open workspace →</span></Link>)}</div></section>
    <section className="grid gap-4 lg:grid-cols-2"><div className="menwe-admin-card rounded-2xl p-6"><div className="flex items-center gap-3"><Activity className="text-[var(--accent)]"/><h2 className="text-lg font-bold text-[var(--ink)]">Live operations</h2></div><p className="mt-3 text-sm leading-6 text-[var(--ink)]/65">Use the command center to coordinate CBC delivery, learner attendance, academic records and school communications from one place.</p></div><div className="menwe-admin-card rounded-2xl p-6"><div className="flex items-center gap-3"><CalendarDays className="text-[var(--accent)]"/><h2 className="text-lg font-bold text-[var(--ink)]">Academic planning</h2></div><p className="mt-3 text-sm leading-6 text-[var(--ink)]/65">Keep term schedules, sports activities, science and technology events, PTA meetings and notices current through Content Management.</p></div></section>
  </main></PortalLayout>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof GraduationCap; label: string; value: string }) {
  return <div className="menwe-admin-metric rounded-2xl p-5"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><Icon size={20}/></span><span className="text-2xl font-bold text-[var(--ink)]">{value}</span></div><p className="mt-4 text-sm font-semibold text-[var(--ink)]/55">{label}</p></div>;
}
