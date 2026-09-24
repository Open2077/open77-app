# The UI kit

`open77_uikit` provides shared dialogs and HUD widgets: progress bars, hints, confirmations, input forms, context and keyboard menus, radial wheels, world text and letterboxing.

Widgets share one WebUI surface and a common design system. Resources do not need a separate browser page for each dialog.

`lib.notify` already exists and is not here: toasts are
[`open77_notifications`](notifications.md). Use that.

## Add the dependency

```lua
resource 'garage'
version '1.0.0'
dependency 'open77_uikit >=1.0.0'

client_script 'client.lua'
server_script 'server.lua'
permissions { 'network.events' }
```

You need **no permission for the kit itself**. `open77_uikit` holds
`input.actions`, `input.blockAll` and the surface; that is the point of a
presentation boundary. A caller that wants to block input for its own reasons
still needs its own `input.actions` -- see [Blocking player input](input-blocking.md).

## Calling a widget

Every widget is a **client export called asynchronously**:

```lua
local promise, reason = Open77.exports.call('open77_uikit', 'alert', {
    title   = 'Sell the Quadra?',
    message = 'It will be gone for good. 12 400 eddies, paid on hand-over.',
    confirm = 'Sell it',
    cancel  = 'Keep it',
    tone    = 'warning',
})
assert(promise, reason)
local answer = promise:await()
```

**The synchronous spelling does not work for a dialog**, and this is not a
style preference. `exports.open77_uikit:alert(...)` runs the callee inline on
the game thread, and a dialog has to wait for a human; a synchronous callee that
yields fails with `export_yielded`. The calls that never wait -- `textUI`,
`hideTextUI`, `textUIState`, `context`, `menu`, `radial`, `hideContext`,
`hideMenu`, `hideRadial`, `progressActive`, `cancelProgress`, `drawText3D`,
`updateText3D`, `clearText3D`, `listText3D`, `showCinematicBars`,
`setCinematic`, `cinematicState`, `close` and `state` -- work either way. When
in doubt use `Open77.exports.call`: it is correct for all of them.

