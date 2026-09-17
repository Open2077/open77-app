# Native screen transitions

Native screen transitions require client **2.31.13+op77.56** or later. They are client-local and do not require a matching server feature.

`Open77.screen` exposes Cyberpunk's **native quest fade manager** to client Lua.
It does not create a WebUI overlay, load a quest, apply a Relic status effect or
change network routing. This is a new client capability; on older clients first
check `Open77.screen` and `Open77.screen.catalog` exist, then inspect `catalog()`.

## Manifest and quick start

```lua
resource "transitions"
version "1.0.0"
client_script "client.lua"
permissions { "screen.effects" }
```

```lua
-- Fade to black, remain covered for 750 ms, then return to the game.
local id, reason = Open77.screen.transition("fade", {
    durationMs = 500,
    holdMs = 750,
    fadeInMs = 500,
})
if not id then print("Transition unavailable: " .. reason) end
```

All durations are **integer milliseconds**, not seconds. Unknown options, NaN,
infinity, numeric strings and values outside the documented ranges are rejected.

## API

All eight functions require `screen.effects`. They are client-local. A server
can drive a fade directly with [`Open77.players.fade`](#fading-a-player-from-the-server),
or ask a client resource to run a richer transition over an ordinary targeted
network event.

| Function | Result | Purpose |
| --- | --- | --- |
| `Open77.screen.fadeOut(options?)` | `id, promise` or `nil, reason` | Apply a native black/color fade and hold until this resource returns the image or the safety deadline expires. The promise settles when the screen is covered. |
| `Open77.screen.fadeIn(id, options?)` | `true, promise` or `false, reason` | Return the image for this resource's active transition. Options: `durationMs` only. Can reverse an outgoing fade. The promise settles when the image is back. |
| `Open77.screen.transition("fade", options?)` | `id, promise` or `nil, reason` | Run the complete fade/hold/return sequence. The promise settles when it has finished. |
| `Open77.screen.state(id)` | table or `nil, reason` | **Owner-scoped.** Read this resource generation's active or recent completed transition. |
| `Open77.screen.isFaded()` | `true`/`false` or `nil, reason` | **Unowned.** Is the screen covered right now, whoever covered it. |
| `Open77.screen.nativeState()` | table or `nil, reason` | **Unowned.** The engine's own fade state: `faded`, `fading`, `out`, `busy`, `ready`, `remainingMs`. |
| `Open77.screen.cancel(id)` | `true` or `false, reason` | Restore the image immediately, including during the return fade. |
| `Open77.screen.catalog()` | array or `nil, reason` | Read supported presets and whether their native backend is available on this executable. |

IDs are opaque strings. They are not player IDs or native pointers. A different
resource, another host or a reloaded generation cannot act on an old ID.

### Owned and unowned reads

`state(id)` is about **your transition**; `isFaded()` and `nativeState()` are
about **the screen**. The second pair is what a spawn or teleport flow needs:
the screen may already be black because another resource faded it, because the
server did, or because a quest or loading fade took it. Stacking a second fade
on top of that is how a player ends up watching two fades in a row.

```lua
if not Open77.screen.isFaded() then
    Open77.screen.fadeOut({durationMs = 400})
end
```

`nativeState().fading` separates *on its way to black* from *already black*, so
a caller that must not interrupt an incoming fade can wait instead of racing it.
Both return `nil, reason` rather than a confident `false` when the guarded
backend is unavailable: a wrong `false` here is exactly what stacks two fades.

### Options

| Key | Default | Range / availability |
| --- | --- | --- |
| `durationMs` | 500 | 0–10000; outgoing fade, or the return duration passed to `fadeIn`. Zero is an instant cut. |
| `holdMs` | 250 | 0–30000; `transition` only. Starts after the native outgoing fade completes. |
| `fadeInMs` | 500 | 0–10000; `transition` only. |
| `timeoutMs` | At least 15000 | 1000–60000; the entire transition's real-time safety deadline. Must exceed planned outgoing/hold/return time by at least 500 ms. If omitted it grows to fit the sequence plus 2000 ms. |
| `color` | `{r=0,g=0,b=0,a=255}` | Integer channels 0–255; alpha must be 255. Available on `fadeOut` and `transition`. Omitted channels keep their defaults. |

For example, `color={r=255,g=255,b=255}` selects the native white-tinted fade.
The engine controls its rendering: non-black colors can retain a blurred/tinted
scene rather than produce a flat, opaque RGB rectangle. Use black to conceal the
3D world, not a colored fade as an occlusion guarantee. Use flashes sparingly;
the API deliberately does not implement a repeating strobe preset.

## Awaiting a fade

`fadeOut`, `fadeIn` and `transition` return an ordinary
[`Open77.Promise`](resource-exports.md) as a **second** value, so a caller can
fade, act, and fade back without hand-rolling a timer. The first return value is
unchanged: `local id = Open77.screen.fadeOut(...)` still works exactly as before.

```lua
CreateThread(function()
    local id, covered = Open77.screen.fadeOut({durationMs = 400, timeoutMs = 8000})
    if not id then return print(covered) end -- failure is still nil, reason
    local state, reason = covered:await()
    if not state then return print("fade ended early: " .. reason) end
    -- The screen is black here, on the engine's own timing.
    doSomethingInvisible()
    Open77.screen.fadeIn(id, {durationMs = 400})
end)
```

The promise resolves with the same state table the event carries. It **rejects**
-- `nil, reason` from `:await()` -- if the transition ends any other way:
cancelled, timed out, a vanilla fade taking over, an error in this resource's
Lua, or the resource stopping. That is deliberate. A promise that could stay
pending forever would leave the coroutine that was going to call `fadeIn`
parked, and a fade nobody returns is indistinguishable from a crash to the
player looking at it.

`cancel` returns no promise: it is already terminal when it returns.

## Fading a player from the server

`Open77.players.fade(playerId, out, durationMs, options?)` covers or uncovers one
player's screen from server Lua. Permission: **`players.screen`**.

```lua
-- Bracket a move. Requires players.screen (and whatever moves the player).
Open77.players.fade(source, true, 400)
Open77.players.fadeOut(source, 400, {timeoutMs = 8000}) -- the same call, named
Open77.players.fadeIn(source, 400)
```

The relay frame is consumed by the client host itself, so **the target does not
need to run a client resource of its own** -- which is the point: a teleport or
a spawn should not require every server to ship a companion script. It drives
the same native quest fade `Open77.screen` uses, through the same arbitration:
if a client resource already owns a fade, the server's request is refused rather
than stealing it, and the resource's own `fadeIn`/`cancel` continue to work.

`options.timeoutMs` (1000-60000, default 15000) is a ceiling the **client**
enforces on real time, not a promise the server keeps. A server that fades a
player out and then drops the route, crashes or simply forgets still gives the
image back. There is deliberately no "fade out forever" spelling of this call.

The frame is reserved transport: a resource holding only `network.events` cannot
send it by name, and a peer cannot forge one for another player.

## Holding black during a server operation

Do not assume that receiving an ID means the screen is black. Wait for the
owner-scoped local event, request the server operation, then return the image
after the server acknowledges completion. Add `network.events` to the manifest
when using network events.

```lua
local transitionId

RegisterNetEvent("demo:prepareTransition", function()
    local reason
    transitionId, reason = Open77.screen.fadeOut({
        durationMs = 600,
        timeoutMs = 8000,
    })
    if not transitionId then print(reason) end
end)

AddEventHandler("open77:screen:black", function(state)
    if state.id ~= transitionId then return end
    TriggerServerEvent("demo:screenCovered")
end)

RegisterNetEvent("demo:operationComplete", function()
    if transitionId then
        Open77.screen.fadeIn(transitionId, {durationMs = 600})
    end
end)

local function ended(state)
    if state.id == transitionId then transitionId = nil end
end
AddEventHandler("open77:screen:finished", ended)
AddEventHandler("open77:screen:cancelled", ended)
AddEventHandler("open77:screen:failed", ended)
```

The server must validate the sender, the pending operation, destination and
permissions itself. A client's `screenCovered` message is **not authorization**
to teleport or change bucket. If the server never responds, the client safety
deadline restores the image. `fadeIn` does not extend that deadline.

## Events and state

Subscribe with `AddEventHandler`, not `RegisterNetEvent`:

| Event | Meaning |
| --- | --- |
| `open77:screen:covered` | Native outgoing fade has completed, including non-black colors. |
| `open77:screen:black` | Same boundary, only when all RGB channels are zero. |
| `open77:screen:finished` | Native return fade has completed. |
| `open77:screen:cancelled` | Requested cancellation, safety timeout, world loss or a vanilla transition taking over. |
| `open77:screen:failed` | A native operation/restoration failed. |

The event argument and `state(id)` share this shape:

```lua
{
    id = "12",
    generation = 1,
    phase = "covered", -- fading_out, covered, fading_in, finished, cancelled, failed
    reason = "",       -- completed, requested, timeout, native_interrupted, ...
    backend = "native_quest_fade",
    timing = "native_state",
    automatic = false,
    elapsedMs = 650,
    remainingMs = 0,   -- remaining native fade duration, not remaining hold time
    timeoutMs = 8000,
    black = true,
    color = {r=0,g=0,b=0,a=255},
}
```

Completion comes from the native manager's direction and remaining duration,
not an estimated Lua `Wait`. It is not a GPU presentation fence or proof that
world streaming has completed. Hold and safety deadlines use monotonic real
time; pause/time dilation cannot extend the safety deadline while the game
continues ticking. No in-process API can recover while the entire game thread
is hung or suspended.

Only the owner generation receives these events, and only the owner generation
can read `state(id)`. That is *event* and *transition* scoping, not secrecy
about the screen: `isFaded()` and `nativeState()` are unowned and report a fade
any resource, the server or the engine itself put up. Recent terminal states are
bounded to 64 entries globally; stopped resources lose their history. Errors in
a resource's Lua startup or coroutine, resource stop/reload, session teardown
and the safety deadline release its own fade. An intentional `pcall`-caught
Lua error is handled by your script; the safety deadline still applies.

## Arbitration and limits

- Only one Open77 transition can be active: another request returns
  `screen_busy`. That single slot is shared with the server relay, which is why
  `isFaded()` exists -- check it before adding a fade of your own.
- A fade/loading operation already owned by the game returns `native_screen_busy`.
- A new native game request takes priority. Open77 drops ownership and will not
  later clear that vanilla fade during cleanup.
- The backend is guarded for the verified Cyberpunk 2.31 executable. Unsupported
  native layouts fail closed with `screen_unavailable`; no raw pointer is exposed.
- These are the quest manager's native transitions, including its own native UI
  and input supervision. The API does not request a teleport, damage, audio
  effect, camera change or network operation. The native
  minimap disappears during black, but Open77's CEF health HUD, watermark and
  command hints remain visible. Hide your own WebUI explicitly if your transition
  needs that; this API does not take ownership of other resources' interfaces.
- The catalogue currently contains **`fade` only**. `glitch` returns
  `unsupported_screen_preset`: the loading-screen glitch has not yet been
  isolated safely. Existing GlitchBegone/Relic protections remain unchanged.

Common failures include `permission_denied:screen.effects`,
`screen_unavailable_on_this_host`, `screen_unavailable`, `screen_busy`,
`native_screen_busy`, `invalid_screen_option:<key>`, `invalid_screen_color`,
`screen_timeout_too_short`, `not_owner`, `transition_not_active`,
`transition_not_found` and `already_fading_in`.

A rejected promise carries the transition's own reason -- `requested`,
`timeout`, `native_interrupted`, `world_unavailable`, `restore_failed` -- or
`resource_error` / `resource_stopped` when the release came from this resource
failing or stopping. One reason is ours rather than the engine's:
`never_covered`, when a `fadeOut` promise's transition returned the image
without ever reaching black (the engine calls that `completed`, which would read
as success).

The server relay adds `permission_denied:players.screen` and
`reserved_screen_event`.

See also [visual/audio effects](effects.md), [native HUD visibility](hud-visibility.md)
and [native implementation research](../docs/research/screen-transitions-and-fades.md).
