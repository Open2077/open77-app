# Vehicle customization model coverage

Which cars a customization works on is **data, not platform code**. The natives work on any
vehicle record; what decides whether a given model can wear a rim, a livery or a tint is a flag in
the game's own data, a row a resource registered for that record, or a record a pack generated.
A server covers more models by adding data, never by waiting for a new platform build.

The natives on this page are **coming in the next Open77 release**, except paint, the lights hue
and trims, which are in the current public build.

## What decides coverage

| Category | Decided by | Ask from Lua | A model that is not covered |
|---|---|---|---|
| Paint, lights hue | The record's own paint component, flagged in the game data | `Open77.data.vehicle(record).customization` (`paint`, `lights`), or client `customizationAvailable(id)` | The value is stored; the car keeps its authored look |
| Factory trim | The record's own appearance variants | `getAppearance(id)` | Only the record's variants apply |
| Factory livery | The record's own colour template list | `listPaintProfiles(record)` | `invalid_profile` |
| Custom livery | Rows a pack registered for that record with `registerPaintProfiles` | `listPaintProfiles(record)` | `invalid_profile` |
| Neon, neon animation, lamp colours | Nothing: any car | — | Always drawn; a motorcycle gets one neon light |
| Rims, body parts, toggles | The part's `fit` rows in `registerParts`, **one fit per record** | `listParts(record)` | `part_not_for_model` |
| Plate | The plate pack's patch for that model's appearance resource | client `skipped` lists `plate:<record>:no_plate_widget` | The text is stored; the stock plate shows |
| Window tint | The tint pack's patch for each glass mesh of that model | client `skipped` lists `tint:<record>:not_covered` | The level is stored; factory glass shows |
| Performance stage | The records the stage pack generated (`_o77s1` to `_o77s3`) | Your own list of the pack's records | The server cannot see pack records; offer only the ones your pack generated |
| Engine sound | The `models` of each sound in `registerEngineSounds` | `listEngineSounds(record)` | `engine_sound_not_for_model` |
| Stickers | The `model` and `appearances` of each sticker in `registerStickers` | `listStickers(record)` | `sticker_not_for_model` |

The list functions need no permission when given a record name, so a menu can show what a model
supports before a car exists. Given a vehicle id they need `world.vehicles`, and `listStickers`
then also filters by the car's current appearance.

## One fit per record

A rim or a body part carries a separate fit for every vehicle record it supports: the offset,
rotation and scale in its slot, the wheel slots, and the stock components it hides. There is no
"fits every car" part and no automatic placement at run time:

```lua
wing_gt = {
    kind = "part", slot = "Base", label = "GT wing",
    variants = { carbon = "asset:my_body/wing_gt_carbon" },
    fit = {
        -- one row per record, each measured on that model's body
        ["Vehicle.v_standard2_archer_hella_player"] = { offset = { 0, -2.384, 0.211 }, scale = { 1.1, 1, 1 } },
        -- a model with no row here answers part_not_for_model
    },
},
```

- A **stage record** (`Vehicle.<base>_o77sN`) without its own row takes its base record's fit,
  livery rows and stickers, so stages need no extra data.
- A **trim** whose stock components have other names or another depth gets an `appearances`
  override inside its record's fit; the server picks the fit from the car's current appearance.
- A **different record** of the same body (a traffic variant, a gang variant) is a different
  record: list it in the fit, even when the numbers are the same.

The same holds for the other content: a livery template, a sticker set, a sound record and a
stage record are each made for named records.

## How a server covers more models

| To cover a new model with | Add |
|---|---|
| Rims | A `fit` row for the record in the rim's `registerParts` entry: scale from the stock rim radius, the back axle in `wheels` if it differs, the stock rim components in `hide` |
| Body parts | A `fit` row per part: offset, rotation and scale measured in the part's slot, and `hide` for the stock part it replaces |
| Custom liveries | Colour template records made for that model's paint mask, and a `registerPaintProfiles` row keyed by the record |
| Stickers | Decal records placed on that model's panels, and a `registerStickers` entry whose `model` names the record |
| Stages and engine sounds | The model in the stage and sound generators' model list, so the pack generates its `_o77s<n>` and `_o77a<k>` records; add it to the sound's `models` |
| Plate | The model's appearance resource in the plate pack's spec, then rebuild the pack |
| Window tint | The model's glass meshes in the tint pack's data, then rebuild the pack |

Rows registered at run time take effect at once. Anything that changes a pack's files (new prop
models, new records, new patches) is a new pack revision: it reaches players through the
`preload_mod` ZIP, after a server restart and a fresh launcher boot. See
[Content packs](vehicle-customization-packs.md).

## The reference packs

The packs built with the platform's vehicle kit target the vanilla player vehicles. Motorcycles
get no body kit, and a few bodies take no paint (their record has no paintable component), so
those categories skip them. Treat the packs as a starting point: their data is what decides their
coverage, and a server extends it the way described above.

## Checking a model before you offer it

```lua
-- server: what this record supports, with no car spawned
local record = "Vehicle.v_standard2_archer_hella_player"
local rims = 0
for _, part in ipairs(Open77.vehicles.listParts(record) or {}) do
    if part.kind == "rim" then rims = rims + 1 end
end
local liveries = #(Open77.vehicles.listPaintProfiles(record) or {})
local stickers = #(Open77.vehicles.listStickers(record) or {})
print(("%s: %d rims, %d liveries, %d stickers"):format(record, rims, liveries, stickers))
```

```lua
-- client: what this game drew on a car (the resource needs vehicles.read)
local state = Open77.vehicles.customizationAvailable(vehicleId)
if state and state.paint == false then print("this body takes no paint") end
```
