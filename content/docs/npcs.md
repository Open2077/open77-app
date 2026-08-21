# Server-owned NPCs

CyberM NPCs are canonical server entities projected into REDengine only for nearby players. A Lua
resource creates and owns the canonical NPC; the server controls identity, routing bucket, health,
tasks and simulation authority. Clients cannot create or mutate canonical NPCs.

The reference implementation is [`resources/cyberm_npcs`](../resources/cyberm_npcs/README.md).

## Manifest permissions

Server mutation requires `world.npcs`. Client inspection requires `npcs.read`.

```lua
permissions { "world.npcs", "npcs.read" }
```

## Architecture

- NPC IDs are opaque, generation-aware 64-bit server IDs.
- The server streams NPCs only to players in the same routing bucket and inside the configured
  radius. Hysteresis prevents rapid stream-in/stream-out near the boundary.
- One ready client receives a short simulation lease and executes native REDengine commands. The
  lease carries an epoch; reports from an old owner or epoch are rejected.
- Other clients interpolate authoritative motion and never run a competing task.
- Late joiners receive the complete NPC state and active tasks.
- Movement, look, action and full-body channels execute independently. Starting a look-at does not
  cancel movement, and starting movement does not stop an active full-body animation.
- A resource may inspect and mutate only NPCs it owns.
- Stopping a resource removes its non-persistent NPCs. Persistent NPCs must be removed explicitly
  or restored/managed by server code after a resource restart.

## Templates

Raw `Character.*` records are deliberately not accepted. Use a reviewed alias from
`CyberM.npcs.templates()`:

```lua
for _, template in ipairs(CyberM.npcs.templates()) do
    print(template.name, template.record)
end
```

| Alias | Intended use |
|---|---|
| `civilian_female_relaxed_01` | Relaxed civilian projection and scripted locomotion. |
| `hostile_female_ranged_lab` | Ranged laboratory template; native combat remains experimental. |

An alias contains its server-approved record, observer record and capability list. An advertised
capability describes the underlying rig/template; it does not make an unstable task public.

### Complete 2.31 research catalogue

The reviewed runtime allowlist above is intentionally small, but the vanilla research catalogue is
now exhaustive for Cyberpunk 2077 2.31 + Phantom Liberty:

- [6,668 `Character.*` records](../docs/generated/npc-records-2.31.csv), including template,
  gameplay metadata, crowd appearances and structural risk classification;
- [1,524 unique `.ent` templates](../docs/generated/npc-templates-2.31.md), all verified present and
  readable in the installed base-game/EP1 archives;
- [all `.ent` appearance bindings](../docs/generated/npc-entity-appearances-2.31.csv);
- [all definitions from the referenced `.app` resources](../docs/generated/npc-appearance-resources-2.31.csv);
- [detailed machine-readable `.ent`/`.app` graph](../docs/generated/npc-entity-appearances-2.31.json).

The `category` and `risk` columns are research filters, not permission to spawn a raw record. In
particular, `candidate` means only that no obvious quest/player/vendor/special-rig blocker was found
in the extracted fields. A record becomes available to Lua only after it has been tested and added
to the server-owned alias registry.

See the [methodology, source hashes, limitations and validation backlog](../docs/research/npc-templates-and-appearances-catalog.md).

## Create and inspect

```lua
local npcId, reason = CyberM.npcs.create({
    template = "civilian_female_relaxed_01",
    position = { x = -1378.0, y = 1262.0, z = 123.0 },
    yaw = 90.0,
    bucket = 0,
    appearance = nil,
    loadout = {},
    aiMode = CyberM.npcs.ai.tasks,
    damagePolicy = CyberM.npcs.damage.immortal,
    health = 100,
    maxHealth = 100,
    streamingRadius = 180,
    streamingHysteresis = 40,
    despawnWhenUnobserved = false,
    persistent = false,
})

if not npcId then error(reason) end

local npc = CyberM.npcs.get(npcId)
local owned = CyberM.npcs.all()       -- this resource only
local inBucket = CyberM.npcs.all(12)  -- optional bucket filter
```

`get` returns the template, appearance, loadout JSON, position, bucket, streaming values, health,
flags, AI/damage modes, revisions, active task and current authority lease.

Limits are enforced server-side: 4096 NPCs globally, 512 per resource and 64 tasks per NPC.

### Server API reference

