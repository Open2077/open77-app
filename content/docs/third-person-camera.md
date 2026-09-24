# Third-person camera styles

Configure the playable third-person camera through `Open77.camera`: framing, movement response and resource-owned styles. Cinematic camera ownership is documented separately in [Scripted cameras](cameras.md).

## Availability and permissions

These functions require the client update introducing camera styles, cinematic
display and resource-owned perspective locks. Older clients do not gain native
APIs from a resource reload or a server update. Check for the functions before
offering these options if your package supports older clients:

```lua
local supported = Open77.camera and Open77.camera.configureThirdPerson
    and Open77.perspective and Open77.perspective.setThirdPerson
    and Open77.hud and Open77.hud.setCinematic
if not supported then
    print("Update the Open77 client to use camera styles and cinematic display")
    return
end
```

| Control | Client manifest permission | Release |
|---|---|---|
| Camera framing, FOV and shake | `camera.style` | `Open77.camera.resetThirdPerson()` |
| Ordinary FPP/TPP request | None | Player can toggle again |
| Temporary forced FPP/TPP | `perspective.policy` | `Open77.perspective.clearThirdPersonOverride()` |
| Cinematic HUD and black bars | `ui.vanilla.hud` | `Open77.hud.setCinematic(false)` |

These are independent controls. They do not require a new network protocol or
a dedicated-server binary change; they affect the calling client's presentation.

Add `"camera.style"` to your resource's `permissions`. Configuration alone does
not enable third person or bypass a server perspective policy:

```lua
local ok, reason = Open77.camera.configureThirdPerson({ style = "shoulder" })
if not ok then print(reason); return end
local enabled, why = Open77.perspective.set("tps")
if not enabled then Open77.camera.resetThirdPerson(); print(why) end
```

## Functions

