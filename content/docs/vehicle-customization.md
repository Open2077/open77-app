# Vehicle customization

Tune a networked car from a server resource: paint, liveries, neon and its animation, lamp
colours, rims and body parts, plate text, window tint, performance stages, engine sounds and
stickers. The server is authoritative for all of them. A resource calls a server native, and
every client that streams the car draws the result, late joiners included.

**Availability.** Every native in this section is public since Open77 **Stable 2.50.0+op77.208 and Unstable 2.50.0-unstable+op77.205**.
Paint, the lights hue, factory trims (`setAppearance`) and the property table (`getProperties`,
`setProperties`) are older; see [Vehicle paint](vehicle-paint.md). The drawing side (neon, the
plate script, the tint switch, the sticker script, the headlight colour) ships in the Open77 client
of the same builds, so players need that client too. Servers older than those builds have only
paint, the lights hue (stored, but the headlights stay white), trims and a property table without
a `visual` field. Test for a native before calling it, for example
`if type(Open77.vehicles.setNeon) == "function" then`, so a resource still loads on an older
server, and grey the option in your menu otherwise.

All the natives are listed together in the API reference under
[Vehicle customization](/docs/api?category=vehicle-customization).

## In this section

| Page | What it covers |
|---|---|
| [Natives by category](vehicle-customization-natives.md) | Every server and client native, its arguments, results, refusals and limits |
| [Vehicle paint](vehicle-paint.md) | RGB paint, the lights hue, colour formats and paint events |
| [Content packs](vehicle-customization-packs.md) | What a pack holds, how it reaches players, the vehicle kit pipeline and the 12-decal cap |
| [Model coverage](vehicle-customization-models.md) | Which cars a category works on, and how a server covers more models |
| [Persistence & multiplayer](vehicle-customization-persistence.md) | The per-car value, late joiners, restarts, events and measured limits |
| [FiveM equivalents](vehicle-customization-fivem.md) | The FiveM aliases, their index mappings and what has no counterpart |
| [Worked examples](vehicle-customization-examples.md) | A tuning shop, a garage, a client menu, and Light RP's Auto Studio |

## Categories

| Category | What players see | Server natives | Content needed |
|---|---|---|---|
| Paint | Two body colours, any RGB | `setPaint`, `getPaint`, `resetPaint` | None |
| Lights colour | One hue for the car's lights, shown on the headlights (lamp glow and beam) from the next client release | `setLightsHue`, `clearLightsHue`, `setHeadlightColor` | None |
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
| Engine sound | Another engine note, horn included | `registerEngineSounds`, `listEngineSounds`, `setEngineSound`, `getEngineSound` | TweakXL records |
| Stickers | Decals on the body | `registerStickers`, `listStickers`, `setStickers`, `getStickers`, `getDecalBudget` | Archive + TweakXL records |

Every category reaches current viewers, late joiners and a car that streams back in. Hiding or
showing factory components (`toggle` parts) is **experimental**: it has been checked on a single
client only. A trim change has not been checked across a server restart.

Which models a category works on is decided by data, not by the platform: a record the game marks
as customizable, a fit a resource registered for that record, or a record a pack generated. See
[Model coverage](vehicle-customization-models.md).

## How it works

1. A **pack resource** ships the content (prop models, TweakXL records, ArchiveXL patches) as a
   `preload_mod` ZIP, and its server script declares what the content is: `registerParts`,
   `registerPaintProfiles`, `registerEngineSounds`, `registerStickers`. Declaring changes no car
   and needs no permission.
2. A **gameplay resource** (a tuning shop, a garage) calls the setters on a car. The server checks
   the permission, the value and the car's model, then writes the whole look into one value per
   car, the platform-reserved vehicle state bag key `open77.visual`.
3. **Every client** that streams the car reads that value and draws it, again after a stream-in,
   an appearance change and a rebuild. A client that cannot draw something lists it in
   `customizationAvailable(id).skipped` instead of failing. The list only grows while the car
   exists on that client: an entry stays after its cause is gone.

Stages and engine sounds are records, not part of that value: the server rebuilds the empty car in
place on the record, under the same id, and keeps everything else.

## Permissions

| Call | Needs |
|---|---|
| A change of trim, livery, neon, neon animation, lamp colours, parts, rims, plate, tint or stickers | `world.vehicles` and `world.vehicles.appearance` |
| The same value again (a restatement) | `world.vehicles` only |
| `setPaint`, `resetPaint`, `setLightsHue`, `clearLightsHue`, `setHeadlightColor`, `respawnAs`, `setEngineSound`, every `get*` read | `world.vehicles` |
| `registerParts`, `registerPaintProfiles`, `registerEngineSounds`, `registerStickers` | nothing |
| `listPaintProfiles`, `listParts`, `listEngineSounds`, `listStickers` given a record name | nothing |
| The same four list functions given a vehicle id | `world.vehicles` |
| Client `customizationAvailable`, client `getVisual` | `vehicles.read` |

A restatement is free, so `setProperties(id, getProperties(id))` always passes with
`world.vehicles` alone. A pack resource that only registers parts or liveries needs no
permission, and so cannot repaint anybody's car.

```lua
-- open77.lua of a tuning shop
permissions { "world.vehicles", "world.vehicles.appearance" }
```

A missing permission answers `false, "permission_denied:world.vehicles.appearance"` on the first
call that changes a look; nothing is applied.

## See also

- [Network vehicles](vehicles.md): lifecycle, streaming, properties and the full vehicle API.
- [Vehicle properties](vehicles.md#vehicle-properties-and-what-cyberpunk-does-not-have):
  `getProperties` and `setProperties`, which carry the whole customization.
- [Mods](mods.md): how packs reach players, and
  [Verifying that a mod loaded](mods.md#verifying-that-a-mod-loaded).
- [Mods your server requires](server-mods.md): `requiredMods` and unsecured mode.
