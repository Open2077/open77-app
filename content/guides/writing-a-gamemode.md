# Writing a gamemode

A gamemode is the thing that makes your server *yours*: a set of rules, a
round structure, a scoreboard, and whatever the players are actually there
to do. On OPEN//77 it is written in Lua, as one or more
[resources](server-resources.md), and it is the server that decides
everything that matters.

Read this before you write a line. Most of what follows is not style advice
— it is platform behaviour that will otherwise cost you an evening each. All
of it is drawn from two gamemodes that exist and run: **Pursuit**, the
worked example (`resources/pursuit`, `resources/pursuit_hud`), and **Race**,
a deliberately small second mode with no roles, no teams and no fixed player
count.

## The shape of a gamemode

```text
resources/<mode>/          ONE server resource. All authority.
  open77.lua               manifest
  shared/config.lua        every tuning number
  server/main.lua          roster, state machine, the placement primitive
  server/match.lua         one round's lifecycle
  client/main.lua          presentation and intent only

resources/<mode>_hud/      separate, because a WebUI surface must be "reconnect"
  client/main.lua
  web/index.html
```

Plus whatever shared client services you consume:
[`open77_worldui`](worldui.md), [`open77_zones`](zones.md),
[`open77_interactions`](interactions.md),
[`open77_notifications`](notifications.md).

### Why the server is exactly one resource

**Server resources cannot call each other.** The server runtime installs no
`exports`, no `GetInvokingResource`, and no cross-resource event bus.
`TriggerEvent` is per-VM; only the host fans events into resources. A second
server resource could never be asked for anything.

So on the server, split by **file**, not by resource. Files inside one
resource share a Lua state:

```lua
-- server/main.lua, at the end
Pursuit = {
    players    = players,
    transition = transition,
    placeAt    = placeAt,
    ensurePlayer = ensurePlayer,
}
```

```lua
-- server/match.lua
Pursuit.placeAt(playerId, spawn.position, spawn.heading, match.bucket, "match_spawn")
```

Load order follows **manifest order**, so list `main.lua` before
`match.lua`. Within a single wildcard pattern the expansion is ordinal, so
one glob stays deterministic — but list scripts explicitly anyway, for the
reason in the next section.

> **Version note.** Manifest order has only been honoured since
> 2026-08-26. Before that the parser collected scripts into a sorted set and
> loaded them alphabetically regardless of the manifest, and the symptom was
> brutal and misleading: a later file reaching the shared global failed with
> `attempt to index a nil value (global 'Pursuit')` and the whole resource
> refused to start, because `bounds` sorts before `main`. If you ever see a
> "global is nil" error from a file that clearly runs *after* the one
> defining it, check that this has not regressed on your build.

For decoupling *inside* the resource, use a local event — same VM, so it
works:

```lua
-- main.lua: the queue announces itself and knows nothing about matchmaking
TriggerEvent("pursuit:queueChanged", #queue)

-- match.lua: matchmaking listens
AddEventHandler("pursuit:queueChanged", function(size) ... end)
```

### Why the client is many resources

The client **does** have `exports`, so the split is real and worth making.
Split on these, in order:

1. **Reload granularity.** Reloading a resource destroys every task,
   handler, marker and WebUI page its generation owned. Put anything you
   edit constantly — a lobby, a HUD — where reloading it cannot kill live
   state.
2. **Reload policy.** A WebUI surface needs `reload_policy "reconnect"`; a
   rules resource wants `"local"`. One manifest declares one policy.
3. **Least privilege.** `open77_worldui` holds `world.markers`; the gamemode
   does not. This is not ceremony — it catches real mistakes. A marker
   diagnostic written into the wrong resource failed immediately with
   `permission_denied:world.markers`.
4. **Reuse.** Anything not specific to your mode belongs in a shared
   resource.

## Eight things that will bite you

### 1. `client/**/*.lua` matches nothing

`**` requires an intermediate directory, so it never matches a flat
`client/main.lua`. The client then rejects the **entire resource set** with
`script_pattern_empty:client/**/*.lua` and nobody can connect.

List scripts explicitly, one per line. `**` is only safe for `files` and
`web_files`, where the directory nesting genuinely exists.

```lua
shared_script "shared/config.lua"
server_script "server/main.lua"
server_script "server/match.lua"
client_script "client/main.lua"
```

### 2. There is no way to list players

`Open77.players` has `name`, `identifier`, `position`, life and damage — but
no `all()` or `list()`. A resource reload gives you a fresh VM with an empty
roster while the server is still full, and `onPlayerConnected` does **not**
re-fire for players already connected.

