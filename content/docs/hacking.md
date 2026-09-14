# Hacking and counterplay

Short Circuit, Overheat, Cyberware Malfunction, Cripple Movement, Reboot Optics, Weapon
Glitch, Self-ICE and active purge share a server-owned upload/status service. The six
hacks are `kind`s of one hack grade: the same warned, interruptible upload, then an
electrical hit (Short Circuit), a server-ticked burn (Overheat), a visible suppression
of the victim's Open77 abilities (Cyberware Malfunction), a slow the victim's own client
applies while the server refuses its Dash and Ground Slam (Cripple Movement), a bounded
visual interference the victim's own client applies natively (Reboot Optics) or a
weapon jam the victim's own client applies natively while the server refuses its
Gorilla Arms (Weapon Glitch).
The optional `open77_hacking_lab` is disabled by default; Freeroam gains no implants
or hacking rules automatically. Native presentation and live acceptance are recorded
separately in the hacking research and scenario documentation. API availability or a
queued HUD call is not rendered or acoustic proof.

## Define abilities and install through existing cyberware

```lua
permissions {
    "players.hacking.define", "players.hacking.read", "players.hacking.activate",
    "players.cyberware.define", "players.cyberware.read", "players.cyberware.manage"
}
```

Server resources define balance; clients submit intent and visibility evidence only.

```lua
assert(Open77.hacking.define({id="example.short_circuit",version=1,grades={
    {id="training",range=20,uploadMs=2000,staminaCost=20,cooldownMs=5000,
     damage=25,statusMs=750,recoveryMs=4000,lockHacking=false,nonlethal=true}
}}))
assert(Open77.hacking.defineIce({id="example.self_ice",version=1,grades={
    {id="training",charges=1,rechargeMs=15000}
}}))
assert(Open77.hacking.definePurge({id="example.purge",version=1,grades={
    {id="training",staminaCost=15,cooldownMs=8000,allowSelf=true,allowAlly=true,
     range=10,cancelUploads=true,removeStatuses=true}
}}))
```

Register matching implant definitions through `Open77.cyberware.define`, using the
same provider resource, definition ID, version and grade IDs. Hacking logical slots
are `operating_system`/profile `cyberdeck`, `self_ice`/profile `self_ice`, and
`purge`/profile `active_purge`. They do not replace native arms/legs equipment.
The shared grade schema retains explicit inert arm fields for compatibility:

```lua
assert(Open77.cyberware.define({id="example.short_circuit",version=1,
    slot="operating_system",profile="cyberdeck",grades={
        {id="training",normalDamage=0,chargedDamage=0,knockbackMeters=0,
         cooldownMs=100,chargeMs=100}
    }}))
local record = assert(Open77.cyberware.current(playerId))
local operationId = assert(Open77.cyberware.newOperationId()) -- retain for retries
assert(Open77.cyberware.install(playerId,"example.short_circuit","training",
    {expectedRevision=record.revision,operationId=operationId}))
```

The existing doctor/identity service owns consent, payment and durable character
selection. Removing a temporary status never erases an installed item. Provider stop
revokes definitions and transient work while retaining durable implants.
The default `open77_appearance` identity adapter must be running, or a creator must
replace it with an adapter that binds the admitted durable character through the
existing cyberware service. The hacking lab deliberately does not bind a second
character identity.

## Public server APIs

Failures return `nil, reason`; mutations succeed with `{ok=true,actionId=...}`.
Definition ownership comes from the resource generation, never a supplied owner name.

| API | Permission | Purpose |
|---|---|---|
| `hacking.define(definition)` | `players.hacking.define` | Own hack definition and grades. |
| `hacking.defineIce(definition)` | `players.hacking.define` | Own Self-ICE definition and grades. |
| `hacking.definePurge(definition)` | `players.hacking.define` | Own purge definition and grades. |
| `hacking.state(playerId)` | `players.hacking.read` | Current authoritative player state, including `cyberwareSuspendedMs`, `frozenMs`, `malfunctionMs`, `malfunctionBlocks`, `crippledMs`, `crippleHeavy`, `blindedMs` and `weaponGlitchedMs`. |
| `hacking.action(actionId)` | `players.hacking.read` | Current action or bounded terminal receipt. |
| `hacking.statuses(playerId)` / `statuses.list(playerId)` | `players.hacking.read` | Current owned statuses affecting a player. |
| `hacking.start(actor,target,definition,grade,options)` | `players.hacking.activate` | Start an entitled upload from the definition provider. |
| `hacking.purge(actor,target,definition,grade,options)` | `players.hacking.activate` | Purge through the same defense authority as normal input. |
| `hacking.cancel(actionId)` | `players.hacking.cancel` | Cancel this provider's active upload. |
| `hacking.configureProtection(playerId,{safeArea=bool,resistance=number})` | `players.hacking.policy` | Own a current-body safe-area/electrical resistance scope; resistance is 0–1. |
| `hacking.clearProtection(playerId)` | `players.hacking.policy` | Clear only this provider's protection scope. |
| `statuses.apply(actor,target,definition,grade)` | `players.statuses.apply` | Apply a configured bounded status using the registered grade and canonical eligibility. |
| `statuses.remove(actionId)` | `players.statuses.purge` | Remove this provider's status without reversing damage. |
| `hacking.capabilities()` | `players.hacking.read` | Schema, profiles, authority/evidence model and hard limits. |

