# Weapon Lua API

Manage the local player's three `EquipmentArea.Weapon` slots with the asynchronous client API. Use `open77_weapons` for authenticated server-to-owner requests and exact TweakDB IDs such as `Items.Preset_Lexington_Default`.

For reload speed, recoil, advanced native statistics and impact blasts,
see [Weapon customization](weapon-customization.md) and the English
[rp_weapons_effect workshop](https://github.com/Open2077/open77-rp-examples/tree/main/rp_weapons_effect).
Tuning requires a compatible development client and uses separate, resource-owned
`setTuning`, `clearTuning` and `tuning` calls.

The three-slot surface intentionally rejects heavy weapons (`WeaponHeavy`) and
arm cyberware (`ArmsCW`): those equipment areas have different REDengine
lifecycles. Grenades are not weapon slots either — they are `QuickSlot`
gadgets thrown from a hotkey — and have their own calls, [below](#gadgets-grenades-in-the-quick-slots).
Parts that go *onto* a weapon (a scope, a silencer, a mod) are
[components](#weapon-components-scopes-muzzles-and-mods).

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
| `Open77.weapons.setComponent(slot, part, options?)` | Install a scope, muzzle or mod on the weapon in a slot. |
| `Open77.weapons.removeComponent(slot, attachmentSlot)` | Empty one attachment slot of that weapon. |
| `Open77.weapons.components(slot)` | List that weapon's attachment slots, taken or empty. |
| `Open77.weapons.giveGadget(record, count?, options?)` | Grant grenades and put them on the throw hotkey. |
| `Open77.weapons.takeGadget(record?, count?)` | Take grenades back. |
| `Open77.weapons.gadgets()` | List the quick slots. |

The bundled `open77_weapons` resource adds one more as an export:
`exports.open77_weapons:clear()` empties all three slots at once. It is three
native removals aggregated into one answer rather than three the caller has to
correlate, and a slot that was already empty is not a failure.

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

-- Every slot at once: the RemoveAllPedWeapons equivalent.
Open77.weapons.clear(playerId)
```

`clear` is **one** request, not three `remove` calls. The owner runs the three
native removals itself and answers once, so there is one request id to correlate
instead of three and no way to end up half-cleared because one leg was refused. A
slot that was already empty answers `weapon_slot_empty` natively and is **not**
counted as a failure — "remove every weapon" succeeded on a slot that had none.
The completion's `result` carries `cleared` and a `slots` array of
`{ slot, accepted, reason }`.

## Weapon components: scopes, muzzles and mods

A scope, a silencer or a generic mod is a **part** sitting in an **attachment
slot** of the weapon *item*. 2.31 installs one through the vanilla
`ItemModificationSystem` — the scripted system the inventory screen queues
`InstallItemPart` / `RemoveItemPart` into — over two natives,
`TransactionSystem.ForcePartInSlot` and `RemovePart`. Open77 drives exactly that
path from the bridge script, so a part installed here is a real part: it shows
on the owner's weapon, it survives holstering, and the vanilla inventory screen
sees it as its own.

The vocabulary is TweakDB's, not Open77's:

| What | Records | Examples |
|---|---|---|
| Slots | `AttachmentSlots.*` | `Scope`, `PowerModule` (muzzles), `Power_Handgun_WeaponMod1` / `..2` (generic mods, one pair per evolution and class) |
| Parts | `Items.*` tagged `itemPart` (928 on 2.31) | `Items.w_att_scope_short_01`, `Items.w_att_scope_long_02`, `Items.w_silencer_01`, `Items.w_muzzle_brake_01` |

Which slots a given weapon has comes from its blueprint, and `components` reads
it off the live item rather than guessing: a Lexington declares `Scope`,
`PowerModule` and the two `Power_Handgun_WeaponMod` slots beside its receiver,
barrel and magazine; a katana declares `Blade_WeaponMod1/2` and `Grip`. The
full tables — 59 slots, 928 parts, every `Items.*` weapon's declared slots — are
in `docs/generated/attachment-slots-2.31.csv`, `weapon-parts-2.31.csv` and
`weapon-part-slots-2.31.csv`.

```lua
-- Client: a short scope on the rifle in slot 1, then read the slots back.
local requestId, reason = Open77.weapons.setComponent(1, "Items.w_att_scope_short_01")
assert(requestId, reason)
Open77.weapons.components(1)

AddEventHandler("open77:weapons:part", function(
  requestId, slot, attachmentSlot, attachmentSlotId, taken, base, record, tweakDbId)
  -- one row per attachment slot; `base == "true"` is the weapon's own receiver,
  -- barrel or magazine, which is not a mod and cannot be removed
  print(slot, attachmentSlot, taken, base, record)
end)
```

`setComponent` without `options.attachmentSlot` picks the first of the part's
own placement slots that this weapon declares, empty ones first — so a generic
mod finds the pistol slot on a pistol, where vanilla's `GetPlacementSlot` would
name the rifle one. Naming the slot is refused by name when it is not on the
weapon (`slot_not_on_weapon`), when the part cannot go there
(`part_does_not_fit_slot`), or when it holds a base part (`base_part_slot`). A
part the player does not own is created for the install, as the inventory
screen's is consumed by it; a part already in the slot is swapped out and
deleted, exactly as the vanilla screen does. The completion carries the changed
slot as `result.part` and a `components` request carries `result.parts`.

```lua
-- Server: the armoury fits a silencer to whatever is in slot 1, then lists it.
Open77.weapons.setComponent(playerId, 1, "Items.w_silencer_01",
  { attachmentSlot = "AttachmentSlots.PowerModule" })
Open77.weapons.requestComponents(playerId, 1)
Open77.weapons.removeComponent(playerId, 1, "AttachmentSlots.PowerModule")

-- The synchronous read, from the cache the owner keeps fed.
local fitted = Open77.weapons.components(playerId, 1)
for _, part in ipairs(fitted and fitted.parts or {}) do
  print(part.attachmentSlot, part.record)
end
```

The owner's loadout report carries the installed, non-base parts of each slot,
so `Open77.weapons.get(playerId).slots[n].parts` and
`Open77.weapons.components(playerId, n)` answer without a round trip, dated by
the same `loadoutAgeMs` as the slot list.

**What other players see.** A part changes the owner's own weapon and the
server's cache. It does **not** change what other players see on the owner's
proxy: the proxy weapon is rebuilt from the `ItemID` the 20 Hz snapshot carries
(TweakDBID, seed, counter, structure), and parts are per-inventory-item data the
`ItemID` does not encode. Shipping that visual is a wire change and is not in
this release; a server that needs remote players to *see* the scope has no path
yet, and one that needs to *know* about it has the cache.

## Gadgets: grenades in the quick slots

Grenades are `EquipmentArea.QuickSlot` gadgets, not weapon slots. `giveGadget` grants a counted stack and equips quick slot 1 unless `equip = false`. Use a grenade record such as `Items.GrenadeFragRegular`, `Items.GrenadeEMPRegular` or `Items.Preset_Grenade_Smoke_Default`; catalogue entries use `category = grenade`.

```lua
-- Client
Open77.weapons.giveGadget("Items.GrenadeFragRegular", 3)         -- three, equipped, on RB
Open77.weapons.takeGadget("Items.GrenadeFragRegular", 1)         -- one back
Open77.weapons.takeGadget()                                      -- every one of the active gadget
Open77.weapons.gadgets()

AddEventHandler("open77:weapons:gadget", function(
  requestId, quickSlot, record, tweakDbId, quantity, active, difference)
  -- requestId "0": the engine consumed one (the player threw it); `difference`
  -- is the change and `quantity` the count left
end)
```

```lua
-- Server: a medic's kit, counted.
Open77.weapons.giveGadget(playerId, "Items.GrenadeFragRegular", 2, { equip = true })
Open77.weapons.requestGadgets(playerId)

-- And the cache: the count after the last throw, with its own age.
local kit = Open77.weapons.gadgets(playerId)
if kit then print(kit.active, #kit.slots, kit.reportedAgeMs) end

AddEventHandler("onGadgetConsumed", function(playerId, record, remaining)
  print(playerId .. " threw " .. record .. ", " .. remaining .. " left")
end)
```

**The consume half, and what a server sees of the explosion.** A throw is the
engine removing one unit from the stack. The bridge script registers an
inventory listener on the local player (the same `InventoryScriptCallback` the
vanilla currency and shard toasts use), reports the shrink with request id `0`,
and the `open77_weapons` client resource — which knows whether one of its own
`takeGadget` requests is in flight — pushes it to the server on the reserved
`open77:weapons:gadgets` transport as a consumption. The host republishes it as
`onGadgetConsumed(playerId, record, remaining[, tweakDbId])`, a reserved name a
resource cannot forge, and refreshes the cache behind `gadgets()`.

Native grenade explosions already replicate through the thrower's snapshot and report hits to the damage arbiter. Do not also call `Open77.effects.explosion` for the same grenade: that would apply damage twice. There is no native-grenade `onExplosion` event; use `onGadgetConsumed` for the throw and the damage feed for hits. Healing inhalers and other `Consumable` items are outside this API; apply healing through server-owned stats.

## Reading a player's weapons from the server, synchronously

Everything above is a *request*: the answer comes back later, on an event. That is
unusable inside a decision. An anticheat check, a shop validating a sale and an
inventory sync reconciling a slot all have to conclude **now**, and an answer that
arrives ten milliseconds later is an answer to a question nobody is still asking.

`Open77.weapons.get(playerId)` answers immediately:

```lua
-- manifest: permission "player.weapons.read"
local weapons, reason = Open77.weapons.get(playerId)
if weapons == nil then return end                 -- "weapons_unreported" when nothing is known

print(weapons.active, weapons.activeRecord, weapons.drawn, weapons.magazine)
for _, slot in ipairs(weapons.slots) do
  print(slot.slot, slot.record, slot.active, slot.drawn, slot.ammo and slot.ammo.magazine)
end
```

| Field | Meaning |
|---|---|
| `slots` | one row per slot `1..3`, in the shape the relay's snapshot already answers with |
| `active` | the **selected** slot, or absent when none is known |
| `activeRecord`, `activeTweakDbId` | the selected weapon; the id uses the same `0x%016X` spelling as the relay |
| `drawn` | the weapon is in hand. Holstering clears this without clearing `active` |
| `magazine` | rounds in the drawn weapon; absent when the client did not report it |
| `reportedAgeMs` | how old `active`, `drawn` and `magazine` are |
| `loadoutAgeMs` | how old `slots` is |
| `fresh` | `reportedAgeMs` passes the same two-second rule `Open77.players.get` applies |
| `source` | `report`, `snapshot`, or the call fails |

### It is a cache, and the staleness is yours to judge

**Weapons are client-owned.** They live in the client's REDengine equipment
system; the server keeps no copy of that state and has no way to verify one. Every
field above is **as true as the owner's last report**, and a client can lie about
its own weapons exactly as it always could. Read this to *decide* — refuse a sale,
flag an anomaly, reconcile an inventory — never to *assert*.

Which is why there are **two** ages rather than one, and why mixing them up is the
first mistake a caller makes:

* `reportedAgeMs` dates the drawn weapon, whether it is in hand, and the magazine.
  Those ride the ordinary **20 Hz player snapshot**, which the client already
  sends — no extra traffic, no request. While a player is simulating this is tens
  of milliseconds; it stops advancing the moment they are not.
* `loadoutAgeMs` dates the **slot list**, which the owner pushes only when the
  loadout *changes*. An untouched loadout is legitimately minutes old and that is
  not a fault. Rejecting it for age would reject every player who has not swapped
  a gun since they connected.

`source` tells you which halves you have. `report` means the owner has described
its slots at least once. `snapshot` means only the packet's weapon block has
arrived, so `activeTweakDbId` and `drawn` are real but `slots` is empty and
`active` is unknown — the packet carries an id, not a slot number. A player nobody
has heard anything about at all fails with `weapons_unreported`, which is
deliberately different from a player carrying nothing.

```lua
-- The shape an anticheat actually wants.
local weapons = Open77.weapons.get(playerId)
if weapons and weapons.fresh and weapons.source == "report"
   and (weapons.loadoutAgeMs or math.huge) < 60000 then
  -- recent enough for this rule; otherwise ask, do not assume
end
```

### `onPlayerWeaponChanged`

A host-wide server event, fired **once per change** and never for a report that
changes nothing — a player standing still resends the same weapon block twenty
times a second, and an event that repeated it would be unusable.

```lua
AddEventHandler("onPlayerWeaponChanged", function(playerId, slot, record, drawn)
  playerId, slot = tonumber(playerId), tonumber(slot)
  if drawn == "true" then print(playerId .. " drew " .. record) end
end)
```

Arguments are strings, like every other host event. It fires when a slot's
contents change, and when the selection or `drawn` changes — reported against the
slot concerned. The first report after a connection fires too, so a handler that
only ever hears about changes still learns the initial loadout.

### How the cache is fed

Two sources, kept apart on purpose.

The **drawn weapon, whether it is in hand, and the magazine** come out of the
ordinary player snapshot: `weaponTdbId`, the `WeaponValid` / `WeaponEquipped` state
bits and `ammoRemaining` are already in that packet, so this half costs no extra
bandwidth and no request at all. `WeaponValid` clear means "the sender did not fill
this block", never "unarmed" — treating the two as the same is how an anticheat
starts accusing players who are in a loading screen.

**Slot membership** has no wire field, so it is pushed by the bundled
`open77_weapons` client resource, which reports after every accepted mutation and
once shortly after start. It does **not** poll the engine: a snapshot is a real
REDengine round trip, and the loadout changes a few times an hour. Instead it
compares the locally readable drawn weapon (`Open77.character.weapon()`, a field
read) against what it last reported, twice in a row, and only re-snapshots when
they genuinely disagree — which is what happens when a player loots a gun or swaps
one through the vanilla UI. An untouched loadout costs one table read a second and
zero traffic.

A disconnect forgets everything about that player, so a recycled player id never
inherits the previous holder's loadout.

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
/weapon.clear <playerId|me>
/weapon.read <playerId|me>
```

They require `command.weapon.give`, `command.weapon.remove`,
`command.weapon.ammo`, `command.weapon.clear` and `command.weapon.read`
respectively; the built-in `admin` role's `command.*` includes all five.
`/weapon.read` is the odd one out: it asks the client nothing and prints the
server's cache, including both ages, which is the quickest way to see whether a
loadout report has arrived at all. `me` is available only
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
`script_bridge_unavailable`, and `queue_full`. `Open77.weapons.get` adds
`permission_denied` (no `player.weapons.read`), `invalid_player_id`,
`weapons_unavailable` (an embedding that does not replicate) and
`weapons_unreported`; `clear` adds `clear_in_progress` from the owner when one is
already running. REDengine completion failures
include `unsupported_weapon_area`, `weapon_slot_locked`, `weapon_not_owned`,
`item_creation_failed`, `equip_rejected`, `activation_rejected`,
`weapon_slot_empty`, `unequip_rejected`, and `holster_rejected`.

Components add `invalid_part_template`, `template_is_not_part`,
`invalid_attachment_slot` (immediate) and `slot_not_on_weapon`,
`part_does_not_fit_weapon`, `part_does_not_fit_slot`, `base_part_slot`,
`install_rejected`, `remove_rejected` (from the owner). Gadgets add
`invalid_gadget_template`, `template_is_not_gadget`, `invalid_gadget_count`
(immediate) and `unsupported_gadget_area`, `gadget_not_owned`,
`no_active_gadget`, `equip_rejected`, `hotkey_rejected`,
`inventory_update_rejected` (from the owner). The synchronous reads add
`gadgets_unreported`, distinct from `weapons_unreported`: a loadout report says
nothing about the quick slots.

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

`resources/system/open77_admin/README.md` carries the whole argument, including the
measured per-ammo-type carried ceiling — asking for more than it answers
`ammo_update_rejected` even though the weapon is equipped and loaded to the cap.

See the [2.31 game-data reference](data-reference.md) for curated weapon record
names. The exhaustive French catalogue and implementation research live in
`docs/weapons.md` and `docs/research/weapons-and-item-records.md`.
