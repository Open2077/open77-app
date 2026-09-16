# Server-owned NPCs

Open77 NPCs are canonical server entities projected into REDengine only for nearby players. A Lua
resource creates and owns the canonical NPC; the server controls identity, routing bucket, health,
tasks and simulation authority. Clients cannot create or mutate canonical NPCs.

The reference implementation is [`resources/system/open77_npcs`](../resources/system/open77_npcs/README.md).

**Developer preview:** spawn directly from `Character.*` record IDs, without registering a
virtual template. Browse the [NPC record catalogue](npc-catalogue.md) for IDs, appearances
and compatibility warnings. See [AI, combat and voice control](npc-behavior.md) to make a
hostile NPC passive, disable its perception or silence combat/search voice lines.

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

## Character records and legacy aliases

Spawn directly with `Open77.npcs.create({ record = "Character.Judy", position = ... })`.
No catalogue registration is required. Vanilla, DLC and custom `Character.*` records use the
same authoritative lifecycle and replication path. Their record and required assets must exist
on every observing client; the headless server cannot inspect a player's TweakDB.

Use exact, case-sensitive textual IDs (not hashes or `.ent` paths): `Character.` followed by
ASCII letters, digits, `_`, `-` or `.`, at most 255 bytes in total. `record` takes precedence over
`template`; an invalid explicit record is rejected, never replaced with a default NPC.
For compatibility, `template = "Character.Judy"` and the first argument of the low-level
`CreateNpc` (with its existing positional arguments) also accept records. Existing aliases and
the old default when **both fields are absent** remain available.
`Open77.npcs.templates()` lists these optional legacy aliases, not all spawnable characters:

```lua
for _, template in ipairs(Open77.npcs.templates()) do
    print(template.name, template.record)
end
```

| Alias | Faction | Intended use |
|---|---|---|
| `civilian_female_relaxed_01` | Aldecaldos | Relaxed civilian projection and scripted locomotion. **Not shootable** — see the warning below. |
| `hostile_female_ranged_lab` | Maelstrom | Ranged gang combatant. |
| `gang_valentinos_ranged_01` | Valentinos | Ranged gang combatant. |
| `gang_tygerclaws_ranged_01` | Tyger Claws | Ranged gang combatant. |

An alias contains its predefined record, observer record and capability list. An advertised
capability describes the underlying rig/template; it does not make an unstable task public.

**`civilian_female_relaxed_01` cannot be shot, and this is not a bug to work around.** It
resolves to `Character.Panam`, which carries the TweakDB tag `Invulnerable` — vanilla quest
protection that no attitude change, no `damagePolicy` and no Lua call can lift. Measured in
game on 2026-08-03: *impossible à viser/frapper*. It is also unsafe to arm — driving the
weapon path against her native graph corrupts a component vtable
(`NpcReplication.cpp`, `Cyberpunk2077.exe+0x336376`). Use it for a passive background body
and nothing else.

**Native combat relations are explicit.** A native gang record runs engine combat AI on
every client streaming it. For `aiMode = Open77.npcs.ai.native`, the client makes native
NPCs hostile to the local player and, by default, to other native NPCs in their bucket.
Choosing the same gang template does not make a team. Idle NPCs acquire the nearest
hostile NPC within the existing combat radius; default player acquisition uses engine
perception.

Resources may opt into a shared team and nearby player acquisition through loadout metadata:

```lua
loadout = {
    combat = { group = "my_resource_guards", acquirePlayers = true },
}
```

Equal nonempty `combat.group` values make native NPC pairs friendly and exclude them
from each other's automatic target selection. Groups are case-sensitive, at most 64
ASCII letters, digits, `_`, `-` or `.`; prefix them with the resource name to avoid
collisions in a shared bucket. Missing or invalid groups preserve free-for-all behavior.
This controls engine relations, not a server damage arbiter: a gamemode should enforce
its friendly-fire rules in damage handling too.

`acquirePlayers` defaults to `false`. When explicitly `true`, an idle NPC can acquire a
living local player in the same bucket within 30 metres, provided a chest-height
Static/Dynamic world raycast is clear and no closer hostile NPC was selected. The engine
still decides movement and firing. This is a perception aid, not an AI task or a damage
grant; gamemode shields and damage validation remain authoritative.

