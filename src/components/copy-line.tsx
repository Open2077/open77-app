"use client";

import { useState } from "react";

import { CheckIcon, CopyIcon } from "@/components/icons";

/**
 * A full-width, monospace value with a copy button beside it.
 *
 * Distinct from `CopyHash`, which abbreviates: here the whole value is meant to
 * be read and compared by eye — a 64-hex digest, or the command that produces
 * one — so it wraps rather than truncates, and stays selectable when the
 * clipboard API is unavailable.
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
  const canCopy = typeof navigator !== "undefined" && !!navigator.clipboard;

  return (
    <div className="copy-line">
      <code className="copy-line-value">{display ?? value}</code>
      {canCopy ? (
        <button
          type="button"
          className="copy-line-btn"
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
          {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      ) : null}
    </div>
  );
}