Repopulate lazily from the next event each player produces:

```lua
local players = {}

local function ensurePlayer(playerId)
    if playerId == nil or playerId <= 0 then return nil end
    local record = players[playerId]
    if record == nil then
        record = {
            state   = "lobby",
            sinceMs = nowMs(),
            graceUntilMs = nowMs() + Config.lobby.placementGraceMs,
        }
        players[playerId] = record
    end
    return record
end
```

Call it at **every** entry point that carries a player ID: net events,
commands, lifecycle handlers.

### 3. Player IDs arrive as strings

```lua
AddEventHandler("onPlayerConnected", function(playerIdStr)
    local playerId = tonumber(playerIdStr)
    if playerId == nil or playerId <= 0 then return end
    ensurePlayer(playerId)
end)
```

Skip the `tonumber` and your table keys silently diverge from the numeric
IDs used everywhere else. (This is the opposite of the rule for *engine*
IDs, which are 64-bit, opaque, and must never go through `tonumber`. Player
session IDs are small integers and are safe.)

### 4. Move players with kill → respawn, never a transform write

A direct teleport over any real distance drops the player into unstreamed
world. The respawn transaction carries the fade, the streaming preload and
the grace window. Write one primitive and route every move through it:

```lua
local function placeAt(playerId, position, heading, bucket, reason)
    local killed, killError = Open77.players.kill(playerId, {
        cause = "script", weapon = "<mode>:" .. reason,
    })
    if not killed then return false, killError end

    return Open77.players.respawn(playerId, {
        position = position,
        heading  = heading,
        bucket   = bucket,
        health   = 1.0,
        graceMs  = 5000,
    })
end
```

Requires `players.life.kill` and `players.life.respawn`.

**Consequence:** in a mode that places players, *every placement is a
death*. If you also have a "player died" rule, it will fire on your own
spawns unless you guard it. Tag the kill and reject your own tag — and
verify the tag actually survives the round trip before trusting it.

### 5. Never judge a player mid-transition

Replicated positions are a snapshot stream. During a respawn the position is
stale, or absent entirely. Two rules follow.

Give every placement a **grace window** during which no rule evaluates that
player. Otherwise placing someone in the lobby is itself what trips the
leash that sends them there — a real bug, and a confusing one.

Distinguish "outside" from **"cannot tell"**. An unreadable position must
*freeze* accumulators, never reset them:

```lua
local inside, detail = containsPlayer(playerId, centre, radius, bucket)
if detail == "unknown" then
    -- leave the timer alone
elseif inside then
    record.outsideMs = 0
else
    record.outsideMs = record.outsideMs + tickMs
end
```

Every rule should be "held continuously for N seconds", sampled on a fixed
tick. Never decide on a single sample.

### 6. One gamemode per server

The shipped `freeroam` resource has `forceOnJoin` and `autoRespawn`, so it
answers every kill → respawn another gamemode issues by respawning the
player at *its* spawn point. The symptom is maddening: your placement
"works" and the player is somewhere else a second later.

Express the resource set with a dedicated root rather than trying to make
two modes coexist:

```jsonc
// server.jsonc
"resources": { "root": "../resources-<mode>" }
```

### 7. The life phase is spelled differently on the server

The two hosts disagree on two of the five phase strings:

| Phase | Client Lua | Server Lua |
|---|---|---|
| `RevivePending` | `revive_pending` | `revivepending` |
| `RespawnPending` | `respawn_pending` | `respawnpending` |

`alive`, `dead` and `recovering` are identical, which is precisely what
makes this quiet. The client spells the names out by hand; the server
pushes the C# enum member lowercased, which loses the word boundary.
Server-side code written from the client spelling matches `dead` in testing
and then goes blind the instant a corpse advances to `RespawnPending` —
which is exactly when a death-detection guard is supposed to be watching.

Do not compare the string when you only want to know whether a player is
down:

```lua
-- Both hosts. Resolved natively from the enum, immune to the spelling split.
if Open77.players.isDead(playerId) then ... end
```

When the phase itself matters, normalise:

```lua
local function phaseOf(life)
    return life and (life.phase or ""):gsub("_", "") or ""
end
```

`cause` goes through the same server-side lowercasing, but every cause is a
single word, so it agrees on both hosts. Phase is the only field that
diverges.

### 8. Do not touch a player until the readiness gate has opened

**The rule: do not teleport, spawn, kill or force a respawn on a player until
`Open77.ready` says they are ready.** Everything else — reading their state,
adding them to your roster, sending them a HUD payload — is unaffected.

