import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useSchoolAuth } from "./contexts/SupabaseAuthContext";
import MenweHeroHome from "./pages/MenweHeroHome";
import "./mobile-premium.css";

const AcademicsPage = lazy(() => import("./pages/AcademicsPage"));
const AdmissionsPage = lazy(() => import("./pages/AdmissionsPage"));
const NewsEventsPage = lazy(() => import("./pages/CorePublicPages").then(m => ({ default: m.NewsEventsPage })));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const ContactPage = lazy(() => import("./pages/CorePublicPages").then(m => ({ default: m.ContactPage })));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const MagicLinkPage = lazy(() => import("./pages/MagicLinkPage"));
const PortalAccessPage = lazy(() => import("./pages/PortalAccessPage"));
const AttendanceDirectory = lazy(() => import("./pages/AttendanceDirectory"));
const AcademicManagementPage = lazy(() => import("./pages/AcademicManagementPage"));
const ExamManagementPage = lazy(() => import("./pages/ExamManagementPage"));
const FinanceDirectory = lazy(() => import("./pages/FinanceDirectory"));
const HomeworkDirectory = lazy(() => import("./pages/HomeworkDirectory"));
const NotificationCenter = lazy(() => import("./pages/NotificationCenter"));
const ReportCardsDirectory = lazy(() => import("./pages/ReportCardsDirectory"));
const TimetableDirectory = lazy(() => import("./pages/TimetableDirectory"));
const GalleryManagementPage = lazy(() => import("./pages/GalleryManagementPage"));
const SchoolSetupPage = lazy(() => import("./pages/SchoolSetupPage"));
const FirstAdminPage = lazy(() => import("./pages/FirstAdminPage"));
const PortalGuard = lazy(() => import("./pages/PortalPages"));
const LoginPage = lazy(() => import("./pages/PublicPages").then(module => ({ default: module.LoginPage })));
const SchoolLifePage = lazy(() => import("./pages/SchoolLifePage"));
const ForFamiliesPage = lazy(() => import("./pages/ForFamiliesPage"));
const HowItWorksPage = lazy(() => import("./pages/HowItWorksPage"));
const PortalLoginPage = lazy(() => import("./pages/PortalLoginPage"));
const PortalAdminPage = lazy(() => import("./pages/PortalAdminPage"));
const PortalTeacherPage = lazy(() => import("./pages/PortalTeacherPage"));
const PortalParentPage = lazy(() => import("./pages/PortalParentPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const CookiesPage = lazy(() => import("./pages/CookiesPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

const MASTER_ADMIN_EMAILS = new Set([
  "menweprimaryandjunior@gmail.com",
  "menweschool.official@gmail.com",
]);
type PortalRole = "admin" | "teacher" | "parent";

function resolvePortalRole(
  user: { email?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> },
  profileRole?: unknown,
  profileActive = false
): PortalRole {
  if (MASTER_ADMIN_EMAILS.has(user.email?.trim().toLowerCase() ?? "")) return "admin";

  const role = typeof profileRole === "string"
    ? profileRole.toLowerCase()
    : typeof user.app_metadata?.role === "string"
      ? user.app_metadata.role.toLowerCase()
      : typeof user.user_metadata?.role === "string"
        ? user.user_metadata.role.toLowerCase()
        : "";

  if (profileActive && ["admin", "head_of_institution", "deputy_hoi", "super_admin"].includes(role)) return "admin";
  if (["teacher", "class_teacher", "classroom_teacher", "staff"].includes(role)) return "teacher";
  return "parent";
}

function PortalRouteGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: PortalRole[];
  children: ReactNode;
}) {
  const [, navigate] = useLocation();
  const auth = useSchoolAuth();

  useEffect(() => {
    if (auth.loading) return;

    if (!auth.user) {
      navigate("/portal/login");
      return;
    }

    const role = resolvePortalRole(
      auth.user,
      auth.profile?.role ?? auth.profile?.canonical_role,
      Boolean(auth.profile)
    );

    if (!allowedRoles.includes(role)) {
      navigate(
        role === "teacher"
          ? "/portal/teacher"
          : role === "admin"
            ? "/portal/admin"
            : "/portal/parent"
      );
    }
  }, [allowedRoles, auth.loading, auth.profile, auth.user, navigate]);

  if (auth.loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#061229] text-sm text-white">
        Restoring secure session…
      </div>
    );
  }

  if (!auth.user) return null;

  const role = resolvePortalRole(
    auth.user,
    auth.profile?.role ?? auth.profile?.canonical_role,
    Boolean(auth.profile)
  );

  if (!allowedRoles.includes(role)) return null;

  return <>{children}</>;
}

