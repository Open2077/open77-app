# Native Dash and Air Dash

Dash uses native locomotion with server-owned grants, stamina, charges, cooldown
and one Air Dash per airtime. It composes with Gorilla Arms and installed double
jump without rewriting paid arms/legs records. Real two-client acceptance of
movement, animation and authority is recorded in `docs/dash-validation.md`; audio
and presentation presets are not yet proven.

## Public server Lua API

| Call | Resource permission | Result |
|---|---|---|
| `Open77.dash.define(definition)` | `players.dash.define` | Register an immutable versioned definition |
| `Open77.dash.grant(player, definitionId)` | `players.dash.manage` | Request this resource's session grant and native projection |
| `Open77.dash.revoke(player)` | `players.dash.manage` | Remove this resource's Dash grant |
| `Open77.dash.cancel(player, activationId)` | `players.dash.manage` | Cancel its matching active Dash |
| `Open77.dash.current(player)` | `players.dash.read` | Activity and projection, or nil when absent |
| `Open77.dash.capabilities()` | `players.dash.read` | Supported profile and implementation limits |

Mutations return `{ok=true}` or `nil, reason`. A successful grant means pending
native work. Check `current(player).projection.status == "ready"` before presenting
it as usable. `current(player).ownedByCaller` is a server-derived boolean for the
calling resource. It remains accurate across projection restarts; projection
revision or definition ID alone is not proof of ownership. Grants require the
existing authenticated cyberware character binding
and an alive, ready, unmounted body. They are session capabilities, not purchased
equipment. Server makers own persistence, jobs, progression, prices and zones.

```lua
-- Manifest permissions: players.dash.define, players.dash.manage, players.dash.read
assert(Open77.dash.define({
  id = "myserver.air_dash", version = 1, profile = "dash",
  config = {
    inputKey = "ctrl", allowGround = false, allowAir = true,
    requireDoubleJump = false, movementProfile = "native", presentation = "native",
    staminaCost = 20, cooldownMs = 700,
    maxCharges = 1, chargeRegenMs = 2500,
    landingRearmMs = 150, maxAirborneMs = 10000, maxFallSpeed = 30,
  },
}))
-- Call only after your server's access/consent/payment checks:
local pending, reason = Open77.dash.grant(player, "myserver.air_dash")
local activity = Open77.dash.current(player)
-- Remove only this resource's capability. Paid implants remain installed:
local removed, error = Open77.dash.revoke(player)
```

`profile` is exactly `dash`; `allowGround` and `allowAir` select ground-only,
air-only or both. `requireDoubleJump` optionally requires an active existing legs
implant. It does not install or replace one. Input accepts lowercase physical
letters/digits, `f1` through `f12`, and supported modifier/navigation names such as
`ctrl`, `shift`, `space`, `left`, `right`, `pageup`. Use a deliberate binding that
fits your server's other controls.

| Configuration | Supported bounds |
|---|---|
| `staminaCost` | 0–300 canonical points |
| `cooldownMs` | 300–600000 |
| `maxCharges` | 1–3 |
| `chargeRegenMs` | 300–600000, sequential charge regeneration |
| `landingRearmMs` | 150–1000 stable observed ground |
| `maxAirborneMs` | 100–10000 |
| `maxFallSpeed` | 0.1–30 m/s |
| `movementProfile` | `native` only |
| `presentation` | `native` sound + FX; `silent` FX only; `none` neither |

Speed, distance, jump-counter resets, immunity and time dilation are not public
configuration. Native collisions can shorten or entirely block travel. The
presentation preset does not disable locomotion animation or collision. It selects
only the adapter's audited sound/FX; no arbitrary effect or sound identifiers are
accepted. Events include the presentation from the admitted definition snapshot.
The server validates bounded movement observations; it does not run a duplicate map
physics simulation. Exact supported movement envelopes and ordering require live
calibration and are recorded in research rather than advertised as tunable values.

Charges and stamina are spent once on server acceptance. Accepted native failure
or interruption retains that cost; there is no client-chosen refund. Cooldown and
charge debt survive revoke/regrant, definition replacement and body transitions
within the session. Charge regeneration never clears an airtime's used Air Dash.
Stable landing rearms the one-air-use gate but does not restore spent charges or
erase cooldown. Disconnect ends the session; a new body needs a fresh native ACK.

Cancellation retains bounded server movement ownership during native recovery,
until the correlated native-exit acknowledgment or a 1500 ms deadline. Even an
early completion report keeps the movement envelope for at least 300 ms after
admission. `current().phase` reports `recovering` during that window. These are
server enforcement limits, not proof that a modified client executed native code.
The client sends a drain acknowledgment only for the matching native action after
its active flag clears, and after any correlated correction has been queued.

Hold a movement direction and tap the configured key. Direction selection uses
the physical WASD movement cluster (layout-aware virtual-key translation).
Custom in-game movement remaps are not discovered by this adapter; the Dash key
itself is configurable through `inputKey`. With no direction held, Dash follows
camera forward. Input is suppressed while the native menu or WebUI owns focus,
and a newly granted capability requires a released key before the next tap.

Supported combinations
under validation are jump → Air Dash and double jump → Air Dash. Air Dash consumes
native jump readiness; the reverse ordering is native-limited. Do not promise
arbitrary ordering, repeated airborne acceleration or unlimited airtime.

