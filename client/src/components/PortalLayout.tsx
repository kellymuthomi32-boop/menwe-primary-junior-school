import { BarChart3, BookOpen, BookOpenCheck, CalendarDays, ChevronLeft, ClipboardCheck, CreditCard, FileText, GraduationCap, Image, LayoutDashboard, LibraryBig, LogOut, Menu, MessageSquare, Settings, ShieldCheck, Users, X, Bell, Megaphone, Clock3, Utensils, ClipboardList, UserPlus, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { isAdministrator, type AppRole, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";
import NotificationBell from "./NotificationBell";
import "@/portal-theme.css";
import "@/portal-polish.css";

type PortalNavItem={label:string;key:string;icon:LucideIcon;href:string;badge?:number};
const safeRole=(role:unknown):AppRole=>typeof role==="string"&&role.trim()?role as AppRole:"STUDENT";
const roleLabel=(role:unknown)=>safeRole(role).replaceAll("_"," ").toLowerCase().replace(/(^|\s)\S/g,v=>v.toUpperCase());
const overviewPath=(role:unknown)=>isAdministrator(safeRole(role))?"/portal/admin":safeRole(role)==="TEACHER"?"/portal/teacher":"/portal/parent";

function buildItems(roleInput:unknown,pendingAdmissions=0){
 const role=safeRole(roleInput);
 const primary:PortalNavItem[]=[
  {label:"Overview",key:"overview",icon:LayoutDashboard,href:overviewPath(role)},
  {label:"My profile",key:"profile",icon:Settings,href:"/portal/profile"},
  {label:"Timetable",key:"timetable",icon:CalendarDays,href:"/portal/timetable"},
  {label:"Learning materials",key:"learning",icon:BookOpen,href:"/portal/learning"},
  {label:"Homework",key:"homework",icon:BookOpenCheck,href:"/portal/homework"},
  {label:"Library",key:"library",icon:LibraryBig,href:"/portal/library"},
  {label:"Past papers",key:"past-papers",icon:FileText,href:"/portal/past-papers"},
  {label:"Prefects body",key:"prefects",icon:Users,href:"/portal/prefects"},
  {label:"Messages",key:"messages",icon:MessageSquare,href:"/portal/messages"}
 ];
 if(role==="TEACHER"){
  primary.splice(4,0,{label:"Attendance",key:"attendance",icon:ClipboardCheck,href:"/portal/attendance"});
  primary.splice(5,0,{label:"Marks entry",key:"exams",icon:GraduationCap,href:"/portal/exams"});
  primary.splice(6,0,{label:"Class marksheet",key:"marksheet",icon:FileText,href:"/portal/class-marksheet"});
  primary.splice(7,0,{label:"Learner reports",key:"reports",icon:FileText,href:"/portal/reports"});
  primary.splice(8,0,{label:"Food register",key:"food",icon:Utensils,href:"/portal/food"});
  primary.splice(9,0,{label:"Duty roster",key:"duty-roster",icon:ClipboardList,href:"/portal/duty-roster"});
 }
 if(role==="PARENT"||role==="STUDENT") primary.push({label:"Fees & payments",key:"finance",icon:CreditCard,href:"/portal/finance"},{label:"My reports",key:"reports",icon:FileText,href:"/portal/report-cards"});
 const management:PortalNavItem[]=isAdministrator(role)?[
  {label:"Teachers",key:"teachers",icon:Users,href:"/portal/admin/teacher-invitations"},
  {label:"Invite teacher",key:"teacher-invitations",icon:UserPlus,href:"/portal/admin/teacher-invitations"},
  {label:"People & enrolment",key:"people",icon:Users,href:"/portal/people",badge:pendingAdmissions},
  {label:"Academics",key:"academics",icon:GraduationCap,href:"/portal/academics"},
  {label:"Attendance",key:"attendance",icon:ClipboardCheck,href:"/portal/attendance"},
  {label:"Exams & report cards",key:"exams",icon:FileText,href:"/portal/exams"},
  {label:"Reports Centre",key:"reports",icon:FileText,href:"/portal/reports"},
  {label:"Class marksheets",key:"marksheet",icon:FileText,href:"/portal/class-marksheet"},
  {label:"Fees & payments",key:"finance",icon:CreditCard,href:"/portal/finance"},
  {label:"Learning materials",key:"learning-admin",icon:BookOpen,href:"/portal/learning"},
  {label:"Homework",key:"admin-homework",icon:BookOpenCheck,href:"/portal/homework"},
  {label:"Library",key:"admin-library",icon:LibraryBig,href:"/portal/library"},
  {label:"Food & feeding",key:"food",icon:Utensils,href:"/portal/food"},
  {label:"Past papers",key:"admin-past-papers",icon:FileText,href:"/portal/past-papers"},
  {label:"Timetable",key:"admin-timetable",icon:Clock3,href:"/portal/timetable"},
  {label:"Teacher duty roster",key:"duty-roster",icon:ClipboardList,href:"/portal/duty-roster"},
  {label:"Prefects body",key:"prefects",icon:Users,href:"/portal/prefects"},
  {label:"School content",key:"content",icon:Settings,href:"/portal/content"},
  {label:"Gallery",key:"gallery",icon:Image,href:"/portal/gallery"},
  {label:"Operations & reports",key:"operations",icon:BarChart3,href:"/portal/operations"}
 ]:[];
 const communication:PortalNavItem[]=isAdministrator(role)?[
  {label:"Announcements",key:"admin-announcements",icon:Megaphone,href:"/portal/announcements"},
  {label:"Messages",key:"admin-messages",icon:MessageSquare,href:"/portal/messages"},
  {label:"Notifications",key:"admin-notifications",icon:Bell,href:"/portal/notifications"}
 ]:[];
 const system:PortalNavItem[]=isAdministrator(role)?[
  {label:"School settings",key:"settings",icon:Settings,href:"/portal/settings"},
  {label:"Audit history",key:"audit",icon:ShieldCheck,href:"/portal/audit"}
 ]:[];
 return{primary,management,communication,system};
}

export function PortalLayout({role,children}:{role?:AppRole;children:ReactNode}){
 const safe=safeRole(role);
 const [location,setLocation]=useLocation();
 const [mobileOpen,setMobileOpen]=useState(false);
 const [pendingAdmissions,setPendingAdmissions]=useState(0);
 const {profile,signOut}=useSchoolAuth();
 const {primary,management,communication,system}=buildItems(safe,pendingAdmissions);
 useEffect(()=>{
  if(!isAdministrator(safe))return;
  let cancelled=false;
  const load=async()=>{
   const{data,error}=await getSupabase().from("admission_applications").select("status");
   if(cancelled||error)return;
   setPendingAdmissions((data??[]).filter(r=>["submitted","pending","under_review"].includes(String(r.status).toLowerCase())).length);
  };
  void load();
  const timer=window.setInterval(()=>void load(),30000);
  return()=>{cancelled=true;window.clearInterval(timer)};
 },[safe]);
 useEffect(()=>{
  const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")setMobileOpen(false)};
  window.addEventListener("keydown",closeOnEscape);
  document.body.style.overflow=mobileOpen?"hidden":"";
  return()=>{window.removeEventListener("keydown",closeOnEscape);document.body.style.overflow=""};
 },[mobileOpen]);
 const activeKey=location===overviewPath(safe)?"overview":location.split("/").at(-1)||"overview";
 const displayName=profile?.display_name||profile?.email||"School account";
 const initials=displayName.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join("")||"M";
 const move=(href:string)=>{setLocation(href);setMobileOpen(false);window.scrollTo({top:0,behavior:"auto"})};
 const NavGroup=({title,items}:{title:string;items:PortalNavItem[]})=><div className="mt-7"><p className="px-3 text-[10px] font-extrabold uppercase tracking-[.2em] text-white/45">{title}</p><nav className="mt-2 grid gap-1" aria-label={`${title} navigation`}>{items.map(({label,key,icon:Icon,href,badge})=>{const active=(key==="teachers"||key==="teacher-invitations")?location===href:activeKey===key||(key!=="overview"&&location===href)||(key!=="overview"&&location.startsWith(`${href}/`));return <button key={`${key}-${href}`} onClick={()=>move(href)} aria-current={active?"page":undefined} className={`menwe-focus-ring flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-semibold transition-all ${active?"menwe-portal-nav-active":"text-white/72 hover:bg-white/8 hover:text-white"}`}><Icon size={17} strokeWidth={active?2.3:1.9}/><span className="min-w-0 flex-1 truncate">{label}</span>{badge?<span className="grid min-w-6 place-items-center rounded-full bg-[var(--gold)] px-1.5 py-0.5 text-[10px] font-black text-[var(--ink)]">{badge>99?"99+":badge}</span>:null}</button>})}</nav></div>;
 const sidebar=<aside className="menwe-portal-scroll flex h-full w-[17.5rem] flex-col overflow-y-auto border-r border-white/8 bg-[var(--ink)] px-3 py-5 text-white"><button onClick={()=>move("/")} className="menwe-focus-ring mx-1 flex min-h-12 items-center rounded-2xl px-2 text-left" aria-label="Return to Menwe public website"><span className="font-black tracking-tight">MENWE <span className="text-[var(--gold)]">SCHOOL</span></span></button><div className="mx-1 mt-5 rounded-2xl border border-white/10 bg-white/[.045] p-3.5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--gold)] text-sm font-black text-[var(--ink)]">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{displayName}</p><p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[.12em] text-white/50">{roleLabel(safe)}</p></div></div><div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-white/55"><span className="menwe-live-dot"/> Secure school account</div><div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--gold)]/10 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[.1em] text-[var(--gold)]"><CalendarDays size={12}/> Term 3 · 2026</div></div><NavGroup title="My school" items={primary}/>{management.length>0&&<NavGroup title="Management" items={management}/>} {communication.length>0&&<NavGroup title="Communications" items={communication}/>} {system.length>0&&<NavGroup title="Governance" items={system}/>}<div className="mt-auto pt-7"><div className="mx-1 rounded-2xl border border-white/10 bg-white/[.035] p-3"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/45">Menwe Primary & Junior School</p><p className="mt-1 text-xs leading-5 text-white/60">Secure portal for authorised school users.</p><button onClick={()=>void signOut()} className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 text-sm font-semibold text-white/72 transition hover:bg-white/8 hover:text-white"><LogOut size={16}/>Sign out</button></div></div></aside>;
 const currentLabel=[...primary,...management,...communication,...system].find(i=>i.key===activeKey)?.label||"Overview";
 return <div className="menwe-portal"><div className="hidden min-h-screen lg:fixed lg:inset-y-0 lg:left-0 lg:block">{sidebar}</div><header className="sticky top-0 z-40 flex min-h-[4.5rem] items-center justify-between gap-4 border-b border-[var(--ink)]/8 bg-[var(--paper)]/90 px-4 backdrop-blur-2xl lg:ml-[17.5rem] lg:px-8"><div className="flex min-w-0 items-center gap-3"><button onClick={()=>setMobileOpen(true)} className="menwe-focus-ring grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--ink)]/12 bg-white lg:hidden" aria-label="Open portal navigation" aria-expanded={mobileOpen} aria-controls="portal-mobile-navigation"><Menu size={19}/></button><div className="min-w-0"><p className="hidden text-[10px] font-extrabold uppercase tracking-[.2em] text-[var(--accent)] sm:block">Menwe secure portal</p><div className="mt-0.5 flex min-w-0 items-center gap-2 text-sm font-semibold"><span className="truncate text-[var(--ink)]/62">{roleLabel(safe)}</span><span className="text-[var(--ink)]/20">/</span><span className="truncate text-[var(--ink)]">{currentLabel}</span></div></div></div><div className="flex shrink-0 items-center gap-1.5 sm:gap-2"><div className="hidden items-center gap-2 rounded-full border border-[var(--ink)]/8 bg-white/70 px-3 py-2 text-[11px] font-bold text-[var(--ink)]/65 md:flex"><span className="menwe-live-dot"/> Live</div><div className="hidden items-center gap-2 rounded-full border border-[var(--gold)]/25 bg-[var(--gold)]/10 px-3 py-2 text-[11px] font-extrabold text-[var(--ink)] sm:flex"><CalendarDays size={13}/> Term 3 · 2026</div><NotificationBell/><button onClick={()=>move("/")} className="menwe-interactive hidden min-h-11 items-center gap-2 rounded-xl border border-[var(--ink)]/10 bg-white px-3 text-xs font-bold text-[var(--ink)] sm:flex"><ChevronLeft size={15}/>Public site</button></div></header>{mobileOpen&&<div id="portal-mobile-navigation" className="fixed inset-0 z-50 bg-[var(--ink)]/60 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true" aria-label="Portal navigation" onClick={()=>setMobileOpen(false)}><div className="h-full w-[17.5rem] shadow-2xl" onClick={event=>event.stopPropagation()}>{sidebar}</div><button onClick={()=>setMobileOpen(false)} className="absolute right-4 top-4 grid min-h-11 min-w-11 place-items-center rounded-xl bg-white text-[var(--ink)] shadow-xl" aria-label="Close portal navigation"><X size={18}/></button></div>}<div className="min-h-[calc(100vh-4.5rem)] bg-[var(--paper)] lg:ml-[17.5rem]">{children}</div></div>;
}
