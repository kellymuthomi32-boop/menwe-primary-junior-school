import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Row = { id: string; title: string; message: string; category: string | null; is_read: boolean; created_at: string };

function friendlyError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  if (/row-level security|permission denied|not authorized/i.test(text)) return "You are not authorized to access these notifications.";
  if (/network|fetch|timeout|rate limit|429/i.test(text)) return "Connection issue. Please check your network and try again.";
  return "Unable to load notifications. Please try again.";
}

export default function NotificationCenter() {
 const [rows,setRows]=useState<Row[]>([]); const [loading,setLoading]=useState(true); const [message,setMessage]=useState<string|null>(null);
 const load=useCallback(async()=>{setLoading(true);setMessage(null);try{const db=getSupabase();const {data:userData,error:userError}=await db.auth.getUser();if(userError)throw userError;if(!userData.user)throw new Error("Sign in is required.");const {data,error}=await db.from("notifications").select("id,title,message,category,is_read,created_at").eq("user_id",userData.user.id).order("created_at",{ascending:false});if(error)throw error;setRows((data??[]) as Row[]);}catch(e){setMessage(friendlyError(e));}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 const mark=async(id:string)=>{setRows(v=>v.map(r=>r.id===id?{...r,is_read:true}:r));try{const {error}=await getSupabase().from("notifications").update({is_read:true}).eq("id",id);if(error)throw error;}catch(e){setMessage(friendlyError(e));void load();}};
 const markAll=async()=>{try{const db=getSupabase();const {data:userData,error:userError}=await db.auth.getUser();if(userError)throw userError;if(!userData.user)return;const {error}=await db.from("notifications").update({is_read:true}).eq("user_id",userData.user.id).eq("is_read",false);if(error)throw error;setRows(v=>v.map(r=>({...r,is_read:true})));}catch(e){setMessage(friendlyError(e));}};
 const unread=rows.filter(r=>!r.is_read).length;
 return <section className="menwe-card w-full min-w-0 max-w-full box-border rounded-[1.75rem] p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-serif text-2xl font-semibold">Notifications</h2><p className="mt-2 text-sm text-[var(--ink)]/60">{unread} unread notification{unread===1?"":"s"}. Read state is persisted securely to your account.</p></div><div className="flex items-center gap-2"><Bell className="text-[var(--accent)]" size={24}/><button type="button" onClick={()=>void markAll()} disabled={!unread} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[var(--ink)]/15 px-3 py-2 text-sm font-semibold transition active:scale-[.98] disabled:opacity-40"><CheckCheck size={16}/>Mark all read</button></div></div>{loading?<div className="flex justify-center gap-2 py-12 text-sm text-[var(--ink)]/60"><Loader2 className="animate-spin" size={18}/>Loading…</div>:rows.length?<div className="mt-6 grid gap-3">{rows.map(r=><button type="button" key={r.id} onClick={()=>!r.is_read&&void mark(r.id)} className={`min-h-12 w-full min-w-0 max-w-full box-border rounded-2xl border p-4 text-left transition active:scale-[.99] ${r.is_read?"border-[var(--ink)]/8 bg-white":"border-[var(--accent)]/30 bg-[var(--accent)]/5"}`}><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><strong className="break-words">{r.title}</strong><span className="shrink-0 text-xs text-[var(--ink)]/50">{new Date(r.created_at).toLocaleString("en-KE")}</span></div><p className="mt-2 break-words text-sm leading-6 text-[var(--ink)]/70">{r.message}</p><p className="mt-2 text-xs font-semibold text-[var(--ink)]/45">{r.category??"General"} · {r.is_read?"Read":"Unread"}</p></button>)}</div>:<p className="mt-6 rounded-2xl border border-dashed border-[var(--ink)]/15 px-5 py-8 text-center text-sm text-[var(--ink)]/55">No notifications yet.</p>}{message&&<p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}</section>;
}
