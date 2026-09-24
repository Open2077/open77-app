"use client";

import { useState, type ReactNode } from "react";
import styles from "./unstable-downloads.module.css";

/** Deliberate opt-in, never remembered between visits or release versions. */
export function UnstableDownloads({ available, children }: { available: boolean; children: ReactNode }) {
  const [accepted, setAccepted] = useState(false);

  return (
    <details className={styles.preview} data-server-preview onToggle={(event) => {
      if (!event.currentTarget.open) setAccepted(false);
    }}>
      <summary><span>Looking for a preview build?</span><span className={styles.badge}>Unstable</span></summary>
      <div className={styles.body}>
        <h3>For testing. Not your live server.</h3>
        <p id="unstable-warning">Unstable includes changes that may break resources or compatibility. Back up your configuration, resources and database, then extract into a separate folder. Do not overwrite a production server.</p>
        <p>Players must select <strong>Unstable</strong> in the launcher&apos;s Settings and install a compatible client. Switching the server build does not update your players automatically.</p>
        {available ? <>
          <label className={styles.consent}>
            <input type="checkbox" checked={accepted} aria-describedby="unstable-warning" onChange={(event) => setAccepted(event.target.checked)} />
            <span>I understand the risks. Show Unstable downloads.</span>
          </label>
          {accepted ? <div className={styles.downloads}>{children}</div> : null}
        </> : <p role="status">No verified Unstable build is available right now. Use “Check for updates” below to try again. Stable downloads above are unaffected.</p>}
      </div>
    </details>
  );
}
