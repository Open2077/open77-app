# Vanilla blips and mappins

`Open77.blips` creates real Cyberpunk 2077 mappins. Depending on the vanilla profile attached to the sprite, the same blip can appear in the HUD, the minimap, and the world map. The API requires this permission:

```lua
permissions { "ui.vanilla.map" }
```

The ids returned are 64-bit decimal strings. Keep them as they are: never convert them with `tonumber`.

Use this guide to mark a position or an entity on the player's map, minimap, and HUD.

## A first blip

```lua
local blip, reason = Open77.blips.create({
    position = { x = -1442.2, y = 127.4, z = 18.0 },
    sprite = "objective",
    title = "Vehicle Dealership",
    description = "Purchase and collect street-legal vehicles.",
    active = true,
    visibleThroughWalls = false
})

assert(blip, reason)
assert(Open77.blips.setPosition(blip, { x = -1440.0, y = 130.0, z = 18.0 }))
assert(Open77.blips.setSprite(blip, "VehicleVariant"))
assert(Open77.blips.remove(blip))
```

## Custom PNG icons

Declare every client asset in `open77.lua`. Undeclared files cannot be used as textures:

```lua
files { "assets/blips/*.png" }
permissions { "ui.vanilla.map" }
```

Then validate the texture and associate it with the blip. The native `sprite` provides the actual
rendering, selection, filtering, and fullscreen-map tooltip on Cyberpunk 2077 2.31.

```lua
local jobIcon, reason = Open77.assets.texture("assets/blips/job-center.png")
assert(jobIcon, reason)

local jobCenter = assert(Open77.blips.create({
    position = { x = -1442.2, y = 127.4, z = 18.0 },
    sprite = "tech",
    title = "Job Center",
    description = "Browse available civilian jobs and city contracts.",
    icon = { asset = jobIcon.asset, size = 56 }
}))

assert(Open77.blips.setIcon(jobCenter, "assets/blips/job-center.png"))
assert(Open77.blips.setIcon(jobCenter, false)) -- restore the native sprite
```

`icon` accepts a declared asset path, the descriptor returned by `Open77.assets.texture`, or a
table `{ asset = path, size = pixels }`. Display size is limited to `16..128` pixels. Textures are
currently PNG only, at most 512 KiB and 512×512. The test asset is 128×128 with transparency.

The downloaded PNG compositor is disabled on Cyberpunk 2077 2.31. REDengine applies mappin
projection after the normal Ink transform pass: script-visible widget coordinates remain local,
and reading or forcing fullscreen-map layout while its native tree is being constructed causes an
engine null dereference. Open77 therefore keeps and validates the `icon` metadata but deliberately
renders the native `sprite`. This is a compatibility fallback, not a promise that the PNG appears.

`Open77.assets.list()` returns the current resource's declared `files`; `texture(path)` returns
`{ type, asset, mime, width, height, bytes }` without exposing the file contents.

A blip can follow an Open77 entity instead of a position:

```lua
local playerBlip = assert(Open77.blips.create({
    entity = remotePlayerEntityId,
    sprite = "remote_player",
    slot = "poi_mappin",
    offset = { x = 0.0, y = 0.0, z = 2.0 }
}))

Open77.blips.attachToEntity(playerBlip, anotherEntityId, "poi_mappin", {
    x = 0.0, y = 0.0, z = 2.0
})
```

`position` and `entity` are mutually exclusive at creation. `setPosition` turns an attached blip into a positional one. In `update`, `entity = false` only detaches when a new `position` is supplied.

## A calculated GPS route

Tracking a normal static point selects its mappin but does not make REDengine calculate a road
path. Create a positional blip with `routable = true`, then track it:

```lua
local destination = assert(Open77.blips.create({
    position = { x = -1442.2, y = 127.4, z = 18.0 },
    routable = true,
    title = "Next checkpoint"
}))

local ok, changed = Open77.blips.track(destination)
assert(ok, changed)
```

