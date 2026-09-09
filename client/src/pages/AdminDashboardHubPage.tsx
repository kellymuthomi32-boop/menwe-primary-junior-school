import { AlertTriangle, ArrowUpRight, BarChart3, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, CreditCard, FileText, GraduationCap, Loader2, Megaphone, MessageSquare, Settings, ShieldCheck, UserPlus, Users, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";
import { PortalLayout } from "@/components/PortalLayout";

type Metric = { label: string; value: string | number; detail: string; icon: typeof Users; href: string; tone?: "good" | "warn" };
type Attention = { label: string; value: number; detail: string; href: string; icon: typeof Users };
const money = (v: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(v);

const quickActions = [
  ["Add learner", "Create or update a learner record", Users, "/portal/people"],
  ["Invite teacher", "Send a secure staff invitation", UserPlus, "/portal/admin/teacher-invitations"],
  ["Take attendance", "Open today's register", ClipboardCheck, "/portal/attendance"],
  ["Record payment", "Review finance and payments", CreditCard, "/portal/finance"],
  ["Post announcement", "Publish an official school message", Megaphone, "/portal/announcements"],
  ["View audit trail", "Review recent administrative activity", ShieldCheck, "/portal/audit"],
] as const;

export default function AdminDashboardHubPage() {
  const { user, profile } = useSchoolAuth();
  const [, navigate] = useLocation();
  const [data, setData] = useState({ learners: 0, teachers: 0, admissions: 0, attendance: 0, attendanceRate: 0, openInvoices: 0, confirmed: 0, unreadContacts: 0, draftContent: 0, openMessages: 0, draftAnnouncements: 0, events: 0, exams: 0, reportCards: 0, subjects: 0, classes: 0 });
  const [year, setYear] = useState("Current academic year");
  const [term, setTerm] = useState("Current term");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState<Date | null>(null);
