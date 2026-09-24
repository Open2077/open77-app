# Third person

Open77 gives players a real third-person view of their own character. It is a **presentation
layer**: a local body stands in for the player on screen, driven by the same replication contracts
that draw every other player. The player entity itself remains the only gameplay authority — what
you aim at, what you hit and what leaves on the wire are unchanged, in either view.

Nothing changes for other players. The stand-in body is local: nobody else ever sees it, and the
same bytes leave your client whether you are in first or third person.

```lua
permissions { "perspective.policy" }   -- server policy, or a client-side forced view
```

## The player's side

| | |
|---|---|
| Key | `f6` by default, reassignable, and remembered. `f7` also works and always will: it lives in the client itself, so it toggles the view even on a server that ships no perspective resource at all. Rebinding `f7` is not possible without a new build. |
| Look around without turning | **Hold the middle mouse button.** The body freezes its facing where it stood and the camera swings around it, so you can look behind yourself while still walking forward. Let go and the body catches up. Your aim is unaffected — the character keeps facing wherever the mouse points, so the shot goes where the reticle is, not where the body appears to look. |
| Remembered per server | The preference is stored per connection address, so two servers keep two independent choices. |
| Survives | Reconnecting, a resource reload, restarting the game. |
| While a panel has the keyboard | The key does nothing while chat, the pause menu or an admin surface owns input, so it can never fire underneath a text field. |

A player who has never asked gets first person.

## Enable, disable or temporarily force a view (client)

Requires the client update introducing `setThirdPerson` and
`clearThirdPersonOverride`. On older clients, check that the function exists
before calling it. Configuring a [camera style](third-person-camera.md) does
not enable or lock the perspective by itself.

```lua
-- Ordinary switch: the player can still change the view with F7.
Open77.perspective.setThirdPerson(true)         -- request third person
Open77.perspective.setThirdPerson(false)        -- request first person

-- Requires permissions { "perspective.policy" } in the resource manifest.
Open77.perspective.setThirdPerson(true, true)   -- force third person, block F7 -> FPP
Open77.perspective.setThirdPerson(false, true)  -- force first person, block F7 -> TPP

-- Release only this resource's lock, keeping the player's previous preference.
Open77.perspective.clearThirdPersonOverride()
```

`setThirdPerson(enabled[, force])` takes strict booleans (`force=false` by
default). It returns `true` when the request is accepted, or `false, reason`.
`force=false` also releases this resource's previous lock before requesting the
new view. It does **not** unlock another resource's lock or override server
policy. To forbid third person rather than merely switch away, use
`setThirdPerson(false, true)`.

A forced view is temporary and exclusive to the requesting resource instance.
Another resource's forced request returns `perspective_owned`. Ordinary
opposing requests (including F7) are refused without changing the pre-lock
preference. `clearThirdPersonOverride()` is idempotent, needs no capability,
and cannot clear someone else's lock. Stop/reload, coroutine error and host
teardown release the owner's lock automatically; the selected camera **style**
and the server policy are separate and are not changed by this API.

World safety and native vehicle/cutscene cameras, then the server's
`disabled`/`forced` policy, take priority over this local override. A conflicting
server policy rejects a new lock with `refused_by_policy`. If the server policy
changes while a lock exists, the policy wins; the still-owned lock resumes when
the policy permits it again. No Lua per-frame loop is needed.

`Open77.perspective.state()` includes `resourceForced` and
`resourcePerspective` (`"tps"`, `"fpp"`, or `"none"`). These describe the
requested lock, not a guarantee that it currently owns a vehicle/cutscene
camera; inspect `mode`, `camera`, `reason` and `settled` for the actual view.
An active local lock reports `reason="resource_forced"` and `allowed=false`.

Other errors include `invalid_perspective_arguments`,
`permission_denied:perspective.policy` (forced calls only), and
`perspective_unavailable_on_this_host`. The API is client-local: use the existing
server `setPolicy` API below for all players, or a server event to ask a selected
client resource to apply a local lock. It is not a networked player animation.

## Server policy

Four values. The platform default is `allowed`, and a server whose resources declare nothing
sends nothing — every client simply keeps `allowed`. That is the intended behaviour, not a
fallback.

| Policy | Meaning |
|---|---|
| `disabled` | Third person is not available here. |
| `allowed` | The player chooses. Unasked players get first person. |
| `default` | The player chooses. **As shipped this behaves exactly like `allowed`** — the unasked default it is supposed to change is a build-time constant nothing writes yet, so it is still first person. Pass `default` if you want to state the intent; do not rely on it to put anyone in third person. |
| `forced` | The server pins a view. The player's own request is still **remembered**, so lifting the pin gives them back what they wanted rather than dropping them somewhere arbitrary. |

```lua
-- server_script; the manifest needs "network.events" and "perspective.policy"
AddEventHandler("onResourceStart", function(name)
    if name ~= GetCurrentResourceName() then return end
    Open77.perspective.setPolicy("allowed")
end)

-- A stealth round where the camera must not see around corners:
Open77.perspective.setPolicy("forced", "fpp")

-- Back to the players' choice, third person for anyone who never asked:
Open77.perspective.setPolicy("default", "tps")
```

