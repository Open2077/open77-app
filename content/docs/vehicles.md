# Network vehicles

CyberM vehicles are server entities. A server resource creates a vehicle, owns its durable state, and removes it. Clients only stream a REDengine projection around their player.

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
| Server | `CyberM.vehicles.*` | 43 methods | Authoritative lifecycle, state, damage, openings, paint, and transform. |
| Client | `CyberM.vehicles.*` | 6 methods | Read-only state plus guarded remote-occupant presentation. |
| Client package | `cyberm_vehicles` exports | 2 exports | Read-only compatibility wrappers. |
| Server low level | FiveM-style globals | 6 functions | Raw implementation surface; prefer `CyberM.vehicles.*`. |

There is deliberately no client API for breaking or repairing glass, tyres, lights, or bodywork.
A client observes native damage and sends a bounded witness report; the server merges destructive
state monotonically. Scripted mutation uses the server methods below.

### All server lifecycle and state methods

Every method in this table requires `world.vehicles`.

| Method | Signature | Return / behavior |
|---|---|---|
| `CyberM.vehicles.create` | `(definition)` | Vehicle ID, or `nil, reason`. |
| `CyberM.vehicles.update` | `(id, patch)` | `boolean`; replaces supplied canonical fields. |
| `CyberM.vehicles.get` | `(id)` | Server snapshot or `nil`. |
| `CyberM.vehicles.all` | `(bucket?)` | Array of server snapshots, ordered by ID. |
| `CyberM.vehicles.remove` | `(id)` | `boolean`; only the creating resource can remove it. |
| `CyberM.vehicles.setTransform` | `(id, transform)` | `boolean`; position plus yaw, revoking any active physics lease. |
| `CyberM.vehicles.getDamage` | `(id)` | `{ body, glass, lights, tires }`, or `nil`. |
| `CyberM.vehicles.setDamage` | `(id, damage)` | `boolean`; combined damage update. |
| `CyberM.vehicles.repair` | `(id, scope?)` | `boolean`; scope is `glass`, `body`, `lights`, `tires`, `visual`, `mechanical`, or `full`. |
| `CyberM.vehicles.registerDamageProfile` | `(record, profile)` | `true`; registers names inside the calling resource VM. |
| `CyberM.vehicles.getDamageProfile` | `(record)` | This resource's profile or `nil`. |

### All server body-damage methods

Body cells use Lua indexes **1..30** and normalized finite values **0..1**.

| Method | Signature | Return / behavior |
|---|---|---|
| `CyberM.vehicles.setBodyDamage` | `(id, values)` | Replaces the exact 30-value grid. |
| `CyberM.vehicles.setBodyCell` | `(id, cell, value)` | Sets one normalized cell. |
| `CyberM.vehicles.damageBodyCell` | `(id, cell, amount)` | Adds damage and clamps the result to 0..1. |
| `CyberM.vehicles.repairBodyCell` | `(id, cell)` | Sets one cell to zero. |
| `CyberM.vehicles.setBodyZone` | `(id, zone, value)` | Sets every cell in a named zone or explicit index array. |
| `CyberM.vehicles.damageBodyZone` | `(id, zone, amount)` | Adds and clamps damage across a zone. |
| `CyberM.vehicles.repairBodyZone` | `(id, zone)` | Clears a zone. |

`CyberM.vehicles.bodyZones` contains `backLeft`, `back`, `backRight`, `left`, `center`, `right`,
`frontLeft`, `front`, `frontRight`, `lower`, `roof`, and `all`. A damage profile can override or
extend the zone map for one vehicle record.

### All server glass, light, and tyre methods

Glass and light indexes are **0..31**. Tyre indexes are **0..3**. Glass ordering comes from the
specific vehicle record's `Destruction.Glass` list; it is not equivalent to the four openable
side-window indexes.

