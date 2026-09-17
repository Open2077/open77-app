# Lua modules and require

Split resource code into modules with `require`. A module returns its public value, typically a function table. Libraries such as [PolyZone](polyzone.md) execute inside the importing resource.

```lua
local PZ = assert(require('@polyzone'))
local zone = PZ.CircleZone:Create({x=100, y=200, z=20}, 15, {name='meeting_point'})
print(zone:isPointInside({x=105, y=200, z=20})) -- true
```

This loads PolyZone into **your resource's client Lua VM**. It does not download
a package from the internet, call a remote service, or share your zones with
another resource or player.

## Availability

`require` is a **client-side** global. The dedicated-server sandbox does not
expose it. For server code, declare ordered `server_script` entry points; use
[server exports](server-exports.md) to call another server resource.

Local modules already exist. The `@dependency` syntax requires the newer client
implementation introduced with PolyZone in client `2.31.13+op77.67`.
Installing a Lua package alone cannot add this capability to an older client.

## Load a file from your own resource

Example resource layout:

```text
taxi/
  open77.lua
  client/main.lua
  shared/fares.lua
```

Publish the module as a downloadable file, not a second entry point:

```lua
-- taxi/open77.lua
resource 'taxi'
version '1.0.0'
client_script 'client/main.lua'
files { 'shared/fares.lua' }
```

```lua
-- taxi/shared/fares.lua
local Fares = {}

function Fares.calculate(metres)
    return math.floor(10 + metres * 0.02)
end

return Fares
```

```lua
-- taxi/client/main.lua
local Fares, reason = require('shared.fares')
assert(Fares, reason)
print(Fares.calculate(1500)) -- 40
```

The name is relative to the **resource root**, not to `client/main.lua`.
Use dots for directories and omit `.lua`.

| Import | Resolution, in order |
|---|---|
| `require('shared.fares')` | Your resource's `shared/fares.lua`, then `shared/fares/init.lua` |
| `require('@my_library')` | The dependency's published `init.lua`, then `init/init.lua` |
| `require('@my_library/helpers.math')` | The dependency's published `helpers/math.lua`, then `helpers/math/init.lua` |

Do not write `require('shared/fares.lua')` or an absolute disk path. Module
names accept letters/digits, underscores, hyphens and dot-separated segments;
traversal such as `..` is rejected. The slash after `@my_library` separates the
resource name from the module name; nested module directories still use dots.

`files` makes a file available to clients. It does not execute it. Conversely,
`client_script` executes an entry point automatically. Listing the same module
as an entry point and importing it can execute its initialization twice.

## Import a dependency such as PolyZone

The server must install and load both resources. The caller declares its
dependency and the permissions its own code needs:

```lua
-- my_job/open77.lua
resource 'my_job'
version '1.0.0'
dependency 'polyzone >=1.0.0'
client_script 'client/main.lua'
permissions { 'world.query' }
```

```lua
-- my_job/client/main.lua
local PZ, reason = require('@polyzone')
assert(PZ, reason)

local garage = PZ.BoxZone:Create({x=100, y=200, z=20}, 12, 8, {
    name='garage', heading=30, minZ=19, maxZ=24,
})

garage:onPlayerInOut(function(inside)
    print(inside and 'Entered garage' or 'Left garage')
end, 250)
```

Here `world.query` is needed to read the player's position, not to use
`require` itself. A purely mathematical module needs no engine permission.
Add `world.debug` only if you enable PolyZone debug drawing.

The dependency must be declared and running, and its module must be published
under `files`. `require` neither installs nor starts a missing dependency.
Imports always execute with the **caller's permissions, memory budget and
resource lifetime**, not the provider's privileges.

## Publish your own library

```lua
-- my_library/open77.lua
resource 'my_library'
version '1.0.0'
auto_start true
files { 'init.lua', 'helpers/math.lua' }
```

```lua
-- my_library/helpers/math.lua
return { double = function(value) return value * 2 end }
```