`await` needs a scheduler coroutine, so wrap it in `CreateThread`. See
[Cross-resource server exports](resource-exports.md#calling-an-export).

## Two result shapes, and they are never confused

```lua
local promise, reason = Open77.exports.call('open77_uikit', 'input', definition)
if not promise then                      -- (1) the request was refused
    Open77.log.warn('uikit: ' .. reason)
    return
end
local answer = promise:await()           -- (2) the widget ran
if answer.ok then
    use(answer.value)
elseif answer.outcome == 'cancelled' then
    -- ordinary. The player changed their mind.
elseif answer.outcome == 'timeout' then
    -- they wandered off.
end
```

1. **`nil, reason`** -- the widget never opened. A bad definition, another
   resource holding the page, the surface not ready. `reason` is a stable
   snake_case token from [the table below](#failure-reasons). Nothing was shown.
2. **A table** -- the widget ran. Always `{ ok, outcome, value }`:

   | Field | Meaning |
   |---|---|
   | `ok` | `true` only when `outcome == "ok"`. |
   | `outcome` | `"ok"`, `"cancelled"` or `"timeout"`. Always present. |
   | `value` | the answer. Absent unless `ok`. |

**A cancelled dialog is a normal outcome, not an error.** The player pressing
Escape resolves the promise with `{ ok = false, outcome = "cancelled" }`; it
never rejects. You do not need a `pcall` around ordinary user behaviour, and you
can tell "they said no" from "it never opened" without parsing a message.

## Focus: the rule that outranks the feature list

Taking keyboard and cursor focus **stops game input wholesale**. A player left
with a dead dialog cannot move, cannot shoot, and cannot type to say so. The kit
is built around giving focus back, and the design has three parts:

- **Focus is a ledger, not a flag.** It is held while at least one open widget
  asked for it, and `setFocus` is called from exactly one function that derives
  the real state from that set.
- **Every exit funnels through one place.** Confirm, cancel, Escape, timeout,
  owner stop, owner reload, owner vanished, our own stop, death and disconnect
  are ten doors into the same room.
- **A watchdog asserts the invariant every tick.** If the ledger is empty and
  focus is still held, it is released. A future edit that adds an eleventh door
  and forgets to close it costs one frame, not a stranded player.

### The release matrix

Every row is covered by `scripting/tests/uikit_focus_test.py`, which loads the
real `client/main.lua` into a real Lua 5.4 VM and asserts both halves: the
promise settled, **and** `setFocus(false, false)` ran.

| # | Exit path | Raised by | Outcome |
|---|---|---|---|
| 1 | Confirm / submit / a leaf option picked | the page | `ok` |
| 2 | Cancel, close, click off a browse dialog | the page | `cancelled` |
| 3 | **Escape** | `open77:pauseKey` | `cancelled` |
| 4 | Timeout | the kit's own deadline | `timeout` |
| 5 | The calling resource stops | `onClientResourceStop` | `cancelled` |
| 6 | The calling resource reloads | generation change on its next call | `cancelled` |
| 7 | The calling resource vanishes | the once-a-second owner sweep | `cancelled` |
| 8 | The player dies | `open77:playerLifeStateChanged` | `cancelled` |
| 9 | The session ends | `open77:session:ended` | `cancelled` |
| 10 | `open77_uikit` itself stops | `onClientResourceStop` | `cancelled` |
| 11 | The kit's VM dies without running a line | the host destroys the surface | -- |

Row 3 deserves a note, because a page's own Escape handler is not what runs. The
plugin **swallows Escape in the window procedure**, so a focused surface never
sees the key; `open77:pauseKey` is raised instead and that is the path the kit
listens on. The page has its own `Escape` handler as well, which is what makes
it behave correctly outside a live session; a double cancel is harmless because
the second one carries a dead token.

Row 8 is opt-out. `useWhileDead = true` keeps a dialog open through death --
a revive prompt wants exactly that. Everything else closes, because a dialog
that survives death leaves a respawn screen the player cannot click through.

### A dialog is refused, never queued

**Only one focus-taking dialog can be open across all resources.** Additional requests return `dialog_active` and are not queued. Only the owning resource can close it; other resources receive `not_owner`.

The other widgets are not exclusive. `textUI` gives each resource its own slot,
four at once. `progress` is one at a time and refuses with `progress_active`,
because two bars stacked over each other say nothing useful.

## Control blocking is not focus

A progress bar that stops the player moving is the canonical use of
[`Open77.input`](input-blocking.md), and the kit blocks through that surface --
**never** by holding focus:

```lua
Open77.exports.call('open77_uikit', 'progress', {
    label    = 'Hotwiring the door',
    duration = 4000,
    disable  = { move = true, combat = true },
})
```

Holding focus would achieve something that looks similar and is much worse: it
takes the keyboard from chat too. `blockAll` deliberately leaves chat and voice
working, because a player who cannot act must still be able to say so. A
progress bar in this kit **never focuses**, and the test suite asserts it.

| `disable` key | Vocabulary action | Effect |
|---|---|---|
| `move` | `Movement` | walking, running, jumping, dodging, climbing |
| `combat` | `Attack` | firing a ranged weapon |
| `map` | `Map` | the fullscreen map shortcut |
| `hub` | `Hub` | inventory, crafting, perks, stats, journal |
| `fastTravel` | `FastTravel` | the player's own fast travel |
| `disable = 'all'` | `blockAll` | the whole gameplay stream. Accepts `except = { 'Movement' }`. |

Claims are **refcounted inside the kit** and released when the widget settles,
when the owner goes away, and when the kit stops. Blocking is a loan and the
platform releases only the calling resource's claim, so the kit cannot hand a
claim back while another widget still needs it.

An action the engine cannot refuse is refused by name
(`action_not_blockable`), logged, and the widget still runs -- read
[Blocking player input](input-blocking.md) before you assume `combat` is
airtight on 2.31, and note that `Attack` is `inferred` there, not proven.

## Asking whether a menu is open

A gameplay loop usually wants to stop reading input while *anything* modal is on
screen -- the kit's own dialogs, the pause overlay, chat, a vanilla menu, photo
mode. Before this existed the only signal was `open77:pauseKey`, which is an
**edge**, and only the one the window procedure decided to swallow; eight
framework files each kept their own boolean and every one of them was wrong the
moment a different layer took the screen.

`Open77.session` answers it directly. The permission is `session.menus`.

| Call | Answers |
|---|---|
| `Open77.session.isMenuOpen()` | Any modal layer, Open77's or the game's. `boolean`, or `nil, reason`. |
| `Open77.session.isPauseMenuOpen()` | The **vanilla** pause menu specifically. |
| `Open77.session.menuState()` | Every layer at once, plus which one has the screen. |

```lua
permissions { "session.menus" }

CreateThread(function()
    while true do
        Wait(0)
        if not Open77.session.isMenuOpen() then
            pollGameplayInput()
        end
    end
end)
```

### What `isMenuOpen` promises

That some modal layer owns the screen and a gameplay loop should not be reading
input. Six layers count:

| Layer | `source` | Comes from |
|---|---|---|
| An Open77 WebUI surface holds the keyboard | `overlay` | the kit, the pause menu, chat, any page that called `setFocus` |
| The pre-game character creator, or the menus it is unwinding through | `creator` | the pre-game bridge |
| Any vanilla menu scenario | `vanilla` | the scenario wrappers; `menuState().scenario` names it |
| Photo mode | `photoMode` | the native photo-mode system |
| The Open77 appearance mirror | `appearance` | the appearance bridge |
| The Open77 developer console | `console` | the console |

That is the **same disjunction the window procedure already uses to route the
escape key**, extended by photo mode and the console, and `source` reports them
in the same priority order. So a script branching on `source` branches the way
the game already behaves, rather than on a second opinion about it.

The pause menu is a menu, but a menu is not the pause menu: a resource that
stops its loop for the map while keeping its own pause handler needs those to be
two questions, which is exactly what `open77:pauseKey` alone could never express.

### What it cannot see

The vanilla half is fed by the gameplay idle scenario's leave/enter wrappers, so
**a screen that does not pass through that scenario never reports itself**.
Radial and hub wheels are in that category -- Open77 refuses them rather than
observing them -- and so is every pre-game screen except the creator, which has
its own predicate. A resource that needs certainty about its *own* modal should
still track its own, and compare `menuState().overlayResource`, which names the
resource that owns the focused surface rather than hard-coding one in the
engine.

### The event

`open77:menuStateChanged` is raised on the edge, from the same snapshot
`menuState()` reads, so the two can never describe one instant differently.

```lua
AddEventHandler("open77:menuStateChanged", function(open, pauseMenu, source, scenario)
    if open == "1" then pauseLoop(source) else resumeLoop() end
end)
```

Arguments are strings, as every local event argument is on this transport:
`open` and `pauseMenu` are `"1"` or `"0"`, `source` is one of the values above,
and `scenario` is the vanilla scenario name or `""`.

Both `open` and `source` are compared when deciding whether to raise it. A
player who goes from the vanilla map straight into photo mode never passes
through "closed", and a loop listening only for the boolean would believe
nothing had changed.

**No event is synthesised at startup.** There is no prior state to have changed
from, and a "menus are closed" on every session start is indistinguishable from
a real one. Read `Open77.session.menuState()` once when your resource starts, and
again after a hot reload -- which a handler would have to do anyway.

## One page, many widgets

Eight surfaces per resource is the cap, so the kit spends **one**. Every widget
that is drawn in a page is a component on that single page, and two channels
carry everything (the one exception is `drawText3D`, which is not a page at
all -- see below):

```text
Lua  -> page   "uikit:apply"   { widget, action, token, spec }
page -> Lua    "uikit:event"   { widget, token, type, ... }
```

`widget` selects the component (`progress`, `text`, `dialog`, `cinematic`);
`action` and `type` are that component's verbs. `token` is a monotonic integer minted on
every open and echoed back on every event, and Lua drops a token that is no
longer live -- so a click that raced a close cannot resolve whatever replaced
it. The page is hidden whenever no widget is showing, because CSS opacity does
not suspend CEF or stop native composition.

---

# The widgets

## `progress`

```lua
local answer = Open77.exports.call('open77_uikit', 'progress', {
    label       = 'Washing the car',   -- optional
    duration    = 5000,                -- ms, 100..600000. REQUIRED
    position    = 'bottom',            -- top | center | bottom
    style       = 'bar',               -- bar | circle
    color       = '#22D8E2',
    cancellable = true,                -- default true
    cancelKey   = 'X',                 -- a single alphanumeric, or a named key
    disable     = { move = true, combat = true },
    useWhileDead = false,
}):await()
-- { ok = true,  outcome = 'ok' }         it ran to the end
-- { ok = false, outcome = 'cancelled' }  the player pressed X, or Escape
```

`value` is always nil; the outcome is the answer. Also:

| Export | Returns |
|---|---|
| `progressActive()` | `boolean, owner` |
| `cancelProgress()` | `true`, or `nil, "progress_not_active"` / `"not_owner"` |

The cancel key is **polled**, not focused, and it is edge-detected: holding it
down through the end of one bar does not cancel the next. It stands down while
another surface legitimately owns the keyboard (`Open77.input.isCaptured`), so
typing an `x` in chat never cancels a bar.

## `textUI` / `hideTextUI`

A persistent hint over gameplay. No focus, no scrim, no pointer events.

```lua
Open77.exports.call('open77_uikit', 'textUI', {
    text     = 'Hold to hotwire',
    key      = 'E',            -- rendered as a keycap
    icon     = 'V',            -- a short mono glyph, <= 16 chars
    eyebrow  = 'Door',         -- the // label
    position = 'bottom',
    color    = '#22D8E2',
})
Open77.exports.call('open77_uikit', 'hideTextUI')
```

`textUI(string)` is accepted as shorthand for `{ text = string }`. Calling it
again **replaces** the caller's hint rather than stacking a second one; each
resource owns exactly one slot and four resources can show one at once
(`text_slot_limit` beyond that). `hideTextUI` on a resource that has no hint is
`true`, not an error, so a resource that tidies up on every path can do so
unconditionally. `textUIState()` returns `{ open, text, position, total }`.

Slots are released when the owner stops, reloads, disconnects or calls `close`.

## `drawText3D` / `updateText3D` / `clearText3D` / `listText3D`

A string floating over a world point. This is the FiveM `DrawText3D` pattern --
project a coordinate every frame, draw text at the result -- with the loop
removed: the projection is the host's, so the call that used to run every tick
runs **once** and returns a handle.

```lua
local handle, reason = exports.open77_uikit:drawText3D({
    position    = { x = -1442.2, y = 127.4, z = 18.8 },  -- or entity = id, offset = {...}
    text        = 'Delivery point',                       -- <= 96 bytes, no control chars
    sublabel    = 'Press E to drop the package',          -- optional second line
    color       = '#F2F6F8',                              -- #RRGGBB or #RRGGBBAA
    background  = '#0A1220B8',                            -- or 'none' for bare text
    accent      = 'none',                                 -- the card border; none by default
    scale       = 1.0,                                    -- 0.25..4
    maxDistance = 50,                                     -- metres, 1..1000
    showDistance = false,                                 -- appends "12 m" under the text
    ttl         = 20000,                                  -- ms; omit to keep it until cleared
})
exports.open77_uikit:updateText3D(handle, { text = 'Delivered', color = '#22D8E2' })
exports.open77_uikit:clearText3D(handle)     -- true; also true if it already expired
exports.open77_uikit:clearText3D()           -- true, <count>: everything this resource drew
```

`position` takes `{ x, y, z }`, a `vector3`, or a `{ x, y, z }` array; `entity`
(with an optional world-axis `offset`) follows a live entity instead, and
exactly one of the two must be given (`position_or_entity_required`). The text
is drawn **natively**, in the frame that presents it, as a
[world anchor](../wiki/data/api.json) of render style `card` with a label and
no keycap -- there is no page and no CEF hop, which is why it does not trail
the world the way a web-page billboard does. Everything the interaction
prompts already compute applies for free: the distance band (`maxDistance`,
with a fade at the outer edge), the camera-plane cull, the viewport cull, and
the **occlusion test** -- a string behind a wall is hidden after a few
occluded frames and comes back the frame the wall is gone.

`updateText3D` takes `text`, `sublabel`, `color`, `accent`, `background`,
`scale`, `showDistance`, `maxDistance`, `visible`, and `position` (a point
text) or `offset` (an entity text). Moving a text between a point and an
entity is not a patch: clear it and draw another. A patch that is refused
changes nothing.

`listText3D()` returns the caller's texts with the host's last projection
joined in, so a resource -- or a probe -- can ask *is it showing* without
touching `Open77.anchors`:

```lua
{ { handle = 'text3d:7', text = 'Delivery point', maxDistance = 50, expiresIn = 12.4,
    distance = 5.8, onScreen = true, projected = true, inRange = true } }
```

`distance` is camera-to-point. `inRange` is `distance <= maxDistance` on a
projected point: `false` is the host telling you it will not draw it.

**The quota is the kit's, and it is budgeted.** Every text is an anchor the
host counts against *this* resource -- the caller's identity is the kit's as
far as `Open77.anchors` is concerned -- and the per-resource ceiling is 32. So
the kit refuses **8 per owner** (`text3d_owner_limit`) and **24 in all**
(`text3d_limit`) before the host ever answers `quota_exceeded`, which would
otherwise read as a fault in a caller that did nothing wrong. Twenty-four
floating strings is already a screen nobody can read; if a resource needs more
than eight it should be showing the nearest eight, and `listText3D` gives it
the distances to choose by.

Texts are released when the owner stops, reloads, disconnects, calls `close`,
or when their `ttl` passes -- on the kit's own tick, whether or not the owner
ever calls again. `drawText3D` needs no permission on the caller and none on
the kit: `Open77.anchors` is deliberately ungated.

### Porting a `DrawText3D` loop

```lua
-- Before: FiveM, a thread per string
CreateThread(function()
    while showing do
        DrawText3D(x, y, z, 'Delivery point')
        Wait(0)
    end
end)

-- After: one handle, no thread. Clear it when `showing` would have gone false.
local handle = exports.open77_uikit:drawText3D({
    position = { x = x, y = y, z = z }, text = 'Delivery point',
})
-- ...
exports.open77_uikit:clearText3D(handle)
```

A loop that *changed* the string every frame -- a countdown, a live price --
becomes `updateText3D` when the value changes, not on a timer. A loop that
tested `#(playerCoords - point) < 10` before drawing becomes `maxDistance =
10`.

## `showCinematicBars` / `setCinematic`

The cinematic letterbox: two black bars, the vanilla HUD hidden, both under
**one claim** the kit gives back on every exit path it already guards.

```lua
exports.open77_uikit:showCinematicBars(true, {
    heightPct  = 12,      -- per bar, percent of the viewport, 1..40
    durationMs = 350,     -- the slide in and out, 0..5000
    color      = '#000000',
    hideHud    = true,    -- false = bars only, the HUD stays
})
-- ... the scene ...
exports.open77_uikit:showCinematicBars(false)
```

`setCinematic(enabled, opts)` is the same function under the name the parity
ledger gives it; `cinematicState()` returns `{ active, hudHidden, mine,
holders, heightPct, color }` for a resource that wants to assert before it
starts a scene.

The HUD half is [`Open77.hud.setVisible("all", false)`](hud-visibility.md), a
per-owner loan the host releases with the owning resource. The kit holds that
loan on the caller's behalf -- `open77_uikit` carries `ui.vanilla.hud`, the
caller needs nothing -- and composes it with the bars, which are two `div`s on
the kit's own page: no new surface, no focus, no pointer events, drawn *under*
a dialog so a "skip cutscene?" confirmation is never covered by its own
letterbox.

Bars are a **claim per owner**, the same model as a HUD hide. They show while
any claim stands, the most recent claim decides the look, and the last release
restores the HUD -- so two resources composing one scene cannot pull the bars
out from under each other, and a release of something never claimed is `true`,
not an error. Owner stop, owner reload, `close`, disconnect and the kit's own
stop all release; the page stays up for the length of `durationMs` after the
last release so the slide-out is actually seen.

**The camera is deliberately not part of this call.** `Open77.camera` handles
belong to the resource that created them, and a kit that activated a caller's
camera would own the one thing it cannot release. The shape of a cutscene is:

```lua
local cam = Open77.camera.create({ position = p, lookAt = target, fov = 40 })
Open77.camera.activate(cam, { blendMs = 800 })
exports.open77_uikit:showCinematicBars(true)
-- ...
exports.open77_uikit:showCinematicBars(false)
Open77.camera.deactivate({ blendMs = 800 })
Open77.camera.destroy(cam)
```

Activating a scripted camera does **not** hide the HUD by itself; this call
is what does.

## `alert`

```lua
local answer = Open77.exports.call('open77_uikit', 'alert', {
    title     = 'Sell the Quadra?',          -- REQUIRED, <= 96
    message   = 'It will be gone for good.', -- <= 1024
    confirm   = 'Sell it',                   -- default 'Confirm'
    cancel    = 'Keep it',                   -- omit for a single-button notice
    tone      = 'warning',                   -- info | success | warning | danger
    size      = 'normal',                    -- normal | large
    timeoutMs = 30000,                       -- 1000..120000, default 60000
}):await()
-- { ok = true, outcome = 'ok', value = 'confirm' }
```

Enter confirms, Escape cancels. A `danger` tone paints the confirm button in
`--op77-danger` -- use it for the button you would regret.

## `input`

```lua
local answer = Open77.exports.call('open77_uikit', 'input', {
    title  = 'Register the plate',
    description = 'The DMV will not check any of this.',
    fields = {
        { id = 'plate',  type = 'text',     label = 'Plate', max = 8, required = true },
        { id = 'colour', type = 'select',   label = 'Colour',
          options = { 'Chrome', 'Matte black', { value = 'red', label = 'Samurai red' } } },
        { id = 'tint',   type = 'slider',   label = 'Window tint', min = 0, max = 100, default = 40 },
        { id = 'notes',  type = 'textarea', label = 'Notes', max = 400 },
        { id = 'insure', type = 'checkbox', label = 'Insure it' },
    },
    confirm = 'Register', cancel = 'Cancel', timeoutMs = 60000,
}):await()

if answer.ok then
    print(answer.value.plate, answer.value.colour, answer.value.tint)
    print(answer.value[1], answer.value[2], answer.value[3])   -- the same values, in order
end
```

Values arrive **keyed by field id and indexed by position**, so a caller that
wrote its fields in order can read them back in order without inventing ids.

| `type` | Rendered as | `value` |
|---|---|---|
| `text`, `password` | a single-line field | string |
| `textarea` | a fixed-height box | string |
| `number` | a numeric field, `min`/`max`/`step` | number |
| `slider` | a track with a tabular readout | number |
| `checkbox` | a chamfered toggle | boolean |
| `select` | a **custom `role="listbox"`** | the chosen `value` |

`select` is a listbox of buttons and not a native dropdown, deliberately: the
native popup does not render reliably in the CEF compositor, and the server
suite asserts that none ships anywhere under `resources/*/web`. Do not add one.

Validation runs on the page before submit -- `required`, length and range -- and
shows the error under the field rather than closing on a bad value. Fields are
re-validated on the way in: an unknown `type`, a duplicate `id`, an empty
`options` list and a `max <= min` range are all refused before anything is shown
(see [failure reasons](#failure-reasons)). Up to 24 fields.

## `context` / `showContext` / `hideContext`

A browse menu, registered once and shown many times, with real navigation.

```lua
Open77.exports.call('open77_uikit', 'context', {
    id    = 'garage_root',
    title = 'Northside garage',
    description = 'Three bays, one owner.',
    options = {
        { id = 'vehicles', label = 'Vehicles', icon = 'V',
          description = 'Bring one up to the ramp.', menu = 'garage_bays' },
        { id = 'impound',  label = 'Pay the impound fee', tone = 'danger',
          metadata = { { label = 'Fee', value = '2 000' } } },
        { id = 'closed',   label = 'Valet (off shift)', disabled = true },
    },
})
Open77.exports.call('open77_uikit', 'context', {
    id = 'garage_bays', title = 'Bays',
    options = { { id = 'bay1', label = 'Bay 1' }, { id = 'bay2', label = 'Bay 2' } },
})

local answer = Open77.exports.call('open77_uikit', 'showContext', 'garage_root'):await()
-- { ok = true, outcome = 'ok', value = { id = 'bay1', menu = 'garage_bays' } }
```

An option with a `menu` field **navigates inside the same dialog**: the trail is
pushed, the panel is redrawn, the token does not change and the promise does not
resolve. Back pops the trail; back at the root closes the menu and resolves
`cancelled`. There is deliberately no `parent` field -- a declared parent and a
real trail can disagree, and the disagreement shows up as a back button that
cancels instead of going back.

Menus are **owner-scoped**: two resources may both register `main`. 32 menus per
resource, 64 options per menu. `showContext` takes an optional second argument
`{ timeoutMs = 30000, useWhileDead = false }`. `hideContext()` closes the
caller's open dialog.

## `menu` / `showMenu` / `hideMenu`

The keyboard-driven cousin of `context`: arrow keys move, Enter picks, left and
right side-scroll a value, and a checkbox row toggles in place.

```lua
Open77.exports.call('open77_uikit', 'menu', {
    id = 'squad_settings', title = 'Squad settings',
    options = {
        { id = 'voice', label = 'Squad voice', checked = true },
        { id = 'range', label = 'Radio range',
          values = { 'Short', 'Medium', 'Long' }, defaultIndex = 2 },
        { id = 'leave', label = 'Leave the squad', tone = 'danger' },
    },
})
local answer = Open77.exports.call('open77_uikit', 'showMenu', 'squad_settings'):await()
-- answer.value  = { id = 'leave', menu = 'squad_settings' }   when a row is picked
-- answer.values = { voice = false, range = 3 }                always
```

**A checkbox row does not resolve the menu.** It toggles, and its state leaves
with whatever finally does -- a picked row, or the close. That is why `values`
is present on a `cancelled` outcome too: a settings menu made only of toggles
has no row that picks anything, and without this its state could never reach
Lua at all.

## `radial` / `showRadial` / `hideRadial`

An eight-sector wheel, for quick actions.

```lua
Open77.exports.call('open77_uikit', 'radial', {
    id = 'quick', title = 'Quick actions',
    options = {
        { id = 'hands', label = 'Hands up', icon = 'H' },
        { id = 'point', label = 'Point',    icon = 'P' },
        { id = 'sit',   label = 'Sit',      icon = 'S' },
        { id = 'cuff',  label = 'Cuff',     icon = 'C' },
    },
})
local answer = Open77.exports.call('open77_uikit', 'showRadial', 'quick'):await()
```

Eight sectors is a hard cap (`too_many_options`) because a ninth is unreadable
at a glance, which is the only thing a radial is for. **Known limitation: the
radial is mouse-only.** It has no keyboard navigation, unlike `menu`. Escape
still closes it through the ordinary release path, so it cannot strand anybody;
it is a gap in the interaction, not in the safety.

## `close` and `state`

```lua
Open77.exports.call('open77_uikit', 'close')    -- true, <number cancelled>
Open77.exports.call('open77_uikit', 'state')    -- a diagnostic snapshot
```

`close` cancels everything the calling resource holds -- its dialog, its
progress bar, its text slot, its 3D texts, its letterbox claim -- in one call. It is the right thing in a resource's
own cleanup path even though the kit does it for you when you stop.

`state()` is a diagnostic, not steady-state API. Read it when a widget "did
nothing": it separates *the surface never reported ready* from *another resource
holds the dialog* from *focus is stuck*.

```lua
{ ready = true, visible = false, focusHeld = false,
  dialog = nil, progress = nil, textSlots = 0, blockAll = false,
  texts3d = 0, cinematic = false, cinematicHudHidden = false,
  blocks = { { action = 'Movement', holders = 1 } },
  widgets = { { token = 7, owner = 'garage', widget = 'dialog', kind = 'alert', focus = true } } }
```

---

# Server twins

Every widget has a server-side twin, so a server job step can drive a bar or ask
a question without a bespoke net event in every resource.

```lua
-- resources/jobs/server.lua
CreateThread(function()
    local answer, reason = exports.open77_uikit:alert(source, { ... })
end)
```

That is the wrong spelling and it will fail -- a twin waits on a callback, so it
yields, and the synchronous export proxy has no scheduler under it. Use the
asynchronous form:

```lua
local promise, dispatchError = Open77.exports.call('open77_uikit', 'alert', source, {
    title = 'Sign the contract?', confirm = 'Sign', cancel = 'Not today',
    timeoutMs = 30000,
})
if not promise then return end
local answer, reason = promise:await()
```

| Server export | Arguments |
|---|---|
| `progress(playerId, definition)` | the client `progress` definition |
| `alert(playerId, definition)` | the client `alert` definition |
| `input(playerId, definition)` | the client `input` definition |
| `context(playerId, definition, options?)` | registers **and** shows; pass `show = false` in `options` to only register |
| `menu(playerId, definition, options?)` | as above |
| `radial(playerId, definition, options?)` | as above |
| `textUI(playerId, definition)` | shows a hint owned by the server resource |
| `hideTextUI(playerId)` | takes it away |
| `drawText3D(playerId, definition)` | the client `drawText3D` definition; the answer's `value` is the handle |
| `updateText3D(playerId, handle, patch)` | the client patch |
| `clearText3D(playerId, handle?)` | one text, or every text that server resource drew on that client |
| `showCinematicBars(playerId, enabled, options?)` / `setCinematic(...)` | the client options; the answer's `value` is `cinematicState()` |
| `close(playerId)` | cancels everything that server resource holds on that client |

The world-text and letterbox twins never wait on the player, so they ride a
five-second transport deadline rather than a dialog's.

## A server twin is a request, not a command

The client may never answer -- loading, dead, already holding a dialog for
another resource, or gone. So a twin has exactly two result shapes and they do
not overlap:

| Shape | Meaning |
|---|---|
| `nil, reason` | the question never reached an answer. `reason` is a stable token from the callback transport: `callback_timeout`, `callback_not_found`, `callback_resource_unavailable`, `callback_target_stopped`, `network_unavailable` -- or one of the twin's own argument refusals (`invalid_player`, `definition_must_be_a_table`, `export_call_required`, `callbacks_unavailable`). |
| a table | the client answered. The **same** `{ ok, outcome, value }` the client export resolves with, so a job step reads one shape wherever it runs. |

A player pressing Escape is a table with `ok = false`, never a `nil, reason`.

**The transport deadline is deliberately longer than the dialog's** -- the
dialog's own `timeoutMs` plus five seconds, clamped to the transport's
100..120 000 ms range. If they were equal the server would give up in the same
instant the player was still reading, and the client would be left holding focus
for a question nobody is listening to any more.

The owner of a server-driven widget is the **calling server resource**,
namespaced so it can never collide with a client resource of the same name. Two
server resources get their own text slots and their own `close`.

## `/uikit.demo`

A restricted command that drives one widget on the caller's own client through
the real server-to-client path:

```text
/uikit.demo progress | text | hidetext | alert | input | context | menu | radial
/uikit.demo text3d | cinematic | nocinematic
```

`text3d` floats `Delivery point` five metres north of the caller for sixty
seconds with a 50 m band; `cinematic` / `nocinematic` claim and release the
letterbox.

It is what the [integrator checklist](#integrator-checklist) below runs.

---

# Styling

The kit renders in the Open77 design system and a resource **cannot inject CSS**
-- each WebUI surface runs under its own isolated virtual origin, and more to
the point, a kit whose look every caller could override would not be a kit. What
a caller may change is the small set of tokens below.

| Field | Where | Design token it drives |
|---|---|---|
| `color` (`#RRGGBB`) | `progress`, `textUI` | the leading rule, the fill, the icon glyph. Default `--op77-accent` `#22D8E2`. |
| `color`, `background`, `accent` (`#RRGGBB`, `#RRGGBBAA`, `none`) | `drawText3D` | the text, its backdrop and its border, drawn natively. Defaults `#F2F6F8`, `#0A1220B8`, none. |
| `heightPct`, `color` | `showCinematicBars` | the bars. Deliberately the one element with no chamfer, no rule and no accent: a letterbox is a frame around the picture, not a panel in it. |
| `tone` | `alert` | `info` -> `--op77-accent`, `success` -> `--op77-ok`, `warning` -> `--op77-warn`, `danger` -> `--op77-danger`. Paints the eyebrow, the rule and the confirm button. |
| `tone` | an option row | `danger` -> `--op77-danger`, `success` -> `--op77-ok` on the row title. |
| `icon` | hints and rows | a short mono glyph in a chamfered chip, `--op77-font-mono`. Text, not an image: the page has no network and bundles no icon font. |
| `eyebrow` | `textUI` | the `//` label, `--op77-fs-micro` tracked at `.18em`. |
| `position` | all | `top` / `center` / `bottom`, on the shared `--op77-inset-y`. |
| `style` | `progress` | `bar` or `circle`. |
| `size` | `alert` | `normal` (520px) or `large` (700px). |

An invalid colour is **refused** (`invalid_color`), not silently replaced: a
palette that quietly falls back is how a surface drifts off-brand without
anybody noticing.

The surface follows the versioned kit's four resolved rules -- chamfer rather
than radius, mono for machine values only, no separation shadow (a `clip-path`
clips one away), and the 0.94 opacity floor for anything carrying words over
gameplay. Its values come from the mirrored `web/open77-ui.css` that every
shared platform service carries. `web/app.css` carries the full reasoning; see
[`docs/ui-design-system.md`](../docs/ui-design-system.md) sections 2 and 4.

**Accent budget:** a dialog shows cyan on at most three things -- the leading
rule, the primary action, and the one focused row. If you find yourself wanting
a fourth, you want a different tone, not more cyan.

---

# A worked example: a job step with a progress bar

Server-authoritative, client-presented. The server decides what may happen, the
kit shows it, and the server re-checks after the yield because a progress bar is
a long time in a game world.

`resources/jobs/open77.lua`

```lua
resource 'jobs'
version '1.0.0'
dependency 'open77_uikit >=1.0.0'
server_script 'server.lua'
permissions { 'network.events' }
```

`resources/jobs/server.lua`

```lua
local kDumpster = { x = -1580.0, y = -1290.0, z = 8.0 }

local function atThe(playerId, spot, radius)
    local at = Open77.players.position(playerId)
    if not at then return false end
    local dx, dy, dz = at.x - spot.x, at.y - spot.y, at.z - spot.z
    return (dx * dx + dy * dy + dz * dz) <= radius * radius
end

local function uikit(name, ...)
    local promise, reason = Open77.exports.call('open77_uikit', name, ...)
    if not promise then return nil, reason end
    return promise:await()
end

RegisterCommand('collect', function(source)
    CreateThread(function()
        if not atThe(source, kDumpster, 4.0) then return end

        -- 1. Ask. A refusal is ordinary; a no-answer is not.
        local answer, reason = uikit('alert', source, {
            title   = 'Empty this dumpster?',
            message = 'Takes about six seconds. Pays 45 eddies.',
            confirm = 'Get to it', cancel = 'Later', timeoutMs = 20000,
        })
        if answer == nil then
            Open77.log.warn('jobs: no answer from ' .. source .. ' (' .. tostring(reason) .. ')')
            return
        end
        if not answer.ok then return end          -- cancelled or timed out

        -- 2. Do it, with the player held by the CONTROL surface, not by focus.
        --    They can still open chat and complain about the pay.
        answer, reason = uikit('progress', source, {
            label    = 'Emptying the dumpster',
            duration = 6000,
            disable  = { move = true, combat = true },
        })
        if answer == nil or not answer.ok then
            -- `outcome == 'cancelled'` means they pressed X. No pay, no error.
            return
        end

        -- 3. Re-check. Six seconds is long enough to be somewhere else.
        if not atThe(source, kDumpster, 6.0) then return end
        payWages(source, 45)          -- your own economy, not a platform API

        Open77.notifications.send(source, {
            id = 'jobs_paid', type = 'success',
            title = 'Shift', message = '45 eddies.', replace = true,
        })
    end)
end, false)
```

Three things in that example are the point of the whole page. The bar **blocks
through `Open77.input`**, so chat and voice keep working. The cancel resolves
with `ok = false` rather than raising, so there is no `pcall`. And the server
re-validates after the yield, because the kit made the round trip convenient and
changed nothing about who decides.

---

# Failure reasons

All stable snake_case. Returned as the second value of `nil, reason` before
anything is shown.

| Reason | Meaning |
|---|---|
| `export_call_required` | Called other than through an export, so there is no owner. |
| `surface_unavailable` | `WebUI.create` failed at start-up. Read the client log. |
| `surface_not_ready` | The page has not reported ready. A dialog is refused rather than taking the mouse and rendering nothing. |
| `dialog_active` | Another resource holds the one focus dialog. |
| `progress_active` | A progress bar is already running. |
| `progress_not_active` | `cancelProgress` with nothing to cancel. |
| `not_owner` | Closing or cancelling something another resource opened. |
| `text_slot_limit` | Four resources already show a hint. |
| `menu_limit` | 32 registered menus for this resource. |
| `menu_not_found` | No menu with that id **for this resource**. Menus are owner-scoped. |
| `menu_kind_mismatch` | `showMenu` on a `context`, or similar. |
| `definition_must_be_a_table` | |
| `invalid_title`, `invalid_message`, `invalid_confirm`, `invalid_cancel` | Copy missing, too long, or carrying control characters. |
| `invalid_label`, `invalid_text`, `invalid_key`, `invalid_icon`, `invalid_eyebrow` | |
| `invalid_duration` | Outside 100..600 000 ms, or not a whole number. |
| `invalid_timeout` | Outside 1 000..120 000 ms. |
| `invalid_position`, `invalid_style`, `invalid_tone`, `invalid_color` | Not in the vocabulary. |
| `invalid_cancel_key` | |
| `invalid_disable` | Not a table, `'all'`, or a boolean map; or an `except` entry that is not an action name. |
| `invalid_fields`, `invalid_field`, `invalid_field_type`, `invalid_field_id`, `invalid_field_label`, `invalid_field_range`, `invalid_field_default`, `invalid_field_options` | |
| `duplicate_field_id`, `duplicate_option_id` | |
| `invalid_menu_id`, `invalid_options`, `too_many_options` | |
| `invalid_option`, `invalid_option_id`, `invalid_option_label`, `invalid_option_menu`, `invalid_option_values`, `invalid_option_checked`, `invalid_option_metadata` | |
| `invalid_player` | Server twin: a player id must be a positive integer. |
| `callbacks_unavailable` | Server twin: this host has no callback transport. |

Plus everything [`Open77.exports.call`](resource-exports.md) and
[the callback transport](callbacks.md) can answer with in their own right.

# Limits

| Limit | Value |
|---|---|
| Focus-taking dialogs open at once | 1, across every resource |
| Progress bars at once | 1 |
| Text hints at once | 4, one per resource |
| Registered menus per resource | 32 |
| Options per menu | 64 (radial: 8) |
| Fields per input dialog | 24 |
| Dialog timeout | 1 000..120 000 ms, default 60 000 |
| Progress duration | 100..600 000 ms |
| WebUI surfaces used | **1** |

# Not in this kit

- **`notify`**: use [`open77_notifications`](notifications.md) for toasts.
- **`skillCheck`**: not provided by this kit.

# Verification

```powershell
pwsh -File scripts/check-lua.ps1 open77_uikit
python scripting/tests/uikit_focus_test.py
python scripting/tests/uikit_widgets_test.py
```

The two suites load the real `client/main.lua` and `server/main.lua` into a real
Lua 5.4 VM with the host bindings stubbed, and cover the release matrix, the
control-block claims, each widget's promise resolving and cancelling, stale
tokens, two resources not fighting over the page, the server twin's timeout,
the 3D-text handles (quota, ttl, owner scoping, whole-presentation patches)
and the letterbox claims (last claim decides, last release restores).

## Integrator checklist

Three minutes at a keyboard, from an account that may run restricted commands.
**The important half is the second column of every row**: after a dialog, the
player can move, shoot and type again.

| # | Do this | Must appear | Must work afterwards |
|---|---|---|---|
| 1 | `/uikit.demo text` | a hint bottom-centre, `Hold to hotwire` with an `E` keycap | move, shoot and open chat -- the hint takes no input at all |
| 2 | `/uikit.demo hidetext` | the hint goes | -- |
| 3 | `/uikit.demo progress` | a bar bottom-centre counting down, with an `X` keycap | **while it runs**: W does not move you and the trigger does not fire, but **chat opens and you can type**. When it ends, move and shoot again |
| 4 | `/uikit.demo progress`, then press `X` | the bar goes early; chat says `cancelled` | move and shoot again |
| 5 | `/uikit.demo alert`, click **Sell it** | a centred panel, amber rule, two buttons | chat says `ok -> confirm`; move, shoot, type |
| 6 | `/uikit.demo alert`, press **Escape** | the panel goes | chat says `cancelled`; **move, shoot and type** |
| 7 | `/uikit.demo input` | four fields; the Colour field is a **list of rows, not a dropdown** | pick a colour, drag the tint, press Enter. Chat echoes the values; move, shoot, type |
| 8 | `/uikit.demo input`, clear the Plate field, press Enter | `Required.` under the field, the dialog stays open | Escape closes it; move, shoot, type |
| 9 | `/uikit.demo context`, click **Retrieve a vehicle** | a three-row menu with icons and a fee row | chat says `ok -> id=retrieve`; move, shoot, type |
| 10 | `/uikit.demo menu`, arrow down to Radio range, press Right twice, then Escape | the value cycles Medium -> Long -> Short | chat says `cancelled` with the values; move, shoot, type |
| 11 | `/uikit.demo radial`, click a sector | a four-sector wheel | chat says `ok`; move, shoot, type |
| 12 | `/uikit.demo alert`, and **while it is open** get another player to run `/uikit.demo alert` | the second player sees their own dialog; nothing interferes | -- |
| 13 | `/uikit.demo alert`, and while it is open **die** | the dialog closes on its own | you can click through the respawn screen |
| 14 | `/uikit.demo alert`, and while it is open **disconnect and reconnect** | -- | you spawn with full control |
| 15 | `/uikit.demo text3d` | `Delivery point` floating 5 m ahead on a dark chip, with `5 m` under it | walk 60 m away: it fades at the band's edge and is gone; walk back: it is there; put a wall between you and it: it goes, and returns when you step out |
| 16 | `/uikit.demo cinematic` | two black bars, top and bottom, sliding in; **the whole vanilla HUD is gone** (minimap, health, weapon, quest tracker) | move, shoot, type -- the bars take nothing |
| 17 | `/uikit.demo nocinematic` | the bars slide out; the HUD is back exactly as it was | -- |
| 18 | `/uikit.demo cinematic`, then **disconnect** | -- | the main menu has no bars and the next session has its HUD |

Rows 6, 13 and 14 are the ones that matter. If any of them ever leaves a player
unable to move or type, the bug is in the release path, not in the widget.

# See also

- [Notifications](notifications.md) -- toasts, the `notify` half of the kit.
- [Blocking player input](input-blocking.md) -- the vocabulary `disable` maps to,
  and what this engine genuinely cannot refuse.
- [Network callbacks](callbacks.md) -- the transport under every server twin.
- [Official resource exports](resource-exports.md) -- how to call an export, and
  every other package's surface.
- [Contextual interactions](interactions.md) -- world prompts, which is a
  different problem from a dialog and deliberately a different service.
