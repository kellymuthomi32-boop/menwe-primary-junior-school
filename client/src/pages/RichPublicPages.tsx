import { ArrowRight, BookOpen, CheckCircle2, Compass, GraduationCap, HeartHandshake, Layers3, MessageCircle, ShieldCheck, Sparkles, Target, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { getPublishedPage } from "@/lib/database";

type PageContent = { title: string; headline: string | null; body: Record<string, unknown> } | null;

function usePublishedPage(slug: string) {
  const [content, setContent] = useState<PageContent>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void getPublishedPage(slug)
      .then((value) => active && setContent(value))
      .catch(() => active && setContent(null))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [slug]);
  return { content, loading };
}

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="max-w-3xl">
    <p className="text-[9px] font-extrabold uppercase tracking-[.25em] text-[var(--accent)]">{eyebrow}</p>
    <h2 className="mt-4 font-serif text-4xl font-semibold leading-[1.02] tracking-[-.035em] sm:text-5xl">{title}</h2>
    <p className="mt-5 text-base leading-7 text-[var(--ink)]/58">{copy}</p>
  </div>;
}

function InfoCard({ icon: Icon, label, title, text }: { icon: typeof BookOpen; label: string; title: string; text: string }) {
  return <article className="group rounded-[1.6rem] border border-[var(--ink)]/8 bg-white p-7 transition duration-500 hover:-translate-y-1 hover:border-[var(--accent)]/20 hover:shadow-[0_24px_60px_rgba(29,43,37,.08)]">
    <div className="flex items-center justify-between gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)] transition group-hover:scale-105"><Icon size={20} strokeWidth={1.7} /></span><span className="text-[9px] font-extrabold uppercase tracking-[.2em] text-[var(--ink)]/35">{label}</span></div>
    <h3 className="mt-8 font-serif text-2xl font-semibold tracking-tight">{title}</h3>
    <p className="mt-3 text-sm leading-6 text-[var(--ink)]/58">{text}</p>
  </article>;
}

function CmsBlock({ content, loading }: { content: PageContent; loading: boolean }) {
  const body = typeof content?.body?.content === "string" ? content.body.content : null;
  if (loading) return <div className="rounded-[1.6rem] border border-[var(--ink)]/8 bg-white p-8 text-sm text-[var(--ink)]/45">Loading published school information…</div>;
  if (!body) return <div className="rounded-[1.6rem] border border-dashed border-[var(--ink)]/12 bg-white/60 p-8"><div className="flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><Sparkles size={18} /></span><div><h3 className="font-serif text-xl font-semibold">School-specific information will appear here</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink)]/55">This page is ready for the school administrator to publish approved details. The public experience stays useful without inventing history, statistics, awards, testimonials, or other facts that have not been supplied by the school.</p></div></div></div>;
  return <div className="rounded-[1.6rem] border border-[var(--ink)]/8 bg-white p-8 sm:p-10"><p className="whitespace-pre-wrap text-base leading-8 text-[var(--ink)]/70">{body}</p></div>;
}

