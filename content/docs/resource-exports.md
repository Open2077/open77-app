# Official resource exports

Open77's native Lua API and resource exports are two separate surfaces. Native methods such as
`Open77.vehicles.get` are registered by the client or server runtime. The exports below are owned by
official Lua resources and add lifecycle isolation, WebUI ownership, or higher-level behavior.

The package catalogue on this page lists **client exports**. Server resources can
also publish and call their own exports using the same asynchronous surface; see
[Cross-resource server exports](server-exports.md). The two registries are separate.
Server-authoritative mutation remains in server
scripts through the [server Lua API](server-api.md), net events, or a package's documented server
interface.

## Calling an export

There are two forms, and the difference is not style: one waits, the other does not.

### Synchronous — `exports.<resource>:<name>(...)`

The FiveM spelling works, on the client and on the server, and it returns the
export's values directly:

```lua
local fuel = exports.open77_fuel:level(vehicleId)
local ok, reason = exports['open77-garage']:store(vehicleId)
```

A resource name containing a hyphen only works through the bracket form, exactly
as in FiveM. `exports.res.name(...)` (a dot instead of a colon) works too; the
proxy recognises the `self` the colon inserts and drops it.

The call runs **inline, on this thread**: every resource VM on the client runs on
the game thread and every server VM runs on the host scheduler thread, so the
callee's function body executes before the call expression returns. Nothing is
queued, nothing yields, no tick boundary passes. That is what makes it usable
from a getter — and what makes the following true:

- **The callee must not yield.** `Wait`, `promise:await()` and anything built on
  them fail the call with `export_yielded`. There is no scheduler underneath a
  synchronous callee to yield to. Use the asynchronous form for slow work.
- **Failure raises.** This is the one place Open77 does not return `nil, reason`.
  FiveM's exports raise, ported resources are written for that, and a raise is
  also the only way to keep "the export returned nil" distinguishable from "the
  call failed". Wrap it in `pcall` when you want to handle failure yourself.
- **Recursion is capped at 8 frames.** A → B → A is fine and works; the ninth
  nested frame fails with `export_recursion_limit`.
- **A resource may call its own export.** It is an ordinary nested call, with the
  same copy of arguments and results as any other, and it counts toward the cap.

`Open77.exports.callSync(resource, name, ...)` is the same path without the
sugar, including the raise, and is what you want when the export name is in a
variable.

### Asynchronous — `Open77.exports.call(...)`

Unchanged, and still the right tool whenever the callee may be slow, may wait on
the network or a database, or may not exist yet:

```lua
local promise, reason = Open77.exports.call("open77_notifications", "show", {
  type = "success",
  title = "Garage",
  message = "Vehicle stored."
})
if not promise then error(reason) end

local result = promise:await()
if not result.ok then print(result.error) end
```

It returns `nil, reason` instead of raising, it runs the callee on the callee's
own scheduler where it is free to `Wait`, and `:await()` needs a managed task
(`CreateThread`, a handler, a command). Every export in the catalogue below is
callable both ways.

### What crosses, and what does not

Both forms copy. Arguments and results are transferred by value through the same
serialiser: nil, booleans, finite numbers, 64-bit integers, binary strings and
nested plain tables with string or integer keys. A table you hand to another
resource is **not** the table it receives, so a callee mutating it cannot touch
yours, and metatables, functions, userdata and coroutines never travel. Nothing
about running inline weakens that: the callee gets a fresh coroutine in its own
Lua state, with its own globals, its own instruction budget and its own
permissions. Synchronous and asynchronous calls differ only in *when* the callee
runs, never in what it can reach.

`GetInvokingResource()` and `GetInvokingResourceGeneration()` name the immediate
caller for the duration of the call and are restored afterwards, including when
the callee raises.

### Refusal reasons

| Reason | Meaning |
| --- | --- |
| `export_resource_unavailable` | No resource of that name is running. |
| `export_target_stopped` | It exists but is stopping, preparing, or not running. |
| `export_not_found` | It is running but publishes no export of that name. |
| `export_recursion_limit` | The chain already has 8 synchronous frames. |
| `export_yielded` | The callee tried to `Wait` or `await`. |
| `export_budget_exhausted` | The callee burned its own instruction or time budget. |
| `export_raised` (server) / `... raised: <text>` (client) | The callee raised; the original message is appended. |
| `export_arguments_not_serializable`, `export_result_not_serializable` | A value could not be copied. |
| `resource_preparing` | Called at file scope while this VM was still loading. |

A callee that exhausts its budget fails **that call**, with its own counter reset
for the next one; the caller is not killed for it, and on the client the wall
time the callee spent is credited back to the caller's own deadline.

