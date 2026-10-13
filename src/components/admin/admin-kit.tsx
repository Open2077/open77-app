"use client";

import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
  type FormEvent,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from "react";

import { Button } from "@/components/admin/admin-button";
import { Tag } from "@/components/ui/chip";
import { cx } from "@/components/ui/cx";
import { Table } from "@/components/ui/data";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Loader, Notice } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { arrowDown01, arrowLeft01, arrowRight01, search01 } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";

import styles from "./admin-kit.module.css";

/**
 * The building blocks every console view shares, drawn from the site primitives:
 * a titled panel, toolbars, search, status tags, dense tables, pagers, empty and
 * loading states. Views compose these; none of them style themselves from
 * scratch, so the whole console reads as one tool.
 */

/** Table density chosen in the workspace top bar; tables read it. */
export const DensityContext = createContext(true);

/** Cell and row classes for the plain <tr>/<td> markup inside {@link AdminTable}. */
export const cell = {
  actions: styles.actionsCell,
  nowrap: styles.nowrap,
  num: styles.num,
  top: styles.top,
  muted: styles.mutedRow,
  active: styles.activeRow,
  wrap: styles.wrapCell,
} as const;

/** A titled surface: the unit of every console view. */
export function AdminPanel({
  title,
  icon,
  meta,
  actions,
  children,
  footnote,
  brackets = false,
  level = 2,
  as = "section",
  label,
  className,
  bodyClassName,
  hook,
  titleRef,
}: {
  title?: ReactNode;
  /** A glyph from `ui/icons`; without one, the title gets the design's `//` mark. */
  icon?: string;
  /** Small mono note beside the title: a count, a version, a source. */
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  footnote?: ReactNode;
  /** The tone corners: for the main panel of a view. */
  brackets?: boolean;
  level?: 2 | 3;
  as?: ElementType;
  /** Accessible name of the region when the title alone is not enough. */
  label?: string;
  className?: string;
  bodyClassName?: string;
  /** Stable `data-admin-panel` value for tests and deep links. */
  hook?: string;
  /** Focus target: the title becomes programmatically focusable. */
  titleRef?: Ref<HTMLHeadingElement>;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <Panel as={as} padding="none" brackets={brackets} className={cx(styles.panel, className)} aria-label={label} data-admin-panel={hook ?? ""}>
      {title || actions ? (
        <header className={styles.head}>
          {title ? (
            <div className={styles.heading}>
              <Heading ref={titleRef} tabIndex={titleRef ? -1 : undefined} className={cx(styles.title, level === 3 && styles.titleSmall)}>
                {icon ? (
                  <Icon glyph={icon} className={styles.titleIcon} />
                ) : (
                  <span className={styles.slashes} aria-hidden="true">
                    {"//"}
                  </span>
                )}
                <span>{title}</span>
              </Heading>
              {meta ? <span className={styles.meta}>{meta}</span> : null}
            </div>
          ) : (
            <span />
          )}
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </header>
      ) : null}
      {children ? <div className={cx(styles.body, bodyClassName)}>{children}</div> : null}
      {footnote ? <Footnote className={styles.panelFoot}>{footnote}</Footnote> : null}
    </Panel>
  );
}

/** A row of controls above a table: filters on one side, search, counts and actions on the other. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.toolbar, className)}>{children}</div>;
}

/** A cluster inside a {@link Toolbar}. */
export function ToolbarGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.toolbarGroup, className)}>{children}</div>;
}

/** Filter chips, announced as one group. */
export function Filters({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.filters} role="group" aria-label={label}>
      {children}
    </div>
  );
}

/** The search box of a view: a slanted field with the search glyph. */
export function SearchBox({
  value,
  onChange,
  placeholder,
  label,
  maxLength,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Accessible name (the box has no visible label). */
  label: string;
  maxLength?: number;
  className?: string;
}) {
  return (
    <Input
      icon={search01}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={label}
      spellCheck={false}
      autoComplete="off"
      maxLength={maxLength}
      className={cx(styles.search, className)}
    />
  );
}

/** "14 accounts matched": a quiet Nippo count. */
export function Count({ children }: { children: ReactNode }) {
  return <span className={styles.count}>{children}</span>;
}

/** Fine print under a panel: what an action really does, what it does not. */
export function Footnote({
  children,
  className,
  role,
}: {
  children: ReactNode;
  className?: string;
  role?: "status";
}) {
  return (
    <p className={cx(styles.footnote, className)} role={role}>
      {children}
    </p>
  );
}

type Status = "ok" | "warn" | "danger" | "neutral" | "live" | "accent";

