# PolyZone

`polyzone` provides the familiar PolyZone functional API, adapted to Open77.
All zone queries and watchers execute **client-side in the importing resource**.
No GTA natives or Cfx vector userdata are required: coordinates are ordinary
`{x, y, z}` tables in Cyberpunk world space. Names and methods follow upstream
[PolyZone 2.6.2](https://github.com/mkafrin/PolyZone); engine bindings and the
editor are Open77-specific.

## Install and import

New to `require`? Read [Lua modules and require](lua-modules.md) for local
modules, published dependencies, caching and the difference from exports.

Add `polyzone` and your resource to the server's `resources.load`. Declare:

```lua
dependency 'polyzone >=1.0.0'
permissions { 'world.query', 'world.debug', 'ui.vanilla.map', 'network.events', 'local.events' }
```

Only declare permissions you use: mathematical containment needs none;
player/entity reads need `world.query`; debug drawing needs `world.debug`;
debug map blips need `ui.vanilla.map`; network/local event operations need the
corresponding event permission.

```lua
local PZ = assert(require('@polyzone'))
local PolyZone, BoxZone = PZ.PolyZone, PZ.BoxZone
local CircleZone, EntityZone, ComboZone = PZ.CircleZone, PZ.EntityZone, PZ.ComboZone
-- Optional alternative: PZ.installGlobals()
```

This requires the client update adding dependency modules and native geometry;
installing the Lua folder alone does not upgrade an older client. The import
returns `nil, reason` on a missing/stopped/undeclared dependency.

## Shapes

```lua
local plaza = PolyZone:Create({
    {x=100,y=100}, {x=115,y=100}, {x=115,y=110},
    {x=108,y=110}, {x=108,y=120}, {x=100,y=120},
}, {name='plaza', minZ=20, maxZ=28, data={job='taxi'}})

local garage = BoxZone:Create({x=150,y=100,z=20}, 12, 6, {
    name='garage', heading=45, minZ=19, maxZ=25,
    scale={1,1,1}, offset={0,0,0},
})

local area = CircleZone:Create({x=120,y=120,z=20}, 15, {name='area'})
local sphere = CircleZone:Create({x=120,y=120,z=20}, 15, {name='sphere',useZ=true})
```

- Polygon: concave XY winding-number containment; optional inclusive Z limits.
  Concave shapes are supported; use simple, non-self-intersecting polygons.
  Edge classification follows winding-number rules; it is not universally
  inclusive. Z is independent of the Z values of polygon vertices.
- Box: `length` is local Y, `width` is local X. Heading is degrees rotating
  around +Z. Box faces and Z limits are inclusive. `scale`/`offset` accept
  three symmetric values `{length,width,height}` or six asymmetric values
  `{forward,back,left,right,up,down}`. Offsets are metres, scales multipliers.
- Circle: unbounded in Z by default. `useZ=true` makes a sphere. The radius
  comparison is strict: a point exactly on the radius is outside.

Common options: `name`, `data`, `debugPoly`, `debugBlip`, `debugColors`
(`walls`, `outline`, `grid`, RGB arrays), `debugColor` (circle RGB), and the
Open77 extension `debugDistance` (default 250 metres).

### Methods

| Class | Methods |
|---|---|
| All zones | `:new(...)`, `:Create(...)`, `:isPointInside(point)`, `:onPointInOut(getPoint,callback,intervalMs?)`, `:onPlayerInOut(callback,intervalMs?)`, `:setPaused(bool)`, `:isPaused()`, `:destroy()`, `:draw(force?)`, `:addEvent(name)`, `:removeEvent(name)`, `:addDebugBlip()` |
| Polygon / box | `:getBoundingBoxMin()`, `:getBoundingBoxMax()`, `:getBoundingBoxSize()`, `:getBoundingBoxCenter()`, `:TransformPoint(point)` |
| Box | `:getHeading()`, `:setHeading(degrees)`, `:setCenter(point)`, `:getLength()`, `:setLength(metres)`, `:getWidth()`, `:setWidth(metres)` |
| Circle / sphere | `:getCenter()`, `:setCenter(point)`, `:getRadius()`, `:setRadius(metres)` |
| Entity | Box containment plus `:getCenter()`, `:onEntityDamaged(callback)`; the entity's transform overrides manual placement setters |
| Combo | `:AddZone(zone)`, `:RemoveZone(nameOrPredicate)`, `:getZones(point)`, `:isPointInside(point,name?)`, `:isPointInsideExhaustive(point,outArray?)`, `:onPointInOutExhaustive(getPoint,callback,intervalMs?)`, `:onPlayerInOutExhaustive(callback,intervalMs?)`, `:addEvent(eventName,zoneName?)`, `:printInfo()` |

`getBoundingBox*` refers to the box's unrotated local-axis bounds placed at
its centre, as upstream does; it is not a world-axis AABB of the rotated box.
Use `TransformPoint` on corners when you need world corners.

Utilities: `PolyZone.getPlayerPosition()`, `PolyZone.getPlayerHeadPosition()`,
`PolyZone.rotate(origin,point,degrees)`, `PolyZone.drawPoly(zone,force?)`,
`BoxZone.calculateMinAndMaxZ(minZ,maxZ,scaleZ,offsetZ)` and
`PolyZone.ensureMetatable(value)` (rehydrates methods without exposing metatable
mutation; serialized callbacks, references and debug registrations are not restored).
Prefer constructors for saved configuration. Open77 extensions: `PZ.list()`,
`PZ.destroyAll()`, `PZ.serialize(zone)` and watcher cancellation handles.

## Entry / exit and groups

```lua
local all = ComboZone:Create({plaza, garage, area}, {name='job_areas'})
local cancel = all:onPlayerInOutExhaustive(function(inside, position, current, entered, left)
    for _, zone in ipairs(entered or {}) do print('enter '..zone.name) end
    for _, zone in ipairs(left or {}) do print('exit '..zone.name) end
end, 250)
```

Polling defaults to 500 ms; `0` checks each frame. These are sampled positions,
not swept collision tests: a player can cross a thin zone between polls.
Base shapes emit only state transitions from an initial outside state; Combo
also emits its first outside sample. The normal Combo callback is
`callback(inside, point, zone)` and does not report overlapping member changes
while the combined flag stays true. The exhaustive callback above does.
`entered`/`left` are nil when there is no change in that direction.

`setPaused(true)` pauses callbacks, not explicit containment queries. `cancel()`
removes only that watcher. Destroying a Combo destroys its remaining children;
`RemoveZone` returns the removed child without destroying it. Avoid sharing
children between independently owned groups if destroying one must not affect
the other. Cyclic groups are rejected. Member priority follows insertion order.

Missing player incarnation or a streamed-out entity produces an outside state,
not a fake position at world origin. It can emit one exit and later re-enter.
Head position is nil when the native Head slot is unavailable.

## Moving entities

```lua
-- Typed network references survive a change of local presentation handle.
local trunk = EntityZone:Create({kind='vehicle',id=vehicleId}, {
    name='vehicle_area', useZ=true, offset={1,1,0.5},
})
local npcArea = EntityZone:Create({kind='npc',id=npcId}, {useZ=true})
local playerArea = EntityZone:Create({kind='player',id=playerId}, {useZ=true})
local localPlayerArea = EntityZone:Create(0, {useZ=true})
```

A numeric value is a generation-checked **local entity handle**, not a network
vehicle ID or raw REDengine pointer. `0` denotes the local player. Prefer typed
IDs for replicated entities. Headings and Z envelopes follow the entity;
pitch/roll are included when computing the eight-corner vertical envelope.
XY containment remains a yaw-oriented box, matching the EntityZone convention.

Dimensions come from currently loaded static/skinned component mesh bounds,
including camera-hidden body parts so switching to FPP does not remove them.
They are reference mesh bounds, not an animation-deformed collision hull or GTA
model dimensions. If bounds are unavailable, the
zone is outside and exposes `zone.error`. You can supply explicit local-space
`dimensions={min={x,y,z},max={x,y,z}}` to define a stable interaction volume.
No new asset streaming is requested by the geometry query.

`onEntityDamaged(function(died, attackerId, weapon, isMelee, details) ... end)`
observes canonical health decreases at 50 ms intervals. `details` includes
health and revision. This is **not a per-hit GTA event**: damage followed by
healing between samples can be missed, and several hits may collapse into one
observation. `attackerId` is a network player ID when available; `weapon` is nil
when the protocol provides no weapon. Do not treat these as GTA handles/hashes.
Use server combat events for authoritative damage logic.

## Grid and debug performance

Polygons support `useGrid` (default true), `lazyGrid` (default true), and
`gridDivisions` (default 30, range 1–256). Full interior cells skip the winding
test; edge cells still use exact containment. Eager construction yields to the
resource scheduler. `debugGrid=true` builds the grid eagerly.

Combos use a sparse broadphase. Moving entities and nested combos are checked
dynamically; resizing/repositioning a static member invalidates the index.
There is no permanent polling coroutine when a VM has no watchers or debug zones.

Debug wireframes/walls use Open77's native compositor, not a continuously updated
CEF page. They are developer overlays, **visible through scenery**, not depth-tested
meshes. Geometry is bounded by quotas and expires if not refreshed. Large debug
grids display a bounded subset of cells; containment still uses the full grid.
An oversized debug shape can exceed the drawing quota without affecting its
containment queries. Debug geometry is composited below WebUI menus.
Keep `debugPoly`/`debugGrid` disabled in normal player resources.

## Zone-filtered events

```lua
-- Client, in a resource importing PolyZone:
plaza:addEvent('taxi:announcement')
AddEventHandler('taxi:announcement', function(text) print(text) end)

-- Server, in a coroutine / command / event handler:
local pending, reason = Open77.exports.call('polyzone', 'TriggerZoneEvent', 'taxi:announcement', 'Taxi available')
if pending then
    local ok, error = pending:await()
    if not ok then print(error) end
else print(reason) end
```

The provider broadcasts `__PolyZone__:<event>` and the consumer delivers the
local event only if the player is inside. There is deliberately no arbitrary
client-to-server broadcast relay. Client zone checks are conveniences, **not
security boundaries**: the server must validate proximity, buckets and job rules
before awarding money/items or authorizing actions.

## Editor

Grant `command.pzcreate`, `command.pzadd`, `command.pzundo`, `command.pzfinish`,
`command.pzlast`, `command.pzcancel`, `command.pzcomboinfo`, `command.pzedit`
to trusted developers using the server ACL.

- `/pzcreate poly|box|circle [name] [length-or-radius] [width]`: begin at your feet.
- `/pzadd`, `/pzundo`: add/remove a polygon point (maximum 128 editor vertices).
- `/pzedit`: show/hide the WebUI editor; F9 releases/reacquires focus.
- F10: add a vertex while walking. Fields edit size, heading, height or sphere mode.
- `/pzfinish`: produce Lua, keep a local KVP backup and request a server save.
- `/pzlast [name]`: repeat the last completed box/circle at your current position.
- `/pzcancel`: discard the draft. `/pzcomboinfo`: print active Combo counts.

Exports append to `polyzone/data/polyzone_created_zones.txt`; the server checks
`command.pzfinish` again and limits size/frequency. Generated code is never
executed automatically. Use Copy to paste it into your own resource.
The editor is a local authoring tool; the server ACL protects persistent saves.

## New engine API and lifecycle

`Open77.world.entityGeometry(handleOrTypedReference)` (`world.query`) returns
`{attached,entity,position,forward,orientation,bounds?,head?,damage?}` or `nil,reason`.
`bounds` contains `min`, `max`, `source='loaded_mesh_bounds'`. `orientation` is
`{x,y,z,w}`. Missing bounds/head/health are omitted, never fabricated.

```lua
local ok, reason = Open77.debugDraw.set('my-area', {
    lines={{a={x=0,y=0,z=20},b={x=5,y=0,z=20},color='#19d5e0ff'}},
    triangles={}, ttl=0.5, maxDistance=250, thickness=1.5,
})
Open77.debugDraw.clear('my-area') -- clear() clears only this resource's geometry
```

`world.debug` is needed to set geometry. Coordinates must be finite and bounded
to ±1,000,000. Colours use `#RRGGBB` or `#RRGGBBAA`. Limits: 512 lines and 256
triangles per batch, 32 tags per resource, 128 total batches, 8,192 total input
vertices. TTL is 0.05–10 seconds, maximum distance 1–5,000 metres, thickness
0.5–8 pixels. Replacing a tag is atomic; invalid input returns `nil,reason`.

`require('@provider/module')` runs only an explicitly published `files` entry of
a declared, running dependency. It executes in the **caller's** VM, budget and
permissions. Imports are cached by resolved module path; circular imports are
rejected. Each consumer therefore owns independent zones and callbacks. No
Lua function or mutable zone object crosses a VM boundary.

Stopping/reloading a consumer cancels its tasks/handlers and releases its blips
and debug drawings. Startup failure, task failure and validation cleanup also
release native drawings; TTL is a backstop. Reload consumers to pick up changed
library code: existing Lua references do not silently change implementation.
No wire-protocol change or dedicated-server C# change is required for this port.
