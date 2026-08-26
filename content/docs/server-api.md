# Complete server Lua API

This page inventories the Lua surface installed by the dedicated server runtime. These functions
exist only in `server_script` and server-side `shared_script` files. The generated client reference
documents a different runtime; a function appearing on this page must not be assumed to exist on a
client.

Prefer the `Open77.*` names below. FiveM-style globals remain available where listed for familiar
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
| `Open77.runtime.luaVersion` | `()` |
| `Open77.time.monotonic` | `()` — monotonic seconds |
| `Open77.resource.name` | `()` |
| `Open77.resource.state` | `(resourceName)` |
| `Open77.events.on` / `off` / `emit` | Same as `AddEventHandler`, `RemoveEventHandler`, `TriggerEvent` |
| `Open77.net.on` / `emitClient` | Same as `RegisterNetEvent`, `TriggerClientEvent` |

## Notifications

These methods route to the official `open77_notifications` client package. IDs and mutation rights
are isolated per calling server resource.

| Function | Signature | Result |
|---|---|---|
| `Open77.notifications.send` | `(playerId, definition)` | Owner-local notification ID, or `nil, reason`. |
| `Open77.notifications.broadcast` | `(definition)` | Owner-local broadcast ID, or `nil, reason`. |
| `Open77.notifications.update` | `(id, patch)` | `boolean, reason?` |
| `Open77.notifications.dismiss` | `(id)` | `boolean, reason?` |
| `Open77.notifications.clear` | `(playerId?)` | Clear this owner's notifications for one player or everyone. |

See [notifications](notifications.md) for every definition field and queue limit.

## Player clothing

These asynchronous methods target the official `open77_clothing` client relay. The calling server
resource must declare `network.events`. Request IDs are prefixed with the resource name, and only
that resource VM can match the completion.

| Function | Signature | Result |
|---|---|---|
| `Open77.clothing.equip` | `(playerId, record, options?)` | Request ID, or `nil, reason`. |
| `Open77.clothing.unequip` | `(playerId, slot)` | Request ID, or `nil, reason`. |
| `Open77.clothing.set` | `(playerId, wardrobe, options?)` | Request ID, or `nil, reason`. |
| `Open77.clothing.clear` | `(playerId)` | Request ID, or `nil, reason`. |
| `Open77.clothing.requestSnapshot` | `(playerId)` | Request ID, or `nil, reason`. |

Listen for the resource-local `open77:clothing:completed` event. Its arguments are
`playerId, requestId, operation, accepted, reason, result`. Dispatch failures are returned
immediately; unanswered requests complete with `request_timeout` after 10 seconds. Full record,
slot, result, rollback, and replication semantics are in
[Clothing Lua API](../docs/clothing.md).

## Players and authoritative life

| Function | Permission | Signature | Result / purpose |
|---|---|---|---|
| `Open77.players.name` | None | `(playerId)` | Display name or `nil`. |
| `Open77.players.identifier` | None | `(playerId)` | Durable authenticated identifier or `nil`. |
| `Open77.players.position` | None | `(playerId)` | `{ x, y, z, bucket }` or `nil`. |
| `Open77.players.disconnect` | `players.disconnect` | `(playerId, reason?)` | Queue a reasoned disconnect; `boolean, reason?`. |
| `Open77.players.kick` | `players.disconnect` | `(playerId, reason?)` | Alias of `disconnect`. |
| `Open77.players.ban` | `players.ban` | `(playerId, reason?, durationSeconds?)` | Persist a server-scoped device ban through the master and disconnect now. |
| `Open77.players.getLifeState` | `players.life.read` | `(playerId)` | Canonical life snapshot or `nil`. `phase` is `alive`, `dead`, `revivepending`, `respawnpending`, `recovering` — **no underscore**, unlike the client. |
| `Open77.players.isDead` | `players.life.read` | `(playerId)` | Whether phase is dead/revive-pending/respawn-pending. Resolved from the enum, so it is immune to the spelling split — prefer it over comparing `phase`. |
| `Open77.players.kill` | `players.life.kill` | `(playerId, options?)` | `boolean, reason?` |
| `Open77.players.revive` | `players.life.revive` | `(playerId, options?)` | `boolean, reason?` |
| `Open77.players.respawn` | `players.life.respawn` | `(playerId, options)` | `boolean, reason?` |
| `Open77.players.requestLifeResync` | `players.life.resync` | `(playerId)` | `boolean, reason?` |
| `Open77.players.getHealth` | `players.damage.read` | `(playerId)` | Health/armor/god-mode snapshot or `nil`. |
| `Open77.players.damage` | `players.damage.apply` | `(playerId, amount, options?)` | Apply authoritative damage. |
| `Open77.players.heal` | `players.damage.apply` | `(playerId, amount)` | Apply authoritative healing. |
| `Open77.players.setHealth` | `players.damage.apply` | `(playerId, health)` | Set health; zero passes through life authority. |
| `Open77.players.setMaxHealth` | `players.damage.apply` | `(playerId, maxHealth)` | Update the canonical maximum. |
| `Open77.players.setArmor` | `players.damage.apply` | `(playerId, armor)` | Update canonical armor. |
| `Open77.players.setGodMode` | `players.damage.apply` | `(playerId, enabled)` | Toggle canonical damage immunity. |
| `Open77.players.setRegen` | `players.damage.apply` | `(playerId, pointsPerSecond)` | Set authoritative regeneration. |

