import { useEffect } from "react";
import { useLocation } from "wouter";
import { getPortalRedirect, useSchoolAuth } from "@/contexts/SupabaseAuthContext";

export default function PortalCallbackPage() {
  const auth = useSchoolAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (auth.loading || auth.profileLoading) return;

    if (auth.user && auth.profile) {
      navigate(getPortalRedirect(auth.profile), { replace: true });
      return;
    }

    const timer = window.setTimeout(() => {
      navigate("/portal/login", { replace: true });
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [auth.loading, auth.profileLoading, auth.user, auth.profile, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--paper)] px-6 text-center text-[var(--ink)]">
      <div className="max-w-md">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#D89B28]/15 text-xl font-bold text-[#D89B28]">
          M
        </div>
        <h1 className="text-2xl font-bold">Confirming your Menwe account…</h1>
        <p className="mt-2 text-sm text-[var(--ink)]/60">
          Your email has been confirmed. We are restoring your secure school portal session.
        </p>
      </div>
    </div>
  );
}
