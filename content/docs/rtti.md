# RTTI calls and hooks

`Open77.rtti` lets a client resource call reflected native and scripted game
functions with supported signatures, without a binding written per function.
RTTI is the engine's runtime type information. The bridge uses it to discover
function signatures and convert Lua values: a name is resolved at runtime, its parameters are read
from the engine's own type information, and values are converted to the game's
types on the way in and back on the way out.

## Requirements

Use a client build that exposes `Open77.rtti`; these functions run in the client
resource runtime. Feature detection is available with `type(Open77.rtti) == "table"`.

Permission: `rtti.native`. This is a privileged client API: a permitted resource
can invoke engine behavior directly. The dedicated server has no REDengine backend.
Calls and hooks require a running resource; top-level candidate loading and stop
handlers return `resource_not_active`. Register them in an event or thread.

## Manifest

```lua
resource "my_resource"
version "1.0.0"
client_script "client.lua"
permissions { "rtti.native" }
```

## Function reference

| Function | Result |
| --- | --- |
| `Open77.rtti.resolve(class, fn)` | `{ name, static, returnType, params = { {name, type}... } }`, or `nil, reason` |
| `Open77.rtti.call(class, fn, instance, ...)` | the return value (`nil` for void), or `nil, reason` |
| `Open77.rtti.hook(class, fn, handler)` | a hook id, or `nil, reason` |
| `Open77.rtti.unhook(id)` | `true` if this resource removed the hook |
| `Open77.rtti.release(ref)` | `true`; drops a pinned object reference |

`class` is `nil` (or `""`) for a global function, looked up by its decorated
name. `fn` is the function name; when a class has overloads, pass the decorated
name the `resolve` result reports. `instance` is a ref for a method and `nil`
for a static function. Ambiguous short method names return `ambiguous_function`.
Supply every declared parameter, including optional parameters; automatic
defaults and `out` parameters are not supported. Signatures above 15 parameters
are refused before entering the engine.

## Calling functions

Run calls inside a resource callback or thread. A successful void or null-handle
return is `nil` without a reason; check the second result to distinguish failure.

```lua
AddEventHandler("example:rtti:inspect", function()
    local signature, reason = Open77.rtti.resolve(nil, "AbsF")
    if not signature then
        print(reason)
        return
    end
    print(signature.name, signature.returnType) -- AbsF, Float

    local value, callError = Open77.rtti.call(nil, "AbsF", nil, -3.5)
    if callError then
        print(callError)
        return
    end
    print(value) -- 3.5
end)
```

For globals, use the full name exposed by RTTI. Scripted globals may include the
class and parameter suffix, such as `MathHelper::EulerNumber;`. Class methods
accept a full decorated name or an unambiguous short name. Resolving metadata
succeeds even for signatures the bridge cannot marshal; it does not guarantee
that a call or hook can be installed.

## Hooks

```lua
AddEventHandler("example:install", function()
    local id = assert(Open77.rtti.hook(nil, "AbsF", function(ctx, value)
        return ctx.callOriginal(value) + 10
    end))
    assert(Open77.rtti.call(nil, "AbsF", nil, -3) == 13)
    assert(Open77.rtti.unhook(id))
end)
```

The handler is called as `handler(ctx, ...args)`:

- `ctx.callOriginal()` continues the chain with the arguments the hook received.
  `ctx.callOriginal(...)` continues it with the arguments given instead.
- `ctx.instance` is the instance ref for a method, `nil` for a static function.
- `ctx.name` is the function's decorated name.
- The handler's return value is the call's result.
- Returning **nothing** passes through: the original runs (for a function with a
  result) and its result is used, or, after a `callOriginal`, that result stands.
  For a void function with no `callOriginal` the original is skipped.
- A Lua error is logged. Before the original, it falls back to the original;
  afterwards, it preserves the original's result without repeating side effects.
  Invalid return types receive the same native fallback.

Within one resource host, hooks on a function run in registration order. The
bootstrap host and downloaded-resource host keep separate subscriptions; stopping
a resource removes only its own hooks. A call made to
the same function from inside its own hook reaches the original directly, so a
hook that calls the function it hooks does not recurse.

`ctx.callOriginal` is valid only while its hook runs and at most once per handler.
Calling it later or twice raises an error. `nil` has the same pass-through meaning
as no return value, so it cannot override a non-null handle result with null.

