# FiveM compatibility aliases

Port FiveM resources using Open77's compatibility aliases for threads, timers, events, commands, key mappings, exports and promises. This guide lists supported aliases and the APIs needed where engine behavior differs.

Everything here is an **alias or an addition**. No function that existed before changed meaning,
and nothing widens the sandbox: `io`, `os`, `debug`, `package` and `load` are still absent, and
`LoadResourceFile` cannot leave the calling resource.

The second half of the page is the porting notes that are *not* aliases — where a FiveM idiom maps
onto something shaped differently here: the [damage feedback events](#damage-feedback-events-client),
[keeping an NPC on task](#keeping-an-npc-on-task), [draw calls](#porting-fivem-draw-calls),
[manifest keys](#manifest-keys), and the streaming loops that have
[nothing to wait on](#what-is-missing-and-why).

Three places where Open77 deliberately answers differently from FiveM are called out below in
their own sections. Read those before porting: they are silent traps otherwise.

## Availability at a glance

| Name | Client | Server | Maps to |
|---|---|---|---|
| `Citizen.CreateThread` / `Citizen.Wait` | yes | yes | the existing `CreateThread` / `Wait` — the same function value |
| `Citizen.SetTimeout` / `Citizen.ClearTimeout` | yes | yes | the existing `SetTimeout` / `ClearTimeout` |
| `Citizen.SetTick` / `Citizen.ClearTick` | yes | yes | `SetTick` / `ClearTick` below |
| `Citizen.Trace` | yes | yes | the resource log at debug level — `DBG` on both sides. (Until A17 landed the server wrote it as `INF`; `Open77.log.debug/info/warn/error` now reach the server log as `DBG/INF/WRN/ERR`, with ANSI escapes and FiveM `^N` colour codes stripped) |
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
| `SetEntityInvincible(kind, id, enabled)` | no | yes | `Open77.players.setGodMode` for `"player"`; every other kind is refused **by name** — see [below](#setentityinvinciblekind-id-enabled) |
| `IsPlayerAceAllowed(playerId, perm)` | no | yes | `Open77.acl.isAllowed` |
| `IsPrincipalAceAllowed(userId, perm)` | no | yes | the same check, addressed by account id |
| `add_ace <principal> <object> allow` | no | yes | `Open77.acl.grant(userId, permission)` against a user, `Open77.acl.definePermission(role, …)` against a group. Both need a **scoped** manifest capability; see [the ACL guide](server-acl.md#changing-the-acl-from-a-resource-at-runtime) |
| `remove_ace <principal> <object> allow` | no | yes | `Open77.acl.revoke` |
| `add_principal <child> <parent>` | no | yes | `Open77.acl.addRole(userId, role)`; `remove_principal` is `removeRole` |
| `AddExplosion(x, y, z, type, damage, audible, invisible, shake)` | no | yes | `Open77.effects.explosion(position, options)` — server-side, because the damage goes through the stats authority. `type` is a `vfx` alias rather than a native enum |
| `explosionEvent` | no | yes | `onExplosion`, host-wide, carrying counts rather than names |
| `StartScriptFire(x, y, z, maxChildren, isGasFire)` | no | yes | `Open77.effects.fire(position, options)` — server-side, same reason as the blast. `maxChildren` has no equivalent: a fire is one radius, not a spreading tree. `isGasFire` is a `vfx` alias (`fire.gas`) |
| `RemoveScriptFire(handle)` | no | yes | `Open77.effects.removeFire(fireId)`; `Open77.effects.fires()` lists what this resource still has burning |
| `GetScriptFireCoords` / `IsEntityOnFire` | no | partly | `Open77.effects.fires()` answers the first for a resource's own fires; there is no per-entity burning flag, because nothing in the engine replicates one |
| `fireEvent` | no | yes | `onFire`, host-wide, with `started`/`stopped` and a count rather than names |
| `ptFxEvent` | no | yes | `onParticleEffect`, host-wide, for every world-positioned server effect. Entity-bound `playOn`/`attach` raise nothing: the target owns the transform |
| `GetPlayerIdentifierByType(playerId, type)` | no | yes | Bare `open77`, `userId`, `name`, `fingerprint`, `license`, `steam` or `gog` value |
| `GetPlayerIdentifiers(playerId)` | no | yes | Available identifiers as `"type:value"` strings; table form: `Open77.players.identifiers` |
| `RegisterCommand(name, fn, restricted?)` | yes | yes | server: ACL `command.<name>`; client: `Open77.runtime.registerCommand` |
| `ExecuteCommand(line)` | yes | yes | client: the local registry only; server: the console, see below |
| `GetRegisteredCommands()` | yes | yes | `Open77.runtime.commands()` |
| `GetPlayerPing(playerId)` | no | yes | `Open77.players.ping` |
| `GetPlayerEndpoint(playerId)` | no | yes | `Open77.players.endpoint`, behind `players.identity.sensitive` |
| `GetConvar` / `GetConvarInt` / `GetConvarBool` / `SetConvar` | no | yes | the `convars` block, then this resource's tunables |
| `GetResourceMetadata(name, key)` | no | yes | `Open77.resource.metadata`; no third `index` argument |
| `StartResource` / `StopResource` | no | yes | `Open77.resource.start` / `stop`, behind `resources.control` |
| `GetNumResources()` / `GetResourceByFindIndex(i)` | no | yes | `Open77.resource.list()`; the find index is zero-based |
| `CancelEvent()` / `WasEventCanceled()` | no | yes | the cancellable bus (`TriggerCancellableEvent`), and inside a `playerConnecting` handler the FiveM refusal exactly: `setKickReason(msg)` then `CancelEvent()` — see [Connection control](connection-control.md#setkickreason-and-cancelevent-exactly-as-in-fivem) |
| `TriggerLatentClientEvent(name, target, bytesPerSecond, ...)` | no | yes | the same function under the FiveM name (`Open77.net.emitLatent`): up to 4 MiB cut into paced 40 KiB frames — [Latent client events](server-api.md#latent-chunked-client-events) |
| `SetHttpHandler(fn)` | no | yes | `Open77.http.listen("/", fn)` under the FiveM name; the listener is an operator opt-in and the route lives under `/<resource>/` — [Serving HTTP](server-api.md#serving-http) |
| `GetPlayerTimeOnline(playerId)` / `GetPlayerLastMsg(playerId)` | no | yes | `Open77.players.sessionStats(id).sessionSeconds * 1000` and `Open77.players.get(id).ageMs` — milliseconds, the units FiveM documents |
| `GetPlayerLocale(playerId)` | no | yes | `Open77.players.locale` under the FiveM name: the engine's own language setting, reported by the client (`Open77.session.locale()` there). `GetCurrentLanguage` has no counterpart — read `code` from the same table |
| `SetTimeScale(scale)` | yes | per bucket | `Open77.world.setTimeScale(scale, options)` on the client — a claim per resource, eased and timed, released on stop; `Open77.world.setTimeScale(bucket, scale, options)` on the server replicates one beat to a routing bucket. Zero is refused (it freezes input with the world) — [World time](world-time.md) |
| `SetGravityLevel` | partly | no | only `Open77.chute.arm(gravity, …)`, which rewrites the local player's gravity while airborne and shields the landing; there is no neutral world-gravity knob |
| `FreezeEntityPosition(vehicle, true)` | yes | yes | client `Open77.vehicles.setFrozen` (local chassis physics, `vehicles.performance`); server `Open77.vehicles.setFrozen` pins the canonical pose and every client's projection follows. The control lock is the separate `setUndriveable`, and an impound wants both — [Freezing a car](vehicles.md#freezing-a-car). Players: `Open77.players.setFrozen` / `Open77.character.setFrozen` |
| `GetGroundZFor_3dCoord(x, y, z)` | yes | yes | client `Open77.world.groundZ(x, y, fromZ?)` (a static-geometry ray); server `Open77.world.groundZ({ x, y }, options)` is an **observation relayed from the nearest connected client**, `nil, "no_observer"` when nobody is near — never an invented height — [World queries](world-queries.md) |
| `SetPedToRagdoll(ped, ms, …)` / `ClearPedTasksImmediately(ped)` | no | yes | `Open77.players.ragdoll(id, { durationMs })` (the engine's knockdown, clamped to 3000 ms; needs the motion service, i.e. a server with a database) and `Open77.players.clearTasks(id)` — [Player freeze](player-freeze.md#putting-a-player-down-and-clearing-everything-ragdoll-and-cleartasks) |
| fall-damage toggle (`SetPedCanRagdoll` family) | no | yes | `Open77.players.setFallDamage(id, false)` — fall damage **only**, not god mode — [Player stats](player-stats.md#fall-damage) |
| `NetworkGetEntityOwner` / `NetworkRequestControlOfEntity` | no | yes | `Open77.vehicles.owner(id)` / `Open77.npcs.owner(id)` and `Open77.vehicles.requestAuthority(id, playerId)` — a request the election validates, refused by name (`driven`) rather than a forced steal |
| `PlayPedAmbientSpeechNative(ped, context, …)` | no | yes | `Open77.npcs.speak(id, voice)` — a `voContext` name against the NPC's own voiceset; `true` means queued on every viewer's puppet, and a name the voiceset lacks is silent without a word — [NPC behaviour](npc-behavior.md#speech-one-line-on-demand) |
| `SetPedComponentVariation` on an **NPC** | no | plumbing | `Open77.npcs.setEquipment(id, { slot = record })` replicates a canonical clothing set, but measured on 2.31 a `Character.*` rig renders none of it: `true` is not a visible outfit — [NPCs](npcs.md) |
| `GiveWeaponComponentToPed` / grenades in a throwable slot | yes | yes | `Open77.weapons.setComponent` / `removeComponent` / `components` and `giveGadget` / `takeGadget` / `gadgets`, with `onGadgetConsumed` on the owner's report — [Weapon Lua API](weapons-api.md) |
| `screenshot-basic` (`requestScreenshot`, `requestScreenshotUpload`, `requestClientScreenshot`) | yes | yes | client `Open77.screen.capture` + `Open77.screen.upload` (the game's own back buffer, never the desktop); server `Open77.players.requestScreenshot(id, { url })`, delivered by the client to a URL — the picture never crosses the game transport — [Screenshots](screenshots.md) |
| `RegisterPedheadshot` (mugshots) | yes | no | `Open77.screen.mugshot(entity, options)` — a remote player or an NPC is a framed face; the **local player in first person has no body to photograph** — [Screenshots](screenshots.md) |
| `RequestModel` / `HasModelLoaded` / `RequestAnimDict` / `SetModelAsNoLongerNeeded` | — | — | **not needed**, and not provided — see [What is missing](#what-is-missing-and-why) |
| `SetBlockingOfNonTemporaryEvents` / `SetPedKeepTask` / `SetEntityAsMissionEntity` | no | yes | three NPC settings that already exist under other names — see [Keeping an NPC on task](#keeping-an-npc-on-task) |
| `DrawText`, `DrawText3D`, `DrawMarker`, `DrawLine`, `DrawSprite` | yes | — | the UI kit and the world-drawing namespaces — see [Porting FiveM draw calls](#porting-fivem-draw-calls) |
| `onResourceStarting` / `playerEnteredScope` / `playerLeftScope` | no | yes | the same names, host-wide and reserved: `onResourceStarting(name)` is delivered inline while the resource still reads `starting` (a `CancelEvent()` inside it is refused by name, never ignored), and the scope pair is published under both spellings (`onPlayerEnteredScope` too) — [Scope events](server-api.md#scope-events) |

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

**Hash compatibility.** In FiveM `GetHashKey` is the
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

### `SetEntityInvincible(kind, id, enabled)`

The same divergence, on the one write FiveM scripts make through an entity handle. Server only,
because damage immunity is a server ledger here:

```lua
SetEntityInvincible("player", playerId, true)   --> true            (Open77.players.setGodMode)
SetEntityInvincible("player", playerId, false)  --> true
SetEntityInvincible(playerId, true)             --> false, "kind_required"
SetEntityInvincible("vehicle", vehicleId, true) --> false, "unsupported_entity_kind"
```

For `"player"` it **is** `Open77.players.setGodMode` — the same `players.stats.apply` permission
(refused as `permission_denied:players.stats.apply` before any id is looked at), the same combat
ledger bit, read back as `Open77.players.get(id).godMode`. Every other kind is refused **by name**
rather than accepted and ignored: a vehicle's damage is its own scopes (`setEngineHealth`, the body
zones), an NPC's is its `damagePolicy`, and a ported script that expects an indestructible car
should find that out here rather than on the first hit. A name that is no kind at all is
`unknown_entity_kind`; a non-boolean `enabled`, or a player the ledger does not hold yet, is
`invalid_argument`.

Two neighbours it is not: `Open77.players.setFallDamage(id, false)` switches fall damage off and
nothing else, and the grav-chute's shield is a blanket *Invulnerable* that lives only while the
chute is armed — [Player stats](player-stats.md#fall-damage) draws the line.

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
GetPlayerIdentifierByType(src, "userId")       --> the same installation identity GUID
GetPlayerIdentifierByType(src, "name")         --> "Valerie"
GetPlayerIdentifierByType(src, "fingerprint")  --> "sha256:..."
GetPlayerIdentifierByType(src, "license")      --> "aaaaaaaa111122223333bbbbbbbbbbbb"
GetPlayerIdentifierByType(src, "steam")        --> "11000010000002a" (hexadecimal, if linked)
GetPlayerIdentifierByType(src, "gog")          --> "12345678901234567" (decimal, if linked)

GetPlayerIdentifiers(src)
-- Example with both stores linked (either store may be absent):
--> { "open77:1111...", "name:Valerie", "fingerprint:sha256:...",
--    "license:aaaaaaaa111122223333bbbbbbbbbbbb",
--    "steam:11000010000002a", "gog:12345678901234567" }
```

`GetPlayerIdentifierByType` returns the **bare** value; `GetPlayerIdentifiers` returns the FiveM
shape, an array of `"type:value"` strings. Iterate safely with
`for _, id in ipairs(GetPlayerIdentifiers(src) or {}) do ... end`.
The array read returns `nil, "player_not_found"` for an unknown session. The typed read returns
`nil, "identifier_not_linked"` when the requested `license`, `steam` or `gog` value is unavailable.
Type names are case-insensitive; unsupported types return `nil, "unknown_identifier_type"`.

`license`, `steam` and `gog` require server runtime `2.31.13+op77.101` or later. Use `license`
as the permanent Open77 account key across linked devices; keep all identifiers as strings.
One Steam or GOG account owning both Cyberpunk 2077 and Phantom Liberty is sufficient for
admission, so do not require both store identifiers. No Discord or Xbox identifier is exposed.
See [verified account and store identifiers](connection-control.md#steam-gog-and-permanent-account-identifiers)
for the server event example, formats and ownership semantics.

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
returns: `{ open77, userId, name, fingerprint, joinedAt, license?, steam?, gog? }`, plus
`endpoint` only when `players.identity.sensitive` is held. Account and store identifiers need
no permission. Unavailable fields are omitted and read as `nil` in Lua.

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
| `txAdmin:events:healedPlayer` | `open77:admin:playerHealed(playerId, author)` | Raised by Warden's **heal** action only — see below. |

Two differences will bite a straight port. **The moderation reason is not carried**, and
`author` is a channel (`warden` or `resource`) rather than a staff name: these events reach
every resource on the server, and a host-wide event carrying either would be a moderation log
for anything that cared to listen. A script that displayed the reason must get it from its own
admin resource instead.

And **`healedPlayer` fires only for Warden's own heal**. txAdmin has it because healing is
something its panel does — and since the [Players tab](warden-players.md) grew a heal action,
Warden's panel does too, so `open77:admin:playerHealed(playerId, author)` is raised when an
operator heals from it. It is **not** raised when a resource calls `Open77.players.heal`: that
is a gameplay native any resource may call, and announcing every call of it as an administrative
act would be both a firehose and a lie. An admin resource that heals on command should publish
its own event, under its own namespace — `open77:admin:` is reserved to the platform precisely so
that "the operator's surface did this" stays a claim only the platform can make.

The full contract, including the `Open77.runtime.scheduleRestart` lever, is in
[Admin events](server-api.md#admin-events).

### Damage feedback events (client)

FiveM's `gameEventTriggered` with `CEventNetworkEntityDamage` is one firehose every combat HUD
filters. Open77 splits it into three client events, all raised from the server's authoritative
health verdict — the `PlayerHealthState` broadcast, never the shooter's local raycast — so a
hitmarker drawn from `hitConfirmed` is a hit the ledger credited:

| Event | Raised on | Arguments |
|---|---|---|
| `open77:localDamaged` | the **victim's** client, when the local player lost health | `attackerId, amount, dirX, dirY, dirZ, bodyPart, health, maxHealth` |
| `open77:hitConfirmed` | the **attacker's** client, when the server credited a hit by the local player on a *player* | `victimId, amount, bodyPart, lethal` |
| `open77:playerDamaged` | every client that has the victim's proxy — the observer feed for nameplates and kill feeds | `victimId, attackerId, amount, bodyPart, health, maxHealth` |

```lua
AddEventHandler("open77:hitConfirmed", function(victimId, amount, bodyPart, lethal)
    showHitmarker(lethal == "1")          -- a string, not a boolean
end)
AddEventHandler("open77:localDamaged", function(attackerId, amount, dirX, dirY, dirZ)
    showDamageDirection(tonumber(dirX), tonumber(dirY), tonumber(dirZ))
end)
```

Three traps, each found while building a combat HUD rather than imagined:

- **`hitConfirmed` is attacker-side and player-victim only.** It is raised from the player-health
  drain, so a hit on a server-owned NPC produces no hitmarker at all. For NPCs the shooter's client
  gets `open77:npcHit(npcId, damage, hitZ, weaponTdbId, attackKind)` instead, and a gamemode that
  credits the hit server-side emits its own marker event from there.
- **Every argument is a string**, like every engine-raised event: `lethal` arrives as `"1"` /
  `"0"`, and `amount`, `health`, `maxHealth` and the direction need `tonumber`.
- **The server event of the same name has a different list.** Server-side `open77:playerDamaged`
  carries `(victimId, attackerId, amount, attackKind, weaponTdbId, bodyPart, remainingHealth,
  maxHealth, lethal, downedHit)`; a handler copied from one side to the other reads the wrong
  column. Both lists live in [Player stats](player-stats.md#events).

### Keeping an NPC on task

Three FiveM natives keep a ped from wandering off, and each is a setting that already exists here
under another name. Nothing was built for them:

| FiveM | Open77 | What it actually does |
|---|---|---|
| `SetBlockingOfNonTemporaryEvents(ped, true)` | `Open77.npcs.setPerceptionEnabled(id, false)` | Stops autonomous stimulus acquisition, including Open77's own target seeding. It does **not** drop a target already acquired — add `Open77.npcs.setCombatEnabled(id, false)` for that. `setAIEnabled(id, false)` is the wider switch: the native agent stops too, and the NPC's simulation lease is revoked. |
| `SetPedKeepTask(ped, true)` | the task's own `timeoutMs = 0` | A task without a timeout runs until it succeeds, fails or is cancelled; the channel keeps it across ownership moves. There is no separate "keep" bit because nothing here clears a task behind a script's back. |
| `SetEntityAsMissionEntity(entity, true, true)` | `persistent = true` and `despawnWhenUnobserved = false` on `Open77.npcs.create` (and `setPersistent` on vehicles) | **Cleanup policy only**: the NPC survives its resource stopping and is not despawned when no client observes it. It is not saved anywhere — server persistence is the resource's own storage. |

The three switches are documented with their side effects in
[NPC behaviour](npc-behavior.md) and the task options in [NPCs](npcs.md#tasks).

### Porting FiveM draw calls

FiveM draws with per-frame natives — a thread that calls `DrawText` every tick keeps the text on
screen. Nothing here is per-frame: every drawing surface takes a description once and returns a
handle, and the loop goes away with the port.

| FiveM | Open77 | The difference that matters |
|---|---|---|
| `DrawText` / `SetTextFont` / `SetTextEntry` in a tick | `exports.open77_uikit:textUI({ text, position, key, icon })` | One persistent hint slot per resource (`top` / `center` / `bottom`); a second call **replaces** it; `hideTextUI` removes it. Four resources may show one at once. |
| the `DrawText3D` pattern (project a coordinate every frame, draw text at it) | `exports.open77_uikit:drawText3D({ position \| entity, text, sublabel, maxDistance, ttl })` → `updateText3D` / `clearText3D` | A native world anchor of render style `card`, projected by the host with the distance band, viewport cull and occlusion the interaction prompts already pay for. **Budgeted:** the kit refuses 8 per owner (`text3d_owner_limit`) and 24 in all (`text3d_limit`), under the anchor quota of 32 per resource / 128 global — draw the nearest eight, not one per entity. |
| `DrawMarker` | `Open77.markers.*` | A shape/style vocabulary, ground circles through `open77_groundcircle`. |
| `DrawLine`, `DrawPoly`, `DrawBox` (zone debug) | `Open77.debugDraw.set(tag, geometry)` / `clear(tag)` | Resource-owned lines and triangles under a tag, replaced atomically per call and kept until cleared; permission `world.debug`. |
| `DrawSprite`, `DrawRect` | an `<img>` or a `<div>` on a WebUI page | Screen-space art is a page; a rectangle pair every cutscene draws for bars is `exports.open77_uikit:showCinematicBars(true)`. |

`Open77.anchors` underneath can render a `card`, `ring`, `dot` or `page` at a world point when the
kit's text is not enough. The kit's own porting notes are in
[UI kit — porting a `DrawText3D` loop](ui-kit.md#porting-a-drawtext3d-loop).

### Manifest keys

A FiveM `fxmanifest.lua` ports to `open77.lua` mostly by renaming the file; the keys that carry
meaning here are handled, the rest are named once and ignored:

| FiveM key | Open77 |
|---|---|
| `exports { ... }` / `server_exports { ... }` | Accepted as-is: each side pre-registers the listed **global functions** before the resource is `Running`, through the same registration a scripted `exports()` call performs. A listed name with no global function refuses the start (`manifest_export_missing:<name>`). |
| `ui_page 'html/index.html'` | An alias of `web_ui_page`, with the same rule that the file is declared in `web_files`. When both are written, the later line wins. |
| `fx_version`, `game`, `games`, `lua54`, `use_experimental_fxv2_oal`, `author`, `description`, `provide`, `provides`, `escrow`, `escrow_ignore` | **Accepted and ignored**, and named once per start so the acceptance is never mistaken for support: `INF\|my_resource\|manifest_ignored_keys=fx_version,lua54`. |
| `client_script '@ox_lib/init.lua'` (cross-resource includes) | **Refused by name**, `cross_resource_include_refused:@ox_lib/init.lua`, at manifest parsing on both sides. Scripts run in their own VM; share code with `dependency` plus `require('@resource/module')` on the client and exports on both. |

The full manifest reference is [Server resources](server-resources.md#declarative-exports-and-ported-manifests).

## What is missing, and why

**`Citizen.CreateThreadNow` is unavailable.** Both schedulers start tasks on the next pass. Use `Citizen.CreateThread`, or call non-yielding code directly.

`Citizen.InvokeNative`, `Citizen.CreateUThread`, `Citizen.Wait` inside a non-managed coroutine, and
the `msgpack` surface are not provided: Open77 has no GTA native table to invoke, and the event
payload encoding is not msgpack.

**`RequestModel`, `HasModelLoaded`, `RequestAnimDict`, `HasAnimDictLoaded`, `SetModelAsNoLongerNeeded` and `RequestNamedPtfxAsset` are unavailable.** The server registry controls vehicle and NPC streaming. `create` returns before the client projection is attached; check whether the entity is streamed on the current client:

| A ported loop waited on | Ask instead |
|---|---|
| `RequestModel(model)` … `while not HasModelLoaded(model) do Wait(0) end` before a vehicle | `Open77.vehicles.whenStreamed(id, timeoutMs):await()` — resolves with the `get(id)` snapshot once `streamed == true`, rejects `timeout`; the state is `Open77.vehicles.get(id).streamed`, the transition is `open77:vehicleCreated` |
| the same before a ped | `Open77.npcs.whenReady(id, timeoutMs):await()` — resolves with `{ id, entity }` the instant `onNpcReady` fires (attached **and** behaving); the state is `Open77.npcs.isStreamedIn(id)`; the server has the same helper, resolved by the first client that reports the body |
| `RequestAnimDict` before `TaskPlayAnim` | nothing: `Open77.animations.play` resolves a clip from the catalogue itself |
| `RequestNamedPtfxAsset` before a particle | nothing: `Open77.vfx.*` names a curated effect and the engine owns the asset |

Delete the loop rather than emulating it: a `HasModelLoaded` that always answered `true` would
have ported code spawning a blip on an entity that is not there yet.

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
