/**
 * The dedicated-server release channel on the public CDN.
 *
 * The release pipeline (op77-master's `server-release.yml`) uploads
 * `server/<version>/open77-server-<version>.zip` to the CDN and rewrites
 * `server/latest.json` — `{ version, sha256, zipSha256, url }` — as the
 * pointer server owners follow. This module reads that pointer.
 *
 * It runs server-side on purpose: the CDN is a plain static file server with
 * no CORS headers, so a browser fetch from open2077.net would be blocked,
 * while a Node fetch needs nothing. The page that consumes this is statically
 * generated with ISR, so a freshly cut release shows up within minutes of
 * publish without a redeploy.
 *
 * A missing `latest.json` is not an error: it simply means no server release
 * has been cut yet, and callers render an empty state.
 */

/** Public CDN root, without a trailing slash. */
export const CDN_URL = (
  process.env.NEXT_PUBLIC_OP77_CDN_URL ?? "https://cdn.open2077.net"
).replace(/\/$/, "");

export type ServerRelease = {
  /** Full version string, e.g. `2.31.0+op77.3`. */
  version: string;
  /** Download URL of the release zip on the CDN. */
  url: string;
  /** Basename of the zip, e.g. `open77-server-2.31.0+op77.3.zip`. */
  fileName: string;
  /**
   * SHA-256 of the shipped `Open77.Server.dll` — the hash the pipeline
   * registers in the master's build allowlist and the master re-checks when a
   * server comes online.
   */
  sha256: string | null;
  /** SHA-256 of the zip itself, for verifying the download. */
  zipSha256: string | null;
  /** Zip size in bytes, when the CDN reports it. */
  sizeBytes: number | null;
  /**
   * Publish time as an ISO string. `latest.json` itself carries no date, so
   * this comes from the CDN's `Last-Modified` on the index (the pipeline
   * rewrites it at publish time) — or from a `publishedAtUtc` field if the
   * pipeline ever adds one, which takes precedence.
   */
  publishedAtUtc: string | null;
};

const REVALIDATE_SECONDS = 300;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseDate(value: string | null): string | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** HEAD the zip for its size. Best-effort: any failure just hides the size. */
async function fetchZipSize(url: string): Promise<number | null> {
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (!head.ok) return null;
    const bytes = Number(head.headers.get("content-length"));
    return Number.isFinite(bytes) && bytes > 0 ? bytes : null;
  } catch {
    return null;
  }
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

  // The pipeline always writes `url`; the constructed form is a safety net
  // that matches its layout (`server/<version>/open77-server-<version>.zip`).
  const url =
    asString(raw.url) ??
    `${CDN_URL}/server/${encodeURIComponent(version)}/open77-server-${encodeURIComponent(version)}.zip`;

  let fileName = url.slice(url.lastIndexOf("/") + 1);
  try {
    fileName = decodeURIComponent(fileName);
  } catch {
    // A malformed escape keeps the raw basename.
  }

  return {
    version,
    url,
    fileName,
    sha256: asString(raw.sha256),
    zipSha256: asString(raw.zipSha256),
    sizeBytes: await fetchZipSize(url),
    publishedAtUtc:
      parseDate(asString(raw.publishedAtUtc)) ??
      parseDate(response.headers.get("last-modified")),
  };
}

/** `123456789` → `"117.7 MB"`. Binary-adjacent but decimal units, like browsers show. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

/** ISO string → `"Aug 24, 2026"`, pinned to UTC so prerender and client agree. */
export function formatReleaseDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}
