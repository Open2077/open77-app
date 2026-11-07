# Vehicle customization: FiveM equivalents

How a FiveM tuning script maps onto Open77. Some FiveM vehicle natives exist under their FiveM
name as **server** globals over the `Open77.vehicles` natives; the others have a native with
another shape. Everything on this page is **coming in the next Open77 release**, except
`setPaint`, `setLightsHue`, `setHeadlightColor` and the `SetVehiclePaint` global, which are in the
current public build.

## Mapping table

| FiveM | Open77 | Alias |
|---|---|---|
| `SetVehicleCustomPrimaryColour`, `SetVehicleCustomSecondaryColour` | `Open77.vehicles.setPaint(id, { primary = ..., secondary = ... })`, or the positional global `SetVehiclePaint(id, r1, g1, b1, r2, g2, b2)` | no |
| `SetVehicleXenonLightsCustomColor` | `setLightsHue`, `setHeadlightColor` (one hue, not a colour) | no |
| `SetVehicleLivery`, `GetVehicleLivery` | `setPaintProfile`, `listPaintProfiles` | yes, server |
| `SetVehicleLivery`, used for a factory trim | `setAppearance` | no |
| `SetVehicleNeonLightEnabled`, `SetVehicleNeonLightsColour` | `setNeon` | yes, server |
| `SetVehicleMod` / `GetVehicleMod`, types 23 and 24 | `setWheels` | yes, server |
| `SetVehicleMod` / `GetVehicleMod`, other types | `setParts`, among the parts that declare that `modType` | yes, server |
| `SetVehicleWheelType` | nothing: rims are catalogue parts | yes, server: accepted, no effect |
| `SetVehicleMod` 11, 12, 13, 15 and 16, `ToggleVehicleMod` 18 (engine, brakes, transmission, suspension, armour, turbo) | `respawnAs` onto a stage record, or `setPerformance` | no: the alias looks for parts with that `modType` |
| `SetVehicleMod` 14 (horn) | `setEngineSound`: a sound set includes the horn | no |
| `SetVehicleExtra` | `registerParts` kind `toggle`, then `setParts` | no |
| `SetVehicleNumberPlateText` | `setPlate` | no |
| `SetVehicleWindowTint`, `GetVehicleWindowTint` | `setWindowTint`, `getWindowTint` | yes, server, index mapped below |
| none | `setNeonAnimation`, `setLightColors`, `setEngineSound`, `setStickers` | — |

The aliases are **server globals**, not client natives: a FiveM client script that tunes a car must
ask the server to do it. They take the canonical vehicle id as the vehicle handle, need the same
permissions as the natives they call (`world.vehicles`, plus `world.vehicles.appearance` for a
change) and answer the same `false, reason` refusals. Each has its own card in the
[API reference](/docs/api?category=vehicle-customization).

## Liveries

`SetVehicleLivery(vehicle, livery)` takes the 0-based position in `listPaintProfiles` for that car:
the model's factory templates first, then those running resources registered. `-1` goes back to
generic paint. An index past the list is `invalid_profile`; a non-integer is `invalid_argument`.
`GetVehicleLivery(vehicle)` answers that index, or `-1` for generic paint, for a template whose pack
stopped, and on a failure (then with the reason as a second value).

```lua
SetVehicleLivery(vehicle, 0)    -- the first livery this model lists
SetVehicleLivery(vehicle, -1)   -- generic paint again
```

## Neon

Cyberpunk's neon is one light set laid out per chassis, not four strips, so
`SetVehicleNeonLightEnabled(vehicle, index, toggle)` switches all of it whatever the index.
Switching on a car without a neon lights it in FiveM's default colour, magenta; switching off a car
without one is accepted and does nothing. `toggle` must be a boolean (`invalid_argument`).
`SetVehicleNeonLightsColour(vehicle, r, g, b)` keeps the on/off state, so a colour set before the
lights are switched on is the colour they come on in.

