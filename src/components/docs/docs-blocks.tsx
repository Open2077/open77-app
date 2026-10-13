import Link from "next/link";
import type { ReactNode } from "react";

import { CodeBlock } from "@/components/ui/code-block";
import { cx } from "@/components/ui/cx";
import { Notice } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { arrowRight01 } from "@/components/ui/icons";

import styles from "./docs-blocks.module.css";

/**
 * Building blocks of the hand-written documentation pages (platform, hosting,
 * licensing, Warden). They read like a rendered guide, so the same reader gets
 * the same hierarchy, but carry structured content: steps, facts, snippets.
 */

/** A titled section, an entry of the page outline. */
export function DocSection({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section id={id} className={styles.section}>
      <h2 className={styles.heading}>
        {title}
        <a className={styles.anchor} href={`#${id}`} aria-hidden="true" tabIndex={-1}>
          #
        </a>
      </h2>
      {intro ? <p className={styles.text}>{intro}</p> : null}
      {children}
    </section>
  );
}

/** A paragraph of running text at the guides' measure. */
export function DocText({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx(styles.text, className)}>{children}</p>;
}

/** A sub-heading inside a section. */
export function DocSubheading({ children }: { children: ReactNode }) {
  return <h3 className={styles.subheading}>{children}</h3>;
}

/** The "read more" link of a block: Nippo capitals, an arrow that moves on hover. */
export function DocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className={styles.link} href={href}>
      <span>{children}</span>
      <Icon glyph={arrowRight01} />
    </Link>
  );
}

export type Step = {
  /** The marker: "01", or an icon passed as `glyph`. */
  num?: string;
  glyph?: string;
  title: string;
  body: ReactNode;
  link?: { href: string; label: string };
};

/** Numbered steps on a grid, each with an optional follow-up link. */
export function Steps({ items, columns = 2 }: { items: Step[]; columns?: 2 | 3 }) {
  return (
    <ol className={cx(styles.steps, columns === 3 && styles.steps3)}>
      {items.map((step, index) => (
        <li className={styles.step} key={step.title}>
          <span className={styles.stepNum} aria-hidden={step.glyph ? true : undefined}>
            {step.glyph ? <Icon glyph={step.glyph} /> : (step.num ?? String(index + 1).padStart(2, "0"))}
          </span>
          <h3 className={styles.stepTitle}>{step.title}</h3>
          <div className={styles.stepBody}>{step.body}</div>
          {step.link ? <DocLink href={step.link.href}>{step.link.label}</DocLink> : null}
        </li>
      ))}
    </ol>
  );
}

/** Label / explanation pairs: what the host needs, what a key is, config fields. */
export function Facts({ items }: { items: Array<{ label: ReactNode; body: ReactNode }> }) {
  return (
    <dl className={styles.facts}>
      {items.map((item, index) => (
        <div className={styles.fact} key={index}>
          <dt>{item.label}</dt>
          <dd>{item.body}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Features with an icon: what Warden can do, what the server owns. */
export function FeatureGrid({ items }: { items: Array<{ glyph?: string; title: string; body: ReactNode }> }) {
  return (
    <ul className={styles.features}>
      {items.map((item) => (
        <li className={styles.feature} key={item.title}>
          {item.glyph ? <Icon glyph={item.glyph} className={styles.featureIcon} /> : null}
          <h3 className={styles.featureTitle}>{item.title}</h3>
          <p>{item.body}</p>
        </li>
      ))}
    </ul>
  );
}

/** A highlighted code sample with its file name and copy button. */
export function Snippet({ filename, badge, code, html }: { filename: string; badge: string; code: string; html: string }) {
  return <CodeBlock className={styles.snippet} code={code} html={html} title={filename} language={badge} />;
}

/** A callout: a status, a warning, an aside the reader should not miss. */
export function DocNote({
  kind = "info",
  title,
  children,
}: {
  kind?: "info" | "warning" | "danger" | "success";
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Notice kind={kind} title={title} className={styles.note}>
      {children}
    </Notice>
  );
}
