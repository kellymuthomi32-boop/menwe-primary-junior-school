import { useEffect, useState } from "react";
import { BarChart3, Check, Cookie, LockKeyhole, Settings2, X } from "lucide-react";
import { Link } from "wouter";

const STORAGE_KEY = "menwe-cookie-preferences";
type Preferences = { analytics: boolean };

function readPreferences(): Preferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Preferences;
    return { analytics: parsed.analytics === true };
  } catch {
    return null;
  }
}

function savePreferences(preferences: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Consent should still close if browser storage is unavailable.
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const preferences = readPreferences();
    if (preferences) {
      setAnalytics(preferences.analytics);
      return;
    }
    setVisible(true);
  }, []);

  const choose = (value: boolean) => {
    const preferences = { analytics: value };
    setAnalytics(value);
    savePreferences(preferences);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] px-3 pb-3 sm:px-5 sm:pb-5" role="dialog" aria-modal="false" aria-label="Cookie preferences" aria-describedby="cookie-consent-description">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.5rem] border border-[#14752f]/15 bg-white shadow-[0_24px_70px_rgba(29,43,37,.20)] ring-1 ring-[#D89B28]/15 dark:border-slate-700 dark:bg-slate-950">
        <div className="h-1.5 bg-gradient-to-r from-[#14752f] via-[#D89B28] to-[#14752f]" />
        <div className="p-5 sm:p-6 lg:p-7">
          <div className="flex items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#14752f]/10 text-[#14752f] sm:grid">
              <Cookie size={23} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#14752f]">Menwe privacy centre</p>
                  <h2 className="mt-1 font-serif text-xl font-semibold text-[#061229] dark:text-white sm:text-2xl">You’re in control of your privacy</h2>
                </div>
                <button type="button" onClick={() => choose(false)} aria-label="Reject optional analytics and close" className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-[#061229] dark:hover:bg-slate-800 dark:hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <p id="cookie-consent-description" className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                We use essential browser storage to keep the website and secure portal working. Optional analytics help us understand broad website usage. We do not use advertising cookies or sell visitor information.
              </p>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-[#14752f]/10 bg-[#14752f]/[0.035] px-3.5 py-3">
                  <LockKeyhole size={17} className="shrink-0 text-[#14752f]" />
                  <div><p className="text-xs font-extrabold text-[#061229] dark:text-white">Essential</p><p className="text-[11px] text-slate-500 dark:text-slate-400">Always active for security and portal functions</p></div>
                  <Check size={15} className="ml-auto shrink-0 text-[#14752f]" />
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-[#D89B28]/20 bg-[#D89B28]/[0.05] px-3.5 py-3">
                  <BarChart3 size={17} className="shrink-0 text-[#D89B28]" />
                  <div><p className="text-xs font-extrabold text-[#061229] dark:text-white">Optional analytics</p><p className="text-[11px] text-slate-500 dark:text-slate-400">Off until you choose to enable it</p></div>
                  <button type="button" onClick={() => setAnalytics(value => !value)} aria-label="Toggle optional analytics" aria-pressed={analytics} className={`ml-auto shrink-0 rounded-full px-3 py-1.5 text-[10px] font-extrabold transition ${analytics ? "bg-[#14752f] text-white" : "bg-slate-200 text-[#061229] dark:bg-slate-700 dark:text-white"}`}>{analytics ? "ON" : "OFF"}</button>
                </div>
              </div>

              {settings && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#14752f]">Preference details</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">Essential storage cannot be disabled because it supports authentication, security and core website functionality. Optional analytics can be changed at any time from the Cookies page.</p>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link href="/cookies" className="text-xs font-bold text-[#14752f] underline-offset-4 transition hover:text-[#D89B28] hover:underline">Read our Cookies Policy</Link>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button type="button" onClick={() => setSettings(value => !value)} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-xs font-bold text-[#061229] transition hover:border-[#14752f]/40 hover:bg-[#14752f]/5 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"><Settings2 size={15} /> {settings ? "Hide details" : "Manage preferences"}</button>
                  <button type="button" onClick={() => choose(false)} className="rounded-full border border-[#14752f]/35 px-4 py-2.5 text-xs font-extrabold text-[#14752f] transition hover:bg-[#14752f]/5">Reject optional</button>
                  <button type="button" onClick={() => choose(analytics)} className="rounded-full bg-[#14752f] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0f6428] hover:shadow-md">Save my choices</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
