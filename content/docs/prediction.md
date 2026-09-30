# Prediction

Prediction makes an action feel instant for the player who performs it. When you hit
someone, open a door or crash into a car, **your own screen shows the result straight
away** instead of waiting a round trip for the server. The server still decides: it
**confirms** the action, and the real reaction takes over from the predicted one without a
visible change, or it **refuses** it, and the prediction is **rolled back smoothly**: a
knocked-down body gets back up, a pushed car eases back to where it really is, a door closes
again.

A prediction only changes what the acting player sees before the verdict. It never deals
damage, never moves anything on other players' screens and never grants authority: every
outcome is still the server's. Client and server must run the same Open77 build.

## What is built in and what the resources add

| Layer | What it provides | What it needs |
|---|---|---|
| **Open77 client** (native) | Car against car (`carContact`), car against a network NPC opted in with [`behavior.vehicleContactEnabled`](npc-behavior.md#vehicle-contact-damage) (`carContact`), car against player (`playerContact`), door (`door`, on the network doors of the bundled `open77_doors` service) and blast (`blast`) prediction. | Nothing: always on. Compiled defaults: every family on, and no new prediction starts above a 250 ms round trip. |
| **`open77_cyberware`** (bundled system resource, already running) | Melee (`melee`), Ground Slam (`slam`) and quickhack (`hack`) knockdown prediction. | The gamemode's combat policy, published with the local client event [`open77_prediction:policy`](#melee-ground-slam-and-quickhack-predictions); Freeroam publishes one. Without it these three never predict. |
| **`open77_prediction`** (bundled platform resource, starts automatically) | Only the operator layer: the per-family switches, the round-trip ceiling, the [`open77.prediction` state bag key](#the-published-policy), [telemetry](#operator-controls), the `prediction` admin command and the [`restrict` export](#gamemode-restrictions) for gamemodes. | Nothing depends on it. Without it, clients keep their compiled defaults and the server has no switches and no telemetry. |

## Do I need open77_prediction? No, it is optional

`open77_prediction` is an **extra**. Prediction works without it, for three reasons:

1. **The predictions are native client code, not a resource.** Showing the result early,
   adopting it when the server confirms and rolling it back when the server refuses all happen
   in the Open77 client.
2. **The client ships safe defaults.** Without the resource, every family is on and no new
   prediction starts above a 250 ms round trip.
3. **The server still decides everything that counts.** Every hit, damage value, push and death
   is the server's call, so the game stays correct and fair with or without the resource.

What you lose without it is only **control and visibility**: the per-family switches, the
ping ceiling setting, gamemode `restrict`, telemetry and the `prediction` admin command. Keep
it when you want to turn a family off, tune the ceiling or watch refutation rates.

It is loaded by default on every server. It only goes missing when a
[`resources.load` allowlist](#server-setup) omits it.

Melee, Ground Slam and quickhack prediction need the gamemode's
[combat policy](#melee-ground-slam-and-quickhack-predictions) either way; that requirement is
independent of this resource.

## Prediction families

Each kind of prediction is a **family** with its own switch.

| Family | What the acting player sees early |
|---|---|
| `melee` | A melee hit knocks the victim down on the attacker's screen before the server's verdict. |
| `slam` | A Ground Slam knocks nearby players down on the attacker's screen before the server's verdict. |
| `hack` | A knockdown quickhack drops its target on the hacker's screen before the server's verdict. |
| `door` | A network door starts opening as soon as it is used, before the server accepts the request. |
| `blast` | Cars and players another client simulates react to the shooter's own blast before its relay returns. |
| `carContact` | A remote car struck by the local driver starts moving at once instead of about 250 ms later; an opted-in network NPC the driver hits starts falling at once. |
| `playerContact` | A player hit by the local driver starts falling at once, before the victim's fall cue returns. |

Every prediction ends in one of three ways, which is what the counters report:

- **adopted**: the server's own reaction took it over or confirmed it;
- **refuted**: the server refused it, or did not answer in time, and it was rolled back;
- **skipped**: the policy stopped it before it started, because its family is switched off
  (`skippedDisabled`) or the round trip is above the latency ceiling (`skippedLatency`).

A late verdict makes a refusal far more visible, so a client whose measured round trip is above
the **latency ceiling** (250 ms by default) starts no new prediction; one already playing
finishes normally. An unknown round trip, before the first measurement, does not block anything.

## API at a glance

**Prediction**

- [`Open77.prediction.stats`](/docs/api/client/open77-prediction#stats): the live prediction
  policy, this client's round trip and each family's counters.
- [`Open77.prediction.setPolicy`](/docs/api/client/open77-prediction#setpolicy): the switches and
  latency ceiling this client applies. Needs the dedicated `prediction.policy` permission; the
  bundled `open77_prediction` resource is its only intended caller. See
  [Advanced](#advanced-native-calls).
- [`Open77.motion.predictAction`](/docs/api/client/open77-motion#predictaction),
  [`refutePrediction`](/docs/api/client/open77-motion#refuteprediction) and
  [`predictionStats`](/docs/api/client/open77-motion#predictionstats), **experimental**:
  start, roll back and count the melee, Ground Slam and quickhack knockdown predictions.
- `open77_prediction`: the [`prediction` admin command](#operator-controls), the gamemode
  export [`restrict`](#gamemode-restrictions) and the seven
  [prediction families](#prediction-families), published to every client through the
  [`open77.prediction` state bag key](#the-published-policy).
- [`resources.load` allowlists](#server-setup) must list `open77_prediction`, or the server
  has no switches and no telemetry.

**NPCs**

- [`Open77.npcs.presence`](/docs/api/server/open77-npcs#presence): where an NPC is and which
  client simulates it, in one constant-time read. See [NPC spawning](npcs.md#server-api-reference).
- [`behavior.vehicleContactEnabled`](npc-behavior.md#vehicle-contact-damage): opts an NPC in to
  server-priced damage when a car hits it.
- [`behavior.hitPricing`](npc-behavior.md#who-prices-player-hits-hitpricing): `"platform"` lets
  the server price player hits on a mortal NPC instead of the resource that created it.
- [`moveTo` end reasons](npcs.md#move-follow-and-patrol) `path_blocked`, `nearest_reachable`
  and `report_jump`: a walk never arrives by teleport, and the task says why it stopped.

**Doors**

- [`setNpcPassage`](doors.md#npc-passage) and `configure(..., { npcPassage = ... })` with the
  modes `public`, `resource`, `always` and `never`: which network NPCs may open a door.
- [`npcStats`](doors.md#npc-passage): NPC door openings admitted and refused.
- [`resolveAction(ticket, false)`](doors.md#door-actions-force-pay-and-hack) answers
  `false, "refused_by_owner"`: `true` only ever means the door opened.

**Weapons and explosions**

- [`Open77.weapons.applyBlast`](/docs/api/client/open77-weapons#applyblast): pushes the cars this
  client simulates and knocks down its NPC copies for a server-relayed blast.
- [`relayBlast`](weapons-api.md#explosions-on-every-screen-the-blast-relay): relays a blast
  another server resource admitted, so every screen sees cars move and NPCs fall.
- [`open77_blasts`](weapons-api.md#explosions-on-every-screen-the-blast-relay) convar: `off`
  disables the blast relay.
- [`onPlayerExplosion`](weapons-api.md#gadgets-grenades-in-the-quick-slots): the server event for
  a detonation a player's client observed.
- [`onVehicleWeaponExplosion`](vehicle-weapons.md#current-damage-policy): the server event for a
  mounted weapon's admitted explosion.
- [`onConsumableUsed`](consumables-api.md#observe-actual-uses-and-apply-healing-policy): a
  reserved host event that also credits grenade charges to the blast relay.

**Server configuration**

- [`combat.handheldDischarges`](npc-behavior.md#server-configuration) (default `true`): the
  server admits each handheld shot, which platform-priced NPC hits require.
- [`combat.handheldVehicleDamage`](vehicle-weapons.md#handheld-guns-on-cars-another-player-drives)
  (default `false`): the server applies handheld gun hits on cars another player drives.

## Server setup

`open77_prediction` is a **platform resource**: it ships with every Open77 server and starts
automatically, so its code is not in your `resources` folder. Do not copy it into your
resources; the bundled one is the one that runs. Its source is published for reference only,
read-only:
[open77_prediction on GitHub](https://github.com/Open2077/open77-rp-examples/tree/main/platform/open77_prediction).

**If `server.jsonc` selects resources with a `resources.load` allowlist, add it** to keep the
switches, the admin command and the telemetry. A resource the list does not select is never
started, and nothing is logged about it:

```jsonc
"resources": {
  "load": [
    "open77_shell",
    "open77_chat",
    "open77_prediction",   // add this line to an exact list
    "freeroam"
  ]
}
```

A wildcard rule such as `"open77_*"` already selects it. `load` is read at startup, so restart
the server after editing it. See
[Selecting which resources load](server-resources.md#selecting-which-resources-load).
Client and server must run the same Open77 build: the native prediction code ships in the
client and the verdicts come from the server.

## Operator controls

The seven family switches, the latency ceiling and the telemetry interval are
[operator tunables](tunables.md) of `open77_prediction`. Change them in Warden, with
`tunable.set open77_prediction <key> <value>` at the console, or with the restricted
`prediction` command (ACL `command.prediction`):

```text
prediction                   status: policy, gamemode restrictions, telemetry totals
prediction off blast         turn one family off (melee, slam, hack, door, blast, carContact, playerContact)
prediction on blast          turn it back on
prediction ping 200          latency ceiling in milliseconds, 0 to 5000; 0 removes it
prediction telemetry 120     report interval in seconds, 0 to 3600; 0 turns reports off
```

| Tunable | Default | Meaning |
|---|---|---|
| `melee`, `slam`, `hack`, `door`, `blast`, `carContact`, `playerContact` | `true` | Off: this family never predicts; the server's reaction is unchanged. |
| `maxPingMs` | `250` | Above this round trip a client starts no new prediction. `0` removes the ceiling. |
| `telemetrySeconds` | `60` | How often each client reports its counters. `0` turns reports off; below 15 s counts as 15 s. |

Changes are saved and reach every client at once, late joiners included; they apply to the next
prediction.

**Telemetry.** Each client reports only the counters that changed, once per interval, and nothing
when nothing happened. The server logs one line per window:

```text
telemetry 60s clients=12 reports=12 dropped=0 | melee p=40 a=37 r=3 off=0 lag=2 rr=8% | ...
```

`p`, `a` and `r` are predicted, adopted and refuted; `off` and `lag` are the two kinds of skip;
`rr` is refuted / (adopted + refuted). Up to five `high refutation player=<id> ping=<ms> ...`
lines follow for a family with at least five verdicts of which half or more were refuted.
Telemetry is informational only and never an authority input. The resource's server exports
`policy()` (the effective policy) and `telemetry()` (cumulative totals and the last window)
return the same data as tables.

## Gamemode restrictions

A gamemode can only **narrow** the operator's policy, for as long as it runs: turn families off
and lower the ceiling (1–5000 ms). It cannot turn on a family the operator turned off.

```lua
-- Server script of a gamemode: no blast or car-contact prediction, and a lower ceiling.
local function restrictPrediction()
    local promise, reason = Open77.exports.call("open77_prediction", "restrict", {
        families = { blast = false, carContact = false },
        maxPingMs = 150,
    })
    if not promise then print("open77_prediction unavailable: " .. tostring(reason)); return end
    local ok, failure = promise:await()
    if not ok then print("prediction restriction refused: " .. tostring(failure)) end
end

AddEventHandler("onResourceStart", function(name)
    if name == GetCurrentResourceName() then CreateThread(restrictPrediction) end
end)
-- Restrictions do not survive a stop or restart of open77_prediction; it announces itself again.
AddEventHandler("open77_prediction:ready", function() CreateThread(restrictPrediction) end)
```

A restriction is keyed by the calling resource and replaced by its next call. `restrict(nil)`,
`clearRestriction()` or the caller's stop withdraws it. It survives a reload of
`open77_prediction`. The effective policy is the operator's switches with every running
restriction applied, and the lowest ceiling wins. Refusals: `unknown_caller`,
`invalid_restriction`, `invalid_prediction_family`, `invalid_ping_ceiling` and
`restriction_limit` (32 restricting resources).

## The published policy

The server publishes the effective policy in the global [state bag](state-bags.md) under the key
`open77.prediction`: `{ v = 1, families = { melee = true, ... }, maxPingMs, telemetrySeconds }`.
Every client applies it at once, late joiners included. The key is cleared when
`open77_prediction` stops, and clients fall back to their defaults.

```lua
-- Client: read the policy the server publishes, and follow its changes.
local policy = Open77.state.global:get("open77.prediction")
if policy then print("blast prediction", policy.families.blast, "ceiling", policy.maxPingMs) end

Open77.state.onChange(Open77.state.global, "open77.prediction", function(_, _, value)
    print("prediction policy changed; ceiling", value and value.maxPingMs)
end)
```

## Melee, Ground Slam and quickhack predictions

The three action families are started by the bundled `open77_cyberware` resource, and only
where the gamemode has published its combat policy. Without that policy they **fail closed**:
they never predict. This is deliberate. Only the gamemode knows whether a hit can land at all:
its PvP switch, the bucket it plays in, its safe zones and its damage multipliers. A client
guessing without them would predict knockdowns the server then refuses, and the attacker would
see the victim fall and get back up. The client must not predict a hit the server will refuse.

The gamemode publishes the policy from a client script with the local event
`open77_prediction:policy`: sent when the gamemode starts, sent again on
`open77_prediction:requestPolicy`, and withdrawn with `{ enabled = false }` when it stops.
Nothing goes over the network and no permission is needed. Freeroam does this for the street
bucket and its spawn safe zones. A complete example resource is published for reference; copy
its `client/main.lua` into your gamemode and fill the values from your own configuration:
[prediction_policy_example on GitHub](https://github.com/Open2077/open77-rp-examples/tree/main/platform/prediction_policy_example).

| Field | Meaning |
|---|---|
| `owner` | Your resource name. The policy is dropped when that resource stops. |
| `enabled` | `true` when PvP is on. `false` or a missing policy means no melee, Slam or hack prediction. |
| `bucket` | The routing bucket these rules cover. Players in other buckets are not predicted. |
| `safeZoneRadius`, `safeZones` | No prediction when the attacker or the victim is inside one of these spheres. |
| `damageMultiplier`, `meleeMultiplier`, `explosionMultiplier`, `headshotMultiplier` | Your damage scales. A contact that might be lethal after them is not predicted. |

```lua
-- Client script of a gamemode: allow action predictions in bucket 0, outside the safe zones.
local function publish()
    TriggerEvent("open77_prediction:policy", {
        owner = GetCurrentResourceName(),
        enabled = true,
        bucket = 0,
        safeZoneRadius = 30,
        safeZones = { { x = -1448.0, y = 96.0, z = 17.0 } },
        damageMultiplier = 1, meleeMultiplier = 1, explosionMultiplier = 1, headshotMultiplier = 1,
    })
end
AddEventHandler("open77_prediction:requestPolicy", publish)
AddEventHandler("onClientResourceStart", function(name)
    if name == GetCurrentResourceName() then publish() end
end)
AddEventHandler("onClientResourceStop", function(name)
    if name == GetCurrentResourceName() then TriggerEvent("open77_prediction:policy", { enabled = false }) end
end)
```

Keep the multipliers equal to your server's damage policy: a contact that might be lethal is not
predicted, so the victim is never shown getting up from a hit that killed them. Both players must
be alive and in the policy's bucket, outside the safe zones and not already knocked down. The
operator switches and the latency ceiling of `open77_prediction` apply on top of this policy.

## Advanced: native calls

Resources rarely need these directly; the bundled resources call them.

| Call | Permission | Purpose |
|---|---|---|
| [`Open77.prediction.stats()`](/docs/api/client/open77-prediction#stats) | none | `{ maxPingMs, ping, owner?, families }` with each family's `enabled`, `predicted`, `adopted`, `refuted`, `skippedDisabled` and `skippedLatency`. |
| [`Open77.prediction.setPolicy(policy)`](/docs/api/client/open77-prediction#setpolicy) | `prediction.policy` | Sets what this client predicts: `{ families = { [name] = boolean }, maxPingMs = 0..5000 }`, or `nil` for the compiled defaults. Leave it to `open77_prediction`: a second caller replaces the server's policy on that client. |
| [`Open77.motion.predictAction(source, entity, x, y, expectedDamage)`](/docs/api/client/open77-motion#predictaction) | `player.motion.project` | **Experimental.** Starts a melee, slam or hack knockdown prediction on a remote player's proxy; returns a request ID. |
| [`Open77.motion.refutePrediction(request)`](/docs/api/client/open77-motion#refuteprediction) | `player.motion.project` | **Experimental.** Blends a refused prediction back to the live pose. |
| [`Open77.motion.predictionStats()`](/docs/api/client/open77-motion#predictionstats) | `player.motion.project` | **Experimental.** JSON counters of the three action families. |

```lua
-- Client: print this client's prediction counters.
RegisterCommand("predstats", function()
    local stats, reason = Open77.prediction.stats()
    if not stats then print(reason); return end
    print(("ping %d ms, ceiling %d ms"):format(stats.ping, stats.maxPingMs))
    for name, family in pairs(stats.families) do
        print(name, family.enabled, family.predicted, family.adopted, family.refuted)
    end
end, false)
```

## Limits

- Prediction is presentation only. Damage, positions, deaths and door states remain the
  server's, and telemetry is informational.
- "Refuted" follows each family's own rules, so rates are comparable over time within a family,
  not across families.
- The round trip is the transport's smoothed measurement: a short spike may not stop a
  prediction, and a recovered connection may keep skipping for a moment.
- Telemetry is reported by clients and bounded by the server; treat it as a health signal, not
  as evidence against a player.
