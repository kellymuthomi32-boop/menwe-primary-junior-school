import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getSupabase, supabase } from "@/lib/supabase";

export type AppRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "HEAD_OF_INSTITUTION"
  | "DEPUTY_HOI"
  | "TEACHER"
  | "STUDENT"
  | "PARENT";

type CanonicalRole =
  | "admin"
  | "head_of_institution"
  | "deputy_hoi"
  | "teacher"
  | "class_teacher"
  | "classroom_teacher"
  | "staff"
  | "finance_officer"
  | "finance_approver"
  | "parent"
  | "student";

export type SchoolProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  role: AppRole;
  canonical_role: CanonicalRole;
  status: "ACTIVE" | "INACTIVE";
  avatar_url: string | null;
};

function normalizeRole(role: string | null | undefined): AppRole {
  const value = role?.toString().toUpperCase();

  if (value === "PARENT") return "PARENT";
  if (value === "STUDENT") return "STUDENT";
  if (["TEACHER", "CLASS_TEACHER", "CLASSROOM_TEACHER", "STAFF"].includes(value ?? "")) return "TEACHER";
  if (value === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (value === "HEAD_OF_INSTITUTION") return "HEAD_OF_INSTITUTION";
  if (value === "DEPUTY_HOI") return "DEPUTY_HOI";
  return "ADMIN";
}

function metadataRole(user: User): CanonicalRole | null {
  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  return typeof role === "string" ? role.toLowerCase() as CanonicalRole : null;
}

function profileFromUserMetadata(user: User): SchoolProfile | null {
  const canonicalRole = metadataRole(user);
  if (!canonicalRole) return null;

  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email?.split("@")[0] ||
    null;

  return {
    id: user.id,
    email: user.email ?? null,
    display_name: displayName,
    phone: typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : null,
    role: normalizeRole(canonicalRole),
    canonical_role: canonicalRole,
    status: "ACTIVE",
    avatar_url: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
  };
}

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: SchoolProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  sendMagicLink: (email: string) => Promise<{ error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<SchoolProfile | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string | null): Promise<SchoolProfile | null> => {
    try {
      if (!userId || !supabase) {
        setProfile(null);
        return null;
      }

      // Never allow a slow/blocked profiles query to keep the whole portal on
      // the loading screen. Five seconds is long enough for a normal request
      // while still giving the Auth session a deterministic fallback.
      const profileRequest = supabase
        .from("profiles")
        .select("id,email,full_name,phone,role,status,avatar_url")
        .eq("id", userId)
        .maybeSingle();

      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("PROFILE_LOOKUP_TIMEOUT")), 5000);
      });

      const { data, error: profileError } = await Promise.race([
        profileRequest,
        timeout,
      ]);

      if (!profileError && data) {
        const canonicalRole = data.role?.toString().toLowerCase() as CanonicalRole;
        const normalizedProfile: SchoolProfile = {
          id: data.id,
          email: data.email ?? null,
          display_name: data.full_name ?? null,
          phone: data.phone ?? null,
          role: normalizeRole(data.role),
          canonical_role: canonicalRole || "student",
          status: data.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
          avatar_url: data.avatar_url ?? null,
        };

        setError(null);
        setProfile(normalizedProfile);
        return normalizedProfile;
      }

      if (profileError) {
        console.error("Profile loading error:", profileError);
      } else {
        console.warn("No profile found for user ID:", userId);
      }

      // Auth itself is authoritative for the existence of the signed-in
      // account. If the profile row is missing or temporarily unreachable,
      // use the role captured during the verified registration flow so the
      // user is not stranded after a successful login.
      const { data: authUserData, error: authUserError } = await supabase.auth.getUser();
      if (!authUserError && authUserData.user?.id === userId) {
        const fallbackProfile = profileFromUserMetadata(authUserData.user);
        if (fallbackProfile) {
          console.warn("Using Auth metadata fallback because no readable profile row exists.");
          setError(null);
          setProfile(fallbackProfile);
          return fallbackProfile;
        }
      }

      setError("Your account was authenticated, but your school profile could not be loaded.");
      setProfile(null);
      return null;
    } catch (err) {
      console.error("Unexpected profile error:", err);

      try {
        const { data: authUserData } = await supabase.auth.getUser();
        if (authUserData.user?.id === userId) {
          const fallbackProfile = profileFromUserMetadata(authUserData.user);
          if (fallbackProfile) {
            setError(null);
            setProfile(fallbackProfile);
            return fallbackProfile;
          }
        }
      } catch (fallbackError) {
        console.error("Auth metadata fallback failed:", fallbackError);
      }

      setError("Your account was authenticated, but your school profile could not be loaded.");
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setError("The portal has not been configured with Supabase yet.");
      setLoading(false);
      return;
    }

    let active = true;

    const initialise = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) console.error("Session restoration error:", sessionError);
        if (!active) return;

        setSession(data.session ?? null);
        if (data.session?.user?.id) {
          await loadProfile(data.session.user.id);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Initialization error:", err);
        if (active) setError("Unable to restore your school session.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void initialise();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);

      setTimeout(async () => {
        if (!active) return;
        if (nextSession?.user?.id) {
          await loadProfile(nextSession.user.id);
        } else {
          setProfile(null);
          setError(null);
        }
        setLoading(false);
      }, 0);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    profile,
    loading,
    error,

    signIn: async (email, password) => {
      setError(null);
      const { error: signInError } = await getSupabase().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      return signInError ? { error: signInError.message } : {};
    },

    sendMagicLink: async (email) => {
      setError(null);
      const { error: magicError } = await getSupabase().auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/portal/dashboard`,
          shouldCreateUser: false,
        },
      });
      return magicError ? { error: magicError.message } : {};
    },

    sendPasswordReset: async (email) => {
      setError(null);
      const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/portal/password?mode=update-password`,
      });
      return resetError ? { error: resetError.message } : {};
    },

    updatePassword: async (password) => {
      setError(null);
      const { error: updateError } = await getSupabase().auth.updateUser({ password });
      return updateError ? { error: updateError.message } : {};
    },

    signOut: async () => {
      await getSupabase().auth.signOut();
      setProfile(null);
      setSession(null);
      setError(null);
    },

    refreshProfile: async () => loadProfile(session?.user.id ?? null),
  }), [error, loadProfile, loading, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSchoolAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useSchoolAuth must be used inside SupabaseAuthProvider");
  return context;
}

