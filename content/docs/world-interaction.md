# World interaction: build a job

> **Experimental.** Every resource on this page is opt-in and its names can still change. Two
> complete jobs built on these libraries, a scrapyard and a street-food stall, were proven live on
> two clients, with a male and a female character and actor and observer swapped.
> [What that covers, and what it does not](#status) is listed below. These resources are not in a
> server release yet: check that `open77_actions`, `open77_transactions`, `open77_containers`,
> `open77_seating` and `open77_furniture` are in your server's resources before you build on them.

The world-interaction libraries turn a place in Night City into a job: a prompt on a wreck, a grill
or a bench, an animation timed by the server, items and money that move exactly once, crates a
player carries to a truck, seats on the world's own furniture. Read this page first. It shows how
the pieces fit, who decides what, a small job built step by step with every server check explained,
and how to add a stage of your own without a platform change.

The detailed references are [Actions and carrying](actions.md), [Durable transactions](transactions.md),
[Furniture](furniture.md) and [Contextual interactions](interactions.md).

## How the pieces fit

```text
 player's client                          server
 ───────────────                          ──────
 open77_interactions  "I chose this" ──►  open77_actions ───────────► your hooks (your exports)
   the prompt card                          validate, claim,            validate, reserve,
                                            reserve, animate,           commit, cancel
 open77_actions client ◄── bar, locks ───   re-check, commit;                 │
   bar, locks, G key                        carry helper                      ▼
                                                                      open77_transactions
                                                                      custody: one SQL transaction
                                                                      per operation, receipts
                                                                              ▲
 open77_containers: durable crates, piles and nodes ──────────────────────────┤
 RP pack: rp_inventory, rp_economy, rp_cargo (truck beds) ────────────────────┘
 open77_seating: seats, one-winner claims shared with open77_actions
```

| Piece | What it owns | Guide |
|---|---|---|
| `open77_interactions` | the prompt card a player sees and the key that fires it (client) | [Contextual interactions](interactions.md) |
| `open77_actions` | the server lifecycle of one action: validate, claim the spot, reserve, animate, re-check, commit, and every way it can end; one-winner claims; carrying | [Actions and carrying](actions.md) |
| `open77_transactions` | custody: every move of items or money is one database transaction keyed by an operation id, with a stored receipt | [Durable transactions](transactions.md) |
| `open77_containers` | crates, ground piles and depletable nodes whose contents survive a restart (`world:` accounts); their props and prompts are rebuilt at boot | [Durable world containers](transactions.md#durable-world-containers) |
| `open77_seating` + `open77_furniture` | sitting and leaning on the world's real chairs, stools, benches and walls | [Furniture](furniture.md) |
| `open77_player_interactions` | two-player exchanges with consent (a cook hands a dish, the customer accepts) | [Player interactions](player-interactions.md) |
| `open77_animations`, `open77_props`, `open77_uikit` | presentation the libraries compose: postures, the carried prop, the progress bar | [RP animations](rp-animations.md), [World props](props.md), [The UI kit](ui-kit.md) |

The role-play side lives in the RP pack, [Open2077/open77-rp-examples](https://github.com/Open2077/open77-rp-examples):
`rp_inventory` (pockets on the coordinator), `rp_economy` (wallets, sales, societies), `rp_jobs`
(jobs, duty, eligibility), `rp_garage` (vehicle keys) and `rp_cargo` (crates in truck beds). They are
adapters over the platform pieces, and they are where a FiveM-style server keeps its framework rules.
Their coordinator-backed versions are coming with the RP pack
([pull request #2](https://github.com/Open2077/open77-rp-examples/pull/2)).

## Who decides what

The server decides. A player's client may say exactly three things to `open77_actions`:

1. "I chose this prompt": the action and the target, nothing else;
2. "put down what I carry";
3. "cancel my current action".

It can never say "done". Every claim is re-derived on the server from its own reads: life, vehicle
seat, routing bucket, position and its age, distance, combat, job and duty. Completion comes from
the server's clock after a second round of the same checks. A client sends at most six intents a
second; the rest are dropped.

Value moves in one place only: **your** `commit` and `putdown` hooks (after a `reserve` that holds
it), through the transaction coordinator. A progress bar is not a payment, a prop in a player's
hands is not custody, and a prop's state bag is a display mirror any resource with `state.write` can
overwrite. None of them is ever an input to a decision.

## Status

Proven live on two clients, with both body rigs, actor and observer swapped, on a MariaDB database:

- **The action lifecycle**: validating, presenting, committing and committed after the server's
  bar; two players on one spot get one `presenting` and one `target_claimed`.
- **Cancellations**: the server's cancel, **X** on the bar (`cancelled_by_player`), a teleport
  during the animation (`animation_interrupted`), a newer action (`superseded`), death (`dead`),
  clocking off (`stale_job_epoch`), a restart of the job resource (`owner_stopped`) and a stop of
  `open77_actions` (`resource_stopping`, with no posture or movement lock left behind). Each one
  released the spot.
- **Prompts by key**: holding **E** on an `open77_actions` card starts the action.
- **Carrying**: pickup, walking, putting down on the ground and into a truck bed, unloading into the
  hands, carrying across a teleport, a drop on disconnect, on clock-off and on an owner restart;
  crates rebuilt after a restart of `open77_actions` and after a full server restart.
- **Custody**: strict `writers` and mint caps, receipts, a double press paid once, a database outage
  answered `store_unavailable` (the action failed, nothing moved) and recovered by the probe, durable
  containers and nodes rebuilt from SQL after a full restart.
- **Consented hand-over**: offer, accept (one sale with a society share and a tip) and decline
  (nothing paid).
- **Seating**: NPC occupancy refused, one winner per seat, neighbours on adjacent stools, two players
  on one bench, **E** sits, **X** stands, exits ([details](furniture.md#status)).

Built and covered by offline tests, not yet proven live:

- the second to fourth choice keys of a card (**F**, **R**, **T**): the card shows only the first
  choice, and a choice key fires only while that card is the nearest candidate;
- `lookAt = true` targets; cancellation by a vehicle, combat, a bucket change, a reservation timeout
  or a lapsed claim; an action that ends `in_doubt`; an action's own `markers`;
- seating with panicking pedestrians, with a blocked approach, and on bar seats through
  `open77_seating`;
- `open77_containers` `refill`; the coordinator's retention sweep and `world:` expiry on old data.

Not covered: MySQL 8 (only MariaDB was exercised), lying on beds (refused), and the patterns in
[Add a custom stage](#add-a-custom-stage-without-platform-changes), which use documented contracts
but have not been run as written.

**Job animations need a newer archive.** The job profiles (`amb_*`, such as the kneeling welder and
the market-grill cook) play only on a client whose `Open77RP.archive` ships them. The archives in
the current releases carry no `amb_*` device: on such a client the posture does not play. Check your
release notes before you rely on a job posture.

## Build a small job, step by step

The job: a technician repairs a broken vending machine. Each repair uses one `fuse` from their
pockets and pays 40 eddies. It needs one target, one action with four hooks, one coordinator
operation, and a receipt.

On a server that runs the RP pack, define items through `rp_inventory` and pay through `rp_economy`,
as [`rp_salvage`](#the-two-reference-jobs) does; the bare coordinator calls below are for a server
without them.

### 1. The manifest

```lua
-- my_repairs/open77.lua
resource "my_repairs"
version "0.1.0"
auto_start false

dependency "open77_actions >=0.1.0"
dependency "open77_transactions >=0.1.0"

server_script "server/main.lua"
```

No permission: the resource only calls exports, and exports and host events need none. No client
script: the prompt, the bar and the control locks are drawn by `open77_actions`' own client half.

A resource that **does** ship a client script must not list a server-only resource
(`open77_transactions`, `open77_furniture`) as a `dependency`: the client validates every dependency
of a resource it activates and refuses with `missing_dependency:<name>`, which ends the session. Wait
for the server-only resource's `ready` event instead, as `open77_containers` does.

### 2. The action and the target

```lua
-- my_repairs/server/main.lua
local RESOURCE = GetCurrentResourceName()
local PAY = 40

-- Mutating coordinator exports yield: call them through the promise form, from a thread or a hook.
local function tx(name, ...)
    local promise, why = Open77.exports.call("open77_transactions", name, ...)
    if not promise then return nil, why end
    return promise:await()
end

local function fromActions() return GetInvokingResource() == "open77_actions" end

-- Which machines are broken: this resource's own state, not value. Forgotten on restart.
local broken = { machine_1 = true }

local function declare()
    local actions = exports.open77_actions
    actions:define({
        id = "repair",
        label = "Repair the machine",
        durationMs = 6000,                  -- the server's clock, not the bar, decides when it is done
        maxDistance = 2.0,                  -- checked at the start and again before the commit
        animation = { profile = "amb_1056d7_kneel_welder", at = "target" },
        progress = { label = "Repairing" }, -- X cancels
        hooks = {
            validate = "repairValidate", reserve = "repairReserve",
            commit = "repairCommit", cancel = "repairCancel",
        },
    })
    actions:target({
        id = "machine_1",
        position = { x = -1410.2, y = 958.4, z = 23.4 },   -- where the technician stands: /pos on the spot
        yaw = 90.0,                                          -- the way they face while working
        label = "Broken vending machine",
        actions = { "repair" },                              -- the E choice
    })
end

CreateThread(declare)
AddEventHandler("open77_actions:ready", declare)   -- open77_actions forgets everything when it restarts

local function defineItems()
    exports.open77_transactions:define({ fuse = { weightG = 100 } })
end
CreateThread(defineItems)
AddEventHandler("open77_transactions:ready", defineItems)
```

The target's `position` is where the player stands, usually a floor point. Its card is drawn 1 m
above it and fires as soon as the player is within reach and the card is on screen
([prompt fields](actions.md#prompts-and-choice-keys)). A workspot animation switches the player to
third person while it plays and gives the view back after.

### 3. The hooks

A hook is the **name** of an export of your resource. Any resource can call an export, so each hook
checks its caller first.

```lua
-- validate: synchronous (no Wait, no await). Asked at the start and again before the commit.
exports("repairValidate", function(ctx)
    if not fromActions() then return false, "not_owner" end
    if not broken[ctx.target.id] then return false, "already_fixed" end   -- your own rule and token
    return true
end)

-- reserve: asynchronous. Runs after the spot is claimed, before the animation. Hold the value now,
-- so an empty pocket is refused BEFORE the bar starts.
exports("repairReserve", function(ctx)
    if not fromActions() then return nil, "not_owner" end
    if not exports.open77_actions:verify(ctx.opId, "reserve") then return nil, "not_owner" end
    local pockets, why = exports.open77_transactions:account(ctx.playerId, "char")
    local cash = pockets and exports.open77_transactions:account(ctx.playerId, "cash")
    if not cash then return nil, why or "no_account" end
    local txOpId = "repairs:" .. ctx.opId                 -- one business id per action
    local held, reason = tx("reserve", { opId = txOpId, kind = "repair", actor = pockets,
        reason = "vending repair", lines = {
            { item = "fuse", count = 1, from = pockets, to = "sys:repairs" },   -- burned
            { money = PAY, from = "sys:repairs", to = cash },                   -- minted
        } })
    if not held then return nil, reason end               -- e.g. insufficient_items: ends before any bar
    return { txOpId = txOpId, pockets = pockets, cash = cash }   -- kept as ctx.reservation
end)

-- commit: asynchronous. Called when the server's clock says done and every check passed again.
exports("repairCommit", function(ctx)
    if not fromActions() then return nil, "not_owner" end
    if not exports.open77_actions:verify(ctx.opId, "commit") then return nil, "not_owner" end
    local receipt, why = tx("commit", ctx.reservation.txOpId)
    if not receipt then return nil, why end               -- in_doubt / busy: the library retries this hook
    broken[ctx.target.id] = nil
    SetTimeout(600000, function() broken[ctx.target.id] = true end)
    return { txOpId = receipt.opId, paid = PAY, replay = receipt.replay }   -- small: kept as op.receipt
end)

-- cancel: once, on every end that is not a commit.
exports("repairCancel", function(ctx)
    if not fromActions() then return end
    local held = ctx.reservation and ctx.reservation.txOpId
    if not held then return end                           -- refused before anything was reserved
    if ctx.reason ~= "in_doubt" then
        exports.open77_transactions:cancel(held, ctx.reason)   -- never yields
        return
    end
    -- In doubt: the coordinator keeps the holds and settles the operation itself. Ask until it knows.
    CreateThread(function()
        for _ = 1, 12 do
            local s = tx("status", held, { resolve = true })
            if s and s.state == "committed" then broken[ctx.target.id] = nil return end
            if s and s.state ~= "in_doubt" and s.state ~= "committing" then return end   -- nothing was paid
            Wait(5000)
        end
    end)
end)
```

`ctx` carries `opId`, `action`, `playerId`, `bucket`, `phase`, `target = { key, id, position, yaw,
data }`, `data`, `reservation`, `receipt` and, for `cancel`, `reason`. The full table is in
[Actions](actions.md#hooks-are-exports-check-who-calls-them).

Why the coordinator, and not three exports that add and remove: the commit is **one** SQL
transaction (the fuse leaves and the pay arrives together or not at all), keyed by `txOpId`. The
library retries a commit that answered `in_doubt` or `busy` with the same context, and the
coordinator **replays** a commit that already happened, so a crash, a retry or a double press can
never pay twice. Derive the operation id from the action (`ctx.opId`), never from a counter of your
own.

### 4. The receipt

```lua
AddEventHandler("open77_actions:transition", function(op)
    if op.owner ~= RESOURCE then return end
    if op.state == "committed" then
        print(("[my_repairs] player %d repaired %s: +%d (%s%s)"):format(op.playerId, op.target,
            op.receipt.paid, op.receipt.txOpId, op.receipt.replay and ", replayed" or ""))
    elseif op.state == "failed" or op.state == "cancelled" then
        print(("[my_repairs] %s ended %s"):format(op.opId, tostring(op.reason)))
    end
end)
```

The event is queued and reaches every resource at the next tick, so filter on `op.owner`. What the
player sees without your help:

- a refusal at the start (your `validate` hook, the claim, the distance...): `Refused: <token>`, or a
  short sentence for the common ones ("Someone is already using this.");
- an end after the bar started: `Action stopped: <reason>` (not for **X** or a newer action);
- **nothing** for a refusal by your `reserve` hook (the action ends `failed`, `stage = "reserve"`,
  before anything was shown) and nothing for a commit. Tell the player from this event, as the
  reference jobs do.

The coordinator keeps the full receipt (`transactions status <txOpId>` on the console, `history` from
Lua).

### 5. Turn it on

The operator, once:

```text
resources.load: [ ..., "open77_transactions", "open77_animations", "open77_props",
                  "open77_interactions", "open77_uikit", "open77_actions", "my_repairs" ]
```

```text
tunable.set open77_transactions writers my_repairs:char+cash
tunable.set open77_transactions mint1 my_repairs sys:repairs money 20000
ensure open77_transactions
ensure open77_actions
ensure my_repairs
```

`writers` lets `my_repairs` write pockets and wallets (on a server that also runs other resources,
list them too: [Durable transactions](transactions.md#who-may-write-and-who-may-create-value)). The
mint rule lets it create at most 20,000 eddies an hour out of `sys:repairs`; nothing mints by
default, so without it the reserve answers `mint_denied`. Burning the fuse into `sys:repairs` needs
no rule. The [operator notes](#operator-notes) explain the rest.

### What the server checks, and why

Every row runs on the server, from its own reads. A refusal at the start holds nothing; an end after
the start releases the spot, stops the animation, gives the controls back and calls your `cancel`
hook once.

| When | Check | Refusal or end | Why |
|---|---|---|---|
| intent arrives | at most 6 intents a player a second | dropped | a client cannot flood the server |
| request | the action exists; a **player** may start only an action the target offers; a **resource** only its own actions | `unknown_action`, `invalid_target`, `not_owner` | a client names one of the choices it was shown, never another |
| request | the owning resource has not reloaded since it declared | `owner_unavailable` | a stale definition cannot run |
| request | one action per player; not while carrying (unless the action sets `whileCarrying`); the action's cooldown | `actor_busy`, `carrying` | a double press or a second job on top of the first |
| start | connected, ready, alive, not in a vehicle | `player_unavailable`, `player_not_ready`, `player_not_alive`, `player_in_vehicle` | acting on a player on the continue screen crashes their client |
| start | the position is known and at most `maxPositionAgeMs` (2 s) old | `position_unavailable`, `position_stale` | distances are measured on fresh data only |
| start | same routing bucket as the target; within `maxDistance` (2.5 m) of the target point, in 3D | `wrong_bucket`, `too_far` | the client's prompt is not trusted for reach |
| start | not aiming, trigger not held | `in_combat` | no repair in the middle of a gunfight |
| start | your `eligibility` providers (`rp_jobs:eligible`, ...) and `epochs` captured | the provider's token, `not_eligible` | job, grade and duty are your framework's |
| start | your `validate` hook, `phase = "begin"` | your token, or `refused_by_owner` | your own rules |
| claim | `target:<owner>:<id>` in the bucket, one winner | `target_claimed` (retryable) | two players, one spot |
| reserve | your `reserve` hook, within `reserveTimeoutMs` (20 s) | your token or the coordinator's; `reserve_timeout` | value is held before the bar; an empty pocket never sees a bar |
| present | the animation starts (`playAt` at the target, at most 5 m away) | `animation_refused` | an action whose `animation.required` cannot play does not run |
| every 100 ms | disconnect, death, bucket change, vehicle, combat, walking off (actions without animation), the spot's claim lapsing, the owner reloading, the animation interrupted | `disconnected`, `dead`, `bucket_changed`, `vehicle`, `combat`, `moved`, `claim_lost`, `owner_stopped`, `animation_interrupted` | the world changes during the bar |
| completion | all of the start checks again, with `completeSlack` (0.75 m) on distance; every claim still held; eligibility; the job epoch unchanged; your `validate` hook, `phase = "complete"` | `cancelled` with that reason | a clock-off or a teleport during the bar is caught here |
| commit | your `commit` hook with the same `opId` on every retry; `in_doubt`, `busy` and transient refusals (`store_unavailable`, `coordinator_unavailable`, `conflict`) retried twice (0.5 s, 1 s) | `failed` with the reason, or `in_doubt` when the outcome is unknown | a commit applies once or not at all |

A refusal token from your hook (`already_fixed`, `skill_too_low`) is passed through verbatim when it
is a word of letters, digits, `_`, `:`, `.` or `-`, up to 64 characters; anything else becomes
`refused_by_owner`. Which refusals the player sees on their own is listed in
[the receipt step](#4-the-receipt).

## Add a custom stage without platform changes

There is no station or recipe language, by design: the two reference jobs share the lifecycle but
differ in custody, in where value comes from, and in the two-player hand-over, and no recipe format
would have removed code from either. A stage is your hooks, and when you need more, a second action.
The patterns below use only documented contracts; they have not been run live as written.

### A rule of your own: a skill check

A rule that only says yes or no goes into `validate`. It runs synchronously, at the start and again
before the commit, so keep whatever it reads in memory:

```lua
exports("repairValidate", function(ctx)
    if not fromActions() then return false, "not_owner" end
    if not broken[ctx.target.id] then return false, "already_fixed" end
    if ctx.phase == "begin" and (skill[ctx.playerId] or 0) < 2 then
        return false, "skill_too_low"         -- refused before the claim: nothing held, no bar
    end
    return true
end)
```

A rule that changes the outcome goes into `commit`. Reserve the best case, commit what was earned:
the coordinator accepts a commit inside its reservation and refuses anything larger
(`exceeds_reservation`). Make the outcome depend only on the operation id and on what the
reservation captured, so a retried commit sends identical lines: a commit that already landed is
replayed only for the same lines, and a different set answers `op_id_conflict`. The scrapyard job
draws its loot this way.

```lua
local function roll(opId, sides)                       -- the same opId always gives the same number
    local h = 0
    for i = 1, #opId do h = (h * 31 + opId:byte(i)) % 2147483647 end
    return h % sides + 1
end

-- reserve: reserve { money = 60, ... } (the best case) with the fuse line, and capture the skill:
--   return { txOpId = txOpId, pockets = pockets, cash = cash, skill = skill[ctx.playerId] or 0 }
-- commit:
local r = ctx.reservation
local pay = 20 + 10 * math.min(roll(ctx.opId, 4), r.skill)   -- 20..60, the same on every retry
local receipt, why = tx("commit", r.txOpId, { lines = {
    { item = "fuse", count = 1, from = r.pockets, to = "sys:repairs" },
    { money = pay, from = "sys:repairs", to = r.cash },
} })
```

The UI kit deliberately has no timing minigame. One you build yourself returns what a client claims:
use its answer to choose between outcomes the server already allows, never as the reason value
appears.

### A question before the work

The `reserve` hook may wait, so it can ask the player through a [UI kit server twin](ui-kit.md#server-twins)
while the spot is already claimed, and refuse when they decline. Give the action a
`reserveTimeoutMs` longer than the dialog:

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
    -- ... the coordinator reserve of step 3 ...
end)
```

The player's controls are not locked while the question is open; the distance is checked again
before the commit.

### A second animation

Make the second stage its own action, and do not offer it on any target: a player can then never
start it from a prompt, only your resource can. Start it when the first one commits, and have it
check that it follows a committed first stage of the same player:

```lua
actions:define({ id = "inspect", durationMs = 3000, animation = { profile = "...", at = "target" },
    hooks = { commit = "inspectDone" } })               -- no value moves: the commit just answers
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
    if not second then print("second stage refused: " .. tostring(why)) end
end)

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

Between the two operations the spot is free for a moment: another player can claim it, and the
second stage is then refused `target_claimed`. When that matters, keep one action and put the extra
rule in a hook. Two smaller tools exist inside one action: `markers` (up to eight named moments on
the server clock, presentation only) and `commitAtMs` below `durationMs`, which commits early and
lets the remaining frames play out; a death during those frames cuts the frames, never the business.

### What a stage must not do

- report "done" from a client: the only completion is the server's clock;
- wait or await in `validate` or `marker`: they must answer at once;
- call `Open77.world.nearby` on a timer: it costs 0.1 to 0.7 s per call in a crowd. Keep your spots in
  server tables (the furniture catalogue answers in tens of microseconds);
- keep value in memory or in a state bag: put it in a coordinator account.

## Carrying, containers, cargo and seats

- **Crates in the hands**: `carryDefine`, `carryPlace`, the built-in put-down on a drop-zone target,
  and `carryPutdown` into a vehicle. Custody moves only in your `putdown` hook. See
  [Carrying things](actions.md#carrying-things).
- **Durable crates and nodes**: an `open77_containers` container is a `world:` account whose contents
  and placement survive a restart; a node carries charges that regrow. See
  [Durable world containers](transactions.md#durable-world-containers).
- **Truck beds**: the RP pack's `rp_cargo` moves a crate's token into `veh:<plate>:cargo` after
  `rp_garage` checks the player's key, and draws the crate in the bed.
- **Seats**: `open77_seating` sits players on the world's furniture and claims each seat in the same
  claims service, so a job can keep players off a table. See [Furniture](furniture.md).
- **Two players**: a consented hand-over goes through `Open77.playerInteractions` with your own
  reservation of the goods; see [Player interactions](player-interactions.md) and the street-food
  stall below.

## The two reference jobs

Both are coming with the RP pack, in
[open77-rp-examples pull request #3](https://github.com/Open2077/open77-rp-examples/pull/3). Read their
READMEs for the full flow, the refusal list and the operator console; do not copy their configuration
blindly (their positions are measured for one scrapyard and one food court).

| Job | Resource | What it shows |
|---|---|---|
| Scrapyard salvage | `rp_salvage` | gather, crate, carry, truck, sale: coordinator reservations with tool wear, a deterministic roll, `world:` crates, depletable nodes, carrying across teleports, loading with a key holder's permission, one sale with a society share, recovery after every restart |
| Street food | `rp_streetfood` | cook, order, consented serve, sale, eat: fixed `stash:` pantry and pass, ingredients burned and the dish minted in one operation, a consented hand-over, a seated meal on real furniture |

Both were proven live on both body rigs. `rp_salvage` is built in six files with one job each;
`server/ledger.lua` is the only file that calls `open77_transactions`, which is the shape to copy.

## Operator notes

- **Opt-in resources need `ensure`.** `open77_actions`, `open77_transactions`, `open77_containers`,
  `open77_seating`, `open77_furniture` and the job resources declare `auto_start false`. List them in
  `resources.load` (an explicit list is a silent allowlist: a missing name is never started and never
  logged), then start each with `ensure <name>`, dependencies first. A `resources.load` entry alone
  does not start them ([selection and startup](server-resources.md#selection-startup-dependencies-and-client-delivery)).
- `ensure` on a running resource restarts it **and its dependants**: a job's running action ends
  `owner_stopped` and its carried items are dropped (the scrapyard job then puts every crate back at
  its last durable placement). Restarting a shared dependency restarts every job on it.
- `open77_furniture` is server-only and is not a manifest dependency of `open77_seating`: list it
  next to it, or seating answers `furniture_unavailable`.
- The coordinator needs a MariaDB/MySQL database (InnoDB, see [SQL database setup](database.md)) and
  the `writers` and mint tunables of
  [Durable transactions](transactions.md#who-may-write-and-who-may-create-value). Its boot self-test
  logs one expected error line ([details](transactions.md#install)).
- **Write prompt labels in ASCII.** Non-ASCII glyphs such as `€` and the em dash render as `?` on
  prompt cards; the street-food stall prints prices as "18 eddies".
- **Pedestrians use the same spots.** Crowd NPCs can stand on a job spot such as the street-food
  grill. Seats are coordinated with `open77_pedestrians` ([Furniture](furniture.md)); `open77_actions`
  targets are not, so pick job spots the crowd does not use, or keep the crowd away from them
  (`pedestrians.crowd off`, `pedestrians.enable off`).
- **Prompts per player**: the 12 nearest eligible `open77_actions` targets are live at a time (the
  prompt service holds at most 32 cards per resource); 64 actions and 64 targets per resource.
- **Automated tests**: hold an injected key at least 250 ms. A short tap can fall between two input
  polls of a slow client and never reach the server.

## FiveM mapping

Conceptual only: none of these is API-compatible with the FiveM resource it is compared to.

| In a FiveM server | Here | What changes |
|---|---|---|
| `ox_target` options on a zone, a model or an entity | `open77_interactions` targets for a prompt; `open77_actions` targets for a job spot (`target{ position, actions }`) | the choice is an intent the server re-checks; `canInteract` and `distance` are presentation, the server's `maxDistance`, bucket and eligibility decide |
| `ox_target` `groups` (job-gated options) | the action's `eligibility = { resource = "rp_jobs", export = "eligible", args = { job, duty } }` | asked at the start and again before the commit |
| `ox_lib` `lib.progressBar` / `progressCircle` with `disable` and `anim` | the action's `progress`, `claims = { move, attack, jump, walkSpeed }` and `animation = { profile, at }` | the bar is drawn for the player; the server's `durationMs` decides when it is done |
| `ox_inventory` stashes | coordinator accounts: `stash:<key>` for a fixed store (a stall pantry), `world:<id>` for a crate or pile, through `open77_containers` | every move is an operation with an id and a receipt |
| `AddItem` / `RemoveItem` and `addMoney` in a job's server callback | one `reserve` before the work and one `commit` after it, items and money in the same lines | the same operation id replays instead of paying twice |
| qb-core / ESX job, grade and duty | the RP pack's `rp_jobs`: `eligible`, `workEpoch`, `setDuty`, the `rp_jobs:workEpoch` event | plugged into `eligibility` and `epochs`; a clock-off cancels a running action (`stale_job_epoch`) |
| vehicle keys and trunk inventories | the RP pack's `rp_garage` keys and `rp_cargo` `veh:<plate>:cargo` | keyed by plate, never by a runtime vehicle id |
| `TriggerServerEvent("job:done")` from the client | nothing | completion is the server's clock |

For single natives, the [agent devkit](agents.md) translates FiveM calls one by one; see also
[FiveM compatibility](fivem-compatibility.md).