The routable form uses the trusted `Mappins.CustomPositionMappinDefinition` and
`CustomPositionVariant` pair used by a right-click waypoint. Its sprite is therefore fixed to the
custom-waypoint variant. It cannot follow an entity. REDengine owns the road calculation and the
minimap/HUD path. A generic waypoint does **not** automatically create the orange 3D chevrons used
by the authored `sq024` street race; those are separate world entities. `update` can move the
destination but cannot change `routable`; remove and recreate it to change kind.

## Full API

| Function | Result | Role |
|---|---|---|
| `create(options)` | `id`, or `nil, reason` | Creates a positional or attached blip. |
| `update(id, patch)` | `boolean, reason?` | Changes several properties in one operation. |
| `setPosition(id, position)` | `boolean, reason?` | Moves the blip and makes it positional. |
| `attachToEntity(id, entity, slot?, offset?)` | `boolean, reason?` | Attaches the blip to an Open77 entity. |
| `setSprite(id, sprite)` | `boolean, reason?` | Accepts a name, an alias, or an integer `0..146`. |
| `setTitle(id, title)` | `boolean, reason?` | Changes the fullscreen-map title, 128 bytes maximum. |
| `setDescription(id, description)` | `boolean, reason?` | Changes the fullscreen-map description, 1024 bytes maximum. An empty string hides it. |
| `setLabel(id, label)` | `boolean, reason?` | Backward-compatible alias of `setTitle`. |
| `setIcon(id, iconOrFalse)` | `boolean, reason?` | Stores a declared PNG icon or clears it; 2.31 renders the native sprite. |
| `setActive(id, active)` | `boolean, reason?` | Enables or disables the vanilla mappin. |
| `setVisibleThroughWalls(id, visible)` | `boolean, reason?` | Changes visibility through walls. |
| `setRange(id, metres \| false)` | `boolean, reason?` | Switches the blip off beyond `metres` and back on when the player returns. |
| `setTrackingAlternative(id, targetIdOrNil)` | `boolean, reason?` | Sets or clears the alternative routing blip. |
| `track(id)` | `true, changed`, or `false, reason` | Selects this blip as the vanilla GPS destination. |
| `untrack(id)` | `true, wasTracked`, or `false, reason` | Removes tracking only if this blip is the tracked one. |
| `get(id)` | `snapshot`, or `nil, reason` | Reads a blip owned by the current resource. |
| `list()` | `snapshots`, or `nil, reason` | Lists only the current resource's blips. |
| `sprites()` | `{ {name, value}, ... }` | Returns the current build's 147 variants. |
| `remove(id)` | `boolean, reason?` | Deletes a blip. |
| `clear()` | `true` | Deletes every blip owned by the resource. |
| `waypoint()` | `{ x, y, z }`, `nil`, or `nil, reason` | Where the player's map waypoint is. |
| `setWaypoint(position)` | `true`, or `false, reason` | Places the player's map waypoint. |
| `clearWaypoint()` | `true, wasSet`, or `false, reason` | Clears the waypoint, whoever set it. |

`create` options: `position` or `entity`, `sprite`, `title`, `description`, `icon`, `active`, `visibleThroughWalls`, `range`, `routable`, plus `slot` and `offset` for an entity. `label` remains an alias for `title`; do not provide both. `update` accepts the mutable fields (not `routable`), and the dedicated setters can change text at runtime. The quotas are 128 blips per resource and 512 per client. Stopping, reloading, and leaving the world clean up blips automatically.

A resource can neither read, change, nor delete another resource's blip. The TweakDB type is fixed to `Mappins.DefaultStaticMappin`, or to the single trusted custom-position definition when `routable = true`; downloaded packages cannot inject an arbitrary UI profile.

`title` and `description` are resource-owned text. When the player highlights the blip on the fullscreen map, Open77 replaces the variant-specific tooltip with those exact values. Variant-specific fixer progress, threat, journal, price and travel panels are hidden for Open77 blips. HUD-only variants can still be absent from the fullscreen map; use a map-capable sprite such as `objective`, `quest`, `fast_travel`, `vehicle`, or a service-point variant when map selection is required.

