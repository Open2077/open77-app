# The Lua resource runtime

[Server resources](server-resources.md) covers what a resource *is* and how
it reaches a player. This page covers what a resource *gets*: the manifest
in full, the scheduler, the event buses, modules and cross-resource exports,
the core `Open77` namespaces, WebUI surfaces, and the sandbox that bounds all
of it.

OPEN//77 embeds **PUC Lua 5.4.8**. Each resource receives its own Lua state,
scheduler, memory allocator, permission set and lifecycle. Developers coming
from FiveM will recognise the client/server split, events, exports, commands
and a manifest-driven lifecycle; the APIs themselves are independent and
reflect REDengine constraints.

## Layout

A resource is a directory below the server's configured `resources.root`,
containing an `open77.lua` manifest:

```text
resources/garage/
  open77.lua
  shared/config.lua
  client/main.lua
  server/main.lua
  web/index.html
  web/app.js
  assets/garage.png
```

The server runs `server_script` and `shared_script` files. It distributes
the manifest, the client and shared scripts and the declared client assets
as a signed resource set. **`server/` files are never included in the client
package.** Secrets and authoritative decisions belong exclusively in server
code.

The client does not discover arbitrary gameplay resources from disk. Its
local bootstrap directory is reserved for the trusted connection and loading
interfaces; session resources come from the server.

## Manifest reference

The manifest is parsed as a declarative DSL. **It is not executed as Lua** —
which is why `auto_start true` is legal there and would be a syntax error in
a `.lua` script.

| Directive | Purpose |
|---|---|
| `resource` | Stable resource name. Defaults to the directory name. |
| `version` | Resource semantic version. Defaults to `0.0.0`. |
| `open77_version` | Compatible OPEN//77 version range. |
| `auto_start` | Start automatically when the set becomes active. |
| `reload_policy` | Client transition policy: `local` (default), `best_effort`, `synchronized` or `reconnect`. |
| `shared_script` / `shared_scripts` | Lua executed on both hosts. |
| `client_script` / `client_scripts` | Lua distributed to and executed by clients. |
| `server_script` / `server_scripts` | Lua executed only by the dedicated server. |
| `dependency` / `dependencies` | Required resources, with optional version constraints. |
| `permission` / `permissions` | Capabilities requested by the resource. |
| `file` / `files` | Generic files distributed to the client. |
| `web_ui_page` | Default WebUI entry page. |
| `web_ui_auto_create` | Whether to create that page at resource start. |
| `web_file` / `web_files` | Files served to this resource's WebUI origin. |

Singular and plural forms are accepted everywhere. Globs support `*`, `?`
and `**`, and expand in a deterministic order: patterns in the order they
appear in the manifest, and ordinal order within one wildcard pattern.

```lua
resource "garage"
version "1.0.0"
open77_version ">=0.0.1"
auto_start true
reload_policy "local"

shared_script "shared/config.lua"
client_script "client/main.lua"
client_script "client/hud.lua"
server_script "server/main.lua"

files { "assets/**/*.png" }

web_ui_page "web/index.html"
web_ui_auto_create false
web_files { "web/**" }

dependencies {
    "inventory >=1.0.0",
    "open77_notifications"
}

permissions {
    "local.events",
    "network.events"
}
```

Absolute paths, Windows drive paths, traversal through `..`, files outside
the resource and non-Lua script entry points are all rejected. Empty glob
results and incompatible dependency graphs prevent the candidate resource
from starting.

### Never glob script entries

`**` requires at least one intermediate directory, so `client/**/*.lua`
matches **nothing** against a flat `client/main.lua`. An empty glob result
prevents the resource from starting — and on the client that means the whole
session's resource set is refused with
`script_pattern_empty:client/**/*.lua`, so **no player can connect**.

Every shipped resource lists its scripts explicitly, one per line. `**` is
safe for `files` and `web_files`, where the directory nesting genuinely
exists.

### Load order

