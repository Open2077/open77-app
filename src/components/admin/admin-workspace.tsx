"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CodeIcon, DownloadIcon, GlobeIcon, InfoIcon, KeyIcon, MenuIcon, PeopleIcon, SearchIcon, ServerRackIcon, ShieldIcon } from "@/components/icons";
import { useAdminActivity, AdminSpinner } from "./admin-activity";

const NAV = [
  { href: "/admin", label: "Overview", group: "Workspace", icon: CodeIcon, note: "Your network, at a glance. Live data and the latest platform activity." },
  { href: "/admin/dev-tracker", label: "Dev Tracker", group: "Workspace", icon: CodeIcon, note: "Review community ideas, publish progress and keep discussions constructive." },
  { href: "/admin/incidents", label: "Crash reports", group: "Workspace", icon: InfoIcon, note: "Investigate player reports, correlate incidents and inspect the evidence." },
  { href: "/admin/servers", label: "Servers", group: "Network", icon: ServerRackIcon, note: "Connected worlds, player capacity and heartbeat observations." },
  { href: "/admin/releases", label: "Releases", group: "Network", icon: DownloadIcon, note: "Published channels, trusted builds and controlled release operations." },
  { href: "/admin/mods", label: "Mod library", group: "Network", icon: CodeIcon, note: "Review provenance, redistribution rights and the mod allowlist." },
  { href: "/admin/mods/requests", label: "Mod queue", group: "Network", icon: DownloadIcon, note: "Review incoming mod submissions and make explicit approval decisions." },
  { href: "/admin/resources", label: "Workshop review", group: "Access & safety", icon: ShieldIcon, note: "Review community project pages and inspected package releases." },
  { href: "/admin/resources/reports", label: "Workshop reports", group: "Access & safety", icon: ShieldIcon, note: "Investigate community reports and record moderation outcomes." },
  { href: "/admin/users", label: "Accounts", group: "Access & safety", icon: PeopleIcon, note: "Find accounts, inspect roles and manage access to the network." },
  { href: "/admin/alpha-access", label: "Alpha access", group: "Access & safety", icon: ShieldIcon, note: "Manage Alpha grants and inspect the current access gate." },
  { href: "/admin/licenses", label: "Licenses", group: "Access & safety", icon: KeyIcon, note: "Server ownership, license status and revocation controls." },
  { href: "/admin/bans", label: "Bans", group: "Access & safety", icon: ShieldIcon, note: "Platform and server enforcement with explicit scope and expiry." },
  { href: "/admin/audit", label: "Audit log", group: "Access & safety", icon: CodeIcon, note: "Trace platform changes, access and administrative actions." },
] as const;

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
  return (
    <div className="adm-shell" data-collapsed={collapsed} data-density={compact ? "compact" : "comfortable"}>
      <aside className="adm-sidebar" data-mobile-open={mobileOpen} aria-label="Operations navigation">
        <div className="adm-sidebar-brand"><span className="adm-workspace-mark" aria-hidden="true">{"//"}</span><div><strong>CONTROL ROOM</strong><span>OPEN77 · OPERATIONS</span></div>
          <button className="adm-mobile-toggle ac-iconbtn" onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen} aria-controls="admin-navigation" aria-label="Toggle navigation"><MenuIcon size={17} /></button>
        </div>
        <div className="adm-sidebar-body" id="admin-navigation">
          <label className="adm-nav-search"><SearchIcon size={14} /><input ref={search} value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a section…" aria-label="Find an admin section" /><kbd>/</kbd></label>
          <nav aria-label="Admin sections">
            {["Workspace", "Network", "Access & safety"].map(group => {
              const items = filtered.filter(n => n.group === group);
              return items.length ? <div className="adm-nav-group" key={group}><p>{group}</p>{items.map(item => {
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setMobileOpen(false)}>
                  <Icon size={17} /><span>{item.label}</span>{pathname === item.href ? <i aria-hidden="true" /> : null}
                </Link>;
              })}</div> : null;
            })}
            {!filtered.length ? <p className="adm-footnote">No section matches.</p> : null}
          </nav>
          <div className="adm-sidebar-links"><Link href="/host"><ServerRackIcon size={16} /><span>Host a server</span><ArrowRightIcon size={13} /></Link><Link href="/"><GlobeIcon size={16} /><span>Back to website</span><ArrowRightIcon size={13} /></Link></div>
          <div className="adm-sidebar-operator"><span className="adm-avatar" aria-hidden="true">{operator.slice(0, 1).toUpperCase()}</span><div><strong title={operator}>{operator}</strong><span>Administrator</span></div><ShieldIcon size={15} /></div>
          <button className="adm-collapse ac-iconbtn" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ArrowRightIcon size={14} /> : <ArrowLeftIcon size={14} />}<span>Collapse sidebar</span>
          </button>
        </div>
      </aside>
      <div className="adm-workspace">
        <div className="adm-workspace-topbar">
          <p className="adm-breadcrumb">Operations <span>/</span> <strong>{current.label}</strong></p>
          <div className="adm-workspace-tools">
            <span className={`adm-sync ${failed ? "is-error" : ""}`} aria-live="polite">{pending ? <AdminSpinner label="Syncing data" /> : failed ? "Request failed" : updated ? `Updated ${new Date(updated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Awaiting data"}</span>
            <button className="ac-iconbtn adm-density" onClick={() => setCompact(!compact)} aria-pressed={compact} title="Toggle table density">{compact ? "Compact" : "Comfortable"}</button>
            <button className="ac-iconbtn" onClick={() => window.dispatchEvent(new Event("open77:admin-refresh"))} disabled={pending > 0}>{pending ? <span className="adm-spinner" aria-hidden="true" /> : <span aria-hidden="true">↻</span>} Refresh</button>
          </div>
          {pending > 0 ? <div className="adm-progress" aria-hidden="true" /> : null}
        </div>
        <div className="adm-workspace-content">
          <header className="adm-page-heading"><p className="adm-eyebrow">{current.group}</p><h1>{current.label}<span>.</span></h1><p>{current.note}</p></header>
          <div className="adm-page-content" key={pathname}>{children}</div>
          <footer className="adm-workspace-footer"><span>OPEN//77 · Alpha</span><span><ShieldIcon size={12} /> Private operations workspace</span></footer>
        </div>
      </div>
    </div>
  );
}
