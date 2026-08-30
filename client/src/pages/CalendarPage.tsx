import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Flag, GraduationCap, Loader2, Trophy } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { supabaseClient } from "@/lib/supabaseClient";

const card = "rounded-2xl border border-gray-100 bg-white shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900";
const icon = "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229] dark:bg-white/10 dark:text-[#D89B28]";

type Term = { name: string; dates: string; weeks: string; break: string; holiday: string; tone: string; items: string[] };
type LiveEvent = { id: string; title: string; description: string | null; starts_at: string; ends_at: string };

const terms: Term[] = [
  { name: "Term 1", dates: "5 January – 2 April 2026", weeks: "13 weeks", break: "25 February – 1 March", holiday: "7 – 24 April", tone: "Foundation & transition", items: ["Learner orientation and class organisation", "CBC teaching, continuous assessment and projects", "Mid-term break and learner welfare follow-up", "End-of-term assessment and progress review", "Closing communication and April holiday preparation"] },
  { name: "Term 2", dates: "27 April – 31 July 2026", weeks: "14 weeks", break: "24 – 28 June", holiday: "3 – 21 August", tone: "Growth & application", items: ["Continuation of CBC learning and competency development", "Co-curricular activities, clubs and practical projects", "Mid-term break and family engagement", "End-of-term assessment, reports and review", "Closing programme and August holiday"] },
  { name: "Term 3", dates: "24 August – 23 October 2026", weeks: "9 weeks", break: "No national half-term break", holiday: "From 26 October", tone: "Completion & transition", items: ["Curriculum completion, revision and learner support", "Practical projects and co-curricular consolidation", "End-of-year competency assessment and reporting", "Prize-giving, recognition and transition activities", "Year-end closing and holiday planning"] },
];

