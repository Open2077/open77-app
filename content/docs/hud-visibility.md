# Vanilla HUD visibility

Use `Open77.hud` to hide selected native HUD modules and replace them with resource-owned interfaces. Client resources require `ui.vanilla.hud`:

```lua
permissions { "ui.vanilla.hud" }
```

This is a client-only presentation API. It does not grant a server resource direct access to a
player's HUD; a server gamemode should send an event to its client resource and let that resource
own the visibility claim.

## Cinematic display

For a clean cinematic view including resource WebUIs, watermark, world labels
and letterbox bars, use **`Open77.hud.setCinematic(true[, height])`**, then
`Open77.hud.setCinematic(false)` to release your resource's claim. This requires
the same `ui.vanilla.hud` permission. See [cinematic display](third-person-camera.md#cinematic-display)
for ranges, ownership, cleanup and the deliberate focused-menu exception.
Freeroam exposes this as `/cinematic [on|off]`.

## Multiplayer defaults

During an authenticated Open77 session, the platform automatically removes solo-game input hints,
the phone/radio/quick-slot cluster, and the lower-right standing/crouching silhouette. Those fixed
multiplayer restrictions are separate from `Open77.hud` and are restored when the multiplayer
policy ends.

`Open77.hud` controls the remaining optional modules that a resource may replace with its own UI.

Three of those fixed restrictions overlap with a component name — the quick-slot cluster is
`hubMenu`, the phone row is `phone`, and the scanner is `scanner`. During a multiplayer session
the platform hides all three whether or not a resource claims them, and releasing your claim will
not bring them back until the session ends. Outside multiplayer, the claim is the only thing
hiding them.

`state()` and `isVisible()` report **claims**, not what is on screen: they answer "does any
resource hide this", and they do not know about the multiplayer policy. A component can therefore
read `true` while the session keeps it off the screen.

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
| `questTracker` | The tracked-objective panel and its yellow GPS route |
| `phone` | The standalone phone/messages HUD row |
| `scanner` | The scan overlay **and scanner activation** — see the note below |
| `vanillaNotifications` | Cyberpunk's own side-popup notification stack |
| `crosshair` | Every weapon crosshair, including the melee and cyberware variants |
| `hubMenu` | The bottom-left quick-slot / D-pad hub cluster |

Component names are matched case-insensitively, so `questTracker` and `questtracker` are the same
component. These aliases are also accepted by `setVisible` and `isVisible`:

| Alias | Component |
|---|---|
| `map`, `radar` | `minimap` |
| `time` | `clock` |
| `hp` | `health` |
| `ammo`, `weapons`, `weaponAmmo` | `weapon` |
| `speed` | `speedometer` |
| `quest`, `tracker`, `objectives` | `questTracker` |
| `vision`, `visionMode` | `scanner` |
| `notifications`, `notification`, `toasts` | `vanillaNotifications` |
| `reticle`, `reticule` | `crosshair` |
| `hub` | `hubMenu` |

Snapshots always use the canonical names above.

### `all`

`all` is a **selector**, not a component: it claims or releases every component at once for the
calling resource. It never appears in `components()` or in a `state()` snapshot, because there is
no widget called "all".

```lua
Open77.hud.setVisible("all", false)   -- this resource now hides every component
Open77.hud.setVisible("all", true)    -- and releases every claim it holds
```

`isVisible("all")` answers `true` only when **every** component is visible. A `false` there means
at least one component is hidden by someone — not necessarily by you.

### Two components that do more than hide a widget

`scanner` is the one claim that also refuses an input. Hiding only the overlay would leave an
invisible scanner still holding aim snap and the movement restriction — a player walking slowly
with no UI explaining why. So the claim hides the scan overlay **and** refuses scanner activation,
exactly as the multiplayer policy does. If you want to refuse the input without hiding anything,
use the `Scanner` entry of `Open77.actions` instead.

`vanillaNotifications` is the same stack [`Open77.hud.notify`](#vanilla-toasts) writes to. A
resource that hides this component is hiding its own vanilla toasts too.

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

## Vanilla toasts

The same table also writes to Cyberpunk's own notification pipelines. These look native in a way a
web toast never will, and they cost nothing: no browser surface, no resource dependency.

```lua
Open77.hud.notify(text [, options])   -- vanilla side popup
Open77.hud.log(text)                  -- a line in the activity log
Open77.hud.menu(preset)               -- a vanilla menu notification
Open77.hud.clearNotify([channel])     -- "ingame" (default) or "menu"
```

They need the same `ui.vanilla.hud` permission as the visibility calls, return `true` on success,
and `false, reason` on failure.

### What works, and what does not

| Call | Pipeline | Status on 2.31 |
|---|---|---|
| `notify(text)` | `UIInGameNotificationEvent` — the side popup | **Works.** Confirmed on screen. |
| `log(text)` | `gameActivityLogSystem.AddLog` | **Works.** Confirmed on screen. |
| `menu(preset)` | `UIMenuNotificationEvent` | **Works**, but only while the menu layer that owns the queue is mounted. |
| `help(text, ms)` | `MPDisplayOnscreenMessage` | **Unsupported.** Refused with `unsupported_channel`. |
| `subtitle(text, ms)` | `MPDisplayNarrationEventEntry` | **Unsupported.** Refused with `unsupported_channel`. |

`help` and `subtitle` are bound, validate their arguments, and then stop at the facade. They are not
missing by omission: the globals behind them are Cyberpunk's dormant multiplayer (CPO) HUD, which
assumes a context the single-player build never mounts. Calling `MPDisplayOnscreenMessage` closed
the process with an access violation reading `0x0` (crash report
`Cyberpunk2077-20260804-173018-14844-21448`), and the two neighbouring globals from the same group
are not invoked on principle. The names stay bound so a resource written against them keeps working
the day the channel is real; until then, use `notify` and expect `false, "unsupported_channel"` from
the other two.

### The in-game popup

`notify` queues a five-second side popup. The duration is the engine's and cannot be changed — that
is why `notify` takes no `ms` argument while `help` does.

```lua
local ok, reason = Open77.hud.notify("BOUNTY CLAIMED")
if not ok then print(reason) end

-- Replace what is on screen instead of queueing behind it.
Open77.hud.notify("ARREST WARRANT", { replace = true })

-- Borrow a vanilla preset's styling. With a preset, the text is optional.
Open77.hud.notify(nil, { preset = "combat_blocked" })
```

`options.preset` accepts `generic` (the default), `action_blocked`, `combat_blocked`,
`cant_save_action`, `cant_save_combat`, `cant_save_quest`, `cant_save_death`, `save_slots_full`,
`save_space_full`, `photo_mode_disabled`, `sandevistan_in_call` and `expansion_installed`.

`menu(preset)` accepts `vendor_not_enough_money`, `not_enough_money`, `inventory_action_blocked`,
`crafting_not_enough_materials`, `upgrade_level_too_low`, `no_perk_points`, `perks_locked`,
`perks_max_level`, `no_attribute_points`, `in_combat`, `in_combat_explicit`, `crafting_quickhack`,
`crafting_ammo_cap`, `player_level_too_low`, `inventory_full`, `face_unequip_blocked`,
`tutorial_unequip_blocked` and `no_junk`. A menu preset carries its own localized title, so it takes
no text. Two vanilla presets are deliberately absent: one needs a real gameplay payload, the other
renders no title at all on 2.31.

There is one vanilla slot per channel. `clearNotify` empties it whoever filled it, and hiding the
`vanillaNotifications` component hides the whole stack — including your own toasts.

### Which toast to reach for

| You want | Use |
|---|---|
| A toast that looks like the game's own | `Open77.hud.notify` |
| A toast you control — colour, icon, duration, stacking, dismissal | [`open77_notifications`](notifications.md) |

`Open77.hud.notify` is free and native-looking but takes the engine's styling and its five seconds.
`open77_notifications` is a WebUI service with its own definition format, updates and dismissal, at
the cost of a resource dependency and a browser surface.

Refusals: `permission_denied:ui.vanilla.hud`, `invalid_notification_text`,
`invalid_notification_preset`, `invalid_notification_duration`, `invalid_notification_channel`,
`options_must_be_a_table`, `unsupported_channel`, plus the facade's own `wrong_thread`,
`world_unavailable`, `ui_system_unavailable`, `activity_log_unavailable` and `invocation_failed`.

## Debug commands

When the privileged `open77_debug` resource is loaded, an authorized player can test the policy
without client execution:

```text
/hud minimap hide
/hud crosshair hide
/hud all hide
/hud minimap show
/hud state
/hudtest hide
/hudtest show
```

Calls fail with `permission_denied:ui.vanilla.hud`, `invalid_hud_arguments`,
`invalid_hud_component`, or `hud_unavailable_on_this_host`. This API is presentation-only: it
does not modify health, stamina, ammunition, vehicle speed, or any replicated gameplay state.
