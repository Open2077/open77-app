# Vanilla blips and mappins

`CyberM.blips` creates real Cyberpunk 2077 mappins. Depending on the vanilla profile attached to the sprite, the same blip can appear in the HUD, the minimap, and the world map. The API requires this permission:

```lua
permissions { "ui.vanilla.map" }
```

The ids returned are 64-bit decimal strings. Keep them as they are: never convert them with `tonumber`.

Use this guide to mark a position or an entity on the player's map, minimap, and HUD.

## A first blip

```lua
local blip, reason = CyberM.blips.create({
    position = { x = -1442.2, y = 127.4, z = 18.0 },
    sprite = "objective",
    title = "Vehicle Dealership",
    description = "Purchase and collect street-legal vehicles.",
    active = true,
    visibleThroughWalls = false
})

assert(blip, reason)
assert(CyberM.blips.setPosition(blip, { x = -1440.0, y = 130.0, z = 18.0 }))
assert(CyberM.blips.setSprite(blip, "VehicleVariant"))
assert(CyberM.blips.remove(blip))
```

## Custom PNG icons

Declare every client asset in `cyberm.lua`. Undeclared files cannot be used as textures:

```lua
files { "assets/blips/*.png" }
permissions { "ui.vanilla.map" }
```

Then validate the texture and associate it with the blip. The native `sprite` provides the actual
rendering, selection, filtering, GPS routing, and fullscreen-map tooltip on Cyberpunk 2077 2.31.

```lua
local jobIcon, reason = CyberM.assets.texture("assets/blips/job-center.png")
assert(jobIcon, reason)

local jobCenter = assert(CyberM.blips.create({
    position = { x = -1442.2, y = 127.4, z = 18.0 },
    sprite = "tech",
    title = "Job Center",
    description = "Browse available civilian jobs and city contracts.",
    icon = { asset = jobIcon.asset, size = 56 }
}))

assert(CyberM.blips.setIcon(jobCenter, "assets/blips/job-center.png"))
assert(CyberM.blips.setIcon(jobCenter, false)) -- restore the native sprite
```

`icon` accepts a declared asset path, the descriptor returned by `CyberM.assets.texture`, or a
table `{ asset = path, size = pixels }`. Display size is limited to `16..128` pixels. Textures are
currently PNG only, at most 512 KiB and 512×512. The test asset is 128×128 with transparency.

The downloaded PNG compositor is disabled on Cyberpunk 2077 2.31. REDengine applies mappin
projection after the normal Ink transform pass: script-visible widget coordinates remain local,
and reading or forcing fullscreen-map layout while its native tree is being constructed causes an
engine null dereference. CyberM therefore keeps and validates the `icon` metadata but deliberately
renders the native `sprite`. This is a compatibility fallback, not a promise that the PNG appears.

`CyberM.assets.list()` returns the current resource's declared `files`; `texture(path)` returns
`{ type, asset, mime, width, height, bytes }` without exposing the file contents.

A blip can follow a CyberM entity instead of a position:

```lua
local playerBlip = assert(CyberM.blips.create({
    entity = remotePlayerEntityId,
    sprite = "remote_player",
    slot = "poi_mappin",
    offset = { x = 0.0, y = 0.0, z = 2.0 }
}))

CyberM.blips.attachToEntity(playerBlip, anotherEntityId, "poi_mappin", {
    x = 0.0, y = 0.0, z = 2.0
})
```

`position` and `entity` are mutually exclusive at creation. `setPosition` turns an attached blip into a positional one. In `update`, `entity = false` only detaches when a new `position` is supplied.

## Full API

| Function | Result | Role |
|---|---|---|
| `create(options)` | `id`, or `nil, reason` | Creates a positional or attached blip. |
| `update(id, patch)` | `boolean, reason?` | Changes several properties in one operation. |
| `setPosition(id, position)` | `boolean, reason?` | Moves the blip and makes it positional. |
| `attachToEntity(id, entity, slot?, offset?)` | `boolean, reason?` | Attaches the blip to a CyberM entity. |
| `setSprite(id, sprite)` | `boolean, reason?` | Accepts a name, an alias, or an integer `0..146`. |
| `setTitle(id, title)` | `boolean, reason?` | Changes the fullscreen-map title, 128 bytes maximum. |
| `setDescription(id, description)` | `boolean, reason?` | Changes the fullscreen-map description, 1024 bytes maximum. An empty string hides it. |
| `setLabel(id, label)` | `boolean, reason?` | Backward-compatible alias of `setTitle`. |
| `setIcon(id, iconOrFalse)` | `boolean, reason?` | Stores a declared PNG icon or clears it; 2.31 renders the native sprite. |
| `setActive(id, active)` | `boolean, reason?` | Enables or disables the vanilla mappin. |
| `setVisibleThroughWalls(id, visible)` | `boolean, reason?` | Changes visibility through walls. |
| `setTrackingAlternative(id, targetIdOrNil)` | `boolean, reason?` | Sets or clears the alternative routing blip. |
| `untrack(id)` | `true, wasTracked`, or `false, reason` | Removes tracking only if this blip is the tracked one. |
| `get(id)` | `snapshot`, or `nil, reason` | Reads a blip owned by the current resource. |
| `list()` | `snapshots`, or `nil, reason` | Lists only the current resource's blips. |
| `sprites()` | `{ {name, value}, ... }` | Returns the current build's 147 variants. |
| `remove(id)` | `boolean, reason?` | Deletes a blip. |
| `clear()` | `true` | Deletes every blip owned by the resource. |

`create` options: `position` or `entity`, `sprite`, `title`, `description`, `icon`, `active`, `visibleThroughWalls`, plus `slot` and `offset` for an entity. `label` remains an alias for `title`; do not provide both. `update` accepts the same fields, and the dedicated setters can change text at runtime. The quotas are 128 blips per resource and 512 per client. Stopping, reloading, and leaving the world clean up blips automatically.

A resource can neither read, change, nor delete another resource's blip. The TweakDB type is fixed to `Mappins.DefaultStaticMappin`; downloaded packages cannot inject an arbitrary UI profile.

`title` and `description` are resource-owned text. When the player highlights the blip on the fullscreen map, CyberM replaces the variant-specific tooltip with those exact values. Variant-specific fixer progress, threat, journal, price and travel panels are hidden for CyberM blips. HUD-only variants can still be absent from the fullscreen map; use a map-capable sprite such as `objective`, `quest`, `fast_travel`, `vehicle`, or a service-point variant when map selection is required.

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

## Colour, size, text, and tracking

`gamemappinsMappinData` carries neither colour nor scale. Those properties belong to the UI/TweakDB profile the game picks. The API therefore offers no fake `color` or `scale` that would do nothing.

`title` and `description` are kept in CyberM's private mappin data. The fullscreen-map tooltip reads those values after vanilla setup, so a highlighted blip can display guaranteed free-form text such as `Job Center` and a multiline description. Limits are 128 and 1024 UTF-8 bytes respectively. The HUD does not permanently draw that text next to the icon.

Custom PNG icons are not converted into `gamedataMappinVariant` values. CyberM keeps the native
mappin and its declared icon metadata, but 2.31 renders only the native sprite for stability.
WebP and runtime REDengine archive mounting are not supported.

The native system can clear the current tracking and set an alternative, but offers no safe `TrackMappin(id)`. The world map tracks a UI controller, not a raw id. `untrack(id)` therefore checks that the requested mappin really is the tracked one before doing anything; it cannot remove a vanilla objective.
