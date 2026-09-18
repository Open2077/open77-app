# Animated actions: a pose, a prop in the hands, a real duration

Your mechanic types `/repair` and the car is fixed. Nothing happened on screen. This guide
turns that into: the mechanic kneels at the wheel, a welder in hand, for fifteen seconds —
and everyone around sees it.

Three server calls do it. Copy the examples, change the names.

## The three calls

```lua
-- 1. A pose. Everyone in range sees it.
Open77.animations.play(playerId, "repair", { loop = true })

-- 2. An object in the hands. Create it, then glue it to a bone.
local propId = Open77.props.create({ model = "tool.welder", position = pos, bucket = pos.bucket })
Open77.props.attach(propId, { parentType = "player", parentId = playerId, bone = "RightHand" })

-- 3. A duration. A bar on the player's screen; the call waits until it ends.
local bar = Open77.exports.call("open77_uikit", "progress", playerId, { label = "Welding", duration = 15000 })
local result = bar:await()   -- { ok = true } when it ran to the end
```

All three are **server** Lua. A client cannot play a pose on other people's screens, and
that is on purpose. Your manifest needs:

```lua
dependency "open77_props >=0.1.0"
dependency "open77_uikit >=1.0.0"
permissions { "world.props", "players.animations.control" }
```

## Example 1: the mechanic repair

The whole action, ready to paste into a `server/main.lua`:

```lua
local repairing = {}   -- playerId -> { propId, playbackId }

local function stopRepair(playerId)
    local job = repairing[playerId]
    if not job then return end
    repairing[playerId] = nil
    if job.playbackId then Open77.animations.stop(playerId, job.playbackId) end
    if job.propId then Open77.props.remove(job.propId) end
    Open77.exports.call("open77_uikit", "close", playerId)
end

RegisterCommand("repair", function(source)
    local playerId = source
    if repairing[playerId] then return end
    local pos = Open77.players.position(playerId)
    if not pos then return end

    -- the pose: kneel and work
    local playback = Open77.animations.play(playerId, "repair", { loop = true })

    -- the welder in the right hand
    local propId = Open77.props.create({ model = "tool.welder", position = pos, bucket = pos.bucket })
    if propId then
        Open77.props.attach(propId, { parentType = "player", parentId = playerId, bone = "RightHand" })
    end
    repairing[playerId] = { propId = propId, playbackId = playback and playback.playbackId }

    -- the duration: 15 s, cancelled with X
    CreateThread(function()
        local bar = Open77.exports.call("open77_uikit", "progress", playerId, {
            label = "Welding the chassis", duration = 15000, cancelKey = "X",
        })
        local result = bar and bar:await()
        stopRepair(playerId)
        if result and result.ok then
            Open77.chat.send(playerId, "Chassis welded. Try not to wrap it around a pole this time.")
        end
    end)
end)

-- if the player walks off, the platform ends the pose; end the job with it
AddEventHandler("onPlayerAnimationChanged", function(playerId, state)
    if type(state) == "string" then state = json.decode(state) end   -- the server event carries JSON
    if repairing[playerId] and state and state.active == false then stopRepair(playerId) end
end)
AddEventHandler("playerDropped", function() stopRepair(source) end)
```

What the player sees: they kneel, the welder appears in their hand, a bar counts fifteen
seconds. If they walk away or press X, everything is cleaned up in one place (`stopRepair`).

## Example 2: carrying a crate while walking

Most poses are **stationary**: take a step and the platform ends them (a repair, a phone
call, sitting). A few are **upper-body layers**: only the arms are animated, the legs keep
walking, the camera is untouched. Today those are `carry`, `carry_pickup` and
`carry_putdown`. That is what a delivery job needs.

```lua
local carrying = {}   -- playerId -> { propId, playbackId }

local function pickUpCrate(playerId)
    local pos = Open77.players.position(playerId)
    if not pos or carrying[playerId] then return end

    local propId = Open77.props.create({ model = "crate.small", position = pos, bucket = pos.bucket })
    if not propId then return end
    carrying[playerId] = { propId = propId }

    -- the arms come up (1.3 s), then the crate is glued to the chest
    Open77.animations.play(playerId, "carry_pickup")
    Wait(1333)
    Open77.props.attach(propId, {
        parentType = "player", parentId = playerId, bone = "Chest",
        offset = { x = -0.135, y = -0.60, z = 0.008 },   -- crate.small, measured in game
        rotation = { x = 0, y = 90, z = 0 },
    })
    local playback = Open77.animations.play(playerId, "carry", { loop = true })
    carrying[playerId].playbackId = playback and playback.playbackId
end

local function putDownCrate(playerId)
    local job = carrying[playerId]
    if not job then return end
    carrying[playerId] = nil
    Open77.animations.stop(playerId, job.playbackId)
    Open77.animations.play(playerId, "carry_putdown")   -- 2.3 s
    Wait(2333)
    Open77.props.detach(job.propId)
    local pos = Open77.players.position(playerId)
    if pos then Open77.props.setTransform(job.propId, { position = { x = pos.x, y = pos.y + 0.8, z = pos.z }, yaw = 0 }) end
end
```

