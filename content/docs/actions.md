# Actions and carrying

Use `open77_actions` when an activity needs a prompt, an animation, a duration and a result:
repair a terminal, cook a dish, inspect a wreck or carry a crate. It provides the progress bar,
checks whether the player can act, prevents two workers using an exclusive spot and cleans up
the animation and controls when work ends.

Your Lua resource supplies the requirements and result. The action library does not define your
recipes, inventory or pay rates. Connect those through its hooks—the functions it calls before,
after or when cancelling work.

This page is the reference for Lua authors. For an introduction and existing jobs, see
[Jobs and world interaction](world-interaction.md). For a complete example with installation,
test items and payment, follow [Build your first Lua job](build-a-job.md).

## Action, target and hook

| Term | Meaning | Example |
|---|---|---|
| Action | What the player does. Defines the label, duration and animation. | Repair, taking six seconds. |
| Target | Where an action is offered. Several targets can use the same action. | A work spot beside each of three machines. |
| Hook | A Lua function your resource exports for an action to call. | Check for a spare part or apply a payment. |

These are configured work spots. To attach a simple prompt directly to another kind of object
or NPC, see [contextual interactions](interactions.md). Adding a target does not change a vanilla
device's functionality.

Source: [`open77_actions`](https://github.com/Open2077/open77-resources/tree/next/system/open77_actions).

## Your first action

This example adds a repair prompt, animation and an in-memory repaired flag. It does not consume
items, pay a reward or save the machine's state across restarts. The next section adds item and
payment hooks; the [full tutorial](build-a-job.md) includes their setup.

```lua
-- my_repairs/open77.lua
resource "my_repairs"
version "1.0.0"
dependency "open77_actions >=0.1.0"
server_script "server/main.lua"
```

```lua
-- my_repairs/server/main.lua
local actions = exports.open77_actions
local broken = { machine_1 = true }   -- your own state

local function declare()
    actions:define({
        id = "repair",
        label = "Repair the machine",
        durationMs = 6000,                    -- the server's clock decides when it is done
        animation = { profile = "amb_1056d7_kneel_welder", at = "target" },
        progress = { label = "Repairing" },   -- the bar; X cancels
        hooks = { validate = "repairValidate", commit = "repairCommit" },
    })
    actions:target({
        id = "machine_1",
        position = { x = -1410.2, y = 958.4, z = 23.4 },   -- where the player stands: /pos on the spot
        yaw = 90.0,                                          -- the way they face while working
        label = "Broken vending machine",
        actions = { "repair" },                              -- the E choice
    })
end
CreateThread(declare)
AddEventHandler("open77_actions:ready", declare)   -- it forgets everything when it restarts

-- A hook is the NAME of one of your exports. Any resource can call an export: check the caller.
exports("repairValidate", function(ctx)
    if GetInvokingResource() ~= "open77_actions" then return false, "not_owner" end
    if not broken[ctx.target.id] then return false, "already_fixed" end   -- your own token
    return true
end)

exports("repairCommit", function(ctx)
    if GetInvokingResource() ~= "open77_actions" then return nil, "not_owner" end
    if not actions:verify(ctx.opId, "commit") then return nil, "not_owner" end   -- really ours, now
    broken[ctx.target.id] = nil
    return { fixed = ctx.target.id }
end)
```

No client script and no permission are needed: `open77_actions` draws the prompt, the bar and the
control locks itself. It is opt-in: the operator lists it in `resources.load` and starts it with
`ensure open77_actions` before your resource. `at = "target"` places the body on the target (up to
5 m away) facing `yaw`, through `Open77.animations.playAt`; workspot animations switch the player
to third person while they play. Job postures such as `amb_1056d7_kneel_welder` ship in
`Open77RP.archive`, so players need a client archive that includes them
([RP animations](rp-animations.md)).

### What happens when the player presses E

1. **Check requirements.** The library checks the player's distance, life state, vehicle,
   combat and world instance, then calls `validate` with `ctx.phase = "begin"`.
2. **Reserve the spot and materials.** An exclusive target admits one worker. If present,
   your `reserve` hook holds the required items or money before any animation starts.
3. **Present the work.** The animation and progress bar run for `durationMs`.
4. **Apply the result.** The library checks the player again and calls `validate` with
   `ctx.phase = "complete"`, then calls `commit` to apply your result.
5. **Finish.** The library releases the spot and its control claims.

The server times completion. `maxDistance` defaults to 2.5 m, with 0.75 m of slack at completion.
Use the hooks to add your server's own requirements and item/payment operations.

Any other end (death, disconnect, **X**, walking off, a car, aiming, being shoved out of the
animation, a newer action, a restart of either resource) also releases the spot, stops the
animation, gives the controls back and calls your `cancel` hook once. Every message carries an
operation id (`opId`), so a late answer for an old action never touches the next one.

| Hook | When | Runs | Answers |
|---|---|---|---|
| `validate` | steps 1 (`ctx.phase = "begin"`) and 4 (`"complete"`) | synchronously: no `Wait`, no `await` | `true`, or `false, reason` |
| `reserve` | step 2 | asynchronously | a table (kept as `ctx.reservation`), or `nil, reason` |
| `commit` | step 4 | asynchronously | a table (the receipt), or `nil, reason` |
| `cancel` | once, on any end that is not a commit | asynchronously | ignored |
| `marker` | at each of the action's `markers` (`ctx.marker`) | synchronously | ignored |

Keep the tables `reserve` and `commit` return under 2 KB. `verify(opId, "reserve" | "commit")`
answers `true` only for your own operation, in that phase.

## Take a fuse and pay 40 eddies

To consume a part and pay the worker together, use
[`open77_transactions`](transactions.md): hold the transfer in `reserve`, apply it in `commit`
and release an unused hold in `cancel`. Retrying the same transaction id returns its existing
result instead of applying another payment. A new id can pay again. Add
`dependency "open77_transactions >=0.1.0"` to the manifest, and `reserve = "repairReserve"` and
`cancel = "repairCancel"` to the action's hooks:

```lua
local tx = exports.open77_transactions
local function call(name, ...)   -- mutating coordinator exports yield: use the promise form
    local promise, why = Open77.exports.call("open77_transactions", name, ...)
    if not promise then return nil, why end
    return promise:await()
end

exports("repairReserve", function(ctx)
    if GetInvokingResource() ~= "open77_actions" then return nil, "not_owner" end
    if not actions:verify(ctx.opId, "reserve") then return nil, "not_owner" end
    local pockets, cash = tx:account(ctx.playerId, "char"), tx:account(ctx.playerId, "cash")
    if not pockets or not cash then return nil, "no_account" end
    local txOpId = "repairs:" .. ctx.opId                 -- one business id per action
    local held, why = call("reserve", { opId = txOpId, kind = "repair", lines = {
        { item = "fuse", count = 1, from = pockets, to = "sys:repairs" },   -- the fuse is used up
        { money = 40, from = "sys:repairs", to = cash },                    -- the pay
    } })
    if not held then return nil, why end                  -- insufficient_items: no bar starts
    return { txOpId = txOpId }                            -- becomes ctx.reservation
end)

exports("repairCommit", function(ctx)
    if GetInvokingResource() ~= "open77_actions" then return nil, "not_owner" end
    if not actions:verify(ctx.opId, "commit") then return nil, "not_owner" end
    local receipt, why = call("commit", ctx.reservation.txOpId)
    if not receipt then return nil, why end
    broken[ctx.target.id] = nil
    return { paid = 40 }
end)

exports("repairCancel", function(ctx)
    if GetInvokingResource() ~= "open77_actions" then return end
    if ctx.reservation and ctx.reason ~= "in_doubt" then tx:cancel(ctx.reservation.txOpId, ctx.reason) end
end)
```

If `commit` answers `in_doubt`, `busy` or an export timeout, the library calls it again with the
same context (`commitRetries`, 2 by default), and the coordinator replays a commit that already
happened. Still unknown after the retries, the action ends `in_doubt`, not `failed`: leave the hold
alone and settle it with the coordinator's `status`. An answer that says nothing was applied
(`store_unavailable`, `coordinator_unavailable`, `conflict`) is retried the same way, then ends
`failed`. The operator must let `my_repairs` write pockets and create the pay (`writers` and mint
rules, in [Durable transactions](transactions.md)).

## Tell the player why it was refused

| When | What the player sees by itself |
|---|---|
| a prompt is refused at the start (your `validate` hook, the claim, the distance) | a short sentence for common reasons ("Too far away."), otherwise `Refused: <token>`, such as `Refused: already_fixed` |
| the action ends after the bar started | `Action stopped: <reason>`, except after **X** or a newer action |
| your `reserve` hook refuses, or runs out of time | nothing: the action ends before anything was shown |
| the action commits, or your own `request` call is refused | nothing |

So tell the player yourself, from the `open77_actions:transition` event. Every resource receives
it: filter on `op.owner`.

```lua
local RESOURCE = GetCurrentResourceName()
local TEXT = { insufficient_items = "You need a fuse.", no_account = "Your character is not ready." }

AddEventHandler("open77_actions:transition", function(op)
    if op.owner ~= RESOURCE then return end
    if op.state == "failed" and op.stage == "reserve" then
        Open77.chat.send(op.playerId, TEXT[op.reason] or ("You cannot repair this: " .. op.reason))
    elseif op.state == "committed" then
        Open77.chat.send(op.playerId, ("Machine repaired: +%d eddies."):format(op.receipt.paid))
    end
end)
```

To word a start refusal yourself, send your message from the `validate` hook before returning
`false` (the notice still shows). The built-in sentences cover `target_claimed`, `too_far`,
`carrying`, `not_carrying`, `actor_busy`, `in_combat` and `player_in_vehicle`.

## Start an action from your own code

A prompt is not required. From a command, an NPC event or your own net event:

```lua
local op, reason, info = actions:request(playerId, "repair", "machine_1", { supersede = true })
if not op then Open77.chat.send(playerId, "Refused: " .. reason) end
```

`request` answers at once with a summary (`op.opId`, `op.state`...), or `nil, reason, info` where
`info.stage` names the step that refused and `info.retryable` is `true` for `target_claimed`,
`destination_claimed` and `actor_busy`. The options are `supersede` (replace the player's running
action, which ends `superseded`) and `data` (up to 2 KB, given to hooks as `ctx.data`). With a
`reserve` hook, `begin` takes the same arguments and also waits for the reservation; it yields, so
call it as `Open77.exports.call("open77_actions", "begin", ...):await()` from a thread. A resource
starts only its own actions; `cancel(opId, reason)` stops one, `status(opId)` and
`current(playerId)` read the summary.

## Place the prompt and choose its keys

The target's `position` is where the player stands, usually a floor point (stand there, type
`/pos`). The card is drawn `promptHeight` (1 m) above it and fires once the player is within
`distance` (2 m) and the card is on screen; there is no need to aim at it. The server then checks
the action's `maxDistance` (2.5 m): keep it at least as large as the target's `distance`.

