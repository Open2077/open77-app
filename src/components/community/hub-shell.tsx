import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { HubRetry } from "./hub-retry";

export function HubShell({ children }: { children: ReactNode }) {
  return <><main id="main" className="hub-main"><div className="hub-wrap">
    <nav className="hub-nav" aria-label="Community">
      <Link className="hub-wordmark" href="/community">OPEN<span>{"//"}</span>77 <b>HUB</b></Link>
      <div><Link href="/resources">Explore resources</Link><Link href="/account/creations">My creations</Link>
        <Link href="/account/notifications">Notifications</Link>
        <Link href="/account/profile">Creator profile</Link>
        <Link href="/account/saved">Saved</Link>
        <Link className="hub-publish" href="/account/creations/new">Share a creation ↗</Link></div>
    </nav>{children}</div></main><SiteFooter /></>;
}
export function HubUnavailable() {
  return <div className="hub-empty" role="status"><span className="hub-kicker">CONNECTION INTERRUPTED</span>
    <h2>The hub will be right back.</h2><p>We couldn’t reach the resource catalog. Please try again shortly.</p>
    <HubRetry /></div>;
}
