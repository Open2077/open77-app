# Custom locomotion

Build walking and running styles from authored animations, then assign them to players with server Lua. Open77 blends the selected graph on remote player bodies and the local third-person body, including male and female puppets.

Use matching client and server **2.31.21+op77.145 or later** for the base APIs, including one-shot clip playback. The increased collection capacity requires **Stable 147 or later** (protocol **1.48** in Stable 147). You need an Open77 locomotion package containing its graph and compiled native assets. Animation packages are supplied by the resource author; choosing a style ID does not download a built-in animation bank.

## Build and install a package

1. Prepare animations for the supported male and female Cyberpunk player rigs using your animation authoring and export tools.
2. Create states, transition conditions and blends. Use a one-dimensional blend for speed or a two-dimensional blend for movement direction.
3. Preview the graph on both Cyberpunk puppets. Check idle, starting, stopping, turning, walking and running; tune stride timing as described below.
4. Choose **Export Open77** and copy the entire exported resource into the server's resource directory.
5. Enable the resource in the server configuration. Declare it as a dependency of the resource that assigns styles.
6. Connect through the launcher so it installs the preload archive before starting Cyberpunk.

An export has this structure; archive filenames depend on the package:

```text
open77_locomotion_my_walk/
  open77.lua
  register.lua
  package.json
  graph.locomotion.json
  dist/
    <exported-archive>.zip
```

The generated manifest declares the shared registration script, graph files, `preload_mod` archive and `locomotion.register` permission. Keep the metadata, graph and archive together as one export. Re-export after editing animations or the graph so their revision and native bindings remain consistent.

For a package exported with the resource name above, the manifest takes this form:

```lua
resource 'open77_locomotion_my_walk'
version '1.0.0'
shared_script 'register.lua'
files { 'package.json', 'graph.locomotion.json' }
permission 'locomotion.register'
preload_mod 'dist/my-walk.zip' -- Use the archive path from your export.
reload_policy 'reconnect'
```

The package metadata uses schema `open77.locomotion-package/1`, a style `id`, a 64-character lowercase hexadecimal `revision`, the graph path, `channelPrefix = "open77Locomotion"` and `sampleSlots = 8`. Its clip list binds IDs to compiled selectors, animation names and durations in seconds. Four native variants cover male/female bodies in native/mirror modes. Keep these generated bindings intact: editing a JSON name alone cannot create a playable animation.

**Adding or changing the native archive requires a game restart for clients already running.** Restarting the Lua resource alone cannot mount the new native assets. See [Mods and custom assets](mods.md) for preload distribution and [Server resources](server-resources.md) for configuration.

## Collections and menu selection

**Collections with large libraries require matching Stable 147 or later clients and servers.**


NCWE can group existing version 1 exports into one collection resource and one
preload ZIP. A collection retains every style's original ID, graph, native archive
and transitions. It groups delivery and registration while preserving the existing graph format.
Old standalone resources, `register`, `set` and `playClip` continue to work.

If your NCWE Studio version provides collection export, use its `animation_studio` MCP tool with `action="package"`, `op="bundle"`,
`id`, `name`, `packages` (saved package IDs/names or absolute exported resource
folders), and `path` (output directory). Repeat with another collection ID to
split a library into two deliveries. The generated folder contains:

```text
open77_locomotion_collection_walks_a/
  open77.lua
  catalogue.lua
  register.lua
  collection.json
  styles/relaxed/package.json
  styles/relaxed/graph.locomotion.json
  styles/alert/package.json
  styles/alert/graph.locomotion.json
  dist/walks_a.zip
```

The two shared scripts register each nested package on client and server and
expose `exports['open77_locomotion_collection_walks_a']:catalogue()`. It returns
`{id, name, styles}`; each style contains `id`, `name`, `kind`, `package`, and
`clips = {{id, name}, ...}`. The same catalogue is available in `collection.json`.

Stop the original resources for these IDs before loading the collection, including
any generated example controllers. Keep the original exports as backups. Configure
the collection in `resources.load` and enable `requiredMods.enabled`; clients must
restart after the launcher installs its archives. An existing export destination
is refused, so use a new delivery folder to prepare an update.

The menu/controller manifest declares its dependencies and permissions:

```lua
dependency 'open77_locomotion_collection_walks_a'
permissions { 'locomotion.control', 'locomotion.read' }
```

