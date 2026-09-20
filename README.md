# OPEN//77 — web app

Marketing site, community resource Hub, server browser and documentation for OPEN//77, a multiplayer project for
Cyberpunk 2077. Built with Next.js on the App Router and deployed on Vercel.

Documentation and marketing content are prerendered. Public Hub pages read approved
content from the master API at request time and render their content and metadata
on the server. Account, moderation and creator workflows also depend on the master;
private file uploads and downloads use its configured gateway. The app owns no
database. Documentation and public Hub content remain readable without executing
client JavaScript.

## Requirements

- Node.js 20.19 or newer (Vercel builds on Node 24)
- npm

```bash
npm install
npm run dev     # http://localhost:3000
```

## Scripts

| Script                   | Purpose                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| `npm run dev`            | Development server                                                |
| `npm run build`          | Production build, prerenders static routes                        |
| `npm start`              | Serves the build; the `verify:served` scripts expect it on `:3000` |
| `npm run check`          | Typecheck then lint                                               |
| `npm run test:hub`       | Deterministic Hub tests, Markdown safety and browser-runner guards |
| `npm run sync:wiki`      | Re-copies the documentation source out of the platform repository |
| `npm run verify:content` | Checks the synced content before it is built                      |
| `npm run verify:served`  | Checks the built site over HTTP and in a real browser             |
| `npm run inspect:output` | Prints what a crawler receives for a sample of pages              |
| `npm run inspect:prose`  | Prints the prose around each platform-repository file reference   |
| `npm run screenshot`     | Writes full-page screenshots of every page shape                  |

App CI runs a locked dependency install, `check`, `test:hub` and the production
build on Node24.19.0. It compiles loopback API targets and does not deploy or claim
real browser/provider acceptance. For the separate real-site guest scenario, see
[Hub browser acceptance](docs/community-hub-browser-acceptance.md).

Configure `NEXT_PUBLIC_OP77_MASTER_URL` before building for browser API calls.
`OP77_COMMUNITY_API_URL` selects the server-side Hub API origin and falls back to
the browser master origin when absent. Keep credentials out of both URLs. The
deployment needs working browser-to-master/gateway and server-to-master paths;
a successful static build alone does not verify those connections. See the
[operator guide](docs/community-hub-operator-guide.md) and
[release-readiness report](docs/community-hub-release-readiness.md).

## Layout

```
content/
  docs/           Markdown guides synced from the wiki — not edited here
                  + meta.json, which drives the navigation and IS edited here
  guides/         Markdown guides authored in this repository
  api/api.json    The Lua API, extracted from the platform's resource host
public/           Static files served as-is: assets/, brand/, favicons
scripts/          Sync and verification tooling, plain Node, no build step
src/
  app/            Routes
  components/     UI, split into server components and the few client ones
  lib/            Content loading, the markdown pipeline, SEO helpers
  styles/         Global CSS; styles/legacy/ is the ported design system
```

## Documentation pipeline

Most guides are **not** authored in this repository. They live in the platform repository's
`wiki/` directory next to the code they describe, and `npm run sync:wiki` copies them into
`content/docs/`. Editing `content/docs/*.md` directly means the next sync overwrites the change —
and deletes the file outright if the wiki has no such guide.

```
platform wiki/*.md   ──sync:wiki──>  content/docs/*.md   ──remark/rehype/Shiki──>  /docs/<slug>
platform api.json    ──sync:wiki──>  content/api/api.json ──api-reference.ts────>  /docs/api/...
content/guides/*.md  ─────────────────────────────────── ──remark/rehype/Shiki──>  /docs/<slug>
```

`content/docs/meta.json` is the one file in `content/docs` that is maintained here. It defines the
sections, the order, the navigation labels and the per-page descriptions, and it feeds the sidebar,
the sitemap, the previous/next pager and the Markdown endpoints at once. A guide that is synced but
missing from it has no route — `node scripts/check-coverage.mjs` fails on exactly that.

