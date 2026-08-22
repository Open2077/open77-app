# Game data reference

This page is the entry point for identifiers passed to Open77 APIs: NPC templates, vehicle records,
seat and damage indexes, weapons, appearances, effects, sounds, animations, and map sprites. The
catalogues were extracted from Cyberpunk 2077 **2.31** unless another version is stated.

## Support levels

Do not treat every identifier found in the game database as a supported multiplayer asset.

| Level | Meaning |
|---|---|
| **Open77-supported** | Exposed by an Open77 runtime catalogue or used by an official resource. Intended for normal resources. |
| **Runtime-validated** | Resolved against the live 2.31 TweakDB or archives, but still requires an in-game spawn and cleanup test. |
| **Extracted candidate** | Found in cooked data. Quest logic, missing dependencies, special rigs, or build drift can make it unsafe. |

Record names and Open77 entity IDs are opaque values. Preserve their spelling and never pass a
64-bit entity ID through `tonumber`.

## NPC templates

`Open77.npcs.create` currently accepts the following server-approved aliases. Query the active
runtime instead of hard-coding the list when building admin tools:

```lua
for _, template in ipairs(Open77.npcs.templates()) do
  print(template.name, template.record, template.observerRecord, template.defaultAppearance)
end
```

| Supported alias | Authoritative record | Observer record | Intended use |
|---|---|---|---|
| `civilian_female_relaxed_01` | `Character.Panam` | `Character.Panam` | Non-hostile human with locomotion, look-at, workspot, and equipment capabilities. |
| `hostile_female_ranged_lab` | `Character.cpz_maelstrom_grunt1_ranged1_lexington_wa` | same as authoritative record | Ranged hostile test puppet with the combat capability enabled. |

The aliases are deliberately conservative. A raw `.ent` path or arbitrary `Character.*` record
from the extracted database is **not** accepted by the authoritative NPC service until it has been
promoted to the supported catalogue.

### Complete extracted NPC database

| Dataset | Entries | Contents |
|---|---:|---|
| [NPC catalogue overview](../docs/generated/npc-templates-2.31.md) | 6,668 records / 1,524 templates | Categories, risk classes, and the complete template table. |
| [Character records CSV](../docs/generated/npc-records-2.31.csv) | 6,668 | `Character.*`, TweakDBID, template, appearances, affiliation, equipment, vendor and quest metadata. |
| [Templates CSV](../docs/generated/npc-templates-2.31.csv) | 1,524 | Records grouped by `.ent`, appearances, categories, gender, and risk. |
| [Templates JSON](../docs/generated/npc-templates-2.31.json) | 1,524 | Machine-readable version for tooling. |
| [Entity appearances CSV](../docs/generated/npc-entity-appearances-2.31.csv) | 1,524 | Direct/effective appearances, archive ownership, includes, and `.app` resources. |
| [Appearance resources CSV](../docs/generated/npc-appearance-resources-2.31.csv) | 9,242 | Appearance resource, archive, appearance name, and parent. |

Risk values in the NPC catalogue are actionable: prefer `candidate`, audit `special_rig` and
`special_vendor`, and do not promote `unsafe_quest_or_scene`, `restricted_child`, `deny_player`, or
`missing_template` without dedicated engine and gameplay validation.

## Vehicle models

Vehicle creation takes a TweakDB record, not an entity template hash:

```lua
local id = Open77.vehicles.create(
  {
    record = "Vehicle.v_standard2_archer_hella_player",
    position = { x = 100.0, y = 200.0, z = 30.0 },
    yaw = 90.0
  }
)
```

Prefer `*_player` records. The [complete vehicle model catalogue](../docs/vehicle-models.md) contains
1,372 records with a non-zero `entityTemplatePath`, including **89 player/garage variants**. It also
documents records that resolve structurally but should not be spawned.

The official freeroam resource provides these convenient command aliases. The record in the right
column is the portable value to store in another resource or database.

| Alias | Vehicle record | Alias | Vehicle record |
|---|---|---|---|
| `hella` | `Vehicle.v_standard2_archer_hella_player` | `bandit` | `Vehicle.v_standard2_archer_bandit_player` |
| `quartz` | `Vehicle.v_standard2_archer_quartz_player` | `caliburn` | `Vehicle.v_sport1_rayfield_caliburn_player` |
| `mordred` | `Vehicle.v_sport1_rayfield_caliburn_mordred_player` | `aerondight` | `Vehicle.v_sport1_rayfield_aerondight_player` |
| `outlaw` | `Vehicle.v_sport1_herrera_outlaw_player` | `turbo` | `Vehicle.v_sport1_quadra_turbo_player` |
| `type66` | `Vehicle.v_sport2_quadra_type66_player` | `shion` | `Vehicle.v_sport2_mizutani_shion_player` |
| `porsche` | `Vehicle.v_sport2_porsche_911turbo_player` | `alvarado` | `Vehicle.v_sport2_villefort_alvarado_player` |
| `deleon` | `Vehicle.v_sport2_villefort_deleon_player` | `cortes` | `Vehicle.v_standard2_villefort_cortes_player` |
| `colby` | `Vehicle.v_standard2_thorton_colby_player` | `galena` | `Vehicle.v_standard2_thorton_galena_player` |
| `supron` | `Vehicle.v_standard25_mahir_supron_player` | `maimai` | `Vehicle.v_standard2_makigai_maimai_player` |
| `hozuki` | `Vehicle.v_standard2_mizutani_hozuki_player` | `thrax` | `Vehicle.v_standard2_chevalier_thrax_player` |
| `kusanagi` | `Vehicle.v_sportbike1_yaiba_kusanagi_player` | `arch` | `Vehicle.v_sportbike2_arch_player` |
| `jackie` | `Vehicle.v_sportbike2_arch_jackie_player` | `apollo` | `Vehicle.v_sportbike3_brennan_apollo_player` |

