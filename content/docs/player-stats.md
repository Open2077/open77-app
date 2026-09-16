# Player health and stamina

Open77 owns player health and stamina on the dedicated server. A gamemode does
not need to create a separate health ledger, regeneration timer, maximum-stat
store, or synchronization event. The built-in service keeps one versioned
state per connected player and projects it to every client.

The two runtimes deliberately expose the same read API. Mutations exist only
on the server.

## Permissions

```lua
permission "players.stats.read"   -- client and server reads
permission "players.stats.apply"  -- server mutations only
```

The older `players.damage.read` / `players.damage.apply` permissions remain
accepted for compatibility, and `players.life.read` may also read stats. New
resources should use `players.stats.*` and request `combat.config` separately
when they also change PvP policy.

## Shared read API

These functions have the same names and return shape in client and server Lua:

```lua
local stats = Open77.stats.get(playerId)
local health = Open77.stats.getHealth(playerId)   -- alias: health
local stamina = Open77.stats.getStamina(playerId) -- alias: stamina
```

On the client, `playerId` may be omitted to read the local player. The server
always requires it because a server resource has no implicit local player.
Unknown or not-yet-replicated players return `nil`.

`get` returns:

```lua
{
  playerId = 7,
  revision = 42,
  staminaAuthorityRevision = 9,
  armor = 0,
  godMode = false,
  lastAttacker = 12,
  lastDamage = 25,
  lastAttackKind = "ranged",
  lastBodyPart = "torso",
  health = {
    pool = "health",
    value = 75, current = 75,
    maximum = 150, max = 150,
    fraction = 0.5, percentage = 50,
    regenEnabled = true,
    regenPerSecond = 5,
    regenerating = true
  },
  stamina = {
    pool = "stamina",
    value = 60, current = 60,
    maximum = 120, max = 120,
    fraction = 0.5, percentage = 50,
    regenEnabled = true,
    regenPerSecond = 20,
    regenerating = false
  }
}
```

All values and regeneration rates are points, not percentages. `revision`
changes whenever any canonical stat or its configuration changes.

## Server mutation API

Every mutation returns `true`, or `false, reason`.

| Function | Purpose |
|---|---|
| `Open77.stats.set(playerId, pool, value)` | Set `"health"` or `"stamina"` in points. |
| `Open77.stats.setMax(playerId, pool, maximum)` | Set the canonical maximum and clamp the current value. |
| `Open77.stats.restore(playerId, pool)` | Fill the selected pool to its maximum. |
| `Open77.stats.setRegenEnabled(playerId, pool, enabled)` | Enable or disable server regeneration. |
| `Open77.stats.setRegenRate(playerId, pool, pointsPerSecond)` | Set its authoritative rate; zero disables it. |
| `setHealth`, `setHealthMax`, `restoreHealth` | Explicit health aliases. |
| `setHealthRegenEnabled`, `setHealthRegenRate` | Explicit health-regeneration aliases. |
| `setStamina`, `setStaminaMax`, `restoreStamina` | Explicit stamina aliases. |
| `setStaminaRegenEnabled`, `setStaminaRegenRate` | Explicit stamina-regeneration aliases. |

Example:

```lua
local ok, reason = Open77.stats.setHealthMax(playerId, 200)
if not ok then return print(reason) end

assert(Open77.stats.setHealth(playerId, 200))
assert(Open77.stats.setHealthRegenRate(playerId, 8))
assert(Open77.stats.setHealthRegenEnabled(playerId, true))

assert(Open77.stats.setStaminaMax(playerId, 160))
assert(Open77.stats.setStamina(playerId, 80))
assert(Open77.stats.setStaminaRegenRate(playerId, 30))
```

Setting health to zero uses the player-life authority and therefore performs a
real attributed soft death rather than merely writing a native pool. Direct
damage, healing, armor and god mode remain available through the compatible
`Open77.players.damage`, `heal`, `setArmor`, and `setGodMode` methods.

## Fall damage

```lua
permission "players.life.falldamage"  -- server: switch a player's fall damage off and on
permission "players.life.read"        -- read it back
```

| Function | Purpose |
|---|---|
| `Open77.players.setFallDamage(playerId, enabled)` | `false` makes landings harmless for this player; `true` restores the vanilla behaviour. `true`, or `false, reason`. |
| `Open77.players.isFallDamageEnabled(playerId)` | Whether landings still hurt him. `Open77.players.get(playerId).fallDamage` carries the same bit. |

