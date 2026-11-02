# WebUI cursor

While a WebUI page owns the mouse, the Windows cursor is hidden for the whole capture and Open77
draws its own cursor at the pointer position. A resource decides what that cursor looks like:
the Open77 arrow, a fixed shape, the shape the page's CSS asks for, or nothing at all so the page
can draw a custom cursor in HTML.

The cursor API runs on the client. Check that `page.setCursor` exists before relying on it: older
clients do not expose `page:setCursor`, `Open77.cursor` or `window.Open77.cursor`.

## Draw your own cursor

Hide the Open77 cursor for your page, take the mouse, and move an element with the DOM pointer
events. Pointer events carry page pixels, the same coordinates the click lands on.

```lua
-- client/main.lua
local page = assert(WebUI.create({ entry = "web/menu.html", layer = "menu" }))
assert(page:setCursor("none"))      -- Open77 draws nothing while this page owns the mouse
assert(page:setFocus(true, true))   -- keyboard and cursor
```

```html
<!-- web/menu.html -->
<img id="cursor" src="cursor.png" alt=""
     style="position:fixed;left:0;top:0;pointer-events:none;z-index:9999;will-change:transform">
<script>
  const cursor = document.getElementById("cursor");
  addEventListener("mousemove", (event) => {
    cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
  });
  Open77.ready();
</script>
```

Give the cursor element `pointer-events: none`. Otherwise the element under the pointer is the
cursor image itself and every click lands on it. Offset the image by its hotspot if the tip is not
its top-left corner.

The page can also switch its own cursor without a Lua round trip: `Open77.cursor.hide()` in the
page is the same as `page:setCursor("none")`.

## Cursor styles

| Style | What Open77 draws while the page owns the mouse |
| --- | --- |
| `default` | The Open77 arrow. This is the initial style of every page. |
| `none` | Nothing. The page draws its own cursor. |
| `css` | The shape of the page's CSS `cursor` under the pointer: `pointer` draws the hand, `text` the I-beam, `cursor: none` hides it. |
| `arrow`, `hand`, `text`, `move`, `resize-ns`, `resize-ew`, `resize-nesw`, `resize-nwse`, `not-allowed` | That shape, whatever the page's CSS says. |

Style names are case-insensitive. The CSS keywords for the same shapes are accepted as aliases,
for example `pointer`, `ns-resize`, `ew-resize`, `grab` and `all-scroll`. `hidden` is an alias of
`none`; `auto` and `page` are aliases of `css`.

In `css` mode, image cursors (`cursor: url(...)`) and shapes without an Open77 glyph (`crosshair`,
`wait`, `help`, ...) are drawn as the arrow. For an image cursor, use `none` and draw it in the page
as shown above.

### Follow the page's CSS

```lua
assert(page:setCursor("css"))
assert(page:setFocus(true, true))
```

```css
button { cursor: pointer; }      /* hand */
input  { cursor: text; }         /* I-beam */
.drag  { cursor: move; }
.cinematic { cursor: none; }     /* no cursor over this element */
```

## Lua API

### `page:setCursor(style)`

Sets what Open77 draws while this page owns the pointer. Returns `true`, or `false` and a reason.
No permission is needed: the style only applies to the calling resource's own page.

| Reason | Meaning |
| --- | --- |
| `invalid_cursor_style` | The argument is not a string. |
| `unknown_cursor_style` | The name is not a style or an accepted alias. |
| `webui_surface_unavailable` | The page no longer exists. |

### `page:getCursor()`

Returns the page's style under its canonical name (`page:setCursor("pointer")` reads back as
`"hand"`), or `nil` and a reason.

### `Open77.cursor`

| Function | Returns | Notes |
| --- | --- | --- |
| `Open77.cursor.hide()` | `true` or `false, reason` | Draws no Open77 cursor on any page while this resource holds the claim. Requires `webui.cursor`. |
| `Open77.cursor.show()` | `true` or `false, reason` | Releases this resource's claim. Claims held by other resources still apply. |
| `Open77.cursor.setVisible(visible)` | `true` or `false, reason` | `hide` and `show` with a boolean. |
| `Open77.cursor.isVisible()` | `boolean` | Whether Open77 drew a cursor on the last frame. |
| `Open77.cursor.isCaptured()` | `boolean, owner` | Whether a page or editor owns the pointer, and the owning resource. |
| `Open77.cursor.getPosition()` | `x, y, width, height` or `nil, reason` | The pointer in viewport pixels. `nil, "no_pointer"` when nothing owns it. |
| `Open77.cursor.setPosition(x, y[, normalized])` | `true` or `false, reason` | Moves the pointer, in viewport pixels or `0..1` with `normalized = true`, and sends the page a `mousemove`. |
| `Open77.cursor.center()` | `true` or `false, reason` | Same as `setPosition(0.5, 0.5, true)`. |
| `Open77.cursor.state()` | `table` | Everything below in one read. |
| `Open77.cursor.styles()` | `string[]` | Every style name. |

