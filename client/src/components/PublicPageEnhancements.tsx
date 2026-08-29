import { ArrowRight, BookOpen, CalendarDays, HeartHandshake, Image, Mail, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useLocation } from "wouter";

const links = [
  { href: "/about", label: "About Menwe", text: "Understand the school's purpose, people and learning environment.", icon: HeartHandshake },
  { href: "/academics", label: "Academics", text: "Explore learning, assessment and the academic journey.", icon: BookOpen },
  { href: "/school-life", label: "School life", text: "Discover the public stories, moments and rhythm of school life.", icon: Sparkles },
  { href: "/families", label: "For families", text: "See how families connect with school information and support.", icon: UsersRound },
  { href: "/events", label: "Events", text: "Keep up with events and community moments published by the school.", icon: CalendarDays },
  { href: "/gallery", label: "Gallery", text: "Explore published images from school life and activities.", icon: Image },
];

export function PublicPageEnhancements({ current }: { current?: string }) {
  const [, go] = useLocation();
  const visible = links.filter((item) => item.href !== current).slice(0, 4);
  return (
    <>
      <section className="border-y border-[var(--ink)]/8 bg-[var(--mist)]/70">
        <div className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10 lg:py-20">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[9px] font-extrabold uppercase tracking-[.25em] text-[var(--accent)]">Keep exploring</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-.025em] sm:text-4xl">A school story with somewhere useful to go next.</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--ink)]/58">Move naturally between learning, school life, family information, events and the gallery. Published school-specific details remain under the school's control.</p>
            </div>
            <button type="button" onClick={() => go("/admissions")} className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">Talk to admissions <ArrowRight size={15} /></button>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map(({ href, label, text, icon: Icon }) => (
              <button key={href} type="button" onClick={() => go(href)} className="group rounded-[1.4rem] border border-[var(--ink)]/8 bg-white p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/25 hover:shadow-[0_18px_45px_rgba(29,43,37,.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)] transition group-hover:scale-105"><Icon size={18} strokeWidth={1.7} /></span>
                <h3 className="mt-6 font-serif text-xl font-semibold">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--ink)]/55">{text}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[.18em] text-[var(--accent)]">Explore <ArrowRight size={12} className="transition group-hover:translate-x-1" /></span>
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1440px] px-5 py-12 lg:px-10">
        <div className="flex flex-col gap-4 rounded-[1.6rem] border border-[var(--ink)]/8 bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><ShieldCheck size={18} /></span><div><p className="text-sm font-bold">Information you can trust</p><p className="mt-1 text-xs leading-5 text-[var(--ink)]/52">Public pages show approved content. Private learner, family, academic, finance and communication records stay behind authenticated access.</p></div></div>
          <button type="button" onClick={() => go("/contact")} className="inline-flex shrink-0 items-center gap-2 text-xs font-extrabold text-[var(--accent)]">Contact the school <Mail size={14} /></button>
        </div>
      </section>
    </>
  );
}
