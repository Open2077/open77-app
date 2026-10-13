"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";
import { createContext, useContext, type RefObject } from "react";

import { HORIZONTAL_QUERY, getFitRatio, setScrollMode, type ScrollMode } from "./scroll-mode";

/**
 * The tween that drives the pinned track sideways. Scroll-linked animations
 * inside the track pass it to ScrollTrigger as `containerAnimation`.
 * `undefined` outside a track, `null` while the track is not horizontal.
 */
export const ContainerAnimationContext = createContext<gsap.core.Tween | null | undefined>(undefined);

/** The mode the surrounding track settled on; `null` until it has measured. */
export const TrackModeContext = createContext<ScrollMode | null>("vertical");

export function useTrackMode(): ScrollMode | null {
  return useContext(TrackModeContext);
}

let horizontalTween: gsap.core.Tween | null = null;
const tweenListeners = new Set<(tween: gsap.core.Tween | null) => void>();

function publishTween(tween: gsap.core.Tween | null) {
  horizontalTween = tween;
  tweenListeners.forEach((listener) => listener(tween));
}

/** The live horizontal tween, for code outside the React tree (the typewriter). */
export function getHorizontalTween(): gsap.core.Tween | null {
  return horizontalTween;
}

export function subscribeHorizontalTween(listener: (tween: gsap.core.Tween | null) => void): () => void {
  tweenListeners.add(listener);
  return () => {
    tweenListeners.delete(listener);
  };
}

/** True when every `[data-fit]` block fits the viewport in the horizontal layout. */
function contentFits(pin: HTMLElement): boolean {
  const root = document.documentElement;
  const previous = root.dataset.scroll;
  root.dataset.scroll = "horizontal";
  try {
    const blocks = pin.querySelectorAll<HTMLElement>("[data-fit]");
    if (!blocks.length) return true;
    const limit = window.innerHeight * getFitRatio();
    for (const block of blocks) if (block.getBoundingClientRect().height > limit) return false;
    return true;
  } finally {
    if (previous) root.dataset.scroll = previous;
    else delete root.dataset.scroll;
  }
}

/**
 * Pins `pinRef` and translates `trackRef` by the overflow of its children.
 *
 * The distance is re-measured whenever the track, a panel, an image or the
 * fonts change size, and the page drops back to the vertical layout when a
 * panel no longer fits the viewport.
 */
export function useHorizontalScroll(
  pinRef: RefObject<HTMLElement | null>,
  trackRef: RefObject<HTMLElement | null>,
  setTween: (tween: gsap.core.Tween | null) => void,
  setMode: (mode: ScrollMode) => void,
) {
  useGSAP(
    () => {
      const pin = pinRef.current;
      const track = trackRef.current;
      if (!pin || !track) return;
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();

      let tween: gsap.core.Tween | null = null;
      let distance = -1;
      let scheduled = 0;
      let settle = 0;
      let measuring = false;
      let pending = false;

      const teardown = () => {
        tween?.scrollTrigger?.kill();
        tween?.kill();
        tween = null;
        distance = -1;
        setTween(null);
        publishTween(null);
        pin.style.removeProperty("--horizontal-distance");
        gsap.set(track, { clearProps: "transform" });
      };

      const overflow = () => {
        const first = track.firstElementChild;
        const last = track.lastElementChild;
        if (!first || !last) return 0;
        const left = first.getBoundingClientRect().left;
        return Math.max(0, Math.ceil(last.getBoundingClientRect().right - left - pin.clientWidth));
      };

      const applyDistance = () => {
        distance = overflow();
        pin.style.setProperty("--horizontal-distance", `${distance}px`);
      };

      const schedule = () => {
        if (measuring) {
          pending = true;
          return;
        }
        cancelAnimationFrame(scheduled);
        scheduled = requestAnimationFrame(measure);
      };

      const update = () => {
        const next: ScrollMode = contentFits(pin) ? "horizontal" : "vertical";
        const changed = document.documentElement.dataset.scroll !== next;
        setScrollMode(next);
        if (changed) setMode(next);
        if (next === "vertical") {
          if (tween) {
            teardown();
            ScrollTrigger.refresh();
          }
          return;
        }
        const measured = overflow();
        if (!tween) {
          distance = measured;
          pin.style.setProperty("--horizontal-distance", `${distance}px`);
          tween = gsap.to(track, {
            x: () => -distance,
            ease: "none",
            force3D: true,
            scrollTrigger: {
              trigger: pin,
              start: "top top",
              end: "bottom bottom",
              scrub: true,
              invalidateOnRefresh: true,
              onRefreshInit: applyDistance,
            },
          });
          setTween(tween);
          publishTween(tween);
          return;
        }
        if (Math.abs(measured - distance) <= 1) return;
        distance = measured;
        pin.style.setProperty("--horizontal-distance", `${distance}px`);
        ScrollTrigger.refresh();
      };

      const measure = () => {
        measuring = true;
        update();
        cancelAnimationFrame(settle);
        settle = requestAnimationFrame(() => {
          measuring = false;
          if (pending) {
            pending = false;
            schedule();
          }
        });
      };

      mm.add(HORIZONTAL_QUERY, () => {
        const observer = new ResizeObserver(() => schedule());
        const observe = (element: Element) => observer.observe(element);
        observe(track);
        Array.from(track.children).forEach(observe);
        pin.querySelectorAll("[data-fit]").forEach(observe);

        const onResize = () => schedule();
        let alive = true;
        const onAssetReady = () => {
          if (alive) schedule();
        };
        const images = Array.from(track.querySelectorAll("img"));
        images.forEach((image) => {
          if (image.complete) return;
          image.addEventListener("load", onAssetReady);
          image.addEventListener("error", onAssetReady);
        });
        window.addEventListener("resize", onResize);
        if (document.readyState === "complete") onAssetReady();
        else window.addEventListener("load", onAssetReady);
        document.fonts?.ready.then(onAssetReady);
        measure();

        return () => {
          alive = false;
          cancelAnimationFrame(scheduled);
          cancelAnimationFrame(settle);
          observer.disconnect();
          window.removeEventListener("resize", onResize);
          window.removeEventListener("load", onAssetReady);
          images.forEach((image) => {
            image.removeEventListener("load", onAssetReady);
            image.removeEventListener("error", onAssetReady);
          });
          const hadTween = !!tween;
          teardown();
          setScrollMode("vertical");
          setMode("vertical");
          if (hadTween) ScrollTrigger.refresh();
        };
      });

      if (!window.matchMedia(HORIZONTAL_QUERY).matches) {
        setScrollMode("vertical");
        setMode("vertical");
      }
      return () => mm.revert();
    },
    { scope: pinRef },
  );
}

/* Scene anchors: the intro columns and the progress bar jump to a scene. */

const sceneAnchors = new Map<string, () => number | null>();

export function registerSceneAnchor(id: string, resolve: () => number | null): () => void {
  sceneAnchors.set(id, resolve);
  return () => {
    if (sceneAnchors.get(id) === resolve) sceneAnchors.delete(id);
  };
}

export function scrollToScene(id: string, lenis?: Lenis | null): void {
  const top = sceneAnchors.get(id)?.();
  if (top == null) return;
  if (lenis) {
    lenis.scrollTo(top, { duration: 1, force: true });
    return;
  }
  window.scrollTo({ top, behavior: "smooth" });
}
