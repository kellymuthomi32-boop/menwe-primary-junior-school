import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, Compass, GraduationCap, HeartHandshake, Images, LockKeyhole, MessageCircle, NotebookPen, Quote, ShieldCheck, Sparkles, Star, UsersRound, WalletCards } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getPublishedPage, listPublished } from "@/lib/database";
import "@/styles/hero-carousel.css";

type Content = { title: string; headline: string | null; body: Record<string, unknown> } | null;
type NewsItem = Record<string, unknown>;

function usePage(slug: string) {
  const [content, setContent] = useState<Content>(null);
  useEffect(() => {
    let active = true;
    void getPublishedPage(slug).then(value => active && setContent(value)).catch(() => {});
    return () => { active = false; };
  }, [slug]);
  return content;
}

const features = [
  { icon: GraduationCap, kicker: "Learning", title: "A connected learning journey", text: "Academics, homework, assessments and report cards share one clear source of truth.", path: "/academics" },
  { icon: HeartHandshake, kicker: "Family", title: "A calmer school–home rhythm", text: "Families can follow attendance, progress, fees, homework and communication in one place.", path: "/portal/login" },
  { icon: Compass, kicker: "Operations", title: "School operations, without the noise", text: "Admissions, enrolment, attendance and staff workflows stay structured and accountable.", path: "/portal/login" },
  { icon: MessageCircle, kicker: "Communication", title: "The right message, to the right person", text: "Keep school conversations and notifications focused, private and easy to follow.", path: "/portal/login" },
  { icon: WalletCards, kicker: "Finance", title: "Financial clarity", text: "Charges, payments, allocations and balances remain connected for authorised users.", path: "/portal/login" },
  { icon: ShieldCheck, kicker: "Trust", title: "Privacy built into the experience", text: "Role-aware access helps protect student, family, academic and financial information.", path: "/about" },
  { icon: ClipboardCheck, kicker: "Attendance", title: "Attendance that stays current", text: "Teachers record daily attendance against real enrolments, with a clear trail of changes.", path: "/portal/login" },
  { icon: NotebookPen, kicker: "Homework", title: "From assignment to feedback", text: "Learning tasks can move from teacher creation to student submission and feedback without fragmentation.", path: "/portal/login" },
  { icon: CalendarDays, kicker: "Timetable", title: "A shared rhythm for the week", text: "Classes, subjects and teachers come together in an organised timetable for each role.", path: "/portal/login" },
];

function FeatureCard({ item, featured = false }: { item: typeof features[number]; featured?: boolean }) {
  const [, go] = useLocation();
  const Icon = item.icon;
  return (
    <button type="button" aria-label={`Explore ${item.title}`} onClick={() => go(item.path)} className={`menwe-feature group relative overflow-hidden rounded-[1.6rem] border border-[var(--ink)]/9 bg-white p-6 text-left transition duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${featured ? "min-h-[310px] sm:p-8" : "min-h-[270px]"}`}>
      <span className="menwe-feature-orb" aria-hidden="true" />
      <div className="relative flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)] transition duration-500 group-hover:scale-110 group-hover:rotate-3"><Icon size={20} strokeWidth={1.8} /></span><ChevronRight size={16} className="text-[var(--ink)]/20 transition duration-300 group-hover:translate-x-1 group-hover:text-[var(--accent)]" /></div>
      <p className="relative mt-9 text-[9px] font-extrabold uppercase tracking-[.22em] text-[var(--accent)]">{item.kicker}</p>
      <h3 className={`relative mt-2 font-serif font-semibold leading-[1.05] tracking-tight ${featured ? "text-3xl sm:text-[2.1rem]" : "text-[1.55rem]"}`}>{item.title}</h3>
      <p className="relative mt-3 max-w-md text-sm leading-6 text-[var(--ink)]/58">{item.text}</p>
      <span className="relative mt-6 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-[var(--ink)]/40 transition group-hover:gap-3 group-hover:text-[var(--accent)]">Explore <ArrowRight size={13} /></span>
    </button>
  );
}