## Stable aliases

| Alias | Variant |
|---|---|
| `default` | `DefaultVariant` |
| `objective` | `DefaultQuestVariant` |
| `quest` | `QuestGiverVariant` |
| `important` | `ExclamationMarkVariant` |
| `question` | `QuestionMarkVariant` |
| `fast_travel` | `FastTravelVariant` |
| `vehicle` | `VehicleVariant` |
| `loot` | `LootVariant` |
| `danger` | `HazardWarningVariant` |
| `vendor` | `OpenVendorVariant` |
| `apartment`, `stash`, `wardrobe` | matching variants |
| `bar`, `clothes`, `cyberware`, `drop_point`, `food`, `guns`, `junk`, `meds`, `ripperdoc`, `tech` | matching `ServicePoint*` variants |
| `race`, `ncart`, `fixer`, `tarot` | matching variants |
| `ping_door`, `ping_go_here`, `ping_loot`, `remote_player` | matching `CPO_*` variants |

Exact names are insensitive to case, spaces, hyphens, and underscores. Aliases are preferable for generic gameplay; full names are useful when a server wants one specific vanilla asset.

## Complete sprite list (Cyberpunk 2077 2.31)

`Count=147` and `Invalid=148` are sentinels and are not accepted. The usable values are:

| ID | Nom | ID | Nom | ID | Nom |
|---:|---|---:|---|---:|---|
| 0 | `ActionDealDamageVariant` | 49 | `ExclamationMarkVariant` | 98 | `ServicePointDropPointVariant` |
| 1 | `ActionFastSoloVariant` | 50 | `FailedCrossingVariant` | 99 | `ServicePointFoodVariant` |
| 2 | `ActionGenericInteractionVariant` | 51 | `FastTravelVariant` | 100 | `ServicePointGunsVariant` |
| 3 | `ActionNetrunnerAccessPointVariant` | 52 | `FixerVariant` | 101 | `ServicePointJunkVariant` |
| 4 | `ActionNetrunnerVariant` | 53 | `FocusClueVariant` | 102 | `ServicePointMedsVariant` |
| 5 | `ActionScanVariant` | 54 | `GPSForcedPathVariant` | 103 | `ServicePointMeleeTrainerVariant` |
| 6 | `ActionSoloVariant` | 55 | `GPSPortalVariant` | 104 | `ServicePointNetTrainerVariant` |
| 7 | `ActionTechieVariant` | 56 | `GangWatchVariant` | 105 | `ServicePointProstituteVariant` |
| 8 | `AimVariant` | 57 | `GenericRoleVariant` | 106 | `ServicePointRipperdocVariant` |
| 9 | `AllowVariant` | 58 | `GetInVariant` | 107 | `ServicePointTechVariant` |
| 10 | `ApartmentVariant` | 59 | `GetUpVariant` | 108 | `SitVariant` |
| 11 | `ArrowVariant` | 60 | `GrenadeVariant` | 109 | `SmugglersDenVariant` |
| 12 | `BackOutVariant` | 61 | `GunSuicideVariant` | 110 | `SoloTechieVariant` |
| 13 | `BountyHuntVariant` | 62 | `HandVariant` | 111 | `SoloVariant` |
| 14 | `CallVariant` | 63 | `HazardWarningVariant` | 112 | `SpeechVariant` |
| 15 | `ChangeToFriendlyVariant` | 64 | `HiddenStashVariant` | 113 | `TakeControlVariant` |
| 16 | `ClientInDistressVariant` | 65 | `HitVariant` | 114 | `TakeDownVariant` |
| 17 | `ConversationVariant` | 66 | `HuntForPsychoVariant` | 115 | `TarotVariant` |
| 18 | `ConvoyVariant` | 67 | `ImportantInteractionVariant` | 116 | `TechieVariant` |
| 19 | `CoolVariant` | 68 | `InvalidVariant` | 117 | `ThieveryVariant` |
| 20 | `CourierVariant` | 69 | `JackInVariant` | 118 | `UseVariant` |
| 21 | `CustomPositionVariant` | 70 | `JamWeaponVariant` | 119 | `VehicleVariant` |
| 22 | `CyberspaceNPC` | 71 | `LifepathCorpoVariant` | 120 | `WanderingMerchantVariant` |
| 23 | `CyberspaceObject` | 72 | `LifepathNomadVariant` | 121 | `Zzz01_CarForPurchaseVariant` |
| 24 | `DefaultInteractionVariant` | 73 | `LifepathStreetKidVariant` | 122 | `Zzz02_MotorcycleForPurchaseVariant` |
| 25 | `DefaultQuestVariant` | 74 | `LootVariant` | 123 | `Zzz03_MotorcycleVariant` |
| 26 | `DefaultVariant` | 75 | `MinorActivityVariant` | 124 | `Zzz04_PreventionVehicleVariant` |
| 27 | `DistractVariant` | 76 | `NPCVariant` | 125 | `Zzz05_ApartmentToPurchaseVariant` |
| 28 | `DropboxVariant` | 77 | `NetrunnerAccessPointVariant` | 126 | `Zzz06_NCPDGigVariant` |
| 29 | `DynamicEventVariant` | 78 | `NetrunnerSoloTechieVariant` | 127 | `Zzz07_PlayerStashVariant` |
| 30 | `EffectAlarmVariant` | 79 | `NetrunnerSoloVariant` | 128 | `Zzz08_WardrobeVariant` |
| 31 | `EffectControlNetworkVariant` | 80 | `NetrunnerTechieVariant` | 129 | `Zzz09_CourierSandboxActivityVariant` |
| 32 | `EffectControlOtherDeviceVariant` | 81 | `NetrunnerVariant` | 130 | `Zzz10_RemoteControlDrivingVariant` |
| 33 | `EffectControlSelfVariant` | 82 | `NonLethalTakedownVariant` | 131 | `Zzz11_RoadBlockadeVariant` |
| 34 | `EffectCutPowerVariant` | 83 | `OffVariant` | 132 | `Zzz12_QuickHackQueueVariant` |
| 35 | `EffectDistractVariant` | 84 | `OpenVendorVariant` | 133 | `Zzz12_WorldEncounterVariant` |
| 36 | `EffectDropPointVariant` | 85 | `OutpostVariant` | 134 | `Zzz13_DogtownGateVariant` |
| 37 | `EffectExplodeLethalVariant` | 86 | `PhoneCallVariant` | 135 | `Zzz14_ServicePointBlackMarketVariant` |
| 38 | `EffectExplodeNonLethalVariant` | 87 | `QuestGiverVariant` | 136 | `Zzz15_QuickHackDurationVariant` |
| 39 | `EffectFallVariant` | 88 | `QuestionMarkVariant` | 137 | `Zzz16_RelicDeviceBasicVariant` |
| 40 | `EffectGrantInformationVariant` | 89 | `QuickHackVariant` | 138 | `Zzz16_RelicDeviceSpecialVariant` |
| 41 | `EffectHideBodyVariant` | 90 | `ReflexesVariant` | 139 | `Zzz17_NCARTVariant` |
| 42 | `EffectLootVariant` | 91 | `ResourceVariant` | 140 | `Zzz18_RacingVariant` |
| 43 | `EffectOpenPathVariant` | 92 | `RetrievingVariant` | 141 | `Zzz19_DelamainTaxiVariant` |
| 44 | `EffectPushVariant` | 93 | `SOSsignalVariant` | 142 | `Zzz20_DelamainTaxiDestinationVariant` |
| 45 | `EffectServicePointVariant` | 94 | `SabotageVariant` | 143 | `CPO_PingDoorVariant` |
| 46 | `EffectShootVariant` | 95 | `ServicePointBarVariant` | 144 | `CPO_PingGoHereVariant` |
| 47 | `EffectSpreadGasVariant` | 96 | `ServicePointClothesVariant` | 145 | `CPO_PingLootVariant` |
| 48 | `EffectStoreItemsVariant` | 97 | `ServicePointCyberwareVariant` | 146 | `CPO_RemotePlayerVariant` |

