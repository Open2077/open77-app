# Entity gizmos (client Lua)

`Open77.gizmos` is a resource-owned, native 3D manipulation service. Use it for
placement editors, spawn-point tools, vehicle staging, scene composition or a
custom editor that listens to transform changes. Handles are drawn by the native
overlay, not a WebUI page. Opening a gizmo does not pause the server.

## Permission and execution side

```lua
permissions { 'gizmos.edit' }
```

All methods require this permission, including queries. The service exists on the
**client** only. It is available to bundled and server-downloaded client resources;
handles and events belong to one exact resource VM and generation. A resource
cannot control another resource's handle, including a same-named resource on a
different host. Handles are invalid after resource stop/reload or world teardown.

The permission grants local editor access, **not server authority**. Never accept
a client transform on the server without checking staff rights, ownership,
distance, routing bucket, target lifetime and value bounds.

## Quick start: a virtual placement point

```lua
local G = Open77.gizmos
local handle

-- Call from your editor's open action, after releasing any WebUI cursor focus.
local function editPoint(position)
    if handle then G.destroy(handle); handle = nil end
    local why
    handle, why = G.create({
        transform = { position = position },
        mode = 'translate', space = 'world',
        snap = { translation = 0.25, rotation = 15, scale = 0.1 },
        timeoutMs = 120000,
    })
    if not handle then return false, why end
    local ok, error = G.activate(handle)
    if not ok then G.destroy(handle); handle = nil end
    return ok, error
end

AddEventHandler('open77:gizmo:change', function(state)
    if state.id ~= handle then return end
    -- Update a placement ghost or numeric inspector here.
    -- state.transform.position, .rotation and .scale are full values.
end)

AddEventHandler('open77:gizmo:commit', function(state)
    if state.id ~= handle then return end
    local p = state.transform.position
    print(('Selected point: %.3f, %.3f, %.3f'):format(p.x, p.y, p.z))
    G.destroy(handle)
    handle = nil
end)
```

A virtual target transforms data only. It does not spawn or move an entity.
The transform defaults to identity rotation and unit scale; position defaults
to `{x=0,y=0,z=0}`. Give it an explicit position in front of your editor camera.

## Target identities and capabilities

```lua
local target = { kind = 'vehicle', id = vehicleId }
local caps, error = Open77.gizmos.capabilities(target)
local id, error = Open77.gizmos.create({ target = target })
```

| `kind` | `id` refers to |
| --- | --- |
| `transform` | No entity; omit `id` or use `0`; requires `transform` |
| `entity` | Receiver-local Open77 entity-registry handle; `0` is own player |
| `puppet` | Receiver-local entity handle, checked to be a puppet |
| `player` | Network player ID; `0` means own player |
| `npc` | Server NPC ID |
| `vehicle` | Server vehicle ID |
| `prop` | Server prop ID |
| `localProp` | Local decorative prop ID owned by the calling resource |

IDs accept **unsigned decimal strings** (full 64-bit) or exact safe numbers up to
`9007199254740991`. Snapshot target IDs are always decimal strings. Keep IDs from
existing APIs as strings; never use `tonumber` to round-trip a network ID. Engine
pointers, TweakDB record names and engine EntityIDs are not accepted identities.

The target must be streamed/attached when created and activated. The same native
incarnation is checked before changes and at every active tick; a replacement is
not silently edited. Attached props and occupied vehicles are refused. Vehicle
occupancy checks include native NPC passengers and mounting relations, not only
network player seats; a generic `entity` alias cannot bypass them. An unavailable
occupancy query is a refusal, not evidence that a car is empty. A player
must leave vehicles/workspots/stand-in animations before entering the editor.

Capabilities are returned as:

```lua
{
    translate = {x=true, y=true, z=true},
    rotate = {x=false, y=false, z=true},
    scale = {x=false, y=false, z=false},
    preview = true, commit = false, networked = true,
}
```

`preview` means the native adapter can move the target locally. `commit` means
it can retain that change locally after accepting. `networked` means the target
has a replicated identity. A network target's `commit=false` does **not** disable
the `commit()` method: acceptance emits a proposal for your server logic and
requests restoration of the local preview. An own-player teleport is queued:
the commit event is a proposal, not proof that the native body has finished
restoring or that a server accepted the proposed placement.

For own-player previews, the client keeps sending the last normal position as
an idle keepalive, never the editor position. When editing ends, movement stays
blocked briefly until independent native reads confirm restoration. Starting a
new gizmo during this interval returns `gizmo_restore_pending`. A newer normal
teleport takes priority (`travel_superseded`); a restoration that fails for five
seconds ends a network session with `gizmo_restore_failed` rather than publishing
the preview pose. Completion is reported separately through `settled`/`error`;
the validation status above remains applicable.

