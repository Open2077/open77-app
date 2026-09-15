# Gorilla Arms

Gorilla Arms give a player the native mechanical arms: they draw their fists and use
the game's normal and charged punches, and the server prices every hit, applies
knockback and keeps the implant on the character between sessions. You define the
grades and decide who gets them; the [Cyberware framework](cyberware.md) supplies the
transactions, permissions and persistence this page relies on.

## Minimal example

A self-service resource: an ACL-authorized player installs a free implant on their own
character with `/gorilla_install` and removes it with `/gorilla_remove`. It needs a
configured database, the `open77_appearance` character adapter and the `open77_cyberware`
support resource (both are running by default).

`resources/gamemodes/my_gorilla/open77.lua`:

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

`server/main.lua`:

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
        print("Run this command as a connected player.")
        return
    end
    if not ready or pending[player] then return end
    local record, reason = Open77.cyberware.current(player)
    if not record then print("Character not ready: " .. tostring(reason)); return end
    if removing and not record.arms then print("No arm implant installed."); return end
    if not removing and record.arms then print("Remove the existing implant first."); return end
    local operation, error = Open77.cyberware.newOperationId()
    if not operation then print(error); return end
    local options = { expectedRevision = record.revision, operationId = operation }
    local result
    if removing then
        result, error = Open77.cyberware.remove(player, options)
    else
        result, error = Open77.cyberware.install(player, "myserver.gorilla", "street", options)
    end
    if not result then print("Request refused: " .. tostring(error)); return end
    if result.ticket then
        pending[player] = { ticket = result.ticket, operationId = operation, options = options }
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

Add the resource to your server's resource set, run `ensure my_gorilla` from the
console, grant the two restricted commands through your [command ACL](server-acl.md),
and type `/gorilla_install` as that player. When the completion line prints, draw fists
(the melee weapon slot) and punch: a tap is a normal punch, a hold of at least
`chargeMs` released before `maxChargeMs` is a charged punch. `/gorilla_remove` restores
the native arms through the same staged transaction. Installing arms does not enable
PvP: your server's combat scope, team and life rules decide who may be hit.

## Grade options

A definition owns up to 32 grades. The installed grade is a snapshot: editing the
definition later does not change implants already installed.

| Grade field | Range / behaviour |
|---|---|
| `normalDamage`, `chargedDamage` | Required, 0–300 |
| `knockbackMeters` | Required, 0–6 m, requested reaction distance for a charged punch |
| `normalKnockbackMeters` | Optional 0–6 m; omitted means 35% of `knockbackMeters` |
| `cooldownMs` | Required, 100–600000 ms between admitted punches |
| `chargeMs` | Required, 100–10000 ms of hold before a punch counts as charged |
| `maxChargeMs` | Default 10000; at least `chargeMs`, at most 60000. A longer hold expires until released and rearmed |
| `normalStaminaCost`, `chargedStaminaCost` | Optional 0–300. Omitted keeps the native stamina price; set, the server prices it and suppresses the native debit |
| `nonlethal`, `cosmetic` | Default false. Nonlethal caps damage to keep the victim alive; cosmetic sets damage and knockback to zero |
| `blockDamageMultiplier` | Default 0, range 0–1; 0 is a full block, otherwise chip damage |
| `blockAngleDegrees` | Default 45, range 0–180; 0 disables frontal blocking |

Grades do not choose arm skins, elemental damage or attack animation speed.
`cooldownMs` gates admission; lowering it does not make the native punch faster.

## Events

| Event | Meaning |
|---|---|
| `onCyberwareOperationCompleted(player, ticket, encodedResult)` | Your install or removal finished; require `result.ok == true` |
| `onCyberwareMeleeHit(victim, attacker, encodedSnapshot)` | An accepted, unblocked contact, including zero-damage ones |
| `onCyberwareMeleeBlocked(victim, attacker, sequence, amount)` | An accepted block; `amount` is 0 for a full block or the chip damage |
| `onCyberwareMotionOutcome(victim, attacker, encodedOutcome)` | Whether the hit requested, skipped or was refused a knockback |
| `onCyberwareActionRejected(player, sequence, error)` | A punch the server refused, for example `cooldown`, `insufficient_stamina`, `cyberware_suspended`, `weapon_glitched` |

