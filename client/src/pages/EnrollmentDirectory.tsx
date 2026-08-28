import { Loader2, Pencil, Plus, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Row = Record<string, unknown>;
type EnrollmentDraft = { student_id: string; class_id: string; academic_period_id: string; academic_term_id: string; status: string; start_date: string; end_date: string };
const pageSize = 25;
const value = (item: unknown, fallback = "") => item === null || item === undefined || item === "" ? fallback : String(item);
const inputClass = "w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm outline-none ring-[var(--accent)] focus:ring-2";
const today = () => new Date().toISOString().slice(0, 10);
const blankDraft = (): EnrollmentDraft => ({ student_id: "", class_id: "", academic_period_id: "", academic_term_id: "", status: "Active", start_date: today(), end_date: "" });

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><h2 className="font-serif text-2xl font-semibold tracking-tight">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink)]/60">{description}</p><div className="mt-6">{children}</div></section>;
}
function Pager({ page, count, setPage }: { page: number; count: number; setPage: (value: number) => void }) {
  const total = Math.ceil(count / pageSize); if (total < 2) return null;
  return <div className="mt-5 flex items-center justify-between gap-3 text-sm text-[var(--ink)]/60"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border border-[var(--ink)]/15 px-3 py-2 font-semibold disabled:opacity-40">Previous</button><span>Page {page + 1} of {total}</span><button type="button" disabled={page + 1 >= total} onClick={() => setPage(page + 1)} className="rounded-lg border border-[var(--ink)]/15 px-3 py-2 font-semibold disabled:opacity-40">Next</button></div>;
}
function EnrollmentForm({ draft, setDraft, students, lookups, busy, onSubmit, submitLabel }: { draft: EnrollmentDraft; setDraft: (draft: EnrollmentDraft) => void; students: Row[]; lookups: { classes: Row[]; periods: Row[]; terms: Row[] }; busy: boolean; onSubmit: (event: React.FormEvent) => Promise<void>; submitLabel: string }) {
  const terms = useMemo(() => lookups.terms.filter(row => value(row.academic_period_id) === draft.academic_period_id), [draft.academic_period_id, lookups.terms]);
  return <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
    <label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]/75">Student<select required value={draft.student_id} onChange={event => setDraft({ ...draft, student_id: event.target.value })} className={inputClass}><option value="">Select student</option>{students.map(row => <option key={value(row.id)} value={value(row.id)}>{value(row.admission_number, "—")} — {value(row.name)}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]/75">Class<select required value={draft.class_id} onChange={event => setDraft({ ...draft, class_id: event.target.value })} className={inputClass}><option value="">Select class</option>{lookups.classes.map(row => <option key={value(row.id)} value={value(row.id)}>{value(row.name)}{row.grade ? ` — ${value(row.grade)}` : ""}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]/75">Academic period<select required value={draft.academic_period_id} onChange={event => setDraft({ ...draft, academic_period_id: event.target.value, academic_term_id: "" })} className={inputClass}><option value="">Select period</option>{lookups.periods.map(row => <option key={value(row.id)} value={value(row.id)}>{value(row.name)}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]/75">Academic term<select value={draft.academic_term_id} onChange={event => setDraft({ ...draft, academic_term_id: event.target.value })} className={inputClass}><option value="">No term</option>{terms.map(row => <option key={value(row.id)} value={value(row.id)}>{value(row.name)}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]/75">Status<select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })} className={inputClass}><option value="Pending">Pending</option><option value="Active">Active</option><option value="Completed">Completed</option><option value="Withdrawn">Withdrawn</option></select></label>
    <label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]/75">Start date<input required type="date" value={draft.start_date} onChange={event => setDraft({ ...draft, start_date: event.target.value })} className={inputClass} /></label>
    <label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]/75">End date<input type="date" value={draft.end_date} onChange={event => setDraft({ ...draft, end_date: event.target.value })} className={inputClass} /></label>
    <div className="flex items-end sm:col-span-2"><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-55">{busy && <Loader2 className="animate-spin" size={16} />}<Plus size={16} />{submitLabel}</button></div>
  </form>;
}

