# Players around you (client)

Client resources can ask who else is here and where they are. `Open77.players` answers with ids,
bodies and distances, and it needs **no permission**: everything it reports is the identity and
placement of bodies the client is already drawing on screen.

```lua
resource "proximity_demo"
version "1.0.0"
client_script "client/main.lua"
-- no permissions block: the enumeration below is ungated
```

## The one thing to read before using it

**This is a streaming-scoped view, not the server roster.** It holds the players *this client* has
been told about — the same roster that draws the nameplates — and nothing more. A player the server
counts as connected can be missing from it for a long time: a different routing bucket, too far to
stream, a proxy body still spawning, a world transition in progress. The list is also per-client, so
two players standing together will not necessarily see the same one.

So:

| Question | Ask |
|---|---|
| Who is standing near me, and where is his body? | `Open77.players` on the client |
| How many players are on this server? Is this id on the whitelist? Who gets the payout? | the server, over a [net callback](callbacks.md) |

A resource that treats `#Open77.players.all()` as a head count writes a race that a quiet test
server will never reproduce and a busy one will hit within the hour. The client cannot be made
authoritative about a roster it only receives a slice of; the fix is always to ask the server.

## The API

| Function | Answers |
|---|---|
| `Open77.players.all(options?)` | `{ playerId, ... }`, ascending, the local player included |
| `Open77.players.localId()` | your own player id |
| `Open77.players.entity(playerId)` | the entity id of that player's body |
| `Open77.players.fromEntity(entityId)` | which player wears that body |
| `Open77.players.nearby(radius, options?)` | everyone with a body within `radius`, nearest first |
| `Open77.players.closest(options?)` | just the nearest one |

Failures follow the repository convention: `nil, reason`, with stable snake_case tokens. The reason
matters here more than usual, because "he has no body yet" and "I have never heard of him" are
different facts and a proximity resource has to act differently on each.

### `localId()` — and why it is not `local()`

`local` is a reserved word in Lua, so `Open77.players.local()` is a **syntax error**: the parser
refuses the name before anything runs. The function is registered under both spellings, so

```lua
Open77.players.localId()      -- write this
Open77.players["local"]()     -- identical: the same function value
```

Both return your player id, or `nil, "no_session"` when you are not connected to a server.

### `all(options?)`

```lua
for _, id in ipairs(Open77.players.all()) do
    print(id, id == Open77.players.localId() and "(me)" or "")
end

-- only the ones that actually have a body right now
local visible = Open77.players.all({ streamed = true })
```

Ascending by player id, so two calls in the same frame compare cleanly. **Your own id is in the
list**, matching FiveM's `GetActivePlayers`; filter it out yourself if you do not want it.

A player who is connected but has no body — his proxy has not spawned, or it was retired for a
death, a re-dress or a world transition — **stays in the list** with no entity. Dropping him would
make "not streamed yet" indistinguishable from "left the server", which is exactly the distinction
this API exists to preserve. `{ streamed = true }` is how you ask for only the bodied ones; it is
the equivalent of FiveM's `NetworkIsPlayerActive` filter.

