import { FileDown, FileText, Loader2, Printer, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import "../report-card.css";

type Row = Record<string, any>;
type Band = "LOWER_PRIMARY" | "UPPER_PRIMARY" | "JUNIOR_SCHOOL";
type ReportSubject = { id: string; code: string; name: string; synthetic?: boolean; componentIds?: string[] };

const text = (v: unknown, fallback = "—") => v == null || v === "" ? fallback : String(v);
const ADMINS = ["SUPER_ADMIN", "ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI"];
const input = "min-h-11 rounded-xl border border-[#D7E5DC] bg-white px-3 py-2.5 text-sm font-semibold text-[#17352A] outline-none transition focus:border-[#D7A52A] focus:ring-2 focus:ring-[#D7A52A]/20";
const normalize = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const fmt = (v: number | null) => v == null || !Number.isFinite(v) ? "—" : Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, "");
const pct = (score: unknown, max: unknown) => { const s = num(score), m = num(max); return s != null && m != null && m > 0 ? s / m * 100 : null; };
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

const isEnglish = (s: Row) => /\b(ENGLISH|ENG)\b/.test(normalize(`${s.code} ${s.name}`));
const isKiswahili = (s: Row) => /\b(KISWAHILI|KIS|KSW)\b/.test(normalize(`${s.code} ${s.name}`));
const isMath = (s: Row) => /\b(MATHEMATICS|MATH|MAT)\b/.test(normalize(`${s.code} ${s.name}`));
const isIntScience = (s: Row) => /\b(INTEGRATED SCIENCE|SCIENCE TECHNOLOGY|SCI)\b/.test(normalize(`${s.code} ${s.name}`));
const isAgriculture = (s: Row) => /\b(AGRICULTURE|AGR)\b/.test(normalize(`${s.code} ${s.name}`));
const isHomeScience = (s: Row) => /\b(HOME SCIENCE|HSC)\b/.test(normalize(`${s.code} ${s.name}`));
const isICT = (s: Row) => /\b(ICT|INFORMATION COMMUNICATION TECHNOLOGY|COMPUTER)\b/.test(normalize(`${s.code} ${s.name}`));
const isCAS = (s: Row) => /\b(CREATIVE ARTS|ART|MUSIC|MUS|PHYSICAL EDUCATION|PE)\b/.test(normalize(`${s.code} ${s.name}`));
const isCASComposite = (s: Row) => /\b(CREATIVE ARTS.*SPORT|CAS)\b/.test(normalize(`${s.code} ${s.name}`));
const isIntegratedComposite = (s: Row) => /\b(INTEGRATED SCIENCE)\b/.test(normalize(`${s.code} ${s.name}`));
const isSST = (s: Row) => /\b(SOCIAL STUDIES|SST)\b/.test(normalize(`${s.code} ${s.name}`));
const isReligious = (s: Row) => /\b(RELIGIOUS EDUCATION|RELIGION|CRE|IRE|HRE|RE)\b/.test(normalize(`${s.code} ${s.name}`));
const isPreTech = (s: Row) => /\b(PRE TECHNICAL|PRE TECH|PRE CAREER|PRE)\b/.test(normalize(`${s.code} ${s.name}`));

const codeOf = (s: Row) => {
  if (isEnglish(s)) return "ENG";
  if (isKiswahili(s)) return "KIS";
  if (isMath(s)) return "MATH";
  if (isIntScience(s)) return "INT SCI";
  if (isSST(s)) return "SST";
  if (isCASComposite(s)) return "CAS";
  if (isAgriculture(s)) return "AGR";
  if (isHomeScience(s)) return "HSC";
  if (isICT(s)) return "ICT";
  if (isReligious(s)) return "RE";
  if (isPreTech(s)) return "PRE TECH";
  if (/\b(MUSIC|MUS)\b/.test(normalize(`${s.code} ${s.name}`))) return "MUS";
  if (/\b(PHYSICAL EDUCATION|PE)\b/.test(normalize(`${s.code} ${s.name}`))) return "PE";
  if (/\b(CREATIVE ARTS|ART)\b/.test(normalize(`${s.code} ${s.name}`))) return "ART";
  return String(s.code ?? s.name ?? "SUBJ").toUpperCase().slice(0, 8);
};
const priority: Record<string, number> = { ENG: 10, KIS: 20, MATH: 30, "ENV ACT": 35, "CRE ACT": 36, "INT SCI": 40, SST: 50, CRE: 60, RE: 60, CAS: 70, AGR: 80, "AGR NUT": 80, "PRE TECH": 90, HSC: 100, ICT: 110, MUS: 120, PE: 130, ART: 140 };
const sortSubjects = (xs: ReportSubject[]) => [...xs].sort((a, b) => (priority[a.code] ?? 999) - (priority[b.code] ?? 999) || a.code.localeCompare(b.code));

