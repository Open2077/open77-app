"use client";

import { useState } from "react";
import { CheckIcon, DownloadIcon } from "@/components/icons";
import styles from "./download-surface.module.css";

/** Browser downloads cannot be observed: acknowledge the request, never fake progress. */
export function DownloadAction({ href, label }: { href: string; label: string }) {
  const [requested, setRequested] = useState(false);
  const [previousHref, setPreviousHref] = useState(href);
  if (previousHref !== href) {
    setPreviousHref(href);
    setRequested(false);
  }
  return (
    <div className={styles.downloadAction}>
      <a className={styles.primary} href={href} onClick={(event) => {
        if (!event.defaultPrevented && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) setRequested(true);
      }}>
        {label}{requested ? <CheckIcon size={19} /> : <DownloadIcon size={19} />}
      </a>
      <p className={styles.downloadFeedback} role="status">
        {requested ? "Download requested. Check your browser’s downloads, or click again to retry." : "Direct download from the official Open//77 CDN."}
      </p>
    </div>
  );
}
