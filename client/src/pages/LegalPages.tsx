import { ArrowLeft, ArrowUpRight, CheckCircle2, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { useLocation } from "wouter";

type Section = { title: string; body: string };

const content: Record<string, { eyebrow: string; title: string; intro: string; sections: Section[] }> = {
  terms: {
    eyebrow: "Legal · Terms",
    title: "Terms & Conditions",
    intro: "These terms describe the general rules for using the Menwe Primary & Junior School public website and its secure school-management services.",
    sections: [
      { title: "Using the website", body: "Use this website lawfully and respectfully. Public pages provide school information, while protected portal areas are intended only for authorised school users." },
      { title: "School information", body: "Information published on the website is provided by the school. Content may change as programmes, dates, policies and contact information are updated." },
      { title: "Admissions", body: "Submitting an application does not by itself guarantee admission. Applications are reviewed by authorised school personnel under the school's applicable admissions process." },
      { title: "Portal accounts", body: "Keep account credentials private and use only accounts assigned to you. Do not attempt to access another person's records, bypass security controls, or share protected information without authorisation." },
      { title: "Acceptable use", body: "Do not misuse the website or portal, interfere with service operation, upload malicious material, probe security controls, or use another person's identity or permissions." },
      { title: "Changes", body: "The school may update these terms as the website and school services evolve. The latest version published here applies to subsequent use." },
    ],
  },
  privacy: {
    eyebrow: "Legal · Privacy",
    title: "Privacy Policy",
    intro: "Menwe is designed to keep public information separate from protected school records and to give authorised users access only to information relevant to their role.",
    sections: [
      { title: "Information we may collect", body: "Depending on the service used, information can include contact details submitted through public forms, admissions information, account identifiers, school records and activity needed to operate the secure portal." },
      { title: "How information is used", body: "Information is used to provide school services, process applications, communicate with families and staff, maintain academic and operational records, secure accounts, and improve the service." },
      { title: "Access controls", body: "Protected school records are handled through authenticated accounts and role-based database permissions. Public visitors should only receive information intentionally published for public access." },
      { title: "Admissions privacy", body: "Application information is treated as private school information. It is intended for authorised personnel involved in admissions and related administration, not for public browsing." },
      { title: "Security", body: "The platform uses authentication, database authorization, controlled storage and audit mechanisms appropriate to a school-management application. No online service can promise absolute security." },
      { title: "Questions", body: "For privacy questions or requests concerning information held by the school, use the Contact page and provide enough context for the school to identify the relevant request." },
    ],
  },
  cookies: {
    eyebrow: "Legal · Cookies",
    title: "Cookie & Storage Notice",
    intro: "This page explains the kinds of browser storage and technical mechanisms the website may use to keep the experience reliable and secure.",
    sections: [
      { title: "Essential session storage", body: "The secure portal may use browser storage or cookies required to maintain authentication and session state. These mechanisms are necessary for protected features to work correctly." },
      { title: "Preferences", body: "The application may retain interface preferences such as theme or display settings where those features are enabled." },
      { title: "Security", body: "Technical identifiers may be used to support authentication, prevent abuse and keep protected requests associated with the correct session." },
      { title: "No unnecessary tracking", body: "The public experience should not present tracking as a substitute for useful school content. Any future analytics or third-party services should be introduced transparently and reflected in this notice where appropriate." },
      { title: "Managing browser storage", body: "You can control cookies and local storage through your browser settings. Disabling essential storage may prevent login and protected portal features from functioning." },
    ],
  },
};

export function LegalPage({ type }: { type: keyof typeof content }) {
  const [, setLocation] = useLocation();
  const page = content[type];
  return <PublicLayout>
    <section className="relative overflow-hidden border-b border-[var(--ink)]/8 bg-white/45">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20 lg:px-8 lg:py-24">
        <button onClick={() => setLocation("/")} className="mb-10 inline-flex items-center gap-2 text-xs font-bold text-[var(--ink)]/55 transition hover:text-[var(--ink)]"><ArrowLeft size={14}/> Back to home</button>
        <div className="max-w-3xl"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.22em] text-[var(--accent)]"><FileText size={14}/> {page.eyebrow}</div><h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-6xl">{page.title}</h1><p className="mt-6 max-w-2xl text-base leading-8 text-[var(--ink)]/60 sm:text-lg">{page.intro}</p></div>
      </div>
    </section>
    <section className="mx-auto grid max-w-6xl gap-6 px-5 py-12 sm:py-16 lg:grid-cols-[.72fr_1.28fr] lg:px-8 lg:py-20">
      <aside className="h-fit rounded-[1.5rem] border border-[var(--ink)]/8 bg-white p-6 lg:sticky lg:top-28"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--ink)] text-white"><ShieldCheck size={18}/></div><div><p className="text-sm font-bold">Menwe public information</p><p className="text-xs text-[var(--ink)]/50">Clear, responsible and role-aware.</p></div></div><div className="mt-6 grid gap-3 text-xs font-semibold text-[var(--ink)]/55"><button onClick={() => setLocation("/terms")} className="text-left hover:text-[var(--ink)]">Terms & Conditions</button><button onClick={() => setLocation("/privacy")} className="text-left hover:text-[var(--ink)]">Privacy Policy</button><button onClick={() => setLocation("/cookies")} className="text-left hover:text-[var(--ink)]">Cookies & Storage</button><button onClick={() => setLocation("/contact")} className="flex items-center gap-1 text-left text-[var(--accent)]">Contact the school <ArrowUpRight size={12}/></button></div></aside>
      <div className="grid gap-4">{page.sections.map((section, index) => <article key={section.title} className="rounded-[1.5rem] border border-[var(--ink)]/8 bg-white p-6 sm:p-8"><div className="flex gap-4"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--paper)] text-[var(--accent)]"><CheckCircle2 size={16}/></span><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[var(--ink)]/35">0{index + 1}</p><h2 className="mt-1 font-serif text-xl font-semibold">{section.title}</h2><p className="mt-3 text-sm leading-7 text-[var(--ink)]/60">{section.body}</p></div></div></article>)}</div>
    </section>
    <section className="mx-auto mb-8 max-w-6xl px-5 lg:px-8"><div className="flex items-start gap-4 rounded-[1.5rem] border border-[var(--gold)]/20 bg-[var(--gold)]/8 p-6"><LockKeyhole className="mt-0.5 shrink-0 text-[var(--accent)]" size={20}/><p className="text-sm leading-6 text-[var(--ink)]/65">This is general website information, not a substitute for a school-specific legal agreement. Where the school has a separate official policy or notice, that policy takes precedence for the relevant service.</p></div></section>
  </PublicLayout>;
}