All functions in this table require `world.npcs`. IDs are opaque 64-bit Lua integers. Mutation
functions return `true` only when the NPC exists and belongs to the calling resource. Invalid
definitions, task parameters, IDs or enum values raise a Lua error; callers should treat these as
resource bugs rather than normal gameplay failures.

| Function | Parameters | Return |
|---|---|---|
| `CyberM.npcs.create` | `definition` | `npcId`, or `nil, reason` when the subsystem/permission is unavailable |
| `CyberM.npcs.get` | `npcId` | owned NPC snapshot or `nil` |
| `CyberM.npcs.all` | optional `bucket` | array of owned NPC snapshots |
| `CyberM.npcs.templates` | none | array of approved template snapshots |
| `CyberM.npcs.update` | `npcId, fields` | boolean |
| `CyberM.npcs.setTransform` | `npcId, transform` | boolean |
| `CyberM.npcs.setBucket` | `npcId, bucket` | boolean |
| `CyberM.npcs.setAppearance` | `npcId, appearance` | boolean |
| `CyberM.npcs.setLoadout` | `npcId, loadout` | boolean |
| `CyberM.npcs.setHealth` | `npcId, health, optional maxHealth` | boolean |
| `CyberM.npcs.setDamagePolicy` | `npcId, policy` | boolean |
| `CyberM.npcs.setAiMode` | `npcId, mode` | boolean |
| `CyberM.npcs.setRagdoll` | `npcId, enabled` | boolean |
| `CyberM.npcs.applyDamage` | `npcId, amount, optional source, optional cause` | boolean |
| `CyberM.npcs.kill` | `npcId, optional reason` | boolean |
| `CyberM.npcs.revive` | `npcId, optional health` | boolean |
| `CyberM.npcs.remove` | `npcId` | boolean |

An NPC snapshot contains:

| Field | Type | Meaning |
|---|---|---|
| `id`, `revision`, `taskRevision` | integer | Canonical identity and monotonic revisions. |
| `resource` | string | Owning resource. |
| `template`, `record`, `observerRecord` | string | Approved alias and resolved REDengine records. |
| `appearance`, `loadout` | string | Appearance name and canonical loadout JSON. |
| `x`, `y`, `z`, `yaw` | number | Canonical transform. |
| `bucket` | integer | Routing bucket. |
| `streamingRadius`, `streamingHysteresis` | number | Interest thresholds in metres. |
| `health`, `maxHealth` | number | Canonical health. |
| `flags`, `aiMode`, `damagePolicy` | integer | Values from the constant tables below. |
| `currentTaskId` | integer | Preferred active task for compact replication, or `0`. |
| `authorityPlayerId`, `authorityEpoch` | integer | Current simulation lease owner and epoch, or `0`. |

A template snapshot contains `name`, `record`, `observerRecord`, `defaultAppearance` and a
`capabilities` array.

## State mutation

```lua
CyberM.npcs.setTransform(npcId, { position = { x = 1, y = 2, z = 3 }, yaw = 180 })
CyberM.npcs.setBucket(npcId, 7)
CyberM.npcs.setAppearance(npcId, "appearance_name")
CyberM.npcs.setLoadout(npcId, { weapon = "Items.Preset_Lexington_Default" })
CyberM.npcs.setHealth(npcId, 80, 100)
CyberM.npcs.setDamagePolicy(npcId, CyberM.npcs.damage.mortal)
CyberM.npcs.setAiMode(npcId, CyberM.npcs.ai.tasks)
CyberM.npcs.setRagdoll(npcId, true)
CyberM.npcs.remove(npcId)
```

`CyberM.npcs.update(id, fields)` can atomically change appearance, loadout, AI mode, damage policy,
health, maximum health and ragdoll. The named setters above are convenience wrappers.

Moving an NPC between buckets or teleporting it revokes the current simulation lease before the
new state is broadcast.

### Constants

```lua
CyberM.npcs.flags.alive
CyberM.npcs.flags.ragdoll
CyberM.npcs.flags.despawnWhenUnobserved
CyberM.npcs.flags.persistent
CyberM.npcs.ai.tasks
CyberM.npcs.ai.frozen
CyberM.npcs.ai.native
CyberM.npcs.damage.mortal
CyberM.npcs.damage.immortal
CyberM.npcs.damage.invulnerable
```