Example server command selecting a complete movement style:

```lua
RegisterCommand('walkstyle', function(playerId, args)
    -- Call cross-resource exports after startup, not at the top level.
    local catalogue = exports['open77_locomotion_collection_walks_a']:catalogue()
    for _, entry in ipairs(catalogue.styles) do
        if entry.kind == 'style' and entry.id == args[1] then
            local ok, reason = Open77.locomotion.set(playerId, entry.id)
            if not ok then print('Style selection refused: ' .. tostring(reason)) end
            return
        end
    end
end, false)
```

Build the menu from these entries and validate its submitted selection on the
server. `set` selects the whole style; its movement states transition automatically.
For `kind="clips"`, call `set` for that entry and then `playClip` for a declared
clip. `playClip` alone is not a way to select a walking style. One controller
resource should own all menu selections; another resource cannot override them.

Stable 147 and later allow up to **1,024 registered packages**, with the
limit shared by all resources and reload generations. Previously the client limit
was 64 and the server limit 256. Leave room for overlapping generations during
reload. Bundling does not remove each graph's existing clip/state/sample limits.

Changing package IDs retains the existing presentation-body switch behavior.
Collections preserve smooth transitions inside each style; they do not add
crossfades between separate graphs. Native files are copied unchanged and their hashes are checked. Check each selected
style on both body families and from a second player's view before using it on your server.

## Assign a style

The package's resource name and style ID are different. In this example, the resource is `open77_locomotion_my_walk` and the exported style ID is `my_walk`. Replace both with your own export's names.

```lua
-- open77.lua: the gameplay resource that selects player styles.
resource 'my_walk_controller'
server_script 'server.lua'
dependency 'open77_locomotion_my_walk'
permissions { 'locomotion.control', 'locomotion.read' }
```

```lua
-- server.lua: call from your validated gameplay handler after the player is ready.
local function applyWalkStyle(playerId)
    local ok, revisionOrReason = Open77.locomotion.set(playerId, 'my_walk', {
        durationMs = 60000,
        resetOnDeath = true,
    })
    if not ok then return nil, revisionOrReason end
    return revisionOrReason
end

local function readWalkStyle(playerId)
    local selected, reason = Open77.locomotion.get(playerId)
    if reason then return nil, reason end
    return selected -- nil means this player has no custom style assigned.
end

local function clearWalkStyle(playerId)
    return Open77.locomotion.reset(playerId)
end
```

The player must be authenticated, ready and alive when calling `set`. Validate the gameplay action on the server before assigning a style. Clients register package assets; they cannot assign or reset player styles.

## Lua API

| Call | Runtime | Permission | Success | Failure |
| --- | --- | --- | --- | --- |
| `Open77.locomotion.register(path)` | Client and server | `locomotion.register` | Style ID string | `nil, reason` |
| `Open77.locomotion.set(playerId, styleId, options?)` | Server | `locomotion.control` | `true, revision` | `false, reason` |
| `Open77.locomotion.get(playerId)` | Server | `locomotion.read` | Assignment table, or `nil` when none is assigned | `nil, reason` |
| `Open77.locomotion.reset(playerId)` | Server | `locomotion.control` | `true`, including when no assignment exists | `false, reason` |
| `Open77.locomotion.playClip(playerId, clipId, options?)` | Server | `locomotion.control` | `true, handle` | `false, reason` |
| `Open77.locomotion.stopClip(playerId, handle?, blendOutMs?)` | Server | `locomotion.control` | `true, revision` (`0` for a no-op) | `false, reason` |

### Registration

The exported `register.lua` runs on both runtimes:

```lua
local style, reason = Open77.locomotion.register('package.json')
assert(style, 'Locomotion package registration failed: ' .. tostring(reason))
```

Paths are relative to the registering resource. The server catalogs the package identity; the client validates the complete graph, clip selectors, durations, four native variants and mounted resources. Registration does not assign the style to anyone.

Style IDs are unique across resources. Generations of the same resource can register identical package content; conflicting content under the same revision is rejected by the client.

### Assignment options

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `durationMs` | Integer, `0..86400000` | `0` | Duration in milliseconds; `0` has no expiry. |
| `resetOnDeath` | Boolean | `false` | Remove the assignment when the player dies. |

