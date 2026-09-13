/**
 * The dedicated-server release channel on the public CDN.
 *
 * The release pipeline uploads the per-platform archives under
 * `server/<version>/…` and rewrites `server/latest.json` as the pointer server
 * owners follow. This module reads that pointer and normalises it into a list
 * of platform builds.
 *
 * Two shapes are accepted, because the pipeline is mid-migration:
 *
 *   NEW (multi-platform):
 *     {
 *       "version": "2.31.0+op77.4",
 *       "serverSha256": "<managed dll sha, platform-independent>",
 *       "builds": {
 *         "windows-x64": { "url": "…-win-x64.zip",      "archiveSha256": "…" },
 *         "linux-x64":   { "url": "…-linux-x64.tar.gz", "archiveSha256": "…" }
 *       }
 *     }
 *
 *   OLD (single Windows zip):
 *     { "version": "…", "url": "…", "sha256": "…", "zipSha256": "…" }
 *
 * When `builds` is present each platform is rendered; otherwise the single
 * legacy URL is surfaced as the Windows build and the other platforms show as
 * "coming soon" rather than broken links.
 *
 * It runs server-side on purpose: the CDN is a plain static file server with no
 * CORS headers, so a browser fetch would be blocked while a Node fetch needs
 * nothing. Mutable pointers are fetched at request time, independently of the
 * launcher channel, so new server releases need no site rebuild or cache purge.
 *
 * A missing `latest.json` is not an error: it simply means no server release
 * has been cut yet, and callers render an empty state.
 */

import { asString, basename, fetchArtefactMeta, fetchReleasePointer, parseDate, releaseArtefactUrl } from "@/lib/cdn";

/** The platform keys the pipeline publishes, in the order we present them. */
export type PlatformKey = "windows-x64" | "linux-x64";

type PlatformMeta = {
  platform: PlatformKey;
  os: "windows" | "linux";
  /** Card heading, e.g. `Windows (x64)`. */
  label: string;
  /** Short OS word for the icon caption. */
  osLabel: string;
  /** Archive extension the pipeline ships for this platform. */
  archiveKind: "zip" | "tar.gz";
};

/** The platforms we know how to describe, whether or not a build exists yet. */
const PLATFORMS: readonly PlatformMeta[] = [
  {
    platform: "windows-x64",
    os: "windows",
    label: "Windows (x64)",
    osLabel: "Windows",
    archiveKind: "zip",
  },
  {
    platform: "linux-x64",
    os: "linux",
    label: "Linux (x64, Debian)",
    osLabel: "Linux",
    archiveKind: "tar.gz",
  },
];

export type ServerBuild = PlatformMeta & {
  /** Download URL, or `null` when this platform has no build published yet. */
  url: string | null;
  /** Basename of the archive, or `null` when unavailable. */
  fileName: string | null;
  /** SHA-256 of the archive, for verifying the download. */
  archiveSha256: string | null;
  /** Archive size in bytes, when the CDN reports it. */
  sizeBytes: number | null;
};

export type ServerRelease = {
  /** Full version string, e.g. `2.31.0+op77.4`. */
  version: string;
  /**
   * Legacy/default server binary digest. Current releases also publish a
   * distinct binary hash for each platform. Never use this as an archive hash.
   */
  serverSha256: string | null;
  /** One entry per known platform; unavailable ones carry a `null` URL. */
  builds: ServerBuild[];
  /**
   * Publish time from the pointer's publishedAt/publishedAtUtc, falling back
   * to Last-Modified for older release pipelines.
   */
  publishedAtUtc: string | null;
};

/** Pull one platform's `{ url, archiveSha256 }` out of a `builds` map. */
function readBuildEntry(builds: Record<string, unknown>, key: PlatformKey) {
  const entry = builds[key];
  if (!entry || typeof entry !== "object") return { url: null, archiveSha256: null };
  const record = entry as Record<string, unknown>;
  return {
    url: asString(record.url),
    archiveSha256: asString(record.archiveSha256),
    sizeBytes: typeof record.size === "number" && Number.isSafeInteger(record.size) && record.size > 0
      ? record.size : null,
  };
}

/**
 * The latest published server release, or `null` when none has been cut yet
 * (or the CDN is unreachable — the page treats both as "nothing to offer").
 */
export async function fetchLatestServerRelease(): Promise<ServerRelease | null> {
  const pointer = await fetchReleasePointer("server");
  if (!pointer) return null;
  const { raw } = pointer;

  const version = asString(raw.version);
  if (!version) return null;

  const hasBuilds = raw.builds !== null && typeof raw.builds === "object" && !Array.isArray(raw.builds);
  const builds = hasBuilds ? (raw.builds as Record<string, unknown>) : null;

  // OLD: `sha256` served the same role. Neither field is an archive checksum.
  const serverSha256 = asString(raw.serverSha256) ?? asString(raw.sha256);

  // In the legacy single-zip shape the one URL is the Windows build.
  const legacyUrl = !builds && releaseArtefactUrl(raw.url, "server", version);
  const legacyZipSha = asString(raw.zipSha256);

  const resolved = PLATFORMS.map((meta): ServerBuild => {
    let url: string | null = null;
    let archiveSha256: string | null = null;
    let sizeBytes: number | null = null;

    if (builds) {
      const entry = readBuildEntry(builds, meta.platform);
      url = releaseArtefactUrl(entry.url, "server", version);
      archiveSha256 = entry.archiveSha256;
      sizeBytes = entry.sizeBytes ?? null;
    } else if (meta.platform === "windows-x64" && legacyUrl) {
      url = legacyUrl;
      archiveSha256 = legacyZipSha;
    }

    return {
      ...meta,
      url,
      fileName: url ? basename(url) : null,
      archiveSha256: url ? archiveSha256 : null,
      sizeBytes: url ? sizeBytes : null,
    };
  });

  if (!resolved.some((build) => build.url)) return null;

  // Current pointers already include sizes. HEAD is only a legacy fallback.
  await Promise.all(
    resolved.map(async (build) => {
      if (build.url && build.sizeBytes === null) build.sizeBytes = (await fetchArtefactMeta(build.url)).sizeBytes;
    }),
  );

  return {
    version,
    serverSha256,
    builds: resolved,
    publishedAtUtc:
      parseDate(asString(raw.publishedAtUtc)) ??
      parseDate(asString(raw.publishedAt)) ?? pointer.lastModifiedUtc,
  };
}
