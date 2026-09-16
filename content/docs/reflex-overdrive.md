# Reflex overdrive

A Sandevistan-inspired implant power for a **shared real-time world**. The owner
moves, swings and reloads faster; everybody else keeps running at normal speed.

Read that sentence twice before building on it, because it is the whole design:

- **It does not slow other players.** No packet in this feature can change
  anyone else's clock.
- **It does not slow bullets.** Hitscan stays instant at its firing time.
- **It changes no clock at all** — not the world's, not the owner's, not any
  entity's. It applies stat modifiers on the owner's own body and removes them
  again.

Why it works this way is measured, not assumed. The vanilla Sandevistan grants
no speed: its status effect carries crit chance and two stamina discounts, and
its entire advantage is a **global** time dilation with the local player
exempted. In a session that call slows the acting client's whole local
simulation — every remote body, every replicated animation, the physics and the
audio — while the server and the other clients run at 1.0. The findings, record
ids and the vanilla `IsMultiplayer()` guards that already refuse it are in
the research notes in the open77-base repository (`docs/research/native-sandevistan.md`).

Genuine shared slow motion, in an isolated arena bucket with an authoritative
time domain, is a separate and separately gated experiment. Nothing in this page
is a step toward it, and nothing here should be presented to players as "bullet
time".

## Turn it on first

`open77_reflex` must be named in your server's `resources.load`. That array is an
allowlist: a resource present on disk but absent from it is never started, never
mentioned in the log, and produces no warning to grep for. Nothing on this page
happens until the name is there.

```jsonc
"resources": {
  "load": [ "...", "open77_cyberware", "open77_reflex" ]
}
```

It depends on `open77_effects`, so list that too. A dependency your list does not
resolve is worse than a silent omission: the automatic start aborts on the first
unresolved name and **no resource starts at all**, which looks like a dead server
rather than a configuration error. Grep the log for `Automatic resource start
failed` before believing a list is complete.

## Public server Lua API

| Call | Resource permission | Result |
|---|---|---|
| `Open77.reflex.define(definition)` | `players.reflex.define` | Register an immutable versioned definition |
| `Open77.reflex.grant(player, definitionId)` | `players.reflex.manage` | Request this resource's session grant and native projection |
| `Open77.reflex.revoke(player)` | `players.reflex.manage` | Remove this resource's overdrive grant |
| `Open77.reflex.cancel(player)` | `players.reflex.manage` | End the player's active overdrive early |
| `Open77.reflex.current(player)` | `players.reflex.read` | Activity and projection, or nil when absent |
| `Open77.reflex.capabilities()` | `players.reflex.read` | Supported profile, tiers and the advertised boundary |

Mutations return `{ok=true}` or `nil, reason`. A successful grant means pending
native work: check `current(player).projection.status == "ready"` before
presenting it as usable. `current(player).ownedByCaller` is a server-derived
boolean for the calling resource, accurate across projection restarts. Grants
require the existing authenticated cyberware character binding and an alive,
ready, unmounted body. They are session capabilities, not purchased equipment;
server makers own persistence, jobs, progression, prices and zones.

```lua
-- Manifest permissions: players.reflex.define, players.reflex.manage, players.reflex.read
assert(Open77.reflex.define({
  id = "myserver.overdrive", version = 1, profile = "reflex_overdrive",
  config = {
    tier = "reflex", inputKey = "x", presentation = "native",
    durationMs = 6000, cooldownMs = 20000,
    maxCharges = 1, chargeRegenMs = 30000,
    staminaCost = 25, heatCost = 0,
  },
}))
-- Call only after your server's access/consent/payment checks:
local pending, reason = Open77.reflex.grant(player, "myserver.overdrive")
local activity = Open77.reflex.current(player)
-- Remove only this resource's capability. Paid implants remain installed:
local removed, error = Open77.reflex.revoke(player)
```

`profile` is exactly `reflex_overdrive`. Input accepts lowercase physical
letters/digits, `f1` through `f12`, and supported modifier/navigation names such
as `ctrl`, `shift`, `space`. Use a deliberate binding that fits your server's
other controls.

`inputKey` is the **default** of the `reflex_overdrive` action, not the key the
player is stuck with: the client registers it through `RegisterKeyMapping`, so a
player rebinds it under Pause › Settings › KEY BINDINGS and the rebind follows
them across servers. A server that ships a different default never overrides a
saved rebind.