function RoleCard({ icon: Icon, title, text, tag }: { icon: typeof GraduationCap; title: string; text: string; tag: string }) {
  return <div className="menwe-role group relative overflow-hidden rounded-[1.4rem] border border-[var(--ink)]/8 bg-white/70 p-6 transition duration-500 hover:-translate-y-1 hover:bg-white"><div className="flex items-center justify-between gap-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)] transition group-hover:scale-105"><Icon size={18} /></span><span className="rounded-full bg-[var(--mist)] px-3 py-1 text-[9px] font-extrabold uppercase tracking-[.15em] text-[var(--accent)]">{tag}</span></div><h3 className="mt-6 font-serif text-xl font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--ink)]/58">{text}</p></div>;
}

const heroImages = [
  ["/hero-learning.svg", "Learning", "Curiosity in motion"],
  ["/hero-science.svg", "Discovery", "Questions become ideas"],
  ["/hero-sport.svg", "Sport", "Confidence beyond class"],
  ["/hero-arts.svg", "Creativity", "Make, express, explore"],
  ["/hero-community.svg", "Community", "Belonging matters"],
] as const;

function PremiumHeroCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) => trackRef.current?.scrollBy({ left: direction * 190, behavior: "smooth" });
  return (
    <div className="menwe-hero-carousel" aria-label="Menwe school life highlights">
      <div className="menwe-hero-stage">
        <button type="button" aria-label="Show previous school highlight" className="menwe-hero-arrow menwe-hero-arrow-left" onClick={() => scroll(-1)}>‹</button>
        <div ref={trackRef} className="menwe-hero-track" tabIndex={0}>
          {[...heroImages, ...heroImages].map(([src, title, copy], index) => <div className="menwe-hero-card" key={`${src}-${index}`}><img src={src} alt={`${title}: ${copy}`} loading={index < 5 ? "eager" : "lazy"} /><div className="menwe-hero-card-label"><strong>{title}</strong><span>{copy}</span></div></div>)}
        </div>
        <button type="button" aria-label="Show next school highlight" className="menwe-hero-arrow menwe-hero-arrow-right" onClick={() => scroll(1)}>›</button>
        <div className="menwe-hero-dots" aria-hidden="true"><span className="menwe-hero-dot active" /><span className="menwe-hero-dot" /><span className="menwe-hero-dot" /><span className="menwe-hero-dot" /><span className="menwe-hero-dot" /></div>
      </div>
    </div>
  );
}

const workflow = [
  { step: "01", title: "Set the foundation", text: "Academic periods, terms, classes, subjects and staff establish the school's structure." },
  { step: "02", title: "Connect people", text: "Students, parents and teachers are linked through real enrolments and authorised assignments." },
  { step: "03", title: "Run the day", text: "Attendance, homework, timetable, communication and admissions support everyday school life." },
  { step: "04", title: "See progress", text: "Exams, results, report cards and finance turn activity into useful, accountable records." },
];

