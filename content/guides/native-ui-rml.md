# RML and RCSS for web developers

NativeUI documents are written in RML and RCSS, RmlUi's dialects of HTML and CSS. Most of what you
know carries over: flexbox, selectors, pseudo-classes, transitions, `@keyframes`, gradients,
transforms, `border-radius`, `box-shadow`, filters. This page lists what differs, and the mistakes
that cost the most time. The reference for the dialect itself is the
[RmlUi documentation](https://mikke89.github.io/RmlUiDoc/).

## Document skeleton

```html
<rml>
<head>
    <title>My menu</title>
    <link type="text/rcss" href="nui://open77/open77.rcss"/>
    <link type="text/rcss" href="menu.rcss"/>
    <style>
        #root { padding: 24dp; }
    </style>
</head>
<body data-model="menu">
    <div id="root"> ... </div>
</body>
</rml>
```

- The file is XML: close every tag (`<img .../>`, `<input .../>`), quote attributes, and escape
  `&` and `<` inside attributes (`&amp;&amp;`, or write comparisons the other way round: `25 > hp`).
- **`<body>` is the document.** `ui:class("body", ...)` or a selector starting at `html` matches
  nothing. Put everything in a root element (`<div id="root">`) and target that.
- Give `body` (and your root) `width: 100%; height: 100%;`, otherwise the layout collapses to the
  content size.
- There is no JavaScript. Logic lives in Lua: data models, `ui:on` and the DOM methods.

## Units

Use `dp` for lengths: one dp is one pixel at 1080p and scales with the resolution, so a layout looks
the same at 1440p and 4K. `px` stays physical. Percentages, `em` and `vw`/`vh` work as in CSS.

## Layout

- Flexbox and absolute positioning are the tools; there is no CSS grid and no `float` layout worth
  using.
- **Text placed directly in a flex container is not drawn.** Wrap it: `<div class="row"><span>Label</span></div>`.
  The same applies to text in an `inline-flex` label.
- Flex children shrink to zero under long content: add `flex-shrink: 0` to icons, badges and
  fixed-width columns.
- A percentage width inside an absolutely positioned, shrink-to-fit element resolves against the
  **screen**, not the element. Size such rows by their content, and stretch hairlines with absolute
  `left`/`right` instead of `width: 100%`.
- An absolutely positioned layer inside a `min-height` flex row gets no height. Draw the
  background on the row itself (a decorator or a border) instead.

## Events and input

- `pointer-events` is **not inherited**. A full-screen overlay `<div>` takes every click even if
  its parent has `pointer-events: none`; set `pointer-events: none` on the overlay itself.
- `mousescroll` and `mousemove` have no default action. Listen on the element that should scroll
  or follow the mouse.
- Drag events follow the left mouse button only.
- `ui:on` listeners run in the capture phase, so they see Enter and arrow keys even while a text
  input has the keyboard focus.
- A checkbox bound with `data-checked` writes its value back into the model when the document
  loads: initialise the model with the value you want before creating the document.

## Styles

- Inline styles (`ui:style`, `style=""`) beat class rules. Toggling `visibility` with classes on an
  element that also has an inline `visibility` does nothing.
- `drop-shadow(color x y blur)` takes the colour **first**.
- The Open77 filters take plain numbers: `scanlines(0.35 3)`, `chromatic(2)`. Only `glow` takes a
  length and a colour: `glow(6dp #22d8e2 1.2)`.
- `backdrop-filter` is still drawn at `opacity: 0`. Hide frosted panels with `display: none`
  (`data-if` in a template).
- An `image()` decorator does not tile cleanly: do not use it for repeating patterns.
- `fx(chamfer ...)` with a fill alpha of `0` falls back to the default fill: use `0.01`.

## Assets

- Every file the document opens (RML, RCSS, images, fonts) must be listed in the manifest's
  `files`; globs work: `files { "ui/*.rml", "ui/*.rcss", "ui/img/*" }`. Anything else fails with
  `undeclared_file:<path>`.
- In a document stored in a sub-folder, write image paths from the resource root
  (`/ui/img/logo.png`).
- Images may also be `data:` URLs (PNG, JPEG, WebP, up to 16 MiB).
- Web fonts (WOFF/WOFF2) must be converted to TTF/OTF; a variable font gives one instance, so
  export one static file per weight.

## Building large interfaces

A client Lua resume has an instruction budget. Building hundreds of elements in one go (a long
inventory list, a catalogue) belongs in a data model with `data-for`, not in a loop of
`ui:create` calls. If you must create elements from Lua, use `ui:batch` and spread the work over a
few frames with `Wait(0)`.

```lua
local CHUNK = 100
CreateThread(function()
    for first = 1, #rows, CHUNK do
        ui:batch(function()
            for i = first, math.min(first + CHUNK - 1, #rows) do
                ui:create("#list", { class = "row", text = rows[i].name })
            end
        end)
        Wait(0)
    end
end)
```

## Debugging

- `nui.debug <id>` opens the RmlUi debugger on a document (element tree, computed styles, events);
  `nui.debug off` closes it. `ui:id()` gives the id.
- Create the document with `hotReload = true` and save the RML/RCSS: it reloads in game.
- Warnings are written to the client log, once per message every 10 seconds.
- `ui:onEvent("error", fn)` reports every queued command that failed (an unmatched selector, an
  invalid value).
