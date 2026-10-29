# 3D city map, minimap and GPS

`op77_map3d` replaces the game's map and HUD minimap with a 3D map of Night City drawn in a WebUI page. It is built from the game's own 3D map assets and traffic network, and every part of it is an API: blips, waypoint, GPS route, theme, minimap layout and map jamming can be driven from client and server Lua.

**Platform resource · client and server.** From the next server release, `op77_map3d` is included in the server package next to freeroam, and freeroam themes it and mirrors its destinations onto it. Without it, freeroam keeps the game's own map.

## What players get

- **The city in 3D**: terrain, water, roads, metro, landmarks and the building volumes of every district, Dogtown and the spaceport included, drawn with flat, theme-driven colors.
- **An orbit view**: drag to pan, right-drag (or Ctrl+drag) to rotate and tilt, the wheel zooms toward the cursor. A 2D/3D toggle, north-up and recenter buttons sit beside the map.
- **Search**: the box over the legend finds blips by name, description, category or district, and district names. Arrow keys and Enter, or a click, fly the camera there and open the card.
- **A minimap**: the same city around the player, heading-up or north-up, tilted, zooming out with speed. Important blips are pinned to its edge.
- **GPS**: routes on the game's traffic network (one-way aware, speed-weighted), an animated ribbon on the map and minimap, a next-maneuver banner, remaining distance and arrival time, automatic rerouting and an arrival event.
- **A holographic GPS**: a small route overlay at the bottom of the view while a route runs and the map is closed. Players can switch it off from the map legend.
- **Other players** near you, as blips.

The waypoint is shared with the game's own: a waypoint set by another resource through [`Open77.blips`](blips.md#the-players-waypoint) becomes this map's destination, and the reverse.

### Controls

| Action | Default |
| --- | --- |
| Open or close the map | `M` (rebindable as **City map (3D)**), or Pause → **CITY MAP** |
| Close | `Esc` or `M` |
| Set a waypoint | Double-click on the map |
| Pan, rotate, tilt | Drag, right-drag or Ctrl+drag; `WASD` or arrows, `Q`/`E` rotate, `R`/`F` tilt |
| Zoom | Wheel, `+`/`-` |
| Recenter, north-up | `Space`, `N` |
| Route to the selected place, clear the route | `G`, `Delete` (or **Clear route**) |
| Search | `/` |
| Zoom the minimap (held) | Numpad `+` / `-` (rebindable); `PAGEUP` / `PAGEDOWN` on older clients |

## Requirements

- The Unstable client line, **2.50.0-unstable+op77.164** or later.
- Numpad minimap zoom keys need client **2.50.0-unstable+op77.167** or later. Older clients refuse the numpad names, and the resource registers `PAGEUP` / `PAGEDOWN` instead under the ids `op77_map3d.zoomIn.fallback` and `op77_map3d.zoomOut.fallback`, so a player's numpad binding is kept for later.
- Opening this map from Pause → **CITY MAP** needs client **2.50.0-unstable+op77.166** or later. See [Custom city maps](map-providers.md).
- Players download the page and its map data with the resource, about 11 MB. Nothing else is installed on their side.

## Install

From the next server release, the server package includes `op77_map3d`, and the freeroam `server.jsonc` load list starts it right after `freeroam`. Nothing else is needed: keep `op77_map3d` in `resources.load` to use the map, or remove it to keep the game's own map.

Server packages released before it, up to and including **2.50.0-unstable+op77.164**, do not include `op77_map3d`. On such a package:

1. Copy the `op77_map3d` folder into your server's `resources/` directory. Any category folder works, for example `resources/standalone/op77_map3d`.
2. Add `op77_map3d` to `resources.load` in `server.jsonc`, after your gamemode:

```jsonc
"resources": {
  "load": [
    "open77_shell", "open77_pause",
    // ...
    "freeroam",
    "op77_map3d"
  ]
}
```

3. Restart the server. The resource declares `reload_policy "reconnect"`: restarting it later makes connected clients reconnect, because the client owns WebUI surfaces that a live reload would leave stale.

Keep the folder name `op77_map3d`. The page loads its data from `open77://op77_map3d/web/data/...`; after a rename, set `window.MAP3D_RESOURCE` in `web/index.html` to the new name, and update every `exports.op77_map3d` call.

### Permissions

The manifest declares everything it uses; there is nothing to grant:

