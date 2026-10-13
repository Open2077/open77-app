"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ReactLenis, useLenis, type LenisRef } from "lenis/react";
import { useEffect, useRef, type ReactNode } from "react";

import { prefersReducedMotion } from "@/components/ui/device";
import { getHorizontalTween, subscribeHorizontalTween } from "./horizontal";
import { isHorizontalScroll } from "./scroll-mode";

import mainStyles from "./main.module.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Smooth scrolling. Lenis is stepped from GSAP's ticker, ahead of the GSAP
 * update, so scroll position and scroll-linked tweens move in the same frame.
 */
function SmoothScroll() {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const step = (time: number) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(step, false, true);
    gsap.ticker.lagSmoothing(0);
    return () => gsap.ticker.remove(step);
  }, []);

  return (
    <ReactLenis
      ref={lenisRef}
      root
      options={{
        lerp: 0.3,
        anchors: true,
        syncTouch: false,
        smoothWheel: true,
        gestureOrientation: "vertical",
        orientation: "vertical",
        stopInertiaOnNavigate: true,
        autoResize: true,
        autoRaf: false,
      }}
    />
  );
}

/** ScrollTrigger defaults, plus a refresh once fonts and images have settled. */
function ScrollTriggerSetup() {
  useGSAP(() => {
    ScrollTrigger.config({ ignoreMobileResize: true, limitCallbacks: true });
    ScrollTrigger.clearScrollMemory("manual");
  }, []);

  const lenis = useLenis();
  useEffect(() => {
    if (!lenis) return;
    let alive = true;
    let timer = 0;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!alive) return;
        if (lenis.isScrolling) {
          refresh();
          return;
        }
        ScrollTrigger.refresh();
      }, 200);
    };
    refresh();
    window.addEventListener("load", refresh);
    document.fonts?.ready.then(refresh);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.removeEventListener("load", refresh);
    };
  }, [lenis]);

  return null;
}

function revealUpTo(letters: HTMLElement[], count: number) {
  letters.forEach((letter, index) => {
    letter.style.visibility = index < count ? "" : "hidden";
  });
}

/** Splits a `[data-typewrite]` element into hidden letters and returns the reveal tween. */
function prepareTypewriter(element: HTMLElement): gsap.core.Tween | null {
  const text = element.textContent ?? "";
  if (!text.trim()) return null;
  const letters: HTMLElement[] = [];
  element.replaceChildren();
  text.split(/(\s+)/).forEach((part) => {
    if (!part) return;
    if (/^\s+$/.test(part)) {
      element.append(document.createTextNode(part));
      return;
    }
    const word = document.createElement("span");
    word.style.whiteSpace = "nowrap";
    Array.from(part).forEach((character) => {
      const letter = document.createElement("span");
      letter.textContent = character;
      letter.style.visibility = "hidden";
      word.append(letter);
      letters.push(letter);
    });
    element.append(word);
  });
  if (!letters.length) return null;
  element.setAttribute("aria-label", text);
  const speed = Number(element.dataset.typewrite);
  const state = { count: 0 };
  return gsap.to(state, {
    count: letters.length,
    duration: Math.max(letters.length * (!Number.isFinite(speed) || speed <= 0 ? 0.07 : speed), 0.2),
    ease: "none",
    snap: { count: 1 },
    paused: true,
    onStart: () => revealUpTo(letters, state.count),
    onUpdate: () => revealUpTo(letters, state.count),
    onComplete: () => {
      element.textContent = text;
      element.removeAttribute("aria-label");
    },
  });
}

/**
 * Types out every `[data-typewrite]` element the first time it scrolls into
 * view. Elements inside the pinned track trigger against the horizontal tween.
 */
function Typewriter() {
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const elements = gsap.utils.toArray<HTMLElement>("[data-typewrite]");
    if (!elements.length) return;
    const tweens = new Map<HTMLElement, gsap.core.Tween>();
    const staticTriggers: ScrollTrigger[] = [];
    let trackTriggers: ScrollTrigger[] = [];
    let alive = true;
    let unsubscribe = () => {};

    const play = (element: HTMLElement) => {
      const tween = tweens.get(element);
      if (tween && tween.progress() <= 0) tween.play();
    };

    const setup = () => {
      if (!alive) return;
      const inTrack: HTMLElement[] = [];
      const outside: HTMLElement[] = [];
      elements.forEach((element) => {
        const tween = prepareTypewriter(element);
        if (!tween) return;
        tweens.set(element, tween);
        (element.closest("[data-pin]") ? inTrack : outside).push(element);
      });
      outside.forEach((element) => {
        staticTriggers.push(
          ScrollTrigger.create({
            trigger: element,
            start: "top 90%",
            once: true,
            invalidateOnRefresh: true,
            onEnter: () => play(element),
          }),
        );
      });
      const bindTrack = (tween: gsap.core.Tween | null) => {
        trackTriggers.forEach((trigger) => trigger.kill());
        trackTriggers = [];
        if (!alive || !inTrack.length) return;
        const horizontal = isHorizontalScroll();
        if (horizontal && !tween) return;
        inTrack.forEach((element) => {
          trackTriggers.push(
            ScrollTrigger.create({
              trigger: element,
              start: horizontal ? "left 90%" : "top 90%",
              once: true,
              invalidateOnRefresh: true,
              ...(horizontal && tween ? { containerAnimation: tween } : {}),
              onEnter: () => play(element),
            }),
          );
        });
      };
      if (inTrack.length) {
        unsubscribe = subscribeHorizontalTween(bindTrack);
        bindTrack(getHorizontalTween());
      }
    };

    const fontsReady = document.fonts?.ready;
    if (fontsReady) fontsReady.then(setup);
    else setup();
    return () => {
      alive = false;
      unsubscribe();
      staticTriggers.forEach((trigger) => trigger.kill());
      trackTriggers.forEach((trigger) => trigger.kill());
      tweens.forEach((tween) => tween.kill());
    };
  });
  return null;
}

/** `--vw`, `--dvh`, `--svh` and `--lvh` in pixels, for sizes CSS units get wrong on mobile. */
function ViewportUnits() {
  useEffect(() => {
    const update = () => {
      const root = document.documentElement;
      root.style.setProperty("--vw", `${window.innerWidth * 0.01}px`);
      root.style.setProperty("--dvh", `${window.innerHeight * 0.01}px`);
      root.style.setProperty("--svh", `${root.clientHeight * 0.01}px`);
      root.style.setProperty("--lvh", "1vh");
    };
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  return null;
}

function GsapSetup() {
  useGSAP(() => {
    gsap.defaults({ ease: "none" });
  }, []);
  return (
    <>
      <Typewriter />
      <ScrollTriggerSetup />
    </>
  );
}

/**
 * The home page marks <html> while mounted (scroll mode, active tone). Leaving it
 * by client navigation must not carry that state to the next page; the reset
 * waits a frame so it runs after every other cleanup of the page.
 */
function ResetDocumentOnLeave() {
  useEffect(
    () => () => {
      requestAnimationFrame(() => {
        if (window.location.pathname === "/") return;
        const root = document.documentElement;
        delete root.dataset.scroll;
        delete root.dataset.activeTone;
      });
    },
    [],
  );
  return null;
}

/** Smooth scrolling, scroll-linked typing and viewport units around the home page content. */
export function HomeShell({ children }: { children: ReactNode }) {
  return (
    <>
      <GsapSetup />
      <SmoothScroll />
      <main className={mainStyles.main}>{children}</main>
      <ViewportUnits />
      <ResetDocumentOnLeave />
    </>
  );
}
