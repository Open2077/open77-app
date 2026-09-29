# Vehicle drive-by

Control handheld combat from a vehicle and read that action from client or
server Lua. Passengers use window combat; drivers use the game's native car
or motorcycle combat pose. Open77 replicates aim, weapons, shots and reload.

Available in **Open77 Unstable `2.31.21-unstable+op77.118`**, protocol **1.43**.
Use the matching client, server and animation assets. Passenger support first
shipped in .117 (protocol 1.42); car/motorcycle drivers and the additional state
fields below require .118. Stable does not include this feature yet.

Supported passenger seats are `front_right`, `back_left` and `back_right`.
The driver uses `front_left`, including on motorcycles. Draw a suitable handheld
weapon using the normal game controls. Enabling drive-by permits that action;
it does not equip a weapon, start shooting or force an animation. Driver-operated
mounted weapons have their own [vehicle weapon APIs](vehicle-weapons.md).

## Functions and permissions

All functions belong to `Open77.players`. Use a **network player ID**, not a
native entity handle. There are no drive-by global aliases.

| Runtime | Function | Manifest permission | Result |
|---|---|---|---|
| Server | `setDriveByEnabled(playerId, enabled)` | `players.driveby` | `true` on acceptance; otherwise `false, reason`. |
| Server | `getDriveByState(playerId)` | `players.life.read` | State table, or `nil, reason`. |
| Server | `isDriveByEnabled(playerId)` | `players.life.read` | Policy boolean, or `nil, reason`. |
| Server | `isInDriveBy(playerId)` | `players.life.read` | Action boolean, or `nil, reason`. |
| Client | `setLocalDriveByEnabled(enabled)` | `players.driveby` | `true` on acceptance; otherwise `false, reason`. |
| Client | `getDriveByState(playerId?)` | `players.read` | State table, or `nil, reason`. |
| Client | `isDriveByEnabled(playerId?)` | `players.read` | Policy boolean, or `nil, reason`. |
| Client | `isInDriveBy(playerId?)` | `players.read` | Action boolean, or `nil, reason`. |

Server reads require a positive connected player ID. On the client, omit the ID
or pass integer `0` to read the local player. Pass no argument rather than `nil`.
Remote client reads require a player known to that client.

`enabled` and `active` answer different questions. An enabled player can be on
foot; an exiting player can already be disabled. Test a boolean read against
`nil` to detect an error: a returned `false` is a valid answer.

## Server example: an admin policy command

Use server policy for gameplay rules such as a race, a safe zone or a restrained
player. Decide the rule from server-owned state before changing it.

Create `open77.lua`:

```lua
resource "driveby_rules"
version "1.0.0"
auto_start true

server_script "server/main.lua"
permissions { "players.driveby", "players.life.read" }
```

Then `server/main.lua`:

```lua
RegisterCommand("driveby", function(source, args)
    local playerId = tonumber(args[1])
    local action = args[2]
    if not playerId or playerId <= 0 or playerId % 1 ~= 0
        or (action ~= "off" and action ~= "on" and action ~= "status") then
        print("Usage: driveby <playerId> <off|on|status>")
        return
    end

    if action ~= "status" then
        local ok, reason = Open77.players.setDriveByEnabled(playerId, action == "on")
        if not ok then
            print("Cannot change drive-by: " .. tostring(reason))
            return
        end
    end

    local state, reason = Open77.players.getDriveByState(playerId)
    if not state then
        print("Cannot read drive-by: " .. tostring(reason))
        return
    end
    print(("Player %d: allowed=%s, phase=%s, available=%s")
        :format(playerId, tostring(state.enabled), state.phase, tostring(state.available)))
end, true)
```

Run `driveby 12 off`, `driveby 12 on` or `driveby 12 status` in the dedicated
server console, replacing `12` with the player's ID. Players running this
restricted command need the ACL right `command.driveby`; see
[command permissions](server-acl.md). The example prints results to the server log.

