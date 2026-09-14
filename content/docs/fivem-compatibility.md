# FiveM compatibility aliases

Open77 already carries the FiveM runtime shape most resources depend on — `CreateThread`, `Wait`,
`SetTimeout`, `AddEventHandler`, `TriggerEvent`, `RegisterNetEvent`, `RegisterCommand`,
`RegisterKeyMapping`, `exports`. This page covers the layer added on top of that so a script copied
out of a FiveM resource runs without being rewritten: the `Citizen` table, `SetTick`, generic
promises, and the handful of shared-script helpers (`IsDuplicityVersion`, `LoadResourceFile`,
`GetHashKey`, `DoesEntityExist`, the ACE checks and the player identifiers).

Everything here is an **alias or an addition**. No function that existed before changed meaning,
and nothing widens the sandbox: `io`, `os`, `debug`, `package` and `load` are still absent, and
`LoadResourceFile` cannot leave the calling resource.

Three places where Open77 deliberately answers differently from FiveM are called out below in
their own sections. Read those before porting: they are silent traps otherwise.

## Availability at a glance

| Name | Client | Server | Maps to |
|---|---|---|---|
| `Citizen.CreateThread` / `Citizen.Wait` | yes | yes | the existing `CreateThread` / `Wait` — the same function value |
| `Citizen.SetTimeout` / `Citizen.ClearTimeout` | yes | yes | the existing `SetTimeout` / `ClearTimeout` |
| `Citizen.SetTick` / `Citizen.ClearTick` | yes | yes | `SetTick` / `ClearTick` below |
| `Citizen.Trace` | yes | yes | the resource log at debug level |
| `Citizen.Await` | yes | yes | `promise:await()` |
| `Citizen.CreateThreadNow` | **no** | **no** | see [What is missing](#what-is-missing-and-why) |
| `SetTick(fn)` / `ClearTick(id)` | yes | yes | a scheduler task looping with an implicit `Wait(0)` |
| `GetGameTimer()` | yes | yes | monotonic milliseconds |
| `promise.new()` | yes | yes | the existing `Open77.Promise` type |
| `IsDuplicityVersion()` | `false` | `true` | — |
| `LoadResourceFile(res, path)` | yes | yes | `Open77.resource.readFile` / `Open77.io.read` |
| `SaveResourceFile(res, path, data)` | no | yes | `Open77.io.write` |
| `GetHashKey(str)` / `joaat(str)` | yes | yes | **TweakDBID**, not a Jenkins hash |
| `DoesEntityExist(kind, id)` | yes | yes | the registry that owns that kind |
| `IsPlayerAceAllowed(playerId, perm)` | no | yes | `Open77.acl.isAllowed` |
| `IsPrincipalAceAllowed(userId, perm)` | no | yes | the same check, addressed by account id |
| `add_ace <principal> <object> allow` | no | yes | `Open77.acl.grant(userId, permission)` against a user, `Open77.acl.definePermission(role, …)` against a group. Both need a **scoped** manifest capability; see [the ACL guide](server-acl.md#changing-the-acl-from-a-resource-at-runtime) |
| `remove_ace <principal> <object> allow` | no | yes | `Open77.acl.revoke` |
| `add_principal <child> <parent>` | no | yes | `Open77.acl.addRole(userId, role)`; `remove_principal` is `removeRole` |
| `AddExplosion(x, y, z, type, damage, audible, invisible, shake)` | no | yes | `Open77.effects.explosion(position, options)` — server-side, because the damage goes through the stats authority. `type` is a `vfx` alias rather than a native enum |
| `explosionEvent` | no | yes | `onExplosion`, host-wide, carrying counts rather than names |
| `GetPlayerIdentifierByType(playerId, type)` | no | yes | `Open77.players.identifier` / `name` / `identity` |
| `GetPlayerIdentifiers(playerId)` | no | yes | the three above as `"type:value"` strings |
| `RegisterCommand(name, fn, restricted?)` | yes | yes | server: ACL `command.<name>`; client: `Open77.runtime.registerCommand` |
| `ExecuteCommand(line)` | yes | yes | client: the local registry only; server: the console, see below |
| `GetRegisteredCommands()` | yes | yes | `Open77.runtime.commands()` |
| `GetPlayerPing(playerId)` | no | yes | `Open77.players.ping` |
| `GetPlayerEndpoint(playerId)` | no | yes | `Open77.players.endpoint`, behind `players.identity.sensitive` |
| `GetConvar` / `GetConvarInt` / `GetConvarBool` / `SetConvar` | no | yes | the `convars` block, then this resource's tunables |
| `GetResourceMetadata(name, key)` | no | yes | `Open77.resource.metadata`; no third `index` argument |
| `StartResource` / `StopResource` | no | yes | `Open77.resource.start` / `stop`, behind `resources.control` |
| `GetNumResources()` / `GetResourceByFindIndex(i)` | no | yes | `Open77.resource.list()`; the find index is zero-based |

Failures follow the repository convention: `nil, reason` for a function that returns a value,
`false, reason` for a predicate, with stable snake_case reason tokens.

## Threads and ticks

`Citizen.CreateThread`, `Citizen.Wait`, `Citizen.SetTimeout` and `Citizen.ClearTimeout` are the
*same function values* as the bare globals — `Citizen.CreateThread == CreateThread` is `true` — so
there is no second scheduler and no second set of budgets.

```lua
Citizen.CreateThread(function()
    while true do
        Citizen.Wait(500)
        Citizen.Trace("still here")
    end
end)
```

### `SetTick(fn) -> id` and `ClearTick(id) -> boolean`

A tick is an ordinary scheduler task looping with an implicit `Wait(0)`: it runs once per host
tick (per frame on the client, per scheduler pass on the server), is bounded by the same per-frame
budget as any other task, and is counted against the same task cap. Stopping the resource stops it.

```lua
local id = SetTick(function()
    -- runs every frame
end)

ClearTick(id)          -- true the first time, false afterwards
```

`SetTick` returns `nil, "invalid_tick_function"` when the argument is not a function, and
`nil, "task_limit_or_stopping"` when the resource is at its task cap or shutting down.

**Errors inside a tick do not kill the VM, and are not ignored either.** Each failing pass is
logged at error level with the Lua error; after **five consecutive** failures the tick logs
`tick cancelled after 5 consecutive failures` and cancels itself. One successful pass resets the
count. The reason for cancelling rather than logging forever: a tick that throws every frame
otherwise fills the log and keeps spending its slice of the frame budget for the whole session.

Cancellation takes effect on the next pass, on both sides: `fn` never runs again after `ClearTick`
returns.

### `GetGameTimer()`

Monotonic milliseconds, on both sides. The client reads the same clock as
`Open77.time.monotonic()`, which reports seconds; the server returns the value the host hands its
scheduler each tick.

Like FiveM's, the epoch is arbitrary and is **not** wall clock: only the difference between two
readings means anything, and the client and the server share no origin. For a wall clock the
server has `GetUnixTime()` and `GetUtcTimestamp()`.

## Promises

`promise.new()` builds the **same** object `Open77.exports.call` returns, so there is one promise
type in the runtime rather than two.

```lua
local p = promise.new()

CreateThread(function()
    Wait(250)
    p:resolve("done")            -- or p:reject("no_such_thing")
end)

CreateThread(function()
    local value, reason = Citizen.Await(p)   -- identical to p:await()
    print(value, reason)
end)
```

| Method | Result |
|---|---|
| `p:resolve(...)` | `true`, or `false, "promise_already_settled"` / `"promise_cancelled"` |
| `p:reject(reason)` | same shape; a non-string reason becomes `"promise_rejected"` |
| `p:await()` | the resolved values, or `nil, reason` when rejected |
| `p:status()` | `"pending"`, `"resolved"`, `"rejected"`, or `"cancelled"` |
| `p:next(onResolved, onRejected)` | a scheduler task id, or `nil, reason` |

Four things to know before porting promise-heavy code:

- **`await` needs a managed coroutine.** Called from script load, or from anything that is not a
  scheduler task, it returns `nil, "await_requires_scheduler_coroutine"` rather than parking the
  VM. `Citizen.Await(p)` is exactly `p:await()` and behaves identically.
- **`:next` is not chainable.** It returns the id of the task it schedules, not a new promise, so
  `p:next(a):next(b)` does not work. Sequences belong in a `CreateThread` with `:await()`. The id
  is useful to cancel a continuation that is still waiting (`ClearTimeout`).
- **`:next` recognises a rejection by shape**: the `nil, <string reason>` pair `:await()` returns
  for one. That is this codebase's failure convention everywhere, so a promise deliberately
  resolved with a leading `nil` followed by a string is read as rejected. Resolve with a table, or
  use `:await()` directly, if that distinction matters.
- **On the client a pending promise has one consumer.** The first `:await()`/`:next()` woken by a
  settle takes the value, and the promise then reports `cancelled`; awaiting an *already settled*
  promise can be repeated. This is the existing client export-promise behaviour, not something the
  alias layer introduced. On the server a `promise.new()` promise keeps its value and can be
  awaited repeatedly. Code that awaits once is portable across both.
- **Resolved values cross a serialization boundary on the client** (the same one exports use), so
  a value that cannot be serialized is refused with `false, "promise_value_not_serializable"`
  rather than silently dropped. The server passes Lua values through untouched.

## Shared scripts

### `IsDuplicityVersion()`

`true` in the server VM, `false` in the client VM. This is the branch a `shared_script` uses:

```lua
if IsDuplicityVersion() then
    RegisterCommand("ping", function(source) print(source) end, false)
else
    RegisterNetEvent("app:pong", function() print("pong") end)
end
```

### `LoadResourceFile(resourceName, path)` and `SaveResourceFile(...)`

`LoadResourceFile` reads a file belonging to the **calling** resource and nothing else. Naming
another resource returns `nil, "cross_resource_read_denied"` — it does not quietly read your own
file, because that would make ported code look like it works.

| | Client | Server |
|---|---|---|
| Root | the resource directory (`Open77.resource.readFile`) | the resource's `data/` directory (`Open77.io.read`) |
| Permission | none | `filesystem.read` |
| Size cap | 1 MiB | the `Open77.io` cap |
| Escapes | `nil, "invalid_resource_path"` | `nil, "path_outside_resource"` |

`SaveResourceFile(resourceName, path, data)` exists on the **server only**, maps to
`Open77.io.write`, needs `filesystem.write`, and returns `true` or `false, reason`. There is no
client equivalent: a client resource writes through `Open77.kvp`, which is the persistence the
client actually has.

### `GetHashKey(str)` / `joaat(str)` — a TweakDBID, not a GTA hash

**This is the divergence most likely to waste your afternoon.** In FiveM `GetHashKey` is the
Jenkins one-at-a-time hash (`joaat`) of a GTA model or entry name. Open77's records are TweakDB
strings — `"Vehicle.v_sport2_quadra_turbo_r"`, `"Items.Preset_Lexington_Chrome"` — so the only
hash that resolves to anything in this game is the one REDengine computes itself:

```text
TweakDBID = CRC-32/ISO-HDLC(name)  in the low 32 bits
          | (length(name) & 0xFF)  in byte 4
```

Both runtimes compute the identical value (the client in C++, the server in Lua), so a hash
crossing the wire means the same thing on both sides:

```lua
GetHashKey("Vehicle.v_sport2_quadra_turbo_r")  --> 133740073284  (0x1E23879144)
GetHashKey("a")                                --> 8199323203
GetHashKey("")                                 --> 0
```

`joaat` is the same function under the FiveM name, kept so ported code reads naturally — but it is
**not** the Jenkins hash the name suggests. A hash constant copied out of a FiveM resource names a
GTA model and matches nothing here; port the *string*, not the number.

### `DoesEntityExist(kind, id)`

FiveM has one opaque entity handle space. Open77 has one registry per kind, and they do not share
an id space, so the kind has to be named:

```lua
DoesEntityExist("vehicle", vehicleId)   --> boolean
DoesEntityExist(vehicleId)              --> false, "kind_required"
```

The one-argument FiveM form cannot be answered and is refused rather than guessed at.

| `kind` | Client | Server |
|---|---|---|
| `"vehicle"` | `Open77.vehicles.get` | `Open77.vehicles.get` |
| `"npc"` | `Open77.npcs.get` | `Open77.npcs.get` |
| `"elevator"` | `Open77.elevators.get` | `Open77.elevators.get` |
| `"prop"` | the resource's own prop list | `Open77.props.get` |
| `"effect"` | the resource's own VFX/SFX lists | `Open77.effects.get` |
| `"player"` | the replicated health roster | `GetPlayers()` |
| `"loot"` | `false, "kind_unavailable_on_client"` | `Open77.loot.get` |

Reasons: `"kind_required"`, `"id_required"`, `"invalid_entity_id"`, `"unknown_entity_kind"`,
`"kind_unavailable_on_client"`.

Each kind answers through the registry that already owns it, **with that registry's permissions**:
a resource that may not read vehicles gets `false`, the same answer an absent id gets. If you need
to tell "denied" from "gone", call the namespace function directly — it returns the reason.

The client has no loot registry it can be asked about (the server owns that list), so the client
says so instead of answering `false`, which would read as "the drop is gone".

### ACE checks (server)

`IsPlayerAceAllowed(playerId, permission)` is `Open77.acl.isAllowed` under the FiveM name: same
`acl.read` permission, same session player id, same answer.

`IsPrincipalAceAllowed(userId, permission)` asks the same question addressed by **account id**.
FiveM principals are durable; Open77 resolves permissions through the connected session, so a user
who is not connected cannot be answered and the call returns
`false, "principal_not_connected"` rather than a bare `false` that would read as "denied".

### Player identifiers (server)

```lua
GetPlayerIdentifierByType(src, "open77")       --> "11111111-2222-3333-4444-555555555555"
GetPlayerIdentifierByType(src, "userId")       --> the same account GUID
GetPlayerIdentifierByType(src, "name")         --> "Valerie"
GetPlayerIdentifierByType(src, "fingerprint")  --> "sha256:..."
GetPlayerIdentifierByType(src, "license")      --> nil, "unknown_identifier_type"

GetPlayerIdentifiers(src)
--> { "open77:1111...", "name:Valerie", "fingerprint:sha256:..." }
```

`GetPlayerIdentifierByType` returns the **bare** value; `GetPlayerIdentifiers` returns the FiveM
shape, an array of `"type:value"` strings, so `for _, id in ipairs(GetPlayerIdentifiers(src))`
ports unchanged. A player with no session returns `nil, "player_not_found"`.

The durable identifier is the account GUID — Open77 has no Steam, license, discord or xbl
identifier to offer, and does not invent one.

### Commands on the client

`RegisterCommand` exists on **both** runtimes now, with the same handler shape
`(source, args, rawCommand)`. The client passes `source = 0`, because on the client there is no
other party to attribute a command to; a resource that wants the local session id calls
`Open77.session.playerId()`.

```lua
-- client script
RegisterCommand("hud", function(_, args)
    Open77.hud.setVisible(args[1] ~= "off")
end, false, { help = "Show or hide the HUD.", parameters = { { name = "state", optional = true } } })
```

The fourth argument is an Open77 addition, not a FiveM one: it is the completion entry the chat
composer shows. A port that passes three arguments is accepted unchanged and simply gets a generic
completion line.

**`restricted = true` on the client refuses rather than pretends.** The command is registered and
listed, and then declines to run with `command_restricted`. The client has no ACL — it cannot
answer an authority question — so enforcing nothing while claiming to enforce something would be
the worse failure. That is also what FiveM effectively does for a player who does not hold the ace.
An admin-only command belongs on the server, where `command.<name>` is a real check.

`ExecuteCommand(line)` differs from FiveM's deliberately: **it resolves against the client registry
only and reports whether it matched**, rather than silently forwarding an unrecognised line to the
server. `false, "unknown_command"` is the signal a caller uses to decide to forward, and that is
exactly what the chat composer does — it tries the client first, forwards on `unknown_command`, and
shows any other refusal. A composer that could not tell "no client command" from "the client
command failed" would either swallow errors or spend a net event on every keystroke.

`GetRegisteredCommands()` returns `{ name, resource, restricted, help?, parameters? }` on the
client — two fields more than FiveM's `{ name, resource }`, because the composer needs them to
build a completion. The server's returns the same shape plus `source`, which says whether a command
came from a Lua resource or from the operator console.

### Convars, and why tunables are better

`GetConvar`, `GetConvarInt`, `GetConvarBool` and `SetConvar` read a `convars` block of the server's
configuration, then fall through to **the calling resource's own declared tunables by exact key**,
then to the caller's default. A getter never raises. `SetConvar` is a server-wide, in-memory
override that does not survive a restart.

They exist so a port runs. They are not the mechanism to reach for when writing something new:
`Open77.tunables` is typed, range-checked, validated on every write, retunable by the operator from
the Warden panel while the server runs, persisted, scoped to one resource, and it notifies its owner
when a value changes. The fall-through to tunables is deliberate — it lets a ported resource be
migrated one key at a time instead of all at once. See
[the server API reference](server-api.md#convars).

### `ExecuteCommand` does not carry rcon

This is the one place Open77 refuses to copy FiveM, and it is worth reading before porting an admin
resource. In FiveM, `ExecuteCommand` runs as the console: full authority, with nothing anywhere
declaring that the resource holds it.

Here it is split in two. `runtime.commands` in the manifest lets a resource run another resource's
**ordinary** command and nothing else — a restricted command and every resource-lifecycle verb are
refused. `resources.control` raises that to the operator's authority and is separately required by
`StartResource` / `StopResource`. An operator installing a resource therefore sees the escalation in
the manifest before running it.

Commands are also **queued**, not run inline, and report acceptance rather than completion: Lua runs
inside the server's tick, and a resource stopping itself synchronously would free the Lua state
doing the stopping. The reply goes to the server log.

### Player identifiers, ping and endpoint (server)

`GetPlayerPing(playerId)` takes no capability — latency is not identity, and every scoreboard in the
genre shows it. It answers `nil, "ping_unavailable"` on a transport that cannot measure, rather than
a plausible zero.

`GetPlayerEndpoint(playerId)` **does** take one: `players.identity.sensitive`. An endpoint is an IP
address. FiveM gates nothing here; a port that quietly logged addresses will start reporting
`permission_denied:players.identity.sensitive` until its manifest says what it is doing.

`Open77.players.identifiers(playerId)` is the table companion to the array `GetPlayerIdentifiers`
has always returned — `{ open77, userId, name, fingerprint, joinedAt }`, plus `endpoint` **only**
when the capability is held. The field is absent rather than nil, so a caller can tell "you may not
ask" from "there is nothing there".

### txAdmin events, under Open77 names

A ported script that listens for `txAdmin:events:scheduledRestart` or
`txAdmin:events:serverShuttingDown` finds the same information under the
`open77:admin:` prefix. Rename the handler; the shapes are close but not identical.

| txAdmin | Open77 | Difference |
|---|---|---|
| `txAdmin:events:scheduledRestart` | `open77:admin:scheduledRestart(secondsRemaining, reason)` | Arguments, not a table. Raised on each rung of the warning ladder. |
| `txAdmin:events:serverShuttingDown` | `open77:admin:serverShuttingDown(reason)` | `restart`, `reset` or `shutdown`. |
| `txAdmin:events:announcement` | `open77:admin:announcement(text)` | Same. |
| `txAdmin:events:playerWarned` | `open77:admin:playerWarned(playerId, author)` | **No reason and no operator name** — see below. |
| `txAdmin:events:playerKicked` | `open77:admin:playerKicked(playerId, author)` | Same. |
| `txAdmin:events:playerBanned` | `open77:admin:playerBanned(playerId, author, durationSeconds)` | Same, plus the duration. |
| `txAdmin:events:healedPlayer` | — | No counterpart; see below. |

Two differences will bite a straight port. **The moderation reason is not carried**, and
`author` is a channel (`warden` or `resource`) rather than a staff name: these events reach
every resource on the server, and a host-wide event carrying either would be a moderation log
for anything that cared to listen. A script that displayed the reason must get it from its own
admin resource instead.

And **there is no `healedPlayer`**. txAdmin has one because healing is something its panel does;
Warden has no heal, and `Open77.players.heal` is a gameplay native any resource may call.
Announcing every call of it as an administrative act would be both a firehose and a lie. An
admin resource that heals on command should publish its own event, under its own namespace —
`open77:admin:` is reserved to the platform precisely so that "the operator's surface did this"
stays a claim only the platform can make.

The full contract, including the `Open77.runtime.scheduleRestart` lever, is in
[Admin events](server-api.md#admin-events).

## What is missing, and why

**`Citizen.CreateThreadNow` is deliberately absent on both sides.** It promises to run the body
immediately and yield only on the first `Wait`. Neither scheduler can do that honestly: a task is
created for the next pass, and resuming it inline from inside a running task would reset that
task's instruction counter and deadline mid-flight, quietly breaking the budget accounting the
whole sandbox rests on. Use `Citizen.CreateThread` and accept one frame of latency, or call the
code directly if it does not need to yield.

`Citizen.InvokeNative`, `Citizen.CreateUThread`, `Citizen.Wait` inside a non-managed coroutine, and
the `msgpack` surface are not provided: Open77 has no GTA native table to invoke, and the event
payload encoding is not msgpack.

## Verifying a port

A shared script that prints this block should produce the same output on both runtimes, except for
`duplicity`. It is what the client and server test suites assert:

```lua
print("parity duplicity=" .. tostring(IsDuplicityVersion()))
print("parity hash=" .. tostring(GetHashKey("Vehicle.v_sport2_quadra_turbo_r")))
print("parity joaat=" .. tostring(joaat("x") == GetHashKey("x")))
print("parity citizen=" .. tostring(Citizen.CreateThread == CreateThread) ..
  "," .. tostring(Citizen.CreateThreadNow == nil))
print("parity timer=" .. type(GetGameTimer()))
local _, kindError = DoesEntityExist(1)
print("parity kind=" .. tostring(kindError))
local _, crossError = LoadResourceFile("somewhere_else", "note.txt")
print("parity cross=" .. tostring(crossError))
local settled = promise.new()
settled:resolve("parity")
print("parity promise=" .. tostring(settled:status()))
local _, awaitError = Citizen.Await(promise.new())
print("parity await=" .. tostring(awaitError))
print("parity tick=" .. type(SetTick) .. "," .. type(ClearTick))
```

```text
parity duplicity=false      (client)   |  parity duplicity=true       (server)
parity hash=133740073284               |  parity hash=133740073284
parity joaat=true                      |  parity joaat=true
parity citizen=true,true               |  parity citizen=true,true
parity timer=number                    |  parity timer=number
parity kind=kind_required              |  parity kind=kind_required
parity cross=cross_resource_read_denied|  parity cross=cross_resource_read_denied
parity promise=resolved                |  parity promise=resolved
parity await=await_requires_scheduler_coroutine (both)
parity tick=function,function          |  parity tick=function,function
```

## See also

- [Complete server Lua API](server-api.md) — every server global and `Open77.*` namespace.
- [Cross-resource server exports](server-exports.md) — where the promise type comes from.
- [Server resources](server-resources.md) — manifests, permissions, and the resource lifecycle.
