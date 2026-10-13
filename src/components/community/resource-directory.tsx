"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Chip, Tag } from "@/components/ui/chip";
import { DefinitionList } from "@/components/ui/data";
import { Loader, Notice } from "@/components/ui/feedback";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { arrowUp01, cancel01, download02, filterHorizontal, gridView, listView, refresh, search01, sparkles, star } from "@/components/ui/icons";
import { Display, Eyebrow } from "@/components/ui/typography";
import { useToast } from "@/components/toast";
import { MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/community/client-api";
import { directorySorts } from "@/lib/community/directory";
import { formatBytes, formatCount, formatDate, pickLatestStable } from "@/lib/community/format";
import { categories, categoryLabel, type CommunityDirectoryPage, type CommunityProject, type CommunityRelease } from "@/lib/community/types";
import { DownloadButton } from "./download-button";
import { useDerivative } from "./use-hover-media";
import { CategoryPlaceholder, WorkshopCard, WorkshopGrid } from "./workshop-card";

import styles from "./resource-directory.module.css";

/** One API page: the master ranks, the browser filters what it has loaded. */
const PAGE_SIZE = 100;
const SORT_IDS = new Set<string>(directorySorts.map(sort => sort.id));
const URL_EVENT = "open77-library-url";

type Filters = { query: string; category: string; kind: string; source: string; tag: string; sort: string; saved: boolean; view: "tiles" | "list" };

/* ---------- URL state, the same way the server directory keeps it ---------- */

function subscribeToHistory(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(URL_EVENT, listener);
  return () => { window.removeEventListener("popstate", listener); window.removeEventListener(URL_EVENT, listener); };
}

function updateFilters(patch: Partial<Record<keyof Filters, string | boolean>>, reset = false) {
  const url = new URL(window.location.href);
  if (reset) url.search = "";
  for (const [key, value] of Object.entries(patch)) {
    if (value === "" || value === false || value === "new" || (key === "view" && value === "tiles")) url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  }
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(URL_EVENT));
}

function parseFilters(search: string): Filters {
  const p = new URLSearchParams(search);
  const category = p.get("category") ?? "";
  const kind = p.get("kind") ?? "";
  const source = p.get("source") ?? p.get("hasSource") ?? "";
  const sort = p.get("sort") ?? "new";
  return {
    query: (p.get("query") ?? p.get("q") ?? "").slice(0, 200),
    category: categories.some(item => item.id === category) ? category : "",
    kind: kind === "resource" || kind === "showcase" ? kind : "",
    source: source === "true" || source === "false" ? source : "",
    tag: (p.get("tag") ?? p.get("tags") ?? "").split(",")[0]?.trim().toLowerCase() ?? "",
    sort: SORT_IDS.has(sort) ? sort : "new",
    saved: p.get("saved") === "true",
    view: p.get("view") === "list" ? "list" : "tiles",
  };
}

function useLibraryFilters(initialSearch: string): Filters {
  const search = useSyncExternalStore(subscribeToHistory, () => window.location.search, () => initialSearch);
  return useMemo(() => parseFilters(search), [search]);
}

function haystack(project: CommunityProject): string {
  const { content } = project;
  return [content.title, content.summary, content.category, categoryLabel(content.category), ...content.tags, project.creatorHandle ?? ""].join(" ").toLowerCase();
}

function insideControl(target: EventTarget | null): boolean {
  return Boolean((target as HTMLElement | null)?.closest("a, button, input, textarea, select, [contenteditable=true], dialog"));
}

/**
 * A document-scrolling catalog with a filter rail and modal quick view.
 * The master ranks the catalog (sort is a
 * server parameter); everything else filters instantly over what is loaded,
 * and the URL is the only source of truth for filters.
 */
