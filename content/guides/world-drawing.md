# Drawing in the world

Putting something at a point in Night City — a ring on the ground, a
"hold E" card floating over a door, a label above a player, a circle a
player has to walk into — is one of the first things a gamemode needs and
one of the easiest to get subtly wrong. OPEN//77 offers several mechanisms
for it, and they are not interchangeable: they differ in who draws the
pixels, how often the screen position is recomputed, which permission is
required, and what happens when your resource reloads.

This page covers all of them, with the real export names and option tables.
Everything on it is client-side. The server never draws; it decides, and
tells clients what to draw through net events.

## Choosing a mechanism

| You want | Use | Drawn by |
|---|---|---|
| A ring or cylinder on the ground, visible in the 3D world | `Open77.markers` | REDengine entity |
| A ground ring **and** a "hold E" prompt on it, as one thing | `open77_worldui` | the two below, composed |
| A card, ring or dot pinned to a world point or a moving entity, frame-tight, hidden behind static geometry | `Open77.anchors` with `render` | the plugin, per frame |
| Screen coordinates for a world point, delivered to your own WebUI page every frame | `Open77.anchors` (default `render = "page"`) | your page |
| A contextual prompt with several choices, hold keys, entity attachment | `open77_interactions` | the interactions package |
| A label above remote players | `Open77.nameplates` | the plugin, per frame |
| A pin on the map or minimap | `Open77.blips` | vanilla mappin system |
| "Did the player walk into this circle?" — no drawing at all | `open77_zones` | nothing |
| A one-shot screen coordinate for a world point | `Open77.camera.project` | you |

## The rule behind all of it

> **Nothing on the per-frame path may pass through Lua.**

A Lua resource is serviced on the scheduler's terms, not the renderer's. The
engine presents frames at 60+ Hz; a Lua timer that recomputes a screen
position cannot keep up with a camera that is turning, and the overlay
visibly trails the view, freezes, and slides behind the camera. This is not
a tuning problem — tightening the interval does not fix it, because the
sample is stale before the frame that consumes it is drawn.

Lua is the right place to decide **what** is anchored and **what it says**.
It is the wrong place to decide **where it is on screen this frame**. That
is what `Open77.anchors` exists for: you register the anchor once, and
native code re-projects it every frame.

## Native ground markers — `Open77.markers`

A marker is a real REDengine entity carrying a mesh, so it exists in the 3D
world: it is occluded by geometry and lit by the scene. Requires the
`world.markers` permission.

```lua
permissions { "world.markers" }
```

```lua
local handle, reason = Open77.markers.create({
    position    = { x = -1460.2, y = 99.9, z = 24.8 },
    shape       = "ring",          -- "ring" (default) or "cylinder"
    style       = "objective",     -- "interaction" | "objective" | "spawn" | "danger"
    radius      = 2.5,             -- metres, 0.1 .. 50.0
    maxDistance = 90.0,            -- metres, 1.0 .. 500.0
    minDistance = 0.0,             -- must be < maxDistance
    visible     = true,
})
assert(handle, reason)

Open77.markers.update(handle, { radius = 4.0, style = "danger" })
Open77.markers.remove(handle)
Open77.markers.clear()             -- every marker this resource owns
```

`create` returns a decimal-string handle — a 64-bit engine identifier that
happens to be spelled as text. Store and compare it unchanged; never pass it
through `tonumber`.

`Open77.markers.list()` returns one snapshot per owned marker:
`{ id, shape, style, radius, maxDistance, minDistance, visible, rendered, position }`.
The `rendered` flag comes from the native registry and is the only way, from
Lua, to distinguish "the handle exists" from "the engine is actually
presenting something".

The four styles are a fixed set. Anything else is refused; there is no
free-form colour or mesh on this API.

### The invisible-ring trap

A marker's ring mesh is flattened to roughly four centimetres. Placed at
exactly the ground height with no lift, it is co-planar with the floor: the
entity spawns, the effect scales, the registry reports `rendered = true`,
and **nothing is visible**. If a marker refuses to appear while the registry
insists it is rendered, suspect the height before anything else. The
`open77_worldui` facade below defaults to a 0.06 m lift precisely so callers
do not rediscover this.

## World anchors — `Open77.anchors`

An anchor is a world point, or an entity to follow, registered once with the
plugin. The plugin resolves and projects it on the game thread **every
frame** and either publishes the coordinates to a WebUI page you own, or
draws the overlay itself.