| Permission | Used for |
| --- | --- |
| `network.events` | Server blips, jams, waypoints and map requests |
| `input.actions` | Blocking the game's map key while this map runs |
| `ui.vanilla.hud` | Hiding the vanilla minimap |
| `ui.vanilla.map` | Mirroring the waypoint through `Open77.blips` |
| `players.read` | Showing other players near you |
| `vehicles.read` | Pointing the player arrow along the vehicle's nose |

While it runs, the resource blocks the game's map key and hides the vanilla minimap; both come back when it stops.

## Configuration

Edit `shared/config.lua`. Keys outside `page` are client behavior; everything under `page` is sent to the map page and deep-merged over its defaults (`ui/src/config.ts` lists every key).

| Key | Default | Meaning |
| --- | --- | --- |
| `key` | `{ id = "op77_map3d.open", name = "City map (3D)", key = "M" }` | The key mapping that opens the map. |
| `zoomKeys` | `NUMPADPLUS` / `NUMPADMINUS`, `fallback` `PAGEUP` / `PAGEDOWN` | Held keys that zoom the minimap. The level is remembered. |
| `replaceNativeMap` | `true` | Block the game's map key and menu while the resource runs. |
| `pauseMenuMap` | `true` | Register as the pause menu's CITY MAP. |
| `pauseMenuPriority` | `100` | Priority against other [map providers](map-providers.md); the highest wins. |
| `hideNativeMinimap` | `true` | Hide the vanilla HUD minimap. |
| `mirrorNativeWaypoint` | `true` | Share the waypoint with the game's, both ways. |
| `debug` | `false` | Print open/close, waypoint changes (with their origin) and page keys to the client log. |
| `playerRate` | `30` | Player position updates per second sent to the page. |
| `fps` | `{ minimap = 60, map = 60, holo = 30 }` | Frame rates of the three WebUI surfaces, 60 at most. |
| `zIndex` | `{ minimap = 700, holo = 699, map = 781 }` | Surface order. Keep the minimap and holo GPS under your gamemode's interfaces and the open map above them. |
| `hideUnderMenus` | `true` | Hide the minimap and holo GPS while another interface holds the cursor (inventory, menus, phone). |
| `closeAnimationMs` | `260` | How long the open map's surface stays up for its closing animation. `0` hides it at once. |
| `nearbyPlayers` | `{ enabled = true, radius = 350, interval = 1.0, color = "#3FE0D0" }` | Other players as blips in the `player` category. |
| `page` | | Theme, minimap, map view, GPS, legend and texts (below). |

### Page settings

| Group | Keys |
| --- | --- |
| `page.theme` | `background`, `terrain`, `terrainGrid`, `water`, `waterLine`, `road`, `roadEdge`, `metro`, `building`, `buildingTop`, `buildingEdge`, `landmark`, `accent`, `accentSoft`, `text`, `textDim`, `panel`, `danger` (CSS colors) and `fog` (`0` to `1`). |
| `page.minimap` | `enabled`, `anchor` (`top-right`, `top-left`, `bottom-right`, `bottom-left`), `size` (px), `margin` (`{ x, y }` px), `shape` (`chamfer`, `circle`, `square`), `tilt` and `vehicleTilt` (degrees from straight down), `vehicleFollow` (`camera` or `vehicle`), `rotate` (heading-up), `radius` and `vehicleRadius` (metres), `fps`, `supersample`, `xray` (metres of buildings cut away between the camera and you, `0` = off), `showRoute`, `showLabels`. |
| `page.map` | `initialDistance`, `minDistance`, `maxDistance`, `initialPitch`, `maxPitch`, `buildings`, `roadBorders`, `districtLabels`, `showCoordinates`, `doubleClickWaypoint`, `rightClickWaypoint`, `title`, `subtitle`, `resolution` (render scale), `idleFps` (redraws per second while only the route animates), `search`. |
| `page.gps` | `enabled`, `rerouteDistance` (metres), `rerouteDelay` (seconds), `arriveDistance`, `snapMainNetwork`, `avoidHighways`, `units` (`metric` or `imperial`), `routeWidth`, `animationSpeed`. |
| `page.holo` | `enabled`: set `false` to remove the holographic GPS. |
| `page.categories` | Legend rows: `{ id, label, icon, color? }`. A blip's `category` selects its row. |
| `page.locale` | Interface texts such as `setRoute`, `clearRoute`, `waypoint`, `arrived`, `noRoute`, `rerouting`. |

The default categories are `player`, `service`, `job`, `mission`, `vehicle`, `housing` and `default`.

## Theme the map from your gamemode

A gamemode does not need to edit `op77_map3d`: it can patch the page at runtime from a client script. Patches apply to the calling client, are kept for the run of `op77_map3d`, and are replayed when its pages reload. Send them again when `op77_map3d` restarts (`op77_map3d:ready`).

