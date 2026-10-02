import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getSupabase } from "@/lib/supabase";

const MIN_PASSWORD_LENGTH = 8;

export default function PasswordSetupPage() {
  const [, setLocation] = useLocation();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    const client = getSupabase();
    let subscription: { unsubscribe: () => void } | null = null;

    const restoreAuthLink = async () => {
      try {
        // Invitation/recovery emails can arrive as either a PKCE ?code= link
        // or a Supabase access-token hash. Handle both before checking the
        // session so the password page never mistakes a valid link for logout.
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const authError = url.searchParams.get("error_description") || url.searchParams.get("error");
        if (authError) {
          setError(decodeURIComponent(authError.replace(/\\+/g, " ")));
        }
        if (code) {
          const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (exchangeError && active) setError(exchangeError.message);
          url.searchParams.delete("code");
          url.searchParams.delete("error");
          url.searchParams.delete("error_description");
          window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : "") + url.hash);
        }

        subscription = client.auth.onAuthStateChange((_event, session) => {
          if (!active) return;
          setHasSession(Boolean(session));
          setReady(true);
        }).data.subscription;

        const { data, error: sessionError } = await client.auth.getSession();
        if (!active) return;
        if (sessionError) setError(sessionError.message);
        setHasSession(Boolean(data.session));
        setReady(true);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "We could not open this secure setup link.");
        setHasSession(false);
        setReady(true);
      }
    };

    void restoreAuthLink();
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
      return;
    }

    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await getSupabase().auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);
    // Keep the authenticated session; the auth provider will load the school
    // profile and route the teacher/admin to the correct workspace.
    window.setTimeout(() => setLocation("/portal"), 700);
  }

  return (
    <PublicLayout>
      <main className="mx-auto flex min-h-[calc(100vh-180px)] max-w-6xl items-center justify-center px-5 py-16 lg:px-8">
        <section className="w-full max-w-xl rounded-[2rem] border border-[var(--ink)]/10 bg-white p-7 shadow-xl shadow-[var(--ink)]/8 sm:p-10">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gold)]/25 text-[var(--ink)]">
            <KeyRound size={24} aria-hidden="true" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--accent)]">Portal setup</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[var(--ink)]">Create your password</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--ink)]/65">
            Finish setting up your Menwe portal account. Your invitation link establishes your secure session; this page lets you choose the password you will use for future sign-ins.
          </p>

          {!ready ? (
            <div className="mt-10 flex items-center gap-3 rounded-2xl bg-[var(--mist)] p-5 text-sm text-[var(--ink)]/65">
              <Loader2 className="animate-spin" size={18} aria-hidden="true" /> Checking your secure invitation session…
            </div>
          ) : !hasSession ? (
            <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              <p className="font-semibold">This setup link is no longer active.</p>
              <p className="mt-1">Open the invitation email again or return to the portal login page to request another sign-in link.</p>
              <button type="button" onClick={() => setLocation("/portal/login")} className="mt-4 rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-white">
                Go to portal login
              </button>
            </div>
          ) : success ? (
            <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
              <div className="flex items-center gap-3 font-semibold"><CheckCircle2 size={20} /> Password saved successfully.</div>
              <p className="mt-2">Taking you to your Menwe portal…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--ink)]">New password</span>
                <span className="relative block">
                  <input
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-[var(--ink)]/15 bg-[var(--mist)] px-4 py-3.5 pr-12 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                    placeholder="At least 8 characters"
                  />
                  <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[var(--ink)]/50" aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--ink)]">Confirm password</span>
                <span className="relative block">
                  <input
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    type={showConfirmation ? "text" : "password"}
                    value={confirmation}
                    onChange={event => setConfirmation(event.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-[var(--ink)]/15 bg-[var(--mist)] px-4 py-3.5 pr-12 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                    placeholder="Enter the password again"
                  />
                  <button type="button" onClick={() => setShowConfirmation(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[var(--ink)]/50" aria-label={showConfirmation ? "Hide confirmation" : "Show confirmation"}>
                    {showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>

              {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">{error}</p>}

              <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
                {saving && <Loader2 className="animate-spin" size={17} />}
                {saving ? "Saving password…" : "Save password & continue"}
              </button>
            </form>
          )}
        </section>
      </main>
    </PublicLayout>
  );
}
