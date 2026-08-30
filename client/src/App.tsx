import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import MenweHeroHome from "./pages/MenweHeroHome";
import { supabase } from "./lib/supabase";
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

const MASTER_ADMIN_EMAIL = "menweprimaryandjunior@gmail.com";
type PortalRole = "admin" | "teacher" | "parent";

function resolvePortalRole(user: { email?: string | null; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> }): PortalRole {
  if (user.email?.trim().toLowerCase() === MASTER_ADMIN_EMAIL) return "admin";
  const raw = user.app_metadata?.role ?? user.user_metadata?.role;
  const role = typeof raw === "string" ? raw.toLowerCase() : "";
  if (["admin", "head_of_institution", "deputy_hoi", "super_admin"].includes(role)) return "admin";
  if (["teacher", "class_teacher", "classroom_teacher", "staff"].includes(role)) return "teacher";
  return "parent";
}

function PortalRouteGuard({ allowedRoles, children }: { allowedRoles: PortalRole[]; children: ReactNode }) {
  const [, navigate] = useLocation();
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let active = true;
    if (!supabase) { navigate("/portal/login"); return () => { active = false; }; }
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const user = data.session?.user;
      if (!user) { setChecking(false); navigate("/portal/login"); return; }
      const role = resolvePortalRole(user);
      if (allowedRoles.includes(role)) { setChecking(false); return; }
      setChecking(false);
      navigate(role === "teacher" ? "/portal/teacher" : role === "admin" ? "/portal/admin" : "/portal/parent");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const user = session?.user;
      if (!user) { navigate("/portal/login"); return; }
      const role = resolvePortalRole(user);
      if (!allowedRoles.includes(role)) navigate(role === "teacher" ? "/portal/teacher" : role === "admin" ? "/portal/admin" : "/portal/parent");
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [allowedRoles, navigate]);
  if (checking) return <div className="grid min-h-screen place-items-center bg-[#061229] text-sm text-white">Checking portal access…</div>;
  return <>{children}</>;
}

function AdminPortalRoute() { return <PortalRouteGuard allowedRoles={["admin"]}><PortalAdminPage /></PortalRouteGuard>; }
function TeacherPortalRoute() { return <PortalRouteGuard allowedRoles={["admin", "teacher"]}><PortalTeacherPage /></PortalRouteGuard>; }
function ParentPortalRoute() { return <PortalRouteGuard allowedRoles={["parent"]}><PortalParentPage /></PortalRouteGuard>; }

function Router() {
  const [location] = useLocation();
  useEffect(() => {
    const titles: Record<string, string> = { "/": "Menwe Primary & Junior School | Kionyo, Abogeta Sub-County", "/about": "About Menwe | Menwe Primary & Junior School", "/academics": "Academics & CBC Learning | Menwe Primary & Junior School", "/admissions": "Admissions | Menwe Primary & Junior School", "/contact": "Contact Menwe Primary & Junior School", "/portal/dashboard": "Learner Portal Dashboard | Menwe Primary & Junior School", "/portal/admin": "Staff & Admin Command Center | Menwe Primary & Junior School" };
    document.title = titles[location] ?? "Menwe Primary & Junior School | Kionyo, Abogeta Sub-County";
  }, [location]);
  return <Switch>
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
  </Switch>;
}

const ContentManagementRoute = lazy(() => import("./pages/ContentManagement"));
const AcademicDirectoryRoute = lazy(() => import("./pages/AcademicDirectory"));

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Suspense fallback={<div className="grid min-h-screen place-items-center bg-[var(--paper)] text-sm text-[var(--ink)]/55">Loading Menwe…</div>}><Router /></Suspense></TooltipProvider></ThemeProvider></ErrorBoundary>; }