export function ResourceDirectory({ initial, initialSort, initialSearch }: { initial: CommunityDirectoryPage | null; initialSort: string; initialSearch: string }) {
  const filters = useLibraryFilters(initialSearch);
  const { session } = useSession();
  const { show: showToast, node: toastNode } = useToast();
  const filterPanelId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [catalog, setCatalog] = useState<{ sort: string; items: CommunityProject[]; nextCursor: string | null; error: string | null; loading: boolean }>({
    sort: initialSort, items: initial?.items ?? [], nextCursor: initial?.nextCursor ?? null, error: initial ? null : "The resource hub could not be reached.", loading: false,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedState, setSaved] = useState<{ accountId: string; map: Record<string, boolean> } | null>(null);
  const saved = useMemo(() => session?.emailVerified && savedState?.accountId === session.accountId ? savedState.map : {}, [session, savedState]);
  const [busySave, setBusySave] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const closeFilters = () => { setFiltersOpen(false); filterButtonRef.current?.focus(); };
  useEffect(() => () => requestRef.current?.abort(), []);

  /* Sort is ranked by the master: a change reloads the first page. */
  const fetchPage = useCallback(async (sort: string, cursor: string | null) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setCatalog(current => ({ ...current, sort, ...(current.sort !== sort ? { items: [], nextCursor: null } : {}), loading: true, error: null }));
    const query = new URLSearchParams({ sort, limit: String(PAGE_SIZE) });
    if (cursor) query.set("cursor", cursor);
    try {
      const page = await api.listPublicProjects(query, AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]));
      if (controller.signal.aborted) return;
      setCatalog(current => ({ sort, items: cursor && current.sort === sort ? [...new Map([...current.items, ...page.items].map(item => [item.projectId, item])).values()] : page.items, nextCursor: page.nextCursor, error: null, loading: false }));
    } catch (error) {
      if (controller.signal.aborted) return;
      setCatalog(current => ({ ...current, sort, loading: false, error: error instanceof MasterApiError ? error.message : "The resource hub could not be reached." }));
    }
  }, []);
  useEffect(() => {
    if (catalog.sort === filters.sort) return;
    void fetchPage(filters.sort, null);
  }, [filters.sort, catalog.sort, fetchPage]);

  /* Saved state for what is loaded, once a verified session is known. */
  const loadedIds = useMemo(() => catalog.items.map(item => item.projectId).join(","), [catalog.items]);
  useEffect(() => {
    if (!session?.emailVerified || !loadedIds) return;
    const { token, accountId } = session;
    const controller = new AbortController();
    api.projectState(token, loadedIds.split(","), AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(states => { if (!controller.signal.aborted) setSaved({ accountId, map: Object.fromEntries(states.map(state => [state.projectId, state.saved])) }); })
      .catch(() => {});
    return () => controller.abort();
  }, [session, loadedIds]);

  const toggleSave = useCallback(async (project: CommunityProject) => {
    if (!session?.emailVerified) { showToast("Sign in with a verified account to save creations."); return; }
    const next = !saved[project.projectId];
    setBusySave(project.projectId);
    try {
      await api.setInteraction(session.token, project.projectId, "save", next, AbortSignal.timeout(10000));
      setSaved(current => ({ accountId: session.accountId, map: { ...(current?.accountId === session.accountId ? current.map : {}), [project.projectId]: next } }));
      showToast(next ? `Saved ${project.content.title}` : `Removed ${project.content.title} from saved`);
    } catch (error) {
      showToast(error instanceof MasterApiError ? error.message : "Your saved list could not be updated.");
    } finally { setBusySave(null); }
  }, [session, saved, showToast]);

  /* Everything except sort filters instantly over the loaded catalog. */
  const visible = useMemo(() => {
    const terms = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return catalog.items.filter(project => {
      const { content } = project;
      if (filters.category && content.category !== filters.category) return false;
      if (filters.kind && content.kind !== filters.kind) return false;
      if (filters.source === "true" && !content.sourceUrl) return false;
      if (filters.source === "false" && content.sourceUrl) return false;
      if (filters.tag && !content.tags.some(tag => tag.toLowerCase() === filters.tag)) return false;
      if (filters.saved && !saved[project.projectId]) return false;
      if (!terms.length) return true;
      const text = haystack(project);
      return terms.every(term => text.includes(term));
    });
  }, [catalog.items, filters, saved]);

  const facets = useMemo(() => {
    const byCategory = new Map<string, number>();
    const tags = new Map<string, number>();
    let resources = 0, showcases = 0, withSource = 0;
    for (const project of catalog.items) {
      byCategory.set(project.content.category, (byCategory.get(project.content.category) ?? 0) + 1);
      if (project.content.kind === "showcase") showcases++; else resources++;
      if (project.content.sourceUrl) withSource++;
      for (const tag of new Set(project.content.tags.map(tag => tag.toLowerCase()))) tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }
    return { byCategory, resources, showcases, withSource, tags: [...tags].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12) };
  }, [catalog.items]);

  const selected = useMemo(() => visible.find(project => project.projectId === selectedId) ?? null, [visible, selectedId]);
  const savedCount = Object.values(saved).filter(Boolean).length;

  const active = [
    ...(filters.query ? [{ key: "query", label: `Search: ${filters.query}` }] : []),
    ...(filters.category ? [{ key: "category", label: categoryLabel(filters.category) }] : []),
    ...(filters.kind ? [{ key: "kind", label: filters.kind === "resource" ? "Downloadable" : "Showcases" }] : []),
    ...(filters.source ? [{ key: "source", label: filters.source === "true" ? "Source available" : "No source link" }] : []),
    ...(filters.tag ? [{ key: "tag", label: `Tag: ${filters.tag}` }] : []),
    ...(filters.saved ? [{ key: "saved", label: "Saved" }] : []),
  ];
  const railFilters = active.filter(item => item.key !== "query" && item.key !== "category").length;
  const reset = () => updateFilters({}, true);

  /* Keep native Tab/Enter activation; never steal keys from a modal or control. */
  const keyState = useRef({ filtersOpen });
  useEffect(() => { keyState.current = { filtersOpen }; });
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.target as HTMLElement)?.closest('dialog')) return;
      const { filtersOpen } = keyState.current;
      const inControl = insideControl(event.target);
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !inControl) { event.preventDefault(); searchRef.current?.focus(); return; }
      if (event.key === "Escape") {
        if (filtersOpen) { setFiltersOpen(false); filterButtonRef.current?.focus(); }
        else if (document.activeElement === searchRef.current) searchRef.current?.blur();
        else setSelectedId(null);
        return;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const readout = catalog.loading ? "Loading…" : catalog.error ? "Workshop unavailable" : `${catalog.items.length} loaded${catalog.nextCursor ? " · more available" : ""}`;
  const heading = filters.saved ? "Saved" : filters.category ? categoryLabel(filters.category) : "All creations";
  const noMatch = (
    <div className={styles.state} data-workshop-no-match>
      <Eyebrow>No match</Eyebrow>
      <Display as="h3" size="sm">
        No matching creations
      </Display>
      <p className={styles.stateText}>Remove a filter or try a different search.</p>
      <Button color="blue" border lines="none" size="sm" onClick={reset}>
        Show everything
      </Button>
    </div>
  );
  const more = catalog.nextCursor ? (
    <div className={styles.more} data-load-more>
      <Button color="blue" border lines="none" busy={catalog.loading} onClick={() => void fetchPage(filters.sort, catalog.nextCursor)}>
        Load more creations
      </Button>
    </div>
  ) : null;

  return (
    <div className={`${styles.directory}${filtersOpen ? ` ${styles.filtersOpen}` : ""}`} data-workshop-directory>
      <div className={styles.command} role="search">
        <button
          ref={filterButtonRef}
          type="button"
          className={`${styles.tool} ${styles.filterToggle}`}
          aria-label="Toggle filters"
          aria-expanded={filtersOpen}
          aria-controls={filterPanelId}
          onClick={() => setFiltersOpen(open => !open)}
          data-filter-toggle
        >
          <Icon glyph={filterHorizontal} />
          <span className={styles.toolLabel}>Filters</span>
          {railFilters ? <b className={styles.badge}>{railFilters}</b> : null}
        </button>
        <Input
          ref={searchRef}
          className={styles.search}
          type="search"
          maxLength={200}
          aria-label="Search resources"
          placeholder="Search resources, creators, ideas…"
          icon={search01}
          trailing={<kbd aria-hidden="true">/</kbd>}
          value={filters.query}
          onChange={event => updateFilters({ query: event.target.value })}
        />
        <label className={styles.sort}>
          <span className={styles.sortLabel}>Sort</span>
          <Select compact aria-label="Sort resources" value={filters.sort} onChange={event => updateFilters({ sort: event.target.value })}>
            {directorySorts.map(sort => (
              <option key={sort.id} value={sort.id}>
                {sort.label}
              </option>
            ))}
          </Select>
        </label>
        <div className={styles.view} role="group" aria-label="Layout">
          <button className={styles.tool} type="button" aria-pressed={filters.view === "tiles"} title="Tiles" onClick={() => updateFilters({ view: "tiles" })}>
            <Icon glyph={gridView} label="Tiles" />
          </button>
          <button className={styles.tool} type="button" aria-pressed={filters.view === "list"} title="List" onClick={() => updateFilters({ view: "list" })}>
            <Icon glyph={listView} label="List" />
          </button>
        </div>
        <div className={styles.freshness} data-state={catalog.error ? "error" : catalog.loading ? "loading" : "ok"}>
          <span role="status">{readout}</span>
          <button className={styles.tool} type="button" disabled={catalog.loading} title="Reload the library" onClick={() => void fetchPage(filters.sort, null)}>
            <Icon glyph={refresh} />
            <span className={styles.toolLabel}>{catalog.loading ? "Loading…" : "Refresh"}</span>
          </button>
        </div>
      </div>

      <div className={styles.modes} role="group" aria-label="Filter by category">
        <Chip pressed={!filters.category} count={catalog.items.length} onClick={() => updateFilters({ category: "" })}>
          All
        </Chip>
        {categories.map(category => (
          <Chip key={category.id} pressed={filters.category === category.id} count={facets.byCategory.get(category.id) ?? 0} onClick={() => updateFilters({ category: category.id })}>
            {category.label}
          </Chip>
        ))}
      </div>

      <div className={styles.body}>
        <aside className={styles.rail} aria-label="Library filters" id={filterPanelId} data-filter-rail>
          <div className={styles.railHead}>
            <Eyebrow>Library</Eyebrow>
            <span className={styles.railClose}>
              <Button color="neutral" border lines="none" size="sm" iconOnly icon={cancel01} aria-label="Close filters" onClick={closeFilters} />
            </span>
          </div>
          <nav aria-label="Collections" className={styles.collections}>
            <button type="button" className={styles.collection} aria-pressed={!filters.saved && active.length === 0} onClick={reset}>
              <Icon glyph={search01} />
              <span className={styles.collectionLabel}>All creations</span>
              <span className={styles.collectionCount}>{catalog.items.length}</span>
            </button>
            <button type="button" className={styles.collection} aria-pressed={filters.kind === "resource"} onClick={() => updateFilters({ kind: filters.kind === "resource" ? "" : "resource" })}>
              <Icon glyph={download02} />
              <span className={styles.collectionLabel}>Downloadable</span>
              <span className={styles.collectionCount}>{facets.resources}</span>
            </button>
            <button type="button" className={styles.collection} aria-pressed={filters.kind === "showcase"} onClick={() => updateFilters({ kind: filters.kind === "showcase" ? "" : "showcase" })}>
              <Icon glyph={sparkles} />
              <span className={styles.collectionLabel}>Showcases</span>
              <span className={styles.collectionCount}>{facets.showcases}</span>
            </button>
            {session?.emailVerified ? (
              <button type="button" className={styles.collection} aria-pressed={filters.saved} onClick={() => updateFilters({ saved: !filters.saved })}>
                <Icon glyph={star} />
                <span className={styles.collectionLabel}>Saved</span>
                <span className={styles.collectionCount}>{savedCount}</span>
              </button>
            ) : null}
          </nav>
          <div className={styles.group} role="group" aria-labelledby={`${filterPanelId}-source`}>
            <h2 className={styles.groupTitle} id={`${filterPanelId}-source`}>
              Source code
            </h2>
            <Checkbox checked={filters.source === "true"} onChange={event => updateFilters({ source: event.target.checked ? "true" : "" })} data-source-filter="true">
              Source link provided <span className={styles.collectionCount}>({facets.withSource})</span>
            </Checkbox>
            <Checkbox checked={filters.source === "false"} onChange={event => updateFilters({ source: event.target.checked ? "false" : "" })} data-source-filter="false">
              No source link
            </Checkbox>
          </div>
          {facets.tags.length > 0 ? (
            <div className={styles.group}>
              <h2 className={styles.groupTitle}>Tags</h2>
              <div className={styles.tags}>
                {facets.tags.map(([tag, count]) => (
                  <Chip key={tag} size="sm" pressed={filters.tag === tag} count={count} onClick={() => updateFilters({ tag: filters.tag === tag ? "" : tag })}>
                    {tag}
                  </Chip>
                ))}
              </div>
            </div>
          ) : null}
          <div className={styles.links}>
            <Link href="/account/creations/new">Share a creation</Link>
            <Link href="/account/creations">My creations</Link>
            <Link href="/workshop">Workshop home</Link>
            <Link href="/docs/community-hub-warden">Install with Warden</Link>
          </div>
        </aside>

        <section className={styles.main} aria-label="Workshop">
          {catalog.error && catalog.items.length > 0 ? (
            <Notice kind="danger" title="The library could not be refreshed">
              {catalog.error} Your loaded creations are still shown. Use Refresh to try again.
            </Notice>
          ) : null}
          {active.length ? (
            <div className={styles.active} data-active-filters>
              <Eyebrow muted>Filters</Eyebrow>
              {active.map(item => (
                <Chip key={item.key} size="sm" pressed className={styles.removable} onClick={() => updateFilters({ [item.key]: item.key === "saved" ? false : "" })} aria-label={`Remove ${item.label} filter`}>
                  {item.label} <Icon glyph={cancel01} />
                </Chip>
              ))}
              <button type="button" className={styles.reset} onClick={reset}>
                Reset all
              </button>
            </div>
          ) : null}
          <section aria-label="Creations">
            {catalog.items.length === 0 ? (
              <div className={styles.state} role="status" aria-busy={catalog.loading} data-kind={catalog.error ? "error" : catalog.loading ? "loading" : "empty"} data-workshop-state>
                <Eyebrow>{catalog.error ? "Hub unreachable" : "Workshop"}</Eyebrow>
                <Display as="h2" size="sm">
                  {catalog.error ? "Unable to load the library" : catalog.loading ? "Reading the library…" : "Nothing published yet"}
                </Display>
                <p className={styles.stateText}>
                  {catalog.error ?? (catalog.loading ? "Creations appear here as soon as the hub answers." : "The first reviewed creations will appear here. Bring something you have built.")}
                </p>
                {catalog.error ? (
                  <Button color="blue" lines="none" size="sm" icon={refresh} iconPosition="left" busy={catalog.loading} onClick={() => void fetchPage(filters.sort, null)}>
                    Try again
                  </Button>
                ) : catalog.loading ? (
                  <>
                    <Loader label="Workshop" />
                    <div className={styles.skeleton} aria-hidden="true">
                      <i />
                      <i />
                    </div>
                  </>
                ) : (
                  <Button color="blue" lines="none" size="sm" href="/account/creations/new">
                    Share a creation
                  </Button>
                )}
              </div>
            ) : (
              <div className={styles.main}>
                <div className={styles.resultsHead}>
                  <h2 className={styles.resultsTitle}>
                    <Display as="span" size="xs">
                      {heading}
                    </Display>
                    <b className={styles.resultsCount} role="status">
                      {visible.length}
                      {active.length ? ` of ${catalog.items.length}` : ""}
                    </b>
                  </h2>
                  <span className={styles.muted}>{catalog.nextCursor ? "Search applies to loaded creations" : directorySorts.find(sort => sort.id === filters.sort)?.label}</span>
                </div>
                {filters.view === "tiles" ? (
                  visible.length ? (
                    <WorkshopGrid columns={2} label="Creations">
                      {visible.map(project => (
                        <ResourceTile
                          key={project.projectId}
                          project={project}
                          isSaved={!!saved[project.projectId]}
                          savingSave={busySave === project.projectId}
                          isSelected={selected?.projectId === project.projectId}
                          onSelect={() => setSelectedId(id => (id === project.projectId ? null : project.projectId))}
                          onToggleSave={() => void toggleSave(project)}
                        />
                      ))}
                    </WorkshopGrid>
                  ) : (
                    noMatch
                  )
                ) : (
                  <div>
                    <div className={styles.listHead} aria-hidden="true">
                      <span>Creation</span>
                      <span>Category · tags</span>
                      <span>Status</span>
                      <span>Popularity</span>
                      <span />
                    </div>
                    {visible.length ? (
                      <ul className={styles.rows} aria-label="Creations">
                        {visible.map(project => (
                          <ResourceRow
                            key={project.projectId}
                            project={project}
                            isSaved={!!saved[project.projectId]}
                            savingSave={busySave === project.projectId}
                            isSelected={selected?.projectId === project.projectId}
                            onSelect={() => setSelectedId(id => (id === project.projectId ? null : project.projectId))}
                            onToggleSave={() => void toggleSave(project)}
                          />
                        ))}
                      </ul>
                    ) : (
                      noMatch
                    )}
                  </div>
                )}
                {more}
              </div>
            )}
          </section>
        </section>
      </div>

      <footer className={styles.footnote}>
        <span>OPEN//77 Workshop</span>
        <span className={styles.footnoteKeys} aria-hidden="true">
          <kbd>Tab</kbd> explore · <kbd>Enter</kbd> open · <kbd>/</kbd> search
        </span>
        <span>Free resources · reviewed before publication</span>
        <Link href="/account/creations/new">Share a creation ↗</Link>
      </footer>
      <ResourceInspector project={selected} isSaved={selected ? !!saved[selected.projectId] : false} onToggleSave={() => selected && void toggleSave(selected)} onClose={() => setSelectedId(null)} />
      {toastNode}
    </div>
  );
}

