"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { DownloadIcon, FilterIcon, SearchIcon, StarIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { MasterApiError } from "@/lib/account/api";
import { useSession } from "@/lib/account/session";
import * as api from "@/lib/community/client-api";
import { directorySorts } from "@/lib/community/directory";
import { formatBytes, formatCount, formatDate, pickLatestStable } from "@/lib/community/format";
import { categories, categoryLabel, type CommunityDirectoryPage, type CommunityProject, type CommunityRelease } from "@/lib/community/types";
import { DownloadButton } from "./download-button";
import { useDerivative, useHoverPreview } from "./use-hover-media";

/** One API page: the master ranks, the browser filters what it has loaded. */
const PAGE_SIZE = 100;
const SORT_IDS = new Set<string>(directorySorts.map(sort => sort.id));
const URL_EVENT = "open77-library-url";

type Filters = { query: string; category: string; kind: string; source: string; tag: string; sort: string; saved: boolean; view: "tiles" | "list" };

/** Wide art per category, for a selected creation without screenshots. */
function categoryArt(category: string): string {
  switch (category) {
    case "gamemodes": return "/assets/exp-roleplay.jpg";
    case "maps": return "/assets/exp-exploration.jpg";
    case "ui": return "/assets/play-together.jpg";
    case "tools": return "/assets/create-server.jpg";
    default: return "/assets/exp-custom.jpg";
  }
}

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
    query: p.get("query") ?? p.get("q") ?? "",
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
  return Boolean((target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable=true], dialog"));
}

/**
 * The community library as a full-window directory, the launcher's desktop
 * kit at the server browser's density: command bar, filter rail, dense rows,
 * an inspector beside the list. The master ranks the catalog (sort is a
 * server parameter); everything else filters instantly over what is loaded,
 * and the URL is the only source of truth for filters.
 */
