# Authoritative vehicle paint

Open77 keeps custom vehicle paint in the server's canonical vehicle state. A color selected by a
gamemode, garage, or administration resource therefore remains identical for current viewers,
stream-in, reconnects, and late joiners instead of becoming a client-local Holopaint override.

## Permissions and runtime split

Server mutations require `world.vehicles`:

```lua
permissions { "world.vehicles" }
```

Client reads require `vehicles.read`:

```lua
permissions { "vehicles.read" }
```

Only the server can change canonical paint. The client API is deliberately read-only.

| Runtime | Function | Purpose |
|---|---|---|
| Server | `Open77.vehicles.setPaint(id, paint)` | Apply primary and secondary RGB colors. |
| Server | `Open77.vehicles.getPaint(id)` | Read canonical paint. |
| Server | `Open77.vehicles.resetPaint(id)` | Restore the vehicle record's authored paint. |
| Client | `Open77.vehicles.getPaint(id)` | Read paint for one currently streamed vehicle. |

Vehicle operations are cross-resource. Any server resource granted `world.vehicles` can paint a
canonical vehicle created by another resource; the creator name is not an authorization boundary.

## Color formats

Every color accepts one of these equivalent forms:

```lua
"#00D8FF"
{ r = 0, g = 216, b = 255 }
{ 0, 216, 255 }
```

Channels are integers from `0` through `255`. Supplying only `primary` mirrors it to `secondary`.
Supplying only `secondary` preserves the current primary color. Custom paint has a separate
`applied` flag, so `{ r = 0, g = 0, b = 0 }` is valid black paint and never means reset.

## Apply, inspect, and reset

```lua
local ok = Open77.vehicles.setPaint(vehicleId, {
    primary = "#00D8FF",
    secondary = { r = 12, g = 24, b = 36 },
})
assert(ok, "unknown canonical vehicle")

local paint = assert(Open77.vehicles.getPaint(vehicleId))
print(paint.applied)             -- true
print(paint.primary.r)           -- 0
print(paint.secondary.b)         -- 36

assert(Open77.vehicles.resetPaint(vehicleId))
assert(Open77.vehicles.getPaint(vehicleId).applied == false)
```

The compatibility keys `primaryColor` and `secondaryColor` are also accepted by `setPaint`.
For ordinary code, prefer the shorter `primary` and `secondary` names.

## Initial paint during creation

Paint can be included in the atomic vehicle definition:

```lua
local vehicleId = assert(Open77.vehicles.create({
    record = "Vehicle.v_standard2_archer_hella_player",
    position = { x = -1671.2, y = -710.3, z = 49.9 },
    yaw = 90.0,
    paint = {
        primary = "#101820",
        secondary = "#00D8FF",
    },
}))
```

Top-level `primaryColor` and `secondaryColor` remain supported. Supplying either form sets the
canonical `Open77.vehicles.flags.paintApplied` bit automatically.

## Events

Server resources receive the canonical vehicle ID and revision as strings:

```lua
AddEventHandler("onVehiclePaintChanged", function(id, revision)
    local paint = Open77.vehicles.getPaint(tonumber(id))
end)
```

Client resources receive the same transition after replicated state changes:

```lua
AddEventHandler("open77:vehiclePaintChanged", function(id, revision)
    local paint = Open77.vehicles.getPaint(id)
end)
```

The full vehicle snapshot also exposes `paintApplied`, `primaryColor`, `secondaryColor`, and the
nested `paint = { applied, primary, secondary }` view.

## Native presentation and limitations

Open77 applies paint through the vehicle's native visual-customization component and retries after
attachment when that component is not ready on the first frame. The stock CrystalCoat/TWINTONE
interaction and popup are disabled during an authenticated Open77 session so a player cannot keep a
private local override that disagrees with the server.

Arbitrary RGB display still depends on the selected REDengine vehicle record exposing a compatible
generic paint component. Unsupported records retain their authored appearance, while the canonical
server state stays intact and can still be read by scripts.

See [Network vehicles](vehicles.md) for lifecycle, streaming, seats, damage, and the complete Lua
surface.