Vehicle previews similarly fence native motion capture and use baseline
keepalives for parked owners. Restoration keeps the editor's physics hold until
the destination is observed, then observes the resumed rigid body before
reopening motion capture. A server freeze or observer mask remains independent.
An unsuccessful five-second vehicle restoration ends a network session with
`gizmo_vehicle_restore_failed`. `commit`, `cancel` and `deactivated` events do
not acknowledge completion of these asynchronous restoration fences; wait for
`settled`/`error` and read `nativeTransform` as described below. Motion fencing is
not a collision sandbox: avoid previewing a vehicle through nearby actors, and
reserve a clear editing area on the server. Local collision isolation is still
under investigation.

An explicit server vehicle placement (`Open77.vehicles.setTransform`) takes
priority over an active preview: `cancel` and `deactivated` carry
`reason='transform_superseded'`, and no commit proposal is emitted. If placement
arrives just after Enter/`commit()`, while native restoration is still pending,
the fence switches to the new server destination instead of restoring the old
origin. This is not a server lock: your editor must still validate ownership,
revision and occupancy before accepting any proposed transform.

An NPC `enterVehicle` task also takes priority: it cancels a vehicle preview with
`vehicle_entry_requested`, then waits for native restoration before attempting
the mount. This guard is in the client NPC task driver, not a global seat lock;
reserve the vehicle on your server when other players or native AI could board.
With `preview=false`, only editor data changes: the native car is never moved or
frozen, and accepting it still requires your own server validation. There is no
asynchronous `settled` event for that callback-only mode.

Capabilities are refreshed before activation. If the target's capabilities or
authority model change during an edit, writes/commit fail with
`target_capabilities_changed`, and the next tick cancels that edit. Explicitly
reactivate after inspecting the new capabilities; a stale handle never retains
the former ability to commit locally.

Current native adapters provide XYZ translation; puppets, players and managed
props support yaw rotation only. Vehicle and generic non-puppet root transforms
can use quaternion rotation. Arbitrary native entity scaling is not exposed as
a working capability: REDengine render proxies and physics do not share a safe
live scale setter. Virtual targets support all three scale axes and uniform
scale, letting an author connect the result to their own rebuild/resize API.
Do not treat a scaling handle as evidence that a physical collider was resized.

## Options

```lua
{
    target = {kind='transform', id='0'}, -- default target
    transform = {                     -- virtual targets only
        position = {x=1, y=2, z=3},
        rotation = {x=0, y=0, z=0, w=1}, -- normalized quaternion, not Euler
        scale = {x=1, y=1, z=1},
    },
    mode = 'translate',                -- translate | rotate | scale
    space = 'world',                   -- world | local
    axes = {x=true, y=true, z=true},
    snap = {translation=0, rotation=0, scale=0},
    pivotOffset = {x=0, y=0, z=0},      -- target-local offset
    minimumPosition = false,           -- false clears a bound
    maximumPosition = false,           -- or {x=...,y=...,z=...}
    minimumScale = 0.01,
    maximumScale = 100,
    preview = true,
    visible = true,
    size = 100,                       -- 32..240 logical pixels at 1080p
    timeoutMs = 300000,                -- 1000..1800000, starts at activation
}
```

All values must be finite. Positions are bounded to ±1,000,000; quaternion length
must be within 0.001 of one. Scale components must be 0.01..100 and positive.
Unknown option keys, malformed vectors and invalid enum names are errors, not
ignored fallbacks. Sparse `axes`/`snap` patches preserve unspecified values.

Translation snap is in metres (0..1000); rotation is in degrees (0..180); scale
snap is a relative factor (0..10). Zero disables that snap. Snapping is relative
to the transform at drag start, avoiding accumulated rounding errors. Position
bounds are world-space. Scale uses **local axes even in world mode**, because
non-uniform world scale would require shear outside the transform format.

`axes` selects pointer handles, while capability checks constrain both pointer
and programmatic edits. `setTransform` intentionally does not snap the supplied
numeric value or restrict it to the selected manipulation mode.

## API reference

Queries return a value or `nil, reason`. Mutations return `true` or `false, reason`.

| Method | Result / effect |
| --- | --- |
| `create(options)` | Returns opaque string handle; does not capture input |
| `get(id)` | Full snapshot of one owned handle |
| `list()` | Array of all this VM's handles, including completed handles |
| `active()` | This VM's active snapshot, or `nil` (never another owner's) |
| `capabilities([target])` | Capability object; omitted target means virtual |
| `activate(id)` | Acquire exclusive input, read fresh target pose, reset history |
| `update(id, patch)` | Change mutable options; refused during a pointer drag |
| `setTransform(id, patch)` | Edit active transform; one undo entry; refused mid-drag |
| `undo(id)` / `redo(id)` | Apply previous/next accepted edit in bounded history |
| `commit(id)` | Accept proposal, release input and emit result |
| `cancel(id)` | Restore initial preview and release input |
| `deactivate(id)` | Alias for cancellation, not implicit acceptance |
| `destroy(id)` | Cancel if active, remove handle and free its quota |

