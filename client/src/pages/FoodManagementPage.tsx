import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Banknote, ClipboardList, Package, ShieldCheck, Utensils, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";

type Assignment = { responsibility: string; active: boolean };
type Contribution = { id: string; item_type: string; quantity: number; unit: string; received_date: string; received_from: string | null; notes: string | null };
type Payment = { id: string; learner_id: string | null; payer_name: string | null; amount: number; payment_date: string; receipt_reference: string | null; status: string };
type Adjustment = { id: string; item_type: string; quantity: number; unit: string; adjustment_type: string; adjustment_date: string; notes: string | null };

const today = () => new Date().toISOString().slice(0, 10);
const foodItems = ["MAIZE", "BEANS", "SORGHUM", "MILLET"];

export default function FoodManagementPage() {
  const { profile } = useSchoolAuth();
  const admin = isAdministrator(profile?.role as any);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [tab, setTab] = useState("overview");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showContribution, setShowContribution] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [contribution, setContribution] = useState({ item_type: "MAIZE", quantity: 1, unit: "kg", received_date: today(), received_from: "", notes: "" });
  const [payment, setPayment] = useState({ learner_id: "", payer_name: "", amount: 350, payment_date: today(), receipt_reference: "", status: "RECEIVED" });
  const [adjustment, setAdjustment] = useState({ item_type: "RICE", quantity: 1, unit: "kg", adjustment_type: "USED", adjustment_date: today(), notes: "" });

  const canFood = admin || assignments.some((x) => ["FOOD_RECORDING", "FOOD_MANAGER"].includes(x.responsibility));
  const canRice = admin || assignments.some((x) => ["RICE_MONEY", "FOOD_MANAGER"].includes(x.responsibility));

  const load = async () => {
    if (!profile?.id) return;
    const db = getSupabase();
    const assignmentResult = await db.from("food_staff_assignments").select("responsibility,active").eq("profile_id", profile.id).eq("active", true);
    const assigned = (assignmentResult.data ?? []) as Assignment[];
    setAssignments(assigned);
    const foodAllowed = admin || assigned.some((x) => ["FOOD_RECORDING", "FOOD_MANAGER"].includes(x.responsibility));
    const riceAllowed = admin || assigned.some((x) => ["RICE_MONEY", "FOOD_MANAGER"].includes(x.responsibility));
    const [food, rice, stock] = await Promise.all([
      foodAllowed ? db.from("food_contributions").select("id,item_type,quantity,unit,received_date,received_from,notes").order("received_date", { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null } as any),
      riceAllowed ? db.from("rice_payments").select("id,learner_id,payer_name,amount,payment_date,receipt_reference,status").order("payment_date", { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null } as any),
      foodAllowed ? db.from("food_stock_adjustments").select("id,item_type,quantity,unit,adjustment_type,adjustment_date,notes").order("adjustment_date", { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null } as any),
    ]);
    setContributions((food.data ?? []) as Contribution[]);
    setPayments((rice.data ?? []) as Payment[]);
    setAdjustments((stock.data ?? []) as Adjustment[]);
    if (assignmentResult.error || food.error || rice.error || stock.error) setError("Some food records could not be loaded.");
  };

  useEffect(() => { void load(); }, [profile?.id, admin]);

  const riceTotal = payments.filter((x) => x.status === "RECEIVED").reduce((n, x) => n + Number(x.amount || 0), 0);
  const stock = useMemo(() => {
    const result: Record<string, number> = { MAIZE: 0, BEANS: 0, SORGHUM: 0, MILLET: 0, RICE: 0 };
    contributions.forEach((x) => { result[x.item_type] = (result[x.item_type] || 0) + Number(x.quantity || 0); });
    adjustments.forEach((x) => { result[x.item_type] = (result[x.item_type] || 0) + (x.adjustment_type === "RECEIVED" ? Number(x.quantity || 0) : -Math.abs(Number(x.quantity || 0))); });
    return result;
  }, [contributions, adjustments]);

  const save = async (table: string, data: Record<string, unknown>, close: () => void) => {
    if (!profile?.id) return;
    setSaving(true); setError(""); setMessage("");
    const { error: saveError } = await getSupabase().from(table).insert({ ...data, recorded_by: profile.id });
    if (saveError) setError(saveError.message);
    else { setMessage("Record saved successfully."); close(); await load(); }
    setSaving(false);
  };

  if (!profile || (!admin && !canFood && !canRice)) {
    return <main className="mx-auto max-w-4xl px-4 py-16"><div className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-md"><ShieldCheck className="mx-auto text-[#D89B28]" size={36} /><h1 className="mt-4 text-xl font-black text-[#061229]">Restricted school system</h1><p className="mt-2 text-sm text-slate-500">Food records are private and available only to authorised school staff.</p></div></main>;
  }

  return <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <header className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#061229]/5 text-[#061229]"><Utensils size={23} /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#D89B28]">Private school operations</p><h1 className="text-2xl font-black text-[#061229] sm:text-3xl">Food & feeding register</h1></div></header>
    <p className="mt-3 text-sm text-slate-600">Securely record learner food contributions, rice payments and stock movements.</p>
    {message && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</div>}
    {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={Package} label="Food entries" value={contributions.length} />{canRice && <Stat icon={Banknote} label="Rice received" value={`KSh ${riceTotal.toLocaleString()}`} />}<Stat icon={ClipboardList} label="Stock movements" value={adjustments.length} /><Stat icon={ShieldCheck} label="Your access" value={admin ? "Administrator" : assignments.map((a) => a.responsibility.replaceAll("_", " ")).join(" · ")} /></div>
    <nav className="mt-6 flex flex-wrap gap-2">{[["overview", "Overview"], ["receipts", "Food received"], ...(canRice ? [["rice", "Rice money"]] : []), ["stock", "Stock"]].map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === key ? "bg-[#061229] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{label}</button>)}</nav>
    {tab === "overview" && <div className="mt-5 grid gap-4 lg:grid-cols-3">{canFood && <Action title="Record maize, beans, sorghum or millet" text="Log quantity, date and source." button="Record food" onClick={() => setShowContribution(true)} />}{canRice && <Action title="Record KSh 350 rice payment" text="Keep rice money separate and private." button="Record rice payment" onClick={() => setShowPayment(true)} />}{canFood && <Action title="Record food stock movement" text="Track food used, wastage or adjustments." button="Record movement" onClick={() => setShowAdjustment(true)} />}</div>}
    {tab === "receipts" && <Section title="Food received" action={canFood ? "Record food" : undefined} onAction={() => setShowContribution(true)}><Table headers={["Date", "Food", "Quantity", "Received from", "Notes"]} rows={contributions.map((x) => [x.received_date, x.item_type, `${x.quantity} ${x.unit}`, x.received_from || "—", x.notes || "—"])} /></Section>}
    {tab === "rice" && canRice && <Section title="Rice money register" action="Record KSh 350" onAction={() => setShowPayment(true)}><div className="mb-4 rounded-xl bg-[#061229] p-4 text-white"><p className="text-xs uppercase tracking-wider text-white/60">Recorded received</p><p className="mt-1 text-2xl font-black">KSh {riceTotal.toLocaleString()}</p></div><Table headers={["Date", "Payer / learner", "Amount", "Receipt", "Status"]} rows={payments.map((x) => [x.payment_date, x.payer_name || x.learner_id || "—", `KSh ${Number(x.amount).toLocaleString()}`, x.receipt_reference || "—", x.status])} /></Section>}
    {tab === "stock" && <Section title="Food stock summary" action={canFood ? "Record movement" : undefined} onAction={() => setShowAdjustment(true)}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{Object.entries(stock).map(([item, quantity]) => <div key={item} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-md"><p className="text-xs font-bold uppercase tracking-wider text-[#D89B28]">{item}</p><p className="mt-2 text-2xl font-black text-[#061229]">{quantity.toLocaleString()} kg</p></div>)}</div><div className="mt-5"><Table headers={["Date", "Food", "Movement", "Quantity", "Notes"]} rows={adjustments.map((x) => [x.adjustment_date, x.item_type, x.adjustment_type, `${x.quantity} ${x.unit}`, x.notes || "—"])} /></div></Section>}
    {showContribution && <Modal title="Record food received" onClose={() => setShowContribution(false)}><Select label="Food item" value={contribution.item_type} onChange={(value) => setContribution({ ...contribution, item_type: value })} options={foodItems} /><Input label="Quantity" type="number" value={contribution.quantity} onChange={(value) => setContribution({ ...contribution, quantity: Number(value) })} /><Input label="Unit" value={contribution.unit} onChange={(value) => setContribution({ ...contribution, unit: value })} /><Input label="Received date" type="date" value={contribution.received_date} onChange={(value) => setContribution({ ...contribution, received_date: value })} /><Input label="Received from" value={contribution.received_from} onChange={(value) => setContribution({ ...contribution, received_from: value })} /><Input label="Notes" value={contribution.notes} onChange={(value) => setContribution({ ...contribution, notes: value })} /><Save disabled={saving} onClick={() => void save("food_contributions", { ...contribution, quantity: Number(contribution.quantity), received_from: contribution.received_from || null, notes: contribution.notes || null }, () => setShowContribution(false))} /></Modal>}
    {showPayment && <Modal title="Record KSh 350 rice payment" onClose={() => setShowPayment(false)}><p className="rounded-xl bg-[#D89B28]/10 p-3 text-xs font-semibold text-[#061229]">Private financial record. Only authorised rice/food managers and administrators can access it.</p><Input label="Learner ID (optional)" value={payment.learner_id} onChange={(value) => setPayment({ ...payment, learner_id: value })} /><Input label="Payer / learner name" value={payment.payer_name} onChange={(value) => setPayment({ ...payment, payer_name: value })} /><Input label="Amount (KSh)" type="number" value={payment.amount} onChange={(value) => setPayment({ ...payment, amount: Number(value) })} /><Input label="Payment date" type="date" value={payment.payment_date} onChange={(value) => setPayment({ ...payment, payment_date: value })} /><Input label="Receipt reference" value={payment.receipt_reference} onChange={(value) => setPayment({ ...payment, receipt_reference: value })} /><Save disabled={saving} onClick={() => void save("rice_payments", { ...payment, amount: Number(payment.amount), learner_id: payment.learner_id || null, payer_name: payment.payer_name || null, receipt_reference: payment.receipt_reference || null }, () => setShowPayment(false))} /></Modal>}
    {showAdjustment && <Modal title="Record food stock movement" onClose={() => setShowAdjustment(false)}><Select label="Food item" value={adjustment.item_type} onChange={(value) => setAdjustment({ ...adjustment, item_type: value })} options={["MAIZE", "BEANS", "SORGHUM", "MILLET", "RICE"]} /><Select label="Movement" value={adjustment.adjustment_type} onChange={(value) => setAdjustment({ ...adjustment, adjustment_type: value })} options={["RECEIVED", "USED", "WASTAGE", "ADJUSTMENT"]} /><Input label="Quantity" type="number" value={adjustment.quantity} onChange={(value) => setAdjustment({ ...adjustment, quantity: Number(value) })} /><Input label="Unit" value={adjustment.unit} onChange={(value) => setAdjustment({ ...adjustment, unit: value })} /><Input label="Date" type="date" value={adjustment.adjustment_date} onChange={(value) => setAdjustment({ ...adjustment, adjustment_date: value })} /><Input label="Notes" value={adjustment.notes} onChange={(value) => setAdjustment({ ...adjustment, notes: value })} /><Save disabled={saving} onClick={() => void save("food_stock_adjustments", { ...adjustment, quantity: Number(adjustment.quantity), notes: adjustment.notes || null }, () => setShowAdjustment(false))} /></Modal>}
  </main>;
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) { return <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-md"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#061229]/5 text-[#061229]"><Icon size={19} /></span><p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-xl font-black text-[#061229]">{value}</p></div>; }
function Action({ title, text, button, onClick }: { title: string; text: string; button: string; onClick: () => void }) { return <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"><h2 className="text-lg font-black text-[#061229]">{title}</h2><p className="mt-2 text-sm text-slate-500">{text}</p><button type="button" onClick={onClick} className="mt-5 rounded-xl bg-[#061229] px-4 py-2.5 text-sm font-bold text-white">{button}</button></div>; }
function Section({ title, action, onAction, children }: { title: string; action?: string; onAction: () => void; children: ReactNode }) { return <section className="mt-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-md"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-[#061229]">{title}</h2>{action && <button type="button" onClick={onAction} className="rounded-xl bg-[#061229] px-4 py-2 text-sm font-bold text-white">{action}</button>}</div>{children}</section>; }
function Table({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400">{headers.map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={index} className="border-b border-slate-100 last:border-0">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-3 text-slate-600">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="px-3 py-10 text-center text-slate-400">No records yet.</td></tr>}</tbody></table></div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black text-[#061229]">{title}</h2><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button></div><div className="space-y-4">{children}</div></div></div>; }
function Input({ label, value, onChange, type = "text" }: { label: string; value: string | number; onChange: (value: string) => void; type?: string }) { return <label className="block"><span className="mb-1.5 block text-sm font-bold text-[#061229]">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#D89B28]" /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="block"><span className="mb-1.5 block text-sm font-bold text-[#061229]">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#D89B28]">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
function Save({ disabled, onClick }: { disabled: boolean; onClick: () => void }) { return <button type="button" disabled={disabled} onClick={onClick} className="w-full rounded-xl bg-[#061229] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{disabled ? "Saving…" : "Save record"}</button>; }
