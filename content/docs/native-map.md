# Native map and player waypoints

`Open77.map` is a **client-side** API for the native world map: read player waypoints, pick destinations, control the map camera and add resource-owned WebUI tabs. Pair it with [vehicle AI](vehicle-ai.md) to use a waypoint as an autonomous driving destination.

The original waypoint and point-picker APIs require client **2.31.13+op77.54** or later. The standalone screen, view controls and custom tabs are **experimental** and require a compatible client exposing these additions. Do not use the original minimum version as a compatibility check for the newer functions. Map customization is local to each client; it does not change server state.

```lua
permissions { "map.read", "map.control", "network.events" }
```

`map.read` permits snapshots and observation events. `map.control` permits screen customization, tabs, opening and camera control. `network.events` is needed only for examples that send a destination to the server.

## Standalone map

Open **Pause → City map**, use the player's normal map binding, or call `Open77.map.open()`. The native map is framed with margins and a blurred backdrop. Only a **Map** tab appears by default; resources can add tabs without replacing the native header.

Drag to pan, use the wheel to zoom and the native track-waypoint action (right-click by default) to place or remove a destination. Escape returns to gameplay. Opening the screen does not pause multiplayer simulation or grant invulnerability. It does not open the solo character hub.

Only a native map-ray hit or a selectable marker can provide a destination. Clicking the header, margins or empty geometry does not reuse an old hit as a new waypoint. Resource blips are separate from the player's manual destination.

## Customize the map screen

Call customization functions after resource preparation, for example inside `onClientResourceStart`. Calling them during script preparation returns `nil, "resource_preparing"`. Check support before using them on clients with different feature sets:

```lua
if not Open77.map or type(Open77.map.addTab) ~= 'function' then
    print('This menu requires a client with native map tabs.')
    return
end
```

| Function | Result | Behavior |
|---|---|---|
| `setTitle(text)` | `true` or `nil, reason` | Change the upper-left title. |
| `setAccentColor("#RRGGBB")` | `true` or `nil, reason` | Change the selected tab accent. |
| `resetAppearance()` | `true` or `nil, reason` | Release this resource's title and accent overrides, keeping its tabs. |
| `addTab({id, label, url?, page?, order?})` | `qualifiedId, page` or `nil, reason` | Add a tab using a resource-local file or an existing owned WebUI page. |
| `removeTab(id)` | `true` or `nil, reason` | Remove an owned tab; its page remains hidden, not destroyed. |
| `selectTab(id)` | `true` or `nil, reason` | Select an owned tab or `"map"` on an already-open screen, on the next tick. |
| `setTabLabel(id, label)` | `true` or `nil, reason` | Rename an owned tab without reloading its page. |
| `getScreen()` | `screen` or `nil, reason` | Read appearance and tabs, even while closed; requires `map.read`. |

All seven mutations require `map.control`. A successful `selectTab` acknowledges the request, not completed activation; observe the events below. It does not open the map. Point-picker sessions stay on Map and reject switches with `map_picking`.

### Titles, colors and ownership

Titles contain 1–120 UTF-8 bytes; labels contain 1–40 UTF-8 bytes. Neither accepts control characters or a pipe (`|`). Accent colors must be exactly `#RRGGBB`. The accent changes the selected native tab, not roads or markers; resource pages receive it in events and apply it through their own CSS.

Title and accent have separate resource-owned overrides. The latest setter wins. `resetAppearance()` or resource stop restores the preceding resource's override, or the defaults: `OPEN//77  /  NIGHT CITY` and `#22D8E2`. Updates take effect while the screen is open.

Tab IDs contain 1–48 ASCII letters, digits, underscores or hyphens. `map` is reserved. A returned ID is qualified as `resource_name:localId`; mutations accept either the caller's local ID or its qualified ID. A resource cannot select, rename or remove another resource's tab. Map always comes first and cannot be removed, replaced or renamed.

There are at most **five resource tabs in total, plus Map**. `order` is an integer from -1000 to 1000, default 0. Custom tabs sort by order, then qualified ID.

### Add a resource page

Supply exactly one of `url` or `page`:

- `url` is a file declared in the calling resource's `web_files`, not an HTTP URL, a `file://` path or another resource's origin. It creates a hidden, opaque menu-layer page with a reference size of 1280×572.
- `page` is an existing, current-generation WebUI page owned by the caller. It must be hidden, unfocused and unbound, without custom `drawBounds`, world-screen or HUD-suppression mode. Its existing origin, CSP, permissions and browser policy still apply. Use this form when you need custom page creation settings.

