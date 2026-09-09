import { FileText, Loader2, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import "../marksheet-print.css";

type Row = Record<string, any>;
type Subject = { id: string; code: string; name: string; status?: string };
type Band = "LOWER_PRIMARY" | "UPPER_PRIMARY" | "JUNIOR_SCHOOL";
type Achievement = { code: string; level: number; points: number; remark: string };

const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const fmt = (v: number | null) => v == null ? "" : Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, "");
const learnerName = (s: Row) => [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");

function achievementForPercentage(value: number | null): Achievement | null {
  if (value == null || !Number.isFinite(value)) return null;
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
function getGrade(c?: Row) { const raw = `${str(c?.name)} ${str(c?.code)} ${str(c?.level)}`.toUpperCase(); const match = raw.match(/(?:GRADE|CLASS|STD|STANDARD|G)\s*([1-9])\b/); return match ? Number(match[1]) : null; }
function getBand(c?: Row): Band { const n = getGrade(c); if (n && n <= 3) return "LOWER_PRIMARY"; if (n && n <= 6) return "UPPER_PRIMARY"; const raw = `${str(c?.name)} ${str(c?.code)} ${str(c?.level)}`.toUpperCase(); if (/LOWER|PRIMARY 1|PRIMARY 2|PRIMARY 3/.test(raw)) return "LOWER_PRIMARY"; if (/UPPER|PRIMARY 4|PRIMARY 5|PRIMARY 6/.test(raw)) return "UPPER_PRIMARY"; return "JUNIOR_SCHOOL"; }

const upper = (s: Subject) => `${str(s.code)} ${str(s.name)}`.toUpperCase();
const matches = (s: Subject, pattern: RegExp) => pattern.test(upper(s));
const isCasComponent = (s: Subject) => /\b(ART|MUSIC|MUS|PE|PHYSICAL EDUCATION)\b/.test(upper(s));
const isIntegratedScienceComponent = (s: Subject) => /\b(AGR|AGRICULTURE|HSC|HOME\s*SCIENCE|ICT|COMPUTER)\b/.test(upper(s));
const isReligious = (s: Subject) => /\b(CRE|IRE|HRE|RELIGIOUS|RELIGION|RE)\b/.test(upper(s));
const sortSubjects = (items: Subject[]) => [...items].sort((a,b)=>str(a.code).localeCompare(str(b.code))||str(a.name).localeCompare(str(b.name)));
const pickSubject = (subjects: Subject[], pattern: RegExp) => subjects.find(s=>pattern.test(upper(s))) ?? null;

function canonicalLowerSubjects(subjects: Subject[]) {
  const patterns: Array<[RegExp,string]> = [
    [/\b(ENG|ENGLISH)\b/,"ENG"],
    [/\b(KSW|KIS|KISWAHILI)\b/,"KIS"],
    [/\b(MAT|MATH|MATHEMATICS)\b/,"MATH"],
    [/\b(ENV|ENVIRONMENTAL)\b/,"ENV ACT"],
    [/CREATIVE\s*ACTIVIT|\bCRE ACT\b/,"CRE ACT"],
    [/\b(RE|RELIGIOUS|RELIGION|IRE|HRE)\b/,"RE"]
  ];
  const chosen: Subject[]=[];
  for(const [pattern,code] of patterns){ const s=pickSubject(subjects,pattern); if(s&&!chosen.some(x=>str(x.id)===str(s.id))) chosen.push({...s,code}); }
  for(const s of sortSubjects(subjects)){ if(!chosen.some(x=>str(x.id)===str(s.id))) chosen.push({...s,code:subjectCode(s)}); }
  return chosen.slice(0,6);
}

function canonicalJuniorSubjects(subjects: Subject[]) {
  const patterns=[[/\b(ENG|ENGLISH)\b/,"ENG"],[/\b(KSW|KIS|KISWAHILI)\b/,"KIS"],[/\b(MAT|MATH|MATHEMATICS)\b/,"MATH"],[/INTEGRATED\s*SCIENCE|\bSCI\b/,"INT SCI"],[/\b(SST|SOCIAL\s*STUDIES)\b/,"SST"],[/\bAGR|AGRICULTURE\b/,"AGR NUT"],[/CAS|CREATIVE\s*ARTS.*SPORT|CREATIVE\s*ARTS/,"CAS"],[/PRE|PRE-?TECH|PRE-?CAREER/,"PRE TECH"],[/\b(CRE|IRE|HRE|RELIGIOUS|RELIGION|RE)\b/,"RE"]] as Array<[RegExp,string]>;
  const chosen: Subject[]=[];
  for(const [p,code] of patterns){const s=pickSubject(subjects,p);if(s&&!chosen.some(x=>str(x.id)===str(s.id)))chosen.push({...s,code});}
  for(const s of sortSubjects(subjects)){if(isReligious(s)&&chosen.some(isReligious))continue;if(!chosen.some(x=>str(x.id)===str(s.id)))chosen.push({...s,code:subjectCode(s)});if(chosen.length===9)break;}
  return chosen.slice(0,9);
}

const subjectCode=(s:Subject)=>{
  if(matches(s,/ENGLISH|\bENG\b/))return"ENG";
  if(matches(s,/KISWAHILI|\bKIS\b|\bKSW\b/))return"KIS";
  if(matches(s,/MATHEMATICS|\bMATH?\b|\bMAT\b/))return"MATH";
  if(matches(s,/INTEGRATED\s*SCIENCE|SCIENCE\s*TECHNOLOGY|\bSCI\b/))return"INT SCI";
  if(matches(s,/SOCIAL\s*STUDIES|\bSST\b/))return"SST";
  if(matches(s,/CREATIVE\s*ARTS.*SPORT|\bCAS\b/))return"CAS";
  if(matches(s,/AGRICULTURE.*NUTRITION|AGRICULTURE|\bAGR\b/))return"AGR NUT";
  if(matches(s,/RELIGIOUS|RELIGION|\bIRE\b|\bHRE\b|\bCRE\b|\bRE\b/))return"RE";
  if(matches(s,/PRE-?TECH|PRE-?CAREER|\bPRE\b/))return"PRE TECH";
  if(matches(s,/HOME\s*SCIENCE|^HSC\b/))return"HSC";
  if(matches(s,/INFORMATION.*COMMUNICATION TECHNOLOGY|^ICT\b/))return"ICT";
  if(matches(s,/MUSIC|\bMUS\b/))return"MUS";
  if(matches(s,/PHYSICAL EDUCATION|\bPE\b/))return"PE";
  if(matches(s,/CREATIVE\s*ARTS|\bART\b/))return"ART";
  return str(s.code).trim().toUpperCase().slice(0,8)||"SUBJ";
};

const resultsFor=(row:Row,subjectId:string)=>(row.results??[]).filter((r:Row)=>str(r.subject_id)===str(subjectId));
function latestPercentage(row:Row,subjectId:string){const values=resultsFor(row,subjectId).map((r:Row)=>{const score=num(r.score),max=num(r.maximum_score);return score!=null&&max!=null&&max>0?(score/max)*100:null;}).filter((v):v is number=>v!=null);return values.length?values[values.length-1]:null;}
function latestRaw(row:Row,subjectId:string){const values=resultsFor(row,subjectId).map((r:Row)=>num(r.score)).filter((v):v is number=>v!=null);return values.length?values[values.length-1]:null;}
function latestMax(row:Row,subjectId:string){const values=resultsFor(row,subjectId).map((r:Row)=>num(r.maximum_score)).filter((v):v is number=>v!=null&&v>0);return values.length?values[values.length-1]:100;}
function componentComposite(row:Row,subjects:Subject[],predicate:(s:Subject)=>boolean){const components=subjects.filter(predicate);const pairs=components.map(s=>{const score=latestRaw(row,s.id),max=latestMax(row,s.id);return score!=null&&max>0?{score,max}:null;}).filter((v):v is {score:number,max:number}=>v!=null);if(!pairs.length)return null;const score=pairs.reduce((a,b)=>a+b.score,0),max=pairs.reduce((a,b)=>a+b.max,0);return max>0?{score,max,percentage:(score/max)*100}:null;}

export default function ClassMarksheetV2(){
  const {user,profile}=useSchoolAuth(); const admin=["SUPER_ADMIN","ADMIN","HEAD_OF_INSTITUTION","DEPUTY_HOI"].includes(profile?.role??"");
  const [years,setYears]=useState<Row[]>([]),[terms,setTerms]=useState<Row[]>([]),[classes,setClasses]=useState<Row[]>([]),[allSubjects,setAllSubjects]=useState<Subject[]>([]),[subjects,setSubjects]=useState<Subject[]>([]),[rows,setRows]=useState<Row[]>([]);
  const [yearId,setYearId]=useState(""),[termId,setTermId]=useState(""),[classId,setClassId]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState("");

  useEffect(()=>{void(async()=>{if(!user)return;try{const db=getSupabase();const[y,t,c,s]=await Promise.all([db.from("academic_years").select("id,name,is_current,status").eq("status","ACTIVE").order("starts_on",{ascending:false}),db.from("terms").select("id,academic_year_id,name,is_current,status").eq("status","ACTIVE").order("starts_on",{ascending:false}),db.from("classes").select("id,academic_year_id,code,name,level,status").eq("status","ACTIVE").order("name"),db.from("subjects").select("id,code,name,status").eq("status","ACTIVE")]);for(const q of[y,t,c,s])if(q.error)throw q.error;setYears(y.data??[]);setTerms(t.data??[]);setClasses(c.data??[]);setAllSubjects((s.data??[])as Subject[]);setYearId(str(y.data?.find(x=>x.is_current)?.id??y.data?.[0]?.id??""));}catch(e){setMessage(e instanceof Error?e.message:"Marksheet setup could not be loaded.");}finally{setLoading(false);}})();},[user]);
  const visibleTerms=useMemo(()=>terms.filter(t=>!yearId||str(t.academic_year_id)===yearId),[terms,yearId]);
  const visibleClasses=useMemo(()=>classes.filter(c=>!yearId||str(c.academic_year_id)===yearId),[classes,yearId]);
  const selectedClass=classes.find(c=>str(c.id)===classId),selectedTerm=terms.find(t=>str(t.id)===termId),band=getBand(selectedClass);
  const bandTitle=band==="LOWER_PRIMARY"?"LOWER PRIMARY ASSESSMENT MARKSHEET":band==="UPPER_PRIMARY"?"UPPER PRIMARY ASSESSMENT MARKSHEET":"JUNIOR SCHOOL PERFORMANCE MARKSHEET";
  const rankingLabel=band==="JUNIOR_SCHOOL"?"RANKING: TOTAL POINTS":"RANKING: TOTAL MARKS";

  const loadSubjectsForClass=async(cid:string)=>{const q=await getSupabase().from("class_subjects").select("subject_id").eq("class_id",cid);if(q.error){setSubjects(sortSubjects(allSubjects));return;}const ids=[...new Set((q.data??[]).map(x=>str(x.subject_id)))];setSubjects(sortSubjects(ids.length?allSubjects.filter(s=>ids.includes(str(s.id))):allSubjects));};
  useEffect(()=>{setRows([]);setSubjects([]);setMessage("");if(classId&&allSubjects.length)void loadSubjectsForClass(classId);},[classId,allSubjects]);

  const generate=async()=>{if(!classId||!yearId||!termId){setMessage("Select academic year, term and class first.");return;}setBusy(true);setMessage("");try{const db=getSupabase();if(!admin){const tr=await db.from("teachers").select("id").eq("profile_id",user?.id??"").maybeSingle();if(tr.error)throw tr.error;if(!tr.data)throw new Error("Your teacher record is not linked yet.");const ta=await db.from("teacher_assignments").select("class_id").eq("teacher_id",tr.data.id).eq("class_id",classId);if(ta.error)throw ta.error;if(!(ta.data??[]).length)throw new Error("You are not assigned to this class.");}const mapping=await db.from("class_subjects").select("subject_id").eq("class_id",classId);if(mapping.error)throw mapping.error;const ids=[...new Set((mapping.data??[]).map(x=>str(x.subject_id)))];const selectedSubjects=sortSubjects(ids.length?allSubjects.filter(s=>ids.includes(str(s.id))):subjects);setSubjects(selectedSubjects);const en=await db.from("enrollments").select("student_id").eq("class_id",classId).eq("academic_year_id",yearId).eq("status","ACTIVE");if(en.error)throw en.error;let enrollmentRows=en.data??[];if(!enrollmentRows.length){const fallback=await db.from("enrollments").select("student_id").eq("class_id",classId).eq("status","ACTIVE");if(fallback.error)throw fallback.error;enrollmentRows=fallback.data??[];}const studentIds=[...new Set(enrollmentRows.map(x=>str(x.student_id)))];if(!studentIds.length){setRows([]);setMessage("No active learners are enrolled in this class.");return;}const subjectIds=selectedSubjects.map(s=>str(s.id)).filter(Boolean);const[st,rr]=await Promise.all([db.from("students").select("id,admission_number,first_name,middle_name,last_name,gender").in("id",studentIds).order("first_name").order("last_name"),subjectIds.length?db.from("exam_results").select("student_id,subject_id,score,maximum_score,grade,subjects(id,code,name),exams!inner(id,term_id,class_id,name,exam_type)").eq("exams.term_id",termId).eq("exams.class_id",classId).in("student_id",studentIds).in("subject_id",subjectIds):Promise.resolve({data:[],error:null}as any)]);if(st.error)throw st.error;if(rr.error)throw rr.error;const results=rr.data??[];setRows((st.data??[]).map((s:Row)=>({...s,results:results.filter((r:Row)=>str(r.student_id)===str(s.id))})));if(!results.length)setMessage("Learners loaded. No persisted assessment results exist for this class and term yet.");}catch(e){setRows([]);setMessage(e instanceof Error?e.message:"The marksheet could not be generated.");}finally{setBusy(false);}};

  const displaySubjects=useMemo(()=>{
    if(band==="LOWER_PRIMARY") return canonicalLowerSubjects(subjects);
    if(band==="JUNIOR_SCHOOL") return canonicalJuniorSubjects(subjects);
    const directIntegrated=pickSubject(subjects,/INTEGRATED\s*SCIENCE|\bINT\.?\s*SCI\b/),directCas=pickSubject(subjects,/CREATIVE\s*ARTS.*SPORT|\bCAS\b/);
    const science=subjects.filter(isIntegratedScienceComponent),cas=subjects.filter(isCasComponent);
    const normal=subjects.filter(s=>!isIntegratedScienceComponent(s)&&!isCasComponent(s)&&!matches(s,/INTEGRATED\s*SCIENCE|\bINT\.?\s*SCI\b|CREATIVE\s*ARTS.*SPORT|\bCAS\b/));
    const preferred=["ENG","KIS","MATH","SST","RE"];
    const out:Subject[]=[];
    for(const code of preferred){const s=normal.find(x=>subjectCode(x)===code);if(s&&!out.some(x=>str(x.id)===str(s.id)))out.push({...s,code});}
    if(science.length)out.push({id:"__int_sci__",code:"INT SCI",name:"Integrated Science"});else if(directIntegrated)out.push({...directIntegrated,code:"INT SCI"});
    if(cas.length)out.push({id:"__cas__",code:"CAS",name:"Creative Arts & Sports"});else if(directCas)out.push({...directCas,code:"CAS"});
    for(const s of sortSubjects(normal)){if(!out.some(x=>str(x.id)===str(s.id)))out.push({...s,code:subjectCode(s)});}
    return out.filter((s,i,a)=>a.findIndex(x=>str(x.id)===str(s.id))===i).slice(0,7);
  },[subjects,band]);

  const percentageFor=(row:Row,s:Subject)=>{const code=str(s.code).toUpperCase();if(code==="CAS"){const c=componentComposite(row,subjects,isCasComponent);return c?.percentage??null;}if(code==="INT SCI"){const c=componentComposite(row,subjects,isIntegratedScienceComponent);return c?.percentage??null;}return latestPercentage(row,s.id);};
  const scoreFor=(row:Row,s:Subject)=>percentageFor(row,s);
  const stats=(row:Row)=>{const scores=displaySubjects.map(s=>scoreFor(row,s)).filter((v):v is number=>v!=null);const totalMarks=scores.length?scores.reduce((a,b)=>a+b,0):null;const totalPoints=scores.length?scores.reduce((a,b)=>a+(achievementForPercentage(b)?.points??0),0):null;const mean=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null;return{totalMarks,totalPoints,mean};};
  const rankedRows=useMemo(()=>{const mapped=rows.map(row=>({row,...stats(row)}));const ordered=[...mapped].sort((a,b)=>{const av=band==="JUNIOR_SCHOOL"?(a.totalPoints??-1):(a.totalMarks??-1),bv=band==="JUNIOR_SCHOOL"?(b.totalPoints??-1):(b.totalMarks??-1);return bv-av||learnerName(a.row).localeCompare(learnerName(b.row));});let previous:number|null=null,prevRank=0;const rankMap=new Map<string,number>();ordered.forEach((x,i)=>{const value=band==="JUNIOR_SCHOOL"?x.totalPoints:x.totalMarks;const rank=value===previous?prevRank:i+1;rankMap.set(str(x.row.id),rank);previous=value;prevRank=rank;});return mapped.map(x=>({...x,rank:rankMap.get(str(x.row.id))??null}));},[rows,displaySubjects,band]);
  const subjectTotal=(s:Subject)=>rows.reduce((sum,row)=>sum+(scoreFor(row,s)??0),0);const subjectMean=(s:Subject)=>{const vals=rows.map(row=>scoreFor(row,s)).filter((v):v is number=>v!=null);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;};

  if(loading)return <PortalLayout role={profile?.role??"TEACHER"}><main className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin"/></main></PortalLayout>;
  return <PortalLayout role={profile?.role??"TEACHER"}><main className="mx-auto w-full max-w-[1900px] space-y-5 px-3 py-4 sm:px-6 lg:px-8"><section className="rounded-[1.5rem] border border-[var(--ink)]/10 bg-white shadow-sm print-hide"><div className="bg-[var(--ink)] px-5 py-6 text-white sm:px-7"><span className="text-xs font-black uppercase tracking-[.16em] text-[var(--gold)]">Class marksheet</span><h1 className="mt-2 font-serif text-3xl font-semibold">CBC assessment marksheet</h1><p className="mt-2 max-w-3xl text-sm text-white/65">Scores are shown as marks only; achievement levels and points are calculated automatically.</p></div><div className="grid gap-3 p-5 md:grid-cols-3"><label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink)]/60">Academic year<select value={yearId} onChange={e=>{setYearId(e.target.value);setTermId("");setClassId("");setRows([])}} className="min-h-11 rounded-xl border border-[var(--ink)]/15 bg-white px-3 text-sm font-semibold normal-case"><option value="">Select year</option>{years.map(y=><option key={str(y.id)} value={str(y.id)}>{str(y.name)}</option>)}</select></label><label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink)]/60">Term<select value={termId} onChange={e=>{setTermId(e.target.value);setRows([])}} className="min-h-11 rounded-xl border border-[var(--ink)]/15 bg-white px-3 text-sm font-semibold normal-case"><option value="">Select term</option>{visibleTerms.map(t=><option key={str(t.id)} value={str(t.id)}>{str(t.name)}</option>)}</select></label><label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink)]/60">Class<select value={classId} onChange={e=>setClassId(e.target.value)} className="min-h-11 rounded-xl border border-[var(--ink)]/15 bg-white px-3 text-sm font-semibold normal-case"><option value="">Select class</option>{visibleClasses.map(c=><option key={str(c.id)} value={str(c.id)}>{str(c.name||c.code)}</option>)}</select></label></div><div className="flex flex-wrap items-center gap-3 border-t border-[var(--ink)]/10 px-5 py-4 sm:px-7"><button type="button" onClick={()=>void generate()} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--ink)] px-5 text-sm font-black text-white disabled:opacity-60">{busy?<Loader2 className="size-4 animate-spin"/>:<FileText className="size-4"/>}Generate marksheet</button><button type="button" onClick={()=>window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--ink)]/15 bg-white px-5 text-sm font-black"><Printer className="size-4"/>Print / PDF</button><span className="text-xs font-semibold text-[var(--ink)]/55">{rankingLabel}</span></div>{message&&<div className="border-t border-[var(--ink)]/10 px-5 py-3 text-sm font-semibold text-amber-700 sm:px-7">{message}</div>}</section>
  {rows.length>0&&<section className="marksheet-sheet overflow-hidden rounded-[1.5rem] border border-[var(--ink)]/10 bg-white shadow-sm"><header className="border-b border-[var(--ink)]/10 px-5 py-5 sm:px-7"><h2 className="text-xl font-black uppercase tracking-wide">MENWE PRIMARY &amp; JUNIOR SCHOOL</h2><p className="mt-1 text-xs font-semibold text-[var(--ink)]/60">P.O. BOX 19, KIONYO, MERU · menwejuniorss23@gmail.com</p><div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-lg font-black uppercase">{bandTitle}</h3><p className="text-sm font-semibold">{str(selectedClass?.name||selectedClass?.code)} · {str(selectedTerm?.name)} · {str(years.find(y=>str(y.id)===yearId)?.name)}</p></div><div className="text-right text-xs font-black uppercase tracking-wide text-[var(--ink)]/55">{rankingLabel}</div></div></header><div className="marksheet-table-wrap overflow-x-auto"><table className="marksheet-table w-full border-collapse"><colgroup><col className="col-no"/><col className="col-adm"/><col className="col-learner"/>{displaySubjects.flatMap(s=>[<col key={`${s.id}-score`} className="col-score"/>,<col key={`${s.id}-level`} className="col-level"/>])}<col className="col-total-marks"/><col className="col-total-points"/><col className="col-rank"/></colgroup><thead><tr><th rowSpan={2}>NO.</th><th rowSpan={2}>ADM.</th><th rowSpan={2} className="name-column">LEARNER</th>{displaySubjects.map(s=><th key={s.id} colSpan={2} className="subject-group">{str(s.code)}</th>)}<th rowSpan={2}>TOTAL<br/>MARKS</th><th rowSpan={2}>TOTAL<br/>POINTS</th><th rowSpan={2}>RANK</th></tr><tr>{displaySubjects.flatMap(s=>[<th key={`${s.id}-score`}>SCORE</th>,<th key={`${s.id}-level`}>LEVEL</th>])}</tr></thead><tbody>{rankedRows.map((item,index)=><tr key={str(item.row.id)}><td>{index+1}</td><td>{str(item.row.admission_number)}</td><td className="name-column">{learnerName(item.row)}</td>{displaySubjects.flatMap(s=>{const score=scoreFor(item.row,s),achievement=achievementForPercentage(score);return [<td key={`${s.id}-score`} className="score-cell">{fmt(score)}</td>,<td key={`${s.id}-level`} className="level-cell">{achievement?`${achievement.code} · ${achievement.level}`:""}</td>];})}<td className="total-cell">{fmt(item.totalMarks)}</td><td className="total-cell">{item.totalPoints==null?"":String(item.totalPoints)}</td><td className="rank-cell">{item.rank==null?"":String(item.rank)}</td></tr>)}</tbody><tfoot><tr><th colSpan={3}>TOTAL MARKS</th>{displaySubjects.map(s=><th key={`${s.id}-total`} colSpan={2}>{fmt(subjectTotal(s))}</th>)}<th>{fmt(rankedRows.reduce((sum,r)=>sum+(r.totalMarks??0),0)||null)}</th><th>{rankedRows.reduce((sum,r)=>sum+(r.totalPoints??0),0)||""}</th><th>—</th></tr><tr><th colSpan={3}>MEAN</th>{displaySubjects.map(s=><th key={`${s.id}-mean`} colSpan={2}>{fmt(subjectMean(s))}</th>)}<th>{fmt(rows.length?rankedRows.reduce((sum,r)=>sum+(r.totalMarks??0),0)/rows.length:null)}</th><th>{fmt(rows.length?rankedRows.reduce((sum,r)=>sum+(r.totalPoints??0),0)/rows.length:null)}</th><th>—</th></tr></tfoot></table></div></section>}</main></PortalLayout>;
}
