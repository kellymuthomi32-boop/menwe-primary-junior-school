import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, HeartHandshake, MapPin, ShieldCheck, Sprout, Trophy, UsersRound } from "lucide-react";
import { useLocation } from "wouter";
import PublicLayout from "@/components/PublicLayout";

const latitude = -0.099245555;
const longitude = 37.58121778;
const physicalLocation = "Menwe Village, Abogeta, South Imenti, Meru County, Kenya";
const postalAddress = "P.O. Box 19, Kionyo";

const stages = [
  {
    title: "Early Years",
    label: "PP1–PP2",
    text: "A strong beginning built around communication, early literacy and numeracy, creativity, movement, social development and learning through age-appropriate activities.",
    areas: ["Language and communication", "Early numeracy", "Environmental learning", "Creative activities and movement"],
  },
  {
    title: "Primary School",
    label: "Grades 1–6",
    text: "Learners develop the foundations needed for confident independent learning through languages, mathematics, integrated learning, creativity, values and practical activities.",
    areas: ["English", "Kiswahili", "Mathematics", "Integrated Science and Agriculture", "Social Studies", "Creative Arts and Sports", "CRE"],
  },
  {
    title: "Junior School",
    label: "Grades 7–9",
    text: "Junior School extends learning into deeper subject knowledge, practical skills, creativity, technology, agriculture and preparation for future learning pathways.",
    areas: ["English", "Kiswahili", "Mathematics", "Integrated Science", "Pre-Technical", "Social Studies", "Agriculture", "CRE", "Creative Arts and Sports"],
  },
];

const values = [
  [ShieldCheck, "Integrity", "We encourage learners to act honestly, responsibly and with respect for others."],
  [GraduationCap, "Learning", "We value curiosity, effort, competence and steady academic growth."],
  [HeartHandshake, "Respect & Community", "We believe education grows stronger when learners, parents, teachers and the community work together."],
  [Sprout, "Growth", "We support the whole learner by developing knowledge, practical ability, creativity and confidence."],
];

const activities = [
  [Trophy, "Sports & Talent", "Sport and co-curricular participation give learners opportunities to build teamwork, discipline, confidence and healthy competition."],
  [UsersRound, "Learner Development", "The school supports learners across the Early Years, Primary and Junior School stages as they grow academically and personally."],
  [BookOpen, "Competency-Based Learning", "Learning is presented around knowledge, skills, values, application and evidence of learner progress rather than memorisation alone."],
];

function Heading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">{eyebrow}</p>
      <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#061229] sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{text}</p>}
    </div>
  );
}

