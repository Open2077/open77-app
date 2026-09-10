# Armed vehicles and weapon Lua API

Read mounted armament from client resources to build vehicle HUDs, ammo displays and developer tools.
These APIs distinguish **declared model mounts**, **actual attached weapon objects** and
**the driver's selected weapons**. See the [spawn catalogue](armed-vehicles.md) for model IDs.

## Release and compatibility

Vehicle-weapon replication and the twelve client getters below ship in **Open77
2.31.13+op77.53**, using **network protocol 1.24**, for Cyberpunk 2077 2.31
(game build 23100). Update the client and dedicated server together: protocol
1.23 peers cannot join a 1.24 session. Updating a CDN package does not update a
running dedicated server; its operator must install the matching release.

This is **Developer Preview** functionality, not a claim that every armed model
or visual effect is fully validated. Keep `open77_vehicles` loaded for the shared
vehicle helpers and diagnostic commands. Native replication runs in the client
and server binaries; a HUD resource does not need to forward shots itself.

## How multiplayer weapon sync works

1. A server resource creates a canonical [network vehicle](vehicles.md). Model
   declarations come from the server's extracted catalogue, never a client-supplied
   list of permitted weapons.
2. The seated driver with the current vehicle authority lease supplies actual
   mounted-shot events, selection and supported turret inputs. Merely simulating
   the chassis, sitting in a passenger seat, or reading a Lua snapshot does not
   grant weapon authority.
3. The server checks the driver, seat, authority generation, routing bucket,
   model/slot, sequence, firing cadence and bounded geometry before accepting a
   shot. Accepted projectiles carry flight updates and a terminal impact,
   explosion or expiry; expiry alone is not an explosion.
4. Observers receive weapon state and presentation events. Their effects do not
   spawn a second damaging projectile. Hit reports identify targets, not damage
   amounts; the server admits and prices damage through its normal combat rules.

Selection and in-flight state can be restored when a vehicle enters a client's
stream. Completed shots are not replayed as new attacks. Seat exit, ownership
changes, destruction and disconnect clear weapon selection or reject stale
controller messages. Already-admitted projectiles may finish after the driver
exits; getting out is not a way to cancel their consequences.

Do not call native NPC shooting or spawn another damaging attack to make an
observer look like it fired. That duplicates gameplay instead of adding a visual
effect. There is currently **no public Lua mounted-weapon fire/select/ammo setter**.
Use the read-only API for HUDs; use server-side vehicle and combat policy for
shared world changes.

## What has been validated

The following observations used exact model records and two private clients.
They do not certify every appearance in the same family.

| Exact model | Confirmed observations |
|---|---|
| `Vehicle.v_militech_basilisk` | Four attached mounts; cannon shots and impacts delivered to the observer; vehicle damage and PvP damage/respawn exercised; native missile and countermeasure projectile streams observed. |
| `Vehicle.v_sport1_herrera_outlaw_heist_player` | Two mounted machine guns; accepted rounds applied canonical vehicle damage without duplicate charges. |
| `Vehicle.v_sport2_mizutani_shion_nomad_player_missiles` | Nine declared mounts, three attached objects at indices 5, 6 and 8; MG selection uses 5/6, missile selection uses 8; native salvos and selection reached the observer. |

**Still limited or awaiting acceptance:** remote/passenger ammunition, heat,
reload and lock details are not replicated; observer weapon-deployment meshes,
audio fidelity, NPC damage and overlapping missile-hit association still need
further acceptance. `weapon.active` confirms selected state, not that an observer's
gun mesh is visibly deployed. Missing local native data must remain unavailable
in a HUD rather than guessed.

## Current damage policy

These are **Open77 .53 server balance values**, not extracted native damage
prices and not a guarantee of final applied damage. Normal team, god-mode,
invulnerability and Lua damage arbitration still apply.

| Weapon category | Nominal player HP | Nominal vehicle health fraction |
|---|---:|---:|
| Cannon | 70 | 0.20 |
| Missile | 30 | 0.06 |
| Countermeasure | 15 | 0.025 |
| Machine gun | 12 | 0.012 |

The server requires an admitted projectile terminal and a plausible canonical
target in the same bucket, and deduplicates repeated projectile/target receipts.
Clients cannot choose the damage price. NPC damage has an implementation path
but is not yet live-validated by the vehicle-weapon acceptance tests.

## Start with a known model

