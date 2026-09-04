# Network vehicles

Open77 vehicles are server entities. A server resource creates a vehicle, owns its durable state, and removes it. Clients only stream a REDengine projection around their player.

## Manifest

```lua
permissions { "world.vehicles", "vehicles.read", "vehicles.presentation" }
```

`world.vehicles` is a server permission. `vehicles.read` exposes the read-only client projection.
`vehicles.presentation` is optional and permits a client resource to select the visual entry path
for an occupant whose exact player, vehicle, and seat were already validated by the server.

## Complete Lua API inventory

The vehicle surface is intentionally asymmetric:

| Runtime | Surface | Count | Mutation |
|---|---|---:|---|
| Server | `Open77.vehicles.*` | 47 methods | Authoritative lifecycle, state, damage, detached parts, openings, paint, and transform. |
| Client | `Open77.vehicles.*` | 6 methods | Read-only state plus guarded remote-occupant presentation. |
| Client package | `open77_vehicles` exports | 2 exports | Read-only compatibility wrappers. |
| Server low level | FiveM-style globals | 6 functions | Raw implementation surface; prefer `Open77.vehicles.*`. |

There is deliberately no client API for breaking or repairing glass, tyres, lights, bodywork, or
detached panels. Only the current physics owner may publish native destructive state; other clients
are protected render projections. Scripted mutation uses the authoritative server methods below.

### All server lifecycle and state methods

Every method in this table requires `world.vehicles`.

| Method | Signature | Return / behavior |
|---|---|---|
| `Open77.vehicles.create` | `(definition)` | Vehicle ID, or `nil, reason`. |
| `Open77.vehicles.update` | `(id, patch)` | `boolean`; replaces supplied canonical fields. |
| `Open77.vehicles.get` | `(id)` | Server snapshot or `nil`. |
| `Open77.vehicles.all` | `(bucket?)` | Array of server snapshots, ordered by ID. |
| `Open77.vehicles.remove` | `(id)` | `boolean`; only the creating resource can remove it. |
| `Open77.vehicles.setTransform` | `(id, transform)` | `boolean`; position plus yaw, revoking any active physics lease. |
| `Open77.vehicles.getDamage` | `(id)` | `{ body, glass, lights, tires, detachedParts }`, or `nil`. |
| `Open77.vehicles.setDamage` | `(id, damage)` | `boolean`; combined damage update. |
| `Open77.vehicles.repair` | `(id, scope?)` | `boolean`; scope is `glass`, `body`, `lights`, `tires`, `visual`, `mechanical`, or `full`. |
| `Open77.vehicles.registerDamageProfile` | `(record, profile)` | `true`; registers names inside the calling resource VM. |
| `Open77.vehicles.getDamageProfile` | `(record)` | This resource's profile or `nil`. |

### All server body-damage methods

Body cells use Lua indexes **1..30** and normalized finite values **0..1**.

| Method | Signature | Return / behavior |
|---|---|---|
| `Open77.vehicles.setBodyDamage` | `(id, values)` | Replaces the exact 30-value grid. |
| `Open77.vehicles.setBodyCell` | `(id, cell, value)` | Sets one normalized cell. |
| `Open77.vehicles.damageBodyCell` | `(id, cell, amount)` | Adds damage and clamps the result to 0..1. |
| `Open77.vehicles.repairBodyCell` | `(id, cell)` | Sets one cell to zero. |
| `Open77.vehicles.setBodyZone` | `(id, zone, value)` | Sets every cell in a named zone or explicit index array. |
| `Open77.vehicles.damageBodyZone` | `(id, zone, amount)` | Adds and clamps damage across a zone. |
| `Open77.vehicles.repairBodyZone` | `(id, zone)` | Clears a zone. |

`Open77.vehicles.bodyZones` contains `backLeft`, `back`, `backRight`, `left`, `center`, `right`,
`frontLeft`, `front`, `frontRight`, `lower`, `roof`, and `all`. A damage profile can override or
extend the zone map for one vehicle record.

### All server glass, light, and tyre methods

Glass and light indexes are **0..31**. Tyre indexes are **0..3**. Glass ordering comes from the
specific vehicle record's `Destruction.Glass` list; it is not equivalent to the four openable
side-window indexes.

| Method | Signature | Return / behavior |
|---|---|---|
| `Open77.vehicles.setGlassMask` | `(id, mask)` | Replaces the 32-bit broken-glass mask. |
| `Open77.vehicles.setGlassBroken` | `(id, glass, broken)` | Sets one numeric or profile-named glass bit. |
| `Open77.vehicles.breakGlass` | `(id, glass)` | Sets one glass bit. |
| `Open77.vehicles.repairGlass` | `(id, glass)` | Clears one glass bit. |
| `Open77.vehicles.breakAllGlass` | `(id, count?)` | Breaks the first `count` bits; default is all 32. |
| `Open77.vehicles.repairAllGlass` | `(id)` | Clears the entire glass mask. |
| `Open77.vehicles.setLightMask` | `(id, mask)` | Replaces the 32-bit broken-light mask. |
| `Open77.vehicles.setLightBroken` | `(id, index, broken)` | Sets or clears one light bit. |
| `Open77.vehicles.breakLight` | `(id, index)` | Sets one light bit. |
| `Open77.vehicles.repairLight` | `(id, index)` | Clears one light bit. |
| `Open77.vehicles.repairAllLights` | `(id)` | Clears the complete light mask. |
| `Open77.vehicles.setTireMask` | `(id, mask)` | Replaces the four-bit broken-tyre mask. |
| `Open77.vehicles.setTireBroken` | `(id, index, broken)` | Sets or clears one tyre bit. |
| `Open77.vehicles.breakTire` | `(id, index)` | Sets one tyre bit. |
| `Open77.vehicles.repairTire` | `(id, index)` | Clears one tyre bit. |
| `Open77.vehicles.repairAllTires` | `(id)` | Clears the complete tyre mask. |

