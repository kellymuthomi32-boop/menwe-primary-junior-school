import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./mobile-responsive.css";
import "./homepage-premium.css";
import "./header-micro.css";
import "./brand-alignment.css";
import "./marksheet-print.css";

// The school portal uses a service worker for teacher push notifications.
// Do not unregister service workers on startup: doing so would disable
// background push delivery on phones.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.getRegistrations().catch(() => undefined);
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

createRoot(document.getElementById("root")!).render(<App />);
