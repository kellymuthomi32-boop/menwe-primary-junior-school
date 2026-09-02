import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { getPortalRedirect, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";

export default function PortalCallbackPage() {
  const auth = useSchoolAuth();
  const [, navigate] = useLocation();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    if (auth.loading || auth.profileLoading) return;

    const restoreAndRedirect = async () => {
      startedRef.current = true;
      const client = getSupabase();

      // Supabase may finish exchanging the confirmation link just after the
      // provider's initial session check. Read the session again here so the
      // confirmed user is sent straight to the school dashboard.
      const { data } = await client.auth.getSession();
      const sessionUserId = data.session?.user?.id ?? auth.user?.id ?? null;

      if (sessionUserId) {
        const schoolProfile = auth.profile ?? await auth.refreshProfile();
        if (schoolProfile) {
          navigate(getPortalRedirect(schoolProfile), { replace: true });
          return;
        }

        // Give the auth state listener one short chance to finish the profile
        // lookup before falling back to login. Do not immediately bounce a
        // successfully confirmed user back to the login page.
        startedRef.current = false;
        window.setTimeout(() => {
          if (window.location.pathname === "/portal/callback") {
            window.location.replace("/portal/login?confirmed=1");
          }
        }, 10000);
        return;
      }

      // No session means the confirmation exchange did not complete.
      // Preserve the confirmation state in the login page so the user gets a
      // clear message rather than appearing to have been logged out silently.
      window.location.replace("/portal/login?confirmed=1");
    };

    void restoreAndRedirect();
  }, [auth.loading, auth.profileLoading, auth.user, auth.profile, auth.refreshProfile, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--paper)] px-6 text-center text-[var(--ink)]">
      <div className="max-w-md">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#D89B28]/15 text-xl font-bold text-[#D89B28]">
          M
        </div>
        <h1 className="text-2xl font-bold">Opening your Menwe dashboard…</h1>
        <p className="mt-2 text-sm text-[var(--ink)]/60">
          Your email is confirmed. We are securely restoring your school account and opening your dashboard.
        </p>
      </div>
    </div>
  );
}
