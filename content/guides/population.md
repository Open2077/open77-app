# World population: pedestrians and traffic

Fill Night City around your players with server-owned civilians and cars, seen identically by
every player, and tune how many there are for your server and its hardware. The population comes
from three system resources:

| Resource | What it adds | Default |
| --- | --- | --- |
| `open77_pedestrians`, seated part | People sitting, leaning, praying or working at the game's own community spots. | On |
| `open77_pedestrians`, walking crowd | Civilians walking the game's pedestrian lanes, stopping at lights, sitting on benches, fleeing gunfire. | On |
| `open77_traffic` | Ambient cars driving the game's roads. | Off until enabled |

Everything is set by the server operator in `server.jsonc` (convars and tunables) and from the
console; resources do not need to change. For NPCs your own resources create, see
[NPC spawning](/docs/npcs).

## How the population is built

### Seated pedestrians

The seated part uses the game's own community workspots: about 40,000 spots and 15,000
community entries, Phantom Liberty included. It keeps only peaceful civilians and vendors, and
leaves out quest characters, police, gangs, children and scripted scenes. Around every ready,
living player:

- a spot is filled when it comes within 120 m;
- clients stream the NPC from 140 m;
- it retires past 150 m;
- at most `open77_pedestrians_max_near_player` stand within one player's 140 m, and
  `open77_pedestrians_max_active` on the whole server.

### Walking crowd

The walking crowd follows the game's own crowd rules. Each lane fragment of the city says how
many people the game keeps on it and which civilians they are, for each period of the day:
Morning from 06:00, Day from 10:00, Evening from 18:00 and Night from 22:00, on the bucket's own
clock (see [Time and weather](/docs/weather)). Suits walk Corpo Plaza, Creoles walk Pacifica, and
the streets fill up at rush hour and empty at night.

Around each living player, the crowd targets the game's count for the fragments within 65 m,
multiplied by `open77_pedestrians_crowd_density` and capped by
`open77_pedestrians_crowd_max_near_player`. New walkers appear 22–65 m away, preferably behind a
moving player rather than in view. Walkers that stroll past 65 m of every player are recycled
when the area is over its target.

Each walker is driven by the game's native pedestrian AI on one nearby client, elected and
balanced between the clients around it; the other clients replay its motion. It dodges cars,
waits at red lights, takes calls, and sits at crowd workspots, which every client replays.

### Zone clusters

Players within 100 m of each other (chained, per bucket) form one **zone cluster** and share one
crowd. Fifty players in one market get a crowd sized for the market, not fifty crowds on the same
streets.

- **Target**: the game's count for the fragments around any of the cluster's players, each
  counted once, times the density factor.
- **Cap**: `crowd_max_near_player` for the first player, plus 40 × √(n − 1) for n players,
  and never more than `open77_pedestrians_crowd_max_cluster`.
- **Global share**: when the clusters' targets add up to more than
  `open77_pedestrians_crowd_max_active`, each cluster gets a share in proportion to its target.

The seated part shares its global cap the same way: while there is room any group takes what it
can reach, and only under contention are groups brought back to their share.

### Reactions

