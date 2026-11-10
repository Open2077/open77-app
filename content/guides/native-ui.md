# NativeUI

NativeUI draws resource interfaces on the GPU, inside the game's own frame. A client script writes a
document in RML (an HTML dialect) styled with RCSS (a CSS dialect), and drives it from Lua through
`Open77.ui`. The Open77 client renders it with [RmlUi](https://mikke89.github.io/RmlUiDoc/) on the
game's Direct3D 12 device, in the overlay pass. There is no browser process, no page texture to copy
and no inter-process messaging. A document costs a few draw calls per frame, and its layout is only
recomputed when something in it changes.

Use NativeUI for anything that must stay smooth at 60–144 FPS: HUDs, speedometers, minimaps, menus,
scoreboards, toasts and tools. Keep [WebUI](webui-input.md) for full web applications: React or
other frameworks, `three.js`, video, remote pages.

| | NativeUI (`Open77.ui`) | WebUI (`WebUI.create`) |
|---|---|---|
| Renderer | game D3D12 device, batched draw calls | Chromium off-screen, texture blit |
| Markup | RML + RCSS (RmlUi 6.3) | HTML + CSS + JavaScript |
| Logic | Lua in the client script | JavaScript in the page |
| Data | data models, one variable per update | messages between Lua and JS |
| Motion | native springs, tweens, keyframes, layout transitions | CSS / JavaScript |
| 3D | `<scene3d>` scenes, tilted documents (`projection`) | WebGL |
| Cost | a few draw calls; no relayout when nothing changes | a browser surface per page, see [WebUI budget](webui-budget.md) |

The built-in pause menu, connection and loading screens, chat, freeroam HUD and the developer
console (`²`) are NativeUI documents.

## Requirements

- Client: **2.50.0-unstable+op77.212** or later. Earlier clients have no `Open77.ui` table.
- A client script. NativeUI is a client API; a server resource talks to its documents through
  ordinary net events.
- Every RML, RCSS, image and font a document loads must be declared in the manifest's `files`.

Test for the API before using it, and keep a fallback for older clients:

```lua
if type(Open77.ui) ~= "table" or type(Open77.ui.create) ~= "function" then
    print("[myhud] NativeUI is not available on this client")
    return
end
```

## A first HUD in four files

The resource below shows a health panel in the bottom-left corner and updates it from the server.

```text
resources/myhud/
  open77.lua
  client.lua
  server.lua
  ui/hud.rml
  ui/hud.rcss
```

**Manifest** — declare the document and its stylesheet:

```lua
-- open77.lua
resource "myhud"
version "1.0.0"
auto_start true

client_script "client.lua"
server_script "server.lua"
files { "ui/hud.rml", "ui/hud.rcss" }
```

**Document** — `data-model="hud"` binds the body to a Lua table; `{{...}}` prints a value and
`data-style-width` writes a style from an expression:

```html
<!-- ui/hud.rml -->
<rml>
<head>
    <link type="text/rcss" href="nui://open77/open77.rcss"/>
    <link type="text/rcss" href="hud.rcss"/>
</head>
<body data-model="hud">
    <div id="root">
        <div id="vitals" class="glass" data-class-critical="25 > health">
            <span class="eyebrow">Health</span>
            <span class="value">{{health}}</span>
            <div class="meter health"><div class="fill" data-style-width="health + '%'"></div></div>
        </div>
    </div>
</body>
</rml>
```

**Stylesheet** — RCSS lengths use `dp` (1080p pixels, scaled with the resolution):

```css
/* ui/hud.rcss */
body { width: 100%; height: 100%; }
#root { width: 100%; height: 100%; }
#vitals { position: absolute; left: 32dp; bottom: 40dp; width: 240dp; }
#vitals .value { font-size: 28dp; }
#vitals.critical .value { color: #ff4d5e; }
```

**Client script** — create the document with an initial model, then change single variables:

```lua
-- client.lua
local hud = assert(Open77.ui.create({
    document = "ui/hud.rml",
    layer = "hud",
    models = { hud = { health = 100 } },
}))

hud:onEvent("error", function(name, detail)
    print("[myhud] " .. tostring(name) .. ": " .. tostring(detail and detail.message))
end)

RegisterNetEvent("myhud:health", function(value)
    hud:set("hud", "health", math.floor(value))   -- only {{health}} and the meter are updated
end)
```

**Server script** — any server logic can feed the HUD:

```lua
-- server.lua
RegisterCommand("hurt", function(source)
    TriggerClientEvent("myhud:health", source, math.random(5, 100))
end)
```

The document is destroyed automatically when the resource stops or reloads.

## Layers, order and limits

| `layer` | Use | Permission |
|---|---|---|
| `hud` (default) | always-on gameplay information | none |
| `menu` | menus opened by the player | none |
| `modal` | dialogs above menus | none |
| `system` | platform surfaces | `ui.system` (or `webui.system`) |
| `debug` | developer tools | `ui.debug` (or `webui.debug`) |

Documents of one layer are ordered by `zIndex` (−100000 to 100000, default 0); `ui:setZIndex(z)`
changes it later. A resource owns at most **32** documents and 4,096 event listeners. NativeUI is
drawn above WebUI pages.

Documents created by a server-provided resource are presented once the session shows server
interfaces, like its WebUI pages: not over the pre-game shell, the connection screen or the
loading screen.

## Lifecycle

```lua
local ui = assert(Open77.ui.create({ document = "ui/menu.rml", layer = "menu", visible = false }))
ui:onEvent("loaded", function() print("ready, id " .. ui:id()) end)

ui:show()
ui:hide()           -- keeps state, models and listeners
ui:reload()         -- re-reads the RML/RCSS; models and runtime stylesheets are kept
ui:destroy()        -- returns false when it was already destroyed
```

Calls are **queued** and applied on the render thread before the next layout: a call returns `true`
when the command was accepted, not when it was drawn. A command that fails later (an unknown
selector, an invalid property) is reported through `ui:onEvent("error", fn)`. Calling a method on a
destroyed document raises a Lua error.

Create failures return `nil, reason`:

| Reason | Cause |
|---|---|
| `document_or_source_required` | pass exactly one of `document` and `source` |
| `undeclared_file:<path>` | the document, a stylesheet, image or font is not in `files` |
| `invalid_layer`, `permission_denied:ui.system`, `permission_denied:ui.debug` | layer and permissions |
| `nativeui_instance_limit` | the resource already owns 32 documents |
| `invalid_models`, `invalid_model_data`, `model_must_be_a_table_of_fields`, `invalid_events` | `models` / `events` shapes |
| `invalid_projection` | see [3D HUDs](native-ui-3d.md) |
| `nativeui_unavailable_on_this_host` | the renderer is not running (a server, or a headless client) |

## Developer tools

| Console | |
|---|---|
| `nui.stats` | documents, draw calls, triangles, pipeline switches, layers, backdrop copies, GPU memory, motion, scenes |
| `nui.debug <id\|console\|off>` | the RmlUi debugger on a document: element tree, computed styles, events |
| `nui.reload [id]`, `nui.hotreload on\|off` | reload one or every document; hot reload watches every file a document opened |
| `nui.demo [off]` | the built-in showcase |
| `nui.msaa <1\|2\|4\|8>` | anti-aliasing of vector shapes |
| `nui.timescale <x>`, `nui.reducedmotion on\|off` | slow every animation down, or skip motion |

Create a document with `hotReload = true` while you work on it: saving its RML or RCSS reloads it in
game. The developer console's **NativeUI** tab shows the live statistics, and
`Open77.ui.stats()` returns the same table to Lua. `ui:state().perf` gives one document's cost
(`fps`, `frameMs`, `updateMs`, `renderMs` and its scene counters).

RmlUi warnings (an unknown property, a missing image) are written to the client log once per
message every 10 seconds.

## Continue

- [Documents, data and events](native-ui-documents.md) — every `Open77.ui` call, data models,
  events, focus and input.
- [RML and RCSS for web developers](native-ui-rml.md) — what differs from HTML/CSS, and the traps.
- [Motion](native-ui-motion.md) — springs, keyframes and layout transitions.
- [Effects, shapes and themes](native-ui-effects.md) — the design system, GPU filters, custom HLSL
  effects, vector paths, fonts.
- [3D HUDs](native-ui-3d.md) — tilted documents and 3D panels.
- [3D scenes and minimaps](native-ui-scenes.md) — `<scene3d>`, views, routes and anchored markers.
- [Recipes](native-ui-recipes.md) — complete menus, toasts, a chat composer and a minimap.
