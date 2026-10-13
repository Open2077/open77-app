"use client";

import NextLink from "next/link";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SyntheticEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Loader, Meter, Notice } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { arrowDown01, arrowRight01, arrowUpRight01 } from "@/components/ui/icons";
import { Display, Eyebrow } from "@/components/ui/typography";

import styles from "./kit.module.css";

/*
 * The account area's building blocks, on top of the shared primitives: a
 * titled block, hairline rows, state tags, pagers, confirmation dialogs and
 * disclosures. Everything the dashboard, the keymaster and the creator tools
 * have in common lives here so the whole workspace reads as one surface.
 */

/** A padlock in the Hugeicons stroke style (the shared set only has a keyhole). */
export const padlock =
  '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M4.268 18.845c.225 1.67 1.608 2.979 3.292 3.056c1.416.065 2.855.099 4.44.099s3.024-.034 4.44-.1c1.684-.076 3.067-1.385 3.292-3.055c.147-1.09.268-2.207.268-3.345s-.121-2.255-.268-3.345c-.225-1.67-1.608-2.979-3.292-3.056A95 95 0 0 0 12 9c-1.585 0-3.024.034-4.44.1c-1.684.076-3.067 1.385-3.292 3.055C4.12 13.245 4 14.362 4 15.5s.121 2.255.268 3.345Z"/><path d="M7.5 9V6.5a4.5 4.5 0 0 1 9 0V9m-4.5 6.5v1.5"/></g>';

type Tone = "yellow" | "blue" | "red" | "neutral";

