import { usePageMeta } from "@/lib/use-page-meta";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import heroImage from "@/assets/clinic/thumbnail-6.jpeg";
import careImage from "@/assets/clinic/thumbnail-4.jpeg";
import { ButtonLink } from "@/components/Button";
import { CtaBand, Eyebrow, MixedHeading } from "@/components/PageParts";
import { services } from "@/lib/clinic-data";
import { DepartmentTiles, FaqList, HealthTips, HoursAndLocation, InsuranceStrip, ProcessSteps } from "@/components/Sections";
const pageMeta = [
  { title: "SHARKS Clinic — Modern Healthcare in Nairobi" },
  { name: "description", content: "Compassionate, modern healthcare in Nairobi with trusted specialists, advanced facilities and 24/7 support." },
  { property: "og:title", content: "SHARKS Clinic — Modern Healthcare in Nairobi" },
  { property: "og:description", content: "Compassionate, modern healthcare in Nairobi with trusted specialists and advanced facilities." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
];
export default function HomePage() {
  usePageMeta(pageMeta);
  return <>
  <section className="home-hero shell">
   <div className="hero-copy"><Eyebrow>Healthcare, centered on you</Eyebrow><MixedHeading as="h1" regular="Your health." strong="Our priority."/><p>Premium healthcare powered by innovation, compassion and clinical excellence across Kenya.</p><div className="hero-actions"><ButtonLink to="/appointment" variant="accent">Book appointment <ArrowRight size={16}/></ButtonLink><ButtonLink to="/services" variant="outline">Explore services</ButtonLink></div></div>
   <div className="hero-visual"><img src={heroImage} alt="A Sharks Clinic doctor consulting with a family"/><div className="hero-stat"><strong>10K+</strong><span>patients cared for</span></div></div>
  </section>

    <section className="section shell"><div className="section-heading"><div><Eyebrow>Our services</Eyebrow><MixedHeading regular="Care for every stage." strong="Expertise for every need."/></div><p>Comprehensive healthcare solutions delivered by experienced medical professionals.</p></div><div className="service-grid">{services.slice(0, 3).map(({ title, category, description, Icon }) => <article className="service-card" key={title}><div className="card-top"><Icon size={28}/><span className="badge">{category}</span></div><h3>{title}</h3><p>{description}</p><Link to="/services">Explore care <ArrowRight size={15}/></Link></article>)}</div></section>

  <section className="split-section shell"><div className="split-image"><img src={careImage} alt="A clinician offering compassionate support to a patient"/></div><div className="split-copy"><Eyebrow>Why Sharks Clinic</Eyebrow><MixedHeading regular="Clinical excellence." strong="Genuinely human care."/><p>We combine experienced specialists, advanced facilities and a patient-first approach to make every visit feel clear and supported.</p><ul className="check-list">{["Qualified, experienced specialists", "Advanced diagnostic facilities", "Personalized treatment plans", "Safe and confidential care"].map(item => <li key={item}><Check size={16}/>{item}</li>)}</ul><ButtonLink to="/about" variant="outline">Meet the clinic <ArrowRight size={15}/></ButtonLink></div></section>

  <ProcessSteps />
  <DepartmentTiles />

  <section className="section shell"><div className="section-heading"><div><Eyebrow>Patient stories</Eyebrow><MixedHeading regular="Trusted by people." strong="Remembered for care."/></div></div><div className="quote-grid">{[
      ["The doctors were extremely professional and caring. I felt listened to from the moment I arrived.", "Mary W."],
      ["Booking was easy, the team was warm, and I received clear guidance throughout my visit.", "James K."],
      ["Modern facilities, experienced doctors and outstanding attention to every detail.", "Amina N."],
    ].map(([quote, name]) => <blockquote key={name}><p>“{quote}”</p><footer><span>{name}</span><span>Verified patient</span></footer></blockquote>)}</div></section>
  <HealthTips />
  <InsuranceStrip />
  <FaqList />
  <HoursAndLocation />
  <CtaBand regular="Ready when you are." strong="Care starts here." copy="Choose a convenient time and our team will contact you to confirm your visit."/>
 </>;
}
