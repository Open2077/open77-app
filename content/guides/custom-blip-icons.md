# Custom SVG blips

Use your own SVG icons for shops, jobs and other points of interest. `Open77.blips` draws them inside native mappins, with per-blip colors on the world map, minimap, HUD and map legend. Native selection, tooltips and tracking remain available.

**Client only · Experimental.** Requires Cyberpunk 2077 2.31, an OPEN//77 client with the native SVG blip adapter, and the `ui.vanilla.map` permission. Older clients cannot gain SVG rendering through a Lua resource update alone. Keep a native `sprite` as the fallback and check API availability before using the new options.

For entity attachment, GPS routes and the native sprite catalogue, see [Blips and map pins](blips.md).

## Create your first icon

This example creates a yellow fuel-station pin. Add these three files to a client resource:

```text
city_blips/
  open77.lua
  client.lua
  icons/
    fuel.svg
```

### 1. Declare the resource and asset

In `open77.lua`:

```lua
resource "city_blips"
version "1.0.0"
open77_version ">=0.0.1"

client_script "client.lua"
permissions { "ui.vanilla.map" }
files { "icons/fuel.svg" }
```

The manifest's `open77_version` does not establish native SVG support. The client must include the adapter. Paths are relative to the resource; URLs, absolute paths and undeclared assets are rejected. You can declare a collection with `files { "icons/*.svg" }`.

### 2. Add a simple SVG

In `icons/fuel.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <g fill="none" stroke="#FFFFFF" stroke-width="4"
     stroke-linecap="round" stroke-linejoin="round">
    <rect x="10" y="10" width="28" height="44" rx="3"/>
    <path d="M16 18H32V30H16Z M6 54H42"/>
    <path d="M38 34H44V45C44 51 54 51 54 45V24L46 16"/>
  </g>
</svg>
```

Keep the full drawing, including stroke thickness, inside the `viewBox`. OPEN//77 preserves the aspect ratio; it does not crop geometry that extends outside the viewport.

### 3. Create the blip on the client

In `client.lua`:

```lua
CreateThread(function()
    -- Wait for the local character to enter the world.
    while true do
        local state = Open77.character.state()
        if state and state.attached and state.alive then break end
        Wait(500)
    end

    local options = {
        position = { x = -595.785522, y = -722.328979, z = 8.715637 },
        sprite = "tech",
        title = "Fuel station",
        description = "Park beside a pump and leave your vehicle to refuel."
    }

    -- Older clients retain the native pin without SVG or color options.
    if type(Open77.blips.setColor) == "function" then
        options.icon = { asset = "icons/fuel.svg", size = 48 }
        options.color = "#FFCC00"
    end

    local id, reason = Open77.blips.create(options)
    if not id then
        print("Cannot create fuel blip: " .. tostring(reason))
        return
    end

    -- Keep id as a decimal string. Do not call tonumber(id).
    print("Fuel station blip: " .. id)
end)
```

The function check detects the newer Lua API, not compatibility with an arbitrary game build. Always handle a failure such as `native_unavailable`. For several pumps at one location, create one station blip rather than one pin per pump; grouping positions is the resource's responsibility.

## Change icons and colors

Use the blip ID returned by `create`. Visual-only changes preserve that blip's native identity and tracking selection.

```lua
-- Replace the graphic. Declare this SVG in the manifest first.
local ok, reason = Open77.blips.setIcon(id, {
    asset = "icons/fuel.svg",
    size = 56
})
if not ok then print(reason) end

-- A solid RGB color, or RGBA with approximately 50% alpha.
assert(Open77.blips.setColor(id, "#00CCFF"))
assert(Open77.blips.setColor(id, "#00CCFF80"))

-- Apply several changes together.
assert(Open77.blips.update(id, {
    icon = { asset = "icons/fuel.svg", size = 64 },
    color = "#FFCC00"
}))

-- Restore the SVG's own colors, then the native sprite.
assert(Open77.blips.setColor(id, false))
assert(Open77.blips.setIcon(id, false))
```

| Setting | Accepted values | Behavior |
|---|---|---|
| `icon` | A declared `.svg` path, `{ asset, size }`, or `false` | Replaces the native graphic; `false` restores it. |
| `icon.size` | `16..128`, default `48` | Native Ink units; the game UI scales the result. |
| `color` | `#RRGGBB`, `#RRGGBBAA`, or `false` | Changes this owned blip only, not other blips using its sprite. |
| `sprite` | Native alias, variant name or ID | Keeps the native mappin behavior and fallback graphic. |

For SVGs, a color override replaces every painted RGB value and multiplies each shape's source alpha. Omit `color`, or clear it with `false`, to retain a multicolor SVG. `currentColor` resolves to white; it does not inherit a website or server theme.

Color also works on native sprites without an SVG. Clearing the icon does **not** clear the color override. Clear both to restore the native appearance completely. A path-only `setIcon` call uses the default size; pass `{ asset, size }` to choose a size explicitly.

