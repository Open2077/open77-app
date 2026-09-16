# Time scale: slow motion for a scripted beat

`Open77.world.setTimeScale` slows the clock a client's world runs at -- everything on that client,
the local body included -- for a countdown, a kill cam, a cinematic reveal, a round end. It is the
FiveM `SetTimeScale` shape on the client, and on the server it is replicated per routing bucket so a
beat every player in an instance should share is shared. It is **not** a combat mechanic, and the
last section says exactly why.

The day-time clock -- what hour it is, how fast the sun moves -- is a different thing and lives in
[Weather](weather.md). This page is about the *rate*: how much simulation happens per real second.

```lua
resource "round_end_beat"
version "1.0.0"
client_script "client/main.lua"
server_script "server/main.lua"
permissions { "world.timescale" }
```

One permission string on both sides, `world.timescale`. The reads (`getTimeScale`) need nothing.

## On the client

```lua
-- Half speed for two seconds, easing in and out over a quarter of a second,
-- then real time comes back on its own.
local ok, reason = Open77.world.setTimeScale(0.5, { durationMs = 2000, easeMs = 250 })
if not ok then print("no slow motion: " .. tostring(reason)) end
```

`setTimeScale(scale, options?) -> true | false, reason`

* `scale` -- `0.05` to `1`. `1` is real time and **releases** this resource's claim; anything
  below it is a slow-motion. Zero is refused: it freezes input along with the world (the vanilla
  fullscreen menus use it for exactly that) and a script never needs it.
* `options.durationMs` -- how long to hold, up to an hour; `0` (the default) holds until you release
  or your resource stops.
* `options.easeMs` -- a linear ramp, up to ten seconds, from wherever the clock currently stands to
  `scale`, and back to `1` at the end. Measured in your milliseconds, not in an engine curve's fixed
  length.

Reasons: `permission_denied:world.timescale`, `invalid_scale`, `invalid_options`,
`invalid_timescale_option:<name>`, `timescale_unavailable_on_this_host`, `native_unavailable`.

`getTimeScale() -> { scale, engineActive, simTime, claims }`

* `scale` is the engine's **effective** dilation -- what the player is experiencing right now. It
  can differ from what you asked for while a vanilla producer holds a dilation of its own (a
  deflect, a menu) or while you are easing.
* `simTime` is the engine's game clock in game seconds (`GetGameTimeStamp`). It runs at the
  day-length multiplier -- 8x real time on the vanilla day, measured 7.97 on the proof -- and it
  dilates with `scale`, which is how you *measure* a slow-motion instead of trusting the number:
  take its rate against `GetGameTimer()` (the steady clock, which never slows) during the hold
  and again at real time, and the dilation is the ratio of the two rates. The rate against the
  wall clock alone is the day length, not the dilation.
* `claims` lists every live claim: `{ owner, scale, applied, remainingMs?, phase }`, where `phase`
  is `easingIn`, `holding` or `easingOut` and `remainingMs` is absent for an open-ended hold.

### One claim per resource, and why that is a registry and not a native

Every resource holds at most one claim, under its own name. Setting again updates it -- and eases
from wherever the clock stands, so a re-claim in the middle of an ease-out simply turns round. Two
resources holding claims at once are two entries in the engine's own dilation table, which composes
them by its rule (the slower one wins; that was measured, not assumed, when a neutral entry failed
to cancel a slower one). Nothing here arbitrates between resources, on purpose: a last-write-wins
would make the effective rate depend on the order two unrelated resources happened to call in.

The registry exists because of what a multiplayer client otherwise does with a slowdown. Open77's
session guard exists to *remove* dilation nobody asked for -- it releases every dilation it can name
each frame and, after three seconds of one it cannot name, exempts the player from it. A scripted
slow-motion is the opposite case, and without a registry the guard cannot tell the two apart: it
would count your beat as a defect and, three seconds in, hand the player their normal speed back
while the world stayed slow. A claim tells the guard to stand down for exactly as long as the beat
is live, and no longer.

Every way out ends in the engine forgetting your entry: the deadline, `setTimeScale(1)`, your
resource stopping or reloading, the session ending, the plugin unloading. A stopped resource cannot
leave a client in slow motion.

### Measuring it

