"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Elements that rise into place as they scroll into view. */
const REVEAL_SELECTOR = [
  ".feature-visual",
  ".exp-card",
  ".benefit-card",
  ".mode-shot",
  ".step",
  ".follow-card",
  ".create-visual",
  ".create-points li",
  ".browser-cta-band",
  ".deeper-band",
  ".alpha-band",
  ".status-note",
].join(", ");

const DECODE_GLYPHS = "/\\<>[]{}=+*#_—0177";

/**
 * Progressive motion: a terminal-style decode on section labels, and a
 * transform-only reveal on cards.
 *
 * Both are additive. Content is fully present and readable in the server-
 * rendered HTML, so a crawler, a reader with JavaScript disabled, and anyone
 * who prefers reduced motion all get the finished page — these effects only
 * change how it arrives.
 */
export function MotionEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) return;

    const frames = new Set<number>();

    /**
     * Scrambles the label, then resolves it left to right. The text node's
     * value is mutated in place rather than replacing the node, so the DOM
     * React rendered stays structurally untouched.
     */
    const decode = (element: HTMLElement) => {
      const node = element.lastChild;
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      const target = node.nodeValue;
      if (!target || !target.trim() || element.dataset.decoded) return;
      element.dataset.decoded = "1";

      const total = Math.max(10, Math.min(22, target.length));
      let frame = 0;

      const tick = () => {
        frame += 1;
        const resolved = Math.floor((frame / total) * target.length);
        let out = "";
        for (let i = 0; i < target.length; i += 1) {
          const char = target[i];
          if (i < resolved || char === " ") out += char;
          else out += DECODE_GLYPHS[(i * 7 + frame * 3) % DECODE_GLYPHS.length];
        }
        node.nodeValue = out;
        if (resolved < target.length) frames.add(requestAnimationFrame(tick));
        else node.nodeValue = target;
      };

      frames.add(requestAnimationFrame(tick));
    };

    const eyebrowObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          eyebrowObserver.unobserve(entry.target);
          decode(entry.target as HTMLElement);
        }
      },
      { threshold: 0.6 },
    );
    document.querySelectorAll<HTMLElement>(".eyebrow").forEach((element) => {
      eyebrowObserver.observe(element);
    });

    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("rv-in");
          revealObserver.unobserve(entry.target);
        }
      },
      { threshold: 0.12 },
    );
    document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((element) => {
      // Only elements still below the fold animate; anything already visible
      // must not flash in after the page has painted.
      if (element.getBoundingClientRect().top > window.innerHeight - 30) {
        element.classList.add("rv");
        revealObserver.observe(element);
      }
    });

    return () => {
      eyebrowObserver.disconnect();
      revealObserver.disconnect();
      for (const frame of frames) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}
