# Character previews and NPCs with player appearances

Create characters with a specific skin, hair, tattoos and face shape from a captured player body. Clothing is a separate slot map, including custom clothing registered with `Open77.clothing.register`.

| Use | API | Visibility |
|---|---|---|
| Character-selection mannequin | Client `Open77.puppets.createLocal(options)` | Only the creating client; no server NPC, bucket change or network replication. |
| NPC in the world | Server `Open77.npcs.create({ body = ..., ... })` | Every client in the NPC's bucket and streaming range. |

Use **Stable 147 (`2.31.21+op77.147`) or later**. Networked bodies require matching client and server builds; Stable 147 uses protocol **1.48**. The existing `Open77.puppets.setBody` still takes a **player ID**.

## API and permissions

| Call | Runtime | Permission | Result |
| --- | --- | --- | --- |
| `Open77.puppets.createLocal(options)` | Client | `puppets.present` | Preview handle, or `nil, reason`. |
| `Open77.puppets.getLocal(handle)` | Client | `puppets.present` | Readiness table, or `nil, reason`. |
| `Open77.puppets.removeLocal(handle)` | Client | `puppets.present` | `true`, or `false, reason`. |
| `Open77.npcs.create({ body = snapshot, ... })` | Server | `world.npcs` | NPC ID, or `nil, reason`. |
| `Open77.npcs.setBody(id, snapshot)` | Server | `world.npcs` | `true`, or `false, reason`. |
| `Open77.npcs.getBody(id)` | Server | `world.npcs` | Body snapshot, or `nil` when unavailable. |

## Capture and save a look

`Open77.appearance.captureBody()` returns a runtime body snapshot. Capture after the creator or mirror has finished applying the appearance, and preserve every group's mesh keys and optional facial morphs:

| Field | Meaning |
| --- | --- |
| `family` | `"male"` or `"female"`. |
| `groups` | Array of customization groups. |
| `groups[i].part` | `"head"`, `"body"` or `"arms"`. |
| `groups[i].name` | Customization group CName hash. |
| `groups[i].keys` | Array of `{ resourceHash, definitionHash }` mesh selections. |
| `groups[i].morphs` | Optional array of `{ regionHash, targetHash }` creator face-shape selections. |

Keep hashes as fixed-width strings through storage and network serialization. A group may contain morphs without mesh keys. Older snapshots without morphs remain accepted, but cannot reproduce face choices that were never captured; recapture them on the owner's updated client.

`Open77.appearance.capture()` returns logical editor choices, **not** a body snapshot. For a character selector, save a runtime body snapshot alongside each authenticated character's clothing data. Send only that account's saved looks to its selection interface.

Resolve the active wardrobe over equipped slots when copying the current visible outfit:

```lua
-- Client manifest:
-- permissions { "player.appearance.read", "player.equipment.read", "puppets.present" }
local function captureLook()
    local body, reason = Open77.appearance.captureBody()
    if not body then return nil, reason end
    local worn, why = Open77.equipment.registry()
    if not worn then return nil, why end
    local active, wardrobeReason = Open77.wardrobe.active() -- false when off
    if active == nil then return nil, wardrobeReason end
    if type(active) == "number" then
        local outfit = Open77.wardrobe.outfit(active).registry()
        if not outfit then return nil, "wardrobe_unavailable" end
        for _, slot in ipairs({ "Head", "Face", "InnerChest", "OuterChest", "Legs", "Feet", "Outfit" }) do
            worn[slot] = outfit[slot]
        end
    end
    local equipment = {}
    for slot, record in pairs(worn) do
        if slot ~= "WeaponRight" and type(record) == "string" then equipment[slot] = record end
    end
    return { body = body, equipment = equipment }
end
```

Equipment accepts `Items.*` names and the exact `0x` plus 16 hexadecimal digits returned for records without a catalogue name. Keep hashes as strings. Missing clothing slots are empty; omitted underwear uses protective defaults. Held weapons are not mannequin clothing.

## Local selection mannequin

Call from a client resource in a loaded game world. Any saved body can be displayed without changing the local player or requiring its owner to be connected.

