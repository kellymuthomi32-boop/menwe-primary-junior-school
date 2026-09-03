import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./mobile-responsive.css";
import "./homepage-premium.css";
import "./header-micro.css";
import "./brand-alignment.css";

// The portal no longer relies on a service worker for application delivery.
// Unregister any older worker so stale cached bundles cannot hold the public
// site on an obsolete or broken chunk while the browser is loading.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => void registration.unregister());
    });
    if ("caches" in window) {
      void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
    }
  });
}

// IndexedDB/offline reconciliation is non-critical for the initial render.
// Load the sync module only after the browser has had a chance to paint so
// Supabase and offline-sync code stay out of the public startup bundle.
if (typeof indexedDB !== "undefined") {
  const scheduleOfflineSync = () => {
    void import("./lib/offlineSync").then(({ installOfflineSync }) => installOfflineSync()).catch(() => undefined);
  };
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(scheduleOfflineSync, { timeout: 3000 });
  } else {
    window.setTimeout(scheduleOfflineSync, 1500);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
