# Visual and audio effects

Client Lua resources can trigger REDengine world VFX, entity-authored VFX, and spatialised audio with the `world.effects` permission. Every returned handle is owned by the calling resource. Open77 stops and releases it on `stop`, resource reload, world exit, or plugin unload.

```lua
permissions { "world.effects" }
```

## Two effect systems, and they are not interchangeable

This is the single easiest thing to get wrong in this API, so it comes first. Open77 has **two** effect surfaces behind the same `world.effects` permission, and picking the wrong one produces a feature that works perfectly for the person testing it and does not exist for anybody else.

| | Client-local | Replicated |
|---|---|---|
| Tables | `Open77.vfx.*`, `Open77.sfx.*` | `Open77.effects.*` |
| Runtime | `client_script` | `server_script` |
| Who sees it | **Only the player whose client ran the call.** | Every player in range, in the same bucket. |
| Authority | The resource on that one machine. | The server. |
| Owned by | The calling client resource. | The calling server resource. |
| Use it for | HUD-adjacent feedback, a local preview, an effect only the acting player should perceive. | Anything that is part of the shared world: an explosion, a fire, a burning wreck. |

The two do not talk to each other. A client-local `Open77.vfx.play` is never replicated, no matter what triggered it, and a server-side `Open77.effects.play` is not a broadcast of a client call — the server decides who receives it and the projection is built independently on each client.

