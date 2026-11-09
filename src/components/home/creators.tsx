"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useContext, useRef } from "react";

import { Button } from "@/components/ui/button";
import { ContainerAnimationContext } from "./horizontal";
import { useMessages } from "@/i18n/client";
import { Scene, sceneTitle } from "./scene";

import styles from "./creators.module.css";

/** Motion of the title words and of the three feature cards, from the design. */
const TITLE_MOTION = [
  { from: 0, to: -35 },
  { from: -10, to: 10 },
  { from: 20, to: 0 },
];
const FEATURE_MOTION = [
  { from: 0, to: 40 },
  { from: 0, to: 20 },
  { from: 0, to: 0 },
];

export function Creators() {
  const listRef = useRef<HTMLUListElement>(null);
  const containerAnimation = useContext(ContainerAnimationContext);
  const m = useMessages("home").creators;
  const features = m.features.map((feature, index) => ({ ...feature, ...(FEATURE_MOTION[index] ?? { from: 0, to: 0 }) }));

  useGSAP(
    () => {
      const list = listRef.current;
      if (!list || !containerAnimation) return;
      gsap.registerPlugin(ScrollTrigger);
      gsap.utils.toArray<HTMLElement>("[data-item]", list).forEach((item) => {
        const from = Number(item.dataset.from);
        const to = Number(item.dataset.to);
        if (Number.isNaN(from) || Number.isNaN(to)) return;
        gsap.fromTo(
          item,
          { xPercent: from },
          {
            xPercent: to,
            ease: "none",
            force3D: true,
            scrollTrigger: {
              trigger: item,
              containerAnimation,
              start: "left right",
              end: "right left",
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      });
    },
    { dependencies: [containerAnimation], revertOnUpdate: true },
  );

  return (
    <Scene
      id="creators"
      tone="blue"
      title={sceneTitle(m.title, m.titleFront, TITLE_MOTION)}
      description={m.description}
      background={{ src: "/home/img/creators-bg.webp", alt: m.backgroundAlt, width: 2524, height: 1176 }}
      character={{ src: "/home/img/creators-character.webp", alt: m.characterAlt, width: 1261, height: 1253 }}
      buttons={
        <>
          <Button color="blue" lines="left" href="/host">
            {m.download}
          </Button>
          <Button color="blue" lines="none" border href="/docs/host-a-server">
            {m.guide}
          </Button>
        </>
      }
    >
      <div className={styles.content}>
        <ul ref={listRef} className={styles.list}>
          {features.map((feature) => (
            <li
              key={feature.title.join("-")}
              className={styles.item}
              data-item
              data-from={feature.from}
              data-to={feature.to}
            >
              <h3 className={styles.title}>
                {feature.title.map((line, lineIndex) => (
                  <span key={`${line}-${lineIndex}`} data-typewrite="0.05">
                    {line}
                  </span>
                ))}
              </h3>
              <p className={styles.description}>{feature.description}</p>
            </li>
          ))}
        </ul>
        <div className={styles.server}>
          <Image
            src="/home/img/server-creators.webp"
            alt={m.serverAlt}
            width={1827}
            height={1423}
            quality={100}
            draggable={false}
          />
        </div>
      </div>
    </Scene>
  );
}
