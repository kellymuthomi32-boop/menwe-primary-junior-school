import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  HeartHandshake,
  Laptop,
  MapPin,
  ShieldCheck,
  Sprout,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import PublicLayout from "@/components/PublicLayout";

const latitude = -0.099245555;
const longitude = 37.58121778;
const physicalLocation = "Menwe Village, Abogeta, South Imenti, Meru County, Kenya";
const postalAddress = "P.O. Box 19, Kionyo";

const stats = [
  { value: "314", label: "Active learners", note: "Grades PP1–9", icon: UsersRound },
  { value: "5", label: "Active teachers", note: "Current portal records", icon: GraduationCap },
  { value: "9", label: "Grade levels", note: "Grade 1–9", icon: BookOpen },
  { value: "3", label: "Learning stages", note: "Early Years · Primary · Junior", icon: Sprout },
];

const values = [
  [ShieldCheck, "Integrity", "We encourage learners to act honestly, responsibly and with respect for others."],
  [GraduationCap, "Learning", "We value curiosity, effort, competence and steady academic growth."],
  [HeartHandshake, "Respect & Community", "We believe education grows stronger when learners, parents, teachers and the community work together."],
  [Sprout, "Growth", "We support the whole learner by developing knowledge, practical ability, creativity and confidence."],
] as const;

const stages = [
  {
    number: "01",
    title: "Early Years",
    label: "PP1–PP2",
    text: "A strong beginning built around communication, early literacy and numeracy, creativity, movement, social development and age-appropriate learning activities.",
    areas: ["Language & communication", "Early numeracy", "Environmental learning", "Creative activities & movement"],
  },
  {
    number: "02",
    title: "Primary School",
    label: "Grades 1–6",
    text: "Learners develop foundations for confident independent learning through languages, mathematics, integrated learning, creativity, values and practical activities.",
    areas: ["English", "Kiswahili", "Mathematics", "Integrated Science & Agriculture", "Social Studies", "Creative Arts & Sports", "CRE"],
  },
  {
    number: "03",
    title: "Junior School",
    label: "Grades 7–9",
    text: "Junior School extends learning into deeper subject knowledge, practical skills, creativity, agriculture, pre-technical learning and preparation for future pathways.",
    areas: ["English", "Kiswahili", "Mathematics", "Integrated Science", "Pre-Technical", "Social Studies", "Agriculture", "CRE", "Creative Arts & Sports"],
  },
];

const milestones = [
  { year: "01", title: "A strong start", text: "Learners begin their journey through Early Years with foundations in communication, numeracy, creativity and positive learning habits." },
  { year: "02", title: "Primary foundations", text: "Grades 1–6 build literacy, numeracy, knowledge, values, creativity and practical problem-solving across the primary years." },
  { year: "03", title: "Junior School growth", text: "Grades 7–9 deepen subject learning while adding practical, creative, agricultural and pre-technical competencies." },
  { year: "04", title: "Sport & talent", text: "The Girls' Rugby team represented Menwe Junior School at county level, adding a confirmed sporting achievement to the school's story." },
  { year: "05", title: "Connected school community", text: "The portal brings school operations, learner records, communication and family-facing services into one secure digital experience." },
];

const leadership = [
  { name: "Mr. Simon Muriungi Muthemba", role: "Principal", initials: "SM", bio: "School leadership focused on learner welfare, academic progress, school operations and a supportive learning environment." },
  { name: "Alfred Mwenda", role: "Teacher", initials: "AM", bio: "Active member of the teaching team supporting classroom learning and learner development." },
  { name: "Jedidiah Kabiro", role: "Teacher", initials: "JK", bio: "Active member of the teaching team supporting classroom learning and learner development." },
  { name: "Lillian Gakii Kithinji", role: "Teacher", initials: "LG", bio: "Active member of the teaching team supporting classroom learning and learner development." },
  { name: "Scholastica Karwitha", role: "Teacher", initials: "SK", bio: "Active member of the teaching team supporting classroom learning and learner development." },
  { name: "Kelly Muthomi Kinoti", role: "Teacher", initials: "KM", bio: "Active member of the teaching team supporting classroom learning and learner development." },
];