Unknown options and incorrect types are rejected. Setting the same style, package revision and death policy again renews the duration while keeping the assignment revision and presentation body.

`get` returns `player`, `style`, `packageRevision`, `revision` and `resetOnDeath`, plus `remainingMs` when the assignment expires. `packageRevision` identifies the exported package; `revision` identifies the server assignment. This result describes server state, not successful rendering on every client.

### Ownership and change events

The resource generation that calls `set` owns the assignment. Another resource cannot replace or reset it. Stopping the assigning resource, disconnecting the player or removing the package's last registration releases the assignment. Death removes it when `resetOnDeath` is enabled.

Updates follow routing buckets. Clients joining the session receive the current selections, including their package and assignment revisions.

Listen for changes locally on the server:

```lua
AddEventHandler('onPlayerLocomotionChanged', function(playerId, style, packageRevision, revision, reason)
    print(('Player %s locomotion: %s (%s), revision %s'):format(
        tostring(playerId), style or 'native', reason, tostring(revision)))
end)
```

`style` is `nil` on reset. Reasons are `set`, `reset`, `expired`, `died`, `disconnected`, `resource_stopped` and `package_stopped`.

## Play a one-shot clip

The resource that owns the player's selected style can play a clip declared in that package. Use the **clip ID from `package.json`**, not a depot path or an arbitrary animation name. The player must be ready, alive and outside a vehicle.

```lua
-- Server: this same resource already called locomotion.set for the player.
local function playGreeting(playerId)
    local ok, handleOrReason = Open77.locomotion.playClip(playerId, 'wave', {
        speed = 1.0,
        blendInMs = 80,
        blendOutMs = 120,
    })
    if not ok then return nil, handleOrReason end
    return handleOrReason
end

-- Retain the returned handle only if this action may need cancellation.
local function cancelGreeting(playerId, handle)
    return Open77.locomotion.stopClip(playerId, handle, 120)
end
```

The example requires a package containing a clip named `wave`; it is not a built-in clip. Let it finish naturally, or pass its handle to `stopClip` when the action is cancelled.

| `playClip` option | Range | Default |
| --- | --- | --- |
| `speed` | Finite number `0.25..4`, quantized to `0.001` | `1.0` |
| `blendInMs` | Integer `0..2000` milliseconds | `80` |
| `blendOutMs` | Integer `0..2000` milliseconds | `120` |

`stopClip` uses a default blend-out of 120 ms. Omitting its handle stops the current clip; passing a handle from older playback returns `stale_clip_handle`, protecting a newer action from an old cancellation.

Playback is one-shot and uses the package's compiled graph. It does not apply native root motion or game animation events. The selected locomotion style remains assigned afterward, and replacing a clip does not respawn the presentation body. The authored graph determines the affected body region: a full-body graph also animates the legs during the action.

Observers joining or changing buckets receive elapsed playback time. Expired clips do not restart during synchronization, and duplicate or older commands cannot rewind the action. Native pose ownership, stale movement observations, death and vehicles suppress playback. Resource stop, package removal and disconnect release the selection and its action.

`get` reports the selected style, not clip progress or completion. Use the package's authored duration and your action's cancellation lifecycle; there is no clip-completion callback in this API.

## Graph inputs and native animation

The runtime supplies these parameters when they exist in the authored graph:

| Parameter | Type | Value |
| --- | --- | --- |
| `speed` | Float | Rendered planar speed, in metres per second. |
| `directionX` | Float | Lateral component of the unit movement direction. |
| `directionY` | Float | Forward component of the unit movement direction. |
| `grounded` | Boolean | Effective ground contact, including the native air driver's short contact bridge. |
| `crouched` | Boolean | Observed crouch state. |
| `sprinting` | Boolean | Observed sprint state. |
| `mounted` | Boolean | `false` while the custom layer is eligible. |

Direction uses the rendered body's heading. Extra parameters retain their authored defaults; package version 1 has no general Lua API for setting parameters or firing triggers.

The layer changes animation presentation. First-person camera motion, appearance, collision, movement speed and network movement keep their existing behavior. NPC model projections use their own graphs and take precedence over custom player locomotion.

Vehicles, workspots, airborne movement, traversal, swimming and combat suppress the custom layer. A graph's `native` state also returns control to the native pose. Observations older than 750 ms release the layer; drawing more frames does not refresh an old movement observation.

