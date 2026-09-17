# Ground Slam / Quake

Grant Ground Slam to players using blunt melee weapons. Players can activate it on the ground or in the air; the server validates each impact and controls damage, knockback and ability costs.

## Minimal example

`open77.lua`:

```lua
resource "my_quake"
version "1.0.0"
server_script "server/main.lua"
permissions { "players.abilities.define", "players.abilities.manage", "players.abilities.read" }
```

`server/main.lua`:

```lua
CreateThread(function()
    local result, reason = Open77.abilities.define({
        id = "myserver.quake", version = 1, profile = "ground_slam",
        config = {
            inputKey = "l",
            damage = 35, knockbackMeters = 1.5, cosmetic = false, nonlethal = true,
            staminaCost = 20, cooldownMs = 5000, radius = 4,
        },
    })
    assert(result and result.ok, reason)
end)

RegisterCommand("quake", function(source, args)
    local player = tonumber(source)
    if not player or player <= 0 then return end
    local result, reason
    if args[1] == "off" then result, reason = Open77.abilities.revoke(player)
    elseif args[1] == "cancel" then result, reason = Open77.abilities.cancel(player)
    elseif args[1] == "state" then result, reason = Open77.abilities.current(player)
    else result, reason = Open77.abilities.grant(player, "myserver.quake") end
    print("quake: " .. (result and json.encode(result) or tostring(reason)))
end, false)
```

The player types `/quake`, waits until `/quake state` reports `status = "ready"`, draws
a blunt melee weapon, closes any menu, then presses **L** on the ground or in the air.
The key must be released after the grant: a key held through the grant or through a
menu does not fire. `/quake off` revokes the grant, `/quake cancel` interrupts a slam in
progress while keeping the grant.

Every config key is optional. Omitted keys take the defaults below; a misspelled key
makes the whole definition `invalid_definition`. Set `cosmetic = false` whenever
`damage` or `knockbackMeters` is not zero.

## Server API

| Call | Permission | Returns |
|---|---|---|
| `Open77.abilities.define(definition)` | `players.abilities.define` | `{ok=true}` or `nil, reason` |
| `Open77.abilities.grant(player, definitionId)` | `players.abilities.manage` | `{ok=true}` or `nil, reason`; the native projection can still be pending |
| `Open77.abilities.revoke(player)` | `players.abilities.manage` | Removes this resource's grant and cancels its active slam |
| `Open77.abilities.cancel(player)` | `players.abilities.manage` | Cancels this resource's active slam, keeps the grant |
| `Open77.abilities.current(player)` | `players.abilities.read` | Grant snapshot or `nil, reason` |

A definition is `{id, version, profile = "ground_slam", config = {...}}`. `id` is 1–96
ASCII letters, digits, `_`, `.` or `-`; `version` is a positive integer. A version is
immutable once defined: to change a slam, define a new version. Definitions belong to
the resource that defined them, and a grant belongs to the resource that granted it.

`current(player)` returns `player`, `incarnation`, `revision`, `definition`, `status`
(`pending`, `ready` or `removed`), `activation` and `cooldownRemainingMs`. Only `ready`
means the player can use the key.

## Options

| Field | Default | Accepted values |
|---|---|---|
| `inputKey` | `"g"` | One ASCII letter or digit, or a named key: `space`, `enter`, `return`, `tab`, `shift`, `ctrl`, `control`, `alt`, `capslock`, `backspace`, `insert`, `delete`, `home`, `end`, `pageup`, `pagedown`, `up`, `down`, `left`, `right`, `f1`–`f12`. Case-insensitive. |
| `allowGround`, `allowAir` | `true`, `true` | At least one must be true |
| `requiredArms`, `requiredLegs` | `false`, `false` | Require active Gorilla Arms / double-jump legs |
| `cosmetic` | `true` | Requires `damage = 0` and `knockbackMeters = 0` |
| `nonlethal` | `true` | Damage cannot kill |
| `damage` | `0` | 0–300 |
| `knockbackMeters` | `0` | 0–6 |
| `staminaCost` | `20` | 0–1000 |
| `cooldownMs` | `5000` | 1000–120000 |
| `radius` | `4` | 0.5–12 m |
| `innerRadius` | `1` | 0 up to, but excluding, `radius`; full damage inside it |
| `edgeMultiplier` | `0.25` | 0–1, damage multiplier at the edge of `radius` |
| `heightBonusPerMeter` | `0` | 0–20, extra damage per metre of fall |
| `maxHeight` | `10` | 0–30 m, caps the height used for the bonus |
| `maxActivationMs` | `5000` | 1000–10000 |
| `maxFallSpeed` | `30` | 1–60 m/s, fastest descent that can still slam |
| `geometryDeadlineMs` | `750` | 250–1500 |
| `maxFloorDelta` | `0.75` | 0.1–1 m between the slammer's floor and a target's floor |
| `reaction` | `"knockdown"` | `"knockdown"` or `"none"` |
| `impactEffect`, `impactSound` | `nil`, `nil` | Effect catalogue key (up to 96 chars) / sound event (up to 128 chars); ASCII letters, digits, `_.-` |
| `effectOnOwner`, `soundOnOwner` | `false`, `false` | Also play the effect / sound for the slammer |

The shipped `open77_cyberware_lab` uses `impactEffect = "impact.ground_slam"` and
`impactSound = "w_cyb_strongarms_hit_back"`.

## Events

Five server-local events fire with `(player, encodedJson)`. Decode the second argument
with `json.decode`.

