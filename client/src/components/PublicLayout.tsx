import { Menu, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
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
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--ink)] text-white shadow-lg shadow-[var(--ink)]/20">
        <span className="font-serif text-lg font-bold leading-none">M</span>
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-serif text-base font-semibold tracking-tight text-[var(--ink)]">Menwe</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Primary & Junior School</p>
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
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="sticky top-0 z-50 border-b border-[var(--ink)]/10 bg-[var(--paper)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <button onClick={() => go("/")} className="rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
            <SchoolMark />
          </button>
          <nav className="hidden items-center gap-5 lg:flex" aria-label="Public navigation">
            {links.map(([label, path]) => (
              <button key={path} onClick={() => go(path)} className={`text-sm font-medium transition-colors hover:text-[var(--accent)] ${location === path ? "text-[var(--accent)]" : "text-[var(--ink)]/72"}`}>
                {label}
              </button>
            ))}
            <button onClick={() => go("/portal/login")} className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform active:scale-[.97]">
              Portal login
            </button>
          </nav>
          <button onClick={() => setOpen(value => !value)} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--ink)]/15 lg:hidden" aria-label={open ? "Close navigation" : "Open navigation"}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <nav className="border-t border-[var(--ink)]/10 bg-[var(--paper)] px-5 py-4 lg:hidden" aria-label="Mobile public navigation">
            <div className="mx-auto grid max-w-7xl gap-1">
              {links.map(([label, path]) => <button key={path} onClick={() => go(path)} className="rounded-xl px-3 py-3 text-left text-sm font-semibold hover:bg-[var(--mist)]">{label}</button>)}
              <button onClick={() => go("/portal/login")} className="mt-2 rounded-xl bg-[var(--ink)] px-3 py-3 text-left text-sm font-semibold text-white">Portal login</button>
            </div>
          </nav>
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
