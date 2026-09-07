import { Bell, Check, ExternalLink, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const db = getSupabase();
    const { data: userData, error: userError } = await db.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) {
      setRows([]);
      return;
    }
    const { data, error: queryError } = await db
      .from("notifications")
      .select("id,title,body,type,link,read_at,created_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (queryError) throw queryError;
    setRows((data ?? []) as NotificationRow[]);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void load()
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load notifications.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    let channel: ReturnType<ReturnType<typeof getSupabase>["channel"]> | null = null;
    try {
      const db = getSupabase();
      void db.auth.getUser().then(({ data, error }) => {
        if (error) throw error;
        if (!active || !data.user) return;
        channel = db
          .channel(`notifications:${data.user.id}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "notifications", filter: `profile_id=eq.${data.user.id}` },
            () => void load().catch(() => undefined),
          )
          .subscribe();
      }).catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to sync notifications.");
      });
    } catch (err) {
      if (active) setError(err instanceof Error ? err.message : "Unable to sync notifications.");
    }

    return () => {
      active = false;
      if (channel) void channel.unsubscribe();
    };
  }, [load]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const markRead = async (id: string) => {
    setRows((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    try {
      const { error: updateError } = await getSupabase()
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (updateError) throw updateError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to mark notification as read.");
      void load().catch(() => undefined);
    }
  };

  const unread = rows.filter((item) => !item.read_at).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative grid min-h-12 min-w-12 place-items-center rounded-xl border border-[var(--ink)]/15 bg-white transition active:scale-[.98] hover:bg-slate-50"
      >
        <Bell size={19} />
        {unread > 0 && <span className="absolute right-1 top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-black leading-5 text-white">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-50 w-[min(92vw,26rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="font-bold text-[#061229]">Notifications</p>
              <p className="text-xs text-slate-500">{unread} unread</p>
            </div>
            <button
              type="button"
              onClick={() => void Promise.all(rows.filter((item) => !item.read_at).map((item) => markRead(item.id)))}
              disabled={!unread}
              className="min-h-12 rounded-lg px-3 text-xs font-bold text-[#D89B28] transition active:scale-[.98] disabled:opacity-40"
            >Mark all read</button>
          </div>

          {loading ? (
            <div className="flex min-h-24 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={17} />Loading…</div>
          ) : rows.length ? (
            <div className="max-h-96 overflow-y-auto">
              {rows.map((item) => (
                <div key={item.id} className={`border-b border-slate-100 p-4 ${item.read_at ? "bg-white" : "bg-amber-50/60"}`}>
                  <div className="flex gap-3">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.read_at ? "bg-slate-200" : "bg-red-500"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold text-[#061229]">{item.title}</p>
                      <p className="mt-1 break-words text-sm leading-5 text-slate-600">{item.body}</p>
                      <p className="mt-2 text-[11px] text-slate-400">{new Date(item.created_at).toLocaleString("en-KE")}</p>
                    </div>
                    <div className="flex shrink-0 items-start gap-1">
                      {item.link && <button type="button" title="Open" aria-label="Open notification" onClick={() => { window.location.href = item.link!; }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ExternalLink size={16} /></button>}
                      {item.read_at && <Check className="mt-2 text-emerald-600" size={16} />}
                    </div>
                  </div>
                  {!item.read_at && <button type="button" onClick={() => void markRead(item.id)} className="mt-2 ml-5 text-xs font-bold text-[#D89B28]">Mark as read</button>}
                </div>
              ))}
            </div>
          ) : <p className="p-8 text-center text-sm text-slate-500">No notifications yet.</p>}
          {error && <p className="border-t border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">Unable to sync notifications. Please refresh.</p>}
        </div>
      )}
    </div>
  );
}