To enable/disable TPP, or force it and block the F7 toggle, see
[`Open77.perspective.setThirdPerson(enabled, force)`](perspective.md#enable-disable-or-temporarily-force-a-view-client).
Style configuration and perspective locks are independent: resetting one does
not reset the other.

| Function | Result / purpose |
|---|---|
| `Open77.camera.configureThirdPerson(options)` | `true`, or `false, reason`. Acquire the style or patch your current settings. |
| `Open77.camera.thirdPersonState()` | Snapshot described below, or `nil, reason` when unavailable. Read-only; no permission required. |
| `Open77.camera.resetThirdPerson()` | Release your style and shake, blend back to the underlying framing/lens. Does not disable F7. |
| `Open77.camera.shakeThirdPerson(options)` | Start/replace one finite positional shake owned by your style. |
| `Open77.camera.stopThirdPersonShake()` | Stop only your shake. Safe if you own none. |

All mutations return `true` or `false, reason`. A second resource cannot replace
or reset the current owner's style (`camera_style_owned`). Stop/reload,
disconnection teardown and a failed Lua coroutine release the owning resource's
claim automatically. A stopped unrelated resource does not affect it.

## Configuration

Unknown fields and invalid/non-finite values are rejected atomically. No partial
configuration is applied. Without `style`, fields patch your current settings;
on the first call they patch `classic`. Supplying `style` resets to that preset
before applying the other fields in the same call.

| Field | Values / units |
|---|---|
| `style` | `"classic"`, `"shoulder"`, `"centered"` |
| `anchor` | `"eyes"` (default, tracked native eye parent), or `"body"` (player origin at the feet) |
| `hip`, `aim`, `explore` | Independent framing tables: `{ distance, offset, fov }` |
| `distance` in a framing | Boom length, 0.8–8 metres. Geometry and near-plane safety can shorten it. |
| `offset` in a framing | `vector3(x,y,z)` or a complete `{x=,y=,z=}` table: view-right, view-forward, world-up metres. X: −2…2, Y: −1…1, Z: −1.5…3. |
| `fov` in a framing | Native component FOV degrees, 40–110; `0` restores/preserves the captured gameplay lens. |
| `shoulder` | `"right"` (default) or `"left"`; mirrors the lateral offset with a smooth swap. |
| `transition` | Framing/FOV blend duration, 0–3 seconds; default 0.3. Reversal continues from the current framing. |
| `runSpeed` | Ground-speed threshold for `runFov`, 0.5–15 m/s; default 2.5. |
| `runFov`, `sprintFov` | Optional absolute FOV, same range as `fov`; zero disables that override. Sprint wins over running; aiming wins over both. |

The shoulder preset uses hip/explore distance 1.65 m, offset `(0.65, 0, -0.12)`,
FOV 65; aim distance 1.25 m, offset `(0.65, 0.05, -0.06)`, FOV 55. Running/sprint
FOV is 70/76. It deliberately frames the upper body instead of fitting the feet.
Classic preserves the gameplay FOV; centered removes hip/explore lateral bias
but retains an offset when aiming so the character does not cover the reticle.

Anchors are **stable gameplay pivots, not animated skeleton bones**. A literal
shoulder bone would inherit gait/attack jitter. `eyes` follows native crouch
height; `body` is a fixed offset above the entity origin, so specify a suitable
Z yourself (for example 1.5 m). Existing crouch boom shortening still applies.
Extreme pitch, walls and fitting-room previews take safety/presentation priority
over exact requested distances. No collision-disable API is provided.

```lua
assert(Open77.camera.configureThirdPerson({
    style = "shoulder",
    anchor = "body",
    hip = { distance = 1.8, offset = vector3(0.65, 0, 1.5), fov = 65 },
    aim = { distance = 1.3, offset = vector3(0.65, 0, 1.55), fov = 55 },
    explore = { distance = 2.2, offset = vector3(0.5, 0, 1.5), fov = 68 },
    transition = 0.35,
    runSpeed = 2.5, runFov = 72, sprintFov = 78,
}))
-- Later, one patch; no Lua per-frame camera loop is needed.
assert(Open77.camera.configureThirdPerson({ shoulder = "left" }))
```

`thirdPersonState()` returns `configured`, `owned`, `active`, `shaking`,
`appliedFov`, and the complete configuration (`style`, `anchor`, `shoulder`,
`hip`, `aim`, `explore`, `transition`, `runSpeed`, `runFov`, `sprintFov`).
`style` names the base preset, not a guarantee its fields were never customized.
`active=false` while FPP, vehicle/scripted cameras or wardrobe own the view;
the configuration stays requested and resumes when the playable TPP rig returns.
`appliedFov` is the last rig-written FOV, not necessarily another camera's lens;
use `Open77.camera.view()` for the current rendered view.

## Shake

Configure/acquire a style first. The effect moves the pivot **before collision
resolution**, not the player or the gameplay aim. It is positional only: it
does not inject angular aim/recoil or camera roll.

```lua
local ok, reason = Open77.camera.shakeThirdPerson({
    amplitude = vector3(0.03, 0.015, 0.02), -- maximum metres per camera axis
    frequency = 8,                        -- Hz, 0.1–20
    duration = 0.65,                      -- seconds, 0.05–10
})
-- Optional early cancellation:
Open77.camera.stopThirdPersonShake()
```

Defaults: amplitude `(0.02,0.01,0.015)`, frequency 8 Hz, duration 0.5 seconds.
Each amplitude must be 0–0.2 m. The attack/release envelope avoids abrupt starts
and natural expiry. Explicit stop is immediate. A new shake replaces the old
one rather than accumulating unbounded effects. It expires in wall-clock time
even while another camera owns the screen. Do not trigger it every frame.

Reasons include `permission_denied:camera.style`, `camera_style_unavailable`,
`invalid_camera_style_fields`, `invalid_camera_style`, `invalid_camera_shake`,
`camera_style_owned`, `camera_style_not_owned`.

## Freeroam

- `/camchange`: cycle classic → shoulder → centered → classic, enabling TPP.
- `/camchange shoulder`, `/camchange centered`, `/camchange classic`: select.
- `/camchange left` or `/camchange right`: swap the selected style's shoulder.
- `/camchange shake`: preview a short shake; a style must already be selected.
- `/camchange reset`: release Freeroam's claim, restoring default framing/FOV.

Freeroam acquires no style on startup. Use `reset` before handing control to
another resource. This command changes only the sender's local camera; it is
not a server camera broadcast. Existing `camera.thirdPerson`, `camera.setFov`
and cinematic `camera.shake(id, ...)` retain their original signatures. Prefer
this configuration API over fighting a running rig with repeated `setFov` calls.

## Cinematic display

Freeroam provides `/cinematic` (toggle), `/cinematic on` and `/cinematic off`.
It hides the native HUD (including minimap), Open77 pages (including watermark,
chat history and Freeroam HUD), and native world labels/debug overlays. Black
letterbox bars slide in at the top and bottom. It does not change the camera,
pause the game, alter audio, or hide the interface on other players' screens.

```lua
-- Client API; requires permission "ui.vanilla.hud".
local ok, reason = Open77.hud.setCinematic(true, 0.12)
-- Second argument optional: height of EACH black bar, fraction of the viewport.
-- Finite 0.01..0.4, default 0.12. false releases only this resource's claim.
Open77.hud.setCinematic(false)
```

Claims are cooperative: the greatest requested bar height wins while multiple
resources hold the mode. Stop/reload, coroutine failure and session teardown
release ownership. Existing HUD visibility settings are preserved, including
hide claims held by the same resource for other purposes. New surfaces are
also masked; rendering is gated without destroying pages or changing their
`visible` property. The currently focused chat/menu is deliberately allowed
when opened, so you can type `/cinematic` again or use pause/settings. The
developer console remains accessible. Close these menus for a clean capture.

This native API is distinct from `open77_uikit:showCinematicBars`, which only
draws its own letterbox and optionally hides native HUD components.

Invalid arguments return `false, reason`: `permission_denied:ui.vanilla.hud`,
`invalid_cinematic_arguments`, `invalid_cinematic_height`, or
`cinematic_unavailable_on_this_host`. Omit optional arguments to use defaults;
do not pass strings, `nil`, or `0` as substitutes for a boolean/height.
