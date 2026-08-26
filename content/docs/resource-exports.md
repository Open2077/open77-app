# Official resource exports

Open77's native Lua API and resource exports are two separate surfaces. Native methods such as
`Open77.vehicles.get` are registered by the client or server runtime. The exports below are owned by
official Lua resources and add lifecycle isolation, WebUI ownership, or higher-level behavior.

All exports on this page are **client exports**. Server-authoritative mutation remains in server
scripts through the [server Lua API](server-api.md), net events, or a package's documented server
interface.

## Calling an export

The portable cross-resource form is asynchronous:

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

There is no FiveM-style `exports.<resource>:<name>()` proxy. `exports` is a plain function
used to *publish* an export; indexing it raises *attempt to index a function value*, because
the Lua sandbox removes `setmetatable` and `getmetatable`. Always call through
`Open77.exports.call`.

Handles returned by UI packages are resource-owned. Another resource cannot update or dismiss
them, and they are cleaned automatically when the owning generation stops or reloads.

## Export catalogue

### `open77_appearance`

| Export | Signature | Result |
|---|---|---|
| `open` | `open(mode?)` | Requests the server-authorized appearance workflow. |
| `capture` | `capture()` | Current native appearance snapshot. |
| `isOpen` | `isOpen()` | Whether the appearance UI is active. |
| `revision` | `revision()` | Last canonical appearance revision. |
| `characterKey` | `characterKey()` | Durable character key associated with the synchronized appearance. |

See the package README at `resources/open77_appearance/README.md` for the transaction lifecycle.

### `open77_clothing`

| Export | Signature | Result |
|---|---|---|
| `slots` | `slots()` | Canonical wardrobe slot and attachment-slot mapping. |
| `bodyFamily` | `bodyFamily()` | Active local body family. |
| `info` | `info(record)` | Metadata for one exact catalogue record. |
| `catalog` | `catalog(options?)` | Filtered, paginated clothing catalogue. |
| `get` | `get(slot)` | Current state of one local clothing slot. |
| `all` | `all()` | Current state of all seven local clothing slots. |
| `equip` | `equip(record, options?)` | Validates and equips one local record. |
| `unequip` | `unequip(slot)` | Unequips one local slot without deleting the item. |
| `set` | `set(wardrobe, options?)` | Applies a validated multi-slot wardrobe patch. |
| `clear` | `clear()` | Clears all seven supported slots. |

The dedicated runtime separately exposes asynchronous server methods under `Open77.clothing`;
they are not client package exports. They target a player and complete through
`open77:clothing:completed`. The complete schemas, permissions, failure values, and replication
behavior are documented in [Clothing Lua API](../docs/clothing.md).

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

See [Visual and audio effects](effects.md) and [Game data reference](data-reference.md).

### `open77_elevators`

| Export | Signature | Result |
|---|---|---|
| `get` | `get(id)` | One streamed authoritative elevator snapshot. |
| `all` | `all()` | All streamed elevator snapshots. |
| `requestFloor` | `requestFloor(id, floor)` | Requests a `goto` action. |
| `requestCall` | `requestCall(id, floor)` | Requests a `call` action. |

See [Elevators](elevators.md). Elevator IDs are opaque even though this compatibility package
currently normalizes them before calling the native API.

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

Definitions, marker types, choices, distances, entity attachment, and responses are documented in
[Contextual interactions](interactions.md).

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

### `open77_vehicles`

| Export | Signature | Result |
|---|---|---|
| `get` | `get(id)` | One streamed canonical vehicle snapshot. |
| `all` | `all()` | All streamed canonical vehicle snapshots. |

See [Vehicles](vehicles.md) for server mutation and native presentation methods.

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

Mode-agnostic; both official consumers (`resources/pursuit`, `resources/race`) call it
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

## Audit status

This catalogue is generated from every literal `exports("name", ...)` declaration under the
official `resources/` tree. It currently covers **80 exports across 17 packages**. Dynamic exports
are intentionally discouraged because they cannot be audited or completed reliably by tooling.

`resources/race` is intentionally absent from this catalogue: it declares no `exports("name", ...)`
of its own and only calls the two entries above, so `wiki/tools/audit-api.py`'s
`resources/*/client/*.lua` scan has nothing new to require here.