A target offers up to four choices, on **E**, **F**, **R** and **Y** in order, unless a choice
names its own `key` (one letter or digit). **G** (put down), **T** (it opens the chat) and **X**
(cancel) are never given by default. Each action must be defined first:

```lua
actions:target({ id = "machine_2", position = { x = -1404.8, y = 961.0, z = 23.4 }, yaw = 90,
    label = "Vending machine", actions = {
        "repair",                                              -- E, with the action's own label
        { action = "inspect", label = "Check the fuse box" },  -- F
        { action = "restock", key = "Q", holdSeconds = 1 },    -- Q instead of R, held one second
    } })
```

- A card shows its first choice's label and key, then "+N more". The other choices fire on their
  keys, but the player cannot read them: put the common choice first, give rare ones their own
  target or a command. **F** is also the game's own interact key.
- Keys work only on the nearest card in reach: a crate next to the machine takes them over.
- Use plain ASCII in labels: a character such as the euro sign shows as `?`.
- `target` with an existing `id` replaces that target; `untarget(id)` removes it.

### Spots that push the player back

`playAt` counts the body as arrived within 0.5 m of the spot, and a body that drifts past that ends
the action (`animation_interrupted`). A grill behind its counter, or a bar stool (which stops the
body 0.73 m from its anchor), pushes the body back. Raise the radius there, up to 1.5 m:

```lua
actions:target({ id = "grill", position = { x = -397.6, y = 715.1, z = 115.0 }, yaw = 64.0,
    arrivalRadius = 1.0, actions = { "cook" } })
-- or per action, which wins over the target's: animation = { ..., arrivalRadius = 1.0 }
```

## Only on duty: jobs, grades and duty

The library knows nothing about jobs. Plug in your framework:

```lua
actions:define({
    id = "repair", durationMs = 6000,
    -- asked at the start and before the commit: any export answering true, or nil + reason
    eligibility = { resource = "rp_jobs", export = "eligible", args = { job = "technician", duty = true } },
    -- read at the start; if it changed by the commit (job, grade or duty changed), refused
    epochs = { resource = "rp_jobs", read = "workEpoch", event = "rp_jobs:workEpoch" },
})
```

The eligibility export is called synchronously with `(playerId, args)`; its reason (such as
`off_duty`) reaches the player, or `not_eligible` when it gives none. Each field also takes a list
of up to four, which must all pass. When the epoch `event` fires for the player with a new value,
the running action ends at once (`stale_job_epoch`) and a carried item is dropped.

## Carry a crate to a truck

Use the carry helper for the visible pickup, carrying pose and put-down interaction. Your
resource still owns the goods and must save their contents and placement. If you use the RP
pack, start with `rp_salvage` and `rp_cargo` for a complete inventory and vehicle integration.

