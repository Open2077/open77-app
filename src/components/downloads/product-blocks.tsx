import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { cx } from "@/components/ui/cx";
import { EmptyState } from "@/components/ui/feedback";
import { Glitch } from "@/components/ui/glitch";
import { Icon } from "@/components/ui/icon";
import { arrowDown01, arrowRight01, tick02 } from "@/components/ui/icons";
import { SmartLink } from "@/components/ui/smart-link";
import { Display, Eyebrow } from "@/components/ui/typography";

import styles from "./product-blocks.module.css";

type Tone = "yellow" | "blue" | "red";

const toneStyle = (tone?: Tone) => (tone ? ({ "--tone": `var(--${tone})` } as CSSProperties) : undefined);

/** A link with the scramble and a trailing arrow: secondary navigation inside copy. */
export function ArrowLink({ href, children, className }: { href: string; children: string; className?: string }) {
  return (
    <SmartLink href={href} className={cx(styles.arrowLink, className)}>
      <Glitch>{children}</Glitch>
      <Icon glyph={arrowRight01} />
    </SmartLink>
  );
}

/**
 * A jump to a section of the same page. A real `<a href="#…">`: it stays in
 * the tab order and the browser handles the scroll and the history entry.
 */
export function JumpLink({ href, children }: { href: `#${string}`; children: string }) {
  return (
    <a href={href} className={styles.arrowLink}>
      <Glitch>{children}</Glitch>
      <Icon glyph={arrowDown01} />
    </a>
  );
}

/** The at-a-glance row under a hero: four label/value facts. */
export function SpecStrip({
  facts,
  label = "At a glance",
  className,
}: {
  facts: Array<{ label: string; value: ReactNode; icon: string }>;
  label?: string;
  className?: string;
}) {
  return (
    <ul className={cx(styles.strip, className)} aria-label={label}>
      {facts.map((fact) => (
        <li key={fact.label}>
          <Icon glyph={fact.icon} className={styles.stripIcon} />
          <div>
            <span className={styles.stripLabel}>{fact.label}</span>
            <strong className={styles.stripValue}>{fact.value}</strong>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Numbered steps with the big outlined numerals of the design. */
export function Steps({
  steps,
  className,
}: {
  steps: Array<{ title: string; body: ReactNode }>;
  className?: string;
}) {
  return (
    <ol className={cx(styles.steps, className)} style={{ "--count": steps.length } as CSSProperties}>
      {steps.map((step, index) => (
        <li key={step.title} className={styles.step}>
          <span className={styles.stepNumber} aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <Display as="h3" size="xs" className={styles.stepTitle}>
            {step.title}
          </Display>
          <div className={styles.stepBody}>{step.body}</div>
        </li>
      ))}
    </ol>
  );
}

/** What something does or gives you: glyph, title, copy, optional link. */
export function FeatureGrid({
  items,
  columns,
  className,
}: {
  /** `tag` replaces the running number ("Single player", "Models"). */
  items: Array<{ icon: string; title: string; body: ReactNode; href?: string; action?: string; tag?: string }>;
  /** Fixed column count on wide screens; auto-fit otherwise. */
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  return (
    <ul className={cx(styles.features, columns && styles[`cols${columns}`], className)}>
      {items.map((item, index) => (
        <li key={item.title} className={styles.feature}>
          <div className={styles.featureHead}>
            <Icon glyph={item.icon} className={styles.featureIcon} />
            <span className={cx(styles.featureIndex, item.tag && styles.featureTag)} aria-hidden={item.tag ? undefined : true}>
              {item.tag ?? String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <Display as="h3" size="xs">
            {item.title}
          </Display>
          <div className={styles.featureBody}>{item.body}</div>
          {item.href && item.action ? <ArrowLink href={item.href}>{item.action}</ArrowLink> : null}
        </li>
      ))}
    </ul>
  );
}

/** Requirements: a ticked list of what you need, each with the reason. */
export function Checklist({ items, className }: { items: Array<{ title: ReactNode; body: ReactNode }>; className?: string }) {
  return (
    <ul className={cx(styles.checklist, className)}>
      {items.map((item, index) => (
        <li key={index}>
          <span className={styles.tick} aria-hidden="true">
            <Icon glyph={tick02} />
          </span>
          <div>
            <h3 className={styles.checkTitle}>{item.title}</h3>
            <p className={styles.checkBody}>{item.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Questions that open in place. Native <details>: keyboard and find-in-page work. */
export function Faq({ items, className }: { items: Array<{ q: string; a: ReactNode }>; className?: string }) {
  return (
    <div className={cx(styles.faq, className)}>
      {items.map((item) => (
        <details key={item.q} className={styles.faqItem}>
          <summary className={styles.faqSummary}>
            <span>{item.q}</span>
            <span className={styles.toggle} aria-hidden="true" />
          </summary>
          <div className={styles.faqAnswer}>{item.a}</div>
        </details>
      ))}
    </div>
  );
}

/** A compact disclosure under a download: file name, checksum, how to verify. */
export function FileDetails({ summary, children, className }: { summary: string; children: ReactNode; className?: string }) {
  return (
    <details className={cx(styles.details, className)}>
      <summary className={styles.detailsSummary}>
        <span>{summary}</span>
        <span className={styles.toggle} aria-hidden="true" />
      </summary>
      <div className={styles.detailsBody}>{children}</div>
    </details>
  );
}

/** A release pointer the CDN could not confirm. Honest about it; no older build is offered instead. */
export function UnavailableRelease({ kind }: { kind: "launcher" | "server" }) {
  return (
    <div role="status" className={styles.unavailable}>
      <EmptyState
        eyebrow={kind === "launcher" ? "Launcher release" : "Server release"}
        title="Temporarily unavailable"
      >
        We couldn’t verify the current {kind === "launcher" ? "launcher" : "server"} release from the CDN. No older build
        is substituted. The page checks again every minute, or use “Check for updates”.
      </EmptyState>
    </div>
  );
}

/**
 * The row under a set of releases: the live-pointer reassurance and manual
 * retry (`<ReleaseRefresh />`, passed as the child and styled here), and a note.
 */
export function ReleaseStatus({ note, className, children }: { note?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className={cx(styles.status, className)}>
      <div className={styles.refresh}>{children}</div>
      {note ? <p className={styles.statusNote}>{note}</p> : null}
    </div>
  );
}

/**
 * The slanted art card of the home page (the players cards): sub-label,
 * title, copy and a link over key art that fades into the page. Short content
 * only; the slant grows with the height.
 */
export function ArtCard({
  image,
  sub,
  title,
  titleAs: Title = "h3",
  children,
  href,
  action,
  tone,
  className,
  ...data
}: {
  image: string;
  sub: string;
  title: ReactNode;
  titleAs?: "h2" | "h3";
  children: ReactNode;
  href?: string;
  action?: string;
  tone?: Tone;
  className?: string;
  [attribute: `data-${string}`]: string | undefined;
}) {
  return (
    <article className={cx(styles.card, className)} style={toneStyle(tone)} {...data}>
      <div className={styles.cardArt} aria-hidden="true">
        <Image src={image} alt="" fill sizes="(max-width: 1084px) 100vw, 50vw" quality={75} />
      </div>
      <Eyebrow className={styles.cardSub}>{sub}</Eyebrow>
      <Title className={styles.cardTitle}>{title}</Title>
      <div className={styles.cardBody}>{children}</div>
      {href && action ? <ArrowLink href={href}>{action}</ArrowLink> : null}
    </article>
  );
}
