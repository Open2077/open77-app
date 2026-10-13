"use client";

import { useRef, type HTMLAttributeReferrerPolicy, type MouseEventHandler } from "react";

import { cx } from "./cx";
import { Glitch } from "./glitch";
import { Icon } from "./icon";
import { Magnetic } from "./magnetic";
import { SmartLink } from "./smart-link";

import styles from "./button.module.css";

export type ButtonColor = "yellow" | "blue" | "red" | "neutral" | "tone";

type ButtonProps = {
  /** The label. A plain string, so the hover scramble can rewrite it. */
  children?: string;
  /** An SVG body from `./icons`. */
  icon?: string;
  iconPosition?: "left" | "right";
  /** Animated speed lines on the left, the right, both sides, or none. */
  lines?: "left" | "right" | "both" | "none";
  color?: ButtonColor;
  /** Outline instead of filled. */
  border?: boolean;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  /** Renders a link. External URLs open in a new tab unless `newTab` is false. */
  href?: string;
  /** With `href`: force or prevent a new tab (file downloads stay in the tab). */
  newTab?: boolean;
  /** With `href`: download the target instead of navigating to it. */
  download?: boolean | string;
  /** With `href`: e.g. "no-referrer" for signed download URLs. */
  referrerPolicy?: HTMLAttributeReferrerPolicy;
  type?: "button" | "submit" | "reset";
  form?: string;
  name?: string;
  value?: string;
  className?: string;
  /** Runs on buttons and on links alike (analytics, acknowledgements). */
  onClick?: MouseEventHandler<HTMLElement>;
  disabled?: boolean;
  /** Pending work: disabled, label pulsing. */
  busy?: boolean;
  title?: string;
  "aria-label"?: string;
  "aria-pressed"?: boolean;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  "aria-describedby"?: string;
  /** Test and analytics hooks pass through to the element. */
  [data: `data-${string}`]: string | boolean | undefined;
};

/** The slanted call-to-action of the design. Renders a link when given `href`. */
export function Button({
  children,
  icon,
  iconPosition = "right",
  lines = "right",
  color = "yellow",
  border = false,
  iconOnly = false,
  size = "md",
  fullWidth = false,
  href,
  newTab,
  download,
  referrerPolicy,
  type = "button",
  form,
  name,
  value,
  className,
  onClick,
  disabled = false,
  busy = false,
  ...rest
}: ButtonProps) {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const glyph = icon ? <Icon glyph={icon} /> : null;
  const label = children ? <Glitch>{children}</Glitch> : null;
  // Icon and label share a row; a lone icon or label sits directly in the
  // magnetic target, as on the home page.
  const inner =
    glyph && label ? (
      <span className={styles.content}>
        {iconPosition === "left" ? glyph : null}
        {label}
        {iconPosition === "right" ? glyph : null}
      </span>
    ) : (
      (glyph ?? label)
    );
  const content = (
    <>
      {lines !== "none" && <span className={styles.lines} data-lines={lines} aria-hidden="true" />}
      <Magnetic disabled={disabled || busy} parent={ref}>
        {busy && !(glyph && label) ? <span className={styles.content}>{inner}</span> : inner}
      </Magnetic>
    </>
  );
  const classes = cx(
    styles.btn,
    styles[color],
    size !== "md" && styles[size],
    border && styles.border,
    iconOnly && styles.iconOnly,
    fullWidth && styles.full,
    busy && styles.busy,
    className,
  );

  if (href && !disabled) {
    return (
      <SmartLink ref={ref} href={href} className={classes} onClick={onClick} newTab={newTab} download={download} referrerPolicy={referrerPolicy} {...rest}>
        {content}
      </SmartLink>
    );
  }
  return (
    <button
      ref={ref}
      type={type}
      form={form}
      name={name}
      value={value}
      className={classes}
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {content}
    </button>
  );
}
