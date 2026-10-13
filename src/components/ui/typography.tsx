import { Fragment, type CSSProperties, type ElementType, type ReactNode } from "react";

import { cx } from "./cx";

import styles from "./typography.module.css";

type Tone = "yellow" | "blue" | "red";

/** Wide-tracked capitals in Nippo: section labels, kickers, table heads. */
export function Eyebrow({
  children,
  index,
  tone,
  muted = false,
  as: Tag = "p",
  className,
}: {
  children: ReactNode;
  /** A running number shown before the label ("01"). */
  index?: number;
  tone?: Tone;
  /** Grey instead of the page tone. */
  muted?: boolean;
  as?: ElementType;
  className?: string;
}) {
  return (
    <Tag
      className={cx(styles.eyebrow, muted && styles.muted, className)}
      style={tone ? ({ "--tone": `var(--${tone})` } as CSSProperties) : undefined}
    >
      {index !== undefined ? <span className={styles.index}>{String(index).padStart(2, "0")}</span> : null}
      {children}
    </Tag>
  );
}

/**
 * Display title in Druk Text Wide: italic capitals, tight tracking.
 *
 * `lines` breaks the title the way the design sets it, one word group per
 * line; `accent` picks the lines drawn in the page tone. `glitch` adds the RGB
 * split of the home page titles (reserved for the main title of a page).
 */
export function Display({
  children,
  lines,
  accent = [],
  size = "lg",
  tone,
  glitch = false,
  as: Tag = "h2",
  className,
  id,
}: {
  children?: ReactNode;
  lines?: string[];
  accent?: number[];
  size?: "xl" | "lg" | "md" | "sm" | "xs";
  tone?: Tone | "text";
  glitch?: boolean;
  as?: ElementType;
  className?: string;
  id?: string;
}) {
  const style = tone ? ({ "--tone": tone === "text" ? "var(--text-primary)" : `var(--${tone})` } as CSSProperties) : undefined;
  return (
    <Tag id={id} className={cx(styles.display, styles[size], className)} style={style}>
      {lines
        ? lines.map((line, index) => (
            // The lines are blocks; the space keeps the text a sentence for
            // screen readers, search engines and copy-paste.
            <Fragment key={`${line}-${index}`}>
              {index > 0 ? " " : null}
              <span
                className={cx(styles.line, accent.includes(index) && styles.accent)}
                data-glitch={glitch ? line : undefined}
              >
                {line}
              </span>
            </Fragment>
          ))
        : children}
    </Tag>
  );
}

/** The paragraph under a title: larger, softer, balanced. */
export function Lead({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx(styles.lead, className)}>{children}</p>;
}
