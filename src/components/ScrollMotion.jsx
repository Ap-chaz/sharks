import { useLocation } from "react-router-dom";
import { useEffect } from "react";

// Fade is used sparingly: only section headings and cards. Everything else simply appears.
const revealSelectors = [
  ".page-intro > *",
  ".section-heading > *",
  ".service-card",
  ".value-grid article",
  ".doctor-grid article",
  ".cta-inner > *",
  ".step-card", ".pin-copy > .eyebrow",
  ".dept-tile",
  ".tip-card",
].join(",");

const entranceSelectors = [".hero-copy > *"].join(",");

export function ScrollMotion() {
  const { pathname } = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    const hero = document.querySelector(".home-hero");
    root.classList.toggle("has-hero", !!hero);
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        root.classList.toggle("is-scrolled", window.scrollY > 40);
        if (hero) hero.style.setProperty("--hero-p", Math.min(1, window.scrollY / window.innerHeight).toFixed(3));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", onScroll); root.classList.remove("has-hero"); };
  }, [pathname]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let onMove;
    const timer = window.setTimeout(() => {
      const revealElements = Array.from(document.querySelectorAll(revealSelectors));
      const entranceElements = Array.from(document.querySelectorAll(entranceSelectors));

      entranceElements.forEach((element, index) => {
        element.classList.add("page-enter", `motion-delay-${Math.min(index, 3)}`);
      });

      revealElements.forEach((element, index) => {
        element.classList.add("scroll-reveal", `motion-delay-${index % 3}`);
      });

      // Two-way reveal: content animates in as it enters the viewport and animates out as it leaves
      // (upward when scrolled past, downward when scrolled back above), then replays on return.
      // Measured on scroll instead of with IntersectionObserver, because a clipped (wiped) element
      // reports zero visibility to the observer and would never be revealed.
      const update = () => {
        const vh = window.innerHeight;
        const top = vh * 0.06;
        const bottom = vh * 0.92;
        revealElements.forEach((el) => {
          const r = el.getBoundingClientRect();
          const overlap = Math.min(r.bottom, bottom) - Math.max(r.top, top);
          if (overlap >= Math.min(r.height * 0.15, 80)) {
            el.classList.remove("is-above", "is-below");
            el.classList.add("is-visible");
          } else {
            const above = r.top + r.height / 2 < vh / 2;
            el.classList.remove("is-visible");
            el.classList.toggle("is-above", above);
            el.classList.toggle("is-below", !above);
          }
        });
      };
      let raf = 0;
      onMove = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(update);
      };
      update();
      window.addEventListener("scroll", onMove, { passive: true });
      window.addEventListener("resize", onMove);
    }, 300);

    return () => {
      window.clearTimeout(timer);
      if (onMove) {
        window.removeEventListener("scroll", onMove);
        window.removeEventListener("resize", onMove);
      }
    };
  }, [pathname]);

  return null;
}
