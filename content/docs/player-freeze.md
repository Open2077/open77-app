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

## On the wire

The flag is `PlayerLifeFlags.Frozen` (`1 << 1`) on the canonical life state, beside `Ghosted`
(`1 << 0`). The life-state flags field has always been serialized and never validated, so defining
a bit is not a protocol change: a client that predates it decodes the value and ignores the bit,
which degrades to "no freeze" rather than a disconnect. Read it as
`Open77.players.getLifeState(playerId).frozen`.

## See also

- [Complete server Lua API](server-api.md) -- the `Open77.players.setFrozen` row and the
  permission summary.
- [Player health and stamina](player-stats.md) -- a frozen player still takes damage.
