# Preflight in Lua

One server resource decides the launcher's **Server check**: who may start the game, what they see
first, and what a refused player reads. This page is its API: the owner declaration, the events,
the session object, the door-list functions it works with, and recipes to copy.

Read [Connection preflight](connection-preflight.md) first for the flow and the configuration, and
[Building preflight screens](preflight-screens.md) for the markup. Everything here runs on the
server; the launcher only renders what you send.

## The owning resource

Exactly one resource owns preflight: the one named by `preflight.resource` in `server.jsonc`
(`open77_preflight` when the key is absent). Any other resource that calls `Open77.preflight.*`
gets `false, "not_preflight_resource"` and never receives the preflight events.

```jsonc
// server.jsonc -- read at start: restart the server once after changing it
"preflight": {
  "resource": "my_welcome"
}
```

```lua
-- resources/my_welcome/open77.lua
resource "my_welcome"
version "1.0.0"
server_script "server/main.lua"

permissions {
    "players.preflight",   -- required: own the server check
    "players.access",      -- optional: read and edit the door list, hear onAccessChanged
}

-- Optional: images the launcher may fetch (png, jpeg, webp; public).
preflight_files { "ui/logo.png" }
```

```lua
-- resources/my_welcome/server/main.lua
AddEventHandler("onPreflight", function(session)
    if session.player.name:lower():find("admin") then
        session:refuse("Pick another name: 'admin' is reserved for the staff.", { code = "name_reserved" })
        return
    end
    session:allow("Welcome, " .. session.player.name .. ".")
end)
```

| Manifest line | Meaning |
|---|---|
| `permissions { "players.preflight" }` | Required. Without it `Open77.preflight` answers `false, "permission_denied:players.preflight"` and every player the door list admits is allowed. |
| `players.access` | `Open77.access` (the door list) and the `onAccessChanged` event. |
| `players.identity.sensitive` | Adds `session.endpoint`, the source IP address. |
| `preflight_files { ... }` | Images served at `/preflight/v1/assets/<path>` and used as `src="asset:<path>"`. Glob patterns work. Public: anyone can fetch them. `.rml` documents are not listed here. |

**Hot reload.** `ensure my_welcome` restarts the resource with your new Lua and `.rml` files; no
server restart. While it is down, and whenever it stops, its undecided checks are **allowed**
(end reason `resource_stopped`), its welcome screen and files are withdrawn, and new checks are
decided by the door list alone. A restarted VM starts empty: rebuild anything you need from a
store, not from memory.

