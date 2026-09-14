# Ground Slam / Quake

Imported final Ground Slam session evidence, snapshotted September 13 at 18:27 local.
These findings describe the base session's baseline and captures; they do not
establish live acceptance of the combined Dash worktree. See the Dash checkpoint (`docs/dash-checkpoint.md`) for the combined test boundary.

Protocol **1.28**. This is a session ability alongside durable Gorilla Arms and
double-jump implants; granting or revoking it does not rewrite either implant.
Capability metadata and automated checks do **not** establish live rendering or
combat acceptance. Executed results and remaining limitations belong to the
[current checkpoint](../docs/ground-slam-checkpoint.md) and
[reproducible scenarios](../docs/research/cyberware-test-scenarios.md). Historical
double-jump/Gorilla results remain separate from Ground Slam results.

## Public server API

| Call | Resource permission | Result |
|---|---|---|
| `Open77.abilities.define(definition)` | `players.abilities.define` | `{ok=true}` or nil/reason |
| `Open77.abilities.grant(player, definitionId)` | `players.abilities.manage` | `{ok=true}` or nil/reason; native projection can still be pending |
| `Open77.abilities.revoke(player)` | `players.abilities.manage` | Remove this resource's grant and cancel its action |
| `Open77.abilities.cancel(player)` | `players.abilities.manage` | Cancel this resource's active action, retaining entitlement |
| `Open77.abilities.current(player)` | `players.abilities.read` | Projection snapshot or nil/reason |

A definition is `{id,version,profile="ground_slam",config={...}}`. IDs are 1–96
ASCII letters/digits/`_.-`; version is a positive integer. Definitions are
immutable versions and owned by their provider. Grant ownership is separate;
one resource cannot revoke another's grant. Same-definition grants are
idempotent. Regranting does not reset an active incarnation's cooldown. Provider
stop removes its definitions and grants; session/body/bucket lifecycle changes
invalidate active work. No implant persistence migration is involved.

`current` contains `player`, `incarnation`, `revision`, `definition`, `status`
(pending/ready/removed), `activation` and `cooldownRemainingMs`. Native readiness
requires the support projection ACK. A grant return, ACK, handle or metadata flag
is not proof of animation, contact, damage or visible effects.

## Configuration

All numbers must be finite. These are implementation policy bounds, not a promise
that every value is supported by every native weapon, terrain or network condition.

| Field | Default | Accepted bounds / meaning |
|---|---|---|
| `inputKey` | `"g"` | Single ASCII letter/digit, or supported named key (space, enter/return, tab, modifiers, navigation, F1–F12); case-insensitive |
| `allowGround`, `allowAir` | true, true | At least one enabled |
| `requiredArms`, `requiredLegs` | false, false | Optional active Gorilla / double-jump prerequisites |
| `cosmetic`, `nonlethal` | true, true | Cosmetic requires damage and knockback both zero |
| `damage`, `knockbackMeters` | 0, 0 | 0–300 damage; 0–6 m requested reaction distance |
| `staminaCost`, `cooldownMs` | 20, 5000 | 0–1000 stamina; 1000–120000 ms |
| `radius`, `innerRadius` | 4, 1 | Radius 0.5–12 m; inner radius 0 up to but excluding radius |
| `edgeMultiplier` | 0.25 | 0–1 radial falloff |
| `heightBonusPerMeter`, `maxHeight` | 0, 10 | Bonus 0–20; sampled height scaling cap 0–30 m |
| `maxActivationMs` | 5000 | 1000–10000 ms |
| `maxFallSpeed` | 30 | 1–60 m/s native descent eligibility envelope |
| `geometryDeadlineMs` | 750 | 250–1500 ms |
| `maxFloorDelta` | 0.75 | 0.1–1 m supporting-floor separation |
| `reaction` | `"knockdown"` | `"knockdown"` or `"none"` |
| `impactEffect`, `impactSound` | nil, nil | Optional effect catalog key ≤96 / sound event ≤128 characters; ASCII letters/digits/`_.-` |
| `effectOnOwner`, `soundOnOwner` | false, false | Optional owner echo policy; preserve native owner presentation by default |

