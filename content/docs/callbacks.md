# Network callbacks: asking the other side a question

Network callbacks provide asynchronous request/response communication between client and server. A call returns an `Open77.Promise` that resolves with the response or rejects with an error.

Callbacks serve the same request/response role as FiveM framework callbacks. Validate requests on the receiving side; callbacks do not grant additional authority.

Callbacks ride the existing net-event transport, so they need the same
`network.events` manifest permission and nothing more. They are **not** a new
trust level: read [A callback is a request, never a grant](#a-callback-is-a-request-never-a-grant)
before you write your first handler.

## The two directions

Client asks, server answers — the shape you will use ninety per cent of the time:

```lua
-- resources/shop/server.lua
Open77.net.register('getStock', function(source, item)
    -- `source` is the authenticated player id. The client cannot forge it.
    if type(item) ~= 'string' or #item > 64 then return nil, 'invalid_item' end
    if not atTheCounter(source) then return nil, 'too_far' end  -- re-validate, every time
    return stock[item] or 0, kPrices[item]
end)
```

```lua
-- resources/shop/client.lua
CreateThread(function()
    local count, price = Open77.net.callAwait('getStock', 'ripperdoc_kit')
    if count == nil then
        Open77.log.warn('stock lookup failed: ' .. tostring(price))
        return
    end
    print(('%d in stock at %d eddies'):format(count, price))
end)
```

Server asks, client answers — for anything only the client knows (a UI choice,
a progress bar the player can cancel, a local reading):

```lua
-- resources/shop/client.lua  (`confirm` is your own dialog, not a platform API)
Open77.net.register('confirmPurchase', function(item, price)
    return confirm(('Buy %s for %d?'):format(item, price))
end)
```

```lua
-- resources/shop/server.lua
local accepted = Open77.net.callClientAwait(source, 'confirmPurchase', item, price)
if accepted ~= true then return end   -- refused, timed out, or disconnected
```

## API

### Server

| Call | Meaning |
|---|---|
| `Open77.net.register(name, handler)` | Answer a client's `Open77.net.call`. `handler(source, ...)` returns any number of values. Returns `true`, or `nil, reason`. |
| `Open77.net.unregister(name)` | Stop answering. Returns `true`, or `false, reason`. |
| `Open77.net.callClient(playerId, name, ...)` | Ask one client a question. Returns an `Open77.Promise`, or `nil, reason`. |
| `Open77.net.callClientAwait(playerId, name, ...)` | `callClient(...):await()`, for use inside a `CreateThread`. |
| `Open77.callbacks.*` | Alias table carrying the same four functions. Pick one spelling per resource. |

### Client

| Call | Meaning |
|---|---|
| `Open77.net.register(name, handler)` | Answer the server's `callClient`. `handler(...)` — no `source`, the caller is always the server. |
| `Open77.net.unregister(name)` | Stop answering. |
| `Open77.net.call(name, ...)` | Ask the server. Returns an `Open77.Promise`, or `nil, reason`. |
| `Open77.net.callAwait(name, ...)` | `call(...):await()`, for use inside a `CreateThread`. |
| `Open77.callbacks.*` | The same alias table. |

The promise is the ordinary `Open77.Promise` you already get from
[`Open77.exports.call`](server-exports.md): `p:status()` returns `pending`,
`resolved`, `rejected` or `cancelled`, and `p:await()` yields inside a
scheduler coroutine and returns the handler's values, or `nil, reason`.

`await` outside a scheduler coroutine returns `nil, "await_requires_scheduler_coroutine"`
rather than blocking the frame. Wrap it in `CreateThread`.

## Namespacing: a callback belongs to a resource

`Open77.net.call("getStock")` from resource `shop` reaches the handler that
resource `shop` registered **on the other side**. The client and server halves
of one resource talk to each other and nobody else. To reach a different
resource, name it:

```lua
local promise = Open77.net.call({ resource = 'bank', name = 'balance' })
```

Why not FiveM's flat global namespace, where `lib.callback('getStock')` reaches
whichever resource happened to register that name? Because two resources that
both want `getStock` then collide silently, and whichever started last wins for
everyone. Open77's exports are already addressed as `(resource, name)` and its
permissions are per resource; callbacks follow the same rule, with the common
case — your own resource — as the default so nothing has to be spelled out.

The cross-resource form is a **table**, not a second positional argument,
because everything after the name is payload: a positional `resource` argument
could never be told apart from a first argument that happens to be a string.

Being reachable is not the same as being trusted. A cross-resource callback is
still a request from a client; see the next section.

## A callback is a request, never a grant

**The server is authoritative.** A callback handler is reached because a client
asked it to be, with arguments the client chose. It must re-validate exactly
what a `RegisterNetEvent` handler must re-validate:

- **distance** — the player must actually be where the action requires;
- **ownership** — the vehicle, the item, the container must be theirs;
- **permission** — the job, the gang, the ACL entry;
- **shape** — type, range and length of every argument, including nested tables.

The single thing the client cannot choose is **who it is**. Inside a server
handler, `source` is the authenticated player id, taken from the transport and
never from the payload, exactly as `RegisterNetEvent` sets it.

```lua
Open77.net.register('withdraw', function(source, amount)
    -- `source` cannot be forged. `amount` absolutely can be.
    if type(amount) ~= 'number' or amount ~= math.floor(amount)
       or amount < 1 or amount > 100000 then
        return nil, 'invalid_amount'
    end
    if not accounts[source] or accounts[source] < amount then return nil, 'insufficient' end
    accounts[source] = accounts[source] - amount
    return accounts[source]
end)
```

One caveat worth knowing: use the `source` **argument**, not the global, in a
handler that yields. The global is set the way `RegisterNetEvent` sets it, which
means another task can overwrite it across a `Wait` or an `await`. The argument
is yours for the life of the call.

## Timeouts

Every call carries a deadline. The default is **10 000 ms**; override it with
the table form:

```lua
local promise = Open77.net.call({ name = 'getStock', timeout = 2000 }, 'ripperdoc_kit')
local ok      = Open77.net.callClientAwait(source, { name = 'confirm', timeout = 30000 })
```

Accepted range: **100 ms to 120 000 ms**; anything else fails immediately with
`invalid_callback_timeout`. A call that runs out of time rejects with
`callback_timeout` — it is never retried, and the answer, if it ever arrives,
is dropped.

A **missing handler does not wait for the timeout.** A request for a name
nobody registered, or for a resource that is not running, is refused on the
next frame with `callback_not_found` or `callback_resource_unavailable`.

A resource that stops or reloads answers everything it was still serving with
`callback_target_stopped`, rather than leaving the other side to wait out its
deadline. Its own pending promises die with its VM.

The answering side has a deadline of its own. A handler that never returns --
an accidental `while true do Wait(1) end` -- would otherwise hold its slot for
the life of the process, and 256 of them would refuse every further question to
that resource forever. After 120 s, the longest any asker can still be waiting,
the slot is reclaimed with `callback_handler_abandoned` and a warning in the
log naming the callback.

## Limits

Callbacks reuse the net-event envelope, so its caps apply unchanged, minus a
three-slot frame header:

| Limit | Value | Reason given |
|---|---|---|
| Arguments per call | 29 | `callback_too_many_arguments` |
| Return values per answer | 29 | `callback_too_many_results` |
| Payload size | 48 KiB per frame | `callback_payload_too_large` |
| Table depth | 16 | `callback_arguments_not_serializable` |
| Table nodes | 4096 | `callback_arguments_not_serializable` |
| String length | 16 KiB | truncated by the envelope |
| Registered names per resource | 256 | `callback_registration_limit` |
| Questions open at once, per resource | 256 | `callback_request_limit` |
| Questions being served at once, per resource | 256 | `callback_target_busy` |
| Questions open at once, per host | 4096 | `callback_host_limit` |

Exceeding a cap **rejects immediately**; nothing ever blocks or queues. The
per-resource and per-host numbers mirror the export broker on purpose: one
runaway resource cannot starve the others.

Values cross the boundary as JSON, so the same rules as net events apply:
strings (including embedded zero bytes), integers, floats, booleans, `nil` and
tables of those. Functions, userdata and coroutines are not transferable.

## Failure reasons

All of them are stable snake_case strings. Dispatch failures come back as
`nil, reason` from `call`/`callClient`; everything else rejects the promise.

| Reason | Meaning |
|---|---|
| `permission_denied:network.events` | The manifest does not declare the permission. |
| `invalid_callback_name` | Empty, over 64 characters, or not a string. |
| `invalid_callback_resource` | Empty or over 128 characters. |
| `invalid_callback_timeout` | Outside 100–120 000 ms, or not a number. |
| `invalid_player_id` | `callClient` needs a positive player id. |
| `callback_broadcast_unsupported` | `callClient(-1, ...)` — see [Out of scope](#out-of-scope). |
| `callback_not_found` | No handler with that name on the other side. |
| `callback_resource_unavailable` | The named resource is missing, stopped, or lacks `network.events`. |
| `callback_target_busy` | The answering side is already serving its maximum. |
| `callback_target_stopped` | The answering resource stopped or reloaded mid-call. |
| `callback_handler_abandoned` | The handler never returned; the answering side reclaimed its slot after 120 s. |
| `callback_timeout` | No answer before the deadline. |
| `callback_request_limit` / `callback_host_limit` | Too many questions open. |
| `callback_too_many_arguments` / `callback_too_many_results` | Above the 29-value budget. |
| `callback_payload_too_large` | Over 48 KiB once encoded. |
| `callback_arguments_not_serializable` / `callback_results_not_serializable` | A value the envelope cannot carry. |
| `callback_failed` | The handler failed and gave no text. |
| `network_unavailable` | No session; nothing to ask. |
| `callback_send_failed`, or the transport's own reason (`network_event_queue_full`, …) | The frame could not be handed to the transport. |
| `resource_preparing` / `resource_stopping` | Called before start-up finished, or after stop began. |
| `promise_cancelled` | The promise was released, or its resource stopped. |
| `await_requires_scheduler_coroutine` | `await` outside a `CreateThread`. |
| `reserved_callback_event` | Resource code tried to emit a `open77:callback:*` frame. |

A handler that raises rejects the promise with **the error text**, and logs the
failure on the handler's own side — the asker learns that it failed, the owner
learns why.

## Reserved frames

The transport owns two event names:

```text
open77:callback:req    the question
open77:callback:res    the answer
```

Resource code cannot emit them. `TriggerServerEvent`, `Open77.net.emitServer`,
`TriggerClientEvent` and `Open77.net.emitClient` all refuse the
`open77:callback:` prefix with `reserved_callback_event`, and the host consumes
the frames before any Lua network handler is considered. Without that, any
resource could forge an answer to another resource's pending question, or
invent a question the server never asked. Use the API.

Unlike an ordinary client event, a callback frame is **not broadcast to every
resource**: it names the resource it is addressed to and goes only there.

## A worked example: a shop

`resources/shop/open77.lua`

```lua
resource 'shop'
version '1.0.0'
client_script 'client.lua'
server_script 'server.lua'
permissions { 'network.events' }
```

`resources/shop/server.lua`

```lua
local kCounter  = { x = -1580.0, y = -1290.0, z = 8.0 }
local kCatalog  = { medkit = 250, ammo_pistol = 40 }
local stock     = { medkit = 12, ammo_pistol = 400 }

local function atTheCounter(playerId)
    local at = Open77.players.position(playerId)
    if not at then return false end
    local dx, dy, dz = at.x - kCounter.x, at.y - kCounter.y, at.z - kCounter.z
    return (dx * dx + dy * dy + dz * dz) <= 16.0
end

-- A read. Still validated: a client can ask from anywhere, at any rate.
Open77.net.register('catalog', function(source)
    if not atTheCounter(source) then return nil, 'too_far' end
    local rows = {}
    for item, price in pairs(kCatalog) do
        rows[#rows + 1] = { item = item, price = price, stock = stock[item] or 0 }
    end
    return rows
end)

-- A write. Every precondition is re-checked here, on the server, at the moment
-- of the write -- not in the client that asked, and not in the earlier read.
Open77.net.register('buy', function(source, item, count)
    if type(item) ~= 'string' or kCatalog[item] == nil then return nil, 'unknown_item' end
    if type(count) ~= 'number' or count ~= math.floor(count)
       or count < 1 or count > 10 then return nil, 'invalid_count' end
    if not atTheCounter(source) then return nil, 'too_far' end
    if (stock[item] or 0) < count then return nil, 'out_of_stock' end

    local cost = kCatalog[item] * count
    -- Confirm with the player before taking their money. 30 s, because a human
    -- is reading a dialog; the promise rejects on its own if they wander off.
    local accepted = Open77.net.callClientAwait(source, { name = 'confirm', timeout = 30000 },
                                                item, count, cost)
    if accepted ~= true then return nil, 'cancelled' end

    -- Re-check after the yield: thirty seconds is a long time in a game world.
    if not atTheCounter(source) or (stock[item] or 0) < count then return nil, 'too_far' end
    stock[item] = stock[item] - count
    return count, cost
end)
```

`resources/shop/client.lua`

```lua
-- `confirmDialog` is this resource's own UI; returning false cancels the buy.
Open77.net.register('confirm', function(item, count, cost)
    return confirmDialog(('Buy %d %s for %d?'):format(count, item, cost))
end)

-- A client resource may RegisterCommand of its own since A8, but a key mapping
-- stays the usual trigger for something with no arguments.
RegisterKeyMapping('shop', 'Open the shop', 'F6', function()
    CreateThread(function()
        local rows, reason = Open77.net.callAwait({ name = 'catalog', timeout = 5000 })
        if not rows then Open77.log.warn('shop: ' .. tostring(reason)) return end
        for _, row in ipairs(rows) do
            print(('%-14s %5d eddies  (%d left)'):format(row.item, row.price, row.stock))
        end

        local bought, cost = Open77.net.callAwait('buy', 'medkit', 2)
        if not bought then
            Open77.log.warn('purchase refused: ' .. tostring(cost))
            return
        end
        print(('bought %d for %d'):format(bought, cost))
    end)
end)
```

Note what the server does **not** do: it never trusts the price the client read
a moment ago, never trusts that the client is still at the counter after the
confirmation dialog, and never trusts `count` because the earlier `catalog`
call said the stock was there. A callback makes the round trip convenient; it
changes nothing about who decides.

## Out of scope

- **Broadcast callbacks.** `Open77.net.callClient(-1, ...)` is refused with
  `callback_broadcast_unsupported`. N answers do not fit one promise, and a
  resource that genuinely wants every client's answer can loop over
  `Open77.players.all()` and collect the promises itself.
- **Client-to-client callbacks.** There is no peer transport; route through the
  server, which has to validate anyway.
- **Callbacks between two server resources.** That is
  [`Open77.exports.call`](server-exports.md), which is in-process and does not
  touch the network.
- **Bundled/system client resources.** Callbacks live in the server-resource
  host, the layer downloaded resources run in.

## See also

- [Cross-resource server exports](server-exports.md) — the same promise type,
  between two server resources.
- [Complete server Lua API](server-api.md) — every server global and
  `Open77.*` method.
- [Connection control](connection-control.md) — `source`, identity and the
  connect gate.
