# Network vehicles

Create and manage network vehicles on the server. Resources with `world.vehicles` control canonical state and lifecycle; clients render nearby projections.

Find weapon-equipped model IDs in the [armed vehicle spawn catalogue](armed-vehicles.md), including mount declarations and special-purpose variants.

For weapon replication, release compatibility, damage policy, current limitations and the twelve client-side armament, ammo, heat and selection queries, see the dedicated [armed vehicles and weapon Lua API guide](vehicle-weapons.md).

## Manifest

```lua
permissions { "world.vehicles", "vehicles.read", "vehicles.presentation", "vehicles.control" }
```

`world.vehicles` is a server permission. `vehicles.read` exposes the read-only client projection.
`vehicles.presentation` is optional and permits a client resource to select the visual entry path
for an occupant whose exact player, vehicle, and seat were already validated by the server.
`vehicles.control` is optional and lets a client resource sound the horn of a vehicle currently
simulated by that client; it never grants authority over another player's vehicle.

## Complete Lua API inventory

The vehicle surface is intentionally asymmetric:

| Runtime | Surface | Mutation |
|---|---|---|
| Server | `Open77.vehicles.*` | Authoritative lifecycle, seats, lock state, horn routing, damage, detached parts, openings, paint, and transform. |
| Client | `Open77.vehicles.*` | Read-only state, locally-owned horn control, and guarded remote-occupant presentation. |
| Client package | `open77_vehicles` exports | Read-only compatibility wrappers. |
| Server low level | FiveM-style globals | Raw implementation surface; prefer `Open77.vehicles.*`. |

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
| `Open77.vehicles.remove` | `(id)` | `boolean`; removes any canonical vehicle. |
| `Open77.vehicles.setTransform` | `(id, transform)` | `boolean`; position plus yaw, revoking any active physics lease. |
| `Open77.vehicles.getDamage` | `(id)` | `{ body, glass, lights, tires, detachedParts }`, or `nil`. |
| `Open77.vehicles.setDamage` | `(id, damage)` | `boolean`; combined damage update. |
| `Open77.vehicles.repair` | `(id, scope?)` | `boolean`; scope is `glass`, `body`, `lights`, `tires`, `visual`, `mechanical`, or `full`. |
| `Open77.vehicles.setPaint` | `(id, paint)` | `boolean`; publishes canonical primary/secondary paint. |
| `Open77.vehicles.getPaint` | `(id)` | `{ applied, primary, secondary }`, or `nil`. |
| `Open77.vehicles.resetPaint` | `(id)` | `boolean`; restores the model's original paint. |
| `Open77.vehicles.getProperties` | `(id)` | The whole property table a garage stores, or `nil, reason`. Alias: `getVehicleProperties`. |
| `Open77.vehicles.setProperties` | `(id, props, options?)` | Applies one. Refuses a FiveM property with no counterpart **by name**. Aliases: `setVehicleProperties`, `applyProperties`. |
| `Open77.vehicles.unsupportedProperties` | *(table)* | Every such property name, mapped to why there is nothing to map it to. |
| `Open77.vehicles.getAppearance` | `(id)` | The entity appearance variant, or `""` for the record's default. |
| `Open77.vehicles.setAppearance` | `(id, name?)` | Swaps the variant. Also needs `world.vehicles.appearance` to CHANGE one. |
| `Open77.vehicles.getLightsHue` | `(id)` | CrystalCoat lights hue `0..1`, or `nil`. Alias: `getHeadlightHue`. |
| `Open77.vehicles.setLightsHue` | `(id, hue?)` | Tints the car's own lights; `nil` restores the record's colour. |
| `Open77.vehicles.clearLightsHue` | `(id)` | `setLightsHue(id, nil)`. |
| `Open77.vehicles.setHeadlightColor` | `(id, color?)` | The same tint from an RGB colour. Alias: `setHeadlightColour`. |
| `Open77.vehicles.setLocked` | `(id, locked)` | `boolean`; atomically changes the durable entry lock. |
| `Open77.vehicles.lock` | `(id)` | Convenience alias for `setLocked(id, true)`. |
| `Open77.vehicles.unlock` | `(id)` | Convenience alias for `setLocked(id, false)`. |
| `Open77.vehicles.isLocked` | `(id)` | Canonical entry-lock boolean, or `nil` for an unknown vehicle. |
| `Open77.vehicles.triggerHorn` | `(id, durationMs?)` | Routes a reliable synchronized horn command to the owner or parked viewers. |
| `Open77.vehicles.honk` | `(id, durationMs?)` | Alias of `triggerHorn`; default duration is 250 ms. |
| `Open77.vehicles.registerDamageProfile` | `(record, profile)` | `true`; registers names inside the calling resource VM. |
| `Open77.vehicles.getDamageProfile` | `(record)` | This resource's profile or `nil`. |
| `Open77.vehicles.warpPlayerIntoVehicle` | `(playerId, vehicleId, seat, options?)` | Authoritatively assigns and eventually warps a player into any canonical vehicle. |
| `Open77.vehicles.setPlayerIntoVehicle` | `(playerId, vehicleId, seat, options?)` | Alias of `warpPlayerIntoVehicle`. |
| `Open77.vehicles.forcePlayerOutOfVehicle` | `(playerId, vehicleId?)` | Forces native exit and retains the seat until confirmation/timeout. |
| `Open77.vehicles.removePlayerFromVehicle` | `(playerId, vehicleId?)` | Alias of `forcePlayerOutOfVehicle`. |
| `Open77.vehicles.taskPlayerEnter` | `(playerId, vehicleId, seat, options?)` | Same assignment as `warpPlayerIntoVehicle`, reached through the vanilla entry animation. |
| `Open77.vehicles.taskPlayerEnterVehicle` | `(playerId, vehicleId, seat, options?)` | Alias of `taskPlayerEnter`. |
| `Open77.vehicles.taskPlayerLeave` | `(playerId, vehicleId?)` | Same ejection as `forcePlayerOutOfVehicle`; the leaving player's own exit is instant. |
| `Open77.vehicles.taskPlayerLeaveVehicle` | `(playerId, vehicleId?)` | Alias of `taskPlayerLeave`. |
| `Open77.vehicles.adopt` | `(playerId, description)` | Turns a client's description of a vanilla car into a canonical vehicle. |
| `Open77.vehicles.setAdoptPolicy` | `(policy, options?)` | Opens a routing bucket to adoption: `none`, `driver` or `any`. |
| `Open77.vehicles.getAdoptPolicy` | `(bucket?)` | Reads one bucket's adoption policy. |
| `Open77.vehicles.setPlayerExitLocked` | `(playerId, locked, vehicleId?)` | Sets the durable no-exit policy. |
| `Open77.vehicles.getPlayerSeat` | `(playerId)` | Canonical server seat assignment or `nil`. |
| `Open77.vehicles.isPlayerExitLocked` | `(playerId)` | Whether the canonical assignment is exit-locked. |

### All server engine, light and siren methods

