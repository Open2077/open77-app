# Animated actions: a pose, a prop in the hands, a real duration

A job action that happens the instant a key is pressed reads as a command, not as something a person did. This guide makes a server-side action *look like* something: the body takes a pose, an object appears in the hands, and a bar shows the time it takes. Everything on this page is server Lua, so every client in range sees the same thing.

It is written for the person building a gamemode or a job resource. It leans
on three reference pages and does not repeat them:
[Synchronized animations](rp-animations.md) for the animation API,
[Synchronized attachments](attachments.md) for the binding, and
[The UI kit](ui-kit.md) for the progress bar.

## The three building blocks

| You want | Use | Who owns it |
|---|---|---|
| The body to take a pose | `Open77.animations.play` / `.stop` / `.sequence`, with a profile from the shipped catalogue | the server: it validates the action and broadcasts it to the bucket |
| An object in the hands | `Open77.props.create`, then `Open77.props.attach` to a named slot of the player rig | the server: the prop belongs to your resource, and every client follows its rendered parent |
| The time it takes to be visible | the `progress` server twin of `open77_uikit` | your resource: the bar blocks what you say it blocks, and answers when it ends |

None of these is a client call. A client resource can play a pose on its own
body and can draw a decorative prop, but only the player running it perceives
either. The manifest for a resource that does all three:

```lua
resource "crate_job"
version "1.0.0"

shared_script "shared/config.lua"
server_script "server/main.lua"

dependency "open77_props >=0.1.0"       -- the client projection that draws props and their attachment
dependency "open77_uikit >=1.0.0"       -- the progress bar

permissions { "world.props", "players.animations.control", "network.events" }
```

`open77_animations` needs no `dependency` line, because `Open77.animations` is
part of the server runtime, but it must be running on the server so that
clients receive the presentation service and the catalogue. It auto-starts
when discovered; a server profile with an explicit `resources.load` list has
to name it.

### The pose

```lua
local playback, reason = Open77.animations.play(playerId, "repair", { loop = true })
-- playback.playbackId is the handle; nil, reason on refusal
Open77.animations.stop(playerId, playback.playbackId)
```

`play` answers with the accepted playback state or `nil, reason`. Keep
`playbackId`: a delayed stop without it stops whatever your resource is
running on that player, and with it refuses (`stale_playback`) to cancel an
action that already replaced the one you meant. A new `play` from your
resource replaces your previous action on that player; another resource's
action is not yours to replace (`animation_owned`).

`Open77.animations.get(id)` answers the profile definition, or `nil` when the
running server has no such profile. No error, no permission. That is the
question a resource has to ask before it depends on a name, because
catalogues grow: a server that has not been updated does not know `carry`,
and a resource that assumes it will log a refusal on every pickup. The
profile table carries `id`, `label`, `clip` (the default clip), `clips`
(every selectable one), `kind`, `locomotion` and `clipDurationsMs`, all
described below.

`Open77.animations.sequence(playerId, steps, { loop = false })` chains up to
16 steps in one accepted action, and it is the right tool when the steps are
only poses. When a prop has to move *between* poses (it goes into the hands
when the pick-up ends, not when it starts), separate `play` calls with a
`Wait` in between give the resource the moment it needs. Both examples below
do that.

### The object

```lua
local origin = Open77.players.position(playerId)            -- { x, y, z, bucket }
local propId, reason = Open77.props.create({
    model = "tool.welder", position = origin, bucket = origin.bucket,
})
local ok, why = Open77.props.attach(propId, {
    parentType = "player", parentId = playerId, bone = "RightHand",
    offset   = { x = 0, y = 0, z = 0 },       -- metres, in the slot's own frame
    rotation = { x = 0, y = 0, z = 0 },       -- degrees: x roll, y pitch, z yaw
})
```

The prop is created in the player's bucket, because an attachment across
buckets is refused (`wrong_bucket`), and then bound to a **named slot** of
the rig. `""` is the body root: origin at the feet, `+y` where the player
faces, `+x` their right, `+z` up. `RightHand`, `LeftHand` and `Chest` follow
the animated bone, so an object bound there swings with the arm and sits
where the pose puts it. A slot's axes are the bone's, not the world's; `y` in
the `Chest` frame is not "forward", which is why the offset and rotation are
found by eye with the tuning command below rather than computed. Each mesh
also has its own pivot and its own idea of "up", so the numbers that place a
crate say nothing about a welder.

