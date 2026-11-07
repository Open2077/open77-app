# Vehicle customization natives

Every vehicle customization native, by category. They are server natives on `Open77.vehicles`
unless a row says **client**. Each one also has an API card; the whole set is grouped under
[Vehicle customization](/docs/api?category=vehicle-customization) in the API reference.

Everything on this page except paint, the lights hue and `setAppearance` is **coming in the next
Open77 release** and is not in the current public build. Test for a native before calling it:

```lua
if not Open77.vehicles.setWheels then
    print("this server has no rims yet")
    return
end
```

## Conventions

- `id` is a canonical vehicle id, the one `Open77.vehicles.create` answers.
- A setter answers `true`, or `false, reason`. A list or read answers its value, or `nil, reason`.
  Check the reason: it names what was wrong.
- **Look change** in the tables means `world.vehicles` plus `world.vehicles.appearance` for a call
  that changes the look, `world.vehicles` alone for a restatement of the current value. A
  restatement changes nothing and answers `true`.
- Colours accept `"#rrggbb"` (exactly seven characters), `{ r = 0, g = 216, b = 255 }` or
  `{ 0, 216, 255 }`, as for [paint](vehicle-paint.md#color-formats).
- Every setter can also answer `vehicle_not_found`, `invalid_vehicle_id`, `vehicles_unavailable`
  and `permission_denied:world.vehicles`; the tables below list only the reasons specific to the
  native.
- A Lua table passed to a native crosses as JSON: at most 4,096 values, 16 levels deep, strings up
  to 16 KiB. A large catalogue registers in several calls, which merge.
- The look of a car is one value of at most 4 KiB, 256 JSON values and 16 attachments. Any visual
  setter can answer `visual_too_large`, and a setter that adds props (`setParts`, `setWheels`)
  `attach_limit`.

## Paint, lights hue and trim

These are in the current public build and are covered in [Vehicle paint](vehicle-paint.md).

| Native | Signature | Result | Permission |
|---|---|---|---|
| `setPaint` | `(id, paint)` | Primary and secondary RGB. A later paint clears a livery. | `world.vehicles` |
| `getPaint` | `(id)` | `{ applied, primary, secondary }`, or `nil` | `world.vehicles` |
| `resetPaint` | `(id)` | The record's own paint | `world.vehicles` |
| `setLightsHue` | `(id, hue?)` | Hue `0..1` on the headlights; `nil` restores the record's colour | `world.vehicles` |
| `setHeadlightColor` | `(id, color?)` | The same hue from a colour; only the hue is kept. Alias: `setHeadlightColour` | `world.vehicles` |
| `clearLightsHue` | `(id)` | Back to the record's colour | `world.vehicles` |
| `getLightsHue` | `(id)` | `0..1`, or `nil` for the record's colour. Alias: `getHeadlightHue` | `world.vehicles` |
| `setAppearance` | `(id, name?)` | Swaps the appearance variant; `nil` or `""` is the record's default | look change |
| `getAppearance` | `(id)` | The variant name, or `""` | `world.vehicles` |

The lights hue is **one hue**, not a colour: `#800000` and `#FF0000` light the car the same way,
and a grey has no hue. Brake, reverse, blinker and interior lamps are
[lamp colours](#lamp-colours).

## Liveries

| Native | Signature | Result | Permission |
|---|---|---|---|
| `listPaintProfiles` | `(recordOrId)` | `{ { id, label?, main?, sec?, appearances, hasPattern, resource? }, ... }`: the model's factory templates first, then those running resources registered, each with its `resource` | nothing for a record name, `world.vehicles` for an id |
| `setPaintProfile` | `(id, profileId?)` | Applies one template; `nil` goes back to generic paint | look change |
| `registerPaintProfiles` | `(catalogue)` | Declares the templates this resource's TweakXL pack adds | nothing |

`setPaintProfile` refusals: `invalid_profile` (an id the car's record does not list),
`decal_budget_exceeded` (the template's decals plus the car's stickers pass 12),
`visual_too_large`. A record without customization lists `{}`; a stage record
(`Vehicle.<base>_o77sN`) lists its base record's templates plus anything registered on the stage.

```lua
local profiles = Open77.vehicles.listPaintProfiles(vehicleId) or {}
if profiles[1] then
    local ok, reason = Open77.vehicles.setPaintProfile(vehicleId, profiles[1].id)
    if not ok then print("livery refused: " .. reason) end
end
Open77.vehicles.setPaintProfile(vehicleId, nil)            -- back to generic paint
```

A livery pack declares its records once at start:

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
| `decals` | Optional, 0 to 12: the template's `customDecals`, counted against the car's [decal budget](#stickers). |

Limits: 64 rows per record, 256 records and 1,024 rows per resource. Refusals:
`invalid_profile_catalogue`, `invalid_profile_record:<record>`,
`invalid_paint_profile:<id>.<field>`, `duplicate_paint_profile:<id>`, `profile_taken:<id>`,
`profile_limit`. A template must carry **at most 12 decals**: the server cannot read the pack's
YAML, so this cap is the pack's responsibility. Generic paint (`setPaint`, `resetPaint`)
replaces a livery.

## Neon

| Native | Signature | Result | Permission |
|---|---|---|---|
| `setNeon` | `(id, { enabled?, color?, intensity?, radius?, layout? })` | Turns on or changes the under-chassis lights | look change |
| `clearNeon` | `(id)` | No neon at all | look change |
| `setNeonAnimation` | `(id, { mode, periodMs?, color2? } \| nil)` | How the neon moves; `nil` is a steady neon | look change |
| `getNeonAnimation` | `(id)` | `{ mode, periodMs, color2? }`, or `nil` for a steady neon | `world.vehicles` |

`setNeon` fields: `color` is **required on a car without a neon**; `intensity` 0 to 5,000
(default 600); `radius` 0.5 to 8 m (default 3); `layout` is `"auto"`. Absent fields keep the
current neon's values, and `enabled = false` switches the lights off and keeps the colour.
Refusals: `invalid_neon`, `invalid_neon_color`, `invalid_neon_intensity`, `invalid_neon_radius`,
`invalid_neon_layout`, and `emergency_look:neonAnimation` when the new colour completes a red/blue
pair with the animation.

```lua
Open77.vehicles.setNeon(vehicleId, { enabled = true, color = "#00e5ff", intensity = 900, radius = 3 })
Open77.vehicles.setNeon(vehicleId, { enabled = false })   -- off, colour kept
Open77.vehicles.clearNeon(vehicleId)                       -- no neon at all

Open77.vehicles.setNeon(vehicleId, { color = "#00e5ff" })
Open77.vehicles.setNeonAnimation(vehicleId, { mode = "chase", periodMs = 800, color2 = "#ff2bd6" })
```

- **Where the neon goes.** Each client hangs four point lights under the door sills, 15 cm above
  the ground; a motorcycle gets one under its centre. Intensity and radius apply **per light**, so
  a car shows four times the intensity you set. The lights cast no shadows.
- **Animation modes.** `pulse`, `breathe`, `strobe`, `chase`, `rainbow`, `speed` and `brake`.
  `periodMs` is an integer from 250 to 10,000, and at least 333 for `strobe` (3 Hz at most);
  defaults are 4,000 for `breathe`, 500 for `strobe`, 1,000 for `chase`, 6,000 for `rainbow` and
  1,200 for the others. `color2` is the second colour of pulse, breathe, strobe and chase, the
  colour `speed` blends to and the colour `brake` flares to; it is refused on `rainbow`. `speed`
  and `brake` follow the car's speed and braking. Every client runs the animation on the server
  clock, so all players see the same moment. The animation moves the neon `setNeon` set: without a
  neon nothing shows.
- **Animation refusals.** `invalid_neon_animation`, `invalid_neon_animation:mode`,
  `invalid_neon_animation:periodMs`, `invalid_neon_animation:color2`,
  `emergency_look:neonAnimation`.

## Lamp colours

| Native | Signature | Result | Permission |
|---|---|---|---|
| `setLightColors` | `(id, { brake?, reverse?, blinkers?, interior? } \| nil)` | The table is the whole set: a group it does not name goes back to factory; `nil` or `{}` gives every group back | look change |
| `getLightColors` | `(id)` | `{ brake?, reverse?, blinkers?, interior? }`, or `nil` for factory lamps | `world.vehicles` |

```lua
Open77.vehicles.setLightColors(vehicleId, { brake = "#ff3300", interior = { 120, 0, 255 } })
```

Refusals: `invalid_light_colors`, `invalid_light_colors:<group>`, `emergency_look:blinkers` and
`emergency_look:brake`. Headlights are not a group: they follow the lights hue.

**Emergency looks are refused.** Red or blue blinkers, blue brake lights, a red or blue neon
strobe, and a red/blue neon pair in pulse, breathe, strobe or chase (also when a later `setNeon`
completes the pair). Red is a hue within 20° of pure red, blue a hue of 200 to 255°, both from a
saturation of 0.5 and a value of 0.3.

## Rims and body parts

| Native | Signature | Result | Permission |
|---|---|---|---|
| `registerParts` | `(catalogue)` | Declares this resource's parts and how they fit each record | nothing |
| `listParts` | `(recordOrId)` | `{ { id, kind, label?, slot?, modType?, variants = { [variant] = model } }, ... }` that fit the record, ids fully qualified | nothing for a record name, `world.vehicles` for an id |
| `setParts` | `(id, { [partId] = variant \| true \| false })` | Puts parts on or takes them off; parts not named stay as they are | look change |
| `setWheels` | `(id, { rim, variant? } \| nil)` | One rim on every wheel slot; `nil` or `{}` gives the stock rims back | look change |

**Part ids are namespaced.** `registerParts` stores `wing_gt` of resource `my_kit` as
`my_kit:wing_gt`. A **bare id** passed to `setParts` or `setWheels` names a part of the calling
resource; another resource (a shop selling a kit resource's rims) passes the **qualified id**,
which is the form `listParts` answers.

`setParts` values: a variant name, `true` for a part with a single variant or a toggle, `false`
to take the part off. A rim named in `setParts` replaces the car's current rim, and two rims in
one call answer `conflicting_parts`. Which body parts exclude each other (two front lips) is the
resource's to enforce. Refusals: `invalid_parts`, `unknown_part`, `part_not_for_model`,
`unknown_variant`, `variant_required` (the part has several variants and none was named),
`conflicting_parts`, `attach_limit`, `visual_too_large`.

`setWheels` refusals: `invalid_wheels`, `unknown_part`, `part_not_a_rim`, `part_not_for_model`,
`unknown_variant`, `variant_required`, `attach_limit`, `visual_too_large`.

```lua
-- In the server script of the resource that owns the rim models (resource "my_rims")
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

-- Same resource: the bare id names its own part
Open77.vehicles.setWheels(vehicleId, { rim = "rim_vk1", variant = "black" })
-- Any other resource: the qualified id, as listParts answers it
local ok, reason = Open77.vehicles.setWheels(vehicleId, { rim = "my_rims:rim_vk1", variant = "black" })
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
| key | The local id: letters, digits, `_`, `.` and `-`, 1 to 64 characters. |
| `kind` | `"rim"` (mounted on every wheel slot), `"part"` (one prop on a slot) or `"toggle"` (only `hide` / `show`). Required. |
| `label` | What a menu shows, at most 64 characters. |
| `slot` | Kind `part` only: the vehicle slot it is fitted on (`Base` for a body kit). Required here or on every fit. |
| `carrier` | Kind `part` only, optional: the slot of the opening panel the part rides on (`trunk_a`, `hood_a`), so a wing on a trunk lid rises with it. |
| `modType` | Optional FiveM mod type 0 to 49, for `SetVehicleMod`. |
| `variants` | `{ [variant] = "asset:<pack>/<model>" }`, 1 to 32; none on a toggle. |
| `fit` | `{ [record] = fit }`, 1 to 512 records. A part fits **only** the records listed (`part_not_for_model` otherwise); a stage record without its own row takes its base record's. |

| `fit[record]` field | Rule |
|---|---|
| `slot`, `carrier` | Kind `part`: override the entry's slot or carrier on this record; `carrier = false` means none. |
| `offset`, `rotation`, `scale` | `{ x, y, z }`, relative to the slot. Offset ±10 m, rotation ±360°, scale 0.01 to 10 per axis. |
| `wheels` | Rims only: 1 to 8 `{ slot, offset?, rotation?, scale? }` entries, unique slots, replacing the default four (car) or two (motorcycle) wheel slots. |
| `hide`, `show` | Up to 64 stock component names each that the part hides or shows on that record. A rim's `hide` names the stock rim components, never the tyre. |
| `appearances` | Up to 32 per-trim overrides of `offset`, `rotation`, `scale`, `wheels`, `hide` and `show` (never `slot` or `carrier`), for a trim whose stock components differ. |

Limits: 256 parts per resource. A catalogue error refuses the whole call with
`invalid_part:<id>.<field>`; other refusals are `invalid_part_catalogue` and `part_limit`. The
server picks the fit from the car's current appearance, and re-resolves the parts in the same tick
when the appearance changes. Every part is visual only: no collision, no physics, and the car
keeps its stock tyres and handling.

## Plate

| Native | Signature | Result | Permission |
|---|---|---|---|
| `setPlate` | `(id, text \| nil)` | Sets the plate text; `nil` or `""` is the model's own plate | look change |

The text is trimmed, then upper-cased: `A-Z`, `0-9`, space and `-` only, 1 to 10 characters, no
two spaces in a row. Anything else is `invalid_plate`. The same plate in another case is a
restatement. Format, uniqueness and banned words are your resource's job.

```lua
local ok, reason = Open77.vehicles.setPlate(vehicleId, "NC 2077")
if not ok then print("plate refused: " .. reason) end
Open77.vehicles.setPlate(vehicleId, nil)                   -- the model's own plate
```

The plate is stored on any car. It is drawn on the models the client's plate pack covers; another
model keeps its stock plate, and its client lists `plate:<record>:no_plate_widget` in
`customizationAvailable(id).skipped`.

## Window tint

| Native | Signature | Result | Permission |
|---|---|---|---|
| `setWindowTint` | `(id, level?)` | `1` light smoke, `2` dark smoke, `3` limo; `0` or `nil` is factory glass | look change |
| `getWindowTint` | `(id)` | `0` for factory glass, else `1` to `3`; `nil, reason` for an unknown car | `world.vehicles` |

A fraction, a string or a value out of range is `invalid_tint`.

```lua
local ok, reason = Open77.vehicles.setWindowTint(vehicleId, 2)   -- 1 light, 2 dark, 3 limo
Open77.vehicles.setWindowTint(vehicleId, nil)                    -- factory glass
```

The level is stored on any car and survives `respawnAs`. It is drawn on the side and rear glass
of the models the tint pack covers, never on the windshield; another model keeps factory glass and
its client lists `tint:<record>:not_covered` in `skipped`. Past the appearance proxy (about 50 m
at `LODPreset` Low, 80 m above) a car shows factory glass, and the tint comes back with the full
body.

## Performance stages

| Native | Signature | Result | Permission |
|---|---|---|---|
| `respawnAs` | `(id, record)` | Rebuilds the car in place on another record, under the same id. Answers the id, or `nil, reason` | `world.vehicles` |

```lua
local id, reason = Open77.vehicles.respawnAs(vehicleId, "Vehicle.v_standard2_archer_hella_player_o77s1")
if not id then print("stage refused: " .. reason) end
```

`respawnAs` keeps paint, appearance, lights hue, health, the whole customization and every state
bag key. The car must be empty (`vehicle_occupied`), and the record must exist on every client,
which is what the stage pack adds: stage records are `Vehicle.<record>_o77s1` to `_o77s3`. A
record of the same model without a sound suffix keeps the car's engine sound: on a car with sound
3, `Vehicle.x_o77s2` respawns it on `Vehicle.x_o77s2a3`. Refusals: `invalid_record`,
`vehicle_occupied`, `engine_sound_not_for_stage` (the sound pack generated no record for that
stage), `engine_sound_unregistered` (the sound pack is stopped; `setEngineSound(id, nil)` takes the
sound off first).

## Engine sounds

| Native | Signature | Result | Permission |
|---|---|---|---|
| `registerEngineSounds` | `(catalogue)` | Declares the sound records this resource's TweakXL pack adds | nothing |
| `listEngineSounds` | `(recordOrId)` | `{ { id, label, class }, ... }`: the sounds of the car's class the pack made for this model at its current stage | nothing for a record name, `world.vehicles` for an id |
| `setEngineSound` | `(id, soundId \| nil)` | Rebuilds the empty car on the sound record; `nil` is the stage's factory sound | `world.vehicles` |
| `getEngineSound` | `(id)` | The sound id the car's record carries, or `nil` for the factory sound | `world.vehicles` |

An engine sound is a whole vanilla sound set, horn included, applied by respawning the car on a
record the pack generated: `Vehicle.<base>_o77a<k>`, or `Vehicle.<base>_o77s<n>a<k>` on a stage. A
sound survives stage changes, and a stage change keeps the sound. Every client, the driver
included, hears what the record says.

`setEngineSound` refusals: `invalid_engine_sound` (not a string), `unknown_engine_sound`,
`engine_sound_not_for_class`, `engine_sound_not_for_model`, `vehicle_occupied`. Restating the
current sound changes nothing.

```lua
-- In the server script of the sound pack: s01 uses the sound set of a city compact,
-- and the pack generated its records for this model at stages 0 to 3
Open77.vehicles.registerEngineSounds({
    { id = "s01", label = "Compact, city buzz", class = "car", set = "v_car_makigai_maimai", index = 1,
      models = { "Vehicle.v_standard2_makigai_maimai_player" }, maxStage = 3 },
})

-- In a shop
for _, sound in ipairs(Open77.vehicles.listEngineSounds(vehicleId) or {}) do print(sound.id, sound.label) end
local ok, reason = Open77.vehicles.setEngineSound(vehicleId, "s01")
```

| Entry field | Rule |
|---|---|
| `id` | Lower-case letters, digits, `_`, `.` and `-`, at most 32 characters. |
| `label` | 1 to 64 characters, naming no make. |
| `class` | `"car"` or `"bike"`. A sound only goes on a car of its class. |
| `set` | The vanilla sound set the records use. Kept on the server, never listed. |
| `index` | The `k` of the record suffix, 1 to 999. |
| `models` | `{ [baseRecord] = { stage, ... } }` (0 is the factory stage), or a list of base records covering stages 0 to `maxStage`: exactly the records the pack generated. |
| `maxStage` | Optional, 0 to 9 (0 when absent). |

Limits: 64 sounds per resource, 512 models per sound. Ids and indices belong to the first running
resource that registers them. Refusals: `invalid_engine_sound_catalogue`,
`invalid_engine_sound:<id>.<field>` (or `#<n>.<field>`), `duplicate_engine_sound:<id>`,
`engine_sound_taken:<id>`, `engine_sound_index_taken:<index>`, `engine_sound_limit`.

## Stickers

| Native | Signature | Result | Permission |
|---|---|---|---|
| `registerStickers` | `(catalogue)` | Declares the decal records this resource's pack adds | nothing |
| `listStickers` | `(recordOrId)` | `{ { id, label, group, decals }, ... }`, by group then id, that fit the record (and, given a vehicle id, its appearance) | nothing for a record name, `world.vehicles` for an id |
| `setStickers` | `(id, { stickerId, ... } \| nil)` | The whole list in order, at most 12 ids, each once; `nil` or `{}` is none | look change |
| `getStickers` | `(id)` | The sticker ids in the order set, or `nil` for none | `world.vehicles` |
| `getDecalBudget` | `(id)` | `used, 12`: the decals the car shows now, its livery's plus its stickers' | `world.vehicles` |

```lua
local used, max = Open77.vehicles.getDecalBudget(vehicleId)
local ok, reason = Open77.vehicles.setStickers(vehicleId, { "st.thrax.valentinos_01" })
if not ok then print("stickers refused: " .. reason) end
```

**A car shows at most 12 decals, its livery's included.** A thirteenth crashes every game that
spawns the car, so the server refuses a sticker list that does not fit (`decal_budget_exceeded`),
and refuses a livery that would take a car with stickers past 12 the same way. A decal two stickers
share counts once. `setStickers` refusals: `invalid_stickers`, `unknown_sticker`,
`sticker_not_for_model`, `decal_budget_exceeded`, `visual_too_large`.

| Entry field | Rule |
|---|---|
| `id` | Lower-case letters, digits, `_`, `.` and `-`, at most 64 characters. |
| `label`, `group` | Required, at most 64 characters; a menu groups by `group`. |
| `records` | 1 to 12 distinct `Vehicle.o77_*` decal attachment records of the pack, in order. Their count is what the sticker costs. |
| `parts` | Instead of `records`: 1 to 12 `{ record, component, decal }` rows; only the records are kept. |
| `model` | Optional: a record or an appearance name, or a list of up to 64. A stage fits its base record. Absent: any record. |
| `appearances` | Optional, up to 32 appearance names. |
| `decals` | Optional; when given, it must equal the number of records. |
| `record` | Optional: the pack's holder record listing the same decals. Informational. |

Only pack records are accepted (`Vehicle.o77_*`), so no resource can put a vanilla decal set on a
car by naming its record. An entry whose id, label or group names police, NCPD, sheriff, border
patrol, Arasaka or Delamain is refused (`sticker_excluded:<id>`). Limits: 1,024 stickers per
resource. Other refusals: `invalid_sticker_catalogue`, `invalid_sticker:<id>.<field>` (or
`#<n>.<field>`), `duplicate_sticker:<id>`, `sticker_taken:<id>`, `sticker_limit`.

## Reading the look

| Side | Call | Answers |
|---|---|---|
| Server | `getVisual(id)` | `{ rev, profile?, neon?, parts, wheels?, plate?, tint?, neonAnimation?, lightColors?, engineSound?, stickers? }`. `parts` lists every chosen part with its variant, the rim included; `wheels` is `{ rim, variant }`. A choice whose pack is stopped is still answered. |
| Client | `Open77.vehicles.getVisual(id)` | The raw replicated value: `{ v, rev, profile, neon, hide, show, attach, plate, tint, na, lc, st }`, or `nil` for the factory look. Needs `vehicles.read`. |
| Client | `Open77.vehicles.customizationAvailable(id)` | What this game can draw and how far it got: `{ record, paint, rims, lights, twintone, profiles, appearance, streamed, destroyed, neonLit, rev, appliedRev, skipped }`, or `nil` and `unknown_vehicle`, `vehicles_unavailable` or `permission_denied:vehicles.read`. |
| Client | `Open77.data.vehicle(record).customization` | The record's flags from the game data: `{ paint, rims, lights, twintone, twintoneModel, profiles, appearance }`. |

The client's raw value is the network form; read it for debugging and use the server's `getVisual`
for logic. `skipped` lists what this client did not draw, as `<category>:<item>:<reason>`, for
example `attach:rims.fl:model_not_registered`, `plate:<record>:no_plate_widget` or
`tint:<record>:not_covered`. Read it once `appliedRev` has reached `rev`.

```lua
-- client script; the resource needs vehicles.read
local state = Open77.vehicles.customizationAvailable(vehicleId)
if state and state.appliedRev >= state.rev then
    for _, entry in ipairs(state.skipped) do
        print("not drawn on this client: " .. entry)
    end
end
```

Server event `onVehicleVisualChanged(id, rev, fields)` and client event
`open77:vehicleVisualChanged(id, rev)` are described in
[Persistence & multiplayer](vehicle-customization-persistence.md#events).
