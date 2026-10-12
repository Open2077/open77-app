# Durable transactions

> **Experimental.** The API below can still change. `open77_transactions` was integration-tested
> against MariaDB, then proven live under two complete jobs, a scrapyard and a street-food stall,
> with two clients: strict writers and mint caps, receipts, a double press paid once, a database
> outage and its recovery, and crates and containers rebuilt after a full server restart
> ([status](#status)). Not yet exercised on old data: the retention sweep and `world:` expiry. MySQL 8
> has not been tested; only MariaDB has. How it fits with actions and jobs:
> [World interaction](world-interaction.md).

A role-play job that sells scrap must take the goods **and** pay the seller **and** pay the society,
exactly once, even when the player double-presses, the resource restarts, or the database drops
mid-sale. Writing three rows from three exports cannot promise that. `open77_transactions` can:
every business operation is **one** SQL transaction, keyed by an operation id you choose, with a
stored receipt you get back on every retry.

It is a library resource, off by default. Your job resource keeps its own rules (who may search a
wreck, what a crowbar costs); the coordinator only moves value.

## Install

```text
resources.load: [ ..., "open77_transactions", "my_job" ]
```

The coordinator is opt-in (`auto_start false`): after listing it, start it with
`ensure open77_transactions`, before the resources that use it.

```lua
-- my_job/open77.lua
dependency "open77_transactions >=0.1.0"
```

`open77_transactions` is server-only. A resource that also ships a client script must not name it as
a `dependency` (the client refuses the activation with `missing_dependency:open77_transactions`);
wait for its `open77_transactions:ready` event instead.

The coordinator needs a MariaDB/MySQL database configured on the server (InnoDB, see
[SQL database setup](database.md)). At its first start it creates its `op77_tx_*` tables, checks them,
and logs:

```text
[resource:open77_transactions] ready: store=sql schema=v1 tag=srv
```

Just before that line, the boot self-test logs one **expected** error. To prove the database really
rolls back, it runs a transaction built to fail on a duplicate key, and the database bridge reports
that failure like any other:

```text
[database] resource 'open77_transactions' transaction statement 2/2 failed: database_conflict (SQL 1062): …
```

It is not a fault: the coordinator refuses to start when that transaction does **not** fail, or when
its first statement survives the rollback (`store_refused: … rollback_not_honoured`).

If the database is missing, unreachable at boot, not InnoDB, or newer than this build, the
coordinator **refuses** and every call answers `store_failed` or `store_unavailable`. It never falls
back to another store.

## Call it

Every export that may wait for the database yields, so call through the promise form from a thread,
an event handler or a command:

```lua
local function tx(name, ...)
    local p, why = Open77.exports.call("open77_transactions", name, ...)
    if not p then return nil, why end
    return p:await()
end
```

`exports.open77_transactions:transfer(...)` (the synchronous form) answers `export_yielded`. `read`
(of an account already loaded), `submit`, `cancel`, `define`, `info`, `health`, `allowed`, `newOpId`,
`subjectOf` and `account` never yield.

## Accounts

Everything that holds value is an account `<namespace>:<key>[:<part>]`:

| Namespace | Holds | Example |
|---|---|---|
| `char` | items carried by a character | `char:<accountId>` |
| `cash`, `bank` | money | `cash:<accountId>` |
| `soc` | a society's money | `soc:ferrailleur` |
| `veh` | items in a vehicle part, keyed by **plate** | `veh:NC-1234:cargo` |
| `stash` | items in a stash | `stash:house_12` |
| `world` | a crate or pile on the ground (minted by `openWorld`) | `world:srv.lq2x8k3z.1` |
| `sys` | an unlimited source or sink, journaled only | `sys:dealer`, `sys:salvage` |

Never use a session player id or a runtime entity id as a key: `cash:12` or `veh:4711:cargo` is
refused with `invalid_key`. Ask the coordinator for the durable key:

```lua
local cash = exports.open77_transactions:account(playerId, "cash")   -- "cash:<accountId>"
```

## Items

Declare what your resource carries, once at start (weights in grams):

```lua
exports.open77_transactions:define({
    scrap   = { weightG = 500 },
    crowbar = { weightG = 1500, unique = true },
})
```

Another resource that already defined `scrap` keeps it: your call reports a collision.

## A sale, exactly once

```lua
local opId = ("scrapsale:%s:%s"):format(subject, intentNonce)   -- the SAME id on every retry
local receipt, reason, info = tx("transfer", {
    opId = opId, kind = "sale", actor = "char:" .. subject, reason = "scrap at Kabuki",
    lines = {
        { item = "scrap", count = 4, from = "char:" .. subject, to = "sys:dealer" },
        { money = 270, from = "sys:dealer", to = "cash:" .. subject, reason = "driver share" },
        { money = 30,  from = "sys:dealer", to = "soc:ferrailleur" },
    },
})
if receipt then
    -- receipt.replay is true when this opId had already committed: do not pay again,
    -- just show the same result.
elseif info and info.retryable then
    -- conflict / busy / in_doubt / store_unavailable / mint_cap_exceeded: try later
else
    -- insufficient_items, capacity_exceeded, namespace_denied, ...: tell the player
end
```

Derive the `opId` from a server-side business identity (the sale intent, the salvage claim), not from
a counter, so a double press maps to the same operation.

- A committed `opId` **replays** its receipt, also after a restart and even when the goods are long
  gone.
- A **failed** `opId` (refused, conflict, expired, cancelled) left no trace: the same `opId` is a
  fresh attempt.
- An `opId` answered `in_doubt` must be retried **with the same id**, or polled with `status(opId)`.
  One answered `aborted` can never commit: use a new id.

## Reserve now, commit later

For an action with a progress bar, reserve before the bar and commit after it. Nothing moves until
the commit; a cancelled bar leaves nothing to undo.

```lua
local held, why = tx("reserve", { opId = opId, ttlMs = 15000, lines = {
    { capacityG = 2000, from = "sys:salvage", to = "char:" .. subject },  -- room for the roll
} })
if not held then return notify(playerId, why) end                    -- "capacity_exceeded" before the bar
-- ... bar runs; on interruption: exports.open77_transactions:cancel(opId, "moved_away")
local receipt = tx("commit", opId, { lines = {
    { item = "scrap", count = 3, from = "sys:salvage", to = "char:" .. subject },
} })
```

A reservation expires after `ttlMs` (default 30 s) and is cancelled when your resource stops. A
commit may move less than its reservation, never more (`exceeds_reservation`). With
[`open77_actions`](actions.md#durable-rewards), the reserve and the commit go in the action's hooks.

## Ground drops and crates

A `world:` account is a crate or a pile on the ground:

```lua
local crate = tx("openWorld", { capacityG = 50000, meta = { x = x, y = y, z = z, bucket = 0, model = "crate" } })
tx("transfer", { opId = dropId, lines = { { item = "scrap", count = 4, from = "char:" .. subject, to = crate.id } } })
-- later, another player picks it up: one winner, capacity checked
tx("transfer", { opId = pickId, lines = { { item = "scrap", count = 4, from = crate.id, to = "char:" .. other } } })
tx("close", crate.id)                      -- only when empty
```

The prop is a projection: at start, page through `listWorld(after, 100)` and re-create each one from
its `meta`. Listen to `open77_transactions:world(id, change, meta)` for `opened | meta | closed`.
`open77_containers`, below, does all of this for you.

## Durable world containers

A [world prop](props.md) dies with its resource and the server process. A crate whose *contents* must
survive a restart (a salvage crate, a dropped pile, a depletable salvage node) is an
`open77_containers` container instead: an opt-in resource (`auto_start false`, loaded with
`open77_transactions`) whose containers are durable `world:` accounts minted by the coordinator. The
coordinator holds the contents and, in the world row's metadata, the placement; the prop, its
state-bag summary and its prompt are projections rebuilt at every boot under the same container id
and a new prop id.

```lua
-- server, inside a thread (the call waits for both stores)
local crate, reason = Open77.exports.call("open77_containers", "create", {
    key = "yard-crate-1",            -- optional: your own name for it, unique per resource
    kind = "crate", model = "crate.cargo", position = here, bucket = 0, capacityG = 20000,
    label = "Salvage crate", prompt = { label = "Open", key = "E" },
}):await()
-- crate.id is the durable identity ("world:srv.…", minted by the coordinator);
-- crate.propId only today's projection. After a restart:
local again = exports.open77_containers:find("yard-crate-1")
```

A keyed `create` is idempotent: on a later boot the same key finds the same container. A **node** is
a container that holds nothing and carries charges that regrow, such as a wreck that gives three works
and then one more every five minutes:

```lua
local node = exports.open77_containers:find("node.wreck_1")
    or Open77.exports.call("open77_containers", "create", { key = "node.wreck_1", kind = "node",
        model = false, position = here, node = { charges = 3, regrowMs = 300000 } }):await()

-- spend one charge; the same ref never spends twice
Open77.exports.call("open77_containers", "consume", node.id, { ref = opId }):await()
```

`find`, `summary`, `list` and `access` answer at once; the other exports (`create`, `get`, `grant`,
`revoke`, `consume`, `refill`, `place`, `close`, ...) wait for the stores, so call them through the
promise form. `open77_containers` answers `not_ready` until it has rebuilt its registry at boot. It
mints the `world:` rows of nodes itself, so when the coordinator's `writers` is a list rather than
`*`, include `open77_containers:world`: without that entry every node is refused `namespace_denied`.

The owner grants other resources `take`, `put`, `target`, `consume`, `move`, `meta`, `read` or `close`
(`grant(id, grantee, rights, { ttlMs })`). Value moves on `world:` accounts go through the container
service, which checks those rights, the acting player's reach and bucket, and, through the
coordinator's `allowed`, the caller's own right to every other account and mint, before the
coordinator commits.

Keyed nodes with charges, the registry rebuilt from SQL across a full server restart, and the crate
prompts were proven live. `refill`, which resets a node's charges in place without closing it, was
tested offline only. Never `close` a node you want back: a closed key is never reused.

## Unique items and metadata

```lua
{ instance = "cb-7f3a", item = "crowbar", from = "sys:dealer", to = "char:" .. subject, meta = { durability = 20 } }
{ instance = "cb-7f3a", at = "char:" .. subject, metaPatch = { durability = 19 } }       -- wear, compare-and-set
{ instance = "crate-0001", from = "veh:NC-1:cargo", to = "char:" .. subject, metaPatch = { slot = 4 } }
```

`meta` replaces, `metaPatch` merges (one level). Two operations on the same instance cannot both hold
it.

## Reading

```lua
local acct, why = tx("read", "cash:" .. subject)   -- loads on demand; never creates
-- why == "unknown_account" when the wallet was never credited
local rows = tx("history", "cash:" .. subject, { limit = 20 })   -- newest first, with reasons
```

A snapshot carries `balance` or `items`/`instances`/`weightG`/`capacityG`, plus `held` (reserved) and
`pending` (submitted, not yet acknowledged).

## Who may write, and who may create value

Operators set both in the coordinator's tunables (the Warden panel, or the console
`tunable.set open77_transactions <key> <value>`; see [Operator tunables](tunables.md)):

| Tunable | Default | Meaning |
|---|---|---|
| `writers` | `*` | `*`, or a list: `rp_inventory, rp_economy:cash+bank+soc, rp_cargo:veh/cargo` |
| `mint1` … `mint6` | empty | `<resource> <sys:account or sys:*> <item, * or money> <capPerHour>`, `;`-separated |
| `store` | `sql` | the only production store; a key-value store exists for unlisted development hosts only (restart to apply) |
| `serverTag` | `srv` | unique per server sharing one database (restart to apply) |
| `retentionDays` | 90 | journal and operation rows older than this are deleted |
| `workPerTick` | 12 | coordinator steps per server tick |

**Nothing mints by default.** A line out of a `sys:` account into a real account answers
`mint_denied` until a rule allows it, and `mint_cap_exceeded` once the hour's cap is used. Burning (a
line into `sys:`) needs no rule. A list entry `name` without `:` may write every namespace;
`name:ns+ns` only those; `name:ns/part` one part (`veh:<plate>:cargo`, not the trunk).

A strict policy for the scrapyard job and its RP pack adapters, as an example (size the caps to your
population):

```text
tunable.set open77_transactions writers rp_salvage:world+char, rp_cargo:veh/cargo, rp_economy:cash+bank+soc, rp_inventory, open77_containers:world
tunable.set open77_transactions mint1 rp_salvage sys:salvage * 2000; rp_inventory sys:* * 2000; rp_economy sys:* money 2000000
```

`rp_salvage` writes crates (`world:`) and pockets, `rp_cargo` only truck cargo parts, `rp_economy`
only wallets; `rp_salvage` may create any item out of `sys:salvage`, up to 2,000 an hour. `writers`
and the mint rules apply live; the hourly caps survive a restart (they are rebuilt from the journal at
boot).

To let another resource touch your accounts for one operation (the inventory owner letting the
wallet sell its goods), grant it:

```lua
exports.open77_transactions:authorize(opId, "rp_economy", { "char:" .. subject }, 30000)
```

`exports.open77_transactions:allowed(resourceName, "veh:NC-1:cargo")` answers whether a resource may
write an account; for a `sys:` account, whether it may mint from it.

## Refusals

| Reason | Retry? | Meaning |
|---|---|---|
| `invalid_spec`, `invalid_op_id`, `invalid_account`, `invalid_key`, `unknown_item`, `invalid_count`, `invalid_amount` | no | a bug or a forged input |
| `namespace_denied`, `mint_denied` | no | the operator's policy says no |
| `insufficient_items`, `insufficient_funds`, `capacity_exceeded`, `instance_unavailable`, `balance_limit` | no | the business answer; nothing is held |
| `unknown_account`, `container_not_empty`, `not_loaded` | no | see the call |
| `exceeds_reservation`, `operation_too_large` | no | the commit left its envelope, or more than 64 SQL statements |
| `expired`, `cancelled`, `unknown_operation`, `op_id_conflict`, `aborted`, `not_owner`, `stale_version` | no | lifecycle |
| `mint_cap_exceeded` | later | the hourly cap is used |
| `conflict` | yes | the database refused a stale view; re-plan |
| `busy`, `in_doubt` | yes, same opId | still committing, or outcome unknown: poll `status` |
| `store_unavailable` | yes | starting, database down, or proven not committed |
| `store_failed` | no | refused at boot; an operator must act |

## When the database goes away

When the database stops answering in the middle of a job:

1. The coordinator logs `store unreachable; mutating calls answer store_unavailable until a probe succeeds`.
2. A running action ends `failed` with `store_unavailable`, not `in_doubt`: the coordinator answers
   `store_unavailable` only when nothing was applied. Crates and tools are unchanged.
3. Every 2 s the coordinator probes the database; once it answers, it logs `store reachable again`,
   and the next action commits normally.

An operation already committing when the database disappears is different: its outcome is unknown,
so it stays `in_doubt` with its holds, and the coordinator settles it itself once the database is
back. Poll `status(opId)` with the same id, never a new one.

## Importing an older economy

A server that already ran the RP pack's 1.x `rp_economy` has wallet tables the coordinator does not
know. The coordinator-backed `rp_economy` refuses every wallet change with `migration_pending`, and
logs `… 1.x wallet row(s) are not imported yet: wallets are refused until economy_migrate runs`,
until the operator runs `economy_migrate` on the console once. This is deliberate: nobody receives a
fresh starting balance and then the imported one. The import is idempotent (one coordinator operation
per player and per society).

## Console

```text
transactions health
transactions mints
transactions read <account>
transactions status <opId>
transactions resolve <opId>     # fences an unknown opId: committed or aborted, never both
```

## Status

Proven live on two clients, on a MariaDB database, under the scrapyard and street-food jobs of the RP
pack:

- strict `writers` and mint rules ([the example above](#who-may-write-and-who-may-create-value));
- receipts for salvage work, cooking, purchases, sales and meals; a sale shared between the seller
  and a society, and a customer's purchase paid to a society with a tip;
- a double press paid once; a replayed sale answered from its receipt;
- the database outage above, and its recovery;
- a full server restart: crates on the ground and in a truck bed rebuilt from the coordinator,
  `open77_containers`' registry rebuilt from SQL, tunables and mint caps kept;
- a consented sale declined: nothing paid, the goods stayed where they were;
- the `economy_migrate` import of an older economy (players and societies), with sales going through
  afterwards.

Not yet exercised: the retention sweep and `world:` expiry on old data, containers' `refill`, and
MySQL 8.

## Limits

48 lines per operation and at most 64 SQL statements per commit; metadata ≤ 2 KiB; reasons ≤ 64
bytes; `history` ≤ 200 rows a page; `list` ≤ 500. A container is read with at most 512 stacks and 512
instances.