`tasks` is the stable default. `frozen` immediately revokes the simulation lease and suspends every
task channel; returning to `tasks` resumes them with fresh timeout/duration accounting. A dead NPC
cannot receive a lease, motion report or new task until it is revived. `native` is reserved for
templates whose autonomous REDengine behaviour has been explicitly validated.

## Tasks

Tasks are server queues partitioned into movement, look, action and full-body channels. Priority is
evaluated within a channel. One task may execute in each channel at the same time. A timeout of `0`
means no timeout. Task/channel combinations are validated server-side; for example `moveTo` is
movement-only, `lookAt` is look-only and `playAnimation` is full-body-only. `wait` may be assigned
to any channel and blocks only that channel.

| Helper | Channel | Behaviour |
|---|---:|---|
| `moveTo` | movement | Native navigation to one position. |
| `follow` | movement | Re-paths toward a player, NPC or fixed position. |
| `patrol` | movement | Sequences arbitrary positions, waits and optional loops. |
| `wander` | movement | Deterministic roaming around a centre. |
| `face` | look | Rotates the body toward a point. |
| `lookAt` | look | Continuously aims the look-at target at a player, NPC or point. |
| `wait` | action by default | Server-timed delay. |
| `hold` | movement | Holds the current position. |
| `playAnimation` | full body | Plays a reviewed named workspot animation. |

### Move, follow and patrol

```lua
local move = CyberM.npcs.tasks.moveTo(npcId, { x = 10, y = 20, z = 30 }, {
    speed = "walk", acceptanceRadius = 1.0, timeoutMs = 30000,
})

local follow = CyberM.npcs.tasks.follow(npcId, { type = "player", id = playerId }, {
    speed = "run", distance = 2.0, onTargetLost = "wait",
})
local followNpc = CyberM.npcs.tasks.follow(npcId, { type = "npc", id = otherNpcId })

local patrol = CyberM.npcs.tasks.patrol(npcId, {
    { x = 10, y = 20, z = 30, waitMs = 500 },
    { x = 16, y = 20, z = 30, waitMs = 1000 },
}, { speed = "walk", loop = true, backAndForth = false })

local wander = CyberM.npcs.tasks.wander(npcId, {
    x = 10, y = 20, z = 30, radius = 15, speed = "walk", seed = 42,
})
```

`walk`, `run` and `sprint` are supported movement speeds. Patrol accepts 1 to 64 points. The
current `onTargetLost` policy waits for the target to become available again.

### Look, hold and animation

```lua
CyberM.npcs.tasks.face(npcId, { x = 1, y = 2, z = 3 }, {
    tolerance = 3, speed = 180, timeoutMs = 5000,
})
CyberM.npcs.tasks.lookAt(npcId, { type = "player", id = playerId })
CyberM.npcs.tasks.wait(npcId, 1500)
CyberM.npcs.tasks.hold(npcId, { durationMs = 5000 })
CyberM.npcs.tasks.playAnimation(npcId, "emote_smoke", { loop = false })
```

Named full-body animations remain active until they are cancelled, preempted, timed out or the NPC
streams out. REDengine does not expose a reliable completion signal for every workspot clip, so use
`timeoutMs` or explicit cancellation when the animation must end deterministically.

### Generic queue and cancellation

```lua
local taskId = CyberM.npcs.tasks.enqueue(npcId, "moveTo", {
    x = 1, y = 2, z = 3, speed = "walk",
}, { channel = CyberM.npcs.channels.movement, priority = 10, timeoutMs = 30000 })

local task = CyberM.npcs.tasks.get(npcId, taskId)
local tasks = CyberM.npcs.tasks.all(npcId)
CyberM.npcs.tasks.cancel(npcId, taskId, "script_cancel")
CyberM.npcs.tasks.clear(npcId, CyberM.npcs.channels.movement, "new_route")
```

Only the task names listed above are accepted. Unsupported types and malformed targets, paths,
durations or animation names are rejected before replication.

### Task API reference

