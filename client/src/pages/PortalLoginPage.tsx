import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, HelpCircle, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { getPortalRedirect, useSchoolAuth } from "@/contexts/SupabaseAuthContext";

export default function PortalLoginPage() {
  const [, go] = useLocation();
  const auth = useSchoolAuth();
  const [tab, setTab] = useState<"family" | "staff">("family");
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [magicLinkMode, setMagicLinkMode] = useState(false);
  const [redirected, setRedirected] = useState(false);

  // Authenticated users are never required to have a readable profiles row just to leave login.
  useEffect(() => {
    if (redirected || auth.loading || !auth.user) return;
    setRedirected(true);
    // Keep users in the neutral portal shell until the canonical profile is ready.
    go(auth.profile ? getPortalRedirect(auth.profile, auth.user) : "/portal");
  }, [auth.loading, auth.user, auth.profile, redirected, go]);

  const clearFeedback = () => { setMessage(""); setSuccess(""); };

  const friendlyError = (error: unknown) => {
    const text = typeof error === "string" ? error : error instanceof Error ? error.message : error ? JSON.stringify(error) : "Unknown error";
    if (/invalid login credentials/i.test(text)) return "Incorrect email or password.";
    if (/email not confirmed/i.test(text)) return "Please confirm your email before signing in.";
    if (/already registered|already been registered/i.test(text)) return "An account already exists with this email.";
    if (/rate limit|too many requests|network|timeout|fetch/i.test(text)) return "Network problem. Please try again.";
    return text || "Something went wrong. Contact school ICT.";
  };

  // Redirect from the authenticated Auth user first; profile hydration can finish in the background.
  const executePostLoginRedirect = async () => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) { setMessage("Unable to load your account."); return; }
      const profile = await auth.refreshProfile();
      go(profile ? getPortalRedirect(profile, user) : "/portal");
    } catch (error) {
      setMessage(friendlyError(error));
    }
  };

  const resolveEmail = async (): Promise<string> => {
    const input = identifier.trim();
    if (input.includes("@") && input.includes(".")) return input.toLowerCase();
    const { data: resolvedEmail, error } = await getSupabase().rpc("resolve_user_identifier_email", { user_identifier: input });
    if (error || !resolvedEmail) throw new Error("Invalid login credentials or unregistered identifier.");
    return resolvedEmail;
  };

  const sendMagicLink = async () => {
    clearFeedback();
    const emailAddress = identifier.trim().toLowerCase();
    if (!emailAddress.includes("@")) { setMessage("Enter your registered email address."); return; }
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.signInWithOtp({ email: emailAddress, options: { emailRedirectTo: `${window.location.origin}/portal/callback`, shouldCreateUser: false } });
      if (error) setMessage(friendlyError(error)); else setSuccess("Magic link sent. Check your email inbox.");
    } catch (error) { setMessage(friendlyError(error)); }
    finally { setBusy(false); }
  };

  const submitSignIn = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    clearFeedback();
    if (magicLinkMode) { await sendMagicLink(); return; }
    if (!identifier.trim() || !password) { setMessage("Enter your identifier and password to continue."); return; }
    setBusy(true);
    try {
      const emailAddress = await resolveEmail();
      const result = await auth.signIn(emailAddress, password);
      if (result.error) { setMessage(friendlyError(result.error)); return; }
      await executePostLoginRedirect();
    } catch (error) { setMessage(friendlyError(error)); }
    finally { setBusy(false); }
  };

  const submitRegistration = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    clearFeedback();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password || !confirmPassword) { setMessage("Complete all registration fields to continue."); return; }
    if (password.length < 6) { setMessage("Password must contain at least 6 characters."); return; }
    if (password !== confirmPassword) { setMessage("Passwords do not match."); return; }
    setBusy(true);
    try {
      const client = getSupabase();
      let metadata: Record<string, string>;
      if (tab === "staff") {
        const name = fullName.trim(), id = staffId.trim(), enteredCode = schoolCode.trim();
        if (!name || !id || !enteredCode) { setMessage("Complete your full name, Staff ID, and authorization code."); return; }
        const { data: valid, error } = await client.rpc("verify_staff_registration", { staff_id: id, authorization_code: enteredCode });
        if (error || !valid) { setMessage("Invalid Staff ID or Authorization Code. Please contact administration."); return; }
        metadata = { role: "teacher", tsc_number: id, full_name: name };
      } else {
        const lookup = identifier.trim();
        if (!lookup) { setMessage("Enter the learner admission number or UPI number."); return; }
        const { data: studentId, error } = await client.rpc("verify_learner_registration", { identifier: lookup });
        if (error || !studentId) { setMessage("Learner record not found. Please contact school ICT or administration."); return; }
        metadata = { student_id: studentId, role: "parent", account_type: "parent_student" };
      }
      const { data, error } = await client.auth.signUp({ email: normalizedEmail, password, options: { data: metadata, emailRedirectTo: `${window.location.origin}/portal/callback` } });
      if (error) { setMessage(friendlyError(error)); return; }
      if (!data.user) { setMessage("Account creation did not complete. Please try again."); return; }
      setIdentifier(normalizedEmail); setPassword(""); setConfirmPassword(""); setSchoolCode("");
      if (data.session) {
        setSuccess(tab === "staff" ? "Staff account created successfully." : "Account created successfully.");
        await executePostLoginRedirect();
      } else {
        setSuccess(tab === "staff" ? "Staff account created. Please confirm your email before signing in." : "Account created. Please confirm your email before signing in.");
        setMode("signin");
      }
    } catch (error) { setMessage(friendlyError(error)); }
    finally { setBusy(false); }
  };

  const switchTab = (next: "family" | "staff") => {
    setTab(next); setMode("signin"); setMagicLinkMode(false); setShowPassword(false); clearFeedback();
    setIdentifier(""); setEmail(""); setFullName(""); setStaffId(""); setPassword(""); setConfirmPassword(""); setSchoolCode("");
  };
  const switchMode = (next: "signin" | "register") => { setMode(next); setMagicLinkMode(false); setShowPassword(false); clearFeedback(); setPassword(""); setConfirmPassword(""); };

  const inputClass = "mt-2 w-full min-h-12 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#D89B28]";
  const alert = message && <div role="alert" className="mt-5 flex gap-2 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700"><AlertCircle className="mt-0.5 shrink-0" size={16}/>{message}</div>;
  const successBanner = success && <div role="status" className="mt-5 flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-700"><CheckCircle2 className="mt-0.5 shrink-0" size={16}/>{success}</div>;
  const features = [{ icon: ShieldCheck, text: "Role-aware access" }, { icon: LockKeyhole, text: "Protected records" }, { icon: UserRound, text: "School accounts" }];

  return <PublicLayout>
    <section className="bg-[#F8F9FA]"><div className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-6xl items-center gap-8 px-5 py-16 lg:grid-cols-[1fr_.8fr] lg:px-8">
      <div><p className="text-xs font-bold uppercase tracking-[.22em] text-[#D89B28]">Menwe secure portal</p><h1 className="mt-4 font-serif text-5xl font-semibold leading-tight text-[#061229] sm:text-6xl">Your school information, securely connected.</h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-600">Parents, students and staff receive access according to their authorised school role.</p><div className="mt-8 grid gap-3 sm:grid-cols-3">{features.map(({icon: Icon,text})=><div key={text} className="rounded-xl bg-white p-4 shadow-sm"><Icon className="text-[#D89B28]" size={20}/><p className="mt-3 text-xs font-bold text-[#061229]">{text}</p></div>)}</div></div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-8"><div className="grid grid-cols-2 rounded-xl bg-[#F8F9FA] p-1"><button type="button" onClick={()=>switchTab("family")} className={`min-h-12 rounded-lg px-3 py-3 text-xs font-bold ${tab === "family" ? "bg-white text-[#061229] shadow-sm" : "text-slate-500"}`}>Parent / Student</button><button type="button" onClick={()=>switchTab("staff")} className={`min-h-12 rounded-lg px-3 py-3 text-xs font-bold ${tab === "staff" ? "bg-white text-[#061229] shadow-sm" : "text-slate-500"}`}>Staff / Teacher</button></div>
      {successBanner}{mode === "signin" ? <form onSubmit={submitSignIn} className="mt-7"><label className="text-sm font-bold text-[#061229] dark:text-white">{tab === "family" ? "Admission Number / UPI / Email" : "Staff ID / Email"}<input required={!magicLinkMode} value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={tab === "family" ? "Admission number, UPI or registered email" : "Staff ID or official registered email"} className={inputClass}/></label>{!magicLinkMode&&<label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">Password<div className="relative mt-2"><input required type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" className="w-full min-h-12 rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-base outline-none focus:ring-2 focus:ring-[#D89B28]"/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(v=>!v)} className="absolute right-2 top-1/2 min-h-10 min-w-10 -translate-y-1/2 text-slate-500">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>}{alert}<button disabled={busy} className="mt-6 min-h-12 w-full rounded-xl bg-[#061229] px-5 py-3.5 text-base font-extrabold text-white transition active:scale-[.98] disabled:opacity-60">{busy?(magicLinkMode?"Sending magic link…":"Signing in…"):(magicLinkMode?"Send magic link":"Sign in securely")}</button>{tab === "family"&&<button type="button" onClick={()=>{clearFeedback();setMagicLinkMode(v=>!v)}} className="mt-4 min-h-12 w-full text-sm font-bold text-[#D89B28] hover:underline">{magicLinkMode?"Back to password sign in":"Sign in with Email Link (Magic Link)"}</button>}<div className="mt-3 text-center"><button type="button" onClick={()=>switchMode("register")} className="min-h-12 px-2 text-sm font-bold text-[#D89B28] hover:underline">{tab === "staff"?"New teacher or staff member? Create an account here":"Don't have an account yet? Register here"}</button></div></form> : <form onSubmit={submitRegistration} className="mt-7"><h2 className="text-2xl font-bold text-[#061229] dark:text-white">{tab === "staff"?"Staff Registration":"Parent & Student Registration"}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{tab === "staff"?"Create your Menwe teacher / staff portal account using your official details.":"Create a portal account by verifying a learner record already held by Menwe."}</p>{tab === "staff"&&<><label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">Full Name<input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Teacher full name" className={inputClass}/></label><label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">Staff ID / TSC Number<input required value={staffId} onChange={e=>setStaffId(e.target.value)} placeholder="TSC-123456" className={inputClass}/></label><label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">School Authorization Code<input required type="password" autoComplete="off" value={schoolCode} onChange={e=>setSchoolCode(e.target.value)} placeholder="Enter school authorization code" className={inputClass}/></label></>}<label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">{tab === "staff"?"Official Email Address":"Parent / Guardian Email"}<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={tab === "staff"?"teacher@example.com":"parent@example.com"} className={inputClass}/></label>{tab === "family"&&<label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">Learner Admission No. or UPI Number<input required value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="Admission number or UPI" className={inputClass}/></label>}<label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">Password<input required minLength={6} type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} className={inputClass}/></label><label className="mt-5 block text-sm font-bold text-[#061229] dark:text-white">Confirm Password<input required minLength={6} type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className={inputClass}/></label>{alert}<button disabled={busy} className="mt-6 min-h-12 w-full rounded-xl bg-[#061229] px-5 py-3.5 text-base font-extrabold text-white transition active:scale-[.98] disabled:opacity-60">{busy?"Creating account…":tab === "staff"?"Create staff account":"Create account"}</button><p className="mt-5 text-center text-sm text-slate-500">Already registered? <button type="button" onClick={()=>switchMode("signin")} className="min-h-12 px-1 font-bold text-[#D89B28] hover:underline">Sign in here</button></p></form>}
      <div className="mt-6 rounded-xl bg-[#F8F9FA] p-4 text-xs leading-5 text-slate-600"><div className="flex gap-2"><HelpCircle size={16} className="shrink-0 text-[#D89B28]"/><p><strong className="text-[#061229]">Having trouble?</strong> Contact the admin office at 0142550882 or visit the ICT desk.</p></div></div></div>
    </div></section>
  </PublicLayout>;
}