A variant existing in the enum does not guarantee its profile renders on every surface. The `CPO_*` variants, for instance, come from a dormant multiplayer HUD and must be checked visually in the server's context.

## A blip that only shows up close

`range` switches a blip off once the player is further away than the given number of metres, and
back on when they return. It is the one styling-adjacent property of this engine that can be made
real, and it is worth knowing exactly what it is before relying on it.

```lua
-- A shop pin that stops cluttering the map from across the city.
local shop = assert(Open77.blips.create({
    position = { x = -1442.2, y = 127.4, z = 18.0 },
    sprite = "vendor",
    title = "Kabuki Market",
    range = 180
}))

Open77.blips.setRange(shop, 400)     -- widen it
Open77.blips.setRange(shop, false)   -- or take the gate off entirely
print(Open77.blips.get(shop).range)  -- 0 when there is no gate
```

**It is Open77's own doing, not an engine property.** There is no range field on a mappin. What the
engine publishes is `SetMappinActive`, so Open77 measures the distance from the player on the game
thread and drives that one call — only on a transition, and only for blips that asked for a range,
so a client whose resources never use it pays nothing. An entity-following blip is measured from the
body it follows; while that body is not streamed in, the gate keeps whatever state it last wrote
rather than guessing a distance.

**It is therefore not FiveM's `SetBlipAsShortRange`.** That one hides a blip from the minimap and
leaves it on the world map. Cyberpunk offers no per-surface control here, so out of range means off
on the HUD, the minimap *and* the world map. The name is `range` and not `shortRange` for exactly
that reason, and `shortRange` is refused by name rather than quietly given these different manners.