A player who leaves is gone from the list immediately, and so is the id of a body that was retired:
see [Ids do not outlive bodies](#ids-do-not-outlive-bodies).

### `entity(playerId)` and `fromEntity(entityId)`

The two directions of the mapping. Feed the entity into any Open77 entity API —
`Open77.character.state(entity)` first among them — for the transform, stance, weapon and vehicle.
For the same body's own axes — a point two metres in front of it, or where its head is — see
[an entity's own axes](world-queries.md#an-entitys-own-axes).

```lua
local id = Open77.players.localId()
local entity = Open77.players.entity(id)
local state = Open77.character.state(entity)
print(("%s is at %.1f, %.1f"):format(id, state.position.x, state.position.y))
```

`entity()` accepts the player id as a number or as a decimal string. It returns:

| Result | Meaning |
|---|---|
| an entity id | that player has a body, and this addresses it |
| `nil, "player_not_streamed"` | he is here, he has no body — do not retry in a loop, wait for him |
| `nil, "unknown_player"` | this client has never heard of that id |
| `nil, "invalid_player"` | the argument was not an id at all |

**Your own body is the entity id `0`.** That is not a failure value: `0` is the reserved id that
every Open77 entity API reads as "the local player", which is why `Open77.character.state()` with no
argument and `Open77.character.state(Open77.players.entity(Open77.players.localId()))` are the same
call. `fromEntity(0)` gives your player id back.

`fromEntity()` takes the entity as a number or a decimal string — the string form is what a raycast
hit or the older `Open77.animations._context()` map hands out — and answers `nil, "unknown_entity"`
for anything that is not a live player body right now.

### `nearby(radius, options?)` and `closest(options?)`

Centred on your own body, sorted by ascending distance, ties broken by player id so that "closest"
does not flicker between two bodies standing on the same spot.

```lua
for _, player in ipairs(Open77.players.nearby(15.0)) do
    print(("%s at %.1f m"):format(player.name, player.distance))
end

local target = Open77.players.closest({ radius = 3.0 })
if target then
    print(("you are next to %s"):format(target.name))
end
```

Each entry is:

| Field | |
|---|---|
| `playerId` | the network id |
| `entity` | the body, ready for `Open77.character.state` |
| `distance` | metres from the origin |
| `position` | world position — a plain `{ x, y, z }` table, which **is** a [vector3](vectors.md) |
| `name` | display name |
| `isLocal` | true only for your own entry, and only if you asked for it |

Options, shared by both:

| Option | Default | |
|---|---|---|
| `origin` | your own body | measure from somewhere else — a raycast hit, a door, a marker |
| `includeSelf` | `false` | put your own entry in the result |
| `limit` | unlimited | `nearby` only, 1..256, applied after sorting |
| `radius` | unlimited | `closest` only; `nearby` takes it as its first argument |

Because `position` is a plain x/y/z table, it is already a vector everywhere a vector is accepted:

```lua
local a, b = Open77.players.nearby(50)[1], Open77.players.nearby(50)[2]
print(#(vector3(a.position) - vector3(b.position)))   -- metres between them
```

Failure reasons:

| Reason | Meaning |
|---|---|
| `no_session` | not connected to a server |
| `no_local_position` | you are connected but have no body — the "continue" screen, or a world transition — so there is no centre to measure from. Pass `origin` to ask anyway |
| `no_player_in_range` | `closest` only: nobody qualified. `nearby` returns an empty table instead |
| `invalid_radius` / `invalid_origin` / `invalid_limit` | the argument was malformed |

Players without a body are skipped by both: they have no position to sort by. Use `all()` if you
need to know they exist.

## Ids do not outlive bodies

A proxy body is destroyed and recreated more often than players expect — on death, on a clothing
change, on a world transition. When it goes, the entity id goes with it:

```lua
local entity = Open77.players.entity(otherPlayer)   -- 12884901889
-- ... he dies and respawns ...
Open77.players.fromEntity(entity)                   --> nil, "unknown_entity"
Open77.players.entity(otherPlayer)                  --> a different id
```

**Cache the player id, never the entity id.** The player id is stable for the whole session; the
entity id is a handle on one particular body. Resolving it again is one table lookup, so there is
nothing to gain by holding it.

## Permission

None. The roster is what the client is already rendering.

The two things a roster could leak that a screenshot cannot — life state and stats — are not here:
`Open77.players.getLifeState`, `isDead`, `allLifeStates`, `getHealthState` and `allHealthStates` stay
behind `players.life.read` in the same table, and the stats reads behind `players.stats.read`. Asking
who is standing in front of you does not grant you their health bar.

## Relation to the server API

The dedicated server has its own `Open77.players` with the same names and different authority — its
roster is the real one, and it can act on it. See [the server API](server-api.md). A resource that
needs a truth the client cannot have asks for it over a [net callback](callbacks.md):

```lua
-- server: the authoritative answer
Open77.net.register("population", function(source)
    return #Open77.players.all()
end)

-- client, inside a CreateThread, with `network.events` in the manifest
local count = Open77.net.callAwait("population")
```
