# Actions and carrying

> **Experimental.** Names may still change. Proven live on two clients, with a male and a female
> character and actor and observer swapped, inside two complete jobs: the lifecycle, one winner per
> spot (`target_claimed`), the cancellations listed under [Refusals](#refusals), carrying across
> teleports and into a truck, and prompts fired by **E**, **F** and **R**. Built and tested offline
> only: the fourth choice key (**Y**), `lookAt` targets, markers, an `in_doubt` end, and the vehicle,
> combat, bucket-change, reservation-timeout and lapsed-claim cancellations. Start with
> [World interaction](world-interaction.md) for how this fits with the other pieces.

`open77_actions` runs the part every role-play action repeats, so a job resource writes only its
rules:

```text
prompt ─► server validates ─► claims the spot ─► reserves (your hook) ─► plays the animation
       ─► server re-checks ─► commits (your hook) ─► puts things where they belong
```

It also carries things: pick a crate up, walk with it, put it down on the ground or in a truck.

What it guarantees, so you do not re-implement it:

- **The server decides.** The player's client can say "I chose this prompt" and "cancel mine". It
  can never say "done". Completion comes from the server's clock, after the server re-checks that
  the player is alive, close enough, in the same bucket and still allowed.
- **One winner.** Two players pressing **E** on the same spot: one gets it, the other is told
  `target_claimed`.
- **Every way an action can end is handled.** Death, disconnect, getting in a car, a bucket change,
  combat, walking away, being shoved out of the animation, a newer action, your resource restarting,
  this resource restarting. Each one releases the spot, stops the animation, gives the player their
  controls back and tells your `cancel` hook, once.
- **Late answers cannot touch the next action.** Every message carries an operation id (`opId`); an
  answer for an old operation is dropped.

Nothing here replaces the raw natives. A resource that wants its own prompt, its own animation call
or its own inventory keeps using them; this library is optional.

## Add it to a resource

```lua
-- my_job/open77.lua
resource "my_job"
version "1.0.0"
dependency "open77_actions >=0.1.0"
server_script "server/main.lua"
```

No client script and no permission are needed for actions declared this way: prompts, progress bars
and control blocking are drawn by `open77_actions`' own client half. `open77_actions` is opt-in
(`auto_start false`): list it in your server's `resources.load`, then start it with
`ensure open77_actions` before your job (see the [operator notes](world-interaction.md#operator-notes)).

## A first action

```lua
-- my_job/server/main.lua
local actions = exports.open77_actions

local function declare()
    actions:define({
        id = "weld",
        label = "Weld the frame",
        durationMs = 8000,                      -- the server's clock decides when it is done
        maxDistance = 2.5,                      -- re-checked at the start AND before the commit
        animation = { profile = "amb_1056d7_kneel_welder", at = "target" },
        progress = { label = "Welding" },       -- a bar on the player's screen; X cancels
        hooks = { validate = "canWeld", commit = "payWeld", cancel = "weldCancelled" },
    })
    actions:target({
        id = "frame_1",
        position = { x = -1410.2, y = 958.4, z = 23.4 },
        yaw = 90.0,                             -- the welder faces this way
        bucket = 0,
        label = "Car frame",
        actions = { "weld" },                   -- up to four choices
    })
end

CreateThread(declare)
-- If open77_actions restarts, it forgets everything; declare again.
AddEventHandler("open77_actions:ready", declare)
```

`at = "target"` uses `Open77.animations.playAt`: the body is placed on the target (within 5 m)
facing `yaw`. Workspot animations switch the player to third person while they play and restore the
view afterwards. The job profiles (`amb_*`, such as this kneeling welder) play only on a client whose
`Open77RP.archive` ships them; on an older archive the posture does not play
([status](world-interaction.md#status)).

### Prompts and choice keys

The target's `position` is where the player stands, usually a floor point (read it with `/pos`
standing on the spot). Its prompt card is drawn `promptHeight` metres above that point and fires as
soon as the player is within reach and the card is on screen: there is no need to aim at it.

| Target field | Range, default | What it does |
|---|---|---|
| `distance` | 0.5–25 m, 2.0 | how close the player must be. The card measures its reach to the lifted point, `sqrt(distance² + promptHeight²)`, which equals the server's 3D test on level ground |
| `markerDistance` | 1–120 m, 12 | from how far the dot is drawn (raised to the reach when lower) |
| `promptHeight` | 0–3 m, 1.0 | how high above `position` the card sits. Use a lower value when `position` is already at the height of the thing (a counter top) |
| `lookAt` | `false` | `true` also needs the crosshair on the card. Use it only for spots closer to each other than their `distance`, where the player picks by looking; otherwise the nearest spot in reach wins. Not proven live |
| `arrivalRadius` | 0.5–1.5 m, unset | how close `playAt` must bring the body to this spot ([below](#arrival-radius)) |
| `requires` | `"carrying"` or `"empty"` | offer the card only to players who carry something, or nothing |

**Choice keys.** A target offers up to four actions. They get **E**, **F**, **R** and **Y**, in order,
unless a choice names its own `key` (one letter or digit). **G** (the put-down key), **T** (it opens
the chat) and **X** (cancel) are never defaults. A choice may also set its `label`, `holdSeconds` (0–10) and `icon`.

```lua
actions:target({ id = "wreck_1", position = p, yaw = 180, label = "Wreck", actions = {
    "cut",                                       -- E, labelled with the action's own label
    { action = "pry", label = "Pry it open" },   -- F
    { action = "inspect", key = "Q" },           -- Q instead of R
} })
```

The card shows the **first** choice with its key and "+N more" for the others: a player cannot read
the labels or keys of the second to fourth choices, and **F** is also the game's own interact key.
Only **E** has been proven live; a choice key fires only while its card is the nearest candidate, so
a second card close by (a crate next to a wreck) takes it over. Put the common choice first, and give
rarer choices their own target or a command when players need to discover them.

Prompt labels must be plain ASCII: non-ASCII glyphs such as `€` render as `?` on the card.

Automated tests that inject keys should hold them at least 250 ms. A short tap can fall between two
input polls of a slow client and never reach the server.

### Arrival radius

`playAt` moves the body onto the spot before the posture starts, and counts it as arrived within
0.5 m; a body that then drifts past that radius ends the action. Some spots push the body back: the
market grill of the street-food stall stands behind a counter, and with the default radius every cook
was interrupted (`player_moving`) because the stall pushed the cook off the anchor. Raise the radius
for such spots:

```lua
actions:target({ id = "grill", position = grill, yaw = 64.0, arrivalRadius = 1.0, actions = { "cook" } })
-- or per action, which wins over the target's:
actions:define({ id = "cook", durationMs = 10000,
    animation = { profile = "amb_704dff_cook", at = "target", arrivalRadius = 1.0 }, ... })
```

Both fields take 0.5 to 1.5 m; unset means the platform default, 0.5 m. With 1.0 on the grill and the
counter, cooks committed on both body rigs. Furniture needs the same: a bar stool at its counter stops
the body 0.732 m from the anchor, and 1.0 seats it.

### Hooks are exports: check who calls them

Functions cannot cross between resources, so a hook is the **name** of an export in your resource.
Any resource can call an export, so a hook checks the caller first:

```lua
local function fromActions() return GetInvokingResource() == "open77_actions" end

-- Synchronous: must answer at once (no Wait, no await).
exports("canWeld", function(ctx)
    if not fromActions() then return false, "not_owner" end
    if not isMechanic(ctx.playerId) then return false, "not_a_mechanic" end   -- your rule
    return true
end)

-- Asynchronous: may Wait or await. Return a table on success, nil + reason on refusal.
exports("payWeld", function(ctx)
    if not fromActions() then return nil, "not_owner" end
    if not exports.open77_actions:verify(ctx.opId, "commit") then return nil, "not_owner" end
    givePay(ctx.playerId, 45)   -- see "Durable rewards" below for the safe way
    return { paid = 45 }
end)

exports("weldCancelled", function(ctx)
    if not fromActions() then return end
    print(("weld %s cancelled: %s"):format(ctx.opId, ctx.reason))
end)
```

| Hook | When | Called | Answers |
|---|---|---|---|
| `validate` | before starting (`ctx.phase = "begin"`) and before committing (`"complete"`) | synchronously | `true`, or `false, reason` |
| `reserve` | after validation and the spot claim, before the animation | asynchronously | a table (kept as `ctx.reservation`), or `nil, reason` |
| `commit` | when the server's clock says done and every check passed again | asynchronously | a table (the receipt), or `nil, reason` |
| `cancel` | once, on any end that is not a commit | asynchronously | ignored |
| `marker` | at each `markers` entry (`ctx.marker`) | synchronously | ignored: presentation only |

`ctx` carries `opId`, `action`, `playerId`, `bucket`, `phase`, `target = { key, id, position, yaw,
data }`, `data`, `reservation`, `receipt`, `playbackId`, and `reason` for `cancel`.

### Starting an action from your own code

A prompt is not required. From a command, an NPC event or your own net event:

```lua
local op, reason = exports.open77_actions:request(playerId, "weld", "frame_1")
if not op then print("refused: " .. reason) end
```

`request` answers at once; the end arrives as an event (below). With a `reserve` hook, use the
asynchronous form if you want to wait for the reservation:

```lua
CreateThread(function()
    local op, reason = Open77.exports.call("open77_actions", "begin", playerId, "weld", "frame_1"):await()
end)
```

### Following what happens

```lua
AddEventHandler("open77_actions:transition", function(op)
    if op.owner ~= GetCurrentResourceName() then return end
    -- op.opId, op.state ("presenting", "committed", "cancelled", "failed", "in_doubt"), op.reason
end)
```

`exports.open77_actions:status(opId)` and `:current(playerId)` read the same summary.

## Durable rewards

A progress bar is not a payment. Anything that moves items or money should go through the
[`open77_transactions` coordinator](transactions.md) from **your** hooks, so a crash, a retry or a
double press can never pay twice:

```lua
local function tx(name, ...) return Open77.exports.call("open77_transactions", name, ...):await() end

exports("salvageReserve", function(ctx)
    if GetInvokingResource() ~= "open77_actions" then return nil, "not_owner" end
    local txOpId = "salvage:" .. ctx.opId                 -- one business id per action
    local r, why = tx("reserve", { opId = txOpId, kind = "salvage", lines = {
        { capacityG = 2000, from = "sys:salvage", to = "char:" .. subjectOf(ctx.playerId) },
    } })
    if not r then return nil, why end                     -- e.g. capacity_exceeded: refused before the bar
    return { txOpId = txOpId }
end)

exports("salvageCommit", function(ctx)
    if GetInvokingResource() ~= "open77_actions" then return nil, "not_owner" end
    return tx("commit", ctx.reservation.txOpId, { lines = rollLoot(ctx) })
end)

exports("salvageCancel", function(ctx)
    if GetInvokingResource() ~= "open77_actions" then return end
    if ctx.reservation then tx("cancel", ctx.reservation.txOpId) end
end)
```

If the commit answers `in_doubt` or `busy`, the library retries it with the same context; the
coordinator replays a commit that already happened, so it can never apply twice. If the outcome is
still unknown after the retries, the action ends `in_doubt` (not `failed`): settle it with the
coordinator's `status`.

## Jobs, duty and grades

The library knows nothing about jobs. Plug in your framework:

```lua
actions:define({
    id = "weld", durationMs = 8000,
    -- asked at the start and again before the commit; any export answering ok | nil, reason
    eligibility = { resource = "rp_jobs", export = "eligible", args = { job = "mechanic", duty = true } },
    -- captured at the start; if it changed by the commit (job, grade or duty changed), refused
    epochs = { resource = "rp_jobs", read = "workEpoch", event = "rp_jobs:workEpoch" },
})
```

The `event` also ends the running action at once (`stale_job_epoch`), and drops a carried item.

## Carrying things

```lua
actions:carryDefine({
    id = "scrap_box",
    model = "crate.cardboard",          -- choose a model that fits two hands; tune `binding` for it
    label = "scrap box",
    gripMs = 800,                       -- when the hands close on it (calibrate in game)
    releaseMs = 1300,                   -- when the hands let go
    hooks = { pickup = "boxPicked", putdown = "boxPutDown", dropped = "boxDropped" },
})

local itemId = actions:carryPlace("scrap_box", {
    position = { x = -1408.0, y = 960.1, z = 23.4 }, yaw = 0, bucket = 0,
    data = { container = "world:7f3a" },          -- your durable id; every hook receives it
})
```

The player walks up, presses **E** ("Pick up scrap box"), lifts it, and walks with it: slower (walk
pace), no jumping, no firing. **G** (rebindable in Settings, Key bindings) puts it down in front of
them. Other players see it in their hands; in first person it sits low on the right of the view, with
a "Put down [G]" hint.

Putting it into a truck is your decision, through your own prompt or command. Vehicle ids are 64-bit
engine ids; `vehicleId` accepts any whole number up to 2^53.

```lua
local op, why = actions:carryPutdown(playerId, {
    kind = "vehicle", vehicleId = truckId,
    offset = { x = 0.0, y = -1.6, z = 1.1 },   -- in the truck's frame
    claimKey = "veh:" .. plate .. ":slot2",    -- one crate per slot
})
```

**Custody changes only in your `putdown` hook.** The library moves the prop *after* your hook
commits; it never decides who owns the goods:

```lua
exports("boxPutDown", function(ctx)
    if GetInvokingResource() ~= "open77_actions" then return nil, "not_owner" end
    local dest = ctx.carry.destination
    if dest.kind == "vehicle" then
        local r, why = tx("transfer", { opId = "load:" .. ctx.opId, kind = "load", lines = {
            { item = "scrap", count = 1, from = ctx.carry.data.container, to = "veh:" .. plateOf(dest.vehicleId) .. ":cargo" },
        } })
        if not r then return nil, why end      -- refused: the player keeps carrying it
    end
    return { placement = dest }                -- or { placement = { kind = "remove" } } once sold
end)
```

| Event of the carry | What happens to the item |
|---|---|
| your `pickup` hook refuses | it goes back exactly where it was |
| your `putdown` hook refuses, or the player cancels | the player keeps carrying it |
| a server teleport of the carrier (a Warden move) | the hold is suspended and replayed when the player is back, within 15 s: they keep carrying it (`carry_suspended`, then `carry_resumed`) |
| death, disconnect, getting in a car, a bucket change, combat, the carry pose broken, your resource stopping, a job change | **dropped** at the player's feet; your `dropped` hook is told why; custody unchanged |
| the truck attachment fails after your commit | retried, then left on the ground (`projection_failed`); the commit stands |

A restart of your resource or of `open77_actions` removes the props they own: rebuild your items from
your durable record when you start. The scrapyard reference job puts every crate back at its last
durable placement, and redraws the ones in a truck bed when the truck is taken out again.

A **drop zone** needs no code of its own: a target that offers the built-in put-down shows a prompt to
players who carry something, and puts the item on that point (your `putdown` hook sees `ctx.target`,
and can sell it with `placement = { kind = "remove" }`):

```lua
actions:target({ id = "scrap_counter", position = counterPos, yaw = 180, requires = "carrying",
    actions = { { action = "open77_actions:carry_putdown", label = "Sell" } } })
```

`carryPickup(playerId, itemId)` takes an item out of a truck (players cannot do that from the item's
prompt), `carrying(playerId)` and `carryGet(itemId)` read the state, `carryRemove(itemId)` deletes an
item, `carryDrop(playerId)` forces a drop. Only the resource that placed an item may change it.

## Shared spots without an action

Seats, benches and anything else you run yourself can use the same one-winner claims:

```lua
local token, why = actions:claim(bucket, "seat:" .. benchId, 60000)   -- or nil, "target_claimed"
actions:renewClaim(token, 60000)
actions:releaseClaim(token)
```

Claims are released when your resource stops or reloads. Players seated on world furniture by
`open77_seating` hold the key `furniture:<catalogue version>:<furniture id>` (see
[Furniture](furniture.md)): claim the same key to keep players off a table your job uses.

## Refusals

| Reason | Meaning |
|---|---|
| `target_claimed`, `destination_claimed` | someone else holds it; retryable |
| `too_far`, `wrong_bucket`, `position_stale`, `position_unavailable` | the server's own position read refused it |
| `player_not_alive`, `player_not_ready`, `player_in_vehicle`, `in_combat`, `player_unavailable` | the player cannot act now |
| `actor_busy` | the player already has an action (or a cooldown); pass `supersede` to replace it |
| `carrying`, `not_carrying`, `item_unavailable` | carry state |
| `destination_invalid`, `destination_too_far`, `vehicle_unavailable` | put-down destination |
| `not_eligible`, `stale_job_epoch` | your eligibility provider or epoch guard |
| `refused_by_owner`, `hook_failed`, your own token | your hook said no, or raised |
| `animation_refused`, `attach_failed` | presentation could not start |
| `not_owner`, `unknown_action`, `unknown_target`, `invalid_*` | a programming error |

Ends of a running action: `cancelled_by_player`, `dead`, `disconnected`, `bucket_changed`, `vehicle`,
`combat`, `moved`, `animation_interrupted`, `superseded`, `owner_stopped`, `resource_stopping`,
`claim_lost`, `reserve_timeout`, `stale_job_epoch`, and a commit's own reason (`failed`) or
`in_doubt`.

Seen live, each with the spot released: `target_claimed` (two players on one wreck, two cooks on one
grill), `item_unavailable` (two players lifting one crate), `actor_busy` (a second press during a
sale, paid once), `cancelled_by_player` (**X** on the bar), `animation_interrupted` (a teleport during
the animation), `superseded`, `dead`, `stale_job_epoch` (clock-off, which also dropped a carried
crate), `owner_stopped`, `resource_stopping` (no posture or movement lock left), and `failed` with
`store_unavailable` while the database was paused: nothing moved, and the next action committed once
the database was back. A coordinator answer that says nothing was applied (`store_unavailable`,
`coordinator_unavailable`, `conflict`) is retried with the same operation id and then ends `failed`,
never `in_doubt`.

What the player sees without your help: a refusal at the start (your `validate` hook, the claim, the
distance) as `Refused: <token>`, or a short sentence for the common ones; an end after the bar started
as `Action stopped: <reason>` (not for **X** or `superseded`). A refusal by your `reserve` hook ends
the action `failed`, `stage = "reserve"`, before anything is shown, and the client says nothing: tell
the player from `open77_actions:transition`, which carries `reason` and `stage`.

## Limits

- Prompts: the player sees at most the 12 nearest eligible prompts at once (the prompt service draws
  at most 32 anchors per resource); 64 actions and 64 targets per resource.
- Grip and release are scheduled on the server clock, not read from the animation: calibrate them.
- The walk-pace and no-jump restrictions are applied by the player's client; the server sees
  positions, not inputs.
- An unarmed punch is seen only through the carry pose breaking, not as a server event.
- There are no station "recipes", by design: the two reference jobs share the lifecycle but differ in
  custody, in where value comes from and in the two-player hand-over, and no recipe format would have
  removed code from either. Add a stage with your hooks or a second action
  ([how](world-interaction.md#add-a-custom-stage-without-platform-changes)).