`update` accepts `mode`, `space`, `axes`, `snap`, `pivotOffset`, position/scale
bounds, `visible`, and `size`. Target, initial transform, preview policy and
timeout are fixed at creation. An active gizmo cannot be hidden. Unsupported
modes fail with `mode_not_supported_by_target`.

`setTransform` accepts a sparse `{position, rotation, scale}` patch. Present
vectors/quaternions must be complete. It validates capabilities and bounds and
reports native write failures before changing the logical transform.

There can be eight handles per VM, 64 total and **one active gizmo per client**.
Undo/redo retains 32 edits; one pointer drag is one edit, not one per frame.
Accepting/cancelling does not destroy the handle. Re-activation resets the edit
baseline/history; destroy completed handles when your editor no longer needs them.

## Built-in controls

| Input | Action |
| --- | --- |
| Left-drag axis arrow / plane | Constrained translation |
| Left-drag centre square | Camera-plane translation or uniform scale |
| Left-drag rotation ring | Rotation around the selected axis |
| `T` / `R` / `S` | Translation / rotation / scale, if supported |
| `L` | Toggle local/world axes |
| Hold `Shift` | Precision movement (0.1 multiplier) |
| Hold `Alt` | Temporarily bypass snap |
| `Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z` | Undo / redo |
| `Enter` | Accept current transform, including an active drag |
| `Escape` while dragging | Revert only this drag; keep editor open |
| `Escape` otherwise | Cancel entire edit and release input |

An inactive handle captures no input. Activation refuses an existing keyboard or
cursor owner. A WebUI menu taking focus, focus loss, player invalidation or camera
loss cancels the editor and releases only its own restrictions. Other resources'
action blocks, server freezes and observer physics must remain intact.

## Events and snapshot shape

Register with `AddEventHandler('open77:gizmo:<name>', function(state) ... end)`.
Every event supplies **one snapshot**, with the same fields as `get(id)`.

| Event suffix | Meaning |
| --- | --- |
| `created` | Handle allocated |
| `activated` | Input acquired; fresh baseline captured |
| `configured` | Options changed |
| `hover` | Hovered handle changed |
| `dragStart` | Pointer drag begins |
| `change` | Valid transform applied; also used by undo/redo and drag cancellation |
| `dragEnd` | Drag ended; reason `released`, `cancelled` or `committed` |
| `undo` / `redo` | History operation completed |
| `commit` | User/script accepted; network authority is still the server's job |
| `settled` | Asynchronous local puppet placement or own-player/vehicle restoration was observed on the same native body |
| `cancel` | Edit cancelled; asynchronous restoration may still be pending |
| `targetLost` | Stream-out, invalidation, incarnation or capability change |
| `error` | Native restoration/release reported failure |
| `deactivated` | Editor/cursor released after commit/cancel/error; native restoration may still hold movement |
| `destroyed` | Handle removed |

Snapshot fields: `id`, `phase`, `reason`, `revision`, `target`, `capabilities`,
`transform`, `initial`, `nativeTransform`, `mode`, `space`, `axes`, `snap`, `pivotOffset`,
`minimumPosition`, `maximumPosition`, `minimumScale`, `maximumScale`, `size`,
`timeoutMs`, `active`, `dragging`, `visible`, `preview`, `hover`, `handle`,
`undoCount`, `redoCount`. Absent position bounds are `false`. Handle names are
`none`, `x`, `y`, `z`, `xy`, `yz`, `zx`, `screen`, `uniform`.

Phases are `idle`, `editing`, `committed`, `cancelled`, `failed`. Native pointers,
VM cookies and incarnation tokens are never included. `revision` orders snapshots
for one handle and advances on events; it is not a server entity revision.

Events are local and delivered on the resource host's next dispatch. The native
queue is bounded to 512 snapshots; consecutive `change`/`hover` events can be
coalesced, and an abusive create/destroy loop can overflow old lifecycle events.
Use `get`/`list` for current state, not an assumption that every rendered frame
produces a separate event. Stop/reload clears the retiring VM's pending events.

Local puppet commits use a queued native NPC teleport after releasing the editor's
mover hold. `commit`/`deactivated` acknowledge acceptance, not native completion.
Wait for `settled` (`native_transform_settled`) or `error`
(`gizmo_puppet_placement_failed` / `target_replaced`) before treating that placement
as observed. The watch lasts at most five seconds and blocks new activation with
`gizmo_restore_pending`, but does not keep the player's input captured. Destroying
the handle or stopping its resource ends retries and future completion delivery.
Own-player and vehicle previews also emit `settled` after native restoration,
including on cancellation. Vehicles must pass both frozen-placement and resumed
physics readbacks. `reason` identifies what was observed:

