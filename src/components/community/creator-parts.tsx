import type { ReactNode } from "react";

import { cx } from "@/components/ui/cx";

import styles from "./creator-parts.module.css";

/*
 * Small layout pieces the creator tools share (editor, releases, media, clip,
 * GitHub import, members). Account-wide pieces live in the account kit; these
 * only exist for the creator workspace.
 */

/** Vertical rhythm for a group of fields or notices. */
export function Stack({ children, tight = false, className }: { children: ReactNode; tight?: boolean; className?: string }) {
  return <div className={cx(styles.stack, tight && styles.stackTight, className)}>{children}</div>;
}

/** Two fields side by side, stacked on narrow screens. */
export function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.grid, className)}>{children}</div>;
}

/** A grid of media or upload cards. */
export function CardGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.cards, className)}>{children}</div>;
}

/** One hairline card in a grid; `selected` adds the tone edge. */
export function Card({
  children,
  selected = false,
  className,
  as: Tag = "article",
}: {
  children: ReactNode;
  selected?: boolean;
  className?: string;
  as?: "article" | "div" | "li";
}) {
  return <Tag className={cx(styles.card, selected && styles.selected, className)}>{children}</Tag>;
}

/** A sub-heading inside a creator tool, in the display face at its smallest. */
export function Subhead({ children, as: Tag = "h3", className, id }: { children: ReactNode; as?: "h2" | "h3" | "h4" | "h5"; className?: string; id?: string }) {
  return (
    <Tag id={id} className={cx(styles.subhead, className)}>
      {children}
    </Tag>
  );
}

/** A plain-text name (file, handle) in the body face. */
export function Name({ children, as: Tag = "h4", className }: { children: ReactNode; as?: "h3" | "h4" | "h5" | "p"; className?: string }) {
  return <Tag className={cx(styles.name, className)}>{children}</Tag>;
}

/** Raw text shown as is: changelogs, merge comparisons, audit details. */
export function MonoBlock({ children, label, className }: { children: ReactNode; label?: ReactNode; className?: string }) {
  return (
    <figure className={cx(styles.mono, className)}>
      {label ? <figcaption className={styles.monoLabel}>{label}</figcaption> : null}
      <pre className={styles.monoBody}>{children}</pre>
    </figure>
  );
}

/** A labelled digest or identifier: SHA-256, commit, upload id. */
export function Digest({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <p className={styles.digest}>
      <span>{label}</span>
      <code>{children}</code>
    </p>
  );
}

/** A Nippo line of facts: dates, states, sizes. */
export function Meta({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx(styles.meta, className)}>{children}</p>;
}

/** Running copy at the dim level. */
export function Text({ children, className, role }: { children: ReactNode; className?: string; role?: "status" | "alert" }) {
  return (
    <p className={cx(styles.text, className)} role={role}>
      {children}
    </p>
  );
}
