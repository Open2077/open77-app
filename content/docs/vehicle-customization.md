# Vehicle customization

Tune a networked car from a server resource: paint, liveries, neon and its animation, light
colours, rims and body parts, plate text, window tint, performance stages, engine sounds and
stickers. The server is authoritative for all of them. A resource calls a server native, and
every client that streams the car draws the result, late joiners included.

**Availability.** Paint, the lights hue and factory trims (`setAppearance`) are already in the
public build; see [Vehicle paint](vehicle-paint.md). Every other native on this page ships with
the **next Open77 release** and is not in the current public build. The drawing side (neon
lights, the plate script, the tint switch, the sticker script, the headlight colour) ships in the
Open77 client of that same release, so players need it too: an older client shows white
headlights whatever the hue. Test for a native before calling it, for example
`if Open77.vehicles.setNeon then`, so a resource still loads on an older server, and grey the
option in your menu otherwise.

## Categories

| Category | What players see | Server natives | Content needed |
|---|---|---|---|
| Paint | Two body colours, any RGB | `setPaint`, `getPaint`, `resetPaint` | None |
| Lights colour | One hue on the headlights, lamp glow and beam | `setLightsHue`, `clearLightsHue`, `setHeadlightColor` | None |
| Factory trim | Another appearance variant of the same model | `setAppearance` | None |
| Factory livery | The model's own TwinTone two-tone schemes | `listPaintProfiles`, `setPaintProfile` | None |
| Custom livery | A pack's patterned colour template | `registerPaintProfiles`, then `setPaintProfile` | Archive + TweakXL records |
| Neon | Coloured light under the car | `setNeon`, `clearNeon` | None |
| Neon animation | Pulse, breathe, strobe, chase, rainbow, speed or brake | `setNeonAnimation`, `getNeonAnimation` | None |
| Lamp colours | Brake, reverse, blinker and interior lamps | `setLightColors`, `getLightColors` | None |
| Rims | A rim model on every wheel | `registerParts` (kind `rim`), `setWheels` | Prop models |
| Body parts | Wings, lips, skirts, roof parts and other props | `registerParts` (kind `part`), `setParts` | Prop models |
| Factory components | Hide or show stock components | `registerParts` (kind `toggle`), `setParts` | None |
| Plate text | Your text on the car's plate | `setPlate` | Plate pack (ArchiveXL) |
| Window tint | Three levels on side and rear glass | `setWindowTint`, `getWindowTint` | Tint pack (ArchiveXL) |
| Performance stage | The car rebuilt in place on a faster record | `respawnAs` | TweakXL records |
| Engine sound | Another engine note | `registerEngineSounds`, `listEngineSounds`, `setEngineSound`, `getEngineSound` | TweakXL records |
| Stickers | Decals on the body | `registerStickers`, `listStickers`, `setStickers`, `getStickers`, `getDecalBudget` | Archive + TweakXL records |

Every category reaches current viewers, late joiners and a car that streams back in. Hiding or
showing factory components (`toggle` parts) is **experimental**: it has been checked on a single
client only. A trim change has not been checked across a server restart.

The Bandit and the Apollo have no tintable lights, and the two motorcycles (Apollo, Kusanagi) have
no glass to tint.

## Permissions

| Call | Needs |
|---|---|
| A change of trim, livery, neon, neon animation, light colours, parts, rims, plate, tint or stickers | `world.vehicles` and `world.vehicles.appearance` |
| The same value again (a restatement) | `world.vehicles` only |
| `setPaint`, `setLightsHue`, `setHeadlightColor`, `respawnAs`, `setEngineSound`, reads | `world.vehicles` |
| `registerParts`, `registerPaintProfiles`, `registerEngineSounds`, `registerStickers` | nothing |
| `listEngineSounds`, `listStickers` given a record name instead of a vehicle id | nothing |
| Client `customizationAvailable`, client `getVisual` | `vehicles.read` |

A restatement is free, so `setProperties(id, getProperties(id))` always passes with
`world.vehicles` alone. A pack resource that only registers parts or liveries needs no
permission, and so cannot repaint anybody's car.

```lua
-- open77.lua of a tuning shop
permissions { "world.vehicles", "world.vehicles.appearance" }
```

