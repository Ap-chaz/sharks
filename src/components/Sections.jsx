import { useCallback, useEffect, useRef, useState } from "react";
import stepA from "@/assets/clinic/step-book-online.jpg";
import stepB from "@/assets/clinic/confirmation.jpg";
import stepC from "@/assets/clinic/meet-your-doctor.jpeg";
import stepD from "@/assets/clinic/follow-up.jpeg";
import { ArrowRight, BadgeCheck, ChevronDown, Clock3, Lightbulb, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { ButtonLink } from "./Button";
import { Eyebrow, MixedHeading } from "./PageParts";
import { clinicInfo, doctors, faqs, healthTips, insurers, processSteps, services } from "@/lib/clinic-data";
import { useHoursRows } from "@/lib/use-opening-hours";

/** Pinned scroll-story: the stage stays put while the image and active step change with scroll. */
const stepImages = [stepA, stepB, stepC, stepD];
export function ProcessSteps() {
  const ref = useRef(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const total = Math.max(el.offsetHeight - window.innerHeight, 1);
        const p = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total));
        el.style.setProperty("--p", p.toFixed(3));
        setActive(Math.min(processSteps.length - 1, Math.floor(p * processSteps.length)));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);
  return (
    <section className="pin" ref={ref} style={{ "--n": processSteps.length }}>
      <div className="pin-stage shell">
        <div className="pin-copy">
          <Eyebrow>How it works</Eyebrow>
          <MixedHeading regular="Simple from the start." strong="Clear all the way through." />
          <ol className="pin-steps">
            {processSteps.map((step, i) => (
              <li key={step.title} className={i === active ? "is-active" : i < active ? "is-done" : undefined}>
                <span className="pin-num">{String(i + 1).padStart(2, "0")}</span>
                <div><h3>{step.title}</h3><p>{step.copy}</p></div>
              </li>
            ))}
          </ol>
          <div className="pin-progress" aria-hidden="true"><span /></div>
        </div>
        <div className="pin-frame" aria-hidden="true">
          {stepImages.map((src, i) => <img key={i} src={src} alt="" className={i === active ? "is-active" : undefined} />)}
          <span className="pin-badge">{String(active + 1).padStart(2, "0")} / {String(processSteps.length).padStart(2, "0")}</span>
        </div>
      </div>
    </section>
  );
}

const patientStories = [
  { name: "Mary W.", quote: "The doctors were extremely professional and caring. I felt listened to from the moment I arrived." },
  { name: "James K.", quote: "Booking was easy, the team was warm, and I received clear guidance throughout my visit." },
  { name: "Amina N.", quote: "Modern facilities, experienced doctors and outstanding attention to every detail." },
  { name: "Grace M.", quote: "My daughter is scared of clinics, but the pediatric team made her smile and feel safe the whole visit." },
  { name: "Daniel O.", quote: "The specialist walked me through my scan on screen and made sure I understood every step of the plan." },
  { name: "Faith C.", quote: "They remembered my history, followed up after my visit and made it easy to get my records." },
];
const STORY_MS = 7000;

/** Auto-advancing story rail: active card on the left, next one peeking in, segmented progress. */
export function PatientStories() {
  const n = patientStories.length;
  const [index, setIndex] = useState(0); // 0..n; n is the first card of the repeated copy (same look as 0)
  const [snap, setSnap] = useState(false); // true = move without animation (seamless loop reset)
  const touchX = useRef(null);
  const active = index % n;
  const jump = useCallback((to, then) => {
    setSnap(true); setIndex(to);
    requestAnimationFrame(() => requestAnimationFrame(() => { setSnap(false); if (then !== undefined) setIndex(then); }));
  }, []);
  const next = useCallback(() => setIndex((i) => Math.min(i + 1, n)), [n]);
  const prev = useCallback(() => { if (index === 0) jump(n, n - 1); else setIndex(index - 1); }, [index, jump, n]);
  const onTrackEnd = (e) => { if (e.target === e.currentTarget && index >= n) jump(index - n); };
  const cards = [0, 1, 2, 3].flatMap((copy) => patientStories.map((st) => ({ ...st, copy })));
  return (
    <section className="section shell stories">
      <div className="section-heading">
        <div>
          <Eyebrow>Patient stories</Eyebrow>
          <MixedHeading regular="Trusted by people." strong="Remembered for care." />
        </div>
      </div>
      <div
        className={`story-viewport${snap ? " is-snap" : ""}`}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - (touchX.current ?? 0);
          if (Math.abs(dx) > 40) { if (dx < 0) next(); else prev(); }
          touchX.current = null;
        }}
      >
        <div className="story-track" style={{ "--i": index }} onTransitionEnd={onTrackEnd}>
          {cards.map((st, i) => (
            <blockquote key={`${st.copy}-${st.name}`} className={`story-card${i === index ? " is-active" : ""}`} onClick={() => i < n && setIndex(i)} aria-hidden={i !== index}>
              <p>“{st.quote}”</p>
              <footer><span>{st.name}</span><span>Verified patient</span></footer>
            </blockquote>
          ))}
        </div>
      </div>
      <div className="story-controls">
        <div className="story-bars" role="tablist" aria-label="Patient stories">
          {patientStories.map((st, i) => (
            <button key={st.name} type="button" role="tab" aria-selected={i === active} aria-label={`Story ${i + 1}: ${st.name}`} className={i < active ? "is-done" : i === active ? "is-current" : undefined} onClick={() => setIndex(i)}>
              <span key={i === active ? `a${active}${index === 0 ? "" : ""}` : "x"} style={i === active ? { animationDuration: `${STORY_MS}ms` } : undefined} onAnimationEnd={i === active ? next : undefined} />
            </button>
          ))}
        </div>
        <span className="story-count">{active + 1} / {n}</span>
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
        {services.map(({ title, Icon }, index) => (
          <Link to="/services" className={`dept-tile tone-${deptTones[index % deptTones.length]}`} key={title}>
            <span className="dept-icon"><Icon size={24} /></span>
            <strong>{title}</strong>
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
  const hoursRows = useHoursRows();
  return (
    <section className="section shell hours-wrap">
      <div className="hours-card">
        <Eyebrow>Visit us</Eyebrow>
        <h2 className="hours-title"><Clock3 size={22} /> Opening hours</h2>
        <ul className="hours-list">
          {hoursRows.map((row) => (
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
          </div>
        </article>
      ))}
    </div>
  );
}
