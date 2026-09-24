import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { HubBar } from "./hub-bar";
import { HubRetry } from "./hub-retry";
import styles from "@/components/account/account-workspace.module.css";

export function HubShell({ children, wide = false, workspace = false }: { children: ReactNode; wide?: boolean; workspace?: boolean }) {
  return <><main id="main" className={`hub-main${workspace ? ` workshop-surface ${styles.workspace}` : ""}`}><HubBar />
    <div className={`hub-wrap${wide ? " hub-wrap-wide" : ""}`}>{children}</div></main><SiteFooter tone={workspace ? "dark" : undefined} /></>;
}

/** Compact page head shared by account and creator pages: eyebrow, title, one line, optional actions. */
export function HubPageHead({ kicker, title, children, actions }: { kicker: string; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return <header className="hub-page-head"><div><p className="hub-kicker">{kicker}</p><h1>{title}</h1>{children}</div>
    {actions && <div className="hub-page-head-actions">{actions}</div>}</header>;
}

export function HubUnavailable() {
  return <div className="hub-empty" role="status"><span className="hub-kicker">CONNECTION INTERRUPTED</span>
    <h2>The hub will be right back.</h2><p>We couldn’t reach the resource catalog. Please try again shortly.</p>
    <HubRetry /></div>;
}
