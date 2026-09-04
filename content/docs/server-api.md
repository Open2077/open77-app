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

## Resource-local file IO

`Open77.io` is server-only persistent text storage rooted at the calling resource's
`data/` directory. Paths are relative to that directory; absolute paths, `..` escapes and
reparse-point traversal are rejected. The Lua standard `io` library remains removed from the
sandbox. This API cannot read another resource, the server configuration, or rewrite its own
manifest and scripts.

| Function | Permission | Result / purpose |
|---|---|---|
| `Open77.io.read` | `filesystem.read` | `(path) -> contents` or `nil, reason`. |
| `Open77.io.readJson` | `filesystem.read` | `(path) -> value` or `nil, reason`; decodes with the bounded Open77 JSON codec. |
| `Open77.io.exists` | `filesystem.read` | `(path) -> boolean` or `nil, reason`. |
| `Open77.io.list` | `filesystem.read` | `(directory?) -> { { name, type, size? }, ... }` or `nil, reason`; non-recursive and sorted. |
| `Open77.io.stat` | `filesystem.read` | `(path) -> { name, type, size?, modifiedUtc }` or `nil, reason`. |
| `Open77.io.write` | `filesystem.write` | `(path, contents) -> boolean, reason?`; atomically replaces a UTF-8 text file. |
| `Open77.io.writeJson` | `filesystem.write` | `(path, value) -> boolean, reason?`; encodes then writes atomically. |
| `Open77.io.append` | `filesystem.write` | `(path, contents) -> boolean, reason?`. |
| `Open77.io.makeDirectory` | `filesystem.write` | `(path) -> boolean, reason?`; creates missing parents. |
| `Open77.io.remove` | `filesystem.write` | `(path) -> boolean, reason?`; removes one file, never a directory tree. |
| `Open77.io.move` | `filesystem.write` | `(source, destination, overwrite?) -> boolean, reason?`. |
| `Open77.io.copy` | `filesystem.read` + `filesystem.write` | `(source, destination, overwrite?) -> boolean, reason?`. |

Each file is limited to 4 MiB, a directory listing to 2,048 entries, and a relative path to
512 UTF-8 bytes. `readJson` / `writeJson` additionally inherit the JSON codec's 48 KiB and depth
limits. Stable refusals include `permission_denied:filesystem.read`,
`permission_denied:filesystem.write`, `invalid_path`, `path_outside_resource`,
`reparse_point_denied`, `not_found`, `not_a_file`, `not_a_directory`, `already_exists`,
`file_too_large`, `too_many_entries`, and `io_error`.

```lua
local course = assert(Open77.io.readJson("courses/watson-loop.json"))
course.revision = (course.revision or 0) + 1
assert(Open77.io.writeJson("courses/watson-loop.json", course))
```

## Join-time readiness gate