The selected WebUI replaces only the map content rectangle. It is an isolated resource surface, not an iframe sharing another resource's bridge. Native map input cannot operate underneath it.

This example registers a Jobs tab and sends its initial state from Lua:

```lua
-- open77.lua
resource 'city_menu'
version '1.0.0'
client_scripts { 'client.lua' }
web_files { 'web/**' }
permissions { 'map.read', 'map.control' }
```

```lua
-- client.lua
local jobsTab, jobsPage

local function sendJobsState()
    if jobsPage then
        jobsPage:emit('jobs:state', { message = 'Choose a job from your resource.' })
    end
end

AddEventHandler('onClientResourceStart', function()
    if not Open77.map or type(Open77.map.addTab) ~= 'function' then
        print('This menu requires a client with native map tabs.')
        return
    end
    assert(Open77.map.setTitle('NIGHT CITY ROLEPLAY'))
    assert(Open77.map.setAccentColor('#FFB347'))
    jobsTab, jobsPage = Open77.map.addTab({
        id = 'jobs', label = 'Jobs', url = 'web/jobs.html', order = 10
    })
    if not jobsTab then
        print('Map tab unavailable: ' .. tostring(jobsPage))
        jobsPage = nil
        Open77.map.resetAppearance()
        return
    end
    jobsPage:on('jobs:refresh', sendJobsState)
end)

AddEventHandler('open77:map:tabEntered', function(event)
    if event.id == jobsTab then sendJobsState() end
end)

AddEventHandler('open77:map:tabLeft', function(event)
    if event.id == jobsTab then print('Jobs tab left: ' .. event.reason) end
end)
```

```html
<!-- web/jobs.html -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Jobs</title>
  <link rel="stylesheet" href="jobs.css">
  <script src="jobs.js" defer></script>
</head>
<body>
  <h1>Jobs</h1>
  <p id="status">Loading…</p>
</body>
</html>
```

```css
/* web/jobs.css */
:root { --accent: #22d8e2; color-scheme: dark; }
body { margin: 0; padding: 2rem; background: #101820; color: #fff; }
h1 { color: var(--accent); }
```

```js
// web/jobs.js
let polling;
function stopPolling() {
    clearInterval(polling);
    polling = undefined;
}
function refresh() { Open77.emit('jobs:refresh', {}); }
function applyTheme(screen) {
    document.documentElement.style.setProperty('--accent', screen.accentColor);
}
Open77.on('jobs:state', data => {
    document.getElementById('status').textContent = data.message;
});
Open77.on('open77:map:tabState', event => {
    applyTheme(event.screen);
    stopPolling();
    if (event.active) {
        refresh();
        polling = setInterval(refresh, 10000);
    }
    // Pause resource-owned audio here when event.active is false.
});
Open77.on('open77:map:screenChanged', applyTheme);
// Register listeners first, then request the current state, including on reload.
Open77.emit('open77:map:ready', {});
```

The ready handshake prevents losing initial state if selection happens before the page finishes loading. It is handled by the host; no Lua handler for `open77:map:ready` is needed. Treat `tabState` idempotently: both selection and the ready reply may report the same active state. Validate actual job selection and rewards on the server; receiving a browser event is not authorization.

### Tab lifecycle and events

| Receiver | Event | Payload |
|---|---|---|
| Owning Lua resource (`map.control`) | `open77:map:tabEntered`, `open77:map:tabLeft` | `{id, localId, active, reason, screen}` |
| Lua resources with `map.read` | `open77:map:tabChanged` | `{previous, id, reason}` |
| Owning Lua resource | `open77:map:tabRemoved` | `{id, reason="page_unavailable"}` |
| Registered page JavaScript | `open77:map:tabState` | `{id, localId, active, reason, screen}` |
| Registered page JavaScript | `open77:map:screenChanged` | `screen` |

Reasons include `selected`, `closed`, `removed`, `resource_stopped`, `page_unavailable` and `ready` (the JavaScript handshake). Entry means the tab was selected, not that asynchronous page work finished. `tabRemoved` reports an unavailable page; it is not a general acknowledgement of every explicit `removeTab` call.

