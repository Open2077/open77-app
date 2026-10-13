"use client";

import { useState, type ReactNode } from "react";

import { Tag } from "@/components/ui/chip";
import { Checkbox } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { alert02 } from "@/components/ui/icons";
import { Display } from "@/components/ui/typography";

import styles from "./unstable-downloads.module.css";

/** Deliberate opt-in, never remembered between visits or release versions. */
export function UnstableDownloads({ available, children }: { available: boolean; children: ReactNode }) {
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
        <span className={styles.summaryText}>Looking for a preview build?</span>
        <Tag tone="yellow">Unstable</Tag>
        <span className={styles.toggle} aria-hidden="true" />
      </summary>
      <div className={styles.body}>
        <Display as="h3" size="sm">
          For testing. Not your live server.
        </Display>
        <p id="unstable-warning">
          Unstable includes changes that may break resources or compatibility. Back up your configuration, resources and
          database, then extract into a separate folder. Do not overwrite a production server.
        </p>
        <p>
          Players must select <strong>Unstable</strong> in the launcher&apos;s Settings and install a compatible client.
          Switching the server build does not update your players automatically.
        </p>
        {available ? (
          <>
            <div className={styles.consent}>
              <Checkbox
                checked={accepted}
                aria-describedby="unstable-warning"
                onChange={(event) => setAccepted(event.target.checked)}
              >
                I understand the risks. Show Unstable downloads.
              </Checkbox>
            </div>
            {accepted ? <div className={styles.downloads}>{children}</div> : null}
          </>
        ) : (
          <p role="status" className={styles.none}>
            No verified Unstable build is available right now. Use “Check for updates” below to try again. Stable downloads
            above are unaffected.
          </p>
        )}
      </div>
    </details>
  );
}