`start` and `purge` require `options={operationId="stable-operation"}`. Retain the ID
when retrying the same operation. An ID with different arguments is rejected. This
server-resource channel is separate from the client's monotonic intent sequence.
Do not synthesize private `open77:hacking:*` events: server resources cannot publish
those reserved projection events.

`onHackingTransition` is a server-local event carrying a JSON-encoded transition.
Phases cover challenge, upload start/progress, block, interruption, impact,
completion, status application/expiry/removal, the configured outcomes
(`effect_applied` / `effect_refused`) and, for Overheat, one `status_tick` per burn
tick. Records correlate `actionId`, both participants and incarnations,
definition/grade, `kind`, deadline, amount and reason; a malfunction `effect_applied`
also carries `blocks`. Event observers must not infer a second damage hit from
status or completion; a `status_tick` *is* a ledger write (its `amount`).

## Configurable balance and bounds

| Hack grade field | Accepted policy |
|---|---|
| `range` | 1–80 metres. |
| `uploadMs` | 500–15000 ms; lab uses 2000. |
| `staminaCost`, `damage` | 0–300; damage is server configuration only. |
| `cooldownMs` | 250–600000 ms. |
| `kind` | `short_circuit` (default), `overheat`, `malfunction`, `cripple`, `reboot_optics` or `weapon_glitch`; anything else is `invalid_definition`. See [Hack kinds](#hack-kinds-overheat-cyberware-malfunction-and-cripple-movement). |
| `statusMs` | 0–2000 ms; the Short Circuit disruption. Ignored by the other kinds, whose status is the burn / the suppression / the slow. |
| `recoveryMs` | At least status duration + 500 ms, at most 60000. |
| `lockHacking` | Optional short hacking inhibition; false by default. Movement/camera remain available. |
| `nonlethal`, `cosmetic` | Independently configured damage policies. |
| `friendlyFire`, `allowSafeArea` | Grade eligibility; existing combat policy/veto still applies. |
| `interruptOnDamage`, `interruptDamage` | Whether and at what accepted damage threshold the hacker is interrupted. |
| `evidenceFreshMs`, `challengeMs` | Bounded client evidence freshness and admission timeout. |

### Configurable outcome: the `effects` block

The outcome of a connected Short Circuit is **server-owner configuration, not a
hard-coded 25 damage**. A hack grade may carry an optional `effects` table — the same
place `staminaCost`, `damage` and `uploadMs` live — and the platform applies it on a
connected upload (`impact` → each `effect_applied` → `completed`) through existing
server primitives. It is a fixed, bounded catalogue: no script hook, no arbitrary
status name, every field optional, validated and capped at definition time
(`invalid_definition` otherwise).

```lua
assert(Open77.hacking.define({id="example.short_circuit",version=1,grades={
    {id="stun",range=20,uploadMs=2000,staminaCost=20,cooldownMs=6000,
     statusMs=750,recoveryMs=6000,nonlethal=true,
     effects={
         damage=10,              -- overrides `damage`; 0–300, nonlethal/cosmetic still apply
         freezeMs=2000,          -- movement hold on the victim; 1–10000 and <= recoveryMs
         knockdown=true,         -- victim to the floor with zero displacement; needs recoveryMs >= 1500
         disableCyberwareMs=5000 -- suspends the victim's Open77 abilities; 1–30000
     }}
}}))
```

| Field | Primitive | Bound |
|---|---|---|
| `damage` | The existing single ledger hit (`hacking_impact`, electrical, non-bleeding) | 0–300; resistance, `nonlethal` and `cosmetic` still apply |
| `freezeMs` | The same stationary hold as `knockdown`, plus a server gate that refuses the victim's hacking, purge, Dash and Ground Slam for the full duration (`frozen`); the victim's own running upload is interrupted. Beyond the knockdown, the victim's **own client** keeps the body locked through the platform movement lock (`Open77.movement.lock("freeze")`: the stunned stagger, weapon forced safe, no movement input, camera free), started 3 s after the transition so the knockdown and the lock's stunned state are never applied in the same tick, for whatever remains of the server deadline | 1–10 000 ms, never longer than `recoveryMs`; `recoveryMs` ≥ 1 500 ms |
| `knockdown` | The existing forced-motion knockdown with zero displacement (`platform.hacking` owner): native knockdown state on every client, displacement envelope, 1.5 s post-motion immunity, `open77:cyberware:motion` replication | `recoveryMs` ≥ 1 500 ms |
| `disableCyberwareMs` | Ability suspension bound to the durable character: Dash, Ground Slam, Gorilla arms, hacking and purge are refused at admission (`cyberware_suspended`) until the deadline; grants are untouched and a reconnect does not clear it; the victim's own running upload is interrupted | 1–30 000 ms |

`knockdown` and `freezeMs` share one body hold: the forced-motion authority owns a
single reaction per body, so a connected upload requests the stationary knockdown at
most once and both outcomes report on it. The native hold lasts as long as the knockdown
animation (about three seconds); a longer `freezeMs` keeps the ability gate running and
the victim's client takes over the body with its movement lock from the third second
(`HackingInput.freezeAfterKnockdownMs` in `open77_hacking/client/config.lua`) to the
deadline it computes as `statusEndsAt - serverTime` from the `freeze` row. The server
gate is the authority: a modified client that drops its lock is still refused every
ability, and a reconnect re-locks from `hacking.state.frozenMs`. A refused hold
(`motion_busy`, `cc_protected`, victim dead or in a vehicle) refuses the freeze too — the
platform never reports a free-moving player as frozen.

Each applied outcome is one correlated `onHackingTransition` record with
`phase="effect_applied"`, `reason` = `freeze` / `knockdown` / `disable_cyberware`,
`amount` = configured milliseconds and `statusEndsAt` = deadline; a primitive the host
refuses (unwired, faulted, or vetoed) is reported as `effect_refused` and never retried
or compensated — committed damage stays committed. Both participants receive the same
records on `open77:hacking:transition`; the platform client prints them in chat and
toasts the victim. `hacking.state(playerId)` exposes `cyberwareSuspendedMs` and
`frozenMs`; `hacking.capabilities().effects` lists the fields and caps.
`open77_hacking_lab` ships this as the `stun` grade.

The shock itself stays purely electrical: server-committed hacking damage is a single
`hacking_impact` ledger write of attack kind `Environment` with no native hit, so no
hit-blood decal or damage-blood screen effect runs on any client (guarded by
`HackingDamageStaysAnElectricalNonBleedingLedgerHit`). The only presentation is the
electrocution layers above.

### Hack kinds: Overheat, Cyberware Malfunction and Cripple Movement

A hack grade has a `kind`. Everything up to the connected upload is identical for all
four — range, upload, stamina, cooldown, Self-ICE, cover/range/interrupt cancellation,
recovery window, `effects` — and the direct hit (`damage` / `effects.damage`) stays the
electrical ledger write above. The kind decides the **status** the upload leaves on
the victim, and that status is what purge removes.

```lua
assert(Open77.hacking.define({id="example.hacks",version=1,grades={
    -- Overheat: 5 direct, then 40 more over 5 s in 500 ms ticks, purgeable.
    {id="overheat",kind="overheat",range=20,uploadMs=2000,staminaCost=20,cooldownMs=6000,
     damage=5,statusMs=0,recoveryMs=6000,nonlethal=true,
     burn={totalDamage=40,durationMs=5000,tickMs=500}},   -- every field optional
    -- Cyberware Malfunction: no damage, Dash / Ground Slam / Gorilla / hacking refused for 8 s.
    {id="malfunction",kind="malfunction",range=20,uploadMs=2000,staminaCost=20,cooldownMs=6000,
     damage=0,statusMs=0,recoveryMs=6000,
     malfunction={durationMs=8000,blocks={"dash","ground_slam","gorilla","hacking"}}},
    -- A malfunction that leaves hacking alone, so the victim can still purge itself.
    {id="motion_glitch",kind="malfunction",damage=0,statusMs=0,recoveryMs=6000,
     malfunction={durationMs=6000,blocks={"dash","ground_slam","gorilla"}}},
    -- Cripple Movement: no damage; the victim's client slows itself (MaxSpeed x0.75, or
    -- x0.4 with heavy=true, no dodge) for 12 s while the server refuses its Dash and
    -- Ground Slam (`crippled`). Hacking, purge and Gorilla arms stay usable.
    {id="cripple",kind="cripple",range=20,uploadMs=2000,staminaCost=20,cooldownMs=6000,
     damage=0,statusMs=0,recoveryMs=6000,
     cripple={durationMs=12000,heavy=false}},                 -- both fields optional
    {id="cripple_heavy",kind="cripple",damage=0,statusMs=0,recoveryMs=6000,
     cripple={durationMs=12000,heavy=true}},
    -- Reboot Optics: no damage; the victim's client applies the native blind (the
    -- netrunner "Reboot Optics" record: static, scanner off, accuracy x0.01) for 8 s.
    -- Nothing is gated server-side; purge lifts it.
    {id="reboot_optics",kind="reboot_optics",range=20,uploadMs=2000,staminaCost=20,cooldownMs=6000,
     damage=0,statusMs=0,recoveryMs=6000,
     optics={durationMs=8000}},                                -- optional, default 5000
    -- Weapon Glitch: no damage; the victim's client jams its held weapon (native Jam
    -- status: the weapon reads not-ready and cannot fire) for 8 s while the server refuses
    -- its Gorilla Arms (`weapon_glitched`). Movement, hacking, purge, Dash, Ground Slam
    -- and ordinary melee stay usable.
    {id="weapon_glitch",kind="weapon_glitch",range=20,uploadMs=2000,staminaCost=20,cooldownMs=6000,
     damage=0,statusMs=0,recoveryMs=6000,
     glitch={durationMs=8000}},                                -- optional, default 5000
}}))
```

| Block | Field | Bound / default |
|---|---|---|
| `burn` (Overheat only) | `totalDamage` | 0–300; default 40. Split evenly over the ticks; `0` is a presentation-only burn. |
| | `durationMs` | 1000–15000; default 5000. The status length; expiry is exact. |
| | `tickMs` | 250–1000; default 500. Tick *k* lands at `k·tickMs` after impact (never at impact); ticks = `durationMs / tickMs`, whole multiples only. |
| `malfunction` (Malfunction only) | `durationMs` | 1000–30000; default 5000. |
| | `blocks` | Subset of `dash`, `ground_slam`, `gorilla`, `hacking`; omitted or empty means all four; unknown or duplicate names are `invalid_definition`. |
| `cripple` (Cripple only) | `durationMs` | 1000–30000; default 5000. The platform client clamps its lock at 30 s too. |
| | `heavy` | `false` (default): the vanilla netrunner Cripple Movement on V, MaxSpeed x0.75, reduced jump, no dodge / double jump / charge jump. `true`: its Tier 3, MaxSpeed x0.4. Sprint stays allowed at the reduced ceiling in both. |
| `optics` (Reboot Optics only) | `durationMs` | 1000–15000; default 5000. The platform client clamps its native blind at 15 s too. |
| `glitch` (Weapon Glitch only) | `durationMs` | 1000–15000; default 5000. The platform client clamps its native jam at 15 s too. |

A `burn` block on a non-overheat grade, a `malfunction` block on a non-malfunction
grade, a `cripple` block on a non-cripple grade, an `optics` block on a non-reboot-optics
grade or a `glitch` block on a non-weapon-glitch grade is `invalid_definition`, so a
typo cannot hide. `hacking.capabilities()` (`schemaVersion` 4) lists the kinds and every
cap (`kinds`, `burn`, `malfunction`, `cripple`, `optics`, `glitch`, `effects.freezeLock`).

**Overheat.** After `impact` → `status_applied` (`kind="overheat"`) → `effect_applied`
(`reason="burn"`, `amount` = `durationMs`, `statusEndsAt` = deadline), the server
ticks the ledger itself: each tick is the same non-bleeding `Environment` write as the
impact, `nonlethal` and `cosmetic` respected, canonical combat roster re-checked, and
reported as `status_tick` (`amount` = damage committed). Electrical resistance and
protection scopes reduce the direct hit, **not** the burn (it is thermal). A refused
tick — `combat_forbidden`, `dps_cap`, a lost body — ends the burn (`status_expired`,
`reason` = the refusal) rather than retrying. The victim's own purge (INSERT), an ally
purge (DELETE), death, revive, reconnect, bucket change, the attacker leaving and the
provider stopping all end it through the ordinary status lifecycle, and stop the ticks
at once; committed damage stays committed.

**Cyberware Malfunction.** After `impact` → `status_applied` (`kind="malfunction"`) →
`effect_applied` (`reason="malfunction"`, `amount` = `durationMs`, `blocks` = the
suppressed list), every listed ability is refused at admission with
`cyberware_suspended` until the deadline: Dash and Ground Slam requests, Gorilla
arming (the contact then lands as an ordinary melee), hacking and purge when `hacking`
is listed. A listed `hacking` also interrupts the victim's own running upload. Installed
grants are untouched. Unlike `effects.disableCyberwareMs`, this is a **status**: it is
listed by `statuses(playerId)`, `hacking.state(playerId)` exposes `malfunctionMs` and
`malfunctionBlocks`, and a purge lifts it immediately — as do death, reconnect, bucket
change and provider stop. A grade that lists `hacking` therefore denies the victim its
own INSERT; an ally's DELETE still works, which is the intended counterplay shape.

**Cripple Movement.** After `impact` → `status_applied` (`kind="cripple"`) →
`effect_applied` (`reason` = `cripple` or `cripple_heavy` — the client lock kind —,
`amount` = `durationMs`, `statusEndsAt` = deadline, `blocks` = `{"dash","ground_slam"}`),
the two halves run for the same deadline:

- the **server** refuses the victim's Dash and Ground Slam requests with `crippled`
  (and interrupts an in-flight Dash the moment the cripple lands), bound to the durable
  character like a Malfunction gate. Hacking, purge and Gorilla arms are deliberately
  left usable, so the victim's own INSERT always purges a cripple;
- the **victim's client** applies the slow through the platform movement lock
  (`Open77.movement.lock(reason, statusEndsAt - serverTime)`, permission
  `player.movement.lock`): Open77 clones of the vanilla `AIQuickHackStatusEffect.
  HackLocomotion` / `HackLocomotionTier3` records — the netrunner "Cripple Movement" the
  game already applies to V — with the `hacking_glitch_low` glitch and the crippled HUD
  icon. It releases on `status_purged` / `status_expired`, death, vehicle, workspot,
  session change and resource stop, and re-locks from `hacking.state.crippledMs` /
  `crippleHeavy` on a fresh roster.

The split is the enforcement model: a modified client can ignore its own slow and keep
its walking speed, but it cannot dash or slam out of the cripple, and every honest
client shows the authored slow. Reduced sprint/walk speed is therefore presentation, the
ability gate is authority. `hacking.state(playerId)` exposes `crippledMs` and
`crippleHeavy`; the status is listed by `statuses(playerId)` with `kind="cripple"`.

**Reboot Optics.** After `impact` → `status_applied` (`kind="reboot_optics"`) →
`effect_applied` (`reason="blind"`, `amount` = `durationMs`, `statusEndsAt` = deadline,
no `blocks`), the **victim's client** applies the native blind through the platform
status primitive (`Open77.hacking.nativeStatus("blind", statusEndsAt - serverTime)`,
permission `player.hacking.status`): an Open77 clone of `AIQuickHackStatusEffect.
HackBlind` — the record vanilla enemy netrunners apply to V for "Reboot Optics" — with
its `status_blinded` VFX/SFX, the `hacking_glitch_low` glitch, the scanner disabled
(`HasCybereye x0`), `Accuracy x0.01`, a weapon sway/recoil penalty and the blinded HUD
icon. It carries **no movement stat** (unlike the flashbang `BaseStatusEffect.Blind`),
so walking and sprinting are untouched. Nothing is gated server-side: the server keeps
the deadline (`hacking.state(playerId).blindedMs`, re-applied by the client on a fresh
roster) and the lifecycle only, so a purge, death, reconnect, bucket change or provider
stop ends it. A client without the primitive (older DLL) substitutes a bounded
screen-flash burst (`HackingInput.opticsFallback`), which is a placeholder, not the
native look.

**Weapon Glitch.** After `impact` → `status_applied` (`kind="weapon_glitch"`) →
`effect_applied` (`reason="weapon_jam"`, `amount` = `durationMs`, `statusEndsAt` =
deadline, `blocks` = `{"gorilla"}`), the two halves run for the same deadline:

- the **server** refuses the victim's Gorilla Arms arming with `weapon_glitched` (the
  contact then lands as an ordinary melee), bound to the durable character like a
  Malfunction gate. Hacking, purge, Dash, Ground Slam and ordinary melee are deliberately
  left usable: the glitch is weapon-only, and the victim's own INSERT always purges it;
