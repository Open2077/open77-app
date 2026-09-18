import Link from "next/link";

import { Eyebrow } from "@/components/brand";
import { ArrowRightIcon } from "@/components/icons";
import { site } from "@/lib/site";
import styles from "./developer-alpha.module.css";

export function DeveloperAlpha({ compact = false }: { compact?: boolean }) {
  const Heading = compact ? "h3" : "h2";

  return (
    <aside className={styles.panel} id="alpha-access" aria-labelledby="alpha-access-title">
      <span id="developer-alpha" aria-hidden="true" />
      <Eyebrow>ALPHA ACCESS · BUILD NOW</Eyebrow>
      <Heading className={styles.title} id="alpha-access-title">
        It&apos;s time to build.
      </Heading>
      <p className={styles.description}>
        Everyone with Alpha access can now download the server and start building.
        Roleplay, PvP, Battle Royale, Racing, Survival — create your own gamemode
        and your own experience in Night City.
      </p>
      <div className={styles.actions}>
        <Link className="btn btn-primary" href="/host">
          Download server
          <ArrowRightIcon />
        </Link>
        <Link className="btn btn-ghost" href="/docs/host-a-server">Hosting guide</Link>
        <Link className="btn btn-ghost" href="/docs/api">Explore the Lua APIs</Link>
      </div>
      <p className={styles.note}>
        <strong>Already have Alpha access?</strong> Sign in and download the Windows or Linux
        server. No separate developer application or special access is required.
      </p>
      <p className={styles.note}>
        <strong>Need Alpha access?</strong> Use <code>/alpha apply</code> with the bot in any
        channel on our{" "}
        <a href={site.links.discord ?? "https://discord.open2077.net"} target="_blank" rel="noreferrer noopener">official Discord</a>.
      </p>
      {!compact && (
        <p className={styles.note}>
          Build your gamemode, experiment with the APIs and share your resources.
          Alpha members can also follow updates in the Discord changelog channel.
          Alpha software can still have bugs, crashes and API changes; share reproducible issues with the team.
        </p>
      )}
    </aside>
  );
}
