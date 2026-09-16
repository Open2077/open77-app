# Cyberware

Cyberware gives a player persistent implants that survive reconnects and use the game's
own equipment: Gorilla Arms (slot `arms`, profile `gorilla_arms`) and double-jump legs
(slot `legs`, profile `double_jump`). The [hacking](hacking.md) implants (`operating_system`,
`self_ice`, `purge`) are installed through the same framework. You define the grades and
decide who gets an implant and at what price; the server owns the transaction, the
record and the combat rules. Dash and Ground Slam are session abilities rather than
implants and have their own pages: [Dash / Air Dash](dash.md), [Ground Slam](ground-slam.md),
[Overdrive](reflex-overdrive.md).

## Minimal example

A self-service resource that installs double-jump legs on the player who runs
`/legs install` and removes them with `/legs remove`. It needs a configured server
database and the `open77_appearance` character adapter, which binds the player's
character; the `open77_cyberware` support resource is running by default.

`open77.lua`:

```lua
resource "my_legs"
version "1.0.0"
dependency "open77_cyberware >=0.1.0"
server_script "server/main.lua"
permissions { "players.cyberware.define", "players.cyberware.read", "players.cyberware.manage" }
```

`server/main.lua`:

```lua
CreateThread(function()
    local result, reason = Open77.cyberware.define({
        id = "myserver.double_jump", version = 1, slot = "legs", profile = "double_jump",
        grades = {
            { id = "training", normalDamage = 0, chargedDamage = 0, knockbackMeters = 0,
              cooldownMs = 800, chargeMs = 650,
              jumpStaminaCost = 15, maxAirborneMs = 10000, maxFallSpeed = 30 },
        },
    })
    assert(result, reason)
end)

local pending = {}

RegisterCommand("legs", function(source, args)
    local player = tonumber(source)
    if not player or player <= 0 or pending[player] then return end
    local record, reason = Open77.cyberware.current(player)
    if not record then print("character not ready: " .. tostring(reason)); return end
    local options = { expectedRevision = record.revision, operationId = assert(Open77.cyberware.newOperationId()) }
    local result
    if args[1] == "remove" then
        options.slot = "legs"
        result, reason = Open77.cyberware.remove(player, options)
    else
        result, reason = Open77.cyberware.install(player, "myserver.double_jump", "training", options)
    end
    if not result then print("refused: " .. tostring(reason)); return end
    if result.ticket then pending[player] = result.ticket; print("pending for player " .. player) end
end, false)

AddEventHandler("onCyberwareOperationCompleted", function(player, ticket, encoded)
    player = tonumber(player)
    if pending[player] ~= ticket then return end
    pending[player] = nil
    local result = json.decode(encoded)
    print(("player %d: %s"):format(player, result.ok and "done" or tostring(result.error)))
end)
```

The player types `/legs install`, waits for the `done` line, then uses the ordinary
jump key: jump, release, press again in the air. One second jump per airtime; landing
rearms it. `/legs remove` puts the native legs back.

## Server API

All calls live under `Open77.cyberware`. Failures return `nil, reason`.

| Call | Permission | Purpose |
|---|---|---|
| `define(definition)` | `players.cyberware.define` | Register a definition and its grades (up to 32) |
| `bind(player, characterKey)` / `unbind(player)` | `players.cyberware.identity` | Bind the authenticated player to a character; `open77_appearance` does this for you |
| `current(player)` | `players.cyberware.read` | The durable record, or `nil` while it loads |
| `effective(player)` | `players.cyberware.read` | The record in play, including an active temporary loadout |
| `activity(player)` | `players.cyberware.read` | The fresh native punch/hold state |
| `install(player, definitionId, gradeId, options)` | `players.cyberware.manage` | Stage an installation; the slot comes from the definition |
| `remove(player, options)` | `players.cyberware.manage` | Stage a removal; `options.slot` is `"arms"` (default) or `"legs"` |
| `cancel(player, ticket)` | `players.cyberware.manage` | Cancel your own staged operation |
| `newOperationId()` | `players.cyberware.manage` | A durable operation identity for `options.operationId` |
| `lease(player, definitionId, gradeId, options)` | `players.cyberware.temporary` | Stage a temporary loadout; `options.durationMs` is 1000–300000 |
| `releaseLease(player, leaseId)` | `players.cyberware.temporary` | End it early and restore the paid implant |
| `leaseState(player)` | `players.cyberware.read` | Lifecycle of the current lease, or `nil` |

A definition is `{id, version, slot, profile, grades}`. `id` is 1–96 ASCII letters,
digits, `_`, `.` or `-`; `version` is a positive integer; the slot/profile pair is one of
`arms`/`gorilla_arms`, `legs`/`double_jump`, `operating_system`/`cyberdeck`,
`self_ice`/`self_ice`, `purge`/`active_purge`. An installed grade is a snapshot: changing
the definition later does not rewrite installed implants.

### Records

