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
if (typeof indexedDB !== "undefined") installOfflineSync();

createRoot(document.getElementById("root")!).render(
  <SupabaseAuthProvider>
    <App />
  </SupabaseAuthProvider>
);