| Reason | Meaning |
| --- | --- |
| `native_transform_settled` | Local placement/restoration completed |
| `native_preview_restored` | Network preview restored; this does **not** accept the proposed edit on the server |
| `authority_transform_settled` | A newer normal travel/server placement superseded the destination and was observed |

`nativeTransform` is `false` until successful asynchronous completion, then a
transform table with independently read native position/orientation and the
known unchanged scale. It is included in `get()` and events, and cleared on
reactivation. **`transform` remains the edit proposal** (or initial baseline on
cancel); do not use it as proof of the final native position. For example:

```lua
AddEventHandler('open77:gizmo:settled', function(state)
    print(state.reason, state.nativeTransform.position.x)
    -- Server acceptance needs its own response, even after this event.
end)
```

Native timeouts report `gizmo_restore_failed` / `gizmo_vehicle_restore_failed`;
body replacement reports `target_replaced`. Failed readbacks have no
`nativeTransform`. Stopping the resource/destroying the handle suppresses its
future events; network preview cleanup still finishes safely. No `settled` event
is generated for virtual edits, callback-only edits, synchronous prop edits or
network NPC/remote-player previews. Completion is an observation, not a promise
that an autonomous NPC or a physics vehicle will remain stationary afterwards.

## Authoritative server integration

See the complete opt-in
[server-authorized prop editor](../resources/examples/open77_gizmos_editor/README.md)
for the client/server implementation and runnable rejection tests. Its policy
has automated coverage and a one-client/server pointer-driven acceptance run.
This does not by itself prove cross-client presentation or persistence.

1. The server checks permission and creates a short-lived edit ticket bound to
   player identity, resource, target and its current revision/routing bucket.
2. It reserves/freezes the target as appropriate and asks that client to open it.
3. The client previews locally. Edited player motion is replaced by baseline
   keepalives; parked-owner vehicle motion likewise uses baseline keepalives,
   while locally simulated NPCs send stationary baseline keepalives and suspend
   client task advancement. Terminal NPC task reports are also baseline-fenced;
   they must never submit the edited body as canonical placement.
   **This is not a server freeze**. Other clients
   continue receiving canonical state.
   A newer server NPC/prop pose, attachment/body change, NPC task or authority
   change preempts the preview. Cancellation runs before normal replication
   applies that state, so the old preview cannot overwrite it. Observer motion
   from another NPC authority likewise preempts an edit when the pose changes.
4. `commit` sends the ticket and transform back. Treat this as untrusted input.
5. The server revalidates the ticket, identity, target, revision, finite values,
   bounds and distance, then calls its existing `players`/`npcs`/`vehicles`/`props`
   mutation API. It acknowledges success or failure and always releases its lease.
6. Cancellation, disconnect, resource stop and ticket expiry release the server
   lease. A client-side timeout is not sufficient server cleanup.

Do not stream every `change` over the network by default. Keep previews local;
send accepted results or a deliberately rate-limited collaborative-editor stream.
Native cancellation attempts restoration but cannot recreate a streamed-out or
deleted target. Such failures still release input and surface an error event.

## Common errors

- `permission_denied:gizmos.edit`: add the manifest permission to a trusted editor.
- `gizmos_unavailable_on_this_host`: client feature absent / server or validation host.
- `gizmo_not_owned`, `gizmo_not_found`: wrong VM/generation or stale/destroyed handle.
- `gizmo_input_busy`: another editor or menu owns input; release its focus first.
- `gizmo_restore_pending`: own-player/vehicle restoration or local puppet placement is still being observed; retry later.
- `game_not_focused`, `player_not_alive_in_world`: wait for a valid in-world player.
- `target_not_streamed`, `target_not_attached`, `target_replaced`: query the target anew.
- `local_prop_not_owned_or_missing`: local props can only be edited by their owner.
- `target_vehicle_occupied`, `target_is_attached`: leave occupants/attachments intact.
- `target_vehicle_occupancy_unavailable`: native occupancy could not be verified; retry when the vehicle is fully attached, never assume it is empty.
- `mode_not_supported_by_target`, `*_axis_unsupported`: use capability reporting.
- `target_capabilities_changed`: the active target's editing/authority model changed; cancellation follows, then inspect capabilities before reactivating.
- `position_out_of_bounds`, `scale_out_of_bounds`: value outside configured limits.
- `drag_in_progress`, `gizmo_not_active`, `nothing_to_undo`, `nothing_to_redo`:
  state-dependent refusal; refresh your inspector from `get`.

No method silently grants admin rights, changes a routing bucket, detaches an
occupant, deletes a target or persists server data.
