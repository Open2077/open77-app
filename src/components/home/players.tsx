import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Marquee } from "@/components/ui/marquee";
import { Scene } from "./scene";

import styles from "./players.module.css";

const CARDS = [
  {
    sub: "Roleplay",
    title: ["Live", "Another", "Life"],
    description: "Strict roleplay cities with their own economies, factions, jobs and staff.",
    image: "/home/img/server-roleplay.webp",
  },
  {
    sub: "Custom Worlds",
    title: ["Rewrite", "the", "Rules"],
    description: "PVP, Survival, Freeroam, or a game mode nobody has seen yet.",
    image: "/home/img/server-custom-worlds.webp",
  },
  {
    sub: "Racing",
    title: ["Own", "the", "Streets"],
    description: "Racing leagues, late-night meets and a city full of open roads.",
    image: "/home/img/server-racing.webp",
  },
];

export function Players() {
  return (
    <Scene
      id="players"
      runway
      tone="yellow"
      title={[
        { text: "Play", from: 0, to: 25 },
        { text: "Cyberpunk", from: 10, to: -10, front: true },
        { text: "Together", from: -10, to: 10 },
      ]}
      description="Community servers turn Night City into multiplayer worlds, each with its own rules and its own experience. OPEN//77 is the layer that makes them possible."
      background={{ src: "/home/img/players-bg.webp", alt: "Players", width: 2516, height: 1176 }}
      character={{ src: "/home/img/players-character.webp", alt: "Players", width: 1202, height: 1818 }}
      buttons={
        <>
          <Button lines="left" href="/download">
            Download launcher
          </Button>
          <Button lines="none" border href="/servers">
            Server browser
          </Button>
        </>
      }
    >
      <div className={styles.content} data-fit>
        <div className={styles.list}>
          {CARDS.map((card) => {
            const title = card.title.join(" ");
            return (
              <div key={title} className={styles.card}>
                <span className={styles.slant} aria-hidden="true" />
                <div>
                  <div className={styles.sub}>{card.sub}</div>
                  <div className={styles.title}>
                    {card.title.map((word) => (
                      <span key={word} data-typewrite="0.05">
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
            Download launcher
          </Button>
        </div>
      </div>
    </Scene>
  );
}
