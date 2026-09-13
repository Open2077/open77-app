/**
 * The player-launcher release channel on the public CDN.
 *
 * The release pipeline uploads one Windows executable per version under
 * `launcher/<version>/Open77Launcher.exe` and rewrites `launcher/latest.json`
 * as the pointer everything else follows:
 *
 *     {
 *       "version": "2.31.0+op77.6",
 *       "sha256":  "<sha-256 of the exe, the digest registered with the master>",
 *       "url":     "https://cdn…/launcher/2.31.0+op77.6/Open77Launcher.exe"
 *     }
 *
 * Directory listing is off on the CDN, so this pointer is the only discovery
 * path — there is nothing to crawl and no index to parse. `url` is used exactly
 * as published rather than rebuilt from `version`: the version carries a `+`,
 * which is literal in a path but would be mangled by a naive re-encode.
 *
 * A missing or unreadable `latest.json` is not an error. It means either that
 * no launcher has been cut yet or that the CDN is briefly unhappy, and the page
 * renders an empty state for both rather than failing to build.
 */

import { asString, basename, fetchArtefactMeta, fetchReleasePointer, parseDate, releaseArtefactUrl } from "@/lib/cdn";

export type LauncherRelease = {
  /** Full version string, e.g. `2.31.0+op77.6`. */
  version: string;
  /** Direct download URL for the executable. */
  url: string;
  /** Basename of the executable, e.g. `Open77Launcher.exe`. */
  fileName: string;
  /**
   * SHA-256 of the executable — the same digest the release pipeline registers
   * in the master's allowlist of authorized builds. `null` if the pointer omits
   * it, which would itself be a pipeline bug.
   */
  sha256: string | null;
  /** Size in bytes, when the CDN reports one. */
  sizeBytes: number | null;
  /**
   * Publish time as an ISO string. `latest.json` carries no date, so this is
   * the CDN's `Last-Modified` on the executable — or a `publishedAtUtc` field
   * if the pipeline ever adds one, which takes precedence.
   */
  publishedAtUtc: string | null;
};

/**
 * The latest published launcher, or `null` when the pointer is missing,
 * malformed or unreachable.
 */
export async function fetchLatestLauncherRelease(): Promise<LauncherRelease | null> {
  const pointer = await fetchReleasePointer("launcher");
  if (!pointer) return null;
  const { raw } = pointer;

  const version = asString(raw.version);
  const url = version ? releaseArtefactUrl(raw.url, "launcher", version) : null;
  // Both are load-bearing: a version with no URL is not a download, and a URL
  // with no version cannot be named. Either missing means "nothing to offer".
  if (!version || !url) return null;

  const meta = await fetchArtefactMeta(url);

  return {
    version,
    url,
    fileName: basename(url),
    sha256: asString(raw.sha256),
    sizeBytes: meta.sizeBytes,
    publishedAtUtc: parseDate(asString(raw.publishedAtUtc)) ??
      parseDate(asString(raw.publishedAt)) ?? meta.lastModifiedUtc ?? pointer.lastModifiedUtc,
  };
}
