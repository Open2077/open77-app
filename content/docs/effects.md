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

The curated set is **49 aliases in 14 families**, named `family.thing.variant`: `blood.*` (1), `electric.*` (5), `explosion.*` (6), `fire.*` (5), `glass.*` (1), `impact.*` (4), `laser.*` (1), `neon.*` (2), `smoke.*` (6), `sparks.*` (4), `steam.*` (2), `vehicle.*` (6), `water.*` (3), `weather.*` (3). `Open77.vfx.catalog()` returns the live list on the **client**; `admin.props.catalog` and the **Props** tab of the admin panel both print the mirror, the panel grouped by family. `fx.catalog` from `open77_effects` answers client-side only. The source of truth is `kVfxCatalog` in `client/src/api/Effects.cpp`, mirrored by name into `resources/system/open77_admin/shared/config.lua`.

Two quirks worth knowing. `explosion.frag` names the *barrel* blast — the grenade's own blast is authored into the projectile attack rather than a depot effect, so `explosion.grenade` is the separate indicator effect. And `vehicle.skid` and `vehicle.skid.smoke` deliberately share one path, for API compatibility with the original alias.

`duration` is optional: `0` keeps the handle until explicit/resource cleanup; the accepted range is 0–600 seconds. A resource owns at most 192 effects and the client holds at most 512.

### Authored slot attachment

The client adapter `Open77.vfx.attach(handle, localEntity, slot)` binds a world
effect to an actual slot on the receiving client's body. It requires
`world.effects` and ownership of the effect handle. Pass a decimal-string local
Open77 entity ID (`"1"` for the local player), never a server player ID.

```lua
local attached, reason = Open77.vfx.attach(smoke, localPuppetId, "RightHand")
if not attached then Open77.vfx.stop(smoke) end
```

An absent body returns `entity_unavailable`; an unknown effect handle or slot
returns `not_found`. The native engine follows the authored slot transform.
Replacement/removal of that body retires the attached instance. `attach` is
distinct from `playEntity`'s `instance` name. This adapter is currently under
in-game validation; it is not yet the durable server attachment API.

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

`anchor` defaults to `"body"`. Set `anchor="weaponRight"` to resolve that
body's current native weapon in `AttachmentSlots.WeaponRight`; no weapon pointer
or raw native entity ID is exposed. For example:

```lua
local handle, reason = Open77.vfx.playEntity("spy_perk_charge", {
    entity="1", anchor="weaponRight", persistOnDetach=true, duration=8,
})
```

