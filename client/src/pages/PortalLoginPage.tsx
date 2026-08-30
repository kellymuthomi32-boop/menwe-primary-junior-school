/* Supabase SQL Editor — run once before enabling UPI login:
ALTER TABLE students ADD COLUMN IF NOT EXISTS upi_number VARCHAR(50) UNIQUE;
*/
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
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const friendlyError = (error: unknown) => {
    const text = error instanceof Error ? error.message : String(error);
    if (/invalid login credentials/i.test(text)) return "The email or password is incorrect. Please check your details and try again.";
    if (/email not confirmed/i.test(text)) return "Your school account email has not been confirmed yet. Check your inbox, confirm the account, then sign in again.";
    if (/user already registered|already been registered/i.test(text)) return "An account already exists for this email. Please sign in instead.";
    if (/fetch|network|timeout|failed to/i.test(text)) return "We could not reach the school portal. Check your connection and try again.";
    return text || "We could not complete your request. Please contact the school office at 0142550882.";
  };

  const findStudent = async (value: string) => {
    const normalized = value.trim();
    if (!normalized) return null;
    const client = requireSupabaseClient();
    const { data, error } = await client.from("students").select("id,parent_email,admission_number,upi_number").or(`admission_number.eq.${normalized},upi_number.eq.${normalized}`).limit(1).maybeSingle();
    if (error) throw new Error("Learner verification is unavailable right now. Please contact school ICT or administration.");
    return data;
  };

  const resolveIdentifier = async (value: string) => {
    const normalized = value.trim();
    if (normalized.includes("@")) return normalized.toLowerCase();
    if (tab === "family") {
      const data = await findStudent(normalized);
      if (!data?.parent_email) throw new Error("No parent email is registered against that admission number or UPI. Please contact the school office.");
      return data.parent_email.toLowerCase();
    }
    const client = requireSupabaseClient();
    const { data, error } = await client.from("staff_members").select("email").eq("source_id", normalized).maybeSingle();
    if (error) throw new Error("Staff-ID lookup is protected. Please use the registered staff email or contact the ICT desk.");
    if (!data?.email) throw new Error("No staff email is registered against that Staff ID. Please use the official registered email or contact the ICT desk.");
    return data.email.toLowerCase();
  };

  const submitSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (!identifier.trim() || !password) { setMessage("Enter your identifier and password to continue."); return; }
    setBusy(true);
    try {
      const resolvedEmail = await resolveIdentifier(identifier);
      const result = await auth.signIn(resolvedEmail, password);
      if (result.error) setMessage(friendlyError(result.error));
      else go(tab === "staff" ? "/portal/admin" : "/portal/dashboard");
    } catch (error) { setMessage(friendlyError(error)); }
    finally { setBusy(false); }
  };

  const submitRegistration = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    if (tab === "staff") {
      const normalizedName = fullName.trim();
      const normalizedStaffId = staffId.trim();
      if (!normalizedName || !normalizedStaffId || !normalizedEmail || !password || !confirmPassword) { setMessage("Complete your full name, Staff ID / TSC Number, official email and password fields to continue."); return; }
      if (password.length < 6) { setMessage("Password must contain at least 6 characters."); return; }
      if (password !== confirmPassword) { setMessage("Passwords do not match."); return; }
      setBusy(true);
      try {
        const client = requireSupabaseClient();
        const { data, error } = await client.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              role: "staff",
              full_name: normalizedName,
              staff_id: normalizedStaffId,
            },
            emailRedirectTo: `${window.location.origin}/portal/admin`,
          },
        });
        if (error) { setMessage(friendlyError(error)); return; }
        if (data.session) {
          await auth.refreshProfile();
          go("/portal/admin");
          return;
        }
        const login = await auth.signIn(normalizedEmail, password);
        if (!login.error) {
          await auth.refreshProfile();
          go("/portal/admin");
          return;
        }
        if (/email not confirmed/i.test(login.error)) {
          setMessage("Your staff account was created with the staff role and metadata, but Supabase requires email confirmation before the first sign-in. Confirm the official email, then sign in here.");
        } else {
          setMessage(friendlyError(login.error));
        }
      } catch (error) { setMessage(friendlyError(error)); }
      finally { setBusy(false); }
      return;
    }

    const lookup = identifier.trim();
    if (!lookup || !normalizedEmail || !password || !confirmPassword) { setMessage("Complete all registration fields to continue."); return; }
    if (password.length < 6) { setMessage("Password must contain at least 6 characters."); return; }
    if (password !== confirmPassword) { setMessage("Passwords do not match."); return; }
    setBusy(true);
    try {
      const student = await findStudent(lookup);
      if (!student) { setMessage("Learner record not found. Please contact school ICT or administration."); return; }
      const client = requireSupabaseClient();
      const { data, error } = await client.auth.signUp({ email: normalizedEmail, password, options: { data: { student_id: student.id, account_type: "parent_student" } } });
      if (error) { setMessage(friendlyError(error)); return; }
      if (data.session) { go("/portal/dashboard"); return; }
      const login = await auth.signIn(normalizedEmail, password);
      if (login.error) {
        setMessage("Your account was created, but the portal requires email confirmation before the first sign-in. Check your email, confirm the account, then sign in.");
      } else {
        go("/portal/dashboard");
      }
    } catch (error) { setMessage(friendlyError(error)); }
    finally { setBusy(false); }
  };

  const requestReset = async () => {
    setMessage(""); setResetSent(false);
    if (!identifier.includes("@")) { setMessage("Enter the registered school email address to request password recovery."); return; }
    setBusy(true);
    try { const result = await auth.sendPasswordReset(identifier.trim().toLowerCase()); if (result.error) setMessage(friendlyError(result.error)); else setResetSent(true); }
    catch (error) { setMessage(friendlyError(error)); }
    finally { setBusy(false); }
  };

  const switchMode = (next: "signin" | "register") => { setMode(next); setMessage(""); setPassword(""); setConfirmPassword(""); setEmail(""); setFullName(""); setStaffId(""); };
  const switchTab = (next: "family" | "staff") => { setTab(next); switchMode("signin"); setIdentifier(""); };
  const features = [{ icon: ShieldCheck, text: "Role-aware access" }, { icon: LockKeyhole, text: "Protected records" }, { icon: UserRound, text: "School accounts" }];

  return <PublicLayout><section className="bg-[#F8F9FA]"><div className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-6xl items-center gap-8 px-5 py-16 lg:grid-cols-[1fr_.8fr] lg:px-8"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-[#D89B28]">Menwe secure portal</p><h1 className="mt-4 font-serif text-5xl font-semibold leading-tight text-[#061229] sm:text-6xl">Your school information, securely connected.</h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-600">Parents, students and staff receive access according to their authorised school role.</p><div className="mt-8 grid gap-3 sm:grid-cols-3">{features.map(({ icon: Icon, text })=><div key={text} className="rounded-xl bg-white p-4 shadow-sm"><Icon className="text-[#D89B28]" size={20}/><p className="mt-3 text-xs font-bold text-[#061229]">{text}</p></div>)}</div></div><div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-8"><div className="grid grid-cols-2 rounded-xl bg-[#F8F9FA] p-1"><button type="button" onClick={()=>switchTab("family")} className={`min-h-12 rounded-lg px-3 py-3 text-xs font-bold ${tab==="family"?"bg-white text-[#061229] shadow-sm":"text-slate-500"}`}>Parent / Student</button><button type="button" onClick={()=>switchTab("staff")} className={`min-h-12 rounded-lg px-3 py-3 text-xs font-bold ${tab==="staff"?"bg-white text-[#061229] shadow-sm":"text-slate-500"}`}>Staff / Teacher</button></div>
      {mode === "signin" ? <form onSubmit={submitSignIn} className="mt-7"><label className="text-sm font-bold text-[#061229] dark:text-white">{tab==="family"?"Admission Number / UPI / Email":"Staff ID / Email"}<input required value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={tab==="family"?"Admission number, UPI or registered email":"Staff ID or official registered email"} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#D89B28]"/></label><label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">Password<div className="relative mt-2"><input required type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-base outline-none focus:ring-2 focus:ring-[#D89B28]"/><button type="button" aria-label={show?"Hide password":"Show password"} onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label><div className="mt-5 flex items-center justify-between gap-4"><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="h-4 w-4 accent-[#D89B28]"/> Remember Me</label><button type="button" onClick={()=>setForgot(true)} className="min-h-12 text-xs font-bold text-[#D89B28] hover:underline">Forgot Password?</button></div>{message&&<div role="alert" className="mt-5 flex gap-2 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700"><AlertCircle className="mt-0.5 shrink-0" size={16}/>{message}</div>}<button disabled={busy} className="mt-6 min-h-12 w-full rounded-xl bg-[#061229] px-5 py-3.5 text-base font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-60">{busy?"Connecting securely…":"Sign in securely"}</button>{tab==="family"&&<p className="mt-5 text-center text-sm text-slate-500">Don't have an account yet? <button type="button" onClick={()=>switchMode("register")} className="min-h-12 px-1 font-bold text-[#D89B28] hover:underline">Register here</button></p>}{tab==="staff"&&<p className="mt-5 text-center text-sm text-slate-500">New teacher or staff member? <button type="button" onClick={()=>switchMode("register")} className="min-h-12 px-1 font-bold text-[#D89B28] hover:underline">Create an account here</button></p>}</form> : <form onSubmit={submitRegistration} className="mt-7">{tab==="staff" ? <><div className="mb-6"><h2 className="text-2xl font-bold text-[#061229] dark:text-white">Staff Registration</h2><p className="mt-2 text-sm leading-6 text-slate-500">Create your Menwe teacher / staff portal account using your official details.</p></div><label className="text-sm font-bold text-[#061229] dark:text-white">Full Name<input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Teacher full name" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#D89B28]"/></label><label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">Staff ID / TSC Number<input required value={staffId} onChange={e=>setStaffId(e.target.value)} placeholder="TSC-123456" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#D89B28]"/></label><label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">Official Email Address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="teacher@menweprimaryschool.ac.ke" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#D89B28]"/></label><label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">Password<input required minLength={6} type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#D89B28]"/></label><label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">Confirm Password<input required minLength={6} type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Repeat your password" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#D89B28]"/></label>{message&&<div role="alert" className="mt-5 flex gap-2 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700"><AlertCircle className="mt-0.5 shrink-0" size={16}/>{message}</div>}<button disabled={busy} className="mt-6 min-h-12 w-full rounded-xl bg-[#061229] px-5 py-3.5 text-base font-extrabold text-white transition active:scale-[.98] disabled:opacity-60">{busy?"Creating staff account…":"Create staff account"}</button><p className="mt-5 text-center text-sm text-slate-500">Already have a staff account? <button type="button" onClick={()=>switchMode("signin")} className="min-h-12 px-1 font-bold text-[#D89B28] hover:underline">Sign in here</button></p></> : <><div className="mb-6"><h2 className="text-2xl font-bold text-[#061229] dark:text-white">Parent & Student Registration</h2><p className="mt-2 text-sm leading-6 text-slate-500">Create a portal account by verifying a learner record already held by Menwe.</p></div><label className="text-sm font-bold text-[#061229] dark:text-white">Learner Admission No. or UPI Number<input required value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="Admission number or UPI" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#D89B28]"/></label><label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">Parent / Guardian Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="parent@example.com" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#D89B28]"/></label><label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">Password<input required minLength={6} type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#D89B28]"/></label><label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">Confirm Password<input required minLength={6} type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Repeat your password" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#D89B28]"/></label>{message&&<div role="alert" className="mt-5 flex gap-2 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700"><AlertCircle className="mt-0.5 shrink-0" size={16}/>{message}</div>}<button disabled={busy} className="mt-6 min-h-12 w-full rounded-xl bg-[#061229] px-5 py-3.5 text-base font-extrabold text-white transition active:scale-[.98] disabled:opacity-60">{busy?"Verifying learner…":"Create account"}</button><p className="mt-5 text-center text-sm text-slate-500">Already registered? <button type="button" onClick={()=>switchMode("signin")} className="min-h-12 px-1 font-bold text-[#D89B28] hover:underline">Sign in here</button></p></>}</form>}
      <div className="mt-6 rounded-xl bg-[#F8F9FA] p-4 text-xs leading-5 text-slate-600"><div className="flex gap-2"><HelpCircle size={16} className="shrink-0 text-[#D89B28]"/><p><strong className="text-[#061229]">Having trouble?</strong> Contact the admin office at 0142550882 or visit the ICT desk.</p></div></div></div></div></section>{forgot&&<div className="fixed inset-0 z-50 grid place-items-center bg-[#061229]/60 p-5" role="dialog" aria-modal="true" aria-labelledby="reset-title"><div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D89B28]/10 text-[#D89B28]"><KeyRound size={22}/></div><h2 id="reset-title" className="mt-5 font-serif text-3xl font-semibold text-[#061229]">Reset your password</h2><p className="mt-3 text-sm leading-6 text-slate-600">Enter the registered school email on the login form, then send a secure Supabase recovery email.</p>{resetSent&&<div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-700">If that email belongs to a school account, a password-reset message has been requested. Check the inbox and follow the secure link.</div>}{message&&<div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-700">{message}</div>}<div className="mt-6 flex gap-3"><button onClick={()=>{setForgot(false);setMessage("");}} className="flex-1 min-h-12 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-[#061229]">Close</button><button disabled={busy} onClick={requestReset} className="flex-1 min-h-12 rounded-xl bg-[#061229] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60">{busy?"Sending…":"Send reset email"}</button></div></div></div>}</PublicLayout>;
}