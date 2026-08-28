import { CreditCard, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Tab = "charges" | "payments";
type Row = Record<string, unknown>;
const pageSize = 25;
const value = (item: unknown, fallback = "—") => item === null || item === undefined || item === "" ? fallback : String(item);
const money = (item: unknown) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(item ?? 0));

function Pager({ page, count, setPage }: { page: number; count: number; setPage: (value: number) => void }) {
  const total = Math.ceil(count / pageSize);
  if (total < 2) return null;
  return <div className="mt-5 flex items-center justify-between gap-3 text-sm text-[var(--ink)]/60"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border border-[var(--ink)]/15 px-3 py-2 font-semibold disabled:opacity-40">Previous</button><span>Page {page + 1} of {total}</span><button type="button" disabled={page + 1 >= total} onClick={() => setPage(page + 1)} className="rounded-lg border border-[var(--ink)]/15 px-3 py-2 font-semibold disabled:opacity-40">Next</button></div>;
}

export default function FinanceDirectory() {
  const [tab, setTab] = useState<Tab>("charges");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [allocationTotals, setAllocationTotals] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    setLoading(true); setMessage(null);
    const from = page * pageSize; const to = from + pageSize - 1; const client = getSupabase();
    try {
      if (tab === "charges") {
        const query = client.from("charges").select("id,description,amount,due_date,status,created_at,students(admission_number,name)", { count: "exact" });
        const response = await (status === "ALL" ? query : query.eq("status", status)).order("created_at", { ascending: false }).range(from, to);
        if (response.error) throw response.error;
        const data = (response.data ?? []) as Row[];
        setRows(data); setCount(response.count ?? 0);
        const ids = data.map(row => String(row.id));
        if (ids.length) {
          const { data: allocations, error } = await client.from("payment_allocations").select("charge_id,amount").in("charge_id", ids);
          if (error) throw error;
          const totals: Record<string, number> = {};
          for (const allocation of allocations ?? []) totals[String(allocation.charge_id)] = (totals[String(allocation.charge_id)] ?? 0) + Number(allocation.amount ?? 0);
          setAllocationTotals(totals);
        } else setAllocationTotals({});
      } else {
        const query = client.from("payments").select("id,amount,payment_date,method,provider,external_reference,status,created_at,payer:profiles!payments_payer_profile_id_fkey(display_name,email)", { count: "exact" });
        const response = await (status === "ALL" ? query : query.eq("status", status)).order("payment_date", { ascending: false }).range(from, to);
        if (response.error) throw response.error;
        setRows((response.data ?? []) as Row[]); setCount(response.count ?? 0); setAllocationTotals({});
      }
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Authorised finance records could not be loaded."); }
    finally { setLoading(false); }
  }, [page, status, tab]);

  useEffect(() => { void refresh(); }, [refresh]);
  const switchTab = (next: Tab) => { setTab(next); setStatus("ALL"); setPage(0); };
  const chargeStatuses = ["ALL", "Draft", "Open", "Partially Paid", "Paid", "Cancelled", "Written Off"];
  const paymentStatuses = ["ALL", "Pending", "Confirmed", "Failed", "Reversed"];
  const summary = useMemo(() => tab === "charges" ? rows.reduce((total, row) => total + Number(row.amount ?? 0), 0) : rows.reduce((total, row) => total + Number(row.amount ?? 0), 0), [rows, tab]);

  return <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-serif text-2xl font-semibold tracking-tight">Finance directory</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink)]/60">Canonical finance records: charges, payments and allocations. Balances are derived from actual allocation records rather than legacy invoices.</p></div><CreditCard className="text-[var(--accent)]" size={24} /></div><div className="mt-4 rounded-xl bg-[var(--accent)]/10 px-4 py-3 text-sm font-semibold text-[var(--ink)]">Current page total: {money(summary)}</div><div className="mt-6 flex flex-wrap items-end gap-3"><div className="flex gap-2">{(["charges", "payments"] as Tab[]).map(item => <button type="button" key={item} onClick={() => switchTab(item)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === item ? "bg-[var(--ink)] text-white" : "border border-[var(--ink)]/15 text-[var(--ink)]/70"}`}>{item === "charges" ? "Charges" : "Payments"}</button>)}</div><label className="grid gap-1 text-sm font-semibold text-[var(--ink)]/75">Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(0); }} className="rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2 text-sm font-normal outline-none ring-[var(--accent)] focus:ring-2">{(tab === "charges" ? chargeStatuses : paymentStatuses).map(item => <option key={item} value={item}>{item}</option>)}</select></label></div>{loading ? <div className="flex items-center justify-center gap-3 py-12 text-sm text-[var(--ink)]/60"><Loader2 className="animate-spin text-[var(--accent)]" size={18} />Loading authorised finance records…</div> : rows.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-[var(--ink)]/15 px-5 py-8 text-center text-sm text-[var(--ink)]/55">No {status === "ALL" ? "authorised" : status} {tab} records were found.</p> : <><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-[var(--ink)]/10 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/45">{(tab === "charges" ? ["Description", "Learner", "Amount", "Allocated", "Balance", "Due", "Status"] : ["Payer", "Reference", "Amount", "Method", "Provider", "Date", "Status"]).map(item => <th className="px-3 py-3" key={item}>{item}</th>)}</tr></thead><tbody>{rows.map(row => { const student = (row.students as Row | null) ?? null; const payer = (row.payer as Row | null) ?? null; const allocated = allocationTotals[String(row.id)] ?? 0; const cells = tab === "charges" ? [value(row.description), `${value(student?.admission_number, "—")} — ${value(student?.name, "")}`.trim(), money(row.amount), money(allocated), money(Math.max(0, Number(row.amount ?? 0) - allocated)), value(row.due_date), value(row.status)] : [value(payer?.display_name, value(payer?.email)), value(row.external_reference), money(row.amount), value(row.method), value(row.provider), value(row.payment_date), value(row.status)]; return <tr className="border-b border-[var(--ink)]/7 last:border-0" key={value(row.id)}>{cells.map((cell, index) => <td className="px-3 py-3 text-[var(--ink)]/76" key={`${value(row.id)}-${index}`}>{cell}</td>)}</tr>; })}</tbody></table></div><Pager page={page} count={count} setPage={setPage} /></>}{message && <p role="status" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}</section>;
}
