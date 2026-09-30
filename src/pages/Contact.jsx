import { Clock3, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { usePageMeta } from "@/lib/use-page-meta";
import { CtaBand, PageIntro } from "@/components/PageParts";
import { FaqList, HoursAndLocation } from "@/components/Sections";
import { clinicInfo } from "@/lib/clinic-data";

const pageMeta = [
  { title: "Contact — SHARKS Clinic" },
  { name: "description", content: "Call, email or visit SHARKS Clinic in Nairobi. Opening hours, location and WhatsApp." },
  { property: "og:title", content: "Contact — SHARKS Clinic" },
  { property: "og:type", content: "website" },
];

export default function ContactPage() {
  usePageMeta(pageMeta);
  const cards = [
    { Icon: Phone, title: "Call us", value: clinicInfo.phone, href: clinicInfo.phoneHref, tone: "teal" },
    { Icon: MessageCircle, title: "WhatsApp", value: "Message the team", href: "https://wa.me/254722405988", tone: "coral" },
    { Icon: Mail, title: "Email", value: clinicInfo.email, href: `mailto:${clinicInfo.email}`, tone: "amber" },
    { Icon: MapPin, title: "Visit", value: clinicInfo.address, tone: "navy" },
  ];
  return (
    <>
      <PageIntro eyebrow="Contact" regular="We're here," strong="whenever you need us." copy="Reach the team by phone, WhatsApp or email, or visit us in Nairobi." />
      <section className="shell contact-grid">
        {cards.map(({ Icon, title, value, href, tone }) => {
          const body = (
            <>
              <span className="contact-icon"><Icon size={22} /></span>
              <strong>{title}</strong>
              <span>{value}</span>
            </>
          );
          return href ? (
            <a className={`contact-card tone-${tone}`} href={href} key={title} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{body}</a>
          ) : (
            <div className={`contact-card tone-${tone}`} key={title}>{body}</div>
          );
        })}
      </section>
      <HoursAndLocation />
      <FaqList />
      <CtaBand regular="Prefer to book online?" strong="It takes two minutes." copy="Choose a convenient time and we will confirm your visit." />
    </>
  );
}
