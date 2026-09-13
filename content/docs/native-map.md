# Native map and player waypoints

`Open77.map` is a **client** API for Cyberpunk's vanilla map. It distinguishes
the player's manual waypoint from tracked quests, POIs and Open77 resource blips.
Available in client **2.31.13+op77.54** (network protocol **1.24**).
For a taxi that drives to the selected destination, pair this client API with
[networked vehicle AI](vehicle-ai.md) on a server running **2.31.13+op77.54** or later.
Locally validated: waypoint placement/movement/removal, native focus and point
selection returning to gameplay without teleporting the player.

```lua
permissions { "map.read", "map.control", "network.events" }
```

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