A player who has just connected is not necessarily a player anybody may act
upon. Another resource may be about to open the character creator for someone
with no saved character. Your join path, meanwhile, fires a kill → respawn the
instant the client says its world is up — and both come from the *same* client
announcement.

This is not hypothetical: enabling the database for a ranked ladder also
switched on persistence for the appearance package, which began opening a
character creator on join while the gamemode teleported the same players to its
lobby. Both resources were individually correct and the server was unusable.
They could not have negotiated it between themselves — server resources cannot
call each other — so the barrier lives in the host.

```lua
RegisterNetEvent("<mode>:ready", function()
    local playerId = source
    local record = ensurePlayer(playerId)
    if not Open77.ready.isReady(playerId) then
        record.awaitingReady = true          -- resume on onPlayerReady
        return
    end
    joinPlacement(playerId, record)
end)

AddEventHandler("onPlayerReady", function(playerIdStr, detail)
    local playerId = tonumber(playerIdStr)   -- host events carry strings (§3)
    local record = players[playerId]
    if record == nil or record.awaitingReady ~= true then return end
    record.awaitingReady = nil
    joinPlacement(playerId, record)
end)
```

`onPlayerReady` is a barrier lifting, not a trigger — keep your own readiness
signal and ask the gate for permission. A gate can also open on a **timeout**,
with the player still in a modal and no puppet at all, and placing an
unincarnated player crashes their client: check
`Open77.players.getLifeState(playerId)` and, if it is `nil`, leave the flag set
and let their next announce do it.

If your mode is the one that needs the player — a rules acceptance, a class
pick, a spawn choice — you *hold* the gate instead. Holds, timeouts, the session
number that survives a reconnect and the `ready` console command are all in
[The join-time readiness gate](readiness-gate.md).

## Client-side patterns

### Rebuild on start, not only on `worldReady`

