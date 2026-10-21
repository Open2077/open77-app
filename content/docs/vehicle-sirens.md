# Vehicle sirens and key binding

The bundled `open77_vehicle_siren` resource lets the driver toggle a network vehicle's siren with **F6**. Nearby players receive the same state, including after stream-in, late join and a change of simulation owner.

Use the resource supplied with **Stable 147 or later**. Stable 147 clients and servers must both use protocol **1.48**. The Lua package uses the existing server `Open77.vehicles.setSiren` API; it does not introduce a separate audio stream.

The vehicle needs native siren equipment, for example `Vehicle.v_standard2_archer_hella_police_siren`. The package cannot add a siren to an ordinary car. **Emergency lights and sound share one switch** and cannot be controlled independently.

## Install and configure

1. Copy `resources/system/open77_vehicle_siren` from the server release into your server's resources.
2. If your configuration has an explicit `resources.load` list, add `"open77_vehicle_siren"` to that list. Keep its existing entries.
3. Restart the resource or server so connected clients receive its scripts. New servers using the Stable 147 Freeroam template already include it.

The resource manifest requests `input.actions`, `network.events`, `vehicles.read` and `world.vehicles`. Its shared `config.lua` contains:

```lua
Open77VehicleSiren = {
    defaultKey = "F6",
    cooldownMs = 300,
}
```

Players can change **Vehicle: toggle siren** under **Pause → Settings → Key bindings**, using a keyboard or mouse button. Saved player bindings take priority over `defaultKey`. The action does not fire while chat, pause settings or another WebUI owns keyboard focus.

## Key mapping

The package registers the action through the normal [key-mapping API](keybindings.md):

```lua
-- Excerpt from the package's client script; toggle is its checked callback.
local ok, key = RegisterKeyMapping(
    "vehicle_siren", "Vehicle: toggle siren",
    Open77VehicleSiren.defaultKey, toggle
)
```

Use the installed package's export when adding a separate UI button. Do not register a duplicate mapping in another resource just to call the same action.

## Call from a client menu

Declare the resource dependency in the menu's manifest:

```lua
dependency "open77_vehicle_siren"
```

Call the export from a handler after the resources have started:

```lua
local sent, reason = Open77.exports.callSync("open77_vehicle_siren", "toggle")
if not sent then
    print("Siren request refused: " .. tostring(reason))
end
```

`not_driver` and `cooldown` are local refusals. A successful send means the request was dispatched; the server still checks it. The client sends the intended vehicle ID, so a delayed request cannot toggle the next vehicle after a seat change.

## Server control and access rules

A server resource with `world.vehicles` can control canonical state directly:

```lua
local ok, reason = Open77.vehicles.setSiren(vehicleId, true)
if not ok then print(reason); return end

local enabled = Open77.vehicles.isSirenOn(vehicleId)
Open77.vehicles.setSiren(vehicleId, false)
```

The bundled key handler verifies the authenticated player's readiness, exact vehicle and driver seat. It rejects passengers, entry/exit transitions and destroyed vehicles, and limits repeated requests. It reads the current server state before toggling it; engine, headlight and lock flags are preserved.

By default, any valid driver may use the control. Add RP job or vehicle-access checks in the resource's `server/main.lua` before the setter if your server needs them. Stopping the resource removes its input handler but does not automatically reset existing siren state.

For headlights, empty-car engine hold and unlock prompts, see [Network vehicles](vehicles.md#engine-lights-and-siren).