### All server door and openable-window methods

Doors are a six-bit reversible state. Openable windows are a separate four-bit reversible state;
neither mask represents broken glass.

| Method | Signature | Return / behavior |
|---|---|---|
| `Open77.vehicles.setDoorMask` | `(id, mask)` | Replaces the door/trunk/hood mask; range 0..63. |
| `Open77.vehicles.setDoorOpen` | `(id, door, opened)` | Sets one opening bit. |
| `Open77.vehicles.openDoor` | `(id, door)` | Opens one door, trunk, or hood. |
| `Open77.vehicles.closeDoor` | `(id, door)` | Closes one door, trunk, or hood. |
| `Open77.vehicles.isDoorOpen` | `(id, door)` | `boolean`, or `nil` for an unknown vehicle. |
| `Open77.vehicles.setWindowOpen` | `(id, window, opened)` | Sets one side-window opening bit. |
| `Open77.vehicles.openWindow` | `(id, window)` | Opens one side window. |
| `Open77.vehicles.closeWindow` | `(id, window)` | Closes one side window. |
| `Open77.vehicles.isWindowOpen` | `(id, window)` | `boolean`, or `nil` for an unknown vehicle. |

### Detached vehicle parts

Detached parts are a separate, monotonic 16-bit damage channel. They are reported by the native
`VehicleOnPartDetachedEvent`, retained by the server, replayed to streamed observers, and included
in late join. REDengine 2.31 exposes no proven safe reattachment primitive for a live vehicle, so
clearing a detached bit is rejected; respawn the vehicle to restore its panels.

| Method | Signature | Return / behavior |
|---|---|---|
| `Open77.vehicles.setDetachedPartMask` | `(id, mask)` | Adds a canonical mask in range 0..65535; rejects bit removal. |
| `Open77.vehicles.setPartDetached` | `(id, part, true)` | Detaches a named/indexed part; `false` is rejected. |
| `Open77.vehicles.detachPart` | `(id, part)` | Convenience form of `setPartDetached(..., true)`. |
| `Open77.vehicles.isPartDetached` | `(id, part)` | `boolean`, or `nil` for an unknown vehicle. |

`Open77.vehicles.detachedParts` maps `trunk`, `hood`, `hoodLeft`, `hoodRight`, the front-door
variants `doorFrontLeft[A-C]` / `doorFrontRight[A-C]`, `doorBackLeft`, `doorBackRight`,
`bumperFront`, and `bumperBack` to bit indexes 0..15.

The remaining `Open77.vehicles.update` fields are `health`, `flags`, `primaryColor`,
`secondaryColor`, `doors`, `windows`, `tires`, `bodyDamage`, `brokenGlass`, `brokenLights`, and
`detachedParts`.

### Exact client methods

| Method | Permission | Signature | Return / behavior |
|---|---|---|---|
| `Open77.vehicles.get` | `vehicles.read` | `(id)` | One streamed client snapshot or `nil`. |
| `Open77.vehicles.all` | `vehicles.read` | `()` | All currently streamed snapshots; empty when unavailable or denied. |
| `Open77.vehicles.isDoorOpen` | `vehicles.read` | `(id, door)` | Reads the canonical six-bit door state. |
| `Open77.vehicles.isWindowOpen` | `vehicles.read` | `(id, window)` | Reads the canonical four-bit opening state, not broken glass. |
| `Open77.vehicles.warpPlayerIntoVehicle` | `vehicles.presentation` | `(playerId, vehicleId, seat)` | Instantly presents an already-authorized remote occupant. |
| `Open77.vehicles.taskPlayerEnterVehicle` | `vehicles.presentation` | `(playerId, vehicleId, seat)` | Reserved animated path; currently fails closed with `animated_entry_unsupported`. |
| `Open77.vehicles.setPerformance` | `vehicles.performance` | `(id, profile)` | Caps one vehicle's top speed and pickup. |
| `Open77.vehicles.clearPerformance` | `vehicles.performance` | `(id)` | Removes that vehicle's cap. |
| `Open77.vehicles.setPerformanceClass` | `vehicles.performance` | `(record, profile)` | Caps every present and future vehicle of one TweakDB record. |
| `Open77.vehicles.clearPerformanceClass` | `vehicles.performance` | `(record)` | Removes that record's cap. |
| `Open77.vehicles.clearAllPerformance` | `vehicles.performance` | `()` | Drops every cap, instance and class. |
| `Open77.vehicles.setControlLock` | `vehicles.performance` | `(id, locked)` | Suppresses or restores acceleration and brake/reverse input for a stationary vehicle. |
| `Open77.vehicles.ratedTopSpeed` | `vehicles.read` | `(id)` | Gearing rating of the vehicle's record in km/h, or `nil`. |