- the **victim's client** applies the jam through the same status primitive
  (`Open77.hacking.nativeStatus("weapon_jam", …)`): an Open77 clone of `BaseStatusEffect.
  WeaponMalfunction`, type `Jam`, which the player's weapon state machine reads as
  not-ready for the whole application — the held weapon cannot fire and returns to ready
  the moment the record is removed — with `Accuracy x0.35`, `quickhack_weapon_malfunction`
  and the jammed-weapon HUD icon. No movement stat, no stagger.

Both native statuses release on `status_purged` / `status_expired`, death, vehicle,
workspot, session change and resource stop, re-apply from `hacking.state.blindedMs` /
`weaponGlitchedMs` on a fresh roster, and are clamped at 15 s by the client. As with the
cripple, a modified client can drop its own status but cannot punch through the
Gorilla gate; the honest client shows the authored look. `hacking.state(playerId)`
exposes `blindedMs` and `weaponGlitchedMs`; the statuses are listed by
`statuses(playerId)` with `kind="reboot_optics"` / `"weapon_glitch"`.

**One per victim.** At most one Overheat, one Malfunction, one Cripple, one Reboot
Optics and one Weapon Glitch status run on a victim at a time. A second connected upload of the same kind keeps its direct hit and
`effects` but its status is **refused, not refreshed**: `effect_refused` with the same
`reason` and `statusEndsAt` = the running status' deadline (a `statusEndsAt` of `0`
means the status limit or a lost target). Refusing rather than refreshing keeps what one
victim can accumulate bounded by one grade and needs no remaining-damage arithmetic;
statuses of different kinds coexist. The script path `statuses.apply` answers
`status_stacked` in the same situation and, when it succeeds, publishes the kind's
`effect_applied` row after `status_applied` exactly like a connected upload.
`recoveryMs` still spans attackers as before, so with `recoveryMs >= durationMs` nobody
is even admitted while the status runs.

