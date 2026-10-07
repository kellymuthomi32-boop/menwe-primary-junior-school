import { AlertTriangle, CheckCircle2, GraduationCap, Layers, Loader2, Lock, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
};
const isEcdeClass = (c?: Row) => /\b(ECDE|PP1|PP2|PRE PRIMARY|PRE-PRIMARY)\b/i.test(`${c?.name ?? ""} ${c?.code ?? ""} ${c?.level ?? ""}`);
const gradeFromClass = (c?: Row) => {
  const raw = `${c?.name ?? ""} ${c?.code ?? ""} ${c?.level ?? ""}`.toUpperCase();
  const m = raw.match(/(?:GRADE|CLASS|STD|STANDARD|G)\s*([1-9])\b/);
  return m ? Number(m[1]) : null;
};
const isGrade4or5Class = (c?: Row) => [4, 5].includes(gradeFromClass(c) ?? 0);
const examTypeLabel = (type: string, c?: Row) =>
  type === "ENDTERM" ? "End-Term" : type === "EXAM_1" && isGrade4or5Class(c) ? "Opener" : "Exam 1";

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
  const loadRequestRef = useRef("");
  const storageKey = user?.id ? `menwe:marks-workspace:${user.id}` : "";
  // Keep render-time derived values above effects that reference them.
  // A later const referenced in a hook dependency array triggers a TDZ
  // ReferenceError during render ("Cannot access 'Z' before initialization").

  const refresh = useCallback(async () => {
    if (!user || (!admin && !teacher)) return;
    setLoading(true);
    try {
      const db = getSupabase();
      let a: Row[] = [];
      let currentTeacherId: string | null = null;
      if (teacher) {
        const tr = await db.from("teachers").select("id").eq("profile_id", user.id).maybeSingle();
        if (tr.error) throw tr.error;
        if (!tr.data) throw new Error("Your teacher record is not linked yet.");
        currentTeacherId = String(tr.data.id);
        const ar = await db.from("teacher_assignments").select("id,class_id,subject_id").eq("teacher_id", tr.data.id);
        if (ar.error) throw ar.error;
        a = ar.data ?? [];
      }
      const [y, t, c, s, cs, e] = await Promise.all([
        db.from("academic_years").select("id,name,is_current,status").eq("status", "ACTIVE").order("starts_on", { ascending: false }),
        db.from("terms").select("id,academic_year_id,name,is_current,status").eq("status", "ACTIVE").order("starts_on", { ascending: false }),
        db.from("classes").select("id,academic_year_id,name,status,class_teacher_id").eq("status", "ACTIVE").order("name"),
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
      // Class teachers can enter marks for every subject in their own class even
      // if subject-specific assignment rows have not been duplicated for them.
      const classTeacherAssignments = teacher && currentTeacherId
        ? (c.data ?? [])
            .filter((cls: any) => String(cls.class_teacher_id ?? "") === currentTeacherId)
            .flatMap((cls: any) => (cs.data ?? [])
              .filter((subject: any) => String(subject.class_id) === String(cls.id))
              .map((subject: any) => ({ class_id: cls.id, subject_id: subject.subject_id })))
        : [];
      const mergedAssignments = [...a, ...classTeacherAssignments].filter((item: any, index: number, all: any[]) =>
        all.findIndex((other: any) => String(other.class_id) === String(item.class_id) && String(other.subject_id) === String(item.subject_id)) === index
      );
      setAssignments(mergedAssignments);
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

  // Marks workspace invariant: the selected exam owns the class context.
  // A subject restored from another class must never survive an exam switch.
  useEffect(() => {
    if (!selectedExam || !subjectId) return;
    const examClassId = String(selectedExam.class_id);
    // Admins are not represented in teacher_assignments. For them, validate
    // against the class_subjects mapping; teachers must have an assignment.
    const validForExam = admin
      ? classSubjects.some(a => String(a.class_id) === examClassId && String(a.subject_id) === String(subjectId))
      : assignments.some(a => String(a.class_id) === examClassId && String(a.subject_id) === String(subjectId));
    if (!validForExam) {
      setSubjectId("");
      setScores({});
      setRows([]);
      setStudents([]);
    }
  }, [selectedExam?.id, selectedExam?.class_id, subjectId, assignments, classSubjects, admin]);
  const selectedExamClass = classes.find(c => String(c.id) === String(selectedExam?.class_id));
  const selectedExamIsEcde = isEcdeClass(selectedExamClass);
  const mappedSubjectIds = classSubjects.filter(x => String(x.class_id) === String(selectedExam?.class_id)).map(x => String(x.subject_id));
  const assignedSubjectIds = teacher ? assignments.filter(a => String(a.class_id) === String(selectedExam?.class_id)).map(a => String(a.subject_id)) : [];
  // A valid teacher assignment must remain usable even if the class-subject mapping is stale.
  const requiredSubjects = [...new Set([...mappedSubjectIds, ...assignedSubjectIds])];
  const availableSubjectIds = new Set(assignments.filter(a => String(a.class_id) === String(selectedExam?.class_id)).map(a => String(a.subject_id)));
  const availableSubjects = subjects.filter(s => requiredSubjects.includes(String(s.id)) && (!teacher || availableSubjectIds.has(String(s.id))));

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
    loadRequestRef.current = `${id}:${override ?? ""}`;
    setSelected(id);
    setSubjectId(override ?? "");
    setScores({});
    setRows([]);
    setStudents([]);
    setMessage(null);
    const db = getSupabase();
    let exam = exams.find(e => String(e.id) === id);
    if (!exam) {
      // A browser may retain an exam id from before an administrator recreated
      // the assessment. Re-read the current exam list before showing a false
      // "exam does not exist" state.
      const liveList = await db.from("exams")
        .select("id,term_id,class_id,name,exam_type,maximum_score,starts_on,ends_on,status,created_at")
        .order("created_at", { ascending: false });
      if (liveList.error) {
        setMessage(errorMessage(liveList.error, "The current examinations could not be refreshed."));
        return;
      }
      setExams(liveList.data ?? []);
      exam = (liveList.data ?? []).find((e: any) => String(e.id) === id);
      if (!exam) {
        setSelected("");
        setSubjectId("");
        setRows([]);
        setStudents([]);
        setMessage("That examination is no longer available. The current examination list has been refreshed; please select the current End-Term examination.");
        return;
      }
    }
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

  useEffect(() => {
    if (!draftRestored || !exams.length) return;
    const saved = selected ? exams.find(e => String(e.id) === String(selected)) : null;
    if (!saved) {
      const fallback = visibleExams[0];
      if (fallback) {
        setSelected(String(fallback.id));
        setSubjectId("");
        setScores({});
        setRows([]);
        setStudents([]);
      } else if (selected) {
        setSelected("");
        setSubjectId("");
        setScores({});
      }
      return;
    }
    const savedSubject = subjectId;
    const requestKey = `${saved.id}:${savedSubject || ""}`;
    if (students.length === 0 && loadRequestRef.current !== requestKey) void load(String(saved.id), savedSubject || undefined);
  }, [draftRestored, selected, exams, subjectId, visibleExams, students.length]);

  const saveLearner = async (student: Row) => {
    if (!selectedExam || !subjectId || selectedExam.status === "PUBLISHED") return;
    const raw = (scores[String(student.id)] ?? "").trim();
    if (!raw) {
      setMessage(`Enter a mark for ${nameOf(student)} before saving.`);
      return;
    }
    setBusy(true);
    try {
      const db = getSupabase();
      const score = Number(raw);
      const maximum = Number(selectedExam.maximum_score);
      if (!Number.isFinite(score) || score < 0 || score > maximum) throw new Error(`Invalid mark for ${nameOf(student)}. Enter 0-${maximum}.`);
      let enteredBy: string | null = null;
      if (teacher) {
        const tr = await db.from("teachers").select("id").eq("profile_id", user?.id ?? "").maybeSingle();
        if (tr.error) throw tr.error;
        enteredBy = tr.data?.id ?? null;
      }
      const live = await db.from("exams").select("id,maximum_score,status").eq("id", selectedExam.id).maybeSingle();
      if (live.error) throw live.error;
      if (!live.data) throw new Error("No current examination is available for this class.");
      if (live.data.status === "PUBLISHED") throw new Error("This examination is published and locked.");
      const liveMaximum = Number(live.data.maximum_score);
      const result = {
        exam_id: String(live.data.id),
        student_id: String(student.id),
        subject_id: String(subjectId),
        score,
        maximum_score: liveMaximum,
        grade: levelFromScore(score, liveMaximum),
        entered_by: enteredBy,
      };
      const r = await db.from("exam_results").upsert(result, { onConflict: "exam_id,student_id,subject_id" });
      if (r.error) throw r.error;
      setRows(prev => {
        const key = `${result.student_id}:${result.subject_id}`;
        const next = prev.filter(x => `${x.student_id}:${x.subject_id}` !== key);
        return [...next, result];
      });
      setMessage(`${nameOf(student)}'s mark saved successfully. You can continue with the next learner.`);
    } catch (e) {
      setMessage(errorMessage(e, `Mark for ${nameOf(student)} could not be saved. Please retry.`));
    } finally {
      setBusy(false);
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

      // The browser can retain an old exam id in localStorage after an admin recreates
      // an examination. Resolve the id against the live database immediately before
      // writing so marks can never be posted against a deleted/replaced exam.
      let exam = selectedExam;
      const live = await db.from("exams")
        .select("id,term_id,class_id,name,exam_type,maximum_score,status,created_at")
        .eq("id", selectedExam.id)
        .maybeSingle();
      if (live.error) throw live.error;
      if (!live.data) {
        // Re-read the list and recover automatically if an administrator has
        // replaced the exam since the teacher opened the workspace.
        const replacement = await db.from("exams")
          .select("id,term_id,class_id,name,exam_type,maximum_score,status,created_at")
          .eq("term_id", selectedExam.term_id)
          .eq("class_id", selectedExam.class_id)
          .eq("exam_type", selectedExam.exam_type)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (replacement.error) throw replacement.error;
        if (!replacement.data) {
          // If the assessment truly no longer exists, recover the teacher's
          // workspace to the newest matching End-Term/assessment rather than
          // surfacing a stale-ID warning during normal marks entry.
          const current = await db.from("exams")
            .select("id,term_id,class_id,name,exam_type,maximum_score,status,created_at")
            .eq("term_id", selectedExam.term_id)
            .eq("class_id", selectedExam.class_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (current.error) throw current.error;
          if (!current.data) {
            throw new Error("No current examination is available for this class.");
          }
          exam = current.data;
        } else {
          exam = replacement.data;
        }
        // Seamlessly switch the draft to the live examination ID. The teacher
        // stays on the same class/subject and can save without reselecting it.
        setSelected(String(exam.id));
        setSubjectId(String(subjectId));
      }

      if (exam.status === "PUBLISHED") throw new Error("This examination is published and locked.");
      const maximum = Number(exam.maximum_score);
      if (!Number.isFinite(maximum) || maximum <= 0) throw new Error("The examination maximum score is invalid.");
      const data: MarkRow[] = students.map(s => {
        const raw = (scores[String(s.id)] ?? "").trim();
        if (!raw) return null;
        const score = Number(raw);
        if (!Number.isFinite(score) || score < 0 || score > maximum) throw new Error(`Invalid mark for ${nameOf(s)}. Enter 0-${maximum}.`);
        return { exam_id: String(exam.id), student_id: String(s.id), subject_id: String(subjectId), score, maximum_score: maximum, grade: levelFromScore(score, maximum), entered_by: enteredBy };
      }).filter((row): row is MarkRow => row !== null);
      if (!data.length) throw new Error("Enter at least one learner mark.");

      let r = await db.from("exam_results").upsert(data, { onConflict: "exam_id,student_id,subject_id" });
      if (r.error && /Exam does not exist/i.test(r.error.message ?? "")) {
        // A short replacement race can occur after the pre-save lookup. Resolve
        // the live exam once more and retry so teachers are not shown the
        // database trigger's internal "Exam does not exist" message.
        const current = await db.from("exams")
          .select("id,term_id,class_id,name,exam_type,maximum_score,status,created_at")
          .eq("term_id", exam.term_id)
          .eq("class_id", exam.class_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (current.error) throw current.error;
        if (!current.data) throw new Error("No current examination is available for this class.");
        if (current.data.status === "PUBLISHED") throw new Error("This examination is published and locked.");
        const retryMaximum = Number(current.data.maximum_score);
        const retryData = data.map(row => ({
          ...row,
          exam_id: String(current.data.id),
          maximum_score: retryMaximum,
          grade: levelFromScore(row.score, retryMaximum),
        }));
        r = await db.from("exam_results").upsert(retryData, { onConflict: "exam_id,student_id,subject_id" });
        if (r.error) throw r.error;
        exam = current.data;
        setSelected(String(exam.id));
      }
      if (r.error) throw r.error;
      const fresh = await db.from("exam_results").select("exam_id,student_id,subject_id,score,maximum_score,grade").eq("exam_id", exam.id);
      if (fresh.error) throw fresh.error;
      setRows(fresh.data ?? []);
      setScores(Object.fromEntries((fresh.data ?? []).filter((r: any) => String(r.subject_id) === String(subjectId)).map((r: any) => [String(r.student_id), r.score == null ? "" : String(r.score)])));
      try {
        const raw = storageKey ? localStorage.getItem(storageKey) : null;
        if (raw) { const draft = JSON.parse(raw); draft.selected = String(exam.id); draft.scores = {}; localStorage.setItem(storageKey, JSON.stringify(draft)); }
      } catch { /* Ignore storage cleanup failure. */ }
      setMessage("Marks saved successfully! Complete all required marks before publishing.");
    } catch (e) {
      const msg = errorMessage(e, "Marks could not be saved. Check your assignment and exam permissions, then retry.");
      setMessage(msg);
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
      if (!remaining.length) throw new Error(`This ${examTypeLabel(examType, allGrades ? undefined : visibleClasses.find(c => String(c.id) === classId))} already exists for the selected class scope. No duplicate examination was created.`);
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
        <select value={examType} onChange={e => setExamType(e.target.value)} className={input}><option value="EXAM_1">{!allGrades && isGrade4or5Class(visibleClasses.find(c => String(c.id) === classId)) ? "Opener" : "Exam 1"}</option><option value="ENDTERM">End-Term</option></select>
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
        {subjectId && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b text-left"><th className="p-3">#</th><th className="p-3">Admission</th><th className="p-3">Learner</th><th className="p-3">Mark / {selectedExam.maximum_score}</th><th className="p-3">Level</th><th className="p-3">Save</th></tr></thead><tbody>{students.map((s, i) => { const v = scores[String(s.id)] ?? ""; const n = v === "" ? null : Number(v); return <tr key={s.id} className="border-b border-[var(--ink)]/5"><td className="p-3">{i + 1}</td><td className="p-3">{s.admission_number}</td><td className="p-3 font-medium">{nameOf(s)}</td><td className="p-3"><input disabled={selectedExam.status === "PUBLISHED"} value={v} onChange={e => setScores(p => ({ ...p, [String(s.id)]: e.target.value }))} type="number" min="0" max={selectedExam.maximum_score} step="0.01" className="w-32 rounded-lg border px-3 py-2 disabled:bg-black/5" /></td><td className="p-3">{n == null || !Number.isFinite(n) ? "—" : levelFromScore(n, Number(selectedExam.maximum_score))}</td><td className="p-3"><button type="button" onClick={() => void saveLearner(s)} disabled={busy || v === ""} className="inline-flex items-center gap-1 rounded-lg border border-[var(--ink)]/15 bg-white px-3 py-2 text-xs font-bold text-[var(--ink)] disabled:opacity-40"><Save size={14} />Save</button></td></tr>; })}</tbody></table>{selectedExam.status !== "PUBLISHED" && <div className="mt-4 flex justify-end"><button onClick={() => void save()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}Save Marks</button></div>}</div>}
      </>}
      {message && <div role="status" aria-live="polite" className={`fixed right-4 top-4 z-[100] max-w-[min(92vw,28rem)] rounded-2xl border p-4 text-sm font-semibold shadow-2xl backdrop-blur-sm sm:right-6 sm:top-6 ${/successfully/i.test(message) ? "border-emerald-200 bg-emerald-50/95 text-emerald-800" : "border-amber-200 bg-amber-50/95 text-amber-900"}`}><div className="flex items-start gap-3"><span className="mt-0.5 shrink-0">{/successfully/i.test(message) ? "✓" : "!"}</span><span>{message}</span><button type="button" aria-label="Dismiss notification" onClick={() => setMessage(null)} className="ml-auto shrink-0 rounded-lg px-2 py-1 text-lg leading-none opacity-60 hover:opacity-100">×</button></div></div>}
    </section>
  </div>;
}