export function ResourceDirectory({ initial, initialSort, initialSearch }: { initial: CommunityDirectoryPage | null; initialSort: string; initialSearch: string }) {
  const filters = useLibraryFilters(initialSearch);
  const router = useRouter();
  const { session } = useSession();
  const { show: showToast, node: toastNode } = useToast();
  const filterPanelId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const [catalog, setCatalog] = useState<{ sort: string; items: CommunityProject[]; nextCursor: string | null; error: string | null; loading: boolean }>({
    sort: initialSort, items: initial?.items ?? [], nextCursor: initial?.nextCursor ?? null, error: initial ? null : "The resource hub could not be reached.", loading: false,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedState, setSaved] = useState<{ accountId: string; map: Record<string, boolean> } | null>(null);
  const saved = useMemo(() => session?.emailVerified && savedState?.accountId === session.accountId ? savedState.map : {}, [session, savedState]);
  const [busySave, setBusySave] = useState<string | null>(null);

  /* Sort is ranked by the master: a change reloads the first page. */
  const fetchPage = useCallback(async (sort: string, cursor: string | null) => {
    setCatalog(current => ({ ...current, loading: true, error: null }));
    const query = new URLSearchParams({ sort, limit: String(PAGE_SIZE) });
    if (cursor) query.set("cursor", cursor);
    try {
      const page = await api.listPublicProjects(query, AbortSignal.timeout(15000));
      setCatalog(current => ({ sort, items: cursor && current.sort === sort ? [...current.items, ...page.items] : page.items, nextCursor: page.nextCursor, error: null, loading: false }));
    } catch (error) {
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

  /* Keyboard: `/` searches, ↑/↓ walk the list, Enter opens the page, Escape clears. */
  const keyState = useRef({ visible, selected, filtersOpen });
  useEffect(() => { keyState.current = { visible, selected, filtersOpen }; });
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const { visible, selected, filtersOpen } = keyState.current;
      const inControl = insideControl(event.target);
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !inControl) { event.preventDefault(); searchRef.current?.focus(); return; }
      if (event.key === "Escape") {
        if (filtersOpen) setFiltersOpen(false);
        else if (document.activeElement === searchRef.current) searchRef.current?.blur();
        else setSelectedId(null);
        return;
      }
      if (inControl && event.target !== searchRef.current) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (!visible.length) return;
        event.preventDefault();
        const index = selected ? visible.findIndex(project => project.projectId === selected.projectId) : -1;
        const next = event.key === "ArrowDown" ? Math.min(visible.length - 1, index + 1) : Math.max(0, index - 1);
        const id = visible[next]?.projectId;
        if (!id) return;
        setSelectedId(id);
        listRef.current?.querySelector<HTMLElement>(`[data-project-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest" });
        return;
      }
      if (event.key === "Enter" && selected && !inControl) { event.preventDefault(); router.push(`/workshop/${selected.slug}`); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [router]);

  const readout = catalog.loading ? "Loading…" : catalog.error ? "Hub unavailable" : `${catalog.items.length} loaded${catalog.nextCursor ? " · more available" : ""}`;

  return <div className={`directory-workspace directory-dense hub-directory${filtersOpen ? " filters-open" : ""}${selected ? " has-selection" : ""}`}>
    <div className="directory-command" role="search">
      <button className="directory-tool directory-filter-toggle" aria-expanded={filtersOpen} aria-controls={filterPanelId} onClick={() => setFiltersOpen(open => !open)}>
        <FilterIcon size={15} /><span>Filters</span>{railFilters ? <b>{railFilters}</b> : null}</button>
      <div className="sb-search"><SearchIcon size={16} />
        <input ref={searchRef} type="search" aria-label="Search resources" placeholder="Search resources, gamemodes, maps, tools, creators…" value={filters.query} onChange={event => updateFilters({ query: event.target.value })} />
        <kbd aria-hidden="true">/</kbd></div>
      <div className="directory-modes" role="group" aria-label="Filter by category">
        <button className={`filter-chip${!filters.category ? " is-active" : ""}`} aria-pressed={!filters.category} onClick={() => updateFilters({ category: "" })}>All<small>{catalog.items.length}</small></button>
        {categories.map(category => <button key={category.id} className={`filter-chip${filters.category === category.id ? " is-active" : ""}`} aria-pressed={filters.category === category.id} onClick={() => updateFilters({ category: category.id })}>
          {category.label}<small>{facets.byCategory.get(category.id) ?? 0}</small></button>)}
      </div>
      <label className="select-wrap sb-sort"><span className="select-label">Sort</span>
        <select aria-label="Sort resources" value={filters.sort} onChange={event => updateFilters({ sort: event.target.value })}>{directorySorts.map(sort => <option key={sort.id} value={sort.id}>{sort.label}</option>)}</select></label>
      <div className="hub-view-toggle" role="group" aria-label="Layout">
        <button className={`sb-tool${filters.view === "tiles" ? " is-active" : ""}`} type="button" aria-pressed={filters.view === "tiles"} title="Tiles" onClick={() => updateFilters({ view: "tiles" })}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" fill="currentColor" /></svg></button>
        <button className={`sb-tool${filters.view === "list" ? " is-active" : ""}`} type="button" aria-pressed={filters.view === "list"} title="List" onClick={() => updateFilters({ view: "list" })}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M2 3h12M2 8h12M2 13h12" stroke="currentColor" strokeWidth="2" /></svg></button>
      </div>
      <div className="directory-freshness" data-state={catalog.error ? "error" : catalog.loading ? "loading" : "ok"}>
        <span role="status">{readout}</span>
        <button className="sb-tool" type="button" disabled={catalog.loading} title="Reload the library" onClick={() => void fetchPage(filters.sort, null)}>
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
          <span>{catalog.loading ? "Loading…" : "Refresh"}</span></button>
      </div>
    </div>
    <div className="directory-body">
      <aside className="directory-rail" aria-label="Library filters" id={filterPanelId}>
        <div className="directory-rail-heading"><span className="directory-kicker">Library</span>
          <button className="directory-filter-close" onClick={() => setFiltersOpen(false)} aria-label="Close filters">×</button></div>
        <nav aria-label="Collections" className="directory-collections">
          <button className={`directory-nav${!filters.saved && active.length === 0 ? " is-active" : ""}`} aria-pressed={!filters.saved && active.length === 0} onClick={reset}><SearchIcon size={15} /> All creations <small>{catalog.items.length}</small></button>
          <button className={`directory-nav${filters.kind === "resource" ? " is-active" : ""}`} aria-pressed={filters.kind === "resource"} onClick={() => updateFilters({ kind: filters.kind === "resource" ? "" : "resource" })}><DownloadIcon size={14} /> Downloadable <small>{facets.resources}</small></button>
          <button className={`directory-nav${filters.kind === "showcase" ? " is-active" : ""}`} aria-pressed={filters.kind === "showcase"} onClick={() => updateFilters({ kind: filters.kind === "showcase" ? "" : "showcase" })}><span className="hub-nav-mark" aria-hidden="true">◇</span> Showcases <small>{facets.showcases}</small></button>
          {session?.emailVerified && <button className={`directory-nav${filters.saved ? " is-active" : ""}`} aria-pressed={filters.saved} onClick={() => updateFilters({ saved: !filters.saved })}><StarIcon size={15} /> Saved <small>{savedCount}</small></button>}
        </nav>
        <div className="directory-filter-section client-filters" role="group" aria-label="Filter by category"><h2>Category</h2>
          <button className={`directory-mode-row${!filters.category ? " is-active" : ""}`} aria-pressed={!filters.category} onClick={() => updateFilters({ category: "" })}><span>All categories</span><small>{catalog.items.length}</small></button>
          {categories.map(category => <button key={category.id} className={`directory-mode-row${filters.category === category.id ? " is-active" : ""}`} aria-pressed={filters.category === category.id} onClick={() => updateFilters({ category: category.id })}>
            <span>{category.label}</span><small>{facets.byCategory.get(category.id) ?? 0}</small></button>)}
        </div>
        <div className="directory-filter-section" role="group" aria-label="Source code"><h2>Source code</h2>
          <label className="directory-checkbox"><input type="checkbox" checked={filters.source === "true"} onChange={event => updateFilters({ source: event.target.checked ? "true" : "" })} /> Source link provided <small className="directory-muted">({facets.withSource})</small></label>
          <label className="directory-checkbox"><input type="checkbox" checked={filters.source === "false"} onChange={event => updateFilters({ source: event.target.checked ? "false" : "" })} /> No source link</label>
        </div>
        {facets.tags.length > 0 && <div className="directory-filter-section"><h2>Tags</h2>
          <div className="directory-tag-filters">{facets.tags.map(([tag, count]) => <button key={tag} aria-pressed={filters.tag === tag} onClick={() => updateFilters({ tag: filters.tag === tag ? "" : tag })}>{tag}<small>{count}</small></button>)}</div></div>}
        <div className="directory-rail-bottom">
          <Link href="/account/creations/new">Share a creation</Link>
          <Link href="/account/creations">My creations</Link>
          <Link href="/workshop/discover">Workshop home</Link>
          <Link href="/docs/community-hub-warden">Install with Warden</Link>
        </div>
      </aside>
      <section className="directory-main" aria-label="Workshop">
        {active.length ? <div className="directory-results-bar"><span className="directory-kicker">Filters</span>
          <div className="directory-active-filters">{active.map(item => <button key={item.key} onClick={() => updateFilters({ [item.key]: item.key === "saved" ? false : "" })} aria-label={`Remove ${item.label} filter`}>{item.label}<span aria-hidden="true">×</span></button>)}
            <button className="sb-clear" onClick={reset}>Reset all</button></div></div> : null}
        <section className="sb-col-main" aria-label="Creations" ref={listRef}>
          {catalog.items.length === 0 ? <div className="sb-offline" role="status" aria-busy={catalog.loading}>
            <span className="directory-kicker">{catalog.error ? "HUB UNREACHABLE" : "WORKSHOP"}</span>
            <h2>{catalog.error ? "Unable to load the library" : catalog.loading ? "Reading the library…" : "Nothing published yet"}</h2>
            <p>{catalog.error ?? (catalog.loading ? "Creations appear here as soon as the hub answers." : "The first reviewed creations will appear here. Bring something you have built.")}</p>
            {catalog.error ? <button className="btn btn-primary btn-small" type="button" disabled={catalog.loading} onClick={() => void fetchPage(filters.sort, null)}>Try again</button> :
              catalog.loading ? <div className="directory-loading" aria-hidden="true"><i /><i /><i /></div> : <Link className="btn btn-primary btn-small" href="/account/creations/new">Share a creation</Link>}
          </div> : filters.view === "tiles" ? <>
            <div className="hub-tiles-head"><h1><span>{filters.saved ? "Saved" : filters.category ? categoryLabel(filters.category) : "Creations"}</span>
              <b role="status">{visible.length}{active.length ? ` of ${catalog.items.length}` : ""}</b><i>· {directorySorts.find(sort => sort.id === filters.sort)?.label.toLowerCase()}</i></h1>
              <span className="directory-muted">Hover a tile to flip through its screenshots</span></div>
            <ul className="hub-tiles">
              {visible.map(project => <ResourceTile key={project.projectId} project={project} isSaved={!!saved[project.projectId]} savingSave={busySave === project.projectId}
                isSelected={selected?.projectId === project.projectId} onSelect={() => setSelectedId(id => id === project.projectId ? null : project.projectId)} onToggleSave={() => void toggleSave(project)} />)}
              {visible.length === 0 && <li className="server-empty hub-tiles-empty"><span className="directory-kicker">NO MATCH</span><h3>No matching creations</h3><p>Remove a filter or try a different search.</p>
                <button className="btn btn-primary btn-small" onClick={reset}>Show everything</button></li>}
              {catalog.nextCursor && <li className="hub-directory-more hub-tiles-more"><button className="btn btn-ghost btn-small" type="button" disabled={catalog.loading} onClick={() => void fetchPage(filters.sort, catalog.nextCursor)}>{catalog.loading ? "Loading…" : "Load more creations"}</button></li>}
            </ul>
          </> : <>
            <div className="sb-col-head">
              <h1><span>{filters.saved ? "Saved" : filters.category ? categoryLabel(filters.category) : "Creations"}</span>
                <b role="status">{visible.length}{active.length ? ` of ${catalog.items.length}` : ""}<i> · {directorySorts.find(sort => sort.id === filters.sort)?.label.toLowerCase()}</i></b></h1>
              <span>Category · tags</span><span>Status</span><span>Popularity</span><span />
            </div>
            <ul className="sb-list">
              {visible.map(project => <ResourceRow key={project.projectId} project={project} isSaved={!!saved[project.projectId]} savingSave={busySave === project.projectId}
                isSelected={selected?.projectId === project.projectId} onSelect={() => setSelectedId(id => id === project.projectId ? null : project.projectId)} onToggleSave={() => void toggleSave(project)} />)}
              {visible.length === 0 && <li className="server-empty"><span className="directory-kicker">NO MATCH</span><h3>No matching creations</h3><p>Remove a filter or try a different search.</p>
                <button className="btn btn-primary btn-small" onClick={reset}>Show everything</button></li>}
              {catalog.nextCursor && <li className="hub-directory-more"><button className="btn btn-ghost btn-small" type="button" disabled={catalog.loading} onClick={() => void fetchPage(filters.sort, catalog.nextCursor)}>{catalog.loading ? "Loading…" : "Load more creations"}</button></li>}
            </ul>
          </>}
        </section>
      </section>
      <ResourceInspector project={selected} isSaved={selected ? !!saved[selected.projectId] : false} onToggleSave={() => selected && void toggleSave(selected)} onClose={() => setSelectedId(null)} />
    </div>
    <footer className="directory-footnote">
      <span>OPEN//77 WORKSHOP</span>
      <span className="directory-list-hint" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd> select · <kbd>Enter</kbd> open · <kbd>/</kbd> search</span>
      <span className="directory-footnote-stage">Free resources · reviewed before publication</span>
      <Link href="/account/creations/new">Share a creation ↗</Link>
    </footer>
    {toastNode}
  </div>;
}

function ResourceTile({ project, isSaved, savingSave, isSelected, onSelect, onToggleSave }: {
  project: CommunityProject; isSaved: boolean; savingSave: boolean; isSelected: boolean; onSelect: () => void; onToggleSave: () => void;
}) {
  const { content } = project;
  const [hovering, setHovering] = useState(false);
  const cover = useDerivative(content.media?.[0]?.mediaId ?? content.clipMediaId, content.media?.[0] ? "card" : "poster");
  const preview = useHoverPreview(content.media, content.clipMediaId, hovering);
  const shown = preview?.kind === "image" ? preview.src : cover;
  const href = `/workshop/${project.slug}`;
  const mark = categories.find(category => category.id === content.category)?.mark ?? "//";
  return <li className={`hub-tile${isSelected ? " is-selected" : ""}`} data-project-id={project.projectId} onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
    <Link className="hub-tile-art" href={href} aria-label={`Open ${content.title}`} style={shown || preview?.kind === "video" ? undefined : { backgroundImage: `url(${categoryArt(content.category)})` }}>
      {preview?.kind === "video" ? <video src={preview.src} poster={preview.poster ?? cover ?? undefined} muted autoPlay loop playsInline preload="none" aria-hidden="true" /> :
        shown ? <Image unoptimized src={shown} width={640} height={360} alt="" referrerPolicy="no-referrer" /> : <span className="hub-tile-mark" aria-hidden="true">{mark}</span>}
      {content.clipMediaId && !preview && <span className="hub-tile-play" aria-hidden="true">▶</span>}
      <span className="hub-tile-badges"><button type="button" className="sb-mode" onClick={event => { event.preventDefault(); event.stopPropagation(); updateFilters({ category: content.category }); }}>{categoryLabel(content.category)}</button>
        {content.kind === "showcase" ? <span className="tag hub-tile-kind">Showcase</span> : content.maturity === "stable" ? <span className="tag hub-tile-kind is-stable">Stable</span> : null}</span>
      {(content.media?.length ?? 0) > 1 && <span className="hub-tile-count" aria-hidden="true">{content.media?.length} shots</span>}
      <span className="hub-tile-caption"><span className="hub-tile-title">{content.title}</span><span className="hub-tile-author">{project.creatorHandle ? `@${project.creatorHandle}` : "Community creator"}</span></span>
    </Link>
    <div className="hub-tile-foot">
      <span className="hub-tile-stats"><span title="Upvotes">▲ {formatCount(project.upvotes)}</span>{content.kind === "resource" && <span title="Downloads">⤓ {formatCount(project.downloads)}</span>}<span title="Updated">{formatDate(project.updatedAtUtc)}</span></span>
      <span className="hub-tile-actions">
        <button className={`fav-btn${isSaved ? " is-fav" : ""}`} aria-pressed={isSaved} disabled={savingSave} aria-label={isSaved ? `Remove ${content.title} from saved` : `Save ${content.title}`} onClick={onToggleSave}><StarIcon size={14} filled={isSaved} /></button>
        <button className="sb-connect" type="button" aria-pressed={isSelected} onClick={onSelect}>{isSelected ? "Close" : "Quick view"}</button>
      </span>
    </div>
  </li>;
}

function ResourceRow({ project, isSaved, savingSave, isSelected, onSelect, onToggleSave }: {
  project: CommunityProject; isSaved: boolean; savingSave: boolean; isSelected: boolean; onSelect: () => void; onToggleSave: () => void;
}) {
  const { content } = project;
  const thumb = useDerivative(content.media?.[0]?.mediaId, "card");
  const mark = categories.find(category => category.id === content.category)?.mark ?? "//";
  return <li className={`sb-row${isSelected ? " is-selected" : ""}`} data-project-id={project.projectId} data-selected={isSelected || undefined}
    onClick={event => { if ((event.target as HTMLElement).closest("a, button")) return; onSelect(); }}>
    <div className="sb-row-main">
      <span className="sb-thumb hub-thumb" aria-hidden="true">{thumb ? <Image unoptimized src={thumb} width={26} height={26} alt="" referrerPolicy="no-referrer" /> : <span className="hub-thumb-mark">{mark}</span>}</span>
      <span className="sb-id">
        <Link className="sb-row-link" href={`/workshop/${project.slug}`} aria-label={`Open ${content.title}`}><span className="sb-name">{content.title}</span></Link>
        <span className="sb-desc" title={content.summary}>{project.creatorHandle ? `@${project.creatorHandle} · ` : ""}{content.summary || "Community creation"}</span>
      </span>
    </div>
    <div className="sb-row-tags">
      <button className="sb-mode" onClick={() => updateFilters({ category: content.category })} title={`Show ${categoryLabel(content.category)}`}>{categoryLabel(content.category)}</button>
      {content.tags.slice(0, 3).map(tag => <button className="tag" key={tag} onClick={() => updateFilters({ tag: tag.toLowerCase() })} title={`Filter by ${tag}`}>{tag}</button>)}
    </div>
    <span className={`hub-row-status${content.maturity === "stable" ? " is-stable" : ""}`}>{content.kind === "showcase" ? "Showcase" : content.maturity}</span>
    <span className="sb-players hub-row-stats"><span className="sb-players-num"><b>▲ {formatCount(project.upvotes)}</b>{content.kind === "resource" && <span className="sb-players-max"> · ⤓ {formatCount(project.downloads)}</span>}</span></span>
    <span className="sb-actions">
      <button className={`fav-btn${isSaved ? " is-fav" : ""}`} aria-pressed={isSaved} disabled={savingSave} aria-label={isSaved ? `Remove ${content.title} from saved` : `Save ${content.title}`} onClick={onToggleSave}><StarIcon size={15} filled={isSaved} /></button>
      <Link className="sb-connect" href={`/workshop/${project.slug}`} aria-label={`Open ${content.title}`}>{content.kind === "resource" ? "Get" : "View"}</Link>
    </span>
  </li>;
}

function ResourceInspector({ project, isSaved, onToggleSave, onClose }: { project: CommunityProject | null; isSaved: boolean; onToggleSave: () => void; onClose: () => void }) {
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
  if (!project) return <aside className="directory-detail is-idle" aria-label="Selected creation"><div className="directory-detail-empty">
    <span className="directory-detail-reticle" aria-hidden="true" /><strong>Select a creation</strong><small>Choose a resource to inspect it and download.</small></div></aside>;
  const { content } = project;
  const release = latest?.projectId === project.projectId ? latest : null;
  return <aside className="directory-detail" aria-label={`Selected creation: ${content.title}`}>
    <div className="directory-detail-cover" style={{ backgroundImage: `url(${cover ?? categoryArt(content.category)})` }}>
      <button className="directory-detail-close" onClick={onClose} aria-label="Close creation details">×</button>
      <span className="directory-detail-mode">{categoryLabel(content.category)}</span>
    </div>
    <div className="directory-detail-body">
      <div className="directory-detail-head"><div><span className="directory-kicker">{content.kind === "showcase" ? "// Showcase" : "// Resource"}</span><h2 className="directory-detail-name">{content.title}</h2></div></div>
      <div className="directory-detail-actions hub-detail-actions">
        {content.kind === "resource" && release?.release ? <DownloadButton releaseId={release.release.releaseId} version={release.release.version} /> :
          <Link className="btn btn-primary directory-detail-connect" href={`/workshop/${project.slug}${content.kind === "resource" ? "/versions" : ""}`}>{content.kind === "resource" ? (release ? "Browse versions" : "Checking releases…") : "View showcase"}</Link>}
        <button className={`fav-btn directory-detail-fav${isSaved ? " is-fav" : ""}`} aria-pressed={isSaved} aria-label={isSaved ? "Remove from saved" : "Save creation"} onClick={onToggleSave}><StarIcon size={16} filled={isSaved} /></button>
        <Link className="directory-detail-more" href={`/workshop/${project.slug}`}>Full page ↗</Link>
      </div>
      <p className="directory-detail-desc">{content.summary || "This creation has no summary yet."}</p>
      <dl className="directory-detail-facts">
        {content.kind === "resource" && <div><dt>Latest</dt><dd>{release?.release ? `v${release.release.version} · ${formatBytes(release.release.sizeBytes)}` : release?.failed ? "Unavailable" : release ? "No stable release" : "…"}</dd></div>}
        {content.kind === "resource" && release?.release && <div><dt>Tested on</dt><dd>{release.release.metadata.testedBuilds.length ? release.release.metadata.testedBuilds.slice(0, 2).join(", ") : "Not declared"}</dd></div>}
        <div><dt>Creator</dt><dd>{project.creatorHandle ? <Link href={`/workshop/creators/${project.creatorHandle}`}>@{project.creatorHandle}</Link> : "Community creator"}</dd></div>
        <div><dt>Status</dt><dd>{content.maturity === "stable" ? "Stable" : "Experimental"}</dd></div>
        <div><dt>Upvotes</dt><dd>{formatCount(project.upvotes)}</dd></div>
        {content.kind === "resource" && <div><dt>Downloads</dt><dd>{formatCount(project.downloads)}</dd></div>}
        <div><dt>Updated</dt><dd>{formatDate(project.updatedAtUtc)}</dd></div>
        <div><dt>Source</dt><dd>{content.sourceUrl ? "Link provided" : "Not linked"}</dd></div>
      </dl>
      {content.tags.length > 0 && <div className="directory-detail-tags">{content.tags.map(tag => <button className="tag" key={tag} onClick={() => updateFilters({ tag: tag.toLowerCase() })}>{tag}</button>)}</div>}
      <div className="directory-detail-links">
        <Link href={`/workshop/${project.slug}/discussion`}>Discussion</Link>
        {content.kind === "resource" && <Link href={`/workshop/${project.slug}/versions`}>All versions</Link>}
      </div>
    </div>
  </aside>;
}
