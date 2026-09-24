# Game data catalogues — `Open77.data`

`Open77.data` resolves TweakDB IDs such as `Items.Preset_Lexington_Default` and `Vehicle.v_sport1_rayfield_caliburn_player` into display names and structured metadata for inventories, shops and garages.

```lua
local car = Open77.data.vehicle("Vehicle.v_sport1_rayfield_caliburn_player")
print(car.displayName, car.classLabel, car.manufacturer, car.seats)

local gun = Open77.data.weapon("Items.Preset_Lexington_Default")
print(gun.displayName, gun.itemType, gun.quality)
```

Both runtimes answer these five calls:

| Call | Argument |
|---|---|
| `Open77.data.vehicle(record)` | a `Vehicle.*` record |
| `Open77.data.weapon(record)` | an `Items.*` weapon record |
| `Open77.data.item(record)` | an `Items.*` clothing or item record |
| `Open77.data.npc(template)` | see [the one asymmetry](#the-one-asymmetry-npc) |
| `Open77.data.localize(key)` | `LocKey#12345`, a bare number, or a secondary key |

No permission is required. This is static game data, the same for every player,
and gating it would only push resources back to shipping their own copies.

## A record is a string, not a hash

FiveM's `GetHashKey` returns a Jenkins hash and every FiveM resource compares
those numbers. **Open77 has no such number.** The `Citizen` alias layer's
`GetHashKey` already returns a *TweakDB identifier* rather than a GTA hash, and
`Open77.data` is deliberately consistent with it: you pass the record string, you
get a table back, and there is nothing to round-trip through a hash function.

A resource ported from FiveM that does `if GetEntityModel(veh) == GetHashKey("caliburn")`
has to become `if Open77.vehicles.get(id).record == "Vehicle.v_sport1_rayfield_caliburn_player"`.
That is a port, not a shim, and pretending otherwise by inventing a hash would
only produce numbers that agree with nothing in the engine.

The closest thing to `GetEntityModel` is the **client's** `recordClass` field: the
record's runtime RTTI class (`gamedataWeaponItem_Record`, `gamedataVehicle_Record`),
read from the live database. It is always present once a lookup succeeds.

## Where the answer comes from, and why the two sides differ

Every answer carries `source`. It is `tweakdb` on a client and `catalogue` on a
server, and the difference is not cosmetic.

**A client is inside Cyberpunk 2077.** The TweakDB is already in memory, indexed
by exactly the record strings Open77 uses, with the engine's own localisation
beside it. So the client asks the real database, gets the display name **in the
player's own language**, and ships no catalogue at all.

**A server has no engine.** It answers from a reduced catalogue embedded in the
host, generated from `docs/generated/` by `scripts/build-data-catalogue.py` and
parsed lazily — a server whose resources never call `Open77.data.item` never
parses the item catalogue.

### Performance

Client queries read the live TweakDB and use the player's localization. The server lazily loads an embedded catalogue and indexes records for lookup. Avoid distributing duplicate catalogues as Lua tables: they consume each resource's memory and startup instruction budget.

## Fields

Only the fields a source actually contains are returned. **An absent field means
the answer was not available, not that the value is empty** — on the client in
particular, every field is read through a checked RTTI accessor, and a record
class that does not expose one simply leaves it out.

Always present once a lookup succeeds:

| Field | Meaning |
|---|---|
| `record` / `template` | the key you asked for |
| `kind` | `vehicle`, `weapon`, `item` or `npc` |
| `source` | `tweakdb` (client, live) or `catalogue` (server, shipped) |
| `recordClass` | *client only* — the runtime RTTI class |
| `build` | *server only* — the catalogue's game build, `2.31` |

Commonly present: `displayName`, `class`, `classLabel`, `manufacturer`, `seats`,
`seatsSource`, `price`, `itemType`, `equipArea`, `quality`, `slot`, `tags`,
`localeKey`, `tweakDbId`.

### Derived fields say so

`seatsSource` is the pattern to copy. On a **client** it is `record`, meaning the
seat count was read from the vehicle record. On a **server** it is `class`,
meaning it was derived from the chassis class in the record name — no repository
source holds a real seat count, bikes report one and everything else four, and
four is in any case the ceiling of Open77's own four-seat wire model
(`VehicleSeat`). A field that had to be inferred is labelled rather than
laundered.

Vehicle `displayName` on the server is derived the same way, from the record path.
The client's is the real localised name.

## Localisation

`Open77.data.localize(key)` is the `GetLabelText` equivalent and is **client
only**. It accepts `LocKey#12345`, a bare number — so a `localeKey` read off a
server catalogue row can be passed straight in — or a secondary key string.

On a server it always fails with `localization_client_only`. The locale tables
live in the game's own resources, which a dedicated server does not have, and
returning the key would let it pass for a translation. The pattern is:

```lua
-- server
local gun = Open77.data.weapon(record)
TriggerClientEvent("shop:row", playerId, record, gun.localeKey, gun.quality)

-- client
AddEventHandler("shop:row", function(record, localeKey, quality)
  local name = Open77.data.localize(localeKey)
    or (Open77.data.weapon(record) or {}).displayName
    or record
  ...
end)
```

## The one asymmetry: `npc`

`Open77.data.npc` takes different keys on the two sides, and there is no way
around it.

* **Server**: an **entity template path**, `base\characters\...\npc_base.ent`.
  That is what the generated NPC catalogue is keyed by, and it is what
  `Open77.npcs.create` takes.
* **Client**: a `Character.*` **TweakDB record**. A template path is not a record
  and cannot be resolved against TweakDB, so the client answers
  `record_wrong_kind` for one.

Both are documented rather than papered over: a call that cannot be answered says
which kind it wanted.

## Failures

`nil, reason`, with stable snake_case tokens.

| Reason | Meaning |
|---|---|
| `invalid_kind` | not one of the four kinds |
| `invalid_record` | empty, over 256 characters, or not a string |
| `record_unknown` | the key is well formed and nothing has it |
| `record_wrong_kind` | *client* — an `Items.*` record passed to `vehicle`, and so on |
| `tweakdb_unavailable` | *client* — asked before the database is up |
| `records_unavailable` | *client* — this host has no record backend |
| `localization_client_only` | *server* — `localize` has nowhere to look |
| `localization_unavailable` | *client* — the engine declined the key |

## Regenerating the server catalogues

```bash
python scripts/build-data-catalogue.py
```

It reads `docs/generated/weapons-2.31.csv`, `clothing-2.31.csv`,
`npc-templates-2.31.csv` and `docs/vehicle-models.md`, and writes four TSVs into
`server/src/Open77.Server.Core/Data/`, which the server embeds. The vehicle class
and manufacturer derivation is *imported* from
`resources/system/open77_admin/tools/build-catalog.py` rather than reimplemented,
so the two catalogues cannot drift into two different answers for one record.

Repetitive columns are dictionary-encoded (`@dict` lines at the top of each file),
which is what keeps both the file and the parsed heap proportional to a column's
distinct values rather than to its rows: 1 991 item rows share seven item-type
strings.

## See also

* [Game data reference](data-reference.md) — the curated record names themselves.
* [Weapon Lua API](weapons-api.md) — `Open77.weapons`, including the server-side cache.
* [Vehicle model catalog](../docs/vehicle-models.md) — the full 1 372-record list.