```lua
-- The rate of the game clock against the steady clock, over one second.
local function clockRate()
    local view = Open77.world.getTimeScale()
    local sim0, wall0 = view.simTime, GetGameTimer()
    Wait(1000)
    view = Open77.world.getTimeScale()
    return (view.simTime - sim0) / ((GetGameTimer() - wall0) / 1000)
end

CreateThread(function()
    Open77.world.setTimeScale(0.5, { durationMs = 2000 })
    local held = clockRate()   -- about 4.0 on the vanilla day (8 x 0.5)
    Wait(1500)                 -- the deadline released it
    local real = clockRate()   -- about 8.0
    print(("the hold ran at %.2f of real time"):format(held / real)) -- about 0.50
end)
```

## On the server

```lua
-- The whole arena instance sees the last kill at quarter speed, then real time.
AddEventHandler("open77:playerKilled", function(victim, killer)
    local bucket = Open77.routingBuckets.getPlayer(victim)
    if bucket == nil then return end
    Open77.world.setTimeScale(bucket, 0.25, { durationMs = 1500, easeMs = 200 })
end)
```

`setTimeScale(bucket, scale, options?) -> true | nil, reason` -- the same `scale`, `durationMs`
and `easeMs` as the client, applied to every client currently in the bucket and to every client
that enters it while the beat lasts (a mid-beat joiner is told only what remains). `1` releases the
bucket. The owner is your resource: its stop releases every bucket it slowed.

Reasons: `permission_denied:world.timescale`, `invalid_bucket`, `invalid_scale`,
`invalid_duration`, `invalid_ease`, `invalid_options`, `timescale_unavailable_on_this_host`.

`getTimeScale(bucket) -> { bucket, scale, remainingMs?, easeMs?, owner?, revision? }` -- `scale`
is `1` and nothing else for a bucket at real time. Ungated.

A server beat and a client resource's own claim compose exactly like two client claims: the
server's arrives on each client as a claim under the reserved owner `open77:server`, so
`getTimeScale().claims` on the client shows it beside yours.

**The server does not slow down.** It keeps simulating at real time; the policy changes the rate at
which each client in the bucket *presents* the world, and each client eases on its own clock. A
timed policy expires on the server too, so a player who joins after the deadline is not told to
slow down for a beat that has already ended.

## What this is not, said plainly

* **Not a Sandevistan.** Other players outside the beat -- other buckets, other servers -- run at
  real time; so does the server. A slowed client's snapshots arrive at the rate its own clock
  produces them, and a shot fired *at* it is still adjudicated in real time. That is why the
  reflex overdrive in [Reflex overdrive](reflex-overdrive.md) touches no clock at all: it is a
  speed buff on one body in a shared real-time world, and this lever is the thing it was designed
  not to be. Use `setTimeScale` for presentation -- a beat everyone in the bucket watches -- and
  never as an advantage for one player in a fight.
* **Not the player-zero layer.** Vanilla's Sandevistan slows the world and exempts the player.
  This slows the world *and* the player, which is what a time scale means; there is no
  "exempt me" option, and adding one would recreate the mechanic the paragraph above rules out.
* **Not a pause.** `Open77.environment.setTimeFrozen` freezes the day-time clock and was measured
  to slow gameplay and vehicle physics as a side effect; it is a different mechanism with a
  different use. A scale of `0.05` is the slowest this API goes.
* **Not gravity.** FiveM's `SetGravityLevel` has no generic equivalent here. Open77 rewrites the
  local player's gravity for a *fall* through [`Open77.chute.arm`](https://open2077.net) -- reduced
  gravity, a terminal descent rate, an optional glide and an invulnerable landing shield, armed as
  one rig -- because the engine's `LocomotionParameters` gravity only reaches the aerial locomotion
  states, is reset on every state entry, and its landing-damage thresholds are read from static
  parameters that a runtime write does not move. A bare multiplier would lower a fall without
  moving the thresholds that grade it, or raise one and kill on landing; the chute is that
  asymmetry used on purpose, with the shield that makes it safe. Jump height is governed by other
  state parameters entirely. If a neutral gravity knob is ever measured to be safe, it will land
  beside the chute, not here.

## See also

* [Weather](weather.md) -- the day-time clock and the sky, which this page does not touch.
* [Reflex overdrive](reflex-overdrive.md) -- the real-time speed buff, and the measurements behind
  keeping clocks out of combat.
* [World queries](world-queries.md) -- the other half of the `Open77.world` table.