| Method | Signature | Return / behavior |
|---|---|---|
| `CyberM.vehicles.setGlassMask` | `(id, mask)` | Replaces the 32-bit broken-glass mask. |
| `CyberM.vehicles.setGlassBroken` | `(id, glass, broken)` | Sets one numeric or profile-named glass bit. |
| `CyberM.vehicles.breakGlass` | `(id, glass)` | Sets one glass bit. |
| `CyberM.vehicles.repairGlass` | `(id, glass)` | Clears one glass bit. |
| `CyberM.vehicles.breakAllGlass` | `(id, count?)` | Breaks the first `count` bits; default is all 32. |
| `CyberM.vehicles.repairAllGlass` | `(id)` | Clears the entire glass mask. |
| `CyberM.vehicles.setLightMask` | `(id, mask)` | Replaces the 32-bit broken-light mask. |
| `CyberM.vehicles.setLightBroken` | `(id, index, broken)` | Sets or clears one light bit. |
| `CyberM.vehicles.breakLight` | `(id, index)` | Sets one light bit. |
| `CyberM.vehicles.repairLight` | `(id, index)` | Clears one light bit. |
| `CyberM.vehicles.repairAllLights` | `(id)` | Clears the complete light mask. |
| `CyberM.vehicles.setTireMask` | `(id, mask)` | Replaces the four-bit broken-tyre mask. |
| `CyberM.vehicles.setTireBroken` | `(id, index, broken)` | Sets or clears one tyre bit. |
| `CyberM.vehicles.breakTire` | `(id, index)` | Sets one tyre bit. |
| `CyberM.vehicles.repairTire` | `(id, index)` | Clears one tyre bit. |
| `CyberM.vehicles.repairAllTires` | `(id)` | Clears the complete tyre mask. |

### All server door and openable-window methods

Doors are a six-bit reversible state. Openable windows are a separate four-bit reversible state;
neither mask represents broken glass.

| Method | Signature | Return / behavior |
|---|---|---|
| `CyberM.vehicles.setDoorMask` | `(id, mask)` | Replaces the door/trunk/hood mask; range 0..63. |
| `CyberM.vehicles.setDoorOpen` | `(id, door, opened)` | Sets one opening bit. |
| `CyberM.vehicles.openDoor` | `(id, door)` | Opens one door, trunk, or hood. |
| `CyberM.vehicles.closeDoor` | `(id, door)` | Closes one door, trunk, or hood. |
| `CyberM.vehicles.isDoorOpen` | `(id, door)` | `boolean`, or `nil` for an unknown vehicle. |
| `CyberM.vehicles.setWindowOpen` | `(id, window, opened)` | Sets one side-window opening bit. |
| `CyberM.vehicles.openWindow` | `(id, window)` | Opens one side window. |
| `CyberM.vehicles.closeWindow` | `(id, window)` | Closes one side window. |
| `CyberM.vehicles.isWindowOpen` | `(id, window)` | `boolean`, or `nil` for an unknown vehicle. |

The remaining `CyberM.vehicles.update` fields are `health`, `flags`, `primaryColor`,
`secondaryColor`, `doors`, `windows`, `tires`, `bodyDamage`, `brokenGlass`, and `brokenLights`.

### Exact client methods

| Method | Permission | Signature | Return / behavior |
|---|---|---|---|
| `CyberM.vehicles.get` | `vehicles.read` | `(id)` | One streamed client snapshot or `nil`. |
| `CyberM.vehicles.all` | `vehicles.read` | `()` | All currently streamed snapshots; empty when unavailable or denied. |
| `CyberM.vehicles.isDoorOpen` | `vehicles.read` | `(id, door)` | Reads the canonical six-bit door state. |
| `CyberM.vehicles.isWindowOpen` | `vehicles.read` | `(id, window)` | Reads the canonical four-bit opening state, not broken glass. |
| `CyberM.vehicles.warpPlayerIntoVehicle` | `vehicles.presentation` | `(playerId, vehicleId, seat)` | Instantly presents an already-authorized remote occupant. |
| `CyberM.vehicles.taskPlayerEnterVehicle` | `vehicles.presentation` | `(playerId, vehicleId, seat)` | Reserved animated path; currently fails closed with `animated_entry_unsupported`. |

