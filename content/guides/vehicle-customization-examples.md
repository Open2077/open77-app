# Vehicle customization worked examples

Complete patterns for resources built on the vehicle customization natives: a tuning shop, a
stage and sound bench, a garage that keeps tuned cars across restarts, and a client menu that
greys what a player's game cannot draw. The natives are public since Open77 **Stable 2.50.0+op77.208 and Unstable 2.50.0-unstable+op77.205**
(paint, the lights hue, trims and the property table are older). Every example tests each
native with `type(Open77.vehicles.<name>) == "function"` before it calls it, so the
resource still loads, and does nothing harmful, on a server of an older build.

## A tuning shop

The shop sells the rims another resource registered. Two resources sit behind it, as in
[Content packs](vehicle-customization-packs.md#the-vehicle-kit-pipeline): the asset resource
`my_vehicle_kit` the kit pipeline builds, whose client script registers the prop models only, and
a server resource `my_vehicle_parts` that declares `dependency 'my_vehicle_kit'` and calls
`registerParts` at start. The parts therefore belong to `my_vehicle_parts`, and their ids read
`my_vehicle_parts:rim_vk1`.

The shop never builds a part id itself: it offers what `listParts` answers for the car, and buys
only an id from that offer, so a client cannot ask for a part the car does not fit.

```lua
-- open77.lua
resource "my_tuning_shop"
version "1.0.0"
dependency "my_vehicle_parts"   -- starts first, so its parts are registered before the shop opens
server_script "server.lua"
client_script "client.lua"
permissions { "network.events", "world.vehicles", "world.vehicles.appearance" }
```

```lua
-- server.lua
-- listParts and setWheels: Open77 2.50.0+op77.208 (Stable) / unstable 205 and later
local hasRims = type(Open77.vehicles.listParts) == "function"
    and type(Open77.vehicles.setWheels) == "function"

local function driverCar(playerId)
    local seat = Open77.vehicles.getPlayerSeat(playerId)
    if seat and seat.seat == "seat_front_left" then return seat.vehicleId end
end

-- Every (rim, variant) pair that fits this car, with qualified ids
local function rimOffer(vehicleId)
    local offer = {}
    for _, part in ipairs(Open77.vehicles.listParts(vehicleId) or {}) do
        if part.kind == "rim" then
            for variant in pairs(part.variants) do
                offer[#offer + 1] = { id = part.id, variant = variant, label = part.label or part.id }
            end
        end
    end
    table.sort(offer, function(a, b) return a.id .. a.variant < b.id .. b.variant end)
    return offer
end

RegisterNetEvent("shop:rims", function()
    if not hasRims then return end
    local vehicleId = driverCar(source)
    if not vehicleId then return end
    -- one JSON string: a nested table can pass the event depth cap
    TriggerClientEvent("shop:rims", source, json.encode(rimOffer(vehicleId)))
end)

RegisterNetEvent("shop:buyRim", function(index)
    if not hasRims then return end
    local vehicleId = driverCar(source)
    local pick = vehicleId and rimOffer(vehicleId)[tonumber(index) or 0]
    if not pick then return end
    -- charge the player here, with your own economy
    local ok, reason = Open77.vehicles.setWheels(vehicleId, { rim = pick.id, variant = pick.variant })
    if not ok then Open77.chat.send(source, "Rims refused: " .. tostring(reason)) end
end)
```

```lua
-- client.lua
RegisterNetEvent("shop:rims", function(text)
    for index, rim in ipairs(Open77.json.decode(text) or {}) do
        print(index, rim.label, rim.variant)
    end
end)
```

The ids in `listParts` are qualified with the resource that called `registerParts`
(`my_vehicle_parts:rim_vk1`), which is what `setWheels` needs from a resource that did not register
the part. A bare `rim_vk1` from the shop would name a part of the shop itself and answer
`unknown_part`. No id is ever `my_vehicle_kit:...`: the asset resource has no server script and
registers no part.

## Neon and lamp colours, with refusals

Neon colours and lamp colours are free text in a menu, so the server must expect refusals: an
emergency look, a colour that is not a colour, a missing permission.

```lua
local function applyNeon(vehicleId, color, mode)
    if type(Open77.vehicles.setNeon) ~= "function" then return false, "not_supported" end
    local ok, reason = Open77.vehicles.setNeon(vehicleId, { enabled = true, color = color, intensity = 900 })
    if not ok then return false, reason end
    if mode and type(Open77.vehicles.setNeonAnimation) == "function" then
        ok, reason = Open77.vehicles.setNeonAnimation(vehicleId, { mode = mode })
        -- emergency_look:neonAnimation: a red or blue strobe, or a red/blue pair
        if not ok then return false, reason end
    end
    return true
end

local ok, reason = applyNeon(vehicleId, "#00e5ff", "breathe")
if not ok then print("neon refused: " .. reason) end

-- Blue brake lights read as an emergency vehicle: emergency_look:brake
if type(Open77.vehicles.setLightColors) == "function" then
    local ok2, reason2 = Open77.vehicles.setLightColors(vehicleId, { brake = "#ff3300", reverse = "#ffffff" })
    if not ok2 then print("lamp colours refused: " .. reason2) end
end
```

## A stage and sound bench

Stages and engine sounds rebuild the car, so the car must be empty: the bench works on a parked
car, by vehicle id. The stage records come from the stage pack (`_o77s1` to `_o77s3`); the server
cannot check that a record exists in the players' games, so the bench builds names only from the
car's own record and the stages the pack generated.

```lua
local MAX_STAGE = 3   -- what the stage pack generated for these models

local function baseRecord(record)
    return (record:gsub("_o77.*$", ""))
end

local function setStage(vehicleId, stage)
    if type(Open77.vehicles.respawnAs) ~= "function" then return nil, "not_supported" end
    local props = Open77.vehicles.getProperties(vehicleId)
    if not props then return nil, "vehicle_not_found" end
    if stage < 0 or stage > MAX_STAGE then return nil, "invalid_stage" end
    local target = baseRecord(props.record) .. (stage > 0 and ("_o77s" .. stage) or "")
    -- keeps the engine sound, the paint and every visual choice
    return Open77.vehicles.respawnAs(vehicleId, target)
end

local id, reason = setStage(vehicleId, 2)
if not id then print("stage refused: " .. reason) end   -- vehicle_occupied, engine_sound_not_for_stage ...

if type(Open77.vehicles.setEngineSound) == "function" then
    for _, sound in ipairs(Open77.vehicles.listEngineSounds(vehicleId) or {}) do
        print(sound.id, sound.label, sound.class)
    end
    local ok, why = Open77.vehicles.setEngineSound(vehicleId, "s01")   -- nil puts the factory sound back
    if not ok then print("sound refused: " .. why) end
end
```

## A garage that keeps tuned cars

Since Stable 2.50.0+op77.208 and Unstable 2.50.0-unstable+op77.205, `getProperties` carries the whole customization, stage and engine sound
included, in its `visual` field; on older builds it carries paint, the lights hue and
the trim, and `setProperties` refuses a `visual` field as `unsupported_property:visual`. The garage
stores the table when the car is parked and restores it on a new car after a restart. On a new car
the stored look is a change, so the garage declares `world.vehicles.appearance` too, and it depends
on the pack resources so their parts, liveries and stickers are registered before it restores
anything.

```lua
-- open77.lua
dependency "my_vehicle_parts"
permissions { "world.vehicles", "world.vehicles.appearance" }
```

```lua
local function park(vehicleId, carKey)
    local props = Open77.vehicles.getProperties(vehicleId)
    if not props then return false end
    Open77.kvp.set("garage:" .. carKey, json.encode(props))
    return Open77.vehicles.remove(vehicleId)
end

-- What setProperties answers when the stored look cannot go on this car right now
local LOOK_REFUSALS = {
    ["unsupported_property:visual"] = true,   -- a server older than 2.50.0+op77.208
    unknown_part = true, part_not_for_model = true, unknown_variant = true,
    invalid_profile = true, unknown_sticker = true, sticker_not_for_model = true,
}

local function retrieve(carKey, spot)
    local stored = json.decode(Open77.kvp.get("garage:" .. carKey) or "null")
    if not stored then return nil, "no_car" end
    local id, reason = Open77.vehicles.create({ record = stored.record, position = spot })
    if not id then return nil, reason end
    -- a stage or sound record of the same model respawns the empty car first
    local ok, why = Open77.vehicles.setProperties(id, stored)
    if not ok and LOOK_REFUSALS[why] then
        -- restore the rest without the look; the stored row keeps it for the next retrieval
        local look = stored.visual
        stored.visual = nil
        ok, why = Open77.vehicles.setProperties(id, stored)
        stored.visual = look
        if ok then print(("garage: %s restored without its look"):format(carKey)) end
    end
    if not ok then print("restore failed: " .. why) end
    return id
end
```

The pack resources (parts, liveries, stickers) must be running for the look to come back. A choice
the car **already holds** stays dormant while its pack is stopped and shows again when the pack
runs. A car the garage has just created holds nothing yet, so every stored part, livery and sticker
is a new choice: if its pack is not running, `setProperties` refuses it (`unknown_part`,
`invalid_profile`, `unknown_sticker`) and applies **nothing**, paint and damage included. Declaring
the packs as dependencies starts them first; the retry above still gets the car back, without its
look, when a pack is missing. A stored row that did not come from the same record can also answer
`record_mismatch`.

## A client menu that greys what it cannot show

A server can store a plate or a tint on any car, but a player's game draws only what its packs
cover. A client menu reads `customizationAvailable` after a change and warns the player.

```lua
-- client.lua; the resource declares permissions { "vehicles.read", "ui.vanilla.hud" }
local hasVisual = type(Open77.vehicles.customizationAvailable) == "function"
    and type(Open77.vehicles.getVisual) == "function"

local function missing(vehicleId, category)
    if not hasVisual then return nil end
    local state = Open77.vehicles.customizationAvailable(vehicleId)
    if not state or state.appliedRev < state.rev then return nil end   -- not drawn yet
    local found = {}
    for _, entry in ipairs(state.skipped) do
        if entry:sub(1, #category + 1) == category .. ":" then found[#found + 1] = entry end
    end
    return found
end

AddEventHandler("open77:vehicleVisualChanged", function(vehicleId, rev)
    -- skipped only grows: an entry stays after the tint is taken off, so warn only while the
    -- car still wears one
    local visual = hasVisual and Open77.vehicles.getVisual(vehicleId)
    if not visual or not visual.tint or visual.tint == 0 then return end
    for _, entry in ipairs(missing(vehicleId, "tint") or {}) do
        Open77.hud.notify("Your game cannot show this tint (" .. entry .. ")")
    end
end)
```

`skipped` is append-only while the car exists on the client: each entry is added once, and is
cleared only when the car leaves this client. Check what the car wears now (client `getVisual`)
before warning, as above, and do not wait for the list to shrink.

`customizationAvailable(id).paint`, `.rims` and `.lights` are the record's own flags: a menu can
grey paint on a body that takes none before the player picks a colour.

## A full studio: Light RP's Auto Studio

Light RP's Auto Studio is a complete shop built on these natives, live on the Light RP testing
server. Every category below has been watched from a second client, and all of
them except Trim came back after a server restart and a late join. Players open the studio at a
studio bay, or with **Customize vehicle** in a public garage, with their own car parked, empty and
stopped.

| Studio category | Natives it calls |
|---|---|
| Body paint | `setPaint`, `resetPaint` |
| Livery | `listPaintProfiles`, `setPaintProfile` |
| Rims | `listParts`, `setWheels` |
| Body kit | `listParts`, `setParts` |
| Neon, and its Animation tab | `setNeon`, `clearNeon`, `setNeonAnimation` |
| Lights, and its Lamp colours tab | `setHeadlightColor`, `clearLightsHue`, `setLightsHue`, `setLightColors` |
| Trim | `setAppearance` |
| Plate | `setPlate` |
| Windows | `setWindowTint` |
| Performance | `respawnAs` onto the stage records |
| Engine sound | `listEngineSounds`, `setEngineSound` |
| Stickers | `listStickers`, `setStickers`, `getDecalBudget` |

How it uses them:

- **Feature detection.** Every native is tested before use; a server or client without one greys
  its category with a reason instead of failing.
- **Previews are real changes.** A preview calls the native, so other players see it; closing the
  studio, driving off or disconnecting restores the bought look of every category.
- **The server owns every choice.** The client relays requests only. The server accepts only ids
  from the car's own offer and never a native or record name sent by a client.
- **One part per group.** The natives do not stop a car from wearing two wings; the studio clears
  the other parts of a group when one is picked.
- **Client warnings.** After a rims, body kit, tint or livery answer, the studio reads
  `customizationAvailable(id).skipped` and warns a player whose game is missing a pack.
- **Rules of its own.** It refuses plates with banned or reserved words, neon too dark to light
  anything and headlight colours with too little saturation, and allows one stage change per car
  every 10 minutes.
- **Persistence.** Each purchase stores the `getProperties` table in the garage row together with
  the payment, and the garage restores it with `setProperties` when the car is retrieved.
- **Catalogues as text.** It sends one JSON string per category to the client, under the event
  caps.
