import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import MagicLinkPage from "./pages/MagicLinkPage";
import PortalAccessPage from "./pages/PortalAccessPage";
import AttendanceDirectory from "./pages/AttendanceDirectory";
import AcademicManagementPage from "./pages/AcademicManagementPage";
import ExamManagementPage from "./pages/ExamManagementPage";
import FinanceDirectory from "./pages/FinanceDirectory";
import HomeworkDirectory from "./pages/HomeworkDirectory";
import NotificationCenter from "./pages/NotificationCenter";
import ReportCardsDirectory from "./pages/ReportCardsDirectory";
import TimetableDirectory from "./pages/TimetableDirectory";
import { AdmissionsPage, ContactPage, EditorialPage, EventsPage, GalleryPage, HomePage, LoginPage, NewsPage } from "./pages/PublicPages";

const PortalGuard = lazy(() => import("./pages/PortalPages"));
function Router() { return <Switch>
<Route path="/" component={HomePage} /><Route path="/about">{() => <EditorialPage slug="about" eyebrow="Our school" defaultTitle="About Menwe" description="School leaders can publish the school’s history, mission, vision, values, leadership message, teaching approach, and facilities information here." />}</Route><Route path="/academics">{() => <EditorialPage slug="academics" eyebrow="Learning" defaultTitle="Academics" description="Academic programmes, subjects, curriculum information, and co-curricular activities are published by authorised school administrators." />}</Route>
<Route path="/admissions" component={AdmissionsPage} /><Route path="/news" component={NewsPage} /><Route path="/events" component={EventsPage} /><Route path="/gallery" component={GalleryPage} /><Route path="/contact" component={ContactPage} />
<Route path="/portal/login" component={PortalAccessPage} /><Route path="/portal/password" component={LoginPage} /><Route path="/portal/email-link" component={MagicLinkPage} />
<Route path="/portal/academics" component={AcademicManagementPage} /><Route path="/portal/exams" component={ExamManagementPage} /><Route path="/portal/attendance" component={AttendanceDirectory} /><Route path="/portal/report-cards" component={ReportCardsDirectory} /><Route path="/portal/finance" component={FinanceDirectory} /><Route path="/portal/homework" component={HomeworkDirectory} /><Route path="/portal/timetable" component={TimetableDirectory} /><Route path="/portal/notifications" component={NotificationCenter} />
<Route path="/portal/:rest*" component={PortalGuard} /><Route path="/portal" component={PortalGuard} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }
export default function App(){return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster/><Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#f4f5f1] text-sm text-[var(--ink)]/60">Loading secure portal…</div>}><Router/></Suspense></TooltipProvider></ThemeProvider></ErrorBoundary>;}
