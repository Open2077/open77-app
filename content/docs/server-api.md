# Complete server Lua API

This page inventories the Lua surface installed by the dedicated server runtime. These functions
exist only in `server_script` and server-side `shared_script` files. The generated client reference
documents a different runtime; a function appearing on this page must not be assumed to exist on a
client.

Prefer the `CyberM.*` names below. FiveM-style globals remain available where listed for familiar
resource code and as the low-level implementation surface.

## Runtime, scheduler, events, commands, and JSON

| Function | Signature | Result / purpose |
|---|---|---|
| `CreateThread` | `(function)` | Schedule a coroutine in this resource. |
| `GetGameTimer` | `()` | Process-monotonic milliseconds used by the server scheduler. |
| `Wait` | `(milliseconds)` | Yield the current managed coroutine; accepted range is 0–86,400,000 ms. |
| `SetTimeout` | `(milliseconds, function)` | Schedule a one-shot callback and return its timer ID. |
| `ClearTimeout` | `(timerId)` | Cancel a scheduled timeout. |
| `AddEventHandler` | `(event, handler)` | Register a local handler and return its ID. |
| `RemoveEventHandler` | `(handlerId)` | Remove a local or network handler. |
| `TriggerEvent` | `(event, ...)` | Queue a local event in every matching handler of this VM. |
| `RegisterNetEvent` | `(event, handler?)` | Register an authenticated client event; requires `network.events`. |
| `TriggerClientEvent` | `(event, playerId|-1, ...)` | Send to one session or broadcast; requires `network.events`. |
| `RegisterCommand` | `(name, handler, restricted?)` | Register a server/chat command. Restricted commands require ACL `command.<name>`. |
| `GetCurrentResourceName` | `()` | Return this manifest's resource name. |
| `GetResourceState` | `(resourceName)` | Return the current server resource state. |
| `print` | `(...)` | Write a resource-prefixed server log entry. |
| `json.encode` | `(value)` | Serialize a bounded Lua value to JSON. |
| `json.decode` | `(text)` | Decode JSON into safe Lua values. |

Limits are 1,024 scheduled tasks and 2,048 handlers per resource. Network events accept at most 32
arguments in a 48 KiB JSON envelope. During a network handler, global `source` is set from the
authenticated connection, never from client payload data.

The namespaced equivalents are:

| Function | Signature |
|---|---|
| `CyberM.runtime.luaVersion` | `()` |
| `CyberM.time.monotonic` | `()` — monotonic seconds |
| `CyberM.resource.name` | `()` |
| `CyberM.resource.state` | `(resourceName)` |
| `CyberM.events.on` / `off` / `emit` | Same as `AddEventHandler`, `RemoveEventHandler`, `TriggerEvent` |
| `CyberM.net.on` / `emitClient` | Same as `RegisterNetEvent`, `TriggerClientEvent` |

## Notifications

These methods route to the official `cyberm_notifications` client package. IDs and mutation rights
are isolated per calling server resource.

| Function | Signature | Result |
|---|---|---|
| `CyberM.notifications.send` | `(playerId, definition)` | Owner-local notification ID, or `nil, reason`. |
| `CyberM.notifications.broadcast` | `(definition)` | Owner-local broadcast ID, or `nil, reason`. |
| `CyberM.notifications.update` | `(id, patch)` | `boolean, reason?` |
| `CyberM.notifications.dismiss` | `(id)` | `boolean, reason?` |
| `CyberM.notifications.clear` | `(playerId?)` | Clear this owner's notifications for one player or everyone. |

See [notifications](notifications.md) for every definition field and queue limit.

## Players and authoritative life