Shots, deaths, gunfire within 30 m and a weapon drawn within 6 m make pedestrians flee. Seated
pedestrians run, cower for about a minute and walk back to their spot; walkers use the game's
own crowd fear. Pedestrians can be made immortal and calm (see [Profiles](#profiles)).

### Traffic

`open77_traffic` fills a 250 m area around each player with the authored density of its roads,
up to 60 cars per area and 20,000 on the server. Cars are driven by the game's vehicle AI on a
client and retire 250 m from every player. Drivers can be killed and cars stolen unless the
operator turns that off. See [Autonomous vehicles & AI](/docs/vehicle-ai).

## Pedestrian settings

Set these in the `convars` section of `server.jsonc`. Convars are read when the resource starts;
restart it (or the server) after a change, or use the [runtime commands](#runtime-commands).
Values are strings.

### Seated pedestrians

| Convar | Default | Range | Effect |
| --- | --- | --- | --- |
| `open77_pedestrians_enabled` | `"true"` | | Spawn seated pedestrians. Off retires the existing ones. |
| `open77_pedestrians_max_active` | `"8000"` | 0–30000 | Seated pedestrians on the whole server. |
| `open77_pedestrians_max_near_player` | `"256"` | 0–256 | Seated pedestrians within one player's 140 m. |
| `open77_pedestrians_buckets` | `"0"` | | Routing buckets that get a population, comma-separated (`"0,5"`). |

### Walking crowd

| Convar | Default | Range | Effect |
| --- | --- | --- | --- |
| `open77_pedestrians_crowd_enabled` | `"true"` | | Run the walking crowd. |
| `open77_pedestrians_crowd_density` | `"8"` | 0–10 | Multiplier on the game's own crowd count. `1` is the raw game figure, which reads sparse; `8` looks like the single-player game. `0` empties the streets. |
| `open77_pedestrians_crowd_max_near_player` | `"200"` | 0–256 | Walkers within 65 m of one player. |
| `open77_pedestrians_crowd_max_cluster` | `"600"` | 0–4000 | Walkers one zone cluster holds, however many players stand in it. |
| `open77_pedestrians_crowd_max_active` | `"16000"` | 0–30000 | Walkers on the whole server. |
| `open77_pedestrians_lane_classes` | `"1,10"` | | Lane classes walkers may use: `1` wide sidewalks, `10` narrow paths. |

### Reactions

| Convar | Default | Effect |
| --- | --- | --- |
| `open77_pedestrians_mortal` | `"true"` | Shots and cars can kill pedestrians. `false`: shots do no damage and cars only knock walkers down. |
| `open77_pedestrians_panic` | `"true"` | Hits and deaths make the victim and its neighbours flee. |
| `open77_pedestrians_gunfire_panic` | `"true"` | Gunfire that hits nobody scares pedestrians within 30 m. |
| `open77_pedestrians_brandish_panic` | `"true"` | Walkers run from a player holding a drawn weapon within 6 m. |

## Traffic settings

Enable traffic with a convar and load the resource:

```jsonc
"convars": { "open77_traffic_enabled": "true" }
```

Traffic settings are **tunables**: change them from the in-game operator panel, the Warden
settings form or the console (`tunable.set open77_traffic <key> <value>`). A change applies on the
next spawn pass and persists across restarts.

| Tunable | Default | Range | Effect |
| --- | --- | --- | --- |
| `enabled` | `false` | | Spawn and drive traffic. |
| `densityScale` | `1` | 0–10 | Multiplier on the roads' authored density. |
| `maxCarsPerArea` | `60` | 1–1000 | Cars in one player's area before spawning stops there. |
| `playerAreaRadius` | `250` m | 50–350 | Radius of each player's area. |
| `carsGlobal` | `20000` | 0–20000 | Cars on the whole server. |
| `densityFloor`, `densityFloorDriving` | `0` | 0–1 | Lowest density a road gets with the player on foot / driving. |
| `retireDistance` | `250` m | 100–425 | Cars retire after 10 s this far from every player. |
| `driversKillable` | `true` | | Players can kill drivers. |
| `carsStealable` | `true` | | Players can take the cars. |

The full list, including spawn distances, timeouts and driver damage, is in the resource's
README.

## Server limits

The population is bounded by the server's NPC limits and its network settings, in
`server.jsonc`:

| Key | Default | Effect |
| --- | --- | --- |
| `simulation.maximumNpcs` | `32768` | NPCs on the server in all, corpses included. |
| `simulation.maximumNpcsPerResource` | `32768` | NPCs one resource may own. Seated and walking pedestrians belong to the same resource: keep `max_active` + `crowd_max_active` within it, or raise it. |
| `replication.npcMotionBatching` | `true` | NPC motion sent as one batch per player per tick, at full rate within 30 m, every 200 ms to 80 m and every 500 ms beyond. |
| `replication.npcMotionUpload` | `true` | Clients that drive NPCs send their motion in batches. |
| `replication.playerScope` | `true` | A player only receives other players within 424 m (leaving at 500 m), which keeps bandwidth flat as the server fills. |

`open77_pedestrians` declares a 256 MB Lua memory quota in its manifest for large crowds; keep it
if you copy or fork the resource.

## Profiles

Copy one profile into the `convars` section of `server.jsonc` and restart the server. Your
hardware and how your players spread over the map decide what a profile costs: start from the
default and change one setting at a time while watching the server tick in Warden or the metrics
endpoint.

### Off

No pedestrians and no traffic: arenas, minigames, indoor servers.

```jsonc
"convars": {
  "open77_pedestrians_enabled": "false",
  "open77_pedestrians_crowd_enabled": "false",
  "open77_traffic_enabled": "false"
}
```

Unloading `open77_pedestrians` and `open77_traffic` from `resources.load` has the same effect.

### Light

A thinner city for small machines, or for servers where many players spread over the map.

```jsonc
"convars": {
  "open77_pedestrians_crowd_density": "4",
  "open77_pedestrians_crowd_max_near_player": "100",
  "open77_pedestrians_crowd_max_cluster": "300",
  "open77_pedestrians_crowd_max_active": "6000",
  "open77_pedestrians_max_near_player": "128",
  "open77_pedestrians_max_active": "4000",
  "open77_traffic_enabled": "true"
}
```

With traffic, also lower `densityScale` to `0.5` and `maxCarsPerArea` to `30` from the panel or
the console.

### Default

The single-player look. These are the built-in values; no convar is needed except to enable
traffic.

```jsonc
"convars": {
  "open77_pedestrians_crowd_density": "8",
  "open77_pedestrians_crowd_max_near_player": "200",
  "open77_pedestrians_crowd_max_cluster": "600",
  "open77_pedestrians_crowd_max_active": "16000",
  "open77_pedestrians_max_near_player": "256",
  "open77_pedestrians_max_active": "8000",
  "open77_traffic_enabled": "true"
}
```

### High population

The densest streets the system allows, for busy roleplay servers on capable hardware.

```jsonc
"convars": {
  "open77_pedestrians_crowd_density": "10",
  "open77_pedestrians_crowd_max_near_player": "256",
  "open77_pedestrians_crowd_max_active": "20000",
  "open77_pedestrians_max_active": "15000",
  "open77_traffic_enabled": "true"
}
```

Reference capacity: with 300 players spread over the city's 150 busiest places, this profile
holds about 25,000 server entities (11,500 walkers, 13,200 seated, 300 players) at a mean server
tick of 8.7 ms, 30 ticks per second. Its two ceilings add up to 35,000, above the default
`simulation.maximumNpcsPerResource` of 32,768: raise that to `40000` if both kinds can fill on
your server. Around its player, each client still holds at most 256 walkers within 65 m (and 1.5
times that within its 140 m streaming radius) and 256 seated pedestrians.

### Calm city

Pedestrians that never die or flee, for roleplay scenes and events. Combine with any profile
above.

```jsonc
"convars": {
  "open77_pedestrians_mortal": "false",
  "open77_pedestrians_panic": "false",
  "open77_pedestrians_gunfire_panic": "false",
  "open77_pedestrians_brandish_panic": "false"
}
```

For traffic, set the `driversKillable` and `carsStealable` tunables to `false`.

## Runtime commands

From the server console, or for an identity holding the matching ACL grant
(`command.pedestrians.status`, `command.pedestrians.density`, ...). Runtime changes last until
the resource restarts; convars set the starting values.

| Command | Effect |
| --- | --- |
| `pedestrians.status` | Live counts per bucket (walking, seated, panicking, dead), zone groups and shares, density, the current period, each player's target, and failure counts. |
| `pedestrians.density <0..10>` | Changes the crowd density factor at once. |
| `pedestrians.crowd on\|off` | Starts or removes the walking crowd. |
| `pedestrians.enable on\|off` | Starts or stops the seated pedestrians. |
| `pedestrians.mortal on\|off` | Whether pedestrians can die, applied to living ones at once. |
| `pedestrians.panic on\|off` | Whether hits and deaths make pedestrians flee. |
| `pedestrians.reset` | Removes every pedestrian and clears cooldowns; they repopulate from the next scan. |
| `pedestrians.seats` | Seats currently held by players, which pedestrians avoid. |
| `traffic.status` | Active cars, limits and budget. |
| `tunable.set open77_traffic <key> <value>` | Changes a traffic tunable; it persists. |

## Tuning advice

- **Density first.** `crowd_density` changes how full the streets look without changing the
  ceilings; the caps only matter where many players gather.
- **Busy hubs.** If one market or club holds most players, `crowd_max_cluster` decides how
  dense it gets; the other zones are unaffected.
- **Many small groups.** If players spread out, the global ceilings (`crowd_max_active`,
  `max_active`) and the server tick are what to watch; lower `crowd_max_near_player` before the
  global caps.
- **Client performance.** Players with weaker PCs are helped most by lower
  `crowd_max_near_player` and `max_near_player`: those are what one client draws.
- **Check the effect.** `pedestrians.status` shows the targets and live counts; Warden and the
  metrics endpoint show the server tick and the per-resource scheduler time.
