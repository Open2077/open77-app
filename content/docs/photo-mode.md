# Photo mode

Control native photo mode through the client-only `Open77.photoMode` API. Vanilla keyboard and controller shortcuts are disabled; resources explicitly open and close the mode.

This is a client-only presentation API. It has no permission because it does not change canonical
server state, spawn an entity, or expose game data.

## API

```lua
local ok, reason = Open77.photoMode.open()
local ok, reason = Open77.photoMode.close()
local ok, reason = Open77.photoMode.setEnabled(enabled)
local active, reason = Open77.photoMode.isActive()
```

`open()` calls REDengine's real photo-mode activation routine. It is idempotent: calling it while
photo mode is already active succeeds. The engine may still refuse the request when the current
gameplay state does not permit photo mode.

`close()` calls the native deactivation routine and also succeeds when photo mode is already
closed. `setEnabled(true)` is equivalent to `open()`; `setEnabled(false)` is equivalent to
`close()`.

`isActive()` reads the engine's current state. It returns `nil, reason` when the photo-mode system
or its RTTI query is unavailable.

A client resource may `RegisterCommand` of its own -- see the
[FiveM compatibility page](fivem-compatibility.md) -- but a key is the better trigger for a toggle.
It also needs `permissions { "input.actions" }` in the manifest:

```lua
RegisterKeyMapping("photo", "Toggle photo mode", "F9", function()
    local active, readError = Open77.photoMode.isActive()
    if active == nil then
        print("photo mode read failed: " .. readError)
        return
    end

    local ok, error = Open77.photoMode.setEnabled(not active)
    if not ok then
        print("photo mode request failed: " .. error)
    end
end)
```

Photo mode is one local engine state, not a resource-owned lease. Two resources can therefore
open or close the same state. A gamemode should nominate one client resource as its photo-mode
controller.

## Errors

| Error | Meaning |
|---|---|
| `photo_mode_unavailable_on_this_host` | The API was called outside a client host with a game backend. |
| `photo_mode_system_unavailable` | No active REDengine game instance exposes the photo-mode system. |
| `photo_mode_hook_unavailable` | Open77 could not establish the exclusive activation hook, so it refuses to claim the API contract. |
| `photo_mode_native_unavailable` | The required native or RTTI method is absent on this game build. |
| `photo_mode_activation_refused` | REDengine rejected activation in the current gameplay state. |
| `photo_mode_query_failed` | The native active-state query could not execute. |

The API does not simulate a key and does not edit `inputUserMappings.xml`. Rebinding or pressing
the old shortcut cannot bypass the native activation policy.