Client constants are `CyberM.vehicles.doors`, `CyberM.vehicles.windows`, and
`CyberM.vehicles.seats`. They are tables, not callable methods.

### Official package exports

The `cyberm_vehicles` client package exposes only:

| Export | Signature | Result |
|---|---|---|
| `get` | `get(id)` | Compatibility wrapper over `CyberM.vehicles.get`. |
| `all` | `all()` | Compatibility wrapper over `CyberM.vehicles.all`. |

Call them with `CyberM.exports.call("cyberm_vehicles", "get", id)` or the FiveM-style export
proxy. The package intentionally exposes no mutation export.

### Low-level server globals

These six globals are public for framework compatibility, but the namespaced API above supplies
structured tables, defaults, and helper validation.

| Global | Signature |
|---|---|
| `CreateVehicle` | `(record, x, y, z, yaw, bucket, appearance, health, flags, primaryR, primaryG, primaryB, secondaryR, secondaryG, secondaryB)` |
| `UpdateVehicleState` | `(id, health, flags, primaryR, primaryG, primaryB, secondaryR, secondaryG, secondaryB, doors, windows, tires, bodyDamage30, brokenGlass, brokenLights)` |
| `SetVehicleTransform` | `(id, x, y, z, yaw)` |
| `RemoveVehicle` | `(id)` |
| `GetVehicle` | `(id)` |
| `GetVehicles` | `(bucket?)` |

## Server API

```lua
local id, reason = CyberM.vehicles.create({
    record = "Vehicle.v_standard2_archer_hella_player",
    appearance = "default",
    position = { x = -1607.4, y = 1268.2, z = 18.1 },
    yaw = 90.0,
    bucket = 0,
    health = 1.0,
    flags = CyberM.vehicles.flags.locked,
    primaryColor = { r = 22, g = 105, b = 180 },
    secondaryColor = { r = 8, g = 15, b = 24 },
})
```

### `CyberM.vehicles.create(definition)`

Creates a generation-checked 64-bit vehicle id. Required fields are `record` and `position`. Optional fields are `appearance`, `yaw`, `bucket`, `health`, `flags`, `primaryColor`, and `secondaryColor`. Returns `id`, or `nil, reason`.

### `CyberM.vehicles.update(id, patch)`

Updates durable state. Supported fields are `health`, `flags`, `primaryColor`, `secondaryColor`,
`doors`, `windows`, `tires`, `bodyDamage`, `brokenGlass`, `brokenLights`, and the nested
`damage = { body, glass, lights, tires }` form. `windows` means opened windows; it is deliberately
separate from `brokenGlass`. Door bits are front-left, front-right, back-left, back-right, trunk,
and hood. Window/tire bits use the first four positions.

```lua
local flags = CyberM.vehicles.flags.engineOn | CyberM.vehicles.flags.lightsOn
CyberM.vehicles.update(id, { flags = flags, health = 0.85 })
```

Available flags:

| Constant | Value | Constant | Value |
|---|---:|---|---:|
| `CyberM.vehicles.flags.engineOn` | `1` | `CyberM.vehicles.flags.locked` | `2` |
| `CyberM.vehicles.flags.destroyed` | `4` | `CyberM.vehicles.flags.exploded` | `8` |
| `CyberM.vehicles.flags.invulnerable` | `16` | `CyberM.vehicles.flags.immortal` | `32` |
| `CyberM.vehicles.flags.lightsOn` | `64` | `CyberM.vehicles.flags.highBeams` | `128` |
| `CyberM.vehicles.flags.sirenOn` | `256` |  |  |

Combine flags with Lua 5.4 bitwise operators (`|`, `&`, `~`). Never replace the complete mask when
you only intend to toggle one bit without first reading the current canonical value.

### Doors, trunk, hood, and windows

Openings have named, persistent server APIs. They are replicated to current viewers and included
in stream-in/late-join state. Live changes use the vehicle's native animation; the initial streamed
state is applied immediately so an already-open trunk does not visibly replay from closed.