## Configuration and bounds

| Configuration | Supported bounds |
|---|---|
| `tier` | `reflex` or `reflex_heavy` — see the table below |
| `durationMs` | 500–15000, and never longer than `cooldownMs` |
| `cooldownMs` | 1000–600000, **and at least `durationMs`** |
| `maxCharges` | 1–3 |
| `chargeRegenMs` | 1000–600000, sequential charge regeneration |
| `staminaCost` | 0–300 canonical points |
| `heatCost` | 0–100, spent through a resource-owned heat ledger |
| `presentation` | `native`, `silent` or `none` |

A definition outside these bounds is **refused**, not trimmed: an operator
should see the mistake rather than wonder why a 60-second overdrive lasts 15.

Two rules are worth calling out because they are deliberate:

- **`cooldownMs` must be at least `durationMs`**, and the cooldown starts when
  the boost *ends*, not when it starts. Chaining activations into a permanent
  overdrive is the failure this feature is bounded against.
- **A definition cannot name a stat.** It picks a tier; the client owns the two
  plans and their per-stat ceilings. Putting a stat plan on the wire would make
  the wire the place to invent a speed cheat.

## The two tiers

| Stat | `reflex` | `reflex_heavy` | Ceiling |
|---|---|---|---|
| `MaxSpeed` | ×1.25 | ×1.55 | ×1.6 |
| `AttackSpeed` | ×1.15 | ×1.40 | ×1.5 |
| `ReloadSpeedPercentBonus` | +20 | +40 | +50 |
| `Evasion` | +8 | +18 | +25 |
| `StaminaCostReduction` | +0.5 | +1.2 | +2.0 |

For scale: the weakest installed vanilla Sandevistan runs the world at 0.30 —
about a 3.3× relative advantage — and the Apogee at 0.15, about 6.7×. Neither is
a shared-world number. `reflex_heavy` is 1.55×.

The modifiers are applied through `gameStatsSystem` with tracked handles, the
same mechanism the Cripple Movement lock uses in the opposite direction, and are
removed by handle on every release path.

## What it looks like, on other people's screens

A faster body is not a readable ability. Without a presentation, the only thing
an observer gets is a player who happens to be quick, and the player who just
lost a fight has no idea what beat him. So the overdrive ships with one, and
`presentation` in the definition selects it:

| `presentation` | Effect |
|---|---|
| `native` | The full cue: visuals and the two sounds |
| `silent` | The visuals, no sound |
| `none` | Nothing at all |

What `native` actually draws, correlated with the phases below:

| When | On the user's body, for everyone nearby | Sound at the user's position |
|---|---|---|
| Activation (`accepted`) | a bright spark burst at the chest, 900 ms | `w_cyb_berserker_activate` |
| While boosted (`active`) | a blue volumetric glow wrapping the body, an electrical layer at the chest, a spark layer at each foot, and a trail from each heel while moving; `reflex_heavy` adds an arc at the right hand | — |
| End (`completed` / `cancelled`) | a smaller burst at the chest, 700 ms | `w_cyb_berserker_deactivate` |

The sound is positioned on the body, so a player standing next to the user hears
which direction it came from. An activation the client refuses between `accepted`
and `active` drops its burst and stays silent: the end cue only fires for a boost
that really reached a body.

**Be clear with your players about what this is.** It is an *Open77*
presentation, not a recreation of anything in single-player, and the reason is
worth knowing:

- **Cyberpunk 2077 2.31 contains no player-facing Sandevistan visual.** The
  string `sandevistan` matches none of the 101 553 cooked asset paths. The
  afterimage trails everyone remembers are authored on Adam Smasher and are
  broken by name in his own script; the screen grade is a *time-dilation* camera
  curve, meaningless without the slowdown this feature refuses to create.
- So the layers above are built from Open77's existing effect catalogue. They
  say "this body is running an implant", they do not say "Sandevistan".
- **Nothing is drawn on an observer's own screen.** Every layer lives on the
  boosted player's body, where it belongs. A full-screen effect would tell the
  watcher something about himself.
- The owner sees the same body layers in first and third person. There is no
  extra overlay for him, deliberately: the two candidate native names
  (`berserk`, `perk_edgerunner`) could turn out to be a full-screen berserk
  grade, and a fifteen-second unverified overlay is worse than none.