### Guides authored here

`content/guides/` holds Markdown written in this repository. It exists for documentation that
genuinely belongs to the website rather than to the platform checkout: a guide assembled from
several internal documents, or one written for a reader who has no repository to look at. Such a
page could not live in `content/docs`, because the sync would delete it.

An authored guide is registered in `meta.json` exactly like a synced one, plus one field:

```json
{
  "slug": "world-drawing",
  "kind": "guide",
  "source": "authored",
  "nav": "Drawing in the world",
  "title": "Drawing in the world",
  "description": "…"
}
```

It then gets the same rendering, table of contents, `/docs/<slug>.md` twin, `llms.txt` entry,
sitemap entry and pager position as a synced guide, with no per-page code. `check-coverage.mjs`
checks the same two directions for it — a file with no navigation entry, and an entry with no file
— and refuses a name that collides with a synced guide.

The alternative for site-owned documentation is `kind: "page"`, a hand-built route under
`src/app/docs/`. That is the right shape for a designed page with step cards and diagrams, and it
costs a content module, a Markdown projection registered in `src/app/md/docs/[slug]/route.ts`, and
an entry in `llms-full.txt`. Prefer an authored guide for reference material that is mostly prose,
tables and code.

Markdown is rendered at build time through unified: `remark-gfm` for tables, `rehype-slug` and
`rehype-autolink-headings` for anchors, and Shiki with a theme derived from the site's own palette
so Lua samples match the design instead of shipping a second one. Wiki-relative links
(`vehicles.md#seats`) are rewritten to site routes.

The API reference at `/docs/api` is a two-pane explorer with category, namespace and
client/server filters. The generated `api.json` supplies native cards; explicit function
tables in the synced `server-api.md` and the server section of `voice.md` supply the remaining
documented server methods. Generated cards take precedence. Wiki-derived entries retain their
literal signatures and source-guide links; missing parameter types are not inferred.

Namespace pages and their Markdown twins remain available, with an anchor per function.
Explorer links use `/docs/api#server/open77-players/disconnect`; filters live in the query
string, so selections survive reload and browser Back. The documentation has a light/dark
switch (saved locally), its own search and collapsible guide navigation below the main site
header. Guide content remains authored in the platform wiki.

On this workstation, sync with `npm run sync:wiki -- --from ../base/wiki`.
The sync also discovers sibling `CyberM`, `open77-base` and `base` checkouts automatically.
When a feature worktree contains one new guide but lacks unrelated sources from a
newer vendored snapshot, use the explicit scoped pipeline:
`npm run sync:wiki -- --from ../hub-base/wiki --only community-hub-warden.md`.
The selected source must be committed. This preserves unrelated files and manifest
records, recording the selected guide's `sourceRevision` and `sourceSyncedAt`
without advancing the full-snapshot timestamp. Verify with the same arguments plus
`--check`; this checks only that guide and does not claim a complete wiki sync.
Full sync retains its source requirements and stale-guide removal behavior.
Run `node --test scripts/test-sync-wiki-scoped.mjs` for the preservation/drift checks.

When another session is implementing a feature, select a clean worktree of the intended
platform revision with `--from <worktree>/wiki`; do not publish its unfinished working files.
Set `OPEN77_WIKI_SOURCE` to that same wiki path when running `npm run verify:content`,
so the drift, coverage and overlay checks all verify the selected revision.

If that checkout predates the site's Cyberware additions, do **not** run a full
wiki sync: it would remove those newer guides and API cards. For the attachment /
player-interaction update, `npm run sync:attachments -- --from ../CyberM/wiki`
copies only `attachments`, `player-interactions`, `props` and the RP catalogue,
merging the 24 new contracts and 17 animation cards by runtime/name. Other content
is preserved and `_manifest.json.partialSync` records the scope. Check that slice
with `npm run sync:attachments -- --check`, then `npm run verify:attachments`
(append `-- http://localhost:3000` to also verify served HTML/Markdown). A full
`verify:content` drift check still requires a platform checkout containing both
features; targeted verification does not claim the rest of that checkout matches.

