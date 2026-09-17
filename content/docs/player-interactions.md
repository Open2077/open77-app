# Player interactions

`Open77.playerInteractions` coordinates two-player actions with participant reservations, consent, presentation readiness, a shared start and cleanup. Gameplay effects such as item transfer, healing or payment remain the resource's responsibility.

An accepted interaction confirms server admission, not successful native animation playback. Handle presentation failure and cancellation events.

## Setup

The server must load `open77_player_interactions`, `open77_animations` and the
matching client animation/proxy archives. The default server configuration loads
the new system resource. Existing custom configurations must add it explicitly.

```lua
resource 'medical_actions'
version '1.0.0'
dependency 'open77_player_interactions >=1.0.0'
permissions {
    'players.interactions.read',
    'players.interactions.control',
    'world.props', -- only if this resource also manages attached props
}
server_script 'server.lua'
client_script 'client.lua'
```

`read` permits inspection; `control` permits server creation and cancellation of
owned interactions. Client resources can inspect, accept/decline their own
invitation or cancel an action they participate in. A client cannot create an
authoritative pair or accept for somebody else. Use your normal authenticated
server event or command for gameplay requests.

## Lifecycle

```text
request → offered → preparing → scheduled → active → completed
             ↓          ↓          ↓          ↓
                          cancelled
```

Both players are reserved immediately, including during the invitation. Only
the target can accept. `consent=false` skips the invitation, not validation or
readiness. Use it only for gameplay whose authorization is already established.
Both clients acknowledge preparation before the server schedules a common start
500 ms ahead. Preparation times out after eight seconds. Observers reconcile the
same state; snapshot repair handles late joins and missed terminal updates.

This is scheduled gameplay coordination, not a frame-perfect cinematic timeline.
Native `give`/`heal` workspots already play their entry while preparing and are
restarted at the shared start; readiness is not an engine-side paused preload.
Streaming, frame rate and animation entry/loop timing can differ between clients.
Do not time an inventory transaction from a hand pose or a local animation event.

`completed` is emitted once by the server coordinator. Terminal interactions
leave the active registry; keep terminal information in your resource if needed.
Client events are visual notifications, **never authority to grant a reward**.

The system reserves only this interaction/animation service. Your own inventory,
health, vehicle, job and economy systems must still check their business rules.

## Request options

| Field | Default and constraints |
| --- | --- |
| `durationMs` | `4000`; integer 500–600000. Starts at the shared scheduled time, not at invitation. |
| `startDistance` | `3` metres; finite 0.25–10. Checked against server-observed positions. |
| `breakDistance` | `5` metres; finite, at least `startDistance`, at most 20. |
| `inviteTimeoutMs` | `15000`; integer 1000–60000. |
| `consent` | `true`; boolean. |
| `actorAnimation` | Optional RP profile ID for `give`, `heal` or `custom`. |
| `targetAnimation` | Optional RP profile ID for `give`, `heal` or `custom`. |

Unknown fields are rejected. Profile IDs must exist in the RP catalogue.
`carry`/`escort` use their fixed paired presentation and reject profile overrides
with `paired_animation_fixed`. Prop local offsets/rotations belong to the
[attachment API](attachments.md), not to these options.

Kinds:

| Kind | Presentation and gameplay responsibility |
| --- | --- |
| `give` | Item-offering profiles on both bodies; your server code commits the item transfer. |
| `heal` | Examination and wounded/resting profiles; your server code applies healing. |
| `carry` | Carried-body pose plus carrier arm layers; actor can move and target follows. No damage or dead-ragdoll pickup. |
| `escort` | Side-by-side guided movement with walking poses. No vanilla takedown or damage is started. |
| `custom` | Optional specified RP profiles under the same reservation/consent protocol. |

Participants must be incarnated, alive, on foot, nearby and in the same bucket.
An injured/downed player may be represented by your gamemode while still alive;
this API does not attach a dead ragdoll or override engine death. Moving away
from the starting spot cancels stationary `give`/`heal`/`custom` actions; a carried
pair can move together but separation still cancels it. Death, disconnect,
bucket change, entering a vehicle, resource stop, timeout, rejection and native
presentation failure release reservations. Local presentation temporarily uses
the same F7 body as observers without changing the saved camera preference.

