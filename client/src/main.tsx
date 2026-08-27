import { createRoot } from "react-dom/client";
import App from "./App";
import { SupabaseAuthProvider } from "./contexts/SupabaseAuthContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <SupabaseAuthProvider>
    <App />
  </SupabaseAuthProvider>
);