Metadata without a top-level `weapon` never enters the player-proxy equipment path.
Gang records retain their native inventory. A nested `combat.weapon` is ignored.
Deploy a client containing this policy before enabling cooperative camps: older clients
ignore the metadata and retain the default hostility sweep.

### Complete 2.31 research catalogue

The research catalogue helps find records and appearances for Cyberpunk 2077 2.31 + Phantom Liberty.
It does not gate the runtime API:

- [6,668 `Character.*` records](../docs/generated/npc-records-2.31.csv), including template,
  gameplay metadata, crowd appearances and structural risk classification;
- [1,524 unique `.ent` templates](../docs/generated/npc-templates-2.31.md), all verified present and
  readable in the installed base-game/EP1 archives;
- [all `.ent` appearance bindings](../docs/generated/npc-entity-appearances-2.31.csv);
- [all definitions from the referenced `.app` resources](../docs/generated/npc-appearance-resources-2.31.csv);
- [detailed machine-readable `.ent`/`.app` graph](../docs/generated/npc-entity-appearances-2.31.json).

The `category` and `risk` columns are research filters, not a runtime allowlist. In
particular, `candidate` means only that no obvious quest/player/vendor/special-rig blocker was found
in the extracted fields. Access to a record does not guarantee that its quest logic, special rig,
animations, appearance or equipment supports every NPC task. Test the records you ship; prefer
native inventory over forcing player-proxy equipment onto an unrelated character graph.

See the [methodology, source hashes, limitations and validation backlog](../docs/research/npc-templates-and-appearances-catalog.md).

## Create and inspect

```lua
local npcId, reason = Open77.npcs.create({
    record = "Character.Judy",
    position = { x = -1378.0, y = 1262.0, z = 123.0 },
    yaw = 90.0,
    bucket = 0,
    appearance = nil,
    loadout = {},
    aiMode = Open77.npcs.ai.tasks,
    damagePolicy = Open77.npcs.damage.immortal,
    health = 100,
    maxHealth = 100,
    streamingRadius = 180,
    streamingHysteresis = 40,
    despawnWhenUnobserved = false,
    persistent = false,
})

if not npcId then error(reason) end

local npc = Open77.npcs.get(npcId)
local owned = Open77.npcs.all()       -- this resource only
local inBucket = Open77.npcs.all(12)  -- optional bucket filter
```

`get` returns the template, appearance, loadout JSON, position, bucket, streaming values, health,
flags, AI/damage modes, revisions, active task and current authority lease.

Limits are enforced server-side: 4096 NPCs globally, 512 per resource and 64 tasks per NPC.

### Server API reference

All functions in this table require `world.npcs`. IDs are opaque 64-bit Lua integers. Mutation
functions return `true` only when the NPC exists and belongs to the calling resource. Invalid
task parameters, IDs or enum values raise a Lua error; callers should treat these as resource
bugs rather than normal gameplay failures.

`create` is the exception: an invalid record ID, unknown alias or out-of-range field is a **normal
rejection**, not an error. It returns `nil, reason` — for example
`nil, "npc_record_invalid"` or `nil, "npc_template_not_found"` — so always check both return values.
A returned ID confirms canonical server creation, **not** successful engine spawning. Client-side
record lookup and asynchronous spawning can still fail; use `onNpcReady` and `onNpcSpawnFailed`.

| Function | Parameters | Return |
|---|---|---|
| `Open77.npcs.create` | `definition` | `npcId`, or `nil, reason` when the subsystem/permission is unavailable |
| `Open77.npcs.get` | `npcId` | owned NPC snapshot or `nil` |
| `Open77.npcs.all` | optional `bucket` | array of owned NPC snapshots |
| `Open77.npcs.templates` | none | array of optional legacy alias snapshots (not an exhaustive catalogue) |
| `Open77.npcs.update` | `npcId, fields` | boolean |
| `Open77.npcs.setTransform` | `npcId, transform` | boolean |
| `Open77.npcs.setBucket` | `npcId, bucket` | boolean |
| `Open77.npcs.setAppearance` | `npcId, appearance` | boolean |
| `Open77.npcs.setLoadout` | `npcId, loadout` | boolean |
| `Open77.npcs.setHealth` | `npcId, health, optional maxHealth` | boolean |
| `Open77.npcs.setDamagePolicy` | `npcId, policy` | boolean |
| `Open77.npcs.setAiMode` | `npcId, mode` | boolean |
| `Open77.npcs.setRagdoll` | `npcId, enabled` | boolean |
| `Open77.npcs.setAttitude` | `npcId, attitude, optional options` | boolean, or `false, reason` |
| `Open77.npcs.getAttitude` | `npcId` | attitude table or `nil` |
| `Open77.npcs.setGroup` | `npcId, group` | boolean, or `false, reason` |
| `Open77.npcs.getGroup` | `npcId` | group string or `nil` |
| `Open77.npcs.setRelationship` | `groupA, groupB, attitude` | boolean, or `false, reason` |
| `Open77.npcs.getRelationship` | `groupA, groupB` | attitude string or `nil` |
| `Open77.npcs.target` | `npcId` | `{ kind, id }` or `nil` |
| `Open77.npcs.applyDamage` | `npcId, amount, optional source, optional cause` | boolean |
| `Open77.npcs.kill` | `npcId, optional reason` | boolean |
| `Open77.npcs.revive` | `npcId, optional health` | boolean |
| `Open77.npcs.remove` | `npcId` | boolean |

