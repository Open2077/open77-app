# NativeUI 3D HUDs

NativeUI draws 3D transforms with perspective-correct texturing: text, images, gradients, filters,
`backdrop-filter`, `box-shadow`, `overflow` clipping and `border-radius` all follow the tilted plane.
The mouse is projected onto that plane, so a button on a tilted panel is clicked where it is drawn.

Two levels are available:

- **a whole document**, tilted with `projection` — a speedometer lying back on the road, a cockpit
  HUD turned toward the driver; no RCSS change needed;
- **single elements**, with RCSS `transform` or the motion channels — side panels angled toward the
  player.

## Tilting a whole document

```lua
local hud = assert(Open77.ui.create({
    document = "ui/speedo.rml",
    projection = { rotateX = 24, perspective = 900, origin = { 0.5, 1.0 }, preset = "calm" },
}))

-- later, live: absent fields keep their value; a transition makes it a spring
hud:projection({ rotateY = -12, spring = { duration = 0.6, bounce = 0.25 } }, function() print("settled") end)
hud:projection({ reset = true, rotateX = 10 })   -- start from the defaults
hud:projection(false)                            -- flat again
```

| Field | Default | |
|---|---|---|
| `rotateX` | 0 | degrees; positive sends the top edge away (leaning back) |
| `rotateY` | 0 | degrees; positive sends the right edge away |
| `rotateZ` (`rotate`) | 0 | degrees, in-plane roll |
| `perspective` | 1000 | dp from the eye to the screen; smaller is stronger; `0` or `false` is orthographic |
| `origin` | `{ 0.5, 0.5 }` | the pivot, in fractions of the screen (`{ x = , y = }` also works) |
| `vanish` | the origin | the vanishing point, in fractions of the screen; `false` follows the origin again |
| `offset` | `{ 0, 0, 0 }` | dp applied after the rotation; `z > 0` brings it closer (flat `x`, `y`, `z` also work) |
| `scale` | 1 | |
| `reset` | | start from the defaults instead of the current values |

The rotations apply in this order: roll, tilt (`rotateX`), then yaw (`rotateY`), about `origin`.
Lengths are dp, so the look is identical at every resolution.

The transition fields are those of [`ui:animate`](native-ui-motion.md): `spring`, `preset`,
`duration` + `easing`, `tween`, `delay`. Without one, the change is immediate. Turned on with a
transition (or created with one), the document tilts into place from a flat page. `onDone` runs
when it settles.

A bad field fails the call and changes nothing: `unknown_projection_field:<name>` or
`invalid_projection:<name>`. `ui:state().projection` holds the values currently presented and an
`animating` flag.

The projection is written as a `matrix3d()` on `<body>` (with `transform-origin: 0 0 0`). It
therefore replaces a `transform` your RCSS sets on `body`; `ui:animate("body", ...)` still composes
with it. Anchored elements (see [scenes](native-ui-scenes.md#anchors)) are placed before the
projection.

## A HUD that floats with the camera

Updating the projection every frame costs no layout: it is one matrix. The built-in freeroam HUD
makes its panels trail the camera this way. A reduced version:

```lua
local hud = assert(Open77.ui.create({ document = "ui/hud.rml", layer = "hud" }))

local function yawOf(view)
    local f = view and view.forward
    if type(f) ~= "table" then return nil end
    return math.deg(math.atan(-f.x, f.y))
end

CreateThread(function()
    if type(Open77.camera) ~= "table" or type(Open77.camera.view) ~= "function" then return end
    local last, lastAt, ry, sent = nil, GetGameTimer(), 0, nil
    while true do
        Wait(0)
        local now = GetGameTimer()
        local dt = math.max(0.001, math.min(0.1, (now - lastAt) / 1000))
        lastAt = now
        local ok, view = pcall(Open77.camera.view)
        local yaw = ok and yawOf(view) or nil
        local speed = 0
        if yaw and last then speed = ((yaw - last + 540) % 360 - 180) / dt end   -- degrees per second
        last = yaw
        -- turn slightly against the camera's rotation, then ease back
        local target = math.max(-4, math.min(4, -speed * 0.03))
        ry = ry + (target - ry) * (1 - math.exp(-dt * 6))
        local rounded = math.floor(ry * 100 + 0.5) / 100
        if rounded ~= sent then
            sent = rounded
            hud:projection({ rotateY = rounded, perspective = 1400 })
        end
    end
end)
```

Send a projection only when the rounded value changes: identical frames then cost nothing.

## Tilting single elements

Plain RCSS, as in CSS — Doom-style side panels angled toward the centre:

```css
#left  { transform: perspective(900dp) rotateY(28deg);  transform-origin: 0% 50%; }
#right { transform: perspective(900dp) rotateY(-28deg); transform-origin: 100% 50%; }
```

`perspective: 900dp` on a parent gives its transformed children one shared eye, as in CSS.

Animated with springs through the motion channels (give `perspective` a `from`, otherwise it grows
from 0):

```lua
ui:animate("#left", { from = { rotateY = 0, perspective = 900 }, to = { rotateY = 28, perspective = 900 },
                      preset = "bouncy" })
```

A glass look on tilted panels is the usual effects: `backdrop-filter: blur()`,
`filter: scanlines(0.2 3) glow(4dp #22d8e2 1)`, `decorator: fx(holo ...)`.

## Costs and limits

A projected document costs the same draw calls as a flat one; only the screen area it covers is
cleared and composited. Text is rasterised for the flat layout and sampled on the plane, so very
steep angles (beyond about 60°) soften it.

`resources/dev/open77_nui_hud3d` in the Open77 repository demonstrates both techniques: start it
with `ensure open77_nui_hud3d`, then type `/hud3d road`, `/hud3d cockpit`, `/hud3d banked`,
`/hud3d flat`, `/hud3d tilt <degrees>` or `/hud3d focus`.
