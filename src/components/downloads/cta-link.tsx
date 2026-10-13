"use client";

import type { CSSProperties, MouseEventHandler } from "react";

import { cx } from "@/components/ui/cx";
import { Glitch } from "@/components/ui/glitch";
import { Icon } from "@/components/ui/icon";

import styles from "./cta-link.module.css";

type Tone = "yellow" | "blue" | "red";

/**
 * The slanted call to action of the design, as a plain same-tab `<a>`.
 *
 * File downloads and in-page jumps need things the shared `Button` does not do
 * for a link: stay in the current tab (a download opened in a new tab flashes
 * an empty one), keep an `onClick` (the download acknowledgement), carry a
 * second line of facts (version · size), and stay keyboard-focusable on a
 * `#hash` target. Everything else on these pages uses `Button`.
 */
export function CtaLink({
  href,
  children,
  meta,
  icon,
  tone,
  lines = false,
  size = "md",
  fullWidth = false,
  download,
  onClick,
  className,
  "aria-describedby": describedBy,
}: {
  href: string;
  /** The label. A plain string, so the hover scramble can rewrite it. */
  children: string;
  /** Facts under the label, e.g. "2.31.21 · 60 MB". */
  meta?: string;
  /** An SVG body from `@/components/ui/icons`. */
  icon?: string;
  /** Defaults to the page tone. */
  tone?: Tone;
  /** Speed lines on the left: the single primary action of a view only. */
  lines?: boolean;
  size?: "md" | "lg";
  fullWidth?: boolean;
  /** Same-origin files only: sets the `download` attribute. */
  download?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  className?: string;
  "aria-describedby"?: string;
}) {
  return (
    <a
      href={href}
      className={cx(styles.cta, size === "lg" && styles.lg, fullWidth && styles.full, className)}
      style={tone ? ({ "--cta": `var(--${tone})` } as CSSProperties) : undefined}
      download={download || undefined}
      onClick={onClick}
      aria-describedby={describedBy}
    >
      {lines ? (
        <span className={styles.lines} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      ) : null}
      <span className={styles.body}>
        {icon ? <Icon glyph={icon} className={styles.icon} /> : null}
        <span className={styles.text}>
          <Glitch className={styles.label}>{children}</Glitch>
          {meta ? <span className={styles.meta}>{meta}</span> : null}
        </span>
      </span>
    </a>
  );
}
