import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import PortalDashboardPage from "./PortalDashboardPage";
import ReportCardButton from "@/components/ReportCardButton";

export default function PortalParentPage(){
  const {user,profile,loading}=useSchoolAuth();
  const [,go]=useLocation();
  const authorized=Boolean(user&&profile&&profile.status==="ACTIVE"&&profile.role==="PARENT");
  useEffect(()=>{if(!loading&&!authorized)go("/portal/login")},[authorized,loading,go]);
  if(loading)return <div className="grid min-h-screen place-items-center bg-[#F8F9FA] text-[#061229]">Loading family portal…</div>;
  if(!authorized)return null;
  return <><div className="mx-auto flex w-full max-w-7xl min-w-0 box-border justify-end px-4 pt-4 sm:px-6 lg:px-8"><ReportCardButton userId={user?.id}/></div><PortalDashboardPage/></>;
}