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
 *   OLD (single Windows zip — still live today):
 *     { "version": "…", "url": "…", "sha256": "…", "zipSha256": "…" }
 *
 * When `builds` is present each platform is rendered; otherwise the single
 * legacy URL is surfaced as the Windows build and the other platforms show as
 * "coming soon" rather than broken links.
 *
 * It runs server-side on purpose: the CDN is a plain static file server with no
 * CORS headers, so a browser fetch would be blocked while a Node fetch needs
 * nothing. The page that consumes this is statically generated with ISR, so a
 * freshly cut release shows up within minutes of publish without a redeploy.
 *
 * A missing `latest.json` is not an error: it simply means no server release
 * has been cut yet, and callers render an empty state.
 */

import { asString, basename, CDN_URL, fetchArtefactMeta, parseDate } from "@/lib/cdn";

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
   * SHA-256 of the shipped managed server binary — platform-independent, the
   * hash the pipeline registers with the master. `null` when the pointer omits
   * it.
   */
  serverSha256: string | null;
  /** One entry per known platform; unavailable ones carry a `null` URL. */
  builds: ServerBuild[];
  /**
   * Publish time as an ISO string. `latest.json` carries no date, so this comes
   * from the CDN's `Last-Modified` on the index — or from a `publishedAtUtc`
   * field if the pipeline ever adds one, which takes precedence.
   */
  publishedAtUtc: string | null;
};

const REVALIDATE_SECONDS = 300;

/** Pull one platform's `{ url, archiveSha256 }` out of a `builds` map. */
function readBuildEntry(builds: Record<string, unknown>, key: PlatformKey) {
  const entry = builds[key];
  if (!entry || typeof entry !== "object") return { url: null, archiveSha256: null };
  const record = entry as Record<string, unknown>;
  return {
    url: asString(record.url),
    archiveSha256: asString(record.archiveSha256),
  };
}

/**
 * The latest published server release, or `null` when none has been cut yet
 * (or the CDN is unreachable — the page treats both as "nothing to offer").
 */
export async function fetchLatestServerRelease(): Promise<ServerRelease | null> {
  let response: Response;
  try {
    response = await fetch(`${CDN_URL}/server/latest.json`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  let raw: Record<string, unknown>;
  try {
    const parsed: unknown = await response.json();
    if (!parsed || typeof parsed !== "object") return null;
    raw = parsed as Record<string, unknown>;
  } catch {
    return null;
  }

  const version = asString(raw.version);
  if (!version) return null;

  const hasBuilds = raw.builds !== null && typeof raw.builds === "object";
  const builds = hasBuilds ? (raw.builds as Record<string, unknown>) : null;

  // NEW: platform-independent server hash. OLD: `sha256` served the same role.
  const serverSha256 = asString(raw.serverSha256) ?? asString(raw.sha256);

  // In the legacy single-zip shape the one URL is the Windows build.
  const legacyUrl =
    !builds &&
    (asString(raw.url) ??
      `${CDN_URL}/server/${encodeURIComponent(version)}/open77-server-${encodeURIComponent(version)}.zip`);
  const legacyZipSha = asString(raw.zipSha256);

  const resolved = PLATFORMS.map((meta): ServerBuild => {
    let url: string | null = null;
    let archiveSha256: string | null = null;

    if (builds) {
      const entry = readBuildEntry(builds, meta.platform);
      url = entry.url;
      archiveSha256 = entry.archiveSha256;
    } else if (meta.platform === "windows-x64" && legacyUrl) {
      url = legacyUrl;
      archiveSha256 = legacyZipSha;
    }

    return {
      ...meta,
      url,
      fileName: url ? basename(url) : null,
      archiveSha256,
      sizeBytes: null,
    };
  });

  // Fill in sizes for the available builds in parallel; missing ones stay null.
  await Promise.all(
    resolved.map(async (build) => {
      if (build.url) build.sizeBytes = (await fetchArtefactMeta(build.url)).sizeBytes;
    }),
  );

  return {
    version,
    serverSha256,
    builds: resolved,
    publishedAtUtc:
      parseDate(asString(raw.publishedAtUtc)) ??
      parseDate(response.headers.get("last-modified")),
  };
}