export function RichAboutPage() {
  const [, go] = useLocation();
  const { content, loading } = usePublishedPage("about");
  return <PublicLayout>
    <section className="relative overflow-hidden bg-[var(--ink)] text-white"><div className="menwe-grid pointer-events-none absolute inset-0 opacity-25" /><div className="menwe-aurora menwe-aurora-one" /><div className="menwe-aurora menwe-aurora-three" /><div className="relative mx-auto max-w-[1440px] px-5 py-24 lg:px-10 lg:py-32"><div className="max-w-5xl"><p className="text-[9px] font-extrabold uppercase tracking-[.25em] text-[var(--gold)]">Our school</p><h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold leading-[.92] tracking-[-.055em] sm:text-7xl">A school story should feel as thoughtful as the people inside it.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-white/58">This is the public home for Menwe's school story: its purpose, people, learning approach and the information the school chooses to share with its community.</p><div className="mt-9 flex flex-wrap gap-3"><button onClick={() => go("/academics")} className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-6 py-3.5 text-sm font-extrabold text-[var(--ink)]">Explore academics <ArrowRight size={16} /></button><button onClick={() => go("/contact")} className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[.06] px-6 py-3.5 text-sm font-bold text-white">Connect with the school <ArrowRight size={15} /></button></div></div></div></section>

    <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28"><SectionHeading eyebrow="What belongs here" title="A complete introduction, without invented claims." copy="The strongest school website answers the questions families naturally have while keeping every school-specific fact under the school's control."/><div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4"><InfoCard icon={Target} label="Purpose" title="Mission & vision" text="Publish the school's approved purpose, direction and the values that guide its work."/><InfoCard icon={UsersRound} label="People" title="Leadership & community" text="Introduce the leadership team and the wider school community using information the school has approved."/><InfoCard icon={BookOpen} label="Learning" title="Teaching approach" text="Explain how learning is organised, what families can expect, and how progress is supported."/><InfoCard icon={Layers3} label="Place" title="School facilities" text="Share approved information about learning spaces, facilities and the environment around learners."/></div></section>

    <section className="bg-[var(--mist)]"><div className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28"><div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-start"><SectionHeading eyebrow="The Menwe experience" title="Built around trust, clarity and connection." copy="The public site explains the school; the secure portal handles private operational information. That separation keeps the experience welcoming while protecting records."/><div className="grid gap-4 sm:grid-cols-2"><InfoCard icon={HeartHandshake} label="Belonging" title="A family connection" text="Families can move from public school information into an authorised portal when they need private records and communication."/><InfoCard icon={ShieldCheck} label="Trust" title="Privacy by default" text="Student, family, academic, finance and message records belong behind authenticated, role-aware access."/><InfoCard icon={Compass} label="Clarity" title="Information with purpose" text="Each page has a clear job: help a visitor understand the school or help an authorised user complete a task."/><InfoCard icon={MessageCircle} label="Connection" title="A living school story" text="Published news, events, gallery moments and school information can stay current as administrators update them."/></div></div></div></section>

    <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28"><SectionHeading eyebrow="Published school information" title={content?.title || "The school's own voice"} copy={content?.headline || "When approved content is available, it takes the lead here."}/><div className="mt-10"><CmsBlock content={content} loading={loading}/></div></section>

    <section className="mx-auto max-w-[1440px] px-5 pb-24 lg:px-10 lg:pb-32"><div className="rounded-[2rem] bg-[var(--ink)] p-8 text-white sm:p-10 lg:p-12"><div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[9px] font-extrabold uppercase tracking-[.22em] text-[var(--gold)]">Continue exploring</p><h2 className="mt-3 font-serif text-3xl font-semibold">See how learning and school life connect.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/52">Explore the academic experience, discover school life, or begin an admissions conversation.</p></div><div className="flex flex-wrap gap-3"><button onClick={() => go("/academics")} className="rounded-full bg-[var(--gold)] px-5 py-3 text-sm font-extrabold text-[var(--ink)]">Academics</button><button onClick={() => go("/school-life")} className="rounded-full border border-white/14 px-5 py-3 text-sm font-bold text-white">School life</button><button onClick={() => go("/admissions")} className="rounded-full border border-white/14 px-5 py-3 text-sm font-bold text-white">Admissions</button></div></div></div></section>
  </PublicLayout>;
}

const learningAreas = [
  { icon: BookOpen, label: "Curriculum", title: "Learning pathways", text: "Publish the subjects, curriculum pathways and academic expectations that apply to the school's learners." },
  { icon: GraduationCap, label: "Progress", title: "Assessment & reporting", text: "Explain how assessment information can move from examinations and results into clear report cards for authorised families." },
  { icon: UsersRound, label: "Support", title: "Learner support", text: "Share approved guidance on how learners are supported, encouraged and connected to their school community." },
  { icon: Compass, label: "Beyond class", title: "Co-curricular life", text: "Highlight approved clubs, activities and wider learning opportunities without presenting unverified achievements as fact." },
];