```lua
CyberM.vehicles.openDoor(id, "trunk")
CyberM.vehicles.closeDoor(id, "hood")
CyberM.vehicles.setDoorOpen(id, CyberM.vehicles.doors.frontRight, true)

if CyberM.vehicles.isDoorOpen(id, "trunk") then
    -- Server-side inventory logic can now expose the trunk contents.
end

CyberM.vehicles.openWindow(id, "frontLeft")
CyberM.vehicles.closeWindow(id, CyberM.vehicles.windows.frontLeft)
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
CyberM.vehicles.breakGlass(id, 0)
CyberM.vehicles.repairGlass(id, 0)
CyberM.vehicles.breakAllGlass(id)       -- all 32 mask bits
CyberM.vehicles.breakAllGlass(id, 6)    -- first six glass records
CyberM.vehicles.repairAllGlass(id)

CyberM.vehicles.setTireBroken(id, 0, true)
CyberM.vehicles.repairTire(id, 0)
CyberM.vehicles.setLightBroken(id, 2, true)
CyberM.vehicles.repairLight(id, 2)

CyberM.vehicles.damageBodyCell(id, 13, 0.25) -- cells are Lua indices 1..30
CyberM.vehicles.damageBodyZone(id, "front", 0.40)
CyberM.vehicles.repairBodyZone(id, "front")
CyberM.vehicles.repair(id, "visual")
CyberM.vehicles.repair(id, "full")
```

Available body zones are `backLeft`, `back`, `backRight`, `left`, `center`, `right`,
`frontLeft`, `front`, `frontRight`, `lower`, `roof`, and `all`. The low-level API remains exposed
for custom damage systems:

```lua
local damage = CyberM.vehicles.getDamage(id)
damage.body[14] = 0.9
damage.glass = damage.glass | (1 << 3)
CyberM.vehicles.setDamage(id, damage)

CyberM.vehicles.setBodyDamage(id, thirtyNormalizedValues)
CyberM.vehicles.setGlassMask(id, 0x15)
CyberM.vehicles.setLightMask(id, 0x02)
CyberM.vehicles.setTireMask(id, 0x05)
```

Glass ordering is record-specific. A resource can register readable names instead of spreading
numeric indices throughout gameplay code:

```lua
CyberM.vehicles.registerDamageProfile("Vehicle.v_standard2_archer_hella_player", {
    glass = { windshield = 0, rearWindow = 1, frontLeft = 2, frontRight = 3 },
    bodyZones = { engineBay = { 13, 14, 15 } },
})

CyberM.vehicles.breakGlass(id, "windshield")
CyberM.vehicles.damageBodyZone(id, "engineBay", 0.5)
```

CyberM intentionally does not ship guessed glass names: the `Destruction.Glass` order differs by
vehicle record. Numeric glass/light indices are `0..31`, tyre indices are `0..3`, and all body
values are finite normalized values in `0..1`.

### Other server calls

```lua
CyberM.vehicles.setTransform(id, { x = 10, y = 20, z = 30, yaw = 180 })
CyberM.vehicles.get(id)
CyberM.vehicles.all()
CyberM.vehicles.all(bucket)
CyberM.vehicles.remove(id)
```

`setTransform` is server-authoritative: it revokes an active physics lease, advances the
authority epoch, and publishes the complete canonical transform to every current viewer.

`get` and `all` also return the canonical seat ledger:

```lua
local vehicle = CyberM.vehicles.get(id)
for _, occupant in ipairs(vehicle.occupants) do
    print(occupant.playerId, occupant.seat)
end
```

Seat names are `seat_front_left`, `seat_front_right`, `seat_back_left`, and
`seat_back_right`. `seat_front_left` is the only driver seat. Scripts cannot write this
ledger directly: it is produced by native mount detection and validated by the server.

### Server snapshot fields

`CyberM.vehicles.get` and each entry returned by `all` contain:

