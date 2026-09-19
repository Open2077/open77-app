"use client";
import Link from "next/link";
import {
  useId,
  useEffect,
  useRef,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useFavorites } from "@/components/favorites";
import { FilterIcon, SearchIcon, StarIcon } from "@/components/icons";
import { ServerLocale } from "@/components/servers/country-flag";
import { ServerImage } from "@/components/servers/server-image";
import { ServerInspector } from "@/components/servers/server-inspector";
import { BrandTile } from "@/components/servers/server-placeholder";
import { useToast } from "@/components/toast";
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
const MODE_CHIPS = ["all", ...PRIMARY_MODES, "Custom"] as const;
const PRIMARY_MODE_SET: ReadonlySet<string> = new Set(PRIMARY_MODES);
const MIN_PLAYER_OPTIONS = [
  { value: 0, label: "Any" },
  { value: 25, label: "25+" },
  { value: 50, label: "50+" },
  { value: 100, label: "100+" },
];
const SORTS = [
  { value: "nearby", label: "Near you" },
  { value: "players", label: "Most players" },
  { value: "name", label: "Name A–Z" },
  { value: "recent", label: "Recently added" },
] as const;
type Sort = (typeof SORTS)[number]["value"];
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
  const out = [...list];
  if (sort === "nearby")
    out.sort(
      (a, b) =>
        proximity(b, me) - proximity(a, me) ||
        b.players - a.players ||
        a.name.localeCompare(b.name),
    );
  if (sort === "players")
    out.sort((a, b) => b.players - a.players || a.name.localeCompare(b.name));
  if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "recent") out.sort((a, b) => a.addedDaysAgo - b.addedDaysAgo);
  return out;
}
/**
 * The values a `<select>` should offer: those actually present in the listing on
 * screen, plus the current selection when the directory has shifted under it, so
 * an active filter never disappears from its own control and leaves it blank.
 */
