# Server-owned world props

Open77 props are canonical server objects projected into REDengine only for the players near
them. A server resource creates and owns the prop; the server owns its identity, transform,
routing bucket and lifetime. A client resource reads what it is currently projecting and may
place purely local decorations of its own, but **it cannot create a prop that anybody else
sees**. This is the ground-loot model, and it is the safe one: an unbounded client-side spawn
API is a cheat vector.

One registry holds three kinds. A prop, a light and a looping effect are all "a thing at a
transform that streams and can be removed", so they share `Open77.props` and are told apart by
`kind`. Looping effects keep their own author-facing entry point in
[Visual and audio effects](effects.md) and land in this same registry regardless.

## Status of this page

> ### Measured 2026-08-28: props, lights and effects work; two limits remain
>
> An earlier version of this block warned that props drew the wrong model and that
> the API did not do what this page described. That was true when it was written
> and is no longer. What changed, and what did not, is below; the evidence is in
> [the research note](../docs/research/props-and-object-spawning.md).
>
> **Working, and proven in game on two clients:**
>
> - **A prop draws the model you ask for.** Geometry cannot be chosen at runtime on
>   2.31 — `entMeshComponent::mesh` cannot be redirected once the component is
>   attached — so one host entity is authored per curated alias at asset-build
>   time. `prop.catalog` lists what the running client actually hosts. A raw
>   `.mesh` depot path also works.
> - **Create, move and remove replicate**, a late joiner receives props in its
>   snapshot, and an out-of-range prop is not projected.
> - **Lights** are visible, correctly coloured, and `enabled` toggles in place
>   without respawning the prop.
> - **Effects** play as one-shots and loops, survive a client leaving and
>   returning, and stop on every client when removed.
> - **Carrying** (`prop.pickup` / `prop.drop`) moves a prop with its carrier and
>   both players see every step.
>
> **Still true, and worth planning around:**
>
> - **116 of the 184 generated hosts are solid; the other 68 are not.** Measured
>   2026-08-29. The host now carries `entPhysicalMeshComponent` rather than
>   `entMeshComponent`, so a prop whose mesh ships collision shapes stops a
>   player. The 67 that do not are not a bug in the spawner: their meshes carry
>   no `meshMeshParamPhysics` at all, and they are solid in the vanilla world
>   only because a level author placed a separate collision node beside them.
>   `prop.catalog` and `docs/generated/prop-hosts.json` record which is which
>   per alias. Among the hollow ones are things that look like they should
>   stop you — `barrier.hesco`, `container.shipping`, `street.hydrant`,
>   `industrial.forklift`.
> - **`collision = false` cannot be honoured.** The solid component is also the
>   visible one, so switching collision off would blank the prop. The request is
>   refused with a warning naming the prop rather than silently ignored.
> - **A carried prop is still teleported rather than simulated**, so carrying one
>   through a wall still works. Collision governs standing props.
> - **Do not point `model` at a raw `.ent` path.** The entity-template back-end is
>   refused by default with `template_backend_disabled`. The crash it guards
>   against is specific to templates whose root chunk derives from `entEntity`,
>   which is most decorative props; a game-object root spawns safely, and that is
>   how the light host is built. The guard stays because the distinction is not
>   something a `model` string can express.
> - **An alias whose target resolves to no mesh falls back to the marker
>   cylinder**, silently; only `Open77.props.catalog()` on the **client** — and
>   `docs/generated/prop-hosts.json` after an asset build — will tell you. Four aliases
>   used to do this — `furniture.cabinet.industrial`, `barrier.gate.swinging`,
>   `light.lantern.japanese` and `industrial.forklift` — because they named
>   `.ent` files whose only `mesh` field held a `.physicalscene`. All four now
>   name the `.mesh` the vanilla entity was wrapping. The failure mode remains,
>   so compare `prop.catalog` against the configured list after any catalogue
>   change.

## Manifest permissions

```lua
permissions { "world.props" }
```

Server mutation requires `world.props`. The same string on a **client** manifest grants the
read-only projection view and the local decorative API; a client resource that omits it gets an
empty `Open77.props.list()` and `permission_denied:world.props` from
`Open77.props.create` on the client.

## Architecture

- Prop IDs are **decimal strings**, so their full 64-bit identity survives Lua number
  conversion. Store, compare and return them unchanged; never pass one through `tonumber`.
