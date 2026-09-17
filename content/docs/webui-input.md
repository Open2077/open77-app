# WebUI selective keyboard capture

Use `page:setConsumedKeys(keys)` when a keyboard-controlled WebUI must consume
navigation keys while gameplay movement and mouse look remain enabled.
This is client-local, per surface, and requires a client build containing this API.

**Client availability:** implemented and tested locally on 17 September 2026,
but not yet published on the CDN. Updating the website does not update a player's
client. Older builds do not expose `setConsumedKeys`; check the method exists
before offering this mode, or require the updated client. Do not silently fall
back to keep-input without consumption, which would reopen the native pause.

```lua
-- Manifest: permissions { "webui.keep_input" }
local page = assert(WebUI.create({entry = "web/menu.html", layer = "hud"}))
page:on("menu:back", function()
    -- Navigate back in your UI here, or close the top-level menu:
    page:setFocus(false, false)
    page:hide()
end)
assert(page:setConsumedKeys({"escape"}))
assert(page:setFocus(true, false, true)) -- keyboard, no cursor, keep gameplay
```

The page still receives ordinary browser `keydown`/`keyup` events. Consumed
keys are withheld from Cyberpunk's native input AND Open77's pause/scoreboard
shortcuts. Other keys and raw mouse movement retain the existing `keepGameInput`
behavior. A consumed press keeps its repeats and release consumed even when its
handler releases focus, hides or destroys the page; the next press works normally.

```js
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || event.repeat) return;
  event.preventDefault(); // browser behavior, not native input interception
  Open77.emit("menu:back", {});
});
Open77.ready();
```

## Contract

`page:setConsumedKeys(keys)` returns `true`, or `false, reason`. It atomically
replaces the surface's list; invalid input leaves the previous list unchanged.
`page:setConsumedKeys({})` removes the selection for future presses. Configure it
before acquiring focus, not after receiving the key in JavaScript.

- A dense Lua array of at most 32 strings; duplicates are harmless.
- Names are case-insensitive: `escape` (`esc`), `enter`, `tab`, `backspace`,
  `space`, `up`, `down`, `left`, `right` (also `arrowup`, `arrowdown`, `arrowleft`,
  `arrowright`), `home`, `end`, `pageup`, `pagedown`, `insert`, `delete`.
- Unknown keys, mouse buttons, controller buttons and arbitrary action names are
  rejected. These are navigation keys, not a replacement for gameplay action APIs.
- The policy is active only on its visible, presentation-enabled, keyboard-focused
  page. A cursor-only page does not capture keys. Hiding/destroying the page or
  stopping its resource cannot retain a new-key input lock. Regaining focus on the
  same page reuses its configured list; newly created pages start with an empty list.
- No additional permission beyond normal WebUI access; `keepGameInput=true` still
  requires `webui.keep_input`. Full keyboard capture without keep-input is unchanged.
- Errors: `invalid_consumed_keys`, `too_many_consumed_keys`,
  `unsupported_consumed_key`, `webui_key_capture_unavailable`,
  `webui_surface_unavailable`. A stale/destroyed page handle follows the usual
  WebUI handle validation rules.

## Why browser cancellation is insufficient

Cyberpunk receives keyboard Raw Input separately from the legacy keyboard events
forwarded to Chromium. `preventDefault()` / `stopPropagation()` only affect the
browser; with `setFocus(true, false, true)`, the native stream remains enabled.
`Open77.session.setMenuReady(true)` signals that the platform pause UI is ready;
it is not a per-resource Escape blocker and should not be used for this purpose.

For a menu that also uses arrows, Enter and Tab:

```lua
assert(page:setConsumedKeys({"escape", "enter", "tab", "up", "down", "left", "right"}))
assert(page:setFocus(true, false, true))
```

Without `setConsumedKeys`, existing keep-input behavior remains unchanged.
This API does not disable pause globally or intercept a controller's menu button.
The debug command `webui.input` exposes a cumulative `consumed` message counter
for diagnosing the native routing independently of browser event delivery.