function SaveButton({ title, isSaved, busy, onToggle }: { title: string; isSaved: boolean; busy: boolean; onToggle: () => void }) {
  return (
    <Button
      color="blue"
      border={!isSaved}
      lines="none"
      size="sm"
      iconOnly
      icon={star}
      aria-pressed={isSaved}
      disabled={busy}
      aria-label={isSaved ? `Remove ${title} from saved` : `Save ${title}`}
      onClick={onToggle}
    />
  );
}

function ResourceTile({ project, isSaved, savingSave, isSelected, onSelect, onToggleSave }: {
  project: CommunityProject; isSaved: boolean; savingSave: boolean; isSelected: boolean; onSelect: () => void; onToggleSave: () => void;
}) {
  const { content } = project;
  const cover = useDerivative(content.media?.[0]?.mediaId ?? content.clipMediaId, content.media?.[0] ? "card" : "poster");
  return (
    <WorkshopCard
      project={project}
      cover={cover}
      selected={isSelected}
      actions={
        <>
          <SaveButton title={content.title} isSaved={isSaved} busy={savingSave} onToggle={onToggleSave} />
          <span data-quick-view>
            <Button color="neutral" border lines="none" size="sm" aria-pressed={isSelected} onClick={onSelect}>
              Quick view
            </Button>
          </span>
        </>
      }
    />
  );
}

