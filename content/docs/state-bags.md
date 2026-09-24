# Replicated state bags

Replicate structured state with server-authoritative state bags. Resources can read snapshots and subscribe to changes instead of defining separate synchronization events for each value.

```lua
-- server
Open77.state.player(source):set("job", { name = "police", grade = 3 })
Open77.state.entity("vehicle", vehicleId):set("fuel", 61.5)
Open77.state.global:set("weather", "rain")
```

```lua
-- client, anywhere, on any resource
print(Open77.state.player(source).job.name)   --> police
print(Open77.state.global.weather)            --> rain
```

That is the whole idea. Vehicle keys, fuel, cuffs, job, duty and engine state are all
state-bag fields in a modern roleplay framework, and a bag replaces the ad-hoc broadcast
each of them used to need. Two of those are worked through on this page: the bundled
[`open77_fuel`](#the-fuel-sample-open77_fuel) resource is the reference for a server-owned
per-vehicle value with a consumption tick, and the [plate recipe](#recipe-a-number-plate) is
the two-line version.

The FiveM names work too, because ported code reaches for those and never for an
`Open77.*` name:

```lua
Player(source).state.cuffed = true
Entity(vehicleId).state:set("keys", { "12", "13" })
GlobalState.hour = 21
LocalPlayer.state.job        -- client only
AddStateBagChangeHandler("cuffed", nil, function(bagName, key, value) ... end)
```

---

## `Open77.state` now holds two unrelated things

This is worth stating plainly before anything else, because it will look like a mistake
otherwise.

| Name | What it is |
|---|---|
| `Open77.state.save` / `.load` / `.clear` | **Resource-private JSON that survives a reload and never crosses the wire.** One opaque blob per resource, 64 KiB, dropped on stop. See [server resources](server-resources.md). |
| `Open77.state.global` / `.player(id)` / `.entity(...)` / `.onChange` / `.allowRequest` | **Replicated key/value bags**, the subject of this page. |

They share a table and share nothing else. The tidier arrangement would have been to move
the first group somewhere like `Open77.resource.stash`, and that was considered and
rejected: five of the seven bundled server resources feature-detect with

```lua
if type(Open77.state) ~= "table" or type(Open77.state.save) ~= "function" then return end
```

and a rename that left those guards standing would make them take the silent no-op branch.
Cordon would stop carrying its match state across a reload and say nothing about it. A
silent data loss is worse than a slightly crowded table, so `save`/`load`/`clear` keep
working exactly as they always have, and the bag accessors were added beside them.

There is no parity cost either way: nothing ported from FiveM reaches for an `Open77.*`
bag name.

---

## Selectors

A **selector** names one bag. Every one of these returns a bag handle.

| Selector | Side | Meaning |
|---|---|---|
| `Open77.state.global` | both | The one server-wide bag. Not a function: it is the handle. |
| `Open77.state.player(id)` | both | The bag of one player. `id` may be a number or its decimal string. |
| `Open77.state.entity(kind, id)` | both | `kind` is `"vehicle"`, `"npc"` or `"prop"`. |
| `Open77.state.entity{ kind = , id = }` | both | The same thing in table form. |
| `Open77.state.localPlayer()` | client | The local player's own bag. `nil, "no_session"` before a session exists. |

A handle is a plain Lua table behind a protected metatable, so it can be kept in an upvalue
and reused; asking for the same bag twice gives you an equivalent handle either way.

### Reading

```lua
local bag = Open77.state.player(source)

bag:get("job")        --> value, or nil
bag.job               --> the same value (read sugar)
bag:all()             --> { job = ..., duty = ... }  -- a copy, never a live view
bag:revision()        --> a monotonic integer, 0 for a bag that does not exist
bag:selector()        --> { kind = "player", id = "12" }
```

`bag:get` and `bag.key` are the same store. A bag that does not exist reads as an empty
one rather than erroring, which is what lets a client read a key before the server has ever
written it.

**Five key names are shadowed by the methods**: `get`, `set`, `all`, `clear` and
`revision`. `bag.get` is the function, not the value under the key `"get"`. Reach those
keys — if you really must have them — with `bag:get("get")`.

### Writing (server only)

```lua
bag:set("fuel", 61.5)          --> true | false, reason
bag:set("fuel", nil)           --> clears the key
bag.fuel = 61.5                --> write sugar; RAISES on refusal
bag:clear("fuel")              --> true | false, reason
bag:clear()                    --> destroys the whole bag
```

Writing needs the `state.write` permission in the manifest. Reading never does.

```lua
-- open77.lua
permission "state.write"
```

`bag:set` returns `false, reason` so a caller can handle a refusal. The `bag.key = value`
sugar has no return channel, so it **raises**: a write that silently disappeared would be
far harder to find than one that says so at the line that is wrong.

### Values

Anything JSON can carry: strings, numbers, booleans, and nested tables of them. Functions,
coroutines and cycles are refused with `state_value_not_serializable`.

A **vector goes in and comes back as the plain `x`/`y`/`z` table** every Open77 position
API already returns — that is the [vector](vectors.md) contract, not a limitation of bags:

```lua
bag:set("spawn", vector3(-1234.5, 678.25, 12.5))
local spawn = bag.spawn
spawn.x                       --> -1234.5
vector3(spawn)                --> a vector again, for the maths
```

---

## Change handlers

```lua
local subscription = Open77.state.onChange(selector, key, function(selector, key, value, previous)
    print(selector.kind, selector.id, key, value, previous)
end)

Open77.state.offChange(subscription)
```

`selector` may be a bag handle, a `{ kind = , id = }` table, a bare kind string
(`"player"`, `"vehicle"`, …) to watch every bag of that kind, or `nil`/`"*"` for every
bag. `key` may be a key name or `nil`/`"*"` for every key.

The handler runs at a tick boundary, never inside the write, so it may `Wait`. On a cleared
key `value` is `nil`; on a first write `previous` is `nil`.

**Only the resources that subscribed are touched.** The filter lives on the host side, so a
`duty` flip does not marshal a payload into every running resource so that one of them can
read it.

### The FiveM shim

```lua
local id = AddStateBagChangeHandler(key, bagName, function(bagName, key, value, reserved, replicated)
    ...
end)
RemoveStateBagChangeHandler(id)
```

`bagName` is `nil` for every bag, `"global"`, `"player:<id>"`, `"<kind>:<id>"`, or
`"entity:<id>"` — the last matches any entity kind with that id, because FiveM has one
entity namespace and Open77 has three registries. `reserved` is always `nil` and
`replicated` is always `true`; both exist so a ported signature still lines up.

---

## The client never writes a bag

This is the rule that surprises people porting from FiveM, and it is deliberate.

`bag:set` exists on the client, and always answers:

```lua
local ok, reason = Open77.state.global:set("weather", "sun")
--> false, "requires_server_arbitration"
```

`bag.key = value` on the client raises, for the same reason as on the server: a silent
no-op would be worse.

What a client *can* do is **ask**:

```lua
-- client
Open77.state.request(Open77.state.localPlayer(), "seatbelt", true)   --> true | false, reason
```

`request` acknowledges the **send**, never the outcome. The server decides, and the value
lands in the mirror when the delta comes back — there is no optimistic apply, and no path
by which a client's bytes become the bag's value unread.

The server opts a key in and supplies the validator:

```lua
-- server
Open77.state.allowRequest("player", "seatbelt", function(source, value)
    if type(value) ~= "boolean" then return false end
    return true, value          -- accepted, and this is the value that gets stored
end)

Open77.state.denyRequest("player", "seatbelt")
```

The validator runs in the declaring resource's VM, and **the value it returns is what the
bag stores** — return a normalised value to clamp, round or rewrite whatever the client
sent. Returning anything but `true` refuses. A key nobody opted in is refused as
`not_requestable` before any Lua runs at all.

`allowRequest` accepts a kind string to cover every bag of that kind, or a specific bag
handle / `{ kind = , id = }` to cover one.

### Why, and the cost of getting it wrong

Two reasons, and the second is the hard one.

**Trust.** A bag is shared state. A client that could write `Player(src).state.job` could
write it for anybody watching, and an admin flag, a bounty or a stash code is exactly the
kind of thing a bag carries.

**The inbound budget.** The transport disconnects a session on its **33rd inbound net event
in one second**. A FiveM resource that sets a client state key every frame will, ported
naively, drop the player. Open77 makes that hard to do by accident:

- the client shim **coalesces** — every `request` in a window is collapsed per key and sent
  as one net event, at most four times a second;
- the server refuses beyond **4 requests per second per session**, with
  `state_request_rate_limit`, long before the transport's limit can fire.

A refusal comes back as a log line on the client rather than vanishing. Do not build a UI
that calls `request` on every keystroke; call it when the value settles.

---

## Who sees what

| Bag | Audience |
|---|---|
| `global` | every connected player, every routing bucket |
| `player(id)` | every player in that player's routing bucket, including the subject |
| `entity(kind, id)` | exactly the players streaming that entity — the registry's own viewer set |

An entity bag's audience **is** the entity's audience, which is what makes stream-in,
stream-out and bucket changes correct without a second interest pass to keep in sync.

**Routing buckets are isolated.** A player in another bucket does not receive the value and
is not told to ignore it: a bag carries gameplay secrets, so shipping it to a client that
is merely asked not to look is an information leak with no bandwidth saving. Moving bucket
drops the player's whole mirror and re-sends what the new bucket holds, atomically with the
move.

A late joiner, a streamed-in entity and a resynchronising client all receive a **full
snapshot**, chunked across several events when it is large. Everything else is a **delta**
carrying only the keys that moved.

---

## Lifecycle

- A bag **dies with its subject**: removing a prop, vehicle or NPC destroys its bag, and a
  disconnecting player takes theirs with them. Every holder is told to drop it, and every
  key raises a change so a handler watching one key sees it go.
- A resource **stopping** retires its change subscriptions and its `allowRequest`
  validators. A requestable key whose validator went down with its resource stops being
  requestable, rather than accepting whatever the client sends.
- The client mirror lives in the host, not in a resource, so it **survives a resource
  restart**: a resource coming back up reads the current values immediately.
- A new server session drops the mirror and asks for a fresh one, so the previous server's
  bags never linger.

---

## Caps

Nothing truncates. A write that breaches a cap is refused by name and the bag is left
exactly as it was — no partial apply, no key dropped to make room.

| Cap | Value | Refusal |
|---|---|---|
| Keys per bag | 64 | `bag_key_limit` |
| Key name | 64 bytes, `[A-Za-z][A-Za-z0-9_.-]*` | `invalid_state_key` |
| Value, serialized | 4 KiB | `state_value_too_large` |
| Value depth / nodes | 8 / 256 | `state_value_not_serializable` |
| Bytes per bag | 16 KiB | `bag_byte_limit` |
| Bags per server | 8 192 | `bag_limit` |
| Total bag bytes | 8 MiB | `bag_byte_limit` |
| Client requests | 4 per second per session | `state_request_rate_limit` |
| Server writes | 20 000 per second per resource | `state_write_rate_limit` |

The value budget is deliberately tighter than the 48 KiB export envelope: an export payload
crosses once, a bag value is re-sent to every viewer on every change and again in every
snapshot.

The server write budget is a safety valve, not a bandwidth control — ten writes to one key
in one tick already collapse into one delta carrying the final value, so outbound cost
follows the number of distinct keys that *moved*. A resource that trips it is named in the
server log, once per window, so the failure is attributable.

### Every failure reason

| Reason | Means |
|---|---|
| `invalid_state_key` | The key name is empty, too long, or outside `[A-Za-z][A-Za-z0-9_.-]*`. |
| `invalid_state_selector` | The kind is not one of `global`/`player`/`vehicle`/`npc`/`prop`, or the id is not a non-negative integer. |
| `state_value_too_large` | Over 4 KiB serialized. |
| `state_value_not_serializable` | A function, a coroutine, a cycle, or deeper than 8 / more than 256 nodes. |
| `bag_key_limit` | A 65th key. |
| `bag_byte_limit` | Over 16 KiB in one bag, or 8 MiB across the server. |
| `bag_limit` | An 8 193rd bag. |
| `unknown_bag` | Clearing a key or a bag that does not exist. |
| `permission_denied:state.write` | Writing without the manifest permission. |
| `requires_server_arbitration` | `set`/`clear` called on the client. |
| `not_requestable` | A client asked for a key no resource opted in. |
| `state_request_rate_limit` | More than 4 client requests a second from one session. |
| `state_write_rate_limit` | More than 20 000 server writes a second from one resource. |
| `state_unavailable` | The host has no bag registry (a fixture that does not replicate). |

---

## The fuel sample (`open77_fuel`)

Cyberpunk has no fuel model, so FiveM's `GetVehicleFuelLevel` / `SetVehicleFuelLevel` have no
native to adapt. Fuel is a bag field, and `resources/system/open77_fuel` is the canonical sample
of the pattern -- small enough to copy, and shipped so the three places that already cited it
were telling the truth.

**What it does.** The server owns one number, `fuel`, on every canonical vehicle's bag. Once a
second it walks `Open77.vehicles.all()`, reads the replicated `speed` and the `engineOn` bit the
physics owner already reports, and burns the tank through a pure model (`shared/fuel.lua`:
litres per hundred kilometres while moving, litres per minute while idling, one `multiplier`
over both). At zero it cuts the engine with `Open77.vehicles.setEngine(id, false)` -- the
server-authored bit that is held against the owner's next report -- and keeps cutting it every
tick until somebody refuels, and it fires `open77:fuel:empty(vehicleId)` host-wide once per
empty. A tank the model has never seen starts full; a removed vehicle takes its bag with it.

```lua
-- Any server resource: FiveM's two natives, as exports.
local litres = exports.open77_fuel:level(vehicleId)         -- GetVehicleFuelLevel
exports.open77_fuel:set(vehicleId, 12.5)                    -- SetVehicleFuelLevel
exports.open77_fuel:refuel(vehicleId)                       -- to the brim; refuel(id, 20) adds 20 L
exports.open77_fuel:configure({ litresPerHundredKm = 9.0 }) -- or multiplier, idleLitresPerMinute, capacity

-- Or the bag itself, with no export in the way.
local litres = Open77.state.entity("vehicle", vehicleId).fuel
Entity(vehicleId).state:set("fuel", 30)    -- the FiveM spelling; needs state.write
```

```lua
-- Any client: a gauge is a read. No permission, no event, no request.
local litres = Open77.state.entity("vehicle", vehicleId).fuel
local mine = exports.open77_fuel:current()   -- the car the local player is sitting in
AddEventHandler("open77:fuel:changed", function(vehicleId, litres, previous) gauge.set(litres) end)
```

**What it deliberately is not.** The client never writes the bag, because a fuel gauge a
client could set is a fuel gauge a client can cheat; consumption is derived from the owner's
replicated speed, which the server already validates. And the model lives in a shared file with
its own Lua suite (`tests/fuel_test.lua`, run inside the server test process) so the numbers a
server owner tunes are the numbers that are tested.

Commands: `/fuel <id>` prints the tank, `/refuel <id> [litres]`, `/fuel.set <id> <litres>` and
`/fuel.multiplier <factor>` are admin-gated. The manifest holds `world.vehicles` and `state.write`
on the server and `vehicles.read` on the client, the last only so `current()` can map the entity
the local body is mounted in back to its canonical id.

## Recipe: a number plate

Cyberpunk has no readable or writable plate -- `Open77.vehicles.setProperties(id, { plateText =
... })` is refused by name and `Open77.vehicles.unsupportedProperties.plateText` says why -- so a
plate is a bag key, exactly like fuel but without the tick:

```lua
-- server (needs state.write): the plate is whatever the server says it is
Entity(vehicleId).state:set("plate", "NC-1977")
-- the same write, natively spelled
Open77.state.entity("vehicle", vehicleId):set("plate", "NC-1977")
```

```lua
-- either side: read it back
local plate = Entity(vehicleId).state.plate
```

There is no `Open77.vehicles.setLabel`, and nameplates are player-keyed, so the plate is
**shown** the way any other per-entity text is: a client-side world anchor (`Open77.anchors.create`
in the [API reference](index.html), with `render = "dot"` drawn natively by the plugin) pinned to
the car's entity, whose label follows the bag.

```lua
-- client: a small dot above every streamed car that carries a plate
local anchors = {}

local function show(vehicleId, plate)
    local car = Open77.vehicles.get(vehicleId)     -- needs vehicles.read
    if car == nil or not car.streamed then return end
    local presentation = { label = plate, scale = 0.8 }
    if anchors[vehicleId] then
        Open77.anchors.update(anchors[vehicleId], { presentation = presentation })
        return
    end
    anchors[vehicleId] = Open77.anchors.create({
        render = "dot",
        entity = car.entity, offset = { x = 0, y = 0, z = 1.6 },
        maxDistance = 25,
        presentation = presentation,
    })
end

Open77.state.onChange("vehicle", "plate", function(selector, _, plate)
    local vehicleId = tonumber(selector.id)
    if plate == nil then
        if anchors[vehicleId] then Open77.anchors.remove(anchors[vehicleId]) end
        anchors[vehicleId] = nil
    else
        show(vehicleId, plate)
    end
end)

AddEventHandler("open77:vehicleRemoved", function(vehicleId)
    if anchors[vehicleId] then Open77.anchors.remove(anchors[vehicleId]) end
    anchors[vehicleId] = nil
end)
```

The bag change arrives before the car has necessarily streamed in on this client; the
`open77:vehicleCreated` event is the moment to call `show` for a plate that was set before the
car was in range. Everything else -- late joiners, bucket changes, the car leaving -- the bag
and the anchor already handle: the bag is re-sent with the entity, and an entity anchor whose
entity is not streamed is simply not drawn.

## Cost

Five things keep this cheap, in the order they matter: deltas rather than snapshots, a
dirty set rather than a scan, coalescing to the tick, recipients from the entity's own
viewer set, and **one event per recipient per tick** carrying everything that recipient is
owed.

Measured at 64 players, each with a 20-key bag:

| Tick | Events | Bytes server-wide | Time |
|---|---|---|---|
| 5 keys change (a realistic roleplay tick) | 64 | ~16 KB | ~0.5 ms |
| All 64 bags change at once (pathological) | 64 | ~213 KB, largest event 3.3 KB | ~20 ms |

Never 64 × 64 messages, and every event fits one net-event envelope with room to spare. The
second row is reachable only if every player in one bucket changes a key in the same tick; most
of its cost is the transport encoding 213 KB, not the bags.

---

## The wire, and why there is no protocol change

Bags ride the existing `NetEvent` envelope, the same road props, effects and loot already
take. That is deliberate and load-bearing: the protocol version check is **exact equality
on every frame, in both directions**, so a new binary opcode would cost a `MinorVersion`
bump and refuse every client that had not been rebuilt in lockstep, at the first frame.

The five reserved names — `open77:state:snapshot`, `:delta`, `:drop`, `:ready` and
`:request` — are platform-owned on both sides. A resource cannot publish one and a client
cannot raise one into a resource handler.

---

## See also

- [Vectors and quaternions](vectors.md) — what a vector is when it crosses the network.
- [Server resources](server-resources.md) — manifests, permissions, and `Open77.state.save`.
- [Complete server Lua API](server-api.md) — every server global and method.
