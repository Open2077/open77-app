import type { CommunityRelease } from "./types";

/** Human file size for a package or image, KiB below one MiB. */
export function formatBytes(value: number | null | undefined): string {
  if (value == null) return "—";
  return value < 1024 * 1024 ? `${Math.max(1, Math.ceil(value / 1024))} KiB` : `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

/** Fixed UTC calendar date so the server and the client render the same string. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Compact counter for cards and stat bars: 1 234 → 1.2k. */
export function formatCount(value: number): string {
  if (value < 1000) return String(value);
  if (value < 10000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(value / 1000)}k`;
}

/**
 * The newest published stable release from a listing, used when the dedicated
 * latest-release endpoint is unavailable (older master) so the page never
 * claims "no release" while the version list shows one.
 */
export function pickLatestStable(releases: CommunityRelease[]): CommunityRelease | null {
  const eligible = releases.filter(release => release.channel === "stable" && release.state === "published" && !release.revokedAtUtc);
  eligible.sort((a, b) => Date.parse(b.publishedAtUtc ?? b.createdAtUtc) - Date.parse(a.publishedAtUtc ?? a.createdAtUtc));
  return eligible[0] ?? null;
}
