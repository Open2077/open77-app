"use client";

import { useState } from "react";

import { CheckIcon, CopyIcon } from "@/components/icons";

/**
 * A short, click-to-copy SHA-256. Shows the first 16 hex chars, copies the full
 * digest, and flips to a check for a beat so the click reads as done. Falls back
 * to a plain, still-selectable span when the clipboard API is unavailable.
 */
export function CopyHash({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const short = `${value.slice(0, 16)}…`;

  const canCopy = typeof navigator !== "undefined" && !!navigator.clipboard;

  if (!canCopy) {
    return (
      <span className="host-hash" title={value}>
        {short}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="host-hash host-hash-btn"
      title={`Copy SHA-256 — ${value}`}
      aria-label={`Copy SHA-256 ${value}`}
      onClick={() => {
        navigator.clipboard
          .writeText(value)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          })
          .catch(() => {
            /* clipboard denied — nothing to do but leave the value visible */
          });
      }}
    >
      <span>{short}</span>
      {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
    </button>
  );
}
