import { BarChart3, BookOpenCheck, CalendarDays, ChevronLeft, ClipboardCheck, CreditCard, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, MessageSquare, Settings, Users, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { isAdministrator, type AppRole, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { SchoolMark } from "./PublicLayout";

type PortalNavItem = [label: string, key: string, icon: LucideIcon];

const baseItems: PortalNavItem[] = [
  ["Overview", "overview", LayoutDashboard],
  ["My profile", "profile", Settings],
  ["Timetable", "timetable", CalendarDays],
  ["Homework", "homework", BookOpenCheck],
  ["Announcements", "announcements", FileText],
  ["Messages", "messages", MessageSquare],
];

const adminItems: PortalNavItem[] = [
  ["People & enrolment", "people", Users],
  ["Academics", "academics", GraduationCap],
  ["Attendance", "attendance", ClipboardCheck],
  ["Exams & report cards", "exams", FileText],
  ["Fees & payments", "finance", CreditCard],
  ["School content", "content", Settings],
  ["Operations & reports", "operations", BarChart3],
];

export function PortalLayout({ role, children }: { role: AppRole; children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useSchoolAuth();
  const financeItem: PortalNavItem = ["Fees & payments", "finance", CreditCard];
  const entries = isAdministrator(role) ? [...baseItems, ...adminItems] : role === "PARENT" || role === "STUDENT" ? [...baseItems, financeItem] : baseItems;
  const active = location.split("/").at(-1) || "overview";
  const move = (item: string) => {
    setLocation(`/portal/${item}`);
    setMobileOpen(false);
  };
  const sidebar = (
    <aside className="flex h-full w-[18rem] flex-col border-r border-white/10 bg-[var(--ink)] px-4 py-5 text-white">
      <button onClick={() => setLocation("/")} className="rounded-xl text-left"><SchoolMark compact /></button>
      <div className="mt-10">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{role.replaceAll("_", " ")} portal</p>
        <nav className="mt-3 grid gap-1" aria-label="Portal navigation">
          {entries.map(([label, key, Icon]) => <button key={key} onClick={() => move(key)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active === key ? "bg-white text-[var(--ink)] shadow-sm" : "text-white/65 hover:bg-white/10 hover:text-white"}`}><Icon size={17} />{label}</button>)}
        </nav>
      </div>
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="truncate text-sm font-semibold">{profile?.full_name || profile?.email || "School account"}</p>
        <p className="mt-1 text-xs text-white/50">{role.replaceAll("_", " ")}</p>
        <button onClick={() => void signOut()} className="mt-4 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"><LogOut size={16} />Sign out</button>
      </div>
    </aside>
  );
  return (
    <div className="min-h-screen bg-[#f4f5f1] text-[var(--ink)]">
      <div className="hidden min-h-screen lg:fixed lg:inset-y-0 lg:left-0 lg:block">{sidebar}</div>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--ink)]/10 bg-[#f4f5f1]/90 px-4 backdrop-blur lg:ml-[18rem] lg:px-8">
        <button onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--ink)]/15 lg:hidden" aria-label="Open portal navigation"><Menu size={19} /></button>
        <p className="hidden text-sm font-medium text-[var(--ink)]/55 lg:block">Secure access • {role.replaceAll("_", " ")}</p>
        <button onClick={() => setLocation("/")} className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]/70 hover:text-[var(--accent)]"><ChevronLeft size={16} />Public website</button>
      </header>
      {mobileOpen && <div className="fixed inset-0 z-50 bg-black/40 lg:hidden"><div className="h-full w-[18rem] shadow-2xl">{sidebar}</div><button onClick={() => setMobileOpen(false)} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-xl bg-white" aria-label="Close portal navigation"><X size={18} /></button></div>}
      <div className="lg:ml-[18rem]">{children}</div>
    </div>
  );
}
