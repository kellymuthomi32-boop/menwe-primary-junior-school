import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useEffect, type ComponentType } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./mobile-premium.css";

function lazyWithChunkRecovery<T extends ComponentType<any> = ComponentType<any>>(importer: () => Promise<{ default: T }>, key: string) {
  return lazy(async () => {
    try { return await importer(); }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const chunk = /dynamically imported module|loading chunk|chunkloaderror|failed to fetch/i.test(message);
      const storage = `menwe:chunk-recovery:${key}`;
      if (chunk && typeof window !== "undefined" && !sessionStorage.getItem(storage)) {
        sessionStorage.setItem(storage, "1"); window.location.reload(); await new Promise<never>(() => undefined);
      }
      if (typeof window !== "undefined") sessionStorage.removeItem(storage);
      throw error;
    }
  });
}

const HomePage = lazyWithChunkRecovery(() => import("./pages/MenweHeroHome"), "home");
const AcademicsPage = lazyWithChunkRecovery(() => import("./pages/AcademicsPage"), "academics");
const AdmissionsPage = lazyWithChunkRecovery(() => import("./pages/AdmissionsPage"), "admissions");
const NewsEventsPage = lazyWithChunkRecovery(() => import("./pages/CorePublicPages").then(m => ({ default: m.NewsEventsPage })), "news-events");
const NewsPage = lazyWithChunkRecovery(() => import("./pages/NewsPage"), "news");
const EventsPage = lazyWithChunkRecovery(() => import("./pages/EventsPage"), "events");
const GalleryPage = lazyWithChunkRecovery(() => import("./pages/GalleryPage"), "gallery");
const ContactPage = lazyWithChunkRecovery(() => import("./pages/ContactPage"), "contact");
const FormsPage = lazyWithChunkRecovery(() => import("./pages/FormsPage"), "forms");
const AboutPage = lazyWithChunkRecovery(() => import("./pages/AboutPage"), "about");
const SchoolLifePage = lazyWithChunkRecovery(() => import("./pages/SchoolLifePage"), "school-life");
const ForFamiliesPage = lazyWithChunkRecovery(() => import("./pages/ForFamiliesPage"), "families");
const HowItWorksPage = lazyWithChunkRecovery(() => import("./pages/HowItWorksPage"), "how-it-works");
const CalendarPage = lazyWithChunkRecovery(() => import("./pages/CalendarPage"), "calendar");
const TermsPage = lazyWithChunkRecovery(() => import("./pages/TermsPage"), "terms");
const PrivacyPage = lazyWithChunkRecovery(() => import("./pages/PrivacyPage"), "privacy");
const CookiesPage = lazyWithChunkRecovery(() => import("./pages/CookiesPage"), "cookies");
const NotFoundPage = lazyWithChunkRecovery(() => import("./pages/NotFoundPage"), "not-found");
const PortalAccessPage = lazyWithChunkRecovery(() => import("./pages/PortalAccessPage"), "portal-access");
const PortalAuthRoutes = lazyWithChunkRecovery(() => import("./pages/PortalAuthRoutes"), "portal-auth-routes");
const PortalRoutes = lazyWithChunkRecovery(() => import("./pages/PortalRoutes"), "portal-routes");

function GoBackButton() {
  const [location, go] = useLocation();
  const canGoBack = typeof window !== "undefined" && window.history.length > 1;
  const handleBack = () => { if (canGoBack) window.history.back(); else if (location !== "/") go("/"); };
  if (location === "/") return null;
  return (
    <button type="button" onClick={handleBack} aria-label="Go back to the previous page" className="fixed left-4 top-[84px] z-[100] inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-4 py-2.5 text-sm font-semibold text-[#061229] shadow-md backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#D89B28] focus:ring-offset-2 lg:top-4 dark:border-slate-700 dark:bg-slate-900/95 dark:text-white">
      <span aria-hidden="true" className="text-lg leading-none">←</span><span>Go Back</span>
    </button>
  );
}

function LoginRedirect() {
  const [, go] = useLocation();
  useEffect(() => { go("/portal/login"); }, [go]);
  return <div className="grid min-h-screen place-items-center bg-[var(--paper)] text-sm text-[var(--ink)]/55">Redirecting to Menwe portal login…</div>;
}

function Router() {
  const [location] = useLocation();
  useEffect(() => { document.title = location === "/portal/admin" ? "Admin Command Center | Menwe Primary & Junior School" : location === "/portal/teacher" ? "Teacher Workspace | Menwe Primary & Junior School" : location === "/portal/parent" ? "Family Workspace | Menwe Primary & Junior School" : location === "/news" ? "News | Menwe Primary & Junior School" : location === "/events" ? "Events | Menwe Primary & Junior School" : location === "/forms" ? "Forms & Feedback | Menwe Primary & Junior School" : "Menwe Primary & Junior School | Igoki, Abogeta"; }, [location]);
  return <Switch>
    <Route path="/" component={HomePage}/><Route path="/about" component={AboutPage}/><Route path="/academics" component={AcademicsPage}/><Route path="/admissions" component={AdmissionsPage}/><Route path="/forms" component={FormsPage}/><Route path="/news-events" component={NewsEventsPage}/><Route path="/news" component={NewsPage}/><Route path="/events" component={EventsPage}/><Route path="/gallery" component={GalleryPage}/><Route path="/contact" component={ContactPage}/><Route path="/school-life" component={SchoolLifePage}/><Route path="/families" component={ForFamiliesPage}/><Route path="/how-it-works" component={HowItWorksPage}/>
    <Route path="/portal/login" component={PortalAuthRoutes}/><Route path="/portal/callback" component={PortalAuthRoutes}/><Route path="/portal" component={PortalAuthRoutes}/><Route path="/portal/password" component={PortalAuthRoutes}/><Route path="/portal/email-link" component={PortalAuthRoutes}/><Route path="/login" component={LoginRedirect}/>
    <Route path="/portal/:rest*" component={PortalRoutes}/>
    <Route path="/calendar" component={CalendarPage}/><Route path="/terms" component={TermsPage}/><Route path="/privacy" component={PrivacyPage}/><Route path="/cookies" component={CookiesPage}/><Route path="*" component={NotFoundPage}/>
  </Switch>;
}

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster/><Suspense fallback={<div className="grid min-h-screen place-items-center bg-[var(--paper)] text-sm text-[var(--ink)]/55">Loading Menwe…</div>}><Router/><GoBackButton/></Suspense></TooltipProvider></ThemeProvider></ErrorBoundary>; }
