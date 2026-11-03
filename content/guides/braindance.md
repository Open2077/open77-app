# Braindance

`open77_braindance` brings the game's braindance to your scripts, in two parts:

- **The launch sequence.** The white-out flash with chromatic aberration and its sound, the dive
  to black, then either the braindance look (first person, cyan shimmer) or a plain return to the
  world. Every phase raises an event. While the screen is **black**, your script can do anything
  the player must not see: teleport them, change their bucket, spawn a set, change the weather.
- **The vision layers.** The braindance editor's **VISUAL**, **THERMAL** and **AUDIO** layers on
  the live world, with a heatmap that paints every body around the player through walls.

Everything on screen comes from the game's own render: the effects authored on the player entity,
the native screen fade, the engine's focus vision mode and its highlight. The resource draws **no
interface**. Your resource draws its own (layer name, timeline, key hints) from the exports and
events below.

## Requirements

- The resource ships with the server under `resources/system/open77_braindance`, with
  `auto_start false`.
- The launch sequence works on any 2.5 client.
- The vision layers need a client newer than Stable 182, which has `Open77.braindance`. On an older
  client, `setLayer` answers `nil` with a reason and nothing changes on screen.

## Setup

Add the resource to the server's load list, then start it:

```jsonc
// server.jsonc
"resources": { "load": [ /* ... */ "open77_braindance" ] }
```

```
ensure open77_braindance
```

Your own resource declares the dependency:

```lua
dependency "open77_braindance >=1.1.0"
```

You need no permission to call its exports. The permissions it uses belong to `open77_braindance`
itself: `world.effects`, `screen.effects`, `screen.read`, `input.actions`, `ui.vanilla.hud`,
`perspective.policy` and `players.teleport`.

## Quick start

### Braindance transition to another place (server)

The screen goes white, then black. The resource moves the player while the screen is black, waits
for the body to settle and for the world to load, then brings the image back.

```lua
local id, reason = exports.open77_braindance:start(playerId, {
    preset = "transition",
    teleport = { x = 1611.07, y = -775.44, z = 49.98, heading = 90, bucket = 4 },
})
if not id then print("braindance refused: " .. reason) end
```

### Your own work while the screen is black (server)

```lua
local mine = {}

RegisterCommand("enterbd", function(source)
    local id = exports.open77_braindance:start(source, { preset = "braindance", hold = true, tag = "bd-room" })
    if id then mine[id] = true end
end)

AddEventHandler("open77_braindance:black", function(playerId, id, tag)
    if not mine[id] then return end
    CreateThread(function()
        -- Invisible work: spawn the scene, move the player, change the bucket...
        Open77.players.teleport(playerId, { x = 100.0, y = 200.0, z = 30.0 }, { fade = false }):await()
        exports.open77_braindance:resume(playerId, id) -- the image comes back
    end)
end)

-- Later: leave the braindance (exit flash, black, back to the player's view).
exports.open77_braindance:exit(playerId, id, { teleport = { x = -628.41, y = -389.95, z = 8.19 } })
```

### From a client script

```lua
local id = exports.open77_braindance:start({ preset = "glitch", hold = true })

AddEventHandler("open77_braindance:black", function(sequenceId)
    if sequenceId ~= id then return end
    -- Local work, then:
    exports.open77_braindance:resume(sequenceId)
end)
```

### Thermal layer (client)

```lua
exports.open77_braindance:setLayer("thermal")
exports.open77_braindance:setHeat({ npcId = suspect }, "clue") -- one body in its own colour
-- ...
exports.open77_braindance:setLayer("off")
```

## The launch sequence

### Phases

```
start ─► flash ─► darkening ─► black ─(hold / resume)─► revealing ─► active ─► exiting ─► … ─► finished
                                                                  └─► finished   (presets without overlay)
```

| Phase | What the player sees | What you can do |
| --- | --- | --- |
| `flash` | The launch effect: white-out, chromatic aberration, its sound. Movement is locked, the HUD and resource interfaces are hidden. | Play a sound, prepare. |
| `darkening` | The native fade to black. | |
| `black` | A black screen. | Anything invisible. With `hold = true` the screen stays black until `resume`, bounded by `maxHoldMs`. |
| `revealing` | The image returns with the reveal effects. | |
| `active` | The braindance look (presets with `overlay` only). Controls and HUD are back. | The player is "in the braindance" until `exit`. |
| `exiting` | The exit glitch, then `darkening`, `black` and `revealing` again on the way out. | The same as on the way in: `exit({ hold = true })` or `exit({ teleport = ... })`. |
| `finished` / `cancelled` | The normal view; controls, HUD and camera restored. | |