Both participants receive every record on `open77:hacking:transition` with `kind` (and
`blocks`); the platform client names the kind in the aim hint, the incoming warning,
the impact line, the outcome lines, the native bar headers (`<KIND> UPLOAD`,
`INCOMING <KIND>`, `<KIND> IMPACT`) and the victim toast, whose countdown bar shows the
remaining time. `open77_hacking_lab` ships these as the `overheat`, `malfunction`,
`malfunction_motion`, `cripple`, `cripple_heavy`, `reboot_optics`, `weapon_glitch` and
`freeze_long` grades, plus `/hacklab purge` to trigger a purge from the server.

Self-ICE has 1–8 `charges` and `rechargeMs` of 1000–600000. Upload protection is
distinct from electrical damage resistance. Purge configures `staminaCost`,
`cooldownMs`, `allowSelf`, `allowAlly`, `range` (1–40 m), `cancelUploads` and
`removeStatuses`. Ally assistance additionally requires matching positive teams and
the server's explicit permission policy. It must find eligible transient work before
charging a cost; post-impact purge does not heal the committed damage.

Protection scopes combine safe-area flags by union and electrical resistance by
maximum, so a provider cannot clear another provider's protection. Their incarnation
and bucket binding expires on lifecycle changes; provider stop removes owned scopes.

