import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./mobile-responsive.css";
import "./homepage-premium.css";
import "./header-micro.css";
import "./brand-alignment.css";
import "./marksheet-print.css";

// Application delivery no longer uses a service worker. Do not enumerate or
// delete browser caches during startup: that defeats normal HTTP/CDN caching
// and can make repeat visits much slower. Legacy workers should be removed
// once, outside the critical render path, rather than on every navigation.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    window.setTimeout(() => {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => void registration.unregister());
      }).catch(() => undefined);
    }, 5000);
  }, { once: true });
}

// IndexedDB/offline reconciliation is non-critical for the initial render.
// Load the sync module only after the browser has had a chance to paint so
// Supabase and offline-sync code stay out of the public startup bundle.
if (typeof indexedDB !== "undefined") {
  const scheduleOfflineSync = () => {
    void import("./lib/offlineSync").then(({ installOfflineSync }) => installOfflineSync()).catch(() => undefined);
  };
  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(scheduleOfflineSync, { timeout: 3000 });
  } else {
    globalThis.setTimeout(scheduleOfflineSync, 1500);
  }
}

// Keep the marksheet print stylesheet in the production entrypoint so every
// production build receives the latest A4 print rules.
createRoot(document.getElementById("root")!).render(<App />);
