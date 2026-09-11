import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, FlaskConical, GraduationCap, MapPin, Medal, Phone, Play, Sparkles, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import { cacheBustedUrl, useSiteMedia } from "@/lib/siteMedia";
import { listPublished } from "@/lib/database";
import "@/styles/menwe-hero-exact.css";
import "@/mobile-layout-fix.css";

const slides = [
  { key: "homepage_hero_1", src: "/hero-learning.svg", alt: "Menwe learners building strong learning foundations", label: "Strong learning foundations" },
  { key: "homepage_hero_2", src: "/hero-community.svg", alt: "Menwe school community", label: "A caring school community" },
  { key: "homepage_hero_3", src: "/hero-arts.svg", alt: "Menwe learners exploring creativity", label: "Creativity and confidence" },
  { key: "homepage_hero_4", src: "/gallery/girls-rugby-county.svg", alt: "Menwe girls rugby team represented at county level", label: "Talent beyond the classroom" },
  { key: "homepage_hero_5", src: "/hero-science.svg", alt: "Menwe learners exploring science and innovation", label: "Discovery and innovation" },
] as const;

const pathways = [
  { icon: BookOpen, eyebrow: "FOUNDATIONS", title: "Early Childhood & Primary", text: "Build confident readers, thinkers and problem-solvers through purposeful, joyful learning." },
  { icon: FlaskConical, eyebrow: "JUNIOR SCHOOL", title: "Junior Secondary", text: "Develop competencies through science, languages, digital learning and practical discovery." },
  { icon: Medal, eyebrow: "BEYOND CLASS", title: "Talent & Co-Curricular", text: "Give every learner room to discover strengths through sport, music, STEM, leadership and teamwork." },
];

const values = [
  ["Learner-centred", "We put the learner's growth, confidence and potential at the centre of the school experience."],
  ["Character & confidence", "We help young people become responsible, resilient and ready to contribute."],
  ["Learning for life", "We connect classroom learning with creativity, practical skills, collaboration and real-world thinking."],
];

