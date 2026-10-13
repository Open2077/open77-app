"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

import { BackgroundHostContext } from "./background";
import { cx } from "@/components/ui/cx";
import { GlitchFrame } from "@/components/ui/glitch-frame";
import { ContainerAnimationContext, useTrackMode } from "./horizontal";
import { SCENE_BG_GROUP, useParallax } from "./parallax";
import { DESKTOP_QUERY, useIsVerticalScroll } from "./scroll-mode";

import backgroundStyles from "./background.module.css";
import styles from "./scene.module.css";

export type SceneTone = "yellow" | "blue" | "red";

export type SceneTitleWord = {
  text: string;
  /** Start and end offset of the word while the scene crosses the viewport, in percent. */
  from: number;
  to: number;
  /** Drawn above the character art. */
  front?: boolean;
};

export type SceneImage = { src: string; alt: string; width: number; height: number };

/*
 * Active tone. Whichever scene most recently crossed the middle of the viewport
 * sets `<html data-active-tone>`, which recolours the logo slashes, and the
 * browser theme colour follows it.
 */

const activeScenes = new Map<string, { tone: SceneTone; start: number }>();
let toneSuspended = false;

/** Resolves any CSS colour to `#rrggbb`, which is what `theme-color` accepts everywhere. */
function toHex(color: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return color;
  context.fillStyle = "#010203";
  context.fillStyle = color;
  if (context.fillStyle === "#010203") return color;
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function applyTone() {
  let latest: { tone: SceneTone; start: number } | undefined;
  if (!toneSuspended) for (const scene of activeScenes.values()) if (!latest || scene.start >= latest.start) latest = scene;
  const root = document.documentElement;
  if (latest) root.dataset.activeTone = latest.tone;
  else delete root.dataset.activeTone;

  const probe = document.createElement("span");
  probe.style.color = "var(--active-color)";
  root.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  const hex = toHex(color);
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.append(meta);
  }
  if (meta.content !== hex) meta.content = hex;
}

/** The footer hands the tone back to the default colour while it is in view. */
export function setSceneToneSuspended(suspended: boolean): void {
  if (toneSuspended === suspended) return;
  toneSuspended = suspended;
  applyTone();
}

function withinRange(trigger: ScrollTrigger | undefined | null): boolean {
  if (!trigger) return true;
  const scroll = trigger.scroll();
  return scroll >= trigger.start && scroll < trigger.end;
}

