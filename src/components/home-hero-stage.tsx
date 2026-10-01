"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Pointer parallax for the home hero. Writes the pointer offset (-1..1) to
 * `--mx` / `--my` on the stage; each layer decides in CSS how far it moves.
 * Nothing renders differently without JavaScript or with reduced motion.
 */
export function HomeHeroStage({ className, children, labelledBy }: { className: string; children: ReactNode; labelledBy: string }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const stage = ref.current;
    if (!stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    const onMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        stage.style.setProperty("--mx", x.toFixed(3));
        stage.style.setProperty("--my", y.toFixed(3));
      });
    };
    stage.addEventListener("pointermove", onMove);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <section ref={ref} className={className} aria-labelledby={labelledBy}>{children}</section>;
}
