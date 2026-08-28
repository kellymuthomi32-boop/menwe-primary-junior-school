import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import AcademicDirectory from "./AcademicDirectory";
import TeacherAssignmentsDirectory from "./TeacherAssignmentsDirectory";

export default function AcademicManagementPage() {
  const { user, profile, loading } = useSchoolAuth(); const [, setLocation] = useLocation();
  useEffect(() => { if (!loading && !user) setLocation("/portal/login"); }, [loading, setLocation, user]);
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f4f5f1]"><Loader2 className="animate-spin text-[var(--accent)]" /></div>;
  if (!user || !profile) return null;
  if (!["SUPER_ADMIN", "ADMIN"].includes(profile.role)) return <PortalLayout role={profile.role}><main className="mx-auto max-w-4xl p-6"><section className="menwe-card rounded-[1.75rem] p-7"><h1 className="font-serif text-3xl font-semibold">Academic administration</h1><p className="mt-3 text-sm text-[var(--ink)]/60">Your role is not authorised to create or modify academic structures.</p></section></main></PortalLayout>;
  return <PortalLayout role={profile.role}><main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><div className="grid gap-6"><EnrollmentDirectoryPlaceholder /><AcademicDirectory /><TeacherAssignmentsDirectory /></div></main></PortalLayout>;
}
function EnrollmentDirectoryPlaceholder() { return null; }