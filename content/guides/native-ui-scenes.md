# NativeUI 3D scenes and minimaps

A `<scene3d>` element is a GPU viewport inside a NativeUI document. The resource fills a named scene
with meshes, instanced markers, lines, areas and routes through `ui:scene(name, op, spec)`.
Geometry is uploaded once and drawn instanced; a view is only re-rendered when its scene or camera
changes. The built-in 3D city map and minimap (`op77_map3d`) are built this way.

## A first scene

```html
<!-- ui/map.rml -->
<body>
<div id="root">
    <scene3d id="view" scene="city" controls="map" style="width: 640dp; height: 420dp;"/>
</div>
</body>
```

```lua
local ui = assert(Open77.ui.create({ document = "ui/map.rml", layer = "menu" }))

ui:scene("city", "config", { axis = "game" })               -- X east, Y north, Z up (game coordinates)
ui:scene("city", "mesh", { name = "ground", primitive = "plane" })
ui:scene("city", "object", { name = "ground", mesh = "ground", scale = { 4000, 4000, 1 },
                             color = "#101820", grid = 100, gridColor = "#22d8e2", gridOpacity = 0.25 })
ui:scene("city", "instances", { name = "blips", mesh = "sphere", items = {
    { x = -1450, y = 1060, z = 20, scale = 12, color = "#ffcf3a" },
    { x = -1200, y = 900,  z = 20, scale = 12, color = "#ff4d5e" },
} })
ui:scene("city", "lines", { name = "route", points = { { -1450, 1060, 22 }, { -1300, 980, 22 }, { -1200, 900, 22 } },
                            lineColor = "#22d8e2", width = 4, glow = 1, flow = 2, dash = { 10, 6 } })
ui:scene("city", "camera", { target = { x = -1300, y = 980, z = 0 }, distance = 900, pitch = 50 })

ui:on("scenepick", "#view", function(e)
    print(("picked %.1f %.1f %.1f (double=%s, button=%d)"):format(e.x, e.y, e.z, tostring(e.double), e.button))
end)
```

Points accept `{ x, y, z }` arrays or `{ x = , y = , z = }` tables. With `axis = "game"` every
position, scale and rotation you send uses the game's axes; `axis = "scene"` uses Y up.

## Scene operations

