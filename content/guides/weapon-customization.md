# Weapon customization

Tune the local held weapon from Lua, then test it in the English weapon workshop. The native API exposes reload speed, fire rate, recoil, spread and advanced weapon statistics, plus optional impact blasts that move nearby vehicles and request server-authorized character launches.

**Requires a compatible development client with native weapon tuning and inventory-instance restoration.** Check that `Open77.weapons.setTuning` exists before enabling this feature, and use a development build containing the restoration fix. Function availability alone does not distinguish older experimental builds. Installing the example resource does not add missing native functions to an older client.

Ground-contact blasts and network character launches require matching client and server builds with `Open77.motion.launch`, plus the corresponding `open77_cyberware` system resource. Headless victims also need the updated bot executable. The earlier vehicle-only workshop does not provide these extensions.

**Experimental controls:** projectile count and smart-projectile speed expose native statistics, but their effects on actual projectile multiplicity and flight speed remain unverified. Aim speed supplies native animation timings; it does not promise an exact visible transition duration. Check the weapon-specific behavior below before using a profile in a gamemode.

Cleanup can be deferred while a weapon is holstered. The corrected client tracks the exact inventory item across replacement engine entities and finishes removing its modifiers when that item is drawn again. Read `pendingModifiers` before reporting cleanup complete.

For weapon grants, slots, ammunition, components and grenades, see the [weapon API](weapons-api.md). The three tuning calls run on the **client**; there is no server overload taking a player ID.

## Open the workshop