export function isAdministrator(role: AppRole | undefined) {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "HEAD_OF_INSTITUTION" || role === "DEPUTY_HOI";
}

export function getPortalRedirect(
  profileOrUser: SchoolProfile | User | null,
  fallbackUser?: User | null
): "/portal/admin" | "/portal/teacher" | "/portal/dashboard" {
  if (!profileOrUser) return "/portal/dashboard";

  let role = "";
  let email = "";

  if ("canonical_role" in profileOrUser || "role" in profileOrUser) {
    const profile = profileOrUser as SchoolProfile;
    role = profile.role?.toString().toUpperCase() || "";
    email = profile.email?.trim().toLowerCase() || "";
  } else {
    const user = profileOrUser as User;
    role = metadataRole(user)?.toUpperCase() || "";
    email = user.email?.trim().toLowerCase() || "";
  }

  if (!email && fallbackUser) email = fallbackUser.email?.trim().toLowerCase() || "";

  if (
    email === "menweschool.official@gmail.com" ||
    email === "menweprimaryandjunior@gmail.com" ||
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    role === "HEAD_OF_INSTITUTION" ||
    role === "DEPUTY_HOI"
  ) return "/portal/admin";

  if (["TEACHER", "CLASS_TEACHER", "CLASSROOM_TEACHER", "STAFF"].includes(role)) {
    return "/portal/teacher";
  }

  return "/portal/dashboard";
}