| Op | Spec |
|---|---|
| `config` | `axis = "game" \| "scene"` |
| `mesh` | `{ name, primitive }` defines a reusable primitive: `box`, `plane`, `sphere`, `cylinder`, `roof`, `tube`, `ring`, `disc`; or `{ name, file = "x.glb", place = true }` loads a glTF binary (quantized glTF accepted) and places its objects |
| `object` | `{ name, mesh, position, scale \| size, yaw \| rotation = {x,y,z,w}, color, opacity, ... }` one placed mesh |
| `instances` | `{ name, mesh = "box", items = {...} }` many copies of one mesh, or a binary `file` (`format = "boxes16" \| "layout"`) |
| `lines` | `{ name, points, lineColor, width, ... }` polylines (nested point lists draw several), or a binary `file` with `points`/`starts`/`counts`/`flags` arrays, `include`/`exclude` flag masks and per-flag `styles` |
| `set` | `{ name \| prefix, ...style }` restyle existing objects |
| `remove` | `{ name \| prefix }` |
| `camera` | see below |
| `view` | per-view settings, see [views](#views) |
| `style` | scene look: `background`, `fog`, `fogColor`, `fogNear`, `fogFar`, `lowColor`, `highColor`, `heightLow`, `heightHigh`, `heightMix`, `rim`, `rimStrength`, `rimPower`, `ambient`, `sun`, `sunDirection` |
| `areas`, `zones` | draped polygons and activity discs, see [areas](#areas-and-zones) |
| `graph`, `route` | road network and A* routes, see [routes](#road-graphs-and-routes) |
| `clear` | remove every object |

Instance items take `x`, `y`, `z`, `scale` (or `sx`, `sy`, `sz`), `yaw` in degrees (or a
quaternion `rx`, `ry`, `rz`, `rw`) and `color`. An unknown op fails with `unknown_scene_op:<op>`.

Files load on a worker thread. `ui:onEvent("scene", fn)` reports `loaded` or `error` with
`detail.scene`, `detail.file` and `detail.error`.

### Camera

```lua
ui:scene("city", "camera", {
    view = "main",                 -- which view (default "main")
    controls = "map",              -- "map", "orbit", "none", or "follow" (only the script moves it)
    target = { x = 0, y = 0, z = 0 }, distance = 900, pitch = 50, yaw = 30,
    fov = 45, near = 1, far = 20000,
    minDistance = 50, maxDistance = 6000, minPitch = 10, maxPitch = 89,
    duration = 0.6, bounce = 0,    -- the camera moves on a spring
    animate = false,               -- or jump there
})
ui:scene("city", "camera", { mode = "ortho", height = 600 })   -- top-down orthographic; `height` = visible metres
```

`map` controls pan with the left button and rotate/tilt with the right button (or Ctrl/Shift +
left); `orbit` swaps the two. The wheel zooms. `ui:sceneState("city")` reads the cameras
(`views[name]`).

## Views

Several `<scene3d>` elements can show one scene with their own camera: the data is loaded once.

```html
<scene3d id="mini" scene="city" view="mini" controls="none"/>
<scene3d id="full" scene="city" view="full" controls="map"/>
```

```lua
ui:scene("city", "camera", { view = "mini", mode = "ortho", target = p, height = 300, yaw = 30, animate = false })
ui:scene("city", "view", { view = "mini", layers = 1 + 2, samples = 1, scale = 1.5, maxFps = 30,
    xray = { x = p.x, y = p.y, z = p.z, radius = 70 }, areas = true, zones = false, effects = 0,
    clear = "#17191f55", hatch = 9, areaStrength = 0.85 })
```

| View field | |
|---|---|
| `layers` | bit mask; an object is drawn when `object.layers & view.layers ~= 0` |
| `samples` | 1 or 4 (MSAA) |
| `scale` | render resolution factor |
| `maxFps` | caps redraws while only an animation runs (a camera move always redraws) |
| `xray` | `{ x, y, z, radius }` cuts objects with `xray = true` around a point (the player inside buildings); `false` turns it off |
| `areas`, `zones` | draw draped areas / activity zones on this view |
| `effects` | `0` drops the rim light |
| `clear` | background colour, or `false` |
| `hatch`, `areaStrength`, `zoneStrength` | area hatching in px and overlay strengths |

The element fires `scenepick` (click, double click, right click: `x, y, z, double, button, view`)
and `scenehover` (the ground under the cursor, at most 30 times per second).

## Object styles

Accepted by `mesh` (file), `object`, `instances`, `lines` and `set`:

| Field | |
|---|---|
| `color`, `opacity`, `unlit`, `visible`, `order`, `layers` | basics |
| `edge`, `edgeWidth` | outline colour (or `false`) and width in px, on every face of a box |
| `grid`, `gridColor`, `gridOpacity` | a metric grid on the surface (cell in metres) |
| `receivesAreas`, `receivesZones` | areas and zones drape over this object |
| `xray` | cut by a view's x-ray sphere |
| `beam`, `beamBands` | a fading, shimmering column (use the `tube` primitive) |
| `pulseRate`, `pulseScale` | a ring that grows and fades |
| `additive` | additive blending (glows) |

Lines also take `lineColor`, `width`, `dash = { on, off }`, `flow` (dash or chevron movement per
second), `glow`, `lineStyle = "chevrons"`, `chevronPeriod` (metres), `chevronScale` (period growth
per metre of camera distance), `widthBoost` (wider when the camera comes close), `progress` with
`travelledOpacity` (the part before `progress` dims), and `behindOpacity` (also drawn, faint, where
geometry hides it).

## Areas and zones

```lua
ui:scene("city", "areas", { hatch = 11, items = {
    { pts = { x1, y1, x2, y2, x3, y3 }, fill = "#ff2e3c", fillOpacity = 0.22,
      stroke = "#ff2e3c", strokeWidth = 2, pattern = "hatch", pulse = true },
} })
ui:scene("city", "zones", { colors = { "#3FE0D0", "#FFCC00", "#FF8A1F", "#FF2E3C" }, items = {
    { x = 0, y = 0, radius = 300, level = 2, alpha = 1 },
} })
```

Areas are polygons (up to 16, of up to 160 points) draped over every object with
`receivesAreas`, with a pixel-constant border and optional hatching. Zones are up to 32 activity
discs (`level` 1–4 picks the colour) drawn as a field, rings and a rim over objects with
`receivesZones`, on views with `zones = true`. Each call replaces the whole set.

## Road graphs and routes

```lua
ui:scene("city", "graph", { name = "roads", file = "data/roads.bin", arrays = manifest.roads.arrays })
ui:scene("city", "route", { graph = "roads", id = 7, from = a, to = b, heading = 90,
    lines = { route = { lineColor = "#ffcc00", width = 8, lineStyle = "chevrons", flow = 1.6 } } })

ui:onEvent("scene", function(name, d)
    if name == "route" and d.ok then
        print(("%.0f m, %.0f s, %d maneuvers"):format(d.length, d.seconds, #d.maneuvers))
    end
end)
```

A graph is a one-way lane network read from typed arrays in a binary file: `points`, `laneMain`,
`laneOffset`, `laneCount`, `laneFlags`, `laneSpeed`, `laneLength`, `outStart`, `outLanes`. A route
is an A* search on travel time, off the game thread (a few milliseconds for 16k lanes); `mainOnly`
and `avoidHighways` restrict it. The `route` event carries `id`, `ok`, `points` (flat x, y, z),
`cumulative`, `length`, `seconds`, `maneuvers` (`start`, `left`, `slight-right`, `uturn`,
`arrive`...) and `computeMs`. The `line` object (or every entry of `lines`) is filled with the route
in the same frame.

## Anchors

`ui:anchor(selector, spec)` keeps an HTML element on a 3D point of a view, every frame: map labels,
blips, waypoints and their arrows.

```lua
local marker = ui:create("#markers", { class = "blip", rml = '<span class="arrow"></span><span class="count"></span>' })
ui:anchor(marker, {
    scene = "city", view = "mini", point = { x = -1450, y = 1060, z = 20 },
    transform = true,                 -- move with a transform: no relayout, hundreds of markers
    clamp = "rect", inset = 16,       -- outside the view: pinned to its edge, class "is-edge"
    heading = 90, rotate = ".arrow",  -- turn the arrow child to a game heading
    group = "mini", cluster = 15, fan = 0, priority = 0,
})
ui:unanchor(marker)
```

| Field | |
|---|---|
| `scene`, `view`, `point` | where (`view` defaults to `main`) |
| `offsetX`, `offsetY` | px from the projected point |
| `hideBehind` | hide when the point is behind the camera (default `true`) |
| `transform` | position with `transform: translate()` instead of `left`/`top` |
| `clamp`, `inset` | `"rect"` or `"circle"`: keep it on the view's edge when outside (class `is-edge`) |
| `heading`, `rotate` | turn the element, or its `rotate` child, to a game heading as the view shows it |
| `north` | a compass mark on the edge toward +Y from the view's target |
| `group`, `cluster`, `fan`, `priority` | anchors of a group closer than `cluster` px merge: the highest priority gets `is-cluster` and its `.count` child the number, the others `is-grouped`; hovering lays the group out in a column `fan` px apart (`is-fanned`); `priority` 2 or more never merges |

Anchors are positioned relative to their offset parent and skipped while that parent is hidden, so
markers in a closed panel cost nothing.

## Example resources

The Open77 repository ships `resources/dev/open77_nui_map3d`, which draws the whole city from
binary files, and `op77_map3d`, the full map and minimap built on these operations.