| Group | Fields |
|---|---|
| Identity | `id`, `resource`, `record`, `appearance`, `revision` |
| World | `bucket`, `x`, `y`, `z` |
| Authority | `physicsOwner`, `authorityEpoch` |
| Durable state | `health`, `flags`, `doors`, `windows`, `tires`, `brokenGlass`, `brokenLights` |
| Paint | `primaryR`, `primaryG`, `primaryB`, `secondaryR`, `secondaryG`, `secondaryB` |
| Body | `bodyDamage[1..30]` |
| Damage view | `damage = { body, glass, lights, tires }` |
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
    local canonical = CyberM.vehicles.get(tonumber(id))
end)

AddEventHandler("onVehicleDamageChanged", function(id, revision)
    local damage = CyberM.vehicles.getDamage(tonumber(id))
end)
```

Server runtime event arguments arrive as strings. Preserve the ID as an opaque value unless the
called binding explicitly requires an integer. `onVehicleUpdated` fires for every canonical state
update; `onVehicleDamageChanged` is the narrower damage-specific signal.

Resources can mutate or remove only their own vehicles. Stopping or reloading a resource removes every vehicle it owns.

## Client API

The client state surface is intentionally read-only:

```lua
local vehicle = CyberM.vehicles.get(id)
local streamed = CyberM.vehicles.all()
local trunkOpen = CyberM.vehicles.isDoorOpen(id, "trunk")
local hoodOpen = CyberM.vehicles.isDoorOpen(id, CyberM.vehicles.doors.hood)
```

Trusted presentation resources can request an entry presentation or use an explicit instant warp:

```lua
-- FiveM-compatible seat numbers: driver=-1, front passenger=0,
-- rear-left=1, rear-right=2.
local ok, reason = CyberM.vehicles.taskPlayerEnterVehicle(
    playerId, vehicleId, CyberM.vehicles.seats.frontPassenger)

-- Recovery, stream reconstruction, teleport-oriented game modes, or tests.
ok, reason = CyberM.vehicles.warpPlayerIntoVehicle(
    playerId, vehicleId, CyberM.vehicles.seats.driver)
