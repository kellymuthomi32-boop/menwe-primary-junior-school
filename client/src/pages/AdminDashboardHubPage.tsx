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
      const [yr, tr, learners, teachers, ops, sessions, records, contacts, content, threads, announcements, events, exams, reports, subjects, classes] = await Promise.all([
        db.from("academic_years").select("name").eq("is_current", true).maybeSingle(),
        db.from("terms").select("name").eq("is_current", true).maybeSingle(),
        db.from("students").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
        db.from("teachers").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
        db.rpc("admin_operations_summary"),
        db.from("attendance_sessions").select("id").eq("session_date", today),
        db.from("attendance_records").select("status,attendance_sessions!inner(session_date)").eq("attendance_sessions.session_date", today),
        db.from("contact_submissions").select("id").eq("status", "ACTIVE").is("read_at", null),
        db.from("content_pages").select("slug").eq("status", "DRAFT"),
        db.from("message_threads").select("id").eq("status", "OPEN"),
        db.from("announcements").select("id").eq("status", "DRAFT"),
        db.from("events").select("id", { count: "exact", head: true }).gte("starts_at", `${y}-01-01T00:00:00+03:00`).lte("starts_at", `${y}-12-31T23:59:59+03:00`),
        db.from("exams").select("id", { count: "exact", head: true }),
        db.from("report_cards").select("id", { count: "exact", head: true }),
        db.from("subjects").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
        db.from("classes").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
      ]);
      const all = [yr, tr, learners, teachers, ops, sessions, records, contacts, content, threads, announcements, events, exams, reports, subjects, classes];
      const bad = all.find((r) => r.error);
      if (bad) throw new Error(bad.error!.message);
      const summary = Array.isArray(ops.data) ? ops.data[0] : ops.data;
      const rec = records.data ?? [];
      const present = rec.filter((r) => ["present", "late"].includes(String(r.status).toLowerCase())).length;
      const rate = rec.length ? Math.round((present / rec.length) * 100) : 0;
      setYear(yr.data?.name ?? "Current academic year");
      setTerm(tr.data?.name ?? "Current term");
      setData({ learners: learners.count ?? 0, teachers: teachers.count ?? 0, admissions: Number(summary?.pending_admissions ?? 0), attendance: sessions.data?.length ?? 0, attendanceRate: rate, openInvoices: Number(summary?.open_invoices ?? 0), confirmed: Number(summary?.verified_payments ?? 0), unreadContacts: contacts.data?.length ?? 0, draftContent: content.data?.length ?? 0, openMessages: threads.data?.length ?? 0, draftAnnouncements: announcements.data?.length ?? 0, events: events.count ?? 0, exams: exams.count ?? 0, reportCards: reports.count ?? 0, subjects: subjects.count ?? 0, classes: classes.count ?? 0 });
      setUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Command-centre data could not be loaded.");
    } finally { setLoading(false); }
  }, [navigate, profile, user]);

  useEffect(() => { void load(); }, [load]);

  const kpis = [
    { label: "Learners", value: data.learners, detail: "Active learner records", icon: Users, href: "/portal/people", alert: false },
    { label: "Teachers", value: data.teachers, detail: "Active staff records", icon: GraduationCap, href: "/portal/admin/teachers", alert: false },
    { label: "Attendance", value: data.attendance ? String(data.attendanceRate) + "%" : "—", detail: data.attendance ? "Today's recorded attendance" : "No register opened today", icon: ClipboardCheck, href: "/portal/attendance", alert: !data.attendance },
    { label: "Admissions", value: data.admissions, detail: data.admissions ? "Applications need review" : "No pending applications", icon: UserPlus, href: "/portal/people", alert: Boolean(data.admissions) },
  ];

  const priorities = [
    { label: "Admissions to review", value: data.admissions, detail: "Pending / under review applications", href: "/portal/people", icon: UserPlus },
    { label: "Open messages", value: data.openMessages, detail: "Conversation threads still open", href: "/portal/messages", icon: MessageSquare },
    { label: "Draft announcements", value: data.draftAnnouncements, detail: "Official messages awaiting publishing", href: "/portal/announcements", icon: Megaphone },
    { label: "Unread enquiries", value: data.unreadContacts, detail: "Website enquiries awaiting attention", href: "/portal/content", icon: MessageSquare },
    { label: "Open invoices", value: data.openInvoices, detail: "Finance items not settled or void", href: "/portal/finance", icon: CreditCard },
  ];

  const quickActions = [
    ["Add learner", "Register or update a learner", Users, "/portal/people"],
    ["Invite teacher", "Secure staff invitation", UserPlus, "/portal/admin/teacher-invitations"],
    ["Enter marks", "Open examinations workspace", FileText, "/portal/exams"],
    ["Take attendance", "Open today's register", ClipboardCheck, "/portal/attendance"],
    ["Record payment", "Open finance workspace", CreditCard, "/portal/finance"],
    ["Post announcement", "Publish an official message", Megaphone, "/portal/announcements"],
  ] as const;

  const academic = [
    ["Classes", data.classes, "Active class groups", BookOpen, "/portal/academics"],
    ["Subjects", data.subjects, "Active learning areas", BookOpen, "/portal/academics"],
    ["Exams", data.exams, "Assessment records", FileText, "/portal/exams"],
    ["Report cards", data.reportCards, "Generated report records", FileText, "/portal/reports"],
  ] as const;

  const operations = [
    ["Verified payments", money(data.confirmed), "Verified payment value", CreditCard, "/portal/finance"],
    ["School events", data.events, "Events in the current year", CalendarDays, "/calendar"],
    ["Draft public pages", data.draftContent, "Content awaiting publication", FileText, "/portal/content"],
    ["Audit history", "Open", "Review administrative activity", ShieldCheck, "/portal/audit"],
  ] as const;

  if (loading) return <PortalLayout role="ADMIN"><main className="grid min-h-[60vh] place-items-center"><div className="flex items-center gap-3 text-sm text-[var(--ink)]/60"><Loader2 className="animate-spin text-[var(--gold)]" size={19} />Loading school command centre…</div></main></PortalLayout>;

  return <PortalLayout role="ADMIN"><main className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <header className="menwe-admin-hero relative overflow-hidden rounded-[2rem] p-6 text-white shadow-2xl sm:p-8 lg:p-10">
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="menwe-admin-kicker"><BarChart3 size={14} /> Admin command centre</span>
          <h1 className="mt-4 max-w-4xl text-3xl font-extrabold tracking-[-.04em] sm:text-4xl lg:text-5xl">School overview</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">One place to see what is happening across learners, academics, attendance, finance and communications.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-white/10 px-3 py-1.5">{year}</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">{term}</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">{updated ? "Updated " + updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Live"}</span>
          </div>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.07] px-4 text-sm font-bold hover:bg-white/[.13] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"><RefreshCw size={17} /> Refresh</button>
      </div>
    </header>

    {error && <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 sm:flex-row sm:items-center"><span className="flex items-center gap-3"><AlertTriangle size={18} />{error}</span><button type="button" onClick={() => void load()} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold hover:bg-red-100 sm:ml-auto">Try again</button></div>}

    <section aria-label="Key school figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map(({ label, value, detail, icon: Icon, href, alert }) => <button key={label} type="button" onClick={() => navigate(href)} className="menwe-admin-metric rounded-[1.35rem] p-5 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]">
        <div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><Icon size={20} /></span><span className="text-3xl font-black text-[var(--ink)]">{value}</span></div>
        <p className="mt-4 text-sm font-black text-[var(--ink)]">{label}</p>
        <p className={alert ? "mt-1 text-xs leading-5 font-bold text-amber-700" : "mt-1 text-xs leading-5 text-[var(--ink)]/50"}>{detail}</p>
      </button>)}
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <div className="menwe-card rounded-[1.75rem] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4"><div><p className="menwe-premium-label">Priority queue</p><h2 className="text-xl font-black text-[var(--ink)]">What needs attention</h2></div><AlertTriangle className="text-[var(--gold)]" size={21} /></div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {priorities.map(({ label, value, detail, href, icon: Icon }) => <button key={label} type="button" onClick={() => navigate(href)} className="group flex min-h-[76px] items-center gap-3 rounded-xl border border-[var(--ink)]/8 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--gold)]/40 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><Icon size={17} /></span><span className="min-w-0 flex-1"><b className="block text-sm">{label}</b><small className="mt-0.5 block text-xs leading-5 text-[var(--ink)]/50">{detail}</small></span><strong className="text-lg text-[var(--ink)]">{value}</strong>
          </button>)}
        </div>
      </div>

      <div className="menwe-card rounded-[1.75rem] p-5 sm:p-6">
        <p className="menwe-premium-label">Quick actions</p><h2 className="text-xl font-black text-[var(--ink)]">Common tasks</h2>
        <div className="mt-4 grid gap-2">
          {quickActions.map(([label, detail, Icon, href]) => <button key={label} type="button" onClick={() => navigate(href)} className="group flex min-h-[58px] items-center gap-3 rounded-xl border border-[var(--ink)]/8 bg-white p-2.5 text-left transition hover:border-[var(--gold)]/40 hover:bg-[var(--mist)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--mist)] text-[var(--accent)]"><Icon size={16} /></span><span className="min-w-0 flex-1"><b className="block text-sm">{label}</b><small className="block text-xs text-[var(--ink)]/50">{detail}</small></span><ArrowUpRight size={15} className="text-[var(--ink)]/25 group-hover:text-[var(--gold)]" />
          </button>)}
        </div>
      </div>
    </section>

    <section className="grid gap-6 lg:grid-cols-2">
      <div className="menwe-card rounded-[1.75rem] p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><p className="menwe-premium-label">Academic overview</p><h2 className="text-xl font-black text-[var(--ink)]">Learning & assessment</h2></div><BookOpen className="text-[var(--gold)]" size={21} /></div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {academic.map(([label, value, detail, Icon, href]) => <button key={label} type="button" onClick={() => navigate(href)} className="rounded-xl border border-[var(--ink)]/8 bg-white p-4 text-left transition hover:border-[var(--gold)]/40 hover:shadow-sm">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--mist)] text-[var(--accent)]"><Icon size={16} /></span><strong className="mt-3 block text-2xl font-black text-[var(--ink)]">{value}</strong><b className="mt-1 block text-sm">{label}</b><small className="mt-0.5 block text-xs text-[var(--ink)]/50">{detail}</small>
          </button>)}
        </div>
      </div>

      <div className="menwe-card rounded-[1.75rem] p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><p className="menwe-premium-label">Operations</p><h2 className="text-xl font-black text-[var(--ink)]">School administration</h2></div><Settings className="text-[var(--gold)]" size={21} /></div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {operations.map(([label, value, detail, Icon, href]) => <button key={label} type="button" onClick={() => navigate(href)} className="rounded-xl border border-[var(--ink)]/8 bg-white p-4 text-left transition hover:border-[var(--gold)]/40 hover:shadow-sm">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--mist)] text-[var(--accent)]"><Icon size={16} /></span><strong className="mt-3 block text-2xl font-black text-[var(--ink)]">{value}</strong><b className="mt-1 block text-sm">{label}</b><small className="mt-0.5 block text-xs text-[var(--ink)]/50">{detail}</small>
          </button>)}
        </div>
      </div>
    </section>
  </main></PortalLayout>;
}
