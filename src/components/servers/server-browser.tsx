"use client";

import Image from "next/image";
import NextLink from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { useFavorites } from "@/components/favorites";
import { ServerLocale } from "@/components/servers/country-flag";
import { useServerFormat } from "@/components/servers/server-format";
import { ServerImage } from "@/components/servers/server-image";
import { ServerInspector } from "@/components/servers/server-inspector";
import { ServerBadges } from "@/components/servers/server-badges";
import { ServerText } from "@/components/servers/server-text";
import { ServerPeak } from "@/components/servers/server-player-activity";
import { plainLauncherText } from "@/lib/launcher-text";
import { BrandTile } from "@/components/servers/server-placeholder";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { cx } from "@/components/ui/cx";
import { EmptyState } from "@/components/ui/feedback";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cancel01, filterHorizontal, search01, star, userGroup } from "@/components/ui/icons";
import { Eyebrow } from "@/components/ui/typography";
import { localizeHref } from "@/i18n/config";
import { fill, rich } from "@/i18n/format";
import { languageDisplayName, regionCode, regionDisplayName } from "@/lib/locale";
import { usePlayerLocale, type PlayerLocale } from "@/lib/player-locale";
import {
  LANGUAGES,
  PRIMARY_MODES,
  REGIONS,
  joinServer,
  popClass,
  type GameServer,
} from "@/lib/servers";

import styles from "./server-browser.module.css";