| Function | Permission | Signature | Result / purpose |
|---|---|---|---|
| `CyberM.players.name` | None | `(playerId)` | Display name or `nil`. |
| `CyberM.players.identifier` | None | `(playerId)` | Durable authenticated identifier or `nil`. |
| `CyberM.players.position` | None | `(playerId)` | `{ x, y, z, bucket }` or `nil`. |
| `CyberM.players.getLifeState` | `players.life.read` | `(playerId)` | Canonical life snapshot or `nil`. |
| `CyberM.players.isDead` | `players.life.read` | `(playerId)` | Whether phase is dead/revive-pending/respawn-pending. |
| `CyberM.players.kill` | `players.life.kill` | `(playerId, options?)` | `boolean, reason?` |
| `CyberM.players.revive` | `players.life.revive` | `(playerId, options?)` | `boolean, reason?` |
| `CyberM.players.respawn` | `players.life.respawn` | `(playerId, options)` | `boolean, reason?` |
| `CyberM.players.requestLifeResync` | `players.life.resync` | `(playerId)` | `boolean, reason?` |
| `CyberM.players.getHealth` | `players.damage.read` | `(playerId)` | Health/armor/god-mode snapshot or `nil`. |
| `CyberM.players.damage` | `players.damage.apply` | `(playerId, amount, options?)` | Apply authoritative damage. |
| `CyberM.players.heal` | `players.damage.apply` | `(playerId, amount)` | Apply authoritative healing. |
| `CyberM.players.setHealth` | `players.damage.apply` | `(playerId, health)` | Set health; zero passes through life authority. |
| `CyberM.players.setMaxHealth` | `players.damage.apply` | `(playerId, maxHealth)` | Update the canonical maximum. |
| `CyberM.players.setArmor` | `players.damage.apply` | `(playerId, armor)` | Update canonical armor. |
| `CyberM.players.setGodMode` | `players.damage.apply` | `(playerId, enabled)` | Toggle canonical damage immunity. |
| `CyberM.players.setRegen` | `players.damage.apply` | `(playerId, pointsPerSecond)` | Set authoritative regeneration. |

Life option fields are:

- `kill`: `killer`, `cause`, `weapon`, `impulse = { x, y, z }`;
- `revive`: `health`, `graceMs`;
- `respawn`: required `position = { x, y, z }`, plus `heading`, `bucket`, `health`, `graceMs`;
- `damage`: `attacker`, `cause`/`kind`, `weapon`.

Low-level aliases are `GetPlayerName`, `GetPlayerIdentifier`, `GetPlayerPosition`,
`GetPlayerLifeState`, `IsPlayerDead`, `KillPlayer`, `RevivePlayer`, `RespawnPlayer`,
`RequestPlayerLifeResync`, `GetPlayerHealth`, `DamagePlayer`, `HealPlayer`, `SetPlayerHealth`,
`SetPlayerMaxHealth`, `SetPlayerArmor`, `SetPlayerGodMode`, and `SetPlayerRegen`. Prefer the
namespaced wrappers because they accept structured option tables.

## Combat policy

All combat policy functions require `combat.config`.

| Function | Signature | Purpose |
|---|---|---|
| `CyberM.combat.onDamage` | `(handler)` | Add a synchronous damage arbiter and return it. `false` cancels; a number rewrites damage. |
| `CyberM.combat.offDamage` | `(handler)` | Remove a previously installed arbiter. |
| `CyberM.combat.setFriendlyFire` | `(enabled)` | Enable or disable damage between teammates. |
| `CyberM.combat.setTeam` | `(playerId, teamId)` | Assign a non-negative team. |
| `CyberM.combat.setDamageMultiplier` | `(multiplier)` | Set global multiplier, range 0–100. |
| `CyberM.combat.setHeadshotMultiplier` | `(multiplier)` | Set headshot multiplier, range 0–100. |
| `CyberM.combat.setWeaponDamageMultiplier` | `(weaponTdbId, multiplier)` | Override one weapon, range 0–100. |
| `CyberM.combat.setKindDamageMultiplier` | `(ranged|melee|explosion, multiplier)` | Override one attack kind. |

Low-level aliases are `SetCombatFriendlyFire`, `SetCombatTeam`, `SetCombatDamageMultiplier`,
`SetCombatHeadshotMultiplier`, `SetCombatWeaponMultiplier`, and `SetCombatKindMultiplier`.

## Routing buckets

| Function | Signature | Result / purpose |
|---|---|---|
| `CyberM.routingBuckets.getPlayer` | `(playerId)` | Player bucket, default `0`. |
| `CyberM.routingBuckets.setPlayer` | `(playerId, bucket)` | `boolean`; moves authoritative visibility scope. |
| `CyberM.routingBuckets.getEntity` | `(entityId)` | Entity bucket, default `0`. |
| `CyberM.routingBuckets.setEntity` | `(entityId, bucket)` | `boolean`. |
| `CyberM.routingBuckets.setLockdownMode` | `(bucket, mode)` | Mode: `inactive`, `relaxed`, `strict`, or `full`. |
| `CyberM.routingBuckets.setPopulationEnabled` | `(bucket, enabled)` | Toggle ambient population policy for the bucket. |

The corresponding globals are `GetPlayerRoutingBucket`, `SetPlayerRoutingBucket`,
`GetEntityRoutingBucket`, `SetEntityRoutingBucket`, `SetRoutingBucketEntityLockdownMode`, and
`SetRoutingBucketPopulationEnabled`.