```lua
-- my_library/init.lua
return { math = assert(require('@my_library/helpers.math')) }
```

Use the provider-qualified form for sibling imports inside a reusable library.
`require('helpers.math')` would search the **consumer's** resource, even when
that call is written inside `my_library/init.lua`.

The consumer declares `dependency 'my_library >=1.0.0'` and uses
`local Library = assert(require('@my_library'))`. It does not list
`@my_library/init.lua` as a manifest script. A provider may use its own
`@my_library` name without declaring a dependency on itself.

Everything in `files` is client-distributed content. Never publish credentials,
private configuration or server-only logic there.

## Cache, ownership and reload

The first successful import executes the module synchronously. Later imports
of the same resolved file in the same Lua VM return its cached value:

```lua
local first = assert(require('@polyzone'))
local again = assert(require('@polyzone/init'))
print(first == again) -- true: both resolve to polyzone/init.lua
```

If a module returns nothing or nil, the cached result is `true`. Return a table
explicitly when exposing an API. A module may deliberately return `false`;
check `value == nil` if false is a valid result for your library.

Two consuming resources have **separate module instances**. Within one VM,
mutating the returned table affects other imports of that module in that VM;
it does not affect another resource's copy.

Keep module initialization synchronous: do not call `Wait` or await an export
at file scope during `require`. Return functions that can later run in
scheduler coroutines. Circular imports return `nil, 'circular_module_dependency'`.

Stopping/reloading the consumer destroys its VM, cached modules and owned
tasks/handlers. Native objects still follow their individual API cleanup rules;
PolyZone clears its own blips and debug drawings. Dropping one Lua variable is
not equivalent to destroying a zone: call `zone:destroy()` when finished.

Updating the provider does not rewrite tables already held by consumers.
Reload the consuming resources to adopt the new library code. A fresh
`require('@provider')` still checks that the dependency is declared and running;
a cached value does not bypass those checks.

## Require or exports?

| Need | Use | Where the code runs |
|---|---|---|
| Split your client code into files | Local `require` | Your resource's VM |
| Reuse constructors, helpers, zones or callback-based Lua objects | `require('@library')` | A separate library copy in each caller's VM |
| Ask another resource to open its UI or perform a service operation | `Open77.exports.call(...)` | The provider's VM, asynchronously |
| Send information between client and server | Network events | Across the transport, with server validation |

Exports copy supported values across the VM boundary; they cannot transfer a
live Lua function or a working zone object with methods. That is why PolyZone
uses `require` for its classes. Its server-side `TriggerZoneEvent` service is
an export instead. See [resource exports](resource-exports.md) and
[server exports](server-exports.md).

Imported client code does not become authoritative. For money, inventory or
access checks, validate the action on the server even when a client zone says
the player is inside.

## Troubleshooting

```lua
local library, reason = require('@my_library')
if library == nil then
    print('Library could not be loaded: '..tostring(reason))
    return
end
```

| Result | What to check |
|---|---|
| `module_dependency_not_declared` | Add the provider's resource name to the caller's `dependency` declaration. |
| `module_dependency_not_running` | Install/load the provider and fix any startup error before importing it. |
| `module '...' not found in resource VFS` | Check spelling, resource-root paths, downloaded files and the provider's `files` entries. |
| `invalid_module_name` | Omit `.lua`, use dot-separated folders, and avoid paths/URLs. An old client can also reject the new `@` syntax. |
| `circular_module_dependency` | Remove the import cycle; extract shared definitions into a third module. |
| Syntax/runtime error text | Fix the module identified in the message; its first execution did not complete. |
| Attempt to call nil `require` | This is server-side code, not the client module runtime. |

Ordinary module lookup/loading failures return `nil, reason`; invalid argument
types can raise a Lua argument error. No `package.path`, native DLL loader,
HTTP importer or unrestricted filesystem access is exposed.

See the [client API reference](/docs/api/client/globals#require) for the call
signature and [PolyZone](polyzone.md) for the complete zone API.
