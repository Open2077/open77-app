# Role-play animations

Play named role-play profiles such as `smoke`, `phone` and `dance` through server-authoritative animation requests. Profiles bind compatible workspots, clips and rig assets.

Requires matching client, server and RP archive support for the selected profile. Clip and prop compatibility can vary by body and appearance. Repeated reconnects can leave stale presentation objects or a camera hold; handle lifecycle failures. Furniture is not spawned automatically.

Use a named profile such as `smoke`, `phone` or `dance`. Each profile binds an
authored workspot and an explicit set of compatible clip names. Arbitrary animation
names from the general game inventory are not accepted by this system.

See the [profile and clip catalogue](rp-animation-catalogue.md) for 76 profiles and 456 selectable clips. The `chair`, `lean` and `lie` profiles support anchored placement; see [Portable workspots](#portable-workspots-sit-lean-and-lie-anywhere). Male and female bindings are included, but not every clip is compatible with every body or proxy graph.

## How it works

1. **Choose a profile.** A resource or the Freeroam `/anim` menu selects an allowed
   profile and, optionally, one of its exact clip variants. A client requests an
   action for itself; a server resource can start one for a player it controls.
2. **The server owns the action.** It validates the player, resource ownership,
   options and duration, assigns a `playbackId`, and distributes state within the
   routing bucket. Store this ID when a delayed callback will stop the action.
3. **Clients present the accepted state.** The local player temporarily uses the
   F7 third-person body; replicated bodies receive the same selected profile and
   step. Native mounting and profile changes are asynchronous. A native failure
   is reported separately from the accepted server request.

An animation is not a locomotion controller. These profiles are stationary:
walking, entering a vehicle, death and other interruptions cancel playback.
They do not replace walking, climbing or combat animations, and arbitrary names
from the game's animation inventory are not supported RP profiles.

| Task | Client resource | Server resource |
| --- | --- | --- |
| Find profiles | `list(query?)`, `get(profileId)` via a Promise | `list(query?)`, `get(profileId)` synchronously |
| Start an action | `request(profileId, options?)` for yourself | `play(playerId, profileId, options?)` |
| Chain actions | `sequence(steps, options?)` | `sequence(playerId, steps, options?)` |
| Stop | `cancel(playbackId?)` for yourself | `stop(playerId, playbackId?)` for this resource's action |
| Place an action at a pose | -- | `playAt(playerId, profileId, position, yaw?, options?)`, torn down by `stopAt(playbackId)` |
| Observe state | `state(playerId?)` via a Promise | `current(playerId)` synchronously |

All methods above belong to `Open77.animations`. The older client
`play(entity, rawClip)`, `playSelf`, `stop`, `stopSelf` and `current` are **local
presentation APIs**, not the synchronized RP API. They must not be confused with
server methods that have the same names.

## Installation and player commands

Run the `open77_animations` resource on the server so every joining client receives
its presentation service and catalogue. It is auto-started when discovered and is
included in the Freeroam template. Other server templates can include the same
resource without depending on Freeroam. The client needs an Open77 build containing
the RP API and **Open77RP.archive**, alongside the matching base and mirror
archives; copying Lua alone does not add native playback support. See the
[content build guide](../scripts/animations/README.md).

If an existing server profile uses an explicit `resources.load` list, add
`"open77_animations"` to that list as well. `auto_start` does not override a
resource-selection filter, and changing the Freeroam template does not update
previously created server profiles. Keep the profile's other resources enabled.

With the official chat package, players can use:

```text
/anim
/anim list
/anim smoke
/anim info smoke
/anim smoke 2
/anim stop
```

`info` lists the exact clips and their 1-based variant numbers. Omitting a variant
uses the profile's default, which need not be its first alphabetically sorted clip.
Commands always target the authenticated caller, not a player ID in the arguments.
`/anim` (or `/anim menu`) opens Freeroam's compact **Animations** library. It shares
the existing WebUI surface but has its own layout: 76 families, 456 variants and
11 categories. Search by label, exact clip or common RP terms; save exact variants
as favourites, revisit successfully started actions in Recent, or enable All
variants. The browser renders at most 60 cards per page. Select a family and use
the variant arrows, then **Play**, or double-click a card. Looping and timed
5/10/30-second playback are available. The menu releases
input before the temporary TPP starts. **Stop** or `/anim stop` cancels the caller's
action, including an in-flight UI request; moving also interrupts playback.
Experimental variants may have body-specific presentation differences.
Start/menu/list/info commands are limited to one every 500 ms per player.

Other gamemodes can provide their own menu by receiving the server-sourced
`open77_animations:menu` event. The platform resource does not depend on Freeroam.
Without a menu provider, use the explicit text commands above. UI command events
must not use `open77:animations:*`, which is reserved for authoritative protocol
messages and rejected by `TriggerClientEvent`.

## Quick start: your first client action

After enabling `open77_animations` on the server, create a resource such as
`my_emotes` with these two files. Add your resource to the server's selected
resources too; keep the existing gamemode, wardrobe and other entries intact.

`open77.lua`:

```lua
resource 'my_emotes'
version '1.0.0'
dependency 'open77_animations >=1.0.0'
client_script 'client.lua'
permissions { 'input.actions' }
```

`client.lua`. A client resource may `RegisterCommand` of its own — see the
[FiveM compatibility page](fivem-compatibility.md) — but for an emote a key is the better trigger,
which is what `input.actions` is for:

```lua
RegisterKeyMapping('my_smoke', 'Smoke', 'K', function()
    CreateThread(function()
        local pending, dispatchError = Open77.animations.request('smoke', {
            loop = false,
            durationMs = 15000,
        })
        if not pending then print(dispatchError); return end
        local playback, rejected = pending:await()
        if not playback then print(rejected); return end
        print('Server accepted action: ' .. playback.playbackId)
    end)
end)
```

Join the world, stand still on foot, then press `K`. The request schedules
15 seconds of smoking; no manual F7 toggle is needed. Use `/anim stop` or move to
cancel earlier. If using your own WebUI, release its input focus before requesting
playback, as the Freeroam **Play & Close** button does. A message saying the server
accepted the action is not a guarantee that native rendering succeeded.

For an NPC interaction or other server-owned activity, use the server `play`
example below and declare `players.animations.control` in that resource. Do not
call the client Promise signature from a server script.

## Client Lua API

Declare `dependency 'open77_animations'` in your client resource manifest. These
methods are asynchronous facades over that resource's exports, not server Lua
methods. They work in the same downloaded resource host as the service. A local
bootstrap resource in a separate host cannot call across that boundary.

| Method | Promise result |
| --- | --- |
| `list(query?)` | Matching profile definitions, copied for the caller |
| `get(profileId)` | Profile definition, or nil if absent |
| `request(profileId, options?)` | Server-accepted playback state for the local player |
| `sequence(steps, options?)` | Server-accepted sequence for the local player |
| `cancel(playbackId?)` | `true` when local cancellation was queued |
| `state(playerId?)` | Last active canonical state; defaults to the local player |

Call from a managed coroutine or event handler. There are two possible error
stages: dispatch can return `nil, reason` instead of a Promise; `:await()` can return
`nil, reason` from a rejected request or stopped resource.

```lua
CreateThread(function()
    local pending, err = Open77.animations.request('smoke', {
        durationMs = 15000, loop = false,
    })
    if not pending then print(err); return end
    local playback, rejected = pending:await()
    if not playback then print(rejected); return end
    print('Accepted RP action: ' .. playback.playbackId)

    Wait(4000)
    local stop, dispatchError = Open77.animations.cancel(playback.playbackId)
    if not stop then print(dispatchError); return end
    local cancelled, cancelError = stop:await()
    if not cancelled then print(cancelError) end
end)
```

`request` shares server `play` options. `sequence` shares server sequence options
below. Client calls cannot select another player. The facade does not require a
presentation capability in the caller: only `open77_animations` uses the internal
`animations.presentation` bindings. Do not call underscore-prefixed methods yourself.

Accepted means **the server accepted the action**, not that a native device is
already mounted. `cancel` stops local presentation immediately and sends a reliable
request for that playback ID; `onPlayerAnimationChanged` reports the authoritative
stop. Omitting the ID also abandons pending requests. Each client start carries a
correlation ID in its authoritative state: an abandoned local action is suppressed
even if the state broadcast or a snapshot arrives **before** the request response.
Its exact playback ID is sent back for cancellation. Other players and unrelated
server-started actions are not suppressed by that pending request.

A late acceptance is cancelled even if its original caller timed out or its
resource generation stopped. The 10-second timeout is enforced by the service,
including when the caller has not resumed its Promise. At most 32 unanswered start
requests are retained. These pre-response safeguards require the matching updated
server and client resource; legacy states without a correlation ID can only be
associated with a pending request when its response arrives.

```lua
AddEventHandler('onPlayerAnimationChanged', function(playerId, state)
    -- On the client, state is a Lua table, not the server event's JSON string.
    print(playerId, state.active, state.reason)
end)
AddEventHandler('onAnimationPlaybackFailed', function(playerId, playbackId, reason)
    print('Native animation could not continue:', playerId, playbackId, reason)
end)
```

`onAnimationResult(requestId, ok, error, value)` additionally reports receipt of a
start/sequence response. Prefer the Promise for associating your own request with
its result. These local notification events are observations, not authority for
granting server rewards or inventory items.

Late join and stream-in retain the server-selected profile, current step and
playback ID. A recreated remote body receives the current action, not an old
incarnation's handles. Snapshots replace visibility atomically after all pages
arrive and never cross routing buckets. They are bounded by both the network's
48 KiB envelope and the client's 1,024-value JSON decoder. A maximum-size roster
of 1,024 players with 16-step sequences fits within the 128-page assembly limit.
Canonical state is committed atomically; snapshot change notifications drain in
batches of 32 on subsequent service ticks. A newer live event supersedes a queued
notification for that player. `state()` can therefore see the committed snapshot
before every corresponding notification has been delivered.

## Server Lua API

`Open77.animations` is provided by the server runtime. No resource export or
`open77_animations` dependency is needed for the server methods below.

Add the permissions your resource actually needs to its `open77.lua`:

```lua
permissions {
    'players.animations.control',
    'players.animations.read',
}
```

| Method | Result | Permission |
| --- | --- | --- |
| `list(query?)` | Array of matching profile definitions | None |
| `get(profileId)` | Profile definition, or nil when absent | None |
| `play(playerId, profileId, options?)` | Accepted playback state | `players.animations.control` |
| `sequence(playerId, steps, options?)` | Accepted playback state | `players.animations.control` |
| `stop(playerId, playbackId?)` | `true`, including when already stopped | `players.animations.control` |
| `playAt(playerId, profileId, position, yaw?, options?)` | Accepted playback state with an `anchor` | `players.animations.control` |
| `stopAt(playbackId)` | `true`, including when the handle no longer names a running action | `players.animations.control` |
| `current(playerId)` | Playback state, or nil when inactive | `players.animations.read` |

Failures return `nil, error`. Successful lookup of a missing profile or inactive
player returns nil without an error. IDs are case-sensitive. Search is a
case-insensitive substring match across ID, label and category; its maximum length
is 128 characters. A search can match several profiles.

```lua
local profile = Open77.animations.get('smoke')
local matches = Open77.animations.list('social')

local playback, err = Open77.animations.play(playerId, 'smoke', {
    loop = false,
    durationMs = 15000,
})
if not playback then
    print('Cannot start animation: ' .. tostring(err))
    return
end

-- Keep this ID if a timer or later callback will stop this particular action.
local playbackId = playback.playbackId
local stopped, stopError = Open77.animations.stop(playerId, playbackId)
```

### Duration, clips and sequences

`play` options are `clip`, `durationMs` and `loop` only. Omit `clip` to select the
profile default. A variant must belong to that exact profile. Unknown options,
non-integer durations and cross-profile clips are rejected, not silently corrected.

`loop` defaults to true. With that default, omitted or zero `durationMs` keeps the
server action active until cancellation. With `loop = false`, the default duration
is 5,000 ms. A nonzero duration must be between 1,000 and 600,000 ms.

These are **server scheduling durations**, not measured native clip lengths. Native
frame-accurate seeking/repetition is not yet verified. Do not derive a clip's
length from the server's default duration.

```lua
local playback, err = Open77.animations.sequence(playerId, {
    { profile = 'handsup', durationMs = 4000 },
    { profile = 'clap', durationMs = 6000 },
    { profile = 'think', durationMs = 8000 },
}, { loop = false })
```

A sequence contains 1–16 steps. Each step accepts `profile`, `clip` and
`durationMs`; its duration defaults to 5,000 ms and must be nonzero. The sum cannot
exceed 600,000 ms. The only sequence option is `loop`, default false. Different
profiles may appear in one sequence; native profile changes require asynchronous
workspot exit/re-entry and are not promised to be seamless blends.

### Addressing a clip by name (`TaskPlayAnim`'s shape)

Every other engine names an animation directly — FiveM's
`TaskPlayAnim(dict, name, ...)` — and a caller that knows the clip should not have to
know which action happens to carry it. `playClip` is that shape:

```lua
-- Server. Same permission, readiness, ownership and duration rules as play().
local playback, err = Open77.animations.playClip(
    playerId, 'stand__dance__02__dancing__03', { durationMs = 15000, loop = false })
```

```lua
-- Client, for the local player.
local playback, err = Open77.animations.requestClip(
    'stand__dance__02__dancing__03', { loop = true }):await()
```

Discovery is `clips` and `clip`, on both runtimes and with no capability required:

```lua
for _, row in ipairs(Open77.animations.clips('dance') or {}) do
    print(row.profile, row.clip)          -- dance  stand__dance__02__dancing__03
end
print(Open77.animations.clip('stand__dance__02__dancing__03').id)   -- dance
```

The clip is resolved to its owning profile from the same generated catalogue on
both halves, so `playClip(id, clip, opts)` and `play(id, profile, { clip = clip })`
start the identical action and produce the identical playback state. Nothing new
goes on the wire.

#### What "raw playback" can and cannot mean here

**Cyberpunk has no play-a-clip-by-name native.** A body plays an authored clip only
after it is mounted into a *device* — an entity carrying a
`workWorkspotResourceComponent` — and `SendJumpToAnimEnt` then jumps it to a node
**inside that device's workspot tree**. The device and its tree are bound together
when the archive is built, not at runtime.

So the addressable set is the **456 clips of the 76 catalogue devices**, and
`Open77.animations.clips()` is the whole of it. Two consequences worth stating
plainly, because both have cost time before:

- [`docs/data/emote-animations.txt`](../docs/data/emote-animations.txt) lists 23,044
  clip names and
  [`docs/data/rp-workspots.json`](../docs/data/rp-workspots.json) 4,510 more across
  494 vanilla workspots. Both are **discovery inventories, not allowlists**. A name
  from either that no shipped device carries is refused with `unknown_clip`.
- The legacy client-local `Open77.animations.play(entity, clip)` looks like it takes
  any name. It does not: it mounts the body into the single generic device
  `cyberm\entities\workspot_anim.ent`, which binds exactly one vanilla workspot
  (`base\workspots\common\ground\generic__stand_cigar__stand_around__01.workspot`),
  so only that tree's nodes resolve. Anything else is a silent no-op.

Adding a clip means adding a **device**: a new entry in
`scripts/animations/rp-profiles.json`, a regenerated workspot and `.ent` from
`scripts/animations/build-devices.ps1`, and a repacked `Open77.archive`. See
[`scripts/animations/README.md`](../scripts/animations/README.md).

#### Flags that do not exist

FiveM's `TaskPlayAnim` flags have no workspot equivalent, and the service refuses
them **by name** rather than with a blanket `invalid_options`, so a port can see
which concept is missing instead of assuming a bad value:

| Passed option | Reason returned | Why |
| --- | --- | --- |
| `upperBody` | `unsupported_option:upperBody` | A workspot takes the whole body. There is no bone mask on this path. |
| `blendIn`, `blendOut`, `blendMs` | `unsupported_option:blendIn` … | The engine *jumps* a mounted body to an authored node; it does not blend a clip in over milliseconds. |
| `holdLastFrame` | `unsupported_option:holdLastFrame` | Not measured on 2.31. Unverified behaviour is not an API. |
| `flags`, `dict`, `playbackRate` | `unsupported_option:<key>` | No equivalent concept. |

What *is* supported is `loop` and `durationMs`, described above, plus `clip` on
`play` and on a sequence step.

#### Scenarios: what `playAt` covers and what it does not

`TaskStartScenarioInPlace` on a *world* chair is still not offered, and the reason has
not changed: Cyberpunk's scenario equivalent is a workspot, a workspot is only playable
through a device bound to it at asset-build time, and nothing on 2.31 enumerates
workspot-bearing world entities near a point -- the same wall that stopped the cover
commands in an earlier wave. Mounting a player into the bench they are standing next
to would need that bench's device handle, and there is no way to ask for it.

What *is* shipped is the other half of that native, `TaskStartScenarioAtPosition`:
Open77 brings its **own** device to the pose. See the next section.

### Portable workspots: sit, lean and lie anywhere

Three profiles exist for one reason: the pose they carry is authored against a piece
of furniture that will not be there. Each ships its own device and derived workspot in
`Open77RP.archive`, like every other profile, and each is invisible -- the device is
the chair, and it renders nothing.

| Profile | Vanilla source | Body pose |
| --- | --- | --- |
| `chair` | `chair\generic__sit_chair_lean_back__sit_around__01.workspot` | seated at chair height, leaning back, hands on lap; 37 clips |
| `lean` | `wall\generic__stand_wall_lean_back__stand_around__01.workspot` | standing, back against a wall, arms crossed; 4 clips |
| `lie` | `bed\generic__lie_double_bed__lie_around__01.workspot` | lying on the back at mattress height; 2 clips |

They are ordinary profiles: `play(playerId, 'chair')` sits the player down exactly
where they stand, on nothing. What makes them *portable* is `playAt`, which moves the
body to a pose the server chooses, spawns the device there and plays the posture on
it -- the body arrives first, the chair appears under it, then it sits:

```lua
-- open77.lua: permissions { 'players.animations.control' }
-- A chair prop spawned with Open77.props has no workspot of its own. Put the
-- posture on its seat, facing the way the chair faces.
local chairPos, chairYaw = { x = -1441.2, y = 129.6, z = 18.05 }, 90.0
local placed, err = Open77.animations.playAt(playerId, 'chair', chairPos, chairYaw, {
    durationMs = 30000, loop = false,
})
if not placed then print('cannot seat: ' .. tostring(err)); return end
seated[playerId] = placed.playbackId      -- the handle stopAt() takes

-- Later, whoever sat them down:
Open77.animations.stopAt(seated[playerId])
```

`position` is `{ x, y, z }` (or a three-element array); `yaw` is degrees about Z, the
same convention as `Open77.props.create`, and defaults to 0. `options` are exactly
those of `play`: `clip`, `durationMs`, `loop`. The accepted state carries an `anchor =
{ x, y, z, yaw }` field, and its `playbackId` is the handle.

Any catalogue profile accepts a pose, not only the three above: `playAt(id, 'smoke',
barCounter, yaw)` walks a smoker to the counter.

**Limits, stated plainly:**

- **Reach is bounded at 5 m** from the player's current position, refused with
  `anchor_too_far`. A placement moves the body, and past furniture-distance that is
  a teleport dressed as an animation, reachable with the animation permission alone.
  Journeys belong to [`Open77.players.teleport`](server-api.md#moving-a-player), which
  costs `players.teleport` and settles the body; call it first, then `playAt`.
- **Placement is server-controlled.** `playAt` moves the player to the anchor without a fade, using its yaw and the normal readiness/settle checks. The posture is published to clients and its duration starts only after arrival. `onPlayerAnimationChanged` reports acceptance before arrival; this is not a rendering acknowledgement.
- **The move watchdog is measured against the anchor**, not the starting point, and it
  is armed five seconds after acceptance. A body that never reaches its anchor in
  that window ends with reason `anchor_unreached` (the placement channel refused or
  the client never landed); one that arrived and then left ends with `moved`, as
  before. A placement the channel cannot even dispatch is refused at once with
  `anchor_move_refused` (the body is not ready, not alive, or in a vehicle).
- **The pose is the caller's problem.** `z` is where the *device* goes, and the
  authored clip plays relative to it: for `chair` that is the floor under the seat,
  for `lie` the floor under the bed. Put a `chair` at seat height and the body floats.
- **Nothing is enumerated.** `playAt` does not find chairs; it accepts a pose the
  server already knows -- a prop it spawned, a point from its own furniture table.
- **Acceptance is server authority, not proof.** The client still mounts the anchored
  device with `gameWorkspotSlidingBehaviour.PlayAtResourcePosition` (runtime-tunable:
  `emote.tune anchorslide 0|1|2`, `emote.tune anchorslidetime <seconds>`), but with the
  body already on the anchor the slide is zero either way. Observe
  `onPlayerAnimationChanged` and the `anchor_unreached` reason, not the return value.
- `stopAt` on a handle whose action already ended succeeds, exactly as `stop` on an
  idle player does; another resource's handle is refused with `animation_owned`.
  Resource stop, restart and disposal tear placed actions down like every other.

### Playback state

Accepted playback and `current` expose these fields:

| Field | Meaning |
| --- | --- |
| `epoch` | Server animation-service generation |
| `revision` | Monotonically increasing state revision within that epoch |
| `playerId`, `playbackId` | Player and this specific accepted action |
| `clientRequestId` | Internal client-start correlation; empty for server API/command actions. Not an ownership token or a value to pass to `cancel` |
| `active`, `reason` | Whether active and the transition/cancellation reason |
| `bucket` | Routing bucket in which this action began |
| `steps`, `loop` | Validated profile/clip/duration sequence and repeat flag |
| `startedAtMs`, `serverTimeMs` | Server monotonic timestamps, not wall-clock dates |
| `cycle`, `step` | Zero-based current repetition and step |
| `elapsedMs`, `remainingMs` | Timing within the current step; indefinite playback has no finite completion |

### Ownership, cancellation and events

A resource controls only the actions started by its own VM generation. A new
action from that owner replaces its old action with a new playback ID. Another
resource cannot replace or stop it. Resource stop/restart/disposal cancels its
actions; a replacement VM does not inherit the old owner's lease.

Pass `playbackId` to delayed stops. A stop for an older action returns
`stale_playback` and leaves the replacement running. Omitting it stops the current
action owned by the calling resource. The player's self-cancellation network path
is allowed to stop their own server-controlled animation.

The server cancels on disconnect, loss of readiness, death, vehicle occupancy, routing-bucket changes, movement beyond 0.5 m from the start and completion of a non-looping sequence. The client reports native playback failures and interruptions through self-cancellation. Native interruption handling remains experimental.

```lua
AddEventHandler('onPlayerAnimationChanged', function(playerId, stateJson)
    local state = json.decode(stateJson)
    if not state.active then
        print(('Player %s stopped: %s'):format(playerId, state.reason))
    end
end)
```

The event currently passes a player ID string and a JSON state string. State
messages are restricted to players in the same routing bucket. The reserved
`open77:animations:` event namespace belongs to the platform; resources must use
the API, not forge authoritative events with `TriggerClientEvent`.

Common errors include `unknown_profile`, `invalid_clip`, `invalid_options`,
`invalid_duration`, `invalid_sequence`, `invalid_step`, `sequence_too_long`,
`player_unavailable`, `player_not_ready`, `player_not_alive`, `player_in_vehicle`,
`position_unavailable`, `animation_owned`, `stale_playback`, `resource_stopping`
and `permission_denied:<capability>`. `playAt` adds `invalid_anchor` and
`anchor_too_far`; `stopAt` adds `invalid_playback`. A placed action can also end
with reason `anchor_unreached`.

Client-side errors also include `export_resource_unavailable`, `player_not_ready`,
`network_unavailable`, `too_many_requests`, `request_timeout`, `cancelled`,
`session_changed`, `invalid_response`, and `resource_stopped`. Internal native
failures are reported separately through `onAnimationPlaybackFailed`.

## Local view and development diagnostics

The curated native local path requests third person temporarily and reuses the F7
presentation body. It waits for that body to be active before starting the workspot;
its walking, aiming and combat presentation stand down while the workspot owns it.
Stopping releases the temporary animation-camera priority immediately. Returning
to first person restores the real player before hiding the animation proxy; an
existing F7 or resource-owned third-person request is preserved. Native workspot
detachment and safe device cleanup continue independently in the background.
An already-playing local RP pose uses the native instant exit when cancelled;
F7 locomotion resumes after confirmed detachment, without waiting for the separate
callback-lifetime quarantine. This avoids leaving the visible body behind when
the player starts moving. Pending mounts retain conservative cleanup.
The player's stored first/third-person preference is not overwritten. Native safety
states still take priority, and a forced-first-person server policy is refused.

Developer bridge commands, for local rendering experiments only:

```text
emote.profile player smoke
emote.state player
emote.stop player
```

These commands do not broadcast RP state. Existing client
`Open77.animations.play(entity, rawClip)` and `playSelf` remain legacy local APIs,
not the synchronized request API. Do not use them to implement RP replication.

Native local failures retain their `status` and diagnostic `detail` in
`emote.state player` after the temporary view has been released, until a new
profile request or world exit. This history does not mean the body is still
playing or mounted. Details distinguish proxy readiness, player movement/stance,
camera policy and workspot playback failures. The native log records the same
failure once; the downloaded resource also logs `RP playback failed` when it
emits `onAnimationPlaybackFailed`. Observe the downloaded resource's events in
its resource host, not a separate bootstrap host.