An NPC snapshot contains:

| Field | Type | Meaning |
|---|---|---|
| `id`, `revision`, `taskRevision` | integer | Canonical identity and monotonic revisions. |
| `resource` | string | Owning resource. |
| `template`, `record`, `observerRecord` | string | Legacy alias, or `"record"` for direct spawning. Both record fields contain the exact Character ID for direct spawns. |
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
Open77.npcs.setTransform(npcId, { position = { x = 1, y = 2, z = 3 }, yaw = 180 })
Open77.npcs.setBucket(npcId, 7)
Open77.npcs.setAppearance(npcId, "appearance_name")
Open77.npcs.setLoadout(npcId, { weapon = "Items.Preset_Lexington_Default" })
Open77.npcs.setHealth(npcId, 80, 100)
Open77.npcs.setDamagePolicy(npcId, Open77.npcs.damage.mortal)
Open77.npcs.setAiMode(npcId, Open77.npcs.ai.tasks)
Open77.npcs.setRagdoll(npcId, true)
Open77.npcs.remove(npcId)
```

`Open77.npcs.update(id, fields)` can atomically change appearance, loadout, AI mode, damage policy,
health, maximum health and ragdoll. The named setters above are convenience wrappers.

Moving an NPC between buckets or teleporting it revokes the current simulation lease before the
new state is broadcast.

### Constants

```lua
Open77.npcs.flags.alive
Open77.npcs.flags.ragdoll
Open77.npcs.flags.despawnWhenUnobserved
Open77.npcs.flags.persistent
Open77.npcs.ai.tasks
Open77.npcs.ai.frozen
Open77.npcs.ai.native
Open77.npcs.damage.mortal
Open77.npcs.damage.immortal
Open77.npcs.damage.invulnerable
```

`tasks` is the stable default. `frozen` immediately revokes the simulation lease and suspends every
task channel; returning to `tasks` resumes them with fresh timeout/duration accounting. A dead NPC
cannot receive a lease, motion report or new task until it is revived. `native` is reserved for
templates whose autonomous REDengine behaviour has been explicitly validated.

## Tasks

For native AI pause, passive NPCs, sensory acquisition and per-NPC voice suppression, see
[NPC AI, combat and voice control](npc-behavior.md). These options are set with
`behavior = {...}` at creation or `Open77.npcs.setBehavior(id, {...})` later; snapshots expose
the current `behavior` table. They survive loadout changes and stream-out/stream-in.


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
| `attack` | action | Engages a player or an owned NPC. Composes with a movement task. |
| `guard` | movement | Holds an area, and fights from it without being pulled home. |
| `flee` | movement | Breaks contact with a player, NPC or fixed point. |

### Move, follow and patrol

```lua
local move = Open77.npcs.tasks.moveTo(npcId, { x = 10, y = 20, z = 30 }, {
    speed = "walk", acceptanceRadius = 1.0, timeoutMs = 30000,
})

local follow = Open77.npcs.tasks.follow(npcId, { type = "player", id = playerId }, {
    speed = "run", distance = 2.0, onTargetLost = "wait",
})
local followNpc = Open77.npcs.tasks.follow(npcId, { type = "npc", id = otherNpcId })