The binding survives what the rest of the API does to it: death,
disconnection, a bucket change and vehicle removal detach on the server;
`setTransform` is refused while attached, so detach before placing the object
on the ground; stopping your resource removes the prop outright. The model
matters more than usual here; see
[Props that make sense in a hand](#props-that-make-sense-in-a-hand).

### The duration

```lua
local promise, reason = Open77.exports.call("open77_uikit", "progress", playerId, {
    label = "Welding the chassis", duration = 15000, cancelKey = "X",
    disable = { combat = true },
})
local answer = promise and promise:await()
-- { ok = true,  outcome = "ok" }         it ran to the end
-- { ok = false, outcome = "cancelled" }  the player pressed X or Escape
-- nil, reason                            never reached an answer (callback_timeout, ...)
```

The server twin **waits**: it resolves when the bar ends, one way or another,
so it runs inside a `CreateThread`. `duration` is milliseconds, 100 to
600,000. `disable` blocks through `Open77.input`, never by holding focus, so
the player can still open chat. `close(playerId)` cancels everything your
resource holds on that client, bar included, which is how a job that ends
early takes its bar down.

### Wrap every call, log a refusal once

A pose is decoration. When the server refuses it (the player is in a vehicle,
another resource owns their animation, the profile does not exist on this
server), the job should still happen, and the log should say so **once**,
not on every tick. `pcall` covers the other shape of failure too: a method
that does not exist yet on an older server, or an argument the marshaller
rejects, raises instead of answering, and `pcall` turns that into the same
`nil, reason` every refusal already has.

```lua
local warned = {}

-- pcall(fn, ...) normalised to the API's own shape: value, reason.
local function try(fn, ...)
    local ok, value, reason = pcall(fn, ...)
    if not ok then return nil, tostring(value) end
    return value, reason
end

local function warnOnce(key, text)
    if warned[key] then return end
    warned[key] = true
    print(("[crate_job] %s"):format(text))
end
```

## Two kinds of profile

Every profile in the [catalogue](rp-animation-catalogue.md) is one of two
things, and the difference decides what the player can do while it plays.

| | Workspot (`kind = "workspot"`) | Layer (`kind = "layer"`) |
|---|---|---|
| What it drives | the whole body, mounted into an authored device | the arms only, over the body's own locomotion |
| While it plays | the body stays where the pose put it; the camera is a temporary third-person view | the player keeps walking, running and turning; the camera is untouched |
| Ends on its own when | the player moves more than 0.5 m, enters a vehicle or dies; a non-looping duration completes | a non-looping clip completes; movement does not end it |
| `locomotion` | `false` | `true` |
| Today | 76 profiles: `smoke`, `phone`, `repair`, `examine`, `chair`, ... | `carry`, `carry_pickup`, `carry_putdown` |

**Read `kind` and `locomotion` off the profile; do not assume from the
name.** More layer profiles will ship, and a resource that hard-codes
"`carry` is the walking one" is wrong the day a second one arrives. A layer
profile also carries `clipDurationsMs`, the measured length of each of its
clips in milliseconds, keyed by clip name. A workspot's `clipDurationsMs` is
an empty table, and its `durationMs` is a scheduling duration, not a clip
length.

So a job that wants the player to *walk* with the pose needs a layer profile,
and a job that wants them to *stay* is exactly what a workspot is for: the
0.5 m rule is the cancel path, not an obstacle. Example B builds on it.

### List candidates, take the first one the server knows

Put profile names in the config as an ordered list, and resolve at start:

```lua
-- shared/config.lua
JobConfig = {
    poses = {
        carry   = { { profile = "carry" }, { profile = "tablet2" },
                    { profile = "phone", clip = "stand__2h_phone__03__shuffle__01" } },
        pickup  = { { profile = "carry_pickup" }, { profile = "scavenge" } },
        putdown = { { profile = "carry_putdown" }, { profile = "scavenge" } },
        repair  = { { profile = "repair" }, { profile = "examine" } },
    },
    -- When the chosen profile has no measured clip length, how long a one-shot step takes.
    stepMs = { pickup = 1400, putdown = 2400 },
}
```

```lua
-- server/main.lua
-- Answers { profile, clip, ms, locomotion } for the first candidate the running server
-- knows, or nil. `ms` is the measured clip length when the profile has one.
local function resolvePose(candidates)
    for _, want in ipairs(candidates or {}) do
        local profile = try(Open77.animations.get, want.profile)
        if type(profile) == "table" then
            local clip = want.clip
            if clip then
                local known = false
                for _, name in ipairs(profile.clips or {}) do
                    if name == clip then known = true; break end
                end
                if not known then clip = nil end          -- a clip must belong to its profile
            end
            clip = clip or profile.clip
            local durations = profile.clipDurationsMs
            return {
                profile    = want.profile,
                clip       = clip,
                ms         = type(durations) == "table" and durations[clip] or nil,
                locomotion = profile.locomotion == true,
            }
        end
    end
    return nil
end
```

On a server that knows `carry`, the carry pose resolves to the walking layer.
On one that does not, it falls back to `tablet2`, two hands at chest height,
a workspot, and the resource can read `locomotion == false` and decide what
to do about walking. The Night City RP nomad job replays the pose once the
carrier has stood still for a second and a half; a simpler resource accepts
that the pose ends and the crate stays in the hands. Either way the job runs.

## Worked example A: carrying a crate

Pick up a crate, walk it somewhere, put it down. Four moments: a pick-up
one-shot, the crate going into the hands when it ends, a carry loop for as
long as the walk lasts, and a put-down one-shot with the crate leaving the
hands when *that* ends.

```lua
-- shared/config.lua (add to JobConfig above)
JobConfig.crate = {
    model    = "crate.small",
    bone     = "Chest",
    offset   = { x = -0.135, y = -0.60, z = 0.008 },
    rotation = { x = 0, y = 90, z = 0 },
}
```

Where those numbers come from. The `carry` pose holds both hands in front of
the chest, and the midpoint between them is at `{ -0.135, -0.364, 0.008 }`
in the `Chest` slot's frame, the same for both body families and for the idle
and walking variants, within a few millimetres. A crate mesh does not pivot
at its centre, so centring `crate.small` on that midpoint ends at
`y = -0.60` once tuned by eye, and the mesh lies on its side in that frame,
hence the 90° pitch. **Those are `crate.small`'s numbers.** `crate.cargo` has
another pivot and another size; a welder in a hand has nothing in common with
either. Every mesh gets its own line in the config, and the tuning command
below is how it gets there.

```lua
-- server/main.lua
local C = JobConfig
local carrying = {}     -- [playerId] = { propId, playbackId }
local pose = {}         -- resolved at start: pose.carry, pose.pickup, pose.putdown, pose.repair

AddEventHandler("onResourceStart", function(name)
    if name ~= GetCurrentResourceName() then return end
    if type(Open77.animations) ~= "table" then
        return warnOnce("animations", "Open77.animations is not on this server; actions play without a pose")
    end
    for key, candidates in pairs(C.poses) do
        pose[key] = resolvePose(candidates)
        if not pose[key] then
            warnOnce("pose:" .. key, key .. ": none of the configured profiles exists on this server")
        end
    end
end)

local function say(playerId, text)
    Open77.chat.send(playerId, text)
end

-- One-shot: play the step's profile once and wait its length. The prop is never
-- touched here; the caller moves it when this returns.
local function oneShot(playerId, key)
    local step = pose[key]
    local ms = step and step.ms or C.stepMs[key] or 0
    if step and ms >= 1000 then
        local options = { loop = false, durationMs = ms }
        if step.clip then options.clip = step.clip end
        local playback, reason = try(Open77.animations.play, playerId, step.profile, options)
        if not playback then warnOnce("play:" .. key, key .. " refused: " .. tostring(reason)) end
    end
    if ms > 0 then Wait(ms) end
end

local function pickUp(playerId)
    if carrying[playerId] then return say(playerId, "You already have a crate.") end
    local origin = Open77.players.position(playerId)
    if not origin then return say(playerId, "No position for you yet.") end

    local propId, reason = Open77.props.create({
        model = C.crate.model, position = origin, bucket = origin.bucket,
    })
    if not propId then return say(playerId, "No crate: " .. tostring(reason)) end
    carrying[playerId] = { propId = propId }

    oneShot(playerId, "pickup")                        -- the arms come up: 1,333 ms measured
    if carrying[playerId] == nil then return end       -- dropped or gone meanwhile

    local ok, why = Open77.props.attach(propId, {
        parentType = "player", parentId = playerId, bone = C.crate.bone,
        offset = C.crate.offset, rotation = C.crate.rotation,
    })
    if not ok then warnOnce("attach:crate", "crate attach refused: " .. tostring(why)) end

    if pose.carry then
        local options = { loop = true }
        if pose.carry.clip then options.clip = pose.carry.clip end
        local playback, err = try(Open77.animations.play, playerId, pose.carry.profile, options)
        if playback then
            carrying[playerId].playbackId = playback.playbackId
        else
            warnOnce("play:carry", "carry pose refused: " .. tostring(err))
        end
    end
end

local function putDown(playerId)
    local held = carrying[playerId]
    if not held then return say(playerId, "Nothing to put down.") end

    oneShot(playerId, "putdown")                       -- the arms go down: 2,333 ms measured
    -- The put-down replaced the carry loop, so this finds nothing to stop. When no
    -- put-down profile exists the loop is still running, and this is what ends it.
    if held.playbackId then try(Open77.animations.stop, playerId, held.playbackId) end

    carrying[playerId] = nil
    local feet = Open77.players.position(playerId)
    Open77.props.detach(held.propId)                   -- setTransform is refused while attached
    if feet then
        Open77.props.setTransform(held.propId, {
            position = { x = feet.x, y = feet.y, z = feet.z }, yaw = 0,
        })
    else
        Open77.props.remove(held.propId)
    end
end

RegisterCommand("crate", function(source, args)
    if source == nil or source <= 0 then return print("crate: needs an in-game caller") end
    CreateThread(function()
        if args[1] == "drop" then putDown(source) else pickUp(source) end
    end)
end, true)

AddEventHandler("onPlayerDisconnected", function(playerIdStr)
    local playerId = tonumber(playerIdStr)
    local held = playerId and carrying[playerId]
    if not held then return end
    carrying[playerId] = nil
    Open77.props.remove(held.propId)   -- the server already detached it and ended the pose
end)
```

`/crate` puts a crate in the caller's hands, `/crate drop` sets it down at
their feet. The pick-up one-shot lasts its measured clip (`carry_pickup`,
1,333 ms), the crate attaches when it ends, and `carry` loops until the
put-down replaces it; the put-down lasts 2,333 ms and the crate leaves the
hands when it completes. On a server without the `carry` family the same
code plays `scavenge` for the configured 1,400 / 2,400 ms and `tablet2` in
between, and the crate still rides the chest.

### Tune it live

Nobody gets the offset right from a text editor. Give the resource a command
that re-attaches the crate a player is carrying with new numbers, so an admin
adjusts by eye, watching the carrier from a second client or in third person,
one axis at a time, a few centimetres per try. Re-attaching an attached prop
is allowed and cheap: it changes the transform without a new host.

```lua
-- carrytune <playerId> [bone] ox oy oz [rx ry rz]
-- The values stay until the resource restarts: copy the good ones into shared/config.lua.
RegisterCommand("carrytune", function(source, args)
    local playerId = tonumber(args[1])
    local held = playerId and carrying[playerId]
    if not held then return print("carrytune: that player is not carrying a crate") end

    local i = 2
    if args[2] and not tonumber(args[2]) then
        C.crate.bone = (args[2] == "root") and "" or args[2]
        i = 3
    end
    local n = {}
    for k = 0, 5 do n[k + 1] = tonumber(args[i + k]) end
    if n[1] and n[2] and n[3] then C.crate.offset   = { x = n[1], y = n[2], z = n[3] } end
    if n[4] and n[5] and n[6] then C.crate.rotation = { x = n[4], y = n[5], z = n[6] } end

    local ok, why = Open77.props.attach(held.propId, {
        parentType = "player", parentId = playerId, bone = C.crate.bone,
        offset = C.crate.offset, rotation = C.crate.rotation,
    })
    print(("carrytune %d: bone=%s offset=%.3f,%.3f,%.3f rotation=%.1f,%.1f,%.1f -> %s"):format(
        playerId, C.crate.bone ~= "" and C.crate.bone or "root",
        C.crate.offset.x, C.crate.offset.y, C.crate.offset.z,
        C.crate.rotation.x, C.crate.rotation.y, C.crate.rotation.z,
        ok and "ok" or tostring(why)))
end, true)
```

```text
carrytune 3 Chest -0.135 -0.60 0.008 0 90 0     -- the crate.small numbers, for player 3
carrytune 3 -0.135 -0.55 0.008                  -- same slot, 5 cm along y
carrytune 3 RightHand 0 0 0 0 0 0               -- try a hand instead, from zero
carrytune 3 root 0 0.45 0.85 0 0 0              -- the body root: level in front of the torso
```

The command is restricted (`command.carrytune` in the
[access control list](server-acl.md)), because it takes a player id and
rewrites a live prop. When the numbers look right from the front, the side
and while walking, they go into `shared/config.lua` and the command is never
needed again for that mesh.

## Worked example B: a stationary job action

A mechanic repairs something: kneel with a tool for fifteen seconds, and stop
if they walk away. This is the shape most job actions take, and it is where
the workspot's own rule does the cancelling.

```lua
-- shared/config.lua (add to JobConfig above)
JobConfig.repair = {
    tool       = "tool.welder",
    bone       = "RightHand",
    offset     = { x = 0, y = 0, z = 0 },    -- a starting point: tune it the way the crate was
    rotation   = { x = 0, y = 0, z = 0 },
    durationMs = 15000,
    label      = "Welding the chassis",
}
```

```lua
-- server/main.lua (same file as example A; `try`, `warnOnce`, `say` and `pose` are above)
local jobs = {}     -- [playerId] = { propId, playbackId, done }

local function uikit(name, ...)
    local promise, reason = Open77.exports.call("open77_uikit", name, ...)
    if not promise then return nil, reason end
    return promise:await()
end

-- The one place a repair ends, whichever way it ends. Safe to call twice.
local function finishRepair(playerId, job, why)
    if job.done then return end
    job.done = true
    jobs[playerId] = nil
    if job.playbackId then try(Open77.animations.stop, playerId, job.playbackId) end
    if job.propId then Open77.props.remove(job.propId) end
    CreateThread(function() uikit("close", playerId) end)   -- takes the bar down if it is still up
    print(("[crate_job] repair by %d ended: %s"):format(playerId, tostring(why)))
end

local function repair(playerId)
    if jobs[playerId] then return say(playerId, "You are already working.") end
    local origin = Open77.players.position(playerId)
    if not origin then return say(playerId, "No position for you yet.") end
    local job = {}
    jobs[playerId] = job

    -- 1. The tool in the hand. A refusal is logged once; the job goes on without it.
    local propId, reason = Open77.props.create({
        model = C.repair.tool, position = origin, bucket = origin.bucket,
    })
    if propId then
        job.propId = propId
        local ok, why = Open77.props.attach(propId, {
            parentType = "player", parentId = playerId, bone = C.repair.bone,
            offset = C.repair.offset, rotation = C.repair.rotation,
        })
        if not ok then warnOnce("attach:repair", "welder attach refused: " .. tostring(why)) end
    else
        warnOnce("create:repair", "welder refused: " .. tostring(reason))
    end

    -- 2. The pose, looped: the bar decides when it ends, not a duration.
    if pose.repair then
        local options = { loop = true }
        if pose.repair.clip then options.clip = pose.repair.clip end
        local playback, err = try(Open77.animations.play, playerId, pose.repair.profile, options)
        if playback then
            job.playbackId = playback.playbackId
        else
            warnOnce("play:repair", "repair pose refused: " .. tostring(err))
        end
    end

    -- 3. The bar. This waits.
    local answer, err = uikit("progress", playerId, {
        label = C.repair.label, duration = C.repair.durationMs,
        cancelKey = "X", disable = { combat = true },
    })

    if job.done then return end                          -- torn down while we waited
    if answer == nil then return finishRepair(playerId, job, "no answer: " .. tostring(err)) end
    if not answer.ok then return finishRepair(playerId, job, answer.outcome) end

    -- 4. Fifteen seconds is long enough to be somewhere else, and a refused pose
    --    has no movement rule of its own. Re-check before paying.
    local now = Open77.players.position(playerId)
    if not now or (now.x - origin.x) ^ 2 + (now.y - origin.y) ^ 2 > 1.0 then
        return finishRepair(playerId, job, "walked_away")
    end

    finishRepair(playerId, job, "completed")
    say(playerId, "Chassis welded.")                     -- pay, repair the vehicle: the job's own business
end

RegisterCommand("repair", function(source)
    if source == nil or source <= 0 then return print("repair: needs an in-game caller") end
    CreateThread(function() repair(source) end)
end, true)

-- The cancel path. A workspot ends on its own when the player walks 0.5 m, gets into a
-- vehicle or dies, and the server says so here; the job follows the pose down.
AddEventHandler("onPlayerAnimationChanged", function(playerIdStr, stateJson)
    local playerId = tonumber(playerIdStr)
    local job = playerId and jobs[playerId]
    if not job or not job.playbackId then return end
    local state = type(stateJson) == "table" and stateJson or json.decode(stateJson)
    if state.active or state.playbackId ~= job.playbackId then return end
    finishRepair(playerId, job, state.reason)   -- moved, player_in_vehicle, player_not_alive, ...
end)
```

Three things carry this example. The pose **loops** and the bar decides when
it ends: a `durationMs` equal to the bar's would make the animation's
`completed` and the bar's `ok` race each other, and a completion handled as a
cancel would refuse to pay. Every exit goes through **one** `finishRepair`,
so pressing `X`, walking away, dying, a client that never answered and a
normal completion all stop the animation, remove the welder and clear the bar
the same way, and calling it twice is harmless. And the walk-away is not
polled: the server ends the workspot at 0.5 m and publishes
`onPlayerAnimationChanged` with `active = false` and `reason = "moved"`; the
handler checks the `playbackId` because a `play` that replaced your own
earlier action publishes no inactive state for it.

`disable = { combat = true }` stops the player firing a weapon while kneeling
and leaves them free to walk, which is what makes the cancel path reachable.
A job that must not be walked out of adds `move = true`, and then its only
exits are the cancel key, death and a vehicle.

## Props that make sense in a hand

Every curated alias resolves to two entities: a spawn-safe host for the
ground, and a separate visual-only **attachment host** with no physical
shape, which is what follows the bone. That is why the choice is limited to
aliases. **A raw `.mesh` path renders as a white slab** when attached, when it
draws at all, and a raw `.ent` is refused outright. Pick from the catalogue;
the current list is `admin.props.catalog` in the terminal or the **Props**
tab of the admin panel.

Aliases that read as something a person holds, with the slot to start from.
Every one of them starts at a zero transform and gets its own numbers through
the tuning command above:

| Alias | What it is | Start with |
|---|---|---|
| `tool.welder` | a welder | `RightHand`: the mechanic of example B |
| `tool.shovel` | a shovel | `RightHand`, long handle: expect a large rotation |
| `tool.fire_axe` | a fire axe | `RightHand` |
| `container.gas_can` | a jerrycan | `RightHand` or `LeftHand`: refuelling |
| `container.toolbox` | a toolbox | a hand at the side, or `Chest` for a two-hand carry |
| `container.bucket` | a bucket | a hand |
| `food.bourbon` | a bottle | `RightHand`, with the `bottle` or `drink` workspot |
| `food.soda_can` | a can | `RightHand`, with `drink` |
| `medical.device` | a medical device | `RightHand`: a medic over a patient |
| `medical.container` | a medical container | `Chest` two-hand carry |
| `electronics.monitor` | a monitor | `Chest`: a delivery, or a theft |
| `electronics.camera` | a camera | `RightHand` |
| `military.case` | a hard case | `RightHand` at the side, or `Chest` |
| `crate.small` | the crate of example A | `Chest`, numbers above |
| `crate.ammo_box` | an ammo box | `Chest` two-hand, or `RightHand` |
| `garbage.bag` | a bin bag | `RightHand`: a sanitation job |

The catalogue page's **Expected prop** column tells you what a workspot's
hand was authored around (`repair` holds a screwdriver, `phone` a phone) and
that object is **not** drawn by the animation. Attaching an alias in that
hand is how it appears, and a hand shaped for a screwdriver is a good hand
for a welder.

## What a server admin can change without touching the client

Everything above is configuration, and a Lua change reloads without a client
update:

| Knob | Where |
|---|---|
| Which profile plays, in what order of preference, and which clip | `JobConfig.poses` |
| What is in the hands | the alias in `JobConfig.crate.model` / `JobConfig.repair.tool` |
| Where it sits | `bone`, `offset`, `rotation`, found live with `carrytune` |
| How long a step takes when the profile has no measured length | `JobConfig.stepMs` |
| How long the job takes, what the bar says, what it blocks, the cancel key | the `progress` definition |

What an admin **cannot** do from a resource is add a clip. A body plays an
authored clip only from a device bound to it when the archive is built, so a
new pose is a new entry in the platform's animation pipeline and a repacked
archive on every client. The [catalogue](rp-animation-catalogue.md) is the
addressable set; the reference explains
[what raw playback can and cannot mean](rp-animations.md#what-raw-playback-can-and-cannot-mean-here).
The same holds for a new prop alias (an attachment host is built with the
assets) and for slot names (they are the rig's).

## Troubleshooting

| You see | Why | Do |
|---|---|---|
| `animation_owned` | another resource's action is running on that player: a `/anim`, an interaction, another job | you cannot replace it; wait for it to end, or have that resource stop it. Your own earlier action is replaced without a word. |
| `unknown_profile` | the running server has no profile by that name | ask `Open77.animations.get` first; list candidates and take the first known one |
| `invalid_clip` | the clip is not one of that profile's `clips` | check `profile.clips`; `resolvePose` falls back to the profile's default |
| `position_unavailable`, `player_not_ready`, `player_not_alive`, `player_in_vehicle` | the player has no usable body right now: loading, the continue screen, dead, seated | not now. Log it once and let the job go on without the pose, or refuse the job |
| `permission_denied:players.animations.control` | the manifest does not declare it | declare it |
| attach refused: `wrong_bucket` | the prop was created in bucket 0 | `bucket = origin.bucket` on `create` |
| attach refused: `invalid_attachment_bone`, `attachment_kind_unsupported`, `parent_unavailable`, `attachment_parent_limit` | a malformed slot name; a light, a looping effect or a raw path; a player with no body yet; 32 props already on that parent | fix the name; use a curated alias; wait for readiness; detach something |
| the server said `true` and the prop is nowhere | the client could not bind it: its snapshot's `attachmentStatus` reads `bone_unavailable` (the rig has no such slot) or `parent_not_streamed` | `Open77.props.bones("player", id)` on a client lists the slots that exist; `""` always does. A missing slot hides the prop rather than dropping it at the feet |
| the pose ends when I walk | it is a workspot, `locomotion = false` | that is its cancel rule. Use a layer profile if one fits the action; otherwise replay the pose when the player stands still, or accept it |
| the prop is inside my body, floating, or sideways | the offset and rotation belong to another mesh, or to another slot | `carrytune` live, one axis at a time; every mesh gets its own numbers |
| nobody else sees it | `Open77.animations.request` and client-created props are local to the machine that ran them | everything on this page is server Lua; move the call there |
| the bar never appears, `nil, callback_timeout` or `callback_resource_unavailable` | `open77_uikit` is not running on the client, or the client is not ready | declare the dependency; do not start a job on a player who is not `alive` |
| `progress_active` | one bar at a time per client | end the previous one, or `close(playerId)` |

## See also

- [Synchronized animations](rp-animations.md): the whole animation API,
  sequences, `playAt` and the playback state.
- [RP animation catalogue](rp-animation-catalogue.md): every profile and
  clip, with the prop each workspot expects.
- [Synchronized attachments](attachments.md): the binding fields, revisions,
  lifecycle and client diagnostics.
- [Props and effects](props-and-effects.md): creating the object in the first
  place, buckets, quotas and removal reasons.
- [The UI kit](ui-kit.md): the progress bar and the other widgets a job can
  use.
- [Writing a gamemode](writing-a-gamemode.md): the readiness gate, the roster
  and the bucket every call here keeps asking for.
