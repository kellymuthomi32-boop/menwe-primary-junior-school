import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useSchoolAuth } from "./contexts/SupabaseAuthContext";
import MenweHeroHome from "./pages/MenweHeroHome";
import "./mobile-premium.css";

/**
 * Vite emits content-hashed chunks for lazy routes. After a deployment, a
 * browser can briefly retain an older index/app chunk that points at a chunk
 * which no longer exists on the new deployment. Retry the import once after
 * forcing a fresh document load, then let the normal error boundary handle
 * any genuine module error.
 */
function lazyWithChunkRecovery<T extends React.ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>,
  recoveryKey: string,
) {
  return lazy(async () => {
    try {
      return await importer();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isChunkError = /dynamically imported module|loading chunk|chunkloaderror|failed to fetch/i.test(message);
      const storageKey = `menwe:chunk-recovery:${recoveryKey}`;

      if (isChunkError && typeof window !== "undefined" && !sessionStorage.getItem(storageKey)) {
        sessionStorage.setItem(storageKey, "1");
        window.location.reload();
        await new Promise<never>(() => undefined);
      }

      if (typeof window !== "undefined") {
        sessionStorage.removeItem(storageKey);
      }
      throw error;
    }
  });
}

const AcademicsPage = lazyWithChunkRecovery(() => import("./pages/AcademicsPage"), "academics");
const AdmissionsPage = lazyWithChunkRecovery(() => import("./pages/AdmissionsPage"), "admissions");
const NewsEventsPage = lazyWithChunkRecovery(() => import("./pages/CorePublicPages").then(m => ({ default: m.NewsEventsPage })), "news-events");
const GalleryPage = lazyWithChunkRecovery(() => import("./pages/GalleryPage"), "gallery");
const ContactPage = lazyWithChunkRecovery(() => import("./pages/CorePublicPages").then(m => ({ default: m.ContactPage })), "contact");
const AboutPage = lazyWithChunkRecovery(() => import("./pages/AboutPage"), "about");
const MagicLinkPage = lazyWithChunkRecovery(() => import("./pages/MagicLinkPage"), "magic-link");
const PortalAccessPage = lazyWithChunkRecovery(() => import("./pages/PortalAccessPage"), "portal-access");
const AttendanceDirectory = lazyWithChunkRecovery(() => import("./pages/AttendanceDirectory"), "attendance");
const AcademicManagementPage = lazyWithChunkRecovery(() => import("./pages/AcademicManagementPage"), "academic-management");
const ExamManagementPage = lazyWithChunkRecovery(() => import("./pages/ExamManagementPage"), "exam-management");
const FinanceDirectory = lazyWithChunkRecovery(() => import("./pages/FinanceDirectory"), "finance");
const HomeworkDirectory = lazyWithChunkRecovery(() => import("./pages/HomeworkDirectory"), "homework");
const NotificationCenter = lazyWithChunkRecovery(() => import("./pages/NotificationCenter"), "notifications");
const ReportCardsDirectory = lazyWithChunkRecovery(() => import("./pages/ReportCardsDirectory"), "report-cards");
const TimetableDirectory = lazyWithChunkRecovery(() => import("./pages/TimetableDirectory"), "timetable");
const GalleryManagementPage = lazyWithChunkRecovery(() => import("./pages/GalleryManagementPage"), "gallery-management");
const SchoolSetupPage = lazyWithChunkRecovery(() => import("./pages/SchoolSetupPage"), "school-setup");
const FirstAdminPage = lazyWithChunkRecovery(() => import("./pages/FirstAdminPage"), "first-admin");
const PortalGuard = lazyWithChunkRecovery(() => import("./pages/PortalPages"), "portal-pages");
const LoginPage = lazyWithChunkRecovery(() => import("./pages/PublicPages").then(module => ({ default: module.LoginPage })), "login");
const SchoolLifePage = lazyWithChunkRecovery(() => import("./pages/SchoolLifePage"), "school-life");
const ForFamiliesPage = lazyWithChunkRecovery(() => import("./pages/ForFamiliesPage"), "families");
const HowItWorksPage = lazyWithChunkRecovery(() => import("./pages/HowItWorksPage"), "how-it-works");
const PortalLoginPage = lazyWithChunkRecovery(() => import("./pages/PortalLoginPage"), "portal-login");
const PortalAdminPage = lazyWithChunkRecovery(() => import("./pages/PortalAdminPage"), "portal-admin");
const PortalTeacherPage = lazyWithChunkRecovery(() => import("./pages/PortalTeacherPage"), "portal-teacher");
const PortalParentPage = lazyWithChunkRecovery(() => import("./pages/PortalParentPage"), "portal-parent");
const CalendarPage = lazyWithChunkRecovery(() => import("./pages/CalendarPage"), "calendar");
const TermsPage = lazyWithChunkRecovery(() => import("./pages/TermsPage"), "terms");
const PrivacyPage = lazyWithChunkRecovery(() => import("./pages/PrivacyPage"), "privacy");
const CookiesPage = lazyWithChunkRecovery(() => import("./pages/CookiesPage"), "cookies");
const NotFoundPage = lazyWithChunkRecovery(() => import("./pages/NotFoundPage"), "not-found");
const ContentManagementRoute = lazyWithChunkRecovery(() => import("./pages/ContentManagement"), "content-management");
const AcademicDirectoryRoute = lazyWithChunkRecovery(() => import("./pages/AcademicDirectory"), "academic-directory");
const AdminPeopleManagementPage = lazyWithChunkRecovery(() => import("./pages/AdminPeopleManagementPage"), "people-management");
const AdminOperationsPage = lazyWithChunkRecovery(() => import("./pages/AdminOperationsPage"), "operations");

