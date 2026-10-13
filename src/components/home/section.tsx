"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "lenis/react";
import { Fragment, useRef, useState, type DependencyList, type RefObject } from "react";

import { scrollToScene } from "./horizontal";
import { Marquee } from "@/components/ui/marquee";

import styles from "./section.module.css";

const NO_DEPENDENCIES: DependencyList = [];

/** Builds a scrubbed timeline over the scroll range of `ref`. */
function useScrubTimeline(
  ref: RefObject<HTMLElement | null>,
  build: (timeline: gsap.core.Timeline) => void,
  { start = "top bottom", end = "bottom top", dependencies = NO_DEPENDENCIES }: { start?: string; end?: string; dependencies?: DependencyList } = {},
) {
  useGSAP(
    () => {
      const trigger = ref.current;
      if (!trigger) return;
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        build(
          gsap.timeline({
            defaults: { ease: "none", force3D: true },
            scrollTrigger: { trigger, start, end, scrub: true, invalidateOnRefresh: true },
          }),
        );
      });
      return () => mm.revert();
    },
    { dependencies: [start, end, ...dependencies] },
  );
}

/** Where each column slides in from, and where it leaves to, in yPercent. */
const ENTER = [100, -100, 100];
const LEAVE = [-100, 100, -100];

const AUDIENCES = [
  { id: "players", label: "For players", selection: "yellow-reverse", title: ["For", "Players"], marquee: "Players", key: "players" },
  {
    id: "creators",
    label: "For server creators",
    selection: "blue-reverse",
    title: ["For", "Server", "Creators"],
    marquee: "Server Creators",
    key: "creators",
  },
  { id: "developers", label: "For developers", selection: "red-reverse", title: ["For", "Devs"], marquee: "Devs", key: "devs" },
] as const;

/**
 * The three audience columns between the hero and the scenes. Scrolling through
 * them fades the hero out and slides the columns across each other; clicking a
 * column jumps to its scene.
 */
export function Section() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const [active, setActive] = useState(false);

  useGSAP(
    () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const sync = (self: ScrollTrigger) => setActive(self.isActive);
        ScrollTrigger.create({ trigger, start: "top bottom", end: "bottom top", onToggle: sync, onRefresh: sync });
      });
      return () => mm.revert();
    },
    { scope: triggerRef },
  );

  useScrubTimeline(triggerRef, (timeline) => {
    gsap.utils.toArray<HTMLElement>("[data-item]", sectionRef.current).forEach((item, index) => {
      const enter = ENTER[index] ?? 100;
      const leave = LEAVE[index] ?? -100;
      timeline
        .fromTo(item, { y: 0, yPercent: enter }, { y: 0, yPercent: 0, duration: 0.5 }, 0)
        .to(item, { y: 0, yPercent: leave, duration: 0.5 }, 0.5);
    });
    timeline
      .set("[data-hero]", { autoAlpha: 1 }, 0)
      .set("[data-hero]", { autoAlpha: 0, immediateRender: false }, 0.5)
      .to("[data-video-shift]", { yPercent: -5, duration: 0.5 }, 0)
      .to("[data-cache]", { opacity: 1, duration: 0.5 }, 0)
      .to("[data-render='left']", { xPercent: -10, yPercent: 5, duration: 0.5 }, 0)
      .to("[data-render='right']", { xPercent: 10, yPercent: 5, duration: 0.5 }, 0);
  });

  useScrubTimeline(triggerRef, (timeline) => {
    timeline.to("[data-title='players']", { yPercent: 350 }, 0);
    timeline.to("[data-title='creators']", { yPercent: -100 }, 0);
    timeline.to("[data-title='devs']", { yPercent: -350 }, 0);
  });

  return (
    <>
      <div ref={sectionRef} className={styles.section} inert={!active}>
        {AUDIENCES.map((audience, index) => (
          <div key={audience.id} className={styles.column} data-selection={audience.selection}>
            <div className={styles.item} data-item={index + 1}>
              <h2 className={styles.title} data-title={audience.key}>
                {audience.title.map((word, wordIndex) => (
                  <Fragment key={word}>
                    {wordIndex > 0 ? " " : null}
                    <span>{word}</span>
                  </Fragment>
                ))}
              </h2>
              <Marquee className={styles.marquee}>{audience.marquee}</Marquee>
              <button
                type="button"
                className={styles.hit}
                aria-label={audience.label}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => scrollToScene(audience.id, lenis)}
              />
            </div>
          </div>
        ))}
      </div>
      <div ref={triggerRef} className={styles.trigger} aria-hidden="true" />
    </>
  );
}
