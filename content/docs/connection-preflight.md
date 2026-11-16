# Connection preflight: the launcher's server check

When a player presses **Join** in the OPEN//77 launcher, the launcher first asks your server
whether this player may come in, before it downloads a mod or starts the game. Your server
answers over HTTP, and the launcher shows what the server wants shown: a status line, a welcome
or rules screen with buttons and text fields, or a refusal page that says why and what to do
next. The launcher calls this step **Server check**; the server calls it *preflight*.

A banned player learns it in two seconds, in the launcher, with the reason and your appeal link,
instead of after a three-minute game start. A player your whitelist refuses can apply from the
same screen. A new player reads and accepts your rules once, before loading in.

Preflight sits in front of the real door and replaces none of it. The in-game handshake, the
[built-in door list](connection-control.md#the-built-in-door-list) (bans and whitelist) and
[`onPlayerConnecting`](connection-control.md) still run for every join and still decide. A
player whose launcher has no server check joins exactly as before.

This page is for server owners: what preflight does, how to configure it and the default
resource every server ships with. Two companion guides cover the rest:

- [Building preflight screens](preflight-screens.md): the markup the launcher renders, with a
  complete welcome and rules example.
- [Preflight in Lua](preflight-lua.md): events, the session object, the door-list API and
  recipes for writing your own preflight resource.

![The default welcome screen of open77_preflight on a server's page in the launcher: server name, player count, whether the server is open to everyone, a news panel, the house rules and Discord and website links](/assets/docs/preflight/welcome-default.webp)

## Requirements

| Side | Needs |
|---|---|
| Launcher | OPEN//77 launcher **0.2.21** or later. Older launchers skip the check and join as before. |
| Server | A server package that ships `resources/system/open77_preflight`. Its `server.jsonc` needs nothing new: preflight is on by default. |
| Network | Players reach your server's HTTP port over TCP: **game port + 1** (`11779` when the game port is `11778`). |

## How a join goes

```text
Launcher                                   Your server
--------                                   -----------
Server page opened ---- GET  /preflight/v1/hello ---->  capabilities, a one-time challenge,
                   <---------------------------------   your anonymous welcome screen

Join pressed ---------- POST /preflight/v1/sessions -->  1. identity proof checked
  (challenge signed with the player's device key)           (same proof as the in-game handshake)
                                                         2. door list: banned? not whitelisted?
                                                              yes -> onPreflightRefused (present it)
                                                              no  -> onPreflight (your resource)
Long poll ------------- GET  /preflight/v1/sessions/.. ->  status line, screens, data updates
Button pressed -------- POST .../events -------------->  onPreflightEvent / session:on(...)

Verdict:  allowed  -> mods, game start, in-game handshake, onPlayerConnecting
          refused  -> refusal screen with your message and page; Retry / Back
          expired  -> "The server check expired"; Retry
```

1. **Hello.** The launcher fetches `GET /preflight/v1/hello` on game port + 1. If that fails
   (404, refused connection, timeout, an old server), the launcher skips the check silently and
   joins as before. The answer can carry your **welcome screen**, which the launcher shows on the
   server's page before the player presses Join. The launcher keeps a hello for 60 seconds.
2. **Session.** On Join, the launcher signs the challenge with the player's device identity key.
   The server checks it against the Master's certificate, so the account id your resource sees
   is as trustworthy as at the in-game handshake. When the launcher also sends a Master connect
   ticket, the server verifies it and your resource gets the player's store and Discord
   identifiers; a missing or invalid ticket never refuses anybody.
3. **Door list.** On the next tick the server asks its own
   [door list](connection-control.md#the-built-in-door-list) (`access.json`, edited from Warden,
   the console and `Open77.access`). A banned or unlisted player is refused here with the same
   sentence the handshake uses. The owning resource can present that refusal as a page or an
   application form; it can never overrule it.
4. **Your resource.** `onPreflight(session)` runs for every player the door list admits. It
   allows, refuses, shows a screen or holds the player until they press a button.
5. **Verdict.** `allowed`: the launcher continues (mods, game start, handshake). `refused`: the
   launcher stops and shows your message, with your refusal page when you send one.
6. **Join.** `onPlayerConnecting` handlers see `player.preflight == true`, and the owning resource
   receives `onPreflightJoined(session, playerId)`.

Preflight does not check capacity: a full server still refuses at the handshake. The default
resource can tell the player before the game starts and hold them until a slot frees.

## Quick start

Nothing to install. Every server ships `resources/system/open77_preflight`, and a `server.jsonc`
that does not name another resource uses it. Out of the box it:

- publishes a welcome screen on your server's page: name, description, player count, "Whitelist"
  or "Open to everyone", your news lines and links;
- lets in everybody your door list admits, with a "Welcome to *server*, *name*." line on the
  launcher's progress screen;
- turns the door list's refusals into pages: a banned player reads the reason, the expiry
  ("Permanent" or a UTC date) and the player id to give to your staff; a player the whitelist
  refuses gets an application form whose requests land in Warden.

To switch on rules, a required Discord account, maintenance mode or your links, edit
`resources/system/open77_preflight/config.lua` and run `ensure open77_preflight` at the console.
No server restart is needed. See [config.lua](#configlua) below.

To write your own resource instead, name it in `server.jsonc` and restart once:

```jsonc
"preflight": {
  "resource": "my_welcome"
}
```

[Preflight in Lua](preflight-lua.md) starts from a ten-line resource.

## What players see

| The player | Sees |
|---|---|
| Opens your server's page | The welcome screen under the server's banner. Links work there; buttons do nothing until Join. |
| Is banned (Warden, console, `Open77.access.ban`, `Open77.players.ban`, any resource) | A refusal page with the reason, "Banned until" a UTC date and time or "Permanent", their player id and your appeal link. |
| Is not on the whitelist | The application form: a text field and an optional invite code. Once sent, "Your application is with the staff". The player is let through the moment somebody approves it, if the window is still open. |
| Is admitted | In order, each step only when it applies: a recent kick, maintenance, Discord required, server full, the rules. Then the game starts. |

![A ban page in the launcher's Server check: the launcher's line repeats the server's sentence, and the server's page shows the reason, the ban's expiry, Contact the staff and Website links, and the player id](/assets/docs/preflight/banned.webp)

![The whitelist application form: a question from the server, a text field for the application, an optional invite code field and a Send my application button](/assets/docs/preflight/whitelist.webp)

A ban, an unban, a whitelisting or the whitelist switch **reaches players who are on the
launcher's screen at that moment**, whoever made the change: the ban page replaces the rules, an
approved applicant moves on to the rules, an unlisted player gets the form when the whitelist is
switched on.

The launcher frames every server page as the server's own words ("From the server"), and under a
page with text fields it adds a line telling players never to type an OPEN//77, Steam, GOG, Epic
or Xbox password there.

## Server configuration

The `preflight` block of `server.jsonc`. A file without it runs preflight with these defaults.
Changing the block needs a server restart.

```jsonc
"preflight": {
  "enabled": true,          // false: no /preflight/v1 routes, launchers skip the check
  "resource": "open77_preflight", // the ONE resource that owns preflight; "" = door list only
  "required": false,        // true: refuse in-game joins that did not pass preflight
  "passSeconds": 600,       // how long an allowed check is remembered for the join
  "sessionSeconds": 600,    // lifetime of one check, interactive screens included
  "decisionSeconds": 15     // an undecided, unheld check is allowed after this long
}
```

| Key | Default | Range | Meaning |
|---|---|---|---|
| `enabled` | `true` | | `false` removes every `/preflight/v1/*` route. Hello then answers `404` (or the connection is refused when nothing else uses the port) and launchers join as before. |
| `resource` | `"open77_preflight"` | `^[a-z0-9][a-z0-9_-]{0,63}$` or `""` | The resource that owns preflight. It must be running and declare the `players.preflight` permission. Left out: the default resource. `""`, a stopped resource or one without the permission: every player the door list admits is allowed. |
| `required` | `false` | | `true`: the in-game handshake refuses a player whose account has no allowed preflight within `passSeconds`. See [Requiring preflight](#requiring-preflight). |
| `passSeconds` | `600` | 30 to 86400 | How long "this account passed the check" is remembered, and reported as `player.preflight`. |
| `sessionSeconds` | `600` | 60 to 1800 | A check ends after this long whatever its state; an open screen becomes `expired` and the launcher offers Retry. |
| `decisionSeconds` | `15` | 1 to 120 | A check the resource neither decides nor holds for this long is **allowed**, with a warning in the server log. |

### The HTTP port

Preflight is served by the server's public HTTP listener, `resources.download.listenUrl`, the
same one that serves resource downloads and `/query/v1/status`. It is opened for preflight even
when resource downloads are disabled.

- The launcher always calls `http://<game host>:<game port + 1>/preflight/v1/hello`. Keep the
  listener on game port + 1 and open that port to TCP in your firewall and your host's panel.
  A listener on another port, or reachable only through `publicBaseUrl` or a CDN, is invisible
  to the launcher.
- The launcher speaks plain HTTP to that port. TLS termination in front of it is not used.
- When preflight is the only reason for the listener (downloads and the public query both off)
  and the port cannot be opened, the server logs a warning and starts anyway: launchers then skip
  the check. With `required: true` it is logged as an error, because nobody can join.
- Avoid a reverse proxy in front of the listener: every player would share the proxy's address,
  and preflight allows four live checks per source address.

## The default resource: open77_preflight

`open77_preflight` keeps no ban list or whitelist of its own. Both are the server's
[door list](connection-control.md#the-built-in-door-list), the one Warden and the console edit.
What it adds is what the player sees, a few optional steps, and exports for your other
resources. If it errors or stops, a player the door list admits is allowed and a player it
refuses reads the server's plain sentence.

### config.lua

Edit `resources/system/open77_preflight/config.lua`, then `ensure open77_preflight`. Every key is
optional; a missing key keeps its default. Links must start with `https://`. Keep a copy of your
file: installing a newer server package over the old one may put the shipped file back.

| Key | Default | Meaning |
|---|---|---|
| `links.discord`, `links.appeal`, `links.website` | `""` | Links on the screens. `appeal` is the "Contact the staff" link of a refusal page; when empty, the Discord link is used. |
| `welcome.enabled` | `true` | The welcome screen on the server's page. `false` publishes none. |
| `welcome.title`, `welcome.text` | `""` | Empty: the server's name and description from `server.jsonc`. |
| `welcome.showPlayers`, `welcome.showRules` | `true` | The "12 / 64 players" chip, and the rules under the text when `rules.enabled`. |
| `announcements` | `{}` | Short lines on the welcome screen and above the rules. `preflight.announce <text>` adds one live. |
| `rules.enabled` | `false` | A rules screen each player accepts once. |
| `rules.version` | `"1"` | Change it when the rules change: everybody is asked again. |
| `rules.title`, `rules.items`, `rules.checkbox` | `"Server rules"`, three sample rules, `true` | The heading, the lines, and whether a box must be ticked before "I accept". |
| `discord.required` | `false` | Refuse players whose OPEN//77 account has no linked Discord. The id is the one the Master verified; nothing is asked of the player. A launcher that sends no connect ticket is told to update and sign in again. |
| `discord.message` | a sentence | The refusal text. |
| `whitelist.applications` | `true` | The application form for players the whitelist refuses. `false`: a page with their player id and your links. |
| `whitelist.prompt`, `whitelist.minLength` | a sentence, `10` | The form's question and the minimum length of an application (300 characters at most are kept). |
| `whitelist.reapply` | `true` | A player whose application was denied may send a new one. `false`: they read the denial and the staff's note. |
| `whitelist.inviteCodes` | `{}` | Codes that whitelist the player at once, without staff (case-insensitive). Anyone who knows a code gets in: rotate them. Five wrong codes lock the field for that account for ten minutes. |
| `maintenance.enabled`, `maintenance.message` | `false`, a sentence | Refuse everybody with the message. The console command overrides this file until `preflight.maintenance default`. |
| `maintenance.allow`, `maintenance.allowWhitelisted` | `{}`, `false` | Account ids (and optionally every whitelisted player) that get in during maintenance. |
| `full.mode`, `full.message` | `"wait"`, a sentence | When the server is full: `wait` holds the player on a screen and lets them through when a slot frees or they press "Try anyway"; `refuse` refuses; `off` says nothing. |
| `bans.showReason`, `bans.showStaff` | `true`, `false` | Whether a ban page shows the reason the staff typed, and who banned. |
| `allowedMessage` | `"Welcome to {server}, {name}."` | The line shown on the launcher's progress screen after the check. `{server}` and `{name}` are replaced. |
| `kickSeconds` | `120` | How long a kick made through the `kick` export is shown to the player when they try again. |
| `api.trusted` | `{ "open77_admin" }` | The resources allowed to call the exports that list or change anything. `"*"`: every resource. |

A minimal roleplay setup:

```lua
PreflightConfig = {
    links = {
        discord = "https://discord.gg/your-invite",
        website = "https://example.com",
    },
    announcements = { "New district opens this weekend." },
    rules = {
        enabled = true,
        version = "2",
        items = {
            "Stay in character in public places.",
            "No cheating, no exploits.",
            "Respect the other players and the staff.",
        },
    },
    discord = { required = true },
    full = { mode = "wait" },
}
```

Rules acceptance is remembered per account in the resource's key/value store (`data/` under the
resource), for the current `rules.version` only. The store holds about 30,000 players.

### Warden

The *Whitelist & bans* tab shows the same state as the console and Lua (`access.view` to see,
`access.edit` for the buttons):

- **Requests**: whitelist applications, pending first, with what the player wrote. *Approve*,
  *Deny* (with a note the player reads), *Ban* and *Forget* (drop the request so the player may
  apply again).
- **Server check**: who is on the launcher's screen right now, their phase, and the door-list code
  when the list refuses them, with *Allow* and *Ban*.
- **Refused**: also lists players the door list turned away at the launcher, who never reached the
  in-game handshake.

Warden's own API carries the same data: `GET /api/access` includes `requests` and `preflight`,
`POST /api/access/requests/{userId}/approve` (`{ label? }`) and `.../deny` (`{ note? }`) answer a
request, and `GET /api/preflight` returns the server check alone. These are Warden routes on the
Warden port, not the launcher's.

![The application after it was sent: the launcher shows that it is with the staff, what the player wrote, a Withdraw my application button and the player id](/assets/docs/preflight/whitelist-pending.webp)

### Console commands

From the server console or Warden's live console:

| Command | Effect |
|---|---|
| `preflight.status` | Owner, live checks, counters, whitelist state, pending requests, maintenance, rules version. |
| `preflight.maintenance on [message]`, `off`, `default` | Switch maintenance live. Survives restarts; `default` returns to `config.lua`. |
| `preflight.announce <text>`, `preflight.announce clear` | A line on the welcome screen and on every open rules screen. |
| `preflight.rules.reset [userId]` | Ask one player, or everybody, to accept the rules again. |
| `whitelist.requests` | Pending and denied applications. |
| `whitelist.approve <userId> [label]` | Whitelist the player and close the request. |
| `whitelist.deny <userId> [note]` | Deny the request; the note is shown to the player. |
| `whitelist.forget <userId>` | Drop the request, pending or denied, so the player may apply again. |

The `whitelist.*`, `ban.id` and `unban` commands are the server's own and work without the
resource; the complete list is in [The built-in door list](connection-control.md#the-built-in-door-list).
Approving whitelists the identity and lets a player still waiting on the launcher's screen
through at once. Whitelisting or banning an identity by any other means closes its request too.
At most 500 requests are kept: answered ones make room for new ones, pending ones never do.

### Exports for your other resources

Other resources reach the door list through `open77_preflight`, without the `players.access`
permission of their own:

```lua
local door = exports.open77_preflight

door:ban(userId, "Griefing", 86400, "Judy")   -- 24 h; 0 or nil = permanent
door:whitelistAdd(userId, "V")
for _, request in ipairs(door:requests("pending") or {}) do
    print(request.name, request.message)
end
door:kick(playerId, "AFK for too long")       -- a player id or an account id
```

The yes/no reads (`isBanned`, `isWhitelisted`, `whitelistEnabled`, `maintenance`,
`hasAcceptedRules`) are open to every resource. Everything that lists or changes something answers
`nil, "caller_denied"` unless `api.trusted` names the calling resource. The full table is in
[Preflight in Lua](preflight-lua.md#exports-of-open77_preflight).

### Replacing it

Name your own resource in `preflight.resource`. `open77_preflight` then shows nothing, logs that it
is not the owner, and keeps serving its exports. With `"resource": ""` no resource owns
preflight: the door list alone decides, with the server's plain sentences.

## Requiring preflight

By default preflight is advisory: a launcher without it, or a client that goes around it, still
joins through the handshake. To make it mandatory:

```jsonc
"preflight": { "required": true, "passSeconds": 900 }
```

The handshake then refuses any account with no allowed check in the last `passSeconds`, with
"This server checks players before they join. Update the OPEN//77 launcher, then join again."

- **Every player needs launcher 0.2.21 or later.** Leave `required` off until your community has
  updated.
- The pass is remembered, not consumed: a reconnect after a crash inside the window needs no new
  check. Keep `passSeconds` long enough for a slow first join (mod downloads, shader builds);
  600 is a reasonable floor. The launcher reuses one allowed check for five minutes of the same
  join, so a long download can reach the game later than the check itself.
- The gate runs after the door list and before capacity and `onPlayerConnecting`.
- The HTTP port must be reachable: with `required` on and the port closed, nobody can join.

## Compatibility

| Launcher | Server | What happens |
|---|---|---|
| 0.2.21 or later | Preflight `enabled` | Hello, check, verdict, then the usual join. |
| 0.2.21 or later | Older server, or `enabled: false` | Hello fails: the launcher skips the check silently and joins as before. |
| 0.2.21 or later | HTTP port closed or filtered | Same as an older server. With `required: true` the in-game join is refused. |
| Older launcher | Preflight, `required: false` (default) | Nothing changes: the handshake, the door list and `onPlayerConnecting` work alone. `player.preflight` is `false`. |
| Older launcher | Preflight, `required: true` | The handshake refuses the player and tells them to update the launcher. |

A check that fails after the hello (network loss, an unreadable answer, a server error) stops the
join only on a `required` server; otherwise the launcher logs it and continues. Both sides ignore
fields they do not know, so newer servers and launchers keep working with older ones.

## Limits

| What | Limit |
|---|---|
| Live checks on the server | 256. Beyond that the oldest check that is not interactive gives way; when all are interactive, new ones get `503 preflight_busy`. |
| Checks per source address | 4 at a time (an IPv6 /64 counts as one address). |
| One account | One live check: a new one replaces the old one. |
| Hello | 20 requests per second for the whole server. |
| Session requests | 12 per 10 seconds per source address. |
| Button presses | 10 events per 5 seconds per check, 8 KiB each. |
| Status line, refusal message | 200 and 600 characters (cut, not refused). |
| Screens and data | 64 KiB of markup and 64 KiB of data per screen. See [Building preflight screens](preflight-screens.md#limits). |
| `preflight_files` images | png, jpeg, webp; 2 MiB each, 64 files, 16 MiB in total. |

## Security notes

- **Who the player is, is proven.** A check opens only with a fresh challenge signed by the
  account's device key and the Master's certificate for it. On a `devLocalAuth` server (local
  development) any account id is accepted, as its handshake accepts any.
- **What the launcher sends is not.** Button events, text fields and the launcher's version come
  from a program on the player's machine. A modified client can send any event at any time. Decide
  from what the server knows: the account id, your database, a code compared on the server.
- **Preflight is not the door unless you make it one.** With `required: false` anybody can skip it
  and join through the handshake. Keep bans in the door list (Warden, console,
  `Open77.access.ban`), which is enforced at preflight **and** at every handshake. Enforce a
  whitelist of your own in `onPlayerConnecting`, or set `required: true`.
- **Fail open is deliberate.** A crashed or silent script lets players in rather than locking the
  server. A door-list refusal is never failed open.
- **The port is plain HTTP.** Never ask for a password or any secret on a preflight screen. An
  invite code is fine; an account password is not.
- **`preflight_files` are public.** Anyone who knows the path can fetch them without an account.
- **Links and images.** Screens open only `https` links, load images only from your server,
  `https` or inline data, and cannot run scripts.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| The launcher never shows a server check | Hello is unreachable. Open `http://<server>:<game port + 1>/preflight/v1/hello` in a browser: JSON means it works. A `404` means `preflight.enabled` is `false` (or the server predates preflight); a timeout means the port is closed in a firewall or the listener is not on game port + 1. |
| Everybody is allowed and the welcome screen is missing | `preflight.resource` is empty or misspelt, the resource is not started, or its manifest lacks `players.preflight`. The server log says which. |
| `open77_preflight`: "not the preflight owner" in the log | `preflight.resource` names another resource. Its exports still work; the screens are the other resource's. |
| A banned player reads a plain sentence, no page | The owning resource has no `onPreflightRefused` handler, is stopped, or failed while presenting it (see the log). |
| An export answers `nil, "caller_denied"` | The calling resource is not in `api.trusted` of `config.lua`. |
| `preflight: no decision for '<name>' in 15s; allowed (fail open)` | A script returned without allowing, refusing or holding. See [Preflight in Lua](preflight-lua.md#fail-open). |
| A screen is not shown and the log mentions `document_invalid` | The markup is not well-formed XML. See [Building preflight screens](preflight-screens.md#xml-rules). |
| An image does not appear | It is not listed in `preflight_files`, is not png, jpeg or webp, or is over 2 MiB. The server log lists skipped files at start. |
| Players get "Update the OPEN//77 launcher" on join | `preflight.required` is on and their launcher did not pass a check within `passSeconds`. |
| Some players behind one address skip the check, or cannot join a `required` server | A shared address (campus, VPN, reverse proxy) is limited to four live checks; the next ones get `429 too_many_sessions`. The launcher then continues without a check, except on a `required` server where it shows an error with Retry. Remove the proxy, or ask players to retry a moment later. |

## See also

- [Connection control](connection-control.md): the handshake, `onPlayerConnecting` and the door list.
- [Your server in the launcher](launcher-for-server-owners.md): how the launcher lists and joins your server.
- [Building preflight screens](preflight-screens.md) and [Preflight in Lua](preflight-lua.md).