## Visibility, selection and lifecycle

- The replacement follows the native mappin's map projection and visibility. Select a map-capable sprite such as `tech`; an SVG does not turn a HUD-only profile into a world-map pin.
- `setActive(id, false)` hides the blip. `setRange(id, metres)` hides it beyond that distance on **all** surfaces, including the world map. Use `setRange(id, false)` to remove the distance gate.
- Changing the icon or color alone does not reset tracking. A calculated road route still requires a positional blip created with `routable = true`; selecting a regular service pin is not sufficient.
- Each resource owns its blips. `remove(id)`, `clear()`, resource stop/reload and leaving the world clean them up. One resource cannot style another resource's markers.
- Editing an SVG file requires a resource reload to deliver its new contents. Switching between declared icons or colors uses the live API and does not require reconnecting.

There is no server-side `Open77.blips` namespace. To display a server-defined location, send it through your resource's network event and create the blip in its client script. The server half needs `network.events`; the client half needs `ui.vanilla.map`.

## Prepare SVG files

Use small, self-contained vector icons. The renderer supports a restricted SVG subset, not an embedded browser.

| Supported | Details |
|---|---|
| Shapes | `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon` |
| Structure | `svg`, `g`, `viewBox`, transforms |
| Paint | Flat fills and strokes, opacity, non-zero and even-odd holes |
| Paths | Lines, Bezier curves and arcs |
| Stroke geometry | Round, bevel and miter joins; butt, round and square caps |

Scripts, external references, entities, images, text/fonts, gradients, filters, masks, clip paths, animation, CSS selectors and dashed strokes are unsupported. Convert text to paths and simplify or expand effects before exporting. PNG and WebP are not valid blip icons; `Open77.assets.texture` remains a separate PNG API for other interfaces.

## Limits

| Budget | Maximum |
|---|---:|
| SVG source | 256 KiB |
| XML elements / nesting depth | 1,024 / 32 |
| Painted shapes | 256 |
| Flattened points | 8,192 |
| Convex polygons per icon | 1,024 |
| Live polygons per resource / client | 4,096 / 16,384 |
| Blips per resource / client | 128 / 512 |

Curves and thick strokes can generate multiple polygons. A small file can still exceed geometry limits. Simplify the icon or reduce the number of live blips instead of retrying the same definition. Source-content caching is bounded to 32 entries; reusing a file does not waive the live polygon budget.

## Ready-made icons: open77_icons

The standalone `open77_icons` Lua resource bundles **2,112 Lucide icons**. It
requires a client implementing SVG blips with the expanded limits above. This
integration is experimental. It needs no LightRP/Freeroam framework, font
installation or runtime CDN.

Add `dependency "open77_icons >=1.0.0"` to your resource manifest and install the
package under your server's resources. From a client script after world entry:

```lua
local id, reason = exports.open77_icons:create({
    icon = "fuel", -- also accepts "lucide:fuel"
    title = "Fuel station",
    position = { x = -595.785522, y = -722.328979, z = 8.715637 },
    color = "#FFCC00",
    size = 40,
    routable = true,
})
if id then
    exports.open77_icons:setIcon(id, "wrench")
    exports.open77_icons:setColor(id, "#33DDBB")
else
    print(tostring(reason))
end

local results = exports.open77_icons:list("car", 0, 20)
```

Use the library's exports to update/remove these handles: their native owner is
the icon resource. Each caller can manage only its own blips; caller stop/reload
cleans them up. The service permits 64 blips per caller, 128 total, sharing the
same 4,096-polygon resource budget. Keep `LICENSE-LUCIDE.txt` when redistributing
the bundle. Its README documents the full API and reproducible offline import.

## Troubleshooting

Creation returns `nil, reason` on failure; setters return `false, reason`. An invalid replacement is rejected before it changes the existing icon.

| Reason | What to check |
|---|---|
| `permission_denied:ui.vanilla.map` | Add the permission to the client resource manifest. |
| `asset_not_declared:...` | Declare the exact resource-relative path in `files`. |
| `blip_icon_requires_svg` | Use an SVG, not PNG, WebP or a texture descriptor for a raster file. |
| `invalid_icon_size` | Supply a finite number from 16 to 128. |
| `invalid_color:expected_#RRGGBB_or_#RRGGBBAA` | Use a full hex string with `#`, or `false` to clear it. |
| `svg_element_unsupported` / `svg_attribute_unsupported` | Remove unsupported elements, attributes or effects. |
| `svg_geometry_outside_viewport` | Move all geometry and strokes inside the SVG viewBox. |
| `svg_complexity_limit` / `svg_polygon_limit` | Simplify paths, curves and stroke geometry. |
| `blip_visual_budget_exceeded` | Reduce live icon complexity or remove unused blips. |
| `native_unavailable` | Use a compatible game and OPEN//77 client with the native adapter. |

Related: [Blips and map pins](blips.md), [Client blips API](/docs/api/client/open77-blips), [Native map](native-map.md), [3D world markers](markers.md).
