"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Chip, Tag } from "@/components/ui/chip";
import { CopyButton } from "@/components/ui/code-block";
import { cx } from "@/components/ui/cx";
import { Breadcrumbs } from "@/components/ui/data";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { arrowUpRight01, search01 } from "@/components/ui/icons";
import { Tabs } from "@/components/ui/tabs";
import { Display } from "@/components/ui/typography";
import type { ApiEntry } from "@/lib/api-reference";
import { API_CATEGORIES, apiCategory, apiExplorerHref } from "@/lib/api-categories";
import { InlineMarkdown } from "./inline-markdown";

import styles from "./api-explorer.module.css";

const LOCATION_EVENT = "open77:api-location";
// A same-page navigation from the header search (`<Link href="/docs/api#…">`
// while already on /docs/api) goes through history.pushState, which fires
// neither hashchange nor popstate. Without this the URL moved and the panel
// kept showing the previous function -- the "clicking a result does nothing"
// report of 2026-09-15. Patch the two history writers once, for the lifetime of
// the first subscriber, so any pushState reaches the store.
let historyPatched = false;
function patchHistory() {
  if (historyPatched) return;
  historyPatched = true;
  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method];
    window.history[method] = function (this: History, ...args: Parameters<History["pushState"]>) {
      const result = original.apply(this, args);
      window.dispatchEvent(new Event(LOCATION_EVENT));
      return result;
    };
  }
}
function subscribeLocation(callback: () => void) {
  patchHistory();
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  window.addEventListener(LOCATION_EVENT, callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
    window.removeEventListener(LOCATION_EVENT, callback);
  };
}
function locationSnapshot() { return window.location.search + window.location.hash; }
function serverSnapshot() { return ""; }
function entryKey(entry: ApiEntry) { return `${entry.runtime}/${entry.namespaceSlug}/${entry.anchor}`; }

/**
 * The Lua API explorer: filters in the URL (`?side`, `?category`,
 * `?namespace`, `?q`), the selected function in the hash, a scrolling list on
 * the left and the selected function's detail on the right. Below 1084px the
 * two panes become tabs.
 */