Use the [catalogue's spawn examples](armed-vehicles.md#spawn-a-network-vehicle)
to create a network vehicle from the server console or a resource with
`world.vehicles`. Creating a vehicle does not seat a player or prove its current
appearance attaches every declared mount. Enter normally or use the existing
server-authoritative seat APIs, then inspect it with `getWeaponState`.

Selection and firing use the game's vehicle controls, including player rebinds.
In the tested default PC controls, `1` selects the Shion's MGs and `2` its missile
launcher. Treat those as an observed binding, not a hard-coded Open77 key API.
Do not assume an ordinary Outlaw or Shion variant is the armed player variant.

## Manifest and runtime

```lua
resource "vehicle_weapon_hud"
version "1.0.0"
client_script "client/main.lua"
permissions { "vehicles.read" }
```

All functions below are **client-side, synchronous, read-only** calls under `Open77.vehicles`.
They return data directly, not a Promise. They cannot spawn a vehicle, select/fire an arm,
change ammunition or apply damage. Network authority remains on the server.

Pass the **canonical network vehicle ID** from `Open77.vehicles.getPlayerSeat().vehicleId`
or `Open77.vehicles.all()[i].id`. Do not pass the `entity`, `engineEntity`, weapon ID
or slot ID. Model queries instead take the full `Vehicle.*` record string.

## Function reference

The searchable [client vehicle API reference](/docs/api/client/open77-vehicles)
contains the individual signatures and examples. There are no server versions
of these twelve armament getters.

| Function | Arguments | Result |
|---|---|---|
| `Open77.vehicles.getWeaponModel` | `record` | Model table, or nil, reason. Reads the weapon mounts declared by a vehicle model. |
| `Open77.vehicles.modelHasWeaponMounts` | `record` | boolean, or nil, reason. Checks whether a vehicle model declares any weapon mounts. |
| `Open77.vehicles.getWeaponState` | `vehicleId` | Snapshot table, or nil, reason. Reads one coherent mounted-weapon snapshot. |
| `Open77.vehicles.isArmed` | `vehicleId` | boolean, or nil, reason. Checks whether a streamed vehicle actually has attached weapons. |
| `Open77.vehicles.getWeapons` | `vehicleId` | Array of weapon tables, or nil, reason. Lists the weapon objects actually attached to a streamed vehicle. |
| `Open77.vehicles.getActiveWeapons` | `vehicleId` | Array of weapon tables, or nil, reason. Lists the attached weapons selected by the driver. |
| `Open77.vehicles.getWeapon` | `vehicleId, mountIndex` | Weapon table, or nil, reason. Reads one weapon mount by its stable one-based index. |
| `Open77.vehicles.getWeaponAmmo` | `vehicleId, mountIndex` | Ammo table, or nil, reason. Reads available native ammunition counters for a mounted weapon. |
| `Open77.vehicles.getWeaponType` | `vehicleId, mountIndex` | Category string, or nil, reason. Reads a mounted weapon's stable category. |
| `Open77.vehicles.isWeaponActive` | `vehicleId, mountIndex` | boolean, or nil, reason. Checks whether the driver selected a particular attached mount. |
| `Open77.vehicles.getWeaponCount` | `vehicleId` | integer, or nil, reason. Counts weapon objects attached to a streamed vehicle. |
| `Open77.vehicles.getWeaponAim` | `vehicleId` | Aim table, or nil, reason. Reads the Basilisk's captured or replicated turret inputs. |

Failures return `nil, reason`, including boolean queries. Test `value == nil` when
you need to distinguish an error from a valid `false`.

## Model information

```lua
local model, reason = Open77.vehicles.getWeaponModel(
    "Vehicle.v_militech_basilisk")
if not model then print(reason); return end

print(model.hasWeaponMounts, model.declaredCount)
for _, mount in ipairs(model.mounts) do
    print(mount.index, mount.record, mount.slot, mount.type)
end
```

A model result contains `record`, `hasWeaponMounts`, `declaredCount` and `mounts`.
Mount entries include the static identification and timing fields described below;
they have no attached object or live ammo in a model-only query.

**A declared mount is not proof of an equipped gun.** Some game records share a list of
nine possible mounts while their current appearance attaches only three. Use `isArmed(id)`
or `getWeapons(id)` to inspect a real streamed vehicle. A valid unarmed model returns
`hasWeaponMounts=false`; an invalid/unknown model returns an error.

## Vehicle snapshot

`getWeaponState(vehicleId)` returns:

| Field | Meaning |
|---|---|
| `vehicleId`, `record` | Canonical vehicle ID and model record. |
| `streamed` | The native vehicle is attached in this client's world. |
| `localDriver` | This client currently captures the settled, leased driver. |
| `hasWeaponMounts`, `declaredCount` | Static model declarations. |
| `armed`, `attachedCount` | Whether actual weapons are attached and how many. Omitted if the vehicle is not streamed. |
| `selectionKnown` | Whether native-local or received driver selection is available. |
| `activeMask`, `activeCount` | Selected mount bits and count of attached selected weapons. Omitted when selection is unknown. |
| `mounts` | All declared mounts, in stable model order, including unattached ones. |
| `aim` | Optional Basilisk turret input table: `yaw`, `pitch`, `source`. |

Reads of the same live vehicle share a short cache (at most **100 ms**). Polling at 10 Hz
is enough for HUD values; repeatedly calling every getter on every rendered frame does
not provide more precise data. Tables are copies, so changing them in Lua changes nothing in the game.

The `activeMask` uses bit `index - 1`. Prefer `weapon.active` to manual bit operations.
Selection means **selected by the driver**, not “currently firing”, “has ammunition” or
“the remote mesh has finished its deployment animation”.

## Weapon fields and indices

`getWeapons` and `getActiveWeapons` return dense arrays, but **their array positions are
not mount identifiers**. Always pass the returned `weapon.index` to single-weapon getters:

```lua
local weapons, reason = Open77.vehicles.getWeapons(vehicleId)
if weapons then
    for _, weapon in ipairs(weapons) do
        local ammo = Open77.vehicles.getWeaponAmmo(vehicleId, weapon.index)
        print(weapon.index, weapon.type, ammo and ammo.source)
    end
end
```

| Field | Meaning |
|---|---|
| `index` | One-based position in the model's declared mount list. Stable within this model; not across models. |
| `weaponId`, `slotId` | Numeric 40-bit TweakDB IDs. Two mounts may share one weapon item. |
| `record`, `slot` | Known `Items.*` and `AttachmentSlots.*` names; empty for an unknown extension, while IDs remain usable. |
| `type` | `machine_gun`, `cannon`, `missile`, `countermeasure` or `unknown`. |
| `attached` | The matching weapon object currently exists in this slot. |
| `active` | This attached mount is selected; omitted if selection is unknown. |
| `cycleSeconds` | Model's native firing-cycle parameter, not a remaining cooldown timer. |
| `burstProjectiles` | Declared number of projectiles per native burst; not an ammo count. |
| `ammo` | Availability/source and optional native counters, described below. |
| `overheat`, `overheated` | Optional raw native `OverheatPercentage` and forced-overheat-cooldown flag. |
| `reloadPending` | Optional native pending-reload flag; not a progress timer. |
| `targetLocked` | Optional native target-lock flag; not a target's network identity. |
| `triggerMode`, `itemType` | Optional native trigger-mode and item-type record names. Separate from the stable `type` category. |

Ammo/heat/trigger details are read from the **local driver's** actual weapon. They are not
currently transmitted in the weapon-state packet. A passenger or observer must not display
the untouched counters of its own visual weapon object as the driver's remaining ammunition.

## Ammunition availability

`getWeaponAmmo(id, index)` returns an object even when counters are unavailable:

| Field | Meaning |
|---|---|
| `available` | At least one valid native magazine/total counter was read for the local driver. |
| `source` | `native_local`, `not_replicated`, `not_attached` or `unavailable`. |
| `magazine` | Optional rounds currently in the native magazine. Zero is a valid reading. |
| `capacity` | Optional native magazine capacity. |
| `total` | Optional native total-ammunition count. |
| `reserve` | `total - magazine`, only when both exist and total is not smaller than magazine. |

These are **native counters, not a server inventory ledger**. Some mounted weapons use a
heat/cooldown cycle instead of conventional finite magazines. A zero or missing counter must
not be interpreted as proof that firing is disabled, and this API does not fabricate an
“infinite ammunition” flag.

In the tested Basilisk and Shion mounted weapons, `total` reports `2147483647`
(`Int32` maximum), while magazines still change after firing. Treat this as a native
special-case counter, not as a player carrying two billion spare rounds. Prefer
the magazine/capacity and heat fields for those HUDs.

```lua
local function ammoLabel(ammo)
    if not ammo or not ammo.available then return "--" end
    if ammo.magazine ~= nil and ammo.capacity ~= nil then
        return ("%d / %d"):format(ammo.magazine, ammo.capacity)
    end
    return ammo.total ~= nil and tostring(ammo.total) or "--"
end

CreateThread(function()
    while true do
        local seat = Open77.vehicles.getPlayerSeat()
        if seat then
            local weapons = Open77.vehicles.getActiveWeapons(seat.vehicleId)
            for _, weapon in ipairs(weapons or {}) do
                -- Replace print with your HUD update, preferably only on changes.
                print(weapon.type .. " · " .. ammoLabel(weapon.ammo))
            end
        end
        Wait(100)
    end
end)
```

## Turret aim

`getWeaponAim(id)` exposes the Basilisk's named cannon graph inputs in **degrees relative
to the chassis**, not world coordinates or a muzzle ray. `source` is `native_local`
for the capturing driver or `replicated` for a received state. Unsupported models and
unknown state return `nil, "weapon_aim_unavailable"`.

## Errors and streaming

| Reason | Action |
|---|---|
| `permission_denied:vehicles.read` | Declare the read permission in the resource manifest. |
| `vehicle_weapons_unavailable` | This host/client does not provide the backend; use a compatible client build. |
| `invalid_vehicle_record`, `unknown_vehicle_record` | Supply a real `Vehicle.*` model, not an item ID. |
| `invalid_vehicle_id`, `unknown_vehicle` | Use a currently known canonical network vehicle ID. |
| `vehicle_not_streamed` | Wait for the native projection to attach; do not treat this as an unarmed vehicle. |
| `invalid_weapon_index` | Use a one-based integer from `weapon.index` for this model. |
| `weapon_state_unavailable` | Driver selection has not arrived; retry later. |
| `weapon_aim_unavailable` | No supported/current turret-angle source exists. |

A streamed but unarmed vehicle returns `false` from `isArmed`, zero from
`getWeaponCount`, and an empty array from `getWeapons`. A vehicle unknown after a
stream-out returns `unknown_vehicle`; a known pending projection can still provide its
model through `getWeaponState` with `streamed=false`.

## Diagnostics and compatibility

With `open77_vehicles` loaded, the read-only event
`open77:vehicles:weapons:probe` logs up to 32 known vehicles using these public Lua APIs.
It reports mount/selection counts and the ammo source, allowing a HUD bug to be separated
from missing native data.
The server console or an authorized administrator can request it with
`vehicle.weapons.probe <playerId>`. This uses the ordinary restricted command/event
path; it does not require enabling local debug mutations during an active session.

Use `type(Open77.vehicles.getWeaponState) == "function"` for feature detection when
supporting older clients. These calls belong to the client runtime; they do not add
server exports or authorize client-side firing, ammo mutation or damage.

## Troubleshooting

| Symptom | Check |
|---|---|
| Vehicle has declared mounts but no guns | Inspect `streamed`, `attachedCount` and the exact model/appearance. The catalogue is not an equipment guarantee. |
| A passenger's ammo reads unavailable | Expected: `source="not_replicated"`. Show `--`; do not use an observer's native magazine as the driver's ammo. |
| Selection is missing immediately after streaming | Wait for `selectionKnown`; distinguish unknown state from a valid unselected weapon. |
| The wrong weapon is inspected | Pass `weapon.index`, not the position in the dense result array. Shion indices 5/6/8 are not 1/2/3. |
| A shot has no applied damage | Check current seat/lease, bucket, target protection and accepted terminal/hit evidence. A visible effect is not proof of admitted damage. |
| Client cannot join after updating | Confirm both peers use protocol 1.24 and a matching release before investigating the model. |

## Sources

- [Vehicle weapon research](../docs/research/vehicle-weapons-and-combat.md): measured native callbacks, two-client tests, failure analysis and remaining acceptance work.
- [Catalogue exporter](../scripts/research/vehicle-weapons-catalog/Program.cs): typed base/Phantom Liberty TweakDB extraction, not per-appearance runtime validation.
- [Authoritative catalogue](../server/src/Open77.Server.Core/Vehicles/vehicle-weapons-2.31.json): exact model/mount/item/slot associations used by the server.
- [Spawn catalogue and source-field caveats](armed-vehicles.md): all 172 records, the 15 mount definitions and validated examples.
