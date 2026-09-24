# Native Dash and Air Dash

Grant native ground or air dashes for a player session. The server controls stamina, charges, cooldowns and the one-Air-Dash-per-airtime limit. Dash grants do not replace installed cyberware.

## Minimal example

`open77.lua`:

```lua
resource "my_dash"
version "1.0.0"
server_script "server/main.lua"
permissions { "players.dash.define", "players.dash.manage", "players.dash.read" }
```

`server/main.lua`:

```lua
CreateThread(function()
    local result, reason = Open77.dash.define({
        id = "myserver.air_dash", version = 1, profile = "dash",
        config = {
            inputKey = "ctrl", allowGround = true, allowAir = true,
            staminaCost = 20, cooldownMs = 700, maxCharges = 1, chargeRegenMs = 2500,
        },
    })
    assert(result and result.ok, reason)
end)

RegisterCommand("dash", function(source, args)
    local player = tonumber(source)
    if not player or player <= 0 then return end
    local result, reason
    if args[1] == "off" then result, reason = Open77.dash.revoke(player)
    elseif args[1] == "state" then result, reason = Open77.dash.current(player)
    else result, reason = Open77.dash.grant(player, "myserver.air_dash") end
    print("dash: " .. (result and json.encode(result) or tostring(reason)))
end, false)
```

The player types `/dash`, waits until `/dash state` shows `projection.status = "ready"`,
closes any menu, holds a movement direction and taps **Ctrl**. For an Air Dash, jump
first. With no direction held the dash follows the camera. `/dash off` removes the grant.

Every config key is optional and takes the default below when omitted; a misspelled key
makes the definition `invalid_definition`.

## Server API

| Call | Permission | Returns |
|---|---|---|
| `Open77.dash.define(definition)` | `players.dash.define` | `{ok=true}` or `nil, reason`; versions are immutable |
| `Open77.dash.grant(player, definitionId)` | `players.dash.manage` | `{ok=true}` or `nil, reason`; native projection is still pending |
| `Open77.dash.revoke(player)` | `players.dash.manage` | Removes this resource's grant |
| `Open77.dash.cancel(player, activationId)` | `players.dash.manage` | Cancels that active dash |
| `Open77.dash.current(player)` | `players.dash.read` | Activity snapshot, or `nil` when the player has no grant |
| `Open77.dash.capabilities()` | `players.dash.read` | Supported profile and the bounds below |

`current(player)` returns `projection` (`status` is `pending`, `ready` or `removed`, plus
the `definition`), `charges`, `cooldownUntil`, `nextChargeAt` (server monotonic
milliseconds), `airUsed`, `activation`, `phase` and `ownedByCaller`. A grant needs a
bound cyberware character (the `open77_appearance` adapter supplies it) and an alive,
ready, unmounted body.

## Options

| Field | Default | Accepted values |
|---|---|---|
| `inputKey` | `"ctrl"` | One lowercase letter or digit, `f1`–`f12`, or `space`, `enter`, `return`, `tab`, `shift`, `ctrl`, `control`, `alt`, `capslock`, `backspace`, `insert`, `delete`, `home`, `end`, `pageup`, `pagedown`, `up`, `down`, `left`, `right` |
| `allowGround`, `allowAir` | `true`, `true` | At least one must be true |
| `requireDoubleJump` | `false` | Require installed, active double-jump legs; does not install them |
| `staminaCost` | `20` | 0–300 |
| `cooldownMs` | `700` | 300–600000 |
| `maxCharges` | `2` | 1–3 |
| `chargeRegenMs` | `2500` | 300–600000, charges regenerate one at a time |
| `landingRearmMs` | `150` | 150–1000 ms of stable ground before the Air Dash rearms |
| `maxAirborneMs` | `10000` | 100–10000 |
| `maxFallSpeed` | `30` | 0.1–30 m/s |
| `movementProfile` | `"native"` | Only `"native"` |
| `presentation` | `"native"` | `"native"` (sound and effects), `"silent"` (effects only), `"none"` |

Speed, distance and immunity are the native dash and are not configurable.

## Events

