import { useCallback, useEffect, useState } from "react";
import { Activity, BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, CreditCard, FileText, GraduationCap, Loader2, Megaphone, RefreshCw, Users } from "lucide-react";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";

type Metric = { label: string; value: string; detail: string; icon: typeof Activity };
const money = (value: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);

export default function AdminOperationsPage() {
  const { user, profile, loading: authLoading } = useSchoolAuth();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    if (!user || !profile || !isAdministrator(profile.role)) return;
    setLoading(true); setError(null);
    try {
      const db = getSupabase();
      const today = new Date().toISOString().slice(0, 10);
      const year = new Date().getFullYear();
      const [students, admissions, attendance, events, notices, payments, charges] = await Promise.all([
        db.from("students").select("id", { count: "exact", head: true }),
        db.from("admissions").select("id,status", { count: "exact" }),
        db.from("daily_attendance").select("status").eq("date", today),
        db.from("events").select("id", { count: "exact", head: true }).gte("starts_at", `${year}-01-01T00:00:00+03:00`).lte("starts_at", `${year}-12-31T23:59:59+03:00`),
        db.from("announcements").select("id", { count: "exact", head: true }).eq("status", "published"),
        db.from("payments").select("amount,status").eq("status", "Confirmed"),
        db.from("charges").select("amount,status"),
      ]);
      if (students.error) throw students.error;
      if (admissions.error) throw admissions.error;
      if (attendance.error) throw attendance.error;
      if (events.error) throw events.error;
      if (notices.error) throw notices.error;
      if (payments.error) throw payments.error;
      if (charges.error) throw charges.error;
      const present = (attendance.data ?? []).filter(row => String(row.status).toLowerCase() === "present").length;
      const absent = (attendance.data ?? []).filter(row => String(row.status).toLowerCase() === "absent").length;
      const late = (attendance.data ?? []).filter(row => String(row.status).toLowerCase() === "late").length;
      const pending = (admissions.data ?? []).filter(row => ["pending", "under_review"].includes(String(row.status).toLowerCase())).length;
      const confirmedPayments = (payments.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
      const openCharges = (charges.data ?? []).filter(row => !["Paid", "Cancelled", "Written Off"].includes(String(row.status))).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
      setMetrics([
        { label: "Learners", value: String(students.count ?? 0), detail: "Live student records", icon: GraduationCap },
        { label: "Admissions queue", value: String(pending), detail: "Pending + under review", icon: Users },
        { label: "Attendance today", value: String(present), detail: `${absent} absent · ${late} late`, icon: ClipboardCheck },
        { label: "Published notices", value: String(notices.count ?? 0), detail: "Visible school communications", icon: Megaphone },
        { label: `${year} events`, value: String(events.count ?? 0), detail: "Calendar records", icon: CalendarDays },
        { label: "Confirmed payments", value: money(confirmedPayments), detail: "Confirmed payment value", icon: CreditCard },
        { label: "Open charges", value: money(openCharges), detail: "Unsettled charge value", icon: BarChart3 },
      ]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Operations data could not be loaded."); }
    finally { setLoading(false); }
  }, [profile, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile) { navigate("/portal/login"); return; }
    if (!isAdministrator(profile.role)) { navigate("/portal/parent"); return; }
    void load();
  }, [authLoading, load, navigate, profile, refreshKey, user]);

  if (authLoading || loading) return <main className="mx-auto grid min-h-[60vh] place-items-center p-8"><div className="flex items-center gap-3 text-sm text-[var(--ink)]/60"><Loader2 className="animate-spin text-[var(--accent)]" size={18}/>Loading operations…</div></main>;
  return <main className="mx-auto w-full max-w-[1440px] min-w-0 space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8"><header className="rounded-[2rem] bg-[var(--ink)] p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><span className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-[var(--gold)]"><Activity size={14}/> Operations</span><h1 className="mt-4 font-serif text-4xl font-semibold sm:text-5xl">School command & reports</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">A live operational snapshot across enrolment, admissions, attendance, communications and finance.</p></div><button onClick={() => setRefreshKey(value => value + 1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold hover:bg-white/10"><RefreshCw size={17}/> Refresh live data</button></div></header>{error && <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}<section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, detail, icon: Icon }) => <article key={label} className="menwe-card rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"><div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--ink)]/5 text-[var(--ink)]"><Icon size={20}/></span><span className="text-right text-2xl font-black text-[var(--ink)]">{value}</span></div><p className="mt-5 text-sm font-bold text-[var(--ink)]">{label}</p><p className="mt-1 text-xs leading-5 text-[var(--ink)]/55">{detail}</p></article>)}</section><section className="grid gap-4 lg:grid-cols-2"><article className="menwe-card rounded-[1.75rem] p-6"><div className="flex items-center gap-3"><FileText className="text-[var(--accent)]" size={22}/><h2 className="font-serif text-2xl font-semibold">Reporting workspaces</h2></div><div className="mt-5 grid gap-2 sm:grid-cols-2"><button onClick={() => navigate("/portal/admin/attendance")} className="rounded-xl border p-4 text-left text-sm font-bold hover:bg-[var(--mist)]">Attendance register →</button><button onClick={() => navigate("/portal/admin/directory")} className="rounded-xl border p-4 text-left text-sm font-bold hover:bg-[var(--mist)]">People & enrolment →</button><button onClick={() => navigate("/portal/finance")} className="rounded-xl border p-4 text-left text-sm font-bold hover:bg-[var(--mist)]">Finance directory →</button><button onClick={() => navigate("/portal/admin/content")} className="rounded-xl border p-4 text-left text-sm font-bold hover:bg-[var(--mist)]">Content management →</button></div></article><article className="menwe-card rounded-[1.75rem] p-6"><div className="flex items-center gap-3"><CheckCircle2 className="text-[var(--accent)]" size={22}/><h2 className="font-serif text-2xl font-semibold">Operational integrity</h2></div><p className="mt-4 text-sm leading-6 text-[var(--ink)]/60">All figures on this screen are read from the live Supabase tables used by the portal. If a module reports an authorization or schema error, it is surfaced rather than replaced with mock data.</p><div className="mt-5 rounded-xl bg-[var(--accent)]/10 p-4 text-xs font-semibold leading-5 text-[var(--ink)]">Production rule: no placeholder counts, no fabricated records, and no silent fallbacks for database failures.</div></article></section></main>;
}
