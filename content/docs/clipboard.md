# Clipboard API and transform commands

CyberM exposes a write-only client API for copying generated text to the operating-system
clipboard. It is intended for explicit user actions such as copying coordinates, identifiers, or
configuration snippets. Lua resources cannot read or inspect the existing clipboard.

## Manifest permission

Declare `clipboard.write` in the client resource that performs the write:

```lua
resource "my_tools"
version "1.0.0"

client_script "client/main.lua"
permission "clipboard.write"
```

The permission belongs to the resource whose client VM calls the API. A server resource cannot
write directly to a player's clipboard.

## Write text

```lua
local copied, reason = CyberM.clipboard.setText(
    "position = { x = 1660.068359, y = -723.649170, z = 50.512436 }"
)

if not copied then
    print("Clipboard write failed: " .. tostring(reason))
end
```

`CyberM.clipboard.setText(text)` returns `true` on success. On refusal it returns `false, reason`.
The text must be valid UTF-8, cannot contain an embedded NUL, and is limited to 256 KiB.

Possible failure reasons include:

- `permission_denied:clipboard.write`
- `clipboard_text_too_large`
- `clipboard_text_contains_nul`
- `clipboard_invalid_utf8`
- `clipboard_busy`
- `clipboard_clear_failed`
- `clipboard_allocation_failed`
- `clipboard_lock_failed`
- `clipboard_write_failed`
- `clipboard_unavailable_on_this_host`

The API is synchronous and should be called in response to a deliberate player action. If another
desktop application temporarily owns the clipboard, report `clipboard_busy` and let the player
retry instead of looping every frame.

## Built-in `/pos` and `/rot` commands

The official chat resource provides two authenticated commands:

```text
/pos
/rot
```

`/pos` copies the local player's current world position:

```lua
position = { x = 1660.068359, y = -723.649170, z = 50.512436 }
```

`/rot` copies the complete quaternion and the horizontal yaw:

```lua
orientation = { x = 0.000000, y = 0.000000, z = 0.707107, w = 0.707107 }, yaw = 90.000000
```

The command is registered on the server, then targets only the authenticated requesting client.
The downloaded `cyberm_chat` client reads `CyberM.character.state()`, performs the clipboard write,
and returns a bounded result. The server never receives the previous clipboard contents. Success or
failure is shown both in chat and through a middle-left WebUI notification.

This split is important for server packages: server network events are delivered to the active
downloaded resource generation. A handler placed only in a protected bootstrap resource will not
receive a normal server-resource event.

## Copy a character transform from your own resource

The command implementation is only a convenience. A client resource can produce another format
directly:

```lua
local state, stateError = CyberM.character.state()
if not state or not state.attached then
    print(stateError or "player_transform_unavailable")
    return
end

local p = state.position
local q = state.orientation
local text = string.format(
    "vec4(%.3f, %.3f, %.3f, %.3f) at vec3(%.3f, %.3f, %.3f)",
    q.x, q.y, q.z, q.w, p.x, p.y, p.z
)

local copied, reason = CyberM.clipboard.setText(text)
assert(copied, reason)
```

`state.position`, `state.orientation`, and `state.yaw` come from the same character snapshot, so the
copied position and rotation describe one coherent sample.
