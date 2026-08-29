"use client";

import Link from "next/link";
import { useId, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import { useFavorites } from "@/components/favorites";
import { DiscordIcon, FilterIcon, PlugIcon, SearchIcon, StarIcon } from "@/components/icons";
import { ServerImage } from "@/components/servers/server-image";
import { useToast } from "@/components/toast";
import { site } from "@/lib/site";
import {
  LANGUAGES,
  PRIMARY_MODES,
  REGIONS,
  formatPing,
  joinServer,
  occupancyPercent,
  pingClass,
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

const MAX_PING_OPTIONS = [
  { value: 999, label: "Any" },
  { value: 30, label: "< 30 ms" },
  { value: 60, label: "< 60 ms" },
  { value: 100, label: "< 100 ms" },
];

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "players", label: "Players" },
  { value: "ping", label: "Ping" },
  { value: "recent", label: "Recently added" },
] as const;

type Sort = (typeof SORTS)[number]["value"];

const DEFAULT_FILTERS = {
  region: "all",
  lang: "all",
  minPlayers: 0,
  maxPing: 999,
};

function byRecommended(a: GameServer, b: GameServer): number {
  if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
  return b.players / b.max - a.players / a.max || b.players - a.players;
}

function sortServers(list: GameServer[], sort: Sort): GameServer[] {
  const out = [...list];
  if (sort === "recommended") out.sort(byRecommended);
  if (sort === "players") out.sort((a, b) => b.players - a.players);
  if (sort === "ping") out.sort((a, b) => a.ping - b.ping);
  if (sort === "recent") out.sort((a, b) => a.addedDaysAgo - b.addedDaysAgo);
  return out;
}

