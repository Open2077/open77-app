# Dual wielding

Equip two compatible weapons, read ammunition for each hand and build a two-weapon HUD with `Open77.weapons`. The client controls its native loadout; the server API sends authenticated requests to that player's client. Equipped weapons and per-hand firing are replicated to other players, with third-person idle, movement and crouch animations.

Requires Cyberpunk 2077 **2.5**, OPEN//77 **2.50.0+op77.152** or later on both client and server, and the `open77_weapons` resource bundled with that release. Replace older copies of the resource even if their manifest still says `0.1.0`.

## Slots and pairs

`Open77.weapons.slots()` returns `{1, 2, 3, 4, 5, 6}`. Slots 1–3 keep their existing primary-weapon role; slots 4–6 hold their secondary partners.

| Pair | Right hand | Left hand |
|---|---|---|
| 1 | Slot 1 | Slot 4 |
| 2 | Slot 2 | Slot 5 |
| 3 | Slot 3 | Slot 6 |

Activating either slot selects its pair without swapping hands. For example, a Lexington in slot 2 and a Nue in slot 5 remain right and left respectively when you activate slot 5. Single-weapon loadouts in slots 1–3 continue to work.

The native game checks whether the two items can be dual wielded. This API does not make every weapon compatible: heavy weapons, arm cyberware and grenades are outside these weapon slots. An unavailable or incompatible pair returns `dual_wield_pair_unavailable` through the completion event.

## Equip a pair on the client

Declare permissions in `open77.lua`:

```lua
permissions { "player.weapons.read", "player.weapons.edit" }
client_script "client.lua"
```

Run the following sequence after the character has entered the world and your gamemode has authorized the loadout. Each step waits for native completion before submitting the next one. `assign` can add an inventory item; authorize that grant in your server's inventory system before starting the sequence.

```lua
-- client.lua
local pending = {}

local function submit(operation, callback, ...)
    local id, reason = Open77.weapons[operation](...)
    if not id then
        print("Weapon request refused:", operation, reason)
        return
    end
    local key = tostring(id)
    local entry = { operation = operation, callback = callback }
    pending[key] = entry
    SetTimeout(12000, function()
        if pending[key] == entry then
            pending[key] = nil
            print("Weapon request timed out:", operation)
        end
    end)
end

AddEventHandler("open77:weapons:completed", function(
    requestId, operation, accepted, reason)
    local key = tostring(requestId)
    local entry = pending[key]
    if not entry or entry.operation ~= operation then return end
    pending[key] = nil
    if accepted ~= "true" then
        print("Weapon request failed:", operation, reason)
        return
    end
    entry.callback()
end)

local function equipPair()
    submit("setDualWieldAllowed", function()
        submit("assign", function()
            submit("assign", function()
                submit("setActive", function()
                    print("Dual-wield pair equipped")
                end, 2)
            end, "Items.Preset_Nue_Default", 5, { active = false })
        end, "Items.Preset_Lexington_Default", 2, { active = false })
    end, true)
end

-- Call equipPair() from your character/loadout flow once ready.
```

The request ID means **queued**, not equipped. On the client, completion-event arguments are strings: compare `accepted` with `"true"` and IDs with `tostring(requestId)`. Stop the sequence on failure; a timeout does not cancel a native request already in flight. Read a fresh snapshot before retrying.

## Server-controlled policy

A server resource needs the official relay and network permission:

```lua
dependency "open77_weapons >=0.1.0"
permission "network.events"
server_script "server.lua"
```

```lua
-- server.lua: call from an authorized loadout/character handler.
local function enableDualWield(playerId)
    local requestId, reason = Open77.weapons.setDualWieldAllowed(playerId, true)
    if not requestId then print(reason) end
    return requestId
end

AddEventHandler("open77:weapons:completed", function(
    playerId, requestId, operation, accepted, reason, result)
    if operation == "setDualWieldAllowed" then
        -- Server accepted is a boolean, unlike the client event's string.
        print(playerId, requestId, accepted, reason)
    end
end)
```

The server versions of `assign`, `setActive`, `setAmmo`, `remove` and `holster` take `playerId` first. Correlate their completion events by target, request ID and operation before advancing the same equipment sequence. Use `Open77.weapons.requestSnapshot(playerId)` for readback. See the [weapon API](weapons-api.md) for the full server result shape.

