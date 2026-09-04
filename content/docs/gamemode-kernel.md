# The gamemode kernel (and why it is not a resource)

Early planning for the template system
([`docs/gamemode-pursuit-plan.md`](../docs/gamemode-pursuit-plan.md) section
4.2b) called for a third shared resource, `open77_gamemode`: a kernel
owning "roster and disconnect handling, the lobby bucket, the queue, bucket
allocation and release, the countdown, the state machine with guarded
transitions, the scoreboard, and the return transaction" -- callable the
same way `open77_zones` and `open77_worldui` are.

**It was never built, and Phase F's conclusion is that it should not be.**
This page documents why, and what a gamemode's server actually gets
instead, because "does `open77_gamemode` exist" is exactly the question the
other two pages in this trio would otherwise leave unanswered.

## Why a server-side kernel resource cannot exist

Open77's server Lua runtime installs no `exports` and no cross-resource
event bus. `TriggerEvent` is per-VM; only the host fans events into
resources, and there is no `GetInvokingResource()`-style call boundary on
the server the way there is on the client. A second server resource could
not be asked for anything -- not "define a state machine," not "allocate a
bucket," nothing. This was discovered building Pursuit and is recorded in
[`docs/gamemode-pursuit-plan.md`](../docs/gamemode-pursuit-plan.md) section
7b, and it is why **a gamemode's entire server side is one resource**:
`resources/gamemodes/pursuit/server/*.lua` and `resources/gamemodes/race/server/main.lua` each
share one Lua state across their own files and reach each other through a
plain global (`Pursuit`, in Pursuit's case), never through anything that
could be called from outside.

Compare this with `open77_zones` and `open77_worldui`, which genuinely are
shared services: both are **client-only**, and the client runtime *does*
have `exports` and `GetInvokingResource()`. That asymmetry is the whole
reason two of the three planned shared resources exist and the third does
not -- it is a platform fact, not an oversight to be fixed later.

## What ships instead: the scaffolder

Since the kernel cannot be a resource another resource calls, Open77's
answer is code generation: `scripts/new-resource.ps1 -Kind gamemode` emits
a correct-by-construction starting point directly into the new resource --
a guarded state machine, roster tracking with the reload-safe adoption
pattern below, and a `<name>.status` command. Both `resources/gamemodes/pursuit` and
`resources/gamemodes/race` began this way and then diverged, because that is what a
generated starting point is for.

This is documented explicitly as the sharing mechanism in
[writing a gamemode](../docs/writing-a-gamemode.md) section 7: *"On the
server, code generation is the sharing mechanism -- since server resources
cannot link to each other at runtime, the scaffolder is how a common
pattern reaches your resource."*

## The contract every gamemode's server should implement

Not an API to call -- a set of conventions to copy, proven across two
gamemodes now. Each one is documented in full, with the failure it was
measured against, in
[writing a gamemode](../docs/writing-a-gamemode.md) section 2; this is the
short version, with the two working examples.

| Convention | Why | Where it lives |
|---|---|---|
| **Lazy roster adoption.** No `Open77.players` enumeration exists, and a reload empties the roster while the server is still full. Repopulate a player's record from the *next* event they produce, at every entry point that carries a player ID. | A reload must not lose track of connected players. | `ensurePlayer` in `resources/gamemodes/pursuit/server/main.lua` and `resources/gamemodes/race/server/main.lua` |
| **`tonumber` every player ID.** IDs arrive from net events and lifecycle handlers as strings. | A raw string key silently diverges from the numeric IDs used everywhere else. | Every `AddEventHandler("onPlayer...", ...)` in both resources |
| **Guarded state transitions, one function.** A single `transition(playerId, target, detail)` that checks an explicit table of allowed edges and logs a refusal instead of corrupting state. | An invalid transition is more useful as a log line than as silent corruption. | `transition` in both resources |
| **Move players only through kill -> respawn.** Never a raw transform write; the transaction carries the fade and the streaming preload a direct teleport skips. | A direct teleport over distance drops the player into unstreamed world. Every placement is therefore a death, which its own life-state checks must account for. | `placeAt` in both resources |
| **Re-derive every client-reported condition on the server.** A zone `enter` event, a checkpoint claim, a queue intent -- all are hints. Re-check them against `Open77.players.position` with a few metres of grace before granting anything. | The client is never the authority (writing a gamemode, section 4). | `containsPlayer` (Pursuit) / `checkpointReached` (Race) |
| **Never judge a single position sample.** Every rule is "held continuously for N seconds," evaluated on a fixed tick; an unreadable position freezes an accumulator, never resets it. | `Open77.players.position` is a replicated snapshot, not a live read (writing a gamemode, section 2.5). | Pursuit's win-condition tick; Race's per-second heat-state check |
| **One `<mode>.where`-style diagnostic, early.** Print exactly what the server sees for one player -- position, bucket, the rule's own verdict and reason. | Nearly every confusing failure in this project was answered in one line by such a command (writing a gamemode, section 6). | `pursuit.where`, `race.where` |
| **Isolate a round in its own routing bucket.** Allocate from a reserved range, disable ambient population, release on resolution. | Two rounds must never see each other, and neither should inherit the lobby's crowd. | Pursuit's per-match bucket pool; Race's single heat bucket |

## What this means for a new mode

Nothing shared needs editing to write a gamemode's server. Run the
scaffolder, then hand-build the state machine your mode actually needs
using the conventions above -- that is the whole kernel there is. The two
resources that *are* real shared services, and whose export surfaces you
call unmodified, are documented on their own pages:

- [Proximity zones](zones.md) (`open77_zones`)
- [World-anchored POIs](worldui.md) (`open77_worldui`)
