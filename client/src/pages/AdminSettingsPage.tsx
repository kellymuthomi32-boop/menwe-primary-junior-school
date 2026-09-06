import { CheckCircle2, MessageCircle, RefreshCw, Settings, ShieldCheck, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";

type Setting = { key: string; value: any; is_public: boolean };
type Channel = { channel: "SMS" | "WHATSAPP"; enabled: boolean; provider: string | null; mode: "QUEUE_ONLY" | "PROVIDER" };
const fields = [
  ["school_name", "School name", "text", true],
  ["contact_email", "Contact email", "email", true],
  ["contact_phone", "Contact phone", "text", true],
  ["address", "School address", "text", true],
  ["website", "Website", "text", true],
  ["admissions_open", "Admissions open", "boolean", true],
] as const;
const channelDefaults: Record<"SMS" | "WHATSAPP", Channel> = {
  SMS: { channel: "SMS", enabled: false, provider: null, mode: "QUEUE_ONLY" },
  WHATSAPP: { channel: "WHATSAPP", enabled: false, provider: null, mode: "QUEUE_ONLY" },
};

export default function AdminSettingsPage() {
  const { user, profile, loading: authLoading } = useSchoolAuth();
  const [, navigate] = useLocation();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [publicFlags, setPublicFlags] = useState<Record<string, boolean>>({});
  const [channels, setChannels] = useState<Record<"SMS" | "WHATSAPP", Channel>>(channelDefaults);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!user || !profile || !isAdministrator(profile.role)) return;
    setLoading(true); setMessage("");
    try {
      const db = getSupabase();
      const [settingsResult, channelsResult] = await Promise.all([
        db.from("school_settings").select("key,value,is_public").order("key"),
        db.from("notification_channels").select("channel,enabled,provider,mode").order("channel"),
      ]);
      if (settingsResult.error) throw settingsResult.error;
      if (channelsResult.error) throw channelsResult.error;
      const next: Record<string, any> = {}; const flags: Record<string, boolean> = {};
      (settingsResult.data ?? []).forEach((row: Setting) => { next[row.key] = row.value; flags[row.key] = row.is_public; });
      const nextChannels = { ...channelDefaults };
      (channelsResult.data ?? []).forEach((row: Channel) => { if (row.channel === "SMS" || row.channel === "WHATSAPP") nextChannels[row.channel] = row; });
      setSettings(next); setPublicFlags(flags); setChannels(nextChannels);
    } catch (e) { setMessage(e instanceof Error ? e.message : "School settings could not be loaded."); }
    finally { setLoading(false); }
  }, [profile, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile) { navigate("/portal/login"); return; }
    if (!isAdministrator(profile.role)) { navigate("/portal/parent"); return; }
    void load();
  }, [authLoading, load, navigate, profile, user]);

  const save = async () => {
    if (!user) return; setBusy(true); setMessage("");
    try {
      const db = getSupabase();
      for (const [key] of fields) {
        const raw = settings[key];
        const value = key === "admissions_open" ? Boolean(raw) : String(raw ?? "").trim();
        const r = await db.from("school_settings").upsert({ key, value, is_public: publicFlags[key] ?? true, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "key" });
        if (r.error) throw r.error;
      }
      for (const channel of ["SMS", "WHATSAPP"] as const) {
        const r = await db.from("notification_channels").upsert({ channel, enabled: channels[channel].enabled, provider: channels[channel].provider, mode: channels[channel].mode, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "channel" });
        if (r.error) throw r.error;
      }
      setMessage("School and notification settings saved."); await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Settings could not be saved."); }
    finally { setBusy(false); }
  };

  return <PortalLayout role={profile?.role ?? "ADMIN"}><main className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <header className="menwe-admin-hero rounded-[2rem] p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><span className="menwe-admin-kicker"><Settings size={14}/> System configuration</span><h1 className="mt-4 text-4xl font-extrabold tracking-tight">School settings</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Manage the canonical school configuration and communication infrastructure used by the portal.</p></div><button onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold"><RefreshCw size={16}/>Refresh</button></div></header>
    {message && <div role="status" className="rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold)]/10 px-4 py-3 text-sm font-semibold">{message}</div>}
    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="grid gap-5 sm:grid-cols-2">{loading ? <div className="py-12 text-center sm:col-span-2">Loading settings…</div> : fields.map(([key, label, type, publicDefault]) => <label key={key} className="grid gap-2 text-sm font-bold">{label}{type === "boolean" ? <div className="flex min-h-12 items-center justify-between rounded-xl border border-[var(--ink)]/12 bg-white px-3.5"><span className="text-[var(--ink)]/60">{settings[key] ? "Enabled" : "Disabled"}</span><input type="checkbox" checked={Boolean(settings[key])} onChange={e => setSettings(v => ({ ...v, [key]: e.target.checked }))}/></div> : <input type={type} value={settings[key] ?? ""} onChange={e => setSettings(v => ({ ...v, [key]: e.target.value }))} className="min-h-12 rounded-xl border border-[var(--ink)]/12 bg-white px-3.5 font-normal outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"/>}<span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--ink)]/45"><input type="checkbox" checked={publicFlags[key] ?? publicDefault} onChange={e => setPublicFlags(v => ({ ...v, [key]: e.target.checked }))}/> Public setting</span></label>)}</div></section>

    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><span className="menwe-admin-kicker !text-[var(--gold)]"><MessageCircle size={14}/> Parent communication</span><h2 className="mt-3 text-2xl font-extrabold tracking-tight">SMS & WhatsApp readiness</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink)]/60">The school can prepare these channels now without paying a message provider. The system stores delivery jobs in a secure queue; a provider can be connected later without redesigning the portal.</p></div><div className="hidden rounded-2xl bg-[var(--gold)]/10 p-3 sm:block"><Smartphone className="text-[var(--gold)]" size={24}/></div></div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">{(["SMS", "WHATSAPP"] as const).map(channel => <div key={channel} className="rounded-2xl border border-[var(--ink)]/10 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div><h3 className="font-bold">{channel === "SMS" ? "SMS" : "WhatsApp"}</h3><p className="mt-1 text-xs text-[var(--ink)]/50">{channels[channel].mode === "QUEUE_ONLY" ? "Queue-only mode · no provider connected" : `Provider: ${channels[channel].provider ?? "configured"}`}</p></div><label className="flex items-center gap-2 text-xs font-bold"><span>{channels[channel].enabled ? "Ready" : "Off"}</span><input type="checkbox" checked={channels[channel].enabled} onChange={e => setChannels(v => ({ ...v, [channel]: { ...v[channel], enabled: e.target.checked } }))}/></label></div><div className="mt-4 rounded-xl border border-dashed border-[var(--ink)]/10 bg-[var(--paper)] px-3.5 py-3 text-xs leading-5 text-[var(--ink)]/55">Messages are queued internally first. No SMS or WhatsApp message is sent while no provider is connected.</div></div>)}</div>
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-4"><ShieldCheck className="mt-0.5 shrink-0 text-[var(--gold)]" size={18}/><p className="text-xs leading-5 text-[var(--ink)]/60"><strong className="text-[var(--ink)]">Security:</strong> provider API keys and secrets are deliberately not stored in school settings or the browser. When a provider is selected later, credentials should live in server-side/Edge Function secrets.</p></div>
    </section>

    <div className="flex flex-wrap items-center gap-3"><button disabled={busy || loading} onClick={() => void save()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--ink)] px-5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Save settings"}</button><span className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)]/55"><ShieldCheck size={15} className="text-[var(--gold)]"/>Administrator-only configuration</span></div>
    <section className="rounded-[1.75rem] border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-5 sm:p-7"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 text-[var(--gold)]" size={20}/><div><h2 className="font-bold">Configuration principle</h2><p className="mt-1 text-sm leading-6 text-[var(--ink)]/60">No fake school details or provider credentials are generated. Empty values remain empty until an administrator enters real information.</p></div></div></section>
  </main></PortalLayout>;
}
