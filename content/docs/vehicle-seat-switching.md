# Changing seats inside a vehicle

Seat switching is an asynchronous operation on an already-seated player. The
server keeps the source occupied and reserves the destination while the native
in-cabin animation runs. A confirmed change moves the occupant atomically;
cancellation or timeout releases the destination and retains the source.
If the animation is already underway, the body finishes that movement and plays
the return to its original seat. Cancellation is not an instant visual stop.

This API uses **protocol 1.44**. Client and server must both support that
protocol. It is separate from boarding (`taskPlayerEnterVehicle`) and instant
placement (`warpPlayerIntoVehicle`). A successful request means accepted or
queued, not that the player has reached the destination.

## Seat names

| Seat | Name | Numeric alias |
|---|---|---|
| Driver | `driver` / `seat_front_left` | `-1` |
| Front passenger | `frontPassenger` / `seat_front_right` | `0` |
| Rear left | `rearLeft` / `seat_back_left` | `1` |
| Rear right | `rearRight` / `seat_back_right` | `2` |

The destination must exist in the actual car and be free. Bikes, AVs and custom
workspots without a supported seat-switch path are refused locally; a request
issued by the server is cancelled if the client's native check cannot support it. A request never
evicts another occupant. The cabin's boarding lock does not prevent an internal
move; the player's `exitLocked` policy does.

Cross-row moves use the native destination-aware seat transition. They do not
add a bespoke climbing animation for every cabin layout.

## Choose the right operation

| Player's situation | Operation |
|---|---|
| On foot, entering a car | Server `taskPlayerEnterVehicle(playerId, vehicleId, seat)`. |
| Instant placement in a car | Server `warpPlayerIntoVehicle(playerId, vehicleId, seat)`. |
| Already seated, moving inside the same car | Server `switchPlayerSeat(playerId, seat)` or client `switchSeat(seat)`. |
| Front passenger should stay put when the driver leaves | Disable automatic seat switching for that player. |

Seat switching keeps the same vehicle and replicated body. Other players see
the in-cabin animation. The source remains occupied while the destination is
reserved; another player cannot claim either seat during the move. Use the
completion event to update gameplay state, rather than a timer or the request's
return value. Unconfirmed transitions time out after eight seconds.

## Manifest

For a resource using both client and server examples:

```lua
-- open77.lua
resource 'my_seat_controls'
version '1.0.0'
auto_start true
client_script 'client.lua'
server_script 'server.lua'
permissions { 'world.vehicles', 'vehicles.read', 'vehicles.control' }
```

A server-only resource needs `world.vehicles`. Client state queries need
`vehicles.read`; client requests and policy changes need `vehicles.control`. These
examples do not need network events or a WebUI. Add the corresponding
permissions if your own menu sends additional network messages or creates a page.

## Server API

Requires `world.vehicles` in the resource manifest. These functions are all under
`Open77.vehicles`.

| Function | Result |
|---|---|
| `switchPlayerSeat(playerId, seat)` | `true, transitionId` if reserved; `false, reason` if refused. |
| `getPlayerSeatSwitch(playerId)` | Active transition table, `nil` when idle, or `false, reason` on refusal. |
| `cancelPlayerSeatSwitch(playerId, transitionId)` | `true` or `false, reason`. A stale ID cannot cancel a later move. |
| `setPlayerAutoSeatSwitchEnabled(playerId, enabled)` | Adds/removes this resource's veto of automatic driver takeover. |
| `isPlayerAutoSeatSwitchEnabled(playerId)` | Effective policy across all resources. |

Transition tables contain `id`, `playerId`, `vehicleId`, `fromSeat`, `toSeat`,
and `automatic`. Keep `id` as a string. Existing occupant snapshots also expose
`switching`, `switchId`, `switchSeat`, and `autoSwitchEnabled`; seat availability
includes the reserved destination.

| Server transition field | Type / meaning |
|---|---|
| `id` | Opaque string token; pass it unchanged to cancellation. |
| `playerId`, `vehicleId` | Numeric IDs for the player and current vehicle. |
| `fromSeat`, `toSeat` | Canonical `seat_*` strings. |
| `automatic` | Boolean: native automatic takeover rather than an explicit request. |

Disabling automatic takeover does not disable explicit requests. Vetoes belong
to the resource: enabling from another resource cannot remove them, and stopping
their owner releases them. An explicit move into the front passenger seat can
be followed by vanilla automatic takeover if the driver's seat is empty and
automatic takeover remains enabled.

