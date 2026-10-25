"use client";

import Image from "next/image";
import NextLink from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { useFavorites } from "@/components/favorites";
import { ServerLocale } from "@/components/servers/country-flag";
import { ServerImage } from "@/components/servers/server-image";
import { ServerInspector } from "@/components/servers/server-inspector";
import { BrandTile } from "@/components/servers/server-placeholder";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Chip, Tag } from "@/components/ui/chip";
import { cx } from "@/components/ui/cx";
import { EmptyState, Meter } from "@/components/ui/feedback";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cancel01, filterHorizontal, search01, star, userGroup } from "@/components/ui/icons";
import { Eyebrow } from "@/components/ui/typography";
import { languageDisplayName, regionCode, regionDisplayName } from "@/lib/locale";
import { usePlayerLocale, type PlayerLocale } from "@/lib/player-locale";
import {
  LANGUAGES,
  PRIMARY_MODES,
  REGIONS,
  joinServer,
  occupancyPercent,
  popClass,
  type GameServer,
} from "@/lib/servers";

import styles from "./server-browser.module.css";

const MODE_CHIPS = ["all", ...PRIMARY_MODES, "Custom"] as const;
const PRIMARY_MODE_SET: ReadonlySet<string> = new Set(PRIMARY_MODES);
const MIN_PLAYER_OPTIONS = [
  { value: 0, label: "Any" },
  { value: 25, label: "25+" },
  { value: 50, label: "50+" },
  { value: 100, label: "100+" },
];
const SORTS = [
  { value: "players", label: "Most players" },
  { value: "nearby", label: "Near you" },
  { value: "name", label: "Name A–Z" },
  { value: "recent", label: "Recently added" },
] as const;
type Sort = (typeof SORTS)[number]["value"];
/** Sentinel for "listings whose operator gave no region subtag at all". */
const NO_COUNTRY = "none";
const RAIL_KEY = "open77.directory.rail";
/** Where the three-column layout (with the inspector) starts; matches the CSS. */
const INSPECTOR_QUERY = "(min-width: 1360px)";

/**
 * How close a server is to the player, by locale: the directory carries no
 * latency, and for roleplay the language matters more than the milliseconds.
 * Same country outranks same language, which outranks the same region bucket.
 */
function proximity(server: GameServer, me: PlayerLocale): number {
  let score = 0;
  if (me.country && regionCode(server.country) === me.country) score += 4;
  if (me.lang && server.lang === me.lang) score += 2;
  if (me.region && server.region === me.region) score += 1;
  return score;
}
function sortServers(list: GameServer[], sort: Sort, me: PlayerLocale): GameServer[] {
  const out = [...list];
  if (sort === "nearby")
    out.sort(
      (a, b) => proximity(b, me) - proximity(a, me) || b.players - a.players || a.name.localeCompare(b.name),
    );
  if (sort === "players") out.sort((a, b) => b.players - a.players || a.name.localeCompare(b.name));
  if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "recent") out.sort((a, b) => a.addedDaysAgo - b.addedDaysAgo);
  return out;
}
/**
 * The values a `<select>` should offer: those actually present in the listing on
 * screen, plus the current selection when the directory has shifted under it, so
 * an active filter never disappears from its own control and leaves it blank.
 */