`screen` contains `{title, accentColor, open, activeTab, revision, tabs}`. The built-in tab is `{id="map", label="Map", type="native"}`; resource entries contain `{id, label, resource, type="webui"}`. Use `getScreen()` for a fresh snapshot.

While bound, the map screen owns visibility, focus and content bounds. **Do not call `page:show()`, `page:hide()` or `page:setFocus()`**; they return false for bound pages. Use `selectTab()` and `removeTab()` instead. Normal page events, callbacks and messages continue to work. See [the WebUI bridge](resource-runtime.md#webui).

Pages retain their DOM and state between visits. Hiding a tab does not stop its timers or audio; stop that work on inactive `tabState`. Escape closes the whole screen and returns input to gameplay, even without a page-specific Escape handler.

Removing an active tab returns to Map. `removeTab` leaves its page hidden and available for reuse; call `page:destroy()` when it is no longer needed. Resource stop removes tabs, destroys its pages and releases appearance overrides. If that resource also owns the map session through `open` or `pickPoint`, stopping it releases that session too. Destroying a registered page, or a page becoming unavailable, removes its tab and returns to Map when necessary. Disconnect closes the screen.

### Tab errors

| Error | Action |
|---|---|
| `resource_preparing` | Register or mutate tabs after resource preparation. |
| `permission_denied:map.control` / `permission_denied:map.read` | Declare the required capability. |
| `invalid_tab`, `invalid_tab_id`, `invalid_label`, `invalid_title`, `invalid_accent`, `invalid_order` | Check the ID, text, hex-color and ordering limits. |
| `duplicate_tab`, `tab_limit` | Reuse/remove an existing tab or reduce the number registered. |
| `specify_page_or_url`, `invalid_resource_url`, `undeclared_entry` | Supply one supported source and declare local web files. |
| `stale_or_unowned_page`, `page_must_be_hidden_and_unbound` | Use a current, owned page that meets the binding requirements. |
| `tab_not_found`, `not_owner` | Use an existing tab owned by the caller, or `map` for selection. |
| `map_closed`, `map_picking` | Select only when the screen is open and no picker is active. |

WebUI creation can also return its normal source, permission and quota errors. See the [API reference](/docs/api/client/open77-map) for signatures and return values.

## View controls

`open()` and `pickPoint()` reserve a map session for their resource. Wait for `open77:map:viewChanged` with `ready=true`, or inspect `getView().ready`, before controlling its camera. Camera mutations require `map.control` and ownership of an open, ready map. Unlike tab registration and tab selection, camera control cannot take over a user-opened or another resource's map.

| Function | Result | Behavior |
|---|---|---|
| `getView()` | `view` or `nil, reason` | Read `{ready, zoomLevel, zoomLevels, zoom, cameraMode}` with `map.read`. |
| `focus({x,y,z})` | request ID or `nil, reason` | Move the map camera, not the player. |
| `recenter()` | request ID or `nil, reason` | Center the map on the local player. |
| `setZoomLevel(level)` | request ID or `nil, reason` | Select an integer level from `0` to `zoomLevels - 1`. |
| `setCameraMode(mode)` | request ID or `nil, reason` | Select `"top_down"` or `"perspective"`. |

Coordinates must be finite and within ±16,000 on each axis. `zoomLevels` comes from the installed game. `zoom` is a native scalar, not a distance in meters. `state().view` contains the view snapshot and `state().renderer` is `"native_ink"`.

```lua
local configureView = false
AddEventHandler('open77:map:viewChanged', function(view)
    if not configureView or not view.ready then return end
    configureView = false -- prevent a loop when the camera mode changes
    local request, reason = Open77.map.setCameraMode('perspective')
    if not request then print(reason) end
end)
local request, reason = Open77.map.open({position = {x=600, y=-2200, z=180}})
configureView = request ~= nil
if not request then print(reason) end
```

The requesting resource receives `open77:map:commandResult` with `{requestId, status}`. Status is `applied`, `map_not_ready` or `invalid_zoom_level`; `applied` means the native call ran, not that an animated camera transition finished. `open77:map:viewChanged` broadcasts readiness, discrete zoom and camera-mode changes to resources with `map.read`.

Immediate failures include `map_unavailable`, `map_closed`, `not_owner`, `map_not_ready`, `invalid_position`, `invalid_zoom_level`, `invalid_camera_mode`, `map_queue_full` and permission errors. At most 16 view commands can wait. Do not enqueue camera changes every frame. Closing or releasing the map discards pending commands.

## Resource blips and GPS

The existing [blip APIs](blips.md) create and update resource markers, labels, tracking and GPS. They require `ui.vanilla.map`, independently of map-session ownership. `Open77.blips.setWaypoint(position)` sets a scripted destination; `Open77.blips.waypoint()` reads tracked navigation and `Open77.blips.clearWaypoint()` clears it. In contrast, `Open77.map.getWaypoint()` reads only the player's manual waypoint, not a tracked resource blip, quest or POI.

## Read a destination

```lua
local waypoint, reason = Open77.map.getWaypoint()
if reason then print(reason); return end
if waypoint then
    print(waypoint.position.x, waypoint.position.y, waypoint.position.z)
    -- id is a STRING; kind="waypoint", source="player"
end
```

No waypoint returns `nil` without an error. Missing/stale world data returns
`nil, "map_unavailable"`. Reading never changes a quest or moves the player.

`getSelectedMarker()` reads the highlighted map marker, not the navigation
destination. Its kind is `waypoint`, `quest`, `poi`, `resource` or `unknown`.
`isOpen()` returns a boolean, or `nil, reason`. `state()` returns `open`,
`picking`, `waypoint`, `selectedMarker`, `revision` and `sampleAgeMs`.

## Events

```lua
AddEventHandler("open77:map:waypointChanged", function(change)
    print(change.action) -- placed, moved or removed
    local point = change.waypoint and change.waypoint.position
    -- change.previous contains the old marker.
end)
```

Individual events `open77:map:waypoint:placed`, `:moved` and `:removed` carry
the same table. Engine ID churn at identical coordinates is not movement.
Read a snapshot on startup: historical placement events are not synthesized.
Changes use the script-bridge polling cadence, not frame-perfect input timestamps.
Tracking a quest/POI instead clears the current manual destination from this API.

Other read events:

| Event | Payload |
|---|---|
| `open77:map:opened` | `{open=true}` |
| `open77:map:closed` | `{open=false}` |
| `open77:map:markerSelected` | `{marker=markerOrNil}` |

## Native point picking without travel

```lua
local requestId, reason = Open77.map.pickPoint({
    position = {x=-2140, y=-600, z=8}, -- optional focus
    timeoutMilliseconds = 60000,     -- 1000..300000
})
if not requestId then print(reason) end

AddEventHandler("open77:map:pointPicked", function(result)
    if result.requestId ~= requestId then return end
    if result.status == "selected" then
        print(json.encode(result.position))
    end
end)
```

Use the vanilla **place/track waypoint** action to select a world point or marker.
The map then closes. Fast travel, native taxi confirmation and Open77 admin
double-click teleport are suppressed during picking. An empty-map selection
may become the vanilla waypoint; existing navigation is not guaranteed preserved.

Only the requester receives `pointPicked`, containing `requestId`, `status`,
`position` and `marker`. Status is `selected`, `cancelled`, `timeout` or
`ui_unavailable`; non-selection results have no position. Escape cancels.
`cancelPick()` and `close()` return `true` or `false, reason` and request
asynchronous closure. They cannot close another resource's or a user-opened map.

`open(options)` opens/focuses the map without picker mode. Both opening APIs
return an accepted request ID, not proof that the UI opened. Observe `opened`
or `open77:map:requestFailed` (`requestId`, `reason`). Native UI restrictions
remain enforced; conflicts return `map_busy`. Resource shutdown releases ownership
without delivering an old completion to the resource's new instance.

## Taxi destination sharing

```lua
-- Passenger client: call after an explicit "share destination" action.
local waypoint = Open77.map.getWaypoint()
if waypoint then
    TriggerServerEvent("myTaxi:destination", waypoint.position)
end
```

On the server, validate finite/bounded coordinates, rate-limit requests and verify
that `source` is the taxi's passenger. Do not trust a supplied driver ID,
bucket or fare. Forward the validated point to the authorized driver and use
the [blip/GPS API](blips.md), or [vehicle AI](vehicle-ai.md) `driveTo`.

## Distance and routing limits

There is no verified arbitrary road-route distance API yet. Straight-line
distance is not a taxi route/fare. Native map travel distance and AutoDrive's
current-path length have different contexts; neither is exposed as a substitute.
A selected world point also need not be drivable (roofs, water, interiors).