Player IDs arrive as strings; decode JSON arguments with `json.decode`. The hit
snapshot carries `sequence`, `incarnation`, `instanceId`, `definition`, `grade`,
`charged`, `amount`, `bodyPart` and `lethal`. See [Cyberware](cyberware.md#events)
for the motion-outcome fields.

## Charge effects and sound

The support resource `open77_cyberware` draws a charge effect while a player holds a
punch and plays an impact sound on an accepted hit. It opts definitions in by their
full ID in `resources/system/open77_cyberware/server/presentation-config.lua`; the
shipped example definitions are already listed. Add yours to its `definitions` table:

```lua
["myserver.gorilla"] = {
    street = { enabled = true, chargedOnly = false }
},
```

Set an entry to `false` to silence one definition, or the table's `enabled = false` to
switch the extra presentation off entirely. Per-grade keys: `effect`, `slot`,
`localAnchor`, `localSlot`, `localEvent`, `chargeSoundEvent`, `soundOnOwner`,
`impactSoundEvent`, `impactSoundDuration`, `impactSoundOnAttacker`,
`impactSoundOnVictim`, `soundOnZeroDamage` and `chargedOnly`. Defaults are the
`electric.industrial_arm` effect on the observer's `RightHand`, the native
`spy_perk_charge` event on the owner's `weaponRight`, the `w_cyb_strongarms_spy_perk_charge`
charge sound and the `w_cyb_npc_strongarms_hit_face` impact sound for five seconds. One
effect lease is created per hold and removed on release, rejection, holster, disconnect
or resource stop. The whole policy is a server script on public APIs
(`Open77.cyberware.activity`, `Open77.effects.attach/remove`): replace it without
touching installation or damage.

## Optional clinic and arena

`open77_ripperdoc_example` (`auto_start false`) is a consent-and-payment clinic. Grant
doctors `command.doc`. With both players alive, in one bucket and within three metres:
`/doc offer <patient> training` (or `industrial`, `cosmetic`), `/doc inspect <patient>`,
`/doc remove <patient>`. The patient looks at the doctor and holds **E** to accept or
presses **F** to decline (`/implantaccept` and `/implantcancel` do the same in chat).
Prices, grades, range and consent time are in its `server/config.lua`; its credit
balance is an in-memory demonstration that resets with the resource.

`open77_cyberarena_example` (`auto_start false`) hands out temporary loadouts inside a
configured bucket: `/cyberarena join [grade]`, `/cyberarena loadout <grade>`,
`/cyberarena leave`. Leaving restores the paid implant. Training and industrial grades are
nonlethal, cosmetic does no damage, lethal is an explicit choice.

## Limits

- Installed arms are the native `Items.StrongArms` for both body families, with the
  patient's own skin and customization keys. You cannot select other arm meshes.
- Native and server damage do not stack: the server prices one hit per admitted action.
  Missing action samples do not earn charge time.
- Knockback is a bounded native reaction (0–6 m requested, collisions decide the real
  travel). A victim still in a previous knockdown takes the damage but is not thrown
  again (`motion_busy` in the motion outcome).
- Blocking needs a fresh defender observation, a melee weapon drawn, positive stamina
  and the right facing. Chip damage never triggers knockback, and block stamina is not
  configurable.
- Restart your definition provider after restarting the core: a saved implant stays
  visible but cannot punch while its definition is not registered. If `activity(player)`
  stays `nil` for a ready implant, check the provider before reinstalling.
- A [Weapon Glitch](hacking.md) hack refuses Gorilla arming with `weapon_glitched`;
  a Cyberware Malfunction refuses it with `cyberware_suspended`. The punch then lands
  as an ordinary melee hit.
