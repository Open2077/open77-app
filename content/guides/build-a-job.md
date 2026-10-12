# Build your first Lua job

Create a repair activity: the player approaches a work spot, chooses **Repair the machine**,
works for six seconds, consumes one fuse and earns 40 eddies. Other players nearby see the
animation. A second worker must wait until the spot is free.

This tutorial is for resource authors who can edit Lua. To enable or customize an existing job,
start with [Jobs and world interaction](world-interaction.md#start-with-an-example-job).

## What you will build

The resource has one repair action and one work spot. You choose the position, animation,
duration, required item and reward. Open77 supplies the prompt, progress bar, shared animation
and checks that the player can still work there. Your Lua functions decide when a repair is
allowed and which items and money it changes.

The machine is a location in your script. This example does not change a vanilla vending
machine's functionality, mesh or built-in interaction. Its repaired state is kept in memory,
resets on resource restart and normally becomes repairable again after ten minutes. The fuse
and payment are saved in the database. A production job must also save and recover any world
state that controls whether another reward is allowed.

## Before you start

- Be able to create and start a Lua resource, and choose a clear place to test.
- Install `open77_actions`, its presentation dependencies and `open77_transactions`. Step 5
  lists the resources and permissions this example needs.
- Configure a [SQL database](database.md) for the transaction system.
- Use a client with an RP animation archive containing `amb_1056d7_kneel_welder`. The profile
  supplies the kneeling welder pose used here.

This example uses the transaction library directly so it can be followed without the RP pack.
For a server already using `rp_inventory` and `rp_economy`, follow the adapters used by
[`rp_salvage`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_salvage): define items
through the inventory and use the economy's sale/payment operations. Keep one inventory and
wallet owner per account.

## The four functions you write

These functions are called **hooks**: the action library calls them at specific points in the work.

| Hook | Your responsibility | Repair example |
|---|---|---|
| `validate` | Decide whether the action is allowed now. | Is the machine still broken? |
| `reserve` | Hold the required items and planned reward before work begins. | Reserve one fuse and a payment of 40 eddies. |
| `commit` | Apply the result once the work succeeds. | Consume the fuse, pay the worker and mark the machine repaired. |
| `cancel` | Release an unused reservation, or resolve an uncertain payment. | Keep the fuse if the repair did not commit. |

Create the two files below. Append the server code from steps 2–4 to the same `server/main.lua`,
then configure and start the resource in step 5. That step also supplies an admin command to
give a test character fuses. The later variations are edits to this example, not extra blocks
to paste unchanged.

## Step 1: the manifest

```lua
-- my_repairs/open77.lua
resource "my_repairs"
version "0.1.0"
auto_start false

dependency "open77_actions >=0.1.0"
dependency "open77_transactions >=0.1.0"

server_script "server/main.lua"
```

No permission is needed: the resource only calls exports. No client script either: the prompt, the
bar and the control locks are drawn by `open77_actions` itself.

If your resource **does** ship a client script, do not list a server-only resource
(`open77_transactions`, `open77_furniture`) as a `dependency`: players' clients would refuse to load
it and leave the server. Wait for that resource's `ready` event instead.

## Step 2: the action and the spot

An **action** is what the player does (repair, 6 seconds, kneeling). A **target** is where they do
it (the machine). Declare both when your resource starts.

```lua
-- my_repairs/server/main.lua
local RESOURCE = GetCurrentResourceName()
local PAY = 40

-- Coordinator calls wait for the database: call them through this helper, from a hook or a thread.
local function tx(name, ...)
    local promise, why = Open77.exports.call("open77_transactions", name, ...)
    if not promise then return nil, why end
    return promise:await()
end

-- Only open77_actions may call our hooks.
local function fromActions() return GetInvokingResource() == "open77_actions" end

-- Which machines are broken. Kept in memory: forgotten on restart.
local broken = { machine_1 = true }

local function declare()
    local actions = exports.open77_actions
    actions:define({
        id = "repair",
        label = "Repair the machine",
        durationMs = 6000,                  -- the server's clock decides when it is done
        maxDistance = 2.0,                  -- checked at the start and again before paying
        animation = { profile = "amb_1056d7_kneel_welder", at = "target" },
        progress = { label = "Repairing" }, -- the bar; X cancels
        hooks = {
            validate = "repairValidate", reserve = "repairReserve",
            commit = "repairCommit", cancel = "repairCancel",
        },
    })
    actions:target({
        id = "machine_1",
        position = { x = -1410.2, y = 958.4, z = 23.4 },   -- where the technician stands
        yaw = 90.0,                                          -- the way they face while working
        label = "Broken vending machine",
        actions = { "repair" },                              -- offered on E
    })
end

CreateThread(declare)
AddEventHandler("open77_actions:ready", declare)   -- declare again if open77_actions restarts

local function defineItems()
    exports.open77_transactions:define({ fuse = { weightG = 100 } })
end
CreateThread(defineItems)
AddEventHandler("open77_transactions:ready", defineItems)
```

To find a spot's position, stand where the player should stand and read your position (for
example with `/pos`). The prompt card is drawn 1 m above that point. While the pose plays, the
player sees themselves in third person.

