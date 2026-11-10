# NativeUI effects, shapes and themes

Everything on this page runs on the GPU inside the NativeUI renderer: the built-in design system,
filters, animated `fx()` decorators, custom HLSL effects, vector shapes, fonts and runtime themes.

## The Open77 design system

Link `nui://open77/open77.rcss` first to get the look of the built-in menus, then your own sheet:

```html
<link type="text/rcss" href="nui://open77/open77.rcss"/>
<link type="text/rcss" href="ui/menu.rcss"/>
```

It sets the base font (Rajdhani, light text on dark), headings in Chakra Petch, code in Roboto Mono,
and provides these classes:

| Class | |
|---|---|
| `.panel` | chamfered panel: two cut corners, a hairline and a dark fill |
| `.panel.accent-edge` | the same with a lit cyan edge |
| `.glass` | frosted HUD glass (`backdrop-filter: blur(10dp)`), `.glass.lit` adds a lit surface |
| `.holo` | animated hologram surface with a cyan border |
| `.scrim` | a dark blurred backdrop behind a modal |
| `.glow`, `.border-flow`, `.grid-bg` | cyan glow, a light running along the border, an animated grid |
| `button`, `.button`, `button.ghost` | solid chamfered button, outlined variant; `:hover`, `:active`, `:disabled` styled |
| `input.text`, `input.password`, `textarea`, `input.checkbox`, `input.radio`, `input.range`, `select` | form controls |
| `.meter > .fill`, `.meter.health > .fill` | progress bars (cyan, red) |
| `.row`, `.col`, `.grow`, `.center`, `.gap-4/8/12/16`, `.abs`, `.fill`, `.hidden` | layout helpers |
| `.ui`, `.eyebrow`, `.value`, `.muted`, `.accent` | text styles: caps label, small caps heading, monospace value |
| `.ok`, `.warn`, `.danger`, `.combat`, `.net` | status colours |
| `.pulse`, `.rise` | a looping opacity pulse; a one-shot rise-in entrance |
| `shape.ring` | a cyan stroked ring for `<shape>` |

Scrollbars are styled thin and dark. Palette: cyan `#22d8e2`, light cyan `#6ff0f6`, text `#e6edf3`,
muted `#8a94a2`, green `#3ef0a1`, amber `#ffb020`, red `#ff4d5e`, magenta `#ff3df5`, violet
`#9b6bff`.

## Filters

`filter` applies to the element and its children; `backdrop-filter` to what is drawn behind it.

```css
.glass   { backdrop-filter: blur(14dp) saturate(1.2); }
.title   { filter: glow(6dp #22d8e2 1.2); }
.glitch  { filter: chromatic(2) scanlines(0.25 3); }
.damaged { filter: distort(3 4 2) brightness(1.2); }
.shadow  { filter: drop-shadow(#000000aa 0dp 4dp 12dp); }
```

| Filter | Arguments |
|---|---|
| `blur(r)`, `opacity(x)`, `brightness(x)`, `contrast(x)`, `invert(x)`, `grayscale(x)`, `sepia(x)`, `saturate(x)`, `hue-rotate(deg)` | as in CSS |
| `drop-shadow(color x y blur)` | colour **first** |
| `glow(radius color strength)` | a coloured bloom |
| `distort(amount frequency speed)` | animated sine displacement (amount in px) |
| `chromatic(offset angle)` | RGB split; offset in px, angle in radians |
| `pixelate(cell)` | cell size in px |
| `scanlines(strength period speed grain)` | moving scanlines (period in px) plus film grain |

The Open77 filters (`glow` aside) take **plain numbers**: write `scanlines(0.35 3)`, not
`scanlines(0.35 3dp)`. `scanlines` darkens the whole box, background included. A `backdrop-filter`
is still drawn when the element has `opacity: 0`: hide such panels with `display: none`.

## `fx()` decorators

`decorator: fx(effect a b c d color)` paints an animated surface. The four numbers are the effect's
parameters; unused ones are `0`.

```css
.card    { decorator: fx(holo 0.6 1 0 0 #22d8e2); }
.frame   { decorator: fx(border-flow 1.5 2 0 0 #22d8e2); }
.alert   { decorator: fx(scan 1.2 3 0 0 #ff4d5e); }
.cut     { decorator: fx(chamfer 10 1 0.9 0 #8a94a248); }
.solid   { decorator: fx(chamfer-solid 6 0 0 0 #22d8e2); background-color: transparent; }
```

| Effect | `a b c d` |
|---|---|
| `holo` | intensity, line density, flicker, hue drift |
| `border-flow` | width px, speed, length 0..1, glow px |
| `grid` | cell px, line px, pulse speed, fade |
| `noise` | scale, speed, contrast |
| `shimmer` | width 0..1, speed, angle (radians) |
| `glass` | edge light, noise, tint strength (pair with `backdrop-filter: blur()`) |
| `scan` | speed, line width px |
| `plasma` | scale, speed |
| `chamfer` | cut px, border px, fill alpha, glow px |
| `chamfer-solid` | cut px, glow px; the cut shape filled with the colour |