The following is an integration sketch. Supply `myTruckNear`, `truckIsFull` and `saveCrate`
from your vehicle access and storage code; they are not Open77 exports. Also register the
`cratePickup` hook described below. The snippets do not form a standalone cargo job.

A scrapper finishes cutting a wreck and a crate appears beside it. The card reads **E** Pick up
scrap crate; they lift it and walk to their truck at walking pace, unable to jump or fire. Others
see the crate in their hands; in first person it sits low on the right, under a "Put down scrap
crate" hint. **G** (rebindable in Settings, Key bindings) sets it down in front of them.

```lua
actions:carryDefine({
    id = "crate",
    model = "crate.ammo_box",        -- a box at hand scale
    label = "scrap crate",           -- the card reads "Pick up scrap crate"
    hooks = { pickup = "cratePickup", putdown = "cratePutdown", dropped = "crateDropped" },
})

-- A crate on the ground: its pickup prompt (E) appears by itself.
local itemId = actions:carryPlace("crate", {
    position = { x = 1369.6, y = -1689.4, z = 49.3 }, yaw = 0, bucket = 0,
    data = { crate = "crate_17" },   -- your own id: every hook receives it
})

-- Into the truck, from your own command or prompt.
RegisterCommand("load", function(source)
    local truckId = myTruckNear(source)   -- yours: the vehicle id of a truck this player may use
    if not truckId then return end
    local op, why = actions:carryPutdown(source, { kind = "vehicle", vehicleId = truckId,
        offset = { x = 0.0, y = -1.5, z = 1.0 },      -- in the truck's frame: the bed
        claimKey = "truck:" .. truckId .. ":slot1" }) -- one crate per slot
    if not op then Open77.chat.send(source, "Cannot load: " .. why) end
end, false)
```