export default function AboutPage() {
  const [, go] = useLocation();

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-[#061229] text-white">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#D89B28]/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[#D89B28]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <p className="text-xs font-bold uppercase tracking-[.22em] text-[#D89B28]">About Menwe Primary & Junior School</p>
          <h1 className="mt-4 max-w-5xl font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">Growing capable, confident and responsible learners in Menwe Village.</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-white/75 sm:text-lg">Menwe Primary & Junior School serves learners through Early Years, Primary School and Junior School. Our public school story is centred on learning, character, practical competence, co-curricular participation and partnership with families and the surrounding community.</p>
          <div className="mt-7 flex flex-col gap-3 text-sm text-white/75 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
            <span className="flex items-center gap-2"><MapPin size={18} className="text-[#D89B28]" /> {physicalLocation}</span>
            <span className="flex items-center gap-2"><BookOpen size={18} className="text-[#D89B28]" /> Postal: {postalAddress}</span>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <section>
          <Heading eyebrow="Who we are" title="A school built around the learner." text="Menwe brings together the foundational years, primary education and Junior School in one learning journey. The goal is to help every learner build strong foundations, discover strengths, develop practical competence and become ready for the next stage of education." />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              ["Early Years", "PP1–PP2", "Build early communication, numeracy, creativity, social development and positive learning habits."],
              ["Primary", "Grades 1–6", "Strengthen literacy, numeracy, knowledge, values, creativity and practical problem-solving."],
              ["Junior School", "Grades 7–9", "Extend learning through subject depth, practical competencies, creativity and pathway preparation."],
            ].map(([title, label, text]) => (
              <article key={title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-slate-800">
                <span className="rounded-full bg-[#D89B28]/10 px-3 py-1 text-xs font-bold uppercase text-[#D89B28]">{label}</span>
                <h3 className="mt-5 text-xl font-bold text-[#061229]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <Heading eyebrow="Our purpose" title="Vision, mission and values in practice." text="The public About page uses these as the principles that describe the school's educational purpose, without presenting unverified wording as an official quotation." />
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl bg-[#061229] p-7 text-white shadow-xl sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Our vision</p>
              <h3 className="mt-3 font-serif text-3xl font-semibold">Learners ready for life and the future.</h3>
              <p className="mt-4 text-sm leading-7 text-white/70">Menwe's direction is to develop learners who can apply what they learn, make responsible choices, communicate confidently, work with others and continue learning beyond the classroom.</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-md sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Our mission</p>
              <h3 className="mt-3 font-serif text-3xl font-semibold text-[#061229]">Education that develops the whole learner.</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">We focus on knowledge, competence, character, creativity, practical ability and positive relationships so that learners can participate confidently in school, family and community life.</p>
            </article>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(([Icon, title, text]) => (
              <article key={title as string} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229]"><Icon size={21} /></div>
                <h3 className="mt-4 font-bold text-[#061229]">{title as string}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text as string}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <Heading eyebrow="Academic journey" title="One continuous learning journey from the early years to Junior School." text="The school's current academic structure supports learners from PP1 through Grade 9. The subject list below reflects the current school catalogue used by the portal." />
          <div className="mt-8 space-y-5">
            {stages.map((stage, index) => (
              <article key={stage.title} className="grid gap-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl lg:grid-cols-[.7fr_1.3fr] lg:p-8">
                <div>
                  <span className="rounded-full bg-[#D89B28]/10 px-3 py-1 text-xs font-bold uppercase text-[#D89B28]">Stage {index + 1} · {stage.label}</span>
                  <h3 className="mt-4 font-serif text-2xl font-semibold text-[#061229]">{stage.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{stage.text}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#D89B28]">Current learning areas</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">{stage.areas.map(area => <div key={area} className="flex items-start gap-2 rounded-xl bg-white p-3 text-sm font-semibold text-slate-700"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#D89B28]" />{area}</div>)}</div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-3xl bg-gradient-to-r from-slate-900 to-[#0b1d3a] p-7 text-white sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Junior School</p>
          <div className="mt-3 grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
            <div>
              <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Menwe Junior School · Grades 7–9</h2>
              <p className="mt-4 text-sm leading-7 text-white/70">Junior School is an important stage in the learner's transition toward greater independence. Menwe's current Grade 7–9 subject structure combines languages, mathematics, science, social learning, agriculture, pre-technical learning, religious education and creative and sporting development.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">{stages[2].areas.map(area => <span key={area} className="rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold ring-1 ring-white/10">{area}</span>)}</div>
          </div>
        </section>

        <section className="mt-20">
          <Heading eyebrow="Beyond the classroom" title="Sports, talent and learner development." text="Education at Menwe is not limited to academic work. Co-curricular activities create space for teamwork, discipline, creativity, physical development and confidence." />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {activities.map(([Icon, title, text]) => (
              <article key={title as string} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229]"><Icon size={21} /></div>
                <h3 className="mt-5 text-xl font-bold text-[#061229]">{title as string}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{text as string}</p>
              </article>
            ))}
          </div>
          <article className="mt-5 overflow-hidden rounded-3xl border border-[#D89B28]/20 bg-[#D89B28]/5 p-7 sm:p-9">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#D89B28] text-[#061229]"><Trophy size={26} /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Confirmed school achievement</p>
                <h3 className="mt-2 text-2xl font-bold text-[#061229]">Girls' Rugby County Representation</h3>
                <p className="mt-3 text-sm leading-7 text-slate-700">The Girls' Rugby team represented Menwe Junior School at county level. This achievement is part of the school's story of learner participation in sport and talent development.</p>
                <button onClick={() => go("/gallery")} className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#061229] hover:text-[#D89B28]">View the gallery <ArrowRight size={16} /></button>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-20">
          <Heading eyebrow="People & partnership" title="A school community works best together." text="Learner progress depends on the partnership between school leadership, teachers, parents, learners and the wider community." />
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <article className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229]"><UsersRound size={21} /></div><h3 className="mt-5 text-xl font-bold text-[#061229]">School leadership</h3><p className="mt-3 text-sm leading-7 text-slate-600">Leadership provides direction for learner welfare, school operations, academic progress and the development of a supportive learning environment.</p></article>
            <article className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229]"><GraduationCap size={21} /></div><h3 className="mt-5 text-xl font-bold text-[#061229]">Teachers & learners</h3><p className="mt-3 text-sm leading-7 text-slate-600">Teachers guide learning and assessment while learners take an active role in developing knowledge, skills, values and confidence.</p></article>
            <article className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229]"><HeartHandshake size={21} /></div><h3 className="mt-5 text-xl font-bold text-[#061229]">Parents & community</h3><p className="mt-3 text-sm leading-7 text-slate-600">Families and the community remain important partners in learner support, communication, participation and school development.</p></article>
          </div>
        </section>

        <section className="mt-20">
          <Heading eyebrow="Leadership" title="Purposeful leadership and accountability." text="The About page identifies the current principal and describes leadership responsibilities without inventing a list of names or offices that has not been confirmed." />
          <div className="mt-8 rounded-3xl bg-[#061229] p-7 text-white shadow-xl sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Principal</p>
            <h3 className="mt-3 font-serif text-3xl font-semibold">Mr. Simon Muriungi Muthemba</h3>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">The principal provides school leadership with a focus on learner welfare, discipline, academic progress, curriculum implementation and a positive school environment.</p>
          </div>
        </section>

        <section className="mt-20">
          <Heading eyebrow="Learning environment" title="A practical and welcoming place to learn." text="Menwe's learning environment is described around what the school exists to provide: safe classrooms, teaching and learning resources, opportunities for practical work, co-curricular participation and a supportive school community." />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {["Classroom learning", "Practical activities", "Reading & learning resources", "Sports & co-curricular participation"].map(item => <div key={item} className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-md"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229]"><CheckCircle2 size={21} /></div><p className="mt-4 text-sm font-bold text-[#061229]">{item}</p></div>)}
          </div>
        </section>

        <section className="mt-20 rounded-3xl bg-slate-50 p-7 sm:p-10">
          <Heading eyebrow="Our place in the community" title="Menwe Village is home." text="Menwe Primary & Junior School is physically located in Menwe Village. Kionyo is retained as the postal reference on the school's address, so the two are not presented as the same thing." />
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#D89B28]">Physical location</p><p className="mt-2 font-semibold text-[#061229]">{physicalLocation}</p></div>
            <div className="rounded-2xl bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#D89B28]">Postal address</p><p className="mt-2 font-semibold text-[#061229]">{postalAddress}</p></div>
          </div>
        </section>

        <section className="mt-20 rounded-3xl bg-gradient-to-r from-slate-900 to-[#0b1d3a] p-7 text-white shadow-2xl sm:p-10">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Visit Menwe</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">Come and learn more about the school.</h2>
            <p className="mt-4 text-sm leading-7 text-white/70">Families can explore the school information, admissions process and public gallery, or use the map to find the school's physical location.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href={`https://www.google.com/maps?q=${latitude},${longitude}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#D89B28] px-5 py-3 text-sm font-extrabold text-[#061229] transition-all hover:bg-[#c28920]"><MapPin size={17} /> Open school location</a>
              <button onClick={() => go("/admissions")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-white/10"><GraduationCap size={17} /> Explore admissions <ArrowRight size={16} /></button>
              <button onClick={() => go("/contact")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-white/10"><HeartHandshake size={17} /> Contact the school <ArrowRight size={16} /></button>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
