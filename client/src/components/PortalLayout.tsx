import { BarChart3, Bell, BookOpenCheck, CalendarDays, ChevronLeft, ClipboardCheck, CreditCard, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, MessageSquare, Settings, Users, X, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { isAdministrator, type AppRole, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { SchoolMark } from "./PublicLayout";
import NotificationBell from "./NotificationBell";
import AdminAnalytics from "./AdminAnalytics";
import "@/portal-theme.css";

type PortalNavItem = { label: string; key: string; icon: LucideIcon; href: string };

const roleLabel = (role: AppRole) => role.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, value => value.toUpperCase());
const overviewPath = (role: AppRole) => isAdministrator(role) ? "/portal/admin" : role === "TEACHER" ? "/portal/teacher" : "/portal/parent";

function buildItems(role: AppRole): { primary: PortalNavItem[]; management: PortalNavItem[] } {
  const primary: PortalNavItem[] = [
    { label: "Overview", key: "overview", icon: LayoutDashboard, href: overviewPath(role) },
    { label: "My profile", key: "profile", icon: Settings, href: "/portal/profile" },
    { label: "Timetable", key: "timetable", icon: CalendarDays, href: "/portal/timetable" },
    { label: "Homework", key: "homework", icon: BookOpenCheck, href: "/portal/homework" },
    { label: "Announcements", key: "announcements", icon: FileText, href: "/portal/notifications" },
    { label: "Notifications", key: "notifications", icon: Bell, href: "/portal/notifications" },
    { label: "Messages", key: "messages", icon: MessageSquare, href: "/portal/messages" },
  ];
  if (role === "PARENT" || role === "STUDENT") primary.push({ label: "Fees & payments", key: "finance", icon: CreditCard, href: "/portal/finance" });
  if (role === "TEACHER") primary.splice(3, 0, { label: "Attendance", key: "attendance", icon: ClipboardCheck, href: "/portal/attendance" });
  const management: PortalNavItem[] = isAdministrator(role) ? [
    { label: "People & enrolment", key: "people", icon: Users, href: "/portal/admin/directory" },
    { label: "Academics", key: "academics", icon: GraduationCap, href: "/portal/admin/academics" },
    { label: "Attendance", key: "attendance", icon: ClipboardCheck, href: "/portal/admin/attendance" },
    { label: "Exams & report cards", key: "exams", icon: FileText, href: "/portal/exams" },
    { label: "Fees & payments", key: "finance", icon: CreditCard, href: "/portal/finance" },
    { label: "School content", key: "content", icon: Settings, href: "/portal/admin/content" },
    { label: "Operations & reports", key: "operations", icon: BarChart3, href: "/portal/operations" },
  ] : [];
  return { primary, management };
}

export function PortalLayout({ role, children }: { role: AppRole; children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useSchoolAuth();
  const { primary, management } = buildItems(role);
  const activeKey = location === overviewPath(role) ? "overview" : location.split("/").at(-1) || "overview";
  const displayName = profile?.display_name || profile?.email || "School account";
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "M";

  const move = (href: string) => { setLocation(href); setMobileOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const NavGroup = ({ title, items }: { title: string; items: PortalNavItem[] }) => (
    <div className="mt-7">
      <p className="px-3 text-[10px] font-extrabold uppercase tracking-[.2em] text-white/35">{title}</p>
      <nav className="mt-2 grid gap-1" aria-label={`${title} navigation`}>
        {items.map(({ label, key, icon: Icon, href }) => {
          const active = activeKey === key || (key !== "overview" && location === href);
          return <button key={`${key}-${href}`} onClick={() => move(href)} aria-current={active ? "page" : undefined} className={`menwe-focus-ring flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-semibold transition-all ${active ? "menwe-portal-nav-active" : "text-white/62 hover:bg-white/8 hover:text-white"}`}><Icon size={17} strokeWidth={active ? 2.3 : 1.9} /><span className="min-w-0 truncate">{label}</span></button>;
        })}
      </nav>
    </div>
  );

  const sidebar = (
    <aside className="menwe-portal-scroll flex h-full w-[17.5rem] flex-col overflow-y-auto border-r border-white/8 bg-[var(--ink)] px-3 py-5 text-white">
      <button onClick={() => move("/")} className="menwe-focus-ring mx-1 flex min-h-12 items-center rounded-2xl px-2 text-left" aria-label="Return to Menwe public website"><SchoolMark /></button>
      <div className="mx-1 mt-5 rounded-2xl border border-white/10 bg-white/[.045] p-3.5">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--gold)] text-sm font-black text-[var(--ink)]">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{displayName}</p><p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[.12em] text-white/42">{roleLabel(role)}</p></div></div>
        <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-white/45"><span className="menwe-live-dot" /> Secure school account</div>
      </div>
      <NavGroup title="My school" items={primary} />
      {management.length > 0 && <NavGroup title="Management" items={management} />}
      <div className="mt-auto pt-7">
        <div className="mx-1 rounded-2xl border border-white/10 bg-white/[.035] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/35">Menwe Primary & Junior School</p>
          <p className="mt-1 text-xs leading-5 text-white/50">Secure portal for authorised school users.</p>
          <button onClick={() => void signOut()} className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 text-sm font-semibold text-white/65 transition hover:bg-white/8 hover:text-white"><LogOut size={16} />Sign out</button>
        </div>
      </div>
    </aside>
  );

  const currentLabel = [...primary, ...management].find(item => item.key === activeKey)?.label || "Overview";
  return (
    <div className="menwe-portal">
      <div className="hidden min-h-screen lg:fixed lg:inset-y-0 lg:left-0 lg:block">{sidebar}</div>
      <header className="sticky top-0 z-40 flex min-h-[4.5rem] items-center justify-between gap-4 border-b border-[var(--ink)]/8 bg-[var(--paper)]/90 px-4 backdrop-blur-2xl lg:ml-[17.5rem] lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="menwe-focus-ring grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--ink)]/12 bg-white lg:hidden" aria-label="Open portal navigation"><Menu size={19} /></button>
          <div className="min-w-0"><p className="hidden text-[10px] font-extrabold uppercase tracking-[.2em] text-[var(--accent)] sm:block">Menwe secure portal</p><div className="mt-0.5 flex min-w-0 items-center gap-2 text-sm font-semibold"><span className="truncate text-[var(--ink)]/48">{roleLabel(role)}</span><span className="text-[var(--ink)]/20">/</span><span className="truncate text-[var(--ink)]">{currentLabel}</span></div></div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2"><div className="hidden items-center gap-2 rounded-full border border-[var(--ink)]/8 bg-white/70 px-3 py-2 text-[11px] font-bold text-[var(--ink)]/55 md:flex"><span className="menwe-live-dot" /> Live</div><NotificationBell /><button onClick={() => move("/")} className="menwe-interactive hidden min-h-11 items-center gap-2 rounded-xl border border-[var(--ink)]/10 bg-white px-3 text-xs font-bold text-[var(--ink)] sm:flex"><ChevronLeft size={15} />Public site</button></div>
      </header>
      {mobileOpen && <div className="fixed inset-0 z-50 bg-[var(--ink)]/60 backdrop-blur-sm lg:hidden"><div className="h-full w-[17.5rem] shadow-2xl">{sidebar}</div><button onClick={() => setMobileOpen(false)} className="absolute right-4 top-4 grid min-h-11 min-w-11 place-items-center rounded-xl bg-white text-[var(--ink)] shadow-xl" aria-label="Close portal navigation"><X size={18}/></button></div>}
      <div className="min-h-[calc(100vh-4.5rem)] bg-[var(--paper)] lg:ml-[17.5rem]">{children}{isAdministrator(role) && <AdminAnalytics />}</div>
    </div>
  );
}