Concurrent incoming uploads, global uploads/statuses, definition counts, operation
receipts and per-tick work are capped. A recovery window spans attackers, so they
cannot bypass it by alternating targets or implants. Cooldowns bind to durable
character identity across reconnects within the authority service lifetime. Service
restart persistence and exact retention bounds must be considered by operators.

## Input, evidence and presentation

`open77_hacking/client/config.lua` controls default keys, the selection cone and the
victim feedback gates. Players can override the keys in Pause → Settings → KEY BINDINGS.
The attack is a **hold**: aiming at a streamed player draws nothing on the HUD (one
throttled chat line names the target and the keys); pressing and holding F8 opens the
hacking interface and starts the upload, which runs only while the key is held.
Releasing before completion cancels the upload through the same client cancel path END
uses — a release that arrives before the server has opened the upload cancels it as soon
as the `upload_started`/`challenge` transition lands, so nothing runs unattended. INSERT
purges self; DELETE purges the aimed ally; END still cancels an own upload. The server
contract is unchanged: it owns timing, challenges, evidence and cooldowns, and the client
only starts or cancels. Input uses the regular rebindable hold callback API and never
invokes the vanilla slow scanner.

For visibility, the server issues short-lived nonce challenges and exact endpoints
to both participants. An outstanding nonce remains stable until both participants
answer; a new upload challenge is eligible only after that bilateral round and
at least 200 ms from its issue. Missing reports still expire under the configured
freshness deadline. This prevents periodic replacement from starving delayed
replies. Each client traces the same segment against native Static and
Dynamic collision groups. A missing/failed query is blocked. The server validates
freshness, current incarnations, readiness, life, bucket, movement/range, teams and
combat policy before accepting evidence or damage. This is a documented multiplayer
evidence model, not a headless native collision query or protection against two
colluding modified clients. Occlusion edge cases require measured live coverage.