local patrol = Open77.npcs.tasks.patrol(npcId, {
    { x = 10, y = 20, z = 30, waitMs = 500 },
    { x = 16, y = 20, z = 30, waitMs = 1000 },
}, { speed = "walk", loop = true, backAndForth = false })

local wander = Open77.npcs.tasks.wander(npcId, {
    x = 10, y = 20, z = 30, radius = 15, speed = "walk", seed = 42,
})
```

`walk`, `run` and `sprint` are supported movement speeds. Patrol accepts 1 to 64 points. The
current `onTargetLost` policy waits for the target to become available again.

### Look, hold and animation

```lua
Open77.npcs.tasks.face(npcId, { x = 1, y = 2, z = 3 }, {
    tolerance = 3, speed = 180, timeoutMs = 5000,
})
Open77.npcs.tasks.lookAt(npcId, { type = "player", id = playerId })
Open77.npcs.tasks.wait(npcId, 1500)
Open77.npcs.tasks.hold(npcId, { durationMs = 5000 })
Open77.npcs.tasks.playAnimation(npcId, "emote_smoke", { loop = false })
```

Named full-body animations remain active until they are cancelled, preempted, timed out or the NPC
streams out. REDengine does not expose a reliable completion signal for every workspot clip, so use
`timeoutMs` or explicit cancellation when the animation must end deterministically.

### Scenarios: workspots

A named animation is one clip. A **workspot** is the engine's authored scenario system -- a body
mounted into a device that plays a whole behaviour with its own props and its own clip set. It is
what the vanilla world uses for a ped smoking on a corner or sitting on a kerb, and it is what
`tasks.workspot` drives.

```lua
for _, profile in ipairs(Open77.npcs.tasks.workspots()) do
    print(profile.id, profile.label, profile.category)
end

Open77.npcs.tasks.workspot(npcId, "smoke", { durationMs = 8000 })
Open77.npcs.tasks.workspot(npcId, "sit", { loop = true })
```

The catalogue is the twelve shipped RP profiles -- `smoke`, `cigar`, `drink`, `phone`, `dance`,
`handsup`, `meditate`, `sit`, `clap`, `cry`, `think`, `stretch` -- and it is the **same list**
`Open77.animations.list()` offers for players. One catalogue, two callers. Each entry names the
vanilla `.workspot` resource it plays, so a profile is traceable back to the authored asset rather
than to a clip name someone typed.

A reference that is not a catalogue id is played as a **raw clip** through the generic device, the
same path `playAnimation` uses. That is the escape hatch and it is not the supported form: a raw
clip's animset may not be loaded by the generic device, in which case the engine simply does not
play it.

| Option | |
|---|---|
| `durationMs` | ends the scenario by **succeeding**. A scenario that ran its course is not a failure, which is why this is not `timeoutMs` |
| `loop` | `true` has no end; the task runs until cancelled or preempted |
| `clip` | a specific clip from the profile's set, instead of its default |

| Reason | Meaning |
|---|---|
| `npc_task_invalid_workspot` | the reference was not a string, or a profile was named together with a clip name |
| `npc_task_invalid_duration` | `durationMs` was negative or above one hour |

### Getting into a vehicle

```lua
Open77.npcs.tasks.enterVehicle(npcId, vehicleId, "driver")
Open77.npcs.tasks.enterVehicle(npcId, vehicleId, 0, { warp = true })
Open77.npcs.tasks.exitVehicle(npcId)
```

Movement channel -- walking to a car is locomotion, so it replaces a standing `moveTo` rather than
composing with it. Seats use the `Open77.vehicles.seats` numbering (`-1` driver, `0` front
passenger, `1` rear left, `2` rear right) and also accept `driver`, `frontPassenger`, `rearLeft`,
`rearRight` by name.

The body walks to the car and mounts once it is within `approachDistance` (3 m by default);
`warp = true` skips the walk. Either way the task reports `executing` first and succeeds only once
the mounting relation can be **read back off the body** -- the relation is established
asynchronously, so that read is the only honest proof it is seated.

`exitVehicle` is idempotent: a body already out of the car has done what was asked and the task
succeeds with reason `not_in_vehicle`. Passing `vehicleId` narrows it to one car, and a body
sitting in a different one then fails with `vehicle_mismatch` instead of being pulled out of it.

| Reason | Meaning |
|---|---|
| `npc_task_invalid_target` | no `vehicleId`, or zero |
| `npc_task_invalid_seat` | outside `-1..2`, or an unknown seat name |
| `vehicle_not_streamed` | no client has that car streamed in, so there is nothing to walk to |
| `vehicle_mount_refused` | the engine refused the seat |

### Driving

An NPC that is the attached driver of a vehicle can be given driving orders **by ped id**:

```lua
Open77.vehicles.ai.attachDriver(vehicleId, { npcId = npcId })

