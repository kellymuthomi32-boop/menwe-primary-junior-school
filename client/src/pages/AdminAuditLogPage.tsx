import { Activity, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";

type Row = Record<string, any>;
const text = (v: unknown, fallback = "—") => v == null || v === "" ? fallback : String(v);

export default function AdminAuditLogPage() {
  const { user, profile, loading: authLoading } = useSchoolAuth();
  const [, navigate] = useLocation();
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!user || !profile || !isAdministrator(profile.role)) return;
    setLoading(true); setMessage("");
    try {
      const r = await getSupabase().from("audit_logs").select("id,actor_id,action,entity_type,entity_id,metadata,created_at").order("created_at", { ascending: false }).range(0, 199);
      if (r.error) throw r.error;
      setRows(r.data ?? []);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Audit history could not be loaded."); }
    finally { setLoading(false); }
  }, [profile, user]);
  useEffect(() => { if (authLoading) return; if (!user || !profile) { navigate("/portal/login"); return; } if (!isAdministrator(profile.role)) { navigate("/portal/parent"); return; } void load(); }, [authLoading, load, navigate, profile, user]);
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); return rows.filter(r => !q || [r.action, r.entity_type, r.entity_id, JSON.stringify(r.metadata ?? {})].join(" ").toLowerCase().includes(q)); }, [query, rows]);

  return <PortalLayout role={profile?.role ?? "ADMIN"}><main className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <header className="menwe-admin-hero rounded-[2rem] p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><span className="menwe-admin-kicker"><ShieldCheck size={14}/> Security & governance</span><h1 className="mt-4 text-4xl font-extrabold tracking-tight">Audit history</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Review important school-system actions with actor, entity, timestamp and metadata context.</p></div><button onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold"><RefreshCw size={16}/>Refresh</button></div></header>
    {message && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{message}</div>}
    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><label className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--ink)]/12 bg-white px-3.5"><Search size={17} className="text-[var(--gold)]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search action, entity or metadata…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"/></label></section>
    <section className="menwe-card overflow-hidden rounded-[1.75rem] p-4 sm:p-6">{loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--ink)]/60"><Activity size={17} className="animate-pulse text-[var(--gold)]"/>Loading audit history…</div> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--ink)]/15 p-12 text-center"><p className="font-semibold">No audit entries found</p><p className="mt-1 text-sm text-[var(--ink)]/55">Only recorded production audit events are shown.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-[var(--ink)]/10 text-[10px] font-black uppercase tracking-[.14em] text-[var(--ink)]/45"><th className="p-3">Time</th><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">Actor</th><th className="p-3">Metadata</th></tr></thead><tbody>{filtered.map(r => <tr key={r.id} className="border-b border-[var(--ink)]/7 align-top"><td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString("en-KE")}</td><td className="p-3 font-bold">{text(r.action)}</td><td className="p-3">{text(r.entity_type)}{r.entity_id ? ` · ${r.entity_id}` : ""}</td><td className="p-3 font-mono text-xs">{text(r.actor_id)}</td><td className="max-w-[420px] p-3 font-mono text-xs whitespace-pre-wrap break-words">{JSON.stringify(r.metadata ?? {}, null, 2)}</td></tr>)}</tbody></table></div>}</section>
  </main></PortalLayout>;
}
