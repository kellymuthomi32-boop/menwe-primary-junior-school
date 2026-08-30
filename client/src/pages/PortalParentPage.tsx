import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import PortalDashboardPage from "./PortalDashboardPage";

export default function PortalParentPage(){const {user,profile,loading}=useSchoolAuth();const [,go]=useLocation();useEffect(()=>{if(!loading&&(!user||!profile||profile.role!=="PARENT"))go("/portal/login")},[loading,profile,user,go]);if(loading||!user||!profile||profile.role!=="PARENT")return <div className="grid min-h-screen place-items-center bg-[#F8F9FA] text-[#061229]">Loading family portal…</div>;return <PortalDashboardPage/>}
