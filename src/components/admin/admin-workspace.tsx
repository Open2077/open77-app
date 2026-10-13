"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/admin/admin-button";
import { Chip } from "@/components/ui/chip";
import { Avatar, Breadcrumbs } from "@/components/ui/data";
import { Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import {
  activity01,
  arrowLeft01,
  arrowRight01,
  arrowUpRight01,
  beaker,
  bug01,
  cancel01,
  checkList,
  checkmarkBadge01,
  dashboardSquare01,
  flag02,
  hourglass,
  key01,
  menu01,
  packageBox,
  puzzle,
  refresh,
  search01,
  serverStack01,
  serverStack02,
  shield01,
  store01,
  ticket01,
  userBlock01,
  users,
} from "@/components/ui/icons";
import { Display, Eyebrow } from "@/components/ui/typography";
import { AdminSpinner, useAdminActivity } from "./admin-activity";
import { DensityContext } from "./admin-kit";

import styles from "./admin-workspace.module.css";

const GROUPS = ["Workspace", "Network", "Access & safety"] as const;

const NAV = [
  { href: "/admin", label: "Overview", group: "Workspace", icon: dashboardSquare01, note: "Your network, at a glance. Live data and the latest platform activity." },
  { href: "/admin/dev-tracker", label: "Dev Tracker", group: "Workspace", icon: checkList, note: "Review community ideas, publish progress and keep discussions constructive." },
  { href: "/admin/incidents", label: "Crash reports", group: "Workspace", icon: bug01, note: "Investigate player reports, correlate incidents and inspect the evidence." },
  { href: "/admin/servers", label: "Servers", group: "Network", icon: serverStack01, note: "Connected worlds, player capacity and heartbeat observations." },
  { href: "/admin/releases", label: "Releases", group: "Network", icon: packageBox, note: "Published channels, trusted builds and controlled release operations." },
  { href: "/admin/mods", label: "Mod library", group: "Network", icon: puzzle, note: "Review provenance, redistribution rights and the mod allowlist." },
  { href: "/admin/mods/requests", label: "Mod queue", group: "Network", icon: hourglass, note: "Review incoming mod submissions and make explicit approval decisions." },
  { href: "/admin/resources", label: "Workshop review", group: "Access & safety", icon: store01, note: "Review community project pages and inspected package releases." },
  { href: "/admin/resources/reports", label: "Workshop reports", group: "Access & safety", icon: flag02, note: "Investigate community reports and record moderation outcomes." },
  { href: "/admin/users", label: "Accounts", group: "Access & safety", icon: users, note: "Find accounts, inspect roles and manage access to the network." },
  { href: "/admin/alpha-access", label: "Alpha access", group: "Access & safety", icon: ticket01, note: "Manage Alpha grants and inspect the current access gate." },
  { href: "/admin/ncwe-beta", label: "NCWE beta", group: "Access & safety", icon: beaker, note: "Review closed beta applications for the world editor; accepting gives the Discord role." },
  { href: "/admin/game-ownership", label: "Genuine whitelist", group: "Access & safety", icon: checkmarkBadge01, note: "Approve game access for individual accounts and review linked stores." },
  { href: "/admin/licenses", label: "Licenses", group: "Access & safety", icon: key01, note: "Server ownership, license status and revocation controls." },
  { href: "/admin/bans", label: "Bans", group: "Access & safety", icon: userBlock01, note: "Platform and server enforcement with explicit scope and expiry." },
  { href: "/admin/audit", label: "Audit log", group: "Access & safety", icon: activity01, note: "Trace platform changes, access and administrative actions." },
] as const;

function syncTime(updated: number) {
  return new Date(updated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * The operations workspace: a sticky section rail, a top bar that tells the
 * operator whether what they see is fresh, and the current section's heading.
 * Below 1084px the rail folds into a bar with a toggled section list.
 */
export function AdminWorkspace({ children, operator }: { children: ReactNode; operator: string }) {
  const pathname = usePathname();
  const current = NAV.find(n => n.href === pathname) ??
    (pathname.startsWith("/admin/resources/") ? NAV.find(n => n.href === "/admin/resources") : undefined) ?? NAV[0];
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compact, setCompact] = useState(true);
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const { pending, updated, failed } = useAdminActivity();
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (event.key === "/" && !(event.target instanceof HTMLElement && event.target.closest("input,textarea,select,[contenteditable=true]"))) {
        event.preventDefault(); setCollapsed(false); setMobileOpen(true); requestAnimationFrame(() => search.current?.focus());
      }
      if (event.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const filtered = NAV.filter(n => `${n.label} ${n.group}`.toLowerCase().includes(query.toLowerCase()));
  const groupIndex = GROUPS.indexOf(current.group) + 1;

  return (
    <DensityContext.Provider value={compact}>
      <div className={styles.shell} data-collapsed={collapsed} data-density={compact ? "compact" : "comfortable"}>
        <aside className={styles.sidebar} data-admin-sidebar="" data-mobile-open={mobileOpen} aria-label="Operations navigation">
          <div className={styles.brand}>
            <span className={styles.mark} aria-hidden="true">{"//"}</span>
            <div className={styles.brandText}>
              <strong>Control room</strong>
              <span>OPEN//77 · Operations</span>
            </div>
            <button
              type="button"
              className={styles.menuToggle}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-controls="admin-navigation"
              aria-label="Toggle navigation"
            >
              <Icon glyph={mobileOpen ? cancel01 : menu01} />
              <span aria-hidden="true">{current.label}</span>
            </button>
          </div>
          <div className={styles.rail} id="admin-navigation" data-admin-sidebar-body="">
            <div className={styles.finder}>
              <Input
                ref={search}
                icon={search01}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Find a section…"
                aria-label="Find an admin section"
                className={styles.finderInput}
                trailing={<kbd>/</kbd>}
              />
            </div>
            <nav aria-label="Admin sections" className={styles.nav}>
              {GROUPS.map((group, index) => {
                const items = filtered.filter(n => n.group === group);
                return items.length ? (
                  <div className={styles.group} key={group}>
                    <Eyebrow index={index + 1} muted className={styles.groupLabel}>{group}</Eyebrow>
                    <ul className={styles.list}>
                      {items.map(item => {
                        const active = item.href === current.href;
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={styles.link}
                              title={item.label}
                              aria-label={item.label}
                              aria-current={active ? "page" : undefined}
                              onClick={() => setMobileOpen(false)}
                            >
                              <Icon glyph={item.icon} className={styles.linkIcon} />
                              <span className={styles.linkLabel}>{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null;
              })}
              {!filtered.length ? <p className={styles.noMatch}>No section matches “{query}”.</p> : null}
            </nav>
            <div className={styles.exits}>
              <Link href="/host" className={styles.exit} title="Host a server">
                <Icon glyph={serverStack02} className={styles.linkIcon} />
                <span className={styles.linkLabel}>Host a server</span>
                <Icon glyph={arrowUpRight01} className={styles.exitArrow} />
              </Link>
              <Link href="/" className={styles.exit} title="Back to website">
                <Icon glyph={arrowLeft01} className={styles.linkIcon} />
                <span className={styles.linkLabel}>Back to website</span>
                <Icon glyph={arrowUpRight01} className={styles.exitArrow} />
              </Link>
            </div>
            <div className={styles.operator}>
              <Avatar name={operator} size={34} />
              <div className={styles.operatorText}>
                <strong title={operator}>{operator}</strong>
                <span>Administrator</span>
              </div>
              <Icon glyph={shield01} className={styles.operatorShield} />
            </div>
            <button
              type="button"
              className={styles.collapse}
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Icon glyph={collapsed ? arrowRight01 : arrowLeft01} />
              <span>Collapse sidebar</span>
            </button>
          </div>
        </aside>

        <div className={styles.workspace}>
          <div className={styles.topbar}>
            <Breadcrumbs items={[{ label: "Operations", href: "/admin" }, { label: current.label }]} className={styles.crumbs} />
            <div className={styles.tools}>
              <span className={styles.sync} data-admin-sync="" data-state={pending ? "pending" : failed ? "failed" : updated ? "fresh" : "idle"} aria-live="polite">
                {pending ? (
                  <AdminSpinner label="Syncing data" />
                ) : failed ? (
                  "Request failed"
                ) : updated ? (
                  <>Updated <time>{syncTime(updated)}</time></>
                ) : (
                  "Awaiting data"
                )}
              </span>
              <div className={styles.density} role="group" aria-label="Table density">
                <Chip size="sm" pressed={compact} onClick={() => setCompact(true)} title="Dense rows: more on screen">
                  Compact
                </Chip>
                <Chip size="sm" pressed={!compact} onClick={() => setCompact(false)} title="Roomier rows">
                  Comfortable
                </Chip>
              </div>
              <Button
                size="sm"
                color="neutral"
                border
                lines="none"
                icon={refresh}
                iconPosition="left"
                busy={pending > 0}
                data-admin-refresh=""
                onClick={() => window.dispatchEvent(new Event("open77:admin-refresh"))}
              >
                Refresh
              </Button>
            </div>
            {pending > 0 ? <div className={styles.progress} data-admin-progress="" aria-hidden="true" /> : null}
          </div>

          <div className={styles.content}>
            <header className={styles.heading}>
              <Eyebrow index={groupIndex}>{current.group}</Eyebrow>
              <Display as="h1" size="md" className={styles.title}>
                {current.label}
                <span className={styles.dot}>.</span>
              </Display>
              <p className={styles.note}>{current.note}</p>
            </header>
            <div className={styles.page} key={pathname} data-admin-content="">
              {children}
            </div>
            <footer className={styles.foot}>
              <span>OPEN//77 · Alpha</span>
              <span className={styles.footPrivate}>
                <Icon glyph={shield01} /> Private operations workspace
              </span>
            </footer>
          </div>
        </div>
      </div>
    </DensityContext.Provider>
  );
}