**Other resources** learn the outcome at the in-game gate from `player.preflight` (see
[At the in-game gate](#at-the-in-game-gate)) and can use the
[exports of open77_preflight](#exports-of-open77_preflight).

## Lifecycle of a check

```text
launcher opens a session
        |
        v
  door list refuses? --yes--> onPreflightRefused(session, code, message, details)
        |                          present it: refuse(..., { view }) or show + hold (form)
        no                         the door changes (unban, approval) --> onPreflight
        |
        v
  onPreflight(session)        phase "checking"
        |  status / show / data       (decisionSeconds deadline: fail open = allowed)
        |  hold()             phase "interactive" (no deadline, only sessionSeconds)
        |  onPreflightEvent / session:on   <-- buttons and Enter from the launcher
        v
  allow(message?)  --> phase "allowed"  --> onPreflightEnd(session, "allowed")
  refuse(message)  --> phase "refused"  --> onPreflightEnd(session, "refused")
  close() / lifetime / player cancels / new check / resource stops
                   --> onPreflightEnd(session, "expired" | "cancelled" | "replaced" | "resource_stopped")
        |
        v
  player finishes the in-game handshake --> onPreflightJoined(session, playerId)
```

## Events

Handlers run on the scheduler: they may `Wait()`, call a database or an HTTP API. These five
names, and `onAccessChanged`, are reserved: no resource can raise them with `TriggerEvent`.

| Event | Arguments | When |
|---|---|---|
| `onPreflight` | `(session)` | A launcher opened a check and the door list admits the player. Also raised again, on the same `session` object, when a player the door list refused is admitted while their check is open (an unban, an approval). |
| `onPreflightRefused` | `(session, code, message, details)` | The door list refuses the player. `code` is `banned` or `not_whitelisted`, `message` the handshake's sentence. Raised again when the refusal changes (a request filed or answered, a ban on an open check). Present it; you cannot overrule it. |
| `onPreflightEvent` | `(session, name, data, inputs)` | The player pressed a button or Enter. `name` is the event name from the markup, `data = { args = { ... } }` or `nil`, `inputs` maps each input `id` to its value (string, or boolean for a checkbox). |
| `onPreflightEnd` | `(session, reason)` | The check is over: `allowed`, `refused`, `cancelled` (the player closed the screen), `expired` (lifetime, or `session:close()`), `replaced` (the same account started a new check) or `resource_stopped`. |
| `onPreflightJoined` | `(session, playerId)` | The player who passed this check finished the in-game handshake. Once per check. |
| `onAccessChanged` | `(userId, change, actor)` | The door list changed (needs `players.access`). See [The door list from Lua](#the-door-list-from-lua). |

`details` of `onPreflightRefused`:

| `code` | `details` |
|---|---|
| `banned` | `{ reason, permanent, expiresText?, expiresAt?, expiresAtUnix?, bannedAt, bannedAtUnix, bannedBy }`. `expiresText` reads like `2026-11-20 18:00 UTC`. |
| `not_whitelisted` | `{ whitelist = true, request? }`. `request = { status = "pending" \| "denied", message, note, requestedAt, requestedAtUnix }` when the player already applied. |

## The session

A plain Lua table with methods, one per check. `session.id` is a string you can use as a table key.
The table stays the same for the whole check, including when it goes from
`onPreflightRefused` to `onPreflight`.

| Field | Meaning |
|---|---|
| `session.id` | Opaque id of the check (not the launcher's secret token). |
| `session.createdAt` | Unix seconds. |
| `session.phase` | `checking`, `interactive`, `allowed`, `refused` or `expired`. Kept up to date by the host. |
| `session.player.userId` | The Master account id (GUID string), **verified** by the identity proof. The key for any list. |
| `session.player.name` | The display name the Master certified for this identity. |
| `session.player.publicKey`, `.fingerprint` | The identity public key (base64) and `sha256:<hex>` of it. |
| `session.player.ticket` | `true` when the launcher sent a Master connect ticket and it verified. |
| `session.player.license`, `.steam`, `.gog`, `.epic`, `.discord` | Verified identifiers from the ticket, as strings; each present only when the account has it. `discord` is the linked Discord user id (a decimal string). See [Connection control](connection-control.md#the-player-table). |
| `session.launcher` | `{ version, platform, locale, capabilities }`, for example `{ version = "0.2.21", platform = "windows", locale = "en", capabilities = { views = true, events = true, assets = true, inputs = true } }`. Reported by the launcher, **not verified**: adapt a screen with it, never trust it. |
| `session.server` | `{ name, description, players, maxPlayers, whitelist }` when the check opened. `Open77.preflight.server()` gives the live values. |
| `session.door` | `{ code, message, details }` while the door list refuses this player, else `nil`. |
| `session.endpoint` | The source IP address, only with `players.identity.sensitive`. |

| Method | Effect |
|---|---|
| `session:status(text [, progress])` | A status line under the launcher's "Server check" stage, cut at 200 characters, and an optional progress from 0 to 1. `session:status(nil)` clears it. |
| `session:show(view)` | Shows a screen. `view` is an RML string, `{ document = "<rml>...", data = { ... } }` or `{ file = "ui/rules.rml", data = { ... } }` (a file of your resource, read each time; no filesystem permission needed). |
| `session:data(patch)` | Merges `patch` into the screen's data (top-level keys replaced, others kept). `false, "no_view"` when nothing is shown. |
| `session:hide()` | Removes the screen. |
| `session:hold()` | Waits for the player: phase `interactive`, no decision deadline (only `sessionSeconds`). |
| `session:allow([message])` | Allows the player. The message (600 characters at most) is shown on the launcher's progress and connection screens. Final. `false, "door_refused"` while the door list refuses the player. |
| `session:refuse(message [, { code = "...", view = view }])` | Refuses with your sentence (600 characters at most). `code`: a short machine word for your logs (`[A-Za-z0-9_.:-]`, 64 at most, default `refused`); for a door-list refusal leave it out to keep `banned` or `not_whitelisted`. `view`: a refusal page shown under the message. Final. |
| `session:on(name, fn(data, inputs))` | A handler for one event name on this check only, in addition to `onPreflightEvent`. Registering twice runs both. |
| `session:close()` | Ends the check now. Undecided: the launcher shows "The server check expired" with Retry (reason `expired`). Decided: frees it early. |
| `session:alive()` | `true` while the phase is `checking` or `interactive`. |

Every method returns `true`, or `false, reason` and changes nothing; none raises. Reasons:
`session_ended` (already decided), `session_not_found`, `door_refused`, `no_view`,
`document_empty`, `document_too_large`, `document_invalid:line N, column M`,
`document_root_must_be_rml`, `document_too_deep`, `invalid_view`, `invalid_view_file`,
`view_file_not_found`, `view_file_unreadable`, `data_too_large`,
`data_must_be_a_table_with_string_keys`, `invalid_handler`.

Handlers registered with `session:on` are dropped when the check moves between
`onPreflightRefused` and `onPreflight`: register them again with the new screen.

## Module functions

| Function | Returns | Purpose |
|---|---|---|
| `Open77.preflight.welcome(view \| nil)` | `true` or `false, reason` | Sets or clears the anonymous screen on the server's page (sent in hello). No player is known: links work, buttons send nothing. |
| `Open77.preflight.sessions()` | array of sessions | The live checks (`checking` or `interactive`). |
| `Open77.preflight.get(id)` | session or `nil` | One check by `session.id`. |
| `Open77.preflight.find(userId)` | session or `nil` | The live check of an account. |
| `Open77.preflight.broadcast(patch)` | count | `session:data(patch)` on every live check that shows a screen. |
| `Open77.preflight.passed(userId)` | `{ at, age, sessionId }` or `nil` | Whether this account was allowed within `passSeconds`. |
| `Open77.preflight.status()` | table | `{ enabled, resource, required, passSeconds, sessionSeconds, decisionSeconds, sessions, interactive, passes, files, counters = { opened, allowed, refused, expired, cancelled, replaced, failedOpen } }` |
| `Open77.preflight.server()` | table or `nil` | `{ name, description, players, maxPlayers, whitelist }` right now. |

Each one returns `false, reason` to a resource that is not the owner (`not_preflight_resource`),
lacks the permission (`permission_denied:players.preflight`) or runs on a server with preflight
disabled (`preflight_unavailable`).

## Fail open

Preflight never refuses a player by accident.

| Situation | Outcome |
|---|---|
| No owning resource, or it is stopped, or it lacks `players.preflight` | Allowed once the door list admits the player. |
| The door list refuses the player, whatever the resource does or fails to do | **Refused.** A door-list refusal is never failed open. |
| The resource has no `onPreflight` handler | Allowed at once. |
| An `onPreflight` handler raises an error | Logged; the player is allowed at once. |
| Nothing decided within `decisionSeconds` (default 15) | Allowed, with `preflight: no decision for '<name>' in 15s; allowed (fail open)` in the log. If a screen is shown or `session:hold()` was called, the check becomes `interactive` instead and waits for the player. |
| The resource stops while checks are open | They are allowed (`resource_stopped`). |
| An `onPreflightEvent` or `session:on` handler raises an error | Logged; **the check stays as it was**. Player input must never open the door through an error. |
| An `onPreflightRefused` handler raises an error, stays silent for `decisionSeconds` without a screen or `hold()`, or its resource stops | The plain refusal. |

Call `session:hold()` whenever you wait for the player, and decide in every branch. If a check must
hold even when your script is broken, enforce it again in `onPlayerConnecting`
([At the in-game gate](#at-the-in-game-gate)).

## The door list from Lua

Bans and the whitelist live in the server's door list (`access.json`), shared with Warden and the
console; see [Connection control](connection-control.md#the-built-in-door-list). With
`players.access`, `Open77.access` reads and edits it:

| Function | Result |
|---|---|
| `status()` | `{ whitelistEnabled, whitelist = { ... }, bans = { ... }, requests = { ... } }` |
| `setWhitelist(enabled, actor?)` | `true` |
| `allow(userId, label?, actor?)`, `disallow(userId, actor?)` | `true`; `disallow` returns `false` when the identity was not listed |
| `isAllowed(userId)`, `isBanned(userId)` | boolean |
| `ban(userId, reason?, seconds?, name?, actor?)` | `true`; `seconds` nil or `0` is permanent; disconnects the player if online |
| `unban(userId, actor?)` | `true`, or `false` when there was no ban |
| `getBan(userId)` | `{ userId, name, reason, bannedBy, bannedAt, bannedAtUnix, expiresAt?, expiresAtUnix?, permanent }` or `nil` |
| `getEntry(userId)` | The whitelist entry `{ userId, label, addedAt, addedBy }` or `nil` |
| `refusal(userId)` | `nil` when the identity may come in, else `{ code = "banned" \| "not_whitelisted", message }` |
| `refusals()` | Recent refused connections (Warden's *Refused*, 50 at most, newest first): `{ { userId, name, code, message, at, atUnix } }`. Covers the launcher's check and the handshake. |
| `requests("pending"?)`, `getRequest(userId)` | Whitelist requests: `{ userId, name, message, status = "pending" \| "denied", requestedAt, requestedAtUnix, source, note, decidedBy?, decidedAt? }` |
| `request(userId, name?, message?, actor?)` | Files or renews a request (message cut at 300 characters). `false, "already_allowed"`, `"banned"` or `"requests_full"` (500 pending). |
| `approve(userId, label?, actor?)` | Whitelists the identity and removes the request. `false, "request_not_found"` or `"request_not_pending"`. |
| `deny(userId, note?, actor?)` | Keeps the request as `denied` with a note the player reads. |
| `forgetRequest(userId, actor?)` | Removes a request, pending or denied; `true` when there was one. |

Every function returns `false, reason` on failure (`permission_denied:players.access`,
`invalid_user_id`, `access_unavailable`, `access_persistence_failed`, `ban_persistence_failed`).
Entries are recorded as `resource:<name>`; the optional `actor` is appended
(`resource:<name>/<actor>`) and never replaces it.

**`onAccessChanged(userId, change, actor)`** reaches every resource with `players.access`, on the
tick after the change. `change` is `ban`, `unban`, `ban_expired`, `allow`, `disallow`,
`whitelist_on`, `whitelist_off`, `request`, `request_approved`, `request_denied` or
`request_removed`; `userId` is empty for the whitelist switch; `actor` is `warden:<user>`,
`console`, `resource:<name>` or empty for an expiry.

You do not need `onAccessChanged` to update open checks: when the list changes, the server asks it
again for every open check and raises `onPreflightRefused` or `onPreflight` itself.

## At the in-game gate

Every resource with `players.gate` sees the outcome in `onPlayerConnecting`:

| `player` field | Meaning |
|---|---|
| `player.preflight` | `true` when a check of this account was allowed within `passSeconds`. `false` for a launcher without the server check, or when preflight is disabled. |
| `player.license`, `steam`, `gog`, `epic`, `discord` | The same verified identifiers, from the join's own connect ticket. |

The owning resource can also call `Open77.preflight.passed(userId)` at any time.

```lua
-- Any resource with permissions { "players.gate" }: insist on the launcher's check, except for staff.
local STAFF = { ["00000000-0000-0000-0000-000000000000"] = true }

AddEventHandler("onPlayerConnecting", function(player, deferrals)
    if not player.preflight and not STAFF[player.userId] then
        deferrals.done("Join this server from the OPEN//77 launcher (0.2.21 or later).")
    end
end)
```

`preflight.required: true` in `server.jsonc` does the same for everybody, without exceptions.

## Recipes

Each recipe is a complete `server/main.lua` for an owning resource with the permissions named in
its comment. Screens are inline strings to keep each recipe in one file; move them to `.rml` files
for real use.

### Whitelist with an application form

Players the whitelist refuses apply from the launcher; the staff approve in Warden or with
`whitelist.approve <userId>`, and a player who kept the window open goes straight in.
Permissions: `players.preflight`, `players.access`.

```lua
local FORM = [[
<rml>
  <head><title>Whitelist application</title></head>
  <body>
    <div data-if="pending" class="panel">
      <p class="accent">Your application is with the staff.</p>
      <p>Keep this window open: you are let in as soon as it is approved.</p>
    </div>
    <div data-if="!pending" class="panel" data-event-submit="apply">
      <p>Tell the staff who you are and how you found the server.</p>
      <input id="application" type="text" maxlength="300" placeholder="Your application"/>
      <p class="danger" data-if="error">{{ error }}</p>
      <div class="row gap-8">
        <button data-event-click="apply">Send my application</button>
      </div>
    </div>
    <p class="muted">Your player id: <span class="mono">{{ userId }}</span></p>
  </body>
</rml>]]

AddEventHandler("onPreflightRefused", function(session, code, message, details)
    if code ~= "not_whitelisted" then
        session:refuse(message)          -- a ban: the server's plain sentence
        return
    end
    local request = details.request
    session:show({ document = FORM, data = {
        pending = request ~= nil and request.status == "pending",
        userId = session.player.userId,
        error = "",
    } })
    session:hold()
    session:on("apply", function(_, inputs)
        local text = tostring(inputs.application or ""):gsub("%c", " ")
        if #text < 10 then
            session:data({ error = "Write at least 10 characters." })
            return
        end
        local ok, reason = Open77.access.request(session.player.userId, session.player.name, text)
        if not ok then
            session:data({ error = "The application was not saved (" .. tostring(reason) .. ")." })
        end
        -- Filed: the server raises onPreflightRefused again with details.request = pending.
    end)
end)

AddEventHandler("onPreflight", function(session)
    session:allow()                      -- approved or already listed
end)
```

Switch the whitelist on in Warden or with `whitelist.on`. The default resource does the same with
denial notes, invite codes and a withdraw button.

### Discord account required

`session.player.discord` is the Discord id the Master verified for the account; the player is
asked nothing. Enforce it at the gate as well, because a check can be skipped unless
`preflight.required` is on. Permissions: `players.preflight`, `players.gate`.

```lua
local MESSAGE = "This server needs a Discord account linked to your OPEN//77 account. "
    .. "Link it in the launcher (Settings > Account), then join again."

AddEventHandler("onPreflight", function(session)
    if not session.player.discord then
        local why = session.player.ticket and MESSAGE
            or "Update the OPEN//77 launcher and sign in again, then join."
        session:refuse(why, { code = "discord_required" })
        return
    end
    session:allow()
end)

AddEventHandler("onPlayerConnecting", function(player, deferrals)
    if not player.discord then deferrals.done("A linked Discord account is required.") end
end)
```

To require a role on your Discord server, look the id up with [Outbound HTTP](http-client.md)
inside `onPreflight` (handlers may wait) and keep `session:status("Checking your Discord roles...")`
on screen meanwhile.

### Rules with a version

Each player accepts the rules once; changing `VERSION` asks everybody again. The acceptance is kept
in the resource's key/value store. Permissions: `players.preflight`.

```lua
local VERSION = "3"
local RULES = { "Stay in character in public places.", "No cheating, no exploits." }

local SCREEN = [[
<rml>
  <head><title>Server rules</title></head>
  <body>
    <ul><li data-for="rule : rules">{{ rule }}</li></ul>
    <div class="row gap-8"><input id="agree" type="checkbox"/><span>I accept the rules.</span></div>
    <p class="danger" data-if="error">{{ error }}</p>
    <div class="row gap-8">
      <button class="ghost" data-event-click="decline">Decline</button>
      <button data-event-click="accept">I accept</button>
    </div>
    <p class="muted">Rules version {{ version }}.</p>
  </body>
</rml>]]

-- Forget the acceptances of older versions once, when the version changes.
if Open77.kvp.get("rules.version") ~= VERSION then
    Open77.kvp.clear("rules:")
    Open77.kvp.set("rules.version", VERSION)
end

AddEventHandler("onPreflight", function(session)
    local key = "rules:" .. session.player.userId
    if Open77.kvp.get(key) == true then
        session:allow()
        return
    end
    session:show({ document = SCREEN, data = { rules = RULES, version = VERSION, error = "" } })
    session:hold()
    session:on("accept", function(_, inputs)
        if inputs.agree ~= true then
            session:data({ error = "Tick the box to accept the rules." })
            return
        end
        Open77.kvp.set(key, true)
        session:allow()
    end)
    session:on("decline", function()
        session:refuse("You need to accept the rules to play here.", { code = "rules_declined" })
    end)
end)
```

The key/value store holds 4,096 keys. For more players, keep acceptances in
[SQLite](sqlite.md) or your database.

### Maintenance mode

A console command switches maintenance on and off; the state survives restarts. Staff get in.
Permissions: `players.preflight`.

```lua
local STAFF = { ["00000000-0000-0000-0000-000000000000"] = true }

local function maintenance()
    return Open77.kvp.get("maintenance", "")
end

AddEventHandler("onPreflight", function(session)
    local message = maintenance()
    if message ~= "" and not STAFF[session.player.userId] then
        session:refuse(message, { code = "maintenance" })
        return
    end
    session:allow()
end)

-- maintenance <message> | maintenance off
RegisterCommand("maintenance", function(_, args)
    local text = table.concat(args, " ")
    if text == "off" or text == "" then
        Open77.kvp.delete("maintenance")
        print("maintenance off")
    else
        Open77.kvp.set("maintenance", text)
        print("maintenance on: " .. text)
    end
end, true)
```

Players already in game are not affected; checks that are open keep their current screen.

### A queue when the server is full

Preflight does not reserve a slot: it only tells the player and waits. A slot that frees can still
be taken by somebody else before the game starts, and the handshake then refuses with "server
full". Permissions: `players.preflight`.

```lua
local QUEUE_SCREEN = [[
<rml>
  <head><title>Server full</title></head>
  <body>
    <p>The server is full ({{ players }} / {{ maxPlayers }}).</p>
    <p class="accent">You are number {{ position }} in the queue.</p>
    <p class="muted">Keep this window open. Closing it gives up your place.</p>
  </body>
</rml>]]

local queue = {}   -- session ids, first come first served

local function position(session)
    for index, id in ipairs(queue) do
        if id == session.id then return index end
    end
end

local function leave(session)
    local index = position(session)
    if index then table.remove(queue, index) end
end

AddEventHandler("onPreflight", function(session)
    local server = Open77.preflight.server() or {}
    if (server.maxPlayers or 0) <= 0 or (server.players or 0) < server.maxPlayers then
        session:allow()
        return
    end
    queue[#queue + 1] = session.id
    session:show({ document = QUEUE_SCREEN, data = {
        players = server.players, maxPlayers = server.maxPlayers, position = #queue,
    } })
    session:hold()
    while session:alive() do
        Wait(2000)
        server = Open77.preflight.server() or server
        local mine = position(session)
        if not mine then return end
        local free = server.maxPlayers - server.players
        if mine <= free then
            leave(session)
            session:allow()
            return
        end
        session:data({ players = server.players, maxPlayers = server.maxPlayers, position = mine })
    end
end)

AddEventHandler("onPreflightEnd", function(session)
    leave(session)                     -- cancelled, expired, replaced: drop the place
end)
```

A check lasts `sessionSeconds` (600 by default, 1800 at most); after that the launcher offers
Retry and the player queues again.

### Live updates and broadcast

`session:data` changes one screen; `Open77.preflight.broadcast` changes every open one; the welcome
is republished whenever its data changes.

```lua
-- notice <text>: a line on every screen that binds {{ notice }}
RegisterCommand("notice", function(_, args)
    local text = table.concat(args, " ")
    local count = Open77.preflight.broadcast({ notice = text })
    print(("notice shown on %d screen(s)"):format(count or 0))
end, true)

-- Who is on the launcher's screen right now.
RegisterCommand("checks", function()
    for _, session in ipairs(Open77.preflight.sessions() or {}) do
        print(session.id, session.phase, session.player.name, session.player.userId)
    end
    local status = Open77.preflight.status()
    if status then
        print(("allowed %d, refused %d, failed open %d"):format(
            status.counters.allowed, status.counters.refused, status.counters.failedOpen))
    end
end, true)

-- Kick a player off the launcher's screen from another script or a command.
local function dropCheck(userId, why)
    local session = Open77.preflight.find(userId)
    if session and session:alive() then
        session:refuse(why or "The staff closed your server check.", { code = "kicked" })
    end
end
```

## Exports of open77_preflight

The default resource keeps serving these when another resource owns preflight. Other resources
call them without `players.access` of their own. The read-only checks are open to every resource;
the others answer `nil, "caller_denied"` unless `api.trusted` in its `config.lua` names the caller.
Every change goes through `Open77.access`, so Warden, the console and open checks see it at once.
Warden records the actor as `resource:open77_preflight/<calling resource>`, plus `:<actor>` when
you pass one.

```lua
local door = exports.open77_preflight

if door:isBanned(userId) then return end
door:ban(userId, "Griefing", 86400, "Judy")          -- 24 h; 0 or nil = permanent
door:whitelistAdd(userId, "V")
for _, request in ipairs(door:requests("pending") or {}) do
    door:approve(request.userId)                     -- or door:deny(request.userId, "Applications are closed.")
end
door:kick(playerId, "AFK for too long")             -- a player id or an account id
```

| Export | Returns | Notes |
|---|---|---|
| `isBanned(userId)`, `isWhitelisted(userId)`, `whitelistEnabled()` | boolean | Open to every resource. |
| `maintenance()` | `enabled, message` | Open to every resource. |
| `hasAcceptedRules(userId)` | boolean | Open to every resource. |
| `ban(userId, reason?, seconds?, actor?)` | `true` | `seconds` nil or 0: permanent. Disconnects the player if in game. |
| `unban(userId, actor?)` | `true`, or `false` when there was no ban | |
| `getBan(userId)`, `bans()` | one ban or `nil`, or the array of active bans | Same fields as `Open77.access.getBan`. |
| `whitelistAdd(userId, label?, actor?)`, `whitelistRemove(userId, actor?)`, `setWhitelist(enabled, actor?)` | `true` | Removing while the whitelist is on disconnects the player at the next tick. |
| `whitelist()` | array of `{ userId, label, addedAt, addedBy }` | |
| `requests("pending"?)`, `getRequest(userId)` | array of, or one, `{ userId, name, message, status, requestedAt, requestedAtUnix, note, decidedBy? }` | |
| `approve(userId, label?, actor?)`, `deny(userId, note?, actor?)` | `true` | The note of `deny` is shown to the player. |
| `kick(target, message?)` | the account id | `target` is a player id (number) or an account id (string). Removes the player from the game and from the launcher's screen, and shows `message` if they try again within `kickSeconds`. |
| `refusals()` | array of `{ userId, name, code, message, at, atUnix }` | Recent refused connections. |
| `sessions()` | array of `{ id, userId, name, phase, discord?, door? }` | Who is on the server check now. |
| `setMaintenance(true \| false \| "default", message?)` | `enabled, message` | Same as the console command. |
| `resetRules(userId?)` | count | Everybody when `userId` is nil. |

A failure is `nil, reason`.

## Checklist

- Decide in every branch: `allow`, `refuse`, or `show` plus `hold` and a handler that decides.
- Treat `inputs` and `data` as hostile: check lengths and characters before storing them or putting
  them in a query.
- Keep bans in the door list, not in your script, so they hold at the handshake too.
- Do the real check again in `onPlayerConnecting`, or set `preflight.required`.
- Never ask for a password: the launcher talks to your server over plain HTTP.
- Print the `false, reason` of `show`, `welcome` and `refuse` while you build.
