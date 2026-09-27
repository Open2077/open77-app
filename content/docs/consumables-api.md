# Grenades and healing items

`Open77.consumables` controls the local player's grenade and healing hotkeys,
selected item type and **usable charges**. On the server, the same API takes a
`playerId` first and sends a correlated request to that player's client.

Requires a client exposing `Open77.consumables`, a server runtime providing the
server methods, and `open77_weapons` resource 0.2.0. Treat the API as experimental
and check compatibility before enabling consumable loadouts.

Use `kind = "grenade"` for the grenade hotkey or `"healing"` for inhalers and
injectors. These are independent kits. Charges are not inventory stack sizes:
Cyberpunk 2.31 consumes a rechargeable stat pool when using these items.
The older `Open77.weapons.giveGadget` API still changes inventory membership.

## Give a kit

```lua
-- server.lua: the owner relay needs network.events.
local requestId, reason = Open77.consumables.configure(playerId, "grenade", {
    record = "Items.GrenadeFragRegular",
    count = 5,
    capacity = 5,
    equipped = true,
    recharge = false,
})
if not requestId then print("Grenade request refused: " .. reason) end

Open77.consumables.configure(playerId, "healing", {
    record = "Items.FirstAidWhiffV0", -- MaxDoc inhaler
    count = 3,
    equipped = true,
    recharge = false,
})
```

Client scripts omit `playerId`:

```lua
local requestId, reason = Open77.consumables.setCount("grenade", 7)
```

The request ID means **queued**, not applied. Native code reads the actual
charge pool, hotkey binding, capacity and regeneration policy before completing.
Wait for completion before issuing another write to the same kit.

## Methods

The signatures below are for client Lua. Prefix every argument list with
`playerId` when calling from server Lua.

| Method | Behavior |
| --- | --- |
| `configure(kind, options)` | Set any combination of `record`, `count`, `capacity`, `equipped`, `recharge`. |
| `setType(kind, record)` | Change type, preserving count and equipped status. |
| `setCount(kind, count)` | Set usable charges; zero leaves the type selected with no uses available. |
| `equip(kind, record?)` | Bind the selected type, or supply a new type. |
| `unequip(kind)` | Clear the hotkey and equipment slots, preserving the selected type and charges. |
| `setRecharge(kind, enabled)` | Enable or disable native regeneration. |
| `snapshot(kind)` | Request a fresh asynchronous readback. |
| `get(kind)` | Read the latest cached state synchronously, or `nil, reason`. |
| `reset(kind)` | Remove this API's capacity modifiers and restore its captured regeneration policy. |

`count` is an integer from 0 through 999; `capacity` from 1 through 999. An
explicit capacity smaller than the count is rejected. Without a capacity, a
write grows the capacity if needed to fit the requested count. Omitted values
preserve current state. The first managed write defaults to `recharge=false`;
later partial writes preserve that policy. An initial kit should specify its
type, count and equipped status explicitly.

Reset preserves the selected item and clamps excess charges to the restored
native capacity. It does not remove unrelated inventory or stat modifiers.
Controls are scoped to the current player body/session and are released on
disconnect or body replacement. Apply the desired kit from your game mode's
spawn lifecycle when creating a new body. This API is not persistent inventory
storage. A failed write reports the observed state; it is not a transaction
that rolls back every intermediate equipment change.

## Types

Types must resolve to an actual item with the matching equipment area and
native class. A syntactically valid name alone is insufficient. Arbitrary food,
drinks and weapons are rejected.

| Kind | Example record | Native type |
| --- | --- | --- |
| `grenade` | `Items.GrenadeFragRegular` | Frag grenade / QuickSlot |
| `healing` | `Items.FirstAidWhiffV0` | MaxDoc / inhaler |
| `healing` | `Items.BonesMcCoy70V1` | Bounce Back / injector |

Use MaxDoc for inhalers and Bounce Back for injectors. For other grenade
types, consult the [weapon catalogue](data-reference.md). A record must match
the requested kind; inventory stack size does not determine usable throws.

## Readback and completion