This is how freeroam gives the map its cyan look, a FREEROAM subtitle and its own legend:

```lua
local MAP = "op77_map3d"

local function running()
    local ok, state = pcall(GetResourceState, MAP)
    return ok and (state == "running" or state == "started")
end

local function applyTheme()
    if not running() then return end
    pcall(function()
        exports[MAP]:setConfig({
            theme = { accent = "#22d8e2", buildingEdge = "#22d8e2", roadEdge = "#22d8e2", terrainGrid = "#22d8e2" },
            map = { title = "NIGHT CITY", subtitle = "FREEROAM" },
            categories = {
                { id = "destination", label = "Destinations", icon = "flag", color = "#22d8e2" },
                { id = "spawn", label = "Spawn points", icon = "star", color = "#2be58b" },
                { id = "player", label = "Players", icon = "user", color = "#4ee6ee" },
                { id = "default", label = "Other", icon = "pin" },
            },
        })
    end)
end

AddEventHandler("op77_map3d:ready", applyTheme)
AddEventHandler("onClientResourceStart", function(name)
    if name == GetCurrentResourceName() then applyTheme() end
end)
```

Guard every call as above when the map is optional: an export call to a stopped resource raises an error.

In freeroam itself, the settings live in `FreeroamConfig.map3d` (`resources/gamemodes/freeroam/shared/config.lua`): `enabled`, `title`, `subtitle`, `theme`, `categories`, and `locationCategory` / `spawnCategory`, the legend rows used for its destinations and spawn points. Set `enabled = false` to leave the map untouched.

## Client API

Call the exports from any client resource:

```lua
local map = exports.op77_map3d

local id = map:addBlip({
    position = { x = -1188, y = 320, z = 20 },
    icon = "store",            -- built-in name, "<svg ...>" markup or an image URL
    color = "#FFCC00",
    label = "24/7 Store",
    description = "Snacks, water and phone credit.",
    category = "service",      -- a legend row (page.categories)
    scale = 1.0, pulse = false, edge = false,   -- edge: pinned to the minimap's border
    heading = nil,             -- game yaw: an arrow instead of an icon
    map = true, minimap = true, routable = true,
    id = "store-1",            -- optional stable id, namespaced to your resource
})
map:updateBlip(id, { label = "24/7 (open)", x = -1190 })
map:removeBlip(id)
map:clearBlips()               -- every blip of the calling resource
map:getBlip(id)

map:setWaypoint({ x = -747.8, y = 914.6, z = 30 })   -- starts the GPS
map:clearWaypoint()
map:getWaypoint()              -- { x, y, z } or nil
map:getRoute()                 -- the last route information, see below

map:open({ x = -2044, y = -2406 })   -- optional focus point
map:close(); map:toggle(); map:isOpen(); map:isReady()
map:focus({ x = 0, y = 0 }, 800)     -- fly the open map's camera there, 800 m away

map:setTheme({ accent = "#3FE0D0", buildingEdge = "#3FE0D0", roadEdge = "#3FE0D0" })
map:setConfig({ minimap = { anchor = "bottom-right", shape = "circle" } })
map:setMinimapVisible(false)
```

| Export | Returns | Notes |
| --- | --- | --- |
| `addBlip(def)` | id, or `nil, reason` | The id is `<resource>:<def.id>` with a stable `id`, otherwise `<resource>#<n>`. Adding the same stable id again replaces the blip. |
| `updateBlip(id, patch)` | `true`, or `false, reason` | Merges the given fields. `color = false` and `heading = false` remove them. Only the owning resource can update a blip. |
| `removeBlip(id)` / `clearBlips()` | `true` or `false` / count | Owner-scoped. |
| `getBlip(id)` | blip or `nil` | Reads client and server blips. |
| `setWaypoint(pos)` / `clearWaypoint()` | | Sets or clears the destination and the GPS route. |
| `getWaypoint()` / `getRoute()` | table or `nil` / table | |
| `open(focus?)`, `close()`, `toggle()` | | `focus` is `{ x, y }`. |
| `isOpen()` / `isReady()` | boolean | `isReady()` is true once a map page has answered. |
| `focus(pos, distance?)` | | Moves the open map's camera. |
| `setTheme(theme)` / `setConfig(patch)` | `true`, or `false` for a non-table | `setConfig` takes the `page` structure. A `minimap` patch that changes `enabled`, `anchor`, `size` or `margin` recreates the minimap surface. |
| `setMinimapVisible(visible)` | `true` | Shows or hides the minimap for this client. |

