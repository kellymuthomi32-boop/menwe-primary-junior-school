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

export default function FoodLearnerAccountabilityPage() {
  const { profile } = useSchoolAuth();
  const admin = isAdministrator(profile?.role as any);
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => `${r.learner_name} ${r.admission_number || ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  const download = () => {
    const header = ["Learner", "Admission No.", "Maize", "Beans", "Sorghum", "Millet", "Rice Paid", "Rice Balance"];
    const csv = [header, ...filtered.map(r => [r.learner_name, r.admission_number || "", r.maize, r.beans, r.sorghum, r.millet, r.rice_paid, r.rice_balance])]
      .map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menwe-food-learner-accountability.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!profile) return null;

  return <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between print:hidden">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#061229]/5 text-[#061229]"><Utensils size={23}/></span>
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#D89B28]">Private school operations</p><h1 className="text-2xl font-black text-[#061229] sm:text-3xl">Learner food accountability</h1><p className="mt-1 text-sm text-slate-500">Every active learner is listed, including learners with no recorded food contributions.</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={download} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#061229] shadow-sm hover:border-[#D89B28]"><Download size={17}/> Download CSV</button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-[#061229] px-4 py-2.5 text-sm font-bold text-white shadow"><Printer size={17}/> Print register</button>
      </div>
    </div>

    <div className="mt-6 flex flex-col gap-3 sm:flex-row print:hidden">
      <label className="relative block flex-1"><Search className="absolute left-3 top-3.5 text-slate-400" size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search learner or admission number" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#D89B28]"/></label>
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#061229]">{filtered.length} of {rows.length} learners</div>
    </div>

    <section className="mt-5 rounded-2xl border border-gray-100 bg-white shadow-md print:mt-0 print:border-0 print:shadow-none">
      <div className="border-b border-slate-100 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-[#061229]">Full learner register</h2><p className="mt-1 text-xs text-slate-500">Maize, beans, sorghum, millet and KSh 350 rice balance.</p></div><div className="hidden print:block text-right"><p className="text-lg font-black">MENWE PRIMARY & JUNIOR SCHOOL</p><p className="text-xs text-slate-500">Food Learner Accountability Register</p></div></div></div>
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading learner register…</div> : error ? <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><ShieldCheck className="mb-2" size={20}/>Unable to load the private food register. {error}</div> :
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-[#061229] text-white"><tr>{["#","Learner","Admission No.","Maize","Beans","Sorghum","Millet","Rice paid","Rice balance","Status"].map(h => <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody>{filtered.map((r, i) => <tr key={r.learner_id} className="border-b border-slate-100 last:border-0"><td className="px-4 py-3 text-slate-400">{i + 1}</td><td className="px-4 py-3 font-bold text-[#061229]">{r.learner_name}</td><td className="px-4 py-3">{r.admission_number || "—"}</td><td className="px-4 py-3">{Number(r.maize).toLocaleString()} kg</td><td className="px-4 py-3">{Number(r.beans).toLocaleString()} kg</td><td className="px-4 py-3">{Number(r.sorghum).toLocaleString()} kg</td><td className="px-4 py-3">{Number(r.millet).toLocaleString()} kg</td><td className="px-4 py-3">KSh {Number(r.rice_paid).toLocaleString()}</td><td className={`px-4 py-3 font-bold ${Number(r.rice_balance) > 0 ? "text-amber-700" : "text-emerald-700"}`}>KSh {Number(r.rice_balance).toLocaleString()}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${Number(r.maize)+Number(r.beans)+Number(r.sorghum)+Number(r.millet)+Number(r.rice_paid) > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{Number(r.maize)+Number(r.beans)+Number(r.sorghum)+Number(r.millet)+Number(r.rice_paid) > 0 ? "Recorded" : "No records"}</span></td></tr>)}{!filtered.length && <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-500">No learners match the search.</td></tr>}</tbody>
        </table>
      </div>}
      <div className="border-t border-slate-100 p-4 text-xs text-slate-500 print:block">Register generated for authorised school use only. Total learners shown: {filtered.length}.</div>
    </section>
    {!admin && <p className="mt-3 text-xs text-slate-400 print:hidden">Access is limited by the private food-register permissions assigned to your staff account.</p>}
  </main>;
}
