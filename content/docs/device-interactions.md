# Overriding a vanilla device prompt

Disable a native device prompt before replacing it with a resource-owned interaction. Supported targets include vending machines, ATMs, terminals, computers and door panels.

```lua
permissions { "world.devices" }
```

```lua
-- One machine, by the id `Open77.world.nearby` reports.
local machine = Open77.world.nearest(8, "device")
Open77.world.setDeviceInteractionEnabled(machine.engineEntity, false)

-- Every machine of a kind, which is what a shop actually wants.
Open77.world.setDeviceInteractionEnabled("VendingMachine", false)

-- Give it back.
Open77.world.clearDeviceInteraction("VendingMachine")
```

Then draw your own with [contextual interactions](interactions.md) — `open77_interactions` has a
`class` target that takes the same class name, so the two halves of this row line up by design.

## Interaction policy

The API intercepts the native method that builds a device's interaction choices:

```
ScriptableDeviceComponentPS::DetermineInteractionState(
    interactionComponent: gameinteractionsComponent,
    context: script_ref<gameGetActionsContext>) -> Void
```

A denied policy publishes an empty choice set through `PushChoicesToInteractionComponent` and rejects use through `InteractiveDevice::OnInteractionUsed`. The policy affects interaction prompts and actions, not the device's power state or quickhacks.

## What it is not

| | |
|---|---|
| **Not a power switch** | The device's lights, screens, sounds and networked behaviour are untouched. Only the player's prompt and its execution are refused. |
| **Not a quickhack block** | Quickhacks are not device interactions; they run through the vision-mode controller, which the multiplayer policy already refuses for its own reasons. |
| **Not authority** | This is presentation policy on one client, like a HUD claim or an input block. Any rule the policy seems to enforce — who may use the ATM, what the machine costs — has to be re-derived by the server handler that receives the intent your own prompt produces. |
| **Not a security boundary** | If `open77_devices` stops, every server-declared policy lifts at once and every vanilla prompt comes back. That is the correct failure — a device nobody can ever use again is the state this design refuses to allow — but it means you must not build a lock out of it. |

## Naming a device

`target` is either an engine entity id or a class name.

- **An engine entity id** is what `Open77.world.nearby(radius, "device")` reports as
  `engineEntity`. A decimal number, or the `0x` string spelling `Open77.doors` uses — they resolve
  to the same device, so a resource that got its id from one API and one that got it from the other
  cannot end up holding two policies on one machine.
- **A class name** matches case-insensitively against **both** names the engine has for a device:
  the object class (`VendingMachine`) and the controller persistent state
  (`VendingMachineControllerPS`). The caller reads the first from `world.nearby`; the hook runs on
  the second. A caller should not have to know which, so both are matched.

A class name accepts letters, digits and underscore only. `"Vending*"` is refused with
`invalid_device_target`: a typo must not become a wildcard that disables half the city.

The second argument is required and must be a boolean. A missing one is refused with
`invalid_device_state` rather than read as "disable" — that is the one mistake that is hard to
notice afterwards.

## Ownership

Per resource, additive in the refusing direction — every active policy must allow an interaction for
it to happen. The same rule [door interaction policies](doors.md) already use.

- Two resources may refuse the same device. One releasing does not lift the other's.
- `clearDeviceInteraction(target)` drops **this** resource's policy for that key. It is not the same
  as `setDeviceInteractionEnabled(target, true)`: an explicit allow is still a policy you hold,
  while a cleared key is one you no longer have an opinion about.
- Clearing something you never set is not an error.
- **Everything a resource holds is released when it stops**, reloads or crashes. A device left
  un-interactable by a resource that no longer exists would be a vending machine nobody could ever
  use again, which is why that release sits in the host beside the ones for doors, blips, markers,
  props and cameras.

`Open77.world.deviceInteractionEnabled(target)` answers the **effective** verdict across every
resource, not your own claim. `Open77.world.deviceInteractionPolicies()` lists who holds what, which
is how an admin resource proves a claim really came back.

## `open77:deviceUsed`

Every use of a vanilla device prompt reaches every client resource, whether it was allowed or
refused:

```lua
AddEventHandler("open77:deviceUsed", function(engineEntity, className, choice, allowed)
    -- allowed is the string "true" or "false"
    if className == "VendingMachine" and allowed == "false" then
        -- our own shop, on a machine whose vanilla prompt we took away
    end
end)
```

`choice` is the choice's TweakDB name as the engine spells it, and may be empty.

## Declaring it from the server

`Open77.world.setDeviceInteractionEnabled` is a **client** capability: the policy has to be held on
the machine that renders the prompt. Doing the fan-out from a gamemode's own client script means
every gamemode reimplements the same thing and gets late joins wrong, so the bundled
`open77_devices` package owns the declaration, the wire and the client claim:

```lua
-- server, in your gamemode
exports.open77_devices:disable("VendingMachine")
exports.open77_devices:disable("VendingMachine", { bucket = 4 })   -- one world only
exports.open77_devices:enable("VendingMachine")
exports.open77_devices:clear()                                     -- drop everything we declared
```

A late joiner and a player who changes routing bucket are both answered. A declaring resource that
stops takes its policies with it.

The package also re-publishes the use report host-wide, so a shop can live entirely in a server
resource:

```lua
AddEventHandler("open77_devices:used", function(playerId, engineEntity, className, choice, allowed)
    -- A CLAIM by that client, rate-limited to 10/s, never authority: validate
    -- distance, bucket and eligibility yourself before opening a shop.
end)
```

## Presentation limits

The use policy and prompt rendering are separate. Lua can report the effective policy and rejected actions, but cannot confirm that the native prompt disappeared. Check the intended device classes in your gamemode; enforce gameplay permissions again on the server.

## Refusal reasons

| Reason | Meaning |
|---|---|
| `permission_denied:world.devices` | The manifest does not declare it. |
| `invalid_device_target` | Not an engine entity id and not a plain class name. |
| `invalid_device_state` | The second argument was missing or not a boolean. |
| `device_policy_limit` | 256 policies for one resource. |
| `device_backend_unavailable` | No game backend on this host (a test harness, or a server VM). |

## See also

- [Contextual interactions](interactions.md) — the prompt you put there instead, with the same
  `class` target spelling.
- [World queries](world-queries.md) — `Open77.world.nearby(radius, "device")`, where the ids come
  from.
- [Networked doors](doors.md) — the same claim shape for doors, which additionally have a server
  authority behind them.
