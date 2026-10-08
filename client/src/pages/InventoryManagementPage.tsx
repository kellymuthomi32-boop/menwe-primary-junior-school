import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, PackagePlus, RefreshCw, Search } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

type Item={id:string;item_name:string;category:string;unit:string;description:string|null;reorder_level:number;current_quantity:number;condition:string;location:string|null;active:boolean};
type Tx={id:string;item_id:string;transaction_type:string;quantity:number;source_or_recipient:string|null;reference_no:string|null;condition:string|null;notes:string|null;transaction_date:string};

const categories=["Stationery","Textbooks","Teaching materials","ICT equipment","Furniture","Sports equipment","Cleaning materials","Laboratory","Food & kitchen","Other"];

export default function InventoryManagementPage(){
 const [items,setItems]=useState<Item[]>([]);
 const [transactions,setTransactions]=useState<Tx[]>([]);
 const [search,setSearch]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [form,setForm]=useState({item_name:"",category:"Stationery",unit:"pcs",quantity:"",reorder_level:"0",source:"",condition:"Good",location:"",reference_no:"",notes:"",type:"RECEIVED"});

 const load=async()=>{
  setBusy(true);
  const [i,t]=await Promise.all([
   getSupabase().from("inventory_items").select("*").eq("active",true).order("item_name"),
   getSupabase().from("inventory_transactions").select("*").order("created_at",{ascending:false}).limit(30)
  ]);
  if(!i.error)setItems((i.data??[]) as Item[]);
  if(!t.error)setTransactions((t.data??[]) as Tx[]);
  setBusy(false);
 };
 useEffect(()=>{void load()},[]);
 useEffect(()=>{if(!message)return;const id=window.setTimeout(()=>setMessage(""),3500);return()=>window.clearTimeout(id)},[message]);

 const filtered=useMemo(()=>items.filter(x=>`${x.item_name} ${x.category} ${x.location??""}`.toLowerCase().includes(search.toLowerCase())),[items,search]);
 const lowStock=items.filter(x=>Number(x.current_quantity)<=Number(x.reorder_level)).length;

 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();
  const qty=Number(form.quantity);
  if(!form.item_name.trim()||!Number.isFinite(qty)||qty<=0){setMessage("Enter an item and a quantity greater than zero.");return}
  setBusy(true);
  const existing=items.find(x=>x.item_name.trim().toLowerCase()===form.item_name.trim().toLowerCase());
  let itemId=existing?.id;
  if(!itemId){
   const r=await getSupabase().from("inventory_items").insert({item_name:form.item_name.trim(),category:form.category,unit:form.unit,reorder_level:Number(form.reorder_level)||0,current_quantity:0,condition:form.condition,location:form.location||null}).select("id").single();
   if(r.error){setMessage(r.error.message);setBusy(false);return}
   itemId=r.data.id;
  }
  const current=existing?.current_quantity??0;
  const next=form.type==="ISSUED" ? current-qty : current+qty;
  if(next<0){setMessage("Cannot issue more stock than is available.");setBusy(false);return}
  const tx=await getSupabase().from("inventory_transactions").insert({item_id:itemId,transaction_type:form.type,quantity:qty,source_or_recipient:form.source||null,reference_no:form.reference_no||null,condition:form.condition,notes:form.notes||null});
  if(tx.error){setMessage(tx.error.message);setBusy(false);return}
  const up=await getSupabase().from("inventory_items").update({current_quantity:next,condition:form.condition,location:form.location||null,updated_at:new Date().toISOString()}).eq("id",itemId);
  if(up.error){setMessage("Transaction recorded, but stock balance could not be updated. Please refresh and reconcile.");setBusy(false);return}
  setForm(f=>({...f,quantity:"",source:"",reference_no:"",notes:""}));
  setMessage(form.type==="RECEIVED"?"Materials received and inventory updated.":"Materials issued and inventory updated.");
  await load();
 };

 return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
  {message&&<div className="fixed right-5 top-20 z-50 max-w-sm rounded-2xl border border-[var(--gold)]/30 bg-white px-4 py-3 text-sm font-bold text-[var(--ink)] shadow-xl">{message}</div>}
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
   <div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[var(--accent)]">Deputy operations</p><h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--ink)]">School Inventory & Materials</h1><p className="mt-1 max-w-2xl text-sm text-[var(--ink)]/60">Record materials received, items issued, stock balances and school stores activity.</p></div>
   <div className="flex gap-2"><span className="rounded-xl border border-[var(--ink)]/10 bg-white px-3 py-2 text-xs font-bold">{items.length} active items</span><span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">{lowStock} low stock</span></div>
  </div>
  <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
   <form onSubmit={submit} className="rounded-3xl border border-[var(--ink)]/10 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-2"><PackagePlus size={18}/><h2 className="font-black">Record movement</h2></div>
    <div className="mt-4 grid gap-3">
     <div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setForm(f=>({...f,type:"RECEIVED"}))} className={form.type==="RECEIVED"?"rounded-xl bg-[var(--ink)] px-3 py-2 text-xs font-extrabold text-white":"rounded-xl border border-[var(--ink)]/10 px-3 py-2 text-xs font-extrabold"}><ArrowDownToLine className="mr-1 inline" size={14}/>Received</button><button type="button" onClick={()=>setForm(f=>({...f,type:"ISSUED"}))} className={form.type==="ISSUED"?"rounded-xl bg-[var(--ink)] px-3 py-2 text-xs font-extrabold text-white":"rounded-xl border border-[var(--ink)]/10 px-3 py-2 text-xs font-extrabold"}><ArrowUpFromLine className="mr-1 inline" size={14}/>Issued</button></div>
     <input required value={form.item_name} onChange={e=>setForm(f=>({...f,item_name:e.target.value}))} placeholder="Item name e.g. exercise books" className="rounded-xl border border-[var(--ink)]/12 px-3 py-2.5 text-sm"/>
     <div className="grid grid-cols-2 gap-2"><select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="rounded-xl border border-[var(--ink)]/12 px-3 py-2.5 text-sm">{categories.map(c=><option key={c}>{c}</option>)}</select><input value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} placeholder="Unit" className="rounded-xl border border-[var(--ink)]/12 px-3 py-2.5 text-sm"/></div>
     <input required type="number" min="0.01" step="0.01" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} placeholder="Quantity" className="rounded-xl border border-[var(--ink)]/12 px-3 py-2.5 text-sm"/>
     <input type="number" min="0" step="0.01" value={form.reorder_level} onChange={e=>setForm(f=>({...f,reorder_level:e.target.value}))} placeholder="Reorder level" className="rounded-xl border border-[var(--ink)]/12 px-3 py-2.5 text-sm"/>
     <input value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))} placeholder={form.type==="RECEIVED"?"Supplier / source":"Recipient / department"} className="rounded-xl border border-[var(--ink)]/12 px-3 py-2.5 text-sm"/>
     <div className="grid grid-cols-2 gap-2"><input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="Store/location" className="rounded-xl border border-[var(--ink)]/12 px-3 py-2.5 text-sm"/><input value={form.reference_no} onChange={e=>setForm(f=>({...f,reference_no:e.target.value}))} placeholder="Delivery/ref no." className="rounded-xl border border-[var(--ink)]/12 px-3 py-2.5 text-sm"/></div>
     <select value={form.condition} onChange={e=>setForm(f=>({...f,condition:e.target.value}))} className="rounded-xl border border-[var(--ink)]/12 px-3 py-2.5 text-sm">{["Good","New","Fair","Damaged"].map(c=><option key={c}>{c}</option>)}</select>
     <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Notes" className="min-h-20 rounded-xl border border-[var(--ink)]/12 px-3 py-2.5 text-sm"/>
     <button disabled={busy} className="rounded-xl bg-[var(--gold)] px-4 py-3 text-sm font-black text-[var(--ink)] disabled:opacity-50">{busy?"Saving…":"Save inventory record"}</button>
    </div>
   </form>
   <div className="space-y-5">
    <div className="flex items-center gap-2 rounded-2xl border border-[var(--ink)]/10 bg-white px-4 py-3"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search inventory…" className="w-full bg-transparent text-sm outline-none"/><button type="button" onClick={()=>void load()} className="rounded-lg p-2 hover:bg-black/5" aria-label="Refresh"><RefreshCw size={15}/></button></div>
    <div className="overflow-hidden rounded-3xl border border-[var(--ink)]/10 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-[var(--ink)]/8 px-5 py-4"><Boxes size={18}/><h2 className="font-black">Current stock</h2></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[var(--paper)] text-xs font-extrabold uppercase tracking-wide text-[var(--ink)]/55"><tr><th className="px-5 py-3">Item</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Balance</th><th className="px-3 py-3">Location</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{filtered.map(i=><tr key={i.id} className="border-t border-[var(--ink)]/7"><td className="px-5 py-3 font-bold">{i.item_name}<div className="text-[11px] font-normal text-[var(--ink)]/45">{i.condition}</div></td><td className="px-3 py-3">{i.category}</td><td className="px-3 py-3 font-black">{i.current_quantity} {i.unit}</td><td className="px-3 py-3">{i.location||"—"}</td><td className="px-5 py-3">{Number(i.current_quantity)<=Number(i.reorder_level)?<span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800">LOW STOCK</span>:<span className="text-xs font-bold text-emerald-700">OK</span>}</td></tr>)}{!filtered.length&&<tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[var(--ink)]/50">No inventory items yet.</td></tr>}</tbody></table></div></div>
    <div className="overflow-hidden rounded-3xl border border-[var(--ink)]/10 bg-white"><div className="border-b border-[var(--ink)]/8 px-5 py-4"><h2 className="font-black">Recent movements</h2></div><div className="divide-y divide-[var(--ink)]/7">{transactions.map(t=><div key={t.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm"><div><p className="font-bold">{items.find(i=>i.id===t.item_id)?.item_name||"Inventory item"}</p><p className="text-xs text-[var(--ink)]/50">{t.source_or_recipient||"—"} · {t.transaction_date}</p></div><span className={"rounded-full px-2.5 py-1 text-[10px] font-black "+(t.transaction_type==="ISSUED"?"bg-blue-50 text-blue-700":"bg-emerald-50 text-emerald-700")}>{t.transaction_type} · {t.quantity}</span></div>)}</div></div>
   </div>
  </div>
 </div>
}