`Open77.hacking.observe(playerId)` provides native streamed-target observation;
`present({actionId,phase,progress})` and `clear()` are resource-owned presentation
operations behind `player.hacking.project`. These do not grant hacking authority.
The `targeting` phase is now the **armed** state — the key is held and the server has
not yet opened the upload — and reads `SHORT CIRCUIT UPLOAD / [------------] Player N /
keep holding to upload`; `upload` and `incoming` carry a twelve-cell ASCII fill bar next
to the stock percentage. While the shared native bar carries a hacking header it is
rendered at 1.5x (a render transform, not a layout change, so it stays legible at 1080p
and 1440p and keeps its slot); any other header restores the stock scale. The chat hint
advertises only installed hack/ally-purge actions and their current bindings. DELETE is
the default ally-purge key, including on a purge-only helper. Normal target/outcome text
supplements native incoming/upload feedback. The default Short Circuit avoids native NPC
status/damage triggers that could create duplicate damage or take away movement and
camera control.

### Hit presentation

A connected Short Circuit is presented on every side with audited identifiers only:

| Side | Cue | Bound |
|---|---|---|
| Observers and the attacker | Server `Open77.effects.attach` of the cooked electrocuted status effect on the victim's `RightHand` and `Chest`, plus the catalog `electric.arc` on `RightHand` | 1.5 s per impact, extended to the status end (max 2 s); at most 3 handles per action and 24 live |
| Everyone in range | Server `Open77.effects.sound` `quickhack_shortcircuit` on the victim | Deduplicated per action |
| Victim's own screen | Authored `status_electrocuted` event in the victim's view (the `localEvent` of the first layer), a client-local electric-blue flash through the native fade manager, and `quickhack_shortcircuit` on the local body with `unique` | Flash: 90 ms hold, 420 ms return, one at a time; needs `screen.effects` |
| Attacker's HUD | `<KIND> IMPACT` on the scaled bar (`SHORT CIRCUIT`, `OVERHEAT`, `CYBERWARE MALFUNCTION`, `CRIPPLE MOVEMENT`, `REBOOT OPTICS`, `WEAPON GLITCH`) with `ui_focus_mode_scanning_qh_done` | Bar lease of 1.5 s |
| Overheat, observers and attacker | Server `attach` of the catalog `fire.tiny` idle flame and `smoke.steam` pouring steam on the victim's `Chest`, created once on `status_applied` for the whole burn | ≤ 15.5 s, 2 handles per action, 24 live |
| Overheat, victim's own screen | Authored `hacks_overheat_lvl1` event (the VFX name of the installed `BaseStatusEffect.Overheat`) as the flame layer's `localEvent`, a heat-orange fade flash at impact, `quickhack_overheat` locally with `unique` | Same flash bounds; needs `screen.effects` |
| Overheat, everyone in range | Server `Open77.effects.sound` `quickhack_overheat` (SFX of that same record) on the victim | Deduplicated per action |
| Malfunction, observers and attacker | Server `attach` of the cooked EMP status effect (`…\status_effects\emp\ch_emp_status_effect.effect`, the native "cyberware disabled" look) on `Chest`, the cooked electrocuted status effect (the live-reviewed Short Circuit layer) on `Chest` and `RightHand`, and the catalog `sparks.cable` electric-failure sparks on `RightHand`, for the whole suppression | ≤ 30.5 s, 4 handles per action, 24 live |
| Malfunction, victim's own screen | Authored `hacks_cyberware_malfunction` event (VFX of `BaseStatusEffect.CyberwareMalfunction`) as the EMP layer's `localEvent`, a violet fade flash at impact, `quickhack_cyberware_malfunction` locally | Same flash bounds |
| Malfunction, everyone in range | Server `quickhack_cyberware_malfunction` on the victim | Deduplicated per action |
| Cripple, victim's own screen | The `hacking_glitch_low` entity effect and the crippled HUD icon the cripple clone starts on the local player, a violet-blue fade flash at impact, `quickhack_locomotion_malfunction` locally, and the slow itself | Same flash bounds; the lock ≤ 30 s |
| Cripple, everyone in range | Server `quickhack_locomotion_malfunction` on the victim; no observer body layer (no leg slot is proven on a multiplayer puppet, and the projector refuses an unproven slot) | Deduplicated per action |
| Reboot Optics, victim's own screen | The native `status_blinded` VFX/SFX, `hacking_glitch_low` and the blinded HUD icon the blind clone starts on the local player, a white-cyan fade flash at impact, `quickhack_optics_malfunction` locally | Same flash bounds; the status ≤ 15 s; the screen-flash burst only without the primitive |
| Reboot Optics, observers and attacker | Server `attach` of the catalog `electric.arc` on the victim's `Chest` for the whole blind (no head slot is proven on a multiplayer puppet) | ≤ 15.5 s, 1 handle per action, 24 live |
| Reboot Optics, everyone in range | Server `quickhack_optics_malfunction` (the daemon event of the CName inventory) on the victim | Deduplicated per action |
| Weapon Glitch, victim's own screen | The jam clone's own look (`hacks_weapon_malfunction`, the jammed-weapon HUD icon) and the weapon reading not-ready, an amber fade flash at impact, `quickhack_weapon_malfunction` locally | Same flash bounds; the status ≤ 15 s |
| Weapon Glitch, observers and attacker | Server `attach` of the cooked electrocuted status effect and the catalog `sparks.cable` on the victim's `RightHand` (the weapon hand) for the whole jam | ≤ 15.5 s, 2 handles per action, 24 live |
| Weapon Glitch, everyone in range | Server `quickhack_weapon_malfunction` (SFX of the installed `BaseStatusEffect.WeaponMalfunction`) on the victim | Deduplicated per action |

