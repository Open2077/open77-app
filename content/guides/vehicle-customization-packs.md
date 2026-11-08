# Vehicle customization content packs

Paint, the lights hue, factory trims, factory liveries, neon, the neon animation and lamp colours
use what every copy of the game already has. Everything else draws content that must be in every
player's game: prop models for rims and body parts, TweakXL records for liveries, stages, engine
sounds and stickers, ArchiveXL patches for the plate and the tint. A server ships that content as a
**pack**: a resource whose `preload_mod` ZIP the launcher mounts before the game starts, plus a
server script that tells the platform what the content is.

The natives these packs serve are public since Open77 **Stable 2.50.0+op77.208 and Unstable 2.50.0-unstable+op77.205**.

## What each pack holds

| Pack | What the ZIP holds | Registered by | Loader |
|---|---|---|---|
| Rims and body parts | `archive/pc/mod/<name>.archive` of prop models | client `Open77.props.registerModel` (permission `props.register`) in the asset resource, then server `registerParts` in a resource of yours | none |
| Custom liveries | an archive plus `r6/tweaks/.../*.yaml` colour template records | server `registerPaintProfiles` | TweakXL 1.12.0 or later |
| Performance stages | TweakXL records `Vehicle.<record>_o77s1` to `_o77s3` | none: `respawnAs` takes the record | TweakXL 1.12.0 or later |
| Engine sounds | TweakXL records `Vehicle.<record>_o77a<k>` and `_o77s<n>a<k>` | server `registerEngineSounds` | TweakXL 1.12.0 or later |
| Stickers | an archive of decal entities plus TweakXL records `Vehicle.o77_*` | server `registerStickers` | TweakXL |
| Plate | an ArchiveXL `.app` patch adding a screen and a text widget | none | ArchiveXL 1.28.0 or later |
| Window tint | an ArchiveXL mesh patch adding `open77_tint<level>__<source>` appearances | none | ArchiveXL 1.28.0 or later |

