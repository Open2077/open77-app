# Quickhacks (scanner and quickhack UI)

`open77_quickhack` (resources/system) brings Cyberpunk 2077's scanner and quickhack interface to
multiplayer as a framework for server developers. The resource draws the experience on NativeUI:
- the scanner vision;
- the target lock and the DATA / HACKING panel;
- the `AVAILABLE QUICKHACKS` list and the Cyberdeck RAM bar;
- the upload bar over the target and the warning the hacked player sees;
- the game's own UI sounds.

Your resource decides what exists and what happens: which quickhacks, who may use them on what,
what they cost, and the effect when one lands.

Everything is server-authoritative. The client asks (`scan`, `execute`), and the server checks the
target, bucket, range, RAM, cooldown and your `canUse`. It runs the upload timer and then calls
your `onExecute`.

**Install.** The resource ships with every server (freeroam template) and stays off until something
uses it: a resource that declares `dependency "open77_quickhack"` starts it with itself, and an
operator can also `ensure open77_quickhack`. Nothing changes on a server that does not use it.

Complete examples and ideas (a netrunner class, device heists, police scanners, safe zones,
NPC missions): [Quickhack examples](https://open2077.net/docs/quickhack-examples).

## Player controls

| Key (rebindable) | Action |
|---|---|
| hold **Tab** | Scanner. Look at a target to lock and scan it. |
| mouse wheel / ↑ ↓ | Move through the quickhack list. |
| **F** | Upload the selected quickhack. |
| **1** / **3** | Previous / next target on screen. A target picked this way stays locked until the crosshair leaves what it was on. |
| **Z** | DATA / HACKING tab. |
| **H** | Help line. |

While the scanner is open, firing, melee, grenades and every weapon change are blocked: wheel
cycling, slot keys, holster and the radial wheels (`Attack`, `Melee`, `Grenade`, `NextWeapon`,
`SwitchItem`, `RadialWheels`; see [Input blocking](input-blocking.md)). The weapon stays in hand,
and the mouse wheel only walks the quickhack list.

## Server API (exports of `open77_quickhack`)

Hooks are **export names in your resource**: closures do not cross resources.

- `canUse` runs inline (synchronous export). Keep it fast, and do not `Wait` in it. It is called with
  `check = true` for the list preview and again before an upload starts.
- `onStart`, `onExecute` and `onCancel` are fire-and-forget asynchronous calls.

```lua
local qh = exports.open77_quickhack

qh:registerPreset("short_circuit", { canUse = "myCanUse", onExecute = "myExecute", range = 35 })
qh:register({
    id = "blackout", label = "Blackout", icon = "system_reset", category = "ultimate",
    ram = 12, upload = 2.5, cooldown = 40, range = 30, targets = { "point" },
    description = "Cuts the power around the device.",
    onExecute = "myExecute",
})

exports("myCanUse", function(ctx)            -- ctx = { source, target, quickhack, check }
    if ctx.target.kind == "player" and isInSafeZone(ctx.target.id) then return false, "safe zone" end
    return true
end)
exports("myExecute", function(ctx)           -- ctx = { source, target = { kind, id, position }, quickhack, uploadId }
    if ctx.quickhack == "short_circuit" and ctx.target.kind == "npc" then
        Open77.npcs.applyDamage(ctx.target.id, 25, ctx.source, "quickhack")
    end
end)
```

### Definitions

| Field | Default | Meaning |
|---|---|---|
| `id` | required | `[a-z0-9_]`, at most 48 bytes, owned by the registering resource |
| `label`, `description` | id / "" | Shown in the list and in the description box |
| `icon` | `generic` | A built-in icon (below), or `nui://<resource>/<path>.png` |
| `category` | `covert` | `device`, `covert`, `control`, `damage`, `ultimate`. Sets the list order. |
| `ram` | 0 | RAM spent when the upload starts |
| `upload` | 1.5 | Upload time in seconds |
| `cooldown` | 0 | Seconds after the upload before the same player may use it again |
| `range` | `scanRange` | Metres, checked at the start and at the end |
| `targets` | all kinds | Any of `player`, `npc`, `vehicle`, `prop`, `point` |
| `uploadDetected` | true | Whether a player target sees the warning |
| `order` | from `category` | Explicit sort key |
| `canUse`, `onStart`, `onExecute`, `onCancel` | none | Export names in your resource |

`registerPreset(id, overrides)` copies the game's name, icon, category, RAM, upload time and
cooldown of a known quickhack. `presets()` lists them, and `preset(id)` reads one.

The presets are: `breach_protocol`, `ping`, `reboot_optics`, `memory_wipe`, `sonic_shock`,
`request_backup`, `distract`, `cripple_movement`, `weapon_glitch`, `cyberware_malfunction`,
`short_circuit`, `overheat`, `contagion`, `synapse_burnout`, `system_reset`, `cyberpsychosis`,
`suicide`, `detonate_grenade`, `takeover`, `malfunction`, `overload`.

The built-in icons are all of those, plus `blind`, `data`, `generic` and `ram`.

### Targets

Players are targets unless `setAutoTargets({ player = false })`. Everything else is added:

```lua
qh:addTarget({
    kind = "point", id = "bank_terminal",                -- or kind = "npc" / "vehicle" / "prop" with their ids
    position = { x = -1290.4, y = 1980.2, z = 18.1 }, radius = 1.0,
    name = "Bank Terminal", tone = "device",             -- hostile (red panel), neutral, friendly, device (blue panel)
    info = {
        affiliation = "Arasaka", wanted = "Wanted in Night City", description = "...",
        bounty = 2500, streetCred = 40, stars = 3, threat = "high",   -- NCPD database block
        fields = { { "NETWORK", "KANG TAO SUBNET 4" }, { "ICE", "TIER 2" } },
        abilities = { { label = "Optical Camo", icon = "reboot_optics" } },
        vulnerabilities = { "breach_protocol", "distract" },    -- shown when there are no abilities
    },
    quickhacks = { "breach_protocol", "distract" },      -- optional: only these on this target
    locate = "myLocate",                                 -- for an entity you own (below)
})
qh:updateTarget("bank_terminal", { info = { threat = "extreme" } })
qh:removeTarget("bank_terminal")
qh:setPlayerInfo(playerId, { affiliation = "Afterlife Mercs", bounty = 10, stars = 1 })
```

**NPCs, vehicles and props a resource owns.** The server API only lets a resource read its own NPCs,
so open77_quickhack cannot see where yours are. Give `locate`, an export that answers with the
position:

```lua
exports("myLocate", function(target)          -- { kind, id }
    local npc = Open77.npcs.get(target.id)
    return npc and { x = npc.x, y = npc.y, z = npc.z, bucket = npc.bucket }
end)
```

### Decks (RAM and loadout)

```lua
qh:setDeck(playerId, { ram = 19, maxRam = 19, regen = 0.6, slots = { "ping", "short_circuit" }, enabled = true })
qh:setRam(playerId, 10); qh:addRam(playerId, -3)
qh:setLoadout(playerId, { "ping" })          -- nil = every registered quickhack
qh:setCooldown(playerId, "ping", 5)
qh:setEnabled(playerId, false)               -- "CYBERDECK OFFLINE", cancels a running upload
qh:getDeck(playerId); qh:uploads(); qh:cancel(uploadIdOrPlayerId, "reason")
```

### Events

`open77_quickhack:started`, `open77_quickhack:executed` and `open77_quickhack:cancelled` take
`(source, target, quickhackId[, reason])`. They reach every server resource, so they are an
alternative to hooks.

When a resource stops, its quickhacks and targets go with it.

## Client API

- **Exports:**
  - scanner and state: `isScanning()`, `getLockedTarget()`, `open()`, `close()`;
  - selection: `selectNext()`, `selectPrevious()`, `execute()`, `nextTarget()`, `previousTarget()`, `toggleTab()`;
  - look and sound: `setTheme({ accent, alert, name })` with `#rrggbb` colours, `playSound(nameOrEvent)`.

  The selection exports exist for other input schemes, such as a gamepad layer or tests.
- **Local events:**
  - `open77_quickhack:scannerOpened`, `open77_quickhack:scannerClosed`, `open77_quickhack:targetLocked`;
  - `TriggerEvent("open77_quickhack:previewIncoming", { label, icon, from, duration, ok })` shows the hacked player's warning locally.

## Look, sounds and configuration (`shared/config.lua`)

- **Vision** (`vision = "native"`). The engine's focus vision, with bodies outlined through walls,
  goes through `Open77.braindance.setHeatmap`. The locked target is painted `hot`. If another
  resource owns the heatmap, the HUD re-colours the screen instead (`"tint"`).
- **Sounds.** These are the game's own events, played as 2D UI sounds:
  - scanner open and close: `ui_focus_mode_zooming_in_enter` / `_exit`, `ui_focus_mode_loop_start` / `_stop`;
  - scanning: `ui_focus_mode_scanning_loop_start` / `_stop`, `ui_focus_mode_scanning_done`;
  - quickhack list: `ui_focus_mode_qh_loop_start` / `_stop`, `ui_hacking_qh_hover`;
  - upload: `ui_hacking_press`, `ui_hacking_press_fail`, `ui_focus_mode_scanning_qh` / `_done` / `_stop`;
  - result: `ui_hacking_access_granted` / `_denied`;
  - hacked player's warning: `ui_hacking_loop_start` / `_stop`.

  Any of them can be overridden or set to `false` in `config.sounds`.
- **Other settings:** `scanRange`, `scanSeconds`, `rangeTolerance`, `visionRadius`,
  `visionMaxTargets`, `keys`, and the cosmetic `vendor` / `deckName`.

## Implementation notes

- **Following targets.** Targets are followed with native anchors (`Open77.anchors`, invisible
  `dot` anchors projected by the plugin every frame). Never read another body's transform
  per frame with `Open77.character.frame` or `bonePosition`: each call costs about 0.6 s and froze the game.
- **Picking.** While the focus vision is on, `Open77.character.aimedEntity()` mostly answers
  `aim_target_unavailable`. The pick therefore falls back to projecting the known targets (players
  nearby, registered NPCs and points) and taking the one closest to the crosshair, ten times a second.
- **Cost.** About 0.1 ms per frame on average with the scanner open (peak 1.1 ms). The frame rate
  drops by roughly 6 % because of the vision and the HUD.
- **Logging.** Any UI call over 4 ms is logged (`slow ui.*`), and so is any frame section over 8 ms.