`current` reports `projection`, `charges`, `cooldownUntil`, `nextChargeAt`,
`airUsed`, `activation` and `phase`. Times use server monotonic milliseconds.
Listen for correlated accepted, started, completed and cancelled diagnostics:

```lua
AddEventHandler("onDashChanged", function(player, encoded)
  local event = json.decode(encoded)
  print(("Dash player=%s action=%s phase=%s reason=%s")
    :format(player, event.activation, event.phase, tostring(event.reason)))
end)
```

Rejected intents emit the local server event `onDashRejected(player, encodedPermit)`.
Its JSON payload contains `incarnation`, `revision`, request `sequence`, null
`activation`, `ok=false`, `error`, `directionX`, `directionY` and `expiresInMs`.
The request sequence correlates a rejection that never received an activation ID.
Client-origin network events cannot forge this local authority notification.

```lua
AddEventHandler("onDashRejected", function(player, encodedPermit)
  local rejected = json.decode(encodedPermit)
  print(("Dash rejected player=%s sequence=%s reason=%s")
    :format(player, rejected.sequence, rejected.error))
end)
```

The server support channel `open77:dash:*` is reserved. Resources cannot forge
native permits by broadcasting it. Observers receive starts only after the owner
reports native entry, and terminal cleanup reaches former recipients after scope
loss. Correlated events establish protocol state, not rendered acceptance.

## Optional parkour resource

`resources/gamemodes/open77_parkour_example` has `auto_start false`. An operator
can explicitly enable it with `ensure open77_parkour_example` on a test server
after its support/equipment dependencies are ready. It is not added to Freeroam.
Its self-only `/parkour` command uses the same public API. Installation access
uses the resource's `canUse` policy. The example registers an unrestricted command;
enable its `RegisterCommand` restricted argument if your server also requires
`command.parkour` ACL checks.

- `/parkour install basic air`: standalone Air Dash, 20 stamina, one charge.
- `/parkour install advanced ground`: ground Dash, 10 stamina, three charges.
- `/parkour install advanced combined`: both forms, requiring existing double jump.
- `/parkour inspect`: native projection readiness, charges, cooldown and legs profile.
- `/parkour test`: physical-input and landing/rearm instructions.
- `/parkour remove`: revoke Dash while keeping existing implants.

Basic uses 700 ms cooldown / 2500 ms charge regeneration; advanced uses 450 ms /
1500 ms. All three modes are available under both presets. Combined refuses a
missing legs implant and directs the player to the public doctor workflow:
an authorized doctor runs `/doc offer <patient> training legs`, then the patient
accepts normally. The example has no implant-write permission, so it cannot
silently replace paid records.

Customize `server/config.lua` for access, progression, training buckets and the
bounded `presentation` preset (`native`, `silent`, `none`).
`canUse(player,preset,mode)` must explicitly return true; errors deny access.
Existing grants are checked every 250 ms and revoked after policy loss. This is
an example policy cadence, not an instantaneous spatial activation arbiter. A
strict zone boundary needs admission-time server integration. The example is free
and does not create an economy or automatically grant anybody Dash.

## Optional cyberware lab and doctor composition

Explicitly enable `open77_cyberware_lab` with its support dependencies and open
`/cyberlab`. Select a player, then use the Dash card to choose Basic or Advanced
and Ground, Air or Combined. Grant requests a session capability. Inspect shows
server state; Test displays physical-input instructions. Close the panel before
pressing the configured key. Remove releases only the lab's grant and preserves
paid Gorilla Arms and double-jump legs. Grants supplied by another resource must
be managed through that resource.

The same controls are available through the lab's command:

```text
/cyberlab dash install <player> basic air
/cyberlab dash inspect <player>
/cyberlab dash test <player>
/cyberlab dash remove <player>
```

A client issuer may omit the player to target self; console commands require an
explicit positive player ID. Combined requires installed, effective double-jump
legs. The doctor can install those through the existing consent/payment workflow:
`/doc offer <patient> training legs`. Dash neither replaces that record nor
creates a second equipment ledger. The lab remains disabled by default, and its
`server/config.lua` exposes replaceable access/zone policy and bounded presets.
No native activation is performed by the lab's Test action.

Setup and copyable workflows:
[parkour example](../resources/gamemodes/open77_parkour_example/README.md),
[doctor example](../resources/gamemodes/open77_ripperdoc_example/README.md).

## Evidence and limitations

Authority/host tests cover permission denial, owner isolation, grant lifecycle,
canonical debit-once, regeneration, airtime, stale/duplicate reports, bounded
movement rejection/correction and native-entry observer fanout. The actual-Lua
parkour harness exercises preset installation, combined refusal, preservation of
paid slots, access denial, owner errors and cleanup.

Two real clients with physical input have exercised both body families as owner
and observer: directional Air Dash and ground Dash, jump and double-jump
combinations, the one-air-use gate, stamina, charges, cooldown, resource-stop,
death, vehicle and bucket lifecycle, owner first- and third-person views and
collision samples (`docs/dash-validation.md`, 2026-09-13/14). Audio, presentation
presets, latency impairment, reconnect and scripted Gorilla/Ground Slam interplay
remain acceptance work. See [Dash authority research](../docs/research/dash-authority-design.md)
and the [integration plan](../docs/cyberware-integration-plan.md). No release or
production deployment is implied.
