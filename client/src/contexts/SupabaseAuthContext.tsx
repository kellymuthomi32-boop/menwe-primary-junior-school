import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase, supabase } from "@/lib/supabase";

export type AppRole = "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
type CanonicalRole = "admin" | "head_of_institution" | "deputy_hoi" | "teacher" | "class_teacher" | "classroom_teacher" | "staff" | "finance_officer" | "finance_approver" | "parent" | "student";
export type SchoolProfile = { id: string; email: string | null; display_name: string | null; phone: string | null; role: AppRole; canonical_role: CanonicalRole; status: "ACTIVE" | "INACTIVE"; avatar_url: string | null; };
function normalizeRole(role: CanonicalRole): AppRole { if (role === "parent") return "PARENT"; if (role === "student") return "STUDENT"; if (["teacher", "class_teacher", "classroom_teacher", "staff"].includes(role)) return "TEACHER"; return "ADMIN"; }
function metadataRole(user: User): CanonicalRole | null { const role = user.app_metadata?.role; if (typeof role !== "string") return null; return role.toLowerCase() as CanonicalRole; }

type AuthContextValue = { user: User | null; session: Session | null; profile: SchoolProfile | null; loading: boolean; error: string | null; signIn: (email: string, password: string) => Promise<{ error?: string }>; sendMagicLink: (email: string) => Promise<{ error?: string }>; sendPasswordReset: (email: string) => Promise<{ error?: string }>; updatePassword: (password: string) => Promise<{ error?: string }>; signOut: () => Promise<void>; refreshProfile: () => Promise<void>; };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null); const [profile, setProfile] = useState<SchoolProfile | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const loadProfile = useCallback(async (userId: string | null) => {
    if (!userId || !supabase) { setProfile(null); return; }
    const { data, error: profileError } = await supabase.from("profiles").select("id,email,display_name,phone,role,is_disabled,is_approved").eq("id", userId).maybeSingle();
    if (profileError) { setError("Your account was authenticated, but its school profile could not be loaded."); setProfile(null); return; }
    if (!data) { setProfile(null); return; }
    const canonicalRole = data.role as CanonicalRole;
    setProfile({ id: data.id, email: data.email, display_name: data.display_name || null, phone: data.phone || null, canonical_role: canonicalRole, role: normalizeRole(canonicalRole), status: data.is_disabled ? "INACTIVE" : "ACTIVE", avatar_url: null });
  }, []);
  useEffect(() => {
    if (!supabase) { setError("The portal has not been configured with Supabase yet."); setLoading(false); return; }
    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => { if (!active) return; setSession(data.session); await loadProfile(data.session?.user.id ?? null); if (active) setLoading(false); }).catch(() => { if (active) { setError("Unable to restore your school session."); setLoading(false); } });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); void loadProfile(nextSession?.user.id ?? null); setLoading(false); });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, [loadProfile]);
  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null, session, profile, loading, error,
    signIn: async (email, password) => { const { error: signInError } = await getSupabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password }); return signInError ? { error: signInError.message } : {}; },
    sendMagicLink: async email => { const { error: magicLinkError } = await getSupabase().auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: `${window.location.origin}/portal/dashboard`, shouldCreateUser: false } }); return magicLinkError ? { error: magicLinkError.message } : {}; },
    sendPasswordReset: async email => { const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/portal/password?mode=update-password` }); return resetError ? { error: resetError.message } : {}; },
    updatePassword: async password => { const { error: updateError } = await getSupabase().auth.updateUser({ password }); return updateError ? { error: updateError.message } : {}; },
    signOut: async () => { await getSupabase().auth.signOut(); }, refreshProfile: async () => loadProfile(session?.user.id ?? null),
  }), [error, loadProfile, loading, profile, session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useSchoolAuth() { const context = useContext(AuthContext); if (!context) throw new Error("useSchoolAuth must be used inside SupabaseAuthProvider"); return context; }
export function isAdministrator(role: AppRole | undefined) { return role === "SUPER_ADMIN" || role === "ADMIN"; }
export function getPortalRedirect(user: User | null): "/portal/admin" | "/portal/teacher" | "/portal/dashboard" { if (!user) return "/portal/dashboard"; const role = metadataRole(user); if (user.email?.trim().toLowerCase() === "menweprimaryandjunior@gmail.com" || role === "admin" || role === "head_of_institution" || role === "deputy_hoi") return "/portal/admin"; if (role === "teacher" || role === "class_teacher" || role === "classroom_teacher" || role === "staff") return "/portal/teacher"; return "/portal/dashboard"; }