export function ApiExplorer({ entries }: { entries: ApiEntry[] }) {
  const location = useSyncExternalStore(subscribeLocation, locationSnapshot, serverSnapshot);
  const [mobileDetail, setMobileDetail] = useState<boolean | null>(null);
  const detail = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const panes = useRef<HTMLDivElement>(null);
  const url = new URL(location || "/docs/api", "https://docs.local/docs/api");
  const side = url.searchParams.get("side") ?? "all";
  const category = url.searchParams.get("category") ?? "all";
  const namespace = url.searchParams.get("namespace") ?? "all";
  const query = url.searchParams.get("q") ?? "";
  const selectedKey = url.hash.slice(1);

  const counts = useMemo(() => ({
    all: entries.length,
    client: entries.filter((entry) => entry.runtime === "client").length,
    server: entries.filter((entry) => entry.runtime === "server").length,
  }), [entries]);
  const available = useMemo(() => entries.filter((entry) => side === "all" || entry.runtime === side), [entries, side]);
  const categories = API_CATEGORIES.map((item) => ({ ...item, count: available.filter((entry) => apiCategory(entry.namespace).id === item.id).length }));
  const namespaces = [...new Set(available.filter((entry) => category === "all" || apiCategory(entry.namespace).id === category).map((entry) => entry.namespace))].sort();
  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return available.filter((entry) =>
      (category === "all" || apiCategory(entry.namespace).id === category) &&
      (namespace === "all" || entry.namespace === namespace) &&
      terms.every((term) => `${entry.qualified} ${entry.summary} ${entry.description} ${apiCategory(entry.namespace).label}`.toLowerCase().includes(term)),
    ).sort((a, b) => a.qualified.localeCompare(b.qualified) || a.runtime.localeCompare(b.runtime));
  }, [available, category, namespace, query]);
  // A deep link names an entry; the list filters must not be allowed to hide
  // it. Look it up in the full set before falling back to the first row.
  const selected = results.find((entry) => entryKey(entry) === selectedKey) ??
    entries.find((entry) => entryKey(entry) === selectedKey) ?? results[0];
  const groups = API_CATEGORIES.map((item) => ({ ...item, entries: results.filter((entry) => apiCategory(entry.namespace).id === item.id) })).filter((item) => item.entries.length);

  useEffect(() => {
    if (!selectedKey) return;
    const container = list.current;
    const row = container?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!container || !row) return;
    const viewport = container.getBoundingClientRect();
    const bounds = row.getBoundingClientRect();
    if (bounds.top < viewport.top + 48 || bounds.bottom > viewport.bottom) {
      container.scrollTo({ top: container.scrollTop + bounds.top - viewport.top - 48 });
    }
  }, [selectedKey]);

  function updateFilters(changes: Record<string, string>) {
    const target = new URL(window.location.href);
    for (const [key, value] of Object.entries(changes)) {
      if (value === "all" || !value) target.searchParams.delete(key);
      else target.searchParams.set(key, value);
    }
    target.hash = "";
    window.history.replaceState(null, "", target.pathname + target.search);
    window.dispatchEvent(new Event(LOCATION_EVENT));
    list.current?.scrollTo({ top: 0 });
    detail.current?.scrollTo({ top: 0 });
  }

  function selectEntry(entry: ApiEntry) {
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#${entryKey(entry)}`);
    window.dispatchEvent(new Event(LOCATION_EVENT));
    detail.current?.scrollTo({ top: 0 });
    setMobileDetail(true);
    // Below 1084px the page scrolls instead of the panes: bring the detail tab into view.
    if (window.matchMedia("(max-width: 1084px)").matches) {
      window.requestAnimationFrame(() => panes.current?.scrollIntoView({ block: "start" }));
    }
  }

  const showDetail = mobileDetail ?? Boolean(selectedKey);

  return (
    <div className={cx(styles.explorer, showDetail && styles.showDetail)} data-api-explorer>
      <header className={styles.toolbar}>
        <div className={styles.heading}>
          <Breadcrumbs items={[{ label: "Docs", href: "/docs" }, { label: "Lua API reference" }]} />
          <Display as="h1" size="md" lines={["Lua API", "reference"]} accent={[1]} glitch className={styles.title} />
        </div>
        <div className={styles.runtime} role="group" aria-label="API runtime" data-api-runtime-filter>
          <span className={styles.label}>API set</span>
          {(["all", "server", "client"] as const).map((runtime) => (
            <Chip
              key={runtime}
              size="sm"
              pressed={side === runtime}
              count={counts[runtime]}
              onClick={() => updateFilters({ side: runtime, namespace: "all" })}
            >
              {runtime === "all" ? "All" : runtime === "server" ? "Server" : "Client"}
            </Chip>
          ))}
        </div>
        <div className={styles.toolLinks}>
          <span className={styles.language}>
            Language <strong>Lua 5.4</strong>
          </span>
          <Link className={styles.guideLink} href="/docs/server-resources">
            Scripting guide <Icon glyph={arrowUpRight01} />
          </Link>
        </div>
      </header>

      <div className={styles.filters}>
        <Input
          icon={search01}
          type="search"
          className={styles.search}
          aria-label="Search API functions"
          placeholder="Search functions, e.g. vehicles.create…"
          value={query}
          onChange={(event) => updateFilters({ q: event.target.value })}
        />
        <Select
          compact
          className={styles.select}
          aria-label="API category"
          value={category}
          onChange={(event) => updateFilters({ category: event.target.value, namespace: "all" })}
        >
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} ({item.count})
            </option>
          ))}
        </Select>
        <Select
          compact
          className={styles.select}
          aria-label="API namespace"
          value={namespace}
          onChange={(event) => updateFilters({ namespace: event.target.value })}
        >
          <option value="all">All namespaces</option>
          {namespaces.map((name) => (
            <option key={name} value={name}>
              {name === "_G" ? "Globals" : name}
            </option>
          ))}
        </Select>
        <span className={styles.count} role="status">
          {results.length.toLocaleString("en-GB")} {results.length === 1 ? "function" : "functions"}
        </span>
      </div>

      <div className={styles.mobileSwitch} data-api-switch>
        <Tabs
          label="Reference panel"
          value={showDetail ? "detail" : "list"}
          onChange={(value) => setMobileDetail(value === "detail")}
          items={[
            { value: "list", label: `Functions (${results.length})` },
            { value: "detail", label: "Function details" },
          ]}
        />
      </div>

      <div className={styles.panes} ref={panes}>
        <div className={styles.list} ref={list} role="region" aria-label="API functions" data-api-list>
          <div className={styles.listHeading} aria-hidden="true">
            <span>Functions by category</span>
            <span>Runtime</span>
          </div>
          {groups.map((group) => (
            <section key={group.id} className={styles.group} data-api-group>
              <h2 className={styles.groupTitle}>
                {group.label}
                <span>{group.entries.length}</span>
              </h2>
              <ul>
                {group.entries.map((entry) => {
                  const current = Boolean(selected && entryKey(selected) === entryKey(entry));
                  return (
                    <li key={entryKey(entry)}>
                      <a
                        href={apiExplorerHref(entry)}
                        className={styles.row}
                        aria-current={current ? "true" : undefined}
                        data-api-row
                        onClick={(event) => {
                          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                          event.preventDefault();
                          selectEntry(entry);
                        }}
                      >
                        <span className={styles.rowText}>
                          <code className={styles.rowName}>
                            {entry.qualified}
                            <span>({entry.params.map((param) => `${param.name}${param.optional ? "?" : ""}`).join(", ")})</span>
                          </code>
                          <span className={styles.rowSummary}>{entry.summary.replace(/\*\*|`/g, "")}</span>
                        </span>
                        <RuntimeTag runtime={entry.runtime} />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {!results.length ? (
            <div data-api-empty>
              <EmptyState
                className={styles.noResults}
                eyebrow="// 0 matches"
                title="No matching functions"
                action={
                  <Button size="sm" lines="none" border color="red" onClick={() => updateFilters({ q: "", side: "all", category: "all", namespace: "all" })}>
                    Clear all filters
                  </Button>
                }
              >
                Try another name, category or runtime.
              </EmptyState>
            </div>
          ) : null}
          <p className={styles.listFooter}>{entries.length.toLocaleString("en-GB")} functions · Open77 wiki · Lua 5.4</p>
        </div>

        <section className={styles.detail} ref={detail} aria-label="Selected function" data-api-detail>
          {selected ? (
            <div key={entryKey(selected)} className={styles.detailInner}>
              <div className={styles.detailMeta}>
                <span>{apiCategory(selected.namespace).label}</span>
                <RuntimeTag runtime={selected.runtime} />
              </div>
              <p className={styles.namespace}>{selected.namespace === "_G" ? "Global function" : selected.namespace}</p>
              <h2 className={styles.fnName}>{selected.name}</h2>
              <p className={styles.summary}>
                <InlineMarkdown text={selected.summary} />
              </p>

              <figure className={styles.code} data-api-signature>
                <figcaption className={styles.codeBar}>
                  <span>Lua signature</span>
                  <CopyButton text={selected.signature} />
                </figcaption>
                <pre>
                  <code>
                    {selected.documentedSignature || selected.callSignature ? (
                      selected.signature
                    ) : (
                      <>
                        <span className={styles.comment}>
                          -- {selected.runtime} · {selected.namespace}
                        </span>
                        {"\n"}
                        {selected.qualified}({selected.params.length ? "\n" : ""}
                        {selected.params.map((param, index) => (
                          <span key={param.name}>
                            {"    "}
                            <span className={styles.param}>{param.name}</span>
                            {index < selected.params.length - 1 ? "," : ""}
                            <span className={styles.comment}>{` -- ${param.type}${param.optional ? " (optional)" : ""}`}</span>
                            {"\n"}
                          </span>
                        ))}
                        )
                      </>
                    )}
                  </code>
                </pre>
              </figure>

              <div className={styles.sections}>
                {selected.description ? (
                  <section>
                    <h3>Description</h3>
                    <p className={styles.text}>
                      <InlineMarkdown text={selected.description} />
                    </p>
                  </section>
                ) : null}
                <section>
                  <h3>
                    Parameters <span>{selected.params.length}</span>
                  </h3>
                  {selected.params.length ? (
                    <dl className={styles.params}>
                      {selected.params.map((param) => (
                        <div key={param.name}>
                          <dt>
                            <code>{param.name}</code>
                            <span>{param.type === "not specified" ? "" : param.type}</span>
                          </dt>
                          <dd>
                            <span className={param.optional ? styles.optional : styles.required}>{param.optional ? "Optional" : "Required"}</span>
                            {param.default !== null ? (
                              <>
                                {" · Default: "}
                                <code>{param.default}</code>
                              </>
                            ) : null}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className={styles.muted}>
                      {selected.signatureKnown === false ? "See the source guide for this function’s arguments." : "This function takes no parameters."}
                    </p>
                  )}
                </section>
                <section>
                  <h3>Returns</h3>
                  {selected.returns.length ? (
                    <ul className={styles.returns}>
                      {selected.returns.map((value, index) => (
                        <li key={index}>
                          <InlineMarkdown text={value} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.muted}>No return value documented.</p>
                  )}
                </section>
                {selected.example ? (
                  <section>
                    <h3>Example</h3>
                    <figure className={styles.code}>
                      <figcaption className={styles.codeBar}>
                        <span>example.lua</span>
                        <CopyButton text={selected.example} label="Copy example" />
                      </figcaption>
                      <pre>
                        <code>{selected.example}</code>
                      </pre>
                    </figure>
                  </section>
                ) : null}
                {selected.inferred ? (
                  <Notice kind="info" title="Inferred signature">
                    This signature is inferred from the binding. Check the guide for usage details.
                  </Notice>
                ) : null}
                <div className={styles.links} data-api-links>
                  <CopyButton
                    className={styles.copyLink}
                    text={typeof window === "undefined" ? apiExplorerHref(selected) : window.location.origin + apiExplorerHref(selected)}
                    label="Copy link"
                  />
                  <Link href={selected.href}>
                    Full namespace reference <Icon glyph={arrowUpRight01} />
                  </Link>
                  {selected.usageGuideHref ? (
                    <Link href={selected.usageGuideHref}>
                      {selected.usageGuideLabel ?? "Usage guide"} <Icon glyph={arrowUpRight01} />
                    </Link>
                  ) : null}
                  {selected.guideHref ? (
                    <Link href={selected.guideHref}>
                      Read the source guide <Icon glyph={arrowUpRight01} />
                    </Link>
                  ) : null}
                </div>
                <details className={styles.source} data-api-source>
                  <summary>Source information</summary>
                  <p>
                    {selected.guideHref ? "Wiki: " : ""}
                    {selected.source}
                    {selected.source_line ? `:${selected.source_line}` : ""}
                    <br />
                    {selected.handler}
                  </p>
                </details>
              </div>
            </div>
          ) : (
            <EmptyState className={styles.emptyDetail} eyebrow="// { }" title="No function selected">
              Change your filters to find a function.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}

/** Server functions in the creators' blue, client functions in the players' yellow. */
function RuntimeTag({ runtime }: { runtime: string }) {
  return (
    <span className={styles.runtimeTag} data-api-runtime>
      <Tag tone={runtime === "server" ? "blue" : "yellow"}>{runtime}</Tag>
    </span>
  );
}
