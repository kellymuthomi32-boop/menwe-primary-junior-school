import {
  BookOpen, ChevronDown, ChevronLeft, ChevronRight, Facebook, FlaskConical,
  Globe2, GraduationCap, Instagram, Mail, MapPin, Menu, Medal, ShieldCheck,
  UsersRound, X, Phone, Twitter, UserRound, CircleUserRound
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import "@/styles/menwe-hero-exact.css";

const slides = [
  { src: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=700&q=88", alt: "Boy reading a book in a school library" },
  { src: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=700&q=88", alt: "Girl writing in a notebook with a pencil" },
  { src: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=700&q=88", alt: "Boy performing a chemistry experiment" },
  { src: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=700&q=88", alt: "Girl holding a soccer ball on a sports field" },
  { src: "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=700&q=88", alt: "Students playing brass instruments in a marching band" },
];

const features = [
  [BookOpen, "Quality Education", "Strong academic foundation with modern teaching approaches."],
  [UsersRound, "Holistic Development", "Nurturing talents, character and life skills for today and tomorrow."],
  [ShieldCheck, "Safe Environment", "A secure, inclusive and caring place where every child belongs."],
  [Medal, "Discipline & Values", "Building responsible, respectful and God-fearing members of society."],
  [Globe2, "Bright Future", "Preparing learners to thrive, lead and make a positive impact."],
] as const;

function Crest() {
  return <div className="menwe-crest" aria-hidden="true"><svg viewBox="0 0 72 84" role="img"><path d="M36 2 67 12v28c0 20-12 34-31 42C17 74 5 60 5 40V12Z" fill="#061229" stroke="#D89B28" strokeWidth="3"/><path d="M36 12 55 18v20c0 13-7 23-19 29-12-6-19-16-19-29V18Z" fill="#0B1A30" stroke="#D89B28" strokeWidth="1.5"/><path d="M23 30h26M36 21v29" stroke="#D89B28" strokeWidth="2"/><text x="36" y="61" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="800">M</text></svg></div>;
}

function TopBar() {
  return <div className="menwe-topbar"><div className="menwe-topbar-inner"><div className="menwe-top-left"><span><Phone size={13}/>0142550882</span><span><Mail size={13}/>Menweprimaryandjunior@gmail.com</span><span><Mail size={13}/>menweprimaryschool94@gmail.com</span></div><div className="menwe-top-right"><span><MapPin size={13}/>P.O. Box 19, Kionyo</span><span className="menwe-social" aria-label="Social media"><a href="#facebook" aria-label="Facebook"><Facebook size={14}/></a><a href="#twitter" aria-label="Twitter"><Twitter size={14}/></a><a href="#instagram" aria-label="Instagram"><Instagram size={14}/></a></span></div></div></div>;
}

function Header() {
  const [, go] = useLocation();
  const [mobile, setMobile] = useState(false);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const nav = [
    ["Home", "/"], ["About Us", "/about"], ["Academics", "/academics"], ["Admissions", "/admissions"], ["Gallery", "/gallery"], ["News & Events", "/news"], ["Contact Us", "/contact"]
  ] as const;
  const dropdowns = new Set(["About Us", "Academics"]);
  return <header className="menwe-header"><div className="menwe-header-inner"><button className="menwe-brand" onClick={() => go("/")} aria-label="Menwe Primary & Junior School home"><Crest/><span>MENWE PRIMARY <b>&amp; JUNIOR SCHOOL</b></span></button><nav className="menwe-nav" aria-label="Main navigation">{nav.map(([label, path]) => dropdowns.has(label) ? <div className="menwe-nav-drop" key={label}><button className={`menwe-nav-link ${dropdown === label ? "open" : ""}`} onClick={() => setDropdown(dropdown === label ? null : label)} aria-haspopup="menu" aria-expanded={dropdown === label}>{label}<ChevronDown size={14}/></button>{dropdown === label && <div className="menwe-dropdown" role="menu"><button onClick={() => go(path)}>Overview</button><button onClick={() => go(path)}>Explore {label}</button></div>}</div> : <button key={label} className={`menwe-nav-link ${label === "Home" ? "active" : ""}`} onClick={() => go(path)}>{label}</button>)}</nav><button className="menwe-login" onClick={() => go("/portal/login")}><UserRound size={17}/> Portal Login</button><button className="menwe-mobile-toggle" onClick={() => setMobile(!mobile)} aria-label="Toggle navigation">{mobile ? <X/> : <Menu/>}</button></div>{mobile && <div className="menwe-mobile-menu">{nav.map(([label, path]) => <button key={label} onClick={() => {go(path);setMobile(false)}}>{label}</button>)}<button className="menwe-login-mobile" onClick={() => {go("/portal/login");setMobile(false)}}><CircleUserRound size={17}/> Portal Login</button></div>}</header>;
}

function HeroGallery() {
  const [active, setActive] = useState(0);
  const move = (direction: number) => setActive((active + direction + slides.length) % slides.length);
  useEffect(() => { const timer = window.setInterval(() => setActive(value => (value + 1) % slides.length), 6500); return () => window.clearInterval(timer); }, []);
  return <div className="menwe-gallery-wrap"><svg className="menwe-hero-swoosh" viewBox="0 0 760 650" preserveAspectRatio="none" aria-hidden="true"><path d="M90 620C82 360 190 105 505 54C600 39 674 50 736 82" fill="none" stroke="#D89B28" strokeWidth="2"/><path d="M68 624C54 338 182 77 510 30" fill="none" stroke="#D89B28" strokeOpacity=".22" strokeWidth="1"/></svg><div className="menwe-gallery" role="region" aria-label="School life gallery"><button className="menwe-gallery-arrow left" onClick={() => move(-1)} aria-label="Previous image"><ChevronLeft/></button><div className="menwe-gallery-track">{slides.map((slide, index) => { const offset = (index - active + slides.length) % slides.length; const visibleOffset = offset > 2 ? offset - slides.length : offset; return <button key={slide.src} className={`menwe-photo-card ${visibleOffset === 0 ? "current" : ""}`} style={{ "--slot": visibleOffset } as React.CSSProperties} onClick={() => setActive(index)} aria-label={`Show gallery image ${index + 1}`}><img src={slide.src} alt={slide.alt}/><span className="menwe-photo-shade"/></button>; })}</div><button className="menwe-gallery-arrow right" onClick={() => move(1)} aria-label="Next image"><ChevronRight/></button><div className="menwe-pagination">{slides.map((_, i) => <button key={i} className={i === active ? "active" : ""} onClick={() => setActive(i)} aria-label={`Go to image ${i + 1}`}/>)}</div></div></div>;
}

export default function MenweHeroHome() {
  const [, go] = useLocation();
  return <div className="menwe-exact-page"><TopBar/><Header/><main><section className="menwe-hero-exact"><div className="menwe-hero-inner"><div className="menwe-copy"><p className="menwe-eyebrow">WELCOME TO</p><h1>Menwe Primary &amp; Junior School</h1><p className="menwe-tagline">Inspire. Empower. Thrive.</p><span className="menwe-gold-line"/><p className="menwe-description">Nurture every learner to learn, grow and succeed in a caring environment that builds character and confidence for a brighter future.</p><div className="menwe-cta-row"><button className="menwe-cta primary" onClick={() => go("/academics")}><GraduationCap size={18}/>Our Academics</button><button className="menwe-cta secondary" onClick={() => go("/admissions")}><UsersRound size={18}/>Join Our School</button></div></div><HeroGallery/></div><div className="menwe-features">{features.map(([Icon,title,text]) => <article key={title} className="menwe-feature-card"><span className="menwe-feature-icon"><Icon size={22}/></span><div><h2>{title}</h2><p>{text}</p></div></article>)}</div></section></main></div>;
}
