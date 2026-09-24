# Synchronised time and weather

`open77_weather` synchronizes the session's clock and weather. The server owns the canonical state; clients apply it locally.

At server boot the canonical state is `12:00:00`, the weather is `sunny`, and the clock advances at
`timeScale`. A player joining later receives the current time, never the boot time, and joins a
weather transition already in progress at its current point rather than restarting it.

Use this guide if you are writing a resource that needs to read the time, react to weather, or — from
a trusted server resource — change either. The *rate* the world runs at — slow motion for a scripted
beat — is a different lever and has its own page, [Time scale](world-time.md); nothing here slows a
clock. From the server the entry point is
[`Open77.environment.*`](#api-for-a-server-resource), which the host installs everywhere and gates
behind `world.environment`; a routing bucket can hold an environment of its own.

## Network model

```text
server monotonic clock + canonical state
                 |
                 | versioned snapshot / reliable broadcast
                 v
 client request ---- RTT/2 ----> local REDengine projection
                 ^
                 | periodic resynchronisation
```

The snapshot carries `scope`, `authorityEpoch`, `revision`, `secondsOfDay`, `rate`, `frozen`, the
weather name and preset, the transition, the priority, and the deadline of the next random event.
The client measures the round trip of its own request, adds at most two seconds of half-RTT, then
re-anchors its monotonic reference. A mutation broadcast applies immediately; a reply carrying an
older revision of the same epoch is rejected. A new epoch lets a server hot-reload restart at
revision 1 without leaving clients stuck on the previous incarnation.

`scope` names the environment the snapshot describes — `default`, or `bucket:<n>` for a routing
bucket holding an [override](#per-bucket-overrides). A snapshot whose scope differs from the one a
client is projecting is adopted **unconditionally**: it is another world, not a newer reading of
the one the client was in, so the revision rule is suspended for that one packet and resumes inside
the new scope.

Open77 projects the server clock twice a second. It deliberately does not hold REDengine's
`SetPausedState`: two-client runtime testing proved that this flag can also slow gameplay and
vehicle physics. Every pass reads the live game clock and writes it only when it has really
drifted from the projection (more than `timeDriftToleranceSeconds`, 120 game seconds by default),
because every write is a world time-jump. At the engine's natural rate of 8 game seconds per real
second nothing is ever written once a player is in the world. A player who joins late receives the
first snapshot in the main menu; the save that loads next carries its own time of day, and the next
pass corrects it — within half a second, whatever the save said. At midnight,
circular arithmetic turns the roll over to `00:00` into normal forward motion. A small step back
caused by a late packet is ignored, so REDengine's "next occurrence" semantics are not triggered —
which would jump a whole day.

**`weather.time.freeze` has a cost.** Nothing native holds the clock, so the engine keeps advancing
at 8x underneath a projection that does not move; every client re-asserts the frozen time each
time the drift passes the tolerance — every 15 s at the defaults, a two-minute step back. Each step
is a world time-jump, the kind that makes the streamer re-resolve world nodes and can bring back
destroyed props. Freeze the clock for what needs a fixed sky (a pinned match, a recording); leave
it running at `8` otherwise, where synchronisation is free.

## Configuration

Edit `resources/system/open77_weather/shared/config.lua`:

- `startupTime` — `12:00:00` by default;
- `timeScale` — game seconds per real second (`4.0`);
- `syncIntervalMs` — full resynchronisation (`15000`);
- `applyIntervalMs` — projection frequency (`500`);
- `heartbeatIntervalMs` — authoritative server broadcast (`5000`);
- `environmentEnforceIntervalMs` — local lock and preset check (`5000`);
- `randomWeather` and `initialWeatherDurationSeconds`;
- `presets` — weight, real min/max duration, and transition for each weather.

The file is shared and therefore public. It must hold no secret, key, or ACL.

Presets supplied: `sunny`, `lightclouds`, `cloudy`, `rain`, `heavyclouds`, `fog`, `pollution`, and
`sandstorm`. The REDengine `24h_weather_*` values are still accepted server-side.

## Server commands and ACL

From the in-game Open77 terminal or the dedicated console:

```text
weather.status
weather.time.set 06:45
weather.time.freeze
weather.time.resume
weather.rate 12
weather.set fog 25
weather.random off
weather.next
```

`weather`, `weather.status`, and `weather.time` are read-only. Every other command uses
`RegisterCommand(..., true)` and is authorised against the player's authenticated public identity.
For example:

```json
{
  "permissions": ["command.weather.*"]
}
```

The client DLL exposes no local `time.*` or `weather.*` command, so every interactive change goes
through the server and its ACL. The network events the resource accepts serve only to request a
snapshot: no client mutation event exists.

## API for a server resource

`Open77.environment.*` is the API to write new code against. It is installed by the **host**, in
every server VM, and is gated by the `world.environment` manifest capability:

```lua
-- permissions { "world.environment" }
local state, reason = Open77.environment.setTime(23, 0, 0)
if not state then return print("no environment authority here: " .. reason) end
Open77.environment.setTimeFrozen(true)
Open77.environment.setWeather("rain", 20)
Open77.environment.setWeatherFrozen(true)     -- pins the preset: no more random draws
print(("%02d:%02d %s"):format(state.hour, state.minute, state.weather))
```

| Call | Effect |
|---|---|
| `setTime(hour, minute, second, bucket?)` | Sets the authoritative clock. |
| `setTimeFrozen(frozen, bucket?)` | Stops or resumes it at its current reading. |
| `setTimeRate(rate, bucket?)` | Game seconds per real second, `0`–`120`. |
| `setWeather(preset, transitionSeconds?, bucket?)` | Applies a preset over a `0`–`300` s transition. |
| `setWeatherFrozen(frozen, bucket?)` | Pins or releases the weighted random scheduler. |
| `getState(bucket?)` | The canonical state; see [the field table](server-api.md#time-and-weather). |
| `clearBucket(bucket)` | Retires a per-bucket override. |

Every call answers a state table, or `nil` plus a stable reason. The one worth branching on is
`environment_unavailable`: it means `open77_weather` is not running on this server, which
`resources.load` can cause silently — a resource that is not in that allowlist is never started
and never logged.

`setWeatherFrozen` deserves a word, because the name means something different on each side. On
the **client** it is an unconditional lock that stops a vanilla controller or a quest from
submitting its own preset, and it is not an operator choice. On the **server** it means *pin the
preset*: the weighted random scheduler stops drawing, so the sky stays where it was put. That is
the half a gamemode actually wants, and it is the same switch `weather.random off` throws.

### Why the authority is a resource and not a host service

Every other authoritative registry the platform owns — loot, vehicles, NPCs, props, effects,
elevators — is a C# service, because the host is the only thing that can replicate it. Time and
weather are not in that shape, and that was measured before this API was designed: **nothing in
the host can move a sky.** The only code that touches the engine is `Open77.environment.*` in the
*client* VM, and that projection ships as `client/main.lua` of this same resource. Lifting the
clock into C# would therefore buy no platform guarantee it does not already have — a server whose
`resources.load` omits `open77_weather` loses the projection along with the authority, and a
host-held clock nobody applies is a clock nobody sees. It would only duplicate an implementation
that already survives a reload, answers late joiners and is covered by tests.

The host provides the capability-gated API and returns `nil, reason` when authority is unavailable. The resource implements the operations through synchronous `environment.*` exports in `server/main.lua`.

### Per-bucket overrides

A routing bucket is a separate world, so a race gamemode at night and a freeroam bucket at noon is
one server. Pass `bucket` to any setter:

```lua
Open77.environment.setTime(23, 0, 0, 5)       -- bucket 5 only
Open77.environment.setWeather("rain", 0, 5)
local night = Open77.environment.getState(5)  -- scope = "bucket:5"
local day   = Open77.environment.getState()   -- scope = "default", buckets = { 5 }
Open77.environment.clearBucket(5)
```

An override is created on first use, seeded from the default environment as it reads at that
moment — so a gamemode that only pins the time keeps whatever weather the session had, and an
override created at dusk does not restart at noon. At most 64 exist at once
(`too_many_environment_overrides`).

Two things this costs, both measured rather than assumed:

- **The revision counter is now global.** A client accepts a snapshot only when its revision is at
  least the last one it applied. Had each scope counted for itself, a player moving from a bucket
  sitting at revision 40 into one whose last change was revision 12 would have rejected that
  bucket's snapshots — heartbeats included — forever, and stayed on the sky of a bucket they had
  left. One monotonic counter shared by every scope makes every snapshot a client can receive newer
  than every snapshot it has already applied. A player who changes bucket is additionally re-synced
  individually, with a fresh revision drawn on the scope being entered.
- **A broadcast becomes a fan-out.** While no override exists the authority still sends one
  reliable broadcast to `-1` per mutation and per heartbeat, exactly as before. The moment one
  exists a broadcast is wrong — it would reach the overridden bucket too, with a higher revision,
  and clobber it — so the default scope switches to one send per connected player. That is the
  price of an override, not of the feature existing, and a server that never creates one pays
  nothing.

### `onEnvironmentChanged`

The authority publishes a host-wide `onEnvironmentChanged` after every real change — never on the
heartbeat, and never on a client's sync request. It is a platform name: every resource receives it
with no capability at all, and no resource can publish it (`TriggerEvent` answers `false,
"reserved_event"`).

```lua
AddEventHandler("onEnvironmentChanged", function(state)
    -- state is exactly what getState() returns, plus `reason`.
    print(("%s in %s at %02d:%02d (%s)")
        :format(state.weather, state.scope, state.hour, state.minute, state.reason))
end)
```

`reason` names the door the change came through: `command_*` for a console command, `api_*` for
`Open77.environment.*`, `server_resource_*` for the legacy events below, `random_weather` for a
scheduler draw, and `bucket_cleared` when an override is retired.

### The older doors, still open

These events are local to the server runtime and are unchanged:

```lua
TriggerEvent("open77:weather:setTime", 20, 15, 0)
TriggerEvent("open77:weather:setRate", 4)
TriggerEvent("open77:weather:setFrozen", false)
TriggerEvent("open77:weather:setWeather", "rain", 30)
TriggerEvent("open77:weather:setRandomEnabled", true)
```

To observe the state:

```lua
AddEventHandler("open77:weather:state", function(state)
    print(("weather=%s revision=%d"):format(state.weather, state.revision))
end)

TriggerEvent("open77:weather:requestState")
```

`open77:weather:timeChanged` and `open77:weather:weatherChanged` report the precise cause. These
APIs are meant for trusted server resources; server scripts are not distributed to players.

**What `world.environment` does and does not gate, stated plainly.** It gates the platform facade,
which is where new code is told to go. It does **not** close the two older doors: `open77:weather:*`
is deliberately not a reserved event name — reserving it would break every resource already using
the block above — so any server resource can still publish those, exactly as it always could. The
`environment.*` exports the facade calls are likewise the resource's public surface and reachable
with `Open77.exports.callSync`. Nothing was widened here; the capability is a door marked for new
callers, not a lock on the room. Closing the older doors means reserving the `open77:weather:`
prefix on the bus and is a breaking change with its own decision to make.

## API for a client resource

Listening, with no dependency:

```lua
AddEventHandler("open77:weather:updated", function(state)
    print(state.weather, state.rate, state.frozen)
end)
```

A one-off read through an export:

```lua
CreateThread(function()
    local promise, reason = Open77.exports.call("open77_weather", "getState")
    assert(promise, reason)
    local state = promise:await()
    print(string.format("%02d:%02d:%02d", state.hour, state.minute, state.second))
end)
```

Available exports:

- `isReady()` — has the first snapshot arrived?
- `getState()` — time predicted at the moment of the call, and the weather state, plus the `scope`
  and `bucket` this client is currently projecting;
- `requestSync()` — forces a reliable resynchronisation request.

The native **client** `Open77.environment` table (`getTime`, `setTime`, `setTimeFrozen`,
`setWeather`, `setWeatherFrozen`, `isWeatherFrozen`) is guarded by the `world.environment`
permission and is unchanged. It exists to implement the projection, not for ordinary gameplay
scripts, and it is a different API from the server table of the same name: the client one drives
the local engine, the server one drives the authority every client projects.

## Random weather events

The server makes a weighted draw that excludes the current weather, applies the new preset's
transition, then schedules its real min/max duration. The seed comes from the process's monotonic
clock at the first tick, so two boots do not systematically replay the same sequence.
`weather.random off` suspends the draws without changing the current weather; `weather.random on`
cleanly reschedules the deadline.

## Deployment

The resource sits under the configured `resources.root`. The server watcher prepares its VM,
rebuilds the signed set, and distributes only the manifest, the client and shared scripts, and this
README. The new client DLL is required for the `Open77.environment` primitive; if it is not loaded
yet, the resource stays inert and explicitly asks for Cyberpunk to be restarted.