For an existing gamemode, put these calls at the start and end of its activity:

```lua
local function restrictPassenger(playerId)
    local ok, reason = Open77.players.setDriveByEnabled(playerId, false)
    if not ok then print(reason) end
    return ok
end

local function releasePassenger(playerId)
    local ok, reason = Open77.players.setDriveByEnabled(playerId, true)
    if not ok then print(reason) end
    return ok
end
```

If a respawn or revive is pending, the server can return
`transition_in_progress`. Re-evaluate your rule and retry after that transition
finishes.

## Client example: a local restriction

Use the client setter for a local mode or UI that should temporarily suppress
passenger combat. The server's policy still applies.

For this client-only example, create `open77.lua`:

```lua
resource "driveby_local_demo"
version "1.0.0"
auto_start true

client_script "client/main.lua"
permissions { "players.driveby", "players.read" }
```

Then `client/main.lua`:

```lua
RegisterCommand("driveby_local", function(_, args)
    if args[1] ~= "off" and args[1] ~= "on" then
        print("Usage: driveby_local <off|on>")
        return
    end

    local ok, reason = Open77.players.setLocalDriveByEnabled(args[1] == "on")
    if not ok then
        print("Cannot change local drive-by: " .. tostring(reason))
        return
    end

    local enabled, readReason = Open77.players.isDriveByEnabled()
    if enabled == nil then
        print("Cannot read local policy: " .. tostring(readReason))
    else
        print("Drive-by currently allowed: " .. tostring(enabled))
    end
end, false)
```

Run `driveby_local off`, then `driveby_local on` in the client console.
`on` releases this resource's restriction; the effective result can remain
`false` while a server rule or another client resource blocks drive-by.

Call the client setter from a running resource callback or thread. A call made
at script top level while the resource is still preparing returns
`false, "resource_not_running"`.

## Read the action and its phases

The usual sequence is `none` → `entering` → `active` → `exiting` → `none`.
`isInDriveBy` and the state's `active` field include **entering and exiting**.
Use `state.phase == "active"` for the window-combat loop specifically; even that
phase does not mean the player fired a shot on this frame.

For example, add this to a client resource with `players.read` to report local
phase changes without printing every frame:

```lua
CreateThread(function()
    local previous
    while true do
        local state, reason = Open77.players.getDriveByState()
        local status = state and (state.available and state.phase or "unavailable")
            or ("error: " .. tostring(reason))
        if status ~= previous then
            print("Passenger action: " .. status)
            previous = status
        end
        Wait(250)
    end
end)
```

To inspect another player, pass their network ID. This helper works on either
runtime with its corresponding read permission:

```lua
local function describePassenger(playerId)
    local state, reason = Open77.players.getDriveByState(playerId)
    if not state then return nil, reason end
    if not state.available or state.phase ~= "active" then return nil end

    return ("Player %d: window combat in vehicle %d, seat %s")
        :format(playerId, state.vehicle, state.seat)
end
```

| State field | Meaning |
|---|---|
| `enabled` | Effective policy visible to this runtime. |
| `available` | Action data is available. Remote client observations also require a fresh, presented occupant body. It does not imply an active action. |
| `active` | `true` for `entering`, `active` or `exiting`. |
| `phase` | `none`, `entering`, `active` or `exiting`. |
| `vehicle` | Canonical Open77 vehicle ID; absent for `none`. |
| `seat` | `front_left` for a driver; `front_right`, `back_left` or `back_right` for a passenger. Absent for `none`. |
| `mode` | Protocol 1.43: `passenger`, `car_driver` or `bike_driver`. Interpret only when `active` is true; inactive data defaults to `passenger`. |
| `driverYaw`, `driverPitch`, `driverRoll` | Protocol 1.43: native driver aim angles in degrees relative to the seated pose; zero for passengers and inactive data. These are animation inputs, not world-space entity rotation. |
| `sequence` | Action sequence; zero for `none`. |
| `duration` | Native entry/exit duration in seconds; zero for `none` and `active`. |
| `elapsed` | Entry/exit progress in seconds, clamped to `duration`; zero outside those transitions. |