Open77.npcs.tasks.driveTo(npcId, { x = 100, y = 200, z = 10 }, { speed = 20, style = "aggressive" })
Open77.npcs.tasks.driveWander(npcId)
Open77.npcs.tasks.chase(npcId, { playerId = source })
Open77.npcs.tasks.setDriverAbility(npcId, 0.9)
Open77.npcs.tasks.stopDriving(npcId)
```

These are **not** a second driving system. They resolve the vehicle the NPC drives and forward to
[`Open77.vehicles.ai`](server-api.md), which owns the vanilla
`AIVehicleDriveToPointAutonomousCommand` pipeline; two stacks that could disagree about where a car
is going would be worse than one. Every one of them returns `nil, "npc_not_driving"` until the NPC
is actually attached as a driver, and returns the driving state when it is.

Two things do not map from GTA and are named rather than faked:

* **`driveWander` is `joinTraffic`**, the engine's own lane-following mode. Cyberpunk traffic AI
  drives authored lanes; there is no free-roam wander to expose.
* **`setDriverAbility` is a mapping, not a skill parameter.** 2.31 has no driver-ability field, so a
  0..1 ability is mapped onto the two levers that do exist: below `0.34` is `cautious`, above `0.67`
  is `aggressive`, otherwise `normal`; the speed cap becomes `8 + ability * 24` m/s. It returns the
  resulting driving state so a caller reads what was applied instead of assuming.

`attachDriver` refuses an NPC that holds any live task (`driver_npc_has_tasks`), so finish or cancel
an `enterVehicle` before attaching.

### Generic queue and cancellation

```lua
local taskId = Open77.npcs.tasks.enqueue(npcId, "moveTo", {
    x = 1, y = 2, z = 3, speed = "walk",
}, { channel = Open77.npcs.channels.movement, priority = 10, timeoutMs = 30000 })

