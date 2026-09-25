# Player identity and username

Each installation has a persistent cryptographic identity. The Master verifies the username used by chat, nameplates, presence events and server scripts.

## Stable id and display name

Identifiers have different jobs:

| Value | Lifetime | Use |
|---|---|---|
| `license` | Permanent Open77 account | Characters, inventories and progression across linked devices |
| `userId` / `open77` | Persistent installation identity | Existing identity-based APIs, including built-in access lists and ACLs |
| `steam` / `gog` | Linked store account | Store identity supplied by the verified Master ticket |
| `playerId` / `source` | One connection | Addressing the player during the current session |
| `displayName` | Editable profile field | Chat and presentation only |

For account-level persistence, store `license` as a string. Use `userId` where an existing API
requires the installation identity; the two values are not interchangeable. A player can rename
their profile and receives a new `playerId` after reconnecting. Existing data keyed by `userId`
needs an explicit migration before switching keys.

`license`, `steam` and `gog` are available to server Lua since `2.31.13+op77.101`. See
[Steam, GOG and permanent account identifiers](connection-control.md#steam-gog-and-permanent-account-identifiers)
for a complete join handler, formats and missing-identifier behavior.

## Changing the username

The server browser shows the current username in its **Identity** field. Pressing **Save** sends a freshly signed enrollment request to the Master. The Master accepts the update only when the private key already attached to the `userId` signed it.

Names contain 1 through 32 UTF-8 bytes and cannot contain control characters. A username cannot be changed during an active game session.

The private key never leaves the Windows identity store. The request, response, and saved profile contain no reusable password.

## What a game server verifies

The Master issues an Ed25519 certificate covering all three public profile values:

```text
userId || P-256 public key || displayName
```

During connection, the game server verifies that certificate and a fresh P-256 session proof bound to its challenge. Changing only the name in a modified client invalidates the Master certificate, so the forged name is rejected before the session becomes active.

## Server Lua

Server resources receive the verified values through the normal player API:

```lua
AddEventHandler("onPlayerConnected", function(playerId, playerName)
    local player = tonumber(playerId) or 0
    print(GetPlayerIdentifier(player)) -- installation userId
    print(GetPlayerName(player))       -- Master-verified displayName
    print(GetPlayerIdentifierByType(player, "license")) -- permanent Open77 account ID
end)
```

The connect event is `onPlayerConnected`, and it passes the player ID as its first
argument. `source` is **not** set here: it is populated only for handlers reached through
a network event, never for a plain `TriggerEvent` dispatch.

The username-editing Lua bridge is reserved for the trusted local server-browser package. Downloaded server resources cannot rewrite a player's identity.

## Language

The game's language is a setting of the player's own game, not of their account: the
engine stores it as three variables of the `/language` settings group -- `OnScreen` (text),
`VoiceOver` (audio) and `Subtitles` -- whose values are CName codes such as `en-us`,
`fr-fr`, `jp-jp`, `kr-kr`, `pt-br`, `zh-cn` (the very values the vanilla settings screen
compares against; it is `ru-ru` that triggers the Russian voice-over disclaimer and `ar-ar`
that flips the layout right-to-left). Open77 reads them where they live and reports them on
both runtimes.

**Client**, permission `session.locale`:

```lua
local locale, reason = Open77.session.locale()
-- { code = "fr-FR", gameLanguage = "fr-fr", voiceLanguage = "en-us",
--   subtitles = "fr-fr", chromium = "en-US", revision = 1 }
```

`code` is a BCP-47 tag derived from `OnScreen` (the four languages the engine spells by
country are mapped: `jp`→`ja`, `kr`→`ko`, `cz`→`cs`, `ua`→`uk`; the region is upper-cased).
The three raw engine codes ride beside it, so a resource that wants the audio language, or
meets a code the mapping has not seen, always has the source. `chromium` is the operating
system's UI language -- what a WebUI page's `navigator.language` (the JS `Open77.getLocale()`)
has always answered. It is **not** the game's language and is kept for contrast only.

`nil, "locale_not_reported"` until the script bridge has answered once: the settings
container is captured by the health-bar controller, so the first answer follows the first
gameplay frame by a moment. The read is asked again, rate-limited, on every call, and at
every world-ready.

**Server**, permission `players.locale.read`:

```lua
permissions { "players.locale.read" }

AddEventHandler("onPlayerReady", function(playerId)
    CreateThread(function()
        Wait(5000)                                   -- the report follows world-ready by a few seconds
        local locale = Open77.players.locale(playerId)
        local language = locale and locale.code:sub(1, 2) or "en"
        Open77.chat.send(tonumber(playerId), ({ fr = "Bienvenue !", de = "Willkommen!" })[language] or "Welcome!")
    end)
end)
```

The server never asks the engine: the client **host** -- not a resource -- pushes the value
once per world-ready on the reserved `open77:session:locale` net event, which the server
consumes before any resource route and caches per session. `TriggerServerEvent` refuses the
name on the client and `TriggerEvent` refuses it on the server (`reserved_event`), so what
`players.locale` answers is what the player's own game said and nothing else. It is a
report, not a ledger: a modified client can lie about its language, which costs nobody
anything. The table adds `ageMs` (the age of the report) and `revision` (how many reports
this session has produced). `GetPlayerLocale(playerId)` is the FiveM spelling of the same
function.

Four refusals, on purpose distinct: `invalid_player_id`; `player_not_found` for a player who
is not connected; `not_reported` for one whose client has not pushed yet -- a client that
never reached world-ready, or an older build; `locale_unavailable` in an embedding with no
transport.

**A language change re-reports.** The engine only allows changing the language at the main
menu (the `/language` variables are pre-game only), so a player who changes it leaves the
world to do so; the next world-ready pushes the new value, `revision` moves, and `ageMs`
restarts. Nothing announces it: read the value when you need it rather than caching it for
the session.
