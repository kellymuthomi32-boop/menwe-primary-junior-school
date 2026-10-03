import { AlertTriangle, CheckCircle2, GraduationCap, Layers, Loader2, Lock, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { levelFromScore } from "@/lib/grading";

type Row = Record<string, any>;
type MarkRow = {
  exam_id: string;
  student_id: string;
  subject_id: string;
  score: number;
  maximum_score: number;
  grade: ReturnType<typeof levelFromScore>;
  entered_by: string | null;
};

const ADMINS = ["SUPER_ADMIN", "ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI"];
const input = "w-full min-h-11 rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]";
const nameOf = (s: any) => [s?.first_name, s?.middle_name, s?.last_name].filter(Boolean).join(" ");
const isEcdeClass = (c?: Row) => /\b(ECDE|PP1|PP2|PRE PRIMARY|PRE-PRIMARY)\b/i.test(`${c?.name ?? ""} ${c?.code ?? ""} ${c?.level ?? ""}`);

export default function ExamPublishingWorkspace() {
  const { user, profile } = useSchoolAuth();
  const admin = ADMINS.includes(profile?.role ?? "");
  const teacher = profile?.role === "TEACHER";
  const [years, setYears] = useState<Row[]>([]);
  const [terms, setTerms] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [classSubjects, setClassSubjects] = useState<Row[]>([]);
  const [exams, setExams] = useState<Row[]>([]);
  const [assignments, setAssignments] = useState<Row[]>([]);
  const [selected, setSelected] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [students, setStudents] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [learnerCount, setLearnerCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [yearId, setYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [examName, setExamName] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [examType, setExamType] = useState("EXAM_1");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [allGrades, setAllGrades] = useState(true);
  const [classId, setClassId] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const storageKey = user?.id ? `menwe:marks-workspace:${user.id}` : "";

  const refresh = useCallback(async () => {
    if (!user || (!admin && !teacher)) return;
    setLoading(true);
    try {
      const db = getSupabase();
      let a: Row[] = [];
      if (teacher) {
        const tr = await db.from("teachers").select("id").eq("profile_id", user.id).maybeSingle();
        if (tr.error) throw tr.error;
        if (!tr.data) throw new Error("Your teacher record is not linked yet.");
        const ar = await db.from("teacher_assignments").select("id,class_id,subject_id").eq("teacher_id", tr.data.id);
        if (ar.error) throw ar.error;
        a = ar.data ?? [];
      }
      const [y, t, c, s, cs, e] = await Promise.all([
        db.from("academic_years").select("id,name,is_current,status").eq("status", "ACTIVE").order("starts_on", { ascending: false }),
        db.from("terms").select("id,academic_year_id,name,is_current,status").eq("status", "ACTIVE").order("starts_on", { ascending: false }),
        db.from("classes").select("id,academic_year_id,name,status").eq("status", "ACTIVE").order("name"),
        db.from("subjects").select("id,code,name,status").eq("status", "ACTIVE").order("name"),
        db.from("class_subjects").select("class_id,subject_id"),
        db.from("exams").select("id,term_id,class_id,name,exam_type,maximum_score,starts_on,ends_on,status,created_at").order("created_at", { ascending: false })
      ]);
      for (const r of [y, t, c, s, cs, e]) if (r.error) throw r.error;
      setYears(y.data ?? []);
      setTerms(t.data ?? []);
      setClasses(c.data ?? []);
      setSubjects(s.data ?? []);
      setClassSubjects(cs.data ?? []);
      setExams(e.data ?? []);
      setAssignments(a);
      if (!yearId) setYearId(String(y.data?.find((x: any) => x.is_current)?.id ?? y.data?.[0]?.id ?? ""));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Examination workspace could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [user, admin, teacher, yearId]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { selected?: string; subjectId?: string; yearId?: string; termId?: string; examName?: string; maxScore?: string; examType?: string; start?: string; end?: string; allGrades?: boolean; classId?: string; scores?: Record<string, string> };
      if (saved.yearId) setYearId(saved.yearId);
      if (saved.termId) setTermId(saved.termId);
      if (saved.examName != null) setExamName(saved.examName);
      if (saved.maxScore) setMaxScore(saved.maxScore);
      if (saved.examType) setExamType(saved.examType);
      if (saved.start) setStart(saved.start);
      if (saved.end) setEnd(saved.end);
      if (typeof saved.allGrades === "boolean") setAllGrades(saved.allGrades);
      if (saved.classId) setClassId(saved.classId);
      if (saved.scores) setScores(saved.scores);
      if (saved.selected) setSelected(saved.selected);
      if (saved.subjectId) setSubjectId(saved.subjectId);
    } catch { /* Ignore an invalid browser draft. */ }
    setDraftRestored(true);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !draftRestored) return;
    const payload = { selected, subjectId, yearId, termId, examName, maxScore, examType, start, end, allGrades, classId, scores };
    try { localStorage.setItem(storageKey, JSON.stringify(payload)); } catch { /* Browser storage may be unavailable/full. */ }
  }, [storageKey, draftRestored, selected, subjectId, yearId, termId, examName, maxScore, examType, start, end, allGrades, classId, scores]);

  useEffect(() => {
    if (!draftRestored || !selected || !exams.some(e => String(e.id) === String(selected))) return;
    const savedSubject = subjectId;
    if (students.length === 0) void load(String(selected), savedSubject || undefined);
  }, [draftRestored, selected, exams, subjectId]);

  const assigned = new Set(assignments.map(x => String(x.class_id)));
  const visibleClasses = classes.filter(c => !teacher || assigned.has(String(c.id)));
  const visibleExams = exams.filter(e => admin || assigned.has(String(e.class_id)));
  const examGroups = useMemo(() => {
    const groups = new Map<string, Row[]>();
    for (const exam of visibleExams) {
      const key = [exam.term_id, String(exam.name ?? "").trim().toLowerCase(), String(exam.exam_type ?? "").trim().toLowerCase(), String(exam.maximum_score ?? ""), exam.starts_on ?? "", exam.ends_on ?? ""].join("|");
      const list = groups.get(key) ?? [];
      list.push(exam);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).map(([key, list]) => ({
      key,
      exams: list.sort((a,b) => String(classes.find(c => String(c.id) === String(a.class_id))?.name ?? "").localeCompare(String(classes.find(c => String(c.id) === String(b.class_id))?.name ?? ""))),
      representative: list[0]
    }));
  }, [visibleExams, classes]);
  const selectedExam = exams.find(e => String(e.id) === selected);
  const selectedExamClass = classes.find(c => String(c.id) === String(selectedExam?.class_id));
  const selectedExamIsEcde = isEcdeClass(selectedExamClass);
  const requiredSubjects = classSubjects.filter(x => String(x.class_id) === String(selectedExam?.class_id)).map(x => String(x.subject_id));
  const availableSubjects = subjects.filter(s => requiredSubjects.includes(String(s.id)) && (!teacher || assignments.some(a => String(a.class_id) === String(selectedExam?.class_id) && String(a.subject_id) === String(s.id))));

  const completion = useMemo(() => {
    const required = learnerCount * requiredSubjects.length;
    const done = new Set(rows.map(r => `${r.student_id}:${r.subject_id}`)).size;
    return { required, done, percent: required ? Math.round((done / required) * 100) : 0, complete: required > 0 && done === required };
  }, [learnerCount, requiredSubjects, rows]);

  const selectExamGroup = (groupKey: string) => {
    const group = examGroups.find(g => g.key === groupKey);
    const first = group?.exams[0];
    if (first) void load(String(first.id));
    else {
      setSelected("");
      setSubjectId("");
      setRows([]);
      setStudents([]);
    }
  };

  const load = async (id: string, override?: string) => {
    setSelected(id);
    setSubjectId(override ?? "");
    setScores({});
    setRows([]);
    setStudents([]);
    setMessage(null);
    const db = getSupabase();
    const exam = exams.find(e => String(e.id) === id);
    if (!exam) return;
    try {
      const cls = classes.find(c => String(c.id) === String(exam.class_id));
      if (!cls) throw new Error("Exam class not found.");
      const en = await db.from("enrollments").select("student_id").eq("class_id", exam.class_id).eq("academic_year_id", cls.academic_year_id).eq("status", "ACTIVE");
      if (en.error) throw en.error;
      const ids = [...new Set((en.data ?? []).map((x: any) => x.student_id))];
      if (!ids.length) throw new Error("No active learners are enrolled in this class.");
      const [st, rs] = await Promise.all([
        db.from("students").select("id,admission_number,first_name,middle_name,last_name").in("id", ids).order("first_name"),
        db.from("exam_results").select("exam_id,student_id,subject_id,score,maximum_score,grade").eq("exam_id", id)
      ]);
      if (st.error) throw st.error;
      if (rs.error) throw rs.error;
      setStudents(st.data ?? []);
      setLearnerCount(ids.length);
      setRows(rs.data ?? []);
      const first = override ?? String((rs.data ?? [])[0]?.subject_id ?? availableSubjects[0]?.id ?? "");
      setSubjectId(first);
      const matches = (rs.data ?? []).filter((r: any) => String(r.subject_id) === first);
      setScores(Object.fromEntries(matches.map((r: any) => [String(r.student_id), r.score == null ? "" : String(r.score)])));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Results could not be loaded.");
    }
  };

  const save = async () => {
    if (!selectedExam || !subjectId || selectedExam.status === "PUBLISHED") return;
    setBusy(true);
    try {
      const db = getSupabase();
      let enteredBy: string | null = null;
      if (teacher) {
        const tr = await db.from("teachers").select("id").eq("profile_id", user?.id ?? "").maybeSingle();
        if (tr.error) throw tr.error;
        enteredBy = tr.data?.id ?? null;
      }
      const maximum = Number(selectedExam.maximum_score);
      const data: MarkRow[] = students.map(s => {
        const raw = (scores[String(s.id)] ?? "").trim();
        if (!raw) return null;
        const score = Number(raw);
        if (!Number.isFinite(score) || score < 0 || score > maximum) throw new Error(`Invalid mark for ${nameOf(s)}. Enter 0-${maximum}.`);
        return { exam_id: String(selectedExam.id), student_id: String(s.id), subject_id: String(subjectId), score, maximum_score: maximum, grade: levelFromScore(score, maximum), entered_by: enteredBy };
      }).filter((row): row is MarkRow => row !== null);
      if (!data.length) throw new Error("Enter at least one learner mark.");
      const r = await db.from("exam_results").upsert(data, { onConflict: "exam_id,student_id,subject_id" });
      if (r.error) throw r.error;
      const fresh = await db.from("exam_results").select("exam_id,student_id,subject_id,score,maximum_score,grade").eq("exam_id", selectedExam.id);
      if (fresh.error) throw fresh.error;
      setRows(fresh.data ?? []);
      setScores(Object.fromEntries((fresh.data ?? []).filter((r: any) => String(r.subject_id) === String(subjectId)).map((r: any) => [String(r.student_id), r.score == null ? "" : String(r.score)])));
      try {
        const raw = storageKey ? localStorage.getItem(storageKey) : null;
        if (raw) { const draft = JSON.parse(raw); draft.scores = {}; localStorage.setItem(storageKey, JSON.stringify(draft)); }
      } catch { /* Ignore storage cleanup failure. */ }
      setMessage("Marks saved successfully! Complete all required marks before publishing.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Marks could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!admin || !selectedExam) return;
    const incomplete = completion.required > completion.done;
    const confirmation = incomplete
      ? `Only ${completion.done}/${completion.required} learner-subject results are recorded. Blank entries will remain unrecorded (not converted to zero). Publish ${selectedExam.name} anyway for ${classes.find(c => String(c.id) === String(selectedExam.class_id))?.name ?? "this class"}?`
      : `Publish ${selectedExam.name} for ${classes.find(c => String(c.id) === String(selectedExam.class_id))?.name ?? "this class"}? Published marks become official and locked.`;
    if (!window.confirm(confirmation)) return;
    setBusy(true);
    try {
      const r = await getSupabase().from("exams").update({ status: "PUBLISHED" }).eq("id", selectedExam.id).eq("status", "DRAFT");
      if (r.error) throw r.error;
      setMessage("Results published successfully. Reports can now reflect these marks.");
      await refresh();
      await load(String(selectedExam.id));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Results could not be published.");
    } finally {
      setBusy(false);
    }
  };

  const publishGroup = async () => {
    if (!admin || !selectedExam) return;
    const group = examGroups.find(g => g.exams.some(e => String(e.id) === String(selectedExam.id)));
    if (!group) return;
    setBusy(true);
    try {
      const db = getSupabase();
      const incomplete: string[] = [];
      for (const ex of group.exams) {
        const cls = classes.find(c => String(c.id) === String(ex.class_id));
        const en = await db.from("enrollments").select("student_id").eq("class_id", ex.class_id).eq("academic_year_id", cls?.academic_year_id ?? "").eq("status", "ACTIVE");
        if (en.error) throw en.error;
        const studentIds = Array.from(new Set((en.data ?? []).map((x: any) => String(x.student_id))));
        const subjectsForClass = classSubjects.filter(x => String(x.class_id) === String(ex.class_id)).map(x => String(x.subject_id));
        const rs = await db.from("exam_results").select("student_id,subject_id").eq("exam_id", ex.id);
        if (rs.error) throw rs.error;
        const done = new Set((rs.data ?? []).map((x: any) => `${x.student_id}:${x.subject_id}`));
        const required = studentIds.length * subjectsForClass.length;
        if (required === 0 || done.size !== required) incomplete.push(`${cls?.name ?? "Class"} (${done.size}/${required})`);
      }
      if (incomplete.length) {
        const proceed = window.confirm(
          `Some learner-subject results are blank: ${incomplete.join(", ")}. Blank entries will remain unrecorded and will not become zero. Publish ${selectedExam.name} for all ${group.exams.length} classes anyway?`
        );
        if (!proceed) return;
      } else if (!window.confirm(`Publish ${selectedExam.name} for all ${group.exams.length} classes? Published marks become official and locked.`)) return;
      const ids = group.exams.map(e => String(e.id));
      const update = await db.from("exams").update({ status: "PUBLISHED" }).in("id", ids).eq("status", "DRAFT");
      if (update.error) throw update.error;
      setMessage(`School-wide ${selectedExam.name} published successfully for all ${group.exams.length} classes.`);
      await refresh();
      await load(String(selectedExam.id));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Results could not be published.");
    } finally { setBusy(false); }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!admin || !user || !examName.trim()) return;
    setBusy(true);
    try {
      const term = termId || String(terms.find(t => t.is_current && String(t.academic_year_id) === yearId)?.id ?? terms.find(t => String(t.academic_year_id) === yearId)?.id ?? "");
      if (!term) throw new Error("Select a term.");
      const maximum = Number(maxScore);
      const targets = allGrades ? visibleClasses.filter(c => !isEcdeClass(c)) : visibleClasses.filter(c => String(c.id) === classId);
      if (!allGrades && targets.some(isEcdeClass) && maximum !== 4) throw new Error("ECDE assessments use the four competency levels EE, ME, AE and BE, so the maximum score must be 4.");
      if (!targets.length) throw new Error("No active class selected.");
      if (!Number.isFinite(maximum) || maximum <= 0) throw new Error("Maximum score must be greater than zero.");
      if (start > end) throw new Error("End date cannot be before start date.");
      const db = getSupabase();
      const duplicate = await db.from("exams").select("id,class_id").eq("term_id", term).eq("exam_type", examType).eq("maximum_score", maximum).eq("starts_on", start).eq("ends_on", end).ilike("name", examName.trim());
      if (duplicate.error) throw duplicate.error;
      const duplicateClasses = new Set((duplicate.data ?? []).map((x: any) => String(x.class_id)));
      const remaining = targets.filter(c => !duplicateClasses.has(String(c.id)));
      if (!remaining.length) throw new Error(`This ${examType === "ENDTERM" ? "End-Term" : "Exam 1"} already exists for the selected class scope. No duplicate examination was created.`);
      const r = await db.from("exams").insert(remaining.map(c => ({ term_id: term, class_id: c.id, name: examName.trim(), exam_type: examType, maximum_score: maximum, starts_on: start, ends_on: end, status: "DRAFT", created_by: user.id })));
      if (r.error) throw r.error;
      setExamName("");
      setMessage(allGrades ? `Examination created once and assigned to all ${targets.length} active classes as one school-wide assessment.` : "Examination created as DRAFT for the selected class. Marks must be complete before publication.");
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Examination could not be created.");
    } finally {
      setBusy(false);
    }
  };

  if (!admin && !teacher) return <div className="menwe-card p-6">Your role cannot manage examinations.</div>;
  if (loading) return <div className="menwe-card p-8 flex gap-3 items-center"><Loader2 className="animate-spin" />Loading examination workspace…</div>;

  return <div className="grid gap-6">
    {admin && <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7">
      <div className="flex gap-3 items-start"><Layers className="text-[var(--gold)] mt-1" /><div><h1 className="font-serif text-3xl font-semibold">Examinations & publishing</h1><p className="mt-2 text-sm opacity-60">Create an assessment once for all active classes, enter marks by class and subject, monitor completion, then publish only when the full class result is complete.</p></div></div>
      <form onSubmit={create} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input required value={examName} onChange={e => setExamName(e.target.value)} placeholder="Exam name e.g. Opener" className={input} />
        <select value={yearId} onChange={e => { setYearId(e.target.value); setTermId(""); }} className={input}><option value="">Academic year</option>{years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select>
        <select value={termId || String(terms.find(t => t.is_current && String(t.academic_year_id) === yearId)?.id ?? "")} onChange={e => setTermId(e.target.value)} className={input}><option value="">Term</option>{terms.filter(t => String(t.academic_year_id) === yearId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <label className="flex items-center gap-2 rounded-xl border px-3 text-sm"><input type="checkbox" checked={allGrades} onChange={e => setAllGrades(e.target.checked)} />All classes</label>
        {!allGrades && <select value={classId} onChange={e => { const value=e.target.value; setClassId(value); const cls=visibleClasses.find(c=>String(c.id)===value); setMaxScore(isEcdeClass(cls) ? "4" : "100"); }} className={input}><option value="">Class</option>{visibleClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
        <select value={examType} onChange={e => setExamType(e.target.value)} className={input}><option value="EXAM_1">Exam 1</option><option value="ENDTERM">End-Term</option></select>
        <input type="date" value={start} onChange={e => setStart(e.target.value)} className={input} />
        <input type="date" value={end} onChange={e => setEnd(e.target.value)} className={input} />
        <input type="number" min="1" value={maxScore} onChange={e => setMaxScore(e.target.value)} className={input} />
        <button disabled={busy} className="rounded-xl bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white">{busy ? "Working…" : allGrades ? "Create for All Classes" : "Create Examination"}</button>
      </form>
    </section>}

    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7">
      {admin && <div className="mb-4 rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold)]/10 p-4 text-sm"><b>School-wide assessment:</b> Create the exam once with <b>All classes</b>. The system assigns it to every active class automatically; you do not need to create the same exam again for each class.</div>}
      <div className="flex items-center gap-2"><GraduationCap className="text-[var(--gold)]" /><h2 className="font-serif text-2xl font-semibold">Marks workspace</h2></div>
      <select value={examGroups.find(g => g.exams.some(e => String(e.id) === selected))?.key ?? ""} onChange={e => selectExamGroup(e.target.value)} className={`${input} mt-5`}><option value="">Select examination</option>{examGroups.map(g => <option key={g.key} value={g.key}>{g.representative.name} — All {g.exams.length} Classes — {g.representative.status}</option>)}</select>
      {selectedExam && (examGroups.find(g => g.exams.some(e => String(e.id) === selected))?.exams.length ?? 0) > 1 && <select value={selected} onChange={e => void load(e.target.value)} className={`${input} mt-3`}><option value="">Select class</option>{examGroups.find(g => g.exams.some(e => String(e.id) === selected))?.exams.map(e => <option key={e.id} value={e.id}>{classes.find(c => String(c.id) === String(e.class_id))?.name}</option>)}</select>}
      {selectedExam && <>
        <div className="mt-4 rounded-2xl border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><b>{classes.find(c => String(c.id) === String(selectedExam.class_id))?.name} · {selectedExam.name}</b><p className="text-xs opacity-60 mt-1">{completion.done}/{completion.required} required marks entered · {completion.percent}% complete</p></div><div className="flex gap-2 items-center">{selectedExam.status === "PUBLISHED" ? <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-2 text-xs font-bold text-green-800"><Lock size={14} />PUBLISHED</span> : <span className="rounded-full bg-[var(--gold)]/10 px-3 py-2 text-xs font-bold">DRAFT</span>}{admin && selectedExam.status !== "PUBLISHED" && <button onClick={() => void publishGroup()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"><CheckCircle2 size={15} />Publish All Classes</button>}</div></div><div className="mt-3 h-2 rounded-full bg-black/10 overflow-hidden"><div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${completion.percent}%` }} /></div></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{selectedExam.status !== "PUBLISHED" && <select value={subjectId} onChange={e => void load(String(selectedExam.id), e.target.value)} className={input}><option value="">Select subject</option>{availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}<div className="rounded-xl bg-[var(--gold)]/10 px-3 py-3 text-sm">{subjectId ? `${rows.filter(r => String(r.subject_id) === String(subjectId)).length}/${learnerCount} learners have marks for this subject.${selectedExamIsEcde ? " ECDE scale: 4=EE, 3=ME, 2=AE, 1=BE." : ""}` : "Select a subject to enter marks."}</div></div>
        {subjectId && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b text-left"><th className="p-3">#</th><th className="p-3">Admission</th><th className="p-3">Learner</th><th className="p-3">Mark / {selectedExam.maximum_score}</th><th className="p-3">Level</th></tr></thead><tbody>{students.map((s, i) => { const v = scores[String(s.id)] ?? ""; const n = v === "" ? null : Number(v); return <tr key={s.id} className="border-b border-[var(--ink)]/5"><td className="p-3">{i + 1}</td><td className="p-3">{s.admission_number}</td><td className="p-3 font-medium">{nameOf(s)}</td><td className="p-3"><input disabled={selectedExam.status === "PUBLISHED"} value={v} onChange={e => setScores(p => ({ ...p, [String(s.id)]: e.target.value }))} type="number" min="0" max={selectedExam.maximum_score} step="0.01" className="w-32 rounded-lg border px-3 py-2 disabled:bg-black/5" /></td><td className="p-3">{n == null || !Number.isFinite(n) ? "—" : levelFromScore(n, Number(selectedExam.maximum_score))}</td></tr>; })}</tbody></table>{selectedExam.status !== "PUBLISHED" && <div className="mt-4 flex justify-end"><button onClick={() => void save()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}Save Marks</button></div>}</div>}
      </>}
      {message && <p className="mt-4 rounded-xl bg-[var(--gold)]/10 p-3 text-sm">{message}</p>}
    </section>
  </div>;
}
