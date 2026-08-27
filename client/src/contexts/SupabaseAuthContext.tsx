import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase, supabase } from "@/lib/supabase";

export type AppRole = "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

export type SchoolProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  avatar_url: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: SchoolProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string | null) => {
    if (!userId || !supabase) {
      setProfile(null);
      return;
    }
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,full_name,phone,role,status,avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) {
      setError("Your account was authenticated, but its school profile could not be loaded.");
      setProfile(null);
      return;
    }
    setProfile(data as SchoolProfile | null);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setError("The portal has not been configured with Supabase yet.");
      setLoading(false);
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id ?? null);
      if (active) setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession?.user.id ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      loading,
      error,
      signIn: async (email, password) => {
        const { error: signInError } = await getSupabase().auth.signInWithPassword({ email, password });
        return signInError ? { error: signInError.message } : {};
      },
      sendPasswordReset: async email => {
        const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/portal/login?mode=update-password`,
        });
        return resetError ? { error: resetError.message } : {};
      },
      updatePassword: async password => {
        const { error: updateError } = await getSupabase().auth.updateUser({ password });
        return updateError ? { error: updateError.message } : {};
      },
      signOut: async () => {
        await getSupabase().auth.signOut();
      },
      refreshProfile: async () => loadProfile(session?.user.id ?? null),
    }),
    [error, loadProfile, loading, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSchoolAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useSchoolAuth must be used inside SupabaseAuthProvider");
  return context;
}

export function isAdministrator(role: AppRole | undefined) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}