const MASTER_ADMIN_EMAILS = new Set(["menweprimaryandjunior@gmail.com", "menweschool.official@gmail.com"]);
type PortalRole = "admin" | "teacher" | "parent";

function resolvePortalRole(user: { email?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }, profileRole?: unknown, profileActive = false): PortalRole {
  if (MASTER_ADMIN_EMAILS.has(user.email?.trim().toLowerCase() ?? "")) return "admin";
  const role = typeof profileRole === "string" ? profileRole.toLowerCase() : typeof user.app_metadata?.role === "string" ? user.app_metadata.role.toLowerCase() : typeof user.user_metadata?.role === "string" ? user.user_metadata.role.toLowerCase() : "";
  if (profileActive && ["admin", "head_of_institution", "deputy_hoi", "super_admin"].includes(role)) return "admin";
  if (["teacher", "class_teacher", "classroom_teacher", "staff"].includes(role)) return "teacher";
  return "parent";
}

function PortalRouteGuard({ allowedRoles, children }: { allowedRoles: PortalRole[]; children: ReactNode }) {
  const [, navigate] = useLocation();
  const auth = useSchoolAuth();
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) { navigate("/portal/login"); return; }
    if (auth.profileLoading || !auth.profile) return;
    const role = resolvePortalRole(auth.user, auth.profile.role ?? auth.profile.canonical_role, auth.profile.status === "ACTIVE");
    if (!allowedRoles.includes(role)) navigate(role === "teacher" ? "/portal/teacher" : role === "admin" ? "/portal/admin" : "/portal/parent");
  }, [allowedRoles, auth.loading, auth.profile, auth.profileLoading, auth.user, navigate]);
  if (auth.loading) return <div className="grid min-h-screen place-items-center bg-[#061229] text-sm text-white">Restoring secure session…</div>;
  if (!auth.user || auth.profileLoading || !auth.profile) return null;
  const role = resolvePortalRole(auth.user, auth.profile.role ?? auth.profile.canonical_role, auth.profile.status === "ACTIVE");
  if (!allowedRoles.includes(role)) return null;
  return <>{children}</>;
}

