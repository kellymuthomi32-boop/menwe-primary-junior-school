import { BarChart3, BookOpen, BookOpenCheck, CalendarDays, ChevronDown, ChevronLeft, ClipboardCheck, CreditCard, FileText, GraduationCap, Image, LayoutDashboard, LibraryBig, LogOut, Menu, MessageSquare, Settings, ShieldCheck, Users, X, Bell, Megaphone, Clock3, Utensils, ClipboardList, UserPlus, type LucideIcon } from "lucide-react";
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
const overviewPath=(role:unknown)=>isAdministrator(safeRole(role)?safeRole(role):"STUDENT")?"/portal/admin":safeRole(role)==="TEACHER"?"/portal/teacher":"/portal/parent";

function buildItems(roleInput:unknown,pendingAdmissions=0){
 const role=safeRole(roleInput);
 const primary:PortalNavItem[]=[
  {label:"Overview",key:"overview",icon:LayoutDashboard,href:overviewPath(role)},
  {label:"My profile",key:"profile",icon:Settings,href:"/portal/profile"},
 ];
 const teaching:PortalNavItem[]=[];
 const school:PortalNavItem[]=[];
 const academics:PortalNavItem[]=[];
 const people:PortalNavItem[]=[];
 const operations:PortalNavItem[]=[];
 const resources:PortalNavItem[]=[];
 const content:PortalNavItem[]=[];
 const communication:PortalNavItem[]=[];
 const system:PortalNavItem[]=[];

 if(role==="TEACHER"){
  teaching.push(
   {label:"Attendance",key:"attendance",icon:ClipboardCheck,href:"/portal/attendance"},
   {label:"Marks entry",key:"exams",icon:GraduationCap,href:"/portal/exams"},
   {label:"Class marksheet",key:"marksheet",icon:FileText,href:"/portal/class-marksheet"},
   {label:"Learner reports",key:"reports",icon:FileText,href:"/portal/reports"},
   {label:"Food register",key:"food",icon:Utensils,href:"/portal/food"},
   {label:"Duty roster",key:"duty-roster",icon:ClipboardList,href:"/portal/duty-roster"},
  );
  resources.push(
   {label:"Learning materials",key:"learning",icon:BookOpen,href:"/portal/learning"},
   {label:"Homework",key:"homework",icon:BookOpenCheck,href:"/portal/homework"},
   {label:"Library",key:"library",icon:LibraryBig,href:"/portal/library"},
   {label:"Past papers",key:"past-papers",icon:FileText,href:"/portal/past-papers"},
   {label:"Timetable",key:"timetable",icon:CalendarDays,href:"/portal/timetable"},
   {label:"Prefects body",key:"prefects",icon:Users,href:"/portal/prefects"},
  );
  communication.push({label:"Messages",key:"messages",icon:MessageSquare,href:"/portal/messages"});
 } else if(role==="PARENT"||role==="STUDENT"){
  school.push(
   {label:"Timetable",key:"timetable",icon:CalendarDays,href:"/portal/timetable"},
   {label:"Learning materials",key:"learning",icon:BookOpen,href:"/portal/learning"},
   {label:"Homework",key:"homework",icon:BookOpenCheck,href:"/portal/homework"},
   {label:"Library",key:"library",icon:LibraryBig,href:"/portal/library"},
   {label:"Past papers",key:"past-papers",icon:FileText,href:"/portal/past-papers"},
   {label:"Prefects body",key:"prefects",icon:Users,href:"/portal/prefects"},
  );
  operations.push(
   {label:"Fees & payments",key:"finance",icon:CreditCard,href:"/portal/finance"},
   {label:"My reports",key:"reports",icon:FileText,href:"/portal/report-cards"},
  );
  communication.push({label:"Messages",key:"messages",icon:MessageSquare,href:"/portal/messages"});
 }

 if(isAdministrator(role)){
  people.push(
   {label:"Teachers",key:"teachers",icon:Users,href:"/portal/admin/teachers"},
   {label:"Invite teacher",key:"teacher-invitations",icon:UserPlus,href:"/portal/admin/teacher-invitations"},
   {label:"People & enrolment",key:"people",icon:Users,href:"/portal/people",badge:pendingAdmissions},
  );
  academics.push(
   {label:"Academics",key:"academics",icon:GraduationCap,href:"/portal/academics"},
   {label:"Attendance",key:"attendance-admin",icon:ClipboardCheck,href:"/portal/attendance"},
   {label:"Exams & report cards",key:"exams-admin",icon:FileText,href:"/portal/exams"},
   {label:"Reports Centre",key:"reports-admin",icon:FileText,href:"/portal/reports"},
   {label:"Class marksheets",key:"marksheet-admin",icon:FileText,href:"/portal/class-marksheet"},
  );
  operations.push(
   {label:"Fees & payments",key:"finance-admin",icon:CreditCard,href:"/portal/finance"},
   {label:"Food & feeding",key:"food-admin",icon:Utensils,href:"/portal/food"},
   {label:"Teacher duty roster",key:"duty-roster-admin",icon:ClipboardList,href:"/portal/duty-roster"},
   {label:"Operations & reports",key:"operations",icon:BarChart3,href:"/portal/operations"},
  );
  resources.push(
   {label:"Learning materials",key:"learning-admin",icon:BookOpen,href:"/portal/learning"},
   {label:"Homework",key:"admin-homework",icon:BookOpenCheck,href:"/portal/homework"},
   {label:"Library",key:"admin-library",icon:LibraryBig,href:"/portal/library"},
   {label:"Past papers",key:"admin-past-papers",icon:FileText,href:"/portal/past-papers"},
   {label:"Timetable",key:"admin-timetable",icon:Clock3,href:"/portal/timetable"},
   {label:"Prefects body",key:"prefects-admin",icon:Users,href:"/portal/prefects"},
  );
  content.push(
   {label:"School content",key:"content",icon:Settings,href:"/portal/content"},
   {label:"Gallery",key:"gallery",icon:Image,href:"/portal/gallery"},
  );
  communication.push(
   {label:"Announcements",key:"admin-announcements",icon:Megaphone,href:"/portal/announcements"},
   {label:"Messages",key:"admin-messages",icon:MessageSquare,href:"/portal/messages"},
   {label:"Notifications",key:"admin-notifications",icon:Bell,href:"/portal/notifications"},
  );
  system.push(
   {label:"School settings",key:"settings",icon:Settings,href:"/portal/settings"},
   {label:"Audit history",key:"audit",icon:ShieldCheck,href:"/portal/audit"},
  );
 }

 return {primary,teaching,school,academics,people,operations,resources,content,communication,system};
}

