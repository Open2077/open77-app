"use client";

import { useState } from "react";

import { cx } from "./cx";
import { Icon } from "./icon";
import { copy01, tick02 } from "./icons";

import styles from "./code-block.module.css";

/** Copies `text`, then says so for a moment. */
export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <button
      type="button"
      className={cx(styles.copy, className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("copied");
        } catch {
          // Clipboard unavailable (permissions, insecure origin): the text stays selectable.
          setState("failed");
        }
        window.setTimeout(() => setState("idle"), 1800);
      }}
    >
      <Icon glyph={state === "copied" ? tick02 : copy01} />
      <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Copy unavailable" : label}</span>
    </button>
  );
}

/**
 * A code sample in the design's terminal frame: file label on top, copy
 * button, highlighted body. `html` is Shiki output; `code` is the raw text
 * (copied, and shown as is when there is no `html`).
 */
export function CodeBlock({
  code,
  html,
  title,
  language,
  className,
}: {
  code: string;
  html?: string;
  title?: string;
  language?: string;
  className?: string;
}) {
  return (
    <figure className={cx(styles.block, className)}>
      <figcaption className={styles.bar}>
        <span className={styles.title}>{title ?? language ?? "code"}</span>
        {title && language ? <span className={styles.lang}>{language}</span> : null}
        <CopyButton text={code} />
      </figcaption>
      {html ? (
        <div className={styles.body} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className={styles.body}>
          <code>{code}</code>
        </pre>
      )}
    </figure>
  );
}