function presentOptions(all: readonly string[], present: ReadonlySet<string>, selected: string): string[] {
  const offered = all.filter((value) => present.has(value));
  if (selected !== "all" && !offered.includes(selected)) offered.push(selected);
  return offered;
}
/** Both the code and the readable name, so "France" finds an `fr-FR` listing. */
function localeHaystack(country: string | null | undefined): string {
  const region = regionCode(country);
  return region ? `${region} ${regionDisplayName(region)}` : "";
}
function haystack(server: GameServer): string {
  return [
    server.name,
    server.desc,
    ...server.tags,
    server.lang,
    server.region,
    server.mode,
    // Searching "France" should find fr-FR, not only "FR".
    localeHaystack(server.country),
    server.owner ?? "",
  ]
    .join(" ")
    .toLowerCase();
}
/** Filters live in the URL so links, reload and Back restore the same directory. */
const URL_EVENT = "open77-directory-url";
function subscribeToHistory(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(URL_EVENT, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(URL_EVENT, listener);
  };
}
function updateFilters(patch: Record<string, string | number | boolean>, reset = false) {
  const url = new URL(window.location.href);
  if (reset) {
    const preview = url.searchParams.get("preview");
    url.search = "";
    if (preview === "1") url.searchParams.set("preview", preview);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === "" || value === "all" || value === false || value === 0) url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  }
  // Typing does not create a history entry for each character. The URL still
  // travels with a server-detail visit, so Back restores the exact search.
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(URL_EVENT));
}
function useDirectoryFilters() {
  const search = useSyncExternalStore(subscribeToHistory, () => window.location.search, () => "");
  return useMemo(() => {
    const p = new URLSearchParams(search);
    const requestedMode = p.get("mode") ?? "all";
    const requestedSort = p.get("sort") ?? "players";
    return {
      query: p.get("q") ?? "",
      mode: MODE_CHIPS.includes(requestedMode as (typeof MODE_CHIPS)[number]) ? requestedMode : "all",
      sort: SORTS.some((s) => s.value === requestedSort) ? (requestedSort as Sort) : ("players" as Sort),
      favorites: p.get("favorites") === "true",
      region: p.get("region") ?? "all",
      lang: p.get("lang") ?? "all",
      country: p.get("country") ?? "all",
      tag: p.get("tag")?.toLowerCase() ?? "all",
      minPlayers: MIN_PLAYER_OPTIONS.some((o) => o.value === Number(p.get("minPlayers")))
        ? Number(p.get("minPlayers"))
        : 0,
      hideEmpty: p.get("hideEmpty") === "true",
      hideFull: p.get("hideFull") === "true",
    };
  }, [search]);
}

