"use client";

import NextLink from "next/link";
import type { CSSProperties, MouseEventHandler, ReactNode } from "react";

import { cx } from "./cx";

import styles from "./chip.module.css";

type Tone = "yellow" | "blue" | "red";

/**
 * A slanted filter toggle. `pressed` fills it in the tone; `count` shows how
 * many results it leads to. Renders a link when given `href`.
 */
export function Chip({
  children,
  pressed = false,
  count,
  tone,
  size = "md",
  href,
  onClick,
  className,
  title,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  pressed?: boolean;
  count?: number;
  tone?: Tone;
  size?: "sm" | "md";
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  title?: string;
  "aria-label"?: string;
}) {
  const classes = cx(styles.chip, size === "sm" && styles.sm, pressed && styles.pressed, className);
  const style = tone ? ({ "--tone": `var(--${tone})` } as CSSProperties) : undefined;
  const content = (
    <>
      <span className={styles.label}>{children}</span>
      {count !== undefined ? <span className={styles.count}>{count}</span> : null}
    </>
  );
  if (href) {
    return (
      <NextLink href={href} className={classes} style={style} aria-current={pressed ? "page" : undefined} title={title} aria-label={ariaLabel}>
        {content}
      </NextLink>
    );
  }
  return (
    <button type="button" className={classes} style={style} aria-pressed={pressed} onClick={onClick} title={title} aria-label={ariaLabel}>
      {content}
    </button>
  );
}

/** A small static label: game modes, versions, states. Clickable when given `onClick`. */
export function Tag({
  children,
  tone,
  variant = "outline",
  onClick,
  title,
  className,
  ...data
}: {
  children: ReactNode;
  tone?: Tone | "neutral";
  /** `solid` fills it in the tone. */
  variant?: "outline" | "solid";
  onClick?: MouseEventHandler<HTMLButtonElement>;
  title?: string;
  className?: string;
  [data: `data-${string}`]: string | boolean | undefined;
}) {
  const classes = cx(styles.tag, variant === "solid" && styles.solid, tone === "neutral" && styles.neutral, className);
  const style = tone && tone !== "neutral" ? ({ "--tone": `var(--${tone})` } as CSSProperties) : undefined;
  if (onClick) {
    return (
      <button type="button" className={cx(classes, styles.clickable)} style={style} onClick={onClick} title={title} {...data}>
        {children}
      </button>
    );
  }
  return (
    <span className={classes} style={style} title={title} {...data}>
      {children}
    </span>
  );
}