## Smooth transitions and stride timing

Give ordinary movement transitions a positive duration to use an eased crossfade. A zero-duration edge is an immediate cut. When a transition is interrupted, its complete outgoing mixture remains visible and its clips keep playing, preserving continuity through the next fade.

Speed and direction are damped for animation blending. State conditions still receive observed speed immediately, so starting and stopping need not wait for the blend filter. Returning from native animation fades the custom layer in over 0.20 seconds; an actual jump releases it immediately.

For looping clips, set these values in the authored graph:

| Field | Range | Default | Purpose |
| --- | --- | --- | --- |
| `cycles` | Integer `1..64` | `1` | Number of complete left/right strides in the recording. |
| `phaseOffset` | `0` inclusive to `1` exclusive | `0` | Shift the gait phase; `0.5` swaps the leading foot. |

Count the strides in each source recording, then align the leading foot between walk and run. Synchronized transitions preserve a shared cadence throughout the fade. Non-looping states play their full clip and ignore these two fields.

Tune transition durations for your clips and movement speeds. The runtime does not generate missing start/stop animations or foot locking, so crossfades alone cannot correct mismatched stride lengths or an unsuitable animation.

### Graph limits

| Element | Maximum |
| --- | --- |
| Parameters / clips / states | 64 / 128 / 128 |
| Transitions / conditions per transition | 512 / 16 |
| Points per blend | 32 |
| Clip samples per state / during a crossfade | 4 / 8 |

An interrupted transition waits if the outgoing mixture plus the new state would exceed eight samples. The 2D blend uses the four nearest points with normalized inverse-square distance weights.

## Errors and troubleshooting

| Result or symptom | Action |
| --- | --- |
| `permission_denied:locomotion.register`, `permission_denied:locomotion.control`, `permission_denied:locomotion.read` | Add the corresponding permission to the resource that makes the call. |
| `locomotion_package_unavailable` | Start the exported package and use its style ID, not its resource folder name. |
| `locomotion_archive_missing_restart_required` | Install the matching preload archive through the launcher, then restart the game. |
| `locomotion_owned_by_other_resource` | Let the resource owning the assignment reset it; use distinct style IDs for independently registered packages. |
| `player_unavailable`, `player_not_ready`, `player_not_alive` | Wait until the player is connected, ready and alive before assigning. |
| `invalid_argument`, `invalid_options`, `invalid_duration` | Check argument types, option names and duration bounds. |
| `invalid_package`, `invalid_package_json`, `invalid_graph_json` | Re-export and deploy the complete package; inspect the runtime log for the rejected asset. |
| `locomotion_package_limit` | Reduce registered packages; the server catalog allows 256 registrations. |
| `locomotion_not_selected` | Assign a package before playing or stopping one of its clips. |
| `clip_unavailable` | Use a clip ID declared in the selected package's matching revision. |
| `invalid_clip_options` | Check the clip ID, finite speed and blend ranges; invalid Lua types can also return `invalid_argument`. |
| `stale_clip_handle` | The requested playback has been replaced; do not cancel the newer action with an old handle. |
| `immutable_package_conflict` | Re-export changed content with a new revision and deploy all matching files. |
| Assignment exists but native locomotion remains | Check the client's registration result, installed archive and current pose owner; test outside vehicles, combat and other native interruptions. |

Keep the returned reason in logs; these are common failures, not an exhaustive list.

## Verify your animation in game

Check both male and female bodies, the local third-person view and a second client's view. Exercise idle-to-walk, walk-to-run, turns, stops, rapid transition reversals, jump/land, vehicles and workspots. Verify reset, resource stop and late join with the package installed. For one-shot clips, also check natural completion, cancellation, replacement and joining halfway through playback.

The [debug runtime](debug-runtime.md) self-view report exposes `customStyle`, `customState`, `customWeight`, `customTime`, `customSamples`, `customFrom`, `customMix` and `customBlend` (clip index, time and weight). Remote movement reports expose the corresponding evaluator state. These values help explain blending; inspect the rendered body as well.

The export process checks rigs, cooked graph/entity roundtrips and packed resources. An export receipt with `runtimeValidated=false` means rendering still needs to be checked in the running game.

For gestures, held items and stationary actions alongside movement, see [Role-play animations](rp-animations.md).
