import { Edit3, Megaphone, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";

type Row = Record<string, any>;
const input = "min-h-11 w-full rounded-xl border border-[var(--ink)]/12 bg-white px-3.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10";
const roles = ["SUPER_ADMIN", "ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI", "TEACHER", "PARENT", "STUDENT"];

export default function AdminAnnouncementsPage() {
  const { user, profile, loading: authLoading } = useSchoolAuth();
  const [, navigate] = useLocation();
  const [rows, setRows] = useState<Row[]>([]);
  const [edit, setEdit] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!user || !profile || !isAdministrator(profile.role)) return;
    setLoading(true); setMessage("");
    try {
      const r = await getSupabase().from("announcements").select("id,title,body,target_roles,target_class_id,status,published_at,created_at,updated_at").order("created_at", { ascending: false });
      if (r.error) throw r.error;
      setRows(r.data ?? []);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Announcements could not be loaded."); }
    finally { setLoading(false); }
  }, [profile, user]);

  useEffect(() => { if (authLoading) return; if (!user || !profile) { navigate("/portal/login"); return; } if (!isAdministrator(profile.role)) { navigate("/portal/parent"); return; } void load(); }, [authLoading, load, navigate, profile, user]);

  const openCreate = () => setEdit({ title: "", body: "", target_roles: ["PARENT", "TEACHER", "STUDENT"], status: "DRAFT" });
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!edit || !user) return; setBusy(true); setMessage("");
    try {
      const status = String(edit.status || "DRAFT").toUpperCase();
      const payload = { title: String(edit.title || "").trim(), body: String(edit.body || "").trim(), target_roles: Array.isArray(edit.target_roles) ? edit.target_roles : ["PARENT"], status, published_at: status === "PUBLISHED" ? (edit.published_at || new Date().toISOString()) : null, created_by: edit.id ? edit.created_by : user.id };
      if (!payload.title || !payload.body) throw new Error("Title and message are required.");
      const r = edit.id ? await getSupabase().from("announcements").update(payload).eq("id", edit.id) : await getSupabase().from("announcements").insert(payload);
      if (r.error) throw r.error;
      setEdit(null); setMessage("Announcement saved."); await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Announcement could not be saved."); }
    finally { setBusy(false); }
  };
  const remove = async (row: Row) => { if (!window.confirm("Archive this announcement?")) return; setBusy(true); try { const r = await getSupabase().from("announcements").update({ status: "ARCHIVED" }).eq("id", row.id); if (r.error) throw r.error; setMessage("Announcement archived."); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Announcement could not be archived."); } finally { setBusy(false); } };
  const toggleRole = (role: string) => setEdit((v: Row | null) => v ? { ...v, target_roles: (v.target_roles ?? []).includes(role) ? v.target_roles.filter((x: string) => x !== role) : [...(v.target_roles ?? []), role] } : v);

  return <PortalLayout role={profile?.role ?? "ADMIN"}><main className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <header className="menwe-admin-hero rounded-[2rem] p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><span className="menwe-admin-kicker"><Megaphone size={14}/> Communications</span><h1 className="mt-4 text-4xl font-extrabold tracking-tight">Announcements</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Create, target, publish and archive official school announcements without mixing them with personal notifications.</p></div><div className="flex gap-2"><button onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold"><RefreshCw size={16}/>Refresh</button><button onClick={openCreate} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--gold)] px-4 text-sm font-black text-[var(--ink)]"><Plus size={16}/>New announcement</button></div></div></header>
    {message && <div role="status" className="rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold)]/10 px-4 py-3 text-sm font-semibold">{message}</div>}
    <section className="menwe-card overflow-hidden rounded-[1.75rem] p-4 sm:p-6">{loading ? <div className="py-12 text-center">Loading announcements…</div> : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--ink)]/15 p-12 text-center"><p className="font-semibold">No announcements yet</p><p className="mt-1 text-sm text-[var(--ink)]/55">Create the first official school message.</p></div> : <div className="grid gap-3">{rows.map(r => <article key={r.id} className="rounded-2xl border border-[var(--ink)]/8 bg-white p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{r.title}</h2><span className="rounded-full bg-[var(--gold)]/10 px-2.5 py-1 text-[10px] font-black uppercase text-[var(--gold)]">{r.status}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--ink)]/65">{r.body}</p><p className="mt-3 text-xs font-semibold text-[var(--ink)]/45">Audience: {(r.target_roles ?? []).join(", ") || "None"} · {r.published_at ? `Published ${new Date(r.published_at).toLocaleString("en-KE")}` : "Not published"}</p></div><div className="flex shrink-0 gap-2"><button onClick={() => setEdit({ ...r })} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"><Edit3 size={13}/>Edit</button><button disabled={busy} onClick={() => void remove(r)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700"><Trash2 size={13}/>Archive</button></div></div></article>)}</div>}</section>
    {edit && <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="flex items-center justify-between gap-4"><div><p className="menwe-premium-label">Announcement editor</p><h2 className="menwe-premium-title mt-1">{edit.id ? "Edit announcement" : "Create announcement"}</h2></div><button onClick={() => setEdit(null)} className="rounded-xl border px-3 py-2 text-sm font-bold">Cancel</button></div><form onSubmit={save} className="mt-5 grid gap-4"><input required className={input} placeholder="Announcement title" value={edit.title || ""} onChange={e => setEdit({ ...edit, title: e.target.value })}/><textarea required className={`${input} min-h-44 py-3`} placeholder="Write the official school message…" value={edit.body || ""} onChange={e => setEdit({ ...edit, body: e.target.value })}/><div><p className="text-xs font-black uppercase tracking-[.14em] text-[var(--ink)]/45">Audience</p><div className="mt-2 flex flex-wrap gap-2">{roles.map(role => <button type="button" key={role} onClick={() => toggleRole(role)} className={`rounded-full px-3 py-2 text-xs font-bold ${edit.target_roles?.includes(role) ? "bg-[var(--ink)] text-white" : "border border-[var(--ink)]/12 bg-white"}`}>{role.replaceAll("_", " ")}</button>)}</div></div><select className={input} value={edit.status || "DRAFT"} onChange={e => setEdit({ ...edit, status: e.target.value })}><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select><button disabled={busy} className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-[var(--ink)] px-5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Save announcement"}</button></form></section>}
  </main></PortalLayout>;
}
