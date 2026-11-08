---
title: "Customize vehicles on your Cyberpunk 2077 server, from A to Z (and restyle nameplates)"
date: "2026-11-08"
description: "A developer's guide to vehicle customization in OPEN//77: rims, body kits, liveries, stickers, neon, plates, tint and performance stages from Lua, the open content packs, the pipeline to build your own, and how to restyle the native nameplates."
tags: ["cyberpunk-2077-car-customization", "cyberpunk-2077-mods", "lua", "server-development", "nameplates", "light-rp"]
---
Rims, body kits, liveries, stickers, neon, window tint, custom plates, performance stages and engine sounds: an OPEN//77 server can now change all of it on any player's car, from a few lines of Lua, and every player in the street sees the same car. This post walks through the whole thing from a developer's point of view. It covers how it works, the code, where to get the ready-made content and how to build your own. The last part covers the other thing everyone asks about: how to make player nameplates look like *your* server.

Everything here is open:

- the [Light RP](https://github.com/Open2077/light-rp) server that uses it is public;
- so are its content packs;
- so is the pipeline that built them;
- the [documentation](/docs/vehicle-customization-natives) covers every function.

**When can you use it?** Paint and factory trims already work on today's servers. The lights hue is stored and shared today too, but headlights only take its colour from the next client release. Everything else in this post arrives with the **next OPEN//77 release** (server and client together). That includes the new nameplate theme and the new line-of-sight check. The code below shows how to test for each function, so one script runs on both.

## The idea in one minute

Three ideas explain the whole system.

**1. The server decides, every client draws.** A car's look is not something a player's game invents. The server stores it, as one small value attached to the car (the `open77.visual` key, at most 4 KiB). Every client reads that value and draws the car from it. Players who are nearby see the change at once. Players who join later, reconnect, or drive back into range get the same value and draw the same car. No client can write it: only server functions can.

**2. Some changes are settings, others are content.** Turning on a blue neon needs nothing new in the game: the engine already knows how to light a car. A new rim is different. It is a 3D model the game has never seen, so every player needs the file *before* the car shows up. Settings work on any car right away. Content comes in **packs**.

**3. A pack is a resource with a ZIP.** A content pack is an ordinary server resource that declares a `preload_mod` ZIP. When a player connects, the OPEN//77 launcher downloads that ZIP and mounts it **before the game starts**, checking every byte against its hash. Then a small script tells the server what the pack contains ("these 18 rims fit these cars"). Think of a wardrobe: the pack puts the clothes in every player's closet before they arrive, and the server only says what each car is wearing.

Here is the whole menu:

| What | Function (server) | Needs a pack? |
|---|---|---|
| Body paint | `setPaint` | no, works today |
| Lights hue | `setLightsHue`, `setHeadlightColor` | no; stored today, shown on headlights from the next release |
| Factory trim | `setAppearance` | no, works today |
| Neon and its animation | `setNeon`, `setNeonAnimation` | no |
| Brake, reverse, blinker and interior lamps | `setLightColors` | no |
| Factory liveries | `listPaintProfiles`, `setPaintProfile` | no |
| Custom liveries | `setPaintProfile` | yes (TweakXL) |
| Rims | `listParts`, `setWheels` | yes |
| Body kit: wings, lips, skirts, hoods… | `listParts`, `setParts` | yes |
| Stickers | `listStickers`, `setStickers` | yes (TweakXL) |
| Plate text | `setPlate` | yes (ArchiveXL) |
| Window tint | `setWindowTint` | yes (ArchiveXL, ships with the server) |
| Performance stages 1 to 3 | `respawnAs` | yes (TweakXL) |
| Engine sounds | `listEngineSounds`, `setEngineSound` | yes (TweakXL) |

All of them live on `Open77.vehicles`.

## Step 1: permissions, and testing before you call

A resource that changes how cars look declares two permissions. `world.vehicles` lets it touch cars at all, and `world.vehicles.appearance` lets it change their look:

```lua
-- open77.lua
resource "my_tuning_shop"
version "1.0.0"
server_script "server.lua"
client_script "client.lua"
permissions { "network.events", "world.vehicles", "world.vehicles.appearance" }
```

Every setter answers `true`, or `false` plus a **reason** that says what was wrong: `vehicle_not_found`, `invalid_plate`, `part_not_for_model`, `decal_budget_exceeded`… Always print the reason. It saves hours.

Because most of these functions are new, test for them before calling. On a server that does not have them yet, your script then greys a menu instead of crashing:

```lua
if type(Open77.vehicles.setWheels) ~= "function" then
    print("this server has no rims yet")
    return
end
```

## Step 2: what works on any car, with no pack

Colours, neon, lamps, tint and plates are a few lines each:

```lua
local V = Open77.vehicles

V.setPaint(carId, { primary = "#00D8FF", secondary = "#0B0E14" })
V.setNeon(carId, { enabled = true, color = "#00E5FF", intensity = 900, radius = 3 })
V.setLightColors(carId, { brake = "#FF0033", interior = "#7A00FF" })

local ok, reason = V.setPlate(carId, "NC 2077")      -- A-Z, 0-9, space, dash; 1 to 10 characters
if not ok then print("plate refused: " .. reason) end

V.setWindowTint(carId, 2)                            -- 1 light smoke, 2 dark smoke, 3 limo
```

Colours accept `"#rrggbb"`, `{ r = 0, g = 216, b = 255 }` or `{ 0, 216, 255 }`.

Plate text and tint are **stored on any car**, but they are only **drawn** on the models the plate and tint packs cover. Another model keeps its stock plate or glass. Nothing breaks, and the client can tell you (step 7).

Two details matter for a shop:

- **Setting the value a car already has changes nothing**, publishes nothing, and needs only `world.vehicles`. A garage can re-apply a stored look without the appearance permission.
- The look has a budget: 4 KiB, 256 values and 16 attached parts. A change that would go past it is refused with `visual_too_large` or `attach_limit`, and nothing is applied.

## Step 3: install the content packs

You do not have to build anything to start. The Light RP server publishes the seven packs it runs, ready to copy, in [`resources/assets/models`](https://github.com/Open2077/light-rp/tree/main/resources/assets/models):

| Pack | What it adds |
|---|---|
| `lightrp_vk_rims` | 18 original rims in 6 finishes, fitted to the dealer cars and the other vanilla player cars |
| `lightrp_vk_body` | 30 body kit parts: wings, lips, canards, skirts, diffusers, hoods, roofs |
| `lightrp_vk_liveries` | liveries on 21 bodies |
| `lightrp_vehicle_original_stickers` | 235 original stickers, on every player body |
| `lightrp_vehicle_stickers` | 43 stickers, the first set |
| `lightrp_vehicle_stages` | stage 1 to 3 records, and engine sounds per model |
| `open77_vehicle_plates` | custom plate text |

Every one of them is **original content**: no file from the game is copied into a ZIP. Game data is only *named*, by path or record, and the builds check it byte by byte.

Five of them work as soon as they run. The rims and the body kit need one small resource of yours, explained below. Here is the setup, start to finish.

**1. A server of the next release.** On an older server the packs' scripts skip themselves, and the natives they serve do not exist yet.

**2. The loaders.** Liveries, stickers and stages need the `tweakxl` loader, 1.12.0 or later. The plate text and the window tint need `archivexl`, 1.28.0 or later. Both are resources in the [open77-resources](https://github.com/Open2077/open77-resources/tree/next/libraries) `libraries/` folder. Take them from the `next` branch for now, because `main` still has older versions (TweakXL 1.11.4, ArchiveXL 1.27.1) that are too old. Copy the `tweakxl` and `archivexl` folders into your `resources/`.

**3. The packs.** Copy the pack folders into your `resources/`, and keep their names. Every path inside a pack's archive starts with `open77\assets\<resource name>\`, so a renamed folder no longer finds its own files. To use another name, rebuild the pack under it (Step 8 below).

**4. A resource that registers the rims and body parts.** The rims and body packs carry only the 3D models. The part that matters for gameplay is the catalogue that says which part fits which car, where it sits and which stock pieces it hides. Light RP generates that catalogue into three files, and its gamemode registers it at start. On your server, a resource of yours does that job. Copy the three files from Light RP's [`op77_lightrp/server/config`](https://github.com/Open2077/light-rp/tree/main/resources/gamemodes/op77_lightrp/server/config) folder (`vehicle_kit.lua`, `vehicle_kit_player_rims.lua` and `vehicle_kit_trims.lua`) into a new resource folder, and add these two files:

```lua
-- resources/my_lightrp_parts/open77.lua
resource "my_lightrp_parts"
version "1.0.0"
dependency "lightrp_vk_rims"                 -- also starts the two packs
dependency "lightrp_vk_body"
server_script "vehicle_kit.lua"              -- the rims and body parts, with their fits on the dealer cars
server_script "vehicle_kit_player_rims.lua"  -- the rims' fits on every other player car
server_script "vehicle_kit_trims.lua"        -- trims whose stock rims differ
server_script "server.lua"
```

```lua
-- resources/my_lightrp_parts/server.lua
local KIT = LightRpVehicleKit
local playerRims = LightRpVehicleKitPlayerRims.fit
local trims = LightRpVehicleKitTrims.rims

for _, section in ipairs({ "rims", "body" }) do
    for id, part in pairs(KIT[section].parts) do
        if section == "rims" then
            for record, fit in pairs(playerRims) do part.fit[record] = part.fit[record] or fit end
            for record, appearances in pairs(trims) do
                if part.fit[record] then part.fit[record].appearances = appearances end
            end
        end
        local ok, reason = Open77.vehicles.registerParts({ [id] = part })   -- one part per call
        if not ok then print(("part %s refused: %s"):format(id, tostring(reason))) end
    end
end
```

That registers the 48 parts (18 rims and 30 body parts) under your resource's name, `my_lightrp_parts:rim_lattice` for example. We ran this exact resource on a bare server: 43 parts fit an Archer Hella, 42 a Herrera Outlaw, and not one was refused. The Light RP server itself does not need this resource, because its gamemode already registers the parts.

**5. `server.jsonc`.** Three settings:

```jsonc
"requiredMods": { "enabled": true, "unsecured": true },
"resources": {
  "load": [ "tweakxl", "archivexl",
            "lightrp_vk_rims", "lightrp_vk_body", "my_lightrp_parts",
            "lightrp_vk_liveries", "lightrp_vehicle_original_stickers", "lightrp_vehicle_stickers",
            "lightrp_vehicle_stages", "open77_vehicle_plates",
            "my_tuning_shop" ]
},
"startup": { "commands": [ "ensure open77_vehicle_plates" ] }
```

- `requiredMods.enabled` lets the server send the packs to players. `unsecured` is needed because TweakXL and ArchiveXL contain code: see [unsecured mode](/docs/server-mods#unsecured-mode).
- `resources.load` is an allowlist. A resource missing from it never starts, and nothing is logged. List the loaders and packs before the resources that use them.
- The rims, body and plate packs do not start by themselves (`auto_start false`). A resource that declares them as a `dependency` starts them, which is why `my_lightrp_parts` needs nothing more. Nothing depends on the plate pack, so `ensure` starts it.

**6. Restart the server, then players reconnect.** The launcher mounts each pack's ZIP before the game starts, so a new or changed pack needs a server restart, and every player needs a fresh connection to get it. A player whose game is missing a pack sees that car stock, and nothing else fails.

**7. Check it.** The server log names each pack's ZIP at start (`preloads 'dist/…zip' as required mod`) and prints `started` for every resource. Any `part … refused` line from your resource names the part and the reason. In game, the `skipped` list (Step 7 below) tells you what one player's game could not draw.

### Where Warden fits, and what players see

**You upload nothing to Warden.** The `preload_mod` line in a pack's manifest is what attaches it to your server. At start, the server reads the ZIP, checks what is inside and adds it to your server's required mods on its own. The log says so: `Resource 'lightrp_vk_rims' preloads 'dist/…zip' as required mod 'lightrp_vk_rims-assets'`, then `Required mods: N declared`. Warden's **Mods** page lists these packs with a `resource <name>` badge and no remove button. The resource owns them, so you remove a pack by removing its resource and restarting. Warden's upload button is for the other case, a mod you have as a loose archive with no resource around it: [Mods your server requires](/docs/server-mods) covers that.

**Why not the normal resource download?** A resource's scripts and files reach players while the game is already running, and can even be reloaded live. A new rim cannot arrive that way, because the game reads its archives and its records once, when it boots, and never looks again. Anything that adds a model or a record must be on the player's disk before the game starts, and that is exactly what a required mod is. Paint, neon, lamp colours and the game's own liveries (Steps 2 and 5) need no mod at all: they only use what every copy of the game already has, so the script alone is enough.

**What a player sees.** When they press Connect, the launcher lists everything your world requires and asks them to agree. Each pack is named, with its size and whether Open77 has reviewed it. Because TweakXL and ArchiveXL contain code, the server list shows your server as unsecured, and players confirm that before joining. The launcher then downloads what they are missing from your server and checks every byte against its hash. It installs the files into a profile for your world only, then starts the game. Their own install and their solo profile are never touched, and the next time they join, nothing is downloaded again.

**What it costs you.** Those files come from your server, so the bandwidth is yours. Light RP's seven packs and the two loaders weigh about 25 MB, sent once per new player: 500 new players is about 13 GB. Returning players download nothing. The [bandwidth section](/docs/server-mods#bandwidth-you-are-the-host) has the details.

## Step 4: sell rims and body parts

This is where a pack meets your gameplay. Some resource calls `registerParts` at start: for Light RP's packs it is `my_lightrp_parts` from Step 3, and for your own packs it is a resource of yours. That call declares each part, its finishes (variants), and **how it fits each car model**. Your shop then asks what fits *this* car and buys only from that answer:

```lua
-- server.lua of a shop that sells the rims another resource registered
local function rimOffer(carId)
    local offer = {}
    for _, part in ipairs(Open77.vehicles.listParts(carId) or {}) do
        if part.kind == "rim" then
            for variant in pairs(part.variants) do
                offer[#offer + 1] = { id = part.id, variant = variant, label = part.label or part.id }
            end
        end
    end
    table.sort(offer, function(a, b) return a.id .. a.variant < b.id .. b.variant end)
    return offer
end

RegisterNetEvent("shop:buyRim", function(index)
    local carId = myPlayersCar(source)                 -- your own lookup
    local pick = carId and rimOffer(carId)[tonumber(index) or 0]
    if not pick then return end
    -- charge the player here, with your own economy
    local ok, reason = Open77.vehicles.setWheels(carId, { rim = pick.id, variant = pick.variant })
    if not ok then Open77.chat.send(source, "Rims refused: " .. tostring(reason)) end
end)
```

Body parts work the same way with `setParts(carId, { [partId] = variant })`. Passing `false` takes a part off.

Three things to know:

- **The client never picks an id.** It picks an index in the offer the server built, so nobody can ask for a part the car does not fit.
- **Part ids are namespaced** by the resource that *registered* them: `my_lightrp_parts:rim_lattice`, not `rim_lattice`, and never the pack's name. `listParts` answers the full ids, so take them from there.
- **A fit is per car record.** A rim is one 3D model, scaled and placed per model, with the stock rim components hidden (the tyre stays the car's own). A car whose record has no fit answers `part_not_for_model`. That is why the reference packs cover a known list of cars. The [model coverage guide](/docs/vehicle-customization-models) explains how to cover more.

Parts are **visual only**: no collision and no physics, so a wing never changes how a car drives.

## Step 5: liveries and stickers, and the 12-decal rule

Liveries are colour templates. The game ships some per model, and packs add more:

```lua
local profiles = Open77.vehicles.listPaintProfiles(carId) or {}
if profiles[1] then Open77.vehicles.setPaintProfile(carId, profiles[1].id) end
```

Stickers are a list of up to 12 ids, set in order:

```lua
local used, max = Open77.vehicles.getDecalBudget(carId)     -- e.g. 3, 12
local ok, reason = Open77.vehicles.setStickers(carId, { "st.thrax.valentinos_01" })
```

**A car can show at most 12 decals, its livery's included.** A thirteenth crashes every game that spawns the car. That is a game limit, not ours. So the server counts for you: a sticker list, or a livery, that would take a car past 12 is refused with `decal_budget_exceeded`. Show `getDecalBudget` in your menu and players will understand.

## Step 6: performance stages and engine sounds

A stage is a different **record** for the same car: `Vehicle.<record>_o77s1` to `_o77s3`, generated by the stages pack. `respawnAs` rebuilds the car in place on that record, under the same id. It keeps the paint, the trim, the health and the whole customization:

```lua
local id, reason = Open77.vehicles.respawnAs(carId, "Vehicle.v_standard2_archer_hella_player_o77s1")
if not id then print("stage refused: " .. reason) end      -- e.g. vehicle_occupied
```

The car must be **empty**, because a rebuild with someone inside would throw them out. Engine sounds ride on the same mechanism: `listEngineSounds(carId)` answers the sounds made for that model at its current stage, and `setEngineSound(carId, soundId)` applies one.

## Step 7: keep it, and tell players what their game can show

**Persistence.** OPEN//77 does not write cars to disk; your garage does. Store `getProperties(carId)` when a car is parked, and give it back with `setProperties` on the new car. From the next release that table carries the whole look, so the round trip is exact:

```lua
local props = Open77.vehicles.getProperties(carId)
Open77.kvp.set("garage:" .. key, json.encode(props))
-- later, after a restart
local stored = json.decode(Open77.kvp.get("garage:" .. key) or "null")
local newId = Open77.vehicles.create({ record = stored.record, position = spot })
local ok, reason = Open77.vehicles.setProperties(newId, stored)
```

Restore after the packs have started. A choice whose pack is not running is refused as new, while a choice the car already held stays "dormant" until its pack comes back.

**The client side.** A server can store a plate on any car, but a player's game draws only what its packs cover. On the client, `customizationAvailable(carId)` answers the record's own abilities (`paint`, `rims`, `lights`). Its `skipped` list names everything this client could not draw, with the reason: `plate:<record>:no_plate_widget`, `tint:<record>:not_covered`, `attach:<key>:model_not_registered`… A good menu greys what cannot be shown instead of letting a player pay for something invisible. The [worked examples](/docs/vehicle-customization-examples) include that menu.

If you want to see all of this together, Light RP's **Auto Studio** is a complete shop: twelve categories, each built on the functions above. Its source is [in the Light RP repository](https://github.com/Open2077/light-rp), and the [examples guide](/docs/vehicle-customization-examples#a-full-studio-light-rps-auto-studio) maps every category to its functions.

## Step 8: build your own pack

When you want *your* rims, *your* stickers or *your* liveries, use the same tools that built the Light RP packs. They are public in [`tools/vehicle-kit`](https://github.com/Open2077/open77-resources/tree/next/tools/vehicle-kit) (the `next` branch until the release). Each builder takes a JSON spec and writes a resource folder ready to copy into a server:

```text
spec.json ─► Blender (procedural, original geometry) ─► .glb
          ─► WolvenKit import ─► native cook ─► round trip check
          ─► .archive ─► preload_mod ZIP + package.json + Lua ─► preview renders
```

| Pack | Command, from `tools/vehicle-kit` |
|---|---|
| Rims, body parts | `pwsh -File scripts/vehicle-kit/build-pack.ps1 -Spec my-kit.json` |
| Liveries | `pwsh -File scripts/vehicle-kit/liveries/build-liveries.ps1` |
| Stickers | `pwsh -File scripts/vehicle-kit/stickers/build-original-stickers.ps1` |
| Stages and engine sounds | `pwsh -File scripts/vehicle-kit/stages/build-stages.ps1` |
| Plates | `pwsh -File scripts/vehicle-kit/plates/build-plates.ps1` |
| Window tint | `pwsh -File scripts/vehicle-kit/windows/build-tint.ps1` |

You need:

- Windows with PowerShell 7;
- the game, which is only read, never written;
- the WolvenKit CLI;
- Node.js 18 or later;
- Python 3 with `numpy` and `Pillow`;
- Blender 4.5 for the 3D parts.

Without a spec, each builder rebuilds the Light RP reference pack, which is the quickest way to check your setup. Then copy a spec from `scripts/vehicle-kit/specs/` and change it.

The liveries, stickers and stages builders also write the server script that registers what they built. The rims and body part builder writes the asset resource only, just like Light RP's packs. Your own server resource then registers the parts with their fits, as in Step 3, and the [content packs guide](/docs/vehicle-customization-packs#the-gameplay-resource) shows a minimal one.

The builds refuse to produce a broken pack. They enforce three rules you would otherwise learn the hard way:

- **Original content only.** The rim and body part cook refuses any embedded game file and any reference outside a short allowlist. The livery, sticker and plate builds compare every cooked file with every game file they read, and fail on any shared block.
- **The name is part of the content.** Every path in the archive starts with the resource name, so a rename means a rebuild.
- **The revision is a hash of the inputs.** It names the ZIP and the folder inside the archive. A rebuilt pack can therefore never be shadowed by a stale copy in a player's cache, and the same inputs always rebuild the same bytes.

The [content packs guide](/docs/vehicle-customization-packs) covers the details: fit tables, registration limits, and checking that a pack loaded.

## Part two: nameplates that look like your server

Nameplates are the labels over other players' heads. In OPEN//77 the client plugin draws them **natively**: no web page, no lag behind the camera. The shipped `open77_nameplates` resource turns them on for every server. A resource that wants to change them declares one permission:

```lua
permissions { "ui.nameplates" }
```

There are three levels of change, from one plate to all of them.

### What one plate says: `set`

Rename a player, add a second line, a colour and a bar:

```lua
local ok, reason = Open77.nameplates.set(playerId, {
    label    = "Officer Reyes",
    sublabel = "NCPD",          -- a second line under the name
    accent   = "#3399FF",       -- this plate's side bar, border, pin and voice bars
    bar      = 0.8,             -- a health or progress bar, 0 to 1
    maxDistance = 60,
})
if not ok then print("plate refused: " .. tostring(reason)) end
```

`remove(playerId)` drops it. An option you leave out follows the server's theme, so a plate that only renames a player keeps your palette. Overrides belong to the resource that set them: another resource cannot change or remove yours. A plate someone else already overrides answers `owned_by_another_resource`.

### Who gets a plate: policies

By default, every player you can see within 35 m has a plate. That is wrong for a shooter, where a name over a head would spot every enemy. So `open77_nameplates` has a **competitive** mode. Your squad keeps its plates, through walls on purpose so a squad can find itself, and an enemy you just hit shows a short health readout. Cordon and the deathmatch switch to it on their own. Any other game mode declares its teams from a client script:

```lua
exports.open77_nameplates:setFriendlies({ 12, 15, 21 }, { inFight = true })
exports.open77_nameplates:setPolicy("competitive")   -- or "auto", "open"
```

Operators can retune it live, without a restart, from Warden or with `tunable.set open77_nameplates <key> <value>`: the range, health and shield on squadmates, the enemy readout. See the [nameplates exports](/docs/resource-exports#open77_nameplates).

### How every plate looks: `style`

This is the new part. The native drawer used to draw one fixed box. A server that wanted its own design had to draw plates in a web page, and that page trailed the body on every fast camera turn. Now the look is **data**. One call sets a theme for every plate the plugin draws:

```lua
if Open77.nameplates.style then           -- absent on older clients: test first
    local ok, reason = Open77.nameplates.style({
        font = "rajdhani", uppercase = false,
        accent = "#FCEE0A", background = "#14120ACC",
        shape = "rounded", corner = 4, accentSide = "bottom",
        voice = "speaker", tip = "dot",
    })
    if not ok then print("nameplate style refused: " .. tostring(reason)) end
end
```

If you know CSS, you already know this table. It has a key for:

- the font, size, letter spacing and case;
- the chip's shape (`chamfer`, `rounded`, `pill`, `square` or `none`), padding, fill and border;
- the accent bar and which side carries it;
- the voice indicator (`bars` that follow the voice level, or a `speaker`), and colours for silent and talking;
- the pin down to the head and its tip;
- how plates shrink and fade with distance.

About forty keys in all, each with a default and a range, all listed in the [theme table](/docs/resource-exports#theme).

Light RP shows how far this goes. Its plates used to be an HTML page with its own CSS. It moved to the native drawer by translating that CSS rule by rule into the theme: `.pm__pin: 9px hairline` became `pin = 9`, and the tip's square turned 45° became `tip = "diamond"`. The look is the same, and now plates are drawn in the same frame as the body, with no page and no per-frame Lua. The code is in [`op77_playermarks`](https://github.com/Open2077/light-rp/tree/main/resources/standalone/op77_playermarks).

Two rules keep themes predictable:

- **All or nothing.** An unknown key refuses the whole call with `unknown_style_key:<key>`, and a bad value with `invalid_style_value:<key>`, so a typo shows in your log instead of half a theme. Numbers out of range are clamped, not refused. A resource that must run on several client versions can drop the key named in the reason and try again, which is exactly what Light RP does.
- **Last one wins, politely.** The most recent resource to call `style` decides the look. When it stops, the previous resource's style comes back, and `resetStyle()` hands it back without stopping.

### No plate through walls

A nameplate that shows through a wall is a wallhack. So every plate is now **line-of-sight tested** natively. The test goes from the camera to the player's head, then to their chest, against walls, floors, closed doors and terrain. Cars and other people do not hide a plate.

Glass is handled by name. The test may cross up to two see-through surfaces, recognised by the game's own physics materials: clear glass, car windows, plexiglass and wire mesh. Frosted and display glass still hide a plate, and so does glass backed by concrete. The sight point follows the stance: 1.60 m standing, 1.00 m crouched, so a player crouched behind a planter stays hidden.

The verdict is smoothed so a railing cannot make a plate blink. When a player steps behind a wall, their plate fades out where they were last seen, instead of following them behind it.

Two switches exist, for good reasons:

- `style({ occlusion = false })` turns the test off for a server;
- `set(id, { throughWalls = true })` exempts one player.

Use the second for squadmates and objectives, never as a default.

### Going fully custom

If a theme is not enough, you can still draw plates yourself in a page. `Open77.nameplates.stream(page)` pushes a `nameplates:update` event every frame. Each entry in the list has the screen position, label, colours, voice level, bar and the fade `alpha`. It is the same filtered list the native drawer uses, so a page cannot show what the native plate hides. Prefer the native drawer when you can: it is the one that never lags. The [world drawing guide](/docs/world-drawing#nameplates) covers the three delivery paths.

**What is available when:** `set`, `remove`, `stream`, `snapshot`, the policies and `setFriendlies` work on today's servers. The `style` theme and the line-of-sight test arrive with the next OPEN//77 release. Test for `Open77.nameplates.style` before calling it.

## Where to go next

- [Vehicle customization natives](/docs/vehicle-customization-natives): every function, its refusals and its permission.
- [Worked examples](/docs/vehicle-customization-examples): a tuning shop, a stage bench, a garage that keeps tuned cars, a client menu that greys what it cannot draw.
- [Content packs](/docs/vehicle-customization-packs) and [model coverage](/docs/vehicle-customization-models): how packs reach players, and how to cover more cars.
- [Persistence and multiplayer](/docs/vehicle-customization-persistence), and [FiveM equivalents](/docs/vehicle-customization-fivem) if you are porting a tuning menu.
- [Light RP's packs](https://github.com/Open2077/light-rp/tree/main/resources/assets/models) and the [vehicle kit pipeline](https://github.com/Open2077/open77-resources/tree/next/tools/vehicle-kit).
- [Nameplates exports and theme keys](/docs/resource-exports#open77_nameplates), and [Drawing in the world](/docs/world-drawing#nameplates).

Built something with it? Show us on [Discord](https://discord.open2077.net). We would love to see your server's cars.
