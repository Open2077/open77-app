# Cross-resource server exports

Server resources can publish and call **asynchronous exports**, using the same
Lua surface as client resources. Each resource still has its own Lua VM: globals,
functions, handles and mutable tables are not shared.

This requires a server build containing the server-export runtime. Updating a
Lua package or the website alone does not add the feature to an older server.
No client update is required. The client and server export registries are
separate: a server export is not a client RPC or a network event.

## Publish a service

Create `resources/score_service/open77.lua`:

```lua
resource 'score_service'
version '1.0.0'
server_script 'server.lua'
```

Then `resources/score_service/server.lua`:

```lua
local scores = {}

exports('add', function(playerId, points)
    -- Identity comes from the runtime, never from a supplied owner string.
    if GetInvokingResource() ~= 'race_mode' then
        return nil, 'caller_denied'
    end
    if type(playerId) ~= 'number' or playerId < 1 or playerId % 1 ~= 0 then
        return nil, 'invalid_player'
    end
    if type(points) ~= 'number' or points % 1 ~= 0 or points < 1 or points > 100 then
        return nil, 'invalid_points'
    end
    scores[playerId] = (scores[playerId] or 0) + points
    return scores[playerId]
end)
```

This is an in-memory example, not persistent storage or a race-result validator.
The gamemode must verify the player's result before awarding points. The service
must validate every public argument even when it recognizes the caller.

## Call it from another resource

`resources/race_mode/open77.lua`:

```lua
resource 'race_mode'
version '1.0.0'
dependency 'score_service >=1.0.0'
server_script 'server.lua'
```

`resources/race_mode/server.lua`:

```lua
-- Restricted demonstration command: do not expose arbitrary score grants.
RegisterCommand('score_demo', function(playerId)
    if playerId == 0 then print('Run this as an authorized player'); return end
    local pending, dispatchError = Open77.exports.call('score_service', 'add', playerId, 10)
    if not pending then print(dispatchError); return end

    local score, callError = pending:await()
    if score == nil then print(callError); return end
    print('New score: ' .. score)
end, true)
```

Enable `race_mode` in the server's resource selection; its dependency starts the
service first. Keep the existing resources enabled. The restricted command uses
the normal `command.score_demo` ACL. A declared dependency controls ordering and
stop propagation, **not authorization**: any running server resource can attempt
an exported call. The service decides which callers it accepts.

Use `CreateThread`, an event handler or a command handler for `:await()`. Do not
call exports at file scope while a candidate VM is preparing: the call returns
`nil, 'resource_preparing'`. Registering exports at file scope is supported.
Start initial requests from a scheduled thread or `onResourceStart` instead.

## Execution, identity and permissions

- `exports(name, function)` publishes or replaces a function in this VM.
- `Open77.exports.call(resource, name, ...)` returns a Promise or `nil, reason`.
  There is no `exports.resource:method()` proxy.
- `promise:await()` returns the function's values, including multiple values and
  nil holes. A rejected call returns `nil, reason`; `promise:status()` reports
  `pending`, `resolved`, `rejected` or `cancelled`. A service may also deliberately
  return `nil, reason` as a normal result (Promise status then remains `resolved`).
- Calls execute on the target's scheduler, not inside the caller's native stack.
  Exported functions may `Wait`, await another export, or await supported MySQL
  operations. Self-calls and nested calls are also deferred.
- `GetCurrentResourceName()` remains the provider. `GetInvokingResource()` and
  `GetInvokingResourceGeneration()` identify the immediate caller throughout the
  exported coroutine, including after a yield. Outside that coroutine they are
  nil; a new thread/timer does not inherit the identity. Nested A → B → C calls
  identify B as C's caller. `GetCurrentResourceGeneration()` identifies this VM.
- Native permissions, filesystem roots, database ownership and gameplay handles
  remain those of the **provider**. A privileged caller does not lend capabilities
  to an unprivileged provider. Conversely, a privileged provider must explicitly
  authorize callers before offering privileged operations.
- The export callback does not inherit a network player's `source`; it begins
  each resume with `source == nil`. Pass a validated player ID explicitly. An
  export is a resource-to-resource call, not proof of a player's identity.

Keep resource-owned handles in the provider. Return a serializable ID and expose
validated methods for operating on it; never attempt to transfer a native handle
or function. For long-lived ownership, retain both caller name and generation,
and remove stale ownership when the resource stops/reloads.
Use `Open77.resource.generation(ownerName)` to compare with the stored generation:
it changes on reload and returns `0` if the provider is no longer running. With
no argument it returns this VM's generation. These identities are local to the
server process, not durable IDs to persist across a server restart.

`TriggerEvent` remains local to one server VM. This feature does **not** turn it
into a cross-resource event bus. Host lifecycle/player events retain their existing
fan-out; client/server communication still uses authenticated network events.

## Values, limits and lifecycle

Arguments and results support nil, booleans, finite numbers, 64-bit Lua integers,
binary strings and nested plain tables with string/integer keys. They are copied:
mutating a received table cannot modify the sender's table. Metatables are not
transferred. Functions, userdata, threads, cyclic tables, nonfinite numbers and
unsupported keys are rejected.

Server limits per argument/result tuple are 32 values, depth 16, 4,096 visited
nodes and a 48 KiB transfer budget (including node overhead). Export names are
1–64 characters; a resource can register 256 names. There are at most 256 retained
requests per caller, 256 pending requests per target and 4,096 requests per host.
The existing 1,024-task, instruction and VM-memory limits still apply.

A pending server call times out after **30 seconds** of host monotonic time.
Timeout, caller shutdown or caller reload cancels the target's scheduled task.
This stops future continuation; it cannot undo writes already performed or cancel
an external database/HTTP operation already submitted. Design retries to be safe.

Requests bind both VM generations. A target stop or successful reload rejects
pending calls to its old VM with `export_resource_stopped`. A failed transactional
reload leaves the old service available: candidate exports are never published.
New calls resolve the new provider after a successful reload. Stopping a declared
dependency also stops its dependents under the existing lifecycle rules.

Keep the Promise until you have consumed the result. Once it is collected, the
request is released; a still-pending target task is cancelled. Retaining every
completed Promise indefinitely eventually reaches the caller request quota.

Common refusal reasons:

| Reason | Meaning |
| --- | --- |
| `resource_preparing`, `resource_stopping` | Calling from a VM that is not active. |
| `invalid_export_name`, `export_function_required` | Invalid registration/call shape. |
| `export_resource_unavailable`, `export_not_found` | No active provider or no matching export. |
| `export_arguments_not_serializable`, `export_results_not_serializable` | Unsupported value or transfer limit. |
| `export_request_limit`, `export_target_busy`, `export_registration_limit` | A request, task or registration quota was reached. |
| `await_requires_scheduler_coroutine` | A pending Promise was awaited outside a managed task. |
| `export_resource_stopped`, `export_timeout`, `promise_cancelled` | The request's lifetime ended. |

Lua handler errors reject the Promise with the bounded Lua error text. An export
is not automatically registered as a network event, and an export failure alone
does not stop otherwise healthy resources.

See the [server API reference](server-api.md#cross-resource-exports),
[official client resource exports](resource-exports.md), and
[gamemode architecture](gamemode-kernel.md).
