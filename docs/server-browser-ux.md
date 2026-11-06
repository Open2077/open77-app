# Server browser

The website directory shares the launcher's presentation: dark panels, yellow
actions, compact featured communities, formatted server names, and a bottom
drawer with community links and player activity. Components and CSS modules live
in `src/components/servers/`; the shared site header stays visible and usable.

## Browsing

- The command bar contains search, game modes, sorting, refresh and freshness.
  The filter rail adds favorites, language, country, region, availability and
  tags. It collapses on desktop and opens as a drawer on smaller screens.
- Featured servers precede community servers. The selected sort applies within
  each group **and** to the featured cards. Most players is the default;
  featured order only breaks ties. Featured and regular rows share the same
  subtle dividers, with no purple separator between groups.
- Desktop rows are 64px tall with 38px icons, a little larger than the FiveM
  directory at 1080p and above (60px rows, 30px icons, 15px names). Each row
  has two lines: the name (16px bold) with its badges, then the description
  (13px), which uses all remaining width before the player count, truncates
  when necessary and exposes the complete text on hover.
  Player counts, recorded peaks, region flags and favorites stay aligned.
  There is no per-row Connect button: click a row to open its details and join.
  Narrow layouts hide descriptions, then badges as space decreases; full
  information remains available in the drawer.
- Featured rows use a subdued banner fading to transparent. Compact cards scroll
  away with the list; on phones they scroll horizontally rather than consuming
  multiple rows above the directory. View all expands the featured selection.
- Purple **FEATURED**, green **OFFICIAL** and yellow **WITH MODS** chips come
  from the master's flags and required-mod list. A server name or arbitrary tag
  cannot grant one of these badges. Featured chips have a restrained shine,
  disabled for reduced-motion preferences.
- Featured rows show the highest **recorded** population in the last 48 hours
  below the current player count. Missing history displays a dash, not zero.
- Names and detail descriptions use the same `$rgb`, `$o`, `$i`, `$n`, `$w`, `$t`, `$s`,
  `$g`, `$z` and `$$` formatting as the launcher. Unknown codes remain literal.
  Rendering uses text nodes and styled spans, never HTML. Search, sorting,
  accessible labels and public link previews use the readable plain text.
  List descriptions strip those codes, preserve the original letter case and
  use a consistent muted style. Empty descriptions leave no placeholder.

Filters and sorting live in the URL; the collapsed rail preference and favorites
stay in local storage. Near you uses browser language preferences to rank
country, language and region; the site does not invent ping measurements.

## Server details

A row or card opens a wide bottom drawer with banner, icon, formatted title,
tags, population, Join, favorite, description, visible Discord/website links,
locale and activity. The drawer casts a shadow above the directory and leaves
the site's navigation usable. Background controls are inert. Escape, the
backdrop or the close button dismiss it; the close button remains reachable
while scrolling. Focus returns to the previous control, and reduced motion
disables its entrance animation.

Full profile opens the shareable `/servers/{id}` view with player roster,
connection address and technical information. It includes the same formatting,
badges, community links and chart. Native History API navigation retains the
mounted directory, filters and scroll. Back restores them. Direct profile links
are generated on first visit with real title, description, image, canonical and
breadcrumbs; ISR caches them and refreshes every five minutes. Builds do not
request every individual profile, avoiding a burst against the public API rate
limit. The sitemap still lists the full catalog. Unknown/offline profiles remain noindex.

The keyboard supports `/` to search, arrows to select, Enter to join and Escape
to dismiss. The graph handles its own arrow keys, Home and End to read actual
observations without triggering directory shortcuts.

## Player activity and request budget

`GET /api/v1/servers/{id}/player-history?hours=24|48` supplies ten-minute
observations; 48 hours is selected initially. The browser validates identity,
period, bounds, ordering, sample limits and nonnegative integer counts.

The chart fits the available readings to its entire width, draws one continuous
line and gradient across missing intervals, and shows a centred point for a
single observation. Its caption explains that intervening values are not
measured. Peak and average use actual observations only. Zero is a real sample;
missing readings never become zero. Dates use local time, and the coverage
label distinguishes partial history from a complete window.

Visible featured peaks and profiles share a bounded, in-memory 60-second cache
and deduplicated request queue with at most two requests in flight. Peaks are
loaded only when visible. Background tabs pause refresh; HTTP 429 applies a
shared cooldown honoring Retry-After. Transient errors retain the last history
with a notice; 404 clears old history. Empty, loading and unavailable states are
explicit. Demo data never requests activity.

The public directory fetches all pages of 100 records, deduplicates by ID and
rejects pagination that makes no progress. Its 30-second refresh retains the
previous successful list on failure. Join still uses
`open77://connect?server=…`; account and launch handling are unchanged.

## Local review

The development master defaults to `http://127.0.0.1:8090`. Configure
`NEXT_PUBLIC_OP77_MASTER_URL` for another master with an allowed CORS origin.
Production defaults to `https://master.open2077.net`.

```sh
npm run dev -- --hostname 127.0.0.1 --port 3151
npm run check
npm run test:servers
npm run verify:servers:browser -- http://127.0.0.1:3151
npm run build
```

The browser check uses Playwright (`OP77_PLAYWRIGHT` may point to an existing
installation) and headless Edge, intercepts public reads with fixtures and never
joins a server. It checks pagination, formatting and search, flag trust,
featured sorting, cached peaks, continuous/partial/single/zero/missing history,
keyboard interactions, header access, mobile layout, and profile navigation.
Screenshots are written under ignored `artifacts/server-directory/`.

`/servers?preview=1` on localhost remains available for a demo without a master.
Connections and full-profile navigation are disabled there. Production always
uses the live directory. `scripts/check-server-images.mjs` separately covers
image decoding before hydration on public profiles.
