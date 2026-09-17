# Contextual world interactions

`open77_interactions` attaches client-side action prompts to world positions or streamed entities. A transparent WebUI displays the marker, distance and action card; an allowlisted input key triggers the calling resource's local event.

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

## Targets: rules instead of places

Everything above describes one prompt bolted to one place. A shop, a job step or a vehicle
interaction is not that: it is a rule — *every* vending machine, *every* vehicle, *every* player —
and a server that had to place one interaction per object would have to enumerate the world first.

A **target** is that rule. It is registered once, re-resolved against what this client can currently
see, and every match is *materialised* as an ordinary interaction. That is the whole design: the
arbiter, the anchor budget, the card, the hold, the cooldown and the owner sweep are reused
unchanged, and a target cannot behave differently from a hand-written interaction, because by the
time anything draws it, it **is** one. `get`, `all`, `setEnabled` and the one-target-at-a-time
arbitration all see materialised matches exactly as they see `create`.

```lua
CreateThread(function()
    local promise = assert(Open77.exports.call("open77_interactions", "addModel",
        { "Vending_Machine*" },
        {
            id = "vending",
            distance = 2.0,
            label = "Acheter une boisson",
            key = "E",
            icon = "SHOP",
            marker = "shop",
            event = "shops:vending",
        }))
    local result = promise:await()
    assert(result and result.ok, result and result.error)
end)

AddEventHandler("shops:vending", function(context)
    -- context.entity / context.engineEntity / context.class name what was hit.
    TriggerServerEvent("shops:requestVending", context.engineEntity)
end)
```

### Three cadences, and they are not interchangeable

| What | How often | Where |
|---|---|---|
| Where a prompt is **drawn** | every rendered frame | the plugin, through the anchor the materialised entry owns |
| What it **says**, and whether a key fired | every Lua tick (33 ms) | this resource |
| **Which** things match a rule, and whether `canInteract` still agrees | every 250 ms | this resource |

A world query and a `canInteract` predicate are both far too expensive for the tick, and neither
answer changes meaningfully inside a quarter of a second. Nothing about the slower cadence makes a
prompt lag: a match anchored to an entity is followed per frame by the plugin the instant it exists.
The only thing the resolve cadence bounds is how quickly a prompt *appears* on something new.

The winning match — the one a key is about to fire on — is re-checked on a faster clock, at most
every 500 ms, so a prompt that stops being allowed disappears rather than waiting out a full pass.

### The target kinds

| `kind` | Matches | Anchored to | Source |
|---|---|---|---|
| `model` | anything whose TweakDB record **or** RTTI class matches `models` | the entity when one is known, else the queried point | `Open77.world.nearby`, `Open77.vehicles.all`, `Open77.npcs.all` |
| `class` | anything whose RTTI class matches `classes` | same | `Open77.world.nearby` |
| `globalVehicle` | every streamed vehicle | the vehicle entity | `Open77.vehicles.all` |
| `globalPlayer` | every nearby player but you | the player's body entity | `Open77.players.nearby` |
| `globalNpc` | every streamed puppet that is not a player body | the entity for an Open77 NPC, else the queried point | `Open77.npcs.all` + `Open77.world.nearby(r, "puppet")` |
| `zone` | one prompt, only while you stand inside a volume | the zone's own centre | the declaration |

`addModel`, `addClass`, `addGlobalVehicle`, `addGlobalPlayer`, `addGlobalPed`, `addZone`,
`addBoxZone` and `addSphereZone` are sugar: each is `addTarget` with `kind` filled in, so there is
one implementation and one set of refusal tokens.

Selectors (`models`, `classes`) are matched **case-insensitively and exactly**, with one optional
trailing `*` for a prefix — `"Vending_Machine*"`. They are deliberately not Lua patterns: a resource
must not be able to hand this service a pattern that backtracks for a millisecond per entity.

### What `model` can really see

Unlike FiveM's uniform model hash, model identity in Cyberpunk 2.31 depends on the candidate's source:

| Source | RTTI class name | TweakDB record |
|---|---|---|
| `Open77.world.nearby` | yes (`className`) | **no** |
| `Open77.vehicles.all` | joined from the world query when both see it | yes (`record`) |
| `Open77.npcs.all` | no | yes (`record`) |

There is no generic "entity handle to record id" call in the client Lua surface at all. So:

- **`class` is exact and complete.** It matches the RTTI class name the world query reports, and
  that is what actually gets you vending machines, ATMs and chairs today — REDengine models those
  as device and prop classes.
- **`model` matches either name a candidate can carry**: the record when the source knows one
  (vehicles and Open77-spawned NPCs), the class name otherwise. A `model` target aimed at a prop
  therefore degenerates to a class match, and that is not a bug to be worked around — it is the only
  identity the engine hands a script for that object.

If you want a record match and only a record match, put the record in `canInteract`'s declarative
`record` selector, which never falls back to the class name.

### Global vehicles, and why there are no bones

Vehicle interaction prompts cannot target arbitrary named bones such as trunk, hood or doors. Use the part-targeting support described below.

1. **Cyberpunk authors slot names per entity.** An earlier row in this campaign established it, and
   nothing in the client Lua surface lists an entity's slots. The only native slot walk in the
   client (`DescribeOccupantAnchor`, `client/src/api/Vehicles.cpp`) reads `entSlotComponent::slots`
   off the live entity and is reachable only from the debug bridge. A fixed `trunk`/`hood`
   vocabulary would be a vocabulary this engine does not have.
2. **`Open77.vehicles.doors` is not a slot table.** `{ frontLeft = 0, … trunk = 4, hood = 5 }` are
   *bit indices* into the snapshot's `doors` mask. They say which bit means which door. They carry
   no transform.
3. **Even a hand-measured offset would point the wrong way.** `Api::WorldAnchors::Resolve` adds an
   anchor's offset to the entity's `GetWorldPosition()` in **world axes**, without rotating it into
   the entity's frame. An offset meaning "behind the car" would mean "north of the car" the moment
   the car turned.

What is offered instead is real, and it is what a trunk interaction actually needs: **`part`**.

```lua
Open77.exports.call("open77_interactions", "addGlobalVehicle", {
    id = "trunk",
    distance = 3.0,
    choices = {
        { id = "open",  label = "Ouvrir le coffre", key = "E", part = "trunk",
          canInteract = { vehicle = { partOpen = false, locked = false } },
          event = "garage:openTrunk" },
        { id = "close", label = "Fermer le coffre", key = "E", part = "trunk",
          canInteract = { vehicle = { partOpen = true } },
          event = "garage:closeTrunk" },
    },
})
```

`part` is one of `frontLeft`, `frontRight`, `backLeft`, `backRight`, `trunk`, `hood`. It is a
**state selector, not an anchor**: the card still sits on the vehicle, and the payload gains `part`,
`partIndex` and `partOpen`, decoded from the snapshot's door mask. That is enough to build the
open/close pair above, which is the interaction people actually want, without claiming a position
the engine will not give.

`part` may be set on the target (applying to every choice) or per choice, and a choice's own `part`
wins. It is refused on any kind but `globalVehicle` (`part_requires_global_vehicle`).

### `canInteract`

Every target and every choice may carry `canInteract`. It has two forms, and the reason there are
two is the export boundary: **functions never cross it** (see
[Cross-resource exports](resource-exports.md), "What crosses, and what does not"), so a closure
cannot be handed to this service the way ox_target takes one.

**A string names one of your own exports.** It is invoked with `Open77.exports.callSync`, which runs
it inline, in your VM, with your own upvalues — a closure in everything but spelling.

```lua
-- jobs/client/main.lua
exports("canRepair", function(payload)
    return payload.vehicle.locked == false and payload.vehicle.health < 100.0
end)

Open77.exports.call("open77_interactions", "addGlobalVehicle", {
    id = "repair", distance = 3.0, label = "Reparer", key = "E",
    event = "jobs:repair", canInteract = "canRepair",
})
```

