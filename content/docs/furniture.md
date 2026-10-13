# Furniture: sitting and leaning

Let players sit together at a café, use stools in a bar or wait on a bench. With seating enabled,
supported furniture gets a nearby prompt: **E** to sit, lean or lie down, **X** to stand up. A seat
already used by another player is unavailable.

You can enable this without writing Lua or installing a job, inventory or economy. Two resources
provide it: `open77_furniture` holds a catalogue of city furniture locations and poses;
`open77_seating` adds prompts, player placement and occupancy rules. When `open77_pedestrians`
is running, it also coordinates seats used by those NPCs.

The catalogue includes about 38,000 furniture entries, but only supported playable poses are
offered. This is not automatic support for every visible chair, spawned prop or custom interior.
Use the coverage section below and check the furniture at your venue.

To connect seating to a café or another job, see [Jobs and world interaction](world-interaction.md).

Source: [`open77_furniture`](https://github.com/Open2077/open77-resources/tree/next/system/open77_furniture), [`open77_seating`](https://github.com/Open2077/open77-resources/tree/next/system/open77_seating).

## Enable seating

Add the resources to `resources.load` ([selecting resources](server-resources.md)), then start them
from the server console, in this order:

```text
# server.jsonc
resources.load: [ ..., "open77_animations", "open77_props", "open77_interactions", "open77_uikit",
                  "open77_actions", "open77_furniture", "open77_seating" ]

# server console
ensure open77_furniture
ensure open77_actions
ensure open77_seating
```

- These three do not start on their own (`auto_start false`). A name missing from `resources.load`
  is never started, and nothing is logged. Without `open77_furniture`, every request is refused.
- If your server runs the crowd ([`open77_pedestrians`](https://github.com/Open2077/open77-resources/tree/main/system/open77_pedestrians)), seating uses it on its own: a seat a
  pedestrian uses gets no prompt, and no pedestrian walks onto a seat a player uses.

Players can now sit with the prompts, with `/sit` (the nearest free seat within 3 m) and `/stand`.

## What the player sees

1. Up to three free seats within 3 m show a prompt, nearest first. A seat in use shows none.
2. **E**: the body is placed beside the seat (behind a chair, in front of a wall), then sits down.
   The camera switches to third person, and a banner says "Press X to stand up".
3. **X** or `/stand`: the player stands, and is put back where they stood before sitting if the body
   ended somewhere odd. X can be rebound in Settings, Key bindings ("Stand up from a seat").
4. Drawing a weapon, dying, getting into a car or changing routing bucket also stands the player up,
   and the banner says why ("You stood up: combat"). A player teleported away is never pulled back.

## Which seats are offered

| Furniture | Prompt | The body starts from | Offered by default |
|---|---|---|---|
| Chairs, lean-back chairs, benches with chair poses | Sit on the chair | 1.2 m behind the seat | about 14,500 |
| Bar stools | Sit on the stool | 1.2 m behind the stool | about 1,600 |
| Bar seats | Sit on the bar seat | where the player stands | 18 |
| Walls | Lean on the wall | 1 m in front of the wall | about 50 |
| Counters | Lean on the counter | 1 m back from the counter | about 30 |
| Beds | Lie down on the bed | where the player stands | 4 |

By default, seating offers entries from supported player-pose families: about 16,000 pieces of
furniture. This does not mean every individual location has a clear approach and exit; check
the seats you want to use. Set `open77_seating_verification` to `all` to offer about 5,600 more, mostly wall
leans and chairs, at the risk of a player clipping into the furniture. If the spot beside a seat is
blocked by a step or a wall, the player is told "Something is in the way." and put back.

A bench row seats several players side by side, at least 0.6 m apart. Couches, armchairs, ledges,
steps, curbs, rails and tables have no player pose and are never offered.

**Beds.** One double-bed family (four beds in the city) has a lying pose verified for players. Its
beds get a "Lie down on the bed" prompt and `/sit` takes them; the player lies down from where they
stand, and a bed holds one player. Other bed families stay unverified until they are checked.

## Sit a player from your own resource

Seat a player on furniture you chose: the interrogation chair of your police station, a stool in
your bar. Get its id with the `furniture.near` console command, then:

```lua
-- server
local CHAIR = "9160494166749203069"   -- a furniture id, from furniture.near

RegisterCommand("interrogate", function(source, args)
    -- check here that `source` is a police officer
    local seat, why = exports.open77_seating:sit(tonumber(args[1]), CHAIR)
    if not seat then Open77.chat.send(source, "Cannot seat the suspect: " .. why) end
end)

AddEventHandler("open77_seating:seated", function(e)
    if e.furnitureId == CHAIR then Open77.chat.send(e.playerId, "The detective is on his way.") end
end)
```

- The player must already be within 3 m of the seat: `sit` never brings a player across the room.
- `sit` answers at once. The player is seated a moment later, when `open77_seating:seated` fires; if
  they cannot get there, `open77_seating:stood` fires instead, with the reason.
- `sitNearest(playerId)` picks the nearest free seat for you, like `/sit`.

## Keep players off seats during a job

Seating shares the one-winner claims of [`open77_actions`](actions.md). A seated player holds the key
`furniture:<catalogue version>:<furniture id>` in their routing bucket. Claim the same key and no
player can sit there: they are told "This seat is in use."

```lua
-- server: close the bar stools while the bartender cleans the counter
local counter, bucket = { x = 0.0, y = 0.0, z = 0.0 }, 0   -- your counter and its routing bucket
local version = exports.open77_furniture:status().version
local stools = exports.open77_furniture:nearby(counter, 6, { kind = "barstool", playable = true, limit = 8 })
local tokens = {}
for _, stool in ipairs(stools or {}) do
    local token = exports.open77_actions:claim(bucket, "furniture:" .. version .. ":" .. stool.id, 60000)
    if token then tokens[#tokens + 1] = token end   -- nil, "target_claimed" while someone sits there
end
-- ... the cleaning job, then:
for _, token in ipairs(tokens) do exports.open77_actions:releaseClaim(token) end
```

A claim lasts its time to live (60 s here, one hour at most): call `renewClaim(token, ttlMs)` for a
longer job. A claim never stands up a player already seated, so claim before the job starts. Your
claims are released when your resource stops.

## Reference

### Settings

Set these in the `convars` block of `server.jsonc`; `open77_seating` reads them when it starts.

| Convar | Default | Meaning |
|---|---|---|
| `open77_seating_verification` | `measured` | `measured`: verified seats only. `all`: every seat with a player pose. `unverified`: only the seats that are not verified |
| `open77_seating_postures` | `all` | the postures prompts, `/sit` and the exports offer: a comma list of `sit`, `lean` and `lie`. `sit,lean` turns the bed prompts off |
| `open77_seating_exit` | `approach` | after standing up, put the body back where it stood before sitting (`approach`), only when it ended somewhere odd (`check`), or never (`none`) |
| `open77_seating_buckets` | `all` | routing buckets where players can sit, a comma list such as `0,3` |
| `open77_seating_trace` | `0` | `1` prints every sit, seat and stand in the server log |

### Exports

| Server export | Answers |
|---|---|
| `open77_seating:sit(playerId, furnitureId, options?)` | the seat, or `nil, reason`. `options`: `spot` (one place on a bench row), `approach` (`back`, `front`, `left`, `right`, `player`, `none`), `exit` (`approach`, `check`, `none`) |
| `open77_seating:sitNearest(playerId, options?)` | the nearest free seat within 3 m, or `nil, reason` |
| `open77_seating:stand(playerId)` | `true`, or `nil, "not_seated"` |
| `open77_seating:current(playerId)` | the player's seat, or `nil` when standing |
| `open77_seating:occupants(bucket, furnitureId)` | the ids of the players sitting on that furniture |
| `open77_furniture:nearby(position, radius?, filter?)` | furniture within `radius` m (10 by default, 50 at most), nearest first, read from memory without a world query; or `nil, reason`. `filter`: `kind`, `posture`, `verification`, `playable`, `vertical`, `limit` (5 by default, 32 at most), `poses` |
| `open77_furniture:get(id)` | one piece of furniture with all its poses (`poseList`), or `nil, "unknown_furniture"` |
| `open77_furniture:status()` | `indexed`, `version`, `furniture`, `spots` |

A seat has `playerId`, `furnitureId`, `spot`, `kind`, `posture`, `profile`, `state` (`approaching`,
then `seated`), `bucket` and `anchor`. A piece of furniture has `id`, `kind`, `posture`, `distance`,
`x`, `y`, `z`, `yaw` and its best `pose` (`profile`, `verification`, `arrivalRadius`: 0.5 m for
chairs and leans, 0.75 m for bar seats, 1 m for bar stools and the bed). Catalogue lookups answer
`nil, "indexing"` for the first seconds after it starts.

### Events

| Event | Fields |
|---|---|
| `open77_seating:seated` | `playerId`, `furnitureId`, `spot`, `kind`, `posture` (`sit`, `lean`, or `lie` on a bed), `profile`, `bucket`, `playbackId` |
| `open77_seating:stood` | `playerId`, `furnitureId`, `spot`, `bucket`, `reason` |

`reason` is `stood` (X, `/stand` or your `stand` call), `cancelled_by_player`, `moved`, `dead`,
`disconnected`, `vehicle`, `combat`, `bucket_changed`, `claim_lost`, `furniture_changed`,
`resource_stopping`, `anchor_unreached` or `animation_interrupted`. When the player never sat down:
`approach_blocked`, `approach_failed`, `approach_timeout`, `animation_refused` or `actor_busy`.

### What the player is told

| Reason | Banner |
|---|---|
| `seat_taken`, `npc_occupied` | Someone is already sitting there. |
| `target_claimed` | This seat is in use. |
| `too_far` | Too far away. |
| `already_seated` | You are already seated. |
| `not_seated` | You are not seated. |
| `actor_busy` | Finish what you are doing first. |
| `in_combat` | Not while fighting. |
| `player_in_vehicle` | Not from a vehicle. |
| `no_playable_pose` | There is no free seat here. |
| `approach_blocked` | Something is in the way. |
| `approach_failed` | You cannot get there. |
| `indexing` | Seats are not ready yet. |

Any other reason shows as "Refused: " followed by the reason, such as `furniture_unavailable`,
`player_not_alive` or `bucket_not_enabled`. Your own `sit` calls return the reason to you; only a
failure after the request was accepted, such as `approach_blocked`, reaches the player's screen.

### Console commands

Restricted commands; the server console can always run them.

| Command | Does |
|---|---|
| `furniture.near <playerId> [count] [radius] [kind]` | lists the furniture nearest a player, with ids |
| `seating.near <playerId> [count] [radius]` | lists the seats nearest a player and who holds each |
| `seating.status`, `seating.claims` | the catalogue version and settings; every seated player and claim |
| `seating.sit <playerId> <furnitureId>` | seats a player within 4.5 m, skipping the verified-only and sit-or-lean filters (beds work); occupancy still applies |
| `seating.stand <playerId>` | stands a player up |
| `seating.verification <value>`, `seating.exit <value>` | changes that setting until the next restart |

## Operator notes

- **List `open77_furniture` next to `open77_seating`.** The catalogue runs on the server only, and a
  client refuses a resource that depends on a server-only one, so seating does not name it as a
  dependency: it calls its exports and answers `furniture_unavailable` while it is not running.
- **Restarting `open77_seating`** stands every seated player up where they are and removes the
  prompts. `ensure open77_actions` restarts seating too, since seating depends on it.
- **Restarting `open77_furniture`** leaves seated players seated. New requests are refused until the
  catalogue is indexed again. If a new catalogue no longer has a seat, the player on it stands up.
- **The game's own crowd is not coordinated.** Servers that run `open77_pedestrians` suppress it.
