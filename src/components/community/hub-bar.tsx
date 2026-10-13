"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { add01 } from "@/components/ui/icons";
import { useSession } from "@/lib/account/session";

import styles from "./hub-bar.module.css";

type Tab = { href: string; label: string; match: (path: string) => boolean };

const publicTabs: Tab[] = [
  { href: "/workshop", label: "Discover", match: path => path === "/workshop" },
  { href: "/workshop/browse", label: "Browse", match: path => path.startsWith("/workshop/") },
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
  return (
    <div className={styles.bar} data-hub-bar>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/workshop">
          <span className={styles.mark} aria-hidden="true">
            {"//"}
          </span>
          Workshop
        </Link>
        <nav className={styles.tabs} aria-label="Workshop">
          <ul className={styles.list}>
            {tabs.map(tab => (
              <li key={tab.href}>
                <Link className={styles.tab} href={tab.href} {...(tab.match(pathname) ? { "aria-current": "page" as const } : {})}>
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.cta}>
          <Button className={styles.ctaWide} size="sm" color="blue" lines="none" icon={add01} iconPosition="left" href="/account/creations/new">
            Share a creation
          </Button>
          <Button className={styles.ctaIcon} size="sm" color="blue" lines="none" icon={add01} iconOnly href="/account/creations/new" aria-label="Share a creation" />
        </div>
      </div>
    </div>
  );
}
