# NPC AI, combat and voice control

Use `Open77.npcs` on the **server** to control the behavior of individual spawned NPCs,
including hostile `Character.*` records. These options do not change an entire gang,
other NPCs sharing the record, player characters, or the game's global sound settings.

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

## Speech: one line, on demand

`Open77.npcs.speak(id, voice, options)` is the ON switch beside `setVoiceEnabled`'s OFF: one
voice-over line from the NPC's own voiceset, heard by every player who has the body
streamed. It is the counterpart of FiveM's `PlayPedAmbientSpeechNative`.

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
