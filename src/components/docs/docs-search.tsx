"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";

import { Tag } from "@/components/ui/chip";
import { cx } from "@/components/ui/cx";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { arrowRight01, code, file01, search01 } from "@/components/ui/icons";

import styles from "./docs-search.module.css";

/** One searchable destination: a guide, or a function of the Lua API. */
export type SearchEntry = {
  title: string;
  description: string;
  category: string;
  href: string;
  kind: "guide" | "api";
};

const OPEN_EVENT = "open77:docs-search";
const RESULT_LIMIT = 12;

/** Queries offered before anything is typed. Each one has to return results. */
const SUGGESTIONS = ["vehicles", "blips", "webui", "permissions", "warden", "npcs"];

/** Opens the documentation search from anywhere in the docs (a button, a shortcut). */
export function openDocsSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** The button that opens the search: a slanted field with the shortcut on its end. */
export function DocsSearchTrigger({ size = "md", className }: { size?: "md" | "lg"; className?: string }) {
  return (
    <button
      type="button"
      className={cx(styles.trigger, size === "lg" && styles.triggerLg, className)}
      onClick={openDocsSearch}
      aria-haspopup="dialog"
      data-docs-search-trigger
    >
      <Icon glyph={search01} className={styles.triggerIcon} />
      <span className={styles.triggerLabel}>{size === "lg" ? "Search guides and API functions…" : "Search the docs…"}</span>
      <span className={styles.triggerKeys} aria-hidden="true">
        <kbd>Ctrl</kbd>
        <kbd>K</kbd>
      </span>
    </button>
  );
}

function rank(entries: SearchEntry[], query: string): SearchEntry[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const whole = query.trim().toLowerCase();
  return entries
    .filter((entry) => terms.every((term) => `${entry.title} ${entry.description} ${entry.category}`.toLowerCase().includes(term)))
    .sort((a, b) => Number(b.title.toLowerCase().includes(whole)) - Number(a.title.toLowerCase().includes(whole)))
    .slice(0, RESULT_LIMIT);
}

/** The first occurrence of the query in a title, marked. */
function highlight(text: string, query: string): ReactNode {
  const needle = query.trim().toLowerCase();
  const index = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (index === -1) return text;
  return (
    <Fragment>
      {text.slice(0, index)}
      <mark className={styles.mark}>{text.slice(index, index + needle.length)}</mark>
      {text.slice(index + needle.length)}
    </Fragment>
  );
}

/**
 * The documentation search: guides and every API function, behind Ctrl / ⌘ K
 * on any documentation page (the site header leaves the shortcut to the docs).
 * A modal palette, so it is reachable at any scroll position.
 */
export function DocsSearch({ entries }: { entries: SearchEntry[] }) {
  const pathname = usePathname();
  // The explorer itself is /docs/api; the per-namespace pages under it are
  // ordinary pages and keep the router.
  const isApi = pathname === "/docs/api";
  const dialog = useRef<DialogHandle>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const results = rank(entries, query);
  const searching = query.trim().length > 0;

  useEffect(() => {
    const open = () => {
      dialog.current?.open();
      window.requestAnimationFrame(() => input.current?.focus());
    };
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener(OPEN_EVENT, open);
    document.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener(OPEN_EVENT, open);
      document.removeEventListener("keydown", keydown);
    };
  }, []);

  const links = () => Array.from(list.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);

  const onListKey = (event: ReactKeyboardEvent<HTMLUListElement>) => {
    const items = links();
    const index = items.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (index <= 0) input.current?.focus();
      else items[index - 1]?.focus();
    }
  };

  return (
    <Dialog
      ref={dialog}
      eyebrow="// Guides · Lua API"
      title="Search the docs"
      size="lg"
      className={styles.dialog}
      onClose={() => setQuery("")}
      footer={
        <p className={styles.hint}>
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>Enter</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </p>
      }
    >
      <div className={styles.field}>
        <Icon glyph={search01} className={styles.fieldIcon} />
        <input
          ref={input}
          type="search"
          className={styles.input}
          aria-label="Search documentation and API"
          placeholder="Search guides and API functions…"
          value={query}
          aria-controls="docs-search-results"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              links()[0]?.focus();
            }
            if (event.key === "Enter" && results[0]) links()[0]?.click();
            // A search field eats the first Escape to clear itself; close in one press.
            if (event.key === "Escape") {
              event.preventDefault();
              dialog.current?.close();
            }
          }}
        />
      </div>

      <p className={styles.status} role="status">
        {searching
          ? results.length
            ? `${results.length === RESULT_LIMIT ? `Top ${RESULT_LIMIT}` : results.length} ${results.length === 1 ? "result" : "results"} · guides & API functions`
            : `No results for “${query.trim()}”`
          : `${entries.length.toLocaleString("en-GB")} guides and functions indexed`}
      </p>

      {searching && results.length > 0 ? (
        <ul className={styles.results} id="docs-search-results" ref={list} onKeyDown={onListKey}>
          {results.map((entry) => (
            <li key={`${entry.category}:${entry.href}`}>
              <NextLink
                href={entry.href}
                className={styles.result}
                onClick={(event) => {
                  dialog.current?.close();
                  setQuery("");
                  // Already on the explorer: an API result is a hash change on this
                  // page. Routing it through the app router would refetch the whole
                  // reference payload and, because pushState fires no hashchange,
                  // not always move the panel. Move the history entry ourselves;
                  // the explorer listens for exactly that.
                  if (isApi && entry.href.startsWith("/docs/api#") && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
                    event.preventDefault();
                    window.history.pushState(null, "", entry.href);
                    window.dispatchEvent(new Event("open77:api-location"));
                  }
                }}
              >
                <Icon glyph={entry.kind === "api" ? code : file01} className={styles.resultIcon} />
                <span className={styles.resultText}>
                  <span className={cx(styles.resultTitle, entry.kind === "api" && styles.mono)}>{highlight(entry.title, query)}</span>
                  {entry.description ? <span className={styles.resultDesc}>{entry.description}</span> : null}
                </span>
                <Tag tone={entry.kind === "api" ? undefined : "neutral"} className={styles.resultTag}>
                  {entry.category}
                </Tag>
                <Icon glyph={arrowRight01} className={styles.resultArrow} />
              </NextLink>
            </li>
          ))}
        </ul>
      ) : null}

      {searching && results.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyCode} aria-hidden="true">
            {"// 0 MATCHES"} <span>retry...</span>
          </p>
          <p>Try a shorter word, a namespace (vehicles, blips) or a function name (TriggerServerEvent).</p>
        </div>
      ) : null}

      {!searching ? (
        <div className={styles.suggest}>
          <p className={styles.suggestLabel}>Try</p>
          <ul className={styles.suggestList}>
            {SUGGESTIONS.map((word) => (
              <li key={word}>
                <Tag
                  tone="neutral"
                  onClick={() => {
                    setQuery(word);
                    input.current?.focus();
                  }}
                >
                  {word}
                </Tag>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Dialog>
  );
}