`maxHeight` clamps damage scaling; it is not an allowed-fall-height setting. The
server separately bounds movement displacement and descent; native lethal-fall
and blunt-weapon predicates still apply. Core does not require a legs implant or
install a weapon for the user. Cosmetic mode still runs real native eligibility
and contact checks. Effect/sound configuration declares presentation policy;
rendering/audibility requires its separately validated presentation adapter.
The shipped `open77_cyberware` client adapter lays `impactEffect` out as a
centre instance plus a ring of three at `clamp(radius x 0.25, 0.5 m, 1.5 m)`
around the contact point, because the native Quake dust resource behind
`impact.ground_slam` is one small short burst; that is four bounded instances
per impact inside the client's 32-effect cap, using the same catalog key.
Observers within 90 m receive it; the owner only with `effectOnOwner`. The
owner's native impact rumble and `stagger_effect` camera stagger come from the
unmodified native landing update, not from this adapter.

## Replaceable public example

Declare `players.abilities.define`, `players.abilities.manage`, and
`players.abilities.read` in the server resource manifest, and depend on
`open77_cyberware` for the client support. This minimal example grants harmless
Ground Slam to the command issuer. It does not activate it automatically.

```lua
CreateThread(function()
    local result, reason = Open77.abilities.define({
        id="example.quake", version=1, profile="ground_slam",
        config={inputKey="l",allowGround=true,allowAir=true,
            requiredArms=false,requiredLegs=false,
            cosmetic=true,nonlethal=true,damage=0,knockbackMeters=0,
            staminaCost=20,cooldownMs=5000,radius=4,innerRadius=1,
            edgeMultiplier=0.25,heightBonusPerMeter=0,maxHeight=10,
            maxActivationMs=5000,maxFallSpeed=30,
            geometryDeadlineMs=750,maxFloorDelta=0.75,reaction="none"},
    })
    assert(result and result.ok, reason)
end)
RegisterCommand("quake", function(source, args)
    local player=tonumber(source)
    if not player or player<=0 then return end
    local result, reason
    if args[1]=="off" then result,reason=Open77.abilities.revoke(player)
    elseif args[1]=="cancel" then result,reason=Open77.abilities.cancel(player)
    elseif args[1]=="state" then result,reason=Open77.abilities.current(player)
    else result,reason=Open77.abilities.grant(player,"example.quake") end
    print("quake: " .. (result and json.encode(result) or tostring(reason)))
end, false)
```

Use `/quake`, wait for ready projection, equip a native blunt weapon, close UI
capture, then release and press **L** on the ground or in the air. A held key
across grant/UI capture cannot trigger it. Ordinary landing and vanilla quick
melee are not replacement triggers. `/quake off` revokes; `/quake cancel`
interrupts the action; `/quake state` reads the authoritative grant/cooldown.

## Native support API and lifecycle

These operations belong to the calling client resource VM, with automatic
release on VM teardown. Gameplay examples should use the server API and normal
input, not invoke the support owner's native handles.

| Client API | Permission | Result |
|---|---|---|
| `configureSlam({ground,air,staminaManaged,maxDurationMs,maxFallSpeed})` | `player.abilities.project` | Native request handle or nil/reason |
| `slamState(request)` | `player.abilities.read` | pending/ready/failed plus reason |
| `requestSlam(request)` | `player.abilities.project` | Native-generated sequence or nil/reason |
| `approveSlam(request,sequence,allowed)` | `player.abilities.project` | Boolean or nil/reason |
| `cancelSlam(request,sequence,reason)` | `player.abilities.project` | Boolean or nil/reason |
| `slamActivity()` | `player.abilities.read` | Owned native activity or nil/reason |
| `presentSlam(player,activation,phaseSequence,phase,airborne,elapsedMs)` | `player.abilities.project` | Project authoritative observer / owner self-view phase; boolean or nil/reason |
| `releaseSlam()` | `player.abilities.project` | Release owned native lease |

All client calls above are under `Open77.abilities`. The native adapter accepts
500–15000 ms duration and fall speed >0–60; the server's narrower bounds apply
for gameplay. `requestSlam` allocates the sequence, rather than trusting a
caller-selected sequence. A request first becomes pending. Native preflight runs
the original eligibility predicate and reports `eligible` before support emits
any cost-bearing server intent. Pending, prerequisite rejection and preflight
timeout do not ask the server to spend stamina. Pending/eligible/granted share
one 750 ms deadline from the request; eligibility is rechecked before consuming
permission. Only server-managed stamina is supported: configuring
`staminaManaged=false` returns `server_managed_required`. The adapter suppresses its
owned native damage/stamina paths when server managed. Cancellation suppresses
further impact while native descent/recovery can still need time to finish.

