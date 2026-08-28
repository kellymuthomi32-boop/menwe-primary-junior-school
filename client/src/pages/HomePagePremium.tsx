import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, GraduationCap, HeartHandshake, Images, LockKeyhole, MessageCircle, NotebookPen, Sparkles, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getPublishedPage, listPublished } from "@/lib/database";

type Content = { title: string; headline: string | null; body: Record<string, unknown> } | null;

function usePage(slug: string) {
  const [content, setContent] = useState<Content>(null);
  useEffect(() => { let active = true; void getPublishedPage(slug).then(value => active && setContent(value)).catch(() => {}); return () => { active = false; }; }, [slug]);
  return content;
}

const features = [
  { icon: GraduationCap, kicker: "Learning", title: "A complete academic journey", text: "Keep academics, assessments, homework, timetables and report cards connected in one clear experience.", path: "/academics" },
  { icon: HeartHandshake, kicker: "Family", title: "Closer school–home connection", text: "Give families a simple, secure way to stay connected with attendance, progress, communication and school life.", path: "/portal/login" },
  { icon: ClipboardCheck, kicker: "Operations", title: "Confident school operations", text: "Bring enrolment, attendance, finance, admissions and everyday administration into one accountable system.", path: "/portal/login" },
  { icon: MessageCircle, kicker: "Communication", title: "Everyone stays in the loop", text: "Purpose-built messaging and notifications help the right information reach the right people.", path: "/portal/login" },
];

function FeatureCard({ item }: { item: typeof features[number] }) {
  const [, go] = useLocation(); const Icon = item.icon;
  return <button onClick={() => go(item.path)} className="group relative overflow-hidden rounded-[1.75rem] border border-[var(--ink)]/8 bg-white p-6 text-left shadow-[0_12px_35px_rgba(29,43,37,.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(29,43,37,.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:p-7">
    <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-[var(--gold)]/15 blur-2xl transition group-hover:scale-150" />
    <div className="relative flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mist)] text-[var(--accent)]"><Icon size={21} strokeWidth={1.8} /></span><ChevronRight size={18} className="text-[var(--ink)]/25 transition group-hover:translate-x-1 group-hover:text-[var(--accent)]" /></div>
    <p className="relative mt-8 text-[10px] font-extrabold uppercase tracking-[.2em] text-[var(--accent)]">{item.kicker}</p><h3 className="relative mt-2 font-serif text-[1.55rem] font-semibold leading-tight tracking-tight">{item.title}</h3><p className="relative mt-3 text-sm leading-6 text-[var(--ink)]/60">{item.text}</p>
  </button>;
}

