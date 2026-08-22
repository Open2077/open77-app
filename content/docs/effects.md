# Visual and audio effects

Client Lua resources can trigger REDengine world VFX, entity-authored VFX, and spatialised audio with the `world.effects` permission. Every returned handle is owned by the calling resource. Open77 stops and releases it on `stop`, resource reload, world exit, or plugin unload.

```lua
permissions { "world.effects" }
```

## World VFX

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

Curated aliases currently include `explosion.frag`, `fire.small`, `smoke.steam`, `smoke.ambient`, `electric.destruction`, `impact.default`, and `impact.concrete`.

`duration` is optional: `0` keeps the handle until explicit/resource cleanup; the accepted range is 0–600 seconds. A resource owns at most 64 effects and the client holds at most 256.

## Entity-authored VFX

Some effects are names authored by an entity template rather than depot paths—weapon muzzle flashes are a common example:

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

```lua
for _, effect in ipairs(Open77.vfx.list()) do
    print(effect.id, effect.kind, effect.name, effect.entity, effect.remaining)
end

Open77.vfx.clear() -- only this resource's VFX
Open77.sfx.clear() -- only this resource's SFX
```

Handles are decimal strings so their full 64-bit identity survives Lua number conversion. A resource cannot stop another resource's handle.

## Exhaustive references

- [`docs/generated/vfx-assets-2.31.csv`](../docs/generated/vfx-assets-2.31.csv) lists all 1,070 `.effect` paths found in the local 2.31 cooked-archive inventory.
- [`docs/generated/sfx-events-wolvenkit-seed.csv`](../docs/generated/sfx-events-wolvenkit-seed.csv) lists 17,586 distinct Wwise event names from 17,684 WolvenKit database rows. Its source declares game version 1.6; entries therefore require runtime validation on 2.31.

These catalogues reference identifiers only. Open77 does not redistribute game assets or audio banks.
