import { useEffect, useMemo, useState } from "react";
import { Banknote, ClipboardList, Package, Plus, ShieldCheck, Utensils } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";

type Assignment = { responsibility: string; active: boolean };
type Contribution = { id: string; item_type: string; quantity: number; unit: string; received_date: string; received_from: string | null; notes: string | null };
type Payment = { id: string; learner_id: string | null; payer_name: string | null; amount: number; payment_date: string; receipt_reference: string | null; status: string };
type Adjustment = { id: string; item_type: string; quantity: number; unit: string; adjustment_type: string; adjustment_date: string; notes: string | null };
const today = () => new Date().toISOString().slice(0, 10);
const foodItems = ["MAIZE", "BEANS", "SORGHUM", "MILLET"] as const;

export default function FoodManagementPage() {
  const { profile } = useSchoolAuth();
  const admin = isAdministrator(profile?.role as any);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [tab, setTab] = useState<"overview" | "receipts" | "rice" | "stock">("overview");
  const [showContribution, setShowContribution] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [contribution, setContribution] = useState({ item_type: "MAIZE", quantity: 1, unit: "kg", received_date: today(), received_from: "", notes: "" });
  const [payment, setPayment] = useState({ learner_id: "", payer_name: "", amount: 350, payment_date: today(), receipt_reference: "", status: "RECEIVED" });
  const [adjustment, setAdjustment] = useState({ item_type: "RICE", quantity: 1, unit: "kg", adjustment_type: "USED", adjustment_date: today(), notes: "" });

  const load = async () => {
    if (!profile?.id) return;
    const s = getSupabase();
    const a = await s.from("food_staff_assignments").select("responsibility,active").eq("profile_id", profile.id).eq("active", true);
    const assigned = (a.data || []) as Assignment[];
    setAssignments(assigned);
    const canFood = admin || assigned.some(x => ["FOOD_RECORDING", "FOOD_MANAGER"].includes(x.responsibility));
    const canRice = admin || assigned.some(x => ["RICE_MONEY", "FOOD_MANAGER"].includes(x.responsibility));
    const results = await Promise.all([
      canFood ? s.from("food_contributions").select("id,item_type,quantity,unit,received_date,received_from,notes").order("received_date", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null } as any),
      canRice ? s.from("rice_payments").select("id,learner_id,payer_name,amount,payment_date,receipt_reference,status").order("payment_date", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null } as any),
      canFood ? s.from("food_stock_adjustments").select("id,item_type,quantity,unit,adjustment_type,adjustment_date,notes").order("adjustment_date", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null } as any),
    ]);
    setContributions((results[0].data || []) as Contribution[]);
    setPayments((results[1].data || []) as Payment[]);
    setAdjustments((results[2].data || []) as Adjustment[]);
  };
  useEffect(() => { void load(); }, [profile?.id, admin]);

  const canFood = admin || assignments.some(x => ["FOOD_RECORDING", "FOOD_MANAGER"].includes(x.responsibility));
  const canRice = admin || assignments.some(x => ["RICE_MONEY", "FOOD_MANAGER"].includes(x.responsibility));
  const riceTotal = payments.filter(p => p.status === "RECEIVED").reduce((n, p) => n + Number(p.amount || 0), 0);
  const stock = useMemo(() => {
    const map: Record<string, number> = { MAIZE: 0, BEANS: 0, SORGHUM: 0, MILLET: 0, RICE: 0 };
    contributions.forEach(x => { map[x.item_type] = (map[x.item_type] || 0) + Number(x.quantity || 0); });
    adjustments.forEach(x => { const q = Number(x.quantity || 0); map[x.item_type] = (map[x.item_type] || 0) + (x.adjustment_type === "RECEIVED" ? q : -Math.abs(q)); });
    return map;
  }, [contributions, adjustments]);

  const saveContribution = async () => {
    if (!contribution.quantity || !profile?.id) return;
    setSaving(true); setError("");
    const { error: e } = await getSupabase().from("food_contributions").insert({ ...contribution, quantity: Number(contribution.quantity), received_from: contribution.received_from || null, notes: contribution.notes || null, recorded_by: profile.id });
    if (e) setError(e.message); else { setMessage("Food contribution recorded in the private school register."); setShowContribution(false); setContribution({ item_type: "MAIZE", quantity: 1, unit: "kg", received_date: today(), received_from: "", notes: "" }); await load(); }
    setSaving(false);
  };
  const savePayment = async () => {
    if (!profile?.id || Number(payment.amount) < 0) return;
    setSaving(true); setError("");
    const { error: e } = await getSupabase().from("rice_payments").insert({ ...payment, amount: Number(payment.amount), learner_id: payment.learner_id || null, payer_name: payment.payer_name || null, receipt_reference: payment.receipt_reference || null, recorded_by: profile.id });
    if (e) setError(e.message); else { setMessage("Rice payment recorded. The amount is visible only to authorised food/finance users."); setShowPayment(false); setPayment({ learner_id: "", payer_name: "", amount: 350, payment_date: today(), receipt_reference: "", status: "RECEIVED" }); await load(); }
    setSaving(false);
  };
  const saveAdjustment = async () => {
    if (!profile?.id || !adjustment.quantity) return;
    setSaving(true); setError("");
    const { error: e } = await getSupabase().from("food_stock_adjustments").insert({ ...adjustment, quantity: Number(adjustment.quantity), notes: adjustment.notes || null, recorded_by: profile.id });
    if (e) setError(e.message); else { setMessage("Food stock movement recorded."); setShowAdjustment(false); await load(); }
    setSaving(false);
  };

  if (!profile || (!admin && !canFood && !canRice)) return <main className="mx-auto max-w-4xl px-4 py-16"><div className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-md"><ShieldCheck className="mx-auto text-[#D89B28]" size={36}/><h1 className="mt-4 text-xl font-black text-[#061229]">Restricted school system</h1><p className="mt-2 text-sm text-slate-500">Food records are private and available only to authorised school staff.</p></div></main>;

  return <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#061229]/5 text-[#061229]"><Utensils size={23}/></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#D89B28]">Private school operations</p><h1 className="text-2xl font-black text-[#061229] sm:text-3xl">Food & feeding register</h1></div></div><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Securely record learner food contributions, rice payments, stock movements and the people responsible for the register.</p></div></div>
    {message && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</div>}{error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={Package} label="Food entries" value={contributions.length}/><Stat icon={Banknote} label="Rice received" value={`KSh ${riceTotal.toLocaleString()}`} hidden={!canRice}/><Stat icon={ClipboardList} label="Stock movements" value={adjustments.length}/><Stat icon={ShieldCheck} label="Your access" value={admin ? "Administrator" : assignments.map(a => a.responsibility.replaceAll("_", " ")).join(" · ")}/></div>
    <div className="mt-6 flex flex-wrap gap-2">{([['overview','Overview'],['receipts','Food received'],...(canRice?[['rice','Rice money'] as const]:[]),['stock','Stock'] ] as const).map(([k,l])=><button key={k} onClick={()=>setTab(k as any)} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab===k?'bg-[#061229] text-white shadow':'border border-slate-200 bg-white text-slate-600 hover:border-[#D89B28]'}`}>{l}</button>)}</div>
    {tab==='overview' && <div className="mt-5 grid gap-4 lg:grid-cols-3"><Action title="Record maize, beans, sorghum or millet" text="Log quantity, date and source in the private food register." button="Record food" onClick={()=>setShowContribution(true)} enabled={canFood}/>{canRice&&<Action title="Record KSh 350 rice payment" text="Keep the rice money register separate from general food records." button="Record rice payment" onClick={()=>setShowPayment(true)} enabled/><Action title="Record food stock movement" text="Track food used, wastage or adjustments so stock stays accountable." button="Record movement" onClick={()=>setShowAdjustment(true)} enabled={canFood}/></div>}
    {tab==='receipts' && <Section title="Food received" action={canFood?"Record food":undefined} onAction={()=>setShowContribution(true)}><Table headers={['Date','Food','Quantity','Received from','Notes']} rows={contributions.map(x=>[x.received_date,x.item_type,`${x.quantity} ${x.unit}`,x.received_from||'—',x.notes||'—'])}/></Section>}
    {tab==='rice' && canRice && <Section title="Rice money register" action="Record KSh 350" onAction={()=>setShowPayment(true)}><div className="mb-4 rounded-xl bg-[#061229] p-4 text-white"><p className="text-xs uppercase tracking-wider text-white/60">Recorded received</p><p className="mt-1 text-2xl font-black">KSh {riceTotal.toLocaleString()}</p></div><Table headers={['Date','Payer / learner','Amount','Receipt','Status']} rows={payments.map(x=>[x.payment_date,x.payer_name||x.learner_id||'—',`KSh ${Number(x.amount).toLocaleString()}`,x.receipt_reference||'—',x.status])}/></Section>}
    {tab==='stock' && <Section title="Food stock summary" action={canFood?"Record movement":undefined} onAction={()=>setShowAdjustment(true)}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{Object.entries(stock).map(([item,q])=><div key={item} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-md"><p className="text-xs font-bold uppercase tracking-wider text-[#D89B28]">{item}</p><p className="mt-2 text-2xl font-black text-[#061229]">{q.toLocaleString()} kg</p></div>)}</div><div className="mt-5"><Table headers={['Date','Food','Movement','Quantity','Notes']} rows={adjustments.map(x=>[x.adjustment_date,x.item_type,x.adjustment_type,`${x.quantity} ${x.unit}`,x.notes||'—'])}/></div></Section>}
    {showContribution&&<Modal title="Record food received" onClose={()=>setShowContribution(false)}><Select label="Food item" value={contribution.item_type} onChange={v=>setContribution({...contribution,item_type:v})} options={[...foodItems]}/><Input label="Quantity" type="number" value={contribution.quantity} onChange={v=>setContribution({...contribution,quantity:Number(v)})}/><Input label="Unit" value={contribution.unit} onChange={v=>setContribution({...contribution,unit:v})}/><Input label="Received date" type="date" value={contribution.received_date} onChange={v=>setContribution({...contribution,received_date:v})}/><Input label="Received from (optional)" value={contribution.received_from} onChange={v=>setContribution({...contribution,received_from:v})}/><Input label="Notes" value={contribution.notes} onChange={v=>setContribution({...contribution,notes:v})}/><Save disabled={saving} onClick={saveContribution}/></Modal>}
    {showPayment&&<Modal title="Record KSh 350 rice payment" onClose={()=>setShowPayment(false)}><p className="mb-4 rounded-xl bg-[#D89B28]/10 p-3 text-xs font-semibold text-[#061229]">This is a private school financial record. Access is restricted to authorised rice/food managers and administrators.</p><Input label="Learner ID (optional)" value={payment.learner_id} onChange={v=>setPayment({...payment,learner_id:v})}/><Input label="Payer / learner name" value={payment.payer_name} onChange={v=>setPayment({...payment,payer_name:v})}/><Input label="Amount (KSh)" type="number" value={payment.amount} onChange={v=>setPayment({...payment,amount:Number(v)})}/><Input label="Payment date" type="date" value={payment.payment_date} onChange={v=>setPayment({...payment,payment_date:v})}/><Input label="Receipt reference" value={payment.receipt_reference} onChange={v=>setPayment({...payment,receipt_reference:v})}/><Save disabled={saving} onClick={savePayment}/></Modal>}
    {showAdjustment&&<Modal title="Record food stock movement" onClose={()=>setShowAdjustment(false)}><Select label="Food item" value={adjustment.item_type} onChange={v=>setAdjustment({...adjustment,item_type:v})} options={['MAIZE','BEANS','SORGHUM','MILLET','RICE']}/><Select label="Movement" value={adjustment.adjustment_type} onChange={v=>setAdjustment({...adjustment,adjustment_type:v})} options={['RECEIVED','USED','WASTAGE','ADJUSTMENT']}/><Input label="Quantity" type="number" value={adjustment.quantity} onChange={v=>setAdjustment({...adjustment,quantity:Number(v)})}/><Input label="Unit" value={adjustment.unit} onChange={v=>setAdjustment({...adjustment,unit:v})}/><Input label="Date" type="date" value={adjustment.adjustment_date} onChange={v=>setAdjustment({...adjustment,adjustment_date:v})}/><Input label="Notes" value={adjustment.notes} onChange={v=>setAdjustment({...adjustment,notes:v})}/><Save disabled={saving} onClick={saveAdjustment}/></Modal>}
  </main>;
}
function Stat({icon:Icon,label,value,hidden}:{icon:any;label:string;value:any;hidden?:boolean}){if(hidden)return null;return <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-md"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#061229]/5 text-[#061229]"><Icon size={18}/></span><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-xl font-black text-[#061229]">{value}</p></div>}
function Action({title,text,button,onClick,enabled}:{title:string;text:string;button:string;onClick:()=>void;enabled:boolean}){return <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"><h2 className="text-base font-black text-[#061229]">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p><button disabled={!enabled} onClick={onClick} className="mt-5 min-h-10 rounded-xl bg-[#061229] px-4 text-sm font-bold text-white disabled:opacity-40">{button}</button></div>}
function Section({title,action,onAction,children}:{title:string;action?:string;onAction?:()=>void;children:any}){return <section className="mt-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-md"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black text-[#061229]">{title}</h2>{action&&<button onClick={onAction} className="rounded-xl bg-[#061229] px-4 py-2 text-sm font-bold text-white">{action}</button>}</div><div className="mt-4 overflow-x-auto">{children}</div></section>}
function Table({headers,rows}:{headers:string[];rows:any[][]}){return <table className="min-w-full text-left text-sm"><thead className="bg-[#061229] text-xs uppercase text-white"><tr>{headers.map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={i} className="border-t border-slate-100">{r.map((c,j)=><td key={j} className="px-4 py-3 text-slate-600">{c}</td>)}</tr>):<tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-400">No records yet.</td></tr>}</tbody></table>}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:any}){return <div className="fixed inset-0 z-[100] grid place-items-center bg-[#061229]/60 p-4"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-[#061229]">{title}</h2><button onClick={onClose} className="text-slate-400">✕</button></div><div className="mt-5 grid gap-4">{children}</div></div></div>}
function Input({label,value,onChange,type='text'}:{label:string;value:any;onChange:(v:string)=>void;type?:string}){return <label className="grid gap-1.5 text-sm font-bold text-[#061229]">{label}<input type={type} value={value} onChange={e=>onChange(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-[#D89B28]"/></label>}
function Select({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:string[]}){return <label className="grid gap-1.5 text-sm font-bold text-[#061229]">{label}<select value={value} onChange={e=>onChange(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-[#D89B28]">{options.map(o=><option key={o}>{o}</option>)}</select></label>}
function Save({onClick,disabled}:{onClick:()=>void;disabled:boolean}){return <button disabled={disabled} onClick={onClick} className="mt-1 min-h-11 rounded-xl bg-[#D89B28] px-5 text-sm font-black text-[#061229] disabled:opacity-50">{disabled?'Saving…':'Save record'}</button>}
