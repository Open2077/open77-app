# World-anchored POIs

`open77_worldui` is the shared client service that turns "a marker and a
prompt at the same point" into one owned handle. Composing a native ground
marker (`Open77.markers`) with a contextual action card
([`open77_interactions`](interactions.md)) by hand means every caller
re-implements the same partial-failure cleanup; this service does it once,
transactionally, and removes both halves together.

It is mode-agnostic: nothing in its API names a role, a match, a team, or
any other gamemode-shaped concept, and both official consumers
(`resources/gamemodes/pursuit` and `resources/gamemodes/race`) call it through the same three
functions below with no special-casing on either side.

## Add the dependency

```lua
resource "hideseek"
version "1.0.0"
dependency "open77_worldui >=0.1.0"

client_script "client/main.lua"
```

`world.markers` is **not** required by the caller -- `open77_worldui` holds
that permission itself and is the presentation boundary precisely so a
gamemode resource does not need it (see
[writing a gamemode](../docs/writing-a-gamemode.md) section 1, point 3,
"least privilege"). A caller that also wants `open77_interactions` directly,
bypassing this facade, needs its own dependency and permission for that --
this service does not re-export `open77_interactions`' surface.

## Create a POI

```lua
local handle

CreateThread(function()
    local promise, callError = Open77.exports.call("open77_worldui", "create", {
        id = "start_line",
        position = { x = -1460.2, y = 99.9, z = 24.8 },
        radius = 2.5,
        style = "objective",
        maxDistance = 90.0,
        label = "Join the race",
        description = "Hold to line up at the start.",
        key = "E",
        holdSeconds = 1.0,
        color = "#00E5FF",
        event = "hideseek:startLineSelected",
    })
    assert(promise, callError)
    local result, awaitError = promise:await()
    assert(result and result.ok, awaitError or (result and result.error))
    handle = result.handle
end)

AddEventHandler("hideseek:startLineSelected", function()
    TriggerServerEvent("hideseek:joinIntent")
end)
```

`label` is optional. Omitting it creates a **marker with no interaction
prompt** -- a pure ground/waypoint ring with nothing to press E on. This is
the right shape for a checkpoint or a waypoint a player only needs to see,
not act on; `resources/gamemodes/race`'s course markers use exactly this form.

## Definition reference

| Field | Meaning |
|---|---|
| `id` | Owner-local identifier, 1-64 characters. Required. |
| `position` | Static `{ x, y, z }` ground point. Required. |
| `style` | One of the four fixed native presets: `interaction`, `objective`, `spawn`, `danger`. Defaults to `objective`. |
| `shape` | `ring` (default) or `cylinder`. |
| `radius` | Marker radius, clamped to 0.1-50.0 m; defaults to 1.5. |
| `maxDistance` | Marker visibility distance, clamped to 1.0-500.0 m; defaults to 80.0. |
| `groundOffset` | Metres the marker is lifted off `position.z`, 0.0-2.0; defaults to 0.06. A ring flattened to the ground plane at exactly floor height is co-planar with the floor and renders nothing visible even though the handle and the native registry both report success -- see "A trap this service exists to avoid" below. |
| `label`, `description` | Prompt copy. Presence of `label` is what creates the prompt half at all. |
| `key`, `holdSeconds`, `icon`, `color` | Prompt affordance, passed straight through to `open77_interactions`. |
| `marker`, `animated`, `focusRadius`, `requireLookAt`, `promptDistance`, `labelHeight` | Prompt presentation fields; see [Contextual interactions](interactions.md#definition-reference) for their meaning and ranges. |
| `event` | Local event fired when the prompt's choice is selected. Required if `label` is set. |

Radius and `maxDistance` are clamped here rather than left to fail against
the native marker's own tighter bounds, so a caller gets a POI instead of
an opaque native refusal.

The prompt half's `markerScale` and `markerNearScale` are **not**
configurable through this facade -- they are fixed at `1.0` and `1.6`
regardless of what `definition` carries. A caller that needs different
prompt-marker scaling has to create the interaction directly through
[`open77_interactions`](interactions.md) instead of through this service.

## Update, list, remove

```lua
local function call(name, ...)
    local promise, reason = Open77.exports.call("open77_worldui", name, ...)
    assert(promise, reason)
    return promise:await()
end

local owned = call("list").pois       -- { { handle, id, position }, ... }
assert(call("remove", handle).ok)
```

There is no `update` export. Remove and recreate under the same `id` to
change a POI's geometry or copy -- the same convention as `open77_zones`.

`dump()` is a diagnostic, not part of the steady-state API: it reads the
native marker registry through this resource's `world.markers` permission
(a caller without that permission cannot see the registry at all) and logs
one line per marker, including the native `rendered` flag. Use it when a
POI is not visually appearing to separate "the Lua handle exists" from "the
REDengine effect is actually alive" -- the two failure modes look identical
from Lua otherwise, and `rendered=true` has been measured to mislead on its
own (see `docs/gamemode-pursuit-plan.md` section 7d).

## Ownership and cleanup

Ownership comes from `GetInvokingResource()`, never from an argument.
`remove` and `list` are scoped to the caller; a handle belonging to another
resource is refused with `not_owner`. A caller's POIs (both the marker and
the prompt half) are removed automatically when its resource generation
stops or reloads. A limit of 128 POIs applies across every resource
combined.

## Surviving `open77_interactions` restarting underneath you

`open77_interactions` declares `reload_policy "reconnect"`
([Contextual interactions](interactions.md)), so **any** change to the
session's resource set restarts it, and on restart it drops every
registered entry. A POI's marker half survives (it belongs to
`open77_worldui`'s own generation), but the prompt half silently vanishes,
leaving a visible ring with nothing to interact with.

`open77_worldui` watches `open77_interactions`' generation once a second
and re-registers every prompt it is holding a `promptSpec` for when that
generation changes. A caller does not need to do anything for this -- it is
part of why the facade exists rather than every gamemode composing the two
services itself.

## A trap this service exists to avoid

A marker's ring mesh is flattened to ~0.04 m. Placed at exactly
`position.z` with no lift, it sits co-planar with the ground mesh: the
native entity spawns, the effect scales, the registry reports
`rendered = true` -- and nothing is visible, because the ring is inside the
floor geometry. `groundOffset` (default 0.06 m) exists specifically to keep
a caller from rediscovering this. If a POI is invisible despite `dump()`
reporting `rendered = true`, suspect a `groundOffset` of `0` before
anything else.
