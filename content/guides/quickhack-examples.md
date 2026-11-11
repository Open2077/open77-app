# Quickhack examples and ideas

`open77_quickhack` gives every server Cyberpunk 2077's scanner and quickhack interface:
- the scanner vision;
- the target lock and the DATA / HACKING panel;
- the `AVAILABLE QUICKHACKS` list and the Cyberdeck RAM bar;
- the upload bar over the target and the warning the hacked player sees;
- the game's own sounds.

What a quickhack *does* is up to your resource. This page shows complete resources you can copy
and adapt, then a list of ideas. The full API is in the [Quickhacks reference](/docs/quickhack).

## Start from the bundled Pings

As soon as a resource depends on it, the framework makes players, every network NPC and every
vehicle hackable, and offers one example quickhack per kind of target:

| Quickhack | Targets | What the hacker gets |
|---|---|---|
| `ping_player` | players | name, id, speed, heading, vehicle, bucket, distance (the target sees the upload warning) |
| `ping_npc` | network NPCs | record, owner resource, health, which player simulates it, distance |
| `ping_vehicle` | vehicles | model, health, speed, lock, occupants, owner resource, distance |
| `ping_device` | points and props | name, id, position, how many quickhacks it accepts, distance |

Each one answers with a **report card** in the corner of the hacker's screen. The source is
`resources/system/open77_quickhack/server/examples.lua`, which is written to be copied: one
definition, one `onExecute` export, one effect. A custom quickhack is the same three steps in your
own resource:

```lua
local qh = exports.open77_quickhack

-- 1. the definition: what the list shows, what it costs, what it can target
qh:register({ id = "scan_cargo", label = "Scan Cargo", icon = "data", category = "covert",
    ram = 2, upload = 1.2, cooldown = 10, targets = { "vehicle" }, onExecute = "scanCargo" })

-- 2. the effect, in an export of YOUR resource
exports("scanCargo", function(ctx)              -- ctx = { source, target = { kind, id, position }, quickhack }
    local cargo = myTrunks[ctx.target.id] or {}  -- your own data
    -- 3. tell the hacker
    qh:report(ctx.source, {
        title = "CARGO SCAN", subtitle = ("%d items"):format(#cargo), tone = "device", icon = "data",
        fields = { { "WEAPONS", tostring(cargo.weapons or 0) }, { "CASH", "E$ " .. (cargo.cash or 0) } },
    })
end)
```

Once your own quickhacks are in place, turn the examples off with
`exports.open77_quickhack:setExamplesEnabled(false)`. You can also narrow what is targetable with
`setAutoTargets({ npc = false })` and add only the NPCs you choose with `addTarget`.

## How a quickhack resource is built

Every example below follows the same shape:

1. **Depend on the framework.** Declare `dependency "open77_quickhack"`. The framework ships with
   every server and stays off until a resource depends on it, so this line is what turns the
   scanner on.
