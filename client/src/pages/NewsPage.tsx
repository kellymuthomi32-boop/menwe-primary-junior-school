import { ArrowRight, Megaphone, Newspaper } from "lucide-react";
import { useLocation } from "wouter";
import PublicLayout from "@/components/PublicLayout";

const stories = [
  { tag: "NEWS", title: "Learning beyond the classroom", text: "Learners continue to build confidence through practical work, sport, music and purposeful collaboration." },
  { tag: "ANNOUNCEMENT", title: "Preparing for the new term", text: "Families are encouraged to plan early and contact the school for admissions and academic guidance." },
  { tag: "NEWS", title: "Growing a culture of responsibility", text: "Character, discipline and respectful relationships remain central to the Menwe learner experience." },
];

export default function NewsPage() {
  const [, go] = useLocation();
  return <PublicLayout>
    <section className="relative overflow-hidden bg-[#061229] text-white">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#D89B28]/15 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#D89B28]">News · Menwe community</p>
        <h1 className="mt-4 max-w-4xl font-serif text-4xl font-semibold leading-[.98] tracking-[-.04em] sm:text-6xl">Stories and updates from Menwe.</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">Stay connected with learner growth, school announcements and the moments shaping our community.</p>
      </div>
    </section>
    <main className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {stories.map(({ tag, title, text }) => <article key={title} className="rounded-2xl border border-gray-100 bg-white p-7 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#061229]/5 text-[#D89B28]"><Newspaper size={20} /></div>
          <span className="mt-5 inline-flex rounded-full bg-[#D89B28]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#D89B28]">{tag}</span>
          <h2 className="mt-5 font-serif text-2xl font-semibold text-[#061229]">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
          <button onClick={() => go("/contact")} className="mt-6 inline-flex min-h-12 items-center gap-2 text-xs font-bold text-[#061229]">Ask the school <ArrowRight size={14} /></button>
        </article>)}
      </div>
      <section className="mt-16 rounded-2xl border border-[#D89B28]/20 bg-[#D89B28]/10 p-7">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-[#D89B28] shadow-sm"><Megaphone size={20} /></div>
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D89B28]">Official updates</p><h2 className="mt-2 font-serif text-3xl font-semibold text-[#061229]">Stay close to school communication.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">For the latest official notices, families should use the school's communication channels or contact the school directly.</p></div>
        </div>
      </section>
    </main>
  </PublicLayout>;
}
