import { ArrowRight, FileText, GraduationCap } from "lucide-react";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import ExamDirectory from "./ExamDirectory";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI"];

export default function MarksManagementPage() {
  const { profile } = useSchoolAuth();
  const allowed = ADMIN_ROLES.includes(profile?.role ?? "");

  if (!profile) return null;

  if (!allowed) {
    return <PortalLayout role={profile.role}><main className="mx-auto max-w-4xl p-6"><section className="menwe-card rounded-[1.75rem] p-7"><h1 className="font-serif text-3xl font-semibold">Marks Management</h1><p className="mt-3 text-sm text-[var(--ink)]/60">Your role does not have access to school-wide marks management.</p></section></main></PortalLayout>;
  }

  return <PortalLayout role={profile.role}><main className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="menwe-card rounded-[1.75rem] border border-[var(--gold)]/25 p-6 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]"><GraduationCap size={23}/></span>
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-[var(--gold)]">Academic Management</p>
            <h1 className="mt-1 font-serif text-3xl font-semibold">Marks Management</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink)]/60">Select the academic year, term, class examination and subject, then enter or edit learner marks and save them. Administrators can manage marks for every active class and subject.</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white"><FileText size={17}/> School-wide marks entry</div>
      </div>
      <div className="mt-6 grid gap-2 sm:grid-cols-5">
        {[
          ["01", "Academic year"],
          ["02", "Term"],
          ["03", "Class & exam"],
          ["04", "Subject"],
          ["05", "Enter & Save"],
        ].map(([number, label]) => <div key={number} className="rounded-xl border border-[var(--ink)]/10 bg-white p-3"><span className="text-[10px] font-black text-[var(--gold)]">{number}</span><p className="mt-1 text-xs font-bold">{label}</p></div>)}
      </div>
    </header>
    <ExamDirectory />
  </main></PortalLayout>;
}
