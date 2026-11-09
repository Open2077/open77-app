"use client";

import { SCRIPT_DOC_LINKS, SCRIPT_PILLARS } from "@/lib/scripting";

import { Button } from "@/components/ui/button";
import { Glitch } from "@/components/ui/glitch";
import { SmartLink } from "@/components/ui/smart-link";
import { RIDE_CLIENT_HTML, RIDE_SERVER_HTML } from "./ride-sample";
import { useMessages } from "@/i18n/client";
import { rich } from "@/i18n/format";
import { Scene, sceneTitle } from "./scene";

import styles from "./developers.module.css";

const [DOCS, PLATFORM, EXPORTS] = SCRIPT_DOC_LINKS;

/** Motion of the title words, from the design. */
const TITLE_MOTION = [
  { from: 0, to: 40 },
  { from: 20, to: 60 },
  { from: 10, to: -10 },
];

function CodePanel({ html, file, runtime, topClass }: { html: string; file: string; runtime: string; topClass?: string }) {
  return (
    <pre className={styles.pre}>
      <span className={styles.slant} aria-hidden="true" />
      <code dangerouslySetInnerHTML={{ __html: html }} />
      <span className={styles.text}>
        <Glitch className={topClass}>{file}</Glitch>
        <span className={styles.bottom}>
          {`// ${runtime} `}
          <span>loading...</span>
        </span>
      </span>
    </pre>
  );
}

export function Developers() {
  const m = useMessages("home").developers;
  // The scripting pillars as the design sets them; links follow the shared scripting pages.
  const pillars = m.pillars.map((pillar, index) => ({ ...pillar, href: SCRIPT_PILLARS[index]?.href ?? "/docs" }));
  return (
    <Scene
      id="developers"
      tone="red"
      title={sceneTitle(m.title, m.titleFront, TITLE_MOTION)}
      description={rich(m.description, {
        strong: (chunk) => <strong>{chunk}</strong>,
        kbd: (chunk) => <kbd data-color="red">{chunk}</kbd>,
      })}
      background={{ src: "/home/img/devs-bg.webp", alt: m.backgroundAlt, width: 2516, height: 1179 }}
      character={{ src: "/home/img/devs-character.webp", alt: m.characterAlt, width: 1089, height: 1413 }}
      buttons={
        <>
          <Button color="red" lines="left" href={DOCS.href}>
            {m.docs}
          </Button>
          <Button color="red" lines="none" border href={PLATFORM.href}>
            {m.platform}
          </Button>
          <Button color="red" lines="none" border href={EXPORTS.href}>
            {m.resource}
          </Button>
        </>
      }
    >
      <div className={styles.content}>
        <div className={styles.list}>
          {pillars.map((pillar) => (
            <div key={pillar.label} className={styles.item}>
              <div className={styles.label}>{pillar.label}</div>
              <h3 className={styles.title} data-typewrite>
                {pillar.title}
              </h3>
              <p className={styles.description}>
                {pillar.body}{" "}
                <SmartLink href={pillar.href} glitch>
                  {pillar.link}
                </SmartLink>
              </p>
            </div>
          ))}
        </div>
        <div className={styles.codes}>
          <CodePanel
            html={RIDE_SERVER_HTML}
            file="resources/ride/server/main.lua"
            runtime="SERVER.RUNTIME"
            topClass={styles.top}
          />
          <CodePanel
            html={RIDE_CLIENT_HTML}
            file="resources/ride/server/main.lua"
            runtime="CLIENT.RUNTIME"
            topClass={styles.top2}
          />
        </div>
      </div>
    </Scene>
  );
}
