import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Bell, BookOpenCheck, CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign, Download, FileText, GraduationCap, LogOut, MessageCircle, ReceiptText, ShieldCheck, UserRound, WalletCards } from "lucide-react";
import { useLocation } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { requireSupabaseClient } from "@/lib/supabaseClient";

const navy = "#061229";
const gold = "#D89B28";

type Student = Record<string, unknown>;
type Assessment = { subject: string; level: string; score?: number | null; updatedAt?: string | null };
type FeePayment = { date: string; amount: number; reference: string };
type Report = { title: string; term: string; url?: string | null; date?: string | null };
type Announcement = { title: string; message: string; author: string; date?: string | null };

const subjects = ["Science & Technology", "Mathematics", "English", "Kiswahili", "Social Studies", "Agriculture"];
const levels = ["Exceeding Expectation", "Meeting Expectation", "Approaching Expectation", "Below Expectation"];

function text(value: unknown, fallback = "Not published") { return typeof value === "string" && value.trim() ? value : fallback; }
function money(value: unknown) { const n = Number(value); return Number.isFinite(n) ? `KSh ${n.toLocaleString("en-KE")}` : "—"; }
function dateText(value?: string | null) { if (!value) return ""; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }); }
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <article className={`rounded-2xl border border-gray-100 bg-white shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${className}`}>{children}</article>; }
function IconBox({ children }: { children: React.ReactNode }) { return <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#061229]/5 text-[#061229]">{children}</span>; }
function Pill({ children }: { children: React.ReactNode }) { return <span className="inline-flex rounded-full bg-[#D89B28]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#D89B28]">{children}</span>; }

export default function PortalDashboardPage() {
  const auth = useSchoolAuth();
  const [, go] = useLocation();
  const [tab, setTab] = useState<"cbc" | "fees" | "reports" | "announcements">("cbc");
  const [student, setStudent] = useState<Student | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [feeBalance, setFeeBalance] = useState<number | null>(null);
  const [attendance, setAttendance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataMessage, setDataMessage] = useState("");

  useEffect(() => {
    document.title = "Learner Portal Dashboard | Menwe Primary & Junior School";
  }, []);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) { go("/portal/login"); return; }
    let cancelled = false;
    const load = async () => {
      setLoading(true); setDataMessage("");
      try {
        const supabase = requireSupabaseClient();
        const email = auth.user?.email?.toLowerCase() ?? "";
        let learner: Student | null = null;
        const studentResult = await supabase.from("students").select("*").eq("student_user_id", auth.user!.id).maybeSingle();
        if (!studentResult.error && studentResult.data) learner = studentResult.data as Student;
        if (!learner && email) {
          const parentResult = await supabase.from("students").select("*").eq("parent_email", email).limit(1).maybeSingle();
          if (!parentResult.error && parentResult.data) learner = parentResult.data as Student;
        }
        if (cancelled) return;
        setStudent(learner);
        if (!learner) setDataMessage("Your authenticated account is active, but no learner record is currently linked to it. Please contact the ICT desk to complete the account link.");

        const id = text(learner?.id, "");
        if (id) {
          const [assessmentResult, paymentResult, reportResult, announcementResult, feeResult, attendanceResult] = await Promise.all([
            supabase.from("student_assessments").select("*").eq("student_id", id),
            supabase.from("fee_payments").select("*").eq("student_id", id).order("payment_date", { ascending: false }).limit(12),
            supabase.from("report_cards").select("*").eq("student_id", id).order("created_at", { ascending: false }).limit(12),
            supabase.from("announcements").select("*").eq("published", true).order("created_at", { ascending: false }).limit(8),
            supabase.from("fee_statements").select("*").eq("student_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
            supabase.from("attendance").select("*").eq("student_id", id),
          ]);
          if (!cancelled) {
            if (!assessmentResult.error && assessmentResult.data) setAssessments(assessmentResult.data.map((r: any) => ({ subject: text(r.subject ?? r.learning_area, "Subject"), level: text(r.level ?? r.performance_level, "Not published"), score: r.score ?? r.mark ?? null, updatedAt: r.updated_at ?? r.created_at ?? null })));
            if (!paymentResult.error && paymentResult.data) setPayments(paymentResult.data.map((r: any) => ({ date: text(r.payment_date ?? r.created_at, ""), amount: Number(r.amount ?? r.paid_amount ?? 0), reference: text(r.reference ?? r.receipt_number, "School payment") })));
            if (!reportResult.error && reportResult.data) setReports(reportResult.data.map((r: any) => ({ title: text(r.title ?? r.report_type, "Academic report"), term: text(r.term ?? r.academic_term, "School term"), url: r.file_url ?? r.url ?? null, date: r.created_at ?? null })));
            if (!announcementResult.error && announcementResult.data) setAnnouncements(announcementResult.data.map((r: any) => ({ title: text(r.title, "School announcement"), message: text(r.message ?? r.content, ""), author: text(r.author_name ?? r.author, "Menwe School Administration"), date: r.created_at ?? null })));
            if (!feeResult.error && feeResult.data) setFeeBalance(Number(feeResult.data.balance ?? feeResult.data.outstanding_balance ?? feeResult.data.amount_due ?? 0));
            if (!attendanceResult.error && attendanceResult.data?.length) {
              const rows = attendanceResult.data as any[]; const present = rows.filter(r => String(r.status ?? "").toLowerCase() === "present").length; setAttendance(Math.round((present / rows.length) * 100));
            }
          }
        }
      } catch (error) {
        if (!cancelled) setDataMessage(error instanceof Error ? error.message : "The learner records could not be loaded. Please try again or contact the ICT desk.");
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [auth.loading, auth.user, go]);

  const name = text(student?.full_name ?? student?.student_name ?? student?.name, auth.profile?.display_name ?? "Learner");
  const grade = text(student?.grade ?? student?.current_grade ?? student?.class_name, "Learning level not published");
  const admission = text(student?.admission_number, "Not linked");
  const upi = text(student?.upi_number, "Not linked");
  const teacher = text(student?.class_teacher_name ?? student?.teacher_name, "Class teacher not published");
  const performance = useMemo(() => {
    if (!assessments.length) return "Not yet published";
    const ranked = levels.find(level => assessments.filter(a => a.level.toLowerCase() === level.toLowerCase()).length > 0);
    return ranked ?? assessments[0].level;
  }, [assessments]);
  const grouped = subjects.map(subject => ({ subject, record: assessments.find(a => a.subject.toLowerCase() === subject.toLowerCase() || a.subject.toLowerCase().includes(subject.split(" ")[0].toLowerCase())) }));
  const totalPaid = payments.reduce((sum, p) => sum + (Number.isFinite(p.amount) ? p.amount : 0), 0);

  if (auth.loading || loading) return <PublicLayout><div className="grid min-h-[70vh] place-items-center bg-[#F8F9FA] px-5"><div className="text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#D89B28]/25 border-t-[#D89B28]"/><p className="mt-4 text-sm font-semibold text-slate-600">Loading your secure learner portal…</p></div></div></PublicLayout>;

  return <PublicLayout>
    <main className="min-h-screen bg-[#F8F9FA] pb-16">
      <section className="bg-[#061229] text-white"><div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14"><div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"><div><Pill>Secure learner portal</Pill><h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Welcome, {name}.</h1><div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/65"><span className="inline-flex items-center gap-2"><GraduationCap size={16} className="text-[#D89B28]"/>{grade}</span><span className="inline-flex items-center gap-2"><UserRound size={16} className="text-[#D89B28]"/>Class teacher: {teacher}</span></div></div><button onClick={async()=>{ await auth.signOut(); go("/portal/login"); }} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/15 px-4 py-3 text-xs font-bold text-white transition hover:bg-white/10 lg:self-auto"><LogOut size={15}/> Sign out</button></div><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div className="rounded-xl bg-white/5 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Admission No.</p><p className="mt-2 font-mono text-sm font-bold">{admission}</p></div><div className="rounded-xl bg-white/5 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-white/45">UPI Number</p><p className="mt-2 font-mono text-sm font-bold">{upi}</p></div><div className="rounded-xl bg-white/5 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Account</p><p className="mt-2 text-sm font-bold text-emerald-300">Authenticated & protected</p></div></div></div></section>
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        {dataMessage && <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800"><AlertCircle className="mt-0.5 shrink-0" size={18}/><p>{dataMessage}</p></div>}
        <section className="-mt-5 grid gap-4 sm:grid-cols-3"><Card className="p-5"><IconBox><CalendarDays size={20}/></IconBox><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Attendance Rate</p><p className="mt-1 text-3xl font-black text-[#061229]">{attendance === null ? "—" : `${attendance}%`}</p><p className="mt-1 text-xs text-slate-500">Based on recorded attendance</p></Card><Card className="p-5"><IconBox><WalletCards size={20}/></IconBox><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Current Fee Balance</p><p className="mt-1 text-3xl font-black text-[#061229]">{money(feeBalance)}</p><p className="mt-1 text-xs text-slate-500">Latest published statement</p></Card><Card className="p-5"><IconBox><BarChart3 size={20}/></IconBox><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">CBC Performance</p><p className="mt-1 text-xl font-black text-[#061229]">{performance}</p><p className="mt-1 text-xs text-slate-500">Latest published assessment level</p></Card></section>
        <div className="mt-8 overflow-x-auto"><div className="flex min-w-max gap-2 rounded-2xl bg-white p-2 shadow-sm">{[["cbc","CBC Assessment Rubric",BookOpenCheck],["fees","Fee Statement & Financials",CircleDollarSign],["reports","Termly Report Cards",FileText],["announcements","Announcements",Bell]].map(([id,label,Icon]: any)=><button key={id} onClick={()=>setTab(id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition ${tab===id?"bg-[#061229] text-white":"text-slate-500 hover:bg-slate-50"}`}><Icon size={16}/>{label}</button>)}</div></div>
        {tab === "cbc" && <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_.6fr]"><Card className="p-6"><div className="flex items-start justify-between gap-4"><div><Pill>Competency-Based Curriculum</Pill><h2 className="mt-4 font-serif text-3xl font-semibold text-[#061229]">Learning performance</h2><p className="mt-2 text-sm leading-6 text-slate-500">Your published learning-area results are shown using the four school reporting levels.</p></div><IconBox><BookOpenCheck size={21}/></IconBox></div><div className="mt-7 grid gap-3">{grouped.map(({subject,record})=><div key={subject} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-bold text-[#061229]">{subject}</h3>{record?.updatedAt&&<p className="mt-1 text-[11px] text-slate-400">Updated {dateText(record.updatedAt)}</p>}</div><span className="rounded-full bg-[#D89B28]/10 px-3 py-1 text-[10px] font-bold uppercase text-[#D89B28]">{record?.level ?? "Not yet published"}</span></div></div>)}</div></Card><Card className="p-6"><Pill>Reporting scale</Pill><h2 className="mt-4 font-serif text-2xl font-semibold text-[#061229]">CBC rubric levels</h2><div className="mt-6 space-y-3">{levels.map((level,i)=><div key={level} className="flex gap-3 rounded-xl bg-slate-50 p-4"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#061229] text-xs font-bold text-white">{i+1}</span><div><p className="text-xs font-bold text-[#061229]">{level}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{i===0?"The learner consistently demonstrates the competency beyond the expected level.":i===1?"The learner demonstrates the expected competency with confidence.":i===2?"The learner is developing the competency and benefits from targeted support.":"The learner requires additional support and guided practice."}</p></div></div>)}</div></Card></section>}
        {tab === "fees" && <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_.8fr]"><Card className="p-6"><Pill>Financial statement</Pill><h2 className="mt-4 font-serif text-3xl font-semibold text-[#061229]">Fee statement & payments</h2><div className="mt-6 rounded-2xl bg-[#061229] p-6 text-white"><p className="text-xs font-bold uppercase tracking-wider text-white/45">Outstanding balance</p><p className="mt-2 text-4xl font-black">{money(feeBalance)}</p><p className="mt-2 text-xs text-white/55">Confirm the latest balance with the school finance office before making payment.</p></div><div className="mt-7"><h3 className="text-sm font-bold text-[#061229]">Payment history</h3>{payments.length ? <div className="mt-3 divide-y divide-slate-100">{payments.map((p,i)=><div key={`${p.reference}-${i}`} className="flex items-center justify-between gap-4 py-4"><div><p className="text-xs font-bold text-[#061229]">{p.reference}</p><p className="mt-1 text-[11px] text-slate-400">{dateText(p.date)}</p></div><p className="text-sm font-black text-emerald-700">{money(p.amount)}</p></div>)}</div> : <p className="mt-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No payment history has been published for this learner account.</p>}</div></Card><Card className="p-6"><IconBox><ReceiptText size={21}/></IconBox><h2 className="mt-5 font-serif text-2xl font-semibold text-[#061229]">Need a receipt?</h2><p className="mt-3 text-sm leading-6 text-slate-500">Request confirmation of a school payment through the administration office. Include the learner's admission number and payment reference.</p><a href={`https://wa.me/254142550882?text=${encodeURIComponent(`Hello Menwe School, I would like to request a fee receipt. Learner: ${name}; Admission No: ${admission}.`)}`} target="_blank" rel="noreferrer" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D89B28] px-5 py-3.5 text-xs font-extrabold text-[#061229]"><MessageCircle size={17}/> Request Fee Receipt via WhatsApp</a><div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">Recorded payments in this dashboard: <strong className="text-[#061229]">{money(totalPaid)}</strong></div></Card></section>}
        {tab === "reports" && <section className="mt-6"><Card className="p-6"><Pill>Academic records</Pill><h2 className="mt-4 font-serif text-3xl font-semibold text-[#061229]">Termly report cards</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Download reports published to your authorised learner account. Conduct records and teacher remarks are included where the school has released them.</p><div className="mt-7 grid gap-4 md:grid-cols-2">{reports.length ? reports.map((report,i)=><div key={`${report.title}-${i}`} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4"><div className="flex items-center gap-3"><IconBox><FileText size={19}/></IconBox><div><p className="text-sm font-bold text-[#061229]">{report.title}</p><p className="mt-1 text-[11px] text-slate-400">{report.term}{report.date ? ` · ${dateText(report.date)}` : ""}</p></div></div>{report.url ? <a href={report.url} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-xl bg-[#061229] text-white" aria-label={`Download ${report.title}`}><Download size={16}/></a> : <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-400">Online only</span>}</div>) : <div className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500 md:col-span-2">No termly reports have been published to this account yet. Once the school releases a report, it will appear here.</div>}</div></Card></section>}
        {tab === "announcements" && <section className="mt-6 grid gap-4 md:grid-cols-2">{announcements.length ? announcements.map((a,i)=><Card key={`${a.title}-${i}`} className="p-6"><div className="flex items-start justify-between gap-4"><IconBox><Bell size={20}/></IconBox><span className="text-[10px] font-bold text-slate-400">{dateText(a.date)}</span></div><h2 className="mt-5 font-serif text-2xl font-semibold text-[#061229]">{a.title}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{a.message}</p><div className="mt-5 border-t border-slate-100 pt-4 text-xs font-bold text-[#061229]">{a.author}</div></Card>) : <Card className="p-8 md:col-span-2"><Pill>School administration</Pill><h2 className="mt-4 font-serif text-3xl font-semibold text-[#061229]">Announcements will appear here.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">Published notices from Principal Mr. Simon Muriungi Muthemba, Deputy Principal Mr. Patrick Kimathi and authorised school administrators will be shown on this tab.</p></Card>}
        </section>}
        <section className="mt-10 rounded-2xl bg-[#061229] p-7 text-white"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><Pill>Menwe support</Pill><h2 className="mt-3 font-serif text-2xl font-semibold">Need help with your portal account?</h2><p className="mt-2 text-sm leading-6 text-white/60">Call 0142550882 or visit the ICT desk at Menwe Primary & Junior School, Kionyo.</p></div><a href="tel:0142550882" className="inline-flex items-center gap-2 rounded-xl bg-[#D89B28] px-5 py-3 text-xs font-extrabold text-[#061229]"><ShieldCheck size={16}/> Contact ICT support</a></div></section>
      </div>
    </main>
  </PublicLayout>;
}