Client constants are `Open77.vehicles.doors`, `Open77.vehicles.windows`, and
`Open77.vehicles.seats`. They are tables, not callable methods.

Vehicle snapshots include the durable fields above plus live read-only drivetrain and network
telemetry. `speed`, `rpm`, `rpmMax`, `throttle`, `brake`, `steering`, `wheelRotation`,
`suspensionLongitudinal`, `suspensionTransversal`, `burnout`, `gear`, `onGround`, and `reversing`
describe the latest authoritative motion. The derived normalized fields `longitudinalSlip`,
`lateralSlip`, and `totalSlip` drive remote tire audio and skid effects. Network diagnostics are
`bufferedSamples`, `interpolationDelayMs`, `packetAgeMs`, and `extrapolating`; they are intended for
telemetry and debugging, not gameplay authority.

### Official package exports

The `open77_vehicles` client package exposes only:

| Export | Signature | Result |
|---|---|---|
| `get` | `get(id)` | Compatibility wrapper over `Open77.vehicles.get`. |
| `all` | `all()` | Compatibility wrapper over `Open77.vehicles.all`. |

Call them with `Open77.exports.call("open77_vehicles", "get", id)`; no
`exports.<resource>:` proxy exists. The package intentionally exposes no mutation export.

### Low-level server globals

These six globals are public for framework compatibility, but the namespaced API above supplies
structured tables, defaults, and helper validation.

| Global | Signature |
|---|---|
| `CreateVehicle` | `(record, x, y, z, yaw, bucket, appearance, health, flags, primaryR, primaryG, primaryB, secondaryR, secondaryG, secondaryB)` |
| `UpdateVehicleState` | `(id, health, flags, primaryR, primaryG, primaryB, secondaryR, secondaryG, secondaryB, doors, windows, tires, bodyDamage30, brokenGlass, brokenLights, detachedParts)` |
| `SetVehicleTransform` | `(id, x, y, z, yaw)` |
| `RemoveVehicle` | `(id)` |
| `GetVehicle` | `(id)` |
| `GetVehicles` | `(bucket?)` |

## Server API

```lua
local id, reason = Open77.vehicles.create({
    record = "Vehicle.v_standard2_archer_hella_player",
    appearance = "default",
    position = { x = -1607.4, y = 1268.2, z = 18.1 },
    yaw = 90.0,
    bucket = 0,
    health = 1.0,
    flags = Open77.vehicles.flags.locked,
    primaryColor = { r = 22, g = 105, b = 180 },
    secondaryColor = { r = 8, g = 15, b = 24 },
})
```

### `Open77.vehicles.create(definition)`

Creates a generation-checked 64-bit vehicle id. Required fields are `record` and `position`. Optional fields are `appearance`, `yaw`, `bucket`, `health`, `flags`, `primaryColor`, and `secondaryColor`. Returns `id`, or `nil, reason`.

### `Open77.vehicles.update(id, patch)`

Updates durable state. Supported fields are `health`, `flags`, `primaryColor`, `secondaryColor`,
`doors`, `windows`, `tires`, `bodyDamage`, `brokenGlass`, `brokenLights`, `detachedParts`, and the nested
`damage = { body, glass, lights, tires, detachedParts }` form. `windows` means opened windows; it is deliberately
separate from `brokenGlass`. Door bits are front-left, front-right, back-left, back-right, trunk,
and hood. Window/tire bits use the first four positions.

```lua
local flags = Open77.vehicles.flags.engineOn | Open77.vehicles.flags.lightsOn
Open77.vehicles.update(id, { flags = flags, health = 0.85 })
```

Available flags:

| Constant | Value | Constant | Value |
|---|---:|---|---:|
| `Open77.vehicles.flags.engineOn` | `1` | `Open77.vehicles.flags.locked` | `2` |
| `Open77.vehicles.flags.destroyed` | `4` | `Open77.vehicles.flags.exploded` | `8` |
| `Open77.vehicles.flags.invulnerable` | `16` | `Open77.vehicles.flags.immortal` | `32` |
| `Open77.vehicles.flags.lightsOn` | `64` | `Open77.vehicles.flags.highBeams` | `128` |
| `Open77.vehicles.flags.sirenOn` | `256` |  |  |

Combine flags with Lua 5.4 bitwise operators (`|`, `&`, `~`). Never replace the complete mask when
you only intend to toggle one bit without first reading the current canonical value.

### Doors, trunk, hood, and windows

Openings have named, persistent server APIs. They are replicated to current viewers and included
in stream-in/late-join state. Live changes use the vehicle's native animation; the initial streamed
state is applied immediately so an already-open trunk does not visibly replay from closed.

