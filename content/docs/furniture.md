# Furniture: sit and lean

> **Experimental.** Names may still change. Most of the two-client test plan was proven live: see
> [Status](#status) for what was seen and what was not run. How seating fits with actions and jobs:
> [World interaction](world-interaction.md).

Night City is full of chairs, benches, bar stools, counters and walls that the game's own pedestrians
use. Open77 ships a catalogue of them (`open77_furniture`: about 38,000 pieces of furniture, each with
the poses the game authored on it) and a resource that lets players use them (`open77_seating`):

- a player walking up to a table sees at most three "Sit on the chair" / "Lean on the wall" prompts,
  only for seats within 3 m, only for seats nobody (player or pedestrian) is using;
- **E** sits, **X** stands up (rebindable in Settings, Key bindings); `/sit` takes the nearest free
  seat, `/stand` gets up;
- the server decides everything: distance, bucket, whether the player is alive, in a car or fighting,
  who already sits there.

Only seats whose pose was **measured** seating a player on two clients are offered by default (about
16,000 pieces of furniture: the common plastic chairs, benches with chair poses, bar stools, bar
seats, some wall and counter leans). Beds stay off until lying down is proven.

## Turn it on

Add the resources to your server's `resources.load` (they are opt-in, `auto_start false`), then start
them with `ensure`, dependencies first. A `resources.load` entry alone does not start an opt-in
resource:

```text
open77_furniture, open77_actions, open77_interactions, open77_seating
```

`open77_furniture` must be in that list even though nothing declares it as a dependency. The
catalogue is server-only, and `open77_seating` ships a client script: a client refuses to activate a
resource whose manifest names a server-only dependency (`missing_dependency:open77_furniture`). So
seating reaches the catalogue through its exports and answers `furniture_unavailable` until
`open77_furniture` runs.

`open77_pedestrians`, when it runs, keeps its NPCs off the seats players use and refuses a seat an NPC
sits on. Without it, seating works the same; there is simply no NPC to coordinate with.

| Convar | Default | Meaning |
|---|---|---|
| `open77_seating_verification` | `measured` | `unverified` or `all` also offers the seats of untested furniture families |
| `open77_seating_exit` | `approach` | after standing up, put the body back where it walked in from (`approach`), only when it ended somewhere odd (`check`), or never (`none`) |
| `open77_seating_buckets` | `all` | routing buckets where players can sit, a comma list |

## Use it from your resource

Seat a player on a known piece of furniture (an RP bar's stools, a waiting room's bench):

```lua
-- server
local seat, why = exports.open77_seating:sit(playerId, "9160494166749203069")
if not seat then print("cannot sit: " .. why) end      -- e.g. seat_taken, too_far, npc_occupied

exports.open77_seating:stand(playerId)
local where = exports.open77_seating:current(playerId)   -- nil when standing
```

Find furniture near a point with the catalogue (no world query, a few tens of microseconds):

```lua
local stools = exports.open77_furniture:nearby(barCounter, 6, { kind = "barstool", playable = true, limit = 8 })
for _, stool in ipairs(stools or {}) do
    print(stool.id, stool.pose.profile, stool.pose.arrivalRadius)
end
```

Follow what happens:

```lua
AddEventHandler("open77_seating:seated", function(e)
    -- e.playerId, e.furnitureId, e.kind, e.posture ("sit" | "lean"), e.bucket
end)
AddEventHandler("open77_seating:stood", function(e)
    -- e.playerId, e.furnitureId, e.reason ("stood", "dead", "disconnected", "combat", "moved", ...)
end)
```

`exports.open77_seating:occupants(bucket, furnitureId)` lists who sits on a piece of furniture.
`sitNearest(playerId)` picks the nearest free seat for you.

### Keep players off furniture your job uses

Seating claims every occupied piece of furniture in the claims service of
[`open77_actions`](actions.md#shared-spots-without-an-action), under the key
`furniture:<catalogue version>:<furniture id>`, per routing bucket. A resource that claims the same
key keeps players from sitting there (they are told the seat is in use):

```lua
local version = exports.open77_furniture:status().version
local token = exports.open77_actions:claim(bucket, "furniture:" .. version .. ":" .. tableId, 60000)
-- ... clean the table ...
exports.open77_actions:releaseClaim(token)
```

## What a player experiences

1. Looking at the seat's card ("Sit on the stool") and pressing **E**: the body is placed beside the
   furniture (behind a chair or a stool, in front of a wall), then the sitting posture carries it onto
   the seat. Workspot postures switch to third person while they play and give the view back when
   they end.
2. While seated nothing else holds the player's controls; drawing a weapon, getting killed, entering a
   car or changing bucket stands them up.
3. Pressing **X**: the posture stops and, if the body did not end up on a clear spot, it is put back
   where it walked in from.
4. A player moved away while seated (a Warden teleport, a vehicle) is never pulled back: when the body
   ends more than 4 m from the seat, the exit leaves it where it is.

Each furniture family has its own arrival radius, the distance at which the body counts as arrived on
the seat: 0.5 m for chairs, benches and leans, 0.75 m for bar seats, 1.0 m for bar stools, whose
counter stops the body short. The catalogue carries it in `pose.arrivalRadius`.

## Status

Proven live on two clients, with a male and a female character:

- **NPC occupancy.** With `open77_pedestrians` and its crowd on, every food-court seat reported an NPC
  seated on it, and `sit` answered `npc_occupied`.
- **One winner per seat.** The first player sat on a measured bar stool; the second, sent to the same
  stool, got `seat_taken`, then sat on the next stool. Both bodies sat on their stools at the counter,
  each claim held by `open77_seating`.
- **Two on one bench.** Both players on a 1.33 m bench: two spots 1.34 m apart, one claim shared by
  both, no overlap.
- **Keys.** Looking at the stool's card and holding **E** seated the player; **X** stood them up, and
  the natural exit was already clear, so the body was not moved.
- **Lean.** A wall lean against vending machines, with the exit in front of them.
- **Teleport.** A Warden teleport of a seated player ended the posture, and the exit left the body
  where it landed, more than 8 m from the stool.

Ten catalogue ids were also played one by one with `playAt`: nine seat or lean correctly with their
family's arrival radius; beds are refused.

Not yet run live through `open77_seating`: panicking pedestrians leaving and returning to seats, an
approach blocked by a body or a prop, lying on a bed, and bar seats (seated by `playAt` alone, not
yet through this resource).

## Limits

- Only measured furniture families are offered by default; the rest of the catalogue is anchor data
  (`runtimeValidated = false`) until it is qualified on two clients.
- Beds, couches, ledges, stairs and rails have no player posture yet, or are refused. Beds stay refused
  until an approach point for lying down is measured.
- The game's own (vanilla) crowd is not coordinated: servers that run Open77's pedestrians suppress
  it.
- Players reach seats within 3 m; the approach point beside a seat is computed from the furniture kind
  and refused when the body cannot stand there.
- Reasons a request can be refused include `seat_taken`, `target_claimed`, `npc_occupied`, `too_far`,
  `no_playable_pose`, `already_seated`, `actor_busy`, `in_combat`, `player_in_vehicle`,
  `player_not_alive`, `approach_blocked` and `furniture_unavailable`.
