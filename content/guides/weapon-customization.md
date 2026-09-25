# Weapon customization

Tune the local held weapon from Lua, then test it in the English weapon workshop. The native API exposes reload speed, fire rate, recoil, spread and advanced weapon statistics, plus an optional vehicle-impact impulse.

**Requires a compatible development client with native weapon tuning.** Check that `Open77.weapons.setTuning` exists before enabling this feature. Installing the example resource does not add missing native functions to an older client.

**Experimental:** the six advanced stat controls and restoration after holstering still require gameplay validation. Treat them as development features, and verify the actual weapon behavior and cleanup state before using them in a gamemode.

For weapon grants, slots, ammunition, components and grenades, see the [weapon API](weapons-api.md). The three tuning calls run on the **client**; there is no server overload taking a player ID.

## Open the workshop

Download [rp_weapons_effect from the public examples repository](https://github.com/Open2077/open77-rp-examples/tree/main/rp_weapons_effect). Copy that folder into your server's resources directory, add `rp_weapons_effect` to `resources.load`, and grant administrators `command.weaponeffects` through the [server ACL](server-acl.md).

Start the resource, then enter `/weaponeffects` in chat. Choose a weapon from the 137-record catalogue, equip it in slot 1, select a preset or adjust the sliders, and click **Apply settings**. Close the interface to shoot. **Restore stock** removes this resource's modifiers; it preserves other bonuses, the weapon and ammunition already granted.

The resource is disabled by default. Each action is checked by the server and targets only the authenticated player who sent it. It does not save tuning between sessions.

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
| `blastRadius` | 0 | 0–60 | Vehicle-impact radius in meters; zero disables the added impulse. |
| `blastPush` | 0 | 0–40 | Horizontal radial impulse strength, scaled by vehicle mass. |
| `blastLift` | 0 | 0–40 | Vertical impulse strength, scaled by vehicle mass. |
| `blastFalloff` | 1 | 0–4 | Falloff exponent; zero gives uniform weight inside the radius. |
| `blastCooldown` | 0.25 | 0.1–5 | Seconds between impulses; coalesces multiple hits from one explosion. |

Count limits cap increases requested by this profile; a pre-existing count above 512 rounds or 64 projectiles is preserved. Advanced statistics are weapon-dependent. A returned native stat value does not guarantee that every weapon's animation, magazine or projectile logic consumes that value. Inspect the actual magazine with `Open77.weapons.snapshot()` before calling `setAmmo`; increasing capacity does not add ammunition. Charging and smart-projectile settings cannot add those capabilities to a weapon that lacks them. Projectile type, trail, model and explosion visuals are not configurable through this API.

The damage multiplier does not change authoritative server rules. Raw player-hit damage reports above 300 are rejected by the server; tuning is not permission to bypass that limit.

## Launch vehicles with a hit

The **Big blast** preset is an optional physical impulse around a real vehicle hit. It does not create an explosion visual or multiply grenade explosions. A direct hit from the bound weapon must reach a streamed vehicle.

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

Shots at the ground and grenade explosions without a weapon object do not trigger this extension. The cars' ordinary owner motion replication carries resulting movement to observers.

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

A holstered weapon can temporarily lose its native statistics object. Cleanup is retried when it becomes available; drawing that weapon again allows restoration to finish. A successful `clearTuning()` accepts the disable request, so inspect `pendingModifiers` before reporting cleanup as complete. The bounded cleanup queue can refuse a change with `restore_queue_full`.

The state also exposes native readback values and cumulative counters. `impulsesQueued` means events were queued, not that a car visibly moved. `foreignSkipped` indicates nearby vehicles owned elsewhere. `weaponEntity` is an opaque string: do not convert it to a Lua number.

## Troubleshooting and testing

- **No tuning controls:** check for a compatible native client, resource startup and `command.weaponeffects` access.
- **Waiting for a weapon:** equip and draw the exact selected record, then read state again.
- **No vehicle movement:** enable a nonzero blast radius and force, hit the vehicle, verify client physics ownership, and check that the vehicle is unfrozen and streamed.
- **Restoration still pending:** draw the previously tuned weapon and allow cleanup to run before applying another profile to it.
- **A stat changes but the behavior does not:** compare the same weapon and inputs with a neutral profile. Some vanilla weapon logic uses its own limits or cached values.

The workshop's `/weaponeffects measure` command logs actual magazine readings for eight seconds. Use it to compare reloads or bursts, and use before/during/after captures to evaluate vehicle movement. Space diagnostic commands by at least half a second to respect the server command limiter.

For a single-setting comparison, `/weaponeffects set reloadSpeed 3 Items.Preset_Lexington_Default` applies that field and resets every other setting to its default. The syntax is `/weaponeffects set <field> <value> [record]`; omitting the record selects the catalogue's first weapon.

See the native reference cards for [setTuning](/docs/api/client/open77-weapons#settuning), [clearTuning](/docs/api/client/open77-weapons#cleartuning) and [tuning](/docs/api/client/open77-weapons#tuning), or inspect the [complete example resource](https://github.com/Open2077/open77-rp-examples/tree/main/rp_weapons_effect).