No permission is required. The capability an anchor grants is the one
`Open77.camera.project` already grants ungated — turning a world point into
a screen point — with the sampling moved off the Lua tick. What an anchor
can *touch* is bounded by the page it addresses, and that page must be one
your resource created.

### Creating an anchor

```lua
-- A fixed world point.
local pin, reason = Open77.anchors.create({
    page        = page,                                  -- required for render = "page"
    position    = { x = -1520.4, y = 380.2, z = 15.0 },
    tag         = "objective",                           -- routing hint, see below
    maxDistance = 40.0,
    minDistance = 0.0,
    visible     = true,
})
assert(pin, reason)

-- A moving target: the entity's live transform plus a world-axis offset.
local label = Open77.anchors.create({
    page   = page,
    entity = someEntityId,                               -- decimal string or integer
    offset = { x = 0, y = 0, z = 2.05 },
    tag    = "player.7",
})
```

`position` and `entity` are mutually exclusive and exactly one is required:
omitting both, or passing both, is refused with `position_or_entity_required`.
The kind is fixed for the anchor's life — patching `position` on an entity
anchor, or `entity`/`offset` on a position anchor, is refused with
`anchor_kind_mismatch` rather than silently ignored.

Following an entity is not a convenience. A label above a moving player,
projected from a position captured at registration time, would be worse than
the Lua loop it replaces — stale by minutes rather than by milliseconds.

| Field | Meaning |
|---|---|
| `page` | The WebUI page to publish to. Required for `render = "page"`; ignored by the native styles, which have nowhere to publish. A page you do not own is refused. |
| `position` | A fixed world point. Mutually exclusive with `entity`. |
| `entity` | An entity id to follow. Mutually exclusive with `position`. |
| `offset` | World-axis offset from the entity origin. World-axis, not entity-local, so "two metres above the head" does not tilt with the body. |
| `tag` | Echoed back in every frame so a page can route the coordinates to the element it already built. `[A-Za-z0-9_.:-]`, at most 32 bytes. An identifier, not a label. |
| `maxDistance` | Beyond it the anchor stops reporting. Defaults to 100.0. |
| `minDistance` | Below it the anchor stops reporting. Defaults to 0.0. |
| `visible` | Defaults to `true`. An invisible anchor is still projected and still listed. |
| `render` | `"page"` (default), `"card"`, `"ring"` or `"dot"`. Fixed at creation. |
| `presentation` | Native styles only; see below. Patched whole, never field by field. |

### Update, remove, list

```lua
Open77.anchors.update(pin,   { position = newPosition })  -- the point moved
Open77.anchors.update(label, { entity = respawnedId })    -- follow the new body
Open77.anchors.update(label, { visible = false })         -- stop reporting
Open77.anchors.remove(label)
Open77.anchors.clear()                                    -- every anchor this resource owns

for _, a in ipairs(Open77.anchors.list()) do
    -- a.id, a.tag, a.kind, a.render, a.visible, a.projected, a.onScreen,
    -- a.distance, a.maxDistance, a.minDistance,
    -- a.position, a.resolved, a.screen = { x, y, depth }
    -- entity anchors also carry a.entity and a.offset
end
```

`create` answers with an id string, or `nil, reason`. `update` and `remove`
answer `boolean, reason?`. `a.resolved` is where the anchor actually was on
the last frame — for an entity anchor that is the entity's live position
plus the offset, not what you registered.

### The per-frame payload — `render = "page"`

The page receives one batched message per frame, on the event
`open77:anchors`:

```js
Open77.on('open77:anchors', frame => {
  // frame.anchors is the COMPLETE set for this surface.
  for (const a of frame.anchors) {
    // a.id, a.tag, a.kind ("position" | "entity"),
    // a.x, a.y   — 0..1, top-left origin
    // a.depth    — metres in front of the camera
    // a.distance — metres from the camera
    // a.onScreen — boolean
  }
});
```

**An id that is absent is gone**: hidden, outside its distance band, behind
the camera, or its entity is not streamed right now. Treat absence as
"remove this element". Holding the last known coordinate is exactly how a
frozen label ends up pinned to the middle of the screen.

### Native overlays — `card`, `ring`, `dot`

Moving the projection into the plugin removed Lua from the per-frame path
and was still not enough for an overlay that must sit *on* a moving thing.
What remains after Lua is the CEF chain itself: IPC, a page repaint on the
page's own timer, an offscreen raster, a shared-texture handoff, then the
composite. Every stage buffers. **An anchored billboard cannot be
frame-tight while it is drawn in a web page.**

