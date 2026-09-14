# Key mappings

`RegisterKeyMapping` is an **engine primitive**, not a resource. A resource declares a named action
bound to a default key and supplies the callback to run; the engine owns the registry, the
per-frame dispatch, and the persistence of rebinds. The player rebinds any registered action from
**Pause → Settings → KEY BINDINGS**, and the new key is remembered across servers and relaunches.

Developers coming from FiveM will recognize the call. Open77 has no client command bus, so the
mapping runs a Lua callback the resource supplies directly, rather than a registered command string.

A binding is observe-only: pressing its key fires the action but never hides the key from the game,
and it is suppressed whenever a page owns the keyboard (chat open, the pause menu open, a rebind in
progress), so typing never triggers an action.

## Permission

Every entry point requires the `input.actions` permission — the same one that gates
`Open77.input.isDown`:

```lua
resource "flashlight"
version "1.0.0"

client_script "client/main.lua"

permissions { "input.actions" }
```

## Declare a mapping

`RegisterKeyMapping` is a bare global, mirrored as `Open77.input.registerKeyMapping`. The positional
form is the common case:

```lua
-- RegisterKeyMapping(id, name, defaultKey, onPressed [, onReleased])
RegisterKeyMapping("flashlight", "Toggle flashlight", "F", function()
    toggleFlashlight()
end)
```

The callback receives the mapping `id` as its only argument. `RegisterKeyMapping` returns
`true, "<effectiveKey>"` on success — the effective key is the player's saved rebind if there is one,
otherwise the default — or `false, "<reason>"`.

Re-registering the same `id` replaces the previous entry (reload-safe) and keeps the player's rebind.

## Press and hold

By default the action fires once on the key-down edge. Supply a release callback — or set `hold` in
the table form — to receive the key-up edge as well. Use the table form when you need `hold`
explicitly:

```lua
Open77.input.registerKeyMapping({
    id = "sprint",
    name = "Hold to sprint",
    key = "SHIFT",           -- `defaultKey` is accepted as an alias
    hold = true,
    onPressed  = function() startSprint() end,
    onReleased = function() stopSprint() end,
})
```

In the positional form, passing a fifth argument (the release callback) implies hold mode.

## Key names

Keys use the same vocabulary as `Open77.input.isDown`, normalized to upper case:

- a single alphanumeric — `A`–`Z`, `0`–`9`
- `F1`–`F12`
- `SPACE`, `ENTER`/`RETURN`, `TAB`, `SHIFT`, `CTRL`/`CONTROL`, `ALT`, `CAPSLOCK`, `BACKSPACE`,
  `INSERT`, `DELETE`, `HOME`, `END`, `PAGEUP`, `PAGEDOWN`, and the four arrow keys `UP`, `DOWN`,
  `LEFT`, `RIGHT`.

The pause page's capture, the Lua layer, and the native dispatch all agree on this set, so a key
chosen in the rebinding UI maps to exactly what a resource registered.

**Only keyboard keys can be bound.** A mapping's key is persisted, listed in the pause menu and
polled by the engine's own dispatcher, and that dispatcher reads keys. Mouse buttons and gamepad
controls are readable — see the next section — but they are not bindable, and the vocabulary was
deliberately left alone so that a key saved in `keybinds.json` can never name a control nothing
polls.

## Reading a device directly

`Open77.input` also reads the mouse, the wheel, a gamepad and the cursor. Same table, same
`input.actions` permission: a mouse button is the same kind of read as a key, and a second
permission string would only mean every menu manifest grows a line.

| Call | Answers |
|---|---|
| `Open77.input.isDown(control)` | A key, a mouse button or a gamepad button. `boolean`, or `false, reason`. |
| `Open77.input.axis(name)` | A stick, a trigger, the cursor, or a cumulative counter. `number`, or `nil, reason`. |
| `Open77.input.cursor()` | `x, y, source` — the pointer as 0..1 across the image. |
| `Open77.input.devices()` | Every mouse and gamepad control, and whether this machine can answer for it. |
| `Open77.input.isCaptured()` | Whether a WebUI owns the keyboard. |

### Control names

| Group | Names |
|---|---|
| Mouse buttons | `mouse1`/`mouseLeft`, `mouse2`/`mouseRight`, `mouse3`/`mouseMiddle`, `mouse4`, `mouse5` |
| Mouse axes | `mouseX`, `mouseY`, `mouseDeltaX`, `mouseDeltaY`, `mouseWheel`, `mouseWheelX` |
| Gamepad buttons | `padA`, `padB`, `padX`, `padY`, `padUp`, `padDown`, `padLeft`, `padRight`, `padStart`, `padBack`, `padLeftShoulder` (`padLB`), `padRightShoulder` (`padRB`), `padLeftThumb`, `padRightThumb` |
| Gamepad axes | `padLeftStickX`/`Y`, `padRightStickX`/`Y`, `padLeftTrigger`, `padRightTrigger` — each also spelled without the `pad` prefix (`leftStickX`, `rightTrigger`, …) |

Names are case-insensitive. `Open77.input.devices()` is the authoritative list for the machine the
resource is running on, and it is the list to build a settings screen from rather than the table
above.

### These are physical reads

Everything here reports **the device**, not the game's interpretation of it. It does not know the
player's Cyberpunk key bindings, it does not know whether the game or a menu is currently consuming
the control, and it does not know about in-game controller remapping. In FiveM's vocabulary that
makes every one of these the `GetDisabledControlNormal` flavour rather than the `GetControlNormal`
one.

To get the enabled flavour, combine it with the two questions Open77 can answer about who owns the
input:

```lua
local function gameplayInput(control)
    if Open77.input.isCaptured() then return false end        -- a WebUI has the keyboard
    if Open77.session.isMenuOpen() then return false end      -- some modal owns the screen
    return Open77.input.isDown(control) == true
end
```

Gamepad reads are also zero — and buttons false — while the game window is not in the foreground.
The keyboard already behaved that way; this only extends the rule to the pad.

### A missing device is named, never answered zero

An unplugged gamepad refuses by name. This matters more than it looks: an axis that always reads
zero cannot be told from a stick held at centre, so a menu built on a silent zero looks broken
rather than unsupported.

```lua
local turn, reason = Open77.input.axis("padRightStickX")
if turn == nil then
    -- reason == "gamepad_not_connected" on a machine with no pad
    turn = 0
end
```

Asking for an axis by `isDown`, or a button by `axis`, is a real mistake and each is named:
`control_is_an_axis` and `control_is_a_button`. An unknown name is `unsupported_action_key`.

Gamepad support is **XInput**, slot 0. Controllers that present themselves as XInput devices — the
Xbox pads, and a DualSense or DualShock through Steam Input or DS4Windows — are read; one that does
not is invisible and reports as not connected. Sticks come back with XInput's own dead zones removed
and the remainder rescaled, so a stick at rest reads exactly `0` and at the rim exactly `1`; stick Y
is positive **up**.

### The wheel and the motion counters are cumulative

`mouseWheel`, `mouseWheelX`, `mouseDeltaX` and `mouseDeltaY` count from the moment the client
started and are **not consumed by reading them**. Difference two samples:

```lua
local previous = Open77.input.axis("mouseWheel") or 0
CreateThread(function()
    while true do
        Wait(0)
        local now = Open77.input.axis("mouseWheel") or 0
        if now ~= previous then
            scrollList(now - previous)   -- positive is away from the player
            previous = now
        end
    end
end)
```

A consume-on-read wheel would be shorter to use and wrong: two resources reading it would each
receive part of the same scroll, and neither could tell.

### The cursor, and which space it is in

`Open77.input.cursor()` returns `x, y` as **0..1 across the rendered image, origin top left**, plus
a `source`. That is the same frame `Open77.camera.project` answers in and `Open77.camera.unproject`
consumes, so hit-testing a projected world point is a subtraction:

```lua
local x, y = Open77.input.cursor()
local target = Open77.camera.project({ x = 100.0, y = 220.0, z = 15.0 })
if x and target and target.onScreen then
    local dx, dy = x - target.x, y - target.y
    if dx * dx + dy * dy < 0.02 * 0.02 then showTooltip() end
end
```

It is a ratio and not pixels on purpose. A client-rect read and the engine's own back-buffer size
disagree on a display with DPI scaling — measured on an ultrawide at 125%, a client rect said
1024x576 while the engine was rendering 1280x720 — so every pixel answer would need a qualifier the
caller cannot see. A ratio needs none, because the position and the rectangle it is divided by come
from the same measurement.

`source` says which regime produced it:

| `source` | Meaning |
|---|---|
| `overlay` | A WebUI surface owns the pointer. This is Open77's own virtual cursor, the one CEF and the drawn pointer share — the only meaningful position while a page is up. |
| `system` | Nobody owns it, so this is the OS cursor mapped into the game's client area. |

During ordinary gameplay Cyberpunk recentres the OS cursor every frame, so `system` reads near
`0.5, 0.5`. That is where the cursor is, not a failed read.

## Rebinding UI

The pause menu's **KEY BINDINGS** tab lists every registered action across every running resource
and rebinds them. It is only a viewer: it reads the registry and writes back through the same
management API any resource may call.

| Call | Effect |
|---|---|
| `Open77.input.mappings()` | Array of every registered mapping: `{ resource, id, name, key, defaultKey, hold, rebound }`. |
| `Open77.input.rebind(resource, id, key)` | Set and persist a new key for any mapping. Returns `true, key` or `false, reason`. |
| `Open77.input.reset(resource, id)` | Restore a mapping to its default key and drop the saved override. Returns `true, defaultKey`. |
| `Open77.input.keyFor(id)` | Effective key of one of this resource's own mappings, or `nil`. |
| `Open77.input.unregisterKeyMapping(id)` | Remove a mapping this resource declared. Returns a boolean. |

The engine raises the local event **`open77:keybinds:changed`** (no arguments) after any register,
rebind, reset, or unregister, so a viewer can reload its list:

```lua
AddEventHandler("open77:keybinds:changed", function()
    -- refresh a custom keybind display
end)
```

## Registration reference

| Field | Meaning |
|---|---|
| `id` | Unique within the resource. Letters, numbers, `_`, `.`, `:`, `-`, up to 64 characters. |
| `name` | Human label shown in the KEY BINDINGS tab. Defaults to `id`; capped at 96 characters. |
| `key` | Default key from the vocabulary above. `defaultKey` is an accepted alias. |
| `hold` | When true, `onReleased` fires on key-up in addition to `onPressed` on key-down. |
| `onPressed` | Called on the key-down edge with the mapping `id`. |
| `onReleased` | Called on the key-up edge (hold mode only) with the mapping `id`. |

A resource may register up to 64 mappings. Bindings never fire while another WebUI owns keyboard
focus, and pressing a mapped key does not stop the game from also seeing it — choose keys that do
not clash with an in-world action, or let players rebind.

## Persistence

Rebinds are stored in a single **machine-global** file, `…/storage/keybinds.json`, deliberately
outside the per-server KVP layout so a rebind follows the player to every server and survives a
relaunch. The engine owns and validates the format; a corrupt file degrades to defaults rather than
refusing bindings. A mapping inherits its saved key at registration time, so the player's choice is
applied the moment the resource declares the action on the next session.
