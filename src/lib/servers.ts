import { MasterApiError, masterCall } from "@/lib/account/api";
import { DEMO_HANDLES } from "@/lib/servers-demo";

export type ServerRegion = "EU" | "NA" | "SA" | "AS" | "OC";
export type ServerLanguage = "EN" | "FR" | "DE" | "ES";

export type ServerLinks = {
  website?: string;
  discord?: string;
};

export type GameServer = {
  /** Stable slug; also the `/servers/<id>` route segment. */
  id: string;
  name: string;
  desc: string;
  /** Primary game mode. Anything outside `PRIMARY_MODES` is browsed as "Custom". */
  mode: string;
  tags: string[];
  lang: ServerLanguage;
  region: ServerRegion;
  players: number;
  max: number;
  /** Round-trip latency in milliseconds. */
  ping: number;
  featured?: boolean;
  addedDaysAgo: number;
  /**
   * Cover image for the row/hero: the master's wide `bannerUrl` when the server
   * set one, otherwise its square icon, otherwise a site-relative demo cover.
   */
  banner: string;
  /** Square server icon URL from the master catalog, if any. */
  icon?: string;
  owner?: string;
  links?: ServerLinks | null;
  rules?: string[];
};

/** Modes with their own filter chip. Everything else is grouped under "Custom". */
export const PRIMARY_MODES = ["Roleplay", "Freeroam", "Racing", "PvP", "Social"] as const;

export const REGIONS: ServerRegion[] = ["EU", "NA", "SA", "AS", "OC"];
export const LANGUAGES: ServerLanguage[] = ["EN", "FR", "DE", "ES"];

/**
 * The server directory.
 *
 * Empty on purpose: no public servers exist during pre-alpha, and the browser
 * renders its honest "no servers live yet" state from an empty list. Pointing
 * `list`/`get` at the real directory API and flipping `isLive` is the entire
 * migration; `servers-demo.ts` is kept for previewing the populated browser
 * locally.
 */
export const serverDirectory = {
  isLive: false as boolean,

  async list(): Promise<GameServer[]> {
    return [];
  },

  async get(id: string): Promise<GameServer | null> {
    void id; // the real directory looks this up; the empty one has nothing to find
    return null;
  },
};

/**
 * One server in the master's public directory (`GET /api/v1/servers`).
 *
 * This mirrors the master's `CatalogServer` contract exactly — the same shape
 * the desktop launcher deserializes in `MasterClient.GetServersAsync`. It is
 * the wire type; {@link catalogToGameServer} projects it onto the browser's
 * {@link GameServer} view.
 */
export type CatalogServer = {
  id: string;
  name: string;
  description: string;
  locale: string;
  tags: string[] | null;
  website: string | null;
  discord: string | null;
  connectEndpoint: string;
  connectedPlayers: number;
  maximumPlayers: number;
  expectedGameBuild: number;
  serverVersion: string;
  protocol: { major: number; minor: number } | null;
  iconUrl: string | null;
  /**
   * Wide hero image for the detail page. Forward-compatible: the master does not
   * publish this yet (see `docs/server-images.md`), so it is optional and the UI
   * must treat its absence as "no banner", falling back to a themed placeholder.
   */
  bannerUrl?: string | null;
  startedAtUtc: string;
  lastHeartbeatAtUtc: string;
};

/** One page of the master's `GET /api/v1/servers` directory. */
export type CatalogPage = {
  page: number;
  pageSize: number;
  total: number;
  items: CatalogServer[] | null;
};

/** BCP-47 primary subtag → the browser's language chip. Anything else reads as EN. */
function localeToLang(locale: string): ServerLanguage {
  const primary = locale.split(/[-_]/)[0]?.toLowerCase();
  if (primary === "fr") return "FR";
  if (primary === "de") return "DE";
  if (primary === "es") return "ES";
  return "EN";
}

