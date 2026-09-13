# Native screen transitions

Introduced in client **2.31.13+op77.56** for Cyberpunk **2.31**. Network protocol
remains **1.24**; this client-local feature does not require a server update.

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

All six functions require `screen.effects`. They are client-local, not server
methods and not automatically replicated. A server uses ordinary targeted
network events to ask the relevant client resource to run a transition.

| Function | Result | Purpose |
| --- | --- | --- |
| `Open77.screen.fadeOut(options?)` | `id` or `nil, reason` | Apply a native black/color fade and hold until this resource returns the image or the safety deadline expires. |
| `Open77.screen.fadeIn(id, options?)` | `true` or `false, reason` | Return the image for this resource's active transition. Options: `durationMs` only. Can reverse an outgoing fade. |
| `Open77.screen.transition("fade", options?)` | `id` or `nil, reason` | Run the complete fade/hold/return sequence. |
| `Open77.screen.state(id)` | table or `nil, reason` | Read this resource generation's active or recent completed transition. |
| `Open77.screen.cancel(id)` | `true` or `false, reason` | Restore the image immediately, including during the return fade. |
| `Open77.screen.catalog()` | array or `nil, reason` | Read supported presets and whether their native backend is available on this executable. |

IDs are opaque strings. They are not player IDs or native pointers. A different
resource, another host or a reloaded generation cannot act on an old ID.

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

Only the owner generation receives these events. Recent terminal states are
bounded to 64 entries globally; stopped resources lose their history. Errors in
a resource's Lua startup or coroutine, resource stop/reload, session teardown
and the safety deadline release its own fade. An intentional `pcall`-caught
Lua error is handled by your script; the safety deadline still applies.

## Arbitration and limits

- Only one Open77 transition can be active: another request returns `screen_busy`.
- A fade/loading operation already owned by the game returns `native_screen_busy`.
- A new native game request takes priority. Open77 drops ownership and will not
  later clear that vanilla fade during cleanup.
- The backend is guarded for the verified Cyberpunk 2.31 executable. Unsupported
  native layouts fail closed with `screen_unavailable`; no raw pointer is exposed.
- These are the quest manager's native transitions, including its own native UI
  and input supervision. The API does not request a teleport, damage, audio
  effect, camera change or network operation. Live tests confirm that the native
  minimap disappears during black, but Open77's CEF health HUD, watermark and
  command hints remain visible. Hide your own WebUI explicitly if your transition
  needs that; this API does not take ownership of other resources' interfaces.
- The catalogue currently contains **`fade` only**. `glitch` returns
  `unsupported_screen_preset`: the loading-screen glitch has not yet been
  isolated safely. Existing GlitchBegone/Relic protections remain unchanged.

Common failures include `permission_denied:screen.effects`,
`screen_unavailable_on_this_host`, `invalid_screen_option:<key>`,
`invalid_screen_color`, `screen_timeout_too_short`, `not_owner`,
`transition_not_active`, `transition_not_found` and `already_fading_in`.

See also [visual/audio effects](effects.md), [native HUD visibility](hud-visibility.md)
and [native implementation research](../docs/research/screen-transitions-and-fades.md).
