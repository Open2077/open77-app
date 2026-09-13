# Voice lipsync

> Implemented and tested locally. Do not infer CDN availability from this guide.

Open77's native voice renderer can drive a small mouth-only animation on player
heads. Lua controls the policy; no Lua loop, custom animation bank or Redscript
resource is needed. The existing body locomotion, combat and RP animation systems
remain separate.

This is **audio-envelope lipsync**: the mouth follows speech energy and returns to
rest during silence. It does not recognize phonemes, languages or words. The
Immersive Third Person archive's prerecorded dialogue clips are not installed.

## Client build requirements

Use a client build containing these four Lua functions **and its matching**
`Open77.archive` with the facial graph inputs. Updating only the server's Lua
package cannot add native functions or facial assets to an older client.
This feature itself needs no server protocol change.

Resources supporting older clients can check availability before calling:

```lua
if type(Open77.voice.setLipSyncEnabled) ~= "function" then
    print("Voice lipsync needs a newer Open77 client build")
    return
end
```

For microphone setup and server routing, see [Integrated voice chat](voice.md).

## Quick start

Declare the client permission in `open77.lua`:

```lua
permissions { "voice.client" }
```

```lua
-- Native presentation is enabled by default.
assert(Open77.voice.setLipSyncEnabled(true))

-- Temporarily suppress all voice-driven mouths on this client.
assert(Open77.voice.setLipSyncEnabled(false))

-- Release this resource's global suppression.
assert(Open77.voice.setLipSyncEnabled(true))

-- Or suppress only one network player (server ID, not a ped/entity handle).
assert(Open77.voice.setPlayerLipSyncEnabled(42, false))
assert(Open77.voice.setPlayerLipSyncEnabled(42, true))

local status = Open77.voice.getLipSyncStatus()
local player, reason = Open77.voice.getPlayerLipSyncState(42)
```

The reference `open77_voice/shared/config.lua` exposes `lipSyncEnabled = true`.
Set it to `false` to disable the effect for clients using that package. Do not
call the setters every frame.

## API contract

| Client function | Result |
| --- | --- |
| `setLipSyncEnabled(enabled)` | `true`, or `false, reason`; requires a real boolean |
| `setPlayerLipSyncEnabled(playerId, enabled)` | `true`, or `false, reason`; positive integral network ID |
| `getLipSyncStatus()` | Table, or `nil, reason` |
| `getPlayerLipSyncState(playerId)` | Table, or `nil, reason` |

Global status contains `enabled`, `sessionActive`, `mode = "audio_envelope"`,
`trackedPlayers`, `availablePlayers` and `activePlayers`.

Player state contains `playerId`, `entity`, `isLocal`, `enabled`, `available`,
`active`, `level` (smoothed 0–1) and `reason`. Entity `0` is the native local player
sentinel when `isLocal` is true; it is not a remote player ID. `available` means
that the current head has the required facial graph inputs; `active` means a
nonzero mouth envelope was submitted. These are not microphone permission flags.

Reasons include `no_session`, `not_streamed`, `disabled`,
`facial_graph_unavailable`, `controller_unavailable`, `silent` and `speaking`.
An unstreamed player returns a state with `available = false`, not an exception.
Invalid arguments fail without altering the existing policy. Missing permission
returns `permission_denied:voice.client`; older/unavailable native backends return
`voice_backend_unavailable`. Policies are bounded (`lipsync_policy_limit`).

## Ownership and multiplayer

Each Lua resource owns its own suppressions. `true` releases **only that
resource's** suppression: it cannot undo another resource's `false`. A global
suppression wins over a per-player enable. Stop, failed startup, script failure
and reload release the owning instance's policy; identically named resources in
different client hosts are isolated. Per-player IDs reset on session change.

These are **local presentation controls**, not server authority or network
events. To impose a gamemode policy on all viewers, run it in the gamemode's
client script. Disabling lipsync never mutes anyone or changes voice reachability.
No extra network packet or protocol version is introduced.

Remote mouths follow dry decoded audio at playback time, after the jitter
buffer. Local mouths follow microphone frames actually accepted for transmission
under server policy, rather than the microphone meter. Mic monitoring alone
does not animate the local player. Locally blocked players, zero-volume routes,
stalled output and silence suppress remote movement. Radio/static/reverb effects
do not drive the mouth, and several voice routes do not multiply the effect.

## Heads and animations

The asset layer targets the stock male and female player-head facial graphs.
It adds bounded jaw/upper-lip/lower-lip values before the native facial solver;
zero input leaves the original tracks unchanged. No body rig, locomotion graph,
weapon pose, animation event or root motion is replaced. Native eye and facial
animation layers remain in the graph.

The local target follows the visible F7 proxy, falling back to the native player
when F7 is absent or suspended. Remote targets are streamed replicated players.
Head replacement and entity changes rebind the inputs; stream-out and disconnect
clear them. Custom heads with unrelated facial graphs are unsupported and report
`facial_graph_unavailable` instead of attempting an unsafe skeleton conversion.

## Developer diagnostics

```text
voice.lipsyncstate 42
voice.lipsync 42 0.5
voice.lipsync 42 off
```

The existing diagnostic bridge's forced-envelope command is local-only and
requires a tracked player. Always restore `off` after a visual test. Normal Lua
resources cannot set arbitrary facial coefficients or access PCM/Opus buffers.

Implementation and validation details: `docs/research/voice-lipsync-integration.md`.