export default function HomePagePremium() {
  const [, go] = useLocation();
  const home = usePage("home");
  const [news, setNews] = useState<NewsItem[]>([]);
  useEffect(() => { let active = true; void listPublished("news_articles", 0).then(result => active && setNews(result.data.slice(0, 3))).catch(() => {}); return () => { active = false; }; }, []);
  const headline = home?.headline || "A beautiful beginning for every learner.";
  const intro = typeof home?.body?.content === "string" ? home.body.content : "A modern school experience shaped around curiosity, belonging and confident progress — with the digital tools to keep the whole community connected.";

  return (
    <PublicLayout>
      <main className="overflow-hidden bg-[var(--paper)]">
        <section className="menwe-hero relative isolate overflow-hidden bg-[var(--ink)] text-white">
          <div className="menwe-grid pointer-events-none absolute inset-0 opacity-30" /><div className="menwe-aurora menwe-aurora-one" /><div className="menwe-aurora menwe-aurora-two" /><div className="menwe-aurora menwe-aurora-three" />
          <div className="relative mx-auto grid min-h-[760px] max-w-[1440px] items-center gap-10 px-5 py-20 lg:grid-cols-[.82fr_1.18fr] lg:px-10 lg:py-24">
            <div className="relative z-10 menwe-reveal lg:pr-4"><div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[.065] px-4 py-2 text-[9px] font-extrabold uppercase tracking-[.22em] text-white/72 backdrop-blur-xl"><span className="menwe-live-dot" /> Menwe Primary & Junior School <Sparkles size={12} className="text-[var(--gold)]" /></div><h1 className="mt-7 max-w-3xl font-serif text-[3.45rem] font-semibold leading-[.91] tracking-[-.06em] sm:text-6xl lg:text-[5.7rem]">{headline}</h1><div className="mt-5 inline-flex items-center gap-3 text-lg font-semibold text-[var(--gold)] sm:text-xl"><span className="h-px w-8 bg-[var(--gold)]" /> Inspire. Empower. Thrive.</div><p className="mt-7 max-w-xl text-base leading-7 text-white/60 sm:text-lg sm:leading-8">{intro}</p><div className="mt-9 flex flex-wrap gap-3"><button type="button" onClick={() => go("/admissions")} className="menwe-glow-button group inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-6 py-3.5 text-sm font-extrabold text-[var(--ink)] transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Start an application <ArrowRight size={17} className="transition group-hover:translate-x-1" /></button><button type="button" onClick={() => go("/about")} className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[.055] px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Discover Menwe</button></div><div className="mt-8 flex flex-wrap gap-2"><span className="menwe-trust-chip"><CheckCircle2 size={14} className="text-[var(--gold)]" /> Safe, caring environment</span><span className="menwe-trust-chip"><CheckCircle2 size={14} className="text-[var(--gold)]" /> Strong foundations</span><span className="menwe-trust-chip"><CheckCircle2 size={14} className="text-[var(--gold)]" /> Family connection</span></div></div>
            <div className="relative z-10 w-full menwe-reveal" style={{ animationDelay: "120ms" }}><div className="absolute -inset-8 rounded-[4rem] bg-[var(--gold)]/[.05] blur-3xl" /><div className="relative rounded-[2.7rem] border border-white/10 bg-white/[.045] p-3 shadow-[0_45px_120px_rgba(0,0,0,.35)] backdrop-blur-2xl"><div className="flex items-center justify-between px-3 pb-2 sm:px-5"><div><p className="font-serif text-xl font-semibold">Life at Menwe</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[.18em] text-white/35">Learning · discovery · belonging</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.07] text-[var(--gold)]"><Images size={18} /></span></div><PremiumHeroCarousel /></div><div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[.055] px-3 py-1.5 text-[8px] font-extrabold uppercase tracking-[.17em] text-white/35"><span className="menwe-live-dot" /> Moving school stories</div></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 border-t border-white/8 bg-white/[.025]"><div className="menwe-marquee mx-auto flex max-w-[1440px] gap-10 overflow-hidden px-5 py-4 text-[9px] font-extrabold uppercase tracking-[.28em] text-white/32"><span>Learning</span><span>•</span><span>Belonging</span><span>•</span><span>Progress</span><span>•</span><span>Family</span><span>•</span><span>Community</span><span>•</span><span>Confidence</span><span>•</span><span>Learning</span><span>•</span><span>Belonging</span></div></div>
        </section>

        <section className="relative mx-auto max-w-[1440px] px-5 py-24 lg:px-10 lg:py-32"><div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr] lg:items-end"><div><p className="text-[9px] font-extrabold uppercase tracking-[.25em] text-[var(--accent)]">The product, at a glance</p><h2 className="mt-4 max-w-xl font-serif text-4xl font-semibold leading-[1.02] tracking-[-.035em] sm:text-6xl">Everything important, connected beautifully.</h2></div><p className="max-w-xl text-base leading-7 text-[var(--ink)]/55 lg:pb-2">A school should not have to feel like a collection of disconnected tools. Menwe gives each part of school life a clear place — while keeping the relationships between them intact.</p></div><div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map((item, index) => <FeatureCard key={item.title} item={item} featured={index === 0} />)}</div></section>

        <section className="relative overflow-hidden bg-[var(--mist)]"><div className="menwe-section-glow" /><div className="mx-auto max-w-[1440px] px-5 py-24 lg:px-10 lg:py-32"><div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]"><div className="relative z-10"><p className="text-[9px] font-extrabold uppercase tracking-[.25em] text-[var(--accent)]">Designed around people</p><h2 className="mt-4 font-serif text-4xl font-semibold leading-[1.02] tracking-[-.035em] sm:text-6xl">One platform. Different perspectives.</h2><p className="mt-6 max-w-md text-base leading-7 text-[var(--ink)]/55">The same school, thoughtfully reframed for the people who learn, teach, lead and care.</p><button type="button" onClick={() => go("/portal/login")} className="mt-8 inline-flex items-center gap-2 text-sm font-extrabold text-[var(--accent)] transition hover:gap-3">Enter the secure portal <ArrowRight size={16} /></button></div><div className="grid gap-4 sm:grid-cols-2"><RoleCard icon={GraduationCap} title="Students" tag="Learn" text="A focused home for learning, homework, attendance, results and timetable." /><RoleCard icon={HeartHandshake} title="Parents" tag="Connect" text="A calm view of children, progress, communication, fees and school life." /><RoleCard icon={UsersRound} title="Teachers" tag="Teach" text="Tools to teach, track attendance, manage learning and stay connected." /><RoleCard icon={Compass} title="School leaders" tag="Lead" text="Clear oversight across people, academics, finance, admissions and operations." /></div></div></div></section>

        <section className="mx-auto max-w-[1440px] px-5 py-24 lg:px-10 lg:py-32"><div className="grid gap-14 lg:grid-cols-[.78fr_1.22fr] lg:items-start"><div><p className="text-[9px] font-extrabold uppercase tracking-[.25em] text-[var(--accent)]">How it comes together</p><h2 className="mt-4 max-w-lg font-serif text-4xl font-semibold leading-[1.02] tracking-[-.035em] sm:text-6xl">From foundation to a living school record.</h2><p className="mt-6 max-w-md text-base leading-7 text-[var(--ink)]/55">Every workflow builds on the same relationships, so information can travel with the learner instead of being re-entered again and again.</p></div><div className="relative"><div className="absolute bottom-8 left-[19px] top-8 w-px bg-[var(--ink)]/10" />{workflow.map(item => <div key={item.step} className="group relative grid grid-cols-[40px_1fr] gap-6 pb-10 last:pb-0"><span className="relative z-10 grid h-10 w-10 place-items-center rounded-full border border-[var(--ink)]/10 bg-[var(--paper)] font-mono text-[9px] font-bold text-[var(--accent)] transition group-hover:border-[var(--accent)]/35 group-hover:bg-[var(--mist)]">{item.step}</span><div className="pt-1"><h3 className="font-serif text-2xl font-semibold">{item.title}</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink)]/55">{item.text}</p></div></div>)}</div></div></section>

        <section className="relative overflow-hidden bg-[var(--ink)] text-white"><div className="menwe-noise" /><div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-24 lg:grid-cols-[1fr_.72fr] lg:px-10 lg:py-32"><div className="relative z-10"><p className="text-[9px] font-extrabold uppercase tracking-[.25em] text-[var(--gold)]">Built for trust</p><h2 className="mt-4 max-w-2xl font-serif text-4xl font-semibold leading-[1.02] tracking-[-.035em] sm:text-6xl">Quiet technology. Clear school life.</h2><p className="mt-6 max-w-xl text-base leading-7 text-white/52">Good software should disappear into the work. Menwe keeps the interface calm while the underlying records, permissions and workflows stay precise.</p><div className="mt-9 flex flex-wrap gap-3"><span className="menwe-trust-chip"><ShieldCheck size={15} /> Role-aware access</span><span className="menwe-trust-chip"><LockKeyhole size={15} /> Protected records</span><span className="menwe-trust-chip"><CheckCircle2 size={15} /> Connected workflows</span></div></div><div className="relative z-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><div className="menwe-dark-panel"><Star size={16} className="text-[var(--gold)]" /><div><p className="text-sm font-semibold">A product that respects attention</p><p className="mt-1 text-xs leading-5 text-white/42">Clear hierarchy, restrained motion and purposeful actions.</p></div></div><div className="menwe-dark-panel"><MessageCircle size={16} className="text-[var(--gold)]" /><div><p className="text-sm font-semibold">Communication with context</p><p className="mt-1 text-xs leading-5 text-white/42">Messages and notifications stay connected to the people who need them.</p></div></div><div className="menwe-dark-panel"><Images size={16} className="text-[var(--gold)]" /><div><p className="text-sm font-semibold">A public story, safely separated</p><p className="mt-1 text-xs leading-5 text-white/42">Published school content can shine without exposing private school records.</p></div></div></div></div></section>

        {news.length > 0 && <section className="mx-auto max-w-[1440px] px-5 py-24 lg:px-10 lg:py-32"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-[9px] font-extrabold uppercase tracking-[.25em] text-[var(--accent)]">From the school</p><h2 className="mt-4 font-serif text-4xl font-semibold tracking-[-.03em] sm:text-5xl">What’s happening at Menwe.</h2></div><button type="button" onClick={() => go("/news")} className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--accent)]">View all news <ArrowRight size={15} /></button></div><div className="mt-12 grid gap-4 md:grid-cols-3">{news.map((item, index) => <button type="button" key={String(item.id ?? index)} onClick={() => go("/news")} className="menwe-news-card group text-left"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[var(--accent)]"><Quote size={15} /></span><span className="font-mono text-[9px] text-[var(--ink)]/30">0{index + 1}</span></div><p className="mt-8 line-clamp-2 font-serif text-2xl font-semibold leading-tight">{String(item.title ?? "School update")}</p><span className="mt-7 inline-flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[.16em] text-[var(--ink)]/40 transition group-hover:gap-3 group-hover:text-[var(--accent)]">Read story <ArrowRight size={13} /></span></button>)}</div></section>}

        <section className="mx-auto max-w-[1440px] px-5 pb-24 lg:px-10 lg:pb-32"><div className="relative overflow-hidden rounded-[2rem] border border-[var(--ink)]/8 bg-white px-6 py-12 text-center shadow-[0_24px_70px_rgba(29,43,37,.06)] sm:px-12 sm:py-16"><div className="menwe-cta-orb" aria-hidden="true" /><div className="relative z-10 mx-auto max-w-3xl"><p className="text-[9px] font-extrabold uppercase tracking-[.25em] text-[var(--accent)]">Begin the journey</p><h2 className="mt-4 font-serif text-4xl font-semibold leading-[1.03] tracking-[-.035em] sm:text-6xl">Ready to make school feel more connected?</h2><p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[var(--ink)]/55">Learn about Menwe, explore admissions, or enter the secure school portal.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => go("/admissions")} className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-6 py-3.5 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[var(--accent)]">Start an application <ArrowRight size={16} /></button><button type="button" onClick={() => go("/portal/login")} className="inline-flex items-center gap-2 rounded-full border border-[var(--ink)]/12 bg-white px-6 py-3.5 text-sm font-bold text-[var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--mist)]">Open secure portal</button></div></div></div></section>
      </main>
    </PublicLayout>
  );
}
