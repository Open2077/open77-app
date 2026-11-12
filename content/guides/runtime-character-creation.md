# Character creation in the world

New players spawn straight into the world and build their character there, with a complete creator drawn over the live game: no main-menu creator, no save to load first. Freeroam works this way, and it is the reference setup for your own server.

Requires an OPEN//77 client and server **newer than 2.50.0-unstable+op77.225**, with `open77_appearance` 0.5.0 and `open77_creator` 1.0.0 or later.

## What the player sees

1. They connect and spawn in the world with the default male body. The vanilla character creator never opens.
2. Once the gamemode has placed them and they stand still, the creator opens by itself: the HUD steps aside, the camera frames the character and the player is frozen.
3. They pick a body type, start from a look (Nomad, Street Kid, Corpo) or randomize, then edit every option in six tabs: body, face, eyes & brows, hair & beard, makeup, tattoos & piercings. Each option shows the game's own thumbnails or colour swatches, not IDs. Every change is applied live on the character.
4. **Confirm** saves the look. **Later** keeps the default look and closes the creator; it opens again at the next connection until a look is saved.
5. At the next connection they come back with their look, and the creator stays closed. `/creator` reopens it at any time; its **Cancel** button puts the previous look back.

Controls: Q / E turn the character, a drag over the character turns and pans, the mouse wheel over the character zooms, Enter confirms, Esc cancels. The camera travels from one category's shot to the next.

## Turning it on

Two resources do the work:

- `open77_appearance` creates the character in the world instead of sending the player to the vanilla creator, and stores the body.
- `open77_creator` is the creator itself (NativeUI). It stores the creator choices so that a later edit starts from them.

Set the creation mode with a convar:

```jsonc
// server config
"convars": {
  "open77_appearance_creation": "runtime"
}
```

or from your gamemode when it starts, which is what freeroam does:

```lua
-- server
CreateThread(function()
    -- exports answer once every resource of the start has finished loading
    for _ = 1, 200 do
        local ok, done = pcall(function() return exports.open77_appearance:setCreationMode("runtime") end)
        if ok and done then return end
        Wait(50)
    end
end)
```

and depend on the creator in your gamemode's manifest:

```lua
-- open77.lua
dependency "open77_creator >=1.0.0"
```

In runtime mode every character uses one save (the single-save mode of `open77_appearance`). The default stays `"vanilla"`, so servers that keep the menu creator are not affected.

### Placing the player first

If your gamemode moves joining players (a spawn point, a lobby), tell the creator to wait for it. Otherwise the creator frames the character where it first appeared and the player is then teleported away.

```lua
-- server, once at start
exports.open77_creator:expectPlacement(true)

-- server, when your join spawn has placed the player
exports.open77_creator:playerPlaced(playerId)
```

## Server API

| Function or event | What it does |
|---|---|
| `exports.open77_appearance:setCreationMode(mode)` | `"runtime"` or `"vanilla"`; returns `true` or `false, reason` |
| `exports.open77_appearance:creationMode()` | the current mode |
| `exports.open77_appearance:character(playerId)` | `{ userId, characterKey, family, runtimeCreation, persistent }` once known |
| `open77:appearance:characterReady` (server event) | `(playerId, { userId, characterKey, family, isNew, runtimeCreation })` when the player's character is resolved; `isNew` is true for a character this join created |
| `exports.open77_creator:open(playerId)` | opens the creator for a player: a barber, a ripperdoc, a character menu |
| `exports.open77_creator:expectPlacement(on)` | the creator waits for `playerPlaced` before opening for a new character |
| `exports.open77_creator:playerPlaced(playerId)` | your join spawn has placed the player |

Convars of `open77_creator`:

| Convar | Default | Meaning |
|---|---|---|
| `open77_creator_open_new` | `"true"` | open by itself for a character without a saved look |
| `open77_creator_command` | `"creator"` | chat command that reopens it (`""` for none) |

## Client events

| Event | When |
|---|---|
| `open77_creator:visibility` (local) | `true` when the creator opens, `false` when it closes. A HUD or any interface drawn over the world steps aside while it is open. |
| `open77:appearance:hold` (local) | the creator previews bodies on the player while it is open; `open77_appearance` does not put the stored body back until it is released. Use the same event if you write your own creator. |

Freeroam's HUD hides itself like this:

```lua
-- client
local creatorOpen = false
AddEventHandler("open77_creator:visibility", function(open) creatorOpen = open == true end)
```

## What is stored

With a database (see [Database](database.md)):

| Table | Content |
|---|---|
| `open77_characters` | the character and its body type (`open77_appearance`) |
| `open77_character_bodies` | the body per body type, applied at every connection (`open77_appearance`) |
| `open77_creator_looks` | the creator choices, so the next edit starts where the player left |

Without a database, the look lasts for the server session only.

## Building your own creator

`open77_creator` is an ordinary resource on the [character creator functions](character-creator.md): `Open77.body.catalog`, `compose`, `decompose`, `active` and `switch`. Copy it as a starting point: change its layout (`ui/creator.rml`, `ui/creator.rcss`), the camera shots, travelling and panel depth, the categories and the starting-look pictures (`shared/config.lua`), or the labels (`shared/locale.lua`). It saves through `exports.open77_appearance:setBodyFamily(player, family, body, true)`.

The thumbnails come from the game's character creation atlases. `tools/generate_thumbs.py` cuts them out and writes `shared/thumbs.lua`, which maps every option to its pictures. Run it again after a game update changes the creator's options.