`page:setCursor("none")` hides the cursor for one page. `Open77.cursor.hide()` hides it for every
page, including other resources' menus, which is why it needs the `webui.cursor` permission:

```lua
resource "cinematics"
client_script "client/main.lua"
permissions { "webui.cursor" }
```

A resource's claim is released automatically when the resource stops.

Only the resource that owns the capture may move the pointer. `setPosition` and `center` fail with:

| Reason | Meaning |
| --- | --- |
| `cursor_not_captured` | No page or editor owns the pointer. |
| `cursor_not_owned` | Another resource's page owns it. |
| `cursor_on_world_screen` | The pointer drives a page shown on a screen in the world, where it follows the panel. |
| `invalid_cursor_position` | The coordinates are not finite numbers. |

`Open77.cursor.state()` returns:

```lua
{
  captured = true,          -- a page or editor owns the pointer
  visible = true,           -- Open77 drew a cursor on the last frame
  drawn = "hand",           -- the shape drawn, "none" when nothing is drawn
  hidden = false,           -- a resource holds Open77.cursor.hide()
  hiddenBy = {},            -- the resources holding it
  owner = "my_menu",        -- the resource that owns the pointer
  surface = 12,             -- its page
  pageStyle = "css",        -- that page's style
  pageCss = "hand",         -- the CSS cursor reported by the page
  nativeEditor = false,     -- a native editor, not a page, owns the pointer
  onWorldScreen = false,
  x = 960, y = 540, u = 0.5, v = 0.5, width = 1920, height = 1080,
}
```

### Event `open77:cursor:changed`

Raised when a capture starts or ends, changes owner, or the drawn shape changes. The arguments are
the owning resource (`""` when nothing owns the pointer) and the shape now drawn (`"none"` when
nothing is drawn).

```lua
AddEventHandler("open77:cursor:changed", function(owner, drawn)
    print(("pointer owner=%s drawn=%s"):format(owner, drawn))
end)
```

## JavaScript API

Every page has `window.Open77.cursor`. The calls are answered by the client directly, without a
Lua handler, and return promises.

| Call | Resolves with |
| --- | --- |
| `Open77.cursor.set(style)` | `{ style, drawn, captured, hidden }` |
| `Open77.cursor.hide()` | Same as `set("none")`. |
| `Open77.cursor.show()` | Same as `set("default")`. |
| `Open77.cursor.useCss()` | Same as `set("css")`. |
| `Open77.cursor.get()` | `{ style, drawn, captured, hidden }` |
| `Open77.cursor.setPosition(x, y)` | Moves the pointer to page pixels `(x, y)`. |
| `Open77.cursor.center()` | Moves the pointer to the centre of the page. |

`style` is this page's style, `drawn` the shape Open77 draws now (`"none"` while this page does not
own the pointer), `captured` whether this page owns the pointer, and `hidden` whether a resource
holds `Open77.cursor.hide()`. A failed call rejects with the reason, for example
`unknown_cursor_style`, `cursor_not_captured` or `cursor_not_owned`.

```js
document.querySelector("#custom").addEventListener("click", async () => {
  const state = await Open77.cursor.hide();
  console.log(state.style, state.drawn); // "none" "none"
});
```

## Keys held when a page takes the input

A key or mouse button that the game saw go down is always released in the game, even when a page
takes the keyboard or the mouse in the meantime. A player who walks forward, opens a page with
cursor capture and lets go of the key stops walking. The press itself stays captured: the
character keeps moving until the key is released. Nothing is required in a resource.

## Related

- [WebUI keyboard input](/docs/webui-input): consume Escape and navigation keys while gameplay
  keeps movement and mouse look.
- [Key bindings](/docs/keybindings): register rebindable actions.
- [UI kit](/docs/ui-kit): shared components for resource interfaces.
