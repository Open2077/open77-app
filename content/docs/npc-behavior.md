# NPC AI, combat and voice control

Control individual spawned NPCs from server Lua with `Open77.npcs`. Behavior settings apply to the selected NPC, not its gang, other NPCs using the same record, player characters or global audio.

Available in client and server **2.31.13+op77.55**, using protocol **1.24**. Both sides must
be updated to apply the behavior policy. Find spawn IDs in the [NPC record catalogue](npc-catalogue.md).

## Spawn a passive, silent NPC

```lua
-- Server manifest: permission "world.npcs"
local npc, reason = Open77.npcs.create({
    record = "Character.cpz_maelstrom_grunt1_ranged1_lexington_wa",
    position = { x = 381.0, y = -2400.0, z = 182.0 },
    aiMode = Open77.npcs.ai.tasks,
    behavior = {
        combatEnabled = false,
        voiceEnabled = false,
    },
})
if not npc then print(reason); return end

-- Optional: pause both the native AI agent and Open77 task execution.
local ok, error = Open77.npcs.setAIEnabled(npc, false)
if not ok then print(error) end

-- Resume the selected aiMode, without changing the passive/silent options.
Open77.npcs.setAIEnabled(npc, true)
```

The record and its assets must exist on each client. A successful `create` returns a
canonical server ID, not proof that the engine has spawned the body. See
[NPC lifecycle and readiness](npcs.md).

## Independent controls

All four options default to `true`. Omitting an option preserves its current value when updating.

| Option | Server helper | Effect of `false` |
| --- | --- | --- |
| `aiEnabled` | `Open77.npcs.setAIEnabled(id, false)` | Disables the native AI agent and its perception; suspends Open77 tasks and revokes its simulation lease. Rendering/collision are not disabled. |
| `combatEnabled` | `Open77.npcs.setCombatEnabled(id, false)` | Clears tracked threats, disables threat acquisition/reactions and blocks aggression and outgoing hit processing. The movement agent remains available for scripted tasks. |
| `perceptionEnabled` | `Open77.npcs.setPerceptionEnabled(id, false)` | Disables autonomous sensory/stimulus acquisition, including Open77's automatic target seeding. It does not clear a previously assigned combat target; use `combatEnabled=false` to stop combat. |
| `voiceEnabled` | `Open77.npcs.setVoiceEnabled(id, false)` | Disables the NPC's native voiceset lines and grunts, including combat/search barks that bypass scripts. Script-triggered voiceovers and native dialogue routed through subtitles are also filtered. Footsteps, weapons and other sound effects are not muted. |

Each helper requires a **boolean**, not `0`, `1`, or `"false"`. Use one atomic update for
several options:

```lua
local ok, reason = Open77.npcs.setBehavior(npc, {
    aiEnabled = true,
    combatEnabled = false,
    perceptionEnabled = false,
    voiceEnabled = false,
})
local behavior = Open77.npcs.getBehavior(npc)
-- Equivalent read: Open77.npcs.get(npc).behavior
```

`setBehavior` and the four setters return `true`, or `false` with a validation reason
when supplied data is invalid. Unknown/not-owned NPCs and missing permission return `false`.
`getBehavior` returns a detached table or `nil` when unavailable. Malformed options return
`npc_behavior_invalid`; unknown option names return `npc_behavior_unknown_option`.

`Open77.npcs.update(id, { behavior = {...} })` accepts the same partial object. Changing the
loadout/appearance, changing bucket, or reviving the NPC does not reset these settings.
They are not stored in client KVP and do not constitute disk persistence across server restarts.

