import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";

export default function FirstAdminPage() {
  const [, setLocation] = useLocation();
  const { signIn } = useSchoolAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [bootstrapCode, setBootstrapCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFailure(null);
    setMessage(null);
    if (password !== confirmPassword) return setFailure("The passwords do not match.");
    if (password.length < 12) return setFailure("Use a password with at least 12 characters.");
    setBusy(true);
    try {
      const { data, error } = await getSupabase().functions.invoke("first-admin-bootstrap", { body: { displayName, email, password, bootstrapCode } });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      const signInResult = await signIn(email.trim(), password);
      if (signInResult.error) { setMessage("Your administrator account was created. Sign in with the same email and password to continue."); return; }
      setMessage("Administrator account created. Opening secure school setup…");
      setTimeout(() => setLocation("/portal/setup"), 900);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "The administrator account could not be created.");
    } finally { setBusy(false); }
  };

  return <PublicLayout><section className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-[.85fr_1.15fr] lg:px-8"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--accent)]">One-time school onboarding</p><h1 className="mt-4 max-w-lg font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Create the first real school administrator.</h1><p className="mt-6 max-w-lg text-base leading-7 text-[var(--ink)]/65">This one-time path is available only while the production school has no administrator. It requires the private setup code issued to the school owner and does not rely on email delivery.</p><div className="mt-8 rounded-3xl border border-[var(--ink)]/10 bg-white/70 p-5 text-sm leading-6 text-[var(--ink)]/65"><ShieldCheck className="mb-3 text-[var(--accent)]" size={22} /><p>Use your real name and real school email. The account becomes the initial approved administrator, then this setup path locks automatically.</p></div></div><form onSubmit={submit} className="mx-auto w-full max-w-xl rounded-[2rem] bg-white p-7 shadow-[0_18px_45px_rgba(29,43,37,.12)] sm:p-9"><h2 className="font-serif text-3xl font-semibold">Initial administrator</h2><p className="mt-2 text-sm leading-6 text-[var(--ink)]/60">Complete this once using the private setup code.</p><div className="mt-7 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold sm:col-span-2">Real name<input required value={displayName} onChange={event => setDisplayName(event.target.value)} className="rounded-xl border border-[var(--ink)]/15 px-3 py-3 font-normal outline-none ring-[var(--accent)] focus:ring-2" /></label><label className="grid gap-2 text-sm font-semibold sm:col-span-2">Email<input required type="email" value={email} onChange={event => setEmail(event.target.value)} className="rounded-xl border border-[var(--ink)]/15 px-3 py-3 font-normal outline-none ring-[var(--accent)] focus:ring-2" /></label><label className="grid gap-2 text-sm font-semibold">Password<input required type="password" minLength={12} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="rounded-xl border border-[var(--ink)]/15 px-3 py-3 font-normal outline-none ring-[var(--accent)] focus:ring-2" /></label><label className="grid gap-2 text-sm font-semibold">Confirm password<input required type="password" minLength={12} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="rounded-xl border border-[var(--ink)]/15 px-3 py-3 font-normal outline-none ring-[var(--accent)] focus:ring-2" /></label><label className="grid gap-2 text-sm font-semibold sm:col-span-2">Private one-time setup code<input required type="password" autoComplete="off" value={bootstrapCode} onChange={event => setBootstrapCode(event.target.value)} className="rounded-xl border border-[var(--ink)]/15 px-3 py-3 font-normal outline-none ring-[var(--accent)] focus:ring-2" /></label></div>{failure && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{failure}</p>}{message && <p className="mt-4 rounded-xl bg-[var(--sage)]/15 px-4 py-3 text-sm leading-6 text-[var(--accent)]"><CheckCircle2 className="mr-2 inline" size={16} />{message}</p>}<button disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-60">{busy && <Loader2 className="animate-spin" size={16} />}Create first administrator</button></form></section></PublicLayout>;
}
