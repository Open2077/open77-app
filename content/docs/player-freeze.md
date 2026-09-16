# Freezing a player

Hold a player's body where it stands. This is the primitive behind cuffs, a menu that must not be
walked out of, a progress bar, a safe zone, a cutscene and a dead state.

There are two halves, and they are not alternatives:

| | Call | Permission | Who decides |
|---|---|---|---|
| **Server** | `Open77.players.setFrozen(playerId, frozen)` | `players.life.freeze` | Authoritative. Rides the replicated life state, every observer agrees. |
| **Client** | `Open77.character.setFrozen(frozen)` | `player.freeze` | Presentation-local. Your body, your machine, no round trip. |

The server's freeze outranks the local one. Releasing a local hold while the server holds the
player changes nothing, and the local call says so in its second return value.

## The mechanism

Both halves apply the same thing: `GameplayRestriction.NoMovement`, the engine's own restriction
and the very record vanilla `GroundDeathEvents` applies on death. That matters for three reasons.

- **Nothing fights the hold.** The locomotion state machine *polls* the restriction, so there is
  no per-frame contest with an input path, and no animation plays. Suspending the mover component
  instead would leave the body sliding, which is why `Movement.hpp` warns against it.
- **Nothing slides on anybody else's screen.** A frozen player keeps sending snapshots at the
  normal rate; their position simply stops changing. The interpolator already refuses to
  extrapolate past 0.25 s, so no remote flag is needed and none was added.
- **It composes.** Open77 owns exactly one stack of the restriction and asks exactly one question
  to decide whether to hold it: soft death **or** the server freeze **or** any local claim. A
  restriction that was already standing before Open77 wanted one is never ours and is never
  removed.

## What a freeze stops, and what it deliberately does not

This list is the usability of the feature. Get it wrong and a frozen player is either still
walking or unable to say why he is stuck.

| Still works | Stopped |
|---|---|
| Looking around -- mouse and controller camera | Walking, running, sprinting, crouch-moving |
| Chat | Jumping, dodging |
| Voice | Sliding, vaulting |
| Opening menus and the inventory | Every other locomotion input, pressed or held |
| Interaction prompts | |
| **Taking damage, and dying** | |

The precedent is the death restriction, which has spared chat and voice since it shipped: a player
who cannot move must still be able to say so.

A freeze does **not** holster a weapon, block firing, or eject anyone from a vehicle. It is a
primitive, not a policy -- compose it with the control-blocking surface when a scene needs more.

## A hold is a claim, not a value

Both halves are keyed by the calling resource. A jail script and a cutscene script may hold the
same player at once, and `setFrozen(false)` drops only your own claim: the player stays frozen
while anybody else still holds him. `isFrozen` answers for all holders, not just yours.

```lua
-- client, permission player.freeze
local ok, stillHeld = Open77.character.setFrozen(true)
-- ... show the menu ...
local ok, stillHeld = Open77.character.setFrozen(false)
if stillHeld then
  -- somebody else -- or the server -- is still holding him. Not our business.
end
```

## Nothing can strand a player

A freeze whose owner is gone would be unrecoverable, so every path that could produce one releases
it:

| Path | What happens |
|---|---|
| The resource stops, reloads or crashes | The host drops that resource's claims, on both sides |
| The player dies | Server claims and local claims are both dropped |
| The player respawns | The flag is cleared again, belt and braces |
| The player changes routing bucket | The claims were about a body in another world |
| The player disconnects | Server claims dropped; a reconnecting session starts free |
| The session ends on the client | Every local claim is dropped |

Because death and respawn clear it outright, a gamemode that wants a player held *through* a
respawn must re-apply the freeze afterwards.

The server call is refused with `transition_in_progress` while a revive or respawn is in flight,
exactly like `setGhosted` -- the revision the client is acking must not move under it. A resource
*stop* during one still thaws: it corrects the state without publishing, and the transition's own
next publish carries the corrected flag. A refusal there would be precisely the stranding this
guards against.

## Putting a player down, and clearing everything: ragdoll and clearTasks

Two more body primitives live beside the freeze, both server-side and both
composed from services that already ship rather than built new.

| Function | Permission | Purpose |
|---|---|---|
| `Open77.players.ragdoll(playerId, options?)` | `players.motion.control` | Put the body on the ground for a bounded time; it gets up on its own. FiveM's `SetPedToRagdoll`. |
| `Open77.players.clearTasks(playerId)` | any of `players.motion.control`, `players.animations.control`, `players.life.freeze` | End everything **this resource** put on the body -- its ragdoll, its animation, its freeze. FiveM's `ClearPedTasksImmediately`. |

### A ragdoll is the knockdown, with a clock

`Open77.motion.knockdown` already puts a living player on the ground through
the engine's own knockdown status -- the record vanilla uses, a physical fall
the observers replicate as a hit reaction. What it demanded from every caller
was a direction and a distance, and what it lacked was a duration. `ragdoll`
supplies the defaults and the clock:

