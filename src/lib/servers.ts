import { MASTER_URL, MasterApiError, masterCall } from "@/lib/account/api";
import { parseLocaleTag } from "@/lib/locale";
import { DEMO_HANDLES, DEMO_ROSTER_PROBES } from "@/lib/servers-demo";

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
  /**
   * The raw BCP-47 tag the operator set on the server, untouched. Untrusted
   * input: render it through the helpers in `lib/locale`, never directly.
   * Optional because rows that predate the master directory (the demo set) do
   * not carry one.
   */
  locale?: string;
  /**
   * The region subtag of {@link locale}, normalised — `"FR"` for `fr-FR`, or a
   * UN M.49 code such as `"419"`. Null when the operator gave a bare language
   * like `en`, which the browser shows as an unknown region rather than a guess.
   */
  country?: string | null;
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
  /**
   * Who is connected right now, when the server publishes it. The detail
   * endpoint only — the directory listing carries no rosters, so this is absent
   * from every row {@link fetchServers} returns.
   *
   * Three distinct answers, and each is owed a different sentence on screen: the
   * key is missing altogether on every master response predating the feature,
   * `null` when the server does not publish a roster (older server build, or the
   * owner opted out), and an object with empty `entries` when it publishes one
   * and nobody is online. Never read it straight — it is a third party's JSON.
   * Put it through {@link normaliseRoster}.
   */
  players?: ServerPlayerRoster | null;
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

/**
 * One entry of a published roster, exactly as the master relays it from the
 * server that reported it.
 *
 * This is a wire shape, not a rendering shape. `name` is an arbitrary string
 * chosen by whoever runs that world and `joinedAtUtc` is whatever they put in
 * the field; {@link normaliseRoster} is what turns either into something safe
 * to draw.
 */
export type ServerPlayerEntry = {
  name: string;
  joinedAtUtc: string;
};

/**
 * The roster a server may publish next to its player count: who was connected,
 * and when that snapshot was taken.
 *
 * `sampledAtUtc` is not decoration. A roster reaches this page by way of the
 * server's heartbeat and the master's cache, so it is always slightly stale,
 * and a bare list of names invites the reader to believe it is instantaneous.
 */
export type ServerPlayerRoster = {
  sampledAtUtc: string;
  entries: ServerPlayerEntry[];
};

/**
 * The master's own display-name ceiling — the register form's `maxLength` —
 * reused here as the render cap. A roster name longer than any account name
 * could be is a server inventing something, and it gets clipped rather than
 * trusted.
 */
export const MAX_PLAYER_NAME_LENGTH = 32;

/**
 * How many roster entries the page will ever build DOM for. A 32-slot server
 * fits several times over; the cap is not a layout device but a guard, because
 * nothing stops a hostile host from claiming ten thousand players. The overflow
 * is reported as a count instead of being drawn.
 */
export const MAX_ROSTER_ENTRIES = 200;

/**
 * Characters a roster name may not keep. React escapes markup, so the risk here
 * is not injected HTML — it is a name like `alice\u202Egnitaehc` that renders
 * mirrored and impersonates somebody else, a zero-width space that makes two
 * different names look identical, or a run of newlines that pushes the list
 * apart. The bidi controls, zero-width space and the C0/C1 ranges cover all
 * three.
 *
 * ZWNJ and ZWJ (U+200C/U+200D) are deliberately left in: they carry meaning in
 * Persian, Arabic and Indic scripts, and stripping them would also break emoji
 * sequences into their parts.
 */
