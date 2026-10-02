import { Bell, BellRing, CheckCircle2, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";

const PUBLIC_KEY = (import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined)?.trim();

function base64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export default function PushNotificationSetup() {
  const { user, profile } = useSchoolAuth();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupported("serviceWorker" in navigator && "PushManager" in window && "Notification" in window && Boolean(PUBLIC_KEY));
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  if (!user || !profile || profile.role !== "TEACHER" || !supported || permission === "granted" || dismissed) return null;

  const enable = async () => {
    setBusy(true);
    setMessage("");
    try {
      const next = await Notification.requestPermission();
      setPermission(next);
      if (next !== "granted") {
        setMessage("Notifications remain off. You can enable them later from your browser settings.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(PUBLIC_KEY!),
      });
      const json = subscription.toJSON();
      const { error } = await getSupabase().from("web_push_subscriptions").upsert({
        profile_id: user.id,
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        expiration_time: json.expirationTime ?? null,
      }, { onConflict: "profile_id,endpoint" });
      if (error) throw error;
      setMessage("Push notifications are enabled on this phone.");
    } catch (error) {
      console.error("Push notification setup failed:", error);
      setMessage(error instanceof Error ? error.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[120] mx-auto max-w-lg rounded-2xl border border-[var(--gold)]/30 bg-[var(--ink)] p-4 text-white shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--gold)] text-[var(--ink)]">
          <BellRing size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">Turn on Menwe notifications</p>
          <p className="mt-1 text-sm leading-5 text-white/75">Get important school announcements at the top of your phone, even when the portal is closed.</p>
          {message && <p className="mt-2 text-xs font-semibold text-[var(--gold)]">{message}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void enable()} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--gold)] px-4 text-sm font-black text-[var(--ink)] disabled:opacity-60">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
              {busy ? "Enabling…" : "Enable notifications"}
            </button>
            <button type="button" onClick={() => setDismissed(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold text-white/85">
              <X size={15} /> Later
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