function ResourceRow({ project, isSaved, savingSave, isSelected, onSelect, onToggleSave }: {
  project: CommunityProject; isSaved: boolean; savingSave: boolean; isSelected: boolean; onSelect: () => void; onToggleSave: () => void;
}) {
  const { content } = project;
  const thumb = useDerivative(content.media?.[0]?.mediaId, "card");
  const mark = categories.find(category => category.id === content.category)?.mark ?? "//";
  return (
    <li
      className={styles.row}
      data-workshop-row
      data-selected={isSelected || undefined}
      onClick={event => { if ((event.target as HTMLElement).closest("a, button")) return; onSelect(); }}
    >
      <div className={styles.rowMain}>
        <span className={styles.thumb} aria-hidden="true">
          {thumb ? <Image unoptimized src={thumb} loading="eager" width={96} height={54} alt="" referrerPolicy="no-referrer" /> : <span className={styles.thumbMark}>{mark}</span>}
        </span>
        <span className={styles.rowId}>
          <Link className={styles.rowName} href={`/workshop/${project.slug}`} aria-label={`Open ${content.title}`}>
            {content.title}
          </Link>
          <span className={styles.rowDesc} title={content.summary}>
            {project.creatorHandle ? `@${project.creatorHandle} · ` : ""}
            {content.summary || "Community creation"}
          </span>
        </span>
      </div>
      <div className={styles.rowTags}>
        <Tag onClick={() => updateFilters({ category: content.category })} title={`Show ${categoryLabel(content.category)}`}>
          {categoryLabel(content.category)}
        </Tag>
        {content.tags.slice(0, 3).map(tag => (
          <Tag key={tag} tone="neutral" onClick={() => updateFilters({ tag: tag.toLowerCase() })} title={`Filter by ${tag}`}>
            {tag}
          </Tag>
        ))}
      </div>
      <span className={styles.rowStatus} data-stable={content.maturity === "stable" || undefined}>
        {content.kind === "showcase" ? "Showcase" : content.maturity}
      </span>
      <span className={styles.rowStats}>
        <span title="Upvotes">
          <Icon glyph={arrowUp01} />
          {formatCount(project.upvotes)}
        </span>
        {content.kind === "resource" ? (
          <span title="Downloads">
            <Icon glyph={download02} />
            {formatCount(project.downloads)}
          </span>
        ) : null}
      </span>
      <span className={styles.rowActions}>
        <SaveButton title={content.title} isSaved={isSaved} busy={savingSave} onToggle={onToggleSave} />
        <Button color="blue" lines="none" size="sm" href={`/workshop/${project.slug}`} aria-label={`Open ${content.title}`}>
          {content.kind === "resource" ? "Get" : "View"}
        </Button>
      </span>
    </li>
  );
}