```lua
-- server.lua — keep passengers in their chosen seat
AddEventHandler('onPlayerReady', function(playerId)
    Open77.vehicles.setPlayerAutoSeatSwitchEnabled(tonumber(playerId), false)
end)

RegisterCommand('seat', function(playerId, args)
    if playerId == 0 then return end
    local ok, idOrReason = Open77.vehicles.switchPlayerSeat(
        playerId, args[1] or 'frontPassenger')
    if not ok then print('Seat change refused: ' .. idOrReason) end
end, false)

AddEventHandler('onPlayerVehicleSeatSwitchCompleted',
    function(playerId, vehicleId, transitionId, fromSeat, toSeat, reason)
        print(('Player %s reached %s'):format(playerId, toSeat))
end)
```

Apply the policy to already connected players too if your resource starts
mid-session; `onPlayerReady` is not replayed for them. You can also apply it
when your gameplay assigns a passenger seat.

### Cancel a server request

```lua
RegisterCommand('seatcancel', function(playerId)
    if playerId == 0 then return end
    local transition, reason = Open77.vehicles.getPlayerSeatSwitch(playerId)
    if transition == false then print(reason); return end
    if not transition then return end
    local ok, err = Open77.vehicles.cancelPlayerSeatSwitch(playerId, transition.id)
    if not ok then print(err) end
end, false)
```

Keep tokens as strings; converting a 64-bit token to a floating-point number
can lose precision. A successful cancellation retains the original seat in the
server ledger. A body already moving can finish its outbound animation and
animate back before its visual position matches that seat again.

## Client API

Client mutations target only the local player and still require server admission.
Reads require `vehicles.read`; mutations require `vehicles.control`.

| Function under `Open77.vehicles` | Result |
|---|---|
| `switchSeat(seat)` | `true` when submitted; otherwise `false, reason`. |
| `cancelSeatSwitch(transitionId)` | `true` when cancellation is submitted; otherwise `false, reason`. |
| `seatSwitchState()` | `{ active, autoSwitchEnabled, vehicleId?, fromSeat?, id?, toSeat? }`; `nil, reason` when unavailable. |
| `setAutoSeatSwitchEnabled(enabled)` | `true`, or `false, reason`; adds/removes this client resource's automatic takeover veto. |
| `isAutoSeatSwitchEnabled()` | Effective local and server policy; `nil, reason` when unavailable. |

The server's veto always wins over a client enable. A client resource's veto
does not prevent an explicit server-authorized move. On resource stop, only that
resource's policy is released.

| Client state field | Presence / meaning |
|---|---|
| `active` | Always present; an admitted seat transition is in progress. |
| `autoSwitchEnabled` | Effective client and server automatic takeover policy. |
| `vehicleId`, `fromSeat` | Present while seated; `vehicleId` is a string. |
| `id`, `toSeat` | Present while switching; `id` is a string. |

Before admission, `switchSeat` can return `true` while the state is still idle.
Keep your menu's pending-request state until the decision event arrives; an
accepted decision still precedes native completion.

```lua
-- client.lua — a seat selection menu
AddEventHandler('open77:vehicleSeatSwitchDecision',
    function(vehicleId, transitionId, seat, status, reason)
        -- status is 'accepted' or 'rejected'; accepted is not completion.
        if status == 'rejected' then print(reason) end
    end)

-- Call this from your menu's action, after registering the handlers.
local function chooseRearRight()
    local ok, reason = Open77.vehicles.switchSeat('rearRight')
    if not ok then print(reason) end
end

AddEventHandler('open77:vehicleSeatSwitchCompleted',
    function(vehicleId, transitionId, fromSeat, toSeat, reason)
        -- Close your seat menu or update its selected seat here.
end)
```

Register event handlers before issuing the request in an actual menu. Query
`seatSwitchState()` when the resource starts or the menu opens to recover an
already active move:

```lua
local state, reason = Open77.vehicles.seatSwitchState()
if not state then
    print(reason)
elseif state.active then
    print(('Moving from %s to %s'):format(state.fromSeat, state.toSeat))
end

-- A cancel button must use the current admitted transition's token.
local function cancelCurrentSeatMove()
    local current = Open77.vehicles.seatSwitchState()
    if not current or not current.active then return end
    local ok, err = Open77.vehicles.cancelSeatSwitch(current.id)
    if not ok then print(err) end
end
```

## Automatic passenger-to-driver takeover

The native behavior moves the front-right passenger into an empty front-left
driver seat when its normal conditions are met, including after the driver
leaves. It does not move rear passengers automatically and never evicts an
existing driver. Automatic moves use the same reservation, animation and
lifecycle as explicit moves.

```lua
-- server.lua — for this resource and player
Open77.vehicles.setPlayerAutoSeatSwitchEnabled(playerId, false)
-- Release this resource's veto later:
Open77.vehicles.setPlayerAutoSeatSwitchEnabled(playerId, true)

-- client.lua — for this resource's local player
Open77.vehicles.setAutoSeatSwitchEnabled(false)
-- Release this resource's local veto later:
Open77.vehicles.setAutoSeatSwitchEnabled(true)
```

