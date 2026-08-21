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
  /** Site-relative cover image. */
  banner: string;
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

/** Latency bucket, matching the `.ping-good` / `.ping-mid` / `.ping-far` styles. */
export function pingClass(ping: number): string {
  if (ping <= 30) return "ping-good";
  if (ping <= 70) return "ping-mid";
  return "ping-far";
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