For carry/escort, only the visual stand-in is mounted to the rendered parent;
the real target retains its engine movement controller and follows through the
guarded native travel facility. Input restrictions and mutual proxy-collision
suppression are scoped to the interaction. Release searches nearby walkable
ground; if no safe drop exists, participants can separate before their mutual
collision is restored. Existing gamemode ghost/input policies are preserved.
These are presentation building blocks, not hand IK, obstacle pathfinding or
an authoritative collision solver. Your resource must validate the action's
location and gameplay rules (including line of sight when required).
`give` and `heal` turn each local participant toward the other before starting
the workspot, without changing their positions. Choose a suitable distance for
the selected profiles; facing alone cannot calibrate a grip between two bodies.

## Server API

Calls return directly, not promises. Failure is `nil, reason`.

| Method | Success result |
| --- | --- |
| `request(actorId, targetId, kind, options?)` | State table. The calling resource owns this interaction. |
| `get(interactionId)` | Active state, or `nil` when absent. |
| `current(playerId)` | The player's reserved interaction, or `nil`. |
| `isReserved(playerId)` | Boolean. |
| `list()` | Active interactions owned by this resource. |
| `cancel(interactionId, reason?)` | Terminal state. Cannot cancel another resource's action. |

These methods are under `Open77.playerInteractions`. Cancellation reasons accept
1–64 ASCII letters/digits/underscores; invalid custom reasons become `cancelled`.
Interaction IDs are opaque 32-character hexadecimal strings. Never reuse one as
a player ID or native entity handle.

State fields: `id`, `kind`, decimal-string `actor`/`target`, `phase`, `reason`,
`bucket`, `options`, `epoch`, `revision`, `serverTimeMs`, `startsAtMs`, `endsAtMs`.
Times are server monotonic milliseconds, **not Unix timestamps**. Start/end are
zero before scheduling. Epoch/revision make old messages distinguishable; clients
must not manufacture or edit authoritative state.

Server events, delivered to the owning resource:

```lua
AddEventHandler('onPlayerInteractionChanged', function(state) end)
AddEventHandler('onPlayerInteractionStarted', function(state) end)
AddEventHandler('onPlayerInteractionCompleted', function(state) end)
AddEventHandler('onPlayerInteractionCancelled', function(state) end)
```

## Give an attached item

This example assumes that the same server resource owns the prop and its
gameplay ownership table. For separate inventory resources, call their server
exports; do not try to mutate a foreign prop directly.

```lua
local pending = {}

local function giveItem(actor, target, propId)
    -- Validate inventory ownership, permissions and item availability here.
    local prop = Open77.props.get(propId)
    if not prop or not prop.attachment or
       prop.attachment.parentType ~= 'player' or
       tonumber(prop.attachment.parentId) ~= actor then return nil, 'not_carried' end
    local state, err = Open77.playerInteractions.request(actor, target, 'give')
    if not state then return nil, err end
    pending[state.id] = {propId=propId, revision=prop.revision}
    return state
end

AddEventHandler('onPlayerInteractionCompleted', function(state)
    local transfer = pending[state.id]
    pending[state.id] = nil -- consume before calling other code
    if not transfer then return end
    -- Revalidate your inventory transaction here, before changing either owner.
    local ok, err = Open77.props.attach(transfer.propId, {
        parentType='player', parentId=state.target, bone='RightHand',
    }, transfer.revision)
    if not ok then print('Handoff refused: '..tostring(err)); return end
    -- Commit your resource's authoritative item owner after successful CAS.
end)

AddEventHandler('onPlayerInteractionCancelled', function(state)
    pending[state.id] = nil -- no item transfer on decline/death/disconnect
end)
```

Do not add a timer that blindly grants the item after four seconds: the action
may have been declined, cancelled, or never prepared. If your final transaction
needs persistence, implement its own idempotency key and database transaction;
the in-memory coordinator is not a durable inventory transaction log.

## Medical and guided-movement examples

Server-side medical action (also declare `players.stats.read` and
`players.stats.apply`). Replace the commented checks with your resource's job,
item and line-of-sight rules before exposing this to players:

```lua
local treatments = {}
local function examine(medic, patient)
    -- Validate medic permissions and reserve the required medical item first.
    local state, err = Open77.playerInteractions.request(medic, patient, 'heal', {
        durationMs=8000, startDistance=2, breakDistance=3,
    })
    if not state then return nil, err end
    treatments[state.id] = true
    return state
end

AddEventHandler('onPlayerInteractionCompleted', function(state)
    if not treatments[state.id] then return end
    treatments[state.id] = nil
    -- Revalidate/consume the reserved medical item before granting health.
    local patient = tonumber(state.target)
    local health = Open77.stats.getHealth(patient)
    if not health then return end
    local ok, err = Open77.stats.setHealth(patient,
        math.min(health.maximum, health.value + 25))
    if not ok then print('Treatment refused: '..tostring(err)) end
end)
AddEventHandler('onPlayerInteractionCancelled', function(state)
    treatments[state.id] = nil -- release your medical-item reservation too
end)
```

Carry/escort use the same invitation and cancellation UI. The caller must select
an eligible, alive target; a gamemode's injured state is separate from engine
death. The actor can walk, but neither participant can attack or jump during the
action. The target cannot walk independently until release.

```lua
-- Server, after checking your gameplay authorization:
local state, err = Open77.playerInteractions.request(helperId, injuredId, 'carry', {
    durationMs=60000, consent=true,
})
-- Use kind='escort' for side-by-side walking under the same lifecycle.
-- Stop before the duration expires (only the owning resource can do this):
-- Open77.playerInteractions.cancel(state.id, 'destination_reached')
```

Cancellation is a release, not successful completion. If reaching a destination
should complete a job, validate and commit that job in your own server code;
do not reinterpret every participant cancellation as a reward.

## Client API

Client facade calls return an **Open77.Promise** routed to the bundled resource.
Call `:await()` from a `CreateThread` coroutine. Distinguish a dispatch/rejection
error from an absent state. Methods under `Open77.playerInteractions`:

| Method | Promise resolves to |
| --- | --- |
| `list()` | Locally synchronized states in the current bucket. |
| `get(id)` | State or nil. |
| `current(playerId?)` | State for that player; defaults to the local player. |
| `isReserved(playerId?)` | Boolean. |
| `respond(id, accepted)` | Request ID, or `nil, reason`; target only, boolean response. |
| `accept(id)` / `decline(id)` | Aliases for `respond`. |
| `cancel(id?)` | Request ID; defaults to your current interaction. Participants only. |
| `result(requestId)` | Cached server result, or nil while pending/expired. Kept 30 seconds. |

A request ID means the message was submitted, **not** that the server accepted
it. Observe `onPlayerInteractionResult` for the authoritative reply. The bundled
chat command `/interaction accept`, `/interaction decline`, `/interaction cancel`
lets a player respond even without a custom UI.

```lua
AddEventHandler('onPlayerInteractionOffered', function(state)
    -- Show your UI here. Accept only after the player's explicit choice.
end)

local function acceptFromUi(id)
    CreateThread(function()
        local promise, err = Open77.playerInteractions.accept(id)
        if not promise then print(err); return end
        local requestId, rejected = promise:await()
        if not requestId then print(rejected); return end
        print('Waiting for server response: '..requestId)
    end)
end

AddEventHandler('onPlayerInteractionResult', function(result)
    -- result.requestId correlates the response with your UI action.
    if not result.ok then print(result.error) end
end)
```

Clients also receive `onPlayerInteractionChanged`, `Started`, `Completed`,
`Cancelled`, and `onPlayerInteractionPresentationFailed(id, reason)`. The latter
reports a local native failure; the server remains responsible for releasing the
pair. Never rebroadcast these events as authority. The `open77:playerInteractions:`
network namespace and `_present` native are reserved for the system adapter.

## Failure handling and limits

Common refusals include `invalid_participants`, `player_not_ready`,
`player_not_alive`, `player_in_vehicle`, `position_unavailable`, `wrong_bucket`,
`too_far`, `player_reserved`, `animation_busy`, `invalid_kind`, `invalid_duration`,
`invalid_distance`, `unknown_animation`, `paired_animation_fixed`,
`owned_by_another_resource`, `not_invited`, `not_participant`, `invalid_phase`
and `stale_preparation`. Preserve reasons in developer logs; show a short,
appropriate message to players.

The coordinator permits at most 256 interactions globally and 64 per resource.
Player replies are rate-limited and bound to the authenticated connection.
Resource reload cancels its outstanding reservations. Snapshot repair does not
replay completed gameplay callbacks or restore transactions after server restart.
