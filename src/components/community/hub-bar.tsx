"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SlashMark } from "@/components/brand";
import { useSession } from "@/lib/account/session";

type Tab = { href: string; label: string; match: (path: string) => boolean };

const publicTabs: Tab[] = [
  { href: "/workshop", label: "Browse", match: path => path.startsWith("/workshop") && path !== "/workshop/discover" },
  { href: "/workshop/discover", label: "Discover", match: path => path === "/workshop/discover" },
];
const accountTabs: Tab[] = [
  { href: "/account/creations", label: "My creations", match: path => path.startsWith("/account/creations") },
  { href: "/account/saved", label: "Saved", match: path => path.startsWith("/account/saved") || path.startsWith("/account/subscriptions") },
  { href: "/account/notifications", label: "Inbox", match: path => path.startsWith("/account/notifications") || path.startsWith("/account/invitations") },
  { href: "/account/profile", label: "Profile", match: path => path.startsWith("/account/profile") || path.startsWith("/account/github") || path.startsWith("/account/connections") },
];

/**
 * One thin strip under the site header: where you are in the Workshop and the one
 * action that matters. Account tabs appear once a session is known, so the
 * server-rendered strip and the first client paint agree.
 */
export function HubBar() {
  const pathname = usePathname();
  const { session, ready } = useSession();
  const tabs = ready && session ? [...publicTabs, ...accountTabs] : publicTabs;
  return <div className="hub-bar"><div className="hub-bar-inner">
    <Link className="hub-bar-brand" href="/workshop"><SlashMark />WORKSHOP</Link>
    <nav className="hub-bar-tabs" aria-label="Workshop">{tabs.map(tab =>
      <Link key={tab.href} href={tab.href} {...(tab.match(pathname) ? { "aria-current": "page" as const } : {})}>{tab.label}</Link>)}</nav>
    <Link className="btn btn-primary btn-small hub-bar-cta" href="/account/creations/new">Share a creation</Link>
  </div></div>;
}