Scripts load in manifest order, which is what lets one file publish a table
that a later file in the same resource consumes.

> **Version note.** Manifest order has only been honoured since
> 2026-08-26; before that scripts loaded alphabetically. See
> [Writing a gamemode](writing-a-gamemode.md#why-the-server-is-exactly-one-resource)
> for the symptom this produced.

## Lifecycle and scheduling

```lua
AddEventHandler("onClientResourceStart", function(name)
    if name == GetCurrentResourceName() then
        print("Resource started")
    end
end)

AddEventHandler("onClientResourceStop", function(name, reason)
    if name == GetCurrentResourceName() then
        print("Resource stopped: " .. tostring(reason))
    end
end)

CreateThread(function()
    while true do
        Wait(1000)
        print("tick")
    end
end)

local timer = SetTimeout(5000, function() print("timeout") end)
ClearTimeout(timer)
```

`Wait(0)` resumes on a later scheduler pass. Each callback runs in a
resource-owned coroutine. Tasks and handlers are cancelled when their
resource stops or reloads.

The client also emits `open77:worldReady` when the game-facing runtime
becomes available. **It fires more than once per session, and not at all
after a hot reload** — see
[Drawing in the world](world-drawing.md#rebuild-on-start-not-only-on-worldready)
for the pattern that handles both.

## Local and network events

```lua
local handler = AddEventHandler("garage:opened", function(id, data)
    print(id, data.label)
end)

TriggerEvent("garage:opened", 42, { label = "Hella" })
RemoveEventHandler(handler)
```

Namespaced equivalents exist and are identical:

```lua
local handler = Open77.events.on("garage:opened", callback)
Open77.events.emit("garage:opened", 42, { label = "Hella" })
Open77.events.off(handler)   -- the handler id alone, not the event name
```

Network events require the `network.events` permission:

```lua
RegisterNetEvent("inventory:state", function(state)
    -- Only handlers explicitly registered as network events receive packets.
end)

local ok, reason = TriggerServerEvent("inventory:request", { page = 1 })
-- Equivalent: Open77.net.on(...) / Open77.net.emitServer(...)
```

The event codec accepts `nil`, booleans, finite numbers, strings, and
acyclic tables with string or integer keys. Functions, threads, arbitrary
userdata, cycles, excessive depth and oversized values are rejected.
Network arguments are encoded as bounded JSON and delivered reliably and in
order.

On the server, `source` is assigned from the authenticated connection. **A
client cannot select or forge another player's source ID.**

## Modules and exports

```lua
local helpers, reason = require("shared.helpers")
```

`require` is confined to the resource and resolves
`<resource>/shared/helpers.lua`, then `<resource>/shared/helpers/init.lua`.
Modules are text-only and cached per Lua state.

Exports allow asynchronous calls between isolated **client** resources:

```lua
-- The publishing resource
exports("openMenu", function(id)
    Wait(10)
    return { opened = true, id = id }
end)
```

```lua
-- The calling resource
CreateThread(function()
    local promise, reason = Open77.exports.call("garage", "openMenu", 42)
    if not promise then
        print(reason)          -- e.g. "export_not_found"
        return
    end

    local result, callError = promise:await()
    print(result and result.id, callError)
end)
```

There is **no** FiveM-style `exports.<resource>:<name>()` proxy. `exports`
is a plain function used to *publish* an export; indexing it raises *attempt
to index a function value*, because the sandbox removes `setmetatable` and
`getmetatable`. Always call through `Open77.exports.call`.

Arguments and results are copied through the bounded value codec. Lua
objects are never shared between states. Stopping either resource
invalidates outstanding generation-owned requests.

Inside an exported function, `GetInvokingResource()` and
`GetInvokingResourceGeneration()` identify the real caller for that
coroutine resume; they return `nil` outside an export invocation. Services
use these for ownership. **Accepting an owner name as a normal Lua argument
would let any caller impersonate another resource** — see
[Writing a gamemode](writing-a-gamemode.md#services-that-others-call) for the
guard every service should copy.

### Exports are a client-side mechanism

The **server** runtime installs no `exports`, no `GetInvokingResource` and
no cross-resource event bus. A second server resource cannot be asked for
anything, which is why a gamemode's entire server side is one resource. The
reasoning is set out in [The gamemode kernel](gamemode-kernel.md).

## Core runtime API

```lua
Open77.log.debug("message")
Open77.log.info("message")
Open77.log.warn("message")
Open77.log.error("message")

local name       = Open77.resource.name()
local version    = Open77.resource.version()
local generation = Open77.resource.generation()
local otherGen   = Open77.resource.generation("other_resource")
local state      = Open77.resource.state("other_resource")
local allowed    = Open77.resource.hasPermission("network.events")
local text, why  = Open77.resource.readFile("config/settings.json")

local seconds        = Open77.time.monotonic()
local runtimeVersion = Open77.runtime.version()
local luaVersion     = Open77.runtime.luaVersion()

local json  = Open77.json.encode({ enabled = true })
local value = Open77.json.decode(json)
```

`GetCurrentResourceName()` and `GetResourceState(name)` are provided as
familiar aliases.

`Open77.resource.readFile` is the only general file-reading primitive, and
it is confined to the current resource. It does not grant access to the
repository, the game directory, another resource, or an absolute path.

### Declared assets

Generic client assets must be declared with `files` in the manifest. A
script can inspect only its own allowlisted files:

```lua
files { "assets/**/*.png" }
```

```lua
local texture, reason = Open77.assets.texture("assets/garage.png")
local assets = Open77.assets.list()
```

Undeclared texture reads, empty globs, traversal paths and oversized files
fail the resource rather than falling back to arbitrary disk access.

### Notifications from a server resource

A server resource can target the shared `open77_notifications` WebUI without
defining a network protocol of its own:

```lua
local id, reason = Open77.notifications.send(playerId, {
    type = "success",
    title = "Saved",
    message = "Your character has been saved.",
    durationMs = 4500,
})
assert(id, reason)

Open77.notifications.update(id, { message = "Save synchronized." })
Open77.notifications.dismiss(id)
Open77.notifications.broadcast({ message = "Server restart in five minutes." })
Open77.notifications.clear(playerId)   -- omit playerId to clear this resource everywhere
```

IDs and target records are isolated per server resource and cleaned up on
expiry or resource stop. Add `dependency "open77_notifications >=1.0.0"` so
the client renderer is part of the session resource set. Full definition
fields are in [Notifications](notifications.md).

## Client game namespaces

Game namespaces exist on the client host. Calling one on a host without a
game backend returns an explicit unavailable error rather than failing
silently.

| Namespace | Permission | Purpose |
|---|---|---|
| `Open77.character` | none | Read local or registered character state |
| `Open77.animations` | none | Play named workspot animations |
| `Open77.camera` | none | Third-person, detached and field-of-view control; one-shot world-to-screen projection |
| `Open77.input` | `input.actions` | Read a small allowlist of contextual action keys; suppressed while a WebUI captures keyboard input |
| `Open77.clipboard` | `clipboard.write` | Write bounded UTF-8 text to the OS clipboard; reading is never exposed |
| `Open77.kvp` | none | Persistent typed client storage, isolated by connection address and resource |
| `Open77.inspector` | none | Read and highlight the current streamed-world target |
| `Open77.nameplates` | `ui.nameplates` | Customise remote-player labels; native per-frame delivery or drawing |
| `Open77.blips` | `ui.vanilla.map` | Create resource-owned vanilla mappins |
| `Open77.markers` | `world.markers` | Create resource-owned 3D world markers |
| `Open77.anchors` | ownership of the target page (none for a native `render` style) | Anchor a world point or a followed entity; the plugin projects it every frame |
| `Open77.vfx`, `Open77.sfx` | `world.effects` | Resource-owned REDengine visual and spatial audio effects |
| `Open77.doors` | `world.doors` | Inspect streamed doors and apply local policy |
| `Open77.loot` | `world.loot` | Project authoritative ground loot and the pickup flow |
| `Open77.vehicles` | `vehicles.read`, optional `vehicles.presentation` | Read streamed vehicles; guarded remote-occupant presentation |
| `Open77.environment` | `world.environment` | Apply authoritative time and weather |
| `Open77.travel` | `player.travel` | Local-player noclip and direct teleport |
| `Open77.clothing` | `player.clothing.read` / `player.clothing.edit` | The validated local wardrobe |
| `Open77.assets` | declared `files` | Resolve resource-owned client assets |
| `Open77.webui` / `WebUI` | layer-specific | Create isolated HTML/CSS/JavaScript surfaces |

`Open77.travel` writes the transform without the respawn discipline. Prefer
the server-side kill/respawn transaction for long-distance moves, which
preloads streaming — see
[Writing a gamemode](writing-a-gamemode.md#4-move-players-with-kill--respawn-never-a-transform-write).

The complete generated signatures for every namespace are in the
[API reference](/docs/api).

## WebUI

```lua
local page, reason = WebUI.create({
    entry       = "web/index.html",
    layer       = "menu",        -- hud (default) | menu | modal | system | debug
    width       = 1920,          -- default 1280, max 8192
    height      = 1080,          -- default 720, max 8192
    fps         = 30,            -- default 30, 1..60
    zIndex      = 0,
    transparent = true,          -- default true
    visible     = false,         -- default true
})

if page then
    local handler = page:on("shop:buy", function(payload, requestId)
        page:reply(requestId, { accepted = true }, true)
    end)

    page:show()
    page:setFocus(true, true)    -- keyboard, cursor
    page:send("shop:state", { credits = 500 })
end
```

`WebUI.default()` returns the automatically created manifest page, when
present. Page handles belong to the resource generation and are destroyed
automatically on stop or reload.

Page methods are `id`, `show`, `hide`, `destroy`, `setFocus`, `send`, `on`,
`off` and `reply`:

| Method | Signature |
|---|---|
| `page:reply` | `(requestId, payload, ok?)` — `ok` defaults to `true` |
| `page:setFocus` | `(keyboard, cursor?, keepInput?)` |
| `page:send` | `(event, payload?)` — event name at most 128 bytes |
| `page:on` | `(event, handler)` — returns a handler id |
| `page:off` | `(handlerId)` |

> **Argument order catches people out here.** `page:reply` takes the payload
> second and the success flag third, `page:setFocus` takes *keyboard* first
> rather than a general "focused" flag, and both `page:off` and
> `Open77.events.off` take a handler id alone with no event name. The
> [API reference](/docs/api) agrees with the table above; it did not until
> 2026-08-26, so treat an older copy of a signature with suspicion.

The JavaScript bridge is exposed as `window.Open77`:

```js
Open77.on('shop:state', state => render(state));
Open77.emit('shop:hover', { item: 'medkit' });

const result = await Open77.invoke('shop:buy', { item: 'medkit' });
Open77.ready();
```

WebUI runs under an isolated virtual HTTPS origin with restricted
navigation, downloads, popups, protocols and network access. Lua and
JavaScript payloads pass through a bounded JSON codec.

The `modal`, `system` and `debug` layers require `webui.modal`,
`webui.system` and `webui.debug` respectively; the `hud` and `menu` layers
are ungated. Keeping game input active while a page owns focus requires
`webui.keep_input`, which is the third argument to `setFocus`. System and
debug capabilities are intended only for audited OPEN//77 resources.

A page is the wrong tool for anything that must sit *on* a world point every
frame — see
[Drawing in the world](world-drawing.md#native-overlays--card-ring-dot).

## Sandbox and quotas

Default client limits, per resource:

| Limit | Value |
|---|---|
| Lua memory | 32 MiB |
| Instructions per coroutine resume | 500,000 |
| Global Lua frame budget | 2 ms |
| Scheduled tasks | 1,024 |
| Event handlers | 2,048 |
| WebUI handlers | 512 |
| WebUI surfaces | 8 |
| Lua source size | 4 MiB per file |
| `readFile` result | 1 MiB |
| Lua files in a resource | 1,024 |
| Declared `files` / `web_files` | 2,048 each |

Exceeding the instruction budget raises `Open77 script execution budget
exceeded` from the instruction hook. That is a Lua error: it unwinds
straight out of the coroutine body, and a `while true do ... Wait(n) end`
loop that hits it **never resumes again**. If a long-running loop silently
stops, suspect the budget before suspecting the logic.

The sandbox does not expose `io`, `os`, `debug`, `package`, `dofile`,
`loadfile`, `load`, arbitrary native modules, FFI, or bytecode loading.
Direct coroutine creation and resumption are removed; public coroutines are
owned by the OPEN//77 scheduler.

These limits are safety boundaries, not performance targets. Keep frame
callbacks short, yield during multi-step work, and move authority and
expensive operations to the server.

## Reload and distribution

Resource updates are transactional:

```text
current generation remains active
  -> parse and hash candidate
  -> create isolated candidate VM
  -> compile and prepare entry points
  -> failure: discard candidate, keep the running generation
  -> success: stop old generation and commit the new one
```

The server builds and signs a new client resource set when applicable.
Clients download the missing content, verify signatures, manifests, paths,
chunks and file hashes, then switch to the complete generation. **A partial
or invalid set is never activated.**

Server console commands:

```text
resources
refresh
ensure <resource>
start <resource>
stop <resource>
restart <resource>
reload <resource>
```

Client diagnostics:

```text
resource.root
resource.distribution
resource.list
resource.status <resource>
```

A hot reload is the first time a `.lua` file's syntax is validated end to
end, so a typo can take a resource down mid-session. Parse your Lua before
it reaches a live client — with the exact Lua 5.4.8 the runtime embeds,
rather than a different version that could pass or reject the wrong things.

`open77.lua` manifests must be skipped by any such check: the manifest is a
declarative DSL parsed by a bespoke reader, never by the Lua compiler, so
its call sugar (`auto_start true`) is intentionally not valid standalone Lua.

## API conventions

**Engine IDs are opaque.** REDengine identifiers are 64-bit values and may
not be exactly representable as Lua numbers. Store, compare and return them
unchanged. Do not pass them through `tonumber`. (Player *session* IDs are a
different thing: small integers, and they arrive from events as strings, so
those you *should* `tonumber`.)

**Failures are values.** Most APIs return `value` on success or
`nil, reason` on failure, so a caller can distinguish an invalid request
from a temporarily unavailable subsystem without wrapping every call in
`pcall`.

**Permissions are explicit.** Guarded APIs require a manifest permission and
answer `permission_denied:<permission>` without it. Request only what the
resource needs.

**Client and server runtimes are separate.** `server_script` files never
reach a player's machine; `client_script` files are distributed in the
signed set; `shared_script` files execute in both.

## Security guidelines

- Keep secrets, database credentials and authoritative validation in server
  scripts.
- Treat every client event and argument as untrusted input.
- Grant only the permissions a resource needs.
- Never commit resource-signing private keys or runtime cache directories.
- Handle `value, reason` and `boolean, reason` results instead of assuming a
  game service is available.
- Clean up explicitly where practical, even though generation shutdown
  provides a final ownership cleanup.

## See also

- [Server resources](server-resources.md) — the connection flow, signing and
  operational configuration.
- [Complete server Lua API](server-api.md) — the dedicated-server surface.
- [Official resource exports](resource-exports.md) — every export published
  by the official packages.
- [Drawing in the world](world-drawing.md) — markers, anchors, POIs and
  zones.
- [Writing a gamemode](writing-a-gamemode.md) — putting it together.
