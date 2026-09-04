"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { DocsThemeToggle } from "@/components/docs/docs-theme";

type SearchEntry = { title: string; description: string; category: string; href: string };

export function DocsHeader({ entries }: { entries: SearchEntry[] }) {
  const pathname = usePathname();
  const isApi = pathname.startsWith("/docs/api");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const search = useRef<HTMLDivElement>(null);
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const results = terms.length ? entries.filter((entry) => terms.every((term) =>
    `${entry.title} ${entry.description} ${entry.category}`.toLowerCase().includes(term),
  )).sort((a, b) => Number(b.title.toLowerCase().includes(query.toLowerCase())) - Number(a.title.toLowerCase().includes(query.toLowerCase()))).slice(0, 12) : [];

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    const outside = (event: PointerEvent) => {
      if (!search.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);

  return (
    <header className="docs-header">
      <Link href="/docs" className="docs-section-label">Developer docs</Link>
      <nav className="docs-tabs" aria-label="Documentation sections">
        <Link href="/docs" aria-current={!isApi ? "page" : undefined}>Documentation</Link>
        <Link href="/docs/api" aria-current={isApi ? "page" : undefined}>API Reference</Link>
      </nav>
      <div className="docs-global-search" ref={search}>
        <SearchIcon size={18} />
        <input ref={input} type="search" aria-label="Search documentation and API" placeholder="Search documentation…"
          value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          aria-controls="docs-search-results"
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); search.current?.querySelector<HTMLAnchorElement>(".docs-search-results a")?.focus(); }
            if (event.key === "Enter" && results[0]) search.current?.querySelector<HTMLAnchorElement>(".docs-search-results a")?.click();
          }} />
        <kbd>Ctrl K</kbd>
        {open && terms.length > 0 ? (
          <div className="docs-search-results" id="docs-search-results" aria-label="Search results">
            <p className="docs-search-caption" role="status">{results.length ? "Guides & API functions" : `No results for “${query}”`}</p>
            {results.map((entry) => (
              <Link key={entry.href} href={entry.href} onClick={() => { setOpen(false); setQuery(""); }}>
                <span>{entry.title}</span><small>{entry.category}</small>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      <DocsThemeToggle />
    </header>
  );
}
