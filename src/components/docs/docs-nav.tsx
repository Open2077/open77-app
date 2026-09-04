"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type DocsNavItem = { href: string; label: string; children?: { href: string; label: string }[] };
export type DocsNavGroup = { id: string; title: string; items: DocsNavItem[] };

export function DocsNav({ groups }: { groups: DocsNavGroup[] }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [previousPath, setPreviousPath] = useState(pathname);
  if (previousPath !== pathname) {
    setPreviousPath(pathname);
    setMobileOpen(false);
    setOverrides({});
  }

  return (
    <nav className="dx-nav" aria-label="Documentation">
      <button className="docs-mobile-nav" aria-expanded={mobileOpen} aria-controls="docs-guide-navigation" onClick={() => setMobileOpen(!mobileOpen)}>
        <span>☰ &nbsp; Browse documentation</span><span>{mobileOpen ? "−" : "+"}</span>
      </button>
      <div className={`docs-guide-navigation${mobileOpen ? " is-open" : ""}`} id="docs-guide-navigation">
        <Link className="docs-nav-home" href="/docs" aria-current={pathname === "/docs" ? "page" : undefined}>
          <span aria-hidden="true">⌂</span> Documentation home
        </Link>
        {groups.map((group) => {
          const active = group.items.some((item) => pathname === item.href && item.href !== "/docs");
          const expanded = overrides[group.id] ?? (active || group.id === "introduction" || group.id === "scripting");
          return (
            <section className="dx-nav-group" key={group.id}>
              <button className="docs-group-toggle" aria-expanded={expanded} aria-controls={`nav-${group.id}`}
                onClick={() => setOverrides({ ...overrides, [group.id]: !expanded })}>
                {group.title}<span aria-hidden="true">{expanded ? "−" : "+"}</span>
              </button>
              <ul className="dx-nav-list" id={`nav-${group.id}`} hidden={!expanded}>
                {group.items.filter((item) => item.href !== "/docs").map((item) => (
                  <li key={item.href}><Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link></li>
                ))}
              </ul>
            </section>
          );
        })}
        <Link className="docs-nav-api" href="/docs/api"><span>⌘ &nbsp; API Reference</span><span>↗</span></Link>
        <p className="docs-nav-note">Cyberpunk 2077 · Lua 5.4<br />OPEN//77 <span>PRE-ALPHA</span></p>
      </div>
    </nav>
  );
}