The effect retains weak references to the original body and weapon. Holstering,
weapon replacement, body replacement, expiration and resource cleanup retire
the handle; native stop targets the original weapon, never its replacement.
`persistOnDetach` does not override this ownership cleanup. Existing quotas and
`world.effects` permission apply. Blackboard parameters are not exposed yet;
an accepted event is not proof of visible FPP particles.

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
local target = { kind = "player", id = tostring(playerId) }
Open77.effects.playOn(target, "muzzle_flash", { duration = 0.15 })
Open77.effects.playOn(target, "fire.small", { duration = 2, slot = "RightHand" })
Open77.effects.sound(target, "event_name", { unique = true })
```

Without `slot`, `playOn` plays an **entity-authored** effect: a name the target's template defines. With `slot`, it plays a world-effect alias/depot path and attaches the instance to that actual authored slot. `sound` plays a Wwise event on the resolved entity.

Both are fire-and-forget and return acceptance, not a visual receipt or durable handle. Typed targets use `kind = "player" | "npc" | "vehicle" | "prop"` and that registry's network `id`. A bare ID now explicitly means a **player**; migrate NPC/vehicle callers to typed targets. Local handles and engine EntityIDs are never server targets. Invalid/missing targets are rejected instead of broadcasting to bucket zero. Receivers resolve independently and discard one-shots whose body is not streamed. For `playOn`, `duration` is in seconds, 0–60. Use `attach` below for persistent effects that must resume after streaming.

For `playOn` and `sound`, the backend captures target bucket/body lifetime at acceptance and drops publication if that binding changes before fanout. When a current cyberware body binding exists, the wire target carries `lifetimeMode="cyberware"` and its incarnation. The receiver resolves immediately, then checks the public incarnation export for that already-present handle, with at most 256 pending checks and a 100 ms deadline. An independent frame task polls these checks, separate from the 125 ms attachment loop and any attachment export waits. It never awaits an unresolved export, waits for a body to stream, or retries a dropped one-shot. A mismatched binding, replaced handle, unavailable export or deadline expires without native playback. Sound action IDs are consumed before this check.

Generic targets and players without a current body binding use explicit `lifetimeMode="compatibility"`: normal playback and death feedback remain available, but delayed first delivery cannot be validated against a receiver body incarnation. Server token checks still apply before fanout. Cached cyberware binding plus handle checks are not proof of the engine's exact body generation, particularly for a replaced local body whose handle remains `1`. This protection is implemented/tested offline; live deployment and full lifecycle validation are separate acceptance gates. It adds no new public options and does not change the gameplay meaning of the incarnation export.

The client helper `Open77.vfx.resolveTarget({kind="player", id="2"})` returns the current receiver-local handle as a decimal string, or `nil, reason`. It requires `world.effects`, distinguishes self from remote players, and does not fall through between registries. Resolve immediately before use; do not persist the returned handle.

`sound` also accepts `{ actionId = "swing:42:impact", excludePlayers = { attackerId, victimId } }` for optional native/network audio deduplication. Exclude only listeners whose native audio already covers this event. Exclusions are at most 32 positive player IDs (numbers or decimal strings), apply before bucket fanout, and do not change the sound's spatial target. Omitted exclusions send to the ordinary target bucket.

An optional `actionId` is a nonempty string of at most 192 UTF-8 bytes, scoped to the calling resource and server lifetime. Repeating it within 60 seconds returns acceptance without broadcasting again; it does not refresh expiry, even if other options differ. Use a distinct action ID per intended sound. Server deduplication retains at most 4096 IDs per resource and 8192 overall, refusing new IDs at capacity until expiry. IDs survive resource restarts within this window. Receivers also suppress repeated wire identities for 60 seconds with a 8192-entry bound, consuming identity before resolving the target so an unstreamed one-shot is not replayed later. This is bounded replay suppression, not an exactly-once guarantee across reconnects, client resource reloads or expiry. `unique` still controls the native emitter behavior; it is independent of `actionId`. Existing calls without `actionId` keep their previous behavior and permission (`world.effects`).

`sound` accepts `duration` in seconds (0.05–60, default 5). This bounds the native emitter lease after the one-shot; choose a longer value for longer authored audio. Projection events (`oneshot`, `upsert`, `remove`, `snapshot`) are reserved to the backend and cannot be forged through `TriggerClientEvent` or local `TriggerEvent`.

An authored name that the target's template does not define normally produces no visual result rather than a failure, exactly as it does client-side.

World VFX use aliases/depot paths, entity-authored VFX use template effect names, and SFX use Wwise events. A depot path passed to `playOn` requires a slot; it cannot resolve as an entity-authored name.

### Server API reference

Every method requires `world.effects`.

| Function | Signature | Result |
|---|---|---|
| `Open77.effects.play` | `(name, opts)` | `boolean, reason?` — one-shot, no handle to keep. |
| `Open77.effects.create` | `(definition)` | Effect ID as a decimal string, or `nil, reason`. |
| `Open77.effects.attach` | `(typedTarget, effect, options)` | Owned durable attached-effect ID, or `nil, reason`. |
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
| `quota_exceeded` | The per-resource or global ceiling for registry entries or sound action identities is full. |
| `target_unavailable` | The typed target has lost the state required to capture its lifetime. |
| `not_found` | No looping effect with that ID, or it expired or was already removed. |
| `owned_by_another_resource` | The entry exists but belongs to a different resource. |
| `invalid_position` | Non-finite coordinates, or an axis past ±1,000,000. |
| `unknown_alias` | The name is not in `Open77.effects.catalog()` and is not a depot path. |
| `entity_spawn_failed` | The anchor entity could not be created on the projecting client. |
| `world_unavailable` | No world is loaded on the projecting client, or it is mid-transition. |

The registry additionally rejects a non-unit orientation quaternion, a `range` outside 1–500, a `duration` outside 0–60 seconds, a streaming radius outside 10–2000, and a target ID of `0`.

Failures are values: `nil, reason` or `false, reason`, never a raise.

### Reference resource and terminal commands

The bundled [`open77_effects`](../resources/system/open77_effects/) resource carries both halves: the client exports documented above, and a server half that owns the admin commands. Type these into the developer terminal opened with `²` in Cyberpunk.

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

World registry creation uses `effect` and `ttlMs`; `playOn` remains a one-shot API even when its native loop flag is true. Use `attach` for an attachment that must cancel, expire and survive stream-out/in.

### Durable attachments

```lua
local fx, reason = Open77.effects.attach({kind='player', id=tostring(player)},
  'electric.industrial_arm', {
    slot='RightHand',            -- observer's authored body slot
    localAnchor='weaponRight',  -- only the target player's own view
    localSlot='right_hand_start', -- verified slot on the held Gorilla weapon
    ttlMs=1500,
    streamingRadius=90,
    streamingHysteresis=20,
  })
