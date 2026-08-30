import { BookOpen, FlaskConical, Laptop, Music, Trophy, Sprout } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";

const pathways = [
  { title: "Early Years & Primary", level: "PP1–PP2 and Grades 1–6", copy: "Foundational literacy, numeracy, creative expression, environmental awareness and social-emotional development.", icon: BookOpen },
  { title: "Junior Secondary", level: "Grades 7–9", copy: "Science laboratory learning, digital literacy, languages, mathematics and pre-technical studies within the CBC framework.", icon: FlaskConical },
  { title: "Talent & Co-curricular", level: "Learning beyond the classroom", copy: "Football and athletics, music and band, drama, agriculture, STEM clubs and leadership opportunities.", icon: Trophy },
];

const focusAreas = [
  { icon: Laptop, label: "Digital literacy" },
  { icon: FlaskConical, label: "Science discovery" },
  { icon: Music, label: "Music & band" },
  { icon: Sprout, label: "Agriculture & STEM" },
];

const card = "rounded-2xl border border-gray-100 bg-white shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900";
const iconContainer = "flex h-12 w-12 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229]";

export default function AcademicsPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-5 pb-14 pt-16 lg:px-8 lg:pt-24">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Academic excellence</p>
        <h1 className="mt-4 max-w-4xl font-serif text-4xl font-semibold tracking-tight text-[#061229] sm:text-6xl">Learning pathways designed for every stage of growth.</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">At Menwe Primary &amp; Junior School, the Competency-Based Curriculum is brought to life through purposeful teaching, practical discovery and strong character formation.</p>
      </section>

      <section className="bg-[#F8F9FA]">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-3">
            {pathways.map((pathway) => {
              const Icon = pathway.icon;
              return (
                <article key={pathway.title} className={`${card} p-7`}>
                  <div className={iconContainer}><Icon size={21} /></div>
                  <p className="mt-7 inline-block rounded-full bg-[#D89B28]/10 px-3 py-1 text-xs font-bold uppercase text-[#D89B28]">{pathway.level}</p>
                  <h2 className="mt-3 font-serif text-2xl font-semibold text-[#061229] dark:text-white">{pathway.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{pathway.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Our methodology</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-[#061229]">CBC with purpose, practice and personal attention.</h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">Our 23 TSC/BOM certified educators use learner-centred approaches that connect classroom concepts with practical skills, collaboration, creativity and responsible decision-making.</p>
            <p className="mt-4 text-sm font-semibold text-[#061229]">CBC Framework: PP1–PP2 · Grades 1–6 · Grades 7–9 with Science &amp; Computer Labs</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {focusAreas.map((area) => {
              const Icon = area.icon;
              return (
                <div key={area.label} className={`${card} p-5`}>
                  <div className={iconContainer}><Icon size={19} /></div>
                  <p className="mt-8 text-sm font-semibold text-[#061229] dark:text-white">{area.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-gray-100 bg-[#061229] p-7 text-white shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-slate-800">
          <p className="inline-block rounded-full bg-[#D89B28]/10 px-3 py-1 text-xs font-bold uppercase text-[#D89B28]">History &amp; leadership</p>
          <p className="mt-4 text-sm leading-6 text-white/75">Established in 1961, Menwe is guided by Principal Mr. Simon Muriungi Muthemba and Deputy Principal Mr. Patrick Kimathi, working alongside our 23 TSC/BOM certified educators.</p>
          <p className="mt-3 text-sm leading-6 text-white/75">Location: Kionyo, Abogeta Sub-County, Meru County.</p>
        </div>
      </section>
    </PublicLayout>
  );
}
