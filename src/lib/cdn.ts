/**
 * The public release CDN, and the few helpers every release surface shares.
 *
 * Both download surfaces — the dedicated server on `/host` and the player
 * launcher on `/download` — read a `latest.json` pointer published by the
 * release pipeline under the same origin, so the origin and the two formatters
 * live here rather than in either page's own module.
 *
 * Every read of this CDN happens server-side on purpose: it is a plain static
 * file server with no CORS headers, so a browser fetch would be blocked while a
 * Node fetch needs nothing.
 */

/** Public CDN root, without a trailing slash. */
export const CDN_URL = (
  process.env.NEXT_PUBLIC_OP77_CDN_URL ?? "https://cdn.open2077.net"
).replace(/\/$/, "");

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

/** A non-empty string, or `null`. The shape every pointer field is read through. */
export function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** A parseable date as an ISO string, or `null`. */
export function parseDate(value: string | null): string | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** Last path segment of a URL, percent-decoded when it can be. */
export function basename(url: string): string {
  const name = url.slice(url.lastIndexOf("/") + 1);
  try {
    return decodeURIComponent(name);
  } catch {
    // A malformed escape keeps the raw basename.
    return name;
  }
}

/** What a HEAD on a published artefact tells us about it. */
export type ArtefactMeta = {
  /** `Content-Length` in bytes, when the CDN reports one. */
  sizeBytes: number | null;
  /** `Last-Modified` as an ISO string — in practice, when the build was published. */
  lastModifiedUtc: string | null;
};

/**
 * HEAD one artefact for its size and publish time.
 *
 * Best-effort by design: the size and the date are garnish on a download page,
 * so any failure hides them rather than failing the page.
 */
export async function fetchArtefactMeta(url: string): Promise<ArtefactMeta> {
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (!head.ok) return { sizeBytes: null, lastModifiedUtc: null };
    const bytes = Number(head.headers.get("content-length"));
    return {
      sizeBytes: Number.isFinite(bytes) && bytes > 0 ? bytes : null,
      lastModifiedUtc: parseDate(head.headers.get("last-modified")),
    };
  } catch {
    return { sizeBytes: null, lastModifiedUtc: null };
  }
}