export function PortalLayout({role,children}:{role?:AppRole;children:ReactNode}){
 const safe=safeRole(role);
 const[location,setLocation]=useLocation();
 const[mobileOpen,setMobileOpen]=useState(false);
 const[pendingAdmissions,setPendingAdmissions]=useState(0);
 const[currentTerm,setCurrentTerm]=useState("Current term");
 const{profile,signOut}=useSchoolAuth();
 const{primary,teaching,school,academics,people,operations,resources,content,communication,system}=buildItems(safe,pendingAdmissions);

 useEffect(()=>{
  if(!isAdministrator(safe))return;
  let cancelled=false;
  const load=async()=>{
   const [admissionsRes, termRes] = await Promise.all([
    getSupabase().from("admission_applications").select("status"),
    getSupabase().from("terms").select("name").eq("is_current",true).eq("status","ACTIVE").maybeSingle(),
   ]);
   if(cancelled)return;
   if(!admissionsRes.error)setPendingAdmissions((admissionsRes.data??[]).filter(r=>["submitted","pending","under_review"].includes(String(r.status).toLowerCase())).length);
   if(!termRes.error)setCurrentTerm(termRes.data?.name??"Current term");
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

 const displayName=profile?.display_name||profile?.email||"School account";
 const initials=displayName.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join("")||"M";
 const move=(href:string)=>{setLocation(href);setMobileOpen(false);window.scrollTo({top:0,behavior:"auto"})};
 const isActive=(href:string)=>href===overviewPath(safe)?location===href:location===href||location.startsWith(`${href}/`);
 const allItems=[...primary,...teaching,...school,...academics,...people,...operations,...resources,...content,...communication,...system];
 const currentLabel=allItems.find(i=>isActive(i.href))?.label||"Overview";

 const NavGroup=({title,items,defaultOpen=false}:{title:string;items:PortalNavItem[];defaultOpen?:boolean})=>{
  const active=items.some(item=>isActive(item.href));
  const[open,setOpen]=useState(defaultOpen||active);
  if(!items.length)return null;
  return <div className="mt-4">
   <button type="button" onClick={()=>setOpen(value=>!value)} className="menwe-focus-ring flex min-h-9 w-full items-center justify-between rounded-lg px-3 text-left" aria-expanded={open}>
    <span className="text-[10px] font-extrabold uppercase tracking-[.2em] text-white/45">{title}</span>
    <ChevronDown size={14} className={`text-white/35 transition-transform duration-200 ${open?"rotate-180":""}`}/>
   </button>
   {open&&<nav className="mt-1 grid gap-1" aria-label={`${title} navigation`}>
    {items.map(({label,key,icon:Icon,href,badge})=>{
     const itemActive=isActive(href);
     return <button key={`${key}-${href}`} onClick={()=>move(href)} aria-current={itemActive?"page":undefined} className={`menwe-focus-ring flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-semibold transition-all ${itemActive?"menwe-portal-nav-active":"text-white/72 hover:bg-white/8 hover:text-white"}`}>
      <Icon size={17} strokeWidth={itemActive?2.3:1.9}/><span className="min-w-0 flex-1 truncate">{label}</span>{badge?<span className="grid min-w-6 place-items-center rounded-full bg-[var(--gold)] px-1.5 py-0.5 text-[10px] font-black text-[var(--ink)]">{badge>99?"99+":badge}</span>:null}
     </button>;
    })}
   </nav>}
  </div>;
 };

 const sidebar=<aside className="menwe-portal-scroll flex h-full w-[17.5rem] flex-col overflow-y-auto border-r border-white/8 bg-[var(--ink)] px-3 py-4 text-white">
  <button onClick={()=>move("/")} className="menwe-focus-ring mx-1 flex min-h-12 items-center rounded-2xl px-2 text-left" aria-label="Return to Menwe public website"><span className="font-black tracking-tight">MENWE <span className="text-[var(--gold)]">SCHOOL</span></span></button>
  <div className="mx-1 mt-3 rounded-2xl border border-white/10 bg-white/[.045] p-3">
   <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--gold)] text-sm font-black text-[var(--ink)]">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{displayName}</p><p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[.12em] text-white/50">{roleLabel(safe)}</p></div></div>
   <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-white/55"><span className="menwe-live-dot"/> Secure school account</div>
   <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--gold)]/10 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[.1em] text-[var(--gold)]"><CalendarDays size={12}/> {currentTerm}</div>
  </div>
  <NavGroup title="Overview" items={primary} defaultOpen/>
  {isAdministrator(safe)?<><NavGroup title="People" items={people} defaultOpen/><NavGroup title="Academics" items={academics}/><NavGroup title="Finance & operations" items={operations}/><NavGroup title="Learning & resources" items={resources}/><NavGroup title="Website & communications" items={[...content,...communication]}/><NavGroup title="Governance & settings" items={system}/></>:<>{teaching.length>0&&<NavGroup title="Teaching" items={teaching} defaultOpen/>}{school.length>0&&<NavGroup title="My school" items={school} defaultOpen/>}{academics.length>0&&<NavGroup title="Academics" items={academics}/>} {operations.length>0&&<NavGroup title="Operations" items={operations}/>} {resources.length>0&&<NavGroup title="Learning & resources" items={resources}/>} {content.length>0&&<NavGroup title="School content" items={content}/>} {communication.length>0&&<NavGroup title="Communications" items={communication}/>} {system.length>0&&<NavGroup title="Governance" items={system}/>}</>}
  <div className="mt-auto pt-5"><div className="mx-1 rounded-2xl border border-white/10 bg-white/[.035] p-3"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/45">Menwe Primary & Junior School</p><p className="mt-1 text-xs leading-5 text-white/60">Secure portal for authorised school users.</p><button onClick={()=>void signOut()} className="mt-2 flex min-h-10 w-full items-center gap-2 rounded-xl px-2.5 text-sm font-semibold text-white/72 transition hover:bg-white/8 hover:text-white"><LogOut size={16}/>Sign out</button></div></div>
 </aside>;
 return <div className="menwe-portal"><div className="hidden min-h-screen lg:fixed lg:inset-y-0 lg:left-0 lg:block">{sidebar}</div><header className="sticky top-0 z-40 flex min-h-[4.5rem] items-center justify-between gap-4 border-b border-[var(--ink)]/8 bg-[var(--paper)]/90 px-4 backdrop-blur-2xl lg:ml-[17.5rem] lg:px-8"><div className="flex min-w-0 items-center gap-3"><button onClick={()=>setMobileOpen(true)} className="menwe-focus-ring grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--ink)]/12 bg-white lg:hidden" aria-label="Open portal navigation" aria-expanded={mobileOpen} aria-controls="portal-mobile-navigation"><Menu size={19}/></button><div className="min-w-0"><p className="hidden text-[10px] font-extrabold uppercase tracking-[.2em] text-[var(--accent)] sm:block">Menwe secure portal</p><div className="mt-0.5 flex min-w-0 items-center gap-2 text-sm font-semibold"><span className="truncate text-[var(--ink)]/62">{roleLabel(safe)}</span><span className="text-[var(--ink)]/20">/</span><span className="truncate text-[var(--ink)]">{currentLabel}</span></div></div></div><div className="flex shrink-0 items-center gap-1.5 sm:gap-2"><div className="hidden items-center gap-2 rounded-full border border-[var(--ink)]/8 bg-white/70 px-3 py-2 text-[11px] font-bold text-[var(--ink)]/65 md:flex"><span className="menwe-live-dot"/> Live</div><div className="hidden items-center gap-2 rounded-full border border-[var(--gold)]/25 bg-[var(--gold)]/10 px-3 py-2 text-[11px] font-extrabold text-[var(--ink)] sm:flex"><CalendarDays size={13}/> {currentTerm}</div><NotificationBell/><button onClick={()=>move("/")} className="menwe-interactive hidden min-h-11 items-center gap-2 rounded-xl border border-[var(--ink)]/10 bg-white px-3 text-xs font-bold text-[var(--ink)] sm:flex"><ChevronLeft size={15}/>Public site</button></div></header>{mobileOpen&&<div id="portal-mobile-navigation" className="fixed inset-0 z-50 bg-[var(--ink)]/60 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true" aria-label="Portal navigation" onClick={()=>setMobileOpen(false)}><div className="h-full w-[17.5rem] shadow-2xl" onClick={event=>event.stopPropagation()}>{sidebar}</div><button onClick={()=>setMobileOpen(false)} className="absolute right-4 top-4 grid min-h-11 min-w-11 place-items-center rounded-xl bg-white text-[var(--ink)] shadow-xl" aria-label="Close portal navigation"><X size={18}/></button></div>}<div className="min-h-[calc(100vh-4.5rem)] bg-[var(--paper)] lg:ml-[17.5rem]">{children}</div></div>;
}