| Function | Parameters | Return |
|---|---|---|
| `CyberM.npcs.tasks.enqueue` | `npcId, type, parameters, optional options` | task ID |
| `CyberM.npcs.tasks.moveTo` | `npcId, position, optional options` | task ID |
| `CyberM.npcs.tasks.follow` | `npcId, target, optional options` | task ID |
| `CyberM.npcs.tasks.patrol` | `npcId, points, optional options` | task ID |
| `CyberM.npcs.tasks.wander` | `npcId, optional options` | task ID |
| `CyberM.npcs.tasks.face` | `npcId, target, optional options` | task ID |
| `CyberM.npcs.tasks.lookAt` | `npcId, target, optional options` | task ID |
| `CyberM.npcs.tasks.wait` | `npcId, durationMs, optional options` | task ID |
| `CyberM.npcs.tasks.hold` | `npcId, optional options` | task ID |
| `CyberM.npcs.tasks.playAnimation` | `npcId, animation, optional options` | task ID |
| `CyberM.npcs.tasks.get` | `npcId, taskId` | task snapshot or `nil` |
| `CyberM.npcs.tasks.all` | `npcId` | array of task snapshots |
| `CyberM.npcs.tasks.cancel` | `npcId, taskId, optional reason` | boolean |
| `CyberM.npcs.tasks.clear` | `npcId, optional channel, optional reason` | number cancelled |

Common options are `priority` (signed integer) and `timeoutMs` (`0` disables the timeout). Generic
`enqueue` also accepts `channel`. A task snapshot contains `npcId`, `id`, `resource`, `type`, the
JSON string `parameters`, `channel`, `priority`, `timeoutMs`, `status`, `revision` and `reason`.
Statuses are `queued`, `suspended`, `executing`, `success`, `failure`, `cancelled` and
`interrupted`.

## Health, damage and death

```lua
CyberM.npcs.applyDamage(npcId, 25, "resource:arena", "firearm")
CyberM.npcs.kill(npcId, "admin")
CyberM.npcs.revive(npcId, 100)
```

- `mortal` allows health to reach zero.
- `immortal` applies damage but clamps health to 1.
- `invulnerable` rejects damage.

Health and death are canonical server state. Client hit detection should request a bounded server
action; it must not directly mutate a projection.

## Events

Server resource events:

```lua
AddEventHandler("onNpcCreated", function(npcId, resource, template) end)
AddEventHandler("onNpcUpdated", function(npcId, revision) end)
AddEventHandler("onNpcRemoved", function(npcId, reason, resource) end)
AddEventHandler("onNpcTaskState", function(npcId, taskId, status, reason) end)
AddEventHandler("onNpcAuthorityChanged", function(npcId, playerId, epoch, reason) end)
AddEventHandler("onNpcDamaged", function(npcId, source, amount, health, cause) end)
AddEventHandler("onNpcDied", function(npcId, source, cause) end)
```

Client resource events:

```lua
AddEventHandler("onNpcStreamIn", function(npcId, revision) end)
AddEventHandler("onNpcReady", function(npcId, entity) end)
AddEventHandler("onNpcChanged", function(npcId, revision) end)
AddEventHandler("onNpcTaskChanged", function(npcId, taskId) end)
AddEventHandler("onNpcAuthorityChanged", function(npcId, playerId) end)
AddEventHandler("onNpcStreamOut", function(npcId, reason) end)
```

## Client read-only API

```lua
local npc = CyberM.npcs.get(npcId)
local visible = CyberM.npcs.all()
local ready = CyberM.npcs.isStreamedIn(npcId)
local entity = CyberM.npcs.entity(npcId)       -- local CyberM entity handle or nil
local taskId = CyberM.npcs.currentTask(npcId) -- canonical current task ID or nil
```

Snapshots expose `streamed` and `locallyAuthoritative`. The local entity handle is ephemeral: do
not cache it across stream-out, reconnect or resource reload.

Client snapshots contain `id`, `revision`, `entity`, `template`, `appearance`, `flags`, `bucket`,
`aiMode`, `damagePolicy`, `health`, `maxHealth`, `currentTaskId`, `taskRevision`,
`authorityPlayerId`, `authorityEpoch`, `streamed` and `locallyAuthoritative`. Without `npcs.read`,
`all()` returns an empty array, `get()`/`entity()`/`currentTask()` return `nil`, and
`isStreamedIn()` returns `false`.

## Current limitations

- Server persistence storage is resource-defined; `persistent=true` only changes cleanup policy.
- Arbitrary records, raw REDengine handles and client-side canonical mutation are intentionally
  unsupported.
- Native attack/shoot/melee/combat tasks are not in the stable API yet. Use server-authoritative
  scripted damage until animation, targeting and hit validation are proven safe for each rig.
- Native authored patrol paths (`NodeRef`) are not exposed; CyberM patrols sequence `moveTo` tasks.
- A client authority lease is required for native navigation. With no ready client, tasks suspend
  and resume when authority becomes available.