`range` composes with `active` instead of overriding it: a blip you set inactive stays inactive in
range, and a ranged blip you re-activate while out of range stays hidden until you walk back. Limits
are `0` (no gate, the default) to `4000` metres; anything else is `invalid_range`.

## Colour, size, category, radius — and why each is refused by name

Every one of these is **refused**, with its own reason token, on `create` and on `update` alike:

| Option | Reason | |
|---|---|---|
| `color`, `colour` | `unsupported_option:color` / `:colour` | FiveM `SetBlipColour` |
| `alpha`, `opacity` | `unsupported_option:alpha` / `:opacity` | FiveM `SetBlipAlpha` |
| `scale` | `unsupported_option:scale` | FiveM `SetBlipScale` |
| `shortRange` | `unsupported_option:shortRange` | FiveM `SetBlipAsShortRange` — use `range` |
| `category` | `unsupported_option:category` | FiveM `SetBlipCategory` |
| `kind = "radius"` | `unsupported_kind:radius` | FiveM `AddBlipForRadius` |
| any other `kind` | `unsupported_option:kind` | |

Refusing is the point. Until this row, an unknown key in the options table was simply ignored, so
`Open77.blips.create{ sprite = "loot", color = "#ff0000" }` handed back a perfectly good blip that
was not red and never said so. A property accepted and silently discarded is worse than one that is
missing, because nothing in the resource can tell the difference.

The measurements behind the table, all on 2.31:

- **`gamemappinsMappinData` carries seven fields**, and not one of them is a colour, an opacity, a
  scale, a category or a radius: `mappinType`, `variant`, `active`, `debugCaption`,
  `localizedCaption`, `visibleThroughWalls`, `scriptData`. `gamemappinsMappinSystem` exposes exactly
  five mutators to match — `ChangeMappinVariant`, `SetMappinActive`, `SetMappinDebugCaption`,
  `SetMappinPosition`, `SetMappinScriptData`.
