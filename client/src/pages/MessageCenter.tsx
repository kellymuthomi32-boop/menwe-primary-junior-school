import { Loader2, MessageSquare, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppRole } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";

type Row = Record<string, unknown>;
type Thread = Row & { messages?: Row[]; thread_participants?: Row[] };

const value = (item: unknown, fallback = "") => item === null || item === undefined ? fallback : String(item);
const dateTime = (item: unknown) => item ? new Date(String(item)).toLocaleString() : "";
const inputClass = "w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm outline-none ring-[var(--accent)] focus:ring-2";

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><h2 className="font-serif text-2xl font-semibold tracking-tight">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--ink)]/60">{description}</p><div className="mt-6">{children}</div></section>;
}

export default function MessageCenter({ role }: { role: AppRole }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [directory, setDirectory] = useState<Row[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [newMessage, setNewMessage] = useState({ recipient: "", subject: "", body: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const client = getSupabase();
      const [threadResult, directoryResult] = await Promise.all([
        client.from("message_threads").select("id,subject,status,created_at,updated_at,messages(id,body,created_at,sender_id),thread_participants(profile_id,last_read_at)").order("updated_at", { ascending: false }).limit(50),
        role === "STUDENT" ? Promise.resolve({ data: [] as Row[], error: null }) : client.rpc("message_directory"),
      ]);
      if (threadResult.error) throw threadResult.error;
      if (directoryResult.error) throw directoryResult.error;
      const nextThreads = (threadResult.data ?? []) as unknown as Thread[];
      setThreads(nextThreads);
      setDirectory((directoryResult.data ?? []) as Row[]);
      setSelectedId(current => current && nextThreads.some(thread => value(thread.id) === current) ? current : value(nextThreads[0]?.id) || null);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Messages could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => { void refresh(); }, [refresh]);

  const selected = useMemo(() => threads.find(thread => value(thread.id) === selectedId) ?? null, [selectedId, threads]);
  const isUnread = (thread: Thread) => {
    const participants = thread.thread_participants ?? [];
    const lastRead = value(participants[0]?.last_read_at);
    const latest = [...(thread.messages ?? [])].sort((a, b) => value(b.created_at).localeCompare(value(a.created_at)))[0];
    return Boolean(latest?.created_at && (!lastRead || value(latest.created_at) > lastRead));
  };

  const selectThread = async (threadId: string) => {
    setSelectedId(threadId);
    try { const { error } = await getSupabase().rpc("mark_message_thread_read", { p_thread_id: threadId }); if (error) throw error; await refresh(); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "The conversation could not be marked as read."); }
  };

  const createThread = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      const { error } = await getSupabase().rpc("create_message_thread", { p_recipient_id: newMessage.recipient, p_subject: newMessage.subject || null, p_body: newMessage.body });
      if (error) throw error;
      setNewMessage({ recipient: "", subject: "", body: "" }); setMessage("Your secure message has been sent."); await refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "The message could not be sent."); } finally { setBusy(false); }
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selected || !reply.trim()) return; setBusy(true); setMessage(null);
    try {
      const { error } = await getSupabase().rpc("reply_to_message_thread", { p_thread_id: selected.id, p_body: reply });
      if (error) throw error;
      setReply(""); setMessage("Your reply has been sent."); await refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "The reply could not be sent."); } finally { setBusy(false); }
  };

  return <div className="grid gap-6 xl:grid-cols-[.72fr_1.28fr]">
    <Panel title="Messages" description="Only conversation participants and authorised administrators can read these records.">
      {loading ? <div className="flex items-center justify-center gap-3 py-10 text-sm text-[var(--ink)]/60"><Loader2 className="animate-spin text-[var(--accent)]" size={18} />Loading authorised conversations…</div> : threads.length === 0 ? <p className="rounded-2xl border border-dashed border-[var(--ink)]/15 px-5 py-8 text-center text-sm text-[var(--ink)]/55">No accessible conversations exist yet.</p> : <div className="grid gap-2">{threads.map(thread => <button type="button" key={value(thread.id)} onClick={() => void selectThread(value(thread.id))} className={`rounded-2xl border p-4 text-left transition ${selectedId === value(thread.id) ? "border-[var(--accent)] bg-[var(--sage)]/12" : "border-[var(--ink)]/10 hover:border-[var(--accent)]/40"}`}><div className="flex items-start justify-between gap-3"><p className="font-semibold">{value(thread.subject, "Conversation")}</p>{isUnread(thread) && <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">New</span>}</div><p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--ink)]/60">{value(thread.messages?.at(-1)?.body, "No messages")}</p><p className="mt-2 text-xs text-[var(--ink)]/45">{dateTime(thread.updated_at || thread.created_at)}</p></button>)}</div>}
    </Panel>
    <div className="grid gap-6">
      <Panel title={selected ? value(selected.subject, "Conversation") : "Conversation"} description="Replies are saved through relationship-scoped database controls and recipients receive in-app notifications.">
        {!selected ? <p className="text-sm text-[var(--ink)]/60">Select a conversation to view its history.</p> : <><div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">{(selected.messages ?? []).map(item => <article key={value(item.id)} className="rounded-2xl bg-[var(--mist)] p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-[var(--ink)]/78">{value(item.body)}</p><p className="mt-2 text-xs text-[var(--ink)]/45">{dateTime(item.created_at)}</p></article>)}</div><form onSubmit={sendReply} className="mt-5 grid gap-3"><label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]/75">Reply<textarea required maxLength={5000} rows={4} value={reply} onChange={event => setReply(event.target.value)} className={inputClass} /></label><button disabled={busy} className="inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-55">{busy && <Loader2 className="animate-spin" size={16} />}<Send size={16} />Send reply</button></form></>}
      </Panel>
      {role !== "STUDENT" && <Panel title="Start a message" description="You can contact only people returned by the relationship-authorised recipient directory."><form onSubmit={createThread} className="grid gap-3"><label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]/75">Recipient<select required value={newMessage.recipient} onChange={event => setNewMessage(current => ({ ...current, recipient: event.target.value }))} className={inputClass}><option value="">Select an authorised contact</option>{directory.map(item => <option key={value(item.id)} value={value(item.id)}>{value(item.full_name, value(item.email))} — {value(item.role)}</option>)}</select></label><label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]/75">Subject<input maxLength={200} value={newMessage.subject} onChange={event => setNewMessage(current => ({ ...current, subject: event.target.value }))} className={inputClass} /></label><label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]/75">Message<textarea required maxLength={5000} rows={4} value={newMessage.body} onChange={event => setNewMessage(current => ({ ...current, body: event.target.value }))} className={inputClass} /></label><button disabled={busy} className="inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-55">{busy && <Loader2 className="animate-spin" size={16} />}<MessageSquare size={16} />Send message</button></form></Panel>}
      {message && <p role="status" className="rounded-xl bg-[var(--sage)]/16 px-4 py-3 text-sm text-[var(--accent)]">{message}</p>}
    </div>
  </div>;
}
