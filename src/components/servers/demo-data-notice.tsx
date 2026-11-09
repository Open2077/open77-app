"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { informationCircle } from "@/components/ui/icons";
import { useLocalizeHref, useMessages } from "@/i18n/client";
import { rich } from "@/i18n/format";

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
  const m = useMessages("servers").demo;
  const localize = useLocalizeHref();

  return (
    <div className={styles.notice}>
      <p className={styles.line} role="note">
        <Icon glyph={informationCircle} />
        {m.view}{" "}
        <span className={styles.dim}>
          {scope === "page" ? m.scopePage : m.scopeListings}
        </span>
        <button
          className={styles.more}
          type="button"
          aria-expanded={expanded}
          aria-controls={noteId}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? m.hide : m.more}
        </button>
      </p>
      <p className={styles.note} id={noteId} hidden={!expanded}>
        {rich(m.note, { live: (chunk: ReactNode) => <Link href={localize("/servers")}>{chunk}</Link> })}
      </p>
    </div>
  );
}
