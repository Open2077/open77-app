"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Tag } from "@/components/ui/chip";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icon";
import { arrowDown01, arrowUpRight01, cancel01, filterHorizontal, menu01 } from "@/components/ui/icons";
import { site } from "@/lib/site";
import { DocsIcon } from "./docs-icon";
import { DocsSearchTrigger } from "./docs-search";

import styles from "./docs-nav.module.css";

export type DocsNavItem = { href: string; label: string };
export type DocsNavGroup = { id: string; title: string; group: string; items: DocsNavItem[] };

/**
 * The documentation sidebar: search, the two entry points (guides home and the
 * API reference), a topic filter and the guide tree, grouped in collections.
 * Sticky on wide screens; a "Browse documentation" disclosure below 1084px.
 */
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
    if (!nav || !active || !window.matchMedia("(min-width: 1085px)").matches) return;
    const bounds = nav.getBoundingClientRect();
    const target = active.getBoundingClientRect();
    if (target.bottom > bounds.bottom || target.top < bounds.top) {
      nav.scrollTop += target.top - bounds.top - nav.clientHeight / 2;
    }
  }, [pathname]);

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const topics = groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.href !== "/docs" &&
          item.href !== "/docs/api" &&
          terms.every((term) => `${group.title} ${item.label} ${item.href}`.toLowerCase().includes(term)),
      ),
    }))
    .filter((group) => group.items.length > 0);
  const collections = [...new Set(topics.map((topic) => topic.group))];
  const matchCount = topics.reduce((sum, topic) => sum + topic.items.length, 0);
  const onApi = pathname.startsWith("/docs/api");

  return (
    <nav className={styles.nav} aria-label="Documentation" ref={navRef} data-docs-nav>
      <div className={styles.bar}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={mobileOpen}
          aria-controls="docs-guide-navigation"
          aria-label="Browse documentation"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Icon glyph={mobileOpen ? cancel01 : menu01} />
          <span>Browse documentation</span>
        </button>
        <DocsSearchTrigger className={styles.search} />
      </div>

      <div className={cx(styles.panel, mobileOpen && styles.open)} id="docs-guide-navigation">
        {/* The two entry points share one compact row. */}
        <ul className={styles.primary}>
          <li>
            <Link href="/docs" aria-current={pathname === "/docs" ? "page" : undefined} title="Documentation home">
              <DocsIcon name="home" size={15} />
              <span>Docs home</span>
            </Link>
          </li>
          <li>
            <Link href="/docs/api" aria-current={onApi ? "page" : undefined} title="Lua API reference">
              <DocsIcon name="scripting" size={15} />
              <span>Lua API</span>
              <Icon glyph={arrowUpRight01} className={styles.primaryArrow} />
            </Link>
          </li>
        </ul>

        <label className={styles.filter}>
          <Icon glyph={filterHorizontal} className={styles.filterIcon} />
          <input
            ref={filterRef}
            type="search"
            aria-label="Filter documentation topics"
            placeholder="Filter topics…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setQuery("");
              }
            }}
          />
          {query ? (
            <button
              type="button"
              className={styles.clear}
              aria-label="Clear topic filter"
              onClick={() => {
                setQuery("");
                filterRef.current?.focus();
              }}
            >
              <Icon glyph={cancel01} />
            </button>
          ) : null}
        </label>
        <p className={cx(styles.results, terms.length === 0 && "sr-only")} role="status" aria-live="polite" data-docs-results>
          {terms.length > 0 ? `${matchCount} ${matchCount === 1 ? "page" : "pages"} found` : "Browse by topic"}
        </p>

        {collections.map((collection, index) => (
          <div className={styles.collection} key={collection} data-docs-collection>
            <p className={styles.collectionTitle}>
              <span className={styles.collectionIndex}>{String(index + 1).padStart(2, "0")}</span>
              {collection}
            </p>
            {topics
              .filter((topic) => topic.group === collection)
              .map((group) => {
                const active = group.items.some((item) => pathname === item.href);
                const expanded =
                  terms.length > 0 || (overrides[group.id] ?? (active || (pathname === "/docs" && group.id === "introduction")));
                return (
                  <section className={cx(styles.topic, active && styles.topicActive)} key={group.id}>
                    <button
                      type="button"
                      className={styles.topicToggle}
                      aria-expanded={expanded}
                      aria-controls={`nav-${group.id}`}
                      disabled={terms.length > 0}
                      onClick={() => setOverrides({ ...overrides, [group.id]: !expanded })}
                      data-docs-topic
                    >
                      <DocsIcon name={group.id} size={15} />
                      <span className={styles.topicLabel}>{group.title}</span>
                      <span className={styles.topicCount} aria-hidden="true">
                        {group.items.length}
                      </span>
                      <Icon glyph={arrowDown01} className={styles.chevron} />
                    </button>
                    <ul className={styles.pages} id={`nav-${group.id}`} hidden={!expanded}>
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
          </div>
        ))}

        {topics.length === 0 ? (
          <div className={styles.empty} data-docs-empty>
            <p className={styles.emptyCode}>{"// NO MATCH"}</p>
            <p>No topic matches “{query.trim()}”. Try “vehicles”, “map” or “NPC”.</p>
          </div>
        ) : null}

        <div className={styles.note}>
          <p>Cyberpunk 2077 · Lua 5.4</p>
          <p>
            OPEN//77 <Tag>{site.stage}</Tag>
          </p>
        </div>
      </div>
    </nav>
  );
}
