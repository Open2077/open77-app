# OPEN//77 — web app

Marketing site, server browser and documentation for OPEN//77, a multiplayer project for
Cyberpunk 2077. Built with Next.js on the App Router and deployed on Vercel.

Every route is prerendered at build time. There is no database, no request-time data fetching and
no runtime dependency on the platform: the whole site is static HTML, which is what makes the
documentation legible to search engines, answer engines and coding agents without any of them
executing JavaScript.

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
| `npm run build`          | Production build, prerenders every route                          |
| `npm start`              | Serves the build; the `verify:served` scripts expect it on `:3000` |
| `npm run check`          | Typecheck then lint                                               |
| `npm run sync:wiki`      | Re-copies the documentation source out of the platform repository |
| `npm run verify:content` | Checks the synced content before it is built                      |
| `npm run verify:served`  | Checks the built site over HTTP and in a real browser             |
| `npm run inspect:output` | Prints what a crawler receives for a sample of pages              |
| `npm run inspect:prose`  | Prints the prose around each platform-repository file reference   |
| `npm run screenshot`     | Writes full-page screenshots of every page shape                  |

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

The API reference is generated from `api.json`, one page per namespace with an anchor per function,
so all 258 signatures are in static HTML and every function still has a deep link.

### References to the platform repository

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
  set concatenated into one 320 KB document, for models that would rather read once than crawl.
- **`robots.txt`** names the known AI crawlers explicitly instead of leaving their access to be
  inferred, and **`sitemap.xml`** lists all 79 public URLs with `lastmod` taken from the wiki sync.
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

Zero-config on Vercel: framework detection handles the build, and there is deliberately no
`vercel.json`. Redirects, rewrites, headers and image settings all live in `next.config.ts`, which
means `npm start` exercises the same rules that run in production — a `vercel.json` would silently
override them and only diverge once deployed.

`references/` and `attachments/` are design source material. They stay in version control and are
excluded from deployments through `.vercelignore`.

## Licence

See the platform repository. The brand assets under `public/brand/` are OPEN//77 marks; the
`/brand` page states what may be done with them.
