"use client";

import gsap from "gsap";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { cx } from "./cx";

import styles from "./magnetic.module.css";

const IDLE = { centerX: 0, centerY: 0, maxDistance: 0 };

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}

type QuickPair = {
  x: gsap.QuickToFunc;
  y: gsap.QuickToFunc;
  duration: number;
  ease: string;
};

/**
 * Pulls its content towards the cursor while the pointer is over `parent`
 * (or over itself), then springs back when the pointer leaves.
 */
export function Magnetic({
  children,
  parent,
  duration = 0.6,
  ease = "elastic.out(1, 0.3)",
  strength = 0.2,
  tolerance = 0.6,
  disabled = false,
}: {
  children: ReactNode;
  parent?: RefObject<HTMLElement | null>;
  duration?: number;
  ease?: string;
  strength?: number;
  tolerance?: number;
  disabled?: boolean;
}) {
  const hitRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const noHover = useMediaQuery("(hover: none)");
  const off = disabled || reducedMotion || noHover;

  useEffect(() => {
    const host = parent?.current ?? hitRef.current;
    const target = targetRef.current;
    if (!host || !target) return;
    let bounds = IDLE;
    const pointer = { x: 0, y: 0 };
    let frame = 0;
    let quick: QuickPair | null = null;

    const pull = () => {
      if (off || bounds.maxDistance === 0) return;
      const dx = pointer.x - bounds.centerX;
      const dy = pointer.y - bounds.centerY;
      const proximity = 1 - Math.min(Math.hypot(dx, dy) / bounds.maxDistance, 1);
      if (proximity <= tolerance) return;
      if (!quick || quick.duration !== duration || quick.ease !== ease) {
        quick = {
          x: gsap.quickTo(target, "x", { duration, ease }),
          y: gsap.quickTo(target, "y", { duration, ease }),
          duration,
          ease,
        };
      }
      const force = strength * proximity;
      quick.x(dx * force);
      quick.y(dy * force);
    };
    const release = (animate: boolean) => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      bounds = IDLE;
      quick = null;
      gsap.killTweensOf(target);
      if (!animate) {
        gsap.set(target, { x: 0, y: 0 });
        return;
      }
      gsap.to(target, { x: 0, y: 0, duration, ease: "back.out", overwrite: true });
    };
    const onEnter = (event: MouseEvent) => {
      const element = event.currentTarget;
      if (off || !(element instanceof HTMLElement)) return;
      gsap.killTweensOf(target);
      quick = null;
      const rect = element.getBoundingClientRect();
      bounds = {
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        maxDistance: Math.max(rect.width, rect.height),
      };
    };
    const onMove = (event: MouseEvent) => {
      if (off || bounds.maxDistance === 0) return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          pull();
        });
      }
    };
    const onLeave = () => {
      if (!off) release(true);
    };

    if (off) release(false);
    host.addEventListener("mouseenter", onEnter);
    host.addEventListener("mousemove", onMove, { passive: true });
    host.addEventListener("mouseleave", onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      gsap.killTweensOf(target);
      host.removeEventListener("mouseenter", onEnter);
      host.removeEventListener("mousemove", onMove);
      host.removeEventListener("mouseleave", onLeave);
    };
  }, [parent, off, duration, ease, strength, tolerance]);

  return (
    <span ref={hitRef} className={styles.hit}>
      <span ref={targetRef} className={cx(styles.target, !off && styles.live)} data-magnetic={off ? undefined : ""}>
        {children}
      </span>
    </span>
  );
}
