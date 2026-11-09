"use client";

import { useState, type ReactNode } from "react";

import { Tag } from "@/components/ui/chip";
import { Checkbox } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { alert02 } from "@/components/ui/icons";
import { Display } from "@/components/ui/typography";
import { rich } from "@/i18n/format";
import type { Messages } from "@/i18n/types";

import styles from "./unstable-downloads.module.css";

/** Deliberate opt-in, never remembered between visits or release versions. */
export function UnstableDownloads({
  available,
  children,
  m,
}: {
  available: boolean;
  children: ReactNode;
  m: Messages["host"]["unstable"];
}) {
  const [accepted, setAccepted] = useState(false);

  return (
    <details
      className={styles.preview}
      data-server-preview
      onToggle={(event) => {
        if (!event.currentTarget.open) setAccepted(false);
      }}
    >
      <summary className={styles.summary}>
        <Icon glyph={alert02} className={styles.summaryIcon} />
        <span className={styles.summaryText}>{m.summary}</span>
        <Tag tone="yellow">{m.tag}</Tag>
        <span className={styles.toggle} aria-hidden="true" />
      </summary>
      <div className={styles.body}>
        <Display as="h3" size="sm">
          {m.title}
        </Display>
        <p id="unstable-warning">{m.warning}</p>
        <p>{rich(m.players, { strong: (chunk) => <strong>{chunk}</strong> })}</p>
        {available ? (
          <>
            <div className={styles.consent}>
              <Checkbox
                checked={accepted}
                aria-describedby="unstable-warning"
                onChange={(event) => setAccepted(event.target.checked)}
              >
                {m.consent}
              </Checkbox>
            </div>
            {accepted ? <div className={styles.downloads}>{children}</div> : null}
          </>
        ) : (
          <p role="status" className={styles.none}>
            {m.none}
          </p>
        )}
      </div>
    </details>
  );
}