/** Content-box width of an element, kept current with a ResizeObserver. */
function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const box = entry.contentBoxSize;
      setWidth(box ? box.reduce((total, size) => total + size.inlineSize, 0) : entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

type SceneProps = {
  id: string;
  title: SceneTitleWord[];
  description: ReactNode;
  background: SceneImage & { className?: string };
  character: SceneImage;
  tone?: SceneTone;
  side?: "left" | "right";
  /** Leaves a viewport of empty track before the scene, for the intro to hand over. */
  runway?: boolean;
  buttons?: ReactNode;
  characterGlitch?: boolean;
  children?: ReactNode;
};

/** One audience panel of the horizontal track. */
export function Scene({
  id,
  title,
  description,
  background,
  character,
  tone = "yellow",
  side = "right",
  runway = false,
  buttons,
  characterGlitch = true,
  children,
}: SceneProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const runwayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const characterImageRef = useRef<HTMLImageElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const moverRef = useRef<HTMLDivElement>(null);
  const bgWrapperRef = useRef<HTMLDivElement>(null);
  const bgScrollRef = useRef<HTMLDivElement>(null);
  const bgMoverRef = useRef<HTMLDivElement>(null);
  const shadowFillRef = useRef<HTMLDivElement>(null);
  const host = useContext(BackgroundHostContext);
  const containerAnimation = useContext(ContainerAnimationContext);
  const mode = useTrackMode();
  const titleKey = title.map((word) => `${word.from}:${word.to}`).join("|");
  const characterWidth = useElementWidth(characterImageRef);
  const vertical = useIsVerticalScroll();

  useParallax(
    [{ ref: characterRef }, { ref: vertical ? bgMoverRef : moverRef, depth: -2, group: SCENE_BG_GROUP }],
    [host, containerAnimation, vertical],
  );

  // Stacked layout: the inline background drifts against the scroll.
  useGSAP(
    () => {
      const wrapper = bgWrapperRef.current;
      const scroller = bgScrollRef.current;
      if (!wrapper || !scroller || mode !== "vertical") return;
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();
      mm.add(DESKTOP_QUERY, () => {
        gsap.fromTo(
          scroller,
          { yPercent: -15 },
          {
            yPercent: 15,
            ease: "none",
            force3D: true,
            scrollTrigger: { trigger: wrapper, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
          },
        );
      });
      return () => mm.revert();
    },
    { dependencies: [mode] },
  );

  // Title words, background slide and greyscale, shadow, and the layer hand-over.
  useGSAP(
    () => {
      const section = sectionRef.current;
      const container = containerRef.current;
      const heading = titleRef.current;
      const layer = layerRef.current;
      const mover = moverRef.current;
      const shadowFill = shadowFillRef.current;
      const runwaySpacer = runwayRef.current;
      if (!section || !container || !heading || !layer || !mover || !shadowFill || !mode) return;
      if (mode === "horizontal" && !containerAnimation) return;
      gsap.registerPlugin(ScrollTrigger);
      const words = gsap.utils.toArray<HTMLElement>(":scope > span", heading);

      if (mode === "vertical") {
        words.forEach((word) => {
          const from = Number(word.dataset.from);
          const to = Number(word.dataset.to);
          if (Number.isNaN(from) || Number.isNaN(to)) return;
          gsap.fromTo(
            word,
            { yPercent: from },
            {
              yPercent: to,
              ease: "none",
              force3D: true,
              scrollTrigger: { trigger: container, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
            },
          );
        });
        return;
      }
      if (!containerAnimation) return;

      words.forEach((word) => {
        const from = Number(word.dataset.from);
        const to = Number(word.dataset.to);
        if (Number.isNaN(from) || Number.isNaN(to)) return;
        gsap.fromTo(
          word,
          { xPercent: from },
          {
            xPercent: to,
            ease: "none",
            force3D: true,
            scrollTrigger: {
              trigger: container,
              containerAnimation,
              start: "left right",
              end: "right left",
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      });

      const next = section.nextElementSibling;
      const hasNext = next instanceof HTMLElement && !!next.dataset.scene;
      gsap.fromTo(
        mover,
        { xPercent: 0 },
        {
          xPercent: -20,
          ease: "none",
          force3D: true,
          scrollTrigger: {
            containerAnimation,
            trigger: runwaySpacer ?? container,
            endTrigger: hasNext ? next : container,
            start: runwaySpacer ? "left left" : "left right",
            end: hasNext ? "left 50%" : "right left",
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
      gsap.fromTo(
        mover,
        { "--grayscale": 0 },
        {
          "--grayscale": 1,
          ease: "none",
          scrollTrigger: {
            trigger: container,
            containerAnimation,
            start: "right right",
            end: "right left",
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
      gsap.set(layer, { autoAlpha: 0 });
      gsap.set(shadowFill, { autoAlpha: 0 });

      const showLayer = (visible: boolean) => {
        gsap.to(layer, {
          autoAlpha: Number(visible),
          duration: visible ? 0.45 : 0.3,
          overwrite: "auto",
          ease: "sine.out",
        });
        const shadow = layer.previousElementSibling?.querySelector("[data-shadow]");
        if (shadow) gsap.to(shadow, { autoAlpha: Number(!visible), duration: 0.3, overwrite: "auto", ease: "sine.out" });
      };
      const visibility = ScrollTrigger.create({
        trigger: section,
        containerAnimation,
        start: "left 50%",
        end: "right left",
        invalidateOnRefresh: true,
        onToggle: (self) => {
          if (withinRange(containerAnimation.scrollTrigger)) showLayer(self.isActive);
        },
      });
      const pin = section.closest("[data-pin]");
      if (pin) {
        ScrollTrigger.create({
          trigger: pin,
          start: "top top",
          end: "bottom bottom",
          invalidateOnRefresh: true,
          onEnter: () => showLayer(visibility.isActive),
          onEnterBack: () => showLayer(visibility.isActive),
          onLeaveBack: () => showLayer(false),
        });
      }
      gsap.to(shadowFill, {
        autoAlpha: 0.85,
        ease: "none",
        force3D: true,
        scrollTrigger: {
          trigger: container,
          endTrigger: section,
          containerAnimation,
          start: "left left",
          end: "right 50%",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    },
    { dependencies: [containerAnimation, host, titleKey, runway, mode] },
  );

  // Claims the active tone while this scene holds the middle of the viewport.
  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section || !mode || (mode === "horizontal" && !containerAnimation)) return;
      gsap.registerPlugin(ScrollTrigger);
      const track = mode === "horizontal" ? containerAnimation : null;
      let alive = true;
      const sync = (self: ScrollTrigger, pinTrigger?: ScrollTrigger) => {
        if (!alive) return;
        const range = pinTrigger ?? track?.scrollTrigger;
        if (self.isActive && withinRange(range)) activeScenes.set(id, { tone, start: self.start });
        else activeScenes.delete(id);
        applyTone();
      };
      const trigger = ScrollTrigger.create({
        trigger: section,
        ...(track ? { containerAnimation: track } : {}),
        start: track ? "left 50%" : "top 50%",
        end: track ? "right left" : "bottom top",
        invalidateOnRefresh: true,
        onToggle: (self) => sync(self),
        onRefresh: (self) => sync(self),
      });
      const pin = section.closest("[data-pin]");
      if (track && pin) {
        ScrollTrigger.create({
          trigger: pin,
          start: "top top",
          end: "bottom bottom",
          invalidateOnRefresh: true,
          onToggle: (self) => sync(trigger, self),
          onRefresh: (self) => sync(trigger, self),
        });
      }
      return () => {
        alive = false;
        activeScenes.delete(id);
        applyTone();
      };
    },
    { dependencies: [containerAnimation, id, tone, mode], revertOnUpdate: true },
  );

  const layer = (
    <div ref={layerRef} className={cx(backgroundStyles.layer, background.className)} data-scene={id}>
      <div ref={moverRef} className={backgroundStyles.mover} data-bg={id}>
        <Image
          src={background.src}
          alt={background.alt}
          width={background.width}
          height={background.height}
          quality={100}
          decoding="async"
          draggable={false}
        />
      </div>
      <div className={styles.shadow} data-shadow aria-hidden="true">
        <div ref={shadowFillRef} className={styles.shadowFill} />
      </div>
    </div>
  );

  const characterImage = (
    <Image
      ref={characterImageRef}
      src={character.src}
      alt={character.alt}
      width={character.width}
      height={character.height}
      quality={100}
      draggable={false}
    />
  );

  return (
    <section
      ref={sectionRef}
      className={cx(styles.scene, runway && styles.runway)}
      data-scene={id}
      data-selection={tone}
      style={{ "--tone": `var(--${tone})`, "--width-character": `${characterWidth}px` } as CSSProperties}
    >
      {runway && <div ref={runwayRef} className={styles.runwaySpacer} data-runway aria-hidden="true" />}
      <div ref={containerRef} className={cx(styles.container, side === "left" && styles.left)}>
        <div className={styles.content}>
          <h2 ref={titleRef} className={styles.title}>
            {title.map((word) => (
              <span
                key={word.text}
                className={cx(word.front && styles.front)}
                data-glitch={word.text}
                data-from={word.from}
                data-to={word.to}
              >
                {word.text}
              </span>
            ))}
          </h2>
          <p className={styles.description}>{description}</p>
          {buttons && <div className={styles.button}>{buttons}</div>}
        </div>
        <div className={styles.characters} style={{ "--width-character": `${characterWidth}px` } as CSSProperties}>
          <div
            ref={characterRef}
            className={styles.character}
            style={{ aspectRatio: `${character.width} / ${character.height}` }}
          >
            {characterGlitch ? <GlitchFrame>{characterImage}</GlitchFrame> : characterImage}
          </div>
        </div>
      </div>
      {children}
      {vertical && (
        <div ref={bgWrapperRef} className={styles.bgWrapper}>
          <div className={styles.bg}>
            <div ref={bgScrollRef} className={styles.bgScroll}>
              <div ref={bgMoverRef} className={styles.bgMover}>
                <Image
                  src={background.src}
                  alt={background.alt}
                  width={background.width}
                  height={background.height}
                  quality={100}
                  decoding="async"
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {!vertical && host && createPortal(layer, host)}
    </section>
  );
}
