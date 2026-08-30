import { useLocation } from "wouter";
import { Activity, BookOpen, Award, Drum, HeartHandshake, ShieldCheck, Sprout, Users, Volleyball } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";

type ActivityCard = { icon: typeof BookOpen; title: string; description: string };
const card = "rounded-2xl border border-gray-100 bg-white p-7 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900";
const icon = "flex h-12 w-12 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229]";
const routine: ActivityCard[] = [
  { icon: BookOpen, title: "Morning assembly", description: "Learners gather for notices, school values, devotion and a clear start to the day." },
  { icon: Activity, title: "CBC learning hours", description: "Lessons combine literacy, numeracy, inquiry, practical work, collaboration and competency development." },
  { icon: Users, title: "Breaks & social learning", description: "Supervised breaks give learners time to refresh, interact respectfully and build friendships." },
  { icon: Volleyball, title: "Games time", description: "Games and physical activity support fitness, teamwork, discipline and healthy competition." },
];
const talents: ActivityCard[] = [
  { icon: Activity, title: "Football & athletics", description: "Team sports and athletics develop endurance, coordination, sportsmanship, leadership and resilience." },
  { icon: Drum, title: "Marching brass band", description: "Music and marching activities build discipline, listening, rhythm, confidence and collective performance." },
  { icon: Award, title: "Drama & performance", description: "Drama creates space for communication, creativity, storytelling and confident public expression." },
  { icon: Sprout, title: "4-K Club & agriculture", description: "Agriculture projects connect learners with food production, environmental care, practical enterprise and responsibility." },
  { icon: BookOpen, title: "STEM exploration", description: "Science, technology, mathematics and practical inquiry encourage curiosity and problem-solving." },
  { icon: HeartHandshake, title: "Leadership opportunities", description: "Co-curricular activities give learners meaningful opportunities to serve, organise and encourage others." },
];

function ActivityGrid({ items }: { items: ActivityCard[] }) {
  return <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{items.map(({ icon: Icon, title, description }) => <article className={card} key={title}>
    <div className={icon}><Icon size={21} aria-hidden="true" /></div>
    <h3 className="mt-6 font-serif text-2xl font-semibold text-[#061229] dark:text-white">{title}</h3>
    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
  </article>)}</div>;
}

export default function SchoolLifePage() {
  const [, go] = useLocation();
  return <PublicLayout>
    <section className="bg-[#061229] text-white"><div className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#D89B28]">School life · Abogeta community</p><h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold leading-tight sm:text-7xl">A purposeful school day rooted in Kionyo and Abogeta.</h1><p className="mt-7 max-w-3xl text-lg leading-8 text-white/70">Menwe Primary & Junior School has served learners in Kionyo, Abogeta Sub-County, Meru County, Kenya since 1961. School life brings together learning, character, faith-based guidance, talent, health and community responsibility.</p><button onClick={() => go("/families")} className="mt-9 rounded-full bg-[#D89B28] px-6 py-3.5 text-sm font-extrabold text-[#061229]">For families</button></div></section>
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Daily school routine</p><h2 className="mt-3 font-serif text-4xl font-semibold text-[#061229]">A balanced rhythm from morning assembly to games.</h2><p className="mt-5 text-base leading-8 text-slate-600">Each day is structured to help children arrive ready to learn, participate confidently and leave with a sense of accomplishment. Morning assembly and devotion create a shared start, followed by focused CBC learning hours, practical activities, breaks and supervised games.</p></div><ActivityGrid items={routine} /></section>
    <section className="bg-[#F8F9FA]"><div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Co-curricular & talent development</p><h2 className="mt-3 max-w-3xl font-serif text-4xl font-semibold text-[#061229]">Learners discover strengths beyond the classroom.</h2><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{talents.map(({ icon: Icon, title, description }) => <article className={card} key={title}><div className={icon}><Icon size={21} aria-hidden="true" /></div><h3 className="mt-6 font-serif text-2xl font-semibold text-[#061229] dark:text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p></article>)}</div></div></section>
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="grid gap-6 lg:grid-cols-2"><article className={card}><div className={icon}><HeartHandshake size={21} aria-hidden="true" /></div><h2 className="mt-6 font-serif text-3xl font-semibold text-[#061229]">Character & faith-based guidance</h2><p className="mt-4 text-sm leading-7 text-slate-600">Pastoral care, devotion, counselling conversations and positive discipline help learners understand responsibility, respect and service. The student leadership council provides a structured voice for learners and a practical setting for developing accountability, teamwork and citizenship.</p><p className="mt-4 text-sm leading-7 text-slate-600">Teachers and school leaders work to notice individual needs early, encourage good choices and maintain a learning environment where every child is treated with dignity.</p></article><article className={card}><div className={icon}><ShieldCheck size={21} aria-hidden="true" /></div><h2 className="mt-6 font-serif text-3xl font-semibold text-[#061229]">Health, nutrition & safety</h2><p className="mt-4 text-sm leading-7 text-slate-600">A clean school environment, supervised movement around the campus and clear boundaries support learner safety. Health-conscious routines reinforce hygiene, responsible behaviour and readiness to learn.</p><p className="mt-4 text-sm leading-7 text-slate-600">Nutritious meal programmes support concentration and healthy growth. Families are encouraged to keep emergency contacts current and communicate relevant welfare information through the school office.</p></article></div><div className="mt-8 rounded-2xl bg-[#061229] p-8 text-white shadow-md"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#D89B28]">Our community</p><p className="mt-4 max-w-4xl text-lg leading-8 text-white/75">Menwe's school life is part of the wider Kionyo and Abogeta community. Since 1961, the school has grown around the shared work of families, educators and learners. Today the school is led by Principal Mr. Simon Muriungi Muthemba and Deputy Principal Mr. Patrick Kimathi, supported by 23 certified TSC & BOM educators.</p></div></section>
  </PublicLayout>;
}
