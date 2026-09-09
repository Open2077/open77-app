# The gamemode kernel and shared server services

Early planning for the template system
([`docs/gamemode-pursuit-plan.md`](../docs/gamemode-pursuit-plan.md) section
4.2b) called for a third shared resource, `open77_gamemode`: a kernel
owning "roster and disconnect handling, the lobby bucket, the queue, bucket
allocation and release, the countdown, the state machine with guarded
transitions, the scoreboard, and the return transaction" -- callable the
same way `open77_zones` and `open77_worldui` are.

**No universal `open77_gamemode` resource is shipped.** The original implementation
used generated code because server exports were unavailable. That runtime
limitation has now been removed: shared server services are supported, while
the existing gamemodes keep their current single-resource state machines.

## Shared server resources are supported

The server runtime now provides `exports(name, fn)`,
`Open77.exports.call(resource, name, ...):await()`, `GetInvokingResource()` and
generation identity. See [server exports](server-exports.md) for a runnable
two-resource example and the precise lifecycle contract.

A service can own scores, lobbies or a bucket allocator and accept explicit
requests from gamemodes. Each still owns its Lua state, permissions and handles.
Values cross by copy, and calls are deferred: this is not a shared global table
or a synchronous state-machine function call. Validate the immediate caller and
arguments; keep operations atomic before yielding where races would matter.

`TriggerEvent` remains local to a VM. The host still fans lifecycle/player events
into resources. Export registration does not create a network entry point.
Client services such as `open77_zones` and `open77_worldui` remain client-only
packages; adding server exports does not move their presentation logic to the server.

## The scaffolder remains useful

For local gameplay patterns, `scripts/new-resource.ps1 -Kind gamemode` emits
a correct-by-construction starting point directly into the new resource --
a guarded state machine, roster tracking with the reload-safe adoption
pattern below, and a `<name>.status` command. Both `resources/gamemodes/pursuit` and
`resources/gamemodes/race` began this way and then diverged, because that is what a
generated starting point is for.

Use generated code for tightly coupled state-machine rules, and server exports
for reusable services with a clear ownership boundary. See
[writing a gamemode](../docs/writing-a-gamemode.md) section 7. No forced migration
or new dependency is added to existing gamemodes by the runtime change.

## The contract every gamemode's server should implement

Not an API to call -- a set of conventions to copy, proven across two
gamemodes now. Each one is documented in full, with the failure it was
measured against, in
[writing a gamemode](../docs/writing-a-gamemode.md) section 2; this is the
short version, with the two working examples.

| Convention | Why | Where it lives |
|---|---|---|
| **Reload-safe roster adoption.** Use `Open77.players.all()` for the current roster and retain lazy `ensurePlayer` handling at player-event boundaries. | A reload must not lose track of connected players. | `ensurePlayer` in `resources/gamemodes/pursuit/server/main.lua` and `resources/gamemodes/race/server/main.lua` |
| **`tonumber` every player ID.** IDs arrive from net events and lifecycle handlers as strings. | A raw string key silently diverges from the numeric IDs used everywhere else. | Every `AddEventHandler("onPlayer...", ...)` in both resources |
| **Guarded state transitions, one function.** A single `transition(playerId, target, detail)` that checks an explicit table of allowed edges and logs a refusal instead of corrupting state. | An invalid transition is more useful as a log line than as silent corruption. | `transition` in both resources |
| **Move players only through kill -> respawn.** Never a raw transform write; the transaction carries the fade and the streaming preload a direct teleport skips. | A direct teleport over distance drops the player into unstreamed world. Every placement is therefore a death, which its own life-state checks must account for. | `placeAt` in both resources |
| **Re-derive every client-reported condition on the server.** A zone `enter` event, a checkpoint claim, a queue intent -- all are hints. Re-check them against `Open77.players.position` with a few metres of grace before granting anything. | The client is never the authority (writing a gamemode, section 4). | `containsPlayer` (Pursuit) / `checkpointReached` (Race) |
| **Never judge a single position sample.** Every rule is "held continuously for N seconds," evaluated on a fixed tick; an unreadable position freezes an accumulator, never resets it. | `Open77.players.position` is a replicated snapshot, not a live read (writing a gamemode, section 2.5). | Pursuit's win-condition tick; Race's per-second heat-state check |
| **One `<mode>.where`-style diagnostic, early.** Print exactly what the server sees for one player -- position, bucket, the rule's own verdict and reason. | Nearly every confusing failure in this project was answered in one line by such a command (writing a gamemode, section 6). | `pursuit.where`, `race.where` |
| **Isolate a round in its own routing bucket.** Allocate from a reserved range, disable ambient population, release on resolution. | Two rounds must never see each other, and neither should inherit the lobby's crowd. | Pursuit's per-match bucket pool; Race's single heat bucket |

## What this means for a new mode

Run the scaffolder and build the state machine your mode needs. Extract a
reusable service when its contract justifies a separate lifecycle; declare the
dependency for startup ordering and use generation-bound server exports to call
it. Keep player readiness and authority checks intact across the new boundary.
Existing shared client presentation services are documented separately:

- [Proximity zones](zones.md) (`open77_zones`)
- [World-anchored POIs](worldui.md) (`open77_worldui`)
