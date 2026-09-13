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
