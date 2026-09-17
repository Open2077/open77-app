# The role-play kit

`open77_rp_basics` is a sample role-play resource combining player freeze, input blocking, synchronized animations, weapon queries and placement. It exposes cuff, escort and search actions:

```lua
exports.open77_rp_basics:cuff(officerId, targetId)
exports.open77_rp_basics:escort(officerId, targetId)
exports.open77_rp_basics:search(officerId, targetId)
```

and one that this engine cannot do, which is therefore present and refuses:

```lua
exports.open77_rp_basics:carry(officerId, targetId)   --> false, "carry_unsupported"
```

Use the resource as a dependency or adapt its source. Preserve ownership tracking and cleanup so an interrupted action cannot leave a player frozen.

## What each verb is, physically

| Verb | The body | The controls | Ends when |
|---|---|---|---|
| `cuff` | held by `Open77.players.setFrozen` — the engine's own `GameplayRestriction.NoMovement`, so every observer agrees and nothing slides | the whole gameplay action stream, on the target's own client | see [How a hold ends](#how-a-hold-ends) |
| `escort` | free: he walks himself | the action stream **minus** movement | the same list, plus the tether's own endings |
| `search` | held, for `searchMs` (4 s by default) | the whole stream, for the same beat | on its own, or by any of the same paths |
| `carry` | — | — | it never starts |

`cuff` loops the `handsup` RP profile. `escort` does not play a profile because walking cancels stationary RP animations. Stating that is better than shipping a pose that flickers off at the first step.

### `escort` is a leash

There is no way to attach one player to another on 2.31, so an escort is not an attachment. The
target walks under his own power with everything but movement taken away, and a 2 Hz tick watches
the gap: past `tetherDistance` (5 m) he is placed back `tetherPullDistance` (1.6 m) from his
escort, at the escort's height, and not again for `tetherCooldownMs` (2 s).

A tether pull uses `Open77.players.teleport`, which resolves after the client reports the body settled. The cooldown prevents overlapping placements and `settle_superseded` refusals.

Two tether outcomes end the hold rather than retrying:

- the target got into a vehicle — `teleport` answers `player_in_vehicle` and a leash that cannot
  move its prisoner is not holding him;
- either party died or changed routing bucket.

Everything else — a stale position, a body still streaming — pauses the leash for a tick. It never
ends a hold on thin evidence.

### `search` is a frisk, and reports a cache

The result carries `Open77.weapons.get(targetId)` verbatim, **including its freshness fields**.
That read is a cache of what the owner's client reported and never authority: a player nobody has
heard from answers `weapons_unreported`, which is a different fact from "carrying nothing". The
kit passes that distinction through rather than flattening it, because on an RP server the
difference is an argument nobody can settle afterwards.

```lua
AddEventHandler("open77_rp_basics:searched", function(officerId, targetId, ticket, result)
    if result.weapons == nil then
        -- `result.reason` is "weapons_unreported": not proof he is unarmed.
        return
    end
    -- result.weapons.slots / active / drawn / magazine / reportedAgeMs / loadoutAgeMs / source
end)
```

## Authority: what stops a griefer

An export carries no player identity — `source` is nil inside one, by design — so the officer is
an **argument**, and an argument proves nothing. Every verb therefore re-derives authority from
the ACL:

| Permission | Verb |
|---|---|
| `rp.cuff` | `cuff` |
| `rp.escort` | `escort` |
| `rp.search` | `search` |
| `rp.admin` | `release` on somebody else's hold |

Grant `rp.*` to a police role once. Until something is granted, every verb answers
`not_authorised`, and that is the intended state of a fresh install: a resource that can hold one
player still on another player's say-so does not arrive switched on. It is also `auto_start false`
for the same reason.

Before an action, the server checks that both players are ready, alive, in the same routing bucket and within `maxDistance` (3 m), using positions no older than two seconds. Dead or unready targets are rejected to avoid unsafe native actions.

## How a hold ends

This is the feature. Twelve paths, each implemented, each with a test:

| Reason | What happened |
|---|---|
| `released` | the officer asked, through `release` or `rp.free` |
| `freed_by_admin` | somebody holding `rp.admin` freed him |
| `expired` | the hold outlived `maxHoldMs` (15 minutes by default) |
| `superseded` | the same officer replaced the hold with a different verb |
| `officer_left` / `target_left` | that player disconnected |
| `officer_dead` / `target_dead` | that player's life phase left `alive` |
| `officer_bucket_changed` / `target_bucket_changed` | that player moved to another world |
| `target_mounted` | escort only: he got into a vehicle, which a tether cannot follow |
| `resource_stopping` | this resource stopped, reloaded, or hit a runtime error |

**`expired` is the one that matters.** The other eleven are named paths that can each be missed —
an event that does not arrive, a handler that raises, a world state nobody enumerated. The
deadline is underneath all of them: a 2 Hz sweep releases anything past its expiry, every record
is released through one function, and every platform call in that function is wrapped so that one
refusal cannot skip the next. Nothing this kit does can strand a player indefinitely.

Two further safety nets are the platform's, not the kit's, and they hold even if this VM dies
between instructions:

- **freeze claims and input claims are per-resource and are dropped when the owning resource
  stops**, on every path including a crash;
- **the freeze is dropped on death and on respawn** by the life state machine itself.

### Releasing exactly what was taken

Two resources claiming the same thing must not fight. A freeze is a *claim*, not a value:
`setFrozen(false)` drops only the calling resource's hold, and a player stays frozen while anybody
else still holds him. The same is true of every input block. So the kit writes down what it took,
beside the record that asked for it, and gives back exactly that:

```
record.claims = { freeze = true, animation = "<playbackId>", client = true }
```

A cuff that becomes an escort releases the freeze and the animation and re-issues the client block
in its walking shape — one claim each, released once each. The test suite asserts the counters
return to zero on every one of the twelve endings above.

## The client half

`client/main.lua` owns the control block and nothing else. Input blocking is a client-only API by
design: the server decides *that* a player is held, the client decides *what that takes away*.

It takes `Open77.input.blockAll` (with `except = { "Movement" }` while escorting) plus `Map` and
`Hub` by name. It deliberately does **not** take the pause menu, and it cannot take chat or voice
— those run on focused browser input rather than on the gameplay action stream. A player somebody
else just cuffed must still be able to say so, reach settings, and disconnect.

One thing the client half must get right on its own: a client-side resource reload drops its claim
while the server still holds the player. On start it sends `open77:rpbasics:sync` and the server
re-issues whatever is standing.

## Configuration

The defaults live in `shared/rules.lua` and are what a caller gets:

| Key | Default | Meaning |
|---|---|---|
| `maxDistance` | 3.0 m | how close the officer must be to start a verb |
| `tetherDistance` | 5.0 m | how far an escorted player may drift |
| `tetherPullDistance` | 1.6 m | where a pull puts him |
| `tetherCooldownMs` | 2000 | the floor between two pulls |
| `maxHoldMs` | 900000 | the ceiling on any hold |
| `searchMs` | 4000 | how long a frisk takes |
| `positionMaxAgeMs` | 2000 | older than this and a position is not evidence |

`options.holdMs` on `cuff` / `escort` / `search` shortens one hold. It can never lengthen one past
`maxHoldMs`: the ceiling is the operator's protection against a resource that forgets.

## Composing the verbs the row named but the kit does not export

- **drag** is `escort` on a player who cannot walk. On 2.31 that is not buildable: a downed player
  is not `alive`, and `teleport` refuses a body that is not alive, so the leash has nothing to
  pull. Use `escort` once he is up.
- **rob** is `search` plus your own inventory transaction. The kit deliberately stops at the
  report: inventory is a framework concern, not a native one, and a kit that moved items would be
  making decisions that belong to the gamemode.

## Least privilege, as a worked example

The manifest asks for nine capabilities and a test asserts it asks for no more. Two absences are
deliberate and worth copying:

- **`world.vehicles` is not requested**, although knowing whether the target is seated would make
  the tether tidier. The teleport refusal `player_in_vehicle` answers the same question after the
  fact, and it costs nothing. A capability you can do without is a capability you do not ask for.
- **`players.animations.read` is not requested.** The kit tracks its own playback ids and never
  needs to ask what somebody else started.

## See also

- [Freezing a player](player-freeze.md) — the mechanism under `cuff`, and why a freeze is a claim.
- [Blocking player input](input-blocking.md) — what `blockAll` really takes, and what it cannot.
- [Role-play animations](rp-animations.md) — the `handsup` profile and why it is stationary.
- [Cross-resource server exports](server-exports.md) — how another resource calls this one.
- [Props](props.md#attachment) — the attachment that exists, and the parenting that does not.