The bundled TweakXL loader resource is 1.12.0. TweakXL and ArchiveXL are executable content, so a
world that uses them must run [unsecured](server-mods.md#unsecured-mode).

## How a pack reaches players

The full rules are in [Declaring mods on a server](mods.md#declaring-mods-on-a-server). For a
customization pack:

- A resource declares up to **eight** `preload_mod` ZIPs, each 1 byte to **256 MiB**. The ZIP holds
  game-root relative paths, for example `archive/pc/mod/<name>.archive`.
- `requiredMods.enabled` must be `true` in the server configuration.
- The launcher mounts the ZIP **before the game starts**. A new pack revision therefore needs a
  server restart, a fresh launcher boot, and players reconnecting. Mark the asset resource
  `reload_policy 'reconnect'`.
- A player whose game mounted an older archive sees the car stock. On that player's client,
  `Open77.props.registerModel` refuses the model with `prop_archive_missing_restart_required`,
  which the kit's `register.lua` writes to the **client** log (`[vehicle-kit] skipped model <model>:
  prop_archive_missing_restart_required`), and the client skips the part with
  `model_not_registered` in `customizationAvailable(id).skipped`. Nothing else fails.

## No vanilla bytes

A pack ships **only original data**. Geometry, textures and materials are made for the pack; when
it needs a game file (a base material, a vanilla decal mesh, a sound set, the plate mesh) it names
it by depot path or record name and never copies it. Every path the pack adds sits under its own
prefix, so it can never replace a game file:

```text
open77\assets\<resource>\<revision>\...
```

The revision is a hash of the pack's inputs. A changed pack therefore gets new depot paths and a
new ZIP name, and a stale archive still in a player's cache can never shadow it. TweakXL records a
pack adds start with `Vehicle.o77_` (liveries, stickers) or carry an `_o77` suffix on the base
record (stages, sounds). Stickers are a special case of the rule: the server accepts only
`Vehicle.o77_*` decal records, so a resource cannot put a vanilla decal set on a car by naming it.

## The vehicle kit pipeline

The tools that built the reference packs are public:
[`tools/vehicle-kit`](https://github.com/Open2077/open77-resources/tree/next/tools/vehicle-kit) in
open77-resources, on the `next` branch until the release that brings the natives. The folder
mirrors the platform repository, so run every command from it; its `README.md` lists each builder
with its command and guide. The packs it built for Light RP are published in
[Light RP's `resources/assets/models`](https://github.com/Open2077/light-rp/tree/main/resources/assets/models);
see [Using Light RP's packs on another server](#using-light-rps-packs-on-another-server).
The rim and body part pipeline turns a JSON spec into a ready-to-copy asset resource in one
command, without the game running:

```text
spec.json ─► Blender (procedural, original geometry) ─► .glb
          ─► WolvenKit import onto a template mesh ─► native cook (local materials, one mesh
             and visual host entity per model) ─► serialize round trip check
          ─► .archive ─► preload_mod ZIP + package.json + register.lua ─► review renders
```

It needs PowerShell 7, Blender 4.5 with the Cyberpunk IO Suite add-on, WolvenKit CLI 8.20 and
Node.js 18 or later; the livery and sticker builders also need Python 3 with `numpy` and `Pillow`.
The game folder is only read, for two template files. The build fails rather
than ship a pack that breaks a rule:

- every material is local, and nothing references a game resource outside a short allowlist;
- no collision and no physics: a part is visual only and never changes handling;
- every archive path sits under the revision prefix, and every extracted file is byte-identical to
  the staged one;
- the ZIP has **exactly one entry**, `archive/pc/mod/<archiveName>.archive`, and is at most
  **64 MiB**, the pipeline's own ceiling for a Warden upload (a `preload_mod` itself may reach
  256 MiB);
- an unchanged spec rebuilds the same paths, archive and ZIP bytes.

The liveries, stickers, stages and engine sounds, plate and tint have their own builders next to
it (`liveries/`, `stickers/`, `stages/`, `plates/`, `windows/`), with the same rules.

### The asset resource

The build writes the asset resource. Its manifest declares the ZIP and a client script that
registers every cooked model as a prop:

```lua
-- open77.lua of the asset resource
resource 'my_vehicle_kit'
version '0.1.0'
reload_policy 'reconnect'
client_script 'register.lua'
files { 'package.json' }
preload_mod 'dist/MyVehicleKit_<revision>.zip'
permissions { 'props.register' }
```

`register.lua` calls `Open77.props.registerModel` once per model listed in `package.json`, so
every model becomes `asset:<resource>/<model>`, for example `asset:my_vehicle_kit/rim_vk1_chrome`.
It never raises: a model that cannot register is logged and skipped, and the others still
register. A client resource registers at most 128 prop models, and 1,024 across all resources.

The asset resource has **no server script**, so it registers prop models and no part: nothing is
ever a part of `my_vehicle_kit`. The parts are declared by the resource below.

### The gameplay resource

A gameplay resource, here `my_vehicle_parts`, declares `dependency 'my_vehicle_kit'`, registers
the parts once at start from its server script (no permission needed for that) and sets them per
car. The parts belong to it: their ids are `my_vehicle_parts:<id>`.

```lua
-- open77.lua
resource 'my_vehicle_parts'
version '1.0.0'
dependency 'my_vehicle_kit'
server_script 'server.lua'
permissions { 'world.vehicles', 'world.vehicles.appearance' }
```

```lua
-- server.lua
Open77.vehicles.registerParts({
    rim_vk1 = {
        kind = "rim", label = "VK-1 split five",
        variants = { chrome = "asset:my_vehicle_kit/rim_vk1_chrome" },
        fit = {
            ["Vehicle.v_standard2_archer_hella_player"] = {
                hide = { "wheel_01_bl_a", "wheel_01_br_a", "wheel_01_fl_a", "wheel_01_fr_a" },
            },
        },
    },
})
-- a bare id names a part of this resource: my_vehicle_parts:rim_vk1
local ok, reason = Open77.vehicles.setWheels(vehicleId, { rim = "rim_vk1", variant = "chrome" })
```

Another resource, a shop for example, names the same rim `my_vehicle_parts:rim_vk1`, the form
`listParts` answers.

## Using Light RP's packs on another server

The liveries, stickers, stages and plate packs register their own content, so copying the folder
is enough. The rims and body kit packs are asset resources: their parts and fits are a catalogue
that Light RP generates into `op77_lightrp/server/config/` (`vehicle_kit.lua`,
`vehicle_kit_player_rims.lua`, `vehicle_kit_trims.lua`) and registers from its gamemode. On
another server, copy those three files into a resource of yours that depends on both packs, and
register each part:

```lua
-- open77.lua
resource 'my_lightrp_parts'
version '1.0.0'
dependency 'lightrp_vk_rims'
dependency 'lightrp_vk_body'
server_script 'vehicle_kit.lua'
server_script 'vehicle_kit_player_rims.lua'
server_script 'vehicle_kit_trims.lua'
server_script 'server.lua'
```

```lua
-- server.lua
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
        local ok, reason = Open77.vehicles.registerParts({ [id] = part })
        if not ok then print(("part %s refused: %s"):format(id, tostring(reason))) end
    end
end
```

The parts are then `my_lightrp_parts:<id>`. The dependencies also start the two packs, which are
`auto_start false`; the plate pack is too, so a server that wants plates starts it with
`ensure open77_vehicle_plates` in `startup.commands`. The liveries, stickers and stages need the
`tweakxl` loader 1.12.0 or later, and the plate and tint need `archivexl` 1.28.0 or later, both from
open77-resources `libraries/` on the `next` branch until the release.

## Fit tables: one fit per record

A part does not know a car's shape. The pack measures each model and writes a **fit** per vehicle
record: where the part sits, at what scale, which stock components it hides. `registerParts`
carries those fits, and a part applies only to the records its `fit` lists; any other car answers
`part_not_for_model`.

- **Rims** keep the car's own tyre, so the wheel diameter never changes. A rim is built once and
  scaled per model from the stock rim's measured radius; a fit's `wheels` list sizes the back axle
  separately where it differs, and its `hide` list names the stock rim components, never the tyre.
- **Body parts** are placed in the slot they hang on (`Base` for most of a body kit), measured
  against the stock body, with an `offset`, `rotation` and `scale` per record and a `hide` list for
  the stock part they replace. A wing on a trunk lid names the lid as its `carrier`, so it rises
  when the trunk opens.
- **Trims** with other component names or another depth get an `appearances` override inside the
  record's fit, so one part fits every trim of a model.
- **Stages** need no fit of their own: a stage record without its own row takes its base record's.

Covering another model is adding its row to the fit table. See
[Model coverage](vehicle-customization-models.md).

## The 12-decal cap

A car shows at most **12 decals** (`customDecals`), its livery's and its stickers' together. A
thirteenth crashes every game that spawns the car, within a second of it appearing. Twelve on
each of many nearby cars is fine: the cap counts per car.

- **Stickers** are capped by the server: `setStickers` refuses a list that does not fit
  (`decal_budget_exceeded`), a livery that would push a stickered car past 12 is refused the same
  way, and `getDecalBudget(id)` answers `used, 12`. A sticker declares 1 to 12 records, and its
  record count is its cost.
- **Livery templates** are the pack's responsibility: the server cannot read a pack's YAML, so a
  colour template must carry 12 decals or fewer, and declare its count with `decals` in
  `registerPaintProfiles` so the budget is right. The livery builder folds panels that move
  together into one decal until a model fits under the cap, and refuses a template above it.
- Keep sticker sets small, so a light livery and a set fit on one car: the reference
  original-motif sticker pack keeps each set to 9 decals or fewer.

## Registration rules

- `registerParts`, `registerPaintProfiles`, `registerEngineSounds` and `registerStickers` are
  **server** natives, called by a server script at start. They change no car and need no
  permission. The rim and body part asset resource ships only a client script, so its parts are
  registered by a server resource beside it; the livery, sticker, stage and sound builders write
  that server script into their own resource.
- Each call is atomic: one bad entry refuses the whole call, with a reason naming the entry and
  the field (`invalid_part:<id>.<field>`). One call reads at most 262,144 Lua values, 16 levels
  deep, strings up to 16 KiB, and each catalogue keeps its own limits (1,024 stickers, for
  example). A large catalogue can also register in several calls, which merge.
- Ids belong to the first running resource that registers them and are dropped when it stops.
  Part ids are namespaced by the resource that **calls** `registerParts`
  (`my_vehicle_parts:rim_vk1` in the example above), not by the resource that ships the models.
- **A stopped pack leaves a held choice dormant.** A part, livery or sticker the car already holds
  stays chosen on the server when its pack stops, or when the car's current record does not list
  it, and is not drawn. It shows again when the pack runs. A **new** choice whose pack is not
  running is refused (`unknown_part`, `invalid_profile`, `unknown_sticker`), so a garage that
  restores a stored look on a new car needs the packs running first; see
  [Persistence](vehicle-customization-persistence.md#keeping-a-tuned-car-across-a-restart).

## Checking that a pack loaded

On a client, `customizationAvailable(id).skipped` names what was not drawn and why. The list only
grows while the car exists on that client: an entry stays after the part or tint that caused it is
taken off, and is cleared only when the car leaves the client.

| Entry | Meaning |
|---|---|
| `attach:<key>:model_not_registered` | The prop model is unknown on this client: the archive is missing or older than the server's pack |
| `attach:<key>:slot_absent` | The fit names a slot this model does not have |
| `profile:<id>:not_for_model` | The livery template does not apply to this record |
| `plate:<record>:no_plate_widget` | The plate pack does not cover this model |
| `tint:<record>:not_covered` | The tint pack has no glass patch for this model |
| `stickers:*:record_unknown` | A sticker record is missing from this client's game |

See also [Verifying that a mod loaded](mods.md#verifying-that-a-mod-loaded).
