# Deathmatch — running the Kabuki Arena PvP mode

For the person who owns the server. What the mode is, how to start one, every
number you can change and what changing it does, and the handful of failures
that look like something else.

The mode is two resources: `open77_deathmatch` (authoritative) and
`open77_deathmatch_hud` (presentation). The template that installs them is
`templates/deathmatch`.

> **This page describes the mode as the rebuild on `feat/pvp-arena` defines it,
> and the rebuild is in progress.** Settings and behaviour below are declared;
> not all of them are wired yet. The resource README carries the phase-by-phase
> status, the plan is
> [`docs/gamemode-pvp-arena-plan.md`](../docs/gamemode-pvp-arena-plan.md), and the
> measurements the design rests on are in
> [`docs/research/pvp-arena-and-bots.md`](../docs/research/pvp-arena-and-bots.md).
> Where this page and `resources/open77_deathmatch/shared/config.lua` disagree,
> the config is right: it is what the server reads.

## What players get

Two formats with genuinely different lifecycles, which is why the mode does not
try to run them through one state machine.

| | Free-for-all | Arena (1v1 · 2v2 · 3v3) |
|---|---|---|
| Entry | Instant: hold **E** on the lobby ring and you are alive and armed inside a live instance. | Press **E**, pick a size, queue. Matched when the roster fills. |
| Waiting | **Never.** | The queue — the only wait in the mode, and the format demands it. |
| Instance | Persistent, auto-scaled, capacity 12. | Allocated per match, released on the result. |
| Death | Respawn after a delay, same round. | Eliminated for the round; spectate your team. |
| Round | Kill limit or timer, then standings, then the next round with the same players. | Team wiped or timer; round point, sides swapped. |
| Match | Never ends. | Best-of-*N*, then everyone returns to the lobby. |
| Loadout | One rotating weapon, identical for everyone. | A kit chosen in the buy window; both sides get the same list. |

**Free-for-all never queues.** The only refusal it can produce is
`instances_full`, and that means *every instance on this server is at capacity* —
a server-full condition, not matchmaking. If players see it, raise
`ffaCeiling` or accept that the box is full; there is no queue to lengthen.

**Joiners fill before they spread.** A player lands in the fullest instance that
still has room, and a new instance opens only when none does. A 2-of-12 instance
is a dead lobby, and two of them are worse than one busy one.

## Running one

### From the setup wizard

Start `Open77.Server` with no `server.jsonc` (or `--setup`) and pick the
**Open77 Deathmatch** template. It installs the resource set below and proposes
the tags `deathmatch`, `pvp`, `ffa`, `arena`, `english`.