The enable flag applies to the current player incarnation during an authenticated multiplayer session. It bypasses the native perk gate without purchasing a perk in the single-player save. Reapply your policy after reconnecting or replacing the player's body.

To disable dual wield, call `setDualWieldAllowed(false)` on the client or `setDualWieldAllowed(playerId, false)` on the server. This clears slots 4–6 while preserving their inventory items. The bundled client export `exports.open77_weapons:setDualWieldAllowed(enabled)` exposes the same asynchronous operation. `exports.open77_weapons:clear()` and server `Open77.weapons.clear(playerId)` remove secondary slots before primary slots, so native promotion cannot leave a weapon equipped.

## Ammunition and HUD

For per-hand discharge counts independent of HUD polling, use client `Open77.weapons.shotCounters()` with `player.weapons.read`. Compare `generation` before subtracting `right` or `left`; reloads and ammo edits do not count as shots. See [shot counters](weapons-api.md#counting-shots-between-polls).

Each drawn weapon has its own magazine, capacity and reload observation. If the weapons use the same ammunition record, they share one reserve. `ammoTotal` includes that reserve plus **both** loaded magazines: with 120 total rounds, 18 loaded on the right and 7 on the left, the shared reserve is 95.

`Open77.weapons.setAmmo(slot, { reserve = 120, magazine = 18 })` sets the shared spare count and that slot's magazine. Omitted counts are preserved, as is the other hand's magazine. The magazine cannot exceed its live capacity. On Stable 156 or later, inactive and holstered slots can be read and updated without drawing them, including weapons never drawn. Add `activate = true` only when you want to draw the selected slot. Wait for completion before reading or issuing a dependent change.

Collect a complete snapshot before replacing the HUD. The client emits one row per slot **before** the snapshot's completion:

```lua
local snapshots = {}

AddEventHandler("open77:weapons:state", function(
    requestId, slot, record, tweakDbId, active, drawn, locked,
    ammoRecord, ammoTweakDbId, ammoTotal, ammoReserve, magazine, capacity, reloading)
    local rows = snapshots[tostring(requestId)]
    local index = tonumber(slot)
    if not rows or not index then return end
    rows[index] = {
        slot = index,
        hand = index <= 3 and "right" or "left",
        record = record, tweakDbId = tweakDbId,
        visible = active == "true" and drawn == "true" and tweakDbId ~= "",
        ammoTweakDbId = ammoTweakDbId,
        reserve = tonumber(ammoReserve),
        magazine = tonumber(magazine), capacity = tonumber(capacity),
        reloading = reloading == "true",
    }
end)

AddEventHandler("open77:weapons:completed", function(id, operation, accepted)
    local key = tostring(id)
    local rows = snapshots[key]
    if not rows or operation ~= "snapshot" then return end
    snapshots[key] = nil
    if accepted ~= "true" then return end
    -- Replace your HUD atomically here; draw visible rows right hand first.
    for slot = 1, 6 do
        local row = rows[slot]
        if row and row.visible then
            print(row.hand, row.magazine, row.capacity, row.reserve, row.reloading)
        end
    end
end)

local function refreshHud()
    local id, reason = Open77.weapons.snapshot()
    if not id then print(reason); return end
    local key = tostring(id)
    local rows = {}
    snapshots[key] = rows
    SetTimeout(12000, function()
        if snapshots[key] == rows then snapshots[key] = nil end
    end)
end

-- Call refreshHud() when needed; keep only one HUD snapshot in flight.
```

An inactive slot can report `-1` for reserve, magazine or capacity until its native weapon object exists. A missing record name does not mean an empty slot: use `tweakDbId`. Do not add the shared reserve from both HUD cards, and do not infer shots from magazine changes: ammunition edits and reloads also change those counts.

**Current limitation:** native dual reloads with too little shared reserve can allocate rounds inconsistently between hands. This release does not resolve that low-reserve case; do not treat a displayed magazine increase as proof that ammunition was granted correctly.

## Related APIs

- [Weapon slots, completion results, components and errors](weapons-api.md)
- [Weapon tuning and customization](weapon-customization.md)
- [Client setDualWieldAllowed reference](/docs/api/client/open77-weapons#setdualwieldallowed)
- [Server setDualWieldAllowed reference](/docs/api/server/open77-weapons#setdualwieldallowed)
