import { ArrowRight, ArrowUpRight, Check, ChevronRight, Facebook, Instagram, Mail, MapPin, Menu, ShieldCheck, Sparkles, X, Youtube, BookOpen, HeartHandshake, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const links = [["Home", "/"], ["About", "/about"], ["Academics", "/academics"], ["Admissions", "/admissions"], ["News", "/news"], ["Events", "/events"], ["Gallery", "/gallery"], ["Contact", "/contact"]] as const;
const discoverLinks = [["School life", "/school-life"], ["For families", "/families"], ["How it works", "/how-it-works"]] as const;
const legalLinks = [["Terms & conditions", "/terms"], ["Privacy", "/privacy"], ["Cookies", "/cookies"]] as const;

const footerPrinciples = [
  { label: "Learning", title: "A clear path through school", copy: "Keep academics, attendance and everyday school life connected in one experience.", icon: BookOpen },
  { label: "Families", title: "Closer communication", copy: "Make it easier for families to stay informed and connected with the school.", icon: HeartHandshake },
  { label: "Growth", title: "Built around the learner", copy: "A thoughtful digital experience for the people who teach, learn and support children.", icon: GraduationCap },
] as const;

export function SchoolMark({ compact = false, inverted = false }: { compact?: boolean; inverted?: boolean }) {
  return <div className="flex items-center gap-3"><div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] bg-[var(--ink)] text-white shadow-[0_10px_24px_rgba(29,43,37,.18)] ring-1 ring-white/20"><div className="absolute inset-[3px] rounded-[.78rem] border border-[var(--gold)]/45" /><span className="relative font-serif text-xl font-bold leading-none">M</span></div>{!compact && <div className="leading-tight"><p className={`font-serif text-[17px] font-semibold tracking-tight ${inverted ? "text-white" : "text-[var(--ink)]"}`}>Menwe</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.19em] text-[var(--accent)]">Primary & Junior School</p></div>}</div>;
}

