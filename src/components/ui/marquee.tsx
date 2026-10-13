"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type HTMLAttributes, type ReactNode } from "react";

import { cx } from "./cx";

import styles from "./marquee.module.css";

type Direction = "left" | "right" | "up" | "down";

type MarqueeProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  children: ReactNode;
  /** Seconds per pixel of content, scaled; higher is slower. */
  factor?: number;
  direction?: Direction;
  pauseOnHover?: boolean;
  [dataAttribute: `data-${string}`]: unknown;
};

/**
 * Endless ticker. The content is rendered twice and shifted by half its size,
 * paused whenever it is off screen.
 */
export function Marquee({ children, factor = 2, direction = "left", pauseOnHover = true, className, ...rest }: MarqueeProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useGSAP(
    () => {
      const content = contentRef.current;
      const root = rootRef.current;
      if (!content || !root) return;
      const horizontal = direction === "right" || direction === "left";
      const shift = direction === "left" || direction === "up" ? -50 : 50;
      const tween = gsap.fromTo(
        content,
        horizontal ? { xPercent: 0 } : { yPercent: 0 },
        {
          ...(horizontal ? { xPercent: shift } : { yPercent: shift }),
          duration: 1,
          repeat: -1,
          ease: "none",
          force3D: false,
          paused: false,
        },
      );
      tweenRef.current = tween;

      const fitDuration = () => {
        const size = horizontal ? content.offsetWidth : content.offsetHeight;
        if (size) tween.duration(size * factor * (horizontal ? 0.003 : 0.02));
      };
      fitDuration();

      let alive = true;
      let frame = 0;
      const sync = (intersecting?: boolean) => {
        const rect = root.getBoundingClientRect();
        const viewport = window.visualViewport;
        const top = viewport?.offsetTop ?? 0;
        const left = viewport?.offsetLeft ?? 0;
        const width = viewport?.width ?? window.innerWidth;
        const height = viewport?.height ?? window.innerHeight;
        const hidden =
          (rect.width !== 0 || rect.height !== 0) &&
          (rect.bottom < top || rect.right < left || rect.top > top + height || rect.left > left + width);
        if (hidden) tween.pause();
        else if (intersecting !== false) tween.play();
      };
      const scheduleSync = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => sync());
      };
      sync();

      const intersection = new IntersectionObserver(([entry]) => sync(entry?.isIntersecting));
      const resize = new ResizeObserver(fitDuration);
      const viewport = window.visualViewport;
      intersection.observe(root);
      resize.observe(content);
      window.addEventListener("scroll", scheduleSync, { passive: true });
      window.addEventListener("resize", scheduleSync);
      viewport?.addEventListener("scroll", scheduleSync);
      viewport?.addEventListener("resize", scheduleSync);
      document.fonts?.ready.then(() => {
        if (alive) fitDuration();
      });
      return () => {
        alive = false;
        cancelAnimationFrame(frame);
        intersection.disconnect();
        resize.disconnect();
        window.removeEventListener("scroll", scheduleSync);
        window.removeEventListener("resize", scheduleSync);
        viewport?.removeEventListener("scroll", scheduleSync);
        viewport?.removeEventListener("resize", scheduleSync);
      };
    },
    { scope: rootRef, dependencies: [direction, factor] },
  );

  return (
    <div
      {...rest}
      ref={rootRef}
      className={cx(
        styles.marquee,
        className,
        direction === "right" && styles.right,
        direction === "left" && styles.left,
        direction === "up" && styles.up,
        direction === "down" && styles.down,
      )}
      onMouseEnter={
        pauseOnHover
          ? () => {
              if (tweenRef.current) gsap.to(tweenRef.current, { timeScale: 0.25, duration: 0.5 });
            }
          : undefined
      }
      onMouseLeave={
        pauseOnHover
          ? () => {
              if (tweenRef.current) gsap.to(tweenRef.current, { timeScale: 1, duration: 1 });
            }
          : undefined
      }
    >
      <div ref={contentRef} className={styles.content}>
        {children}
        {children}
      </div>
    </div>
  );
}
