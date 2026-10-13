import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { cx } from "./cx";
import { Icon } from "./icon";
import { arrowDown01 } from "./icons";

import styles from "./field.module.css";

/**
 * A labelled form control. Wires the label, hint and error to the control
 * through ids, so screen readers announce them; the child control receives
 * `id`, `aria-describedby` and `aria-invalid`.
 */
export function Field({
  label,
  hint,
  error,
  children,
  optional = false,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
  optional?: boolean;
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children)
    ? cloneElement(children, { id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })
    : children;
  return (
    <div className={cx(styles.field, error ? styles.invalid : undefined, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional ? <span className={styles.optional}>Optional</span> : null}
      </label>
      {control}
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** A glyph from `./icons` shown inside the field, before the text. */
  icon?: string;
  /** Content after the text: a unit, a keyboard hint, a button. */
  trailing?: ReactNode;
  inputSize?: "md" | "lg";
};

/** Single-line text input in a slanted frame. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { icon, trailing, inputSize = "md", className, ...props },
  ref,
) {
  return (
    <span className={cx(styles.control, styles.slanted, inputSize === "lg" && styles.lg, className)}>
      {icon ? <Icon glyph={icon} className={styles.leading} /> : null}
      <input ref={ref} className={styles.input} {...props} />
      {trailing ? <span className={styles.trailing}>{trailing}</span> : null}
    </span>
  );
});

/** Multi-line text. A straight frame: a slant over many lines would drift sideways. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 5, ...props },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cx(styles.textarea, className)} {...props} />;
});

/** Native select in a slanted frame, keyboard and screen-reader behaviour intact. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { compact?: boolean }>(
  function Select({ className, children, compact = false, ...props }, ref) {
    return (
      <span className={cx(styles.control, styles.slanted, styles.selectWrap, compact && styles.compact, className)}>
        <select ref={ref} className={styles.select} {...props}>
          {children}
        </select>
        <Icon glyph={arrowDown01} className={styles.chevron} />
      </span>
    );
  },
);

/** Checkbox with its label; the box is a skewed square in the tone. */
export function Checkbox({
  children,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { children: ReactNode }) {
  return (
    <label className={cx(styles.check, className)}>
      <input type="checkbox" className={styles.checkInput} {...props} />
      <span className={styles.box} aria-hidden="true" />
      <span className={styles.checkLabel}>{children}</span>
    </label>
  );
}

/** On/off switch for settings that apply immediately. */
export function Switch({
  children,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { children: ReactNode }) {
  return (
    <label className={cx(styles.check, className)}>
      <input type="checkbox" role="switch" className={styles.checkInput} {...props} />
      <span className={styles.track} aria-hidden="true" />
      <span className={styles.checkLabel}>{children}</span>
    </label>
  );
}
