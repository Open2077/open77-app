# Vanilla HUD visibility

Client resources can replace selected Cyberpunk 2077 HUD modules with custom WebUI through
`Open77.hud`. Declare the capability in the client resource manifest:

```lua
permissions { "ui.vanilla.hud" }
```

This is a client-only presentation API. It does not grant a server resource direct access to a
player's HUD; a server gamemode should send an event to its client resource and let that resource
own the visibility claim.

## Multiplayer defaults

During an authenticated Open77 session, the platform automatically removes solo-game input hints,
the phone/radio/quick-slot cluster, and the lower-right standing/crouching silhouette. Those fixed
multiplayer restrictions are separate from `Open77.hud` and are restored when the multiplayer
policy ends.

`Open77.hud` controls the remaining optional modules that a resource may replace with its own UI.

## Components

| Component | Vanilla UI controlled |
|---|---|
| `minimap` | Map panel, geometry, player marker, mappins, GPS lines, frame and location label |
| `compass` | Compass strip in the top-right map area |
| `clock` | Time display above the minimap |
| `health` | Player health, armor, memory and attached buff bar |
| `stamina` | Player stamina bar |
| `weapon` | Complete active-weapon presentation: loaded/reserve ammunition, weapon icon, and legacy charge/trigger indicator |
| `speedometer` | Digital and analog vehicle speed displays |

The aliases `map`, `time`, `hp`, `ammo`, `weapons`, `weaponAmmo`, and `speed` are accepted by
`setVisible` and `isVisible`. Snapshots always use the canonical names above.

## API

```lua
local ok, effectiveOrReason = Open77.hud.setVisible(component, visible)
local visible, reason = Open77.hud.isVisible(component)
local state, reason = Open77.hud.state()
local components, reason = Open77.hud.components()
```

`setVisible(component, false)` adds a hide claim owned by the calling resource. Passing `true`
releases that resource's claim; it does not override another resource that still hides the same
component. On success, the second result is the effective visibility after all claims are combined.

Every claim is released automatically when the owning resource stops or reloads. Static widgets
restore the state observed before the first hide; contextual health and stamina widgets ask their
vanilla controller to evaluate visibility again.

```lua
local ok, effective = Open77.hud.setVisible("health", false)
if not ok then
  error(effective)
end

-- Render the custom health WebUI here.

local state = assert(Open77.hud.state())
print(state.health) -- false

-- Optional: releasing explicitly avoids waiting for resource shutdown.
Open77.hud.setVisible("health", true)
```

## Replace the complete supported HUD

Use `components()` instead of copying the component list into a resource. This automatically picks
up future supported components:

```lua
local hidden = assert(Open77.hud.components())

for _, component in ipairs(hidden) do
    local ok, effectiveOrReason = Open77.hud.setVisible(component, false)
    assert(ok, effectiveOrReason)
end

-- Create and update the custom WebUI here.

local function restoreVanillaHud()
    for _, component in ipairs(hidden) do
        Open77.hud.setVisible(component, true)
    end
end
```

Explicit restoration is useful during a gamemode transition. Resource stop and reload remain the
final safety net, so a crashed UI resource cannot leave its claims behind.

## Multiple resources

Visibility is combined as an AND policy: a component is visible only when no resource currently
hides it. For example, if both a racing HUD and a cinematic resource hide `minimap`, releasing the
racing claim does not reveal the map until the cinematic resource releases its claim too.

```lua
local accepted, effective = Open77.hud.setVisible("minimap", true)
if accepted and not effective then
    print("another resource still hides the minimap")
end
```

The complete `minimap` component includes its geometry, player marker, mappins, GPS route, frame,
and location label. Hide `compass` or `clock` independently when those elements should remain.

## Debug commands

When the privileged `open77_debug` resource is loaded, an authorized player can test the policy
without client execution:

```text
/hud minimap hide
/hud minimap show
/hud state
/hudtest hide
/hudtest show
```

Calls fail with `permission_denied:ui.vanilla.hud`, `invalid_hud_arguments`,
`invalid_hud_component`, or `hud_unavailable_on_this_host`. This API is presentation-only: it
does not modify health, stamina, ammunition, vehicle speed, or any replicated gameplay state.
