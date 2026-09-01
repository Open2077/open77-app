# Weapon Lua API

Open77 exposes the local player's three standard `EquipmentArea.Weapon` slots
as an asynchronous client API and ships `open77_weapons` as the authenticated
server-to-owner relay. Calls use exact TweakDB records such as
`Items.Preset_Lexington_Default`.

This surface intentionally rejects grenades (`QuickSlot`), heavy weapons
(`WeaponHeavy`), and arm cyberware (`ArmsCW`): those equipment areas have
different REDengine lifecycles.

## Client permissions and methods

Declare `player.weapons.read` for `slots`, `snapshot`, and `all`. Declare
`player.weapons.edit` for mutation.

| Method | Purpose |
|---|---|
| `Open77.weapons.slots()` | Return `{ 1, 2, 3 }`. |
| `Open77.weapons.assign(record, slot, options?)` | Put a template in one exact slot. |
| `Open77.weapons.setActive(slot)` | Select and draw an assigned slot. |
| `Open77.weapons.setActive(record, options?)` | Reuse or equip a template, then draw it. |
| `Open77.weapons.activate(...)` | Alias of `setActive`. |
| `Open77.weapons.remove(slot)` / `unequip(slot)` | Clear a slot without deleting inventory. |
| `Open77.weapons.holster()` | Holster without changing the loadout. |
| `Open77.weapons.setAmmo(slot, amounts)` | Set exact spare rounds and/or magazine rounds. |
| `Open77.weapons.snapshot()` / `all()` | Request every slot's verified state. |

`assign` options are `active` (default `false`) and `addToInventory` (default
`true`). Template-form `setActive` accepts `slot` as a placement fallback and
`addToInventory`; if the template is already assigned, its existing slot wins.

`setAmmo` accepts `{ reserve = 120, magazine = 18, activate = true }`. At least
one count is required; an omitted count is preserved. `reserve` is the spare
HUD count, while `magazine` is the loaded count and may not exceed the live
weapon capacity. `activate = true` selects and draws the requested slot when
needed; otherwise a non-instantiated weapon returns `weapon_not_drawn`.

```lua
local requestId, reason = Open77.weapons.assign(
  "Items.Preset_Lexington_Default", 1,
  { active = true, addToInventory = true })
assert(requestId, reason)

Open77.weapons.assign("Items.Preset_Katana_Default", 2)
Open77.weapons.setActive(2)
Open77.weapons.setAmmo(1, { reserve = 120, magazine = 18, activate = true })
```

The returned request ID only proves that the request was validated and queued.
`EquipmentSystemPlayerData` owns the actual loadout and runs in REDscript, so
completion is asynchronous:

```lua
AddEventHandler("open77:weapons:completed", function(
  requestId, operation, accepted, reason, slot, record, tweakDbId, active, drawn,
  ammoRecord, ammoTweakDbId, ammoTotal, ammoReserve, magazine, capacity)
  if accepted ~= "true" then
    print("weapon request failed", operation, reason)
  end
end)
```

Client event arguments use the generic string event transport. Compare boolean
fields with `"true"`, IDs with `tostring(requestId)`, and retain `tweakDbId` as
an opaque hexadecimal string.

A snapshot emits one state row per slot before its completion:

```lua
AddEventHandler("open77:weapons:state", function(
  requestId, slot, record, tweakDbId, active, drawn, locked,
  ammoRecord, ammoTweakDbId, ammoTotal, ammoReserve, magazine, capacity)
  print(slot, record, active, drawn, locked)
end)
```

An empty `tweakDbId` means an empty slot. `record` is restored for templates
previously validated through this API; it may remain empty for an item equipped
by another pipeline because shipping REDengine builds do not always retain the
reverse TweakDB name table. Use `equipped`/`tweakDbId` as the presence test.
Ammo fields report the shared total, spare reserve, loaded magazine and live
capacity. An inactive slot can still report its ammo type and total, but its
reserve/magazine/capacity are unavailable (`-1`) until the weapon object exists.

## Server-targeted API

A server resource declares:

```lua
dependency "open77_weapons >=0.1.0"
permission "network.events"
```

It can then target the authenticated owner client:

```lua
local requestId, reason = Open77.weapons.assign(
  playerId, "Items.Preset_Lexington_Default", 1, { active = true })
assert(requestId, reason)

Open77.weapons.setActive(playerId, 1)
Open77.weapons.setActive(
  playerId, "Items.Preset_Katana_Default", { slot = 2 })
Open77.weapons.remove(playerId, 3)
Open77.weapons.holster(playerId)
Open77.weapons.setAmmo(
  playerId, 1, { reserve = 120, magazine = 18, activate = true })
Open77.weapons.requestSnapshot(playerId)
```

`activate` and `unequip` are server aliases. Results return only to the server
resource VM that created the namespaced request:

```lua
AddEventHandler("open77:weapons:completed", function(
  playerId, requestId, operation, accepted, reason, result)
  if not accepted then print(playerId, operation, reason) end
end)
```

Mutation `result` contains `slot`, `record`, `tweakDbId`, `active`, `drawn`, and
an `ammo` table with `record`, `tweakDbId`, `total`, `reserve`, `magazine`, and
`capacity` when applicable.
Snapshot `result` is an array of slot rows that additionally contain
`equipped` and `locked`. The relay matches the authenticated source, request
ID, and operation; unanswered calls complete with `request_timeout` after ten
seconds.

## ACL-gated admin commands

The official resource registers:

```text
/weapon.give <playerId|me> <template> [slot=1] [active=true]
/weapon.remove <playerId|me> <slot>
/weapon.ammo <playerId|me> <slot> <reserve> [magazine]
```

They require `command.weapon.give`, `command.weapon.remove`, and
`command.weapon.ammo` respectively; the built-in `admin` role's `command.*`
includes all three. `me` is available only
to an in-game issuer, slots are `1..3`, and `active` defaults to `true`. The
command reports completion only after the authenticated target client verifies
the REDengine result. `weapon.ammo` draws the slot if needed, preserves the
magazine when omitted, and reports all verified counts. Removal clears the slot
without deleting inventory.

## Authority and failures

`addToInventory = true` creates a local presentation item. It does not grant
or persist authoritative inventory. Server code must validate the record
against its own allowlist, commit ownership first, and only then project it to
the target client. Never forward a client-chosen arbitrary record.

Immediate failures include permission denials, `invalid_weapon_template`,
`template_is_not_weapon`, `invalid_weapon_slot`, `player_unavailable`,
`script_bridge_unavailable`, and `queue_full`. REDengine completion failures
include `unsupported_weapon_area`, `weapon_slot_locked`, `weapon_not_owned`,
`item_creation_failed`, `equip_rejected`, `activation_rejected`,
`weapon_slot_empty`, `unequip_rejected`, and `holster_rejected`.

## The admin package's weapons screen

`open77_admin` adds a second, curated front-end over the same API, reachable
from the compact `/admin` menu and from chat:

```text
/admin.weap.give <playerId|me> <record|alias> [slot|auto] [reserve]
/admin.weap.ammo <playerId|me> [slot|all] [reserve]
/admin.weap.remove <playerId|me> [slot|all]
/admin.weap.holster <playerId|me>
/admin.weap.catalog
/admin.read.weapons [playerId|me]        (alias: /weapons)
```

Three differences from the commands above are worth knowing before choosing one:

* **It takes only catalogue records.** 189 of them, filtered at build time to
  `EquipmentArea.Weapon` so nothing in the list can answer
  `unsupported_weapon_area`. `/weapon.give` takes any TweakDB string.
* **It gives the weapon LOADED.** `assign`, then `setAmmo` with a per-class full
  load, then one magazine top-up read off the capacity the engine reports back.
* **`auto` picks the slot** from a verified snapshot: the first empty one, and
  the *active* one only when all three are full.

`resources/open77_admin/README.md` carries the whole argument, including the
measured per-ammo-type carried ceiling — asking for more than it answers
`ammo_update_rejected` even though the weapon is equipped and loaded to the cap.

See the [2.31 game-data reference](data-reference.md) for curated weapon record
names. The exhaustive French catalogue and implementation research live in
`docs/weapons.md` and `docs/research/weapons-and-item-records.md`.