export default function HomePagePremium() {
  const [, go] = useLocation(); const home = usePage("home"); const [news, setNews] = useState<Record<string, unknown>[]>([]);
  useEffect(() => { let active = true; void listPublished("news_articles", 0).then(result => active && setNews(result.data.slice(0, 3))).catch(() => {}); return () => { active = false; }; }, []);
  const headline = home?.headline || "A thoughtful foundation for every learner.";
  const intro = typeof home?.body?.content === "string" ? home.body.content : "A modern school experience built around learning, belonging and confident everyday progress.";
  return <PublicLayout>
    <main>
      <section className="relative isolate overflow-hidden bg-[var(--mist)]">
        <div className="pointer-events-none absolute -right-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-[var(--gold)]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-56 -left-32 h-[32rem] w-[32rem] rounded-full bg-[var(--sage)]/35 blur-3xl" />
        <div className="mx-auto grid min-h-[690px] max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ink)]/10 bg-white/70 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[.2em] text-[var(--accent)] shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-[var(--sage)]" /> Menwe Primary & Junior School</div>
            <h1 className="mt-7 max-w-4xl font-serif text-[3.35rem] font-semibold leading-[.96] tracking-[-.045em] text-[var(--ink)] sm:text-6xl lg:text-[5.25rem]">{headline}</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--ink)]/65">{intro}</p>
            <div className="mt-9 flex flex-wrap gap-3"><button onClick={() => go("/admissions")} className="group inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-[var(--ink)]/15 transition hover:-translate-y-0.5 hover:shadow-2xl">Start an application <ArrowRight size={17} className="transition group-hover:translate-x-1" /></button><button onClick={() => go("/about")} className="inline-flex items-center gap-2 rounded-full border border-[var(--ink)]/12 bg-white/65 px-6 py-3.5 text-sm font-bold text-[var(--ink)] transition hover:bg-white">Discover Menwe</button></div>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs font-semibold text-[var(--ink)]/55"><span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[var(--accent)]" /> Secure by role</span><span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[var(--accent)]" /> Connected school life</span><span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[var(--accent)]" /> Built for families</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-[520px] lg:justify-self-end">
            <div className="absolute -inset-5 rounded-[3rem] bg-white/35 blur-xl" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/55 p-3 shadow-[0_35px_90px_rgba(29,43,37,.16)] backdrop-blur-xl">
              <div className="overflow-hidden rounded-[2rem] bg-[var(--ink)] text-white">
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-5"><div><p className="font-serif text-xl">The Menwe experience</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.18em] text-white/45">Learning • Family • Community</p></div><div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"><Sparkles size={18} className="text-[var(--gold)]" /></div></div>
                <div className="grid gap-3 p-4 sm:grid-cols-2"><div className="rounded-2xl bg-white/[.07] p-5"><BookOpen size={22} className="text-[var(--gold)]" /><p className="mt-7 font-serif text-xl">Learning</p><p className="mt-1 text-xs leading-5 text-white/50">Academics, homework & results</p></div><div className="rounded-2xl bg-white/[.07] p-5"><UsersRound size={22} className="text-[var(--gold)]" /><p className="mt-7 font-serif text-xl">Families</p><p className="mt-1 text-xs leading-5 text-white/50">Attendance, fees & communication</p></div><div className="rounded-2xl bg-white/[.07] p-5"><NotebookPen size={22} className="text-[var(--gold)]" /><p className="mt-7 font-serif text-xl">Progress</p><p className="mt-1 text-xs leading-5 text-white/50">Clear records that stay connected</p></div><div className="rounded-2xl bg-white/[.07] p-5"><LockKeyhole size={22} className="text-[var(--gold)]" /><p className="mt-7 font-serif text-xl">Protected</p><p className="mt-1 text-xs leading-5 text-white/50">Access shaped by each role</p></div></div>
                <div className="mx-4 mb-4 rounded-2xl bg-[var(--gold)]/15 p-4"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.16em] text-[var(--gold)]">One connected platform</span><ArrowRight size={16} className="text-[var(--gold)]" /></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="max-w-2xl"><p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-[var(--accent)]">More than a school website</p><h2 className="mt-4 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">A digital home for the whole school.</h2><p className="mt-5 text-base leading-7 text-[var(--ink)]/60">The public experience and secure school portal are designed to work together — helping the school communicate clearly while keeping sensitive information protected.</p></div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{features.map(item => <FeatureCard key={item.title} item={item} />)}</div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[.8fr_1.2fr] lg:px-8 lg:py-28">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-[var(--accent)]">Built around people</p><h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Every role gets a clearer view.</h2><p className="mt-5 max-w-md text-base leading-7 text-[var(--ink)]/60">From the classroom to the family home, each person sees the information and actions relevant to them.</p><button onClick={() => go("/portal/login")} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[var(--accent)]">Explore the secure portal <ArrowRight size={16} /></button></div>
          <div className="grid gap-3 sm:grid-cols-2"><RoleCard icon={GraduationCap} title="Students" text="A focused view of learning, attendance, homework, results and timetable." /><RoleCard icon={HeartHandshake} title="Parents" text="A connected view of children, school communication, progress and fees." /><RoleCard icon={UsersRound} title="Teachers" text="The tools needed to teach, track attendance, manage learning and communicate." /><RoleCard icon={ClipboardCheck} title="School leaders" text="Clear oversight across people, academics, finance, admissions and operations." /></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-[var(--accent)]">From the school</p><h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight">Latest news & notices</h2></div><button onClick={() => go("/news")} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--accent)]">View all updates <ArrowRight size={16} /></button></div>
        {news.length ? <div className="mt-9 grid gap-5 md:grid-cols-3">{news.map(item => <article key={String(item.id)} className="rounded-[1.75rem] border border-[var(--ink)]/8 bg-white p-6 shadow-[0_10px_30px_rgba(29,43,37,.04)]"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-[var(--accent)]"><CalendarDays size={14} /> School update</div><h3 className="mt-5 font-serif text-2xl font-semibold leading-tight">{String(item.title)}</h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--ink)]/58">{String(item.excerpt ?? item.description ?? "Read the latest published update from Menwe.")}</p></article>)}</div> : <div className="mt-9 rounded-[2rem] border border-dashed border-[var(--ink)]/12 bg-[var(--mist)] p-10 text-center"><Images className="mx-auto text-[var(--accent)]" size={27} /><p className="mt-4 font-serif text-2xl font-semibold">News will appear here when published.</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--ink)]/55">The homepage never invents school updates. Published content from the school appears automatically.</p></div>}
      </section>

      <section className="px-5 pb-20 lg:px-8 lg:pb-28"><div className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[var(--ink)] px-7 py-12 text-white shadow-[0_30px_70px_rgba(29,43,37,.16)] sm:px-12 lg:flex lg:items-center lg:justify-between lg:px-16"><div><p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-[var(--gold)]">Ready when your family is</p><h2 className="mt-4 max-w-2xl font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Take the next step with Menwe.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-white/60">Explore the school, begin an application, or access the secure portal.</p></div><div className="mt-8 flex flex-wrap gap-3 lg:mt-0"><button onClick={() => go("/admissions")} className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-6 py-3.5 text-sm font-bold text-[var(--ink)]">Apply to Menwe <ArrowRight size={16} /></button><button onClick={() => go("/contact")} className="rounded-full border border-white/15 bg-white/10 px-6 py-3.5 text-sm font-bold text-white">Contact the school</button></div></div></section>
    </main>
  </PublicLayout>;
}

function RoleCard({ icon: Icon, title, text }: { icon: typeof GraduationCap; title: string; text: string }) { return <div className="group rounded-[1.6rem] border border-[var(--ink)]/8 bg-[var(--paper)] p-6 transition hover:-translate-y-0.5 hover:shadow-lg"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[var(--accent)] shadow-sm"><Icon size={19} /></span><h3 className="mt-6 font-serif text-xl font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--ink)]/58">{text}</p></div>; }