/**
 * BCP-47 region subtag → the browser's region bucket. The master carries a
 * locale, not a continent, so this is a best-effort projection and defaults to
 * EU when the tag is missing or unrecognised.
 */
function localeToRegion(locale: string): ServerRegion {
  const region = locale.split(/[-_]/)[1]?.toUpperCase();
  if (!region) return "EU";
  if (["US", "CA", "MX"].includes(region)) return "NA";
  if (["BR", "AR", "CL", "CO", "PE", "UY"].includes(region)) return "SA";
  if (["JP", "CN", "KR", "SG", "IN", "HK", "TW", "TH", "ID", "PH"].includes(region)) return "AS";
  if (["AU", "NZ"].includes(region)) return "OC";
  return "EU";
}

const PRIMARY_MODE_LOOKUP = new Map(PRIMARY_MODES.map((mode) => [mode.toLowerCase(), mode]));

/** The first tag that names a primary mode, else "Custom" — matching the browser's mode chips. */
function deriveMode(tags: readonly string[]): string {
  for (const tag of tags) {
    const match = PRIMARY_MODE_LOOKUP.get(tag.toLowerCase());
    if (match) return match;
  }
  return "Custom";
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

/**
 * Projects a master {@link CatalogServer} onto the {@link GameServer} the
 * browser renders. Fields the directory does not carry are derived where the
 * locale allows (language, region) or left neutral: there is no `featured`
 * flag, no owner, no ruleset and — deliberately — no latency, since ping is a
 * client-measured value the directory never reports.
 */
export function catalogToGameServer(server: CatalogServer): GameServer {
  const tags = server.tags ?? [];
  const website = server.website?.trim() || undefined;
  const discord = server.discord?.trim() || undefined;
  return {
    id: server.id,
    name: server.name,
    desc: server.description ?? "",
    mode: deriveMode(tags),
    tags,
    lang: localeToLang(server.locale),
    region: localeToRegion(server.locale),
    players: server.connectedPlayers,
    max: server.maximumPlayers,
    // The master directory reports no latency; ping is measured client-side, so
    // live rows show "—" rather than an invented number (see formatPing).
    ping: 0,
    featured: false,
    addedDaysAgo: daysSince(server.startedAtUtc),
    banner: server.bannerUrl ?? server.iconUrl ?? "",
    icon: server.iconUrl ?? undefined,
    links: website || discord ? { website, discord } : null,
  };
}

/**
 * Fetches the master's public server directory and projects it onto the
 * browser's {@link GameServer} rows.
 *
 * Runs in the browser (a public, unauthenticated GET), exactly like the account
 * client: the master sits behind Cloudflare, which serves CORS for the site's
 * own origin but challenges non-browser fetches, so this must not be called
 * from a server component. Errors surface as `MasterApiError` for the caller to
 * render.
 */
export async function fetchServers(): Promise<GameServer[]> {
  const page = await masterCall<CatalogPage>("/api/v1/servers?pageSize=100");
  return (page.items ?? []).map(catalogToGameServer);
}

/**
 * Fetches one server by id from the master's single-server endpoint
 * (`GET /api/v1/servers/{id}`, confirmed live), which returns the same
 * {@link CatalogServer} shape as a directory row.
 *
 * Returns `null` when the id is not in the catalog — the master answers 404 both
 * for an unknown Guid and for a malformed one, which is exactly "this server is
 * offline / does not exist" from the visitor's point of view. Any other failure
 * (network, 5xx, rate-limit) re-throws as {@link MasterApiError} so the caller
 * can tell "not found" apart from "master unreachable".
 *
 * Runs in the browser for the same Cloudflare/CORS reason as {@link fetchServers}.
 */
export async function fetchServer(id: string): Promise<CatalogServer | null> {
  try {
    return await masterCall<CatalogServer>(`/api/v1/servers/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof MasterApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * How stale the last heartbeat may be before a listed server is shown as
 * offline. The master prunes dead servers from the directory, so a row is
 * normally live; this catches the window where a server has stopped beating but
 * has not yet aged out of the catalog.
 */
export const LIVE_HEARTBEAT_MAX_AGE_MS = 3 * 60_000;

/** True when the server's last heartbeat is fresh enough to call it live. */
export function isServerLive(server: Pick<CatalogServer, "lastHeartbeatAtUtc">): boolean {
  const beat = new Date(server.lastHeartbeatAtUtc).getTime();
  if (Number.isNaN(beat)) return false;
  return Date.now() - beat <= LIVE_HEARTBEAT_MAX_AGE_MS;
}

/**
 * Human uptime since `startedAtUtc`, e.g. "3d 4h", "2h 15m", "8m", "just now".
 * Returns null for an unparseable or future timestamp rather than an odd string.
 */
export function formatUptime(startedAtUtc: string): string | null {
  const started = new Date(startedAtUtc).getTime();
  if (Number.isNaN(started)) return null;
  const ms = Date.now() - started;
  if (ms < 0) return null;
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/** `major.minor` protocol string, or "—" when the directory omits it. */
export function formatProtocol(protocol: CatalogServer["protocol"]): string {
  return protocol ? `${protocol.major}.${protocol.minor}` : "—";
}

/**
 * The `open77://` deep link that boots Cyberpunk 2077 straight into a server.
 *
 * The OS routes it to the installed OPEN//77 launcher, which resolves the id
 * against the master directory, signs the player in if needed, and starts the
 * game already connecting to that world (or auto-connects a running client).
 * If the launcher is not installed the browser shows its usual scheme prompt.
 *
 * `<id>` is the same identifier the directory exposes as {@link GameServer.id}.
 */
export function serverConnectUrl(id: string): string {
  return `open77://connect?server=${encodeURIComponent(id)}`;
}

/**
 * Best-effort "open the launcher" for a Join/Play click. Navigating to a custom
 * scheme that has no handler simply does nothing (or shows the OS prompt); it
 * never unloads the current page, so this is safe to call unconditionally.
 */
export function joinServer(id: string): void {
  if (typeof window === "undefined") return;
  window.location.href = serverConnectUrl(id);
}

/** Latency bucket, matching the `.ping-good` / `.ping-mid` / `.ping-far` styles. */
export function pingClass(ping: number): string {
  if (ping <= 30) return "ping-good";
  if (ping <= 70) return "ping-mid";
  return "ping-far";
}

/**
 * Ping as shown in the browser. A non-positive value means "unknown" — the live
 * master directory carries no latency — and renders as a neutral dash instead
 * of a fabricated millisecond count.
 */
export function formatPing(ping: number): string {
  return ping > 0 ? `${ping} ms` : "—";
}

/**
 * Occupancy bucket. `pop-full` is the only one that uses Signal Coral, because
 * "nearly full" is a live status and coral is reserved for live semantics.
 */
export function popClass(server: Pick<GameServer, "players" | "max">): string {
  const ratio = server.players / server.max;
  if (ratio >= 0.9) return "pop-full";
  if (ratio >= 0.7) return "pop-high";
  if (ratio >= 0.35) return "pop-mid";
  return "pop-low";
}

export function occupancyPercent(server: Pick<GameServer, "players" | "max">): number {
  if (server.max <= 0) return 0;
  return Math.round((server.players / server.max) * 100);
}

/**
 * Deterministic illustrative player list, derived from the server id so the
 * same page always renders the same names — a random list would look like live
 * data changing between reloads.
 */
export function samplePlayers(server: Pick<GameServer, "id">, count = 10): string[] {
  let seed = 0;
  for (const char of server.id) {
    seed = (seed * 31 + char.charCodeAt(0)) % 9973;
  }
  const total = Math.min(count, DEMO_HANDLES.length);
  const out: string[] = [];
  for (let i = 0; i < total; i += 1) {
    const handle = DEMO_HANDLES[(seed + i * 7) % DEMO_HANDLES.length];
    if (handle) out.push(handle);
  }
  return out;
}
