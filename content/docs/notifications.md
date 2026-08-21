# WebUI notifications

`cyberm_notifications` is the shared toast service for CyberM resources. It provides a FiveM-style
notification API without coupling gameplay packages to their own browser surface. Notifications can
originate locally or from an authoritative server resource and are always owned by their caller.

The WebUI is transparent and never captures input. Copy is inserted with DOM `textContent`, queues
are bounded, and notifications disappear automatically when their owner stops or reloads.

## Add the dependency

```lua
resource "jobs"
version "1.0.0"
dependency "cyberm_notifications >=1.0.0"

client_script "client/main.lua"
server_script "server/main.lua"
```

Exports cross isolated Lua VMs and therefore return a promise. Call them from a scheduler coroutine.

## Local client notification

```lua
CreateThread(function()
    local promise, callError = CyberM.exports.call("cyberm_notifications", "show", {
        id = "job_started",
        type = "success",
        title = "Mission acceptee",
        message = "Rendez-vous au garage de Kabuki.",
        icon = "JOB",
        position = "middle_left",
        durationMs = 5000,
        progress = true,
        color = "#54E38E",
        data = { mission = "garage_intro" },
    })
    assert(promise, callError)

    local result, awaitError = promise:await()
    assert(result and result.ok, awaitError or (result and result.error))
    print("notification handle", result.handle)
end)
```

Supported types are `info`, `success`, `warning`, and `error`. Each type supplies a default colour;
`color` overrides it with a `#RRGGBB` value.

## Update, dismiss, and clear

```lua
local function notifications(name, ...)
    local promise, reason = CyberM.exports.call("cyberm_notifications", name, ...)
    assert(promise, reason)
    return promise:await()
end

CreateThread(function()
    local shown = notifications("show", {
        id = "download",
        type = "info",
        title = "Synchronisation",
        message = "Telechargement des donnees...",
        durationMs = 0, -- persistent until update/dismiss/clear
        progress = false,
    })

    Wait(3000)
    notifications("update", shown.handle, {
        type = "success",
        message = "Synchronisation terminee.",
        durationMs = 3500,
        progress = true,
    })

    -- notifications("dismiss", shown.handle)
    -- notifications("clear") removes every toast owned by this resource.
end)
```

`setEnabled(false)` clears and suppresses the caller's notifications. `list()` returns that caller's
active entries; resources cannot inspect, update, or dismiss another owner's handles.

## Server-targeted notification

Server resources use the owner-aware API built into the server Lua runtime. The resource name is
attached by the runtime; scripts cannot impersonate another owner:

```lua
RegisterNetEvent("jobs:completed", function(jobId)
    local playerId = source
    -- Validate the authoritative job state before notifying the player.
    local id, reason = CyberM.notifications.send(playerId, {
        type = "success",
        title = "Mission terminee",
        message = "Votre paiement a ete transfere.",
        icon = "E$",
        durationMs = 6000,
        position = "middle_left",
    })
    assert(id, reason)
end)
```

Server methods are:

| Method | Purpose |
|---|---|
| `CyberM.notifications.send(playerId, definition)` | Send to one authenticated session ID and return its owner-local ID. |
| `CyberM.notifications.broadcast(definition)` | Send to every connected player. |
| `CyberM.notifications.update(id, patch)` | Update a notification previously returned by this server resource. |
| `CyberM.notifications.dismiss(id)` | Remove one notification owned by this server resource. |
| `CyberM.notifications.clear([playerId])` | Clear this owner's notifications for one player or everyone. |

Server IDs are owner-scoped. Client resources never receive an API that can forge a server-owned
toast. Server records expire with timed notifications and are cleared when their owner stops.

## Definition reference

| Field | Meaning |
|---|---|
| `id` | Optional stable owner-local ID, maximum 96 characters. |
| `replace` | Replace an existing notification with the same `id` when `true`. |
| `type` / `kind` | `info`, `success`, `warning`, or `error`; defaults to `info`. |
| `title` | Optional heading, maximum 96 UTF-8 bytes. |
| `message` / `text` | Required body, maximum 384 UTF-8 bytes. |
| `icon` | Optional short textual badge, maximum 16 UTF-8 bytes. |
| `position` | `middle_left` (default), `top_left`, `top_center`, `top_right`, `bottom_left`, `bottom_center`, or `bottom_right`. |
| `durationMs` / `duration` | Lifetime in milliseconds. `0` is persistent; timed values are 750-120000. |
| `progress` | Shows the lifetime bar when timed; defaults to `true`. |
| `color` | Optional `#RRGGBB` accent override. |
| `data` | Caller-owned serializable context returned by the removal event. |

The client holds at most 32 notifications and at most eight per position. Adding a ninth toast to a
position evicts its oldest toast. Only the notification owner can mutate its entries.

## Events and test command

`cyberm:notificationRemoved` is emitted locally with `handle`, `id`, `owner`, `reason`, and `data`.
Removal reasons include `expired`, `dismissed`, `queue_limit`, `owner_stopped`, and server cleanup.

Authenticated administrators can validate the complete server-to-client route with:

```text
/notification.test success
/notification.test warning
/notification.test error
```
