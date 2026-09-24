"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { DocsIcon } from "@/components/docs/docs-icon";
import { site } from "@/lib/site";

export type DocsNavItem = { href: string; label: string };
export type DocsNavGroup = { id: string; title: string; group: string; items: DocsNavItem[] };

export function DocsNav({ groups }: { groups: DocsNavGroup[] }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const navRef = useRef<HTMLElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const [previousPath, setPreviousPath] = useState(pathname);
  if (previousPath !== pathname) {
    setPreviousPath(pathname);
    setMobileOpen(false);
    setOverrides({});
    setQuery("");
  }

  useEffect(() => {
    // Scroll only the sidebar, not the document, when opening a deep-linked guide.
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!nav || !active || !window.matchMedia("(min-width: 761px)").matches) return;
    const bounds = nav.getBoundingClientRect();
    const target = active.getBoundingClientRect();
    if (target.bottom > bounds.bottom || target.top < bounds.top) {
      nav.scrollTop += target.top - bounds.top - nav.clientHeight / 2;
    }
  }, [pathname]);

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const topics = groups.map((group) => ({ ...group, items: group.items.filter((item) =>
    item.href !== "/docs" && item.href !== "/docs/api" && terms.every((term) =>
      `${group.title} ${item.label} ${item.href}`.toLowerCase().includes(term),
    ),
  ) })).filter((group) => group.items.length > 0);
  const collections = [...new Set(topics.map((topic) => topic.group))];
  const matchCount = topics.reduce((sum, topic) => sum + topic.items.length, 0);

  return (
    <nav className="dx-nav" aria-label="Documentation" ref={navRef}>
      <button className="docs-mobile-nav" aria-expanded={mobileOpen} aria-controls="docs-guide-navigation" onClick={() => setMobileOpen(!mobileOpen)}>
        <span><DocsIcon name="introduction" size={17} /> Browse documentation</span><span aria-hidden="true">{mobileOpen ? "−" : "+"}</span>
      </button>
      <div className={`docs-guide-navigation${mobileOpen ? " is-open" : ""}`} id="docs-guide-navigation">
        <Link className="docs-nav-home" href="/docs" aria-current={pathname === "/docs" ? "page" : undefined}>
          <DocsIcon name="home" /> Documentation home
        </Link>
        <Link className="docs-nav-api" href="/docs/api" aria-current={pathname.startsWith("/docs/api") ? "page" : undefined}>
          <span><DocsIcon name="scripting" /> Lua API reference</span><span aria-hidden="true">↗</span>
        </Link>
        <div className="docs-nav-filter">
          <SearchIcon size={15} />
          <input ref={filterRef} type="search" aria-label="Filter documentation topics" placeholder="Filter topics…"
            value={query} onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setQuery(""); } }} />
          {query && <button type="button" aria-label="Clear topic filter" onClick={() => { setQuery(""); filterRef.current?.focus(); }}>×</button>}
        </div>
        <div className="docs-nav-results" role="status" aria-live="polite">
          {terms.length > 0 ? `${matchCount} ${matchCount === 1 ? "page" : "pages"} found` : "Browse by topic"}
        </div>
        {collections.map((collection) => (
          <div className="docs-nav-collection" key={collection}>
            <p className="docs-nav-collection-title">{collection}</p>
            {topics.filter((topic) => topic.group === collection).map((group) => {
              const active = group.items.some((item) => pathname === item.href);
              const expanded = terms.length > 0 || (overrides[group.id] ?? (active || (pathname === "/docs" && group.id === "introduction")));
              return (
                <section className={`dx-nav-group${active ? " is-active" : ""}`} key={group.id}>
                  <button className="docs-group-toggle" aria-expanded={expanded} aria-controls={`nav-${group.id}`}
                    disabled={terms.length > 0}
                    onClick={() => setOverrides({ ...overrides, [group.id]: !expanded })}>
                    <DocsIcon name={group.id} size={17} /><span className="docs-topic-label">{group.title}</span>
                    <span className="docs-topic-count" aria-hidden="true">{group.items.length}</span>
                    <span className="docs-topic-chevron" aria-hidden="true">›</span>
                  </button>
                  <ul className="dx-nav-list" id={`nav-${group.id}`} hidden={!expanded}>
                    {group.items.map((item) => (
                      <li key={item.href}><Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link></li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        ))}
        {topics.length === 0 && <p className="docs-nav-empty">No matching topic. Try “vehicles”, “map” or “NPC”.</p>}
        <p className="docs-nav-note">Cyberpunk 2077 · Lua 5.4<br />OPEN//77 <span>{site.stage}</span></p>
      </div>
    </nav>
  );
}
