# Role-play animations

> Available with client **2.31.13+op77.45** and the matching RP-enabled server
> runtime. The default `smoke` clip, cigarette, menu, timed stop and temporary
> third-person view were checked on the local male body. Other variants, female
> playback and two-client visual acceptance remain experimental. Server acceptance
> does not prove a client rendered a clip. Repeated disconnect/reconnect cycles
> can still leave a stale proxy/device and camera hold; reconnect lifecycle recovery
> is a known limitation, not a fixed issue in this release.

Use a named profile such as `smoke`, `phone` or `dance`. Each profile binds an
authored workspot and an explicit set of compatible clip names. Arbitrary animation
names from the general game inventory are not accepted by this system.

See the [profile and clip catalogue](rp-animation-catalogue.md) for all 12 profiles,
70 selectable clips, source workspots, prop requirements and placement notes.
Male and female rig bindings exist in the selected source assets; the local male
smoke check does not validate all clips or both remote proxy graph modes.

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
`/anim` (or `/anim menu`) opens the Freeroam **Animations** tab. It shares the
existing menu WebUI: search 70 variants across five categories, save favourites,
choose a loop or a 5/10/30-second duration, then **Play & Close**. The menu releases
input before the temporary TPP starts. **Stop** or `/anim stop` cancels the caller's
action, including an in-flight UI request; moving also interrupts playback.
Only the default cigarette action has a local-male visual check so far; the other
variants are explicitly labelled experimental rather than certified for both rigs.
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

So the addressable set is the **70 clips of the twelve shipped devices**, and
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

#### Scenarios (`TaskStartScenarioInPlace`) are not shipped

There is no `Open77.animations.scenario(entity, workspotRef)`. Cyberpunk's scenario
equivalent is a workspot, and a workspot is only playable through a device bound to
it. Mounting a player into a *world* chair, bench or bar stool would need that
device's engine entity handle, and nothing on 2.31 enumerates workspot-bearing world
entities near a point — the same wall that stopped the cover commands in an earlier
wave. Pointing the generic device at an arbitrary `.workspot` at runtime has not been
measured and is not assumed. Tracked as I4.

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

The server cancels on disconnect, loss of readiness, death, vehicle occupancy,
routing-bucket changes, position changes exceeding 0.5 m from the start, and
completion of a non-looping sequence. The client reports its native playback
failures or interruptions (including combat) through self-cancellation. This path
is implemented but still requires live acceptance with the native presentation.

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
and `permission_denied:<capability>`.

Client-side errors also include `export_resource_unavailable`, `player_not_ready`,
`network_unavailable`, `too_many_requests`, `request_timeout`, `cancelled`,
`session_changed`, `invalid_response`, and `resource_stopped`. Internal native
failures are reported separately through `onAnimationPlaybackFailed`.

## Local view and development diagnostics

The curated native local path requests third person temporarily and reuses the F7
presentation body. It waits for that body to be active before starting the workspot;
its walking, aiming and combat presentation stand down while the workspot owns it.
Stopping waits for workspot detachment before releasing the temporary view priority.
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
