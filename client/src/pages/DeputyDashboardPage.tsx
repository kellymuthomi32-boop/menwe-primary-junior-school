import { AlertTriangle, ArrowUpRight, BarChart3, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, FileText, GraduationCap, Loader2, MessageSquare, RefreshCw, Users, Utensils, ClipboardList } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";
import { PortalLayout } from "@/components/PortalLayout";

type Metric={label:string;value:string|number;detail:string;icon:typeof Users;href:string;warn?:boolean};
const actions=[
 ["Attendance oversight","Review today's learner attendance",ClipboardCheck,"/portal/attendance"],
 ["Marks & exams","Supervise marks entry and exams",GraduationCap,"/portal/marks-management"],
 ["Learner reports","Review generated learner reports",FileText,"/portal/reports"],
 ["Class marksheets","Inspect class performance",BarChart3,"/portal/class-marksheet"],
 ["Teacher duty roster","Check staff duty assignments",ClipboardList,"/portal/duty-roster"],
 ["Food & feeding","Review feeding operations",Utensils,"/portal/food"],
] as const;

export default function DeputyDashboardPage(){
 const {user,profile}=useSchoolAuth(); const [,navigate]=useLocation();
 const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [updated,setUpdated]=useState<Date|null>(null);
 const [data,setData]=useState({learners:0,teachers:0,attendanceRecords:0,attendanceRate:0,marks:0,exams:0,reports:0,openMessages:0,events:0,classes:0});
 const load=useCallback(async()=>{
  if(!user||!profile)return; setLoading(true); setError("");
  try{
   const db=getSupabase();
   const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Nairobi",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
   const y=new Date().getFullYear();
   const [learners,teachers,sessions,records,results,exams,reports,messages,events,classes]=await Promise.all([
    db.from("students").select("id",{count:"exact",head:true}).eq("status","ACTIVE"),
    db.from("teachers").select("id",{count:"exact",head:true}).eq("status","ACTIVE"),
    db.from("attendance_sessions").select("id").eq("session_date",today),
    db.from("attendance_records").select("status,attendance_sessions!inner(session_date)").eq("attendance_sessions.session_date",today),
    db.from("exam_results").select("id",{count:"exact",head:true}),
    db.from("exams").select("id",{count:"exact",head:true}),
    db.from("report_cards").select("id",{count:"exact",head:true}),
    db.from("message_threads").select("id",{count:"exact",head:true}).eq("status","OPEN"),
    db.from("events").select("id",{count:"exact",head:true}).gte("starts_at",`${y}-01-01T00:00:00+03:00`).lte("starts_at",`${y}-12-31T23:59:59+03:00`),
    db.from("classes").select("id",{count:"exact",head:true}).eq("status","ACTIVE"),
   ]);
   const all=[learners,teachers,sessions,records,results,exams,reports,messages,events,classes]; const bad=all.find(r=>r.error); if(bad)throw new Error(bad.error!.message);
   const rec=records.data??[]; const present=rec.filter(r=>["present","late"].includes(String(r.status).toLowerCase())).length;
   setData({learners:learners.count??0,teachers:teachers.count??0,attendanceRecords:rec.length,attendanceRate:rec.length?Math.round(present/rec.length*100):0,marks:results.count??0,exams:exams.count??0,reports:reports.count??0,openMessages:messages.count??0,events:events.count??0,classes:classes.count??0}); setUpdated(new Date());
  }catch(e){setError(e instanceof Error?e.message:"Deputy dashboard data could not be loaded.");}finally{setLoading(false);}
 },[profile,user]);
 useEffect(()=>{void load();},[load]);
 const metrics:Metric[]=[
  {label:"Active learners",value:data.learners,detail:"Learners currently enrolled",icon:Users,href:"/portal/people"},
  {label:"Teaching staff",value:data.teachers,detail:"Active teacher records",icon:GraduationCap,href:"/portal/admin/teachers"},
  {label:"Attendance today",value:data.attendanceRecords?`${data.attendanceRate}%`:"—",detail:data.attendanceRecords?`${data.attendanceRecords} attendance records`:"No register captured yet",icon:ClipboardCheck,href:"/portal/attendance",warn:!data.attendanceRecords},
  {label:"Marks entered",value:data.marks,detail:"Exam result records in the system",icon:BarChart3,href:"/portal/marks-management"},
  {label:"Exams",value:data.exams,detail:"Exam records available",icon:BookOpen,href:"/portal/exams"},
  {label:"Learner reports",value:data.reports,detail:"Report cards generated",icon:FileText,href:"/portal/reports"},
  {label:"Open messages",value:data.openMessages,detail:"Threads needing attention",icon:MessageSquare,href:"/portal/messages",warn:data.openMessages>0},
  {label:"School classes",value:data.classes,detail:"Active classes",icon:Users,href:"/portal/academics"},
 ];
 if(loading)return <PortalLayout role="DEPUTY_HOI"><main className="grid min-h-[60vh] place-items-center"><div className="flex items-center gap-3 text-sm text-[var(--ink)]/60"><Loader2 className="animate-spin text-[var(--gold)]" size={19}/>Loading Deputy Head dashboard…</div></main></PortalLayout>;
 return <PortalLayout role="DEPUTY_HOI"><main className="mx-auto w-full max-w-[1500px] space-y-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
  <header className="menwe-admin-hero relative overflow-hidden rounded-[2.25rem] p-6 text-white shadow-2xl sm:p-9 lg:p-11"><div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><span className="menwe-admin-kicker"><BarChart3 size={14}/> Deputy Head command centre</span><h1 className="mt-5 text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">Good to see you. Here is your school oversight view.</h1><p className="mt-4 max-w-3xl text-[15px] leading-7 text-white/75">Monitor attendance, academic progress, staff operations and learner welfare without exposing top-level system administration.</p><div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white/10 px-3 py-1.5">Deputy Head of Institution</span><span className="rounded-full bg-white/10 px-3 py-1.5">Operational view</span><span className="rounded-full bg-white/10 px-3 py-1.5">{updated?`Updated ${updated.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`:"Live"}</span></div></div><button type="button" onClick={()=>void load()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.06] px-4 text-sm font-bold hover:bg-white/[.12]"><RefreshCw size={17}/> Refresh</button></div></header>
  {error&&<div role="alert" className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"><AlertTriangle size={18}/>{error}</div>}
  <section aria-label="Deputy dashboard metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(m=><button key={m.label} type="button" onClick={()=>navigate(m.href)} className={`menwe-admin-metric rounded-[1.35rem] p-5 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--gold)] ${m.warn?"ring-1 ring-[var(--gold)]/30":""}`}><div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><m.icon size={20}/></span>{m.warn?<span className="rounded-full bg-[var(--gold)]/15 px-2 py-1 text-[10px] font-black uppercase text-[var(--gold)]">Attention</span>:<CheckCircle2 size={18} className="text-emerald-600"/>}</div><p className="mt-5 text-xs font-extrabold uppercase tracking-[.14em] text-[var(--ink)]/45">{m.label}</p><p className="mt-1 text-3xl font-black tracking-tight text-[var(--ink)]">{m.value}</p><p className="mt-1 text-xs text-[var(--ink)]/50">{m.detail}</p></button>)}</section>
  <section className="menwe-card rounded-[1.75rem] p-5 sm:p-6"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--gold)]/15 text-[var(--gold)]"><ArrowUpRight size={17}/></span><div><p className="menwe-premium-label">Supervision tools</p><h2 className="text-lg font-black text-[var(--ink)]">Get to the work that needs your attention</h2></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{actions.map(([label,detail,Icon,href])=><button key={label} type="button" onClick={()=>navigate(href)} className="group flex min-h-[82px] items-center gap-3 rounded-xl border border-[var(--ink)]/8 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--gold)]/40 hover:shadow-md"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><Icon size={18}/></span><span className="min-w-0 flex-1"><b className="block text-sm">{label}</b><span className="mt-0.5 block text-xs text-[var(--ink)]/50">{detail}</span></span><ArrowUpRight size={15} className="text-[var(--ink)]/25 group-hover:text-[var(--gold)]"/></button>)}</div></section>
  <section className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]"><div className="menwe-card rounded-[1.75rem] p-6"><p className="menwe-premium-label">Deputy priorities</p><h2 className="mt-1 text-xl font-black">What this dashboard is designed to help you supervise</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[var(--mist)] p-4"><b className="text-sm">Academic quality</b><p className="mt-1 text-xs leading-5 text-[var(--ink)]/55">Marks, exams, reports and class performance.</p></div><div className="rounded-xl bg-[var(--mist)] p-4"><b className="text-sm">Learner welfare</b><p className="mt-1 text-xs leading-5 text-[var(--ink)]/55">Attendance and day-to-day learner oversight.</p></div><div className="rounded-xl bg-[var(--mist)] p-4"><b className="text-sm">Staff coordination</b><p className="mt-1 text-xs leading-5 text-[var(--ink)]/55">Duty roster, attendance and operational follow-up.</p></div><div className="rounded-xl bg-[var(--mist)] p-4"><b className="text-sm">School operations</b><p className="mt-1 text-xs leading-5 text-[var(--ink)]/55">Feeding, timetable and practical school coordination.</p></div></div></div><div className="menwe-card rounded-[1.75rem] p-6"><p className="menwe-premium-label">At a glance</p><div className="mt-4 space-y-4"><div className="flex items-center justify-between"><span className="text-sm text-[var(--ink)]/60">Events this year</span><b>{data.events}</b></div><div className="flex items-center justify-between"><span className="text-sm text-[var(--ink)]/60">Active classes</span><b>{data.classes}</b></div><div className="flex items-center justify-between"><span className="text-sm text-[var(--ink)]/60">Exam results</span><b>{data.marks}</b></div><div className="rounded-xl bg-[var(--mist)] p-4 text-xs leading-5 text-[var(--ink)]/55">Your dashboard is intentionally focused on supervision rather than system configuration.</div></div></div></section>
 </main></PortalLayout>;
}