Life option fields are:

- `kill`: `killer`, `cause`, `weapon`, `impulse = { x, y, z }`;
- `revive`: `health`, `graceMs`;
- `respawn`: required `position = { x, y, z }`, plus `heading`, `bucket`, `health`, `graceMs`;
- `damage`: `attacker`, `cause`/`kind`, `weapon`.

### Disconnecting and banning a player

Declare the capability explicitly in the server resource manifest:

```lua
permission "players.disconnect"
permission "players.ban"
```

Then disconnect an authenticated session ID with a reason shown to that client:

```lua
local ok, error = Open77.players.disconnect(playerId, "Banned: cheating")
if not ok then
  print("disconnect failed", error)
end

-- FiveM-style low-level spelling and short namespaced alias:
DropPlayer(playerId, "Kicked by an administrator")
Open77.players.kick(playerId, "Server maintenance")

-- Permanent when durationSeconds is omitted; otherwise temporary.
local banned, banError = Open77.players.ban(playerId, "Cheating", 86400)
-- FiveM-style low-level spelling:
BanPlayer(playerId, "Cheating", 86400)
```

The reason is trimmed, must contain no control characters, and is limited to 127 UTF-8 bytes so
the GNS transport can deliver it without truncation. Omitting it uses `Disconnected by server.`.
The closure is deferred until the current server Lua callback has returned; repeated calls for the
same player in one tick are idempotent and the first reason wins.

`Open77.players.ban` and `BanPlayer` resolve the player's authenticated device identity, submit a
server-scoped ban to the master, and queue the immediate disconnect. The optional duration is a
strictly positive number of seconds; omitting it creates a permanent ban. Ban reasons accept up to
512 UTF-8 bytes. Central publication is best-effort and asynchronous, while the local kick is
queued immediately.

Normal failures return `false, reason`, where `reason` is one of
`permission_denied:players.disconnect`, `invalid_player_id`, `invalid_reason`,
`player_not_found`, or `server_unavailable`.

Ban failures return `permission_denied:players.ban`, `invalid_player_id`, `invalid_reason`,
`invalid_duration`, `server_unavailable`, or `ban_failed`.

Low-level aliases are `GetPlayerName`, `GetPlayerIdentifier`, `GetPlayerPosition`,
`DropPlayer`, `BanPlayer`, `GetPlayerLifeState`, `IsPlayerDead`, `KillPlayer`, `RevivePlayer`, `RespawnPlayer`,
`RequestPlayerLifeResync`, `GetPlayerHealth`, `DamagePlayer`, `HealPlayer`, `SetPlayerHealth`,
`SetPlayerMaxHealth`, `SetPlayerArmor`, `SetPlayerGodMode`, and `SetPlayerRegen`. Prefer the
namespaced wrappers because they accept structured option tables.

## Combat policy

All combat policy functions require `combat.config`.

| Function | Signature | Purpose |
|---|---|---|
| `Open77.combat.onDamage` | `(handler)` | Add a synchronous damage arbiter and return it. `false` cancels; a number rewrites damage. |
| `Open77.combat.offDamage` | `(handler)` | Remove a previously installed arbiter. |
| `Open77.combat.setFriendlyFire` | `(enabled)` | Enable or disable damage between teammates. |
| `Open77.combat.setTeam` | `(playerId, teamId)` | Assign a non-negative team. |
| `Open77.combat.setDamageMultiplier` | `(multiplier)` | Set global multiplier, range 0–100. |
| `Open77.combat.setHeadshotMultiplier` | `(multiplier)` | Set headshot multiplier, range 0–100. |
| `Open77.combat.setWeaponDamageMultiplier` | `(weaponTdbId, multiplier)` | Override one weapon, range 0–100. |
| `Open77.combat.setKindDamageMultiplier` | `(ranged|melee|explosion, multiplier)` | Override one attack kind. |

Low-level aliases are `SetCombatFriendlyFire`, `SetCombatTeam`, `SetCombatDamageMultiplier`,
`SetCombatHeadshotMultiplier`, `SetCombatWeaponMultiplier`, and `SetCombatKindMultiplier`.

## Routing buckets

