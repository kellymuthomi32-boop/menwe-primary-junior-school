/* Civic Evidence Ledger navigation utility: keep public route intent fast without changing protected data flows. */

const routePrefetchers: Record<string, () => Promise<unknown>> = {
  "/about": () => import("../pages/AboutPage"),
  "/academics": () => import("../pages/AcademicsPage"),
  "/admissions": () => import("../pages/AdmissionsPage"),
  "/news": () => import("../pages/CorePublicPages"),
  "/events": () => import("../pages/CorePublicPages"),
  "/gallery": () => import("../pages/GalleryPage"),
  "/contact": () => import("../pages/CorePublicPages"),
  "/school-life": () => import("../pages/SchoolLifePage"),
  "/families": () => import("../pages/ForFamiliesPage"),
  "/how-it-works": () => import("../pages/HowItWorksPage"),
  "/calendar": () => import("../pages/CalendarPage"),
  "/terms": () => import("../pages/TermsPage"),
  "/privacy": () => import("../pages/PrivacyPage"),
  "/cookies": () => import("../pages/CookiesPage"),
  "/portal": () => import("../pages/PortalLoginPage"),
  "/portal/login": () => import("../pages/PortalLoginPage"),
};

const prefetched = new Set<string>();

export function prefetchPublicRoute(path: string) {
  const importer = routePrefetchers[path];
  if (!importer || prefetched.has(path)) return;
  prefetched.add(path);
  void importer().catch(() => {
    prefetched.delete(path);
  });
}
