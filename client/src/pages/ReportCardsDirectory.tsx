// Report-card arrangement: learner selector is ordered Grade 1 → Grade 9; report subjects mirror class marksheet subjects.
// Report-card canonical-subject deployment marker: lower/upper Creative Arts, CRE and Integrated Science use canonical subject IDs; staff see DRAFT + PUBLISHED.
// Report-card entered-results deployment marker: staff can view DRAFT + PUBLISHED results; families remain publication-limited.
import { FileDown, Loader2, Printer, RefreshCw, Save, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import { getSupabase } from "@/lib/supabase";
import { persistReportCardWithItems } from "@/lib/reportCardPersistence";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import "../report-card.css";

type Row = Record<string, any>;
type Band = "LOWER_PRIMARY" | "UPPER_PRIMARY" | "JUNIOR_SCHOOL";
type ReportSubject = { id: string; code: string; name: string; synthetic?: boolean; componentIds?: string[] };
type ReportLine = ReportSubject & { score: number | null; max: number | null; percentage: number | null; level: number | null; levelCode: string; remark: string };

const ADMINS = ["SUPER_ADMIN", "ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI"];
const input = "min-h-11 rounded-xl border border-[#D7E5DC] bg-white px-3 py-2.5 text-sm font-semibold text-[#17352A] outline-none transition focus:border-[#D7A52A] focus:ring-2 focus:ring-[#D7A52A]/20";
const normalize = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const fmt = (v: number | null) => v == null || !Number.isFinite(v) ? "—" : Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, "");
const learnerName = (s: Row) => [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");

function achievement(value: number | null) {
  if (value == null) return null;
  const p = Math.max(0, Math.min(100, value));
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
function bandFromClass(c?: Row): Band {
  const g = gradeFromClass(c);
  if (g != null) return g <= 3 ? "LOWER_PRIMARY" : g <= 6 ? "UPPER_PRIMARY" : "JUNIOR_SCHOOL";
  const raw = normalize(`${c?.name ?? ""} ${c?.code ?? ""} ${c?.level ?? ""}`);
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

function reportAreasForBand(subjects: Row[], band: Band): ReportSubject[] {
  const canonical = canonicalSubjects(subjects, band);

  if (band === "LOWER_PRIMARY") {
    // Menwe Lower Primary report cards use exactly four learning areas:
    // English, Kiswahili, Mathematics and Environmental Activities.
    return sortSubjects(canonical.filter(s =>
      isEnglish(s) ||
      isKiswahili(s) ||
      isMath(s) ||
      is(s, /\b(ENVIRONMENTAL|ENVIRONMENT)\b/)
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

function latestFor(rows: Row[], subjectIds: string[]) {
  const filtered = rows.filter(r=>subjectIds.includes(String(r.subject_id)));
  return [...filtered].sort((a,b)=>String(a.exams?.ends_on??a.exams?.starts_on??a.exam_id).localeCompare(String(b.exams?.ends_on??b.exams?.starts_on??b.exam_id))).at(-1) ?? null;
}
function aggregate(rows: Row[], ids: string[]) {
  const chosen = ids.map(id=>latestFor(rows,[id])).filter(Boolean) as Row[];
  const score = chosen.reduce((n,r)=>n+(num(r.score)??0),0);
  const max = chosen.reduce((n,r)=>n+(num(r.maximum_score)??0),0);
  return max>0 ? {score,max,percentage:score/max*100}:null;
}
function lineFor(subject: ReportSubject, results: Row[]): ReportLine {
  const ids = subject.componentIds?.length ? subject.componentIds : [subject.id];
  const a = aggregate(results, ids);
  const p = a?.percentage ?? null;
  const ach = achievement(p);
  return {...subject,score:a?.score??null,max:a?.max??null,percentage:p,level:ach?.level??null,levelCode:ach?.code??"—",remark:ach?.remark??"No recorded result"};
}
function attendancePercent(rows: Row[]) {
  const total=rows.length; if(!total)return null;
  const present=rows.filter(r=>/PRESENT|LATE/.test(normalize(r.status))).length;
  return present/total*100;
}

export default function ReportCardsDirectory(){
  const {user,profile}=useSchoolAuth(); const admin=ADMINS.includes(profile?.role??""); const canUseEnteredResults=admin||profile?.role==="TEACHER";
  const [students,setStudents]=useState<Row[]>([]),[years,setYears]=useState<Row[]>([]),[terms,setTerms]=useState<Row[]>([]);
  const [studentId,setStudentId]=useState(""),[yearId,setYearId]=useState(""),[termId,setTermId]=useState(""),[mode,setMode]=useState<"term"|"annual">("term");
  const [classRow,setClassRow]=useState<Row|null>(null),[rank,setRank]=useState<number|null>(null),[allSubjects,setAllSubjects]=useState<Row[]>([]),[results,setResults]=useState<Row[]>([]),[attendance,setAttendance]=useState<Row[]>([]),[report,setReport]=useState<Row|null>(null),[teacherRemark,setTeacherRemark]=useState(""),[headRemark,setHeadRemark]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState("");

  useEffect(()=>{void(async()=>{if(!user)return;try{const db=getSupabase();const[s,y,t]=await Promise.all([
    db.from("students").select("id,admission_number,first_name,middle_name,last_name,status").eq("status","ACTIVE").order("first_name").order("last_name"),
    db.from("academic_years").select("id,name,starts_on,ends_on,is_current,status").eq("status","ACTIVE").order("starts_on",{ascending:false}),
    db.from("terms").select("id,academic_year_id,name,starts_on,ends_on,is_current,status").eq("status","ACTIVE").order("starts_on",{ascending:false})
  ]);for(const q of[s,y,t])if(q.error)throw q.error;
const currentYearId=String(y.data?.find((x:any)=>x.is_current)?.id??y.data?.[0]?.id??"");
const [enr,cls]=await Promise.all([
  db.from("enrollments").select("student_id,class_id").eq("academic_year_id",currentYearId).eq("status","ACTIVE"),
  db.from("classes").select("id,name,code,level").eq("academic_year_id",currentYearId).eq("status","ACTIVE")
]);
const classById=new Map<string,Row>((cls.data??[]).map((c:any)=>[String(c.id),c]));
const classByStudent=new Map<string,Row>((enr.data??[]).reduce<Array<[string,Row]>>((acc,e:any)=>{const cls=classById.get(String(e.class_id));if(cls)acc.push([String(e.student_id),cls]);return acc;},[]));
const orderedStudents=[...(s.data??[])].map((st:any)=>({...st,_className:classByStudent.get(String(st.id))?.name??classByStudent.get(String(st.id))?.code??"",_classGrade:gradeFromClass(classByStudent.get(String(st.id)))})).sort((a:any,b:any)=>(a._classGrade??999)-(b._classGrade??999)||String(a._className??"").localeCompare(String(b._className??""),undefined,{numeric:true,sensitivity:"base"})||learnerName(a).localeCompare(learnerName(b),undefined,{sensitivity:"base"})||String(a.admission_number??"").localeCompare(String(b.admission_number??""),undefined,{numeric:true,sensitivity:"base"}));
setStudents(orderedStudents);setYears(y.data??[]);setTerms(t.data??[]);setYearId(currentYearId);}catch(e){setMessage(e instanceof Error?e.message:"Report-card workspace could not be loaded.");}finally{setLoading(false);}})();},[user]);
  const visibleTerms=useMemo(()=>terms.filter(t=>!yearId||String(t.academic_year_id)===yearId),[terms,yearId]);
  const selected=students.find(s=>String(s.id)===studentId); const selectedYear=years.find(y=>String(y.id)===yearId); const selectedTerm=terms.find(t=>String(t.id)===termId); const band=bandFromClass(classRow??undefined); const reportSubjects=useMemo(()=>reportAreasForBand(allSubjects,band),[allSubjects,band]);
  const lines=useMemo(()=>reportSubjects.map(s=>lineFor(s,results)),[reportSubjects,results]);
  const totalMarks=useMemo(()=>lines.reduce((n,l)=>n+(l.score??0),0),[lines]); const totalMax=useMemo(()=>lines.reduce((n,l)=>n+(l.max??0),0),[lines]); const average=totalMax?totalMarks/totalMax*100:null; const totalPoints=lines.reduce((n,l)=>n+(l.level??0),0);
  const fullName=selected?learnerName(selected):""; const rankLabel=band==="JUNIOR_SCHOOL"?"Rank • Total Points":"Rank • Total Marks";
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
      if(q.error)throw q.error;setResults(q.data??[]);
      const classSubjects=(sub.data??[]).map((x:any)=>x.subjects).filter(Boolean); const reportAreas=reportAreasForBand(classSubjects,bandFromClass(cls.data??undefined));
      const enroll=await db.from("enrollments").select("student_id").eq("class_id",classId).eq("academic_year_id",yearId).eq("status","ACTIVE");
      if(!enroll.error&&(enroll.data??[]).length){const idsStudents:string[]=Array.from(new Set<string>((enroll.data??[]).map((x:any)=>String(x.student_id))));const rankQ=mode==="term"?await db.from("exam_results").select("student_id,subject_id,score,maximum_score,exams!inner(term_id,class_id,status,ends_on,starts_on)").in("student_id",idsStudents).eq("exams.term_id",termId).eq("exams.class_id",classId).in("exams.status",canUseEnteredResults?["DRAFT","PUBLISHED"]:["PUBLISHED"]).in("subject_id",(sub.data??[]).map((x:any)=>String(x.subject_id))):termIds.length?await db.from("exam_results").select("student_id,subject_id,score,maximum_score,exams!inner(term_id,class_id,status,ends_on,starts_on)").in("student_id",idsStudents).in("exams.term_id",termIds).eq("exams.class_id",classId).in("exams.status",canUseEnteredResults?["DRAFT","PUBLISHED"]:["PUBLISHED"]).in("subject_id",(sub.data??[]).map((x:any)=>String(x.subject_id))):{data:[],error:null} as any;if(!rankQ.error){const grouped=new Map<string,Row[]>();for(const r of rankQ.data??[]){const k=String(r.student_id);grouped.set(k,[...(grouped.get(k)??[]),r]);}const standings=idsStudents.map(id=>{const ls=reportAreas.map(a=>lineFor(a,grouped.get(id)??[]));const marks=ls.reduce((n,l)=>n+(l.score??0),0);const points=ls.reduce((n,l)=>n+(l.level??0),0);return {id,marks,points};}).sort((a,b)=>bandFromClass(cls.data??undefined)==="JUNIOR_SCHOOL"?b.points-a.points||b.marks-a.marks:b.marks-a.marks||b.points-a.points);const pos=standings.findIndex(x=>x.id===studentId);setRank(pos>=0?pos+1:null);}}
      if(mode==="term"){const rc=await db.from("report_cards").select("id,attendance_percentage,average_score,teacher_remark,headteacher_remark,generated_at").eq("student_id",studentId).eq("term_id",termId).maybeSingle();if(rc.error)throw rc.error;if(rc.data){setReport(rc.data);setTeacherRemark(rc.data.teacher_remark??"");setHeadRemark(rc.data.headteacher_remark??"");}}
      if(!(q.data??[]).length)setMessage("No recorded results were found for this learner in the selected period.");
    }catch(e){setMessage(e instanceof Error?e.message:"Report card could not be generated.");}finally{setBusy(false);}
  };

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
  const drawPdfPage=(doc:any,student:Row,cls:Row,subjectRows:Row[],studentResults:Row[],studentAttendance:Row[],studentRank:number|null,teacher:string,head:string)=>{
    const b=bandFromClass(cls), areas=reportAreasForBand(subjectRows,b), ls=areas.map(x=>lineFor(x,studentResults));
    const tm=ls.reduce((n,l)=>n+(l.score??0),0), mx=ls.reduce((n,l)=>n+(l.max??0),0), avg=mx?tm/mx*100:null, pts=ls.reduce((n,l)=>n+(l.level??0),0), att=attendancePercent(studentAttendance);
    let y=11; const W=210, M=10;
    doc.setFillColor(6,18,41); doc.rect(M,y,W-M*2,25,"F"); doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.text("MENWE PRIMARY & JUNIOR SCHOOL",W/2,y+8,{align:"center"}); doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.text("Igoki, Abogeta  •  Term Academic Report",W/2,y+13,{align:"center"}); doc.setFillColor(216,155,40); doc.rect(M,y+20,W-M*2,5,"F"); doc.setTextColor(6,18,41); doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.text(`${mode==="term"?"TERM REPORT CARD":"ANNUAL REPORT CARD"} - ${b.replaceAll("_"," ")}`,W/2,y+23.5,{align:"center"}); y+=31;
    doc.setDrawColor(190,200,215); doc.setFillColor(247,250,252); doc.roundedRect(M,y,W-M*2,23,2,2,"FD"); doc.setFontSize(8); doc.setTextColor(70,85,100); doc.setFont("helvetica","bold");
    const meta=[["LEARNER",learnerName(student)],["ADMISSION NO.",student.admission_number??"—"],["CLASS",cls.name??cls.code??"—"],["TERM",mode==="term"?(selectedTerm?.name??"—"):"Annual"],["YEAR",selectedYear?.name??"—"],["ATTENDANCE",att==null?"—":att.toFixed(1)+"%"]];
    meta.forEach((m,i)=>{const col=i%2,row=Math.floor(i/2),x=M+5+col*92,yy=y+6+row*7.1;doc.setFontSize(6.5);doc.setTextColor(90,105,120);doc.text(m[0],x,yy);doc.setFontSize(8);doc.setTextColor(16,42,67);doc.setFont("helvetica","bold");doc.text(String(m[1]).slice(0,42),x+25,yy);}); y+=28;
    doc.setFillColor(7,27,58);doc.rect(M,y,W-M*2,7,"F");doc.setTextColor(255,255,255);doc.setFontSize(7.5);doc.setFont("helvetica","bold");doc.text("LEARNING AREA",M+3,y+4.8);doc.text("SCORE",103,y+4.8,{align:"right"});doc.text("%",128,y+4.8,{align:"right"});doc.text("LEVEL",151,y+4.8,{align:"center"});doc.text("ACHIEVEMENT",M+162,y+4.8);y+=7;
    ls.forEach((l,i)=>{const h=6.2;if(i%2===1){doc.setFillColor(247,250,252);doc.rect(M,y,W-M*2,h,"F");}doc.setDrawColor(205,214,224);doc.rect(M,y,W-M*2,h);doc.setTextColor(16,42,67);doc.setFontSize(7);doc.setFont("helvetica","bold");doc.text(l.name.slice(0,36),M+3,y+4.2);doc.setFont("helvetica","normal");doc.text(`${fmt(l.score)} / ${fmt(l.max)}`,103,y+4.2,{align:"right"});doc.text(l.percentage==null?"—":l.percentage.toFixed(1)+"%",128,y+4.2,{align:"right"});doc.setFont("helvetica","bold");doc.text(l.levelCode,151,y+4.2,{align:"center"});doc.setFont("helvetica","normal");doc.text(l.remark.slice(0,24),M+162,y+4.2);y+=h;});
    y+=4; doc.setFillColor(243,247,250);doc.roundedRect(M,y,W-M*2,15,2,2,"F");const metrics=[["TOTAL MARKS",`${fmt(tm)} / ${fmt(mx||null)}`],["MEAN AVERAGE",avg==null?"—":avg.toFixed(1)+"%"],["CLASS RANK",studentRank==null?"—":String(studentRank)],["TOTAL POINTS",b==="JUNIOR_SCHOOL"?String(pts):"—"]];metrics.forEach((m,i)=>{const x=M+4+i*47;doc.setTextColor(90,105,120);doc.setFontSize(6.2);doc.setFont("helvetica","bold");doc.text(m[0],x,y+5);doc.setTextColor(6,18,41);doc.setFontSize(10);doc.text(m[1],x,y+11);});y+=19;
    const boxW=92;[["CLASS TEACHER REMARK",teacher||"No teacher remark entered."],["HEADTEACHER REMARK",head||"No headteacher remark entered."]].forEach((m,i)=>{const x=M+i*94;doc.setDrawColor(190,200,215);doc.roundedRect(x,y,boxW,24,2,2,"S");doc.setTextColor(7,27,58);doc.setFontSize(6.5);doc.setFont("helvetica","bold");doc.text(m[0],x+4,y+5);doc.setTextColor(55,70,85);doc.setFontSize(7);doc.setFont("helvetica","normal");doc.text(doc.splitTextToSize(String(m[1]),boxW-8).slice(0,3),x+4,y+10);doc.setDrawColor(70,85,100);doc.line(x+4,y+19,x+55,y+19);doc.setFontSize(5.5);doc.text("Signature / Date",x+4,y+22);});y+=29;doc.setFontSize(5.8);doc.setTextColor(105,115,125);doc.text("This report reflects recorded assessment results for the selected academic period.",W/2,y,{align:"center"});
  };
  const print=()=>window.print();
  const downloadPdf=()=>{if(!selected||!classRow)return;const doc=new jsPDF({unit:"mm",format:"a4",orientation:"portrait"});drawPdfPage(doc,selected,classRow,allSubjects,results,attendance,rank,teacherRemark,headRemark);doc.save(reportFilename(selected,classRow.name,mode==="term"?selectedTerm?.name:"Annual"));};
  const batchPdf=async()=>{
    if(!selected||!classRow||!yearId||mode!=="term"||!termId){
      setMessage("Generate one learner first and select a term before creating the class batch.");
      return;
    }
    setBusy(true);setMessage("");
    try{
      const db=getSupabase();const classId=String(classRow.id);
      const enr=await db.from("enrollments").select("student_id").eq("class_id",classId).eq("academic_year_id",yearId).eq("status","ACTIVE");
      if(enr.error)throw enr.error;
      const ids=Array.from(new Set((enr.data??[]).map((r:any)=>String(r.student_id))));
      if(!ids.length)throw new Error("No active learners were found in this class.");

      const [sr,ar,rc,attAll]=await Promise.all([
        db.from("students").select("id,admission_number,first_name,middle_name,last_name").in("id",ids),
        db.from("exam_results").select("student_id,subject_id,score,maximum_score,exam_id,grade,exams!inner(term_id,class_id,status,ends_on,starts_on)").in("student_id",ids).eq("exams.class_id",classId).eq("exams.term_id",termId).in("exams.status",canUseEnteredResults?["DRAFT","PUBLISHED"]:["PUBLISHED"]).in("subject_id",allSubjects.map(s=>String(s.id))),
        db.from("report_cards").select("student_id,teacher_remark,headteacher_remark").in("student_id",ids).eq("term_id",termId),
        db.from("attendance_records").select("student_id,status,attendance_sessions!inner(class_id,session_date)").in("student_id",ids)
      ]);
      for(const q of[sr,ar,rc,attAll])if(q.error)throw q.error;

      const groups=new Map<string,Row[]>();
      for(const r of ar.data??[]){const k=String(r.student_id);groups.set(k,[...(groups.get(k)??[]),r]);}
      const attendanceGroups=new Map<string,Row[]>();
      for(const r of attAll.data??[]){const k=String(r.student_id);attendanceGroups.set(k,[...(attendanceGroups.get(k)??[]),r]);}

      const subjects=allSubjects;
      const reportAreas=reportAreasForBand(subjects,bandFromClass(classRow));
      const standings=ids.map(id=>{
        const ls=reportAreas.map(x=>lineFor(x,groups.get(id)??[]));
        return{id,marks:ls.reduce((n,l)=>n+(l.score??0),0),points:ls.reduce((n,l)=>n+(l.level??0),0)};
      }).sort((a,b)=>bandFromClass(classRow)==="JUNIOR_SCHOOL"?b.points-a.points||b.marks-a.marks:b.marks-a.marks||b.points-a.points);

      const existingRemarks=new Map<string,Row>((rc.data??[]).map((r:any)=>[String(r.student_id),r]));
      const prepared=(sr.data??[]).map((st:any)=>{
        const id=String(st.id),studentResults=groups.get(id)??[],linesForStudent=reportAreas.map(x=>lineFor(x,studentResults));
        const totalMarks=linesForStudent.reduce((n,l)=>n+(l.score??0),0);
        const totalMax=linesForStudent.reduce((n,l)=>n+(l.max??0),0);
        const average=totalMax>0?totalMarks/totalMax*100:null;
        const attRows=attendanceGroups.get(id)??[],remarks=existingRemarks.get(id);
        const itemRows=linesForStudent.filter(l=>l.score!=null||l.max!=null).map(l=>({
          subject_id:String(l.id),score:l.score,maximum_score:l.max,grade:l.levelCode==="—"?null:l.levelCode
        }));
        return{st,id,linesForStudent,average,attRows,remarks,itemRows};
      });

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
      persisted.sort((a,b)=>learnerName(a.st).localeCompare(learnerName(b.st))).forEach((p:any,i:number)=>{
        if(i)doc.addPage();
        const pos=standings.findIndex(x=>x.id===p.id);
        drawPdfPage(doc,p.st,classRow,subjects,groups.get(p.id)??[],p.attRows,pos>=0?pos+1:null,p.remarks?.teacher_remark??"",p.remarks?.headteacher_remark??"");
      });
      doc.save(`${safePart(classRow.name??classRow.code)}_${safePart(selectedTerm?.name)}_Report_Cards.pdf`);
      setMessage(`Batch PDF created for ${persisted.length} learners. Supabase persistence verified before PDF generation.`);
    }catch(e){setMessage(e instanceof Error?e.message:"Batch report generation failed. No PDF was generated.");}
    finally{setBusy(false);}
  };

  const title=band==="LOWER_PRIMARY"?"Lower Primary Report Card":band==="UPPER_PRIMARY"?"Upper Primary Report Card":"Junior School Report Card";
  return <PortalLayout><div className="mx-auto max-w-7xl space-y-5 px-3 py-4 sm:px-6 lg:px-8">
    <div className="no-print rounded-2xl border border-[#D7E5DC] bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#D7A52A]">Menwe Academic Records</p><h1 className="mt-1 text-2xl font-black tracking-tight text-[#064A30]">Report Cards</h1><p className="mt-1 max-w-2xl text-sm text-[#587064]">One report-card system that automatically follows Lower Primary, Upper Primary and Junior School rules.</p></div><div className="flex flex-wrap gap-2"><button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#064A30] px-4 text-sm font-black text-white" onClick={generate} disabled={busy||loading}>{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}Generate</button>{report||lines.some(l=>l.percentage!=null)?<><button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7E5DC] bg-white px-4 text-sm font-black text-[#064A30]" onClick={print}><Printer className="h-4 w-4"/>Print</button><button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7E5DC] bg-white px-4 text-sm font-black text-[#064A30]" onClick={downloadPdf}><FileDown className="h-4 w-4"/>PDF</button>{admin?<button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D89B28] px-4 text-sm font-black text-[#061229]" onClick={batchPdf} disabled={busy}><FileDown className="h-4 w-4"/>Batch Class PDF</button>:null}</>:null}</div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5"><select className={input} value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="">Select learner</option>{students.map(s=><option key={s.id} value={s.id}>{s._className?`${s._className} • `:""}{learnerName(s)} • {s.admission_number??"—"}</option>)}</select><select className={input} value={yearId} onChange={e=>{setYearId(e.target.value);setTermId("")}}><option value="">Academic year</option>{years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select><select className={input} value={termId} onChange={e=>setTermId(e.target.value)} disabled={mode==="annual"}><option value="">Term</option>{visibleTerms.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><select className={input} value={mode} onChange={e=>setMode(e.target.value as any)}><option value="term">Term report</option><option value="annual">Annual report</option></select><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#D7E5DC] bg-[#F1F7F3] px-4 text-sm font-black text-[#064A30]" onClick={generate} disabled={busy}><RefreshCw className="h-4 w-4"/>Refresh</button></div>{message?<div className="mt-3 rounded-xl border border-[#E7D5A0] bg-[#FFF9EE] px-3 py-2 text-sm font-semibold text-[#6B5319]">{message}</div>:null}</div>

    {(selected&&classRow&&lines.length)?<div className="report-card-print overflow-hidden rounded-2xl border border-[#D7E5DC] bg-white shadow-sm">
      <div className="report-hero"><div className="report-logo-slot" aria-label="Menwe Primary & Junior School official crest"><img src="/menwe-crest.svg" alt="Menwe Primary & Junior School official crest" /></div><div><div className="report-eyebrow">MENWE PRIMARY & JUNIOR SCHOOL</div><div className="report-contact">Igoki, Abogeta • School Contact: __________________</div><h2>{title}</h2><p>{mode==="term"?`${selectedTerm?.name??"Term"} • ${selectedYear?.name??"Academic Year"}`:`Annual Performance • ${selectedYear?.name??"Academic Year"}`}</p></div><div className="report-badge"><span>{band==="JUNIOR_SCHOOL"?"POINTS":"AVERAGE"}</span><strong>{band==="JUNIOR_SCHOOL"?totalPoints:(average==null?"—":`${average.toFixed(0)}%`)}</strong></div></div>
      <div className="report-identity"><div><span>Learner</span><strong>{fullName}</strong></div><div><span>Admission No.</span><strong>{selected.admission_number??"—"}</strong></div><div><span>Class</span><strong>{classRow.name??classRow.code??"—"}</strong></div><div><span>Year</span><strong>{selectedYear?.name??"—"}</strong></div><div><span>Attendance</span><strong>{attendancePercent(attendance)==null?"—":`${attendancePercent(attendance)!.toFixed(1)}%`}</strong></div></div>
      <div className="report-body"><section className="report-section"><div className="report-section-head"><span>01</span><div><h3>Learning Area Performance</h3><p>Learning areas shown here are the same class subjects used by the marksheet for this learner.</p></div></div><div className="report-table-wrap"><table><thead><tr><th>Learning Area</th><th>Score</th><th>Percentage</th><th>Level</th><th>Teacher Interpretation</th></tr></thead><tbody>{lines.map(l=><tr key={l.id}><td><strong>{l.name}</strong><small>{l.code}{l.synthetic?" • Combined report area":""}</small></td><td className="score">{fmt(l.score)} / {fmt(l.max)}</td><td className="score">{l.percentage==null?"—":`${l.percentage.toFixed(1)}%`}</td><td className="score"><span className={`level-pill level-${l.levelCode.slice(0,2).toLowerCase()}`}>{l.levelCode}{l.level!=null?` • ${l.level}`:""}</span></td><td>{l.remark}</td></tr>)}</tbody><tfoot><tr><td>Total / Overall</td><td>{fmt(totalMarks)} / {fmt(totalMax||null)}</td><td>{average==null?"—":`${average.toFixed(1)}%`}</td><td>{band==="JUNIOR_SCHOOL"?`${totalPoints} points`:`Rank ${rank??"—"}`}</td><td>{band==="JUNIOR_SCHOOL"?`Rank ${rank??"—"} • Junior School ranks by Total Points.`:`Ranks by Total Marks.`}</td></tr></tfoot></table></div></section>
        <section className="report-section"><div className="report-section-head"><span>02</span><div><h3>Performance Summary</h3><p>Key information for the learner and family.</p></div></div><div className="summary-grid"><div><span>Total Marks</span><strong>{fmt(totalMarks)} / {fmt(totalMax||null)}</strong></div><div><span>Average</span><strong>{average==null?"—":`${average.toFixed(1)}%`}</strong></div><div><span>Total Points</span><strong>{band==="JUNIOR_SCHOOL"?totalPoints:"Not used"}</strong></div><div><span>{rankLabel}</span><strong>{rank==null?"—":rank}</strong></div><div><span>Attendance</span><strong>{attendancePercent(attendance)==null?"—":`${attendancePercent(attendance)!.toFixed(1)}%`}</strong></div></div></section>
        <section className="report-section"><div className="report-section-head"><span>03</span><div><h3>Comments & Guidance</h3><p>Professional remarks retained with the report card.</p></div></div><div className="report-comment-grid"><div><label>Teacher's remark</label><div className="comment-box">{teacherRemark||"No teacher remark entered."}</div></div><div><label>Headteacher's remark</label><div className="comment-box">{headRemark||"No headteacher remark entered."}</div></div></div></section>
        {admin&&mode==="term"?<section className="report-section no-print"><div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-black uppercase tracking-wider text-[#587064]">Teacher's remark<textarea className="mt-2 min-h-24 w-full rounded-xl border border-[#D7E5DC] bg-white p-3 text-sm font-semibold text-[#17352A] outline-none focus:border-[#D7A52A]" value={teacherRemark} onChange={e=>setTeacherRemark(e.target.value)}/></label><label className="text-xs font-black uppercase tracking-wider text-[#587064]">Headteacher's remark<textarea className="mt-2 min-h-24 w-full rounded-xl border border-[#D7E5DC] bg-white p-3 text-sm font-semibold text-[#17352A] outline-none focus:border-[#D7A52A]" value={headRemark} onChange={e=>setHeadRemark(e.target.value)}/></label></div><button onClick={save} disabled={saving} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D7A52A] px-4 text-sm font-black text-[#17352A]">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Save report card</button></section>:null}
      </div>
      <div className="report-footer"><div><span>Class Teacher</span><div className="signature-line"/><small>Signature / Date</small></div><div className="footer-note"><strong>Menwe Primary & Junior School</strong><small>This report reflects recorded assessment results for the selected academic period. CBC achievement levels are calculated automatically from the recorded percentage.</small></div><div><span>Headteacher</span><div className="signature-line"/><small>Signature / Date</small></div></div>
    </div>:loading?<div className="no-print rounded-2xl border border-[#D7E5DC] bg-white p-8 text-center text-sm font-semibold text-[#587064]"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin"/>Loading report-card workspace…</div>:<div className="no-print rounded-2xl border border-dashed border-[#D7E5DC] bg-[#FBFDFC] p-10 text-center"><p className="text-sm font-black text-[#064A30]">Select a learner, academic period and generate the report card.</p><p className="mt-1 text-xs text-[#718178]">The system automatically determines Lower Primary, Upper Primary or Junior School from the learner's class.</p></div>}
  </div></PortalLayout>;
}
