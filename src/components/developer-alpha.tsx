import Link from "next/link";

import { Eyebrow } from "@/components/brand";
import { ArrowRightIcon } from "@/components/icons";
import { site } from "@/lib/site";
import styles from "./developer-alpha.module.css";

export function DeveloperAlpha({ compact = false }: { compact?: boolean }) {
  const Heading = compact ? "h3" : "h2";

  return (
    <aside className={styles.panel} id="developer-alpha" aria-labelledby="developer-alpha-title">
      <Eyebrow>DEVELOPER ALPHA PREVIEW · COMING SOON</Eyebrow>
      <Heading className={styles.title} id="developer-alpha-title">
        Build your own Night City.
      </Heading>
      <p className={styles.description}>
        Planning an RP server, a custom game mode, or a new multiplayer experience?
        Apply for early access and start bringing your community to Cyberpunk 2077.
      </p>
      <div className={styles.actions}>
        <a className="btn btn-primary" href={site.links.developerAlpha} target="_blank" rel="noreferrer noopener">
          Apply for developer alpha
          <ArrowRightIcon />
        </a>
        <Link className="btn btn-ghost" href="/docs">Explore the docs</Link>
      </div>
      <p className={styles.note}>
        <strong>Very limited launch slots.</strong> For server owners and developers.
        Applications are reviewed, with priority given to serious, well-defined projects.
      </p>
      {!compact && (
        <p className={styles.note}>
          Tell us about your concept, your team, and what you want to build in the application.
          This is an early developer preview: expect bugs, crashes, and incomplete features.
          A dedicated feedback channel will be available for developers.
        </p>
      )}
    </aside>
  );
}