**Fall damage only.** This is FiveM's fall-damage toggle and nothing wider: a
player whose fall damage is off is still shot, stabbed, burned, blown up and run
over exactly as before, and still dies from all of it. It is not `setGodMode`
(the combat ledger's damage immunity) and it is not the grav-chute's shield
(`Open77.chute`, a blanket *Invulnerable* god mode that exists because the
chute needs *everything* off for the seconds it is armed). A FiveM script that
reaches for `SetEntityInvincible` wants `setGodMode`; one that reaches for the
fall-damage toggle wants this.

**Why it is a life flag and not a stat.** On 2.31 a hard landing is not a number
the engine subtracts from a pool. The player's own locomotion state machine
grades the landing from its vertical speed and, for the three grades that hurt,
fires a self-targeted area attack -- `Attacks.HardLanding`, then
`VeryHardLanding`, then `DeathLanding` -- through the ordinary damage pipeline,
on the landing client only. So the only place fall damage can be refused is
that client, inside the damage pipeline, and the only honest way to refuse
*fall* damage rather than *all* damage is to recognise those three records and
nothing else. That is what the client does while the server's bit is up: the
three landing records aimed at its own body are dropped before they are priced;
every other hit is untouched; and the stumble, the camera hit and the grunt
still play, because they come from the locomotion state and a player told "no
fall damage" still expects to feel the fall. Observers need do nothing -- a
landing is resolved only on the body that landed.

**Release paths.** The bit rides the replicated life state, so it survives a
proxy re-stream and travels with the player across a bucket change (it concerns
his own client, not the observers he left). Death drops it (a dead body takes no
landings, and the respawn starts vanilla unless asked otherwise), a reconnect
drops it, and the resource that switched it off switches it back on when it
stops, reloads or crashes -- nothing else could, because there is no proximity
notion to auto-clear against. Refused with `transition_in_progress` during a
revive or respawn, like every other life bit; **allowed while dead**, so a
gamemode that drops players from the sky can shield them before the respawn it
is about to issue rather than racing the first landing:

```lua
-- A parkour round: nobody dies to the course, everybody still dies to each other.
AddEventHandler("parkour:roundStart", function()
    for _, id in ipairs(Open77.players.all()) do
        Open77.players.setFallDamage(id, false)
    end
end)

-- Re-arm on death: Kill zeroed the bit, and the spawn point is a rooftop.
AddEventHandler("onPlayerLifeStateChanged", function(playerId, revision, phase)
    if phase ~= "dead" then return end
    Open77.players.setFallDamage(playerId, false)   -- allowed while dead; rides the respawn
    Open77.players.respawn(playerId, { position = spawns.rooftop, heading = 90 })
end)

AddEventHandler("parkour:roundEnd", function()
    for _, id in ipairs(Open77.players.all()) do
        Open77.players.setFallDamage(id, true)
    end
end)
```

On the wire the flag is `PlayerLifeFlags.FallShield` (`1 << 3`), beside
`Ghosted` (`1 << 0`), `Frozen` (`1 << 1`) and `Invisible` (`1 << 2`). The flags
field has always been serialized and never validated, so assigning the bit is
not a protocol change: a client that predates it decodes the value and ignores
the bit, which degrades to "vanilla fall damage" rather than a disconnect.

## Synchronization model

The server sends health, stamina, maximums, regeneration configuration and the
combined revision in one reliable `PlayerHealthState` message. Late join and
routing-bucket changes replay the same durable state. The native client also
keeps the newest snapshot across REDengine world reloads and reapplies it when
the new local player/stat-pool systems become available.

Cyberpunk consumes stamina locally while sprinting, dodging or attacking. The
owning client samples that native decrease and sends only the bounded positive
delta consumed. The server accepts only monotonic sequences and the current
authority revision, then subtracts the delta from its current canonical value.
It never accepts a client-side refill or maximum change. Consumption deltas and
server regeneration commute, so neither can erase the other under latency.
Explicit stamina writes, maximum changes and life transitions advance the
authority revision, making older in-flight observations harmless. Changing a
regeneration rate or toggle keeps the epoch because it commutes with pending
consumption too.

Both native Health and Stamina regeneration are disabled during a multiplayer
session. Server ticks are the only regeneration source, and clients project
the canonical values back onto the engine pools. Disconnecting removes Open77's
temporary maximum and regeneration overrides.

## Events

```lua
AddEventHandler("open77:playerStatsChanged", function(
  playerId, health, maxHealth, stamina, maxStamina, revision, reason
) end)
```

The existing `open77:playerHealthChanged` and damage-feedback events remain
available for compatibility. Use the new event when a system needs to react to
either pool or to configuration-driven revisions.