A `chamfer` fill alpha of `0` means "default" (0.86): use `0.01` for an outline with no fill.
Gradients (`linear-gradient`, `radial-gradient`, `conic-gradient` and their repeating forms),
`box-shadow`, `border-radius`, `mask-image` and `clip` work as in RmlUi. An `image()` decorator
cannot tile: stretch or size it instead of repeating it.

## Custom HLSL effects

Register a pixel function once, then use it as an `fx()` effect:

```lua
assert(Open77.ui.registerEffect("pulse", [[
float4 Effect(EffectInput e) {
    float d = length(e.uv - 0.5);
    float wave = 0.5 + 0.5 * sin(d * 40.0 - e.time * 6.0 * e.params.x);
    return e.color * wave * smoothstep(0.5, 0.2, d);
}]]))
```

```css
.beacon { width: 64dp; height: 64dp; decorator: fx(pulse 1 0 0 0 #ffcf3a); }
```

| `EffectInput` field | |
|---|---|
| `uv` | 0..1 across the box |
| `px` | pixels across the box |
| `size` | the box size in pixels |
| `time` | seconds |
| `radius` | the element's border radius |
| `color` | the decorator colour (premultiplied) |
| `params` | the four numbers of `fx()` |
| `vertexColor` | the element's vertex colour (opacity included) |

The name is at most 48 characters, the source at most 256 KiB, and it must define `Effect`
(`effect_needs_Effect_function` otherwise). It is compiled on the render thread; a compile error is
written to the client log. Avoid HLSL keywords as identifiers (`line`, `point`, `triangle`).

## Vector shapes

```html
<path d="M0 0 L120 0 L140 20 L140 60 Z" style="fill: #22d8e233; stroke: #22d8e2; stroke-width: 2dp;"/>
<path view-box="0 0 10 10" d="M3.6 0.8H6.4V3.6H9.2V6.4H6.4V9.2H3.6V6.4H0.8V3.6H3.6Z" style="fill: #ff4d5e;"/>
<shape type="star" sides="5" style="fill: #ffcf3a; width: 32dp; height: 32dp;"/>
<shape type="chamfer" cut="12" style="stroke: #22d8e2; stroke-width: 1.5dp; stroke-dasharray: 8 4;"/>
<shape type="circle" class="ring" style="width: 48dp; height: 48dp; trim-end: 0.65;"/>
```

`<path d>` accepts every SVG path command. `view-box` maps the path into the element, fitted and
centred, or stretched with `preserve-aspect="none"` (charts; stroke widths stay in pixels either
way). `<shape>` types are `rect`, `ellipse`, `circle`, `polygon` (`sides`), `star` (`sides`) and
`chamfer` (`cut`). Shapes default to `currentColor`.

| Property | |
|---|---|
| `fill`, `stroke`, `stroke-width` | colours and width |
| `stroke-linejoin`, `stroke-linecap` | as in SVG |
| `stroke-dasharray`, `stroke-dashoffset` | dashes |
| `trim-start`, `trim-end` | draw only part of the outline, 0..1 |

All of them are animatable with RCSS transitions and `@keyframes`. A ring that draws itself when
Lua adds the `drawing` class (`ui:class("#ring", "drawing", true)`):

```css
@keyframes draw { from { trim-end: 0; } to { trim-end: 1; } }
#ring.drawing { animation: 1.2s cubic-out draw; }
```

`nui.msaa <1|2|4|8>` sets the anti-aliasing of shapes.

## Themes at runtime

`ui:stylesheet(name, rcss)` adds a named RCSS layer over the document's own sheets, applied live.
Later layers win; passing `nil` removes one; layers survive `ui:reload()`. A theme switch, a
colour-blind palette or a player's text size is one call:

```lua
local THEMES = {
    arasaka = "button { decorator: fx(chamfer-solid 6 0 0 0 #ff2e3c); } .accent { color: #ff2e3c; }",
    militech = "button { decorator: fx(chamfer-solid 6 0 0 0 #ffcc00); } .accent { color: #ffcc00; }",
}
ui:stylesheet("theme", THEMES.arasaka)
ui:stylesheet("size", "body { font-size: 18dp; }")
ui:stylesheet("theme", nil)        -- back to the document's own look
```

## Fonts

Built in: Lato, Roboto Mono, Rajdhani, Chakra Petch. Add TrueType/OpenType files with
`Open77.ui.loadFont(path, family, fallback)`; see
[documents](native-ui-documents.md#images-and-fonts).