`get` returns a table with `kind`, `record`, `tweakDbId`, `count`, `capacity`,
`equipped`, `recharge`, `managed`, `sequence`, `reportedAgeMs` and `source`.
`source` is `native_readback` on the client and `owner_report` on the server.
The age measures time since the last observation/report, not a heartbeat.
Use `snapshot` when a fresh response is required.

For a pre-existing native item whose name has not been resolved, `record` can
be empty even though `tweakDbId` identifies the selected item. Compare
`tweakDbId` in that case; an empty name does not mean an empty hotkey. Types
explicitly configured through this API retain the supplied record name.

```lua
local state, reason = Open77.consumables.get(playerId, "healing")
if state then
    print(state.record, state.count, state.equipped, state.reportedAgeMs)
end

-- Server completion: the standard weapon relay also carries consumable writes.
AddEventHandler("open77:weapons:completed", function(
    playerId, requestId, operation, accepted, reason, state)
    if operation ~= "consumable" then return end
    -- Match requestId against your own pending requests.
    if accepted then print("Applied", state.kind, state.count, state.equipped)
    else print("Refused", reason) end
end)
```

Client scripts receive native state before completion:

```lua
AddEventHandler("open77:consumables:state", function(
    requestId, kind, record, tweakDbId, count, capacity,
    equipped, recharge, managed, sequence, uses, change)
    -- Native event arguments are strings. Unsolicited updates use requestId "0".
    print(kind, tonumber(count), equipped == "true", change)
end)
```

Client completion retains the existing native
`open77:weapons:completed(requestId, operation, accepted, reason, ...)`
signature: `accepted` is the string `"true"` or `"false"`. Read the preceding
state event or `get(kind)` for consumable details. Server completion uses a
boolean and a typed result table.

## Observe actual uses and apply healing policy

```lua
-- server.lua
AddEventHandler("onConsumableUsed", function(
    playerId, kind, record, remaining, uses, sequence, tweakDbId)
    -- Host event arguments are strings; convert as needed.
    playerId, remaining, uses = tonumber(playerId), tonumber(remaining), tonumber(uses)
    print(playerId, "used", kind, record, "remaining", remaining)
end)
```

This event follows the native grenade throw/healing-use path. Changing a count
through Lua does not fabricate a use. The host rejects stale reports and
suppresses repeated use sequences. Finite managed stock also limits vanilla
free-use/refund effects; native regeneration is available with `recharge=true`.
Perks can modify charge costs and refunds. Check the interactions used by your
game mode when combining native perks with finite managed stock.

Health in Open77 is server-authoritative. A native healing animation and charge
consumption do **not** automatically authorize server health. Your game mode
decides the heal amount and checks its own inventory, cooldown and life state
before calling `Open77.players.heal(playerId, amount)` with
`players.damage.apply` permission. A report from the authenticated owner is
still client input, not an anti-cheat proof of entitlement. Do not blindly
grant health or inventory rewards from this event. Native grenade explosion
damage already has its existing replication path; do not create a second
explosion from the use callback.

## Permissions and errors

Client reads require `player.weapons.read`; client writes require
`player.weapons.edit`. Server cached reads require `player.weapons.read`.
Server requests follow the existing weapons convention: `network.events`
authorizes dispatch through the `open77_weapons` owner relay, whose client
manifest grants native read/edit capabilities. The server relay does not add
a separate `player.weapons.edit` gate. The official resource handles baseline reporting and subsequent
native changes. There is no per-frame Lua polling requirement for consumers.

Immediate errors include invalid kind, record syntax, options/counts, denied
permissions, missing player or unavailable API. Native completions can fail with
`invalid_consumable_type`, `no_consumable_type`, `consumable_unavailable`,
`consumable_busy`, `consumable_readback_mismatch`, `consumable_reset_mismatch`,
`player_replaced` or `session_ended`. Retry a busy request after the player has
finished using the item. A failed readback is not success even if part of the
equipment change is visible. An old client returns
`consumables_unavailable_on_this_client` instead of claiming a write succeeded.

## Function reference

See the [client consumables API](/docs/api/client/open77-consumables) and
[server consumables API](/docs/api/server/open77-consumables) for individual
signatures and examples.
