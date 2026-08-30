import { useEffect, useState } from "react";
import { Loader2, LogOut, Save } from "lucide-react";
import { useLocation } from "wouter";
import { PortalLayout } from "@/components/PortalLayout";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";
import AttendanceDirectory from "./AttendanceDirectory";

function friendlyError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  if (/duplicate|unique constraint|23505/i.test(text)) return "This assessment already exists for this learner and term. Please review the existing record.";
  if (/network|fetch|timeout|rate limit|429/i.test(text)) return "Connection issue. Please check your network and try again.";
  return "We could not save the CBC assessment. Please try again or contact the school ICT desk.";
}

function Guard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useSchoolAuth();
  const [, go] = useLocation();
  useEffect(() => {
    if (!loading && (!user || !profile || (!isAdministrator(profile.role) && profile.role !== "TEACHER"))) go("/portal/login");
  }, [loading, profile, user, go]);
  if (loading) return <div className="grid min-h-screen place-items-center">Loading teacher workspace…</div>;
  if (!user || !profile || (!isAdministrator(profile.role) && profile.role !== "TEACHER")) return null;
  return <>{children}</>;
}

export default function PortalTeacherPage() { return <Guard><TeacherContent /></Guard>; }

function TeacherContent() {
  const auth = useSchoolAuth();
  const [, go] = useLocation();
  const [tab, setTab] = useState<"gradebook" | "attendance">("gradebook");
  const [upi, setUpi] = useState("");
  const [grade, setGrade] = useState("Grade 1");
  const [area, setArea] = useState("Mathematics");
  const [score, setScore] = useState("ME");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const save = async () => {
    if (!upi.trim()) { setMessage("Enter the learner UPI number."); return; }
    setBusy(true); setMessage("");
    try {
      const { error } = await getSupabase().from("cbc_grades").insert([{ learner_upi: upi.trim(), grade_level: grade, learning_area: area, rubric_score: score, term: "2026 Term 1", teacher_remarks: remarks.trim() || null, recorded_by_email: auth.user?.email ?? null }]);
      if (error) throw error;
      setMessage("CBC assessment saved successfully.");
      setRemarks("");
    } catch (error) {
      setMessage(friendlyError(error));
    } finally { setBusy(false); }
  };

  return <PortalLayout role={auth.profile!.role}><main className="mx-auto w-full max-w-7xl box-border min-w-0 overflow-hidden px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <header className="rounded-3xl bg-[#061229] p-6 text-white sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><span className="inline-flex min-h-12 items-center rounded-full bg-[#D89B28]/15 px-4 text-xs font-bold uppercase text-[#D89B28]">CBC Teacher Workspace</span><h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Gradebook & Attendance</h1><p className="mt-2 text-sm text-white/65">Record learning evidence and daily attendance directly in Supabase.</p></div><button onClick={async () => { await auth.signOut(); go("/portal/login"); }} className="min-h-12 rounded-xl border border-white/15 px-4 font-bold active:scale-[.98]"><LogOut size={16} className="mr-2 inline"/>Sign out</button></div></header>
    <nav className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2"><button onClick={() => setTab("gradebook")} className={`min-h-12 rounded-xl font-bold active:scale-[.98] ${tab === "gradebook" ? "bg-[#D89B28] text-[#061229]" : "bg-white border border-slate-200 text-slate-600"}`}>CBC Gradebook</button><button onClick={() => setTab("attendance")} className={`min-h-12 rounded-xl font-bold active:scale-[.98] ${tab === "attendance" ? "bg-[#D89B28] text-[#061229]" : "bg-white border border-slate-200 text-slate-600"}`}>Attendance Tracker</button></nav>
    {message && <p role="status" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{message}</p>}
    {tab === "gradebook" ? <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-2xl font-bold text-[#061229]">Record CBC learning evidence</h2><div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2"><label className="text-sm font-bold">Learner UPI<input value={upi} onChange={e => setUpi(e.target.value)} className="mt-2 box-border min-h-12 w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-4" placeholder="UPI number"/></label><label className="text-sm font-bold">Grade<select value={grade} onChange={e => setGrade(e.target.value)} className="mt-2 box-border min-h-12 w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-4">{["PP1","PP2",...Array.from({ length: 9 }, (_, i) => `Grade ${i + 1}`)].map(x => <option key={x}>{x}</option>)}</select></label><label className="text-sm font-bold">Learning Area<select value={area} onChange={e => setArea(e.target.value)} className="mt-2 box-border min-h-12 w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-4">{["Mathematics","English","Kiswahili","Integrated Science","Social Studies","Agriculture","Creative Arts","Pre-Technical Studies","ICT","Health Education","Sports Science"].map(x => <option key={x}>{x}</option>)}</select></label><label className="text-sm font-bold">Rubric<select value={score} onChange={e => setScore(e.target.value)} className="mt-2 box-border min-h-12 w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-4"><option>EE</option><option>ME</option><option>AE</option><option>BE</option></select></label></div><label className="mt-4 block text-sm font-bold">Teacher remarks<textarea value={remarks} onChange={e => setRemarks(e.target.value)} className="mt-2 box-border min-h-28 w-full min-w-0 max-w-full rounded-xl border border-slate-200 p-4" placeholder="Evidence or support notes"/></label><button disabled={busy} onClick={() => void save()} className="mt-4 min-h-12 w-full rounded-xl bg-[#061229] px-5 font-bold text-white transition active:scale-[.98] disabled:opacity-60">{busy ? <><Loader2 className="mr-2 inline animate-spin" size={16}/>Saving…</> : <><Save className="mr-2 inline" size={16}/>Save CBC assessment</>}</button></section> : <section className="mt-6"><AttendanceDirectory/></section>}
  </main></PortalLayout>;
}
