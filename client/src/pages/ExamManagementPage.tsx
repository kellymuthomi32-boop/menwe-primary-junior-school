import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import ExamDirectory from "./ExamDirectory";

const ADMINS = ["SUPER_ADMIN", "ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI"];

export default function ExamManagementPage(){
 const {user,profile,loading}=useSchoolAuth(); const [,go]=useLocation(); const admin=ADMINS.includes(profile?.role??"");
 useEffect(()=>{if(!loading&&!user)go("/portal/login")},[loading,user,go]);
 useEffect(()=>{if(!loading&&user&&profile&&admin)go("/portal/marks-management")},[admin,loading,profile,user,go]);
 if(loading||!user||!profile)return <div className="grid min-h-screen place-items-center bg-[var(--paper)]"><Loader2 className="animate-spin text-[var(--accent)]"/></div>;
 if(admin)return <div className="grid min-h-screen place-items-center bg-[var(--paper)]"><div className="text-center"><Loader2 className="mx-auto animate-spin text-[var(--gold)]"/><p className="mt-3 text-sm text-[var(--ink)]/60">Opening Marks Management…</p></div></div>;
 return <PortalLayout role={profile.role}><main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><ExamDirectory/></main></PortalLayout>;
}
