import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Activity, BookOpen, CalendarDays, ClipboardCheck, FileText, GraduationCap, LogOut, Megaphone, Users } from "lucide-react";
import { useSchoolAuth, isAdministrator } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";
import { PortalLayout } from "@/components/PortalLayout";

const modules = [
  { title: "Academic Management", href: "/portal/admin/academics", subtitle: "Manage CBC rubrics, subject allocations, and exam scores.", icon: BookOpen },
  { title: "Attendance Directory", href: "/portal/admin/attendance", subtitle: "Track daily learner attendance, roll calls, and termly reports.", icon: ClipboardCheck },
  { title: "Content Management", href: "/portal/admin/content", subtitle: "Publish 2026 academic calendar events, news, and school notices.", icon: Megaphone },
  { title: "Academic Directory", href: "/portal/admin/directory", subtitle: "Manage 23-teacher faculty profiles, learner UPI records, and class lists.", icon: Users },
];

export default function AdminDashboardHubPage() {
  const { user, profile, loading, signOut } = useSchoolAuth();
  const [, navigate] = useLocation();
  const [stats, setStats] = useState({ learners: 0, inquiries: 0, events: 0 });

  useEffect(() => { if (!loading && (!user || !profile)) navigate("/portal/login"); }, [loading, user, profile, navigate]);
  useEffect(() => {
    if (!user || !profile || !isAdministrator(profile.role) && profile.role !== "TEACHER") return;
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

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f8f9fa] text-[#061229]">Loading command center…</div>;
  if (!user || !profile) return null;
  if (!isAdministrator(profile.role) && profile.role !== "TEACHER") return <PortalLayout role={profile.role}><main className="mx-auto max-w-3xl p-6"><div className="rounded-2xl border border-red-100 bg-white p-6 shadow-md"><h1 className="text-2xl font-bold text-[#061229]">Access restricted</h1><p className="mt-2 text-slate-600">Your account does not have staff command-center access.</p></div></main></PortalLayout>;

  const logout = async () => { await signOut(); navigate("/portal/login"); };
  return <PortalLayout role={profile.role}><main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
    <section className="overflow-hidden rounded-2xl bg-[#061229] p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><span className="inline-flex rounded-full bg-[#D89B28]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#D89B28]">Staff & Admin Command Center</span><h1 className="mt-4 text-3xl font-bold sm:text-4xl">Good day, {profile.display_name || "Staff Member"}</h1><p className="mt-2 max-w-2xl text-white/70">Menwe Primary & Junior School · {profile.canonical_role.replaceAll("_", " ")}</p></div><button onClick={logout} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 font-semibold transition hover:bg-white/10 active:scale-[.98]"><LogOut size={18}/> Sign out</button></div></section>
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={GraduationCap} label="Enrolled Learners" value={String(stats.learners)} /><Stat icon={Users} label="Active TSC/BOM Faculty" value="23" /><Stat icon={FileText} label="Admission Inquiries" value={String(stats.inquiries)} /><Stat icon={CalendarDays} label="2026 Events" value={String(stats.events)} /></section>
    <section><div className="mb-4"><h2 className="text-2xl font-bold text-[#061229]">Management modules</h2><p className="mt-1 text-slate-500">Open a secure workspace for the area you manage.</p></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">{modules.map(({ title, href, subtitle, icon: Icon }) => <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl active:scale-[.98]"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229]"><Icon size={23}/></span><h3 className="mt-5 font-bold text-[#061229]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p><span className="mt-5 inline-flex text-sm font-bold text-[#D89B28]">Open workspace →</span></Link>)}</div></section>
    <section className="grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md"><div className="flex items-center gap-3"><Activity className="text-[#D89B28]"/><h2 className="text-lg font-bold text-[#061229]">Live operations</h2></div><p className="mt-3 text-sm leading-6 text-slate-600">Use the command center to coordinate CBC delivery, learner attendance, academic records and school communications from one place.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md"><div className="flex items-center gap-3"><CalendarDays className="text-[#D89B28]"/><h2 className="text-lg font-bold text-[#061229]">2026 planning</h2></div><p className="mt-3 text-sm leading-6 text-slate-600">Keep term schedules, sports activities, science and technology events, PTA meetings and notices current through Content Management.</p></div></section>
  </main></PortalLayout>;
}
function Stat({ icon: Icon, label, value }: { icon: typeof GraduationCap; label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229]"><Icon size={20}/></span><span className="text-2xl font-bold text-[#061229]">{value}</span></div><p className="mt-4 text-sm font-semibold text-slate-500">{label}</p></div>; }
