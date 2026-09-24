# Player models: NPC impersonation

Select an NPC model as a player's visible body while retaining player identity and gameplay state.
Find 6,582 `Character.*` IDs in the [morph catalogue](player-model-catalogue.md).

NPC impersonation is experimental. Movement, vehicle poses and life transitions depend on the
model's rig; inclusion in the catalogue does not guarantee compatibility with every player action.

A server resource can select a `Character.*` record as a player's visible body.
The player retains their network identity, controls, health, equipment inventory and
saved appearance. The NPC is a presentation body, not an independently controlled AI
actor and not a second player. Resetting the model restores the current player appearance.

Models use their own native rig/graph and appearance. Player wardrobe meshes and
player-specific Mirror animation clips are not applied to an arbitrary NPC skeleton.
The record is resolved from the client's installed game/mod data, without a virtual
catalogue and without changing shared TweakDB records.

Internally, the client builds a process-cached presentation record from the
ordinary proxy base and copies only the requested NPC's visual identity. The
requested record remains the API identity. This prevents importing a boss's
stat packages or quest loadout along with its skin; it does not guarantee that
every authored template or special skeleton supports every player action.

### Vehicle compatibility

The original player keeps the actual seat and driving authority; the visible
NPC follows a presentation-only seat pose and never takes ownership of the car.

While a model is active, the native vehicle camera stays in third person where
supported. If the passenger camera remains in first person, a vehicle-following
third-person fallback provides mouse orbit and three distances through the
player's existing vehicle-camera binding. Reset restores the prior view;
protected scenes and resource-owned scripted cameras retain priority.

**Special rigs may not support vehicle seats.** Adam Smasher uses `man_massive`;
seats without a matching animation binding can display a T-pose or clip the body
through the vehicle. The API does not replace incompatible models automatically.

## Permissions and ownership

```lua
permissions { "players.model.control", "players.model.read" }
```

`players.model.control` permits server setters. `players.model.read` permits
queries, and client record validation. A resource **generation** exclusively owns
each active override. A second resource cannot replace or reset it; it receives
`model_owned_by_other_resource`. Stopping/restarting the owner releases its overrides.
Allow client requests only after checking your own gameplay/ACL rules server-side.
There is deliberately no client model setter and no unrestricted native access.

## Server API

| Function | Result |
| --- | --- |
| `SetPlayerModel(playerId, record, options?)` | `true, revision` or `false, reason` |
| `ResetPlayerModel(playerId)` | `true` or `false, reason` |
| `GetPlayerModel(playerId)` | state table, `nil` for original model, or `nil, reason` |
| `IsPlayerModelReady(playerId)` | boolean or `nil, reason` |

Aliases: `Open77.players.setModel`, `.resetModel`, `.getModel`, `.isModelReady`.
Player IDs must be positive integers; numeric strings are not accepted.

Options (unknown fields and wrong types are rejected):

| Field | Default | Meaning |
| --- | --- | --- |
| `appearance` | `""` | Native appearance CName; empty keeps the template default. Maximum 128 ASCII characters. |
| `durationMs` | `0` | Integer 0–86,400,000; zero lasts until reset or owner/disconnect cleanup. |
| `resetOnDeath` | `false` | If true, remove the override on death; otherwise retain it for respawn. |

Record strings must start with `Character.`, have 11–255 ASCII characters and
contain only letters, digits, `_`, `.` and `-`. Appearance strings allow the same
characters plus spaces. Asset paths, escape sequences and arbitrary native fields
are not supported. Record availability is checked on the client, not inferred by
the server from the name. A missing model therefore fails asynchronously.

```lua
local ok, revisionOrError = SetPlayerModel(playerId, "Character.Rogue", {
    durationMs = 60000,
    resetOnDeath = false,
})
if not ok then print("Model refused: " .. revisionOrError) end
-- A true setter result means accepted, NOT already visible.
```

The server state table contains `player`, `record`, `appearance`, `revision`,
`ready`, `resetOnDeath`, and `remainingMs` for a timed override. `ready` is the
current owner's native presentation acknowledgement; it is not a promise that
every observer has streamed the player. Setting identical options again extends
the duration without respawning the body or changing its revision.

### Events

```lua
AddEventHandler("onPlayerModelChanged", function(player, record, appearance, revision, reason)
    -- record is nil when restoring the original model.
end)
AddEventHandler("onPlayerModelReady", function(player, revision)
    -- Check this revision when coordinating an asynchronous operation.
end)
AddEventHandler("onPlayerModelFailed", function(player, revision, reason)
    -- The authoritative override is cleared; the original player remains usable.
end)
```

These events are server-side. Change reasons include `set`, `reset`, `expired`,
`died`, `resource_stopped`, `disconnected`, `projection_timeout` and native failure
reasons. An acknowledgement for an old revision/connection is ignored. The
`open77:playerModel:*` transport belongs to the platform; do not publish it from Lua.

## Client API

| Function | Result |
| --- | --- |
| `GetPlayerModel(playerId?)` | current state table, `nil` for original model, or `nil, reason` |
| `IsPlayerModelReady(playerId?)` | this client's projection readiness, or `nil, reason` |
| `IsPlayerModelValid(record)` | record exists and is a Character record; `false, reason` otherwise |

Aliases: `Open77.players.getModel`, `.isModelReady`, `.isModelValid`. Omitted/nil
player ID selects the local player. Zero is not an explicit player ID.

The client table contains `player`, `record`, `appearance`, `revision`, `entity`,
`ready`, `status` and optional `failure`. `entity` is a local Open77 entity handle,
not a network player ID; it changes when a body is recreated and must not be
persisted or sent to another client as an identity. Use the network player ID.

Statuses: `preparing`, `active`, `parked`, `not_streamed`, `failed`.
Readiness and availability are different: `IsPlayerModelValid` does not load or
animate a body and cannot prove its locomotion, seat or appearance compatibility.

```lua
local model, error = GetPlayerModel()
if error then
    print("Model state unavailable: " .. error)
elseif model and model.ready then
    print(("Visible model: %s (revision %s)"):format(model.record, model.revision))
end
```

## Replication and lifecycle

- Selection is server-owned and scoped to the player's routing bucket.
- Late join/reconciliation receives bounded, atomic paged snapshots. Older
  revisions and messages from another connection cannot restore stale models.
- Streaming or a bucket change recreates the presentation from the current state.
- Local impersonation requires third person. A conflicting forced first-person
  policy fails explicitly; normal perspective preference is retained for reset.
- Invalid/unavailable native models and preparation failures must recover to the
  original body. An unacknowledged request times out after 20 seconds while the
  player is alive and gameplay-ready.
- Models do not grant NPC stats, weapons, boss abilities, faction or hostility.
  Gameplay authority remains on the player and server.

Common errors: `invalid_player`, `player_unavailable`, `player_not_ready`,
`player_not_alive`, `invalid_record`, `invalid_appearance`, `invalid_duration`,
`invalid_options`, `model_owned_by_other_resource`, `quota_exceeded`,
`record_not_found`, `record_not_character`, `third_person_blocked`,
`projection_timeout`, `state_unavailable`, and permission-denial strings.
Native record preparation can also report `model_record_limit`,
`proxy_record_unavailable`, `model_clone_failed`, `model_record_conflict`,
`model_template_missing`, `model_flat_failed`, or `model_record_failed`.

## Integration checks

Check the intended models with the movements, vehicle seats and animations used by your gamemode.
Handle asynchronous preparation failures and always provide a reset action. See the
[admin morph workflow](player-model-catalogue.md#in-game-admin-menu) for model selection and restoration.
