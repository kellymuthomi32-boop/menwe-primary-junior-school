import { ArrowUpRight, Check, Menu, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const links = [
  ["Home", "/"],
  ["About", "/about"],
  ["Academics", "/academics"],
  ["Admissions", "/admissions"],
  ["News", "/news"],
  ["Events", "/events"],
  ["Gallery", "/gallery"],
  ["Contact", "/contact"],
] as const;

export function SchoolMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] bg-[var(--ink)] text-white shadow-[0_10px_24px_rgba(29,43,37,.18)] ring-1 ring-white/20">
        <div className="absolute inset-[3px] rounded-[.78rem] border border-[var(--gold)]/45" />
        <span className="relative font-serif text-xl font-bold leading-none">M</span>
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-serif text-[17px] font-semibold tracking-tight text-[var(--ink)]">Menwe</p>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.19em] text-[var(--accent)]">Primary & Junior School</p>
        </div>
      )}
    </div>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  const go = (to: string) => {
    setLocation(to);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="sticky top-0 z-50 border-b border-[var(--ink)]/10 bg-[var(--paper)]/88 shadow-[0_8px_30px_rgba(29,43,37,.05)] backdrop-blur-2xl">
        <div className="hidden border-b border-[var(--ink)]/[0.06] bg-white/35 lg:block">
          <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-8 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink)]/50">
            <span>Menwe Primary & Junior School</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--sage)]" /> A welcoming place to learn</span>
          </div>
        </div>

        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <button onClick={() => go("/")} className="group rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4" aria-label="Menwe Primary & Junior School home">
            <SchoolMark />
          </button>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Public navigation">
            {links.map(([label, path]) => {
              const active = location === path;
              return (
                <button
                  key={path}
                  onClick={() => go(path)}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-full px-3.5 py-2.5 text-[13px] font-semibold transition-all ${active ? "bg-white text-[var(--ink)] shadow-sm ring-1 ring-[var(--ink)]/8" : "text-[var(--ink)]/62 hover:bg-white/65 hover:text-[var(--ink)]"}`}
                >
                  {label}
                  {active && <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-[var(--gold)]" />}
                </button>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button onClick={() => go("/portal/login")} className="group flex items-center gap-2 rounded-full border border-[var(--ink)]/12 bg-white/60 px-4 py-2.5 text-[13px] font-bold text-[var(--ink)] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/30 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
              <ShieldCheck size={16} className="text-[var(--accent)]" />
              Portal login
              <ArrowUpRight size={14} className="opacity-45 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>

          <button onClick={() => setOpen(value => !value)} className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--ink)]/12 bg-white/70 shadow-sm lg:hidden" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <div className="absolute inset-x-0 top-full border-b border-[var(--ink)]/10 bg-[var(--paper)]/98 px-5 pb-6 pt-3 shadow-[0_24px_40px_rgba(29,43,37,.12)] backdrop-blur-2xl lg:hidden">
            <nav className="mx-auto grid max-w-xl gap-1.5" aria-label="Mobile public navigation">
              {links.map(([label, path]) => {
                const active = location === path;
                return (
                  <button key={path} onClick={() => go(path)} aria-current={active ? "page" : undefined} className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-left text-sm font-bold ${active ? "bg-white shadow-sm ring-1 ring-[var(--ink)]/8" : "hover:bg-white/70"}`}>
                    <span>{label}</span>
                    {active && <Check size={17} className="text-[var(--accent)]" />}
                  </button>
                );
              })}
              <button onClick={() => go("/portal/login")} className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--ink)]/15">
                <ShieldCheck size={17} /> Secure portal login <ArrowUpRight size={15} className="opacity-70" />
              </button>
            </nav>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="mt-20 bg-[var(--ink)] px-5 py-12 text-white lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <SchoolMark compact />
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/65">A secure, editable information and school-management platform. School contact and location details can be maintained by authorised administrators.</p>
          </div>
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Explore</p><div className="mt-4 grid gap-2">{links.slice(0, 4).map(([label, path]) => <button key={path} onClick={() => go(path)} className="text-left text-sm text-white/70 hover:text-white">{label}</button>)}</div></div>
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Secure portal</p><button onClick={() => go("/portal/login")} className="mt-4 flex items-center gap-2 text-sm text-white/70 hover:text-white"><ShieldCheck size={16} /> Sign in securely</button></div>
        </div>
      </footer>
    </div>
  );
}