Handles returned by UI packages are resource-owned. Another resource cannot update or dismiss
them, and they are cleaned automatically when the owning generation stops or reloads.

## Export catalogue

### `open77_contextmenu`

Generic ALT/click framework, no built-in gameplay actions. Client-only exports:

| Exports | Purpose |
|---|---|
| `register`, `registerMany` | Register one definition or an atomic batch. |
| `registerPlayers`, `registerVehicles`, `registerNpcs`, `registerProps`, `registerDoors`, `registerWorld` | Typed registration helpers; one definition or a batch. |
| `registerSelf`, `registerSky` | Visible F7 self / explicit empty-space direction actions. |
| `registerModels`, `registerEntities` | Exact record or canonical/local ID filters plus definitions. |
| `update`, `get`, `setEnabled`, `list` | Update (new token), inspect, enable/disable or list owned actions. |
| `unregister`, `unregisterMany`, `clear` | Remove only caller-owned actions. |
| `isOpen`, `isReady`, `getVersion`, `getContext`, `getTarget` | Framework status and current selection snapshot. |
| `setTargetingEnabled`, `isTargetingEnabled`, `close` | Resource-scoped disable claims and input lifecycle. |

Actions belong to their invoking resource/generation; callbacks are provider
export names, not closures. Self/sky filters are opt-in, and sky coordinates are
a ray endpoint, not a physical impact. Provider stop cleans up actions/claims.
See [Context menu](context-menu.md) for contracts, installation and server security.

### `open77_animations`

| Export | Signature | Result |
|---|---|---|
| `list` | `list(query?)` | Matching profile definitions. |
| `get` | `get(profileId)` | Profile or nil. |
| `request` | `request(profileId, options?)` | Server-accepted local playback, or nil/error. |
| `sequence` | `sequence(steps, options?)` | Server-accepted local sequence, or nil/error. |
| `cancel` | `cancel(playbackId?)` | Queue self-cancellation; omitted ID also abandons pending requests. |
| `state` | `state(playerId?)` | Active canonical state; local player by default. |

The preferred client facade is `Open77.animations.<method>(...):await()` with the
same arguments/results. Preserve the initial `nil, error` dispatch check before
awaiting. See [RP animations](rp-animations.md) for examples, permissions, lifecycle
and the precise native playback validation limits.

### `open77_appearance`

| Export | Signature | Result |
|---|---|---|
| `open` | `open(mode?)` | Requests the server-authorized appearance workflow. |
| `capture` | `capture()` | Current native appearance snapshot. |
| `isOpen` | `isOpen()` | Whether the appearance UI is active. |
| `revision` | `revision()` | Last canonical appearance revision. |
| `characterKey` | `characterKey()` | Durable character key associated with the synchronized appearance. |

See the package README at `resources/system/open77_appearance/README.md` for the transaction lifecycle.

### `open77_equipment`

There is no `open77_clothing` package. Client-side clothing lives in `resources/open77_equipment`,
and the wardrobe it can hide lives in `resources/open77_wardrobe`; `Open77.clothing` is a
**server** namespace whose requests this package answers.

| Export | Signature | Result |
|---|---|---|
| `slots` | `slots()` | The nine canonical slots and their REDengine attachment slots. |
| `records` | `records(options?)` | Filtered, bounded catalogue query: `slot`, `family`, `restricted`, `limit`. |
| `info` | `info(record)` | Metadata for one exact catalogue record. |
| `registry` | `registry()` | What is currently in every slot. |
| `equip` | `equip(record, slot?, options?)` | Validates and equips one local record. |
| `unequip` | `unequip(slot)` | Empties one slot without deleting the inventory item. |
| `apply` | `apply(slots, options?)` | Applies a whole slot-to-record table in one transaction. |
| `beginPreview` | `beginPreview()` | Claims temporary native mutation for the fitting room. |
| `endPreview` | `endPreview()` | Releases the claim and re-applies the real state. |

The two preview exports are **not general-purpose**: they refuse any caller other than
`open77_wardrobe_ui`, checked with `GetInvokingResource()`. The fitting room owns temporary native
mutations; it never owns server intent.