In the tables below, **look change** means `world.vehicles` and `world.vehicles.appearance` for
a change, `world.vehicles` alone for a restatement.

## Server natives

All natives are server-side on `Open77.vehicles`. `id` is a canonical vehicle id. Unless a row
says otherwise, a setter answers `true`, or `false, reason`. Colours accept `"#RRGGBB"`,
`{ r = 0, g = 216, b = 255 }` or `{ 0, 216, 255 }`, as for [paint](vehicle-paint.md#color-formats).

### Paint, lights and trim

| Native | Signature | Result | Permission |
|---|---|---|---|
| `setPaint` | `(id, paint)` | Primary and secondary RGB. A later paint clears a livery. | `world.vehicles` |
| `getPaint` | `(id)` | `{ applied, primary, secondary }`, or `nil` | `world.vehicles` |
| `resetPaint` | `(id)` | The record's own paint | `world.vehicles` |
| `setLightsHue` | `(id, hue?)` | Hue `0..1` on the headlights; `nil` restores the record's colour | `world.vehicles` |
| `setHeadlightColor` | `(id, color?)` | The same hue from a colour; only the hue is kept. Alias: `setHeadlightColour` | `world.vehicles` |
| `clearLightsHue` | `(id)` | Back to the record's colour | `world.vehicles` |
| `getLightsHue` | `(id)` | `0..1`, or `nil` for the record's colour. Alias: `getHeadlightHue` | `world.vehicles` |
| `setAppearance` | `(id, name?)` | Swaps the appearance variant; `nil` is the record's default | look change |
| `getAppearance` | `(id)` | The variant name, or `""` | `world.vehicles` |

The lights hue is **one hue**, not a colour: `#800000` and `#FF0000` light the car the same way,
and a grey has no hue. Clients show it on the headlights at full saturation and brightness.
Brake, reverse, blinker and interior lamps are [lamp colours](#neon-and-lamp-colours).

### Liveries

| Native | Signature | Result | Permission |
|---|---|---|---|
| `listPaintProfiles` | `(recordOrId)` | `{ { id, label?, main, sec, appearances, hasPattern, resource? }, ... }`: the model's factory templates first, then those running resources registered | `world.vehicles` |
| `setPaintProfile` | `(id, profileId?)` | Applies one template; `nil` goes back to generic paint. `invalid_profile` for an id the model does not list | look change |
| `registerPaintProfiles` | `(catalogue)` | Declares the templates this resource's TweakXL pack adds | nothing |

```lua
local profiles = Open77.vehicles.listPaintProfiles(vehicleId) or {}
if profiles[1] then
    local ok, reason = Open77.vehicles.setPaintProfile(vehicleId, profiles[1].id)
    if not ok then print("livery refused: " .. reason) end
end
Open77.vehicles.setPaintProfile(vehicleId, nil)            -- back to generic paint
```

A pack declares its records once at start:

```lua
local ok, reason = Open77.vehicles.registerPaintProfiles({
    ["Vehicle.v_sport2_quadra_type66"] = {
        { id = "Vehicle.o77_type66_stripe", label = "Racing stripe", main = "#d11f2a", sec = "#f2f2f2", pattern = true },
    },
})
if not ok then print("liveries refused: " .. reason) end
```

| Field | Rule |
|---|---|
| key | The model's vehicle record. A stage record (`_o77sN`) takes its base record's rows. |
| `id` | The colour template record the pack adds: `Vehicle.o77_` then letters, digits and `_`, at most 128 characters. It belongs to the first running resource that registers it (`profile_taken:<id>` for the next). |
| `label` | Optional, 1 to 64 characters. |
| `main`, `sec` | Optional swatch colours. |
| `pattern` | Optional boolean, listed as `hasPattern`. A livery is `true`. |
| `match` | Optional appearance names the template suits, listed as `appearances`. |
| `decals` | Optional, 0 to 12: the template's `customDecals`, counted against the [decal budget](#limits). |

Limits: 64 rows per record, 256 records and 1,024 rows per resource. One call carries at most
4,096 Lua values; a large catalogue registers in several calls, which merge. A template must
carry **at most 12 decals**: the server cannot read a pack's YAML, so this cap is the pack's
responsibility. Generic paint (`setPaint`, `resetPaint`) replaces a livery.

### Neon and lamp colours

| Native | Signature | Result | Permission |
|---|---|---|---|
| `setNeon` | `(id, { enabled, color, intensity?, radius?, layout? })` | Intensity 0 to 5000 (default 600), radius 0.5 to 8 m (default 3), `layout` is `"auto"` | look change |
| `clearNeon` | `(id)` | No neon at all | look change |
| `setNeonAnimation` | `(id, { mode, periodMs?, color2? } \| nil)` | `nil` is a steady neon. `invalid_neon_animation[:mode\|:periodMs\|:color2]`, `emergency_look:neonAnimation` | look change |
| `getNeonAnimation` | `(id)` | `{ mode, periodMs, color2? }`, or `nil` for a steady neon | `world.vehicles` |
| `setLightColors` | `(id, { brake?, reverse?, blinkers?, interior? } \| nil)` | The table is the whole set; `nil` or `{}` gives factory lamps back. `invalid_light_colors[:<group>]`, `emergency_look:blinkers`, `emergency_look:brake` | look change |
| `getLightColors` | `(id)` | `{ brake?, reverse?, blinkers?, interior? }`, or `nil` for factory lamps | `world.vehicles` |

```lua
Open77.vehicles.setNeon(vehicleId, { enabled = true, color = "#00e5ff", intensity = 900, radius = 3 })
Open77.vehicles.setNeon(vehicleId, { enabled = false })   -- off, colour kept
Open77.vehicles.clearNeon(vehicleId)                       -- no neon at all

Open77.vehicles.setNeon(vehicleId, { color = "#00e5ff" })
Open77.vehicles.setNeonAnimation(vehicleId, { mode = "chase", periodMs = 800, color2 = "#ff2bd6" })

Open77.vehicles.setLightColors(vehicleId, { brake = "#ff3300", interior = { 120, 0, 255 } })
```

- **Where the neon goes.** Each client hangs four point lights under the door sills, 15 cm above
  the ground; a motorcycle gets one under its centre. Intensity and radius apply **per light**, so
  a car shows four times the intensity you set. The lights cast no shadows, so they also light a
  character standing on the car, or the driver, a little from below.
- **Animation modes.** `pulse`, `breathe`, `strobe`, `chase`, `rainbow`, `speed` and `brake`.
  `periodMs` is an integer from 250 to 10,000, and at least 333 for `strobe` (3 Hz at most);
  defaults are 4,000 for `breathe`, 500 for `strobe`, 1,000 for `chase`, 6,000 for `rainbow` and
  1,200 for the others. `color2` is the second colour
  of pulse, breathe, strobe and chase, the colour `speed` blends to and the colour `brake` flares
  to; it is refused on `rainbow`. `speed` and `brake` follow the car's speed and braking. Every
  client runs the animation on the server clock, so all players see the same moment. The
  animation moves the neon `setNeon` set: without a neon nothing shows.
- **Emergency looks are refused.** A red or blue strobe, a red/blue pair in pulse, breathe,
  strobe or chase (also when a later `setNeon` completes the pair), red or blue blinkers, and blue
  brake lights. Red is a hue within 20° of
  pure red, blue a hue of 200 to 255°, both from a saturation of 0.5 and a value of 0.3.
- **Lamp groups.** Headlights are not a group: they follow the [lights hue](#paint-lights-and-trim).

### Rims and body parts

| Native | Signature | Result | Permission |
|---|---|---|---|
| `registerParts` | `(catalogue)` | Declares parts and how they fit each record. Ids are namespaced by resource (`my_kit:wing_gt`) | nothing |
| `listParts` | `(recordOrId)` | The registered parts that fit this record | `world.vehicles` |
| `setParts` | `(id, { [partId] = variant \| true \| false })` | A variant name, `true` for a toggle, `false` to remove. `unknown_part`, `part_not_for_model` | look change |
| `setWheels` | `(id, { rim, variant? } \| nil)` | One rim set per car on every wheel slot; `nil` gives the stock rims back | look change |

```lua
-- At start, in the server script of the resource that owns the rim models
Open77.vehicles.registerParts({
    rim_vk1 = {
        kind = "rim", label = "VK-1",
        variants = { chrome = "asset:my_rims/rim_vk1_chrome", black = "asset:my_rims/rim_vk1_black" },
        fit = {
            ["Vehicle.v_standard2_archer_hella_player"] = {
                offset = { -0.1001, 0, 0 }, scale = { 0.9611, 0.9611, 0.9611 },
                hide = { "wheel_01_fl_a", "wheel_01_fr_a", "wheel_01_bl_a", "wheel_01_br_a" },
                wheels = {
                    { slot = "wheel_front_left" }, { slot = "wheel_front_right" },
                    { slot = "wheel_back_left", offset = { -0.143, 0, 0 } },
                    { slot = "wheel_back_right", offset = { -0.143, 0, 0 } },
                },
            },
        },
    },
})

-- On purchase
local ok, reason = Open77.vehicles.setWheels(vehicleId, { rim = "rim_vk1", variant = "black" })
Open77.vehicles.setWheels(vehicleId, nil)                  -- stock rims
```

```lua
Open77.vehicles.registerParts({
    wing_gt = {
        kind = "part", slot = "Base", label = "GT wing",
        variants = { carbon = "asset:my_body/wing_gt_carbon" },
        fit = { ["Vehicle.v_standard2_archer_hella_player"] = { offset = { 0, -2.384, 0.211 }, scale = { 1.1, 1, 1 } } },
    },
    no_antenna = {
        kind = "toggle",
        fit = { ["Vehicle.v_standard2_archer_hella_player"] = { hide = { "attachment_antenna_1_n_roof_radar_cables" } } },
    },
})

local ok, reason = Open77.vehicles.setParts(vehicleId, { wing_gt = "carbon", no_antenna = true })
Open77.vehicles.setParts(vehicleId, { wing_gt = false })   -- take the wing off
```

| Part field | Rule |
|---|---|
| `kind` | `"rim"` (mounted on every wheel slot), `"part"` (one prop on `slot`) or `"toggle"` (only `hide` / `show`). Required. |
| `label` | What a menu shows, at most 64 characters. |
| `slot` | Kind `part`: the vehicle slot it is fitted on (`Base` for a body kit). |
| `carrier` | Kind `part`, optional: the slot of the opening panel the part rides on (`trunk_a`, `hood_a`), so a wing on a trunk lid rises with it. |
| `modType` | Optional FiveM mod type 0 to 49, for `SetVehicleMod`. |
| `variants` | `{ [variant] = "asset:<pack>/<model>" }`, 1 to 32; none on a toggle. |
| `fit` | `{ [record] = fit }`, 1 to 512 records. A part fits only the records listed; a stage record without its own row takes its base record's. |

| `fit[record]` field | Rule |
|---|---|
| `offset`, `rotation`, `scale` | `{ x, y, z }`, relative to the slot. Offset ±10 m, rotation ±360°, scale 0.01 to 10 per axis. |
| `wheels` | Rims only: 1 to 8 `{ slot, offset?, rotation?, scale? }` entries replacing the default four (car) or two (motorcycle) wheel slots. |
| `hide`, `show` | The stock components the part hides or shows on that record. `hide` names the stock rim components, never the tyre. |
| `appearances` | Up to 32 per-trim overrides of `offset`, `rotation`, `scale`, `wheels`, `hide` and `show`, for a trim whose stock rims have other names or depth. |
| `carrier` | The carrier on this record, or `false` for none. |

A catalogue error refuses the whole call with `invalid_part:<id>.<field>`. One call crosses at
most 4,096 Lua values, so a large kit registers one part per call. The server picks the fit from
the car's current appearance, and re-resolves the parts in the same tick when the appearance
changes.

### Plate and window tint

| Native | Signature | Result | Permission |
|---|---|---|---|
| `setPlate` | `(id, text \| nil)` | Upper-cased; `A-Z`, `0-9`, space and `-`, 1 to 10 characters, else `invalid_plate`. `nil` is the model's own plate | look change |
| `setWindowTint` | `(id, level?)` | `1` light smoke, `2` dark smoke, `3` limo; `0` or `nil` is factory glass. `invalid_tint` otherwise | look change |
| `getWindowTint` | `(id)` | `0` for factory glass, else `1` to `3`; `nil, reason` for an unknown car | `world.vehicles` |

```lua
local ok, reason = Open77.vehicles.setPlate(vehicleId, "NC 2077")
Open77.vehicles.setPlate(vehicleId, nil)                   -- the model's own plate

local ok, reason = Open77.vehicles.setWindowTint(vehicleId, 2)   -- 1 light, 2 dark, 3 limo
Open77.vehicles.setWindowTint(vehicleId, nil)                    -- factory glass
```

Plate format, uniqueness and banned words are your resource's job. A model the plate pack does
not cover keeps its factory plate. Neither native checks the model: a level or a plate is stored
on any car and survives `respawnAs`. The windshield is never tinted.

| Model | Tinted | Stays factory |
|---|---|---|
| Maimai, Hella, Colby, Quartz, Hozuki, Supron, Bandit, Merrimac, Semimaru | every side and rear window | the windshield |
| Galena | rear window and the four side windows | the glass moulded into the body |
| Thrax | rear window and the four side windows | the glass moulded into the body |
| Cortes | rear window and the side windows | the glass inside the rear doors |
| Columbus | the two front side windows | the rear glass (part of the trunk lid) and the mirrors |
| Apollo, Kusanagi | — | motorcycles: no glass |

Galena's factory and GT looks are already tinted, so its level 1 is lighter than factory, and
Semimaru's level 1 equals its factory side glass. Past the distance proxy (about 50 m at
`LODPreset` Low, 80 m above) the car shows factory glass, and the tint comes back with the full
body. A client whose game has no tinted glass for the car lists `tint:<record>:not_covered` in
`customizationAvailable(id).skipped`.

### Stages and engine sound

| Native | Signature | Result | Permission |
|---|---|---|---|
| `respawnAs` | `(id, record)` | The car's id, or `nil, reason`. Rebuilds the car in place on another record of the same model | `world.vehicles` |
| `registerEngineSounds` | `(catalogue)` | `{ { id, label, class, set, index, models, maxStage? }, ... }`: the sound records this resource's TweakXL pack adds | nothing |
| `listEngineSounds` | `(recordOrId)` | `{ { id, label, class }, ... }`: the sounds of the car's class (`car`, `bike`) the pack made for this model at its stage | nothing for a record name, `world.vehicles` for an id |
| `setEngineSound` | `(id, soundId \| nil)` | Rebuilds the empty car on the sound record; `nil` is the stage's factory sound. `unknown_engine_sound`, `engine_sound_not_for_class`, `engine_sound_not_for_model`, `vehicle_occupied` | `world.vehicles` |
| `getEngineSound` | `(id)` | The sound id the car's record carries, or `nil` | `world.vehicles` |

```lua
local id, reason = Open77.vehicles.respawnAs(vehicleId, "Vehicle.v_standard2_archer_hella_player_o77s1")
if not id then print("stage refused: " .. reason) end

for _, s in ipairs(Open77.vehicles.listEngineSounds(vehicleId) or {}) do print(s.id, s.label) end
Open77.vehicles.setEngineSound(vehicleId, "s01")
```

`respawnAs` keeps paint, appearance, lights hue, health, the whole customization and the
resource state bag keys. The car must be empty (`vehicle_occupied`), and the record must exist on
every client, which is what the stage pack adds: stage records are `Vehicle.<record>_o77s1` to
`_o77s3`. An engine sound is a record too (`Vehicle.<record>_o77a<k>`, or
`Vehicle.<record>_o77s<n>a<k>` on a stage), so a sound survives stage changes, and a stage change
keeps the sound.

### Stickers

| Native | Signature | Result | Permission |
|---|---|---|---|
| `registerStickers` | `(catalogue)` | `{ { id, label, group, records \| parts, model?, appearances?, decals?, record? }, ... }`, records `Vehicle.o77_*` | nothing |
| `listStickers` | `(recordOrId)` | `{ { id, label, group, decals }, ... }` that fit the record (and, given a vehicle id, its appearance) | nothing for a record name, `world.vehicles` for an id |
| `setStickers` | `(id, { ids } \| nil)` | The whole list in order, at most 12 ids, each once; `nil` or `{}` is none. `invalid_stickers`, `unknown_sticker`, `sticker_not_for_model`, `decal_budget_exceeded` | look change |
| `getStickers` | `(id)` | The sticker ids in the order set, or `nil` | `world.vehicles` |
| `getDecalBudget` | `(id)` | `used, 12`: the livery's decals plus the stickers' | `world.vehicles` |

```lua
local used, max = Open77.vehicles.getDecalBudget(vehicleId)
local ok, reason = Open77.vehicles.setStickers(vehicleId, { "st.thrax.valentinos_01" })  -- a Thrax sticker of lightrp_vehicle_stickers
```

Police, NCPD, sheriff, border patrol, Arasaka and Delamain sticker sets are refused at
registration (`sticker_excluded:<id>`). A car shows at most 12 decals, its livery's included: the
server refuses a list that does not fit, and a livery that would take a car with stickers past 12
is refused the same way.

### Reading the look

| Side | Call | Answers |
|---|---|---|
| Server | `getVisual(id)` | `{ rev, profile?, neon?, parts, wheels?, plate?, tint?, neonAnimation?, lightColors?, engineSound?, stickers? }`. `parts` lists every chosen part, the rim included. |
| Client | `Open77.vehicles.customizationAvailable(id)` | What this game can draw: `{ record, paint, rims, lights, twintone, profiles, appearance, streamed, destroyed, neonLit, rev, appliedRev, skipped }` |
| Client | `Open77.vehicles.getVisual(id)` | The raw replicated value |
| Client | `Open77.data.vehicle(record).customization` | The record's flags: `{ paint, rims, lights, twintone, twintoneModel, profiles, appearance }` |

`skipped` lists what this client did not draw, as `<category>:<item>:<reason>`, for example
`attach:rims.fl:model_not_registered`. Read it once `appliedRev` has reached `rev`. A shop menu
uses it to grey a category or warn after a preview.

```lua
-- client script; the resource needs vehicles.read
local state = Open77.vehicles.customizationAvailable(vehicleId)
if state and state.appliedRev >= state.rev then
    for _, entry in ipairs(state.skipped) do
        print("not drawn on this client: " .. entry)
    end
end
```

On the server, `onVehicleVisualChanged(id, rev, fields)` lists what moved among `profile`,
`neon`, `parts`, `wheels`, `plate`, `tint`, `neonAnimation`, `lightColors` and `stickers`. An
engine sound is a record change and is not reported there. On the client,
`open77:vehicleVisualChanged(id, rev)` fires when the replicated value changes.

```lua
AddEventHandler("onVehicleVisualChanged", function(id, rev, fields)
    print(("vehicle %d visual rev %d: %s"):format(id, rev, table.concat(fields, ", ")))
end)
```

## FiveM equivalents

| FiveM | Open77 | Alias |
|---|---|---|
| `SetVehicleCustomPrimaryColour`, `SetVehicleCustomSecondaryColour` | `setPaint` | no |
| `SetVehicleXenonLightsCustomColor` | `setLightsHue`, `setHeadlightColor` | no |
| `SetVehicleLivery`, `GetVehicleLivery` | `setPaintProfile` | yes: a 0-based index into `listPaintProfiles`, `-1` for generic paint |
| `SetVehicleLivery`, as a factory trim | `setAppearance` | no |
| `SetVehicleNeonLightEnabled`, `SetVehicleNeonLightsColour` | `setNeon` | yes |
| `SetVehicleMod` 23 / 24 | `setWheels` | yes; `SetVehicleWheelType` is accepted and has no effect |
| `SetVehicleMod`, `GetVehicleMod`, other mod types | `setParts`, among the parts that declare that `modType` | yes; `-1` is stock, one choice per mod type |
| `SetVehicleExtra` | `registerParts` kind `toggle`, `setParts` | no |
| `SetVehicleNumberPlateText` | `setPlate` | no |
| `SetVehicleWindowTint`, `GetVehicleWindowTint` | `setWindowTint`, `getWindowTint` | yes, index mapped below |
| `SetVehicleMod` 11 to 16 | `respawnAs` onto a stage record | no |
| none | `setNeonAnimation`, `setLightColors`, `setEngineSound`, `setStickers` | — |

The aliases are global functions on the server, over the same natives and permissions.
`SetVehicleNeonLightEnabled(vehicle, index, toggle)` switches all the neon whatever the index:
Cyberpunk has one light set per car, not four strips. Switching on a car without neon lights it
magenta, FiveM's default.

| FiveM tint index | Meaning | Open77 level | `GetVehicleWindowTint` answers |
|---|---|---|---|
| `-1`, `0`, `4` | none, NONE, STOCK | factory glass | `-1` |
| `3` | LIGHTSMOKE | `1` | `3` |
| `2` | DARKSMOKE | `2` | `2` |
| `1`, `5` | PURE_BLACK, LIMO | `3` | `5` |
| `6` | GREEN | refused | — |

In a ported property table, `setProperties` reads the FiveM keys `neonEnabled`, `neonColor`,
`livery` and `windowTint`. It refuses `wheels`, `wheelType`, `modKit`, `mods` and `plateText` by
name, and the reason names the Open77 native to use instead. What Cyberpunk has no counterpart
for at all is listed in
[What Cyberpunk does not have](vehicles.md#what-cyberpunk-does-not-have).

## Packs

Rims, body parts, custom liveries, the plate, the tint, stages, engine sounds and stickers need
content in every player's game. It reaches them as a `preload_mod` ZIP declared by a resource;
the full rules are in [Declaring mods on a server](mods.md#declaring-mods-on-a-server).

- The ZIP holds game-root relative paths, at most 8 per resource, each 1 byte to 64 MiB.
- `requiredMods.enabled` must be `true`.
- The launcher mounts the ZIP before the game starts, so a new pack revision needs a server
  restart and a fresh launcher boot, and players must reconnect.
- A player whose game mounted an older archive sees the car stock: the server logs
  `prop_archive_missing_restart_required` and the client skips `model_not_registered`.

| Pack | What the ZIP holds | Registered by | Loader |
|---|---|---|---|
| Rims and body parts | `archive/pc/mod/<name>.archive` of prop models | client `Open77.props.registerModel` (permission `props.register`), then server `registerParts` | none |
| Custom liveries | an archive plus `r6/tweaks/.../*.yaml` colour template records | server `registerPaintProfiles` | TweakXL 1.12.0 or later |
| Performance stages | TweakXL records `Vehicle.<record>_o77s1` to `_o77s3` | none: `respawnAs` takes the record | TweakXL 1.12.0 or later |
| Engine sounds | TweakXL records `Vehicle.<record>_o77a<k>` and `_o77s<n>a<k>` | server `registerEngineSounds` | TweakXL 1.12.0 or later |
| Stickers | an archive of decal entities plus TweakXL records `Vehicle.o77_st_*` and `Vehicle.o77_sticker_*` | server `registerStickers` | TweakXL |
| Plate | an ArchiveXL `.app` patch adding a screen and a text widget | none | ArchiveXL 1.28.0 or later |
| Window tint | an ArchiveXL mesh patch adding `open77_tint<level>__<source>` appearances | none | ArchiveXL 1.28.0 or later |

The bundled TweakXL loader resource is 1.12.0. TweakXL and ArchiveXL are executable content, so
the world must run [unsecured](server-mods.md#unsecured-mode). Paint, the lights hue, factory
trims, factory liveries, neon, the neon animation and lamp colours need no pack.

**Registration rules.** `registerParts`, `registerPaintProfiles`, `registerEngineSounds` and
`registerStickers` are called by the pack's server script at start. Ids belong to the first
running resource that registers them and are dropped when it stops. A client resource registers at
most 128 prop models, and 1,024 across all resources; a part has at most 32 variants.

**A stopped pack leaves the choice dormant.** A part, livery or sticker whose pack resource stops,
or that the car's current record does not list, stays chosen on the server and is not drawn. It
shows again when the pack runs.

## Limits

| Limit | Value | Past it |
|---|---|---|
| Decals per car | 12 `customDecals`, livery and stickers together | 13 or more crash the game that spawns the car, under two seconds after it appears. The server refuses stickers past the budget (`decal_budget_exceeded`); a pack livery template is the pack's responsibility. Twelve on each of twelve nearby cars is fine. |
| Lit neon | 12 cars per client, nearest first, within 60 m; four lights per car | further cars show no neon |
| Plate text | the engine writes it only on a car born within about 10 m of the camera | the client rebuilds such a car once when the camera is within about 9 m and the car is empty and stopped; it vanishes for about 0.4 s. A moving or occupied car keeps a blank plate until then. |
| Lights hue | one hue, `0..1`, shown on the headlights | brightness and saturation are not kept; a grey reads as red |
| Sticker changes | only on a car within 40 m of the client's camera | a distant car keeps what it shows; an approaching car shows its stickers from about 40 m |
| Customization value | 4 KiB, 256 JSON values, 16 attachments (about 15 in practice) | the change is refused (`visual_too_large`, `attach_limit`) |
| Paint at distance | painted up to the appearance proxy: about 50 m at `LODPreset` Low, 80 m above | past it the car shows its factory look |
| Network event shape | 8 levels, 1,024 values per event, 64 KiB per string | the client drops the event and logs only `dropped malformed network event payload` |

Light colours and stickers wait until the paint has settled after a stream-in: about 2 to 3 s on a
client at 30 frames per second, longer on a client running at a few frames per second. An
appearance change, or a livery template change, on a painted car rebuilds it once at the same
place when it is empty and stopped.

**Send shop catalogues as text.** A category tree sent as a nested Lua table in one event can pass
the 8-level cap and be dropped silently. Keep event tables shallow, and send large catalogues as a
JSON string decoded on the client.

**Cost.** Twenty customized cars parked together (120 attached parts, 12 lit neons) cost one
client about 10 % of its frame rate, with no leak. Most of it is the per-frame update of attached
parts.

## Persistence

Livery, neon, parts, rims, plate, tint, neon animation, light colours and stickers live in one
value per car, the vehicle state bag key `open77.visual`. Only the server natives write it; a
resource that tries gets `reserved_state_key`. Paint, lights hue and trim live in the car's own
state. Clients rebuild the look themselves after a stream-in, an appearance change and a rebuild.

Open77 does not write vehicles to disk. To keep a tuned car across a server restart, store
`getProperties(id)` and apply it to the new car with `setProperties`. The table carries `visual`
and the round trip is exact, plate and tint included. When the stored `record` is a stage or
engine sound record of the same model, `setProperties` respawns the car onto it first, so a garage
that spawns the base model gets the tuned car back; the car must be empty (`vehicle_occupied`),
and another model is `record_mismatch`. See
[Vehicle properties](vehicles.md#vehicle-properties-and-what-cyberpunk-does-not-have).

## Worked example: a tuning shop

The shop resource declares both permissions, applies the purchase, and stores the car when it is
parked.

```lua
-- open77.lua of a tuning shop
permissions { "world.vehicles", "world.vehicles.appearance" }
```

```lua
-- On purchase
local ok, reason = Open77.vehicles.setWheels(vehicleId, { rim = "rim_vk1", variant = "black" })
Open77.vehicles.setNeon(vehicleId, { enabled = true, color = "#00e5ff", intensity = 900, radius = 3 })
local ok, reason = Open77.vehicles.setPlate(vehicleId, "NC 2077")
```

```lua
-- Park: store everything the car wears
local props = Open77.vehicles.getProperties(vehicleId)
Open77.kvp.set("garage:" .. carKey, json.encode(props))

-- Later, after a restart: bring it back
local stored = json.decode(Open77.kvp.get("garage:" .. carKey))
local id = Open77.vehicles.create({ record = stored.record, position = spot })
local ok, reason = Open77.vehicles.setProperties(id, stored)
if not ok then print("restore failed: " .. reason) end
```

The rim id comes from the pack's `registerParts` call shown in
[Rims and body parts](#rims-and-body-parts).

## A full studio: Light RP's Auto Studio

Light RP's Auto Studio is a complete shop built on these natives. Every category below has been
watched from a second client, and all of them except Trim came back after a server restart and a
late join. Players open the studio at a studio bay, or with **Customize vehicle** in a public
garage, with their own car parked, empty and stopped.

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

## See also

- [Network vehicles](vehicles.md): lifecycle, streaming, properties and the full vehicle API.
- [Vehicle paint](vehicle-paint.md): paint formats, events and the lights hue.
- [Mods](mods.md): how packs reach players, and
  [Verifying that a mod loaded](mods.md#verifying-that-a-mod-loaded).
- [Mods your server requires](server-mods.md): `requiredMods` and unsecured mode.
