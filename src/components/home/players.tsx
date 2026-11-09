"use client";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Marquee } from "@/components/ui/marquee";
import { useMessages } from "@/i18n/client";
import { Scene, sceneTitle } from "./scene";

import styles from "./players.module.css";

const CARD_IMAGES = ["/home/img/server-roleplay.webp", "/home/img/server-custom-worlds.webp", "/home/img/server-racing.webp"];

/** Motion of the three title words, from the design. */
const TITLE_MOTION = [
  { from: 0, to: 25 },
  { from: 10, to: -10 },
  { from: -10, to: 10 },
];

export function Players() {
  const m = useMessages("home").players;
  const cards = m.cards.map((card, index) => ({ ...card, image: CARD_IMAGES[index] ?? CARD_IMAGES[0]! }));
  return (
    <Scene
      id="players"
      runway
      tone="yellow"
      title={sceneTitle(m.title, m.titleFront, TITLE_MOTION)}
      description={m.description}
      background={{ src: "/home/img/players-bg.webp", alt: m.backgroundAlt, width: 2516, height: 1176 }}
      character={{ src: "/home/img/players-character.webp", alt: m.characterAlt, width: 1202, height: 1818 }}
      buttons={
        <>
          <Button lines="left" href="/download">
            {m.download}
          </Button>
          <Button lines="none" border href="/servers">
            {m.browser}
          </Button>
        </>
      }
    >
      <div className={styles.content} data-fit>
        <div className={styles.list}>
          {cards.map((card) => {
            const title = card.title.join(" ");
            return (
              <div key={title} className={styles.card}>
                <span className={styles.slant} aria-hidden="true" />
                <div>
                  <div className={styles.sub}>{card.sub}</div>
                  <div className={styles.title}>
                    {card.title.map((word, wordIndex) => (
                      <span key={`${word}-${wordIndex}`} data-typewrite="0.05">
                        {word}
                      </span>
                    ))}
                    <div className={styles.marquee}>
                      <Marquee pauseOnHover={false}>
                        <>{title}&nbsp;</>
                      </Marquee>
                    </div>
                  </div>
                  <div className={styles.description}>{card.description}</div>
                  <div className={styles.bg}>
                    <Image src={card.image} alt={title} width={1036} height={604} quality={100} draggable={false} />
                  </div>
                </div>
              </div>
            );
          })}
          <div className={styles.border} />
          <div className={styles.border2} />
          <Button lines="both" className={styles.download} href="/download">
            {m.download}
          </Button>
        </div>
      </div>
    </Scene>
  );
}