Activity contains request/sequence, phase/phaseSequence/impactSequence,
mode, reason, elapsedMs, grounded, position/contact vectors and verticalSpeed.
A bounded nondestructive `history` (up to 16 per-activation receipts) preserves
phases that occur in the same native frame. Each receipt carries its own phase
sequence, elapsed time, position, grounded flag and vertical speed. Support
forwards each unseen receipt once instead of inventing skipped transitions.
Actual phases are pending, eligible, granted, windup, descent, contact, impact, recovery,
complete, cancelled and rejected. Support only forwards observed phases and
matches body, grant revision, native request, input sequence and server activation. Native
lease disappearance, request mismatch or loss of native ready state sends a
negative projection ACK and releases local work, even when a replaced body's
numeric engine ID is recycled. A server grant previously marked ready is not
allowed to conceal that native projection failure.

`presentSlam` uses **age within the current phase**, not the activation's total
elapsed time. Support passes zero on receipt and advances it only for a bounded
250 ms retry of the latest phase. It does not reconstruct missing wind-up or
compensate unmeasured transport latency. Native state alone is not observer
animation proof. Client presentation rejects stale sequence/incarnation context,
cleans up on source life/bucket changes and resource stop, and projects impact
VFX once from phase events rather than duplicate target-result messages. Optional
server impact audio uses the existing three-second one-shot sound service with
owner exclusion by default; that API returns dispatch success, not a stop handle.

The read-only `open77_cyberware` resource export `slamActivity` returns a fresh
sanitized copy without the native request. Await
`Open77.exports.call("open77_cyberware","slamActivity")` inside `CreateThread`.
A direct native read from a lab VM cannot read the support VM's lease.
The separate `slamPresentation` export returns the most recent bounded presentation
receipt (reason, player, activation, phaseSequence and effect), including on an
observer with no own grant. `native_spawn_accepted` establishes API acceptance,
not rendered visibility. `/cyberlab slam activity <player>` awaits both exports;
`activityAvailable=false` does not hide observer presentation evidence.

Capability export metadata lists `implantProfiles` separately from
`abilityProfiles`, protocol 1.28, declared support and explicit `visualProof=false`.

## Authority and geometry

Stamina is charged once and cooldown starts on acceptance, including interrupted
or no-contact actions; no speculative refund writes a guessed pool value. Contact
and delayed native impact are distinct. Server-selected candidates pass existing
combat scope/team/PvP/god-mode/arbitration/DPS and life/body/bucket checks, with
per-target damage and motion results rather than a fabricated all-target success.

The server chooses exact ray IDs/endpoints and a nonce. An owner-only short
contact-floor query precedes candidate work. Each damaging candidate requires
matching owner and target-client geometry; missing, failed, stale, disagreeing
or timed-out evidence fails closed. Lua executes at most four checked native
queries per frame, 32 rays per challenge and 64 queued challenges. Successful
misses differ from invocation/invalid-result failures. This is bounded client
world evidence, not server map physics or cryptographic attestation: colluding
clients can lie. Sampled radial floor support is not connected-mesh proof.

Server-local events `onAbilityActivation`, `onAbilityImpact`,
`onAbilityCancelled`, `onAbilityMotionOutcome` carry player ID and correlated
JSON. Presentation messages include immutable config, bucket, mode,
phaseSequence, elapsedMs and serverTime. Reserved `open77:abilities:*` events
are internal transport, not public activation or arbitrary-victim APIs.

See [native research](../docs/research/native-ground-slam.md),
[authority design](../docs/research/ground-slam-authority-design.md), and
[wire contract](../docs/research/ground-slam-wire-contract.md) for confirmed
source findings and remaining live validation.

## Optional lab workflow

The `open77_cyberware_lab` resource is open-access test policy, with `auto_start false`.
It is not automatically mounted by Freeroam. Start it explicitly on an isolated
local server; normal server owners can replace its policy. `/cyberlab` opens the
rendered panel. Choose **My cyberware** or another player, use **Ground Slam ↓**,
select Harmless or Combat, then Grant. Revoke removes that entitlement; Cancel
action interrupts an activation while keeping the grant. Both basic presets have
no implant prerequisite. Gorilla and Parkour presets add arms or legs requirements.
The lab binds **L**, because the native default **G** overlaps other game actions.
Close the panel before normal input; neither the UI nor the grant activates a slam.

Equivalent public command workflow: `/cyberlab slam grant <player> harmless`,
`/cyberlab slam state <player>`, `/cyberlab slam cancel <player>`, and
`/cyberlab slam revoke <player>`. `diagnostics <player>` logs a bounded server
report (at most 8 KiB); chat receives a short summary. History retains finite
positions and at most eight target outcomes per event with an omitted count.
Current health/stamina values are included; repeated configs are omitted.