function ResourceInspector({ project, isSaved, onToggleSave, onClose }: { project: CommunityProject | null; isSaved: boolean; onToggleSave: () => void; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!project || !dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => { dialog.close(); if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, [project]);
  const cover = useDerivative(project?.content.media?.[0]?.mediaId ?? project?.content.clipMediaId, project?.content.media?.[0] ? "gallery" : "poster");
  const [latest, setLatest] = useState<{ projectId: string; release: CommunityRelease | null; failed: boolean } | null>(null);
  useEffect(() => {
    if (!project || project.content.kind !== "resource") return;
    const controller = new AbortController();
    api.publicReleases(project.projectId, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(page => { if (!controller.signal.aborted) setLatest({ projectId: project.projectId, release: pickLatestStable(page.items), failed: false }); })
      .catch(() => { if (!controller.signal.aborted) setLatest({ projectId: project.projectId, release: null, failed: true }); });
    return () => controller.abort();
  }, [project]);
  if (!project) return null;
  const { content } = project;
  const release = latest?.projectId === project.projectId ? latest : null;
  const facts = [
    ...(content.kind === "resource" ? [{ label: "Latest", value: release?.release ? `v${release.release.version} · ${formatBytes(release.release.sizeBytes)}` : release?.failed ? "Unavailable" : release ? "No stable release" : "…" }] : []),
    ...(content.kind === "resource" && release?.release ? [{ label: "Tested on", value: release.release.metadata.testedBuilds.length ? release.release.metadata.testedBuilds.slice(0, 2).join(", ") : "Not declared" }] : []),
    { label: "Creator", value: project.creatorHandle ? <Link href={`/workshop/creators/${project.creatorHandle}`}>@{project.creatorHandle}</Link> : "Community creator" },
    { label: "Status", value: content.maturity === "stable" ? "Stable" : "Experimental" },
    { label: "Upvotes", value: formatCount(project.upvotes) },
    ...(content.kind === "resource" ? [{ label: "Downloads", value: formatCount(project.downloads) }] : []),
    { label: "Updated", value: formatDate(project.updatedAtUtc) },
    { label: "Source", value: content.sourceUrl ? "Link provided" : "Not linked" },
  ];
  return (
    <dialog
      ref={dialogRef}
      className={styles.quick}
      aria-labelledby={titleId}
      onCancel={onClose}
      data-quick-view-dialog
      onKeyDown={event => {
        if (event.key !== "Tab") return;
        const stops = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length);
        const first = stops[0], last = stops.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}
    >
      <div className={styles.quickFrame}>
        <div className={styles.quickCover}>
          {cover ? <Image unoptimized src={cover} width={960} height={540} alt="" referrerPolicy="no-referrer" /> : <CategoryPlaceholder category={content.category} className={styles.quickPlaceholder} />}
          <span className={styles.quickClose}>
            <Button color="neutral" border lines="none" size="sm" iconOnly icon={cancel01} aria-label="Close creation details" onClick={onClose} />
          </span>
          <span className={styles.quickMode}>
            <Tag variant="solid">{categoryLabel(content.category)}</Tag>
          </span>
        </div>
        <div className={styles.quickBody}>
          <div>
            <Eyebrow>{content.kind === "showcase" ? "// Showcase" : "// Resource"}</Eyebrow>
            <Display as="h2" size="sm" id={titleId}>
              {content.title}
            </Display>
          </div>
          <div className={styles.quickActions}>
            {content.kind === "resource" && release?.release ? (
              <DownloadButton releaseId={release.release.releaseId} version={release.release.version} />
            ) : (
              <Button key={release ? "ready" : "pending"} color="blue" lines="none" href={`/workshop/${project.slug}${content.kind === "resource" ? "/versions" : ""}`}>
                {content.kind === "resource" ? (release ? "Browse versions" : "Checking releases…") : "View showcase"}
              </Button>
            )}
            <Button
              color="blue"
              border={!isSaved}
              lines="none"
              iconOnly
              icon={star}
              aria-pressed={isSaved}
              aria-label={isSaved ? "Remove from saved" : "Save creation"}
              onClick={onToggleSave}
            />
            <Link className={styles.quickMore} href={`/workshop/${project.slug}`}>
              Full page ↗
            </Link>
          </div>
          <p className={styles.quickDesc}>{content.summary || "This creation has no summary yet."}</p>
          <DefinitionList columns={2} items={facts} />
          {content.tags.length > 0 ? (
            <div className={styles.tags}>
              {content.tags.map(tag => (
                <Tag key={tag} tone="neutral" onClick={() => updateFilters({ tag: tag.toLowerCase() })}>
                  {tag}
                </Tag>
              ))}
            </div>
          ) : null}
          <div className={styles.quickLinks}>
            <Link href={`/workshop/${project.slug}/discussion`}>Discussion</Link>
            {content.kind === "resource" ? <Link href={`/workshop/${project.slug}/versions`}>All versions</Link> : null}
          </div>
        </div>
      </div>
    </dialog>
  );
}
