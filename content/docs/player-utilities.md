# Player checks and controls

Client Lua helpers use the player's native state, not pressed keyboard keys. Network
player IDs are **not** entity handles. Omitting the player ID queries the local player.
Failures return `nil, reason` for reads and `false, reason` for controls.

Available in client **2.31.13+op77.62**, protocol **1.25**. These are client APIs;
server resources request their own client's actions through permissioned events.

```lua
permissions { 'players.read', 'players.controls' }
```

## Read-only checks

Every global below also exists under `Open77.players` with the indicated method.

| Global | Method | Meaning |
| --- | --- | --- |
| `IsPlayerSwimming([playerId])` | `isSwimming` | Native surface swimming or diving |
| `IsPlayerDiving([playerId])` | `isDiving` | Native underwater swimming state |
| `IsPlayerAiming([playerId])` | `isAiming` | Graph-produced aim state, including toggle aim |
| `IsPlayerShooting([playerId])` | `isShooting` | Graph trigger state; not confirmation of damage or every projectile |
| `IsPlayerReloading([playerId])` | `isReloading` | Reload state |
| `IsPlayerGrounded([playerId])` | `isGrounded` | Movement ground contact |
| `IsPlayerCrouching([playerId])` | `isCrouching` | Crouched locomotion |
| `IsPlayerSliding([playerId])` | `isSliding` | Sliding locomotion |
| `IsPlayerSprinting([playerId])` | `isSprinting` | Sprint state, not a velocity threshold |
| `IsPlayerVaulting([playerId])` | `isVaulting` | Vault state |
| `IsPlayerJumping([playerId])` | `isJumping` | Jump/double-jump phase |
| `IsPlayerFalling([playerId])` | `isFalling` | Falling phase |
| `IsPlayerInVehicle([playerId])` | `isInVehicle` | Native mounted state |
| `IsPlayerDriver([playerId])` | `isDriver` | Mounted in the driver's seat |
| `IsPlayerPassenger([playerId])` | `isPassenger` | Mounted in a non-driver seat |

Remote checks require a streamed, presentation-ready player and return
`nil, 'player_not_streamed'` otherwise. Swimming/diving are currently local-only:
their PSM field is not replicated, so querying a remote player returns
`nil, 'state_not_replicated'` rather than inventing a false result. Remote values are
presentation snapshots and must **not** authorize server-side rewards/damage.

```lua
local swimming, reason = IsPlayerSwimming()
if swimming == nil then return end -- unavailable is not the same as false
if swimming then Open77.log.info('Player is swimming') end
```

## Resource-owned controls

These client calls affect the local player. Server scripts can signal their own client
resource using the normal permissioned event API. They are gameplay controls, not
server-side anti-cheat enforcement.

| Global / `Open77.players` method | Argument | Block bit |
| --- | --- | --- |
| `FreezePosition` / `freezePosition` | `true` requests native forced-freeze locomotion | 1 |
| `FreezeRotation` / `freezeRotation` | `true` applies native camera/turn restriction | 2 |
| `AllowJump` / `allowJump` | `false` blocks jumping | 4 |
| `AllowAim` / `allowAim` | `false` blocks aim entry and exits held aim | 8 |
| `AllowRunning` / `allowRunning` | `false` requests native forced walking | 16 |
| `AllowShoot` / `allowShoot` | `false` blocks firearm firing decisions, including an ongoing automatic firing sequence | 32 |
| `AllowCrouch` / `allowCrouch` | `false` requests native standing | 64 |
| `AllowDodge` / `allowDodge` | `false` blocks ground/air dodge entry | 128 |
| `AllowWeapons` / `allowWeapons` | `false` applies the native no-weapons restriction | 256 |
| `AllowInteraction` / `allowInteraction` | `false` blocks native world interactions | 512 |

Only actual Lua booleans are accepted: the string `'false'` is rejected.
`allow=true` releases **this resource's** block; it cannot override another resource
or a vanilla restriction. `freeze=false` follows the same ownership rule.
`Open77.players.resetControls()` releases every block owned by the caller.
`Open77.players.getControlMask()` returns the combined Open77 block bitmask; it is not
an inventory of vanilla restrictions. All require `players.controls`.

```lua
assert(AllowJump(false))
assert(AllowShoot(false))
-- When this activity ends:
assert(Open77.players.resetControls())
```

The host releases blocks on resource stop, session teardown, death and player-body
replacement. The native query has a two-second watchdog so abandoned runtime state
does not leave a player locked indefinitely. These controls do not freeze a vehicle,
stop a moving platform, cancel server teleports, or cancel projectiles already fired.

## Validation status

Lua ownership/permission tests and full REDscript compilation pass. Live acceptance
confirms grounded movement freeze/release, mouse-turn restriction, sprint restriction,
jump block/release, crouch block/release, native aim detection, leaving held aim,
blocking firearm firing and interrupting/resuming an automatic firing sequence.
Airborne/platform freeze and every traversal state are not certified: this is a native
locomotion/input restriction, not a physics anchor. Before a combat graph sample exists,
combat checks return `nil, 'state_unavailable'` (including early unarmed startup).
Swimming/diving use the verified native enum; entering water was not part of the live
acceptance run. These checks do not synthesize missing remote swimming state.

`IsPointOnRoad` is **not implemented**. The exposed road/lane natives inspected so far
query the current player/vehicle; they do not classify arbitrary world coordinates.
An asphalt material or pedestrian navmesh hit would not be a correct replacement.