`onDashChanged(player, encodedJson)` fires for every accepted dash as it moves through
`accepted`, `started`, `completed` or `cancelled`. The payload carries `player`,
`incarnation`, `activation`, `definition`, `mode` (`ground` or `air`), `phase`, `reason`,
`directionX`, `directionY`, `serverTimeMs`, `expiresAtMs` and `presentation`.

```lua
AddEventHandler("onDashChanged", function(player, encoded)
    local event = json.decode(encoded)
    print(("dash player=%s activation=%s phase=%s reason=%s")
        :format(player, event.activation, event.phase, tostring(event.reason)))
end)
```

`onDashRejected(player, encodedJson)` fires when a tap was refused. The payload has
`incarnation`, `revision`, `sequence`, `activation = nil`, `ok = false`, `error`,
`directionX`, `directionY` and `expiresInMs`.

```lua
AddEventHandler("onDashRejected", function(player, encoded)
    local rejected = json.decode(encoded)
    print(("dash refused player=%s reason=%s"):format(player, rejected.error))
end)
```

Both events are server-local: a client cannot trigger them over the network.

## Optional resources

`open77_parkour_example` (`auto_start false`) is a self-service resource built on this
API. Start it with `ensure open77_parkour_example`, then in chat:

```text
/parkour install basic air        -- one charge, 20 stamina, 700 ms cooldown, 2500 ms regen
/parkour install advanced ground  -- three charges, 10 stamina, 450 ms cooldown, 1500 ms regen
/parkour install advanced combined
/parkour inspect
/parkour remove
```

Modes are `ground`, `air` and `combined`; `combined` needs installed double-jump legs
(an authorized doctor runs `/doc offer <patient> training legs`). `server/config.lua`
holds the binding, presentation, presets, `allowedBuckets` and `canUse(player, preset,
mode)`, which must return `true`; the resource re-checks it every 250 ms and revokes the
grant when it stops passing.

`open77_cyberware_lab` (`auto_start false`) offers the same presets from the `/cyberlab`
panel's Dash card and as commands: `/cyberlab dash install <player> basic air`,
`/cyberlab dash inspect <player>`, `/cyberlab dash test <player>`,
`/cyberlab dash remove <player>`.

## Limits

**Costs are spent on acceptance.** A charge and the stamina go when the server accepts
the tap, even if a wall stops the dash a moment later. Cooldown and charge debt survive
revoke and regrant, a new definition version and body changes within the session.

**One Air Dash per airtime.** Landing on stable ground for `landingRearmMs` rearms it;
regenerating a charge does not. Jump then Air Dash and double jump then Air Dash both
work; an Air Dash followed by a double jump is limited by the native jump state. Three
charges never mean three Air Dashes in one airtime.

**Native movement.** Collisions can shorten or block the travel; the presentation preset
selects only the adapter's sound and effects, never the animation or the collision.

**Input.** Direction comes from the physical WASD cluster; a custom in-game movement remap
is not discovered. The tap is ignored while a native menu or a WebUI page owns focus, and
a freshly granted key must be released before its first tap.

**Ownership.** One grant per player per resource. Another resource's grant returns
`grant_owned`; use that resource to remove it. Stopping your resource removes its
definitions and grants. A disconnect ends the session and a new body needs a fresh
projection before the key works again.

**Refusal reasons** (`nil, reason` from a call, or `error` in `onDashRejected`):
`definition_unavailable`, `definition_owned`, `grant_owned`, `grant_limit`,
`body_unavailable`, `equipment_required` (legs missing for `requireDoubleJump`),
`cooldown`, `charges_exhausted`, `insufficient_stamina`, `air_unavailable` (Air Dash
already used this airtime), `mode_unavailable`, `motion_busy` (a knockdown or a Ground
Slam owns the body), `movement_limit`, `stale_movement`, `invalid_direction`, and the
[hacking](hacking.md) gates `cyberware_suspended` (a Cyberware Malfunction or a freeze)
and `crippled` (a Cripple Movement).

**Cancellation and recovery.** After a cancel the server keeps the movement envelope
until the client acknowledges the native exit or 1500 ms pass, and for at least 300 ms
after any dash is admitted; `current().phase` reads `recovering` meanwhile. The
`open77:dash:*` network events are the platform's own transport and cannot be used to
forge a dash.