**A table is a declarative rule**, evaluated in this service with no call at all. Prefer it whenever
it fits:

```lua
canInteract = {
    groups      = { "police", "ems" },   -- any of, from the player's own state bag
    notGroups   = { "banned" },          -- none of
    minDistance = 0.0,
    maxDistance = 1.5,
    state       = { ["job.onDuty"] = true },  -- equality against the local player's bag
    class       = { "VendingMachine*" },
    record      = { "Vehicle.v_standard2_*" },
    vehicle     = { locked = false, occupied = false, driven = false, partOpen = false },
}
```

Every key is optional; all present keys must hold. `state` keys may be dotted to read one level
into a bag value, and take at most eight entries.

#### The evaluation rule

**`canInteract` is evaluated at prompt-resolution time. It is never evaluated per frame, and never
per tick.** Concretely: once when a match is materialised (so at most every 250 ms per match), and
again at most every 500 ms while that match is the entry the arbiter chose. The result is cached on
the materialised entry.

Four consequences worth knowing before you write one:

- **It must not wait.** `Wait`, `promise:await()` and anything built on them fail the call with
  `export_yielded`. This is enforced by the runtime, not by this document: `callSync` has no
  scheduler underneath it.
- **It must not ask the server.** `Open77.net.call` is a network round trip, and a predicate that
  makes one — even once per resolve pass, even per vehicle on a busy street — is a performance bug
  and a source of prompts that flicker as answers arrive late. If a predicate needs server truth,
  have the server write that truth into the player's state bag once and read it with the `state` or
  `groups` rule, which is free.
- **It fails closed.** A predicate that raises, that tries to wait, or that belongs to a resource
  that has since stopped **refuses** the prompt. It never grants one by accident. The refusal is
  printed once per ten seconds, naming the owner and the export.
- **The payload carries what it needs.** `entity`, `distance`, the class, the record, the vehicle's
  own state and the target's `data` are all in the payload already, so the common predicate needs no
  lookup of its own.

When no choice on a materialised match is allowed, the whole match leaves the arbitration rather
than drawing a card that refuses to do anything — and so stops shadowing whatever is behind it.

If one resolve pass spends more than 8 ms in predicates, the service says so, once per ten seconds.
That message means somebody's `canInteract` is too slow, not that the service is busy.

### Group gates

`groups` on a target is the cheap gate: a target whose groups the player does not have resolves to
nothing at all, before any candidate is examined.

```lua
Open77.exports.call("open77_interactions", "addGlobalVehicle", {
    id = "impound", groups = { "police" }, distance = 3.0,
    label = "Mettre en fourriere", key = "G", event = "police:impound",
})
```

**Membership is read from the player's own state bag, and Open77 does not gain a third permission
model for this.** The two that exist were both considered:

- The **ACL** (`Open77.acl.isAllowed`, `Open77.acl.roles`) is the right authority — and it is
  **server-only**. There is no client binding for it at all, and a target gate runs on the client.
  Routing every gate through a callback would put a network round trip in the resolve pass, which is
  exactly what the `canInteract` rule above forbids.
- **State bags** are already replicated, server-written, client-readable *synchronously*, and are
  where an RP framework puts a player's job in the first place.

So the gate reads `Open77.state.localPlayer()` and accepts any of:

| Bag key | Shape | Example |
|---|---|---|
| `groups` | array of names | `{ "police", "ems" }` |
| `groups` | set of names | `{ police = true }` |
| `group` | one name | `"police"` |
| `job` | one name | `"police"` |
| `job` | table with `name` | `{ name = "police", grade = 3 }` |

Names are matched exactly and are case-sensitive. The server writes them:

```lua
-- server side, manifest requires state.write
Open77.state.player(playerId):set("job", { name = "police", grade = 3 })
```

The ACL keeps its job, which is the one that matters: when the intent arrives, the server calls
`Open77.acl.isAllowed(source, "job.police.impound")` before doing anything. The bag decides what the
player *sees*; the ACL decides what the player *gets*.