| Event | When |
|---|---|
| `onAbilityActivation` | The server accepted a slam and charged stamina and cooldown |
| `onAbilityPhase` | The slam moved through `windup`, `descent`, `contact`, `impact`, `recovery`, `complete` |
| `onAbilityImpact` | Impact resolved; `targets` lists each hit player with `accepted`, `amount`, `error`, `motionId`, `motionError` |
| `onAbilityCancelled` | The slam ended early; `reason` says why |
| `onAbilityMotionOutcome` | A knockback reaction was requested, started or ended for a target |

Every payload carries `player`, `activation`, `incarnation`, `definition`, `phase`,
`reason`, `position`, `bucket`, `mode` (`ground` or `air`), `phaseSequence`, `elapsedMs`,
`serverTime` and the immutable `config`.

```lua
AddEventHandler("onAbilityImpact", function(player, encoded)
    local event = json.decode(encoded)
    for _, target in ipairs(event.targets or {}) do
        print(("%s slammed %s: accepted=%s amount=%s error=%s")
            :format(player, target.player, tostring(target.accepted), tostring(target.amount), tostring(target.error)))
    end
end)
```

## Optional lab

`open77_cyberware_lab` is off by default (`auto_start false`) and open to every connected
player once started. It binds **L** and ships four presets: `harmless` (no damage),
`combat` (35 nonlethal damage, 1.5 m knockback), `gorilla` (combat, requires Gorilla
Arms) and `parkour` (combat, requires double-jump legs). All presets cost 20 stamina,
cool down for five seconds and use a four-metre radius. `/cyberlab` opens a panel with a
Ground Slam card; the same controls exist as commands:

```text
/cyberlab slam grant <player> harmless
/cyberlab slam state <player>
/cyberlab slam cancel <player>
/cyberlab slam revoke <player>
/cyberlab slam diagnostics <player>
```

Omit the player to target yourself; the server console must name one. The presets and
the binding live in `resources/gamemodes/open77_cyberware_lab/server/ground-slam.lua`.

## Limits

**Costs are spent on acceptance.** Stamina is charged and the cooldown starts when the
server accepts the slam, even if it is interrupted or hits nobody. There is no refund.

**One grant per player per resource.** Granting the same definition twice is a no-op.
Granting a new version replaces the projection but does not reset a running cooldown.
A grant made by another resource cannot be revoked or replaced: the call returns
`grant_owned`. Stopping your resource removes its definitions and grants; disconnecting,
dying, changing body or changing routing bucket ends any slam in progress.

**Grant refusals** return `nil, reason`: `definition_unavailable`, `definition_owned`,
`grant_owned`, `grant_limit`, `body_unavailable` (dead, mounted or not ready),
`equipment_required` (`requiredArms` / `requiredLegs` not met). **A refused tap** does
nothing for the player and raises no server event; the reason is readable on the client
as `lastServerError` in the `slamActivity` export below: `cooldown`,
`insufficient_stamina`, `fall_speed_limit`, `mode_unavailable`, `motion_busy` (a
knockdown or a dash owns the body), `cyberware_suspended` (a Cyberware Malfunction or a
freeze from a [hack](hacking.md)) and `crippled` (a Cripple Movement hack).

**Native eligibility still applies.** The player must have a blunt melee weapon drawn;
Ground Slam does not install one. Ordinary landings and vanilla quick melee never trigger
it. Cosmetic slams run the same eligibility and contact checks as damaging ones.

**Who gets hit is the server's decision.** Targets pass the usual combat scope, team,
PvP, god-mode and life checks, and each damaging target needs matching floor-and-contact
geometry from both the slammer's and the target's client. Missing, stale or disagreeing
evidence fails closed: no damage. Damage falls off from `innerRadius` to `radius` by
`edgeMultiplier`; `heightBonusPerMeter` adds to it up to `maxHeight`. `maxHeight` caps the
bonus, it is not a safe-fall height: native fall damage still applies. The check is
client evidence with a bounded budget (four native queries per frame, 32 rays per
challenge, 64 queued challenges), not a server physics simulation, so two colluding
modified clients can lie to each other.

**Presentation.** `impactEffect` is drawn by the shipped `open77_cyberware` adapter as one
instance at the contact point plus a ring of three around it, for observers within 90 m;
the slammer sees it only with `effectOnOwner`. `impactSound` plays once as a three-second
spatial one-shot, excluding the slammer unless `soundOnOwner`. The slammer's own camera
stagger and rumble come from the native landing, not from these fields.

## Advanced: client adapter

The client half is `open77_cyberware`, a system resource that is already running. Its
`Open77.abilities` client methods (`configureSlam`, `slamState`, `requestSlam`,
`approveSlam`, `cancelSlam`, `slamActivity`, `presentSlam`, `releaseSlam`) are owned by
that resource and need `player.abilities.project` / `player.abilities.read`. Gameplay
resources should use the server API and the player's key, not these handles. Two
read-only exports are available to any client resource:

```lua
CreateThread(function()
    local pending = Open77.exports.call("open77_cyberware", "slamActivity")
    local activity = pending and pending:await()
    if activity then print(activity.phase, activity.elapsedMs, activity.grounded) end
end)
```

`slamActivity` returns the current native activity (`phase`, `elapsedMs`, `grounded`,
`position`, `verticalSpeed`, a bounded `history` of phase receipts) or `nil, reason`;
`slamPresentation` returns the most recent presentation receipt, also on an observer.
The `open77:abilities:*` network events are the platform's own transport: a resource
cannot forge a slam or damage an arbitrary player by sending them.
