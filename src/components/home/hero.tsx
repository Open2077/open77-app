"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { GlitchFrame } from "@/components/ui/glitch-frame";
import { Marquee } from "@/components/ui/marquee";
import { useParallax } from "./parallax";
import { DESKTOP_QUERY, useIsVerticalScroll } from "./scroll-mode";
import { Video } from "@/components/ui/video";
import { useMessages } from "@/i18n/client";
import { rich } from "@/i18n/format";

import characterStyles from "./hero-character.module.css";
import styles from "./hero.module.css";

function HeroCharacter({
  src,
  alt,
  width,
  height,
  side,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  side: "left" | "right";
}) {
  return (
    <div className={cx(characterStyles.character, characterStyles[side])} data-render={side}>
      <GlitchFrame>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          quality={100}
          draggable={false}
        />
      </GlitchFrame>
    </div>
  );
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const renderRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const vertical = useIsVerticalScroll();
  const home = useMessages("home");
  const m = home.hero;

  useParallax([{ ref: renderRef }, { ref: logoRef, depth: 3 }, { ref: backgroundRef, depth: -2 }]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const scroller = scrollRef.current;
      if (!vertical || !section || !scroller) return;
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();
      mm.add(DESKTOP_QUERY, () => {
        gsap.fromTo(
          scroller,
          { yPercent: 0 },
          {
            yPercent: 15,
            ease: "none",
            force3D: true,
            scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true, invalidateOnRefresh: true },
          },
        );
      });
      return () => mm.revert();
    },
    { dependencies: [vertical] },
  );

  return (
    <section ref={sectionRef} className={styles.hero} data-hero>
      {/* The design sets no visible page title; screen readers and search engines still get one. */}
      <h1 className="sr-only">{home.heading}</h1>
      <div className={styles.wrapper}>
        <div className={styles.content}>
          <Marquee pauseOnHover={false} className={styles.marquee} data-marquee>
            <>
              <div className={styles.glitch} data-glitch={m.marquee}>
                {m.marquee}
              </div>
              &nbsp;
            </>
          </Marquee>
          <Image
            ref={logoRef}
            src="/home/img/cyberpunk-logo.svg"
            alt="Cyberpunk 2077"
            width={918}
            height={225}
            draggable={false}
            unoptimized
            loading="eager"
            className={styles.logo}
          />
          <div className={styles.text}>
            <p className={styles.intro}>{rich(m.intro, { strong: (chunk) => <strong>{chunk}</strong> })} </p>
            <p className={styles.alpha}>{m.alpha}</p>
          </div>
        </div>
        <div ref={renderRef} className={styles.render}>
          <HeroCharacter side="left" src="/home/img/hero-v-left.webp" alt={m.altLeft} width={1092} height={1251} />
          <HeroCharacter side="right" src="/home/img/hero-v-right.webp" alt={m.altRight} width={1784} height={2048} />
        </div>
      </div>
      <div className={styles.buttons}>
        <Button className={cx(styles.button, styles.buttonLeft)} href="/download">
          {m.download}
        </Button>
        <Button className={cx(styles.button, styles.buttonRight)} color="red" lines="left" href="/create">
          {m.build}
        </Button>
      </div>
      <div className={styles.bgWrapper}>
        <div ref={scrollRef} className={styles.bgScroll}>
          <div ref={backgroundRef} className={styles.bg}>
            <div className={styles.shift} data-video-shift>
              <Video id="hero" autoPlay priority />
            </div>
          </div>
        </div>
      </div>
      <div className={styles.cache} data-cache />
    </section>
  );
}
