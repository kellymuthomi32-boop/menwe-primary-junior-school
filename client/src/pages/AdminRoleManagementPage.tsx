import { Loader2, Save, ShieldCheck, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth, type AppRole } from "@/contexts/SupabaseAuthContext";

type StaffRow = { id: string; full_name: string | null; email: string | null; phone: string | null; role: AppRole; status: string };
const roles: { value: AppRole; label: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "HEAD_OF_INSTITUTION", label: "Headteacher / Principal" },
  { value: "DEPUTY_HOI", label: "Deputy Headteacher" },
  { value: "TEACHER", label: "Teacher" },
  { value: "PARENT", label: "Parent / Guardian" },
  { value: "STUDENT", label: "Learner" },
];

const canManageRoles = (role: AppRole | null | undefined) => role === "SUPER_ADMIN" || role === "ADMIN";

export default function AdminRoleManagementPage() {
  const { user, profile, loading: authLoading } = useSchoolAuth();
  const [, navigate] = useLocation();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [draft, setDraft] = useState<Record<string, AppRole>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !profile || !canManageRoles(profile.role)) return;
    setLoading(true);
    setMessage(null);
    const db = getSupabase();
    const result = await db.from("profiles").select("id,full_name,email,phone,role,status").order("full_name");
    if (result.error) setMessage(result.error.message);
    else {
      const staff = (result.data ?? []) as StaffRow[];
      setRows(staff);
      setDraft(Object.fromEntries(staff.map((r) => [r.id, r.role])));
    }
    setLoading(false);
  }, [profile, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile) { navigate("/portal/login"); return; }
    if (!canManageRoles(profile.role)) { navigate("/portal/parent"); return; }
    void load();
  }, [authLoading, load, navigate, profile, user]);

  const save = async (row: StaffRow) => {
    const next = draft[row.id];
    if (!next || next === row.role || !canManageRoles(profile?.role)) return;
    if (profile?.role === "ADMIN" && (next === "SUPER_ADMIN" || row.role === "SUPER_ADMIN")) {
      setMessage("Only a Super Admin can manage a Super Admin account.");
      return;
    }
    setSaving(row.id);
    setMessage(null);
    const db = getSupabase();
    const result = await db.from("profiles").update({ role: next }).eq("id", row.id);
    if (result.error) setMessage(`Could not update ${row.full_name || row.email || "user"}: ${result.error.message}`);
    else {
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, role: next } : item));
      setMessage(`${row.full_name || row.email || "User"} is now ${roles.find((r) => r.value === next)?.label || next}.`);
    }
    setSaving(null);
  };

  if (authLoading || loading) return <main className="grid min-h-[60vh] place-items-center"><div className="flex items-center gap-3 text-sm text-[var(--ink)]/60"><Loader2 className="animate-spin text-[var(--gold)]" size={19}/>Loading staff access…</div></main>;

  return <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <header className="menwe-admin-hero relative overflow-hidden rounded-[2rem] p-6 text-white sm:p-8 lg:p-10"><div className="menwe-admin-orb"/><div className="relative z-10"><span className="menwe-admin-kicker"><ShieldCheck size={14}/> Staff access</span><h1 className="mt-5 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Roles & permissions</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Assign the correct school role to every school account. Headteacher / Principal and Deputy Headteacher are fully supported.</p></div></header>
    {message && <div role="status" className="rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold)]/10 px-4 py-3 text-sm font-semibold text-[var(--ink)]">{message}</div>}
    <section className="menwe-card overflow-hidden rounded-[1.75rem]">
      <div className="flex items-center gap-3 border-b border-[var(--ink)]/8 px-5 py-4 sm:px-6"><Users size={18} className="text-[var(--gold)]"/><div><h2 className="font-serif text-xl font-semibold">School accounts</h2><p className="text-xs text-[var(--ink)]/50">Only Super Admins and Admins can change roles. Changes take effect on the user’s next authenticated profile refresh.</p></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b border-[var(--ink)]/10 text-[10px] font-black uppercase tracking-[.13em] text-[var(--ink)]/45"><th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Action</th></tr></thead><tbody>{rows.map((row) => { const locked = profile?.role === "ADMIN" && row.role === "SUPER_ADMIN"; return <tr key={row.id} className="border-b border-[var(--ink)]/7 last:border-0 hover:bg-[var(--gold)]/[.035]"><td className="px-5 py-4 font-semibold">{row.full_name || "Unnamed user"}</td><td className="px-5 py-4">{row.email || "—"}</td><td className="px-5 py-4">{row.phone || "—"}</td><td className="px-5 py-4"><select disabled={locked} value={draft[row.id] || row.role} onChange={(e) => setDraft((current) => ({ ...current, [row.id]: e.target.value as AppRole }))} className="min-h-11 rounded-xl border border-[var(--ink)]/12 bg-white px-3 text-sm font-semibold outline-none focus:border-[var(--gold)] disabled:cursor-not-allowed disabled:opacity-60">{roles.filter((option) => profile?.role === "SUPER_ADMIN" || option.value !== "SUPER_ADMIN").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></td><td className="px-5 py-4"><span className="rounded-full bg-[var(--gold)]/10 px-2.5 py-1 text-[10px] font-black uppercase text-[var(--gold)]">{row.status}</span></td><td className="px-5 py-4"><button type="button" disabled={locked || saving === row.id || draft[row.id] === row.role} onClick={() => void save(row)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{saving === row.id ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} {saving === row.id ? "Saving…" : locked ? "Protected" : "Save role"}</button></td></tr>})}</tbody></table>{rows.length === 0 && <div className="py-16 text-center text-sm text-[var(--ink)]/50">No school accounts found.</div>}</div>
    </section>
  </main>;
}
