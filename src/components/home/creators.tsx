"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useContext, useRef } from "react";

import { Button } from "@/components/ui/button";
import { ContainerAnimationContext } from "./horizontal";
import { Scene, type SceneTitleWord } from "./scene";

import styles from "./creators.module.css";

const TITLE: SceneTitleWord[] = [
  { text: "Create", from: 0, to: -35 },
  { text: "Your Own", from: -10, to: 10, front: true },
  { text: "Server", from: 20, to: 0 },
];

const FEATURES = [
  {
    title: ["Your Own", "Dedicated Server"],
    description: "A persistent world you operate, on your hardware or a rented machine.",
    from: 0,
    to: 40,
  },
  {
    title: ["Your Rules,", "Your Community"],
    description: "Whitelists, moderation, staff, identity. Your server page is your front door.",
    from: 0,
    to: 20,
  },
  {
    title: ["Custom", "Gameplay"],
    description: "Build anything from a strict roleplay city to a racing league to a game mode nobody has seen yet.",
    from: 0,
    to: 0,
  },
];

export function Creators() {
  const listRef = useRef<HTMLUListElement>(null);
  const containerAnimation = useContext(ContainerAnimationContext);

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
      title={TITLE}
      description="Run a dedicated server that stays online for your community, with your rules, your mods, and gameplay you design. Everyone with Alpha access can download it and start building now. No separate developer application."
      background={{ src: "/home/img/creators-bg.webp", alt: "Creators", width: 2524, height: 1176 }}
      character={{ src: "/home/img/creators-character.webp", alt: "Creators", width: 1261, height: 1253 }}
      buttons={
        <>
          <Button color="blue" lines="left" href="/host">
            Download server
          </Button>
          <Button color="blue" lines="none" border href="/docs/host-a-server">
            Hosting guide
          </Button>
        </>
      }
    >
      <div className={styles.content}>
        <ul ref={listRef} className={styles.list}>
          {FEATURES.map((feature) => (
            <li
              key={feature.title.join("-")}
              className={styles.item}
              data-item
              data-from={feature.from}
              data-to={feature.to}
            >
              <h3 className={styles.title}>
                {feature.title.map((line) => (
                  <span key={line} data-typewrite="0.05">
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
            alt="Dedicated server"
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