### Zones

A `zone` target materialises one prompt, at the volume's own centre, only while the player is inside
it. Three shapes:

```lua
-- A box: centre, size, optional heading in degrees about Z.
Open77.exports.call("open77_interactions", "addBoxZone", {
    id = "counter", position = { x = -1462.0, y = -120.0, z = 6.2 },
    size = { x = 4.0, y = 2.0, z = 3.0 }, heading = 35.0,
    distance = 3.0, label = "Commander", key = "E", event = "bar:order",
})

-- A sphere (a cylinder, really: `maxHeight` bounds it vertically).
Open77.exports.call("open77_interactions", "addSphereZone", {
    id = "yard", position = { x = 0, y = 0, z = 0 }, radius = 12.0, maxHeight = 4.0,
    distance = 6.0, label = "Garer", key = "E", event = "garage:park",
})

-- A polygon in the XY plane, with an explicit height band.
Open77.exports.call("open77_interactions", "addZone", {
    id = "lot",
    zone = { shape = "poly", minZ = 4.0, maxZ = 9.0,
             points = { { x = 0, y = 0 }, { x = 10, y = 0 }, { x = 10, y = 8 }, { x = 2, y = 6 } } },
    distance = 8.0, label = "Deposer", key = "E", event = "jobs:drop",
})
```

Containment is the gate on whether the prompt exists at all; `distance`, `requireLookAt` and
`focusRadius` still govern the card, exactly as for every other target. Set `distance` to cover the
part of the zone you want the card readable from (it is capped at 25 m, like any interaction), or
give the target its own `position` to anchor the card somewhere other than the volume's centre.

Zone targets use synchronous `contains(shape, point)` queries over normalized shape tables during the resolve pass. Avoid asynchronous export calls in this path.

### Declaring targets from the server

A job resource should describe its targets once and have every client apply them. Doing that per
client from a client script means every gamemode reimplements the same fan-out and gets late joins
wrong.

```lua
-- jobs/open77.lua
resource "jobs"
version "1.0.0"
dependency "open77_interactions >=0.2.0"
server_script "server/main.lua"
client_script "client/main.lua"
permissions { "network.events" }

-- jobs/server/main.lua
CreateThread(function()
    local ok, reason = exports.open77_interactions:define({
        {
            id = "atm",
            kind = "model",
            models = { "AtmMachine" },
            distance = 1.6,
            label = "Retirer de l'argent",
            key = "E",
            icon = "ATM",
            event = "bank:withdraw",
            canInteract = { maxDistance = 1.4 },
        },
        {
            id = "repair",
            kind = "globalVehicle",
            groups = { "mechanic" },
            distance = 3.0,
            label = "Reparer",
            key = "R",
            event = "jobs:repair",
        },
    })
    if not ok then print("interactions: " .. tostring(reason)) end
end)
```

The wire is an ordinary authenticated net event, `open77:interactions:targets`, not a new protocol
message. The client half trusts the `owner` in it precisely because it can only have come from the
server; a client cannot forge one. Applying a declaration is idempotent: it retracts that owner's
previous set first, so a re-`define` replaces rather than accumulates.

Late joins and reloads are covered from both ends. The server pushes on `onPlayerConnected`, and
this resource asks for the standing declarations with `open77:interactions:sync` whenever it starts.

`undefine(id)` withdraws one; `undefine()` and `clear()` withdraw all of them. A declaring resource
that **stops or reloads** is retracted automatically, within two seconds, by a generation sweep —
the client half could never notice this on its own, because a server-only job resource has no client
VM whose stop it could observe.

Two rules follow from the split, and both are load-bearing:

- **A server declaration's `canInteract` export name resolves against the declaring resource's
  *client* VM.** The predicate runs on the client, so the export must be published there. A
  declarative table needs no client half at all.
- **A server-declared target is not removed when the declaring resource's client half stops.** It
  belongs to the server and only the server retracts it. A client-declared target, as before, goes
  with its client VM's stop or reload.