const STATUS: Record<Status, { tone: "yellow" | "blue" | "red" | "neutral"; variant: "outline" | "solid" }> = {
  ok: { tone: "blue", variant: "outline" },
  warn: { tone: "yellow", variant: "outline" },
  danger: { tone: "red", variant: "outline" },
  neutral: { tone: "neutral", variant: "outline" },
  live: { tone: "blue", variant: "solid" },
  accent: { tone: "red", variant: "solid" },
};

/**
 * An inline state. One vocabulary for the whole console: blue is healthy,
 * yellow wants attention, red is a restriction or a danger, neutral is a fact.
 */
export function StatusTag({ status, children, title }: { status: Status; children: ReactNode; title?: string }) {
  const { tone, variant } = STATUS[status];
  return (
    <Tag tone={tone} variant={variant} title={title}>
      {children}
    </Tag>
  );
}

/** Monospace value: ids, hashes, timestamps, endpoints. */
export function Mono({
  children,
  tone,
  title,
  className,
}: {
  children: ReactNode;
  tone?: "dim" | "faint";
  title?: string;
  className?: string;
}) {
  return (
    <span className={cx(styles.mono, tone && styles[tone], className)} title={title}>
      {children}
    </span>
  );
}

/** The first line of a cell: the thing the row is about. */
export function Primary({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span className={styles.primary} title={title}>
      {children}
    </span>
  );
}

/** A secondary line under {@link Primary}: e-mail, id, endpoint. */
export function Sub({ children, title, plain = false }: { children: ReactNode; title?: string; plain?: boolean }) {
  return (
    <span className={cx(styles.sub, plain && styles.subPlain)} title={title}>
      {children}
    </span>
  );
}

/** Stacked tags and notes inside one cell. */
export function Stack({ children, row = false }: { children: ReactNode; row?: boolean }) {
  return <span className={cx(styles.stack, row && styles.stackRow)}>{children}</span>;
}

/**
 * A console table: the site table, at the density picked in the top bar, with
 * a minimum width so narrow screens scroll it sideways instead of crushing it.
 */
export function AdminTable({
  caption,
  children,
  minWidth = "46rem",
  className,
}: {
  caption: string;
  children: ReactNode;
  minWidth?: string;
  className?: string;
}) {
  const compact = useContext(DensityContext);
  return (
    <div className={cx(styles.tableHost, className)} style={{ "--table-min": minWidth } as CSSProperties}>
      <Table caption={caption} dense={compact}>
        {children}
      </Table>
    </div>
  );
}

/** Previous / next under a paged table, with where the reader stands. */
export function Pager({
  summary,
  previous,
  next,
  previousLabel = "Previous",
  nextLabel = "Next",
}: {
  summary: ReactNode;
  previous: { disabled: boolean; onClick: () => void };
  next: { disabled: boolean; onClick: () => void };
  previousLabel?: string;
  nextLabel?: string;
}) {
  return (
    <div className={styles.pager}>
      <span className={styles.count}>{summary}</span>
      <div className={styles.pagerControls}>
        <Button size="sm" color="neutral" border lines="none" icon={arrowLeft01} iconPosition="left" disabled={previous.disabled} onClick={previous.onClick}>
          {previousLabel}
        </Button>
        <Button size="sm" color="neutral" border lines="none" icon={arrowRight01} disabled={next.disabled} onClick={next.onClick}>
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}

/** A pending list: the terminal-style loader over a ghost of the table to come. */
export function LoadingBlock({ label, rows = 4 }: { label: string; rows?: number }) {
  return (
    <div className={styles.loading}>
      <Loader label={label} />
      <div className={styles.skeleton} aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <span key={index} style={{ "--row": index } as CSSProperties}>
            <i />
            <i />
            <i />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Nothing in this list: say so plainly, and offer the way out when there is one. */
export function EmptyBlock({ children, icon, action }: { children: ReactNode; icon?: string; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyMark} aria-hidden="true">
        {icon ? <Icon glyph={icon} /> : "//"}
      </span>
      <p className={styles.emptyText}>{children}</p>
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </div>
  );
}

/** A small slanted icon-only control for cells: copy, open, dismiss. */
export function IconAction({
  glyph,
  label,
  onClick,
  active = false,
  disabled = false,
  title,
}: {
  glyph: string;
  /** Accessible name. */
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Confirmed state (copied, saved). */
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={styles.iconAction}
      data-active={active || undefined}
      onClick={onClick}
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
    >
      <Icon glyph={glyph} />
    </button>
  );
}

/** A link-styled button inside a cell: open a record, group by a signature. */
export function TextAction({
  children,
  onClick,
  title,
  mono = true,
}: {
  children: ReactNode;
  onClick: MouseEventHandler<HTMLButtonElement>;
  title?: string;
  mono?: boolean;
}) {
  return (
    <button type="button" className={cx(styles.textAction, mono && styles.mono)} onClick={onClick} title={title}>
      {children}
    </button>
  );
}

/** Untrusted multi-line text (reports, changelogs, inspection snapshots): never rendered as markup. */
export function Preformatted({
  children,
  label,
  className,
  ...rest
}: {
  children: ReactNode;
  label?: string;
  className?: string;
  [attribute: `data-${string}`]: string | undefined;
}) {
  return (
    <pre className={cx(styles.pre, className)} tabIndex={label ? 0 : undefined} aria-label={label} {...rest}>
      {children}
    </pre>
  );
}

/** A confirmed outcome, announced politely. */
export function SuccessStrip({ message }: { message: ReactNode }) {
  if (!message) return null;
  return <Notice kind="success">{message}</Notice>;
}

/** Labelled fields laid out in a responsive grid. */
export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.formGrid, className)}>{children}</div>;
}