| Function | Signature | Result / purpose |
|---|---|---|
| `Open77.routingBuckets.getPlayer` | `(playerId)` | Player bucket, default `0`. |
| `Open77.routingBuckets.setPlayer` | `(playerId, bucket)` | `boolean`; moves authoritative visibility scope. |
| `Open77.routingBuckets.getEntity` | `(entityId)` | Entity bucket, default `0`. |
| `Open77.routingBuckets.setEntity` | `(entityId, bucket)` | `boolean`. |
| `Open77.routingBuckets.setLockdownMode` | `(bucket, mode)` | Mode: `inactive`, `relaxed`, `strict`, or `full`. |
| `Open77.routingBuckets.setPopulationEnabled` | `(bucket, enabled)` | Toggle ambient population policy for the bucket. |

The corresponding globals are `GetPlayerRoutingBucket`, `SetPlayerRoutingBucket`,
`GetEntityRoutingBucket`, `SetEntityRoutingBucket`, `SetRoutingBucketEntityLockdownMode`, and
`SetRoutingBucketPopulationEnabled`.

## Ground loot

Every method requires `world.loot`. Drops are authoritative and owned by their creating resource.

| Function | Signature | Result |
|---|---|---|
| `Open77.loot.create` | `(definition)` | Open77 loot ID, or `nil, reason`. |
| `Open77.loot.update` | `(id, patch)` | `boolean` |
| `Open77.loot.remove` | `(id)` | `boolean` |
| `Open77.loot.get` | `(id)` | Drop snapshot or `nil`. |
| `Open77.loot.all` | `(bucket?)` | Array of drop snapshots. |

Definitions accept `item`, `quantity`, `position`, `bucket`, `radius`, `label`, `visualItem`/`model`,
and `ttlMs`. Low-level aliases are `CreateLootDrop`, `UpdateLootDrop`, `RemoveLootDrop`,
`GetLootDrop`, and `GetLootDrops`. See [loot](loot.md) for pickup validation and client projection.

## Vehicles

Every method in this section requires `world.vehicles`. IDs are server-assigned Open77 IDs; do not
substitute REDengine entity pointers or local spawn handles.

