import { BookOpenCheck, Loader2, Pencil, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type AcademicTab = "academic_years" | "terms" | "classes" | "subjects";
type Row = Record<string, unknown>;
const pageSize = 25;
const value = (v: unknown, fallback = "") => v == null ? fallback : String(v);
const inputClass = "w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]";
const tabs: { key: AcademicTab; label: string }[] = [
  { key: "academic_years", label: "Academic years" },
  { key: "terms", label: "Terms" },
  { key: "classes", label: "Classes" },
  { key: "subjects", label: "Subjects" },
];

export default function AcademicDirectory() {
  const [type, setType] = useState<AcademicTab>("academic_years");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [years, setYears] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [edit, setEdit] = useState<Row | null>(null);

  const loadYears = useCallback(async () => {
    const { data, error } = await getSupabase().from("academic_years").select("id,name,starts_on,ends_on,is_current,status").order("starts_on", { ascending: false });
    if (!error) setYears((data ?? []) as Row[]);
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true); setMessage(null);
    try {
      const db = getSupabase();
      const pattern = `%${query.trim()}%`;
      let result;
      if (type === "academic_years") {
        let q = db.from("academic_years").select("id,name,starts_on,ends_on,is_current,status", { count: "exact" }).order("starts_on", { ascending: false });
        if (query.trim()) q = q.ilike("name", pattern);
        result = await q.range(page * pageSize, page * pageSize + pageSize - 1);
      } else if (type === "terms") {
        let q = db.from("terms").select("id,academic_year_id,name,starts_on,ends_on,is_current,status,academic_years(name)", { count: "exact" }).order("starts_on", { ascending: false });
        if (query.trim()) q = q.ilike("name", pattern);
        result = await q.range(page * pageSize, page * pageSize + pageSize - 1);
      } else if (type === "classes") {
        let q = db.from("classes").select("id,academic_year_id,code,name,level,class_teacher_id,status", { count: "exact" }).order("name");
        if (query.trim()) q = q.or(`name.ilike.${pattern},code.ilike.${pattern},level.ilike.${pattern}`);
        result = await q.range(page * pageSize, page * pageSize + pageSize - 1);
      } else {
        let q = db.from("subjects").select("id,code,name,description,status", { count: "exact" }).order("name");
        if (query.trim()) q = q.or(`name.ilike.${pattern},code.ilike.${pattern}`);
        result = await q.range(page * pageSize, page * pageSize + pageSize - 1);
      }
      if (result.error) throw result.error;
      setRows((result.data ?? []) as Row[]);
    } catch (error) {
      setRows([]); setMessage(error instanceof Error ? error.message : "Academic records could not be loaded.");
    } finally { setLoading(false); }
  }, [page, query, type]);

  useEffect(() => { void loadRows(); void loadYears(); }, [loadRows, loadYears]);
  const openCreate = () => setEdit({ name: "", code: "", description: "", level: "", academic_year_id: "", starts_on: "", ends_on: "", status: "ACTIVE", is_current: false });
  const openEdit = (row: Row) => setEdit({ ...row, academic_year_id: value(row.academic_year_id), starts_on: value(row.starts_on), ends_on: value(row.ends_on), is_current: Boolean(row.is_current) });

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!edit) return; setBusy(true); setMessage(null);
    try {
      const db = getSupabase(); let result;
      if (type === "academic_years") {
        const payload = { name: value(edit.name).trim(), starts_on: value(edit.starts_on), ends_on: value(edit.ends_on), is_current: Boolean(edit.is_current), status: value(edit.status, "ACTIVE") };
        result = edit.id ? await db.from("academic_years").update(payload).eq("id", edit.id) : await db.from("academic_years").insert(payload);
      } else if (type === "terms") {
        const payload = { academic_year_id: value(edit.academic_year_id), name: value(edit.name).trim(), starts_on: value(edit.starts_on), ends_on: value(edit.ends_on), is_current: Boolean(edit.is_current), status: value(edit.status, "ACTIVE") };
        result = edit.id ? await db.from("terms").update(payload).eq("id", edit.id) : await db.from("terms").insert(payload);
      } else if (type === "classes") {
        const payload = { academic_year_id: value(edit.academic_year_id) || years.find(y => Boolean(y.is_current))?.id || null, code: value(edit.code).trim(), name: value(edit.name).trim(), level: value(edit.level).trim(), class_teacher_id: value(edit.class_teacher_id) || null, status: value(edit.status, "ACTIVE") };
        if (!payload.academic_year_id) throw new Error("Select or configure an academic year before creating a class.");
        result = edit.id ? await db.from("classes").update(payload).eq("id", edit.id) : await db.from("classes").insert(payload);
      } else {
        const payload = { code: value(edit.code).trim(), name: value(edit.name).trim(), description: value(edit.description).trim() || null, status: value(edit.status, "ACTIVE") };
        result = edit.id ? await db.from("subjects").update(payload).eq("id", edit.id) : await db.from("subjects").insert(payload);
      }
      if (result.error) throw result.error;
      setEdit(null); setMessage(edit.id ? "Academic record updated." : "Academic record created."); await loadRows(); await loadYears();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The academic record could not be saved."); }
    finally { setBusy(false); }
  };

  return <div className="grid gap-6">
    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><h1 className="font-serif text-3xl font-semibold">Academic management</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink)]/60">Manage the live academic year, terms, classes and subjects used by enrolments, attendance, exams and reports. Empty sections are intentionally empty until real school records are created.</p><div className="mt-6 flex flex-wrap gap-2">{tabs.map(tab => <button key={tab.key} type="button" onClick={() => { setType(tab.key); setPage(0); setEdit(null); }} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${type === tab.key ? "bg-[var(--ink)] text-white" : "border border-[var(--ink)]/15"}`}>{tab.label}</button>)}</div><div className="mt-5 flex flex-col gap-3 sm:flex-row"><label className="flex min-h-12 flex-1 items-center gap-2 rounded-xl border border-[var(--ink)]/15 bg-white px-3"><Search size={17} className="text-[var(--accent)]"/><input value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} placeholder={`Search ${tabs.find(t => t.key === type)?.label.toLowerCase()}…`} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"/></label><button type="button" onClick={openCreate} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white"><Plus size={16}/>Add record</button></div></section>
    <section className="menwe-card overflow-hidden rounded-[1.75rem] p-5 sm:p-7">{loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[var(--accent)]"/></div> : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--ink)]/15 px-5 py-12 text-center"><p className="font-semibold">No records yet</p><p className="mt-1 text-sm text-[var(--ink)]/55">This is a real empty state. Use “Add record” to enter the school's actual data.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-[var(--ink)]/10 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/45"><th className="p-3">Name</th><th className="p-3">Code / details</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{rows.map(row => <tr key={value(row.id)} className="border-b border-[var(--ink)]/7"><td className="p-3 font-semibold">{value(row.name)}</td><td className="p-3">{type === "terms" ? `${value((row.academic_years as Row | null)?.name)} · ${value(row.starts_on)} → ${value(row.ends_on)}` : type === "academic_years" ? `${value(row.starts_on)} → ${value(row.ends_on)}` : `${value(row.code)} · ${value(row.level, value(row.description, "—"))}`}</td><td className="p-3">{value(row.status)}{row.is_current ? " · Current" : ""}</td><td className="p-3"><button type="button" onClick={() => openEdit(row)} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold"><Pencil size={13}/>Edit</button></td></tr>)}</tbody></table></div>}{message && <p role="status" className="mt-4 rounded-xl bg-[var(--sage)]/15 px-4 py-3 text-sm text-[var(--ink)]">{message}</p>}</section>
    {edit && <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><h2 className="font-serif text-2xl font-semibold">{edit.id ? "Edit" : "Create"} {tabs.find(t => t.key === type)?.label.replace(/s$/, "")}</h2><form onSubmit={save} className="mt-5 grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-semibold">Name<input required value={value(edit.name)} onChange={e => setEdit({ ...edit, name: e.target.value })} className={inputClass}/></label>{(type === "academic_years" || type === "terms") && <><label className="grid gap-1.5 text-sm font-semibold">Start<input required type="date" value={value(edit.starts_on)} onChange={e => setEdit({ ...edit, starts_on: e.target.value })} className={inputClass}/></label><label className="grid gap-1.5 text-sm font-semibold">End<input required type="date" value={value(edit.ends_on)} onChange={e => setEdit({ ...edit, ends_on: e.target.value })} className={inputClass}/></label></>}{type === "terms" && <label className="grid gap-1.5 text-sm font-semibold">Academic year<select required value={value(edit.academic_year_id)} onChange={e => setEdit({ ...edit, academic_year_id: e.target.value })} className={inputClass}><option value="">Select academic year</option>{years.map(y => <option key={value(y.id)} value={value(y.id)}>{value(y.name)}</option>)}</select></label>}{type === "classes" && <><label className="grid gap-1.5 text-sm font-semibold">Code<input required value={value(edit.code)} onChange={e => setEdit({ ...edit, code: e.target.value })} className={inputClass}/></label><label className="grid gap-1.5 text-sm font-semibold">Level<input required value={value(edit.level)} onChange={e => setEdit({ ...edit, level: e.target.value })} className={inputClass}/></label><label className="grid gap-1.5 text-sm font-semibold">Academic year<select value={value(edit.academic_year_id)} onChange={e => setEdit({ ...edit, academic_year_id: e.target.value })} className={inputClass}><option value="">Use current year</option>{years.map(y => <option key={value(y.id)} value={value(y.id)}>{value(y.name)}</option>)}</select></label></>}{type === "subjects" && <><label className="grid gap-1.5 text-sm font-semibold">Code<input required value={value(edit.code)} onChange={e => setEdit({ ...edit, code: e.target.value })} className={inputClass}/></label><label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Description<textarea value={value(edit.description)} onChange={e => setEdit({ ...edit, description: e.target.value })} className={`${inputClass} min-h-24`}/></label></>}{(type === "academic_years" || type === "terms") && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(edit.is_current)} onChange={e => setEdit({ ...edit, is_current: e.target.checked })}/>Current</label>}<label className="grid gap-1.5 text-sm font-semibold">Status<select value={value(edit.status, "ACTIVE")} onChange={e => setEdit({ ...edit, status: e.target.value })} className={inputClass}><option>ACTIVE</option><option>INACTIVE</option></select></label><div className="flex items-end gap-3"><button disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy && <Loader2 className="animate-spin" size={16}/>}<BookOpenCheck size={16}/>Save</button><button type="button" onClick={() => setEdit(null)} className="rounded-xl border px-4 py-2.5 text-sm font-bold">Cancel</button></div></form></section>}
  </div>;
}