Call it from the resource's **start path**. A reload replaces the VM and the policy lives in that
VM, so a resource that declared its policy from somewhere else comes back declaring nothing.

**Let one resource own the policy.** If two declare one, both answer a joining client and the last
packet wins — the same caveat `Open77.notifications` carries.

## When the view hands itself back

Third person is not a mode that overrides everything. Several world states take the view back
automatically, and give it back afterwards. This is by design: the vanilla body and the native
cameras are the fallback, and they are always allowed to win.

| State | What happens |
|---|---|
| In a vehicle | The engine owns the view, and it obeys the player's own vanilla preference. |
| Scenes and scripted sequences | Native camera. |
| Photo mode | Native camera. |
| Death and ragdoll | Native camera. |
| Sliding, and vaulting | First person for the length of the move, then straight back. |
| The pre-game UI, including character creation | The engine owns the screen for as long as it needs it. |

Each handover returns the player's real body and every effect that belongs to it — muzzle flash,
shells, footsteps, audio — without the player doing anything.

**Why sliding is on that list, and why it briefly was not.** The stand-in body is not your
character's body: it runs the animation graph the game gives its NPCs, and that graph has no
slide. On 2026-08-30 a way to drive it into a forward charge was found and measured, the handover
was removed, and third person kept the view through a slide for the first time. Played rather
than measured, it did not read as a slide at all — the body simply kept walking, because the
forward clip the charge asks for is not carried on that body. So the handover is back the same
day. **A slide that renders as a walk is worse than a slide that renders through your own eyes**,
and that is the trade this is settling; nothing about your character or your movement changes
either way, only which camera you watch the second from.

Vaulting is on the list for the same kind of reason and has never come off it.

The search for a real slide clip is closed rather than merely unfinished: the shipped game has no
slide animation authored for this body, in its data, in its animation catalogue, or in its
scripts. If one is ever added, the handover comes off again — the machinery that drives it is
still in place and still running.

## The crosshair

**Third person draws its own.** The vanilla reticle belongs to the weapon's HUD and is anchored to
the first-person aiming camera, so with a third-person camera it has nothing to anchor to and is
simply not drawn — which is why aiming with a gun used to leave the screen with no crosshair at
all. The client bootstrap `open77_reticle` draws a centred overlay while aiming with a
weapon in third person, including native F7 on servers without `open77_perspective`.
It follows the game's aiming state, not a hard-coded mouse button. It hides when
aim is released, the weapon is holstered, a menu captures input, or an engine/first-person
camera takes over. Vanilla hip-fire and first-person HUD behaviour are unchanged.
The overlay takes no clicks and cannot swallow input.

## Reading the aim from a resource

`Open77.character` answers what the player is doing with a weapon, and what is in front of it. It
works the same in both perspectives.

| Call | Answers |
|---|---|
| `Open77.character.isAiming()` | Aiming down sights. `boolean`, or `nil, reason`. |
| `Open77.character.isFiring()` | The trigger is **held** — the `IsPedShooting` equivalent, not a shot event. |
| `Open77.character.aimState()` | `aiming`, `firing`, `weaponDrawn` and `stateSequence`, in one snapshot. |
| `Open77.character.aimedEntity()` | What is under the crosshair, or a bare `nil` for scenery. |

The first three require the `player.aim.read` permission. `aimedEntity()` requires **both**
`player.aim.read` and `world.query`: where the player is looking is a fact about the player, and
what is there is a world entity read, so granting the first must not quietly hand out the second.

```lua
permissions { "player.aim.read", "world.query" }
```

### Do not read `perspective.state().aiming` for this

That field exists and is not the same thing. It has exactly two writers: a trigger pull, and the
third-person self-view's per-frame gate — and the second is skipped entirely whenever the
self-view session is not active, which is to say **in first person nothing writes it at all**. A
resource reading it in FPP sees whatever the last shot said, for as long as the player does not
shoot again. It was published so a player refused a hip-fire shot could see why; it is not an aim
poll, and it never was one.

`Open77.character.isAiming()` reads the player's own weapon animation graph instead. The call costs
no raycast, advances no sequence and disturbs no ballistics.

### `aiming` is a latched mirror, and `stateSequence` is how you tell

Nothing samples the aim on a timer. The observer records whatever the animation graph last pushed,
and between two pushes the bit simply keeps its previous value. So `aiming == true` on its own
cannot distinguish *aiming right now* from *the last thing this feature ever said was aim, some
minutes ago* — and the second reads exactly like the defect where an aim pose never comes down.

`aimState().stateSequence` rises on every observed change. Difference it across two reads and the
question is settled:

```lua
local before = Open77.character.aimState()
Wait(500)
local after = Open77.character.aimState()
if after.aiming and after.stateSequence == before.stateSequence then
    -- held for at least half a second, or the graph has gone quiet
end
```