The rest of this page keeps them apart: sections up to and including [Inspection and cleanup](#inspection-and-cleanup) are the **client-local** API, unchanged; [Replicated effects](#replicated-effects) is the server-authoritative one.

Looping replicated effects live in the same registry as [world props](props.md) — they stream, bucket and expire exactly like a prop, because they are one.

## World VFX

**Client-local.** Seen only by the player whose client ran this call.

```lua
local smoke, reason = Open77.vfx.play("smoke.steam", {
    position = { x = -1440.0, y = 130.0, z = 18.0 },
    orientation = { x = 0.0, y = 0.0, z = 0.0, w = 1.0 },
    ignoreTimeDilation = false,
    duration = 15.0,
})

assert(smoke, reason)
assert(Open77.vfx.stop(smoke))
```

The first argument accepts a curated alias returned by `Open77.vfx.catalog()` or a cooked `base\\...\\name.effect`/`dlc\\...\\name.effect` path. A raw path is advanced and build-dependent: the file being present does not guarantee that the effect is safe, visible, looped, or meaningful outside its original quest/entity context.

The curated set is **49 aliases in 14 families**, named `family.thing.variant`: `blood.*` (1), `electric.*` (5), `explosion.*` (6), `fire.*` (5), `glass.*` (1), `impact.*` (4), `laser.*` (1), `neon.*` (2), `smoke.*` (6), `sparks.*` (4), `steam.*` (2), `vehicle.*` (6), `water.*` (3), `weather.*` (3). `Open77.vfx.catalog()` returns the live list on the **client**; `admin.props.catalog` and the **Props** tab of the admin panel both print the mirror, the panel grouped by family. `fx.catalog` from `open77_effects` answers client-side only. The source of truth is `kVfxCatalog` in `client/src/api/Effects.cpp`, mirrored by name into `resources/open77_admin/shared/config.lua`.

Two quirks worth knowing. `explosion.frag` names the *barrel* blast — the grenade's own blast is authored into the projectile attack rather than a depot effect, so `explosion.grenade` is the separate indicator effect. And `vehicle.skid` and `vehicle.skid.smoke` deliberately share one path, for API compatibility with the original alias.

`duration` is optional: `0` keeps the handle until explicit/resource cleanup; the accepted range is 0–600 seconds. A resource owns at most 64 effects and the client holds at most 256.

## Entity-authored VFX

**Client-local.** Some effects are names authored by an entity template rather than depot paths—weapon muzzle flashes are a common example:

```lua
local flash = Open77.vfx.playEntity("muzzle_flash", {
    entity = remotePuppetId, -- decimal-string Open77 entity id; omitted = local player
    instance = "shot_42",
    persistOnDetach = false,
    breakAllLoops = true,
    breakAllOnDestroy = true,
    duration = 0.15,
})
```

The effect name must exist on that entity's template. Open77 queues `entSpawnEffectEvent`; stopping queues `entKillEffectEvent`. An unknown authored name normally produces no visual result rather than a Lua error.

## Spatialised SFX

**Client-local.** Heard only on the client that made the call.

```lua
local sound, reason = Open77.sfx.play("event_name_from_catalog", {
    entity = remotePuppetId, -- emitter entity; omitted = local player
    emitter = "",           -- optional authored emitter name
    tag = "my_resource",
    seekTime = 0.0,
    unique = true,
    duration = 8.0,
})

assert(sound, reason)
assert(Open77.sfx.stop(sound))
```

Audio is attached to an existing entity and therefore follows it in 3D. `stop` queues `SoundStopEvent` for the same event name. Because REDengine stopping is name-based, two simultaneous identical events on the same entity may be stopped together; use `unique = true` where the Wwise event supports it.

## Inspection and cleanup

**Client-local.** This lists what one client is playing for itself; replicated effects are listed with `Open77.effects.all()` on the server.

```lua
for _, effect in ipairs(Open77.vfx.list()) do
    print(effect.id, effect.kind, effect.name, effect.entity, effect.remaining)
end

Open77.vfx.clear() -- only this resource's VFX
Open77.sfx.clear() -- only this resource's SFX
```

Handles are decimal strings so their full 64-bit identity survives Lua number conversion. A resource cannot stop another resource's handle.

## Replicated effects

Everything above happens on one machine. This section is the other half: effects created by a **server** resource and projected onto every client that should perceive them.

```lua
permissions { "world.effects" }
```

The same permission string, declared in a `server_script` resource's manifest, grants `Open77.effects`. A server resource cannot reach `Open77.vfx` or `Open77.sfx` — those exist only in the client runtime — and a client resource cannot reach `Open77.effects`.

**Status.** The bounds, defaults and ceilings below are read from the authoritative registry (`server/src/Open77.Server.Core/Effects/EffectAuthorityService.cs`), so they are facts about the code as it stands. The **behaviour** is not yet proven in a running session: the acceptance gate is a fire lit from server Lua burning on two clients, surviving one of them streaming away and back, and stopping on both when removed. Until that gate is cleared, read this section as the contract rather than as a measurement. The same caveat and its reasoning are set out in [Status of this page](props.md#status-of-this-page) on the props guide.

### One-shot: `Open77.effects.play`

A one-shot has no registry entry and nothing to stop. The server broadcasts it to the players in range and it plays itself out.

```lua
local ok, reason = Open77.effects.play("explosion.frag", {
    position    = { x = -1448.2, y = 96.1, z = 17.5 },
    orientation = { x = 0.0, y = 0.0, z = 0.0, w = 1.0 },
    bucket      = 0,
    range       = 150.0,
    sound       = "wwise_event_name",
})
```

| Option | Type | Meaning |
|---|---|---|
| `position` | `{ x, y, z }` | Where it happens. Required. Any axis past ±1,000,000 is `invalid_position`. |
| `orientation` | `{ x, y, z, w }` | Quaternion, default identity. It must be roughly unit-length; an all-zero one degenerates the client's transform and is rejected. |
| `bucket` | integer | Routing bucket, default `0`. Only players in it are candidates. |
| `range` | number | Metres. Who sees and hears it. Range 1–500, default `150`. |
| `sound` | string | Optional Wwise event played spatialised at the same point, at most 256 bytes. |

A one-shot never enters the registry: an explosion has no state to reconcile, no revision to bump and nothing to stream back in. `range` is therefore an interest radius, not a volume control — a player outside it is never told the effect happened. Delivery is allowed to be unreliable, because a one-shot that arrives late is worse than one that does not arrive, so never build state on the assumption that every client played it.

### Looping: `Open77.effects.create`

A looping effect is a registry entry. It streams by distance and bucket, it can be patched, and it stops when you say so or when its TTL runs out.

```lua
local fire, reason = Open77.effects.create({
    effect          = "fire.small",
    position        = { x = -1460.2, y = 99.9, z = 14.8 },
    bucket          = 0,
    streamingRadius = 90.0,
    ttlMs           = 0,
})

assert(fire, reason)

Open77.effects.update(fire, { position = { x = -1460.2, y = 99.9, z = 15.2 } })
Open77.effects.remove(fire)
```

| Field | Type | Meaning |
|---|---|---|
| `effect` | string | Curated alias, or a raw cooked `.effect` path, at most 256 bytes. Same rules as the client-local API above. |
| `position` | `{ x, y, z }` | Where it burns. Required. |
| `orientation` | `{ x, y, z, w }` | Quaternion, default identity, validated as for a one-shot. |
| `bucket` | integer | Routing bucket, default `0`. |
| `visible` | boolean | Default `true`. `false` keeps the entry and hides the effect. |
| `streamingRadius` | number | Metres at which it streams in. Range 10–2000, default `90`. |
| `streamingHysteresis` | number | Extra metres before it streams out. Range 0 to `streamingRadius`, default `20`. |
| `ttlMs` | integer | Lifetime in milliseconds. `0` means "until removed"; the ceiling is seven days. |

A looping effect is a registry entry **in the shape of** a prop — same identity, ownership, revisioning and streaming semantics, because a fire a player walks away from and back to must still be burning. The rules are therefore written once, in [world props](props.md#streaming), rather than twice.

It is a **separate registry** with its own ceilings, though, and that is the useful part: at most **2,048 looping effects**, of which one resource may own **512**. Filling the effect registry does not consume the room a prop needs, and vice versa.

`update` is sparse — name only the fields you want changed, and pass `ttlMs = 0` to clear an expiry without recreating the entry. Position, orientation, bucket, visibility and the two streaming distances are all patchable. **The effect name is not**: a different name is a different VFX resource, which is a remove and a create.

### Entity-bound: `playOn` and `sound`

```lua
Open77.effects.playOn(playerId, "muzzle_flash", { duration = 0.15, loop = false, slot = "" })
Open77.effects.sound(playerId, "event_name", { unique = true })
```

`playOn` plays an **entity-authored** effect — a name the target's own template defines, not a depot path — so it follows the entity. `sound` plays a spatialised Wwise event on the entity, which is what makes it follow the target in 3D.

Both are fire-and-forget: the target owns the lifetime, not the registry, so neither returns a handle and neither counts against the looping-effect ceiling. The first argument is a player ID or an Open77 entity ID; an NPC or a vehicle works as well as a player, and `0` is rejected. `duration` is in seconds, 0–60, where `0` leaves the lifetime to the effect itself. `slot` is an optional authored attachment name.

An authored name that the target's template does not define normally produces no visual result rather than a failure, exactly as it does client-side.

**Keep the three mechanisms straight**, because conflating them has already cost a round of experiments: world VFX are addressed by depot path, entity-authored VFX by the name their template declares, and SFX by Wwise event. A depot path passed to `playOn` is not an authored name and will not resolve.

### Server API reference

Every method requires `world.effects`.

| Function | Signature | Result |
|---|---|---|
| `Open77.effects.play` | `(name, opts)` | `boolean, reason?` — one-shot, no handle to keep. |
| `Open77.effects.create` | `(definition)` | Effect ID as a decimal string, or `nil, reason`. |
| `Open77.effects.update` | `(id, patch)` | `boolean, reason?` |
| `Open77.effects.remove` | `(id)` | `boolean, reason?` |
| `Open77.effects.all` | `(bucket?)` | Array of looping-effect snapshots, optionally filtered to one bucket. |
| `Open77.effects.catalog` | `()` | Curated effect aliases. |
| `Open77.effects.playOn` | `(entityOrPlayerId, name, opts)` | `boolean, reason?` |
| `Open77.effects.sound` | `(entityOrPlayerId, event, opts)` | `boolean, reason?` |

IDs are decimal strings for the same reason handles are: their full 64-bit identity has to survive Lua number conversion. No low-level PascalCase aliases are published for `Open77.effects`; the namespaced table is the whole surface.

### Failure reasons

The vocabulary is shared with [world props](props.md#failure-reasons), with this permission in place of that one.

| Reason | Meaning |
|---|---|
| `permission_denied:world.effects` | The manifest does not declare `world.effects`. |
| `quota_exceeded` | The per-resource or global ceiling for registry entries is full. |
| `not_found` | No looping effect with that ID, or it expired or was already removed. |
| `owned_by_another_resource` | The entry exists but belongs to a different resource. |
| `invalid_position` | Non-finite coordinates, or an axis past ±1,000,000. |
| `unknown_alias` | The name is not in `Open77.effects.catalog()` and is not a depot path. |
| `entity_spawn_failed` | The anchor entity could not be created on the projecting client. |
| `world_unavailable` | No world is loaded on the projecting client, or it is mid-transition. |

The registry additionally rejects a non-unit orientation quaternion, a `range` outside 1–500, a `duration` outside 0–60 seconds, a streaming radius outside 10–2000, and a target ID of `0`.

Failures are values: `nil, reason` or `false, reason`, never a raise.

### Reference resource and terminal commands

The bundled [`open77_effects`](../resources/open77_effects/) resource carries both halves: the client exports documented above, and a server half that owns the admin commands. Type these into the developer terminal opened with `²` in Cyberpunk.

```text
fx.play explosion.frag -1448.2 96.1 17.5 0
fx.here fire.small
fx.loop fire.small -1460.2 99.9 14.8 0
fx.list 0
fx.stop 1
fx.catalog
```

| Command | Form | Access |
|---|---|---|
| `fx.play` | `<effect> <x> <y> <z> [bucket]` — one-shot at world coordinates | restricted — `command.fx.play` |
| `fx.here` | `<effect>` — one-shot at the caller's own position and bucket | restricted — `command.fx.here` |
| `fx.loop` | `<effect> <x> <y> <z> [bucket]` — register a looping effect | restricted — `command.fx.loop` |
| `fx.list` | `[bucket]` | public |
| `fx.stop` | `<id>` — retire a looping effect | restricted — `command.fx.stop` |
| `fx.catalog` | — the curated alias list | public |

`fx.here` needs an in-game caller with a fresh position snapshot; the dedicated console has no body and the command refuses rather than guessing an origin. The resource owns only what its own commands create — a gameplay resource calling the same API keeps its own effects.

**One spelling to confirm before you copy it.** The server Lua binding is not yet in the tree, and the bundled resource currently calls `Open77.effects.create` with `name` and `duration` where this page documents `effect` and `ttlMs`. The authoritative registry field is `Effect`, and `effect`/`ttlMs` is the spelling the API surface was specified with; if a call is rejected, check the binding in `LuaResourceRuntime.cs` rather than assuming either.

## Exhaustive references

- [`docs/generated/vfx-assets-2.31.csv`](../docs/generated/vfx-assets-2.31.csv) lists all 1,070 `.effect` paths found in the local 2.31 cooked-archive inventory.
- [`docs/generated/sfx-events-wolvenkit-seed.csv`](../docs/generated/sfx-events-wolvenkit-seed.csv) lists 17,586 distinct Wwise event names from 17,684 WolvenKit database rows. Its source declares game version 1.6; entries therefore require runtime validation on 2.31.

These catalogues reference identifiers only. Open77 does not redistribute game assets or audio banks.
