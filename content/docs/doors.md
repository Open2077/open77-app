# Networked world doors

`open77_doors` synchronizes streamed native doors through a server-owned registry.
Automatic doors react to players in the same routing bucket. Native opening
animations, sounds and collision are retained. Elevator landing doors follow
the authoritative cabin instead of opening over an empty shaft.

## Installation

### Context menu administration

With `open77_admin` and `open77_contextmenu`, ALT-click a streamed door to copy
its exact ID, inspect its state, open/close it manually, change its lock/seal,
or restore automatic proximity opening. The menu framework defines no actions;
the admin package supplies them. See [context menu integrations](context-menu.md).

Door ID/inspector access requires `command.admin.dev.doors.inspect`; controls
require `command.admin.dev.doors.control` (and `command.admin` for the UI).
The restricted command is `/admin.dev.doors.control <hex-id> <open|close|lock|unlock|seal|unseal|automatic>`.
Its server-only cooperative `open77_doors.adminControl(playerId, id, action)`
export accepts **only** `open77_admin`, rechecks the actual operator's ACL,
and uses the server's routing bucket and 12m distance limit. It does not let a
client choose a bucket or claim somebody else's resource-owned door.
Manual opening still honors locks/seals and auto-close; unlock/unseal first when
needed. Lift opening remains elevator-controlled and is not offered manually.

### Runtime requirements

Availability: **client and server release 2.31.13+op77.58**, published on the CDN.
Older clients do not contain the native door projection bridge.
Install matching client scripts/binary and the `open77_doors` system resource
before enabling this feature. Protocol compatibility alone is not a feature check.

Use a client containing the native door projection bridge and a server supporting
[server exports](server-exports.md). Add this dependency to your gamemode:

```lua
dependency 'open77_doors >=1.0.0'
```

Freeroam includes it. The service depends on `open77_elevators`. If your server
uses an explicit `resources.load` allowlist, include both system resources.
Other gamemodes can opt in without importing Freeroam.

No new network protocol version is required. Deploying only Lua is **not** enough
for clients which do not have the new projection bridge.

## Discovery and authority

The client periodically discovers real `Door` entities and their live
`DoorControllerPS` within 80 metres. It proposes an opaque entity ID, position,
door type and optional elevator topology. The server validates player proximity,
rate and capacity, selects the routing bucket, and owns all subsequent state.

- IDs are **strings** such as `0xFC85EAE29622BAC2`, never numeric Lua values.
- The same world door in two buckets has two independent states.
- Discovered doors start closed, unlocked and unsealed. A player's quest/save
  locks are not imported into the multiplayer world.
- Automatic doors open within 3.5 m of an authorized player, remain open within
  5 m, and close 1.2 seconds after the last qualifying player leaves.
- Interactive doors submit a request; they cannot change everyone else's state
  directly. Closing through a player standing within 1.5 m is rejected.
- Landing doors open only when the linked elevator is powered, idle, at that
  floor and not marked `doorsClosed`. An unresolved link remains closed and
  discovery retries when the elevator registry becomes available.
- Late streaming applies the current state quietly. Later changes animate;
  an unchanged state does not restart its animation or sound.

Discovery is not a world attestation: a dedicated server cannot independently
prove an arbitrary game-record hash. Security-sensitive servers should disable
discovery and register their approved doors from server-owned data. Static
scenery without a live door controller is not moved or removed. NPC-only local
proximity is not an authoritative automatic-opening trigger.

For player elevator trips use native buttons or the elevator resource's
`requestCall` / `requestFloor` exports: native arrival confirms completion to
the server. Administrative timed `goTo` operations keep their existing deadline
semantics; do not configure a deadline shorter than the native travel time.
Door synchronization does not repair a quest-specific cabin's authored geometry
or floor markers.

## Calling the server API