Hooks cover SDK `CStack` calls through `ExecuteScripted` / `ExecuteNative` on the
game thread, including `Open77.rtti.call`. Other VM entry points, engine stack
layouts, direct native calls and worker-thread calls bypass them. Registering a
hook does **not** prove that every natural game call to that function is observed.
Callbacks are synchronous, cannot yield, and use the resource's Lua execution quota.

## Values

| Game type | Lua |
| --- | --- |
| `Bool` | boolean |
| `Int8`..`Int64`, `Uint8`..`Uint32`, enums | integer; a value outside the declared width is rejected |
| `Uint64` | integer preserving all 64 bits; high-half values appear negative in Lua |
| `Float`, `Double` | finite number within the type's range |
| `CName`, `String`, `CString` | string |
| `TweakDBID`, `EntityID` / `entEntityID` | integer (the 64-bit pattern) |
| strong handles to `IScriptable`-derived objects | ref (userdata), or `nil` for null |

Structs, arrays, `Pointer`, `WeakHandle` and `script_ref` types are not converted. A call
that needs one returns `nil, "unsupported_type:<name>"`.
Embedded NUL bytes in text are rejected. New CName strings are registered in the
engine's name pool. Resolution can describe unsupported signatures, but calls
and hook installation reject them before invoking the engine.

## Refs

A ref is a pinned game object: the bridge holds a reference to it, so the object
stays valid while the ref exists.

- Refs delivered to a hook (`ctx.instance`, object arguments and results from
  `ctx.callOriginal`) last only as
  long as that hook dispatch. Using one after the dispatch returns fails with
  `ref_released`. Do not keep them in your own state.
- A ref returned by `call` stays pinned until you `release` it or the owning
  resource stops/reloads. Garbage collection alone does not release it.
  Releasing an expired ref is harmless. Method instances and handle arguments
  are checked against the function's declared class.

```lua
AddEventHandler("example:rtti:object", function()
    local ref, reason = Open77.rtti.call(nil, "CompareBuilder::Make;", nil)
    if reason then
        print(reason)
        return
    end
    local value, methodError = Open77.rtti.call("CompareBuilder", "Get;", ref)
    Open77.rtti.release(ref)
    if methodError then print(methodError) else print(value) end
end)
```

## Errors

Bridge validation and backend failures return `nil, reason`. Invalid Lua API
argument kinds checked by Lua itself can raise an error; use `pcall` when accepting
untrusted input. `unhook` returns `false` for an unknown hook or one owned by
another resource. Common reason codes:

- `permission_denied:rtti.native`
- `function_not_found`
- `argument_count:<n>`
- `integer_out_of_range:<type>`
- `unsupported_type:<name>`
- `instance_required` (a method called without an instance)
- `ref_released`
- `resource_not_active`, `ambiguous_function`, `unsupported_out_parameter:<name>`
- `instance_type_mismatch`, `ref_type_mismatch`, `static_instance_must_be_nil`
- `number_out_of_range:<type>`, `embedded_nul`
- `not_resolved`, `rtti_unavailable`, `native_call_failed`

## Debugging in the game

Use [autonomous agent testing](agent-testing.md) to target the correct running
client. The read-only debug bridge command `rtti.state` reports pinned references,
function sites with hooks, host subscribers, active dispatches, call/dispatch
counts, fallbacks and whether the SDK detours are installed.

```powershell
pwsh -NoProfile -File scripts/debug-bridge.ps1 -ProcessId <game-pid> -Command 'rtti.state'
```

After a resource releases its refs and removes its hooks, the corresponding
counts should return to their baseline. Detours can remain installed with zero
sites until the plugin unloads.

The platform includes the opt-in `open77_rtti_test` resource for repeatable
engine probes. Copy it to the trusted bootstrap of an isolated test installation,
start the game, and send these commands through its debug bridge:

```text
resource.start open77_rtti_test
resource.emit rtti:test:run all
rtti.state
resource.stop open77_rtti_test
rtti.state
```

The resource logs `[rtti-test] PASS`, `FAIL` and a final `DONE` line in that
client's game log. Deliberate hook errors exercise fallback behavior; use the
final failure count and lifetime counters to assess the run.

In a multiplayer test session, resource mutations go through the server's
ACL-authorized debug laboratory. Replace the player ID with the target player's
server ID; it is different from the Windows process ID:

```text
client.exec 1 return Open77.debug.command('resource.emit rtti:test:run all')
net.commands 10
rtti.state
```

A queued command is not its completion result. Read the server response journal,
the matching client log and `rtti.state`. See [privileged debug runtime](debug-runtime.md)
for the laboratory permissions and [autonomous agent testing](agent-testing.md)
for connection and world-readiness checks.
