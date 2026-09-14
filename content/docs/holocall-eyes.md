# Blue holocall eyes

Enable the game's authored **blue eye-glow effect** on a multiplayer player.
The server owns the state; clients display it on streamed player bodies and the
local third-person/F7 body. This is a cosmetic building block for phone, taxi,
dispatch or RP resources, not a complete phone-call system.

It does not open the vanilla phone, play phone audio, set quest facts, restrict
movement or change the player's saved eye customization. It needs a client and
server build containing this API; a successful Lua call confirms canonical
state, not a native rendering acknowledgement.

Published in client/server **2.31.13+op77.62**, protocol **1.25**. Use matching
updated builds for the server setter and its client-side projection.

## Quick start

Declare the permissions your resource needs:

```lua
permissions { "players.holocall.control", "players.holocall.read" }
```

In a **server** script, after validating your own call rules:

```lua
local ok, reason = Open77.players.setHoloCallEyes(playerId, true)
if not ok then print("Cannot enable call eyes: " .. tostring(reason)) end

-- When the call ends; releases only this resource's request.
Open77.players.setHoloCallEyes(playerId, false)
```

`playerId` is the connected **network player ID**, not a character record,
user UUID, engine entity ID or local puppet handle. The player must be ready
and alive to enable the effect. Being in a vehicle is allowed.

## API

| Function | Runtime | Permission | Result |
| --- | --- | --- | --- |
| `Open77.players.setHoloCallEyes(playerId, enabled, options?)` | Server | `players.holocall.control` | `true`, or `false, reason` |
| `Open77.players.getHoloCallEyes(playerId)` | Server | `players.holocall.read` | enabled boolean, or `nil, reason` |
| `Open77.players.getHoloCallEyes(playerId?)` | Client | `players.holocall.read` | replicated enabled boolean, or `nil, reason` |

`enabled` must be an actual boolean. The only option is `durationMs`: an integer
from **0 to 600000**, default **0** (until explicitly released or cleaned up).
A false/disable request must use 0 or omit the duration. Unknown options,
numeric strings, fractional durations and invalid IDs are rejected.

```lua
-- Automatic release of this resource's lease after 30 seconds.
assert(Open77.players.setHoloCallEyes(playerId, true, { durationMs = 30000 }))
```

Calling true again renews this resource's duration without restarting the glow.
Resources hold independent leases: one resource cannot extinguish another's
active request. Use the getter if you need the effective OR-combined state.

Client reads default to the local player. They are available only after the
initial server snapshot and concern the current routing bucket. A false client
result for an unknown/other-bucket player does not reveal their global state.
There is **no client setter**. Route requests through your own server validation;
do not forward a client-chosen target ID without authorization.

## State changes and cleanup

Server resources can observe effective changes:

```lua
AddEventHandler("onPlayerHoloCallEyesChanged", function(playerId, enabled)
    print(("Player %d call eyes: %s"):format(playerId, tostring(enabled)))
end)
```

Both parameters are typed: integer player ID and boolean enabled. The event
reports the combined state, not every redundant lease renewal.

The platform automatically removes requests on death, disconnect, duration
expiry, or owning resource VM stop/reload/failure. Respawning/reconnecting does
not resurrect the previous call. Reapply from the phone resource if your
gameplay rules explicitly resume it. No resource-stop handler is required just
to release the glow.

Full reliable snapshots restore the state for late joiners and routing-bucket
changes. Stream-out removes the local effect; stream-in, F7 activation and body
reconstruction rebind it to the new presentation. Do not manually move lights,
spam a per-frame effect command or call the private replication events.

The blue native effect slot is managed by this API. Avoid simultaneously
starting `eye_glow_blue` through generic VFX APIs on the same body.

Use a client and server build that both include this API. No additional
downloaded client resource or third-party eye mod is needed. Native effects
remain subject to rendering distance, streamed-body availability and the
client's existing VFX budget; the getter reports synchronized intent, not a
guarantee that an off-screen or occluded eye is currently drawn.

## Errors

| Reason | Meaning |
| --- | --- |
| `permission_denied:players.holocall.control` / `.read` | Missing manifest capability. |
| `invalid_options`, `invalid_argument`, `invalid_duration`, `invalid_player` | Invalid type, option or numeric range. |
| `player_unavailable` | No connected/observable target. |
| `player_not_ready`, `player_not_alive` | Enabling before gameplay readiness or while dead. |
| `resource_stopping` | The calling VM is retiring. |
| `quota_exceeded` | Cosmetic state or per-player resource lease bound reached. |
| `holocall_unavailable` | Server embedding does not provide this service. |
| `state_unavailable` | Client has not received a snapshot for its current session. |

The API controls only the authored blue appearance. Other glow colors, eye
materials, call voice routing and facial/lip animation are separate systems.
