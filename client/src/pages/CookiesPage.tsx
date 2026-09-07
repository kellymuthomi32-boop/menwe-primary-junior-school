import { useEffect, useState } from "react";
import { BarChart3, Check, Cookie, LockKeyhole, Settings2, Loader2, ShieldCheck } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { supabaseClient } from "@/lib/supabaseClient";

const STORAGE_KEY = "menwe-cookie-preferences";
type Preferences = { analytics: boolean };
const card = "rounded-2xl border border-[#14752f]/10 bg-white p-7 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900";

export default function CookiesPage() {
  const [analytics, setAnalytics] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAnalytics(Boolean((JSON.parse(raw) as Preferences).analytics));
    } catch { /* ignore malformed browser storage */ }
    void (async () => {
      if (!supabaseClient) return;
      const { data } = await supabaseClient.auth.getSession();
      const value = data.session?.user.user_metadata?.cookie_preferences as Preferences | undefined;
      if (value) setAnalytics(Boolean(value.analytics));
    })();
  }, []);

  const save = async (value: boolean) => {
    setAnalytics(value);
    setSaved(false);
    const prefs = { analytics: value };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* browser storage may be unavailable */ }
    if (supabaseClient) {
      setSaving(true);
      const { data } = await supabaseClient.auth.getSession();
      if (data.session?.user) await supabaseClient.auth.updateUser({ data: { cookie_preferences: prefs } });
      setSaving(false);
    }
    setSaved(true);
  };

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-[var(--ink)] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(216,155,40,.18),transparent_34%),radial-gradient(circle_at_15%_80%,rgba(20,117,47,.35),transparent_36%)]" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D89B28]/30 bg-[#D89B28]/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#D89B28]"><Cookie size={14} /> Privacy centre</div>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold leading-[1.05] sm:text-6xl">Cookies, clearly explained.</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-white/70">Menwe keeps privacy simple: essential storage supports the website and secure school portal, while optional analytics stays off unless you choose it.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          <article className={card}><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#14752f]/10 text-[#14752f]"><LockKeyhole size={21} /></div><h2 className="mt-6 font-serif text-2xl font-semibold text-[var(--ink)] dark:text-white">Essential storage</h2><p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">Used when required for authentication, secure portal sessions, security and core website functions. This cannot be switched off without affecting the service.</p><span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#14752f]/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#14752f]"><Check size={13} /> Always active</span></article>
          <article className={card}><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D89B28]/10 text-[#D89B28]"><BarChart3 size={21} /></div><h2 className="mt-6 font-serif text-2xl font-semibold text-[var(--ink)] dark:text-white">Optional analytics</h2><p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">Privacy-conscious page-view measurement helps us understand which public pages are useful and improve the website. It is not used to expose student records.</p><span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#D89B28]/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#a56f00]">Your choice</span></article>
          <article className={card}><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#14752f]/10 text-[#14752f]"><ShieldCheck size={21} /></div><h2 className="mt-6 font-serif text-2xl font-semibold text-[var(--ink)] dark:text-white">No advertising tracking</h2><p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">Menwe does not add advertising cookies to follow visitors around the web, and the consent system does not sell visitor information.</p><span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#14752f]/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#14752f]"><Check size={13} /> None used</span></article>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-[#D89B28]/25 bg-[#D89B28]/[0.07] shadow-sm">
          <div className="h-1 bg-gradient-to-r from-[#14752f] via-[#D89B28] to-[#14752f]" />
          <div className="p-7 sm:p-8">
            <div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#14752f] text-white shadow-sm"><Settings2 size={21} /></div><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#14752f]">Manage your choice</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[var(--ink)]">Cookie preference centre</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">Essential authentication storage remains enabled. Toggle optional analytics whenever you want. Your preference is saved on this device and, when you are signed in, copied to your authorised Supabase session.</p></div></div>
            <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-[#14752f]/10 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-extrabold text-[var(--ink)]">Optional analytics</p><p className="mt-1 text-xs text-slate-500">Current preference: <span className="font-bold">{analytics ? "Enabled" : "Disabled"}</span></p></div>
              <button type="button" onClick={() => void save(!analytics)} disabled={saving} aria-pressed={analytics} className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-extrabold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${analytics ? "bg-[#14752f] text-white" : "bg-slate-200 text-[var(--ink)]"}`}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {analytics ? "Disable analytics" : "Enable analytics"}</button>
            </div>
            {saved && <p className="mt-3 text-xs font-bold text-[#14752f]">Preference saved successfully.</p>}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-[#14752f]/10 bg-[#14752f]/[0.035] p-6 text-sm leading-7 text-slate-600 dark:text-slate-300">If you clear browser storage or use a different device/browser, Menwe may ask for your preference again. Restricting essential storage can affect authentication and secure portal functionality.</div>
      </section>
    </PublicLayout>
  );
}
