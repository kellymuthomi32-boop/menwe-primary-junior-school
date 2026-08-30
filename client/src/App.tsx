import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import MenweHeroHome from "./pages/MenweHeroHome";
import AcademicsPage from "./pages/AcademicsPage";
import AdmissionsPage from "./pages/AdmissionsPage";
import NewsEventsPage from "./pages/NewsEventsPage";
import GalleryPage from "./pages/GalleryPage";
import ContactPage from "./pages/ContactPage";
import "./mobile-premium.css";
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
const RichAboutPage = lazy(() => import("./pages/RichPublicPages").then(module => ({ default: module.RichAboutPage })));
const SchoolLifePage = lazy(() => import("./pages/DiscoverPages").then(module => ({ default: module.SchoolLifePage })));
const FamiliesPage = lazy(() => import("./pages/DiscoverPages").then(module => ({ default: module.FamiliesPage })));
const HowItWorksPage = lazy(() => import("./pages/DiscoverPages").then(module => ({ default: module.HowItWorksPage })));
const LegalPage = lazy(() => import("./pages/LegalPages").then(module => ({ default: module.LegalPage })));
function Router(){return <Switch>
<Route path="/" component={MenweHeroHome}/>
<Route path="/about" component={RichAboutPage}/><Route path="/academics" component={AcademicsPage}/><Route path="/admissions" component={AdmissionsPage}/>
<Route path="/news-events" component={NewsEventsPage}/><Route path="/news" component={NewsEventsPage}/><Route path="/events" component={NewsEventsPage}/><Route path="/gallery" component={GalleryPage}/><Route path="/contact" component={ContactPage}/>
<Route path="/school-life" component={SchoolLifePage}/><Route path="/families" component={FamiliesPage}/><Route path="/how-it-works" component={HowItWorksPage}/>
<Route path="/terms">{()=><LegalPage type="terms"/>}</Route><Route path="/privacy">{()=><LegalPage type="privacy"/>}</Route><Route path="/cookies">{()=><LegalPage type="cookies"/>}</Route>
<Route path="/login" component={PortalAccessPage}/><Route path="/portal/login" component={PortalAccessPage}/><Route path="/portal/password" component={LoginPage}/><Route path="/portal/email-link" component={MagicLinkPage}/><Route path="/portal/setup/first-admin" component={FirstAdminPage}/><Route path="/portal/setup" component={SchoolSetupPage}/>
<Route path="/portal/academics" component={AcademicManagementPage}/><Route path="/portal/exams" component={ExamManagementPage}/><Route path="/portal/attendance" component={AttendanceDirectory}/><Route path="/portal/report-cards" component={ReportCardsDirectory}/><Route path="/portal/finance" component={FinanceDirectory}/><Route path="/portal/homework" component={HomeworkDirectory}/><Route path="/portal/timetable" component={TimetableDirectory}/><Route path="/portal/notifications" component={NotificationCenter}/><Route path="/portal/gallery" component={GalleryManagementPage}/>
<Route path="/portal/:rest*" component={PortalGuard}/><Route path="/portal" component={PortalGuard}/><Route path="/404" component={NotFound}/><Route component={NotFound}/></Switch>}
export default function App(){return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster/><Suspense fallback={<div className="grid min-h-screen place-items-center bg-[var(--paper)] text-sm text-[var(--ink)]/55">Loading Menwe…</div>}><Router/></Suspense></TooltipProvider></ThemeProvider></ErrorBoundary>}