function HeroGallery({ media }: { media: Record<string, any> }) {
  const [active, setActive] = useState(0);
  const resolved = useMemo(() => slides.map((slide) => ({ ...slide, src: cacheBustedUrl(media[slide.key]?.image_url, media[slide.key]?.updated_at) || slide.src, alt: media[slide.key]?.alt_text || slide.alt })), [media]);
  useEffect(() => { const timer = window.setInterval(() => setActive((v) => (v + 1) % resolved.length), 6000); return () => window.clearInterval(timer); }, [resolved.length]);
  const current = resolved[active] ?? resolved[0];
  return <div className="relative h-[360px] sm:h-[480px] lg:h-[590px]">
    <div className="absolute -inset-8 rounded-[3rem] bg-[#D89B28]/15 blur-3xl" aria-hidden="true" />
    <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 shadow-2xl ring-1 ring-white/10 backdrop-blur-sm">
      {resolved.map((slide, index) => <img key={slide.key} src={slide.src} alt={slide.alt} loading={index === 0 ? "eager" : "lazy"} className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ${index === active ? "scale-100 opacity-100" : "scale-105 opacity-0"}`} />)}
      <div className="absolute inset-0 bg-gradient-to-t from-[#061229] via-[#061229]/15 to-transparent" />
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between sm:left-6 sm:right-6 sm:top-6">
        <div className="rounded-full border border-white/20 bg-[#061229]/65 px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-white backdrop-blur-md sm:text-xs">Menwe • Learning in action</div>
        <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-md sm:flex"><span className="h-2 w-2 rounded-full bg-[#D89B28]" />Est. 1961</div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 lg:p-9">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#D89B28]">{String(active + 1).padStart(2, "0")} / {String(resolved.length).padStart(2, "0")}</p><h2 className="mt-2 max-w-xl text-xl font-black text-white sm:text-3xl">{current.label}</h2></div>
          <div className="hidden gap-2 sm:flex"><button onClick={() => setActive((v) => (v - 1 + resolved.length) % resolved.length)} aria-label="Previous hero image" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-[#061229]/70 text-white backdrop-blur-md hover:bg-[#061229]"><ChevronLeft size={18}/></button><button onClick={() => setActive((v) => (v + 1) % resolved.length)} aria-label="Next hero image" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-[#061229]/70 text-white backdrop-blur-md hover:bg-[#061229]"><ChevronRight size={18}/></button></div>
        </div>
        <div className="mt-5 flex gap-1.5">{resolved.map((slide, index) => <button key={slide.key} onClick={() => setActive(index)} aria-label={`Show ${slide.label}`} className={`h-1.5 rounded-full transition-all ${index === active ? "w-10 bg-[#D89B28]" : "w-2 bg-white/45"}`} />)}</div>
      </div>
    </div>
  </div>;
}

export default function MenweHomepagePremium() {
  const [, navigate] = useLocation();
  const { media } = useSiteMedia([...slides.map((s) => s.key), "principal_photo"]);
  const [news, setNews] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => { let mounted = true; void Promise.all([listPublished("news_articles", 0, 3), listPublished("events", 0, 3)]).then(([n, e]) => { if (!mounted) return; setNews(n.data ?? []); setEvents(e.data ?? []); }).catch(() => undefined); return () => { mounted = false; }; }, []);
  const principal = cacheBustedUrl(media.principal_photo?.image_url, media.principal_photo?.updated_at) || cacheBustedUrl(media.homepage_hero_2?.image_url, media.homepage_hero_2?.updated_at) || "/hero-community.svg";

  return <PublicLayout>
    <main className="w-full overflow-x-hidden bg-[#F7F9F8] text-[#10261D]">
      <section className="relative overflow-hidden bg-[#061229]" aria-labelledby="hero-title">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(216,155,40,.18),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(9,112,72,.22),transparent_35%)]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 sm:pb-12 sm:pt-12 lg:px-8 lg:pb-16 lg:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#D89B28]/30 bg-[#D89B28]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[.17em] text-[#E8B84D] sm:text-xs"><span className="h-2 w-2 rounded-full bg-[#D89B28]" /> Excellence in CBC Education</div>
              <p className="mt-7 text-xs font-black uppercase tracking-[.25em] text-[#D89B28]">WELCOME TO MENWE</p>
              <h1 id="hero-title" className="mt-3 text-4xl font-black leading-[1.02] tracking-[-.035em] text-white sm:text-6xl lg:text-[4.6rem]">Where every learner gets room to <span className="text-[#D89B28]">thrive.</span></h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/72 sm:text-lg">A caring learning community where strong foundations, character, creativity and practical skills prepare young people for what comes next.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={() => navigate("/admissions")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#D89B28] px-6 py-3.5 text-sm font-black text-[#061229] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#E8B84D]">Start your Menwe journey <ArrowRight size={17}/></button><button onClick={() => navigate("/school-life")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10"><Play size={16}/> Discover school life</button></div>
              <div className="mt-9 grid grid-cols-3 gap-4 border-t border-white/10 pt-6"><div><div className="text-2xl font-black text-white">1961</div><div className="mt-1 text-[11px] font-semibold text-white/45">Founded</div></div><div><div className="text-2xl font-black text-white">23+</div><div className="mt-1 text-[11px] font-semibold text-white/45">TSC &amp; BOM Faculty</div></div><div><div className="text-2xl font-black text-white">CBC</div><div className="mt-1 text-[11px] font-semibold text-white/45">Learning Pathway</div></div></div>
            </div>
            <div className="lg:col-span-7"><HeroGallery media={media} /></div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-1 border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-3"><button onClick={() => navigate("/admissions")} className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-[#F9FBFA] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#D89B28]/50 hover:shadow-lg"><span><span className="block text-xs font-black uppercase tracking-widest text-[#D89B28]">New family</span><span className="mt-1 block text-sm font-bold text-[#17352A]">Explore admissions</span></span><ArrowRight className="transition group-hover:translate-x-1" size={18}/></button><button onClick={() => navigate("/academics")} className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-[#F9FBFA] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#D89B28]/50 hover:shadow-lg"><span><span className="block text-xs font-black uppercase tracking-widest text-[#D89B28]">Learning</span><span className="mt-1 block text-sm font-bold text-[#17352A]">Explore our academics</span></span><ArrowRight className="transition group-hover:translate-x-1" size={18}/></button><button onClick={() => navigate("/portal/login")} className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-[#F9FBFA] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#D89B28]/50 hover:shadow-lg"><span><span className="block text-xs font-black uppercase tracking-widest text-[#D89B28]">Already with us?</span><span className="mt-1 block text-sm font-bold text-[#17352A]">Open family portal</span></span><ArrowRight className="transition group-hover:translate-x-1" size={18}/></button></div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.2em] text-[#D89B28]">ONE SCHOOL. MANY PATHWAYS.</p><h2 className="mt-3 text-3xl font-black tracking-tight text-[#064A30] sm:text-4xl">A school experience designed around the whole learner.</h2><p className="mt-4 text-base leading-7 text-slate-600">From foundational years through Junior School, Menwe brings learning, character and opportunity together.</p></div><div className="mt-10 grid gap-5 lg:grid-cols-3">{pathways.map(({icon: Icon, eyebrow, title, text}) => <article key={title} className="group rounded-[1.5rem] border border-slate-200 bg-[#F8FAF9] p-6 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl"><div className="flex items-start justify-between"><div className="grid h-12 w-12 place-items-center rounded-xl bg-[#064A30] text-[#D89B28]"><Icon size={22}/></div><span className="text-[10px] font-black tracking-[.18em] text-slate-400">{eyebrow}</span></div><h3 className="mt-7 text-xl font-black text-[#17352A]">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p><button onClick={() => navigate(title.includes("Junior") ? "/academics" : "/school-life")} className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#064A30]">Explore pathway <ArrowRight size={16} className="transition group-hover:translate-x-1"/></button></article>)}</div></div></section>

      <section className="bg-[#EEF5F1] px-4 py-16 sm:px-6 lg:px-8 lg:py-24"><div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2"><div className="relative"><div className="absolute -inset-5 rounded-[2rem] bg-[#D89B28]/10 blur-2xl"/><img src={principal} alt="Menwe school community" loading="lazy" className="relative h-[380px] w-full rounded-[2rem] object-cover shadow-xl sm:h-[480px]"/></div><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#D89B28]">WHY FAMILIES CHOOSE MENWE</p><h2 className="mt-3 text-3xl font-black tracking-tight text-[#064A30] sm:text-4xl">A place to learn, belong and become.</h2><p className="mt-5 text-base leading-7 text-slate-600">We believe a great school should do more than deliver lessons. It should help children discover what they can do, build relationships that matter and leave each stage of learning with greater confidence.</p><div className="mt-8 space-y-5">{values.map(([title, text]) => <div key={title} className="flex gap-4"><CheckCircle2 className="mt-0.5 shrink-0 text-[#D89B28]" size={21}/><div><h3 className="font-black text-[#17352A]">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div></div>)}</div><button onClick={() => navigate("/about")} className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#064A30] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5">Meet Menwe <ArrowRight size={16}/></button></div></div></section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#D89B28]">STAY CONNECTED</p><h2 className="mt-2 text-3xl font-black tracking-tight text-[#064A30] sm:text-4xl">What’s happening at Menwe</h2></div><button onClick={() => navigate("/news")} className="inline-flex items-center gap-2 text-sm font-black text-[#064A30]">View all updates <ArrowRight size={16}/></button></div><div className="mt-10 grid gap-6 lg:grid-cols-2"><div className="rounded-[1.5rem] border border-slate-200 p-6"><div className="flex items-center justify-between"><h3 className="text-lg font-black text-[#17352A]">Latest from school</h3><Sparkles className="text-[#D89B28]" size={19}/></div><div className="mt-5 divide-y divide-slate-100">{(news.length ? news : [{category:"NEWS",title:"Follow Menwe learning stories and school updates",excerpt:"Discover news, achievements and moments from across our school community."}]).map((item: any, i) => <button key={item.id ?? i} onClick={() => navigate("/news")} className="group block w-full py-4 text-left first:pt-0"><span className="text-[10px] font-black uppercase tracking-widest text-[#D89B28]">{String(item.category || "NEWS")}</span><span className="mt-1 block text-base font-black text-[#17352A] group-hover:text-[#064A30]">{String(item.title || "")}</span><span className="mt-1 block line-clamp-2 text-sm leading-6 text-slate-500">{String(item.excerpt || item.body || "")}</span></button>)}</div></div><div className="rounded-[1.5rem] border border-slate-200 bg-[#F8FAF9] p-6"><div className="flex items-center justify-between"><h3 className="text-lg font-black text-[#17352A]">Upcoming events</h3><CalendarDays className="text-[#D89B28]" size={19}/></div><div className="mt-5 space-y-3">{(events.length ? events : [{id:"1",starts_at:"2026-09-12",title:"Parents-Teachers Meeting",location:"Main School Campus"},{id:"2",starts_at:"2026-10-03",title:"Annual Sports Day",location:"School Sports Field"},{id:"3",starts_at:"2026-10-17",title:"Menwe Science Fair",location:"Science & Innovation Hall"}]).map((item: any) => { const d = new Date(item.starts_at); return <button key={item.id} onClick={() => navigate("/events")} className="flex w-full items-center gap-4 rounded-xl bg-white p-3 text-left shadow-sm transition hover:shadow-md"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#064A30] text-white"><span className="text-[9px] font-black uppercase">{Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-US", {month:"short"})}</span><span className="text-lg font-black leading-none">{Number.isNaN(d.getTime()) ? "—" : d.getDate()}</span></div><div className="min-w-0"><div className="font-black text-[#17352A]">{String(item.title || "")}</div><div className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12}/>{String(item.location || "Menwe School")}</div></div><ArrowRight className="ml-auto shrink-0 text-slate-400" size={16}/></button>; })}</div></div></div></div></section>

      <section className="bg-[#061229] px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#D89B28]">READY TO TAKE THE NEXT STEP?</p><h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-5xl">Give your child a place to discover what they can become.</h2><p className="mt-4 max-w-2xl text-base leading-7 text-white/65">Explore admissions, visit the school or speak with our team about the next learning journey.</p></div><div className="flex flex-col gap-3 sm:flex-row lg:flex-col"><button onClick={() => navigate("/admissions")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#D89B28] px-6 py-3.5 text-sm font-black text-[#061229]">Explore admissions <ArrowRight size={17}/></button><button onClick={() => navigate("/contact")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white"><Phone size={16}/> Contact Menwe</button></div></div></section>

      <section className="bg-white px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><MapPin size={15} className="text-[#D89B28]"/> Menwe Village, Meru</div><div className="flex items-center gap-2"><Phone size={15} className="text-[#D89B28]"/> 0142550882</div><button onClick={() => navigate("/contact")} className="inline-flex items-center gap-1 font-bold text-[#064A30]">Plan a visit <ArrowRight size={14}/></button></div></section>
    </main>
  </PublicLayout>;
}
