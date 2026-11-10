# Voice audio graph

The audio graph places sound in the world from the server: loudspeakers that play a player's voice
or a music file, microphones that pick up what is said near them, and direct listeners that hear a
source wherever they are. Connections wire inputs to outputs, and every node can carry its own
[effects](voice-effects.md). Playback of music is authoritative: every player hears the same track
at the same position, late joiners included.

Requirements: client and server **2.50.0-unstable+op77.211** or later (protocol 1.52), and the
server permission `voice.manage`. Everything is under `Open77.voice` on the server.

## Building blocks

| Node | Created with | Is |
|---|---|---|
| player input | `player(playerId)` | a connected player's microphone |
| channel input | `channel(channelId)` or a channel table | everything spoken on a channel this resource owns |
| broadcaster | `createBroadcaster(asset, options)` | a WAV/MP3 file of the resource, with a shared playback cursor |
| pickup | `createListener({ anchor = ..., range = ... })` | a microphone in the world: hears voices and broadcasts within `range` |
| speaker | `createSpeaker({ anchor = ..., distance = ... })` | a loudspeaker in the world, heard with walls, rooms and distance |
| direct listener | `createListener({ player = id })` | one player hears its inputs directly, wherever they are |
| connection | `connect(from, to, options)` | routes an input (player, channel, broadcaster, pickup) to an output (speaker, direct listener) |

A new node is silent until it is connected. Speaker output cannot become another input: there is no
feedback loop.

```text
 player(12) ──┐                      ┌──► speaker (club PA) ──► everyone nearby
 broadcaster ─┼── connect(...) ──────┤
 pickup ──────┘                      └──► direct listener (player 7)
```

## Handles

Constructors return snapshot tables with `kind` and `id` (`{ kind = "speaker", id = 4, ... }`).
Pass these tables back as handles. Changing a table does not change the server: use `update`.
Constructors, `update`, `get` and playback calls return `state, reason?`; failures return
`nil, reason`; `destroy`, `disconnect` and `removePreset` return `ok, reason?`.

| Call | |
|---|---|
| `createSpeaker(options)` | `anchor` (required), `distance = 30`, `minDistance = 1`, `gain = 1`, `enabled = true` |
| `createListener(options)` | `player` **or** `anchor`; `range = 15`, `gain = 1`, `enabled = true`, `voices = true`, `broadcasts = true` |
| `createBroadcaster(asset, options)` | `duration`, `loop = false`, `paused = false`, `offset = 0`, `gain = 1`, `enabled = true`, optional `anchor`, `range = 30` |
| `connect(from, to, options)` | `gain = 1`, `enabled = true`, `exclusive = false`, `crossBucket = false`, `intent = "connections"` |
| `get(handle)`, `update(handle, patch)` | read, or atomically change, a node or connection; unknown fields are rejected |
| `attach(handle, anchor?)` | move a node to another anchor; without one, detaches a broadcaster |
| `speakers()`, `listeners()`, `broadcasters()`, `connections()` | this resource's nodes |
| `destroy(handle)`, `disconnect(connection)` | remove a node (and its connections) or one connection (a numeric id works too) |

A listener's role (pickup or direct) cannot change after creation. Calling `connect` again with the
same endpoints fails with `voice_connection_exists`: change the existing connection with `update`
(find it with `connections()`).

## Anchors

```lua
{ kind = "world", x = -1450, y = 1060, z = 16, bucket = 0 }          -- a fixed point
{ kind = "player",  id = playerId,  x = 0, y = 0, z = 1.6 }          -- follows a player
{ kind = "vehicle", id = vehicleId, x = 0, y = 2, z = 1 }            -- follows a vehicle
{ kind = "npc",     id = npcId,     x = 0, y = 0, z = 1.7 }          -- follows an NPC
```

`{ x, y, z, bucket }` without `kind` is a world point. Offsets on attachments use **world axes**,
not the entity's facing. The entity supplies the routing bucket and must exist when the node is
created or re-attached (`voice_anchor_target_not_found` otherwise); when it is removed, its nodes
are removed too. Distances are metres (greater than 0, at most 1,000); `minDistance` must be smaller
than `distance`; gains are linear, 0 to 4.

## Connection options

| Option | |
|---|---|
| `intent` | for a player input: `"connections"` (the player transmits to its connections), `"proximity"` (whenever it talks in proximity), or `"any"` (either) |
| `exclusive` | suppress ordinary proximity between that source and the connection's audience, so they do not hear the player twice |
| `crossBucket` | allow an input from another routing bucket (phones across instances); a speaker's audience still has to share its bucket |
| `gain`, `enabled` | level and on/off |

`any` never fires for speech sent only to a channel: channel speech reaches the graph only through
a `channel(id)` input, which requires owning that channel. `proximity`, `any` and pickups stop when
the server disables the player's proximity. Pickups need the speaker within `range` and transmitting
in proximity.

## Music and sound files

```lua
-- open77.lua
permission "voice.manage"
files { "audio/club.wav", "audio/anthem.mp3" }
```

```lua
local v = Open77.voice
local music = assert(v.createBroadcaster("audio/club.wav", { loop = true, gain = 0.6 }))   -- WAV: duration read from the file
local anthem = assert(v.createBroadcaster("audio/anthem.mp3", { duration = 187.4, paused = true }))

assert(v.play(anthem))
assert(v.seek(anthem, 30))      -- seconds
assert(v.pause(anthem))
assert(v.stop(anthem))          -- rewinds
assert(v.setLoop(anthem, true))
assert(v.replaceAsset(music, "audio/anthem.mp3", { duration = 187.4, loop = false }))  -- keeps id, connections and effects
```