`vehicleId` is the engine's 64-bit vehicle id (any whole number up to 2^53), and the player must
stand within `vehicleReach` (4 m) of the truck. **Custody changes only in your `putdown` hook**:
the library moves the prop after your hook commits, and never decides who owns the goods. For a
durable record, move the crate with a coordinator `transfer` there (into `veh:<plate>:cargo` for a
truck); if it refuses, return its reason and the player keeps the crate. Lifting moves no value, so
`cratePickup` can simply check its caller and answer `{ crate = ctx.carry.data.crate }`.

```lua
exports("cratePutdown", function(ctx)
    if GetInvokingResource() ~= "open77_actions" then return nil, "not_owner" end
    local dest = ctx.carry.destination               -- kind = "ground", "point" or "vehicle"
    if dest.kind == "vehicle" and truckIsFull(dest.vehicleId) then
        return nil, "truck_full"                     -- refused: the player keeps carrying it
    end
    saveCrate(ctx.carry.data.crate, dest)            -- yours: write where it is now
    return { placement = dest }
end)

exports("crateDropped", function(ctx)   -- ctx.reason says why; ctx.data is the item's data
    if GetInvokingResource() ~= "open77_actions" then return end
    saveCrate(ctx.data.crate, { kind = "point", position = ctx.position })
end)
```

`placement` says where the prop goes: `{ kind = "ground" }`, `{ kind = "point", position, yaw }`,
`{ kind = "vehicle", vehicleId, offset, rotation }`, or `{ kind = "remove" }` once the crate is
sold or handed to another resource (`rp_salvage` hands truck loads to [`rp_cargo`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_cargo) this way). Without
`placement`, the destination is used.

A target that offers the built-in put-down is a drop zone with no code of its own: its card shows
only to players who carry something, and the item lands on that point. Your `putdown` hook sees
`ctx.target`, and sells the crate by answering `{ placement = { kind = "remove" } }`:

```lua
actions:target({ id = "counter", position = { x = 1375.1, y = -1684.0, z = 49.3 }, yaw = 90,
    label = "Scrap buyer", requires = "carrying", data = { bay = "sell" },
    actions = { { action = "open77_actions:carry_putdown", label = "Sell the crate" } } })
```

### What happens to a carried crate

| Event | What happens to the item |
|---|---|
| your `pickup` hook refuses | it goes back exactly where it was |
| your `putdown` hook refuses, or the destination is no longer valid | the player keeps carrying it |
| the server teleports the carrier | the hold resumes when the player is back; after 15 s away, it is dropped |
| death, disconnect, a vehicle, a bucket change, combat, the carry pose broken, your resource stopping, a job change | **dropped** at the player's feet; your `dropped` hook gets `ctx.reason`; custody is unchanged |
| the truck attachment fails after your commit | retried, then left on the ground (`projection_failed`); the commit stands |

A restart of your resource or of `open77_actions` removes your carry items: place them again from
your own record when you start and on `open77_actions:ready`, as `rp_salvage` does.
`carryPickup(playerId, itemId)` starts a pickup from your code, also from a truck bed (players
cannot lift from a truck through a prompt). `carrying(playerId)` and `carryGet(itemId)` read the
state, `carryRemove(itemId)` deletes an item, `carryDrop(playerId)` forces a drop. Only the
resource that placed an item may change it.

## Keep a spot for yourself

Benches and anything else you run yourself can use the same one-winner claims:

```lua
local token, why = actions:claim(bucket, "bench:" .. benchId, 60000)   -- or nil, "target_claimed"
actions:renewClaim(token, 60000)
actions:releaseClaim(token)
```

