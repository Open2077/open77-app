# Travel

Moving the local player's body, and knowing when it has really arrived.

Everything on `Open77.travel` is client-side and requires the `player.travel` permission.
That permission belongs only in operator-audited resources: the native lab commands these
replace are refused while a multiplayer session is active, so an ACL-checked server
command asking a trusted client resource to call them is the intended path.

If the **server** is the one deciding where somebody goes, do not reach for this page —
use [`Open77.players.teleport`](server-api.md#moving-a-player), which drives exactly the
machinery described below and answers the server with the result.

## The two teleports, and why there are two

```lua
Open77.travel.teleport(x, y, z, heading)                   -- fire and forget
Open77.travel.teleportAndSettle({ x = x, y = y, z = z }, heading)  -- Promise
```

`Open77.travel.teleport` queues one engine request and returns. It checks a finite
transform and a live player, and that is all it knows. In particular **it knows nothing
about streaming**, and that gap is not academic:

- The engine executes the teleport on a later tick, so a position sampled in the frame
  that asked for it is the old one.
- If the floor at the destination has not streamed in yet, the body falls through it.
- Cyberpunk's own `Failsafe/PlayerTeleportationIfFallsUnderWorld` then returns the player
  to the last place the engine considers safe — the save's spawn of record, which can be
  kilometres away — and nothing tells the caller.

This was measured twice in production, in two different shapes, and both records live in
`client/src/api/PlayerTravelSettle.hpp`. In the second one the same destination was
re-requested five times and every attempt landed at the same wrong point, three kilometres
away, identical to the centimetre.

`Open77.travel.teleportAndSettle` is the same teleport with the answer attached.

```lua
CreateThread(function()
    local arrival, reason = Open77.travel.teleportAndSettle(
        { x = 1669.75, y = -739.12, z = 49.86 }, 180):await()
    if not arrival then
        print("did not arrive: " .. tostring(reason))
        return
    end
    print(("%s after %d attempts, %d pins, %d ms")
        :format(arrival.state, arrival.attempts, arrival.pins, arrival.elapsedMs))
end)
```

It resolves with `{ state, x, y, z, attempts, pins, elapsedMs }`:

| `state` | What it means |
|---|---|
| `settled` | The body was on the point, grounded, and in no fall state for **three consecutive frames**. This is the answer. |
| `near` | The 1.5 s window closed with the body on the point but never reported grounded — a mark on a prop, or a very slow stream-in. An honest success with a weaker claim. |

and rejects with a stable reason:

| Reason | Meaning |
|---|---|
| `settle_timeout` | The body never stood at the destination inside the budget (default 12 s, `options.timeoutMs` is 1000..30000). |
| `settle_superseded` | Another `teleportAndSettle` started before this one finished. There is one body, so there is one session. |
| `settle_cancelled` | `Open77.travel.cancelSettle` stopped the watch. The body stays wherever it currently is. |
| `player_unavailable`, `teleport_unavailable`, `invalid_transform` | The teleport itself was refused; the watch never started. |

## What "settled" is actually testing

**There is no streaming query anywhere in the engine surface Open77 can reach.**
`StreamingSector`, `worldStreaming`, `IsStreamed`, `RequestStreaming`, `StreamingWorld` and
`worldRuntimeScene` were all swept for; none of them is callable. So "is the destination
streamed?" is not a question that can be asked, and the API deliberately does not pretend
otherwise.

What can be observed is the body, and that turns out to be the question a caller really
has: *can I let go of this yet?* The watch asserts three things together, every frame:

1. **on the point** — within 4 m horizontally and 6 m vertically of the mark;
2. **grounded** — the player state machine says so;
3. **not falling** — the fall state is `None`. Not "not a lethal fall": the second
   production trace read `fall=Safe` while the body sank through an unloaded floor.

All three, for three consecutive frames. A single near sample proves nothing; the trap
showed the body at the wrong point twice before reading `grounded=yes`.

When the body is on the point but sinking — not grounded, and more than 0.75 m below the
mark — the teleport is **re-issued every 250 ms** for up to 7 s. That resets the fall
before the failsafe can fire and keeps the engine's streaming prefetch aimed at the mark,
until the floor arrives. `pins` in the result counts how many times that happened; a
non-zero `pins` means the destination was not resident when you asked for it.

If the body ends up somewhere else entirely when the window closes, the whole placement is
re-issued, up to the session's timeout.

The same watch drives the respawn placement in `LifeReplication` — one implementation, one
set of constants, both paid for by the same two incidents.

## Raw settle tickets

`teleportAndSettle` is a thin wrapper over three natives, which are there for a caller who
wants to drive the poll itself:

```lua
local ticket, reason = Open77.travel.beginSettle(x, y, z, heading, timeoutMs)
local status         = Open77.travel.settleStatus(ticket)  -- state, reason, x, y, z, attempts, pins, elapsedMs
Open77.travel.cancelSettle(ticket)
```

`settleStatus` returns `nil, unknown_settle_ticket` for a ticket that is neither the live
session nor the last one to finish.

## Noclip and the map pick

```lua
Open77.travel.setNoclip(enabled)
Open77.travel.isNoclip()
Open77.travel.setNoclipSpeed(metresPerSecond)   -- 0.1 .. 500
Open77.travel.getNoclipSpeed()                -- current base speed, including wheel changes
Open77.travel.setMapPick(enabled)
Open77.travel.isMapPick()
```

Noclip moves through the same teleport facility and never takes ownership of the player's
movement component. It is camera-relative, uses the player's configured forward/back/left/right
keys, and submits one bounded movement request per running game frame. Releasing a movement
key does not leave a target that continues to converge.

- Space / Ctrl: ascend / descend; mouse wheel: adjust base speed (20% per notch).
- Shift: 4x boost; Alt: 0.25x precision; both can be combined.
- XInput: left stick moves, right stick looks, triggers ascend/descend, LB boosts and RB slows.
- Diagonal movement is normalized. Menus, focused WebUIs, the developer console and loss
  of window focus suspend movement input; the held position is retained.
- Native movement/combat restrictions belong to noclip and are released on exit. It does
  not heal the player, pause world time or clear restrictions belonging to other resources.
- Activation requires a living, attached player outside vehicles and workspot animations.
  `setNoclip` returns `false, reason` if refused. Death, body replacement or entering a vehicle
  stops flight. Stopping the owning resource releases flight on the next running frame.
- Only the resource which enabled noclip can disable it. All travel calls still require
  `player.travel`; a gamemode must also enforce server-side ACL before delegating admin use.

The admin package retains `/admin.self.noclip`, `/admin.self.fly` and `/admin.self.speed`.
Its compact HUD shows current speed and controls without capturing input. Native wheel
changes are reflected in both admin interfaces. The diagnostic `noclip.state` is read-only
and reports the controller, owning resource, paused input and safety guards.

`setMapPick` only lets the world map publish a double-clicked point;
it moves nobody, and it does not bypass the ACL-checked server command that consumes the
point.