const events = [
  { icon: Trophy, title: "Annual Sports Day", period: "Term 2", text: "A whole-school celebration of athletics, games, teamwork, discipline, fitness and healthy competition. The administration publishes the final date through official family communication." },
  { icon: GraduationCap, title: "JSS Science & Tech Fair", period: "Term 2 / Term 3", text: "Grades 7–9 learners present experiments, investigations, digital work, prototypes and practical problem-solving projects." },
  { icon: Flag, title: "Prize-Giving Day", period: "Term 3", text: "A recognition occasion for academic progress, effort, character, leadership, talent and co-curricular achievement." },
  { icon: CalendarDays, title: "PTA General Meeting", period: "Each academic year", text: "Families, school leadership and educators meet to discuss learner welfare, academic progress, programme priorities and community support." },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default function CalendarPage() {
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveMessage, setLiveMessage] = useState("Checking the school calendar for published events…");

  useEffect(() => {
    let active = true;
    const loadEvents = async () => {
      if (!supabaseClient) { if (active) { setLoading(false); setLiveMessage("The published school calendar is shown below. Live event sync will appear when Supabase is configured."); } return; }
      const { data, error } = await supabaseClient.from("events").select("id,title,description,starts_at,ends_at").gte("starts_at", "2026-01-01T00:00:00Z").lte("starts_at", "2026-12-31T23:59:59Z").order("starts_at", { ascending: true }).limit(24);
      if (!active) return;
      if (error) { setLiveMessage("The published school calendar could not be reached. The school’s reference calendar remains available below."); }
      else { setLiveEvents((data ?? []) as LiveEvent[]); setLiveMessage(data?.length ? "Published school events from the live calendar." : "No additional school-specific events are currently published. The reference calendar remains available below."); }
      setLoading(false);
    };
    void loadEvents();
    return () => { active = false; };
  }, []);

  return <PublicLayout><main>
    <section className="relative overflow-hidden bg-[#061229] text-white"><div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#D89B28]/15 blur-3xl" /><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><div className="max-w-4xl"><div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-[#D89B28]"><CalendarDays size={15}/> 2026 Academic Calendar</div><h1 className="mt-6 font-serif text-5xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">Plan the year with confidence.</h1><p className="mt-7 max-w-3xl text-lg leading-8 text-white/70">Menwe Primary & Junior School coordinates teaching, assessment, family engagement, co-curricular activity and school events around the Kenyan basic-education calendar.</p><div className="mt-9 flex flex-wrap gap-3 text-sm font-semibold"><span className="rounded-full bg-[#D89B28] px-4 py-2 text-[#061229]">Kionyo · Abogeta Sub-County</span><span className="rounded-full border border-white/15 px-4 py-2 text-white/80">Primary & JSS · CBC</span></div></div></div></section>

    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#D89B28]">Three-term structure</p><h2 className="mt-3 font-serif text-4xl font-semibold text-[#061229] dark:text-white sm:text-5xl">A clear rhythm for learners and families.</h2><p className="mt-5 text-base leading-8 text-slate-600 dark:text-slate-300">The reference dates below provide the annual framework. School-specific assessment and ceremony dates are confirmed by the administration through official communication.</p></div><div className="mt-10 grid gap-6 lg:grid-cols-3">{terms.map((term,index)=><article className={`${card} overflow-hidden`} key={term.name}><div className="bg-[#061229] px-7 py-7 text-white"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#D89B28]">0{index+1}</p><h3 className="mt-2 font-serif text-3xl font-semibold">{term.name}</h3></div><div className="rounded-xl bg-white/10 p-3"><CalendarDays size={21} className="text-[#D89B28]"/></div></div><p className="mt-5 text-base font-semibold">{term.dates}</p><p className="mt-1 text-sm text-white/55">{term.weeks} · {term.tone}</p></div><div className="p-7"><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#F8F9FA] p-4 dark:bg-slate-800"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Mid-term</p><p className="mt-2 text-sm font-bold text-[#061229] dark:text-white">{term.break}</p></div><div className="rounded-xl bg-[#F8F9FA] p-4 dark:bg-slate-800"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Holiday</p><p className="mt-2 text-sm font-bold text-[#061229] dark:text-white">{term.holiday}</p></div></div><ul className="mt-7 space-y-4">{term.items.map(item=><li key={item} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300"><CheckCircle2 className="mt-0.5 shrink-0 text-[#D89B28]" size={17}/>{item}</li>)}</ul></div></article>)}</div></section>

    <section className="bg-[#F8F9FA] dark:bg-slate-950"><div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#D89B28]">Live school calendar</p><h2 className="mt-3 font-serif text-4xl font-semibold text-[#061229] dark:text-white">Published events from Menwe.</h2></div>{loading && <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300"><Loader2 size={15} className="animate-spin"/> Checking Supabase</span>}</div><p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300">{liveMessage}</p>{liveEvents.length>0 && <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{liveEvents.map(event=><article className={`${card} p-6`} key={event.id}><p className="text-xs font-bold uppercase tracking-wide text-[#D89B28]">{formatDate(event.starts_at)}</p><h3 className="mt-3 font-serif text-2xl font-semibold text-[#061229] dark:text-white">{event.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{event.description || "Published school event."}</p></article>)}</div>}</div></section>

    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#D89B28]">Major annual events</p><h2 className="mt-3 font-serif text-4xl font-semibold text-[#061229] dark:text-white sm:text-5xl">Learning is also a community experience.</h2></div><div className="mt-10 grid gap-5 md:grid-cols-2">{events.map(({icon:EventIcon,title,period,text})=><article className={`${card} p-7`} key={title}><div className="flex items-start justify-between gap-4"><div className={icon}><EventIcon size={21}/></div><span className="rounded-full bg-[#D89B28]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#D89B28]">{period}</span></div><h3 className="mt-6 font-serif text-2xl font-semibold text-[#061229] dark:text-white">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{text}</p></article>)}</div></section>

    <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-8"><div className="grid gap-6 lg:grid-cols-[1.4fr_.6fr]"><div className="rounded-2xl bg-[#061229] p-8 text-white shadow-md lg:p-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Family planning</p><h2 className="mt-4 font-serif text-3xl font-semibold">Keep the school year visible at home.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">For date changes or school-specific activities, families should rely on the latest official communication from Menwe rather than an old calendar copy.</p></div><div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-md dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#D89B28]">School office</p><p className="mt-4 text-2xl font-bold text-[#061229] dark:text-white">0142550882</p><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">P.O. Box 19, Kionyo<br/>Menwe Primary & Junior School<br/>Meru County, Kenya</p></div></div></section>
  </main></PublicLayout>;
}
