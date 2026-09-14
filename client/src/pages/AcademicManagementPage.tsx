import { ClipboardList, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import AcademicDirectory from "./AcademicDirectory";
import TeacherAssignmentsDirectory from "./TeacherAssignmentsDirectory";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI"];

export default function AcademicManagementPage() {
  const { user, profile, loading } = useSchoolAuth(); const [, setLocation] = useLocation();
  useEffect(() => { if (!loading && !user) setLocation("/portal/login"); }, [loading, setLocation, user]);
  if (loading) return <div className="grid min-h-screen place-items-center bg-[var(--paper)]"><Loader2 className="animate-spin text-[var(--accent)]" /></div>;
  if (!user || !profile) return null;
  const admin = ADMIN_ROLES.includes(profile.role);
  const teacher = profile.role === "TEACHER";
  if (!admin && !teacher) return <PortalLayout role={profile.role}><main className="mx-auto max-w-4xl p-6"><section className="menwe-card rounded-[1.75rem] p-7"><h1 className="font-serif text-3xl font-semibold">Academic workspace</h1><p className="mt-3 text-sm text-[var(--ink)]/60">Your role does not have access to this workspace.</p></section></main></PortalLayout>;
  return <PortalLayout role={profile.role}><main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><div className="grid gap-6">
    {admin && <section className="menwe-card rounded-[1.75rem] border border-[var(--gold)]/30 p-5 sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="menwe-premium-label">Academic Management</p><h1 className="mt-1 font-serif text-3xl font-semibold">Marks Management</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink)]/60">Enter, edit and manage learner examination marks from one clear workflow.</p></div>
        <button type="button" onClick={() => setLocation("/portal/exams")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-5 text-sm font-bold text-white shadow-sm hover:opacity-90"><ClipboardList size={18}/>Enter / Manage Marks</button>
      </div>
      <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
        {["Academic year", "Term", "Class", "Examination", "Subject → enter/edit marks"].map((step, index) => <div key={step} className="rounded-xl border border-[var(--ink)]/8 bg-[var(--mist)]/50 p-3"><span className="text-xs font-black text-[var(--gold)]">{index + 1}</span><p className="mt-1 font-semibold">{step}</p></div>)}
      </div>
    </section>}
    {admin && <AcademicDirectory />}<TeacherAssignmentsDirectory /></div></main></PortalLayout>;
}