function presentOptions(
  all: readonly string[],
  present: ReadonlySet<string>,
  selected: string,
): string[] {
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
function updateFilters(
  patch: Record<string, string | number | boolean>,
  reset = false,
) {
  const url = new URL(window.location.href);
  if (reset) {
    const preview = url.searchParams.get("preview");
    url.search = "";
    if (preview === "1") url.searchParams.set("preview", preview);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === "" || value === "all" || value === false || value === 0)
      url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  }
  // Typing does not create a history entry for each character. The URL still
  // travels with a server-detail visit, so Back restores the exact search.
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(URL_EVENT));
}
function useDirectoryFilters() {
  const search = useSyncExternalStore(
    subscribeToHistory,
    () => window.location.search,
    () => "",
  );
  return useMemo(() => {
    const p = new URLSearchParams(search);
    const requestedMode = p.get("mode") ?? "all";
    const requestedSort = p.get("sort") ?? "nearby";
    return {
      query: p.get("q") ?? "",
      mode: MODE_CHIPS.includes(requestedMode as (typeof MODE_CHIPS)[number])
        ? requestedMode
        : "all",
      sort: SORTS.some((s) => s.value === requestedSort)
        ? (requestedSort as Sort)
        : ("nearby" as Sort),
      favorites: p.get("favorites") === "true",
      region: p.get("region") ?? "all",
      lang: p.get("lang") ?? "all",
      country: p.get("country") ?? "all",
      tag: p.get("tag")?.toLowerCase() ?? "all",
      minPlayers: MIN_PLAYER_OPTIONS.some(
        (o) => o.value === Number(p.get("minPlayers")),
      )
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
  return Boolean(
    (target as HTMLElement | null)?.closest(
      "input, textarea, select, [contenteditable=true]",
    ),
  );
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

  // The rail preference is per browser, like favorites: an external store, so
  // the prerendered page and the first client render agree (open).
  const railOpen = useSyncExternalStore(subscribeRail, readRail, () => true);
  const toggleRail = () => writeRail(!railOpen);

  // Filtering starts at the first match; background refresh never resets scroll.
  useEffect(() => {
    if (servers.length === 0) return;
    const key = JSON.stringify(filters);
    if (lastFilters.current === key) return;
    let top = 0;
    if (lastFilters.current === null) {
      try {
        top =
          Number(sessionStorage.getItem(`open77.directory.scroll:${key}`)) || 0;
      } catch {
        /* optional browser storage */
      }
    }
    listRef.current?.scrollTo({ top });
    lastFilters.current = key;
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
      for (const tag of new Set(server.tags.map((t) => t.toLowerCase())))
        tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }
    return {
      regions,
      langs,
      countries: [...countries]
        .map((code) => ({ code, name: regionDisplayName(code) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      unlocated,
      tags: [...tags]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 10),
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
        if (
          mode === "Custom"
            ? PRIMARY_MODE_SET.has(server.mode)
            : mode !== "all" && server.mode !== mode
        )
          return false;
        if (filters.region !== "all" && server.region !== filters.region)
          return false;
        if (filters.lang !== "all" && server.lang !== filters.lang)
          return false;
        if (
          filters.country !== "all" &&
          (filters.country === NO_COUNTRY
            ? regionCode(server.country) !== null
            : regionCode(server.country) !== filters.country)
        )
          return false;
        if (
          filters.tag !== "all" &&
          !server.tags.some((tag) => tag.toLowerCase() === filters.tag)
        )
          return false;
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
  const selected = useMemo(
    () => visible.find((server) => server.id === selectedId) ?? null,
    [visible, selectedId],
  );

  const join = (server: GameServer) => {
    if (preview) {
      showToast("Demo server — connections are disabled in this preview.");
      return;
    }
    showToast("Opening the OPEN//77 launcher…");
    joinServer(server.id);
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
        else if (document.activeElement === searchRef.current) {
          searchRef.current?.blur();
        } else setSelectedId(null);
        return;
      }
      if (inControl && event.target !== searchRef.current) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (visible.length === 0) return;
        event.preventDefault();
        const index = selected
          ? visible.findIndex((s) => s.id === selected.id)
          : -1;
        const next =
          event.key === "ArrowDown"
            ? Math.min(visible.length - 1, index + 1)
            : Math.max(0, index - 1);
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

  const countryOptions = [...facets.countries];
  if (
    filters.country !== "all" &&
    filters.country !== NO_COUNTRY &&
    !countryOptions.some((c) => c.code === filters.country)
  )
    countryOptions.push({
      code: filters.country,
      name: regionDisplayName(filters.country),
    });
  const active = [
    ...(query ? [{ key: "q", label: `Search: ${query}` }] : []),
    ...(mode !== "all" ? [{ key: "mode", label: mode }] : []),
    ...(favsOnly ? [{ key: "favorites", label: "Favorites" }] : []),
    ...(filters.region !== "all"
      ? [{ key: "region", label: `Region: ${filters.region}` }]
      : []),
    ...(filters.lang !== "all"
      ? [{ key: "lang", label: `Language: ${filters.lang}` }]
      : []),
    ...(filters.country !== "all"
      ? [
          {
            key: "country",
            label:
              filters.country === NO_COUNTRY
                ? "Country not specified"
                : regionDisplayName(filters.country),
          },
        ]
      : []),
    ...(filters.tag !== "all"
      ? [{ key: "tag", label: `Tag: ${filters.tag}` }]
      : []),
    ...(filters.minPlayers > 0
      ? [{ key: "minPlayers", label: `${filters.minPlayers}+ players` }]
      : []),
    ...(filters.hideEmpty ? [{ key: "hideEmpty", label: "Hide empty" }] : []),
    ...(filters.hideFull ? [{ key: "hideFull", label: "Has room" }] : []),
  ];
  const reset = () => updateFilters({}, true);
  const railFilters = active.filter((item) => item.key !== "q" && item.key !== "mode").length;
  const onlinePlayers = visible.reduce((sum, s) => sum + s.players, 0);

  return (
    <div
      className={`directory-workspace directory-dense${filtersOpen ? " filters-open" : ""}${railOpen ? "" : " rail-collapsed"}${selected ? " has-selection" : ""}`}
    >
      <div className="directory-command" role="search">
        <button
          className="directory-tool directory-filter-toggle"
          aria-expanded={filtersOpen}
          aria-controls={filterPanelId}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <FilterIcon size={15} />
          <span>Filters</span>
          {railFilters ? <b>{railFilters}</b> : null}
        </button>
        <button
          className="directory-tool directory-rail-toggle"
          aria-pressed={railOpen}
          aria-controls={filterPanelId}
          title={railOpen ? "Hide filters" : "Show filters"}
          onClick={toggleRail}
        >
          <FilterIcon size={15} />
          <span>Filters</span>
          {railFilters ? <b>{railFilters}</b> : null}
        </button>
        <div className="sb-search">
          <SearchIcon size={16} />
          <input
            ref={searchRef}
            type="search"
            aria-label="Search servers"
            placeholder="Search servers, game types, tags, countries…"
            value={query}
            onChange={(e) => updateFilters({ q: e.target.value })}
          />
          <kbd aria-hidden="true">/</kbd>
        </div>
        <div
          className="directory-modes"
          role="group"
          aria-label="Filter by game type"
        >
          {MODE_CHIPS.map((chip) => (
            <button
              className={`filter-chip${mode === chip ? " is-active" : ""}`}
              key={chip}
              aria-pressed={mode === chip}
              onClick={() => updateFilters({ mode: chip })}
            >
              {chip === "all" ? "All" : chip}
              <small>{modeCounts.get(chip) ?? 0}</small>
            </button>
          ))}
        </div>
        <label className="select-wrap sb-lang">
          <span className="select-label">Language</span>
          <select
            aria-label="Filter by language"
            value={filters.lang}
            onChange={(e) => updateFilters({ lang: e.target.value })}
          >
            <option value="all">Any</option>
            {presentOptions(LANGUAGES, facets.langs, filters.lang).map((l) => (
              <option key={l} value={l}>
                {l} · {languageDisplayName(l.toLowerCase())}
              </option>
            ))}
          </select>
        </label>
        <label className="select-wrap sb-sort">
          <span className="select-label">Sort</span>
          <select
            aria-label="Sort servers"
            value={sort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {status}
      </div>
      <div className="directory-body">
        <aside
          className="directory-rail"
          aria-label="Directory filters"
          id={filterPanelId}
        >
          <div className="directory-rail-heading">
            <span className="directory-kicker">Directory</span>
            <button
              className="directory-filter-close"
              onClick={() => setFiltersOpen(false)}
              aria-label="Close filters"
            >
              ×
            </button>
          </div>
          <nav aria-label="Server collections" className="directory-collections">
            <button
              className={`directory-nav${!favsOnly && active.length === 0 ? " is-active" : ""}`}
              aria-pressed={!favsOnly && active.length === 0}
              onClick={reset}
            >
              <SearchIcon size={15} /> All servers <small>{servers.length}</small>
            </button>
            <button
              className={`directory-nav${favsOnly ? " is-active" : ""}`}
              aria-pressed={favsOnly}
              onClick={() => updateFilters({ favorites: !favsOnly })}
            >
              <StarIcon size={15} /> Favorites{" "}
              <small>{servers.filter((s) => isFavorite(s.id)).length}</small>
            </button>
          </nav>
          {me.country || me.lang ? (
            <div className="directory-filter-section directory-near" role="group" aria-label="Near you">
              <h2>Near you</h2>
              <p className="directory-you">
                {me.country ? (
                  <ServerLocale country={me.country} lang={me.lang ?? "—"} />
                ) : (
                  <span>{me.lang ? languageDisplayName(me.lang.toLowerCase()) : ""}</span>
                )}
              </p>
              <div className="directory-tag-filters">
                {me.country ? (
                  <button
                    aria-pressed={filters.country === me.country}
                    onClick={() =>
                      updateFilters({
                        country: filters.country === me.country ? "all" : me.country!,
                      })
                    }
                  >
                    My country <small>{regionDisplayName(me.country)}</small>
                  </button>
                ) : null}
                {me.lang ? (
                  <button
                    aria-pressed={filters.lang === me.lang}
                    onClick={() =>
                      updateFilters({ lang: filters.lang === me.lang ? "all" : me.lang! })
                    }
                  >
                    My language <small>{me.lang}</small>
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          <div
            className="directory-filter-section client-filters"
            role="group"
            aria-label="Filter by game type"
          >
            <h2>Game type</h2>
            {MODE_CHIPS.map((chip) => (
              <button
                className={`directory-mode-row${mode === chip ? " is-active" : ""}`}
                key={chip}
                aria-pressed={mode === chip}
                onClick={() => updateFilters({ mode: chip })}
              >
                <span>{chip === "all" ? "All types" : chip}</span>
                <small>{modeCounts.get(chip) ?? 0}</small>
              </button>
            ))}
          </div>
          <div className="directory-filter-section directory-location">
            <h2>Location</h2>
            <label className="select-wrap">
              <span className="select-label">Region</span>
              <select
                aria-label="Filter by region"
                value={filters.region}
                onChange={(e) => updateFilters({ region: e.target.value })}
              >
                <option value="all">Any region</option>
                {presentOptions(REGIONS, facets.regions, filters.region).map(
                  (r) => (
                    <option key={r}>{r}</option>
                  ),
                )}
              </select>
            </label>
            <label className="select-wrap">
              <span className="select-label">Country</span>
              <select
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
              </select>
            </label>
          </div>
          <div className="directory-filter-section">
            <h2>Availability</h2>
            <label className="directory-checkbox">
              <input
                type="checkbox"
                checked={filters.hideEmpty}
                onChange={(e) => updateFilters({ hideEmpty: e.target.checked })}
              />{" "}
              Hide empty servers
            </label>
            <label className="directory-checkbox">
              <input
                type="checkbox"
                checked={filters.hideFull}
                onChange={(e) => updateFilters({ hideFull: e.target.checked })}
              />{" "}
              Has room to join
            </label>
            <label className="select-wrap">
              <span className="select-label">Min. players</span>
              <select
                aria-label="Minimum players online"
                value={filters.minPlayers}
                onChange={(e) =>
                  updateFilters({ minPlayers: Number(e.target.value) })
                }
              >
                {MIN_PLAYER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {facets.tags.length > 0 ? (
            <div className="directory-filter-section">
              <h2>Tags</h2>
              <div className="directory-tag-filters">
                {facets.tags.map(([tag, count]) => (
                  <button
                    key={tag}
                    aria-pressed={filters.tag === tag}
                    onClick={() =>
                      updateFilters({ tag: filters.tag === tag ? "all" : tag })
                    }
                  >
                    {tag}
                    <small>{count}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="directory-rail-bottom">
            <Link href="/create">Create a server</Link>
            <Link href="/download">Get the launcher</Link>
          </div>
        </aside>
        <section className="directory-main" aria-label="Server directory">
          {active.length ? (
            <div className="directory-results-bar">
              <span className="directory-kicker">Filters</span>
              <div className="directory-active-filters">
                {active.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => updateFilters({ [item.key]: "" })}
                    aria-label={`Remove ${item.label} filter`}
                  >
                    {item.label}
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
                <button className="sb-clear" onClick={reset}>
                  Reset all
                </button>
              </div>
            </div>
          ) : null}
          <section
            className="sb-col-main"
            aria-label="All servers"
            ref={listRef}
            onScroll={(event) => {
              try {
                sessionStorage.setItem(
                  `open77.directory.scroll:${JSON.stringify(filters)}`,
                  String(event.currentTarget.scrollTop),
                );
              } catch {
                /* browsing works with storage disabled */
              }
            }}
          >
            {servers.length === 0 ? (
              (emptyState ?? (
                <div className="sb-offline" role="status">
                  <span className="directory-kicker">OPEN//77 DIRECTORY</span>
                  <h2>No servers online</h2>
                  <p>
                    The directory is empty right now. New servers will appear
                    here automatically.
                  </p>
                  <Link className="btn btn-ghost btn-small" href="/create">
                    Create a server
                  </Link>
                </div>
              ))
            ) : (
              <>
                <div className="sb-col-head">
                  <h2>
                    <span>{favsOnly ? "Favorites" : "Servers"}</span>
                    <b role="status">
                      {visible.length}
                      {active.length ? ` of ${servers.length}` : ""}
                      <i>
                        {" "}· {onlinePlayers} {onlinePlayers === 1 ? "player" : "players"} online
                      </i>
                    </b>
                  </h2>
                  <span>Game type · tags</span>
                  <span>Locale</span>
                  <button
                    onClick={() =>
                      updateFilters({
                        sort: sort === "players" ? "nearby" : "players",
                      })
                    }
                  >
                    Players {sort === "players" ? "↓" : ""}
                  </button>
                  <span />
                </div>
                <ul className="sb-list">
                  {visible.map((server) => (
                    <ServerRow
                      key={server.id}
                      server={server}
                      preview={preview}
                      onOpen={onOpenServer ? () => onOpenServer(server.id) : undefined}
                      near={proximity(server, me) >= 4}
                      isFavorite={isFavorite(server.id)}
                      isSelected={selected?.id === server.id}
                      onSelect={() => onOpenServer && !preview ? onOpenServer(server.id) :
                        setSelectedId((id) =>
                          id === server.id ? null : server.id,
                        )
                      }
                      onToggleFavorite={() => toggle(server.id)}
                      onConnect={() => join(server)}
                    />
                  ))}
                  {visible.length === 0 ? (
                    <li className="server-empty">
                      <span className="directory-kicker">NO MATCH</span>
                      <h3>No matching servers</h3>
                      <p>Remove a filter or try a different search.</p>
                      <button
                        className="btn btn-primary btn-small"
                        onClick={reset}
                      >
                        Show all servers
                      </button>
                    </li>
                  ) : null}
                </ul>
              </>
            )}
          </section>
        </section>
        <ServerInspector
          preview={preview}
          onOpen={selected && onOpenServer ? () => onOpenServer(selected.id) : undefined}
          server={selected}
          nearYou={selected ? proximity(selected, me) >= 4 : false}
          isFavorite={selected ? isFavorite(selected.id) : false}
          onToggleFavorite={() => selected && toggle(selected.id)}
          onConnect={() => selected && join(selected)}
          onClose={() => setSelectedId(null)}
        />
      </div>
      <footer className="directory-footnote">
        <span>OPEN//77 MULTIPLAYER NETWORK</span>
        <span className="directory-list-hint" aria-hidden="true">
          <kbd>↑</kbd>
          <kbd>↓</kbd> select · <kbd>Enter</kbd> connect · <kbd>/</kbd> search
        </span>
        <span className="directory-footnote-stage">
          Alpha · Alpha access required to play and host
        </span>
        <Link href="/download">Need the launcher? ↗</Link>
      </footer>
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
  return (
    <li
      className={`sb-row${isSelected ? " is-selected" : ""}${full ? " is-full" : ""}`}
      data-server-id={server.id}
      data-selected={isSelected || undefined}
      onClick={(event) => {
        // Links and buttons inside the row keep their own behaviour.
        if ((event.target as HTMLElement).closest("a, button")) return;
        onSelect();
      }}
    >
      <div className="sb-row-main">
        <ServerImage
          src={server.icon}
          kind="icon"
          className="sb-thumb"
          fallback={<BrandTile />}
        />
        <span className="sb-id">
          {preview ? <button className="sb-row-link" onClick={onSelect}>
            <span className="sb-name">{server.name}</span>
          </button> : <Link
            className="sb-row-link"
            href={`/servers/${server.id}`}
            aria-label={`View ${server.name}`}
            onNavigate={onOpen ? (event) => { event.preventDefault(); onOpen(); } : undefined}
          >
            <span className="sb-name">{server.name}</span>
          </Link>}
          <span className="sb-desc" title={server.desc}>
            {server.desc || "Community server"}
          </span>
        </span>
      </div>
      <div className="sb-row-tags">
        <button
          className="sb-mode"
          onClick={() => updateFilters({ mode: server.mode })}
          title={`Find ${server.mode} servers`}
        >
          {server.mode}
        </button>
        {server.tags
          .filter((t) => t.toLowerCase() !== server.mode.toLowerCase())
          .slice(0, 3)
          .map((tag) => (
            <button
              className="tag"
              key={tag}
              onClick={() => updateFilters({ tag: tag.toLowerCase() })}
              title={`Filter by ${tag}`}
            >
              {tag}
            </button>
          ))}
      </div>
      <ServerLocale
        className={`sb-loc${near ? " is-near" : ""}`}
        country={server.country}
        lang={server.lang}
      />
      <span className={`sb-players ${popClass(server)}`}>
        <span className="sb-players-num">
          <b>{server.players}</b>
          <span className="sb-players-max"> / {server.max}</span>
        </span>
        <span className="players-bar" aria-hidden="true">
          <span style={{ width: `${occupancyPercent(server)}%` }} />
        </span>
      </span>
      <span className="sb-actions">
        <button
          className={`fav-btn${isFavorite ? " is-fav" : ""}`}
          aria-pressed={isFavorite}
          aria-label={
            isFavorite
              ? `Remove ${server.name} from favorites`
              : `Add ${server.name} to favorites`
          }
          onClick={onToggleFavorite}
        >
          <StarIcon size={15} filled={isFavorite} />
        </button>
        <button
          className="sb-connect"
          onClick={onConnect}
          aria-label={`Connect to ${server.name}`}
        >
          Connect
        </button>
      </span>
    </li>
  );
}