A target can offer up to four actions, on **E**, **F**, **R** and **Y**: `actions = { "repair",
"inspect" }` puts repair on E and inspect on F. The card shows the first action's label.

## Step 3: the four hooks

Register each hook with `exports("name", function(ctx) ... end)`, using the name declared on the
action. `ctx` contains the player, work spot and current operation. The caller checks in the
example ensure these functions run as part of an action.

| Hook | When it runs | In this job |
|---|---|---|
| `validate` | at the start, and again just before paying | refuse if the machine is already fixed |
| `reserve` | after the spot is claimed, before the animation | hold one fuse and 40 eddies; no fuse means no repair |
| `commit` | when the time is up and every check passed again | make the hold final, mark the machine fixed |
| `cancel` | once, on any end that is not a commit | release the hold |

```lua
-- validate: answer at once (no Wait, no await).
exports("repairValidate", function(ctx)
    if not fromActions() then return false, "not_owner" end
    if not broken[ctx.target.id] then return false, "already_fixed" end   -- your own reason
    return true
end)

-- reserve: may wait for the database. Hold the value now, so an empty pocket is refused
-- before the bar starts.
exports("repairReserve", function(ctx)
    if not fromActions() then return nil, "not_owner" end
    if not exports.open77_actions:verify(ctx.opId, "reserve") then return nil, "not_owner" end
    local pockets, why = exports.open77_transactions:account(ctx.playerId, "char")
    local cash = pockets and exports.open77_transactions:account(ctx.playerId, "cash")
    if not cash then return nil, why or "no_account" end
    local txOpId = "repairs:" .. ctx.opId                 -- one id per repair
    local held, reason = tx("reserve", { opId = txOpId, kind = "repair", actor = pockets,
        reason = "vending repair", lines = {
            { item = "fuse", count = 1, from = pockets, to = "sys:repairs" },   -- the fuse is used up
            { money = PAY, from = "sys:repairs", to = cash },                   -- the pay is created
        } })
    if not held then return nil, reason end               -- e.g. insufficient_items
    return { txOpId = txOpId, pockets = pockets, cash = cash }   -- comes back as ctx.reservation
end)

-- commit: may wait. Make the hold final.
exports("repairCommit", function(ctx)
    if not fromActions() then return nil, "not_owner" end
    if not exports.open77_actions:verify(ctx.opId, "commit") then return nil, "not_owner" end
    local receipt, why = tx("commit", ctx.reservation.txOpId)
    if not receipt then return nil, why end               -- the library retries this hook
    broken[ctx.target.id] = nil
    SetTimeout(600000, function() broken[ctx.target.id] = true end)   -- breaks again in 10 min
    return { txOpId = receipt.opId, paid = PAY, replay = receipt.replay }   -- comes back as op.receipt
end)

-- cancel: release the hold.
exports("repairCancel", function(ctx)
    if not fromActions() then return end
    local held = ctx.reservation and ctx.reservation.txOpId
    if not held then return end                           -- nothing was held yet
    if ctx.reason ~= "in_doubt" then
        exports.open77_transactions:cancel(held, ctx.reason)
        return
    end
    -- Rare: the database stopped answering during the commit. Ask until the outcome is known.
    CreateThread(function()
        for _ = 1, 12 do
            local s = tx("status", held, { resolve = true })
            if s and s.state == "committed" then broken[ctx.target.id] = nil return end
            if s and s.state ~= "in_doubt" and s.state ~= "committing" then return end
            Wait(5000)
        end
    end)
end)
```

