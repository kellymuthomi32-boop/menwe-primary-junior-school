import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, CreditCard, FileText, GraduationCap, Loader2, Megaphone, RefreshCw, Users, ArrowUpRight, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";

type Row = Record<string, unknown>;
type Metric = { label: string; value: string; detail: string; icon: typeof Activity; tone?: "good" | "warn" | "neutral" };
const text = (v: unknown) => (v == null ? "" : String(v));
const money = (v: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(v);

export default function AdminOperationsPage() {
  const { user, profile, loading: authLoading } = useSchoolAuth();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [attendance, setAttendance] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [yearName, setYearName] = useState("Current academic year");
  const [termName, setTermName] = useState("Current term");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!user || !profile || !isAdministrator(profile.role)) return;
    setLoading(true); setError(null);
    try {
      const db = getSupabase();
      const today = new Date().toISOString().slice(0, 10);
      const year = new Date().getFullYear();
      const [yearRes, termRes, studentsRes, admissionsRes, sessionsRes, recordsRes, eventsRes, noticesRes, paymentsRes, invoicesRes] = await Promise.all([
        db.from("academic_years").select("id,name").eq("is_current", true).maybeSingle(),
        db.from("terms").select("id,name").eq("is_current", true).maybeSingle(),
        db.from("students").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
        db.from("admission_applications").select("id,status"),
        db.from("attendance_sessions").select("id").eq("session_date", today),
        db.from("attendance_records").select("status,attendance_sessions!inner(session_date)").eq("attendance_sessions.session_date", today),
        db.from("events").select("id", { count: "exact", head: true }).gte("starts_at", `${year}-01-01T00:00:00+03:00`).lte("starts_at", `${year}-12-31T23:59:59+03:00`),
        db.from("announcements").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED"),
        db.from("payments").select("amount,status").eq("status", "CONFIRMED"),
        db.from("invoices").select("id,status"),
      ]);
      for (const result of [yearRes, termRes, studentsRes, admissionsRes, sessionsRes, recordsRes, eventsRes, noticesRes, paymentsRes, invoicesRes]) if (result.error) throw result.error;

      setYearName(text(yearRes.data?.name) || "Current academic year");
      setTermName(text(termRes.data?.name) || "Current term");
      const applications = (admissionsRes.data ?? []) as Row[];
      const pending = applications.filter(r => ["submitted", "pending", "under_review"].includes(text(r.status).toLowerCase())).length;
      const confirmed = ((paymentsRes.data ?? []) as Row[]).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
      const openInvoices = ((invoicesRes.data ?? []) as Row[]).filter(r => !["PAID", "CANCELLED"].includes(text(r.status).toUpperCase())).length;
      const records = (recordsRes.data ?? []) as Row[];
      const counts = records.reduce<{ present: number; absent: number; late: number }>((acc, r) => { const status = text(r.status).toLowerCase(); if (status === "present") acc.present++; else if (status === "absent") acc.absent++; else if (status === "late") acc.late++; return acc; }, { present: 0, absent: 0, late: 0 });
      setAttendance({ ...counts, total: counts.present + counts.absent + counts.late });
      setMetrics([
        { label: "Learners", value: String(studentsRes.count ?? 0), detail: "Active student records", icon: GraduationCap },
        { label: "Admissions queue", value: String(pending), detail: "Applications awaiting review", icon: Users, tone: pending ? "warn" : "good" },
        { label: "Attendance today", value: String(sessionsRes.data?.length ?? 0), detail: records.length ? `${records.length} learner records captured` : "No learner records captured yet", icon: ClipboardCheck, tone: records.length ? "good" : "warn" },
        { label: "Published notices", value: String(noticesRes.count ?? 0), detail: "Published announcements", icon: Megaphone },
        { label: `${year} events`, value: String(eventsRes.count ?? 0), detail: "Calendar records this year", icon: CalendarDays },
        { label: "Confirmed payments", value: money(confirmed), detail: "Confirmed payment value", icon: CreditCard },
        { label: "Open invoices", value: String(openInvoices), detail: "Not paid or cancelled", icon: BarChart3, tone: openInvoices ? "warn" : "good" },
      ]);
      setLastUpdated(new Date());
    } catch (e) { setError(e instanceof Error ? e.message : "School command data could not be loaded."); }
    finally { setLoading(false); }
  }, [profile, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile) { navigate("/portal/login"); return; }
    if (!isAdministrator(profile.role)) { navigate("/portal/parent"); return; }
    void load();
  }, [authLoading, load, navigate, profile, user]);

  const attendanceRate = useMemo(() => attendance.total ? Math.round(((attendance.present + attendance.late) / attendance.total) * 100) : 0, [attendance]);

  if (authLoading || loading) return <PortalLayout role="ADMIN"><main className="grid min-h-[60vh] place-items-center"><div className="flex items-center gap-3 text-sm text-[var(--ink)]/60"><Loader2 className="animate-spin text-[var(--gold)]" size={18}/>Loading school command center…</div></main></PortalLayout>;

  const actions = [["/portal/attendance", "Attendance register", ClipboardCheck], ["/portal/people", "People & enrolment", Users], ["/portal/finance", "Finance directory", CreditCard], ["/portal/exams", "Exams & results", BarChart3], ["/portal/class-marksheet", "Class marksheets", FileText], ["/portal/content", "School content", Megaphone]] as const;
  return <PortalLayout role="ADMIN"><main className="mx-auto w-full max-w-[1440px] space-y-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
    <header className="menwe-admin-hero relative overflow-hidden rounded-[2.25rem] p-6 text-white shadow-2xl sm:p-9 lg:p-11"><div className="menwe-admin-orb"/><div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"><div><span className="menwe-admin-kicker"><Activity size={14}/> School command & reports</span><h1 className="mt-5 text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">Command the school from one place.</h1><p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/75">Live operational intelligence for learners, attendance, admissions, finance, communication and academic reporting.</p><div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white/10 px-3 py-1.5">{yearName}</span><span className="rounded-full bg-white/10 px-3 py-1.5">{termName}</span><span className="rounded-full bg-white/10 px-3 py-1.5">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Live"}</span></div></div><button onClick={() => void load()} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/[.06] px-4 text-sm font-bold transition hover:bg-white/[.12]"><RefreshCw size={17}/>Refresh live data</button></div></header>
    {error && <div role="alert" className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"><AlertTriangle size={18}/>{error}</div>}
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="menwe-admin-metric rounded-[1.35rem] p-5"><div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><Icon size={20}/></span><span className="text-right text-2xl font-black text-[var(--ink)]">{value}</span></div><div className="mt-5 flex items-center gap-2"><p className="text-sm font-extrabold text-[var(--ink)]">{label}</p>{tone === "warn" && <span className="h-2 w-2 rounded-full bg-[var(--gold)]"/>}{tone === "good" && <CheckCircle2 size={14} className="text-emerald-600"/>}</div><p className="mt-1 text-xs leading-5 text-[var(--ink)]/55">{detail}</p></article>)}</section>
    <section className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><article className="menwe-card rounded-[1.75rem] p-6 sm:p-7"><div className="flex items-center justify-between gap-4"><div><p className="menwe-premium-label">Today at a glance</p><h2 className="menwe-premium-title mt-1">Attendance command</h2></div><button onClick={() => navigate("/portal/attendance")} className="inline-flex items-center gap-1 text-sm font-bold text-[var(--accent)]">Open register <ArrowUpRight size={16}/></button></div><div className="mt-7 grid gap-3 sm:grid-cols-4">{[["Present", attendance.present], ["Late", attendance.late], ["Absent", attendance.absent], ["Rate", `${attendanceRate}%`]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-[var(--mist)] p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/45">{label}</p><p className="mt-2 text-2xl font-black text-[var(--ink)]">{value}</p></div>)}</div><p className="mt-5 text-xs leading-5 text-[var(--ink)]/55">Attendance figures reflect only records actually captured today. The system does not assume unrecorded learners are present.</p></article><article className="menwe-card rounded-[1.75rem] p-6 sm:p-7"><p className="menwe-premium-label">Reporting shortcuts</p><h2 className="menwe-premium-title mt-1">Go straight to the work.</h2><div className="mt-5 space-y-2">{actions.map(([href, label, Icon]) => <button key={href} onClick={() => navigate(href)} className="menwe-admin-action flex w-full items-center justify-between rounded-xl p-4 text-left text-sm font-bold"><span className="flex items-center gap-3"><Icon size={17} className="text-[var(--accent)]"/>{label}</span><ArrowUpRight size={16} className="text-[var(--accent)]"/></button>)}</div></article></section>
    <section className="menwe-card rounded-[1.75rem] p-6 sm:p-7"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><CheckCircle2 size={20}/></span><div><p className="menwe-premium-label">Reporting integrity</p><h2 className="menwe-premium-title mt-1">Live data, explicit gaps.</h2></div></div><p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--ink)]/65">Every report above is calculated from the production Supabase tables. Empty attendance, finance or admissions data stays empty and is clearly labelled instead of being replaced with placeholder figures.</p></section>
  </main></PortalLayout>;
}