## Ground loot

Every method requires `world.loot`. Drops are authoritative and owned by their creating resource.

| Function | Signature | Result |
|---|---|---|
| `CyberM.loot.create` | `(definition)` | CyberM loot ID, or `nil, reason`. |
| `CyberM.loot.update` | `(id, patch)` | `boolean` |
| `CyberM.loot.remove` | `(id)` | `boolean` |
| `CyberM.loot.get` | `(id)` | Drop snapshot or `nil`. |
| `CyberM.loot.all` | `(bucket?)` | Array of drop snapshots. |

Definitions accept `item`, `quantity`, `position`, `bucket`, `radius`, `label`, `visualItem`/`model`,
and `ttlMs`. Low-level aliases are `CreateLootDrop`, `UpdateLootDrop`, `RemoveLootDrop`,
`GetLootDrop`, and `GetLootDrops`. See [loot](loot.md) for pickup validation and client projection.

## Vehicles

Every method in this section requires `world.vehicles`. IDs are server-assigned CyberM IDs; do not
substitute REDengine entity pointers or local spawn handles.

The [vehicle guide](vehicles.md#complete-lua-api-inventory) lists all 43 server methods individually,
the six client methods, the two package exports, exact snapshot fields, bit indexes, and examples.

### Lifecycle and state

| Function | Signature | Purpose |
|---|---|---|
| `CyberM.vehicles.create` | `(definition)` | Create and return an authoritative vehicle ID. |
| `CyberM.vehicles.update` | `(id, patch)` | Patch health, flags, colours, doors, windows, tires, body, glass, and lights. |
| `CyberM.vehicles.get` | `(id)` | Full canonical vehicle snapshot or `nil`. |
| `CyberM.vehicles.all` | `(bucket?)` | All canonical vehicles, optionally filtered by bucket. |
| `CyberM.vehicles.setTransform` | `(id, transform)` | Set authoritative position and yaw. |
| `CyberM.vehicles.remove` | `(id)` | Remove the authoritative vehicle. |
| `CyberM.vehicles.getDamage` | `(id)` | `{ body, glass, lights, tires }` or `nil`. |
| `CyberM.vehicles.setDamage` | `(id, damage)` | Replace combined damage fields. |
| `CyberM.vehicles.repair` | `(id, scope?)` | Scope: `glass`, `body`, `lights`, `tires`, `visual`, `mechanical`, or `full`. |

`create` accepts `record`, `position`, `yaw`, `bucket`, `appearance`, `health`, `flags`,
`primaryColor`, `secondaryColor`, and the same initial damage/opening fields accepted by `update`.

### Body, glass, lights, and tires

| Function | Signature | Purpose |
|---|---|---|
| `setBodyDamage` | `(id, values[30])` | Replace all normalized body cells. |
| `setBodyCell` / `damageBodyCell` / `repairBodyCell` | `(id, cell, value?)` | Set, add to, or clear cell 1–30. |
| `setBodyZone` / `damageBodyZone` / `repairBodyZone` | `(id, zone, value?)` | Mutate a named/profile zone or explicit cell array. |
| `setGlassMask` | `(id, mask)` | Replace the 32-bit broken-glass mask. |
| `setGlassBroken` | `(id, glass, broken)` | Mutate one numeric or profile-named pane. |
| `breakGlass` / `repairGlass` | `(id, glass)` | Convenience pane mutation. |
| `breakAllGlass` / `repairAllGlass` | `(id, count?)` / `(id)` | Break the first 0–32 panes or clear the mask. |
| `setLightMask` | `(id, mask)` | Replace broken-light mask. |
| `setLightBroken` | `(id, index, broken)` | Mutate one light bit. |
| `breakLight` / `repairLight` / `repairAllLights` | `(id, index?)` | Light convenience methods. |
| `setTireMask` | `(id, mask)` | Replace four-wheel broken-tire mask. |
| `setTireBroken` | `(id, index, broken)` | Mutate tire index 0–3. |
| `breakTire` / `repairTire` / `repairAllTires` | `(id, index?)` | Tire convenience methods. |
| `registerDamageProfile` | `(record, profile)` | Register record-specific glass names and body zones in this VM. |
| `getDamageProfile` | `(record)` | Return this resource's registered profile or `nil`. |

Default `CyberM.vehicles.bodyZones` are `backLeft`, `back`, `backRight`, `left`, `center`, `right`,
`frontLeft`, `front`, `frontRight`, `lower`, `roof`, and `all`.

### Doors and windows

| Function | Signature | Purpose |
|---|---|---|
| `setDoorMask` | `(id, mask)` | Replace the six-bit opening mask. |
| `setDoorOpen` | `(id, door, opened)` | Set one opening. |
| `openDoor` / `closeDoor` | `(id, door)` | Convenience mutation. |
| `isDoorOpen` | `(id, door)` | Boolean or `nil` for unknown vehicle. |
| `setWindowOpen` | `(id, window, opened)` | Set one window opening. |
| `openWindow` / `closeWindow` | `(id, window)` | Convenience mutation. |
| `isWindowOpen` | `(id, window)` | Boolean or `nil` for unknown vehicle. |

Door names are `frontLeft`, `frontRight`, `backLeft`, `backRight`, `trunk`, and `hood`; windows
use the four side names. Constants live in `CyberM.vehicles.doors` and `.windows`. State flags live
in `.flags`: `engineOn`, `locked`, `destroyed`, `exploded`, `invulnerable`, `immortal`, `lightsOn`,
`highBeams`, and `sirenOn`.

Low-level aliases are `CreateVehicle`, `UpdateVehicleState`, `SetVehicleTransform`, `RemoveVehicle`,
`GetVehicle`, and `GetVehicles`. The namespaced API supplies validation and damage helpers and is
the recommended surface. See [vehicles](vehicles.md) for snapshots, streaming, authority and seats.

## NPCs and tasks

All methods require `world.npcs`.

### NPC lifecycle and state

| Function | Signature | Purpose |
|---|---|---|
| `CyberM.npcs.create` | `(definition)` | Create an authoritative NPC and return its ID. |
| `CyberM.npcs.update` | `(id, patch)` | Patch appearance, loadout, AI mode, damage policy, health, or ragdoll. |
| `CyberM.npcs.setTransform` | `(id, transform)` | Set canonical position and yaw. |
| `CyberM.npcs.setBucket` | `(id, bucket)` | Move NPC visibility scope. |
| `CyberM.npcs.setAppearance` | `(id, appearance)` | Appearance convenience patch. |
| `CyberM.npcs.setLoadout` | `(id, loadout)` | Loadout convenience patch. |
| `CyberM.npcs.setHealth` | `(id, health, maxHealth?)` | Health convenience patch. |
| `CyberM.npcs.setDamagePolicy` | `(id, policy)` | Set mortal/immortal/invulnerable policy. |
| `CyberM.npcs.setAiMode` | `(id, mode)` | Set tasks/frozen/native mode. |
| `CyberM.npcs.setRagdoll` | `(id, enabled)` | Set canonical ragdoll state. |
| `CyberM.npcs.kill` / `revive` / `applyDamage` | `(id, ...)` | Authoritative life mutations. |
| `CyberM.npcs.remove` | `(id)` | Remove the NPC. |
| `CyberM.npcs.get` / `all` | `(id)` / `(bucket?)` | One snapshot or an array. |
| `CyberM.npcs.templates` | `()` | Complete curated template catalogue. |

Definition fields include `template`, `position`, `yaw`, `bucket`, `appearance`, `loadout`,
`aiMode`, `damagePolicy`, `health`, `maxHealth`, `streamingRadius`, `streamingHysteresis`,
`despawnWhenUnobserved`, and `persistent`.

Constants are `CyberM.npcs.flags`, `.ai`, `.damage`, and `.channels`.

### Task queue

| Function | Signature | Purpose |
|---|---|---|
| `CyberM.npcs.tasks.enqueue` | `(id, type, parameters?, options?)` | Enqueue any supported task. |
| `cancel` | `(id, taskId)` | Cancel one task. |
| `clear` | `(id, channel?)` | Clear queued/current tasks. |
| `get` | `(id, taskId)` | Read one task. |
| `all` | `(id)` | List tasks for an NPC. |
| `moveTo` | `(id, position, options?)` | Move with speed, acceptance radius, priority, and timeout. |
| `follow` | `(id, target, options?)` | Follow a player, NPC, or position. |
| `patrol` | `(id, points, options?)` | Patrol with loop/back-and-forth options. |
| `wander` | `(id, options?)` | Wander using the supplied movement parameters. |
| `face` | `(id, position, options?)` | Rotate toward a world point. |
| `lookAt` | `(id, target, options?)` | Drive the look channel toward player/NPC/position. |
| `wait` | `(id, durationMs, options?)` | Timed action-channel wait. |
| `hold` | `(id, options?)` | Hold movement indefinitely or until timeout/cancel. |
| `playAnimation` | `(id, animation, options?)` | Run a full-body animation task. |

Low-level aliases are `CreateNpc`, `UpdateNpc`, `SetNpcTransform`, `SetNpcBucket`, `RemoveNpc`,
`GetNpc`, `GetNpcs`, `EnqueueNpcTask`, `CancelNpcTask`, `ClearNpcTasks`, `GetNpcTask`, `GetNpcTasks`,
`KillNpc`, `ReviveNpc`, `DamageNpc`, and `GetNpcTemplates`. See [NPCs](npcs.md) for the task state
machine, ownership, streaming, templates, and events.

## Elevators

All methods require `world.elevators`.

| Function | Signature | Purpose |
|---|---|---|
| `CyberM.elevators.adopt` | `(definition)` | Adopt a native lift and return a CyberM elevator ID. |
| `goTo` / `call` | `(id, floor, options?)` | Start authoritative travel; options include `travelMs` and `force`. |
| `teleport` | `(id, floor)` | Administrative recovery without travel. |
| `pause` / `resume` | `(id)` | Pause or continue authoritative movement. |
| `setFlags` | `(id, flags)` | Update power, lock, interaction, and door policy. |
| `remove` | `(id)` | Release the managed elevator. |
| `get` / `all` | `(id)` / `(bucket?)` | Read canonical snapshots. |

`adopt` accepts `engineEntity`, `position`, `bucket`, `initialFloor`, `flags`, and required
`floorCount`. Constants are in `CyberM.elevators.flags`. Low-level aliases are `AdoptElevator`,
`GoToElevator`, `TeleportElevator`, `PauseElevator`, `ResumeElevator`, `SetElevatorFlags`,
`RemoveElevator`, `GetElevator`, and `GetElevators`. See [elevators](elevators.md).

## Database

Database access requires `database.access`. `CyberM.database` and `MySQL` refer to the same
oxmysql-compatible table.

| Method | Callback form | Await form |
|---|---|---|
| `query` / `prepare` | `(sql, params?, callback?)` | `.await(sql, params?)` returns rows. |
| `single` | `(sql, params?, callback?)` | `.await` returns one row or `nil`. |
| `scalar` | `(sql, params?, callback?)` | `.await` returns one scalar. |
| `insert` | `(sql, params?, callback?)` | `.await` returns inserted ID/result. |
| `update` / `rawExecute` | `(sql, params?, callback?)` | `.await` returns affected-row result. |
| `transaction` | `(statements, callback?)` | `.await(statements)` returns `true` or `false, reason`. |

Callbacks and `.await` continuations resume on the owning resource's scheduler, never on the
database worker. See the database guide in `docs/database.md` for parameter forms, limits,
transactions, configuration, and migrations.

## Logging

`CyberM.log.debug`, `.info`, `.warn`, and `.error` currently forward their arguments to the
resource-prefixed server logger. Their common signature is `(...)`; no return value is produced.

## Permission summary

| Capability | Server namespaces |
|---|---|
| `network.events` | `CyberM.net`, `RegisterNetEvent`, `TriggerClientEvent` |
| `world.loot` | `CyberM.loot` |
| `world.vehicles` | `CyberM.vehicles` |
| `world.npcs` | `CyberM.npcs` |
| `world.elevators` | `CyberM.elevators` |
| `players.life.read` | Player life reads |
| `players.life.kill` | `CyberM.players.kill` |
| `players.life.revive` | `CyberM.players.revive` |
| `players.life.respawn` | `CyberM.players.respawn` |
| `players.life.resync` | `CyberM.players.requestLifeResync` |
| `players.damage.read` | `CyberM.players.getHealth` |
| `players.damage.apply` | Player health/damage mutations |
| `combat.config` | `CyberM.combat` and damage arbiters |
| `database.access` | `CyberM.database` / `MySQL` |

Request only the capabilities a resource actually uses. A manifest permission grants access to a
binding; it does not replace validation of player identity, distance, ownership, revision, bucket,
or gameplay state.

## Audit status

This page covers every public global installed by `LuaResourceRuntime.Sandbox`, including all 69
low-level bindings, and every namespaced helper and constant installed by the server bootstrap.
`wiki/tools/audit-api.py` compares public globals with this page and fails when a new binding is not
documented. The higher-level tables are kept beside their validation and permission rules above so
their authoritative semantics remain explicit instead of being confused with the client runtime.
