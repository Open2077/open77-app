# Redis from Lua

Talk to a Redis server from server Lua through connections the resource opens, configures and
closes itself. Nothing goes in `server.jsonc`: the server address, the credentials and the
database are arguments of `Redis.connect`, and the handle it returns *is* the connection. Every
Redis command is available, plus pipelines, transactions, cached Lua scripts, cursor walks and
publish/subscribe.

Commands run off the server tick and their results come back on the resource's own scheduler,
with the same two calling forms as the [MySQL bridge](/docs/database) and
[SQLite](/docs/sqlite): a callback, or `.await` from a thread. `Redis` and `Open77.redis` are the
same table.

The client speaks the Redis protocol (RESP2 and RESP3) itself, so it also works with servers that
implement it: Valkey, KeyDB, Dragonfly, managed Redis services. Redis is server-only: clients
never connect to it.

## Choose a store

| Need | Use |
| --- | --- |
| A few values per resource (settings, counters, a last position) | [Server KVP](/docs/server-api#resource-keyvalue-store) |
| Tables, queries and transactions owned by one resource, with no service to run | [SQLite](/docs/sqlite) |
| Relational data shared by several servers or by external tools | [MySQL/MariaDB](/docs/database) |
| Fast shared state with expiry: caches, sessions, cooldowns, leaderboards, rate limits, locks, queues, and messages between servers | **Redis** |

Redis keeps its data in memory. Treat it as the shared, fast layer next to a database, and keep
records you cannot lose in SQLite or MySQL unless your Redis server is configured for persistence.

## Prerequisites

1. **A Redis server the game server can reach.** Open77 does not install or run one. On Linux,
   install the distribution's `redis-server` (or Valkey); on Windows, run it in WSL or use a
   managed service. Protect it with a password (`requirepass`, or an ACL user) and do not expose
   its port to the internet.
2. **The `redis.access` permission** in the resource manifest:

```lua
resource "leaderboard"
version "1.0.0"
server_script "server/main.lua"

permissions { "redis.access" }
```

Without it every call fails with `permission_denied:redis.access`. A resource holding
`redis.access` can reach any Redis server the machine can reach, so grant it the way you grant
`database.access`.

## Quick start

```lua
local REDIS_URL = "redis://:change-me@127.0.0.1:6379/0"

CreateThread(function()
    local r = Redis.connect.await(REDIS_URL)

    r.set.await("motd", "Welcome to Night City", { ex = 3600 })   -- expires in an hour
    print(r.get.await("motd"))

    r.hset.await("player:42", { name = "V", cash = 500 })
    local player = r.hgetall.await("player:42")                    -- { name = "V", cash = "500" }

    print(r.incrby.await("stats:kills", 1))                        -- an integer

    r.close.await()
end)
```

A connection is meant to live as long as the resource: open it once at start and reuse it for
every command. Opening one per command works, but costs a TCP handshake and authentication each
time.

## Connect

```lua
Redis.connect(options, function(r, err) end)   -- callback form
local r = Redis.connect.await(options)         -- from a thread; raises on failure
```

`options` is a URL, a table, or a table with a `url` and overrides:

```lua
Redis.connect.await("redis://127.0.0.1:6379")                     -- no password, database 0
Redis.connect.await("redis://:password@127.0.0.1:6379/2")          -- password only, database 2
Redis.connect.await("redis://game:password@127.0.0.1:6379")        -- ACL user "game"
Redis.connect.await("rediss://game:password@cache.example.net:6380") -- TLS
Redis.connect.await({ url = REDIS_URL, commandTimeout = 2000 })
Redis.connect.await({ host = "10.0.0.5", port = 6379, password = "secret", database = 1, protocol = 3 })
```

User names and passwords in a URL are percent-decoded: write `@` as `%40`, `:` as `%3A` and `/`
as `%2F`.

| Option | Default | Meaning |
| --- | --- | --- |
| `url` | none | `redis://[user[:password]@]host[:port][/database]`; `rediss://` turns TLS on. Other keys override it. |
| `host` | `"127.0.0.1"` | Host name or IP address. |
| `port` | `6379` | 1–65535. |
| `username` (`user`) | none | ACL user. Without it, the password authenticates the default user. |
| `password` | none | Sent with `AUTH` (or with `HELLO` in RESP3). |
| `database` (`db`) | `0` | Selected on connect and again after every reconnect. |
| `tls` | `false` | Encrypt the connection. |
| `tlsServerName` | `host` | Name checked against the server certificate. |
| `tlsVerify` | `true` | `false` accepts any certificate. Use it only against a test server. |
| `protocol` | `2` | `3` negotiates RESP3 (Redis 6+): hashes come back as tables, scores as numbers, booleans as booleans. |
| `name` | `"open77:<resource>"` | Connection name shown by `CLIENT LIST`. No spaces; `""` sets none. |
| `connectTimeout` | `5000` | Milliseconds for TCP, TLS and authentication (100–120 000). |
| `commandTimeout` | `10000` | Milliseconds a command may wait for its reply (0 = no limit, at most 3 600 000). |
| `maxReplyBytes` | 32 MiB | Largest reply accepted (1 KiB–512 MiB). |
| `reconnect` | `true` | Reconnect after the connection drops. |

The connect fails with `connect_failed: <reason>` (refused, timed out, unknown host, TLS),
`auth_failed: <server reply>` (for example `auth_failed: WRONGPASS invalid username-password
pair`), `select_failed: <server reply>` for a database the server does not have, or
`protocol_unsupported` when `protocol = 3` meets a server older than Redis 6. Bad options fail
with `invalid_options:<name>` or `invalid_url`.

`tostring(r)` gives `Redis.Client(<address>)` with the credentials removed, so a handle can be
printed safely.

## Calling forms

Every command accepts both forms. `r.get(...)` and `r:get(...)` are the same call.

```lua
-- Callback: returns ok, reason at once; the callback receives (result, err) later.
r.get("motd", function(value, err)
    if err then return print("redis failed: " .. err) end
    print(value)
end)

-- Await: from a thread started with CreateThread; returns the result.
local value = r.get.await("motd")

-- No callback: fire and forget. A failure is lost, so keep this for writes you can afford to lose.
r.incr("stats:visits")
```

| Form | On success | On failure |
| --- | --- | --- |
| Callback | `callback(result, nil)` | `callback(nil, reason)` |
| `.await` | returns `result` | raises `reason` (use `pcall` to continue) |
| `r.multi.await` | returns the replies | returns `nil, reason` |

A command refused before it is sent (a bad argument, a closed handle, a refused command) returns
`false, reason` from the callback form and still calls the callback with `(nil, reason)`.

```lua
local ok, err = pcall(r.lpush.await, "inventory:42", item)
if not ok then print("could not store the item: " .. err) end
```

## Commands

Every Redis command is a method of the handle, named after the command in lower or upper case:
`r.zadd`, `r.xadd`, `r.expire`, `r.publish`, `r.geoadd`, `r.pfadd`, `r.bitfield`... The
[Redis command reference](https://redis.io/docs/latest/commands/) applies as written.

Arguments are strings and numbers:

- integers are sent as integers, other numbers in Redis' float syntax (`1.5`, `inf`, `-inf`);
- strings are binary safe, so any bytes can be stored;
- booleans, `nil` and NaN are refused with `invalid_argument`: convert them yourself
  (`flag and 1 or 0`);
- a table is flattened one level: an array adds its elements, a map adds `key, value` pairs.

```lua
r.del.await({ "session:1", "session:2" })              -- DEL session:1 session:2
r.hset.await("car:NC-2077", { model = "Quadra", hp = 410 })
r.zadd.await("board", 120, "v", 95, "jackie")
r.xadd.await("events", "*", { kind = "join", who = name })
r.expire.await("cooldown:42", 30, "NX")                 -- option words are plain arguments
```

A command of two words (`CLIENT LIST`, `OBJECT ENCODING`, `XINFO STREAM`, `MEMORY USAGE`) takes
the second word as its first argument, or goes through `r.call`, which sends any command:

```lua
r.client.await("LIST")
r.call.await("OBJECT", "ENCODING", "board")
```

## Values returned to Lua

| Redis reply | Lua value |
| --- | --- |
| Simple or bulk string | string |
| Integer | integer |
| Null | `nil` at the top level, `Redis.null` inside a table |
| Array, set | array |
| Map (RESP3) | table `{ key = value }` |
| Double (RESP3) | number |
| Boolean (RESP3) | boolean |
| Big number (RESP3) | string |
| Error | the call fails with Redis' message (`WRONGTYPE ...`, `ERR ...`); inside a pipeline or transaction, an error object |

`Redis.null` keeps arrays the right length: `MGET` of three keys, one missing, returns three
entries. Test it with `Redis.isNull(value)`. An error object inside a table is recognised by
`Redis.isError(value)`, and its message is `value.err`.

Stored values are always strings: `GET` or `HGET` of a number returns `"500"`, not `500`.
Convert them with `tonumber`. With the default RESP2, scores (`ZSCORE`, `WITHSCORES`) and
`INCRBYFLOAT` are strings too; with `protocol = 3` they arrive as numbers. Integer replies
(`INCR`, `SCARD`, `DEL`...) are integers in both protocols.

Two helpers reshape common replies:

- `Redis.toMap(list)` turns a flat `{ field, value, ... }` array into a table (a RESP3 map is
  returned unchanged);
- `Redis.parseInfo(text)` turns `INFO` output into `{ section = { key = value } }`, with numbers
  as numbers.

```lua
local info = Redis.parseInfo(r.info.await("memory"))
print(info.memory.used_memory_human)
```

## Helpers

| Call | What it does | Result |
| --- | --- | --- |
| `r.set(key, value, options?)` | `SET` with `options = { ex, px, exat, pxat, nx, xx, keepttl, get }` | `"OK"`; `nil` when `nx` or `xx` prevented the write; the previous value with `get` |
| `r.hgetall(key)` | `HGETALL` | Table `{ field = value }`, in both protocols |
| `r.configGet(pattern, ...)` | `CONFIG GET` | Table `{ name = value }` |
| `r.scanAll(options?)` | `SCAN` until the cursor returns to 0 | Array of keys |
| `r.sscanAll(key, options?)` | `SSCAN` loop | Array of members |
| `r.hscanAll(key, options?)` | `HSCAN` loop | Table `{ field = value }` |
| `r.zscanAll(key, options?)` | `ZSCAN` loop | Table `{ member = score }` with numeric scores |
| `r.evalScript(source, keys?, args?)` | Runs a Lua script with `EVALSHA`, loading it first | The script's reply |
| `r.pipeline(commands)` (`r.batch`) | Sends many commands at once | Array of replies |
| `r.multi(commands, options?)` | `MULTI` ... `EXEC`, optionally after `WATCH` | Array of replies, or `nil, reason` |

`r.set` also accepts raw option words: `r.set.await(key, value, "EX", 60, "NX")`.

### Walking the keyspace

Never call `KEYS *` on a server in use: it blocks Redis while it scans everything. The scan
helpers walk the cursor in small steps instead.

| Scan option | Meaning |
| --- | --- |
| `match` | Glob pattern, for example `"session:*"`. |
| `count` | How many entries Redis looks at per step (a hint, not a limit). |
| `type` | Only keys of that type (`SCAN` only), for example `"hash"`. |
| `novalues` | Field names only (`HSCAN`, Redis 7.4+). |
| `limit` | Stop after this many items (default 100 000). |

```lua
local sessions = r.scanAll.await({ match = "session:*", count = 500 })
if #sessions > 0 then r.unlink.await(sessions) end

local scores = r.zscanAll.await("board")   -- { v = 120, jackie = 95 }
```

A key that is added or removed during a walk may be missed or returned twice; that is how Redis
defines `SCAN`.

### Lua scripts on the Redis server

A script runs atomically on the Redis server, next to the data. `r.evalScript` sends the source
once with `SCRIPT LOAD`, then only its SHA1 with `EVALSHA`. If the server forgot the script
(restart, `SCRIPT FLUSH`, failover), it loads it again and retries once.

```lua
-- Take money only if there is enough of it, in one step.
local SPEND = [[
    local balance = tonumber(redis.call("GET", KEYS[1]) or "0")
    if balance < tonumber(ARGV[1]) then return -1 end
    return redis.call("DECRBY", KEYS[1], ARGV[1])
]]

local left = r.evalScript.await(SPEND, { "bank:" .. owner }, { price })
if left < 0 then print("not enough money") end
```

These scripts are Redis' own Lua, executed by Redis: they cannot see the resource's variables or
call Open77 functions.

## Pipelines

A pipeline sends many commands in one write and returns every reply in one completion. Use it
whenever several independent commands are needed at the same time: ten commands cost one round
trip instead of ten.

```lua
local replies = r.pipeline.await({
    { "HSET", "player:42", "online", 1 },
    { "EXPIRE", "player:42", 300 },
    { "SADD", "online", 42 },
    { "SCARD", "online" },
})
print("players online: " .. replies[4])
```

A pipeline is **not atomic**: commands from other connections can run between its commands. It
fails as a whole only when the connection does (`timeout`, `connection_lost`). A command Redis
rejects fails alone, and its slot holds an error object:

```lua
local replies = r.pipeline.await({ { "SET", "a", 1 }, { "LPUSH", "a", "x" }, { "GET", "missing" } })
-- replies[1] == "OK"
-- Redis.isError(replies[2]) == true, replies[2].err starts with "WRONGTYPE"
-- Redis.isNull(replies[3]) == true
```

Commands issued during the same tick on one handle are also written together, so even separate
callback-form calls are pipelined on the wire.

## Transactions

`r.multi(commands, options?)` runs its commands as one `MULTI` / `EXEC` block: Redis executes
them one after the other, with no command from another connection in between.

```lua
local replies, reason = r.multi.await({
    { "DECRBY", "bank:" .. buyer, price },
    { "INCRBY", "bank:" .. seller, price },
    { "RPUSH", "trades", buyer .. ">" .. seller .. ":" .. price },
})
if not replies then print("trade failed: " .. reason) end
```

`r.multi.await` never raises: it returns the replies, or `nil, reason`.

### Optimistic locking with WATCH

With `{ watch = keys }` the block is discarded if another connection changed one of those keys
between the `WATCH` and the `EXEC`. Read, decide, then retry if the data moved:

```lua
local function buy(owner, item, price)
    local key = "bank:" .. owner
    for attempt = 1, 5 do
        local balance = tonumber(r.get.await(key)) or 0
        if balance < price then return false, "not enough money" end
        local replies, reason = r.multi.await({
            { "DECRBY", key, price },
            { "RPUSH", "inventory:" .. owner, item },
        }, { watch = key })
        if replies then return true end
        if reason ~= "aborted: a watched key changed" then return false, reason end
    end
    return false, "too much contention"
end
```

`watch` takes one key or an array of keys. The `WATCH`, `MULTI`, the commands and `EXEC` are
sent together; the read before them (`GET` above) is a separate round trip, which is exactly what
`WATCH` protects.

### When a transaction fails

| Case | Result |
| --- | --- |
| A watched key changed | `nil, "aborted: a watched key changed"`; nothing ran. |
| Redis refused a command while queuing it (unknown command, wrong number of arguments) | `nil, <that refusal>`, for example `ERR unknown command 'NOPE'`; nothing ran. |
| A command failed while executing (for example `WRONGTYPE`) | The other commands ran; that slot holds an error object. Redis has no rollback. |
| The connection failed | `nil, "timeout"` or `nil, "connection_lost: ..."`; Redis may or may not have run the block. |

Prefer `r.multi` over separate `r.call("MULTI")` / `r.call("EXEC")` calls: another coroutine
using the same handle could slip its own commands into a block built by hand.

## Blocking commands and job queues

`BLPOP`, `BRPOP`, `BLMOVE`, `BRPOPLPUSH`, `BLMPOP`, `BZPOPMIN`, `BZPOPMAX`, `BZMPOP`, `WAIT`,
`WAITAOF` and `XREAD` / `XREADGROUP` with `BLOCK` wait on the Redis server. Their client timeout
is the handle's `commandTimeout` **plus** their own wait, so a `BLPOP` of 30 seconds does not time
out after 10. A wait of 0 (forever) disables the client timeout for that command.

A connection answers its commands in order, so a blocking command holds up every command sent
after it on the same handle. **Give each blocking consumer its own connection:**

```lua
-- Worker: takes jobs pushed by any server or tool with RPUSH jobs:payouts <json>.
CreateThread(function()
    local queue = Redis.connect.await(REDIS_URL)
    while true do
        local job = queue.blpop.await("jobs:payouts", 5)   -- { "jobs:payouts", payload } or nil after 5 s
        if job then
            local ok, err = pcall(handlePayout, json.decode(job[2]))
            if not ok then print("payout failed: " .. tostring(err)) end
        end
    end
end)
```

For jobs that must not be lost if the server stops halfway, use `BLMOVE` into a processing list,
or a stream with a consumer group (`XREADGROUP` / `XACK`).

## Publish and subscribe

A connection that subscribes can no longer run ordinary commands, so pub/sub uses its own handle,
opened with `Redis.subscriber` (same options as `Redis.connect`). Publishing is an ordinary
command of a client handle.

```lua
local sub = Redis.subscriber.await(REDIS_URL)

sub.subscribe.await("announcements", function(message, channel)
    print("[" .. channel .. "] " .. message)
end)

sub.psubscribe.await("match.*", function(message, channel, pattern)
    print(channel .. " (matched " .. pattern .. "): " .. message)
end)

-- Elsewhere, on a client handle:
local receivers = r.publish.await("announcements", "Server restart in 5 minutes")
```

| Call | Meaning |
| --- | --- |
| `sub.subscribe(channel, ..., handler?)` | Subscribe to channels; the trailing function receives their messages. |
| `sub.psubscribe(pattern, ..., handler?)` | Subscribe to glob patterns; the handler also receives the matched pattern. |
| `sub.ssubscribe(channel, ..., handler?)` | Sharded channels (Redis 7+, cluster deployments). |
| `sub.unsubscribe(channel, ...)` | Stop; with no name, every channel. `sub.punsubscribe` and `sub.sunsubscribe` do the same for patterns and sharded channels. |
| `sub.on(handler)` | `handler(message, channel, pattern, kind)` for every message; returns a function that removes the handler. |
| `sub.onState(handler)` | Connection changes, see below. |
| `sub.close()` / `sub.isOpen()` | Close the subscriber / its state. |

Handlers receive `(message, channel, pattern, kind)`: `pattern` is `nil` except for pattern
messages, and `kind` is `"channel"`, `"pattern"` or `"shard"`. Names may also be passed as an
array. The subscription calls take `.await`, which returns `true` once Redis confirmed, or no
callback at all.

Handlers run on the resource's scheduler, on the server tick, so they can use any server API.
Messages are delivered at most once and are not stored: a subscriber that is disconnected misses
what is published meanwhile. For messages that must not be lost, use a list or a stream.

After a drop, a subscriber reconnects by itself (after 0.5 s, then doubling up to 30 s) and
subscribes again to everything it had.

## Connection state and reconnection

`r.onState(handler)` and `sub.onState(handler)` receive `handler(state, detail)`:

| State | Detail |
| --- | --- |
| `"disconnected"` | Why the connection was lost. |
| `"reconnecting"` | When the next attempt is due (subscribers). |
| `"connected"` | `host:port`, once a reconnect succeeded. |
| `"overflow"` | How many messages were dropped because more than 20 000 were waiting for the tick (subscribers). |

```lua
r.onState(function(state, detail)
    print(("redis %s: %s"):format(state, detail))
end)
```

A client handle reconnects on its next command, which fails only if Redis is still unreachable.
The commands that were waiting when the connection dropped fail with `connection_lost: ...`, and
Redis may or may not have run them: retry only what is safe to run twice (`SET`, `HSET`, `DEL`),
not what is not (`INCR`, `RPUSH`).

A `timeout` also closes the connection, because a late reply would otherwise be taken as the
answer to the next command. The database chosen with `SELECT` is restored on every reconnect.

`r.isOpen()` tells whether the handle is usable, and `r.database()` returns the database it is on.

## Lifecycle

- A resource can hold up to 16 connections, clients and subscribers together.
- `r.close()` waits for the commands already sent on the handle, then closes it. Later calls fail
  with `connection_closed`.
- Stopping, restarting or reloading the resource (`ensure`) closes every connection it left open.
- A client handle Lua garbage-collects without `close` is closed by the collector. A subscriber
  stays open until it is closed or the resource stops.
- Results and messages are delivered at the end of the resource's tick. Callbacks, `.await`
  continuations and subscriber handlers never run on a network thread.

`Redis.openCount()` returns how many connections the resource holds.

## Example: cache in front of a database

Serve repeated reads from Redis and fall back to MySQL when the value is missing or expired.

```lua
local function profileOf(identifier)
    local key = "cache:profile:" .. identifier
    local cached = r.get.await(key)
    if cached then return json.decode(cached) end

    local row = MySQL.single.await("SELECT name, cash, rank FROM profiles WHERE identifier = ?", { identifier })
    if row then r.set.await(key, json.encode(row), { ex = 60 }) end
    return row
end

-- After a write, drop the cached copy so the next read reloads it.
local function setCash(identifier, cash)
    MySQL.update.await("UPDATE profiles SET cash = ? WHERE identifier = ?", { cash, identifier })
    r.del.await("cache:profile:" .. identifier)
end
```

## Example: leaderboard

```lua
local function addKills(name, kills)
    r.zincrby("board:kills", kills, name)        -- fire and forget
end

local function top(count)
    local flat = r.zrange.await("board:kills", 0, count - 1, "REV", "WITHSCORES")
    local rows = {}
    for i = 1, #flat - 1, 2 do rows[#rows + 1] = { name = flat[i], kills = tonumber(flat[i + 1]) } end
    return rows
end

RegisterCommand("top", function(source)
    CreateThread(function()
        for rank, row in ipairs(top(10)) do print(("%d. %s %d"):format(rank, row.name, row.kills)) end
    end)
end, false)
```

`ZRANGE ... REV` needs Redis 6.2 or later; use `ZREVRANGE` on older servers.

## Example: rate limit and cooldowns

Count actions per player in a fixed window. The pipeline sends both commands in one round trip.

```lua
-- true when the player may act: at most `limit` actions every `window` seconds.
local function allow(identifier, action, limit, window)
    local key = ("rate:%s:%s"):format(action, identifier)
    local replies = r.pipeline.await({ { "INCR", key }, { "EXPIRE", key, window, "NX" } })
    return replies[1] <= limit
end

if not allow(identifier, "rob", 1, 600) then
    return print("robbery on cooldown")
end
```

`EXPIRE ... NX` needs Redis 7.0; on older servers, send `EXPIRE` only when `INCR` returned 1.

## Example: a lock shared by several servers

When two servers might handle the same thing (an auction, a unique world event), a lock with an
expiry makes sure only one does, even if the holder crashes.

```lua
local RELEASE = [[
    if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) end
    return 0
]]

local function withLock(name, milliseconds, body)
    local key = "lock:" .. name
    local token = ("%d:%d"):format(math.floor(Open77.time.unix() * 1000), math.random(1, 1 << 30))
    if not r.set.await(key, token, { nx = true, px = milliseconds }) then return false, "busy" end
    local ok, err = pcall(body)
    r.evalScript.await(RELEASE, { key }, { token })   -- releases only our own lock
    if not ok then return false, err end
    return true
end

withLock("auction:" .. auctionId, 5000, function()
    -- settle the auction once, whichever server gets here first
end)
```

## Example: messages between servers

Servers that share one Redis can talk to each other with pub/sub, for example to relay an
announcement or a ban to the whole network.

```lua
local SERVER_NAME = "eu-1"

CreateThread(function()
    local sub = Redis.subscriber.await(REDIS_URL)
    sub.subscribe.await("network:announce", function(message)
        local event = json.decode(message)
        if event.from ~= SERVER_NAME then
            print(("[network] %s: %s"):format(event.from, event.text))
        end
    end)
end)

local function announceToNetwork(text)
    r.publish("network:announce", json.encode({ from = SERVER_NAME, text = text }))
end
```

## Refused commands

A client handle refuses, before sending them, the commands that would change what the connection
is:

| Command | Why |
| --- | --- |
| `SUBSCRIBE`, `PSUBSCRIBE`, `SSUBSCRIBE` and their `UN` forms | Use `Redis.subscriber`. |
| `MONITOR`, `SYNC`, `PSYNC`, `REPLCONF` | The connection would stop answering commands. |
| `QUIT`, `RESET`, `HELLO` | They end or reset the session the handle manages; use `close` and the connect options. |
| `CLIENT REPLY` | Replies would no longer match their commands. |

They fail with `unsupported_command:<NAME>`. A subscriber handle, in turn, has no command
methods: only the subscription calls listed above. `SELECT` is allowed: the handle remembers the new database.

## Errors

| Reason | Cause |
| --- | --- |
| `permission_denied:redis.access` | The manifest does not declare `redis.access`. |
| `invalid_options:<name>` / `invalid_url` | Unknown option, a value of the wrong type or range, or a malformed URL. |
| `connect_failed: <reason>` | Redis could not be reached: refused, timed out, unknown host, TLS failure. |
| `auth_failed: <reply>` | Wrong user name or password. |
| `select_failed: <reply>` | The database does not exist on that server. |
| `protocol_unsupported` | `protocol = 3` on a server older than Redis 6. |
| `invalid_argument: ...` | An argument is not a string or a number. |
| `unsupported_command:<NAME>` | A refused command, see above. |
| `subscriber_connection: ...` / `not_a_subscriber: ...` | A command on a subscriber, or a subscription on a client. |
| `too_many_connections` | The resource already holds 16 connections. |
| `too_many_pending` | 10 000 requests are already waiting on the connection. |
| `request_too_large` | One request carries more than 64 MiB. |
| `timeout` | No reply within the command timeout. The connection is closed. |
| `connection_lost: <reason>` | The connection dropped while the command waited. |
| `connection_closed` | The handle was closed, or the resource is stopping. |
| `aborted: a watched key changed` | A `multi` with `watch` was discarded. |
| Anything else | Redis' own error, verbatim: `WRONGTYPE ...`, `ERR ...`, `NOSCRIPT ...`, `OOM ...`, `NOPERM ...` |

Connection failures and dropped messages are also logged on the server at `WRN` as
`[redis] resource '<name>' ...`; identical lines are folded for 60 seconds. Passwords never
appear in logs, errors or handle labels.

## Limits

| Limit | Value |
| --- | --- |
| Connections per resource | 16 |
| Requests waiting on one connection | 10 000 |
| Commands per pipeline or transaction | 1–10 000 |
| Bytes per request | 64 MiB |
| Reply size | `maxReplyBytes` (default 32 MiB); a larger reply closes the connection |
| Reply nesting | 64 levels |
| Messages waiting for the tick, per subscriber | 20 000; the oldest are dropped |
| Items per scan helper | `limit` (default 100 000) |
