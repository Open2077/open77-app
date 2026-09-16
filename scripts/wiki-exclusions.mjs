/**
 * Wiki guides this site deliberately does not publish.
 *
 * The sync is normally all-or-nothing on purpose: a guide that exists next to
 * the code should reach the site without anyone deciding it deserves to. This
 * list is the narrow exception, for a guide the platform repository publishes
 * *ahead of* the build it describes.
 *
 * That is a reasonable thing for the platform wiki to do — implementers and
 * authors reading the same contract before the code lands is the point — and an
 * unreasonable thing for a public documentation site to do. A server owner who
 * reads an API here and finds nothing in their runtime has been misled, and the
 * whole site pays for it.
 *
 * Each entry carries the reason and the condition for removing it. Delete the
 * entry the moment the condition is met: a stale exclusion is its own bug, and
 * `check-coverage.mjs` cannot detect one.
 *
 * Shared by `sync-wiki.mjs` (which skips them) and `check-coverage.mjs` (which
 * would otherwise report them as an unpublished guide).
 */

// Publish the current wiki in full. The props guide now documents implemented
// server-owned props; the older, pre-implementation exclusion is obsolete.
export const EXCLUDED_GUIDES = new Map();

/** Wiki files that are tooling or build output rather than publishable content. */
export const EXCLUDED_TOOLING = new Set(["tools/README.md"]);

/**
 * Guides whose SITE copy is deliberately maintained here, not vendored.
 *
 * A handful of pages were rewritten in place for this audience — the platform
 * wiki writes them for implementers, the site writes them for server owners —
 * and a full sync would silently undo that rewrite. They are still published
 * (unlike `EXCLUDED_GUIDES`, which are held back entirely) and still counted by
 * `check-coverage.mjs`; what they opt out of is the drift check, because
 * "differs from the wiki" is their intended state rather than a stale vendor.
 *
 * Without this set `sync-wiki --check` reported six guides as out of date on
 * every run since the rewrite, so `npm run verify:content` could never pass and
 * a REAL drift on any other guide was indistinguishable from the expected noise.
 *
 * Each entry carries who owns the page here. Remove an entry (and re-sync the
 * guide) the day the site stops rewriting it.
 */
export const APP_OWNED_GUIDES = new Map([
  ["README.md", "site navigation: the docs index is ordered and worded for open2077.net"],
  ["cyberware.md", "rewritten as a server-owner guide (app commit 8b9eea8)"],
  ["dash.md", "rewritten as a server-owner guide (app commit 8b9eea8)"],
  ["gorilla-arms.md", "rewritten as a server-owner guide (app commit 8b9eea8)"],
  ["ground-slam.md", "rewritten as a server-owner guide (app commit 8b9eea8)"],
  ["hacking.md", "rewritten as a server-owner guide (app commit 8b9eea8)"],
]);

/** True when this guide's site copy is authored here and must not be overwritten. */
export function isAppOwned(filename) {
  return APP_OWNED_GUIDES.has(filename);
}

/** True when this top-level wiki filename must not be vendored. */
export function isExcluded(filename) {
  return EXCLUDED_GUIDES.has(filename) || EXCLUDED_TOOLING.has(filename);
}
