import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import PublicLayout from "@/components/PublicLayout";

const events = [
  ["SEP", "12", "Annual Sports Day", "Main School Sports Field · 8:00 AM"],
  ["OCT", "03", "JSS Science Exhibition", "Science & Innovation Hall · 10:00 AM"],
  ["OCT", "17", "Term 3 PTA Meeting", "Main School Campus · 9:00 AM"],
] as const;

export default function EventsPage() {
  const [, go] = useLocation();
  return <PublicLayout>
    <section className="relative overflow-hidden bg-[#061229] text-white">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#D89B28]/15 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#D89B28]">Events · School calendar</p>
        <h1 className="mt-4 max-w-4xl font-serif text-4xl font-semibold leading-[.98] tracking-[-.04em] sm:text-6xl">What is happening at Menwe.</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">Plan ahead for sports, exhibitions, family meetings and other important moments across the school year.</p>
      </div>
    </section>
    <main className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="flex items-end justify-between gap-5"><div><span className="inline-flex rounded-full bg-[#D89B28]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#D89B28]">Upcoming events</span><h2 className="mt-3 font-serif text-3xl font-semibold text-[#061229]">Mark your calendar.</h2></div><CalendarDays className="text-[#D89B28]" /></div>
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {events.map(([month, day, title, meta]) => <article key={title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
          <div className="flex gap-4"><div className="w-14 shrink-0 overflow-hidden rounded-xl bg-[#D89B28] text-center"><span className="block py-1 text-[9px] font-bold text-[#061229]">{month}</span><strong className="block bg-white py-2 text-xl text-[#061229]">{day}</strong></div><div className="min-w-0"><h3 className="font-serif text-xl font-semibold text-[#061229]">{title}</h3><p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-500"><MapPin size={13} className="mt-0.5 shrink-0" />{meta}</p></div></div>
        </article>)}
      </div>
      <section className="mt-16 rounded-2xl bg-[#061229] p-8 text-white shadow-md">
        <span className="inline-flex rounded-full bg-[#D89B28]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#D89B28]">Academic calendar</span>
        <h2 className="mt-4 font-serif text-3xl font-semibold">Plan the term with confidence.</h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{["Term start & end dates", "Mid-term breaks", "Assessment & exam periods", "Family engagement days"].map(item => <div key={item} className="rounded-xl border border-white/10 p-4 text-sm font-semibold text-white/80"><CalendarDays className="mb-3 text-[#D89B28]" size={18} />{item}</div>)}</div>
        <button onClick={() => go("/contact")} className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#D89B28] px-5 py-3 text-xs font-bold text-[#061229]">Ask about an event <ArrowRight size={14} /></button>
      </section>
    </main>
  </PublicLayout>;
}
