# Cyberware

Cyberware connects persistent implants to native Cyberpunk equipment, multiplayer combat and synchronized presentation. Server creators choose the definitions, grades, progression, prices and access rules. Open77 provides the authoritative transactions and native projection that those rules use.

**Gorilla Arms is the implemented profile.** Start with the [Gorilla Arms tutorial](gorilla-arms.md) for a resource example and the optional clinic and arena. Other powers can build on these foundations, but defining a new name does not add a native adapter for an unsupported power.

## Requirements and responsibilities

Use matching **protocol 1.26** client and server source builds. These guides document the integrated implementation; they do not announce a stable binary release. Earlier minor versions are rejected before authentication; downloading a Lua resource cannot upgrade an incompatible client. Native assets and scripts must match the runtime. The tested Cyberpunk build is 2.31.

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

## Support and limits

The Gorilla workflow has finite two-client coverage for both body families, installation/removal and reconnect, normal/charged combat, native reactions/recovery, representative collision/terrain cases, effects lifecycle and 80/150/250ms impaired-network controls. This does not establish 32-player capacity, every outfit/team combination, exact animation-phase agreement or acoustically verified duplicate-free sound.

Rapid resource restart may overlap native equipment cleanup. Combat stays disabled during failed projection/restoration and the support retries bounded transient refusals. A transient native projection timeout followed by recovery remains recorded. Keep native/client/server resources coordinated and keep definition providers running.

For reproducible evidence and limitations, see the [integration plan](../docs/cyberware-integration-plan.md), [test scenarios](../docs/research/cyberware-test-scenarios.md) and [native research](../docs/research/multiplayer-cyberware-and-abilities.md). Implementation/testing completion does not announce a stable release.
