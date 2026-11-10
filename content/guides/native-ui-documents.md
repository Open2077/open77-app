# NativeUI documents, data and events

This page is the reference for `Open77.ui`: creating a document, binding data, reacting to the
player, changing the DOM from Lua and borrowing the keyboard and mouse. Start with the
[NativeUI overview](native-ui.md) for requirements and a first resource.

## `Open77.ui`

| Function | Result |
|---|---|
| `Open77.ui.create(options)` | a document handle, or `nil, reason` |
| `Open77.ui.loadFont(path, family?, fallback?)` | `true`, or `nil, reason` |
| `Open77.ui.registerEffect(name, hlsl)` | `true`, or `nil, reason`; see [effects](native-ui-effects.md#custom-hlsl-effects) |
| `Open77.ui.stats()` | `{ text = "..." }`, the statistics `nui.stats` prints |

### `create` options

| Field | Default | |
|---|---|---|
| `document` | | path of an `.rml` file declared in `files`, relative to the resource root |
| `source` | | inline RML instead of a file (exactly one of `document` / `source`) |
| `layer` | `"hud"` | `hud`, `menu`, `modal`, `system`, `debug` |
| `zIndex` | `0` | order inside the layer, −100000..100000 |
| `visible` | `true` | `false` creates it hidden |
| `hotReload` | `false` | reload when one of its files changes on disk |
| `models` | | `{ name = { field = value, ... } }`: the data models the RML binds with `data-model` |
| `events` | | `{ name = { "event", ... } }`: the `data-event-*` callbacks a model may call |
| `projection` | | tilt the whole document, see [3D HUDs](native-ui-3d.md) |

```lua
local menu = assert(Open77.ui.create({
    document = "ui/shop.rml",
    layer = "menu",
    visible = false,
    models = { shop = { title = "Gun store", money = 0, items = {} } },
    events = { shop = { "buy", "close" } },
}))
```

## Data models

A data model is a Lua table published to the document. The RML binds to it with RmlUi's data
binding attributes; only the variables you change are re-evaluated.

```html
<body data-model="shop">
<div id="root">
    <h2>{{title}}</h2>
    <span class="value">{{money}} €$</span>
    <div class="item" data-for="item, i : items" data-class-locked="item.price > money">
        <span>{{i + 1}}. {{item.name}}</span>
        <span class="muted" data-if="item.stock == 0">sold out</span>
        <button data-event-click="buy(item.id)" data-attr-disabled="item.price > money">{{item.price}}</button>
    </div>
    <input type="range" min="0" max="100" data-value="volume"/>
    <button class="ghost" data-event-click="close()">Close</button>
</div>
</body>
```

| Attribute | |
|---|---|
| `{{expr}}` | text |
| `data-model="name"` | the model of this element and its children (usually on `<body>`) |
| `data-for="item, index : array"` | repeat the element per array entry (`index` is 0-based) |
| `data-if="expr"`, `data-visible="expr"` | remove from layout / hide |
| `data-class-<name>="expr"` | toggle a class |
| `data-style-<property>="expr"` | set one property, e.g. `data-style-width="pct + '%'"` |
| `data-attr-<name>="expr"` | set an attribute |
| `data-rml="expr"` | inner RML from a string |
| `data-value="path"`, `data-checked="path"` | two-way binding of a form control |
| `data-event-<event>="call(args)"` | call a declared model event |
| `data-alias-<name>="path"` | a shorter name inside a template |

Expressions support arithmetic, comparisons, `&&`, `||`, `!`, ternaries (`a ? b : c`) and string
concatenation. Inside an XML attribute write `&amp;&amp;` for `&&`, and prefer `25 > hp` to
`hp < 25`, which would need `&lt;`.

Lua values map as follows: numbers, strings and booleans directly; a Lua sequence is an array; a
table with string keys is an object; `{}` is an **empty array**. A model passed to `create` must be a
table of fields (`{}` there is an empty model).

### Updating a model

```lua
menu:set("shop", "money", 1250)                       -- one variable
menu:set("shop", "items[2].stock", 0)                 -- array paths are 1-based
menu:push("shop", "items", { id = 9, name = "Unity", price = 900, stock = 3 })
menu:removeAt("shop", "items", 1)                     -- removes the first entry
menu:merge("shop", { title = "Closed", money = 0 })   -- several fields of the model at once
```

`set` replaces a value at a path; replacing a whole array (`menu:set("shop", "items", list)`) is
fine for a list you rebuild. Compare before sending: the freeroam HUD keeps the last model and
merges only the fields that changed, every frame, at no layout cost when nothing changed.

### Model events

```lua
menu:onModel("buy", function(itemId)            -- the arguments of buy(item.id)
    TriggerServerEvent("shop:buy", itemId)
end)
menu:onModel("close", function() menu:blur(); menu:hide() end)

-- "change": the player edited a bound control (data-value / data-checked)
menu:onModel("change", function(path, value, model)
    if path == "volume" then print("volume", value) end
end)

-- "*": every event; the first argument is the event name
menu:onModel("*", function(name, ...) print("model event", name, ...) end)
```

An event must be listed in the `events` option to be callable from the document. `onModel` returns a
listener id for `ui:off(id)`.

## DOM events

`ui:on(type, [selector], fn)` listens to RmlUi events. Listeners are **delegated**: the selector is
matched against the event target or its closest ancestor, so one listener serves a whole list. They
run in the capture phase, so they also receive keys a focused text input consumes (Enter, arrows).

```lua
local id = menu:on("click", ".item", function(e)
    print("clicked", e.id, e.serial, e.button)       -- e.id = the matched element's id
end)
menu:on("keydown", function(e)
    if e.key == "escape" then menu:blur(); menu:hide() end
end)
menu:on("change", "#search", function(e) print("search:", e.value) end)
menu:off(id)
```

Common types: `click`, `dblclick`, `mousedown`, `mouseup`, `mouseover`, `mouseout`, `mousemove`,
`mousescroll`, `dragstart`, `drag`, `dragend`, `focus`, `blur`, `change`, `submit`, `keydown`,
`keyup`, `textinput`, `scenepick`, `scenehover`.

| Detail field | |
|---|---|
| `type`, `id`, `tag`, `serial` | the event and the matched element (`serial` addresses it as `"@serial"`) |
| `targetId` | the element actually hit, when it is a child of the matched one |
| `value` | the control's value when the matched element is a form control |
| `mouse_x`, `mouse_y`, `button` | mouse events; `button` 0 left, 1 right, 2 middle, 3 back, 4 forward |
| `wheel_delta_x`, `wheel_delta_y` | `mousescroll` |
| `key`, `key_identifier`, `ctrl_key`, `shift_key`, `alt_key`, `meta_key` | keyboard events |

`key` is a readable name: `a`..`z`, `0`..`9`, `f1`..`f24`, `numpad0`.., `escape`, `enter`, `tab`,
`space`, `backspace`, `delete`, `insert`, `up`, `down`, `left`, `right`, `home`, `end`, `pageup`,
`pagedown`, `shift`, `control`, `alt`, and the punctuation names `semicolon`, `equals`, `comma`,
`minus`, `period`, `slash`, `backquote`, `bracketleft`, `backslash`, `bracketright`, `quote`.

`mousescroll` and `mousemove` have no default action: listen on the element that should react.
Drag events follow the left button only.

## Document events

`ui:onEvent(kind, fn)` receives `fn(name, detail)`:

| Kind | When |
|---|---|
| `loaded` | the document finished loading (first time) |
| `reloaded` | after `ui:reload()`, hot reload or `nui.reload` |
| `error` | a queued command failed; `name` is the command, `detail.message` the reason |
| `focus` | `name` is `focus` or `blur`; a blur carries `detail.reason` (`taken`, `released`, `suspended`) and, when taken, `detail.by` (the resource that took it) |
| `closed` | the document was destroyed |
| `scene` | a 3D scene loaded a file, failed, or computed a route; see [scenes](native-ui-scenes.md) |

## Changing the document

Selectors are RCSS selectors (`#id`, `.class`, `div > span`, `:first-child`...) or a serial
`"@1073741825"` returned by `ui:create` or carried by an event. A command applies to every match.

| Method | |
|---|---|
| `ui:text(sel, s)` | text content, escaped |
| `ui:rml(sel, rml)` | inner RML |
| `ui:attr(sel, name, value \| nil)` | set or remove an attribute |
| `ui:class(sel, name, on?)` | add (`on` omitted or `true`) or remove a class |
| `ui:setClasses(sel, "a b c")` | replace the class list |
| `ui:style(sel, prop, value \| nil)`, `ui:style(sel, { prop = value, ... })` | inline properties; `nil` removes; numbers are written as plain numbers, so pass `"12dp"` for lengths |
| `ui:value(sel, v)` | a form control's value |
| `ui:click(sel)`, `ui:focusElement(sel)`, `ui:blurElement(sel)` | actions |
| `ui:scrollTo(sel, align?, smooth?)` | `align` is `true`/`false` (top/bottom) or `"start"`, `"center"`, `"end"`, `"nearest"`, `"adaptive"` |
| `ui:create(parent, spec) -> "@serial"` | new element; `spec = { tag = "div", id, class, text \| rml, attributes = {}, style = {}, before = sel, enter = animation }` |
| `ui:insert(sel, rml, position?)` | RML at `"end"` (default), `"start"`, `"before"` or `"after"` the target |
| `ui:remove(sel, exit?, onDone?)` | remove, optionally animating out first (see [motion](native-ui-motion.md)) |
| `ui:stylesheet(name, rcss \| nil)` | a named RCSS layer over the document's sheets; see [themes](native-ui-effects.md#themes-at-runtime) |
| `ui:batch(fn)` | every call inside `fn` is submitted together (no `Wait` inside) |

```lua
-- a toast element with an entrance animation, removed later with an exit animation
local toast = menu:create("#toasts", {
    class = "glass toast",
    text = "Item bought",
    enter = { from = { y = 16, opacity = 0 }, to = { y = 0, opacity = 1 }, preset = "snappy" },
})
SetTimeout(3000, function()
    menu:remove(toast, { to = { opacity = 0, x = 40 }, preset = "calm" })
end)

-- many changes, one submission
menu:batch(function()
    for i, row in ipairs(rows) do menu:text(("#row%d .name"):format(i), row.name) end
    menu:class("#list", "loading", false)
end)
```

`ui:style` returns before the change is applied, and inline styles beat class rules: to toggle
visibility with classes, do not also set `visibility` inline.

## Reading layout

```lua
menu:watch("#panel")                 -- publish its rectangle every frame
CreateThread(function()
    Wait(0)
    local r = menu:rect("#panel")    -- { x, y, width, height } in screen pixels, nil until published
    if r then print(r.x, r.y, r.width, r.height) end
end)
menu:unwatch("#panel")

local s = menu:state()
-- s.loaded, s.visible, s.focused, s.width, s.height (screen), s.error (last failure),
-- s.perf = { fps, frameMs, updateMs, renderMs, sceneDraws, sceneRenders, sceneInstances, sceneGpuMB },
-- s.projection (presented values), s.scenes
```

`state`, `rect` and `sceneState` read a snapshot published after each frame, so a value reflects the
last drawn frame, not the command you just queued.

## Focus and input

A HUD never needs input. A menu borrows the keyboard and mouse from the game with `ui:focus()`,
through the same native input lease as Open77's editors:

```lua
menu:show()
local ok, reason = menu:focus()                  -- keyboard and cursor
-- menu:focus({ keyboard = true, cursor = false }) -- keyboard only: a chat composer
print(menu:hasFocus())
menu:blur()                                       -- give everything back
```

While a document holds the cursor, `Open77.input.isCaptured()` reports it, and HUDs that step aside
under cursor interfaces hide. With `cursor = false` the lease takes the keyboard only, so those HUDs
stay on screen.

NativeUI never takes the input from a WebUI page that holds the focus (the pre-game shell, an open
WebUI menu). `focus()` then fails, and the document receives an `error` event `focus` with the
message `focus_unavailable`; retry when that page lets go. When the input leaves the document,
`onEvent("focus")` reports `blur` with a reason:

| `detail.reason` | |
|---|---|
| `taken` | another surface took it; `detail.by` names its resource |
| `released` | `ui:blur()`, `ui:hide()` or the document was destroyed |
| `suspended` | the game window was deactivated; the focus returns by itself when it is in front again |

## Images and fonts

`<img src>` and image decorators accept a path in the resource (declared in `files`), a `nui://`
URL, or a `data:` URL (`data:image/png;base64,...`; PNG, JPEG or WebP, up to 16 MiB). A picture a
script received as data can therefore be shown without writing a file. Write resource paths from the
resource root (`/ui/icons/medkit.png`) when the RML file sits in a sub-folder.

The built-in fonts are Lato, Roboto Mono, Rajdhani and Chakra Petch. Load your own TrueType or
OpenType file once, then use its family name in RCSS:

```lua
-- files { "ui/fonts/Orbitron-Bold.ttf" }
assert(Open77.ui.loadFont("ui/fonts/Orbitron-Bold.ttf", "Orbitron"))
-- third argument true: use it as a fallback for glyphs other fonts lack
```

```css
h1 { font-family: Orbitron; }
```

`loadFont` returns `font_not_declared` for a file outside `files`, and `unreadable_font` for a file
it cannot read. Convert WOFF/WOFF2 to TTF first. A variable font provides a single instance: export
one static TTF per weight you need.
