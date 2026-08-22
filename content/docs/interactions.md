# Contextual world interactions

`open77_interactions` is the shared client service for contextual actions attached to a world
position or a streamed Open77 entity. It projects the target through REDengine's active camera and
draws a transparent WebUI marker at the corresponding screen position. At `markerDistance` the player
sees only the world point and its distance; once they enter `distance` and look at the point, the
marker expands into the custom action card. The service then reads an allowlisted action key and
emits a local event owned by the calling resource.

This is not Cyberpunk's native interaction prompt. The point, distance label, action card, colours,
copy and hold progress are rendered by the package WebUI while the target remains anchored to its
3D world position.

The prompt is fully data-driven. `Utiliser` is only an example: labels such as `Parler à Jackie`,
`Consulter les offres`, `Ouvrir le coffre`, or `Réparer le véhicule` are accepted, together with a
custom description, key, short icon, colour, press/hold behavior, and up to four choices.

## Add the dependency

```lua
resource "jobs"
version "1.0.0"
dependency "open77_interactions >=0.1.0"

client_script "client/main.lua"
```

Add `permission "network.events"` only when the client handler itself calls
`TriggerServerEvent`. The interaction service cannot send a server event on another resource's
behalf.

Exports are asynchronous because every resource has an isolated Lua VM. Call them from a
`CreateThread` and await the returned promise:

```lua
local interaction

CreateThread(function()
    local promise, callError = Open77.exports.call("open77_interactions", "create", {
        id = "job_center",
        position = { x = -1464.7, y = -124.3, z = 6.2 },
        distance = 2.2,
        markerDistance = 12.0,
        marker = "arrow",
        markerScale = 1.0,
        markerNearScale = 2.0,
        markerAnimated = true,
        label = "Consulter les offres",
        description = "Pôle emplois de Night City",
        key = "E",
        icon = "JOB",
        color = "#FFD84A",
        event = "jobs:open",
        data = { office = "city_center" },
    })
    assert(promise, callError)

    local result, awaitError = promise:await()
    assert(result and result.ok, awaitError or (result and result.error))
    interaction = result.handle
end)

AddEventHandler("jobs:open", function(context)
    print(context.interactionId, context.choiceId, context.distance)
end)
```

The service obtains the calling resource and its generation from the runtime. A resource cannot
forge an owner name, update another resource's handles, or retain stale handles after a restart.
Stopped owners are swept automatically.

## Attach to a player or NPC

`entity` accepts the same opaque Open77 entity handle as `Open77.character.state`. Keep a 64-bit
handle as returned; do not pass it through `tonumber`.

```lua
local npcEntity = Open77.npcs.entity(npcId)
if npcEntity then
    CreateThread(function()
        local promise = assert(Open77.exports.call("open77_interactions", "create", {
            id = "talk_to_receptionist",
            entity = npcEntity,
            offset = { x = 0.0, y = 0.0, z = 1.85 },
            distance = 2.5,
            label = "Parler à la réceptionniste",
            description = "Demander un rendez-vous",
            key = "F",
            icon = "DIALOG",
            event = "clinic:reception",
        }))
        local result = promise:await()
        assert(result and result.ok, result and result.error)
    end)
end
```

An entity interaction disappears while its entity is not streamed and follows its rendered world
position when it returns. Create it after `Open77.npcs.isStreamedIn(npcId)` becomes true, or update
it with the new local entity handle after a stream-out/stream-in cycle.

## Multiple custom actions and hold

```lua
local promise = Open77.exports.call("open77_interactions", "create", {
    id = "apartment_door",
    position = { x = -1448.2, y = 96.1, z = 17.5 },
    distance = 2.0,
    priority = 20,
    choices = {
        {
            id = "knock",
            label = "Frapper à la porte",
            description = "Prévenir les occupants",
            key = "E",
            icon = "DOOR",
            color = "#00E5FF",
            event = "apartment:knock",
        },
        {
            id = "force",
            label = "Forcer la serrure",
            description = "Maintenir pendant 1,5 seconde",
            key = "G",
            icon = "LOCK",
            color = "#FFD84A",
            holdSeconds = 1.5,
            event = "apartment:forceLock",
            data = { difficulty = 4 },
        },
    },
})
```

Keys must be unique inside one interaction. Supported keys are `A`–`Z`, `0`–`9`, `SPACE`,
`ENTER`/`RETURN`, and the four arrow keys. Input is suppressed whenever another WebUI owns
keyboard focus, so typing in chat cannot trigger a world action.

