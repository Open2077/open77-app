# Connection control: connect events, whitelists and bans

Everything a server resource can do about *who* plays. Watch connections arrive, hold a player at
the door while a list or a database answers, refuse them with a sentence they read on their own
screen, learn why any connection was refused or dropped, and remove or ban a player who is already
in. [Complete server Lua API](server-api.md#connection-control) has the one-line reference for
each function; this page is the guide, ending with a whitelist and a ban list you can copy.

## Where the gate sits

A connection goes through these stages in order. Resources take part in the stages in bold.

1. The transport connects. Nothing is known about the player.
2. The client sends its hello: protocol, game build, display name, identity public key with a
   proof, and a Master connect ticket when it has one.
3. The server checks the platform facts: protocol and build, identity proof against its Master
   key, connect ticket when the server requires one, identity key stability, capacity. A failure
   here is a refusal resources are told about (**`onPlayerRejected`**) but cannot influence.
4. The server's own door list, `access.json` next to `server.jsonc`: a ban, or a closed whitelist
   the identity is not on, refuses here with the list's sentence. Warden, the console and
   `Open77.access` all edit the same list. See [The built-in door list](#the-built-in-door-list).
5. **`onPlayerConnecting`**, the resource gate. Every running resource that holds the
   `players.gate` permission and registered a handler is asked. Refuse, hold, or let through.
6. The player is admitted: welcome packet, player id, **`onPlayerConnected(playerId)`**.
7. The join-time readiness gate (`Open77.ready`) and **`onPlayerReady`**. That gate decides *when a
   resource may act on* an admitted player; this page is about *whether* they get in. See
   [Join-time readiness gate](server-api.md#join-time-readiness-gate).
8. The session ends: **`onPlayerDisconnected(playerId, reason)`**.

The gate lives in Lua rather than in configuration because the questions it answers belong to the
server's operator: who is on the list tonight, is this account banned until Sunday, is this slot
reserved. The host owns the mechanics (the deadline, combining several resources' answers, what the
player sees) so a resource only has to say yes or no.

## `onPlayerConnecting(player, deferrals)`

```lua
-- open77.lua
permissions { "players.gate" }
```

```lua
-- server/main.lua
AddEventHandler("onPlayerConnecting", function(player, deferrals)
    if player.name == "Mallory" then
        deferrals.done("You are not welcome here, Mallory.")
    end
end)
```

A handler that returns without deferring accepts the player. `deferrals.done("message")` refuses:
the connection is closed and the shell shows exactly that message as the reason.

### The `player` table

The player has no player id yet, so `Open77.players.*` cannot be used on them. What is known:

| Field | Type | Meaning |
|---|---|---|
| `userId` | string | The account id the Master issued, a GUID. Stable across renames and reinstalls of the same identity file: the key to use for a whitelist or a ban list. Verified by the identity proof before the gate runs. |
| `name` | string | The display name the client presents. The player can change it, so match on it for convenience, never for security. |
| `publicKey` | string | The identity public key, base64. |
| `fingerprint` | string | `sha256:<hex>` of the public key. The client console prints the same string for `identity.dump`, so a player can read it to an operator over voice. |
| `ticket` | boolean | Whether a Master connect ticket was presented and verified. |

### Deferrals

| Call | Effect |
|---|---|
| `deferrals.defer()` | Hold the player. For an answer that is not immediate: a database row, an HTTP call, a file. |
| `deferrals.update(message)` | Note progress. Written to the server log as `connecting '<name>': <message>`. The handshake has no progress channel, so the player does not see it. |
| `deferrals.done()` | Release your hold. When every handler in every participating resource has released, the player is admitted. |
| `deferrals.done(message)` | Refuse. The player is disconnected with `message` on their screen. One refusal is final, whatever the other resources say. |

`message` is trimmed to 127 bytes of UTF-8 and stripped of control characters. An empty message
becomes `Connection refused by the server.`

An asynchronous check against the database:

```lua
AddEventHandler("onPlayerConnecting", function(player, deferrals)
    deferrals.defer()
    deferrals.update("looking up the ban list")
    Open77.database.single(
        "SELECT reason FROM bans WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())",
        { player.userId },
        function(row)
            if row then
                deferrals.done("Banned: " .. row.reason)
            else
                deferrals.done()
            end
        end)
end)
```

### The rules the host enforces

| Rule | Detail |
|---|---|
| Permission | Only resources whose manifest lists `players.gate` take part. A resource with a handler and no permission is skipped, with one `WRN`: `onPlayerConnecting handler ignored: the manifest lacks the players.gate permission`. |
| Timing | Handlers run on the resource's next tick, never inside the network code. |
| Combination | Inside one resource, every handler must accept. Across resources, every participating resource must accept. The first refusal wins and nobody else is waited for. |
| Deadline | `simulation.connectGateTimeoutSeconds` in `server.jsonc`, default 8, allowed 0.5 to 9. The client abandons the handshake after 10 seconds, so a longer wait would only trade one error for another. At the deadline the player is refused with `connection_gate_timeout`. |
| Errors | A handler that throws is logged as `onPlayerConnecting handler error: ...` and counts as an acceptance, so a broken script cannot lock every player out. Where refusing is the safe default, catch the error yourself: see [Fail closed](#fail-closed). |
| Stop and reload | A resource that stops while holding players releases them. |
| Meanwhile | Packets the client sends while held are ignored. A player who drops while held is forgotten; a late `done()` is harmless. |
| Nobody listening | When no permitted resource has a handler the gate costs nothing and the player is admitted on the spot. |

## `onPlayerRejected(userId, name, code, message)`

Emitted into every running resource, no permission needed, for every connection refused once its
hello was read, whether by the platform checks or by a gate. Use it for audit logs, rate limits, or
telling an admin who keeps knocking.

| Argument | Meaning |
|---|---|
| `userId`, `name` | Taken from the hello. Empty strings when the hello itself could not be read. For `identity_proof_invalid` they are what the client claimed and could not prove. |
| `code` | The reject reason, lowercased: `protocolmismatch`, `gamebuildmismatch`, `invalidhello`, `serverfull`, `duplicatehello`, `refused`. |
| `message` | For `refused`, the gate's own text or `connection_gate_timeout`. Otherwise a machine token: `expected_game_build:<build>`, `identity_proof_invalid`, `connect_ticket_required`, `connect_ticket_invalid`, `identity_key_changed`, `server_full`, `duplicate_client_hello`, `client_hello_required`. |

```lua
local knocks = {}
AddEventHandler("onPlayerRejected", function(userId, name, code, message)
    if code ~= "refused" then return end
    knocks[userId] = (knocks[userId] or 0) + 1
    if knocks[userId] == 5 then
        print(("%s (%s) has been refused 5 times: %s"):format(name, userId, message))
    end
end)
```

## `onPlayerDisconnected(playerId, reason)`

The event every resource already knew now carries the reason. `playerId` arrives as a string, like
every host event. `reason` is `connection_closed` when the transport dropped or the player quit,
otherwise the text the disconnect was queued with by `Open77.players.disconnect`, `kick` or `ban`.

```lua
AddEventHandler("onPlayerDisconnected", function(playerId, reason)
    print(("player %s left: %s"):format(playerId, reason))
end)
```

## Reading an admitted player's identity

`Open77.players.identity(playerId)` (alias `GetPlayerIdentity`) returns
`{ userId, name, publicKey, fingerprint, joinedAt }` for an admitted player, or `nil`. `joinedAt`
is ISO 8601 UTC. No permission is needed. It is how a `ban <playerId>` command turns the short
session id an admin sees into the durable `userId` a ban list must store.

`Open77.players.identifier(playerId)` and `Open77.players.name(playerId)` remain the short forms.

## Removing and banning players who are in

| Function | Permission | Effect |
|---|---|---|
| `Open77.players.disconnect(playerId, reason?)`, alias `kick` | `players.disconnect` | Closes the session. The reason is shown to the player and delivered to `onPlayerDisconnected`. |
| `Open77.players.ban(playerId, reason?, durationSeconds?)` | `players.ban` | Records a device ban for this server at the Master and disconnects now. Enforced at the identity stage on the next connect, so it holds with no resource running. |

Use the Master ban for hard bans. Use your own list, as below, for anything you want to edit,
expire, explain, or share between servers you run. Details and error codes are in
[Disconnecting and banning a player](server-api.md#disconnecting-and-banning-a-player).

## Wall clock

The server sandbox has no `os` library, and `GetGameTimer` and `Open77.time.monotonic` restart with
the process. For a ban that expires on Sunday:

| Function | Result |
|---|---|
| `Open77.time.unix()`, alias `GetUnixTime` | Seconds since 1970-01-01 UTC, fractional. |
| `Open77.time.utc()`, alias `GetUtcTimestamp` | The same instant as an ISO 8601 string, for logs and files. |

## The built-in door list

Most servers need no code for this: the server keeps its own whitelist and ban list in
`access.json` next to `server.jsonc`, enforced before the resource gate and with no resource
running. Every entry is keyed on the Master `userId` and remembers who added it and when.

**Warden**: the *Whitelist & bans* tab (permissions `access.view` to see, `access.edit` to change)
switches the whitelist, lists and removes identities, bans with a reason and a duration, lifts bans,
and shows the recent refusals with the sentence each player saw, each with *Allow* and *Ban*
buttons. The *Players* tab gains an *Allow* button per row, so a guest can be let in without
leaving the table. Bans from this tab disconnect the player at once if they are online; they are
local to this server, unlike `Open77.players.ban`, which records a device ban at the Master.

**Console** (also from Warden's live console):

```
whitelist                          state and listed identities
whitelist.on | whitelist.off
whitelist.add <userId> [label]
whitelist.remove <userId>
bans                               active bans
ban.id <userId> [seconds|0] [reason]
unban <userId>
```

**Lua**, with the manifest permission `players.access`, through `Open77.access`:

| Function | Result |
|---|---|
| `status()` | `{ whitelistEnabled, whitelist = { { userId, label, addedAt, addedBy } }, bans = { { userId, name, reason, bannedAt, expiresAt?, bannedBy } } }` |
| `setWhitelist(enabled)` | `true` |
| `allow(userId, label?)`, `disallow(userId)` | `true`; `disallow` returns `false` when the identity was not listed |
| `isAllowed(userId)`, `isBanned(userId)` | boolean |
| `ban(userId, reason?, seconds?, name?)` | `true`; nil or `0` seconds is permanent; disconnects the player if online |
| `unban(userId)` | `true`, or `false` when there was no ban |

Every call returns `false, reason` on failure: `permission_denied:players.access`,
`invalid_user_id`, `access_unavailable`. Entries written from Lua carry `resource:<name>` as their
author, so Warden shows which script let someone in.

```lua
-- A command that bans the speaker's target on the built-in list for a day.
RegisterCommand("dayban", function(_, args)
    local identity = Open77.players.identity(tonumber(args[1]) or 0)
    if not identity then print("usage: dayban <playerId> [reason]") return end
    Open77.access.ban(identity.userId, args[2] or "one day off", 86400, identity.name)
end, true)
```

The two worked examples below build the same thing by hand, for a server that wants its own rules,
its own storage, or its own wording.

## Worked example: a whitelist

```lua
-- open77.lua
resource "my_whitelist"
version "1.0.0"
auto_start true
server_script "server/main.lua"
permissions { "players.gate", "filesystem.read", "filesystem.write" }
```

```lua
-- server/main.lua
local FILE = "whitelist.json"                      -- lives in this resource's data/ folder
local list = Open77.io.readJson(FILE) or { users = {} }

local function save()
    local ok, err = Open77.io.writeJson(FILE, list)
    if not ok then print("whitelist: cannot save: " .. tostring(err)) end
end

AddEventHandler("onPlayerConnecting", function(player, deferrals)
    if list.users[player.userId] then return end   -- on the list: accepted
    deferrals.done(("This server is private. Ask an admin to add %s."):format(player.userId))
end)

RegisterCommand("whitelist.add", function(_, args)
    local id, label = args[1], args[2] or "?"
    if not id then print("usage: whitelist.add <userId> [label]") return end
    list.users[id] = label
    save()
    print(("whitelist: added %s (%s)"):format(id, label))
end, true)

RegisterCommand("whitelist.remove", function(_, args)
    if args[1] and list.users[args[1]] then
        list.users[args[1]] = nil
        save()
        print("whitelist: removed " .. args[1])
    end
end, true)
```

The `true` after each command keeps it restricted to the console and to ACL-listed admins. A
player finds their own id with `identity.dump` in the client console; an admin also reads it from
the refusal line the server logs, or from `onPlayerRejected`.

## Worked example: a ban list with expiry

```lua
permissions { "players.gate", "players.disconnect", "filesystem.read", "filesystem.write" }
```

```lua
local FILE = "bans.json"
local bans = Open77.io.readJson(FILE) or {}        -- [userId] = { name, reason, expires }; expires 0 = permanent

local function save() Open77.io.writeJson(FILE, bans) end

local function activeBan(userId)
    local ban = bans[userId]
    if not ban then return nil end
    if ban.expires ~= 0 and ban.expires <= Open77.time.unix() then
        bans[userId] = nil                         -- served its time
        save()
        return nil
    end
    return ban
end

AddEventHandler("onPlayerConnecting", function(player, deferrals)
    local ban = activeBan(player.userId)
    if not ban then return end
    local left = "permanently"
    if ban.expires ~= 0 then
        left = ("for %d more minutes"):format(math.ceil((ban.expires - Open77.time.unix()) / 60))
    end
    deferrals.done(("Banned %s: %s"):format(left, ban.reason))
end)

-- ban <playerId> [minutes|0] [reason...]
RegisterCommand("ban", function(_, args)
    local playerId = tonumber(args[1])
    local identity = playerId and Open77.players.identity(playerId)
    if not identity then print("usage: ban <playerId> [minutes|0] [reason]") return end
    local minutes = tonumber(args[2]) or 0
    local reason = args.n >= 3 and table.concat(args, " ", 3, args.n) or "banned by an admin"
    bans[identity.userId] = {
        name = identity.name, reason = reason,
        expires = minutes > 0 and (Open77.time.unix() + minutes * 60) or 0,
    }
    save()
    Open77.players.disconnect(playerId, "Banned: " .. reason)
end, true)

RegisterCommand("unban", function(_, args)
    if args[1] and bans[args[1]] then
        bans[args[1]] = nil
        save()
        print("unbanned " .. args[1])
    end
end, true)
```

The shipped resource `resources/dev/open77_gatekeeper` combines both examples with a whitelist
switch, a `gate.list` command and audit lines from `onPlayerRejected` and `onPlayerDisconnected`.
It does not start by itself: `ensure open77_gatekeeper` at the server console.

## Fail closed

The host admits a player whose handler crashed, because a typo in one script must not empty the
server. A gate whose safe default is to refuse wraps its own check:

```lua
local function check(player)
    -- return nil to admit, or the sentence the player should read
    if not list.users[player.userId] then return "This server is private." end
end

AddEventHandler("onPlayerConnecting", function(player, deferrals)
    deferrals.defer()
    local ok, verdict = pcall(check, player)
    if not ok then
        print("gate error: " .. tostring(verdict))
        deferrals.done("The server cannot verify your access right now. Try again in a minute.")
    else
        deferrals.done(verdict)                    -- nil admits, a string refuses
    end
end)
```

## Operator notes

- `server.jsonc`: `"simulation": { "connectGateTimeoutSeconds": 8 }`.
- Every refusal is logged at `INF` as `Player '<name>' (<userId>) refused (<Reason>): <message>`.
  Progress notes appear as `connecting '<name>': <message>` under the resource that wrote them.
- Key lists on `userId`. A display name is chosen by the player.
- Keep the list in the resource's `data/` folder through `Open77.io`, or in the database through
  `Open77.database`; both survive `ensure` and restarts. A Lua table alone does not.
- The gate runs on every connect, including reconnects after a crash, so keep the check cheap or
  deferred.

## Troubleshooting

| Symptom | Cause |
|---|---|
| The handler never runs | The manifest lacks `players.gate` (look for the `WRN`), the resource is not running, or the handler was registered with `RegisterNetEvent` instead of `AddEventHandler`. |
| Everyone is refused with `connection_gate_timeout` | A code path calls `defer()` and never reaches `done()`, for example a database callback that never fires. Every branch after `defer()` must end in `done`. |
| The player sees `Connection refused by the server.` | `done()` was given an empty string or a non-string value. |
| The message is cut short | 127 bytes of UTF-8. |
| A ban by name stopped working | The player renamed themselves. Ban by `userId`. |

## API summary

| Name | Permission | Signature |
|---|---|---|
| `onPlayerConnecting` (event) | `players.gate` | `(player, deferrals)` |
| `deferrals.defer` / `update` / `done` | via the event | `()` / `(message)` / `(message?)` |
| `onPlayerRejected` (event) | None | `(userId, name, code, message)` |
| `onPlayerConnected` (event) | None | `(playerId)` |
| `onPlayerDisconnected` (event) | None | `(playerId, reason)` |
| `Open77.players.identity` / `GetPlayerIdentity` | None | `(playerId) -> { userId, name, publicKey, fingerprint, joinedAt }` or `nil` |
| `Open77.players.identifier` / `name` | None | `(playerId)` |
| `Open77.players.disconnect` / `kick` | `players.disconnect` | `(playerId, reason?)` |
| `Open77.players.ban` | `players.ban` | `(playerId, reason?, durationSeconds?)` |
| `Open77.access.status` / `setWhitelist` / `allow` / `disallow` / `isAllowed` / `isBanned` / `ban` / `unban` | `players.access` | the built-in door list, see above |
| `Open77.time.unix` / `GetUnixTime` | None | `() -> seconds` |
| `Open77.time.utc` / `GetUtcTimestamp` | None | `() -> ISO 8601 string` |
| `simulation.connectGateTimeoutSeconds` (config) | | default 8, range 0.5 to 9 |
