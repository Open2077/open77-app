# Cordon — running the Pacifica battle royale

For the person who owns the server, and for the player who wants to know what
the mode does before joining one. Sixty-four players are dropped into Pacifica,
NCPD seals the district block by block, and the last squad standing gets a
Trauma Team extraction.

The mode is two resources: `open77_cordon` (authoritative) and
`open77_cordon_hud` (presentation). The template that installs them is
`templates/cordon`.

> **Status, and read it before you trust a number.** The mode is built and it
> runs. Three consecutive matches with 64 sessions have played to a winner
> unattended, the cordon closes on schedule, a real player has picked a weapon
> off the ground, and the HUD has been seen in a live 40-contestant match. What
> is not yet real is listed in the
> [status table](#what-actually-exists-today): the in-world light edge, the
> Trauma Team extraction AV, supply drops, gang holdouts, party invite codes and
> ghost spectating are declared in config and not built, and the shipped Pacifica
> map is still provisional.
>
> Anything measured on this page traces to
> [`docs/research/battle-royale-and-scale.md`](../docs/research/battle-royale-and-scale.md),
> anything designed to
> [`docs/gamemode-cordon-plan.md`](../docs/gamemode-cordon-plan.md). Where this
> page and `resources/gamemodes/open77_cordon/shared/config.lua` disagree, the config is
> right: it is what the server reads.

## What the mode is

One server, one match, 64 slots. Players who join while a match is running wait
in **staging** and watch; the next match is staged while the current one plays.

| | |
|---|---|
| Slots | 64 per server, one match at a time |
| Formats | Solo 64 · Duo 32×2 · Squad 16×4. Default **Squad**; one format per match, changed between matches from Warden. |
| Map | **Pacifica**, the Combat Zone — a 14 × 14 grid of 100 m blocks, roughly 2 km² |
| Boundary | Blocks close from the outside in toward a hidden final block. Outside the cordon you bleed; you are never walled and never placed back. |
| Match length | ~18 min live, plus 2.5 min of staging and deploy |
| Bots | Fill a match players did not fill. Labelled everywhere; a match containing one is never rated. |
| Ending | The last squad alive gets a Trauma Team extraction, a result card, standings and a rating write. |

Three things make it a *Cyberpunk* battle royale rather than a generic one, and
each is a design decision with a reason behind it:

- **The boundary is a police cordon, not a storm.** Night City is a grid, and
  the platform's containment primitive is an axis-aligned box. A cordon that
  closes streets maps one-to-one onto what the server can actually evaluate,
  and it reads as the city turning on you instead of the weather.
- **There is no downed state, so revives happen at the body.** The platform
  cannot immobilise a player and has no bleed-out phase. A flatlined squadmate
  is a corpse with a 30 s window and a teammate holding **E** over it. That is
  the mechanic, not a workaround for a missing one.
- **The district is meant to be empty.** Open77 suppresses ambient population
  inside the match bucket. In every other district an empty street reads as a
  bug; in Pacifica it reads as canon.

## The match, minute by minute

| Clock | Phase | What the player sees |
|---|---|---|
| −2:30 | **Staging** | A rooftop or garage in the lobby bucket. Squad panel, ready-up, format. Invulnerable and unarmed. The countdown starts at `minPlayers` and runs until the server fills or 60 s elapse, whichever is first. |
| −0:45 | **Deploy** | The tac-map opens. The squad leader drops a landing pin; teammates may override their own within 100 m. The hidden final block is **not** shown. |
| 0:00 | **Drop** | Squads are placed at their pin, in waves, with a 4 s spawn shield. This is "pin and stand" — see [The drop](#the-drop-is-pin-and-stand-and-that-is-a-measurement) for why there is no fall. |
| 0:00–2:30 | **Loot** | No cordon yet. Weapons, ammo, plates and heals on the ground. Gang holdouts at six sites. Vehicles at surveyed spots. |
| 2:00 | Warning | The HUD and the tac-map flash 30 s before a closure begins. |
| 2:30 → 3:30 | **Cordon 1** | The whole grid closes to an 11 × 11 core, one block at a time, farthest from the final block first. Outside: **2 HP/s**. |
| 5:30 → 6:30 | Cordon 2 | 11 × 11 → 7 × 7. **4 HP/s**. |
| 8:30 → 9:30 | Cordon 3 | 7 × 7 → 5 × 5. **6 HP/s**. |
| 11:00 → 11:45 | Cordon 4 | 5 × 5 → 3 × 3. **10 HP/s**. |
| 13:00 → 13:45 | Cordon 5 | 3 × 3 → the final block alone. **15 HP/s**. |
| 15:00 → 15:30 | Cordon 6 | The final block → a 40 m square inside it. **25 HP/s**. |
| 16:30 → 17:30 | Cordon 7 | The square closes to nothing. **40 HP/s**, so nobody survives outside. That is arithmetic rather than a special case, and it means the mode never needs a branch that kills everybody, which is the branch that would eventually fire by mistake during a live match. |
| end | **Extraction** | The last squad is shielded and the 12 s result card runs, then standings, then the rating write. |
| +0:20 | Return | Everyone back to staging. The next countdown starts if `minPlayers` is met. |

**The shapes are Chebyshev rings around the hidden final block**, so a cordon is
always odd-sided. The plan wrote the second cordon as 10 × 10; a ring of radius 5
is 11 × 11, and that is what the server runs. The ring is also clipped by the
grid edge, so a final block near the coast produces an asymmetric first closure.
That reads as NCPD sealing from the landward side, and it is a feature rather
than a rounding error.

Three things the plan puts in this table are **not in the schedule the server
runs**: the supply drop at Cordon 2, night falling at Cordon 3, and the
cyberpsycho at Cordon 4. They are designed and unbuilt. See
[the status table](#what-actually-exists-today).

The schedule is a **named preset**, not a free-form table, because a tunable
string is capped at 256 characters. Two ship. `standard` is the table above.
`short` is a development fixture: the same arc compressed into six phases over
about eight minutes, with the damage raised in step so that "outside is fatal"
stays true in the compressed clock. Its rates are a guess and nothing is
balanced against them. A preset name the config does not know falls back to
`standard`, because a battle royale whose boundary never closes never ends.

## The cordon

### What it does

- The cordon is the **set of open blocks**. A player inside any open block is
  inside. Outside, the server applies damage on a 4 Hz tick at the current
  phase's rate.
- Containment gives three answers — `inside`, `outside`, and *cannot tell* — and
  an unreadable position **freezes the damage accumulator** rather than deciding
  either way. A player is never damaged on the strength of one sample: two
  consecutive `outside` reads at 4 Hz, so 500 ms of confirmed outside, come
  before the first tick of damage. That window is short on purpose. Being wrong
  costs a fraction of a second of health, and being slow costs the boundary its
  teeth.
- **Nobody is walled.** There is no client clamp and no backstop placement
  inside a match. The cordon is a bleed, and sprinting through a closed block to
  flank is a legitimate play with a price.
- During a closure window, blocks close **one at a time**, farthest from the
  final block first, spaced evenly across the window. The edge marches inward;
  it does not snap.
- **Vehicles do not protect you.** The seat is irrelevant; the position is not.
- A cordon kill is credited to the last player who damaged the victim in the
  previous 10 s, and otherwise to the cordon. The kill feed says which.

### Cordon damage is `environment`, and it has no attacker

This one is measured, and it shapes the HUD. `Open77.players.damage(id, 20,
{ kind = "environment" })` returns `true`, takes a player from 100 to 80, and the
server emits `playerDamaged victim=… attacker=0 amount=20.00 kind=environment` —
everything a kill feed needs, attributed to attacker 0.

Two consequences you will meet:

- **`cause` is not a free-text field.** The Lua wrapper reads `options.cause`
  *before* `options.kind` and feeds whichever it finds to the engine's attack
  kind parser. A table carrying both (`{ kind = "environment", cause =
  "cordon" }`) still fails with `invalid_argument`, because `cause` wins and
  `"cordon"` is not an attack kind. The valid kinds are `ranged`, `firearm`,
  `melee`, `explosion`, `quickhack`, `environment`, `fall`, `unknown` and
  `script`. This cost two runs during Phase 0.
- **The platform's damage HUD will not fire for it.** `open77:localDamaged`
  needs an attributed attacker and cordon damage has none, so the red vignette
  and the directional indicator are the *mode's* job: it pushes its own
  `cordon:hurt` client event. Confirming that by observation is the one half of
  this experiment still open.

### What the player sees — three layers

1. **The tac-map** (a focused CEF surface on its own key): the block grid,
   closed blocks hatched red, the next closure flashing, squad positions, your
   own position and heading, pings and the supply drop. It is **schematic** —
   labels and street lines from the survey, never game map textures, because
   redistributing game assets is forbidden.
2. **The HUD**: the outside state is a full-screen danger readout, and it has
   to be, because cordon damage never fires the platform's own hit feedback
   (see above). The instant you cross the line: a hard red full-frame hit, a
   refusal buzzer, and an `OUTSIDE THE CORDON` banner with the bleed rate,
   **`FLATLINE IN {n}s`** at the current rate, and the compass to the nearest
   open block. While you stay out: a heavy red rim that thumps on a heartbeat
   — 1.5 s at the first tier, 1.0 s once the ramp passes 45 %, 0.64 s once it
   passes 80 % or the phase rate alone would kill you — and a rolling scanline
   static that thickens with it. At the top tier the frame is tinted and both
   figures blink. The rim is graded by how long you have been out and by the
   phase's rate, whichever is worse, so Cordon 1 is a warning and Cordon 6 is
   an alarm.

   Until 2026-09-04 this section claimed "a red edge vignette with static".
   The rim existed and the static did not, and at Cordon 1 the rim sat at
   about 0.16 alpha in the corners of the screen — which is how the owner came
   to ask, the day the world boundary was first seen, for "some kind of effect
   over the full game to know we're out of the zone". What is described above
   is what is now built; whether it reads as loud as intended is the next
   thing to look at in game.
3. **In the world**: **two lines, made of fire and light.** Since 2026-09-04
   (the eighth revision of the edge) the boundary is no longer street
   furniture. The owner saw the hesco wall, confirmed it, and said it was the
   wrong material — "à la place de props de mur en béton, pourquoi on utilise
   pas autre chose qui peut faire un effet plutôt du jeu" — so the hesco, the
   roadblock and the container are off (one boolean each in
   `Config.cordon.edge` to bring back) and the line is built from the two
   primitives with in-game proof that also read as an *effect*:

   - **The current line.** Along the nearest ~80 m: `fire.small` on every
     second 2 m slot (the one effect alias with a captured frame, and nineteen
     handles accepted on the owner's own client) and a knee-high red **lamp**
     on the slots between, so the tarmac between two fires glows. The lamps
     **chase** — alternate lit and dark, out of phase with their neighbours —
     and the beat **quickens** from 800 ms to 300 ms over the last twenty
     seconds before a closure and stays fast for the whole closing window: a
     clock you feel without reading it. Beyond the near line the same lamps
     carry the boundary at an 8 m pitch out to `drawRadiusMetres` (150 m).
     Every boundary segment keeps its **marker**: the big red light wash on
     the closed side (proven at night on two clients), a fire on the line and
     an unverified large fire for a plume. The orange hologram strip, still
     unverified, now lies *across* the line so that if it draws its arrows
     point the way in (`yawOffsetDegrees = 180` if a capture shows them
     pointing out).
   - **The next line.** The boundary of the zone that *survives* the announced
     phase — the inner edge of the doomed band the tac-map flashes — is drawn
     in the world too, in **amber lamps**, for the whole hold. From inside the
     band the player sees the red fires behind him and the amber line he has
     to be past ahead of him. As the window runs, the red line eats the band
     cell by cell toward the amber one; when it reaches it the amber posts are
     rebuilt in place as fire and lamp, and the line has arrived.
   - **A closure is a moment**: every lamp on both lines flares white-orange
     at twice its intensity for five seconds, and each marker of the block
     being swallowed goes up in the barrel explosion the platform's own
     grenades use, within 70 m of the player (`surge`).

   Sizing is still the whole point and it was got wrong twice. A 1.1 m
   roadblock at 50 m subtends 1.7° — a kerbstone across a street, which is why
   the first rounds were reported as "no visual at all". A fire at that range
   is about 1.1° wide and the gaps between fires 4.4°, but a flickering
   emissive point stays visible at an angle a grey block never did, and the
   lamps' pools join the gaps at night. Daylight is the honest weakness of a
   lamp: a knee-high point light on sunlit tarmac may add nothing visible, in
   which case the daytime line is the fires and the strip.

   Budget: 104 props planned (16 marker lights, 20 line lamps, 20 strips, 24
   fill lamps, 24 amber lamps) against 256; 52 effects (16 marker fires, 20
   line fires, 16 large fires) against a 58 gate and a 64 cap, with the large
   fire keeping eight handles free for the closure blasts. The number that is
   new and **unmeasured** is real-time lights — 84 planned against the 33 the
   owner's client ran on 2026-09-04 — and `lamps=` / `nexts=` are on the
   `edge:` status line for exactly that reason; `fillStride` and
   `next.maxPosts` are the two knobs.

   Layers still UNVERIFIED against a captured frame: the ground strip and the
   large fire, plus the amber line as a *pattern* (its primitive is the proven
   light host). Each is counted separately on the status line and each is one
   boolean to remove. The fifty-metre smoke column remains OFF: it was reported
   as standing in telemetry and appeared in no screenshot.

   It ships on (`cordonEdge = "world"`), and that tunable turns it down to `hud`
   or off from the Warden panel without a reload.

   It is drawn **on the client**, not by the server, which is the change that
   made it affordable. The client is already sent the grid and the whole
   open-cell list on `cordon:bounds`, `shared/grid.lua` is a `shared_script`, and
   both `Open77.props.create` and `Open77.vfx.play` exist in the client runtime
   gated on permissions this resource already holds — so the edge costs no
   network traffic at all, and the 300 replicated props E8 was written to
   measure are never created. The light is a `kind = "light"` prop with
   `collision = false`, which hides the loot crate its host was cloned from and
   leaves a bare, non-blocking light; the column is `smoke.column.black`
   (`e_smoke_exterior_column_black_5x5x50_d2`, five metres wide and fifty tall).
   Nobody is walled: a VFX has no collider, and the light's only physical
   component is the one that is switched off.

**All three layers are built; only layer two has been seen.** Two screenshots
from a live 40-contestant match show the band, the alive and squad counts with a
red `+33 BOTS` chip beside them, the phase and closure countdown with the
current `HP/S`, the squad panel tracking a `FLATLINED` member while the rest
read `UP`, the inventory strip, and the red edge vignette that marks being
outside the cordon. That closes Phase 4's open visual question in one direction
only: the warning renders. It was not unmissable — it was a soft rim with no
static at the first tier, which is the state the owner played and asked to have
replaced with "a hit effect" — and the danger-state version described in layer
two above has not yet been photographed. The tac-map surface is written and has
not been seen on a client.

Note that the light edge, if it is adopted, needs
[`open77_props`](props.md) in the resource set: a server-created prop is only
projected onto clients by that resource's client half, so props added without it
exist on the server and appear to nobody. It is **not** in the template's set
today, because the experiment that would justify it has not been run.

### Why blocks and not a circle

The platform has **no primitive that draws a circle wider than 50 m** — the
ground circle, anchors and markers all cap there — and its bounds and clamp code
is written for boxes. A block edge is a straight segment on a street grid, which
is exactly the shape that can be drawn cheaply. The circle is the recorded
fallback if the edge reads badly once it is built.

## Loot and the three weapon slots

Ground drops are real native item drops presented through the game's own Take
UI; pickup is validated server-side and reported to every server VM. **The
pickup grants nothing by itself** — the mode is the inventory.

| Slot | Content | How it works |
|---|---|---|
| Weapon 1–3 | Ground weapons | Assigned into a free slot on pickup, or swapped with the active slot. The **verified** TweakDB id the weapons API reports back is what enters the damage arbiter's accepted set — fail-closed, never the id the pickup request claimed. |
| Ammo | Per weapon class | Set as **reserve only**. A magazine value over capacity fails the whole call. |
| Plates | 0–3 armour plates, 25 each | A server ledger. "Apply plate" is a held key that runs a 3 s server timer and then writes armour. |
| MaxDoc / Bounce Back | 0–4 heals | Held key, server timer, healed over 4 s, interrupted by damage. |
| Eddies | Score, not gear | Money counts toward placement tie-breaks only. Progression gates nothing. |

**No grenades, no cyberware, no heavy weapons.** The weapon API refuses those
slots, and the arbiter cannot verify what it did not issue.

### Generation and death drops

At match start the server seeds roughly **900 drops** across the sector from the
surveyed loot marks — about 220 weapons, 300 ammo, 200 heals, 150 plates and 30
money — well under the 4096-drop registry. Tier 4 marks exist only inside
holdouts and inside landing zones the deploy map labels "hot". Weapon quality is
a pool per tier, not a stat roll: common (Lexington, Nova, Saratoga), rare
(Copperhead, Ajax, Carnage), epic (Achilles, Overwatch, Sidewinder), legendary
(Comrade's Hammer, Ashura and three more). **The arbiter is what makes a
legendary matter** — the server prices damage per weapon.

When a player dies, their verified weapons and remaining ammo are re-created as
drops at the body with a five-minute TTL. That is the loop that pays for a kill.

**Designed, not built.** From Cordon 2 on, one supply crate would land per
closure at a surveyed point inside the *next* cordon: a crate with a red light,
a blip for everybody, six legendary-tier drops around it. The `supplyDrops`
tunable exists and nothing reads it yet. The same is true of `holdoutsEnabled`
and the six gang sites, so tier-4 loot is uncontested wherever the survey put
it.

**Loot is proven end to end on a real client**, standing still and in motion:
seeded, delivered, rendered as a bag, prompted in world, requested,
distance-validated, granted, removed from the registry, and reported to the mode
with its item and its owning resource. A weapon among them. The owner triggered
ten of those prompts by hand, which is how the in-world half was finally seen.

Two things cost a session each, and both are operator-visible:

- **Seed the loot after the players are in the bucket, not before.** The mode
  used to seed first, so that nobody could land in an empty district. At seed
  time the match bucket is empty, so all eighty-four per-drop broadcasts went to
  nobody, and the only remaining delivery path was the single large catch-up
  snapshot sent on bucket change. **That snapshot does not arrive.** An
  eighty-four-drop snapshot of roughly 19 KB, against a documented 64 KB
  maximum, is sent and never received, while empty ones arrive fine. The mode
  now seeds after the last placement and sidesteps the bug. It does not fix it,
  and a player joining a match already in progress still depends on that
  snapshot.
- **`playerunavailable` on a pickup is not a loot fault.** It is what the server
  answers when it has no position snapshot for that player in the last two
  seconds. Ten of them in a row were once read as "pickups fail while walking";
  a controlled retest then granted a pickup at 1.0 m both standing and walking,
  and refused one at 2.8 m because the pickup radius is 2.0 m with 0.75 m of
  grace. The refusals were a symptom of a client that had stopped publishing
  position and was seconds from crashing. **That crash is still unexplained**:
  no out-of-memory flag, no minidump, a clean log to the last frame at 87 Hz.

## Squads, and revive at the body

- **Formats**: Solo, Duo, Squad (4). One per match.
- **Friendly fire is the platform's job.** Every member of a squad is given the
  same team id at deploy and **again after every placement** — the mode
  re-applies rather than assuming the id survives a `kill → respawn`, because
  whether it does is still unmeasured. Friendly fire off is host-global and
  stays off.
- **Squad fill** happens once, at deploy. Today it is emptiest-squad only.
  **Party invite codes are designed and not built**, so four people who want to
  land together cannot yet guarantee it. The config carries
  `fillPolicy = "party_then_emptiest"` for the day they are.
- **Squad voice** is a party channel per squad, membership maintained on every
  roster change and torn down at match end.
- **Revive at the body.** A killed squadmate stays dead with a **30 s window**.
  A living squadmate inside **2.5 m** gets a world-UI prompt: hold **E** for
  5 s. The hold is cancelled by damage to *either* party, because cancelling
  only on the reviver's damage lets a squad revive under fire by tanking with
  the corpse. On completion the server revives them at **30 of 100 health** with
  no armour and a 2 s grace. They are ghosted for the grace so the body does not
  block the reviver, then solid. The reach is re-derived on the server from the
  healer's own replicated position, never claimed by the client. The mechanism
  is built and `/br.revive` runs the whole of it from the console; **a revive
  carried out between two real clients has not been observed**, because that
  needs a second client this work has not yet set up.
- **Flatline for good.** After the window, or when the whole squad is down, the
  player is eliminated.
- **Pings.** A key drops a ping at the aim point, 40 m along the camera forward.
  There is no raycast API, so a ping marks a *distance*, not a surface; the
  tac-map click pings a block instead. One ping per player at a time, rendered
  to the squad.
- **The squad HUD** — names, health, armour, alive/dead/reviving — comes from
  the server's 500 ms state push, never from a client.

### Spectating

The platform has no free camera and no spectator mode, and camera state is
deliberately not replicated. So an eliminated player either **ghost-flies** —
non-solid, invulnerable, noclipping, unarmed, following their squad — or returns
to staging and watches the match on the staging panel: kill feed, squads alive,
and the map with its closed blocks, all of which the same state push already
carries.

Which of those ships depends on an experiment that has **not** been run: whether
a ghosted, god-moded, noclipping, unarmed player really is invisible and harmless
to others. Staging watch is the fallback, it needs no platform change, and it is
what `spectateMode` defaults to. Leave it there until E4 is measured.

**A disconnect is an elimination** in v1. Rejoin-in-place needs the mode to
store verified weapons and ammo per player, and that store only exists once the
loot inventory is stable.

## Bots

**A 64-slot battle royale with nine people in it is not a battle royale.** That
is the mode's worst failure case and its most likely one on a young server: the
drop is empty, the cordon closes on nobody, the match resolves in four minutes.
Bots exist so a match is always a match — and so the mode can be developed at
its real size on a workstation where video memory caps real clients at three.

The bot implementation is copied wholesale from the deathmatch's, because every
line of that file was paid for by a real failure. What carries over:

- **The engine fights; the owning client reports.** A scripted damage layer on a
  spawned hostile record is a *second* combat system on one body — hits through
  walls, no animation, and it cancels the behaviour tree. It is never coming
  back.
- **Owner-reports, not witness-reports.** Every client streaming a bot runs its
  own copy of that bot's AI, so crediting a witness credits one burst once per
  spectator.
- **Three mutually hostile gangs, round-robined.** Whether two bots fight each
  other is a question the engine's attitude matrix answers about their two
  records, and one faction is one side. A single-gang roster gives you bots that
  ignore each other. `civilian_female_relaxed_01` stays permanently excluded: it
  resolves to `Character.Panam`, tagged `Invulnerable`, which is the whole of "I
  emptied a magazine into a bot and nothing happened".
- **Damage clamps** — 34 per hit, 90 dps per victim, 90 ms minimum between hits
  on a pair. A gang record's rifle is priced for a levelled solo player;
  unclamped, one burst is a kill.
- **Spawn pacing** — a 5 s settle, 400 ms between bodies, a parked queue drained
  one per tick. Sixty bots is six times what the arena ever spawned at once.

What is new here, and it is all cordon-shaped:

- **A bot occupies a slot and counts as alive.** It appears in the alive count,
  the kill feed and the squad panel, and it can be the last one standing. If a
  bot wins, the match resolves normally and says so.
- **A bot obeys the cordon**, takes the same per-phase bleed, and dies to it.
  Between closures it is issued **one** move order toward a point inside the next
  cordon — issued once per closure, never streamed, because re-issuing movement
  on a tick cancels the behaviour tree the engine is using to fight.
- **A bot does not loot.** It carries its record's own weapon. Ground loot,
  plates and heals are a player economy.
- **Squad-aware.** In Duo and Squad a bot fills an empty seat in a human squad,
  takes that squad's team id, and is revivable at its body like any squadmate. A
  bot squad with no humans in it is fine and common.
- **A bot with no witness is frozen, and that is correct.** NPC navigation needs
  a client authority lease, so a bot alone in a corner of a 2 km² map does not
  move. It exists to fill a fight a player can reach, and the cordon eventually
  brings players to it. It is not a fault and does not need reporting.

### The `botFill` policy

The deathmatch ships its bot fill **off**, because a busy free-for-all that
quietly adds bots feels fake. A battle royale is the opposite case — it does not
work below a threshold, so it fills to one.

| `botFill` | Behaviour |
|---|---|
| `off` | Never. The match runs with whoever turned up. |
| `threshold` *(default)* | Fill to `botFillTarget` (40) only when humans are fewer than `botFillFloor` (24). |
| `always` | Fill every empty slot to the format's capacity. |

Bots are added **at the end of staging, before deploy**, so the drop map shows a
real headcount, and the fill is recomputed per match and never mid-match. On a
full server the setting never fires.

Two rules are not tunable, and an operator cannot turn them off:

- **Bots are labelled** — on the scoreboard, in the kill feed and on the result
  card. A player who cannot tell whether they just won against people has been
  cheated of the only thing the mode sells.
- **A match containing a bot is never rated.** It is scored, shown, and then not
  persisted to the ladder. Excluded at the write, not filtered at the read.

## The map

**Version one plays Pacifica, the Combat Zone.** The reasons are gameplay
reasons rather than taste:

- **It is canonically abandoned**, so the mode's own empty-world policy stops
  fighting the fiction. "NCPD seals the Combat Zone" needs no defending.
- **It has landmarks a squad can call out loud** — the Grand Imperial Mall,
  West Wind Estate, the unfinished stadium, the Batty's Hotel strip, the
  coastline, the highway ring. A grid of anonymous blocks is not a drop map.
- **It is the right size and shape**: roughly 2 km² of walkable ground, bounded
  by water on one side and the highway on the other, mixing long sightlines
  outside with real enclosed multi-level interiors.
- **It is base-game content**, so every player who owns Cyberpunk can play it.
- **It is not the deathmatch's arena.** A battle royale that opens in Kabuki
  reads as the same mode with more people in it.

**Dogtown is map two** — it is literally a walled district, which the cordon
fiction wants — but it needs Phantom Liberty to stream and not every player owns
it, so it is out of scope for v1. **Watson is the fallback**, not the default: if
the survey finds Pacifica too sparse to hold 64 players with meaningful cover,
that decision gets re-made on the ground.

**Maps are runtime data, not code.** The sector is a grid of 100 m × 100 m
blocks (14 × 14 by default) anchored at a surveyed origin, and every meaningful
point in it is a *mark* captured by a person walking the district with the
survey commands. Geometry lives in the database and in the carried-state bag,
and is **never written under `resources/`** — the resource watcher hot-swaps the
whole set once a second, and a runtime write into the resource tree would
reload the mode mid-match.

| Mark kind | Target count | Used by |
|---|---|---|
| `origin` plus grid size | 1 | The block grid |
| `staging` | 1 area, 16 marks | Staging placement |
| `landing` | 20–30 named zones | Deploy map labels, pin snapping |
| `loot`, with a tier 1–4 | 400–600 | Loot generation |
| `vehicle`, with a class | 30–40 | Vehicle placement |
| `holdout` | 6 sites × 4 marks | Gang NPC placement |
| `final` whitelist | 30–50 blocks | Final-block selection |
| `extraction` | 1 per final block | Where the AV lands |
| `supply` | 20 | Supply-drop landing points |

Adding a second map is adding a row to the map store, not writing code. The
survey is the critical path of the build: nothing runs without an origin and a
landing set, and nothing ships without the loot marks.

### The shipped map is provisional, and `/br.map.check` says so

`activeMap` defaults to `pacifica`, a built-in that always resolves so the mode
can start without a database. **It is not a finished survey.** Its origin is
derived rather than walked, it rests on roughly fifty ground samples, and
`/br.status` and `/br.map.check` both print `PROVISIONAL` for it. Do not read a
match on it as a balance measurement.

The survey is now largely automatable, which was not true when the plan was
written. There is no ground-query API, so height is measured with a **noclip
probe**: fly the surveyor up, turn noclip off, and the settled z *is* the
ground. About twelve points take a minute and a half. Two findings from running
it are worth carrying:

- **The probe must heal itself between points.** A surveyor who dies poisons the
  session otherwise. Hardened, a sweep survived nine consecutive deaths with no
  failures.
- **A "void" reading is not evidence of missing geometry.** The same coordinate
  came back LAND in one sweep and VOID in another, because after a long teleport
  the world has not finished streaming and the probe falls through terrain that
  is there but not loaded. Geometry does not flicker; streaming does. **Confirm
  every exclusion with a second probe from a nearby start**, or the cordon will
  refuse to close blocks players can stand in. Water is unaffected: z of about
  −1.0 repeated across fifteen points in three sweeps is a sea surface.

Measured land so far runs roughly 900 × 500 m, which is **noticeably smaller
than the 1400 × 1400 m the 14 × 14 grid assumes**. Either the grid shrinks or
the district extends somewhere the sweeps have not reached, and that is an open
question rather than a decision.

## The drop is "pin and stand", and that is a measurement

The plan carried three candidate drops, in order of preference: an AV lane
carrying a wave of squads across the sector, a free fall from the pin, and
placement on the ground at the pin.

**The first two are out, and the reason is red.** A player respawned 120 m above
a rooftop **under god mode** fell for about 6.3 seconds and **died on landing**,
with god mode true the whole way down. Fall damage has no attributed attacker
and is applied to the puppet directly; Open77's god mode gates the *damage
arbiter*, not the engine's own fall damage.

So the drop is **pin and stand**: placed at the landing pin on the ground with a
spawn shield. It loses the spectacle and nothing else — air steering does not
exist in the vanilla character anyway, so the choice of landing spot was always
going to be made on the map rather than in the air. The AV lane and the free
fall are deferred, not deleted; a server-flown AV is still worth building for
the extraction visual.

Placement is staggered at 50 ms per player — 64 players in 3.2 seconds, inside
the 4 s deploy shield with room to spare — so the streaming preload each
placement carries does not stampede the server tick.

### A placement does not wait for the ground

**Expect players to fall a few metres on being placed, and sometimes through the
world.** The placement primitive is a kill followed by a respawn at coordinates:
the body materialises and gravity applies at once, so if the destination
sector's collision has not streamed in there is nothing to stand on. Measured
repeatedly, asking for a height and reading back where the player ended up:

| Requested z | Landed at | Drop |
|---|---|---|
| 49.8 | 42.38 | 7.4 m |
| 51.4 | 47.4 | 4.0 m |
| 45.4 | 39.3 | 6.1 m |

This is the same streaming race behind `transition_timeout`, which fails a
placement closed to Dead when the client cannot acknowledge within ten seconds.
Deploy places sixty-plus players at once into sectors none of them have
streamed, so that it works at all is worth noting. It is also the strongest
argument for **landing zones anchored on walked ground with generous clearance
beneath**, which is what the survey is for. Pacifica's staging area in
particular is thin grating over open drops, which turns "slightly too high" into
a long fall.

## Spawn protection is a rule, not a state

**The platform has no shield.** `Recovering` is a life state, not
invulnerability, and damage lands on a Recovering player exactly as it lands on
anyone. The only real invulnerability the platform offers is god mode, and god
mode is not usable here: a 120 m fall killed a god-moded player outright,
because fall damage bypasses the arbiter that god mode gates. A shield built on
it would be a shield with a hole in it.

So the mode enforces its own, **in the damage arbiter**. A shot at a shielded
victim is refused and logged, the same way a shot from an unverified weapon is.
That makes the shield a rule rather than a state, which is also why it survives
a placement.

| Shield | Length | Notes |
|---|---|---|
| Deploy | 4 s | Covers the 3.2 s of staggered placement. |
| Landing | 1 s after touchdown | Declared and unused: the drop is "pin and stand", so there is no landing to wait for. It stays because the AV lane and the free fall are deferred, not deleted. |
| Revive | 2 s | Short on purpose. The reviver already paid five seconds of standing still; two seconds is enough to get behind them and no more. |

A shield **breaks the moment the protected player's own outgoing damage is
credited**. Without that, four seconds of one-way fire is a strategy.

## Running one

### From the setup wizard

Start `Open77.Server` with no `server.jsonc` (or `--setup`) and pick the
**Open77 Cordon** template. It installs the resource set below and proposes the
tags `cordon`, `battleroyale`, `pvp`, `squads`, `english`.

`requiresDatabase` is `false`: the mode plays completely without persistence,
and the career store degrades to a loudly-labelled in-memory one. See
[Persistence](#persistence-and-one-warning) before turning the bridge on.

### From the tracked dev profile

`server/server.cordon-local.jsonc` is a masterless, loopback-only profile for
development and for the autonomous test loop:

```powershell
dotnet run --project src/Open77.Server -c Release -- --config server.cordon-local.jsonc
```

Then connect a client to `127.0.0.1:11808` with no master.

**Its ports are shifted by +30 — 11808 game, 11809 download, 11810 Warden — and
that is not tidiness.** This workstation already runs several stacks at once:
`+0` is the default and freeroam and pursuit profiles, `+3` the race profile,
`+10` the PvP lab, `+20` the deathmatch. Two stacks on one port do not fail
loudly — the second bind loses, or a client resolves the default port and
quietly attaches to somebody else's server, and you then debug your gamemode
against a process that is not running it. The download cache directory is
separated for the same reason: two servers publishing different resource sets
through one cache surfaces as a signature or chunk mismatch on a *client*,
nowhere near the server that caused it.

## The resource set

```
open77_shell   open77_pause   open77_watermark   open77_chat
open77_nameplates   open77_notifications   open77_death   open77_appearance
open77_weapons   open77_loot   open77_weather
open77_interactions   open77_worldui   open77_groundcircle   open77_zones
open77_voice   open-voice
open77_cordon   open77_cordon_hud
```

Six of those are load-bearing rather than decoration:

| Resource | What breaks without it |
|---|---|
| [`open77_loot`](loot.md) | There is no loot, so there is no mode. It owns the authoritative ground drops, the vanilla Take UI integration and the server-validated pickup — and the pickup callback is what tells the mode to assign a weapon. Everything from the first minute to the death drops runs through it. |
| [`open77_weapons`](weapons-api.md) | No weapon reaches a player's hands, and worse, the damage arbiter goes silent by design. The arbiter is fail-closed: it accepts only ids it saw the weapons API verify, so with the resource gone every shot is refused rather than free. |
| [`open77_worldui`](worldui.md) | No revive prompt, and no staging station. It owns the marker, the prompt card and the action key that the hold-**E** revive is built from. |
| [`open77_interactions`](interactions.md) | The gamemode is refused outright with `missing_dependency:open77_interactions`. Left out of a set that still lists `open77_worldui`, the failure is worse than a refusal: `open77_worldui` declares the same dependency, the server does not start the set partially and does not stop retrying, and it logs `Automatic resource start failed: Resource 'open77_interactions' was not found` **once a second, indefinitely**. If your log is scrolling one line per second, this is why. |
| [`open77_groundcircle`](../resources/system/open77_groundcircle/README.md) | Every prompt in the mode works and is invisible. On 2.31 the native 3D interaction ring **does not draw at all**; the ground circle is the entire visual, and it follows real ground per vertex. |
| [`open77_zones`](zones.md) | No client-side hysteresis on the revive prompt's proximity. The server re-derives every containment claim regardless, so this is a smoothness loss rather than an authority one. Note that zones are **spheres**, and the cordon does not use them: the boundary is boxes, evaluated on the server. |

`open77_weather` is in the set because the mode drives the clock: staging at
17:30, night falling at Cordon 3, the extraction under the AV's floodlights, and
a 30 % chance of rain rolled at match start and frozen for the match. Time and
weather are **host-global**, which is only acceptable because this mode runs one
match per server.

Three more rules about the set:

- **`freeroam` and `open77_freeroam` must never be in it.** Both are gamemodes,
  and both own spawn and death; `freeroam`'s `autoRespawn` answers every
  `kill → respawn` placement this mode issues, so players respawn at the freeroam
  spawn point in the middle of a match. One server, one gamemode — the resource
  list is how that is expressed.
- **`open77_npcs` is not required for bots or holdouts.** It is the reference
  resource for the [NPC API](npcs.md); the API itself is a server global
  available to any resource holding the `world.npcs` permission.
- **`open77_playerstate`, if you add it, must list `cordon` among its spawn
  owners**, or it will restore saved positions over the mode's placements.

Editing the set on a running server: `open77_interactions` and
`open77_cordon_hud` both carry `reload_policy "reconnect"`, so a change touching
either reaches connected players only when they reconnect.

**And do not edit anything under `resources/` while a match is running.** The
server watches that tree every second and hot-reloads a resource whose files
change. A one-line edit to `open77_cordon/server/main.lua`, made in the opening
minute of a 63-session match, reloaded the mode: the match vanished, the phase
went back to staging with no match id, and the format reverted to its declared
default because the tunable override had been applied to the outgoing VM.
Nothing warns. The only tell in `/br.status` is that the format is suddenly the
one the config declares rather than the one that was set. Documentation and
scripts are outside the watched tree and are safe.

### What the HUD costs a client

`open77_cordon_hud` owns **three WebUI surfaces per client**, and the `WebUI`
layer has no sub-rectangle, so a page that draws only a hitmarker in the middle
of the screen still composites a full 1920 × 1080 surface. Two real clients on
one machine, each running the HUD, once degraded to 0.2 Hz and 3.0 Hz and then
both processes disappeared within the same second, with no crash record and no
minidump, at under 2 GiB of free video memory. The present hook stayed at 7 to
8 ms while whole frames took four seconds, so the collapse was video memory and
not processor time. The combat surface has since been dropped from 60 fps to
30. **Watch free video memory before running two clients on one machine**, and
expect one client per 2.7 to 4.2 GiB.

## Server requirements, and the one setting that matters

### 64 slots is a configuration value

`network.maximumPlayers` is validated 1..1024 and defaults to 32; 64 is a config
value, enforced at join. `tickRate` 30 and `snapshotRate` 20 are as shipped.

```jsonc
"network": {
  "maximumPlayers": 64
}
```

### `simulation.playerInterestRadius` — read this one

**This is the setting that decides whether the mode works at all**, and it is
off by default on every Open77 server.

```jsonc
"simulation": {
  "tickRate": 30,
  "snapshotRate": 20,
  "playerInterestRadius": 500.0,
  "playerInterestHysteresis": 60.0
}
```

Player snapshots used to be relayed to **every** active session in the same
routing bucket, with no distance culling at all. Props, effects, NPCs, vehicles
and loot were interest-culled per player; players were not. In one match bucket
that is 64 × 63 relays per snapshot tick.

Here is what that costs, measured on 63 phantom sessions in one bucket:

| Sessions | Total server egress | Per client |
|---|---|---|
| 32 | 4 957 KiB/s | ~160 KB/s |
| 48 | 11 269 KiB/s | **247 KB/s** — held for three minutes |
| 63 | 19 497 KiB/s | **~326 KB/s** — the link **died within a minute** |

The failure is not subtle and it is not gradual. GameNetworkingSockets clamps
every connection to **256 KB/s** by default, with a 512 KB send buffer behind it;
neither the server transport nor the client raised those. At 48 peers a client
needs 247 KB/s, just under the clamp, and it survives. At 63 it needs 326 KB/s,
over the clamp, and the client's own connection collapses with
`send_failed:LimitExceeded` — the client treats a failed snapshot send as fatal
and returns the player to the server browser. **The ceiling is at about 49
same-bucket peers**, and 64 is on the wrong side of it.

Turning interest on fixes it, and by more than an order of magnitude:

| Case | Total server egress | Per player | vs. un-culled |
|---|---|---|---|
| Un-culled, clustered | 19 497 KiB/s | ~326 KB/s | — |
| **Interest on, spread over 2 km** | **1 455 KiB/s** | **~23 KB/s** | **13.4× less** |
| Interest on, all 63 inside one 50 m ball | 18 254 KiB/s | ~290 KB/s | ~1.07× — correctly, no saving |

That third row is the proof that it is culling and not simply dropping traffic:
when 63 players genuinely are on top of each other, everything is still relayed.

**Do not set the radius below 500 m.** 500 is not a round number — it is the
longest ranged damage the server will honour. Culling below it would silently
cap sniping at the interest radius, because the shooter's client would never
have been sent the player it is being asked to hit, and the symptom would be
"my shots do nothing past X metres" with nothing in any log to explain it.
Raise the interest radius and the damage range together or neither.

Three more properties of the implementation worth knowing before you tune it:

- **It fails open.** A player whose position cannot be read — just joined, mid
  placement, snapshots suppressed — is treated as *visible*. Hiding on missing
  data would make a player vanish at exactly the moment (death, placement, join)
  when others most need to see them.
- **The hysteresis applies on the way out only.** Leaving costs radius plus
  hysteresis, so somebody pacing the boundary does not flap a reliable roster
  message twice a second. 60 m is the default.
- **Zero disables it**, which is the default, so every mode built before Cordon
  behaves exactly as it always did. The wire format did not change and there is
  no protocol bump: interest is expressed through the same roster messages a
  routing-bucket transfer already uses, so a player leaving your interest is a
  player leaving your roster.

### The send-rate clamp

`OP77_GNS_SEND_RATE_BYTES` (and `OP77_GNS_SEND_BUFFER_BYTES`) raise the
transport's per-connection clamp on server connections. There is no
configuration key for either; the transport reads them from the environment at
startup. 2 MB/s (`2097152`) is what the measurements above ran at, and the
tracked dev profile now ships `4194304` / `8388608` after a real client was
dropped during deploy in a 62-player match.

**That failure is invisible from the server.** The roster still counts the
player and the match still runs; the drop shows up only in `net.state` on the
client, as `error=send_failed:LimitExceeded`.

Interest culling is the actual fix and the clamp raise is the belt — but the
belt is not optional, because the clustered worst case (63 players inside a
50 m ball) still needs ~290 KB/s *with interest on*, which is over the default.
The argument that a real match never reaches that state — by the time everybody
is inside one block the alive count is roughly ten, so the worst case is 10 × 9
relays and not 64 × 63 — is an **inference from the design, not a measurement**.
Raise the clamp.

### What the client can actually handle

The client is not the problem, and this surprised everyone. With 63 other player
bodies in view at once:

| Bodied proxies in view | Client frame rate | Open77 per-frame hook | Working set |
|---|---|---|---|
| 0 | 70.7 Hz | 1.49 ms | 6.0 GiB |
| 16 | ~72 Hz | 1.6 ms | 7.19 GiB |
| 48 | ~74 Hz | 1.6 ms | 7.27 GiB |
| 63 | **74–75 Hz** | **1.6 ms** | 7.38 GiB |

Sixty-three proxies did not cost a single frame, and Open77's own per-frame cost
stayed flat. Each proxy body costs about 22 MiB of working set. **The client can
render and simulate 64 players; the network could not send them.** That is the
whole case for the interest radius: not that 64 proxies are too expensive to
draw, but that a player should only be sent the ten or sixteen others actually
near them.

One caveat on those numbers, recorded because it bounds the claim: the load
harness delivers its frames as in-memory buffers, so encryption, the UDP socket
and the datagram receive path are not exercised. The *relative* cost of N
sessions is measured correctly; the absolute figure needs a socket-level check
before a public claim.

### What a 64-session match actually costs the server

Three matches ran back to back on the dev profile with **64 phantom sessions**,
the server's full slot count, on the `short` schedule, unattended, with no file
edits between them. All three reached a winner.

| Match | Alive count over the match | Squads | Open blocks |
|---|---|---|---|
| 1 | 64 → 34 → 14 → 3 → 1 | 16 → 12 → 3 → 1 | 196 → 15 → 9 → 3 |
| 2 | 64 → 60 → 51 → 32 → 17 → 1 | 16 → 16 → 14 → 10 → 1 | 196 → 25 → 9 |
| 3 | 64 → 53 → 44 → 24 → 14 → 1 | 16 → 16 → 16 → 9 → 1 | 196 → 25 → 9 |

| | |
|---|---|
| CPU | **17.0 % of one core** |
| Working set | **152 MiB** |
| Lua tick | 0.9 to 4.3 ms against a 250 ms budget at 4 Hz |
| Loot seeded | 84 drops from 8 provisional clusters, per match |
| Egress at 64 spread over a 250 m radius | ~2.1 MB/s total |

The alive curve has the shape a battle royale should have: a slow bleed while
the district is large, then a collapse as the cordon reaches the last blocks.
The server is nowhere near a limit.

**What this does not prove, and the gap is large.** Phantoms have no bodies and
no HUD. This is the state machine, the cordon, the elimination path, the loot
seed and the ladder gate at full scale. It is not the game. Combat between
players, the visual edge, the tac-map, revive between two clients, bots at
scale and the extraction all remain unproven at 64, and the harness's own
caveat stands: its frames never touch the socket, so encryption and the UDP
path are unexercised.

Two bugs the scale run found, both worth knowing if you write a resource:

- **An error inside a `CreateThread` body kills the thread silently.** No log
  line, no failed call, no warning. The server looked healthy while the match
  sat frozen in `deploy` forever. Wrap the whole tick body, not just the calls
  inside it: losing one tick is survivable, losing the thread is the mode.
- **The carried-state bag is 64 KiB for the whole resource**, and 64 players is
  where a careless roster fills it. The roster is now carried compactly and
  budgeted against a 24 KiB reserve. Over it, the roster is dropped and says so,
  because losing the roster is survivable and taking the pending career writes
  down with it is not.

## Tunables

Twenty keys, declared in `resources/gamemodes/open77_cordon/shared/config.lua` and
rendered by the Warden **Tuning** tab, so retuning a running server never means
editing Lua and never means an SSH session. Bounds are enforced on every write.

Unlike the deathmatch, this mode runs **one match per server**, so there is no
per-instance capture to reason about: a change lands on the next match, and the
match in flight keeps the numbers it started with.

### Match

| Key | Default | Range | What it does |
|---|---|---|---|
| `format` | `squad` | solo · duo · squad | Solo 64 × 1, Duo 32 × 2, Squad 16 × 4. |
| `minPlayers` | 16 | 1 to 64 | Humans in staging before the countdown starts. **Bots never count toward it**: a lobby of bots is not a reason to start. A dev profile sets it to 1. |
| `stagingSeconds` | 105 | 15 to 600 | How long staging lasts before the drop map opens. Cut short when the lobby fills. |
| `deploySeconds` | 45 | 10 to 180 | How long the drop map stays open. **Never cut short**: everybody needs the same time to read the map. |
| `schedule` | `standard` | standard · short | Which closure schedule the next match runs. `short` is the ~8 minute development fixture. |

### Cordon

| Key | Default | Range | What it does |
|---|---|---|---|
| `damageScale` | 1.0 | 0.1 to 4.0 | Multiplies every phase's HP/s. Below 1 the boundary stops being a boundary; above 2 a wrong turn is fatal before the compass can be read. Does not touch weapon damage. |
| `gridSize` | 14 | 6 to 24 | Blocks per side, at 100 m each. 14 is the ~2 km² sector. **Changing it on a surveyed map re-tags every loot mark's block**, so do it only alongside a re-survey. |
| `activeMap` | `pacifica` | any map id | Which map from the runtime store this server plays. `pacifica` is the shipped built-in and always resolves. Geometry never lives under `resources/`, because the 1 Hz watcher hot-swaps the whole set. |

### World

| Key | Default | Range | What it does |
|---|---|---|---|
| `lootDensity` | 1.0 | 0.25 to 2.0 | Scales every drop count. 1.0 seeds ~900 drops from ~500 surveyed marks. 2.0 is ~1800, still inside the 4096-drop registry but **never measured for streaming cost**. |
| `holdoutsEnabled` | on | boolean | Six gang holdouts of four NPCs each on the high-tier sites. **Not built**: nothing reads this yet. |
| `bossEnabled` | off | boolean | One cyberpsycho at a tier-4 mark at Cordon 4. **Off and cannot be turned on**: it needs a record promoted into the server-owned alias registry, which is a reviewed platform step. |
| `blackoutEnabled` | off | boolean | 25 s of night at Cordon 4 with every edge light off. Cheap, loud and memorable, and off until it has actually been played. A boundary you cannot see is the one thing this mode cannot afford to hide. |
| `supplyDrops` | on | boolean | One crate per closure from Cordon 2 on. **Not built**: nothing reads this yet. |

### Squads

| Key | Default | Range | What it does |
|---|---|---|---|
| `reviveWindowSeconds` | 30 | 0 to 120 | How long a body can be revived. **Zero disables revives**, which turns Squad into four solos that share a colour. |
| `spectateMode` | `staging` | staging · ghost | `staging` returns an eliminated player to the lobby to watch on the panel. `ghost` flies them over their squad and is **unproven**: it depends on a ghosted, god-moded, noclipping player being invisible and harmless to others, which has not been measured. Leave it on `staging`. |

### Bots

| Key | Default | Range | What it does |
|---|---|---|---|
| `botFill` | `threshold` | off · threshold · always | See [the bot fill policy](#the-botfill-policy). |
| `botFillTarget` | 40 | 0 to 64 | How many contestants, humans plus bots, a filled match aims for. |
| `botFillFloor` | 24 | 0 to 64 | Under `threshold`, bots are added only when fewer than this many humans are in staging. On a busy server the fill never fires at all, which is what makes `threshold` safe as the default. |

### Rating

| Key | Default | Range | What it does |
|---|---|---|---|
| `ratedMinPlayers` | 16 | 2 to 64 | Matches with fewer contestants than this are not rated. A placement model divides by the field size less one, so a four-player match moves ratings by an amount that means nothing. |
| `ratingK` | 32 | 1 to 200 | How far one match can move a rating. One K per format, and a match exchanges once, so this sits well above a per-round K. |

**`playerInterestRadius` is not here, and somebody always looks for it.** It is
a *server* setting rather than a resource tunable, it lives in `server.jsonc`,
and it is the one setting that decides whether the mode works at all. See
[the setting that matters](#simulationplayerinterestradius-read-this-one).

## Commands

Nine commands are registered today. Open to any player:

| Command | Effect |
|---|---|
| `/br.status` | One line of match state: phase, match id, format, players, alive, squads, bots, whether the match is rated, the map and whether it is provisional, and how many blocks are still open. |
| `/br.where [playerId]` | What the *server* sees: state, position, containing cell, the containment verdict, squad, and how much spawn shield is left. **This is the first thing to run when a player says the mode is broken.** Self-only for a player, because an id argument would let anyone read anyone's position; the console, which has no position of its own, must pass the id. During staging it also re-adopts and places a player the roster lost, which is a rescue rather than a convenience. |
| `/br.stats` | Your own career line: matches, wins, top-4, kills, best placement, longest survival. Answers only if a career store is configured. |

Restricted to ACL principals. Grant these from the Warden **Access** page rather
than by hand-editing `acl.jsonc`:

| Command | Effect |
|---|---|
| `/br.start` | Force the countdown into deploy. **Refused if the map is not surveyed**, and it names what is missing. |
| `/br.end` | End the match in flight and return everybody to staging. |
| `/br.bots [status\|add <n>\|clear]` | Inspect, queue or clear bots. Adding bots by hand **taints the match**, so it is not rated. |
| `/br.map.check` | Per-kind survey progress for the active map, and whether it is provisional. |
| `/br.map <verb>` | **The map editor.** Restricted. Kinds: `spawn land loot veh stage mark supply hold exit`. Verbs: `add`, `del`, `list`, `set`, `spread`, `paint`, `grid`, `ground`, and map-level `new`, `copy`, `select`, `rename`, `title`. Every capture reads **your own position on the server** and takes no coordinate, deliberately: the only place the mode will author is one a body actually stood at. `/br.map` alone prints the full help. |
| `/br.revive <healerId> <downedId>` | Run the real revive path from the console. It calls the same function the client's hold calls, so it exercises the squad check, the server-side reach, the hold timer and the platform revive. It exists so that proving a revive does not require the interface to be up. |
| `/br.stats.of <playerId>` | Somebody else's career line. It is a separate command rather than an argument to `/br.stats` because the ACL gate is per command, not per invocation: one command taking an id would either expose everybody's card to everybody or hide everybody's from themselves. |

**Designed and not registered yet**: `/br` (the panel), `/br.party` and
`/br.leave` (invite codes), `/br.survey`, `/br.cordon skip` and `hold`,
`/br.loot reseed`, and `/br.holdouts`.

`/br.map` **is registered** and is the supported way to author a map — the line
above used to list it as pending and that was stale. It stores outside
`resources/` on purpose (`data/maps/` and the `open77_br_maps` table): the dev
server reloads any resource whose files change, which despawns bots and drops a
live match, so an editor that wrote into `resources/` would empty the match it
was being used in.

The **ground survey** is still done with the development resource
`open77_cordonlab` and its noclip ground probe (`lab.probe`, `lab.probe.line`,
`lab.probe.grid`, `lab.mark`), which is **not** part of the template's resource
set and must never be on a public server. `lab.probe.line <x> <y> <dx> <dy> <n>`
walks a row and prints each point with its settled z; that is how Little China's
7x7 grid was surveyed in minutes rather than an afternoon of walking.

### The editor has an interface, not just commands

Open the tactical map and press **EDIT**. The panel places points of every kind,
shows the active map with its `SURVEYED` and `PROVISIONAL` flags, and prints the
server's own reply beside the button you pressed — refusals in full, because
that is the half worth reading.

Two things about it are worth knowing rather than discovering:

* **It is the same commands.** Every button submits an ordinary `/br.map` through
  the platform's command route, the one the chat box uses. That is the security
  design: `RegisterCommand`'s third argument is the only permission gate a server
  resource has, so a bespoke net event would have been an unauthenticated way in
  for any player. The panel is visible to everybody and useful only to an admin,
  who is the only one whose commands are accepted.
* **You place by standing, not by clicking.** There is no "place on the block I
  clicked", because `add` takes no coordinate at all. Walk to the spot and press
  **PLACE HERE**. For a car this matters twice over: a spawned vehicle hangs at
  exactly the height it was created at rather than falling to the road, so
  standing on the tarmac is what puts it on the tarmac.

See [Identity and ACL](server-acl.md) for how principals are authenticated.

### The load harness

The harness is not part of the gamemode, but it is what every claim on this page
about 64 players rests on, and it stays in the repository for every future mode.
It wraps the real transport on **dev-local servers only** and completes the real
handshake — challenge, hello, welcome — then behaves like a client: it emits the
two events a game client emits once its world is up, acknowledges every life
transition the way a client does, publishes a 239-byte snapshot at the welcomed
snapshot rate, and pings every three seconds.

```text
phantoms [stats]
phantoms add <n> near <playerId> | at <x> <y> <z> [radius] [walk|park]
phantoms move …
phantoms clear
```

Reach them through Warden's console endpoint on a workstation: the server
console ignores stdin when it is redirected.

## Progression and rating

- **Career**: matches, wins, top-4 finishes, kills, assists, damage, revives,
  cordon deaths, best placement and longest survival, as pure delta upserts. The
  identifier is captured at connect, because a player who has left cannot be
  named later.
- **Match rows**: one per player per match, with placement, squad, kills and
  survival time — the queryable proof that the write happened.
- **Rating** is a pairwise placement model: final standings read as N(N−1)/2
  pairwise results normalised by N−1. Squads are rated by mean, and the whole
  delta is applied to each member. One K per format, and no overall rating
  across formats.
- **Progression gates nothing.** No unlocks, no power curve. Placement rating
  and career numbers only.

Two matches are **not** rated: any match with fewer than `ratedMinPlayers`
participants, and **any match containing a bot**. Gang holdout NPCs never taint a
match, because they are not contestants.

## Persistence, and one warning

The mode plays completely with `database.enabled: false`, and the career store
degrades to an in-memory one that says so loudly. Nothing is gated behind
persistence.

**The database bridge is per-server, not per-resource.** Turning it on for a
ladder is what turns on appearance persistence, and that took a live server down
once already. Enable it deliberately, knowing every other resource on the server
woke up at the same moment, and test the join path with it on — some bugs exist
only in that shape.

## What actually exists today

The mode is planned in eleven phases, and "written" is not "done". Most of what
follows was proven with the load harness plus one or two real clients, which is
the honest limit of a workstation whose video memory caps real clients at three.

| Phase | What it delivers | Status |
|---|---|---|
| **0 — Measure** | Twelve experiments that decide the drop, the spectator, the cordon damage path, the loot loop, the revive, the edge, ramming, the AV and team persistence | **Partly done.** Scale (E1, E2) green. Cordon damage kind (E5) green. The drop (E3) came back **red** and selected its fallback. The loot loop (E6) is now green end to end on a real client. E4 (ghost spectator), E7 (body persistence), E8 (the light edge), E9 (ramming), E10 (the AV) and E12 (team persistence) are **not run**. |
| **1 — Interest and the harness** | The load harness, then per-player area of interest | **Done and measured.** 612 server tests green. The gate is met on both halves. |
| **2 — Survey** | Origin, grid, staging, landing zones, 400+ loot marks, vehicles, holdouts, the final-block whitelist | **Two maps surveyed; both provisional.** `watson` is the playable test ground. `chinatown` was surveyed on 2026-09-03 with the probe -- 49 points, 44 walkable, 5 excluded (two on the water plane, two falling through the world) -- and it has **no single ground plane**: walkable ground runs 8.93 to 60.21 m, so it carries 44 per-cell overrides where flat Kabuki needed one. Its shipped `groundDefault` was wrong by 35 m at the first point measured, which is why the survey is not optional.<br>**Older note, still true of pacifica:** The noclip ground probe works and the survey is automatable. The shipped `pacifica` map rests on ~50 samples with a derived origin, and the measured land is smaller than the grid assumes. `/br.map.check` reports what is missing. |
| **3 — Kernel and staging** | Buckets, roster, transitions, placement, staging panel, the state push | **Built and proven with the harness.** The full arc `staging → deploy → live → extraction → resolved → staging` runs unattended. |
| **4 — Deploy, cordon, ending** | Pins, waves, the closure schedule, containment, damage, extraction, results | **Built.** Closures on schedule, containment, the bleed, elimination, the last squad, the result card and the return to staging all observed. The **in-world edge is not built** and the extraction has no AV. |
| **5 — Loot and inventory** | Generation, pickup, ammo, plates, heals, death drops, the supply drop | **Built and proven on a real client**, except the supply drop, which is not built. |
| **6 — Squads** | Fill, teams, voice, revive, pings, the squad HUD, spectating | **Mostly built.** Seats, teams re-applied on every placement, squad voice, pings and the revive mechanism exist; the squad panel has been seen tracking a flatlined member. **Party invite codes are not built**, and a revive between two real clients has not been observed. |
| **6b — Bots as contestants** | The bot roster, cordon-aware movement, squad seats, `botFill`, labelling, the ladder refusal | **Built.** Bots occupy slots, die alongside players, and are labelled on the HUD where a player can see it. |
| **7 — HUD** | Every surface, the tac-map, the deploy map, strings, screen regions | **Built, partly seen.** The match band, the cordon strip, the squad panel, the inventory strip and the outside-the-cordon vignette are photographed on a real client. **The tac-map has not been seen**, and there is no deploy map. |
| **8 — World** | Holdouts, vehicles, the time-of-day arc, supply drops, blackout, the boss | **Not built.** The boss is additionally blocked on an alias-registry review. |
| **9 — Progression and operator surface** | Career, match rows, rating, Warden tunables, the template, this page | **Built.** Twenty tunables retune live through Warden; `schedule` and `minPlayers` were changed on a running server and took effect on the next match. |
| **10 — Scale rehearsal** | Three consecutive 64-session matches with the numbers logged, then a public playtest | **Half done.** Three consecutive 64-session matches ran to a winner and the numbers are logged. They were phantoms, so the *game* at 64 is still unproven, and the public playtest has not happened. |

Unmeasured claims on this page are marked where they appear. The ones that could
still change the design: the in-world edge (it falls back to HUD-only marking,
which is what ships), ghost spectating (it falls back to staging watch, which is
what ships), vehicle ramming, the server-flown AV, and whether a team id survives
a placement. That last one costs nothing either way, because the mode re-applies
the team on every placement regardless.

## When something looks broken

| Symptom | Cause |
|---|---|
| Clients drop to the server browser about a minute after a busy match starts, with `send_failed:LimitExceeded`. | `simulation.playerInterestRadius` is zero or the send-rate clamp is at its default. A client in a bucket of 63 peers needs ~326 KB/s of player snapshots alone, and the transport clamps a connection at 256 KB/s. See [the setting that matters](#simulationplayerinterestradius-read-this-one). |
| Long-range shots do nothing, and nothing is logged. | The interest radius is set below 500 m. The shooter's client was never sent the player it is being asked to hit. Never cull below the server's ranged damage limit. |
| The log prints `Resource 'open77_interactions' was not found` once a second, forever. | `open77_worldui` is in the set and `open77_interactions` is not. The server does not give up and does not start the set partially. Add it. |
| Prompts work but nothing is visible where they should be. | `open77_groundcircle` is missing. The native 3D ring does not draw on 2.31; the ground circle is the whole visual. |
| Players respawn somewhere else entirely, mid-match. | `freeroam` is in the resource set, and its `autoRespawn` is answering this mode's placements. Or `open77_playerstate` is present and does not list `cordon` as a spawn owner, so it is restoring saved positions over them. |
| Cordon damage returns `invalid_argument`. | A `cause` key is being passed. `cause` is read before `kind` and both feed the attack-kind parser, so a table carrying both still fails. Pass only `kind = "environment"`. |
| A player outside the cordon takes no damage and the HUD shows nothing. | Their position is unreadable, so containment answered *cannot tell* and froze the accumulator rather than guessing. `/br.where` prints the verdict and its reason. |
| The red vignette never appears outside the cordon. | The platform's damage HUD needs an attributed attacker, and cordon damage has none. The vignette is driven by the mode's own client event, not by `open77:localDamaged`. |
| A bot stands still in an empty corner of the map. | Expected. Native navigation needs a client authority lease; the bot resumes when a player comes near, which the cordon guarantees eventually. |
| Two players see the same bot in slightly different places. | Every client runs its own copy of a bot's AI, so paths diverge. Health cannot: the server ledger is the only thing that writes a health number, so a bot dies at the same moment for everybody. |
| A rated match wrote no ladder rows. | Either fewer than `ratedMinPlayers` participants, or a bot was in it. A match containing a bot is excluded at the write, deliberately and not configurably. |
| Nobody is in the match and the countdown never starts. | `minPlayers` is not met. On a dev profile it is 1; in production it is 16, and `botFill` only fires at the end of staging, which the countdown has to reach first. |
| A survey mark places every player facing the same arbitrary direction. | The server's position read carries **no heading**. Pass the yaw to the survey command yourself, or the mark records `0.0`. |
| A placed player falls a few metres, or through the world entirely. | A placement is a kill followed by a respawn at coordinates; the body materialises and gravity applies at once, so if the destination's collision has not streamed there is nothing to stand on. Expect 4 to 7 m of drop. Anchor landing zones on walked ground with clearance beneath. |
| Two clients on one machine both freeze and then vanish with no crash record. | Video memory. Each client runs three full-screen HUD surfaces; free VRAM under 2 GiB is the reliable predictor. See [what the HUD costs a client](#what-the-hud-costs-a-client). |
| The match sits in one phase forever and the server looks perfectly healthy. | An error inside a `CreateThread` body kills the thread silently: no log line, no failed call, no warning. Wrap the whole tick body, not just the calls inside it. |
| Drops are seeded, the log says so, and no client can see any of them. | They were seeded into a bucket with nobody in it, so every per-drop broadcast went to nobody and delivery fell back to the large catch-up snapshot, which does not arrive. Seed after the last placement. |
| A pickup is denied `playerunavailable` while the player is plainly alive. | The server has no position snapshot for them from the last two seconds. It is not a loot fault; it is a client that has stopped publishing position, which on the one occasion it was seen preceded a crash. |
| A resource stops with `reason=runtime_error` and its interface never appears. | A `dependency` line with no version constraint throws an unhandled null reference in the resource host. Nothing says the line is malformed; the client simply lists one fewer resource. Every shipped resource carries a constraint, and `>=0.1.0` is enough. |
| The match went back to staging on its own and the format is not the one you set. | Somebody edited a file under `resources/`. The 1 Hz watcher hot-reloaded the mode and took the running match with it. |

## See also

- [`docs/gamemode-cordon-plan.md`](../docs/gamemode-cordon-plan.md) — the source of
  truth for the mode: phases, gates, decisions, the constraints ledger and the
  risk register.
- [`docs/research/battle-royale-and-scale.md`](../docs/research/battle-royale-and-scale.md)
  — every measurement quoted on this page, with the setup that produced it and
  the fallback each red result selected.
- [The gamemode kernel](gamemode-kernel.md) — why there is no shared server-side
  gamemode resource, and the conventions every mode's server implements instead.
- [Deathmatch](deathmatch.md) — the mode this one is built on top of. The
  kernel, the placement primitive, the bounds evaluation, the scoring ledger,
  the bot bridge, the rating store and the two-surface HUD all come from there.
- [Loot](loot.md) and [Weapon Lua API](weapons-api.md) — the two APIs the
  inventory is assembled from.
- [NPCs](npcs.md) — the API the bots and the gang holdouts are built on.
- [World-anchored POIs](worldui.md) and [Proximity zones](zones.md) — the revive
  prompt and its proximity.
- [World props](props.md) — needed if the in-world light edge is adopted.
- [Integrated voice chat](voice.md) — the per-squad party channel.
- [`docs/writing-a-gamemode.md`](../docs/writing-a-gamemode.md) — for owners who
  want to change more than a number.