`requiresDatabase` is `false`: the mode plays completely without persistence.
See [Persistence](#persistence-and-one-warning) before turning the bridge on.

### From the tracked dev profile

`server/server.deathmatch-local.jsonc` is a masterless loopback-only profile for
development and for the autonomous test loop:

```powershell
dotnet run --project src/Open77.Server -c Release -- --config server.deathmatch-local.jsonc
```

Then connect a client to `127.0.0.1:11798` with no master.

**Its ports are shifted by +20 — 11798 game, 11799 download, 11800 Warden — and
that is not tidiness.** A workstation running several stacks at once has already
claimed 11778/11779/11780, and two stacks on one port do not fail loudly: the
second bind loses, or a client resolves the default port and quietly attaches to
somebody else's server. You then debug your gamemode against a process that is
not running it. The download cache directory is separated for the same reason —
two servers publishing different resource sets through one cache surfaces as a
signature or chunk mismatch on a *client*, nowhere near the server that caused
it.

## The resource set

```
open77_shell   open77_pause   open77_watermark   open77_chat
open77_nameplates   open77_notifications   open77_death   open77_appearance
open77_weapons
open77_interactions   open77_worldui   open77_groundcircle   open77_zones
open77_voice   open-voice
open77_deathmatch   open77_deathmatch_hud
```

The four in the middle are the way into the mode, and each one is load-bearing:

| Resource | What breaks without it |
|---|---|
| [`open77_worldui`](worldui.md) | No station at all. It owns the ring, the prompt card and the action key. |
| [`open77_interactions`](interactions.md) | `open77_deathmatch` declares it as a hard dependency, so the gamemode is refused outright with `missing_dependency:open77_interactions`. Left out of a set that still lists `open77_worldui`, the failure is worse than a refusal: `open77_worldui` declares the same dependency, the server does not start the set partially and does not stop retrying, and it logs `Automatic resource start failed: Resource 'open77_interactions' was not found` **once a second, indefinitely** (measured 2026-08-31). If your log is scrolling one line per second, this is why. |
| [`open77_groundcircle`](../resources/open77_groundcircle/README.md) | The station works and is invisible. On 2.31 the native 3D interaction ring **does not draw at all**; the ground circle is the entire visual, and it follows real ground per vertex. |
| [`open77_zones`](zones.md) | No client-side boundary hysteresis. The server still re-derives every containment claim, so this is a smoothness loss rather than an authority one. |

Two more rules about the set:

- **`freeroam` must never be in it.** Both are gamemodes and both own spawn and
  death; `freeroam`'s `autoRespawn` answers every `kill → respawn` placement this
  mode issues, so players respawn at the freeroam spawn point mid-round. One
  server, one gamemode — the resource list is how that is expressed.
- **`open77_npcs` is not required for bots.** It is the reference resource for
  the [NPC API](npcs.md); the API itself is a server global available to any
  resource holding the `world.npcs` permission.

Editing the set on a running server: `open77_interactions` carries
`reload_policy "reconnect"`, so a change touching it reaches connected players
only when they reconnect.

## Buckets and instances

Every instance owns a routing bucket, which is what keeps two fights from seeing
each other. Population is disabled and entity lockdown relaxed per bucket.

| Range | Use |
|---|---|
| `4100` | Lobby. The one place in the mode with no combat. |
| `4200 – 4231` | Free-for-all instances (32). |
| `4240 – 4287` | Arena matches (48). |

Allocation is first-free from the range, with the owner tracked, and the bucket
is released on reap — two instances can never share one.

**The instance ceiling is a bucket-range choice, not a performance or prop
limit.** That is a change from the original design: instances were going to
carry a prop perimeter, and props are capped at 256 per resource, which would
have capped instances too. The wall turned out to be client-side (below), so the
quota stopped gating anything.

Bucket isolation is measured, not assumed: six props created in one bucket and
six in the next rendered only for the bucket the player was in, with open ground
where the others stood. World objects belonging to an instance — decoration,
boundary markers, bots — cannot leak into another instance running the same
geometry.

**Reap.** An instance that reaches zero players is not torn down at once: a
player crossing between rounds or a single reconnect would churn the bucket.
It lingers for `emptyLingerSeconds`, then releases. `keepOneWarm` holds the last
instance open; it is off by default, because the wall build it was meant to
spare the first joiner no longer exists.

## Tunables

Declared in `resources/open77_deathmatch/shared/config.lua` and rendered by the
Warden **Tuning** tab, so retuning a running server never means editing Lua and
never means an SSH session. Bounds are enforced on every write — from the panel,
from the console, and from the mode's own code — so a value the panel accepts is
a value the mode can run.

**When a change takes effect.** Every key is declared `apply = "live"`, and that
is not laziness. This mode runs several rounds at once, and `promote()` is
per-*resource*, not per-match — promoting when instance B opens would move
instance A's finish line too. So the kernel **captures** the whole set onto an
instance when the instance opens, and every rule inside that instance reads its
own capture for the instance's whole life. The operator consequence is worth
knowing before you touch a slider mid-evening: **your change reaches instances
created after it, and never a round already in flight.**

### Instances

| Key | Type | Default | Range | What it does |
|---|---|---|---|---|
| `ffaCapacity` | integer | `12` | 2 – 24 | Players per free-for-all instance. Twelve because fourteen surveyed spawn marks leave the headroom the maximin spawn choice needs to mean anything; raise it and spawns start colliding before the marks run out. |
| `ffaCeiling` | integer | `32` | 1 – 32 | How many FFA instances may run at once, bounded by the bucket range above. Reaching it is what produces `instances_full`. **Lowering it never closes an instance — it refuses the next one.** |
| `arenaCeiling` | integer | `48` | 1 – 48 | The same ceiling for queued arena matches. |
| `emptyLingerSeconds` | integer | `60` s | 0 – 600 | How long an emptied instance keeps its bucket before releasing it. Too short and a reconnect churns buckets; too long and idle instances hold the range. |
| `keepOneWarm` | boolean | `false` | — | Never reap the last FFA instance. **Off by default, and the reason is a measurement:** it was meant to spare the first joiner a wall build, and there is no wall build — the wall is a client clamp, so opening an instance is a table insert and two bucket calls. It survives only because it also keeps that bucket's population and lockdown state settled. |

### Free-for-all round

| Key | Type | Default | Range | What it does |
|---|---|---|---|---|
| `roundSeconds` | integer | `300` s | 60 – 1800 | Maximum length of one FFA round. Captured when the round starts. |
| `killLimit` | integer | `25` | 1 – 250 | First player to this many kills ends the round. |
| `respawnDelayMs` | integer | `3000` ms | 500 – 15000 | Delay between a counted death and the arena respawn. |
| `standingsSeconds` | integer | `10` s | 3 – 60 | How long the standings are shown between rounds. The instance never ends, so this is a pause, not a result screen. |

There is deliberately **no minimum-player setting and no join countdown** for
free-for-all. A lone player in a fresh instance is playing, not waiting.

### Arena

| Key | Type | Default | Range | What it does |
|---|---|---|---|---|
| `arenaBestOf` | integer | `5` | 1 – 9, odd | Round wins needed to take a match. Odd, so there is no draw to explain. |
| `arenaRoundSeconds` | integer | `120` s | 30 – 600 | Time limit on one elimination round before it is scored on survivors. |
| `arenaBuySeconds` | integer | `20` s | 5 – 90 | Time to pick a kit before a round. Both teams get the same list. |

### Combat

| Key | Type | Default | Range | What it does |
|---|---|---|---|---|
| `spawnProtectionSeconds` | number | `5.0` s | 0 – 15 | Invulnerability after a respawn. Five seconds is long for a twelve-player free-for-all and short for a contested spawn; this is the slider that decides which. |
| `spawnProtectionBreaksOnFire` | boolean | `true` | — | Drop a player's protection the moment their own outgoing damage is credited. Turning this off re-enables the classic abuse — shooting out of a shield — so it exists to be measured against, not to be flipped. |
| `boundsBackstopSeconds` | number | `5.0` s | 1 – 30 | How long a player must be held **continuously** outside their zone before the server places them back inside. The wall itself is enforced on the client; this is the authority behind it, and a backstop placement costs 100 points so the wall is never a strategy. |

Damage multipliers are **not** in this list, and that is a platform constraint
rather than an oversight: combat policy is host-global, so
`setDamageMultiplier` and friends apply to every instance at once. Per-instance
damage tuning is not available, and faking it in the damage arbiter is not
something to do without measuring first.

### Bots

| Key | Type | Default | Range | What it does |
|---|---|---|---|---|
| `fillWithBots` | boolean | **`false`** | — | Quietly add bots to a thin free-for-all instance. **Off in production, deliberately.** Bots make an empty server feel alive and a busy one feel fake, and which of those you are is not a decision this mode should make for you. |
| `botFillTarget` | integer | `6` | 0 – 23 | How many bodies — players plus bots — a backfilled instance aims for. Bots give way as humans arrive. |
| `botDifficulty` | enum | `standard` | `relaxed` · `standard` · `veteran` | Reaction delay, hit chance by range band, burst length and aggression. The first thing anyone says about a new bot is that it is too good or too stupid; this is the answer to both. |

## Bots — what they are and are not

Bots exist because the sizes this mode is built for cannot be tested with real
clients on one workstation: roughly 2.7 GiB of VRAM per client at the menu
rising to 4.2 GiB in play, and a fourth client on a 12 GiB card died on its own
with 155 MiB free. Six clients for a 3v3 is not happening.

They **move with the engine's own navigation and shoot on the server**. Native
attack and combat tasks are not in the stable API, so the gun is a server tick
that rolls a hit against range and line of sight and applies damage directly —
no engine gunplay, nothing experimental.

Two rules that are not tunable:

- **Bots are labelled**, on the scoreboard and in the kill feed. A player who
  cannot tell whether they lost that duel to a person has been cheated of the
  only thing the mode sells.
- **Bots never write to the ladder.** A round containing one is scored, shown,
  and then not persisted. Excluded at the write, not filtered at the read.

- **Bots fight with Cyberpunk's own combat AI.** The mode does not pick their
  targets, walk them, or subtract anybody's health on a timer. It spawns a stock
  hostile gang record, stays out of its way, and replicates the result. So a bot
  acquires, takes cover, aims, draws its weapon and shoots — and it knows what it
  can and cannot see, because the engine's raycast is doing that work and not a
  server-side approximation of it.

What to expect as an owner:

- **A roster is three gangs, and the rivalry is load-bearing.** Bots alternate
  between Maelstrom, Valentinos and Tyger Claws. That is not decoration: whether
  two bots fight each other is a question the engine's attitude matrix answers
  about their two records, and one faction is one side. A single-gang roster
  gives you bots that ignore each other and only ever attack players.
- **`civilian_female_relaxed_01` is not on the roster and must not be added.** It
  resolves to `Character.Panam`, tagged `Invulnerable` in TweakDB — quest
  protection that no setting can lift. It used to be half the roster, which is
  the whole of "I empty a magazine into a bot and nothing happens".
- **Bots can act on things the mode did not tell them to.** Native combat is not
  opt-in and cannot be switched off, so a bot may chase a player toward the
  arena edge or take an interest in a passing vanilla NPC. The mode leashes them
  — a nudge back inside first, a placement if that is ignored — but a bot briefly
  out of position is expected behaviour, not a fault.
- **A bot alone in an instance is frozen, and that is correct.** Native
  navigation needs a client authority lease; with no ready client, tasks suspend
  and resume when one arrives. It is not a fault, and it does not need reporting.
- **Two players may see the same bot in slightly different places.** Every client
  runs its own copy of a bot's AI, so their paths can diverge. Health cannot: the
  server ledger is the only thing that writes a health number, so a bot dies at
  the same moment for everybody.

## One map, four formats

The map is a set of axis-aligned boxes — not a cylinder, which would either clip
a gallery six metres up or swallow the street outside, and not a polygon prism,
which needs an ordered ring and a winding test and buys nothing at this scale. A
point is inside a zone if it is inside any of that zone's boxes: six
comparisons, trivially correct, and capturable by a surveyor who walks to one
corner and then the opposite one.

Cutting volumes is how one surveyed map serves four formats, and it is why a
second map is out of scope rather than merely unbuilt:

| Format | Zone | Volumes | Why |
|---|---|---|---|
| Free-for-all | `full` | the whole footprint | Vertical play and four stair chokes are what make the space interesting at 8–12 players. |
| 3v3 | `full` | the whole footprint | A real site fight with two approaches per team. |
| 2v2 | `mid` | market and lower | Cutting the gallery removes overwatch and shortens the fight. |
| 1v1 | `duel` | lower only | A duel wants one room and no third angle. |

Until the Kabuki survey is captured the mode runs on **provisional** geometry —
boxes circumscribing the cylinders the previous version already enforced, and
the eight walked promenade marks. Every provisional entry says so in the config,
and the startup log says so once.

## The wall

The arena boundary is a **client-side clamp validated on the server**, not a
barrier you can build.

The obvious approach was a ring of solid props, and it was tested. Props **are**
solid — a player walked 0.47 m into a barrier ring where the same walk with the
ring cleared covered 7.91 m, a seventeen-fold difference in the same spot. But
`visible = false` is *accepted* and the prop **renders anyway**, so no
arrangement of props produces an invisible wall. A jersey barrier is also about
a metre tall, which the owner cleared by jumping: a boundary needs height, not
merely presence.

So: the client projects a player who has left every volume back inside, the
server keeps its leash as a **backstop** rather than as the mechanism (a clamp
that can be disabled is not authority), and the boundary is **drawn**, because
an unmarked wall reads as a bug. If you want to decorate the line with props,
that is supported and purely cosmetic — **do not expect props to stop anyone
invisibly, and do not file it as a bug when they do not.** One practical note if
you do: [`open77_props`](props.md) is not in this template's set, and a
server-created prop is only projected onto clients by that resource's client
half, so props added without it exist on the server and appear to nobody.

## Commands and access control

Available to any player:

| Command | Effect |
|---|---|
| `/dm` | Opens the panel. |
| `/deathmatch.join` | Registers for the next match. |
| `/deathmatch.leave` | Leaves the queue, the instance or the match. |
| `/deathmatch.status` | Prints the authoritative phase and population. |

The station in the world is the intended way in; the commands survive as an
admin and power-user fallback.

`/dm.where` is also open to everyone, and **self-only for a player** — it takes
a format, never another player's id, because an id argument would let anyone
read anyone's position. From the server console, which has no position of its
own, the id is required instead:

```text
dm.where [ffa|3v3|2v2|1v1]              # in game, about yourself
dm.where <playerId> [ffa|3v3|2v2|1v1]   # from the console
```

It prints what the *server* sees: position, bucket, readiness, life state, the
containing volume, the verdict and the reason. Nearly every confusing failure in
this project was answered in one line by a command like this, after being
guessed at for far longer. It is the first thing to run when a player says the
mode is broken.

Restricted to ACL principals — grant these from the Warden **Access** page,
not by hand-editing `acl.jsonc`:

| Command | Effect |
|---|---|
| `/dm.survey start\|mark\|box\|list\|dump\|clear` | Map capture: opens a session, appends spawn marks and volume corners, prints the whole set as pasteable Lua. Coordinates are never accepted from a browser payload — every one is read from `Open77.players.position`. Marks are captured **while walking the deck continuously**; nothing is interpolated, offset or averaged, because nearby XY does not imply nearby walkable ground. |
| `/dm.bot add [n]` · `fill` · `clear` | Bot population inside your instance. *(phase 3)* |

`Open77.players.position` carries **no heading**, so `dm.survey mark` cannot see
which way you were facing: pass the yaw yourself (`dm.survey mark <yaw>`,
read from the debug bridge) or the mark records `0.0` and every player placed on
it faces the same arbitrary direction.

See [Identity and ACL](server-acl.md) for how principals are authenticated.

## Persistence, and one warning

The mode plays completely with `database.enabled: false`, and nothing is gated
behind persistence — no unlocks, no power curve. Career stats and per-format ELO
are additive.

**The database bridge is per-server, not per-resource.** Turning it on for a
ladder is what turned on appearance persistence and took the live Pursuit server
down on 2026-08-27. Enable it deliberately, knowing every other resource on the
server woke up at the same moment, and test the join path with it on — some bugs
exist only in that shape.

## When something looks broken

| Symptom | Cause |
|---|---|
| The log prints `Resource 'open77_interactions' was not found` once a second, forever. | `open77_worldui` is in the set and `open77_interactions` is not. The server does not give up and does not start the set partially. Add it. |
| The station is not visible, but holding **E** in the right place works. | `open77_groundcircle` is missing. The native 3D ring does not draw on 2.31; the ground circle is the whole visual. |
| Two stations are close together and neither prompt appears between them. | `open77_worldui` activates at `radius + 0.5 m`. Stations closer than the sum of their activations leave a dead band where neither is live. Move them apart — an overlap is arbitrated, a dead band just looks broken. |
| A green station shows a cyan card. | The prompt colour defaults to `#00E5FF` regardless of style. Pass `color` explicitly. |
| The station follows a player into a match and offers to queue from another dimension. | Furniture must be torn down when the player leaves the bucket. `maxDistance` is not the lever; ownership is. |
| Players respawn somewhere else entirely, mid-round. | `freeroam` is in the resource set. Its `autoRespawn` is answering this mode's placements. |
| Players see `instances_full`. | Every instance is at capacity. It is a server-full message, not a queue — raise `ffaCeiling` or add capacity. |
| A player was invulnerable for a few seconds and nobody could tell. | Spawn protection is working. Until the HUD ring lands *(phase 7)* it is invisible, and invisible invulnerability is indistinguishable from a hit-registration bug. |
| A bot stands still in an empty instance. | Expected. Native navigation needs a client authority lease; tasks resume when a client is present. |
| A tunable change did nothing to the round being played. | Also expected. Numbers are captured per instance at creation; the change applies to instances opened after it. |

## See also

- [The gamemode kernel](gamemode-kernel.md) — why there is no shared server-side
  gamemode resource, and the conventions every mode's server implements instead.
- [World-anchored POIs](worldui.md) and [Proximity zones](zones.md) — the two
  shared client services this mode's entry station is built from.
- [NPCs](npcs.md) — the API the bots are built on, including what is not yet in it.
- [World props](props.md) — models, buckets and ownership, for decorating the
  boundary.
- [`docs/writing-a-gamemode.md`](../docs/writing-a-gamemode.md) — for owners who want to
  change more than a number.