## Updating and removing

```lua
local function call(name, ...)
    local promise, reason = Open77.exports.call("open77_interactions", name, ...)
    assert(promise, reason)
    return promise:await()
end

CreateThread(function()
    assert(call("setVisible", interaction, false).ok)
    assert(call("update", interaction, {
        label = "Le guichet est fermé",
        description = "Revenez à 08:00",
        color = "#FF4D5A",
    }).ok)
    assert(call("setVisible", interaction, true).ok)

    local current = call("get", interaction)
    local owned = call("all")
    assert(call("remove", interaction).ok)
    -- call("clear") removes every interaction owned by this resource.
end)
```

`setEnabled(false)` suspends every interaction owned by the caller without affecting other
resources. `isEnabled()` returns that caller-specific state.

## Definition reference

| Field | Meaning |
|---|---|
| `id` | Stable owner-local ID, maximum 96 characters. Generated when omitted. |
| `position` | Static `{ x, y, z }` target. Exactly one of `position` or `entity` is required. |
| `entity` | Streamed Open77 entity handle followed through `Open77.character.state`. |
| `offset` | World offset from the position/entity origin; defaults to zero. |
| `distance` | Activation radius, 0.25–25 m; defaults to 2.5 m. |
| `markerDistance` | Maximum marker display distance, from `distance` to 250 m; defaults to at least 12 m. Only the winning interaction is rendered. |
| `showDistance` | Backward-compatible alias of `markerDistance`. |
| `marker` | WebUI motif: `dot` (default), `ring`, `diamond`, `arrow`, `chevron`, `exclamation`, `info`, `vehicle` (`car` alias), `person`, `door`, or `shop`. `arrow` points down toward the projected world position. |
| `markerScale` | Marker scale from 0.6 to 2.0; defaults to 1.0. |
| `markerNearScale` | Proximity multiplier from 1.0 to 4.0; defaults to 2.0. The marker progressively grows from `markerScale` at `markerDistance` to this multiplier at interaction range. |
| `markerAnimated` | Enables the marker's subtle vertical animation; defaults to `true`. |
| `requireLookAt` | Requires the projection to be close to the screen centre; defaults to `true`. |
| `focusRadius` | Normalized screen-centre radius, 0.02–1.0; defaults to 0.18. |
| `priority` | Tie-breaker from -1000 to 1000; higher wins. |
| `visible` | Presentation flag; defaults to `true`. |
| `cooldown` | Client presentation debounce in seconds, 0–60. Never use it as server security. |
| `label`, `description`, `key`, `icon`, `color`, `event`, `data`, `holdSeconds` | Single-choice shorthand. |
| `choices` | Array of 1–4 complete choice records; replaces the shorthand. |

Choice labels are arbitrary UTF-8 text up to 96 bytes, descriptions up to 160 bytes, and icons are
short textual marks up to 12 bytes. Colours use `#RRGGBB`. Events and IDs use letters, numbers,
underscore, colon, dash, and dot.

The arbiter renders one target at a time. An active target wins over a merely visible one, then
`priority`, then distance. This prevents overlapping cards from fighting each other every frame.

## Event payload and server authority

Every selected choice emits its custom `event` and the common `open77:interaction` event with:

```lua
{
    interactionId = "job_center",
    handle = 1,
    owner = "jobs",
    choiceId = "primary",
    key = "E",
    position = { x = 0, y = 0, z = 0 },
    distance = 1.4,
    data = {},
    interactionData = {},
}
```

This payload is client presentation evidence, not authority. If an action changes shared state,
the owner may submit only the minimum intent:

```lua
-- client/main.lua; manifest requires network.events
AddEventHandler("jobs:open", function(context)
    TriggerServerEvent("jobs:requestOpen", context.interactionId)
end)

-- server/main.lua
RegisterNetEvent("jobs:requestOpen", function(interactionId)
    local playerId = source -- authenticated by Open77; never accept it from the payload
    if interactionId ~= "job_center" then return end

    local position = Open77.players.position(playerId)
    if not position then return end
    -- Recheck routing bucket, distance, role/ACL, cooldown, and authoritative
    -- job-centre state here before opening or mutating anything.
    TriggerClientEvent("jobs:openMenu", playerId, { office = "city_center" })
end)
```

The WebUI never receives input focus and builds all copy with DOM `textContent`; labels cannot
inject HTML. The service intentionally does not claim line-of-sight or server-side proximity.
