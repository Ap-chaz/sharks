import { usePageMeta } from "@/lib/use-page-meta";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/Button";
import { CtaBand, PageIntro } from "@/components/PageParts";
import { services } from "@/lib/clinic-data";
import { FaqList, ProcessSteps } from "@/components/Sections";
const pageMeta = [
  { title: "Healthcare Services — SHARKS Clinic" }, { name: "description", content: "Explore general consultation, cardiology, emergency care, pediatrics, dental, orthopedic, laboratory and dermatology services." },
  { property: "og:title", content: "Healthcare Services — SHARKS Clinic" }, { property: "og:description", content: "Comprehensive healthcare services delivered by experienced professionals in Nairobi." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
];
export default function ServicesPage() { usePageMeta(pageMeta); return <><PageIntro eyebrow="Services" regular="Comprehensive care." strong="One trusted clinic." copy="From everyday consultations to specialist support and urgent treatment, our teams coordinate care around you."/><section className="section shell service-list">{services.map(({ title, category, description, Icon }, index) => <article key={title} className="service-row"><div className="service-number">{String(index + 1).padStart(2, "0")}</div><div className="service-icon"><Icon size={28}/></div><div><span className="badge">{category}</span><h2>{title}</h2><p>{description}</p></div><ButtonLink to="/appointment" variant="outline">Book <ArrowRight size={15}/></ButtonLink></article>)}</section><ProcessSteps /><FaqList /><CtaBand regular="Not sure where to start?" strong="We’ll guide you." copy="Book a general consultation and we’ll connect you with the right care."/></>; }