A claim lasts its time (1 s to 1 h, 30 s by default) unless renewed, and goes when your resource
stops or reloads; `claimHolder(bucket, key)` says who holds a key. Players seated on world
furniture hold `furniture:<catalogue version>:<furniture id>` ([Furniture](furniture.md)): claim it
to keep players off a table your job uses.

On the server console, `actions.status [playerId]` shows what runs and who carries what,
`actions.claims [bucket]` lists the claims, and `actions.trace` (`actions.trace off`) logs every
step of every action.

## Reference

### Action fields

| Field | Default | What it does |
|---|---|---|
| `id`, `durationMs` | required | up to 48 letters, digits, `_ . -`; 250 to 600,000 ms on the server's clock |
| `label` | the id | the choice and bar label |
| `commitAtMs` | `durationMs` | commit earlier; the animation still runs to the end |
| `maxDistance` | 2.5 m | the server's distance check (0.5 to 25), plus `completeSlack` (0.75 m) at the end |
| `animation` | none | `{ profile, at = "self" or "target", yaw, yawOffset, clip, loop = true, required = true, arrivalRadius }`; with `required`, an animation that cannot start fails the action |
| `progress` | a bar with the label | `{ label, position = "bottom", "top" or "center", style = "bar" or "circle", color = "#rrggbb", cancellable = true }`, or `false` |
| `claims` | `{ move = true, attack = true }` | controls locked while it runs: `move`, `attack`, `jump`, `walkSpeed` (0.5 to 2.5 m/s); `false` for none |
| `claim`, `claimTtlMs` | `true`, duration + 30 s | one player per target at a time (`false`: several), for that long (1 s to 1 h) |
| `cancelOn` | `{ combat = true, vehicle = true, moved = true, weaponDrawn = false }` | which events end it |
| `moveTolerance` | 1.0 m | without an animation, moving this far ends it (`moved`) |
| `maxPositionAgeMs` | 2,000 | an older server position is refused (`position_stale`) |
| `reserveTimeoutMs` | 20,000 | a slower `reserve` hook ends it (`reserve_timeout`) |
| `commitRetries` | 2 | retries of an unsure `commit` (0 to 5) |
| `cooldownMs` | 0 | after a commit, the same player waits this long (`actor_busy`) |
| `supersede`, `requiresTarget`, `whileCarrying` | `false`, `true`, `false` | replace a running action; refuse `request` without a target; allow it while carrying |
| `markers` | none | up to 8 `{ name, atMs }`: the `marker` hook and event fire then |

### Target fields

| Field | Default | What it does |
|---|---|---|
| `id`, `position`, `actions` | required | up to 48 characters; where the player stands; 1 to 4 choices |
| a choice | | an action id, or `{ action, label, key, holdSeconds (0 to 10), icon }` |
| `yaw`, `bucket` | none, 0 | the way the player faces with `at = "target"`; the routing bucket |
| `label`, `description` | none | the fallback choice label; the choices' description |
| `distance`, `promptHeight` | 2.0 m, 1.0 m | reach of the card (0.5 to 25); its height above `position` (0 to 3, lower for a counter top) |
| `markerDistance` | 12 m | from how far the dot is drawn (1 to 120) |
| `marker`, `color`, `icon` | `dot` | the dot's shape ([Interactions](interactions.md)), `#rrggbb`, a short icon |
| `lookAt` | `false` | also require the crosshair on the card, for spots closer together than their `distance` |
| `arrivalRadius` | 0.5 m | how close `playAt` must bring the body (0.5 to 1.5) |
| `requires` | none | `"carrying"` or `"empty"`: offer the card only to players with, or without, an item |
| `data` | none | your table (up to 1 KB), given to hooks as `ctx.target.data` |

### Carry fields

