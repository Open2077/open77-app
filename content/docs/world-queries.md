# World queries: raycast, ground height, objects around the player, entity axes, district

Client resources can ask the world three questions: *what is on this line*, *what is around me*,
and *where am I*. Each runs one or two engine calls, synchronously on the game thread, behind the
`world.query` permission.

A fourth question — *which way is that thing facing, and where is a point relative to it* — is
[further down](#an-entitys-own-axes) and behind its own `world.transform` permission.

```lua
resource "aim_tools"
version "1.0.0"
client_script "client/main.lua"
permissions { "world.query", "world.transform" }
```

Two things the examples below rely on, because they are the commonest way a first world-query
resource fails to run: **there is no client `RegisterCommand`** — commands are server-side, and the
chat sends `/x` to the server — and `RegisterKeyMapping` takes a **callback**, not a FiveM-style
`("keyboard", "F6")` pair. Its real contract is in [Key bindings](keybindings.md).

## Rays

`Open77.world.raycast(from, to, options?)` traces the segment and returns the nearest blocking
surface. `Open77.camera.aimRay(maxDistance?, options?)` is the same trace from the camera along its
forward vector, which is what "put it where I am looking" needs. `Open77.world.groundZ(x, y, fromZ?)`
is a downward, static-only trace that returns the height of the ground.

```lua
-- Place a marker exactly where the reticle points, pavement included.
-- RegisterKeyMapping(id, name, defaultKey, onPressed) -- see the keybindings guide.
-- Add `permissions { "input.actions", "world.query", "world.markers" }` to the manifest.
RegisterKeyMapping("mark_here", "Mark aim point", "F6", function()
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

### What the ray hit

A plain hit carries geometry only. The engine's trace result publishes position, normal and
material and nothing else that is documented, and Open77 reads nothing it cannot prove.

Pass `{ entities = true }` and the result gains an `entity` table when the ray stopped on an object
rather than on the world:

```lua
local hit = Open77.world.raycast(from, to, { entities = true })
if hit and hit.hit and hit.entity then
    if hit.entity.playerId then
        print(("hit player %d in the %s"):format(hit.entity.playerId, hit.entity.kind))
    else
        print(("hit a vanilla %s (%s)"):format(hit.entity.kind, hit.entity.className))
    end
end
```

`entity` is `{ engineEntity, className, kind, position, distance }` plus **one** of `playerId`,
`vehicleId` or `npcId` when the thing belongs to Open77. A vanilla NPC or a parked car gets the
engine identity and the class name and no Open77 id, which is the honest answer rather than a
missing one. `kind` is the same vocabulary `Open77.inspector.target` uses -- `player`, `npc`,
`vehicle`, `door`, `device`, `weapon`, `item`, `object` -- because it is the same table.

`Open77.camera.aimRay(maxDistance?, { entities = true })` takes the option too, and is usually the
call you actually want: "what is the reticle on" is the targeting and shot-validation question.

Three things to know before you build on it:

- **Without the option nothing changes.** The returned table is identical to what it has always
  been, so adding the option to one call site does not affect another.
- **Most rays have no entity, and that is correct.** A wall, a road or a railing is world geometry
  and is not an object. `hit.entity == nil` on a hit is the ordinary outcome, not a failure.
- **The attribution is a search, not a property of the trace.** Open77 finds the object standing at
  the hit point using the same search `Open77.world.nearest` runs, which is centred on the local
  player -- so a hit more than 250 m away is reported as geometry with no entity, and the first
  call of a session can answer `nil, "part_layout_not_proven"` for the reason given under
  [Objects around the player](#objects-around-the-player).

## Where you are

`Open77.world.district(position?)` names the place the local player is standing in.

```lua
local place = Open77.world.district()
if place then
    -- "Dispatch: unit reported in ClairesGarage"
    Open77.chat.addMessage(("Dispatch: unit reported in %s"):format(place.subDistrict or place.district))
end
```

The result is `{ district, subDistrict?, localized? }`. `district` is a `gamedataDistrict` name --
`Watson`, `Dogtown`, `Arroyo`, `Pacifica` -- so it is a stable identifier you can branch on, not
display text. `subDistrict` is the finer place inside it (`ClairesGarage`, `DryCreek`) and is
**absent, not empty**, where the world has nothing finer authored, which is most of it. `localized`
is the record's own display name.

`open77:districtChanged` fires when the player crosses a border, with the same table:

```lua
AddEventHandler("open77:districtChanged", function(place)
    print(("now in %s"):format(place.district))
end)
```

The first reading after a world load is **not** a change and raises no event: a resource starting
mid-session would otherwise announce an arrival that happened ten minutes ago. Call
`Open77.world.district()` for "where am I now" and listen to the event for "you just moved".

### Two limits, and they are the engine's

**`position` may only be the player's own.** It is accepted within 25 m of the local player and any
other position is refused with `position_not_local`. Cyberpunk resolves a district by *trigger
volume*: an area node fires when the player's collider crosses it, and the volume geometry is baked
sector data with no getter. Nothing in the engine maps an arbitrary coordinate to a district, so
Open77 will not invent one -- a dispatch that printed a guessed district would look exactly like
one that printed the right district.

To put another player's location in a report, have their client publish it. The district travels
with a normal event; the server has no world to ask.

**There is no `Open77.world.street`, and there will not be until the engine grows one.** Cyberpunk
has street *names* but no street *layer*: they exist as text painted onto sign meshes by whoever
placed the sign, not as anything attached to a coordinate. The whole compiled script bundle was
searched -- every "street" symbol in it is either Street Cred, the RPG stat, or a sign record. If
you are porting a script that calls `GetStreetNameAtCoord`, the district is what you have, and it
is a real answer rather than a plausible one.

For exact cursor-based selection, `Open77.camera.screenRaycast` in [screen picking](screen-picking.md)
is the other half of the answer: it resolves the native physics owner of the proxy the ray stopped on
rather than the nearest streamed object, and reports its network identity when it has one. Use it when
"which entity" has to be exact, as for a context menu; use `{ entities = true }` when a nearest-object
attribution within a tolerance is what the scenario means, as for a shot fired down a corridor.
Do not use `world.nearest` as proof of what a ray hit: that query is centred on the player, and
proximity is not collision ownership.

## Objects around the player

`Open77.world.nearby(radius, filter?)` lists every object within `radius` metres of the local
player, nearest first; `Open77.world.nearest(radius, filter?)` returns the first one or `nil`.

```lua
for _, hit in ipairs(Open77.world.nearby(20, { "device" }) or {}) do
    print(("%s at %.1f m (engine id %d)"):format(hit.className, hit.distance, hit.engineEntity))
end

local car = Open77.world.nearest(6, "other")
```

Each hit answers two separate questions, and keeping them apart is the whole of this section.

| Field | |
|---|---|
| `engineEntity` | the engine's own id, stable for the life of the object; key on it |
| `kind` | what it is, refined by ownership -- see below |
| `family` | what it is, unrefined: `player`, `npc`, `vehicle`, `puppet`, `device`, `door`, `weapon`, `item`, `object`, `unknown` |
| `className` | the engine class name |
| `position` | world position -- a plain `{ x, y, z }` table, which **is** a [vector3](vectors.md) |
| `distance` | metres from the local player |
| `playerId` / `vehicleId` / `npcId` | **at most one of the three**, and only when Open77 owns the entity |

### What is it, and is it ours

`kind` comes from the same classifier the [raycast row](#what-the-ray-hit) uses -- there is exactly
one, deliberately, because two tables mapping engine classes to names is how two surfaces start
disagreeing about what a thing is. It is then refined by whether Open77 owns the entity:

| Open77 owns it | Vanilla owns it |
|---|---|
| `npc` | `populationNpc` |
| `vehicle` | `trafficVehicle` |
| `player` | (a player body always has a `playerId`) |
| `device`, `door`, `item`, `weapon`, `object` | unchanged -- there is no Open77-owned counterpart to tell them apart from |

`family` is the unrefined answer, for a caller that means "is this a ped at all" rather than "is it
one of ours". A row with none of `playerId`, `vehicleId` or `npcId` is **local scenery**: nothing
replicates it, every client sees a different one, it can be gone next frame, and there is nothing to
write state onto. That is the distinction a targeting resource needs, and it is why the two
questions are two fields.

```lua
for _, hit in ipairs(Open77.world.nearby(20, { "puppet" }) or {}) do
    if hit.npcId then
        print("a server NPC we can command:", hit.npcId)
    elseif hit.kind == "populationNpc" then
        -- Read-only. Addressed by engine id, because it has no Open77 id.
        local state = Open77.character.state({ engineEntity = hit.engineEntity })
        print("scenery:", state and state.health, state and state.source)  -- "observed"
    end
end
```

Reading a vanilla body answers with `source = "observed"` and `owned = false`, `id` is `0`, and only
what can be read straight off the object is filled in -- placement, orientation and health.
Locomotion, weapon and vehicle state come from Open77's own replication and are left unset rather
than guessed at. `entity_not_observed` means "not in the streamed set from here", which for a
vanilla ped is an ordinary outcome. There is no write counterpart: every mutator is keyed by an
Open77 id and answers `npc_not_found` for one of these.

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

## An entity's own axes

Everything above answers in world coordinates. This answers in an **entity's** coordinates: two
metres in front of the player, a metre to the right of a car, where a body's head is. It is the
other half of targeting, and it is what FiveM spells `GetOffsetFromEntityInWorldCoords`,
`GetEntityForwardVector`, `GetWorldPositionOfEntityBone` and `GetEntityBoneIndexByName`.

```lua
permissions { "world.transform" }
```

```lua
-- Drop a crate two metres ahead of the player, at their feet.
local here = Open77.character.offsetToWorld(vector3(0, 2, 0))
Open77.props.spawn({ model = "crate", position = here })

-- The same question about somebody else's car, and about the space behind it.
local boot = Open77.character.offsetToWorld(vehicleEntityId, vector3(0, -2.6, 0))

-- And the inverse: is that thing in front of me or behind me?
local local_ = Open77.character.worldToOffset(target.position)
if local_.y > 0 then print("ahead of me, " .. local_.y .. " m") end
```

The offset is in the entity's own frame: **`+y` is ahead, `+x` is its right, `+z` is up**. That is
REDengine's convention, not a choice made here — yaw 0 faces `+y` everywhere in this engine.

| Call | Result | |
|---|---|---|
| `frame(entity?)` | `{ position, forward, right, up }` | the whole basis in one engine pass |
| `forward(entity?)` | `{ x, y, z }`, unit length | `GetEntityForwardVector` |
| `offsetToWorld(entity?, offset)` | `{ x, y, z }` | a point in the entity's frame, in world coords |
| `worldToOffset(entity?, point)` | `{ x, y, z }` | the exact inverse |
| `bones(entity?)` | array of slot names | what this body can actually be asked about |
| `bonePosition(entity?, name)` | `{ x, y, z }` | the world position of one slot |
| `boneAliases()` | `{ { alias, slot }, ... }` | the alias table, as data |

`entity` is the same argument every `Open77.character` call takes: absent or `0` for the local
player, an Open77 entity id for a body or vehicle Open77 owns, or `{ engineEntity = n, radius = r }`
for one the vanilla world owns. `offsetToWorld` and `worldToOffset` also accept the vector alone —
`offsetToWorld(vector3(0, 2, 0))` means "two metres ahead of me" — because a target table always
carries `engineEntity` and a vector never does, so no shape can be read both ways. A lone table with
`engineEntity` and no vector is `invalid_offset`, not a silent local-player read.

**The basis is read from the engine, never rebuilt from the orientation.** `entEntity` publishes
`GetWorldForward`, `GetWorldRight` and `GetWorldUp`, and `GetWorldForward` is the same native
`Open77.character.state().forward` already answers with. So `forward()` and `state().forward` are
one value by construction, not two derivations that agree today. Re-deriving a basis from the
orientation quaternion would have been the second derivation, and that is exactly the bug an earlier
wave paid for on vehicle heading.

For a vehicle on a slope, pitch and roll are in the answer, because they are in the engine's axes:
`offsetToWorld(car, vector3(0, 3, 0))` lands ahead of the car *along the car*, following the
gradient, not on the flat. Flatten it yourself if you want a ground point — `world.groundZ` is right
there.

### Slots, not bones

Cyberpunk has **no `GetEntityBoneIndexByName`**. What an entity publishes is
`entSlotComponent::slots[].slotName`, authored per entity, readable through the native
`entSlotComponent::GetSlotTransform`. There is no fixed skeleton vocabulary to hand out, so the API
inverts FiveM's shape: `bones(entity)` tells you what this particular body carries, and
`bonePosition` answers for a name that is in it.

```lua
for _, slot in ipairs(Open77.character.bones()) do print(slot) end
local head = Open77.character.bonePosition("head")     -- alias
local hand = Open77.character.bonePosition("RightHand") -- or the engine's own name
```

Names are matched case- and punctuation-insensitively, so `RightHand`, `right_hand` and
`right hand` are the same request. Five aliases expand to engine slot names measured on 2.31 bodies:

| Alias | Engine slots tried, in order |
|---|---|
| `head` | `Head` |
| `pelvis`, `hips` | `Hips` |
| `left_hand` | `LeftHand`, `left_hand` |
| `right_hand` | `RightHand`, `right_hand` |

**`chest` and `feet` are deliberately absent, and so is `hands`.** Nothing measured on a 2.31 body
publishes a slot under any spelling of chest or feet, so offering the names would ship words that
always answer `unknown_bone`; and a pair of hands is not one position, so ask for `left_hand` or
`right_hand`. An alias is a convenience and never a promise either: every candidate is checked
against that body's own slot table, so an alias on a body that does not carry it is refused by name
rather than quietly answered from somewhere else.

The same call works on a **vehicle**, because occupant slots live on a `gameOccupantSlotComponent`
and that derives from `entSlotComponent`: `bones(carEntityId)` enumerates the seats the car actually
authored. There is still no `trunk`/`hood`/`door` vocabulary — that is the same finding the
[interactions guide](interactions.md) records, and `part` is the answer there.

An **empty** list from `bones()` is a real answer, not a failure: most entities carry no slot
component at all.

### Reasons

| Reason | Meaning |
|---|---|
| `permission_denied:world.transform` | the resource does not hold `world.transform` |
| `entity_unavailable` | no such Open77 entity |
| `entity_not_observed` | the `engineEntity` form found nothing within `radius` |
| `entity_not_attached` | the body exists but is not in the world yet |
| `state_unavailable` | the engine read failed, or returned something not finite |
| `native_unavailable` | a required native is missing on this build |
| `unknown_bone` | this body publishes no slot under that name or alias |
| `invalid_entity`, `invalid_radius`, `invalid_offset`, `invalid_bone` | the arguments |
| `game_unavailable_on_this_host` | this host has no game backend |

`boneAliases()` is the one call here with no permission on it, for the same reason
`Open77.blips.sprites()` has none: it describes the API, not a body, and it exists so a resource,
this page and the acceptance probe all print the one table the resolver uses.

## How busy the world is meant to be

`Open77.world.population()` returns the ambient policy the **server** set for this client's routing
bucket. It requires `world.query`.

```lua
local policy = Open77.world.population()
if policy and policy.crowd == 0 then
    print("this instance is meant to be empty; do not spawn scenery over it")
end
```

| Field | |
|---|---|
| `bucket` | the routing bucket the policy is for |
| `crowd` | pedestrian density, `0..1` of the vanilla figure, and applied as a real fraction |
| `traffic` | traffic density as sent -- but see `trafficGranularity` |
| `police` | whether vanilla prevention spawns are allowed |
| `revision` | monotonic across all buckets; newer wins |
| `applied` | what the **engine** did with it: `Ok`, or a refusal name |
| `crowdGranularity` | `continuous` |
| `trafficGranularity` | `binary` -- 2.31 exposes no vehicle density modifier, so any positive traffic means vanilla traffic |

There is no client setter, on purpose: density has to be the same for everyone in a bucket, so it is
a server decision (`Open77.world.setPopulation`, see [the server API](server-api.md)) and this side
only reads it.

`applied` is worth reading. A policy can arrive and be refused by the engine, and a resource
comparing its own expectations against the street needs to see that rather than infer it.

| Reason | Meaning |
|---|---|
| `no_population_policy` | no server has sent one yet. **Not** the same as empty streets |
| `permission_denied:world.query` | the resource does not hold `world.query` |
| `world_unavailable_on_this_host` | this host has no game backend |

## Cost and etiquette

Each call is one native call on the game thread, inside the caller's own instruction budget.
A ray per frame is cheap; a 1000 m `nearby` per frame is not, and neither is a hundred rays in one
tick. Cache what does not move (ground heights, door positions) and trace on events, not on timers.

The server has no physics world: none of these exist server-side. A gamemode that needs a line of
sight on the server asks a client for it and treats the answer as an observation, never as
authority.

## See also

- [Vanilla device prompts](device-interactions.md) -- the `engineEntity` a `device` row
  carries is exactly what `Open77.world.setDeviceInteractionEnabled` takes, which is how a
  resource turns that machine's own prompt off and puts its own there.