`HackingInput.feedback={flash=true,sound=true}` in `client/config.lua` gates the two
victim-side client cues of every kind. The `Chest` slot is the slot the native Overload
attack resolves on puppets; the projector refuses an absent slot or an unauthored local
event, so it costs nothing where it is not authored. No cooked character burn or
malfunction resource exists by name in the installed archives (the native looks are
entity-authored events), so the observer layers of the two new kinds are the closest
audited substitutes, stated as such in the research log. Rendering on both body
families still requires the live capture pass. The native bar names the kind since the
fourth `hacking.hud:` field (`Open77.hacking.present{kind=}`); an older DLL keeps the
Short Circuit headers.

Stock HUD ownership is respected. Every incoming action also produces an independent
notification toast, immediate chat warning and bounded native cue. Defender visibility
evidence cannot become positive until the notification service reports its WebUI
handshake ready and accepts the toast. Missing readiness/export/queue admission makes
the upload fail closed rather than silently proceed without an admitted warning.
Repeated challenges do not repeat warnings or audio. This fallback deliberately uses
Open77's WebUI toast instead of replacing someone else's native progress bar. Admission
and handshake acknowledgements still require actual screenshot/audio validation.

The copyable attacker/protected/unprotected/ally/overheat/malfunction/cripple/optics/
glitch/freeze scenarios are in
[`open77_hacking_lab`](../resources/gamemodes/open77_hacking_lab/README.md). The native
looks of Reboot Optics and Weapon Glitch on a multiplayer player (the `status_blinded`
fullscreen effect, the weapon reading not-ready) are established by the installed data
and the decompiled scripts, not yet by a live capture; see the research log.