-- Release/rejection/holster policy belongs to the gameplay resource:
if fx then Open77.effects.remove(fx) end
```

`world.effects` authorizes creation. `update` and `remove` require the creating resource. `get`/`all` expose the captured `target.kind`, decimal `target.id`, incarnation, slots, `startedAt` and `expiresAt`. Target kinds are `player`, `npc`, `vehicle` and `prop`; IDs never cross registries. The server captures target lifetime and position. Scripts cannot replace the target, move its attachment through `position`/`bucket`, or supply their own incarnation.

`slot` is mandatory. `localAnchor` defaults to `body`; `weaponRight` is available only for player targets. `localSlot` defaults to `slot`. There is no implicit root slot or fallback when the weapon/slot is unavailable. The local native equivalent is `Open77.vfx.attach(handle, localBody, slot, 'body'|'weaponRight')`; omitting its fourth argument preserves body attachment.

For player targets, optional `localEvent` selects an entity-authored event in the
target player's own view. Other clients retain the world effect and body `slot`:

```lua
local id = Open77.effects.attach({kind='player',id=player}, 'electric.industrial_arm', {
    slot='RightHand', localAnchor='weaponRight', localEvent='spy_perk_charge', ttlMs=2500,
})
```

`localEvent` is a nonempty authored name (at most 128 UTF-8 bytes, no controls),
not a depot path; it is rejected for non-player targets. The owner projector
uses native `playEntity` with `breakAllLoops=false`, persistence enabled and the
remaining server lease. Native weapon/body replacement still cleans it up. No
world-effect fallback appears on the owner when the weapon is unavailable.
Typed incarnation, streaming, ordering, removal and snapshots apply to both
views. Local event/anchor selection is immutable for an attachment; remove and
recreate it to change these options. Native event stopping is name-based, so
overlapping identical events on the same native object can stop together;
coordinate these instances in server resources. No Gorilla-specific behavior
is required by this API.

Optional `soundEvent` adds an authored spatial sound to the same attachment lease.
It accepts a nonempty event name of at most 128 UTF-8 bytes without controls.
`soundOnOwner` defaults to `true`; set it to `false` to omit playback on the
target player's own client. Other observers still hear the body-positioned sound.
These options are immutable and available through `get`/`all` and snapshots.

```lua
local id = Open77.effects.attach({kind='player',id=player}, 'electric.industrial_arm', {
    slot='RightHand', localAnchor='weaponRight', localEvent='spy_perk_charge',
    soundEvent='w_cyb_strongarms_spy_perk_charge', soundOnOwner=true, ttlMs=2500,
})
```

Audio uses the resolved target body, independently of the visual anchor. Its
native duration is bounded by the remaining lease, up to 600 seconds. Removal,
expiry, stream-out and incarnation loss stop the captured native sound handle;
stream-in can start it again for the remaining lease. Visual retries do not
restart an already playing sound. Native stopping addresses the original body,
and identical sound events on that body may stop together. Lease extensions can
restart audio after its original native deadline, like particles. Authored sound
events determine whether emission loops; the lease does not make a one-shot loop.
Server resources should coordinate overlapping events and measure any duplicate
with the owner's existing native audio before choosing owner exclusion.

Leases default to 60 seconds and must be greater than zero and at most 600,000 ms. `update(id,{ttlMs=...})` renews the lease from server time. Target loss, player death/readiness loss, body incarnation change, bucket change, expiry and creating-resource stop retire the record. Client stream-out releases particles while retaining unexpired desired state; stream-in reacquires the current local body. Holstering a weapon releases its native handle, and an unexpired record can project again when the required weapon returns. The gameplay resource must remove charge effects when charging ends.

Renewing a lease currently keeps the graph until its original native deadline; if the server lease extends beyond it, the projector recreates the missing instance. For bounded charge presentation, create once with the remaining maximum hold time plus a small delivery margin, then remove on release. This avoids renewal-induced particle restarts.

The wire adds epoch, sequence, server time and chunk metadata to the existing projection events. Snapshot assembly preserves newer deltas; tombstones reject late resurrection. Effect IDs stay strings in Lua. Client expiry uses the minimum observed local-minus-server timestamp offset, which includes network latency and is not a precise synchronized clock.

These paths are implemented with regression coverage; the new FPP weapon anchor and complete durable attachment lifecycle still require live acceptance. Bound characters additionally compare the cyberware projection incarnation via a soft export. Generic players work without an implant or cyberware binding: their token represents server life/readiness, not a direct native incarnation readback. Native weak-reference checks stop attachments on body/weapon replacement. NPC/vehicle/prop IDs are unique within the server epoch and local stream proxies are resolved afresh.

## Exhaustive references

For full-screen quest-style fades rather than entity/world VFX, use the
[native screen transition API](screen-transitions.md).

- [`docs/generated/vfx-assets-2.31.csv`](../docs/generated/vfx-assets-2.31.csv) lists all 1,070 `.effect` paths found in the local 2.31 cooked-archive inventory.
- [`docs/generated/sfx-events-wolvenkit-seed.csv`](../docs/generated/sfx-events-wolvenkit-seed.csv) lists 17,586 distinct Wwise event names from 17,684 WolvenKit database rows. Its source declares game version 1.6; entries therefore require runtime validation on 2.31.

These catalogues reference identifiers only. Open77 does not redistribute game assets or audio banks.