Blips belong to the resource that created them and disappear when it stops.

### Blip definition

| Field | Default | Limits |
| --- | --- | --- |
| `position` | required | `{ x, y, z? }`. `coords`, or `x` / `y` / `z` at the top level, are accepted too. `z` defaults to `0`. |
| `icon` | category icon | A built-in name, inline `<svg ...>` markup or an image URL the page can load; at most 16384 characters. |
| `color` | category color | `#RGB`, `#RRGGBB` or `#RRGGBBAA`. Other values are ignored. |
| `label`, `description` | | Truncated to 96 and 512 characters. `title` is accepted for `label`. |
| `category` | `"default"` | A legend row id, at most 48 characters. |
| `scale` | `1` | Clamped to `0.3`–`3`. |
| `priority` | `0` | Clamped to `0`–`2`. |
| `map`, `minimap` | `true` | Where the blip appears. |
| `edge` | `false` | Keep the blip pinned to the minimap's border when it is out of range. |
| `pulse` | `false` | Animate the blip. |
| `heading` | | Game yaw in degrees: an arrow instead of the icon. |
| `routable` | `true` | Offer a route to it from its card. |

Built-in icons: `pin`, `user`, `car`, `store`, `briefcase`, `target`, `home`, `flag`, `star`, `skull`, `shield`, `police`, `hospital`, `fuel`, `wrench`, `shirt`, `gun`, `phone`, `dollar`, `bed`, `food`, `info`, `warning`, `garage`, `crosshair`, `waypoint`, `bank`, `mission`, `bus`.

### Client events

| Event | Arguments |
| --- | --- |
| `op77_map3d:ready` | The map page is up: on start, and after `op77_map3d` restarts. Send your theme and blips again here. |
| `op77_map3d:opened` / `op77_map3d:closed` | |
| `op77_map3d:waypointChanged` | `pos` or `nil` |
| `op77_map3d:route` | Route information (below) |
| `op77_map3d:arrived` | `{ distance }`: how far from the waypoint the player arrived |
| `op77_map3d:blipClicked` | `id` |
| `op77_map3d:jammed` | `jammed`, `strength` |

When a route is computed, `op77_map3d:route` carries `{ active = true, length, seconds, computeMs }`. While the player follows it, the updates carry `{ active = true, remaining, next = { kind, distance } | nil, off }`, in metres; `next.kind` is a maneuver such as `straight`, `left`, `slight-right`, `uturn` or `arrive`. `{ active = false }` means no route. `getRoute()` returns the last of these tables.

### React to an arrival

```lua
local map = exports.op77_map3d

RegisterCommand("depot", function()
    map:setWaypoint({ x = -1188, y = 320, z = 20 })
end)

AddEventHandler("op77_map3d:arrived", function()
    TriggerServerEvent("courier:atDepot")
    map:clearWaypoint()
end)
```

The server must still check the player's position before it pays anything: the arrival event is a client observation.

## Server API

Server exports reach everyone, one player or a list of players. The target is `-1` (or `nil`) for everyone, a player id, or a list of player ids.

```lua
local map = exports.op77_map3d

local id = map:addBlip(-1, { id = "depot", position = { x = 1, y = 2 }, icon = "briefcase",
    label = "Courier depot", category = "job" })
map:addBlip(playerId, { position = { x = 10, y = 20 }, label = "Your car", icon = "car" })
map:addBlip({ 1, 4, 9 }, { position = { x = 30, y = 40 }, label = "Squad rally point" })
map:updateBlip(id, { label = "Depot (closed)" })
map:removeBlip(id)
map:clearBlips()

map:setWaypoint(playerId, { x = -747.8, y = 914.6, z = 30 })   -- or false to clear
map:openMap(playerId, { x = -2044, y = -2406 })
```

