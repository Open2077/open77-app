# Gorilla Arms

Give players native Gorilla Arms with server-defined grades, paid installation or temporary arena loadouts. Open77 reuses Cyberpunk's equipment, arm models, punches and hit reactions; your Lua resource chooses who receives them and how powerful they are.

Read the [Cyberware framework](cyberware.md) for identity, permissions, persistence and operation completion. This guide uses the implemented `gorilla_arms` profile and matching protocol 1.33 client/server source builds. It does not assume a stable binary release is available.

## What players get

Installed arms use native `Items.StrongArms`. Both male and female body families have demonstrated owner first-person, owner third-person and remote appearance, including drawn/holstered transitions and removal. The patient's native skin/customization keys are captured; the game determines the mechanical hand/arm geometry. This is not a selector for arbitrary full-metal forearms or custom arm meshes.

Players draw their fists and use native normal or charged attacks. The backend validates observed action identity, cooldown, charge duration, stamina and contact, then prices damage once. Native and network damage are not meant to stack. A charge that exceeds `maxChargeMs` expires until release/rearm; missing action samples do not earn charge time. Normal and charged punches can use different damage, stamina and knockback settings.

Knockback requests a bounded native living reaction with collision and recovery. The victim can take valid damage while a prior motion lease prevents another throw. Nonlethal caps damage to preserve life; cosmetic sets damage and knockback to zero. These switches do not grant permission to attack: server PvP, scope, team, life and veto rules still apply.

For exact signatures, use the [server API](/docs/api/server/open77-cyberware) and [client adapter API](/docs/api/client/open77-cyberware).

## Define grades

A definition is resource-owned, versioned and limited to 32 unique grades. The installed grade is a snapshot: editing a definition does not retroactively rewrite paid implants. Use an explicit installation/progression workflow to change them.

| Grade field | Range / behavior |
|---|---|
| `normalDamage`, `chargedDamage` | Required, finite 0–300. |
| `knockbackMeters` | Required, 0–6m for charged punches. Native travel can differ. |
| `normalKnockbackMeters` | Optional 0–6m; omission uses 35% of charged distance. |
| `cooldownMs` | Required 100–600000; minimum time between admitted attacks. |
| `chargeMs` | Required 100–10000; server-measured minimum charge. |
| `maxChargeMs` | Default 10000; at least `chargeMs`, at most 60000. |
| `normalStaminaCost`, `chargedStaminaCost` | Optional finite 0–300. Omission retains native pricing; an explicit value uses authoritative pricing and suppresses the corresponding native attack debit. |
| `nonlethal`, `cosmetic` | Optional booleans, default false. |
| `blockDamageMultiplier` | Default 0, range 0–1; zero means full block, otherwise chip damage. |
| `blockAngleDegrees` | Default 45, range 0–180; zero disables frontal blocking. |

Blocking also requires a fresh native defender observation, melee equipment, positive server stamina and appropriate facing. Chip damage does not trigger Gorilla knockback. Block stamina pricing is not overridden by these fields.

Grades do **not** currently choose arm skins, elemental damage types or attack-animation speed. `cooldownMs` controls admission; reducing it does not speed up a native punch. Installed physical/electric/chemical/thermal trail assets are research candidates, not delivered selectable elemental variants.

## A minimal self-service resource

This example gives ACL-authorized players a free, explicitly requested implant on their own already-bound character. It has no client script, currency, doctor role or automatic character binding. Use a configured database and your character adapter (such as `open77_appearance`), then wait for normal character readiness. Do not combine a second identity binder with the existing adapter.

Create `resources/gamemodes/my_gorilla/open77.lua`:

```lua
resource "my_gorilla"
version "1.0.0"
auto_start false
dependency "open77_cyberware >=0.1.0"
server_script "server/main.lua"
permissions {
    "players.cyberware.define",
    "players.cyberware.read",
    "players.cyberware.manage"
}
```

Create `server/main.lua`:

```lua
local ready = false
local pending = {}

CreateThread(function()
    local result, reason = Open77.cyberware.define({
        id = "myserver.gorilla", version = 1,
        slot = "arms", profile = "gorilla_arms",
        grades = {
            { id = "street", normalDamage = 15, chargedDamage = 35,
              knockbackMeters = 2, normalKnockbackMeters = 0.5,
              cooldownMs = 800, chargeMs = 650, maxChargeMs = 10000,
              normalStaminaCost = 20, chargedStaminaCost = 35,
              nonlethal = true, cosmetic = false }
        }
    })
    ready = result ~= nil
    if not ready then print("Definition failed: " .. tostring(reason)) end
end)

local function change(source, removing)
    local player = tonumber(source)
    if not player or player < 1 or player % 1 ~= 0 then
        print("Run this self-service command as a connected player.")
        return
    end
    if not ready or pending[player] then return end
    local record, reason = Open77.cyberware.current(player)
    if not record then print("Character not ready: " .. tostring(reason)); return end
    if removing and not record.arms then print("No arm implant installed."); return end
    if not removing and record.arms then print("Remove the existing implant first."); return end
    local operation, error = Open77.cyberware.newOperationId()
    if not operation then print(error); return end
    local options = {expectedRevision = record.revision, operationId = operation}
    local result
    if removing then
        result, error = Open77.cyberware.remove(player, options)
    else
        result, error = Open77.cyberware.install(player, "myserver.gorilla", "street", options)
    end
    if not result then print("Request refused: " .. tostring(error)); return end
    if result.ticket then
        pending[player] = {ticket = result.ticket, operationId = operation, options = options}
        print("Procedure pending for player " .. player)
    else
        print("Operation already completed for player " .. player)
    end
end

RegisterCommand("gorilla_install", function(source) change(source, false) end, true)
RegisterCommand("gorilla_remove", function(source) change(source, true) end, true)

AddEventHandler("onCyberwareOperationCompleted", function(player, ticket, encoded)
    player = tonumber(player)
    local transaction = player and pending[player]
    if not transaction or transaction.ticket ~= ticket then return end
    local result = json.decode(encoded)
    pending[player] = nil
    if result and result.ok == true then
        print("Procedure completed for player " .. player)
    else
        print("Procedure failed: " .. tostring(result and result.error))
    end
end)
```

