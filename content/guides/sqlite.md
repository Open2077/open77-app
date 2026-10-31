# SQLite databases from Lua

Store a resource's data in SQLite files that the resource opens, configures and closes itself,
from server Lua. There is no database service to install and nothing to add to `server.jsonc`:
the SQLite engine ships with the dedicated server on Windows and Linux, and every setting is an
argument of `SQLite.open`. The handle it returns *is* the connection.

Requests run off the server tick and their results come back on the resource's own scheduler,
with the same two calling forms as the [MySQL bridge](/docs/database): a callback, or `.await`
from a thread. `SQLite` and `Open77.sqlite` are the same table.

SQLite is server-only. Clients never open these files and players never connect to them.

## Choose a store

| Need | Use |
| --- | --- |
| A few values per resource (settings, counters, a last position) | [Server KVP](/docs/server-api#resource-keyvalue-store) |
| Tables, queries, joins and transactions owned by one resource, with no service to run | **SQLite** |
| One database shared by several servers, or by external tools while the server runs | [MySQL/MariaDB](/docs/database) |

A SQLite file belongs to one resource. Other resources reach its data through that resource's
[exports](/docs/server-exports), never by opening the file.

## Prerequisites

Declare the `sqlite.access` permission in the resource manifest:

```lua
resource "garage"
version "1.0.0"
server_script "server/main.lua"

permissions { "sqlite.access" }
```

Without it every call fails with `permission_denied:sqlite.access`. Only `SQLite.version()`
answers without the permission. `sqlite.access` is separate from `database.access`: the first
reaches files inside the resource's own directory, the second the operator's MySQL server.

## Quick start

```lua
CreateThread(function()
    -- <resource>/data/garage.db, created with its folder on first use.
    local db = SQLite.open.await("garage.db")

    db.execute.await([[
        CREATE TABLE IF NOT EXISTS vehicles (
            plate  TEXT PRIMARY KEY,
            owner  TEXT NOT NULL,
            model  TEXT NOT NULL,
            stored INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS vehicles_owner ON vehicles (owner);
    ]])

    db.insert.await("INSERT OR IGNORE INTO vehicles (plate, owner, model) VALUES (?, ?, ?)",
        { "NC-2077", "char:42", "Vehicle.v_sport2_quadra_type66" })

    for _, car in ipairs(db.query.await("SELECT plate, model FROM vehicles WHERE owner = ?", { "char:42" })) do
        print(car.plate, car.model)
    end
end)
```

Keep the handle for the life of the resource, in a local of the main chunk. Opening a file once
and reusing the handle is cheaper than opening it for each request.

## Files and paths

`path` is relative to the resource's `data/` directory, the same root as `Open77.io` and server
KVP. Sub-folders are created on demand.

| Path | Meaning |
| --- | --- |
| `"garage.db"` | `<resource>/data/garage.db` |
| `"saves/2077/world.db"` | A file in a sub-folder of `data/` |
| `":memory:"` | A private in-memory database, discarded when its handle closes |

These are refused with `invalid_path`: absolute paths, drive letters, `..`, `file:` URIs, empty
segments, paths longer than 512 bytes, and names ending in `-wal`, `-shm` or `-journal` (SQLite's
own companion files).

Exclude `data/` from version control. Back it up with the server's other data, or from Lua with
[`db.backup`](#dbbackuppath-callback), which copies a consistent snapshot while the database is in use.

## Open a database

```lua
SQLite.open(path, options?, callback)         -- callback(db, err)
local db = SQLite.open.await(path, options?)  -- raises the reason on failure
```

`open` requires a callback or `.await`: the handle must reach the resource so it can be closed.

| Option | Default | Description |
| --- | --- | --- |
| `readOnly` | `false` | Open read-only. Writes fail with SQLite's `readonly` error. |
| `create` | `true` | Create the file and its folders when missing. With `false`, a missing file fails the open. |
| `journal` | `"wal"` | `PRAGMA journal_mode`: `"wal"`, `"delete"`, `"truncate"`, `"persist"`, `"memory"` or `"off"`. Not applied to `:memory:` or read-only handles. |
| `synchronous` | `"normal"` | `PRAGMA synchronous`: `"off"`, `"normal"`, `"full"` or `"extra"`. `"normal"` is safe with WAL; `"full"` also survives a power loss. |
| `foreignKeys` | `true` | `PRAGMA foreign_keys`. On by default so that `REFERENCES` constraints are enforced. |
| `busyTimeout` | `5000` | Milliseconds to wait for a lock held by another handle, `0`–`600000`. |
| `maxRows` | `10000` | Rows returned by one `query`, `1`–`1000000`. Extra rows are dropped and the server logs a `WRN`. |

An unknown option, or a value of the wrong type or range, fails with `invalid_options:<name>`.
Any other setting is plain SQL on the handle:

```lua
db.execute.await("PRAGMA cache_size = -20000")   -- about 20 MB of page cache
```

## Calling forms

Every request accepts both forms. `db.query(...)` and `db:query(...)` are the same call.

```lua
-- Callback: returns ok, reason at once; the callback receives (result, err) later.
db.query("SELECT plate FROM vehicles WHERE owner = ?", { owner }, function(rows, err)
    if err then return print("garage lookup failed: " .. err) end
    print(#rows .. " vehicles")
end)

-- Await: from CreateThread, a command or an event handler; returns the result.
local rows = db.query.await("SELECT plate FROM vehicles WHERE owner = ?", { owner })
```

| Form | On success | On failure |
| --- | --- | --- |
| Callback | `callback(result, nil)` | `callback(nil, reason)` |
| `.await` | returns `result` | raises `reason` (use `pcall` to continue) |
| `db.transaction.await` | returns `true` | returns `false, reason` |

A request refused before it runs (bad arguments, closed handle, too many requests) also returns
`false, reason` from the callback form and still calls the callback with `(nil, reason)`.

```lua
local ok, err = pcall(db.insert.await, "INSERT INTO vehicles (plate, owner, model) VALUES (?, ?, ?)",
    { plate, owner, model })
if not ok then print("insert refused: " .. err) end
```

## Request reference

### db.query(sql, params?, callback?)

Returns an array of row tables, empty when nothing matches. Column names are the keys; a `NULL`
column is absent from its row. `db.prepare` is an alias.

### db.single(sql, params?, callback?)

Returns the first row, or `nil`.

### db.scalar(sql, params?, callback?)

Returns the first column of the first row, or `nil`.

```lua
local count = db.scalar.await("SELECT COUNT(*) FROM vehicles WHERE owner = ?", { owner })
```

### db.insert(sql, params?, callback?)

Returns the rowid of the inserted row (`last_insert_rowid()`), as an integer.

### db.update(sql, params?, callback?)

Returns the number of rows changed, as an integer. Use it for `UPDATE`, `DELETE` and single DDL
statements.

### db.execute(sql, params?, callback?)

Runs **every** statement in `sql` and returns the total number of rows changed. Use it for schema
scripts, migrations, `PRAGMA` and explicit `BEGIN`/`COMMIT`.

### db.batch(sql, paramSets, callback?)

Runs one statement once per parameter table, all inside one transaction, and returns the total
rows changed. If one set fails, none is applied.

```lua
db.batch.await("INSERT INTO log (at, text) VALUES (?, ?)", {
    { math.floor(Open77.time.unix()), "boot" },
    { math.floor(Open77.time.unix()), "ready" },
})
```

### db.transaction(statements, callback?)

Runs an ordered list inside one transaction: every statement commits, or none does. Each entry
is a SQL string or `{ query = ..., values = ... }`. Returns `true`.

```lua
local ok, reason = db.transaction.await({
    { query = "UPDATE accounts SET balance = balance - ? WHERE owner = ?", values = { price, buyer } },
    { query = "UPDATE accounts SET balance = balance + ? WHERE owner = ?", values = { price, seller } },
    "INSERT INTO audit (note) VALUES ('trade')",
})
if not ok then print("trade rolled back: " .. reason) end
```

The reason names the failing entry, for example `statement 2/3: sqlite_error (19/2067): ...`.

### db.backup(path, callback?)

Copies the whole database into another file under `data/`, replacing it, while the database stays
in use. Returns `true`. The destination cannot be the source or a file the resource has open.

```lua
db.backup.await("backups/garage-latest.db")
```

### db.close(callback?)

Closes the handle after every request already sent on it has run. Returns `true`. Later requests
on the handle fail with `database_closed`.

### db.isOpen()

Returns `true` while the handle can take requests. Answers immediately.

### db.path and db.id

The path given to `open`, and the handle's numeric id.

## Module calls

| Call | Result |
| --- | --- |
| `SQLite.exists(path)` | `true` or `false`; `nil, reason` for a refused path. |
| `SQLite.remove(path)` | `true, removed` after deleting the file and its `-wal`, `-shm` and `-journal` files. `removed` is `false` when there was no file. Fails with `database_in_use` while the resource has the file open. |
| `SQLite.version()` | The SQLite library version, for example `"3.53.4"`. |
| `SQLite.openCount()` | The number of handles the resource holds open. |

## Parameters

Values are always bound by the engine, never inserted into the SQL text.

- **Positional:** the array part of the table binds `?` in order, or `?NNN` by number (`?1` can
  appear several times). A statement uses one style; mixing `?` and `?NNN` fails with
  `mixed_positional_placeholders`.
- **Named:** string keys bind `@name`, `:name` or `$name` in the SQL. A key can be written bare,
  as `["@name"]` or as `[":name"]`. Names beginning with `__` are reserved.

```lua
db.update.await("UPDATE vehicles SET stored = ? WHERE plate = ?", { 0, plate })
db.update.await("UPDATE vehicles SET owner = :owner WHERE plate = :plate", { owner = buyer, plate = plate })
db.query.await("SELECT * FROM vehicles WHERE owner = ?1 OR previous_owner = ?1", { owner })
```

A `?` inside `'...'`, `"..."`, `` `...` ``, `[...]`, a `--` comment or a `/* */` comment is not a
placeholder. SQLite has no backslash escapes, so `'C:\'` is a complete string.

Accepted values are `nil`, booleans (stored as `1` and `0`), integers, numbers and strings. A
parameter table cannot contain `nil` holes: write `NULL` in the SQL instead. The number of
positional values must match the placeholders; otherwise the request fails with
`parameter_count_mismatch`, which quotes both counts and the statement.

## Values returned to Lua

| SQLite value | Lua value |
| --- | --- |
| `NULL` | `nil` (the key is absent from the row) |
| `INTEGER` | integer; booleans read back as `1` or `0` |
| `REAL` | number |
| `TEXT` | string |
| `BLOB` | Base64 string |

## Concurrency and transactions

A handle is one connection, and its requests run one at a time in the order they were sent. A
transaction can therefore span several awaits on the same handle:

```lua
db.execute.await("BEGIN IMMEDIATE")
local balance = db.scalar.await("SELECT balance FROM accounts WHERE owner = ?", { owner })
if balance >= price then
    db.update.await("UPDATE accounts SET balance = ? WHERE owner = ?", { balance - price, owner })
    db.execute.await("COMMIT")
else
    db.execute.await("ROLLBACK")
end
```

No other request on that handle runs between these statements. If an error can interrupt the
thread between `BEGIN` and `COMMIT`, prefer `db.transaction`, which always ends the transaction.

To keep reads responsive during a long write, open a second handle on the same file. In WAL mode,
readers do not wait for the writer, and the writer waits up to `busyTimeout` for other handles.

## Lifecycle

- A resource can hold up to 32 open handles.
- Stopping, restarting or reloading the resource closes every handle it left open and releases the
  files before the new instance starts.
- A handle that Lua garbage-collects without `close` is closed by the collector. Close handles
  explicitly to release files at a known time.
- Results are delivered at the end of the resource's tick. Callbacks and `.await` continuations
  never run on a worker thread, so they can use the rest of the resource's state safely.

## Example: versioned schema

`PRAGMA user_version` stores an integer in the file header, which is a convenient schema version.

```lua
local db

local migrations = {
    [1] = [[
        CREATE TABLE vehicles (plate TEXT PRIMARY KEY, owner TEXT NOT NULL, model TEXT NOT NULL);
    ]],
    [2] = [[
        ALTER TABLE vehicles ADD COLUMN stored INTEGER NOT NULL DEFAULT 1;
        CREATE INDEX vehicles_owner ON vehicles (owner);
    ]],
}

CreateThread(function()
    db = SQLite.open.await("garage.db")
    local version = db.scalar.await("PRAGMA user_version")
    for target = version + 1, #migrations do
        local ok, reason = db.transaction.await({ migrations[target], "PRAGMA user_version = " .. target })
        if not ok then error(("migration %d failed: %s"):format(target, reason)) end
        print(("garage schema now at version %d"):format(target))
    end
end)
```

## Example: share data through exports

The resource that owns the file answers other resources through exports:

```lua
-- garage/server/main.lua
exports("vehiclesOf", function(owner)
    return db.query.await("SELECT plate, model, stored FROM vehicles WHERE owner = ?", { owner })
end)
```

```lua
-- another resource, from a thread, a command or an event handler
local pending, dispatchError = Open77.exports.call("garage", "vehiclesOf", owner)
if not pending then return print(dispatchError) end
local cars, callError = pending:await()
```

The export waits on the database, so call it with `Open77.exports.call` and `:await()`. The
synchronous form (`exports.garage:vehiclesOf(owner)`) fails with `export_yielded` when the
callee awaits. See [server exports](/docs/server-exports).

## Errors

| Reason | Cause |
| --- | --- |
| `permission_denied:sqlite.access` | The manifest does not declare `sqlite.access`. |
| `invalid_path` | The path is empty, absolute, leaves `data/`, or names a companion file. |
| `invalid_options:<name>` | Unknown option, or a value of the wrong type or range. |
| `invalid_sql` | Empty SQL, or longer than 1 MiB. |
| `invalid_parameters` | A value that is not `nil`, boolean, number or string; a `nil` hole; an invalid or reserved name. |
| `parameter_count_mismatch: ...` | The positional values do not match the placeholders. |
| `mixed_positional_placeholders: ...` | The statement uses both `?` and `?NNN`. |
| `unterminated_sql_literal: ...` | A quote or bracket never closes. |
| `invalid_transaction` / `invalid_batch` | The list is empty, too long, or contains an entry of the wrong shape. |
| `too_many_parameters` | More than 999 values in one statement. |
| `too_many_databases` | The resource already holds 32 open handles. |
| `too_many_pending` | 4096 requests are already waiting on the handle. |
| `database_closed` | The handle was closed, or the resource is stopping. |
| `database_in_use` | `remove` or a backup destination targets a file the resource has open. |
| `sqlite_error (<code>/<extended>): <message>` | SQLite rejected the statement, for example a missing table or a constraint. |

SQLite's messages name tables, columns and constraints, never bound values. Every failed request
is also logged on the server at `ERR` as `[sqlite] resource '<name>' <request> on '<path>'
failed: ...`; identical failures are folded for 60 seconds. Refusals before a request runs are
returned to the resource only.

## Limits

| Limit | Value |
| --- | --- |
| SQL text per call | 1 MiB of UTF-8 |
| Parameters per statement | 999 |
| Statements per transaction | 1–1000 |
| Parameter sets per batch | 1–10 000 |
| Open handles per resource | 32 |
| Requests waiting on one handle | 4096 |
| Path length | 512 bytes |
| Rows per `query` | `maxRows` (default 10 000) |
