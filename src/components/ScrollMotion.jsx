import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const revealSelectors = [
  ".page-intro > *",
  ".trust-item",
  ".section-heading > *",
  ".service-card",
  ".split-image",
  ".split-copy > *",
  ".quote-grid blockquote",
  ".value-grid article",
  ".doctor-grid article",
  ".service-row",
  ".cta-inner > *",
  ".step-card",
  ".dept-tile",
  ".tip-card",
  ".timeline-item",
  ".faq-item",
  ".hours-card",
  ".map-frame",
  ".insurance > *",
  ".contact-card",
  ".form-intro > *",
  ".form-panel",
  ".footer-grid > *",
  ".footer-bottom > *",
].join(",");

const entranceSelectors = [".hero-copy > *", ".hero-visual"].join(",");

export function ScrollMotion() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let observer;
    const timer = window.setTimeout(() => {
      const revealElements = Array.from(document.querySelectorAll(revealSelectors));
      const entranceElements = Array.from(document.querySelectorAll(entranceSelectors));

      entranceElements.forEach((element, index) => {
        element.classList.add("page-enter", `motion-delay-${Math.min(index, 3)}`);
      });

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer?.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -10%", threshold: 0.08 },
      );

      revealElements.forEach((element, index) => {
        element.classList.add("scroll-reveal", `motion-delay-${index % 3}`);
        observer?.observe(element);
      });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [pathname]);

  return null;
}