local task = Open77.npcs.tasks.get(npcId, taskId)
local tasks = Open77.npcs.tasks.all(npcId)
Open77.npcs.tasks.cancel(npcId, taskId, "script_cancel")
Open77.npcs.tasks.clear(npcId, Open77.npcs.channels.movement, "new_route")
```

Only the task names listed above are accepted. Unsupported types and malformed targets, paths,
durations or animation names are rejected before replication.

The five driving verbs are the exception to the shape above: they are commands, not queued tasks,
because the job they drive lives in the vehicle AI service and already has its own lifecycle. They
return a driving state rather than a task id.

### Task API reference

| Function | Parameters | Return |
|---|---|---|
| `Open77.npcs.tasks.enqueue` | `npcId, type, parameters, optional options` | task ID |
| `Open77.npcs.tasks.moveTo` | `npcId, position, optional options` | task ID |
| `Open77.npcs.tasks.follow` | `npcId, target, optional options` | task ID |
| `Open77.npcs.tasks.patrol` | `npcId, points, optional options` | task ID |
| `Open77.npcs.tasks.wander` | `npcId, optional options` | task ID |
| `Open77.npcs.tasks.face` | `npcId, target, optional options` | task ID |
| `Open77.npcs.tasks.lookAt` | `npcId, target, optional options` | task ID |
| `Open77.npcs.tasks.wait` | `npcId, durationMs, optional options` | task ID |
| `Open77.npcs.tasks.hold` | `npcId, optional options` | task ID |
| `Open77.npcs.tasks.playAnimation` | `npcId, animation, optional options` | task ID |
| `Open77.npcs.tasks.workspot` | `npcId, profile or clip, optional options` | task ID |
| `Open77.npcs.tasks.workspots` | `optional query` | array of catalogue profiles |
| `Open77.npcs.tasks.enterVehicle` | `npcId, vehicleId, optional seat, optional options` | task ID |
| `Open77.npcs.tasks.exitVehicle` | `npcId, optional options` | task ID |
| `Open77.npcs.tasks.driving` | `npcId` | driving state or `nil, reason` |
| `Open77.npcs.tasks.driveTo` | `npcId, position, optional options` | driving state or `nil, reason` |
| `Open77.npcs.tasks.driveWander` | `npcId, optional options` | driving state or `nil, reason` |
| `Open77.npcs.tasks.chase` | `npcId, target, optional options` | driving state or `nil, reason` |
| `Open77.npcs.tasks.stopDriving` | `npcId` | driving state or `nil, reason` |
| `Open77.npcs.tasks.setDriverAbility` | `npcId, ability` | driving state or `nil, reason` |
| `Open77.npcs.tasks.attack` | `npcId, target, optional options` | task ID |
| `Open77.npcs.tasks.guard` | `npcId, position, optional radius, optional options` | task ID |
| `Open77.npcs.tasks.flee` | `npcId, from, optional options` | task ID |
| `Open77.npcs.tasks.get` | `npcId, taskId` | task snapshot or `nil` |
| `Open77.npcs.tasks.all` | `npcId` | array of task snapshots |
| `Open77.npcs.tasks.cancel` | `npcId, taskId, optional reason` | boolean |
| `Open77.npcs.tasks.clear` | `npcId, optional channel, optional reason` | number cancelled |

Common options are `priority` (signed integer) and `timeoutMs` (`0` disables the timeout). Generic
`enqueue` also accepts `channel`. A task snapshot contains `npcId`, `id`, `resource`, `type`, the
JSON string `parameters`, `channel`, `priority`, `timeoutMs`, `status`, `revision` and `reason`.
Statuses are `queued`, `suspended`, `executing`, `success`, `failure`, `cancelled` and
`interrupted`.

## Attitude and relationship groups

`setAttitude` decides who an NPC will fight. It is **per NPC and per target**, and that is not a
design preference -- it is the only shape the engine can express for one incarnation. A
`gameAttitudeAgent` carries `SetAttitudeTowards(otherAgent, attitude)`, an override on one pair of
agents, which is what Open77 writes. The engine's other lever, a global group matrix reached through
`gameCAttitudeManager.SetAttitudeRelation`, is process-wide and shared with vanilla content, so
Open77 does not touch it; `docs/research/npc-behavior-control.md` records that measurement in full.

```lua
-- Hostile to every player and to every other NPC of this resource.
Open77.npcs.setAttitude(npcId, "hostile")

-- ...except this one player, who is an ally.
Open77.npcs.setAttitude(npcId, "friendly", { towards = { playerId = playerId } })

-- ...and this NPC, which it simply ignores.
Open77.npcs.setAttitude(npcId, "neutral", { towards = { npcId = otherNpcId } })

-- Take the exception back; the default applies again.
Open77.npcs.setAttitude(npcId, nil, { towards = { playerId = playerId } })
```

Rows resolve in a fixed order, most specific first:

1. the per-entity row (`{ playerId = n }` or `{ npcId = n }`);
2. the per-group row (`{ group = "name" }`);
3. the relationship row declared by `setRelationship` for the two NPCs' groups;
4. the default set by `setAttitude` with no `towards`;
5. otherwise the NPC behaves exactly as it did before any of this existed.

Two rules are worth reading twice. An NPC that states **nothing** replicates the same loadout bytes
it always did and is resolved by the pre-existing rules, so adding this API changed no running
resource. And player **eligibility is a hard cap, not a default**: a dead player, or one in another
routing bucket, is never made a target by a directive. A directive can only ever make an NPC
friendlier toward an ineligible player, never hostile.

Attitude survives a wholesale `setLoadout`, the way `behavior` does, because it is policy rather
than equipment. `combat.group` does not: it is an ordinary loadout field with pre-existing meaning.

### Relationship groups

Groups are the readable way to run more than two sides. `setGroup` writes the same `combat.group`
field a loadout has always been able to carry -- two NPCs sharing a non-empty group are allies --
and `setRelationship` declares what happens between two groups.

```lua
Open77.npcs.setGroup(copId, "police")
Open77.npcs.setGroup(gangerId, "valentinos")
Open77.npcs.setRelationship("police", "valentinos", "hostile")
Open77.npcs.setRelationship("police", "medics", "friendly")
```

The matrix is **per resource**, symmetric, and dies with the resource that declared it: one
resource's groups never reach another's bodies, exactly as its NPC reads and writes never do. The
resulting row is projected onto every owned NPC in either group and replicated with it, so every
observer resolves the pair without asking the server -- and an NPC that joins a group later picks up
the standing row. When two NPCs state attitudes about each other that disagree, **the more hostile
side wins**: a one-sided friendship produces a body that is shot at and does not shoot back.

### Combat tasks

The combat tasks are ordinary queue entries on the existing channels, so they compose with the
movement and look tasks already there.

```lua
-- Engage. Action channel: a standing `moveTo` or `patrol` is NOT cancelled -- the engine
-- suspends it for the fight and resumes it afterwards.
Open77.npcs.tasks.attack(npcId, { playerId = playerId })
Open77.npcs.tasks.attack(npcId, { npcId = rivalId }, { reacquireMs = 3000 })

