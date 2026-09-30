import { ArrowRight } from "lucide-react";
import { ButtonLink } from "./Button";
export function Eyebrow({ children }) { return <p className="eyebrow">{children}</p>; }
export function MixedHeading({ regular, strong, as = "h2", className = "" }) {
  const Tag = as;
  return <Tag className={`mixed-heading ${className}`}><span>{regular}</span> <strong>{strong}</strong></Tag>;
}
export function PageIntro({ eyebrow, regular, strong, copy }) {
  return <section className="page-intro shell"><Eyebrow>{eyebrow}</Eyebrow><MixedHeading as="h1" regular={regular} strong={strong}/><p className="intro-copy">{copy}</p></section>;
}
export function CtaBand({ regular, strong, copy }) {
  return <section className="cta-band"><div className="shell cta-inner"><div><MixedHeading regular={regular} strong={strong}/><p>{copy}</p></div><ButtonLink to="/appointment" variant="accent">Book appointment <ArrowRight size={16}/></ButtonLink></div></section>;
}