The [vehicle guide](vehicles.md#complete-lua-api-inventory) lists all 47 server methods individually,
the six client methods, the two package exports, exact snapshot fields, bit indexes, and examples.

### Lifecycle and state

| Function | Signature | Purpose |
|---|---|---|
| `Open77.vehicles.create` | `(definition)` | Create and return an authoritative vehicle ID. |
| `Open77.vehicles.update` | `(id, patch)` | Patch health, flags, colours, openings and all durable damage channels. |
| `Open77.vehicles.get` | `(id)` | Full canonical vehicle snapshot or `nil`. |
| `Open77.vehicles.all` | `(bucket?)` | All canonical vehicles, optionally filtered by bucket. |
| `Open77.vehicles.setTransform` | `(id, transform)` | Set authoritative position and yaw. |
| `Open77.vehicles.remove` | `(id)` | Remove the authoritative vehicle. |
| `Open77.vehicles.getDamage` | `(id)` | `{ body, glass, lights, tires, detachedParts }` or `nil`. |
| `Open77.vehicles.setDamage` | `(id, damage)` | Replace combined damage fields. |
| `Open77.vehicles.repair` | `(id, scope?)` | Scope: `glass`, `body`, `lights`, `tires`, `visual`, `mechanical`, or `full`. |

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

Default `Open77.vehicles.bodyZones` are `backLeft`, `back`, `backRight`, `left`, `center`, `right`,
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
use the four side names. Constants live in `Open77.vehicles.doors` and `.windows`. State flags live
in `.flags`: `engineOn`, `locked`, `destroyed`, `exploded`, `invulnerable`, `immortal`, `lightsOn`,
`highBeams`, and `sirenOn`.

### Detached panels

| Function | Signature | Purpose |
|---|---|---|
| `setDetachedPartMask` | `(id, mask)` | Add a monotonic 16-bit detached-part mask. |
| `setPartDetached` | `(id, part, true)` | Detach one standard named/indexed panel. |
| `detachPart` | `(id, part)` | Convenience detachment method. |
| `isPartDetached` | `(id, part)` | Read one canonical detachment bit. |

Names are exposed in `Open77.vehicles.detachedParts`. Live reattachment is deliberately rejected
because REDengine 2.31 has no validated safe inverse of `DetachPart`; respawn the vehicle instead.

Low-level aliases are `CreateVehicle`, `UpdateVehicleState`, `SetVehicleTransform`, `RemoveVehicle`,
`GetVehicle`, and `GetVehicles`. The namespaced API supplies validation and damage helpers and is
the recommended surface. See [vehicles](vehicles.md) for snapshots, streaming, authority and seats.

## NPCs and tasks

All methods require `world.npcs`.

### NPC lifecycle and state

| Function | Signature | Purpose |
|---|---|---|
| `Open77.npcs.create` | `(definition)` | Create an authoritative NPC and return its ID. |
| `Open77.npcs.update` | `(id, patch)` | Patch appearance, loadout, AI mode, damage policy, health, or ragdoll. |
| `Open77.npcs.setTransform` | `(id, transform)` | Set canonical position and yaw. |
| `Open77.npcs.setBucket` | `(id, bucket)` | Move NPC visibility scope. |
| `Open77.npcs.setAppearance` | `(id, appearance)` | Appearance convenience patch. |
| `Open77.npcs.setLoadout` | `(id, loadout)` | Loadout convenience patch. |
| `Open77.npcs.setHealth` | `(id, health, maxHealth?)` | Health convenience patch. |
| `Open77.npcs.setDamagePolicy` | `(id, policy)` | Set mortal/immortal/invulnerable policy. |
| `Open77.npcs.setAiMode` | `(id, mode)` | Set tasks/frozen/native mode. |
| `Open77.npcs.setRagdoll` | `(id, enabled)` | Set canonical ragdoll state. |
| `Open77.npcs.kill` / `revive` / `applyDamage` | `(id, ...)` | Authoritative life mutations. |
| `Open77.npcs.remove` | `(id)` | Remove the NPC. |
| `Open77.npcs.get` / `all` | `(id)` / `(bucket?)` | One snapshot or an array. |
| `Open77.npcs.templates` | `()` | Complete curated template catalogue. |

Definition fields include `template`, `position`, `yaw`, `bucket`, `appearance`, `loadout`,
`aiMode`, `damagePolicy`, `health`, `maxHealth`, `streamingRadius`, `streamingHysteresis`,
`despawnWhenUnobserved`, and `persistent`.

Constants are `Open77.npcs.flags`, `.ai`, `.damage`, and `.channels`.

### Task queue

| Function | Signature | Purpose |
|---|---|---|
| `Open77.npcs.tasks.enqueue` | `(id, type, parameters?, options?)` | Enqueue any supported task. |
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
| `Open77.elevators.adopt` | `(definition)` | Adopt a native lift and return an Open77 elevator ID. |
| `goTo` / `call` | `(id, floor, options?)` | Start authoritative travel; options include `travelMs` and `force`. |
| `teleport` | `(id, floor)` | Administrative recovery without travel. |
| `pause` / `resume` | `(id)` | Pause or continue authoritative movement. |
| `setFlags` | `(id, flags)` | Update power, lock, interaction, and door policy. |
| `remove` | `(id)` | Release the managed elevator. |
| `get` / `all` | `(id)` / `(bucket?)` | Read canonical snapshots. |

`adopt` accepts `engineEntity`, `position`, `bucket`, `initialFloor`, `flags`, and required
`floorCount`. Constants are in `Open77.elevators.flags`. Low-level aliases are `AdoptElevator`,
`GoToElevator`, `TeleportElevator`, `PauseElevator`, `ResumeElevator`, `SetElevatorFlags`,
`RemoveElevator`, `GetElevator`, and `GetElevators`. See [elevators](elevators.md).

## Database

Database access requires `database.access`. `Open77.database` and `MySQL` refer to the same
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

`Open77.log.debug`, `.info`, `.warn`, and `.error` currently forward their arguments to the
resource-prefixed server logger. Their common signature is `(...)`; no return value is produced.

## Permission summary

| Capability | Server namespaces |
|---|---|
| `network.events` | `Open77.net`, `RegisterNetEvent`, `TriggerClientEvent` |
| `world.loot` | `Open77.loot` |
| `world.vehicles` | `Open77.vehicles` |
| `world.npcs` | `Open77.npcs` |
| `world.elevators` | `Open77.elevators` |
| `players.life.read` | Player life reads |
| `players.life.kill` | `Open77.players.kill` |
| `players.life.revive` | `Open77.players.revive` |
| `players.life.respawn` | `Open77.players.respawn` |
| `players.life.resync` | `Open77.players.requestLifeResync` |
| `players.damage.read` | `Open77.players.getHealth` |
| `players.damage.apply` | Player health/damage mutations |
| `combat.config` | `Open77.combat` and damage arbiters |
| `database.access` | `Open77.database` / `MySQL` |

Request only the capabilities a resource actually uses. A manifest permission grants access to a
binding; it does not replace validation of player identity, distance, ownership, revision, bucket,
or gameplay state.

## Audit status

This page covers every public global installed by `LuaResourceRuntime.Sandbox`, including all 70
low-level bindings, and every namespaced helper and constant installed by the server bootstrap.
`wiki/tools/audit-api.py` compares public globals with this page and fails when a new binding is not
documented. The higher-level tables are kept beside their validation and permission rules above so
their authoritative semantics remain explicit instead of being confused with the client runtime.
