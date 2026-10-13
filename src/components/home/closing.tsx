"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

import { SCENE_BG_GROUP, setParallaxGroupSuspended } from "./parallax";
import { setSceneToneSuspended } from "./scene";

import styles from "./closing.module.css";

/** Fades the fixed scene art out as the footer comes up, and hands back the tone. */
export function Closing() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const trigger = ref.current;
    if (!trigger) return;
    gsap.registerPlugin(ScrollTrigger);
    const sync = (self: ScrollTrigger) => {
      const scroll = Math.max(self.scroll(), window.scrollY);
      setParallaxGroupSuspended(SCENE_BG_GROUP, self.progress > 0);
      setSceneToneSuspended(scroll >= self.start);
    };
    gsap.to("[data-scene-bg]", {
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger,
        start: "top bottom",
        end: "top 50%",
        scrub: true,
        onToggle: sync,
        onRefresh: sync,
        onUpdate: sync,
      },
    });
  });

  return <div ref={ref} className={styles.closing} aria-hidden="true" />;
}
