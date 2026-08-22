# Synchronised time and weather

`open77_weather` is the single authority for a session's time and weather. Every player sees the
same clock and the same sky, and neither drifts: the server holds the canonical state and clients
project it locally.

At server boot the canonical state is `12:00:00`, the weather is `sunny`, and the clock advances at
`timeScale`. A player joining later receives the current time, never the boot time, and joins a
weather transition already in progress at its current point rather than restarting it.

Use this guide if you are writing a resource that needs to read the time, react to weather, or — from
a trusted server resource — change either.

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

The snapshot carries `authorityEpoch`, `revision`, `secondsOfDay`, `rate`, `frozen`, the weather
name and preset, the transition, the priority, and the deadline of the next random event. The client
measures the round trip of its own request, adds at most two seconds of half-RTT, then re-anchors
its monotonic reference. A mutation broadcast applies immediately; a reply carrying an older
revision of the same epoch is rejected. A new epoch lets a server hot-reload restart at revision 1
without leaving clients stuck on the previous incarnation.

Open77 projects the server clock twice a second. It deliberately does not hold REDengine's
`SetPausedState`: two-client runtime testing proved that this flag can also slow gameplay and
vehicle physics. Periodic absolute correction prevents long-term clock drift without changing the
simulation rate. At midnight,
circular arithmetic turns the roll over to `00:00` into normal forward motion. A small step back
caused by a late packet is ignored, so REDengine's "next occurrence" semantics are not triggered —
which would jump a whole day.

## Configuration

Edit `resources/open77_weather/shared/config.lua`:

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

These events are local to the server runtime:

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
- `getState()` — time predicted at the moment of the call, and the weather state;
- `requestSync()` — forces a reliable resynchronisation request.

The native `Open77.environment` table (`getTime`, `setTime`, `setTimeFrozen`, `setWeather`,
`setWeatherFrozen`, `isWeatherFrozen`) is guarded by the `world.environment` permission. It exists to
implement the authority, not for ordinary gameplay scripts.

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