Two more options govern damage rather than AI, and default to the platform's previous behavior:
`vehicleContactEnabled` (default `false`, [below](#vehicle-contact-damage)) and `hitPricing`
(default `"resource"`, [below](#who-prices-player-hits-hitpricing)). They are set the same way,
at creation or later, and read back from `getBehavior`:

```lua
local npc, reason = Open77.npcs.create({
    record = "Character.cpz_maelstrom_grunt1_ranged1_lexington_wa",
    position = { x = 381.0, y = -2400.0, z = 182.0 },
    damagePolicy = Open77.npcs.damage.mortal,
    behavior = { vehicleContactEnabled = true, hitPricing = "platform" },
})
if not npc then print(reason); return end
print(Open77.npcs.getBehavior(npc).hitPricing) --> platform
```

## Vehicle contact damage

`behavior.vehicleContactEnabled` defaults to `false`. The NPC's creating server resource may opt
in with `Open77.npcs.setBehavior(id, { vehicleContactEnabled = true })`. This replaces native
vehicle-hit damage pricing with server-priced contact damage, and it keeps the NPC's damage
policy (`invulnerable`, `immortal` or `mortal`). The client simulating the NPC reports the
contact; the server checks its current lease, world readiness, revision, bucket and the
vehicle's recent trajectory, with a two-second contact cooldown per NPC. Damage uses the same
speed curve as car impacts on players (the `combat.vehicleHitDamage*` server options), derived
from accepted positions. No per-frame world-wide contact scan is added.

An accepted contact adopts an existing native fall or requests a native NPC knockdown. Identical
ragdoll trajectories on every screen are not guaranteed.

## Who prices player hits: `hitPricing`

An NPC's health and death belong to the server. No client lets the game change a network NPC's
health or kill it on its own: a shot plays its hit reaction, and the NPC loses health or dies only
when the server's ledger says so, on every client at once.

By default the **resource** that created an NPC prices player hits on it, typically from the
client event `open77:npcHit` it forwards to its own server script and a weapon table. A resource
that prices nothing leaves players unable to kill its NPCs: they react to shots but never lose
health.

A resource can instead **opt in** to the platform's pricing for a **mortal** NPC
(`damagePolicy = Open77.npcs.damage.mortal`). The shooter's client then sends the engine's own
price for each hit, and the server applies it with `Open77.npcs.applyDamage` semantics.
`onNpcDamaged` and `onNpcDied` receive the source `"player:<id>"` and the cause `"player_hit"`.

```lua
-- A guard that players may kill, with no hit pricing of your own.
local guard = Open77.npcs.create({
    record = "Character.cpz_maelstrom_grunt1_ranged1_lexington_wa",
    position = { x = 381.0, y = -2400.0, z = 182.0 },
    damagePolicy = Open77.npcs.damage.mortal,
    behavior = { hitPricing = "platform" },
})
-- or later: Open77.npcs.setBehavior(guard, { hitPricing = "platform" })
```

**Resources that create mortal NPCs and do not price `open77:npcHit` should opt in**, or players
cannot kill those NPCs. The opt-in exists because the amount is still the shooter's own claim:
every report must ride shots the server itself admitted (see below), but the server has no weapon
damage table, so a modified client could still claim one maximum per admitted shot. Price hits in
your resource when that matters.

The server checks each report before applying it:

- the shooter is alive, has a weapon drawn according to its own recent player snapshot, has a
  fresh position in the NPC's routing bucket and is within 150 m of it;
- the report names at least one shot (a spent round or a melee swing) that the server admitted
  for that drawn weapon at the weapon class's fire rate, fired within the last 3 s (1.5 s for a
  swing) from within 150 m (12 m for melee) of the NPC, and not yet used against this NPC. Each
  shot prices a given NPC once. The server option `combat.handheldDischarges` (default `true`)
  runs this admission; turning it off turns platform pricing off;
- the NPC is alive, mortal and opted in;
- one report is worth at most the NPC's maximum health;
- a player may apply at most 40 reports and 6 × maximum health per second across all NPCs;
- an NPC may receive at most 24 reports and 2 × maximum health per second from all players.

Immortal and invulnerable NPCs are never priced this way.

| `hitPricing` | Player hits on a mortal NPC |
| --- | --- |
| `"resource"` (default) | Never priced by the platform; only what the resource applies changes the NPC. `open77:npcHit` still fires on the shooter's client. |
| `"platform"` | Priced by the server as above. `open77:npcHit` still fires as well; do not also price it, or each shot counts twice. |

The value must be one of these two strings; anything else returns `npc_behavior_invalid`.
`Open77.npcs.getBehavior(id).hitPricing` reads it back. The bundled Cordon, Deathmatch and
Freeroam PvP bots state `"resource"` explicitly.

Damage no player caused is always reported by the client that simulates the NPC: environment,
falls, fire, explosions without a player instigator, and the NPC's own grenade. Vehicle collisions
are not player hits; opt in to [vehicle contact damage](#vehicle-contact-damage) for those.

### Server configuration

Both options live in the `combat` section of `server.jsonc` and are read at startup:

```jsonc
"combat": {
  "handheldDischarges": true,     // default: admit handheld shots, required by "platform" pricing
  "handheldVehicleDamage": false  // default: see Armed vehicles & Lua API
}
```

`handheldDischarges` (default `true`) makes the server bind each living body and admit fire
declarations against the drawn catalogued weapon and a per-class cadence. A receipt damages
nothing by itself; platform-priced NPC hits require one. With `false`, no binding is sent and
platform-priced NPCs cannot be priced from a player's hit. `handheldVehicleDamage` is described in
[Armed vehicles & Lua API](vehicle-weapons.md#handheld-guns-on-cars-another-player-drives).

## Speech: one line, on demand

`Open77.npcs.speak(id, voice, options)` is the ON switch beside `setVoiceEnabled`'s OFF: one
voice-over line from the NPC's own voiceset, queued on every client that has the body
streamed. It is the counterpart of FiveM's `PlayPedAmbientSpeechNative`. What is proven is the
plumbing — the `SoundPlayVo` event reaches each viewer's puppet, and a muted NPC refuses — not
the sound: the test loop has no audio capture, so whether a given line is *heard* on a given
record is something to check by ear before shipping it.

```lua
-- A guard greets whoever walks up, and warns them off when they linger.
local guard = Open77.npcs.create({ record = "Character.Judy", position = gate })
AddEventHandler("onNpcInteracted", function(npcId, playerId)
    if npcId ~= guard then return end
    local ok, reason = Open77.npcs.speak(guard, "greeting")
    if not ok then print("guard stayed silent: " .. reason) end
end)
Open77.npcs.speak(guard, "rep_ask_to_leave", { ignoreDistance = true })
```

`voice` is a **`voContext` name** — the same word vanilla passes to
`GameObject.PlayVoiceOver`, resolved by the engine against the puppet's voiceset
(`Character.*.voiceTag`) — not a Wwise event; `Open77.effects.sound` remains the way to play a
sound bank event on an NPC. `Open77.npcs.voices()` lists the generic barks that can be
pointed at in the game's own 2.31 sources, each with the file and line that plays it:

| Name | When vanilla plays it |
|---|---|
| `greeting` | look-at reaction to a friendly passer-by |
| `bump` | bumped into by the player |
| `fear_beg`, `fear_run`, `fear_foll` | a civilian threatened: begging, fleeing, complying |
| `stlh_curious`, `stlh_curious_grunt`, `stlh_investigate`, `stlh_search`, `stlh_patrol_back`, `stlh_call`, `stlh_death` | the stealth ladder: noticing, investigating, searching, giving up, calling a friend, finding one dead |
| `start_alerted`, `start_combat`, `combat_ended`, `danger`, `enemy_warning`, `combat_target_hit`, `combat_target_sight_lost`, `crowd_combat` | alert and combat state changes |
| `attack_short`, `attack_long`, `enemy_melee_charge`, `battlecry_curse` | attack shouts |
| `hit_reaction_light`, `hit_reaction_heavy`, `vo_any_damage_hit` | taking hits |
| `grenade`, `grenade_throw`, `coop_reports_kill` | grenades and kill calls |
| `rep_ask_to_leave`, `rep_ask_to_holster`, `rep_final_warning`, `rep_call_grd`, `rep_complies` | a guard's escalation ladder |
| `hurry_up`, `phone_start`, `taunt_hidden_player`, `pedestrian_hit`, `vehicle_bump` | miscellany |

The list is documentation, not an allowlist: any identifier is accepted (letters, digits,
underscore, at most 64), because a record may carry lines no vanilla script calls. **A name the
voiceset does not have is silent, and nothing can report that** — the engine drops it without
a word, so `true` means "queued on every viewer", not "heard". Test the names you ship on the
records you ship; a character whose record has no `voiceTag` never speaks.

Options: `ignoreFrustum` (default `true`) plays even when the NPC is off-screen;
`ignoreDistance` (default `false`) skips the engine's distance cull. Refusals, by name:

| Reason | Meaning |
|---|---|
| `invalid_voice` | Not an identifier, empty, or longer than 64. |
| `invalid_npc_id`, `npc_not_found`, `npc_not_owned` | Bad id, unknown id, another resource's NPC. |
| `npc_dead` | A dead body has nothing to say. |
| `voice_disabled` | `setVoiceEnabled(id, false)` is in force; lift it first. |
| `npc_not_streamed` | No client has reported the body ready yet — nobody could hear it. |
| `npc_voice_busy` | A line was accepted on this NPC less than 400 ms ago. |

Requires `world.npcs` and ownership, like every NPC mutator. The line rides the existing
effect one-shot to every client in the NPC's routing bucket; a client that does not have the
body streamed resolves no target and drops it, which is the same rule an entity-bound sound
follows. On the client the bundled `open77_effects` resource queues the engine's own
`SoundPlayVo` event on the puppet through `Open77.sfx.playVoice`, which a client resource may
also use for a purely local bark (see [Effects](effects.md)).

## Tasks, authority and replication

`aiMode` and behavior are different controls. `frozen` suspends Open77's task scheduler;
**use `setAIEnabled(id, false)` when the native agent must also stop**. Re-enabling AI does
not change `aiMode`: a frozen task scheduler stays frozen until its mode is changed.
Tasks resume with renewed timing rather than expiring because of the paused interval.

The server validates resource ownership and replicates the full policy in reliable NPC state,
including to late joiners, observers and newly streamed incarnations. Engine mutations run on
the game thread. An unavailable native/component is logged as `behavior pending`, not reported
as a successful application. Applying these options requires the matching updated client and
server; the existing 1.24 wire layout is unchanged, but older clients ignore the new policy.

Clients with `npcs.read` can inspect `Open77.npcs.get(id).behavior` and `.all()`, but cannot
override the server policy. Custom network event handlers must validate ownership themselves;
never forward an arbitrary client-supplied NPC ID to these setters.

If your gamemode accepts NPC hit reports, re-check current canonical behavior before applying
damage: ignore reports when `aiEnabled` or `combatEnabled` is false. A delayed report is not
permission to damage a player after a server-side policy change.

## Boundaries

- These APIs control Open77-created NPCs, not arbitrary ambient world handles.
- Voice suppression is prospective. It does not promise to interrupt every line already playing,
  or audio emitted outside the game's voice/dialogue pipelines.
- Disabling AI is not time dilation, a pose freeze, ragdoll, invulnerability or hiding a character.
  Use the dedicated animation and damage APIs for those effects.
- Perception off does not override explicit script commands. Combat off does not prevent your
  own Lua code from deliberately calling a damage API or playing a custom attack animation.
- Vehicle auto-driving belongs to `Open77.vehicles.ai`; disabling a seated NPC's agent is not a
  substitute for stopping the vehicle's drive command.
