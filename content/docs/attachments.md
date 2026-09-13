# Synchronized attachments

A server resource attaches a prop to a canonical player or vehicle, optionally
to a named skeletal slot, with a local position and rotation. Each client follows
its **locally rendered** parent and animated slot every frame. The network sends
the binding and its revisions, not ten world-space teleports per second.

Native validation evidence and remaining coverage limits are tracked in
[the research log](../docs/research/synchronized-attachments-and-player-interactions.md).
Use [player interactions](player-interactions.md) to coordinate two players;
attaching a prop alone does not reserve a player or start an animation.

## Resource setup

```lua
resource 'medical_bag'
version '1.0.0'
dependency 'open77_props >=0.1.0'
permissions { 'world.props' }
server_script 'server.lua'
```

The bundled `open77_props` client projection must be running for synchronized
props. The server owns the object and attachment. Another resource may inspect
it, but cannot mutate or remove it. Resource stop removes its props.

## Attach a prop to a hand

```lua
-- Server. playerId is authenticated/validated by your gameplay code.
local p = Open77.players.position(playerId)
if not p then return end
local propId, reason = Open77.props.create({
    model = 'container.gas_can',
    position = {x=p.x+2, y=p.y, z=p.z},
    bucket = p.bucket,
    scale = 0.5,
})
if not propId then print(reason); return end
local ok, err = Open77.props.attach(propId, {
    parentType = 'player', parentId = playerId, bone = 'RightHand',
    offset = {x=0, y=0, z=0},
    rotation = {x=0, y=0, z=0},
})
if not ok then Open77.props.remove(propId); print(err) end
```

The zero transform is a starting point, not a calibrated grip for every mesh.
Tune the transform for your chosen model. For a back accessory, select a slot
such as `Chest`/`spine` that the target rig actually exposes and adjust the offset.
Never assume that every named slot exists on both the real player and a replica.

## Binding fields

| Field | Meaning |
| --- | --- |
| `parentType` | Required: `"player"` or `"vehicle"`. |
| `parentId` | Required canonical network ID, positive integer ≤ 2^53−1; **not** a client entity handle. Decimal strings are accepted server-side. |
| `bone` | Case-sensitive named slot. Omitted/`""` attaches to the parent's root. At most 64 ASCII letters, digits, `_` or `-`. |
| `offset` | `{x,y,z}` in metres, in the slot's local coordinate system. Missing components default to zero; each component must be finite and within ±20. |
| `rotation` | `{x,y,z}` in degrees: X roll, Y pitch, Z yaw; each finite and within ±360. Applied as parent rotation × Z × Y × X. |

A vehicle binding normally uses its root, because slots differ between models:

```lua
local ok, err = Open77.props.attach(propId, {
    parentType='vehicle', parentId=vehicleId, bone='',
    offset={x=0,y=0,z=1.8}, rotation={x=0,y=0,z=90},
})
```

The prop and parent must already be in the same routing bucket. A parent has a
maximum of 32 attached props across resources. Lights and looping effects are
not attachable through this API.

## Server API

All methods below require `world.props` and return directly (no promise).

| Method | Result |
| --- | --- |
| `Open77.props.attach(id, binding, expectedRevision?)` | `true`, or `nil, reason`. Also reparents an already attached prop. |
| `Open77.props.detach(id, expectedRevision?)` | `true`, or `nil, reason`. Detaching an already detached owned prop succeeds. |
| `Open77.props.getAttachment(id)` | Binding table, or `nil` if absent/detached. |
| `Open77.props.isAttached(id)` | Boolean; check the second result for a permission/runtime error. |
| `Open77.props.attachedTo(parentType, parentId)` | Array of prop snapshots, sorted by ID, including props owned by other resources. |
| `Open77.props.setAttachmentTransform(id, offset?, rotation?, expectedRevision?)` | Updates only the local transform. Omitted vectors retain their values; default revision is the current snapshot revision. |

`Open77.props.get(id)` and `all()` include the optional `attachment` field.
`parentId` in a returned binding is a decimal string. Repeated identical attaches
are idempotent. An explicit stale `expectedRevision` returns `stale_revision`
before any mutation. Use this to protect item handoffs:

```lua
local prop = Open77.props.get(propId)
if not prop then return end
local ok, err = Open77.props.attach(propId, {
    parentType='player', parentId=recipientId, bone='RightHand',
}, prop.revision)
-- Update gameplay ownership only after ok, in the resource that owns the prop.
```

`setTransform` is rejected while attached. Detach first to place an object in
world space. Changing its bucket to a different bucket while attached is also
rejected. The server's stored position is an interest/drop anchor near the parent,
**not an authoritative animated hand position**. To place a dropped item exactly,
detach and use a server-validated placement position.

## Client API and diagnostics

`Open77.props.bones(parentType, parentId)` returns an array of named slots for the
currently rendered parent. An unavailable/unstreamed parent or a parent without
named slots returns an empty array; invalid arguments, missing permissions or
backend failures return `nil, reason`. Root binding needs no named slot, but the
parent must still be rendered before its attached prop becomes visible.

```lua
local bones, err = Open77.props.bones('player', playerId)
if bones then for _, name in ipairs(bones) do print(name) end end
```

Client-created decorative props also support `Open77.props.attach(localPropId,
binding)` and `detach(localPropId)`. These calls affect only props owned by the
calling client resource, are not network authority and do not modify a
server-owned prop. Their parent IDs are still canonical IDs, not native pointers.
Client snapshots expose `attachment` and `attachmentStatus` for diagnosis.
An attached prop reports `rendered=false` until its parent/slot is bound and its
own visibility flag permits rendering. A missing slot hides the projection; it
does not silently place the prop at the player's feet.

## Lifecycle and events

Server event:

```lua
AddEventHandler('onPropAttachmentChanged', function(id, current, previous, reason, revision)
    -- current/previous are binding tables or nil; revision belongs to this edge.
    -- Do not infer inventory ownership from a client observation.
end)
```

Player death/disconnection, parent bucket changes and vehicle removal detach
the child on the server. Removing the child also emits its terminal attachment
change. Resource stop removes the child, rather than leaving an orphan binding.
Streaming is different: a temporarily absent parent hides the client projection;
the binding is retained and follows the new local entity when it streams back in.
No local fallback body or native pointer is serialized.

## Physics, assets and failures

Attached props use separately authored **visual-only mesh hosts**, with no
physical mesh shape. This prevents an attached object from pushing its own
carrier. Attach/detach switches host type; changing offset or reparenting an
already attached prop does not require a new host. Attached props are not a
rigid-body simulation and do not collide with walls.

Use curated prop aliases with generated attachment hosts. Arbitrary `.ent` and
raw `.mesh` paths are not supported for attachment. Server acceptance alone does
not prove that a client installed the matching archive or that its current rig
has the requested slot. Keep client assets aligned with the resource release.

Common server refusals: `not_found`, `owned_by_another_resource`, `stale_revision`,
`parent_unavailable`, `wrong_bucket`, `invalid_attachment_parent`,
`invalid_attachment_bone`, `invalid_attachment_transform`,
`attachment_kind_unsupported`, `attachment_parent_limit`.

The bundled `prop.pickup`/`prop.drop` commands now use this binding mechanism.
Their opt-in persistence still saves a dropped prop once at its server position;
it does not persist a live player attachment across a restart.
