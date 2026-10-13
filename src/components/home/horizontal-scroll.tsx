"use client";

import { useRef, useState, type ReactNode } from "react";

import { cx } from "@/components/ui/cx";
import { ContainerAnimationContext, TrackModeContext, useHorizontalScroll } from "./horizontal";
import type { ScrollMode } from "./scroll-mode";

import styles from "./horizontal-scroll.module.css";

/** Pins its children and scrolls them sideways; `footer` sits after the pin. */
export function HorizontalScroll({
  children,
  className,
  footer,
}: {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  const pinRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ScrollMode | null>(null);
  const [tween, setTween] = useState<gsap.core.Tween | null>(null);

  useHorizontalScroll(pinRef, trackRef, setTween, setMode);

  return (
    <TrackModeContext.Provider value={mode}>
      <ContainerAnimationContext.Provider value={tween}>
        <section ref={pinRef} className={cx(styles.pin, className)} data-pin>
          <div className={styles.sticky}>
            <div ref={trackRef} className={styles.track}>
              {children}
            </div>
          </div>
        </section>
        {footer}
      </ContainerAnimationContext.Provider>
    </TrackModeContext.Provider>
  );
}
