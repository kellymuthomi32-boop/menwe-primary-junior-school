import { BookOpen, GraduationCap, HeartHandshake, MapPin, MessageCircle, Phone, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { prefetchPublicRoute } from "@/lib/publicNavigation";
import "@/styles/menwe-footer.css";

const officialLocation = "Location: Igoki, Abogeta Division | Meru Central District, Eastern Province | South Imenti Constituency";
const quickLinks = [["Home", "/"], ["About Us", "/about"], ["Academics", "/academics"], ["Admissions", "/admissions"], ["School Life", "/school-life"], ["Portal Access", "/portal"]];
const schoolLinks = [["News & Events", "/news"], ["Gallery", "/gallery"], ["Fee Structure", "/admissions"], ["Calendar", "/calendar"], ["Contact Us", "/contact"]];

function FooterLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith("/")) return;
    event.preventDefault();
    setLocation(href);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  return <a href={href} onPointerEnter={() => prefetchPublicRoute(href)} onFocus={() => prefetchPublicRoute(href)} onClick={handleClick} className={className}>{children}</a>;
}

export default function Footer() {
  return <footer className="menwe-footer" aria-label="School footer">
    <div className="menwe-footer-banner"><div><p className="menwe-footer-kicker">• STAY CONNECTED</p><h2>A better school experience begins with a simple connection.</h2><p>Stay close to the information, people and opportunities that help your child thrive.</p></div><div className="menwe-footer-actions"><FooterLink href="/admissions" className="menwe-footer-btn gold">Explore Admissions <ArrowRight size={14}/></FooterLink><FooterLink href="/contact" className="menwe-footer-btn glass">Contact School <ArrowRight size={14}/></FooterLink></div></div>
    <div className="menwe-footer-values"><article><span><BookOpen size={18}/></span><div><b>LEARNING</b><h3>Clear Academic Pathways</h3><p>Structured competency-based curriculum designed for holistic growth.</p></div></article><article><span><HeartHandshake size={18}/></span><div><b>COMMUNITY</b><h3>Parent &amp; Family Portal</h3><p>Real-time communication, attendance tracking, and school updates in one place.</p></div></article><article><span><GraduationCap size={18}/></span><div><b>GROWTH</b><h3>Nurturing Character &amp; Values</h3><p>Fostering discipline, talent, and leadership for a brighter future.</p></div></article></div>
    <div className="menwe-footer-main"><div className="menwe-footer-brand"><div className="menwe-footer-logo"><GraduationCap size={23}/></div><h2>MENWE PRIMARY &amp; JUNIOR SCHOOL</h2><p>Inspiring confident, disciplined and capable learners through excellent education, character and community.</p><div className="menwe-footer-contact"><a href="tel:0142550882"><Phone size={13}/>0142550882</a><a href="https://wa.me/254142550882" target="_blank" rel="noreferrer"><MessageCircle size={13}/>0142550882 · WhatsApp</a><a href="mailto:Menweprimaryandjunior@gmail.com"><span className="menwe-footer-mail">@</span>Menweprimaryandjunior@gmail.com</a><a href="mailto:menweprimaryschool94@gmail.com"><span className="menwe-footer-mail">@</span>menweprimaryschool94@gmail.com</a><span><MapPin size={13}/>{officialLocation}</span><span><MapPin size={13}/>GPS: -0.099245555, 37.58121778</span></div></div><div className="menwe-footer-col"><h3>DISCOVER</h3>{quickLinks.map(([label,href])=><FooterLink key={label} href={href}>{label}</FooterLink>)}</div><div className="menwe-footer-col"><h3>SCHOOL</h3>{schoolLinks.map(([label,href])=><FooterLink key={label} href={href}>{label}</FooterLink>)}</div><div className="menwe-footer-connect"><h3>CONNECT WITH US</h3><p>Have questions about admissions or school visits? Reach out directly.</p><div className="menwe-footer-socials"><span aria-label="Social media profiles coming soon">Social profiles coming soon</span></div><a href="tel:0142550882" className="menwe-footer-call">Call the School <ArrowRight size={14}/></a><a href="https://wa.me/254142550882" target="_blank" rel="noreferrer" className="menwe-footer-whatsapp">Chat on WhatsApp <ArrowRight size={14}/></a></div></div>
    <div className="menwe-footer-bottom"><span>© 2026 Menwe Primary &amp; Junior School. All rights reserved.</span><div><FooterLink href="/terms">Terms &amp; Conditions</FooterLink><FooterLink href="/privacy">Privacy Policy</FooterLink><FooterLink href="/cookies">Cookies</FooterLink></div></div>
  </footer>;
}
