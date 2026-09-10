import { FileDown, Loader2, Printer, RefreshCw, Save, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import { getSupabase } from "@/lib/supabase";
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
const isCAS = (s: Row) => is(s, /\b(CREATIVE ARTS|ART|MUSIC|MUS|PHYSICAL EDUCATION|PE)\b/);
const isReligious = (s: Row) => is(s, /\b(RELIGIOUS EDUCATION|RELIGION|CRE|IRE|HRE|RE)\b/);
const isPreTech = (s: Row) => is(s, /\b(PRE TECHNICAL|PRE TECH|PRE CAREER|PRE)\b/);

const priority: Record<string, number> = { ENG: 10, KIS: 20, MATH: 30, "INT SCI": 40, SST: 50, RE: 60, CAS: 70, "AGR NUT": 80, "PRE TECH": 90 };
const sortSubjects = (xs: ReportSubject[]) => [...xs].sort((a,b)=>(priority[a.code]??999)-(priority[b.code]??999)||a.name.localeCompare(b.name));

function canonicalSubjects(all: Row[], band: Band): ReportSubject[] {
  const direct = (pattern: (s: Row)=>boolean, code: string, fallbackName: string) => {
    const s = all.find(pattern);
    return s ? { id: String(s.id), code, name: String(s.name), synthetic: false } : null;
  };
  const lower: ReportSubject[] = [
    direct(isEnglish,"ENG","English"), direct(isKiswahili,"KIS","Kiswahili"), direct(isMath,"MATH","Mathematics"),
    direct(s=>is(s,/\b(ENVIRONMENTAL|ENVIRONMENT)\b/),"ENV ACT","Environmental Activities"),
    direct(s=>is(s,/\b(CREATIVE ACTIVITIES|CREATIVE ACT|CREATIVE ARTS)\b/),"CRE ACT","Creative Activities"),
    direct(isReligious,"RE","Religious Education")
  ].filter(Boolean) as ReportSubject[];
  if (band === "LOWER_PRIMARY") return lower;
  if (band === "UPPER_PRIMARY") {
    const scienceParts = all.filter(s=>isAgriculture(s)||isHomeScience(s)||isICT(s));
    const casParts = all.filter(isCAS);
    return sortSubjects([
      direct(isEnglish,"ENG","English"), direct(isKiswahili,"KIS","Kiswahili"), direct(isMath,"MATH","Mathematics"),
      scienceParts.length ? { id:"synthetic-upper-int-science", code:"INT SCI", name:"Integrated Science", synthetic:true, componentIds:scienceParts.map(s=>String(s.id)) } : direct(isScience,"INT SCI","Integrated Science"),
      direct(isSST,"SST","Social Studies"), direct(isReligious,"RE","Religious Education"),
      casParts.length ? { id:"synthetic-upper-cas", code:"CAS", name:"Creative Arts & Sports", synthetic:true, componentIds:casParts.map(s=>String(s.id)) } : null,
    ].filter(Boolean) as ReportSubject[]);
  }
  const junior: ReportSubject[] = [
    direct(isEnglish,"ENG","English"), direct(isKiswahili,"KIS","Kiswahili"), direct(isMath,"MATH","Mathematics"),
    direct(isScience,"INT SCI","Integrated Science"), direct(isSST,"SST","Social Studies"),
    direct(s=>isAgriculture(s)||isHomeScience(s),"AGR NUT","Agriculture & Nutrition"),
    direct(s=>is(s,/\b(CREATIVE ARTS.*SPORT|CAS)\b/),"CAS","Creative Arts & Sports") ?? (all.some(isCAS) ? {id:"synthetic-junior-cas",code:"CAS",name:"Creative Arts & Sports",synthetic:true,componentIds:all.filter(isCAS).map(s=>String(s.id))}:null),
    direct(isPreTech,"PRE TECH","Pre-Technical Studies"), direct(isReligious,"RE","Religious Education")
  ].filter(Boolean) as ReportSubject[];
  const required: Array<[string,string,string]> = [["ENG","English","English"],["KIS","Kiswahili","Kiswahili"],["MATH","Mathematics","Mathematics"],["INT SCI","Integrated Science","Integrated Science"],["SST","Social Studies","Social Studies"],["AGR NUT","Agriculture & Nutrition","Agriculture & Nutrition"],["CAS","Creative Arts & Sports","Creative Arts & Sports"],["PRE TECH","Pre-Technical Studies","Pre-Technical Studies"],["RE","Religious Education","Religious Education"]];
  for (const [code,name,idName] of required) if (!junior.some(x=>x.code===code)) junior.push({id:`missing-${code.toLowerCase().replace(/\s+/g,"-")}`,code,name:idName,synthetic:true,componentIds:[]});
  return sortSubjects(junior).slice(0,9);
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
  return {...subject,score:a?.score??null,max:a?.max??null,percentage:p,level:ach?.level??null,levelCode:ach?.code??"—",remark:ach?.remark??"No published result"};
}
function attendancePercent(rows: Row[]) {
  const total=rows.length; if(!total)return null;
  const present=rows.filter(r=>/PRESENT|LATE/.test(normalize(r.status))).length;
  return present/total*100;
}

export default function ReportCardsDirectory(){
  const {user,profile}=useSchoolAuth(); const admin=ADMINS.includes(profile?.role??"");
  const [students,setStudents]=useState<Row[]>([]),[years,setYears]=useState<Row[]>([]),[terms,setTerms]=useState<Row[]>([]);
  const [studentId,setStudentId]=useState(""),[yearId,setYearId]=useState(""),[termId,setTermId]=useState(""),[mode,setMode]=useState<"term"|"annual">("term");
  const [classRow,setClassRow]=useState<Row|null>(null),[rank,setRank]=useState<number|null>(null),[allSubjects,setAllSubjects]=useState<Row[]>([]),[results,setResults]=useState<Row[]>([]),[attendance,setAttendance]=useState<Row[]>([]),[report,setReport]=useState<Row|null>(null),[teacherRemark,setTeacherRemark]=useState(""),[headRemark,setHeadRemark]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState("");

  useEffect(()=>{void(async()=>{if(!user)return;try{const db=getSupabase();const[s,y,t]=await Promise.all([
    db.from("students").select("id,admission_number,first_name,middle_name,last_name,status").eq("status","ACTIVE").order("first_name").order("last_name"),
    db.from("academic_years").select("id,name,starts_on,ends_on,is_current,status").eq("status","ACTIVE").order("starts_on",{ascending:false}),
    db.from("terms").select("id,academic_year_id,name,starts_on,ends_on,is_current,status").eq("status","ACTIVE").order("starts_on",{ascending:false})
  ]);for(const q of[s,y,t])if(q.error)throw q.error;setStudents(s.data??[]);setYears(y.data??[]);setTerms(t.data??[]);setYearId(String(y.data?.find((x:any)=>x.is_current)?.id??y.data?.[0]?.id??""));}catch(e){setMessage(e instanceof Error?e.message:"Report-card workspace could not be loaded.");}finally{setLoading(false);}})();},[user]);
  const visibleTerms=useMemo(()=>terms.filter(t=>!yearId||String(t.academic_year_id)===yearId),[terms,yearId]);
  const selected=students.find(s=>String(s.id)===studentId); const selectedYear=years.find(y=>String(y.id)===yearId); const selectedTerm=terms.find(t=>String(t.id)===termId); const band=bandFromClass(classRow??undefined); const reportSubjects=useMemo(()=>canonicalSubjects(allSubjects,band),[allSubjects,band]);
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
      const q=mode==="term"?await db.from("exam_results").select("id,exam_id,student_id,subject_id,score,maximum_score,grade,teacher_comment,exams!inner(id,term_id,class_id,name,exam_type,starts_on,ends_on,status),subjects(id,name,code)").eq("student_id",studentId).eq("exams.term_id",termId).eq("exams.class_id",classId).eq("exams.status","PUBLISHED").in("subject_id",ids):termIds.length?await db.from("exam_results").select("id,exam_id,student_id,subject_id,score,maximum_score,grade,teacher_comment,exams!inner(id,term_id,class_id,name,exam_type,starts_on,ends_on,status),subjects(id,name,code)").eq("student_id",studentId).in("exams.term_id",termIds).eq("exams.class_id",classId).eq("exams.status","PUBLISHED").in("subject_id",ids):{data:[],error:null} as any;
      if(q.error)throw q.error;setResults(q.data??[]);
      const classSubjects=(sub.data??[]).map((x:any)=>x.subjects).filter(Boolean); const reportAreas=canonicalSubjects(classSubjects,bandFromClass(cls.data??undefined));
      const enroll=await db.from("enrollments").select("student_id").eq("class_id",classId).eq("academic_year_id",yearId).eq("status","ACTIVE");
      if(!enroll.error&&(enroll.data??[]).length){const idsStudents:string[]=Array.from(new Set<string>((enroll.data??[]).map((x:any)=>String(x.student_id))));const rankQ=mode==="term"?await db.from("exam_results").select("student_id,subject_id,score,maximum_score,exams!inner(term_id,class_id,status,ends_on,starts_on)").in("student_id",idsStudents).eq("exams.term_id",termId).eq("exams.class_id",classId).eq("exams.status","PUBLISHED").in("subject_id",(sub.data??[]).map((x:any)=>String(x.subject_id))):termIds.length?await db.from("exam_results").select("student_id,subject_id,score,maximum_score,exams!inner(term_id,class_id,status,ends_on,starts_on)").in("student_id",idsStudents).in("exams.term_id",termIds).eq("exams.class_id",classId).eq("exams.status","PUBLISHED").in("subject_id",(sub.data??[]).map((x:any)=>String(x.subject_id))):{data:[],error:null} as any;if(!rankQ.error){const grouped=new Map<string,Row[]>();for(const r of rankQ.data??[]){const k=String(r.student_id);grouped.set(k,[...(grouped.get(k)??[]),r]);}const standings=idsStudents.map(id=>{const ls=reportAreas.map(a=>lineFor(a,grouped.get(id)??[]));const marks=ls.reduce((n,l)=>n+(l.score??0),0);const points=ls.reduce((n,l)=>n+(l.level??0),0);return {id,marks,points};}).sort((a,b)=>bandFromClass(cls.data??undefined)==="JUNIOR_SCHOOL"?b.points-a.points||b.marks-a.marks:b.marks-a.marks||b.points-a.points);const pos=standings.findIndex(x=>x.id===studentId);setRank(pos>=0?pos+1:null);}}
      if(mode==="term"){const rc=await db.from("report_cards").select("id,attendance_percentage,average_score,teacher_remark,headteacher_remark,generated_at").eq("student_id",studentId).eq("term_id",termId).maybeSingle();if(rc.error)throw rc.error;if(rc.data){setReport(rc.data);setTeacherRemark(rc.data.teacher_remark??"");setHeadRemark(rc.data.headteacher_remark??"");}}
      if(!(q.data??[]).length)setMessage("No published results were found for this learner in the selected period.");
    }catch(e){setMessage(e instanceof Error?e.message:"Report card could not be generated.");}finally{setBusy(false);}
  };

  const save=async()=>{if(!admin||mode!=="term"||!studentId||!termId||!classRow)return;setSaving(true);setMessage("");try{const db=getSupabase();const payload={student_id:studentId,term_id:termId,class_id:classRow.id,attendance_percentage:attendancePercent(attendance),average_score:average,teacher_remark:teacherRemark.trim()||null,headteacher_remark:headRemark.trim()||null,generated_at:new Date().toISOString()};const q=await db.from("report_cards").upsert(payload,{onConflict:"student_id,term_id"}).select("id,attendance_percentage,average_score,teacher_remark,headteacher_remark,generated_at").single();if(q.error)throw q.error;setReport(q.data);setMessage("Report card saved successfully.");}catch(e){setMessage(e instanceof Error?e.message:"Report card could not be saved.");}finally{setSaving(false);}};

  const print=()=>window.print();
  const downloadPdf=()=>{if(!selected)return;const doc=new jsPDF({unit:"mm",format:"a4"});let y=15;doc.setFontSize(18);doc.setFont("helvetica","bold");doc.text("MENWE PRIMARY & JUNIOR SCHOOL",105,y,{align:"center"});y+=8;doc.setFontSize(11);doc.text(`${mode==="term"?"TERM REPORT CARD":"ANNUAL REPORT CARD"} • ${band.replaceAll("_"," ")}`,105,y,{align:"center"});y+=8;doc.setFontSize(10);doc.setFont("helvetica","normal");doc.text(`Learner: ${fullName}`,15,y);doc.text(`Admission: ${selected.admission_number??"—"}`,125,y);y+=6;doc.text(`Class: ${classRow?.name??"—"}`,15,y);doc.text(`Year: ${selectedYear?.name??"—"}`,125,y);y+=6;if(mode==="term")doc.text(`Term: ${selectedTerm?.name??"—"}`,15,y);y+=8;doc.setFont("helvetica","bold");doc.text("Learning Area",15,y);doc.text("Score",100,y);doc.text("%",125,y);doc.text("Level",145,y);doc.text("Remark",165,y);y+=5;doc.setFont("helvetica","normal");for(const l of lines){if(y>278){doc.addPage();y=15;}doc.text(l.name.slice(0,38),15,y);doc.text(`${fmt(l.score)}/${fmt(l.max)}`,100,y);doc.text(l.percentage==null?"—":`${l.percentage.toFixed(1)}%`,125,y);doc.text(l.levelCode,145,y);doc.text(l.remark.slice(0,24),165,y);y+=5;}y+=4;doc.setFont("helvetica","bold");doc.text(`Total Marks: ${totalMarks}/${totalMax||"—"}`,15,y);doc.text(`Average: ${average==null?"—":average.toFixed(1)+"%"}`,85,y);if(band==="JUNIOR_SCHOOL")doc.text(`Total Points: ${totalPoints}`,150,y);doc.text(`Rank: ${rank??"—"}`,15,y+6);y+=7;doc.setFont("helvetica","normal");doc.text(`Attendance: ${attendancePercent(attendance)==null?"—":attendancePercent(attendance)!.toFixed(1)+"%"}`,15,y);y+=8;doc.text(`Teacher remark: ${teacherRemark||"—"}`,15,y);y+=6;doc.text(`Headteacher remark: ${headRemark||"—"}`,15,y);doc.save(`${fullName.replace(/\s+/g,"-")}-report-card.pdf`);};

  const title=band==="LOWER_PRIMARY"?"Lower Primary Report Card":band==="UPPER_PRIMARY"?"Upper Primary Report Card":"Junior School Report Card";
  return <PortalLayout><div className="mx-auto max-w-7xl space-y-5 px-3 py-4 sm:px-6 lg:px-8">
    <div className="no-print rounded-2xl border border-[#D7E5DC] bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#D7A52A]">Menwe Academic Records</p><h1 className="mt-1 text-2xl font-black tracking-tight text-[#064A30]">Report Cards</h1><p className="mt-1 max-w-2xl text-sm text-[#587064]">One report-card system that automatically follows Lower Primary, Upper Primary and Junior School rules.</p></div><div className="flex flex-wrap gap-2"><button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#064A30] px-4 text-sm font-black text-white" onClick={generate} disabled={busy||loading}>{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}Generate</button>{report||lines.some(l=>l.percentage!=null)?<><button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7E5DC] bg-white px-4 text-sm font-black text-[#064A30]" onClick={print}><Printer className="h-4 w-4"/>Print</button><button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7E5DC] bg-white px-4 text-sm font-black text-[#064A30]" onClick={downloadPdf}><FileDown className="h-4 w-4"/>PDF</button></>:null}</div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5"><select className={input} value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="">Select learner</option>{students.map(s=><option key={s.id} value={s.id}>{learnerName(s)} • {s.admission_number??"—"}</option>)}</select><select className={input} value={yearId} onChange={e=>{setYearId(e.target.value);setTermId("")}}><option value="">Academic year</option>{years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select><select className={input} value={termId} onChange={e=>setTermId(e.target.value)} disabled={mode==="annual"}><option value="">Term</option>{visibleTerms.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><select className={input} value={mode} onChange={e=>setMode(e.target.value as any)}><option value="term">Term report</option><option value="annual">Annual report</option></select><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#D7E5DC] bg-[#F1F7F3] px-4 text-sm font-black text-[#064A30]" onClick={generate} disabled={busy}><RefreshCw className="h-4 w-4"/>Refresh</button></div>{message?<div className="mt-3 rounded-xl border border-[#E7D5A0] bg-[#FFF9EE] px-3 py-2 text-sm font-semibold text-[#6B5319]">{message}</div>:null}</div>

    {(selected&&classRow&&lines.length)?<div className="report-card-print overflow-hidden rounded-2xl border border-[#D7E5DC] bg-white shadow-sm">
      <div className="report-hero"><div><div className="report-eyebrow">Menwe Primary & Junior School</div><div className="report-contact">Learning • Character • Competence • Community</div><h2>{title}</h2><p>{mode==="term"?`${selectedTerm?.name??"Term"} • ${selectedYear?.name??"Academic Year"}`:`Annual Performance • ${selectedYear?.name??"Academic Year"}`}</p></div><div className="report-badge"><span>{band==="JUNIOR_SCHOOL"?"POINTS":"AVERAGE"}</span><strong>{band==="JUNIOR_SCHOOL"?totalPoints:(average==null?"—":`${average.toFixed(0)}%`)}</strong></div></div>
      <div className="report-identity"><div><span>Learner</span><strong>{fullName}</strong></div><div><span>Admission No.</span><strong>{selected.admission_number??"—"}</strong></div><div><span>Class</span><strong>{classRow.name??classRow.code??"—"}</strong></div><div><span>Pathway</span><strong>{band.replaceAll("_"," ")}</strong></div></div>
      <div className="report-body"><section className="report-section"><div className="report-section-head"><span>01</span><div><h3>Learning Area Performance</h3><p>Percentages are shown with the automatic CBC achievement level. Upper Primary combines Agriculture + Home Science + ICT into Integrated Science and Creative Arts + Music + PE into Creative Arts & Sports.</p></div></div><div className="report-table-wrap"><table><thead><tr><th>Learning Area</th><th>Score</th><th>Percentage</th><th>Level</th><th>Teacher Interpretation</th></tr></thead><tbody>{lines.map(l=><tr key={l.id}><td><strong>{l.name}</strong><small>{l.code}{l.synthetic?" • Combined report area":""}</small></td><td className="score">{fmt(l.score)} / {fmt(l.max)}</td><td className="score">{l.percentage==null?"—":`${l.percentage.toFixed(1)}%`}</td><td className="score"><span className="level-pill">{l.levelCode}{l.level!=null?` • ${l.level}`:""}</span></td><td>{l.remark}</td></tr>)}</tbody><tfoot><tr><td>Total / Overall</td><td>{fmt(totalMarks)} / {fmt(totalMax||null)}</td><td>{average==null?"—":`${average.toFixed(1)}%`}</td><td>{band==="JUNIOR_SCHOOL"?`${totalPoints} points`:`Rank ${rank??"—"}`}</td><td>{band==="JUNIOR_SCHOOL"?`Rank ${rank??"—"} • Junior School ranks by Total Points.`:`Ranks by Total Marks.`}</td></tr></tfoot></table></div></section>
        <section className="report-section"><div className="report-section-head"><span>02</span><div><h3>Performance Summary</h3><p>Key information for the learner and family.</p></div></div><div className="summary-grid"><div><span>Total Marks</span><strong>{fmt(totalMarks)} / {fmt(totalMax||null)}</strong></div><div><span>Average</span><strong>{average==null?"—":`${average.toFixed(1)}%`}</strong></div><div><span>Total Points</span><strong>{band==="JUNIOR_SCHOOL"?totalPoints:"Not used"}</strong></div><div><span>{rankLabel}</span><strong>{rank==null?"—":rank}</strong></div><div><span>Attendance</span><strong>{attendancePercent(attendance)==null?"—":`${attendancePercent(attendance)!.toFixed(1)}%`}</strong></div></div></section>
        <section className="report-section"><div className="report-section-head"><span>03</span><div><h3>Comments & Guidance</h3><p>Professional remarks retained with the report card.</p></div></div><div className="report-comment-grid"><div><label>Teacher's remark</label><div className="comment-box">{teacherRemark||"No teacher remark entered."}</div></div><div><label>Headteacher's remark</label><div className="comment-box">{headRemark||"No headteacher remark entered."}</div></div></div></section>
        {admin&&mode==="term"?<section className="report-section no-print"><div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-black uppercase tracking-wider text-[#587064]">Teacher's remark<textarea className="mt-2 min-h-24 w-full rounded-xl border border-[#D7E5DC] bg-white p-3 text-sm font-semibold text-[#17352A] outline-none focus:border-[#D7A52A]" value={teacherRemark} onChange={e=>setTeacherRemark(e.target.value)}/></label><label className="text-xs font-black uppercase tracking-wider text-[#587064]">Headteacher's remark<textarea className="mt-2 min-h-24 w-full rounded-xl border border-[#D7E5DC] bg-white p-3 text-sm font-semibold text-[#17352A] outline-none focus:border-[#D7A52A]" value={headRemark} onChange={e=>setHeadRemark(e.target.value)}/></label></div><button onClick={save} disabled={saving} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D7A52A] px-4 text-sm font-black text-[#17352A]">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Save report card</button></section>:null}
      </div>
      <div className="report-footer"><div><span>Class Teacher</span><div className="signature-line"/><small>Signature / Date</small></div><div className="footer-note"><strong>Menwe Primary & Junior School</strong><small>This report reflects published assessment results for the selected academic period. CBC achievement levels are calculated automatically from the recorded percentage.</small></div><div><span>Headteacher</span><div className="signature-line"/><small>Signature / Date</small></div></div>
    </div>:loading?<div className="no-print rounded-2xl border border-[#D7E5DC] bg-white p-8 text-center text-sm font-semibold text-[#587064]"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin"/>Loading report-card workspace…</div>:<div className="no-print rounded-2xl border border-dashed border-[#D7E5DC] bg-[#FBFDFC] p-10 text-center"><p className="text-sm font-black text-[#064A30]">Select a learner, academic period and generate the report card.</p><p className="mt-1 text-xs text-[#718178]">The system automatically determines Lower Primary, Upper Primary or Junior School from the learner's class.</p></div>}
  </div></PortalLayout>;
}
