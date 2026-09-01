/** Formatting and link-safety helpers shared by the admin tables. */

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
}

/** Compact age like "8s", "3m", "2h", "5d" — heartbeat columns live on this. */
export function formatAge(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "—";
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/** First 8 chars of a GUID — enough to eyeball, short enough for a cell. */
export function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

/**
 * An operator-supplied link, or null when it is not one we will render as a
 * link. Mod source URLs are typed in by staff and submitted by server owners,
 * so they are untrusted input: only absolute http(s) survives, which is what
 * refuses `javascript:`, `data:` and every other scheme-based trick. Callers
 * render the raw string as plain text when this answers null — an unlinkable
 * URL must still be *readable*, or the reviewer cannot judge the entry.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
}

/** Host only, so a long source URL cannot blow a table column open. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
