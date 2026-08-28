import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import ExamDirectory from "./ExamDirectory";

export default function ExamManagementPage() {
  const { user, profile, loading } = useSchoolAuth(); const [, setLocation] = useLocation();
  useEffect(() => { if (!loading && !user) setLocation("/portal/login"); }, [loading, setLocation, user]);
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f4f5f1]"><Loader2 className="animate-spin text-[var(--accent)]" /></div>;
  if (!user || !profile) return null;
  return <PortalLayout role={profile.role}><main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><ExamDirectory /></main></PortalLayout>;
}