Every method in this table requires `world.vehicles`. Each writes **one named bit** of the durable
flags and leaves the rest alone; see [engine, lights and siren](#engine-lights-and-siren) for why
that matters and for the ten-second intent window that makes a setter stick.

| Method | Signature | Return / behavior |
|---|---|---|
| `Open77.vehicles.setEngine` | `(id, on)` | `true`, or `false, reason`. |
| `Open77.vehicles.startEngine` | `(id)` | Alias for `setEngine(id, true)`. |
| `Open77.vehicles.stopEngine` | `(id)` | Alias for `setEngine(id, false)`. |
| `Open77.vehicles.isEngineOn` | `(id)` | Canonical boolean, or `nil, reason`. |
| `Open77.vehicles.setDrivable` | `(id, drivable)` | Out of service also cuts the engine, in one revision. |
| `Open77.vehicles.setUndriveable` | `(id, undriveable)` | Inverted spelling of `setDrivable`. |
| `Open77.vehicles.isDrivable` | `(id)` | Canonical boolean, or `nil, reason`. |
| `Open77.vehicles.setFrozen` | `(id, frozen)` | Pins the car where it stands; nothing electrical changes. See [freezing a car](#freezing-a-car). |
| `Open77.vehicles.isFrozen` | `(id)` | Canonical boolean, or `nil, reason`. |
| `Open77.vehicles.setLights` | `(id, mode)` | `"off"`, `"on"`, `"high"`, or a boolean. |
| `Open77.vehicles.setHighBeams` | `(id, on)` | Raises or drops the beams without going dark. |
| `Open77.vehicles.getLights` | `(id)` | `"off"`, `"on"` or `"high"`, or `nil, reason`. |
| `Open77.vehicles.areLightsOn` | `(id)` | True for both `"on"` and `"high"`. |
| `Open77.vehicles.setSiren` | `(id, on)` | Light bar **and** sound; they cannot be separated. |
| `Open77.vehicles.isSirenOn` | `(id)` | Canonical boolean, or `nil, reason`. |
| `Open77.vehicles.setHealth` | `(id, health)` | `0..1`; out of range is refused, not clamped. |
| `Open77.vehicles.getHealth` | `(id)` | Canonical normalized health, or `nil, reason`. |
| `Open77.vehicles.setEngineHealth` | `(id, health)` | The same one pool under its FiveM name. |
| `Open77.vehicles.getEngineHealth` | `(id)` | The same one pool under its FiveM name. |

### All server transform, motion and policy methods

Every method in this table requires `world.vehicles`, and every one of them sees **only
server-spawned vehicles** -- see [what `closest` can and cannot
find](#what-closest-can-and-cannot-find).

| Method | Signature | Return / behavior |
|---|---|---|
| `Open77.vehicles.getPosition` | `(id)` | `{ x, y, z }`, a vector3, or `nil, reason`. |
| `Open77.vehicles.getHeading` | `(id)` | Heading in degrees, or `nil, reason`. |
| `Open77.vehicles.getYaw` | `(id)` | Alias of `getHeading`. |
| `Open77.vehicles.getSpeed` | `(id)` | Metres per second, or `nil, reason`. |
| `Open77.vehicles.getSpeedKph` | `(id)` | Kilometres per hour, or `nil, reason`. |
| `Open77.vehicles.getVelocity` | `(id)` | `{ x, y, z }` in m/s, or `nil, reason`. |
| `Open77.vehicles.getDriver` | `(id)` | The driving player id, or `nil`. |
| `Open77.vehicles.owner` | `(id)` | Who simulates the car, in what capacity and since when; see [who owns a car](#who-owns-a-car). |
| `Open77.vehicles.requestAuthority` | `(id, playerId)` | Asks that one client simulate the car; refused by name, never a steal. |
| `Open77.vehicles.setPerformance` | `(id, profile)` | `boolean, reason?`; `nil` clears the ceiling. |
| `Open77.vehicles.clearPerformance` | `(id)` | `boolean, reason?`; rated performance again. |
| `Open77.vehicles.getPerformance` | `(id)` | `{ topSpeedKph, accelerationScale, taperKph }`, or `nil`. |
| `Open77.vehicles.explode` | `(id)` | `boolean, reason?`; `already_exploded` the second time. |
| `Open77.vehicles.setLockedForPlayer` | `(id, playerId, locked)` | `boolean, reason?`; `nil` clears the exception. |
| `Open77.vehicles.clearLockedForPlayer` | `(id, playerId)` | `boolean, reason?`. |
| `Open77.vehicles.setLockedForAll` | `(id, locked)` | `boolean, reason?`; revokes every exception. |
| `Open77.vehicles.lockForAll` | `(id)` | Alias for `setLockedForAll(id, true)`. |
| `Open77.vehicles.unlockForAll` | `(id)` | Alias for `setLockedForAll(id, false)`. |
| `Open77.vehicles.isLockedForPlayer` | `(id, playerId)` | `boolean`, or `nil, reason`. |
| `Open77.vehicles.setTimeToLive` | `(id, ttlMs)` | `boolean, reason?`; `0` or `nil` cancels. |
| `Open77.vehicles.setTtl` | `(id, ttlMs)` | Alias of `setTimeToLive`. |
| `Open77.vehicles.setPersistent` | `(id, persistent)` | `boolean, reason?`. |
| `Open77.vehicles.setDespawnWhenUnobserved` | `(id, despawn)` | `boolean, reason?`. |

### All server vehicle-finding methods

Every method in this table requires `world.vehicles`. **They see only server-spawned vehicles** --
see [what `closest` can and cannot find](#what-closest-can-and-cannot-find).

| Method | Signature | Return / behavior |
|---|---|---|
| `Open77.vehicles.nearby` | `(anchor, radius?, options?)` | Array of proximity entries, nearest first. |
| `Open77.vehicles.closest` | `(anchor, options?)` | One entry, or a bare `nil` when nothing is in range. |
| `Open77.vehicles.seatFree` | `(id, seat)` | `boolean`, or `nil, reason`. |
| `Open77.vehicles.occupantInSeat` | `(id, seat)` | `playerId, occupant`, or `nil` when free. |
| `Open77.vehicles.freeSeats` | `(id)` | Canonical seat names in seat order, or `nil, reason`. |
| `Open77.vehicles.seatName` | `(seat)` | Canonical spelling of any accepted seat form. |

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
| `Open77.vehicles.getPaint` | `vehicles.read` | `(id)` | Read-only `{ applied, primary, secondary }`, or `nil`. |
| `Open77.vehicles.isLocked` | `vehicles.read` | `(id)` | Reads the replicated durable entry lock, or `nil`. |
| `Open77.vehicles.triggerHorn` / `honk` | `vehicles.control` | `(id, durationMs?)` | Sounds a streamed vehicle only when this client is its current physics owner. |
| `Open77.vehicles.getPlayerSeat` | `vehicles.read` | `(playerId?)` | Replicated seat assignment; omitted ID selects the local player. |
| `Open77.vehicles.isPlayerExitLocked` | `vehicles.read` | `(playerId?)` | Replicated exit-lock state, or `nil` without an assignment. |
| `Open77.vehicles.isDoorOpen` | `vehicles.read` | `(id, door)` | Reads the canonical six-bit door state. |
| `Open77.vehicles.isWindowOpen` | `vehicles.read` | `(id, window)` | Reads the canonical four-bit opening state, not broken glass. |
| `Open77.vehicles.warpPlayerIntoVehicle` | `vehicles.presentation` | `(playerId, vehicleId, seat)` | Instantly presents an already-authorized remote occupant. |
| `Open77.vehicles.taskPlayerEnterVehicle` | `vehicles.presentation` | `(playerId, vehicleId, seat)` | Guarded staged entry presentation for an already-authorized remote occupant. |
| `Open77.vehicles.adoptable` | `vehicles.read` | `(options?)` | Every engine-spawned vehicle near the player that the server does not own, nearest first. |
| `Open77.vehicles.describeAdoptable` | `vehicles.read` | `(engineEntity)` | The same description for one named chassis. |
| `Open77.vehicles.releaseAdopted` | `vehicles.adopt` | `(engineEntity)` | Hands one engine-spawned chassis back to the population system. |
| `Open77.vehicles.setPerformance` | `vehicles.performance` | `(id, profile)` | Caps one vehicle's top speed and pickup. |
| `Open77.vehicles.clearPerformance` | `vehicles.performance` | `(id)` | Removes that vehicle's cap. |
| `Open77.vehicles.setPerformanceClass` | `vehicles.performance` | `(record, profile)` | Caps every present and future vehicle of one TweakDB record. |
| `Open77.vehicles.clearPerformanceClass` | `vehicles.performance` | `(record)` | Removes that record's cap. |
| `Open77.vehicles.clearAllPerformance` | `vehicles.performance` | `()` | Drops every cap, instance and class. |
| `Open77.vehicles.setControlLock` | `vehicles.performance` | `(id, locked)` | Suppresses or restores acceleration and brake/reverse input for a stationary vehicle. |
| `Open77.vehicles.setFrozen` | `vehicles.performance` | `(id, frozen)` | Disables or restores the native chassis physics mask without changing ownership or the mounted workspot. |
| `Open77.vehicles.ratedTopSpeed` | `vehicles.read` | `(id)` | Gearing rating of the vehicle's record in km/h, or `nil`. |
| `Open77.vehicles.nearby` | `vehicles.read` | `(radius, options?)` | Replicated vehicles within a radius, nearest first. |
| `Open77.vehicles.closest` | `vehicles.read` | `(radius?)` or `(options?)` | The nearest one, or `nil, "no_vehicle_in_range"`. |
| `Open77.vehicles.aimed` | `vehicles.read` | `()` | The one the local player is looking at, or `nil, reason`. |
| `Open77.vehicles.fromEntity` | `vehicles.read` | `(entityId)` | Snapshot for an Open77 or REDengine entity id. |
| `Open77.vehicles.seatFree` | `vehicles.read` | `(id, seat)` | Reads the replicated occupancy ledger. |
| `Open77.vehicles.occupantInSeat` | `vehicles.read` | `(id, seat)` | Player id in that seat, or `nil` when free. |

Client constants are `Open77.vehicles.doors`, `Open77.vehicles.windows`, and
`Open77.vehicles.seats`. They are tables, not callable methods.

Vehicle snapshots include the durable fields above, including the derived `locked` boolean, plus live read-only drivetrain and network
telemetry. `speed`, `rpm`, `rpmMax`, `throttle`, `brake`, `steering`, `wheelRotation`,
`suspensionLongitudinal`, `suspensionTransversal`, `burnout`, `gear`, `onGround`, and `reversing`
describe the latest authoritative motion. The derived normalized fields `longitudinalSlip`,
`lateralSlip`, and `totalSlip` drive remote tire audio and skid effects. Network diagnostics are
`bufferedSamples`, `interpolationDelayMs`, `packetAgeMs`, and `extrapolating`; they are intended for
telemetry and debugging, not gameplay authority.

### Official package exports

The `open77_vehicles` client package exposes these read-only wrappers:

| Export | Signature | Result |
|---|---|---|
| `get` | `get(id)` | Compatibility wrapper over `Open77.vehicles.get`. |
| `all` | `all()` | Compatibility wrapper over `Open77.vehicles.all`. |
| `getPlayerSeat` | `getPlayerSeat(playerId?)` | Compatibility wrapper over `Open77.vehicles.getPlayerSeat`. |
| `isPlayerExitLocked` | `isPlayerExitLocked(playerId?)` | Compatibility wrapper over `Open77.vehicles.isPlayerExitLocked`. |

Call them with `Open77.exports.call("open77_vehicles", "get", id)`; no
`exports.<resource>:` proxy exists. The package intentionally exposes no mutation export.

### Low-level server globals

These globals are public for framework compatibility, but the namespaced API above supplies
structured tables, defaults, and helper validation.

| Global | Signature |
|---|---|
| `CreateVehicle` | `(record, x, y, z, yaw, bucket, appearance, health, flags, primaryR, primaryG, primaryB, secondaryR, secondaryG, secondaryB)` |
| `UpdateVehicleState` | `(id, health, flags, primaryR, primaryG, primaryB, secondaryR, secondaryG, secondaryB, doors, windows, tires, bodyDamage30, brokenGlass, brokenLights, detachedParts)` |
| `SetVehicleTransform` | `(id, x, y, z, yaw)` |
| `RemoveVehicle` | `(id)` |
| `GetVehicle` | `(id)` |
| `GetVehicles` | `(bucket?)` |
| `SetVehicleLocked` | `(id, locked)` |
| `TriggerVehicleHorn` | `(id, durationMs?)` |
| `SetPlayerIntoVehicle` | `(playerId, vehicleId, seat, moveBucket, exitLocked)` |
| `ForcePlayerOutOfVehicle` | `(playerId, vehicleId?)` |
| `SetPlayerVehicleExitLocked` | `(playerId, locked, vehicleId?)` |
| `GetPlayerVehicleSeat` | `(playerId)` |

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

Creates a generation-checked 64-bit vehicle id. Required fields are `record` and `position`.
Optional fields are `appearance`, `yaw`, `bucket`, `health`, `flags`, `primaryColor`,
`secondaryColor`, and `paint = { primary, secondary }`. Returns `id`, or `nil, reason`.

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

### Authoritative paint

See the dedicated [vehicle paint guide](vehicle-paint.md) for the runtime split, supported color
formats, initial paint, events, synchronization semantics, and native model limitations.

```lua
assert(Open77.vehicles.setPaint(id, {
    primary = "#000000",
    secondary = { r = 20, g = 40, b = 60 },
}))

local paint = Open77.vehicles.getPaint(id)
print(paint.applied, paint.primary.r, paint.secondary.b)

assert(Open77.vehicles.resetPaint(id))
```

Colors accept `"#RRGGBB"`, keyed `{ r, g, b }`, or positional `{ r, g, b }` tables. Supplying only
`primary` uses the same color for both channels. Paint has a dedicated `paintApplied` state, so pure
black is not confused with reset. Current viewers, stream-in projections, and late joiners converge
on the same server state. Paint is a cross-resource control API: a resource holding `world.vehicles`
may style a canonical vehicle created by another resource. The same cross-resource rule applies to
all server vehicle mutations; the creator field is never consulted as an authorization check.
The stock CrystalCoat/TWINTONE interaction and popup are suppressed during
an authenticated Open77 session, so a client cannot keep a private local paint override.

Arbitrary RGB display still requires the REDengine vehicle model to expose its generic paint
component. Unsupported records keep their authored appearance; the client retries after attachment
without turning a model limitation into divergent canonical state.

### Vehicle properties, and what Cyberpunk does not have

`Open77.vehicles.getProperties(id)` and `setProperties(id, props)` are the Cyberpunk form of the
`GetVehicleProperties` / `SetVehicleProperties` pair every FiveM framework ships. **The round trip
is the contract**: `setProperties(id, getProperties(id))` leaves the vehicle observably unchanged,
and a table stored in a database and applied to a fresh vehicle of the same record reproduces it.
The individual setters below are conveniences on top of that.

```lua
-- Park the car.
local props = Open77.vehicles.getProperties(vehicleId)
store(plate, json.encode(props))

-- Fetch it back, tomorrow, on another instance.
local stored = json.decode(load(plate))
local id = Open77.vehicles.create({ record = stored.record, position = spot, yaw = 90.0 })
local ok, reason = Open77.vehicles.setProperties(id, stored)
```

The table is plain data — strings, numbers, booleans and tables — so it survives `json.encode`
and a database column unchanged:

```lua
{
  version = 1,
  record = "Vehicle.v_standard2_archer_hella_player",
  appearance = "archer_hella__rayfield",   -- "" is the record's default
  paint = {
    applied   = true,
    primary   = { r = 22, g = 105, b = 180 },
    secondary = { r = 8,  g = 15,  b = 24 },
    lightsHue = 0.55,                      -- absent when the record's own colour is used
  },
  health = 0.83,
  engineOn = false, lights = "off", siren = false,
  locked = true, drivable = true, invulnerable = false, immortal = false,
  doors = 0, windows = 0,
  damage = {
    body = { --[[ 30 cells, 0..1 ]] },
    glass = 0, lights = 0, tires = 0, detachedParts = 0,
    destroyed = false, exploded = false,
  },
  performance = { topSpeedKph = 60.0, accelerationScale = 0.5, taperKph = 10.0 },
}
```

**It deliberately does not carry where the car was standing.** Position, heading, velocity,
occupants, routing bucket and revision are not properties of the car, and a table that carried
them would tempt a caller into teleporting by accident. `setTransform` and `setBucket` still own
those.

#### `version` decides how absence is read

This is the only rule you have to remember, and it is the one that makes both halves of the
contract work at once.

| Table | Meaning | An absent optional field |
|---|---|---|
| carries `version = 1` — every table `getProperties` returns | a **complete** description of a car | means *this car has none*: the lights hue and the performance ceiling are cleared |
| no `version` | a **patch** | is left exactly as it was |

So `setProperties(id, { paint = { primary = "#FF0000" } })` is a repaint and nothing else, while
`setProperties(id, storedTable)` restores a car down to the absence of a tint.

#### What Cyberpunk actually has

Vehicle visual customisation on build 2.31 is one engine component,
`vehicleVisualCustomizationComponent`, and one struct, `GenericTemplatePersistentData`, whose
entire content is **primary RGB, secondary RGB and a lights hue**. Beside it sits the entity
**appearance variant** — a name from the vehicle's own template, which is how the game ships one
Quadra in several trims. That is the whole vocabulary:

```text
appearance variant  +  primary RGB  +  secondary RGB  +  lights hue
```

| Method | Signature | What it does |
|---|---|---|
| `Open77.vehicles.getProperties` | `(id)` | The whole table above, or `nil, reason`. Alias: `getVehicleProperties`. |
| `Open77.vehicles.setProperties` | `(id, props, options?)` | Applies it. Aliases: `setVehicleProperties`, `applyProperties`. |
| `Open77.vehicles.getAppearance` | `(id)` | The variant name, or `""`. |
| `Open77.vehicles.setAppearance` | `(id, name?)` | Swaps the variant. `nil` restores the record's default. |
| `Open77.vehicles.getLightsHue` | `(id)` | `0..1`, or `nil` for the record's own colour. Alias: `getHeadlightHue`. |
| `Open77.vehicles.setLightsHue` | `(id, hue?)` | Tints the car's own lights. |
| `Open77.vehicles.clearLightsHue` | `(id)` | Back to the record's colour. |
| `Open77.vehicles.setHeadlightColor` | `(id, color?)` | The same tint from `"#RRGGBB"` or `{ r, g, b }`. Alias: `setHeadlightColour`. |
| `Open77.vehicles.unsupportedProperties` | *(table)* | Every FiveM property name with no counterpart, mapped to why. |

```lua
Open77.vehicles.setAppearance(id, "archer_hella__rayfield")
Open77.vehicles.setHeadlightColor(id, "#00D8FF")
```

`setAppearance` — and the `appearance` key of `setProperties` — needs `world.vehicles.appearance`
**in addition to** `world.vehicles`. It is the one vehicle write that changes what the world looks
like rather than what a car does: it reaches a native entity-appearance reschedule on every viewer
at once, for every car a resource can name. The same argument gave adoption its own string.
**The permission gates a change, never a restatement**: writing the variant a car already wears is
accepted without it, which is what keeps `setProperties(id, getProperties(id))` working for a
resource that never touches a look.

The variant name is not validated by the server, because only the client holds the entity
template. A name the model does not define is a no-op on each projection and the canonical value
stays as written. `Open77.data.vehicle(record)` looks a record up but does **not** enumerate
variants — the shipped 2.31 catalogue does not carry them.

#### What Cyberpunk does not have

These FiveM property names have **no counterpart in this engine**. Not "unimplemented" — absent:
the 2.31 RTTI carries no type for any of them. `setProperties` refuses such a key by name rather
than dropping it, because a garage that silently loses two thirds of its table is worse than one
that fails loudly on day one:

```lua
local ok, reason = Open77.vehicles.setProperties(id, portedTable)
-- false, "unsupported_property:modEngine"
```

| FiveM property | Why there is nothing to map it to |
|---|---|
| `modKit`, `mods`, `modEngine`, `modBrakes`, `modTransmission`, `modSuspension`, `modArmour`, `modTurbo` | There is no mod-slot system at all. A model's look is its appearance variant plus the two CrystalCoat colours; its performance is `setPerformance`. |
| `wheels`, `wheelType` | No wheel-type system: wheels are meshes inside the appearance variant. |
| `wheelColor` | No per-wheel colour channel in `GenericTemplatePersistentData`. |
| `windowTint` | No window tint on 2.31 — the RTTI carries no type for one. |
| `neonEnabled`, `neonColor` | No underglow. `paint.lightsHue` tints the car's **own** lights instead. |
| `xenonColor` | No xenon index. `paint.lightsHue` is the continuous equivalent. |
| `livery`, `roofLivery` | No livery index. The appearance variant is the nearest thing, and it is a **name**, not a number. |
| `extras` | No numbered extras. Removable bodywork is `damage.detachedParts`, and it is one-way. |
| `color1`, `color2`, `pearlescentColor`, `interiorColor`, `dashboardColor` | Cyberpunk paint is RGB, not palette indices, and there is one body pair and nothing else. Use `paint.primary` / `paint.secondary`. |
| `dirtLevel` | No dirt channel. Body wear is the 30-cell `damage.body` grid. |
| `tyreSmokeColor` | No tyre smoke colour channel. |
| `plateText`, `plateIndex` | Cyberpunk has no readable or writable plate. Carry it in a [state bag](state-bags.md#recipe-a-number-plate) -- the recipe is on that page. |
| `fuelLevel` | No fuel model. Fuel is a state-bag field owned by the bundled [`open77_fuel`](state-bags.md#the-fuel-sample-open77_fuel) sample: `exports.open77_fuel:level(id)` reads it, `:set(id, litres)` and `:refuel(id)` write it. |

`Open77.vehicles.unsupportedProperties` is the same list as a table, keyed by property name, so a
porting script can ask before it writes:

```lua
for name in pairs(portedTable) do
  local why = Open77.vehicles.unsupportedProperties[name]
  if why then print(("dropping %s: %s"):format(name, why)) end
end
local ok, _, skipped = Open77.vehicles.setProperties(id, portedTable, { ignoreUnsupported = true })
```

#### Refusals, and the order of application

`record` is checked, never applied: REDengine cannot change a spawned entity's record, so a Quadra
table handed to a Thorton answers `record_mismatch` rather than half-restoring. Detached parts are
one-way on a live projection — there is no validated reattach on 2.31 — so a table asking for fewer
than the car has already lost answers `detached_parts_not_reattachable`; respawn and apply the
table to the new car.

The order inside `setProperties` is deliberate and worth knowing if you write your own:

1. health, paint, doors, windows and the durable damage go in **one** `update`, so no viewer ever
   sees a half-restored car;
2. the electrical bits then go through `setEngine`, `setLights`, `setSiren` and `setDrivable` —
   because those are what record the server intent that stops the physics owner's next durable
   report from undoing them. Writing them as raw flags looks like it worked and then quietly
   reverts about half a second later;
3. the visual template and the performance ceiling follow on their own durable channels.

The appearance and the lights hue need **no** such intent window, and that is structural rather
than lucky: the physics owner's durable report has no appearance field and no colour field of any
kind, so the merge that undid the sirens cannot reach either value. On the client the variant goes
through `entEntity::ScheduleAppearanceChange` and is held on the replica until the projection
attaches — measured at up to about 3.7 s after the create — then re-applied if the entity is torn
down and streamed back.

### Entry lock and synchronized horn

Use the dedicated lock methods instead of reading, changing, and replacing the complete flags mask:

```lua
-- Server: durable, authoritative entry policy.
assert(Open77.vehicles.lock(vehicleId))
assert(Open77.vehicles.isLocked(vehicleId) == true)
assert(Open77.vehicles.unlock(vehicleId))

-- Server: delivered reliably to the client currently simulating the vehicle.
local ok, reason = Open77.vehicles.triggerHorn(vehicleId, 400)
assert(ok, reason)
```

`setLocked(id, locked)`, `lock(id)`, and `unlock(id)` update only the `locked` bit. The server sends
the resulting canonical state to current viewers and includes it in stream-in and late-join state.
On each client, the replicated bit synchronously removes every mount choice from the vehicle and is
checked again at the mounting boundary, so stale interaction UI cannot start an animation that the
server would later reject. Ordinary entry and seat claims are rejected while locked. An explicit server
`warpPlayerIntoVehicle` remains an administrative/gamemode override and may bypass the entry lock.
This vehicle entry lock is separate from `setPlayerExitLocked`, which keeps one existing occupant
inside, and from the client-only `setControlLock`/`setFrozen` grid controls.

`triggerHorn(id, durationMs?)` and its `honk` alias accept 100..2000 ms and default to 250 ms. A
server call is a reliable one-shot command bound to the vehicle's current authority epoch. With a
physics owner, only that owner injects the native horn event and the normal motion stream mirrors
the edge to observers. An unoccupied parked vehicle intentionally has no physics lease; in that
case the server addresses every current streamed projection directly instead of rejecting the
request or manufacturing a bystander owner. The event is transient and is not replayed to a late
joiner.

A client resource with `vehicles.control` may call the same `triggerHorn`/`honk` API directly, but
only for a streamed vehicle whose snapshot has `locallyOwned == true`. Remote attempts fail with
`not_physics_owner`; use the server API when gameplay code needs to sound an arbitrary canonical
vehicle. `Open77.vehicles.isLocked(id)` is available client-side with `vehicles.read`.

Available flags:

| Constant | Value | Constant | Value |
|---|---:|---|---:|
| `Open77.vehicles.flags.engineOn` | `1` | `Open77.vehicles.flags.locked` | `2` |
| `Open77.vehicles.flags.destroyed` | `4` | `Open77.vehicles.flags.exploded` | `8` |
| `Open77.vehicles.flags.invulnerable` | `16` | `Open77.vehicles.flags.immortal` | `32` |
| `Open77.vehicles.flags.lightsOn` | `64` | `Open77.vehicles.flags.highBeams` | `128` |
| `Open77.vehicles.flags.sirenOn` | `256` | `Open77.vehicles.flags.paintApplied` | `512` |

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
`seat_back_right`. `seat_front_left` is the only driver seat. Ordinary player entry still comes
from native mount detection and server validation; an owning server resource can also write the
ledger through the forced-seat API below.

### Authoritative player seats

Use the server version of `warpPlayerIntoVehicle` when a gamemode must put a player directly into
a vehicle rather than waiting for a local enter interaction:

```lua
local ok, reason = Open77.vehicles.warpPlayerIntoVehicle(
    playerId,
    vehicleId,
    Open77.vehicles.seats.driver,
    {
        moveBucket = true, -- default: move the player into the vehicle bucket
        exitLocked = true, -- optional: block manual exit until the server releases it
    })
assert(ok, reason)
```

Accepted seats are the FiveM-compatible numbers `-1` (driver), `0` (front passenger), `1`
(rear-left), and `2` (rear-right), the values in `Open77.vehicles.seats`, or these names:
`driver`, `frontPassenger`, `rearLeft`, `rearRight`, `frontLeft`, `frontRight`, `backLeft`,
`backRight`, and the canonical `seat_*` strings.

The assignment is durable network state, not a one-shot client event. The server reserves the
seat first and carries `forcedEntry` in every occupancy snapshot until the affected client confirms
the native mount. If the vehicle is not streamed yet, streams after a routing-bucket move, streams
out and back in, or its local projection is replaced, the client retries against the current
generation-checked vehicle entity. Occupancy pins the target vehicle into that player's interest
set during convergence, so a stale or temporarily missing player-position snapshot cannot strand
the instruction.

Forced assignment intentionally bypasses distance and the vehicle's `locked` flag. It still
rejects unknown players, destroyed/exploded vehicles, and occupied seats. Seat operations are
deliberately cross-resource: any server resource granted `world.vehicles` may assign, eject, or
lock a player in any canonical vehicle, including one created by another resource. By default the
player moves into the vehicle routing bucket; pass
`{ moveBucket = false }` to fail with `wrong_bucket` instead. Dead and pending revive/respawn
players are rejected as `player_unavailable`.

```lua
-- Unlock later without changing the seat.
assert(Open77.vehicles.setPlayerExitLocked(playerId, false, vehicleId))

-- Or force an exit even while the exit lock is enabled.
assert(Open77.vehicles.forcePlayerOutOfVehicle(playerId, vehicleId))
```

#### Entering with the vanilla animation

`Open77.vehicles.taskPlayerEnter` is `warpPlayerIntoVehicle` with one bit changed. Everything
authoritative is identical -- the seat is reserved in the same write, the bucket moves the same
way, and every refusal reason is the warp's, verbatim. What changes is only how the affected
client reaches the seat: instead of being placed in it in one frame, it mounts through the
mounting facility with its own pose preserved and plays the authored `OccupantSlots` entry, so the
body slides in.

```lua
local ok, reason = Open77.vehicles.taskPlayerEnter(
    playerId, vehicleId, Open77.vehicles.seats.driver,
    { moveBucket = true, exitLocked = false })
assert(ok, reason)

-- The player-oriented alias, next to warpIntoVehicle / forceOutOfVehicle:
Open77.players.taskEnterVehicle(playerId, vehicleId, "driver")
```

Three things this is **not**, due to engine limits:

* **It does not walk the player to the door.** The approach is an NPC behaviour
  (`ApproachVehicleDecorator`), and the single attempt to drive an Open77 network puppet through
  it crashed the *observing* client about three seconds after the vehicle streamed. The player is
  mounted where they stand. The upside is that the obvious failure of a walk-to-door task -- a
  player stuck walking toward a car that has driven off -- cannot happen here.
* **It cannot strand anybody.** The animation is an attempt in front of the warp, never instead of
  it. If the staged mount cannot be started, or if the native mounting relation is not readable
  within three seconds, the client warps and the seat is reached anyway. `warpPlayerIntoVehicle`
  remains the call that never depends on an animation at all.
* **There is no animated exit.** `Open77.vehicles.taskPlayerLeave` exists, and it is the same
  durable ejection as `forcePlayerOutOfVehicle`: **the leaving player's own exit is instant.**
  Driving that player's authored exit workspot inside the mount release window faulted on the
  engine's release-dispatch thread and the workspot never started once in any session, so the
  client does not attempt it. Observers are unaffected -- a remote occupant's exit has always been
  animated on their proxy, so only the ejected player's own screen skips it.

Cancelling a task in flight is `forcePlayerOutOfVehicle` (or `taskPlayerLeave`): a forced exit
overrides a pending forced entry, and the client's animated attempt ends with it. Nothing else is
needed, because the attempt is bounded rather than open-ended.

`Open77.vehicles.get(id).occupants[i].animatedEntry`, and the same field on the client's vehicle
read, says whether a pending forced entry carries the modifier. It is a read for every client but
the one being seated.

While `exitLocked` is active, the local vanilla unmount callback is rejected and reconciliation
remounts divergent state. A manual seat switch is rejected too because REDengine begins it by
unmounting the current workspot. `forcePlayerOutOfVehicle` overrides that policy and keeps the
canonical seat reserved until native unmount confirmation; an eight-second transition timeout
cleans up a disconnected or non-cooperating client. Passing the optional `vehicleId` to exit/lock
operations is recommended: it prevents stale gamemode code from modifying a newer assignment.

Read the same assignment through either namespace:

```lua
local seat = Open77.vehicles.getPlayerSeat(playerId)
-- Equivalent player-oriented alias:
seat = Open77.players.getVehicleSeat(playerId)

if seat then
    print(seat.vehicleId, seat.seat, seat.exitLocked)
end
```

The seat table contains `playerId`, `vehicleId`, `seat`, `flags`, `entering`, `exiting`,
`forcedEntry`, `exitLocked`, and `forcedExit`. `Open77.vehicles.isPlayerExitLocked(playerId)` is a
boolean convenience query. Server aliases are `Open77.players.warpIntoVehicle`,
`forceOutOfVehicle`, and `setVehicleExitLocked`.

Normal failures return `false, reason`. Stable reasons are `permission_denied:world.vehicles`,
`vehicles_unavailable`, `invalid_player_id`, `invalid_vehicle_id`, `invalid_seat`,
`invalid_argument`, `player_not_found`, `player_unavailable`, `vehicle_not_found`, `wrong_bucket`,
`seat_occupied`, `not_occupant`, `vehicle_unavailable`, `exit_locked`, and
`seat_operation_failed`.

### Server snapshot fields

`Open77.vehicles.get` and each entry returned by `all` contain:

| Group | Fields |
|---|---|
| Identity | `id`, `resource`, `record`, `appearance`, `revision` |
| World | `bucket`, `x`, `y`, `z`, `position` |
| Transform | `heading`, `yaw`, `orientation = { x, y, z, w }` |
| Motion | `velocity`, `angularVelocity`, `speed`, `speedKph`, `onGround`, `reversing`, `moving` |
| Authority | `physicsOwner`, `authorityEpoch` |
| Durable state | `health`, `flags`, `locked`, `exploded`, `destroyed`, `paintApplied`, `primaryColor`, `secondaryColor`, `paint`, `doors`, `windows`, `tires`, `brokenGlass`, `brokenLights`, `detachedParts` |
| Paint | `primaryR`, `primaryG`, `primaryB`, `secondaryR`, `secondaryG`, `secondaryB` |
| Body | `bodyDamage[1..30]` |
| Damage view | `damage = { body, glass, lights, tires, detachedParts }` |
| Lifetime | `persistent`, `despawnWhenUnobserved`, `ttlMs` (absent when there is no deadline) |
| Performance | `performance = { topSpeedKph, accelerationScale, taperKph }` (absent when uncapped) |
| Seats | `occupants[] = { playerId, seat, flags, entering, exiting, forcedEntry, exitLocked, forcedExit }`, plus `driverPlayerId` |

`x`, `y` and `z` are unchanged; `position` is the same point as a plain `{ x, y, z }` table, which
is what an Open77 vector3 is, so `#(a.position - b.position)` works on it without a conversion.
`heading` and `yaw` are one value under both names -- `heading` is what the player read and
`respawn` use, `yaw` is what `create` and `setTransform` take -- and it is extracted from the full
quaternion rather than from `qz`/`qw` alone, so a car on a slope reports the heading it is actually
facing.

**The motion group is the last thing the physics owner reported.** A vehicle with no owner is not
being simulated by anyone, so losing the lease -- a driver stepping out, disconnecting, or the
lease expiring -- zeroes `velocity`, `angularVelocity`, `speed` and the dynamics bits rather than
leaving a parked car claiming the speed it had when its driver got out. A server `setTransform`
clears them for the same reason. `moving` is exactly `physicsOwner ~= 0 and speed > 0.1`, which is
the check a speed camera wants to make before it reads `speedKph`.

`driverPlayerId` is absent, not zero, when nobody is driving, and absent while an entry animation
is still running: a reserved seat is not yet a driver.

Validation constraints are `health = 0..1`, RGB channels `0..255`, finite world coordinates with
an absolute maximum of 1,000,000, a record length up to 256 characters, an appearance length up to
128, flags limited to the documented ten bits, exactly 30 normalized body values, doors `0..63`,
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

-- The three derived seat transitions. Same ledger, already diffed.
AddEventHandler("onPlayerEnteringVehicle", function(playerId, vehicleId, seat) end)
AddEventHandler("onPlayerEnteredVehicle", function(playerId, vehicleId, seat) end)
AddEventHandler("onPlayerLeftVehicle", function(playerId, vehicleId, seat) end)

AddEventHandler("onVehicleDamageChanged", function(id, revision)
    local damage = Open77.vehicles.getDamage(tonumber(id))
end)

AddEventHandler("onVehiclePaintChanged", function(id, revision)
    local paint = Open77.vehicles.getPaint(tonumber(id))
end)
```

The same creation and removal also reach `onEntityCreated(kind, id, resource)` and
`onEntityRemoved(kind, id, reason)` with `kind` = `"vehicle"`, for a resource that declares
`world.entities.observe` and wants every registry under one name. The mirror is raised by the
same statement as the event above it, so the two can never disagree — see
[entity lifecycle events](server-api.md#entity-lifecycle-events).

Server runtime event arguments arrive as strings. Preserve the ID as an opaque value unless the
called binding explicitly requires an integer. `onVehicleUpdated` fires for every canonical state
update; `onVehicleDamageChanged` and `onVehiclePaintChanged` are narrower channel-specific signals.

#### Enter and exit, derived

`onVehicleOccupancyChanged` is a *ledger* signal: it says the occupant list changed and leaves the
resource to fetch the vehicle and diff the list itself to learn what actually happened. Every
gamemode wrote that diff, and most of them got the same two cases wrong.

The three events above are that diff, done once, in the one place the occupancy ledger is
published. They are **derived, never authored** -- there is no second source of truth to drift
from `onVehicleOccupancyChanged`, and any future seat mutation path gets correct transitions
without new plumbing. The rules, each one paid for by a shape the raw ledger makes ambiguous:

- **`onPlayerEnteringVehicle`** fires when an occupant appears carrying the `entering` flag: the
  seat is *reserved* and the entry animation is running. Nobody is in the car yet, and a second
  warp into that seat is already refused.
- **`onPlayerEnteredVehicle`** fires when the player is actually seated -- either straight away
  (a direct entry, or a server `warpPlayerIntoVehicle`, neither of which has an animation) or when
  a pending `entering` is confirmed. It fires **exactly once per entry**: a client re-announcing
  `BeginEnter` from a seat it already holds does not make it fire again.
- **`onPlayerLeftVehicle`** fires when a seated player leaves that seat -- by exit, seat switch,
  disconnect, incapacitation, or the vehicle being deleted out from under them.
- **An entry that is never confirmed raises no `left`.** The reservation times out, the seat frees,
  and because nobody was ever in the car there is nothing to report leaving it. `entered` and
  `left` are therefore balanced pairs, which is what makes a seat map built on them safe.
- **A seat switch is `left(old)` then `entered(new)`**, in that order, because the service frees
  the old seat before taking the new one. Moving between two vehicles names the right vehicle in
  each half.

Arguments are `playerId, vehicleId, seat`, with the seat as the canonical `seat_front_left`
spelling every other vehicle read uses. They deliberately carry no revision: a revision is what you
need in order to diff a ledger, and the diff has already been done. `Open77.vehicles.get(id)` still
answers for anything else the handler wants.

The three names are reserved platform events. `TriggerEvent("onPlayerEnteredVehicle", ...)` from a
resource answers `false, "reserved_event"` -- a forged one would tell every other resource that a
player it does not own just took the wheel of a car it does not own.

```lua
local seatOf = {}

AddEventHandler("onPlayerEnteredVehicle", function(playerId, vehicleId, seat)
    playerId, vehicleId = tonumber(playerId), tonumber(vehicleId)
    seatOf[playerId] = { vehicle = vehicleId, seat = seat }
    -- A keys resource acts on the driver seat only, and acts once: this is the
    -- moment the player is actually in, not the moment they reached for the door.
    if seat == "seat_front_left" and not hasKeys(playerId, vehicleId) then
        Open77.vehicles.setEngine(vehicleId, false)
    end
end)

AddEventHandler("onPlayerLeftVehicle", function(playerId)
    seatOf[tonumber(playerId)] = nil
end)
```

Every resource granted `world.vehicles` can mutate, move, seat players in, or remove every canonical
vehicle. The `resource` snapshot field is provenance, not an access-control boundary. Stopping or
reloading the creating resource still removes the vehicles it created and clears their assignments,
so temporary entities retain deterministic lifecycle cleanup.

## Adopting a vanilla car

Every read on this page so far answers from the canonical registry, which holds
only vehicles the server created. The traffic car a player is standing next to
was spawned by REDengine population **on that player's own machine**, has no
canonical id, and is invisible to every other client — which is why
`Open77.vehicles.aimed()` answers `unknown_entity` when the player is plainly
looking at a car.

Adoption is how such a car becomes real for everybody. It is what a car-theft or
world-car RP server needs: walk up to a Hella, make it canonical, drive it, and
have the rest of the session see you do it.

### What adoption actually does

**It takes the car's identity, not the engine's entity.** That is the entire
design and it is a deliberate answer to how this could go wrong.

The engine owns those cars. It spawned them, it moves them, and it deletes them
whenever it likes, with no notification this plugin can rely on. A canonical
vehicle bound to such an entity would quietly become a ghost the moment the
engine took it back — and a vehicle that vanishes without a removal is worse
than one that was never adopted.

So nothing is bound. The sequence is:

1. the client **describes** the car — record, pose, paint, damage;
2. the server **creates an ordinary canonical vehicle** from that description,
   with the same lifetime, the same reaper and the same projection path as a car
   a garage spawned;
3. the client **hands its vanilla chassis back** to the population system.

After step 3 the engine owns nothing the server believes it owns, and the
adopted car is a vehicle like any other: `get`, `update`, `setLocked`,
`setPerformance`, `setTimeToLive` and `remove` all behave exactly as they do for
a `create`. Only `get(id).adopted`, `adoptedFrom` and `adoptedEngineEntity`
remember where it came from, and they are provenance — they grant nothing.

Adoption replaces the vanilla chassis with a network projection. A visible gap can occur while the replacement streams in; its duration depends on asset loading.

### The three calls

On the **client**, with `vehicles.read`:

```lua
-- Nearest first. `radius` defaults to 25 m, `limit` to 8.
local offered = Open77.vehicles.adoptable({ radius = 8, limit = 4 })
for _, car in ipairs(offered or {}) do
    print(car.record, car.distance, car.adoptable)
end
```

An entry carries everything the server's `adopt` reads, spelled the same, so it
can be handed over untouched. `engineEntity` and `recordId` are fixed `0x`
strings, because a REDengine hash does not survive a Lua number.

`adoptable` is false — and `record` empty — when the car's TweakDBID is not in
the shipped reverse table. The engine hands out ids, not names: a TweakDBID is
CRC32 of the record name plus its length, a shipping build keeps no reverse
table, and `gamedataVehicle_Record` has no `Name` accessor. So the 1376 known
2.31 vehicle records are carried in the client, every one of them verified by
recomputing its own id, and a car outside that set reports its raw id and says
it cannot be adopted rather than inventing a name.

On the **server**, with `world.vehicles` *and* `world.vehicles.adopt`:

```lua
Open77.vehicles.setAdoptPolicy("driver")          -- bucket 0
Open77.vehicles.setAdoptPolicy("any", { bucket = 7 })
print(Open77.vehicles.getAdoptPolicy(0))          -- "driver"
```

Every bucket starts at `"none"`: nothing is adoptable until a resource says so.
`"driver"` accepts only a car the proposing player is standing at, within six
metres — the car-theft shape. `"any"` widens that to sixty metres; it does not
remove the check.

Back on the **client**, with `vehicles.adopt`, once the server has agreed:

```lua
Open77.vehicles.releaseAdopted(car.engineEntity)
```

That deletes the vanilla chassis through the population system — the same call
the world sanitizer already makes every second — and it refuses a chassis this
client was not offered in the last minute, a car the server owns, and the car
the player is sitting in.

### End to end

```lua
-- client
local car = (Open77.vehicles.adoptable({ radius = 6, limit = 1 }) or {})[1]
if car and car.adoptable then TriggerServerEvent("garage:adopt", car) end

RegisterNetEvent("garage:adopted", function(engineEntity, vehicleId)
    Open77.vehicles.releaseAdopted(engineEntity)
    print("that Hella is now vehicle " .. vehicleId)
end)
```

```lua
-- server
RegisterNetEvent("garage:adopt", function(description)
    -- `source`, never a field out of the payload: the placement checks are the
    -- entire defence, and they have to run against the real sender.
    local id, reason = Open77.vehicles.adopt(source, description)
    if not id then return print(reason) end
    TriggerClientEvent("garage:adopted", source, description.engineEntity, id)
end)
```

### What the server checks, and what it cannot

Everything in a description was read on the proposing client and **none of it is
trusted**. The server decides whether a car appears at all, in which bucket and
where; the description only decides what it looks like, which is exactly the
authority a resource already has through `create`. So the checks are about
placement:

* the player's bucket must have a policy other than `none`
  (`adopt_policy_closed`);
* the player must actually be there, within the policy's radius (`too_far`), and
  must have a known position at all (`player_unavailable`);
* no adopted car of the same record may already stand within three metres in
  that bucket (`duplicate_adoption`) — traffic is spawned per client, so two
  players on one corner are each describing their own car, and without this rule
  the corner fills with copies;
* the same chassis proposed twice by the same player answers with the id of the
  first vehicle and the reason `already_adopted`, because a retry after a dropped
  acknowledgement is the ordinary way that happens.

Two things it deliberately does not do. It does not verify that the record
exists — a made-up but well-formed record string produces a canonical vehicle no
client can project, exactly as `create` would. And it does not know whether an
NPC was driving the car: the only way to ask is a scripted function, and calling
one without a script frame ends the process. `adoptable()` reports `speed` so a
resource can prefer parked cars, and `"driver"` policy plus a player at the door
is the shape that avoids the question.

## Client API

The client state surface is intentionally read-only:

```lua
local vehicle = Open77.vehicles.get(id)
local streamed = Open77.vehicles.all()
local trunkOpen = Open77.vehicles.isDoorOpen(id, "trunk")
local hoodOpen = Open77.vehicles.isDoorOpen(id, Open77.vehicles.doors.hood)
local entryLocked = Open77.vehicles.isLocked(id)
local mySeat = Open77.vehicles.getPlayerSeat()
local remoteSeat = Open77.players.getVehicleSeat(remotePlayerId)
local cannotExit = Open77.vehicles.isPlayerExitLocked()

-- Requires vehicles.control and local physics ownership.
local ok, reason = Open77.vehicles.triggerHorn(id, 300)
```

### Performance ceilings

**This is the client-local form.** It is unchanged and still works; the server-authoritative form,
which takes the same three numbers and replicates them to every viewer, is
[Performance, decided by the server](#performance-decided-by-the-server). Use the server form for
anything a player must not be able to opt out of -- a tuning shop, a speed limit inside an instance
-- and this one for a client's own presentation.

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
assert(Open77.vehicles.setFrozen(vehicleId, true))
assert(Open77.vehicles.setFrozen(vehicleId, false)) -- wake chassis first
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

`setFrozen` is the physical half of a real starting-grid hold. It calls the
verified REDengine `vehicleBaseObject::EnablePhysics` path for the complete
chassis group, while preserving the local physics-owner lease, driver workspot
and player-controlled state. This stops inertia, gravity and external impulses;
the API does not repeatedly teleport the vehicle. On release it restores the
mask and wakes the rigid body. Pair it with `setControlLock`: freeze after inputs
are locked, then thaw before restoring inputs on GO. Calls are idempotent and an
unknown or not-yet-streamed vehicle fails closed so a resource can retry.

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
authority. This is the **client** meaning of `warpPlayerIntoVehicle`; the identically named server
method creates the authoritative assignment. Client and server resources run in separate Lua
states, so the same name cannot accidentally cross that boundary.

`taskPlayerEnterVehicle` uses Open77's guarded staged door/workspot path for a live remote entry,
with a bounded instant-warp fallback. It remains presentation-only.

`getPlayerSeat(playerId?)` and its `Open77.players.getVehicleSeat` alias return the replicated
assignment. Omit the ID to query the local player. In addition to the server fields, a client result
contains `streamed` and `entity`; `entity` is the current ephemeral local projection handle and must
not be cached across stream-out. `isPlayerExitLocked(playerId?)` returns `nil` when no assignment is
replicated, otherwise the canonical boolean.

### Client snapshot fields

The client snapshot deliberately differs from the server snapshot:

| Group | Fields |
|---|---|
| Identity | `id`, `record`, `revision` |
| Local projection | `entity`, `engineEntity`, `streamed`, `locallyOwned` |
| Authority | `physicsOwner`, `authorityEpoch` |
| World | `position` (a plain `{ x, y, z }`, which is what an Open77 vector3 is) |
| Transform | `orientation = { x, y, z, w }`, `heading`, `yaw` |
| Durable state | `health`, `flags`, `locked`, `doors`, `windows`, `tires`, `brokenGlass`, `brokenLights`, `detachedParts` |
| Control state | `engineOn`, `lights` (`"off"`/`"on"`/`"high"`), `sirenOn`, `undriveable`, `drivable`, `frozen` |
| Body and damage | `bodyDamage[1..30]`, `damage = { body, glass, lights, tires, detachedParts }` |
| Drivetrain | `speed` (m/s), `speedKph`, `rpm`, `rpmMax`, `throttle`, `brake`, `gear`, `burnout` |
| Wheels/suspension | `steering`, `wheelRotation`, `suspensionLongitudinal`, `suspensionTransversal`, `onGround`, `reversing` |
| Seats | `occupants[] = { playerId, seat, flags, entering, exiting, forcedEntry, exitLocked, forcedExit }` |

`position` and `orientation` come from the same source: the latest replicated motion when one
exists, the canonical create otherwise, so a proximity query answers for a car whose REDengine
projection has not attached yet. `heading` and `yaw` are one value derived from `orientation` with
the same full-quaternion extraction the server uses, so the two runtimes never disagree about which
way a car points. `speed` stays metres per second, the unit every Open77 read uses; `speedKph` is
the same number converted once, because performance ceilings and speed limits are authored in km/h.

`entity` is an ephemeral, generation-checked Open77 handle for the local projection.
`engineEntity` is diagnostic engine identity. Neither is the durable server vehicle ID, and neither
should be cached after stream-out. Client snapshots do not include server ownership metadata such
as `resource`, `bucket`, or world coordinates. Paint is available both in the snapshot and through
`Open77.vehicles.getPaint(id)`.

**There is no streamer to ask, and no `RequestModel` / `HasModelLoaded` loop to write.** Streaming
is implicit: the server registry streams a vehicle to every client inside its radius, and the
client attaches its projection when the engine has spawned it -- measured up to 3.7 s after the
create arrives. `create` returns before that; `get(id).streamed` says whether *this* client has the
body, `open77:vehicleCreated` says the create arrived. `Open77.vehicles.whenStreamed` folds both into
one promise, which is the whole of what a ported loading loop was waiting for:

```lua
-- Requires vehicles.read. Resolves with the get(id) snapshot once streamed == true --
-- before the call returns when it already is -- and rejects with `timeout`
-- (default 15000 ms, clamped to 1..120000).
CreateThread(function()
    local pending, reason = Open77.vehicles.whenStreamed(vehicleId, 10000)
    if not pending then return print("cannot wait: " .. tostring(reason)) end
    local car, why = pending:await()
    if not car then return print("never streamed in: " .. tostring(why)) end
    Open77.blips.create({ entity = car.entity, sprite = "taxi", label = "Your taxi" })
end)
```

It listens for `open77:vehicleCreated` and polls the snapshot every 100 ms until it is attached;
the one-shot handler is removed on resolve, on timeout and when the resource stops. `nil, reason`
only for a bad id, a bad timeout or a missing permission -- an id this client has never seen is
waited for and times out, because "not here yet" and "not anywhere" look the same from a client.
There is deliberately no server counterpart: a vehicle's steward is elected by a driver's claim,
never by a streamed report, so the server holds no signal that means "somebody has this car";
`Open77.npcs.whenReady` exists on the server because NPCs do report readiness ([npcs.md](npcs.md)).

Client events:

```lua
AddEventHandler("open77:vehicleCreated", function(id) end)
AddEventHandler("open77:vehicleRemoved", function(id, reason) end)
AddEventHandler("open77:vehicleAuthorityChanged", function(id, ownerPlayerId) end)
AddEventHandler("open77:vehicleOccupancyChanged", function(id, revision) end)

-- The local player's own seat transitions, derived from the same replicated
-- ledger. Seat is a canonical `seat_*` name.
AddEventHandler("open77:vehicleEntering", function(id, seat) end)
AddEventHandler("open77:vehicleEntered", function(id, seat) end)
AddEventHandler("open77:vehicleLeft", function(id, seat) end)

-- Electrical edges, so a HUD does not have to keep its own copy of `flags`.
AddEventHandler("open77:vehicleEngineChanged", function(id, state) end)   -- "on" / "off"
AddEventHandler("open77:vehicleLightsChanged", function(id, mode) end)    -- "off" / "on" / "high"
AddEventHandler("open77:vehicleSirenChanged", function(id, state) end)    -- "on" / "off"
AddEventHandler("open77:vehicleDrivableChanged", function(id, state) end) -- "yes" / "no"
AddEventHandler("open77:vehicleDamageChanged", function(id, revision) end)
AddEventHandler("open77:vehiclePaintChanged", function(id, revision) end)
```

The reference resource also emits `open77:vehicleOwnerChanged(id, ownerPlayerId)` and
`open77:vehicleSeatsChanged(vehicleSnapshot, revision)`. The latter resolves the fresh snapshot
before dispatch, unlike the lower-level occupancy event.

## Seat and proxy replication

1. REDengine reports the local player's real mount and slot.
2. The client requests that seat; it never assigns itself locally in the network ledger. A server
   resource may instead create a forced assignment for teleport-oriented gameplay.
3. The server checks vehicle id, routing bucket, 15-metre proximity, lock/destruction state,
   one-seat-per-player, and one-player-per-seat.
4. A reliable ordered occupancy snapshot is sent to every vehicle viewer. Durable forced-entry,
   exit-lock, and forced-exit flags remain present until native confirmation, so late stream-in and
   projection replacement replay the policy rather than losing a one-shot command.
5. Each observing client mounts the corresponding remote player proxy into the streamed
   vehicle and exact seat. A live addition runs the native NPC approach/door/workspot behavior;
   an initial stream snapshot uses the instant warp so it does not replay an old entrance. When
   the snapshot removes the player, Open77 discards that disposable
   native proxy and recreates it from the next authoritative player snapshot. This avoids reusing
   a REDengine puppet whose vehicle workspot left its locomotion representation inactive.
6. Root player movement is suspended only after the native mount is confirmed, avoiding a
   transform fight between pedestrian interpolation and the vehicle mounting system. A fresh
   pedestrian controller is installed on the replacement proxy after exit.

If an ordinary local engine mount disagrees with the server for two seconds (for example a locked
seat was rejected), Open77 unmounts the player. A forced entry or exit-lock mismatch is reconciled
immediately whenever the target projection exists. Disconnect, vehicle removal, seat change, and
confirmed exit clear the server ledger. Leaving the driver seat also revokes physics authority.

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

### Engine, lights and siren

These four bits have always existed in `flags` and have always been applied by every client. What
did not exist was a way to write one of them. A keys resource that wanted to cut an engine had to
read `get(id).flags`, clear bit 0, and post the whole bitfield back through `update` -- a
read-modify-write on state shared by every resource holding `world.vehicles`. Two resources doing
it in the same tick each overwrite the other's bit, because each learned the flags before the
other wrote them.

`setEngine`, `setDrivable`, `setLights`, `setHighBeams` and `setSiren` write one named bit and
leave every other flag exactly as it was. **`flags` and `update` are unchanged** and keep working
as they always did; these are another way into the same canonical field, not a replacement.

#### The intent window, and why a setter without one is unreliable

The physics owner publishes what its own projection reads back every 500 ms, and the server merges
the electrical bits by *replacement*. So a `setEngine(id, true)` races the report that was already
in flight when it was called -- and loses. The bit lands, the stale report lands a moment later,
and the API looks broken at random. This is the same mechanism that made Pursuit's cop sirens go
dark about five seconds after every spawn for a month.

Each electrical write therefore records a **ten-second intent** that outranks the owner's report
for the bits it names. It is a window, not a lock:

- the intent is **released the moment the owner reports the same value** -- proof that its
  projection applied it -- so a driver who then flips their own headlights is obeyed immediately;
- a bit the owner can never report (the siren) is held until the window expires, then dropped, so
  the ledger can never get permanently stuck;
- the ten-second window allows for stream-in and the first owner report.

#### What the siren can and cannot do

**Siren lights and sound share one switch.** `vehicleBaseObject.ToggleSiren(Bool)` has no separate channels, so the API cannot control them independently.

Owner snapshots do not include a native siren readback. Durable reports therefore echo the canonical siren value instead of reading it from the vehicle.

#### Indicators and interior lighting

Indicator and interior-light controls are not supported by this API.

#### What `setDrivable` actually does

Out of service cuts the engine **in the same canonical revision** and locks the simulated driver's
throttle and brake on every projection. Both halves matter: a car whose engine is off but whose
inputs are live can still be rolled along, and a car whose throttle is dead while its engine idles
is a bug report waiting to happen. Putting it back in service does *not* restart the engine --
that is `setEngine`.

Like the entry lock, `undriveable` is server-authored and absent from every owner report, so no
client can clear it.

#### Freezing a car

`setFrozen(id, true)` is the server half of FiveM's `FreezeEntityPosition` for a vehicle, and it
is deliberately **only** that half -- the control lock above is `setUndriveable`, and the two
compose. Three things happen in one canonical revision:

- the `frozen` bit goes up (`Open77.vehicles.flags.frozen`, bit 11, readable through `isFrozen`
  and on the raw `flags`);
- the motion facts are pinned: `speed`, `velocity`, `angularVelocity`, `onGround` and `reversing`
  read as a car at rest, and stay that way;
- the physics owner's transform reports are **discarded** while the bit is up -- not merged, and
  not punished either. The lease is renewed and the tick consumed exactly as an accepted report
  would be, because the owner is doing nothing wrong by reporting a car it still simulates, and
  revoking it would put the steward election and the freeze into a two-second flap. Nothing is
  logged for a discard: twenty a second is not a diagnostic.

On every client the bit maps to the same native physics mask the observer projection already uses,
so inertia, gravity and impulses stop too -- the car is not merely refused by the server, it does
not move on the driver's screen. A driver pressing the throttle revs an engine that goes nowhere,
and `undriveable` is not implied: an impound wants both bits, a starting grid wants the freeze alone
with the engine running.

```lua
-- Impound: nobody drives it, nobody pushes it, and it survives the lot emptying.
Open77.vehicles.setUndriveable(id, true)
Open77.vehicles.setFrozen(id, true)
Open77.vehicles.setPersistent(id, true)

-- Release, in the order a driver expects: inputs first, then the body.
Open77.vehicles.setFrozen(id, false)
Open77.vehicles.setDrivable(id, true)
```

Freezing pins the last accepted canonical transform. A moving owner can briefly render past that position because of network delay. Prefer `setFrozen` to a read-modify-write update of the `frozen` flag; both use the same authoritative pin.

Like `undriveable`, `frozen` is server-authored, absent from every owner report and preserved
across them, so no client can clear it. **It is a wire change**: the accepted vehicle flag mask
widened from bits 0..10 to 0..11, and a client that does not know the bit refuses the whole state
frame as invalid, so the server and the client that carry it must be built together.

#### Health is one pool

`setEngineHealth` and `getEngineHealth` are the FiveM-shaped names for `setHealth`/`getHealth`,
which are the same normalized `0..1` pool `get(id).health` reads. **Cyberpunk models one vehicle
health pool**; there is no separate engine pool to damage, so at 0 the car is a wreck rather than a
running car with a dead engine. A car that must stay whole but refuse to move is
`setDrivable(id, false)`.

Per-vehicle gameplay data a server invents -- fuel, keys, a plate, an owner, an insurance record --
does **not** belong in these flags. It belongs in a [state bag](state-bags.md) on the vehicle, which
replicates to the clients that care and costs the canonical ledger nothing. The bundled
[`open77_fuel`](state-bags.md#the-fuel-sample-open77_fuel) resource is the reference for exactly
that pattern, and the [plate recipe](state-bags.md#recipe-a-number-plate) is the two-line version.

Horn state is intentionally transient rather than durable. The native `VehicleComponent`
horn latch is sampled in the realtime motion stream and observers call `ToggleHorn` only on
edges. Receivers force it off after 350 ms without a fresh owner packet and on every authority
change, so packet loss can never leave a remote horn stuck on.

There is no `setHorn`, `setRpm`, `setSteering`, or `setWheelRotation` Lua method. Those values
describe native driver input or physics and cannot be authored as durable script state. Seat
assignment is server-only and uses the explicit forced-seat API; client scripts can only read the
ledger or present a tuple the server already authorized. Engine, lights, high beams, siren, locks,
destruction, immortality, and invulnerability are the scriptable vehicle `flags` bits.

Top speed is the one performance value that *is* scriptable, and it is scriptable in a different
way: not as durable server state but as a client-side ceiling. See
[Performance ceilings](#performance-ceilings).

## Server-authoritative vehicle policy

Four capabilities that only the server can honestly decide: a performance ceiling, an explosion,
who a car is locked for, and how long it lives.

### Performance, decided by the server

`Open77.vehicles.setPerformance(id, { topSpeedKph, accelerationScale, taperKph })` is the
server-authoritative form of the [client-local governor](#performance-ceilings). The three numbers
are the same, and they end up in the same native throttle policy; the difference is only who
decides them. A tuning shop, or a speed limit inside an instance, cannot be a decision the client
makes.

```lua
-- Server. Everything inside this instance is limited to 60 km/h.
for _, entry in ipairs(Open77.vehicles.nearby(centre, 200.0, { bucket = instanceBucket })) do
  Open77.vehicles.setPerformance(entry.id, { topSpeedKph = 60.0, taperKph = 10.0 })
end
```

The ceiling is replicated to **every viewer**, not only to whichever client currently owns the
physics. Ownership changes every time a driver steps in or out, and a ceiling chased across those
transitions would be missing for exactly the first second of every drive -- the second a speed
limit has to hold. Each client applies it to its own projection; the native governor only has
throttle to clamp on the machine actually simulating the car, so sending it wide costs a no-op on
observers and removes a whole class of hand-off bug.

**Why it does not need an intent window.** The [electrical
setters](#engine-lights-and-siren) need one because the physics owner republishes those bits every
500 ms and the server merges them by replacement, so a write racing an in-flight report loses. The
performance ceiling is not a field that report carries at all, so there is nothing for the merge to
overwrite. The race that *does* exist is on the client, where the ceiling routinely arrives before
the projection has attached -- a server-created vehicle has been measured taking 3.7 s to stream in
-- and it is answered the same way the intent window answers its race: the client holds the server
intent on the replica and applies it when the entity appears, retrying every frame until the
governor accepts it, and again if the projection re-attaches.

**The envelope is the client governor's envelope**, enforced on the Lua boundary, in the registry
and on both sides of the wire: `topSpeedKph` `0..1000`, `accelerationScale` in `(0, 1]`, `taperKph`
`3..200` with a default of `12`. The taper floor is not arbitrary -- below about 3 km/h the roll-off
is short enough that the limiter hunts around the ceiling and it reads as stutter, which is why the
[client-local form](#performance-ceilings) has refused that band since it shipped. A server cap must
not be a way around a rule somebody measured, so an unnamed taper takes the native default rather
than zero.

Read it back with `Open77.vehicles.getPerformance(id)`, or `get(id).performance`. Clearing it is
`clearPerformance(id)`, `setPerformance(id, nil)`, or any profile that asks for nothing -- no
ceiling and full throttle authority. The taper is not part of that test: a roll-off width around a
ceiling that does not exist changes nothing, which is how the native profile decides it too.

### Explode

`Open77.vehicles.explode(id)` writes the canonical ledger: health to zero, `destroyed` and
`exploded` raised, one revision. Every client that has the vehicle streamed then reconciles its own
projection through the damage path that already replays a wreck to a late joiner, which ends in
REDengine's own explosion on that machine. The blast, the sound and the physics are the engine's,
on every viewer at once; the server never touches an entity.

Three things it is worth being exact about, because a keys or a police resource will hit all three:

- **Occupants stay occupants.** The seat ledger is not touched. Nobody is ejected, no seat is
  freed, no life state changes, and the server sends no damage to any player -- inside the car or
  standing next to it. What the blast does to a body is the engine's own damage model running on
  each client, and it reaches the server the ordinary way, through the player damage report. A
  resource that wants the occupants dead has to say so itself.
- **It is terminal.** A second call is refused with `already_exploded` rather than re-detonating a
  wreck. A vehicle that is merely `destroyed` -- written off by collisions, never blown up -- is
  still a legitimate target.
- **An owner report cannot undo it.** Health merges by minimum and the destruction bits by OR, both
  monotone, so a report taken a moment before the explosion and claiming a pristine car does not
  bring the vehicle back to life.

### Locking a car for one player

The durable entry lock has always been all-or-nothing, which is the wrong shape for keys: a car is
locked for the street and open for the two people holding keys. Per-player exceptions express that
directly.

```lua
Open77.vehicles.setLockedForAll(id, true)              -- the street
for _, holder in ipairs(keyHolders) do
  Open77.vehicles.setLockedForPlayer(id, holder, false) -- the exceptions
end
```

The canonical bit stays `locked`, so a late joiner is told the right thing with no bookkeeping, and
a key holder who disconnects takes their exception with them. `isLockedForPlayer(id, playerId)` is
the single function that decides what a client is told, and the substitution happens at the point
where state reaches a socket -- both the periodic state packet and the create a viewer gets on
stream-in -- so no fan-out path can disagree with it. Nothing per-player is ever written into the
canonical flags, which is also why no owner report can disturb it: `Locked` is outside the set an
owner report is allowed to carry, and a report containing it is refused outright.

`setLockedForAll` **revokes every exception** as well as moving the canonical bit. That is the
point, not a side effect: "lock this for everyone" has to mean everyone, including the holders
excepted a minute ago. `Open77.vehicles.setLocked` is unchanged and moves only the canonical bit,
leaving exceptions standing.

### Lifetime

Props have had `ttlMs` since they shipped; vehicles had nothing, so a garage had to sweep its own.

| Policy | Where | Meaning |
|---|---|---|
| `ttlMs` | `create` definition, `setTimeToLive(id, ms)` | Remove the vehicle this many milliseconds from now. `0` or `nil` cancels. Capped at seven days. |
| `persistent` | `create` definition, `setPersistent(id, bool)` | **Nothing automatic removes this vehicle.** |
| `despawnWhenUnobserved` | `create` definition, `setDespawnWhenUnobserved(id, bool)` | Remove it once nobody has had it streamed for thirty seconds. |

```lua
local id = Open77.vehicles.create({
  record = "Vehicle.v_standard2_thorton_galena_player",
  position = spot, yaw = 90.0,
  ttlMs = 10 * 60 * 1000, despawnWhenUnobserved = true,
})
```

`persistent` has one meaning, deliberately: no time-to-live takes it, the unobserved sweep does not
take it, and it survives the stop of the resource that created it. An explicit
`Open77.vehicles.remove` still takes it -- persistence is protection from the reapers, not from the
owner. Taking persistence away hands the vehicle back to any deadline it still carries.

The unobserved window is not zero because interest is recomputed against the last received player
snapshot, and a loading screen or a bucket change briefly empties a viewer set that is about to
refill; thirty seconds rides that out. The clock runs for a vehicle nobody has *ever* seen too,
which is what a garage wants -- a car spawned for a player who never turns up still goes. A viewer
coming back resets the clock rather than pausing it, and turning the flag off forgets it, so
turning it back on later does not inherit a deadline from a window nobody was counting.

The reaper runs once per tick, before interest is reconciled, for the same reason the prop reaper
does: a vehicle whose lifetime ends must leave as a real removal the client tears down, not by
quietly dropping out of the next interest pass. Its removal reason is `3`.

**A deadline takes an occupied vehicle too.** A time-to-live a resource authored and then silently
declined to honour because someone happened to be sitting in the car is a worse surprise than the
removal, and the seat ledger is closed out properly either way -- every occupant gets their
`onPlayerLeftVehicle`. A garage that must not yank a car from under its driver clears the deadline
on `onPlayerEnteredVehicle`, or marks the vehicle persistent. The unobserved sweep cannot hit an
occupied vehicle at all: a seated player always has their vehicle streamed, so it always has a
viewer.

## Finding a vehicle

Every vehicle interaction in an RP server starts with "the closest vehicle", and until these
existed there was no way to ask.

| Runtime | Call | Answers |
|---|---|---|
| Client | `Open77.vehicles.closest(radius?)` | The nearest replicated vehicle to the local player. |
| Client | `Open77.vehicles.nearby(radius, options?)` | All of them within a radius, nearest first. |
| Client | `Open77.vehicles.aimed()` | The one the player is looking at, right now. |
| Client | `Open77.vehicles.fromEntity(entityId)` | The vehicle wearing an entity id. |
| Client | `Open77.vehicles.seatFree(id, seat)` / `occupantInSeat(id, seat)` | Seat occupancy, from the replicated ledger. |
| Server | `Open77.vehicles.nearby(anchor, radius?, options?)` | All registered vehicles near a point or a player. |
| Server | `Open77.vehicles.closest(anchor, options?)` | The nearest one. |
| Server | `Open77.vehicles.seatFree(id, seat)` / `occupantInSeat(id, seat)` / `freeSeats(id)` | Canonical seat occupancy. |

The server calls reuse the anchor, bucket and limit conventions of
[`Open77.players.nearby`](server-api.md#nearby-closest-distance) exactly: the anchor is a position table (a
vector3 is one) or a player id, a player anchor defaults to that player's own routing bucket,
`bucket = false` opts back out to every bucket, and ties are broken by vehicle id so the order does
not reshuffle between two calls with the same input.

The two sides say "nothing in range" differently, and the difference is deliberate. The **server**
answers a bare `nil` with no reason, matching `Open77.players.closest`: that is how a caller tells
"the search worked and the street is empty" from "the search failed". The **client** names the case
`no_vehicle_in_range`, because it has near neighbours a resource genuinely has to tell apart --
`no_local_position` when the player has no body yet, `no_session` before there is a roster at all.

```lua
-- Client: the car the player is standing at, or the one they are looking at.
local car = Open77.vehicles.closest(6.0) or Open77.vehicles.aimed()
if car then Open77.net.emitServer("keys:tryUnlock", car.id) end

-- Server: an empty seat in the nearest car in this player's own bucket.
local nearest = Open77.vehicles.closest(playerId, { radius = 10.0, occupied = false })
if nearest then
    local free = Open77.vehicles.freeSeats(nearest.id)
    if free[1] then
        Open77.vehicles.warpPlayerIntoVehicle(playerId, nearest.id, free[1])
    end
end
```

### What `closest` can and cannot find

**Only server-spawned vehicles are in the registry.** A player who walks up to a vanilla traffic
car is standing next to something REDengine population spawned on their own client: it has no
canonical id, no replica, and no entry in any of these calls. `closest()` will happily answer with
a registered car forty metres away while the player leans on a taxi, and that is the expected
behaviour rather than a bug.

Two consequences a server creator will otherwise trip over:

- a resource that must not act on the wrong car has to check `distance` itself, because "nearest
  registered" is not "nearest";
- `Open77.vehicles.aimed()` answers `unknown_entity` far more often than `no_target`. The player
  really is looking at a car; that car is simply traffic nobody created.

Adopting vanilla traffic into the registry is a separate capability that does not exist yet.

### Seat occupancy

`seatFree` and `occupantInSeat` read the **occupancy ledger**, not the local projection, so the
client and the server agree about who is where. A seat held by an occupant whose entry animation is
still running counts as **taken**: the seat is reserved and a second warp into it is refused, so
reporting it free would be a lie the caller then trips over one line later.

`freeSeats(id)` returns canonical seat names in `driver, frontPassenger, rearLeft, rearRight`
order, so `freeSeats(id)[1]` is a deterministic "put them anywhere" seat. It considers all four
seats of the standard layout; the registry does not know a two-seat record's seat count, so a
two-seater still reports its rear seats free.

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

### Who owns a car

`Open77.vehicles.owner(id)` answers FiveM's `NetworkGetEntityOwner` with more than a number,
because the lease has more than one shape. It requires `world.vehicles` and answers `nil, reason`
for an unknown id.

| Field | Meaning |
|---|---|
| `physicsOwner`, `authorityPlayerId` | The client simulating the car; `0` when parked. Both names carry the same value -- the vehicle read has always said `physicsOwner`, the NPC read says `authorityPlayerId`, and a script reading both should not learn two words. |
| `driver` | The seated controller -- the front-left occupant, or any occupant of an AV -- **whether or not** they own the lease. Absent when nobody is. |
| `steward` | The owner holds the lease without being the driver: the parked-car simulation the platform hands to the nearest occupant, or a script's own grant. |
| `aiDriven` | An NPC drive task holds the lease. |
| `epoch` | The authority epoch that owner holds. |
| `since`, `ageMs` | When the owner last changed, on the `GetGameTimer()` clock, and how long ago that was. |
| `reason` | Why it last changed: `driverclaim`, `driverrelease`, `leaseexpired`, `playerdisconnected`, `validationfailed`, `serverrevoke`, or `none` for a platform steward grant and for a car nobody has owned yet. |
| `leaseMs` | How long the current lease still has, when there is one. |

```lua
-- A speed camera only trusts a car somebody is actually driving.
local owner = Open77.vehicles.owner(id)
if owner and owner.driver and not owner.aiDriven then
    fine(owner.driver, Open77.vehicles.getSpeedKph(id))
end
```

`Open77.vehicles.requestAuthority(id, playerId)` is `NetworkRequestControlOfEntity` as a
**request**. It returns the owner table after the grant, or `nil, reason`, and the reasons are the
election's own eligibility made explicit:

| Reason | Means |
|---|---|
| `driven` | Somebody else is the seated controller. A driven car is never taken from its driver -- this is the rule that makes the call a request rather than an order. |
| `ai_driven` | An NPC drive task holds the lease; re-granting it would strand the task. |
| `not_streamed` | The player has no body for this car yet. A client cannot simulate what it has not spawned. |
| `too_far` | Beyond the 350 m stream-in radius. |
| `wrong_bucket` | The player is in another routing bucket. |
| `player_unavailable` | No fresh position for the player -- the same two-second rule every claim applies. |
| `already_owner` | Not a refusal: the call returns the read, and nothing is re-granted. |
| `invalid_player_id`, `vehicle_not_found` | The usual. |

The requested player being the driver already is the one case that is not a steal, and it is
granted. A grant is a lease like any other: the client keeps it by reporting, which its parked-pose
loop does twice a second once the car has been attached for five seconds, so a grant to a client
that has only just streamed the car in can lapse two seconds later -- and `owner` then says so.
That is what a lease is, not a defect of the request.

```lua
-- Hand a parked car to the player who just bought it, so their client simulates it
-- while they walk around it. Refused by name if somebody is sitting in it.
local read, reason = Open77.vehicles.requestAuthority(id, buyerId)
if read == nil then print("not yet: " .. reason) end
```

There is no `Open77.vehicles.entity(id)`: the client's `Open77.vehicles.get(id).entity` **field**
is the REDengine entity, and `Open77.vehicles.fromEntity(entity)` is the way back, which is all
`NetworkGetNetworkIdFromEntity` ever needed. NPCs have the same read, `Open77.npcs.owner(id)`, in
the same shape (`authorityPlayerId`, `physicsOwner`, `epoch`, `since`, `ageMs`, `reason`,
`leaseMs`, plus `readyClients`, the election's candidates) and no request: an NPC's authority is
elected from the clients whose projection reported ready, and a script has no better information
than the election about which of them should simulate a body.

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
surface-material particles are outside the v1 contract.

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

`resources/system/open77_vehicles` is the runnable example. It registers:

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
vehicle.paint.reset <id>
```

`vehicle.list` and `vehicle.damage.dump` are read-only. Mutation commands are restricted. Grant
the corresponding exact `command.vehicle.*` ACL permissions before using them from chat.

Vehicle record names are listed in the project vehicle catalog. Prefer player variants such as `Vehicle.v_standard2_archer_hella_player`; quest and traffic variants are valid records but are not guaranteed to be pilotable.
