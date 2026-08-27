# The join-time readiness gate

A player who has just connected is not necessarily a player anybody may act
upon. One resource may be about to open the character creator for someone with
no saved character; another may want a rules acceptance, a class pick or a
spawn choice. Meanwhile a gamemode's join path teleports the same player to its
lobby the instant their client says its world is up.

Both resources are correct on their own. Together they are an outage.

> **The rule: do not teleport, spawn, kill or force a respawn on a player until
> their readiness gate has opened.** Reading their state, putting them on a
> roster, sending them a HUD payload — all unaffected.

`Open77.ready` is the platform's answer. It is **server-side only**, and it has
to live in the host: server resources are isolated, with no `exports`, no
cross-resource event bus and a `TriggerEvent` that walks only its own VM, so the
resource holding the player and the resource wanting to move them cannot speak
to each other. Only the host sees both.

No permission is required.

## Why this exists

This is not a hypothetical. On a live server, enabling the database for a ranked
ladder also switched on persistence for the appearance package — because
[the database bridge is per-server, not per-resource](resource-runtime.md#the-database-bridge-is-per-server-not-per-resource).
The appearance package began opening a character creator on join, while the
gamemode teleported the same players to its lobby. Each was individually
correct; the server was unusable.

## The API

| Function | Signature | Result |
|---|---|---|
| `Open77.ready.isReady` | `(playerId)` | Whether anything is still holding this player. A player the host does not know is ready. |
| `Open77.ready.participate` | `({ timeoutMs?, reason? })` | Declare once, at load. Every player who connects from then on arrives with one hold in this resource's name. |
| `Open77.ready.hold` | `(playerId, reason?)` | Take or refresh this resource's hold. Returns the player's `session`, or `nil, reason`. |
| `Open77.ready.release` | `(playerId, session?, note?)` | Clear this resource's hold. A `session` that no longer matches is dropped. |
| `Open77.ready.status` | `(playerId)` | `{ known, ready, session, ageMs, holds = { { resource, reason, ageMs, remainingMs } } }` |

`onPlayerReady(playerId, detail)` is emitted into **every** running resource
when the last hold clears. `playerId` arrives as a **string**, like every host
event. `detail` is one of `cleared`, `no_holds`, `resource_reloaded`,
`resource_stopped`, or `timeout:<resource>`.

## Waiting on the gate

Keep your own join signal and ask the gate for permission. Two handlers:

```lua
RegisterNetEvent("mymode:ready", function()          -- your client's "my world is up"
    local playerId = source
    local record = ensurePlayer(playerId)
    if not Open77.ready.isReady(playerId) then
        record.awaitingReady = true
        return
    end
    place(playerId, record)
end)

AddEventHandler("onPlayerReady", function(playerIdStr, detail)
    local playerId = tonumber(playerIdStr)           -- host events carry strings
    local record = players[playerId]
    if record == nil or record.awaitingReady ~= true then return end
    record.awaitingReady = nil
    place(playerId, record)
end)
```

Three things about that shape are load-bearing.

**`onPlayerReady` is a barrier lifting, not a trigger.** It says only that
nobody is holding this player any more; it says nothing about whether their
world is up. That is why the wait starts from *your* event and never from
`onPlayerReady` alone.

**A gate can open on a timeout**, with the player still in a modal and no puppet
at all — `detail` will say `timeout:<resource>`. Placing an unincarnated player
crashes their client, so check `Open77.players.getLifeState(playerId)` and, if
it is `nil`, leave your flag set and let their next announce do it.

**It costs a returning player nothing.** A player who already has a character is
released as soon as the holding resource has looked them up, so the check simply
passes and the placement is as immediate as it was before.

A server where nothing participates is a server where the gate is always open,
so a resource that never consults it behaves exactly as it did before this
existed.

## Holding the gate

If *your* resource is the one that needs the player — a rules acceptance, a
class pick, a spawn choice — declare yourself once, at load:

```lua
Open77.ready.participate({ timeoutMs = 30000, reason = "character_creation" })
```

Every player who connects from then on arrives with one hold in your name, so
you are not racing to take it — you already have it. You then answer:

```lua
-- Capture the session BEFORE any await.
local session = Open77.ready.status(playerId).session

-- Nothing to ask of this player: the common case, and it must stay instant.
Open77.ready.release(playerId, session)
```

```lua
-- Or: I do need them, with a reason an operator will read, and a fresh deadline.
local session, failure = Open77.ready.hold(playerId, "character_creation")
```

`timeoutMs` is the budget for **answering**, not for the interaction. `hold`
refreshes the deadline, so heartbeat it while the thing is genuinely in flight:
a player taking four minutes over their face is never cut off, while a resource
that dies, a rejected commit or an abandoned UI all release within one timeout
of the last sign of life.

**Capture the `session` before any database await and pass it back afterwards.**
Player ids are recycled. The session number is what stops an answer computed for
someone who has since disconnected from opening the gate of whoever inherited
their id. Omit it and the release applies to whoever holds that id now.

The optional `note` on `release` becomes the `detail` every resource sees on
`onPlayerReady` — which is how one resource can tell the others something
useful without a channel to speak on.

## What cannot happen

| Situation | What the platform does |
|---|---|
| A resource takes a hold and never releases | The hold expires, the gate opens with `timeout:<resource>`, and one `WRN` names the resource that failed |
| A participant is reloaded mid-hold | Its holds are **released**, never inherited — the fresh VM has no memory of the player, and re-arming would deadlock |
| A participant is stopped | Declaration and holds both go; nothing gates joiners on a resource that is not there |
| A player reconnects onto a recycled id | The session advances; a release stamped with the old one is dropped |
| A gate has already opened | It stays open for that session — `hold` answers `already_ready` rather than re-closing it |

Every hold carries a deadline, so a resource that never releases costs one
degraded join and one warning naming it — never a stuck server.

## Seeing who is holding whom

"Nothing happens when I join" is the symptom this produces when it goes wrong,
and it is invisible from every other angle: the player is connected, the world
is up, and every resource is correctly waiting. At the server console:

```text
> ready
participants: open77_appearance
player 11 (session 3) held by open77_appearance [character_creation]
```

## See also

- [Writing a gamemode](writing-a-gamemode.md) — where this sits in a join path.
- [Operator tunables](tunables.md) — the other thing a server owner changes live.
- [The Lua resource runtime](resource-runtime.md) — the isolation model that
  makes a host-owned barrier the only possible design.
