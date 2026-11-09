"use client";

import { useOptionalMessages } from "@/i18n/client";
import { useState } from "react";

import { cx } from "./cx";
import { Icon } from "./icon";
import { copy01, tick02 } from "./icons";

import styles from "./code-block.module.css";

/** Copies `text`, then says so for a moment. */
export function CopyButton({ text, label, className }: { text: string; label?: string; className?: string }) {
  const common = useOptionalMessages("common");
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
      <span aria-live="polite">{state === "copied"
          ? (common?.copied ?? "Copied")
          : state === "failed"
            ? (common?.copyUnavailable ?? "Copy unavailable")
            : (label ?? common?.copy ?? "Copy")}</span>
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
        {/* File names and language ids: never translated, like the code itself. */}
        <span className={styles.title} translate="no">
          {title ?? language ?? "code"}
        </span>
        {title && language ? <span className={styles.lang}>{language}</span> : null}
        <CopyButton text={code} />
      </figcaption>
      {html ? (
        <div className={styles.body} translate="no" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className={styles.body} translate="no">
          <code>{code}</code>
        </pre>
      )}
    </figure>
  );
}
