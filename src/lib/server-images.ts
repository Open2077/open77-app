/**
 * Client-side conformance guard for server-supplied images (icon + banner).
 *
 * The site is never the only line of defence — the server validates on upload
 * and the master validates before it publishes an `iconUrl` / `bannerUrl` (see
 * `docs/server-images.md`). This module is the last, defensive layer: even a URL
 * that made it into the catalog is only rendered once the browser has actually
 * decoded it AND confirmed its natural dimensions/aspect fall inside documented
 * bounds. Anything else falls back to a themed placeholder, so the UI can never
 * show a broken, oversized or distorted image.
 *
 * The numbers here are the single source of truth for those bounds and are meant
 * to match — not contradict — the server/master-side validation the design spec
 * recommends.
 */

/**
 * Icon constraints. Server icons are square marks shown small (card thumbnail,
 * detail badge). We accept a little skew rather than demand a perfect square so
 * a 512×500 export still renders, but reject anything that would letterbox or
 * stretch noticeably.
 */
export const ICON_CONSTRAINTS = {
  /** Reject anything smaller on the shorter side — it would look mushy scaled up. */
  minPx: 64,
  /** Reject anything larger on the longer side — a catalog icon is not a wallpaper. */
  maxPx: 1024,
  /** Longer side / shorter side. 1.0 is a perfect square; ≤ 1.2 still reads as "square". */
  maxAspectSkew: 1.2,
} as const;

/**
 * Banner constraints. The banner is a wide hero slot, so the guard's real job is
 * to reject images that are not actually wide (a square icon pasted into the
 * banner field) or that are absurdly thin/large.
 */
export const BANNER_CONSTRAINTS = {
  /** width / height must be at least this — "wide", ≈ 2:1 or wider. */
  minAspect: 2,
  /** …but not a pathologically thin strip. */
  maxAspect: 5,
  /** Below this the hero would upscale and blur. */
  minWidth: 320,
  /** Sane ceiling on either dimension so we never decode a giant asset. */
  maxPx: 4096,
} as const;

/** True when decoded `w×h` pixels satisfy {@link ICON_CONSTRAINTS}. */
export function isConformantIcon(w: number, h: number): boolean {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return false;
  const shorter = Math.min(w, h);
  const longer = Math.max(w, h);
  if (shorter < ICON_CONSTRAINTS.minPx) return false;
  if (longer > ICON_CONSTRAINTS.maxPx) return false;
  return longer / shorter <= ICON_CONSTRAINTS.maxAspectSkew;
}

/** True when decoded `w×h` pixels satisfy {@link BANNER_CONSTRAINTS}. */
export function isConformantBanner(w: number, h: number): boolean {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return false;
  if (w < BANNER_CONSTRAINTS.minWidth) return false;
  if (Math.max(w, h) > BANNER_CONSTRAINTS.maxPx) return false;
  const aspect = w / h;
  return aspect >= BANNER_CONSTRAINTS.minAspect && aspect <= BANNER_CONSTRAINTS.maxAspect;
}
