# Complete server Lua API

This page inventories the Lua surface installed by the dedicated server runtime. These functions
exist only in `server_script` and server-side `shared_script` files. The searchable reference labels client and server cards separately; a function
appearing on this page must not be assumed to exist on a client.

Prefer the `Open77.*` names below. FiveM-style globals remain available where listed for familiar
resource code and as the low-level implementation surface.

## Runtime, scheduler, events, commands, and JSON

| Function | Signature | Result / purpose |
|---|---|---|
| `CreateThread` | `(function)` | Schedule a coroutine in this resource. |
| `GetGameTimer` | `()` | Process-monotonic milliseconds used by the server scheduler. |
| `Wait` | `(milliseconds)` | Yield the current managed coroutine; accepted range is 0–86,400,000 ms. |
| `SetTimeout` | `(milliseconds, function)` | Schedule a one-shot callback and return its timer ID. |
| `ClearTimeout` | `(timerId)` | Cancel a scheduled timeout. |
| `AddEventHandler` | `(event, handler)` | Register a local handler and return its ID. |
| `RemoveEventHandler` | `(handlerId)` | Remove a local or network handler. |
| `TriggerEvent` | `(event, ...)` | Publish host-wide: every running resource that handles `event` receives it. `true`, or `false, reason`. |
| `TriggerLocalEvent` | `(event, ...)` | The pre-bus behaviour: this VM's handlers only, nothing marshalled, no reserved-name filter. |
| `TriggerCancellableEvent` | `(event, ...)` | Publish host-wide as cancellable and return a verdict handle, or `nil, reason`. |
| `CancelEvent` | `()` | Inside a cancellable handler, veto the event. `true`, or `false, "not_in_cancellable_event"`. |
| `WasEventCanceled` | `()` | Inside a cancellable handler, whether an earlier handler already vetoed it. |
| `RegisterNetEvent` | `(event, handler?)` | Register an authenticated client event; requires `network.events`. |
| `TriggerClientEvent` | `(event, playerId|-1, ...)` | Send to one session or broadcast; requires `network.events`. |
| `RegisterCommand` | `(name, handler, restricted?)` | Register a server/chat command. Restricted commands require ACL `command.<name>`. |
| `GetCurrentResourceName` | `()` | Return this manifest's resource name. |
| `GetResourceState` | `(resourceName)` | Return the current server resource state. |
| `print` | `(...)` | Write a resource-prefixed server log entry. |
| `json.encode` | `(value)` | Serialize a bounded Lua value to JSON. |
| `json.decode` | `(text)` | Decode JSON into safe Lua values. |

Limits are 1,024 scheduled tasks and 2,048 handlers per resource. Network events accept at most 32
arguments in a 48 KiB JSON envelope. During a network handler, global `source` is set from the
authenticated connection, never from client payload data.

### The host-wide event bus

`TriggerEvent` is the server counterpart of the client bus: the event reaches every running
resource that registered a handler for that name, including the publisher itself. This is what
lets a framework be a core plus modules — `chat:message`, `esx:playerLoaded`-style events and
`chatMessage` all work across resources.

Delivery is **queued, never re-entrant**. Publishing appends to the host's queue; the host drains
it at the next tick boundary and pushes the event into each VM in resource-name order, so one
resource's C function never re-enters another resource's Lua state and one resource's error
cannot abort the fan-out. Ordinary events are then scheduled in each target's own scheduler, so a
handler may `Wait`.

Arguments cross **by value**, through the same marshaller as server exports: at most 32 values,
4,096 nodes, depth 16, 48 KiB total. Functions, userdata, cyclic tables and non-finite numbers are
refused. No Lua object is shared between VMs, so mutating a table after publishing it changes
nothing for the receivers. Failure tokens: `invalid_event_name`, `reserved_event`,
`resource_stopping`, `resource_preparing`, `event_argument_limit`,
`event_payload_not_serializable`, `event_queue_limit`.

`source` is **not** propagated across the bus. A publisher that wants the receivers to know which
player caused the event passes the id as an argument, the way `chat:message(source, name, text)`
does. Handlers registered with `RegisterNetEvent` also receive host-wide events, exactly as on the
client, so a handler that acts on authority must validate `source` rather than assume it.

`TriggerLocalEvent` keeps the behaviour `TriggerEvent` had before the bus existed: this VM's
handlers only, no marshalling, no reserved-name filter. Use it for a resource's own internal
signalling. `Open77.events.emitLocal` is the namespaced alias.

**Reserved names.** The platform's own vocabulary cannot be published host-wide by a resource;
`TriggerEvent` and `TriggerCancellableEvent` answer `false, "reserved_event"` (`nil,
"reserved_event"` for the cancellable form). Reserved are the exact names `onResourceStart`,
`onResourceStop`, `onPlayerConnecting`, `onPlayerConnected`, `onPlayerDisconnected`,
`onPlayerReady`, `onPlayerRejected`, `onPlayerBucketChange`, `onPlayerAnimationChanged`,
`onPlayerMotionChanged`, `onPlayerLifeStateChanged`, `onPlayerLifeTransitionFailed`,
`onEntityBucketChange`, `onRoutingBucketPolicyChange`, `onLootPickup`, `onTunableChanged`,
`onEnvironmentChanged`, `onPropCreated`, `onPropRemoved`, `onEffectCreated`, `onEffectRemoved`,
`onLootCreated`, `onLootRemoved`, `onEntityCreated`, `onEntityRemoved`,
`playerDropped`, `playerJoining`, `open77:combatAnomaly`, plus the prefixes `__open77`,
`onVehicle`, `onNpc`, `onElevator`, `onCyberware`, `onAbility`, `open77:resource:`,
`open77:player`, `open77:clothing:`, `open77:weapons:`, `open77:vehicles:ai:` and
`open77:admin:`. Everything a
resource legitimately publishes stays open, including `open77:weather:*`, `open77:loot:*`,
`open77:appearance:*` and `chat:*`. `TriggerLocalEvent` is deliberately unfiltered: inside its own
VM a resource can only fool itself.

No permission is required to publish or to receive, exactly as on the client and in FiveM. What
protects the platform is the reserved list, not a capability.

### Cancellable events

Only events published with `TriggerCancellableEvent` can be vetoed; an ordinary `TriggerEvent`
ignores `CancelEvent()`. Cancellable handlers run **inline** during the drain, in resource-name
order and then in registration order, so `Wait` is not available inside one. Every handler still
runs after a veto — FiveM semantics — and a later handler reads the verdict with
`WasEventCanceled()`.

The publisher reads the verdict through the handle it got back. It settles one tick later, when
every running resource has been offered the event:

```lua
local verdict = TriggerCancellableEvent("chatMessage", source, name, text)
if verdict ~= nil and verdict:await() then return end   -- a handler vetoed it
```

| Handle method | Result |
|---|---|
| `verdict:await()` | `true` when a handler cancelled, `false` otherwise. Needs a managed coroutine; answers `false, reason` outside one. |
| `verdict:canceled()` | The verdict once settled, or `nil, status` while still pending. |
| `verdict:status()` | `pending`, `settled` or `unknown` (released or expired). |

A verdict that nobody reads is forgotten 30 seconds after it settles.

### Resource lifecycle events

Four events describe a resource transition, and every running resource receives all
four. They differ in what they carry, not in who hears them.

| Event | Signature | Emitted |
|---|---|---|
| `onResourceStart` | `(resourceName)` | Once per start, into every running resource. The resource that started gets it from its own VM before any other resource is told; every other resource gets it on the next tick. |
| `onResourceStop` | `(resourceName, reason)` | Once per stop, into every running resource. The resource that stopped gets it from its own VM, with `reason` (`manual`, `restart`, `reload`, `dependency_stopped`, `runtime_error`, `shutdown`), while it can still run code. |
| `open77:resource:started` | `(resourceName, revision)` | Beside `onResourceStart`, with a revision. |
| `open77:resource:stopped` | `(resourceName, revision)` | Beside `onResourceStop`, with a revision. |

Guard on the name when you mean your own resource, which is the common case:

```lua
AddEventHandler("onResourceStart", function(name)
    if name ~= GetCurrentResourceName() then return end
    -- this resource is up
end)
```

A reload is a stop and a start for every other resource, and neither for the resource
being reloaded: its outgoing VM already ran `onResourceStop(name, "reload")` and its
incoming VM already ran `onResourceStart(name)`. No resource is ever told about its own
transition twice.

Use local handlers for optional cross-resource lifecycle adapters; peer events in the
`open77:resource:` namespace are discarded, so a client cannot forge one. A queued event
describes the transition, so check `GetResourceState(name)` when current availability
matters (a stop/start can occur before the next tick). Revisions increase for every host
transition. Remember the newest revision per resource and ignore older notifications:
scheduler order is not a lifecycle guarantee.

The [cyberware API](cyberware.md) separates definition, identity, management and
read permissions. Use the [Gorilla Arms walkthrough](gorilla-arms.md) for a complete
resource example; installation completion is asynchronous.
It supports coexisting `arms` / `gorilla_arms` and `legs` / `double_jump`
definitions. Install chooses the definition's slot; remove defaults to arms and
accepts `options.slot="legs"`. Both use one character revision/receipt ledger.
`onCyberwareJump(player, encodedResult)` reports second-jump admission as
`{sequence,ok,error}`, not native movement completion. See the linked reference
for limits, additive persistence migration, client projection APIs and the
original protocol 1.27 boundary. Current combined protocol and validation are
recorded in the [Dash checkpoint](../docs/dash-checkpoint.md).

The [Dash / Air Dash API](dash.md) adds `Open77.dash.define`, `grant`, `revoke`,
`cancel`, `current` and `capabilities`. It uses separate `players.dash.define`,
`players.dash.manage` and `players.dash.read` permissions, session capabilities
and the existing cyberware identity. It never purchases or replaces an implant.
`current(player).ownedByCaller` reports exact caller ownership across projection
restarts without exposing the resource owner name.
`onDashChanged` reports correlated activation phases; `onDashRejected` reports
admission failure. Native movement and multiplayer acceptance remain pending.

The [reflex overdrive API](reflex-overdrive.md) adds `Open77.reflex.define`,
`grant`, `revoke`, `cancel`, `current` and `capabilities`, under separate
`players.reflex.define`, `players.reflex.manage` and `players.reflex.read`
permissions. It is a bounded real-time speed/handling buff on its owner: it
slows no bullet, slows no other player, and changes no clock anywhere. A
definition picks one of two client-owned stat tiers and its economy; it can
never name a stat or a modifier. `onReflexChanged` reports correlated activation
phases; `onReflexRejected` reports admission failure. Multiplayer acceptance is
pending.

The [Ground Slam API](ground-slam.md) provides `Open77.abilities.define`, `grant`,
`revoke`, `cancel` and `current`, controlled by `players.abilities.define`,
`players.abilities.manage` and `players.abilities.read`. Combined movement
admission includes Dash/Slam recovery and forced motion; grants compose with
the existing implant ledger.

The [hacking API](hacking.md) adds permission-controlled `Open77.hacking` and
`Open77.statuses` services for definitions, admission, Self-ICE, purge, statuses
and owned protection policies. Matching implants share the existing cyberware
ledger in `operating_system`, `self_ice` and `purge` slots. The optional lab is
disabled by default. `onHackingTransition` carries platform-owned upload/status
notifications; it cannot be synthesized through resource/network events.

The namespaced equivalents are:

| Function | Signature |
|---|---|
| `Open77.runtime.luaVersion` | `()` |
| `Open77.time.monotonic` | `()` — monotonic seconds |
| `Open77.time.unix` / `GetUnixTime` | `()` — wall-clock seconds since 1970 UTC, fractional |
| `Open77.time.utc` / `GetUtcTimestamp` | `()` — the same instant as an ISO 8601 string |
| `Open77.resource.name` | `()` |
| `Open77.resource.state` | `(resourceName)` |
| `Open77.events.on` / `off` / `emit` | Same as `AddEventHandler`, `RemoveEventHandler`, `TriggerEvent` |
| `Open77.events.emitLocal` | Same as `TriggerLocalEvent` |
| `Open77.events.emitCancellable` | Same as `TriggerCancellableEvent` |
| `Open77.events.cancel` / `wasCanceled` | Same as `CancelEvent`, `WasEventCanceled` |
| `Open77.net.on` / `emitClient` | Same as `RegisterNetEvent`, `TriggerClientEvent` |
| `Open77.net.register` / `unregister` | `(name, handler(source, ...))` — answer a client's `Open77.net.call`; `source` is the authenticated player id |
| `Open77.net.callClient` / `callClientAwait` | `(playerId, name \| {name=, timeout=}, ...)` — ask one client a question, returns an `Open77.Promise` |
| `Open77.callbacks.*` | Alias table for the four callback functions above |

### Entity lifecycle events

Five registries create and remove server-owned entities, and each announces its own
creations and removals. A sixth pair, `onEntityCreated` / `onEntityRemoved`, summarises all
five for a resource that cares about the host rather than one domain — FiveM's
`entityCreated` and `entityRemoved`.

| Kind | Created | Removed | Capability |
|---|---|---|---|
| `vehicle` | `onVehicleCreated(id, resource, record)` | `onVehicleRemoved(id, reason)` | none |
| `npc` | `onNpcCreated(id, resource, template)` | `onNpcRemoved(id, reason, resource)` | none |
| `prop` | `onPropCreated(id, resource, model)` | `onPropRemoved(id, reason, resource)` | `world.props` |
| `effect` | `onEffectCreated(id, resource, effect)` | `onEffectRemoved(id, reason, resource)` | `world.effects` |
| `loot` | `onLootCreated(id, resource, item)` | `onLootRemoved(id, reason, resource)` | `world.loot` |
| any | `onEntityCreated(kind, id, resource)` | `onEntityRemoved(kind, id, reason)` | `world.entities.observe`, **plus** the kind's own |

`reason` is the registry's own token — `removed`, `expired`, `resource_stopped`, and for loot
also `picked_up` and `moved_bucket` — or the free text (≤ 64 characters) the caller passed to
`Open77.props.remove(id, reason)` and its siblings. `onVehicleRemoved` carries a numeric
engine reason and, alone in the table, no owner: it predates the three-argument convention and
widening it would change a payload resources already read.

**The per-registry event is authoritative; the generic one is a projection of it.** Both are
raised by the same statement inside the host, so they cannot disagree about an id, an owner or
a reason — there is no second observer of the registry that could be stopped, filtered or
reordered on its own. When a resource handles both, the specific event runs first and the
mirror second; `EntityLifecycleEventsLuaTests` pins that order, so a scheduler change fails a
test rather than silently reordering a spawn.

```lua
-- open77.lua
permissions { "world.props", "world.entities.observe" }

-- server/main.lua: one ledger, whatever spawned it
AddEventHandler("onEntityCreated", function(kind, id, resource)
    print(("%s %s appeared, owned by %s"):format(kind, id, resource))
end)

AddEventHandler("onEntityRemoved", function(kind, id, reason)
    if reason == "expired" then print(("%s %s timed out"):format(kind, id)) end
end)
```

**The mirror carries no authority of its own.** `world.entities.observe` is an opt-in, not a
key: an event about a prop still costs `world.props`, because reading one does
(`Open77.props.list()` answers `permission_denied:world.props` without it) and a lifecycle
event that announced the prop anyway would route around that capability. So the generic feed
is exactly the union of what a resource could already see, under one name — never more. A
resource holding only `world.entities.observe` sees vehicles and NPCs, whose per-registry
events were never gated, and nothing else.

The opt-in exists because the feed is every registry at once. A resource that wants NPC
lifecycle should not be handed every ground drop on the server as a side effect, and a
host-wide firehose nobody asked for is a cost paid by every VM on every spawn.

**There is no `onPropUpdated`, `onEffectUpdated` or `onLootUpdated`**, and no generic
`onEntityUpdated`. An attached prop or effect republishes as it follows its target, so an
update event would be a per-tick firehose for a value `Open77.props.get(id)` answers on
demand. Creation and removal are the two transitions a resource cannot poll for without
missing one. `onVehicleUpdated` and `onNpcUpdated` remain, revision-carrying, for the two
registries that shipped with them.

**FiveM's `entityCreating` is deliberately absent.** It is a cancellable *pre*-event, and
answering it would mean running another resource's Lua handler from inside the create call —
re-entering a second `lua_State` from a first one's C function, which is the single invariant
the whole event bus exists to prevent. A resource that must veto a creation owns the create
call instead: the entity is its own.

All eight new names are reserved. A forged `onEntityRemoved` is the cheaper attack of the
pair: it makes a cleanup or inventory resource forget an object that is still in the world.

## Network callbacks

A callback is a net event with an answer: the client asks with
`Open77.net.call`, this VM answers from `Open77.net.register`, and the reverse
direction runs through `Open77.net.callClient`. It needs the same
`network.events` permission as a net event and grants nothing more — a handler
must re-validate distance, ownership and permission exactly as a
`RegisterNetEvent` handler does. See [Network callbacks](callbacks.md) for both
directions, the per-resource namespacing, timeouts, limits and failure reasons.

## Reload-surviving resource state

`Open77.state` holds **one value per resource**, so that a reload can pick up where the previous VM
left off. It is not a key-value store, and it is not persistence: think of it as the note a resource
leaves for its own successor.

| Function | Signature | Result / purpose |
|---|---|---|
| `Open77.state.save` | `(value)` | Store; `nil` clears. `true`, or `false, reason`. |
| `Open77.state.load` | `()` | The last stored value, or `nil` on a fresh start. |
| `Open77.state.clear` | `()` | Drop the stored value; the same as `save(nil)`. |

No permission is required. Three properties decide how it is used:

- **Call `save` when the state changes, not on stop.** A reload prepares the successor VM *before*
  stopping this one, so a write from a stopping resource is refused and returns `false`.
- **It survives a reload, and deliberately not a stop.** `stop`, `restart` and `refresh` drop it, so
  an operator keeps a way to say "come up as you would at boot", and the server re-asserts its
  `startup.commands` for a resource that starts carrying nothing.
- **The value is round-tripped through JSON by the host.** Store plain data: functions, coroutines
  and metatables do not survive, and cycles are rejected with `unserialisable_state`.

```lua
local round = Open77.state.load() or { number = 0, scores = {} }
round.number = round.number + 1
Open77.state.save(round)
```

## Cyberware and living motion

Requires paired protocol **1.26** clients/server and the shipped native Gorilla
adapter; this release supports `slot="arms"`, `profile="gorilla_arms"`. It does
not expose an implemented legs/jump power. Server mutations are synchronous
admission calls returning a result table or `nil, reason`, not Promises. Native
projection, persistence and restoration complete later. Read methods return a
table or nil when unavailable; distinguish nil readiness from an empty `arms`.

| Function | Signature | Permission | Purpose |
|---|---|---|---|
| `Open77.cyberware.current` | `(playerId)` | `players.cyberware.read` | Read the ready durable implant record. |
| `Open77.cyberware.effective` | `(playerId)` | `players.cyberware.read` | Read the ready implant including an active temporary loadout. |
| `Open77.cyberware.activity` | `(playerId)` | `players.cyberware.read` | Read fresh authoritative Gorilla charge activity. |
| `Open77.cyberware.leaseState` | `(playerId)` | `players.cyberware.read` | Read a temporary loadout lease and restoration phase. |
| `Open77.cyberware.newOperationId` | `()` | `players.cyberware.manage` | Create an operation ID to retain across durable retries. |
| `Open77.cyberware.define` | `(definition)` | `players.cyberware.define` | Register resource-owned Gorilla Arms grades. |
| `Open77.cyberware.bind` | `(playerId, character)` | `players.cyberware.identity` | Bind the authenticated player to a server-selected durable character. |
| `Open77.cyberware.unbind` | `(playerId)` | `players.cyberware.identity` | Release this resource's character binding and runtime grants. |
| `Open77.cyberware.install` | `(playerId, definition, grade, options)` | `players.cyberware.manage` | Stage a durable Gorilla Arms installation. |
| `Open77.cyberware.remove` | `(playerId, options)` | `players.cyberware.manage` | Stage a durable Gorilla Arms removal. |
| `Open77.cyberware.cancel` | `(playerId, ticket)` | `players.cyberware.manage` | Cancel an owned installation/removal before durable commit. |
| `Open77.cyberware.lease` | `(playerId, definition, grade, options?)` | `players.cyberware.temporary` | Stage a temporary implant without overwriting paid state. |
| `Open77.cyberware.releaseLease` | `(playerId, lease)` | `players.cyberware.temporary` | Release this resource's temporary loadout and restore paid arms. |
| `Open77.motion.current` | `(playerId)` | `players.motion.read` | Read an authoritative living-motion lease. |
| `Open77.motion.knockdown` | `(playerId, options)` | `players.motion.control` | Request bounded native living-player motion. |
| `Open77.motion.cancel` | `(playerId, id)` | `players.motion.control` | Cancel this resource's authoritative motion lease. |

`newOperationId()` returns a string; definition/identity/manage calls return
`{ok=true,error=nil,ticket?,lease?}`. `install` and `remove` require
`options={expectedRevision=record.revision,operationId=retainedOperationId}`.
Retain the same ID and contents across retries. Correlate
`onCyberwareOperationCompleted(playerId,ticket,encodedResult)` with the pending
player and ticket; decode the JSON result and check `ok`/`error`. A queued ticket
is not a committed purchase or visual proof. A completed idempotent retry may
return success without a new ticket. Do not refund submitted storage work merely
because native presentation is delayed; `cancel` can return `operation_committing`.

`current()` reads durable `{revision,arms,operationId}`; `effective()` substitutes
an active temporary arms snapshot while retaining the durable revision/receipt.
`lease` accepts `durationMs=1000..300000` (default300000), returns
`{ok=true,lease,ticket}`, and restores paid state on release/expiry/lifecycle loss.
`onCyberwareLeaseChanged(playerId,encodedState)` carries
`id,player,phase,definition,grade,expiresAt,ticket,reason`. Wait for matching
`active` before enabling combat; `ended` after body loss alone does not prove
paid native restoration. Identity adapters alone select the authenticated user's
character. Restart a stopped definition provider before expecting its persisted
implants to grant combat again.

`Open77.motion.knockdown` returns `{ok=true,id}` after admission, not damage or
actual movement. `onPlayerMotionChanged(playerId,id,phase,reason)` reports
`pending`, `active`, `ended`; the owner native acknowledgement starts the bounded
six-second server ownership window. Requested travel0..6 m is collision-dependent,
not an exact-distance teleport. Cancellation requests cleanup without instantly
freezing momentum. The snapshot validator uses ACK-time bounds rather than the
exact native launch origin. See the runtime-separated searchable cards for
native client projection primitives; server scripts never send local entity
handles over the network.

The related public foundations are
`Open77.combat.createScope({bucket,players})` / `removeScope(id)` with
`combat.scope.control`, and `Open77.effects.attach(target,effect,options)`,
`playOn(target,event,options?)`, `sound(target,event,options?)` with `world.effects`.
Scopes do not bypass team/life/Lua veto rules. Effects use typed network target
IDs and native lifetime guards. `sound` supports an opaque `actionId` and
`excludePlayers` to avoid adding network sound for listeners already hearing the
native contact. These are configurable presentation rules, not extra damage.

Low-level globals backing related namespaced APIs:

| Global | Signature | Permission and result |
|---|---|---|
| `AttachEffect` | `(targetId,kind,effect,slot,localAnchor,localSlot,ttlMs?,radius,hysteresis,localEvent?,soundEvent?,soundOnOwner?)` | `world.effects`; decimal effect ID or nil/reason. Prefer `Open77.effects.attach`. |
| `SetPlayerDownedDamageable` | `(playerId,enabled)` | `players.stats.apply`; boolean/reason. Also exposed as `Open77.stats.setDownedDamageable`. |
| `VehicleDrivingCommand` | `(operation,vehicleId,options?)` | `world.vehicles`; driving-state table or nil/reason (state may be nil when absent). Prefer [vehicle AI methods](vehicle-ai.md). |

## Cross-resource exports

Server exports use the same asynchronous publish/call/await surface as client
exports, but only reach other server VMs in the same host. See
[Cross-resource server exports](server-exports.md) for the complete two-resource
example, value limits, permissions, cancellation and reload behavior.

| Function | Signature | Result / purpose |
|---|---|---|
| `exports` | `(name, function)` | Publish or replace a server export; true or nil/reason. Indexed rather than called it is also the synchronous proxy: `exports.other:name(...)` and `exports['other-resource']:name(...)` run that export inline and return its values, or raise. Neither `exports` nor a proxy accepts assignment. |
| `Open77.exports.callSync` | `(resourceName, exportName, ...)` | The same synchronous call without the sugar, for when the export name is in a variable. Raises on failure rather than answering `nil, reason`; wrap it in `pcall`. |
| `GetInvokingResource` | `()` | Immediate caller resource name inside an exported coroutine; nil outside it. |
| `GetInvokingResourceGeneration` | `()` | Immediate caller's VM generation inside an exported coroutine; nil outside it. |
| `GetCurrentResourceGeneration` | `()` | Opaque generation identity of this server VM, changed on restart/reload. |
| `Open77.resource.generation` | `(resourceName?)` | This VM's generation when omitted; another running server resource's generation, or 0 if unavailable. |
| `Open77.exports.call` | `(resourceName, exportName, ...)` | Promise for a deferred server export; nil/reason if dispatch is refused. Call only from a running resource, not during preparation. |
| `Open77.Promise.await` | `()` | Use `promise:await()`: copied return values, or nil/reason on rejection. A pending call requires a managed coroutine. |
| `Open77.Promise.status` | `()` | Use `promise:status()`: pending, resolved, rejected or cancelled. |

The provider retains its own native permissions and data ownership. Validate
`GetInvokingResource()` before exposing privileged operations. Arguments never
supply caller identity, and the exported coroutine does not inherit player
`source`. Exports are the request/response channel; `TriggerEvent` is the
fire-and-forget broadcast channel and reaches every resource.

## Resource-local file IO

`Open77.io` is server-only persistent text storage rooted at the calling resource's
`data/` directory. Paths are relative to that directory; absolute paths, `..` escapes and
reparse-point traversal are rejected. The Lua standard `io` library remains removed from the
sandbox. This API cannot read another resource, the server configuration, or rewrite its own
manifest and scripts.

| Function | Permission | Result / purpose |
|---|---|---|
| `Open77.io.read` | `filesystem.read` | `(path) -> contents` or `nil, reason`. |
| `Open77.io.readJson` | `filesystem.read` | `(path) -> value` or `nil, reason`; decodes with the bounded Open77 JSON codec. |
| `Open77.io.exists` | `filesystem.read` | `(path) -> boolean` or `nil, reason`. |
| `Open77.io.list` | `filesystem.read` | `(directory?) -> { { name, type, size? }, ... }` or `nil, reason`; non-recursive and sorted. |
| `Open77.io.stat` | `filesystem.read` | `(path) -> { name, type, size?, modifiedUtc }` or `nil, reason`. |
| `Open77.io.write` | `filesystem.write` | `(path, contents) -> boolean, reason?`; atomically replaces a UTF-8 text file. |
| `Open77.io.writeJson` | `filesystem.write` | `(path, value) -> boolean, reason?`; encodes then writes atomically. |
| `Open77.io.append` | `filesystem.write` | `(path, contents) -> boolean, reason?`. |
| `Open77.io.makeDirectory` | `filesystem.write` | `(path) -> boolean, reason?`; creates missing parents. |
| `Open77.io.remove` | `filesystem.write` | `(path) -> boolean, reason?`; removes one file, never a directory tree. |
| `Open77.io.move` | `filesystem.write` | `(source, destination, overwrite?) -> boolean, reason?`. |
| `Open77.io.copy` | `filesystem.read` + `filesystem.write` | `(source, destination, overwrite?) -> boolean, reason?`. |

Each file is limited to 4 MiB, a directory listing to 2,048 entries, and a relative path to
512 UTF-8 bytes. `readJson` / `writeJson` additionally inherit the JSON codec's 48 KiB and depth
limits. Stable refusals include `permission_denied:filesystem.read`,
`permission_denied:filesystem.write`, `invalid_path`, `path_outside_resource`,
`reparse_point_denied`, `not_found`, `not_a_file`, `not_a_directory`, `already_exists`,
`file_too_large`, `too_many_entries`, and `io_error`.

```lua
local course = assert(Open77.io.readJson("courses/watson-loop.json"))
course.revision = (course.revision or 0) + 1
assert(Open77.io.writeJson("courses/watson-loop.json", course))
```

## Resource key/value store

`Open77.kvp` is the small typed store between "parse a file yourself" and "stand up MariaDB": a
jail timer, a shop's till, a vote count. The surface is the client store's, function for function
and reason token for reason token, so a shared script behaves the same wherever it runs.

| Function | Signature | Result |
|---|---|---|
| `Open77.kvp.set` | `(key, value)` | `true`, or `false, reason`. Values are string, integer, number or boolean. |
| `Open77.kvp.get` | `(key, default?)` | The stored value, else `default`, else `nil`. |
| `Open77.kvp.has` | `(key)` | `boolean`. |
| `Open77.kvp.delete` | `(key)` | `true` when removed, `false` when absent. |
| `Open77.kvp.find` | `(prefix?, limit?)` | Array of `{ key, value, type }`, ordinal-sorted. |
| `Open77.kvp.keys` | `(prefix?, limit?)` | The same, keys only. |
| `Open77.kvp.clear` | `(prefix?)` | How many were removed. |
| `Open77.kvp.increment` | `(key, delta?)` | The new number. |
| `Open77.kvp.setIfAbsent` | `(key, value)` | `true` when it inserted. |
| `Open77.kvp.compareAndSet` | `(key, expected, replacement)` | `true` when it exchanged. |
| `Open77.kvp.stats` | `()` | `{ entries, bytes, maximumEntries, maximumBytes, maximumKeyBytes, maximumValueBytes, resource }` |

`SetResourceKvp` / `GetResourceKvp` / `DeleteResourceKvp` are the same three bare globals the
client publishes. FiveM's typed variants (`SetResourceKvpInt`, `GetResourceKvpFloat`, ...) are
deliberately absent: each is one line of Lua in a porting shim, and spelling the two Open77
runtimes identically is worth more than matching FiveM on a side that never had the API.

**It takes no capability, and that is the point.** The store is one JSON file under the calling
resource's own `data/` directory and the file name is a constant: no caller-supplied path reaches
it, so a resource cannot address another's store. That is strictly less reach than `Open77.io`,
which does take a path and does sit behind `filesystem.read` / `filesystem.write`. Gating the safer
surface would only push authors toward the more dangerous one.

Quotas are the client's numbers exactly — 256-byte keys, 64 KiB values, 4,096 entries, 1 MiB of
payload — because "the server happened to allow a larger value" is a bug that only appears in
production. Refusals: `invalid_key`, `value_too_large`, `invalid_number`, `unsupported_value_type`,
`nil_value`, `entry_quota_exceeded`, `byte_quota_exceeded`, `invalid_limit`, `delta_not_numeric`,
`value_not_numeric`, `integer_overflow`, `number_overflow`, `storage_read_failed`,
`storage_write_failed`, `storage_corrupt`. A refused write leaves the store exactly as it was.

Three properties worth knowing before you rely on it:

- **Integer and number stay apart.** A counter read back from disk is still an integer, and
  `compareAndSet` compares typed — an integer `1` does not satisfy an expectation written `1.0`.
- **`increment` and `compareAndSet` are atomic** in the sense that matters here: the server Lua
  runtime is one thread, so a read-modify-write cannot interleave with another resource's.
- **Writes are coalesced onto the tick** and flushed again when the resource stops, so an orderly
  stop, reload or restart loses nothing and a hard kill loses at most one tick of mutations. A
  store that cannot be parsed reports `storage_corrupt` and is never overwritten with a fresh one,
  so a bad file is a problem you can look at rather than state you have already lost.

```lua
-- Claim a jail cell without a database, and count the arrest.
if Open77.kvp.setIfAbsent("cell.3", GetPlayerIdentifier(source)) then
    Open77.kvp.set("cell.3.releaseAt", GetUnixTime() + 600)
    Open77.kvp.increment("stats.arrests")
end

-- Release it only if we are still the occupant.
Open77.kvp.compareAndSet("cell.3", GetPlayerIdentifier(source), nil)
```

Reach for `Open77.database` instead when the data must be queried, joined, shared between servers,
or survive the resource directory being redeployed.

## Convars

`GetConvar`, `GetConvarInt`, `GetConvarBool` and `SetConvar` exist so a resource ported from FiveM
runs without its configuration layer being rewritten first. **They are a compatibility shim, and
`Open77.tunables` above is the better mechanism on every axis that matters:** a tunable is declared
with a type and a range, validated on every write, retunable by the operator from the Warden panel
while the server runs, persisted across a restart, scoped to the declaring resource, and it tells
its owner when it changed. A convar is an untyped string with none of that.

Reach for a convar when you are porting. Reach for a tunable when you are writing.

| Function | Signature | Result |
|---|---|---|
| `GetConvar` | `(name, default?)` | The string, or `default`. |
| `GetConvarInt` | `(name, default?)` | The integer, or `default`. |
| `GetConvarBool` | `(name, default?)` | The boolean, or `default`. |
| `SetConvar` | `(name, value)` | `true`, or `false, reason`. |

`Open77.convars.get / getInt / getBool / set` are the same four function values under namespaced
names. None of them takes a capability.

**A getter never raises.** An unset convar, or one holding a value that does not parse as the type
asked for, answers the caller's default. A ported script depends on that without ever saying so,
and a strict parse would turn a missing setting into a crash on the first frame.

Resolution order, and the third step is the useful one:

1. an in-memory `SetConvar` override, **server-wide** — a write in one resource is visible to a read
   in another, which is what the FiveM code being ported assumes, and exactly why a convar is a poor
   place for anything two resources might both want to own;
2. the `convars` block of `server.jsonc`;
3. **this resource's own declared tunables, by exact key.** A port that reads
   `GetConvar("patrol_radius")` finds the operator's tunable of that name, so a resource migrates to
   the better mechanism one key at a time instead of all at once;
4. the caller's default.

```jsonc
// server.jsonc
"convars": {
  "sv_hostname": "Night City RP",
  "sv_maxPlayers": "48",
  "sv_scriptHookAllowed": "false"
}
```

`SetConvar` is **in memory only**: the value is gone on the next restart and the configured block
comes back. Making a write durable would mean writing to the operator's tracked configuration file
from Lua, which is precisely the power tunables took the trouble to confine to a validated
declaration. Keep credentials out of the block — `server.jsonc` is tracked, and every other secret
in this schema lives in an environment variable.

Limits: 512 overrides, 4,096-byte values, names matching `[A-Za-z0-9_.:-]` up to 128 bytes, matched
case-insensitively as FiveM matches them. Refusals: `invalid_convar_name`,
`invalid_convar_value`, `convar_value_too_long`, `convar_limit`.

## Runtime and resource control

What an admin panel needs: run a command, see what commands exist, see what resources exist, and
start, stop or restart one.

| Function | Capability | Result |
|---|---|---|
| `Open77.runtime.executeCommand` | `runtime.commands` | Queue one console line. `true`, or `false, reason`. |
| `Open77.runtime.commands` | — | Every registered command, with its owner and source. |
| `Open77.resource.list` | — | Every discovered resource and its state. |
| `Open77.resource.metadata` | — | One resource's manifest, or one field of it. |
| `Open77.resource.start` / `stop` / `restart` | `resources.control` | Queue a lifecycle verb. |

`ExecuteCommand`, `GetRegisteredCommands`, `GetResourceMetadata`, `StartResource`, `StopResource`,
`GetNumResources` and `GetResourceByFindIndex` are the FiveM spellings of the same functions.

### Two capabilities, and the split is the design

**`runtime.commands` grants a plain resource's authority.** A resource holding it may invoke another
resource's ordinary command — reusing something a sibling already wrote, which is the common and
harmless case — and nothing else. A command declared `restricted` is refused, and so is every
resource-lifecycle verb.

**`resources.control` grants the operator's.** It raises a queued line to the authority the in-game
operator escalation already uses, and it is separately required by `start`, `stop` and `restart`.
This is the admin-panel capability.

FiveM's `ExecuteCommand` runs as the console — rcon authority, with nothing anywhere declaring that
a resource holds it. That is the behaviour deliberately not copied. Here the manifest says it, so an
operator installing a resource sees the escalation before running it, and a resource that only
wanted to call a sibling's command never gets the lifecycle verbs at all.

The escalated surface is also *narrower* than rcon. It reaches the resource lifecycle and any Lua
command; it does not reach the ACL, ban, routing-bucket or phantom verbs, which live in a different
dispatcher the scripting host has no handle on.

`list` and `metadata` take no capability. They report the operator's own installation — which
resources exist, their version, their declared permissions — which any resource can already infer
from `exports` and dependency declarations. The power in this area is the control verbs.

### Everything here is queued

Lua runs inside the host's tick. A resource stopping itself synchronously would free the Lua state
doing the stopping, and dispatching a command synchronously would re-enter a VM and reset an
instruction budget mid-flight — the accounting the whole sandbox rests on. So a line is queued and
drained at the next tick boundary, on the game-loop thread and outside every VM, which is exactly
where a line typed at the console is dispatched.

**These calls therefore report acceptance, not completion.** Read `Open77.resource.list()` on a
later tick for the outcome; the reply to a queued line goes to the server log, naming the resource
that asked, because a resource quietly restarting another one is something an operator reading a log
must be able to see. At most 64 lines may be queued in one tick; the 65th answers
`command_queue_full`.

```lua
-- An admin panel's refresh.
for _, entry in ipairs(Open77.resource.list()) do
    print(entry.name, entry.version, entry.state)
end

if Open77.resource.metadata("garage", "version") ~= "1.0.0" then
    assert(Open77.resource.restart("garage"))   -- queued; check the list next tick
end
```

`Open77.runtime.commands()` spans every running VM plus the resource-lifecycle verbs the platform
owns, distinguished by the `source` field (`resource` or `console`). **The ACL, ban, routing-bucket
and phantom console verbs are not listed**, because they live in a hand-written dispatcher with no
registry to read. That is a known gap rather than a silent omission, and the `source` field is what
tells a reader this list has two origins.

## Join-time readiness gate

