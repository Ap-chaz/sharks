import { ArrowRight, BadgeCheck, ChevronDown, Clock3, Lightbulb, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { ButtonLink } from "./Button";
import { Eyebrow, MixedHeading } from "./PageParts";
import { clinicInfo, doctors, faqs, healthTips, hours, insurers, processSteps, services } from "@/lib/clinic-data";

/** Four colored steps explaining how a visit works. */
export function ProcessSteps() {
  return (
    <section className="band band-sky">
      <div className="section shell">
        <div className="section-heading">
          <div>
            <Eyebrow>How it works</Eyebrow>
            <MixedHeading regular="Simple from the start." strong="Clear all the way through." />
          </div>
          <p>From first booking to follow-up, every step is designed to feel easy and supported.</p>
        </div>
        <div className="steps-grid">
          {processSteps.map((step, index) => (
            <article className={`step-card tone-${step.tone}`} key={step.title}>
              <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const deptTones = ["teal", "coral", "amber", "navy", "teal", "coral", "amber", "navy"];

/** Tile for every department, each in its own accent color. */
export function DepartmentTiles() {
  return (
    <section className="section shell">
      <div className="section-heading">
        <div>
          <Eyebrow>Departments</Eyebrow>
          <MixedHeading regular="Every specialty." strong="Under one roof." />
        </div>
        <p>Tap any department to learn more or book a visit.</p>
      </div>
      <div className="dept-grid">
        {services.map(({ title, category, Icon }, index) => (
          <Link to="/services" className={`dept-tile tone-${deptTones[index % deptTones.length]}`} key={title}>
            <span className="dept-icon"><Icon size={24} /></span>
            <strong>{title}</strong>
            <small>{category}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Three short health tips in colored cards. */
export function HealthTips() {
  return (
    <section className="band band-amber">
      <div className="section shell">
        <div className="section-heading">
          <div>
            <Eyebrow>Health tips</Eyebrow>
            <MixedHeading regular="Better health" strong="starts with small steps." />
          </div>
          <p>Practical guidance from our care team, for every stage of life.</p>
        </div>
        <div className="tips-grid">
          {healthTips.map((tip) => (
            <article className={`tip-card tone-${tip.tone}`} key={tip.title}>
              <span className="tip-tag"><Lightbulb size={14} /> {tip.tag}</span>
              <h3>{tip.title}</h3>
              <p>{tip.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Payment and insurance strip. */
export function InsuranceStrip() {
  return (
    <section className="section shell insurance">
      <div className="insurance-copy">
        <Eyebrow>Payments and cover</Eyebrow>
        <MixedHeading regular="Flexible ways" strong="to pay for care." />
        <p>We work with a range of insurers and accept mobile money, card and cash. Confirm your cover with our team before your visit.</p>
      </div>
      <div className="insurer-list">
        {insurers.map((name) => (
          <span className="insurer-pill" key={name}><BadgeCheck size={15} /> {name}</span>
        ))}
      </div>
    </section>
  );
}

/** Accordion built on native <details>, so it needs no extra state. */
export function FaqList() {
  return (
    <section className="band band-mint">
      <div className="section shell faq-wrap">
        <div className="faq-intro">
          <Eyebrow>FAQ</Eyebrow>
          <MixedHeading regular="Questions," strong="answered." />
          <p>Can't find what you need? Call us and we'll gladly help.</p>
          <ButtonLink to="/contact" variant="outline">Contact us <ArrowRight size={15} /></ButtonLink>
        </div>
        <div className="faq-list">
          {faqs.map((item) => (
            <details className="faq-item" key={item.q}>
              <summary>{item.q}<ChevronDown size={18} /></summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Opening hours beside a map. */
export function HoursAndLocation() {
  return (
    <section className="section shell hours-wrap">
      <div className="hours-card">
        <Eyebrow>Visit us</Eyebrow>
        <h2 className="hours-title"><Clock3 size={22} /> Opening hours</h2>
        <ul className="hours-list">
          {hours.map((row) => (
            <li key={row.day} className={row.highlight ? "hours-highlight" : undefined}>
              <span>{row.day}</span>
              <strong>{row.time}</strong>
            </li>
          ))}
        </ul>
        <div className="hours-contact">
          <a href={clinicInfo.phoneHref}><Phone size={16} /> {clinicInfo.phone}</a>
          <a href={`mailto:${clinicInfo.email}`}><Mail size={16} /> {clinicInfo.email}</a>
          <span><MapPin size={16} /> {clinicInfo.address}</span>
        </div>
      </div>
      <div className="map-frame">
        <iframe
          title="Sharks Clinic location map"
          src={`https://www.google.com/maps?q=${encodeURIComponent(clinicInfo.mapQuery)}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}

/** Doctor cards used on the Doctors page. */
export function DoctorCards({ images }) {
  return (
    <div className="doctor-grid">
      {doctors.map((doctor, index) => (
        <article key={doctor.name} className={`tone-${doctor.tone}`}>
          <img src={images[index]} alt={`${doctor.name}, ${doctor.role}`} />
          <div>
            <h3>{doctor.name}</h3>
            <p>{doctor.role}</p>
            <ul className="doctor-meta">
              <li><strong>Focus</strong> {doctor.focus}</li>
              <li><strong>Available</strong> {doctor.days}</li>
            </ul>
            <ButtonLink to="/appointment" variant="outline">Book with {doctor.name.split(" ")[1]} <ArrowRight size={15} /></ButtonLink>
          </div>
        </article>
      ))}
    </div>
  );
}
