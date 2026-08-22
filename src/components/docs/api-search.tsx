"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SearchIcon } from "@/components/icons";

export type ApiSearchItem = {
  qualified: string;
  signature: string;
  summary: string;
  href: string;
  runtime: "client" | "server";
  namespace: string;
};

/**
 * Filter over every registered function.
 *
 * The complete list is rendered on the server, so all 258 signatures are in the
 * static HTML and a search engine or answer engine sees the whole reference
 * without executing anything. Typing narrows that same list in place — no
 * request, no index to ship beyond the rows already on the page.
 *
 * Matches on the qualified name rank above matches in the summary, and an
 * earlier position in the name ranks above a later one, so `camera` puts
 * `Open77.camera.*` ahead of a function that merely mentions the camera.
 *
 * Every name offered as an example has to exist in the reference, or the first
 * thing a curious visitor sees is an empty result.
 */
export function ApiSearch({ items }: { items: ApiSearchItem[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;

    const scored: { item: ApiSearchItem; score: number }[] = [];
    for (const item of items) {
      const inName = item.qualified.toLowerCase().indexOf(needle);
      if (inName !== -1) {
        scored.push({ item, score: inName });
        continue;
      }
      if (item.summary.toLowerCase().includes(needle)) {
        scored.push({ item, score: 1000 });
      }
    }
    return scored.sort((a, b) => a.score - b.score).map((entry) => entry.item);
  }, [items, query]);

  return (
    <div className="dx-search">
      <div className="dx-search-field">
        <SearchIcon />
        <input
          type="search"
          placeholder="Filter functions — try camera, vehicles, TriggerServerEvent…"
          aria-label="Filter API functions"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span className="dx-search-count">
          {results.length} / {items.length}
        </span>
      </div>

      <ul className="dx-hits">
        {results.map((item) => (
          <li key={item.href}>
            <Link className="dx-hit" href={item.href}>
              <span className="dx-hit-name">{item.signature}</span>
              <span className="dx-hit-sub">{item.summary}</span>
              <span className="dx-hit-kind">
                {item.runtime} · {item.namespace}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {results.length === 0 ? (
        <p className="dx-empty">No function matches “{query.trim()}”.</p>
      ) : null}
    </div>
  );
}
