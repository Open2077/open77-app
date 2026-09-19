# 3D world markers

Use `Open77.markers` in a client resource to place checkpoints, rental locations, objectives and other indicators in the world. Markers are native REDengine meshes with depth testing and a translucent gradient, not WebUI overlays or map pins.

The eight-shape catalogue, RGBA colors, transforms and loading diagnostics require client **2.31.13+op77.83 or newer**. The meshes ship with the client; server developers do not need Blender, WolvenKit or a separate asset pack.

## Create a marker

Request the permission in your resource manifest:

```lua
permissions { "world.markers" }
```

Run this in your client script once the world and local character are ready. Use `open77:worldReady` for a new session and check `Open77.character.state().attached` when starting a resource in an already-loaded world; see [resource lifecycle](world-drawing.md#rebuild-on-start-not-only-on-worldready).

```lua
local rentalMarker, reason = Open77.markers.create({
    position = { x = 381, y = -2396, z = 182.06 }, -- replace with your location
    shape = "cylinder",
    radius = 1.5,
    height = 1.2,
    color = { r = 0, g = 220, b = 255, a = 180 },
    maxDistance = 80,
})
assert(rentalMarker, reason)
```

Keep the returned decimal-string handle unchanged; do not convert it with `tonumber`. Creation is asynchronous: receiving a handle does not mean the mesh has finished loading.

A marker only draws a location. It does not create an interaction prompt, collision, map pin or rental action. Pair it with [interactions](interactions.md), [PolyZone](polyzone.md) or [proximity zones](zones.md), and validate purchases and permissions on the server. Use [blips](blips.md) for the map and minimap.

## Shapes

`Open77.markers.shapes()` returns the following stable string identifiers. It needs no permission because it only reads the static catalogue. Numeric marker types from other games are not supported.

| Shape | Geometry |
| --- | --- |
| `ring` | Thin horizontal ring with a hollow centre |
| `cylinder` | Open cylindrical wall with an upward fade |
| `checkpoint` | Vertical circular checkpoint frame |
| `arrow` | Extruded arrow pointing down; rotate it to point elsewhere |
| `chevron` | Extruded directional chevron |
| `cone` | Downward-pointing cone |
| `diamond` | Low-poly diamond |
| `sphere` | Rounded sphere |

```lua
for _, shape in ipairs(Open77.markers.shapes()) do
    print(shape)
end
```

Position is the mesh's bottom origin, not its centre. There is no automatic terrain snap: place ground markers slightly above the floor to avoid z-fighting. Most meshes have a unit width and height before scaling; the ring is only `0.035` units thick.

## Options and dimensions

`create(options)` and `update(id, patch)` use the same fields. Only `position` is required on creation; updates leave omitted fields unchanged.

| Option | Default | Meaning |
| --- | --- | --- |
| `position` | Required on create | World position `{x, y, z}`, in metres |
| `shape` | `"ring"` | One of the eight shape names |
| `style` | `"interaction"` | Palette: cyan `interaction`, gold `objective`, green `spawn`, red `danger` |
| `radius` | `1.5` | Horizontal half-width, `0.1..50` metres |
| `height` | `1.5` | Vertical multiplier, `0.01..100` |
| `scale` | `{x=1, y=1, z=1}` | Additional XYZ multipliers, `0.01..100` on each axis |
| `rotation` | `{x=0, y=0, z=0}` | Local XYZ Euler angles in degrees; Z is yaw |
| `color` | Style palette | `{r, g, b, a}` integer channels `0..255`; omitted alpha defaults to `180` |
| `visible` | `true` | Explicit visibility |
| `minDistance` | `0` | Hide below this distance from the current camera, in metres; must be non-negative |
| `maxDistance` | `100` | Hide beyond this camera distance, `1..500` metres |

Horizontal dimensions are `2 * radius * scale.x` and `2 * radius * scale.y`. Vertical size is `height * scale.z` times the mesh's authored height. Effective dimensions are capped at 200 metres, and `minDistance` must be less than `maxDistance`.

An explicit RGBA color overrides the style palette. Alpha `0` is invisible; `255` is the maximum opacity before the mesh gradient. Colors are independent per marker. Hex strings are not accepted by this native API.

```lua
-- Change only this marker's color and dimensions.
assert(Open77.markers.update(rentalMarker, {
    height = 2.0,
    scale = { x = 1.2, y = 1.0, z = 1.0 },
    rotation = { x = 0, y = 0, z = 45 },
    color = { r = 255, g = 60, b = 100, a = 220 },
}))

-- Restore a style palette. Omitting color would keep the custom color.
assert(Open77.markers.update(rentalMarker, { style = "objective", color = false }))
assert(Open77.markers.update(rentalMarker, { visible = false }))
assert(Open77.markers.update(rentalMarker, { visible = true }))
```

Invalid patches fail atomically, without partially changing the marker. Color, shape and visibility changes can rebuild the native entity asynchronously while retaining the Lua handle. Do not animate colors every frame. Small moves, dimensions and rotation can update an attached mesh in place; moves more than 25 metres from its native anchor recreate it to keep streaming bounds local.

## Functions and snapshots

All functions below are in `Open77.markers`. Except for `shapes()`, they require `world.markers` and operate on the calling resource's markers.

| Function | Result |
| --- | --- |
| `create(options)` | Decimal-string handle, or `nil, reason` |
| `update(id, patch)` | `true`, or `false, reason` |
| `get(id)` | One owned snapshot, or `nil, reason` |
| `list()` | Array of owned snapshots, or `nil, reason` |
| `remove(id)` | `true`, or `false, reason` |
| `clear()` | Removes this resource's markers; returns `true`, or `false, reason` |
| `shapes()` | Array of supported shape names |

Snapshots contain `id`, `position`, `shape`, `style`, `radius`, `height`, `scale`, `rotation`, `color`, `customColor`, `minDistance`, `maxDistance`, `visible`, `rendered`, `failed`, and an optional `error` string. `color` is the effective RGBA color; `customColor` indicates an explicit override.

`rendered` means the native mesh is attached and enabled. It does **not** guarantee that the marker is on screen or unoccluded. A marker may be outside the view, behind a wall, hidden by its distance range or still loading. Use `failed` and `error` to distinguish a loading failure from normal visibility changes.

```lua
-- Read again after creation to inspect asynchronous loading.
local state, reason = Open77.markers.get(rentalMarker)
if not state then
    print("Marker unavailable: " .. tostring(reason))
elseif state.failed then
    print("Marker failed: " .. tostring(state.error))
end

-- Explicit cleanup when this location is no longer needed.
assert(Open77.markers.remove(rentalMarker))
rentalMarker = nil
-- Open77.markers.clear() removes all markers owned by this resource.
```

See the [Lua API reference](/docs/api/client/open77-markers) for individual function signatures.

## Errors and troubleshooting

Immediate failures return a reason as the second return value. Native loading failures appear later in the snapshot's `error` when `failed` is true.

| Reason | Meaning / action |
| --- | --- |
| `permission_denied:world.markers` | Add the manifest permission to the calling resource. |
| `world_unavailable` | Wait for the world to be ready before creating the marker. |
| `markers_backend_unavailable` | No client marker backend is available in this host. |
| `position_required`, `invalid_position`, `invalid_scale`, `invalid_rotation`, `invalid_color`, `invalid_argument` | Check field types and ranges; colors must be integer RGBA bytes. |
| `unsupported_shape`, `unknown_marker_style` | Use a supported shape or palette name. |
| `invalid_marker_id` | The handle is malformed. |
| `not_found` | The marker is gone or, for `get`, is not owned by this resource. |
| `owned_by_another_resource` | An update or removal targeted another resource's marker. |
| `quota_exceeded` | Reduce active markers or allow pending native cleanup to finish. |
| `marker_assets_missing`, `marker_appearance_missing` | The client could not load the required mesh/material or appearance. Update or repair the client installation. |
| `marker_streaming_timeout`, `entity_spawn_failed` | Native loading did not finish or entity creation failed; inspect client diagnostics. |
| `unsupported_material_runtime` | The runtime does not match the supported material implementation. Use a compatible client/game build. |

If `failed` is false but nothing is visible, check the position and ground offset, alpha, `visible`, camera distance and world occlusion before recreating the marker.

## Ownership, limits and replication

The limit is **64 logical markers per resource** and **256 native material slots across the client**. Retiring entities keep their slots until render jobs and cleanup finish. A replacement can use a spare slot while the old entity retires; when the pool is full, it waits for safe cleanup. Repeatedly creating, recoloring and removing markers can therefore exhaust the pool temporarily.

Resource stop/reload and disconnect clean up native markers, including pending spawns. Recreate session markers after world readiness; also handle a resource started while the world is already loaded. Do not reuse handles from a previous resource lifetime.

Markers are local and are **not automatically replicated**. A server resource can send validated definitions to relevant clients, but visual markers are never proof of a player's position, routing bucket, permission or completed interaction.

The optional `open77_markers` package exports the same seven functions. Its markers belong to that facade package, not automatically to each resource calling its exports. Prefer the native API directly when you need your own resource's quota and automatic cleanup. The separate `open77_worldui` POI facade still exposes only ring/cylinder presets and prompt colors; use this native API for the full shape and RGBA options.

## See also

- [Drawing in the world](world-drawing.md): choose between native markers, anchors, prompts and overlays.
- [World queries](world-queries.md): find ground positions and raycast hits.
- [Contextual interactions](interactions.md): add player prompts and choices.
- [Blips and map pins](blips.md): display a separate icon on the map or minimap.