While the screen is black, the sequence also waits for the game's own loading cycle to end (a far
teleport opens one), then `loadingSettleMs`, so the image never comes back on a half-streamed world.
A loading state that stops changing for 6 seconds counts as over, and `maxLoadingWaitMs` bounds the
wait.

### Presets

| Preset | Flash | Hold | Reveal | Overlay |
| --- | --- | --- | --- | --- |
| `braindance` (default) | `braindance_entering`, 2.6 s | 1.2 s | `braindance_fpp` + `braindance_sound_vision_mode`, first person | Yes, until `exit` |
| `transition` | `braindance_entering`, 2.6 s | 1.2 s | `eyes_opening_05s` | No |
| `glitch` | `transition_glitch_loop_braindance`, 0.5 s | 0.4 s | `time_skip_glitch` | No |

### Options

Every preset field can be overridden. Times are integer milliseconds.

| Key | Default | Range and meaning |
| --- | --- | --- |
| `preset` | `"braindance"` | `braindance`, `transition` or `glitch`. |
| `hold` | `false` | Stay black until `resume`. |
| `maxHoldMs` | 20000 | 1000 to 60000. A forgotten `resume` still gives the image back. |
| `flash` | `true` | `false` skips the flash and goes straight to black. |
| `flashEffect` | Per preset | Any player effect name (see [Effects](#effects)). |
| `flashMs` | Per preset | 0 to 10000: how long the flash plays before the fade starts. |
| `fadeOutMs` / `holdMs` / `fadeInMs` | Per preset | 0 to 5000 / 0 to 30000 / 0 to 5000. |
| `revealEffects` | Per preset | Up to 4 effect names started at the reveal. |
| `overlay` | Per preset | Keep the reveal effects and enter `active` until `exit`. |
| `firstPerson` | `true` on `braindance` | Switch to first person while black; restore the player's view on exit. |
| `exitEffect`, `exitFlashMs`, `exitFadeOutMs`, `exitHoldMs`, `exitFadeInMs`, `exitRevealEffects` | Per preset | The same settings for the way out. |
| `holdOnExit` | `false` | Stay black on the way out until `resume`. |
| `lockMovement` | `true` | Block movement during the flash, the black screen and the reveal. |
| `hideHud` | `true` | Hide the HUD and every resource interface (cinematic claim) during the transition. |
| `letterbox` | 0.01 | 0.01 to 0.4: cinematic bar height while hidden (0.01 is barely visible). |
| `color` | Black | `{ r, g, b }` of the native fade. |
| `sounds` | None | `{ [phase] = "wwise_event" }`, played with `Open77.sfx.play2d` when the phase starts. |
| `waitForLoading` | `true` | Stay black while the game's loading cycle runs. |
| `maxLoadingWaitMs` / `loadingSettleMs` | 20000 / 500 | 0 to 60000 / 0 to 5000. |
| `tag` | None | Up to 64 characters, echoed in every server event. |
| `teleport` | None | **Server only.** `{ x, y, z, heading?, bucket? }`: the player is moved on black, then the sequence resumes. |
| `exitTeleport` | None | **Server only.** The same on the exit black. |

Unknown keys and out-of-range values are refused with `unknown_option:<key>` or `invalid_<key>`.

### Server exports

| Export | Returns |
| --- | --- |
| `start(playerId, options)` | `id` (`"s<n>"`), or `nil, reason` |
| `resume(playerId, id)` | `true`, or `false, "not_found"` |
| `exit(playerId, id, options?)` | `true`, or `false, reason`. Options: `hold`, `teleport`. |
| `cancel(playerId, id)` | `true`, or `false, "not_found"`. Image, controls and camera come back at once. |
| `state(playerId)` | `{ { id, phase, leg, tag, server }, ... }` |
| `playEffect(playerId, name, durationMs?)` | `true`, or `false, reason`. One effect, outside any sequence. |
| `stopEffects(playerId)` | `true` |

A player has at most two live sequences (`too_many_sequences`).

Server events (`AddEventHandler`), for sequences started by the server **and** by the client:

| Event | Arguments |
| --- | --- |
| `open77_braindance:phase` | `playerId, id, phase, tag` |
| `open77_braindance:black` | `playerId, id, tag` |

Client-started ids look like `c<n>`, and a client cannot forge a server id. Phase reports are
informative: never grant anything because a client said its screen was black.

### Client exports

| Export | Returns |
| --- | --- |
| `start(options)` | `id` (`"c<n>"`), or `nil, reason` |
| `resume(id)` / `exit(id, options?)` / `cancel(id)` | `true`, or `false, reason` |
| `state(id)` | `{ id, phase, leg, preset, tag, hold, overlay, done }` |
| `active()` | Every live sequence on this client. |
| `effects()` | `{ { name, description }, ... }`: the screen effects this resource knows. |
| `presets()` | The preset table. |
| `playEffect(name, durationMs?)` / `stopEffect(handle)` | An `Open77.vfx` handle. |

Local events: `open77_braindance:phase (id, phase, info)` and `open77_braindance:black (id, info)`.

### Effects

`effects()` lists the full-screen effects authored on the player that work with this resource:
`braindance_entering`, `braindance_fpp`, `braindance_sound_vision_mode`,
`transition_glitch_loop_braindance`, `time_skip_glitch(_long)`, `fast_travel_glitch(_long)`,
`cyberspace_teleport`, `reboot_glitch`, `personal_link_glitch`, `hacking_glitch_low/medium/heavy`,
`johnny_took_control`, `johnny_gave_back_control`, `blackout(_organic)`, `eyes_closing(_fast)`,
`eyes_opening(_05s)`, `blink_fast/slow`, `zoom` and `fish_eye`. Any other effect authored on the
player template also plays; an unknown name plays nothing.

## Vision layers

| Layer | What the player sees |
| --- | --- |
| `visual` | The braindance shimmer on the camera. |
| `thermal` | The world in the engine's focus vision mode (dark and cold), and every body in range outlined through walls: NPCs in red, players in yellow. |
| `audio` | The braindance shimmer, and every body in range outlined in green. |
| `off` | Back to normal. |

The layers are independent of the launch sequence: turn one on at any time, for example in the
`active` phase of a `braindance` sequence.

### Client exports

| Export | Returns |
| --- | --- |
| `setLayer(layer, options?)` | `true`, or `nil, reason` |
| `layer()` | The current layer name. |
| `layers()` | `{ "visual", "thermal", "audio" }` |
| `nextLayer(options?)` | Switches to the next layer, in that order. |
| `setHeat(target, level)` | `true`, or `nil, reason` |
| `clearHeat()` | `true`: drops every level set through this resource. |
| `heatmap()` | The state of the native heatmap (see [Open77.braindance](#open77braindance)). |

`setLayer` options:

| Option | Meaning |
| --- | --- |
| `heat` | Heatmap options laid over the layer's defaults (see [Open77.braindance](#open77braindance)). For example `{ radius = 30, colors = { npc = "netrunner" } }`. |
| `effect` | `false`: no camera shimmer. |

Local event: `open77_braindance:layer (layer, previous)`. Use it to show your own layer indicator.

### Server exports

| Export | Returns |
| --- | --- |
| `setLayer(playerId, layer, options?)` | `true`, or `false, reason` |
| `setHeat(playerId, target, level)` | `true`, or `false, reason`. The target is `{ playerId }` or `{ npcId }`. |
| `clearHeat(playerId)` | `true` |
| `layer(playerId)` | The last layer that client reported, or `"off"`. |

Server event: `open77_braindance:layerChanged (playerId, layer, previous, reason?)`. `reason` is set
when the client refused the layer.

```lua
-- Server: a suspect glows as a clue for one investigator.
exports.open77_braindance:setLayer(investigator, "thermal", { heat = { radius = 40 } })
exports.open77_braindance:setHeat(investigator, { playerId = suspect }, "clue")

AddEventHandler("open77_braindance:layerChanged", function(playerId, layer, previous, reason)
    if reason then print(("layer %s refused for %d: %s"):format(layer, playerId, reason)) end
end)
```

### Heat targets and levels

A target is a receiver-local entity integer, `{ engineEntity }`, `{ playerId }` or `{ npcId }`.

| Level | Colour |
| --- | --- |
| `auto` | Follows the body's kind: `npc`, `player` or `vehicle` colour. |
| `none` | Never painted. |
| `cool` / `warm` / `hot` | The `cool`, `warm` and `hot` colours. |
| `clue` | The `clue` colour. |

A body with an explicit level stays painted up to twice the radius.

## Open77.braindance

The layers are built on a native client API that any resource can call directly with the
`world.effects` permission.

```lua
local ok, reason = Open77.braindance.setHeatmap(true, {
    radius = 60,             -- metres, 1 to 250
    seeThroughWalls = true,
    npcs = true, players = true, vehicles = false,
    focusWorld = true,       -- the world in the engine's focus vision mode while on
    opacity = 1,             -- 0 to 1
    maxTargets = 96,         -- nearest first, 1 to 256
    colors = { npc = "hostile", player = "quest", vehicle = "neutral",
               cool = "neutral", warm = "quest", hot = "hostile", clue = "clue" },
})
Open77.braindance.setHeat(entity, "hot")     -- or { engineEntity = n }
Open77.braindance.clearHeat()                -- every level this resource set
local state = Open77.braindance.heatmap()
Open77.braindance.setHeatmap(false)
```

| Function | Returns |
| --- | --- |
| `setHeatmap(enabled, options?)` | `true`, or `nil, reason` |
| `setHeat(target, level)` | `true`, or `nil, reason` |
| `clearHeat()` | `true` |
| `heatmap()` | `{ enabled, mine, owner?, painted, candidates, levels, lastError?, radius, opacity, seeThroughWalls, npcs, players, vehicles, focusWorld, maxTargets, colors }` |
| `palette()` | The 14 colour names, in index order 0 to 13. |
| `levels()` | `{ "auto", "none", "cool", "warm", "hot", "clue" }` |

`palette()` and `levels()` need no permission.

**Colours** are the engine's highlight palette, by name or by index 0 to 13: `hostile`, `friendly`,
`neutral`, `item`, `interaction`, `important`, `quest`, `clue`, `distraction`, `aoe`, `hackable`,
`weakspot`, `netrunner`, `backdoor`. Each name draws the fill and outline the game itself uses for
that highlight type.

**Ownership.** One resource owns the heatmap at a time: the last one to turn it on. Only the owner
can turn it off (`heatmap_owned:<name>`). When the owner stops, every body it painted is cleared and
the world leaves focus vision mode. Levels belong to the resource that set them.

**Updates.** The heatmap scans around the player five times a second. It paints the nearest bodies
first, repaints the ones already lit every second and clears the ones that leave the selection.
Remote players count as players, not NPCs.

**Errors.** `invalid_enabled`, `invalid_options`, `unknown_option:<key>`, `invalid_<key>`,
`invalid_color:<key>`, `unknown_color:<key>`, `invalid_entity`, `unknown_entity`, `invalid_level`,
`heatmap_owned:<name>` and `permission_denied:world.effects`.

## Console

Server console:

```
braindance <playerId> <braindance|transition|glitch> [hold | x y z [heading]]
braindance <playerId> <exit|resume|cancel> [id]
braindance <playerId> effect <name|stop> [durationMs]
bdlayer <playerId> <off|visual|thermal|audio>
bdlayer <playerId> heat <targetPlayerId> <level>
```

Client console:

```
bd <braindance|transition|glitch|exit|resume|cancel> [id|hold]
bdlayer <off|visual|thermal|audio|next> [noeffect]
```

## Example resource

`resources/examples/open77_braindance_example` shows both sides:

- `bdexample <playerId> server` runs a server-driven sequence: hold on black, do the work, resume.
- `bdexample <playerId> client` runs the same from a client script.
- **B** (rebindable) starts the client-driven glitch transition.
- **N** (rebindable) walks the layers: visual, thermal, audio, off.

## Limits

- The look is made of the game's own pieces, not the vanilla braindance editor. There is no rewind,
  and clue scanning is yours to script with `setHeat(target, "clue")`. The exact colour grading of
  the editor's thermal layer only exists inside a rewindable quest scene.
- The heatmap uses the same highlight as the scanner. Opening the scanner while a layer is on mixes
  both, and closing it puts the world back in normal vision until the layer is set again.
- A server `stop` of an unchanged resource does not stop its client instance; the heatmap is
  released when the client instance stops or reloads.
- `firstPerson` takes a resource lock on the perspective. A server perspective policy that forbids
  first person wins.
