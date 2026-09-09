# Cordon — battle royale

Cordon is Open77's 64-slot battle royale for Cyberpunk 2077. Players queue in
staging, deploy to surveyed ground, collect equipment and survive a moving
cordon. Solo, Duo and Squad formats share the same match rules.

This page describes the current source, reviewed on **2026-09-05**. A public
server can run an older released pack: its listing is not proof that these
changes are deployed. For design and dated evidence, see the
[mode plan](../docs/gamemode-cordon-plan.md),
[September review](../docs/cordon-review-2026-09-05.md) and
[UI review](../docs/cordon-ui-2026-09-05.md).

## Joining and controls

The current lobby is Afterlife. Staging players can move and sprint; combat and
placement are owned by the mode. Joining an ongoing server leaves you in staging
until a later match.

| Default control | Action |
|---|---|
| **Y** | Join or leave the next match's queue. |
| **M** | Open the tactical map; Escape closes it. |
| **F**, on an active loot prompt | Request the nearby container's contents. |
| **END** | Start applying an armor plate. |
| **F8** | Start using a healing item. |
| **F**, on a downed squadmate's prompt | Start reviving; tap F again to cancel. |

Queue, map and consumable actions use the key mapping system. Their HUD hints
show the effective binding, including changes made in Settings. F remains the
world interaction prompt's key. **F6 and F7 are perspective controls**, not
consumable defaults: the perspective resource uses F6 and the native client
uses F7. Rebinding an action to an occupied key can trigger both functions.

## Match flow

`staging → deploy → live → extraction → resolved → staging`

- **Staging:** the queue determines participation. A minimum human count and a
  countdown gate deployment; bots do not satisfy the human requirement.
- **Deploy:** use the map to choose a landing pin. Ground placement is the
  default (`drop=false`), not a ride in an aircraft.
- **Placement confirmation:** the match phase may already read `live` while an
  individual is still `deploying`. The HUD says DEPLOYING while the server
  waits for the exact native placement acknowledgement. Loot, cordon timing and
  live participation start when the deployment wave completes. Failed placements
  return to staging without inventing a death or ranked finish. A match needs
  at least two confirmed squads to proceed.
- **Live:** loot, fight and rotate toward the safe area. Dead players with a
  living squadmate may have a revive window; eliminated players watch from
  staging.
- **Extraction and results:** the surviving contestant or squad receives the
  match result, followed by standings and the return to staging. The implemented
  extraction is a match/result phase. **There is no proven playable Trauma Team
  AV pickup or passenger flight.**

Default source tunables are **Solo**, **Watson**, **standard** pacing,
`minPlayers=16`, staging 105 s and deploy 45 s. Development profiles override some
of these. The standard cordon budget is 45 s initial grace, 300 s of closure and 25 s
final phase; this is about 6 m 10 s of zone timing, not an 18-minute default match.
Early wins can end a match sooner.

## The moving cordon

The authoritative safe area is a continuously shrinking rectangle intersected
with the map's original allowed cells. Excluded cells and holes stay excluded.
The chosen final cell varies between matches, with recent finals avoided; the
phase endpoints still follow the map's block geometry.

During a closure the rectangle moves continuously. A partially covered cell is
partly dangerous: an entire cell does not remain safe until its last sliver
closes. The final refuge remains until the terminal phase ends, then the safe
area is empty. There is no collision wall and no forced teleport back inside.

The server evaluates the same geometry for containment and damage. The tactical
map draws the moving outline over its coarse cell overview. HUD guidance shows
the time until the boundary reaches **your position**, the danger rate and a
direction toward safety. Guidance to a nearby safe cell is not a street-level
pathfinder; buildings and elevation can require a different route.

The world edge uses moving native game VFX driven by that shared sweep. It
replaces the old static post/concrete-wall description; the legacy renderer is
suppressed while an authoritative sweep is present. The current work does not
establish a uniformly legible 300 m boundary in every street or a 64-client GPU
performance claim. See [VFX research](../docs/research/vfx-sfx-runtime.md) for
actual asset, distance and budget measurements.