The barrier that stops one resource acting on a player another resource is not finished with.
The host owns the combined readiness barrier across every participant and VM
generation; asynchronous server exports do not replace this lifecycle contract.
Full rationale and worked example in
[docs/lua-resources.md](../docs/lua-resources.md#the-join-time-readiness-gate).

**The rule: do not teleport, spawn, kill or force a respawn on a player until their gate has
opened.** Reading state, rosters and HUD payloads are unaffected.

| Function | Signature | Result / purpose |
|---|---|---|
| `Open77.ready.isReady` | `(playerId)` | Whether anything is still holding this player. A player the host does not know is ready. |
| `Open77.ready.participate` | `({ timeoutMs?, reason? })` | Declare once, at load: every player who connects from now on arrives with one hold in this resource's name. |
| `Open77.ready.hold` | `(playerId, reason?)` | Take or refresh this resource's hold. Returns the player's `session`, or `nil, reason`. |
| `Open77.ready.release` | `(playerId, session?, note?)` | Clear this resource's hold. A `session` that no longer matches is dropped. |
| `Open77.ready.status` | `(playerId)` | `{ known, ready, session, ageMs, holds = { { resource, reason, ageMs, remainingMs } } }`. |

`onPlayerReady(playerId, detail)` is emitted into **every** running resource when the last hold
clears. `playerId` arrives as a string like every host event. `detail` is `cleared`, `no_holds`,
`resource_reloaded`, `resource_stopped`, or `timeout:<resource>`.

It is a barrier lifting, not a trigger: it says nothing about whether the player's world is up, so
keep your own readiness signal and ask the gate for permission. Every hold carries a deadline, so a
resource that never releases costs one degraded join and one `WRN` naming it, never a stuck server.
`ready` at the console lists who is holding whom. No permission is required.

## What a connection can tell you

Three reads about the link itself rather than the character on the end of it.

| Function | Permission | Signature | Purpose |
|---|---|---|---|
| `Open77.players.ping(playerId)` | None | `-> milliseconds \| nil, reason` | Round-trip latency, measured by the server on its own transport rather than reported by the client. Not gated: latency is not identity, every scoreboard in the genre shows it, and a resource denied it would simply time a round trip of its own. |
| `Open77.players.endpoint(playerId)` | `players.identity.sensitive` | `-> "ip:port" \| nil, reason` | The remote address. **This is a player's IP address.** |
| `Open77.players.identifiers(playerId)` | None, plus `players.identity.sensitive` for one field | `-> table \| nil, reason` | `open77` and `userId` (the same account GUID under both spellings), `name`, `fingerprint`, `joinedAt`, and `endpoint` only with the capability. There is deliberately no `discord`, `steam`, `license` or `xbl`: Open77 has one durable identifier and does not invent the others. |
| `GetPlayerPing` | None | `(playerId) -> milliseconds \| nil, reason` | FiveM's spelling of `Open77.players.ping`, the same function under both names. |
| `GetPlayerEndpoint` | `players.identity.sensitive` | `(playerId) -> "ip:port" \| nil, reason` | FiveM's spelling of `Open77.players.endpoint`, the same function under both names. |
| `Open77.players.sessionStats(playerId)` | None, plus `players.identity.history` for the history half | `-> table \| nil, reason` | The live session: `playerId`, `userId`, `connectedAtUtc` (the same `JoinedAtUtc` `identifiers` reports as `joinedAt`), `sessionSeconds`, `lastSeenUtc`. With the capability, also `firstSeenUtc`, `previousSeenUtc`, `joinCount` and `totalPlaySeconds` from the identity directory the server already persists -- absent without it, never nil-filled. |
| `Open77.players.lastSeen(identifier)` | `players.identity.history` | `-> table \| nil, reason` | When a durable identifier was last on this server, online or not: `userId`, `name`, `online`, `lastSeenUtc`, `firstSeenUtc`, `previousSeenUtc?`, `joinCount`, `totalPlaySeconds`, plus the live fields while connected. `identity_unknown` for somebody never admitted here, `history_unavailable` on a server without a directory. |
| `GetPlayerTimeOnline` | None | `(playerId) -> milliseconds \| nil, reason` | FiveM's spelling of the live session length, in the milliseconds FiveM documents. |
| `GetPlayerLastMsg` | None | `(playerId) -> milliseconds \| nil, reason` | FiveM's spelling of the age of the newest packet the server holds for the player -- the rich read's `ageMs`. `no_packet_yet` before the first snapshot. |

Two things about this surface are deliberate and worth knowing before you build on it.

**A transport that cannot measure latency says so.** `ping` reads the live connection, so it
answers `nil, "ping_unavailable"` rather than `0` whenever there is nothing to read -- a
transport that cannot measure at all, which is the case for the phantom transport the bots run
on, or one that has not sampled yet. That is a different refusal from `player_not_found` and
from `invalid_player_id`, and the three are kept apart on purpose: a bare nil collapses them
into "no". A zero would be indistinguishable from a perfect link, so the surface never produces
one it did not measure.

**`endpoint` is absent from `identifiers`, not nil, without the capability.** A caller that
holds `players.identity.sensitive` gets the field; one that does not gets a table with no
`endpoint` key at all. That is the shape the rich player read already uses, and it lets a
resource tell "you may not ask" apart from "there is nothing there" -- a distinction a
nil-filled field destroys.

## Connection control

Who gets in, decided in Lua. The guide, with a whitelist and a ban list to copy, is
[Connection control](connection-control.md).

| Event / function | Permission | Signature | Purpose |
|---|---|---|---|
| `onPlayerConnecting` | `players.gate` | `(player, deferrals)` | Emitted for every hello that passed the platform checks, before a player id exists. `player = { userId, name, publicKey, fingerprint, ticket }`. Return to accept; `deferrals.defer()` to hold, `deferrals.update(message)` to log progress, `deferrals.done()` to release, `deferrals.done(message)` to refuse with that text on the player's screen (127 bytes of UTF-8). One refusal wins; every participating resource must release to admit. |
| `onPlayerRejected` | None | `(userId, name, code, message)` | Every refused connection, platform or gate. `code` is the lowercased reject reason (`protocolmismatch`, `gamebuildmismatch`, `invalidhello`, `serverfull`, `duplicatehello`, `refused`); `message` the machine token (`server_full`, `identity_proof_invalid`, `connect_ticket_required`, `connection_gate_timeout`, ...) or the gate's own text. `userId` and `name` are empty when the hello could not be read. |
| `onPlayerConnected` | None | `(playerId, playerName)` | An admitted player has a session. Not an incarnation: see the readiness gate above before acting on them. |
| `onPlayerDisconnected` | None | `(playerId, reason)` | `reason` is `connection_closed`, or the text given to `disconnect`, `kick` or `ban`. |
| `playerConnecting` | `players.gate` | `(name, setKickReason, deferrals)` | The same gate as `onPlayerConnecting`, under the FiveM name and with the FiveM argument order, so a ported whitelist runs unchanged. It votes in the same tally; a resource may register either name or both. `deferrals` is the same table. `source` is **not** set: no player id exists yet, and the connection token is not one. `setKickReason(message)` records a message and refuses nobody — the same as in FiveM, where the refusal comes from `CancelEvent`. Open77 has `CancelEvent`, but it only means something inside a `TriggerCancellableEvent` dispatch, and the connection gate is not one: called here it answers `false, "not_in_cancellable_event"`. **Refuse with `deferrals.done(message)`.** The runtime says this once per resource in the log the first time `setKickReason` is called. |
| `playerJoining` | None | `(oldId)` with `source` | FiveM's join event, emitted when a player is assigned a session, and seen by a resource before `onPlayerConnected`. `source` is the new player id. `oldId` is always the empty string: FiveM puts the temporary connection id there, and an Open77 player is given one id and keeps it. |
| `playerDropped` | None | `(reason)` with `source` | FiveM's leave event, emitted for every disconnection beside `onPlayerDisconnected`. `source` is the player who left; `reason` is the same text `onPlayerDisconnected` receives. Both arrive in the same tick and either is a complete account of the leave — do not sequence work across the two. |
| `onPlayerLifeStateChanged` | None | `(playerId, revision, phase, reason)` | The authoritative life state machine moved. `phase` is `alive`, `dead`, `revivepending`, `respawnpending` or `recovering`; `revision` increases per player and lets you drop an out-of-order notification; `reason` is the token that caused the move (`registered`, `restored`, `resync_requested`, `transition_timeout`, or the reason given to `kill`, `revive` or `respawn`). |
| `onPlayerLifeTransitionFailed` | None | `(playerId, revision, reason)` | A life transition was not applied. `reason` is `timeout` when the client never acknowledged, otherwise the lowercased client result. The player keeps the phase they had. |
| `Open77.players.identity` / `GetPlayerIdentity` | None | `(playerId)` | `{ userId, name, publicKey, fingerprint, joinedAt }` for an admitted player, or `nil`. |
| `Open77.time.unix` / `GetUnixTime` | None | `()` | Wall-clock seconds since 1970 UTC, fractional. For expiring bans; the sandbox has no `os`. |
| `Open77.time.utc` / `GetUtcTimestamp` | None | `()` | The same instant as an ISO 8601 string. |
| `Open77.access.status` | `players.access` | `()` | The server's built-in door list, shared with Warden and the console: `{ whitelistEnabled, whitelist = { { userId, label, addedAt, addedBy } }, bans = { { userId, name, reason, bannedAt, expiresAt?, bannedBy } } }`. |
| `Open77.access.setWhitelist` | `players.access` | `(enabled)` | Switch the built-in whitelist. `true`, or `false, reason`. |
| `Open77.access.allow` / `disallow` | `players.access` | `(userId, label?)` / `(userId)` | Add an identity to the built-in whitelist, or take it off. |
| `Open77.access.isAllowed` / `isBanned` | `players.access` | `(userId)` | Read the built-in list. |
| `Open77.access.ban` | `players.access` | `(userId, reason?, seconds?, name?)` | Ban an identity on the built-in list (`seconds` nil or 0 = permanent) and disconnect them if online. |
| `Open77.access.unban` | `players.access` | `(userId)` | Lift a built-in ban. |

The gate answers within `simulation.connectGateTimeoutSeconds` (default 8, allowed 0.5 to 9); a
gate that never answers refuses the player with `connection_gate_timeout`. A handler error is
logged and counts as an acceptance. A resource with a handler but without `players.gate` is
ignored with one `WRN`.

## Operator-tunable settings

Settings a server owner may retune from the Warden admin panel while the server runs, without a
restart. The resource declares what is tunable; the panel can only move values inside that
declaration, and never edits Lua. Server-side only.

| Function | Signature | Result / purpose |
|---|---|---|
| `Open77.tunables.declare` | `(table)` | Declare this resource's tunables and return a live proxy. Raises if the declaration is malformed. |
| `Open77.tunables.get` | `(key)` | The current value, or `nil, reason` for an undeclared key. |
| `Open77.tunables.set` | `(key, value)` | Write one. Returns `ok, message, pending`. Same validation and persistence as a panel write. |
| `Open77.tunables.capture` | `()` | A frozen plain table of every current value, to pin onto one match. |
| `Open77.tunables.pending` | `()` | Key → value for changes waiting on a boundary. |
| `Open77.tunables.promote` | `()` | Adopt everything waiting; returns the list of keys that moved. |

Declaration fields: `value` (required default), `type` (`number`, `integer`, `boolean`, `string`,
`enum`), `min`, `max`, `step`, `choices`, `unit`, `apply` (`live`, `next_round`, `next_match`),
`label`, `description`, `group`, `order`. `min`/`max`/`type`/`choices` are enforced on every write;
`step` and `unit` are presentation only. Limits: 128 tunables per resource, 64 KiB of declaration,
32 choices, 256-character strings.

**The proxy returned by `declare` reads through to the host on every access.** Read it at the point
of use; a value hoisted into a file-scope local is captured at load time and never updates, while
the panel goes on reporting the new number. An undeclared key raises rather than returning `nil`.

Values are owned by the host, so they survive a reload **and** a stop, and come back after a
restart from `tunables.json` next to `server.jsonc`. A key declared `next_round` or `next_match` is
stored and persisted immediately but does not reach `Open77.tunables.get` until the resource calls
`promote()`; for a mode running several rounds at once, `capture()` per match is the only correct
form. The owning resource — and no other — receives `onTunableChanged(key, value, pending)` after
every accepted write.

## Notifications

These methods route to the official `open77_notifications` client package. IDs and mutation rights
are isolated per calling server resource.

| Function | Signature | Result |
|---|---|---|
| `Open77.notifications.send` | `(playerId, definition)` | Owner-local notification ID, or `nil, reason`. |
| `Open77.notifications.broadcast` | `(definition)` | Owner-local broadcast ID, or `nil, reason`. |
| `Open77.notifications.update` | `(id, patch)` | `boolean, reason?` |
| `Open77.notifications.dismiss` | `(id)` | `boolean, reason?` |
| `Open77.notifications.clear` | `(playerId?)` | Clear this owner's notifications for one player or everyone. |

See [notifications](notifications.md) for every definition field and queue limit.

## Perspective policy

Whether players on this server may use third person. The calling server resource must declare
`network.events`; the policy is broadcast to every client and answered again to anyone who joins
later.

| Function | Signature | Result |
|---|---|---|
| `Open77.perspective.setPolicy` | `(policy, perspective?)` | `true`, or `false, reason`. |
| `Open77.perspective.policy` | `()` | `policy, perspective, declared` — what **this** resource set. |

`policy` is `disabled`, `allowed`, `default` or `forced`; `perspective` is `fpp` or `tps` and is
required for `forced`, because a pin with nothing pinned would quietly become first person.

The client arbiter ranks a server policy above the player's own preference and every world state
above both. A `forced` policy does not erase what the player asked for: lifting the pin returns
them to it.

Call `setPolicy` from the resource's **start path** — a reload replaces the VM, and the policy
lives in it. A server on which no resource ever calls this sends nothing and every client keeps the
platform default `allowed`. If two resources declare a policy, both answer a joining client and the
last write wins; one owner, normally the gamemode, is the remedy.

See [perspective](../docs/perspective.md) for the priority table, the player-facing key and
preference, and the measured limitations.

## Synchronized RP animations

`Open77.animations` supplies server-owned player actions. See the
[RP guide](rp-animations.md) and [complete profile/clip catalogue](rp-animation-catalogue.md)
for ownership, sequence durations, events, local TPP and development validation status.

| Method | Signature | Permission / result |
|---|---|---|
| `Open77.animations.list` | `(query?)` | No permission; profile array. |
| `Open77.animations.get` | `(profileId)` | No permission; profile or nil. |
| `Open77.animations.play` | `(playerId, profileId, options?)` | `players.animations.control`; accepted state. |
| `Open77.animations.sequence` | `(playerId, steps, options?)` | `players.animations.control`; accepted state. |
| `Open77.animations.stop` | `(playerId, playbackId?)` | `players.animations.control`; true or nil/error. |
| `Open77.animations.current` | `(playerId)` | `players.animations.read`; active state or nil. |
| `Open77.animations.clip` | `(clip)` | No permission; the profile that owns a clip name, or nil. |
| `Open77.animations.clips` | `(query?)` | No permission; every addressable clip as `{ clip, profile }`. |
| `Open77.animations.playClip` | `(playerId, clip, options?)` | `players.animations.control`; `play` addressed by clip name, the way `TaskPlayAnim` is. |

`play` and `sequence` return `nil, error` on rejection. An accepted server action
does not prove native rendering has started. Client methods are a separate,
Promise-based self-request API; do not use their signatures on the server.

## Cyberware

The authoritative half of the [cyberware API](cyberware.md). It separates definition, identity,
management, temporary loadouts and reads into five permissions, because the resource that *defines*
an implant, the one that *sells* it and the one that *reads* it are rarely the same resource.

| Function | Permission | Signature | Result / purpose |
|---|---|---|---|
| `Open77.cyberware.define` | `players.cyberware.define` | `(definition)` | Register a definition for this resource. `arms`/`gorilla_arms` and `legs`/`double_jump` coexist. |
| `Open77.cyberware.bind` | `players.cyberware.identity` | `(playerId, characterKey)` | Begin loading this authenticated user's selected character. |
| `Open77.cyberware.unbind` | `players.cyberware.identity` | `(playerId)` | Release this resource's binding and its runtime projection. |
| `Open77.cyberware.current` | `players.cyberware.read` | `(playerId)` | The committed record, or `nil` while loading or projecting. |
| `Open77.cyberware.effective` | `players.cyberware.read` | `(playerId)` | The record gameplay should use, including an active temporary loadout. |
| `Open77.cyberware.activity` | `players.cyberware.read` | `(playerId)` | The live projector observation — charge, hold, phase — or `nil`. |
| `Open77.cyberware.leaseState` | `players.cyberware.read` | `(playerId)` | The temporary lease, or `nil` when none remains. |
| `Open77.cyberware.lease` | `players.cyberware.temporary` | `(playerId, definition, grade, options?)` | Stage a temporary loadout; `{ok=true,lease=…,ticket=…}`. |
| `Open77.cyberware.releaseLease` | `players.cyberware.temporary` | `(playerId, leaseId)` | Release it and restore the paid-for state. |
| `Open77.cyberware.newOperationId` | `players.cyberware.manage` | `()` | A fresh 32-character durable operation ID; retain it across retries. |
| `Open77.cyberware.install` | `players.cyberware.manage` | `(playerId, definition, grade, options?)` | Stage an installation; completion is asynchronous. |
| `Open77.cyberware.remove` | `players.cyberware.manage` | `(playerId, options?)` | Stage a removal; defaults to arms, accepts `options.slot="legs"`. |
| `Open77.cyberware.cancel` | `players.cyberware.manage` | `(playerId, ticket)` | Cancel this resource's staging and request rollback. |

`current` is what the player owns; `effective` is what they are currently running. A lease changes
the second and never the first, which is what lets an arena hand out an implant without charging
anyone or rewriting a durable record.

**Install and remove complete asynchronously.** Pass one `options.operationId` from
`newOperationId()` and reuse it on every retry — that is what makes the operation idempotent across
a retry, a reload or a reconnect. `cancel` answers `operation_committing` once the SQL commit has
begun: past that point the operation is going to land, and cancelling is no longer meaningful.

Cyberware events, queued into every running server resource:

| Event | Arguments | Meaning |
|---|---|---|
| `onCyberwareOperationCompleted` | `(playerId, ticket, encodedResult)` | A staged install or remove finished. `ticket` matches the one the staging call returned. |
| `onCyberwareLeaseChanged` | `(playerId, encodedState)` | A temporary loadout was granted, replaced or released. |
| `onCyberwareJump` | `(playerId, encodedResult)` | `{sequence, ok, error}` — second-jump **admission**, not native movement completion. |
| `onCyberwareMeleeHit` | `(victimId, attackerId, encodedHit)` | An accepted Gorilla contact: `{sequence, incarnation, instanceId, definition, grade, charged, amount, bodyPart, lethal}`. Zero-knockback and cosmetic contacts still emit. |
| `onCyberwareMotionOutcome` | `(victimId, attackerId, encodedOutcome)` | What the hit's knockback did: `outcome` is `pending`, `rejected` or `skipped`, with a `reason` such as `lethal`, `downed`, `zero_distance`, `bucket_mismatch` or `motion_unavailable`. |
| `onCyberwareMeleeBlocked` | `(victimId, attackerId, sequence, amount)` | A contact the victim blocked. |
| `onCyberwareActionRejected` | `(playerId, sequence, reason)` | Server admission refused a swing: `insufficient_stamina`, `cooldown`, `charge_expired` or `not_charged`. Repeats of the same rejection are suppressed. |

`encodedResult`, `encodedHit`, `encodedState` and `encodedOutcome` arrive as JSON strings; decode
them with `json.decode`. Every payload describes what the **server admitted**, never what a client
rendered. The `open77:cyberware:*` projection namespace is platform-owned and cannot be forged with
public Lua event dispatch.

## Forced motion

Experimental. `Open77.motion` asks the native layer to move a player's body without teleporting it:
the server admits the request and the owning client performs it.

| Function | Permission | Signature | Result / purpose |
|---|---|---|---|
| `Open77.motion.knockdown` | `players.motion.control` | `(playerId, { x, y, distance })` | Request a planar knockdown; `{ok=true,id=…}`, or `nil, reason`. |
| `Open77.motion.cancel` | `players.motion.control` | `(playerId, id)` | Cancel a request this resource owns. |
| `Open77.motion.current` | `players.motion.read` | `(playerId)` | The current record, or `nil`. |

The direction is normalised by the backend and the distance is bounded to 0–6 metres. **Native
physics decides the actual displacement: this is not an exact-distance teleport, and an accepted
request is not proof of movement.** The body must be ready, alive, unmounted and in its original
incarnation and bucket; overlapping requests are refused.

`current` returns `id`, `player`, `incarnation`, `bucket`, `directionX`, `directionY`, `distance`,
`createdAt`, `expiresAt` and `phase`, with times in server-monotonic milliseconds.

`onPlayerMotionChanged(playerId, id, phase, reason)` reports the three phases. Admission starts
`pending`; `active` means the **owner acknowledged the native observation**, not that the server saw
an animation or a displacement, and it opens a bounded six-second reaction and recovery window;
`ended` closes the record. Cancellation and resource stop both send an ended record and release only
the requesting resource's native ownership.

The client half — `Open77.motion.knockdown`, `state` and `stop` — is a different API in a different
runtime with different arguments; see the generated client reference.

## Player clothing

These asynchronous methods target the official `open77_equipment` client relay. The calling server
resource must declare `network.events`. Request IDs are prefixed with the resource name, and only
that resource VM can match the completion.

| Function | Signature | Result |
|---|---|---|
| `Open77.clothing.equip` | `(playerId, record, options?)` | Request ID, or `nil, reason`. |
| `Open77.clothing.unequip` | `(playerId, slot)` | Request ID, or `nil, reason`. |
| `Open77.clothing.set` | `(playerId, wardrobe, options?)` | Request ID, or `nil, reason`. |
| `Open77.clothing.clear` | `(playerId)` | Request ID, or `nil, reason`. |
| `Open77.clothing.requestSnapshot` | `(playerId)` | Request ID, or `nil, reason`. |

Listen for the resource-local `open77:clothing:completed` event. Its arguments are
`playerId, requestId, operation, accepted, reason, result`. Dispatch failures are returned
immediately; unanswered requests complete with `request_timeout` after 10 seconds. Full record,
slot and result semantics follow the relay's equipment registry. `set` accepts a
slot-to-record table, for example `{outer_chest="Items.Jacket_01_basic_01"}`;
`false` empties a slot and omitted slots stay unchanged. A snapshot returns rows
with `slot`, `attachmentSlot`, `equipped`, and optional `record`/`tweakDbId`.
These writes follow normal presentation persistence; completion alone is not
proof of observer appearance. An active wardrobe outfit can hide equipment.
See the [installed clothing catalog](../docs/research/clothing-items-catalog.md).

## Wanted level and NCPD dispatch

| Function | Signature | Result |
|---|---|---|
| `Open77.players.setWanted` | `(playerId, level)` | `{ level, requested, maxLevel }`, or `nil, reason`. |
| `Open77.players.setMaxWanted` | `(playerId, level)` | `{ level, maxLevel }`, or `nil, reason`. |
| `Open77.players.getWanted` | `(playerId)` | `{ level, maxLevel, enabled }`, or `nil, reason`. |
| `Open77.world.setPreventionEnabled` | `(bucket, enabled)` | `{ bucket, enabled }`, or `nil, reason`. |

Levels run 0 to 5. `setWanted(id, 0)` is `ClearPlayerWantedLevel`. The host event
`onPlayerWantedChanged(playerId, level, previous)` fires when the value changes.

```lua
-- open77.lua: permissions { "players.wanted", "players.wanted.read", "world.prevention" }
Open77.players.setMaxWanted(playerId, 3)
local applied = Open77.players.setWanted(playerId, 5)
print(applied.requested, applied.level)   -- 5   3   (the ceiling was applied here)

AddEventHandler("onPlayerWantedChanged", function(player, level, previous)
    print(("player %d: %d -> %d"):format(player, previous, level))
end)

Open77.world.setPreventionEnabled(0, false)   -- no dispatch anywhere in bucket 0
```

### Read this before building a chase on it

**The engine has no per-player wanted level.** Measured on 2.31, and it is not a
detail: `PreventionSystem` holds ONE heat stage, for the one player its client is
running. `ChangeHeatStage(stage, reason)`, `GetHeatStage()` and
`SetMinMaxResetHeatLevels(min, max, isDefault)` take no target, the state is
scalar on a singleton system, that system holds exactly one `player` handle, and
every consumer — the wanted bar, sense components, vehicles, minimap pins — reads
one global `UI_WantedBar` blackboard.

A per-player number exists here only because **every Open77 player runs their own
game**: the server keeps the value and tells each client its own. Three
consequences follow, and none of them is visible in the shape of the API:

- **The police are local.** The NCPD units a heat stage spawns belong to the
  client that spawned them. They are not Open77 entities, they are not
  replicated, and no other player sees them. Two wanted players standing together
  are two private pursuits.
- **The server never reads the game.** There is no value channel back from
  REDscript, only a per-command acknowledgement, so `getWanted` and
  `onPlayerWantedChanged` report a decision this server made — never an
  observation. If something in the client's own world clears the heat, the server
  does not find out.
- **Population suppression wins.** While a client has world population
  suppression on, `VehicleSpawnPolicy` holds the prevention block flags
  (`SetSystemLock`, `SetBlockOnFootSpawn`, `SetBlockVehicleSpawn`), so a heat
  stage would be set and no unit would ever arrive. The client refuses the raise
  with `population_suppressed` rather than reporting a success nobody can see.
  Clearing to 0 is always allowed. `Open77.world.setPreventionEnabled` is a
  *different* switch (`TogglePreventionSystem`) and deliberately never touches
  those three flags, so the two cannot fight.

### What the vanilla route does that this does not

The game's own path is a `SetWantedLevel` **request object**, not a method, and
its fields are private: `new SetWantedLevel()` and `QueueRequest` compile, while
every read *and* write of `wantedLevel` fails `[UNRESOLVED_MEMBER]`, even from
inside an `@addMethod` body. So Open77 goes through `ChangeHeatStage`, and the
request's `forceGreyStars`, `resetGreyStars` and
`forcePlayerPositionAsLastCrimePoint` behaviour is **not** reproduced.

`SetWantedLevelFact` is not used either: the fact is something the system
*publishes* and never reads. Forcing it to zero left the star on screen and the
fact back at zero.

Client resources reach the same levers directly through `Open77.prevention`
(`setWanted`, `setMaxWanted`, `setEnabled`, `state`) under the `world.prevention`
permission. `state()` is a **request record**, not an engine reading — its fields
are named `requestedLevel`, `levelAcknowledged` and so on for that reason.

## Player appearance

A saved face and body, restored on a player without that player asking for it.
Relayed exactly like clothing, for the same reason: the addressed client owns the
REDengine player object, so the server asks and the client answers.

| Function | Signature | Result |
|---|---|---|
| `Open77.appearance.capture` | `(playerId)` | Request ID, or `nil, reason`. |
| `Open77.appearance.apply` | `(playerId, snapshot, options?)` | Request ID, or `nil, reason`. |

The calling resource must declare **`players.appearance.relay`** as well as
`network.events`. That is a permission of its own, not a corner of
`player.appearance.edit` (a *client*-side grant over the local player) or of
clothing (garments a player can see and take off again): a snapshot is the output
of the character creator, the closest thing this platform holds to a likeness of
the person playing. A resource that can read one can fingerprint every player on
the server, and one that can write one can make somebody wear a face they did not
choose. Nothing in the relay writes a snapshot to a log.

Listen for the resource-local `open77:appearance:relayCompleted` event with
`playerId, requestId, operation, accepted, reason, result`. Request IDs carry both
the resource name and an `appearance` segment, so an appearance answer can never
complete a clothing or weapon request. Dispatch failures return immediately;
an unanswered request completes with `request_timeout` after 10 seconds rather
than leaving the caller waiting.

`capture` answers `{ snapshot, family, revision, characterKey }`. The `snapshot` is
the network form — schema version, game build, catalogue digest, gender, and the
option identities and values — with the editor's local metadata stripped. It is the
same shape `apply` takes, so a capture can be stored and handed straight back.

`apply` does not reach the native layer behind `open77_appearance`'s back. The
snapshot becomes that player's new appearance **record** — the server's word about
what they wear — and the resource's ordinary reconciliation puts it on the body.
That is the road a stored appearance already takes at world entry, so a relayed
face survives death, a bucket change and a reload instead of being quietly undone
by the next reconcile.

Two limits worth knowing before you build on it:

- **It does not change the body family.** A different family is a player *reload*,
  not an appearance change, and a caller restoring a face has not asked for that. A
  snapshot whose gender disagrees with the body on the player is refused with
  `body_family_mismatch`.
- **It does not persist.** The platform's stored appearance row is untouched; a
  resource that wants the change to outlive the session owns that persistence.

Refusals from the client are named: `appearance_busy` (an editor, the character
creator or a fitting-room preview is open), `player_not_ready`,
`appearance_restore_failed`, `appearance_record_unavailable`. Completion reports
`apply_timeout` when the record was set but the body had not settled within eight
seconds, and `appearance_superseded` when a newer apply replaced it.

```lua
-- open77.lua: permissions { "network.events", "players.appearance.relay" }
local stored = {}

AddEventHandler("open77:appearance:relayCompleted",
  function(player, requestId, operation, accepted, reason, result)
    if not accepted then print("appearance " .. operation .. " failed: " .. reason); return end
    if operation == "capture" then stored[player] = result.snapshot end
  end)

Open77.appearance.capture(playerId)
-- ...later, on a fresh session:
Open77.appearance.apply(playerId, stored[playerId])
```

## Player weapons

These asynchronous methods target the official `open77_weapons` client relay.
The calling resource declares `network.events` and depends on
`open77_weapons >=0.1.0`.

| Function | Signature | Result |
|---|---|---|
| `Open77.weapons.assign` | `(playerId, record, slot, options?)` | Request ID, or `nil, reason`. |
| `Open77.weapons.setActive` / `activate` | `(playerId, slot)` or `(playerId, record, options?)` | Request ID, or `nil, reason`. |
| `Open77.weapons.remove` / `unequip` | `(playerId, slot)` | Request ID, or `nil, reason`. |
| `Open77.weapons.holster` | `(playerId)` | Request ID, or `nil, reason`. |
| `Open77.weapons.requestSnapshot` | `(playerId)` | Request ID, or `nil, reason`. |

Listen for `open77:weapons:completed` with
`playerId, requestId, operation, accepted, reason, result`. Replies are matched
to the authenticated target and calling resource; unanswered requests complete
with `request_timeout` after 10 seconds. See
[Weapon Lua API](weapons-api.md) for options, result schemas, permissions,
errors, and inventory-authority rules.

### Reading what a player is carrying

`Open77.weapons.get(playerId)` (permission `player.weapons.read`) answers the three slots, the
active slot, whether the weapon is drawn and the magazine. Its low-level alias is
`GetPlayerWeapons`.

**It is a cache of what the owner reported, never authority**, and it reports **two** ages rather
than one because the two halves refresh at different rates. `reportedAgeMs` dates `active`,
`drawn` and `magazine`, which ride the 20 Hz player snapshot, and carries `fresh` under the same
two-second rule `Open77.players.get` applies. `loadoutAgeMs` dates `slots`, which is pushed only
when it changes -- minutes there is normal and is not a fault. `source` separates a `report` from
a `snapshot`, and a player nobody has heard from fails `weapons_unreported`, which is a different
answer from carrying nothing. A clear `WeaponValid` bit means "not reported", never "unarmed".

Host event `onPlayerWeaponChanged(playerId, slot, record, drawn)` fires on a change.
`Open77.weapons.clear(playerId)` empties all three slots as one relay operation rather than three
removals; an already-empty slot is not a failure. Full schemas are in
[Weapon Lua API](weapons-api.md).

## Record catalogues

`Open77.data.vehicle / weapon / item / npc(record)` answer what a 2.31 record is. The low-level
alias behind all four is `GetRecordData`, called as `GetRecordData(kind, record)`.

A `record` is a TweakDB **string**, never a Jenkins hash -- the same choice the `Citizen` alias
layer already made, and a porting creator should expect it: there is no number to compare and no
`GetHashKey` to round-trip through. `source` tells you where the answer came from: `catalogue` on
the server, `tweakdb` on a client, which reads the live database and gets the display name in the
player's own language. `Open77.data.localize` is client-only and fails `localization_client_only`
on the server rather than hand back a key that could pass for a translation. One asymmetry worth
knowing: server `npc()` takes an entity template path, client `npc()` takes a `Character.*`
record. See [Record catalogues](data-catalogues.md).

## Held items

An item in one of the body's ten equipment slots, given through the engine's own
transaction system, so it is genuinely held rather than following the body. The
other half of the attachment surface: `Open77.props.attach` **follows**, this
**holds**. These asynchronous methods target the official `open77_helditems`
client relay; the calling resource declares `network.events`.

| Function | Signature | Result |
|---|---|---|
| `Open77.heldItems.hold` | `(playerId, record, { slot? })` | Request ID, or `nil, reason`. |
| `Open77.heldItems.release` | `(playerId, { slot? })` | Request ID, or `nil, reason`. |
| `Open77.heldItems.slots` | `()` | The ten slot names, sorted. |
| `Open77.heldItems.requestSnapshot` | `(playerId)` | Request ID, or `nil, reason`. |

The slot vocabulary is the ten `AttachmentSlots.*` equipment records: `Head`,
`Face`, `InnerChest`, `OuterChest`, `Legs`, `Feet`, `Outfit`, `UnderwearTop`,
`UnderwearBottom`, `WeaponRight`. `WeaponRight` is the right hand and the
default. What is held must be an item **record**, not an entity.

Listen for `open77:helditem:completed` with
`playerId, requestId, operation, accepted, reason, result`. Unanswered requests
complete with `request_timeout` after 10 seconds. Failures are
`invalid_item_record`, `invalid_slot`, `invalid_player`, `player_not_ready` and
whatever the client equipment system refused. `Open77.weapons` writes the same
`WeaponRight` slot, so pick one per gamemode. See
[props](props.md#open77helditemshold--put-an-item-in-a-hand) for the full
contract and its limits.

## Players and authoritative life

| Function | Permission | Signature | Result / purpose |
|---|---|---|---|
| `Open77.players.name` | None | `(playerId)` | Display name or `nil`. |
| `Open77.players.identifier` | None | `(playerId)` | Durable authenticated identifier or `nil`. |
| `Open77.players.identity` / `GetPlayerIdentity` | None | `(playerId)` | `{ userId, name, publicKey, fingerprint, joinedAt }` or `nil`; the fingerprint matches the client's `identity.dump`. |
| `Open77.players.position` | None | `(playerId)` | `{ x, y, z, bucket }` or `nil`. |
| `Open77.players.all` / `GetPlayers` | None | `()` | Array of every authenticated player id, ascending. The host's roster, so a gamemode no longer needs its own copy built from join/leave events. |
| `Open77.players.inBucket` / `GetPlayersInBucket` | None | `(bucket)` | Ids of the authenticated players whose routing bucket is `bucket`, ascending. `false, invalid_bucket` for a negative or oversized bucket. |
| `Open77.players.positions` / `GetPlayersPositions` | None | `()` | `{ [playerId] = { x, y, z, bucket } }` for every player with a snapshot younger than two seconds. Players without one are absent, not `nil` entries. One call replaces a loop of `position` over the roster. |
| `Open77.players.get` | None | `(playerId)` | Everything the host can answer about one player synchronously, including a **dated** transform. `nil, reason` for an unknown player. See [The rich read](#the-rich-read-and-the-freshness-decision). |
| `Open77.players.nearby` | None | `(anchor, radius?, options?)` | Players within `radius` of a point or of another player, nearest first, each with its `distance`. |
| `Open77.players.closest` | None | `(anchor, options?)` | The nearest entry `nearby` would return, or a bare `nil` when nobody matches. |
| `Open77.players.distance` | None | `(a, b)` | Metres between two players, two points, or one of each. `nil, reason` otherwise. |
| `Open77.players.getVehicleSeat` | `world.vehicles` | `(playerId)` | Canonical seat assignment or `nil`. |
| `Open77.players.warpIntoVehicle` | `world.vehicles` | `(playerId, vehicleId, seat, options?)` | Authoritatively assign a seat; alias of the vehicle API. |
| `Open77.players.forceOutOfVehicle` | `world.vehicles` | `(playerId, vehicleId?)` | Force native exit, overriding exit lock. |
| `Open77.players.setVehicleExitLocked` | `world.vehicles` | `(playerId, locked, vehicleId?)` | Set or clear the durable no-exit policy. |
| `Open77.players.disconnect` | `players.disconnect` | `(playerId, reason?)` | Queue a reasoned disconnect; `boolean, reason?`. |
| `Open77.players.kick` | `players.disconnect` | `(playerId, reason?)` | Alias of `disconnect`. |
| `Open77.players.ban` | `players.ban` | `(playerId, reason?, durationSeconds?)` | Persist a server-scoped device ban through the master and disconnect now. |
| `Open77.players.getLifeState` | `players.life.read` | `(playerId)` | Canonical life snapshot or `nil`. `phase` is `alive`, `dead`, `revivepending`, `respawnpending`, `recovering` — **no underscore**, unlike the client. |
| `Open77.players.isDead` | `players.life.read` | `(playerId)` | Whether phase is dead/revive-pending/respawn-pending. Resolved from the enum, so it is immune to the spelling split — prefer it over comparing `phase`. |
| `Open77.players.kill` | `players.life.kill` | `(playerId, options?)` | `boolean, reason?` |
| `Open77.players.revive` | `players.life.revive` | `(playerId, options?)` | `boolean, reason?` |
| `Open77.players.respawn` | `players.life.respawn` | `(playerId, options)` | `boolean, reason?`. **Only for a player who is already dead** — it refuses with `invalid_state` otherwise. To move a living player, use `teleport`. |
| `Open77.players.teleport` | `players.teleport` | `(playerId, position, options?)` | **Promise**, or `nil, reason`. Moves a living player with no life transition. |
| `Open77.players.setHeading` | `players.teleport` | `(playerId, yaw)` | `boolean, reason?`. Fire and forget. |
| `Open77.players.requestLifeResync` | `players.life.resync` | `(playerId)` | `boolean, reason?` |
| `Open77.players.setGhosted` / `SetPlayerGhosted` | `players.life.ghost` | `(playerId, ghosted, options?)` | Toggle the server-owned non-solid spawn state and its optional automatic clear policy. |
| `Open77.players.isGhosted` / `IsPlayerGhosted` | `players.life.read` | `(playerId)` | Whether the canonical life state is currently ghosted. |
| `Open77.players.setFrozen` / `SetPlayerFrozen` | `players.life.freeze` | `(playerId, frozen)` | Hold the player's body where it stands, or release this resource's hold. `boolean, reason?` |
| `Open77.players.isFrozen` / `IsPlayerFrozen` | `players.life.read` | `(playerId)` | Whether the canonical life state is currently frozen, by any resource. |
| `Open77.players.setVisible` / `SetPlayerVisible` | `players.life.visibility` | `(playerId, visible)` | Hide a player's body from every other client, or show it again. Presentation only; see [Player visibility](#player-visibility) below. |
| `Open77.players.isVisible` / `IsPlayerVisible` | `players.life.read` | `(playerId)` | Whether the canonical life state says this player is rendered. Answered from the server bit, never probed from a client. |
| `Open77.players.spectate` / `SpectatePlayer` | `players.spectate` | `(playerId, targetId\|false, options?)` | Put one player behind another player's shoulder: ghost, hide, and a follow camera on the target, as one transaction that fails closed. `targetId` false ends it and gives the body back, as do death, disconnect, reconnect, a bucket change and this resource stopping. `options`: `blendMs`, `distance`, `height`. See [Spectating](cameras.md#spectating). |
| `Open77.players.spectating` / `GetPlayerSpectateTarget` | `players.life.read` | `(playerId)` | Who this player is watching, or `0`. |
| `Open77.players.spectators` / `GetPlayerSpectators` | `players.life.read` | `(playerId)` | Everyone watching this player, ascending. |
| `Open77.players.fade` / `FadePlayerScreen` | `players.screen` | `(playerId, out, durationMs?, options?)` | Cover (`out` true) or uncover one player's screen with the native quest fade. The client consumes the relay itself, so the target needs no client resource; `options.timeoutMs` (1000-60000, default 15000) is a ceiling the **client** enforces on real time, so a forgotten fade-in costs a pause, not a black screen. See [screen transitions](screen-transitions.md). |
| `Open77.players.fadeOut` | `players.screen` | `(playerId, durationMs?, options?)` | `fade(playerId, true, ...)`. |
| `Open77.players.fadeIn` | `players.screen` | `(playerId, durationMs?)` | `fade(playerId, false, ...)`. |
| `Open77.players.getHealth` | `players.damage.read` | `(playerId)` | Health/armor/god-mode snapshot or `nil`. |
| `Open77.players.damage` | `players.damage.apply` | `(playerId, amount, options?)` | Apply authoritative damage. |
| `Open77.players.heal` | `players.damage.apply` | `(playerId, amount)` | Apply authoritative healing. |
| `Open77.players.setHealth` | `players.damage.apply` | `(playerId, health)` | Set health; zero passes through life authority. |
| `Open77.players.setMaxHealth` | `players.damage.apply` | `(playerId, maxHealth)` | Update the canonical maximum. |
| `Open77.players.setArmor` | `players.damage.apply` | `(playerId, armor)` | Update canonical armor. |
| `Open77.players.setGodMode` | `players.damage.apply` | `(playerId, enabled)` | Toggle canonical damage immunity. |
| `Open77.players.setRegen` | `players.damage.apply` | `(playerId, pointsPerSecond)` | Set authoritative regeneration. |

### The rich read and the freshness decision

The commonest thing a server script does before it acts is a distance check, and
until `get`, `nearby`, `closest` and `distance` existed every gamemode wrote that
check again: a loop over `Open77.players.position`, a square root, and a
workaround for the two-second rule.

**`Open77.players.position` is unchanged, deliberately.** It still answers `nil`
once the player's last accepted snapshot is more than two seconds old, and that
silence is load-bearing: the server refuses to restamp a rejected or replayed
snapshot precisely so stale state cannot be laundered into freshness, and loot
pickup, damage context, interest reconciliation and voice routing all arbitrate
through the same accessor. Bundled resources already read that `nil` as "stale".
Changing it would have been a silent behaviour change in every one of them.

What was wrong was not the rule but the *reporting*. A script that only wants to
know how far away somebody is received `nil` for "this player vanished" and `nil`
for "I cannot date this reading", and had to guess. So the always-answering
behaviour lives on the new names:

```lua
local read = Open77.players.get(playerId)          -- never silent on staleness
if read and read.position and (read.ageMs or 0) < 5000 then
  -- your threshold, not ours
end
```

`read.fresh` carries exactly the predicate `position` enforces, so a caller that
wants the old semantics still gets them from one reading: `read.fresh` is true
precisely when `Open77.players.position` would have answered. A player who has
**never** sent an accepted snapshot -- just connected, or moved routing bucket
and not reported since -- has no `position` and no `ageMs` at all, which is
distinguishable from a reading that is merely old. The readiness gate measured,
in production on 2026-08-27, why position freshness must never be a liveness test
on its own: it read true for a player sitting in the character creator with no
world, and false for a player genuinely standing in Night City behind a late
tick. `get` reports; it does not judge.

#### `Open77.players.get(playerId)`

Always present: `playerId`, `bucket`, `fresh`, `ready`. Present when the player
has ever reported: `ageMs`, `position` (`{ x, y, z }`), `heading` and its alias
`yaw`, `velocity` (`{ x, y, z }`), `speed`, `stateFlags`, `flags`, and
`supportKind`/`supportId` when the player is standing on a moving support.
Present when the host can resolve them: `name`, `identifier`, `userId`.

`flags` names the snapshot's state bits: `animationValid`, `sprinting`,
`crouched`, `sliding`, `vaulting`, `grounded`, `weaponValid`, `weaponEquipped`,
`combatValid`, `aiming`, `triggerDown`, `reloading`. The three `*Valid` bits sit
beside the bits they qualify on purpose -- a client only fills a block when its
validity bit is set, so `grounded == false` under `animationValid == false` means
"not reported", not "airborne". `stateFlags` is the raw wire value, so a bit we
have not named is never a blocker.

Three groups are **absent rather than false** unless the calling resource already
holds the permission that guards them elsewhere. Surfacing them here without it
would be a way around the gate on `getVehicleSeat`, `getHealth` and
`getLifeState`:

| Fields | Permission | Note |
|---|---|---|
| `inVehicle`, plus `vehicleId`/`seat`/`entering`/`exiting`/`exitLocked` when seated | `world.vehicles` | With the permission `inVehicle` is always present and may be `false`; without it the key is absent. `inVehicle` is the server's canonical seat reservation, which exists before the client has finished mounting. Authoritative, not snapshot-gated. |
| `health`, `maxHealth`, `armor`, `godMode` | `players.stats.read` (or legacy `players.damage.read` / `players.life.read`) | Authoritative, not snapshot-gated. |
| `alive`, `dead`, `lifePhase`, `ghosted` | `players.life.read` | `lifePhase` uses the server spelling -- `alive`, `dead`, `revivepending`, `respawnpending`, `recovering`, no underscore. Prefer `dead` over comparing the string. |

The read itself needs **no permission**. That is not an assumption about what
other runtimes do -- the client's life reads *are* gated, behind
`players.life.read`, and `Open77.world`'s geometry reads are gated behind
`world.query`. It is the *server's own* standing policy for this family: a
server resource can already learn a player's id, name and position from
`Open77.players.all`, `name` and `position`, none of which asks for anything,
because a player's presence is not more sensitive than what those already expose.
`get` adds no new fact to that set without also adding its permission. Gating
the whole read instead would have made `get` strictly harder to use than the
`position` call it replaces, which only pushes resources back to the old one.

A rich read is not a state bag. Placement, motion and life are the server's
observations of a player and belong here; a job, a duty flag, a shift or anything
else a resource *decides* about a player belongs in that player's state bag,
where it is named, replicated and owned by whoever set it. If you find yourself
wanting a field here that no snapshot could ever carry, it is a bag field.

Not included, and why: anything the server would have to ask a client for. There
is no synchronous armour-piece list, weapon record, stance or animation name on
the server, and inventing one from the last snapshot would be a guess wearing a
field name. `position`, `velocity` and `flags` come from the snapshot and are
therefore dated by `ageMs`; everything in the permission table above is the
server's own record and is current.

#### `nearby`, `closest`, `distance`

```lua
local crowd = Open77.players.nearby(shopDoor, 25)           -- a point
local witnesses = Open77.players.nearby(robberId, 40)       -- or a player
local target = Open77.players.closest(playerId, { radius = 10 })
local metres = Open77.players.distance(cop, robber)
```

`anchor` is a player id (an integer) or a point (a table with numeric `x`, `y`,
`z`). The two are never ambiguous. A `vector3` **is** a point -- the shared
vector type is a plain table with real `x`/`y`/`z` fields -- so vectors are
accepted everywhere a point is, and the `{ x, y, z }` tables these reads return
go straight back into `vector3()`.

`nearby` returns an array sorted nearest first, ties broken by player id so two
identical calls answer in the same order. Each entry carries `playerId`,
`distance`, `bucket`, `fresh`, and `ageMs`/`name`/`position`/`heading`/`speed`
where available. It is deliberately *not* the whole of `get`: filling the life,
damage and vehicle fields would mean asking three services once per player per
call for fields a proximity scan does not read. Call `get` on the one you picked.

An omitted or `nil` `radius` means no radius limit, which is how `closest` ranks
a whole bucket. `options`:

| Option | Default | Meaning |
|---|---|---|
| `bucket` | the anchor player's own bucket; **every bucket** for a point anchor | An integer narrows to that routing bucket. `false` means every bucket, and is how you opt back out when the anchor is a player. |
| `includeSelf` | `false` | Whether a player anchor appears in its own result. Ignored for a point anchor, which excludes nobody. |
| `limit` | unlimited | Keep only the first *n* after sorting. |
| `maxAgeMs` | unlimited | Drop players whose last reading is older than this. The default keeps stale readings, because a player whose snapshots stalled is still somewhere and silence is not an answer; `maxAgeMs` is how you ask for a threshold of your own. |
| `radius` | -- | `closest` only, since it takes no positional radius. |

`closest` returns a bare `nil` -- no second value -- when the search succeeded and
nobody matched, and `nil, reason` when it failed. That is what separates an empty
street from a bad argument.

Failure tokens, stable across all four: `invalid_player_id`, `invalid_argument`,
`invalid_position`, `invalid_radius`, `invalid_options`, `invalid_bucket`,
`invalid_limit`, `invalid_max_age`, `player_not_found`, `position_unknown`
(the player exists but has never reported a transform) and `sessions_unavailable`
(an embedding that does not replicate).
### Freezing a player

`Open77.players.setFrozen(playerId, frozen)` holds a player's body where it stands. It is the
primitive behind cuffs, a menu that must not be walked out of, a progress bar, a safe zone and a
scripted beat. The client applies the engine's own `GameplayRestriction.NoMovement` -- the same
record vanilla death applies -- so there is no animation fighting the hold, and the body does not
slide on any observer's screen: a frozen player keeps sending snapshots, their position simply
stops changing.

Be precise about what a freeze is, because the usability of the feature is exactly this list.

| Still works | Stopped |
|---|---|
| Looking around (mouse and controller camera) | Walking, running, sprinting, crouch-moving |
| Chat and voice | Jumping, dodging, sliding, vaulting |
| Opening menus and the inventory | Every other locomotion input, pressed or held |
| Interaction prompts | |
| **Taking damage, and dying** | |

It does **not** holster a weapon, block firing, or eject anyone from a vehicle. A freeze is a
primitive, not a policy: compose it with the control-blocking surface when a scene needs more.
The precedent is the death restriction, which has spared chat and voice since it shipped.

**The hold is a claim, not a value.** It is keyed by the calling resource, so a jail script and a
cutscene script may hold the same player at once, and `setFrozen(id, false)` drops only your own
claim -- he stays frozen while anybody else still holds him. `isFrozen` answers for all of them.

**Nothing can strand a player.** A freeze is released by death, respawn, a bucket change,
disconnect, and by the resource that set it stopping, reloading or crashing. Death and respawn
clear it outright, so a gamemode that wants a player held through a respawn must re-apply it
afterwards. As with `setGhosted`, the call is refused with `transition_in_progress` while a revive
or respawn is in flight -- a resource stop during one still thaws, because a refusal there would
be exactly the stranding this guards against.

```lua
-- Cuffs: two resources may hold the same suspect; each releases only its own hold.
local ok, reason = Open77.players.setFrozen(playerId, true)
if not ok then return print("could not freeze: " .. tostring(reason)) end

SetTimeout(30000, function()
  Open77.players.setFrozen(playerId, false)
  -- Still true here if another resource has a hold of its own on him.
  print("still held:", Open77.players.isFrozen(playerId))
end)
```

The flag rides the canonical life state, so it is reliable, it survives a proxy re-stream, and it
is readable as `Open77.players.getLifeState(playerId).frozen`. A client that predates the flag
decodes it and ignores it rather than disconnecting.

For a hold that needs no server round trip -- a local menu, a local progress bar -- the client has
`Open77.character.setFrozen(frozen)` under the `player.freeze` permission. It is
presentation-local, and the server's freeze outranks it: releasing a local hold while the server
holds the player changes nothing. Both halves, the engine lever behind them and every release path
are written up in [Freezing a player](player-freeze.md).
### Player visibility

`Open77.players.setVisible(playerId, false)` hides a player's body on every
other client. It is the presentation half of the pair whose other half is
`setGhosted`, and the two are deliberately independent: **visibility and
collision are separate levers**, so a player can be invisible and still solid
(still shootable, still blocking a door), or ghosted and perfectly visible. That
is what makes "invisible but still simulated" the default rather than a special
mode. Admin invisibility and spectating are the intended uses.

```lua
-- An admin drops out of sight but stays a real body in the world.
local ok, reason = Open77.players.setVisible(admin, false)
if not ok then print("setVisible refused: " .. reason) end

-- ...and back.
Open77.players.setVisible(admin, true)
```

Both calls return `true`, or `false, reason` — `permission_denied:players.life.visibility`,
`player_not_found`, `invalid_argument`, `life_unavailable`, or
`transition_in_progress` while a revive or respawn is mid-flight.

**What it does and does not change.**

| | Invisible player |
|---|---|
| Body rendered by other clients | **no** — the proxy's skinned meshes are hidden |
| Nameplate on other clients | **no** — withheld with the body, and a resource cannot opt out |
| Collision, aiming, being shot | unchanged — use `setGhosted` for that |
| Audible in proximity voice | **yes, unchanged** — see below |
| Present in `Open77.players.all()` and the client roster | **yes, unchanged** — see below |
| Map markers a resource draws itself | unchanged — the resource decides |

**Proximity voice is untouched: an invisible player is still heard.** Voice
attenuation is computed from replicated positions and has no connection to this
flag. Silencing him would be a second, unrelated policy — and a surprising one,
since a spectating admin usually wants to be able to talk. Mute him explicitly
through the voice API if that is what the gamemode wants.

**He also still appears in every roster.** `Open77.players.all()` on the server,
and the client-side player enumeration, both list him: this row changes
presentation, not membership. Hiding a player from a roster is a different
decision with different consequences (it would break scoreboards, chat targeting
and admin tooling), so a resource that wants him omitted filters on the flag
itself.

**The answer comes from the server bit, and is never probed from the engine.**
Cyberpunk 2.31 exposes no readable "is hidden" flag on `entIVisualComponent`
(the RTTI has `autoHideDistance`, `renderSceneLayerMask` and `forceLODLevel`, and
nothing else), so no client can be asked whether a body is *actually* hidden
right now. The life flag is the only truth: `isVisible` reads it, and each client
re-asserts the hide on a 1 Hz beat so a render-proxy rebuild — which is exactly
what dressing a garment performs — cannot quietly put the body back on screen.

**Arbitration with the dressing phase.** A remote body is also hidden while it is
being clothed, through the same engine lever and the same per-entity ledger. The
rule is: **the body stays hidden while at least one owner holds it, and a release
only shows the body when it is the last hold.** So dressing an invisible player
finishes without revealing him, and showing a player who is still being dressed
does not reveal a half-dressed puppet — the body appears when both are done, in
either order.

**Nothing strands a player invisible.** The flag is released on death, on
respawn, on a routing-bucket change, on disconnect, on reconnect, and when the
resource that set it stops or reloads. A release refused because a life
transition is in flight is queued and retried, not dropped. This matters more
than it does for ghosting, which auto-clears on separation: invisibility has no
such fallback, and no client can be asked to recover one.

### Unified health and stamina API

New resources should use `players.stats.read` and `players.stats.apply`. The
legacy `players.damage.*` permissions and `Open77.players` health methods remain
accepted aliases. The client exposes the same read names and the same
nested pool shape, but no setters. See [Player health and stamina](player-stats.md)
for the full synchronization model.

| Function | Permission | Signature | Result / purpose |
|---|---|---|---|
| `Open77.stats.get` / `GetPlayerStats` | `players.stats.read` | `(playerId)` | Combined canonical health/stamina snapshot or `nil`. |
| `Open77.stats.getHealth` / `health` | `players.stats.read` | `(playerId)` | Health pool `{ value, current, maximum, max, fraction, percentage, regenEnabled, regenPerSecond, regenerating }`. |
| `Open77.stats.getStamina` / `stamina` | `players.stats.read` | `(playerId)` | Stamina pool with the same shape. |
| `Open77.stats.set` | `players.stats.apply` | `(playerId, pool, value)` | Set `health` or `stamina` in points. |
| `Open77.stats.setMax` | `players.stats.apply` | `(playerId, pool, maximum)` | Set a canonical maximum and clamp the current value. |
| `Open77.stats.restore` | `players.stats.apply` | `(playerId, pool)` | Fill the selected pool. |
| `Open77.stats.setRegenEnabled` | `players.stats.apply` | `(playerId, pool, enabled)` | Toggle authoritative regeneration. |
| `Open77.stats.setRegenRate` | `players.stats.apply` | `(playerId, pool, pointsPerSecond)` | Set the rate; zero disables regeneration. |
| `Open77.stats.setHealth` / `SetPlayerHealth` | `players.stats.apply` | `(playerId, value)` | Explicit health setter; zero routes through life authority. |
| `Open77.stats.setHealthMax` / `SetPlayerMaxHealth` | `players.stats.apply` | `(playerId, maximum)` | Explicit health maximum setter. |
| `Open77.stats.restoreHealth` / `RestorePlayerHealth` | `players.stats.apply` | `(playerId)` | Fill health. |
| `Open77.stats.setHealthRegenEnabled` / `SetPlayerRegenEnabled` | `players.stats.apply` | `(playerId, enabled)` | Toggle health regeneration. |
| `Open77.stats.setHealthRegenRate` / `SetPlayerRegen` | `players.stats.apply` | `(playerId, rate)` | Set health regeneration rate. |
| `Open77.stats.setStamina` / `SetPlayerStamina` | `players.stats.apply` | `(playerId, value)` | Explicit stamina setter. |
| `Open77.stats.setStaminaMax` / `SetPlayerMaxStamina` | `players.stats.apply` | `(playerId, maximum)` | Explicit stamina maximum setter. |
| `Open77.stats.restoreStamina` / `RestorePlayerStamina` | `players.stats.apply` | `(playerId)` | Fill stamina. |
| `Open77.stats.setStaminaRegenEnabled` / `SetPlayerStaminaRegenEnabled` | `players.stats.apply` | `(playerId, enabled)` | Toggle stamina regeneration. |
| `Open77.stats.setStaminaRegenRate` / `SetPlayerStaminaRegen` | `players.stats.apply` | `(playerId, rate)` | Set stamina regeneration rate. |

The same setters are also reachable under `Open77.players`, for a resource that keeps every
player-facing call in one namespace. They are aliases of the `Open77.stats` entries above, not a
second implementation:

| Function | Permission | Signature | Alias of |
|---|---|---|---|
| `Open77.players.restoreHealth` | `players.stats.apply` | `(playerId)` | `Open77.stats.restoreHealth` |
| `Open77.players.setRegenEnabled` | `players.stats.apply` | `(playerId, enabled)` | `Open77.stats.setHealthRegenEnabled` |
| `Open77.players.setStamina` | `players.stats.apply` | `(playerId, value)` | `Open77.stats.setStamina` |
| `Open77.players.setMaxStamina` | `players.stats.apply` | `(playerId, maximum)` | `Open77.stats.setStaminaMax` |
| `Open77.players.restoreStamina` | `players.stats.apply` | `(playerId)` | `Open77.stats.restoreStamina` |
| `Open77.players.setStaminaRegen` | `players.stats.apply` | `(playerId, rate)` | `Open77.stats.setStaminaRegenRate` |
| `Open77.players.setStaminaRegenEnabled` | `players.stats.apply` | `(playerId, enabled)` | `Open77.stats.setStaminaRegenEnabled` |

`Open77.players.setDownedDamageable(playerId, enabled)` (low-level `SetPlayerDownedDamageable`)
requires `players.damage.apply` and decides whether a downed player can still be damaged: on for a
mode with finishing blows, off for one where a downed player is safe until revived.

Life option fields are:

- `kill`: `killer`, `cause`, `weapon`, `impulse = { x, y, z }`;
- `revive`: `health`, `graceMs`;
- `respawn`: required `position = { x, y, z }`, plus `heading`, `bucket`, `health`, `graceMs`;
- `damage`: `attacker`, `cause`/`kind`, `weapon`.

### Disconnecting and banning a player

Declare the capability explicitly in the server resource manifest:

```lua
permission "players.disconnect"
permission "players.ban"
```

Then disconnect an authenticated session ID with a reason shown to that client:

```lua
local ok, error = Open77.players.disconnect(playerId, "Banned: cheating")
if not ok then
  print("disconnect failed", error)
end

-- FiveM-style low-level spelling and short namespaced alias:
DropPlayer(playerId, "Kicked by an administrator")
Open77.players.kick(playerId, "Server maintenance")

-- Permanent when durationSeconds is omitted; otherwise temporary.
local banned, banError = Open77.players.ban(playerId, "Cheating", 86400)
-- FiveM-style low-level spelling:
BanPlayer(playerId, "Cheating", 86400)
```

The reason is trimmed, must contain no control characters, and is limited to 127 UTF-8 bytes so
the GNS transport can deliver it without truncation. Omitting it uses `Disconnected by server.`.
The closure is deferred until the current server Lua callback has returned; repeated calls for the
same player in one tick are idempotent and the first reason wins.

`Open77.players.ban` and `BanPlayer` resolve the player's authenticated device identity, submit a
server-scoped ban to the master, and queue the immediate disconnect. The optional duration is a
strictly positive number of seconds; omitting it creates a permanent ban. Ban reasons accept up to
512 UTF-8 bytes. Central publication is best-effort and asynchronous, while the local kick is
queued immediately.

Normal failures return `false, reason`, where `reason` is one of
`permission_denied:players.disconnect`, `invalid_player_id`, `invalid_reason`,
`player_not_found`, or `server_unavailable`.

Ban failures return `permission_denied:players.ban`, `invalid_player_id`, `invalid_reason`,
`invalid_duration`, `server_unavailable`, or `ban_failed`.

Low-level aliases are `GetPlayerName`, `GetPlayerIdentifier`, `GetPlayerPosition`, `GetPlayers`,
`GetPlayersInBucket`, `GetPlayersPositions`, `DropPlayer`, `BanPlayer`, `GetPlayerLifeState`, `IsPlayerDead`, `KillPlayer`, `RevivePlayer`, `RespawnPlayer`,
`RequestPlayerLifeResync`, `GetPlayerHealth`, `DamagePlayer`, `HealPlayer`, `SetPlayerHealth`,
`SetPlayerMaxHealth`, `SetPlayerArmor`, `SetPlayerGodMode`, `SetPlayerRegen`, `GetPlayerRead`,
`GetPlayersNearby`, `GetPlayerDistance`, and `GetPlayerHoloCallEyes` (the read half of
[holocall eyes](holocall-eyes.md), the same function as `Open77.players.getHoloCallEyes`). Prefer the namespaced wrappers because they accept
structured option tables.

Vehicle-seat low-level aliases are `SetPlayerIntoVehicle`, `ForcePlayerOutOfVehicle`,
`SetPlayerVehicleExitLocked`, and `GetPlayerVehicleSeat`; their full contract is documented under
[Vehicles](#player-seats).


## Moving a player

`Open77.players.teleport(playerId, position, options?)` is the placement primitive.
It moves a **living** player with no life transition: health, inventory, weapons and
vehicle occupancy are untouched. It returns a promise that resolves when the client
reports the body settled at the destination. (Clients 65 to 67 moved the body but
never answered: their settle watch was never ticked, so every promise ended in
`settle_timeout` about fifteen seconds later. Client 68 answers -- `settled` or
`near` in well under two seconds on a loaded floor.)

```lua
CreateThread(function()
    local placed, reason = Open77.players.teleport(source, { x = 1669.75, y = -739.12, z = 49.86 }, {
        heading = 180,
        bucket  = 4,      -- changed before the move, so nobody in the old bucket sees the new place
        fade    = true,   -- default; fadeOutMs / fadeInMs default to 400
    }):await()
    if not placed then
        print("teleport refused: " .. tostring(reason))
        return
    end
    print(("landed %s at %.2f %.2f %.2f"):format(placed.state, placed.x, placed.y, placed.z))
end)
```

Resolves with `{ x, y, z, state }`. `state` is `settled` when the body was grounded on
the point for three consecutive frames, or `near` when the window closed with the body on
the point but never reported grounded — a mark on a prop, or a very slow stream-in. Both
are successes; `near` is the weaker claim.

Rejects, all stable snake_case:

| Reason | Meaning |
|---|---|
| `player_not_ready` | No life record, or the join readiness gate is still closed. A player with no life record is on the "press any key to continue" screen, and **a server-side placement received there crashes the client** — measured, not theoretical. |
| `player_not_alive` | The life phase is not `alive`. A move is not a resurrection; use `revive` or `respawn`. |
| `player_in_vehicle` | The body is mounted. See below. |
| `dismount_failed` | `dismount = true` was asked for and the body was still in its seat when the ejection budget closed. Refused rather than teleporting a mounted body. |
| `invalid_position` | Not three finite numbers, or outside the world by orders of magnitude. |
| `settle_timeout` | The client never got the body to stand at the destination inside the budget, or never answered at all. |
| `settle_superseded` | A second teleport for the same player started before this one finished. There is one body, so there is one placement. |

### Why not `respawn`

`Open77.players.respawn` **cannot move a living player**. `PlayerLifeService.Respawn`
refuses unless the phase is already `Dead`, which is why the only sanctioned placement in
the platform before this one was a kill → respawn: a whole life transaction — a death, a
ragdoll, a resurrect, a health write and a grace window — to move a body four metres.

What that transaction carried and a bare transform write does not is the part that
matters, and `teleport` keeps it: the client watches the body and only then reports it
placed. A direct write over any real distance drops the player through a floor that has
not streamed in, the engine's own fall-under-world failsafe returns them to the save's
spawn kilometres away, and nothing notices. The client re-issues the teleport every
250 ms while the body sinks, which resets the fall before the failsafe can fire and keeps
the streaming prefetch aimed at the mark.

### A player in a vehicle

Refused with `player_in_vehicle`, by default and on purpose.

`gameTeleportationFacility::Teleport` moves the player object; it has no working vehicle
variant (for a non-player entity the call reports success and the entity never moves), so
there is no way to carry the car along. Moving the occupant alone leaves the seat behind,
and the platform's older kill → respawn primitive dealt with a mounted player by
**unmounting first** — that is, by losing the vehicle.

So the honest answers are "refuse" or "eject, then move", and the caller picks:

```lua
Open77.players.teleport(source, point, { dismount = true })
```

With `dismount`, the client stops the seat workspot and unmounts the occupant behind the
fade, retrying at 100 ms for up to 750 ms — the same cadence and budget the death
transaction pays for the same transition — and refuses with `dismount_failed` if the body
is still seated when that closes. It never teleports a mounted body.

Silently ejecting by default would destroy the vehicle state this API promises to keep.

### `setHeading`

`Open77.players.setHeading(playerId, yaw)` turns a living player to face a yaw. It is the
cheap half: a heading streams nothing and cannot fall through a floor, so it dispatches
and returns `true` rather than confirming. It refuses with the same `player_not_ready` /
`player_not_alive` rules, plus `invalid_heading`.


## Combat policy

The global combat policy functions below require `combat.config`. Scoped PvP
grants use the separate `combat.scope.control` permission.

| Function | Signature | Purpose |
|---|---|---|
| `Open77.combat.onDamage` | `(handler)` | Add a synchronous damage arbiter and return it. `false` cancels; a number rewrites damage. |
| `Open77.combat.offDamage` | `(handler)` | Remove a previously installed arbiter. |
| `Open77.combat.setFriendlyFire` | `(enabled)` | Enable or disable global player-versus-player damage; equal nonzero teams remain protected. |
| `Open77.combat.setTeam` | `(playerId, teamId)` | Assign a non-negative team. |
| `Open77.combat.setDamageMultiplier` | `(multiplier)` | Set global multiplier, range 0–100. |
| `Open77.combat.setHeadshotMultiplier` | `(multiplier)` | Set headshot multiplier, range 0–100. |
| `Open77.combat.setWeaponDamageMultiplier` | `(weaponTdbId, multiplier)` | Override one weapon, range 0–100. |
| `Open77.combat.setKindDamageMultiplier` | `(ranged|melee|explosion, multiplier)` | Override one attack kind. |

Low-level aliases are `SetCombatFriendlyFire`, `SetCombatTeam`, `SetCombatDamageMultiplier`,
`SetCombatHeadshotMultiplier`, `SetCombatWeaponMultiplier`, and `SetCombatKindMultiplier`.

### Scoped PvP

`Open77.combat.createScope({bucket=7, players={firstPlayer, secondPlayer}})` returns
a scope ID string, or `nil, reason`. `Open77.combat.removeScope(id)` returns
`true`, or `nil, reason`. Both require `combat.scope.control`; `combat.config`
alone does not grant them. Scopes belong to the calling resource instance.

A scope permits its explicit roster to damage one another in that bucket while
global PvP remains disabled. It changes no global settings and never overrides
same-team, god-mode, life, range or Lua damage-veto checks. It does not disable
damage that an existing global PvP policy already permits. The resource still
owns admission/consent and may use `onDamage` for additional arena rules.

Creation requires 2–32 distinct living registered players already in the
specified bucket. A player can belong to only one scope. Limits are 64 scopes
globally and eight per resource instance. Resource stop/disposal releases its
scopes. Disconnect, bucket exit and body registration remove that participant;
fewer than two remaining participants destroys the scope. Reconnecting or
returning to the bucket does not restore admission. Remove and recreate a scope
to change its roster; an ID from an earlier resource instance cannot be reused.

Typical refusals: `invalid_scope`, `player_unavailable`, `player_scoped`,
`scope_limit`, `scope_owned`, `scope_unavailable`, `resource_stopping`.
This API supplies combat permission only; it does not teleport players, switch
teams, alter implants or provide a temporary equipment loadout.

## Routing buckets

| Function | Signature | Result / purpose |
|---|---|---|
| `Open77.routingBuckets.getPlayer` | `(playerId)` | Player bucket, default `0`. |
| `Open77.routingBuckets.setPlayer` | `(playerId, bucket)` | `boolean`; moves authoritative visibility scope. |
| `Open77.routingBuckets.getEntity` | `(entityId)` | Entity bucket, default `0`. |
| `Open77.routingBuckets.setEntity` | `(entityId, bucket)` | `boolean`. |
| `Open77.routingBuckets.setLockdownMode` | `(bucket, mode)` | Mode: `inactive`, `relaxed`, `strict`, or `full`. |
| `Open77.routingBuckets.setPopulationEnabled` | `(bucket, enabled)` | Toggle ambient population policy for the bucket. |

The corresponding globals are `GetPlayerRoutingBucket`, `SetPlayerRoutingBucket`,
`GetEntityRoutingBucket`, `SetEntityRoutingBucket`, `SetRoutingBucketEntityLockdownMode`, and
`SetRoutingBucketPopulationEnabled`.

## Time and weather

Every call requires `world.environment` — the same capability name the client side of this API
uses. The full guide, including the wire protocol, the presets and the operator commands, is
[Synchronised time and weather](weather.md).

| Function | Signature | Result / purpose |
|---|---|---|
| `Open77.environment.setTime` | `(hour, minute, second, bucket?)` | Sets the authoritative clock. State table, or `nil, reason`. |
| `Open77.environment.setTimeFrozen` | `(frozen, bucket?)` | Stops or resumes the clock at its current reading. |
| `Open77.environment.setTimeRate` | `(rate, bucket?)` | Game seconds per real second, `0`–`120`. |
| `Open77.environment.setWeather` | `(preset, transitionSeconds?, bucket?)` | Applies a preset over a transition of `0`–`300` s. |
| `Open77.environment.setWeatherFrozen` | `(frozen, bucket?)` | Pins the preset by stopping the weighted random scheduler. |
| `Open77.environment.getState` | `(bucket?)` | The canonical state, including both frozen flags. |
| `Open77.environment.clearBucket` | `(bucket)` | Retires a per-bucket override; its players return to the default sky. |
| `Open77.environment.publishChange` | `(state)` | The authority's own door onto `onEnvironmentChanged`. No other resource needs it. |

```lua
-- Night, frozen, and a clear sky that stays clear.
local state, reason = Open77.environment.setTime(23, 0, 0)
if not state then return print("no environment authority: " .. reason) end
Open77.environment.setTimeFrozen(true)
Open77.environment.setWeather("sunny", 10)
Open77.environment.setWeatherFrozen(true)
```

`getState()` answers the same table every setter returns:

| Field | Meaning |
|---|---|
| `scope`, `bucket` | `default` and `nil`, or `bucket:<n>` and `<n>` for an override. |
| `hour`, `minute`, `second`, `secondsOfDay` | The authoritative clock at the moment of the call. |
| `rate`, `frozen` / `timeFrozen` | Game seconds per real second, and whether the clock is stopped. |
| `weather`, `weatherPreset`, `weatherPriority` | Open77 name, REDengine `24h_weather_*` value, submission priority. |
| `transitionSeconds`, `weatherTransitionRemainingMs` | The transition requested, and what is left of it. |
| `weatherFrozen`, `randomWeather`, `nextWeatherInMs` | Whether the weighted scheduler is pinned, and its deadline. |
| `revision`, `weatherRevision`, `authorityEpoch` | The versioning clients use to reject a stale snapshot. |
| `buckets` | Every routing bucket currently holding an override, ascending. |

Failure tokens: `permission_denied:world.environment`, `environment_unavailable`, `invalid_time`,
`unknown_weather`, `invalid_transition`, `transition_must_be_between_0_and_300`,
`rate_must_be_between_0_and_120`, `invalid_bucket`, `unknown_bucket`,
`too_many_environment_overrides`, `invalid_argument`.

### Per-bucket overrides

A routing bucket is a separate world, so a race at night and a freeroam at noon is one server.
Passing `bucket` to any setter creates that bucket's override, seeded from the default environment
as it reads at that moment, and updates it afterwards. `clearBucket` retires it.

```lua
Open77.environment.setTime(23, 0, 0, 5)       -- bucket 5 only
Open77.environment.setWeather("rain", 0, 5)
Open77.environment.clearBucket(5)             -- back to the default sky
```

Two consequences worth knowing before reaching for it. A player who changes bucket is re-synced
individually, so the move is seamless; and while **any** override exists, the authority stops
broadcasting and addresses every connected player individually, because a broadcast would reach
the overridden bucket too and overwrite it. A server that never creates one pays nothing.

### `onEnvironmentChanged`

A platform event: it reaches every running resource, needs no capability to receive, and cannot be
published by a resource — `TriggerEvent("onEnvironmentChanged", …)` answers `false,
"reserved_event"`. The payload is exactly what `getState()` returns, plus `reason`, so a HUD can
render from it without asking a second question.

```lua
AddEventHandler("onEnvironmentChanged", function(state)
    print(("%s at %02d:%02d (%s)"):format(state.weather, state.hour, state.minute, state.reason))
end)
```

It fires on a real change only — never on the 5-second heartbeat and never on a client's sync
request.

## Ground loot

Every method requires `world.loot`. Drops are authoritative and owned by their creating resource.

| Function | Signature | Result |
|---|---|---|
| `Open77.loot.create` | `(definition)` | Open77 loot ID, or `nil, reason`. |
| `Open77.loot.update` | `(id, patch)` | `boolean` |
| `Open77.loot.remove` | `(id)` | `boolean` |
| `Open77.loot.get` | `(id)` | Drop snapshot or `nil`. |
| `Open77.loot.all` | `(bucket?)` | Array of drop snapshots. |

Definitions accept `item`, `quantity`, `position`, `bucket`, `radius`, `label`, `visualItem`/`model`,
and `ttlMs`. Low-level aliases are `CreateLootDrop`, `UpdateLootDrop`, `RemoveLootDrop`,
`GetLootDrop`, and `GetLootDrops`. See [loot](loot.md) for pickup validation and client projection.

## Vehicles

Every method in this section requires `world.vehicles`. IDs are server-assigned Open77 IDs; do not
substitute REDengine entity pointers or local spawn handles.

The [vehicle guide](vehicles.md#complete-lua-api-inventory) lists the complete server and client
surfaces, the package exports, exact snapshot fields, bit indexes, and examples.

### Lifecycle and state

| Function | Signature | Purpose |
|---|---|---|
| `Open77.vehicles.create` | `(definition)` | Create and return an authoritative vehicle ID. |
| `Open77.vehicles.update` | `(id, patch)` | Patch health, flags, colours, openings and all durable damage channels. |
| `Open77.vehicles.get` | `(id)` | Full canonical vehicle snapshot or `nil`. |
| `Open77.vehicles.all` | `(bucket?)` | All canonical vehicles, optionally filtered by bucket. |
| `Open77.vehicles.setTransform` | `(id, transform)` | Set authoritative position and yaw. |
| `Open77.vehicles.remove` | `(id)` | Remove the authoritative vehicle. |
| `Open77.vehicles.getDamage` | `(id)` | `{ body, glass, lights, tires, detachedParts }` or `nil`. |
| `Open77.vehicles.setDamage` | `(id, damage)` | Replace combined damage fields. |
| `Open77.vehicles.repair` | `(id, scope?)` | Scope: `glass`, `body`, `lights`, `tires`, `visual`, `mechanical`, or `full`. |
| `Open77.vehicles.setPaint` | `(id, paint)` | Set authoritative primary/secondary RGB paint. |
| `Open77.vehicles.getPaint` | `(id)` | `{ applied, primary, secondary }` or `nil`. |
| `Open77.vehicles.resetPaint` | `(id)` | Restore the vehicle's original paint. |
| `Open77.vehicles.setLocked` | `(id, locked)` | Atomically set or clear the durable entry lock. |
| `Open77.vehicles.lock` / `unlock` | `(id)` | Entry-lock convenience methods. |
| `Open77.vehicles.isLocked` | `(id)` | Canonical entry-lock boolean or `nil`. |
| `Open77.vehicles.triggerHorn` / `honk` | `(id, durationMs?)` | Reliably sound the horn through the owner or every parked-vehicle viewer. |
| `Open77.vehicles.setHealth` / `getHealth` | `(id, health)` / `(id)` | The one normalized `0..1` health pool. |
| `Open77.vehicles.setEngineHealth` / `getEngineHealth` | `(id, health)` / `(id)` | The same pool under its FiveM name. |

### Engine, lights and siren

These write **one named bit** of the durable flags and leave the rest alone. `flags` and `update`
are unchanged and keep working exactly as they did; these are another way into the same canonical
field, not a replacement for it.

| Function | Signature | Purpose |
|---|---|---|
| `Open77.vehicles.setEngine` | `(id, on)` | Start or stop the engine. |
| `Open77.vehicles.startEngine` / `stopEngine` | `(id)` | Aliases that read as actions. |
| `Open77.vehicles.isEngineOn` | `(id)` | Canonical engine boolean, or `nil, reason`. |
| `Open77.vehicles.setDrivable` | `(id, drivable)` | Take the car out of service, or put it back. |
| `Open77.vehicles.setUndriveable` | `(id, undriveable)` | Inverted spelling, for a `SetVehicleUndriveable` port. |
| `Open77.vehicles.isDrivable` | `(id)` | Canonical in-service boolean, or `nil, reason`. |
| `Open77.vehicles.setLights` | `(id, mode)` | `"off"`, `"on"`, `"high"`, or a boolean. |
| `Open77.vehicles.setHighBeams` | `(id, on)` | Raise or drop the beams without going dark. |
| `Open77.vehicles.getLights` / `areLightsOn` | `(id)` | The mode as a word, or whether anything is lit. |
| `Open77.vehicles.setSiren` | `(id, on)` | Light bar **and** sound together. |
| `Open77.vehicles.isSirenOn` | `(id)` | Canonical siren boolean, or `nil, reason`. |

Each electrical write also records a **ten-second intent** that outranks the physics owner's
durable report for the bits it names, and is released the moment that owner reports the same value.
Without it a setter races the 500 ms owner report that was already in flight and loses at random --
the mechanism that made Pursuit's cop sirens go dark five seconds after every spawn.

`setDrivable(id, false)` cuts the engine in the same canonical revision and locks the simulated
driver's throttle and brake on every projection. Putting the car back in service does not restart
the engine; that is `setEngine`. Like the entry lock, the bit is server-authored and no owner
report can clear it.

**The siren's light bar and sound cannot be separated**: the only native this build exposes is
`vehicleBaseObject.ToggleSiren(Bool)`, with no channel argument. **Indicators and the interior
light are deliberately not shipped** -- REDengine 2.31 exposes no verified native for either, and a
setter that silently does nothing is worse than no setter. An authority release or revoke switches
every electrical bit off by platform design, so re-assert on `onVehicleAuthorityChanged` if a
parked car must stay lit. Full reasoning and the worked examples are in the
[vehicle guide](vehicles.md#engine-lights-and-siren).

Per-vehicle gameplay data a server invents -- fuel, keys, a plate, an owner -- does not belong in
these flags. Put it in a [state bag](state-bags.md) on the vehicle instead.

### Transform and motion

| Function | Signature | Purpose |
|---|---|---|
| `Open77.vehicles.getPosition` | `(id)` | `{ x, y, z }`, which is a vector3. |
| `Open77.vehicles.getHeading` / `getYaw` | `(id)` | Heading in degrees, the same units as the player read. |
| `Open77.vehicles.getSpeed` | `(id)` | Metres per second. |
| `Open77.vehicles.getSpeedKph` | `(id)` | Kilometres per hour, the unit speed limits use. |
| `Open77.vehicles.getVelocity` | `(id)` | `{ x, y, z }` in metres per second. |
| `Open77.vehicles.getDriver` | `(id)` | The driving player id, or `nil`. |

`Open77.vehicles.get` carries all of it, so these are shortcuts rather than extra work:
`position`, `heading` and `yaw` (one value, both names), `orientation` as `{ x, y, z, w }`,
`velocity`, `angularVelocity`, `speed`, `speedKph`, `onGround`, `reversing`, `moving`,
`driverPlayerId`, and the derived `exploded` / `destroyed` booleans. `x`, `y` and `z` are
unchanged and still there.

**Motion is the last thing the physics owner reported.** A vehicle with no owner is not being
simulated by anyone, so losing the lease -- a driver stepping out, disconnecting, or the lease
expiring -- zeroes the velocity, the speed and the dynamics bits rather than leaving a parked car
claiming the speed it had when its driver got out. A server `setTransform` clears them for the same
reason. `physicsOwner == 0` and `moving == false` both say so, and `moving` is exactly
`physicsOwner ~= 0 and speed > 0.1`.

`driverPlayerId` is absent, not zero, when nobody is driving -- and absent while an entry animation
is still running, because a reserved seat is not yet a driver. `heading` is extracted from the full
quaternion rather than from `qz`/`qw` alone, so a car on a slope reports the heading it is actually
facing.

**Only server-spawned vehicles are in the registry**, so none of this answers for a vanilla traffic
car a player climbed into. Adopting vanilla traffic is a separate capability that does not exist
yet.

### Performance ceilings

| Function | Signature | Purpose |
|---|---|---|
| `Open77.vehicles.setPerformance` | `(id, profile)` | Cap top speed and pickup, or clear with `nil`. |
| `Open77.vehicles.clearPerformance` | `(id)` | Hand the vehicle back its rated performance. |
| `Open77.vehicles.getPerformance` | `(id)` | The ceiling in force, or `nil`. |

```lua
Open77.vehicles.setPerformance(id, { topSpeedKph = 60.0, accelerationScale = 0.5, taperKph = 10.0 })
```

| Field | Default | Meaning |
|---|---|---|
| `topSpeedKph` | `0` | Speed ceiling in km/h. Zero means no ceiling. |
| `accelerationScale` | `1` | Throttle authority at every speed, in `(0, 1]`. This is how a car is made to *pick up* more slowly rather than only to top out lower. |
| `taperKph` | `12` | How many km/h below the ceiling the throttle starts easing off, so the car settles into its limit instead of slamming into it. Must be `3..200`. |

A profile that asks for nothing -- no ceiling and full throttle authority -- is stored as no
profile at all, which is the same thing `clearPerformance` does. The taper is deliberately not part
of that test: a roll-off width around a ceiling that does not exist changes nothing.

**The taper is never zero.** Below about 3 km/h the roll-off is short enough that the limiter hunts
around the ceiling, which reads as stutter, and the client-local governor has refused that band
since it shipped. The server form enforces the same envelope -- `topSpeedKph` `0..1000`,
`accelerationScale` in `(0, 1]`, `taperKph` `3..200` -- on the Lua boundary, in the registry and on
both sides of the wire, so a server cap cannot be a way around a rule that exists because somebody
measured it. Refusals are `invalid_top_speed`, `invalid_acceleration`, `invalid_taper` and
`vehicle_not_found`.

**This is the server-authoritative form of the client-local governor.** The client-side
`Open77.vehicles.setPerformance` (permission `vehicles.performance`) is unchanged and still works;
it takes the same three numbers, and the difference is only who decides them. A tuning shop, or a
speed limit inside an instance, cannot be a decision the client makes.

The ceiling is replicated to **every viewer**, not only to the client that currently owns the
physics. Ownership changes every time a driver steps in or out, and a ceiling chased across those
transitions would be missing for exactly the first second of every drive -- the second a speed
limit has to hold. Each client applies it to its own projection; the native governor only has
throttle to clamp on the machine actually simulating the car, so sending it wide costs a no-op on
observers.

It also **survives the owner's durable report**, by construction rather than by a window: that
report carries no performance field, so the merge has nothing to overwrite. The one race that does
exist is on the client, where the ceiling routinely arrives before the projection has attached -- a
server-created vehicle has been measured taking 3.7 s to stream in -- so the client holds the
intent on the replica and applies it when the entity appears, and again if the projection
re-attaches.

Read the ceiling back on the client from the vehicle snapshot's own drivetrain telemetry
(`speed`, `speedKph`, `rpm`); the server read carries it as `get(id).performance`.

### Explode, and locking for one player

| Function | Signature | Purpose |
|---|---|---|
| `Open77.vehicles.explode` | `(id)` | Detonate the vehicle. |
| `Open77.vehicles.setLockedForPlayer` | `(id, playerId, locked)` | Decide one player's lock; `nil` clears the exception. |
| `Open77.vehicles.clearLockedForPlayer` | `(id, playerId)` | Drop one player's exception. |
| `Open77.vehicles.setLockedForAll` | `(id, locked)` | Set the canonical lock **and** revoke every exception. |
| `Open77.vehicles.lockForAll` / `unlockForAll` | `(id)` | Aliases that read as actions. |
| `Open77.vehicles.isLockedForPlayer` | `(id, playerId)` | What that one player sees, or `nil, reason`. |

**What `explode` does.** It writes the canonical ledger: health to zero, `destroyed` and `exploded`
raised, one revision. Every client that has the vehicle streamed then reconciles its own projection
through the damage path that already replays a wreck to a late joiner, which ends in the engine's
own explosion on that machine. The blast, the sound and the physics are REDengine's, on every
viewer at once.

- **Occupants stay occupants.** Nobody is ejected, no seat is freed, no life state changes, and the
  server sends no damage to any player. What the blast does to a body -- inside the car or standing
  next to it -- is the engine's own damage model running on each client, and it reaches the server
  the ordinary way, through the player damage report. A resource that wants the occupants dead has
  to say so itself.
- **It is terminal.** A second call on an already exploded vehicle is refused with
  `already_exploded` rather than re-detonating a wreck. A vehicle that is merely `destroyed` --
  written off by collisions, never blown up -- is still a legitimate target.
- **An owner report cannot undo it.** Health merges by minimum and the destruction bits by OR, both
  monotone, so a report taken a moment before the explosion and claiming a pristine car does not
  bring it back to life.

**Per-player locks** exist because all-or-nothing is the wrong shape for keys. A keys resource
locks the car for the street and excepts the holders:

```lua
Open77.vehicles.setLockedForAll(id, true)            -- the street
Open77.vehicles.setLockedForPlayer(id, holder, false) -- the key holder
```

The canonical bit stays `locked`, so a late joiner is told the right thing with no bookkeeping, and
a key holder who disconnects takes their exception with them. The substitution happens at the point
where state reaches a socket, so no fan-out path can disagree with `isLockedForPlayer`.

`setLockedForAll` **revokes every exception** as well as moving the canonical bit -- "lock this for
everyone" has to mean everyone, including the holders excepted a minute ago. `Open77.vehicles.setLocked`
is unchanged and moves only the canonical bit, leaving exceptions standing.

### Lifetime

| Function | Signature | Purpose |
|---|---|---|
| `Open77.vehicles.setTimeToLive` / `setTtl` | `(id, ttlMs)` | Give the vehicle a deadline; `0` or `nil` cancels one. |
| `Open77.vehicles.setPersistent` | `(id, persistent)` | Exempt it from every automatic removal. |
| `Open77.vehicles.setDespawnWhenUnobserved` | `(id, despawn)` | Remove it once nobody has it streamed. |

`Open77.vehicles.create` takes the same three as `ttlMs`, `persistent` and `despawnWhenUnobserved`,
so a garage does not have to make two calls. A definition without them behaves exactly as it did
before. A lifetime that cannot be applied undoes the creation rather than half-honouring it, the
same rule the initial-damage path already follows.

`persistent` has one meaning, deliberately: **nothing automatic removes this vehicle.** No
time-to-live takes it, the unobserved sweep does not take it, and it survives the stop of the
resource that created it. An explicit `Open77.vehicles.remove` still takes it -- persistence is
protection from the reapers, not from the owner.

`despawnWhenUnobserved` removes the vehicle once no player has had it streamed for **thirty
seconds**. The window is not zero because interest is recomputed against the last received player
snapshot, and a loading screen or a bucket change briefly empties a viewer set that is about to
refill. The clock runs for a vehicle nobody has *ever* seen too, which is what a garage wants: a
car spawned for a player who never turns up still goes. A viewer coming back resets the clock
rather than pausing it.

A deadline is read back as `get(id).ttlMs`, counted from now, and is absent rather than zero once
it is cancelled. `ttlMs` is capped at seven days, mirroring the prop registry; `invalid_ttl` is the
refusal.

**A deadline takes an occupied vehicle too**, deliberately -- a time-to-live silently declined
because someone was sitting in the car is a worse surprise than the removal. The seat ledger is
closed out properly either way. Clear the deadline on `onPlayerEnteredVehicle`, or mark the vehicle
persistent, if that matters. The unobserved sweep cannot hit an occupied vehicle at all: a seated
player always has their vehicle streamed.

### Finding a vehicle

| Function | Signature | Purpose |
|---|---|---|
| `Open77.vehicles.nearby` | `(anchor, radius?, options?)` | Registered vehicles near a point or a player, nearest first. |
| `Open77.vehicles.closest` | `(anchor, options?)` | The nearest one, or a bare `nil`. |
| `Open77.vehicles.seatFree` | `(id, seat)` | Whether one seat is free. |
| `Open77.vehicles.occupantInSeat` | `(id, seat)` | The player in one seat, or `nil`. |
| `Open77.vehicles.freeSeats` | `(id)` | Free seats in canonical order. |
| `Open77.vehicles.seatName` | `(seat)` | Canonical spelling of any accepted seat form. |

The anchor, bucket and limit conventions are exactly those of `Open77.players.nearby`: a position
table (a vector3 is one) or a player id, a player anchor defaulting to that player's own routing
bucket, `bucket = false` for every bucket, ties broken by id. `options.occupied` keeps only
occupied (`true`) or only empty (`false`) vehicles, and `limit` caps the list. Nothing in range is a
bare `nil` with no reason.

**Only server-spawned vehicles are in the registry.** A player standing next to a vanilla traffic
car is standing next to something REDengine population spawned on their own client: it has no
canonical id and none of these calls can see it. `closest` will answer with a registered car
further away instead, which is expected rather than broken -- check `distance` yourself if it
matters. Adopting vanilla traffic is a separate capability that does not exist yet.

### Player seats

| Function | Signature | Purpose |
|---|---|---|
| `Open77.vehicles.warpPlayerIntoVehicle` | `(playerId, vehicleId, seat, options?)` | Reserve a canonical vehicle seat and durably force the client mount, including late stream-in. |
| `Open77.vehicles.setPlayerIntoVehicle` | `(playerId, vehicleId, seat, options?)` | Alias of `warpPlayerIntoVehicle`. |
| `Open77.vehicles.forcePlayerOutOfVehicle` | `(playerId, vehicleId?)` | Force native unmount, overriding exit lock. |
| `Open77.vehicles.removePlayerFromVehicle` | `(playerId, vehicleId?)` | Alias of `forcePlayerOutOfVehicle`. |
| `Open77.vehicles.setPlayerExitLocked` | `(playerId, locked, vehicleId?)` | Set or clear the durable no-exit policy. |
| `Open77.vehicles.getPlayerSeat` | `(playerId)` | Canonical assignment or `nil`. |
| `Open77.vehicles.isPlayerExitLocked` | `(playerId)` | Canonical exit-lock boolean. |

Seat changes also raise three derived events -- `onPlayerEnteringVehicle`,
`onPlayerEnteredVehicle` and `onPlayerLeftVehicle`, each `(playerId, vehicleId, seat)` -- so a
resource no longer has to fetch the vehicle and diff the occupant list itself on every
`onVehicleOccupancyChanged`. They are derived from that same ledger at the single point it is
published, `entered`/`left` are balanced pairs, and the names are reserved: a resource publishing
one gets `false, "reserved_event"`. The exact firing rules are in the
[vehicle guide](vehicles.md#enter-and-exit-derived).

`options.moveBucket` defaults to `true`; when false, a bucket mismatch returns `wrong_bucket`.
`options.exitLocked` (alias `lockExit`) defaults to false. Seats accept FiveM indexes `-1..2`,
the `Open77.vehicles.seats` constants, aliases such as `driver`/`frontPassenger`, and canonical
`seat_*` names. Seat coordination is cross-resource: `world.vehicles` permits assignment, ejection,
and exit locking in any canonical vehicle. A forced entry bypasses proximity and the vehicle locked
flag but rejects destroyed/exploded targets and occupied seats. Durable vehicle state and lifecycle
mutations follow the same cross-resource contract.

The forced order remains in reliable occupancy state until native confirmation, so it survives a
target that has not streamed yet, a bucket transition, stream-out/stream-in, and local projection
replacement. Exit lock blocks ordinary unmount and manual seat switching; a forced exit overrides
it and retains the seat until confirmation or the bounded transition timeout.

Player-oriented aliases are `Open77.players.getVehicleSeat`, `warpIntoVehicle`,
`forceOutOfVehicle`, and `setVehicleExitLocked`. See
[authoritative player seats](vehicles.md#authoritative-player-seats) for assignment fields,
failure reasons, client read APIs, and examples.

`create` accepts `record`, `position`, `yaw`, `bucket`, `appearance`, `health`, `flags`,
`primaryColor`, `secondaryColor`, the nested `paint = { primary, secondary }` form, and the same
initial damage/opening fields accepted by `update`. Paint colors accept `"#RRGGBB"`, `{ r, g, b }`,
or positional `{ r, g, b }` tables. Supplying only a primary color mirrors it to secondary.
`setPaint` and `resetPaint` publish reliable canonical state to current viewers and late joiners;
pure black is valid because `paintApplied` is a separate flag. See the dedicated
[vehicle paint guide](vehicle-paint.md) for complete examples, events, and native limitations.

`setLocked`, `lock`, and `unlock` change only the `locked` flag and publish durable state to current
viewers and late joiners. The entry lock blocks ordinary seat claims; it is distinct from the
per-occupant `setPlayerExitLocked` policy and from client-side grid freeze/control locks. Forced
server assignment may deliberately bypass it. The client consumes the replicated lock before
publishing its mount interaction and checks it again before the mounting request, so a rejected
entry does not briefly put the player inside. `triggerHorn` accepts 100..2000 milliseconds
(default 250) and sends a reliable authority-epoch-bound command to the current physics owner.
Parked vehicles deliberately retain owner 0, so their command is sent directly to every current
viewer without granting a physics lease. Horn state is transient and is mirrored to observers by
the regular vehicle motion stream rather than persisted.

The server vehicle registry is shared across resources. Any resource granted `world.vehicles` may
read, mutate, repair, paint, move, seat players in, or remove any canonical vehicle, regardless of
which resource created it. The snapshot `resource` field is provenance and automatic cleanup scope,
not an authorization boundary.

### Body, glass, lights, and tires

| Function | Signature | Purpose |
|---|---|---|
| `setBodyDamage` | `(id, values[30])` | Replace all normalized body cells. |
| `setBodyCell` / `damageBodyCell` / `repairBodyCell` | `(id, cell, value?)` | Set, add to, or clear cell 1–30. |
| `setBodyZone` / `damageBodyZone` / `repairBodyZone` | `(id, zone, value?)` | Mutate a named/profile zone or explicit cell array. |
| `setGlassMask` | `(id, mask)` | Replace the 32-bit broken-glass mask. |
| `setGlassBroken` | `(id, glass, broken)` | Mutate one numeric or profile-named pane. |
| `breakGlass` / `repairGlass` | `(id, glass)` | Convenience pane mutation. |
| `breakAllGlass` / `repairAllGlass` | `(id, count?)` / `(id)` | Break the first 0–32 panes or clear the mask. |
| `setLightMask` | `(id, mask)` | Replace broken-light mask. |
| `setLightBroken` | `(id, index, broken)` | Mutate one light bit. |
| `breakLight` / `repairLight` / `repairAllLights` | `(id, index?)` | Light convenience methods. |
| `setTireMask` | `(id, mask)` | Replace four-wheel broken-tire mask. |
| `setTireBroken` | `(id, index, broken)` | Mutate tire index 0–3. |
| `breakTire` / `repairTire` / `repairAllTires` | `(id, index?)` | Tire convenience methods. |
| `registerDamageProfile` | `(record, profile)` | Register record-specific glass names and body zones in this VM. |
| `getDamageProfile` | `(record)` | Return this resource's registered profile or `nil`. |

Default `Open77.vehicles.bodyZones` are `backLeft`, `back`, `backRight`, `left`, `center`, `right`,
`frontLeft`, `front`, `frontRight`, `lower`, `roof`, and `all`.

### Doors and windows

| Function | Signature | Purpose |
|---|---|---|
| `setDoorMask` | `(id, mask)` | Replace the six-bit opening mask. |
| `setDoorOpen` | `(id, door, opened)` | Set one opening. |
| `openDoor` / `closeDoor` | `(id, door)` | Convenience mutation. |
| `isDoorOpen` | `(id, door)` | Boolean or `nil` for unknown vehicle. |
| `setWindowOpen` | `(id, window, opened)` | Set one window opening. |
| `openWindow` / `closeWindow` | `(id, window)` | Convenience mutation. |
| `isWindowOpen` | `(id, window)` | Boolean or `nil` for unknown vehicle. |

Door names are `frontLeft`, `frontRight`, `backLeft`, `backRight`, `trunk`, and `hood`; windows
use the four side names. Constants live in `Open77.vehicles.doors` and `.windows`. State flags live
in `.flags`: `engineOn`, `locked`, `destroyed`, `exploded`, `invulnerable`, `immortal`, `lightsOn`,
`highBeams`, `sirenOn`, and `paintApplied`. Prefer `setPaint`/`resetPaint` over changing the paint bit
directly.

### Detached panels

| Function | Signature | Purpose |
|---|---|---|
| `setDetachedPartMask` | `(id, mask)` | Add a monotonic 16-bit detached-part mask. |
| `setPartDetached` | `(id, part, true)` | Detach one standard named/indexed panel. |
| `detachPart` | `(id, part)` | Convenience detachment method. |
| `isPartDetached` | `(id, part)` | Read one canonical detachment bit. |

Names are exposed in `Open77.vehicles.detachedParts`. Live reattachment is deliberately rejected
because REDengine 2.31 has no validated safe inverse of `DetachPart`; respawn the vehicle instead.

### Autonomous driving

`Open77.vehicles.ai` attaches a native driver to a canonical vehicle and gives it orders:
`attachDriver(id, options)`, `removeDriver(id)`, `state(id)`, `driveTo`, `followRoute`, `follow`,
`chase`, `joinTraffic`, `stop`, `setSpeed`, `setBehavior`, and `on(event, handler)` for the
`open77:vehicles:ai:*` events. Every one of them is one `VehicleDrivingCommand` call underneath —
that global is the low-level alias for the whole table. See [vehicle AI](vehicle-ai.md) for the
options, the behaviour vocabulary and the events.

Low-level aliases are `CreateVehicle`, `UpdateVehicleState`, `SetVehiclePaint`,
`ResetVehiclePaint`, `SetVehicleLocked`, `TriggerVehicleHorn`, `SetVehicleTransform`, `RemoveVehicle`, `GetVehicle`, `GetVehicles`,
`SetPlayerIntoVehicle`, `ForcePlayerOutOfVehicle`,
`SetPlayerVehicleExitLocked`, and `GetPlayerVehicleSeat`. The namespaced API supplies validation,
options, aliases, and damage helpers and is the recommended surface. See [vehicles](vehicles.md) for
snapshots, streaming, authority and seats.

## NPCs and tasks

All methods require `world.npcs`.

### NPC lifecycle and state

| Function | Signature | Purpose |
|---|---|---|
| `Open77.npcs.create` | `(definition)` | Create an authoritative NPC from `record = "Character.*"` (no catalogue required), or a legacy `template` alias. Returns ID or `nil, reason`; engine readiness is asynchronous. See [NPCs](npcs.md). |
| `Open77.npcs.update` | `(id, patch)` | Patch appearance, loadout, behavior, AI mode, damage policy, health, or ragdoll. |
| `Open77.npcs.setTransform` | `(id, transform)` | Set canonical position and yaw. |
| `Open77.npcs.setBucket` | `(id, bucket)` | Move NPC visibility scope. |
| `Open77.npcs.setAppearance` | `(id, appearance)` | Appearance convenience patch. |
| `Open77.npcs.setLoadout` | `(id, loadout)` | Loadout convenience patch. |
| `Open77.npcs.setHealth` | `(id, health, maxHealth?)` | Health convenience patch. |
| `Open77.npcs.setDamagePolicy` | `(id, policy)` | Set mortal/immortal/invulnerable policy. |
| `Open77.npcs.setAiMode` | `(id, mode)` | Set tasks/frozen/native mode. |
| `Open77.npcs.setBehavior` / `getBehavior` | `(id, partialOptions)` / `(id)` | Update/read native AI, combat, perception and voice policy. See [NPC behavior](npc-behavior.md). |
| `Open77.npcs.setAIEnabled` | `(id, enabled)` | Pause/resume the native AI agent and Open77 scheduler without changing `aiMode`. |
| `Open77.npcs.setCombatEnabled` | `(id, enabled)` | Suppress/allow combat and hostile acquisition. |
| `Open77.npcs.setPerceptionEnabled` | `(id, enabled)` | Suppress/allow autonomous sensory acquisition. |
| `Open77.npcs.setVoiceEnabled` | `(id, enabled)` | Suppress/allow per-NPC voice lines and barks. |
| `Open77.npcs.setRagdoll` | `(id, enabled)` | Set canonical ragdoll state. |
| `Open77.npcs.setAttitude` / `getAttitude` | `(id, attitude, options?)` / `(id)` | Make an NPC hostile, neutral or friendly toward one player, one owned NPC, one group, or everyone. Per NPC and per target. See [NPCs](npcs.md#attitude-and-relationship-groups). |
| `Open77.npcs.setGroup` / `getGroup` | `(id, group)` / `(id)` | Put an NPC in a relationship group (the pre-existing `combat.group` field). |
| `Open77.npcs.setRelationship` / `getRelationship` | `(groupA, groupB, attitude)` / `(groupA, groupB)` | Declare how two of this resource's groups regard each other. Per resource, symmetric, dies with the resource. |
| `Open77.npcs.target` | `(id)` | Who the NPC is currently fighting, as its lease holder's engine reports it. |
| `Open77.npcs.kill` / `revive` / `applyDamage` | `(id, ...)` | Authoritative life mutations. |
| `Open77.npcs.remove` | `(id)` | Remove the NPC. |
| `Open77.npcs.get` / `all` | `(id)` / `(bucket?)` | One snapshot or an array. |
| `Open77.npcs.templates` | `()` | Legacy alias catalogue, not a limit on direct Character records. |

Definition fields include `record`, `template`, `position`, `yaw`, `bucket`, `appearance`, `loadout`, `behavior`,
`aiMode`, `damagePolicy`, `health`, `maxHealth`, `streamingRadius`, `streamingHysteresis`,
`despawnWhenUnobserved`, and `persistent`.

Constants are `Open77.npcs.flags`, `.ai`, `.damage`, and `.channels`.

### Task queue

| Function | Signature | Purpose |
|---|---|---|
| `Open77.npcs.tasks.enqueue` | `(id, type, parameters?, options?)` | Enqueue any supported task. |
| `cancel` | `(id, taskId)` | Cancel one task. |
| `clear` | `(id, channel?)` | Clear queued/current tasks. |
| `get` | `(id, taskId)` | Read one task. |
| `all` | `(id)` | List tasks for an NPC. |
| `moveTo` | `(id, position, options?)` | Move with speed, acceptance radius, priority, and timeout. |
| `follow` | `(id, target, options?)` | Follow a player, NPC, or position. |
| `patrol` | `(id, points, options?)` | Patrol with loop/back-and-forth options. |
| `wander` | `(id, options?)` | Wander using the supplied movement parameters. |
| `face` | `(id, position, options?)` | Rotate toward a world point. |
| `lookAt` | `(id, target, options?)` | Drive the look channel toward player/NPC/position. |
| `wait` | `(id, durationMs, options?)` | Timed action-channel wait. |
| `hold` | `(id, options?)` | Hold movement indefinitely or until timeout/cancel. |
| `playAnimation` | `(id, animation, options?)` | Run a full-body animation task. |
| `attack` | `(id, target, options?)` | Engage a player or an owned NPC. Action channel, so it composes with a standing movement task. |
| `guard` | `(id, position, radius?, options?)` | Hold an area, returning to the anchor only when not already in a fight. |
| `flee` | `(id, from, options?)` | Break contact with a player, NPC or fixed point. |
| `workspot` | `(id, reference, options?)` | Play an authored scenario: a catalogue profile id or a raw clip, with `durationMs` or `loop`. |
| `workspots` | `(query?)` | The twelve shipped scenario profiles -- the same catalogue `Open77.animations.list()` serves. |
| `enterVehicle` | `(id, vehicleId, seat?, options?)` | Walk to a vehicle and take a seat; `warp` skips the walk. |
| `exitVehicle` | `(id, options?)` | Leave the seat. Idempotent; `vehicleId` narrows it to one car. |

Five further verbs address **driving** by ped id. They resolve the vehicle the NPC is the attached
driver of and forward to `Open77.vehicles.ai`, which owns the vanilla driving pipeline -- there is no
second driving stack. All of them require both `world.npcs` and `world.vehicles`, and all of them
answer `nil, "npc_not_driving"` until `Open77.vehicles.ai.attachDriver(vehicleId, { npcId = id })`
has run.

| Function | Signature | Purpose |
|---|---|---|
| `Open77.npcs.tasks.driving` | `(id)` | The driving job this NPC drives, or `nil, reason`. |
| `driveTo` | `(id, position, options?)` | Drive to a point with `speed` and `style`. |
| `driveWander` | `(id, options?)` | Join traffic and follow the road network indefinitely. Not a free-roam wander: Cyberpunk AI drives authored lanes. |
| `chase` | `(id, target, options?)` | Pursue a player, vehicle or NPC. |
| `stopDriving` | `(id)` | Stop the current driving job. |
| `setDriverAbility` | `(id, ability)` | Map a 0..1 ability onto behaviour and speed cap. 2.31 has no skill parameter; the mapping is documented in [NPCs](npcs.md). |

Low-level aliases are `CreateNpc`, `UpdateNpc`, `SetNpcTransform`, `SetNpcBucket`, `RemoveNpc`,
`GetNpc`, `GetNpcs`, `EnqueueNpcTask`, `CancelNpcTask`, `ClearNpcTasks`, `GetNpcTask`, `GetNpcTasks`,
`KillNpc`, `ReviveNpc`, `DamageNpc`, `GetNpcTemplates`, `SetNpcAttitude`, `GetNpcAttitude`,
`SetNpcGroup`, `SetNpcRelationship`, `GetNpcRelationship`, and `GetNpcTarget`. See
[NPCs](npcs.md) for the task state machine, ownership, streaming, templates, and events.

`onNpcTargetChanged(npcId, kind, targetId, previousKind, previousTargetId)` fires when an NPC
acquires or loses a target, and is delivered only to the resource that owns it.

## Elevators

All methods require `world.elevators`.

| Function | Signature | Purpose |
|---|---|---|
| `Open77.elevators.adopt` | `(definition)` | Adopt a native lift and return an Open77 elevator ID. |
| `goTo` / `call` | `(id, floor, options?)` | Start authoritative travel; options include `travelMs` and `force`. |
| `teleport` | `(id, floor)` | Administrative recovery without travel. |
| `pause` / `resume` | `(id)` | Pause or continue authoritative movement. |
| `setFlags` | `(id, flags)` | Update power, lock, interaction, and door policy. |
| `remove` | `(id)` | Release the managed elevator. |
| `get` / `all` | `(id)` / `(bucket?)` | Read canonical snapshots. |

`adopt` accepts `engineEntity`, `position`, `bucket`, `initialFloor`, `flags`, and required
`floorCount`. Constants are in `Open77.elevators.flags`. Low-level aliases are `AdoptElevator`,
`GoToElevator`, `TeleportElevator`, `PauseElevator`, `ResumeElevator`, `SetElevatorFlags`,
`RemoveElevator`, `GetElevator`, and `GetElevators`. See [elevators](elevators.md).

## Voice topology and policy

All methods require `voice.manage`. The dedicated server owns reachability: a client's requested
scope never bypasses routing buckets, proximity, membership, mute/deaf, rate, or quality checks.

| Method | Purpose |
|---|---|
| `Open77.voice.status` | Global quality/profile, default proximity, and relay/rejection counters. |
| `channels` / `getChannel` | List/read canonical radio, phone, party, admin, and spatial channels. |
| `participants` / `getParticipant` | Read proximity, server mute/deaf, and channel memberships. |
| `createChannel` / `updateChannel` / `removeChannel` | Resource-owned topology and effect control. |
| `addPlayer` / `removePlayer` | Change channel membership. |
| `setChannelPlayerMuted` | Mute one player in one channel. |
| `setChannelPlayerPermissions` | Set independent speak/listen permission. |
| `setPlayerMuted` / `setPlayerDeaf` | Server-wide send/receive policy. |
| `setProximity` | Enable/disable and tune one player's server-side reach. |
| `setDefaultProximityDistance` | Change the default, optionally for existing participants. |
| `setQuality` / `setEnabled` | Set global codec policy or disable voice. |

Channel effects include `gain`, `lowPassHz`, `highPassHz`, `distortion`, `radioNoise`,
`spatialBlend`, and the reverb controls `reverbWet`, `reverbRoomSize`, `reverbDecay`,
`reverbDamping`, and `reverbPreDelayMs`. Non-persistent channels are released automatically with
their owning resource.
See [Integrated voice chat](voice.md) for complete signatures, examples, client APIs, settings, and
the security/bandwidth model.

## Ambient population

`Open77.world.setPopulation` requires `world.population`; `getPopulation` is ungated.

**A bucket nobody has configured is empty** -- no crowd, no traffic, no police -- which is what
every client applies at world entry on its own. Vanilla streets are an explicit choice: set the
densities, or `bucket.population <bucket> on` from the console. (Until 2026-09-15 the server's
unconfigured default read as vanilla; replicated, it made clients spawn traffic that the vanilla
vehicle sanitizer despawned a second later -- cars popping in, hitting players, vanishing.)

| Function | Signature | Purpose |
|---|---|---|
| `Open77.world.setPopulation` | `(bucket, { crowd?, traffic?, police? })` | Ambient density for one routing bucket, replicated to every client in it. |
| `getPopulation` | `(bucket)` | Read it back, including what the engine can actually apply. |

```lua
-- An empty staging instance, with no cops to wander into it.
Open77.world.setPopulation(4, { crowd = 0, traffic = 0, police = false })

-- Half the usual pedestrians, vanilla traffic.
Open77.world.setPopulation(0, { crowd = 0.5, traffic = 1, police = true })
```

### What is a fraction and what is a switch

`crowd` is a genuine multiplier on the vanilla pedestrian density and is applied as one, through the
engine's community density modifier. `traffic` is accepted as `0..1` so the API does not have to
change if a vehicle equivalent is ever found, but on 2.31 **there is none**: any value above zero
means vanilla traffic. `getPopulation` states this rather than leaving a caller to discover it --
`crowdGranularity` is `continuous`, `trafficGranularity` is `binary`.

`police` allows or forbids vanilla prevention spawns outright.

`enabled` is **derived** (`crowd > 0 or traffic > 0 or police`), so it can never claim the
population is on while every density is zero -- and an unconfigured bucket reads `0 / 0 / false`,
as the section opens with.

### What the client does with it

Two client mechanisms remove vanilla bodies while a session is active, and both follow the policy:
the vehicle spawn policy (which vanilla spawns are allowed to complete) and the identity sanitizer
(which unowned runtime NPCs and vehicles are swept, so that a body nothing owns is never mistaken
for a replicated one). A kind the policy allows -- pedestrians when `crowd > 0`, vehicles when
`traffic > 0` -- is scenery, replicates to nobody, and is left alone by both. Until client 67 the
sanitizer ignored the policy, which is why a bucket with `traffic = 1` on release 65 showed cars
that vanished half a second after they spawned; from client 68 on, `pop` in the developer console
reports the bodies it kept for the policy as `sanitizerAllowedByPolicy`.
`Open77.routingBuckets.setPopulationEnabled` is the same state expressed as a switch: off sets all
three off, on restores the vanilla figures.

### The client half is read-only

Clients receive the policy for their own bucket and read it with `Open77.world.population()`. There
is no client setter, because density is a server-load decision that has to be the same for everyone
in a bucket.

That one-way shape is also why this needs no intent window, unlike the vehicle electrical flags: the
sirens problem was a server write landing in a field the owning client republishes twice a second.
No client message carries ambient density at all, so there is nothing to overwrite it. What does
need ordering is a **replay** -- a bucket change re-sends the policy, and that replay can be older
than a write that already landed -- so every message carries a revision monotonic across all
buckets and the client drops anything older than what it holds.

### Refusals

| Reason | Meaning |
|---|---|
| `permission_denied:world.population` | the resource does not hold the permission |
| `invalid_bucket` | not a non-negative integer |
| `invalid_crowd` / `invalid_traffic` | outside `0..1`, or not a number |
| `invalid_options` | the second argument was not a table, or `police` was not a boolean |

## Clearing an area

`Open77.world.clearArea(position, radius, options?)` removes the server-owned entities inside a
sphere and can suppress vanilla population there. It is the server half of `Open77.world`, and the
only function in it: the client's `world` table (`raycast`, `groundZ`, `nearby`, `nearest`,
`district`) needs a physics world and a streamed player, and a dedicated server has neither.

| Function | Signature | Result |
|---|---|---|
| `Open77.world.clearArea` | `(position, radius, options?)` | `{ npcs, vehicles, props, refused, foreignVehicles, population }`, or `nil, reason`. |

Options are `npcs`, `vehicles`, `props` (booleans, all default `true`), `population` (default
`false`), `bucket`, `foreign` (default `false`) and `grace`, metres of outward slack. A `nil`
`bucket` means every bucket — the same reading `Open77.zones.playersIn` takes, since a place is not
a player and has no bucket of its own to borrow. The containment test is `Open77.zones.contains`
from the shared zone module, so the radius cap (2,000 m) and the geometry rules are the ones every
other Open77 zone obeys.

Failures are `permission_denied:world.clearArea.foreign`, `invalid_radius`, `invalid_position`,
`invalid_options`, `invalid_bucket`, `bucket_required_for_population`, and the shared zone-module
tokens such as `invalid_grace`.

### It removes what you own, and counts the rest

This is the one world call that destroys state another resource created and still holds ids for. A
gamemode resetting a street would otherwise delete the parked cars a roleplay resource spawned, and
that resource would find out only when its own ids began answering `not_found`, with nothing in any
log tying the two together.

So `clearArea` removes only entities whose owner is the calling resource. Anything else inside the
radius is counted in `refused` and left standing.

```lua
-- Event setup: take down my own props and cars, leave everyone else's alone.
local swept = Open77.world.clearArea({ x = -1540, y = -2020, z = 24 }, 40, { bucket = 7 })
print(("cleared %d npcs, %d vehicles, %d props; left %d belonging to other resources")
    :format(swept.npcs, swept.vehicles, swept.props, swept.refused))
```

`foreign = true` lifts that rule, and it asks twice: the flag at the call site **and**
`world.clearArea.foreign` in the manifest, which a server operator has to have read and granted.
Without the permission the **whole call** is refused rather than quietly downgraded to an own-only
sweep — a silent downgrade would report success on a street that still has somebody else's cars in
it.

The permission reaches **vehicles and only vehicles**, and that is structural rather than a policy
choice worth arguing with:

| Kind | Foreign entity, with the permission |
|---|---|
| Vehicles | Removed, and counted in `foreignVehicles`. |
| Props | Refused. `PropAuthorityService` own-checks its own removals. |
| NPCs | Never even a candidate: the server's NPC read is owner-scoped, so a foreign NPC is invisible to the sweep and is not counted in `refused` either. |

A missing `world.npcs`, `world.vehicles` or `world.props` skips that kind and the call still
succeeds. A teardown that failed outright because one of three permissions was absent would leave
the other two kinds behind, which is the opposite of what a teardown is for.

### Population suppression is per bucket, not per radius

`population = true` requires a `bucket` and drives `Open77.routingBuckets.setPopulationEnabled`,
the same switch the shipped gamemodes use. **The suppression that follows is bucket-wide and is not
confined to the radius.** There is no radius-scoped vanilla-population control on 2.31; saying so
is better than implying a precision that does not exist, and a bucket-less call is refused with
`bucket_required_for_population` rather than guessing which of "suppress everywhere" or "do
nothing" was meant.

## World props

Every method requires `world.props`. Props are authoritative, owned by their creating resource,
and streamed per player rather than broadcast to a bucket. IDs are decimal strings; do not pass
them through `tonumber`.

| Function | Signature | Result |
|---|---|---|
| `Open77.props.create` | `(definition)` | Open77 prop ID, or `nil, reason`. |
| `Open77.props.update` | `(id, patch)` | `boolean, reason?` |
| `Open77.props.setTransform` | `(id, { position?, yaw?, scale? })` | `boolean, reason?` |
| `Open77.props.setBucket` | `(id, bucket)` | `boolean, reason?` |
| `Open77.props.attach` | `(id, { kind, id }, { offset?, yaw?, trackYaw?, detachOnDeath?, followBucket? })` | `boolean, reason?` |
| `Open77.props.detach` | `(id)` | `boolean, reason?` |
| `Open77.props.remove` | `(id)` | `boolean, reason?` |
| `Open77.props.get` | `(id)` | Prop snapshot, or `nil`. |
| `Open77.props.all` | `(bucket?)` | Array of prop snapshots, optionally filtered to one bucket. |
| `Open77.props.catalog` | `()` | Curated model aliases and the models they resolve to. |
| `Open77.props.clear` | `()` | Remove every prop this resource owns; returns how many. |

Definitions accept `model`, `position`, `yaw`, `scale`, `appearance`, `bucket`, `physics`
(`static`, `kinematic`, `dynamic`, `none`), `collision`, `visible`, `kind` (`prop`, `light`,
`effect`), `light`, `streamingRadius` (10–2000), `streamingHysteresis` (0 to the radius), and
`ttlMs` (0 for no expiry, seven days maximum). `update` is sparse and does not accept `model` or
`kind`; changing either is a remove and a create. The registry holds 8,192 props, of which one
resource may own 2,048. A resource may read every prop but may only mutate or remove its own.

Failures are `permission_denied:world.props`, `quota_exceeded`, `not_found`,
`owned_by_another_resource`, `invalid_position`, `invalid_model`, `unknown_alias`,
`record_provisioning_failed`, `entity_spawn_failed`, and `world_unavailable`.

`attach` makes a prop **follow** a player, an NPC or a vehicle: the server recomputes its
transform from the target's ten times a second and replicates it as an ordinary prop upsert.
It does not sit in the hand, and `setTransform` on an attached prop is refused with
`prop_attached`. A target that disconnects, dies or leaves ends the follow and leaves the
prop where it stood; a routing-bucket change is followed. For something that must be held,
use `Open77.heldItems.hold` instead -- see [props](props.md#attachment) for the difference.

Low-level aliases are `CreateProp`, `UpdateProp`, `SetPropTransform`, `SetPropBucket`,
`AttachProp`, `DetachProp`, `RemoveProp`, `GetProp`, `GetProps`, and `ClearProps`. The namespaced API supplies validation and structured
option tables and is the recommended surface. See [props](props.md) for the model catalogue,
streaming rules, lights, the client projection API, and the current limitations.

## World effects

Every method requires `world.effects`. A one-shot is broadcast to the players in range and never
stored; a looping effect is a registry entry with the same identity, ownership, revisioning and
streaming semantics as a prop, in a registry of its own.

| Function | Signature | Result |
|---|---|---|
| `Open77.effects.play` | `(name, opts)` | `boolean, reason?` — one-shot, no handle. |
| `Open77.effects.create` | `(definition)` | Open77 effect ID, or `nil, reason`. |
| `Open77.effects.update` | `(id, patch)` | `boolean, reason?` |
| `Open77.effects.remove` | `(id)` | `boolean, reason?` |
| `Open77.effects.all` | `(bucket?)` | Array of looping-effect snapshots, optionally filtered to one bucket. |
| `Open77.effects.catalog` | `()` | Curated effect aliases. |
| `Open77.effects.get` | `(id)` | Looping-effect snapshot, or `nil`. |
| `Open77.effects.playOn` | `(entityOrPlayerId, name, opts)` | `boolean, reason?` — entity-authored VFX. |
| `Open77.effects.sound` | `(entityOrPlayerId, event, opts)` | `boolean, reason?` — entity-bound Wwise event. |
| `Open77.effects.attach` | `(target, effect, opts)` | Open77 effect ID, or `nil, reason` — a looping effect bound to an entity slot. |
| `Open77.effects.screen` / `PlayerScreenEffect` | `(playerId, name, opts?)` | `boolean, reason?` — a full-screen post-process on ONE player. Not replicated; permission `players.screenfx`. `name` false clears. See [Screen effects](effects.md#screen-effects). |
| `Open77.effects.clearScreen` | `(playerId)` | `boolean, reason?` — clears every server-driven screen effect on that client. |
| `Open77.effects.screenCatalog` / `GetScreenEffectCatalog` | `()` | The screen-effect aliases this server accepts, ascending. |

`attach` is the difference between an effect that *plays on* something and one that *belongs to* it.
`playOn` is fire-and-forget: nothing is stored, and a player who streams in a second later sees
nothing. `attach` creates a registry entry with an id, an owning resource and per-player streaming,
so it follows the entity and a late joiner sees it too. `target` is
`{ kind = "player"|"npc"|"vehicle"|"prop", id = ... }` and `opts.slot` is required; `localAnchor`
(default `body`), `localSlot` (defaults to `slot`), `ttlMs`, `streamingRadius` (default 90),
`streamingHysteresis` (default 20), `localEvent`, `soundEvent` and `soundOnOwner` are optional. The
low-level alias is `AttachEffect`.

`play` options are `position`, `orientation`, `bucket`, `range` (1–500, default 150), and
`sound`. `create` definitions accept `effect`, `position`, `orientation`, `bucket`, `visible`,
`streamingRadius` (10–2000, default 90), `streamingHysteresis` (default 20), and `ttlMs`. The
effect name is not patchable. The registry holds 2,048 looping effects, of which one resource may
own 512.

Low-level aliases are `PlayEffect`, `CreateEffect`, `UpdateEffect`, `RemoveEffect`,
`GetEffect`, `GetEffects`, `PlayEntityEffect`, and `PlayEntitySound`. The namespaced API
supplies validation and structured option tables and is the recommended surface.

Failures use the same vocabulary as props with `permission_denied:world.effects` in place of the
props permission.

There are no low-level aliases for `Open77.effects`; the namespaced table is the whole surface.
The client-local `Open77.vfx` and `Open77.sfx` tables are a **different API in a different
runtime** and are not replicated — see [effects](effects.md) for the distinction, which is the
easiest thing to get wrong here.

## Database

Database access requires `database.access`. `Open77.database` and `MySQL` refer to the same
oxmysql-compatible table.

| Method | Callback form | Await form |
|---|---|---|
| `query` / `prepare` | `(sql, params?, callback?)` | `.await(sql, params?)` returns rows. |
| `single` | `(sql, params?, callback?)` | `.await` returns one row or `nil`. |
| `scalar` | `(sql, params?, callback?)` | `.await` returns one scalar. |
| `insert` | `(sql, params?, callback?)` | `.await` returns inserted ID/result. |
| `update` / `rawExecute` | `(sql, params?, callback?)` | `.await` returns affected-row result. |
| `transaction` | `(statements, callback?)` | `.await(statements)` returns `true` or `false, reason`. |

Callbacks and `.await` continuations resume on the owning resource's scheduler, never on the
database worker. See the database guide in `docs/database.md` for parameter forms, limits,
transactions, configuration, and migrations.

### Waiting for the database

| Method | Signature | Result |
|---|---|---|
| `ready` | `(handler)` | `true` once the handler is queued or run, or `false, reason`. |
| `isReady` | `()` | `true`, or `false, reason`. |

`MySQL.ready(fn)` is oxmysql's boot gate: put schema creation or a migration in it instead of
racing it against the first connection. The host opens one connection at startup and runs
`SELECT 1` on it; readiness is that answer, not a guess from the configuration file.

**Three states, not a boolean, and that is the whole of the design.** A server started with no
database bridge at all can never become ready, so `ready` refuses it with
`database_unavailable` and the handler *never runs* — running it would hand the resource a
bridge whose every query fails. A database still connecting, or configured but not answering,
**can** still become ready: the probe retries with a backoff up to 30 s, so the handler is
queued and a database that comes up ten minutes late still fires it. `isReady()` answers
`false, "database_connecting"` or `false, "database_unreachable"` for those two, and never
`true` for a database that is down.

**A handler registered after readiness runs anyway**, on the next tick. A resource never has to
ask whether it started before or after the database came up, and the late path is scheduled
rather than inline so it behaves exactly like the early one.

```lua
MySQL.ready(function()
    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS garage (plate VARCHAR(16) PRIMARY KEY, owner BIGINT NOT NULL)
    ]])
    print("garage schema ready")
end)
```

Readiness is **one-way**. A later outage is a failing request, and every request already
reports its own failure; flipping back would make `ready` fire twice for one boot, which no
oxmysql resource expects.

Both need `database.access`, the same capability the queries need, and answer
`permission_denied:database.access` without it. Gating readiness separately and more cheaply
would let a resource that may not query the database still learn whether the operator runs one.
`ready` also answers `invalid_argument` for anything that is not a function.

## Admin events

Warden used to act in silence: a resource learned a player had been banned only by watching
them disconnect, and learned a restart was coming not at all. Eight events now describe the
operator's own acts, emitted by the host and by Warden into every running resource.

| Event | Signature | Raised when |
|---|---|---|
| `open77:admin:scheduledRestart` | `(secondsRemaining, reason)` | A restart is armed, and again on each rung of the warning ladder (30m, 15m, 10m, 5m, 2m, 60s, 30s, 10s). |
| `open77:admin:restartCancelled` | `()` | A pending restart is disarmed. Not raised when nothing was armed. |
| `open77:admin:serverShuttingDown` | `(reason)` | The loop is stopping. `reason` is `restart`, `reset` or `shutdown`. |
| `open77:admin:announcement` | `(text)` | An operator announcement went out. |
| `open77:admin:playerWarned` | `(playerId, author)` | A warning was delivered to that player. |
| `open77:admin:playerKicked` | `(playerId, author)` | A player was removed, other than as part of a ban. |
| `open77:admin:playerBanned` | `(playerId, author, durationSeconds)` | A player was banned. `durationSeconds` is empty for a permanent ban. |
| `open77:admin:playerHealed` | `(playerId, author)` | An operator healed a player from Warden's Players tab. Not raised by a resource's own `Open77.players.heal`. |

```lua
AddEventHandler("open77:admin:scheduledRestart", function(secondsRemaining, reason)
    if tonumber(secondsRemaining) <= 60 then FlushEverythingNow() end
end)

AddEventHandler("open77:admin:serverShuttingDown", function(reason)
    print(("server going down (%s)"):format(reason))
end)
```

### What they carry, and what they deliberately do not

These events are **host-wide**: every running resource receives one, whatever it is about. So
the payload is the minimum that lets a resource react, and no more.

**The moderation reason never travels.** A warning's text and a kick's or ban's reason are
addressed to one player; a host-wide event naming them would hand every resource on the server
a running moderation log. This is the same rule `onAclChanged` follows when it carries a
revision and an operation but never the subject or the permission.

**The operator is never named.** `author` is *provenance*, not identity — which channel acted,
not which member of staff. It has two values:

| `author` | Meaning |
|---|---|
| `warden` | The operator panel or the server console. |
| `resource` | A running resource, through `Open77.players.kick` or `Open77.players.ban`. |

That answers the question a resource actually has — "did staff remove this player, or did a
script?" — without turning the bus into a staff activity feed.

**A ban is reported once.** Banning removes the player, but it is one moderation act:
`playerBanned` is raised and the removal underneath it is *not* also reported as
`playerKicked`. A resource counting removals would otherwise count every ban twice. The
duration does travel, because it is what decides whether a resource purges a player's saved
state or keeps it warm.

**The announcement text and the restart reason do travel.** Both are already broadcast to every
player's chat, so withholding them would protect nothing and would cost a resource the ability
to mirror an announcement to Discord.

### None of them is cancellable

They are plain notifications, raised with the ordinary host emitter and never with the bus's
cancellable path, so `CancelEvent()` inside one of these handlers does nothing. They are named
as notifications for that reason — `scheduledRestart`, not `restartRequested` — so that no
handler is invited to try.

A resource that must **stop** a restart calls `Open77.runtime.cancelRestart()`, which costs
`runtime.restart`. Cancelling a shutdown is an authority, not a veto every listener gets for
free.

### Driving the restart from a resource

| Function | Permission | Result |
|---|---|---|
| `Open77.runtime.scheduleRestart(seconds, reason?)` | `runtime.restart` | `{ scheduled, secondsRemaining, reason? }`, or `nil, reason`. |
| `Open77.runtime.cancelRestart()` | `runtime.restart` | `{ scheduled = false, secondsRemaining = 0 }`, or `nil, reason`. |
| `Open77.runtime.restartStatus()` | `runtime.restart` | `{ scheduled, secondsRemaining, reason? }`, or `nil, reason`. |

`runtime.restart` is its own capability, not `resources.control`: stopping one resource and
stopping the whole server are different powers, and an operator who granted the first did not
thereby grant the second.

A resource-scheduled restart takes exactly the path a Warden-scheduled one takes — the same
broadcast now, the same warning ladder, the same events — because a restart players were not
warned about is the failure this surface exists to prevent. Calling it again re-arms the
schedule rather than adding a second one.

**`restartStatus()` is the read the event cannot replace.** An event announces a *change*, and
a resource that started after the restart was scheduled never saw one. Ask once at start, then
subscribe:

```lua
AddEventHandler("onResourceStart", function(name)
    if name ~= GetCurrentResourceName() then return end
    local status = Open77.runtime.restartStatus()
    if status and status.scheduled then ArmSaveTimer(status.secondsRemaining) end
end)
```

`seconds` must be a whole number in `[1, 604800]`; the scheduler clamps anything under five
seconds up to five. `reason` is broadcast to players, so it is capped at 200 bytes and must
carry no control characters. Refusals: `permission_denied:runtime.restart`, `invalid_delay`,
`invalid_reason`, `restart_control_unavailable`.

### What a shutdown notice can and cannot promise

`open77:admin:serverShuttingDown` is emitted after the loop stops, and the host then pumps a
small fixed number of resource ticks so the handlers actually run — an event queued into a VM
that is never ticked again would be no notice at all.

That budget is small and fixed on purpose: a shutdown that waits on resources is a shutdown one
broken resource can hold open, and a supervisor restarting the process does not wait politely.
**A handler that saves synchronously completes; a handler that yields for long is not
guaranteed to finish.** The reliable place to persist state is `onResourceStop`, which every
resource still receives from its own VM as the host tears it down.

### Reserved, as a whole namespace

No resource may publish anything under `open77:admin:`; `TriggerEvent` answers
`false, "reserved_event"`. The namespace means one thing — *the operator's own surface did
this* — and that is exactly the claim an attacker wants to make. A forged `playerBanned` would
tell an audit resource that staff removed a player nobody removed; a forged
`serverShuttingDown` would make every resource on the server flush and stop saving.

An admin **resource**'s own acts belong in its own namespace, because they are its acts and not
the platform's. That is the line `open77:admin:playerHealed` walks: it is raised when an operator
heals from Warden's own [Players tab](warden-players.md) — the operator's surface acting, which is
exactly what the namespace is for — and it is **not** raised when a resource calls
`Open77.players.heal`, because that is a gameplay native any resource may call, and announcing
every call of it as an administrative act would be both a firehose and a lie. A resource that
heals on its own admin command should publish its own event, under its own namespace, saying so.

## Outbound HTTP

`PerformHttpRequest` (alias `Open77.http.request`) requires the `http.request` permission **and**
a server that enabled the bridge with an allow-list. Same shape as the database bridge: the
request leaves the tick thread at once, the exchange runs on the thread pool, and the callback
runs on the owning resource's own tick.

```lua
PerformHttpRequest("https://discord.com/api/webhooks/…", function(status, body, headers, err)
    if status == 0 then print("webhook failed: " .. tostring(err)) return end
    print(("webhook answered %d"):format(status))
end, "POST", { content = "Race heat finished" }, { ["Content-Type"] = "application/json" })
```

| Argument | Meaning |
|---|---|
| `url` | Absolute `http://` or `https://` URL, no credentials, host on the server's allow-list. |
| `callback` | `(status, body, headers, err)`. `status` is the HTTP status code, or `0` when the exchange did not complete; `err` then names the reason. Optional. |
| `method` | `GET` (default), `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`. |
| `body` | A string, or a table that is JSON-encoded for you. At most 256 KiB. |
| `headers` | `{ name = value }`, at most 32; no CR/LF. |

Returns `true` when the request was accepted, else `false, reason`; a refused request still
invokes the callback with `status = 0` and the reason, so a script never waits on it.

Reasons: `permission_denied:http.request`, `http_unavailable` (bridge off on this server),
`invalid_url`, `host_not_allowed`, `invalid_method`, `body_too_large`, `too_many_headers`,
`invalid_header`, `too_many_requests` (16 in flight per resource); completion errors `timeout`,
`response_too_large`, `request_failed`.

Operator side (`server.jsonc`):

```jsonc
"http": {
  "enabled": true,
  "allowedHosts": ["discord.com", "*.example.com"],
  "timeoutSeconds": 10,
  "maxResponseBytes": 1048576
}
```

An exact entry matches that host only; `*.example.com` matches one level of subdomain and the
bare host. An empty list reaches nothing. Redirects are never followed, so the list is the whole
reachable surface.

## Serving HTTP

`Open77.http.listen(prefix, handler)` serves inbound HTTP under `/<resource>/<prefix>` on the
server's own listener. It requires `http.serve` -- a different power from `http.request`: the
network calling a resource rather than the resource calling out, and an operator reading a
manifest should see which of the two a resource wants. The listener is a server-wide opt-in, off
by default and loopback by default:

```jsonc
"httpHandlers": { "enabled": true, "listenUrl": "http://127.0.0.1:11781", "timeoutSeconds": 5 }
```

While it is off, every `listen` answers `http_handlers_unavailable`, the same honesty as
`http_unavailable` on the outbound side. Put a reverse proxy with TLS in front of it before
exposing a route to the internet; the listener itself speaks plain HTTP on the address you give it.

```lua
-- open77.lua: permissions { "http.serve" }
-- POST /my_resource/heal { "playerId": 3 }
local route = Open77.http.listen("/heal", function(req, res)
    if req.method ~= "POST" then return res.json(405, { error = "method_not_allowed" }) end
    local payload = json.decode(req.body or "") or {}
    local ok, reason = Open77.players.setHealth(payload.playerId, 100)
    if not ok then return res.json(404, { error = reason }) end
    res.json({ healed = payload.playerId })
end)
print("serving " .. tostring(route))   -- /my_resource/heal
```

| | |
|---|---|
| Routing | Routes are namespaced by resource (`/<resource>/…`); a resource can never claim another's segment. The longest registered prefix wins; `listen("/", …)` -- or FiveM's `SetHttpHandler(handler)` -- takes everything under the resource. `unlisten(prefix)` removes one route; stop and reload drop them all. `routes()` lists this resource's public routes. |
| The handler | Runs on the resource's own tick, one tick after the request landed -- never cross-thread, so it may call any other API. `req = { method, path, query, body, route, remoteAddress?, headers }`; header lookup is case-insensitive. |
| The answer | `res.send(status, body, headers?)` -- a table body is JSON-encoded with a JSON content type -- or the sugar `res.json(status?, value)` / `res.text(status?, text)`. Exactly once: a second call answers `false, already_sent`. A handler that throws answers `500 {"error":"handler_error"}`; one that never answers is timed out by the host after `timeoutSeconds`. |
| Bounds | Bodies over 16 KiB are refused with `body_too_large` before Lua sees them; 16 requests in flight per resource, the rest get 503; headers capped like the outbound side. |

Reasons: `permission_denied:http.serve`, `http_handlers_unavailable`, `invalid_prefix`,
`invalid_handler`, `route_not_found` (`unlisten` on a route this resource never registered).

## Logging

`Open77.log.debug`, `.info`, `.warn` and `.error` write to the resource-prefixed server logger at
their own level -- `DBG`, `INF`, `WRN`, `ERR` in the log line, the same four the client has -- so an
operator can filter a resource's warnings from its chatter. `print` stays `INF`, `Citizen.Trace` is
`debug`. Their common signature is `(...)`, values are joined with a tab like `print`, and no value
is returned. Control sequences (ANSI colour codes, cursor moves) are stripped from every resource
line before it reaches the log, so a ported script that colours its output cannot corrupt the
terminal or the log file. (Until wave 6, 2026-09-16, all four levels printed at `INF`.)

## Latent (chunked) client events

A net event carries at most 48 KiB of JSON. `TriggerLatentClientEvent(name, target,
bytesPerSecond, ...)` -- alias `Open77.net.emitLatent` -- is the same call as `TriggerClientEvent`
with FiveM's rate argument in third place, for a payload the envelope cannot carry: up to 4 MiB,
cut into 40 KiB frames on a reserved name, paced at the requested rate, reassembled by the client
host and delivered to `RegisterNetEvent` handlers under the **original** name. The receiving resource
cannot tell it was latent, so a ported inventory or catalogue push needs no client change. Requires
`network.events`.

```lua
-- Push the whole item catalogue to a joining player without stalling their session
local id, reason = TriggerLatentClientEvent("shop:catalogue", playerId, 256 * 1024, catalogue, revision)
if not id then return print("catalogue not sent: " .. tostring(reason)) end
CreateThread(function()
    while true do
        Wait(1000)
        local s = Open77.net.latentStatus(id)
        if not s or s.state ~= "sending" then print("catalogue " .. (s and s.state or "gone")); return end
    end
end)
```

| | |
|---|---|
| `target` | one player id, or `-1` for every connected player (one stream per recipient, one status). |
| Rate | clamped to 1 KiB/s .. 2.5 MiB/s; all of a resource's streams together never exceed 64 frames per second, inside the per-player event budget. |
| `Open77.net.latentStatus(id)` | `{ id, name, target, state, sentBytes, totalBytes, sentFrames, totalFrames, progress, bytesPerSecond, elapsedMs, reason? }`; `state` is `sending`, `done`, `failed` (`player_left`) or `cancelled`. A finished stream answers for a minute, then `nil, not_found`. |
| `Open77.net.cancelLatent(id)` | stops a stream still sending; `false, already_finished` otherwise. The client drops a partial copy on its own after a minute without a frame. |
| Bounds | 16 streams in flight per resource (`latent_stream_limit`); a payload over 4 MiB is refused before anything is sent (`latent_payload_too_large`); the argument rules of `TriggerClientEvent` apply (`latent_payload_not_serializable`). |

## Permission summary

| Capability | Server namespaces |
|---|---|
| `network.events` | `Open77.net`, `RegisterNetEvent`, `TriggerClientEvent` |
| `world.loot` | `Open77.loot` |
| `world.vehicles` | `Open77.vehicles` |
| `world.npcs` | `Open77.npcs` |
| `world.elevators` | `Open77.elevators` |
| `world.props` | `Open77.props` |
| `players.appearance.relay` | `Open77.appearance.capture` / `Open77.appearance.apply` — reads and writes the face and body a player wears. Separate from `player.appearance.edit` (client-side, local player) and from clothing: a snapshot is character-creator output, so a reader can fingerprint every player and a writer can put a face on somebody who did not choose it |
| `world.clearArea.foreign` | `Open77.world.clearArea` with `foreign = true` — lets a sweep remove **other resources'** vehicles. Grant it only to a resource that is trusted to own the whole world, such as an event-setup script; without it `clearArea` still works on everything the caller owns |
| `world.effects` | `Open77.effects`, including the visual half of `Open77.effects.explosion` |
| `world.explosions` | `Open77.effects.explosion` with a positive `damage` — area damage to **every** player in a radius, including players the resource never named. Deliberately not `players.stats.apply`, which only reaches a player already named one at a time |
| `world.environment` | `Open77.environment`: the session's clock and sky, and the per-bucket overrides — the same capability name the client side of this API uses |
| `players.life.read` | Player life reads |
| `players.life.kill` | `Open77.players.kill` |
| `players.life.revive` | `Open77.players.revive` |
| `players.life.respawn` | `Open77.players.respawn` |
| `players.teleport` | `Open77.players.teleport` / `setHeading` — deliberately **not** under `players.life.*`: a move is not a life event and has a different blast radius |
| `players.life.resync` | `Open77.players.requestLifeResync` |
| `players.life.freeze` | `Open77.players.setFrozen` |
| `players.damage.read` | `Open77.players.getHealth` |
| `players.damage.apply` | Player health/damage mutations |
| `players.stats.read` | Shared `Open77.stats` reads for health and stamina |
| `players.stats.apply` | Server-only health/stamina values, maximums and regeneration |
| `players.gate` | `onPlayerConnecting` handlers: hold, admit or refuse a connecting player |
| `players.access` | `Open77.access`: the server's built-in whitelist and ban list |
| `acl.read` | `Open77.acl.isAllowed` / `roles` / `grants`: read the compiled ACL for an admitted session |
| `acl.grant:<pattern>` | `Open77.acl.grant` / `revoke` / `addRole` / `removeRole`, bounded to permissions matching `<pattern>`. **There is no bare `acl.grant`**, and `acl.grant:*` is not a wildcard — it is dropped. The pattern is the delegation an operator sees before installing the resource. See [the ACL guide](server-acl.md#the-delegation-scope-is-the-security-model) |
| `acl.define:<pattern>` | `Open77.acl.definePermission`: define or retune a runtime role whose every permission matches `<pattern>`. Separate from `acl.grant` because retuning a role changes the rights of everyone holding it, at once and retroactively |
| `players.identity.sensitive` | `Open77.players.endpoint` / `GetPlayerEndpoint`, and the `endpoint` field of `Open77.players.identifiers`. **An endpoint is a player's IP address**: it identifies a person outside the game and in most of the world it is regulated personal data, so it gets its own capability rather than riding on the ungated `Open77.players.identity`. Ping is deliberately not behind it — latency is not identity |
| `runtime.commands` | `Open77.runtime.executeCommand` with a **plain resource's** authority: another resource's ordinary command, never a restricted one and never a lifecycle verb |
| `resources.control` | `Open77.resource.start` / `stop` / `restart`, and raising `executeCommand` to the authority the in-game operator escalation uses. The admin-panel capability |
| `runtime.restart` | `Open77.runtime.scheduleRestart` / `cancelRestart` / `restartStatus`. Its own string rather than a corner of `resources.control`: stopping one resource and stopping the whole server are different powers, and an operator who granted the first did not thereby grant the second |
| `players.disconnect` | `Open77.players.disconnect` / `kick` |
| `players.ban` | `Open77.players.ban` |
| `combat.config` | Global `Open77.combat` policy and damage arbiters |
| `combat.scope.control` | Resource-owned `Open77.combat.createScope` / `removeScope` |
| `players.animations.control` | Start, sequence and stop player RP animations owned by this VM |
| `players.animations.read` | Query a player's authoritative RP playback |
| `players.wanted` | `Open77.players.setWanted` / `setMaxWanted` - point the NCPD at one player |
| `players.wanted.read` | `Open77.players.getWanted` - read back what this server decided for a player |
| `world.prevention` | `Open77.world.setPreventionEnabled` - turn NCPD dispatch off for a whole bucket, which every player in it lives under. Separate from `players.wanted`: making somebody a fugitive and abolishing the police are not the same power |
| `voice.manage` | `Open77.voice` authoritative topology and policy |
| `filesystem.read` | `Open77.io.read`, `readJson`, `exists`, `list`, `stat`, and the source side of `copy` |
| `filesystem.write` | `Open77.io.write`, `writeJson`, `append`, `makeDirectory`, `remove`, `move`, and the destination side of `copy` |
| `database.access` | `Open77.database` / `MySQL`, readiness (`ready`, `isReady`) included |
| `http.request` | `PerformHttpRequest` / `Open77.http.request`, within the server's `http.allowedHosts` |
| `http.serve` | `Open77.http.listen` / `unlisten` / `SetHttpHandler`: inbound HTTP under `/<resource>/`, on the server's opt-in `httpHandlers` listener. Distinct from `http.request` on purpose: the network calling a resource is a different power from the resource calling out |
| `players.identity.history` | The history half of `Open77.players.sessionStats` (`firstSeenUtc`, `joinCount`, `totalPlaySeconds`) and all of `Open77.players.lastSeen`: what the server's identity directory remembers about a person across sessions. The live session is ungated |
| `world.entities.observe` | Receive the generic `onEntityCreated` / `onEntityRemoved` feed. An opt-in on top of the per-kind capability, never a substitute for it: the mirror still costs `world.props`, `world.effects` or `world.loot` for those kinds, so it can only ever show a resource what it could already see |

Request only the capabilities a resource actually uses. A manifest permission grants access to a
binding; it does not replace validation of player identity, distance, ownership, revision, bucket,
or gameplay state.

## Audit status

This page covers every public global installed by `LuaResourceRuntime`, all 118 low-level bindings,
and every namespaced helper and constant installed by the server bootstrap. `wiki/tools/audit-api.py`
compares the public globals with this page and fails when a new binding is undocumented. It reads
both spellings — `SetGlobal("name")` and the array the export bootstrap installs its nine globals
from — because until it read the second, nine public globals were invisible to it.

The generated API reference covers the same surface from the other direction. Since the extractor
learned to read the server Lua prelude, every `Open77.*` server function produces a card whose
**membership is read from `LuaResourceRuntime.cs`**, and a registered function with no written
description fails the build. This page is the narrative companion: permissions, worked examples, and
the contracts that span several functions live here, and the per-function cards live in the
reference.

The [World props](#world-props) and [World effects](#world-effects) sections once carried a caveat
saying their Lua bindings were specified but not yet installed. That is no longer true: both the
namespaced tables and the low-level aliases (`CreateProp`, `UpdateProp`, `SetPropTransform`,
`SetPropBucket`, `RemoveProp`, `GetProp`, `GetProps`, `ClearProps`, and the effect aliases) are
installed and audited. What remains true of the client side is the distinction the effects section
already makes: the client-local `Open77.vfx` and `Open77.sfx` tables are a different API in a
different runtime and are not replicated.
