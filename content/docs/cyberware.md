# Cyberware

Cyberware connects persistent implants to native Cyberpunk equipment, multiplayer combat and synchronized presentation. Server creators choose the definitions, grades, progression, prices and access rules. Open77 provides the authoritative transactions and native projection that those rules use.

**Gorilla Arms is the implemented profile.** Start with the [Gorilla Arms tutorial](gorilla-arms.md) for a resource example and the optional clinic and arena. Other powers can build on these foundations, but defining a new name does not add a native adapter for an unsupported power.

**Gorilla Arms and double-jump legs are the implemented implant slots.** Start
with the [Gorilla Arms tutorial](gorilla-arms.md) for a resource example and the
optional clinic and arena, and see [Double-jump legs](#double-jump-legs) below
for the `legs` / `double_jump` workflow: finite two-client installation,
movement, lifecycle and removal acceptance passed locally on 2026-09-13. Other
powers can build on these foundations, but defining a new name does not add a
native adapter for an unsupported power. The separate native abilities have
their own guides: [Dash / Air Dash](dash.md), [Ground Slam / Quake](ground-slam.md)
and [Hacking and counterplay](hacking.md).

## Requirements and responsibilities

Use matching **protocol 1.33** client and server source builds. These guides document the integrated implementation; they do not announce a stable binary release. Earlier minor versions are rejected before authentication; downloading a Lua resource cannot upgrade an incompatible client. Native assets and scripts must match the runtime. The tested Cyberpunk build is 2.31.

| Layer | Responsibility |
|---|---|
| Your server resource | Register definitions; select grades; validate jobs, consent, distance, costs and progression; request transactions. |
| Character adapter | Bind the authenticated user's server-selected character key. The optional `open77_appearance` adapter supplies this integration. |
| Backend | Own revisions, operation receipts, persistence, combat admission, temporary grants and lifecycle invalidation. |
| `open77_cyberware` client support | Equip/remove native arms, report bounded native actions, project approved appearance and acknowledge native readiness. |
| Presentation policy | Select charge/impact effects and sound through public effects APIs. This policy is independently replaceable. |

Run `open77_cyberware` alongside your character adapter. Use the configured server database; missing storage does not silently become transient success. The backend stores character revisions and durable operation receipts transactionally. Never bind a client-supplied account ID: the account comes from the admitted connection, and the selected character key must come from your trusted character workflow.

The clinic, arena and lab are optional resources with `auto_start false`. Stopping a dependency can stop them too. Restart definition providers after restarting the core: a saved implant can remain visible while combat is disabled because its definition provider is stopped. This preserves paid records without granting unregistered gameplay.

## Server APIs and permissions

Declare only the permissions your resource needs in its manifest. Resource permissions authorize API use; restricted command ACLs and your gameplay checks decide which players may request it.

| API | Resource permission | Purpose |
|---|---|---|
| `Open77.cyberware.define(definition)` | `players.cyberware.define` | Register an owned definition and its grades. |
| `bind(player, characterKey)` / `unbind(player)` | `players.cyberware.identity` | Load/release this resource's authenticated character binding. |
| `current(player)` | `players.cyberware.read` | Read the ready durable record. |
| `effective(player)` | `players.cyberware.read` | Read the ready gameplay record, including an active temporary loadout. |
| `activity(player)` | `players.cyberware.read` | Read fresh server-measured native action/hold state. |
| `install(player, definition, grade, options)` | `players.cyberware.manage` | Stage a durable installation. |
| `remove(player, options)` | `players.cyberware.manage` | Stage durable removal. |
| `cancel(player, ticket)` | `players.cyberware.manage` | Cancel owned staging and request rollback. |
| `newOperationId()` | `players.cyberware.manage` | Generate a durable operation identity. |
| `lease(player, definition, grade, options?)` | `players.cyberware.temporary` | Stage an owned temporary loadout. |
| `releaseLease(player, leaseId)` | `players.cyberware.temporary` | Restore the paid loadout. |
| `leaseState(player)` | `players.cyberware.read` | Read temporary-loadout lifecycle state. |

Calls below the first row use the same `Open77.cyberware` namespace. Failures return `nil, reason`. See the [Cyberware server API](/docs/api/server/open77-cyberware) and [complete server reference](server-api.md) for individual contracts.

## Complete transactions, not just requests

A new install/remove request uses `{expectedRevision=current.revision, operationId=id}`. Obtain `id` from `newOperationId()` and retain it with your server-owned transaction. A successful staging response contains `{ok=true,ticket=...}`. **A ticket means pending work, not a completed installation.**

Listen for the server-local `onCyberwareOperationCompleted(player, ticket, encodedResult)` event. Player IDs follow host string conventions; decode the third argument with server `json.decode`. Match the ticket and player to your own transaction, and require `result.ok == true` before completing it. Temporary operations may also emit this event with a `lease` field; never consume someone else's ticket.

The native owner stages equipment before SQL commit. Observers receive the committed installation after native acknowledgment and storage success. Failure requests restoration of the previous record; a pending or unacknowledged rollback cannot grant combat. A storage completion for a disconnected body does not target its replacement. A commit already underway may complete and load at the next bind.

For RP payments, reserve funds before submission, finalize only on successful completion and compensate failure. Keep the same operation ID and original expected revision when retrying the same intent. Repeating the last committed operation returns `{ok=true}` without another ticket/write; changing its intent returns `operation_conflict`. Do not create a second charge for that retry. Durable economy reservations and receipts belong in your economy service; the example clinic's demonstration credits are in memory.

`cancel` can return `operation_committing` after storage work begins. At that point wait for the durable result instead of promising cancellation. Resource stop cancels owned staging where possible, but does not undo an already committed purchase. Stopping the identity adapter releases its bindings; stopping a definition provider disables runtime grants without deleting implants.

## Temporary loadouts

Use `lease(player, definition, grade, {durationMs=300000})` for an arena or event that should restore the player's paid implant afterward. Duration is 1000–300000 server-monotonic milliseconds, counted from the request. One lease may occupy a character binding; pending purchases and conflicting leases refuse it. Another resource cannot release your lease merely by knowing its ID.

`current` keeps the durable record; `effective` selects the active temporary record. Both return nil while loading/projecting/restoring. A temporary record's revision and operation ID still describe the durable base: do not save it as a purchase. Durable install/remove is refused while a lease exists.

`onCyberwareLeaseChanged(player, encodedState)` contains `id`, `player`, `phase`, `definition`, `grade`, `expiresAt`, `ticket` and `reason`. Normal phases are `pending -> active -> restoring -> ended`; restoration can fail. Match the lease ID. Expiry, owner stop, body/projector loss, disconnect and bucket changes revoke the grant. Restoration remains backend-owned even after the initiating VM stops.

An `ended` event alone can mean the old body disappeared. Before granting another loadout, wait for `leaseState(player) == nil` and `current(player) ~= nil`. A temporary loadout never survives reconnect or silently overwrites the paid implant.

## Combat notifications

These events are server-local; clients cannot forge them through network events. Player IDs are strings. They report accepted backend outcomes, not a request to apply damage again.

| Event | Meaning |
|---|---|
| `onCyberwareMeleeHit(victim, attacker, encodedSnapshot)` | Accepted, unblocked contact, including cosmetic/zero-knockback hits. |
| `onCyberwareMeleeBlocked(victim, attacker, sequence, amount)` | Accepted block; amount is zero for full block or the adjusted chip price before armor absorption. |
| `onCyberwareMotionOutcome(victim, attacker, encodedOutcome)` | Whether an accepted hit requested, skipped or was refused a new reaction. |

Hit JSON contains `sequence`, `incarnation`, `instanceId`, `definition`, `grade`, `charged`, `amount`, `bodyPart` and `lethal`. Identity comes from the admitted action even if the loadout changes before contact. `amount` includes committed armor absorption, not only health loss. Vetoed, duplicate and blocked contacts do not emit the hit event.

Motion-outcome JSON carries the same action identity plus `requestedDistance`, `outcome`, `reason` and `motionId`. `pending` means a request was admitted, not native activation. `skipped` reasons include `zero_distance`, `lethal`, `downed`, `motion_unavailable`, `body_unavailable` and `bucket_mismatch`. `rejected` includes service errors such as `motion_busy`. Skipped/rejected outcomes have no motion ID. Damage can succeed while an existing recovery lease prevents another throw. Correlate the ID with `onPlayerMotionChanged`; do not rely on ordering between different event names.

## Reusable reactions and effects

Server `Open77.motion.knockdown(player, {x=0,y=1,distance=2})` requests a native planar reaction; `cancel(player,id)` cancels the resource's request. Both require `players.motion.control`. `current(player)` requires `players.motion.read`. Direction is normalized and distance is bounded to 0–6m. The body must be ready, alive and unmounted; overlapping leases are refused. Native collisions determine travel, so the requested distance is not an exact endpoint.

The returned `{ok=true,id=...}` starts pending. `onPlayerMotionChanged(player,id,phase,reason)` reports pending/active/ended. Active follows the owner's native PSM-down acknowledgment; it is not server-side visual proof. Native owner requests wait at most 1.5s for consecutive down-state observations. The server reserves a six-second reaction/recovery window after acknowledgment. Cancellation removes owned native state; it does not instantly stop momentum or complete a get-up animation.

The motion validator rejects nonfinite/excessive samples and cancels invalid leases. Its active displacement window is anchored at acknowledgment, after native motion may have begun; it is not exact launch-origin enforcement. Vertical gravity and collisions remain native. Expired observer reactions are not replayed on a newly streamed proxy; persistent arm appearance is restored separately.

The public `Open77.effects` APIs support typed network targets, owned attached leases, expiration, streaming and spatial sound. The Gorilla presentation policy uses `activity`, `effects.attach/remove` and accepted-hit events. Configure or replace that policy without changing installation or damage rules. See the [Gorilla effects configuration](gorilla-arms.md#charge-effects-and-sound) and API reference.

## Client adapter and capability discovery

The [Cyberware client API](/docs/api/client/open77-cyberware) documents the native adapter methods. Ordinary gameplay resources should use server transactions rather than call native projection directly. Trusted client adapters can use:

| Client API | Permission | Contract |
|---|---|---|
| `Open77.cyberware.projectLocal(enabled)` / `localState(request)` | `player.cyberware.project` | Owned equipment request; states pending/ready/failed. |
| `configureLocal(request, grade)` | `player.cyberware.project` | Configure the owned native adapter. |
| `captureArms()` / `attackState()` | `player.cyberware.read` | Read native profiles/actions; no damage authority. |
| `presentArms(networkPlayer, capturedOrFalse)` | `player.cyberware.project` | Apply/remove owned native arm appearance. |
| `Open77.motion.knockdown(localHandle,x,y,distance)` / `state(id)` / `stop(id)` | `player.motion.project` | Native reaction primitives used by support. |

Arm capture returns `{family, groups}` with two sibling canonical groups, each `{part="arms",name=fixedHash,keys={{resourceHash,definitionHash},...}}`. Keep both holstered and drawn profiles from the patient's own capture. Incomplete or cross-family profiles are refused; there is no single-group compatibility fallback. Never send receiver-local entity handles as network identities. Resolve public typed targets through `Open77.vfx.resolveTarget`.

Call the support resource's capability export asynchronously from a running resource on the relevant side:

```lua
CreateThread(function()
    local pending, reason = Open77.exports.call("open77_cyberware", "capabilities")
    if not pending then print(reason); return end
    local capability, callError = pending:await()
    if not capability then print(callError); return end
    print(capability.side, capability.compatibility.protocol)
end)
```

This export is not a core `Open77.cyberware` method. Client and server registries are separate. Results declare adapter support, supported families and tested build 2.31; `actualGameBuild` and `dlcVerification` currently remain `unknown`. Client `localProjection` reports phase/reason/family/equipmentReadback, with `visualProof=false`. Server metadata has `clientReadiness="unknown"`. A ready native readback does not prove rendered appearance, storage completion or a running definition provider.

## Double-jump legs

Definitions select an audited slot/profile pair: `arms` / `gorilla_arms` or
`legs` / `double_jump`. Installing chooses the slot from the definition; it
preserves the other slot. Removal defaults to arms for existing resources:
pass `options.slot="legs"` to remove legs. Only `arms` and `legs` are accepted;
an explicit invalid slot returns `invalid_slot`. `install` does not select a
slot from options. Both slots share the character's revision and operation
ledger, so read the latest `current` record before either mutation.

```lua
assert(Open77.cyberware.define({
  id="myserver.double_jump", version=1, slot="legs", profile="double_jump",
  grades={
    {id="training", normalDamage=0, chargedDamage=0, knockbackMeters=0,
      cooldownMs=800, chargeMs=650, jumpStaminaCost=15,
      maxAirborneMs=10000, maxFallSpeed=30},
  },
}))

-- In your permission-controlled, consent/payment workflow:
local current = Open77.cyberware.current(patient)
if current then
  local operationId = assert(Open77.cyberware.newOperationId())
  local pending, reason = Open77.cyberware.install(patient,
    "myserver.double_jump", "training", {
      expectedRevision=current.revision, operationId=operationId,
    }) -- retain operationId and original expectedRevision on retries
end

-- A separate removal procedure uses a fresh operation ID:
local current = Open77.cyberware.current(patient)
if current then
  local pending, reason = Open77.cyberware.remove(patient, {
    slot="legs", expectedRevision=current.revision,
    operationId=assert(Open77.cyberware.newOperationId()),
  })
end
```

The shared grade schema still validates the existing damage/charge fields;
use zero damage/knockback and a valid `chargeMs` for legs. These fields do not
add punches or a charged-jump ability to a legs implant. The new limits are:

| Grade field | Default | Accepted values / meaning |
|---|---|---|
| `jumpStaminaCost` | 0 | Finite 0-300; canonical server stamina debited once on second-jump admission. Zero is explicitly free. |
| `maxAirborneMs` | 10000 | Integer 100-10000 ms; maximum airborne age when admitting the second jump. |
| `maxFallSpeed` | 30 | Finite 0.1-30 m/s; maximum downward speed when admitting the second jump. |
| `cooldownMs` | Required | Integer 100-600000 ms between accepted second jumps, in addition to one per airtime. |

Limits only narrow native eligibility. They do not change jump height,
trajectory, gravity, fall damage or native collision response. A fall may
continue after the activation window expires. Grades are installed snapshots;
re-registering a definition does not rewrite a paid implant. The optional
`example.double_jump` and `lab.double_jump` definitions use training
(15 stamina, 800 ms cooldown) and athlete (8 stamina, 500 ms cooldown) grades.
Both request the same native jump. Doctor prices are respectively 100 and 250
example clinic credits; legs removal costs 25. Replace those resource policies
independently of the platform API.

### Records and compatible persistence

`current` and `effective` expose `{revision, arms, legs, operationId,
operationSlot}`; absent implants decode as nil. Each implant contains
`instanceId`, `definition`, `definitionVersion`, `profile`, `slot` and the
installed `grade` snapshot. `operationSlot` records the most recent durable
mutation's slot, not the only installed slot. Idempotency checks include it:
reusing an arms-removal receipt for legs removal returns `operation_conflict`.

The storage migration is additive JSON in the existing
`open77_cyberware_v1` / `open77_cyberware_operations_v1` tables. Old records and
receipts without `legs` or `operationSlot` load as nil legs and `"arms"`.
Existing revisions, implant instances and receipts are retained; the next
successful compare-and-swap writes the expanded shape atomically. No bulk
rewrite, table deletion or removal/reinstallation of paid Gorilla Arms is
required. Custom `ICyberwareStore` adapters must preserve both slots and the
operation slot when implementing their atomic revision/receipt transaction.

Temporary leases also use the definition's slot and preserve the other slot.
There remains **one temporary lease per character binding**, not one per slot.
A legs lease cannot overlap an arm lease; all paid install/remove mutations
remain blocked until that lease ends/restores. Paid record identity is unchanged.

### Native input, admission and trust boundary

The adapter equips installed `Items.BoostedTendonsRare` through native `LegsCW`
equipment. Readiness requires matching owned item and `HasDoubleJump` readback
across three bridge polls. It refuses an unrelated leg item or a pre-existing
unowned double-jump capability. Cleanup unequips its owned item and removes an
inventory copy only when this adapter created it. Arms and legs have distinct
native owners/requests and equipment areas; support starts both requests and
acknowledges the whole staged record only after both complete/configure.
Readiness is not rendered proof.

Use the ordinary jump control: take off, release, press again while airborne.
The native double-jump decision checks its original capability, jump-count,
fall-speed, elevator and incompatible-state predicates. Open77 buffers an
eligible press for at most 750 ms while the backend decides. Server admission
requires a ready, alive, unmounted body, available matching definition version,
fresh airborne movement (at most 750 ms old), current incarnation/implant/bucket,
no forced-motion lease, limits, cooldown and sufficient canonical stamina.
At least 150 ms of continuously sampled ground is required to arm/rearm; one
accepted second jump consumes that airtime's allowance. Rejected action
sequences are consumed too, preventing approval or charging on replay.

The reliable intent can arrive before its unreliable movement sample. The host
holds at most one pending request per player for up to 200 ms for movement to
catch up. It then rejects with `movement_timeout` if still unresolved. These
bounds include scheduling and transport costs; there is no guaranteed latency
budget or high-latency playability claim. A late grant still has to pass the
native 750 ms timeout and original predicates. Stamina is charged on server
admission, with no refund if native execution later expires or becomes invalid.
Only the native second-jump stamina debit is suppressed for the managed path;
ordinary jump/movement costs remain native.

The backend validates **authenticated client movement observations**, not an
independent server simulation of the map, floor contact or collisions. A client
approval primitive is for trusted projection resources; it is not a public
server-side `jump()` command or a security boundary against a modified client.
Current movement replication carries native takeoff/double-jump/air/landing
states. This slice adds no network sound/particle overlay, avoiding an extra
presentation producer; native sound/effect behavior and observer fidelity still
require the live controls.

`onCyberwareJump(player, encodedResult)` is a server-local outcome notification.
The player ID follows host string conventions; decode the second argument as
`{sequence,ok,error}`. `ok=true` means admission/stamina pricing, not native
consumption, measured displacement or a rendered jump. Typical refusals include
`implant_unavailable`, `stale_incarnation`, `stale_action`, `stale_movement`,
`movement_timeout`, `bucket_changed`, `motion_busy`, `jump_unavailable`,
`movement_limit`, `cooldown` and `insufficient_stamina`. Malformed/dropped input
need not emit an outcome. Resources observe this event with `AddEventHandler`;
client network messages cannot forge a server-local notification.

### Client legs projector API

These methods operate on the calling resource's local native owner. Use the
bundled support resource for normal installation/activation; another resource
cannot read or approve its private request by guessing its numeric ID.
Failures return `nil, reason`, except `legsState` returns its phase and reason
for a validly shaped native query.

| Call | Permission | Result |
|---|---|---|
| `Open77.cyberware.projectLegs(enabled)` | `player.cyberware.project` | Positive native request ID; `enabled` must be a boolean. |
| `Open77.cyberware.legsState(request)` | `player.cyberware.project` | `"pending"`, `"ready"` or `"failed"`, plus reason. |
| `Open77.cyberware.configureLegs(request, staminaManaged, maxAirborneMs, maxFallSpeed)` | `player.cyberware.project` | true after configuring a ready owned request; argument limits match the grade table. |
| `Open77.cyberware.legsActivity()` | `player.cyberware.read` | `{request,sequence,phase,grounded,airborneMs,verticalSpeed}` or nil/reason. |
| `Open77.cyberware.approveLegJump(request, sequence, allowed)` | `player.cyberware.project` | true if the matching pending native intent accepted the decision; `allowed` is boolean. |
| `Open77.cyberware.releaseLegs()` | `player.cyberware.project` | true after requesting owned cleanup; completion is asynchronous. |

Activity phases are `idle`, `pending`, `granted`, `consumed` and `rejected`.
Sequence is a positive uint32 for a pending action; idle can report zero.
`staminaManaged=true` selects suppression of the native second-jump debit and
requires the server pricing path. Support sets it for installed legs. It is
not a stamina cost argument. Requests are local handles, never network IDs.
Resource teardown invokes owned native cleanup even if Lua callbacks have ended.

Other resources can observe the active support owner through its read-only
`legsActivity` export. It returns a fresh
`{sequence,phase,grounded,airborneMs,verticalSpeed}` table or nil/reason; it omits
native request handles, incarnation and projection tickets. This is a resource
export, not an additional core method:

```lua
CreateThread(function()
  local pending, reason = Open77.exports.call("open77_cyberware", "legsActivity")
  if not pending then print(reason); return end
  local activity, why = pending:await()
  if activity then print(activity.phase, activity.airborneMs)
  else print(why) end
end)
```

The export runs in the support VM that owns the native adapter. Calling the
core `legsActivity()` directly from a different VM cannot inspect that owner's
request. The optional lab uses the export for this reason. Native activity and
`air=double_jumping` movement observations are separate from rendered proof;
`char.state`'s `double` field describes the stand-in body, not `HasDoubleJump`.

Support sends reserved `open77:cyberware:jump {incarnation,sequence}` and accepts
only the matching owner `jumpResult {incarnation,sequence,ok,error}`. It retains
the native request locally and checks it again before approval. Duplicate,
newer-projection, removed-implant and retired-body results cannot grant old work.
No custom doctor or gamemode should forge these platform events.

### Doctor-to-parkour workflow and acceptance

The doctor command defaults stay unchanged. Select legs explicitly with
`/doc offer <patient> training legs` (or `athlete`),
`/doc inspect <patient> legs` and `/doc remove <patient> legs`.
The existing native prompt or `/implantaccept` supplies patient consent;
inspection is private and free. Prices reserve/refund through the same public
completion ticket as arms. Keep both participants alive, nearby and in one
bucket. Removing legs retains the exact arm record. The example clinic wallet
is in memory and resets to 500 credits when its resource restarts; implant
records and operation receipts use durable storage independently.

The optional lab's `cyberlab installlegs <player> <grade> <operation>`
and `removelegs <player> <operation>` use those same server APIs.
`jumpstate <player>` dispatches a read-only native activity log query; it does
not activate movement or certify rendered behavior. All commands remain
replaceable examples, disabled until their resources are explicitly started.
Once the lab is started, `/cyberlab` opens its self/other-player implant panel.
The panel and lab commands are intentionally open to every connected player;
server owners can implement their own restrictions in the example resource.
The panel creates operation IDs and waits for actual installation/removal
completion. The doctor's separate consent/payment and ACL policy is unchanged.

Actual-Lua tests cover combined projection readiness, decision matching/dedupe,
removal/body-change/resource-stop invalidation and doctor slot/payment behavior.
**Finite real two-client workflow passed locally on 2026-09-13**, including
both body families, inspected observer air/landing, repeated activation and
stamina refusal, walls/ceilings/slopes/ledge recovery, Gorilla charged contact
and recovery, death/revive, reconnect, actual proxy streaming and core restart.
Public doctor removal restored ordinary jumps (female 1.0612 m, male 1.0373 m)
with four presses and no extra jump; both original arm records remained exact.
Movement remains client-native and observer interpolation is not exact phase
parity. A standing remote corpse reproduced even after removing legs; death
presentation remains a separate limitation. Audio has event-correlated output
evidence, not a controlled perceptual/spatial parity result.
The [scenario matrix](../docs/research/cyberware-test-scenarios.md) records live
results. Charged jump and visible metal-leg models remain subsequent slices;
a functional native mobility implant does not establish a cosmetic model.

## Support and limits

The Gorilla workflow has finite two-client coverage for both body families, installation/removal and reconnect, normal/charged combat, native reactions/recovery, representative collision/terrain cases, effects lifecycle and 80/150/250ms impaired-network controls. This does not establish 32-player capacity, every outfit/team combination, exact animation-phase agreement or acoustically verified duplicate-free sound.

Rapid resource restart may overlap native equipment cleanup. Combat stays disabled during failed projection/restoration and the support retries bounded transient refusals. A transient native projection timeout followed by recovery remains recorded. Keep native/client/server resources coordinated and keep definition providers running.

For reproducible evidence and limitations, see the [integration plan](../docs/cyberware-integration-plan.md), [test scenarios](../docs/research/cyberware-test-scenarios.md) and [native research](../docs/research/multiplayer-cyberware-and-abilities.md). Implementation/testing completion does not announce a stable release.