const socialChannels = [
  { label: "Instagram", icon: Instagram, env: "VITE_SOCIAL_INSTAGRAM" },
  { label: "Facebook", icon: Facebook, env: "VITE_SOCIAL_FACEBOOK" },
  { label: "YouTube", icon: Youtube, env: "VITE_SOCIAL_YOUTUBE" },
] as const;

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation(); const [open, setOpen] = useState(false);
  const go = (to: string) => { setLocation(to); setOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  return <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
    <header className="sticky top-0 z-50 border-b border-[var(--ink)]/10 bg-[var(--paper)]/88 shadow-[0_8px_30px_rgba(29,43,37,.05)] backdrop-blur-2xl">
      <div className="hidden border-b border-[var(--ink)]/[0.06] bg-white/35 lg:block"><div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-8 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink)]/50"><span>Menwe Primary & Junior School</span><span className="flex items-center gap-2"><span className="menwe-live-dot" /> A welcoming place to learn</span></div></div>
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8"><button onClick={() => go("/")} className="menwe-focus-ring group rounded-2xl text-left" aria-label="Menwe Primary & Junior School home"><SchoolMark /></button>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Public navigation">{links.map(([label, path]) => { const active = location === path; return <button key={path} onClick={() => go(path)} aria-current={active ? "page" : undefined} className={`relative rounded-full px-3.5 py-2.5 text-[13px] font-semibold transition-all ${active ? "bg-white text-[var(--ink)] shadow-sm ring-1 ring-[var(--ink)]/8" : "text-[var(--ink)]/62 hover:bg-white/65 hover:text-[var(--ink)]"}`}>{label}{active && <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-[var(--gold)]" />}</button>; })}</nav>
        <div className="hidden items-center gap-2 lg:flex"><button onClick={() => go("/how-it-works")} className="menwe-link-line rounded-full px-3.5 py-2.5 text-[12px] font-bold text-[var(--ink)]/55 transition hover:bg-white hover:text-[var(--ink)]">Discover <ChevronRight size={13} /></button><button onClick={() => go("/portal/login")} className="menwe-interactive group flex items-center gap-2 rounded-full border border-[var(--ink)]/12 bg-white/60 px-4 py-2.5 text-[13px] font-bold text-[var(--ink)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"><ShieldCheck size={16} className="text-[var(--accent)]" /> Portal login <ArrowUpRight size={14} className="opacity-45 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></button></div>
        <button onClick={() => setOpen(value => !value)} className="menwe-focus-ring grid h-11 w-11 place-items-center rounded-2xl border border-[var(--ink)]/12 bg-white/70 shadow-sm lg:hidden" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}>{open ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
      {open && <div className="absolute inset-x-0 top-full border-b border-[var(--ink)]/10 bg-[var(--paper)]/98 px-5 pb-6 pt-3 shadow-[0_24px_40px_rgba(29,43,37,.12)] backdrop-blur-2xl lg:hidden"><nav className="mx-auto grid max-w-xl gap-1.5" aria-label="Mobile public navigation">{[...links, ...discoverLinks].map(([label, path]) => { const active = location === path; return <button key={path} onClick={() => go(path)} aria-current={active ? "page" : undefined} className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-left text-sm font-bold ${active ? "bg-white shadow-sm ring-1 ring-[var(--ink)]/8" : "hover:bg-white/70"}`}><span>{label}</span>{active && <Check size={17} className="text-[var(--accent)]" />}</button>; })}<button onClick={() => go("/portal/login")} className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--ink)]/15"><ShieldCheck size={17} /> Secure portal login <ArrowUpRight size={15} className="opacity-70" /></button></nav></div>}
    </header>
    <main>{children}</main>
    <footer className="relative mt-24 overflow-hidden bg-[var(--ink)] text-white">
      <div className="menwe-aurora menwe-aurora-one opacity-10" /><div className="menwe-aurora menwe-aurora-two opacity-10" />
      <div className="relative mx-auto max-w-[1440px] px-5 pb-8 pt-14 sm:pt-16 lg:px-10 lg:pt-20">
        <div className="relative mb-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.045] p-6 backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border border-[var(--gold)]/15" /><div className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rounded-full border border-white/8" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.22em] text-[var(--gold)]"><span className="menwe-live-dot" /> Stay connected</div><h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">A better school experience begins with a simple connection.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/52">Explore Menwe, learn about admissions, keep up with published school information, or enter the secure school portal when you have an authorised account.</p></div>
            <div className="flex flex-wrap gap-2 lg:justify-end"><button onClick={() => go("/admissions")} className="menwe-glow-button group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-5 py-3 text-sm font-extrabold text-[var(--ink)] transition hover:-translate-y-0.5">Explore admissions <ArrowRight size={15} className="transition group-hover:translate-x-1" /></button><button onClick={() => go("/contact")} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[.07] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[.12]">Contact school <ArrowUpRight size={15} /></button></div>
          </div>
        </div>

        <section className="mb-12 grid gap-3 md:grid-cols-3" aria-label="What the Menwe experience is designed around">
          {footerPrinciples.map(({ label, title, copy, icon: Icon }, index) => <div key={label} className="menwe-footer-principle group relative overflow-hidden rounded-[1.45rem] border border-white/8 bg-white/[.035] p-5 transition duration-500 hover:-translate-y-1 hover:border-[var(--gold)]/25 hover:bg-white/[.06]"><div className="absolute -right-12 -top-12 h-28 w-28 rounded-full border border-white/6 transition duration-700 group-hover:scale-150" /><div className="relative flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/[.07] text-[var(--gold)]"><Icon size={19} strokeWidth={1.7} /></span><div><p className="text-[9px] font-extrabold uppercase tracking-[.22em] text-[var(--gold)]">{String(index + 1).padStart(2, "0")} · {label}</p><h3 className="mt-1.5 font-serif text-lg font-semibold text-white">{title}</h3><p className="mt-1.5 text-xs leading-5 text-white/45">{copy}</p></div></div></div>)}
        </section>

        <div className="mb-12 grid gap-4 sm:grid-cols-3">
          {[
            { eyebrow: "Explore", title: "See school life", copy: "Discover the public side of Menwe, from learning to community life.", path: "/school-life", icon: Sparkles },
            { eyebrow: "Families", title: "Understand the journey", copy: "Find admissions guidance and a clearer view of how the school experience connects.", path: "/families", icon: MapPin },
            { eyebrow: "Portal", title: "Secure school access", copy: "Authorised administrators, teachers, parents and students can enter their workspace.", path: "/portal/login", icon: ShieldCheck },
          ].map(({ eyebrow, title, copy, path, icon: Icon }) => <button key={path} onClick={() => go(path)} className="menwe-interactive group relative overflow-hidden rounded-[1.5rem] border border-white/9 bg-white/[.045] p-5 text-left backdrop-blur-xl hover:border-[var(--gold)]/25 hover:bg-white/[.075]"><div className="absolute -right-10 -top-10 h-24 w-24 rounded-full border border-[var(--gold)]/10 transition-transform duration-700 group-hover:scale-150" /><div className="relative"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[.07] text-[var(--gold)]"><Icon size={18} strokeWidth={1.7} /></span><p className="mt-5 text-[9px] font-extrabold uppercase tracking-[.22em] text-[var(--gold)]">{eyebrow}</p><h3 className="mt-2 font-serif text-xl font-semibold text-white">{title}</h3><p className="mt-2 text-xs leading-5 text-white/45">{copy}</p><span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-white/70">Open page <ArrowUpRight size={13} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span></div></button>)}
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.15fr_.75fr_.75fr_1fr]">
          <div><SchoolMark inverted /><p className="mt-6 max-w-md text-sm leading-7 text-white/50">A calm public home for Menwe Primary & Junior School — bringing learning, families and school operations into one thoughtful experience.</p><div className="mt-7 flex flex-wrap gap-2"><span className="menwe-trust-chip"><ShieldCheck size={13} /> Role-aware access</span><span className="menwe-trust-chip"><Sparkles size={13} /> Built for school life</span></div><button onClick={() => go("/contact")} className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-white/62 transition hover:text-white">Get in touch <ArrowRight size={14} /></button></div>

          <div><p className="text-[9px] font-extrabold uppercase tracking-[.24em] text-[var(--gold)]">School</p><div className="mt-5 grid gap-3">{links.slice(1,6).map(([label,path]) => <button key={path} onClick={() => go(path)} className="menwe-footer-link group flex w-fit items-center gap-2 text-left text-sm">{label}<ArrowUpRight size={12} className="opacity-40 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" /></button>)}<button onClick={() => go("/gallery")} className="menwe-footer-link group flex w-fit items-center gap-2 text-left text-sm">Gallery <ArrowUpRight size={12} className="opacity-40 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" /></button></div></div>

          <div><p className="text-[9px] font-extrabold uppercase tracking-[.24em] text-[var(--gold)]">Discover</p><div className="mt-5 grid gap-3">{discoverLinks.map(([label,path]) => <button key={path} onClick={() => go(path)} className="menwe-footer-link group flex w-fit items-center gap-2 text-left text-sm">{label}<ArrowUpRight size={12} className="opacity-40 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" /></button>)}<button onClick={() => go("/contact")} className="menwe-footer-link group flex w-fit items-center gap-2 text-left text-sm">Contact <ArrowUpRight size={12} className="opacity-40 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" /></button><button onClick={() => go("/portal/login")} className="menwe-footer-link group flex w-fit items-center gap-2 text-left text-sm">Portal login <ArrowUpRight size={12} className="opacity-40 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" /></button></div></div>

          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[.24em] text-[var(--gold)]">Connect</p>
            <div className="mt-5 rounded-[1.35rem] border border-white/9 bg-white/[.045] p-4 backdrop-blur-xl">
              <p className="text-sm font-bold text-white">Community channels</p><p className="mt-1 text-xs leading-5 text-white/40">Official social links can be configured for the school without changing the public layout.</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {socialChannels.map(({ label, icon: Icon, env }) => { const href = import.meta.env[env]; return href ? <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={`Menwe ${label}`} className="menwe-interactive flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[.06] text-white/65 hover:border-[var(--gold)]/25 hover:text-white"><Icon size={17} /></a> : <button key={label} type="button" onClick={() => go("/contact")} title={`${label} link is managed by the school`} aria-label={`${label} — contact the school`} className="menwe-interactive flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[.035] text-white/30 hover:border-white/15 hover:text-white/60"><Icon size={17} /></button>; })}
              </div>
              <button onClick={() => go("/contact")} className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[.035] px-3 py-2.5 text-left text-xs font-semibold text-white/55 transition hover:bg-white/[.07] hover:text-white"><span className="flex items-center gap-2"><Mail size={14} /> Contact the school</span><ArrowUpRight size={13} /></button>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-white/8 pt-6 text-[10px] font-semibold text-white/32 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-x-5 gap-y-2"><span>© {new Date().getFullYear()} Menwe Primary & Junior School</span><span>Public information</span><span>Secure school operations</span></div><nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Legal navigation">{legalLinks.map(([label,path]) => <button key={path} onClick={() => go(path)} className="transition hover:text-white/65">{label}</button>)}</nav></div>
      </div>
    </footer>
  </div>;
}