`current` and `effective` return `{revision, arms, legs, operationId, operationSlot}`;
an empty slot is `nil`. Each implant has `instanceId`, `definition`, `definitionVersion`,
`profile`, `slot` and its `grade` snapshot. Both slots share one revision, so read
`current` again before every mutation.

## Transactions

`install` and `remove` take `{expectedRevision = current.revision, operationId = id}` and
return `{ok = true, ticket = ...}`. **A ticket is pending work, not an installed
implant.** Wait for `onCyberwareOperationCompleted(player, ticket, encodedResult)`, match
your ticket and require `result.ok == true`. The owner's client equips the native item
first, then the record is committed to storage, then observers see it.

Keep the same `operationId` and `expectedRevision` when you retry: repeating the last
committed operation returns `{ok = true}` with no new ticket, repeating the ID with a
different intent returns `operation_conflict`. For a paid service, reserve the money
before you submit, finalize on `ok`, refund on failure, and keep your own receipt.
`cancel` returns `operation_committing` once storage has started; wait for the result
instead. Stopping your resource cancels what can still be cancelled and disables
combat for implants whose definition is gone, but never deletes an installed implant.

## Grade options

The grade schema is shared by every slot. Arms use the punch fields, legs use the jump
fields; the other fields must still be present and valid.

| Grade field | Range / meaning |
|---|---|
| `normalDamage`, `chargedDamage` | Required, 0–300; use 0 for legs |
| `knockbackMeters` | Required, 0–6; use 0 for legs |
| `cooldownMs` | Required, 100–600000 ms between admitted punches or second jumps |
| `chargeMs` | Required, 100–10000; any valid value for legs |
| `jumpStaminaCost` | Default 0, range 0–300; charged once per admitted second jump |
| `maxAirborneMs` | Default 10000, range 100–10000; latest point in the airtime a second jump is admitted |
| `maxFallSpeed` | Default 30, range 0.1–30 m/s; fastest descent that still admits a second jump |