const facilities = [
  [BookOpen, "Learning spaces", "A school environment designed around teaching, learning, learner participation and steady progress."],
  [Trophy, "Sports & talent", "Co-curricular participation creates space for teamwork, discipline, confidence and healthy competition."],
  [Laptop, "Digital portal", "Secure portal access supports school operations and gives authorised families and staff a connected digital experience."],
  [ShieldCheck, "Safety & trust", "Role-based access and protected school records help keep learner and family information appropriately secured."],
] as const;

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[opacity,transform] duration-700 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeading({ eyebrow, title, text, align = "left" }: { eyebrow: string; title: string; text?: string; align?: "left" | "center" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#D89B28]">{eyebrow}</p>
      <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[var(--ink,#061229)] sm:text-4xl lg:text-[2.75rem]">{title}</h2>
      {text && <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{text}</p>}
    </div>
  );
}

function StatCard({ stat }: { stat: typeof stats[number] }) {
  const Icon = stat.icon;
  return (
    <article className="group rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.1] hover:shadow-xl sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D89B28]/15 text-[#D89B28]" aria-hidden="true"><Icon size={20} /></div>
        <span className="text-2xl font-black tracking-tight text-white sm:text-3xl">{stat.value}</span>
      </div>
      <p className="mt-4 text-sm font-bold text-white">{stat.label}</p>
      <p className="mt-1 text-xs text-white/50">{stat.note}</p>
    </article>
  );
}

export default function AboutPage() {
  const [, go] = useLocation();
  const [selectedLeader, setSelectedLeader] = useState<(typeof leadership)[number] | null>(null);

  return (
    <PublicLayout>
      <section className="relative isolate overflow-hidden bg-[#061229] text-white">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-[#D89B28]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -left-40 h-[28rem] w-[28rem] rounded-full bg-[#D89B28]/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D89B28]/50 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-5 pb-12 pt-20 sm:pb-16 lg:px-8 lg:pb-20 lg:pt-28">
          <div className="grid items-end gap-12 lg:grid-cols-[1.2fr_.8fr]">
            <div>
              <p className="inline-flex rounded-full border border-[#D89B28]/30 bg-[#D89B28]/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#D89B28]">About Menwe Primary & Junior School</p>
              <h1 className="mt-6 max-w-5xl font-serif text-4xl font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">Growing capable, confident and responsible learners.</h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-white/70 sm:text-lg">A connected learning community in Menwe Village, supporting learners from Early Years through Primary and Junior School with knowledge, character, practical competence and confidence.</p>
              <div className="mt-7 flex flex-col gap-3 text-sm text-white/65 sm:flex-row sm:flex-wrap sm:gap-x-6">
                <span className="flex items-center gap-2"><MapPin size={17} className="text-[#D89B28]" /> {physicalLocation}</span>
                <span className="flex items-center gap-2"><BookOpen size={17} className="text-[#D89B28]" /> {postalAddress}</span>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => go("/admissions")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#D89B28] px-5 text-sm font-extrabold text-[#061229] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#D89B28] focus:ring-offset-2 focus:ring-offset-[#061229]" aria-label="Apply for admission">Explore admissions <ArrowRight size={17} /></button>
                <button onClick={() => go("/gallery")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-extrabold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#D89B28] focus:ring-offset-2 focus:ring-offset-[#061229]" aria-label="View the school gallery">View school life <ChevronRight size={17} /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4" aria-label="School statistics">
              {stats.map((stat) => <StatCard key={stat.label} stat={stat} />)}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <Reveal>
          <section>
            <SectionHeading eyebrow="Who we are" title="One school. One learning journey. Every learner matters." text="Menwe brings together the foundational years, primary education and Junior School in one continuous learning journey. The aim is to help every learner build strong foundations, discover strengths, develop practical competence and become ready for the next stage." />
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {stages.map((stage, index) => (
                <article key={stage.title} className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl sm:p-7">
                  <span className="absolute right-5 top-5 font-serif text-5xl font-semibold text-slate-100 transition-colors group-hover:text-[#D89B28]/15">{stage.number}</span>
                  <span className="relative inline-flex rounded-full bg-[#D89B28]/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#D89B28]">{stage.label}</span>
                  <h3 className="relative mt-5 font-serif text-2xl font-semibold text-[#061229]">{stage.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{stage.text}</p>
                  <div className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400"><span>Stage {index + 1}</span><span className="h-px flex-1 bg-slate-100" /></div>
                </article>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-24">
          <section>
            <SectionHeading eyebrow="Purpose & principles" title="Vision, mission and values that guide the experience." text="The About page expresses Menwe's educational direction in clear, learner-centred language and avoids presenting unverified wording as an official quotation." />
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <article className="group rounded-3xl bg-[#061229] p-7 text-white shadow-xl transition-all duration-300 hover:-translate-y-1 sm:p-9">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D89B28]/15 text-[#D89B28]"><Sprout size={23} /></div>
                <p className="mt-7 text-xs font-extrabold uppercase tracking-[.2em] text-[#D89B28]">Our vision</p>
                <h3 className="mt-3 font-serif text-3xl font-semibold">Learners ready for life and the future.</h3>
                <p className="mt-4 text-sm leading-7 text-white/65">Develop learners who can apply what they learn, make responsible choices, communicate confidently, work with others and continue learning beyond the classroom.</p>
              </article>
              <article className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-9">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#061229]/5 text-[#061229]"><HeartHandshake size={23} /></div>
                <p className="mt-7 text-xs font-extrabold uppercase tracking-[.2em] text-[#D89B28]">Our mission</p>
                <h3 className="mt-3 font-serif text-3xl font-semibold text-[#061229]">Education that develops the whole learner.</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">Focus on knowledge, competence, character, creativity, practical ability and positive relationships so learners can participate confidently in school, family and community life.</p>
              </article>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {values.map(([Icon, title, text], index) => (
                <article key={title} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl" tabIndex={0} aria-label={`${title}: ${text}`}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229]"><Icon size={21} /></div>
                  <div className="mt-4 flex items-center gap-2"><span className="text-[10px] font-black text-slate-300">0{index + 1}</span><h3 className="font-bold text-[#061229]">{title}</h3></div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-24">
          <section>
            <SectionHeading eyebrow="Our journey" title="A timeline of learning, growth and connection." text="The timeline focuses on confirmed stages and achievements in the current school story rather than inventing historical dates that are not documented in the portal." />
            <div className="relative mt-10">
              <div className="absolute bottom-4 left-[19px] top-4 w-px bg-gradient-to-b from-[#D89B28] via-slate-200 to-transparent sm:left-1/2 sm:-translate-x-1/2" aria-hidden="true" />
              <div className="space-y-7">
                {milestones.map((item, index) => (
                  <article key={item.year} className={`relative grid gap-5 sm:grid-cols-2 sm:gap-12 ${index % 2 ? "sm:text-right" : ""}`}>
                    <div className={index % 2 ? "sm:order-2" : ""}>
                      <div className="ml-12 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:ml-0 sm:p-6">
                        <span className="text-xs font-black uppercase tracking-[.18em] text-[#D89B28]">{item.year}</span>
                        <h3 className="mt-2 text-lg font-bold text-[#061229]">{item.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
                      </div>
                    </div>
                    <div className={`absolute left-[11px] top-5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-4 border-white bg-[#D89B28] shadow sm:left-1/2 sm:-translate-x-1/2 ${index % 2 ? "sm:order-1" : ""}`} aria-hidden="true"><span className="h-1.5 w-1.5 rounded-full bg-white" /></div>
                    <div className="hidden sm:block" />
                  </article>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-24">
          <section>
            <SectionHeading eyebrow="Academic journey" title="From foundational learning to Junior School pathways." text="The current portal structure supports learners from PP1 through Grade 9. Subject lists below reflect the current school catalogue." />
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {stages.map((stage) => (
                <article key={stage.title} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl sm:p-7">
                  <div className="flex items-center justify-between"><span className="rounded-full bg-[#D89B28]/10 px-3 py-1 text-xs font-extrabold uppercase text-[#D89B28]">{stage.label}</span><span className="text-xs font-black text-slate-300">{stage.number}</span></div>
                  <h3 className="mt-5 font-serif text-2xl font-semibold text-[#061229]">{stage.title}</h3>
                  <div className="mt-5 space-y-2">{stage.areas.map((area) => <div key={area} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#D89B28]" />{area}</div>)}</div>
                </article>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-24">
          <section className="overflow-hidden rounded-[2rem] bg-[#061229] text-white shadow-2xl">
            <div className="grid lg:grid-cols-[1.05fr_.95fr]">
              <div className="p-7 sm:p-10 lg:p-12">
                <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#D89B28]">Junior School</p>
                <h2 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">Menwe Junior School · Grades 7–9</h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65">Junior School is a key transition toward greater independence. The current structure combines languages, mathematics, science, social learning, agriculture, pre-technical learning, religious education and creative and sporting development.</p>
                <button onClick={() => go("/academics")} className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-extrabold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#D89B28]" aria-label="Explore academics">Explore academics <ArrowRight size={16} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-white/10 bg-white/[.03] p-5 sm:grid-cols-3 sm:p-7 lg:border-l lg:border-t-0 lg:grid-cols-2">{stages[2].areas.map((area) => <span key={area} className="flex min-h-12 items-center rounded-xl bg-white/[.05] px-3 py-2 text-sm font-semibold text-white/75 ring-1 ring-white/10">{area}</span>)}</div>
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-24">
          <section>
            <SectionHeading eyebrow="Leadership & faculty" title="People who help the school community move forward." text="Current active teacher records in the school portal are presented here without inventing biographies or qualifications. Select a profile for a short overview." />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {leadership.map((person, index) => (
                <button key={person.name} type="button" onClick={() => setSelectedLeader(person)} className="group rounded-3xl border border-gray-100 bg-white p-5 text-left shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#D89B28] focus:ring-offset-2 sm:p-6" aria-label={`View profile for ${person.name}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#061229] to-[#10254a] text-lg font-black text-[#D89B28] shadow-inner">{person.initials}</div>
                    <span className="rounded-full bg-[#D89B28]/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#D89B28]">{person.role}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-[#061229]">{person.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{person.bio}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-[#061229] transition group-hover:text-[#D89B28]">View profile <ArrowRight size={14} /></span>
                  <span className="sr-only">Profile {index + 1}</span>
                </button>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-24">
          <section>
            <SectionHeading eyebrow="Learning environment" title="Facilities, sport and digital access working together." text="The About experience highlights the capabilities represented in the current school and portal without claiming facilities that have not been verified." />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {facilities.map(([Icon, title, text]) => (
                <article key={title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl" tabIndex={0} aria-label={`${title}: ${text}`}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229]"><Icon size={21} /></div>
                  <h3 className="mt-5 text-lg font-bold text-[#061229]">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <article className="rounded-3xl border border-[#D89B28]/20 bg-[#D89B28]/5 p-7 sm:p-9">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#D89B28] text-[#061229]"><Trophy size={26} /></div><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#D89B28]">Confirmed achievement</p><h3 className="mt-2 text-2xl font-bold text-[#061229]">Girls' Rugby County Representation</h3><p className="mt-3 text-sm leading-7 text-slate-700">The Girls' Rugby team represented Menwe Junior School at county level. This achievement reflects learner participation in sport, teamwork and talent development.</p><button onClick={() => go("/gallery")} className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-extrabold text-[#061229] hover:text-[#D89B28] focus:outline-none focus:ring-2 focus:ring-[#D89B28]" aria-label="View girls rugby gallery">View gallery <ArrowRight size={16} /></button></div></div>
              </article>
              <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-md sm:p-9"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#061229]/5 text-[#061229]"><Laptop size={25} /></div><h3 className="mt-5 text-2xl font-bold text-[#061229]">A connected school portal</h3><p className="mt-3 text-sm leading-7 text-slate-600">Authorised staff and families can use the secure portal for school services, while role-based access keeps operational records separated according to user responsibilities.</p><button onClick={() => go("/login")} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#061229] px-4 text-sm font-extrabold text-white transition hover:bg-[#10254a] focus:outline-none focus:ring-2 focus:ring-[#D89B28] focus:ring-offset-2" aria-label="Sign in to the school portal">Portal sign in <ArrowRight size={16} /></button></article>
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-24">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-md sm:p-10 lg:p-12">
            <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
              <div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#D89B28]">Location & community</p><h2 className="mt-3 font-serif text-3xl font-semibold text-[#061229] sm:text-4xl">Find Menwe in Menwe Village.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">Physical location: <strong className="text-[#061229]">Menwe Village, Abogeta, South Imenti, Meru County, Kenya</strong>. Postal address: <strong className="text-[#061229]">{postalAddress}</strong>.</p><div className="mt-6 flex flex-wrap gap-3"><button onClick={() => go("/contact")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#061229] px-4 text-sm font-extrabold text-white transition hover:bg-[#10254a] focus:outline-none focus:ring-2 focus:ring-[#D89B28] focus:ring-offset-2">Contact the school <ArrowRight size={16} /></button><a href={`https://www.google.com/maps?q=${latitude},${longitude}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-[#061229] transition hover:border-[#D89B28] hover:text-[#D89B28] focus:outline-none focus:ring-2 focus:ring-[#D89B28]">Open map <MapPin size={16} /></a></div></div>
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#D89B28]/10 text-[#D89B28]" aria-hidden="true"><MapPin size={34} /></div>
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-16">
          <section className="relative overflow-hidden rounded-[2rem] bg-[#061229] p-8 text-white shadow-2xl sm:p-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#D89B28]/15 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
              <div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#D89B28]">Start the next chapter</p><h2 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">Ready to become part of the Menwe community?</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">Explore admissions, discover school life or contact the school team for more information.</p></div>
              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end"><button onClick={() => go("/admissions")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#D89B28] px-5 text-sm font-extrabold text-[#061229] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#D89B28] focus:ring-offset-2 focus:ring-offset-[#061229]">Explore admissions <ArrowRight size={17} /></button><button onClick={() => go("/contact")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-extrabold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#D89B28] focus:ring-offset-2 focus:ring-offset-[#061229]">Contact us <HeartHandshake size={17} /></button></div>
            </div>
          </section>
        </Reveal>
      </main>

      {selectedLeader && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-[#061229]/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedLeader(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="leader-dialog-title" className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-5"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#061229] text-lg font-black text-[#D89B28]">{selectedLeader.initials}</div><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#D89B28]">{selectedLeader.role}</p><h2 id="leader-dialog-title" className="mt-1 text-xl font-bold text-[#061229]">{selectedLeader.name}</h2></div></div><button type="button" onClick={() => setSelectedLeader(null)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D89B28]" aria-label="Close profile">×</button></div>
            <p className="mt-7 text-sm leading-7 text-slate-600">{selectedLeader.bio}</p>
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><div className="flex items-start gap-3"><Check size={17} className="mt-0.5 shrink-0 text-[#D89B28]" /> Current active school portal record</div></div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
