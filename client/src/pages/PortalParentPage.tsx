import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import PortalDashboardPage from "./PortalDashboardPage";

export default function PortalParentPage(){
  const {user,profile,loading}=useSchoolAuth();
  const [,go]=useLocation();
  const authorized=Boolean(user&&profile&&profile.status==="ACTIVE"&&profile.role==="PARENT");
  useEffect(()=>{if(!loading&&!authorized)go("/portal/login")},[authorized,loading,go]);
  if(loading)return <div className="grid min-h-screen place-items-center bg-[#F8F9FA] text-[#061229]">Loading family portal…</div>;
  if(!authorized)return null;
  return <PortalDashboardPage/>;
}
