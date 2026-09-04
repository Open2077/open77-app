# World queries: raycast, ground height, objects around the player

Client resources can ask the physics world two questions: *what is on this line* and *what is
around me*. Both run one engine native each, synchronously on the game thread, behind the
`world.query` permission.

```lua
resource "aim_tools"
version "1.0.0"
client_script "client/main.lua"
permissions { "world.query" }
```

## Rays

`Open77.world.raycast(from, to, options?)` traces the segment and returns the nearest blocking
surface. `Open77.camera.aimRay(maxDistance?, options?)` is the same trace from the camera along its
forward vector, which is what "put it where I am looking" needs. `Open77.world.groundZ(x, y, fromZ?)`
is a downward, static-only trace that returns the height of the ground.

```lua
-- Place a marker exactly where the reticle points, pavement included.
RegisterKeyMapping("mark_here", "Mark aim point", "keyboard", "F6")
RegisterCommand("mark_here", function()
    local ray, reason = Open77.camera.aimRay(150)
    if ray == nil then print("aimRay unavailable: " .. tostring(reason)) return end
    if not ray.hit then print("nothing within 150 m") return end
    Open77.markers.create({ position = ray.position, label = ray.material })
end)

-- Snap a spawn point to the ground it is above.
local function snapToGround(point)
    local z = Open77.world.groundZ(point.x, point.y, point.z + 50)
    if z ~= nil then point.z = z end
    return point
end
```

A hit is `{ hit = true, position, normal, material, distance }`; a clear line is `{ hit = false }`.
`nil, reason` means the query itself could not run: no permission, invalid input, or a host without
the physics system (the dedicated server never has one).

The trace looks at the `Static` and `Dynamic` collision groups and keeps the nearer hit; pass
`{ dynamic = false }` to ignore vehicles, bodies and props, or `{ static = false }` to see only them.
`groundZ` is static-only on purpose: a parked car is not the ground.

What a hit does **not** carry is the entity. The engine's trace result publishes position, normal
and material and nothing else that is documented; Open77 reads nothing it cannot prove. To learn
what you hit, search around the hit point with `Open77.world.nearest`.

## Objects around the player

`Open77.world.nearby(radius, filter?)` lists every object within `radius` metres of the local
player, nearest first; `Open77.world.nearest(radius, filter?)` returns the first one or `nil`.

```lua
for _, hit in ipairs(Open77.world.nearby(20, { "device" }) or {}) do
    print(("%s at %.1f m (engine id %d)"):format(hit.className, hit.distance, hit.engineEntity))
end

local car = Open77.world.nearest(6, "other")
```

Each hit is `{ engineEntity, className, position, distance }`. `engineEntity` is the engine's own
id and is stable for the life of the object; key on it.

`filter` narrows the object classes. It is a class name, a list of names, or a raw engine mask:

| Name | Meaning |
|---|---|
| `player`, `puppet`, `sensor`, `device`, `other` | Object classes. Absent means all five. |
| `friendly`, `hostile`, `neutral` | Attitude bits. |
| `alive`, `dead` | Life state bits. |
| `turnedOn`, `turnedOff`, `quickHackable` | Device state bits. |

The engine matches on *any* set bit, so attitude and state bits widen a search rather than
narrow it: `{ "puppet", "hostile" }` returns every puppet and everything hostile. Filter the result
in Lua when you need an intersection.

Two limits are the engine's, not Open77's:

- The search is centred on the local player, because the native takes a *source object*, not a
  point. To look around somewhere else, stand there. Radius is capped at 1000 m.
- The first call of a session can answer `nil, "part_layout_not_proven"`. The result structure the
  engine returns is undocumented, and Open77 proves where the object handle sits inside it by
  identity, which needs something targetable under the crosshair once. Treat it as "try again".

## Cost and etiquette

Each call is one native call on the game thread, inside the caller's own instruction budget.
A ray per frame is cheap; a 1000 m `nearby` per frame is not, and neither is a hundred rays in one
tick. Cache what does not move (ground heights, door positions) and trace on events, not on timers.

The server has no physics world: none of these exist server-side. A gamemode that needs a line of
sight on the server asks a client for it and treats the answer as an observation, never as
authority.