- Paths must be declared in `files`, use `/`, and end in `.wav` or `.mp3`.
- WAV duration is read from the file; a supplied `duration` that differs by more than
  max(50 ms, 1 %) fails with `voice_duration_mismatch:<seconds>`. **MP3 duration is required** and
  trusted: supply the real length.
- Limits: 16 MiB encoded and 128 MiB decoded per track, 600 seconds, 256 MiB of distinct active PCM
  per client (`audio_memory_quota`). A ten-minute 192 kbit/s MP3 fits.
- Playback commands are stamped with the server clock; clients extrapolate the cursor, so everyone
  hears the same moment. Outputs that share an unchanged asset share its PCM.
- Use playback calls for the track, loop, pause and cursor; `update` on a broadcaster only accepts
  `gain`, `enabled`, `anchor` and `range`. Playback calls also accept numeric broadcaster ids.

A broadcaster is heard only through its connections. Giving it an `anchor` places it in the world
for **pickups**: a pickup with `broadcasts = true` captures it when it is within both the pickup's
`range` and the broadcaster's `range` (a radio playing in a room that a bug can hear).

## Examples

**A club loudspeaker playing music:**

```lua
local v = Open77.voice
local speaker = assert(v.createSpeaker({ anchor = { x = -1450, y = 1060, z = 16, bucket = 0 },
                                         distance = 35, minDistance = 2 }))
local music = assert(v.createBroadcaster("audio/club.wav", { loop = true, gain = 0.6 }))
assert(v.connect(music, speaker))
assert(v.setPreset(speaker, "megaphone"))
```

**A DJ on the PA**, heard through the speakers instead of in proximity:

```lua
local mic = assert(v.connect(v.player(djId), speaker, { intent = "proximity", exclusive = true }))
-- later
v.update(mic, { enabled = false })
```

**A bug in a room**, heard by one player anywhere:

```lua
local bug = assert(v.createListener({ anchor = { x = 120, y = -340, z = 8, bucket = 0 }, range = 6 }))
local earpiece = assert(v.createListener({ player = spyId }))
assert(v.connect(bug, earpiece))
assert(v.setPreset(earpiece, "lofi"))
```

**A one-way call** (create the reverse connection for a two-way call):

```lua
local ear = assert(v.createListener({ player = calleeId }))
local call = assert(v.connect(v.player(callerId), ear, { intent = "connections", crossBucket = true }))
assert(v.setPreset(call, "phone"))
```

**A car radio** following a vehicle:

```lua
local carSpeaker = assert(v.createSpeaker({ anchor = { kind = "vehicle", id = vehicleId, z = 1 }, distance = 12 }))
local station = assert(v.createBroadcaster("audio/radio_vibe.mp3", { duration = 241, loop = true, gain = 0.8 }))
assert(v.connect(station, carSpeaker))
```

[Voice recipes](voice-recipes.md) has complete resources built on these patterns.

## Acoustics of the graph

Processing order: source effects, then the source-to-microphone path when a pickup is involved
(walls and room reflections of the pickup's room), then pickup/channel, connection and output
effects, then the speaker-to-listener path. A pickup records mono, without the listener's
directional head filtering.

All spatial outputs (speakers, spatial channels, ordinary proximity, local spatial sources) need a
recent observed path between the two points. Without one, the route is silent until it can be
observed again; it never falls back to a clear path. A microphone in an unloaded district, or with
no surface within the room probe's 24 m, can therefore stay silent. Non-spatial routes (radio,
phone, direct listeners) do not depend on the world.

## Events

The server tells the owning resource when it removes one of its nodes or connections by itself
(never for the resource's own `destroy`, `disconnect` or stop):

```lua
Open77.events.on("open77:voice:nodeRemoved", function(handle, reason)
    -- handle = { kind = "speaker" | "listener" | "broadcaster" | "connection", id = ... }
    -- reason: player_left, vehicle_removed, npc_removed, channel_removed, endpoint_removed,
    --         anchor_removed, node_quota, connection_quota
    print(("voice %s %d removed: %s"):format(handle.kind, handle.id, reason))
end)
```

## Limits

| | Limit |
|---|---|
| nodes per resource | 64 |
| connections per resource | 128 |
| custom presets per resource | 64 |
| effect targets per resource | 256, each with up to 128 listener overrides |
| graph sources per listener | 64, with 32 slots reserved for players and 32 for broadcasters (unused slots are shared); players talking now come first |
| graph routes per listener | 64 total, 16 per source |
| reliable graph updates per listener | 24 KiB/s, 96 KiB burst (removals are never deferred) |
| per client | 128 audio routes, 32 MiB of DSP reservations, 512 processing work units; local sources may use half |

A player's graph routes are sent to listeners only while that player is talking or spoke in the
last 30 seconds. Moving attachments are re-sent after moving more than 1 metre. A route that does
not fit the client budget is silent until a later update fits; `voice.status` shows reservations
and rejections.

## Lifecycle

Nodes, connections, custom presets and effect claims are removed when their resource stops. A
successful reload replaces them. A failed reload restores the previous graph, presets, memberships
and playback cursor, without exceeding the global limits; anything dropped is reported with
`open77:voice:nodeRemoved`. Stop handlers can release and undo, but claims (`createSpeaker`,
`createListener`, `createBroadcaster`, `connect`, `createPreset`, `setPreset`, `setEffects`,
`clearEffects`) return `resource_stopping`.

A resource with `voice.manage` is trusted server code: it may route any connected player and cross
buckets deliberately. Resources stay isolated from each other: each edits only its own channels,
nodes, connections, presets and effect claims.
