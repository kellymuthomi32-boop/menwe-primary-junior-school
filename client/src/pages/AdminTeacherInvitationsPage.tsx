import { CheckCircle2, Loader2, Mail, RefreshCw, Send, ShieldCheck, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";

type Teacher = { id: string; employee_number: string; first_name: string; middle_name?: string | null; last_name: string; email?: string | null; profile_id?: string | null; status: string };
const input = "min-h-12 w-full rounded-xl border border-[var(--ink)]/12 bg-white px-3.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10";

export default function AdminTeacherInvitationsPage() {
  const { user, profile, loading: authLoading } = useSchoolAuth();
  const [, navigate] = useLocation();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [resendingEmail, setResendingEmail] = useState("");
  const [passwordTeacher, setPasswordTeacher] = useState<Teacher | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const passwordPanelRef = useRef<HTMLElement | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user || !profile || !isAdministrator(profile.role)) return;
    setLoading(true); setError("");
    try {
      const db = getSupabase();
      const { data, error: dbError } = await db.from("teachers").select("id,employee_number,first_name,middle_name,last_name,email,profile_id,status").eq("status", "ACTIVE").order("first_name").order("last_name");
      if (dbError) throw dbError;
      setTeachers((data ?? []) as Teacher[]);
    } catch (e) { setError(e instanceof Error ? e.message : "Teacher records could not be loaded."); }
    finally { setLoading(false); }
  }, [profile, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile) { navigate("/portal/login"); return; }
    if (!isAdministrator(profile.role)) { navigate("/portal/teacher"); return; }
    void load();
  }, [authLoading, load, navigate, profile, user]);

  const available = useMemo(() => teachers.filter(t => !t.profile_id), [teachers]);
  const linked = useMemo(() => teachers.filter(t => t.profile_id), [teachers]);
  const selected = teachers.find(t => t.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    setFullName([selected.first_name, selected.middle_name, selected.last_name].filter(Boolean).join(" "));
    setEmail(selected.email ?? ""); setMessage(""); setError("");
  }, [selected]);

  const resetNew = () => { setSelectedId(""); setFullName(""); setEmail(""); setNewPassword(""); };

  useEffect(() => {
    if (!passwordTeacher) return;
    const frame = window.requestAnimationFrame(() => passwordPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    return () => window.cancelAnimationFrame(frame);
  }, [passwordTeacher]);

  const setTeacherPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordTeacher?.email) return;
    setSavingPassword(true); setMessage(""); setError("");
    try {
      if (newPassword.length < 8) throw new Error("Password must be at least 8 characters long.");
      const db = getSupabase();
      const { data, error: invokeError } = await db.functions.invoke("school-invite", { body: { action: "set_password", email: passwordTeacher.email, password: newPassword } });
      if (invokeError) {
        const context = (invokeError as { context?: Response }).context;
        let serverMessage = invokeError.message;
        if (context) { try { const body = await context.clone().json() as { error?: string; message?: string }; serverMessage = body.error || body.message || serverMessage; } catch { /* keep SDK message */ } }
        throw new Error(serverMessage);
      }
      if (data?.error) throw new Error(data.error);
      setMessage("Teacher password updated successfully. The teacher can now sign in with the official email and the new password.");
      setPasswordTeacher(null); setNewPassword("");
    } catch (e) { setError(e instanceof Error ? e.message : "The teacher password could not be updated."); }
    finally { setSavingPassword(false); }
  };

  const sendInvitation = async (event: React.FormEvent) => {
    event.preventDefault(); setSending(true); setMessage(""); setError("");
    try {
      const db = getSupabase(); const targetEmail = email.trim().toLowerCase(); const name = fullName.trim();
      if (!name) throw new Error("Enter the teacher's full name.");
      if (!/^\S+@\S+\.\S+$/.test(targetEmail)) throw new Error("Enter a valid email address.");
      if (newPassword.length < 8) throw new Error("Enter a password of at least 8 characters.");
      const { data, error: invokeError } = await db.functions.invoke("school-invite", { body: { action: "direct", email: targetEmail, fullName: name, role: "TEACHER", recordType: "teacher", password: newPassword, ...(selected ? { recordId: selected.id } : {}) } });
      if (invokeError) {
        const context = (invokeError as { context?: Response }).context;
        let serverMessage = invokeError.message;
        if (context) {
          try {
            const body = await context.clone().json() as { error?: string; message?: string };
            serverMessage = body.error || body.message || serverMessage;
          } catch { /* keep the SDK message when the response is not JSON */ }
        }
        throw new Error(serverMessage);
      }
      if (data?.error) throw new Error(data.error);
      setMessage(data?.message || `Teacher account created. ${targetEmail} can log in directly.`);
      resetNew(); setNewPassword(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "The invitation could not be sent."); }
    finally { setSending(false); }
  };

  const resendInvitation = async (teacher: Teacher) => {
    const targetEmail = teacher.email?.trim().toLowerCase();
    if (!targetEmail) { setError("This teacher has no email address on the staff record."); return; }
    setResendingEmail(targetEmail); setMessage(""); setError("");
    try {
      const db = getSupabase();
      const { data, error: invokeError } = await db.functions.invoke("school-invite", { body: { action: "resend", email: targetEmail, fullName: [teacher.first_name, teacher.middle_name, teacher.last_name].filter(Boolean).join(" ") } });
      if (invokeError) {
        const context = (invokeError as { context?: Response }).context;
        let serverMessage = invokeError.message;
        if (context) { try { const body = await context.clone().json() as { error?: string; message?: string }; serverMessage = body.error || body.message || serverMessage; } catch { /* keep SDK message */ } }
        throw new Error(serverMessage);
      }
      if (data?.error) throw new Error(data.error);
      setMessage(data?.message || "Invitation resent to " + targetEmail + ".");
    } catch (e) { setError(e instanceof Error ? e.message : "The invitation could not be resent."); }
    finally { setResendingEmail(""); }
  };
  if (authLoading || loading) return <PortalLayout role="ADMIN"><main className="grid min-h-[60vh] place-items-center"><div className="flex items-center gap-3 text-sm text-[var(--ink)]/60"><Loader2 className="animate-spin text-[var(--gold)]" size={19}/>Loading teacher records…</div></main></PortalLayout>;

  return <PortalLayout role="ADMIN"><main className="mx-auto w-full max-w-[1100px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
    <header className="menwe-admin-hero relative overflow-hidden rounded-[2.25rem] p-6 text-white shadow-2xl sm:p-9"><div className="relative z-10"><span className="menwe-admin-kicker"><Mail size={14}/> Staff access</span><h1 className="mt-5 text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">Teacher access</h1><p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/75">Create teacher accounts directly with a school password. No invitation acceptance or email confirmation is required.</p></div></header>
    {message && <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><CheckCircle2 size={18} className="mt-0.5 shrink-0"/>{message}</div>}
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}

    <section className="menwe-card rounded-[1.75rem] p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="menwe-premium-label">Direct teacher account</p><h2 className="menwe-premium-title mt-1">Create login access</h2><p className="mt-2 text-sm leading-6 text-[var(--ink)]/60">Select an existing teacher record or create the staff record automatically. Set the school password here and the teacher can log in immediately.</p></div><button type="button" onClick={()=>void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--ink)]/10 px-4 text-sm font-bold hover:border-[var(--gold)]/40"><RefreshCw size={16}/> Refresh</button></div>
      <form onSubmit={sendInvitation} className="mt-7 grid gap-5">
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide">Existing teacher record <select className={input} value={selectedId} onChange={e=>setSelectedId(e.target.value)}><option value="">New teacher — create staff record automatically</option>{available.map(t=><option key={t.id} value={t.id}>{t.first_name}{t.middle_name?` ${t.middle_name}`:""} {t.last_name} · Staff ID {t.employee_number}</option>)}</select></label>
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide">Teacher full name<input required className={input} value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Linah Kawira"/></label>
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide">Official email<input required type="email" className={input} value={email} onChange={e=>setEmail(e.target.value)} placeholder="teacher@example.com"/></label>\n        <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide">School login password<input required minLength={8} type="password" autoComplete="new-password" className={input} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="At least 8 characters"/></label>
        {selected && <div className="grid gap-3 rounded-2xl bg-[var(--mist)] p-4 sm:grid-cols-3"><div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[var(--ink)]/45">Staff ID</p><p className="mt-1 font-bold">{selected.employee_number}</p></div><div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[var(--ink)]/45">Teacher</p><p className="mt-1 font-bold">{selected.first_name} {selected.last_name}</p></div><div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[var(--ink)]/45">Role</p><p className="mt-1 font-bold">Teacher</p></div></div>}
        <div className="flex flex-col-reverse gap-3 border-t border-[var(--ink)]/8 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={()=>navigate("/portal/people")} className="min-h-12 rounded-xl border border-[var(--ink)]/12 px-5 text-sm font-bold">Back to people</button><button disabled={sending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-6 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50">{sending?<Loader2 className="animate-spin" size={17}/>:<Send size={17}/>} {sending?"Creating secure login…":"Create teacher login"}</button></div>
      </form>
    </section>

    <section className="menwe-card rounded-[1.75rem] p-6 sm:p-8"><div><p className="menwe-premium-label">Existing teacher accounts</p><h2 className="menwe-premium-title mt-1">Account status</h2><p className="mt-2 text-sm leading-6 text-[var(--ink)]/60">Linked accounts remain associated with their teacher records. Administrators can set or replace a teacher login password directly without exposing the service key.</p></div><div className="mt-6 divide-y divide-[var(--ink)]/8">{linked.length === 0 && <p className="py-5 text-sm text-[var(--ink)]/55">No linked teacher accounts yet.</p>}{linked.map(t=><div key={t.id} className="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{t.first_name} {t.last_name}</p><p className="mt-1 text-sm text-[var(--ink)]/55">Staff ID {t.employee_number} · {t.email || "No email on staff record"}</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" disabled={!t.email} onClick={() => { setPasswordTeacher(t); setNewPassword(""); setMessage(""); setError(""); }} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--gold)]/35 px-3 text-xs font-bold hover:border-[var(--gold)]/60 disabled:opacity-50"><ShieldCheck size={13}/> Set password</button><button type="button" disabled={resendingEmail === (t.email || "").trim().toLowerCase()} onClick={() => void resendInvitation(t)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--ink)]/10 px-3 text-xs font-bold hover:border-[var(--gold)]/40 disabled:opacity-50"><RefreshCw size={13} className={resendingEmail === (t.email || "").trim().toLowerCase() ? "animate-spin" : ""}/> Resend invite</button><span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800"><CheckCircle2 size={14}/> Linked</span></div></div>)}</div></section>

    {passwordTeacher && <section ref={passwordPanelRef} aria-label="Set teacher password" className="menwe-card rounded-[1.75rem] border-2 border-[var(--gold)]/25 p-6 shadow-xl ring-2 ring-[var(--gold)]/10 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="menwe-premium-label">Administrator action</p><h2 className="menwe-premium-title mt-1">Set teacher password</h2><p className="mt-2 text-sm leading-6 text-[var(--ink)]/60">Set a new login password for {passwordTeacher.first_name} {passwordTeacher.last_name}. No confirmation step is required; the password is sent only to the secure server and is never displayed after saving.</p><p className="mt-2 text-xs font-bold text-[var(--ink)]/50">{passwordTeacher.email}</p></div><button type="button" onClick={()=>{setPasswordTeacher(null);setNewPassword("");}} className="min-h-10 rounded-lg border border-[var(--ink)]/10 px-3 text-xs font-bold">Cancel</button></div><form onSubmit={setTeacherPassword} className="mt-6 grid gap-4 sm:max-w-xl"><label className="grid gap-1.5 text-xs font-black uppercase tracking-wide">New password<input required minLength={8} type="password" autoComplete="new-password" className={input} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="At least 8 characters"/></label><button disabled={savingPassword} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-6 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50">{savingPassword?<Loader2 className="animate-spin" size={17}/>:<ShieldCheck size={17}/>} {savingPassword?"Saving password…":"Save teacher password"}</button></form></section>}

    <section className="rounded-[1.75rem] border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-[var(--gold)]" size={20}/><div><h2 className="font-bold">Direct access</h2><p className="mt-1 text-sm leading-6 text-[var(--ink)]/60">For a new teacher, the system creates the staff record, creates and confirms the secure Supabase account, links it to the teacher, and makes the login ready immediately. Teachers do not need to accept an email invitation or set another password.</p></div></div></section>
    <div className="flex items-center gap-2 text-xs text-[var(--ink)]/50"><UserPlus size={14}/> {available.length} unlinked teacher record{available.length === 1 ? "" : "s"} · {linked.length} linked account{linked.length === 1 ? "" : "s"}.</div>
  </main></PortalLayout>;
}
