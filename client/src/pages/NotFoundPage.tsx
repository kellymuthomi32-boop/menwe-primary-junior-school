import { ArrowLeft, ArrowRight, BookOpen, Home, Mail, PhoneCall, SearchX } from "lucide-react";
import { useLocation } from "wouter";
import PublicLayout from "@/components/PublicLayout";

const card = "rounded-2xl border border-gray-100 bg-white shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900";

export default function NotFoundPage() {
  const [, go] = useLocation();

  return (
    <PublicLayout>
      <main className="relative min-h-[calc(100vh-9rem)] overflow-hidden bg-[#F8F9FA] dark:bg-slate-950">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-[#D89B28]/10 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-[#061229]/10 blur-3xl dark:bg-[#D89B28]/5" />
        <div className="relative mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-[#061229] text-[#D89B28] shadow-xl ring-8 ring-[#061229]/5 dark:ring-white/5"><SearchX size={42} strokeWidth={1.7} /></div>
            <p className="mt-8 text-xs font-extrabold uppercase tracking-[.25em] text-[#D89B28]">Menwe Primary & Junior School</p>
            <p className="mt-4 font-serif text-[5.5rem] font-bold leading-none tracking-tight text-[#061229] dark:text-white sm:text-[8rem]">404</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-[#061229] dark:text-white sm:text-4xl">Page Not Found</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">The page you are looking for might have been moved, renamed, or does not exist. Let us get you back to a useful part of the Menwe website.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button onClick={() => go("/")} className="inline-flex items-center gap-2 rounded-xl bg-[#D89B28] px-6 py-3.5 text-sm font-extrabold text-[#061229] shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"><Home size={17} /> Return to Homepage</button>
              <button onClick={() => go("/contact")} className="inline-flex items-center gap-2 rounded-xl border border-[#061229]/15 bg-white px-6 py-3.5 text-sm font-bold text-[#061229] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-white"><Mail size={17} /> Contact School Office</button>
            </div>
          </div>

          <section className="mt-14 grid gap-5 md:grid-cols-3">
            <button onClick={() => go("/academics")} className={`${card} p-7 text-left`}><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229] dark:bg-white/10 dark:text-[#D89B28]"><BookOpen size={20} /></div><p className="mt-6 text-xs font-extrabold uppercase tracking-[.18em] text-[#D89B28]">Explore learning</p><h2 className="mt-2 font-serif text-2xl font-semibold text-[#061229] dark:text-white">Academics</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Discover PP1–PP2, Grades 1–6 and JSS Grades 7–9.</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#061229] dark:text-white">Open page <ArrowRight size={14} /></span></button>
            <button onClick={() => go("/admissions")} className={`${card} p-7 text-left`}><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229] dark:bg-white/10 dark:text-[#D89B28]"><ArrowRight size={20} /></div><p className="mt-6 text-xs font-extrabold uppercase tracking-[.18em] text-[#D89B28]">Join Menwe</p><h2 className="mt-2 font-serif text-2xl font-semibold text-[#061229] dark:text-white">Admissions</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Find guidance for families considering Menwe Primary & Junior School.</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#061229] dark:text-white">View admissions <ArrowRight size={14} /></span></button>
            <div className={`${card} p-7`}><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D89B28]/10 text-[#D89B28]"><PhoneCall size={20} /></div><p className="mt-6 text-xs font-extrabold uppercase tracking-[.18em] text-[#D89B28]">Need assistance?</p><h2 className="mt-2 font-serif text-2xl font-semibold text-[#061229] dark:text-white">School Office</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Call <span className="font-bold text-[#061229] dark:text-white">0142550882</span> for help finding the right page or service.</p></div>
          </section>

          <div className="mx-auto mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs font-bold text-slate-500 dark:text-slate-400">
            <button onClick={() => go("/school-life")} className="hover:text-[#061229] dark:hover:text-white">School Life</button>
            <button onClick={() => go("/families")} className="hover:text-[#061229] dark:hover:text-white">For Families</button>
            <button onClick={() => go("/how-it-works")} className="hover:text-[#061229] dark:hover:text-white">How CBC Works</button>
            <button onClick={() => go("/calendar")} className="hover:text-[#061229] dark:hover:text-white">Calendar</button>
            <button onClick={() => go("/gallery")} className="hover:text-[#061229] dark:hover:text-white">Gallery</button>
          </div>

          <button onClick={() => window.history.back()} className="mx-auto mt-8 flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-[#061229] dark:hover:text-white"><ArrowLeft size={14} /> Go back to the previous page</button>

          <div className="mx-auto mt-10 max-w-3xl rounded-2xl bg-[#061229] px-6 py-5 text-center text-sm text-white/70 shadow-md"><span className="font-semibold text-white">Menwe Primary & Junior School</span> · Kionyo, Abogeta Sub-County, Meru County, Kenya · P.O. Box 19, Kionyo</div>
        </div>
      </main>
    </PublicLayout>
  );
}
