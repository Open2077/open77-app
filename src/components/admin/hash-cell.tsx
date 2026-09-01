"use client";

import { useEffect, useRef, useState } from "react";

import { CheckIcon, CopyIcon } from "@/components/icons";

/** Head and tail of a digest — enough to recognise, short enough for a cell. */
function truncate(hash: string): string {
  return hash.length > 20 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;
}

/**
 * A SHA-256 in a table cell: shortened for the eye, complete on the clipboard.
 *
 * The full digest is the only identifier that matters here — it is what the
 * launcher asks about and what an owner quotes in a ticket — so the copy button
 * always yields all 64 characters, never the shortened display form. The value
 * is rendered as text inside `<code>`; React escapes it, and nothing about a
 * hash is ever treated as markup or a URL.
 */
export function HashCell({ sha256 }: { sha256: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(sha256);
    } catch {
      // Non-secure contexts and older engines: the legacy path still works.
      const area = document.createElement("textarea");
      area.value = sha256;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <span className="adm-hash">
      <code className="adm-mono adm-dim" title={sha256}>
        {truncate(sha256)}
      </code>
      <button
        className={`ac-iconbtn${copied ? " is-copied" : ""}`}
        type="button"
        onClick={copy}
        aria-label={copied ? "SHA-256 copied to clipboard" : `Copy the full SHA-256 ${sha256}`}
      >
        {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
      </button>
    </span>
  );
}
