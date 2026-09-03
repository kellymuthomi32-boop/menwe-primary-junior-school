import { createRoot } from "react-dom/client";
import App from "./App";
import { SupabaseAuthProvider } from "./contexts/SupabaseAuthContext";
import { installOfflineSync } from "./lib/offlineSync";
import "./index.css";
import "./mobile-responsive.css";
import "./homepage-premium.css";
import "./header-micro.css";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js"));
}

// IndexedDB/offline reconciliation is non-critical for the initial render.
// Schedule it after the browser gets a chance to paint the page so public and
// portal entry screens are not competing with startup work.
if (typeof indexedDB !== "undefined") {
  const scheduleOfflineSync = () => installOfflineSync();
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(scheduleOfflineSync, { timeout: 3000 });
  } else {
    window.setTimeout(scheduleOfflineSync, 1500);
  }
}

createRoot(document.getElementById("root")!).render(
  <SupabaseAuthProvider>
    <App />
  </SupabaseAuthProvider>
);
