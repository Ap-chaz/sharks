import { usePageMeta } from "@/lib/use-page-meta";
import { Activity, Eye, HeartHandshake } from "lucide-react";
import clinicImage from "@/assets/clinic/thumbnail-1.jpeg";
import doctorOne from "@/assets/clinic/thumbnail-5.jpeg";
import doctorTwo from "@/assets/clinic/thumbnail-2.jpeg";
import doctorThree from "@/assets/clinic/thumbnail-7.jpeg";
import { CtaBand, Eyebrow, MixedHeading, PageIntro } from "@/components/PageParts";
import { Link } from "react-router-dom";
import { facilities, milestones } from "@/lib/clinic-data";
import { InsuranceStrip } from "@/components/Sections";
const pageMeta = [
  { title: "About SHARKS Clinic — Care with Purpose" }, { name: "description", content: "Learn about SHARKS Clinic’s mission, values, clinical team and commitment to excellent healthcare in Nairobi." },
  { property: "og:title", content: "About SHARKS Clinic — Care with Purpose" }, { property: "og:description", content: "Meet the people and principles behind compassionate, modern healthcare at SHARKS Clinic." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
];
export default function AboutPage() {
  usePageMeta(pageMeta);
  return <>
 <PageIntro eyebrow="About us" regular="Built around medicine." strong="Guided by compassion." copy="SHARKS Clinic brings together skilled professionals, modern facilities and personal attention to create a better healthcare experience."/>
 <section className="value-grid shell">{[[HeartHandshake, "Our mission", "To provide accessible, high-quality healthcare through innovation, compassion and excellence."], [Eye, "Our vision", "To be a trusted healthcare leader known for outstanding outcomes and human-centered care."], [Activity, "Our values", "Integrity, respect, confidentiality and clinical excellence guide every decision we make."]].map(([Icon, title, copy]) => <article key={title}><Icon size={25}/><span className="badge">Our foundation</span><h2>{title}</h2><p>{copy}</p></article>)}</section>
 <section className="split-section shell"><div className="split-image"><img src={clinicImage} alt="A modern Sharks Clinic treatment room"/></div><div className="split-copy"><Eyebrow>Our approach</Eyebrow><MixedHeading regular="Modern medicine." strong="Clear, personal attention."/><p>From the first consultation to follow-up care, we listen carefully, explain clearly and shape treatment around each patient’s needs.</p><div className="metric-row"><div><strong>10K+</strong><span>Patients served</span></div><div><strong>98%</strong><span>Satisfaction</span></div></div></div></section>
 <section className="section shell"><div className="section-heading"><div><Eyebrow>Our doctors</Eyebrow><MixedHeading regular="Specialists you can trust." strong="People you can talk to."/></div><p>Experienced clinicians committed to thoughtful, evidence-based care.</p></div><div className="doctor-grid">{[[doctorOne, "Dr. Jane Smith", "Diagnostic Medicine"], [doctorTwo, "Dr. Michael Brown", "General Practice"], [doctorThree, "Dr. Sarah Wilson", "Pediatrics"]].map(([image, name, role]) => <article key={name}><img src={image} alt={`${name}, ${role}`}/><div><h3>{name}</h3><p>{role}</p></div></article>)}</div></section>
 <section className="section shell"><div className="section-heading"><div><Eyebrow>Our journey</Eyebrow><MixedHeading regular="Growing with" strong="the people we serve." /></div><p>A few milestones that shaped the clinic we are today.</p></div><ol className="timeline">{milestones.map((m, i) => <li className="timeline-item" key={m.title}><span className="timeline-dot">{i + 1}</span><div><span className="badge">{m.label}</span><h3>{m.title}</h3><p>{m.copy}</p></div></li>)}</ol></section>
  <section className="band band-sky"><div className="section shell"><div className="section-heading"><div><Eyebrow>Our facilities</Eyebrow><MixedHeading regular="Modern spaces," strong="built for comfort." /></div><p>Everything you need for diagnosis and treatment, together in one place.</p></div><div className="steps-grid">{facilities.map((f) => <article className={`step-card tone-${f.tone}`} key={f.title}><h3>{f.title}</h3><p>{f.copy}</p></article>)}</div></div></section>
  <InsuranceStrip />
  <CtaBand regular="A healthier tomorrow." strong="Start today." copy="Our team is ready to listen, understand and help you move forward."/>
  </>;
}
