# Changing body type at run time

Move the local player into a male or female body from client Lua **without reloading a save or leaving the world**. The camera, controls, HUD, stats, health and stamina, inventory, worn clothing, held weapons and the third-person view follow the new body. Other players see the change in place.

Requires OPEN//77 **2.50.0-unstable+op77.225** (Unstable channel) or later, client and server. The standard `open77_appearance` resource already relies on this API: switching body type from a server is one export call (see [With open77_appearance](#with-open77_appearance)).

## Switch body type

Declare the permission in the resource manifest:

```lua
-- open77.lua
permissions { "player.body.switch" }
client_script "client.lua"
```

Then switch from an event, a command or a menu, once the player is in the world:

```lua
-- client.lua
local ok, reason = Open77.body.switch("female")                 -- the default female body
local ok, reason = Open77.body.switch("male", savedBody)        -- a body stored earlier
local ok, reason = Open77.body.switch(Open77.body.state().mainFamily) -- back to the save's body type

AddEventHandler("open77:body:changed", function(event, family)
    if event == "switched" then
        print("now playing a " .. family .. " body")
    elseif event:sub(1, 7) == "failed:" then
        print("switch refused: " .. event:sub(8))
    end
end)
```

`switch` answers at once (`true`, or `false, reason`) and the switch completes about one second later, reported by `open77:body:changed`:

| Event | Meaning |
|---|---|
| `switched` | The player now drives a body of `family`. |
| `redressed` | Same body type, another look: the body was dressed again in place, faster than a switch. |
| `unchanged` | The requested body was already the one driven. |
| `reset` | The world went away (disconnection, session reload); the state starts over. |
| `failed:<reason>` | The switch did not happen; the player keeps the previous body. |

One switch runs at a time. A request made during a switch is played once it settles.

## API

| Function | Permission | Returns |
|---|---|---|
| `Open77.body.state()` | `player.body.read` | `{ family, mainFamily, phase, switched, busy, revision, lastError? }` |
| `Open77.body.switch(family, body?)` | `player.body.switch` | `true`, or `false, reason` |
| `Open77.body.defaults(family)` | `player.body.read` | the built-in default body `{ family, groups }` |
| `Open77.body.capture()` | `player.body.read` | the body the player drives `{ family, groups }` |
| `Open77.body.catalog(family)` | `player.body.read` | the character-creator catalogue ([Character creator](character-creator.md)) |
| `Open77.body.compose(family, choices?)` | `player.body.read` | the body for creator choices |
| `Open77.body.decompose(body)` | `player.body.read` | the creator choices of a body |
| `Open77.body.active(family, choices?)` | `player.body.read` | the creator options active for those choices |

`player.body.switch` includes the reads.

- `family` is `"male"` or `"female"`. `mainFamily` is the body type of the loaded save.
- `phase` is `"main"` (the save's own body), `"spawning"`, `"dressing"` or `"switched"`.
- `revision` grows with every completed switch or re-dress.
- A **body** is the table every replicated player body uses: `family` plus `groups`, each group a `{ part, name, keys, morphs }` with hashes as `0x` strings. Treat it as opaque data: store it, send it, pass it back to `switch`. To build or edit one, use the [character creator API](character-creator.md).
- Without a body, `switch` dresses the save's body type with the save's own look, and the other type with its built-in default look.

## How it works

Each session loads one save, and the save's character keeps its body type for the whole session. To play the other type, OPEN//77 spawns a second player character built from that type's own player template and dresses it with the body. It then carries over everything that belongs to the player:

- stats and stat pools (health, stamina, RAM...);
- the inventory and money, quest items included;
- the equipped clothing and weapons, equipped again on the new body;
- the position, exactly, in the same frame.

Control then passes to the new body through the game's player system, the mechanism the game itself uses when you play another character. The save's character stays in the world, hidden, without collision and invisible to NPCs. Switching back to the save's body type spawns a fresh body of that type with the save's look: control never returns to the original character.

## With open77_appearance

The standard appearance resource already uses runtime switching. When a server changes a player's body type, the client switches in place. Only a client too old for runtime switching falls back to reloading the session. The server validates the body published after the switch, sends it to the other players, and stores it per character and per body type. At the next connection the player is put back in that body, including a look made with a [character creator](character-creator.md) on the save's own body type. A look edited later in the in-game mirror replaces the stored body of that type.

```lua
-- server
exports.open77_appearance:setBodyFamily(playerId, "female")             -- their stored female look
exports.open77_appearance:setBodyFamily(playerId, "male", body)         -- a given body (same type: re-dressed in place)
exports.open77_appearance:setBodyFamily(playerId, "female", nil, true)  -- and save the body type on the character
local family = exports.open77_appearance:runtimeBodyFamily(playerId)    -- nil while on the save's own body
```

`setBodyFamily` returns `true`, or `false, reason` (`invalid_player`, `invalid_family`, `invalid_body`, `appearance_not_ready`). The server stays the authority: a body a client publishes in a body type the server did not set is refused.

### One save for every character

Set the convar `open77_appearance_single_save` to `true` and every client loads the male pristine session. A female character is then moved into her body at run time as soon as she enters the world. Her look comes from her stored body (table `open77_character_bodies`). A character who has not played since this version starts with the default female body until her look is stored again. The convar is off by default.

### Equipment and gamemodes

`open77_equipment` applies its record again on `open77:body:changed`, so server-managed clothing follows the new body. A gamemode that gives weapons, applies status effects or attaches props to the player should do the same:

```lua
AddEventHandler("open77:body:changed", function(event)
    if event == "switched" then
        TriggerServerEvent("mygamemode:reapplyLoadout")
    end
end)
```

## Limits

- The game's own character-customization state keeps describing the save's body type. The in-game mirror editor (`Open77.appearance.open`) therefore edits that type only. To edit either type, use the [character creator API](character-creator.md).
- A switch takes about one second. A re-dress of the same body type is faster.
- The body is local to the player who drives it. Other players see it through the appearance service, like any other look change.
