import type { ReactNode } from "react";

import { cx } from "@/components/ui/cx";
import { Prose } from "@/components/ui/prose";

import styles from "./doc-prose.module.css";

/**
 * Rendered guide Markdown: the shared `Prose` typography plus what only the
 * docs generate (language labels on Shiki blocks, framed reference tables,
 * blockquote callouts, the API signature and parameter blocks).
 */
export function DocProse({ html, children, className }: { html?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={styles.reader} data-docs-prose>
      <Prose html={html} className={cx(styles.doc, className)}>
        {children}
      </Prose>
    </div>
  );
}