The dedicated runtime separately exposes asynchronous server methods under `Open77.clothing`; they
are not client package exports. They target a player and complete through
`open77:clothing:completed`, which this package answers. See
[Complete server Lua API](server-api.md#player-clothing).

### `open77_wardrobe`

| Export | Signature | Result |
|---|---|---|
| `beginPreview` | `beginPreview()` | Claims the wardrobe preview for the fitting room. |
| `endPreview` | `endPreview()` | Releases the claim and restores the replicated wardrobe. |

Same ownership rule as `open77_equipment`: both exports refuse a caller other than
`open77_wardrobe_ui`. Everything else this package does — projecting other players' outfits onto
their puppets through `Open77.puppets.setWardrobe` — happens on events, not on exports.

### `open77_weapons`

| Export | Signature | Result |
|---|---|---|
| `slots` | `slots()` | `{ 1, 2, 3 }`. |
| `assign` | `assign(record, slot, options?)` | Native asynchronous request ID. |
| `setActive` / `activate` | `setActive(slot)` or `setActive(record, options?)` | Native asynchronous request ID. |
| `remove` / `unequip` | `remove(slot)` | Native asynchronous request ID. |
| `holster` | `holster()` | Native asynchronous request ID. |
| `setAmmo` | `setAmmo(slot, amounts)` | Sets bounded reserve/magazine amounts through the native asynchronous request path. |
| `snapshot` / `all` | `snapshot()` | Native asynchronous request ID. |

The package also owns the authenticated target-client relay used by server
`Open77.weapons.*` calls. Completion, slot-state fields, permissions, errors,
and authority rules are documented in [Weapon Lua API](weapons-api.md).

### `open77_perspective`

| Export | Signature | Result |
|---|---|---|
| `get` | `get()` | Current preferred perspective mode. |
| `set` | `set(mode)` | Requests `first` or `third` person through the ownership arbiter. |
| `toggle` | `toggle()` | Toggles the preferred mode. |
| `state` | `state()` | Current preference, effective mode, ownership and availability. |
| `key` | `key()` | Current local toggle key. |
| `setKey` | `setKey(key)` | Validates and persists the local toggle key. |

See [Perspective](perspective.md).

### `open77_vehiclepicker`

| Export | Signature | Result |
|---|---|---|
| `open` | `open(options?)` | Opens the picker for a declared roster/list. |
| `close` | `close()` | Closes it and releases UI focus. |
| `selection` | `selection(listId)` | Current persisted key for a known list. |
| `roster` | `roster(listId)` | Read-only roster data for a custom gamemode UI. |
| `isOpen` | `isOpen()` | Whether the picker currently owns its surface. |

### `open77_chat`

| Export | Signature | Result |
|---|---|---|
| `addMessage` | `addMessage(message)` | Adds one structured message to the local chat UI. |
| `clear` | `clear()` | Clears visible messages. |
| `addSuggestion` | `addSuggestion(command, help, parameters?)` | Adds or replaces slash-command completion metadata. |
| `removeSuggestion` | `removeSuggestion(command)` | Removes one completion entry. |
| `setEnabled` | `setEnabled(enabled)` | Enables/disables chat for the calling resource context. |
| `isEnabled` | `isEnabled()` | Returns the current enable state. |

Message and suggestion schemas are documented in [Chat](chat.md).

### `open77_death`

| Export | Signature | Result |
|---|---|---|
| `isDead` | `isDead(playerId?)` | Canonical death state for the local or selected player. |
| `getState` | `getState(playerId?)` | Canonical life-state snapshot. |
| `getLocalDeathContext` | `getLocalDeathContext()` | Local death context, with the last package snapshot as fallback. |
| `all` | `all()` | All currently known player life states. |

### `open77_effects`

| Export | Signature | Result |
|---|---|---|
| `playVfx` | `playVfx(effect, options?)` | Starts a world VFX owned by the caller. |
| `playEntityVfx` | `playEntityVfx(effect, options?)` | Starts an entity-attached VFX. |
| `playSfx` | `playSfx(event, options?)` | Starts an SFX event, optionally spatialized or attached. |
| `stop` | `stop(handle)` | Stops a caller-owned effect handle. |
| `catalog` | `catalog()` | Returns the runtime effect catalogue. |
| `looping` | `looping()` | Server-owned looping effects this client is currently projecting. |

See [Visual and audio effects](effects.md) and [Game data reference](data-reference.md).

### `open77_props`

| Export | Signature | Result |
|---|---|---|
| `get` | `get(id)` | One projected server prop record, by its server ID. |
| `all` | `all()` | Every server prop this client is currently projecting, ordered by ID. |

Read-only by design. Creating or mutating a replicated prop exists only on the dedicated-server
`Open77.props` API — a client cannot mint a prop anybody else can see. There is deliberately no
`handle` export: the projection layer is keyed by the server's own ID, so a second identity could
only ever get out of step with it.

See [Server-owned world props](props.md).

### `open77_devices`

**Server exports only.** The client half owns the device-interaction claim for the whole
server-declared policy and exposes nothing a caller would reach; the client API it uses is
`Open77.world.setDeviceInteractionEnabled`, documented in
[vanilla device prompts](device-interactions.md).

| Export | Signature | Result |
|---|---|---|
| `disable` | `disable(target, options?)` | Turns the vanilla prompt off for that engine entity id or device class on every client. `options.bucket` scopes it to one routing bucket. `true`, or `false, reason`. |
| `enable` | `enable(target, options?)` | Declares an explicit allow. Not the same as `clear`: this is still a policy this resource holds. |
| `clear` | `clear(target?)` | Withdraws one declaration, or all of them when `target` is omitted. |
| `list` | `list()` | What this resource currently has declared. |

Late joins and routing-bucket changes are answered; a declaring resource that stops takes its
policies with it. The package also re-publishes every vanilla device use host-wide as
`open77_devices:used(playerId, engineEntity, className, choice, allowed)` -- a rate-limited **claim**
by that client, never authority.

### `open77_elevators`

| Export | Signature | Result |
|---|---|---|
| `get` | `get(id)` | One streamed authoritative elevator snapshot. |
| `all` | `all()` | All streamed elevator snapshots. |
| `requestFloor` | `requestFloor(id, floor)` | Requests a `goto` action. |
| `requestCall` | `requestCall(id, floor)` | Requests a `call` action. |

See [Elevators](elevators.md). Elevator IDs are opaque even though this compatibility package
currently normalizes them before calling the native API.

### `open77_fuel`

The canonical [state-bag sample](state-bags.md#the-fuel-sample-open77_fuel): fuel is a
server-owned `fuel` key on every vehicle's bag, burned from the replicated speed and engine
state, with the engine cut at zero.

| Export | Signature | Result |
|---|---|---|
| `level` | `level(vehicleId)` | The replicated litres, read from the bag mirror; `nil, reason` for an unknown or unstreamed car. |
| `current` | `current()` | The litres of the car the local player is sitting in, or `nil, "not_in_vehicle"`. |

The client also re-emits every bag change as `open77:fuel:changed(vehicleId, litres, previous)`.
There is no client `set`: the client never writes a bag.

**Server exports**, on the same package, for scripts porting `GetVehicleFuelLevel` /
`SetVehicleFuelLevel`: `level(vehicleId)`, `set(vehicleId, litres)`, `refuel(vehicleId, litres?)`
(to the brim when the amount is omitted), `capacity()` and `configure({ capacity,
litresPerHundredKm, idleLitresPerMinute, multiplier })`. Every write is clamped into the tank and
answers `litres | nil, reason`; the host-wide `open77:fuel:empty(vehicleId)` fires once per empty.

### `open77_groundcircle`

| Export | Signature | Result |
|---|---|---|
| `create` | `create(definition)` | Creates a caller-owned HUD ground circle and returns its handle. |
| `remove` | `remove(handle)` | Removes one caller-owned circle. |
| `clear` | `clear()` | Removes every circle owned by the caller; answers with `removed`. |
| `list` | `list()` | Snapshots of every circle owned by the caller. |

A screen overlay rather than a world entity: the circle is sampled in world space, projected point by
point with `Open77.camera.project` and stroked as an SVG polyline on a transparent HUD surface, so it
depends on no depot asset and cannot report itself as rendered while drawing nothing. The trade-offs
are that it is not occluded by geometry, receives no light, exists only for the local player, and is
sampled on the Lua tick rather than per frame, so it trails a fast camera whip.

`create` deliberately reads the same field names [`open77_worldui`](worldui.md) reads --- `id`,
`position`, `radius`, `maxDistance`, `style`, `groundOffset`, `color` --- and *ignores* the prompt
half of that definition rather than rejecting it, so one definition table can be handed to either
resource. It also accepts `width` (0.5--8.0), `opacity` (0.05--1.0), `fill` (0.0--0.6) and `visible`.
`radius` is clamped to 0.1--50.0 and `maxDistance` to 1.0--500.0, matching `Open77.markers`. The limit
is 32 circles across every resource combined (`circle_limit`).

It is a diagnostic and a fallback for a native marker that is not producing pixels, not a replacement
for one. For a ground ring that must be frame-tight, use `Open77.anchors` with `render = "ring"`,
which is projected natively on the frame that draws it.

### `open77_interactions`

| Export | Signature | Result |
|---|---|---|
| `create` | `create(definition)` | Creates a caller-owned contextual interaction and returns its handle. |
| `update` | `update(handle, patch)` | Applies a partial update. |
| `remove` | `remove(handle)` | Removes one caller-owned interaction. |
| `setVisible` | `setVisible(handle, visible)` | Convenience visibility update. |
| `get` | `get(handle)` | Snapshot of one caller-owned interaction. |
| `all` | `all()` | Snapshots of every interaction owned by the caller. |
| `clear` | `clear()` | Removes all caller-owned interactions. |
| `setEnabled` | `setEnabled(enabled)` | Enables/disables rendering and input for the caller. |
| `isEnabled` | `isEnabled()` | Returns the caller enable state. |

Targeting — standing rules that materialise interactions on whatever the world currently holds,
rather than one prompt bolted to one place:

| Export | Signature | Result |
|---|---|---|
| `addTarget` | `addTarget(definition)` | Registers a caller-owned target rule and returns its handle. |
| `removeTarget` | `removeTarget(handle)` | Removes one caller-owned target and every prompt it materialised. |
| `clearTargets` | `clearTargets()` | Removes every client-declared target owned by the caller. |
| `getTarget` | `getTarget(handle)` | Snapshot of one caller-owned target, including its live match count. |
| `allTargets` | `allTargets()` | Snapshots of every target owned by the caller. |
| `addModel` | `addModel(models, options)` | `addTarget` with `kind = "model"`. |
| `addClass` | `addClass(classes, options)` | `addTarget` with `kind = "class"`. |
| `addGlobalVehicle` | `addGlobalVehicle(options)` | `addTarget` with `kind = "globalVehicle"`. |
| `addGlobalPlayer` | `addGlobalPlayer(options)` | `addTarget` with `kind = "globalPlayer"`. |
| `addGlobalPed` | `addGlobalPed(options)` | `addTarget` with `kind = "globalNpc"`. `addGlobalNpc` is the same export. |
| `addZone` | `addZone(options)` | `addTarget` with `kind = "zone"`. |
| `addBoxZone` | `addBoxZone(options)` | `addZone` with `position` + `size` (+ `heading`) folded into a box shape. |
| `addSphereZone` | `addSphereZone(options)` | `addZone` with `position` + `radius` folded into a sphere shape. |

**Server exports** (a declaration made once, applied by every client — see
[Cross-resource server exports](server-exports.md)):

| Export | Signature | Result |
|---|---|---|
| `define` | `define(target \| { target, ... })` | Publishes this resource's targets to every client. `true`, or `false, reason`. |
| `undefine` | `undefine(id?)` | Withdraws one target, or all of them when `id` is omitted. |
| `clear` | `clear()` | Withdraws every target this resource declared. |
| `list` | `list()` | The ids this resource currently has declared. |

Definitions, marker types, choices, distances, entity attachment, target kinds, `canInteract`,
group gates, and responses are documented in [Contextual interactions](interactions.md).

### `open77_loot`

| Export | Signature | Result |
|---|---|---|
| `get` | `get(id)` | One streamed canonical loot drop. |
| `all` | `all()` | Copy of all streamed drops. |
| `requestPickup` | `requestPickup(id)` | Submits a bounded pickup request to the server. |

See [Loot](loot.md). Clients cannot create or award authoritative loot.

### `open77_markers`

| Export | Signature | Result |
|---|---|---|
| `create` | `create(definition)` | Creates a native marker and returns its ID. |
| `update` | `update(id, patch)` | Updates mutable marker fields. |
| `remove` | `remove(id)` | Removes one marker. |
| `clear` | `clear()` | Removes resource-owned markers. |
| `list` | `list()` | Lists current resource-owned markers. |

The lower-level method schema is in the generated `Open77.markers.*` reference.

### `open77_nameplates`

| Export | Signature | Result |
|---|---|---|
| `setEnabled` | `setEnabled(enabled)` | Enables/disables caller-owned overrides. |
| `isEnabled` | `isEnabled()` | Current enable state. |
| `set` | `set(playerId, options)` | Sets a nameplate override for one player. |
| `remove` | `remove(playerId)` | Removes one override. |
| `clear` | `clear()` | Removes every caller-owned override. |

**Invisible players never get a plate, whatever the override says.** When the
server hides a player with
[`Open77.players.setVisible(id, false)`](server-api.md#player-visibility), his
nameplate is withheld along with his body, on every surface that reads the
roster -- the native overlay, a streamed page, and `Open77.nameplates` snapshots
alike. This is not a style choice a resource can override: the plate is
projected from the body's world position, so leaving it up would draw the exact
location that hiding the body exists to conceal. `options.visible` still governs
everything else.

The plate returns on its own when the player is made visible again, or when any
of the automatic releases fires (death, respawn, bucket change, disconnect,
reconnect, or the hiding resource stopping). Client code never has to reconcile
it: the roster is filtered from the replicated life flag, which is the single
source of truth -- **2.31 exposes no readable hidden flag on the engine side, so
no client can be asked whether a body is really hidden right now.**

### `open77_notifications`

| Export | Signature | Result |
|---|---|---|
| `show` | `show(definition)` | Displays a caller-owned notification and returns its handle. |
| `update` | `update(handle, patch)` | Updates a visible or queued notification. |
| `dismiss` | `dismiss(handle)` | Dismisses one caller-owned notification. |
| `clear` | `clear()` | Dismisses every caller-owned notification. |
| `list` | `list()` | Snapshots of caller-owned notifications. |
| `setEnabled` | `setEnabled(enabled)` | Enables/disables notifications for the caller. Disabling also clears them. |
| `isEnabled` | `isEnabled()` | Returns the caller enable state. |

See [Notifications](notifications.md) for types, positions, duration, progress, actions, replacement,
and the server-to-client envelope.

### `open77_uikit`

Every dialog here **waits for a human**, so it must be called through
`Open77.exports.call(...)`; the synchronous `exports.open77_uikit:alert(...)`
spelling fails a waiting callee with `export_yielded`. A dispatch failure is
`nil, reason`; a widget that actually ran resolves with
`{ ok, outcome, value }`, where `outcome` is `"ok"`, `"cancelled"` or
`"timeout"`. **A cancel is an outcome, never a rejection.**

| Export | Signature | Result |
|---|---|---|
| `progress` | `progress(definition)` | **Waits.** Runs a timed bar, blocking the actions named in `disable` through `Open77.input`. |
| `progressActive` | `progressActive()` | `boolean, owner`. |
| `cancelProgress` | `cancelProgress()` | Ends the caller's own bar early. |
| `textUI` | `textUI(definition or text)` | Shows or replaces the caller's persistent hint. |
| `hideTextUI` | `hideTextUI()` | Removes it. Idempotent. |
| `textUIState` | `textUIState()` | `{ open, text, position, total }`. |
| `alert` | `alert(definition)` | **Waits.** A confirm/cancel panel; `value` is `"confirm"`. |
| `input` | `input(definition)` | **Waits.** A form; `value` carries the fields keyed by id and indexed by position. |
| `context` | `context(definition)` | Registers a browse menu under `definition.id`, owner-scoped. |
| `showContext` | `showContext(id, options?)` | **Waits.** Opens it, with in-dialog navigation through an option's `menu` field. |
| `hideContext` | `hideContext()` | Closes the caller's open dialog. |
| `menu` | `menu(definition)` | Registers a keyboard menu with checkbox and side-scroll rows. |
| `showMenu` | `showMenu(id, options?)` | **Waits.** Opens it; the answer carries `values` even on a close. |
| `hideMenu` | `hideMenu()` | Closes the caller's open dialog. |
| `radial` | `radial(definition)` | Registers an eight-sector wheel. |
| `showRadial` | `showRadial(id, options?)` | **Waits.** Opens it. |
| `hideRadial` | `hideRadial()` | Closes the caller's open dialog. |
| `drawText3D` | `drawText3D(definition)` | A string floating over a world point or entity, drawn natively through the anchor facade. Returns a handle; 8 per owner, 24 in all. |
| `updateText3D` | `updateText3D(handle, patch)` | Changes the text, colours, scale, distance band or position of a caller-owned text. |
| `clearText3D` | `clearText3D(handle?)` | Removes one text, or every text the caller drew (`true, count`). Idempotent. |
| `listText3D` | `listText3D()` | The caller's texts with the host's last projection: `distance`, `onScreen`, `inRange`, `expiresIn`. |
| `showCinematicBars` | `showCinematicBars(enabled, options?)` | Claims or releases the letterbox: two bars plus the vanilla HUD hidden under the kit's own loan. |
| `setCinematic` | `setCinematic(enabled, options?)` | The same claim under the parity ledger's name. |
| `cinematicState` | `cinematicState()` | `{ active, hudHidden, mine, holders, heightPct, color }`. |
| `close` | `close()` | Cancels every widget the caller holds; returns `true, count`. |
| `state` | `state()` | Diagnostic snapshot: surface readiness, focus, held blocks, live widgets. |

One focus-taking dialog exists across the whole session: a second request is
refused with `dialog_active` rather than queued. The kit spends exactly **one**
WebUI surface for all of it.

The server twins -- `progress`, `alert`, `input`, `context`, `menu`, `radial`,
`textUI`, `hideTextUI`, `drawText3D`, `updateText3D`, `clearText3D`,
`showCinematicBars` / `setCinematic` and `close`, each taking a `playerId`
first -- are server exports, not client ones, and live on the same resource. See
[The UI kit](ui-kit.md) for definitions, the focus release matrix, the styling
tokens a resource may override, failure reasons and a worked job step.
### `open77_rp_basics`

**Server exports only.** The role-play kit publishes no client exports: its client half owns a
control-block claim and nothing a caller would want to reach.

| Export | Signature | Result |
|---|---|---|
| `cuff` | `cuff(officerId, targetId, options?)` | Freezes the target, blocks his controls and plays `handsup`. `true`, or `false, reason`. |
| `escort` | `escort(officerId, targetId, options?)` | Lets him walk with everything but movement taken away, tethered to the officer. `true`, or `false, reason`. |
| `search` | `search(officerId, targetId, options?)` | Starts a timed frisk; returns a ticket string, or `false, reason`. The report arrives as `open77_rp_basics:searched`. |
| `carry` | `carry(officerId, targetId)` | Always `false, "carry_unsupported"` -- nothing on 2.31 can parent one player to another. Present so a port gets a named refusal instead of a silent no-op. |
| `release` | `release(targetId, byPlayerId, reason?)` | Releases what this kit holds. The holding officer, an `rp.admin`, or the console (`0`). `true`, or `false, reason`. |
| `state` | `state(targetId)` | The standing hold on one player, or nil. |
| `held` | `held()` | Every standing hold. |
| `capabilities` | `capabilities()` | The verb catalogue, with `supported` and a reason for the one that is not. Read this instead of hard-coding what a build can do. |

Authority is the ACL (`rp.cuff`, `rp.escort`, `rp.search`, `rp.admin`), not the caller: an export
carries no player identity. See [the role-play kit](rp-kit.md) for the gate, the leash, and the
twelve ways a hold ends.

### `open77_sound`

| Export | Signature | Result |
|---|---|---|
| `play` | `play(id, file, options?)` | Plays a file the **calling** resource ships. Returns the id, or `nil, reason`. |
| `stop` | `stop(id)` | Stops one caller-owned sound. |
| `stopAll` | `stopAll()` | Stops every caller-owned sound; returns how many. |
| `setVolume` | `setVolume(id, volume)` | 0..1, ramped so it does not click. |
| `setPosition` | `setPosition(id, position)` | Moves a spatial sound; `sound_not_spatial` on a 2D one. |
| `isPlaying` | `isPlaying(id)` | Whether a caller-owned sound is still playing. |
| `list` | `list()` | `{ id, file, loop, volume, spatial }` for caller-owned sounds. |
| `preload` | `preload(file)` | Ships and decodes a clip ahead of its first play. |

`file` must be declared in the **calling** resource's `files` manifest entry — a
resource can only play audio it ships itself, and that is enforced by the host,
not by convention. `options`: `position`, `entity`, `volume`, `loop`, `pitch`,
`offset`, `maxDistance`, `refDistance`.

See [Sound](sound.md) for the spatial model, the caps, the server twins
(`Open77.sound.*`), and the plain list of what this system is **not** — it is
not Wwise, and `Open77.sfx.*` remains the way to play the game's own audio
events.

### `open77_vehicles`

| Export | Signature | Result |
|---|---|---|
| `get` | `get(id)` | One streamed canonical vehicle snapshot. |
| `all` | `all()` | All streamed canonical vehicle snapshots. |
| `getPlayerSeat` | `getPlayerSeat(playerId?)` | One replicated seat assignment; omitted ID selects the local player. |
| `isPlayerExitLocked` | `isPlayerExitLocked(playerId?)` | Replicated exit-lock boolean, or `nil` without an assignment. |

See [Vehicles](vehicles.md) for server mutation and native presentation methods.

### `open-voice`

| Export | Signature | Result |
|---|---|---|
| `getState` | `getState()` | Current canonical mode, distance, cycle key and HUD visibility. |
| `getModes` | `getModes()` | Server-published reach presets. |
| `requestCycle` | `requestCycle()` | Requests the next server-owned mode; no distance is sent by the client. |
| `setHudVisible` | `setHudVisible(visible)` | Locally shows or hides the passive voice HUD. |

See [Integrated voice chat](voice.md). Mode changes remain authoritative on the
server; these client exports cannot submit arbitrary reach.

### `open77_voice`

| Export | Signature | Result |
|---|---|---|
| `status` | `status()` | Native capture/render/device and packet snapshot. |
| `getPushToTalkKey` | `getPushToTalkKey()` | Current local PTT binding. |
| `setPushToTalkKey` | `setPushToTalkKey(key)` | Applies a supported PTT binding without restarting. |
| `devices` | `devices(flow?)` | Input/output endpoint catalogue. |
| `getProximityDistance` | `getProximityDistance()` | Canonical reach plus the full native status snapshot. |
| `setProximityDistance` | `setProximityDistance(distance)` | Request a custom reach; server policy clamps it. |
| `getProximityMode` | `getProximityMode()` | Current `whisper`, `normal`, `shout`, or `custom` mode and distance. |
| `setProximityMode` | `setProximityMode(name, notify?)` | Request a configured reach preset. |
| `cycleProximityMode` | `cycleProximityMode(notify?)` | Select the next configured preset. |
| `setPlayerVolume` | `setPlayerVolume(playerId, gain)` | Local per-talker gain. |
| `setPlayerBlocked` | `setPlayerBlocked(playerId, blocked)` | Local per-talker block. |
| `setChannelVolume` | `setChannelVolume(channelId, gain)` | Local current/future channel-route gain. |

Server scripts in the same package additionally publish helpers for radio/phone channel creation,
membership, authoritative mute/deaf, and proximity. Those helpers execute only in the dedicated
runtime; use [Integrated voice chat](voice.md) for both surfaces and the server-authority rules.

### `open77_weather`

| Export | Signature | Result |
|---|---|---|
| `isReady` | `isReady()` | Whether the first authoritative environment snapshot arrived. |
| `requestSync` | `requestSync()` | Requests an immediate resynchronization. |
| `getState` | `getState()` | Projected server time and canonical weather state. |

See [Weather](weather.md). This package intentionally exposes no client mutation command.

### `open77_worldui`

| Export | Signature | Result |
|---|---|---|
| `create` | `create(definition)` | Creates a caller-owned POI (marker plus optional prompt) and returns its handle. |
| `remove` | `remove(handle)` | Removes one caller-owned POI, both halves. |
| `list` | `list()` | Snapshots of every POI owned by the caller. |
| `dump` | `dump()` | Diagnostic: logs and returns the native marker registry, including `rendered`. |

Mode-agnostic; both official consumers (`resources/gamemodes/pursuit`, `resources/gamemodes/race`) call it
unmodified. See [World-anchored POIs](worldui.md).

### `open77_zones`

| Export | Signature | Result |
|---|---|---|
| `create` | `create(definition)` | Creates a caller-owned proximity zone with enter/exit hysteresis. |
| `remove` | `remove(handle)` | Removes one caller-owned zone. |
| `contains` | `contains(handle)` | The service's last-polled containment verdict for one caller-owned zone. |

Client-only, local presentation signal -- never proof of position. See
[Proximity zones](zones.md) for the polling model and the server-side
re-validation every caller must apply.

### `open77_example`

| Export | Signature | Result |
|---|---|---|
| `hello` | `hello(name?)` | Minimal export example used by the starter package. |

This export is instructional and should not be used as a production dependency.

### `open77_equipment`

These client exports forward to the local `Open77.equipment` adapter. They do not
submit a durable server clothing transaction; authoritative presentation can
subsequently replace a local edit. See [Equipment and wardrobe](../docs/equipment.md).

| Export | Signature | Result |
|---|---|---|
| `slots` | `slots()` | Supported slot names and attachment slots. |
| `records` | `records(options?)` | Record metadata; optional slot, family, restricted and limit filters. |
| `info` | `info(record)` | Metadata for one record, or `nil, reason`. |
| `registry` | `registry()` | Worn slot values: record strings or `false` for empty. |
| `equip` | `equip(record, slot?, options?)` | Native mutation accepted, or `nil, reason`; not visual completion. |
| `unequip` | `unequip(slot)` | Removes one local worn slot without deleting inventory. |
| `apply` | `apply(slots, options?)` | Sequential slot mutation; can partially apply before an error. |
| `beginPreview` | `beginPreview()` | `true` only for `open77_wardrobe_ui` when presentation is ready and no preview is held. |
| `endPreview` | `endPreview()` | Releases the calling preview owner and reapplies authoritative presentation. |

Preview ownership is checked with `GetInvokingResource()`. Other callers receive
`preview_owner_denied`; unavailable initial presentation returns
`presentation_not_ready`. Owner resource stop also ends its preview. Preview
acceptance does not prove that native clothing has finished rendering.

### `open77_wardrobe`

| Export | Signature | Result |
|---|---|---|
| `beginPreview` | `beginPreview()` | `true` for `open77_wardrobe_ui` only when authoritative wardrobe presentation is ready and no preview is held. |
| `endPreview` | `endPreview()` | Releases the calling preview owner and restores pending or current authoritative wardrobe state. |

The same `preview_owner_denied` and `presentation_not_ready` guards apply.
Stopping the preview owner also restores authoritative state. These coordination
exports do not create a persistent outfit or expose arbitrary preview ownership.

## Audit status

This catalogue is checked against literal `exports("name", ...)` declarations in
`resources/*/client/*.lua`, the root-level client packages. System-resource exports
are documented in their feature guides. Dynamic exports
are intentionally discouraged because they cannot be audited or completed reliably by tooling.

`resources/gamemodes/race` is intentionally absent from this catalogue: it declares no `exports("name", ...)`
of its own and only calls the two entries above, so `wiki/tools/audit-api.py`'s
`resources/*/client/*.lua` scan has nothing new to require here.