| Export | Returns | Notes |
| --- | --- | --- |
| `addBlip(target, def)` | id, or `nil, reason` | The id is `srv:<resource>:<def.id>` with a stable `id`. The same stable id again replaces and retargets the blip. |
| `updateBlip(id, patch)` | `true`, or `false, reason` | Owner-scoped. |
| `removeBlip(id)` / `clearBlips()` | `true` or `false` / count | Owner-scoped. |
| `setWaypoint(playerId, pos \| false)` | `true`, or `false` for an invalid player | |
| `openMap(playerId, focus?)` | `true`, or `false` for an invalid player | |
| `jam`, `addJamZone`, `unjam`, `removeJamZone`, `clearJams` | | See [Jamming](#jamming). |

Server blips are sent again to players who join later and to clients that restart the resource. A stopping resource takes its blips and jams along.

## Jamming

The map and minimap can drown in static: an unmapped place, a custom zone, a scrambler, a blindfold, a dead phone. `strength = 1` hides everything (map, blips, route and the holographic GPS) under a **NO SIGNAL** label; below `1` the map shows through the static. Several jams combine and the strongest wins. Jams belong to the resource that created them.

A jam is either **direct** (on while it exists) or a **zone**: a circle that is full strength inside `radius` and fades to nothing over `fade` metres outside it.

```lua
-- client
local map = exports.op77_map3d
local id = map:jam({ strength = 1, label = "SIGNAL LOST" })
map:unjam(id)

local zone = map:addJamZone({ position = { x = -2044, y = -2406 }, radius = 180,
    fade = 60, strength = 1, label = "NO MAP" })
map:removeJamZone(zone)
map:clearJams()               -- every jam of the calling resource
map:getJam()                  -- { strength, label } where the player stands
map:isJammed()
```

```lua
-- server: the same targets as blips
local map = exports.op77_map3d
map:jam(-1, { strength = 1, label = "BLACKOUT" })
map:addJamZone(-1, { id = "dogtown", position = { x = -2044, y = -2406 }, radius = 400 })
map:unjam(id); map:removeJamZone(id); map:clearJams()
```

| Field | Default | Limits |
| --- | --- | --- |
| `strength` | `1` | `0`–`1` |
| `label` | `page.locale.noSignal` (`NO SIGNAL`) | At most 48 characters. |
| `position`, `radius` | | A zone needs both; `radius` is clamped to `1`–`20000` metres. |
| `fade` | `60` | `0`–`5000` metres. |
| `id` | generated | A stable id replaces the previous jam with that id. |

`op77_map3d:jammed (jammed, strength)` fires on the client when the map becomes jammed or clear.

### Staff commands

Two restricted server commands jam players from the console or in game. They require the ACL rights `command.map3d.jam` and `command.map3d.unjam` (see [Commands & permissions](server-acl.md)); the dedicated console is always allowed.

```text
map3d.jam <playerId|-1> [strength 0..1] [label...]
map3d.unjam [playerId|-1]
```

`map3d.jam` replaces the previous command jam on the same target. `map3d.unjam` without an argument lifts every command jam.

## Pause menu CITY MAP

With `pauseMenuMap = true`, the resource registers as a [map provider](map-providers.md) with priority `pauseMenuPriority` (100 by default), so Pause → **CITY MAP** opens this map. It answers only once its page is ready; until then the menu falls back to the game's map. Set `pauseMenuMap = false` to leave the pause entry to the game's map or to another provider.

On a client older than 166, the pause menu cannot see the registration. Because `replaceNativeMap` also blocks the game's map, CITY MAP then reports that the map is unavailable; the `M` key still opens this map.

## Performance

The resource uses three WebUI surfaces, so the costly one only exists while it is needed:

- **minimap**: a surface cropped to its corner, redrawn at `fps.minimap` at most;
- **map**: a full-screen surface at `fps.map`, hidden while the map is closed;
- **holo**: the bottom overlay at `fps.holo`, shown only while a route runs.

Surface frame rates and order are fixed when a surface is created: change `fps` and `zIndex` in `shared/config.lua` and restart the resource. To lower the cost on slower machines, reduce `fps.minimap`, `page.minimap.fps`, `page.minimap.supersample` and `page.map.resolution`, lower `page.map.idleFps`, or disable `page.map.buildings`. `playerRate` and `nearbyPlayers.interval` control how often positions reach the page.

## Limitations

- Buildings are box volumes from the game's 3D map, not detailed meshes, and the map shows the city as the game's own map data describes it.
- GPS routes follow the game's vehicle lanes. They do not follow footpaths or interiors.
- The map data in `web/data` is generated from the game files by the tools in `tools/`. It is derived from Cyberpunk 2077 and only meant for use with the game.
- The in-game browser refuses WebAssembly and only fetches declared `open77://` resource files; the page is built for these limits. Rebuilding the page from `ui/` needs Node.js (`npm ci && npm run build`).

## Related guides

- [Custom city maps (map providers)](map-providers.md): how the pause menu's CITY MAP picks a map.
- [Blips and map pins](blips.md): the game's own blips and the shared player waypoint.
- [Native map and custom tabs](native-map.md): customize the game's map instead of replacing it.
- [Key mappings](keybindings.md): key names, including the numpad.
- [HUD visibility](hud-visibility.md): the vanilla minimap and other HUD parts.
