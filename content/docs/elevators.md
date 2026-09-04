# Network elevators

Open77 keeps Cyberpunk 2077's native moving-platform motion, sounds, collision and floor markers,
but makes the dedicated server authoritative over every registered elevator.

> **Status:** protocol 1.7, server authority, bucket/chunk streaming, late-join catch-up, Lua APIs
> and the `open77_elevators` reference package are implemented. Two-client runtime acceptance is
> still required for quest-specific elevators and landing-door variants.

## Architecture

```text
button / Lua request
        |
        v
server validation + deadline + revision + bucket
        |
        v reliable ElevatorState
client WorldQuery -> streamed LiftDevice -> native MoveTo / Pause / Unpause / TeleportTo
```

The server advances an elevator even when no client streams it. A client entering its interest
area receives the current authoritative phase and remaining time. Old revisions are ignored.

Elevators are static world entities and are **adopted**, not spawned. Identity includes the routing
bucket, so one native `LiftDevice` can be idle at floor 0 in bucket 0 and moving to floor 4 in
bucket 42 without leaking state between instances.

Spatial interest uses 128 m chunks, streams in at 225 m and streams out at 275 m. The hysteresis
prevents repeated create/remove traffic near a chunk boundary.

## Manifest permissions

```lua
permissions {
    "world.elevators",  -- server adoption and mutation
    "elevators.read",   -- client streamed snapshots
    "elevators.request" -- client button/call intentions
}
```

`world.elevators` is server-only. Client resources cannot call native movement, choose markers,
set deadlines or report an arrival as canonical.

## Server API

### Adopt a native elevator

Use the inspector in game to obtain the `LiftDevice` entity hash and its position:

```lua
local id, reason = Open77.elevators.adopt({
    engineEntity = "0x0123456789ABCDEF",
    position = { x = -1200.0, y = 450.0, z = 20.0 },
    bucket = 0,
    initialFloor = 0,
    floorCount = 3,
    flags = Open77.elevators.flags.powered
          | Open77.elevators.flags.interactionAllowed,
})
assert(id, reason)
```

REDengine hashes are opaque unsigned 64-bit values. Keep them as hexadecimal strings; never pass
them through `tonumber`. The dedicated server does not load REDengine, so type validation happens
when a streamed client resolves the hash. A non-lift hash remains abstract and is never projected.

The adopting resource owns the elevator until `remove`, resource stop or server shutdown. The same
`engineEntity` may be adopted once per bucket. Re-adopting the same structural definition from the
same resource is idempotent: it returns the existing ID and preserves its phase and deadline, which
makes transactional resource reloads safe. A different owner, position or floor count is rejected.

### Read snapshots

```lua
local lift = Open77.elevators.get(id)
for _, other in ipairs(Open77.elevators.all(0)) do
    print(other.id, other.engineEntity, other.phase, other.activeFloor)
end
```

Server snapshots contain:

- `id`, `resource`, `engineEntity`, `bucket`, `chunkX`, `chunkY`, `floorCount`;
- `x`, `y`, `z`, `phase`, `activeFloor`, `originFloor`, `targetFloor`;
- `travelMs`, `pausedRemainingMs`, `flags`, `revision`.

Phases are `idle`, `moving` and `paused`.

### Move, pause and recover

```lua
Open77.elevators.goTo(id, 2, { travelMs = 12000 })
Open77.elevators.call(id, 1, { travelMs = 8000 })
Open77.elevators.pause(id)
Open77.elevators.resume(id)
Open77.elevators.teleport(id, 0) -- administration/recovery
```

`goTo` and `call` schedule the same authoritative native trip. `travelMs` is bounded from 100 ms
to one hour. `teleport` cancels the schedule and aligns all projections to one exact floor marker.

### Flags

```lua
local lift = Open77.elevators.get(id)
lift.flags = lift.flags | Open77.elevators.flags.locked
Open77.elevators.setFlags(id, lift.flags)
```

| Flag | Meaning |
|---|---|
| `powered` | Player requests are accepted when set. |
| `locked` | Player requests are denied when set. |
| `interactionAllowed` | Enables bounded button/call requests. |
| `doorsClosed` | Closes cabin doors; set automatically during normal movement. |

Authoritative arrival clears `doorsClosed`. More detailed roleplay access policy belongs in the
owning server resource and its ACL-restricted commands.

### Server events

```lua
AddEventHandler("onElevatorStateChanged", function(
    id, revision, bucket, phase, activeFloor, targetFloor
) end)

AddEventHandler("onElevatorRemoved", function(id, revision, reason) end)
```

## Client API

The client surface is read-only except for bounded requests:

