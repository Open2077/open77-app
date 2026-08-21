"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SearchIcon } from "@/components/icons";
import type { DocsSearchEntry } from "@/lib/docs";

/**
 * Filter over every documentation page.
 *
 * The full card grid is rendered on the server, so a crawler reading `/docs`
 * gets the complete table of contents with descriptions before any JavaScript
 * runs. Typing narrows that same grid in place.
 *
 * A match in the page title outranks a match in the section name, which
 * outranks a match in the description, so "vehicles" leads with the Vehicles
 * guide rather than the several guides that mention vehicles in passing.
 */
/** A page in the index, plus the label its card carries. */
export type DocsSearchItem = DocsSearchEntry & { meta: string };

export function DocsSearch({ entries }: { entries: DocsSearchItem[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;

    const scored: { entry: DocsSearchItem; score: number }[] = [];
    for (const entry of entries) {
      const inTitle = `${entry.nav} ${entry.title}`.toLowerCase().indexOf(needle);
      if (inTitle !== -1) {
        scored.push({ entry, score: inTitle });
        continue;
      }
      if (entry.section.toLowerCase().includes(needle)) {
        scored.push({ entry, score: 500 });
        continue;
      }
      if (entry.description.toLowerCase().includes(needle)) {
        scored.push({ entry, score: 1000 });
      }
    }
    return scored.sort((a, b) => a.score - b.score).map((item) => item.entry);
  }, [entries, query]);

  return (
    <div className="dx-search">
      <div className="dx-search-field">
        <SearchIcon />
        <input
          type="search"
          placeholder="Filter pages — try vehicles, identity, exports…"
          aria-label="Filter documentation pages"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span className="dx-search-count">
          {results.length} / {entries.length}
        </span>
      </div>

      <div className="dx-index-grid">
        {results.map((entry) => (
          <Link className="dx-card" href={entry.href} key={entry.href}>
            <span className="dx-card-title">{entry.nav}</span>
            <span className="dx-card-desc">{entry.description}</span>
            <span className="dx-card-meta">{entry.meta}</span>
          </Link>
        ))}
      </div>

      {results.length === 0 ? (
        <p className="dx-empty">No page matches “{query.trim()}”.</p>
      ) : null}
    </div>
  );
}