`cordonEdge=world` enables world effects; `hud` removes them in favor of HUD
feedback; `off` removes the optional edge effects. Core outside warnings and
safe-direction guidance remain. These switches do not disable server damage.
An unreadable position does not establish that a player is outside.

## Loot and consumables

Cordon owns its inventory and validates pickups on the server. Containers have
physical visuals and nearby world prompts; seeing a prop is not proof that a
pickup or weapon assignment completed.

| Equipment | Current behavior |
|---|---|
| Three weapon slots | Verified assignments populate the kit; the HUD identifies the actual active weapon and magazine/reserve ammunition. |
| Armor plates | END starts the server's 3 s action. One plate adds up to 25 armor within the equipped shield's capacity. |
| Healing items | F8 starts the server's 4 s action. Healing is applied on completion, not continuously during the bar. |
| Inventory counts | Changed by authoritative completion, pickup and death handling, not by a key press. |

Consumables require a living participant with the item. Damage interrupts the
action. Full health, full armor, missing shield and empty inventory can refuse
it. The progress bar starts only from the server's action state; FINISHING means
completion has not yet been confirmed. One player cannot use a consumable and
revive simultaneously.

Weapon pickup success is reported after the assignment succeeds. The container
stays claimed while the grant is pending. Explicit refusals known to have made
no inventory change can restore it; an uncertain timeout does not blindly
reopen it and duplicate a weapon. The player receives an uncertainty notice.

The shooting arbiter accepts weapons through the verified inventory path.
Operator `weapon.give` or an unrelated resource's loot command is not a substitute
for a Cordon pickup. Death releases the mode's carried equipment according to
its death-drop rules; successful revival returns the player without the old kit.
Supply drops and other unused design tunables must not be interpreted as
implemented world events.

## Squads and revival

Duo and Squad assign teams at deployment. The current fill iterates queued
players by id and fills available squads; party invite codes are not implemented.
Do not promise that `/br.party` will group friends. The tactical map and squad
panel carry squad-only positions and revive state.

A downed squadmate has a default 30 s revive window while a living squadmate can
answer it. The prompt is anchored to the captured three-dimensional body
position; the dead player's current movement snapshot is not its source.

Face the body and approach until its **F prompt is active**. The interaction must
be on screen even though exact reticle focus is not required. Its 2.5 m activation
range is measured in 3D to a prompt normally 1 m above the body, so 2.5 m horizontal
separation can still be out of range. About 1.5 m on the same floor is comfortably
inside. The server independently checks healer-to-body reach and squad identity.

Tap F once to begin the 5 s action. Releasing the key does not cancel it; tap F
again to cancel. Moving away or damage to either party also interrupts it.
There is one target per healer. During native recovery confirmation, the HUD
says WAITING FOR RECOVERY and additional taps cannot undo the submitted recovery.
Only the canonical recovery acknowledgement restores alive state and credits the
healer. Default revived health is 30%, with short spawn protection and no old kit.

**Physical two-client F start, cancellation, target progress and completed
recovery were observed on September 5.** Earlier operator-only demonstrations did
not prove this input path. The live test caught a missing `body` field in the
actual squad payload; the full server-publication-to-client prompt regression
now covers it. See the [UI evidence](../docs/cordon-ui-2026-09-05.md).

The complete squad phase gate also includes looting, fighting and extraction.
A working revive alone does not close that broader gate. Ghost-flying spectators
and an observer-visible authored revive animation are not established features;
the supported spectator experience is staging watch.

## Bots, holdouts and unfinished world work

Bot contestants use engine AI, occupy the match roster, are labelled **BOT**, and
can win. Any match containing a contestant bot is unrateable. Default fill policy
is `threshold`: below 24 humans, fill toward 40 contestants. `off` disables fill;
`always` fills toward capacity. Bot movement requires a client simulation lease;
a headless phantom is not an engine-driven fighting NPC.

