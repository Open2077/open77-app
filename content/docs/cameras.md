# Scripted cameras

Put the view where your resource wants it — a character creator orbiting the
player's face, a shop that frames the rack, a dealership turntable, a cinematic
intro — and be certain the player gets their own view back.

Client only, and everything here is behind the `camera.script` permission —
except [Spectating](#spectating), which is driven from the **server** with
`players.spectate` and needs no client resource at all.

```lua
local cam = assert(Open77.camera.create({
  position = vector3(pos.x, pos.y - 2.0, pos.z + 1.7),
  lookAt   = 0,                      -- entity 0 is the local player's body
  fov      = 45,
}))

local ok, blended = Open77.camera.activate(cam, { blendMs = 600 })
if not ok then print('no camera: ' .. tostring(blended)); return end
blended:await()                      -- the shot is up

-- ... later ...
Open77.camera.deactivate({ blendMs = 400 })
Open77.camera.destroy(cam)
```

---

## The model in one page

**A camera is a definition, not a view.** `create` makes a camera and returns an
id; nothing is rendered until you `activate` it. You may hold as many
definitions as you like (16 per resource), and exactly one of them can be the
live view at a time.

**Ownership is per resource, and the view is per client.** A camera belongs to
the resource generation that made it — another resource cannot move it, point
it, shake it or destroy it. The *view* belongs to at most one resource at a
time: a second resource asking for it is **refused, with the holder named**, and
never silently served.

```lua
local ok, reason = Open77.camera.activate(cam)
-- ok == false, reason == "camera_held_by:open77_creator"
```

That refusal is the whole design. Stealing the view would leave two resources
each believing they are driving, and the one that is not would keep issuing
writes that vanish.

**Everything is world space** — `position` and `lookAt` are world coordinates,
except an attached camera's `offset`, which is in the parent entity's own frame
(X right, Y forward, Z up). Vectors and plain `{ x =, y =, z = }` tables are
accepted everywhere, and every vector this API returns is a plain table that
`vector3()` accepts.

**Failures are values.** Every call returns `nil, reason` or `false, reason`
with a stable snake_case token. The complete list is at the bottom of this page.

---

## What is reachable, and what is not

This matters more than usual here, because the shape a camera API *looks* like
it should have is not the shape this engine supports. The evidence is in
[`docs/research/scripted-cameras.md`](../docs/research/scripted-cameras.md).

**Reachable.** A world position, a world orientation, a look-at that tracks a
point or an entity every frame, an attachment that follows a moving parent, a
field of view, a blended activation and deactivation, a shake, and the
screen→world ray.

**Not reachable, and why:**

* **A camera independent of the player's body.** 2.31 has no creatable camera
  object. The only camera component whose transform writes are both accepted and
  *rendered* is the one on the player, and it is parented to the body. Open77
  converts your world pose into that component's local frame every frame, which
  is what makes a world position work at all — but the camera is still a child
  of the player. **If the body goes, the camera goes.**
* **Streaming follows the player, not the lens.** A camera parked far from the
  body renders whatever is streamed *for the body*: missing geometry, missing
  NPCs, unloaded interiors. `activate` therefore refuses a camera more than
  **250 m** from the player with `invalid_argument`, so the failure is a named
  refusal rather than a grey frame. Move the player if you need to move the
  shot that far.
* **One view at a time.** Many definitions, one active.
* **No collision.** A camera placed inside a wall is inside the wall. The
  third-person rig's spring arm does not apply here, deliberately: a cinematic
  camera that refuses to go where it is told is worse than one that clips.

---

## The release rules

**A stuck camera is indistinguishable from a crash.** Read this section before
you write the shot.

The view comes back by itself, on the next frame, in every one of these cases.
You do not have to handle them, and you cannot opt out of them:

| What happens | Reason your pending promise is rejected with |
|---|---|
| Your resource is stopped | `resource_stopped` |
| Your resource is reloaded | `resource_stopped` (the new generation starts with nothing) |
| A Lua coroutine in your resource errors | `resource_error` (your camera *definitions* go too — the coroutine that was going to tidy up is dead, so re-`create` after an error) |
| The player dies | `player_died` |
| The player's body becomes unreadable for ~half a second | `player_unavailable` |
| The world unloads, the player disconnects, the session ends | `world_exit` |
| The client shuts down | `client_shutdown` |
| You destroy the camera you are looking through | `camera_destroyed` |
| You activate a different camera of your own | `camera_superseded` |
| You call `deactivate` | `camera_deactivated` |

Two consequences worth writing down:

* **A camera does not survive a death.** After a respawn the camera *definition*
  still exists, so you can put the shot back up with one `activate` — but you
  have to ask. That is on purpose: the engine's own death camera writes the same
  component, and competing for it is a fight nobody wins.
* **Never leave an `await` without a failure branch.** Every release above
  rejects the promise rather than dropping it, precisely so your coroutine wakes
  up and can tidy the rest of your state.

```lua
local ok, blended = Open77.camera.activate(cam, { blendMs = 600 })
if ok and blended then
  local _, why = blended:await()
  if why then
    -- the shot never happened: the player died, we were reloaded, something
    -- took the view. Put the UI back the way it was.
    closeCreatorUi()
    return
  end
end
```

---

## How it composes with first/third person

`Open77.perspective` and the arbiter behind it own six presentation values
together — camera, body, input, weapon, effects, audio — and change them as one.
A scripted camera does not sneak past that; it tells it.

While you hold the view, the arbiter reports:

```
camera=engine  reason=scripted_camera
```

which is the same answer it gives for a cutscene: *stand down, do not compete
for the camera, do not take back a camera we did not lend.* The third-person
rig is switched off for the duration and restored when you let go.

Three things follow:

* **`activate` refuses while a perspective transition is in flight**, with
  `camera_unavailable`. Retry a frame later. Taking the camera mid-transition
  would leave the body and the view disagreeing for as long as the transition
  runs.
* **Death and ragdoll outrank you.** Both fall back to first person, and the
  registry releases your camera from its own side at the same moment, so the two
  never disagree.
* **The arbiter never moves the player.** Neither does this API. A scripted
  camera is presentation only: the body stays exactly where gameplay put it,
  which is why a player can walk out from under your shot. If you need them to
  stay put, `Open77.character.setFrozen` is the tool, and it is a separate,
  separately-permissioned decision.

---

## Spectating

**Server side**, permission `players.spectate`. One call puts an admin behind
another player's shoulder and takes his body out of the world while he is there.

```lua
Open77.players.spectate(adminId, suspectId)     -- start
Open77.players.spectate(adminId, false)         -- stop, and give the body back
```

Three things happen together, and they are one transaction:

1. the spectator is **ghosted** — he cannot block, body-check or be walked into;
2. his body is **hidden** — nobody sees an admin standing in the fight he is
   filming, and his nameplate goes with him;
3. his client is told to put a [`follow` camera](#open77camerafollowentity-options---camid-promise--nil-reason)
   on the target.

If the body cannot be taken away, **nothing** is applied and nothing is sent.
That order is the point: the half that can strand a player is the body, so it
goes first and it fails closed. The camera is the half that can only fail
temporarily — an unstreamed target, a resource already holding the view — and it
retries by itself every frame until it takes.

```lua
Open77.players.spectate(adminId, suspectId, {
  blendMs  = 400,   -- 0..10000, how long the cut takes
  distance = 5.0,   -- metres behind the target
  height   = 2.0,   -- metres above
})
```

Reads, both behind `players.life.read`:

```lua
Open77.players.spectating(adminId)   --> targetId, or 0
Open77.players.spectators(suspectId) --> { adminId, ... }
```

### Move the ghost to the target

The world streams around the **spectator's own body**, not around the camera.
A target on the other side of Night City gives a correctly-aimed camera looking
at unstreamed space. The spectator is invisible and non-solid by then, so
landing on top of somebody costs nothing:

```lua
Open77.players.spectate(adminId, suspectId)
Open77.players.teleport(adminId, Open77.players.position(suspectId))
```

Do the same again whenever the target travels far — a vehicle chase across two
districts will outrun the spectator's streaming otherwise.

### Every way it ends

This is the list that matters, because a camera you cannot give back reads to a
player exactly like a crash, and an invisible admin is worse than a stuck
camera. Each of these restores **both** halves:

| It ends when | Reason token |
|---|---|
| the caller stops it | whatever the caller passed |
| the target dies, or is revived or respawned | `target_not_alive` |
| the spectator dies | `spectator_not_alive` |
| either side disconnects | `target_gone` / `spectator_gone` |
| either side changes routing bucket | `bucket_changed` |
| either side reconnects | `reconnected` / `target_reconnected` |
| the resource that started it stops, reloads or errors | `owner_released:<owner>` |
| the client's session changes (host-side) | the camera is dropped locally |

The spectator's body is restored **to what it was**, not to a default: an admin
a jail script had already ghosted stays ghosted, and a body another resource has
since hidden stays hidden. Only the ghost and the hide this session made are
undone.

Retargeting — `spectate(adminId, otherId)` while a session is live — swaps the
shot without ever putting the body back in the world for a frame.

### Refusals

| Token | Meaning |
|---|---|
| `permission_denied:players.spectate` | the manifest does not declare it |
| `invalid_player` / `invalid_target` | not a positive integer id |
| `cannot_spectate_self` | a player cannot watch his own shoulder |
| `player_not_found` / `target_not_found` | no life state for that id |
| `spectator_not_alive` / `target_not_alive` | one of them is dead or mid-transition |
| `different_bucket` | the target's body is not streamed to the spectator at all |
| `target_is_spectating` | chains are refused: the middle player's camera is already elsewhere |
| `not_spectating` | stopping a session that does not exist |
| `invalid_argument` | a blend, distance or height outside its range |
| `life_unavailable` | the host has no life service (a test harness) |

### What a single client cannot prove

Spectating has no meaning with one client. On one machine you can prove the
refusals, the permission gate and that the body comes back; you cannot prove
that the picture is of somebody else. **Two clients, two accounts** — see the
integrator scenario in the row's report.

---

## Reference

### `Open77.camera.create(options) -> camId | nil, reason`

| Option | Type | Meaning |
|---|---|---|
| `position` | vector3 | World position. Required unless `attachTo` is given. |
| `attachTo` | entity | Parent the camera to an entity. `0` is the local player's body. |
| `offset` | vector3 | Offset in the parent's frame (X right, Y forward, Z up). Accepted as `position` too. |
| `lookAt` | vector3 **or** entity | A world point, or an entity to track. Re-solved every frame. |
| `rotation` | table | Used when there is no `lookAt`. Either a quaternion `{ x, y, z, w }` or Euler degrees `{ pitch, yaw, roll }`, any subset. |
| `fov` | number | 5..170 degrees. Omit, or `0`, to leave the engine's field of view alone. |

### `Open77.camera.setTransform(camId, position?, rotation?)`
### `Open77.camera.setTransform(camId, { position =, rotation =, fov = })`

Moves and/or turns a camera. Cheap enough to call every frame — that is how you
write a dolly. Setting a `rotation` clears a previous `lookAt`: an explicit
rotation is an explicit aim, and it would be a trap to accept the call and let a
stale look-at quietly override it.

### `Open77.camera.lookAt(camId, position | entity)`

Point the camera at a world point or at an entity. Entity `0` is the local
player. The aim is re-solved **every frame**, so a tracked entity that moves
stays centred. An entity that streams out holds the last aim rather than
snapping the camera to the world origin.

### `Open77.camera.attach(camId, entity, offset?)`

Parent the camera to an entity: it follows the parent's position *and* rotation,
so `attach` plus a fixed rotation is a dealership turntable. Entity `0` is the
local player.

`Open77.camera.attach()` with **no arguments** is the older call that restores
the player's own camera, and it still means exactly that.

### `Open77.camera.detachFrom(camId)`

The opposite of the scripted `attach`. Not spelled `detach`, because
`Open77.camera.detach()` already means "move the player's own camera off their
eyes" and all of its arguments are optional, so there is no arity left to
overload. The camera keeps the pose it had; your next `setTransform` places it.

### `Open77.camera.activate(camId, { blendMs }) -> true, promise | false, reason`

Take the view. `blendMs` interpolates from wherever the view currently is; omit
it, or pass `0`, for a cut. The second return value is an
[`Open77.Promise`](fivem-compatibility.md) that resolves when the blend
completes and rejects with a reason if the shot is released first. A cut settles
before the call returns and therefore hands back no promise — there is nothing
left to wait for.

### `Open77.camera.deactivate({ blendMs }) -> true, promise | false, reason`

Give the view back, blending to the player's own eyes. Only the holder may.

### `Open77.camera.destroy(camId)`

Destroys a camera. If it is the live one, the view comes back.

### `Open77.camera.shake(camId?, preset, amplitude?, ms?)`

Presets: `hand`, `drunk`, `explosion`, `earthquake`. `amplitude` defaults to
`1.0` and is capped at `4.0`; `ms` defaults to 500. Additive on top of the
resolved pose, so it composes with a blend and with a look-at. Omit `camId` to
shake the camera you are holding.

### `Open77.camera.stopShake(camId)`

### `Open77.camera.cameras() -> table`

Your cameras and whether you hold the view:

```lua
{ held = true, holder = "open77_creator", phase = "holding",
  activeCamera = 1, blendRemainingMs = 0,
  cameras = { { id = 1, active = true, attached = false, aim = "entity",
                fov = 45.0, shaking = false, shakePreset = "hand",
                shakeRemainingMs = 0, position = { x = …, y = …, z = … } } } }
```

`holder` names whoever has the view, **including somebody else** — it is the one
question a `camera_held_by:` refusal leaves you asking. `phase` is `idle`,
`blending_in`, `holding` or `blending_out`.

### `Open77.camera.unproject(x, y) -> { origin, direction }`

The world ray behind a screen point. `x` and `y` are `0..1` with the origin at
the **top left** — exactly the frame `Open77.camera.project` returns, so the two
round-trip:

```lua
local screen = Open77.camera.project(worldPoint)
local ray    = Open77.camera.unproject(screen.x, screen.y)
-- ray.direction now points from ray.origin back at worldPoint
```

Ungated, like `project` and `view`: it reads the camera, it does not move it.

### `Open77.camera.follow(entity, options?) -> camId, promise | nil, reason`

Rides an entity: the camera sits behind it, aims at it, and both are re-solved
every frame, so the shot stays put while the target walks, turns, drives or
falls over. Entity `0` is the local player's own body.

```lua
local cam = assert(Open77.camera.follow(targetEntity, {
  distance = 5.0,   -- metres behind, 0..100        (default 4.0)
  height   = 2.0,   -- metres above,  -50..50       (default 1.5)
  side     = 0.0,   -- metres right,  -50..50       (default 0)
  fov      = 0,     -- 0 leaves the field of view alone
  blendMs  = 400,
}))
```

`distance`, `height` and `side` are in the **target's own frame**, which is what
makes `distance` mean "behind him" rather than "north of him".

**One camera per resource, reused.** Calling `follow` again with a different
entity retargets the same camera and returns the same id; it does not create a
second one. That is deliberate — a resource that follows the nearest player once
a second would otherwise exhaust its sixteen-camera budget in sixteen seconds
and start failing for a reason that has nothing to do with what it asked for. It
also means each call supersedes the previous call's blend promise, which then
settles as `camera_superseded`.

`Open77.camera.unfollow({ blendMs })` gives the view back **and** destroys the
camera. A second call answers `false, "not_following"`.

Nothing here is a new way to hold the view: `follow` is `create` + `lookAt` +
`activate`, so every release rule on this page applies to it unchanged.

**The streaming ceiling applies and is not hidden.** The world streams around
the *player's body*, not around the lens. Following a target three hundred
metres away gives you a correctly-placed camera looking at unstreamed space —
an empty frame, not an error. Move the body to the target first; the
server-side `Open77.players.spectate` shows the pattern.

### Unchanged calls

`detach`, `attach()`, `thirdPerson`, `orbit`, `clearOrbit`, `setFov(degrees)`,
`view`, `project` and `aimRay` keep their exact previous meaning and their
previous permissions. `orbit` / `clearOrbit` stay behind `camera.preview`.

### Why `camera.script` and not `camera.preview`

`camera.preview` grants a yaw offset *inside* the third-person rig. It cannot
move the view off the player and it cannot take the view away from gameplay,
which is why a clothing shop can be given it without a second thought.

A scripted camera can put the view anywhere, look through a wall, and leave a
player unable to see their own body. Those are different powers, and an operator
has to be able to grant one without the other.

### Failure tokens

| Token | Meaning |
|---|---|
| `permission_denied:camera.script` | the manifest does not declare the permission |
| `camera_unavailable_on_this_host` | the server-side runtime, or a build without the native |
| `invalid_camera_options` | `create` was not given a table |
| `invalid_camera_position` / `invalid_camera_offset` / `invalid_camera_look_at` | not a readable vector, or not finite |
| `invalid_camera_rotation` | neither a quaternion nor Euler degrees |
| `invalid_camera_fov` / `invalid_argument` | field of view outside 5..170, or a non-finite number |
| `invalid_camera_id` / `camera_not_found` | no such camera |
| `camera_not_owned` | it belongs to another resource, or to a previous generation of yours |
| `camera_held` / `camera_held_by:<resource>` | another resource has the view |
| `camera_not_active` | you do not hold the view |
| `camera_budget_exhausted` | 16 cameras per resource, 64 per client |
| `camera_unavailable` | the player is dead or unreadable, or a perspective transition is in flight |
| `invalid_blend_ms` | not a number in 0..60000 |
| `invalid_shake_preset` / `unsupported_shake_preset` / `invalid_shake_argument` | see `shake` |
| `empty_camera_transform` | `setTransform` was given nothing to change |
| `invalid_screen_point` | `unproject` was given a non-finite coordinate |
| `invalid_entity` | `follow` was given something that is not an entity id |
| `invalid_follow_distance` / `invalid_follow_height` / `invalid_follow_side` | outside the range in `follow` |
| `not_following` | `unfollow` with no follow camera |
| `camera_superseded` | the blend promise of a `follow` a later `follow` replaced |

---

## Worked example: a character creator

The shape the row was measured against. Two shots — a face camera and a
full-body camera — a blended cut between them, and a hand-back that cannot be
skipped.

```lua
-- open77_creator/client.lua
local face, body, holding

local function shots()
  local me = Open77.character.position()          -- the local player's feet
  face = assert(Open77.camera.create({
    position = vector3(me.x, me.y - 0.85, me.z + 1.70),
    lookAt   = 0,                                  -- the player's own body
    fov      = 32,
  }))
  body = assert(Open77.camera.create({
    position = vector3(me.x, me.y - 2.60, me.z + 1.10),
    lookAt   = vector3(me.x, me.y, me.z + 0.95),
    fov      = 48,
  }))
end

local function close(reason)
  if not holding then return end
  holding = false
  Open77.camera.deactivate({ blendMs = 450 })
  if face then Open77.camera.destroy(face); face = nil end
  if body then Open77.camera.destroy(body); body = nil end
  Open77.ui.close('creator')                       -- your own UI, whatever it is
  if reason then print('creator closed: ' .. reason) end
end

function OpenCreator()
  shots()
  local ok, blended = Open77.camera.activate(face, { blendMs = 700 })
  if not ok then
    -- `camera_held_by:<resource>` names who to blame; anything else is a
    -- refusal we simply have to respect.
    print('creator cannot take the camera: ' .. tostring(blended))
    return false
  end
  holding = true
  if blended then
    local _, why = blended:await()
    if why then close(why); return false end       -- released before we got there
  end
  Open77.ui.open('creator')
  return true
end

-- A cut to the body shot. Same owner, so it is allowed, and the face shot's
-- promise rejects with `camera_superseded` rather than hanging.
function ShowBody()
  if not holding then return end
  local ok, blended = Open77.camera.activate(body, { blendMs = 350 })
  if ok and blended then blended:await() end
end

-- A slow turntable while the body shot is up.
local angle = 0.0
CreateThread(function()
  while true do
    Wait(16)
    if holding and Open77.camera.cameras().activeCamera == body then
      angle = (angle + 0.6) % 360.0
      local me = Open77.character.position()
      local radians = math.rad(angle)
      Open77.camera.setTransform(body, vector3(
        me.x + math.sin(radians) * 2.6,
        me.y - math.cos(radians) * 2.6,
        me.z + 1.10))
      -- `lookAt` was set at create time and is re-solved every frame, so the
      -- body stays centred as the camera swings.
    end
  end
end)

function CloseCreator() close(nil) end

-- Belt and braces. Every path below already releases the camera inside the
-- client; this only puts YOUR state back.
AddEventHandler('onClientResourceStop', function(name)
  if name == Open77.resource.name() then close('resource_stopped') end
end)
```

Manifest:

```lua
resource 'open77_creator'
version '1.0.0'
client_scripts { 'client.lua' }
permissions { 'camera.script' }
```

---

## Integrator checklist

This row cannot be proved by reading and it was not run in game. Every item
below is a thing to look at, in order; the recovery cases are the ones that
matter and they come first.

**Setup.** One client, connected, alive on foot in a street (not an interior).
A test resource with `camera.script`, exposing `/cam on`, `/cam off`,
`/cam shake` and `/cam kill` chat commands.

### Recovery — do these first

1. **Kill the holder.** With a camera held, `stop open77_camtest` from the
   server console. **The player must be back behind their own eyes within one
   frame.** Not a second, not after a blend — the restore is synchronous on the
   next tick. If the view stays put, stop here and report it.
2. **Error the holder.** Make the resource throw while holding (`/cam kill`
   calling `error('boom')`). Same result, plus `resource_error` in the log.
3. **Reload the holder.** `restart open77_camtest`. View returns; the new
   generation starts with no cameras; the old id now answers `camera_not_owned`.
4. **Die.** Take a camera, then jump off something high enough. The view must
   leave the scripted shot the moment the death screen begins — not after it.
   `Open77.camera.cameras()` then reads `held = false`.
5. **Respawn and re-take.** `activate` the same camera id again; it must work
   without a `create`.
6. **Disconnect while holding.** Reconnect. No camera, no leftover
   `detached=yes` in `camera.state`, and `perspective.state` shows
   `single_camera` with zero new violations.
7. **Two resources.** Start a second resource that also asks for the camera.
   Its `activate` must answer `camera_held_by:open77_camtest`. Stop the first;
   the second can then take it.

### The shot itself

8. **It goes where it is told.** `create` a camera at a known world position
   with a known `lookAt`, `activate` with `blendMs = 0`, and compare
   `Open77.camera.view().position` against what you asked for. They must agree
   to centimetres. *(This is the one inference in the whole row: the write is
   the shipped AV-chase write, but it has not been observed on foot.)*
9. **The blend is a move, not a jump.** `activate` with `blendMs = 1500` and
   watch. The view must travel; the promise must resolve at the end, not at the
   start.
10. **The hand-back does not snap.** `deactivate({ blendMs = 800 })` must slide
    back to the player's eyes and finish exactly on them.
11. **Look-at tracks.** Point at a moving NPC and walk around; it stays centred.
12. **Attach follows.** `attach` to a vehicle and drive it; the camera rides
    with it and does not drift or telescope over a minute of driving.
13. **Field of view.** `fov = 20` then `fov = 90`; both must take, and
    `deactivate` must leave the player's own field of view as it was.
14. **Shake stops.** `explosion`, 1.0, 400 ms. It must decay and come **exactly**
    to rest — a shake that leaves a permanent offset is the failure to look for.
15. **Distance refusal.** `create` a camera 400 m away and `activate` it:
    `invalid_argument`. Then place one 200 m away and look — this is where to
    check whether the streaming ceiling is really 250 m, and to replace the
    number with a measurement.
16. **`unproject` round-trips.** `project` a world point, `unproject` the result,
    and raycast along the ray: it must hit that point. Record which branch ran
    (the native or the pinhole fallback) — that is an open question in
    `docs/research/scripted-cameras.md`.

### Spectating — two clients, two accounts

None of these means anything on one machine, and that is the whole note: with
one client you can prove the refusals and that the body comes back, and nothing
else. Run the second client under its own identity profile so the two are
different accounts.

21. **The shot is of somebody else.** Spectate from A to B, screenshot A. The
    frame must show B, from behind and above. This is the check a single client
    cannot make.
22. **B cannot see A.** Screenshot B while A is spectating. A's body must be
    absent, and A's nameplate with it.
23. **A cannot block B.** Walk B through where A is standing. No collision.
24. **Stop gives both halves back.** `spectate(A, false)` — A is back behind his
    own eyes, visible to B, and solid again.
25. **B dies.** A must be handed back automatically, without anybody calling
    stop. Same for B disconnecting, B changing bucket, and A dying.
26. **The resource stops.** `stop` the spectating resource while a session is
    live. A must come back — this is the path that would otherwise leave an
    invisible admin with nobody left to show him.
27. **Distance.** Spectate a target 400 m away. Expect an empty frame, then
    `Open77.players.teleport(A, Open77.players.position(B))` and expect the shot
    to fill in. Record the distance at which it actually degrades; the 250 m in
    this page is a limit on world-anchored cameras, not a measurement of this.
28. **Re-stream.** Have B drive away and come back until his proxy re-streams.
    The shot must follow him across it rather than freezing on an old entity.

### Composition

17. **Third person.** Engage third person, then take a camera. `perspective.state`
    must read `camera=engine reason=scripted_camera`. Release; third person must
    come back on its own.
18. **Mid-transition refusal.** Press the perspective key and `activate` in the
    same frame; one of the two attempts must answer `camera_unavailable`.
19. **Vehicle.** Take a camera while driving. The vehicle row outranks nothing
    here — both are engine-owned — but the AV chase and a scripted camera must
    not fight; whichever wins must win consistently.
20. **Photo mode.** Open photo mode while holding. Untested and expected to be
    the messiest case; record what happens.
