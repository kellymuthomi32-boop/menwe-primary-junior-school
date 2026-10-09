// Report-card arrangement: learner selector is ordered Grade 1 → Grade 9; report subjects mirror class marksheet subjects.
// Report-card canonical-subject deployment marker: lower/upper Creative Arts, CRE and Integrated Science use canonical subject IDs; staff see DRAFT + PUBLISHED.
// Report-card entered-results deployment marker: staff can view DRAFT + PUBLISHED results; families remain publication-limited.
import { FileDown, Loader2, Printer, RefreshCw, Save, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getSupabase } from "@/lib/supabase";
import { persistReportCardWithItems } from "@/lib/reportCardPersistence";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import "../report-card.css";

type Row = Record<string, any>;
type Band = "ECDE" | "LOWER_PRIMARY" | "UPPER_PRIMARY" | "JUNIOR_SCHOOL";
type ReportSubject = { id: string; code: string; name: string; synthetic?: boolean; componentIds?: string[] };
type ReportLine = ReportSubject & { score: number | null; max: number | null; percentage: number | null; level: number | null; levelCode: string; remark: string; exam1Score: number | null; exam1Max: number | null; endTermScore: number | null; endTermMax: number | null };

const ADMINS = ["SUPER_ADMIN", "ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI"];
const input = "min-h-11 rounded-xl border border-[#D7E5DC] bg-white px-3 py-2.5 text-sm font-semibold text-[#17352A] outline-none transition focus:border-[#D7A52A] focus:ring-2 focus:ring-[#D7A52A]/20";
const normalize = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const fmt = (v: number | null) => v == null || !Number.isFinite(v) ? "—" : Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, "");
const learnerName = (s: Row) => [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");
// Normalize PostgREST many-to-one relations whether the client returns an object or an array.
const examOf = (row: Row): Row => Array.isArray(row?.exams) ? (row.exams[0] ?? {}) : (row?.exams ?? {});

function achievement(value: number | null, ecde = false) {
  if (value == null) return null;
  const p = Math.max(0, Math.min(100, value));
  if (ecde) {
    if (p >= 76) return { code: "EE", level: 4, points: 4, remark: "Exceeding Expectations" };
    if (p >= 51) return { code: "ME", level: 3, points: 3, remark: "Meeting Expectations" };
    if (p >= 26) return { code: "AE", level: 2, points: 2, remark: "Approaching Expectations" };
    return { code: "BE", level: 1, points: 1, remark: "Below Expectations" };
  }
  if (p >= 90) return { code: "EE1", level: 8, points: 8, remark: "Exceptional" };
  if (p >= 75) return { code: "EE2", level: 7, points: 7, remark: "Very Good" };
  if (p >= 58) return { code: "ME1", level: 6, points: 6, remark: "Good" };
  if (p >= 41) return { code: "ME2", level: 5, points: 5, remark: "Fair" };
  if (p >= 31) return { code: "AE1", level: 4, points: 4, remark: "Needs Improvement" };
  if (p >= 21) return { code: "AE2", level: 3, points: 3, remark: "Below Average" };
  if (p >= 11) return { code: "BE1", level: 2, points: 2, remark: "Well Below Average" };
  return { code: "BE2", level: 1, points: 1, remark: "Minimal" };
}

function gradeFromClass(c?: Row) {
  const raw = normalize(`${c?.name ?? ""} ${c?.code ?? ""} ${c?.level ?? ""}`);
  const m = raw.match(/(?:GRADE|CLASS|STD|STANDARD|G)\s*([1-9])/);
  return m ? Number(m[1]) : null;
}
function assessmentSlot(row: Row): "EXAM 1" | "ENDTERM" | null {
  // PostgREST normally returns the many-to-one exam relation as an object;
  // tolerate an array too so assessment detection is stable across query shapes.
  const related = examOf(row);
  const type = normalize(related.exam_type);
  const name = normalize(related.name);
  const matches = (value: string, terms: string[]) => terms.some(term => value === term || value.includes(term));
  // Check End-Term first so a title like "End-Term Exam 1" is not misclassified.
  if (matches(type, ["ENDTERM", "END TERM", "END OF TERM", "FINAL EXAM"]) ||
      matches(name, ["ENDTERM", "END TERM", "END OF TERM", "FINAL EXAM"])) return "ENDTERM";
  if (matches(type, ["EXAM 1", "OPENER", "OPENING", "FIRST ASSESSMENT", "ASSESSMENT 1"]) ||
      matches(name, ["EXAM 1", "OPENER", "OPENING", "FIRST ASSESSMENT", "ASSESSMENT 1"])) return "EXAM 1";
  return null;
}
function assessmentLabel(row: Row, c?: Row) {
  const slot = assessmentSlot(row);
  if (slot === "EXAM 1" && (gradeFromClass(c) ?? 99) >= 1 && (gradeFromClass(c) ?? 99) <= 6) return "Opener";
  return slot === "ENDTERM" ? "End-Term" : slot === "EXAM 1" ? "Exam 1" : String(examOf(row).name ?? "Assessment");
}

function bandFromClass(c?: Row): Band {
  const raw = normalize(`${c?.name ?? ""} ${c?.code ?? ""} ${c?.level ?? ""}`);
  if (/\b(ECDE|PP1|PP2|PRE PRIMARY|PRE-PRIMARY)\b/.test(raw)) return "ECDE";
  const g = gradeFromClass(c);
  if (g != null) return g <= 3 ? "LOWER_PRIMARY" : g <= 6 ? "UPPER_PRIMARY" : "JUNIOR_SCHOOL";
  if (/LOWER|PRIMARY 1|PRIMARY 2|PRIMARY 3/.test(raw)) return "LOWER_PRIMARY";
  if (/UPPER|PRIMARY 4|PRIMARY 5|PRIMARY 6/.test(raw)) return "UPPER_PRIMARY";
  return "JUNIOR_SCHOOL";
}

const is = (s: Row, pattern: RegExp) => pattern.test(normalize(`${s.code} ${s.name}`));
const isEnglish = (s: Row) => is(s, /\b(ENGLISH|ENG)\b/);
const isKiswahili = (s: Row) => is(s, /\b(KISWAHILI|KIS|KSW)\b/);
const isMath = (s: Row) => is(s, /\b(MATHEMATICS|MATH|MAT)\b/);
const isScience = (s: Row) => is(s, /\b(INTEGRATED SCIENCE|SCIENCE TECHNOLOGY|SCI)\b/);
const isSST = (s: Row) => is(s, /\b(SOCIAL STUDIES|SST)\b/);
const isAgriculture = (s: Row) => is(s, /\b(AGRICULTURE|AGR)\b/);
const isHomeScience = (s: Row) => is(s, /\b(HOME SCIENCE|HSC)\b/);
const isICT = (s: Row) => is(s, /\b(ICT|INFORMATION COMMUNICATION TECHNOLOGY|COMPUTER)\b/);
const isCAS = (s: Row) => is(s, /\b(CREATIVE ARTS|CREATIVE ARTS AND SPORTS|CREATIVE ACTIVITIES|CREATIVE ACT|CRE ACT|CAS|ART|MUSIC|MUS|PHYSICAL EDUCATION|PE)\b/);
const isReligious = (s: Row) => is(s, /\b(CHRISTIAN RELIGIOUS EDUCATION|RELIGIOUS EDUCATION|RELIGION|CRE|IRE|HRE|RE)\b/);
const isPreTech = (s: Row) => is(s, /\b(PRE TECHNICAL|PRE TECH|PRE CAREER|PRE)\b/);

const priority: Record<string, number> = { ENG: 10, KIS: 20, MATH: 30, "INT SCI": 40, SST: 50, RE: 60, CAS: 70, "AGR NUT": 80, "PRE TECH": 90 };
const sortSubjects = (xs: ReportSubject[]) => [...xs].sort((a,b)=>(priority[a.code]??999)-(priority[b.code]??999)||a.name.localeCompare(b.name));

function canonicalSubjects(all: Row[], _band: Band): ReportSubject[] {
  return all.map((s, index) => ({
    id: String(s.id),
    code: String(s.code ?? `SUBJ${index + 1}`),
    name: String(s.name),
    synthetic: false,
  }));
}

const upperCreativeComponent = (s: Row) =>
  is(s, /\b(CREATIVE ARTS|CREATIVE ACTIVITIES|CREATIVE ACT|ART|MUSIC|PHYSICAL EDUCATION|PE)\b/) &&
  !is(s, /\bCREATIVE ARTS AND SPORTS\b/);

const upperScienceComponent = (s: Row) =>
  is(s, /\b(AGRICULTURE|HOME SCIENCE|HSC|INFORMATION COMMUNICATION TECHNOLOGY|ICT|COMPUTER)\b/);

function reportAreasForBand(subjects: Row[], band: Band, includeUpperCRE = false, className = ""): ReportSubject[] {
  const canonical = canonicalSubjects(subjects, band);

  if (band === "ECDE") {
    const isPP1 = /\bPP1\b/i.test(className);
    const ppAreas = canonical.filter(s => /^PP-/.test(String(s.code)));
    if (!isPP1) return sortSubjects(ppAreas);
    const env = ppAreas.find(s => s.code === "PP-ENV");
    const cre = ppAreas.find(s => s.code === "PP-CRE");
    const merged: ReportSubject[] = ppAreas.filter(s => s.code !== "PP-CRE");
    if (env && cre) {
      const index = merged.findIndex(s => s.id === env.id);
      if (index >= 0) merged[index] = { ...env, name: "Environmental and Religious Activities", code: "PP-ENV-CRE", synthetic: true, componentIds: [env.id, cre.id] };
    } else if (env) {
      const index = merged.findIndex(s => s.id === env.id);
      if (index >= 0) merged[index] = { ...env, name: "Environmental and Religious Activities", code: "PP-ENV-CRE", synthetic: true };
    }
    return sortSubjects(merged);
  }

  if (band === "LOWER_PRIMARY") {
    // Menwe Lower Primary report cards use exactly four learning areas:
    // English, Kiswahili, Mathematics and Environmental Activities.
    return sortSubjects(canonical.filter(s =>
      isEnglish(s) ||
      isKiswahili(s) ||
      isMath(s) ||
      is(s, /\b(ENVIRONMENTAL|ENVIRONMENT|ENV|INTEGRATED LEARNING AREAS)\b/)
    ));
  }

  if (band === "UPPER_PRIMARY") {
    // Upper Primary report cards mirror the six learning areas actually
    // used by the live Upper Primary marksheet:
    // English, Kiswahili, Mathematics, Integrated Science,
    // Social Studies, and Creative Arts & Sports.
    const direct = (finder: (s: Row) => boolean, code: string) => {
      const found = canonical.find(finder);
      return found ? { ...found, code, synthetic: false } : null;
    };

    const upper: ReportSubject[] = [
      direct(isEnglish, "ENG"),
      direct(isKiswahili, "KIS"),
      direct(isMath, "MATH"),
      direct(isScience, "INT SCI"),
      direct(isSST, "SST"),
      ...(includeUpperCRE ? [direct(isReligious, "RE")].filter(Boolean) as ReportSubject[] : []),
      direct(s => is(s, /\bCREATIVE ARTS AND SPORTS\b/), "CAS"),
    ].filter(Boolean) as ReportSubject[];

    return sortSubjects(upper);
  }

  const codes = ["ENG", "KIS", "MATH", "INT SCI", "SST", "CAS", "AGR NUT", "RE", "PRE TECH"];
  const out: ReportSubject[] = [];
  for (const code of codes) {
    const found = code === "INT SCI"
      ? canonical.find(s => is(s, /\b(INTEGRATED SCIENCE|SCIENCE TECHNOLOGY)\b/))
      : code === "CAS"
        ? canonical.find(s => is(s, /\bCREATIVE ARTS AND SPORTS\b/))
        : canonical.find(s => {
            if (code === "ENG") return isEnglish(s);
            if (code === "KIS") return isKiswahili(s);
            if (code === "MATH") return isMath(s);
            if (code === "SST") return isSST(s);
            if (code === "AGR NUT") return isAgriculture(s);
            if (code === "RE") return isReligious(s);
            if (code === "PRE TECH") return isPreTech(s);
            return false;
          });
    if (found) out.push({ ...found, code });
  }
  return out.length ? out : sortSubjects(canonical);
}

const bandTitle = (band: Band) => band === "ECDE" ? "ECDE Competency Report Card" :
  band === "LOWER_PRIMARY" ? "Lower Primary Report Card" :
  band === "UPPER_PRIMARY" ? "Upper Primary Report Card" : "Junior School Report Card";

const assessmentColumnLabel = (c?: Row) => {
  const grade = gradeFromClass(c) ?? 99;
  return grade >= 1 && grade <= 6 ? "Opener" : "Exam 1";
};

const examTypeRank = (value: unknown) => {
  const type = normalize(value);
  return type === "EXAM 1" || type === "OPENER" || type === "OPENING" ? 1 :
    type === "ENDTERM" || type === "END TERM" ? 2 : 99;
};

function canonicalTermResults(rows: Row[]) {
  // A term report has exactly two assessment slots: Exam 1 and End-Term.
  // If an old/duplicate record exists, use the most recently dated exam of
  // that type so stale records cannot silently contaminate the report.
  const byType = new Map<string, Row>();
  for (const row of rows) {
    const type = assessmentSlot(row);
    if (!type) continue;
    const exam = examOf(row);
    const id = String(exam.id ?? row.exam_id ?? "");
    if (!id) continue;
    const previous = byType.get(type);
    const currentDate = String(exam.ends_on ?? exam.starts_on ?? "");
    const previousExam = previous ? examOf(previous) : {};
    const previousDate = String(previousExam.ends_on ?? previousExam.starts_on ?? "");
    if (!previous || currentDate >= previousDate) byType.set(type, row);
  }
  const ids = new Set([...byType.values()].map(row => String(examOf(row).id ?? row.exam_id ?? "")));
  return rows.filter(row => ids.has(String(examOf(row).id ?? row.exam_id ?? "")));
}

function assessmentSummary(rows: Row[], ecde = false) {
  if (ecde) {
    // ECDE report cards use End-Term only. Retain EVERY subject result from
    // the latest End-Term exam and never substitute an Opener/other assessment.
    const endTermRows = rows.filter(row => assessmentSlot(row) === "ENDTERM");
    const examById = new Map<string, Row>();
    for (const row of endTermRows) {
      const exam = examOf(row);
      const id = String(exam.id ?? row.exam_id ?? "");
      if (!id) continue;
      const previous = examById.get(id);
      const currentDate = String(exam.ends_on ?? exam.starts_on ?? "");
      const previousExam = previous ? examOf(previous) : {};
      const previousDate = String(previousExam.ends_on ?? previousExam.starts_on ?? "");
      if (!previous || currentDate >= previousDate) examById.set(id, row);
    }
    const latest = [...examById.values()].sort((a,b) =>
      String(examOf(b).ends_on ?? examOf(b).starts_on ?? "").localeCompare(String(examOf(a).ends_on ?? examOf(a).starts_on ?? ""))
    )[0];
    const latestId = latest ? String(examOf(latest).id ?? latest.exam_id ?? "") : "";
    return latestId ? endTermRows.filter(row => String(examOf(row).id ?? row.exam_id ?? "") === latestId) : [];
  }
  const byType = new Map<string, Row>();
  for (const row of rows) {
    const type = assessmentSlot(row);
    if (!type) continue;
    const exam = examOf(row);
    const id = String(exam.id ?? row.exam_id ?? "");
    if (!id) continue;
    const previous = byType.get(type);
    const currentDate = String(exam.ends_on ?? exam.starts_on ?? "");
    const previousExam = previous ? examOf(previous) : {};
    const previousDate = String(previousExam.ends_on ?? previousExam.starts_on ?? "");
    if (!previous || currentDate >= previousDate) byType.set(type, row);
  }
  return [...byType.values()].sort((a,b) => examTypeRank(examOf(a).exam_type) - examTypeRank(examOf(b).exam_type));
}

function aggregate(rows: Row[], ids: string[]) {
  const chosen = rows.filter(r=>ids.includes(String(r.subject_id)));
  const score = chosen.reduce((n,r)=>n+(num(r.score)??0),0);
  const max = chosen.reduce((n,r)=>n+(num(r.maximum_score)??0),0);
  return max>0 ? {score,max,percentage:score/max*100}:null;
}
function lineFor(subject: ReportSubject, results: Row[], ecde = false): ReportLine {
  const ids = subject.componentIds?.length ? subject.componentIds : [subject.id];
  if (ecde) {
    const assessment = aggregate(assessmentSummary(results, true), ids);
    const p = assessment?.percentage ?? null;
    const ach = achievement(p, true);
    return { ...subject, score: assessment?.score ?? null, max: assessment?.max ?? null, percentage: p,
      level: ach?.level ?? null, levelCode: ach?.code ?? "—",
      remark: p == null ? "No recorded assessment" : (ach?.remark ?? "No recorded result"),
      exam1Score: null, exam1Max: null, endTermScore: assessment?.score ?? null, endTermMax: assessment?.max ?? null };
  }
  const exam1 = aggregate(results.filter(r => assessmentSlot(r) === "EXAM 1"), ids);
  const endTerm = aggregate(results.filter(r => assessmentSlot(r) === "ENDTERM"), ids);
  // A final term percentage is only valid when both official assessments exist.
  // Never turn a one-assessment record into a fabricated combined result.
  const complete = !!exam1 && !!endTerm && (exam1.max ?? 0) > 0 && (endTerm.max ?? 0) > 0;
  // Keep each learning area on a 0–100 scale. The combined result is the
  // mean of the Opener and End-Term percentages, not a misleading /200 total.
  const combined = complete
    ? { score: (((exam1!.score ?? 0) / (exam1!.max ?? 1)) * 100 + ((endTerm!.score ?? 0) / (endTerm!.max ?? 1)) * 100) / 2, max: 100,
        percentage: (((exam1!.score ?? 0) / (exam1!.max ?? 1)) * 100 + ((endTerm!.score ?? 0) / (endTerm!.max ?? 1)) * 100) / 2 }
    : null;
  const p = combined?.percentage ?? null;
  const ach = achievement(p, subject.code.startsWith("PP-"));
  const remark = p == null
    ? (exam1 || endTerm ? "Incomplete assessment record" : "No recorded result")
    : (ach?.remark ?? "No recorded result");
  return {
    ...subject,
    score: combined?.score ?? null,
    max: combined?.max ?? null,
    percentage: p,
    level: ach?.level ?? null,
    levelCode: ach?.code ?? "—",
    remark,
    exam1Score: exam1?.score ?? null,
    exam1Max: exam1?.max ?? null,
    endTermScore: endTerm?.score ?? null,
    endTermMax: endTerm?.max ?? null,
  };
}
function annualLineFor(subject: ReportSubject, results: Row[], ecde = false): ReportLine {
  const byTerm = new Map<string, Row[]>();
  for (const row of results) {
    const termId = String(examOf(row).term_id ?? "");
    if (!termId) continue;
    const bucket = byTerm.get(termId) ?? [];
    bucket.push(row);
    byTerm.set(termId, bucket);
  }
  const termLines = [...byTerm.values()]
    .map(termRows => lineFor(subject, termRows, ecde))
    .filter(line => line.percentage != null);
  if (!termLines.length) {
    return { ...subject, score: null, max: null, percentage: null, level: null, levelCode: "—",
      remark: results.length ? "Incomplete annual assessment record" : "No recorded result",
      exam1Score: null, exam1Max: null, endTermScore: null, endTermMax: null };
  }
  const percentage = termLines.reduce((sum, line) => sum + (line.percentage ?? 0), 0) / termLines.length;
  const ach = achievement(percentage, subject.code.startsWith("PP-"));
  // Annual reports still show the underlying assessment columns. When the
  // year contains multiple terms, aggregate each assessment slot across the
  // year rather than discarding the values and rendering "Not taken".
  const annualExam1 = aggregate(results.filter(r => assessmentSlot(r) === "EXAM 1"), subject.componentIds?.length ? subject.componentIds : [subject.id]);
  const annualEndTerm = aggregate(results.filter(r => assessmentSlot(r) === "ENDTERM"), subject.componentIds?.length ? subject.componentIds : [subject.id]);
  return { ...subject, score: percentage, max: 100, percentage,
    level: ach?.level ?? null, levelCode: ach?.code ?? "—", remark: ach?.remark ?? "Annual performance",
    exam1Score: annualExam1?.score ?? null, exam1Max: annualExam1?.max ?? null,
    endTermScore: annualEndTerm?.score ?? null, endTermMax: annualEndTerm?.max ?? null };
}
function attendancePercent(rows: Row[]) {
  const total=rows.length; if(!total)return null;
  const present=rows.filter(r=>/PRESENT|LATE/.test(normalize(r.status))).length;
  return present/total*100;
}

export default function ReportCardsDirectory(){
  const {user,profile}=useSchoolAuth(); const admin=ADMINS.includes(profile?.role??""); const canUseEnteredResults=admin||profile?.role==="TEACHER";
  const [students,setStudents]=useState<Row[]>([]),[years,setYears]=useState<Row[]>([]),[terms,setTerms]=useState<Row[]>([]),[classes,setClasses]=useState<Row[]>([]);
  const [studentId,setStudentId]=useState(""),[yearId,setYearId]=useState(""),[termId,setTermId]=useState(""),[mode,setMode]=useState<"term"|"annual">("term"),[batchClassId,setBatchClassId]=useState("");
  const [selectionRestored,setSelectionRestored]=useState(false);
  const storageKey=user?.id?`menwe:report-card-workspace:${user.id}`:"";
  const [classRow,setClassRow]=useState<Row|null>(null),[rank,setRank]=useState<number|null>(null),[allSubjects,setAllSubjects]=useState<Row[]>([]),[results,setResults]=useState<Row[]>([]),[attendance,setAttendance]=useState<Row[]>([]),[report,setReport]=useState<Row|null>(null),[teacherRemark,setTeacherRemark]=useState(""),[headRemark,setHeadRemark]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState("");

  useEffect(()=>{void(async()=>{if(!user)return;try{const db=getSupabase();const[s,y,t]=await Promise.all([
    db.from("students").select("id,admission_number,first_name,middle_name,last_name,status").eq("status","ACTIVE").order("first_name").order("last_name"),
    db.from("academic_years").select("id,name,starts_on,ends_on,is_current,status").eq("status","ACTIVE").order("starts_on",{ascending:false}),
    db.from("terms").select("id,academic_year_id,name,starts_on,ends_on,is_current,status").eq("status","ACTIVE").order("starts_on",{ascending:false})
  ]);for(const q of[s,y,t])if(q.error)throw q.error;
const currentYearId=String(y.data?.find((x:any)=>x.is_current)?.id??y.data?.[0]?.id??"");
const [enr,cls]=await Promise.all([
  db.from("enrollments").select("student_id,class_id").eq("academic_year_id",currentYearId).eq("status","ACTIVE"),
  db.from("classes").select("id,academic_year_id,name,code,level,status").eq("academic_year_id",currentYearId).eq("status","ACTIVE")
]);
const classById=new Map<string,Row>((cls.data??[]).map((c:any)=>[String(c.id),c]));
const classByStudent=new Map<string,Row>((enr.data??[]).reduce<Array<[string,Row]>>((acc,e:any)=>{const cls=classById.get(String(e.class_id));if(cls)acc.push([String(e.student_id),cls]);return acc;},[]));
const orderedStudents=[...(s.data??[])].map((st:any)=>({...st,_classId:String(classByStudent.get(String(st.id))?.id??""),_className:classByStudent.get(String(st.id))?.name??classByStudent.get(String(st.id))?.code??"",_classGrade:gradeFromClass(classByStudent.get(String(st.id)))})).sort((a:any,b:any)=>(a._classGrade??999)-(b._classGrade??999)||String(a._className??"").localeCompare(String(b._className??""),undefined,{numeric:true,sensitivity:"base"})||learnerName(a).localeCompare(learnerName(b),undefined,{sensitivity:"base"})||String(a.admission_number??"").localeCompare(String(b.admission_number??""),undefined,{numeric:true,sensitivity:"base"}));
setStudents(orderedStudents);setYears(y.data??[]);setTerms(t.data??[]);setClasses(cls.data??[]);setYearId(currentYearId);}catch(e){setMessage(e instanceof Error?e.message:"Report-card workspace could not be loaded.");}finally{setLoading(false);}})();},[user]);
  useEffect(()=>{
    if(loading||!storageKey)return;
    try{
      const raw=localStorage.getItem(storageKey);
      if(raw){const saved=JSON.parse(raw) as {studentId?:string;yearId?:string;termId?:string;mode?:"term"|"annual";batchClassId?:string};
        if(saved.studentId)setStudentId(saved.studentId);
        if(saved.yearId)setYearId(saved.yearId);
        if(saved.termId)setTermId(saved.termId);
        if(saved.mode)setMode(saved.mode);
        if(saved.batchClassId)setBatchClassId(saved.batchClassId);
      }
    }catch{/* Ignore invalid browser state. */}
    setSelectionRestored(true);
  },[loading,storageKey]);

  useEffect(()=>{
    if(!storageKey||!selectionRestored)return;
    try{localStorage.setItem(storageKey,JSON.stringify({studentId,yearId,termId,mode,batchClassId}));}catch{/* Ignore storage failures. */}
  },[storageKey,selectionRestored,studentId,yearId,termId,mode,batchClassId]);

  const visibleTerms=useMemo(()=>terms.filter(t=>!yearId||String(t.academic_year_id)===yearId),[terms,yearId]);
  const visibleStudents=useMemo(()=>students.filter(s=>!batchClassId||String(s._classId??"")===batchClassId),[students,batchClassId]);
  const selected=students.find(s=>String(s.id)===studentId); const selectedYear=years.find(y=>String(y.id)===yearId); const selectedTerm=terms.find(t=>String(t.id)===termId); const band=bandFromClass(classRow??undefined); const includeUpperCRE=band==="UPPER_PRIMARY" && [4,5].includes(gradeFromClass(classRow??undefined) ?? 0); const reportSubjects=useMemo(()=>reportAreasForBand(allSubjects,band,includeUpperCRE,String(classRow?.name ?? classRow?.code ?? "")),[allSubjects,band,includeUpperCRE,classRow?.name,classRow?.code]);
  const assessments=useMemo(()=>assessmentSummary(results,band==="ECDE"),[results,band]);
  const lines=useMemo(()=>reportSubjects.map(s=>mode==="annual"?annualLineFor(s,results,band==="ECDE"):lineFor(s,results,band==="ECDE")),[reportSubjects,results,band,mode]);
  const totalMarks=useMemo(()=>lines.reduce((n,l)=>n+(l.score??0),0),[lines]); const totalMax=useMemo(()=>lines.reduce((n,l)=>n+(l.max??0),0),[lines]); const reportComplete=lines.length>0&&lines.every(l=>l.percentage!=null); const incompleteAreas=lines.filter(l=>l.percentage==null).map(l=>l.name); const average=reportComplete&&totalMax?totalMarks/totalMax*100:null; const totalPoints=lines.reduce((n,l)=>n+(l.level??0),0);
  const fullName=selected?learnerName(selected):""; const rankLabel=band==="ECDE"?"Overall Achievement":band==="JUNIOR_SCHOOL"?"Rank • Total Points":"Rank • Total Marks";
  const reset=()=>{setClassRow(null);setRank(null);setAllSubjects([]);setResults([]);setAttendance([]);setReport(null);setTeacherRemark("");setHeadRemark("");setMessage("");};

  const generate=async()=>{
    if(!studentId||!yearId||(mode==="term"&&!termId)){setMessage(mode==="term"?"Select learner, academic year and term first.":"Select learner and academic year first.");return;}
    setBusy(true);reset();
    try{const db=getSupabase();
      const en=await db.from("enrollments").select("class_id").eq("student_id",studentId).eq("academic_year_id",yearId).eq("status","ACTIVE").order("created_at",{ascending:false}).limit(1).maybeSingle();if(en.error)throw en.error;if(!en.data?.class_id)throw new Error("This learner is not enrolled in an active class for the selected academic year.");
      const classId=String(en.data.class_id); const [cls,sub,a]=await Promise.all([
        db.from("classes").select("id,academic_year_id,code,name,level,status").eq("id",classId).maybeSingle(),
        db.from("class_subjects").select("subject_id,subjects(id,name,code,status)").eq("class_id",classId),
        db.from("attendance_records").select("id,status,attendance_sessions!inner(class_id,session_date)").eq("student_id",studentId)
      ]);for(const q of[cls,sub,a])if(q.error)throw q.error;setClassRow(cls.data??null);setAllSubjects((sub.data??[]).map((x:any)=>x.subjects).filter(Boolean));setAttendance(a.data??[]);
      const ids=(sub.data??[]).map((x:any)=>String(x.subject_id)); const termIds=terms.filter(t=>String(t.academic_year_id)===yearId).map(t=>String(t.id));
      const q=mode==="term"?await db.from("exam_results").select("id,exam_id,student_id,subject_id,score,maximum_score,grade,teacher_comment,exams!inner(id,term_id,class_id,name,exam_type,starts_on,ends_on,status),subjects(id,name,code)").eq("student_id",studentId).eq("exams.term_id",termId).eq("exams.class_id",classId).in("exams.status",canUseEnteredResults?["DRAFT","PUBLISHED"]:["PUBLISHED"]).in("subject_id",ids):termIds.length?await db.from("exam_results").select("id,exam_id,student_id,subject_id,score,maximum_score,grade,teacher_comment,exams!inner(id,term_id,class_id,name,exam_type,starts_on,ends_on,status),subjects(id,name,code)").eq("student_id",studentId).in("exams.term_id",termIds).eq("exams.class_id",classId).in("exams.status",canUseEnteredResults?["DRAFT","PUBLISHED"]:["PUBLISHED"]).in("subject_id",ids):{data:[],error:null} as any;
      if(q.error)throw q.error;
      const normalizedResults = mode === "term" ? (bandFromClass(cls.data ?? undefined) === "ECDE" ? (q.data ?? []) : canonicalTermResults(q.data ?? [])) : (q.data ?? []);
      setResults(normalizedResults);
      const classSubjects=(sub.data??[]).map((x:any)=>x.subjects).filter(Boolean); const reportAreas=reportAreasForBand(classSubjects,bandFromClass(cls.data??undefined),bandFromClass(cls.data??undefined)==="UPPER_PRIMARY" && [4,5].includes(gradeFromClass(cls.data??undefined) ?? 0),String(cls.data?.name ?? cls.data?.code ?? ""));
      const enroll=await db.from("enrollments").select("student_id").eq("class_id",classId).eq("academic_year_id",yearId).eq("status","ACTIVE");
      if(!enroll.error&&(enroll.data??[]).length){const idsStudents:string[]=Array.from(new Set<string>((enroll.data??[]).map((x:any)=>String(x.student_id))));const rankQ=mode==="term"?await db.from("exam_results").select("student_id,subject_id,score,maximum_score,exams!inner(term_id,class_id,name,exam_type,status,ends_on,starts_on)").in("student_id",idsStudents).eq("exams.term_id",termId).eq("exams.class_id",classId).in("exams.status",canUseEnteredResults?["DRAFT","PUBLISHED"]:["PUBLISHED"]).in("subject_id",(sub.data??[]).map((x:any)=>String(x.subject_id))):termIds.length?await db.from("exam_results").select("student_id,subject_id,score,maximum_score,exams!inner(term_id,class_id,name,exam_type,status,ends_on,starts_on)").in("student_id",idsStudents).in("exams.term_id",termIds).eq("exams.class_id",classId).in("exams.status",canUseEnteredResults?["DRAFT","PUBLISHED"]:["PUBLISHED"]).in("subject_id",(sub.data??[]).map((x:any)=>String(x.subject_id))):{data:[],error:null} as any;if(!rankQ.error){const grouped=new Map<string,Row[]>();for(const r of rankQ.data??[]){const k=String(r.student_id);grouped.set(k,[...(grouped.get(k)??[]),r]);}const standings=idsStudents.map(id=>{const ls=reportAreas.map(a=>lineFor(a,grouped.get(id)??[]));const marks=ls.reduce((n,l)=>n+(l.score??0),0);const points=ls.reduce((n,l)=>n+(l.level??0),0);return {id,marks,points};}).sort((a,b)=>bandFromClass(cls.data??undefined)==="JUNIOR_SCHOOL"?b.points-a.points||b.marks-a.marks:b.marks-a.marks||b.points-a.points);const pos=standings.findIndex(x=>x.id===studentId);setRank(pos>=0?pos+1:null);}}
      if(mode==="term"){const rc=await db.from("report_cards").select("id,attendance_percentage,average_score,teacher_remark,headteacher_remark,generated_at").eq("student_id",studentId).eq("term_id",termId).maybeSingle();if(rc.error)throw rc.error;if(rc.data){setReport(rc.data);setTeacherRemark(rc.data.teacher_remark??"");setHeadRemark(rc.data.headteacher_remark??"");}}
      if(!(q.data??[]).length)setMessage("No recorded results were found for this learner in the selected period.");
    }catch(e){setMessage(e instanceof Error?e.message:"Report card could not be generated.");}finally{setBusy(false);}
  };

  useEffect(()=>{
    if(!selectionRestored||loading||!studentId||!yearId||(mode==="term"&&!termId)||classRow)return;
    if(students.some(s=>String(s.id)===studentId))void generate();
  },[selectionRestored,loading,studentId,yearId,termId,mode,students,classRow]);

  const save=async()=>{
    if(!admin||mode!=="term"||!studentId||!termId||!classRow)return;
    setSaving(true);setMessage("");
    try{
      const db=getSupabase();
      const itemRows=lines.filter(l=>l.score!=null||l.max!=null).map(l=>({
        subject_id:String(l.id),score:l.score,maximum_score:l.max,grade:l.levelCode==="—"?null:l.levelCode
      }));
      const result=await persistReportCardWithItems(db,{
        studentId,termId,classId:String(classRow.id),
        attendancePercentage:attendancePercent(attendance),averageScore:average,
        teacherRemark:teacherRemark.trim()||null,headteacherRemark:headRemark.trim()||null,
        generatedBy:user?.id??null,items:itemRows
      });
      if(result.itemCount!==itemRows.length) throw new Error(`Report-card item verification failed: expected ${itemRows.length}, saved ${result.itemCount}.`);
      const q=await db.from("report_cards").select("id,attendance_percentage,average_score,teacher_remark,headteacher_remark,generated_at").eq("id",result.reportCardId).single();
      if(q.error)throw q.error;
      setReport(q.data);setMessage(`Report card saved successfully with ${result.itemCount} learning-area items.`);
    }catch(e){setMessage(e instanceof Error?e.message:"Report card could not be saved.");}finally{setSaving(false);}
  };

  const safePart=(v:unknown)=>String(v??"").trim().replace(/\\s+/g,"_").replace(/[^a-zA-Z0-9_-]/g,"")||"Unknown";
  const reportFilename=(student:Row,className:unknown,termName:unknown)=>`${safePart(className)}_${safePart(termName)}_${safePart(learnerName(student))}_Report_Card.pdf`;
  let pdfLogoDataUrl: string | null = null;
  const getPdfLogoDataUrl = async () => {
    if (pdfLogoDataUrl) return pdfLogoDataUrl;
    try {
      const response = await fetch("/menwe-logo.svg", { cache: "force-cache" });
      const svg = await response.text();
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Logo image could not be loaded."));
          img.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = 320; canvas.height = 320;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas is unavailable.");
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 12, 12, 296, 296);
        pdfLogoDataUrl = canvas.toDataURL("image/png");
        return pdfLogoDataUrl;
      } finally { URL.revokeObjectURL(url); }
    } catch { return null; }
  };
  const drawPdfPage=async(doc:any,student:Row,cls:Row,subjectRows:Row[],studentResults:Row[],studentAttendance:Row[],studentRank:number|null,teacher:string,head:string)=>{
    // PDF is laid out independently from the browser preview so downloaded files
    // contain the same information without clipped, crowded or overlapping text.
    const b=bandFromClass(cls), areas=reportAreasForBand(subjectRows,b,b==="UPPER_PRIMARY" && [4,5].includes(gradeFromClass(cls) ?? 0),String(cls.name ?? cls.code ?? "")), ls=areas.map(x=>lineFor(x,studentResults,b==="ECDE"));
    const tm=ls.reduce((n,l)=>n+(l.score??0),0), mx=ls.reduce((n,l)=>n+(l.max??0),0), reportComplete=ls.length>0&&ls.every(l=>l.percentage!=null), avg=reportComplete&&mx?tm/mx*100:null, pts=ls.reduce((n,l)=>n+(l.level??0),0), att=attendancePercent(studentAttendance);
    const W=210, M=10, CW=W-M*2, bottom=287;
    let y=10;
    const logoDataUrl=await getPdfLogoDataUrl();
    const addText=(text:string,x:number,y0:number,width:number,size:number,opts:any={})=>{
      doc.setFontSize(size); const lines=doc.splitTextToSize(String(text??"—"),width); doc.text(lines,x,y0,opts); return lines.length;
    };
    const sectionTitle=(num:string,title:string,sub?:string)=>{
      if(y>bottom-18){doc.addPage();y=12;}
      doc.setFillColor(6,18,41);doc.roundedRect(M,y,CW,9,1.5,1.5,"F");
      doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.text(num,M+4,y+5.9);
      doc.setFontSize(9);doc.text(title,M+15,y+5.9);
      y+=12;
      if(sub){doc.setTextColor(95,110,125);doc.setFont("helvetica","normal");doc.setFontSize(7.2);const n=addText(sub,M,y,CW,7.2);y+=n*3.5+3;}
    };

    doc.setFillColor(6,18,41);doc.roundedRect(M,y,CW,29,2,2,"F");
    if(logoDataUrl)doc.addImage(logoDataUrl,"PNG",M+4,y+4,20,20,undefined,"FAST");
    doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(14);
    doc.text("MENWE PRIMARY & JUNIOR SCHOOL",W/2+7,y+9,{align:"center"});
    doc.setFont("helvetica","normal");doc.setFontSize(8);doc.text("Igoki, Abogeta  •  Term Academic Report",W/2+7,y+14,{align:"center"});
    doc.setFillColor(216,155,40);doc.rect(M,y+24,CW,5,"F");
    doc.setTextColor(6,18,41);doc.setFont("helvetica","bold");doc.setFontSize(9);
    doc.text((mode==="term"?"TERM REPORT CARD":"ANNUAL REPORT CARD")+" — "+bandTitle(b).toUpperCase(),W/2,y+27.4,{align:"center"});
    y+=34;

    const includedAssessments=assessmentSummary(studentResults,b==="ECDE").slice(0,2);
    doc.setDrawColor(190,200,215);doc.setFillColor(247,250,252);doc.roundedRect(M,y,CW,35,2,2,"FD");
    const meta=[
      ["LEARNER",learnerName(student)],["ADMISSION NO.",student.admission_number??"—"],
      ["CLASS",cls.name??cls.code??"—"],["TERM",mode==="term"?(selectedTerm?.name??"—"):"Annual"],
      ["YEAR",selectedYear?.name??"—"],["ATTENDANCE",att==null?"—":att.toFixed(1)+"%"]
    ];
    meta.forEach((m,i)=>{
      const col=i%2,row=Math.floor(i/2),x=M+5+col*92,yy=y+7+row*8.2;
      doc.setTextColor(90,105,120);doc.setFont("helvetica","bold");doc.setFontSize(6.8);doc.text(m[0],x,yy);
      doc.setTextColor(16,42,67);doc.setFont("helvetica","bold");doc.setFontSize(8.5);
      addText(String(m[1]),x+29,yy,58,8.5);
    });
    doc.setTextColor(90,105,120);doc.setFont("helvetica","bold");doc.setFontSize(6.8);doc.text("ASSESSMENTS",M+5,y+32);
    doc.setTextColor(16,42,67);doc.setFont("helvetica","normal");doc.setFontSize(7.5);
    addText(includedAssessments.length?includedAssessments.map((a,i)=>`${i+1}. ${b==="ECDE"?"End-Term":assessmentLabel(a,cls)}`).join("   •   "):"No assessment recorded",M+30,y+32,CW-35,7.5);
    y+=41;

    sectionTitle("01","Learning Area Performance","Learning areas shown are the learner's recorded class subjects. Scores combine the recorded assessments, with Grades 1–6 using Opener and End-Term as distinct assessment slots.");
    const cols=b==="ECDE"?[M,M+65,M+90,M+108,M+128]:[M,M+43,M+68,M+93,M+118,M+135,M+152];
    const widths=b==="ECDE"?[65,25,18,20,62]:[43,25,25,25,17,17,38];
    const tableHeaders=b==="ECDE"?["LEARNING AREA","END-TERM","%","LEVEL","TEACHER INTERPRETATION"]:["LEARNING AREA",assessmentColumnLabel(cls).toUpperCase(),"END-TERM","COMBINED","%","LEVEL","TEACHER INTERPRETATION"];
    const drawTableHeader=()=>{doc.setFillColor(6,18,41);doc.rect(M,y,CW,8,"F");doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(b==="ECDE"?7.2:6.7);tableHeaders.forEach((h,i)=>doc.text(h,cols[i]+2,y+5.3));y+=8;};
    drawTableHeader();
    ls.forEach((l,i)=>{
      const remark=String(l.remark??"—"), remarkLines=doc.splitTextToSize(remark,widths[widths.length-1]-6);
      const nameLines=doc.splitTextToSize(String(l.name),widths[0]-6);
      const rowH=Math.max(9,Math.max(nameLines.length,remarkLines.length)*4+4);
      if(y+rowH>bottom-40){doc.addPage();y=12;sectionTitle("01","Learning Area Performance (continued)");drawTableHeader();}
      if(i%2===1){doc.setFillColor(247,250,252);doc.rect(M,y,CW,rowH,"F");}
      doc.setDrawColor(205,214,224);doc.rect(M,y,CW,rowH);
      doc.setTextColor(16,42,67);doc.setFont("helvetica","bold");doc.setFontSize(8);doc.text(nameLines,cols[0]+3,y+5);
      doc.setFont("helvetica","normal");doc.setFontSize(7.2);
      if(b==="ECDE"){
        doc.text(l.endTermScore==null?"Not recorded":`${fmt(l.endTermScore)} / ${fmt(l.endTermMax)}`,cols[1]+2,y+5);
        doc.text(l.percentage==null?"—":l.percentage.toFixed(1)+"%",cols[2]+2,y+5);
        doc.setFont("helvetica","bold");doc.text(l.levelCode+(l.level!=null?" • "+l.level:""),cols[3]+2,y+5);
        doc.setFont("helvetica","normal");doc.text(remarkLines,cols[4]+2,y+5);
      }else{
        doc.text(l.exam1Score==null?"Not taken":`${fmt(l.exam1Score)} / ${fmt(l.exam1Max)}`,cols[1]+2,y+5);
        doc.text(l.endTermScore==null?"Not taken":`${fmt(l.endTermScore)} / ${fmt(l.endTermMax)}`,cols[2]+2,y+5);
        doc.text(l.score==null?"—":`${fmt(l.score)} / ${fmt(l.max)}`,cols[3]+2,y+5);
        doc.text(l.percentage==null?"—":l.percentage.toFixed(1)+"%",cols[4]+2,y+5);
        doc.setFont("helvetica","bold");doc.text(l.levelCode+(l.level!=null?" • "+l.level:""),cols[5]+2,y+5);
        doc.setFont("helvetica","normal");doc.text(remarkLines,cols[6]+2,y+5);
      }
      y+=rowH;
    });
    if(!reportComplete){
      const warning="INCOMPLETE REPORT — Required marks are missing for: "+ls.filter(l=>l.percentage==null).map(l=>l.name).join(", ")+". Overall average is withheld; complete and verify marks before issuing this report.";
      const warningLines=doc.splitTextToSize(warning,CW-10), warningH=Math.max(12,warningLines.length*3.5+6);
      if(y+warningH>bottom-25){doc.addPage();y=12;}
      doc.setFillColor(255,244,214);doc.setDrawColor(216,155,40);doc.roundedRect(M,y,CW,warningH,1.5,1.5,"FD");doc.setTextColor(115,72,0);doc.setFont("helvetica","bold");doc.setFontSize(7.2);doc.text(warningLines,M+5,y+5);y+=warningH+3;
    }
    const totalH=14;
    if(y+totalH>bottom-35){doc.addPage();y=12;}
    doc.setFillColor(238,243,248);doc.rect(M,y,CW,totalH,"F");doc.setDrawColor(216,155,40);doc.line(M,y,M+CW,y);
    const overallAchievement=avg==null?null:achievement(avg,b==="ECDE");
    const overallBand=b==="ECDE"
      ? (overallAchievement?.code==="EE"?"Exceeding Expectations":overallAchievement?.code==="ME"?"Meeting Expectations":overallAchievement?.code==="AE"?"Approaching Expectations":overallAchievement?.code==="BE"?"Below Expectations":"—")
      : (overallAchievement?.level!=null?(overallAchievement.level>=7?"Above Average":overallAchievement.level>=5?"Average":"Below Average"):"—");
    const metrics=[["TOTAL MARKS",`${fmt(tm)} / ${fmt(mx||null)}`],[b==="ECDE"?"AVERAGE ACHIEVEMENT":"MEAN AVERAGE",b==="ECDE"?(ls.length?`${(pts/ls.length).toFixed(1)} / 4`:"—"):(avg==null?"—":avg.toFixed(1)+"%")],["OVERALL LEVEL",overallAchievement?(b==="ECDE"?`${overallAchievement.code} • ${overallBand}`:`${overallAchievement.code} / Level ${overallAchievement.level} • ${overallBand}`):"—"],["CLASS RANK",b==="ECDE"?"Not ranked":studentRank==null?"—":String(studentRank)],["TOTAL POINTS",b==="JUNIOR_SCHOOL"?String(pts):"—"]];
    metrics.forEach((m,i)=>{const x=M+3+i*(CW/metrics.length);const cellW=CW/metrics.length-5;doc.setTextColor(90,105,120);doc.setFont("helvetica","bold");doc.setFontSize(6.2);addText(m[0],x,y+5,cellW,6.2);doc.setTextColor(6,18,41);doc.setFontSize(i===2?7.2:9);addText(m[1],x,y+11,cellW,i===2?7.2:9);});y+=20;

    sectionTitle("02","Comments & Guidance","For the learner and parent/guardian.");
    const boxes=[["CLASS TEACHER REMARK",teacher||"No teacher remark entered."],["HEADTEACHER REMARK",head||"No headteacher remark entered."]];
    boxes.forEach((m,i)=>{
      const x=M+i*95,w=90;doc.setDrawColor(190,200,215);const lines=doc.splitTextToSize(String(m[1]),w-8);const h=Math.max(30,Math.min(45,14+lines.length*4));
      if(y+h>bottom-12){doc.addPage();y=12;}
      doc.roundedRect(x,y,w,h,2,2,"S");doc.setTextColor(7,27,58);doc.setFont("helvetica","bold");doc.setFontSize(7.2);doc.text(m[0],x+4,y+6);
      doc.setTextColor(55,70,85);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.text(lines.slice(0,6),x+4,y+12);
      doc.setDrawColor(70,85,100);doc.line(x+4,y+h-7,x+55,y+h-7);doc.setFontSize(6.2);doc.text("Signature / Date",x+4,y+h-3);
    });
    y+=48;
    if(y>bottom-18){doc.addPage();y=12;}
    doc.setDrawColor(6,18,41);doc.line(M,y,M+CW,y);y+=6;doc.setTextColor(6,18,41);doc.setFont("helvetica","bold");doc.setFontSize(8);doc.text("MENWE PRIMARY & JUNIOR SCHOOL",W/2,y,{align:"center"});y+=4;
    doc.setTextColor(105,115,125);doc.setFont("helvetica","normal");doc.setFontSize(7);addText("This report reflects recorded assessment results for the selected academic period.",W/2,y,CW,7,{align:"center"});
  };
  const print=()=>window.print();

  const downloadPdf=async()=>{
    if(!selected||!classRow)return;
    setBusy(true);setMessage("");
    try{
      // Use the same explicit PDF layout as class-batch reports. This avoids
      // browser HTML-to-canvas scaling that can clip columns or hide level badges.
      const doc=new jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
      await drawPdfPage(doc,selected,classRow,allSubjects,results,attendance,rank,teacherRemark,headRemark);
      doc.save(reportFilename(selected,classRow.name,mode==="term"?selectedTerm?.name:"Annual"));
      setMessage("PDF downloaded with the full learning-area table, achievement levels and overall performance interpretation.");
    }catch(e){
      setMessage(e instanceof Error?e.message:"PDF generation failed. Please use Print → Save as PDF.");
    }finally{
      setBusy(false);
    }
  };
  const batchPdf=async()=>{
    if(!batchClassId||!yearId||mode!=="term"||!termId){
      setMessage("Select a grade/class, academic year and term before creating the class batch.");
      return;
    }
    setBusy(true);setMessage("");
    try{
      const db=getSupabase();
      const selectedBatchClass=classes.find(c=>String(c.id)===batchClassId);
      if(!selectedBatchClass)throw new Error("The selected grade/class could not be found for this academic year.");
      const classId=String(selectedBatchClass.id);
      const classSubjectsQuery=await db.from("class_subjects").select("subject_id,subjects(id,name,code,status)").eq("class_id",classId);
      if(classSubjectsQuery.error)throw classSubjectsQuery.error;
      const batchSubjects=(classSubjectsQuery.data??[]).map((x:any)=>x.subjects).filter(Boolean);
      if(!batchSubjects.length)throw new Error(`No subjects are configured for ${selectedBatchClass.name??selectedBatchClass.code??"the selected class"}.`);
      const enr=await db.from("enrollments").select("student_id").eq("class_id",classId).eq("academic_year_id",yearId).eq("status","ACTIVE");
      if(enr.error)throw enr.error;
      const ids=Array.from(new Set((enr.data??[]).map((r:any)=>String(r.student_id))));
      if(!ids.length)throw new Error("No active learners were found in this class.");

      const [sr,ar,rc,attAll]=await Promise.all([
        db.from("students").select("id,admission_number,first_name,middle_name,last_name").in("id",ids),
        db.from("exam_results").select("student_id,subject_id,score,maximum_score,exam_id,grade,exams!inner(term_id,class_id,name,exam_type,status,ends_on,starts_on)").in("student_id",ids).eq("exams.class_id",classId).eq("exams.term_id",termId).in("exams.status",canUseEnteredResults?["DRAFT","PUBLISHED"]:["PUBLISHED"]).in("subject_id",batchSubjects.map(s=>String(s.id))),
        db.from("report_cards").select("student_id,teacher_remark,headteacher_remark").in("student_id",ids).eq("term_id",termId),
        db.from("attendance_records").select("student_id,status,attendance_sessions!inner(class_id,session_date)").in("student_id",ids)
      ]);
      for(const q of[sr,ar,rc,attAll])if(q.error)throw q.error;

      const groups=new Map<string,Row[]>();
      for(const r of ar.data??[]){const k=String(r.student_id);groups.set(k,[...(groups.get(k)??[]),r]);}
      const attendanceGroups=new Map<string,Row[]>();
      for(const r of attAll.data??[]){const k=String(r.student_id);attendanceGroups.set(k,[...(attendanceGroups.get(k)??[]),r]);}

      const subjects=batchSubjects;
      const reportAreas=reportAreasForBand(subjects,bandFromClass(selectedBatchClass),bandFromClass(selectedBatchClass)==="UPPER_PRIMARY" && [4,5].includes(gradeFromClass(selectedBatchClass) ?? 0),String(selectedBatchClass?.name ?? selectedBatchClass?.code ?? ""));
      const standings=ids.map(id=>{
        const ls=reportAreas.map(x=>lineFor(x,groups.get(id)??[],bandFromClass(selectedBatchClass)==="ECDE"));
        return{id,marks:ls.reduce((n,l)=>n+(l.score??0),0),points:ls.reduce((n,l)=>n+(l.level??0),0)};
      }).sort((a,b)=>bandFromClass(selectedBatchClass)==="JUNIOR_SCHOOL"?b.points-a.points||b.marks-a.marks:b.marks-a.marks||b.points-a.points);

      const existingRemarks=new Map<string,Row>((rc.data??[]).map((r:any)=>[String(r.student_id),r]));
      const prepared=(sr.data??[]).map((st:any)=>{
        const id=String(st.id),studentResults=groups.get(id)??[],linesForStudent=reportAreas.map(x=>lineFor(x,studentResults,bandFromClass(selectedBatchClass)==="ECDE"));
        const totalMarks=linesForStudent.reduce((n,l)=>n+(l.score??0),0);
        const totalMax=linesForStudent.reduce((n,l)=>n+(l.max??0),0);
        const average=totalMax>0?totalMarks/totalMax*100:null;
        const attRows=attendanceGroups.get(id)??[],remarks=existingRemarks.get(id);
        const itemRows=linesForStudent.filter(l=>l.score!=null||l.max!=null).map(l=>({
          subject_id:String(l.id),score:l.score,maximum_score:l.max,grade:l.levelCode==="—"?null:l.levelCode
        }));
        return{st,id,linesForStudent,average,attRows,remarks,itemRows};
      });

      const incompleteLearners=prepared.filter(p=>p.linesForStudent.some(l=>l.percentage==null));
      if(incompleteLearners.length){
        const examples=incompleteLearners.slice(0,5).map(p=>`${learnerName(p.st)} (${p.linesForStudent.filter(l=>l.percentage==null).map(l=>l.name).join(", ")})`).join("; ");
        throw new Error(`Batch report stopped: ${incompleteLearners.length} learner(s) have missing/incomplete assessment results. No batch reports were saved or generated. Examples: ${examples}. Complete the missing marks, then try again.`);
      }

      const persisted=[];
      for(const p of prepared){
        const result=await persistReportCardWithItems(db,{
          studentId:p.id,termId,classId,
          attendancePercentage:attendancePercent(p.attRows),averageScore:p.average,
          teacherRemark:p.remarks?.teacher_remark??null,headteacherRemark:p.remarks?.headteacher_remark??null,
          generatedBy:user?.id??null,items:p.itemRows
        });
        if(result.itemCount!==p.itemRows.length){
          throw new Error(`Report-card item verification failed for ${learnerName(p.st)}: expected ${p.itemRows.length}, saved ${result.itemCount}.`);
        }
        persisted.push({...p,reportCardId:result.reportCardId});
      }

      const doc=new jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
      for (const [i,p] of persisted.sort((a,b)=>learnerName(a.st).localeCompare(learnerName(b.st))).entries()) {
        if(i)doc.addPage();
        const pos=standings.findIndex(x=>x.id===p.id);
        await drawPdfPage(doc,p.st,selectedBatchClass,subjects,groups.get(p.id)??[],p.attRows,pos>=0?pos+1:null,p.remarks?.teacher_remark??"",p.remarks?.headteacher_remark??"");
      }
      doc.save(`${safePart(selectedBatchClass.name??selectedBatchClass.code)}_${safePart(selectedTerm?.name)}_Report_Cards.pdf`);
      setMessage(`Batch PDF created for ${persisted.length} learners. Supabase persistence verified before PDF generation.`);
    }catch(e){setMessage(e instanceof Error?e.message:"Batch report generation failed. No PDF was generated.");}
    finally{setBusy(false);}
  };

  const title=bandTitle(band);
  return <PortalLayout><div className="mx-auto max-w-7xl space-y-5 px-3 py-4 sm:px-6 lg:px-8">
    <div className="no-print rounded-2xl border border-[#D7E5DC] bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#D7A52A]">Menwe Academic Records</p><h1 className="mt-1 text-2xl font-black tracking-tight text-[#064A30]">Report Cards</h1><p className="mt-1 max-w-2xl text-sm text-[#587064]">Select a grade/class to produce every learner report at once, or select one learner for an individual report.</p></div><div className="flex flex-wrap gap-2"><button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#064A30] px-4 text-sm font-black text-white" onClick={generate} disabled={busy||loading}>{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}Generate</button>{report||lines.some(l=>l.percentage!=null)?<><button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7E5DC] bg-white px-4 text-sm font-black text-[#064A30]" onClick={print}><Printer className="h-4 w-4"/>Print</button><button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7E5DC] bg-white px-4 text-sm font-black text-[#064A30]" onClick={downloadPdf}><FileDown className="h-4 w-4"/>PDF</button>{admin?<button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D89B28] px-4 text-sm font-black text-[#061229]" onClick={batchPdf} disabled={busy}><FileDown className="h-4 w-4"/>Produce Grade Reports</button>:null}</>:null}</div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-6"><select className={input} value={batchClassId} onChange={e=>{const nextClassId=e.target.value;setBatchClassId(nextClassId);setStudentId(current=>students.some(s=>String(s.id)===current&&(!nextClassId||String(s._classId??"")===nextClassId))?current:"");reset();}}><option value="">Grade / Class — all learners</option>{[...classes].sort((a,b)=>(gradeFromClass(a)??99)-(gradeFromClass(b)??99)||String(a.name??a.code??"").localeCompare(String(b.name??b.code??""),undefined,{numeric:true})).map(c=><option key={c.id} value={c.id}>{c.name??c.code??"Class"}{gradeFromClass(c)?` • Grade ${gradeFromClass(c)}`:""}</option>)}</select><select className={input} value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="">{batchClassId?"Select learner in this class":"Select learner"}</option>{visibleStudents.map(s=><option key={s.id} value={s.id}>{s._className?`${s._className} • `:""}{learnerName(s)} • {s.admission_number??"—"}</option>)}</select><select className={input} value={yearId} onChange={e=>{setYearId(e.target.value);setTermId("")}}><option value="">Academic year</option>{years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select><select className={input} value={termId} onChange={e=>setTermId(e.target.value)} disabled={mode==="annual"}><option value="">Term</option>{visibleTerms.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><select className={input} value={mode} onChange={e=>setMode(e.target.value as any)}><option value="term">Term report</option><option value="annual">Annual report</option></select><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#D7E5DC] bg-[#F1F7F3] px-4 text-sm font-black text-[#064A30]" onClick={generate} disabled={busy}><RefreshCw className="h-4 w-4"/>Refresh</button></div>{message?<div className="mt-3 rounded-xl border border-[#E7D5A0] bg-[#FFF9EE] px-3 py-2 text-sm font-semibold text-[#6B5319]">{message}</div>:null}</div>

    {(selected&&classRow&&lines.length)?<div className="report-card-print overflow-hidden rounded-2xl border border-[#D7E5DC] bg-white shadow-sm">
      <div className="report-hero"><div className="report-logo-slot" aria-label="Menwe Primary & Junior School official crest"><img src="/menwe-logo.svg" alt="Menwe Primary & Junior School official crest" /></div><div><div className="report-eyebrow">MENWE PRIMARY & JUNIOR SCHOOL</div><div className="report-contact">Igoki, Abogeta • School Contact: __________________</div><h2>{title}</h2><p>{mode==="term"?`${selectedTerm?.name??"Term"} • ${selectedYear?.name??"Academic Year"}`:`Annual Performance • ${selectedYear?.name??"Academic Year"}`}</p></div><div className="report-badge"><span>{band==="JUNIOR_SCHOOL"?"POINTS":band==="ECDE"?"LEVEL":"AVERAGE"}</span><strong>{band==="JUNIOR_SCHOOL"?totalPoints:band==="ECDE"?(lines.length?`${(totalPoints/lines.length).toFixed(1)} / 4`:"—"):(average==null?"—":`${average.toFixed(0)}%`)}</strong></div></div>
      <div className="report-identity"><div><span>Learner</span><strong>{fullName}</strong></div><div><span>Admission No.</span><strong>{selected.admission_number??"—"}</strong></div><div><span>Class</span><strong>{classRow.name??classRow.code??"—"}</strong></div><div><span>Year</span><strong>{selectedYear?.name??"—"}</strong></div><div><span>Attendance</span><strong>{attendancePercent(attendance)==null?"—":`${attendancePercent(attendance)!.toFixed(1)}%`}</strong></div></div>
      {!reportComplete?<div className="mx-3 mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900" role="alert">INCOMPLETE REPORT — Missing or incomplete results for: {incompleteAreas.join(", ")||"required learning areas"}. The overall average is withheld. Enter and verify the missing marks before printing or issuing this report.</div>:null}
      <div className="report-body"><section className="report-section"><div className="report-section-head"><span>01</span><div><h3>Assessments Included</h3><p>{band === "ECDE" ? "This ECDE report card uses End-Term results only. Achievement is reported using EE, ME, AE and BE rather than conventional examination grades." : (gradeFromClass(classRow) ?? 99) >= 1 && (gradeFromClass(classRow) ?? 99) <= 6 ? "This primary-school term report contains exactly two assessment slots: Opener and End-Term. Opener and End-Term scores are shown separately; Combined is their average percentage on a 0–100 scale." : "This term report contains exactly two official assessment slots: Exam 1 and End-Term. Both assessment scores are shown separately; Combined is their average percentage on a 0–100 scale."}</p></div></div><div className="summary-grid">{assessments.map((a,i)=><div key={String(examOf(a).id??a.exam_id)}><span>{band==="ECDE"?"End-Term":assessmentLabel(a,classRow)}</span><strong>{band==="ECDE"?"End-Term":assessmentLabel(a,classRow)}</strong><small className="block mt-1 text-xs text-[#718178]">{String(examOf(a).starts_on??"")} {examOf(a).ends_on&&examOf(a).ends_on!==examOf(a).starts_on?`– ${examOf(a).ends_on}`:""}</small></div>)}</div></section><section className="report-section"><div className="report-section-head"><span>02</span><div><h3>Learning Area Performance</h3><p>{band === "ECDE" ? "Learning areas follow the assessment areas configured for Menwe. End-Term results only. Each recorded level is interpreted as EE, ME, AE or BE." : (gradeFromClass(classRow) ?? 99) >= 1 && (gradeFromClass(classRow) ?? 99) <= 6 ? "Learning areas mirror the class marksheet. The combined score averages Opener and End-Term percentages on a 0–100 scale; both assessment scores remain visible." : "Learning areas mirror the class marksheet. The combined score averages Exam 1 and End-Term percentages on a 0–100 scale; both assessment scores remain visible."}</p></div></div><div className="report-table-wrap"><table><thead><tr><th>Learning Area</th>{band==="ECDE"?<th>End-Term</th>:<><th>{assessmentColumnLabel(classRow)}</th><th>End-Term</th><th>Combined</th></>}<th>%</th><th>Level</th><th>Teacher Interpretation</th></tr></thead><tbody>{lines.map(l=><tr key={l.id}><td><strong>{l.name}</strong><small>{l.code}{l.synthetic?" • Combined report area":""}</small></td>{band==="ECDE"?<td className="score">{l.endTermScore==null?"Not taken":`${fmt(l.endTermScore)} / ${fmt(l.endTermMax)}`}</td>:<><td className="score">{l.exam1Score==null?"Not taken":`${fmt(l.exam1Score)} / ${fmt(l.exam1Max)}`}</td><td className="score">{l.endTermScore==null?"Not taken":`${fmt(l.endTermScore)} / ${fmt(l.endTermMax)}`}</td><td className="score">{fmt(l.score)} / {fmt(l.max)}</td></>}<td className="score">{l.percentage==null?"—":`${l.percentage.toFixed(1)}%`}</td><td className="score"><span className={`level-pill level-${l.levelCode.slice(0,2).toLowerCase()}`}>{l.levelCode}{l.level!=null?` • ${l.level}`:""}</span></td><td>{l.remark}</td></tr>)}</tbody><tfoot><tr><td>Total / Overall</td>{band==="ECDE"?<td>{fmt(lines.reduce((n,l)=>n+(l.endTermScore??0),0))} / {fmt(lines.reduce((n,l)=>n+(l.endTermMax??0),0)||null)}</td>:<><td>{fmt(lines.reduce((n,l)=>n+(l.exam1Score??0),0))} / {fmt(lines.reduce((n,l)=>n+(l.exam1Max??0),0)||null)}</td><td>{fmt(lines.reduce((n,l)=>n+(l.endTermScore??0),0))} / {fmt(lines.reduce((n,l)=>n+(l.endTermMax??0),0)||null)}</td><td>{fmt(totalMarks)} / {fmt(totalMax||null)}</td></>}<td>{average==null?"—":`${average.toFixed(1)}%`}</td><td>{band==="JUNIOR_SCHOOL"?`${totalPoints} points`:band==="ECDE"?`${totalPoints} / ${lines.length*4} points`:`Rank ${rank??"—"}`}</td><td>{band==="JUNIOR_SCHOOL"?`Rank ${rank??"—"} • Junior School ranks by Total Points.`:band==="ECDE"?"ECDE learners are not ranked; the report focuses on competency achievement.":"Ranks by Total Marks. Missing assessments are not treated as zero."}</td></tr></tfoot></table></div></section>
        <section className="report-section"><div className="report-section-head"><span>03</span><div><h3>Performance Summary</h3><p>Key information for the learner and parent/guardian.</p></div></div><div className="summary-grid"><div><span>Combined Marks</span><strong>{fmt(totalMarks)} / {fmt(totalMax||null)}</strong></div><div><span>{band==="ECDE"?"Average Achievement":"Average"}</span><strong>{band==="ECDE"?(lines.length?`${(totalPoints/lines.length).toFixed(1)} / 4`:(average==null?"—":`${average.toFixed(1)}%`)):average==null?"—":`${average.toFixed(1)}%`}</strong></div><div><span>Total Points</span><strong>{band==="JUNIOR_SCHOOL"||band==="ECDE"?totalPoints:"Not used"}</strong></div><div><span>Overall Level</span><strong>{average==null?"—":band==="ECDE"?`${achievement(average,true)?.code??"—"} • ${achievement(average,true)?.remark??"Incomplete"}`:`${achievement(average)?.code??"—"} • Level ${achievement(average)?.level??"—"} • ${(achievement(average)?.level??0)>=7?"Above Average":(achievement(average)?.level??0)>=5?"Average":"Below Average"}`}</strong></div><div><span>{rankLabel}</span><strong>{band==="ECDE"?"Not ranked":rank==null?"—":rank}</strong></div><div><span>Attendance</span><strong>{attendancePercent(attendance)==null?"—":`${attendancePercent(attendance)!.toFixed(1)}%`}</strong></div></div></section>
        <section className="report-section"><div className="report-section-head"><span>04</span><div><h3>Comments & Guidance</h3><p>Professional guidance for the learner and parent/guardian.</p></div></div><div className="report-comment-grid"><div><label>Teacher's remark</label><div className="comment-box">{teacherRemark||"No teacher remark entered."}</div></div><div><label>Headteacher's remark</label><div className="comment-box">{headRemark||"No headteacher remark entered."}</div></div></div></section>
        {admin&&mode==="term"?<section className="report-section no-print"><div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-black uppercase tracking-wider text-[#587064]">Teacher's remark<textarea className="mt-2 min-h-24 w-full rounded-xl border border-[#D7E5DC] bg-white p-3 text-sm font-semibold text-[#17352A] outline-none focus:border-[#D7A52A]" value={teacherRemark} onChange={e=>setTeacherRemark(e.target.value)}/></label><label className="text-xs font-black uppercase tracking-wider text-[#587064]">Headteacher's remark<textarea className="mt-2 min-h-24 w-full rounded-xl border border-[#D7E5DC] bg-white p-3 text-sm font-semibold text-[#17352A] outline-none focus:border-[#D7A52A]" value={headRemark} onChange={e=>setHeadRemark(e.target.value)}/></label></div><button onClick={save} disabled={saving} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D7A52A] px-4 text-sm font-black text-[#17352A]">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Save report card</button></section>:null}
      </div>
      <div className="report-footer"><div><span>Class Teacher</span><div className="signature-line"/><small>Signature / Date</small></div><div className="footer-note"><strong>Menwe Primary & Junior School</strong><small>This report reflects recorded assessment results for the selected academic period. CBC achievement levels are calculated automatically from the recorded percentage.</small></div><div><span>Headteacher</span><div className="signature-line"/><small>Signature / Date</small></div></div>
    </div>:loading?<div className="no-print rounded-2xl border border-[#D7E5DC] bg-white p-8 text-center text-sm font-semibold text-[#587064]"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin"/>Loading report-card workspace…</div>:<div className="no-print rounded-2xl border border-dashed border-[#D7E5DC] bg-[#FBFDFC] p-10 text-center"><p className="text-sm font-black text-[#064A30]">Select a grade/class to produce every learner report at once, or select one learner for an individual report.</p><p className="mt-1 text-xs text-[#718178]">The system automatically determines Lower Primary, Upper Primary or Junior School from the learner's class.</p></div>}
  </div></PortalLayout>;
}
