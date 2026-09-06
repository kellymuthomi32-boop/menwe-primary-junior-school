import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";

type FieldType = "text" | "email" | "phone" | "textarea" | "select" | "checkbox";
type FormField = { id: string; label: string; type: FieldType; required: boolean; placeholder?: string; options?: string[] };
type SchoolForm = { id: string; title: string; description: string; published: boolean; fields: FormField[] };
const key = "public_forms";
const input = "w-full min-h-11 rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]";
const newField = (): FormField => ({ id: crypto.randomUUID(), label: "New field", type: "text", required: false, placeholder: "" });
const newForm = (): SchoolForm => ({ id: crypto.randomUUID(), title: "New school form", description: "", published: false, fields: [newField()] });

export default function FormsManagementPage() {
  const { user, profile, loading: authLoading } = useSchoolAuth();
  const admin = !!profile && isAdministrator(profile.role);
  const [forms, setForms] = useState<SchoolForm[]>([]);
  const [selected, setSelected] = useState<SchoolForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    if (!user || !admin) return;
    setLoading(true); setMessage("");
    const { data, error } = await getSupabase().from("school_settings").select("value").eq("key", key).maybeSingle();
    if (error) setMessage(error.message); else {
      const value = data?.value;
      const next = Array.isArray(value) ? value as SchoolForm[] : [];
      setForms(next); if (selected) setSelected(next.find(f => f.id === selected.id) ?? null);
    }
    setLoading(false);
  }, [admin, selected, user]);
  useEffect(() => { if (!authLoading && admin) void load(); }, [admin, authLoading, load]);
  const save = async (next: SchoolForm[]) => {
    setBusy(true); setMessage("");
    const { error } = await getSupabase().from("school_settings").upsert({ key, value: next, is_public: true, updated_by: user?.id }, { onConflict: "key" });
    if (error) setMessage(error.message); else { setForms(next); setMessage("Form settings saved."); }
    setBusy(false);
  };
  const updateSelected = (patch: Partial<SchoolForm>) => setSelected(current => current ? { ...current, ...patch } : current);
  const updateField = (id: string, patch: Partial<FormField>) => setSelected(current => current ? { ...current, fields: current.fields.map(field => field.id === id ? { ...field, ...patch } : field) } : current);
  const addField = () => setSelected(current => current ? { ...current, fields: [...current.fields, newField()] } : current);
  const removeField = (id: string) => setSelected(current => current ? { ...current, fields: current.fields.filter(field => field.id !== id) } : current);
  const removeForm = async (id: string) => { if (!window.confirm("Delete this form? Existing submissions will remain in the contact records.")) return; await save(forms.filter(form => form.id !== id)); setSelected(null); };
  if (authLoading || loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin"/></div>;
  if (!admin) return null;
  return <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <header className="rounded-[2rem] bg-[var(--ink)] p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><span className="rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-[var(--gold)]">Forms builder</span><h1 className="mt-4 font-serif text-4xl font-semibold">School forms</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Create forms once and publish them to the public Forms page. Submissions use the existing secure contact records.</p></div><button type="button" onClick={() => setSelected(newForm())} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--gold)] px-4 text-sm font-bold text-[var(--ink)]"><Plus size={17}/>New form</button></div></header>
    {message && <div role="status" className="rounded-2xl bg-[var(--gold)]/10 px-4 py-3 text-sm">{message}</div>}
    <section className="grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
      <div className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><h2 className="font-serif text-2xl font-semibold">Your forms</h2><div className="mt-5 space-y-3">{forms.length === 0 ? <div className="rounded-2xl border border-dashed p-7 text-center text-sm text-[var(--ink)]/55">No forms yet. Create your first one.</div> : forms.map(form => <button key={form.id} type="button" onClick={() => setSelected(form)} className={`w-full rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${selected?.id === form.id ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/10" : "border-[var(--ink)]/10"}`}><div className="flex items-start justify-between gap-3"><span className="font-bold">{form.title}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${form.published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{form.published ? "Published" : "Draft"}</span></div><p className="mt-1 text-xs text-[var(--ink)]/55">{form.fields.length} field{form.fields.length === 1 ? "" : "s"}</p></button>)}</div></div>
      <div className="menwe-card rounded-[1.75rem] p-5 sm:p-7">{!selected ? <div className="grid min-h-[360px] place-items-center text-center"><div><p className="font-serif text-2xl font-semibold">Select a form</p><p className="mt-2 text-sm text-[var(--ink)]/55">Or create a new form to start building.</p></div></div> : <><div className="flex items-center justify-between gap-3"><div><h2 className="font-serif text-2xl font-semibold">Form editor</h2><p className="mt-1 text-sm text-[var(--ink)]/55">Every field is rendered automatically on the public page.</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Close editor" className="rounded-xl border p-2"><X size={18}/></button></div><div className="mt-6 space-y-4"><input className={input} value={selected.title} onChange={e => updateSelected({ title: e.target.value })} placeholder="Form title"/><textarea className={`${input} min-h-24`} value={selected.description} onChange={e => updateSelected({ description: e.target.value })} placeholder="Description"/><label className="flex items-center gap-3 rounded-xl border border-[var(--ink)]/10 p-4 text-sm font-bold"><input type="checkbox" checked={selected.published} onChange={e => updateSelected({ published: e.target.checked })}/> Publish this form publicly</label><div className="flex items-center justify-between pt-3"><h3 className="font-bold">Fields</h3><button type="button" onClick={addField} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"><Plus size={14}/>Add field</button></div>{selected.fields.map((field, index) => <div key={field.id} className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)]/30 p-4"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/45">Field {index + 1}</span><button type="button" onClick={() => removeField(field.id)} className="rounded-lg p-1.5 text-red-600" aria-label="Remove field"><Trash2 size={15}/></button></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><input className={input} value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} placeholder="Field label"/><select className={input} value={field.type} onChange={e => updateField(field.id, { type: e.target.value as FieldType })}><option value="text">Text</option><option value="email">Email</option><option value="phone">Phone</option><option value="textarea">Long text</option><option value="select">Dropdown</option><option value="checkbox">Checkbox</option></select><input className={input} value={field.placeholder ?? ""} onChange={e => updateField(field.id, { placeholder: e.target.value })} placeholder="Placeholder"/><label className="flex items-center gap-3 rounded-xl border border-[var(--ink)]/10 bg-white px-3 text-sm"><input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })}/> Required</label></div>{field.type === "select" && <input className={`${input} mt-3`} value={(field.options ?? []).join(", ")} onChange={e => updateField(field.id, { options: e.target.value.split(",").map(option => option.trim()).filter(Boolean) })} placeholder="Dropdown options, separated by commas"/>}</div>)}<div className="flex flex-wrap gap-2 pt-2"><button type="button" disabled={busy || !selected.title.trim() || selected.fields.length === 0} onClick={() => void save([...forms.filter(form => form.id !== selected.id), { ...selected, title: selected.title.trim() }])} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><Save size={16}/>{busy ? "Saving…" : "Save form"}</button>{forms.some(form => form.id === selected.id) && <button type="button" disabled={busy} onClick={() => void removeForm(selected.id)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-5 py-3 text-sm font-bold text-red-700"><Trash2 size={16}/>Delete form</button>}</div></div></>}
    </section>
  </main>;
}