The server validates actions against the player's current seat, life and routing
bucket. Missing or stale action data produces `phase == "none"` with
`available == false`; it does not prove the player performed an exit animation.
These reads are observations, not a history or a per-shot event stream. The
client's fresh local `none` state may still have `available == true`.

### Identify a driver or motorcycle rider

The same reads and restrictions cover all three modes. Driver actions have
`phase == "active"` while handheld combat is active, with `duration == 0` and
`elapsed == 0`; the timed `entering`/`exiting` phases belong to passenger window
combat. A driver can use either first- or third-person camera locally; observers
receive the native third-person pose.

```lua
-- Server callback; requires players.life.read.
RegisterCommand("riderstate", function(playerId)
    local state, reason = Open77.players.getDriveByState(playerId)
    if not state then return print(reason) end
    if not state.available or not state.active then return end

    if state.mode == "bike_driver" then
        print(("Rider %d on motorcycle %d: yaw %.1f, pitch %.1f")
            :format(playerId, state.vehicle, state.driverYaw, state.driverPitch))
    elseif state.mode == "car_driver" then
        print("Armed driver in vehicle " .. state.vehicle)
    else
        print("Passenger window combat: " .. state.seat)
    end
end, true)
```

## Combining resources and cleanup

Each resource owns one restriction per player on its runtime:

- `false` holds that resource's restriction; `true` releases only that hold.
- Repeated `false` calls do not add a counter. If several features in the same
  resource need a hold, combine their conditions before releasing it.
- Stopping or reloading a resource releases its own holds. Other owners remain
  effective; disconnect clears the connection's restrictions.
- Server restrictions survive death, respawn and routing-bucket changes for the
  current connection. A pending revive/respawn can defer resource-stop cleanup.
- The local client combines its own resource restrictions with server policy.
  Server reads and remote client reads cannot reveal another client's local-only
  restrictions. Use the server setter for an authoritative gameplay rule.

Disabling a passenger already in window combat requests a native exit. The
state can remain `exiting` briefly after `enabled` becomes `false`. A successful
setter acknowledges the policy change, not immediate animation completion.
For a driver, disabling requests the native return to ordinary driving; the
remote driver action clears when that state ends.

## Windows and damage

Open77 opens the passenger's window for replicated drive-by presentation, keeps
it open through the exit, and restores the authored window state afterward.
Each passenger has an independent window. Car-driver combat opens both front
windows; motorcycles do not receive a window overlay. Your resource does not
need to toggle vehicle windows or replay weapon shots to implement drive-by.

The occupant's ranged shots are filtered against their own vehicle and its
occupants. The server also rejects ranged hits between occupants of the same
vehicle. Exterior targets continue through the normal combat rules. Drive-by
does not grant general invulnerability to the vehicle or its passengers.

## Failure handling

| Reason | What to do |
|---|---|
| `permission_denied:players.driveby` | Declare the write permission in the resource manifest. |
| `permission_denied:players.read` / `permission_denied:players.life.read` | Use the read permission for the correct runtime. |
| `expected_boolean` (client) / `invalid_argument` (server) | Pass a Lua boolean to the setter. |
| `expected_player_id` (client) | Pass a nonnegative integer; omit the argument or use `0` for self. |
| `player_unavailable` / `player_not_found` | Recheck that the network player exists on this runtime. |
| `session_unavailable` (client) | Wait for an active multiplayer session before reading. |
| `resource_not_running` (client setter) | Call from a running callback/thread, not resource preparation. |
| `transition_in_progress` (server setter) | Re-evaluate the rule after respawn/revive completes, then retry. |
| `owner_limit` | Reduce concurrent resource owners; each player supports up to 64 blocking resources per runtime. |

See the [client players reference](/docs/api/client/open77-players) and
[server players reference](/docs/api/server/open77-players) for individual
function signatures and examples.
