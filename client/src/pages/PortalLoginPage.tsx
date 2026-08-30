import type { FormEvent } from "react";
import { useState } from "react";
import { AlertCircle, Eye, EyeOff, HelpCircle, KeyRound, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { useLocation } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { requireSupabaseClient } from "@/lib/supabaseClient";

export default function PortalLoginPage() {
  const [, go] = useLocation();
  const auth = useSchoolAuth();
  const [tab, setTab] = useState<"family" | "staff">("family");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const friendlyError = (error: unknown) => {
    const text = error instanceof Error ? error.message : String(error);
    if (/invalid login credentials/i.test(text)) return "The email or password is incorrect. Please check your details and try again.";
    if (/email not confirmed/i.test(text)) return "Your school account email has not been confirmed yet. Contact the ICT desk for help.";
    if (/fetch|network|timeout|failed to/i.test(text)) return "We could not reach the school portal. Check your connection and try again.";
    return text || "We could not sign you in. Please contact the school office at 0142550882.";
  };

  const resolveIdentifier = async (value: string) => {
    const client = requireSupabaseClient();
    if (value.includes("@")) return value.trim().toLowerCase();
    if (tab === "family") {
      const { data, error } = await client.from("students").select("parent_email,student_user_id").eq("admission_number", value.trim()).maybeSingle();
      if (error) throw new Error("Admission-number lookup is not available to this public session. Sign in with the registered email address or ask the ICT desk to activate the account.");
      const email = data?.parent_email;
      if (!email) throw new Error("No parent email is registered against that admission number. Please contact the school office.");
      return email.toLowerCase();
    }
    const { data, error } = await client.from("staff_members").select("email").eq("source_id", value.trim()).maybeSingle();
    if (error) throw new Error("Staff-ID lookup is protected. Please use the registered staff email or contact the ICT desk.");
    if (!data?.email) throw new Error("No staff email is registered against that Staff ID. Please contact the ICT desk.");
    return data.email.toLowerCase();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (!identifier.trim() || !password) return;
    setBusy(true);
    try {
      const email = await resolveIdentifier(identifier);
      const result = await auth.signIn(email, password);
      if (result.error) setMessage(friendlyError(result.error));
      else go("/portal");
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  const requestReset = async () => {
    setMessage("");
    setResetSent(false);
    if (!identifier.includes("@")) {
      setMessage("Enter the registered school email address to request password recovery.");
      return;
    }
    setBusy(true);
    try {
      const result = await auth.sendPasswordReset(identifier.trim().toLowerCase());
      if (result.error) setMessage(friendlyError(result.error));
      else setResetSent(true);
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicLayout>
      <section className="bg-[#F8F9FA]">
        <div className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-6xl items-center gap-8 px-5 py-16 lg:grid-cols-[1fr_.8fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.22em] text-[#D89B28]">Menwe secure portal</p>
            <h1 className="mt-4 font-serif text-5xl font-semibold leading-tight text-[#061229] sm:text-6xl">Your school information, securely connected.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">Use the account issued by Menwe Primary & Junior School. Parents, students and staff receive access according to their authorised school role.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[{ icon: ShieldCheck, text: "Role-aware access" }, { icon: LockKeyhole, text: "Protected records" }, { icon: UserRound, text: "School accounts" }].map(({ icon: Icon, text }) => <div key={text} className="rounded-xl bg-white p-4 shadow-sm"><Icon className="text-[#D89B28]" size={20} /><p className="mt-3 text-xs font-bold text-[#061229]">{text}</p></div>)}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="grid grid-cols-2 rounded-xl bg-[#F8F9FA] p-1">
              <button type="button" onClick={() => { setTab("family"); setIdentifier(""); setMessage(""); }} className={`rounded-lg px-3 py-3 text-xs font-bold ${tab === "family" ? "bg-white text-[#061229] shadow-sm" : "text-slate-500"}`}>Parent / Student</button>
              <button type="button" onClick={() => { setTab("staff"); setIdentifier(""); setMessage(""); }} className={`rounded-lg px-3 py-3 text-xs font-bold ${tab === "staff" ? "bg-white text-[#061229] shadow-sm" : "text-slate-500"}`}>Staff / Teacher</button>
            </div>
            <form onSubmit={submit} className="mt-7">
              <label className="text-sm font-bold text-[#061229] dark:text-white">{tab === "family" ? "Admission Number / UPI / Email" : "Staff ID / Email"}
                <input required value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={tab === "family" ? "Admission number, UPI or registered email" : "Staff ID or registered email"} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#D89B28]" />
              </label>
              <p className="mt-2 text-xs leading-5 text-slate-500">For UPI-only accounts, contact the ICT desk so the UPI can be linked to the authorised login identity.</p>
              <label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">Password
                <div className="relative mt-2"><input required type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-[#D89B28]" /><button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              </label>
              <div className="mt-5 flex items-center justify-between gap-4"><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="h-4 w-4 accent-[#D89B28]" /> Remember Me</label><button type="button" onClick={() => setForgot(true)} className="text-xs font-bold text-[#D89B28] hover:underline">Forgot Password?</button></div>
              {message && <div role="alert" className="mt-5 flex gap-2 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700"><AlertCircle className="mt-0.5 shrink-0" size={16} />{message}</div>}
              <button disabled={busy} className="mt-6 w-full rounded-xl bg-[#061229] px-5 py-3.5 text-sm font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-60">{busy ? "Connecting securely…" : "Sign in securely"}</button>
            </form>
            <div className="mt-6 rounded-xl bg-[#F8F9FA] p-4 text-xs leading-5 text-slate-600"><div className="flex gap-2"><HelpCircle size={16} className="shrink-0 text-[#D89B28]" /><p><strong className="text-[#061229]">Having trouble logging in?</strong> Contact the admin office at 0142550882 or visit the ICT desk.</p></div></div>
          </div>
        </div>
      </section>
      {forgot && <div className="fixed inset-0 z-50 grid place-items-center bg-[#061229]/60 p-5" role="dialog" aria-modal="true" aria-labelledby="reset-title"><div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D89B28]/10 text-[#D89B28]"><KeyRound size={22} /></div><h2 id="reset-title" className="mt-5 font-serif text-3xl font-semibold text-[#061229]">Reset your password</h2><p className="mt-3 text-sm leading-6 text-slate-600">Enter the registered school email on the login form, then send a secure Supabase recovery email.</p>{resetSent && <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-700">If that email belongs to a school account, a password-reset message has been requested. Check the inbox and follow the secure link.</div>}{message && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-700">{message}</div>}<div className="mt-6 flex gap-3"><button onClick={() => { setForgot(false); setMessage(""); }} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-[#061229]">Close</button><button disabled={busy} onClick={requestReset} className="flex-1 rounded-xl bg-[#061229] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60">{busy ? "Sending…" : "Send reset email"}</button></div></div></div>}
    </PublicLayout>
  );
}