```lua
SetVehicleNeonLightsColour(vehicle, 0, 229, 255)
SetVehicleNeonLightEnabled(vehicle, 0, true)
```

## Mods: rims and kit parts

There are no mod kits or numbered slots: parts and rims are a catalogue that resources register
with `registerParts`. `SetVehicleMod` builds a FiveM-style index over that catalogue:

- **Types 23 and 24** (front and back wheels) are the rims; both choose the same rim, on every
  wheel.
- **Any other type** is the registered parts whose entry declares that `modType` (0 to 49).
- The **index space** of a type on a car is every (part, variant) pair that fits the car's record,
  ordered by qualified part id, then by variant id. An index is stable while the catalogue is.
- **One choice per type**, like a FiveM slot: choosing a part takes the other parts of that type
  off. `-1` is stock. An index past the list is `invalid_mod_index`. `customTires` has no
  counterpart and is ignored.
- `GetVehicleMod(vehicle, modType)` answers the index of the current choice, or `-1` for stock
  and on a failure.
- `SetVehicleWheelType` answers `true` for a car that exists and changes nothing, so a ported
  menu does not fail on its first line.

```lua
-- server: a pack registered spoilers with modType = 0
SetVehicleMod(vehicle, 0, 1)    -- the second spoiler option for this car
SetVehicleMod(vehicle, 23, -1)  -- factory rims
local spoiler = GetVehicleMod(vehicle, 0)
```

Prefer `listParts`, `setParts` and `setWheels` in new code: they name parts by id instead of by a
position that moves when a pack adds a part.

## Window tint

| FiveM tint index | Meaning | Open77 level | `GetVehicleWindowTint` answers |
|---|---|---|---|
| `-1`, `0`, `4` | none, NONE, STOCK | factory glass | `-1` |
| `3` | LIGHTSMOKE | `1` | `3` |
| `2` | DARKSMOKE | `2` | `2` |
| `1`, `5` | PURE_BLACK, LIMO | `3` | `5` |
| `6` | GREEN | refused: `unsupported_property:windowTint` | — |

Anything else is `invalid_tint`. A car set with `1` (PURE_BLACK) therefore reads back `5`, the
index of the same level.

## Ported property tables

`setProperties` reads four FiveM keys of a ported property table and lands them in the
customization: `neonEnabled` (a boolean, or FiveM's four per-side booleans), `neonColor`, `livery`
(the same 0-based index, `-1` for none) and `windowTint` (the index above). A FiveM key wins over
the matching field of `visual`.

It refuses the keys with no counterpart **by name**, as `unsupported_property:<key>`, and the
reason names the Open77 native to use instead: `wheels` and `wheelType` point at `setWheels`,
`modKit` and `mods` at `registerParts` and `setParts`, `plateText` at `setPlate`.
`Open77.vehicles.unsupportedProperties` is the full list as a table, keyed by property name; pass
`{ ignoreUnsupported = true }` to skip those keys instead. See
[What Cyberpunk does not have](vehicles.md#what-cyberpunk-does-not-have).

## Porting a tuning menu

A FiveM tuning menu usually runs on the client and calls the natives directly. In Open77 the
client sends a request and the server applies it, so every player sees the result:

```lua
-- client.lua
RegisterCommand("tint", function(source, args)
    TriggerServerEvent("tuning:tint", tonumber(args[1]))
end)
```

```lua
-- server.lua; the resource's open77.lua declares
-- permissions { "network.events", "world.vehicles", "world.vehicles.appearance" }
RegisterNetEvent("tuning:tint", function(tint)
    local seat = Open77.vehicles.getPlayerSeat(source)
    if not seat or seat.seat ~= "seat_front_left" then return end
    local ok, reason = SetVehicleWindowTint(seat.vehicleId, tint)
    if not ok then Open77.chat.send(source, "Tint refused: " .. tostring(reason)) end
end)
```

The server decides: check that the player may tune that car (ownership, a shop zone, a price)
before calling the native.