export function RichAcademicsPage() {
  const [, go] = useLocation();
  const { content, loading } = usePublishedPage("academics");
  return <PublicLayout>
    <section className="relative overflow-hidden bg-[var(--mist)]"><div className="menwe-section-glow" /><div className="relative mx-auto max-w-[1440px] px-5 py-24 lg:px-10 lg:py-32"><p className="text-[9px] font-extrabold uppercase tracking-[.25em] text-[var(--accent)]">Learning</p><h1 className="mt-5 max-w-5xl font-serif text-5xl font-semibold leading-[.93] tracking-[-.055em] sm:text-7xl">A learning experience designed to make progress visible.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--ink)]/58">The academics area gives families and visitors a clear picture of learning, while the secure portal connects authorised users to real academic records.</p><div className="mt-9 flex flex-wrap gap-3"><button onClick={() => go("/admissions")} className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-6 py-3.5 text-sm font-extrabold text-white">Admissions <ArrowRight size={16} /></button><button onClick={() => go("/portal/login")} className="inline-flex items-center gap-2 rounded-full border border-[var(--ink)]/12 bg-white/70 px-6 py-3.5 text-sm font-bold">Secure portal <ShieldCheck size={16} /></button></div></div></section>

    <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28"><SectionHeading eyebrow="What families need to understand" title="More than a list of subjects." copy="A useful academics page explains the learning journey from curriculum and classroom experience through assessment, feedback and progress."/><div className="mt-12 grid gap-5 md:grid-cols-2">{learningAreas.map((item) => <InfoCard key={item.title} {...item}/>)}</div></section>

    <section className="bg-[var(--ink)] text-white"><div className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28"><SectionHeading eyebrow="Connected learning" title="The records behind the experience." copy="When authorised users enter the portal, academic workflows can connect enrolments, classes, subjects, attendance, homework, exams, results and report cards without exposing private records publicly."/><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-[1.5rem] border border-white/10 bg-white/[.05] p-6"><BookOpen className="text-[var(--gold)]" size={22}/><h3 className="mt-7 font-serif text-2xl font-semibold">Teach</h3><p className="mt-2 text-sm leading-6 text-white/48">Classes, subjects, homework and timetable information can stay connected.</p></div><div className="rounded-[1.5rem] border border-white/10 bg-white/[.05] p-6"><CheckCircle2 className="text-[var(--gold)]" size={22}/><h3 className="mt-7 font-serif text-2xl font-semibold">Assess</h3><p className="mt-2 text-sm leading-6 text-white/48">Exams and results provide structured academic records for authorised users.</p></div><div className="rounded-[1.5rem] border border-white/10 bg-white/[.05] p-6"><Sparkles className="text-[var(--gold)]" size={22}/><h3 className="mt-7 font-serif text-2xl font-semibold">Reflect</h3><p className="mt-2 text-sm leading-6 text-white/48">Report cards can turn academic records into a clearer view of progress.</p></div><div className="rounded-[1.5rem] border border-white/10 bg-white/[.05] p-6"><ShieldCheck className="text-[var(--gold)]" size={22}/><h3 className="mt-7 font-serif text-2xl font-semibold">Protect</h3><p className="mt-2 text-sm leading-6 text-white/48">Academic records remain behind authentication and database authorization.</p></div></div></div></section>

    <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28"><SectionHeading eyebrow="Published academic information" title={content?.title || "The school's academic voice"} copy={content?.headline || "Approved curriculum and programme information can be published here by an authorised administrator."}/><div className="mt-10"><CmsBlock content={content} loading={loading}/></div><div className="mt-10 flex flex-wrap gap-3"><button onClick={() => go("/school-life")} className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-extrabold text-white">Explore school life <ArrowRight size={15}/></button><button onClick={() => go("/contact")} className="inline-flex items-center gap-2 rounded-full border border-[var(--ink)]/12 bg-white px-5 py-3 text-sm font-bold">Ask the school <MessageCircle size={15}/></button></div></section>
  </PublicLayout>;
}