```lua
Open77.vehicles.openDoor(id, "trunk")
Open77.vehicles.closeDoor(id, "hood")
Open77.vehicles.setDoorOpen(id, Open77.vehicles.doors.frontRight, true)

if Open77.vehicles.isDoorOpen(id, "trunk") then
    -- Server-side inventory logic can now expose the trunk contents.
end

Open77.vehicles.openWindow(id, "frontLeft")
Open77.vehicles.closeWindow(id, Open77.vehicles.windows.frontLeft)
```

Door names are `frontLeft`, `frontRight`, `backLeft`, `backRight`, `trunk`, and `hood`.
Snake-case cabin aliases are also accepted. Window names are the first four door names. Low-level
`setDoorMask(id, mask)` and `update(id, { doors = mask, windows = mask })` remain available for
frameworks that already store bitfields.

| Index / bit | Door | Openable window |
|---:|---|---|
| `0` | `frontLeft` / `front_left` | `frontLeft` |
| `1` | `frontRight` / `front_right` | `frontRight` |
| `2` | `backLeft` / `back_left` | `backLeft` |
| `3` | `backRight` / `back_right` | `backRight` |
| `4` | `trunk` | — |
| `5` | `hood` | — |

Natural player interactions are observed too: opening or closing a trunk/hood in the world updates
the canonical server state. A reversible opening report is accepted only from the current driver or
a streamed player within 15 metres; a distant client cannot toggle another vehicle.

### Damage and repair API

Damage is canonical server state and is replayed to current viewers, stream-in clients, and late
joiners. The client observation channel can only add damage. Only the server resource owning the
vehicle can repair it.

```lua
-- Glass indices are zero-based indices into this model's Destruction.Glass list.
Open77.vehicles.breakGlass(id, 0)
Open77.vehicles.repairGlass(id, 0)
Open77.vehicles.breakAllGlass(id)       -- all 32 mask bits
Open77.vehicles.breakAllGlass(id, 6)    -- first six glass records
Open77.vehicles.repairAllGlass(id)

Open77.vehicles.setTireBroken(id, 0, true)
Open77.vehicles.repairTire(id, 0)
Open77.vehicles.setLightBroken(id, 2, true)
Open77.vehicles.repairLight(id, 2)

Open77.vehicles.damageBodyCell(id, 13, 0.25) -- cells are Lua indices 1..30
Open77.vehicles.damageBodyZone(id, "front", 0.40)
Open77.vehicles.repairBodyZone(id, "front")
Open77.vehicles.repair(id, "visual")
Open77.vehicles.repair(id, "full")
```

Available body zones are `backLeft`, `back`, `backRight`, `left`, `center`, `right`,
`frontLeft`, `front`, `frontRight`, `lower`, `roof`, and `all`. The low-level API remains exposed
for custom damage systems:

```lua
local damage = Open77.vehicles.getDamage(id)
damage.body[14] = 0.9
damage.glass = damage.glass | (1 << 3)
Open77.vehicles.setDamage(id, damage)

Open77.vehicles.setBodyDamage(id, thirtyNormalizedValues)
Open77.vehicles.setGlassMask(id, 0x15)
Open77.vehicles.setLightMask(id, 0x02)
Open77.vehicles.setTireMask(id, 0x05)
```

Glass ordering is record-specific. A resource can register readable names instead of spreading
numeric indices throughout gameplay code:

```lua
Open77.vehicles.registerDamageProfile("Vehicle.v_standard2_archer_hella_player", {
    glass = { windshield = 0, rearWindow = 1, frontLeft = 2, frontRight = 3 },
    bodyZones = { engineBay = { 13, 14, 15 } },
})

Open77.vehicles.breakGlass(id, "windshield")
Open77.vehicles.damageBodyZone(id, "engineBay", 0.5)
```

Open77 intentionally does not ship guessed glass names: the `Destruction.Glass` order differs by
vehicle record. Numeric glass/light indices are `0..31`, tyre indices are `0..3`, and all body
values are finite normalized values in `0..1`.

### Other server calls

```lua
Open77.vehicles.setTransform(id, { x = 10, y = 20, z = 30, yaw = 180 })
Open77.vehicles.get(id)
Open77.vehicles.all()
Open77.vehicles.all(bucket)
Open77.vehicles.remove(id)
```

`setTransform` is server-authoritative: it revokes an active physics lease, advances the
authority epoch, and publishes the complete canonical transform to every current viewer.

`get` and `all` also return the canonical seat ledger:

```lua
local vehicle = Open77.vehicles.get(id)
for _, occupant in ipairs(vehicle.occupants) do
    print(occupant.playerId, occupant.seat)
end
```

Seat names are `seat_front_left`, `seat_front_right`, `seat_back_left`, and
`seat_back_right`. `seat_front_left` is the only driver seat. Scripts cannot write this
ledger directly: it is produced by native mount detection and validated by the server.

### Server snapshot fields

`Open77.vehicles.get` and each entry returned by `all` contain:

| Group | Fields |
|---|---|
| Identity | `id`, `resource`, `record`, `appearance`, `revision` |
| World | `bucket`, `x`, `y`, `z` |
| Authority | `physicsOwner`, `authorityEpoch` |
| Durable state | `health`, `flags`, `doors`, `windows`, `tires`, `brokenGlass`, `brokenLights`, `detachedParts` |
| Paint | `primaryR`, `primaryG`, `primaryB`, `secondaryR`, `secondaryG`, `secondaryB` |
| Body | `bodyDamage[1..30]` |
| Damage view | `damage = { body, glass, lights, tires, detachedParts }` |
| Seats | `occupants[] = { playerId, seat }` |

The current server Lua snapshot does not expose orientation. Pass an explicit `yaw` to
`setTransform`; omitting it uses `0` rather than preserving an unreadable heading.

Validation constraints are `health = 0..1`, RGB channels `0..255`, finite world coordinates with
an absolute maximum of 1,000,000, a record length up to 256 characters, an appearance length up to
128, flags limited to the documented nine bits, exactly 30 normalized body values, doors `0..63`,
and windows/tyres `0..15`.

### Server events

```lua
AddEventHandler("onVehicleCreated", function(id, resource, record) end)
AddEventHandler("onVehicleUpdated", function(id, revision) end)
AddEventHandler("onVehicleRemoved", function(id, reason) end)
AddEventHandler("onVehicleAuthorityChanged", function(id, owner, epoch, reason) end)
AddEventHandler("onVehicleOccupancyChanged", function(id, revision)
    local canonical = Open77.vehicles.get(tonumber(id))
end)

AddEventHandler("onVehicleDamageChanged", function(id, revision)
    local damage = Open77.vehicles.getDamage(tonumber(id))
end)
```

Server runtime event arguments arrive as strings. Preserve the ID as an opaque value unless the
called binding explicitly requires an integer. `onVehicleUpdated` fires for every canonical state
update; `onVehicleDamageChanged` is the narrower damage-specific signal.

Resources can mutate or remove only their own vehicles. Stopping or reloading a resource removes every vehicle it owns.

## Client API

The client state surface is intentionally read-only:

```lua
local vehicle = Open77.vehicles.get(id)
local streamed = Open77.vehicles.all()
local trunkOpen = Open77.vehicles.isDoorOpen(id, "trunk")
local hoodOpen = Open77.vehicles.isDoorOpen(id, Open77.vehicles.doors.hood)
```

### Performance ceilings

A roster of cars is only a real choice when no single car simply wins. Cyberpunk 2077 2.31 exposes
no speed setter, no writable drive model and no writable input system, so Open77 applies a ceiling
the way an engine control unit does: it withdraws driver throttle as the ceiling approaches, at the
exact point in the drive update where REDengine reads it. The car still accelerates normally, then
the top of its acceleration curve flattens. Nothing fights the physics solver, so there is no
judder and no rubber-banding.

```lua
-- Every Archer Hella in this gamemode tops out at 140 km/h.
Open77.vehicles.setPerformanceClass("Vehicle.v_standard2_archer_hella_player", {
  topSpeedKph = 140,
})

-- Same ceiling, and half the pickup, for one specific spawned car.
Open77.vehicles.setPerformance(vehicleId, {
  topSpeedKph = 140,
  taperKph = 15,
  accelerationScale = 0.5,
})

Open77.vehicles.clearPerformanceClass("Vehicle.v_standard2_archer_hella_player")
Open77.vehicles.clearAllPerformance()

-- Hold a stopped car on a starting grid, then release it on authoritative GO.
assert(Open77.vehicles.setControlLock(vehicleId, true))
assert(Open77.vehicles.setControlLock(vehicleId, false))
```

| Field | Default | Meaning |
|---|---|---|
| `topSpeedKph` | `0` | The ceiling. Zero leaves the top end alone, so a profile can cap pickup only. |
| `taperKph` | `12` | How wide the roll-off below the ceiling is. Wider is softer. Values under `3` are refused, because a band that narrow makes the limiter hunt and the hunting reads as lag. |
| `accelerationScale` | `1` | Throttle authority at every speed, in `(0, 1]`. This is how a car is made to *pick up* more slowly rather than only to top out lower. |

Precedence is instance, then record class, then a default set by `setDefaultPerformance` on the
native API. A car matched by nothing is untouched. Caps are dropped automatically when the vehicle
despawns, and they do not survive a client restart.

`Open77.vehicles.ratedTopSpeed(id)` returns the gearing rating of the vehicle's TweakDB record: the
speed at which top gear reaches its rated maximum engine RPM. It is the right number for *ranking* a
roster and for picking a ceiling that no car in the roster has to be slowed much to meet. It is not
the measured terminal velocity — torque and aerodynamic drag carry real top speed above it.

> **This is balance, not anti-cheat.** The ceiling is applied by the client that simulates the
> vehicle, and a modified client can decline to apply it. It equalises a roster among players who
> are running the stock client; it enforces nothing against a determined one. The server currently
> cannot corroborate it either — the server-side vehicle snapshot carries no velocity, so there is
> nothing to check a reported speed against. Treat a speed ceiling as a game-design tool, on the
> same footing as which cars the roster offers at all.

