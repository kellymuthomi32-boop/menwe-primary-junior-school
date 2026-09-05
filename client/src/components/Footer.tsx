import { ArrowRight, BookOpen, GraduationCap, HeartHandshake, MapPin, MessageCircle, Phone } from "lucide-react";
import { useLocation } from "wouter";
import { prefetchPublicRoute } from "@/lib/publicNavigation";
import "@/styles/menwe-footer.css";

const SCHOOL_PHONE = "0142550882";
const SCHOOL_WHATSAPP = "254142550882";
const SCHOOL_EMAILS = ["Menweprimaryandjunior@gmail.com", "menweprimaryschool94@gmail.com"] as const;
const SCHOOL_LOCATION = "Menwe Village, Abogeta Division · Meru Central District · South Imenti Constituency";
const SCHOOL_PO_BOX = "P.O. Box 19, Kionyo";

const quickLinks = [["Home", "/"], ["About Us", "/about"], ["Academics", "/academics"], ["Admissions", "/admissions"], ["School Life", "/school-life"], ["Portal Access", "/portal"]] as const;
const schoolLinks = [["News & Events", "/news"], ["Gallery", "/gallery"], ["Calendar", "/calendar"], ["Contact Us", "/contact"], ["Fee Structure", "/admissions"]] as const;

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith("/")) return;
    event.preventDefault();
    setLocation(href);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  return <a href={href} onPointerEnter={() => prefetchPublicRoute(href)} onFocus={() => prefetchPublicRoute(href)} onClick={handleClick}>{children}</a>;
}

export default function Footer() {
  return (
    <footer className="menwe-footer" aria-label="School footer">
      <div className="menwe-footer-shell">
        <div className="menwe-footer-cta">
          <div>
            <span className="menwe-footer-eyebrow">MENWE PRIMARY &amp; JUNIOR SCHOOL</span>
            <h2>Everything your child needs to thrive, connected in one place.</h2>
            <p>Explore our learning journey, admissions information and family portal.</p>
          </div>
          <div className="menwe-footer-cta-actions">
            <FooterLink href="/admissions"><span>Start an application</span><ArrowRight size={15} /></FooterLink>
            <FooterLink href="/contact"><span>Contact the school</span><ArrowRight size={15} /></FooterLink>
          </div>
        </div>

        <div className="menwe-footer-grid">
          <div className="menwe-footer-brand">
            <div className="menwe-footer-mark"><span>M</span></div>
            <div className="menwe-footer-brand-name">Menwe</div>
            <div className="menwe-footer-brand-sub">PRIMARY &amp; JUNIOR SCHOOL</div>
            <p>Inspiring confident, disciplined and capable learners through excellent education, character and community.</p>
            <div className="menwe-footer-contact">
              <a href={`tel:${SCHOOL_PHONE}`}><Phone size={14} />{SCHOOL_PHONE}</a>
              <a href={`https://wa.me/${SCHOOL_WHATSAPP}`} target="_blank" rel="noreferrer"><MessageCircle size={14} />WhatsApp the school</a>
              <a href={`mailto:${SCHOOL_EMAILS[0]}`}><span className="menwe-footer-mail">@</span>{SCHOOL_EMAILS[0]}</a>
              <span><MapPin size={14} />{SCHOOL_LOCATION}</span>
              <span><MapPin size={14} />{SCHOOL_PO_BOX}</span>
            </div>
          </div>

          <nav className="menwe-footer-links" aria-label="Footer navigation">
            <h3>EXPLORE</h3>
            {quickLinks.map(([label, href]) => <FooterLink key={href} href={href}>{label}</FooterLink>)}
          </nav>

          <nav className="menwe-footer-links" aria-label="School links">
            <h3>SCHOOL</h3>
            {schoolLinks.map(([label, href]) => <FooterLink key={href} href={href}>{label}</FooterLink>)}
          </nav>

          <div className="menwe-footer-values">
            <h3>OUR PROMISE</h3>
            <div><BookOpen size={16} /><span><b>Learning</b> Clear academic pathways</span></div>
            <div><HeartHandshake size={16} /><span><b>Community</b> Strong family connection</span></div>
            <div><GraduationCap size={16} /><span><b>Growth</b> Character and confidence</span></div>
          </div>
        </div>

        <div className="menwe-footer-bottom">
          <span>© 2026 Menwe Primary &amp; Junior School. All rights reserved.</span>
          <div>
            <FooterLink href="/terms">Terms &amp; Conditions</FooterLink>
            <FooterLink href="/privacy">Privacy Policy</FooterLink>
            <FooterLink href="/cookies">Cookies</FooterLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
