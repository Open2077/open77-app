# Proximity zones

`open77_zones` is the shared client service for "the player walked into (or
out of) a circle." It polls the local character transform against every
registered sphere and fires an owner-local event on the enter/exit edge,
with separate enter and exit radii so a player standing on the boundary does
not chatter between the two.

This is a **local presentation signal only**. The service has no server
half and cannot have one: Open77's server runtime installs no `exports` and
no cross-resource event bus, so a "server-side zones" resource could never
be asked anything by another server resource (see
[the gamemode kernel](gamemode-kernel.md)). Every rule that depends on
containment -- a queue accepted, a checkpoint claimed, a leash enforced --
must be re-derived on the **server** from `Open77.players.position` before
anything is granted. Treat an `enter`/`exit` event as "the client says it is
near a point," never as proof.

This is mode-agnostic by construction: it has never been asked to know
about roles, teams, matches, or any other gamemode-shaped concept, and
nothing in its implementation would need to change to answer a request one
did carry.

## Add the dependency

```lua
resource "hideseek"
version "1.0.0"
dependency "open77_zones >=0.1.0"

client_script "client/main.lua"
```

No permission is required. The service reads the local character transform
through `Open77.character.state()`, which is ungated.

## Create a zone

Exports are asynchronous, like every cross-resource call. Await the promise:

```lua
local handle

CreateThread(function()
    local promise, callError = Open77.exports.call("open77_zones", "create", {
        id = "safehouse",
        position = { x = -1460.2, y = 99.9, z = 14.8 },
        radius = 8.0,
        enterEvent = "hideseek:safehouseEnter",
        exitEvent = "hideseek:safehouseExit",
    })
    assert(promise, callError)
    local result, awaitError = promise:await()
    assert(result and result.ok, awaitError or (result and result.error))
    handle = result.handle
end)

AddEventHandler("hideseek:safehouseEnter", function(context)
    Open77.log.info("entered the safehouse zone: " .. tostring(context.id))
end)
```

Both `enterEvent` and `exitEvent` are optional; a zone can be created purely
to be polled later with `contains`.

## Definition reference

| Field | Meaning |
|---|---|
| `id` | Owner-local identifier, 1-64 characters, `[%w_:%-%.]+`. Required. |
| `position` | Static `{ x, y, z }` centre. Required; not entity-attached. |
| `radius` | Enter radius in metres, 0 < radius <= 2000. Required. |
| `hysteresis` | Metres added to `radius` to form the exit radius. A supplied value is clamped to 0.05-10.0; omitted, it falls back to `max(0.25, radius * 0.08)`, which is **not** clamped -- a 2000 m zone gets a 160 m exit margin, well past the 10 m ceiling a caller would hit asking for one explicitly. The gap between enter and exit radii is where neither event fires. |
| `maxHeight` | Vertical tolerance in metres either side of `position.z`. Defaults to 6.0 -- a zone on a plaza should not trigger for a player on the overpass above it. |
| `enterEvent` | Local event name fired on the enter edge. Optional. |
| `exitEvent` | Local event name fired on the exit edge. Optional. |

The event payload is `{ id, handle }`.

## Update, query, and remove

```lua
local function call(name, ...)
    local promise, reason = Open77.exports.call("open77_zones", name, ...)
    assert(promise, reason)
    return promise:await()
end

local inside = call("contains", handle).inside
assert(call("remove", handle).ok)
```

`create` and `remove` are exports; there is no `update` -- recreate the zone
under the same `id` if its geometry needs to change. `contains` answers with
the service's own last-polled verdict, not a fresh read; poll frequency is
described below.

Ownership comes from `GetInvokingResource()`, never from an argument:
`remove` and `contains` refuse a handle belonging to another resource with
`not_owner`. A caller's zones are removed automatically when its resource
generation stops or reloads, and a stopped owner is swept from the internal
generation table within one second.

## Polling behaviour

The service polls every registered zone against the local character
position once per tick, at one of two rates: 10 Hz (`100 ms`) whenever any
zone is within 50 m of the player, 2 Hz (`500 ms`) otherwise. There is no
way to request a different rate per zone -- a caller that needs tighter
timing than 100 ms should not build it on this service.

Distance comparisons are squared (no `sqrt` in the inner loop) and the
whole poll is skipped while the local character is not attached (menu,
loading screen, dead). A zone limit of 256 per client applies across every
resource combined.

## Server-side re-validation

The pattern every caller repeats, because it cannot be centralised (see
above): re-derive the same containment from `Open77.players.position` on
the server before treating the client's report as fact. Two worked examples
already in the tree:

```lua
-- resources/pursuit/server/main.lua -- containsPlayer(playerId, centre, radius, bucket)
-- resources/race/server/main.lua    -- checkpointReached(playerId, checkpointId)
```

Both follow the same shape: read `Open77.players.position(playerId)`,
refuse if `nil` (the position is unreadable, not "outside" -- see
[writing a gamemode](../docs/writing-a-gamemode.md) section 2.5) or if the
routing bucket does not match, then compare the horizontal (or full 3D)
distance against a **server-side radius with a few metres of grace**. The
grace exists because `Open77.players.position` is a replicated snapshot,
not a live read: an honest player's latest position may not have landed
yet, and the check exists to stop a client claiming to be somewhere else
entirely, not to arbitrate centimetres.

## Known-sound defaults, left alone

Two numbers look like they might be arena-shaped and are not: `maxHeight`
(6.0 m) exists because Night City is vertical and a ground-level zone must
not fire for a player on the walkway above it, and the 50 m/100 ms/500 ms
poll-rate split exists because a zone the player is nowhere near does not
need 10 Hz attention. Both are sound general defaults independent of what
any particular mode is doing with the zone, and neither was changed for
Phase F.