`setControlLock` is the hard stationary counterpart to the soft performance
governor. While locked, the native drive update consumes zero acceleration and
zero brake/reverse input and clears burnout. Releasing the lock restores the
input snapshot on the next frame; no velocity or transform is overwritten, so
there is no rubber-banding. Engage it only after placing a stopped vehicle. The
same client-side trust boundary applies: it is a gamemode start lock, not an
anti-cheat primitive.

Where the number should live: a gamemode should not hard-code it. Declare it as a resource tunable
so a server owner can edit it in Warden, and have the resource apply the value it reads. A ceiling
is a match parameter, so `nextMatch` is the right apply timing — moving it under two people already
racing is not a live update.

Trusted presentation resources can request an entry presentation or use an explicit instant warp:

```lua
-- FiveM-compatible seat numbers: driver=-1, front passenger=0,
-- rear-left=1, rear-right=2.
local ok, reason = Open77.vehicles.taskPlayerEnterVehicle(
    playerId, vehicleId, Open77.vehicles.seats.frontPassenger)

-- Recovery, stream reconstruction, teleport-oriented game modes, or tests.
ok, reason = Open77.vehicles.warpPlayerIntoVehicle(
    playerId, vehicleId, Open77.vehicles.seats.driver)
```

Named seats (`driver`, `frontPassenger`, `rearLeft`, `rearRight`, `frontLeft`,
`frontRight`, `backLeft`, `backRight`, and canonical `seat_*` names) are accepted too.
These functions operate only on remote player proxies. They return
`false, "occupancy_mismatch"` unless the replicated server ledger already contains that exact
tuple. They cannot grant a seat, move the local player, steal a vehicle, or change physics
authority.

`taskPlayerEnterVehicle` is currently fail-closed and returns
`false, "animated_entry_unsupported"`. The first implementation forwarded the vanilla NPC
`MountAIEvent` to Open77's player proxy; a two-client runtime test showed that REDengine can
dereference a missing AI/workspot object and crash the observing client. Normal replication and
`warpPlayerIntoVehicle` therefore use the stable mounting facility until the staged door/workspot
implementation has passed two-client validation. This keeps the API name stable without exposing
the unsafe engine path.

### Client snapshot fields

The client snapshot deliberately differs from the server snapshot:

| Group | Fields |
|---|---|
| Identity | `id`, `record`, `revision` |
| Local projection | `entity`, `engineEntity`, `streamed`, `locallyOwned` |
| Authority | `physicsOwner`, `authorityEpoch` |
| Durable state | `health`, `flags`, `doors`, `windows`, `tires`, `brokenGlass`, `brokenLights`, `detachedParts` |
| Body and damage | `bodyDamage[1..30]`, `damage = { body, glass, lights, tires, detachedParts }` |
| Drivetrain | `speed`, `rpm`, `rpmMax`, `throttle`, `brake`, `gear`, `burnout` |
| Wheels/suspension | `steering`, `wheelRotation`, `suspensionLongitudinal`, `suspensionTransversal`, `onGround`, `reversing` |
| Seats | `occupants[] = { playerId, seat }` |

`entity` is an ephemeral, generation-checked Open77 handle for the local projection.
`engineEntity` is diagnostic engine identity. Neither is the durable server vehicle ID, and neither
should be cached after stream-out. Client snapshots do not include server ownership metadata such
as `resource`, `bucket`, paint channels, or world coordinates.

Client events:

```lua
AddEventHandler("open77:vehicleCreated", function(id) end)
AddEventHandler("open77:vehicleRemoved", function(id, reason) end)
AddEventHandler("open77:vehicleAuthorityChanged", function(id, ownerPlayerId) end)
AddEventHandler("open77:vehicleOccupancyChanged", function(id, revision) end)
AddEventHandler("open77:vehicleDamageChanged", function(id, revision) end)
```

The reference resource also emits `open77:vehicleOwnerChanged(id, ownerPlayerId)` and
`open77:vehicleSeatsChanged(vehicleSnapshot, revision)`. The latter resolves the fresh snapshot
before dispatch, unlike the lower-level occupancy event.

## Seat and proxy replication

1. REDengine reports the local player's real mount and slot.
2. The client requests that seat; it never assigns itself locally in the network ledger.
3. The server checks vehicle id, routing bucket, 15-metre proximity, lock/destruction state,
   one-seat-per-player, and one-player-per-seat.
4. A reliable ordered occupancy snapshot is sent to every vehicle viewer.
5. Each observing client mounts the corresponding remote player proxy into the streamed
   vehicle and exact seat. A live addition runs the native NPC approach/door/workspot behavior;
   an initial stream snapshot uses the instant warp so it does not replay an old entrance. When
   the snapshot removes the player, Open77 discards that disposable
   native proxy and recreates it from the next authoritative player snapshot. This avoids reusing
   a REDengine puppet whose vehicle workspot left its locomotion representation inactive.
6. Root player movement is suspended only after the native mount is confirmed, avoiding a
   transform fight between pedestrian interpolation and the vehicle mounting system. A fresh
   pedestrian controller is installed on the replacement proxy after exit.

