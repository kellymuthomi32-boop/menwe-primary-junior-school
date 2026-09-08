import { ArrowRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight, FlaskConical, GraduationCap, MapPin, Medal, Phone, Sparkles, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import PublicLayout from "@/components/PublicLayout";
import AboutSection from "@/components/AboutSection";
import { cacheBustedUrl, useSiteMedia } from "@/lib/siteMedia";
import { listPublished } from "@/lib/database";
import "@/styles/menwe-hero-exact.css";
import "@/mobile-layout-fix.css";

const fallbackSlides = [
  { key: "homepage_hero_1", src: "/hero-learning.svg", alt: "Menwe learning pathway illustration", caption: "Primary learners · Strong learning foundations" },
  { key: "homepage_hero_2", src: "/hero-community.svg", alt: "Menwe school community illustration", caption: "Primary school · Everyday learner life" },
  { key: "homepage_hero_3", src: "/hero-arts.svg", alt: "Menwe arts and talent illustration", caption: "Junior learners · Creativity and confidence" },
  { key: "homepage_hero_4", src: "/gallery/girls-rugby-county.svg", alt: "Menwe girls' rugby team represented at county level", caption: "Girls' rugby · County representation" },
  { key: "homepage_hero_5", src: "/hero-science.svg", alt: "Menwe science and innovation illustration", caption: "School life · Discovery beyond the classroom" },
];

const programs = [
  [BookOpen, "Early Childhood & Primary", "Build strong foundations in literacy, numeracy, creative arts and social development through joyful, learner-centred experiences."],
  [FlaskConical, "Junior Secondary School", "Develop competencies through science, languages, digital literacy, practical discovery and the confidence to solve real-world problems."],
  [Medal, "Co-Curricular & Talent Pathways", "Grow the whole learner through music and band, football, athletics, STEM clubs, leadership and purposeful teamwork."],
] as const;

const fallbackNews = [
  ["Admissions", "Applications open for the upcoming academic term", "Plan ahead for your child’s next learning journey with Menwe. Our admissions team is ready to guide families through the process."],
  ["Learning", "Celebrating progress beyond the classroom", "From academic milestones to sport, music and practical projects, our learners are encouraged to discover where they can thrive."],
] as const;

const fallbackEvents = [
  ["SEP", "12", "Parents-Teachers Meeting", "09:00 AM · Main School Campus"],
  ["OCT", "03", "Annual Sports Day", "08:00 AM · School Sports Field"],
  ["OCT", "17", "Menwe Science Fair", "10:00 AM · Science & Innovation Hall"],
] as const;

const homeNavigation = [
  ["About Menwe", "/about", "Learn about our school, story and community.", BookOpen],
  ["Academics", "/academics", "Explore learning, curriculum and academic pathways.", GraduationCap],
  ["School Life", "/school-life", "Discover activities, culture, sport and learner life.", Sparkles],
  ["Admissions", "/admissions", "Find admissions information and start your application.", UsersRound],
] as const;

function HeroGallery({ slides }: { slides: typeof fallbackSlides }) {
  const [active, setActive] = useState(0);
  const move = (direction: number) => setActive((value) => (value + direction + slides.length) % slides.length);

  useEffect(() => {
    setActive((value) => Math.min(value, Math.max(0, slides.length - 1)));
  }, [slides.length]);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const activeSlide = slides[active] ?? slides[0];

  return (
    <div className="relative min-w-0 h-[300px] sm:h-[390px] lg:h-[500px] flex items-center">
      <div className="absolute inset-0 rounded-[2rem] bg-[#D89B28]/10 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden rounded-[2rem]">
        <div className="flex w-full h-full items-center justify-center gap-2 sm:gap-3">
          {slides.map((slide, index) => (
            <button key={slide.key} type="button" onClick={() => setActive(index)} aria-label={`Show image ${index + 1}: ${slide.caption}`} className={`relative h-[78%] flex-1 min-w-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl transition-all duration-500 ${index === active ? "scale-105 z-10 opacity-100" : "opacity-65"}`}>
              <img src={slide.src} alt={slide.alt} loading={index === 0 ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#061229]/90 via-[#061229]/35 to-transparent px-3 pb-3 pt-10 text-left text-[11px] sm:text-xs font-semibold text-white leading-tight">{slide.caption}</span>
            </button>
          ))}
        </div>
        <div className="absolute left-4 top-4 z-20 max-w-[80%] rounded-full border border-white/15 bg-[#061229]/75 px-3 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">{activeSlide.caption}</div>
        <button type="button" onClick={() => move(-1)} aria-label="Previous image" className="absolute left-2 sm:left-4 z-20 w-10 h-10 rounded-full flex items-center justify-center bg-[#061229]/85 text-white backdrop-blur-sm active:scale-[0.98] transition-all"><ChevronLeft size={18} /></button>
        <button type="button" onClick={() => move(1)} aria-label="Next image" className="absolute right-2 sm:right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center bg-[#061229]/85 text-white backdrop-blur-sm active:scale-[0.98] transition-all"><ChevronRight size={18} /></button>
        <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 flex gap-1.5" aria-label="Gallery pagination">
          {slides.map((slide, index) => <button key={slide.key} type="button" onClick={() => setActive(index)} aria-label={`Go to image ${index + 1}`} className={`h-1.5 rounded-full transition-all ${index === active ? "w-7 bg-[#D89B28]" : "w-1.5 bg-white/50"}`} />)}
        </div>
      </div>
    </div>
  );
}

function HomeNavigationCards() {
  const [, navigate] = useLocation();
  return <div className="relative z-20 mx-auto mt-6 w-full max-w-7xl px-0" aria-label="Explore Menwe"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 w-full">{homeNavigation.map(([title, path, text, Icon]) => <button key={path} type="button" onClick={() => navigate(path)} aria-label={`Open ${title}`} className="group w-full min-w-0 min-h-12 rounded-2xl p-6 bg-white border border-slate-200/80 shadow-sm text-left hover:border-[#D89B28]/50 hover:shadow-xl transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D89B28]"><span className="w-12 h-12 rounded-xl bg-amber-50 text-[#D89B28] flex items-center justify-center font-bold text-lg mb-4"><Icon size={21} /></span><span className="flex items-center justify-between gap-4"><span className="min-w-0 text-lg sm:text-xl font-bold text-slate-900 break-words">{title}</span><span className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-slate-50 text-slate-500 transition-transform group-hover:translate-x-1"><ArrowRight size={17} /></span></span><span className="mt-2 block text-sm sm:text-base text-slate-600 leading-relaxed break-words">{text}</span></button>)}</div></div>;
}

function formatEventDate(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return ["", ""] as const;
  return [date.toLocaleString("en-US", { month: "short" }).toUpperCase(), String(date.getDate()).padStart(2, "0")] as const;
}

function formatEventMeta(event: Record<string, unknown>) {
  const date = new Date(String(event.starts_at ?? ""));
  const time = Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-US", { hour: "2-digit", minute: "2-digit" });
  return [time, event.location ? String(event.location) : ""].filter(Boolean).join(" · ");
}

export default function MenweHeroHome() {
  const [, navigate] = useLocation();
  const { media } = useSiteMedia(fallbackSlides.map((slide) => slide.key).concat("principal_photo"));
  const [homeNews, setHomeNews] = useState<readonly (readonly [string, string, string])[]>(fallbackNews);
  const [homeEvents, setHomeEvents] = useState<readonly (readonly [string, string, string, string])[]>(fallbackEvents);
  const slides = fallbackSlides.map((slide) => ({ ...slide, src: cacheBustedUrl(media[slide.key]?.image_url, media[slide.key]?.updated_at) || slide.src, alt: media[slide.key]?.alt_text || slide.alt }));
  const principalImage = cacheBustedUrl(media.principal_photo?.image_url, media.principal_photo?.updated_at) || slides[1].src;

  useEffect(() => {
    let active = true;
    const loadHomeContent = async () => {
      try {
        const [newsResult, eventsResult] = await Promise.all([listPublished("news_articles", 0, 2), listPublished("events", 0, 3)]);
        if (!active) return;
        const nextNews = newsResult.data.map((item) => [String(item.category || "NEWS"), String(item.title || ""), String(item.excerpt || item.body || "")] as const).filter((item) => item[1]);
        const nextEvents = eventsResult.data.map((item) => {
          const [month, day] = formatEventDate(item.starts_at);
          return [month, day, String(item.title || ""), formatEventMeta(item)] as const;
        }).filter((item) => item[2] && item[0]);
        if (nextNews.length) setHomeNews(nextNews);
        if (nextEvents.length) setHomeEvents(nextEvents);
      } catch {
        // Keep the existing static fallback when CMS content is unavailable.
      }
    };
    void loadHomeContent();
    return () => { active = false; };
  }, []);

  return (
    <PublicLayout>
      <div className="menwe-exact-page w-full min-w-0 overflow-x-hidden">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#061229] via-[#0b1d3a] to-[#061229] px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14" aria-labelledby="hero-title">
          <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-[#D89B28]/10 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-[#D89B28]/10 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="min-w-0 lg:col-span-5">
              <span className="inline-flex max-w-full flex-wrap items-center rounded-full border border-[#D89B28]/30 bg-[#D89B28]/15 px-4 py-1.5 text-xs sm:text-sm font-semibold tracking-wide uppercase text-[#D89B28]">Est. 1961 • Excellence in CBC Education</span>
              <p className="mt-6 text-xs sm:text-sm font-semibold tracking-[0.22em] uppercase text-[#D89B28]">WELCOME TO</p>
              <h1 id="hero-title" className="mt-3 max-w-3xl text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight break-words">Menwe Primary &amp; Junior School</h1>
              <p className="mt-4 text-xl sm:text-2xl font-bold text-[#D89B28]">Inspire. Empower. Thrive.</p>
              <p className="mt-5 max-w-2xl text-sm sm:text-base text-white/70 leading-relaxed">Nurture every learner to learn, grow and succeed in a caring environment that builds character and confidence for a brighter future.</p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3 w-full"><button type="button" onClick={() => navigate("/admissions")} className="w-full sm:w-auto min-h-12 bg-[#D89B28] hover:bg-[#c28920] text-[#061229] font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98] inline-flex items-center justify-center gap-2">Apply for 2026 Admissions <ArrowRight size={17} /></button><button type="button" onClick={() => navigate("/login")} className="w-full sm:w-auto min-h-12 border border-white/20 hover:bg-white/10 text-white font-medium px-6 py-3.5 rounded-xl transition-all backdrop-blur-sm inline-flex items-center justify-center gap-2 active:scale-[0.98]">Explore Student Portal <UsersRound size={17} /></button></div>
            </div>
            <div className="min-w-0 lg:col-span-7"><HeroGallery slides={slides} /></div>
          </div>
          <HomeNavigationCards />
          <div className="relative z-20 mx-auto mt-6 w-full max-w-7xl rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur-md"><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[["1961", "Founded"], ["23+", "TSC & BOM Faculty"], ["100%", "CBC Pathway Integration"], ["0142550882", "Direct Admissions Hotline"]].map(([value, label]) => <div key={label} className="min-w-0 text-center sm:text-left"><div className="text-xl sm:text-2xl font-extrabold tracking-tight text-white break-words">{value}</div><div className="mt-1 text-xs sm:text-sm text-white/55 leading-relaxed">{label}</div></div>)}</div></div>
        </section>

        <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8" aria-label="Popular next steps">
          <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-3">
            {[
              ["New to Menwe?", "See how admissions work", "/how-it-works", "Start here"],
              ["Already part of our community?", "Open the family portal", "/portal/login", "Sign in"],
              ["Planning a visit?", "Find the school and contact us", "/contact", "Get directions"],
            ].map(([eyebrow, title, path, action]) => <button key={path} type="button" onClick={() => navigate(path)} className="group flex min-h-12 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-[#F8F9FA] px-4 py-3 text-left transition duration-300 hover:-translate-y-0.5 hover:border-[#D89B28]/45 hover:bg-white hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D89B28]">
              <span className="min-w-0"><span className="block text-[10px] font-extrabold uppercase tracking-[.15em] text-[#D89B28]">{eyebrow}</span><span className="mt-1 block truncate text-sm font-bold text-[#061229]">{title}</span></span><span className="shrink-0 text-xs font-extrabold text-[#061229]/55 transition group-hover:text-[#D89B28]">{action} <ArrowRight className="ml-1 inline transition group-hover:translate-x-1" size={14} /></span>
            </button>)}
          </div>
        </section>

        <AboutSection />

        <section id="academics" className="menwe-section menwe-programs-section"><div className="menwe-section-inner"><div className="menwe-heading-row"><div><p className="menwe-section-kicker">ACADEMIC PROGRAMS &amp; CURRICULUM</p><h2>Learning Designed for Every Stage</h2></div><p>From early foundations to junior secondary and talent pathways, we connect knowledge with confidence, character and practical skills.</p></div><div className="menwe-program-grid">{programs.map(([Icon, title, text]) => <article className="menwe-program-card" key={title}><span className="menwe-program-icon"><Icon size={23} /></span><h3>{title}</h3><p>{text}</p><button onClick={() => navigate("/academics")} className="menwe-text-link min-h-12">Learn More <ArrowRight size={15} /></button></article>)}</div></div></section>

        <section className="menwe-section bg-white"><div className="menwe-section-inner"><div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden"><div className="lg:col-span-4 min-w-0 overflow-hidden rounded-2xl"><img src={principalImage} alt={media.principal_photo?.alt_text || "Mr. Simon Muriungi Muthemba, Principal of Menwe Primary & Junior School"} loading="lazy" decoding="async" className="w-full h-72 lg:h-96 object-cover p-8" /></div><div className="lg:col-span-8 min-w-0"><p className="text-xs font-bold tracking-[0.2em] uppercase text-[#D89B28]">A MESSAGE FROM THE PRINCIPAL</p><h2 className="mt-3 text-2xl sm:text-4xl font-extrabold leading-tight tracking-tight break-words">Welcome to Menwe Primary &amp; Junior School.</h2><p className="mt-5 text-base text-white/70 leading-relaxed">“We warmly welcome parents and guardians to Menwe. Our promise is to provide a safe, purposeful learning environment where children are known, supported and challenged to grow. When school and family work together, learners gain the confidence and character to thrive.”</p><p className="mt-6 text-lg font-semibold text-[#D89B28] italic">“Nurturing holistic, self-reliant learners through values and CBC excellence.”</p><div className="mt-6 flex items-center gap-3"><span className="h-px w-10 bg-[#D89B28]" /><div><strong className="block">Mr. Simon Muriungi Muthemba</strong><small className="text-white/50">School Principal</small></div></div></div></div></div></section>

        <section id="news-events" className="menwe-section menwe-news-section"><div className="menwe-section-inner menwe-news-grid"><div><p className="menwe-section-kicker">LATEST FROM MENWE</p><div className="menwe-news-heading"><h2>News, Announcements &amp; Events</h2><button className="menwe-text-link min-h-12" onClick={() => navigate("/news")}>View all news <ArrowRight size={15} /></button></div><div className="menwe-news-cards">{homeNews.map(([tag, title, text]) => <article key={title} className="menwe-news-card"><span>{tag}</span><h3>{title}</h3><p>{text}</p><button className="menwe-text-link min-h-12" onClick={() => navigate("/news")}>Read story <ArrowRight size={14} /></button></article>)}</div></div><div className="menwe-events"><p className="menwe-section-kicker">UPCOMING</p><h2>What’s Next</h2>{homeEvents.map(([month, day, title, meta]) => <button className="menwe-event min-h-12" key={title} onClick={() => navigate("/events")}><span className="menwe-date"><b>{month}</b><strong>{day}</strong></span><span><b>{title}</b><small>{meta}</small></span><ArrowRight size={16} /></button>)}</div></div></section>

        <section className="menwe-admissions-banner"><div className="menwe-banner-inner"><div><p className="menwe-section-kicker">ADMISSIONS ARE OPEN</p><h2>Ready to Give Your Child a Brighter Future?</h2><p>Admissions are currently open for the upcoming academic term. Join the Menwe Primary &amp; Junior School family today.</p></div><div className="menwe-banner-actions"><button onClick={() => navigate("/admissions")} className="menwe-banner-primary min-h-12 active:scale-[0.98] transition-all">Apply Now <ArrowRight size={16} /></button><button onClick={() => navigate("/admissions")} className="menwe-banner-outline min-h-12 active:scale-[0.98] transition-all">Download Fee Structure / Prospectus</button></div></div></section>

        <section id="contact" className="menwe-section menwe-contact-section"><div className="menwe-section-inner"><div className="menwe-contact-heading"><div><p className="menwe-section-kicker">COME AND VISIT</p><h2>Let’s stay connected</h2><p>Have a question about admissions, learning or school life? Reach out to our team or plan a visit to our Igoki campus.</p></div><button className="menwe-cta primary min-h-12 active:scale-[0.98] transition-all" onClick={() => navigate("/contact")}>Contact the School <ArrowRight size={16} /></button></div><div className="menwe-contact-grid"><div className="menwe-contact-item"><span><MapPin size={20} /></span><div><b>Address</b><p>Igoki, Abogeta Division, Meru Central</p></div></div><div className="menwe-contact-item"><span><Phone size={20} /></span><div><b>Call us</b><p>0142550882</p></div></div><div className="menwe-contact-item"><span><CalendarDays size={20} /></span><div><b>School hours</b><p>Monday – Friday · 7:30 AM – 4:30 PM</p></div></div><a className="menwe-map" href="https://www.google.com/maps/search/?api=1&query=-0.099245555%2C37.58121778" target="_blank" rel="noreferrer"><div className="menwe-map-grid" /><span><MapPin size={17} /> Open Menwe location in Google Maps <ArrowRight size={15} /></span></a></div></div></section>
      </div>
    </PublicLayout>
  );
}
