import { useEffect, useState } from "react";
import { Loader2, LogOut, Save, Sparkles, WifiOff } from "lucide-react";
import { useLocation } from "wouter";
import { PortalLayout } from "@/components/PortalLayout";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";
import { queueOffline } from "@/lib/offlineSync";
import AttendanceDirectory from "./AttendanceDirectory";

const ACHIEVEMENT: Record<string, number> = { EE1: 8, EE2: 7, ME1: 6, ME2: 5, AE1: 4, AE2: 3, BE1: 2, BE2: 1 };
function friendlyError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  if (/duplicate|unique constraint|23505/i.test(text)) return "This assessment already exists for this learner and term. Please review the existing record.";
  if (/network|fetch|timeout|rate limit|429/i.test(text)) return "Connection issue. Your work can be saved offline and synced when you reconnect.";
  return "We could not save the CBC assessment. Please try again or contact the school ICT desk.";
}
function Guard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useSchoolAuth(); const [, go] = useLocation();
  const authorized = Boolean(user && profile && profile.status === "ACTIVE" && (isAdministrator(profile.role) || profile.role === "TEACHER"));
  useEffect(() => { if (!loading && !authorized) go("/portal/login"); }, [authorized, loading, go]);
  if (loading) return <div className="grid min-h-screen place-items-center">Loading teacher workspace…</div>;
  if (!authorized) return null;
  return <>{children}</>;
}
export default function PortalTeacherPage() { return <Guard><TeacherContent /></Guard>; }
function TeacherContent() {
  const auth = useSchoolAuth(); const [, go] = useLocation();
  const [tab, setTab] = useState<"gradebook" | "attendance">("gradebook"); const [upi, setUpi] = useState("");
  const [grade, setGrade] = useState("Grade 1"); const [area, setArea] = useState("Mathematics"); const [score, setScore] = useState("ME1");
  const [remarks, setRemarks] = useState(""); const [strand, setStrand] = useState(""); const [substrand, setSubstrand] = useState(""); const [sbaTitle, setSbaTitle] = useState("Term formative evidence");
  const [busy, setBusy] = useState(false); const [generatingRemarks, setGeneratingRemarks] = useState(false); const [message, setMessage] = useState("");
  const save = async () => {
    if (!upi.trim()) { setMessage("Enter the learner UPI number."); return; }
    setBusy(true); setMessage("");
    const gradePayload = { learner_upi: upi.trim(), grade_level: grade, learning_area: area, rubric_score: score.slice(0,2), achievement_code: score, achievement_points: ACHIEVEMENT[score], term: "2026 Term 1", teacher_remarks: remarks.trim() || null, recorded_by_email: auth.user?.email ?? null };
    const portfolioPayload = { learner_upi: upi.trim(), grade_level: grade, learning_area: area, term: "2026 Term 1", strand: strand.trim() || null, substrand: substrand.trim() || null, sba_type: "Formative SBA", sba_title: sbaTitle.trim() || "Term formative evidence", evidence_note: remarks.trim() || null, achievement_code: score, teacher_remarks: remarks.trim() || null, recorded_by_email: auth.user?.email ?? null, competency_scores: {} };
    try {
      if (!navigator.onLine) { await queueOffline("cbc_grades", gradePayload); await queueOffline("cbc_portfolio_entries", portfolioPayload); setMessage("Saved offline. It will sync automatically when your connection returns."); return; }
      const supabase = getSupabase();
      const { error } = await supabase.from("cbc_grades").upsert([gradePayload], { onConflict: "learner_upi,grade_level,learning_area,term" });
      if (error) throw error;
      const portfolioResult = await supabase.from("cbc_portfolio_entries").upsert([portfolioPayload], { onConflict: "learner_upi,grade_level,term,learning_area,sba_title" });
      if (portfolioResult.error) throw portfolioResult.error;
      setMessage(`Saved ${score} (${ACHIEVEMENT[score]}/8) and added the evidence to the cumulative portfolio.`); setRemarks("");
    } catch (error) {
      if (/network|fetch|timeout/i.test(error instanceof Error ? error.message : String(error))) { await queueOffline("cbc_grades", gradePayload); await queueOffline("cbc_portfolio_entries", portfolioPayload); setMessage("Connection lost. The assessment is safely queued for automatic sync."); }
      else setMessage(friendlyError(error));
    } finally { setBusy(false); }
  };
  const generateAiRemarks = async () => {
    if (!upi.trim()) { setMessage("Enter the learner UPI number before generating remarks."); return; }
    setGeneratingRemarks(true); setMessage("");
    try {
      const { data: { session } } = await getSupabase().auth.getSession(); if (!session?.access_token) throw new Error("Your staff session has expired. Please sign in again.");
      const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim(); if (!baseUrl) throw new Error("Supabase is not configured for this deployment.");
      const response = await fetch(`${baseUrl}/functions/v1/cbc-remarks`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ grade_level: grade, learning_area: area, rubric_score: score.slice(0,2), current_remarks: remarks.trim() }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "The AI assistant could not generate remarks.");
      setRemarks(typeof payload.remark === "string" ? payload.remark : ""); setMessage("AI draft generated. Review it and edit it before saving.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to generate AI remarks right now."); } finally { setGeneratingRemarks(false); }
  };
  return <PortalLayout role={auth.profile!.role}><main className="mx-auto w-full max-w-7xl box-border min-w-0 overflow-hidden px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <header className="rounded-3xl bg-[#061229] p-6 text-white sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><span className="inline-flex min-h-12 items-center rounded-full bg-[#D89B28]/15 px-4 text-xs font-bold uppercase text-[#D89B28]">CBC Teacher Workspace</span><h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Gradebook & Attendance</h1><p className="mt-2 text-sm text-white/65">8-point achievement evidence, cumulative SBA portfolio and daily attendance.</p></div><button onClick={async () => { await auth.signOut(); go("/portal/login"); }} className="min-h-12 rounded-xl border border-white/15 px-4 font-bold active:scale-[.98]"><LogOut size={16} className="mr-2 inline"/>Sign out</button></div></header>
    <nav className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2"><button onClick={() => setTab("gradebook")} className={`min-h-12 rounded-xl font-bold active:scale-[.98] ${tab === "gradebook" ? "bg-[#D89B28] text-[#061229]" : "bg-white border border-slate-200 text-slate-600"}`}>CBC Gradebook</button><button onClick={() => setTab("attendance")} className={`min-h-12 rounded-xl font-bold active:scale-[.98] ${tab === "attendance" ? "bg-[#D89B28] text-[#061229]" : "bg-white border border-slate-200 text-slate-600"}`}>Attendance Tracker</button></nav>
    {message && <p role="status" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{message}</p>}
    {tab === "gradebook" ? <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-2"><h2 className="text-2xl font-bold text-[#061229]">Record CBC learning evidence</h2>{!navigator.onLine && <WifiOff size={18} aria-label="Offline"/>}</div>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2"><label className="text-sm font-bold">Learner UPI<input value={upi} onChange={e => setUpi(e.target.value)} className="mt-2 box-border min-h-12 w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-4" placeholder="UPI number"/></label><label className="text-sm font-bold">Grade<select value={grade} onChange={e => setGrade(e.target.value)} className="mt-2 box-border min-h-12 w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-4">{["PP1","PP2",...Array.from({ length: 9 }, (_, i) => `Grade ${i + 1}`)].map(x => <option key={x}>{x}</option>)}</select></label><label className="text-sm font-bold">Learning Area<select value={area} onChange={e => setArea(e.target.value)} className="mt-2 box-border min-h-12 w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-4">{["Mathematics","English","Kiswahili","Integrated Science","Social Studies","Agriculture","Creative Arts","Pre-Technical Studies","ICT","Health Education","Sports Science"].map(x => <option key={x}>{x}</option>)}</select></label><label className="text-sm font-bold">Achievement level<select value={score} onChange={e => setScore(e.target.value)} className="mt-2 box-border min-h-12 w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-4">{Object.entries(ACHIEVEMENT).map(([code, points]) => <option key={code} value={code}>{code} — {points}/8</option>)}</select></label></div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"><label className="text-sm font-bold">Strand<input value={strand} onChange={e => setStrand(e.target.value)} className="mt-2 box-border min-h-12 w-full rounded-xl border border-slate-200 px-4"/></label><label className="text-sm font-bold">Sub-strand<input value={substrand} onChange={e => setSubstrand(e.target.value)} className="mt-2 box-border min-h-12 w-full rounded-xl border border-slate-200 px-4"/></label></div>
      <label className="mt-4 block text-sm font-bold">SBA evidence title<input value={sbaTitle} onChange={e => setSbaTitle(e.target.value)} className="mt-2 box-border min-h-12 w-full rounded-xl border border-slate-200 px-4"/></label><label className="mt-4 block text-sm font-bold">Teacher remarks<textarea value={remarks} onChange={e => setRemarks(e.target.value)} className="mt-2 box-border min-h-28 w-full min-w-0 max-w-full rounded-xl border border-slate-200 p-4" placeholder="Evidence, competency observations or support notes"/></label>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"><button disabled={generatingRemarks || busy} onClick={() => void generateAiRemarks()} className="min-h-12 w-full rounded-xl border border-[#D89B28]/40 bg-amber-50 px-5 font-bold text-[#8a6117] transition active:scale-[.98] disabled:opacity-60">{generatingRemarks ? <><Loader2 className="mr-2 inline animate-spin" size={16}/>Drafting…</> : <><Sparkles className="mr-2 inline" size={16}/>Draft with CBC AI</>}</button><button disabled={busy || generatingRemarks} onClick={() => void save()} className="min-h-12 w-full rounded-xl bg-[#061229] px-5 font-bold text-white transition active:scale-[.98] disabled:opacity-60">{busy ? <><Loader2 className="mr-2 inline animate-spin" size={16}/>Saving…</> : <><Save className="mr-2 inline" size={16}/>Save evidence</>}</button></div><p className="mt-3 text-xs text-slate-500">EE1/EE2, ME1/ME2, AE1/AE2 and BE1/BE2 map to an 8-point evidence scale. AI text is a draft and must be reviewed by the teacher.</p>
    </section> : <section className="mt-6"><AttendanceDirectory/></section>}
  </main></PortalLayout>;
}
