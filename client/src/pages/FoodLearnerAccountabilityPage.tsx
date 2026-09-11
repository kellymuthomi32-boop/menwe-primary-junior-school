import { useEffect, useMemo, useState } from "react";
import { Download, Printer, Search, ShieldCheck, Utensils } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";

type Row = {
  learner_id: string;
  admission_number: string | null;
  learner_name: string;
  maize: number;
  beans: number;
  sorghum: number;
  millet: number;
  rice_paid: number;
  rice_expected: number;
  rice_balance: number;
};

type PaymentFilter = "ALL" | "PAID" | "PARTIAL" | "NOT_PAID";

export default function FoodLearnerAccountabilityPage() {
  const { profile } = useSchoolAuth();
  const admin = isAdministrator(profile?.role as any);
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!profile?.id) return;
      setLoading(true);
      setError("");
      const { data, error: e } = await getSupabase()
        .from("food_learner_accountability")
        .select("learner_id,admission_number,learner_name,maize,beans,sorghum,millet,rice_paid,rice_expected,rice_balance")
        .order("learner_name", { ascending: true });
      if (cancelled) return;
      if (e) setError(e.message);
      setRows((data || []) as Row[]);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [profile?.id]);

  const paymentStatus = (r: Row) => {
    const paid = Number(r.rice_paid) || 0;
    const expected = Number(r.rice_expected) || 350;
    if (paid >= expected && expected > 0) return "PAID" as const;
    if (paid > 0) return "PARTIAL" as const;
    return "NOT_PAID" as const;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(r => {
      const matchesQuery = !q || `${r.learner_name} ${r.admission_number || ""}`.toLowerCase().includes(q);
      return matchesQuery && (paymentFilter === "ALL" || paymentStatus(r) === paymentFilter);
    });
  }, [rows, query, paymentFilter]);

  const summary = useMemo(() => {
    const paid = rows.filter(r => paymentStatus(r) === "PAID").length;
    const partial = rows.filter(r => paymentStatus(r) === "PARTIAL").length;
    const notPaid = rows.filter(r => paymentStatus(r) === "NOT_PAID").length;
    const totalPaid = rows.reduce((sum, r) => sum + (Number(r.rice_paid) || 0), 0);
    const totalExpected = rows.reduce((sum, r) => sum + (Number(r.rice_expected) || 0), 0);
    const totalBalance = rows.reduce((sum, r) => sum + Math.max(0, Number(r.rice_balance) || 0), 0);
    return { paid, partial, notPaid, totalPaid, totalExpected, totalBalance };
  }, [rows]);

  const download = () => {
    const header = ["Learner", "Admission No.", "Maize (kg)", "Beans (kg)", "Sorghum (kg)", "Millet (kg)", "Rice Expected (KSh)", "Rice Paid (KSh)", "Rice Balance (KSh)", "Payment Status"];
    const csv = [header, ...filtered.map(r => [r.learner_name, r.admission_number || "", r.maize, r.beans, r.sorghum, r.millet, r.rice_expected, r.rice_paid, r.rice_balance, paymentStatus(r).replace("_", " ")])]
      .map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menwe-food-payment-accountability.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!profile) return null;

  const filters: { key: PaymentFilter; label: string; count: number }[] = [
    { key: "ALL", label: "All", count: rows.length },
    { key: "PAID", label: "Paid", count: summary.paid },
    { key: "PARTIAL", label: "Partial", count: summary.partial },
    { key: "NOT_PAID", label: "Not paid", count: summary.notPaid },
  ];

  return <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between print:hidden">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#061229]/5 text-[#061229]"><Utensils size={23}/></span>
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#D89B28]">Private school operations</p><h1 className="text-2xl font-black text-[#061229] sm:text-3xl">Learner food accountability</h1><p className="mt-1 text-sm text-slate-500">Track rice payments, outstanding balances and food contributions for every active learner.</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={download} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#061229] shadow-sm hover:border-[#D89B28]"><Download size={17}/> Download CSV</button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-[#061229] px-4 py-2.5 text-sm font-bold text-white shadow"><Printer size={17}/> Print register</button>
      </div>
    </div>

    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Paid in full</p><p className="mt-1 text-2xl font-black text-emerald-900">{summary.paid}</p><p className="text-xs text-emerald-700">of {rows.length} learners</p></div>
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">Partially paid</p><p className="mt-1 text-2xl font-black text-amber-900">{summary.partial}</p><p className="text-xs text-amber-700">balance still outstanding</p></div>
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-red-700">Not paid</p><p className="mt-1 text-2xl font-black text-red-900">{summary.notPaid}</p><p className="text-xs text-red-700">KSh {summary.totalBalance.toLocaleString()} outstanding overall</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Rice collected</p><p className="mt-1 text-2xl font-black text-[#061229]">KSh {summary.totalPaid.toLocaleString()}</p><p className="text-xs text-slate-500">of KSh {summary.totalExpected.toLocaleString()} expected</p></div>
    </section>

    <div className="mt-5 flex flex-col gap-3 sm:flex-row print:hidden">
      <label className="relative block flex-1"><Search className="absolute left-3 top-3.5 text-slate-400" size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search learner or admission number" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#D89B28]"/></label>
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-1.5">
        {filters.map(f => <button key={f.key} onClick={() => setPaymentFilter(f.key)} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${paymentFilter === f.key ? "bg-[#061229] text-white" : "text-slate-600 hover:bg-slate-100"}`}>{f.label} ({f.count})</button>)}
      </div>
    </div>

    <section className="mt-5 rounded-2xl border border-gray-100 bg-white shadow-md print:mt-0 print:border-0 print:shadow-none">
      <div className="border-b border-slate-100 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-[#061229]">Full learner register</h2><p className="mt-1 text-xs text-slate-500">Rice target is KSh 350 per learner. Status is calculated from recorded payments.</p></div><div className="hidden print:block text-right"><p className="text-lg font-black">MENWE PRIMARY & JUNIOR SCHOOL</p><p className="text-xs text-slate-500">Food Learner Accountability Register</p></div></div></div>
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading learner register…</div> : error ? <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><ShieldCheck className="mb-2" size={20}/>Unable to load the private food register. {error}</div> :
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-[#061229] text-white"><tr>{["#","Learner","Admission No.","Maize","Beans","Sorghum","Millet","Rice paid","Balance","Status"].map(h => <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody>{filtered.map((r, i) => { const status = paymentStatus(r); return <tr key={r.learner_id} className="border-b border-slate-100 last:border-0"><td className="px-4 py-3 text-slate-400">{i + 1}</td><td className="px-4 py-3 font-bold text-[#061229]">{r.learner_name}</td><td className="px-4 py-3">{r.admission_number || "—"}</td><td className="px-4 py-3">{Number(r.maize).toLocaleString()} kg</td><td className="px-4 py-3">{Number(r.beans).toLocaleString()} kg</td><td className="px-4 py-3">{Number(r.sorghum).toLocaleString()} kg</td><td className="px-4 py-3">{Number(r.millet).toLocaleString()} kg</td><td className="px-4 py-3 font-semibold">KSh {Number(r.rice_paid).toLocaleString()}</td><td className={`px-4 py-3 font-bold ${Number(r.rice_balance) > 0 ? "text-amber-700" : "text-emerald-700"}`}>KSh {Number(r.rice_balance).toLocaleString()}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${status === "PAID" ? "bg-emerald-50 text-emerald-700" : status === "PARTIAL" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{status === "NOT_PAID" ? "Not paid" : status === "PAID" ? "Paid" : "Partial"}</span></td></tr>; })}{!filtered.length && <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-500">No learners match the current search/filter.</td></tr>}</tbody>
        </table>
      </div>}
      <div className="border-t border-slate-100 p-4 text-xs text-slate-500 print:block">Register generated for authorised school use only. Showing {filtered.length} of {rows.length} active learners.</div>
    </section>
    {!admin && <p className="mt-3 text-xs text-slate-400 print:hidden">Access is limited by the private food-register permissions assigned to your staff account.</p>}
  </main>;
}
