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
| `ui_page` / `web_ui_page` | Default WebUI entry: a declared local file or an HTTP(S) URL. See [remote pages](#remote-pages-external-content-and-hot-reload) for client availability. |
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

Exports allow asynchronous calls between isolated resources on **both client and
server**. The registries are separate: a server call reaches a server resource,
never a player's client resource.

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
to index a function value*. The client sandbox also removes `setmetatable` and
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

### Server-to-server exports

The **server** runtime now installs `exports`, `Open77.exports.call`,
`GetInvokingResource`, `GetInvokingResourceGeneration` and
`GetCurrentResourceGeneration`. Use the same publish/call/`:await()` form above
from `server_script` files. A gamemode can split reusable services into separate
resources while retaining isolated VMs.

The provider executes with **its own permissions**, not those of the caller.
Authorize callers with `GetInvokingResource()` and validate every argument.
Player `source` is not inherited by an exported callback. Register at file scope,
but make calls only from a running resource: candidate preparation refuses them
with `resource_preparing`. Await pending calls from a managed thread or handler.

Requests are generation-bound; stopping/reloading a provider rejects its pending
calls. Server requests have a 30-second timeout and bounded copied arguments and
results. `TriggerEvent` remains per-VM: exports do not add a global event bus.

See [Cross-resource server exports](server-exports.md) for a complete service and
consumer example, limits, errors and reload behavior, and
[The gamemode kernel](gamemode-kernel.md) for modular gamemode design. This needs
the updated server binary; it is not enabled on an older server by changing Lua
alone. No client update is required.

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

### Carrying state across a reload

A hot reload gives a server resource a brand-new Lua VM with an empty roster
while the server is still full. `Open77.state` is a small bag the **host** keeps
on the resource's behalf, so a few authoritative fields can survive that.

```lua
Open77.state.save({ round = 4, scores = scores })   -- true, or false, reason
local carried = Open77.state.load()                 -- the table, or nil
Open77.state.clear()
```

The value is JSON-encoded, so it must be a plain acyclic table — the same codec
every other boundary uses. It is capped at **64 KiB**: this is a handful of
authoritative fields that must survive a reload, not a database. A value that
cannot be serialised answers `false, "unserialisable_state"`.

**A reload carries the bag; a stop drops it.** That asymmetry is deliberate — it
leaves an operator a "come up as at boot" lever that a reload does not take
away. It is the opposite of the rule for [operator tunables](tunables.md), whose
values survive both, because stopping a resource for an evening must not quietly
undo an afternoon of tuning.

This is per-resource and server-side only.

### The database bridge is per-server, not per-resource

For installation, credentials, connection settings and a working Lua probe,
see [Configure a SQL database](/docs/database).

There is **one** database connection for the whole server, built once from a
single `database.connectionString`. The `database.access` permission is a
boolean gate on reaching it — not an allocation of a private database.

The consequences are worth stating plainly, because nothing in the API hints at
them:

- Every resource holding `database.access` talks to the **same** database, with
  the same credential.
- There is no per-resource schema, table prefix or statement filter. A resource
  can read and write another resource's tables.
- Turning the database on turns it on for **every** resource that asked for the
  permission, not just the one you had in mind. That is not theoretical: it is
  exactly how enabling persistence for a ranked ladder also switched on a
  character creator on join and took a live server down. See
  [the readiness gate](readiness-gate.md#why-this-exists).

**Prefix your tables** with your resource name, grant `database.access` only to
resources that genuinely persist state, and treat the shared database as shared.

#### `?` is only a placeholder outside strings and comments

Positional parameters are rewritten before the statement is sent, and the
scanner understands `'…'`, `"…"` and `` `…` `` quoted spans, `--` and `#` line
comments, and `/* … */` blocks. A `?` inside any of them is **not** counted as a
bind parameter, and an apostrophe inside a comment does not open a string.

Two failures name themselves:

- `parameter_count_mismatch` — reports both counts and an excerpt of the
  statement.
- `unterminated_sql_literal` — reports the offset where the literal or comment
  opened, instead of silently swallowing the rest of the statement.

Two cases are deliberately unsupported: `NO_BACKSLASH_ESCAPES` (the scan runs
before there is a connection to ask about `sql_mode`), and a placeholder inside
a version-gated `/*! … */` comment, which is not rewritten.

> **Version note.** Until this landed, a question mark in a comment *was*
> counted as a placeholder, and an odd apostrophe in a comment swallowed the
> rest of the statement. A single rhetorical question mark in a `CREATE TABLE`
> comment was enough to make a schema-creation statement fail as
> `parameter_count_mismatch`. If you are on an older server and see that error
> on a statement whose placeholders plainly match, check the comments.

## Client game namespaces

Game namespaces exist on the client host. Calling one on a host without a
game backend returns an explicit unavailable error rather than failing
silently.

This table is the set a client resource reaches for first, not the whole
surface: the [API reference](/docs/api) lists every client namespace and every
function in it, generated from the runtime rather than maintained here.

| Namespace | Permission | Purpose |
|---|---|---|
| `Open77.character` | none | Read local or registered character state |
| `Open77.animations` | none | Play named workspot animations |
| `Open77.camera` | `camera.script` | Scripted cameras: create, place, follow, look at, shake, and world-to-screen projection. See [Scripted cameras](/docs/cameras) |
| `Open77.input` | `input.actions`, `input.blockAll` | Read a small allowlist of contextual action keys, plus mouse, gamepad and aim state; take a named input away from the player and give it back. See [Blocking player input](/docs/input-blocking) |
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
| `Open77.travel` | `player.travel` | Local-player noclip and teleport, with a settle report that says when the body really arrived. See [Travel](/docs/travel) |
| `Open77.clothing` | `player.clothing.read` / `player.clothing.edit` | The validated local wardrobe |
| `Open77.assets` | declared `files` | Resolve resource-owned client assets |
| `Open77.webui` / `WebUI` | layer-specific | Create isolated HTML/CSS/JavaScript surfaces |
| `Open77.players` | none, `players.life.read` for life state | The other players this client can see: ids, bodies, distances, the nearest one. See [Players around you](/docs/client-players) |
| `Open77.state` | none to read, `network.events` to subscribe | Replicated state bags on the server, a player or an entity. A client never writes one. See [State bags](/docs/state-bags) |
| `Open77.net` / `Open77.callbacks` | `network.events` | Net events, and callbacks that ask the server a question and await the answer. See [Network callbacks](/docs/callbacks) |
| `Open77.hud` | `ui.vanilla.hud` | The vanilla HUD components, the game's own toasts, help text and subtitles. See [HUD visibility](/docs/hud-visibility) |
| `Open77.screen` | `screen.effects` | Native fades and transitions, plus an unowned read of the engine's own fade state |
| `Open77.map` | `map.read`, `map.control` | The native map: the waypoint, the selected marker, open/close, pick a point |
| `Open77.world` | `world.query`, `world.devices` | Raycasts that name what they hit, ground height, nearby entities, the district, ambient population — and taking a vanilla device prompt away |
| `Open77.zones` | none | Shared zone geometry from the prelude: normalise a shape, test containment, read bounds |
| `Open77.data` | none | Turn a TweakDB record string into a display name, class, manufacturer or seat count |
| `Open77.prevention` | `world.prevention` | This client's wanted level and NCPD dispatch. World state, never player state: the units it summons are never replicated |
| `Open77.abilities` | `player.abilities.project`, `player.abilities.read` | Project a granted session ability and read its state |
| `Open77.chute` | `player.chute` | Arm and disarm the grav-chute |
| `Open77.runtime` | none | Register a client command, list the registered ones, run one |
| `Open77.session` | none, `session.menus` for menu reads | Session and menu state, including whether a vanilla menu currently owns the screen |
| `Citizen`, `vector3`, `promise` | none | The FiveM-shaped aliases, in both runtimes. See [FiveM compatibility](/docs/fivem-compatibility) and [Vectors](/docs/vectors) |

When the **server** decides where somebody goes, do not reach for
`Open77.travel` at all: `Open77.players.teleport` drives the same machinery,
carries the fade and the bucket change, and answers with a promise that
resolves only once the client reports the body settled. The kill → respawn
transaction is no longer the sanctioned way to move a living player — see
[Writing a gamemode](writing-a-gamemode.md#4-move-a-living-player-with-teleport-never-a-transform-write)
and [Travel](travel.md).

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

Bundled WebUI uses an isolated virtual HTTPS origin; remote WebUI uses the
configured HTTP(S) origin. Lua/JavaScript payloads use a bounded JSON codec.

### Remote pages, external content and hot reload

**Client availability:** this section describes the updated WebUI implementation
validated on 16 September 2026. At the time of this documentation update it is
installed locally, not yet published on the CDN. Existing CDN clients may still
reject remote entries and external content; a website update alone does not
update players' clients.

`ui_page` (alias `web_ui_page`) and `WebUI.create({ entry = ... })`
accept an HTTP or HTTPS URL. No host allowlist or extra network permission is
required for WebUI. A remotely hosted page needs no `web_files` declaration:

```lua
-- open77.lua
resource "my_ui"
version "1.0.0"
ui_page "https://ui.example.dev/"
client_script "client.lua"
```

```lua
-- client.lua: the manifest page is automatically created.
CreateThread(function()
    local page = assert(WebUI.default())
    page:on("shop:buy", function(payload, requestId)
        -- Validate requests here, and validate purchases on the server.
        page:reply(requestId, { accepted = true })
    end)
end)
```

For Vite/Vue/React/Nuxt development, use `http://localhost:5173/` as the
entry, or create a page explicitly with
`WebUI.create({entry = "http://localhost:5173/", layer = "menu"})`.
Set `web_ui_auto_create false` if creating the manifest page manually.
**localhost is the player's PC**, not the game server. Other testers need a
reachable hostname/IP or a development tunnel. Configure the dev server's
host and WebSocket URL to be reachable by those clients; Cloudflare must proxy
WebSockets for HMR. A page reload reinjects the JS bridge. Register UI listeners
and call `Open77.ready()` again so Lua can resend the initial state.

Bundled and remote pages can load external scripts, styles, fonts, images,
audio/video, HTTP(S) fetch/XHR, WS/WSS and iframe embeds. HTTP development
content is allowed even from a bundled HTTPS page. For example:

```html
<iframe
  src="https://www.youtube.com/embed/VIDEO_ID"
  title="Video"
  referrerpolicy="strict-origin-when-cross-origin"
  allow="autoplay; encrypted-media; picture-in-picture"
></iframe>
```

This removes **Open77's external-content block**, not the remote site's rules:

- CORS still applies to fetch/modules/fonts. Configure the API's allowed
  origin, or use your web server's same-origin proxy. Do not ship API secrets
  in browser JavaScript.
- A site's own CSP, `frame-ancestors`, `X-Frame-Options`, login requirements
  and certificate validity still apply. Use its supported embed URL, not an
  ordinary watch page. YouTube also requires an HTTP Referer; do not set
  `no-referrer`. Media playback depends on codecs available in the bundled CEF.
- The Lua bridge is exposed only to the top-level page at the configured
  entry's origin (scheme + host + port). External iframes receive no bridge;
  cross-origin top-level navigation can display a site, but loses Lua access
  until returning to the configured origin. Same-origin redirects and reloads
  preserve it. Use `postMessage` with an exact origin check for trusted embeds.
- Local assets still require `web_files`; another resource's virtual origin,
  `file:` URLs, OS protocol execution, plugins and desktop popups stay blocked.
  Layer permissions, message quotas and resource teardown remain enforced.
- Remote content is downloaded by **each player's browser**, not included in
  the signed resource archive. HTTPS is recommended in production. Remote
  hosts and third-party embeds can see client IPs and browser requests; a
  compromised script in the main page has that page's Lua bridge access.
  Request contexts are isolated per surface and are not persistent login profiles.

HTTP errors are reported as `webui_http_status:<status>`; DNS/TLS/connection
errors remain visible as Chromium errors in WebUI diagnostics. CORS and
embedding-policy errors appear in the WebHost browser console log.

| Symptom | What to check |
|---|---|
| A dev URL works on your PC but not another player's | `localhost` points at each player's own PC. Use a reachable host; check the dev server's listening address and firewall. |
| The page loads but HMR does not reconnect | Verify the WebSocket URL/port and proxy upgrade support. HTTPS pages normally use WSS. |
| The page loads but `window.Open77` is missing | Check the final top-level URL. An HTTP-to-HTTPS or host/port redirect changes origin; configure the final URL as the entry. Iframes never receive the bridge. |
| An API call is blocked by CORS | Allow the page's origin on that API, or proxy it through the page's own server. WebUI does not bypass CORS. |
| A video or iframe refuses to display | Use the provider's embed URL, preserve its required Referer and inspect CSP, embedding, login and codec errors. |
| The page's scale changes on Ctrl + wheel | Install the updated client. It suppresses CEF's wheel zoom, not zoom implemented by the page's own JavaScript. |

Embedded WebUI pages do not use CEF's Ctrl + mouse wheel browser zoom:
Ctrl + wheel scrolls normally, without changing the page scale. This is not
a promise to disable keyboard shortcuts or custom page zoom code.

This WebUI network policy does **not** change the dedicated server's Lua
HTTP bridge, its `http.request` permission or its host allowlist.

The `modal`, `system` and `debug` layers require `webui.modal`,
`webui.system` and `webui.debug` respectively; the `hud` and `menu` layers
are ungated. Keeping game input active while a page owns focus requires
`webui.keep_input`, which is the third argument to `setFocus`. System and
debug capabilities are intended only for audited OPEN//77 resources.

A page is the wrong tool for anything that must sit *on* a world point every
frame — see
[Drawing in the world](world-drawing.md#native-overlays--card-ring-dot).

## Sandbox and quotas

The updated client uses the following default limits, per resource except
for the host-wide frame budget. Like remote WebUI above, these increased
defaults require the new client build; old CDN builds keep their old limits.

| Limit | Value |
|---|---|
| Lua memory | 96 MiB |
| Instructions per coroutine resume | 1,500,000 |
| Lua frame budget (host-wide) | 6 ms per client host |
| Scheduled tasks | 3,072 |
| Event handlers | 6,144 |
| WebUI handlers | 1,536 |
| WebUI surfaces | 24 |
| Lua source size | 12 MiB per file |
| `readFile` result | 3 MiB |
| Lua files in a resource | 3,072 (including `open77.lua`) |
| Declared `files` / `web_files` | 6,144 each |

The frame budget is shared by all resources within a client host, not granted
to each resource. The trusted and server-downloaded hosts each have this
ceiling. These are maximum allowances, not reserved memory or a higher tick
rate. The dedicated server's Lua runtime has separate limits.

The signed-manifest and transport/message size caps have not been tripled.
For example, `readPackedFile` can read up to 3 MiB of raw file data, but its
Base64 result may exceed the unchanged 2 MiB WebUI message limit. Do not use
the larger file allowance as a promise that one `page:send` can carry it.

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

## Boot commands: `startup.commands`

A server can pin its own world state at boot with a list of console commands in
`server.jsonc`. This is how a server sets its weather, or anything else that is
a one-off command rather than a config field.

```jsonc
"startup": {
  "commands": [
    "weather.time.set 20:30:00",
    "weather.set lightclouds",
    "weather.random off"
  ]
}
```

At most 64 entries, each 1–512 characters and free of control characters.

**When they run.** After every `auto_start` resource has reached Running — so
the commands they register exist — and after those resources have had one
scheduler slice, so anything they initialise lazily on their first tick has
happened. They run before the console and the admin panel are drained on that
tick, so the configured list wins over anything typed at the same moment. Once
per process.

They run with **console authority**: the same path as typing at the server
console, `source = 0`, restricted resource commands allowed, and never a player
identity. Keep the list credential-free — it is plain text in the config.

**A refused line is reported, never fatal.** Every line is dispatched; a refusal
is logged with its line number, and a closing summary names the refused lines
and says the server started anyway. Boot is not aborted.

One subtlety: a command registered by a Lua resource is only *queued* onto that
resource's scheduler, so the immediate reply is "queued by resource X". A bad
*argument* surfaces a line or two later, prefixed with the resource name.

**Restart re-asserts; reload does not need to.** A resource that reloads carries
its authoritative state across the new VM, so the pin survives and nothing is
replayed — which also preserves anything an operator changed at the console
since boot. A resource that went down and came back carries nothing, so the host
re-dispatches exactly the boot lines that resource owned and that did not fail
the first time. Lines owned by another resource, or by nobody, are untouched.

Changing the list itself still requires a server restart.

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
- [The join-time readiness gate](readiness-gate.md) — the rule before you
  act on a joining player.
- [Operator tunables](tunables.md) — settings a server owner moves live.
- [Writing a gamemode](writing-a-gamemode.md) — putting it together.
