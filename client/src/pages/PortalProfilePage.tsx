import { useState } from "react";
import { Loader2, Save, ShieldCheck, UserRound } from "lucide-react";
import { PortalLayout } from "@/components/PortalLayout";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";

function Field({ label, value }: { label: string; value: string }) {
  return <div className="menwe-card rounded-2xl p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--ink)]/45">{label}</p><p className="mt-2 break-words font-semibold text-[var(--ink)]">{value || "Not set"}</p></div>;
}

export default function PortalProfilePage() {
  const { user, profile, refreshProfile } = useSchoolAuth();
  const [fullName, setFullName] = useState(profile?.display_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id || !profile) return;
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    if (!cleanName) { setError("Full name is required."); return; }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const db = getSupabase();
      const { error: profileError } = await db.from("profiles").update({ full_name: cleanName, phone: cleanPhone || null }).eq("id", user.id);
      if (profileError) throw profileError;
      const { error: authError } = await db.auth.updateUser({ data: { full_name: cleanName, phone: cleanPhone || null } });
      if (authError) throw authError;
      await refreshProfile();
      setMessage("Your profile has been updated successfully.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your profile could not be updated. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const roleLabel = profile?.role?.replaceAll("_", " ") ?? "Not set";
  return <PortalLayout role={profile?.role ?? "STUDENT"}>
    <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <section className="menwe-admin-hero rounded-[2rem] p-6 text-white shadow-xl sm:p-8">
        <p className="menwe-admin-kicker"><UserRound size={14}/> My profile</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold sm:text-5xl">Account details</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Keep your contact information current. Your role and account status remain controlled by school authorization.</p>
      </section>
      <form onSubmit={save} className="mt-6 grid gap-6">
        <section className="menwe-card rounded-[1.75rem] p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold">Full name<input required maxLength={120} value={fullName} onChange={event => setFullName(event.target.value)} className="min-h-12 rounded-xl border border-[var(--ink)]/15 bg-white px-4 font-normal outline-none focus:ring-2 focus:ring-[var(--accent)]" /></label>
            <label className="grid gap-1.5 text-sm font-bold">Phone<input maxLength={40} value={phone} onChange={event => setPhone(event.target.value)} className="min-h-12 rounded-xl border border-[var(--ink)]/15 bg-white px-4 font-normal outline-none focus:ring-2 focus:ring-[var(--accent)]" /></label>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--ink)] px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={17}/> : <Save size={17}/>}Save changes</button>
            {message && <p role="status" className="text-sm font-semibold text-[var(--accent)]">{message}</p>}
            {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" value={user?.email ?? ""}/><Field label="Role" value={roleLabel}/><Field label="Account status" value={profile?.status ?? ""}/><Field label="Canonical role" value={profile?.canonical_role ?? ""}/>
        </section>
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--ink)]/10 bg-[var(--mist)] p-4 text-sm leading-6 text-[var(--ink)]/65"><ShieldCheck className="mt-0.5 shrink-0 text-[var(--accent)]" size={18}/><p>Your access is controlled by the authenticated Supabase profile and database authorization policies. Role changes are intentionally not editable from the client.</p></div>
      </form>
    </main>
  </PortalLayout>;
}