`open77:worldReady` fires more than once per session — **and not at all
after a hot reload**, because the world is already up. A client resource
that only builds on that event loses everything it owned on the first reload
and never recreates it. The full pattern, with teardown, is in
[Drawing in the world](world-drawing.md#rebuild-on-start-not-only-on-worldready).

### Services that others call

Ownership comes from `GetInvokingResource()`, **never** from an argument —
otherwise any resource can act as any other. Sweep callers that stopped or
reloaded:

```lua
local ownerGenerations = {}

local function caller()
    local owner = GetInvokingResource()
    local generation = GetInvokingResourceGeneration()
    if not validName(owner, 64) or type(generation) ~= "number" then
        return nil, "export_call_required"
    end
    if ownerGenerations[owner] ~= nil and ownerGenerations[owner] ~= generation then
        removeOwner(owner)
    end
    ownerGenerations[owner] = generation
    return owner
end
```

### Depending on a `reconnect` service

`open77_interactions` declares `reload_policy "reconnect"`, so **any** change
to the session's resource set restarts it, and on restart it drops every
registered entry. Things you registered with it vanish while your own state
says they exist. Watch its generation and re-register — or go through
[`open77_worldui`](worldui.md), which already does that for you.

### Do not drive world-anchored UI from the Lua tick

Anything that must sit *on* a world point — a nameplate above a player, a
prompt on a door, a label over a circle — has to be re-projected to screen
space as the camera moves. If that re-projection is driven from a Lua timer,
it will visibly lag, freeze and slide behind the camera, however tight you
make the interval.

Register the anchor once from Lua; let native code project it and deliver it
every frame. `Open77.anchors` is that mechanism, and
[Drawing in the world](world-drawing.md#world-anchors--open77anchors)
documents it in full.

## The client is never the authority

The client draws hints. The server decides.

```lua
-- client: report intent, carrying no claim about position
TriggerServerEvent("pursuit:queueIntent")
```

```lua
-- server: re-derive from replicated state
local inside, detail = containsPlayer(playerId, readyUpPosition(),
                                      Config.lobby.readyUp.radius,
                                      Config.lobby.bucket)
if not inside then
    print(("queue REFUSED for %d: %s"):format(playerId, tostring(detail)))
    return
end
```

Allow a **generous** grace on the server check — around three metres.
Replication lag means an honest player's latest snapshot may not have
landed; the check exists to stop a client claiming to be somewhere else
entirely, not to arbitrate centimetres.

## Isolating a round

Routing buckets are network dimensions. Give each match its own:

```lua
Open77.routingBuckets.setPlayer(playerId, bucket)
Open77.routingBuckets.setPopulationEnabled(bucket, false)
Open77.routingBuckets.setLockdownMode(bucket, "relaxed")
```

The low-level globals `SetPlayerRoutingBucket`,
`SetRoutingBucketPopulationEnabled` and
`SetRoutingBucketEntityLockdownMode` are equivalent; the namespaced form is
preferred.

Allocate from a reserved range, track the owner so two matches never share
one, and release on resolution. Remember to put players **back** in the
lobby bucket when the round ends.

## The conventions a mode's server should implement

There is no shared server-side kernel resource to inherit these from, and
there cannot be — see [The gamemode kernel](gamemode-kernel.md) for why.
These are conventions to copy, proven across two gamemodes.

| Convention | Why |
|---|---|
| Lazy roster adoption | A reload must not lose track of connected players. |
| `tonumber` every player ID | A raw string key silently diverges from the numeric IDs used everywhere else. |
| Guarded state transitions in one function | An invalid transition is more useful as a log line than as silent corruption. |
| Move players only through kill → respawn | A direct teleport over distance drops the player into unstreamed world. |
| Re-derive every client-reported condition | The client is never the authority. |
| Never judge a single position sample | The position is a replicated snapshot, not a live read. |
| One `<mode>.where`-style diagnostic, early | Nearly every confusing failure is answered in one line by such a command. |
| Isolate a round in its own routing bucket | Two rounds must never see each other, and neither should inherit the lobby's crowd. |

A single guarded `transition(playerId, target, detail)` that checks an
explicit table of allowed edges — and logs a refusal instead of corrupting
state — is worth writing on day one.

## Settings the server owner can retune

Every number in `shared/config.lua` is a decision you made once. Some of them
the owner of a server running your mode will want to make differently, tonight,
between rounds, without a restart.

Declare those and Warden's Tuning tab renders them as a form. Three decisions
are yours to get right:

- **Declare, do not expose.** The declaration table is data and belongs in
  `shared/config.lua`; the `Open77.tunables.declare` call is server-only. Put
  `declare` in a `shared_script` and every connecting player fails the resource
  set.
- **Read at the point of use.** The proxy reads through to the host on every
  access, so a value hoisted into a *file-scope* local is frozen at load and
  live tuning silently does nothing.
- **Decide when a change may land.** `live`, `next_round`/`next_match` with
  `promote()`, or `capture()` per match. If two rounds can run at once,
  `capture()` is the only correct answer — `promote()` is per-resource, so
  promoting at one match's creation moves the other's finish line too.

The full reference is in [Operator tunables](tunables.md).

## Testing

Test in the real game. Two habits pay for themselves.

**Add a `<mode>.where`-style diagnostic early.** Print what the *server*
sees: position, bucket, computed distance, the verdict and the reason.
Nearly every confusing failure this project has hit was answered in one line
by such a command, after being guessed at for far longer.

**Do not let the instrument change the measurement.** A probe that logged
every sample reported ~291 ms intervals; buffering the samples and logging
once showed the real figure was ~14 ms. Log writes cost frame budget.
Buffer, then log.

When you verify a connection, prove it with all three signals: the
`worldReady matched pristine transition` log line, a readable `position`,
**and** a life state of alive. A session that is merely "active" is not an
incarnation, and acting server-side on a client that is not alive can crash
it. [Autonomous agent testing](agent-testing.md) describes the tooling that
automates this.

## Scaffolding

The platform repository ships a generator that emits a correct-by-
construction starting point:

```powershell
pwsh -File .\scripts\new-resource.ps1 -Name <mode>     -Kind gamemode
pwsh -File .\scripts\new-resource.ps1 -Name <mode>_hud -Kind hud
pwsh -File .\scripts\new-resource.ps1 -Name <name>     -Kind service
```

It produces correct manifests (explicit script lists, minimal permissions),
the right lifecycle event names, string-safe player IDs, and the service
ownership guard above. On the server, **code generation is the sharing
mechanism**: since server resources cannot link to each other at runtime,
the scaffolder is how a common pattern reaches your resource.

Both `pursuit` and `race` began this way and then diverged, which is what a
generated starting point is for.

## See also

- [The gamemode kernel](gamemode-kernel.md) — why there is no shared
  server-side gamemode resource, and what you get instead.
- [The join-time readiness gate](readiness-gate.md) — holds, timeouts and
  the session number.
- [Operator tunables](tunables.md) — declaring what an owner may retune.
- [Drawing in the world](world-drawing.md) — markers, anchors, POIs, zones
  and nameplates.
- [The Lua resource runtime](resource-runtime.md) — manifests, the
  scheduler, events, exports, WebUI and the sandbox quotas.
- [Complete server Lua API](server-api.md) — every server global, namespace,
  permission and result shape.
- [Commands and ACL](server-acl.md) — putting an admin command behind a
  permission.