Add the resource to your server's configured resource set and run `ensure my_gorilla` from the server console. Grant access to the two restricted commands through your [command ACL](server-acl.md), then invoke `/gorilla_install` as that player. Follow the server completion log, draw fists and test against another authorized participant. `/gorilla_remove` follows the same staged transaction and restores native base arms. Merely defining/installing this resource does not enable global PvP.

The commands are self-directed consent for this free example. For a clinic, do not turn the player argument into an unchecked arbitrary target: validate doctor permission, both players' life/distance/bucket, patient consent, price and expected revision at submission. Use the shipped clinic below as the fuller workflow. For a durable paid service, persist your operation/payment reservation and correlate completion; this minimal pending table is deliberately in-memory and performs no automatic retries.

## Charge effects and sound

The native owner charge effect is `spy_perk_charge` on the held `weaponRight` object. Remote presentation uses installed industrial-arm electricity attached to the hand. Both paths have paired visual evidence; the remote graph is a documented substitute for an unproven native StrongArms world-graph presentation. Effect handles alone do not establish visibility.

The support configuration at `resources/system/open77_cyberware/server/presentation-config.lua` opts in by **full definition ID**, not a generic grade name. Add this entry inside its `definitions` table to give the tutorial grade the existing presentation defaults:

```lua
["myserver.gorilla"] = {
    street = { enabled = true, chargedOnly = false }
},
```

This is a configuration-table fragment, not a standalone resource export. The shipped example definitions are already opted in. Unknown definitions receive no implicit charge/impact presentation. To disable a definition, set its entry to `false`; to disable all added presentation, set the configuration's `enabled=false`.

Per-grade overrides can select `effect`, `slot`, `localAnchor`, `localSlot`, `localEvent`, `chargeSoundEvent`, `soundOnOwner`, `impactSoundEvent`, `impactSoundDuration`, `impactSoundOnAttacker`, `impactSoundOnVictim`, `soundOnZeroDamage` and `chargedOnly`. Defaults use remote `RightHand`, local `weaponRight`/`right_hand_start` and the native local event. A world effect and native entity event are distinct mechanisms; arbitrary event names are not guaranteed to render on either anchor.

Charge presentation tracks fresh authoritative activity, creates one bounded lease per hold and removes it on release/rejection or lifecycle invalidation. Native weapon replacement/holstering also cleans the captured owner anchor. Impact audio uses accepted action IDs to deduplicate network delivery. Attacker/victim sound inclusion is configurable; recording comparisons do not establish universally duplicate-free perceived audio. Server makers can replace the presentation policy using public APIs without replacing implant authority.

## Optional clinic and practice arena

The [ripperdoc example](../resources/gamemodes/open77_ripperdoc_example/README.md) provides patient consent, nearby/alive checks, inspection, configurable prices, installation/removal, cancellation and payment compensation. Start `open77_ripperdoc_example` deliberately. `/doc inspect <patient>`, `/doc offer <patient> <grade>` and `/doc remove <patient>` initiate the consent workflow. Its credits are a demonstration balance, not a durable economy. Replace that policy with your jobs, inventory and payment service.

The [arena example](../resources/gamemodes/open77_cyberarena_example/README.md) uses temporary cyberware leases and scoped combat permission. Start `open77_cyberarena_example`, reserve its configured bucket/site and use `/cyberarena join [grade]`, `/cyberarena loadout <grade>` and `/cyberarena leave`. It does not overwrite paid implants or enable global PvP. Training/industrial defaults are nonlethal; cosmetic has zero damage/knockback; lethal is an explicit optional choice. Wait for native restoration before acquiring another loadout.

After stopping the core, restart the optional definition providers you need as well. If the saved implant is ready but `activity(player)` remains nil, check whether its definition provider is running before reinstalling or changing character identity.

## What to expect in multiplayer

Normal/charged attacks, both native body families, observer appearance, paid clinic workflows, temporary arena restoration, representative collisions and input recovery have finite two-client coverage. Charge cleanup was visually checked on holster, disconnect and core stop. Network impairment tests include 80/150/250ms profiles; delayed poses and positions can still differ, especially during recovery. The integration is not a claim of perfect frame synchronization, every outfit/terrain/team combination or large-server capacity.

Use [capability discovery](cyberware.md#client-adapter-and-capability-discovery) for available APIs/readiness, and [reproducible scenarios](../docs/research/cyberware-test-scenarios.md) when validating your own balance, assets or server policies. Native readback, backend commit and an observed visual result answer different questions.
