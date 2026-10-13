import { SCRIPT_DOC_LINKS, SCRIPT_PILLARS } from "@/lib/scripting";

import { Button } from "@/components/ui/button";
import { Glitch } from "@/components/ui/glitch";
import { SmartLink } from "@/components/ui/smart-link";
import { RIDE_CLIENT_HTML, RIDE_SERVER_HTML } from "./ride-sample";
import { Scene } from "./scene";

import styles from "./developers.module.css";

const [DOCS, PLATFORM, EXPORTS] = SCRIPT_DOC_LINKS;

/**
 * The scripting pillars as the design sets them: the shared copy, with
 * non-breaking spaces so no line ends on a lone word. Links follow the shared
 * scripting pages.
 */
const PILLARS = [
  {
    label: "Lua 5.4",
    title: "One language, two runtimes",
    body: "Client scripts run inside the game; server scripts own the authoritative world. Each resource gets its own isolated Lua VM, and hot reload: save the file, it is live.",
    link: "Resource model",
  },
  {
    label: "Real Game APIs",
    title: "Drive the actual engine",
    body: "Vehicles, blips, NPCs, weather, loot, interactions, notifications: the same permission-gated natives OPEN//77's own resources are built on.",
    link: "Lua API reference",
  },
  {
    label: "Web interfaces",
    title: "UI with the web stack",
    body: "A resource can ship a Chromium WebUI page: build HUDs, menus and apps in HTML, CSS and JavaScript, out of process so the game never pays for  your UI.",
    link: "WebUI in practice",
  },
].map((pillar, index) => ({ ...pillar, href: SCRIPT_PILLARS[index]?.href ?? "/docs" }));

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
  return (
    <Scene
      id="developers"
      tone="red"
      title={[
        { text: "Script", from: 0, to: 40 },
        { text: "Your", from: 20, to: 60 },
        { text: "Night City", from: 10, to: -10, front: true },
      ]}
      description={
        <>
          Gameplay on an OPEN//77 server is not configured. It is scripted. A resource is a small{" "}
          <strong>Lua&nbsp;5.4</strong> package your server loads, hot-reloads and streams to every player who joins. This
          is the entire <kbd data-color="red">/ride</kbd> command, for real.
        </>
      }
      background={{ src: "/home/img/devs-bg.webp", alt: "Developers", width: 2516, height: 1179 }}
      character={{ src: "/home/img/devs-character.webp", alt: "Developers", width: 1089, height: 1413 }}
      buttons={
        <>
          <Button color="red" lines="left" href={DOCS.href}>
            Red docs
          </Button>
          <Button color="red" lines="none" border href={PLATFORM.href}>
            Platform works
          </Button>
          <Button color="red" lines="none" border href={EXPORTS.href}>
            Resource
          </Button>
        </>
      }
    >
      <div className={styles.content}>
        <div className={styles.list}>
          {PILLARS.map((pillar) => (
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