Enabling means removing your own veto, not forcing an immediate switch. Read
`isPlayerAutoSeatSwitchEnabled(playerId)` for the server policy and
`isAutoSeatSwitchEnabled()` for the effective local policy. Explicit requests
remain available when automatic takeover is disabled. Server claims are removed
when their resource stops or the player disconnects; client claims are removed
when their resource stops.

## Events and failures

Server events are `onPlayerVehicleSeatSwitchStarted`,
`onPlayerVehicleSeatSwitchCompleted`, and `onPlayerVehicleSeatSwitchFailed`.
Each receives `(playerId, vehicleId, transitionId, fromSeat, toSeat, reason)`.
Arguments follow the vehicle lifecycle convention: IDs and seat names arrive as
strings. The platform owns these event names.

Client events are `open77:vehicleSeatSwitchStarted`,
`open77:vehicleSeatSwitchCompleted`, and `open77:vehicleSeatSwitchFailed`.
They concern the local player and receive
`(vehicleId, transitionId, fromSeat, toSeat, reason)`.
The extra `open77:vehicleSeatSwitchDecision` event answers client requests with
`(vehicleId, transitionId, seat, status, reason)`.

| Event | Payload | Meaning |
|---|---|---|
| `onPlayerVehicleSeatSwitchStarted` | `(playerId, vehicleId, transitionId, fromSeat, toSeat, reason)` | Server: source retained, destination reserved. |
| `onPlayerVehicleSeatSwitchCompleted` | `(playerId, vehicleId, transitionId, fromSeat, toSeat, reason)` | Server: destination committed. |
| `onPlayerVehicleSeatSwitchFailed` | `(playerId, vehicleId, transitionId, fromSeat, toSeat, reason)` | Server: reservation released; see the failure reason. |
| `open77:vehicleSeatSwitchDecision` | `(vehicleId, transitionId, seat, status, reason)` | Client: accepted or rejected; no completion guarantee. |
| `open77:vehicleSeatSwitchStarted` | `(vehicleId, transitionId, fromSeat, toSeat, reason)` | Client: an admitted move has started. |
| `open77:vehicleSeatSwitchCompleted` | `(vehicleId, transitionId, fromSeat, toSeat, reason)` | Client: the destination assignment is confirmed. |
| `open77:vehicleSeatSwitchFailed` | `(vehicleId, transitionId, fromSeat, toSeat, reason)` | Client: move failed; visual return may still be running. |

Correlate callbacks by their transition ID rather
than assuming the next callback belongs to the latest button press. A rejected
request may produce a decision without a started transition.

The server failure event distinguishes cancellation, `timeout`,
`resource_stopped`, `forced_exit`, `occupant_removed`, `vehicle_removed`,
`wrong_bucket`, `exit_locked`, and `vehicle_unavailable`. Client lifecycle failures currently
report `cancelled` when the canonical reservation disappears without reaching
its destination, or `vehicle_removed` when the vehicle is removed; consult the
server event for the detailed cause.

Immediate refusals include `not_occupant`, `invalid_seat`, `seat_occupied`,
`exit_locked`, `transition_in_progress`, `auto_switch_disabled`,
`stale_transition`, and `unsupported_seat_switch`. Client requests may also
return `request_pending` while a previous request is waiting for admission.

Permission errors identify the missing manifest permission. Client reads return
`nil, reason` when the session or seat-switch backend is unavailable; client
mutations return `false, reason`. Server reads can return `false, reason` for
invalid players or missing permissions, which is distinct from idle `nil`.

```lua
local ok, result = Open77.vehicles.switchPlayerSeat(playerId, 'rearLeft')
if not ok then
    -- Common refusals: seat_occupied, exit_locked, not_occupant.
    print('Seat request refused: ' .. result)
end
-- Do not mark the move completed here, even when ok is true.
```

Existing `vehicleEntered`/`vehicleLeft` and server equivalents continue to
describe the change of seat. Use the dedicated switch events to distinguish an
internal move from leaving the car.

The optional `resources/examples/open77_seat_switch` resource provides
`/seats move <seat>`, `/seats auto on|off`, `/seats cancel`, and `/seats status`,
plus `/seats local <seat>` and `/seats localauto on|off` to exercise client calls.

## Compatibility and presentation

Use matching client/server builds supporting protocol 1.44 and the client
animation assets. Feature-detect the Lua functions when supporting older
installations. Unsupported native layouts are refused rather than treated as
successful seat changes. A brief startup pose discontinuity can still occur
on a replicated character; it does not change the server's seat reservation.

See [network vehicles](vehicles.md) for boarding, exit locks, snapshots and seat
queries, and [passenger drive-by](drive-by.md) for in-vehicle combat policy.
