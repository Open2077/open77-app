# Custom city maps (map providers)

The pause menu's **CITY MAP** entry opens the game's map by default. A resource that draws its own map (a 3D city, a phone app, a tablet, a mission board) can take that entry over: it registers as a **map provider**, and the menu opens it instead. With no provider, or when the provider does not answer in time, players get the game's map.

The contract is five client events and one optional export. No dependency on `open77_pause` is needed, and any number of resources can offer a map; the menu opens the one with the highest priority.

**Client only.** Requires the Unstable client **2.50.0-unstable+op77.166** or later. The pause menu side of the contract shipped in 165; 166 relays `open77:mapProvider:*` events between the client's two script hosts, which a provider downloaded from the server needs. On an older client, CITY MAP opens the game's map whatever the server runs.

For a complete provider, see [op77_map3d](map3d.md): a 3D city map with GPS that registers with priority 100.

## How it works

The client runs two script hosts: one for its own system resources, among them the pause menu, and one for the resources downloaded from the server. Events named `open77:mapProvider:*`, and only those, are delivered to both hosts, so a server resource and the pause menu can talk with `TriggerEvent` and `AddEventHandler`.

1. A provider announces itself with `open77:mapProvider:register` when it starts.
2. When the pause menu starts, it sends `open77:mapProvider:query`; every provider registers again.
3. The player selects **CITY MAP**. The menu closes, then sends `open77:mapProvider:show` naming the chosen provider and a request ID.
4. The named provider opens its map and answers `open77:mapProvider:shown` with that request ID.
5. Without an answer within **1.5 seconds**, the menu opens the game's map for that press and prints which provider stayed silent in the client console.

The menu closes before it sends `show`, so the provider's page can take the keyboard and cursor at once.

## Quick start

In a client script of your map resource:

```lua
local NAME = GetCurrentResourceName()

local function announce()
    TriggerEvent("open77:mapProvider:register", {
        resource = NAME,             -- required: who answers the requests
        label = "City map (3D)",     -- shown to tools; defaults to the resource name
        priority = 100,              -- the highest priority wins (the latest on a tie)
    })
end

AddEventHandler("onClientResourceStart", function(name)
    if name == NAME then announce() end
end)

-- The pause menu asks again when it starts after you, so answer its query too.
AddEventHandler("open77:mapProvider:query", announce)

AddEventHandler("open77:mapProvider:show", function(request)
    if request.provider ~= NAME then return end
    openMyMap()   -- your page, focus and all
    TriggerEvent("open77:mapProvider:shown", { requestId = request.requestId })
end)

-- Step down when your resource stops: a server resource runs in the client's
-- other host, where the pause menu cannot see it stop.
AddEventHandler("onClientResourceStop", function(name)
    if name == NAME then
        TriggerEvent("open77:mapProvider:withdraw", { resource = NAME })
    end
end)
```

Answer `shown` only once the map is actually on screen. If your page is not ready yet, do not answer: the menu then falls back to the game's map instead of leaving the player with nothing.

## Events

| Event | Direction | Payload |
| --- | --- | --- |
| `open77:mapProvider:register` | provider → menu | `{ resource, label?, priority? }` |
| `open77:mapProvider:withdraw` | provider → menu | `{ resource }` (a bare resource name is also accepted) |
| `open77:mapProvider:query` | menu → providers | none: register again |
| `open77:mapProvider:show` | menu → providers | `{ provider, requestId }`: only the named `provider` acts |
| `open77:mapProvider:shown` | provider → menu | `{ requestId }`, within 1.5 seconds |

`register` is ignored unless `resource` is a non-empty string. `priority` is a number and defaults to `0`; `label` defaults to the resource name. Registering again replaces the previous entry of the same resource and counts as the latest registration for tie-breaking.

## Choosing between providers

The menu keeps one entry per resource and opens the one with the **highest priority**. On equal priority, the most recent registration wins. A resource that stops in the system host is removed automatically; a server resource must send `withdraw` itself, as in the quick start.

Read the provider CITY MAP would open with the pause menu's export:

```lua
local provider = exports.open77_pause:mapProvider()
if provider then
    print(("CITY MAP opens %s (%s, priority %d)"):format(provider.label, provider.resource, provider.priority))
else
    print("CITY MAP opens the game's map")
end
```

`mapProvider()` returns `{ resource, label, priority }`, or `nil` when the game's map would open.

To make the game's map the CITY MAP again while your resource keeps running, send `withdraw`. To let another map win, register with a lower priority than it.

## The map key and the minimap

The pause entry is only one way in. The game's own map key still opens the game's map unless you block it, typically with `Open77.input.setActionBlocked("Map", true)` and your own `RegisterKeyMapping` (see [Key mappings](keybindings.md) and [Blocking player input](input-blocking.md)). The minimap is a separate HUD part; see [HUD visibility](hud-visibility.md).

When a provider blocks the game's map and the client is older than 166, the menu cannot see the provider and tries to open the blocked game map; CITY MAP then reports that the map is unavailable. Require client 166 or later before blocking the game's map, or keep the game's map key available on older clients.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| CITY MAP still opens the game's map | The client is older than 166, the provider never registered, or a provider with a higher priority is registered. Read `exports.open77_pause:mapProvider()`. |
| The game's map opens after a short delay | The provider did not answer `shown` within 1.5 seconds. The client console names it. Check that `request.provider` matches your resource name and that your page is ready. |
| CITY MAP opens a map that is no longer running | A server resource stopped without sending `withdraw`. |
| CITY MAP reports that the map is unavailable | The game's map is blocked and no provider answered. See [The map key and the minimap](#the-map-key-and-the-minimap). |
| Two maps open at once | Your `show` handler did not check `request.provider`. |

## Related guides

- [op77_map3d: 3D city map and GPS](map3d.md): a complete provider.
- [Pause menu customization](pause-menu.md): accent color and server logo.
- [Native map and custom tabs](native-map.md): customize the game's own map instead of replacing it.
- [Key mappings](keybindings.md): bind your own map key.