`render` asks the plugin to draw the overlay itself, in the frame that
presents it, from the projection taken on that frame. There is no page, no
IPC, and nothing left to buffer.

```lua
-- An interaction prompt. No `page` field: a native style has nowhere to publish.
local prompt = Open77.anchors.create({
    entity      = someEntityId,
    offset      = { x = 0, y = 0, z = 1.2 },
    maxDistance = 12.0,
    render      = "card",
    presentation = {
        label        = "Open the door",
        sublabel     = "Locked from the inside",
        key          = "E",                -- drawn in its own keycap, 8 bytes max
        color        = "#F2F6F8",          -- text
        accent       = "#22D8E2",          -- keycap, border, progress bar
        background   = "#0A1220F0",        -- #RRGGBB or #RRGGBBAA
        progress     = 0.4,                -- hold-to-confirm bar; negative draws none
        showDistance = true,               -- recomputed on the frame that draws it
    },
})

-- A ground ring, projected point by point every frame.
local ring = Open77.anchors.create({
    position    = readyUpPoint,
    maxDistance = 80.0,
    render      = "ring",
    presentation = {
        accent       = "#22D8E2D9",
        radius       = 3.0,                -- world metres
        thickness    = 2.0,
        groundOffset = 0.05,
    },
})

-- Resend the WHOLE presentation table. See the warning below: a partial
-- table is not a partial update.
Open77.anchors.update(prompt, {
    presentation = {
        label      = "Locked",
        sublabel   = "You need the keycard",
        key        = "E",
        color      = "#F2F6F8",
        accent     = "#22D8E2",
        background = "#0A1220F0",
        progress   = -1.0,
    },
})
```

> **`presentation` is patched whole — a partial table is not a partial
> update.** `update(handle, { presentation = { label = "Locked" } })` does not
> keep the colours you set at creation: it resets `color`, `accent`,
> `background`, `key`, `progress` and every other presentation field to its
> default. The table carries one dirty flag rather than eleven, deliberately,
> because a prompt changes its label, its key and its hold progress on the
> same frame or not at all. Keep the table in a local, mutate that, and send
> the whole thing. Top-level fields — `position`, `entity`, `visible`,
> `maxDistance` — *are* patched individually; only `presentation` behaves this
> way.

| `presentation` field | Applies to | Default |
|---|---|---|
| `label` | `card`, `dot` | empty; at most 192 bytes |
| `sublabel` | `card` | empty; at most 192 bytes |
| `key` | `card` | empty; at most 8 bytes — "E", "F", "SPACE" |
| `color` | all native styles | `#F2F6F8` — text, the `--op77-text` token |
| `accent` | all native styles | `#22D8E2` — keycap, border, progress bar, stroke; the `--op77-accent` token |
| `background` | all native styles | `#0A1220F0` — fill, the `--op77-panel` token at 0.94 opacity |
| `scale` | all native styles | `1.0` |
| `thickness` | all native styles | `2.0` — stroke width |
| `radius` | `ring` | `1.5` world metres; rejected above `50.0` |
| `groundOffset` | `ring` | `0.05` metres above the ground under each vertex; rejected beyond ±`5.0` |
| `progress` | `card` | `-1.0` — negative draws no bar |
| `showDistance` | `card` | `false` |

Colours accept `#RRGGBB` or `#RRGGBBAA` and nothing else — no names, no
three-digit shorthand. They are parsed once when the anchor is created rather
than in the projection loop, so a malformed value is reported to the caller as
`invalid_color`, `invalid_accent` or `invalid_background` instead of failing
silently sixty-three times a second.

Four things to know before choosing a native style:

- **Geometry hides them.** A native overlay behind a wall is not drawn — but
  only static geometry occludes, so a vehicle or a dumpster does not. See
  [Occlusion](#occlusion-geometry-now-hides-a-native-overlay) below.
- **The style is fixed at creation.** Switching a card into a ring is
  indistinguishable from creating the other one, so `update` refuses it with
  `render_is_not_patchable`.
- **`presentation` is patched whole**, as above. These defaults are not
  cosmetic values only a forgetful caller sees: every partial update falls
  back to them, and they are on screen constantly.
- **There is no layout engine.** No CSS, no images, no rich text, one keycap
  per card. Anything that wants a menu, artwork or reflowed text wants a
  page. What a native style buys is that the overlay sits on the thing it
  describes.

Visibility and distance are re-tested on every drawn frame, against the
entity's live transform, next to the projection. That is deliberate: it is
what makes it impossible for a prompt to keep rendering — reading "6.1 m" —
during a match a kilometre from the thing it points at.

### Occlusion: geometry now hides a native overlay

Rings, cards and dots are hidden when world geometry stands between the camera
and the point they mark. Before this, a prompt on the far side of a wall was
drawn straight through it, which read as a wallhack.

**It tests the `Static` collision group only, and that is a deliberate cost
decision rather than an oversight.** Walls, barriers, kiosks and other static
world dressing occlude correctly. A parked car, a dumpster, a moving vehicle,
a dropped item — anything with dynamic collision — does **not**: the overlay is
still drawn straight through it, exactly as before the feature existed.
Querying both groups would double the per-point raycast cost. Expect this,
do not file it.

The two styles degrade differently, because their visibility means different
things:

- **A ring is tested per vertex.** An occluded vertex drops that segment of the
  polyline, so a partly hidden ring reads as visible arcs and still reads as a
  ring. There is no smoothing, because losing one segment of thirty-two is not
  a glitch.
- **A card or a dot is all-or-nothing**, so a raw per-frame test would flicker
  every time the sightline grazes a lamppost or a railing for a frame or two.
  Hiding therefore requires **five consecutive occluded frames** (~80 ms at the
  nominal 63 Hz in-world rate); revealing takes exactly **one** clear frame.
  The asymmetry is deliberate: a brief intermittent occlusion must not collapse
  the element to hidden, while rounding a corner into full view must not delay
  a prompt the player can already see. Under load the hide delay stretches with
  the frame rate, like every other frame-driven system here.

Two things make the test fail *open* — drawn rather than hidden — on purpose,
because a missing ring reads as a broken feature while a ring drawn through a
barrier only reads as an imperfect one:

- A hit closer than **0.30 m** to the camera is treated as no reliable answer.
  The camera can sit inside or flush against collision geometry — a wall at the
  player's back in third person, a doorway — and a ray starting inside something
  reports a hit at essentially zero, which would cull everything on screen at
  once.
- When the frame's shared raycast budget is spent, the remaining points are
  assumed visible rather than dropped.

The occlusion ray aims **0.5 m above** the point it is testing. A ring vertex
lies *on* the ground, and a ray aimed exactly at it travels along the surface it
terminates on, where a few centimetres of disagreement between collision and
visual geometry moves the hit metres short at grazing incidence. Aiming higher
removes that problem rather than tolerating it. The honest cost: anything
shorter than half a metre — a kerb, a low planter lip — stops occluding.

### A ring follows the real ground

A ring's vertices sample the collision surface underneath each one and draw
there, with `groundOffset` applied on top, instead of drawing at the authored
`z`. The probe looks **3 m up and 15 m down** from the authored height —
asymmetric on purpose, because reaching too far up finds an overpass, a canopy
or a ceiling and pins the ring to it, while reaching down only ever finds a
floor further away. A vertex whose probe finds nothing keeps its authored
height: wrong, perhaps, but never hidden for it.

This fixes a failure that was genuinely hard to diagnose. A ring authored half
a metre below the road surface is invisible to the eye but solidly occluded to
a raycast, so it erased itself — and nothing in the Lua API could have told
you, because there is no server-side ground query and the authored `z` is the
only thing a resource can express.

Samples are cached per ring and re-taken only when the ring's own centre,
radius or segment count changes, so a static ring costs nothing per frame. A
ring whose probes all came back empty is retried roughly every 1.5 s rather
than believed.

> **Design consequence worth knowing before you build on it.** Paint on the
> ground is the wrong primitive for a boundary meant to be read from a
> distance. Now that a ring genuinely follows the terrain, a large one
> *correctly* disappears where the ground falls away behind an edge — over a
> parapet, past the lip of a plaza, across a road that drops. That is the
> ground being honest, not a bug to report. If players must see the extent of
> an area from far off, a ground ring will not carry it.

Ring stroke width also attenuates with distance, so it reads as paint on the
road rather than a HUD line laid over it: a ring strokes at exactly its
authored `thickness` at **10 m**, scaled by `10 / distance` and clamped to
between **0.35x** and **2x**, then floored at **1.2 px** so a distant ring
stays visible. The distance used is to the nearest ring vertex, not to the
centre — a player standing inside a fifty-metre boundary ring is standing on
its centre, and measuring from there would stroke a distant line at maximum
width.

### A stalled native overlay stops being drawn, on purpose

A CEF surface whose feeder stops keeps its last frame. It does not blank; it
stays painted where it died, and a still screenshot of it looks entirely
correct. The native drawer refuses to reproduce that. A producer that has
gone quiet has its items dropped and writes one warning line to the log, and
another when it resumes.

The staleness test is deliberately two-sided: the frame must be older than
**250 ms** *and* the game thread must have advanced at least **16 frames**
without a replacement, with a **2000 ms** ceiling as the backstop for a game
thread that has stopped advancing altogether.

Both conditions, because a producer that publishes once per rendered frame is
punished by a pure wall clock the moment the machine is slow. Elapsed
wall-clock time says the frame is old; elapsed *game frames* say the producer
had the chance to replace it and did not. A game thread crawling at
single-digit Hz — two clients on one GPU will do it — satisfies the first and
not the second, and that is precisely the case a one-sided test used to get
wrong. A frame-driven producer is judged on its own clock.

**If a native overlay vanishes, the feed stopped.** Check the log rather
than the projection.

## POIs — `open77_worldui`

Composing a ground marker and a contextual prompt at the same point by hand
means every caller re-implements the same partial-failure cleanup.
`open77_worldui` does it once, transactionally, and removes both halves
together as one owned handle.

```lua
resource "hideseek"
version "1.0.0"
dependency "open77_worldui >=0.1.0"

client_script "client/main.lua"
```

`world.markers` is **not** required by the caller. `open77_worldui` holds
that permission itself and is the presentation boundary precisely so a
gamemode resource does not need it.

```lua
local function callExport(resource, name, ...)
    local promise, reason = Open77.exports.call(resource, name, ...)
    if not promise then return nil, reason end
    local result, callError = promise:await()
    if not result or not result.ok then
        return nil, callError or (result and result.error) or "export_failed"
    end
    return result
end

local handle

CreateThread(function()
    local result, reason = callExport("open77_worldui", "create", {
        id          = "start_line",
        position    = { x = -1460.2, y = 99.9, z = 24.8 },
        radius      = 2.5,
        style       = "objective",
        maxDistance = 90.0,
        label       = "Join the race",
        description = "Hold to line up at the start.",
        key         = "E",
        holdSeconds = 1.0,
        color       = "#00E5FF",
        event       = "hideseek:startLineSelected",
    })
    if not result then
        Open77.log.error("start line POI failed: " .. tostring(reason))
        return
    end
    handle = result.handle
end)

AddEventHandler("hideseek:startLineSelected", function()
    TriggerServerEvent("hideseek:joinIntent")
end)
```

**`label` is what creates the prompt half at all.** Omitting it creates a
pure marker — a ground ring with nothing to press E on, which is the right
shape for a checkpoint or a waypoint a player only needs to see.

| Field | Meaning |
|---|---|
| `id` | Owner-local identifier, 1–64 characters. Required. |
| `position` | Static `{ x, y, z }` ground point. Required. |
| `style` | `interaction`, `objective`, `spawn` or `danger`. Defaults to `objective`. |
| `shape` | `ring` (default) or `cylinder`. |
| `radius` | Clamped to 0.1–50.0 m; defaults to 1.5. |
| `maxDistance` | Clamped to 1.0–500.0 m; defaults to 80.0. |
| `groundOffset` | Lift above `position.z`, 0.0–2.0 m; defaults to 0.06. See the invisible-ring trap above. |
| `label`, `description` | Prompt copy. `label` is required to create the prompt half. |
| `key`, `holdSeconds`, `icon`, `color` | Prompt affordance, passed straight through to `open77_interactions`. Default key `E`, icon `DIALOG`, colour `#00E5FF`. |
| `marker`, `animated`, `focusRadius`, `requireLookAt`, `promptDistance`, `labelHeight` | Prompt presentation; see [Contextual interactions](interactions.md#definition-reference). |
| `event` | Local event fired when the prompt's choice is selected. Required if `label` is set. |

Radius and `maxDistance` are clamped here rather than left to fail against
the native marker's tighter bounds, so a caller gets a POI instead of an
opaque native refusal.

The prompt half's `markerScale` and `markerNearScale` are **not**
configurable through this facade — they are fixed at `1.0` and `1.6`. A
caller that needs different prompt-marker scaling has to create the
interaction directly through [`open77_interactions`](interactions.md).

There is **no `update` export**. Remove and recreate under the same `id` to
change a POI's geometry or copy.

```lua
local owned = callExport("open77_worldui", "list").pois   -- { { handle, id, position }, ... }
callExport("open77_worldui", "remove", handle)
```

`dump()` is a diagnostic, not part of the steady-state API. It reads the
native marker registry through this resource's `world.markers` permission —
a caller without that permission cannot see the registry at all — and logs
one line per marker including the native `rendered` flag. Use it when a POI
is not appearing, to separate "the Lua handle exists" from "the REDengine
effect is actually alive": from Lua the two failure modes look identical.

### Surviving `open77_interactions` restarting underneath you

`open77_interactions` declares `reload_policy "reconnect"`, so **any** change
to the session's resource set restarts it, and on restart it drops every
registered entry. A POI's marker half survives — it belongs to
`open77_worldui`'s own generation — but the prompt half silently vanishes,
leaving a visible ring with nothing to interact with.

`open77_worldui` watches `open77_interactions`' generation once a second and
re-registers every prompt it holds a spec for when that generation changes.
A caller does not need to do anything for this; it is a large part of why
the facade exists rather than every gamemode composing the two services
itself.

## Proximity zones — `open77_zones`

A zone draws nothing. It answers "the player walked into (or out of) a
circle" by polling the local character transform against every registered
sphere and firing an owner-local event on the enter/exit edge, with separate
enter and exit radii so a player standing on the boundary does not chatter.

```lua
dependency "open77_zones >=0.1.0"
```

No permission is required: the service reads the local character transform
through `Open77.character.state()`, which is ungated.

```lua
local handle

CreateThread(function()
    local result, reason = callExport("open77_zones", "create", {
        id         = "safehouse",
        position   = { x = -1460.2, y = 99.9, z = 14.8 },
        radius     = 8.0,
        enterEvent = "hideseek:safehouseEnter",
        exitEvent  = "hideseek:safehouseExit",
    })
    if not result then
        Open77.log.error("zone failed: " .. tostring(reason))
        return
    end
    handle = result.handle
end)

AddEventHandler("hideseek:safehouseEnter", function(context)
    -- context = { id, handle }
    Open77.log.info("entered " .. tostring(context.id))
end)
```

| Field | Meaning |
|---|---|
| `id` | Owner-local identifier, 1–64 characters, `[%w_:%-%.]+`. Required. |
| `position` | Static `{ x, y, z }` centre. Required; zones are not entity-attached. |
| `radius` | Enter radius in metres, `0 < radius <= 2000`. Required. |
| `hysteresis` | Metres added to `radius` to form the exit radius. A supplied value is clamped to 0.05–10.0; omitted, it defaults to `max(0.25, radius * 0.08)`. The gap between the two radii is where neither event fires. |
| `maxHeight` | Vertical tolerance either side of `position.z`. Defaults to 6.0 — Night City is vertical, and a plaza zone must not fire for a player on the overpass above it. |
| `enterEvent`, `exitEvent` | Local event names. Both optional; a zone can exist purely to be polled with `contains`. |

```lua
local inside = callExport("open77_zones", "contains", handle).inside
callExport("open77_zones", "remove", handle)
```

`contains` answers with the service's own last-polled verdict, not a fresh
read. There is no `update` export — recreate under the same `id` if the
geometry changes.

**Polling.** Every registered zone is checked against the local character
position once per tick, at one of two rates: 10 Hz (100 ms) whenever any
zone is within 50 m of the player, 2 Hz (500 ms) otherwise. The rate cannot
be set per zone. Distance comparisons are squared, and the whole poll is
skipped while the local character is not attached — menu, loading screen,
dead. A resource that needs tighter timing than 100 ms should not build it
on this service.

### A zone event is never proof

This is a **local presentation signal**. The service has no server half and
cannot have one: the OPEN//77 server runtime installs no `exports` and no
cross-resource event bus, so a "server-side zones" resource could never be
asked anything by another server resource — see
[the gamemode kernel](gamemode-kernel.md).

Every rule that depends on containment — a queue accepted, a checkpoint
claimed, a leash enforced — must be re-derived on the **server** from
`Open77.players.position` before anything is granted:

```lua
-- server
local function insideZone(playerId, centre, radius, bucket)
    local at = Open77.players.position(playerId)
    if at == nil then return false, "unknown" end          -- not "outside"
    if bucket ~= nil and at.bucket ~= bucket then return false, "bucket" end
    local dx, dy = at.x - centre.x, at.y - centre.y
    return (dx * dx + dy * dy) <= (radius * radius), "ok"
end
```

Give the server check a few metres of grace. `Open77.players.position` is a
replicated snapshot, not a live read: an honest player's latest position may
not have landed yet, and the check exists to stop a client claiming to be
somewhere else entirely, not to arbitrate centimetres. And distinguish
"outside" from **"cannot tell"** — an unreadable position must freeze an
accumulator, never reset it. See
[Writing a gamemode](writing-a-gamemode.md) for that pattern in full.

## Nameplates

Nameplates label remote players. They require `ui.nameplates`, and overrides
are owner-scoped: another resource cannot change or remove yours.

```lua
permissions { "ui.nameplates" }
```

```lua
Open77.nameplates.set(playerId, {
    label       = "Officer Reyes",
    color       = "#22D8E2",
    maxDistance = 60.0,
    visible     = true,
    showDistance = true,     -- native path only
})
Open77.nameplates.remove(playerId)
Open77.nameplates.clear()
```

There are three delivery paths, in decreasing order of preference:

```lua
-- 1. Native drawing. No WebUI surface is created at all.
--    `and` rather than a bare call: a client older than the native drawer has
--    no `render` at all, and indexing nil would take the whole resource down.
if Open77.nameplates.render ~= nil and Open77.nameplates.render(true) then
    return
end

-- 2. Native per-frame delivery to a page you own.
local ok, reason = Open77.nameplates.stream(page)
if ok then return end

-- 3. Last resort on an older client: poll and push it yourself.
CreateThread(function()
    while page do
        page:send("nameplates:update", { players = Open77.nameplates.snapshot() })
        Wait(33)
    end
end)
```

`Open77.nameplates.render(false)` and `Open77.nameplates.stopStream()` undo
paths 1 and 2. Both are released automatically on resource stop, reload,
world exit, and when the page is destroyed — asking explicitly is what keeps
a reload from leaving one frame painted.

Nameplates are the instructive case for the rule at the top of this page.
`Open77.nameplates.snapshot()` was *already* projected natively and already
correct; only the **delivery** sat on a `Wait(33)` loop, and that alone was
enough to make plates lag. The event name and payload are identical across
paths 2 and 3 — `nameplates:update` carrying
`{ players = { { id, label, color, x, y, distance } } }` — so a page that
already handles it needs no edit.

## HUD ground circles — `open77_groundcircle`

`open77_groundcircle` samples points on a world-space circle, projects each
one with `Open77.camera.project`, and strokes the result as an SVG polyline
on a transparent HUD surface. It needs no game asset at all, so what the
player sees is exactly what Lua computed, with no engine-side render path
left to fail silently.

| Export | Signature |
|---|---|
| `create` | `create(definition)` |
| `remove` | `remove(handle)` |
| `list` | `list()` |
| `clear` | `clear()` |

`create` deliberately reads the same field names `open77_worldui.create`
reads — `id`, `position`, `radius`, `maxDistance`, `style`, `groundOffset`,
`color` — and **ignores** the prompt half of that definition rather than
rejecting it, so the identical definition table can be handed to either
resource and switching a caller over is a one-line change.

Three honest caveats:

- It is a **screen overlay**. It is not occluded by walls, does not receive
  light, and does not exist for any other player.
- It is sampled on the **Lua tick**, not per frame, so the ring trails the
  view under a fast camera whip.
- Like every resource, it is only reachable if the server's resource set
  actually includes it. Add `dependency "open77_groundcircle"` and confirm
  the server is serving it before relying on the export.

It is a diagnostic and a fallback for when the native marker path is not
producing pixels, not a replacement for a world marker. For a ground ring
that must be frame-tight, prefer `Open77.anchors` with `render = "ring"`.

> A ground circle cannot be drawn from a single anchored centre point plus a
> radius. Perspective maps a ground circle to an ellipse whose axes and
> orientation depend on the camera's pitch and roll, and an anchor reports
> neither the camera basis nor the field of view. The approximation is worst
> at exactly the distance where a ready-up ring matters — a 2 m ring seen
> from 3 m has a 5:1 near-to-far depth ratio — and standing *inside* the
> circle the centre is behind the camera plane and stops reporting
> altogether. `render = "ring"` projects the ring point by point for this
> reason.

## Lifecycle and cleanup

Everything on this page is owned by a **resource generation**. When your
resource stops or hot-reloads, its generation ends and the platform releases
what it owned: markers, anchors, nameplate overrides and streams, POIs,
zones, WebUI pages, scheduled tasks and event handlers. You do not have to
unwind them by hand to avoid a leak.

You *should* unwind them anyway where it is cheap, and you **must** handle
two rebuild cases that are easy to miss.

### Rebuild on start, not only on `worldReady`

`open77:worldReady` fires more than once per session — **and not at all
after a hot reload**, because the world is already up. A client resource
that only builds on that event loses everything it owned on the first reload
and never recreates it.

```lua
local announced = false

local function build()
    -- create markers, POIs, zones, anchors...
end

local function teardown()
    -- remove what build() created, so build() is safe to call twice
end

AddEventHandler("open77:worldReady", function()
    if announced then return end
    announced = true
    build()
end)

AddEventHandler("onClientResourceStart", function(name)
    if name ~= GetCurrentResourceName() then return end
    CreateThread(function()
        Wait(500)
        if announced then return end
        local state = Open77.character.state()
        if not state or not state.attached then return end   -- fresh session; wait for worldReady
        announced = true
        build()                                              -- reloaded into a live world
    end)
end)

AddEventHandler("onClientResourceStop", function(name)
    if name ~= GetCurrentResourceName() then return end
    announced = false
    teardown()
end)
```

This is the pattern the shipped `race` resource uses verbatim.

### Ownership comes from the caller, never from an argument

Every service on this page derives ownership from `GetInvokingResource()`
inside the export, not from a name you pass in. `remove`, `list` and
`contains` are scoped to the caller, and a handle belonging to another
resource is refused with `not_owner`. If you are writing a service of your
own, do the same — accepting an owner name as a normal Lua argument would
let any resource act as any other.

## Quotas at a glance

| Surface | Limit |
|---|---|
| `Open77.anchors` | 32 per resource, 128 across the client |
| `open77_worldui` POIs | 128 across every resource combined (`poi_limit`) |
| `open77_zones` zones | 256 across every resource combined (`zone_limit`) |
| WebUI surfaces | 8 per resource |

A resource that can define more world points than its anchor budget has to
decide which ones deserve a slot right now. `open77_interactions` is the
worked example: it anchors only entries within their show distance, ranked
by whether the player is already close enough to trigger them, then by the
latched entry, then by priority and proximity — and falls back to
`Open77.camera.project()` for whatever misses out, so nothing ever
disappears, it is only less smooth.

## Failure values

Every API here follows the platform convention: a value on success, or
`nil, reason` — services reached through `Open77.exports.call` answer with a
table carrying `ok` and, on failure, `error`.

| Reason | Meaning |
|---|---|
| `permission_denied:world.markers` | The manifest did not request the permission. |
| `invalid_argument` | A field is missing, malformed, or out of range. |
| `not_found` / `zone_not_found` | No such handle for this owner. |
| `not_owner` / `owned_by_another_resource` | The handle belongs to a different resource. |
| `quota_exceeded` / `poi_limit` / `zone_limit` | The relevant limit above is full. |
| `surface_unavailable` | The target WebUI page does not exist or was destroyed. |
| `anchor_kind_mismatch` | Patching a field the anchor's kind does not own. |
| `position_or_entity_required` | An anchor was created with both, or neither. |
| `render_is_not_patchable` | `render` was passed to `update`. It is fixed at creation. |
| `export_call_required` | A service export was called outside an export invocation. |
| `anchors_backend_unavailable` | No game backend — a validation host or the dedicated server. |

## See also

- [Contextual interactions](interactions.md) — the full prompt definition
  reference, choices, hold keys and entity attachment.
- [Blips and map pins](blips.md) — the map and minimap, which is a different
  problem from drawing in the world.
- [Visual and audio effects](effects.md) — REDengine VFX and spatialised
  sound at a world point.
- [The Lua resource runtime](resource-runtime.md) — WebUI pages, the
  scheduler, and the sandbox these APIs live in.
- [Writing a gamemode](writing-a-gamemode.md) — where the drawing goes in a
  real mode, and why the server must re-derive everything the client reports.
