import { AlertTriangle, ArrowUpRight, BarChart3, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, CreditCard, FileText, GraduationCap, Loader2, Megaphone, MessageSquare, RefreshCw, Settings, ShieldCheck, UserPlus, Users, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";
import { PortalLayout } from "@/components/PortalLayout";

type Metric = { label: string; value: string | number; detail: string; icon: typeof Users; href: string; tone?: "good" | "warn" };
type Attention = { label: string; value: number; detail: string; href: string; icon: typeof Users };
const money = (v: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(v);

const quickActions = [
  ["Add learner", "Create or update a learner record", Users, "/portal/people"],
  ["Invite teacher", "Send a secure staff invitation", UserPlus, "/portal/admin/teacher-invitations"],
  ["Take attendance", "Open today's register", ClipboardCheck, "/portal/attendance"],
  ["Record payment", "Review finance and payments", CreditCard, "/portal/finance"],
  ["Post announcement", "Publish an official school message", Megaphone, "/portal/announcements"],
  ["View audit trail", "Review recent administrative activity", ShieldCheck, "/portal/audit"],
] as const;

export default function AdminDashboardHubPage() {
  const { user, profile } = useSchoolAuth();
  const [, navigate] = useLocation();
  const [data, setData] = useState({ learners: 0, teachers: 0, admissions: 0, attendance: 0, attendanceRate: 0, openInvoices: 0, confirmed: 0, unreadContacts: 0, draftContent: 0, openMessages: 0, draftAnnouncements: 0, events: 0, exams: 0, reportCards: 0, subjects: 0, classes: 0 });
  const [year, setYear] = useState("Current academic year");
  const [term, setTerm] = useState("Current term");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!user || !profile) return;
    if (!isAdministrator(profile.role)) { navigate("/portal"); return; }
    setLoading(true); setError("");
    try {
      const db = getSupabase();
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const y = new Date().getFullYear();
      const [yr, tr, learners, teachers, apps, sessions, records, invoices, payments, contacts, content, threads, announcements, events, exams, reports, subjects, classes] = await Promise.all([
        db.from("academic_years").select("name").eq("is_current", true).maybeSingle(),
        db.from("terms").select("name").eq("is_current", true).maybeSingle(),
        db.from("students").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
        db.from("teachers").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
        db.from("admission_applications").select("id,status"),
        db.from("attendance_sessions").select("id").eq("session_date", today),
        db.from("attendance_records").select("status,attendance_sessions!inner(session_date)").eq("attendance_sessions.session_date", today),
        db.from("invoices").select("id,status"),
        db.from("payments").select("amount,status").eq("status", "VERIFIED"),
        db.from("contact_submissions").select("id,status,read_at").eq("status", "ACTIVE").is("read_at", null),
        db.from("content_pages").select("slug,status").eq("status", "DRAFT"),
        db.from("message_threads").select("id,status").eq("status", "OPEN"),
        db.from("announcements").select("id,status").eq("status", "DRAFT"),
        db.from("events").select("id", { count: "exact", head: true }).gte("starts_at", `${y}-01-01T00:00:00+03:00`).lte("starts_at", `${y}-12-31T23:59:59+03:00`),
        db.from("exams").select("id", { count: "exact", head: true }),
        db.from("report_cards").select("id", { count: "exact", head: true }),
        db.from("subjects").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
        db.from("classes").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
      ]);
      const all = [yr, tr, learners, teachers, apps, sessions, records, invoices, payments, contacts, content, threads, announcements, events, exams, reports, subjects, classes];
      const bad = all.find((r) => r.error);
      if (bad) throw new Error(bad.error!.message);
      const applications = apps.data ?? [];
      const pending = applications.filter((r) => ["submitted", "pending", "under_review"].includes(String(r.status).toLowerCase())).length;
      const inv = invoices.data ?? [];
      const openInvoices = inv.filter((r) => !["PAID", "VOID", "CANCELLED"].includes(String(r.status).toUpperCase())).length;
      const confirmed = (payments.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      const rec = records.data ?? [];
      const present = rec.filter((r) => ["present", "late"].includes(String(r.status).toLowerCase())).length;
      const rate = rec.length ? Math.round((present / rec.length) * 100) : 0;
      setYear(yr.data?.name ?? "Current academic year");
      setTerm(tr.data?.name ?? "Current term");
      setData({ learners: learners.count ?? 0, teachers: teachers.count ?? 0, admissions: pending, attendance: sessions.data?.length ?? 0, attendanceRate: rate, openInvoices, confirmed, unreadContacts: contacts.data?.length ?? 0, draftContent: content.data?.length ?? 0, openMessages: threads.data?.length ?? 0, draftAnnouncements: announcements.data?.length ?? 0, events: events.count ?? 0, exams: exams.count ?? 0, reportCards: reports.count ?? 0, subjects: subjects.count ?? 0, classes: classes.count ?? 0 });
      setUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Command-centre data could not be loaded.");
    } finally { setLoading(false); }
  }, [navigate, profile, user]);

  useEffect(() => { void load(); }, [load]);

  const metrics: Metric[] = useMemo(() => [
    { label: "Active learners", value: data.learners, detail: "Active student records", icon: Users, href: "/portal/people" },
    { label: "Active educators", value: data.teachers, detail: "Current teacher records", icon: GraduationCap, href: "/portal/people" },
    { label: "Admissions queue", value: data.admissions, detail: "Submitted, pending or under review", icon: ClipboardCheck, href: "/portal/people", tone: data.admissions ? "warn" : "good" },
    { label: "Attendance today", value: data.attendance ? `${data.attendanceRate}%` : "—", detail: data.attendance ? `${data.attendance} session(s) captured today` : "No attendance session captured yet", icon: CalendarDays, href: "/portal/attendance", tone: data.attendance ? "good" : "warn" },
    { label: "Open invoices", value: data.openInvoices, detail: "Not paid, void or cancelled", icon: CreditCard, href: "/portal/finance", tone: data.openInvoices ? "warn" : "good" },
    { label: "Verified payments", value: money(data.confirmed), detail: "Verified payment value", icon: CreditCard, href: "/portal/finance" },
    { label: "Open messages", value: data.openMessages, detail: "Conversation threads needing attention", icon: MessageSquare, href: "/portal/messages", tone: data.openMessages ? "warn" : "good" },
    { label: "Draft announcements", value: data.draftAnnouncements, detail: "Official messages not yet published", icon: Megaphone, href: "/portal/announcements", tone: data.draftAnnouncements ? "warn" : "good" },
  ], [data]);

  const attention: Attention[] = [
    { label: "Admissions", value: data.admissions, detail: "Applications to review", href: "/portal/people", icon: Users },
    { label: "Contact enquiries", value: data.unreadContacts, detail: "New or unread enquiries", href: "/portal/content", icon: MessageSquare },
    { label: "Open messages", value: data.openMessages, detail: "Threads still open", href: "/portal/messages", icon: MessageSquare },
    { label: "Draft announcements", value: data.draftAnnouncements, detail: "Ready for review or publishing", href: "/portal/announcements", icon: Megaphone },
    { label: "Draft public pages", value: data.draftContent, detail: "Content still in draft", href: "/portal/content", icon: FileText },
  ];

  const capabilities = [
    ["People & enrolment", "Learners, admissions, parents and staff", Users, "/portal/people"],
    ["Teacher invitations", "Invite teachers and link accounts to staff records", UserPlus, "/portal/admin/teacher-invitations"],
    ["Academic setup", "Years, terms, classes and subjects", BookOpen, "/portal/academics"],
    ["Attendance", "Daily register and attendance records", ClipboardCheck, "/portal/attendance"],
    ["Exams & report cards", "Exams, marks, grades and reports", FileText, "/portal/exams"],
    ["Finance", "Invoices, payments and balances", CreditCard, "/portal/finance"],
    ["Homework & timetable", "Learning work and school schedules", CalendarDays, "/portal/homework"],
    ["School content", "Pages, news, events and enquiries", Settings, "/portal/content"],
    ["Gallery", "School media and albums", Settings, "/portal/gallery"],
    ["Communications", "Announcements, messages and notifications", Megaphone, "/portal/announcements"],
    ["Operations & reports", "Live operational summaries", BarChart3, "/portal/operations"],
    ["School settings", "Public contact and system configuration", Settings, "/portal/settings"],
    ["Audit history", "Governance and recorded actions", ShieldCheck, "/portal/audit"],
  ] as const;

  if (loading) return <PortalLayout role="ADMIN"><main className="grid min-h-[60vh] place-items-center"><div className="flex items-center gap-3 text-sm text-[var(--ink)]/60"><Loader2 className="animate-spin text-[var(--gold)]" size={19} />Loading school command centre…</div></main></PortalLayout>;

  return <PortalLayout role="ADMIN"><main className="mx-auto w-full max-w-[1500px] space-y-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
    <header className="menwe-admin-hero relative overflow-hidden rounded-[2.25rem] p-6 text-white shadow-2xl sm:p-9 lg:p-11">
      <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"><div>
        <span className="menwe-admin-kicker"><BarChart3 size={14} /> School command centre</span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">Good to see you. Here’s what needs attention.</h1>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-white/75">A live operational view of people, learning, attendance, finance, communications and governance.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white/10 px-3 py-1.5">{year}</span><span className="rounded-full bg-white/10 px-3 py-1.5">{term}</span><span className="rounded-full bg-white/10 px-3 py-1.5">{updated ? `Updated ${updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Live"}</span></div>
      </div><button type="button" onClick={() => void load()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.06] px-4 text-sm font-bold hover:bg-white/[.12] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"><RefreshCw size={17} /> Refresh live data</button></div>
    </header>
    {error && <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 sm:flex-row sm:items-center"><span className="flex items-center gap-3"><AlertTriangle size={18} />{error}</span><button type="button" onClick={() => void load()} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold hover:bg-red-100 sm:ml-auto">Try again</button></div>}
    <section aria-labelledby="quick-actions" className="menwe-card rounded-[1.75rem] p-5 sm:p-6"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--gold)]/15 text-[var(--gold)]"><Zap size={17} /></span><div><p className="menwe-premium-label">Quick actions</p><h2 id="quick-actions" className="text-lg font-black text-[var(--ink)]">Get important work done faster</h2></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{quickActions.map(([label, detail, Icon, href]) => <button key={label} type="button" onClick={() => navigate(href)} className="group flex min-h-[72px] items-center gap-3 rounded-xl border border-[var(--ink)]/8 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--gold)]/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><Icon size={18} /></span><span className="min-w-0 flex-1"><b className="block text-sm">{label}</b><span className="mt-0.5 block text-xs text-[var(--ink)]/50">{detail}</span></span><ArrowUpRight size={15} className="text-[var(--ink)]/25 group-hover:text-[var(--gold)]" /></button>)}</div></section>
    <section aria-label="School metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((m) => <button key={m.label} type="button" onClick={() => navigate(m.href)} className="menwe-admin-metric rounded-[1.35rem] p-5 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"><div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><m.icon size={20} /></span><span className="text-right text-2xl font-black text-[var(--ink)]">{m.value}</span></div><div className="mt-5 flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${m.tone === "warn" ? "bg-[var(--gold)]" : "bg-emerald-500"}`} /><p className="text-sm font-extrabold text-[var(--ink)]">{m.label}</p></div><p className="mt-1 text-xs leading-5 text-[var(--ink)]/50">{m.detail}</p></button>)}</section>
    <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]"><div className="menwe-card rounded-[1.75rem] p-6 sm:p-8"><div><p className="menwe-premium-label">Needs attention</p><h2 className="menwe-premium-title mt-1">Work queue</h2></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{attention.map((item)=><button key={item.label} type="button" onClick={()=>navigate(item.href)} className="flex min-h-[88px] items-center gap-4 rounded-2xl border border-[var(--ink)]/8 bg-white p-4 text-left hover:border-[var(--gold)]/35 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><item.icon size={19}/></span><span className="min-w-0 flex-1"><b className="block text-sm">{item.label}</b><span className="mt-1 block text-xs leading-5 text-[var(--ink)]/50">{item.detail}</span></span><span className="text-xl font-black text-[var(--ink)]">{item.value}</span></button>)}</div></div><div className="menwe-card rounded-[1.75rem] p-6 sm:p-8"><p className="menwe-premium-label">System snapshot</p><h2 className="menwe-premium-title mt-1">Administration at a glance</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{[["Classes",data.classes],["Subjects",data.subjects],["Exams",data.exams],["Report cards",data.reportCards],["Events this year",data.events]].map(([label,value])=><div key={label} className="rounded-2xl border border-[var(--ink)]/8 bg-white p-4"><p className="text-2xl font-black text-[var(--ink)]">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-[.08em] text-[var(--ink)]/45">{label}</p></div>)}</div><div className="mt-5 rounded-2xl bg-[var(--mist)] p-4 text-sm leading-6 text-[var(--ink)]/65">Use the navigation groups to move from overview work into the specific school records you are authorised to manage.</div></div></section>
    <section className="menwe-card rounded-[1.75rem] p-6 sm:p-8"><p className="menwe-premium-label">Administration</p><h2 className="menwe-premium-title mt-1">Everything you can manage</h2><div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{capabilities.map(([title,detail,Icon,href])=><button key={title} type="button" onClick={()=>navigate(href)} className="group flex items-start gap-4 rounded-2xl border border-[var(--ink)]/8 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--gold)]/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><Icon size={18}/></span><span className="min-w-0 flex-1"><b className="block text-sm">{title}</b><span className="mt-1 block text-xs leading-5 text-[var(--ink)]/50">{detail}</span></span><ArrowUpRight size={15} className="mt-1 text-[var(--ink)]/20 group-hover:text-[var(--gold)]"/></button>)}</div></section>
    <footer className="pb-4 text-xs text-[var(--ink)]/45">Menwe administration command centre. Live data is loaded from the current school records.</footer>
  </main></PortalLayout>;
}