Browsable function reference: [server door exports](https://open2077.net/docs/api/server/resource-open77-doors)
and [client door exports](https://open2077.net/docs/api/client/resource-open77-doors).

The service exposes asynchronous **server exports**, not a second mutable
client-side `Open77.doors` registry. The native client namespace remains useful
for inspecting local entities. Use exports for synchronized state:

```lua
local function doors(method, ...)
    local pending, error = Open77.exports.call('open77_doors', method, ...)
    if not pending then return nil, error end
    return pending:await()
end

CreateThread(function()
    local id = '0xFC85EAE29622BAC2' -- replace with a captured world door ID
    local door, error = doors('get', id, 0)
    if not door then print(error or 'Door has not been discovered'); return end

    -- Claim the discovered door for this resource. Ownership uses the caller
    -- identity supplied by the runtime, never an owner string in the arguments.
    local owned, reason = doors('register', {
        id = id, bucket = 0, position = door.position,
    })
    if not owned then print(reason); return end
    local ok, reason = doors('configure', id, 0, {
        automatic = true, autoClose = true,
        openRadius = 3.5, closeRadius = 5.0, closeDelay = 1.2,
        defaultAccess = false,
    })
    if not ok then print(reason); return end
    -- Example: grant the authenticated server player ID 12 access.
    doors('setAccess', id, 0, 12, true)
end)
```

Run awaited calls from a thread, event or command handler, not at file scope.
Do not forward arbitrary client arguments to privileged server exports.

### Server exports

| Export | Arguments | Result / purpose |
| --- | --- | --- |
| `get` | `id, bucket=0` | Door snapshot or nil. |
| `list` | `bucket=nil, offset=0, limit=16` | `{doors, total, nextOffset?}`; limit 1–16. |
| `near` | `position, bucket, radius` | `{doors, total, truncated}`; nearest 16, radius ≤120 m. |
| `register` | `descriptor` | New or claimed door snapshot; fails if another resource owns it. |
| `configure` | `id, bucket, patch` | Atomic validated update; `true` or `false, reason`. |
| `setOpen` | `id, bucket, boolean` | Set a non-lift door target state. Disable automatic mode for persistent manual control. |
| `setLocked` | `id, bucket, boolean` | Lock/unlock; locking closes the door. |
| `setSealed` | `id, bucket, boolean` | Seal/unseal; sealing closes the door. |
| `setAutomatic` | `id, bucket, boolean` | Enable/disable server player-proximity opening. |
| `setAccess` | `id, bucket, playerId, booleanOrNil` | Grant, deny, or remove a player override. |
| `linkElevator` | `id, bucket, elevatorId, floor` | Link a registered landing door to a valid same-bucket lift and zero-based floor. |
| `remove` | `id, bucket` | Release a door owned by this resource. Discovery may subsequently adopt it again. |
| `setDiscoveryEnabled` | `boolean` | Stop/start accepting new discovered doors; existing registered doors remain managed. |
| `changes` | `cursor` | `{cursor, reset, events}`; up to eight events per page. |

`register` descriptors require `id` and `position={x,y,z}` for a new door;
`bucket` defaults to zero. Optional `automatic`, `autoClose`, `lift`,
`elevatorId` and `elevatorFloor` describe its initial topology. Claiming an
existing door preserves topology and state; configure it separately.

`configure` accepts only `open`, `locked`, `sealed`, `automatic`, `autoClose`,
`defaultAccess`, `openRadius`, `closeRadius`, `closeDelay`. Radii are 1–12 m,
closing radius must not be smaller than opening radius, and delay is 0.2–60 s.
An invalid field rejects the entire patch. Locked/sealed doors cannot stay open.
Lift doors reject direct open/automatic control, including from their owner.

An explicit per-player denial overrides `defaultAccess`. A global lock or seal
blocks everyone, including granted players. This is a shared physical door:
once it opens for an authorized player, another player can follow through it.
Door permissions are not an anti-tailgating collision boundary.

Owners are resource name + runtime generation. A restart/stop releases its
doors and rules. Player-specific grants are cleared on disconnect. The registry
is in memory; initialize durable rules from your own resource/database at start.

### Observing server changes

`changes(cursor)` offers a bounded data-only feed compatible with isolated
server Lua VMs. Events contain `cursor`, `kind` (`changed`, `removed`, `request`),
`door`, `reason` and optional `value`. For `request`, reason is the authenticated
player ID and value is the requested open boolean. Read subsequent pages using
the returned cursor. When `reset` is true, rescan `list` and resume from the
returned cursor: older events expired or the service restarted. Do not assume a
cross-resource `AddEventHandler` bus on the server.

List pagination is not a transactional snapshot. Rescan if the registry changes
while traversing pages. Pages are bounded to fit the runtime's export budget.

## Client exports and events

Call `Open77.exports.call('open77_doors', name, ...)` and await as above:

| Export | Arguments | Result |
| --- | --- | --- |
| `get` | `id` | Interested server snapshot or nil; not proof the native object is streamed. |
| `list` | `offset=0, limit=16` | `{doors, total, nextOffset?}` within this client's interest. |
| `requestOpen` | `id, boolean` | Queue player intent; server acceptance arrives separately. |

Client events:

```lua
AddEventHandler('open77:doors:streamedIn', function(id, state) end)
AddEventHandler('open77:doors:updated', function(id, state) end)
AddEventHandler('open77:doors:streamedOut', function(id) end)
RegisterNetEvent('open77:doors:requestResult', function(id, accepted, reason) end)
```

Here "streamed" means server interest, not REDengine object residency. An
interested state can arrive before the native door; the service retries after
the object streams. Snapshots contain ID, bucket, position, revision, open,
locked, sealed, automatic, autoClose, lift, elevatorId and elevatorFloor.

Native `Open77.doors.near(radius)` and `Open77.doors.state(id)` now also expose
`networkInstance`, `elevatorId` and `elevatorFloor` alongside existing local
fields. Local state may briefly lag its authoritative target during transport.
Existing local door mutations return `false, 'server_authority_required'` for
managed doors. Internal projection methods (`setNetworkEnabled`,
`applyNetworkState`, `forgetNetworkState`, `takeNetworkRequests`) are restricted
to the `open77_doors` system resource and are not gameplay APIs.

## Limits and diagnostics

The service bounds the registry to 4096 doors, interest to 256 nearest doors
per player, discovery to 20 proposals/second/player, and requests to
6/second/player. Inactive unowned doors expire after ten minutes out of interest.
State sends retry on queue backpressure; bucket resets precede the new state.

Typical rejections: `too_far`, `access_denied`, `doorway_occupied`,
`elevator_controlled`, `proximity_controlled`, `not_owner`, `invalid_lift`,
`invalid_hysteresis`, `topology_conflict`, `registry_full`, `rate_limited`.

For local validation, `server/server.doors-local.jsonc` enables the explicit
`open77_doors_test` laboratory. It is masterless and loopback-only. Never deploy
that profile as a public server configuration.

The profile uses your local `acl.jsonc`. Grant only the required test commands
to the test account (`command.doors.test.rule`, and optionally
`command.elevator.goto` / `command.elevator.list`). Do not publish identities,
private keys or a permissive test ACL with a server release.
