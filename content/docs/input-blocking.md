# Blocking player input

Block individual input actions or the complete control stream from a client resource. Use resource-owned claims for menus, cutscenes, progress bars and gameplay restrictions.

```lua
permissions { "input.actions" }            -- per-action blocking
permissions { "input.blockAll" }           -- taking the whole control stream
```

This is a client-only API. A server gamemode sends an event to its client resource and
lets that resource own the claim, exactly as it does for HUD visibility and blips.

## Input paths

Actions use different native input paths. Firing and aiming are polled by the weapon state
machine; movement is handled by locomotion. The engine has no general per-action block list.
The API reports unsupported or already-enforced actions explicitly:

| You ask for | You get |
|---|---|
| an action that is not in the vocabulary | `false, "unknown_action"` |
| an action this engine cannot refuse | `false, "action_not_blockable"` |
| an action Open77 already blocks unconditionally | `false, "action_already_enforced"` |

Query `Open77.input.blockableActions()` for available actions instead of hard-coding names.

## The vocabulary

### Blockable — a resource may claim and release these

| Action | What it stops | Mechanism | Confidence |
|---|---|---|---|
| `Movement` | walking, running, jumping, dodging, climbing — all together | `restriction` | proven |
| `Map` | the fullscreen map shortcut | `action` | proven |
| `Hub` | every RPG hub page: inventory, crafting, perks, stats, journal | `flow` | measured |
| `FastTravel` | the player's own fast travel, with the map still usable | `flow` | measured |
| `Attack` | firing a ranged weapon | `condition` | **inferred — verify it** |
| `WeaponWheel` | the radial weapon wheel; the bundled context menu holds this one for its lifetime | `condition` | proven |

`blockableActions()` includes a `confidence` field. Treat `inferred` actions as experimental.
Do not rely on `Attack` input blocking alone to enforce a safe zone; validate combat rules on the server.

### Already enforced — nothing to claim

These are blocked by Open77 for the whole session. `isActionBlocked` reports them as
blocked; `setActionBlocked` refuses with `action_already_enforced`.

| Action | Why |
|---|---|
| `PhotoMode` | the stock activation request is detoured at plugin load. `Open77.photoMode` owns activation |
| `Scanner`, `Quickhack` | the vision-mode controller is refused while the multiplayer policy is active. Tab still reaches WebUI and key mappings |
| `CallVehicle` | every summon phase and both `QuickSlotsManager` entry points |
| `Journal` | the quest log is refused on both hub scenarios |

### Not blockable on 2.31

`Jump` · `Sprint` · `Crouch` · `Dodge` · `Slide` · `Aim` · `Reload` · `Melee` ·
`NextWeapon` · `Interact` · `EnterVehicle` · `ExitVehicle` ·
`Consumable` · `Grenade` · `Inventory` · `Phone` · `Radio`

Three reasons cover almost all of them, and each is written up with its evidence in
[`docs/research/input-action-blocking.md`](../docs/research/input-action-blocking.md):

- **polled, not dispatched** — no action hook ever sees them (`Jump`, `Crouch`, `Aim`,
  `Reload`, `Melee`);
- **the only engine record is unusable** — the finer locomotion restrictions
  (`Tier2Locomotion` and its variants, which also carry the inhaler and grenade tags) are
  stripped every frame by Open77's own safe-area reconciliation, which is what lets players
  run in a lobby. A claim there would be removed on the next frame, forever;
- **the name is documented but never verified** — the per-page fullscreen names behind
  `Inventory` were never checked against this build, and a wrong name is a silent no-op.
  Use `Hub`.

Use `Movement` or `blockAll` where you wanted `Jump` or `Sprint`, and `Hub` where you
wanted `Inventory`.

## API

```lua
local ok, reason  = Open77.input.setActionBlocked(action, blocked)
local blocked, reason = Open77.input.isActionBlocked(action)
local ok, reason  = Open77.input.blockAll(spec)
local actions, reason = Open77.input.blockableActions()
local held, reason    = Open77.input.blocks()
```

`isActionBlocked` returns the **effective** state, combining every resource's claims — not
your own claim. A resource that released its block still reads `true` while another
resource holds one.

```lua
local cuffs = {}

function cuffs.apply()
    local ok, reason = Open77.input.setActionBlocked("Movement", true)
    if not ok then
        print("cuffs: " .. reason)   -- never assume; the vocabulary can change
        return
    end
    Open77.input.setActionBlocked("Hub", true)
end

function cuffs.release()
    Open77.input.setActionBlocked("Movement", false)
    Open77.input.setActionBlocked("Hub", false)
end
```

