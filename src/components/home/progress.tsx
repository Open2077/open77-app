"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "lenis/react";
import { useContext, useRef, useState } from "react";

import { cx } from "@/components/ui/cx";
import { ContainerAnimationContext, registerSceneAnchor, scrollToScene, useTrackMode } from "./horizontal";

import styles from "./progress.module.css";

const SCENES = [
  { id: "players", label: "For players", color: "yellow" },
  { id: "creators", label: "For server creators", color: "blue" },
  { id: "developers", label: "For developers", color: "red" },
] as const;

/** Where a scene's progress starts: after the runway if it has one, else at its edge. */
function sceneStart(scene: HTMLElement, horizontal: boolean) {
  const runway = scene.querySelector<HTMLElement>("[data-runway]");
  return runway
    ? { trigger: runway, position: horizontal ? "right 50%" : "bottom 50%" }
    : { trigger: scene, position: horizontal ? "left 50%" : "top 50%" };
}

function setActive(item: HTMLElement, active: boolean) {
  if (styles.active) item.classList.toggle(styles.active, active);
  if (active) item.setAttribute("aria-current", "true");
  else item.removeAttribute("aria-current");
}

function insideRange(trigger: ScrollTrigger) {
  const scroll = trigger.scroll();
  return scroll > trigger.start && scroll < trigger.end;
}

/** Bottom bar: one segment per scene that fills as the scene scrolls by. */
export function Progress() {
  const ref = useRef<HTMLDivElement>(null);
  const triggers = useRef(new Map<string, ScrollTrigger>());
  const containerAnimation = useContext(ContainerAnimationContext);
  const mode = useTrackMode();
  const lenis = useLenis();
  const [shown, setShown] = useState(false);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || !mode || (mode === "horizontal" && !containerAnimation)) return;
      const horizontal = mode === "horizontal";
      gsap.registerPlugin(ScrollTrigger);
      const scenes = Array.from(document.querySelectorAll<HTMLElement>("section[data-scene]"));

      const reached = (self: ScrollTrigger) => {
        if (self.progress >= 1) return false;
        if (self.isActive) return true;
        const track = containerAnimation?.scrollTrigger;
        if (!containerAnimation || !track) return window.scrollY + 1 >= self.start;
        const share = self.start / containerAnimation.duration();
        return track.scroll() + 1 >= track.start + (track.end - track.start) * share;
      };

      const pin = scenes[0]?.closest("[data-pin]");
      if (pin) {
        ScrollTrigger.create({
          trigger: pin,
          start: "top top",
          end: "bottom bottom-=80",
          invalidateOnRefresh: true,
          onToggle: (self) => setShown(insideRange(self)),
          onRefresh: (self) => setShown(insideRange(self)),
        });
      }

      const unregister: Array<() => void> = [];
      scenes.forEach((scene, index) => {
        const id = scene.dataset.scene;
        if (!id) return;
        const item = root.querySelector<HTMLElement>(`[data-scene="${id}"]`);
        if (!item) return;
        const following = scenes[index + 1];
        const start = sceneStart(scene, horizontal);
        const end = following ? sceneStart(following, horizontal) : null;
        const tween = gsap.fromTo(
          item,
          { "--scale": 0 },
          {
            "--scale": 1,
            ease: "none",
            scrollTrigger: {
              trigger: start.trigger,
              endTrigger: end?.trigger ?? scene,
              ...(containerAnimation ? { containerAnimation } : {}),
              start: start.position,
              end: end ? end.position : horizontal ? "right right" : "bottom top",
              scrub: true,
              invalidateOnRefresh: true,
              onToggle: (self) => setActive(item, reached(self)),
              onUpdate: (self) => setActive(item, reached(self)),
              onRefresh: (self) => setActive(item, reached(self)),
            },
          },
        );
        if (!tween.scrollTrigger) return;
        triggers.current.set(id, tween.scrollTrigger);
        unregister.push(
          registerSceneAnchor(id, () => {
            const trigger = triggers.current.get(id);
            if (!trigger) return null;
            const half = (mode === "horizontal" ? window.innerWidth : window.innerHeight) / 2;
            const track = containerAnimation?.scrollTrigger;
            const top =
              !containerAnimation || !track
                ? trigger.start
                : Math.max(0, track.start + (track.end - track.start) * (trigger.start / containerAnimation.duration()));
            return top + half;
          }),
        );
      });
      return () => {
        triggers.current.clear();
        unregister.forEach((dispose) => dispose());
      };
    },
    { scope: ref, dependencies: [containerAnimation, mode], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={cx(styles.progress, shown && styles.in)} data-progress inert={!shown}>
      {SCENES.map((scene) => (
        <button
          key={scene.id}
          type="button"
          className={styles.item}
          data-scene={scene.id}
          data-color={scene.color}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => scrollToScene(scene.id, lenis)}
        >
          <span>{scene.label}</span>
          <div className={styles.bar} />
        </button>
      ))}
    </div>
  );
}
