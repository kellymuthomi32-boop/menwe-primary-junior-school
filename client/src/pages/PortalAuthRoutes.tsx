import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import { SupabaseAuthProvider } from "@/contexts/SupabaseAuthContext";

const PortalLoginPage = lazy(() => import("./PortalLoginPage"));
const PortalCallbackPage = lazy(() => import("./PortalCallbackPage"));

function Loading() {
  return <div className="grid min-h-screen place-items-center bg-[var(--paper)] text-sm text-[var(--ink)]/55">Loading Menwe portal…</div>;
}

export default function PortalAuthRoutes() {
  return (
    <SupabaseAuthProvider>
      <Suspense fallback={<Loading />}>
        <Switch>
          <Route path="/portal/login" component={PortalLoginPage} />
          <Route path="/portal/callback" component={PortalCallbackPage} />
          <Route path="/portal" component={PortalLoginPage} />
        </Switch>
      </Suspense>
    </SupabaseAuthProvider>
  );
}
