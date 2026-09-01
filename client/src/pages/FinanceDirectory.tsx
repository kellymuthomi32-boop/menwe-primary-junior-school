import { CreditCard, Loader2, RefreshCw, Search, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";

type Tab = "charges" | "payments";
type Row = Record<string, unknown>;
const PAGE_SIZE = 25;
const value = (item: unknown, fallback = "—") => item == null || item === "" ? fallback : String(item);
const money = (item: unknown) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(item ?? 0));

function Pager({ page, count, setPage }: { page: number; count: number; setPage: (value: number) => void }) {
  const total = Math.max(1, Math.ceil(count / PAGE_SIZE));
  if (total < 2) return null;
  return <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--ink)]/60"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-xl border border-[var(--ink)]/15 px-4 py-2 font-semibold disabled:opacity-40">Previous</button><span>Page {page + 1} of {total}</span><button type="button" disabled={page + 1 >= total} onClick={() => setPage(page + 1)} className="rounded-xl border border-[var(--ink)]/15 px-4 py-2 font-semibold disabled:opacity-40">Next</button></div>;
}

export default function FinanceDirectory() {
  const { user, profile, loading: authLoading } = useSchoolAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("charges");
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [allocationTotals, setAllocationTotals] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    if (!user || !profile || !isAdministrator(profile.role)) return;
    setLoading(true); setMessage(null);
    const from = page * PAGE_SIZE; const to = from + PAGE_SIZE - 1; const db = getSupabase();
    try {
      if (tab === "charges") {
        let request = db.from("charges").select("id,description,amount,due_date,status,created_at,students(admission_number,name)", { count: "exact" });
        if (status !== "ALL") request = request.eq("status", status);
        if (query.trim()) request = request.ilike("description", `%${query.trim()}%`);
        const response = await request.order("created_at", { ascending: false }).range(from, to);
        if (response.error) throw response.error;
        const data = (response.data ?? []) as Row[]; setRows(data); setCount(response.count ?? 0);
        const ids = data.map(row => String(row.id));
        if (ids.length) {
          const allocationResponse = await db.from("payment_allocations").select("charge_id,amount").in("charge_id", ids);
          if (allocationResponse.error) throw allocationResponse.error;
          const totals: Record<string, number> = {};
          for (const allocation of allocationResponse.data ?? []) totals[String(allocation.charge_id)] = (totals[String(allocation.charge_id)] ?? 0) + Number(allocation.amount ?? 0);
          setAllocationTotals(totals);
        } else setAllocationTotals({});
      } else {
        let request = db.from("payments").select("id,amount,payment_date,method,provider,external_reference,status,created_at,payer:profiles!payments_payer_profile_id_fkey(display_name,email)", { count: "exact" });
        if (status !== "ALL") request = request.eq("status", status);
        if (query.trim()) request = request.or(`external_reference.ilike.%${query.trim()}%,provider.ilike.%${query.trim()}%,method.ilike.%${query.trim()}%`);
        const response = await request.order("payment_date", { ascending: false }).range(from, to);
        if (response.error) throw response.error;
        setRows((response.data ?? []) as Row[]); setCount(response.count ?? 0); setAllocationTotals({});
      }
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Authorised finance records could not be loaded."); }
    finally { setLoading(false); }
  }, [page, profile, query, status, tab, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile) { navigate("/portal/login"); return; }
    if (!isAdministrator(profile.role)) { navigate("/portal/parent"); return; }
    void refresh();
  }, [authLoading, navigate, profile, refresh, user]);
  useEffect(() => { setPage(0); }, [query, status, tab]);

  const chargeStatuses = ["ALL", "Draft", "Open", "Partially Paid", "Paid", "Cancelled", "Written Off"];
  const paymentStatuses = ["ALL", "Pending", "Confirmed", "Failed", "Reversed"];
  const totals = useMemo(() => {
    const gross = rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const allocated = rows.reduce((sum, row) => sum + (allocationTotals[String(row.id)] ?? 0), 0);
    return { gross, allocated, balance: Math.max(0, gross - allocated) };
  }, [allocationTotals, rows]);

  if (authLoading || loading && !rows.length) return <main className="mx-auto grid min-h-[60vh] place-items-center p-8"><div className="flex items-center gap-3 text-sm text-[var(--ink)]/60"><Loader2 className="animate-spin text-[var(--accent)]" size={18}/>Loading finance workspace…</div></main>;

  return <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <header className="rounded-[2rem] bg-[var(--ink)] p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><span className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-[var(--gold)]"><CreditCard size={14}/> Finance</span><h1 className="mt-4 font-serif text-4xl font-semibold sm:text-5xl">Fees & financial tracking</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Live charges, payment history and allocation-derived balances from the canonical Supabase finance records.</p></div><button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold hover:bg-white/10 disabled:opacity-50"><RefreshCw className={loading ? "animate-spin" : ""} size={17}/>Refresh</button></div></header>
    {message && <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{message}</div>}
    <section className="grid gap-4 sm:grid-cols-3"><article className="menwe-card rounded-2xl p-5"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--ink)]/5"><CreditCard size={20}/></span><TrendingUp className="text-[var(--accent)]" size={19}/></div><p className="mt-4 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/50">{tab === "charges" ? "Charges on page" : "Payments on page"}</p><p className="mt-1 text-2xl font-black">{money(totals.gross)}</p></article><article className="menwe-card rounded-2xl p-5"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent)]/10"><TrendingUp size={20}/></span></div><p className="mt-4 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/50">Allocated</p><p className="mt-1 text-2xl font-black">{money(totals.allocated)}</p></article><article className="menwe-card rounded-2xl p-5"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-700"><TrendingDown size={20}/></span></div><p className="mt-4 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/50">Balance on page</p><p className="mt-1 text-2xl font-black">{money(totals.balance)}</p></article></section>
    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setTab("charges"); setStatus("ALL"); }} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === "charges" ? "bg-[var(--ink)] text-white" : "border border-[var(--ink)]/15"}`}>Charges</button><button type="button" onClick={() => { setTab("payments"); setStatus("ALL"); }} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === "payments" ? "bg-[var(--ink)] text-white" : "border border-[var(--ink)]/15"}`}>Payment history</button></div><div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]"><label className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--ink)]/15 bg-white px-3"><Search size={17} className="text-[var(--accent)]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder={tab === "charges" ? "Search charge description…" : "Search reference, method or provider…"} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"/></label><select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }} className="min-h-12 rounded-xl border border-[var(--ink)]/15 bg-white px-3 text-sm font-semibold">{(tab === "charges" ? chargeStatuses : paymentStatuses).map(item => <option key={item}>{item}</option>)}</select></div></section>
    <section className="menwe-card overflow-hidden rounded-[1.75rem] p-5 sm:p-7">{loading ? <div className="flex items-center justify-center gap-3 py-12 text-sm text-[var(--ink)]/60"><Loader2 className="animate-spin text-[var(--accent)]" size={18}/>Refreshing records…</div> : rows.length === 0 ? <p className="rounded-2xl border border-dashed border-[var(--ink)]/15 px-5 py-12 text-center text-sm text-[var(--ink)]/55">No matching authorised records were found.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead><tr className="border-b border-[var(--ink)]/10 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/45">{(tab === "charges" ? ["Description", "Learner", "Amount", "Allocated", "Balance", "Due", "Status"] : ["Payer", "Reference", "Amount", "Method", "Provider", "Date", "Status"]).map(item => <th className="px-3 py-3" key={item}>{item}</th>)}</tr></thead><tbody>{rows.map(row => { const student = (row.students as Row | null) ?? null; const payer = (row.payer as Row | null) ?? null; const allocated = allocationTotals[String(row.id)] ?? 0; const cells = tab === "charges" ? [value(row.description), `${value(student?.admission_number)} — ${value(student?.name, "")}`.trim(), money(row.amount), money(allocated), money(Math.max(0, Number(row.amount ?? 0) - allocated)), value(row.due_date), value(row.status)] : [value(payer?.display_name, value(payer?.email)), value(row.external_reference), money(row.amount), value(row.method), value(row.provider), value(row.payment_date), value(row.status)]; return <tr key={value(row.id)} className="border-b border-[var(--ink)]/7 last:border-0 hover:bg-[var(--mist)]/50">{cells.map((cell, index) => <td key={`${value(row.id)}-${index}`} className="px-3 py-3 text-[var(--ink)]/76">{cell}</td>)}</tr>; })}</tbody></table></div>}<Pager page={page} count={count} setPage={setPage}/></section>
  </main>;
}
