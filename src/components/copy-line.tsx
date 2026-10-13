"use client";

import { useState } from "react";

import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icon";
import { copy01, tick02 } from "@/components/ui/icons";
import { useClipboardSupported } from "@/lib/use-clipboard-supported";

import styles from "./copy-line.module.css";

/**
 * A full-width, monospace value with a copy button beside it.
 *
 * The whole value is meant to be read and compared by eye (a 64-hex digest,
 * or the command that produces one), so it wraps rather than truncates, and
 * stays selectable when the clipboard API is unavailable.
 */
export function CopyLine({
  value,
  label,
  display,
}: {
  /** The text that gets copied. */
  value: string;
  /** Accessible name for the button, e.g. `"Copy SHA-256"`. */
  label: string;
  /** What is shown, when it differs from what is copied. */
  display?: string;
}) {
  const [copied, setCopied] = useState(false);
  const canCopy = useClipboardSupported();

  return (
    <div className={styles.line} data-copy-line>
      <code className={styles.value} data-copy-value>
        {display ?? value}
      </code>
      {canCopy ? (
        <button
          type="button"
          className={cx(styles.button, copied && styles.copied)}
          aria-label={label}
          title={label}
          onClick={() => {
            navigator.clipboard
              .writeText(value)
              .then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1400);
              })
              .catch(() => {
                /* clipboard denied — the value is still there to select */
              });
          }}
        >
          <Icon glyph={copied ? tick02 : copy01} />
          <span aria-hidden="true">{copied ? "Copied" : "Copy"}</span>
        </button>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to the clipboard" : ""}
      </span>
    </div>
  );
}
