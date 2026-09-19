# Server browser

The server browser follows the landing page's visual system: a `#050e16` night
background, `#08dfec` cyan accents, blue panels and rounded
controls, Saira body text, Rajdhani headings and mono data labels.
`src/styles/server-directory.css` owns the styles scoped to the directory.

## The directory is a full-window application

`/servers` fills the entire viewport below the shared glass header, edge to edge,
without an introductory section or outer gutters. Only its internal panes scroll.
The workspace has four parts:

- **Command bar** — search (`/` focuses it), the game-type segmented control with
  live counts, a language filter, sort, the freshness readout and Refresh. The status dot on Refresh
  is green, cyan while updating and amber when the last refresh failed.
- **Filter rail** — All servers / Favorites, game type, region, language,
  country, availability and the most common tags. Collapsible on desktop and
  remembered per browser; a drawer on narrow screens.
- **List** — 64px desktop rows, with two-line 96px rows on mobile: icon, name (shareable link to the profile) and description, game
  type and tags as clickable filters, flag and `US · EN` locale, cyan player count
  with a capacity bar (amber when full), favorite, and a quiet Connect that lights
  up on hover or selection. Only the list and the rail scroll.
- **Inspector** — the launcher's detail pane. Idle with "Select a world" until a
  row is selected with a click or the keyboard, then cover, description, capacity, locale facts, tags,
  community links, Connect, favorite and the link to the full page. Nothing is
  selected on the player's behalf. Below 1200px it is an overlay that appears
  only for a selected server.

**Near you.** The default sort is "Near you": the browser's language
preferences (`navigator.languages`, no permission, no geolocation service) give
the player's country, language and region bucket, and servers rank by same
country, then same language, then same region, then population. Same-country
rows light their locale cell cyan, the inspector shows a "Near you" mark, and the
rail offers one-click "My country" / "My language" filters. The directory
carries no latency, so locale stands in for ping; nothing is filtered out by
default.

Keyboard: ↑/↓ walk the list, Enter connects, Escape clears the selection or
closes the filter drawer. Filters, sort and search live in the URL so links,
reload and Back restore the same view; result scroll is restored when returning
from a profile. A single click on a row or its name selects the server and shows
its inspector; clicking the selected row again keeps it selected. Double-clicking
the row/name or choosing **View details** in the inspector replaces the directory
interior with the redesigned profile, retaining the full-window frame. Row actions
(favorites, tags and Connect) do not open the profile on double-click. Native History API
updates the shareable `/servers/{id}` URL without a route reload. The mounted
list retains filters and scroll; Back to server list and browser Back/Forward
restore it. Directory data renders immediately while the detail request fills
in the roster. Direct profile links use the same workspace. Public profiles are prerendered
with their real name, description, banner (or icon), canonical and breadcrumb
markup. They are indexable in production and included in the sitemap. Static
profiles and the sitemap revalidate every five minutes; new IDs generate on
first visit. Unknown/offline IDs remain noindex. The browser fetches fresh
players/status after hydration, using a serialized snapshot clock to avoid
hydration mismatches on cached pages. Temporary API failures preserve a previous
successful ISR profile. Offline builds defer profiles to on-demand generation.

The list stays mounted across the 30-second background
refresh, and a failed refresh keeps the last results. Connect still uses the
`open77://connect?server=…` handoff; nothing about accounts or launching changed.

## Local review

The master's CORS only allows the production origin, so a local `next dev` cannot
read the live directory directly. Point `NEXT_PUBLIC_MASTER_URL` at a local
master, or run a loopback relay that forwards `GET /api/v1/servers…` to
`https://master.open2077.net` on `127.0.0.1:8090` (the development default).

```sh
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Then open `http://127.0.0.1:3100/servers`.

For a local visual review with one illustrative server, open
`/servers?preview=1` on localhost. The preview displays a demo-data notice,
opens the inspector from the server name, and disables launcher handoff and
full-detail navigation. Production hosts always use the live directory.

Browser regression checks (synthetic read-only API fixtures):

```sh
node scripts/check-server-workspaces.mjs http://localhost:3113
```

This covers in-place navigation, history, filter/scroll retention, responsive
profiles, error recovery and the account creations/key workspaces.

Image hydration regression check:

```sh
node scripts/check-server-images.mjs http://localhost:3113
```

This delays JavaScript until both public profile images have decoded, then
checks actual visibility after hydration and a warm reload. It guards the
pre-rendered image case where the load event precedes React handler attachment.