```lua
local lift = Open77.elevators.get(id)
local streamedStates = Open77.elevators.all()
local closeBy = Open77.elevators.nearby(80.0)

local submitted, reason = Open77.elevators.request(id, 1, "call")
local submitted, reason = Open77.elevators.request(id, 2, "goto")
```

`nearby(radius)` returns the streamed elevators within `radius` metres of the local player.
The radius is clamped to `1..300` and defaults to `100` when omitted.

Client requests accept only `call` and `goto`; `pause` and `resume` are server-Lua-only mutations.
The submission result only means that the packet was queued; the later `ElevatorState` is the
authority decision. The server validates session, life state,
bucket, distance (18 m), flags, floor range and current phase.

Client snapshots add `position`, `remainingMs`, `streamed` and `applied`. While a lift is moving,
`remainingMs` is extrapolated from the most recent authoritative heartbeat, so it decreases between
packets; it is still corrected by every server resynchronization. The reference resource
publishes convenience events:

```lua
AddEventHandler("open77:elevator:streamedIn", function(id, snapshot) end)
AddEventHandler("open77:elevator:updated", function(id, snapshot) end)
AddEventHandler("open77:elevator:streamedOut", function(id) end)
```

## Reference resource and commands

`resources/system/open77_elevators` is auto-started and is both a working package and an example for other
developers. Server resources use the native `Open77.elevators` namespace directly; client-side
convenience exports are also provided. Its restricted commands use the normal Open77 ACL:

```text
elevator.list [bucket]
elevator.adopt <entityHex> <x> <y> <z> <floorCount> [bucket] [initialFloor]
elevator.adopt.player <entityHex> <playerId> <floorCount> [initialFloor]
elevator.goto <id> <floor> [travelMs]
elevator.teleport <id> <floor>
elevator.pause <id>
elevator.resume <id>
elevator.power <id> <on|off>
elevator.lock <id> <on|off>
elevator.remove <id>
```

The chat receives descriptions and parameter completion after `chat:ready`. The client developer
console can inspect current projections with:

```text
resource.emit open77:elevators:probe
resource.emit open77:elevators:nearby 100
```

`nearby` lists streamed native `LiftDevice` hashes and exact positions, including unmanaged lifts,
which makes the output directly usable with `elevator.adopt`.

## Native behavior and late join

A trip uses the vanilla `MovingPlatformMovementDynamic` in time mode and the floor's native
`NodeRef`. This retains physical cabin motion, engine sounds and transport of actors standing in
the cabin. It is not a sequence of transform teleports.

For a late join, Open77 starts the full canonical curve, then uses the native `Pause/Unpause` time
cursor on the next script frame to seek to elapsed progress. A paused server state remains paused.
At authoritative arrival, every client receives `idle` and performs a one-shot exact marker
alignment to remove residual drift.

If REDengine unloads and later recreates the `LiftDevice` while the Open77 state remains in range,
the new native instance is detected, its topology is re-read, and the current state is projected
again even when the server revision did not change. Time spent waiting for native topology is
deducted before the movement cursor is positioned.

Managed `LiftControllerPS.OnGoToFloor` and `OnCallElevator` actions are intercepted before their
vanilla local mutation and converted to `ElevatorRequest`. Unmanaged single-player lifts keep their
normal behavior outside the Open77 interest set. Open77 maps both the streamed `LiftDevice` entity
and its persistent `LiftControllerPS` identity, because some vanilla variants use different IDs for
movement and button actions.

At departure, Open77 closes the configured cabin doors and sends `LiftDepartedEvent` to every floor
terminal so all landing doors lock. At authoritative arrival, the native floor event opens only the
active landing and only the front/left/right cabin sides declared by that floor's
`ElevatorFloorSetup`. Local save authorization cannot make two clients disagree on a managed
landing door; access has already been decided by the server request path.

## Security and limits

- A client cannot provide an engine entity hash, marker, duration, curve, door state or revision.
- Invalid packet enums, floors, positions, times and flags are rejected by both codecs.
- Elevator requests are soft-limited to 8 packets per authenticated session per second.
- A well-formed request that races a stream-out, resource reload or bucket transition is denied
  without disconnecting the player; only malformed protocol payloads are connection violations.
- Server mutation is resource-owned and protected by `world.elevators` plus command ACLs.
- At most 2048 elevators can be adopted per server.
- Floor indexes are vanilla per-lift indexes in `0..floorCount-1`; they are not universal floor IDs.
- Quest lifts may have extra workspots, layers or scripted doors and need explicit runtime testing.

Implementation evidence, Ghidra handlers, known risks and the acceptance matrix are recorded in
[the elevator research note](../docs/research/elevators-and-moving-platform-replication.md).