function AdminPortalRoute() {
  return <PortalRouteGuard allowedRoles={["admin"]}><PortalAdminPage /></PortalRouteGuard>;
}

function TeacherPortalRoute() {
  return <PortalRouteGuard allowedRoles={["admin", "teacher"]}><PortalTeacherPage /></PortalRouteGuard>;
}

function ParentPortalRoute() {
  return <PortalRouteGuard allowedRoles={["parent"]}><PortalParentPage /></PortalRouteGuard>;
}

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Menwe Primary & Junior School | Igoki, Abogeta",
      "/about": "About Menwe | Menwe Primary & Junior School",
      "/academics": "Academics & CBC Learning | Menwe Primary & Junior School",
      "/admissions": "Admissions | Menwe Primary & Junior School",
      "/contact": "Contact Menwe Primary & Junior School",
      "/portal/dashboard": "Learner Portal Dashboard | Menwe Primary & Junior School",
      "/portal/admin": "Staff & Admin Command Center | Menwe Primary & Junior School",
    };

    document.title = titles[location] ?? "Menwe Primary & Junior School | Igoki, Abogeta";
  }, [location]);

  return (
    <Switch>
      <Route path="/" component={MenweHeroHome} />
      <Route path="/about" component={AboutPage} />
      <Route path="/academics" component={AcademicsPage} />
      <Route path="/admissions" component={AdmissionsPage} />
      <Route path="/news-events" component={NewsEventsPage} />
      <Route path="/news" component={NewsEventsPage} />
      <Route path="/events" component={NewsEventsPage} />
      <Route path="/gallery" component={GalleryPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/school-life" component={SchoolLifePage} />
      <Route path="/families" component={ForFamiliesPage} />
      <Route path="/how-it-works" component={HowItWorksPage} />
      <Route path="/portal/login" component={PortalLoginPage} />
      <Route path="/portal/admin" component={AdminPortalRoute} />
      <Route path="/portal/teacher" component={TeacherPortalRoute} />
      <Route path="/portal/parent" component={ParentPortalRoute} />
      <Route path="/portal/dashboard" component={ParentPortalRoute} />
      <Route path="/portal/admin/academics" component={AcademicManagementPage} />
      <Route path="/portal/admin/attendance" component={AttendanceDirectory} />
      <Route path="/portal/admin/content" component={ContentManagementRoute} />
      <Route path="/portal/admin/directory" component={AcademicDirectoryRoute} />
      <Route path="/portal" component={PortalGuard} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/cookies" component={CookiesPage} />
      <Route path="/login" component={PortalAccessPage} />
      <Route path="/portal/password" component={LoginPage} />
      <Route path="/portal/email-link" component={MagicLinkPage} />
      <Route path="/portal/setup/first-admin" component={FirstAdminPage} />
      <Route path="/portal/setup" component={SchoolSetupPage} />
      <Route path="/portal/academics" component={AcademicManagementPage} />
      <Route path="/portal/exams" component={ExamManagementPage} />
      <Route path="/portal/attendance" component={AttendanceDirectory} />
      <Route path="/portal/report-cards" component={ReportCardsDirectory} />
      <Route path="/portal/finance" component={FinanceDirectory} />
      <Route path="/portal/homework" component={HomeworkDirectory} />
      <Route path="/portal/timetable" component={TimetableDirectory} />
      <Route path="/portal/notifications" component={NotificationCenter} />
      <Route path="/portal/gallery" component={GalleryManagementPage} />
      <Route path="/portal/:rest*" component={PortalGuard} />
      <Route path="*" component={NotFoundPage} />
    </Switch>
  );
}

const ContentManagementRoute = lazy(() => import("./pages/ContentManagement"));
const AcademicDirectoryRoute = lazy(() => import("./pages/AcademicDirectory"));

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[var(--paper)] text-sm text-[var(--ink)]/55">Loading Menwe…</div>}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
