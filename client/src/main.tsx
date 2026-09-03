import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./mobile-responsive.css";
import "./homepage-premium.css";
import "./header-micro.css";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js"));
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
