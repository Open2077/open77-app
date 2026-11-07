# Vehicle customization content packs

Paint, the lights hue, factory trims, factory liveries, neon, the neon animation and lamp colours
use what every copy of the game already has. Everything else draws content that must be in every
player's game: prop models for rims and body parts, TweakXL records for liveries, stages, engine
sounds and stickers, ArchiveXL patches for the plate and the tint. A server ships that content as a
**pack**: a resource whose `preload_mod` ZIP the launcher mounts before the game starts, and whose
server script tells the platform what the content is.

The natives these packs serve are **coming in the next Open77 release**.

## What each pack holds

| Pack | What the ZIP holds | Registered by | Loader |
|---|---|---|---|
| Rims and body parts | `archive/pc/mod/<name>.archive` of prop models | client `Open77.props.registerModel` (permission `props.register`), then server `registerParts` | none |
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

- A resource declares up to **eight** `preload_mod` ZIPs, each 1 byte to **64 MiB**. The ZIP holds
  game-root relative paths, for example `archive/pc/mod/<name>.archive`.
- `requiredMods.enabled` must be `true` in the server configuration.
- The launcher mounts the ZIP **before the game starts**. A new pack revision therefore needs a
  server restart, a fresh launcher boot, and players reconnecting. Mark the asset resource
  `reload_policy 'reconnect'`.
- A player whose game mounted an older archive sees the car stock: the server logs
  `prop_archive_missing_restart_required`, and the client skips the part with
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

The platform repository ships the tools that build the reference packs, under
`scripts/vehicle-kit`, with the same release as the natives. The rim and body part pipeline turns
a JSON spec into a ready-to-copy asset resource in one command, without the game running:

```text
spec.json ─► Blender (procedural, original geometry) ─► .glb
          ─► WolvenKit import onto a template mesh ─► native cook (local materials, one mesh
             and visual host entity per model) ─► serialize round trip check
          ─► .archive ─► preload_mod ZIP + package.json + register.lua ─► review renders
```

It needs PowerShell 7, Blender 4.5 with the Cyberpunk IO Suite add-on, WolvenKit CLI 8.20 and
Node.js 18 or later; the game folder is only read, for two template files. The build fails rather
than ship a pack that breaks a rule:

- every material is local, and nothing references a game resource outside a short allowlist;
- no collision and no physics: a part is visual only and never changes handling;
- every archive path sits under the revision prefix, and every extracted file is byte-identical to
  the staged one;
- the ZIP has **exactly one entry**, `archive/pc/mod/<archiveName>.archive`, and is at most
  **64 MiB**;
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

### The gameplay resource

A gameplay resource declares `dependency 'my_vehicle_kit'`, registers the parts once at start
(no permission needed for that) and sets them per car:

```lua
-- open77.lua
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
local ok, reason = Open77.vehicles.setWheels(vehicleId, { rim = "rim_vk1", variant = "chrome" })
```

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
  called by the pack's **server** script at start. They change no car and need no permission.
- Each call is atomic: one bad entry refuses the whole call, with a reason naming the entry and
  the field (`invalid_part:<id>.<field>`). One call crosses at most 4,096 Lua values; a large
  catalogue registers in several calls, which merge.
- Ids belong to the first running resource that registers them and are dropped when it stops.
  Part ids are namespaced by resource (`my_vehicle_kit:rim_vk1`).
- **A stopped pack leaves the choice dormant.** A part, livery or sticker whose pack stops, or that
  the car's current record does not list, stays chosen on the server and is not drawn. It shows
  again when the pack runs.

## Checking that a pack loaded

On a client, `customizationAvailable(id).skipped` names what was not drawn and why:

| Entry | Meaning |
|---|---|
| `attach:<key>:model_not_registered` | The prop model is unknown on this client: the archive is missing or older than the server's pack |
| `attach:<key>:slot_absent` | The fit names a slot this model does not have |
| `profile:<id>:not_for_model` | The livery template does not apply to this record |
| `plate:<record>:no_plate_widget` | The plate pack does not cover this model |
| `tint:<record>:not_covered` | The tint pack has no glass patch for this model |
| `stickers:*:record_unknown` | A sticker record is missing from this client's game |

See also [Verifying that a mod loaded](mods.md#verifying-that-a-mod-loaded).
