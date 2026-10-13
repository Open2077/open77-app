"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { informationCircle } from "@/components/ui/icons";

import styles from "./demo-data-notice.module.css";

/**
 * The standing disclosure for the server directory's demo data.
 *
 * Every surface that renders `servers-demo.ts` must render this. The listings
 * are invented, and a browser full of plausible player counts is exactly the
 * kind of thing a reader would otherwise take as evidence that the platform
 * already has a population.
 */
export function DemoDataNotice({ scope = "listings" }: { scope?: "listings" | "page" }) {
  const [expanded, setExpanded] = useState(false);
  const noteId = useId();

  return (
    <div className={styles.notice}>
      <p className={styles.line} role="note">
        <Icon glyph={informationCircle} />
        Demo view{" "}
        <span className={styles.dim}>
          {scope === "page" ? "// this server page uses demo data" : "// server listings currently use demo data"}
        </span>
        <button
          className={styles.more}
          type="button"
          aria-expanded={expanded}
          aria-controls={noteId}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? "Hide" : "What does this mean?"}
        </button>
      </p>
      <p className={styles.note} id={noteId} hidden={!expanded}>
        This view uses illustrative demo data. Its player counts, pings and communities are not real. Alpha is
        active; use the <Link href="/servers">live directory</Link> for actual listings. Joining a world requires an
        approved account.
      </p>
    </div>
  );
}
