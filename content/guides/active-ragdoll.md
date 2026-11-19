# Active ragdoll

A body that falls no longer goes limp or plays a canned knockdown. It becomes a physically simulated ragdoll whose joints are still driven toward poses, so it reacts to what hit it: a gut shot doubles it over, a blast throws it and it windmills in the air, it braces when it lands, rolls, curls up or lies dazed. It works for players and NPCs, and every player sees the fall.

A server knocks a player down with one call. The server grants a **lease** (who falls, why, for how long), every client simulates the fall of that player's body, and the player gets up where the body ended.

Requires OPEN//77 **2.50.0-unstable+op77.252** (Unstable channel) or later, client and server. Stable clients and servers do not have it: on them `Open77.ragdoll` is `nil` on both sides.

## What players see

- **Knocked down by a server.** The player's body falls with the reaction of its profile (a stumble, a shove, a blast...), on their own screen and on everyone else's. They cannot move until the lease ends, then they stand up where the body landed.
- **Their own death.** The player's body falls as a body that has just died and stays down until the revive or the respawn. The death is shown in third person, on the body that fell.
- **Other players dying.** A remote player's corpse falls with the reactions of a body that has just died, pushed the way the killing hit pushed it.
- **NPCs.** An NPC the game knocks down or kills, and an NPC a server ragdolls with `Open77.npcs.setRagdoll`, reacts the same way instead of going limp.

Physics runs separately on every client. What players share is the cause (profile, push, seed) and the owner's position, so the fall is the same in its broad strokes on every screen but not identical to the centimetre.

## Enable or disable it

The engine side is part of the client. The replicated half, the local death and the camera that follows the body are the system resource **`open77_ragdoll`** (`resources/system/open77_ragdoll`, `auto_start true`).

The `freeroam`, `deathmatch`, `cordon` and `pursuit` templates load it right after `open77_preflight`. A server created from a template before 252 has an exact `resources.load` list without it: add the name and restart the server (see [Server resources](server-resources.md)).

```jsonc
// server.jsonc
"resources": {
  "load": [
    "open77_preflight",
    "open77_ragdoll",
    // ... the rest of your list
  ]
}
```

To turn it off, remove `open77_ragdoll` from `resources.load` (or add `"!open77_ragdoll"` after a wildcard rule). Without it:

- a lease started by `Open77.ragdoll.start` on the server is never applied: no client acknowledges it and it ends with `timeout` two seconds later;
- the local player's death keeps the first-person collapse;
- remote players' corpses and NPCs still get the reactions. That part is the client's own and does not depend on the resource.

`open77_ragdoll` declares these permissions; a copy or a fork needs the same:

```lua
permissions { "network.events", "network.client", "player.ragdoll", "world.effects", "perspective.policy",
    "players.life.read", "screen.effects", "camera.script", "world.query" }
```