- A prop is streamed only to players in the same routing bucket and inside its interest radius.
  Hysteresis keeps a player standing on the boundary from cycling between stream-in and
  stream-out.
- A prop belongs to the resource that created it. **A resource may read every prop in the
  registry, but may only mutate or remove the ones it created**; another resource's prop answers
  `owned_by_another_resource`.
- Stopping or reloading a resource removes **everything** it created, with the removal reason
  `resource_stopped`. Nothing a resource mints may outlive it, or the world accumulates props no
  script can ever remove again.
- Replication rides the same JSON net-event path as ground loot, not a binary opcode. Props are
  created, retransformed and removed — they do not move every frame, and that is exactly what
  makes the cheap path correct for them.
- Every prop is a real streamed engine entity with a real VRAM cost. The registry holds at most
  **8,192 props**, of which one resource may own **2,048**; both ceilings answer with
  `quota_exceeded`.

## Create a prop

The short form is a model and a place to put it:

```lua
local id, reason = Open77.props.create({
    model    = "furniture.chair.metal",
    position = { x = -1440.0, y = 130.0, z = 18.0 },
    yaw      = 90.0,
})

assert(id, reason)
```

The full definition:

```lua
local id, reason = Open77.props.create({
    model      = "crate.small",
    position   = { x = -1448.2, y = 96.1, z = 17.5 },
    yaw        = 180.0,
    scale      = { x = 1.0, y = 1.0, z = 1.0 },
    appearance = "",
    bucket     = 0,
    physics    = "static",
    collision  = true,
    kind       = "prop",
    streamingRadius     = 120.0,
    streamingHysteresis = 30.0,
    ttlMs      = 0,
})
```

