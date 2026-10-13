import type { CSSProperties, ReactNode } from "react";

import { cx } from "./cx";
import { Icon } from "./icon";
import { alert02, checkmarkCircle02, informationCircle } from "./icons";
import { Display, Eyebrow } from "./typography";

import styles from "./feedback.module.css";

type Kind = "info" | "success" | "warning" | "danger";

const KIND: Record<Kind, { tone: string; glyph: string }> = {
  info: { tone: "var(--blue)", glyph: informationCircle },
  success: { tone: "var(--blue)", glyph: checkmarkCircle02 },
  warning: { tone: "var(--yellow)", glyph: alert02 },
  danger: { tone: "var(--red)", glyph: alert02 },
};

/** An inline callout: what happened, what it means, what to do. */
export function Notice({
  kind = "info",
  title,
  children,
  action,
  announce = true,
  className,
}: {
  kind?: Kind;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  /**
   * False for callouts that are part of the page (docs warnings, standing
   * notes): they are read in order instead of being announced on load.
   */
  announce?: boolean;
  className?: string;
}) {
  const { tone, glyph } = KIND[kind];
  return (
    <div
      className={cx(styles.notice, className)}
      style={{ "--notice": tone } as CSSProperties}
      role={!announce ? "note" : kind === "danger" || kind === "warning" ? "alert" : "status"}
    >
      <Icon glyph={glyph} className={styles.noticeIcon} />
      <div className={styles.noticeBody}>
        {title ? <p className={styles.noticeTitle}>{title}</p> : null}
        {children ? <div className={styles.noticeText}>{children}</div> : null}
      </div>
      {action ? <div className={styles.noticeAction}>{action}</div> : null}
    </div>
  );
}

/** Nothing to show yet: say why, and what to do about it. */
export function EmptyState({
  eyebrow,
  title,
  children,
  action,
  className,
  ...data
}: {
  eyebrow?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  [data: `data-${string}`]: string | boolean | undefined;
}) {
  return (
    <div className={cx(styles.empty, className)} {...data}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Display size="sm" as="h3">
        {title}
      </Display>
      {children ? <div className={styles.emptyText}>{children}</div> : null}
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </div>
  );
}

/**
 * Pending state in the design's voice: a terminal-style label with a pulsing
 * "loading..." (as on the home page code panels).
 */
export function Loader({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <p className={cx(styles.loader, className)} role="status">
      {`// ${label} `}
      <span>loading...</span>
    </p>
  );
}

/** A big number with its label. */
export function Stat({
  value,
  label,
  detail,
  className,
}: {
  value: ReactNode;
  label: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx(styles.stat, className)}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
      {detail ? <span className={styles.statDetail}>{detail}</span> : null}
    </div>
  );
}

/** A slanted fill bar: occupancy, progress, quota. `value` is 0–100. */
export function Meter({
  value,
  label,
  tone,
  className,
}: {
  value: number;
  /** Accessible description, e.g. "42 of 64 players". */
  label: string;
  tone?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <span
      className={cx(styles.meter, className)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
      style={{ "--fill": `${clamped}%`, ...(tone ? { "--meter": tone } : {}) } as CSSProperties}
    />
  );
}