```lua
local look = assert(captureLook()) -- or an authorized saved look from your server
local p = Open77.character.state().position
local preview, reason = Open77.puppets.createLocal({
    body = look.body,
    equipment = look.equipment,
    position = { x = p.x + 2.5, y = p.y, z = p.z },
    yaw = 90,
})
assert(preview, reason)

CreateThread(function()
    while true do
        local state, why = Open77.puppets.getLocal(preview)
        if not state then print(why); return end
        if state.status == "failed" then
            print(state.reason)
            Open77.puppets.removeLocal(preview)
            return
        end
        if state.ready then
            -- state.entity is the local Open77 entity ID for camera/scene use.
            -- Your UI can now reveal the mannequin.
            break
        end
        Wait(50)
    end
end)

-- On menu close or selection change:
-- Open77.puppets.removeLocal(preview)
```

The returned ID is a **preview handle**, not a player/server NPC ID. `getLocal` returns `{ id, entity, ready, status, reason }`, with status `spawning`, `preparing`, `ready` or `failed`. Creation is asynchronous, with a 30-second preparation timeout. The serialized options must fit within 8 KiB; `yaw` is in degrees and defaults to zero. Removing a pending preview cancels its spawn.

Previews idle with AI, combat, perception and voice disabled. Each resource can own 32, with 128 across the client. Resources can read/remove only their own generation's previews. Resource stop/reload and world teardown remove them automatically. To change a selection, location or outfit, remove the old preview and create another.

All three functions require `puppets.present`. Creation/read return `nil, reason` on refusal; removal returns `false, reason`. Reasons include `invalid_options`, `invalid_preview`, `local_puppets_unavailable`, `invalid_body`, `invalid_position`, `invalid_yaw`, `invalid_equipment`, `preview_too_large`, `preview_limit`, `world_not_ready` and `preview_not_owned_or_missing`.

## Networked NPC

```lua
-- Server manifest: permission "world.npcs"
-- savedLook comes from your server's character system.
local npc, reason = Open77.npcs.create({
    body = savedLook.body,
    equipment = savedLook.equipment,
    position = { x = -699, y = 2164, z = 53.1 },
    yaw = 90,
    bucket = 0,
    aiMode = Open77.npcs.ai.frozen,
})
assert(npc, reason)

assert(Open77.npcs.setBody(npc, anotherLook.body))
assert(Open77.npcs.setEquipment(npc, anotherLook.equipment))
local body = Open77.npcs.getBody(npc)
-- Open77.npcs.remove(npc) when no longer needed.
```

The body's family selects the matching Open77 player-compatible NPC template. Do not combine `body` with an unrelated `record`, a legacy `template` or an NPC-specific appearance override. Story/crowd templates have fixed appearances and cannot project player customization collections.

`setBody` and `update(id, { body = snapshot })` replace the complete body. Its family must match the NPC's template; recreate the NPC to change male/female. A mismatch returns `false, "npc_body_record_mismatch"` without changing the appearance. `getBody` returns the stored body, or `nil` for an unknown/foreign NPC or one without a player body.

Body and clothing travel in the reliable NPC loadout snapshot, survive weapon-only `setLoadout` calls and replay after stream-in/late join. Validation allows 64 groups and 64 key/morph pairs per group, fixed-width nonzero hash strings and known body parts. The **complete loadout** retains its 8 KiB limit. It references installed resources; it does not contain meshes or images.

Other [NPC APIs](npcs.md), tasks and streaming rules remain available. The template's supported animations still determine which tasks render correctly.

## Custom clothing

Register metadata and distribute `.archive`, ArchiveXL and/or TweakXL files as described in [Custom clothing](custom-clothing.md). Use the record in `equipment`, for example `{ OuterChest = "Items.MyServerJacket" }`. Assets must be installed on each viewing client and support the selected body family. Registration does not create missing meshes or convert garment rigs.

Previews and player-shaped NPCs use the same body/equipment dresser. Native lookup refuses a missing item before repeatedly trying to equip it; the previous valid slot remains. Check for `body equipment refused` in the client log if an installed record does not resolve.