/** A titled group of content inside an account page: a tone rule, a heading, actions. */
export function Block({
  id,
  index,
  eyebrow,
  title,
  lead,
  actions,
  children,
  className,
  headingLevel = 2,
}: {
  id?: string;
  index?: number;
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const fallbackId = useId();
  const headingId = `${id ?? fallbackId}-title`;
  return (
    <section id={id} className={cx(styles.block, className)} aria-labelledby={headingId} tabIndex={id ? -1 : undefined}>
      <header className={styles.blockHead}>
        <div className={styles.blockCopy}>
          {eyebrow ? <Eyebrow index={index}>{eyebrow}</Eyebrow> : null}
          <Display as={`h${headingLevel}`} size="xs" id={headingId}>
            {title}
          </Display>
          {lead ? <p className={styles.blockLead}>{lead}</p> : null}
        </div>
        {actions ? <div className={styles.blockActions}>{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

/** A hairline list of rows. */
export function Rows({ children, label, className }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <ul className={cx(styles.rows, className)} aria-label={label}>
      {children}
    </ul>
  );
}

/**
 * One entry of a list: an optional leading glyph, a meta line in Nippo, a
 * title, a description, extra content, and an aside for tags and actions.
 * `marker` draws the skewed tone tick that flags something new or selected.
 */
export function Row({
  leading,
  meta,
  title,
  titleAs: TitleTag = "h3",
  description,
  aside,
  children,
  marker = false,
  muted = false,
  className,
  as: Tag = "li",
}: {
  leading?: ReactNode;
  meta?: ReactNode;
  title?: ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  description?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  marker?: boolean;
  muted?: boolean;
  className?: string;
  as?: "li" | "article" | "div";
}) {
  return (
    <Tag className={cx(styles.row, marker && styles.marked, muted && styles.muted, leading ? styles.withLeading : undefined, className)}>
      {leading ? <span className={styles.rowLeading}>{leading}</span> : null}
      <div className={styles.rowMain}>
        {meta ? <p className={styles.rowMeta}>{meta}</p> : null}
        {title ? <TitleTag className={styles.rowTitle}>{title}</TitleTag> : null}
        {description ? <div className={styles.rowText}>{description}</div> : null}
        {children}
      </div>
      {aside ? <div className={styles.rowAside}>{aside}</div> : null}
    </Tag>
  );
}

/** A glyph in a small skewed tile, leading a row or a card. */
export function Glyph({ glyph, tone }: { glyph: string; tone?: "yellow" | "blue" | "red" | "neutral" }) {
  return (
    <span
      className={cx(styles.glyph, tone === "neutral" && styles.glyphNeutral)}
      style={tone && tone !== "neutral" ? ({ "--tone": `var(--${tone})` } as CSSProperties) : undefined}
      aria-hidden="true"
    >
      <Icon glyph={glyph} />
    </span>
  );
}

const STATE_TONES: Record<string, Tone> = {
  published: "blue",
  accepted: "blue",
  approved: "blue",
  active: "blue",
  verified: "blue",
  connected: "blue",
  owner: "yellow",
  maintainer: "neutral",
  submitted: "yellow",
  pending: "yellow",
  pending_review: "yellow",
  in_review: "yellow",
  processing: "yellow",
  receiving: "yellow",
  importing: "yellow",
  uploading: "yellow",
  uploaded: "yellow",
  queued: "yellow",
  open: "yellow",
  unread: "yellow",
  rejected: "red",
  suspended: "red",
  revoked: "red",
  failed: "red",
  dead: "red",
  declined: "red",
  expired: "red",
  removed: "red",
  draft: "neutral",
  archived: "neutral",
  read: "neutral",
};

/** A Nippo state label tinted by what the state means: live, waiting, refused, inert. */
export function StateTag({ state, label, tone }: { state: string; label?: string; tone?: Tone }) {
  const resolved = tone ?? STATE_TONES[state.toLowerCase()] ?? "neutral";
  return (
    <span
      className={cx(styles.state, resolved === "neutral" && styles.stateNeutral)}
      style={resolved !== "neutral" ? ({ "--tone": `var(--${resolved})` } as CSSProperties) : undefined}
    >
      {label ?? state.replaceAll("_", " ")}
    </span>
  );
}

/** Previous / next / refresh controls under a paginated list. */
export function Pager({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <nav className={cx(styles.pager, className)} aria-label={label}>
      {children}
    </nav>
  );
}

/** A row of actions that wraps on narrow screens. */
export function Actions({ children, className, align = "start" }: { children: ReactNode; className?: string; align?: "start" | "end" | "between" }) {
  return <div className={cx(styles.actions, styles[`align-${align}`], className)}>{children}</div>;
}

/** Secondary prose: explanations, fine print, policy reminders. */
export function Fine({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx(styles.fine, className)}>{children}</p>;
}

/** An inline text link with an arrow; external links open in a new tab and say so. */
export function ArrowLink({
  href,
  children,
  external = false,
  className,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <span>{children}</span>
      <Icon glyph={external ? arrowUpRight01 : arrowRight01} />
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </>
  );
  if (external || href.startsWith("http"))
    return (
      <a className={cx(styles.arrowLink, className)} href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  return (
    <NextLink className={cx(styles.arrowLink, className)} href={href}>
      {content}
    </NextLink>
  );
}

/**
 * A disclosure in the design: a Nippo summary with a turning chevron. Keeps
 * the native <details> semantics, so `open` / `onToggle` behave as before.
 */
export function Disclosure({
  summary,
  children,
  open,
  onToggle,
  hidden,
  className,
  tone,
}: {
  summary: ReactNode;
  children: ReactNode;
  open?: boolean;
  onToggle?: (event: SyntheticEvent<HTMLDetailsElement>) => void;
  hidden?: boolean;
  className?: string;
  tone?: "plain" | "framed";
}) {
  return (
    <details className={cx(styles.disclosure, tone === "framed" && styles.framed, className)} open={open} onToggle={onToggle} hidden={hidden}>
      <summary className={styles.summary}>
        <span>{summary}</span>
        <Icon glyph={arrowDown01} className={styles.chevron} />
      </summary>
      <div className={styles.disclosureBody}>{children}</div>
    </details>
  );
}

/** A native file picker in the design's frame. Pass it as the child of a `Field`. */
export const FileInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(function FileInput(
  { className, ...props },
  ref,
) {
  return <input ref={ref} type="file" className={cx(styles.file, className)} {...props} />;
});

/** Upload progress: the slanted meter with its percentage. */
export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.progress}>
      <Meter value={value} label={label} />
      <span className={styles.progressValue} aria-hidden="true">
        {Math.round(value)}%
      </span>
    </div>
  );
}

/** The pending state of an account view. */
export function Pending({ label }: { label: string }) {
  return <Loader label={label} className={styles.pending} />;
}

/**
 * A confirmation in a modal: what will happen, then an explicit confirm.
 * Controlled through `open`; Escape, the backdrop and Cancel all call
 * `onClose`. The body renders only while open, so a closed dialog never holds
 * a live alert.
 */
export function ConfirmDialog({
  open,
  onClose,
  eyebrow,
  title,
  children,
  confirmLabel,
  busyLabel,
  cancelLabel = "Cancel",
  onConfirm,
  busy = false,
  danger = false,
  confirmDisabled = false,
  error,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  busy?: boolean;
  danger?: boolean;
  confirmDisabled?: boolean;
  error?: ReactNode;
}) {
  const dialog = useRef<DialogHandle>(null);
  useEffect(() => {
    const handle = dialog.current;
    if (!handle) return;
    if (open && !handle.isOpen) handle.open();
    if (!open && handle.isOpen) handle.close();
  }, [open]);
  return (
    <Dialog
      ref={dialog}
      size="sm"
      eyebrow={eyebrow}
      title={title}
      onClose={() => {
        if (open) onClose();
      }}
      footer={
        open ? (
          <>
            <Button lines="none" color="neutral" border size="sm" disabled={busy} onClick={() => dialog.current?.close()}>
              {cancelLabel}
            </Button>
            <Button
              key={busy && busyLabel ? busyLabel : confirmLabel}
              lines="none"
              color={danger ? "red" : "yellow"}
              size="sm"
              busy={busy}
              disabled={confirmDisabled}
              onClick={onConfirm}
            >
              {busy && busyLabel ? busyLabel : confirmLabel}
            </Button>
          </>
        ) : null
      }
    >
      {open ? (
        <div className={styles.dialogBody}>
          {children}
          {error ? <Notice kind="danger">{error}</Notice> : null}
        </div>
      ) : null}
    </Dialog>
  );
}

/** Local date and time, or a dash when the master sent nothing usable. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

/** A short calendar date in the visitor's locale settings, English month names. */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