The barrier that stops one resource acting on a player another resource is not finished with.
Server resources cannot call each other, so the host owns this; it is the only place the two
sides can meet. Full rationale and worked example in
[docs/lua-resources.md](../docs/lua-resources.md#the-join-time-readiness-gate).

**The rule: do not teleport, spawn, kill or force a respawn on a player until their gate has
opened.** Reading state, rosters and HUD payloads are unaffected.

| Function | Signature | Result / purpose |
|---|---|---|
| `Open77.ready.isReady` | `(playerId)` | Whether anything is still holding this player. A player the host does not know is ready. |
| `Open77.ready.participate` | `({ timeoutMs?, reason? })` | Declare once, at load: every player who connects from now on arrives with one hold in this resource's name. |
| `Open77.ready.hold` | `(playerId, reason?)` | Take or refresh this resource's hold. Returns the player's `session`, or `nil, reason`. |
| `Open77.ready.release` | `(playerId, session?, note?)` | Clear this resource's hold. A `session` that no longer matches is dropped. |
| `Open77.ready.status` | `(playerId)` | `{ known, ready, session, ageMs, holds = { { resource, reason, ageMs, remainingMs } } }`. |

`onPlayerReady(playerId, detail)` is emitted into **every** running resource when the last hold
clears. `playerId` arrives as a string like every host event. `detail` is `cleared`, `no_holds`,
`resource_reloaded`, `resource_stopped`, or `timeout:<resource>`.

It is a barrier lifting, not a trigger: it says nothing about whether the player's world is up, so
keep your own readiness signal and ask the gate for permission. Every hold carries a deadline, so a
resource that never releases costs one degraded join and one `WRN` naming it, never a stuck server.
`ready` at the console lists who is holding whom. No permission is required.

## Operator-tunable settings

Settings a server owner may retune from the Warden admin panel while the server runs, without a
restart. The resource declares what is tunable; the panel can only move values inside that
declaration, and never edits Lua. Server-side only.

| Function | Signature | Result / purpose |
|---|---|---|
| `Open77.tunables.declare` | `(table)` | Declare this resource's tunables and return a live proxy. Raises if the declaration is malformed. |
| `Open77.tunables.get` | `(key)` | The current value, or `nil, reason` for an undeclared key. |
| `Open77.tunables.set` | `(key, value)` | Write one. Returns `ok, message, pending`. Same validation and persistence as a panel write. |
| `Open77.tunables.capture` | `()` | A frozen plain table of every current value, to pin onto one match. |
| `Open77.tunables.pending` | `()` | Key → value for changes waiting on a boundary. |
| `Open77.tunables.promote` | `()` | Adopt everything waiting; returns the list of keys that moved. |

Declaration fields: `value` (required default), `type` (`number`, `integer`, `boolean`, `string`,
`enum`), `min`, `max`, `step`, `choices`, `unit`, `apply` (`live`, `next_round`, `next_match`),
`label`, `description`, `group`, `order`. `min`/`max`/`type`/`choices` are enforced on every write;
`step` and `unit` are presentation only. Limits: 128 tunables per resource, 64 KiB of declaration,
32 choices, 256-character strings.

**The proxy returned by `declare` reads through to the host on every access.** Read it at the point
of use; a value hoisted into a file-scope local is captured at load time and never updates, while
the panel goes on reporting the new number. An undeclared key raises rather than returning `nil`.

Values are owned by the host, so they survive a reload **and** a stop, and come back after a
restart from `tunables.json` next to `server.jsonc`. A key declared `next_round` or `next_match` is
stored and persisted immediately but does not reach `Open77.tunables.get` until the resource calls
`promote()`; for a mode running several rounds at once, `capture()` per match is the only correct
form. The owning resource — and no other — receives `onTunableChanged(key, value, pending)` after
every accepted write.

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

## Perspective policy

Whether players on this server may use third person. The calling server resource must declare
`network.events`; the policy is broadcast to every client and answered again to anyone who joins
later.

| Function | Signature | Result |
|---|---|---|
| `Open77.perspective.setPolicy` | `(policy, perspective?)` | `true`, or `false, reason`. |
| `Open77.perspective.policy` | `()` | `policy, perspective, declared` — what **this** resource set. |

`policy` is `disabled`, `allowed`, `default` or `forced`; `perspective` is `fpp` or `tps` and is
required for `forced`, because a pin with nothing pinned would quietly become first person.

The client arbiter ranks a server policy above the player's own preference and every world state
above both. A `forced` policy does not erase what the player asked for: lifting the pin returns
them to it.

Call `setPolicy` from the resource's **start path** — a reload replaces the VM, and the policy
lives in it. A server on which no resource ever calls this sends nothing and every client keeps the
platform default `allowed`. If two resources declare a policy, both answer a joining client and the
last write wins; one owner, normally the gamemode, is the remedy.

See [perspective](../docs/perspective.md) for the priority table, the player-facing key and
preference, and the measured limitations.

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

## Player weapons

These asynchronous methods target the official `open77_weapons` client relay.
The calling resource declares `network.events` and depends on
`open77_weapons >=0.1.0`.

| Function | Signature | Result |
|---|---|---|
| `Open77.weapons.assign` | `(playerId, record, slot, options?)` | Request ID, or `nil, reason`. |
| `Open77.weapons.setActive` / `activate` | `(playerId, slot)` or `(playerId, record, options?)` | Request ID, or `nil, reason`. |
| `Open77.weapons.remove` / `unequip` | `(playerId, slot)` | Request ID, or `nil, reason`. |
| `Open77.weapons.holster` | `(playerId)` | Request ID, or `nil, reason`. |
| `Open77.weapons.requestSnapshot` | `(playerId)` | Request ID, or `nil, reason`. |

Listen for `open77:weapons:completed` with
`playerId, requestId, operation, accepted, reason, result`. Replies are matched
to the authenticated target and calling resource; unanswered requests complete
with `request_timeout` after 10 seconds. See
[Weapon Lua API](weapons-api.md) for options, result schemas, permissions,
errors, and inventory-authority rules.

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
| `Open77.players.setGhosted` / `SetPlayerGhosted` | `players.life.ghost` | `(playerId, ghosted, options?)` | Toggle the server-owned non-solid spawn state and its optional automatic clear policy. |
| `Open77.players.isGhosted` / `IsPlayerGhosted` | `players.life.read` | `(playerId)` | Whether the canonical life state is currently ghosted. |
| `Open77.players.getHealth` | `players.damage.read` | `(playerId)` | Health/armor/god-mode snapshot or `nil`. |
| `Open77.players.damage` | `players.damage.apply` | `(playerId, amount, options?)` | Apply authoritative damage. |
| `Open77.players.heal` | `players.damage.apply` | `(playerId, amount)` | Apply authoritative healing. |
| `Open77.players.setHealth` | `players.damage.apply` | `(playerId, health)` | Set health; zero passes through life authority. |
| `Open77.players.setMaxHealth` | `players.damage.apply` | `(playerId, maxHealth)` | Update the canonical maximum. |
| `Open77.players.setArmor` | `players.damage.apply` | `(playerId, armor)` | Update canonical armor. |
| `Open77.players.setGodMode` | `players.damage.apply` | `(playerId, enabled)` | Toggle canonical damage immunity. |
| `Open77.players.setRegen` | `players.damage.apply` | `(playerId, pointsPerSecond)` | Set authoritative regeneration. |

### Unified health and stamina API

New resources should use `players.stats.read` and `players.stats.apply`. The
legacy `players.damage.*` permissions and `Open77.players` health methods remain
accepted aliases. The client exposes the same read names and the same
nested pool shape, but no setters. See [Player health and stamina](player-stats.md)
for the full synchronization model.

| Function | Permission | Signature | Result / purpose |
|---|---|---|---|
| `Open77.stats.get` / `GetPlayerStats` | `players.stats.read` | `(playerId)` | Combined canonical health/stamina snapshot or `nil`. |
| `Open77.stats.getHealth` / `health` | `players.stats.read` | `(playerId)` | Health pool `{ value, current, maximum, max, fraction, percentage, regenEnabled, regenPerSecond, regenerating }`. |
| `Open77.stats.getStamina` / `stamina` | `players.stats.read` | `(playerId)` | Stamina pool with the same shape. |
| `Open77.stats.set` | `players.stats.apply` | `(playerId, pool, value)` | Set `health` or `stamina` in points. |
| `Open77.stats.setMax` | `players.stats.apply` | `(playerId, pool, maximum)` | Set a canonical maximum and clamp the current value. |
| `Open77.stats.restore` | `players.stats.apply` | `(playerId, pool)` | Fill the selected pool. |
| `Open77.stats.setRegenEnabled` | `players.stats.apply` | `(playerId, pool, enabled)` | Toggle authoritative regeneration. |
| `Open77.stats.setRegenRate` | `players.stats.apply` | `(playerId, pool, pointsPerSecond)` | Set the rate; zero disables regeneration. |
| `Open77.stats.setHealth` / `SetPlayerHealth` | `players.stats.apply` | `(playerId, value)` | Explicit health setter; zero routes through life authority. |
| `Open77.stats.setHealthMax` / `SetPlayerMaxHealth` | `players.stats.apply` | `(playerId, maximum)` | Explicit health maximum setter. |
| `Open77.stats.restoreHealth` / `RestorePlayerHealth` | `players.stats.apply` | `(playerId)` | Fill health. |
| `Open77.stats.setHealthRegenEnabled` / `SetPlayerRegenEnabled` | `players.stats.apply` | `(playerId, enabled)` | Toggle health regeneration. |
| `Open77.stats.setHealthRegenRate` / `SetPlayerRegen` | `players.stats.apply` | `(playerId, rate)` | Set health regeneration rate. |
| `Open77.stats.setStamina` / `SetPlayerStamina` | `players.stats.apply` | `(playerId, value)` | Explicit stamina setter. |
| `Open77.stats.setStaminaMax` / `SetPlayerMaxStamina` | `players.stats.apply` | `(playerId, maximum)` | Explicit stamina maximum setter. |
| `Open77.stats.restoreStamina` / `RestorePlayerStamina` | `players.stats.apply` | `(playerId)` | Fill stamina. |
| `Open77.stats.setStaminaRegenEnabled` / `SetPlayerStaminaRegenEnabled` | `players.stats.apply` | `(playerId, enabled)` | Toggle stamina regeneration. |
| `Open77.stats.setStaminaRegenRate` / `SetPlayerStaminaRegen` | `players.stats.apply` | `(playerId, rate)` | Set stamina regeneration rate. |

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

## Voice topology and policy

All methods require `voice.manage`. The dedicated server owns reachability: a client's requested
scope never bypasses routing buckets, proximity, membership, mute/deaf, rate, or quality checks.

| Method | Purpose |
|---|---|
| `Open77.voice.status` | Global quality/profile, default proximity, and relay/rejection counters. |
| `channels` / `getChannel` | List/read canonical radio, phone, party, admin, and spatial channels. |
| `participants` / `getParticipant` | Read proximity, server mute/deaf, and channel memberships. |
| `createChannel` / `updateChannel` / `removeChannel` | Resource-owned topology and effect control. |
| `addPlayer` / `removePlayer` | Change channel membership. |
| `setChannelPlayerMuted` | Mute one player in one channel. |
| `setChannelPlayerPermissions` | Set independent speak/listen permission. |
| `setPlayerMuted` / `setPlayerDeaf` | Server-wide send/receive policy. |
| `setProximity` | Enable/disable and tune one player's server-side reach. |
| `setDefaultProximityDistance` | Change the default, optionally for existing participants. |
| `setQuality` / `setEnabled` | Set global codec policy or disable voice. |

Channel effects include `gain`, `lowPassHz`, `highPassHz`, `distortion`, `radioNoise`,
`spatialBlend`, and the reverb controls `reverbWet`, `reverbRoomSize`, `reverbDecay`,
`reverbDamping`, and `reverbPreDelayMs`. Non-persistent channels are released automatically with
their owning resource.
See [Integrated voice chat](voice.md) for complete signatures, examples, client APIs, settings, and
the security/bandwidth model.

## World props

Every method requires `world.props`. Props are authoritative, owned by their creating resource,
and streamed per player rather than broadcast to a bucket. IDs are decimal strings; do not pass
them through `tonumber`.

| Function | Signature | Result |
|---|---|---|
| `Open77.props.create` | `(definition)` | Open77 prop ID, or `nil, reason`. |
| `Open77.props.update` | `(id, patch)` | `boolean, reason?` |
| `Open77.props.setTransform` | `(id, { position?, yaw?, scale? })` | `boolean, reason?` |
| `Open77.props.setBucket` | `(id, bucket)` | `boolean, reason?` |
| `Open77.props.remove` | `(id)` | `boolean, reason?` |
| `Open77.props.get` | `(id)` | Prop snapshot, or `nil`. |
| `Open77.props.all` | `(bucket?)` | Array of prop snapshots, optionally filtered to one bucket. |
| `Open77.props.catalog` | `()` | Curated model aliases and the models they resolve to. |
| `Open77.props.clear` | `()` | Remove every prop this resource owns; returns how many. |

Definitions accept `model`, `position`, `yaw`, `scale`, `appearance`, `bucket`, `physics`
(`static`, `kinematic`, `dynamic`, `none`), `collision`, `visible`, `kind` (`prop`, `light`,
`effect`), `light`, `streamingRadius` (10–2000), `streamingHysteresis` (0 to the radius), and
`ttlMs` (0 for no expiry, seven days maximum). `update` is sparse and does not accept `model` or
`kind`; changing either is a remove and a create. The registry holds 8,192 props, of which one
resource may own 2,048. A resource may read every prop but may only mutate or remove its own.

Failures are `permission_denied:world.props`, `quota_exceeded`, `not_found`,
`owned_by_another_resource`, `invalid_position`, `invalid_model`, `unknown_alias`,
`record_provisioning_failed`, `entity_spawn_failed`, and `world_unavailable`.

Low-level aliases are `CreateProp`, `UpdateProp`, `SetPropTransform`, `SetPropBucket`,
`RemoveProp`, `GetProp`, `GetProps`, and `ClearProps`. The namespaced API supplies validation and structured
option tables and is the recommended surface. See [props](props.md) for the model catalogue,
streaming rules, lights, the client projection API, and the current limitations.

## World effects

Every method requires `world.effects`. A one-shot is broadcast to the players in range and never
stored; a looping effect is a registry entry with the same identity, ownership, revisioning and
streaming semantics as a prop, in a registry of its own.

| Function | Signature | Result |
|---|---|---|
| `Open77.effects.play` | `(name, opts)` | `boolean, reason?` — one-shot, no handle. |
| `Open77.effects.create` | `(definition)` | Open77 effect ID, or `nil, reason`. |
| `Open77.effects.update` | `(id, patch)` | `boolean, reason?` |
| `Open77.effects.remove` | `(id)` | `boolean, reason?` |
| `Open77.effects.all` | `(bucket?)` | Array of looping-effect snapshots, optionally filtered to one bucket. |
| `Open77.effects.catalog` | `()` | Curated effect aliases. |
| `Open77.effects.playOn` | `(entityOrPlayerId, name, opts)` | `boolean, reason?` — entity-authored VFX. |
| `Open77.effects.sound` | `(entityOrPlayerId, event, opts)` | `boolean, reason?` — entity-bound Wwise event. |

`play` options are `position`, `orientation`, `bucket`, `range` (1–500, default 150), and
`sound`. `create` definitions accept `effect`, `position`, `orientation`, `bucket`, `visible`,
`streamingRadius` (10–2000, default 90), `streamingHysteresis` (default 20), and `ttlMs`. The
effect name is not patchable. The registry holds 2,048 looping effects, of which one resource may
own 512.

Low-level aliases are `PlayEffect`, `CreateEffect`, `UpdateEffect`, `RemoveEffect`,
`GetEffect`, `GetEffects`, `PlayEntityEffect`, and `PlayEntitySound`. The namespaced API
supplies validation and structured option tables and is the recommended surface.

Failures use the same vocabulary as props with `permission_denied:world.effects` in place of the
props permission.

There are no low-level aliases for `Open77.effects`; the namespaced table is the whole surface.
The client-local `Open77.vfx` and `Open77.sfx` tables are a **different API in a different
runtime** and are not replicated — see [effects](effects.md) for the distinction, which is the
easiest thing to get wrong here.

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
| `world.props` | `Open77.props` |
| `world.effects` | `Open77.effects` |
| `players.life.read` | Player life reads |
| `players.life.kill` | `Open77.players.kill` |
| `players.life.revive` | `Open77.players.revive` |
| `players.life.respawn` | `Open77.players.respawn` |
| `players.life.resync` | `Open77.players.requestLifeResync` |
| `players.damage.read` | `Open77.players.getHealth` |
| `players.damage.apply` | Player health/damage mutations |
| `players.stats.read` | Shared `Open77.stats` reads for health and stamina |
| `players.stats.apply` | Server-only health/stamina values, maximums and regeneration |
| `combat.config` | `Open77.combat` and damage arbiters |
| `voice.manage` | `Open77.voice` authoritative topology and policy |
| `filesystem.read` | `Open77.io.read`, `readJson`, `exists`, `list`, `stat`, and the source side of `copy` |
| `filesystem.write` | `Open77.io.write`, `writeJson`, `append`, `makeDirectory`, `remove`, `move`, and the destination side of `copy` |
| `database.access` | `Open77.database` / `MySQL` |

Request only the capabilities a resource actually uses. A manifest permission grants access to a
binding; it does not replace validation of player identity, distance, ownership, revision, bucket,
or gameplay state.

## Audit status

This page covers every public global installed by `LuaResourceRuntime.Sandbox`, including all 97
low-level bindings, and every namespaced helper and constant installed by the server bootstrap.
`wiki/tools/audit-api.py` compares public globals with this page and fails when a new binding is not
documented. The higher-level tables are kept beside their validation and permission rules above so
their authoritative semantics remain explicit instead of being confused with the client runtime.

**Two sections run ahead of the audit.** [World props](#world-props) and
[World effects](#world-effects) document a surface that is specified and being built: the
authoritative registries exist (`PropAuthorityService`, `EffectAuthorityService`) and the bounds
quoted are read from them, but the `Open77.props` and `Open77.effects` Lua bindings are not yet
installed by `LuaResourceRuntime`, and no part of either has been proven in a running session.
The audit only fails on a global that exists and is undocumented, so documenting them early
costs nothing — but the seven prop aliases (`CreateProp`, `UpdateProp`, `SetPropTransform`,
`SetPropBucket`, `RemoveProp`, `GetProp`, `GetProps`) will raise the low-level binding count
above 70 when they land, and the two guides carry the same caveat where it matters.
