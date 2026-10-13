# Items, payments and storage

Use `open77_transactions` to save the item and money changes that belong together. A recipe can
consume ingredients and create a meal in one operation. A sale can transfer that meal to the
customer and pay the business in the same operation.

An **operation** is one group of transfers. They are saved together in a database transaction:
all of its lines commit, or none do. Its operation id identifies the result, so retrying the
same id returns a saved receipt without repeating the transfer. Creating a new id creates a
new operation; your job must keep the original id when retrying an uncertain payment.

This page is for authors integrating inventory, recipes, sales or storage. Server owners
enabling an existing job should start with [Jobs and world interaction](world-interaction.md).
For a worked Lua example, see [Build your first Lua job](build-a-job.md).

## Choose your inventory integration

| Your server uses… | Integration to use |
|---|---|
| The RP pack's inventory and economy | Define items through `rp_inventory`; use its asynchronous transfer operations and `rp_economy` sales/payments. Follow the salvage or street-food example. |
| Your own inventory and economy | Use the coordinator directly and decide which resource manages each account, item definition and capacity. |
| No inventory yet; you want to learn | Follow the repair tutorial, which creates test pockets and fuses directly. |

The RP inventory's `transactions` backend uses this coordinator underneath. Its legacy
synchronous exports can acknowledge a queued change before it is saved. New job code should
wait for asynchronous transfer results before treating an item exchange as complete.

The coordinator saves the transfers you submit. It does not also save a machine's repaired
state, deliver a notification or apply a health effect. Your resource must manage those results
and their recovery separately. Avoid treating a durable payment as proof that every step of a
job has finished.

