# Player identity and username

Open77 gives every installation a durable cryptographic identity. The username shown in chat, nameplates, presence events, and server scripts belongs to that identity and is verified by the Master.

## Stable id and display name

Two identifiers have different jobs:

| Value | Lifetime | Use |
|---|---|---|
| `userId` | Durable | Characters, inventories, bans, ACLs, progression |
| `playerId` / `source` | One connection | Addressing the player during the current session |
| `displayName` | Editable profile field | Chat and presentation only |

Always persist `userId`. A player can rename their profile and receives a new `playerId` after reconnecting.

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
    print(GetPlayerIdentifier(player)) -- durable userId
    print(GetPlayerName(player))       -- Master-verified displayName
end)
```

The connect event is `onPlayerConnected`, and it passes the player ID as its first
argument. `source` is **not** set here: it is populated only for handlers reached through
a network event, never for a plain `TriggerEvent` dispatch.

The username-editing Lua bridge is reserved for the trusted local server-browser package. Downloaded server resources cannot rewrite a player's identity.