function AdminPortalRoute() { return <PortalRouteGuard allowedRoles={["admin"]}><PortalAdminPage /></PortalRouteGuard>; }
function TeacherPortalRoute() { return <PortalRouteGuard allowedRoles={["admin", "teacher"]}><PortalTeacherPage /></PortalRouteGuard>; }
function ParentPortalRoute() { return <PortalRouteGuard allowedRoles={["parent"]}><PortalParentPage /></PortalRouteGuard>; }

function Router() {
  const [location] = useLocation();
  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Menwe Primary & Junior School | Igoki, Abogeta",
      "/about": "About Menwe | Menwe Primary & Junior School",
      "/academics": "Academics & CBC Learning | Menwe Primary & Junior School",
      "/admissions": "Admissions | Menwe Primary & Junior School",
      "/contact": "Contact Menwe Primary & Junior School",
      "/portal/admin": "Staff & Admin Command Center | Menwe Primary & Junior School",
      "/portal/admin/directory": "People & Enrolment | Menwe Primary & Junior School",
      "/portal/admin/operations": "Operations & Reports | Menwe Primary & Junior School",
      "/portal/admin/finance": "Finance | Menwe Primary & Junior School",
    };
    document.title = titles[location] ?? "Menwe Primary & Junior School | Igoki, Abogeta";
  }, [location]);
  return <Switch>
    <Route path="/" component={MenweHeroHome} /><Route path="/about" component={AboutPage} /><Route path="/academics" component={AcademicsPage} /><Route path="/admissions" component={AdmissionsPage} />
    <Route path="/news-events" component={NewsEventsPage} /><Route path="/news" component={NewsEventsPage} /><Route path="/events" component={NewsEventsPage} /><Route path="/gallery" component={GalleryPage} /><Route path="/contact" component={ContactPage} /><Route path="/school-life" component={SchoolLifePage} /><Route path="/families" component={ForFamiliesPage} /><Route path="/how-it-works" component={HowItWorksPage} />
    <Route path="/portal/login" component={PortalLoginPage} /><Route path="/portal/admin" component={AdminPortalRoute} /><Route path="/portal/teacher" component={TeacherPortalRoute} /><Route path="/portal/parent" component={ParentPortalRoute} /><Route path="/portal/dashboard" component={ParentPortalRoute} />
    <Route path="/portal/admin/academics" component={AcademicManagementPage} /><Route path="/portal/admin/attendance" component={AttendanceDirectory} /><Route path="/portal/admin/content" component={ContentManagementRoute} /><Route path="/portal/admin/directory" component={AdminPeopleManagementPage} /><Route path="/portal/admin/operations" component={AdminOperationsPage} /><Route path="/portal/admin/finance" component={FinanceDirectory} />
    <Route path="/portal" component={PortalGuard} /><Route path="/calendar" component={CalendarPage} /><Route path="/terms" component={TermsPage} /><Route path="/privacy" component={PrivacyPage} /><Route path="/cookies" component={CookiesPage} /><Route path="/login" component={PortalAccessPage} /><Route path="/portal/password" component={LoginPage} /><Route path="/portal/email-link" component={MagicLinkPage} /><Route path="/portal/setup/first-admin" component={FirstAdminPage} /><Route path="/portal/setup" component={SchoolSetupPage} />
    <Route path="/portal/academics" component={AcademicManagementPage} /><Route path="/portal/exams" component={ExamManagementPage} /><Route path="/portal/attendance" component={AttendanceDirectory} /><Route path="/portal/report-cards" component={ReportCardsDirectory} /><Route path="/portal/finance" component={FinanceDirectory} /><Route path="/portal/homework" component={HomeworkDirectory} /><Route path="/portal/timetable" component={TimetableDirectory} /><Route path="/portal/notifications" component={NotificationCenter} /><Route path="/portal/gallery" component={GalleryManagementPage} />
    <Route path="/portal/:rest*" component={PortalGuard} /><Route path="*" component={NotFoundPage} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Suspense fallback={<div className="grid min-h-screen place-items-center bg-[var(--paper)] text-sm text-[var(--ink)]/55">Loading Menwe…</div>}><Router /></Suspense></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
