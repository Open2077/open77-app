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

/** True when this top-level wiki filename must not be vendored. */
export function isExcluded(filename) {
  return EXCLUDED_GUIDES.has(filename) || EXCLUDED_TOOLING.has(filename);
}
