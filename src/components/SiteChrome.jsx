import { Link, NavLink } from "react-router-dom";
import { ArrowUpRight, Clock3, Mail, MapPin, Menu, MessageCircle, Phone, X } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/clinic/logo.jpg";
import { ButtonLink } from "./Button";
import { ScrollMotion } from "./ScrollMotion";
import { clinicInfo, hours, services } from "@/lib/clinic-data";
const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/doctors", label: "Doctors" },
  { to: "/contact", label: "Contact" },
];
export function Header() {
  const [open, setOpen] = useState(false);
  return <header className="site-header">
  <div className="site-nav shell">
   <Link to="/" className="brand" aria-label="Sharks Clinic home">
    <img src={logo} alt=""/><span><strong>SHARKS</strong> Clinic</span>
   </Link>
   <nav className="desktop-nav" aria-label="Main navigation">
    {links.map((link) => <NavLink key={link.to} to={link.to} end={link.to === "/"} className={({ isActive }) => (isActive ? "active" : undefined)}>{link.label}</NavLink>)}
   </nav>
   <div className="nav-actions">
    <a className="phone-link" href="tel:+254722405988"><Phone size={15}/> +254 722 405 988</a>
    <ButtonLink to="/appointment">Book appointment</ButtonLink>
   </div>
   <button className="menu-button" type="button" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
  </div>
  {open && <nav className="mobile-nav" aria-label="Mobile navigation">
   {[...links, { to: "/feedback", label: "Feedback" }].map((link) => <Link key={link.to} to={link.to} onClick={() => setOpen(false)}>{link.label}</Link>)}
   <ButtonLink to="/appointment" className="mobile-book">Book appointment</ButtonLink>
  </nav>}
 </header>;
}
export function Footer() {
  const explore = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About us" },
    { to: "/doctors", label: "Our doctors" },
    { to: "/services", label: "Services" },
    { to: "/appointment", label: "Book appointment" },
    { to: "/feedback", label: "Patient feedback" },
    { to: "/contact", label: "Contact" },
  ];
  return <footer className="site-footer">
    <div className="shell footer-grid">
      <div className="footer-col footer-about">
        <div className="footer-brand"><strong>SHARKS</strong> Clinic</div>
        <p>Quality healthcare through innovation, compassion and excellence. Modern care for every stage of life, in the heart of Nairobi.</p>
        <div className="footer-emergency">
          <small>Emergency care, 24 / 7</small>
          <a href={clinicInfo.phoneHref}><Phone size={18} /> {clinicInfo.phone}</a>
        </div>
        <a className="footer-whatsapp" href="https://wa.me/254722405988" target="_blank" rel="noreferrer"><MessageCircle size={16} /> Chat on WhatsApp</a>
      </div>

      <nav className="footer-col" aria-label="Explore">
        <h3>Explore</h3>
        <ul>{explore.map((item) => <li key={item.to}><Link to={item.to}>{item.label}</Link></li>)}</ul>
      </nav>

      <div className="footer-col">
        <h3>Our services</h3>
        <ul>{services.map((item) => <li key={item.title}><Link to="/services">{item.title}</Link></li>)}</ul>
      </div>

      <div className="footer-col">
        <h3>Visit us</h3>
        <ul className="footer-contact-list">
          <li><MapPin size={16} /><span>{clinicInfo.address}</span></li>
          <li><Mail size={16} /><a href={`mailto:${clinicInfo.email}`}>{clinicInfo.email}</a></li>
          <li><Phone size={16} /><a href={clinicInfo.phoneHref}>{clinicInfo.phone}</a></li>
        </ul>
        <h3 className="footer-subhead"><Clock3 size={14} /> Opening hours</h3>
        <ul className="footer-hours">{hours.map((row) => <li key={row.day}><span>{row.day}</span><strong>{row.time}</strong></li>)}</ul>
      </div>
    </div>
    <div className="shell footer-bottom"><span>© 2026 SHARKS Clinic. All rights reserved.</span><div className="footer-links"><Link to="/feedback">Share feedback <ArrowUpRight size={14} /></Link><Link to="/admin">Staff sign in</Link></div></div>
  </footer>;
}

export function SiteLayout({ children }) {
  return <><ScrollMotion /><div className="topbar"><div className="shell"><span className="topbar-tag"><span className="topbar-dot" /> <span>Emergency care open 24 / 7</span></span><a href="tel:+254722405988"><Phone size={14} /> +254 722 405 988</a></div></div><Header /><main>{children}</main><Footer /><a className="floating-contact" href="https://wa.me/254722405988?text=Hello%20SHARKS%20Clinic,%20I%20would%20like%20to%20book%20an%20appointment." target="_blank" rel="noreferrer" aria-label="Message Sharks Clinic on WhatsApp"><MessageCircle /></a></>;
}