const MODE_CHIPS = ["all", ...PRIMARY_MODES, "Custom"] as const;
const PRIMARY_MODE_SET: ReadonlySet<string> = new Set(PRIMARY_MODES);
/** Minimum-player thresholds; 0 is "any". Labels live in `servers.browser`. */
const MIN_PLAYER_OPTIONS = [0, 25, 50, 100] as const;
/** Sort keys, in menu order; labels live in `servers.browser.sorts`. */
const SORTS = ["players", "nearby", "name", "recent"] as const;
type Sort = (typeof SORTS)[number];
/** Sentinel for "listings whose operator gave no region subtag at all". */
const NO_COUNTRY = "none";
const RAIL_KEY = "open77.directory.rail";

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
  return [...list].sort((a, b) => {
    const group = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    const name = plainLauncherText(a.name).localeCompare(plainLauncherText(b.name));
    const order = sort === "nearby" ? proximity(b, me) - proximity(a, me) || b.players - a.players
      : sort === "players" ? b.players - a.players : sort === "name" ? name : a.addedDaysAgo - b.addedDaysAgo;
    return group || order || (a.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (b.featuredOrder ?? Number.MAX_SAFE_INTEGER) || name || a.id.localeCompare(b.id);
  });
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
/**
 * The code and the readable name, so "France" finds an `fr-FR` listing. A
 * translated page also matches the name in its own language ("Allemagne").
 */
function localeHaystack(country: string | null | undefined, languageTag: string): string {
  const region = regionCode(country);
  if (!region) return "";
  const english = regionDisplayName(region);
  const local = languageTag === "en" ? english : regionDisplayName(region, languageTag);
  return local === english ? `${region} ${english}` : `${region} ${english} ${local}`;
}
function haystack(server: GameServer, languageTag: string): string {
  return [
    plainLauncherText(server.name),
    plainLauncherText(server.desc),
    ...server.tags,
    server.lang,
    server.region,
    server.mode,
    // Searching "France" should find fr-FR, not only "FR".
    localeHaystack(server.country, languageTag),
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
      sort: (SORTS as readonly string[]).includes(requestedSort) ? (requestedSort as Sort) : ("players" as Sort),
      favorites: p.get("favorites") === "true",
      region: p.get("region") ?? "all",
      lang: p.get("lang") ?? "all",
      country: p.get("country") ?? "all",
      tag: p.get("tag")?.toLowerCase() ?? "all",
      minPlayers: (MIN_PLAYER_OPTIONS as readonly number[]).includes(Number(p.get("minPlayers")))
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

/** Whether a keyboard event started inside a text field or another control. */
function insideControl(target: EventTarget | null): boolean {
  return Boolean((target as HTMLElement | null)?.closest("input, textarea, select, button, a, [role=button], [contenteditable=true]"));
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
  const f = useServerFormat();
  const m = f.m.browser;
  const languageTag = f.tag;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [allFeatured, setAllFeatured] = useState(false);
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
        .map((code) => ({ code, name: regionDisplayName(code, languageTag) }))
        .sort((a, b) => a.name.localeCompare(b.name, languageTag)),
      unlocated,
      tags: [...tags].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10),
    };
  }, [servers, languageTag]);

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
        const text = haystack(server, languageTag);
        return terms.every((term) => text.includes(term));
      }),
      sort,
      me,
    );
  }, [servers, filters, query, mode, sort, favsOnly, isFavorite, me, languageTag]);

  // The selection follows the directory: a world that refreshed away or was
  // filtered out is no longer inspected, and the pane says so by going idle.
  const selected = useMemo(() => visible.find((server) => server.id === selectedId) ?? null, [visible, selectedId]);
  const featured = visible.filter(server => server.featured);

  const join = (server: GameServer) => {
    if (preview) {
      showToast(m.demoConnect);
      return;
    }
    showToast(f.m.shared.opening);
    joinServer(server.id);
  };

  const choose = (server: GameServer) => {
    setSelectedId(server.id);
  };

  // Keyboard: `/` searches, ↑/↓ walk the list, Enter connects, Escape clears.
  const keyState = useRef({ visible, selected, join, filtersOpen });
  useEffect(() => {
    keyState.current = { visible, selected, join, filtersOpen };
  });
  useEffect(() => {
    if (!isActive) return;
    const handleKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest('[data-inspector]')) return;
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
    countryOptions.push({ code: filters.country, name: regionDisplayName(filters.country, languageTag) });
  // Chip labels: our words around the user's own query, codes and tags, which stay as typed.
  const chips = m.chips;
  const active = [
    ...(query ? [{ key: "q", label: fill(chips.search, { query }) }] : []),
    ...(mode !== "all" ? [{ key: "mode", label: mode }] : []),
    ...(favsOnly ? [{ key: "favorites", label: chips.favorites }] : []),
    ...(filters.region !== "all" ? [{ key: "region", label: fill(chips.region, { region: filters.region }) }] : []),
    ...(filters.lang !== "all" ? [{ key: "lang", label: fill(chips.language, { lang: filters.lang }) }] : []),
    ...(filters.country !== "all"
      ? [
          {
            key: "country",
            label: filters.country === NO_COUNTRY ? chips.countryNone : regionDisplayName(filters.country, languageTag),
          },
        ]
      : []),
    ...(filters.tag !== "all" ? [{ key: "tag", label: fill(chips.tag, { tag: filters.tag }) }] : []),
    ...(filters.minPlayers > 0 ? [{ key: "minPlayers", label: f.count(chips.minPlayers, filters.minPlayers) }] : []),
    ...(filters.hideEmpty ? [{ key: "hideEmpty", label: chips.hideEmpty }] : []),
    ...(filters.hideFull ? [{ key: "hideFull", label: chips.hideFull }] : []),
  ];
  const reset = () => updateFilters({}, true);
  const railFilters = active.filter((item) => item.key !== "q" && item.key !== "mode").length;
  const visiblePlayers = visible.reduce((sum, s) => sum + s.players, 0);
  const favoriteCount = servers.filter((s) => isFavorite(s.id)).length;
  const rail = m.rail;
  const columnHead = favsOnly ? (active.length ? m.columns.favoritesOf : m.columns.favorites) : active.length ? m.columns.serversOf : m.columns.servers;
  const summaryServers = active.length
    ? f.count(m.summary.serversOf, visible.length, { total: servers.length })
    : f.count(m.summary.servers, visible.length);

  return (
    <div
      ref={rootRef}
      className={cx(
        styles.browser,
        filtersOpen && styles.filtersOpen,
        !railOpen && styles.railCollapsed,
      )}
      // A tool page: the site header slims down while the list is on screen, so
      // the list starts right under it (see --header-live in system.css).
      data-compact-header={isActive ? "" : undefined}
    >
      {/* The list is the page: the header marks "Servers" as current and the
          table head counts them, so the title is for assistive technology only.
          A profile shown in its place brings its own h1, so this one steps aside. */}
      {isActive ? <h1 className="sr-only">{m.title}</h1> : null}
      <div className={styles.backdrop} aria-hidden="true">
        <Image src="/home/img/players-bg.webp" alt="" fill sizes="100vw" quality={75} loading="eager" />
      </div>

      <div ref={commandRef} className={styles.command} role="search" inert={Boolean(selected && isActive)}>
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
            {railFilters ? fill(m.filtersCount, { count: railFilters }) : m.filters}
          </Button>
          <button
            type="button"
            className={styles.railToggle}
            aria-pressed={railOpen}
            aria-controls={filterPanelId}
            title={railOpen ? m.hideFilters : m.showFilters}
            onClick={toggleRail}
          >
            <Icon glyph={filterHorizontal} />
            <span className="sr-only">{railOpen ? m.hideFilters : m.showFilters}</span>
            {railFilters ? <span className={styles.badge}>{railFilters}</span> : null}
          </button>
          <Input
            ref={searchRef}
            className={styles.search}
            type="search"
            icon={search01}
            aria-label={m.searchLabel}
            placeholder={m.searchPlaceholder}
            value={query}
            onChange={(e) => updateFilters({ q: e.target.value })}
            trailing={<kbd aria-hidden="true">/</kbd>}
          />
          <div className={styles.modes} role="group" aria-label={m.gameTypeFilter} data-mode-chips>
            {MODE_CHIPS.map((chip) => (
              <Chip
                key={chip}
                pressed={mode === chip}
                count={modeCounts.get(chip) ?? 0}
                onClick={() => updateFilters({ mode: chip })}
              >
                {chip === "all" ? m.allModes : chip}
              </Chip>
            ))}
          </div>
          <label className={styles.sort}>
            <span className={styles.selectLabel}>{m.sort}</span>
            <Select compact aria-label={m.sortLabel} value={sort} onChange={(e) => updateFilters({ sort: e.target.value })}>
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {m.sorts[s]}
                </option>
              ))}
            </Select>
          </label>
          <div className={styles.status}>{status}</div>
        </div>
      </div>

      <div className={styles.workspace}>
        <aside className={styles.rail} aria-label={rail.label} id={filterPanelId} inert={Boolean(selected && isActive)}>
          <div className={styles.railInner}>
            <div className={styles.railHead}>
              <Eyebrow>{rail.eyebrow}</Eyebrow>
              <button type="button" className={styles.railClose} onClick={() => setFiltersOpen(false)} aria-label={rail.close}>
                <Icon glyph={cancel01} />
              </button>
            </div>
            <nav aria-label={rail.collections} className={styles.collections}>
              <button
                type="button"
                className={styles.collection}
                aria-pressed={!favsOnly && active.length === 0}
                onClick={reset}
              >
                <Icon glyph={userGroup} />
                <span>{rail.allServers}</span>
                <small>{servers.length}</small>
              </button>
              <button
                type="button"
                className={styles.collection}
                aria-pressed={favsOnly}
                onClick={() => updateFilters({ favorites: !favsOnly })}
              >
                <Icon glyph={star} />
                <span>{rail.favorites}</span>
                <small>{favoriteCount}</small>
              </button>
            </nav>

            {me.country || me.lang ? (
              <section className={styles.railSection} aria-label={rail.nearYou}>
                <h2 className={styles.railTitle}>{rail.nearYou}</h2>
                <p className={styles.you}>
                  {me.country ? (
                    <ServerLocale country={me.country} lang={me.lang ?? "—"} />
                  ) : (
                    <span>{me.lang ? languageDisplayName(me.lang.toLowerCase(), languageTag) : ""}</span>
                  )}
                </p>
                <div className={styles.chipRow}>
                  {me.country ? (
                    <Chip
                      size="sm"
                      pressed={filters.country === me.country}
                      onClick={() => updateFilters({ country: filters.country === me.country ? "all" : me.country! })}
                    >
                      {rail.myCountry}
                    </Chip>
                  ) : null}
                  {me.lang ? (
                    <Chip
                      size="sm"
                      pressed={filters.lang === me.lang}
                      onClick={() => updateFilters({ lang: filters.lang === me.lang ? "all" : me.lang! })}
                    >
                      {rail.myLanguage}
                    </Chip>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className={cx(styles.railSection, styles.railModes)} aria-label={m.gameTypeFilter}>
              <h2 className={styles.railTitle}>{rail.gameType}</h2>
              {MODE_CHIPS.map((chip) => (
                <button
                  type="button"
                  className={styles.modeRow}
                  key={chip}
                  aria-pressed={mode === chip}
                  onClick={() => updateFilters({ mode: chip })}
                >
                  <span>{chip === "all" ? rail.allTypes : chip}</span>
                  <small>{modeCounts.get(chip) ?? 0}</small>
                </button>
              ))}
            </section>

            <section className={styles.railSection} aria-label={rail.locationLabel}>
              <h2 className={styles.railTitle}>{rail.location}</h2>
              <label className={styles.stackedSelect}>
                <span className={styles.selectLabel}>{rail.language}</span>
                <Select
                  compact
                  aria-label={rail.languageFilter}
                  value={filters.lang}
                  onChange={(e) => updateFilters({ lang: e.target.value })}
                >
                  <option value="all">{rail.anyLanguage}</option>
                  {presentOptions(LANGUAGES, facets.langs, filters.lang).map((l) => (
                    <option key={l} value={l}>
                      {l} · {languageDisplayName(l.toLowerCase(), languageTag)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className={styles.stackedSelect}>
                <span className={styles.selectLabel}>{rail.region}</span>
                <Select
                  compact
                  aria-label={rail.regionFilter}
                  value={filters.region}
                  onChange={(e) => updateFilters({ region: e.target.value })}
                >
                  <option value="all">{rail.anyRegion}</option>
                  {presentOptions(REGIONS, facets.regions, filters.region).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </label>
              <label className={styles.stackedSelect}>
                <span className={styles.selectLabel}>{rail.country}</span>
                <Select
                  compact
                  aria-label={rail.countryFilter}
                  value={filters.country}
                  onChange={(e) => updateFilters({ country: e.target.value })}
                >
                  <option value="all">{rail.anyCountry}</option>
                  {countryOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                  {facets.unlocated || filters.country === NO_COUNTRY ? (
                    <option value={NO_COUNTRY}>{rail.countryNone}</option>
                  ) : null}
                </Select>
              </label>
            </section>

            <section className={styles.railSection} aria-label={rail.availability}>
              <h2 className={styles.railTitle}>{rail.availability}</h2>
              <Checkbox checked={filters.hideEmpty} onChange={(e) => updateFilters({ hideEmpty: e.target.checked })}>
                {rail.hideEmpty}
              </Checkbox>
              <Checkbox checked={filters.hideFull} onChange={(e) => updateFilters({ hideFull: e.target.checked })}>
                {rail.hasRoom}
              </Checkbox>
              <label className={styles.stackedSelect}>
                <span className={styles.selectLabel}>{rail.minPlayers}</span>
                <Select
                  compact
                  aria-label={rail.minPlayersFilter}
                  value={filters.minPlayers}
                  onChange={(e) => updateFilters({ minPlayers: Number(e.target.value) })}
                >
                  {MIN_PLAYER_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value === 0 ? m.anyPlayers : fill(m.minPlayersOption, { count: value })}
                    </option>
                  ))}
                </Select>
              </label>
            </section>

            {facets.tags.length > 0 ? (
              <section className={styles.railSection} aria-label={rail.tags}>
                <h2 className={styles.railTitle}>{rail.tags}</h2>
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
              <NextLink href={localizeHref("/create", f.locale)}>{rail.createServer}</NextLink>
              <NextLink href={localizeHref("/download", f.locale)}>{rail.getLauncher}</NextLink>
            </div>
          </div>
        </aside>
        <button
          type="button"
          className={styles.scrim}
          aria-label={rail.close}
          tabIndex={-1}
          onClick={() => setFiltersOpen(false)}
        />

        <section className={styles.main} aria-label={m.directoryLabel} ref={listRef} inert={Boolean(selected && isActive)}>
          {servers.length === 0 ? (
            (emptyState ?? (
              <EmptyState
                data-empty="directory"
                eyebrow={m.empty.eyebrow}
                title={m.empty.title}
                action={
                  <Button lines="none" size="sm" border href="/create">
                    {m.empty.action}
                  </Button>
                }
              >
                {m.empty.body}
              </EmptyState>
            ))
          ) : (
            <>
              <p className="sr-only" role="status">
                {fill(m.summary.line, { servers: summaryServers, players: f.count(m.summary.players, visiblePlayers) })}
              </p>
              {active.length ? (
                <div className={styles.activeFilters}>
                  {active.map((item) => (
                    <button
                      type="button"
                      key={item.key}
                      className={styles.activeFilter}
                      onClick={() => updateFilters({ [item.key]: "" })}
                      aria-label={fill(m.removeFilter, { label: item.label })}
                    >
                      {item.label}
                      <Icon glyph={cancel01} />
                    </button>
                  ))}
                  <button type="button" className={styles.clear} onClick={reset}>
                    {m.resetAll}
                  </button>
                </div>
              ) : null}
              {featured.length ? <section className={styles.featuredSection} aria-label={m.featured.label}>
                <header><h2>{m.featured.label} <span>{featured.length}</span></h2>{featured.length > 3 ? <button type="button" aria-expanded={allFeatured} onClick={() => setAllFeatured(value => !value)}>{allFeatured ? m.featured.showLess : fill(m.featured.viewAll, { count: featured.length })}</button> : null}</header>
                <div className={styles.featuredCards}>{(allFeatured ? featured : featured.slice(0, 3)).map(server => <button type="button" key={server.id} className={styles.featuredCard} onClick={() => choose(server)} aria-label={fill(m.featured.view, { name: plainLauncherText(server.name) })} data-featured-card={server.id}>
                  <ServerImage src={server.banner} kind="banner" className={styles.featuredArt} />
                  <ServerImage src={server.icon} kind="icon" className={styles.featuredIcon} fallback={<BrandTile />} />
                  <span className={styles.featuredIdentity}><strong><ServerText text={server.name} /></strong><span>{server.mode} · <b>{server.players}</b> / {server.max}</span><ServerBadges server={server} /></span><span className={styles.featuredArrow} aria-hidden="true">→</span>
                </button>)}</div>
              </section> : null}
              <div className={styles.table}>
                <div className={styles.columns} aria-hidden="true">
                  <span className={styles.colServer}>
                    {rich(columnHead, COLUMN_TAGS, { count: visible.length, total: servers.length })}
                  </span>
                  <button
                    type="button"
                    tabIndex={-1}
                    className={styles.colPlayers}
                    onClick={() => updateFilters({ sort: sort === "players" ? "nearby" : "players" })}
                  >
                    {m.columns.players} {sort === "players" ? "↓" : ""}
                  </button>
                  <span className={styles.colLocale}>{m.columns.region}</span>
                  <span />
                </div>
                <ul className={styles.list} data-server-list>
                  {visible.map((server) => (
                    <ServerRow
                      key={server.id}
                      server={server}
                      preview={preview}
                      href={localizeHref(`/servers/${server.id}`, f.locale)}
                      labels={m.row}
                      onOpen={onOpenServer ? () => onOpenServer(server.id) : undefined}
                      near={proximity(server, me) >= 4}
                      isFavorite={isFavorite(server.id)}
                      isSelected={selected?.id === server.id}
                      onSelect={() => choose(server)}
                      onToggleFavorite={() => toggle(server.id)}
                    />
                  ))}
                </ul>
              </div>
              {visible.length === 0 ? (
                <EmptyState
                  data-empty="no-match"
                  eyebrow={m.noMatch.eyebrow}
                  title={m.noMatch.title}
                  action={
                    <Button lines="none" size="sm" border onClick={reset}>
                      {m.noMatch.action}
                    </Button>
                  }
                >
                  {m.noMatch.body}
                </EmptyState>
              ) : null}
              <p className={styles.hints} aria-hidden="true">
                {featured.length ? <>{m.featuredFirst} · </> : null}
                {rich(m.hints, {
                  kbd: (chunk) => <kbd>{chunk}</kbd>,
                  launcher: (chunk) => <NextLink href={localizeHref("/download", f.locale)}>{chunk}</NextLink>,
                })}
              </p>
            </>
          )}
        </section>

        {selected && isActive ? (
          <ServerInspector
            key={selected.id}
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

/** The directory table's server-count heading: `<b>` is the count, `<i>` the "of N" tail. */
const COLUMN_TAGS = {
  b: (chunk: ReactNode) => <b>{chunk}</b>,
  i: (chunk: ReactNode) => <i>{chunk}</i>,
};

function ServerRow({
  server,
  preview,
  href,
  labels,
  onOpen,
  near,
  isFavorite,
  isSelected,
  onSelect,
  onToggleFavorite,
}: {
  server: GameServer;
  preview: boolean;
  /** The profile URL in the page language. */
  href: string;
  labels: { select: string; addFavorite: string; removeFavorite: string };
  onOpen?: () => void;
  /** Same country as the player: the locale cell lights up. */
  near: boolean;
  isFavorite: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  const description = plainLauncherText(server.desc, { preserveCase: true }).replace(/\s+/g, " ").trim();
  const name = plainLauncherText(server.name);
  return (
    <li
      className={cx(styles.row, isSelected && styles.selected)}
      data-server-id={server.id}
      data-mode={server.mode}
      data-selected={isSelected || undefined}
      title={server.mode}
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
      {server.featured && server.banner ? <ServerImage src={server.banner} kind="banner" className={styles.rowBanner} /> : null}
      <ServerImage src={server.icon} kind="icon" className={styles.thumb} fallback={<BrandTile />} />
      <div className={styles.identity}>
        <span className={styles.titleLine}>
          {preview ? (
            <button type="button" className={styles.rowLink} onClick={onSelect} title={plainLauncherText(server.name)}>
              <span className={styles.name} data-server-name><ServerText text={server.name} /></span>
            </button>
          ) : (
            <NextLink
              className={styles.rowLink}
              data-server-link
              href={href}
              aria-label={fill(labels.select, { name })}
              title={plainLauncherText(server.name)}
              onNavigate={(event) => {
                event.preventDefault();
                onSelect();
              }}
            >
              <span className={styles.name} data-server-name><ServerText text={server.name} /></span>
            </NextLink>
          )}
          {server.featured || server.official || server.withMods ? <span className={styles.rowBadges}><ServerBadges server={server} /></span> : null}
        </span>
        {description ? <span className={styles.desc} data-server-description title={description}>{description}</span> : null}
      </div>
      <span className={cx(styles.players, styles[popClass(server)])}>
        <span className={styles.count}>
          <b>{server.players}</b>
          <span> / {server.max}</span>
        </span>
        {server.featured ? <ServerPeak id={server.id} preview={preview} /> : null}
      </span>
      <ServerLocale compact className={cx(styles.locale, near && styles.near)} country={server.country} lang={server.lang} />
      <span className={styles.actions}>
        <button
          type="button"
          className={styles.fav}
          data-favorite
          aria-pressed={isFavorite}
          aria-label={fill(isFavorite ? labels.removeFavorite : labels.addFavorite, { name })}
          onClick={onToggleFavorite}
        >
          <Icon glyph={star} />
        </button>
      </span>
    </li>
  );
}
