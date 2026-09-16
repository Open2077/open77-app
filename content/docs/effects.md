# Visual and audio effects

Client Lua resources can trigger REDengine world VFX, entity-authored VFX, and spatialised audio with the `world.effects` permission. Every returned handle is owned by the calling resource. Open77 stops and releases it on `stop`, resource reload, world exit, or plugin unload.

```lua
permissions { "world.effects" }
```

## Two effect systems, and they are not interchangeable

This is the single easiest thing to get wrong in this API, so it comes first. Open77 has **two** effect surfaces behind the same `world.effects` permission, and picking the wrong one produces a feature that works perfectly for the person testing it and does not exist for anybody else.

> **A third thing shares the word "sound" and is not either of these.** `Open77.sfx` plays the *game's own* Wwise events, by name, out of Cyberpunk's banks. [`open77_sound`](sound.md) plays audio *files a resource ships*, through a browser surface, with real `volume` and `pitch` options — which is exactly why it has them and `Open77.sfx` does not. Reach for `Open77.sfx` when you want the game's vocabulary: a weapon click, a menu blip, an alarm. Reach for `open77_sound` when you want your own audio.

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

[Screen effects](#screen-effects) is the one surface with a half on each side and belongs to neither column above, because a full-screen post-process belongs to exactly one pair of eyes: the client half is `Open77.vfx.screen`, the server half is `Open77.effects.screen(playerId, ...)`, and neither is replicated to anybody else.

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

The curated set is **60 aliases in 16 families**, named `family.thing.variant`: `blood.*` (1), `cyber.*` (6 — character status-effect sheets, katana trail and idles, and a generator blast: the closest 2.31 authors to a cyberware look on a body), `electric.*` (7), `explosion.*` (6), `fire.*` (5), `glass.*` (1), `impact.*` (4), `laser.*` (1), `neon.*` (2), `smoke.*` (6), `sparks.*` (4), `steam.*` (2), `vehicle.*` (6), `water.*` (3), `weather.*` (3). `Open77.vfx.catalog()` returns the live list on the **client**; `admin.props.catalog` and the **Props** tab of the admin panel both print the mirror, the panel grouped by family. `fx.catalog` from `open77_effects` answers client-side only. The source of truth is `kVfxCatalog` in `client/src/api/Effects.cpp`, mirrored by name into `resources/system/open77_admin/shared/config.lua`.

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

### Two-dimensional SFX

**Client-local.** A user-interface click has nowhere in the world to come from, so `Open77.sfx.play` — which always wants an entity — is the wrong door for it.

```lua
local ok, reason = Open77.sfx.play2d("ui_menu_onpress")
```

`play2d` posts the event through `gameGameAudioSystem::Play` with no entity and no emitter, which is the same call vanilla scripts make for menu sounds. It is not spatialised, it is not attached to anything, and it does not follow the player.

It returns `true` rather than a handle, and there is nothing to stop it with: a frontend one-shot has no emitter to address a stop to. It also consumes no effect quota, precisely because nothing is tracked. `Open77.sfx.clear()` and resource shutdown have nothing to release here.

Refusals: `permission_denied:world.effects`, `invalid_sfx_event`, `effects_backend_unavailable`, plus `world_unavailable`, `native_unavailable` and `invocation_failed` from the facade.

### A voice-over line

**Client-local.** A bark is not a sound-bank event: it is a `voContext` name the engine resolves against the entity's own voiceset — the same word vanilla scripts pass to `GameObject.PlayVoiceOver` (`greeting`, `fear_beg`, `start_combat`). `Open77.sfx.play` cannot play one, and `Open77.sfx.playVoice` plays nothing else.

```lua
-- The engine's own SoundPlayVo event, queued on the entity.
local ok, reason = Open77.sfx.playVoice("greeting", {
    entity = npcEntity,      -- required; a puppet, not the local player's UI
    ignoreFrustum = true,    -- default: still speaks when off-screen
    ignoreDistance = false,  -- default: the engine's distance cull applies
})
```

This is the executor behind the server's `Open77.npcs.speak` (see [NPC behaviour](npc-behavior.md#speech-one-line-on-demand)): the bundled `open77_effects` resource calls it when the server's one-shot arrives, on every client that has the body streamed, because a voice-over is audible only from a puppet instance and every viewer owns its own. Used directly, it is a purely local line — nobody else hears it.

It returns `true` rather than a handle; a line cannot be stopped by handle and consumes no quota. Refusals: `permission_denied:world.effects`, `invalid_voice` (not an identifier, or longer than 64), `options_must_be_a_table`, `invalid_entity`, `entity_unavailable` (not streamed on this client), `voice_disabled` (the NPC's replicated policy has its voice off — `Open77.npcs.setVoiceEnabled(id, false)` on the server), plus `world_unavailable`, `native_unavailable` and `invocation_failed` from the facade. **A name the voiceset does not carry is dropped by the engine without a word**, and `true` cannot tell you that.

### There is no volume and no pitch, and that is the engine

This gets asked, so here is the measurement rather than an opinion. Neither `play` nor `play2d` accepts a `volume` or a `pitch`, because REDengine's audio surface does not carry either:

- `gameaudioeventsPlaySound` — the event `Open77.sfx.play` posts — has exactly five fields: `soundName`, `emitterName`, `audioTag`, `seekTime`, `playUnique`.
- `gameGameAudioSystem::Play` — the native `play2d` calls — takes `(CName eventName, EntityID, CName emitterName)`. Three parameters, no floats.
- No class or event in the whole `game/audio` surface declares a volume or pitch field.

The one float channel that exists is `gameGameAudioSystem::Parameter(name, value, entity, emitter)`, a **Wwise RTPC**: its valid names are authored inside the sound bank that shipped the event, and they are per-family rather than general. Open77 uses it for vehicle engine curves, where the bank documents the name. There is no `volume` RTPC and no `pitch` RTPC to set.

So loudness is a property of the Wwise event, chosen when the bank was authored. Pick a quieter event; there is no gain to turn down.

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

## Screen effects

**Client-local**, permission `vfx.screen`. Cyberpunk's own full-screen
post-process: the drunk wobble, the drugged smear, the burning edges, the
low-health pulse, the blackout.

```lua
permissions { "vfx.screen" }

local handle = Open77.vfx.screen("drunk", { strength = 0.5, duration = 30 })
-- ... later ...
Open77.vfx.stop(handle)
```

`vfx.screen` is **not** `world.effects`, and the split is deliberate: putting
smoke in a street and covering somebody's eyes are different powers. Two of the
aliases below (`blackout`, `health.critical`) hide most of what the player can
see, so an operator has to be able to grant the first without the second.

The handle is an ordinary effect handle. `Open77.vfx.stop`, `Open77.vfx.list`
and `Open77.vfx.clear` all work on it, because there is one effect registry on
the client rather than two, and one stop path rather than two that can each fail
to reach a looping overlay.

### The vocabulary

`Open77.vfx.screenCatalog()` returns `{ [alias] = engineEffectName }`.

| Alias | What it looks like | Loops? |
|---|---|---|
| `drunk.light` / `drunk.medium` / `drunk.heavy` | the alcohol wobble, three authored tiers | yes |
| `drugged.light` / `drugged.medium` / `drugged.heavy` | the drug/poison smear, three tiers | yes |
| `health.low` / `health.critical` | the vanilla low-health overlay | yes |
| `pain` | the generic hit flinch | no |
| `damage.fire` | the burning-damage indicator | no |
| `damage.emp` | the EMP-damage indicator | no |
| `burning` | the burning status overlay | yes |
| `electrocuted` | the electrocution status overlay | yes |
| `bleeding` | the bleeding status overlay | yes |
| `blinded` | the flash/blind overlay | yes |
| `drowning` | the out-of-oxygen overlay | yes |
| `exhausted` | the stamina-exhaustion overlay | yes |
| `blink` | eyes closing, once | no |
| `blackout` | eyes closed and held | yes |

**A looping alias needs a `duration` or a `stop`.** `duration` is in seconds,
`0..600`; `0` means "hold it until something ends it". Resource stop, reload,
error, world exit and disconnect all end it, so the worst case is an effect that
lasts as long as the resource — never one that outlives the session.

### `strength` picks a tier, not an intensity

```lua
Open77.vfx.screen("drunk", { strength = 0.2 })   -- drunk.light
Open77.vfx.screen("drunk", { strength = 0.5 })   -- drunk.medium
Open77.vfx.screen("drunk")                       -- drunk.heavy
```

`strength` is `0..1` and selects among the tiers **the game authored** for
`drunk`, `drugged` and `health`. Omitting it means `1.0`, which is the heaviest
tier — "the effect". An alias with only one tier ignores it.

There is no continuous amount, unlike FiveM's `AnimpostfxPlay`. The drunk
overlay's own level rides a blackboard the player's own script owns
(`vfx_fullscreen_drunk_level`), and writing another system's blackboard on a
guess is the class of thing that ends a process. The API promises what is true.

### Unknown names are refused, never forwarded

```lua
Open77.vfx.screen("sandevistan")          --> nil, "unsupported_screen_effect"
Open77.vfx.screen("status_drunk_level_1") --> nil, "unsupported_screen_effect"
```

Spelling the *engine's* own name is refused too — that would be exactly the way
around the curated table. The reason the gate is this strict: an authored effect
name the player entity does not carry is a **silent no-op** in the engine.
Nothing renders and nothing is reported, so a typo that reached the engine would
be indistinguishable from a broken feature, and a name that reached a dormant
channel has already cost this project a client crash (see the notification row's
`unsupported_channel`).

Every alias in the table was read out of the installed game's own shipped data
with no client running: the string constants in `r6/cache/final.redscripts`
(inside the `PlayerPuppet` functions that play them) and in `r6/cache/tweakdb.bin`
(as the VFX list of a `BaseStatusEffect` record applied to the player). The
provenance for each one is in `kScreenFxCatalog` in
`client/src/api/Effects.cpp`, and the measurements are in
[`docs/research/vfx-sfx-runtime.md`](../docs/research/vfx-sfx-runtime.md).

Names deliberately **left out** although they exist: `status_braindance`,
`status_sandstorm`, `status_cement_dust`, `status_smoke_bomb`, `status_berserk`,
`status_knockdown`, `status_wounded_*` and the `status_*_resistance` family —
none has a player binding that could be read offline, and the only way to find
out is to fire an unknown name into a live client. `johnny_sickness*` is left
out for the opposite reason: Open77 actively suppresses that pipeline.

### From the server

**Replicated? No — and that is the point.** A drunk screen belongs to the person
who drank. `Open77.effects.screen` takes a `playerId` rather than a position,
and reaches that player's client directly, whether or not it is running any
resource of its own.

```lua
-- server, permission `players.screenfx`
Open77.effects.screen(playerId, "drunk", { strength = 0.5, duration = 30 })
Open77.effects.screen(playerId, "blackout", { duration = 3 })
Open77.effects.screen(playerId, false)          -- clear every one of them
Open77.effects.clearScreen(playerId)            -- the same thing, spelled out
Open77.effects.screenCatalog()                  -- the alias list
```

The effects the server plays are owned by the **host**, not by any resource on
that client, so `Open77.vfx.clear()` in a client resource cannot wipe them by
accident and no client resource can claim or inherit them. A client that changes
session drops them; nothing on the far side would ever say to.

The server validates the alias against a mirror of the client table and answers
`unsupported_screen_effect` at the call that made the mistake. The **client's**
table remains the authority: a server newer than a client still gets the
refusal from that client, which is exactly right.

### Failure tokens

| Token | Meaning |
|---|---|
| `permission_denied:vfx.screen` | client: the manifest does not declare it |
| `permission_denied:players.screenfx` | server: same |
| `unsupported_screen_effect` | the alias is not in the table |
| `invalid_screen_effect` | not a string, empty, or longer than 64 bytes |
| `invalid_strength` | not a finite number in `0..1` |
| `invalid_duration` | not a finite number in `0..600` |
| `effects_backend_unavailable` | a host without the native |
| `quota_exceeded` | 192 effects per resource, 512 per client |
| `entity_unavailable` | the local body cannot be read right now |
| `network_unavailable` | server: no route to that player |

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

### Explosions: `Open77.effects.explosion`

An explosion is not a fourth effect system. It is the one-shot above, plus the
damage authority, plus the vehicle ledger, in one call — so that a bomb does not
have to be assembled by hand from three APIs that can disagree about who was
standing where.

```lua
permissions { "world.effects", "world.explosions", "world.vehicles" }
```

```lua
local blast, reason = Open77.effects.explosion({ x = -1448.2, y = 96.1, z = 17.5 }, {
    radius   = 12.0,
    damage   = 120.0,
    force    = 3.0,
    vfx      = "explosion.frag",
    sound    = nil,
    bucket   = 0,
    vehicles = true,
    attacker = source,
})

assert(blast, reason)
print(("%d hurt, %d wrecked"):format(#blast.players, #blast.vehicles))
```

| Option | Type | Meaning |
|---|---|---|
| `radius` | number | Metres. Greater than 0 and at most 200. Default `8`. |
| `damage` | number | Damage **at the centre**, falling off linearly to zero at the rim. `0`–`10000`, default `0`. Anything above zero requires `world.explosions`. |
| `force` | number | Scales the ragdoll impulse on a **lethal** hit. `0`–`100`, default `1`. |
| `vfx` | string | Effect alias or depot path, default `explosion.frag`. |
| `sound` | string | Optional Wwise event, played spatialised at the centre. |
| `bucket` | integer | Routing bucket, default `0`. An explosion is an event in one bucket. |
| `vehicles` | boolean | Destroy the cars in the blast. Requires `world.vehicles`, default `false`. |
| `attacker` | integer | The player credited with the kills. Default `0`, an unattributed death. |

It answers `{ players = { ids }, vehicles = { ids } }` — exactly who this call hit
and what it wrecked — or `nil, reason`. There is no effect handle, because a
one-shot enters no registry.

#### Three grants, because the three halves are not equally dangerous

| You hold | You can |
|---|---|
| `world.effects` | Draw the blast. `damage` must be absent or zero. |
| `world.effects` + `world.explosions` | Hurt everyone inside the radius. |
| `world.effects` + `world.vehicles` | Pass `vehicles = true` and destroy the cars in it. |

`world.explosions` is a separate string from `players.stats.apply` on purpose.
That one lets a resource hurt a player it has **already named**, one at a time,
which is a relationship the operator can reason about. This one hurts everyone
standing in a circle, including players the resource never enumerated and has no
business knowing about — and an operator reading a manifest should see that
difference before installing anything.

The vehicle half is an explicit `vehicles = true` rather than "destroy cars if
the caller happens to hold `world.vehicles`", because a blast that silently did
half of what you asked is worse than one that refuses.

#### What it reuses, and why that matters

Nothing here is a new authority.

- The picture is `EffectAuthorityService.Play`, the same one-shot
  `Open77.effects.play` goes through. The interest radius is twice the blast
  with a floor of 60 m, so somebody outside the damage but within earshot is
  still told it happened.
- The player damage is the stats authority's scripted-damage funnel, the same
  one `Open77.players.damage` uses, with the attack kind set to `explosion`. So
  god mode, the life-phase interlocks, `Open77.combat.setKindDamageMultiplier("explosion", …)`
  and kill attribution all apply without being restated here. A player the
  authority refuses — protected, downed, mid-respawn — is skipped, never fatal to
  the blast.
- The vehicle destruction is [`Open77.vehicles.explode`](vehicles.md), unchanged.
  Occupants stay occupants: nobody is ejected, no seat is freed, and the server
  sends no damage to a body inside the car. A vehicle already blown up is quietly
  skipped rather than re-detonated, and an owner report that arrives immediately
  afterwards claiming a pristine car does not undo it, because health merges by
  minimum and the destruction bits by OR.

Two ways to blow up a car that disagreed about occupants would be a real bug, so
there is only one.

#### Two limits worth knowing before you design around them

**`force` moves nobody who survives.** The only server-to-client impulse on a
player body is the one carried by the death transition, so `force` is the ragdoll
direction of a *kill* and does nothing at all to somebody who walks away. That is
a measured limitation of the platform, not a choice made here.

**A stale body is not a target.** A player whose last accepted snapshot fails the
freshness rule is skipped rather than damaged at a position the server is not
sure of — otherwise an area weapon kills whoever used to be standing there.

#### `onExplosion`

Every explosion publishes one host-wide event. It is a reserved name: a resource
that cannot cause an explosion cannot claim one happened.

```lua
AddEventHandler("onExplosion", function(x, y, z, radius, damage, bucket, by, attacker,
                                        players, vehicles)
    -- players and vehicles are COUNTS.
end)
```

It carries counts rather than names, and the call's own return value carries the
ids. A listener that is entitled to know which bodies were in the blast can run
the same proximity read every resource already has; the event does not hand that
out to every resource on the server just because it happened to be listening.

### Fires: `Open77.effects.fire`

A fire is an explosion that does not finish. FiveM's `StartScriptFire` /
`RemoveScriptFire`, in one call that lights the flames, streams them to everyone
who should see them, and burns whoever stands in them until it goes out.

```lua
permissions { "world.effects", "world.explosions", "world.vehicles" }
```

```lua
local fireId, reason = Open77.effects.fire({ x = -1448.2, y = 96.1, z = 17.5 }, {
    radius          = 4.0,
    damagePerSecond = 5.0,
    durationMs      = 30000,
    vfx             = "fire.medium",
    bucket          = 0,
    vehicles        = false,
    attacker        = source,
})

assert(fireId, reason)
-- … later, or never: `durationMs = 0` burns until somebody puts it out.
Open77.effects.removeFire(fireId)
```

| Option | Type | Meaning |
|---|---|---|
| `radius` | number | Metres. Greater than 0 and at most **50**. Default `4`. |
| `damagePerSecond` | number | Health per second for anyone inside the radius. `0`–`1000`, default `5`. Anything above zero requires `world.explosions`. |
| `durationMs` | integer | How long it burns. `0` means "until removed"; the ceiling is one hour. Default `30000`. |
| `vfx` | string | Effect alias or depot path, default `fire.medium`. The catalogue ships `fire.tiny`, `fire.small`, `fire.medium`, `fire.large` and `fire.gas`. |
| `bucket` | integer | Routing bucket, default `0`. A fire burns in one bucket. |
| `vehicles` | boolean | Burn the cars in it too. Requires `world.vehicles`, default `false`. |
| `attacker` | integer | The player credited with the kills. Default `0`, an unattributed death. |

It answers the fire id as a **decimal string**, or `nil, reason`.

#### The id is the looping effect's id, and that is the whole design

A fire is not a fourth registry. It is exactly one entry from the
[looping-effect registry](#looping-open77effectscreate) — same identity,
ownership, revisioning and streaming, which is why a player who walks away and
comes back still finds it burning — plus a timer on the owning resource that
damages whoever is standing in it.

So `fireId` **is** the effect id:

```lua
local fireId = Open77.effects.fire(position, { radius = 4 })
local entry  = Open77.effects.get(fireId)   -- the flames, as a looping effect
```

`onEffectCreated` announces it, `Open77.effects.all()` lists it beside every other
looping effect, and the bundled `open77_effects` client resource projects it
without knowing that E7 exists. Two ids for one object would have been two things
that could disagree about whether it is still there.

The consequence is worth stating plainly: `Open77.effects.remove(fireId)` is a
legal thing for the owning resource to do, and it **puts the fire out**. The next
tick finds the registry entry gone and stops the burning with the reason
`effect_removed`, rather than leaving an invisible fire hurting people. Expiry
works the other way round — the resource's own deadline is the authority and it
removes the entry — which is why the effect carries no TTL of its own. One clock,
one reason, never a race between two of them.

| Function | Signature | Result |
|---|---|---|
| `Open77.effects.fire` | `(position, options?)` | Fire id as a decimal string, or `nil, reason`. |
| `Open77.effects.removeFire` | `(fireId)` | `true`, or `nil, reason` (`not_found`, `owned_by_another_resource`). |
| `Open77.effects.fires` | `(bucket?)` | This resource's burning fires, ascending by id. |

```lua
for _, burning in ipairs(Open77.effects.fires()) do
    print(burning.id, burning.radius, burning.damagePerSecond,
          burning.hurt,             -- how many distinct players it has burned
          burning.remainingMs)      -- nil for a fire that burns until removed
end
```

`fires()` answers **this resource's** fires and nobody else's: they are its to put
out, and the host-wide `onFire` below is how the rest of the server learns about
somebody else's.

#### Damage is flat inside the radius, unlike an explosion

An explosion is a wavefront and [falls off linearly](#explosions-open77effectsexplosion);
a fire is a volume you are inside or outside of. A player at the rim burns exactly
as fast as one at the centre. A falloff would have made the edge of a fire nearly
free, so somebody could stand in the flames taking two per cent damage while the
picture said otherwise.

Three limits follow from how the tick works, and each of them is a decision rather
than an accident:

- **One damage interval is one second**, so `damagePerSecond` is the literal unit.
- **The clock starts on the first tick the fire is alive for**, not at the call.
  A resource's top-level chunk runs before its VM has ever ticked, so a fire lit
  at load dates itself from the first tick rather than from a clock reading of
  zero — otherwise, on a server that had been up for an hour, it would expire
  the moment it was noticed. Nothing is billed on the tick that arms it.
- **A billed interval is capped at five seconds.** A server that hitched — a long
  database call, a debugger, a stalled tick — must not settle a minute of burning
  in one instant and kill everybody standing near a campfire.
- **A stale body is not a target**, the same rule the blast follows: a player whose
  last accepted snapshot fails the freshness test is skipped rather than burned at
  a position the server is not sure of.

Damage goes through the same scripted-damage funnel as everything else, with the
attack kind `environment` — 2.31's damage vocabulary has no fire kind, and
inventing one would have meant a wire change for a label. A burned body therefore
reads as killed by the world. God mode, the life-phase interlocks, the
`environment` damage multiplier and kill attribution all apply without being
restated, and a player the authority refuses is skipped rather than putting the
fire out for everybody else.

#### Cars

`vehicles = true` burns the cars in the radius at the same rate, converted through
one stated rule: `damagePerSecond` is in player health points, whose full bar is
100, and a car's health is a 0–1 pool. **A fire that takes ten seconds to kill a
healthy player takes ten seconds to wreck a healthy car.** A car that reaches zero
is exploded through [`Open77.vehicles.explode`](vehicles.md) — C12's call, the one
E6 uses too. There is exactly one way to blow up a car in Open77 and this is not a
second one.

The gradual damage is the same write `Open77.vehicles.setHealth` performs, and
canonical health merges by minimum against an owner report, so a projection that
took its snapshot before the burn cannot undo it.

#### Three grants, and deliberately no `world.fires`

| You hold | You can |
|---|---|
| `world.effects` | Light flames that are only a picture. `damagePerSecond` must be zero. |
| `world.effects` + `world.explosions` | Burn everyone inside the radius. |
| `world.effects` + `world.vehicles` | Pass `vehicles = true` and burn the cars in it. |

The same three strings as an explosion, and no new one. The capability describes
the **reach** — area damage to players the resource never enumerated — and a fire
reaches exactly as far as a blast repeated once a second. A second string for the
same reach would let an operator believe they had withheld something they had
already granted.

One further ceiling: **64 burning fires per resource**. That is much lower than the
looping-effect registry's 512, because every fire costs a proximity sweep over
every player every second — the effect registry's ceiling bounds memory, this one
bounds the tick. The reason is `fire_limit`.

#### `onFire`

Every fire publishes one host-wide event when it starts and one when it stops.
Reserved, like `onExplosion`: a resource that cannot light a fire cannot claim one
is burning.

```lua
AddEventHandler("onFire", function(fireId, state, reason, x, y, z,
                                   radius, damagePerSecond, bucket, by, hurt)
    -- state  is "started" or "stopped"
    -- reason is "started", "removed", "expired" or "effect_removed"
    -- hurt   is a COUNT of distinct players burned, never a roster
end)
```

| `reason` | When |
|---|---|
| `started` | the fire was lit |
| `removed` | `Open77.effects.removeFire` |
| `expired` | `durationMs` elapsed |
| `effect_removed` | the looping effect was removed out from under it, or released with the resource |

The FiveM spelling **`fireEvent`** carries the same eleven values and is published
alongside, the way `playerDropped` accompanies `onPlayerDisconnected`. Both names
are reserved.

A fire that goes out because its resource stopped publishes nothing: a resource on
its way out cannot tell other resources anything, which is the same rule
`onExplosion` follows. The flames still go, and `onEffectRemoved(id,
"resource_stopped", resource)` is what announces that.

#### `onParticleEffect`

Every **world-positioned** server effect publishes one host-wide event: the
one-shots of `Open77.effects.play`, the registry entries of
`Open77.effects.create`, and the flames a fire is made of.

```lua
AddEventHandler("onParticleEffect", function(effect, x, y, z, loop, bucket, by)
    -- loop is false for a one-shot, true for a registry entry or a fire
end)
```

`playOn`, `attach` and `sound` raise nothing, and that is deliberate: an
entity-bound effect has no world position the server knows, because the target owns
the transform. Publishing an invented origin would be worse than publishing
nothing — a listener reading it would believe the server knew where the effect was.
A resource that wants those reads the entity.

The FiveM spelling is **`ptFxEvent`**, with the same seven values, and both names
are reserved. Publication is best-effort: a resource whose effect drew correctly is
never told it failed because the host-wide queue was full.

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
| `Open77.effects.explosion` | `(position, options)` | `{ players, vehicles }`, or `nil, reason`. Also needs `world.explosions` to do damage and `world.vehicles` to wreck cars. |
| `Open77.effects.fire` | `(position, options?)` | Fire id as a decimal string, or `nil, reason`. The id **is** the looping effect's id. Same two extra grants as `explosion`. |
| `Open77.effects.removeFire` | `(fireId)` | `true`, or `nil, reason`. |
| `Open77.effects.fires` | `(bucket?)` | This resource's burning fires, ascending by id. |
| `Open77.effects.create` | `(definition)` | Effect ID as a decimal string, or `nil, reason`. |
| `Open77.effects.attach` | `(typedTarget, effect, options)` | Owned durable attached-effect ID, or `nil, reason`. |
| `Open77.effects.update` | `(id, patch)` | `boolean, reason?` |
| `Open77.effects.remove` | `(id)` | `boolean, reason?` |
| `Open77.effects.all` | `(bucket?)` | Array of looping-effect snapshots, optionally filtered to one bucket. |
| `Open77.effects.catalog` | `()` | Curated effect aliases. |
| `Open77.effects.playOn` | `(entityOrPlayerId, name, opts)` | `boolean, reason?` |
| `Open77.effects.sound` | `(entityOrPlayerId, event, opts)` | `boolean, reason?` |

IDs are decimal strings for the same reason handles are: their full 64-bit identity has to survive Lua number conversion. No low-level PascalCase aliases are published for `Open77.effects`; the namespaced table is the whole surface.

### Server events

```lua
AddEventHandler("onEffectCreated", function(id, resource, effect) end)
AddEventHandler("onEffectRemoved", function(id, reason, resource) end)
```

Both require `world.effects` — the same string reading one costs, because a lifecycle event
that announced a effect to a resource that cannot list one would route around that capability.
`reason` is `removed`, `expired`, `resource_stopped`, or the free text (at most 64
characters) the caller passed to the remove call.

The same two transitions also reach the generic `onEntityCreated(kind, id, resource)` and
`onEntityRemoved(kind, id, reason)` with `kind` = `"effect"`, for a resource that additionally
declares `world.entities.observe`. The mirror is raised by the same statement, so the two feeds
cannot disagree; see [entity lifecycle events](server-api.md#entity-lifecycle-events) for the
authority rule and for why there is no `Updated` counterpart.

Three more events are host-wide rather than per-registry, and none of them can be
published by a resource: [`onExplosion`](#onexplosion), [`onFire`](#onfire) and
[`onParticleEffect`](#onparticleeffect), each with a FiveM-named twin
(`explosionEvent`, `fireEvent`, `ptFxEvent`). They carry counts and coordinates
rather than rosters, so listening to them tells a resource that something
happened and where, never who was standing in it.

### Failure reasons

The vocabulary is shared with [world props](props.md#failure-reasons), with this permission in place of that one.

| Reason | Meaning |
|---|---|
| `permission_denied:world.effects` | The manifest does not declare `world.effects`. |
| `permission_denied:world.explosions` | `explosion` was called with a positive `damage`, or `fire` with a positive `damagePerSecond`, and the manifest does not declare `world.explosions`. |
| `permission_denied:world.vehicles` | `explosion` or `fire` was called with `vehicles = true` and the manifest does not declare `world.vehicles`. |
| `invalid_radius` / `invalid_damage` / `invalid_force` | An explosion argument outside its range: radius in (0, 200], damage in [0, 10000], force in [0, 100]. For a fire, radius in (0, 50] and `damagePerSecond` in [0, 1000]. |
| `invalid_duration` | A fire's `durationMs` is negative or past the one-hour ceiling. `0` is legal and means "until removed". |
| `fire_limit` | This resource already has 64 fires burning. Lower than the effect registry's 512 because each fire costs a per-second proximity sweep. |
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
