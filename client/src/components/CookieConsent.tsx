import { useEffect, useState } from "react";
import { Cookie, Settings2, X } from "lucide-react";
import { Link } from "wouter";

const STORAGE_KEY = "menwe-cookie-preferences";

type Preferences = { analytics: boolean };

function readPreferences(): Preferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Preferences;
    return { analytics: Boolean(parsed.analytics) };
  } catch {
    return null;
  }
}

function savePreferences(preferences: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Continue even if browser storage is unavailable.
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
    setAnalytics(value);
    savePreferences({ analytics: value });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[120] sm:inset-x-5 lg:inset-x-8" role="dialog" aria-label="Cookie preferences" aria-describedby="cookie-consent-description">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-[#D89B28]/30 bg-white shadow-2xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-start gap-4 p-5 sm:p-6">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#14752f]/10 text-[#14752f] sm:flex">
            <Cookie size={22} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#14752f]">Your privacy matters</p>
                <h2 className="mt-1 text-lg font-bold text-[#061229] dark:text-white">Cookies & privacy choices</h2>
              </div>
              <button type="button" onClick={() => choose(false)} aria-label="Close cookie notice and reject optional cookies" className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#061229] dark:hover:bg-slate-800 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p id="cookie-consent-description" className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Menwe uses essential browser storage to keep the website and secure portal working. Optional analytics help us understand website usage. We do not use advertising cookies to track you around the web.
            </p>

            {settings && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#061229] dark:text-white">Optional analytics</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Used for privacy-conscious page-view measurement. Off by default.</p>
                  </div>
                  <button type="button" onClick={() => setAnalytics((value) => !value)} aria-pressed={analytics} className={`rounded-full px-4 py-2 text-xs font-extrabold transition ${analytics ? "bg-[#14752f] text-white" : "bg-slate-200 text-[#061229] dark:bg-slate-700 dark:text-white"}`}>
                    {analytics ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/cookies" className="text-xs font-bold text-[#14752f] underline-offset-4 hover:underline">Learn more about cookies</Link>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setSettings((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-xs font-bold text-[#061229] transition hover:bg-slate-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800">
                  <Settings2 size={15} /> {settings ? "Hide settings" : "Cookie settings"}
                </button>
                <button type="button" onClick={() => choose(false)} className="rounded-full border border-[#14752f] px-4 py-2.5 text-xs font-extrabold text-[#14752f] transition hover:bg-[#14752f]/5">Reject optional</button>
                {settings ? (
                  <button type="button" onClick={() => choose(analytics)} className="rounded-full bg-[#14752f] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">Save choices</button>
                ) : (
                  <button type="button" onClick={() => choose(true)} className="rounded-full bg-[#14752f] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">Accept analytics</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
