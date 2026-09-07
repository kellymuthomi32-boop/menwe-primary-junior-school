import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase, supabase } from "@/lib/supabase";

export type AppRole = "SUPER_ADMIN" | "ADMIN" | "HEAD_OF_INSTITUTION" | "DEPUTY_HOI" | "TEACHER" | "STUDENT" | "PARENT";
type CanonicalRole = "super_admin" | "admin" | "head_of_institution" | "deputy_hoi" | "teacher" | "class_teacher" | "classroom_teacher" | "staff" | "finance_officer" | "finance_approver" | "parent" | "student";
const CANONICAL_ROLES = new Set<CanonicalRole>(["super_admin", "admin", "head_of_institution", "deputy_hoi", "teacher", "class_teacher", "classroom_teacher", "staff", "finance_officer", "finance_approver", "parent", "student"]);
const SESSION_TIMEOUT_MS = 3000;
const PROFILE_TIMEOUT_MS = 3000;

export type SchoolProfile = { id: string; email: string | null; full_name: string | null; display_name: string | null; phone: string | null; role: AppRole; canonical_role: CanonicalRole; status: "ACTIVE" | "INACTIVE"; avatar_url: string | null };

export function normalizeRole(role: string | null | undefined): AppRole | null {
  const value = role?.trim().toUpperCase();
  if (value === "PARENT") return "PARENT";
  if (value === "STUDENT") return "STUDENT";
  if (["TEACHER", "CLASS_TEACHER", "CLASSROOM_TEACHER", "STAFF"].includes(value ?? "")) return "TEACHER";
  if (value === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (value === "HEAD_OF_INSTITUTION") return "HEAD_OF_INSTITUTION";
  if (value === "DEPUTY_HOI") return "DEPUTY_HOI";
  if (value === "ADMIN") return "ADMIN";
  return null;
}

export function toSchoolProfile(data: { id: string; email?: string | null; full_name?: string | null; phone?: string | null; role?: string | null; status?: string | null; avatar_url?: string | null }): SchoolProfile | null {
  const canonicalRole = data.role?.trim().toLowerCase();
  const role = normalizeRole(data.role);
  if (!role || !canonicalRole || !CANONICAL_ROLES.has(canonicalRole as CanonicalRole)) return null;
  return { id: data.id, email: data.email ?? null, full_name: data.full_name ?? null, display_name: data.full_name ?? null, phone: data.phone ?? null, role, canonical_role: canonicalRole as CanonicalRole, status: data.status === "INACTIVE" ? "INACTIVE" : "ACTIVE", avatar_url: data.avatar_url ?? null };
}

type AuthContextValue = { user: User | null; session: Session | null; profile: SchoolProfile | null; loading: boolean; profileLoading: boolean; error: string | null; signIn: (email: string, password: string) => Promise<{ error?: string }>; sendMagicLink: (email: string) => Promise<{ error?: string }>; sendPasswordReset: (email: string) => Promise<{ error?: string }>; updatePassword: (password: string) => Promise<{ error?: string }>; signOut: () => Promise<void>; refreshProfile: () => Promise<SchoolProfile | null> };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    Promise.resolve(promise).then(value => { window.clearTimeout(timer); resolve(value); }, error => { window.clearTimeout(timer); reject(error); });
  });
}

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<{ userId: string; promise: Promise<SchoolProfile | null> } | null>(null);
  const initializedRef = useRef(false);

  const loadProfile = useCallback(async (userId: string | null): Promise<SchoolProfile | null> => {
    if (!userId || !supabase) { setProfile(null); setProfileLoading(false); return null; }
    if (requestRef.current?.userId === userId) return requestRef.current.promise;
    const request = (async () => {
      setProfileLoading(true); setError(null);
      try {
        const profileRequest = supabase.from("profiles").select("id,email,full_name,phone,role,status,avatar_url").eq("id", userId).maybeSingle();
        const { data, error: profileError } = await withTimeout(profileRequest, PROFILE_TIMEOUT_MS, "PROFILE_LOOKUP_TIMEOUT");
        if (profileError) { console.error("Profile lookup failed:", profileError); setProfile(null); setError("We could not load your school profile. Please try again."); return null; }
        if (!data) { setProfile(null); setError("Your account is authenticated, but no school profile is available yet. Please contact school administration."); return null; }
        const normalized = toSchoolProfile(data);
        if (!normalized) { setProfile(null); setError("Your school profile has an unsupported role. Please contact school administration."); return null; }
        if (normalized.status !== "ACTIVE") { setProfile(null); setError("Your school portal access is currently inactive. Please contact school administration."); return null; }
        setProfile(normalized); setError(null); return normalized;
      } catch (err) {
        console.error("Unexpected profile lookup error:", err); setProfile(null);
        setError(err instanceof Error && err.message === "PROFILE_LOOKUP_TIMEOUT" ? "The school profile lookup timed out. Please try again." : "We could not load your school profile. Please try again."); return null;
      } finally { setProfileLoading(false); }
    })();
    requestRef.current = { userId, promise: request };
    try { return await request; } finally { if (requestRef.current?.promise === request) requestRef.current = null; }
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) { setError("The portal has not been configured with Supabase yet."); setLoading(false); setProfileLoading(false); return; }
    let active = true;
    const initialise = async () => {
      try {
        const { data, error: sessionError } = await withTimeout(client.auth.getSession(), SESSION_TIMEOUT_MS, "SESSION_RESTORE_TIMEOUT");
        if (!active) return;
        if (sessionError) console.error("Session restoration error:", sessionError);
        const nextSession = data.session ?? null; setSession(nextSession);
        if (nextSession?.user?.id) await loadProfile(nextSession.user.id); else { setProfile(null); setProfileLoading(false); setError(null); }
      } catch (err) {
        console.error("Auth initialization error:", err); if (!active) return; setSession(null); setProfile(null); setProfileLoading(false);
        setError(err instanceof Error && err.message === "SESSION_RESTORE_TIMEOUT" ? "Session restoration timed out. You can sign in again." : "Unable to restore your school session. Please sign in again.");
      } finally { if (active) { initializedRef.current = true; setLoading(false); } }
    };
    void initialise();
    const { data: subscription } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return; setSession(nextSession);
      if (!nextSession?.user?.id) { setProfile(null); setProfileLoading(false); setError(null); setLoading(false); return; }
      if (event === "INITIAL_SESSION" && !initializedRef.current) return;
      if (!["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) return;
      window.setTimeout(() => { if (!active) return; setLoading(true); void loadProfile(nextSession.user.id).finally(() => { if (active) setLoading(false); }); }, 0);
    });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null, session, profile, loading, profileLoading, error,
    signIn: async (email, password) => { setError(null); const { error: signInError } = await getSupabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password }); return signInError ? { error: signInError.message } : {}; },
    sendMagicLink: async email => { setError(null); const { error: magicError } = await getSupabase().auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: `${window.location.origin}/portal/callback`, shouldCreateUser: false } }); return magicError ? { error: magicError.message } : {}; },
    sendPasswordReset: async email => { setError(null); const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/portal/password?mode=update-password` }); return resetError ? { error: resetError.message } : {}; },
    updatePassword: async password => { setError(null); const { error: updateError } = await getSupabase().auth.updateUser({ password }); return updateError ? { error: updateError.message } : {}; },
    signOut: async () => { await getSupabase().auth.signOut(); setProfile(null); setProfileLoading(false); setSession(null); setError(null); setLoading(false); },
    refreshProfile: async () => loadProfile(session?.user.id ?? null),
  }), [error, loadProfile, loading, profile, profileLoading, session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSchoolAuth() { const context = useContext(AuthContext); if (!context) throw new Error("useSchoolAuth must be used inside SupabaseAuthProvider"); return context; }
export function isAdministrator(role: AppRole | undefined) { return role === "SUPER_ADMIN" || role === "ADMIN" || role === "HEAD_OF_INSTITUTION" || role === "DEPUTY_HOI"; }
export function getPortalRedirect(profileOrUser: SchoolProfile | User, fallbackUser?: User): "/portal/admin" | "/portal/teacher" | "/portal/parent" {
  const profileRoleValue = "role" in profileOrUser ? profileOrUser.role : undefined;
  const profileRole = typeof profileRoleValue === "string" && ["ADMIN", "SUPER_ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI", "TEACHER", "STUDENT", "PARENT"].includes(profileRoleValue) ? profileRoleValue as AppRole : null;
  const metadataRole = fallbackUser?.user_metadata?.role ?? ("user_metadata" in profileOrUser ? profileOrUser.user_metadata?.role : null);
  const role = normalizeRole(profileRole ?? (typeof metadataRole === "string" ? metadataRole : null));
  if (role && isAdministrator(role)) return "/portal/admin";
  if (role === "TEACHER") return "/portal/teacher";
  return "/portal/parent";
}