The full arm fields (`maxChargeMs`, stamina costs, `nonlethal`, `cosmetic`, blocking)
are on the [Gorilla Arms](gorilla-arms.md#grade-options) page. Legs limits only narrow
when the second jump is admitted; jump height, gravity, fall damage and collision are
the native ones.

## Temporary loadouts

`lease(player, definitionId, gradeId, {durationMs = 300000})` gives an arena or an event
an implant that is restored to the paid one afterwards. One lease per character at a
time; a pending purchase or another lease refuses it, and paid installs and removals are
refused while a lease runs. `current` keeps the paid record, `effective` shows the lease.

`onCyberwareLeaseChanged(player, encodedState)` carries `id`, `player`, `phase`
(`pending`, `active`, `restoring`, `ended`), `definition`, `grade`, `expiresAt`, `ticket`
and `reason`. Expiry, your resource stopping, death, disconnect and a bucket change all
end a lease and restore the paid implant; restoration is the backend's job even after
your resource has stopped. Before granting another loadout wait until
`leaseState(player) == nil` and `current(player) ~= nil`.

## Events

All events are server-local; clients cannot forge them. Player IDs are strings, JSON
arguments need `json.decode`.

| Event | Meaning |
|---|---|
| `onCyberwareOperationCompleted(player, ticket, encodedResult)` | An install, removal or lease operation finished; `result.ok`, `result.error`, optional `result.lease` |
| `onCyberwareLeaseChanged(player, encodedState)` | A temporary loadout changed phase |
| `onCyberwareMeleeHit(victim, attacker, encodedSnapshot)` | An accepted Gorilla contact: `sequence`, `incarnation`, `instanceId`, `definition`, `grade`, `charged`, `amount`, `bodyPart`, `lethal` |
| `onCyberwareMeleeBlocked(victim, attacker, sequence, amount)` | An accepted block; `amount` is 0 or the chip damage |
| `onCyberwareMotionOutcome(victim, attacker, encodedOutcome)` | The knockback decision for a hit: `requestedDistance`, `outcome` (`pending`, `skipped`, `rejected`), `reason`, `motionId` |
| `onCyberwareJump(player, encodedResult)` | A second-jump decision: `{sequence, ok, error}` |
| `onCyberwareActionRejected(player, sequence, error)` | A punch the server refused |
| `onPlayerMotionChanged(player, id, phase, reason)` | A knockback moved through `pending`, `active`, `ended` |

Skipped knockback reasons are `zero_distance`, `lethal`, `downed`, `motion_unavailable`,
`body_unavailable` and `bucket_mismatch`; `motion_busy` means the victim is still in a
previous reaction. Second-jump refusals are `implant_unavailable`, `stale_incarnation`,
`stale_action`, `stale_movement`, `movement_timeout`, `bucket_changed`, `motion_busy`,
`jump_unavailable`, `movement_limit`, `cooldown` and `insufficient_stamina`.

## Optional resources

`open77_ripperdoc_example` (`auto_start false`) is a consent-and-payment clinic. Doctors
need the `command.doc` ACL; both players must be alive, in one bucket and within three
metres. Arms: `/doc offer <patient> training|industrial|cosmetic`, `/doc inspect <patient>`,
`/doc remove <patient>`. Legs: `/doc offer <patient> training|athlete legs`,
`/doc inspect <patient> legs`, `/doc remove <patient> legs`. The patient looks at the
doctor and holds **E** to accept, **F** to decline, or types `/implantaccept` /
`/implantcancel`. Its example prices are 100 credits for training legs, 250 for athlete
and 25 for a removal, from an in-memory balance of 500 that resets with the resource.

`open77_cyberware_lab` (`auto_start false`) is an open test panel: `/cyberlab` opens it on
your own character, `/cyberlab ui <player>` on somebody else's; pick Gorilla Arms or
Double Jump, a grade, and Install or Remove, or grant Dash, Ground Slam or Overdrive from
their cards further down. The same controls exist as commands:
`cyberlab installlegs <player> training <operation-id>`, `cyberlab removelegs <player>
<operation-id>`, `cyberlab state <player>`. Add it to `resources.load` and run
`ensure open77_cyberware_lab`; after editing its manifest run `refresh` first.

## Limits

**Double jump admission.** The native second-jump rules still apply (jump count, fall
speed, elevators and vehicles). Open77 buffers an eligible press for up to 750 ms while
the server decides; the server needs a ready, alive, unmounted body, a movement sample
at most 750 ms old, no active knockdown, and enough stamina. At least 150 ms of ground
rearms the airtime. Stamina is charged on admission, with no refund if the native jump
does not follow. A press whose movement sample has not arrived after 200 ms is refused
with `movement_timeout`.

**Knockback is a request.** `Open77.motion.knockdown(player, {x = 0, y = 1, distance = 2})`
(`players.motion.control`) and `Open77.motion.current(player)` (`players.motion.read`)
expose the same native reaction Gorilla hits use. Distance is 0–6 m and collisions
decide the real travel; the body must be ready, alive and unmounted; a second request
during a reaction is refused; cancelling removes the lease but does not stop momentum or
the get-up animation.

**One character binding.** The account comes from the admitted connection and the
character key from your trusted character workflow; never bind a client-supplied ID.
Stopping the identity adapter releases its bindings.

**Providers must run.** After restarting the core, restart every resource that defines
implants. An implant whose definition is not registered stays on the record and stays
visible, but cannot punch or double jump until its provider is back.

**Storage.** Records live in the `open77_cyberware_v1` and
`open77_cyberware_operations_v1` tables as additive JSON; a custom `ICyberwareStore` must
keep both slots and `operationSlot` in one atomic revision-and-receipt transaction.

## Advanced: client adapter

`open77_cyberware` owns the native side. Gameplay resources do not need these calls;
they are listed for trusted projection resources replacing the adapter.

| Client call | Permission | Contract |
|---|---|---|
| `Open77.cyberware.projectLocal(enabled)` / `localState(request)` | `player.cyberware.project` | Owned arm equipment request; `pending`, `ready`, `failed` |
| `configureLocal(request, grade)` | `player.cyberware.project` | Configure the owned arm adapter |
| `captureArms()` / `attackState()` | `player.cyberware.read` | Read the native arm profile and action state |
| `presentArms(networkPlayer, capturedOrFalse)` | `player.cyberware.project` | Apply or remove an observer's arm appearance |
| `projectLegs(enabled)` / `legsState(request)` | `player.cyberware.project` | Owned legs request; `pending`, `ready`, `failed` |
| `configureLegs(request, staminaManaged, maxAirborneMs, maxFallSpeed)` | `player.cyberware.project` | Configure a ready legs request |
| `legsActivity()` | `player.cyberware.read` | `{request, sequence, phase, grounded, airborneMs, verticalSpeed}` |
| `approveLegJump(request, sequence, allowed)` | `player.cyberware.project` | Answer a pending native second-jump intent |
| `releaseLegs()` | `player.cyberware.project` | Release the owned legs |
| `Open77.motion.knockdown(handle, x, y, distance)` / `state(id)` / `stop(id)` | `player.motion.project` | Native reaction primitives |

Requests are local handles, never network IDs. Any client resource can read the adapter's
state through its exports without owning it:

```lua
CreateThread(function()
    local pending = Open77.exports.call("open77_cyberware", "legsActivity")
    local activity = pending and pending:await()
    if activity then print(activity.phase, activity.airborneMs) end
end)
```

`capabilities` (client and server) lists the supported profiles, slots, body families and
the limits above; `legsActivity` returns `{sequence, phase, grounded, airborneMs,
verticalSpeed}` with phases `idle`, `pending`, `granted`, `consumed`, `rejected`. The
`open77:cyberware:*` network events are the platform's own transport and cannot be used
to forge an implant or a jump.
