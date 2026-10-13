"use client";

import { useId, useState } from "react";

import { cx } from "@/components/ui/cx";
import { download02, tick02 } from "@/components/ui/icons";
import { CtaLink } from "./cta-link";

import styles from "./download-action.module.css";

type Tone = "yellow" | "blue" | "red";

/** Browser downloads cannot be observed: acknowledge the request, never fake progress. */
export function DownloadAction({
  href,
  label,
  meta,
  tone,
  lines = true,
  size = "lg",
  fullWidth = false,
  note = "Straight from the official OPEN//77 CDN, the only place we publish it.",
  className,
}: {
  href: string;
  label: string;
  /** Version and size under the label. */
  meta?: string;
  tone?: Tone;
  /** Speed lines: only on the single primary download of a view. */
  lines?: boolean;
  size?: "md" | "lg";
  fullWidth?: boolean;
  /** What the line under the button says before anything is clicked. */
  note?: string;
  className?: string;
}) {
  const feedbackId = useId();
  const [requested, setRequested] = useState(false);
  const [previousHref, setPreviousHref] = useState(href);
  if (previousHref !== href) {
    setPreviousHref(href);
    setRequested(false);
  }
  return (
    <div className={cx(styles.action, fullWidth && styles.full, className)}>
      <CtaLink
        href={href}
        meta={meta}
        icon={requested ? tick02 : download02}
        tone={tone}
        lines={lines}
        size={size}
        fullWidth={fullWidth}
        aria-describedby={feedbackId}
        onClick={(event) => {
          if (!event.defaultPrevented && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) setRequested(true);
        }}
      >
        {label}
      </CtaLink>
      <p id={feedbackId} className={cx(styles.feedback, requested && styles.requested)} role="status">
        {requested ? "Download requested. Check your browser’s downloads, or click again to retry." : note}
      </p>
    </div>
  );
}