`player.ragdoll` is the client API itself, `world.effects` covers `Open77.vfx.resolveTarget` (finding a remote player's body), `players.life.read` the local player's life phase (death, revive, respawn), `screen.effects` the short blink that covers the stand-up, and `camera.script` with `world.query` the camera that rides the body.

A resource that starts leases from the server needs **`players.ragdoll`**. A client resource that drives bodies itself needs **`player.ragdoll`**.

## Knock a player down

```lua
-- open77.lua
permissions { "players.ragdoll" }
server_script "server.lua"
```

```lua
-- server.lua: a grenade throws everyone within 6 m
local function blast(center, radius)
    for _, near in ipairs(Open77.players.nearby(center, radius)) do
        if near.position then
            local dx, dy = near.position.x - center.x, near.position.y - center.y
            local length = math.max(math.sqrt(dx * dx + dy * dy), 0.5)
            local strength = 12 * (1 - near.distance / radius)
            local serial, reason = Open77.ragdoll.start(near.playerId, {
                profile = "blast",
                impulse = { x = dx / length * strength, y = dy / length * strength, z = 5 },
                point = center,
                durationMs = 4000,
            })
            if not serial then print(("player %d not thrown: %s"):format(near.playerId, reason)) end
        end
    end
end
```

`start` answers at once with the lease's serial, or `nil, reason`. The body is down a moment later, once the owner's client has the ragdoll simulating.

## Server API

`Open77.ragdoll`, permission `players.ragdoll`. Every function answers `nil, reason` on a refusal.

| Function | Returns |
|---|---|
| `Open77.ragdoll.start(playerId, options?)` | the lease's `serial` (an integer) |
| `Open77.ragdoll.impulse(playerId, { impulse, point?, body? })` | `true` |
| `Open77.ragdoll.stop(playerId)` | `true` |
| `Open77.ragdoll.state(playerId)` | `{ serial, phase, profile, startedAtMs, durationMs, getUp }`, or `nil` with no lease |

### `start` options

| Option | Default | Meaning |
|---|---|---|
| `profile` | `"stumble"` | A [profile](#profiles), or the name of a node of the [library](#the-reaction-library). `[a-z0-9_]`, 1 to 32 characters. |
| `impulse` | `{ x = 0, y = 0, z = 0 }` | The push, as a **velocity change in m/s**, each component within ±30. The same push on every client, whatever the body's mass. |
| `point` | none | World position of the hit. The bodies near it take all of the push and the far ones less, so the body turns. |
| `body` | `-1` | `-1` (whole body) or a ragdoll body index `0` to `21`. |
| `durationMs` | `3000` | How long the body stays down, counted **from the moment the owner's ragdoll simulates**. `0` keeps it down until `stop`. At most `30000`. Rounded to an integer. |
| `getUp` | `true` | Whether the owner stands up when the lease ends. |
| `tension` | `-1` | `0` to `1`, or `-1` for the profile's default. |

Vectors are `{ x =, y =, z = }` tables with exactly those three keys (a `vector3` works) or `{ x, y, z }` arrays. Option keys are checked: an unknown key, a misspelt one (`duration`) or a `getUp` that is not a boolean is `invalid_options`.

`body` and `tension` are validated and sent to every client with the lease, but the shipped `open77_ragdoll` client does not use them yet.

A `start` on a player who already has a lease replaces it: the old lease ends with `replaced` and a new serial starts.

### `impulse`, `stop`, `state`

- `impulse(playerId, { impulse, point?, body? })` pushes a body that is already down. `impulse` is required, with the same bounds as `start`. Without `point`, clients push at the body's pelvis. At most **20 impulses per rolling second** per player.
- `stop(playerId)` ends the lease with the reason `stopped`. The player stands up unless the lease was started with `getUp = false`.
- `state(playerId)`: `phase` is `"pending"` (granted, the owner's ragdoll is not simulating yet) or `"active"`. `startedAtMs` is server-monotonic milliseconds.

### Refusals

| Reason | When |
|---|---|
| `permission_denied:players.ragdoll` | The resource does not declare the permission. |
| `invalid_player` | `playerId` is not a valid player id. |
| `player_not_found` | The player is not connected. |
| `body_unavailable` | The player is dead, not spawned or not ready, or in a vehicle. |
| `motion_busy` | A forced motion (`Open77.motion.knockdown`, `Open77.players.ragdoll`) owns the body. |
| `invalid_options` | Options are not a table, or contain an unknown key or a non-boolean `getUp`. |
| `invalid_profile`, `invalid_impulse`, `invalid_point`, `invalid_body`, `invalid_duration`, `invalid_tension` | That option is out of range or of the wrong type. |
| `not_active` | `impulse` or `stop` on a player with no lease. |
| `rate_limited` | More than 20 impulses in a second. |
| `resource_stopping` | The calling resource is stopping. |
| `ragdoll_unavailable` | The server has no ragdoll service. |

### `onPlayerRagdollChanged`

```lua
AddEventHandler("onPlayerRagdollChanged", function(playerId, state)
    if state.phase == "stop" then
        print(("player %d is up again (%s)"):format(playerId, state.reason))
    end
end)
```

Raised for every `start`, `impulse` and `stop`. `state` carries:

| Field | Meaning |
|---|---|
| `phase` | `"start"`, `"impulse"` or `"stop"`. |
| `player`, `serial` | Whose lease, and which one. |
| `profile`, `durationMs`, `getUp`, `tension` | The lease, repeated on every phase. |
| `impulse`, `point`, `body` | The cause: the start's push on `start`, the extra push on `impulse`. On `stop` they are `{0, 0, 0}`, no point and `-1`. `impulse` and `point` are `{ x, y, z }` arrays; `point` is a JSON null when absent, so test it with `type(state.point) == "table"`. |
| `seed` | The variation every client plays, derived from the player and the serial. |
| `lifeRevision` | The owner's life revision when the lease started. |
| `reason` | Empty, except on `stop`: why the lease ended. |
| `v` | The format version, `1`. |

Resources cannot raise this event themselves, and `TriggerClientEvent` refuses the `open77:ragdoll:*` names with `reserved_ragdoll_event`.

### How a lease ends

| Reason | Cause |
|---|---|
| `stopped` | `Open77.ragdoll.stop`. |
| `replaced` | A new `start` on the same player. |
| `expired` | `durationMs` elapsed. |
| `timeout` | The owner's client did not acknowledge the lease within 2 seconds (no `open77_ragdoll` on the client, or a client without the active ragdoll). |
| `death` | The player left the alive state. The death keeps its own ragdoll. |
| `disconnected` | The player left. |
| `body_unavailable` | The player entered a vehicle, changed routing bucket, lost readiness or got a new body. |
| `resource_stopped` | The resource that started the lease stopped. |
| `motion_speed_exceeded`, `motion_sample_invalid` | The owner's movement left the [motion envelope](#limits). |
| `refused`, `no_ragdoll` | Reported by the owner's client: it could not start the ragdoll, or no ragdoll appeared. |

## Profiles

A profile says which events the reaction rules see, which flags are set first and how much of the server's push the body takes (`push`, 1 = all of it). The shipped profiles live in `open77_ragdoll/client/profiles.lua`:

| Profile | Events | Push | Reaction |
|---|---|---|---|
| `stumble` | `Knockdown`, `Physical` | 0.64 | Knocked off balance, gets up. |
| `shove` | `Knockdown`, `QuickMelee`, `Melee`, `Blunt` | 0.79 | A shove. |
| `punch` | `Knockdown`, `Melee`, `Blunt`, `Fists`, `Head` | 0.71 | A punch to the head. |
| `fall` | `Knockdown` | 0.57 | Thrown: the fall rules take over in the air, the impact rules on landing. |
| `blast` | `Knockdown`, `Explosion`, `Strong` (sets `IsExplosion`) | 1 | Thrown by an explosion. |
| `vehicle` | `Knockdown`, `Physical`, `Strong` | 1 | Hit by a car. |
| `shot_head` | `Knockdown`, `Head`, `Bullet` | 0.43 | Shot, still alive. |
| `shot_chest` | `Knockdown`, `Chest`, `Bullet` | 0.5 | Shot, still alive. |
| `shot_gut` | `Knockdown`, `Abdomen`, `Bullet` | 0.5 | Shot, still alive. |
| `shot_arm_l`, `shot_arm_r` | `Knockdown`, `LeftArm` / `RightArm`, `Bullet` | 0.36 | Shot, still alive. |
| `shot_leg_l`, `shot_leg_r` | `Knockdown`, `LeftLeg` / `RightLeg`, `Bullet` | 0.36 | Shot, still alive. |
| `shotgun` | `Knockdown`, `Chest`, `Bullet`, `Shotgun`, `Strong` | 1 | A shotgun blast. |
| `limp` | none (sets `IsDead`) | 0.57 | No muscle at all. |

On the owner's client, the direction the push comes from is added as one more event (`Front`, `Back`, `Left` or `Right`), worked out from the impulse and the way the body faces; other clients use `Front`.

A profile that is none of these is entered as a **node** of the reaction library, with the whole push (node names are not case-sensitive). A node a client does not know falls back to `stumble` on that client. That is how a server adds its own reactions: define the node on every client with [`Open77.ragdoll.define`](#add-reactions), then use its name as the profile (see the [example](#a-custom-reaction-for-every-player)).

## Client API

`Open77.ragdoll`, permission `player.ragdoll`. Local presentation only: **nothing here is replicated**. Failures are `nil, reason`.

Entity `1` is the local player. Any other entity is an engine entity id, for example `Open77.vfx.resolveTarget({ kind = "player", id = tostring(playerId) })` for a remote player or `{ kind = "npc", id = tostring(npcId) }` for a server NPC.

| Function | Returns | Purpose |
|---|---|---|
| `available()` | boolean | Whether the engine side works on this game build. No permission needed. |
| `start(entity, options?)` | `true` | Ragdoll the body and pick a reaction. |
| `stop(entity, { relax?, standUp? }?)` | `true` | Let go of the muscles over `relax` seconds (default `0.5`, `0` to `10`). `standUp` (default `true`) also ends the ragdoll and gives the body back to its driver. |
| `play(entity, node)` | `true` | Enter a node of the library directly. |
| `trigger(entity, list, events?)` | `true` | Check a rule list with these events. |
| `set(entity, operation)` | `true` | A flag or variable operation: `IsDead`, `!IsWounded`, `Wound=Gut`, `Hits+1`, `Stunned:2`. |
| `impulse(entity, point, impulse)` | `true` | Push the ragdoll: a velocity change in m/s (each component within ±60), strongest at the world `point`. Both are `{ x, y, z }` tables. |
| `state(entity)` | table, or `nil` | What the body is doing (below). `nil` when it has no ragdoll. |
| `define(text)` | `true` | Add nodes, rules and condition groups in the library's format. |
| `setAutomatic(enabled)` | `true` | Whether ragdolls nobody asked for (NPCs the game knocks down or kills) get reactions. On by default; it applies to the whole client. |

### `start` options

| Option | Default | Meaning |
|---|---|---|
| `events` | none | Up to 32 event names: what hit the body (`Head`, `Bullet`, `Front`, `Explosion`, `Knockdown`...). |
| `list` | `"death"` | The rule list to check with them. `"death"` is the hit that starts the ragdoll. |
| `node` | none | Enter this node instead of running rules. `unknown_node` if the library has no such node. |
| `set` | none | Up to 16 flag or variable operations applied first. |
| `impulse` | none | A velocity change in m/s, each component within ±60. |
| `point` | the body's position | World position of the hit. |
| `seed` | `1` | An integer: the variation to play. Use the same seed on every client for the same fall. |
| `activate` | `true` | `false`: do not ask the engine for a ragdoll, only take over one that something else starts (a death). |

Strings are 1 to 64 characters. `start` returns as soon as the request is queued: `state(entity).pending` is true until the engine has built the ragdoll, then `claimed` is true. A `start` on a body that already has a ragdoll applies `set`, then enters `node` or checks the list (`"death"` becomes `"corpsehit"`): a new cause on the same fall.

The local player's own body cannot ragdoll. What falls is its third-person stand-in, so `start(1, ...)` answers `no_body_to_ragdoll` in first person. Switch to third person first (`Open77.perspective.set("tps")`) and retry while it answers `no_body_to_ragdoll`: the stand-in may still be spawning. While the local stand-in is down, the player cannot move and its own body is hidden.

### `state`

| Field | Meaning |
|---|---|
| `pending` | Requested, not built yet. |
| `claimed` | The ragdoll exists and the reaction rules drive it. |
| `active` | A pose is currently driving the joints. |
| `node`, `rule` | The node playing, and the rule that picked it. |
| `inAir`, `onGround`, `prone`, `supine` | What the body measures about itself. |
| `speedH`, `speedV` | Horizontal and vertical speed in m/s (`speedV` negative while falling). |
| `spin` | How fast the pelvis turns, in degrees per second. |
| `height` | Distance from the pelvis down to the floor in metres, `-1` when unknown. |
| `roll`, `pitch` | The hip line and the spine line from level, in degrees. |
| `seconds` | Time since the ragdoll was claimed. |
| `position` | The pelvis, `{ x, y, z }` in world space, when known. |

### Refusals

| Reason | When |
|---|---|
| `permission_denied:player.ragdoll` | The resource does not declare the permission. |
| `resource_not_running` | Called while the resource starts or stops. |
| `ragdoll_backend_unavailable` | The client has no ragdoll backend. |
| `ragdoll_unavailable` | The engine side is off on this game build (`available()` is false). |
| `invalid_entity` | The entity is not a positive integer. |
| `invalid_options`, `invalid_impulse`, `invalid_point`, `invalid_argument` | A malformed argument. |
| `no_body_to_ragdoll` | Entity `1` without a third-person stand-in. |
| `entity_unavailable` | The entity does not exist on this client. |
| `unknown_node` | `start` with a `node`, or `play`, naming a node the library does not have. |
| `not_active` | `play`, `set`, `trigger` or `impulse` on a body with no ragdoll. |
| `invalid_data`, `ragdoll_active` | `define`: empty or larger than 256 KB, or a ragdoll is running on this client. |

### Add reactions

`define(text)` adds sections to the library on this client, in the format of the library files. A node or rule of the same name replaces the earlier one. Additions are shared by every resource on the client and last for the game session.

```lua
-- A taser: a spasm, and the rule that picks it
local ok, reason = Open77.ragdoll.define([[
[BlendPose:TaserSpasm]
File = BlendPose_deathspasm1.txt
BlendPoseStrengthMult = 6
BlendPoseDuration = 1.2
Flail = 14, 9
KeepRagdollAwake = 1

[Rules:Taser]
Zap = Electric -> TaserSpasm
]])
Open77.ragdoll.start(entity, { list = "Taser", events = { "Electric" } })
```

- `File` names a pose of the shipped library (`poses/`). A resource cannot bring pose files of its own.
- `Flail = degrees, hertz` adds a seeded oscillation of the arms and legs over the pose: the windmill of a fall.
- `define` is refused with `ragdoll_active` while any ragdoll runs on the client: call it when the resource starts, and retry.
- A problem in the text answers `nil` with the library's warning (an unknown pose file, a rule without `->`...).

## The reaction library

The library is plain text shipped with the client in `red4ext/plugins/Open77/ragdoll/`:

| File | Content |
|---|---|
| `activeragdoll.ini` | The reactions and the rules that pick them. The format guide is at the end of the file. |
| `open77.ini` | OPEN//77's own reactions, loaded after it: living bodies knocked down, thrown by blasts, dazed on the ground, the `Auto` list. |
| `ragdoll.ini`, `ragdolladvanced.ini` | Joint ranges, masses and the base muscle tone of the 22 bodies. |
| `poses/BlendPose_*.txt` | The 112 poses the reactions hold. |

These files are the same on every player's machine. To change reactions for a server, ship the change in a client script with `define`, not by editing them.

What the format holds:

- `[BlendPose:Name]` a reaction holding a pose (`File`), with its strengths, ramps, `BlendPoseDuration`, `Next` or `Random` (weighted `A:3, B:1`), flags to set (`SetFlagOnStart`, `SetFlagOnEnd`), `ExitWhen`, `ProtectFor`, `InterruptBy`, `Flail`;
- `[Branch:Name]` a choice that sets flags and picks a reaction (`SetFlag`, `Random`);
- `[Template:Name]` keys shared by reactions through `Base = Name`;
- `[Conditions]` named condition groups;
- `[Rules:List]` and `[BlendPoseRules]` rules `Name = conditions -> Reaction`. The lists the client checks by itself are `Death` (the hit that starts the ragdoll), `CorpseHit`, `Impact`, `State` and `Auto` (ragdolls nobody asked for).

Conditions combine **events** (what hit the body: zones such as `Head` or `Abdomen`, directions `Front` / `Back` / `Left` / `Right`, attacks such as `Bullet`, `Melee` or `Explosion`, weapons, damage types, `Knockdown`, `KillingHit`), **states** the body measures (`InAir`, `OnGround`, `Prone`, `Supine`, `SpeedH`, `SpeedV`, `Spin`, `Height`, `Roll`, `Pitch`, `PoseTime`), and **flags and variables** the reactions set (`flag.IsDead`, `flag.Name>3`, `var.Wound=Gut`, `var.Hits>=3`).

## The camera

While the local player's body is a ragdoll (a server lease, a death, or a resource calling `Open77.ragdoll.start(1, ...)`), `open77_ragdoll` holds the view with its own third-person camera:

- it rides the body, not the player's capsule: the aim eases toward the pelvis and the lens toward a point 3.6 m behind and 1.5 m above it, so the shot stays smooth while the body flies;
- a ray against static geometry keeps the lens in front of walls, and when the body lands in a corner the lens swings toward the most open of eight directions;
- it stays in third person for the whole ragdoll, including a death. It gives the view back when the body stands up (a short blink covers the new stand-in) or when the respawn moves the player away from the corpse. The player's own preference, first or third person, then applies again.

The camera watches the body itself (`Open77.ragdoll.state(1)`), so it follows every ragdoll of the local player, whatever started it. It is a [scripted camera](cameras.md) and needs `camera.script` and `world.query`.

## A custom reaction for every player

The client half defines the node on every client; the server uses its name as the profile.

```lua
-- open77.lua
permissions { "players.ragdoll", "player.ragdoll" }
client_script "client.lua"
server_script "server.lua"
```

```lua
-- client.lua
CreateThread(function()
    if type(Open77.ragdoll) ~= "table" then return end
    for _ = 1, 20 do
        local ok, reason = Open77.ragdoll.define([[
[BlendPose:TaserSpasm]
File = BlendPose_deathspasm1.txt
BlendPoseStrengthMult = 6
BlendPoseDuration = 1.2
Flail = 14, 9
KeepRagdollAwake = 1
]])
        if ok or reason ~= "ragdoll_active" then break end
        Wait(500)
    end
end)
```

```lua
-- server.lua
RegisterNetEvent("taser:hit", function(target)
    Open77.ragdoll.start(target, { profile = "taserspasm", impulse = { x = 0, y = 0, z = 1 }, durationMs = 2500 })
end)
```

A client that has not defined the node yet plays `stumble` for that lease.

## Interplay

- **Forced motion.** A ragdoll lease and a forced motion (`Open77.motion.knockdown`, `Open77.players.ragdoll`) exclude each other with `motion_busy`, both ways. [`Open77.players.ragdoll`](player-freeze.md#putting-a-player-down-and-clearing-everything-ragdoll-and-cleartasks) remains the engine's own short knockdown, under `players.motion.control`.
- **Abilities.** While a lease exists, Dash, Ground Slam, Reflex, leg jumps, hacking uploads and player attachments treat the body as moving under a forced motion. A starting ragdoll interrupts Dash, Ground Slam and hacking with `forced_motion`.
- **Death.** A player who dies loses the lease (`death`); the death keeps its own ragdoll, shown by `open77_ragdoll`.
- **Movement.** While the body is down the player's capsule follows it in steps of at most 1.5 m, and the player stands up where the body ended.

## Limits

- **Motion envelope.** While a lease exists, the server accepts the owner's movement up to 40 m/s horizontally, and a horizontal travel of at most 40 m/s × elapsed time + 1.5 m between checks. Faster movement rejects the snapshot and ends the lease with `motion_speed_exceeded` (or `motion_sample_invalid`). Vertical motion is not bounded: falls are free.
- **Pushes.** ±30 m/s per component from the server, ±60 m/s on the client API; 20 server impulses per second per player.
- **Duration.** At most 30 seconds per lease; `0` holds the body down until `stop`.
- **Vehicles.** A player in a vehicle cannot be leased (`body_unavailable`), and entering one ends a lease.
- **Bodies.** Only bodies with the human ragdoll rig (22 bodies). A body that loses a limb is released to the plain ragdoll.
- **Game build.** The engine side checks the game executable and its physics library and stays off on anything else. It also stays off when the Ragdoll Physics Overhaul mod is installed on the client. `Open77.ragdoll.available()` then answers `false`, leases are refused on that client (`refused`), and nothing else in OPEN//77 depends on it.