Cyberware guides live in the platform wiki: `cyberware.md` describes the reusable foundations
and `gorilla-arms.md` is the first ability guide. Add future powers alongside them, register
their pages under the `cyberware` section in `content/docs/meta.json`, and link their API
namespaces to the guide in `src/lib/api-reference.ts`. Category membership is maintained in
`src/lib/api-categories.ts`. Generate the platform API JSON before syncing; publish only
implemented contracts and state the required compatible client/server build in each guide.

> **Those two files are not on the platform's `main` branch.** They were published from the
> `docs/cyberware-public-20260913` branch, which has never been merged: `main` carries an
> internal `cyberware.md` written as an engineering status report, and no `gorilla-arms.md`
> at all. A plain `npm run sync:wiki -- --from ../base/wiki` therefore **deletes the Gorilla
> Arms tutorial and replaces the public cyberware page**, which is why the last sync ran from
> a staged source: a copy of `main`'s wiki with those two files overlaid from that branch.
> Merge the branch upstream and this whole exception disappears. Until then, after syncing
> from `main`, restore both files with
> `git checkout HEAD -- content/docs/cyberware.md content/docs/gorilla-arms.md`.

Run `node scripts/check-hydration.mjs http://127.0.0.1:3000 --docs` for the focused browser
checks: filters, deep links, Back, clipboard, themes, sticky navigation and mobile layout.
This writes review screenshots under `.shots/` (ignored by Git).

### References to the platform repository

The RP animation guide links public discovery downloads under `/data/`:
`emote-animations.txt` and `rp-workspots.json`. Refresh them with
`node scripts/sync-animation-inventories.mjs --from <platform-checkout>` and
verify with the same command plus `--check`. The exporter records source revision
and hashes in `animation-inventories.json`; it publishes names and workspot-to-clip
associations only, not game assets or internal tree details. These inventories
do not grant playback support; the installed `Open77.animations.clips()` catalogue
is the runtime reference.

Some guides point at files outside the wiki — datasets under `docs/generated/`, example resources,
the licence. That repository is not public yet, so `site.links.platformRepo` is `null` and those
references render as filenames in code style rather than links to a 404. Setting that field to the
repository URL turns them all back into links, with no other change.

## SEO and GEO

Search engines and answer engines are treated as first-class readers, and both are served from the
same prerendered output rather than a parallel implementation.

- **Static everything.** No route renders at request time, so the full content of the server
  browser and the API reference is in the HTML rather than assembled by client JavaScript.
- **Metadata.** Per-page titles, descriptions, canonicals and Open Graph/Twitter cards come from
  one helper in `src/lib/seo.ts`, so no page can quietly ship without them.
- **Structured data.** JSON-LD per page type: `Organization` and `WebSite` sitewide,
  `SoftwareApplication` on the landing page, `CollectionPage` plus `ItemList` on index pages,
  `TechArticle` on guides, `APIReference` on namespace pages, `FAQPage` where there are real
  questions, and `BreadcrumbList` everywhere.
- **Markdown twins.** Every documentation URL answers to the same URL plus `.md` — `/docs/vehicles`
  and `/docs/vehicles.md` — served as `text/markdown` with permissive CORS, which is the convention
  agents probe for. Route segments cannot carry an extension, so the handlers live under `/md/*`
  and are rewritten into place in `next.config.ts`.
- **`llms.txt` and `llms-full.txt`.** A structured map of the site, and the entire documentation
  set concatenated into one 2.4 MB document, for models that would rather read once than crawl.
- **`robots.txt`** names the known AI crawlers explicitly instead of leaving their access to be
  inferred, and **`sitemap.xml`** lists all 229 public URLs with `lastmod` taken from the wiki sync.
- **Legacy URLs.** The static site's `.html` URLs are already indexed, so each one is a permanent
  redirect to its replacement. `docs.html` maps to `/docs/platform`, which is what that page
  actually was, and it keeps the `#how-it-works` and `#faq` anchors alive.

