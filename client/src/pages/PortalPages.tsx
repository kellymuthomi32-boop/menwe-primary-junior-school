import { AlertCircle, Loader2, ShieldAlert } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { isAdministrator, type AppRole, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import MessageCenter from "./MessageCenter";
import ContentManagement from "./ContentManagement";
import PeopleDirectory from "./PeopleDirectory";
import OperationsAdmin from "./OperationsAdmin";
import EnrollmentDirectory from "./EnrollmentDirectory";
import TeacherAssignmentsDirectory from "./TeacherAssignmentsDirectory";

const adminOnly = new Set(["people", "enrolment", "assignments", "content", "operations", "settings", "audit-logs"]);

function AccessDenied({ role, view }: { role: AppRole; view: string }) {
  return <section className="menwe-card rounded-[1.75rem] p-6 sm:p-8"><div className="flex items-start gap-4"><ShieldAlert className="mt-1 shrink-0 text-[var(--accent)]" size={24} /><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--accent)]">Access restricted</p><h1 className="mt-2 font-serif text-3xl font-semibold">This area is not available to your role.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink)]/62">{role.replaceAll("_", " ")} accounts cannot open the {view.replaceAll("-", " ")} administration area.</p></div></div></section>;
}

function Overview({ role }: { role: AppRole }) {
  const { profile } = useSchoolAuth();
  const title = role === "TEACHER" ? "Teaching workspace" : role === "PARENT" ? "Family workspace" : role === "STUDENT" ? "Student workspace" : "School operations";
  return <div className="grid gap-6"><section><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--accent)]">Secure school portal</p><h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight">Welcome, {profile?.display_name || "school community member"}.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink)]/62">Your dashboard uses the canonical Supabase profile and only exposes records that your database authorization permits.</p></section><section className="menwe-card rounded-[1.75rem] p-6 sm:p-8"><h2 className="font-serif text-2xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-[var(--ink)]/62">Use the portal navigation to open the school modules available to your role. Empty modules intentionally remain empty until legitimate school records exist; the application does not fabricate operational data.</p></section></div>;
}

function PortalRouter({ role }: { role: AppRole }) {
  const [location] = useLocation();
  const view = location.split("/").filter(Boolean).at(-1) || "overview";
  if (adminOnly.has(view) && !isAdministrator(role)) return <PortalLayout role={role}><main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><AccessDenied role={role} view={view} /></main></PortalLayout>;
  const component = view === "messages" ? <MessageCenter role={role} /> : view === "people" ? <PeopleDirectory /> : view === "enrolment" ? <EnrollmentDirectory /> : view === "assignments" ? <TeacherAssignmentsDirectory /> : view === "content" ? <ContentManagement /> : view === "operations" || view === "settings" || view === "audit-logs" ? <OperationsAdmin /> : <Overview role={role}/>;
  return <PortalLayout role={role}><main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{component}</main></PortalLayout>;
}

export default function PortalGuard() {
  const { user, profile, loading, profileLoading, error, refreshProfile } = useSchoolAuth();
  const [, setLocation] = useLocation();
  useEffect(() => { if (!loading && !user) setLocation("/portal/login"); }, [loading, setLocation, user]);
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f4f5f1]"><Loader2 className="animate-spin text-[var(--accent)]" /></div>;
  if (!user) return null;

  // Authentication is the navigation gate. Profile hydration is supplementary and must never trap a signed-in user.
  if (profile?.status === "INACTIVE") return <div className="grid min-h-screen place-items-center bg-[#f4f5f1] px-5"><div className="max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl"><ShieldAlert className="mx-auto text-[var(--accent)]" size={34} /><h1 className="mt-5 font-serif text-3xl font-semibold">School access is unavailable</h1><p className="mt-4 text-sm leading-6 text-[var(--ink)]/65">Your sign-in succeeded, but this account is disabled.</p>{error && <p className="mt-4 flex items-center justify-center gap-2 text-sm text-red-700"><AlertCircle size={16} />{error}</p>}<div className="mt-6 flex flex-wrap justify-center gap-3"><button onClick={() => void refreshProfile()} disabled={profileLoading} className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Try again</button><button onClick={() => setLocation("/")} className="rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white">Return to website</button></div></div></div>;

  const email = user.email?.trim().toLowerCase() ?? "";
  const metadataRole = typeof user.app_metadata?.role === "string" ? user.app_metadata.role.toLowerCase() : typeof user.user_metadata?.role === "string" ? user.user_metadata.role.toLowerCase() : "";
  const role: AppRole = profile?.role ?? (email === "menweschool.official@gmail.com" || email === "menweprimaryandjunior@gmail.com" || ["admin", "super_admin", "head_of_institution", "deputy_hoi"].includes(metadataRole) ? "ADMIN" : ["teacher", "class_teacher", "classroom_teacher", "staff"].includes(metadataRole) ? "TEACHER" : metadataRole === "student" ? "STUDENT" : "PARENT");

  // Do not wait on profileLoading. SupabaseAuthContext already has a timeout and metadata fallback.
  return <PortalRouter role={role} />;
}
