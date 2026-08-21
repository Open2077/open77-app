# Client persistent KVP

`CyberM.kvp` stores small client-local values persistently. Its namespace is always:

```text
connection address -> resource name -> key
```

Connecting to `188.40.140.88:11777` and `localhost:11777` therefore creates two independent
stores, even if both addresses reach the same machine. Resources cannot name or inspect another
resource's namespace.

```lua
local ok, reason = CyberM.kvp.set("character:lastSlot", 2)
assert(ok, reason)

local slot = CyberM.kvp.get("character:lastSlot", 1)
local present = CyberM.kvp.has("character:lastSlot")
local newCount = CyberM.kvp.increment("stats:connections", 1)
```

## API

| Method | Result | Description |
|---|---|---|
| `set(key, value)` | `true` or `false, reason` | Store a string, integer, finite number, or boolean. |
| `get(key[, default])` | value/default, or `nil, reason` | Read the original Lua type. Missing keys are not errors. |
| `has(key)` | boolean, optionally `reason` | Check whether the key exists. |
| `delete(key)` | boolean, optionally `reason` | Delete a key and report whether it existed. |
| `keys([prefix[, limit]])` | string array or `nil, reason` | Sorted prefix search; default limit is 256. |
| `find([prefix[, limit]])` | entry array or `nil, reason` | Return `{ key, value, type }` records. |
| `clear([prefix])` | removed count or `nil, reason` | Delete this resource's matching keys only. |
| `increment(key[, delta])` | number or `nil, reason` | Atomically create/increment a numeric value. |
| `setIfAbsent(key, value)` | boolean, optionally `reason` | Redis-style `SETNX`. |
| `compareAndSet(key, expected, replacement)` | boolean, optionally `reason` | Atomic CAS. `nil` means missing for expected and deletion for replacement. |
| `stats()` | table or `nil, reason` | Entry/byte usage, quotas, address, and resource namespace. |

FiveM-familiar aliases are also available: `SetResourceKvp`, `GetResourceKvp`, and
`DeleteResourceKvp`. New code should prefer `CyberM.kvp` because it exposes typed results and the
atomic/search operations.

## Limits and persistence guarantees

- Keys: 1-256 bytes, with no control characters.
- String values: at most 64 KiB each.
- Resource store: at most 4,096 entries and 1 MiB of key/value payload.
- Files are committed through a same-directory temporary file and an atomic replace.
- A versioned binary header and CRC32 reject truncated or corrupted files instead of silently
  replacing them.
- Validation/preflight Lua states cannot write KVP data.

Data is stored below `red4ext/plugins/CyberM/storage/kvp`. The connection address is reversibly
hex-encoded before becoming a directory name, preventing path traversal without changing its
namespace semantics.

This is local persistence, not secret storage. The player owns the machine and can inspect or
remove the files. Never store passwords, server tokens, private keys, or authoritative economy
state in client KVP. Use the server database for anything that must resist client modification.
