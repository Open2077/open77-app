# Zones

Define world-space areas for shops, safe zones, checkpoints and other gameplay rules. Zone queries determine whether a position is inside a shape.

`Open77.zones.contains` uses the same Lua implementation on the client and server, including boundary and vertex handling. Use client queries for presentation and server queries to validate gameplay.

## Presentation and validation are different jobs

**The client zone service is presentation. It is never proof.**

`open77_zones` runs on a machine the player owns. It can say anything. An
`enter` event means "this client reports it is near a point" — it is a cue
to draw a prompt, play a sound, or show a marker, and nothing more.

**Anything that grants must re-derive containment on the server**, with
[`Open77.zones.containsPlayer`](#server-side-validation) or
[`Open77.zones.playersIn`](#server-side-validation), before it acts. Because
both sides run the same geometry against the same definition, that
re-derivation is one call and not a hand-rolled second opinion — which is
exactly what made it worth centralising.

## The shared module

Three functions, present on **both** runtimes, callable from **any**
resource — client or server, bundled or third-party. No permission, no
dependency, no export round-trip: they are part of the `Open77` namespace
the same way `Open77.json` is.

| Function | Answers |
|---|---|
| `Open77.zones.contains(zone, point [, options])` | `true` / `false`, or `nil, reason` |
| `Open77.zones.normalize(definition)` | a prepared zone, or `nil, reason` |
| `Open77.zones.bounds(zone)` | `{ x, y, z, radius, minZ, maxZ }`, or `nil, reason` |

They are **pure**. They read no world, resolve no entity, hold no state and
call nothing outside `math`. That is what lets the same code run on a
dedicated server with no game attached.

```lua
local turf = {
    shape = "poly",
    minZ = 12.0, maxZ = 20.0,
    points = {
        { x = -1460.0, y = 90.0 }, { x = -1440.0, y = 90.0 },
        { x = -1440.0, y = 110.0 }, { x = -1460.0, y = 110.0 },
    },
}

-- Client: is the local player standing in it?
if Open77.zones.contains(turf, Open77.character.state().position) then ... end

-- Server: the same table, the same function, the same answer.
if Open77.zones.containsPlayer(source, turf) then ... end
```

`point` is a `vector3` or any `{ x =, y =, z = }` table — a vector *is* a
table with those fields, so both forms are the same thing to this code.

### Prepare once, test many

`contains` accepts a raw definition or a prepared one. On a raw definition it
has to validate and derive on **every call**: for a polygon that means
rebuilding the vertex list and re-running the shoelace area before the test
can even start, which measured about eight times the prepared cost. If a
zone is tested more than once — and a polled zone is tested ten times a
second — normalize it once and keep the result.

```lua
local shop = assert(Open77.zones.normalize({
    shape = "box",
    position = { x = -1460.2, y = 99.9, z = 14.8 },
    size = { x = 12.0, y = 6.0, z = 4.0 },
    rotation = 37.0,
}))
-- shop.shape, shop.bounds.radius, shop.bounds.minZ ... are all readable.
```

A prepared zone is a plain table. It survives `json.encode`, `pairs` and the
export boundary unchanged, and passing it back to `contains`, `bounds`,
`playersIn` or `containsPlayer` costs one field lookup to recognise.

## Shapes

`shape` picks the geometry. **Omitting it gives the shape that shipped**, so
every zone definition written before this page existed still means exactly
what it always meant.

| `shape` | Geometry |
|---|---|
| *(omitted)* or `"cylinder"` (alias `"circle"`) | Planar `radius` around `position`, plus a `maxHeight` band either side of `position.z`. |
| `"sphere"` | A **true 3-D ball**: `#(point - position) <= radius`. |
| `"box"` | `position` (centre), `size` (**full** extents), `rotation` degrees about the vertical axis. |
| `"poly"` (alias `"polygon"`) | `points`, a planar ring of 3–512 vertices, **concave allowed**, with an optional `minZ`/`maxZ` range. |
| `"combo"` (aliases `"combination"`, `"multi"`) | `zones`, an array of definitions. Inside if **any** is. Nests up to 4 deep. |

**Every shape is closed.** A point exactly on an edge, a face or a vertex is
**inside**. That is a decision, not an accident: a crossing-number polygon
test is ambiguous on its own boundary — the answer would depend on which
side of a comparison a vertex happened to fall, and therefore on vertex
order — so the boundary is settled explicitly, first, before the crossing
count runs. It is the reason an edge and a vertex give the same answer on
both runtimes.

### `sphere` is not what an existing radius zone was

Worth stating loudly, because it is the one place a careless edit changes
behaviour. A definition with no `shape` is a **cylinder with a height
band**, not a ball: at `radius = 10`, a point 10 m directly above the centre
is *outside* (the default band is ±6 m). Adding `shape = "sphere"` to that
definition makes the same point *inside*.

So `sphere` **refuses** `maxHeight` with `max_height_unsupported` rather
than ignoring it. The only way that field reaches a sphere is somebody
migrating a cylinder, and in that case the vertical behaviour has just
changed under them and they need to be told.

### Fields

| Field | Shapes | Meaning |
|---|---|---|
| `position` | cylinder, sphere, box; optional for poly/combo | `{ x, y, z }` centre. For a polygon or combo it is only the **anchor** — see [attached zones](#zones-attached-to-an-entity). |
| `radius` | cylinder, sphere | Metres, `0 < radius <= 2000`. |
| `maxHeight` | cylinder | Vertical tolerance either side of `position.z`. Default `6.0` — a zone on a plaza must not fire for a player on the overpass above it. Refused on a sphere. |
| `size` | box | `{ x, y, z }` **full** side lengths (so a 12 m counter is `x = 12`, not `6`), each `0 < size <= 4000`. |
| `rotation` | box, poly | Degrees about the vertical axis. On a box it turns the shape. On a polygon the vertices are already in world space, so it only declares the heading they were authored at, and matters solely for an attached zone. |
| `points` | poly | 3–512 `{ x, y }` or `{ x, y, z }` vertices; `z` is ignored. A ring whose area is under 1e-6 m² is refused as `degenerate_polygon`. |
| `minZ` / `maxZ` | poly | Independent and both optional. **Absent means unbounded on that side** — see below. |
| `zones` | combo | 1–64 child definitions. |
| `attach` | any | `{ entity = , player = , offset = , followHeading = }`. See [attached zones](#zones-attached-to-an-entity). |

### An unbounded polygon reaches the sky

A polygon with no `minZ` and no `maxZ` is an infinite vertical prism,
matching PolyZone. That is genuinely right for gang turf and genuinely wrong
for a shop floor: without a height range, a player on the walkway thirty
metres above your shop is inside it.

Night City is vertical. **Give a polygon a height range unless you have
thought about it and decided you want the whole column.** The cylinder's
`maxHeight` default exists for the same reason and is applied for you;
`minZ`/`maxZ` are not, because there is no sane value to guess from a ring of
`{ x, y }` points.

### Concave polygons are handled properly

The containment test is the Franklin crossing-number form, which is correct
for concave and self-touching rings. A convex-hull or half-plane test is
not: on a C-shaped turf boundary it reports the **hollow of the C** as
inside the zone. That is the classic zone bug — it looks fine on the map,
it is invisible in casual play, and a player who notices it can claim turf
from outside it.

The parity fixture and both test suites walk a U-shaped polygon in and out
through its notch specifically to hold that line.

## Zones attached to an entity

A zone can follow something: a leash around an NPC, a no-shooting bubble
around a vehicle, a bodyguard radius around a player.

```lua
{
    id = "escort",
    position = { x = 0, y = 0, z = 0 },   -- the anchor the shape is authored around
    radius = 8.0,
    attach = { player = 12, offset = { x = 0, y = 2.0, z = 0 }, followHeading = true },
}
```

| Field | Meaning |
|---|---|
| `entity` | Any Open77 entity id. `0` is the local player's body. |
| `player` | A player id, resolved to their entity. One of `entity` or `player` is required. |
| `offset` | Metres from the entity, in the **zone's own frame** — so with `followHeading` it turns with the entity and "two metres in front" stays in front. |
| `followHeading` | When true the zone's rotation tracks the entity's `yaw`. Only meaningful for a box, or for a polygon with an off-centre anchor. |

Resolution is the **only** impure part of the feature, and it is deliberately
not in the shared module. `Open77.zones.contains` on a definition carrying
`attach` returns `nil, origin_required`: pure geometry may not go and look
where an entity is. Instead the caller supplies the answer.

```lua
Open77.zones.contains(zone, point, {
    origin = { x = ex, y = ey, z = ez },   -- where the anchor is right now
    rotation = entityYaw,                  -- optional
})
```

The bundled client service does that resolution for you every poll tick. On
the server, pass `origin` to `playersIn` or `containsPlayer` — which is also
how one definition gets reused at twenty different places without being
redefined twenty times.

**An anchor that will not resolve contains nobody.** If the entity is
despawned, gone, or simply not streamed in, the client service treats the
zone as empty and fires `exit` if the player was inside. Holding the last
verdict instead would look safer and is not: a player standing inside a zone
attached to an entity would have kept that entity streamed, so "cannot
resolve" and "player is inside" do not co-occur — and holding it would strand
a caller waiting on `exit` forever the day its NPC dies.

Internally this transforms the **query point** into the zone's declared
frame rather than moving the zone, so it is one translation and at most one
2-D rotation whatever the shape is: a 300-vertex polygon costs the same to
re-site as a sphere, and the prepared zone stays immutable and reusable.

## Grace: one expansion rule for every shape

`options.grace` expands a zone outward by a number of metres, with **rounded
corners** — the Minkowski expansion, not a scaled-up copy. It means the same
thing on all five shapes: *how far outside the surface still counts.*

That single knob does two jobs.

On the **server** it is tolerance. `Open77.players.position` is a replicated
snapshot, and an honest player's latest position may not have landed yet. A
validation exists to stop a client claiming to be somewhere else entirely,
not to arbitrate centimetres, so a few metres of grace is usually right.

On the **client** it is the hysteresis band: the exit test is the enter test
with `grace` set to the zone's hysteresis. One rule, so a box and a polygon
get the anti-chatter behaviour the sphere always had without anybody writing
a second boundary.

Grace reaches into a concavity too, because it is a true expansion: with
`grace = 3` on the U-shaped turf above, a point 2 m inside the notch is
inside the zone.

## The client service: `open77_zones`

Polls the local character transform against every registered zone and fires
an owner-local event on each enter/exit edge.

```lua
resource "hideseek"
version "1.0.0"
dependency "open77_zones >=0.2.0"

client_script "client/main.lua"
```

No permission is required: the service reads the local character transform
through `Open77.character.state()`, which is ungated.

### Create

Exports are asynchronous, like every cross-resource call. Await the promise:

```lua
local handle

CreateThread(function()
    local promise, callError = Open77.exports.call("open77_zones", "create", {
        id = "safehouse",
        shape = "poly",
        points = {
            { x = -1465.0, y = 95.0 }, { x = -1450.0, y = 95.0 },
            { x = -1450.0, y = 105.0 }, { x = -1465.0, y = 105.0 },
        },
        minZ = 12.0, maxZ = 20.0,
        enterEvent = "hideseek:safehouseEnter",
        exitEvent = "hideseek:safehouseExit",
    })
    assert(promise, callError)
    local result, awaitError = promise:await()
    assert(result and result.ok, awaitError or (result and result.error))
    handle = result.handle
end)

AddEventHandler("hideseek:safehouseEnter", function(context)
    Open77.log.info("entered " .. tostring(context.id))
end)
```

**Swapping a radius zone for a polygon is a change to the definition and
nothing else.** The export, the events, the handle, the hysteresis and the
ownership rules are identical for all five shapes.

| Field | Meaning |
|---|---|
| `id` | Owner-local identifier, 1–64 characters, `[%w_:%-%.]+`. Required. |
| *(geometry)* | Any definition the [shared module](#shapes) accepts, including `attach`. |
| `hysteresis` | Metres the zone expands by for the **exit** test. A supplied value is clamped to 0.05–10.0; omitted, it is `max(0.25, bounds.radius * 0.08)`, which is **not** clamped. The gap between the two tests is where neither event fires. |
| `enterEvent` / `exitEvent` | Local event names fired on each edge. Both optional — a zone can exist purely to be polled with `contains`. |

`create` answers `{ ok = true, handle, id, shape }`, or
`{ ok = false, error = <token> }` carrying **the shared module's own
refusal token**, so a definition the client refuses is one the server
refuses identically.

The event payload is `{ id, handle }`.

### Query and remove

```lua
local function call(name, ...)
    local promise, reason = Open77.exports.call("open77_zones", name, ...)
    assert(promise, reason)
    return promise:await()
end

local inside = call("contains", handle).inside
assert(call("remove", handle).ok)
```

There is no `update`: recreate the zone under the same `id` if its geometry
changes. `contains` answers with the service's own last-polled verdict, not
a fresh read — for an immediate answer about an arbitrary point, call
`Open77.zones.contains` directly; it is available to every resource and
needs no export round-trip.

Ownership comes from `GetInvokingResource()`, never from an argument:
`remove` and `contains` refuse a handle belonging to another resource with
`not_owner`. A caller's zones are dropped automatically when its resource
generation stops or reloads, and a stopped owner is swept within one second.

### Polling, and what it costs

The service polls every registered zone against the local character position
once per tick, at 10 Hz (`100 ms`) whenever any zone is within 50 m and
2 Hz (`500 ms`) otherwise. There is no per-zone rate; a caller who needs
tighter timing than 100 ms should not build on this service. The whole poll
is skipped while the local character is not attached (menu, loading screen,
dead).

Before the real test runs, each zone is rejected against its **bounding
volume** — one squared planar comparison. That is what makes a polygon
affordable, and it is why the cost tracks *zones that overlap the player*
rather than zones registered.

Containment queries first check the zone's bounding volume. Polygon queries outside that volume avoid per-vertex work; queries inside it scale with the polygon's vertex count. Use simple shapes where possible and profile large zone sets in your gamemode.

### The practical limit

Two ceilings, and the second is the real one:

- **256 zones** per client across every resource combined (`zone_limit`),
  unchanged.
- **4096 polygon vertices** live across every resource combined
  (`vertex_budget`) — 128 zones of 32 vertices, or 256 of 16.

The zone count is not what hurts. 256 distant zones cost about 0.3 ms per
tick, which at 10 Hz is a rounding error. What hurts is edges walked on a
tick where the player is standing inside them: 256 overlapping 32-gons
measured 1.3 ms per tick and 256 overlapping 128-gons 5.1 ms — a visible
hitch at 60 fps. The 4096-vertex budget puts the absolute worst case (every
polygon overlapping the player at once) at about 1 ms per tick.

In practice you will never approach it, because zones in different districts
cannot overlap the player simultaneously. The budget exists so that a
resource which *does* try gets a clean `vertex_budget` refusal at creation
rather than a frame-rate mystery.

## Server-side validation

```lua
-- One player, before granting anything.
local inside, reason = Open77.zones.containsPlayer(source, shopFloor, { grace = 2.0 })
if inside == nil then return refuse(reason) end   -- not knowable
if not inside then return refuse("too_far") end   -- genuinely outside
sell(source)

-- Everybody inside, nearest to the anchor first.
for _, entry in ipairs(Open77.zones.playersIn(turf, { bucket = 0, grace = 2.0 })) do
    payTribute(entry.playerId)
end
```

### `Open77.zones.containsPlayer(playerId, definition [, options])`

`true`, `false`, or `nil, reason`. **Those three are genuinely different**,
and collapsing them is how a validation becomes a bug:

- `false` — the player's position is known and it is outside. A player in
  **another routing bucket** is also `false`: a different bucket is a
  different world, so they are not standing in this zone by any reading.
- `nil, "position_unknown"` — the player has never reported a position. That
  is not "outside".
- `nil, "position_stale"` — you passed `maxAgeMs` and the last reading is
  older than that.
- `nil, "player_not_found"` — no such player.

Refusing on `nil` is a policy decision the caller has to make, not one this
call may make silently. **Pass `maxAgeMs` when a stale reading must not
grant** — without it the last known position is used however old it is,
which matches `Open77.players.get` and `Open77.players.nearby`.

### `Open77.zones.playersIn(definition [, options])`

An array of entries, possibly empty, or `nil, reason`. It is built on
[`Open77.players.nearby`](server-api.md) and inherits its conventions
exactly rather than inventing a second set: entries are
`{ playerId, bucket, distance, fresh, ageMs, name, position, heading, speed }`,
and ties break by player id so two calls with the same input answer in the
same order.

`distance` is to the zone's **anchor**, not to its boundary.

| Option | Default | Meaning |
|---|---|---|
| `bucket` | every bucket | A number narrows to one routing bucket; `false` is every bucket, explicitly. A zone is a place, not a player, so it has no bucket of its own to borrow — unlike `players.nearby` anchored on a player. |
| `maxAgeMs` | none | Skip players whose last reading is older than this. |
| `limit` | none | Applied **after** containment, never to the bounding-sphere scan — a limit on the scan would return the nearest N players in the bounding sphere, most of which may be outside the zone. |
| `grace` | `0` | Metres of outward tolerance. See [grace](#grace-one-expansion-rule-for-every-shape). |
| `origin` / `rotation` | the declared anchor | Re-site the whole zone. Required for a definition carrying `attach`. |

The candidate scan is bounded by the zone's bounding sphere measured from
its anchor, so it stays correct at any rotation. A polygon with no height
range has no finite bounding sphere and scans the whole roster.

## Refusal tokens

Stable `snake_case`, identical on both runtimes, so a caller can branch on
them.

| Token | Meaning |
|---|---|
| `invalid_definition` | Not a table. |
| `unknown_shape` | `shape` is not one of the five names or their aliases. |
| `invalid_position` | Missing or non-finite `{ x, y, z }`. |
| `invalid_radius` | Not finite, `<= 0`, or `> 2000`. |
| `invalid_max_height` | Not finite, `<= 0`, or `> 2000`. |
| `max_height_unsupported` | `maxHeight` on a `sphere`. |
| `invalid_size` | Box `size` missing, non-positive or `> 4000` on an axis. |
| `invalid_rotation` | Not a finite number. |
| `invalid_points` | Fewer than 3 vertices, or a vertex that is not a point. |
| `too_many_points` | More than 512 vertices. |
| `degenerate_polygon` | Area under 1e-6 m² — collinear points are not a polygon. |
| `invalid_height_range` | `minZ`/`maxZ` non-finite, or `minZ > maxZ`. |
| `invalid_zones` | Combo `zones` missing or empty. |
| `too_many_zones` | More than 64 children in one combo. |
| `zone_nesting_too_deep` | Combos nested more than 4 deep. |
| `invalid_attach` | `attach` present but malformed, or naming neither `entity` nor `player`. |
| `invalid_point` | The queried point is not a finite `{ x, y, z }`. |
| `invalid_options` | `options` is not a table. |
| `invalid_grace` | Negative, non-finite, or `> 2000`. |
| `invalid_origin` | `options.origin` is not a finite `{ x, y, z }`. |
| `origin_required` | The zone carries `attach` and no `origin` was supplied. |
| `zone_limit` | Client service: 256 live zones already. |
| `vertex_budget` | Client service: 4096 live polygon vertices already. |
| `not_owner` | Client service: the handle belongs to another resource. |
| `zone_not_found` | Client service: no such handle. |

## Upgrading from the radius-only service

**Every definition that worked before works unchanged**, with the same
numbers. `position` + `radius` + optional `maxHeight` + optional
`hysteresis` is the `cylinder` shape, and it is what you get when `shape` is
absent.

Two things did change, both deliberately:

1. **The vertical boundary now gets hysteresis too.** Previously the exit
   test expanded the radius but not the height band, so a player standing
   exactly at `maxHeight` could chatter between enter and exit while
   standing still — the very thing hysteresis exists to prevent. `grace`
   now expands the whole volume. No definition changes; a zone can only
   flap *less* than it did.
2. **The event payload's `handle` is now populated.** It was documented and
   always arrived `nil`. Handlers that read it start getting the number the
   documentation always promised.

## See also

- [Vectors and quaternions](vectors.md) — the other shared prelude, and the
  precedent this one follows.
- [Server Lua API](server-api.md) — `Open77.players.nearby`, whose
  conventions `playersIn` reuses.
- [Writing a gamemode](../docs/writing-a-gamemode.md) — section 2.5 on why a
  missing position is not "outside".
- [Resource exports](resource-exports.md) — how the client service's
  asynchronous exports work.
