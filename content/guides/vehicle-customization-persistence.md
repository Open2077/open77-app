# Vehicle customization: persistence and multiplayer

How a car's customization is stored, how it reaches every player, how to keep it across a server
restart, and the measured limits a server should design around. The natives here are **coming in
the next Open77 release**, except paint, the lights hue, trims and the property table
(`getProperties`, `setProperties`), which are public without the customization described here.

## One value per car

Livery, neon, neon animation, lamp colours, parts, rims, plate, tint and stickers live in **one
value per car**, the vehicle state bag key `open77.visual`. Only the server natives write it; a
resource that tries to write the key itself gets `reserved_state_key`. Every change bumps a
revision, `rev`.

Paint, the lights hue and the trim live in the car's own state, and stages and engine sounds are
the car's **record**. A record change rebuilds the empty car in place under the same id and keeps
everything else: paint, appearance, lights hue, health, the visual value and every state bag key.

The value has a budget: **4 KiB, 256 JSON values and 16 attachments** (about 15 in practice). A
change that would pass it is refused with `visual_too_large` or
`attach_limit`, and nothing is applied.

## Who sees what

- **Current viewers** get the change as soon as the server publishes it.
- **Late joiners** and players who **reconnect** read the value when the car streams in, and draw
  the same look.
- A car that **streams back in** after leaving a player's range is rebuilt from the value. So is a
  car after an appearance change or a rebuild.
- Each client draws what its game can: a model a pack does not cover, or a pack the player's game
  did not mount, is skipped on that client only and listed in `customizationAvailable(id).skipped`.
- **A stopped pack leaves a held choice dormant.** A part, livery or sticker the car **already
  holds** stays chosen when its pack resource stops, or when the car's current record does not list
  it, and is answered by `getVisual`, but is not drawn. It shows again when the pack runs. This
  covers only choices made while the pack was running: a **new** choice of a part, livery or sticker
  that no running resource has registered is refused (`unknown_part`, `invalid_profile`,
  `unknown_sticker`).

A **restatement** (setting the value a car already has) changes nothing, publishes nothing and
needs only `world.vehicles`, so a resource can re-apply a stored look without the appearance
permission.

## Keeping a tuned car across a restart

Open77 does not write vehicles to disk. To keep a tuned car, store `getProperties(id)` and apply it
to the new car with `setProperties`. From the next release the table carries `visual`, and the
round trip is exact, plate and tint included. On the current public build it carries paint, the
lights hue and the trim, and `setProperties` refuses a `visual` field as
`unsupported_property:visual`.

```lua
-- Park: store everything the car wears
local props = Open77.vehicles.getProperties(vehicleId)
Open77.kvp.set("garage:" .. carKey, json.encode(props))

-- Later, after a restart: bring it back
local stored = json.decode(Open77.kvp.get("garage:" .. carKey))
local id = Open77.vehicles.create({ record = stored.record, position = spot })
local ok, reason = Open77.vehicles.setProperties(id, stored)
if not ok then print("restore failed: " .. reason) end
```

When the stored `record` is a stage or engine sound record of the same model, `setProperties`
respawns the car onto it first, so a garage that spawns the base model gets the tuned car back. The
car must be empty (`vehicle_occupied`), and a table from another model answers `record_mismatch`.
On a freshly spawned car the stored look is a change, not a restatement, so a garage that restores
customized cars declares `world.vehicles.appearance` as well. See
[Vehicle properties](vehicles.md#vehicle-properties-and-what-cyberpunk-does-not-have).

The pack resources must be running when the car is restored. A freshly spawned car holds no part,
livery or sticker yet, so nothing in the stored look can be dormant: a part, livery or sticker
whose pack is not running is a new choice that no resource has registered, and `setProperties`
refuses it (`unknown_part`, `invalid_profile`, `unknown_sticker`) and applies **nothing**, paint and
damage included. Two habits keep a garage working:

- declare the pack resources as `dependency` in the garage's `open77.lua`, so they start, and
  register, before the garage restores anything;
- on one of those refusals, restore the rest without the look, and keep the stored row:

```lua
local LOOK_REFUSALS = {
    ["unsupported_property:visual"] = true,   -- a server of the current public build
    unknown_part = true, part_not_for_model = true, unknown_variant = true,
    invalid_profile = true, unknown_sticker = true, sticker_not_for_model = true,
}

local ok, reason = Open77.vehicles.setProperties(id, stored)
if not ok and LOOK_REFUSALS[reason] then
    local look = stored.visual
    stored.visual = nil       -- a versioned table with no visual leaves the look alone
    ok, reason = Open77.vehicles.setProperties(id, stored)
    stored.visual = look      -- keep it for the next retrieval
end
```

The full garage is in [Worked examples](vehicle-customization-examples.md#a-garage-that-keeps-tuned-cars).

## Events

On the server, `onVehicleVisualChanged(id, rev, fields)` fires after a change and lists what moved
among `profile`, `neon`, `parts`, `wheels`, `plate`, `tint`, `neonAnimation`, `lightColors` and
`stickers`. An engine sound or a stage is a record change and is not reported there.

```lua
AddEventHandler("onVehicleVisualChanged", function(id, rev, fields)
    print(("vehicle %d visual rev %d: %s"):format(id, rev, table.concat(fields, ", ")))
end)
```

On the client, `open77:vehicleVisualChanged(id, rev)` fires when the replicated value changes.
Compare `rev` with `customizationAvailable(id).appliedRev` to know when this client has drawn it.

## Limits

| Limit | Value | Past it |
|---|---|---|
| Decals per car | 12 `customDecals`, livery and stickers together | 13 or more crash the game that spawns the car. The server refuses stickers past the budget (`decal_budget_exceeded`); a pack livery template is the pack's responsibility. |
| Customization value | 4 KiB, 256 JSON values, 16 attachments | The change is refused (`visual_too_large`, `attach_limit`) |
| Lit neon | 12 cars per client, nearest first, within 60 m; four lights per car | Further cars show no neon |
| Plate text | The engine writes it only on a car born within about 10 m of the camera | The client rebuilds such a car once when the camera is within about 9 m and the car is empty and stopped; it vanishes for about 0.4 s. A moving or occupied car keeps a blank plate until then. |
| Lights hue | One hue, `0..1`, shown on the headlights from the next client release; white headlights before it | Brightness and saturation are not kept; a grey reads as red |
| Sticker changes | Only on a car within 40 m of the client's camera | A distant car keeps what it shows; an approaching car shows its stickers from about 40 m |
| Paint and tint at distance | Drawn up to the appearance proxy: about 50 m at `LODPreset` Low, 80 m above | Past it the car shows its factory look |
| Network event shape | 8 levels, 1,024 values per event, 64 KiB per string | The client drops the event and logs only `dropped malformed network event payload` |

Lamp colours and stickers wait until the paint has settled after a stream-in: about 2 to 3 s on a
client at 30 frames per second, longer on a slow client. An appearance change, or a livery change,
on a painted car rebuilds it once at the same place when it is empty and stopped.

**Send shop catalogues as text.** A category tree sent as a nested Lua table in one event can pass
the 8-level cap and be dropped silently. Keep event tables shallow, and send large catalogues as a
JSON string decoded on the client.

**Cost.** Twenty customized cars parked together (120 attached parts, 12 lit neons) cost one client
about 10 % of its frame rate, with no leak. Most of it is the per-frame update of attached parts.