```lua
Open77.players.ragdoll(id)                                  -- 3 s, in place, facing forward
Open77.players.ragdoll(id, { durationMs = 1200 })           -- up again after 1.2 s
Open77.players.ragdoll(id, { direction = 90 })              -- a heading in degrees (0 = north)
Open77.players.ragdoll(id, { direction = { x = 0, y = 1 }, distance = 2 })  -- a 2 m shove
```

- `direction` defaults to the body's own facing, read from the server's last
  accepted transform (`Open77.players.get(id).heading`); a player who has never
  reported one falls "north". With the default `distance` of `0` the direction
  only decides the way the body faces as it goes down -- it is never a
  displacement.
- `durationMs` counts from the moment the owning client reports the body down,
  so "1200" is 1.2 s *on the ground*, not 1.2 s from the request. It is clamped
  to the engine's own knockdown -- **3000 ms** -- because the native status the
  client applies removes itself after three seconds and a longer promise could
  not be kept. The effective number comes back as `durationMs`.
- The result is the knockdown's: `{ ok = true, id = ..., durationMs = ... }`,
  or `nil, reason`. `Open77.motion.cancel(id, result.id)` stands the body up
  early, and `onPlayerMotionChanged(playerId, id, phase, reason)` reports
  `pending`, `active` and `ended` -- `reason = "duration_elapsed"` is the clock.
- Refusals are the knockdown's too: `motion_busy` while a motion is already on
  the body (including the 1.5 s recovery window after one ends, so hit spam
  cannot chain ragdolls), `body_unavailable` for a player who is not alive, on
  foot and ready, `invalid_direction` / `invalid_duration` for bad arguments —
  and `motion_unavailable` on a server without a database: the motion lease
  belongs to the cyberware store, which exists only with `database.enabled`, so
  a bare development server answers that rather than a fall (the parity probe
  reports `SKIP` there for the same reason).

**Why not a physics ragdoll.** The engine can put a body into a true physical
ragdoll and Open77 already calls that for death (`Api::Life::ForceRagdoll`,
proven 129/129), but it stays deliberately unbound to Lua: the life replication
takes the body *out* of ragdoll on the respawn path, and a scripted ragdoll
racing that proven revive was judged the wrong trade. The knockdown path never
meets the race -- it is admitted only while the life phase is `alive`, and the
lease is dropped the moment the phase leaves it, so a body mid-revive can
neither be knocked down nor stay down.

```lua
-- A stun grenade: everybody within 6 m goes down for two seconds.
RegisterNetEvent("stun:detonated", function(x, y, z)
    for _, id in ipairs(Open77.players.nearby({ x = x, y = y, z = z }, 6.0)) do
        local read = Open77.players.get(id)
        if read and read.alive and not read.inVehicle then
            Open77.players.ragdoll(id, { durationMs = 2000 })
        end
    end
end)
```

### clearTasks releases what this resource holds, and only that

Three services keep per-owner claims -- the motion lease, the animation
playback, the freeze -- and each already refuses to release another owner's.
`clearTasks` asks all three in one call and reports per half:

```lua
local result, reason = Open77.players.clearTasks(id)
-- result = { motion = "cancelled", animation = "stopped", freeze = "released", clear = true }
```

Each half answers `cancelled` / `stopped` / `released` when something of yours
ended, `none` when you held nothing, `not_owned` when another resource holds it
(and it is left alone -- a jail script's freeze does not end because a
cutscene script cleaned up), or the owning service's own reason when it refused
(`transition_in_progress` on a freeze during a revive). `clear` is `true` when
nothing of yours is left on the body. `nil, reason` only for a bad id or a
resource holding none of the three capabilities -- then nothing could have been
put on the player in the first place.

The animation half covers every playback shape the animation service owns for
that player: an emote, a placed posture (`playAt`), a raw clip and a sequence.
Everything it releases is something the server already releases when your
resource stops; the call simply lets a script do it on purpose, mid-life.

```lua
-- /free <id>: whatever this resource was doing to them, stop it.
RegisterCommand("free", function(source, args)
    local target = tonumber(args[1])
    if not target then return end
    local result = Open77.players.clearTasks(target)
    if result and not result.clear then
        print(("still held: freeze=%s"):format(result.freeze))
    end
end, true)
```

## On the wire

The flag is `PlayerLifeFlags.Frozen` (`1 << 1`) on the canonical life state, beside `Ghosted`
(`1 << 0`). The life-state flags field has always been serialized and never validated, so defining
a bit is not a protocol change: a client that predates it decodes the value and ignores the bit,
which degrades to "no freeze" rather than a disconnect. Read it as
`Open77.players.getLifeState(playerId).frozen`.

## See also

- [Complete server Lua API](server-api.md) -- the `Open77.players.setFrozen` row and the
  permission summary.
- [Player health and stamina](player-stats.md) -- a frozen player still takes damage, and
  the fall-damage toggle that lives beside these body primitives.