-- Hold a doorway. Standing order: it ends on cancel or timeout, never on its own.
Open77.npcs.tasks.guard(npcId, { x = 10, y = 20, z = 30 }, 12, { speed = "run" })

-- Break contact.
Open77.npcs.tasks.flee(npcId, { playerId = playerId }, { distance = 60 })
```

`attack` forces the pair hostile and seeds the target into the puppet's own target tracker, then
re-seeds on `reacquireMs`. It issues **no** locomotion or shooting command: the engine's combat AI
owns the body from there, which is why an attacking NPC can still take cover and manoeuvre. It
reports `success` when the target dies, streams out or is removed, and `failure` with
`attack_target_unavailable` when the target could not be resolved at all. Cancelling drops the
seeded threat but leaves the attitude alone -- that was a deliberate statement, and a task must not
overwrite it.

`guard` is a leash, not a patrol. Whenever the body is further than `radius` from the anchor **and
is not already in a fight** it walks back; while it holds a hostile threat it is left entirely
alone. It does not by itself make anything hostile: pair it with `setAttitude` or a group.

`flee` re-measures a live target every cycle, so an NPC keeps breaking contact as the thing it flees
moves, and reports `success` once `distance` metres separate them. It drops the tracked threat on
that body once, which is best-effort and deliberately shallow: the attitude is untouched, so a
still-hostile NPC may re-acquire the same target by perception.
`setAttitude(npcId, "neutral", { towards = ... })` before the flee is the composable answer.

**There is no `cover` task**, and that is an honest gap rather than an oversight. Both engine
commands for cover -- `AIUseCoverCommand` and `AIMoveToCoverCommand` -- address a cover position by
`NodeRef`, a reference to a node authored into a streaming sector. Open77 cannot mint one at runtime
and cannot enumerate the cover nodes near a point, so a `cover` task could only ever have sent an
empty reference. A task that exists and does nothing is worse than no task, so it is not there. In
practice the engine takes cover by itself once an NPC is in a fight; `guard` exists partly so that
Open77 stops pulling it back out of one. The same `NodeRef` wall blocks `AIAssignGuardAreaCommand`,
which is why `guard` is a leash built on `moveTo` rather than an engine guard area.

## Health, damage and death

```lua
Open77.npcs.applyDamage(npcId, 25, "resource:arena", "firearm")
Open77.npcs.kill(npcId, "admin")
Open77.npcs.revive(npcId, 100)
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
AddEventHandler("onNpcTargetChanged", function(npcId, kind, targetId, previousKind, previousTargetId) end)
AddEventHandler("onNpcInteracted", function(npcId, playerId, interactionId, choiceId, distance) end)
```

The same creation and removal also reach `onEntityCreated(kind, id, resource)` and
`onEntityRemoved(kind, id, reason)` with `kind` = `"npc"`, for a resource that declares
`world.entities.observe` and wants every registry under one name. The mirror is raised by the
same statement as the event above it, so the two can never disagree — see
[entity lifecycle events](server-api.md#entity-lifecycle-events).

`onNpcTargetChanged` is delivered **only to the resource that owns the NPC**, unlike the six above
it, because NPC reads are owner scoped everywhere else in this API and an event telling every
resource which player another resource's bodyguard had just drawn on would be a read across that
boundary. `kind` is `none`, `player` or `npc`, and `targetId` is `0` when `kind` is `none`. All five
arguments are strings, as every server resource event's arguments are.

`onNpcInteracted` is a **player's** act on an NPC — a choice used on a `globalNpc`
[interaction target](interactions.md#event-payload-and-server-authority) — and is delivered
host-wide like `onNpcDamaged`: the owner is not the only resource entitled to know that a player
pressed a key on its clerk. The bundled prompt reports the use to the server; the server refuses
a report from a player it cannot place, from another routing bucket, or from more than 40 m away,
and publishes the event only for an accepted one, with `distance` being **its own** measurement
between the player's last fresh snapshot and the NPC's canonical position (metres, two decimals).
`interactionId` is the target's materialised id (`<targetId>:<matchKey>`) and `choiceId` the
choice; a refused report produces no event at all, so a forged one can only be silent. Apply your
own rule on `distance` — 40 m is the ceiling that keeps a sprinting player's stale snapshot from
breaking a real prompt, not the reach of your shop.

```lua
-- A vendor: one NPC per stall, opened by the prompt the interactions resource shows on it.
local stalls = {}   -- npcId (string) -> catalogue