The player can now walk to the truck with the crate in their arms. Call these from a prompt,
a command, whatever your job uses.

### Getting the offset right

The numbers above are for `crate.small`. Every mesh has its own pivot and axes, so another
prop needs other numbers — and guessing them by restarting the resource is slow. Add this
lab command once and adjust by eye:

```lua
-- console: carrytune <playerId> ox oy oz rx ry rz
RegisterCommand("carrytune", function(source, args)
    if source ~= 0 then return end
    local playerId = tonumber(args[1])
    local job = playerId and carrying[playerId]
    if not job then return print("not carrying") end
    Open77.props.detach(job.propId)
    Open77.props.attach(job.propId, {
        parentType = "player", parentId = playerId, bone = "Chest",
        offset = { x = tonumber(args[2]), y = tonumber(args[3]), z = tonumber(args[4]) },
        rotation = { x = tonumber(args[5]), y = tonumber(args[6]), z = tonumber(args[7]) },
    })
end)
```

Try `0 90 0`, `90 0 0`, `0 0 90` for the rotation until the object is upright, then push
the offset out of the body ten centimetres at a time. Write the good numbers into your
config.

## Which poses can I use?

`Open77.animations.get("carry")` answers the profile, or `nil` if this server does not have
it. Two fields matter:

| Field | Meaning |
|---|---|
| `kind = "workspot"` | stationary — moving, a vehicle or death ends it |
| `kind = "layer"` | arms only — the player keeps walking |
| `clipDurationsMs` | the real length of each clip, for one-shots |

Useful ones today: `repair`, `examine` (kneel), `phone`, `smoke`, `drink`, `give`,
`handsup`, `sit`, `lean`, `wounded` (stationary) — `carry`, `carry_pickup`, `carry_putdown`
(walkable). The full list: [the animation catalogue](rp-animation-catalogue.md).

Since catalogues grow, list what you would like and take the first one the server knows:

```lua
local function firstKnown(...)
    for _, id in ipairs({ ... }) do
        if Open77.animations.get(id) then return id end
    end
end
local carryPose = firstKnown("carry", "tablet2", "phone")   -- best first, fallback last
```

## Props that make sense in a hand

Use these aliases, never a raw `.mesh` path (a raw mesh renders as a white slab):

| Alias | What | Where |
|---|---|---|
| `tool.welder` | welding torch | `RightHand` |
| `container.gas_can` | jerrycan | `RightHand` |
| `container.toolbox` | toolbox | at the feet (root bone) |
| `food.bourbon`, `food.soda_can` | bottle, can | `RightHand` with `drink` |
| `medical.device` | injector | `RightHand` |
| `electronics.monitor` | a deck / screen | `Chest`, two hands |
| `military.case` | a briefcase | `RightHand` |
| `crate.small`, `crate.ammo_box` | boxes | `Chest`, two hands |
| `garbage.bag` | loot bag | `LeftHand` |

## What a server admin can change

Everything above is config: the pose name, the prop alias, bone / offset / rotation, the
durations. Put them in `shared/config.lua` and any admin can retune a job without touching
code — or the client. What they cannot do is add a **new** animation clip: those come with
the platform's catalogue.

## When it does not work

| You see | Why | Do |
|---|---|---|
| The pose stops as soon as I walk | it is a `workspot` profile | use a `layer` profile, or accept that the action is stationary |
| `animation_owned` | another resource is already animating that player | stop yours or wait; you cannot replace another resource's pose |
| `unknown_profile` | this server's catalogue has no such name | `Open77.animations.get` first, list fallbacks |
| The prop is inside my body / floating | offset or rotation | tune live with `carrytune`, then save the numbers |
| Nobody else sees it | you called it from a client script | move it to the server |
| The bar never ends | you called `progress` outside a thread | wrap it in `CreateThread`, `await` the result |

## See also

[Synchronized animations](rp-animations.md) · [Synchronized attachments](attachments.md) ·
[Props and effects](props-and-effects.md) · [The UI kit](ui-kit.md)
