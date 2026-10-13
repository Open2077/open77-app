import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { cx } from "./cx";
import { Display, Eyebrow, Lead } from "./typography";

import styles from "./page.module.css";

export type PageTone = "yellow" | "blue" | "red";

/**
 * The <main> of a page. Sets the page tone (accents, selection colour) and
 * clears the fixed header; a PageHero placed first slides back under it.
 */
export function Page({
  tone = "yellow",
  children,
  className,
}: {
  tone?: PageTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      id="main"
      className={cx(styles.page, className)}
      data-selection={tone}
      style={{ "--tone": `var(--${tone})`, "--active-color": `var(--${tone})` } as CSSProperties}
    >
      {children}
    </main>
  );
}

/**
 * Top of a page: eyebrow, display title, lead, actions, and an optional aside
 * (stats, a status panel). `art` sets a key-art background, darkened towards
 * the page; `watermark` sets a giant outlined word behind the title.
 */
export function PageHero({
  eyebrow,
  title,
  accent,
  lead,
  actions,
  aside,
  art,
  watermark,
  size = "default",
  className,
  children,
}: {
  eyebrow?: ReactNode;
  /** The title, one entry per line. */
  title: string[];
  /** Lines drawn in the page tone. */
  accent?: number[];
  lead?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  art?: { src: string; alt?: string; position?: string };
  watermark?: string;
  /** `full` for landing pages, `compact` for tools and dashboards. */
  size?: "full" | "default" | "compact";
  className?: string;
  /** Extra content under the actions. */
  children?: ReactNode;
}) {
  return (
    <section className={cx(styles.hero, styles[size], className)}>
      {art ? (
        <div className={styles.art} aria-hidden="true">
          <Image
            src={art.src}
            alt={art.alt ?? ""}
            fill
            sizes="100vw"
            quality={75}
            {...(size === "full" ? { preload: true } : { loading: "eager" as const })}
            style={art.position ? { objectPosition: art.position } : undefined}
          />
        </div>
      ) : null}
      {watermark ? (
        <div className={styles.watermark} aria-hidden="true">
          {watermark}
        </div>
      ) : null}
      <div className={styles.inner}>
        <div className={styles.copy}>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <Display as="h1" size={size === "compact" ? "lg" : "xl"} lines={title} accent={accent} glitch />
          {lead ? <Lead className={styles.lead}>{lead}</Lead> : null}
          {actions ? <div className={styles.actions}>{actions}</div> : null}
          {children}
        </div>
        {aside ? <div className={styles.aside}>{aside}</div> : null}
      </div>
    </section>
  );
}

/** A content block inside a page: container width, vertical rhythm, optional heading. */
export function Section({
  eyebrow,
  index,
  title,
  lead,
  actions,
  children,
  className,
  id,
  width = "default",
}: {
  eyebrow?: ReactNode;
  /** Running number shown before the eyebrow ("01"). */
  index?: number;
  title?: string | string[];
  lead?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  id?: string;
  /** `wide` uses the full gutter-to-gutter width. */
  width?: "default" | "wide" | "narrow";
}) {
  const heading = title ?? eyebrow ?? lead ?? actions;
  return (
    <section id={id} className={cx(styles.section, styles[width], className)}>
      {heading ? (
        <header className={styles.sectionHead}>
          <div className={styles.sectionCopy}>
            {eyebrow ? <Eyebrow index={index}>{eyebrow}</Eyebrow> : null}
            {title ? <Display size="md" lines={Array.isArray(title) ? title : [title]} /> : null}
            {lead ? <Lead>{lead}</Lead> : null}
          </div>
          {actions ? <div className={styles.sectionActions}>{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