/** Whether the filter rail is shown on desktop. Memory backs storage when it is unavailable. */
let railMemory: boolean | null = null;
const railListeners = new Set<() => void>();
function subscribeRail(listener: () => void) {
  railListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    railListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
function readRail(): boolean {
  if (railMemory !== null) return railMemory;
  try {
    return localStorage.getItem(RAIL_KEY) !== "closed";
  } catch {
    return true;
  }
}
function writeRail(open: boolean) {
  railMemory = open;
  try {
    localStorage.setItem(RAIL_KEY, open ? "open" : "closed");
  } catch {
    /* optional browser storage */
  }
  for (const listener of railListeners) listener();
}

function subscribeInspector(listener: () => void) {
  const list = window.matchMedia(INSPECTOR_QUERY);
  list.addEventListener("change", listener);
  return () => list.removeEventListener("change", listener);
}

/** Whether a keyboard event started inside a text field or another control. */
function insideControl(target: EventTarget | null): boolean {
  return Boolean((target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable=true]"));
}

export function ServerBrowser({
  servers,
  status,
  emptyState,
  preview = false,
  isActive = true,
  onOpenServer,
}: {
  servers: GameServer[];
  status?: ReactNode;
  emptyState?: ReactNode;
  preview?: boolean;
  isActive?: boolean;
  onOpenServer?: (id: string) => void;
}) {
  const filters = useDirectoryFilters();
  const { query, mode, sort, favorites: favsOnly } = filters;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { isFavorite, toggle } = useFavorites();
  const me = usePlayerLocale();
  const { show: showToast, node: toastNode } = useToast();
  const filterPanelId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const lastFilters = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const commandRef = useRef<HTMLDivElement>(null);

  // The rail preference is per browser, like favorites: an external store, so
  // the prerendered page and the first client render agree (open).
  const railOpen = useSyncExternalStore(subscribeRail, readRail, () => true);
  const toggleRail = () => writeRail(!railOpen);
  // Without the inspector column, choosing a row opens the full profile instead.
  const hasInspector = useSyncExternalStore(subscribeInspector, () => window.matchMedia(INSPECTOR_QUERY).matches, () => true);

  // The list's own width decides between the table and the two-line cards.
  const [listWidth, setListWidth] = useState(0);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(([entry]) => setListWidth(entry?.contentRect.width ?? 0));
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  // The sticky command bar publishes its height for the sticky rail, table head,
  // inspector and row scroll margins.
  useEffect(() => {
    const command = commandRef.current;
    const root = rootRef.current;
    if (!command || !root) return;
    const publish = () => root.style.setProperty("--command-h", `${command.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(command);
    return () => observer.disconnect();
  }, []);

  // A new filter starts at the first match: bring the list top back into view
  // if the page had scrolled past it. Background refreshes never move it.
  useEffect(() => {
    if (servers.length === 0) return;
    const key = JSON.stringify(filters);
    if (lastFilters.current === null || lastFilters.current === key) {
      lastFilters.current = key;
      return;
    }
    lastFilters.current = key;
    const list = listRef.current;
    if (!list) return;
    const offset = parseFloat(getComputedStyle(list).scrollMarginTop) || 0;
    const top = list.getBoundingClientRect().top + window.scrollY - offset;
    if (window.scrollY > top) window.scrollTo({ top });
  }, [filters, servers.length]);

  const facets = useMemo(() => {
    const regions = new Set<string>();
    const langs = new Set<string>();
    const countries = new Set<string>();
    const tags = new Map<string, number>();
    let unlocated = false;
    for (const server of servers) {
      regions.add(server.region);
      langs.add(server.lang);
      const country = regionCode(server.country);
      if (country) countries.add(country);
      else unlocated = true;
      for (const tag of new Set(server.tags.map((t) => t.toLowerCase()))) tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }
    return {
      regions,
      langs,
      countries: [...countries]
        .map((code) => ({ code, name: regionDisplayName(code) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      unlocated,
      tags: [...tags].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10),
    };
  }, [servers]);

  const modeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const chip of MODE_CHIPS) counts.set(chip, 0);
    for (const server of servers) {
      counts.set("all", (counts.get("all") ?? 0) + 1);
      const key = PRIMARY_MODE_SET.has(server.mode) ? server.mode : "Custom";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [servers]);

  const visible = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return sortServers(
      servers.filter((server) => {
        if (favsOnly && !isFavorite(server.id)) return false;
        if (mode === "Custom" ? PRIMARY_MODE_SET.has(server.mode) : mode !== "all" && server.mode !== mode) return false;
        if (filters.region !== "all" && server.region !== filters.region) return false;
        if (filters.lang !== "all" && server.lang !== filters.lang) return false;
        if (
          filters.country !== "all" &&
          (filters.country === NO_COUNTRY
            ? regionCode(server.country) !== null
            : regionCode(server.country) !== filters.country)
        )
          return false;
        if (filters.tag !== "all" && !server.tags.some((tag) => tag.toLowerCase() === filters.tag)) return false;
        if (
          server.players < filters.minPlayers ||
          (filters.hideEmpty && server.players === 0) ||
          (filters.hideFull && server.players >= server.max)
        )
          return false;
        const text = haystack(server);
        return terms.every((term) => text.includes(term));
      }),
      sort,
      me,
    );
  }, [servers, filters, query, mode, sort, favsOnly, isFavorite, me]);

  // The selection follows the directory: a world that refreshed away or was
  // filtered out is no longer inspected, and the pane says so by going idle.
  const selected = useMemo(() => visible.find((server) => server.id === selectedId) ?? null, [visible, selectedId]);
  // With the inspector open the rows drop their Connect button, so the table
  // still fits a narrower list: the switch to cards waits until 560px instead
  // of 760px, and opening the inspector never reflows the rows.
  const cards = listWidth > 0 && listWidth <= (selected && hasInspector ? 560 : 760);

  const join = (server: GameServer) => {
    if (preview) {
      showToast("Demo server — connections are disabled in this preview.");
      return;
    }
    showToast("Opening the OPEN//77 launcher…");
    joinServer(server.id);
  };

  const choose = (server: GameServer) => {
    if (!hasInspector && onOpenServer && !preview) onOpenServer(server.id);
    else setSelectedId(server.id);
  };

  // Keyboard: `/` searches, ↑/↓ walk the list, Enter connects, Escape clears.
  const keyState = useRef({ visible, selected, join, filtersOpen });
  useEffect(() => {
    keyState.current = { visible, selected, join, filtersOpen };
  });
  useEffect(() => {
    if (!isActive) return;
    const handleKey = (event: KeyboardEvent) => {
      const { visible, selected, join, filtersOpen } = keyState.current;
      const inControl = insideControl(event.target);
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !inControl) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (event.key === "Escape") {
        if (filtersOpen) setFiltersOpen(false);
        else if (document.activeElement === searchRef.current) searchRef.current?.blur();
        else setSelectedId(null);
        return;
      }
      if (inControl && event.target !== searchRef.current) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (visible.length === 0) return;
        event.preventDefault();
        const index = selected ? visible.findIndex((s) => s.id === selected.id) : -1;
        const next = event.key === "ArrowDown" ? Math.min(visible.length - 1, index + 1) : Math.max(0, index - 1);
        const id = visible[next]?.id;
        if (!id) return;
        setSelectedId(id);
        listRef.current
          ?.querySelector<HTMLElement>(`[data-server-id="${CSS.escape(id)}"]`)
          ?.scrollIntoView({ block: "nearest" });
        return;
      }
      if (event.key === "Enter" && selected && !inControl) {
        event.preventDefault();
        join(selected);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isActive]);

  // The drawer covers the page on narrow screens; the page must not scroll under it.
  useEffect(() => {
    if (!filtersOpen) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [filtersOpen]);

  const countryOptions = [...facets.countries];
  if (filters.country !== "all" && filters.country !== NO_COUNTRY && !countryOptions.some((c) => c.code === filters.country))
    countryOptions.push({ code: filters.country, name: regionDisplayName(filters.country) });
  const active = [
    ...(query ? [{ key: "q", label: `Search: ${query}` }] : []),
    ...(mode !== "all" ? [{ key: "mode", label: mode }] : []),
    ...(favsOnly ? [{ key: "favorites", label: "Favorites" }] : []),
    ...(filters.region !== "all" ? [{ key: "region", label: `Region: ${filters.region}` }] : []),
    ...(filters.lang !== "all" ? [{ key: "lang", label: `Language: ${filters.lang}` }] : []),
    ...(filters.country !== "all"
      ? [
          {
            key: "country",
            label: filters.country === NO_COUNTRY ? "Country not specified" : regionDisplayName(filters.country),
          },
        ]
      : []),
    ...(filters.tag !== "all" ? [{ key: "tag", label: `Tag: ${filters.tag}` }] : []),
    ...(filters.minPlayers > 0 ? [{ key: "minPlayers", label: `${filters.minPlayers}+ players` }] : []),
    ...(filters.hideEmpty ? [{ key: "hideEmpty", label: "Hide empty" }] : []),
    ...(filters.hideFull ? [{ key: "hideFull", label: "Has room" }] : []),
  ];
  const reset = () => updateFilters({}, true);
  const railFilters = active.filter((item) => item.key !== "q" && item.key !== "mode").length;
  const visiblePlayers = visible.reduce((sum, s) => sum + s.players, 0);
  const favoriteCount = servers.filter((s) => isFavorite(s.id)).length;

  return (
    <div
      ref={rootRef}
      className={cx(
        styles.browser,
        filtersOpen && styles.filtersOpen,
        !railOpen && styles.railCollapsed,
        selected && styles.hasSelection,
      )}
      // A tool page: the site header slims down while the list is on screen, so
      // the list starts right under it (see --header-live in system.css).
      data-compact-header={isActive ? "" : undefined}
    >
      {/* The list is the page: the header marks "Servers" as current and the
          table head counts them, so the title is for assistive technology only.
          A profile shown in its place brings its own h1, so this one steps aside. */}
      {isActive ? <h1 className="sr-only">Server browser</h1> : null}
      <div className={styles.backdrop} aria-hidden="true">
        <Image src="/home/img/players-bg.webp" alt="" fill sizes="100vw" quality={75} loading="eager" />
      </div>

      <div ref={commandRef} className={styles.command} role="search">
        <div className={styles.commandInner}>
          <Button
            lines="none"
            size="sm"
            color="neutral"
            border
            icon={filterHorizontal}
            iconPosition="left"
            className={styles.drawerToggle}
            aria-expanded={filtersOpen}
            aria-controls={filterPanelId}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            {railFilters ? `Filters · ${railFilters}` : "Filters"}
          </Button>
          <button
            type="button"
            className={styles.railToggle}
            aria-pressed={railOpen}
            aria-controls={filterPanelId}
            title={railOpen ? "Hide filters" : "Show filters"}
            onClick={toggleRail}
          >
            <Icon glyph={filterHorizontal} />
            <span className="sr-only">{railOpen ? "Hide filters" : "Show filters"}</span>
            {railFilters ? <span className={styles.badge}>{railFilters}</span> : null}
          </button>
          <Input
            ref={searchRef}
            className={styles.search}
            type="search"
            icon={search01}
            aria-label="Search servers"
            placeholder="Search servers, tags, countries…"
            value={query}
            onChange={(e) => updateFilters({ q: e.target.value })}
            trailing={<kbd aria-hidden="true">/</kbd>}
          />
          <div className={styles.modes} role="group" aria-label="Filter by game type" data-mode-chips>
            {MODE_CHIPS.map((chip) => (
              <Chip
                key={chip}
                pressed={mode === chip}
                count={modeCounts.get(chip) ?? 0}
                onClick={() => updateFilters({ mode: chip })}
              >
                {chip === "all" ? "All" : chip}
              </Chip>
            ))}
          </div>
          <label className={styles.sort}>
            <span className={styles.selectLabel}>Sort</span>
            <Select compact aria-label="Sort servers" value={sort} onChange={(e) => updateFilters({ sort: e.target.value })}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </label>
          <div className={styles.status}>{status}</div>
        </div>
      </div>

      <div className={styles.workspace}>
        <aside className={styles.rail} aria-label="Directory filters" id={filterPanelId}>
          <div className={styles.railInner}>
            <div className={styles.railHead}>
              <Eyebrow>Directory</Eyebrow>
              <button type="button" className={styles.railClose} onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                <Icon glyph={cancel01} />
              </button>
            </div>
            <nav aria-label="Server collections" className={styles.collections}>
              <button
                type="button"
                className={styles.collection}
                aria-pressed={!favsOnly && active.length === 0}
                onClick={reset}
              >
                <Icon glyph={userGroup} />
                <span>All servers</span>
                <small>{servers.length}</small>
              </button>
              <button
                type="button"
                className={styles.collection}
                aria-pressed={favsOnly}
                onClick={() => updateFilters({ favorites: !favsOnly })}
              >
                <Icon glyph={star} />
                <span>Favorites</span>
                <small>{favoriteCount}</small>
              </button>
            </nav>

            {me.country || me.lang ? (
              <section className={styles.railSection} aria-label="Near you">
                <h2 className={styles.railTitle}>Near you</h2>
                <p className={styles.you}>
                  {me.country ? (
                    <ServerLocale country={me.country} lang={me.lang ?? "—"} />
                  ) : (
                    <span>{me.lang ? languageDisplayName(me.lang.toLowerCase()) : ""}</span>
                  )}
                </p>
                <div className={styles.chipRow}>
                  {me.country ? (
                    <Chip
                      size="sm"
                      pressed={filters.country === me.country}
                      onClick={() => updateFilters({ country: filters.country === me.country ? "all" : me.country! })}
                    >
                      My country
                    </Chip>
                  ) : null}
                  {me.lang ? (
                    <Chip
                      size="sm"
                      pressed={filters.lang === me.lang}
                      onClick={() => updateFilters({ lang: filters.lang === me.lang ? "all" : me.lang! })}
                    >
                      My language
                    </Chip>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className={cx(styles.railSection, styles.railModes)} aria-label="Filter by game type">
              <h2 className={styles.railTitle}>Game type</h2>
              {MODE_CHIPS.map((chip) => (
                <button
                  type="button"
                  className={styles.modeRow}
                  key={chip}
                  aria-pressed={mode === chip}
                  onClick={() => updateFilters({ mode: chip })}
                >
                  <span>{chip === "all" ? "All types" : chip}</span>
                  <small>{modeCounts.get(chip) ?? 0}</small>
                </button>
              ))}
            </section>

            <section className={styles.railSection} aria-label="Location and language">
              <h2 className={styles.railTitle}>Location</h2>
              <label className={styles.stackedSelect}>
                <span className={styles.selectLabel}>Language</span>
                <Select
                  compact
                  aria-label="Filter by language"
                  value={filters.lang}
                  onChange={(e) => updateFilters({ lang: e.target.value })}
                >
                  <option value="all">Any language</option>
                  {presentOptions(LANGUAGES, facets.langs, filters.lang).map((l) => (
                    <option key={l} value={l}>
                      {l} · {languageDisplayName(l.toLowerCase())}
                    </option>
                  ))}
                </Select>
              </label>
              <label className={styles.stackedSelect}>
                <span className={styles.selectLabel}>Region</span>
                <Select
                  compact
                  aria-label="Filter by region"
                  value={filters.region}
                  onChange={(e) => updateFilters({ region: e.target.value })}
                >
                  <option value="all">Any region</option>
                  {presentOptions(REGIONS, facets.regions, filters.region).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </label>
              <label className={styles.stackedSelect}>
                <span className={styles.selectLabel}>Country</span>
                <Select
                  compact
                  aria-label="Filter by country"
                  value={filters.country}
                  onChange={(e) => updateFilters({ country: e.target.value })}
                >
                  <option value="all">Any country</option>
                  {countryOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                  {facets.unlocated || filters.country === NO_COUNTRY ? (
                    <option value={NO_COUNTRY}>Not specified</option>
                  ) : null}
                </Select>
              </label>
            </section>

            <section className={styles.railSection} aria-label="Availability">
              <h2 className={styles.railTitle}>Availability</h2>
              <Checkbox checked={filters.hideEmpty} onChange={(e) => updateFilters({ hideEmpty: e.target.checked })}>
                Hide empty servers
              </Checkbox>
              <Checkbox checked={filters.hideFull} onChange={(e) => updateFilters({ hideFull: e.target.checked })}>
                Has room to join
              </Checkbox>
              <label className={styles.stackedSelect}>
                <span className={styles.selectLabel}>Min. players</span>
                <Select
                  compact
                  aria-label="Minimum players online"
                  value={filters.minPlayers}
                  onChange={(e) => updateFilters({ minPlayers: Number(e.target.value) })}
                >
                  {MIN_PLAYER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </label>
            </section>

            {facets.tags.length > 0 ? (
              <section className={styles.railSection} aria-label="Tags">
                <h2 className={styles.railTitle}>Tags</h2>
                <div className={styles.chipRow}>
                  {facets.tags.map(([tag, count]) => (
                    <Chip
                      key={tag}
                      size="sm"
                      pressed={filters.tag === tag}
                      count={count}
                      onClick={() => updateFilters({ tag: filters.tag === tag ? "all" : tag })}
                    >
                      {tag}
                    </Chip>
                  ))}
                </div>
              </section>
            ) : null}

            <div className={styles.railLinks}>
              <NextLink href="/create">Create a server</NextLink>
              <NextLink href="/download">Get the launcher</NextLink>
            </div>
          </div>
        </aside>
        <button
          type="button"
          className={styles.scrim}
          aria-label="Close filters"
          tabIndex={-1}
          onClick={() => setFiltersOpen(false)}
        />

        <section className={styles.main} aria-label="Server directory" ref={listRef}>
          {servers.length === 0 ? (
            (emptyState ?? (
              <EmptyState
                data-empty="directory"
                eyebrow="OPEN//77 directory"
                title="No servers online"
                action={
                  <Button lines="none" size="sm" border href="/create">
                    Create a server
                  </Button>
                }
              >
                The directory is empty right now. New servers will appear here automatically.
              </EmptyState>
            ))
          ) : (
            <>
              <p className="sr-only" role="status">
                {visible.length} {visible.length === 1 ? "server" : "servers"}
                {active.length ? ` of ${servers.length}` : ""}, {visiblePlayers}{" "}
                {visiblePlayers === 1 ? "player" : "players"} online
              </p>
              {active.length ? (
                <div className={styles.activeFilters}>
                  {active.map((item) => (
                    <button
                      type="button"
                      key={item.key}
                      className={styles.activeFilter}
                      onClick={() => updateFilters({ [item.key]: "" })}
                      aria-label={`Remove ${item.label} filter`}
                    >
                      {item.label}
                      <Icon glyph={cancel01} />
                    </button>
                  ))}
                  <button type="button" className={styles.clear} onClick={reset}>
                    Reset all
                  </button>
                </div>
              ) : null}
              <div className={cx(styles.table, cards && styles.cards)}>
                <div className={styles.columns} aria-hidden="true">
                  <span className={styles.colServer}>
                    {favsOnly ? "Favorites" : "Servers"} <b>{visible.length}</b>
                    {active.length ? <i> of {servers.length}</i> : null}
                  </span>
                  <span className={styles.colTags}>Game type · Tags</span>
                  <span className={styles.colLocale}>Locale</span>
                  <button
                    type="button"
                    tabIndex={-1}
                    className={styles.colPlayers}
                    onClick={() => updateFilters({ sort: sort === "players" ? "nearby" : "players" })}
                  >
                    Players {sort === "players" ? "↓" : ""}
                  </button>
                  <span />
                </div>
                <ul className={styles.list} data-server-list>
                  {visible.map((server) => (
                    <ServerRow
                      key={server.id}
                      server={server}
                      preview={preview}
                      onOpen={onOpenServer ? () => onOpenServer(server.id) : undefined}
                      near={proximity(server, me) >= 4}
                      isFavorite={isFavorite(server.id)}
                      isSelected={selected?.id === server.id}
                      onSelect={() => choose(server)}
                      onToggleFavorite={() => toggle(server.id)}
                      onConnect={() => join(server)}
                    />
                  ))}
                </ul>
              </div>
              {visible.length === 0 ? (
                <EmptyState
                  data-empty="no-match"
                  eyebrow="No match"
                  title="No matching servers"
                  action={
                    <Button lines="none" size="sm" border onClick={reset}>
                      Show all servers
                    </Button>
                  }
                >
                  Remove a filter or try a different search.
                </EmptyState>
              ) : null}
              <p className={styles.hints} aria-hidden="true">
                <kbd>↑</kbd> <kbd>↓</kbd> select · <kbd>Enter</kbd> connect · <kbd>/</kbd> search · Alpha access
                required to play and host · <NextLink href="/download">Need the launcher?</NextLink>
              </p>
            </>
          )}
        </section>

        {selected ? (
          <ServerInspector
            preview={preview}
            onOpen={onOpenServer ? () => onOpenServer(selected.id) : undefined}
            server={selected}
            nearYou={proximity(selected, me) >= 4}
            isFavorite={isFavorite(selected.id)}
            onToggleFavorite={() => toggle(selected.id)}
            onConnect={() => join(selected)}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </div>
      {toastNode}
    </div>
  );
}

function ServerRow({
  server,
  preview,
  onOpen,
  near,
  isFavorite,
  isSelected,
  onSelect,
  onToggleFavorite,
  onConnect,
}: {
  server: GameServer;
  preview: boolean;
  onOpen?: () => void;
  /** Same country as the player: the locale cell lights up. */
  near: boolean;
  isFavorite: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onConnect: () => void;
}) {
  const full = server.max > 0 && server.players >= server.max;
  const otherTags = server.tags.filter((t) => t.toLowerCase() !== server.mode.toLowerCase()).slice(0, 3);
  return (
    <li
      className={cx(styles.row, isSelected && styles.selected, full && styles.full)}
      data-server-id={server.id}
      data-mode={server.mode}
      data-selected={isSelected || undefined}
      onClick={(event) => {
        // Links and buttons inside the row keep their own behaviour.
        if ((event.target as HTMLElement).closest("a, button")) return;
        onSelect();
      }}
      onDoubleClick={(event) => {
        if (preview || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        // Row actions keep their own behavior; the server name also opens the profile.
        const control = (event.target as HTMLElement).closest("a, button");
        if (control && !control.matches(`.${styles.rowLink}`)) return;
        onOpen?.();
      }}
    >
      <ServerImage src={server.icon} kind="icon" className={styles.thumb} fallback={<BrandTile />} />
      <div className={styles.identity}>
        {preview ? (
          <button type="button" className={styles.rowLink} onClick={onSelect}>
            <span className={styles.name} data-server-name>{server.name}</span>
          </button>
        ) : (
          <NextLink
            className={styles.rowLink}
            data-server-link
            href={`/servers/${server.id}`}
            aria-label={`Select ${server.name}`}
            onNavigate={(event) => {
              event.preventDefault();
              onSelect();
            }}
          >
            <span className={styles.name} data-server-name>{server.name}</span>
          </NextLink>
        )}
        <span className={styles.desc} title={server.desc}>
          {server.desc || "Community server"}
        </span>
      </div>
      {/* Table cells on wide lists; one wrapped line under the name on narrow ones. */}
      <div className={styles.facts}>
        <span className={styles.tags}>
          <Tag onClick={() => updateFilters({ mode: server.mode })} title={`Find ${server.mode} servers`}>
            {server.mode}
          </Tag>
          {otherTags.map((tag) => (
            <Tag
              key={tag}
              tone="neutral"
              className={styles.extraTag}
              onClick={() => updateFilters({ tag: tag.toLowerCase() })}
              title={`Filter by ${tag}`}
            >
              {tag}
            </Tag>
          ))}
        </span>
        <ServerLocale className={cx(styles.locale, near && styles.near)} country={server.country} lang={server.lang} />
        <span className={cx(styles.players, styles[popClass(server)])}>
          <span className={styles.count}>
            <b>{server.players}</b>
            <span> / {server.max}</span>
          </span>
          <Meter value={occupancyPercent(server)} label={`${server.players} of ${server.max} players`} className={styles.meter} />
        </span>
      </div>
      <span className={styles.actions}>
        <button
          type="button"
          className={styles.fav}
          data-favorite
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `Remove ${server.name} from favorites` : `Add ${server.name} to favorites`}
          onClick={onToggleFavorite}
        >
          <Icon glyph={star} />
        </button>
        <Button
          lines="none"
          size="sm"
          color="neutral"
          border
          onClick={onConnect}
          aria-label={`Connect to ${server.name}`}
          className={styles.connect}
        >
          Connect
        </Button>
      </span>
    </li>
  );
}