- **Opacity and scale exist, but per sprite, not per pin.** They live on
  `gamedataMappinUIRuntimeProfile_Record` (`OpacityDistanceParams`, `ScaleDistanceParams`,
  `OpacityAngleParams`, ...), which `CreateMappinUIProfile` resolves *from the variant*. One record
  is shared by every pin using that sprite, so a per-blip colour would restyle every other
  resource's blips at the same time. That is not a blip property with a missing setter; it is a
  different thing wearing the same word.
- **`AddBlipForRadius` has no counterpart at all.** `MappinSystem` publishes no area registration,
  and the mappin subclasses that do carry a radius — `gamemappinsPointOfInterestMappinData` has
  `dynamicMappinRadius` — cannot be used, because `RegisterMappin` takes
  `gamemappinsMappinData` **by value**: a subclass passed into it is sliced. For a circle in the
  world rather than on the map, [`Open77.markers`](world-queries.md) draws a ground-aligned ring
  with a real radius.

What *is* per-blip is the sprite, and Cyberpunk's sprites carry their own colours: picking
`danger` over `objective` is how a blip becomes red here.

`title` and `description` are kept in Open77's private mappin data. The fullscreen-map tooltip reads those values after vanilla setup, so a highlighted blip can display guaranteed free-form text such as `Job Center` and a multiline description. Limits are 128 and 1024 UTF-8 bytes respectively. The HUD does not permanently draw that text next to the icon.

Custom PNG icons are not converted into `gamedataMappinVariant` values. Open77 keeps the native
mappin and its declared icon metadata, but 2.31 renders only the native sprite for stability.
WebP and runtime REDengine archive mounting are not supported.

`track(id)` follows the same internal `MappinSystem` operation as selecting a pin on the fullscreen
map: it changes the manually tracked id. Route calculation is a second condition and only starts
for a blip created with `routable = true`. It returns `changed = false` when that blip is already
tracked. `untrack(id)` first checks that the requested mappin really is the tracked one, so it cannot
remove a vanilla objective or another resource's destination.

## The player's waypoint

`track` and `untrack` above act on **your** blip. The waypoint is the other half: the destination
the player chose, which until now no resource could see or move.

```lua
-- A taxi fare: take the destination the player pinned on their own map.
local to = Open77.blips.waypoint()
if to then
    Open77.events.emitServer("taxi:requestRide", to)
end

-- Or route them somewhere the job picked.
Open77.blips.setWaypoint({ x = -1540.0, y = -2020.0, z = 24.0 })

AddEventHandler("open77:waypointChanged", function(state)
    if state.present then
        print(("waypoint moved to %.0f, %.0f"):format(state.position.x, state.position.y))
    else
        print("waypoint cleared")
    end
end)
```

In this engine a waypoint is not a separate thing: **it is the manually tracked mappin**, the same
selection `track` writes. `setWaypoint` registers a routable custom-position pin and tracks it, so
the vanilla GPS calculates a road route exactly as it does for a waypoint the player set by hand.

Four behaviours worth knowing, each of which exists because the alternative bites:

- **`nil` and `nil, reason` are different answers.** `nil` alone means there is no waypoint; `nil`
  with a reason means the question could not be asked. A GPS script must branch on that, because
  cancelling a fare is correct for only the first.
- **The pin is yours and dies with you.** It is an ordinary blip owned by the calling resource, so
  a crashed taxi script leaves no permanent arrow on the player's map. It also counts against your
  128-blip quota -- but calling `setWaypoint` again *moves* the same pin rather than registering
  another, so updating a destination on a timer is safe.
- **`clearWaypoint` is not owner-scoped, and `untrack` is.** Clearing the waypoint means the
  player's waypoint, whoever set it, because that is what a route-cancel button does. It still
  refuses to *destroy* another resource's pin: only the tracking selection is released.
- **The event covers waypoints Open77 did not set.** The engine raises nothing when a player
  right-clicks the fullscreen map, so Open77 polls the tracked mappin and publishes the difference.
  That poll is the only channel by which a player-chosen destination reaches a resource at all.

`open77:waypointChanged` carries one table, `{ present, position }`, rather than three loose
coordinates: a cleared waypoint has to be a value a handler can read, not an absence of arguments.
