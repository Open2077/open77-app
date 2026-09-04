"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { ApiEntry } from "@/lib/api-reference";
import { API_CATEGORIES, apiCategory, apiExplorerHref } from "@/lib/api-categories";
import { InlineMarkdown } from "@/components/docs/inline-markdown";
import { SearchIcon } from "@/components/icons";

const LOCATION_EVENT = "open77:api-location";
function subscribeLocation(callback: () => void) {
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

function CopyButton({ value, label }: { value: string; label: string }) {
  const [message, setMessage] = useState("");
  return <button className="api-copy" onClick={async () => {
    try { await navigator.clipboard.writeText(value); setMessage("Copied"); }
    catch { setMessage("Copy unavailable"); }
  }} title={label} aria-label={label}><span aria-hidden="true">⧉</span> <span aria-live="polite">{message || label}</span></button>;
}

export function ApiExplorer({ entries }: { entries: ApiEntry[] }) {
  const location = useSyncExternalStore(subscribeLocation, locationSnapshot, serverSnapshot);
  const [mobileDetail, setMobileDetail] = useState<boolean | null>(null);
  const detail = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
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
  const selected = results.find((entry) => entryKey(entry) === selectedKey) ?? results[0];
  const groups = API_CATEGORIES.map((item) => ({ ...item, entries: results.filter((entry) => apiCategory(entry.namespace).id === item.id) })).filter((item) => item.entries.length);

  useEffect(() => {
    if (!selectedKey) return;
    const container = list.current;
    const row = container?.querySelector<HTMLElement>(".is-selected");
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
  }

  return (
    <div className={`api-explorer${(mobileDetail ?? Boolean(selectedKey)) ? " api-show-detail" : ""}`}>
      <div className="api-toolbar">
        <h1>API Reference</h1>
        <div className="api-runtime-filter" role="group" aria-label="API runtime">
          <span>API set</span>
          {(["all", "server", "client"] as const).map((runtime) => <button key={runtime} aria-pressed={side === runtime} onClick={() => updateFilters({ side: runtime, namespace: "all" })}>{runtime === "all" ? "All" : runtime === "server" ? "Server" : "Client"}<small>{counts[runtime]}</small></button>)}
        </div>
        <span className="api-language">Language <strong>Lua</strong><span className="api-language-dot" /></span>
        <Link className="api-guide-link" href="/docs/server-resources">Scripting guide ↗</Link>
      </div>
      <div className="api-filters">
        <label className="api-search-field"><SearchIcon size={17} /><input type="search" aria-label="Search API functions" placeholder="Search functions, e.g. vehicles.create…" value={query} onChange={(event) => updateFilters({ q: event.target.value })} /></label>
        <label className="api-select"><span>Category</span><select aria-label="API category" value={category} onChange={(event) => updateFilters({ category: event.target.value, namespace: "all" })}><option value="all">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.label} ({item.count})</option>)}</select></label>
        <label className="api-select api-namespace-select"><span>Namespace</span><select aria-label="API namespace" value={namespace} onChange={(event) => updateFilters({ namespace: event.target.value })}><option value="all">All namespaces</option>{namespaces.map((name) => <option key={name} value={name}>{name === "_G" ? "Globals" : name}</option>)}</select></label>
        <span className="api-result-count" role="status">{results.length} functions</span>
      </div>
      <div className="api-mobile-switch" role="group" aria-label="Reference panel"><button aria-pressed={!(mobileDetail ?? Boolean(selectedKey))} onClick={() => setMobileDetail(false)}>Functions ({results.length})</button><button aria-pressed={mobileDetail ?? Boolean(selectedKey)} onClick={() => setMobileDetail(true)}>Function details</button></div>
      <div className="api-panes">
        <section className="api-detail" ref={detail} aria-label="Selected function">
          {selected ? <div key={entryKey(selected)}>
            <div className="api-detail-meta"><span>{apiCategory(selected.namespace).label}</span><span className={`api-side api-side-${selected.runtime}`}>{selected.runtime}</span></div>
            <div className="api-detail-heading"><p>{selected.namespace === "_G" ? "Global function" : selected.namespace}</p><h2>{selected.name}</h2><p className="api-detail-summary"><InlineMarkdown text={selected.summary} /></p></div>
            <div className="api-signature-block"><div><span>Lua signature</span><CopyButton value={selected.signature} label="Copy" /></div><pre><code>{selected.documentedSignature ? selected.signature : <><span className="api-code-comment">-- {selected.runtime} · {selected.namespace}</span>{"\n"}{selected.qualified}({selected.params.length ? "\n" : ""}{selected.params.map((param, index) => <span key={param.name}>{"    "}<span className="api-code-param">{param.name}</span>{index < selected.params.length - 1 ? "," : ""}<span className="api-code-comment">{` -- ${param.type}${param.optional ? " (optional)" : ""}`}</span>{"\n"}</span>)})</>}</code></pre></div>
            <div className="api-detail-body">
              {selected.description && <section><h3>Description</h3><p><InlineMarkdown text={selected.description} /></p></section>}
              <section><h3>Parameters <span>{selected.params.length}</span></h3>{selected.params.length ? <dl className="api-parameters">{selected.params.map((param) => <div key={param.name}><dt><code>{param.name}</code><span>{param.type === "not specified" ? "" : param.type}</span></dt><dd>{param.optional ? "Optional" : "Required"}{param.default !== null ? <> · Default: <code>{param.default}</code></> : null}</dd></div>)}</dl> : <p className="api-muted">{selected.signatureKnown === false ? "See the source guide for this function’s arguments." : "This function takes no parameters."}</p>}</section>
              <section><h3>Returns</h3>{selected.returns.length ? <ul className="api-return-values">{selected.returns.map((value, index) => <li key={index}><InlineMarkdown text={value} /></li>)}</ul> : <p className="api-muted">No return value documented.</p>}</section>
              {selected.example && <section><div className="api-example-heading"><h3>Example</h3><CopyButton value={selected.example} label="Copy example" /></div><pre className="api-example"><code>{selected.example}</code></pre></section>}
              {selected.inferred && <p className="api-inferred">This signature is inferred from the binding. Check the guide for usage details.</p>}
              <div className="api-detail-links"><CopyButton value={typeof window === "undefined" ? apiExplorerHref(selected) : window.location.origin + apiExplorerHref(selected)} label="Copy link" /><Link href={selected.href}>Full namespace reference ↗</Link>{selected.guideHref && <Link href={selected.guideHref}>Read the source guide ↗</Link>}</div>
              <details className="api-source"><summary>Source information</summary><p>{selected.guideHref ? "Wiki: " : ""}{selected.source}{selected.source_line ? `:${selected.source_line}` : ""}<br />{selected.handler}</p></details>
            </div>
          </div> : <div className="api-empty-detail"><span aria-hidden="true">{ "{ }" }</span><h2>No function selected</h2><p>Change your filters to find a function.</p></div>}
        </section>
        <div className="api-function-list" ref={list} aria-label="API functions">
          <div className="api-list-heading"><span>Functions by category</span><span>Runtime</span></div>
          {groups.map((group) => <section key={group.id} className="api-function-group"><h2>{group.label}<span>{group.entries.length}</span></h2><ul>{group.entries.map((entry) => <li key={entryKey(entry)}><a href={apiExplorerHref(entry)} className={`api-function-row${selected && entryKey(selected) === entryKey(entry) ? " is-selected" : ""}`} aria-current={selected && entryKey(selected) === entryKey(entry) ? "true" : undefined} onClick={(event) => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault(); selectEntry(entry);
          }}><span className="api-function-text"><code>{entry.qualified}<span>({entry.params.map((param) => `${param.name}${param.optional ? "?" : ""}`).join(", ")})</span></code><span className="api-function-summary">{entry.summary.replace(/\*\*|`/g, "")}</span></span><span className={`api-side api-side-${entry.runtime}`}>{entry.runtime}</span></a></li>)}</ul></section>)}
          {!results.length && <div className="api-no-results"><SearchIcon size={28} /><h2>No matching functions</h2><p>Try another name, category or runtime.</p><button onClick={() => updateFilters({ q: "", side: "all", category: "all", namespace: "all" })}>Clear all filters</button></div>}
          <p className="api-list-footer">{entries.length} functions · Open77 wiki · Lua 5.4</p>
        </div>
      </div>
    </div>
  );
}