Gang holdouts are separate from contestant bots. Their spawner places camps at
high-tier surveyed loot clusters, and **`holdoutsEnabled=false` remains the
shipped default**. Opt-in native camp kills of phantoms are now proven,
including the final query-only run at 07:06:45 on September 5. The pre-pool
correction prevents native pool writes from racing canonical damage; ordinary
NPC behavior in other modes stays outside this opt-in policy. Camp kills appear
as **GANG GUARD**, not a zone death or contestant BOT, and do not taint rating.
A real player clearing a camp and final native weapon regression remain pending.

The world gate requires a camp to kill a phantom, a real player to clear a camp,
and a vehicle to carry a real player across a closing edge. These conditions are
not replaced by a spawner log, a synthetic damage call or a moved vehicle shell.
The occupied ground Hella crossing is proven: physical driving crossed the
closing front and canonical zone damage began at 05:15:20 on September 5 (see
[vehicle evidence](../docs/cordon-review-2026-09-05.md#vehicle-crossing-physical-driver-and-passenger-confirmed)).
Passenger-following AV flight and a completed playable extraction flight remain
unproven. Boss templates, weather arcs and supply-drop declarations likewise do
not demonstrate a running gameplay feature.

## Running a server

Use the tracked [local profile](../server/server.cordon-local.jsonc) or
[listed profile](../server/server.cordon-listed.jsonc), and inspect their resource
lists and startup overrides. The mode lives in
`resources/gamemodes/open77_cordon`; its HUD is
`resources/gamemodes/open77_cordon_hud`. The setup template is
`templates/cordon`, but older descriptive text there may describe prior design.

The local profile uses game 11808, downloads 11809 and Warden 11810. These are local
profile ports, not the production Cordon endpoint. Launch from `server/` after
building with the repository's documented build procedure:

```powershell
./src/Open77.Server/bin/Release/net10.0/Open77.Server.exe --config server.cordon-local.jsonc
```

Keep the mode's declared dependencies and the profile's shared resources.
`open77_worldui` and `open77_interactions` supply the physical revive/loot prompts;
weapon and loot APIs underpin inventory; the HUD supplies match/combat/map views.
Do not combine Cordon with a second gamemode that also owns spawn and death.
Do not put laboratory resources or test control-file hooks on a public server.

Use Warden tunables or commands for runtime changes. Editing a watched resource
can reload the match; reconnect-policy client resources need a reconnect to
receive the new pack. Test snapshots belong outside the live resource tree.
Preserve the server's signing identity, database and environment during updates.

### Capacity and transport

Set `network.maximumPlayers=64`. The tracked simulation configuration uses 30 Hz
ticks, 20 Hz snapshots, a 500 m player-interest radius and 60 m hysteresis. Do not
reduce interest below the supported combat range: an unseen remote player cannot
be hit correctly by the client.

Keep these transport environment settings for 64-slot operation:

```text
OP77_GNS_SEND_RATE_BYTES=4194304
OP77_GNS_SEND_BUFFER_BYTES=8388608
```

Interest culling saves bandwidth for spread players, but clustered rosters still
need the increased per-connection send budget. The reproduced failure is
`send_failed:LimitExceeded` in the client's `net.state`; the server can continue
running and counting that session.

Three final headless 64-session cycles completed with the continuous geometry and
bounded state publisher. All 64 players were covered by state-send invocations
in each cycle, including outside-state coverage. This measures server behavior;
it does not prove client receipt, UDP/encryption capacity, 64 real HUDs or GPU
performance. Historical measurements and harness limits are in
[scale research](../docs/research/battle-royale-and-scale.md).

### Useful tunables

Defaults below are declared source defaults. A profile or persisted override can
replace them. A value reaching the resource immediately does not mean an already
computed match schedule is rebuilt.

| Key | Default | Purpose |
|---|---|---|
| `format` | `solo` | Next match: solo, duo or squad. |
| `activeMap` | `watson` | Active surveyed/runtime map; Pacifica remains provisional. |
| `minPlayers` |16 | Human queue threshold. |
| `stagingSeconds` / `deploySeconds` |105 /45 | Queue and landing-selection windows. |
| `drop` |false | Ground insertion by default. |
| `schedule` |`standard` | `standard`, development `blitz`, or `long`; retired `short` falls back. |
| `cordonSeconds` / `cordonGrace` / `cordonSteps` |0 | Zero uses the chosen preset; captured when the cordon arms. |
| `damageScale` |1.0 | Live multiplier for zone damage and its HUD rate. |
| `cordonEdge` |`world` | World effects, HUD fallback or optional effects off. |
| `lootDensity` |1.0 | Scale the active map's loot counts, not a guaranteed 900 drops. |
| `holdoutsEnabled` |false | Experimental camp spawner; keep current validation limits in mind. |
| `botFill` / `botFillTarget` / `botFillFloor` |`threshold` /40 /24 | Contestant bot fill policy. |
| `reviveWindowSeconds` |30 | Default opportunity to rescue a downed squadmate. |
| `ratedMinPlayers` / `ratingK` |16 /32 | Rating admission and update size. |

`gridSize` is a retained unimplemented tunable: actual grid geometry comes from
the active map. Use `/br.map` for map authoring, not an unimplemented size knob.

### Commands and editor

| Command | Use |
|---|---|
| `/br.status` | Match phase, roster, format, map, bot/rating and cordon state. |
| `/br.where [playerId]` | Server-side position, state, squad, cell and kit; players inspect themselves, operators can inspect an id. |
| `/br.queue` | Queue controls; use command help for operator/all-player forms. |
| `/br.start`, `/br.end` | Restricted match controls. |
| `/br.edge world\|hud\|off` | Inspect/change edge presentation through the supported command. |
| `/br.map.check`, `/br.map` | Survey status and editor help. |
| `/br.bots` | Restricted bot inspection/control; adding contestants taints rating. |
| `/br.beside <healerId> <downedId>` | Restricted placement beside a captured body for diagnosis. |
| `/br.revive <healerId> <downedId>` | Restricted direct server path; does not test physical F input. |
| `/br.stats`, `/br.stats.of <playerId>` | Own career and restricted operator inspection. |

The tac-map EDIT panel uses the same ACL-checked map commands. Capture marks by
standing on real ground. Map data is stored outside the watched resource tree;
changes to geometry should be checked with `/br.map.check` and a real deployment.
The bundled maps and older Pacifica plans are not interchangeable evidence of
walkable terrain.

## Rating and evidence

Progression is placement rating and career history; it grants no combat power.
Ratings are format-specific. Under-populated matches and matches containing
contestant bots do not update the ladder. Persistence is optional for play;
without a database, history is volatile. Database availability alone does not
mean a match was rated.

The [mode plan](../docs/gamemode-cordon-plan.md) records phase gates and open
requirements. The [September review](../docs/cordon-review-2026-09-05.md) and
[UI review](../docs/cordon-ui-2026-09-05.md) separate automated checks, actual
client observations and outstanding work. Consult those records before claiming
a release or a closed gameplay gate.


### Capturing spawn orientation

`/br.map add spawn "Spawn"` captures the current character position **and body
orientation** from the latest server snapshot. Turn the character toward the
intended direction before capturing; rotating only the camera is insufficient.
`/br.map add spawn 0 "Spawn"` explicitly overrides the heading with zero degrees.
The visual editor's PLACE HERE action uses the same capture path.

Vehicle and staging anchors also capture orientation when the heading is omitted:
`/br.map add veh Vehicle.v_standard2_archer_hella_player` and `/br.map add stage`.
`/br.map move spawn 1` and `/br.map move stage` recapture position and orientation;
append an angle to override it. `/br.map paint spawn 6` captures the current heading
at each point, while `/br.map paint spawn 6 0` keeps an explicit zero heading.
Positions older than two seconds remain unavailable. Older hosts without snapshot
yaw retain the existing "heading not captured" marker instead of claiming a capture.
