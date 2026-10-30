import { usePageMeta } from "@/lib/use-page-meta";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import careImage from "@/assets/clinic/why-choose-us.jpeg";
import { ButtonLink } from "@/components/Button";
import { CtaBand, Eyebrow, MixedHeading } from "@/components/PageParts";
import { services } from "@/lib/clinic-data";
import { DepartmentTiles, FaqList, HealthTips, HoursAndLocation, InsuranceStrip, PatientStories, ProcessSteps } from "@/components/Sections";
const pageMeta = [
  { title: "SHARKS Clinic — Modern Healthcare in Kisii" },
  { name: "description", content: "Compassionate, modern healthcare in Kisii with trusted specialists, advanced facilities and 24/7 support." },
  { property: "og:title", content: "SHARKS Clinic — Modern Healthcare in Kisii" },
  { property: "og:description", content: "Compassionate, modern healthcare in Kisii with trusted specialists and advanced facilities." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
];
export default function HomePage() {
  usePageMeta(pageMeta);
  return <>
  <section className="home-hero">
   <video className="hero-video" src="/hero.mp4" poster="/hero-poster.jpg" autoPlay muted loop playsInline preload="auto" aria-hidden="true"/>
   <div className="hero-scrim" aria-hidden="true"/>
   <div className="hero-copy"><Eyebrow>Healthcare, centered on you</Eyebrow><MixedHeading as="h1" regular="Your health." strong="Our priority."/><p>Premium healthcare powered by innovation, compassion and clinical excellence across Kenya.</p><div className="hero-actions"><ButtonLink to="/appointment" variant="accent">Book appointment <ArrowRight size={16}/></ButtonLink><ButtonLink to="/services" variant="outline">Explore services</ButtonLink></div><div className="hero-trust"><span><Check size={14}/> Emergency care 24 / 7</span><span><Check size={14}/> SHA, NHIF &amp; major insurers</span><span><Check size={14}/> M-Pesa, card &amp; cash</span></div></div>
   <div className="hero-stats"><div><strong>10K+</strong><span>Patients cared for</span></div><div><strong>8</strong><span>Specialist departments</span></div><div><strong>24 / 7</strong><span>Emergency support</span></div></div>
  </section>

    <section className="section shell"><div className="section-heading"><div><Eyebrow>Our services</Eyebrow><MixedHeading regular="Care for every stage." strong="Expertise for every need."/></div><p>Comprehensive healthcare solutions delivered by experienced medical professionals.</p></div><div className="service-grid">{services.slice(0, 3).map(({ title, description, Icon }) => <article className="service-card" key={title}><div className="card-top"><Icon size={28}/></div><h3>{title}</h3><p>{description}</p><Link to="/services">Explore care <ArrowRight size={15}/></Link></article>)}</div></section>

  <section className="split-section shell"><div className="split-image"><img src={careImage} alt="A clinician offering compassionate support to a patient"/></div><div className="split-copy"><Eyebrow>Why Sharks Clinic</Eyebrow><MixedHeading regular="Clinical excellence." strong="Genuinely human care."/><p>We combine experienced specialists, advanced facilities and a patient-first approach to make every visit feel clear and supported.</p><ul className="check-list">{["Qualified, experienced specialists", "Advanced diagnostic facilities", "Personalized treatment plans", "Safe and confidential care"].map(item => <li key={item}><Check size={16}/>{item}</li>)}</ul><ButtonLink to="/about" variant="outline">Meet the clinic <ArrowRight size={15}/></ButtonLink></div></section>

  <ProcessSteps />
  <DepartmentTiles />

  <PatientStories />
  <HealthTips />
  <InsuranceStrip />
  <FaqList />
  <HoursAndLocation />
  <CtaBand regular="Ready when you are." strong="Care starts here." copy="Choose a convenient time and our team will contact you to confirm your visit."/>
 </>;
}