const UNSAFE_NAME_CHARS = /[\u0000-\u001F\u007F-\u009F\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/**
 * A roster name reduced to something safe to draw: control and
 * direction-override characters removed, whitespace runs collapsed, clipped to
 * {@link MAX_PLAYER_NAME_LENGTH}.
 *
 * Returns null for anything empty once cleaned, so a blank or all-control name
 * drops out of the list instead of rendering as an unexplained gap. The clip
 * counts code points rather than UTF-16 units, so an emoji or a CJK name is
 * never cut in half into a replacement glyph.
 */
export function sanitisePlayerName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const cleaned = name.replace(UNSAFE_NAME_CHARS, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const glyphs = Array.from(cleaned);
  if (glyphs.length <= MAX_PLAYER_NAME_LENGTH) return cleaned;
  return `${glyphs.slice(0, MAX_PLAYER_NAME_LENGTH - 1).join("")}\u2026`;
}

/** One roster row the UI can render, once {@link normaliseRoster} has vetted it. */
export type RosterEntry = {
  name: string;
  /** Null when the server gave no usable join time; that row then shows no duration. */
  joinedAtUtc: string | null;
};

/** A whole roster the UI can render — the result of {@link normaliseRoster}. */
export type ServerRoster = {
  /** Null when the server's own timestamp was missing or unparseable. */
  sampledAtUtc: string | null;
  /** Safe to draw, longest-connected first, at most {@link MAX_ROSTER_ENTRIES} of them. */
  entries: RosterEntry[];
  /** Usable entries before the cap, so the UI can say how many it is not showing. */
  total: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** The timestamp back, but only if the browser can actually parse it. */
function usableTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return Number.isNaN(new Date(value).getTime()) ? null : value;
}

/** Earliest join first; rows without one keep their order and sink to the bottom. */
function byJoinedFirst(a: RosterEntry, b: RosterEntry): number {
  if (a.joinedAtUtc === null || b.joinedAtUtc === null) {
    return Number(a.joinedAtUtc === null) - Number(b.joinedAtUtc === null);
  }
  return new Date(a.joinedAtUtc).getTime() - new Date(b.joinedAtUtc).getTime();
}

/**
 * Reads `players` off a catalog row defensively. Null means "this server does
 * not publish a roster" — which is an answer, not a failure.
 *
 * The parameter is `unknown` rather than the declared type on purpose. The
 * field is absent from every master response that predates the feature, and
 * when it does arrive it was written by whoever runs that server: a wrong-typed
 * `entries`, an entry that is a bare string, a name that is a number. All of it
 * collapses to null or is dropped here, and none of it reaches the DOM.
 *
 * Entries come out longest-connected first. The server's own order is arbitrary
 * and would reshuffle between polls; sorting by join time gives a list that
 * stays put, and puts the players who have actually settled in at the top.
 */
export function normaliseRoster(players: unknown): ServerRoster | null {
  if (!isRecord(players) || !Array.isArray(players.entries)) return null;

  const raw: unknown[] = players.entries;
  const entries: RosterEntry[] = [];
  for (const candidate of raw) {
    if (!isRecord(candidate)) continue;
    const name = sanitisePlayerName(candidate.name);
    if (name) entries.push({ name, joinedAtUtc: usableTimestamp(candidate.joinedAtUtc) });
  }
  entries.sort(byJoinedFirst);

  return {
    sampledAtUtc: usableTimestamp(players.sampledAtUtc),
    entries: entries.slice(0, MAX_ROSTER_ENTRIES),
    total: entries.length,
  };
}

/** BCP-47 primary subtag → the browser's language chip. Anything else reads as EN. */
function localeToLang(locale: string): ServerLanguage {
  const primary = parseLocaleTag(locale).language;
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
  const region = parseLocaleTag(locale).region;
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

/**
 * The master returns image URLs **relative to itself** — `iconUrl` and
 * `bannerUrl` are built as `/api/v1/icons/{sha256}` and `/api/v1/banners/{sha256}`
 * (MasterDatabase.cs). Dropped straight into an `<img src>` on open2077.net they
 * resolve against *this* origin and 404, so the conformance guard silently falls
 * back to the placeholder — which is exactly what the first server to actually
 * set an icon revealed. Absolutise against {@link MASTER_URL} at the fetch
 * boundary so every consumer downstream (browser rows, detail hero, and anything
 * added later) holds a URL it can render.
 *
 * Left untouched if the master ever starts returning absolute URLs, or if it is
 * some other absolute/data URL.
 */
function absolutiseMasterUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("/") ? `${MASTER_URL}${url}` : url;
}

/** {@link absolutiseMasterUrl} applied to a catalog row's two image slots. */
export function withAbsoluteImageUrls(server: CatalogServer): CatalogServer {
  return {
    ...server,
    iconUrl: absolutiseMasterUrl(server.iconUrl),
    bannerUrl: absolutiseMasterUrl(server.bannerUrl),
  };
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
    locale: server.locale ?? "",
    country: parseLocaleTag(server.locale).region,
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
  return (page.items ?? []).map((item) => catalogToGameServer(withAbsoluteImageUrls(item)));
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
    return withAbsoluteImageUrls(
      await masterCall<CatalogServer>(`/api/v1/servers/${encodeURIComponent(id)}`),
    );
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
 * A deterministic illustrative roster in the master's own wire shape, seeded
 * from the server id so the same page always shows the same names and the same
 * session lengths — a random list would look like live data churning between
 * reloads.
 *
 * Returned unnormalised on purpose: the demo path then goes through
 * {@link normaliseRoster} exactly like a real response, which is the only thing
 * that makes a fixture worth having. {@link DEMO_ROSTER_PROBES} rides along for
 * the same reason, so a preview shows the name guard working rather than only
 * the happy path.
 */
export function sampleRoster(
  server: Pick<GameServer, "id">,
  count = 10,
): ServerPlayerRoster {
  let seed = 0;
  for (const char of server.id) {
    seed = (seed * 31 + char.charCodeAt(0)) % 9973;
  }
  const now = Date.now();
  const entries: ServerPlayerEntry[] = [];
  const total = Math.min(count, DEMO_HANDLES.length);
  for (let i = 0; i < total; i += 1) {
    const handle = DEMO_HANDLES[(seed + i * 7) % DEMO_HANDLES.length];
    if (!handle) continue;
    // Joins spread over the last four hours so the session-length column has
    // something to say; still purely a function of the seed.
    const minutesAgo = ((seed + i * 37) % 240) + i;
    entries.push({ name: handle, joinedAtUtc: new Date(now - minutesAgo * 60_000).toISOString() });
  }
  for (const probe of DEMO_ROSTER_PROBES) {
    entries.push({ name: probe, joinedAtUtc: new Date(now - 60_000).toISOString() });
  }
  return { sampledAtUtc: new Date(now - 30_000).toISOString(), entries };
}