Download [rp_weapons_effect from the public examples repository](https://github.com/Open2077/open77-rp-examples/tree/main/rp_weapons_effect). Copy that folder into your server's resources directory, add `rp_weapons_effect` to `resources.load`, and grant administrators `command.weaponeffects` through the [server ACL](server-acl.md).

Start the resource, then enter `/weaponeffects` in chat. Choose a weapon from the 137-record catalogue, equip it in slot 1, select a preset or adjust the sliders, and click **Apply settings**. Close the interface to shoot. **Restore stock** removes this resource's modifiers; it preserves other bonuses, the weapon and ammunition already granted.

The resource is disabled by default. The server checks each action; equipment and tuning requests target the authenticated shooter. Character blasts follow the separate target-selection policy described below. The workshop does not save tuning between sessions.

## Apply a profile from Lua

Declare the client permissions in `open77.lua`:

```lua
permissions { "player.weapons.read", "player.weapons.edit" }
client_script "client.lua"
```

In client code, enable tuning after your server has authorized the customization:

```lua
if type(Open77.weapons.setTuning) ~= "function" then
    print("Weapon tuning requires a compatible development client")
    return
end

local ok, reason = Open77.weapons.setTuning(
    "Items.Preset_Lexington_Default", {
        reloadSpeed = 2,
        fireRate = 1.5,
        recoil = 0.5,
        spread = 0.75,
    })
if not ok then
    print("Cannot apply weapon tuning:", reason)
    return
end

-- Acceptance and activation are separate: draw the matching weapon first.
local state, readError = Open77.weapons.tuning()
if state then
    print(state.status, state.active)
else
    print(readError)
end
```

`setTuning` does not give or equip the weapon. It selects an exact `Items.*` record and binds to the matching weapon when it is in the local player's hand. Each call replaces the whole profile; omitted options return to their defaults. It modifies the weapon instance through native stat modifiers rather than rewriting its shared TweakDB record.

## Settings

Multipliers are neutral at `1`. Numeric strings, nonfinite values, unknown fields and values outside these ranges are refused.

| Option | Default | Range | Requested behavior |
|---|---:|---:|---|
| `reloadSpeed` | 1 | 0.25–10 | Divides reload and reload-end durations. |
| `fireRate` | 1 | 0.25–10 | Divides normal and burst shot-cycle durations. |
| `recoil` | 1 | 0–3 | Multiplies minimum/maximum kick, including aiming. |
| `spread` | 1 | 0–3 | Multiplies minimum/maximum horizontal and vertical spread. |
| `damage` | 1 | 0.1–20 | Multiplies the weapon's four native damage channels. |
| `magazineCapacity` | 1 | 1–10 | Multiplies native capacity, rounded and capped at 512 rounds. |
| `projectilesPerShot` | 1 | 1–8 | Multiplies native projectile count, rounded and capped at 64. |
| `aimSpeed` | 1 | 0.25–10 | Divides aim-in and aim-out times. |
| `chargeSpeed` | 1 | 0.25–10 | Divides charging times on weapons that support charging. |
| `smartProjectileSpeed` | 1 | 0.25–5 | Multiplies smart-projectile speed; does not convert power or tech shots to smart projectiles. |
| `blastRadius` | 0 | 0–60 | Impact radius in meters; zero disables added vehicle impulses and character launch requests. |
| `blastPush` | 0 | 0–40 | Horizontal radial impulse strength, scaled by vehicle mass. |
| `blastLift` | 0 | 0–40 | Vertical impulse strength, scaled by vehicle mass. |
| `blastFalloff` | 1 | 0–4 | Falloff exponent; zero gives uniform weight inside the radius. |
| `blastCooldown` | 0.25 | 0.1–5 | Seconds between impulses; coalesces multiple hits from one explosion. |

Count limits cap increases requested by this profile; a pre-existing count above 512 rounds or 64 projectiles is preserved. Advanced statistics are weapon-dependent. A returned native stat value does not guarantee that every weapon's animation, magazine or projectile logic consumes that value. Charging and smart-projectile settings cannot add those capabilities to a weapon that lacks them. Projectile type, trail, model and explosion visuals are not configurable through this API.

### Weapon-specific behavior

- **Magazine capacity:** perform a real reload after changing capacity or restoring stock, then read `Open77.weapons.snapshot()`. The currently loaded magazine can keep its previous capacity until a reload refreshes it. Increasing capacity does not add ammunition; use the reported capacity when requesting `setAmmo()`.
- **Damage:** increasing the native multiplier can increase vehicle health loss, but hit location and vanilla damage rules still affect the result. A value of `3` is not a guarantee of exactly three times the final damage.
- **Charge speed:** changes how quickly a charging weapon reaches its firing threshold. The weapon's authored threshold remains in place, so a faster charge does not unlock a higher charge level or guarantee an exact timing ratio on every weapon.
- **Aim speed:** changes the aim-in and aim-out durations supplied to native animation. These are requested animation timings, not a frame-accurate measurement of the visible transition.
- **Projectile count and smart-projectile speed:** remain experimental. A stat change or a visible shot alone does not establish additional projectiles or a different flight speed.

The damage multiplier does not change authoritative server rules. Raw player-hit damage reports above 300 are rejected by the server; tuning is not permission to bypass that limit.

## Launch vehicles with an impact

The **Big blast** preset adds a physical impulse around a hit from the bound weapon. It consumes native entity-hit callbacks, actual impact positions from `GameEffectExecutor_StimOnHit`, and supported tracked-projectile collision or explosion callbacks. It does not substitute a crosshair raycast, create an explosion visual or multiply every grenade explosion. A projectile disappearing without a contact does not trigger a blast.

```lua
if type(Open77.weapons.setTuning) == "function" then
    local ok, reason = Open77.weapons.setTuning(
        "Items.Preset_Burya_Comrade", {
            reloadSpeed = 3,
            blastRadius = 25,
            blastPush = 15,
            blastLift = 18,
            blastFalloff = 1,
            blastCooldown = 0.25,
        })
    if not ok then print(reason) end
end
```

Equip **Comrade's Hammer**, apply the profile, close the menu and shoot a nearby car. Only unfrozen vehicles whose current physics owner is **this client** receive the added impulse. Ownership is a server policy, separate from who requested a spawn. A Freeroam spawn does not itself guarantee that its requester owns physics.

For a bot fleet, use passenger mode with host physics (`--fleet-mode passenger` and the runner's `-HostPhysics` switch). The real client then simulates the vehicles while bots occupy passenger seats. Bots publishing synthetic driving trajectories in bumper mode do not simulate these impulses. For a custom server, use the [vehicle authority API](vehicles.md) to establish the intended physics owner; the weapon API does not transfer authority or forward a force to another owner.

After your server authorizes a test vehicle and it has streamed to the intended player, it can request that player's physics lease:

```lua
-- Server script; requires world.vehicles.
-- vehicleId and playerId are selected and authorized by your server code.
local owner, reason = Open77.vehicles.requestAuthority(vehicleId, playerId)
if not owner then
    print("Physics lease refused:", reason)
else
    print("Physics owner:", owner.physicsOwner)
end
```

This request respects seat and AI ownership. It can refuse with `driven`, `ai_driven`, `not_streamed`, `too_far` or `wrong_bucket`; assigning a bot to the driver's seat is not a way to give the shooting client physics. Read `Open77.vehicles.owner(vehicleId)` again when testing because authority is a lease.

Ground coverage depends on the weapon emitting a supported native contact. **Bare-terrain Comrade coverage remains unverified.** Do not assume every hitscan ground shot produces a blast. Grenade explosions without a bound weapon object are not covered. The cars' ordinary owner motion replication carries resulting movement to observers.

## Launch nearby characters

The workshop handles characters through a separate server-authorized motion lease. The shooter is excluded from these character targets. The server selects other ready, living, unmounted players in the same routing bucket and within the configured three-dimensional radius. A character already reacting or protected during recovery can refuse another launch.

The same blast settings apply distance falloff, with character strengths capped at **20 m/s horizontally** and **14 m/s upward**. Vehicle strengths retain their separate bounds from the settings table. A character launch does not apply damage or grant authority over vehicle physics.

| Victim | Who produces movement | What observers receive |
|---|---|---|
| Real player | The victim's client applies one native 3D player impulse. | The victim's ordinary position snapshots, with a reaction pose. |
| Updated headless bot | The bot publishes a bounded ballistic test trajectory. | The bot's ordinary position snapshots, with a reaction pose. |

Headless trajectories use gravity and a horizontal ground plane at the bot's starting height. They do not simulate REDengine terrain or world collisions. Test these bots on a flat, open area; their flight is not evidence that a real player's collision response behaves identically. Remote clients present the reaction pose and follow the owner's snapshots; they do not independently propel the victim's proxy.

The real-owner adapter and headless bot paths have been exercised separately. Weapon-hit behavior between two real clients remains unverified.

### Server launch API

Use the server call after your resource has authorized the action and selected its target. Declare `players.motion.control`; reading the lease additionally requires `players.motion.read`.

```lua
-- Server: playerId is selected and authorized by your gameplay policy.
if type(Open77.motion.launch) ~= "function" then
    print("This server needs character launch support")
    return
end

local result, reason = Open77.motion.launch(playerId, {
    x = 1, y = 0, push = 12, lift = 10,
})
if not result then
    print("Launch refused:", reason)
    return
end

local motion = Open77.motion.current(playerId)
if motion then print(motion.id, motion.phase, motion.kind) end

-- To end this resource's lease later:
-- Open77.motion.cancel(playerId, result.id)
```

`x` and `y` define a nonzero direction and are normalized. `push` accepts 0–20, `lift` accepts 0–14, and at least one must be positive. Success returns `{ok=true, id=...}` for admission, not completed movement. `onPlayerMotionChanged(player, id, phase, reason)` reports the existing `pending`, `active` and `ended` lifecycle. The owner must acknowledge the pending lease; cancellation does not promise to erase existing velocity instantly.

`Open77.motion.current(playerId)` includes `kind`, `push` and `lift` for the launch, along with the existing identity, incarnation, bucket and phase fields. An optional `lifeRevision` identifies the generic life-state fallback used when no implant projection is ready. Motion leases do not require an implant database; body readiness, alive state, incarnation and bucket checks still apply. Rejections include `body_unavailable`, `motion_busy`, `cc_protected`, `motion_limit`, `invalid_direction` and `invalid_launch`.

### Client projection primitive

The low-level client call is `Open77.motion.launch(entity, x, y, push, lift)`, with `player.motion.project`. Its `entity` is a **local registry handle**, not a network player ID; `1` means the local player. It returns a resource-owned request ID or `nil, reason`, read with `Open77.motion.state(request)` and stopped with `Open77.motion.stop(request)`.

This primitive does not authorize multiplayer motion. Use the matching `open77_cyberware` projector for the server lease and incarnation checks. A local player's request starts pending and requires observed native motion before activation is acknowledged. A remote entity receives the reaction pose only; its displacement comes from its owner.

### Blast event and resource policy

The native client emits `open77:weaponBlast(owner, record, sequence, x, y, z)` after its cooldown accepts a blast. All six arguments are strings. A resource should filter `owner` against `GetCurrentResourceName()`, verify its configured record and convert the sequence and coordinates before forwarding a request.

The workshop associates that request with a server-approved profile version. Its server checks administrator ACL, record, sequence, cooldown, a living shooter and a maximum reported impact distance of 250 meters, then derives the targets and strengths itself. The client cannot submit a victim list. This is an administrator test tool; its reported point is not a trusted competitive hit or damage receipt.

If the optional `open77_crowd_ambient` lab helper is running, the workshop awaits its batch animation-stop export before admitting character motion. It then rechecks the profile, shooter state, bucket and target range. The helper remains a separate platform test fixture rather than a bundled requirement of the public example.

### Read the right counter

`tuning().projectileContacts` counts accepted tracked-projectile contacts, while `trackedProjectiles` reports projectiles still being tracked. Native entity hits and `GameEffectExecutor_StimOnHit` do not increment `projectileContacts`, so an accepted blast can leave that counter at zero. Neither counter establishes that a victim moved. `impulsesQueued` concerns vehicle events, and the workshop's separate character result counts server admissions and refusals. Observe the victim's snapshots and visible trajectory to verify the outcome.

Character diagnostics include a refusal histogram and the eight nearest targets, with their life state, previous motion and grant or refusal reason. The UI summarizes the nearest target. For nearby granted leases, the server also logs owner acknowledgement or termination. These reads require `players.motion.read`, included in the example manifest.

A direct hit can kill its target before the blast request arrives; this living-character API does not launch corpses. A target already reacting or recovering can also refuse a new lease while surrounding characters launch. Check the nearest target's state and reason before interpreting that difference as a rendering fault.

## Read state and restore

```lua
local state, reason = Open77.weapons.tuning()
if state then
    print("Status:", state.status)
    print("Queued vehicle impulses:", state.impulsesQueued or 0)
    print("Other owners skipped:", state.foreignSkipped or 0)
    print("Modifiers waiting for cleanup:", state.pendingModifiers or 0)
else
    print(reason)
end

-- Keep the tuned weapon drawn; clear it before switching weapons.
local cleared, clearError = Open77.weapons.clearTuning()
if not cleared then print(clearError) end
```

One resource owns the active tuning profile. A second resource receives `weapon_tuning_owned_by_another_resource`; it cannot clear the first resource's settings. Switching weapons, clearing tuning and stopping the resource remove only the modifier handles owned by that resource.

| State | Meaning |
|---|---|
| `idle` | No active profile or pending cleanup for this resource. |
| `waiting_for_weapon` | Profile accepted; draw the matching weapon. |
| `active` | Profile bound to the held weapon. |
| `restoring` | Profile disabled; old modifier handles still await cleanup. |
| `waiting_for_restore` | A new profile waits for the previous modifiers on this entity to be removed. |

A holstered weapon can temporarily lose its native statistics object. The client keeps the exact modifier handles and associates them with the inventory item even if its engine entity is destroyed. Drawing that same item again allows removal on its current entity; another copy of the same weapon record is a different item. Clearing while the weapon is drawn normally lets cleanup finish immediately.

A successful `clearTuning()` accepts the disable request. `pendingModifiers` reports unfinished cleanup, including after the resource stops; wait for zero before reporting it complete. A new profile on the same item waits for its previous modifiers to be removed. The queue holds at most 32 pending bindings and refuses further changes with `restore_queue_full` rather than dropping cleanup handles.

The state also exposes native readback values and cumulative counters. `impulsesQueued` means events were queued, not that a car visibly moved. `foreignSkipped` indicates nearby vehicles owned elsewhere. `weaponEntity` is an opaque string: do not convert it to a Lua number.

## Troubleshooting and testing

- **No tuning controls:** check for a compatible native client, resource startup and `command.weaponeffects` access.
- **Waiting for a weapon:** equip and draw the exact selected record, then read state again.
- **No vehicle movement:** enable a nonzero blast radius and force, hit the vehicle, verify client physics ownership, and check that the vehicle is unfrozen and streamed.
- **Restoration still pending:** draw the same inventory item that was previously tuned, then wait for `pendingModifiers` to reach zero. Another copy of the same record does not complete that item's cleanup.
- **A stat changes but the behavior does not:** compare the same weapon and inputs with a neutral profile. Some vanilla weapon logic uses its own limits or cached values.

The workshop's `/weaponeffects measure` command logs actual magazine readings for eight seconds. Use it to compare reloads or bursts, and use before/during/after captures to evaluate vehicle movement. Space diagnostic commands by at least half a second to respect the server command limiter.

For a single-setting comparison, `/weaponeffects set reloadSpeed 3 Items.Preset_Lexington_Default` applies that field and resets every other setting to its default. The syntax is `/weaponeffects set <field> <value> [record]`; omitting the record selects the catalogue's first weapon.

See the native reference cards for [setTuning](/docs/api/client/open77-weapons#settuning), [clearTuning](/docs/api/client/open77-weapons#cleartuning), [tuning](/docs/api/client/open77-weapons#tuning), [server launch](/docs/api/server/open77-motion#launch) and [client launch](/docs/api/client/open77-motion#launch), or inspect the [complete example resource](https://github.com/Open2077/open77-rp-examples/tree/main/rp_weapons_effect).