### Vehicle seats, doors, windows, and state bits

| Seat | Canonical name | FiveM-style index |
|---|---|---:|
| Driver | `seat_front_left` / `driver` | `-1` |
| Front passenger | `seat_front_right` / `frontPassenger` | `0` |
| Rear left | `seat_back_left` / `rearLeft` | `1` |
| Rear right | `seat_back_right` / `rearRight` | `2` |

| Index | Door name | Window name |
|---:|---|---|
| `0` | `frontLeft` or `front_left` | `frontLeft` |
| `1` | `frontRight` or `front_right` | `frontRight` |
| `2` | `backLeft` or `back_left` | `backLeft` |
| `3` | `backRight` or `back_right` | `backRight` |
| `4` | `trunk` | — |
| `5` | `hood` | — |

Doors use a 6-bit mask; windows and broken tires use 4-bit masks. Bit `n` corresponds to index `n`.
The authoritative vehicle flags are:

| Flag | Value | Flag | Value |
|---|---:|---|---:|
| `engineOn` | `1` | `locked` | `2` |
| `destroyed` | `4` | `exploded` | `8` |
| `invulnerable` | `16` | `immortal` | `32` |
| `lightsOn` | `64` | `highBeams` | `128` |
| `sirenOn` | `256` |  |  |

Motion dynamics add `onGround = 1`, `reversing = 2`, and `hornActive = 4`. See
[Vehicles](vehicles.md) for the authoritative API, damage arrays, glass/light masks, authority, and
streaming semantics.

## NPC and elevator constants

| NPC group | Values |
|---|---|
| AI mode | `tasks = 0`, `frozen = 1`, `native = 2`; `observer = 3` is protocol-only and rejected for creation/update. |
| Damage policy | `mortal = 0`, `immortal = 1`, `invulnerable = 2` |
| State flags | `alive = 1`, `ragdoll = 2`, `despawnWhenUnobserved = 4`, `persistent = 8` |
| Task channel | `movement = 0`, `look = 1`, `action = 2`, `fullBody = 3` |
| Task status | `queued = 0`, `suspended = 1`, `executing = 2`, `success = 3`, `failure = 4`, `cancelled = 5`, `interrupted = 6` |

Elevator phases are `idle = 0`, `moving = 1`, and `paused = 2`. Elevator state flags are
`powered = 1`, `locked = 2`, `interactionAllowed = 4`, and `doorsClosed = 8`.

## Items, weapons, effects, sounds, and animations

| Dataset | Entries | Runtime confidence |
|---|---:|---|
| [Weapons and weapon items](../docs/generated/weapons-2.31.csv) | 1,925 | Extracted from 2.31 TweakDB; use the `canonical`, `deprecated`, `can_drop`, and `usage` columns to filter. |
| [Canonical weapon notes](../docs/generated/weapons-2.31-canonical.md) | curated | Recommended records grouped for normal gameplay use. |
| [VFX assets](../docs/generated/vfx-assets-2.31.csv) | 1,070 | Archive-discovered paths; individual runtime validation is still required. |
| [SFX event seed](../docs/generated/sfx-events-wolvenkit-seed.csv) | 17,586 | WolvenKit 1.6 seed data; explicitly requires 2.31 runtime validation. |
| [Animation names](../docs/data/emote-animations.txt) | 23,044 | Extracted animation name candidates. |
| [Animation sets](../docs/data/emote-animsets.txt) | 4,690 | Animation-set resource paths. |
| [Blip sprites](blips.md#complete-sprite-list-cyberpunk-2077-231) | complete Open77 list | Validated native sprite names exposed by the blip API. |

For effects, prefer the runtime catalogue when available:

```lua
local catalog, reason = Open77.vfx.catalog()
if catalog then
  for alias, path in pairs(catalog) do print(alias, path) end
end
```

An extracted row becoming visible in a CSV does not grant a resource permission or make it safe.
The calling resource still needs the relevant manifest permission, and server-owned gameplay state
must always be created through the authoritative server API.

## Promotion checklist

Before adding an extracted candidate to a production resource:

1. Resolve it on the exact supported game build.
2. Spawn it through Open77 with one client, then remove it cleanly.
3. Repeat with two clients and a late joiner in the same routing bucket.
4. Verify streaming out/in, resource stop, player disconnect, and server restart behavior.
5. Check animations, collision, audio, damage, and authority transfer where applicable.
6. Promote it to a small resource-owned allowlist instead of accepting arbitrary client strings.
