import type { ReactNode } from "react";

import { Panel } from "@/components/ui/panel";
import { Display, Eyebrow } from "@/components/ui/typography";
import { Glyph } from "./kit";

import styles from "./auth-card.module.css";

/**
 * The focused stage of an auth flow: a bracketed panel with a glyph, a title,
 * the body (fields, notices) and the actions. Every state of a flow (form,
 * success, expired link) uses it, so the gate never changes shape under you.
 */
export function AuthCard({
  glyph,
  eyebrow,
  title,
  tone,
  children,
  actions,
  footer,
}: {
  glyph: string;
  eyebrow?: string;
  title: string;
  /** Tints the glyph: blue for done, red for stopped. */
  tone?: "yellow" | "blue" | "red";
  children?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Panel brackets padding="md" className={styles.card} data-auth-panel>
      <div className={styles.head}>
        <Glyph glyph={glyph} tone={tone} />
        <div className={styles.headCopy}>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <Display as="h2" size="sm">
            {title}
          </Display>
        </div>
      </div>
      {children ? <div className={styles.body}>{children}</div> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </Panel>
  );
}

/** Body copy inside an AuthCard. */
export function CardText({ children }: { children: ReactNode }) {
  return <p className={styles.text}>{children}</p>;
}