If a local engine mount disagrees with the server for two seconds (for example a locked seat
was rejected), Open77 unmounts the player. Disconnect, vehicle removal, seat change, and exit
all clear the server ledger. Leaving the driver seat also revokes physics authority.

## Damage, electrical state, and horn

Protocol 1.13 extends the reliable observation channel for state changed by REDengine. The current
physics owner captures normalized health, the native 30-cell body-destruction grid, broken
glass/light bitfields, flat tyres, engine state, headlight mode, six door states, and four window
states while driving. Streamed
clients also watch monotonic destructive changes on nearby vehicles, so gunfire, collisions,
fire, and explosions are reported even when the target vehicle is parked and has no physics
owner. Nearby clients also report reversible opening changes. The server accepts damage witness
reports only from the vehicle's current interest set and
merges damage monotonically; a client can add damage but cannot repair a vehicle or change its
electrical state. Opening changes additionally require a position within 15 metres. Repairs and
arbitrary opening mutations remain explicit server-resource operations.

The canonical state is sent to current viewers and embedded in `VehicleCreate` for stream-in
and late join. A player connecting after a collision or explosion receives the same health,
dents, broken glass/lights, tyres, destroyed state, and native explosion event instead of a
pristine local projection.

When the driver exits, disconnects, dies, loses the lease, or is revoked, the server clears
`engineOn`, `lightsOn`, `highBeams`, and `sirenOn` before publishing the new authority epoch.
This prevents parked vehicles from retaining engine audio or headlights on one client.

Horn state is intentionally transient rather than durable. The native `VehicleComponent`
horn latch is sampled in the realtime motion stream and observers call `ToggleHorn` only on
edges. Receivers force it off after 350 ms without a fresh owner packet and on every authority
change, so packet loss can never leave a remote horn stuck on.

There is no `setHorn`, `setRpm`, `setSteering`, `setWheelRotation`, or seat-assignment Lua method.
Those values describe native driver input, physics, or the validated occupancy ledger and cannot be
authored as durable script state. Engine, lights, high beams, siren, locks, destruction, immortality,
and invulnerability are the scriptable `flags` bits.