| Field | Type | Default | Meaning |
|---|---|---|---|
| `model` | string | required | A curated alias, or a raw depot `.mesh` path. At most 256 bytes. An alias draws the model it names through its authored host entity; a raw `.ent` path is refused with `template_backend_disabled` (§Status). See [Models](#models-aliases-and-raw-depot-paths). |
| `position` | `{ x, y, z }` | required | World position in metres. Non-finite values, or any axis past ±1,000,000, give `invalid_position`. |
| `yaw` | number | `0` | Heading in degrees. Pitch and roll are not exposed. |
| `scale` | `{ x, y, z }` | `{1,1,1}` | Each axis 0.01–100. Non-unit scale is honoured by the mesh back-end only; see [Models](#models-aliases-and-raw-depot-paths). |
| `appearance` | string | `""` | Template appearance name, at most 128 bytes. Empty means the template's default. |
| `bucket` | integer | `0` | Routing bucket. A player only ever sees props in their own bucket. |
| `physics` | string | `"static"` | `static`, `kinematic`, `dynamic` or `none`. **No effect today: the spawned object carries no `entPhysicalMeshComponent` (§Status).** |
| `collision` | boolean | `true` | **No effect today — props are always non-blocking (§Status).** `false` is intended to leave the object visible and non-blocking. |
| `visible` | boolean | `true` | `false` keeps the registry entry and hides the object. |
| `kind` | string | `"prop"` | `prop`, `light` or `effect`. See [Lights](#lights) and [Effects in this registry](#effects-in-this-registry). |
| `light` | table | — | Accepted only when `kind == "light"`; supplying it for any other kind is rejected. See [Lights](#lights). |
| `streamingRadius` | number | `120` | Distance in metres at which the prop streams in. Range 10–2000. |
| `streamingHysteresis` | number | `30` | Extra distance before it streams out. Range 0 to `streamingRadius`. |
| `ttlMs` | integer | `0` | Lifetime in milliseconds. `0` means "until removed"; the ceiling is seven days. |
| `persistent` | boolean | `false` | **Not implemented as an API field.** The authoritative registry has no persistence field, and a stopped resource loses every prop it created: write your own scene table and recreate them on start. What *does* exist is the bundled resource's opt-in — see [Persistence](#persistence-the-bundled-resources-opt-in). |

`static` is the default for `physics` on purpose: a prop that shoves the player around is a
deliberate choice, never something you get by forgetting a field.

Every bound above is enforced by the server registry, not by the caller. A value outside one is a
failure with a reason, never a silently clamped prop somewhere you did not ask for.

## Models: aliases and raw depot paths

`model` accepts a **curated alias** or a **raw cooked depot path**. This is deliberately the same
split as the VFX catalogue, and it carries the same warning.

A curated alias is the supported surface. It has been reviewed, it resolves to a path that has
been seen to work on this build, and it keeps resolving when the underlying path is corrected.
`Open77.props.catalog()` returns the real list, each entry pairing an alias with the model it
resolves to, and **is the only list worth trusting at runtime** — it is what the client actually
hosts, where the table below is what the client was asked to host.

The catalogue is **185 aliases in 29 families**, named `family.thing.variant`. Of those,
184 use generated spawn-safe hosts and `race.checkpoint` keeps its audited authored
device template. Rather than reproduce all 185 here, the families and their sizes:

| Family | n | What is in it |
|---|---|---|
| `furniture.*` | 18 | chairs, stools, benches, tables, counters, a sofa, a bed, shelving, cabinets |
| `office.*` | 6 | desks, office chairs, a file cabinet, a lobby reception desk |
| `kitchen.*` | 5 | counter, fridges, stove, coffee machine |
| `bathroom.*` | 3 | toilet, shower, mirror |
| `crate.*` | 7 | loot crates, delivery and cargo crates, cardboard, ammo box |
| `container.*` | 12 | barrel, locker, safe, toolbox, keg, tanks, jugs, bucket, freight, shipping container |
| `barrier.*` | 10 | blockades, hesco, jersey and pedestrian barriers, a swing gate, tire blocker |
| `fence.*` | 4 | railings and a wire-fence reinforcement |
| `sign.*` | 6 | generic plates, a direction arrow, a street sign, a homeless sign, kiosk frame |
| `street.*` | 11 | lamp posts, hydrant, parking meter, traffic light, poles, boxes, awning, AC unit |
| `bin.*` | 5 | dumpsters and trash cans |
| `garbage.*` | 5 | bags, cardboard, street and industrial trash, a mattress |
| `debris.*` | 5 | rubble, corrugated sheet, construction and sand piles, rebar |
| `pallet.*` | 3 | cargo pallets |
| `industrial.*` | 11 | forklift, pallet truck, trolleys, generator, gas pump, racks, machinery, vents |
| `pipe.*` | 4 | pipe runs by gauge, plus a waste pipe |
| `electronics.*` | 12 | monitors, vending machines, arcade, jukebox, server, register, fuse box, camera |
| `light.*` | 9 | lanterns, ceiling and fluorescent fixtures, spotlight, desk and hanging lamps, candle, disco ball |
| `vegetation.*` | 5 | planters, flower pots, a palm attachment |
| `market.*` | 5 | market stands, kiosk, shop shelving |
| `food.*` | 6 | street food, cans, packaged drink and snacks, a bottle, a beer tap |
| `medical.*` | 7 | cart, IV stand, monitor arm, devices, container, morgue table, body bag |
| `military.*` | 5 | cases, weapon rack, checkpoint, security gate |
| `door.*` | 4 | swing gate, elevator doors, glass door, shuttle door |
| `recreation.*` | 5 | billiard and roulette tables, gym equipment, tent, sleeping bag |
| `music.*` | 3 | electric guitar, amplifier, piano |
| `decor.*` | 4 | sculptures, a painting, a vase |
| `tool.*` | 3 | shovel, welder, fire axe |
| `race.*` | 2 | the visual-only sq024 road chevron host and the authored two-sided checkpoint gate |

### Two things about scale, before you file a bug

Every alias was measured before shipping, by reading each mesh's own `boundingBox`
out of the depot rather than by spawning it. Two results are worth knowing, because
both look like faults and only one was.

**`sign.*` direction signage is wall-mounted and small.** `sign.arrow.left` is
8 x 0 x 10 cm — a flat plate with no thickness, because the whole `directions_*`
family in the depot is interior wall signage meant to sit flush on a surface.
Spawned free-standing at your feet it is essentially invisible, and it reads as
"the prop did not appear". The asset is correct; place it against a wall, or use
`sign.rect.blank` / `sign.street` when you want something that stands up on its own.

**A prop that draws something tiny is indistinguishable from one that draws
nothing.** `electronics.vending_machine` pointed for a long time at
`vending_machine_device_a.mesh`, which is the interactive device panel rather than
the machine, and measured 31 cm. In game that is not a scale bug, it is an absence:
nobody looks at 31 cm of plastic and thinks "that vending machine is too small".
It was found by measuring the catalogue, not by looking at it, and no amount of
spawning things and eyeballing them would have named the cause. If a prop seems
missing, check its mesh extent before assuming the spawn failed.

For the exact alias strings: `admin.props.catalog`, or the **Props** tab of the admin panel,
where the buttons are grouped by family. `prop.catalog` from the bundled `open77_props` resource
answers client-side only — on a dedicated server it says so rather than printing an empty list.
The source of truth is `kModelAliases` in `client/src/api/Props.cpp`, mirrored by name into
`resources/system/open77_admin/shared/config.lua`.

Every path in that table was checked verbatim against the cooked archive listing. **None of them
is individually validated in game** — every row still reads
`discoverable_not_individually_validated`, so archive presence proves the file exists and nothing
more.

A raw path — `base\...\name.ent` or `base\...\name.mesh` — is **advanced and build-dependent**.
The file being present in the 2.31 archives does not guarantee that the object is safe, visible,
correctly collided, or meaningful outside the quest or interior it was authored for. Archive
presence proves discoverability, nothing else. An alias that is not in the catalogue fails with
`unknown_alias`; a path the engine will not resolve fails with `invalid_model`.

The path also picks the back-end, which is why `scale` behaves differently between the two:

| Model string | Back-end | Consequence |
|---|---|---|
| `…\name.ent`, or an alias resolving to one | Runtime TweakDB record pointing at the cooked template | You get the object the artist authored — materials, appearances, collision. Scale is the template's. |
| `…\name.mesh`, or an alias resolving to one | An Open77-owned host entity with the mesh written onto its `entMeshComponent` | Needs no record, so it escapes the per-session record ceiling, and it accepts a non-unit `scale`. Collision and material fidelity are then Open77's to supply. |

Template records are provisioned lazily, memoised for the session, and **do not survive a game
restart** — a known property of runtime TweakDB records. They are re-provisioned on the next
session automatically. A failure to mint one returns `record_provisioning_failed`; a record that
mints but produces no entity returns `entity_spawn_failed`.

## Lights

A light is a prop with `kind = "light"`. That is the whole point of the shared registry: a light
streams, buckets, expires and cleans up through exactly the same path as a crate, and there is
no second lifetime to get wrong.

```lua
local lamp, reason = Open77.props.create({
    kind     = "light",
    model    = "light.spot",
    position = { x = -1460.2, y = 99.9, z = 24.8 },
    yaw      = 0.0,
    bucket   = 0,
    streamingRadius = 60.0,
    light = {
        spot       = true,
        color      = { x = 1.0, y = 0.35, z = 0.1 },
        intensity  = 40.0,
        radius     = 12.0,
        innerAngle = 20.0,
        outerAngle = 45.0,
        enabled    = true,
    },
})
```

| Light field | Type | Meaning |
|---|---|---|
| `spot` | boolean | `true` for a spot light, `false`/absent for a point light. Spot is what makes the two angles meaningful. Changing it **respawns** the prop, because point and spot are different light types and the render proxy is built from that. |
| `color` | `{ x, y, z }` | Linear colour, each channel 0–1. The keys really are `x`/`y`/`z`, not `r`/`g`/`b`: the field goes through the shared vector reader, and an `{r,g,b}` table is rejected as `invalid_color`. |
| `intensity` | number | Emission strength, 0–10000. |
| `radius` | number | Falloff radius in metres, 0.1–500. |
| `innerAngle`, `outerAngle` | number | Cone angles in degrees, 0–180. Ignored for a point light. |
| `enabled` | boolean | Whether the lamp is lit. Toggling it does **not** respawn the prop — the live component is rewritten in place — so this is the field to use for a switch. |

The light table rides to the client as opaque JSON, capped at 2 KiB. The server bounds the
payload and proves it parses; it does not pretend to know the engine's field ranges, because the
client owns the component-write contract. Every field above maps to a real field on REDengine's
`entLightComponent` in 2.31 — none of it is simulated on Open77's side.

A light's parameters are written to the live component, and unlike a mesh those writes reach the
renderer: the colour a resource asks for is the colour the frame shows. What cannot be changed
after the fact is the light *component itself* — a light host is authored with its component
already wired, because one appended to a compiled package is attached, reported as enabled, and
emits nothing.

Supplying a `light` table with any `kind` other than `"light"` is rejected rather than ignored.

**A light's render proxy reads its fields when it is built.** Fields that cannot be patched on a
live proxy make `Open77.props.update` respawn the entity rather than silently doing nothing —
the prop keeps its ID, but it will visibly blink. Turning a light off without removing its
registry entry is `Open77.props.update(id, { visible = false })`.

## Effects in this registry

`kind = "effect"` is the registry's third discriminator: a host entity that a looping world VFX
is anchored to. Authors should not reach for it directly. Use `Open77.effects.create`, which
takes an effect name rather than a model path.

A looping effect is kept in its **own** server registry, shaped exactly like this one — same
identity, ownership, revisioning and streaming — with its own ceilings, so filling it does not
consume the room a prop needs. It lands on the client as a `kind = "effect"` entry, which is why
it streams and cleans up through one code path here. See
[Visual and audio effects](effects.md#replicated-effects).

The distinction that matters, and the one worth re-reading before writing any effect code, is
between **client-local** effects (`Open77.vfx` / `Open77.sfx`, decorative, seen by one player)
and **replicated** effects (`Open77.effects`, server-authoritative, seen by everyone in range).
That page covers both and keeps them apart.

## Streaming

Three conditions decide whether a given player has a given prop:

1. The player's routing bucket equals the prop's `bucket`. No radius makes a prop cross buckets.
2. The player is within `streamingRadius` metres — the prop streams in.
3. The player passes `streamingRadius + streamingHysteresis` metres — the prop streams out.

The gap between 2 and 3 is what stops a player pacing on the boundary from thrashing the
streamer. Interest is recomputed against the last player snapshot the server received, and each
change is sent to the players it concerns rather than broadcast to the whole bucket — an RP
server will hold thousands of props, and a bucket-wide broadcast does not survive that.

A player who joins late, or who returns inside the radius, receives the prop in a snapshot; no
resource needs to replay anything.

## Mutation

```lua
Open77.props.update(id, { appearance = "worn", collision = false, visible = true })
Open77.props.setTransform(id, { position = { x = -1442.2, y = 127.4, z = 18.0 }, yaw = 45.0 })
Open77.props.setBucket(id, 12)
Open77.props.remove(id)
```

`update` patches `appearance`, `physics`, `collision`, `visible`, `bucket`, `light`,
`streamingRadius`, `streamingHysteresis` and `ttlMs`. It is sparse: fields you do not name are
left alone. Passing `ttlMs = 0` clears an expiry that was already set, which is how you cancel a
TTL without recreating the prop.

**`model` and `kind` are not patchable.** Changing either means a different object, so remove the
prop and create a new one; the new prop gets a new ID, which is the honest outcome. `scale` goes
through `setTransform`, next to the position it belongs with.

**One of these mutations is cheap and the rest are not.** Position and yaw are the one change the
engine will take on a live entity, so moving a prop is a transform write with no respawn and no
visible pop. Scale, and any light parameter the render proxy only reads when it is built, respawn
the entity behind the same ID — the API does that rather than accepting the patch and quietly
rendering nothing.

`setBucket` moves visibility scope, and it is not a removal: the next interest pass sees the
mismatch and hands every viewer that lost the prop an explicit stream-out, while every player in
the new bucket and inside the radius gains it.

## Inspection and cleanup

```lua
local prop = Open77.props.get(id)          -- canonical snapshot, or nil
local every = Open77.props.all()           -- every prop in the registry
local here  = Open77.props.all(12)         -- ... filtered to one bucket

for _, entry in ipairs(every) do
    print(entry.id, entry.kind, entry.model, entry.bucket, entry.revision)
end

for _, entry in ipairs(Open77.props.catalog()) do
    print(entry.alias, entry.model)
end

Open77.props.clear() -- only this resource's props
```

A snapshot carries `id`, `revision`, `resource`, `kind`, `model`, `appearance`, `position`,
`yaw`, `scale`, `bucket`, `physics`, `collision`, `visible`, `streamingRadius` and
`streamingHysteresis`; a light also carries its `light` table, and a prop with a TTL carries its
expiry. `revision` is monotonic and is what a projection compares against — it is not a
timestamp, and the counter is shared across the registry, so it orders changes rather than
counting a prop's own edits.

Records may arrive with a nested `position` table or with flattened `x`/`y`/`z` depending on
where you read them; the bundled resource accepts both rather than trusting one shape, and code
that walks snapshots should do the same.

`clear()` removes everything this resource owns, returns how many went, and touches nothing
else. It is not a way to tidy up after another resource, and there is deliberately no call that
is.

A prop leaves the registry for exactly three reasons, and the removal carries which one:
`removed` for an explicit call, `expired` when its TTL comes due, and `resource_stopped` when its
owner stops or reloads.

## Finding the prop next to you

`Open77.props.list()` gives you every prop this resource owns and leaves the distance
maths to you. When the question is "what am I standing next to?", `nearest` answers it
directly:

```lua
local prop, distance = Open77.props.nearest({ x = px, y = py, z = pz })
if prop then
    print(("nearest is %s, %.2f m away"):format(prop.model, distance))
end

local prop = Open77.props.nearest(position, 25)   -- widen the search to 25 m
```

It returns the prop snapshot and its distance in metres, or `nil` when nothing is in
range. `nil` is an ordinary answer rather than a failure — "nothing nearby" is a normal
state of the world, so there is no error string to check for it.

The radius defaults to **10 m** and must be a positive number. A radius of `0` or a
negative one is rejected with `invalid_radius` rather than treated as an unbounded
search; searching everything is what `list()` is for, and silently widening a caller's
range check would make that check a lie.

`nearest` sees exactly what `list()` sees — the props this resource owns, plus any it has
projected. It is a convenience over the same data, not a way to discover props belonging
to somebody else, and the two functions returning different sets would be a trap rather
than a feature.

Ties go to whichever prop the registry lists first, so repeated calls with identical
inputs give identical answers.

## Client-side props that never replicate

There is no separate `local` table. A prop created from a **client** resource with
`Open77.props.create` is already local-only: it lives on that machine, is owned by the
calling resource, counts against the per-owner (256) and global (1024) quotas, and is
never sent to anybody. Replication is a different verb entirely — `project(serverId,
options)`, which only the bundled projection resource calls when the server hands it a
record.

So the client-side `create` *is* the local-only prop. An earlier draft of this API
planned an `Open77.props.local_.create` / `.remove` pair as its counterpart; it was not
built, because there is no non-local client create for it to be the counterpart of, and
having two names for one behaviour would imply that plain `create` replicates.

## Server API reference

Every method requires `world.props`.

| Function | Signature | Result |
|---|---|---|
| `Open77.props.create` | `(definition)` | Prop ID as a decimal string, or `nil, reason`. |
| `Open77.props.update` | `(id, patch)` | `boolean, reason?` |
| `Open77.props.setTransform` | `(id, { position?, yaw?, scale? })` | `boolean, reason?` |
| `Open77.props.setBucket` | `(id, bucket)` | `boolean, reason?` |
| `Open77.props.remove` | `(id)` | `boolean, reason?` |
| `Open77.props.get` | `(id)` | Canonical snapshot, or `nil`. |
| `Open77.props.all` | `(bucket?)` | Array of prop snapshots, optionally filtered to one bucket. Reading is not restricted to your own props. |
| `Open77.props.catalog` | `()` | The curated alias list: entries carrying an alias and the model it resolves to. |
| `Open77.props.clear` | `()` | Remove every prop this resource owns. |

Low-level aliases are `CreateProp`, `UpdateProp`, `SetPropTransform`, `SetPropBucket`,
`RemoveProp`, `GetProp`, and `GetProps`. Prefer the namespaced wrappers: they accept structured
option tables and validate them.

## Failure reasons

| Reason | Meaning |
|---|---|
| `permission_denied:world.props` | The manifest does not declare `world.props`. |
| `quota_exceeded` | The per-resource or global prop ceiling is full. Remove something first. |
| `not_found` | No prop with that ID, or it expired or was already removed. |
| `owned_by_another_resource` | The prop exists but belongs to a different resource. |
| `invalid_position` | Non-finite coordinates, or outside the world bounds the protocol accepts. |
| `invalid_model` | The model string is malformed, or the depot path does not resolve. |
| `unknown_alias` | The alias is not in `Open77.props.catalog()`. |
| `record_provisioning_failed` | A runtime TweakDB record for the template could not be minted. |
| `entity_spawn_failed` | The record or host entity resolved but the engine produced no entity. |
| `world_unavailable` | No world is loaded on the projecting client, or it is mid-transition. |

Failures are values, not errors: every mutating call returns `nil, reason` or `false, reason`
rather than raising, so a caller can tell an invalid request from a temporarily unavailable
subsystem without wrapping every line in `pcall`.

## Client API

A client resource **projects and reads**. It has no way to mint a replicated prop, by design.

Local props are decorative: a placement ghost, a build cursor, a preview the player is dragging
around. They are never replicated, never visible to anyone else, and they are charged against the
calling resource's own quota so a busy gamemode cannot starve the projection of real props.

On the client, `Open77.props.create` **is** that local path — there is no separate `local_` table.
The name is the same as the server's because the two `Open77` tables are different objects on
different machines, exactly as they are for every other Open77 API; what differs is what the call
means on each side. On the server it mints an authoritative, replicated prop. On the client it
makes a decorative one that never leaves the machine.

```lua
local ghost, reason = Open77.props.create({
    model     = "crate.small",
    position  = { x = -1442.2, y = 127.4, z = 18.0 },
    yaw       = 0.0,
    collision = false,
})

assert(ghost, reason)
Open77.props.remove(ghost)
```

```lua
-- Your own local props, with what the renderer actually did with each.
for _, prop in ipairs(Open77.props.list()) do
    print(prop.id, prop.kind, prop.model, prop.backend, prop.rendered, prop.failed)
end
```

`list()` is scoped to the calling resource's own props. It deliberately does **not** include
server-owned props: those belong to the session, not to any resource, so asking a resource-scoped
question about them would return an empty table and read as "there are no props" rather than
"wrong question". To see projected server props, use the `open77_props` resource's `all` export,
which returns the records as the server sent them.

Two events are raised as the projection changes. The bundled `open77_props` resource raises them,
and a client `TriggerEvent` fans out to **every** running client resource, so any resource can
listen without depending on an export:

```lua
AddEventHandler("open77:props:added", function(id, record)
    -- record is the server prop, now projected locally.
    print("projected", id, record.model, record.kind)
end)

AddEventHandler("open77:props:removed", function(id, reason)
    -- reason names why: a server removal, an expiry, a stream-out, or
    -- "projection_failed" when the native layer refused to build it.
    print("dropped", id, reason)
end)
```

`added` fires once per prop, when its record first arrives and is projected — not again on every
update. Both fire for server-owned props only. A local prop is yours already: you have its ID
from `create`.

## Catalogue

The generated inventory lives at `docs/generated/props-2.31.csv`, alongside the VFX, clothing,
NPC and weapon catalogues. Its columns are `category`, `path`, `kind` (`ent` or `mesh`),
`source`, `game_version` and `runtime_status`.

`runtime_status` starts at `discoverable_not_individually_validated` for every row, exactly as
the VFX catalogue does, and is promoted only by a sampler that actually spawns entries and
records which of them render. **Archive presence is not proof of playability.**

The catalogue carries identifiers and provenance only. Open77 does not redistribute game assets.

## Reference resource and terminal commands

The bundled [`open77_props`](../resources/system/open77_props/) resource is the reference
implementation. Its client half mirrors the registry into the native projection layer and
acknowledges each projection back to the server; nothing there runs on a tick, and a prop is
projected once when its record arrives rather than polled. Its server half registers the admin
commands below with `RegisterCommand`, exactly as `open77_loot` does.

```text
prop.create furniture.chair.metal -1440.0 130.0 18.0 90 0
prop.here crate.small
prop.list 0
prop.near 25
prop.remove 1
prop.clear
prop.catalog
```

Type these into the developer terminal opened with `²` in Cyberpunk.

| Command | Form | Access |
|---|---|---|
| `prop.create` | `<model> <x> <y> <z> [yaw] [bucket]` | restricted — `command.prop.create` |
| `prop.here` | `<model> [yaw]` — at the caller's own position and bucket | restricted — `command.prop.here` |
| `prop.list` | `[bucket]` | public |
| `prop.near` | `[radius]` — sorted by distance, caller's bucket only | public |
| `prop.remove` | `<id>` | restricted — `command.prop.remove` |
| `prop.clear` | — removes every prop this resource owns | restricted — `command.prop.clear` |
| `prop.catalog` | — the curated alias list | public |

`prop.here` and `prop.near` need an in-game caller with a fresh position snapshot: the dedicated
console has no body, so they refuse rather than guessing an origin. Listings are capped at 100
lines.

These commands own only what they create. A gameplay resource calling the same API keeps its
own props, and `prop.clear` will not touch them.

## Persistence: the bundled resource's opt-in

By default every prop dies with the server process — the registry is in-memory, and that is the
documented contract above. The bundled `open77_props` resource adds an **opt-in** on top: a
`persist` tunable (Warden → Tuning → open77_props, or `tunable.set open77_props persist true`
from the console), **off by default**, which saves every prop created by its own `prop.*` /
`light.*` commands to the server's database and recreates them at boot.

The contract, measured against a real server-process restart:

- **Off (the default) costs nothing**: no database conversation is ever opened, one log line at
  boot says so, and behaviour is exactly the in-memory contract above.
- **On**, every prop created by the resource's commands is written through — model, kind,
  position, yaw, bucket, and a light's full parameter table. A restart recreates them with the
  same transforms; `prop.move` and `light.toggle` update the saved row; a carried prop is saved
  once, where the carry ends.
- **Deletion is durable**: `prop.remove` deletes the prop's row, `prop.clear` empties the saved
  scene. A removed prop does not resurrect at the next boot. Flipping the tunable off deletes
  nothing already saved — switching back on resumes where you left off.
- A saved row that no longer restores (say its alias left the catalogue) is kept and named in
  the boot log, once per boot, rather than silently discarded.

**Scope is deliberate**: only props created through the bundled resource's commands persist. A
gamemode's programmatic props are the gamemode's to recreate — persisting them here would
double-spawn them at every boot, since the gamemode rebuilds its own scene on start. Server
resources are isolated, so this resource could not see those creates anyway; the honest rule
and the implementable one coincide.

Persistence needs the server's database bridge (`database.enabled` plus
`OP77_DATABASE_CONNECTION`); with the tunable on and no database, the resource says so once and
stays inert. The table is `open77_props_persisted`, created on first use.

## Current limitations

- **68 of the 184 generated hosts have no collision**, listed per alias in
  `docs/generated/prop-hosts.json` under `collision`. Their meshes ship no collision shapes,
  so no component choice makes them solid; they need collision authored or a substituted mesh.
  The other 116 stop a player — verified in game by walking into them, against controls drawn
  from the original hollow 67 that were walked straight through. The additional
  `race.route_arrow` host is intentionally visual-only.
- **A narrow prop can be walked around rather than through.** `container.barrel` blocks
  head-on but a long approach drifts past it. That is geometry, not a missing collider.
- `physics = "dynamic"` names a simulated prop, which is a continuously moving networked entity
  and therefore needs an authority-holder model and a binary opcode that the current JSON
  replication path does not have. Do not build on it until that lands.
- Attachment — a prop parented to a player, a bone or a vehicle — is not exposed. Carrying
  exists as `prop.pickup` / `prop.drop` in the bundled resource: the server moves the prop to
  its carrier ten times a second through `setTransform`, so it follows at chest height rather
  than sitting in the hand, and it is teleported rather than simulated.
- Interaction prompts on props are not exposed. Anchor a prompt yourself through
  [contextual interactions](interactions.md) if you need one now.
- `persistent` is not implemented as a field on `Open77.props.create`. A gameplay resource's
  props die with it; keep your own scene table and recreate them on start. Props placed through
  the bundled resource's commands can opt in to surviving restarts — see
  [Persistence](#persistence-the-bundled-resources-opt-in).
- There is no flicker or animation on a light. An earlier draft of this page documented a
  `flicker` field; it never existed in the shipped reader and has been removed rather than left
  as a promise.
- A light prop carries the geometry of the entity its host was cloned from, so it is not
  invisible. A lightless donor with a spawnable root would fix that.
- Pitch and roll are not exposed. A prop is placed with a yaw.