It is evidence, never a gate. Nothing times an aim out, because a player may hold one as long as
they like.

### What `aimedEntity()` answers with

The engine's own look-at target, not a physics ray — a physics ray answers with geometry and carries
no entity reference at all. Three outcomes, kept apart on purpose:

| Result | Meaning |
|---|---|
| a table | Something is under the crosshair. |
| a **bare** `nil`, no second value | Pointing at scenery, or at nothing. An answer. |
| `nil, reason` | The question could not be asked — permission, or no target system. |

The table carries `engineEntity`, `className`, `kind`, `family`, `position` and `distance`, plus
`entity` and one of `playerId` / `vehicleId` / `npcId` when the thing is an Open77 body. `family` is
the raw class family and `kind` is that family refined by ownership — the same refinement
`Open77.camera.aimRay({ entities = true })` applies, from the same classifier, so a vanilla crowd
ped reads `populationNpc` through both and a server-spawned one reads `npc`. A resource branching on
`kind == "npc"` therefore never acts on a body the server does not own.

```lua
local target = Open77.character.aimedEntity()
if target == nil then return end                     -- nothing there
if target.kind == "player" then
    reportAimedAt(target.playerId)
elseif target.kind == "trafficVehicle" then
    -- vanilla traffic: no vehicleId, and no server write will reach it
end
```

## Limitations

These are measured, not guessed. Cyberpunk 2077 2.31.

**The shot leaves from the gun that fires, not the gun you see.** These are two different weapons.
The body you see holds the stand-in's weapon; the one that actually fires, and that the muzzle
flash and tracer come from, is your own, and in third person it sits higher — measured at 1.45 m
above your feet standing, 1.56 m when aiming lifts it to eye level. Damage and muzzle flash agree
with each other exactly, so nothing shoots from anywhere other than where it appears to from the
engine's point of view; what is off is the gun drawn on the body. Measured, not yet closed.

**You have to be aiming for the body to raise its weapon.** Press the trigger from the hip and the stand-in keeps the gun down. This is a rule now, and it was not always one: for a while the firing pose was withheld because the stand-in could not resolve which weapon family it was holding, and a withheld pose looks exactly like a forbidden shot. Repairing the family resolution took the block away with the defect -- which is how you learn a behaviour was an accident. It was asked for back, so it is written down where it will survive the next repair. What it withholds is the *pose*: the shot still fires, still costs ammo, and still cannot cross cover that blocks the barrel -- that gate is separate and unchanged.

**Some animations are deliberately silent.** Jumping, side-stepping and emotes are measured but
not played on the stand-in body. The NPC animation graph the body runs has no clip for those
states, and sending them anyway puts the body in its bind pose — a T-pose, which is worse than
nothing. They stay silent until a clip is validated on this rig.

**The body does not crouch.** The camera anchor does dip, so the framing is right while the body
is not.

**Interaction prompts follow the camera, not the body.** The engine decides which interaction to
offer from where the *camera* is looking, and in third person the camera sits about three metres
behind you. Standing against a car door does not necessarily offer it. A body-anchored prompt for
vehicle entry exists and ships **disabled**; the engine's own prompt is unchanged.

**Two things this view will not do.** Cinematics, braindance, finishers, cyberware animations,
photo mode and mirrors are out of scope by design and fall back cleanly to the native camera. And
the toggle is client-local: a server can set a policy, but it cannot watch a specific player's
current view.

**The camera can be misplaced when aimed steeply downward.** Measured at up to 1.4 m at -80
degrees. The view does not flip and the body stays drawn, but the framing is not what the rig
asked for. Repair is pending.

**Your character wears what your character owns.** A body that owns no clothing appears in
underwear, because that is what it is wearing — a V straight out of the creator wears exactly
that, and first person never shows it. Dress the character and the third-person body follows.

## See also

| | |
|---|---|
| [Vehicles](vehicles.md) | Seats, authority and the vehicle APIs. |
| [Interactions](interactions.md) | Prompts, choices and layers. |
| [Chat](chat.md) | Input focus, which the perspective key shares. |

## `aiming` here is the older, looser read

`perspective.state()` carries an `aiming` field and costs no capability, while
`Open77.character.isAiming()` answers the same question behind
`player.aim.read`. Both spellings ship, and which one you should use is not a
matter of taste.

**Prefer `Open77.character.isAiming()`.** The field here has two writers -- a
trigger pull, and the third-person self-view's per-frame gate -- and the second
is short-circuited away whenever that session is inactive, so **in first person
nothing writes it**. A resource reading it in first person sees whatever the
last shot said until the player shoots again. The gated read observes combat
directly and does not have that hole.

The older field stays ungated because it already shipped that way, and
tightening a surface underneath resources that already call it would break
installs to fix an inconsistency nobody is exploiting. The newer read is gated
because a new surface starts closed: relaxing a capability later costs nothing,
and adding one later breaks every manifest that was written without it.