const latestRows = (rows: Row[], subjectId: string) => rows.filter(r => String(r.subject_id) === String(subjectId));
const latestPercentage = (rows: Row[], subjectId: string) => {
  const values = latestRows(rows, subjectId).map(r => pct(r.score, r.maximum_score)).filter((v): v is number => v != null);
  return values.length ? values[values.length - 1] : null;
};
const latestRaw = (rows: Row[], subjectId: string) => {
  const values = latestRows(rows, subjectId).map(r => num(r.score)).filter((v): v is number => v != null);
  return values.length ? values[values.length - 1] : null;
};
const latestMax = (rows: Row[], subjectId: string) => {
  const values = latestRows(rows, subjectId).map(r => num(r.maximum_score)).filter((v): v is number => v != null && v > 0);
  return values.length ? values[values.length - 1] : null;
};
const avg = (values: (number | null)[]) => { const a = values.filter((v): v is number => v != null); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; };

export default function ReportCardsDirectory() {
  const { user, profile } = useSchoolAuth();
  const admin = ADMINS.includes(profile?.role ?? "");
  const [students, setStudents] = useState<Row[]>([]), [years, setYears] = useState<Row[]>([]), [terms, setTerms] = useState<Row[]>([]);
  const [studentId, setStudentId] = useState(""), [yearId, setYearId] = useState(""), [termId, setTermId] = useState(""), [mode, setMode] = useState<"term" | "annual">("term");
  const [classRow, setClassRow] = useState<Row|null>(null), [subjects, setSubjects] = useState<Row[]>([]), [results, setResults] = useState<Row[]>([]), [attendance, setAttendance] = useState<Row[]>([]), [report, setReport] = useState<Row|null>(null), [items, setItems] = useState<Row[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [pdfBusy, setPdfBusy] = useState(false), [message, setMessage] = useState<string|null>(null);

  useEffect(() => { void (async()=>{ if(!user) return; try { const db=getSupabase(); const [s,y,t]=await Promise.all([
    db.from("students").select("id,admission_number,first_name,middle_name,last_name,status").eq("status","ACTIVE").order("first_name").order("last_name"),
    db.from("academic_years").select("id,name,starts_on,ends_on,is_current,status").eq("status","ACTIVE").order("starts_on",{ascending:false}),
    db.from("terms").select("id,academic_year_id,name,starts_on,ends_on,is_current,status").eq("status","ACTIVE").order("starts_on",{ascending:false})
  ]); for(const q of [s,y,t]) if(q.error) throw q.error; setStudents(s.data??[]);setYears(y.data??[]);setTerms(t.data??[]);setYearId(String(y.data?.find((x:any)=>x.is_current)?.id??y.data?.[0]?.id??"")); } catch(e){ setMessage(e instanceof Error?e.message:"Report-card workspace could not be loaded."); } finally{setLoading(false);} })(); },[user]);

  const visibleTerms = useMemo(()=>terms.filter(t=>!yearId||String(t.academic_year_id)===yearId),[terms,yearId]);
  const selected = students.find(s=>String(s.id)===studentId), selectedTerm=terms.find(t=>String(t.id)===termId), selectedYear=years.find(y=>String(y.id)===yearId);
  const fullName = selected ? learnerName(selected) : "";
  const reset = () => { setReport(null);setItems([]);setResults([]);setAttendance([]);setSubjects([]);setClassRow(null);setMessage(null); };

  const generate = async () => {
    if (!studentId || !yearId || (mode === "term" && !termId)) { setMessage(mode === "term" ? "Select learner, academic year and term first." : "Select learner and academic year first."); return; }
    setBusy(true); reset();
    try {
      const db=getSupabase();
      const en=await db.from("enrollments").select("class_id").eq("student_id",studentId).eq("academic_year_id",yearId).eq("status","ACTIVE").order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(en.error) throw en.error;
      const classId=en.data?.class_id;
      if(!classId) throw new Error("This learner is not enrolled in an active class for the selected academic year.");
      const [cls,sub,a]=await Promise.all([
        db.from("classes").select("id,academic_year_id,code,name,level,status").eq("id",classId).maybeSingle(),
        db.from("class_subjects").select("subject_id,subjects(id,name,code,status)").eq("class_id",classId),
        db.from("attendance_records").select("id,status,attendance_sessions!inner(class_id,session_date)").eq("student_id",studentId)
      ]);
      for(const q of [cls,sub,a]) if(q.error) throw q.error;
      setClassRow(cls.data??null); setSubjects((sub.data??[]).map((x:any)=>x.subjects).filter(Boolean)); setAttendance(a.data??[]);
      const subjectIds=(sub.data??[]).map((x:any)=>String(x.subject_id));
      const ex=mode === "term" ? await db.from("exam_results").select("id,exam_id,subject_id,score,maximum_score,grade,teacher_comment,exams!inner(id,term_id,class_id,name,exam_type,starts_on,ends_on,status),subjects(id,name,code)").eq("student_id",studentId).eq("exams.term_id",termId).eq("exams.class_id",classId).eq("exams.status","PUBLISHED").in("subject_id",subjectIds) : await (async()=>{const termIds=terms.filter(t=>String(t.academic_year_id)===yearId).map(t=>t.id);return termIds.length?db.from("exam_results").select("id,exam_id,subject_id,score,maximum_score,grade,teacher_comment,exams!inner(id,term_id,class_id,name,exam_type,starts_on,ends_on,status),subjects(id,name,code)").eq("student_id",studentId).in("exams.term_id",termIds).eq("exams.class_id",classId).eq("exams.status","PUBLISHED").in("subject_id",subjectIds):{data:[],error:null} as any;})();
      if(ex.error) throw ex.error;
      setResults(ex.data??[]);
      const existing=mode === "term" ? await db.from("report_cards").select("id,student_id,term_id,class_id,attendance_percentage,average_score,teacher_remark,headteacher_remark,generated_at").eq("student_id",studentId).eq("term_id",termId).maybeSingle() : {data:null,error:null} as any;
      if(existing.error) throw existing.error;
      if(existing.data){ setReport(existing.data); const ri=await db.from("report_card_items").select("id,report_card_id,subject_id,score,maximum_score,grade,subjects(id,name,code)").eq("report_card_id",existing.data.id); if(ri.error) throw ri.error; setItems(ri.data??[]); }
      if(admin && mode === "term" && (ex.data??[]).length){
        const by=new Map<string,Row[]>(); for(const r of ex.data??[]){const k=String(r.subject_id);by.set(k,[...(by.get(k)??[]),r]);}
        const itemRows=[...by.entries()].map(([subject_id,rs])=>({subject_id,score:rs.reduce((n,x)=>n+Number(x.score??0),0),maximum_score:rs.reduce((n,x)=>n+Number(x.maximum_score??0),0)||100,grade:rs.map(x=>x.grade).find(Boolean)??null}));
        const total=itemRows.reduce((n,x)=>n+Number(x.score),0), max=itemRows.reduce((n,x)=>n+Number(x.maximum_score),0);
        const present=(a.data??[]).filter((x:any)=>["PRESENT","LATE","Present","Late"].includes(String(x.status))).length, att=(a.data??[]).length?present/(a.data??[]).length*100:null;
        const rc=await db.from("report_cards").upsert({student_id:studentId,term_id:termId,class_id:classId,attendance_percentage:att,average_score:max?total/max*100:null,generated_by:user?.id??null,generated_at:new Date().toISOString()},{onConflict:"student_id,term_id"}).select("id,student_id,term_id,class_id,attendance_percentage,average_score,teacher_remark,headteacher_remark,generated_at").single();
        if(rc.error) throw rc.error;
        const ir=await db.from("report_card_items").upsert(itemRows.map(x=>({...x,report_card_id:rc.data.id})),{onConflict:"report_card_id,subject_id"}); if(ir.error) throw ir.error;
        setReport(rc.data);setItems(itemRows);setMessage("Term report generated successfully.");
      } else setMessage(existing.data?"Showing the saved report card.":(ex.data??[]).length?"Report prepared from published assessment results.":"Report opened. No published assessment results are available yet.");
    } catch(e){ setMessage(e instanceof Error?e.message:"The report could not be generated."); }
    finally{setBusy(false);}
  };

  const band=bandFromClass(classRow), grade=gradeFromClass(classRow);
  const displaySubjects=useMemo<ReportSubject[]>(()=>{
    const source=subjects as Row[];
    if(band === "LOWER_PRIMARY"){
      const wanted=[
        ["ENG",isEnglish],["KIS",isKiswahili],["MATH",isMath],["ENV ACT",(s:Row)=>/ENVIRONMENTAL ACTIVITIES|ENV ACT|ENVIRONMENTAL/.test(normalize(`${s.code} ${s.name}`))],["CRE ACT",(s:Row)=>/CREATIVE ACTIVITIES|CRE ACT/.test(normalize(`${s.code} ${s.name}`))],["RE",isReligious]
      ] as Array<[string,(s:Row)=>boolean]>;
      return sortSubjects(wanted.map(([code,test])=>{const s=source.find(test);return s?{...s,code}:{id:`__${code.replace(/\s+/g,"_")}__`,code,name:code,synthetic:true};}).filter(Boolean) as ReportSubject[]).slice(0,6);
    }
    if(band === "UPPER_PRIMARY"){
      const out:ReportSubject[]=[];
      const add=(code:string,pred:(s:Row)=>boolean)=>{const s=source.find(pred);if(s)out.push({...s,code});};
      add("ENG",isEnglish);add("KIS",isKiswahili);add("MATH",isMath);
      const integrated=source.filter(s=>isAgriculture(s)||isHomeScience(s)||isICT(s));
      if(integrated.length) out.push({id:"__int_sci__",code:"INT SCI",name:"Integrated Science",synthetic:true,componentIds:integrated.map(s=>s.id)}); else add("INT SCI",isIntScience);
      add("SST",isSST);add("CRE",isReligious);
      const cas=source.filter(isCAS);
      if(cas.length)out.push({id:"__cas__",code:"CAS",name:"Creative Arts & Sports",synthetic:true,componentIds:cas.map(s=>s.id)}); else add("CAS",isCASComposite);
      return sortSubjects(out);
    }
    const out:ReportSubject[]=[]; for(const code of ["ENG","KIS","MATH","INT SCI","SST","CAS","AGR NUT","RE","PRE TECH"]){
      const preds:Record<string,(s:Row)=>boolean>={ENG:isEnglish,KIS:isKiswahili,MATH:isMath,"INT SCI":isIntScience,SST:isSST,CAS:isCASComposite,"AGR NUT":(s)=>/AGRICULTURE.*NUTRITION|^AGR\b/.test(normalize(`${s.code} ${s.name}`)),RE:isReligious,"PRE TECH":isPreTech};
      const s=source.find(preds[code]); if(s)out.push({...s,code});
    } return out.length?out:sortSubjects(source.slice(0,9).map(s=>({...s,code:codeOf(s)})));
  },[subjects,band]);

  const percentageFor=(r:Row,s:ReportSubject)=>{ if(s.synthetic){const vals=(s.componentIds??[]).map(id=>latestPercentage(results,id));return avg(vals);} return latestPercentage(results,s.id); };
  const markFor=(r:Row,s:ReportSubject)=>{const p=percentageFor(r,s); if(p==null)return "—"; if(s.synthetic)return `${fmt(p)}%`; const raw=latestRaw(results,s.id),max=latestMax(results,s.id); return raw==null?"—":max?`${fmt(raw)}/${fmt(max)}`:`${fmt(p)}%`;};
  const subjectComment=(s:ReportSubject)=>{const rows=s.synthetic?(s.componentIds??[]).flatMap(id=>latestRows(results,id)):latestRows(results,s.id); return rows.map(x=>x.teacher_comment).find(Boolean)??"";};
  const achievementLabel=(s:ReportSubject)=>achievement(percentageFor(selected?{results}:{} as any,s));
  const scoreValues=displaySubjects.map(s=>percentageFor({results},s)).filter((v):v is number=>v!=null);
  const totalPoints=scoreValues.length?scoreValues.reduce((n,v)=>n+(achievement(v)?.points??0),0):null;
  const totalMarks=scoreValues.length?scoreValues.reduce((n,v)=>n+v,0):null;
  const mean=scoreValues.length?(totalMarks??0)/scoreValues.length:null;
  const attPct=attendance.length?attendance.filter((x:any)=>["PRESENT","LATE","Present","Late"].includes(String(x.status))).length/attendance.length*100:report?.attendance_percentage!=null?Number(report.attendance_percentage):null;
  const reportAverage=report?.average_score!=null?Number(report.average_score):mean;

  const makePdf=async()=>{ if(!selected||!displaySubjects.length){setMessage("Generate a learner report before downloading.");return;} setPdfBusy(true); try{ const page=document.querySelector(".report-card-print") as HTMLElement|null; if(!page)throw new Error("Report layout is not ready."); const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"}); const clone=page.cloneNode(true) as HTMLElement; clone.style.width="190mm"; clone.style.background="#fff"; clone.style.position="absolute"; clone.style.left="-99999px"; clone.querySelectorAll(".no-print").forEach(n=>(n as HTMLElement).style.display="none"); document.body.appendChild(clone); await doc.html(clone,{x:10,y:10,width:190,windowWidth:900,autoPaging:"text",margin:[10,10,10,10],callback:d=>{d.save(`${fullName||"Learner"}-${selectedTerm?.name??"Report"}.pdf`.replace(/[^a-z0-9]+/gi,"-"));clone.remove();}}); }catch(e){setMessage(e instanceof Error?e.message:"PDF generation failed.");}finally{setPdfBusy(false);} };

  if(loading)return <PortalLayout role={profile?.role??"TEACHER"}><main className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin"/></main></PortalLayout>;
  return <PortalLayout role={profile?.role??"TEACHER"}><main className="mx-auto w-full max-w-[1500px] space-y-5 px-3 py-4 sm:px-6 lg:px-8">
    <section className="rounded-[1.5rem] border border-[#17352A]/10 bg-white shadow-sm no-print"><div className="bg-[#064A30] px-5 py-6 text-white sm:px-7"><span className="text-xs font-black uppercase tracking-[.16em] text-[#D7A52A]">Reports</span><h1 className="mt-2 font-serif text-3xl font-semibold">Learner Report Cards</h1><p className="mt-2 max-w-3xl text-sm text-white/70">Beautiful CBC report cards generated directly from the learner's published assessment records.</p></div><div className="grid gap-3 p-5 md:grid-cols-4"><label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[#17352A]/65">Learner<select className={input} value={studentId} onChange={e=>{setStudentId(e.target.value);reset();}}><option value="">Select learner</option>{students.map(s=><option key={s.id} value={s.id}>{learnerName(s)} — {s.admission_number}</option>)}</select></label><label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[#17352A]/65">Academic year<select className={input} value={yearId} onChange={e=>{setYearId(e.target.value);setTermId("");reset();}}><option value="">Select year</option>{years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select></label><label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[#17352A]/65">Report type<select className={input} value={mode} onChange={e=>{setMode(e.target.value as any);reset();}}><option value="term">Term report</option><option value="annual">End-of-year</option></select></label>{mode==="term"&&<label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[#17352A]/65">Term<select className={input} value={termId} onChange={e=>{setTermId(e.target.value);reset();}}><option value="">Select term</option>{visibleTerms.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}</div><div className="flex flex-wrap gap-3 px-5 pb-5 sm:px-7"><button type="button" onClick={()=>void generate()} disabled={busy||!studentId||!yearId||(mode==="term"&&!termId)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#064A30] px-5 text-sm font-bold text-white disabled:opacity-50">{busy?<Loader2 size={16} className="animate-spin"/>:<Sparkles size={16}/>} {busy?"Generating…":"Generate report card"}</button><button type="button" onClick={()=>window.print()} disabled={!selected||!displaySubjects.length} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7E5DC] px-5 text-sm font-bold disabled:opacity-40"><Printer size={16}/> Print</button><button type="button" onClick={()=>void makePdf()} disabled={pdfBusy||!selected||!displaySubjects.length} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7E5DC] px-5 text-sm font-bold disabled:opacity-40">{pdfBusy?<Loader2 size={16} className="animate-spin"/>:<FileDown size={16}/>} PDF</button><button type="button" onClick={()=>{reset();setMessage(null);}} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7E5DC] px-5 text-sm font-bold"><RefreshCw size={16}/> Reset</button></div>{message&&<p role="status" className="mx-5 mb-5 rounded-xl bg-[#D7A52A]/10 px-4 py-3 text-sm font-semibold sm:mx-7">{message}</p>}</section>

    {selected&&<section className="report-card-print overflow-hidden rounded-[1.25rem] border border-[#17352A]/10 bg-white shadow-lg">
      <header className="report-hero"><div><div className="report-eyebrow">MENWE PRIMARY &amp; JUNIOR SCHOOL</div><div className="report-contact">P.O. BOX 19, KIONYO, MERU · menwejuniorss23@gmail.com</div><h2>{mode==="annual"?"END-OF-YEAR REPORT CARD":"TERM REPORT CARD"}</h2><p>{text(classRow?.name,"Class")} · {text(selectedTerm?.name,mode==="annual"?"Academic Year":"Term")} · {text(selectedYear?.name,"Academic Year")}</p></div><div className="report-badge"><span>GRADE</span><strong>{grade??"—"}</strong></div></header>
      <div className="report-identity"><div><span>Learner</span><strong>{fullName}</strong></div><div><span>Admission No.</span><strong>{text(selected.admission_number)}</strong></div><div><span>Section</span><strong>{band.replace("_"," ")}</strong></div><div><span>Attendance</span><strong>{attPct==null?"—":`${fmt(attPct)}%`}</strong></div></div>
      <div className="report-body"><section className="report-section"><div className="report-section-head"><span>01</span><div><h3>Academic Performance</h3><p>Learning areas and achievement levels derived from published assessments.</p></div></div><div className="report-table-wrap"><table><thead><tr><th>Learning Area</th><th>Score</th><th>Level</th><th>Achievement</th><th>Teacher Comment</th></tr></thead><tbody>{displaySubjects.map(s=>{const p=percentageFor({results},s),a=achievement(p);return <tr key={s.id}><td><strong>{s.code}</strong><small>{s.name}</small></td><td className="score">{markFor({results},s)}</td><td><span className="level-pill">{a?.code??"—"}</span></td><td>{a?`${a.level}/8 · ${a.remark}`:"—"}</td><td>{subjectComment(s)||"—"}</td></tr>})}</tbody><tfoot><tr><td><strong>PERFORMANCE SUMMARY</strong></td><td className="score">{totalMarks==null?"—":fmt(totalMarks)}</td><td>{totalPoints==null?"—":`${totalPoints} pts`}</td><td colSpan={2}>{reportAverage==null?"—":`Mean ${fmt(reportAverage)}%`}</td></tr></tfoot></table></div></section>
        {mode==="annual"&&<section className="report-section report-annual"><div className="report-section-head"><span>02</span><div><h3>Year-at-a-Glance</h3><p>Annual view of the learner's published assessment profile.</p></div></div><div className="annual-cards"><div><span>Mean Performance</span><strong>{fmt(reportAverage)}%</strong></div><div><span>Attendance</span><strong>{attPct==null?"—":`${fmt(attPct)}%`}</strong></div><div><span>Reportable Areas</span><strong>{displaySubjects.length}</strong></div><div><span>Achievement Points</span><strong>{totalPoints??"—"}</strong></div></div></section>}
        <section className="report-section"><div className="report-section-head"><span>{mode==="annual"?"03":"02"}</span><div><h3>Class Standing &amp; Guidance</h3><p>A clear summary for the learner and family.</p></div></div><div className="summary-grid"><div><span>Overall Mean</span><strong>{reportAverage==null?"—":`${fmt(reportAverage)}%`}</strong></div><div><span>Total Points</span><strong>{totalPoints??"—"}</strong></div><div><span>Attendance</span><strong>{attPct==null?"—":`${fmt(attPct)}%`}</strong></div><div><span>Ranking</span><strong>See class marksheet</strong></div></div></section>
        <section className="report-comment-grid"><div><label>Class Teacher's Remark</label><div className="comment-box">{text(report?.teacher_remark,"Progress is reviewed across learning areas, participation and attendance.")}</div></div><div><label>Headteacher's Remark</label><div className="comment-box">{text(report?.headteacher_remark,"We appreciate the learner's effort and encourage steady improvement and responsible participation.")}</div></div></section>
      </div>
      <footer className="report-footer"><div><span>Class Teacher</span><div className="signature-line"></div><small>Signature &amp; Date</small></div><div className="footer-note"><strong>Achievement scale</strong><small>EE1 90–100 · EE2 75–89 · ME1 58–74 · ME2 41–57 · AE1 31–40 · AE2 21–30 · BE1 11–20 · BE2 0–10</small></div><div><span>Headteacher</span><div className="signature-line"></div><small>Signature &amp; Date</small></div></footer>
    </section>}
  </main></PortalLayout>;
}