export default function EnrollmentDirectory() {
  const [records, setRecords] = useState<Row[]>([]); const [students, setStudents] = useState<Row[]>([]); const [count, setCount] = useState(0); const [page, setPage] = useState(0); const [status, setStatus] = useState("Active");
  const [lookups, setLookups] = useState<{ classes: Row[]; periods: Row[]; terms: Row[] }>({ classes: [], periods: [], terms: [] });
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null); const [create, setCreate] = useState(false);
  const [draft, setDraft] = useState<EnrollmentDraft>(blankDraft());
  const [edit, setEdit] = useState<{ id: string } & EnrollmentDraft | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setMessage(null); const client = getSupabase(); const from = page * pageSize; const to = from + pageSize - 1;
    try {
      const [enrolments, studentRows, classes, periods, terms] = await Promise.all([
        client.from("enrollments").select("id,student_id,class_id,academic_period_id,academic_term_id,status,start_date,end_date,students(admission_number,name),classes(name,grade,level),academic_periods(name),academic_terms(name)", { count: "exact" }).eq("status", status).order("start_date", { ascending: false }).range(from, to),
        client.from("students").select("id,name,admission_number,lifecycle_status").eq("lifecycle_status", "Active").order("name"),
        client.from("classes").select("id,name,grade,level").order("name"),
        client.from("academic_periods").select("id,name,is_active,start_date,end_date").order("start_date", { ascending: false }),
        client.from("academic_terms").select("id,name,academic_period_id,start_date,end_date").order("start_date", { ascending: false })
      ]);
      for (const result of [enrolments, studentRows, classes, periods, terms]) if (result.error) throw result.error;
      setRecords((enrolments.data ?? []) as unknown as Row[]); setCount(enrolments.count ?? 0); setStudents((studentRows.data ?? []) as Row[]); setLookups({ classes: (classes.data ?? []) as Row[], periods: (periods.data ?? []) as Row[], terms: (terms.data ?? []) as Row[] });
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Authorised enrolment records could not be loaded."); } finally { setLoading(false); }
  }, [page, status]);
  useEffect(() => { void refresh(); }, [refresh]);

  const createEnrollment = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      const payload = { ...draft, academic_term_id: draft.academic_term_id || null, end_date: draft.end_date || null };
      const { error } = await getSupabase().from("enrollments").insert(payload); if (error) throw error;
      setDraft(blankDraft()); setCreate(false); setStatus(payload.status); setPage(0); setMessage("Enrolment created in Supabase. Reloading the canonical records now."); await refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "The enrolment record could not be created."); } finally { setBusy(false); }
  };
  const update = async (event: React.FormEvent) => {
    event.preventDefault(); if (!edit) return; setBusy(true); setMessage(null);
    try {
      const payload = { student_id: edit.student_id, class_id: edit.class_id, academic_period_id: edit.academic_period_id, academic_term_id: edit.academic_term_id || null, status: edit.status, start_date: edit.start_date, end_date: edit.end_date || null };
      const { error } = await getSupabase().from("enrollments").update(payload).eq("id", edit.id); if (error) throw error;
      setEdit(null); setMessage("The enrolment was saved to the canonical production record."); await refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "The enrolment record could not be updated."); } finally { setBusy(false); }
  };
  const nested = (row: Row, key: string) => (row[key] as Row | null) ?? null;

  return <div className="grid gap-6">
    <Panel title="Enrolment directory" description="Review real student enrolments by canonical class, academic period and optional academic term. Records are preserved as history rather than deleted.">
      <div className="flex flex-wrap items-center justify-between gap-3"><label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]/75">Status filter<select value={status} onChange={event => { setStatus(event.target.value); setPage(0); }} className={inputClass}><option value="Pending">Pending</option><option value="Active">Active</option><option value="Completed">Completed</option><option value="Withdrawn">Withdrawn</option></select></label><div className="flex items-center gap-3"><p className="text-sm text-[var(--ink)]/55">{count} authorised {status.toLowerCase()} record{count === 1 ? "" : "s"}</p><button type="button" onClick={() => setCreate(value => !value)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} />New enrolment</button></div></div>
      {create && <div className="mt-6 rounded-2xl border border-[var(--ink)]/10 p-4"><h3 className="font-semibold">Create enrolment</h3><p className="mt-1 text-sm text-[var(--ink)]/55">Creates a real row in the canonical <code>enrollments</code> table.</p><div className="mt-4"><EnrollmentForm draft={draft} setDraft={setDraft} students={students} lookups={lookups} busy={busy} onSubmit={createEnrollment} submitLabel="Create enrolment" /></div></div>}
      {loading ? <div className="flex items-center justify-center gap-3 py-12 text-sm text-[var(--ink)]/60"><Loader2 className="animate-spin text-[var(--accent)]" size={18} />Loading authorised enrolments…</div> : records.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-[var(--ink)]/15 px-5 py-8 text-center text-sm text-[var(--ink)]/55">No {status.toLowerCase()} enrolments are visible to this administrator.</p> : <><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead><tr className="border-b border-[var(--ink)]/10 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/45"><th className="px-3 py-3">Learner</th><th className="px-3 py-3">Class</th><th className="px-3 py-3">Academic period</th><th className="px-3 py-3">Term</th><th className="px-3 py-3">Start</th><th className="px-3 py-3">Edit</th></tr></thead><tbody>{records.map(row => { const student = nested(row, "students"); const classRecord = nested(row, "classes"); const period = nested(row, "academic_periods"); const term = nested(row, "academic_terms"); return <tr className="border-b border-[var(--ink)]/7 last:border-0" key={value(row.id)}><td className="px-3 py-3 font-medium">{value(student?.admission_number, "—")} — {value(student?.name, "")}</td><td className="px-3 py-3">{value(classRecord?.name, "—")}{classRecord?.grade ? ` — ${value(classRecord.grade)}` : ""}</td><td className="px-3 py-3">{value(period?.name, "—")}</td><td className="px-3 py-3">{value(term?.name, "—")}</td><td className="px-3 py-3">{value(row.start_date, "—")}</td><td className="px-3 py-3"><button type="button" onClick={() => setEdit({ id: value(row.id), student_id: value(row.student_id), class_id: value(row.class_id), academic_period_id: value(row.academic_period_id), academic_term_id: value(row.academic_term_id), status: value(row.status), start_date: value(row.start_date), end_date: value(row.end_date) })} className="inline-flex items-center gap-1 rounded-lg border border-[var(--ink)]/15 px-2 py-1 text-xs font-semibold"><Pencil size={13} />Edit</button></td></tr>; })}</tbody></table></div><Pager page={page} count={count} setPage={setPage} /></>}
    </Panel>
    {edit && <Panel title="Update enrolment" description="Update the real student, class and academic relationships without introducing legacy stream or academic-year fields."><EnrollmentForm draft={edit} setDraft={next => setEdit({ id: edit.id, ...next })} students={students} lookups={lookups} busy={busy} onSubmit={update} submitLabel="Save changes" /><button type="button" onClick={() => setEdit(null)} className="mt-3 rounded-xl border border-[var(--ink)]/15 px-4 py-2.5 text-sm font-semibold">Cancel</button></Panel>}
    {message && <p role="status" className="rounded-xl bg-[var(--sage)]/16 px-4 py-3 text-sm text-[var(--accent)]">{message}</p>}
  </div>;
}