function haystack(server: GameServer): string {
  return [
    server.name,
    server.desc,
    ...server.tags,
    server.lang,
    server.region,
    server.mode,
    server.owner ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * The `?mode=` deep link, or `"all"`.
 *
 * `useSearchParams` is deliberately not used: reading search params during
 * render forces the surrounding page out of static prerendering, and an empty
 * listing in the HTML is a far worse trade than reading the query string
 * through the store API instead.
 *
 * The URL is an external store, so it is read through `useSyncExternalStore`
 * with an empty server snapshot. That is what lets the prerendered HTML show
 * the unfiltered list and the browser apply the deep link immediately after
 * hydration, without either a mismatch or an effect that re-renders.
 */
function useLinkedMode(): string {
  const search = useSyncExternalStore(
    subscribeToHistory,
    () => window.location.search,
    () => "",
  );

  return useMemo(() => {
    const requested = new URLSearchParams(search).get("mode");
    const known = (MODE_CHIPS as readonly string[]).includes(requested ?? "");
    return requested && known ? requested : "all";
  }, [search]);
}

/** Nothing here writes to the URL, so only the user's own history moves it. */
function subscribeToHistory(listener: () => void) {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}

/**
 * The server directory, filtered in the browser.
 *
 * The full list is rendered on the server so the static HTML carries every
 * listing — the legacy page built its rows from JavaScript, which meant crawlers
 * and answer engines saw an empty `<ul>`. Filtering then happens client-side
 * with no navigation, which is what the interaction wants.
 */
export function ServerBrowser({
  servers,
  featured,
}: {
  servers: GameServer[];
  featured: ReactNode;
}) {
  const [query, setQuery] = useState("");
  // The deep link supplies the mode until the visitor picks one themselves.
  const linkedMode = useLinkedMode();
  const [chosenMode, setChosenMode] = useState<string | null>(null);
  const mode = chosenMode ?? linkedMode;
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState<Sort>("recommended");
  const [favsOnly, setFavsOnly] = useState(false);
  const [openPanel, setOpenPanel] = useState<"filters" | "direct" | null>(null);

  const { isFavorite, toggle } = useFavorites();
  const { show: showToast, node: toastNode } = useToast();

  const filterPanelId = useId();
  const directPanelId = useId();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = servers.filter((server) => {
      if (favsOnly && !isFavorite(server.id)) return false;
      if (mode === "Custom") {
        if (PRIMARY_MODE_SET.has(server.mode)) return false;
      } else if (mode !== "all") {
        if (server.mode !== mode && !server.tags.includes(mode)) return false;
      }
      if (filters.region !== "all" && server.region !== filters.region) return false;
      if (filters.lang !== "all" && server.lang !== filters.lang) return false;
      if (server.players < filters.minPlayers) return false;
      if (server.ping > filters.maxPing) return false;
      if (needle && !haystack(server).includes(needle)) return false;
      return true;
    });
    return sortServers(matched, sort);
  }, [servers, query, mode, filters, sort, favsOnly, isFavorite]);

  const activeFilterCount =
    (filters.region !== "all" ? 1 : 0) +
    (filters.lang !== "all" ? 1 : 0) +
    (filters.minPlayers > 0 ? 1 : 0) +
    (filters.maxPing < 999 ? 1 : 0);

  return (
    <>
      <div className="sb-toolbar">
        <div className="sb-search">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search servers, communities, tags…"
            aria-label="Search servers"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button
          className={`sb-tool${openPanel === "filters" ? " is-open" : ""}`}
          type="button"
          aria-expanded={openPanel === "filters"}
          aria-controls={filterPanelId}
          onClick={() => setOpenPanel((open) => (open === "filters" ? null : "filters"))}
        >
          <FilterIcon />
          Filters
          <span className="sb-tool-badge" hidden={activeFilterCount === 0}>
            {activeFilterCount}
          </span>
        </button>
        <button
          className={`sb-tool${openPanel === "direct" ? " is-open" : ""}`}
          type="button"
          aria-expanded={openPanel === "direct"}
          aria-controls={directPanelId}
          onClick={() => setOpenPanel((open) => (open === "direct" ? null : "direct"))}
        >
          <PlugIcon />
          Direct connect
        </button>
      </div>

      <div className="sb-panel" id={filterPanelId} hidden={openPanel !== "filters"}>
        <label className="select-wrap">
          <span className="select-label">Region</span>
          <select
            aria-label="Filter by region"
            value={filters.region}
            onChange={(event) =>
              setFilters((current) => ({ ...current, region: event.target.value }))
            }
          >
            <option value="all">All</option>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
        <label className="select-wrap">
          <span className="select-label">Language</span>
          <select
            aria-label="Filter by language"
            value={filters.lang}
            onChange={(event) => setFilters((current) => ({ ...current, lang: event.target.value }))}
          >
            <option value="all">All</option>
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </label>
        <label className="select-wrap">
          <span className="select-label">Min players</span>
          <select
            aria-label="Minimum players online"
            value={String(filters.minPlayers)}
            onChange={(event) =>
              setFilters((current) => ({ ...current, minPlayers: Number(event.target.value) }))
            }
          >
            {MIN_PLAYER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="select-wrap">
          <span className="select-label">Max ping</span>
          <select
            aria-label="Maximum ping"
            value={String(filters.maxPing)}
            onChange={(event) =>
              setFilters((current) => ({ ...current, maxPing: Number(event.target.value) }))
            }
          >
            {MAX_PING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button className="sb-clear" type="button" onClick={() => setFilters(DEFAULT_FILTERS)}>
          Clear filters
        </button>
      </div>

      <div
        className="sb-panel sb-panel-direct"
        id={directPanelId}
        hidden={openPanel !== "direct"}
      >
        <div className="sb-direct-field">
          <span className="select-label">Server address</span>
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="connect open77://address-or-code"
            aria-label="Server address or code"
          />
        </div>
        <button
          className="btn btn-primary btn-small"
          type="button"
          onClick={() => showToast("Direct connect goes live when the alpha opens.")}
        >
          Connect
        </button>
        <p className="sb-panel-note">
          Joins a server by address or invite code without using the public directory — available
          when the alpha opens.
        </p>
      </div>

      <div className="sb-modes">
        <div className="client-filters" role="group" aria-label="Filter by game mode">
          {MODE_CHIPS.map((chip) => (
            <button
              className={`filter-chip${mode === chip ? " is-active" : ""}`}
              type="button"
              key={chip}
              aria-pressed={mode === chip}
              onClick={() => setChosenMode(chip)}
            >
              {chip === "all" ? "All" : chip}
            </button>
          ))}
          <button
            className={`filter-chip fav-filter${favsOnly ? " is-active" : ""}`}
            type="button"
            aria-pressed={favsOnly}
            onClick={() => setFavsOnly((only) => !only)}
          >
            <StarIcon size={13} />
            Favorites
          </button>
        </div>
        <label className="select-wrap sb-sort">
          <span className="select-label">Sort</span>
          <select
            aria-label="Sort servers"
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {servers.length === 0 ? (
        /* The live directory answered with no servers online. The toolbar above
           stays — it shows the shape of the product — but the listing area says
           what is actually true right now. */
        <div className="sb-offline" role="status">
          <p className="sb-offline-title">
            <span className="live-dot live-dot-idle" aria-hidden="true" /> NO SERVERS ONLINE
          </p>
          <p className="sb-offline-body">
            No community worlds are online right now. The moment a server comes up it shows up right
            here — this browser reads the live OPEN//77 directory.
          </p>
          <div className="sb-offline-ctas">
            {site.links.discord ? (
              <a
                className="btn btn-discord"
                href={site.links.discord}
                target="_blank"
                rel="noreferrer noopener"
              >
                <DiscordIcon size={16} />
                Join our Discord
              </a>
            ) : null}
            <Link className="btn btn-ghost" href="/create">
              Plan your own server
            </Link>
          </div>
        </div>
      ) : (
        <div className="sb-layout">
          <section className="sb-col-main" aria-label="All servers">
            <div className="sb-col-head">
              <h2>All servers</h2>
              <span className="sb-count">
                {visible.length} / {servers.length}
              </span>
            </div>
            <ul className="sb-list">
              {visible.map((server) => (
                <ServerRow
                  key={server.id}
                  server={server}
                  isFavorite={isFavorite(server.id)}
                  onToggleFavorite={() => toggle(server.id)}
                  onConnect={() => {
                    showToast("Opening the OPEN//77 launcher…");
                    joinServer(server.id);
                  }}
                />
              ))}
              {visible.length === 0 ? (
                <li className="server-empty">
                  No servers match these filters. Clear the search or pick another mode.
                </li>
              ) : null}
            </ul>
          </section>

          {featured}
        </div>
      )}

      {toastNode}
    </>
  );
}

function ServerRow({
  server,
  isFavorite,
  onToggleFavorite,
  onConnect,
}: {
  server: GameServer;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onConnect: () => void;
}) {
  return (
    <li className="sb-row">
      {/* The card navigates to the live detail page; the explicit Connect button
          (in sb-actions, a sibling of this link) fires the deep link instead. */}
      <Link className="sb-row-link" href={`/servers/${server.id}`}>
        <ServerImage
          src={server.icon}
          kind="icon"
          className="sb-thumb"
          label={server.name.trim().charAt(0).toUpperCase() || "?"}
        />
        <span className="sb-id">
          <span className="sb-name">
            {server.name}
            {server.featured ? <span className="sb-feat-chip">FEATURED</span> : null}
          </span>
          <span className="sb-desc">{server.desc}</span>
          <span className="sb-tags">
            {server.tags.slice(0, 3).map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </span>
        </span>
        <span className={`sb-players ${popClass(server)}`}>
          <span className="sb-players-num">
            {server.players}
            <span className="sb-players-max"> / {server.max}</span>
          </span>
          <span className="sb-players-label">players</span>
          <span className="players-bar" aria-hidden="true">
            <span style={{ width: `${occupancyPercent(server)}%` }} />
          </span>
        </span>
        <span className="sb-net">
          <span className={`sb-ping ${server.ping > 0 ? pingClass(server.ping) : ""}`}>
            {formatPing(server.ping)}
          </span>
          <span className="sb-loc">
            {server.region} · {server.lang}
          </span>
        </span>
      </Link>
      <span className="sb-actions">
        <button
          className={`fav-btn${isFavorite ? " is-fav" : ""}`}
          type="button"
          aria-pressed={isFavorite}
          aria-label={
            isFavorite ? `Remove ${server.name} from favorites` : `Add ${server.name} to favorites`
          }
          onClick={onToggleFavorite}
        >
          <StarIcon filled={isFavorite} />
        </button>
        <button className="sb-connect" type="button" onClick={onConnect}>
          Connect
        </button>
      </span>
    </li>
  );
}
