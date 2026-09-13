import Link from "next/link";

import { Eyebrow } from "@/components/brand";
import { ArrowRightIcon } from "@/components/icons";
import { site } from "@/lib/site";
import styles from "./developer-alpha.module.css";

export function DeveloperAlpha({ compact = false }: { compact?: boolean }) {
  const Heading = compact ? "h3" : "h2";

  return (
    <aside className={styles.panel} id="developer-alpha" aria-labelledby="developer-alpha-title">
      <Eyebrow>DEVELOPER PREVIEW · ACTIVE</Eyebrow>
      <Heading className={styles.title} id="developer-alpha-title">
        Build your own Night City.
      </Heading>
      <p className={styles.description}>
        Planning an RP server, a custom game mode, or a new multiplayer experience?
        Developer Preview is live. Apply for access and start building and testing
        your community&apos;s Cyberpunk 2077 experience once your account is approved.
      </p>
      <div className={styles.actions}>
        <Link className="btn btn-primary" href="/host">
          Download server
          <ArrowRightIcon />
        </Link>
        <a className="btn btn-ghost" href={site.links.developerAlpha} target="_blank" rel="noreferrer noopener">
          Apply for preview access
        </a>
        <Link className="btn btn-ghost" href="/docs/developer-preview">Preview guide</Link>
      </div>
      <p className={styles.note}>
        <strong>Already have alpha access?</strong> Download the Windows or Linux server
        with your approved account — no new application or staff role is required.
      </p>
      <p className={styles.note}>
        <strong>Very limited launch slots.</strong> For server owners and developers.
        Applications are reviewed, with priority given to serious, well-defined projects.
      </p>
      {!compact && (
        <p className={styles.note}>
          Tell us about your concept, your team, and what you want to build in the application.
          This is an early developer preview: expect bugs, crashes, and incomplete features.
          Share reproducible issues and feedback with the team on the official Discord.
        </p>
      )}
    </aside>
  );
}