| Field | Default | What it does |
|---|---|---|
| `id`, `model`, `label` | required, required, the id | a prop alias such as `crate.ammo_box`; the name in "Pick up ..." |
| `reach`, `vehicleReach` | 2.0 m, 4.0 m | pickup distance (0.5 to 5); distance to a truck (1 to 8) |
| `dropAhead` | 0.7 m | how far in front of the player **G** or a drop sets it (0 to 2) |
| `gripMs`, `releaseMs` | 60 % of the pickup clip, 55 % of the put-down clip | when the hands close and open, on the server clock: calibrate them |
| `pickupProfile`, `holdProfile`, `putdownProfile` | `carry_pickup`, `carry`, `carry_putdown` | the animations; `pickupMs` and `putdownMs` override the clip lengths |
| `binding` | on the chest, between the hands | `{ bone, offset, rotation, firstPerson }`; another model may need its own offsets; `firstPerson = "hide"` hides it in first person |
| `claims`, `cancelOn` | `{ walkSpeed = 1.2, jump = true, attack = true }`, `{ combat = true, weaponDrawn = true }` | what the carrier cannot do; aiming or a drawn weapon drops it (a vehicle always does) |
| `hooks`, `eligibility`, `epochs` | none | `validate`, `pickup`, `putdown`, `dropped`, `cancel`; job checks as for actions |

### Hook context

| Field | What it holds |
|---|---|
| `opId` | the operation id: derive your business ids from it |
| `action`, `actionId`, `owner` | `"my_repairs:repair"`, `"repair"`, `"my_repairs"` |
| `playerId`, `bucket`, `phase` | the player, their bucket at the start, and `begin`, `complete`, `reserve`, `commit`, `cancel` or `marker` |
| `kind` | `action`, `carry_pickup` or `carry_putdown` |
| `target` | `{ key, id, position, yaw, data }`, or `nil` without a target |
| `data`, `reservation`, `receipt` | the `data` option of `request`; what `reserve` and `commit` returned |
| `carry` | carry hooks: `{ itemId, kind, data, destination }` |
| `reason`, `marker` | `cancel`: why it ended; `marker`: the marker's name |
| `playbackId`, `startedAtMs`, `generation`, `ownerGeneration` | animation and restart bookkeeping |

The `dropped` hook gets `{ itemId, kind, playerId, reason, position, data, sessionId }`. The exports
are `define`, `undefine`, `target`, `untarget`, `request`, `begin`, `cancel`, `status`, `verify`,
`current`, `claim`, `renewClaim`, `releaseClaim`, `claimHolder`, `carryDefine`, `carryPlace`,
`carryPickup`, `carryPutdown`, `carryDrop`, `carryRemove`, `carryGet` and `carrying`. All answer at
once except `begin`; a refusal answers `nil, reason`.

### Events

Server events every resource receives: filter on `owner`.

| Event | Payload |
|---|---|
| `open77_actions:ready` | `{ generation, version }`: `open77_actions` started; declare again |
| `open77_actions:transition` | `{ opId, action, actionId, owner, playerId, bucket, target, state, reason, stage, receipt, kind, itemId, playbackId, startedAtMs, completeAtMs, trailing }` |
| `open77_actions:marker` | `{ opId, marker, owner, playerId, playbackId }` |
| `open77_actions:carry` | `{ phase, itemId, kind, owner, state, carrier }`, plus `playerId`, `reason`, `opId` or `placement` by phase |

`state` goes `validating`, `reserving` (with a `reserve` hook), `presenting`, `committing`, and ends
`committed`, `cancelled`, `failed` or `in_doubt`. `stage` names the step an end came from:
`request`, `validate`, `reserve`, `present`, `complete`, `commit`, `cancel` or `carry`. `target` is
the target key (`"my_repairs:machine_1"`). Carry phases: `placed`, `gripped`, `picked_up`,
`put_down`, `dropped`, `removed`, `carry_suspended`, `carry_resumed`, `projection_failed`, and
`pickup_<state>` or `putdown_<state>` when a pickup or put-down ends without a commit.