2. **Register quickhacks** with `registerPreset` (the game's names, costs and timings) or
   `register` (your own).
3. **Add targets.** Players are targets by default. Add NPCs, vehicles and points (terminals,
   cameras, doors) with `addTarget`.
4. **Implement the effect** in an export named by `onExecute`. Hooks are export **names**:
   closures cannot cross resources.

```lua
-- open77.lua
resource "my_netrunning"
version "1.0.0"
dependency "open77_quickhack"
server_script "server/main.lua"
permissions { "players.damage.apply", "players.screenfx" }
```

The server checks range, bucket, RAM, cooldown and your `canUse` before an upload starts, and
again before it lands. Your `onExecute` only runs for an upload the server accepted, so it can
apply its effect directly.

## Example: a netrunner class for PvP

Only players with the netrunner role carry a deck. Short Circuit damages, Reboot Optics blinds
and Overheat burns. Everyone else's scanner shows `CYBERDECK OFFLINE`, but they still see the
warning when a netrunner hacks them.

```lua
-- server/main.lua
local qh = exports.open77_quickhack
local netrunners = {}             -- playerId -> true; fill it from your job or class system

CreateThread(function()
    qh:registerPreset("short_circuit", { targets = { "player" }, range = 30,
        canUse = "netCanUse", onExecute = "netExecute" })
    qh:registerPreset("reboot_optics", { targets = { "player" }, range = 30,
        canUse = "netCanUse", onExecute = "netExecute" })
    qh:registerPreset("overheat", { targets = { "player" }, range = 25, ram = 6,
        canUse = "netCanUse", onExecute = "netExecute" })
end)

local function setNetrunner(playerId, enabled)
    netrunners[playerId] = enabled or nil
    if enabled then
        qh:setDeck(playerId, { ram = 14, maxRam = 14, regen = 0.8,
            slots = { "short_circuit", "reboot_optics", "overheat" }, enabled = true })
    else
        qh:setEnabled(playerId, false)
    end
end

AddEventHandler("onPlayerConnected", function(playerId)
    setNetrunner(math.tointeger(tonumber(playerId)), false)
end)

-- Runs inline for the list preview (ctx.check = true) and before the upload: keep it fast.
exports("netCanUse", function(ctx)
    if not netrunners[ctx.source] then return false, "no deck" end
    return true
end)

exports("netExecute", function(ctx)
    local victim = ctx.target.id
    if ctx.quickhack == "short_circuit" then
        Open77.players.damage(victim, 20)
        Open77.effects.screen(victim, "electrocuted", { duration = 1.5 })
    elseif ctx.quickhack == "reboot_optics" then
        Open77.effects.screen(victim, "blinded", { duration = 4 })
    elseif ctx.quickhack == "overheat" then
        Open77.effects.screen(victim, "burning", { duration = 5 })
        for tick = 1, 5 do
            SetTimeout(tick * 1000, function() Open77.players.damage(victim, 4) end)
        end
    end
end)
```

The game's impact sound (`quickhack_shortcircuit`, `quickhack_reboot_optics`, …) plays on the
target automatically for a preset. Your export only adds what the hack does.

**Counterplay ideas:**
- Let a victim who reaches the hacker before the bar fills cancel the upload with
  `qh:cancel(hackerId, "traced")`.
- Give some players an ICE implant: `netCanUse` refuses with `"ICE"`, and the row turns red with
  that reason.

## Example: breach a door for a heist

A point target sits on the vault door. Breach Protocol opens it for 30 seconds through
[`open77_doors`](/docs/doors), and the server locks it again afterwards. Points show the blue
device panel, with the quickhacks they accept listed as vulnerabilities.

```lua
-- server/main.lua (also: dependency "open77_doors")
local qh = exports.open77_quickhack
local VAULT = { id = "0xFC85EAE29622BAC2", bucket = 0,
                position = { x = -1290.4, y = 1980.2, z = 18.1 } }

local function doors(method, ...)
    local pending, error = Open77.exports.call("open77_doors", method, ...)
    if not pending then return nil, error end
    return pending:await()
end

CreateThread(function()
    qh:registerPreset("breach_protocol", { targets = { "point" }, upload = 6, cooldown = 120,
        onExecute = "vaultBreached", canUse = "vaultCanUse" })
    qh:addTarget({
        kind = "point", id = "vault_door", position = VAULT.position, radius = 1.4,
        name = "Vault Access Panel", tone = "device",
        info = { affiliation = "Arasaka Bank", fields = { { "ICE", "TIER 3" }, { "ALARM", "ARMED" } } },
        quickhacks = { "breach_protocol" },
    })
    doors("register", { id = VAULT.id, bucket = VAULT.bucket, position = VAULT.position })
    doors("configure", VAULT.id, VAULT.bucket, { locked = true, open = false })
end)

exports("vaultCanUse", function(ctx)
    if #Open77.players.all() < 4 then return false, "crew of 4 needed" end
    return true
end)

exports("vaultBreached", function(ctx)
    doors("configure", VAULT.id, VAULT.bucket, { locked = false, open = true })
    TriggerEvent("heist:alarm", ctx.source)                 -- your police / wanted logic
    SetTimeout(30000, function()
        CreateThread(function() doors("configure", VAULT.id, VAULT.bucket, { open = false, locked = true }) end)
    end)
end)
```

A six-second upload with a visible bar over the panel is a natural tension window. Crew members
cover the netrunner, and the guards can interrupt the upload by forcing them out of range.

## Example: mission NPCs a resource owns

The server API only lets a resource read its own NPCs. Pass a `locate` export so the framework can
check range against your NPC.

```lua
local qh = exports.open77_quickhack

exports("missionLocate", function(target)                  -- { kind, id }
    local npc = Open77.npcs.get(target.id)
    return npc and { x = npc.x, y = npc.y, z = npc.z, bucket = npc.bucket }
end)

local function spawnTarget(position)
    local npcId = Open77.npcs.create({ position = position, damagePolicy = Open77.npcs.damage.mortal })
    qh:addTarget({
        kind = "npc", id = npcId, locate = "missionLocate",
        name = "Maelstrom Lieutenant", tone = "hostile",
        info = { affiliation = "Maelstrom", bounty = 5200, streetCred = 60, stars = 4, threat = "high",
                 abilities = { { label = "Subdermal Armor", icon = "overload" },
                               { label = "Gorilla Arms", icon = "malfunction" } } },
        quickhacks = { "short_circuit", "system_reset" },
    })
    return npcId
end

exports("missionExecute", function(ctx)
    if ctx.target.kind ~= "npc" then return end
    if ctx.quickhack == "system_reset" then Open77.npcs.kill(ctx.target.id, "quickhack")
    else Open77.npcs.applyDamage(ctx.target.id, 30, ctx.source, "quickhack") end
end)
```

Register `short_circuit` and `system_reset` with `onExecute = "missionExecute"`. Call
`qh:removeTarget({ kind = "npc", id = npcId })` when the mission ends. A stopped resource takes its
targets with it automatically.

## Example: a police ID scanner (no hacking at all)

The scanner is also a good **identity reader** for roleplay. Register no quickhacks for the
police, and fill the DATA panel from your database. The panel shows the NCPD block (bounty, street
cred, bounty class stars), threat and the abilities you list.

```lua
local qh = exports.open77_quickhack

local function refreshRecord(playerId, record)              -- record comes from your database
    qh:setPlayerInfo(playerId, {
        affiliation = record.gang or "Civilian",
        wanted = record.warrants > 0 and "Wanted in Night City" or nil,
        bounty = record.bounty, streetCred = record.reputation, stars = record.warrants,
        threat = record.warrants >= 3 and "high" or "low",
        fields = { { "LICENSE", record.license or "NONE" }, { "VEHICLE", record.plate or "-" } },
    })
end
```

Pair it with `qh:setEnabled(playerId, false)` for civilians if only officers should scan.

## Example: rules, zones and the RAM economy

```lua
-- No hacking in safe zones: the row shows BLOCKED with your reason.
exports("ruleCanUse", function(ctx)
    if isInSafeZone(ctx.source) or (ctx.target.kind == "player" and isInSafeZone(ctx.target.id)) then
        return false, "safe zone"
    end
    return true
end)

-- Turn the scanner off in a lobby or a cinematic.
qh:setEnabled(playerId, false)

-- Progression: a bigger deck per level, RAM back on a kill, a RAM consumable.
qh:setDeck(playerId, { maxRam = 10 + level * 2, regen = 0.4 + level * 0.05 })
AddEventHandler("myGame:kill", function(killerId) qh:addRam(killerId, 3) end)
AddEventHandler("myGame:usedItem", function(playerId, item)
    if item == "ram_booster" then qh:addRam(playerId, 8) end
end)
```

`open77_quickhack:started`, `:executed` and `:cancelled` reach every server resource. Use them for
logs, anti-abuse counters, statistics or achievements without touching the quickhack definitions.

## On the client

```lua
-- Hide your own HUD while the scanner is open.
AddEventHandler("open77_quickhack:scannerOpened", function() myHud.hide() end)
AddEventHandler("open77_quickhack:scannerClosed", function() myHud.show() end)

-- Gang colours for the interface.
exports.open77_quickhack:setTheme({ accent = "#ff3fb4", alert = "#ffd25a", name = "#ffffff" })

-- Another input scheme (a gamepad layer, a controller-only server).
exports.open77_quickhack:selectNext()
exports.open77_quickhack:execute()

-- Preview the hacked player's warning in your own tutorial.
TriggerEvent("open77_quickhack:previewIncoming", { label = "Short Circuit", icon = "short_circuit",
    from = "Tutorial", duration = 3000 })
```

While the scanner is open the framework blocks firing, melee, grenades and weapon changes (see
[Input blocking](/docs/input-blocking)). The mouse wheel walks the quickhack list instead.

## More ideas

- **ATM and terminal hacks.** Give a point target a custom `"drain_atm"` quickhack with a long
  upload. Pay out in `onExecute`, and raise the wanted level from the `started` event so the police
  are already on their way while the bar fills.
- **Camera takeover.** On a security camera point, `takeover` switches the hacker to that camera
  with the [remote camera](/docs/remote-camera) API: a classic stealth-mission opener.
- **Ping that tags.** `ping` adds a [blip](/docs/blips) on every player or NPC near the target
  for 15 seconds, visible only to the hacker's crew.
- **Contagion.** In `onExecute`, look for other players near the victim on the server and apply a
  weaker effect to each: the game's spreading hack.
- **Vehicle hacks.** Add vehicles with `kind = "vehicle"`. A `malfunction` stops the engine or
  pops the alarm through your vehicle code; an `overload` sets it on fire with
  [effects](/docs/effects).
- **Bounty hunters.** Fill `setPlayerInfo` with the real bounty so hunters scan crowds for
  their mark. The yellow name and the stars make a target recognisable at a glance.
- **Netrunner duels.** Use short cooldowns, RAM regen as the only resource, and `uploadDetected`
  so each side sees the other's upload and can break line of sight in time.
- **Training dummy.** One point target that accepts every quickhack and logs the damage each one
  would do, so players can learn the costs and upload times.