## `blockAll` — the whole control stream

```lua
Open77.input.blockAll()                                 -- take everything
Open77.input.blockAll({ except = { "Movement" } })      -- everything but walking
Open77.input.blockAll(false)                            -- release this resource's claim
```

It consumes the entire gameplay action stream on the player puppet and asserts every
blockable lever above, minus `except`. This is the same lever the death state already uses,
which is why two things are true of it for free:

- **chat and voice keep working.** Open77 chat and voice run on focused browser input, not
  on the gameplay action stream, so a blocked player can still talk. That is deliberate and
  it is what makes `blockAll` usable on a live player.
- **vanilla menus are not closed or prevented.** Menu shortcuts arrive on a different
  controller, and the pause menu arrives with them — a blocked player must always be able to
  reach settings, accessibility and disconnect. Block `Map` and `Hub` explicitly when you
  want those gone.

`except` names actions from the vocabulary, never raw engine action names. The stream
consume is all-or-nothing at the engine level — the engine's action type cannot separate a
press from its release, and the consumer is not per-action — so `except` lifts the
per-action levers and cannot spare a raw action from the consume. An unknown or unblockable
name in `except` is refused, and nothing is taken: a half-applied `blockAll` is the one
state a player cannot talk his way out of.

`input.blockAll` is a separate permission from `input.actions` because it is a different
blast radius, and it deserves its own line in a manifest audit.

## Ownership and release

Blocking is a loan.

- Two resources may block the same action. A release by one does not lift the other's.
- `setActionBlocked(action, false)` removes only the calling resource's claim.
- **Everything a resource holds is released when it stops**, reloads, or is torn down —
  action claims and the `blockAll` claim alike. That is the final safety net, and it is the
  same rule that already governs pages, blips, markers, props, anchors, key mappings and
  HUD claims.
- Releasing something you never claimed is not an error, so a resource that tidies up on
  every path can do so unconditionally.

`Open77.input.blocks()` shows who holds what, which is how an admin resource proves a
claim really came back:

```lua
local held = assert(Open77.input.blocks())
for _, row in ipairs(held.actions) do
    print(row.action .. " <- " .. table.concat(row.owners, ", "))
end
for _, row in ipairs(held.blockAll) do
    print("blockAll <- " .. row.owner .. " except " .. table.concat(row.except, ", "))
end
```

## Compatibility

`Open77.input.setNativeActionBlocked("OpenMapMenu", blocked)` keeps working unchanged. It
now claims `Map` for the same owner, so the two APIs cannot disagree about who holds the
map. It still names the *engine* action rather than a vocabulary entry, and it still
answers `unsupported_native_action` for anything else.

## Human verification

This row cannot be proven without someone at the keyboard: every check is a key pressed
and an effect seen. Two minutes, from a resource holding `input.actions` and
`input.blockAll`:

| # | Do this | Must happen | Must still work |
|---|---|---|---|
| 1 | `setActionBlocked("Movement", true)`, then push the movement stick / press W | V does not move | camera still looks around |
| 2 | `setActionBlocked("Movement", false)`, press W | V walks again | — |
| 3 | `setActionBlocked("Map", true)`, press the map key | no fullscreen map | the pause menu still opens on Escape |
| 4 | `setActionBlocked("Hub", true)`, press the inventory key | no inventory, no crafting, no perks | the pause menu still opens; settings and disconnect still reachable |
| 5 | Open the map, aim at a fast-travel point with `setActionBlocked("FastTravel", true)` | the confirm does nothing | the map still opens and still pans |
| 6 | `setActionBlocked("Attack", true)`, fire a pistol — **this is the unproven one** | no shot, no ammunition spent | melee still swings (it is not blockable) |
| 7 | `blockAll()`, then try to move, shoot, interact, enter a vehicle | nothing responds | **open chat and type — it must work**; **hold the voice key and speak — it must transmit** |
| 8 | `blockAll(false)` | everything responds again | — |
| 9 | Stop the resource while it still holds `blockAll` | the player is free within one frame | — |

Step 7's two "must still work" checks are the point of the whole design: a player who
cannot act must still be able to say so.

Step 9 is the one that matters most. If it ever fails, a player is stranded, and the fix is
in the release path, not in the block.
