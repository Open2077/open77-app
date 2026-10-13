import type { CSSProperties, ElementType, ReactNode } from "react";

import { cx } from "./cx";

import styles from "./panel.module.css";

type Tone = "yellow" | "blue" | "red";

/**
 * A surface for grouped content.
 *
 * - `shape="frame"` (default): hairline rectangle; `brackets` adds the skewed
 *   tone corners of the design. Use it for anything tall: forms, lists, panes.
 * - `shape="slant"`: the parallelogram card of the home page. Only for short
 *   blocks (under ~220px), since the slant offset grows with the height.
 */
export function Panel({
  children,
  as: Tag = "div",
  shape = "frame",
  variant = "surface",
  tone,
  brackets = false,
  interactive = false,
  padding = "md",
  className,
  style,
  id,
  ...rest
}: {
  children: ReactNode;
  as?: ElementType;
  shape?: "frame" | "slant";
  /** `surface`: raised fill; `outline`: tone border, no fill; `ghost`: no fill, hairline. */
  variant?: "surface" | "outline" | "ghost";
  tone?: Tone;
  brackets?: boolean;
  /** Hover and focus states, for panels that are a link or a button. */
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  style?: CSSProperties;
  id?: string;
  [attribute: `data-${string}` | `aria-${string}`]: unknown;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
  type?: "button";
}) {
  return (
    <Tag
      id={id}
      className={cx(
        styles.panel,
        styles[shape],
        styles[variant],
        styles[`pad-${padding}`],
        brackets && styles.brackets,
        interactive && styles.interactive,
        className,
      )}
      style={tone ? ({ ...style, "--tone": `var(--${tone})` } as CSSProperties) : style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