A declaration is bounded: at most 32 targets per resource and roughly 16 KB per declaration
(`declaration_too_large`), because the server fans it out to every client on every join.

### Target definition reference

Everything in the [Definition reference](#definition-reference) above is accepted and behaves
identically — `distance`, `markerDistance`, `marker`, `markerScale`, `color`, `priority`,
`requireLookAt`, `focusRadius`, `cooldown`, `offset`, `visible`, `label`/`key`/`icon`/`event`/`data`
and `choices`. A target is validated by the *same* normaliser a hand-written interaction goes
through, so it can never accept a presentation `create` would reject. On top of it:

| Field | Meaning |
|---|---|
| `kind` | Required. One of `model`, `class`, `globalVehicle`, `globalPlayer`, `globalNpc`, `zone`. |
| `id` | Stable owner-local id, maximum 64 characters. Generated when omitted. |
| `models` | `model` only. One selector or an array of up to 32, matched against record then class. |
| `classes` | `class` only. One selector or an array of up to 32, matched against the RTTI class. |
| `zone` | `zone` only. `{ shape = "sphere"\|"box"\|"poly", … }`; see [Zones](#zones). |
| `part` | `globalVehicle` only. `frontLeft`, `frontRight`, `backLeft`, `backRight`, `trunk`, `hood`. Also settable per choice. |
| `groups` | Up to 32 group names. The target resolves to nothing unless the player has one. |
| `canInteract` | Export name (string) or declarative rule (table). Also settable per choice. |
| `maxMatches` | How many matches may be live at once, 1–32; defaults to 8. |

A materialised match keeps its own `interactionId`, which is `<targetId>:<matchKey>` — stable for
as long as that thing is matched, so `open77:interaction` handlers can key off it.

### The target payload

A materialised match adds these to the [event payload](#event-payload-and-server-authority), and
they are also exactly what a `canInteract` predicate receives:

| Field | Present for | Meaning |
|---|---|---|
| `targetId` | all | The target's own id. |
| `kind` | all | The target kind that matched. |
| `entity` | when known | The Open77 entity handle — the same domain as `Open77.players.entity`. |
| `engineEntity` | when known | The raw engine entity handle the world query reported. |
| `class` | when known | The RTTI class name. |
| `record` | when known | The TweakDB record (vehicles and Open77 NPCs). |
| `distance`, `position` | all | Where it was, at resolution time. |
| `data` | all | The target's own `data` table. |
| `playerId`, `playerName` | `globalPlayer` | Who it is. |
| `npcId` | Open77 NPCs | The replicated NPC id. |
| `vehicleId`, `vehicle` | vehicles | `{ id, entity, record, locked, health, speed, doors, windows, occupants, occupied, driver }`. |
| `part`, `partIndex`, `partOpen` | `part` targets | The selected door bit and whether it reads open. |
| `zoneId` | `zone` | The zone target's id. |
| `choiceId` | per-choice predicates | Which choice is being asked about. |

### Refusal tokens

`addTarget` and its sugar answer `{ ok = false, error = "<token>" }`; the server's `define` answers
`false, "<token>"`. Every presentation token from `create` still applies. On top of them:

| Token | Meaning |
|---|---|
| `invalid_target_kind` | `kind` missing or not one of the six. |
| `invalid_target_id` | Not 1–64 characters of `[A-Za-z0-9_:.-]`. |
| `duplicate_target_id` | This owner already has a target with that id. |
| `invalid_models`, `invalid_classes` | Empty, over 32 entries, or an unusable selector. |
| `invalid_zone`, `invalid_zone_shape`, `invalid_zone_position`, `invalid_zone_size`, `invalid_zone_radius`, `invalid_zone_heading`, `invalid_zone_points`, `invalid_zone_height` | The zone shape is not usable. |
| `invalid_groups` | Empty, over 32 entries, or a name outside `[A-Za-z0-9_:.-]`. |
| `invalid_can_interact` | Not an export name and not a well-formed declarative rule. |
| `invalid_max_matches` | Not an integer in 1–32. |
| `part_requires_global_vehicle` | `part` on any other kind. |
| `invalid_vehicle_part` | Not one of the six door bits. |
| `target_limit` | 64 targets across every resource. |
| `target_not_found`, `not_owner` | `removeTarget`/`getTarget` against something you do not own. |
| `definitions_must_be_a_table`, `invalid_target_count`, `declaration_too_large`, `no_declaration` | Server `define`/`undefine`. |

### Budgets

| Limit | Value | Why |
|---|---|---|
| Targets | 64, across every resource | |
| Materialised matches | 96, across every resource | Deliberately below the 256 interaction cap, so a rule matching a crowded street can never starve the interactions a gamemode placed on purpose. |
| Matches per target | 8 by default, 32 maximum | |
| Selectors per target | 32 | |
| World scan radius | the widest live `markerDistance`, capped at 120 m | |
| Resolve cadence | 250 ms | |
| Winner re-check | 500 ms | |
| Predicate budget | 8 ms per resolve pass before the service complains | |

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

**One target kind already does this round trip for you.** A choice used on a `globalNpc` target
that resolved to an Open77 NPC (the payload carries `npcId`) is also reported to the server by
this resource, on the reserved `open77:npcs:` transport, as the minimum intent — which NPC, which
prompt, which choice. The server re-derives the NPC, the routing bucket and the distance from its
own copy of the player (refusing a report from a player it cannot place, from another bucket, or
from more than 40 m away — 25 m is the widest prompt, plus a two-second snapshot at sprint speed)
and only then publishes **`onNpcInteracted(npcId, playerId, interactionId, choiceId, distance)`**
to every server resource, with `distance` the server measured. A shop with an NPC clerk therefore
needs no client half and no net event of its own:

```lua
-- shop/server/main.lua
CreateThread(function()
    exports.open77_interactions:define({
        { id = "clerk", kind = "globalNpc", distance = 2.0, label = "Browse", key = "E", event = "shop:browse" },
    })
end)
AddEventHandler("onNpcInteracted", function(npcId, playerId, interactionId, choiceId, distance)
    if clerks[npcId] == nil or tonumber(distance) > 3.0 then return end   -- your rule, on the server's number
    TriggerClientEvent("shop:openMenu", tonumber(playerId), clerks[npcId].catalogue)
end)
```

See [NPC events](npcs.md#events) for the event and its arguments.

### A target grants nothing

A prompt is presentation, and a **target** makes that easy to forget, because it looks like a rule
the system is enforcing. It is not. Every part of a target is evaluated on a machine the player
owns:

| What the target seems to enforce | What it actually is | What the server must do |
|---|---|---|
| `groups` / `canInteract` | a client read of the local player's own state bag, or a client-side predicate | call `Open77.acl.isAllowed(source, …)`, or re-read the player's authoritative role |
| `distance` / `markerDistance` | a client distance check against a client-read position | recompute from `Open77.players.position(source)` |
| `models` / `classes` / `kind` | what a client-side world query reported | re-resolve the target object server-side, or accept only an id you can verify |
| `vehicle.locked`, `partOpen`, `occupied` | a snapshot the client replicated in | read the authoritative vehicle state |
| `entity`, `engineEntity`, `vehicleId`, `playerId` | numbers the client put in an event | treat as a *claim*; verify the player may act on that object at all |

A modified client can call `TriggerServerEvent` with any payload it likes, with no prompt on screen
at all. The correct shape of a target handler is therefore the same as any other: accept the
smallest possible intent, and re-derive everything else.

```lua
-- server/main.lua
RegisterNetEvent("garage:openTrunk", function(vehicleId)
    local playerId = source -- authenticated by Open77; never accept it from the payload
    if type(vehicleId) ~= "number" then return end
    if not Open77.acl.isAllowed(playerId, "job.mechanic.trunk") then return end
    -- Then: is that vehicle real, in this player's bucket, within reach, and is
    -- its trunk actually shut? The prompt answered none of those questions.
end)
```