```

Named seats (`driver`, `frontPassenger`, `rearLeft`, `rearRight`, `frontLeft`,
`frontRight`, `backLeft`, `backRight`, and canonical `seat_*` names) are accepted too.
These functions operate only on remote player proxies. They return
`false, "occupancy_mismatch"` unless the replicated server ledger already contains that exact
tuple. They cannot grant a seat, move the local player, steal a vehicle, or change physics
authority.

`taskPlayerEnterVehicle` is currently fail-closed and returns
`false, "animated_entry_unsupported"`. The first implementation forwarded the vanilla NPC
`MountAIEvent` to CyberM's player proxy; a two-client runtime test showed that REDengine can
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
| Durable state | `health`, `flags`, `doors`, `windows`, `tires`, `brokenGlass`, `brokenLights` |
| Body and damage | `bodyDamage[1..30]`, `damage = { body, glass, lights, tires }` |
| Drivetrain | `speed`, `rpm`, `rpmMax`, `throttle`, `brake`, `gear`, `burnout` |
| Wheels/suspension | `steering`, `wheelRotation`, `suspensionLongitudinal`, `suspensionTransversal`, `onGround`, `reversing` |
| Seats | `occupants[] = { playerId, seat }` |

`entity` is an ephemeral, generation-checked CyberM handle for the local projection.
`engineEntity` is diagnostic engine identity. Neither is the durable server vehicle ID, and neither
should be cached after stream-out. Client snapshots do not include server ownership metadata such
as `resource`, `bucket`, paint channels, or world coordinates.

Client events:

```lua
AddEventHandler("cyberm:vehicleCreated", function(id) end)
AddEventHandler("cyberm:vehicleRemoved", function(id, reason) end)
AddEventHandler("cyberm:vehicleAuthorityChanged", function(id, ownerPlayerId) end)
AddEventHandler("cyberm:vehicleOccupancyChanged", function(id, revision) end)
AddEventHandler("cyberm:vehicleDamageChanged", function(id, revision) end)
```

The reference resource also emits `cyberm:vehicleOwnerChanged(id, ownerPlayerId)` and
`cyberm:vehicleSeatsChanged(vehicleSnapshot, revision)`. The latter resolves the fresh snapshot
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
   the snapshot removes the player, CyberM discards that disposable
   native proxy and recreates it from the next authoritative player snapshot. This avoids reusing
   a REDengine puppet whose vehicle workspot left its locomotion representation inactive.
6. Root player movement is suspended only after the native mount is confirmed, avoiding a
   transform fight between pedestrian interpolation and the vehicle mounting system. A fresh
   pedestrian controller is installed on the replacement proxy after exit.

If a local engine mount disagrees with the server for two seconds (for example a locked seat
was rejected), CyberM unmounts the player. Disconnect, vehicle removal, seat change, and exit
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

## Authority and streaming

- Stream-in radius: 350 metres.
- Stream-out radius: 425 metres, providing hysteresis.
- Only the canonical front-left occupant requests a two-second physics lease automatically.
- Valid owner motion renews the lease.
- Exit, timeout, disconnect, stale epoch, or an implausible jump revokes it.
- Create/remove/state/authority use reliable ordered delivery.
- Motion uses unreliable sequenced delivery and is coalesced client-side.
- Observers interpolate and briefly extrapolate the latest accepted transform.
- The owner also retains every outgoing motion sample locally. Because the server does not echo
  unreliable motion to its sender, this retained sample is the handoff pose when authority is
  released; exiting a vehicle therefore cannot fall back to its original spawn transform.
- An observer projection uses REDengine's whole-vehicle movement path: simple movement,
  physics masking, and `ForceMoveTo` with the interpolated pose. CyberM deliberately does not
  make streamed vehicles kinematic: runtime tests showed REDengine did not reconstruct a
  driveable backend when local ownership was later acquired. On local ownership, CyberM clears
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

Remote engine audio starts when the canonical engine state turns on and stops when it turns off,
streams out, or authority becomes local. Two switchable strategies exist (debug bridge
`vehicle.audiomode_<0-3>`; default mechanical): *mechanical* engages the vanilla driver-mix state
machine (`vehicleAudioEvent OnPlayerDriving`) and feeds the measured 2.31 RTPC names
(`paramEngineRPM`, `paramVehicleSpeed`, `paramWheelAngularSpeed`, `veh_speed`, `veh_accel`,
`veh_engine_throttle_input`) from the replicated motion at 30 Hz, so pitch and load follow the
network owner; *traffic* plays the model's discrete `<audioResourceName>_traffic_engine_loop`
Wwise pair resolved from the live TweakDB record. Replicated gear transitions additionally play
the model's `_gear_up`/`_gear_down` one-shots. See
`docs/research/vehicle-audio-and-wheel-fx-replication.md` for the evidence and validation plan.

Body damage is replayed only after the streamed vehicle's authored components have attached.
Broken-glass bits are resolved against that exact vehicle record's destruction-glass list and
then applied through native glass events, so custom/model-specific window component names are
preserved for current viewers and late joiners.

`steering` is normalized to `-1..1` and `wheelRotation` is a wrapped radian phase. REDengine 2.31
does not expose its live steering input through RTTI, but CyberM's audited 2.31 adapter reads the
native lateral vehicle input at `vehicleBaseObject+0x278`. The owner therefore transmits real
keyboard/controller steering even while stationary. The authoritative wrapped wheel phase initializes
the observer and replicated velocity advances it every rendered frame without packet-phase feedback.
These values remain available in read-only client snapshots. CyberM does not currently write the
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
against the live network registry. A REDengine vehicle without a server-issued 64-bit CyberM
vehicle id is removed immediately; merely having a local dynamic-entity handle does not count.
Entering an unknown vehicle is independently detected and forcibly unmounted.

This policy complements the multiplayer REDscript suppression of traffic, summons, and ambient
vehicle producers. It is an identity boundary, not just a traffic-density setting.

## Reference resource and commands

`resources/cyberm_vehicles` is the runnable example. It registers:

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