## Validation boundary

**Kit status (2026-09-14).** All six kinds have two-client evidence on the
isolated test server with physical hold-to-hack input, both body families and
the coordinator's capture tool (`scripts/tests/hack-capture.ps1`): Short Circuit
with the `effects` block (knockdown, freeze, cyberware suspension), Overheat
(burn ticks, self purge), Cyberware Malfunction (Dash and purge refused
`cyberware_suspended`), Cripple Movement (sprint measured at x0.75 / x0.4 under
the client lock, Dash refused `crippled`), Reboot Optics (native blind wash-out,
blinded icon) and Weapon Glitch (jammed icon, no attack leaves the client), plus
death and resource-stop cleanup. Per-case evidence, deployed artifact hashes and
the honest gaps (ranged weapon under Weapon Glitch, stacking refusals and
reconnect/bucket cleanup for the new kinds covered by tests only, no dazed pose
during a freeze) are in `docs/hacking-kit-checkpoint.md`.


Server-local Lua callbacks can be scheduled in a different order within one tick
than authoritative commits. Do not use callback arrival order as a commit log;
correlate action IDs with authoritative action/status state. This does not alter
server race resolution or permit undoing committed damage.

The final combined runtime has actual two-client evidence for both body families
and attack directions, readable native upload/impact/purge feedback, Self-ICE,
self purge, physical barricade sight-loss cancellation, range exit, bucket and
resource-stop interruption, and retained Ground Slam poses. Brief textless
return-to-target frames remain; a Ground Slam shockwave is not clearly demonstrated.
The ally-purge demonstration uses a permission-controlled owned-status fixture and
explicit team changes on two clients. Three-actor incoming uploads and observer
coverage remain simulation, not three-client visual proof. See the
[capture evidence index](../docs/research/hacking-live-evidence.md) for exact
deployment identity, failed attempts and acoustic evidence limits.
