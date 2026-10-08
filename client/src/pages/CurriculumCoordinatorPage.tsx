import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { BookOpenCheck, ClipboardCheck, FileText, GraduationCap, LibraryBig, Users, ArrowRight, ShieldCheck } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";

type Scope="PRIMARY"|"JUNIOR";

const scopeLabel=(scope:Scope)=>scope==="JUNIOR"?"Junior School":"Primary School";

export default function CurriculumCoordinatorPage(){
 const {profile}=useSchoolAuth();
 const [,go]=useLocation();
 const [scope,setScope]=useState<Scope|null>(null);
 const [loading,setLoading]=useState(true);
 const [learnerCount,setLearnerCount]=useState<number|null>(null);

 useEffect(()=>{
  let cancelled=false;
  const load=async()=>{
   if(!profile?.email){setLoading(false);return;}
   const {data:teacher}=await getSupabase().from("teachers").select("id").eq("email",profile.email).maybeSingle();
   if(!teacher){if(!cancelled)setLoading(false);return;}
   const {data:assignment}=await getSupabase().from("curriculum_coordinators").select("scope").eq("teacher_id",teacher.id).eq("active",true).maybeSingle();
   if(cancelled)return;
   if(!assignment){setLoading(false);return;}
   setScope(assignment.scope as Scope);
   setLoading(false);
   const {count}=await getSupabase().from("students").select("id",{count:"exact",head:true});
   if(!cancelled)setLearnerCount(count??null);
  };
  void load();
  return()=>{cancelled=true};
 },[profile?.email]);

 if(loading)return <div className="grid min-h-[calc(100vh-4.5rem)] place-items-center p-6 text-sm text-[var(--ink)]/60">Loading academic coordinator workspace…</div>;
 if(!scope)return <div className="grid min-h-[calc(100vh-4.5rem)] place-items-center p-6"><div className="max-w-md rounded-3xl border border-[var(--ink)]/10 bg-white p-8 text-center shadow-sm"><ShieldCheck className="mx-auto mb-3"/><h1 className="text-xl font-black">Academic access required</h1><p className="mt-2 text-sm text-[var(--ink)]/60">This workspace is only available to an active curriculum coordinator.</p></div></div>;

 const cards=[
  {title:"Academic management",text:"Curriculum structure, learning areas and academic setup.",icon:GraduationCap,href:"/portal/academics"},
  {title:"Exams & assessment",text:"Monitor examinations, marks entry and assessment progress.",icon:FileText,href:"/portal/exams"},
  {title:"Class marksheets",text:"Review class-level marks and assessment summaries.",icon:BookOpenCheck,href:"/portal/class-marksheet"},
  {title:"Learner reports",text:"Review report-card and learner academic reporting.",icon:FileText,href:"/portal/reports"},
  {title:"Attendance",text:"Monitor learner attendance as part of academic follow-up.",icon:ClipboardCheck,href:"/portal/attendance"},
  {title:"Learning resources",text:"Access and review curriculum resources and learning materials.",icon:LibraryBig,href:"/portal/resources"},
 ];
 return <main className="mx-auto max-w-7xl p-5 sm:p-8">
  <section className="rounded-[2rem] bg-[var(--ink)] p-6 text-white shadow-xl sm:p-8">
   <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
    <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[var(--gold)]">Academic leadership</p><h1 className="mt-2 text-3xl font-black tracking-tight">{scopeLabel(scope)} Curriculum Coordinator</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Coordinate academic implementation, assessment, learner progress and curriculum coverage for your school section.</p></div>
    <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Learners</p><p className="mt-1 text-2xl font-black">{learnerCount??"—"}</p></div>
   </div>
  </section>
  <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
   {cards.map(({title,text,icon:Icon,href})=><button key={href} onClick={()=>go(href)} className="group rounded-3xl border border-[var(--ink)]/10 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--gold)]/15 text-[var(--ink)]"><Icon size={20}/></span><ArrowRight size={17} className="text-[var(--ink)]/30 transition group-hover:translate-x-1"/></div><h2 className="mt-5 text-base font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--ink)]/60">{text}</p></button>)}
  </section>
  <section className="mt-6 rounded-3xl border border-[var(--ink)]/10 bg-white p-6"><div className="flex items-center gap-3"><Users size={19}/><div><h2 className="font-black">Coordinator responsibility</h2><p className="text-sm text-[var(--ink)]/60">This workspace gives academic oversight without granting school administration or system-management privileges.</p></div></div></section>
 </main>;
}
