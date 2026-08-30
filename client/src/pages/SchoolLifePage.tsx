import { Activity, Award, BookOpen, HeartHandshake, Leaf, Music, ShieldCheck, Sprout, Users, Volleyball } from "lucide-react";
import { useLocation } from "wouter";
import PublicLayout from "@/components/PublicLayout";

type Club = {
  icon: typeof Activity;
  title: string;
  description: string;
  grades: string;
  schedule: string;
};

const cardClass = "w-full min-w-0 max-w-full box-border rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl";
const iconClass = "mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-[#D89B28]";
const actionClass = "inline-flex min-h-[48px] items-center justify-center rounded-xl px-5 py-3 font-bold transition-all active:scale-[0.98]";

const clubs: Club[] = [
  { icon: ShieldCheck, title: "Kenya Scouts & Girl Guides Movement", description: "Builds discipline, service, teamwork, preparedness and confident leadership through practical outdoor learning.", grades: "Grades 3–9", schedule: "Fridays · 3:30 PM" },
  { icon: BookOpen, title: "ICT & Young Computer Scientists Club", description: "Learners explore digital literacy, coding concepts, safe internet use, problem-solving and creative technology projects.", grades: "Grades 4–9", schedule: "Tuesdays · 3:30 PM" },
  { icon: Leaf, title: "Wildlife & Environmental Conservation Club", description: "Hands-on conservation activities connect learners with biodiversity, clean surroundings, tree planting and responsible citizenship.", grades: "Grades 3–9", schedule: "Wednesdays · 3:30 PM" },
  { icon: Music, title: "Music, Drama & Cultural Arts Society", description: "Music, drama, dance and cultural expression develop confidence, creativity, communication and appreciation of heritage.", grades: "PP1–Grade 9", schedule: "Thursdays · 3:30 PM" },
  { icon: HeartHandshake, title: "Junior Red Cross & First Aid Club", description: "Learners develop first-aid awareness, safety habits, empathy, emergency readiness and a spirit of service.", grades: "Grades 5–9", schedule: "Mondays · 3:30 PM" },
  { icon: Sprout, title: "Agriculture & 4-K Club (Young Farmers)", description: "Practical gardening and agriculture projects develop food-production skills, environmental stewardship and enterprise thinking.", grades: "Grades 3–9", schedule: "Fridays · 3:30 PM" },
];

function ClubCard({ club }: { club: Club }) {
  const Icon = club.icon;
  return (
    <article className={cardClass}>
      <div className={iconClass}><Icon size={22} aria-hidden="true" /></div>
      <h3 className="break-words text-xl font-bold tracking-tight text-slate-900">{club.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{club.description}</p>
      <div className="mt-5 grid grid-cols-1 gap-2 text-xs font-semibold sm:grid-cols-2">
        <span className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700">Target: {club.grades}</span>
        <span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">{club.schedule}</span>
      </div>
    </article>
  );
}

export default function SchoolLifePage() {
  const [, navigate] = useLocation();

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#061229] via-[#0b1d3a] to-[#061229] text-white">
        <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#D89B28]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative mx-auto w-full max-w-7xl overflow-hidden px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <span className="inline-flex min-h-[48px] items-center rounded-full border border-[#D89B28]/30 bg-[#D89B28]/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#D89B28] sm:text-sm">Co-Curricular Excellence &amp; Pupil Welfare</span>
          <h1 className="mt-6 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">Vibrant School Life &amp; Holistic Development</h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">Menwe Primary &amp; Junior School gives learners room to discover talents, build friendships, stay active and serve their community through clubs, sports, environmental initiatives and pupil support.</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl overflow-hidden px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Clubs &amp; societies</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#061229] sm:text-4xl">Discover, participate and lead.</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">Our co-curricular programme gives learners structured opportunities to practise competencies beyond the classroom while developing confidence, responsibility and teamwork.</p>
        </div>
        <div className="mt-8 grid w-full grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">{clubs.map((club) => <ClubCard key={club.title} club={club} />)}</div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto w-full max-w-7xl overflow-hidden px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
            <div className="min-w-0 lg:col-span-7">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Sports &amp; athletics</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#061229] sm:text-4xl">Move, compete and grow together.</h2>
              <p className="mt-5 text-base leading-8 text-slate-600">Football, netball, volleyball and athletics give learners regular opportunities for physical wellness, teamwork and healthy competition. Inter-school meets also help pupils test their skills, represent Menwe and learn resilience through competition.</p>
              <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {["Inter-school athletics", "Football & netball", "Volleyball", "Fitness & physical wellness"].map((item) => <div key={item} className="flex min-h-[48px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"><Volleyball size={18} className="shrink-0 text-[#D89B28]" aria-hidden="true" />{item}</div>)}
              </div>
            </div>
            <article className="w-full min-w-0 max-w-full box-border rounded-3xl bg-[#061229] p-6 text-white shadow-2xl sm:p-8 lg:col-span-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D89B28]/15 text-[#D89B28]"><Award size={22} aria-hidden="true" /></div>
              <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Meru County inter-school sport</p>
              <h3 className="mt-3 text-2xl font-bold">Competitive spirit with character.</h3>
              <p className="mt-4 text-sm leading-7 text-white/70">Learners are encouraged to represent Menwe with discipline and sportsmanship at local and regional competitions, celebrating progress while respecting opponents and officials.</p>
              <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/5 p-4"><p className="text-xl font-extrabold text-[#D89B28]">5+</p><p className="mt-1 text-xs text-white/60">core sports</p></div><div className="rounded-xl bg-white/5 p-4"><p className="text-xl font-extrabold text-[#D89B28]">All</p><p className="mt-1 text-xs text-white/60">learners encouraged</p></div></div>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl overflow-hidden px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-3">
          <article className={cardClass}>
            <div className={iconClass}><HeartHandshake size={22} aria-hidden="true" /></div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Guidance, Counseling &amp; Pastoral Care</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">Teachers and school leaders provide age-appropriate guidance, pastoral support and counseling conversations that promote dignity, positive choices, emotional wellbeing and responsible behaviour.</p>
          </article>
          <article className={cardClass}>
            <div className={iconClass}><ShieldCheck size={22} aria-hidden="true" /></div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Clean Water &amp; Sanitation</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">Hygiene routines, clean water awareness and supervised sanitation practices help create a safe environment where learners can focus on learning and healthy development.</p>
          </article>
          <article className={cardClass}>
            <div className={iconClass}><Users size={22} aria-hidden="true" /></div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Nutritious Daily Lunch</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">The school feeding programme supports concentration and healthy growth with a dependable daily meal routine. Families can share relevant dietary information with the school office.</p>
          </article>
        </div>
        <div className="mt-6 w-full min-w-0 max-w-full box-border rounded-3xl bg-gradient-to-r from-slate-900 to-[#0b1d3a] p-6 text-white sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Pupil welfare</p>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">Every learner deserves to feel safe, included and ready to thrive.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">Menwe brings learning, health, nutrition, pastoral care, physical activity and community responsibility together as part of a holistic pupil experience.</p>
        </div>
      </section>

      <section className="bg-[#061229] text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 overflow-hidden px-4 py-12 sm:px-6 sm:py-14 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Join the community</p><h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">See how Menwe supports the whole learner.</h2></div>
          <button type="button" onClick={() => navigate("/families")} className={`${actionClass} shrink-0 bg-[#D89B28] text-[#061229] hover:bg-[#c28920]`}>Explore family information</button>
        </div>
      </section>
    </PublicLayout>
  );
}