### The cues, as measured

The layers above were not chosen by their names. Nine catalog candidates were
attached one at a time to a body 5 m from a second client and photographed, in
fog and under clear night. Exactly one reads unmistakably in a still: the blue
glow (`neon.loot_drop`), which is a light rather than a particle. The chest
energy and heel sparks show a few bright sparks at close range; the character
status-effect sheets, the EMP sizes and the blade idles -- everything that
sounded like cyberware -- render nothing visible on a slot. Sheets:
the candidate sweep captures kept with the repository.

On a live 8 s `combat` boost the observer holds seven handles from the first
sample to the last, and the plate stays amber the whole way. The trails are the
one layer a still cannot judge: a katana trail draws only while its emitter
moves, so it is carried at nil cost and judged in motion.

One honest gap: this proves the sounds are **emitted and live on the body with
real durations**, not that they were heard. No audio has been captured from this
feature yet.

### At a distance, the plate does the work

Body effects stop reading long before players stop mattering to each other. We
measured it from a second client on open ground: unmistakable at 4 m, still clear
at 10 m, and **invisible at 20 m** -- an observer across a street saw only a
normal nameplate over someone slightly too quick.

So a boosted player's nameplate is marked for as long as the boost runs:

```text
CyberwareA                 ->      CyberwareA // OVERDRIVE
(white, the usual plate)          (amber, while boosted)
```

It is raised with the sustained layers and lowered on every path that ends them,
so a plate can never claim a boost that has already finished. Nothing marks the
boosted player's own plate: he is not an observer of himself.

**One thing to know if you drive nameplates yourself.** A nameplate override
belongs to whichever resource claims it first. If your own resource is setting
plates, it keeps them and this marker simply does nothing -- the body effects
still play, and the client says so once in its log rather than on every boost. If
you want both, set the marker yourself from your own nameplate code: listen for
`onReflexChanged` and mark the player on `active`, clear on `completed` and
`cancelled`.

Everything is bounded and owned: at most four effect handles per activation and
24 across the resource, a lease that can never outlive the 15-second ceiling, and
release on the end of the boost, on death, on disconnect, on a bucket or body
change, and on a watchdog behind all of them.

The whole presentation lives in one replaceable file,
`resources/system/open77_reflex/server/presentation.lua`. Server makers who want
a different look can set `presentation = "none"` in their definition and author
their own from [`Open77.effects`](effects.md) — the events it listens to,
`onReflexChanged` and its phases, are public.

## Lifecycle, and every way it ends

The server admits an activation, spends the charge, the cooldown and the costs,
and hands the client a deadline. Phases reach a resource as `onReflexChanged`:

| Phase | Meaning |
|---|---|
| `accepted` | The server admitted the request and charged for it |
| `active` | The client reported the modifiers on the body |
| `completed` | It ended normally — the client released it, or the server's deadline did |
| `cancelled` | It ended early; `reason` says why |

`onReflexRejected` carries a refused request with its reason:
`stale_grant`, `stale_action`, `body_unavailable`, `cyberware_suspended`,
`crippled`, `already_active`, `motion_busy`, `cooldown`, `charges_exhausted`,
`insufficient_stamina`, `heat_unavailable`, `insufficient_heat`.

A refused request costs nothing: no charge, no cooldown, no stamina.

The boost is released by **all** of: the deadline; an explicit `cancel`; the
owning resource stopping; death, hard or soft; mounting a vehicle; entering a
workspot; losing the body; a session change (reconnect, disconnect, lab to
session); and a watchdog that removes any overdrive modifier found on a body the
client's own machine does not hold. That last rule is why a crash or a failed
removal cannot leave a player permanently faster than everyone else.

An open menu is deliberately **not** a release: a player who opens the map
mid-overdrive keeps the boost they paid for.

## What it composes with

Unlike Dash and Ground Slam, an overdrive is **not** a movement owner, so it
does not take the movement envelope and is not mutually exclusive with them. The
point of a reflex implant is to dash and fight under it. It is still:

- refused while a forced motion owns the body (a knockdown, a slam recovery);
- refused while a netrunner has suspended the player's cyberware
  (`cyberware_suspended`) — an implant that was just shut down must not answer;
- refused while the player is crippled (`crippled`) — the slow cannot be
  answered with a boost;