### Why was it refused

| Reason | What it means | What to do |
|---|---|---|
| `target_claimed` | another player holds the spot | wait: it frees up when they finish |
| `destination_claimed` | another item holds that put-down `claimKey` | use another slot |
| `actor_busy` | the player already runs an action, or `cooldownMs` has not passed | wait, or pass `supersede = true` |
| `too_far` | beyond `maxDistance`, or the item's `reach` | move closer; keep `maxDistance` at least the target's `distance` |
| `destination_too_far` | over `reach` + 1 m (5 m at most) from the drop point, or beyond `vehicleReach` | stand closer |
| `wrong_bucket` | not in the bucket of the target, item or truck | check the target's `bucket` |
| `position_stale`, `position_unavailable`, `player_not_ready`, `player_unavailable` | no fresh position yet, still loading in, or gone | retry once the player is in the world |
| `player_not_alive`, `player_in_vehicle`, `in_combat` | dead, in a vehicle, aiming or firing | retry once alive, on foot and not aiming |
| `carrying` | hands full, and the action has no `whileCarrying` | put the item down, or set `whileCarrying = true` |
| `not_carrying`, `item_unavailable` | nothing in hands; the item is gone or someone else is lifting it | nothing |
| `destination_invalid`, `vehicle_unavailable` | a malformed destination; no vehicle with that id | check `kind`, `vehicleId`, `claimKey` |
| `not_eligible`, or the provider's token | your eligibility export said no | clock in, or get the job |
| `stale_job_epoch` | job, grade or duty changed since the start | start again |
| `refused_by_owner` | your hook said no without a reason | return your own token, such as `already_fixed` |
| `hook_failed` | your hook raised an error | read the server log |
| `animation_refused`, `attach_failed` | the animation could not start; the carried prop could not be held | check the profile or the model, or set `required = false` |
| `owner_unavailable`, `not_owner`, `unknown_action`, `unknown_target`, `invalid_*` | a reload since `define`, someone else's action or item, a failed `verify`, a wrong id or table | declare again; fix the call |
| `cancelled_by_player`, `superseded` | **X** on the bar; a newer action | nothing |
| `dead`, `disconnected`, `bucket_changed`, `vehicle`, `combat` | the player died, left, changed bucket, got in a car, aimed or fired | nothing |
| `moved` | moved past `moveTolerance` (an action without animation), or a server move took the body | nothing |
| `animation_interrupted` | the posture broke: shoved, pushed off the spot, teleported | raise `arrivalRadius` at spots that push back |
| `claim_lost`, `reserve_timeout` | the claim ran out (`claimTtlMs`); your `reserve` hook was too slow (the player sees nothing) | raise the limit, or make the hook faster |
| `owner_stopped`, `resource_stopping`, `cancelled` | your resource or `open77_actions` stopped; `cancel(opId)` without a reason | nothing |
| `in_doubt` | the commit's outcome is still unknown after the retries | settle it with the coordinator's `status` |

A start reason can also end a running action, when the end-of-time checks refuse it (`too_far`,
`not_eligible`, your token). A `commit` that answers `nil, reason` ends the action `failed` with
that reason.

### Limits

- 64 actions and 64 targets per resource, 512 targets per server, 128 carry items per resource,
  4 choices per target, 8 markers per action.
- A player sees at most the 12 nearest prompts, and their client sends at most six choices a second.
- The walk pace and jump lock of a carry are applied by the player's client; the server sees
  positions, not inputs. An unarmed punch ends a carry only if it breaks the carry pose.
- There are no station "recipes": add a stage with your own hooks or a second action, as
  [Build your first Lua job](build-a-job.md) shows.

See also: [Durable transactions](transactions.md), [Furniture](furniture.md),
[Interactions](interactions.md), [Player interactions](player-interactions.md),
[RP animations](rp-animations.md), [Props](props.md), [UI kit](ui-kit.md).