Source: [`open77_transactions`](https://github.com/Open2077/open77-resources/tree/next/system/open77_transactions), [`open77_containers`](https://github.com/Open2077/open77-resources/tree/next/system/open77_containers).

## Reserve, commit and cancel

For timed work, reserve the planned transfer before the animation starts. Commit it after the
work succeeds, or cancel the reservation if it ends before committing. The three numbered
blocks below belong in separate action hooks; the cancel block is an alternative to committing,
not a step to run after a successful commit. Complete hook definitions are in the
[repair tutorial](build-a-job.md#step-3-the-four-hooks).

```lua
-- my_repairs/server/main.lua: each step runs inside one of your action's hooks
local function tx(name, ...)
    local promise, why = Open77.exports.call("open77_transactions", name, ...)
    if not promise then return nil, why end
    return promise:await()
end

-- 1. Before the progress bar: hold one fuse and the pay.
local pockets = exports.open77_transactions:account(ctx.playerId, "char")   -- "char:<accountId>"
local cash = exports.open77_transactions:account(ctx.playerId, "cash")      -- "cash:<accountId>"
local opId = "repairs:" .. ctx.opId
local held, why = tx("reserve", { opId = opId, kind = "repair", actor = pockets, lines = {
    { item = "fuse", count = 1, from = pockets, to = "sys:repairs" },   -- the fuse is used up
    { money = 40, from = "sys:repairs", to = cash },                    -- 40 eddies are paid
} })
if not held then return nil, why end   -- "insufficient_items": no fuse, so no bar at all

-- 2. The bar finished: make it final.
local receipt, err = tx("commit", opId)

-- 3. Or the bar was interrupted: release the hold. Nothing moved.
exports.open77_transactions:cancel(opId, "moved_away")
```

Most exports wait for the database, so call them through `tx` from a thread, an event handler, a
command or an action hook; the plain `exports.open77_transactions:transfer(...)` form answers
`export_yielded`. These never wait: `account`, `subjectOf`, `newOpId`, `define`, `info`, `health`,
`allowed`, `authorize`, `cancel`, `submit`, and `read` of an account already in memory. A call
answers its result, or `nil, reason, info`; `info.retryable` says whether trying again can help.

## Five ideas

1. **One operation is one database transaction**: all its lines commit together, or none do.
2. **Reuse the id for a retry**: committing an id again returns its stored receipt with
   `replay = true` and moves nothing. A new id is another operation, even for the same player and job.
3. **Reserve holds value before the work**, so a player with no fuse is refused before the bar.
4. **Commit makes it final, cancel releases an unused hold**: nothing moves before the commit.
   If the database stops answering during commit, resolve that result before deciding it failed.
5. **`in_doubt` means "not sure yet"**: the database stopped answering mid-commit. Retry with the
   **same** id, or ask `status(opId)`; a new id could pay twice.

## Install

Add `dependency "open77_transactions >=0.1.0"` to your manifest, only in a server-only resource. A
resource that also ships a client script must leave it out (the client refuses it with
`missing_dependency:open77_transactions`) and wait for the `open77_transactions:ready` event.

The operator turns it on once: list it ([selecting which resources load](server-resources.md)), then
start it before the resources that use it.

```text
resources.load: [ ..., "open77_transactions", "my_repairs" ]
ensure open77_transactions
ensure my_repairs
```

It needs a MariaDB or MySQL database ([SQL database setup](database.md)). At its first start it
creates its `op77_tx_*` tables (InnoDB) and logs `ready`. Just before that, its start-up self-test
logs **one expected error**: a transaction built to fail, proving the database really rolls back.

```text
[database] resource 'open77_transactions' transaction statement 2/2 failed: database_conflict (SQL 1062): …
[resource:open77_transactions] ready: store=sql schema=v1 tag=srv
```

If the database is missing, unreachable at start, not InnoDB, or newer than this build, it refuses
to start: every call answers `store_failed` or `store_unavailable`; it never falls back to another
store.

**Coming from the RP pack's 1.x [`rp_economy`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_economy)?** The newer one refuses every wallet change with
`migration_pending` (log: `… 1.x wallet row(s) are not imported yet: wallets are refused until
economy_migrate runs`) until the operator runs `economy_migrate` on the console once. Nobody gets a
fresh starting balance and then the imported one, and a second run imports nothing twice.

## Accounts

Everything that holds value is an account named `<namespace>:<key>[:<part>]`:

| Namespace | Holds | Example |
|---|---|---|
| `char` | the items a character carries (their pockets) | `char:<accountId>` |
| `cash`, `bank` | a character's money | `cash:<accountId>` |
| `soc` | a society's money | `soc:mechanics` |
| `stash` | items in a stash: a locker, a stall's pantry | `stash:sf.food_court:pantry` |
| `veh` | items in one part of a vehicle, keyed by **plate** | `veh:NC-1234:cargo` |
| `world` | a crate or pile on the ground; the coordinator picks the id | `world:srv.lq2x8k3z.1` |
| `sys` | an unlimited source or sink, recorded in the journal only | `sys:repairs` |

- Ask for a player's accounts with `account(playerId, "char" | "cash" | "bank")`, never build them. A
  session player id or runtime entity id is refused as a key (`cash:12` answers `invalid_key`).
- A container (`char`, `stash`, `veh`) must exist before items move in or out (`unknown_account`
  otherwise): `open` creates it. A wallet is created by its first payment.
- Moving value into `sys:` burns it; moving it out creates it, which needs an operator's mint rule.
  Keep `sys:` names free of a second colon (`sys:streetfood.kitchen`) so a rule can name them.

## Declare your items

Weights are in grams. Definitions live in memory, so declare them at start and again on
`open77_transactions:ready` (its argument is `{ store, schema }`), which fires whenever the
coordinator is ready. On a server running the RP pack, define items through [`rp_inventory`](https://github.com/Open2077/open77-resources/tree/main/rp/rp_inventory) instead.

```lua
local function defineItems() exports.open77_transactions:define({ fuse = { weightG = 100 } }) end
CreateThread(defineItems)
AddEventHandler("open77_transactions:ready", defineItems)
```

`define` answers `registered, rejected, collisions`; an item another resource defined first stays
theirs.

## Pay a player for a job

- **The calls**: `reserve(spec)` answers `{ opId, state = "reserved", expiresAt }`,
  `commit(opId[, { lines }])` the receipt, `cancel(opId, reason)` `true`. The spec needs `opId` and
  `lines` (1 to 48); `kind` (a short label), `actor`, `reason` (also per line) and `ttlMs` are optional.
- **The id**: derive it from the job, never from a counter of your own: `"repairs:" .. ctx.opId` is
  one id per repair, so every retry of that repair reaches the same operation.
- **The hold expires** after `ttlMs` (default 30 s, at most 10 minutes) and is cancelled when your
  resource stops. Give it the length of the bar plus a margin.
- **Commit less than you reserved** by passing final lines to `commit`: less than the reservation,
  never more (`exceeds_reservation`). Send the same lines on every retry, or the replay answers
  `op_id_conflict`.
- **The receipt** carries `opId`, `kind`, `actor`, `lines`, `reason`, `at` and `replay`. With
  `replay = true` the commit had already happened: show the result again, pay nothing more.
- **In doubt**, `cancel` is refused: the coordinator keeps the hold and settles the operation once
  the database answers. Ask `tx("status", opId)` until its `state` leaves `in_doubt`.

When the yield is unknown before the bar, reserve **room** out of a `sys:` source, then commit the
real items; a reservation made only of capacity lines needs final lines at commit. The scrapyard job
[rp_salvage](https://github.com/Open2077/open77-resources/tree/main/rp/rp_salvage) works this way, and
its `server/ledger.lua` (the only file that calls the coordinator) is a good shape to copy.

```lua
tx("reserve", { opId = opId, ttlMs = 15000, lines = { { capacityG = 2000, from = "sys:salvage", to = pockets } } })
tx("commit", opId, { lines = { { item = "scrap", count = 3, from = "sys:salvage", to = pockets } } })
```

## Give an item

```lua
local pockets = exports.open77_transactions:account(playerId, "char")
tx("open", pockets, { capacityG = 30000 })            -- creates the pockets, or sets their capacity again
local opId = exports.open77_transactions:newOpId()    -- make the id once, reuse it if you retry
local receipt, why = tx("transfer", { opId = opId, kind = "grant", lines = {
    { item = "fuse", count = 3, from = "sys:repairs", to = pockets },
} })
```

`transfer` is a reserve and a commit in one call, for anything without a bar. Creating fuses out of
`sys:repairs` needs a mint rule (`mint_denied` otherwise). With `rp_inventory` the pockets already
exist: do not `open` them, since `open` sets the capacity again.

## Sell to another player

Collect the buyer's consent your way, then move goods and money in one operation. Make the id when
the offer is made, keep it with the offer, and reuse it on every retry. No value is created, so no
mint rule is needed: the resource only needs to write `char`, `cash` and `soc`.

```lua
local T = exports.open77_transactions
offer.opId = "sale:" .. T:newOpId()   -- once, when the seller makes the offer
local sellerCash, buyerCash = T:account(offer.seller, "cash"), T:account(offer.buyer, "cash")
local receipt, why, info = tx("transfer", { opId = offer.opId, kind = "sale", reason = "two fuses", lines = {
    { item = "fuse", count = 2, from = T:account(offer.seller, "char"), to = T:account(offer.buyer, "char") },
    { money = 90, from = buyerCash, to = sellerCash },
    { money = 10, from = buyerCash, to = "soc:mechanics", reason = "guild share" },
} })
if receipt then        -- done; receipt.replay == true means it had already gone through
elseif info and info.retryable then   -- conflict, busy, in_doubt, store_unavailable: retry, SAME id
else                   -- insufficient_funds, insufficient_items...: tell both players, nothing moved
end
```

## Stock a stall: stashes

A stash has a fixed name, so a restart finds the same goods with no lookup. The street-food stall
keeps ingredients in a pantry and cooked dishes on a pass:

```lua
local PANTRY, PASS = "stash:sf.food_court:pantry", "stash:sf.food_court:pass"
tx("open", PANTRY, { capacityG = 40000 })   -- at start: creates it, or finds it again
tx("open", PASS, { capacityG = 2000 })

-- grilling a skewer, reserved before the bar: an empty pantry or a full pass is refused right here
local held, why = tx("reserve", { opId = cookOpId, kind = "streetfood.cook", ttlMs = 40000, lines = {
    { item = "sf_synth_meat", count = 2, from = PANTRY, to = "sys:streetfood.kitchen" },
    { item = "sf_sauce", count = 1, from = PANTRY, to = "sys:streetfood.kitchen" },
    { item = "sf_skewer", count = 1, from = "sys:streetfood.kitchen", to = PASS },
} })
```

The ingredients burn into the kitchen; the skewer is created out of it, which needs a mint rule. The
complete stall, with a consented sale paid to a society plus a tip, is
[rp_streetfood](https://github.com/Open2077/open77-resources/tree/main/rp/rp_streetfood).

## Read balances and history

```lua
local acct, why = tx("read", cash)                 -- loads on demand, never creates: "unknown_account" if never paid
local rows = tx("history", cash, { limit = 20 })   -- newest first; page back with { before = <ms> }
```

A snapshot carries `balance` (wallets) or `items`, `instances`, `weightG`, `capacityG` (containers),
plus `held` (reserved) and `pending` (committing, not confirmed yet). History rows carry `opId`,
`asset`, `delta`, `reason`, `at`, `kind`, `actor` and `resource`. `list(namespace, after, limit)`
pages through the containers of `char`, `stash`, `veh` or `world`. The event
`open77_transactions:committed(opId, kind, accounts)` fires after every commit.

## Unique items and metadata

A tool with its own wear is an **instance**: one object with an id you pick.

```lua
exports.open77_transactions:define({ crowbar = { weightG = 1500, unique = true } })
-- three lines, each usable in an operation:
{ instance = "cb-7f3a", item = "crowbar", from = "sys:dealer", to = pockets, meta = { durability = 20 } }   -- create
{ instance = "cb-7f3a", at = pockets, metaPatch = { durability = 19 } }                                    -- wear
{ instance = "cb-7f3a", from = pockets, to = "stash:locker_12" }                                          -- move
```

`meta` replaces, `metaPatch` merges one level deep. One operation at a time can hold an instance; a
second answers `instance_unavailable`.

## Durable world containers

A [world prop](props.md) disappears with its resource and the server process. A crate whose
**contents** must survive a restart (spare fuses in a workshop, a dropped pile, a wreck searched
three times) is an `open77_containers` container: the coordinator holds the contents and placement,
and `open77_containers` rebuilds the prop, prompt and summary at every start under the same id. List
it next to `open77_transactions` (with [`open77_interactions`](https://github.com/Open2077/open77-resources/tree/main/system/open77_interactions) and [`open77_props`](https://github.com/Open2077/open77-resources/tree/main/system/open77_props)) and `ensure` it.

```lua
-- boxes(name, ...) is the tx helper above, calling "open77_containers"
local crate
local function placeCrate()
    crate = exports.open77_containers:find("workshop-fuses") or boxes("create", {
        key = "workshop-fuses",   -- your own name for it: after a restart, the same crate
        kind = "crate", model = "crate.small", position = { x = -1411.0, y = 957.6, z = 23.4 }, bucket = 0,
        capacityG = 20000, label = "Spare fuses", prompt = { label = "Take a fuse", key = "E" },
    })
end
CreateThread(placeCrate)
AddEventHandler("open77_containers:ready", function() CreateThread(placeCrate) end)

AddEventHandler("open77_containers:used", function(id, playerId)   -- a player pressed the prompt
    if not crate or id ~= crate.id then return end
    CreateThread(function()
        local pockets = exports.open77_transactions:account(playerId, "char")
        boxes("transfer", { opId = "take:" .. exports.open77_transactions:newOpId(), player = playerId,
            lines = { { item = "fuse", count = 1, from = crate.id, to = pockets } } })
    end)
end)
```

- `crate.id` (`world:srv.…`) is the durable identity, `crate.propId` only today's prop. A keyed
  `create` finds the same container again; a different spec under that key answers `already_exists`.
- A `crate` stays when empty; a `pile` disappears when empty.
- Moves go through `open77_containers` (`reserve`, `commit`, `cancel`, `transfer`, `status`: the
  coordinator's shapes plus `player`), which checks rights, reach (`reachM`, 4 m) and bucket first.
- The owner grants `take`, `put`, `target`, `consume`, `move`, `meta`, `read` or `close` to another
  resource with `grant(id, grantee, rights, { ttlMs })`, and takes them back with `revoke`.
- `find`, `summary`, `list` and `access` answer at once; the rest wait. Before its start-up rebuild,
  `create` answers `not_ready`; with the coordinator down, value calls answer `coordinator_unavailable`.

A **node** carries charges and, by default, holds nothing: a wreck searched three times, then once
more every five minutes. `model = false` puts its prompt on a point instead of a prop:

```lua
local node = exports.open77_containers:find("node.wreck_1") or boxes("create", { key = "node.wreck_1",
    kind = "node", model = false, position = wreckPos, node = { charges = 3, regrowMs = 300000 } })
local state, why = boxes("consume", node.id, { ref = opId, player = playerId })   -- "depleted" when empty
```

The same `ref` never spends twice (`state.replay`). `refill(id, { charges })` resets a node in place
(full by default) and keeps its id, grants and refs; `open77_containers:depleted(id)` and
`open77_containers:regrown(id, charges)` report the changes. Never `close` a node you want back: a
closed key is never reused.

Without `open77_containers`, a `world:` account is yours to draw. `openWorld` mints it, `close`
deletes it once empty (`container_not_empty` otherwise), `setMeta(id, meta)` changes its metadata,
and `open77_transactions:world(id, change, meta)` reports `opened`, `meta` and `closed`. At start,
page through `listWorld(after, 100)` and re-create each prop from its `meta`:

```lua
local pile = tx("openWorld", { capacityG = 50000, meta = { x = x, y = y, z = z, bucket = 0, model = "crate.small" } })
tx("transfer", { opId = dropId, lines = { { item = "fuse", count = 4, from = pockets, to = pile.id } } })
```

## Who may write, and who may create value

Operators set both in the coordinator's tunables, from the Warden panel or the console
`tunable.set open77_transactions <key> <value>` ([Operator tunables](tunables.md)):

| Tunable | Default | Meaning |
|---|---|---|
| `writers` | `*` | which resources may change which accounts; `*` lets every resource write (live) |
| `writers2` … `writers4` | empty | more entries for the `writers` list, when it does not fit in one value; ignored while `writers` is `*` (live) |
| `mint1` … `mint6` | empty | who may create what out of `sys:` accounts, and how much an hour (live) |
| `store` | `sql` | the production store; a disposable store exists for unlisted development servers (restart) |
| `serverTag` | `srv` | 1 to 11 of `a-z 0-9 _ -`, a letter first; unique per server sharing a database (restart) |
| `preloadWorld` | 2000 | `world:` containers loaded into memory at start (restart) |
| `retentionDays` | 90 | journal and operation rows older than this are deleted; a replay needs its row |
| `workPerTick` | 12 | coordinator steps per server tick |

- **Writers**: `*`, or a comma-separated list. `name` may write every namespace, `name:ns+ns` only
  those, `name:ns/part` one part (`rp_cargo:veh/cargo` writes `veh:<plate>:cargo`, not the trunk).
  A resource left out answers `namespace_denied`. `writers2`, `writers3` and `writers4` continue
  the list with the same syntax: the coordinator joins the four values into one list.
- **Mint rules**: `<resource> <sys:account or sys:*> <item, * or money> <capPerHour>`, several
  separated by `;`; `*` is any item, never money. **Nothing mints by default**: `mint_denied` until a
  rule allows it, then `mint_cap_exceeded` once the hour's cap is used. Burning into `sys:` needs no
  rule. Caps count over a sliding hour and survive a restart. A malformed entry is ignored and
  logged (`writers: ignored entry '…'`, `mint rules: ignored entry '…'`).
- **256 characters per value.** A text tunable holds at most 256 characters. A longer value is
  refused as a whole (`error: mint4: exceeds 256 characters` on the console) and the previous value
  stays. A server running several jobs outgrows one value: continue the writers in `writers2` to
  `writers4`, and spread the mint rules over `mint1` to `mint6`, each under 256 characters. A rule
  on `*` (any item) with one cap for the whole account is shorter than one rule per item.

The repair job, then a server running the RP pack's scrapyard (size the caps to your population):

```text
tunable.set open77_transactions writers my_repairs:char+cash
tunable.set open77_transactions mint1 my_repairs sys:repairs money 20000
tunable.set open77_transactions mint2 my_repairs sys:repairs fuse 200

tunable.set open77_transactions writers rp_salvage:world+char, rp_cargo:veh/cargo, rp_economy:cash+bank+soc, rp_inventory, open77_containers:world
tunable.set open77_transactions mint1 rp_salvage sys:salvage * 2000; rp_inventory sys:* * 2000; rp_economy sys:* money 2000000
```

Adding the CHOOH2 chain and the techie to that server: the writers continue in `writers2`, and each
job's mint rules get a slot of their own next to the shared `mint1`:

```text
tunable.set open77_transactions writers2 rp_chooh2:world+stash+char, rp_techie:stash/tray+char+cash
tunable.set open77_transactions mint2 rp_chooh2 sys:chooh2.fields * 2000; rp_chooh2 sys:chooh2.refinery chooh2_canister 400
tunable.set open77_transactions mint3 rp_techie sys:techie.workshop * 960; rp_techie sys:techie.dealer * 540
```

The [roleplay jobs](rp-jobs.md#run-every-job-on-one-server) page lists the values for a server
running all of them.

`open77_containers` creates the `world:` account of every container itself, and the coordinator sees
it as the writer of every move it forwards. With a `writers` list, give it `world` plus each
namespace your containers trade with (`open77_containers:world+char` for a crate players take from);
without `world`, every `create` answers `namespace_denied`. A container move that creates value
needs a mint rule for `open77_containers` and one for your resource.

To let another resource touch your accounts for one operation (the stall letting `rp_economy` sell
from its pass), authorize it first, for up to 16 accounts you may write yourself:
`exports.open77_transactions:authorize(opId, "rp_economy", { PASS, buyerPockets }, 30000)`.
`allowed(resourceName, "veh:NC-1:cargo")` answers whether a resource may write an account; for a
`sys:` account (with an optional item or `"money"`), whether it may create value from it.

## Refusals

| Reason | Retry? | Meaning |
|---|---|---|
| `invalid_spec`, `invalid_op_id`, `invalid_account`, `invalid_key`, `unknown_item`, `invalid_count`, `invalid_amount` | no | a bug or a forged input |
| `namespace_denied`, `mint_denied` | no | the operator's policy says no |
| `insufficient_items`, `insufficient_funds`, `capacity_exceeded`, `instance_unavailable`, `balance_limit` | no | the business answer; nothing is held |
| `unknown_account`, `container_not_empty`, `not_loaded` | no | the account does not exist, is not empty, or is not in memory |
| `already_committed` | no | `reserve` of an id that already committed; `info.receipt` is its receipt |
| `exceeds_reservation`, `operation_too_large` | no | the commit left its reservation, or needs more than 64 SQL statements |
| `expired`, `cancelled`, `unknown_operation`, `op_id_conflict`, `aborted`, `not_owner`, `stale_version` | no | lifecycle; after `aborted`, use a new id |
| `mint_cap_exceeded` | later | the hourly cap is used |
| `conflict` | yes | the database refused a stale view; plan again |
| `busy`, `in_doubt` | yes, same opId | still committing, or outcome unknown: ask `status` |
| `store_unavailable` | yes | starting, database down, or certainly not committed |
| `store_failed` | no | refused at start; an operator must act |

A refused, expired or cancelled id left no trace: the same id is a fresh attempt. `status(opId)`
answers `{ state, reason, receipt }`; `state` is `reserved`, `committing`, `committed`, `in_doubt`,
`failed`, `cancelled`, `expired`, `aborted` or `unknown`.

**When the database goes away**, the coordinator logs `store unreachable; mutating calls answer
store_unavailable until a probe succeeds`. Calls that had not started committing answer
`store_unavailable`: nothing was applied, so retrying is safe, and a reservation can still be
committed later. It probes every 2 s and logs `store reachable again`. An operation that was already
committing stays `in_doubt` with its holds until the coordinator settles it: poll `status(opId)`
with that same id, never a new one.

## Console

```text
transactions health              # phase, store, counters
transactions mints               # every mint rule with this hour's use
transactions read <account>      # an account already in memory
transactions status <opId>
transactions resolve <opId>      # settles an unknown opId for good: committed or aborted, never both
```

Use `resolve` only on an operation that may still be in flight from before a restart: an id it
marks `aborted` can never commit.

## Limits

48 lines per operation and at most 64 SQL statements per commit; operation ids of 8 to 96 characters
(letters, digits, `_ . : @ -`); account ids up to 96 bytes; metadata up to 2 KiB; reasons up to 64
bytes; `history` up to 200 rows a page, `list` up to 500. A container is read with at most 512
stacks and 512 instances.
