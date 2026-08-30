import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";
import PortalDashboardPage from "./PortalDashboardPage";
import ReportCardButton from "@/components/ReportCardButton";
import CbcPortfolioView from "@/components/CbcPortfolioView";
import ParentAssistant from "@/components/ParentAssistant";

export default function PortalParentPage(){
  const {user,profile,loading}=useSchoolAuth(); const [,go]=useLocation(); const [upis,setUpis]=useState<string[]>([]);
  const authorized=Boolean(user&&profile&&profile.status==="ACTIVE"&&profile.role==="PARENT");
  useEffect(()=>{if(!loading&&!authorized){go("/portal/login");return;}if(!authorized)return;let active=true;(async()=>{try{const {data,error}=await getSupabase().from("students").select("upi_number").contains("parent_user_ids",[user!.id]);if(!error&&active)setUpis((data??[]).map(s=>String(s.upi_number||"")).filter(Boolean));}catch{/* dashboard handles its own data errors */}})();return()=>{active=false}},[authorized,go,loading,user]);
  if(loading)return <div className="grid min-h-screen place-items-center bg-[#F8F9FA] text-[#061229]">Loading family portal…</div>;
  if(!authorized)return null;
  return <><div className="mx-auto flex w-full max-w-7xl min-w-0 box-border justify-end px-4 pt-4 sm:px-6 lg:px-8"><ReportCardButton userId={user?.id}/></div><div className="mx-auto w-full max-w-7xl min-w-0 box-border px-4 pt-4 sm:px-6 lg:px-8"><ParentAssistant/></div>{upis.length>0&&<div className="mx-auto w-full max-w-7xl min-w-0 box-border px-4 pt-4 sm:px-6 lg:px-8"><div className="grid grid-cols-1 gap-5">{upis.map(upi=><CbcPortfolioView key={upi} upi={upi}/>)}</div></div>}<PortalDashboardPage/></>;
}
