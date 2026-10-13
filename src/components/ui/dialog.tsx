"use client";

import { forwardRef, useId, useImperativeHandle, useRef, type ReactNode, type RefObject } from "react";

import { cx } from "./cx";
import { Icon } from "./icon";
import { cancel01 } from "./icons";

import styles from "./dialog.module.css";

export type DialogHandle = {
  open(): void;
  close(): void;
  readonly isOpen: boolean;
};

/**
 * Modal built on the native <dialog>: focus trapping, Escape and the top layer
 * come from the browser. Open it through the ref (`dialog.current?.open()`).
 * Clicking the backdrop closes it.
 */
export const Dialog = forwardRef<
  DialogHandle,
  {
    title: ReactNode;
    /** Small label above the title. */
    eyebrow?: ReactNode;
    children: ReactNode;
    /** Actions row, right-aligned at the bottom. */
    footer?: ReactNode;
    size?: "sm" | "md" | "lg";
    onClose?: () => void;
    /**
     * False while an action is running: Escape, the backdrop and the close
     * button stop closing the dialog until the action settles.
     */
    dismissible?: boolean;
    /** Element to focus on open (e.g. Cancel on a destructive confirmation); the first control otherwise. */
    initialFocus?: RefObject<HTMLElement | null>;
    className?: string;
  }
>(function Dialog(
  { title, eyebrow, children, footer, size = "md", onClose, dismissible = true, initialFocus, className },
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useImperativeHandle(ref, () => ({
    open: () => {
      dialogRef.current?.showModal();
      initialFocus?.current?.focus();
    },
    close: () => dialogRef.current?.close(),
    get isOpen() {
      return Boolean(dialogRef.current?.open);
    },
  }));

  return (
    <dialog
      ref={dialogRef}
      className={cx(styles.dialog, styles[size], className)}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        if (!dismissible) event.preventDefault();
      }}
      onClick={(event) => {
        if (dismissible && event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      <div className={styles.frame}>
        <header className={styles.head}>
          <div>
            {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            disabled={!dismissible}
            onClick={() => dialogRef.current?.close()}
          >
            <Icon glyph={cancel01} />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.foot}>{footer}</footer> : null}
      </div>
    </dialog>
  );
});
