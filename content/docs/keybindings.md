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
