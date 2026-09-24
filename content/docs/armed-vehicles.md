# Armed vehicle spawn catalogue

Spawn weapon-equipped vehicles with the `Vehicle.*` records listed below. The catalogue covers Cyberpunk 2077 **2.31 / build 23100**, including Phantom Liberty.

The database declares weapon mounts on **172 vehicle records**. This is not a count of supported armed vehicles: inherited lists may include unattached weapons. Quest, transport, broken and hologram variants can require additional assets or logic.

The **spawn ID** is the full `Vehicle.*` string, not an `Items.*` weapon record, a mount/slot ID, or the numeric network vehicle ID returned after creation. Use [Network vehicles](vehicles.md) for the complete API and [Game data reference](data-reference.md) for other model catalogues.

## Armed model examples

The records below provide native mounted weapons. Model appearance and attachments can change the available armament. See [weapon replication and limitations](vehicle-weapons.md#model-specific-armament) before using a model in a gamemode.

| Vehicle | Spawn ID | Armament |
|---|---|---|
| Militech Basilisk | `Vehicle.v_militech_basilisk` | Cannon, homing missiles, left/right countermeasures |
| Herrera Outlaw, armed Heist variant | `Vehicle.v_sport1_herrera_outlaw_heist_player` | Two mounted machine guns |
| Mizutani Shion Nomad, missile player variant | `Vehicle.v_sport2_mizutani_shion_nomad_player_missiles` | Missile launcher B; three weapon objects attached |

Do not substitute `Vehicle.v_sport1_herrera_outlaw_player` for the armed Heist variant: it is not in this mounted-weapon catalogue. The same caution applies to the ordinary Shion, Type-66, Galena and Colby: use the exact variant ID, not just the family name or a freeroam alias.

## Spawn a network vehicle

Client HUDs can inspect a live vehicle through the [vehicle weapon Lua API](vehicle-weapons.md), including actual attached weapons, selection and available native ammunition counters.

With the system resource `open77_vehicles` running, enter this in the **server console** (replace `1` with the connected player's ID):

```text
vehicle.create.player 1 Vehicle.v_militech_basilisk
vehicle.create.player 1 Vehicle.v_sport1_herrera_outlaw_heist_player
vehicle.create.player 1 Vehicle.v_sport2_mizutani_shion_nomad_player_missiles
```

Run one line for the vehicle you want. These commands create beside the player; they do not automatically seat the player. From chat, prefix the command with `/` and grant its exact `command.vehicle.create.player` ACL permission. Spawning is restricted, not an unrestricted player command.

A **server-side Lua resource** uses the same spawn ID:

```lua
-- open77.lua
permissions { "world.vehicles" }
```

```lua
-- server/main.lua; choose clear ground and the intended routing bucket.
local vehicleId, reason = Open77.vehicles.create({
    record = "Vehicle.v_militech_basilisk",
    position = { x = 405.0, y = -2415.0, z = 183.0 },
    yaw = 0.0,
    bucket = 0,
})
assert(vehicleId, reason)
```

## Player variants at a glance

These **18** `_player` variants declare weapon mounts. Except for the armed examples above, treat these records as experimental: a declared mount does not establish that its weapon can be deployed. The Basilisk is listed separately because its ID does not contain `_player`.

| Spawn ID | Declared mount profile | Support |
|---|---|---|
| `Vehicle.v_sport1_herrera_outlaw_heist_player` | Outlaw MG | Mounted armament |
| `Vehicle.v_sport1_rayfield_caliburn_02_player` | MG | Experimental player variant |
| `Vehicle.v_sport1_rayfield_caliburn_mordred_player` | MG | Experimental player variant |
| `Vehicle.v_sport1_rayfield_caliburn_player` | MG | Experimental player variant |
| `Vehicle.v_sport2_mizutani_shion_nomad_02_player` | MG + missiles (declared) | Experimental player variant |
| `Vehicle.v_sport2_mizutani_shion_nomad_player` | MG + missiles (declared) | Experimental player variant |
| `Vehicle.v_sport2_mizutani_shion_nomad_player_missiles` | MG + missiles (declared) | Mounted armament |
| `Vehicle.v_sport2_quadra_type66_nomad_player` | MG + missiles (declared) | Experimental player variant |
| `Vehicle.v_sport2_quadra_type66_nomad_player_03` | MG + missiles (declared) | Experimental player variant |
| `Vehicle.v_standard25_thorton_colby_nomad_player` | MG + missiles (declared) | Experimental player variant |
| `Vehicle.v_standard25_thorton_colby_nomad_player_missiles` | MG + missiles (declared) | Experimental player variant |
| `Vehicle.v_standard2_archer_quartz_nomad_player` | MG + missiles (declared) | Experimental player variant |
| `Vehicle.v_standard2_archer_quartz_nomad_player_02` | MG + missiles (declared) | Experimental player variant |
| `Vehicle.v_standard2_thorton_galena_nomad_player` | MG + missiles (declared) | Experimental player variant |
| `Vehicle.v_standard2_thorton_galena_nomad_player_missiles` | MG + missiles (declared) | Experimental player variant |
| `Vehicle.v_standard3_mahir_supron_kurtz_player` | MG + missiles (declared) | Experimental player variant |
| `Vehicle.v_standard3_militech_hellhound_player` | MG + missiles (declared) | Experimental player variant |
| `Vehicle.v_utility4_chevalier_legatus_player` | MG | Experimental player variant |

## Complete record inventory

All **172** unique source records are listed below, including inherited and special-purpose variants. **Declared** describes the TweakDB mount list, not a guarantee of functional armament. Refer to the armed model examples and inspect attached weapons with the Lua API.

### Basilisk / Panzer — cannon, missiles and countermeasures (7)

Four declared mounts: cannon, homing missile launcher, left and right countermeasure launchers.

| Spawn ID | Validation / caution |
|---|---|
| `Vehicle.panam_panzer` | Quest / scene / encounter — firing not checked |
| `Vehicle.panam_panzer_q202` | Quest / scene / encounter — firing not checked |
| `Vehicle.q114_militech_panzer` | Quest / scene / encounter — firing not checked |
| `Vehicle.q114_nomad_panzer` | Quest / scene / encounter — firing not checked |
| `Vehicle.v_militech_basilisk` | Mounted armament |
| `Vehicle.v_militech_basilisk_militech` | Other variant — firing not checked |
| `Vehicle.v_militech_basilisk_transport` | Special/broken variant — inspect before use |

### Outlaw Heist — dedicated machine guns (2)

Two declared Outlaw-specific power-weapon mounts: left and right.

| Spawn ID | Validation / caution |
|---|---|
| `Vehicle.v_sport1_herrera_outlaw_heist` | Other variant — firing not checked |
| `Vehicle.v_sport1_herrera_outlaw_heist_player` | Mounted armament |

### Machine-gun mount records (27)

Two declared standard power-weapon mounts: left A and right A. Actual attachment still depends on the model's configuration.

| Spawn ID | Validation / caution |
|---|---|
| `Vehicle.cs_savable_rayfield_caliburn` | Quest / scene / encounter — firing not checked |
| `Vehicle.cs_savable_rayfield_caliburn_broken` | Special/broken variant — inspect before use |
| `Vehicle.cs_savable_rayfield_caliburn_disabled_interactions` | Special/broken variant — inspect before use |
| `Vehicle.hackable_rayfield_caliburn` | Quest / scene / encounter — firing not checked |
| `Vehicle.hil_06_objective_car` | Quest / scene / encounter — firing not checked |
| `Vehicle.q000_nomad_v_sport1_rayfield_caliburn_quest` | Quest / scene / encounter — firing not checked |
| `Vehicle.q306_oa_rayfield` | Quest / scene / encounter — firing not checked |
| `Vehicle.v_sport1_rayfield_caliburn` | Other variant — firing not checked |
| `Vehicle.v_sport1_rayfield_caliburn_02_player` | Experimental player variant |
| `Vehicle.v_sport1_rayfield_caliburn_courier` | Other variant — firing not checked |
| `Vehicle.v_sport1_rayfield_caliburn_mordred` | Other variant — firing not checked |
| `Vehicle.v_sport1_rayfield_caliburn_mordred_player` | Experimental player variant |
| `Vehicle.v_sport1_rayfield_caliburn_murdered` | Other variant — firing not checked |
| `Vehicle.v_sport1_rayfield_caliburn_player` | Experimental player variant |
| `Vehicle.v_sport1_rayfield_caliburn_quest` | Other variant — firing not checked |
| `Vehicle.v_utility4_chevalier_centurion` | Other variant — firing not checked |
| `Vehicle.v_utility4_chevalier_centurion_cargo` | Other variant — firing not checked |
| `Vehicle.v_utility4_chevalier_centurion_cargo_courier` | Other variant — firing not checked |
| `Vehicle.v_utility4_chevalier_centurion_cargo_dogtown` | Other variant — firing not checked |
| `Vehicle.v_utility4_chevalier_centurion_flatbed` | Other variant — firing not checked |
| `Vehicle.v_utility4_chevalier_centurion_flatbed_poor` | Other variant — firing not checked |
| `Vehicle.v_utility4_chevalier_centurion_flatbed_poor_dogtown` | Other variant — firing not checked |
| `Vehicle.v_utility4_chevalier_centurion_poor` | Other variant — firing not checked |
| `Vehicle.v_utility4_chevalier_centurion_poor_dogtown` | Other variant — firing not checked |
| `Vehicle.v_utility4_chevalier_legatus_aquila_basic` | Other variant — firing not checked |
| `Vehicle.v_utility4_chevalier_legatus_basic` | Other variant — firing not checked |
| `Vehicle.v_utility4_chevalier_legatus_player` | Experimental player variant |

### Shared machine-gun and missile mount records (136)

Nine possible mounts: power weapons left/right A, B and C, plus missile launchers A, B and C. This is a shared list of alternatives, NOT nine weapons fitted to every vehicle. Entries such as Caliburn, Centurion and quest variants must not be treated as armed solely because they inherit this list.

| Spawn ID | Validation / caution |
|---|---|
| `Vehicle.aldecado_archer_quartz_heat_3` | Quest / scene / encounter — firing not checked |
| `Vehicle.aldecado_thorton_colby_heat_3` | Quest / scene / encounter — firing not checked |
| `Vehicle.aldecado_thorton_galena_heat_1` | Quest / scene / encounter — firing not checked |
| `Vehicle.aldecado_thorton_galena_heat_2` | Quest / scene / encounter — firing not checked |
| `Vehicle.cs_savable_archer_quartz_nomad_broken` | Special/broken variant — inspect before use |
| `Vehicle.cs_savable_archer_quartz_nomad_quest` | Quest / scene / encounter — firing not checked |
| `Vehicle.cs_savable_mahir_supron_kurtz` | Quest / scene / encounter — firing not checked |
| `Vehicle.cs_savable_quadra_type66_nomad` | Quest / scene / encounter — firing not checked |
| `Vehicle.cs_savable_quadra_type66_nomad_broken` | Special/broken variant — inspect before use |
| `Vehicle.cs_savable_quadra_type66_nomad_disabled_interactions` | Special/broken variant — inspect before use |
| `Vehicle.cs_savable_thorton_colby_nomad` | Quest / scene / encounter — firing not checked |
| `Vehicle.cs_savable_thorton_colby_nomad_broken` | Special/broken variant — inspect before use |
| `Vehicle.cs_savable_thorton_galena_nomad` | Quest / scene / encounter — firing not checked |
| `Vehicle.cs_savable_thorton_galena_nomad_broken` | Special/broken variant — inspect before use |
| `Vehicle.cs_savable_thorton_galena_nomad_disabled_interactions` | Special/broken variant — inspect before use |
| `Vehicle.cs_savable_v_standard3_militech_hellhound_police` | Quest / scene / encounter — firing not checked |
| `Vehicle.cs_savable_v_standard3_militech_hellhound_police_siren` | Quest / scene / encounter — firing not checked |
| `Vehicle.cs_v_sport2_mizutani_shion_nomad` | Quest / scene / encounter — firing not checked |
| `Vehicle.cs_v_sport2_mizutani_shion_nomad_broken` | Special/broken variant — inspect before use |
| `Vehicle.cs_v_sport2_mizutani_shion_nomad_disabled_interactions` | Special/broken variant — inspect before use |
| `Vehicle.cs_v_sport2_mizutani_shion_nomad_wraith` | Quest / scene / encounter — firing not checked |
| `Vehicle.cs_v_sport2_mizutani_shion_nomad_wraith_broken` | Special/broken variant — inspect before use |
| `Vehicle.cs_v_sport2_mizutani_shion_nomad_wraith_disabled_interactions` | Special/broken variant — inspect before use |
| `Vehicle.cs_v_standard2_thorton_galena_nomad` | Quest / scene / encounter — firing not checked |
| `Vehicle.cs_v_standard2_thorton_galena_nomad_broken` | Special/broken variant — inspect before use |
| `Vehicle.cs_v_standard2_thorton_galena_nomad_disabled_interactions` | Special/broken variant — inspect before use |
| `Vehicle.ep1_hackable_mahir_supron_kurtz` | Quest / scene / encounter — firing not checked |
| `Vehicle.hackable_archer_quartz_nomad_quest` | Quest / scene / encounter — firing not checked |
| `Vehicle.hackable_militech_hellhound_police_siren` | Quest / scene / encounter — firing not checked |
| `Vehicle.hackable_mizutani_shion_nomad` | Quest / scene / encounter — firing not checked |
| `Vehicle.hackable_mizutani_shion_nomad_wraith` | Quest / scene / encounter — firing not checked |
| `Vehicle.hackable_quadra_type66_nomad` | Quest / scene / encounter — firing not checked |
| `Vehicle.hackable_thorton_colby_nomad` | Quest / scene / encounter — firing not checked |
| `Vehicle.hackable_thorton_galena_nomad` | Quest / scene / encounter — firing not checked |
| `Vehicle.kurtz_mahir_supron_heat_3` | Quest / scene / encounter — firing not checked |
| `Vehicle.kurtz_mahir_supron_heat_3_cd` | Quest / scene / encounter — firing not checked |
| `Vehicle.kurtz_thorton_2` | Quest / scene / encounter — firing not checked |
| `Vehicle.ma_bls_ina_se1_22_wraith_car` | Quest / scene / encounter — firing not checked |
| `Vehicle.mitch_vehicle` | Quest / scene / encounter — firing not checked |
| `Vehicle.mq001_scorpion_vehicle` | Quest / scene / encounter — firing not checked |
| `Vehicle.mws_mahir_supron_kurtz` | Quest / scene / encounter — firing not checked |
| `Vehicle.ncpd_hellhound_heat_5` | Quest / scene / encounter — firing not checked |
| `Vehicle.q000_nomad_v_sport2_mizutani_shion_nomad_quest` | Quest / scene / encounter — firing not checked |
| `Vehicle.q000_nomad_v_sport2_quadra_type66_nomad_quest` | Quest / scene / encounter — firing not checked |
| `Vehicle.q000_nomad_v_standard25_thorton_colby_nomad_quest` | Quest / scene / encounter — firing not checked |
| `Vehicle.q000_nomad_v_standard2_archer_quartz_nomad_quest` | Quest / scene / encounter — firing not checked |
| `Vehicle.q000_nomad_v_standard2_thorton_galena_nomad_quest` | Quest / scene / encounter — firing not checked |
| `Vehicle.q114_archer_quartz_nomad` | Quest / scene / encounter — firing not checked |
| `Vehicle.q114_mizutani_shion_nomad` | Quest / scene / encounter — firing not checked |
| `Vehicle.q114_mood_scene_car_001` | Quest / scene / encounter — firing not checked |
| `Vehicle.q114_mood_scene_car_002` | Quest / scene / encounter — firing not checked |
| `Vehicle.q114_mood_scene_car_racer` | Quest / scene / encounter — firing not checked |
| `Vehicle.q114_nomad_car_cassidy` | Quest / scene / encounter — firing not checked |
| `Vehicle.q114_nomad_car_regular_001` | Quest / scene / encounter — firing not checked |
| `Vehicle.q114_nomad_car_teddy` | Quest / scene / encounter — firing not checked |
| `Vehicle.q114_quadra_type66_nomad` | Quest / scene / encounter — firing not checked |
| `Vehicle.q114_thorton_colby_nomad` | Quest / scene / encounter — firing not checked |
| `Vehicle.q114_thorton_galena_nomad` | Quest / scene / encounter — firing not checked |
| `Vehicle.q202_bob_vehicle` | Quest / scene / encounter — firing not checked |
| `Vehicle.q202_teddy_vehicle` | Quest / scene / encounter — firing not checked |
| `Vehicle.q301_wtc_kurt_supron` | Quest / scene / encounter — firing not checked |
| `Vehicle.q302_protest_kurtz_supron` | Quest / scene / encounter — firing not checked |
| `Vehicle.q305_holo_hellhound` | Special/broken variant — inspect before use |
| `Vehicle.q305_maxtac_hellhound` | Quest / scene / encounter — firing not checked |
| `Vehicle.sq004_raffen_shiv_car_hackable_001` | Quest / scene / encounter — firing not checked |
| `Vehicle.sq004_raffen_shiv_car_hackable_002` | Quest / scene / encounter — firing not checked |
| `Vehicle.sq004_raffen_shiv_car_hackable_003` | Quest / scene / encounter — firing not checked |
| `Vehicle.sq027_car_cassidy` | Quest / scene / encounter — firing not checked |
| `Vehicle.sq027_car_teddy` | Quest / scene / encounter — firing not checked |
| `Vehicle.sq027_savable_raffen_shiv_car` | Quest / scene / encounter — firing not checked |
| `Vehicle.sts_bls_ina_07_ghost_car` | Quest / scene / encounter — firing not checked |
| `Vehicle.sts_bls_ina_08_pickup_car` | Quest / scene / encounter — firing not checked |
| `Vehicle.v_sport2_mizutani_shion_nomad` | Other variant — firing not checked |
| `Vehicle.v_sport2_mizutani_shion_nomad_02_player` | Experimental player variant |
| `Vehicle.v_sport2_mizutani_shion_nomad_buggy` | Other variant — firing not checked |
| `Vehicle.v_sport2_mizutani_shion_nomad_buggy_quest` | Other variant — firing not checked |
| `Vehicle.v_sport2_mizutani_shion_nomad_courier` | Other variant — firing not checked |
| `Vehicle.v_sport2_mizutani_shion_nomad_ncu` | Other variant — firing not checked |
| `Vehicle.v_sport2_mizutani_shion_nomad_player` | Experimental player variant |
| `Vehicle.v_sport2_mizutani_shion_nomad_player_missiles` | Mounted armament |
| `Vehicle.v_sport2_mizutani_shion_nomad_quest` | Other variant — firing not checked |
| `Vehicle.v_sport2_mizutani_shion_nomad_samum` | Other variant — firing not checked |
| `Vehicle.v_sport2_mizutani_shion_nomad_technical` | Other variant — firing not checked |
| `Vehicle.v_sport2_mizutani_shion_nomad_wraith` | Other variant — firing not checked |
| `Vehicle.v_sport2_quadra_type66_nomad` | Other variant — firing not checked |
| `Vehicle.v_sport2_quadra_type66_nomad_courier` | Other variant — firing not checked |
| `Vehicle.v_sport2_quadra_type66_nomad_kb` | Other variant — firing not checked |
| `Vehicle.v_sport2_quadra_type66_nomad_player` | Experimental player variant |
| `Vehicle.v_sport2_quadra_type66_nomad_player_03` | Experimental player variant |
| `Vehicle.v_sport2_quadra_type66_nomad_quest` | Other variant — firing not checked |
| `Vehicle.v_sport2_quadra_type66_nomad_tribute` | Other variant — firing not checked |
| `Vehicle.v_sport2_quadra_type66_nomad_wraith` | Other variant — firing not checked |
| `Vehicle.v_standard25_thorton_colby_nomad` | Other variant — firing not checked |
| `Vehicle.v_standard25_thorton_colby_nomad_courier` | Other variant — firing not checked |
| `Vehicle.v_standard25_thorton_colby_nomad_courier_expanded` | Other variant — firing not checked |
| `Vehicle.v_standard25_thorton_colby_nomad_disabled_interactions` | Special/broken variant — inspect before use |
| `Vehicle.v_standard25_thorton_colby_nomad_mule` | Other variant — firing not checked |
| `Vehicle.v_standard25_thorton_colby_nomad_ncu` | Other variant — firing not checked |
| `Vehicle.v_standard25_thorton_colby_nomad_player` | Experimental player variant |
| `Vehicle.v_standard25_thorton_colby_nomad_player_missiles` | Experimental player variant |
| `Vehicle.v_standard25_thorton_colby_nomad_prevention` | Other variant — firing not checked |
| `Vehicle.v_standard25_thorton_colby_nomad_quest` | Other variant — firing not checked |
| `Vehicle.v_standard25_thorton_colby_nomad_vulture` | Other variant — firing not checked |
| `Vehicle.v_standard25_thorton_colby_nomad_wraith` | Other variant — firing not checked |
| `Vehicle.v_standard25_thorton_colby_pickup_kurtz_cd` | Other variant — firing not checked |
| `Vehicle.v_standard25_thorton_colby_pickup_kurtz_cd_no_hull` | Other variant — firing not checked |
| `Vehicle.v_standard25_thorton_colby_pickup_nomad__basic_01_mq304` | Other variant — firing not checked |
| `Vehicle.v_standard2_archer_quartz_nomad` | Other variant — firing not checked |
| `Vehicle.v_standard2_archer_quartz_nomad_courier` | Other variant — firing not checked |
| `Vehicle.v_standard2_archer_quartz_nomad_disabled_interactions` | Special/broken variant — inspect before use |
| `Vehicle.v_standard2_archer_quartz_nomad_player` | Experimental player variant |
| `Vehicle.v_standard2_archer_quartz_nomad_player_02` | Experimental player variant |
| `Vehicle.v_standard2_archer_quartz_nomad_prevention` | Other variant — firing not checked |
| `Vehicle.v_standard2_archer_quartz_nomad_quest` | Other variant — firing not checked |
| `Vehicle.v_standard2_archer_quartz_nomad_wraith` | Other variant — firing not checked |
| `Vehicle.v_standard2_thorton_galena_nomad` | Other variant — firing not checked |
| `Vehicle.v_standard2_thorton_galena_nomad_courier` | Other variant — firing not checked |
| `Vehicle.v_standard2_thorton_galena_nomad_courier_expanded` | Other variant — firing not checked |
| `Vehicle.v_standard2_thorton_galena_nomad_locust` | Other variant — firing not checked |
| `Vehicle.v_standard2_thorton_galena_nomad_player` | Experimental player variant |
| `Vehicle.v_standard2_thorton_galena_nomad_player_missiles` | Experimental player variant |
| `Vehicle.v_standard2_thorton_galena_nomad_prevention` | Other variant — firing not checked |
| `Vehicle.v_standard2_thorton_galena_nomad_prevention_2` | Other variant — firing not checked |
| `Vehicle.v_standard2_thorton_galena_nomad_quest` | Other variant — firing not checked |
| `Vehicle.v_standard2_thorton_galena_nomad_red_green` | Other variant — firing not checked |
| `Vehicle.v_standard2_thorton_galena_nomad_scorpion` | Other variant — firing not checked |
| `Vehicle.v_standard2_thorton_galena_nomad_wraith` | Other variant — firing not checked |
| `Vehicle.v_standard3_mahir_supron_kurtz` | Other variant — firing not checked |
| `Vehicle.v_standard3_mahir_supron_kurtz_basic_mq304` | Other variant — firing not checked |
| `Vehicle.v_standard3_mahir_supron_kurtz_overlander` | Other variant — firing not checked |
| `Vehicle.v_standard3_mahir_supron_kurtz_player` | Experimental player variant |
| `Vehicle.v_standard3_mahir_supron_kurtz_prevention` | Other variant — firing not checked |
| `Vehicle.v_standard3_militech_hellhound` | Other variant — firing not checked |
| `Vehicle.v_standard3_militech_hellhound_courier` | Other variant — firing not checked |
| `Vehicle.v_standard3_militech_hellhound_player` | Experimental player variant |
| `Vehicle.v_standard3_militech_hellhound_police` | Other variant — firing not checked |

## Weapon and attachment IDs

These are **not vehicle spawn IDs**. They identify the weapon item and its attachment slot when inspecting a vehicle or maintaining the synchronization adapter.

| Weapon item record | Attachment slot |
|---|---|
| `Items.Panzer_Cannon` | `AttachmentSlots.PanzerCannon` |
| `Items.Vehicle_Missile_Launcher_B` | `AttachmentSlots.VehicleMissileLauncherB` |
| `Items.Vehicle_Missile_Launcher_C` | `AttachmentSlots.VehicleMissileLauncherC` |
| `Items.Vehicle_Missile_Launcher_A` | `AttachmentSlots.VehicleMissileLauncherA` |
| `Items.Vehicle_Power_Weapon_Left_A` | `AttachmentSlots.VehiclePowerWeaponLeftA` |
| `Items.Panzer_Missile_Launcher` | `AttachmentSlots.PanzerHomingMissiles` |
| `Items.Vehicle_Power_Weapon_Left_B` | `AttachmentSlots.VehiclePowerWeaponLeftB` |
| `Items.Vehicle_Power_Weapon_Left_C` | `AttachmentSlots.VehiclePowerWeaponLeftC` |
| `Items.Vehicle_Power_Weapon_Right_C` | `AttachmentSlots.VehiclePowerWeaponRightC` |
| `Items.Vehicle_Power_Weapon_Right_B` | `AttachmentSlots.VehiclePowerWeaponRightB` |
| `Items.Vehicle_Power_Weapon_Right_A` | `AttachmentSlots.VehiclePowerWeaponRightA` |
| `Items.Panzer_Counter_Measures_Launcher` | `AttachmentSlots.PanzerCounterMeasuresLeft` |
| `Items.Panzer_Counter_Measures_Launcher` | `AttachmentSlots.PanzerCounterMeasuresRight` |
| `Items.Vehicle_Power_Weapon_OutlawHeist_Left_A` | `AttachmentSlots.VehiclePowerWeaponLeftA` |
| `Items.Vehicle_Power_Weapon_OutlawHeist_Right_A` | `AttachmentSlots.VehiclePowerWeaponRightA` |

## Sources and maintenance

### Machine-readable catalogue

[Download the website JSON catalogue](/data/vehicle-weapons-2.31.json) for tooling
and agents. It is the same extracted catalogue used by the server: `gameBuild`,
a `mounts` array of 15 definitions and a `vehicles` object mapping each full spawn
record to an ordered array of mount IDs. Its 172 keys are declarations, not
172 verified spawn/firing tests. Match each vehicle mount ID to `mount.mountId`;
the array position plus one is the stable Lua mount index for that model.

| Source field | Interpretation |
|---|---|
| `mount`, `mountId` | Vehicle-weapon mount record, distinct from the vehicle spawn record. |
| `weapon`, `weaponId` | Weapon item identity. Multiple slots may use the same item. |
| `slot`, `slotId` | Attachment-slot identity; combine it with the item to identify the actual mount. |
| `cycleTime` | Extracted cycle parameter in seconds, not a per-projectile event interval or cooldown remaining. |
| `wholeBurstProjectiles` | Native declared burst size: 15 for Panzer missiles, 8 for car missiles. It is not magazine ammunition. |
| `singleShotProjectiles`, `singleProjectileCycleTime` | Additional native emission parameters; not live state. |
| `range`, `explosionRadius` | Extracted default data, not guaranteed physical reach or the active attack's blast radius. A zero radius does not prove no explosion. |
| `shootAnimEvent`, `genericShoot`, `genericTick` | Native configuration metadata; not public Lua commands. |
| `minYaw`, `maxYaw`, `minPitch`, `maxPitch` | Declared mount limits, not the vehicle's live turret aim. |

For example, the Panzer cannon declares `cycleTime=0.3`; its homing launcher
declares `cycleTime=2` but emits multiple missiles in a salvo. Countermeasure
mounts can declare one whole-burst projectile while emitting multiple
projectiles. Do not infer network admission or ammunition from a
single catalogue field; the [multiplayer guide](vehicle-weapons.md) separates
native behavior from the server's policy.

### Provenance and regeneration

- [Machine-readable mount catalogue](../server/src/Open77.Server.Core/Vehicles/vehicle-weapons-2.31.json): 172 vehicle records and 15 mount definitions, extracted from the installed 2.31 base and expansion TweakDB data.
- [Extraction tool](../scripts/research/vehicle-weapons-catalog/Program.cs): model/mount/item/slot bindings and native salvo metadata; it does not inspect each appearance's mounted entities.
- [Vehicle weapon synchronization research](../docs/research/vehicle-weapons-and-combat.md): live observations, validation boundaries and remaining work.
- [Complete vehicle model catalogue](../docs/vehicle-models.md): broader model/template inventory, including unarmed vehicles.

After a game update, regenerate the source catalogue and reconcile this inventory. Promote a record to **Mounted armament** only after spawning that exact variant and observing its real attached weapon fire. Archive-dependent vehicles also require the corresponding game content to be installed.