## Server data

The server browser renders from `src/lib/servers.ts`, which currently returns a fixed set of
example servers. There is no master server list yet, and no build exists for anyone to run, so
every surface that shows this data says so — the listing carries a notice and the connect buttons
do not pretend to connect. Replacing the two functions in that file with a real fetch is the whole
integration; the components do not care where the data comes from.

## Verification

Vercel's build catches type errors and lint failures. It does not catch a redirect that lost its
query string, a rewrite that stopped matching, a wiki link that now 404s, content that silently
disappeared from the HTML, or a hydration mismatch — so those have scripts.

```bash
npm run check            # types and lint
npm run verify:releases  # release changes, channel isolation and automatic refresh (offline)
npm run verify:content   # the synced content, before building
npm run build
npm start                # in another terminal, on :3000
npm run verify:served    # the built site, over HTTP and in a real browser
```

`verify:content` covers three things that are invisible at build time:

- **`check-coverage.mjs`** — every wiki page has a route. A guide synced but missing from
  `meta.json` renders nowhere.
- **`check-api-overlays.mjs`** — the wiki's hand-written API prose (`api-descriptions.json`,
  `api-notes.json`, `server-vehicle-api.json`) is still present in the generated `api.json`. If
  that merge breaks upstream, the pages still build, just with the terse generated summaries.
- **`check-api-markup.mjs`** — the only Markdown in the API prose is inline code and bold, which
  is all `InlineMarkdown` renders. Anything else would appear as literal syntax on the page.

`verify:served` covers the rest:

- **`smoke.mjs`** — every public URL shape: pages, the `.md` twins, `llms.txt`, the legacy
  redirects, and the assertion that no rendered page links to the private platform repository.
- **`inspect-links.mjs`** — every link inside the rendered documentation resolves.
- **`check-hydration.mjs`** — drives Chrome over the DevTools protocol and fails on any console
  error, then exercises the interactions themselves: the server filters, the `?mode=` deep link,
  favourites round-tripping through local storage, both search boxes, and the mobile menu closing
  on navigation. It also types each search box's own placeholder suggestions and fails if one
  returns nothing, which is how the reference came to stop advertising a function that never
  existed.

## Deployment

### Download release freshness

`/download` shows the **launcher** and **dedicated server** as separate channels.
`/host` keeps the Alpha account gate and offers the Windows/Linux
archives. Each channel reads its own CDN `latest.json` at request time, with
`no-store` and a bounded timeout. These two pages are not build-time/ISR release
snapshots; publishing a pointer updates them without redeploying the website.
Only metadata for immutable, versioned artefacts is cached.

Visible tabs refresh every 60 seconds, on returning to the tab or reconnecting,
and through **Check for updates**. Refresh preserves the current scroll position
and account state. The displayed version and its archive links come from the
same pointer; cross-version/channel URLs are rejected. If the pointer cannot be
verified, the page shows an unavailable state instead of substituting an old
version or inventing a download URL.

`npm run verify:releases` simulates consecutive publications and CDN failures.
After `npm run build` and `npm start`, run
`node scripts/check-host-download-ui.mjs http://127.0.0.1:3000` to compare the
rendered versions/links against the live CDN and check preview gates, manual
refresh, hydration and desktop/mobile layouts. Browser account responses are
synthetic: this test uses no production credentials.

Zero-config on Vercel: framework detection handles the build, and there is deliberately no
`vercel.json`. Redirects, rewrites, headers and image settings all live in `next.config.ts`, which
means `npm start` exercises the same rules that run in production — a `vercel.json` would silently
override them and only diverge once deployed.

`references/` and `attachments/` are design source material. They stay in version control and are
excluded from deployments through `.vercelignore`.

## Licence

See the platform repository. The brand assets under `public/brand/` are OPEN//77 marks; the
`/brand` page states what may be done with them.
