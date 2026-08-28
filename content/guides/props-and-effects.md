# Props and effects

A roadblock across a street. A crate a player can pick up and carry. A lamp
that lights an alley the base game left dark, and a switch that turns it off.
A fire that keeps burning while players walk away and come back. All of that
is one server-side API and one idea: **the server owns the object, and every
client near it is told to draw it.**

Nothing on this page can be done from a client resource. That is deliberate,
and it is the same rule as ground loot: a client that could mint objects
everyone else sees is a cheat vector, so the client half of this API only
*reads* what the server placed and may make purely decorative things nobody
else can see.

This page is for the person writing the gamemode. For the client-local
`Open77.vfx` and `Open77.sfx` calls — effects one player sees, on their own
machine — see [Visual and audio effects](effects.md).

## What is in the box

| You want | Use |
|---|---|
| A physical object at a place in the world | `Open77.props.create` with `kind = "prop"` |
| A light source | `Open77.props.create` with `kind = "light"` |
| A bang, a spark, a puff of smoke, once | `Open77.effects.play` |
| A fire that keeps burning until you stop it | `Open77.effects.create` |
| A muzzle flash or a sound on a player, an NPC or a car | `Open77.effects.playOn` / `.sound` |
| To try any of it without writing a line of Lua | the slash commands below |

Props and looping effects live in **two registries with the same shape** —
same ids, same ownership, same buckets, same streaming, same cleanup. They
are separate only so that filling one does not consume the room the other
needs. Learn the rules once and they apply to both.

## Permissions

```lua
resource "my_gamemode"
version "1.0.0"

server_script "server/main.lua"

permissions { "world.props", "world.effects" }
```

`world.props` grants `Open77.props`; `world.effects` grants `Open77.effects`.
Declare only what you use — a call into a namespace you did not ask for
answers `permission_denied:world.props` (or `…:world.effects`) rather than
raising.

The same two strings on a **client** manifest mean something different and
much smaller: the read-only view of what this machine is currently drawing,
plus the local decorative API. They do not let a client resource place
anything anybody else sees.

## Your first prop

```lua
local id, reason = Open77.props.create({
    model    = "barrier.concrete",
    position = { x = -1448.2, y = 96.1, z = 17.5 },
    yaw      = 90.0,
})

assert(id, reason)
```

`create` answers with an **id** on success, or `nil` and a reason on failure.
The id is a decimal string — a 64-bit engine number that happens to be
spelled as text. Store it, compare it, pass it back unchanged, and never put
it through `tonumber`: past 2^53 a Lua number stops being able to hold it and
two different props start looking like the same one.

Everything else has a default:

| Field | Type | Default | Meaning |
|---|---|---|---|
| `model` | string | required | A curated alias, or a raw `.mesh` depot path. See [Models](#models). |
| `position` | `{ x, y, z }` | required | Metres. `z` is the **ground height**; see below. |
| `yaw` | number | `0` | Heading in degrees. Pitch and roll are not exposed. |
| `scale` | number or `{ x, y, z }` | `1` | A single number scales all three axes. |
| `kind` | string | `"prop"` | `prop`, `light` or `effect`. Passing a `light` table implies `light`. |
| `bucket` | integer | `0` | Routing bucket. See [Buckets](#buckets-the-prop-nobody-can-see). |
| `physics` | string | `"static"` | `static`, `kinematic`, `dynamic`, `none`. |
| `collision` | boolean | `true` | |
| `visible` | boolean | `true` | `false` keeps the registry entry and hides the object. |
| `appearance` | string | `""` | Template appearance name. |
| `light` | table | — | Only with `kind = "light"`. See [Lights](#lights). |
| `streamingRadius` | number | `120` | Metres at which it streams in. 10–2000. |
| `streamingHysteresis` | number | `30` | Extra metres before it streams out. 0 to `streamingRadius`. |
| `ttlMs` | integer | `0` | Lifetime in milliseconds. `0` means "until removed"; the ceiling is seven days. |

Every bound is enforced by the server, not by you. A value outside one is a
refusal with a reason, never a prop quietly clamped into somewhere you did
not ask for.

## Ground height: the mistake everyone makes first

**A prop's origin is at the bottom of the model, and nothing snaps it to the
floor.** Whatever `z` you pass is where the base of the object goes. Pass the
ground height at that `(x, y)` and the crate sits on the pavement; pass a
number you guessed and it hovers, or it is buried to the lid and looks like
it failed to spawn.

There is no ground query in this API and no `snapToGround` flag. Get your
heights the way everyone does: stand where you want the object, run `/pos`,
and paste the numbers. The [`/pos` command](clipboard.md) copies the
player's transform to the clipboard for exactly this.

That is also why `prop.here` exists. It uses the caller's own feet as the
origin, so it cannot get the height wrong, and it is the fastest way to
survey a scene: walk the route, drop a prop at each spot, then read the
coordinates back out of `prop.list` and paste them into your Lua.

If a prop reports created and you cannot find it, check the height before
anything else — then check the bucket.

## Buckets: the prop nobody can see

`bucket` is the routing bucket the prop belongs to, and a player only ever
sees props in the bucket they are standing in. No radius crosses a bucket.

`Open77.props.create` defaults `bucket` to **0**, not to the bucket of
whoever asked. If your gamemode runs a round inside bucket 7 and a prop is
created without naming a bucket, that prop is created **successfully**,
answers with an id, appears in `Open77.props.all()`, and is drawn for
absolutely nobody. There is no error, because nothing is wrong: an empty
bucket is a legal place to put an object.

So pass the bucket, every time, from the same place your gamemode gets it:

```lua
local origin = Open77.players.position(playerId)   -- { x, y, z, bucket }
Open77.props.create({ model = "crate.small", position = origin, bucket = origin.bucket })
```

`Open77.players.position` returns a table with an `x`, a `y`, a `z` and a
`bucket` — which is why it can be passed straight in as `position`, and why
`origin.bucket` is always the right answer for "the bucket this player is
in". It does **not** carry a heading, so a yaw has to come from somewhere
else.

The bundled slash commands paper over this by defaulting to the caller's own
bucket, which is right for a command typed by a person standing in the world
and is not what the API does. Do not learn the default from the commands.

To move an existing prop between buckets, use `setBucket`: everyone who loses
it gets an explicit stream-out and everyone in the new bucket and in range
gains it. It is a change of audience, not a removal.

## Models

`model` takes a **curated alias** or a **raw cooked `.mesh` depot path**.

An alias is the supported surface. Each one resolves to a host entity built
at asset-build time carrying that object's mesh, which is what makes it
render reliably. There are 32, and **28 of them resolve to a host**:

| Aliases | |
|---|---|
| Furniture | `furniture.chair.metal`, `furniture.stool.metal`, `furniture.bench.wood`, `furniture.bench.metal`, `furniture.table.industrial`, `furniture.table.lab` |
| Crates and containers | `crate.small`, `crate.valuable`, `crate.delivery`, `container.barrel`, `container.locker`, `container.safe`, `container.toolbox`, `container.ammo_case` |
| Barriers | `barrier.concrete`, `barrier.blockade.wide`, `barrier.hesco` |
| Industrial | `pallet.wood`, `industrial.pallet_truck`, `industrial.fire_extinguisher` |
| Bins | `bin.dumpster.large`, `bin.dumpster.small` |
| Signs | `sign.rect.blank`, `sign.rect.keep_out`, `sign.arrow.left`, `sign.street` |
| Electronics | `electronics.monitor`, `electronics.vending_machine` |

**Four aliases have no host and will not draw**:
`furniture.cabinet.industrial`, `barrier.gate.swinging`,
`light.lantern.japanese` and `industrial.forklift`. They are still in the
catalogue because they name the right object, but the asset build could not
resolve a renderable mesh out of their source, so there is nothing to hang on
a host entity. Treat them as unavailable until that changes; do not build a
scene around one.

A **raw `.mesh` path** — `base\environment\...\thing_a.mesh` — also works, and
it is how you reach the several thousand objects nobody has curated. It is
advanced and build-dependent: the file existing in the 2.31 archives proves
that a path resolves, never that the object is the right size, sits on its
origin, or means anything outside the interior it was authored for. Expect to
try several.

A raw **`.ent` path is refused**, with `template_backend_disabled`. That is
not squeamishness: spawning a cooked prop template through this route takes
the whole game process down, so the path is closed rather than left as a way
to crash every player on the server at once.

**`Open77.props.catalog()` returns an empty table on the dedicated server.**
The alias list lives on the client, next to the host entities it resolves,
and the server keeps no copy. The bundled `prop.catalog` command says so
rather than printing `empty` — "empty" reads as "there are no models", which
sends you looking for a catalogue that is not missing, just not on that side.
The table above is the list, and the admin console's `admin.props.catalog`
carries its own copy.

## Changing a prop that already exists

```lua
Open77.props.setTransform(id, { position = { x = -1442.2, y = 127.4, z = 18.0 }, yaw = 45.0 })
Open77.props.update(id, { visible = false })
Open77.props.setBucket(id, 12)
Open77.props.remove(id)
local howMany = Open77.props.clear()   -- everything this resource owns; returns the count
```

`update` is sparse — the fields you do not name are left alone — and it takes
`appearance`, `physics`, `collision`, `visible`, `bucket`, `light`,
`streamingRadius`, `streamingHysteresis` and `ttlMs`. Passing `ttlMs = 0`
clears an expiry without recreating anything.

Position, yaw and scale go through `setTransform` instead, because they
belong together and because moving is the one change the engine will take on
a live object. **A move is cheap and invisible; most other changes are
not.** Position and yaw are written straight onto the existing entity, so a
prop that travels looks like one object travelling. A change the renderer
only reads when it builds the object — scale, or a light switching between
point and spot — costs a rebuild: same id, but a visible blink. The API does
that rather than accepting your patch and quietly rendering the old thing.

**`model` and `kind` are not patchable at all.** A different model is a
different object; remove it and create the new one, and accept the new id.

You may **read** every prop in the registry, from any resource. You may only
**mutate or remove your own** — somebody else's prop answers
`owned_by_another_resource`. And you never have to clean up on shutdown:
stopping or reloading a resource removes everything it created, with the
reason `resource_stopped`. Nothing a resource mints can outlive it, because
a prop no running script remembers is a prop nobody can ever remove.

## Lights

A light is a prop with `kind = "light"` and a `light` table. It streams,
buckets, expires and cleans up down exactly the same path as a crate.

```lua
local lamp, reason = Open77.props.create({
    kind     = "light",
    model    = "light",                                -- a label, not a lookup
    position = { x = -1460.2, y = 99.9, z = 24.8 },
    bucket   = 0,
    light = {
        color     = { x = 1.0, y = 0.82, z = 0.55 },   -- x/y/z, not r/g/b
        intensity = 60.0,
        radius    = 14.0,
        spot      = false,
        enabled   = true,
    },
})
```

| Light field | Range | Default | Meaning |
|---|---|---|---|
| `color` | each channel 0–1 | white | **Keys are `x`, `y`, `z`** — red, green, blue in that order. |
| `intensity` | 0–10000 | `10` | Emission strength. |
| `radius` | 0.1–500 | `8` | Falloff radius in metres. |
| `spot` | — | `false` | `false` is a point light, `true` a cone. |
| `innerAngle`, `outerAngle` | 0–180 | `20`, `45` | Cone angles in degrees. Ignored by a point light. |
| `enabled` | — | `true` | The switch. |

**The colour keys really are `x`, `y`, `z`.** It reads wrong and it is not a
typo: the colour goes through the same three-component vector reader as every
position in the API, so it answers to the vector's field names. `{ r = 1.0,
g = 0.82, b = 0.55 }` is not rejected — it is read as three missing fields and
you get a white lamp.

`model` is not used for a light. Every light is routed to the one host entity
that carries a light component, because the per-object hosts carry geometry
and no light. The string still has to be non-empty, so pass something
readable and expect it to be ignored.

**Switching a light off is cheap; changing its type is not.** `enabled`,
`color`, `intensity`, `radius` and the two angles are written onto the live
light component: the lamp goes dark or changes colour where it stands, with
no blink. Flipping `spot` is structural — a point light and a spot light are
different things to the renderer — so it rebuilds the object.

**Send the whole light table on every update, not just the field you
changed.** A light patch is not merged with the light the prop already has:
the fields you omit come out as their defaults on the client, so an update
carrying only `enabled = false` also resets the colour to white, the
intensity to 10 and the radius to 8. Keep your own copy of the table, change
one field in it, and send all of it — the worked example below does exactly
that.

Reading it back off a snapshot will not help you here, because `light`
arrives from `Open77.props.all()` as a **JSON string** rather than a table.
Indexing it silently yields `nil` for every field, which is the same shape as
"unset". Hold your own copy.

## Reading the registry

```lua
local prop  = Open77.props.get(id)     -- one snapshot, or nil
local all   = Open77.props.all()       -- every prop in the registry
local here  = Open77.props.all(7)      -- ... in bucket 7 only

for _, entry in ipairs(all) do
    print(entry.id, entry.kind, entry.model, entry.bucket,
          entry.position.x, entry.position.y, entry.position.z)
end
```

A snapshot carries `id`, `resource`, `kind`, `model`, `appearance`,
`physics`, `yaw`, `bucket`, `revision`, `collision`, `visible`,
`streamingRadius`, `streamingHysteresis`, `light`, a nested `position` and
`scale`, and `x`/`y`/`z` flattened alongside the nested `position` — both
spellings are present, so read whichever suits you. `revision` is a
monotonic counter shared across the registry; it orders changes and is not a
timestamp.

`Open77.props.nearest(position [, radius])` — "what am I standing next to?" —
is a **client-side** call, not a server one. It answers with a snapshot and a
distance in metres, or `nil` when nothing is in range, and it sees the same
set the client's own `list()` sees. The radius defaults to 10 m and must be
positive: a zero or negative radius is `invalid_radius` rather than an
unbounded search. On the server, filter `all(bucket)` yourself — the bundled
`prop.near` command is nine lines of exactly that, and its default radius is
15 m.

## Effects

`Open77.effects` is the replicated half. Everything it creates is seen by
every player in the bucket and in range, which is what separates it from
`Open77.vfx` / `Open77.sfx` — those are client-local, they exist only in the
client runtime, and only the player who ran the call perceives them.

### One-shots

```lua
local ok, reason = Open77.effects.play("explosion.frag", {
    position = { x = -1448.2, y = 96.1, z = 17.5 },
    bucket   = origin.bucket,
    range    = 150.0,
    sound    = "wwise_event_name",
})
```

A one-shot has no registry entry and no handle: it is broadcast to the
players in range and plays itself out. `range` is 1–500 m and defaults to
150; it decides **who is told**, not how loud it is, so a player outside it
never learns the effect happened. `orientation` takes a quaternion
`{ x, y, z, w }` and defaults to identity. `sound` optionally fires a
spatialised Wwise event at the same point.

Delivery is allowed to be unreliable — a bang that arrives late is worse than
one that never arrives — so never build state on the assumption that every
client played it.

### Looping effects

```lua
local fire, reason = Open77.effects.create({
    effect          = "fire.small",
    position        = { x = -1460.2, y = 99.9, z = 14.8 },
    bucket          = origin.bucket,
    streamingRadius = 90.0,
    ttlMs           = 0,
})

Open77.effects.update(fire, { position = { x = -1460.2, y = 99.9, z = 15.2 } })
Open77.effects.remove(fire)
```

The field is `effect`, not `name`, and the lifetime is `ttlMs`, not
`duration`: the registry retires a loop, the engine does not. `visible`
defaults to `true`, `streamingRadius` to 90 (10–2000), `streamingHysteresis`
to 20, `bucket` to 0 — the same trap as props, and the same fix.

`update` is sparse and takes position, orientation, bucket, visibility and
the two streaming distances. **The effect name is not patchable**: a
different name is a different VFX resource, so remove and create.

`Open77.effects.all(bucket?)` and `.get(id)` read the registry the way the
prop calls do. `Open77.effects.catalog()`, like the prop one, answers with an
empty table on the server — the alias list lives on the client. The curated
effect aliases are `explosion.frag`, `fire.small`, `smoke.steam`,
`smoke.ambient`, `electric.destruction`, `impact.default` and
`impact.concrete`; a raw cooked `.effect` depot path also works, with the
same build-dependent caveat as a raw mesh.

### On an entity

```lua
Open77.effects.playOn(playerId, "muzzle_flash", { duration = 0.15, loop = false })
Open77.effects.sound(playerId, "event_name", { unique = true })
```

Both take a player id or an Open77 entity id — an NPC or a vehicle works as
well as a player — and both are fire-and-forget: the target owns the
lifetime, neither returns a handle, and neither counts against the looping
ceiling. `duration` is in seconds, 0–60, where `0` leaves the lifetime to the
effect itself. `slot` is an optional authored attachment point.

**Three naming schemes, and mixing them up costs an afternoon.** World
effects are addressed by depot path or curated alias. `playOn` takes a name
the *target's own template* declares — `muzzle_flash` is not a file. `sound`
takes a Wwise event name. A depot path handed to `playOn` will not resolve,
and an authored name the template does not define usually produces no visual
at all rather than an error.

## Carrying a prop

The bundled resource ships `prop.pickup` and `prop.drop`, and it is worth
knowing exactly what they are before you build on them.

**Carrying is a server-side follow, not an attachment.** Ten times a second
the server moves the prop to a metre above the carrier's origin, through the
same `setTransform` every other move uses. That is why it replicates for
free, and why another player watching sees the crate travel rather than jump.

What it is not:

- **Not physics.** Nothing collides while it is carried, so a carrier can
  walk a crate through a wall, through a car, and off a roof.
- **Not in the hand.** The prop floats at chest height and does not rotate
  with the carrier — the position snapshot the follow loop reads carries no
  heading, so a carried prop keeps the yaw it had.
- **Not a lease.** Reach is checked on the server at 4 m at pickup time, and
  after that the prop simply follows. A carrier who disconnects, or whose
  position stops resolving, drops it where it was.

One player carries one thing at a time, and only `kind = "prop"` can be
carried — a light or an effect refuses. If you want a real hand attachment,
this is not it, and there is no API for it yet.

## Quotas, lifetime and the three ways a prop dies

| Registry | Per resource | Global |
|---|---|---|
| Server props | 2,048 | 8,192 |
| Server looping effects | 512 | 2,048 |
| Client-local props | 256 | 1,024 |

Both ceilings answer `quota_exceeded`. Every prop is a real streamed engine
entity with a real VRAM cost, so these are budgets rather than formalities.

A prop leaves the registry for exactly three reasons, and every removal
carries which one:

| Reason | When |
|---|---|
| `removed` | You called `remove` or `clear`. |
| `expired` | Its `ttlMs` came due. |
| `resource_stopped` | Its owning resource stopped or reloaded. |

There is no persistence. Nothing survives a server restart, and nothing
survives its owning resource stopping. Keep your scene in a table and place
it on start — the roadblock below is that pattern.

## Worked example: a roadblock the resource owns

Three barriers across a street, raised and lowered by a command, cleaned up
without a stop handler.

```lua
-- server/main.lua
-- permissions { "world.props" }

-- Surveyed once, in the world, with /pos. Each `z` is the ground height at
-- that point: nothing snaps a prop to the floor.
local LAYOUT = {
    { x = -1451.1, y = 102.4, z = 15.6, yaw = 0.0 },
    { x = -1448.6, y = 102.4, z = 15.6, yaw = 0.0 },
    { x = -1446.1, y = 102.4, z = 15.6, yaw = 0.0 },
}

local placed = {}

local function lower()
    local count = #placed
    for _, id in ipairs(placed) do
        Open77.props.remove(id)
    end
    placed = {}
    return count
end

local function raise(bucket)
    if #placed > 0 then return false, "already up" end

    for _, slot in ipairs(LAYOUT) do
        local id, reason = Open77.props.create({
            model    = "barrier.concrete",
            position = { x = slot.x, y = slot.y, z = slot.z },
            yaw      = slot.yaw,
            bucket   = bucket,
        })

        -- Half a roadblock is worse than none: undo and report.
        if id == nil then
            lower()
            return false, reason
        end

        placed[#placed + 1] = id
    end

    return true
end

RegisterCommand("roadblock", function(source, args)
    if args[1] == "down" then
        print(("roadblock: removed %d barriers"):format(lower()))
        return
    end

    -- The caller's bucket, not 0 -- see Buckets. A console caller has no
    -- body and therefore no bucket, so it falls back to the default one.
    local origin = nil
    if source ~= nil and source > 0 then
        origin = Open77.players.position(source)
    end

    local ok, reason = raise(origin and origin.bucket or 0)
    print(ok and "roadblock: up" or ("roadblock: " .. tostring(reason)))
end, true)
```

Two things this example does *not* need. It does not clean up on shutdown:
stopping or reloading the resource removes all three barriers with the reason
`resource_stopped`, because nothing a resource creates may outlive it. And it
does not remember them across a restart, because there is no persistence to
remember them with — `LAYOUT` is the memory, and `raise` is how it comes
back.

If you want the barriers gone the instant the resource stops rather than as
part of teardown, the handler is ordinary:

```lua
AddEventHandler("onResourceStop", function(name)
    if name ~= GetCurrentResourceName() then return end
    lower()
end)
```

## Worked example: a lamp a player can switch

One command places a lamp overhead; the same command switches every lamp this
resource owns. The interesting part is `lamps` — we keep our own copy of each
light table, because a patch that omits a field resets it, and because
reading `light` back off a snapshot gives a JSON string rather than a table.

```lua
-- server/main.lua
-- permissions { "world.props" }

local lamps = {}   -- [propId] = the light table we last sent

local function place(origin)
    local light = {
        color     = { x = 1.0, y = 0.82, z = 0.55 },   -- warm white; x/y/z = r/g/b
        intensity = 60.0,
        radius    = 14.0,
        spot      = false,
        enabled   = true,
    }

    local id, reason = Open77.props.create({
        kind     = "light",
        model    = "light",                            -- ignored for a light
        position = { x = origin.x, y = origin.y, z = origin.z + 2.5 },
        bucket   = origin.bucket,
        light    = light,
    })

    if id == nil then return nil, reason end
    lamps[id] = light
    return id
end

local function switch(id, on)
    local light = lamps[id]
    if light == nil then return false, "not one of ours" end

    light.enabled = on

    -- The whole table, every time. A patch carrying only `enabled` would
    -- take the client's defaults for colour, intensity and radius, and the
    -- lamp would come back white.
    return Open77.props.update(id, { light = light })
end

RegisterCommand("lamp", function(source, args)
    -- The dedicated console has no body, so it has nowhere to put a lamp.
    local origin = nil
    if source ~= nil and source > 0 then
        origin = Open77.players.position(source)
    end
    if origin == nil then
        print("lamp: this command needs an in-game caller")
        return
    end

    if args[1] == "on" or args[1] == "off" then
        local on = args[1] == "on"
        for id in pairs(lamps) do
            switch(id, on)
        end
        print(("lamp: switched %s"):format(args[1]))
        return
    end

    local id, reason = place(origin)
    print(id and ("lamp " .. id .. " placed") or ("lamp failed: " .. tostring(reason)))
end, true)
```

Switching does not respawn anything: `enabled` is written onto the live light
component, so the lamp goes dark where it stands. Had the example flipped
`spot` instead, the object would have been rebuilt and the player would have
seen it blink.

## Trying it from the terminal

The bundled `open77_props` and `open77_effects` resources ship admin
commands. Type them into the developer terminal that `²` opens in Cyberpunk.
They are the fastest way to survey a scene and to check that an alias renders
before you write it into Lua.

```text
prop.here barrier.concrete
prop.near 25
prop.move 1 -1448.6 102.4 15.6 90
prop.pickup 1
prop.drop
light.here 60 14 1 0.82 0.55
fx.here fire.small
```

| Command | Form | Access |
|---|---|---|
| `prop.create` | `<model> <x> <y> <z> [yaw] [bucket]` | restricted |
| `prop.here` | `<model> [yaw]` — at your feet, in your bucket | restricted |
| `prop.move` | `<id> <x> <y> <z> [yaw]` | restricted |
| `prop.remove` | `<id>` | restricted |
| `prop.clear` | — everything this resource owns | restricted |
| `prop.pickup` | `<id>` — within 4 m | restricted |
| `prop.drop` | — | restricted |
| `prop.list` | `[bucket]` | public |
| `prop.near` | `[radius]` — default 15 m, your bucket, sorted by distance | public |
| `prop.catalog` | — currently prints nothing; see [Models](#models) | public |
| `light.here` | `[intensity] [radius] [r] [g] [b]` | restricted |
| `light.create` | `<x> <y> <z> [intensity] [radius] [r] [g] [b]` | restricted |
| `light.toggle` | `<id> <on\|off>` | restricted |
| `fx.play` | `<effect> <x> <y> <z> [bucket]` — one-shot | restricted |
| `fx.here` | `<effect>` — one-shot at your feet | restricted |
| `fx.loop` | `<effect> <x> <y> <z> [bucket]` | restricted |
| `fx.stop` | `<id>` | restricted |
| `fx.list` | `[bucket]` | public |
| `fx.catalog` | — currently prints nothing | public |

A restricted command is gated by the [access control
list](server-acl.md) as `command.<name>`; a public one anybody can run.

One thing to know before you trust what you see: the commands that need a
position — `prop.here`, `prop.near`, `light.here`, `fx.here` — refuse from
the dedicated console, which has no body to stand in.

Two rough edges this guide described on the day it was written have since been
fixed, and are called out here because older notes still mention them. Every
command now defaults to **your** bucket, `fx.play` and `fx.loop` included —
an effect fired from inside a round no longer lands where nobody is standing.
And `light.toggle` now reads the lamp's current settings before flipping the
switch, so a lamp you tuned comes back the colour and brightness you left it.
The underlying cause was worth knowing: a server snapshot hands `light` back
as a JSON string rather than a table, and indexing a string in Lua quietly
yields nil instead of raising, so the "send the whole table" precaution was
sending defaults.

Listings are capped at 100 lines. These commands own only what they create —
a gameplay resource calling the same API keeps its own props, and
`prop.clear` will not touch them.

## Client-side props, and why there is no `local` table

A client resource holding `world.props` can create props too. They are
**already** local-only: they live on that one machine, they belong to the
calling resource, they count against the client quotas of 256 per resource
and 1,024 in total, and they are never sent to anybody. That is what makes
them useful — a placement ghost, a build cursor, a preview the player drags
around before the server is asked to commit it.

So if you go looking for `Open77.props.local_.create`, there is none, and its
absence is the design. A local table would only make sense as the counterpart
of a client `create` that replicates, and there is no such thing: a client
cannot mint an object other players see, on this API or any other. Having two
names for one behaviour would imply that the plain one replicates.

Replication is a different verb entirely — `project(serverId, options)` —
and only the bundled projection resource calls it, when the server hands it a
record.

## Failure reasons

Failures are values. Every mutating call answers `nil, reason` or
`false, reason` rather than raising, so an invalid request and a temporarily
unavailable subsystem are told apart without wrapping every line in `pcall`.

| Reason | Meaning |
|---|---|
| `permission_denied:world.props` | The manifest does not declare `world.props`. Likewise `…:world.effects`. |
| `quota_exceeded` | The per-resource or global ceiling is full. |
| `not_found` | No object with that id: it expired, or it was already removed. |
| `owned_by_another_resource` | It exists, and it is not yours to change. |
| `invalid_position` | Non-finite coordinates, or an axis past ±1,000,000. |
| `invalid_model` | The model string is empty or malformed. |
| `unknown_alias` | Not in the catalogue, and not a depot path. |
| `invalid_argument` | A field is the wrong type, or out of its documented range. |
| `template_backend_disabled` | A raw `.ent` path. See [Models](#models). |
| `record_provisioning_failed` | The engine record for the object could not be minted. |
| `entity_spawn_failed` | The record resolved and the engine still produced no entity. |
| `world_unavailable` | The projecting client has no world loaded, or is mid-transition. |

## See also

- [Visual and audio effects](effects.md) — the client-local half:
  `Open77.vfx` and `Open77.sfx`, seen by one player.
- [Drawing in the world](world-drawing.md) — markers, anchors, nameplates:
  what to reach for when you want an overlay rather than an object.
- [Contextual interactions](interactions.md) — a "hold E" prompt, which props
  do not carry on their own.
- [Loot](loot.md) — the same authority model applied to pickups, and the one
  this API was shaped after.
- [Writing a gamemode](writing-a-gamemode.md) — where the bucket you keep
  passing comes from.
