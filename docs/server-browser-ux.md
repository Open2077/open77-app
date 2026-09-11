# Server browser

The server browser follows the launcher's desktop kit (`launcher/docs/desktop-design.md`,
`launcher-native.css`): near-black panels, cyan actions, hairlines, cut corners,
Chakra Petch controls, mono labels, quiet motion. `src/styles/server-directory.css`
owns it and is scoped to `/servers`; the rest of the site keeps its own design.

## The directory is a full-window application

`/servers` fills the viewport below the header, at FiveM density, with four parts:

- **Command bar** — search (`/` focuses it), the game-type segmented control with
  live counts, sort, the freshness readout and Refresh. The status dot on Refresh
  is green, cyan while updating and amber when the last refresh failed.
- **Filter rail** — All servers / Favorites, game type, region, language,
  country, availability and the most common tags. Collapsible on desktop and
  remembered per browser; a drawer on narrow screens.
- **List** — 40px rows (FiveM density, first row about 126px from the top of the window): icon, name (link to the full page) and description, game
  type and tags as clickable filters, flag and `US · EN` locale, cyan player count
  with a capacity bar (amber when full), favorite, and a quiet Connect that lights
  up on hover or selection. Only the list and the rail scroll.
- **Inspector** — the launcher's detail pane. Idle with "Select a world" until a
  row is clicked, then cover, description, capacity, locale facts, tags,
  community links, Connect, favorite and the link to the full page. Nothing is
  selected on the player's behalf. Below 1200px it is an overlay that appears
  only for a selected server.

Keyboard: ↑/↓ walk the list, Enter connects, Escape clears the selection or
closes the filter drawer. Filters, sort and search live in the URL so links,
reload and Back restore the same view; result scroll is restored when returning
from a detail page. The list stays mounted across the 30-second background
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