Why the fuse and the pay go through `open77_transactions` instead of "remove item, add money":
both lines change in **one** database transaction, under one id (`txOpId`). Either both happen or
neither does. Retrying the same operation id returns its saved receipt without applying the
transfer again. Here the transaction id is derived from `ctx.opId`; keep that id when retrying
or resolving an uncertain result. A new id represents a new operation and can pay again.

`ctx` also carries `playerId`, `bucket`, `phase` (`"begin"` or `"complete"`), `target = { key, id,
position, yaw, data }`, `data`, `receipt` and, for `cancel`, `reason`. The full list is in
[Actions and carrying](actions.md).

## Step 4: tell the player what happened

The player already sees some messages without your help:

- a refusal at the start, from your `validate` hook or a check: "Refused: already_fixed", or a
  sentence for the common ones ("Someone is already using this.", "Too far away.");
- a stop after the bar started: "Action stopped: <reason>" (not for **X**).

A refusal by your `reserve` hook (no fuse) and a successful repair show nothing. Tell the player
yourself, from the event every action sends when its state changes:

```lua
local RESERVE_MESSAGES = {
    insufficient_items = "You need a fuse.",
    mint_cap_exceeded = "The repair desk has paid enough for this hour.",
}

AddEventHandler("open77_actions:transition", function(op)
    if op.owner ~= RESOURCE then return end               -- every resource receives every action
    if op.state == "committed" then
        Open77.chat.send(op.playerId, ("Machine repaired: +%d eddies."):format(op.receipt.paid))
    elseif op.state == "failed" and op.stage == "reserve" then
        Open77.chat.send(op.playerId, RESERVE_MESSAGES[op.reason] or ("Cannot repair: " .. tostring(op.reason)))
    end
end)
```

`op` carries `opId`, `actionId`, `playerId`, `target`, `state`, `stage`, `reason` and `receipt` (what
your `commit` returned). The coordinator keeps the full receipt of every operation: type
`transactions status <txOpId>` in the server console.

## Step 5: turn it on

In your server configuration, add the resources to `resources.load`:

```text
resources.load: [ ..., "open77_transactions", "open77_animations", "open77_props",
                  "open77_interactions", "open77_uikit", "open77_actions", "my_repairs" ]
```

Then, once, in the server console:

```text
tunable.set open77_transactions writers my_repairs:char+cash
tunable.set open77_transactions mint1 my_repairs sys:repairs money 20000
ensure open77_transactions
ensure open77_actions
ensure my_repairs
```