CreateThread(function()
    local npcId = Open77.npcs.create({ record = "Character.Judy", position = { x = -1378.0, y = 1262.0, z = 123.0 } })
    stalls[tostring(npcId)] = "weapons"
    exports.open77_interactions:define({
        { id = "stall", kind = "globalNpc", distance = 2.0, label = "Browse", key = "E", event = "market:browse" },
    })
end)

AddEventHandler("onNpcInteracted", function(npcId, playerId, interactionId, choiceId, distance)
    local catalogue = stalls[npcId]
    if catalogue == nil or tonumber(distance) > 3.0 then return end
    TriggerClientEvent("market:open", tonumber(playerId), catalogue)
end)
```

Client resource events:

```lua
AddEventHandler("onNpcStreamIn", function(npcId, revision) end)
AddEventHandler("onNpcReady", function(npcId, entity) end)
AddEventHandler("onNpcSpawnFailed", function(npcId, record, reason) end)
AddEventHandler("onNpcChanged", function(npcId, revision) end)
AddEventHandler("onNpcTaskChanged", function(npcId, taskId) end)
AddEventHandler("onNpcAuthorityChanged", function(npcId, playerId) end)
AddEventHandler("onNpcStreamOut", function(npcId, reason) end)
```

## Client read-only API

`onNpcSpawnFailed(npcId, record, reason)` is a **local diagnostic**, not a server-authoritative
failure. Reasons are `npc_record_invalid`, `npc_record_not_found`, `npc_record_not_character`,
`npc_spawn_failed` and `npc_spawn_timeout` (30 seconds). A failed projection is not retried every
frame: it remains failed until a new incarnation (stream-out/in, recreation, record/appearance
change). Transient spawn-service saturation is retried at most once every two seconds. Never
trust a client failure notification to delete canonical server state automatically.

```lua
local npc = Open77.npcs.get(npcId)
local visible = Open77.npcs.all()
local ready = Open77.npcs.isStreamedIn(npcId)
local entity = Open77.npcs.entity(npcId)       -- local Open77 entity handle or nil
local taskId = Open77.npcs.currentTask(npcId) -- canonical current task ID or nil
```

Snapshots expose `streamed` and `locallyAuthoritative`. The local entity handle is ephemeral: do
not cache it across stream-out, reconnect or resource reload.

Client snapshots contain `id`, `revision`, `entity`, `template`, `record`, `appearance`, `flags`, `bucket`,
`aiMode`, `damagePolicy`, `health`, `maxHealth`, `currentTaskId`, `taskRevision`,
`authorityPlayerId`, `authorityEpoch`, `streamed` and `locallyAuthoritative`. Without `npcs.read`,
`all()` returns an empty array, `get()`/`entity()`/`currentTask()` return `nil`, and
`isStreamedIn()` returns `false`.

## Current limitations

- Server persistence storage is resource-defined; `persistent=true` only changes cleanup policy.
- Records outside `Character.*`, raw REDengine handles and client-side canonical mutation are
  unsupported. A valid Character record may still depend on unavailable DLC/assets or quest logic.
- Native attack/shoot/melee/combat tasks are not in the stable API yet. Use server-authoritative
  scripted damage until animation, targeting and hit validation are proven safe for each rig.
- Native authored patrol paths (`NodeRef`) are not exposed; Open77 patrols sequence `moveTo` tasks.
- A client authority lease is required for native navigation. With no ready client, tasks suspend
  and resume when authority becomes available.
