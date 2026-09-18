# Remote cameras and world screens

Render another viewpoint without replacing the player's camera. Use remote cameras for a security monitor, a picture-in-picture HUD, a world-space screen or a feed behind a transparent WebUI.

Available from **`2.31.13+op77.82`**, this feature is **experimental**. Rendering, source switching and long-session cleanup have known limitations; see [limits and troubleshooting](#limits-and-troubleshooting) before building a public resource around it.

## Choose the right API

| Need | API | Runtime |
|---|---|---|
| Create a local capture and display it yourself | `Open77.remoteCamera` | Client |
| Share camera definitions, authorize viewers and manage remote replication interest | `exports.open77_remote_camera:*` | Server |
| Move or replace the player's view | [Scripted cameras](cameras.md), not remote cameras | Client |
| Customize the playable shoulder camera | [Third-person camera styles](third-person-camera.md) | Client |

Each viewer renders the feed on their own client. The server distributes definitions and access rules, **not video frames**. Native client handles and server camera IDs are different identifiers and cannot be substituted for each other.

## Prerequisites

Use matching client/server builds and the Open77 archive containing the capture-slot assets. A client resource calling `Open77.remoteCamera` needs `camera.capture`; add `local.events` to subscribe to the lifecycle events below. Aim raycasts need `world.query`, and parent-frame conversions need `world.transform`.

For provider-managed cameras, start `open77_remote_camera` and declare this dependency in the consuming resource's `open77.lua`:

```lua
dependency "open77_remote_camera >=0.3.0"
```

A server-only consumer delegates capture to the provider and does not need client capture permissions. A custom client renderer still needs its own permissions and cleanup.

## Minimal client HUD

Example `open77.lua`:

```lua
resource "security_monitor"
version "1.0.0"
client_script "client.lua"
permissions { "camera.capture", "local.events" }
```

Example `client.lua`, invoked after the player has entered the world:

```lua
local C = Open77.remoteCamera
local cameraId, bindingId

local function closeMonitor()
    if cameraId then
        -- Retires the source and all of its bindings asynchronously.
        C.destroy(cameraId)
        cameraId, bindingId = nil, nil
    end
end

local function openMonitor()
    if cameraId then return end
    local reason
    cameraId, reason = C.create({
        position = { x = -699.094, y = 2164.29, z = 54.7051 },
        rotation = { yaw = 135, pitch = 0, roll = 0 },
        fov = 60,
        range = 100,
    })
    if not cameraId then print("Camera: " .. tostring(reason)); return end

    bindingId, reason = C.bindHud(cameraId, {
        x = 80, y = 100, width = 640, height = 360,
    })
    if not bindingId then
        print("HUD binding: " .. tostring(reason))
        closeMonitor()
    end
end

RegisterCommand("monitor", openMonitor, false)
RegisterCommand("monitor_off", closeMonitor, false)
AddEventHandler("onResourceStop", function(name)
    if name == GetCurrentResourceName() then closeMonitor() end
end)
```

These local commands do not authorize access to a server-owned camera or create distant replication interest. Use the server service for a shared surveillance system. Opening a source returns an allocated handle, not a guarantee that a frame is ready.

## Client API reference

All 15 functions below belong to `Open77.remoteCamera`. The [native API reference](/docs/api/client/open77-remotecamera) contains their parameter types, permissions, return values and examples.

| Function | Purpose |
|---|---|
| `create(view)` | Allocate an independent source; returns an opaque camera handle or `nil, reason`. |
| `update(cameraId, patch)` | Update the source pose, FOV or range. |
| `get(cameraId)` | Read the requested pose, state, reason, dimensions and capture demand. |
| `list()` | List this resource's sources, including retiring ones. |
| `destroy(cameraId)` | Retire a source and all of its bindings. |
| `capabilities()` | Read output format, supported presentations and admission limits. |
| `budget()` | Read global and resource-local capture/binding usage. |
| `worldModels()` | List world-panel profiles, sizes and placement bases. |
| `bindHud(cameraId, rect)` | Bind a viewport rectangle in pixels. |
| `bindWorld(cameraId, placement)` | Bind a depth-tested world panel in metres. |
| `bindWebUI(cameraId, page, rect)` | Bind a native underlay behind this resource's transparent page. |
| `updateBinding(bindingId, patch)` | Change source, visibility or placement without replacing the handle. |
| `getBinding(bindingId)` | Read one binding's state and requested options. |
| `bindings(cameraId?)` | List owned bindings, optionally filtered by source. |
| `unbind(bindingId)` | Retire a binding while retaining the source. |

Creators/getters return a value or `nil, reason`; mutations return `true` or `false, reason`. Every handle belongs to one resource generation. Another resource cannot use it, and reloading the owner invalidates it.

### Source options and events

`view` is `{position = {x, y, z}, rotation = {yaw, pitch, roll}, fov, range}`. Position is required, in world metres; angles are degrees. Rotation defaults to zero, FOV to 60 (range 1–120), and capture range to 100 metres (range 1–500).

Patches are sparse by field, **not by axis**: a supplied position must include all three axes; a supplied rotation replaces the whole rotation, with omitted angles becoming zero.

Sources progress through `pending`, `active`, `failed`, `destroying` and terminal `removed` states. Bindings also have `hidden` and `unavailable` states. Subscribe from the owning client resource:

```lua
AddEventHandler("open77:remoteCamera:stateChanged", function(event)
    print(event.cameraId, event.state, event.reason)
end)
AddEventHandler("open77:remoteCamera:bindingChanged", function(event)
    print(event.bindingId, event.cameraId, event.state, event.reason)
end)
```

`active` means the native object exists, not that a GPU frame is fresh or distant scenery is fully streamed. A source only requests capture while at least one visible binding needs it.

### World screens and parenting

Given an owned client `cameraId`, create a screen with a world-space pose:

```lua
local panel, reason = Open77.remoteCamera.bindWorld(cameraId, {
    position = { x = -695, y = 2160, z = 54 },
    rotation = { yaw = 90, pitch = 0, roll = 0 },
    width = 1.6, height = 0.9,
    model = "surface",
})
if not panel then print(reason) end
```

`surface` is a frameless plane placed in front of an existing monitor or wall; `panel` includes the stock housing. This is a depth-tested overlay, **not a replacement for an arbitrary prop's material or UVs**. Foreground geometry occludes it. Read `worldModels()` and apply the selected profile's `basis.yawOffset` once: `surface` uses 0 degrees and `panel` uses 90 degrees.

Optional `parent = {type = "prop"|"localProp"|"player"|"vehicle"|"entity", id = ...}` makes the pose parent-local. Server-managed screens accept only canonical `prop`, `player` or `vehicle` parents. Keep prop IDs as their decimal strings; raw engine entity IDs are not network IDs. A missing parent makes a presentation unavailable.

Use `parent = false` with an explicit world-space position and rotation to detach. A server `updateScreen` that changes or clears its parent requires both vectors in the same patch.

### Transparent WebUI

Given an owned client `cameraId`, create a page and its underlay:

```lua
local page, pageError = WebUI.create({
    entry = "web/monitor.html",
    layer = "hud", transparent = true, visible = true,
})
if not page then print(pageError); return end
local underlay, reason = Open77.remoteCamera.bindWebUI(cameraId, page, {
    x = 80, y = 100, width = 640, height = 360,
})
if not underlay then page:destroy(); print(reason) end
```

Declare the page assets with `web_files { "web/**" }` and keep the feed area transparent in CSS. The page must belong to the calling resource. The rectangle uses viewport pixels and does not follow DOM layout automatically; update its position when the layout changes. On close, unbind the presentation and destroy the page; destroy the source too when it is no longer used.

The feed is a native GPU underlay: it is **not** an HTML video, an image URL, a JavaScript-readable pixel stream or a transferable texture. See [WebUI resource setup](resource-runtime.md#webui) for page lifetime and input handling.

## Server service

The provider exposes 19 synchronous server exports through `exports.open77_remote_camera:name(...)`. [Cross-resource exports](server-exports.md) also describes the asynchronous `Open77.exports.call` form and transport errors.

| Export | Contract |
|---|---|
| `create(description)` | Return a camera snapshot with an allocated `id`; requires `key`, `position`, `bucket`. |
| `configure(cameraId, patch)` | Update a camera and reconcile its dependents; `key` cannot be renamed. |
| `get(cameraId)` | Return an owned camera snapshot. |
| `list()` | List owned cameras. |
| `remove(cameraId)` | Remove the camera, its screens, views and leases. |
| `setAccess(cameraId, playerId, {view = boolean})` | Grant or revoke explicit viewer access. |
| `acquire(playerId, cameraId)` | Return an interest lease for custom rendering; does not open a picture. |
| `release(leaseId)` | Release an independent interest lease. |
| `createScreen(cameraId, placement)` | Return a server screen ID. |
| `updateScreen(screenId, patch)` | Change camera, placement, dimensions or audience. |
| `getScreen(screenId)` | Read definition and per-viewer states/reasons. |
| `listScreens(cameraId?)` | List owned screens, optionally by camera. |
| `removeScreen(screenId)` | Remove a screen and its viewer references. |
| `openView(playerId, cameraId, rect, surface?)` | Return a view ID; surface is `"hud"` (default) or `"webui"`. |
| `updateView(viewId, patch)` | Update camera, rectangle, visibility or surface; viewer stays fixed. |
| `getView(viewId)` | Read the view and its asynchronous state. |
| `listViews(playerId?)` | List owned views, optionally by viewer. |
| `closeView(viewId)` | Remove a view and its interest reference. |
| `changes(cursor)` | Return the owner-scoped `{epoch, cursor, events, reset}` change feed. |

Records belong to the invoking resource generation, determined by the runtime, not by a supplied owner name. Value-returning calls fail with `nil, reason`; mutators fail with `false, reason`. Missing records return `not_found`. Export dispatch errors can raise separately; handle them when a dependency may stop or reload.

### Shared camera example

Call these helpers from an authorized **server-side** workflow after checking the viewer's readiness. Supply the authoritative bucket, never a client-supplied bucket or a client-selected viewer ID:

```lua
local service = exports.open77_remote_camera

local function openSecurityView(playerId, bucket)
    local camera, reason = service:create({
        key = "security:" .. tostring(playerId),
        bucket = bucket,
        position = { x = -699.094, y = 2164.29, z = 54.7051 },
        rotation = { yaw = 135, pitch = 0, roll = 0 },
        fov = 60, range = 100,
    })
    if not camera then return nil, reason end
    local granted, grantError = service:setAccess(camera.id, playerId, { view = true })
    if not granted then service:remove(camera.id); return nil, grantError end
    local viewId, viewError = service:openView(playerId, camera.id, {
        x = 80, y = 100, width = 640, height = 360,
    }, "hud")
    if not viewId then service:remove(camera.id); return nil, viewError end
    return { cameraId = camera.id, viewId = viewId }
end

local function closeSecurityView(session)
    -- This example owns a dedicated source per viewer, so removal also
    -- removes its grant, view and interest. Keep shared sources separately.
    return service:remove(session.cameraId)
end
```

Retain one returned session per viewer, reject duplicate opens, and call the close helper when your UI or workflow ends. Resource-generation cleanup is a fallback, not a reason to leave unused views open. For a shared source, close only its view with `closeView`, release any explicit leases, and revoke access when appropriate instead of deleting the camera for all viewers.

### Access, streaming and lifecycle

`openView` and `acquire` require an explicit `setAccess` grant. World-screen placements use `access = "granted"` by default or `"public"`, plus a proximity `radius` (default 40 metres). Viewers must be ready, in the camera's bucket and within screen radius. Public proximity does not grant access to a separate private HUD view.

One camera/viewer pair shares one replication-interest point across its views, screens and explicit leases. Provider-managed presentations also share one native source for that pair. An interest-only lease allocates no capture, and a custom renderer must reconcile its own sources. Interest admission and native capture have separate budgets; neither proves complete scenery.

Use `getScreen`, `getView` and `changes` to surface asynchronous failures. Keep the returned journal cursor; if `reset` is true or the provider epoch changes, rebuild your owned state from list/get calls. Resource stop/reload retires the old generation's records. Server removal is synchronous, but interest reconciliation and native teardown are asynchronous.

Optional camera `housing = {model, offset?, yaw?}` creates a server-owned prop that follows source position and yaw, not pitch/roll. Its default offset is `{x=0, y=-0.35, z=0}`. Inspect the camera snapshot for the housing `propId` or refusal reason; `configure(id, {housing=false})` removes it.

## Placement editor and commands

The editor never opens automatically. Grant `command.remote-camera.editor` through the normal [ACL system](server-acl.md), then run `/remote-camera.editor` as a ready player. Viewer commands require their matching `command.<name>` permission; the built-in admin role covers `command.*`.

1. Create an owned source or select a shared one. **Camera from player view** copies a starting pose; a shared source is read-only in the placement editor.
2. Use **Snap to aim**, then **F4**, to place the panel on the aimed surface. Adjust position, rotation, physical size and depth offset.
3. **F6 / CAMERA** continuously follows the player's view for source placement. **F7 / SURFACE** continuously snaps the screen to the centre ray. Turn the active mode off to return to the editor.
4. Choose public or granted access and radius, then **Save placement**. An unsaved preview is local only. **Copy Lua** exports a server helper with explicit bucket/viewer/parent inputs; **Copy JSON** exports placement data.

| Command | Purpose |
|---|---|
| `/remote-camera.editor` | Open a draft; also supports `open <key>`, `reopen <key>`, `list`, `delete <key>`, `snap`, `close`, `sync`. |
| `/remote-camera.cameras [filter]` | List provider-owned cameras and their bucket/housing status. |
| `/remote-camera.hud <key> [x y width height]` | View a camera in a HUD rectangle; default `80 100 640 360`. |
| `/remote-camera.webui <key> [x y width height]` | View it behind the provider's transparent page. |
| `/remote-camera.off` | Close command-opened views and revoke the grants those commands created. |
| `/remote-camera.slots [n]` | Inspect or change the capture policy; requires `command.remote-camera.slots`. |

Definitions persist in resource KVP storage. Runtime parent IDs and numeric player IDs are session-local: restored placements use their world-space fallback, require parent reselection, and **do not restore private grants from saved numeric player IDs**. An authorized operator must grant access again. Commands/editor operate on provider-owned records; another resource's cameras remain owned by that resource.

## Limits and troubleshooting

- Output is fixed at **640 × 360**. There is no per-camera resolution, aspect-ratio or FPS setting. Each capture is an additional scene render.
- Default assets contain **eight capture slots**. `budget().cameras` includes `limit`, `capacity`, `used`, `live`, `retiring`; retiring allocations count against the limit. Native capacity and a higher operator policy do not prove additional slot assets exist.
- `camera_slots_exhausted` means no allocation is available. Do not retry creation every frame. Missing/incompatible slot assets can fail creation or later configuration.
- `stale_id` / `stale_binding_id` means the native handle has expired. Server `not_found` concerns a different, server-owned record.
- An `active` but empty/incomplete feed may lack streamed scenery or replicated entities. Check the binding reason, viewer bucket/access, interest lease and capture demand separately.
- Switching an established HUD/WebUI source can leave the previous image mounted. `visible=false` on a world binding stops capture demand but may leave its mesh showing a frozen or shared-source image; it is not a reliable removal guarantee.
- Lighting/exposure can differ from the gameplay camera. World-panel hiding, failed-save rollback, long-session slot reclamation and delayed teardown stability have unresolved gaps, including intermittent engine crashes. Keep concurrent feeds low and treat this release as experimental.

For implementation details and ongoing constraints, see the [remote-camera technical notes](https://github.com/Open2077/open77-base/blob/main/docs/research/remote-camera.md). Use [screenshots](screenshots.md) when you need an actual captured image rather than a live native underlay.
