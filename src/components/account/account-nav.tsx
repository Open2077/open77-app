"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { Glitch } from "@/components/ui/glitch";
import { Icon } from "@/components/ui/icon";
import {
  bookmark01,
  dashboardSquare01,
  key01,
  layers01,
  link01,
  notification03,
  user,
  userAdd01,
  star,
} from "@/components/ui/icons";

import styles from "./account-nav.module.css";

type Item = { href: string; label: string; glyph: string; match?: (path: string) => boolean };

const GROUPS: Array<{ label: string; items: Item[] }> = [
  {
    label: "Account",
    items: [
      { href: "/account", label: "Overview", glyph: dashboardSquare01, match: (path) => path === "/account" },
      { href: "/account/profile", label: "Profile", glyph: user },
      { href: "/account/keys", label: "License keys", glyph: key01 },
    ],
  },
  {
    label: "Collection",
    items: [
      { href: "/account/saved", label: "Saved", glyph: bookmark01 },
      { href: "/account/subscriptions", label: "Subscriptions", glyph: star },
    ],
  },
  {
    label: "Inbox",
    items: [
      { href: "/account/notifications", label: "Notifications", glyph: notification03 },
      { href: "/account/invitations", label: "Invitations", glyph: userAdd01 },
    ],
  },
  {
    label: "Creator",
    items: [
      { href: "/account/creations", label: "Creations", glyph: layers01 },
      {
        href: "/account/connections",
        label: "Connections",
        glyph: link01,
        match: (path) => path.startsWith("/account/connections") || path.startsWith("/account/github"),
      },
    ],
  },
];

/** Running numbers across the groups ("01" … "09"), as on the site menu. */
const NUMBERED = GROUPS.map((group, groupIndex) => ({
  ...group,
  items: group.items.map((item, itemIndex) => ({
    ...item,
    number: GROUPS.slice(0, groupIndex).reduce((total, previous) => total + previous.items.length, 0) + itemIndex + 1,
  })),
}));

/** The workspace's section navigation: grouped, numbered, the current page in the tone. */
export function AccountNav() {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  // As a scrolling strip (narrow screens), bring the current section into view.
  useEffect(() => {
    const nav = ref.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
  }, [pathname]);
  return (
    <nav ref={ref} className={styles.nav} aria-label="Account sections">
      {NUMBERED.map((group) => (
        <div key={group.label} className={styles.group}>
          <p className={styles.groupLabel} aria-hidden="true">
            {`// ${group.label}`}
          </p>
          <ul className={styles.list}>
            {group.items.map((item) => {
              const current = item.match ? item.match(pathname) : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <NextLink href={item.href} className={styles.link} aria-current={current ? "page" : undefined}>
                    <span className={styles.index}>{String(item.number).padStart(2, "0")}</span>
                    <Icon glyph={item.glyph} className={styles.glyph} />
                    <Glitch className={styles.label}>{item.label}</Glitch>
                  </NextLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