- refused in a vehicle, at grant time and at activation time.

## Diagnostics

`reflex.overdrive.state` is on the debug bridge's session allowlist. It is a
pure read and carries the sampled `MaxSpeed`, which is the only way to see
whether a granted boost actually reached the body:

```powershell
.\scripts\debug-bridge.ps1 -ProcessId <pid> -Command 'reflex.overdrive.state'
```

The write forms (`reflex.overdrive`, `reflex.overdrive.clear`) are solo-lab only:
a self-applied boost in a session would be a self-granted advantage.

## Optional lab workflow

`open77_cyberware_lab` exposes the whole flow through the same public APIs, with
two replaceable presets — `street` (tier `reflex`, 6 s, 20 s cooldown, one
charge) and `combat` (tier `reflex_heavy`, 4 s, 25 s cooldown, two charges):

```text
/cyberlab reflex grant <player> <street|combat>
/cyberlab reflex inspect <player>
/cyberlab reflex cancel <player>
/cyberlab reflex revoke <player>
/cyberlab reflex grant street          -- grants to yourself
```

The presets, the access policy and the input key live in
`resources/gamemodes/open77_cyberware_lab/server/config.lua` under
`CyberwareLab.reflex`. Replace them, or remove the lab entirely and register
definitions from your own resource.

## In the lab panel

`/cyberlab` has an **Overdrive** card beside Ground Slam: the grant's projection
status and charges, the two presets with their duration, cooldown, charges and
stamina cost, the default key and where to rebind it, and Grant / Revoke / Cancel
boost. It rides the same request-and-action route as the slam card, rate-limited
per issuer, with a data push after every action.

## What is proven, and what is not

Measured live, not inferred. What follows is what has actually been observed in a
running game, and what has not.

**Proven in-game.** A `MaxSpeed` multiplier above 1 does raise locomotion: sprint
measured 7.10 -> 9.38 m/s (x1.25) on open ground, with `clock=untouched`. All
seven release paths end the boost — deadline, cancel, death, vehicle, reconnect,
resource stop and a suspended-cyberware refusal. Over 38 activations the ledger
balanced at 190 modifier adds against 190 removes, no drops.

**Proven on other people's screens.** The attached presentation reads at 4 m and
10 m and **failed at 20 m**, which is this feature's own criterion; that gap is
closed by the nameplate marker. The full matrix is measured: first person at 4,
10 and 20 m, and third person at 10 m and at 20 m, the last one in **daylight**
with a male boosted player and a female observer 20.00 m apart. The captures are kept with the repository.

Know what that means before you tune a preset: **beyond about 10 m, and in
daylight sooner, the particles are gone and the plate is the entire signal.** The
attached layers are a close-range affair. If you replace the plate with something
of your own, you have replaced the only thing an observer can read at range.

**Proven about the clock — and this is the part worth reading carefully.** The
guard that protects a shared session is a REDscript wrapper that arms *only*
inside a multiplayer session: `script.state` reads `armed=no` in solo and
`armed=yes` in a session. A control run in a solo lab therefore tests the native
detour, not the guard real players are behind. Re-run inside a session, a live
caller asked for a time scale of `1e-06` across 4725 frames — one episode of 10.3
seconds — on the two native setters a Sandevistan drives, and the effective scale
never left 1 while the world clock advanced.

Note the counter that trips people up: in a session `dilationSetsRefused=0` is the
**healthy** reading. The guard does not refuse the call, it releases the dilation
as fast as it is applied. Refusal is a solo-lab hammer armed by
`session.dilationrefuse`; release is what ships, and it is why single-player is
left alone.

**Not proven, and named rather than glossed.** The in-session caller above was the
hub menu, not a vanilla Sandevistan: `equipment.equip` answers `invalid_record`
for `Items.AdvancedSandevistanApogee`, and nothing on the development rig installs
a cyberware operating system onto a player. So "a shared clock survives a live
in-session caller at `1e-06`" is measured; "a Sandevistan record is refused by
name" is not. Section 12 of
the research notes in the open77-base repository (`docs/research/native-sandevistan.md`)
records the gap and what would close it.

**Still absent by design**, so nobody goes looking: no shared slow motion, no
dodgeable bullets, no zones. Other players are never slowed and no bullet is ever
slowed — the advantage is entirely the boosted player's own stats.