/** Spans a {@link FormGrid} row. */
export function Span({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.span, className)}>{children}</div>;
}

/** The buttons under a form. */
export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.formActions, className)}>{children}</div>;
}

/**
 * An inline form that opens inside a panel (issue a ban, record a verdict,
 * decide a request): framed in the tone so it reads as "you are about to act".
 */
export function FormPanel({
  title,
  children,
  onSubmit,
  danger = false,
}: {
  title: ReactNode;
  children: ReactNode;
  onSubmit: (event: FormEvent) => void;
  /** The action restricts someone: framed in red whatever the page tone. */
  danger?: boolean;
}) {
  return (
    <form className={cx(styles.formPanel, danger && styles.formDanger)} onSubmit={onSubmit}>
      <SubHeading as="h3">{title}</SubHeading>
      {children}
    </form>
  );
}

/** A collapsible block (native <details>): secondary evidence, rarely used controls. */
export function Disclosure({
  summary,
  children,
  open,
  className,
}: {
  summary: ReactNode;
  children: ReactNode;
  open?: boolean;
  className?: string;
}) {
  return (
    <details className={cx(styles.disclosure, className)} open={open}>
      <summary className={styles.disclosureSummary}>
        <span>{summary}</span>
        <Icon glyph={arrowDown01} className={styles.disclosureChevron} />
      </summary>
      <div className={styles.disclosureBody}>{children}</div>
    </details>
  );
}

/** A sub-heading inside a panel. */
export function SubHeading({ children, as: Tag = "h3", className }: { children: ReactNode; as?: ElementType; className?: string }) {
  return <Tag className={cx(styles.subHeading, className)}>{children}</Tag>;
}

/**
 * The site dialog, with two guarantees a confirmation needs: while `locked()`
 * answers true (a mutation is in flight) Escape, the close button and the
 * backdrop cannot dismiss it, and `focusFooter` puts focus on the first footer
 * action (Cancel) when it opens instead of the close cross.
 */
export const GuardedDialog = forwardRef<
  DialogHandle,
  ComponentPropsWithoutRef<typeof Dialog> & { locked: () => boolean; focusFooter?: boolean }
>(function GuardedDialog({ locked, focusFooter = false, onClose, children, ...props }, ref) {
  const inner = useRef<DialogHandle>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const isLocked = useRef(locked);
  useEffect(() => {
    isLocked.current = locked;
  });
  useImperativeHandle(ref, () => ({
    open() {
      if (!inner.current?.isOpen) inner.current?.open();
      if (focusFooter) marker.current?.closest("dialog")?.querySelector<HTMLElement>("footer button")?.focus();
    },
    close: () => inner.current?.close(),
    get isOpen() {
      return Boolean(inner.current?.isOpen);
    },
  }), [focusFooter]);
  useEffect(() => {
    // `cancel` does not bubble, but it does pass through the capture phase.
    function block(event: Event) {
      const target = event.target;
      if (target instanceof HTMLDialogElement && marker.current && target.contains(marker.current) && isLocked.current()) {
        event.preventDefault();
      }
    }
    document.addEventListener("cancel", block, true);
    return () => document.removeEventListener("cancel", block, true);
  }, []);
  return (
    <Dialog
      ref={inner}
      {...props}
      onClose={() => {
        // The close cross and the backdrop close directly; put it back while locked.
        if (isLocked.current()) inner.current?.open();
        else onClose?.();
      }}
    >
      <span ref={marker} hidden />
      {children}
    </Dialog>
  );
});
