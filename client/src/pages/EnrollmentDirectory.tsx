import { Loader2, Pencil, Plus, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Row = Record<string, any>;
const inputClass = "w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm outline-none ring-[var(--accent)] focus:ring-2";
const text = (v: unknown, fallback = "—") => v == null || v === "" ? fallback : String(v);

const emptyForm = { assessment: "", first: "", middle: "", last: "", birthCertificate: "", dob: "", gender: "", classId: "", streamId: "", admissionDate: "", parent: "", parentPhone: "", address: "", status: "ACTIVE" };
type Form = typeof emptyForm;

export default function EnrollmentDirectory() {
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [streams, setStreams] = useState<Row[]>([]);
  const [parents, setParents] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [create, setCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true); setMessage(null);
    try {
      const db = getSupabase();
      const [students, enrollments, classRows, streamRows, parentLinks, profileRows] = await Promise.all([
        db.from("students").select("*").is("deleted_at", null).order("first_name").order("last_name"),
        db.from("enrollments").select("id,student_id,class_id,stream_id,academic_year_id,enrolled_on,status,classes(id,name,level),streams(id,name)").order("enrolled_on", { ascending: false }),
        db.from("classes").select("id,name,level,code,status").eq("status", "ACTIVE").order("name"),
        db.from("streams").select("id,class_id,name,status").eq("status", "ACTIVE").order("name"),
        db.from("student_parents").select("student_id,parent_id,relationship,is_primary").eq("is_primary", true),
        db.from("profiles").select("id,full_name,phone,email")
      ]);
      for (const result of [students, enrollments, classRows, streamRows, parentLinks, profileRows]) if (result.error) throw result.error;
      const enrollmentMap = new Map<string, Row>();
      for (const e of (enrollments.data ?? []) as Row[]) if (!enrollmentMap.has(String(e.student_id))) enrollmentMap.set(String(e.student_id), e);
      const parentMap = new Map<string, Row>();
      for (const p of (profileRows.data ?? []) as Row[]) parentMap.set(String(p.id), p);
      const primaryParent = new Map<string, Row>();
      for (const link of (parentLinks.data ?? []) as Row[]) { const p = parentMap.get(String(link.parent_id)); if (p) primaryParent.set(String(link.student_id), { ...p, relationship: link.relationship }); }
      setRows(((students.data ?? []) as Row[]).map(student => {
        const e = enrollmentMap.get(String(student.id));
        const parent = primaryParent.get(String(student.id));
        return { ...student, enrollment: e, class: e?.classes, stream: e?.streams, parent };
      }));
      setClasses((classRows.data ?? []) as Row[]);
      setStreams((streamRows.data ?? []) as Row[]);
      setParents(Array.from(primaryParent.values()));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Learner enrolment records could not be loaded."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const grades = useMemo(() => ["ALL", ...Array.from(new Set(rows.map(r => text(r.class?.name || r.class?.level, "")).filter(Boolean))).sort()], [rows]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(r => {
      const searchable = [r.admission_number, r.first_name, r.middle_name, r.last_name, r.birth_certificate_number, r.date_of_birth, r.gender, r.class?.name, r.stream?.name, r.admission_date, r.parent?.full_name, r.parent?.phone, r.address, r.status].map(v => text(v, "")).join(" ").toLowerCase();
      return (!q || searchable.includes(q)) && (grade === "ALL" || text(r.class?.name || r.class?.level, "") === grade);
    });
  }, [grade, query, rows]);

  const open = (row: Row) => {
    setCreate(false); setSelected(row);
    setForm({
      assessment: text(row.admission_number, ""), first: text(row.first_name, ""), middle: text(row.middle_name, ""), last: text(row.last_name, ""),
      birthCertificate: text(row.birth_certificate_number, ""), dob: text(row.date_of_birth, ""), gender: text(row.gender, ""), classId: text(row.enrollment?.class_id, ""), streamId: text(row.enrollment?.stream_id, ""),
      admissionDate: text(row.admission_date || row.enrollment?.enrolled_on, ""), parent: text(row.parent?.full_name, ""), parentPhone: text(row.parent?.phone, ""), address: text(row.address, ""), status: text(row.status, "ACTIVE")
    });
  };
  const newLearner = () => { setSelected(null); setCreate(true); setForm(emptyForm); };
  const set = (key: keyof Form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const filteredStreams = streams.filter(s => String(s.class_id) === form.classId);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage(null);
    try {
      const db = getSupabase();
      if (create) {
        const { data: student, error: studentError } = await db.from("students").insert({
          admission_number: form.assessment.trim(), first_name: form.first.trim(), middle_name: form.middle.trim() || null, last_name: form.last.trim(),
          birth_certificate_number: form.birthCertificate.trim() || null, date_of_birth: form.dob || null, gender: form.gender || null, address: form.address.trim() || null,
          admission_date: form.admissionDate || null, status: form.status
        }).select("id").single();
        if (studentError) throw studentError;
        const year = await db.from("academic_years").select("id").eq("status", "ACTIVE").order("start_date", { ascending: false }).limit(1).maybeSingle();
        if (year.error) throw year.error;
        if (!year.data) throw new Error("No active academic year is configured.");
        const { error: enrollmentError } = await db.from("enrollments").insert({ student_id: student.id, class_id: form.classId, stream_id: form.streamId || null, academic_year_id: year.data.id, enrolled_on: form.admissionDate || new Date().toISOString().slice(0, 10), status: "ACTIVE" });
        if (enrollmentError) throw enrollmentError;
        setMessage("Learner profile and enrolment created in Supabase.");
      } else if (selected) {
        const { error: studentError } = await db.from("students").update({
          admission_number: form.assessment.trim(), first_name: form.first.trim(), middle_name: form.middle.trim() || null, last_name: form.last.trim(), birth_certificate_number: form.birthCertificate.trim() || null,
          date_of_birth: form.dob || null, gender: form.gender || null, address: form.address.trim() || null, admission_date: form.admissionDate || null, status: form.status
        }).eq("id", selected.id);
        if (studentError) throw studentError;
        if (selected.enrollment?.id) {
          const { error: enrollmentError } = await db.from("enrollments").update({ class_id: form.classId, stream_id: form.streamId || null, enrolled_on: form.admissionDate || selected.enrollment.enrolled_on, status: form.status }).eq("id", selected.enrollment.id);
          if (enrollmentError) throw enrollmentError;
        }
        setMessage("Learner profile and class enrolment updated in Supabase.");
      }
      setSelected(null); setCreate(false); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The learner profile could not be saved."); }
    finally { setSaving(false); }
  };

  const cell = (value: unknown) => <td className="whitespace-nowrap px-3 py-3">{text(value)}</td>;
  return <div className="grid gap-6">
    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[var(--gold)]"><Users size={15}/> Enrollment / learner profile</div><h1 className="mt-2 font-serif text-3xl font-semibold">Three-class learner register</h1><p className="mt-2 text-sm text-[var(--ink)]/60">Grade 1, Grade 2 and Grade 3 use one consistent learner profile structure.</p></div>
        <button type="button" onClick={newLearner} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16}/>Add learner</button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search assessment number, learner, parent or class…" className={inputClass}/><select value={grade} onChange={e => setGrade(e.target.value)} className={inputClass}>{grades.map(g => <option key={g} value={g}>{g === "ALL" ? "All classes" : g}</option>)}</select></div>
    </section>

    {message && <div role="status" className="rounded-2xl bg-[var(--sage)]/20 px-4 py-3 text-sm text-[var(--ink)]">{message}</div>}
    <section className="menwe-card overflow-hidden rounded-[1.75rem] p-4 sm:p-6">
      {loading ? <div className="flex items-center justify-center gap-3 py-14 text-sm text-[var(--ink)]/60"><Loader2 className="animate-spin" size={18}/>Loading learner profiles…</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1900px] text-left text-sm"><thead><tr className="border-b border-[var(--ink)]/10 text-[11px] font-bold uppercase tracking-[.1em] text-[var(--ink)]/45"><th className="px-3 py-3">Assessment Number</th><th className="px-3 py-3">First Name</th><th className="px-3 py-3">Middle Name</th><th className="px-3 py-3">Last Name</th><th className="px-3 py-3">Birth Certificate Number</th><th className="px-3 py-3">Date of Birth</th><th className="px-3 py-3">Gender</th><th className="px-3 py-3">Class</th><th className="px-3 py-3">Stream</th><th className="px-3 py-3">Admission Date</th><th className="px-3 py-3">Parent/Guardian</th><th className="px-3 py-3">Parent phone</th><th className="px-3 py-3">Address</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Action</th></tr></thead><tbody>{visible.map(row => <tr key={row.id} className="border-b border-[var(--ink)]/7 last:border-0 hover:bg-[var(--paper)]">{cell(row.admission_number)}{cell(row.first_name)}{cell(row.middle_name)}{cell(row.last_name)}{cell(row.birth_certificate_number)}{cell(row.date_of_birth)}{cell(row.gender)}{cell(row.class?.name || row.class?.level)}{cell(row.stream?.name)}{cell(row.admission_date || row.enrollment?.enrolled_on)}{cell(row.parent?.full_name)}{cell(row.parent?.phone)}{cell(row.address)}{cell(row.status)}<td className="px-3 py-3"><button type="button" onClick={() => open(row)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--ink)]/15 px-2.5 py-1.5 text-xs font-bold"><Pencil size={13}/>Edit</button></td></tr>)}</tbody></table>{visible.length === 0 && <div className="py-12 text-center text-sm text-[var(--ink)]/55">No learners match the selected class/search.</div>}</div>}
    </section>

    {(selected || create) && <div className="fixed inset-0 z-50 bg-[var(--ink)]/55 p-4" onClick={() => { setSelected(null); setCreate(false); }}><aside className="mx-auto h-full max-w-4xl overflow-y-auto rounded-[1.75rem] bg-white p-5 shadow-2xl sm:p-7" onClick={e => e.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--gold)]">Enrollment / learner profile</p><h2 className="mt-1 font-serif text-3xl font-semibold">{create ? "Add learner" : "Edit learner profile"}</h2></div><button type="button" onClick={() => { setSelected(null); setCreate(false); }} className="rounded-xl border p-2"><X size={18}/></button></div><form onSubmit={save} className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-semibold">Assessment Number<input required value={form.assessment} onChange={e => set("assessment", e.target.value)} className={inputClass}/></label>
      <label className="grid gap-1.5 text-sm font-semibold">First Name<input required value={form.first} onChange={e => set("first", e.target.value)} className={inputClass}/></label>
      <label className="grid gap-1.5 text-sm font-semibold">Middle Name<input value={form.middle} onChange={e => set("middle", e.target.value)} className={inputClass}/></label>
      <label className="grid gap-1.5 text-sm font-semibold">Last Name<input required value={form.last} onChange={e => set("last", e.target.value)} className={inputClass}/></label>
      <label className="grid gap-1.5 text-sm font-semibold">Birth Certificate Number<input value={form.birthCertificate} onChange={e => set("birthCertificate", e.target.value)} className={inputClass}/></label>
      <label className="grid gap-1.5 text-sm font-semibold">Date of Birth<input type="date" value={form.dob} onChange={e => set("dob", e.target.value)} className={inputClass}/></label>
      <label className="grid gap-1.5 text-sm font-semibold">Gender<select value={form.gender} onChange={e => set("gender", e.target.value)} className={inputClass}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option></select></label>
      <label className="grid gap-1.5 text-sm font-semibold">Class<select required value={form.classId} onChange={e => { set("classId", e.target.value); set("streamId", ""); }} className={inputClass}><option value="">Select class</option>{classes.map(c => <option key={c.id} value={c.id}>{text(c.name, text(c.level))}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-semibold">Stream<select value={form.streamId} onChange={e => set("streamId", e.target.value)} className={inputClass}><option value="">No stream assigned</option>{filteredStreams.map(s => <option key={s.id} value={s.id}>{text(s.name)}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-semibold">Admission Date<input type="date" value={form.admissionDate} onChange={e => set("admissionDate", e.target.value)} className={inputClass}/></label>
      <label className="grid gap-1.5 text-sm font-semibold">Parent/Guardian<input value={form.parent} readOnly={!create} onChange={e => set("parent", e.target.value)} placeholder="Linked parent account" className={inputClass}/></label>
      <label className="grid gap-1.5 text-sm font-semibold">Parent phone<input value={form.parentPhone} readOnly={!create} onChange={e => set("parentPhone", e.target.value)} placeholder="Linked parent phone" className={inputClass}/></label>
      <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Address<textarea rows={2} value={form.address} onChange={e => set("address", e.target.value)} className={inputClass}/></label>
      <label className="grid gap-1.5 text-sm font-semibold">Status<select value={form.status} onChange={e => set("status", e.target.value)} className={inputClass}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="WITHDRAWN">Withdrawn</option></select></label>
      <div className="flex items-end justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => { setSelected(null); setCreate(false); }} className="rounded-xl border border-[var(--ink)]/15 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving && <Loader2 className="animate-spin" size={16}/>}Save learner profile</button></div>
    </form><p className="mt-5 rounded-xl bg-[var(--paper)] px-4 py-3 text-xs leading-5 text-[var(--ink)]/55">Parent/Guardian and Parent phone are displayed from the linked primary parent account. They are not invented or copied into the learner record without a real parent link.</p></aside></div>}
  </div>;
}