Top speed is the one performance value that *is* scriptable, and it is scriptable in a different
way: not as durable server state but as a client-side ceiling. See
[Performance ceilings](#performance-ceilings).

## Authority and streaming

- Stream-in radius: 350 metres.
- Stream-out radius: 425 metres, providing hysteresis.
- Only the canonical front-left occupant requests a two-second physics lease automatically.
- Valid owner motion renews the lease.
- Exit, timeout, disconnect, stale epoch, or an implausible jump revokes it.
- Create/remove/state/authority use reliable ordered delivery.
- Motion uses unreliable sequenced delivery and is coalesced client-side.
- Observers render through an adaptive jitter buffer. It targets 75-180 ms from the measured
  packet interval and jitter, uses cubic Hermite position interpolation plus shortest-path
  quaternion slerp, and predicts linear/angular motion for at most 180 ms after the newest sample.
- Duplicate/stale ticks are rejected and every authority-epoch change resets history. Throttle,
  brake, burnout, and tire-slip transients decay after 350 ms without fresh owner motion.
- The owner also retains every outgoing motion sample locally. Because the server does not echo
  unreliable motion to its sender, this retained sample is the handoff pose when authority is
  released; exiting a vehicle therefore cannot fall back to its original spawn transform.
- An observer projection uses REDengine's whole-vehicle movement path: simple movement,
  physics masking, and `ForceMoveTo` with the interpolated pose. Open77 deliberately does not
  make streamed vehicles kinematic: runtime tests showed REDengine did not reconstruct a
  driveable backend when local ownership was later acquired. On local ownership, Open77 clears
  the observer physics mask explicitly, disables simple movement, restores player control, enables
  transform updates, and wakes native physics.
- Direct manipulation of a mesh `PhysicalBodyInterface` remains deliberately disabled: that
  prototype crashed the second client during stream-in. Private vehicle entry points are accepted
  only when their 2.31 relocation resolves to the exact audited executable RVA.

### Drivetrain, wheels, and engine audio

The live vehicle blackboard and input state are appended to every owner motion sample.
RPM, maximum RPM, gear, speed, and longitudinal/transversal suspension forces are read from the
2.31 `VehicleDef` blackboard. Throttle, brake, burnout, reverse, and on-ground state come from the
native `vehicleBaseObject`. Observers smooth these values, write them into their streamed
vehicle's blackboard, and update entity-scoped mechanical audio parameters at 30 Hz. Engine pitch,
load, braking, gear, and lateral load therefore follow the network owner instead of being inferred
independently by each client.

Remote engine audio starts when the canonical engine state, a remote driver, or fresh drivetrain
activity proves the engine active. It stops when the engine and driver are inactive, the vehicle
streams out, or authority becomes local. This avoids initial silence while the durable engine bit
lags the realtime motion. Two switchable strategies exist (debug bridge
`vehicle.audiomode_<0-3>`: `0` off, `1` traffic, `2` mechanical, `3` both; **default mechanical**):
*mechanical* engages the vanilla driver-mix state
machine (`vehicleAudioEvent OnPlayerDriving`) and feeds the measured 2.31 RTPC names
(`paramEngineRPM`, `paramVehicleSpeed`, `paramWheelAngularSpeed`, `veh_speed`, `veh_accel`,
`veh_engine_throttle_input`, `paramLongSLip`, `paramLatSlip`, and `paramTotalSlip`) from the
replicated motion at 30 Hz, so pitch, load, and tire stress follow the
network owner. Each engine value is published to the vehicle entity scope consumed by its
model-specific `gameaudioVehicleAudioComponent`, plus the authored engine and general emitters for
spatial voices. *Traffic* is a diagnostic-only mode: it plays the discrete
`<audioResourceName>_traffic_engine_loop` Wwise pair resolved from the live TweakDB record, but
that simplified traffic voice cannot reproduce the local vehicle's complete mechanical timbre.
Four global tyre loops target the template's named wheel emitters and receive
their RTPC slip values independently, which preserves spatial tyre roll and squeal. Replicated
gear transitions additionally play the model's `_gear_up`/`_gear_down` one-shots.

Observer tire smoke uses
`base\fx\vehicles\_skid_marks\skid_fx.effect`; the asphalt trail is a separate native
`base\fx\vehicles\_wheels\skid_marks\sport\v_skid_mark_s_m_01.effect` backed by
`trail_decal.mt`. A deterministic slip signal is derived from
chassis-relative velocity, brake, throttle, and burnout. Hysteresis prevents VFX flicker; one
pair of emitters per rear wheel (one centered pair on bikes) follows safe chassis-relative contact
points. When slip stops, the native effect loop is broken instead of killed: smoke fades for about
2.5 seconds and trail decals remain for their roughly 31-second authored lifetime. Stream-out,
despawn, or authority handoff still performs an immediate cleanup. Exact
surface-material particles are outside the v1 contract. See
`docs/research/vehicle-audio-and-wheel-fx-replication.md` for the evidence and limits.

Body damage is replayed only after the streamed vehicle's authored components have attached.
Broken-glass bits are resolved against that exact vehicle record's destruction-glass list and
then applied through native glass events, so custom/model-specific window component names are
preserved for current viewers and late joiners.

`steering` is normalized to `-1..1` and `wheelRotation` is a wrapped radian phase. REDengine 2.31
does not expose its live steering input through RTTI, but Open77's audited 2.31 adapter reads the
native lateral vehicle input at `vehicleBaseObject+0x278`. The owner therefore transmits real
keyboard/controller steering even while stationary. The authoritative wrapped wheel phase initializes
the observer and replicated velocity advances it every rendered frame without packet-phase feedback.
These values remain available in read-only client snapshots. Open77 does not currently write the
observer's hard-transform wheel bindings: their parent animation graph can be incomplete immediately
after streamed attachment, and querying that graph caused a reproducible null dereference inside
REDengine on both clients. The locally driven vehicle keeps its native wheel animation and real
physics; a lifecycle-safe observer chassis adapter remains required for guaranteed visual wheel pose.

The server validates bucket, claim proximity, owner-to-vehicle proximity, generation/epoch,
monotonic tick, finite values, velocity/RPM/input/suspension bounds, and travelled distance. Client scripts cannot
claim authority directly.

## Multiplayer spawn policy

There is no client-side vehicle creation API. The entire native `vehicle.*` developer-command
module is absent from the client build; the documented commands below are Lua server commands and
therefore use command ACLs. During a multiplayer connection, every vehicle spawn notification is checked
against the live network registry. A REDengine vehicle without a server-issued 64-bit Open77
vehicle id is removed immediately; merely having a local dynamic-entity handle does not count.
Entering an unknown vehicle is independently detected and forcibly unmounted.

This policy complements the multiplayer REDscript suppression of traffic, summons, and ambient
vehicle producers. It is an identity boundary, not just a traffic-density setting.

## Reference resource and commands

`resources/open77_vehicles` is the runnable example. It registers:

```text
vehicle.list [bucket]
vehicle.create <x> <y> <z> [yaw] [model] [bucket]
vehicle.create.player <playerId> [model]
vehicle.remove <id>
vehicle.engine <id> <on|off>
vehicle.lock <id> <on|off>
vehicle.health <id> <0..1>
vehicle.damage.dump <id>
vehicle.glass.break <id> <glassIndex>
vehicle.glass.repair <id> <glassIndex|all>
vehicle.repair <id> [glass|body|lights|tires|visual|mechanical|full]
vehicle.paint <id> <r> <g> <b> [r2 g2 b2]
```

`vehicle.list` and `vehicle.damage.dump` are read-only. Mutation commands are restricted. Grant
the corresponding exact `command.vehicle.*` ACL permissions before using them from chat.

Vehicle record names are listed in the project vehicle catalog. Prefer player variants such as `Vehicle.v_standard2_archer_hella_player`; quest and traffic variants are valid records but are not guaranteed to be pilotable.