- `writers` lets `my_repairs` change pockets (`char`) and wallets (`cash`). On a server with other
  jobs, list them all ([who may write](transactions.md#who-may-write-and-who-may-create-value)).
- The mint rule lets `my_repairs` create at most 20,000 eddies an hour out of `sys:repairs`. Nothing
  can create money by default: without this rule, every repair is refused `mint_denied`. Using up the
  fuse needs no rule.
- These resources do not start on their own (`auto_start false`): `ensure` starts them, dependencies
  first.

**Fuses for testing.** The repair takes a fuse from the player's pockets. With the RP pack,
[`rp_inventory`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_inventory) gives every character pockets and you hand out fuses through it. On a server without
the RP pack, nothing creates the pockets yet (the reserve answers `unknown_account`): open them and
hand out fuses yourself, for example with an admin command:

```lua
RegisterCommand("fuses", function(source)
    CreateThread(function()
        local pockets = exports.open77_transactions:account(source, "char")
        tx("open", pockets, { capacityG = 30000 })      -- creates the pockets if they do not exist
        local receipt, why = tx("transfer", { opId = exports.open77_transactions:newOpId(),
            kind = "grant", lines = { { item = "fuse", count = 3, from = "sys:repairs", to = pockets } } })
        Open77.chat.send(source, receipt and "You received 3 fuses." or ("No fuses: " .. tostring(why)))
    end)
end, true)   -- true: admins only
```

Creating fuses needs its own mint rule:
`tunable.set open77_transactions mint2 my_repairs sys:repairs fuse 200`. Do not `open` pockets that
`rp_inventory` manages: `open` sets their capacity again. More in
[Give an item](transactions.md#give-an-item).

On a server that runs the RP pack, define items through `rp_inventory` and pay through [`rp_economy`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_economy)
instead, as the scrapyard job does in its
[`server/ledger.lua`](https://github.com/Open2077/open77-resources/blob/main/rp/rp_salvage/server/ledger.lua).

## Try it

| You do | What happens |
|---|---|
| press E with no fuse | nothing starts; your chat line "You need a fuse." |
| press E with one fuse | kneel, 6 s bar, the fuse is gone, +40 eddies, "Machine repaired: +40 eddies." |
| press E again | "Refused: already_fixed" |
| press X during the bar | the bar stops, the fuse stays in your pockets, nothing is paid |
| a second player presses E on the same machine while you work | they see "Someone is already using this." |
| walk away during the bar | the action stops, the fuse stays |

## Grow the job

Once the basic repair works, add your own rules or connect it to another action. The following
variations show where to put skill requirements, reward calculations, confirmation dialogs and
an inspection stage. Apply one variation at a time; snippets with `...` show only the changed fields.

### Only skilled technicians may repair

A yes/no rule goes into `validate`. It must answer at once, so keep what it reads in memory (here a
`skill` table your job system fills):

```lua
local skill = {}   -- playerId -> level, filled by your job system

exports("repairValidate", function(ctx)
    if not fromActions() then return false, "not_owner" end
    if not broken[ctx.target.id] then return false, "already_fixed" end
    if ctx.phase == "begin" and (skill[ctx.playerId] or 0) < 2 then
        return false, "skill_too_low"         -- refused before anything is held
    end
    return true
end)
```

The player sees "Refused: skill_too_low". Reason words may use letters, digits, `_`, `:`, `.` and
`-`, up to 64 characters; anything else is shown as `refused_by_owner`.

### Change the reward based on skill

Reserve the best case, commit what was earned. The coordinator accepts a commit up to what was
reserved (more is refused `exceeds_reservation`). Base the amount only on the operation id and on
what `reserve` stored, so a retried commit asks for exactly the same lines:

```lua
local function roll(opId, sides)                       -- the same opId always gives the same number
    local h = 0
    for i = 1, #opId do h = (h * 31 + opId:byte(i)) % 2147483647 end
    return h % sides + 1
end

-- in repairReserve: reserve the best case, 60, and remember the skill:
--   { money = 60, from = "sys:repairs", to = cash }
--   return { txOpId = txOpId, pockets = pockets, cash = cash, skill = skill[ctx.playerId] or 0 }

-- in repairCommit:
local r = ctx.reservation
local pay = 20 + 10 * math.min(roll(ctx.opId, 4), r.skill)   -- 20 to 60, the same on every retry
local receipt, why = tx("commit", r.txOpId, { lines = {
    { item = "fuse", count = 1, from = r.pockets, to = "sys:repairs" },
    { money = pay, from = "sys:repairs", to = r.cash },
} })
```

Never use `math.random` here: a retried commit with different lines is refused `op_id_conflict`. A
minigame of your own may choose between outcomes the server allows, but the client's answer is
never the reason money appears.

### Ask before using the fuse

`reserve` may wait, so it can ask the player with a [UI kit](ui-kit.md) dialog while the spot is
already theirs. Give the action a `reserveTimeoutMs` longer than the dialog:

```lua
actions:define({ id = "repair", durationMs = 6000, reserveTimeoutMs = 30000, ... })

exports("repairReserve", function(ctx)
    if not fromActions() then return nil, "not_owner" end
    local promise = Open77.exports.call("open77_uikit", "alert", ctx.playerId, {
        title = "Use a fuse?", message = "The machine needs one fuse.", confirm = "Repair",
        cancel = "Leave it", timeoutMs = 20000,
    })
    local answer = promise and promise:await()
    if type(answer) ~= "table" or answer.value ~= "confirm" then return nil, "declined" end
    if not exports.open77_actions:verify(ctx.opId, "reserve") then return nil, "not_owner" end
    -- ... then the same coordinator reserve as in step 3 ...
end)
```

**Enter** (Repair) continues to the work. **Esc** (Leave it) ends the action `declined`: nothing is
held, the fuse stays. The player can still move while the dialog is open; the distance is checked
again before paying.

### Inspect first, then repair

Make each animation its own action. Offer only the first one on the target: a player can then never
start the second from a prompt, only your resource can. Start the second when the first one commits:

```lua
actions:define({ id = "inspect", label = "Inspect the machine", durationMs = 3000, maxDistance = 2.0,
    animation = { profile = "amb_cf84c6_kneel_use_driller", at = "target" },
    hooks = { commit = "inspectDone" } })               -- nothing is paid: the commit just answers
actions:define({ id = "repair", ..., hooks = { validate = "repairValidate", ... } })
actions:target({ id = "machine_1", ..., actions = { "inspect" } })   -- "repair" is not offered

exports("inspectDone", function(ctx)
    if not fromActions() then return nil, "not_owner" end
    return { inspected = true }
end)

AddEventHandler("open77_actions:transition", function(op)
    if op.owner ~= RESOURCE or op.state ~= "committed" or op.actionId ~= "inspect" then return end
    local second, why = exports.open77_actions:request(op.playerId, "repair", "machine_1",
        { data = { after = op.opId } })
    if not second then print("repair refused: " .. tostring(why)) end
end)

-- repairValidate: only after this player's own inspection of this machine
exports("repairValidate", function(ctx)
    if not fromActions() then return false, "not_owner" end
    local first = ctx.data and exports.open77_actions:status(ctx.data.after)
    if not first or first.state ~= "committed" or first.actionId ~= "inspect"
        or first.playerId ~= ctx.playerId or first.target ~= ctx.target.key then
        return false, "not_inspected"
    end
    return true
end)
```

Between the two actions the spot is free for a moment, so another player could take it (the repair
is then refused `target_claimed`). If that matters, keep one action and put the extra rule in a
hook. Inside a single action, `markers` (up to eight named moments on the server clock) and
`commitAtMs` (pay before the animation ends) are described in [Actions and carrying](actions.md).

### Keep the job reliable

- Keep `validate` quick: it cannot `Wait` or `await`. Load persistent eligibility data before
  the action needs it.
- Let the action library time completion; apply rewards in the server's `commit` hook.
- Reuse the transaction id for retries. If the result is `in_doubt`, ask for its status before
  making another payment. A stopped progress bar does not prove a payment was rolled back.
- Keep configured work spots in a table. Avoid periodic `Open77.world.nearby` scans; they can
  stall the game in crowded areas.
- Save items and money through the transaction system. Save the job's own world state too if a
  restart must preserve repaired machines, depleted resources or completed orders.

## Crates, trucks and seats

- **Carry a crate in both hands**, put it down on the ground or load it into a truck: see
  [carrying in Actions](actions.md). Items change hands only in your `putdown` hook.
- **Crates, piles and ore nodes that survive a restart**: `open77_containers`, see
  [Durable world containers](transactions.md#durable-world-containers). A node has charges that
  regrow, which is how a mine or a wreck runs out and comes back.
- **Truck beds**: the RP pack's [`rp_cargo`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_cargo) loads a crate into `veh:<plate>:cargo` once [`rp_garage`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_garage)
  confirms the player holds the key, and draws the crate in the bed.
- **Seats**: `open77_seating` sits players on the world's own chairs and stools and shares the
  one-player-per-spot rule with actions, so a job can keep players off its seats while it runs. See
  [Furniture](furniture.md).
- **Two players**: a cook hands a dish, the customer accepts and pays: see
  [Player interactions](player-interactions.md) and the street-food stall.

## Ready-made jobs to copy

| Job | Resource | What it shows |
|---|---|---|
| Scrapyard salvage | [`rp_salvage`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_salvage) | tool wear, material yields, ground crates, carrying, vehicle access and a sale with a business share |
| Street food | [`rp_streetfood`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_streetfood) | cook at a grill from a shared pantry, serve a dish that the customer accepts and pays for, eat it seated at a real table |

`rp_salvage` keeps all its item and money code in one file, `server/ledger.lua`: copy that shape.
Their configured positions are for one scrapyard and one food court. Keep them when trying the
original examples; choose and test new positions when moving the jobs to your own venues.

## Why was the action refused?

| Reason | What it means | What to do |
|---|---|---|
| `too_far` | the player is further than `maxDistance` (2.5 m by default) from the target | move the target's `position` to where players stand, or raise `maxDistance` |
| `target_claimed` | another player is using the spot | wait; it is free again when they finish |
| `actor_busy` | the player is already doing an action | finish or cancel the first one |
| `carrying` | the player holds a crate | put it down, or set `whileCarrying` on the action |
| `player_in_vehicle`, `player_not_alive`, `player_not_ready` | the player cannot act right now | get out of the car, respawn, finish loading |
| `in_combat` | the player is aiming or firing | lower the weapon |
| `wrong_bucket` | the player is in another world instance than the target | declare the target in that instance |
| `position_unavailable`, `position_stale` | the server has no fresh position for the player | retry in a moment |
| `not_eligible` or your job system's reason | the job check refused (job, grade, duty) | go on duty, or check `eligibility` |
| your own reason (`already_fixed`) | your `validate` hook said no | as you designed it |
| `refused_by_owner` | your hook refused with a reason that is not a plain word | return a word such as `already_fixed` |
| `insufficient_items`, `insufficient_funds` | the reserve found no fuse, or not enough money | tell the player (step 4) |
| `mint_denied` | no mint rule lets your resource create this money or item | add a `mintN` rule (step 5) |
| `mint_cap_exceeded` | the mint rule's hourly cap is used up | wait, or raise the cap in the `mintN` rule |
| `namespace_denied` | your resource is not in `writers` for that kind of account | add it to `writers` (step 5) |
| `reserve_timeout` | your `reserve` hook took longer than `reserveTimeoutMs` (20 s) | raise `reserveTimeoutMs` for dialogs |
| `animation_refused` | the pose could not start | check the profile name and the RP archive |
| `unknown_action`, `invalid_target`, `not_owner`, `owner_unavailable` | the action or target does not exist, or belongs to another resource, or your resource restarted | declare again on `open77_actions:ready` |

Actions that stop after the bar started end with `cancelled_by_player` (X), `moved`,
`animation_interrupted`, `dead`, `disconnected`, `vehicle`, `combat`, `bucket_changed`,
`claim_lost`, `superseded` (a newer action), `stale_job_epoch` (the player clocked off) or
`owner_stopped` (your resource restarted). The library releases the spot and its animation/control
claims. Your cancellation code must also release or resolve any transaction reservation it created.

## Operator notes

- **List and `ensure` the job resources.** `open77_actions`, `open77_transactions`,
  `open77_containers`, `open77_seating`, `open77_furniture` and the job resources do not start on
  their own. A name missing from `resources.load` is never started and nothing is logged.
- **`ensure` restarts dependants too.** Restarting a job ends its running actions and drops what its
  players carry (the scrapyard job puts every crate back where it last was). Restarting
  `open77_actions` restarts every job.
- **List `open77_furniture` next to `open77_seating`**, or seating answers `furniture_unavailable`.
- **The coordinator needs MariaDB or MySQL with InnoDB** ([SQL database setup](database.md)) and the
  `writers` and mint tunables ([install](transactions.md#install)).
- **Write prompt labels in plain ASCII.** Characters such as `€` or long dashes show as `?` on prompt
  cards: write "18 eddies".
- **Pick spots the crowd does not use.** Pedestrians can stand on a job spot such as a grill. Seats
  are kept free for players automatically; action spots are not. Choose a quiet spot, or turn the
  crowd down there.
- **Limits per player and per resource**: the 12 nearest action spots show prompts at a time; a
  resource can declare 64 actions and 64 targets; a player's client may send at most six choices a
  second.

## Coming from FiveM

The ideas map closely, but none of these is API-compatible with the FiveM resource it is compared to.

| In a FiveM server | Here | What changes |
|---|---|---|
| `ox_target` options on a zone, a model or an entity | `open77_actions` targets (`target{ position, actions }`), or [`open77_interactions`](https://github.com/Open2077/open77-resources/tree/main/system/open77_interactions) for a simple prompt | the server checks distance, instance and job again; the client's prompt decides nothing |
| `ox_target` `groups` (job-gated options) | the action's `eligibility = { resource = "rp_jobs", export = "eligible", args = { job, duty } }` | asked at the start and again before paying |
| `lib.progressBar` with `disable` and `anim` | the action's `progress`, `claims = { move, attack, jump, walkSpeed }` and `animation = { profile, at }` | the bar is only a display; the server's `durationMs` decides |
| `ox_inventory` stashes | coordinator accounts: `stash:<key>` for a fixed store, `world:<id>` for a crate or pile | every move has an id and a receipt |
| `AddItem` / `RemoveItem` / `addMoney` in a server callback | one `reserve` before the work and one `commit` after it, items and money in the same lines | the same id never pays twice |
| qb-core / ESX job, grade and duty | the RP pack's `rp_jobs` | a clock-off cancels a running action (`stale_job_epoch`) |
| vehicle keys and trunk inventories | the RP pack's `rp_garage` keys and `rp_cargo` `veh:<plate>:cargo` | keyed by plate, not by a vehicle id |
| `TriggerServerEvent("job:done")` from the client | nothing | the server's clock completes the action |

For single natives, the [agent devkit](agents.md) translates FiveM calls; see also
[FiveM compatibility](fivem-compatibility.md).
