# Building a character creator

Edit the player's face, hair, skin, tattoos, makeup, cyberware and body shape from client Lua, with the same options as the game's character creator, and apply the result live without a mirror, a save or a reload. These functions are the building blocks of your own creator: you choose the interface (NativeUI, WebUI, commands), OPEN//77 provides the catalogue and turns choices into a body.

Available from the next OPEN//77 client and server release. It works for both body types, whatever the loaded save, and combines with [runtime body type changes](runtime-body.md).

## The three functions

| Function | Permission | Returns |
|---|---|---|
| `Open77.body.catalog(family)` | `player.body.read` | the creator catalogue of `"male"` or `"female"`, or `nil, reason` |
| `Open77.body.compose(family, choices?)` | `player.body.read` | a body `{ family, groups }`, or `nil, reason` |
| `Open77.body.decompose(body)` | `player.body.read` | the choices of a body, or `nil, reason` |
| `Open77.body.active(family, choices?)` | `player.body.read` | the options active for those choices, or `nil, reason` |

Apply a body with `Open77.body.switch(family, body)`, which needs `player.body.switch` (it includes the reads). Sending the look to your server also needs `network.events`:

```lua
-- open77.lua
permissions { "player.body.switch", "network.events" }
client_script "client.lua"
server_script "server.lua"
```

**Choices** are a table per part (`head`, `body`, `arms`), option name to choice index:

```lua
local choices = {
    head = { hairstyle = 3, eyes_color = 10, nose = 9, jaw = 7, skin_color = 8 },
    body = { body_tattoo = 2 },
    arms = {},
}
```

## Quick start

Read the current look as choices, change a few, and apply:

```lua
-- client.lua
local function editLook(changes)
    local current = Open77.body.capture()
    local choices = assert(Open77.body.decompose(current))
    for part, values in pairs(changes) do
        for option, index in pairs(values) do choices[part][option] = index end
    end
    local body = assert(Open77.body.compose(current.family, choices))
    assert(Open77.body.switch(current.family, body)) -- re-dressed in place
    return body, choices
end

editLook({ head = { hairstyle = 3, eyes_color = 10 } })
```

The player is re-dressed about a frame later (`open77:body:changed` with `redressed`). To change body type and look in one step, compose for the other type and switch to it: `Open77.body.switch("male", Open77.body.compose("male", choices))`.

## The catalogue

`Open77.body.catalog(family)` reads the catalogue the game's own character creator uses. It includes every head, body and arms option, its choices, and the creator's starting presets. Options added by mods merged through ArchiveXL are included. The catalogue is read in the background once the player is in the world. During the first frames, the call returns `nil, "catalog_loading"`: ask again a moment later.

```lua
local function loadCatalog(family)
    for _ = 1, 100 do
        local catalog, reason = Open77.body.catalog(family)
        if catalog then return catalog end
        if reason ~= "catalog_loading" then return nil, reason end
        Wait(100)
    end
    return nil, "catalog_loading"
end
```

```text
catalog = {
  family  = "female",
  version = 13,
  options = { option, ... },   -- about 900 per body type, about 400 shown by the game
  groups  = { { part, name, options = { "name", ... } }, ... },
  presets = { { name = "nomad", maleVoice = false, choices = { head = {...}, body = {...}, arms = {...} } }, ... },
}

option = {
  part           = "head" | "body" | "arms",
  name           = "hairstyle",
  kind           = "appearance" | "switcher" | "morph",
  uiSlot         = "hairstyle",        -- the creator's menu slot (absent when none)
  label          = "Hairstyle",        -- in the player's game language (absent when none)
  labelKey       = "LocKey#...",
  default        = 0,
  hidden         = false,              -- true: not shown by the game's creator
  applied        = true,               -- false: never changes an OPEN//77 body (genitals, photo mode)
  enabled        = true,
  link           = "skin color",       -- absent when not linked
  linkController = false,
  editTags       = { "NewGame", "HairDresser" },
  choices        = { choice, ... },
}

choice = {
  index   = 3,                         -- the value to put in choices (not the array position)
  name    = "...",                     -- appearance or morph name
  label   = "...", labelKey = "...",
  color   = { r, g, b, a },            -- swatch colour, when the creator shows one
  options = { "hair_01", ... },        -- switcher: the options this choice turns on
}
```

### Option kinds

- **appearance**: one look among several: a skin colour, an eye colour, a hair colour, a tattoo, a lipstick.
- **morph**: a face shape for one region: `eyes`, `nose`, `mouth`, `jaw`, `ear`; on the female body, the breast size.
- **switcher**: decides which other options are active. `hairstyle` picks the hair option that is worn, `facial_tattoo` the tattoo layer, `makeupLips_type` the kind of lipstick, and so on. An option a switcher does not select writes nothing, whatever its value. Switchers nest: a lipstick colour shows only when the lipstick type that owns it is selected.

### Linked options

Options sharing a `link` hold one value. The **controller** (`linkController = true`) drives the others, in every part: `head.skin_color` sets the skin of the neck, the body, the arms, the nipples and the tattoos at once. Set the controller only: `compose` overrides what you give a follower.

Some links have **one controller per variant**. Each hairstyle has its own hair colour option (`hair_color1`, `hair_color2`...), and `hairstyle` has a twin, `hairstyle_cyberware`, used with head cyberware. Only one of them is active at a time, chosen by a switcher. The active one drives and the others keep its position, so the hair colour survives a change of hairstyle. `decompose` returns each link once, through its active controller.

### What to show

`Open77.body.active(family, choices)` returns the options the choices make active: `{ head = { hairstyle = true, hair_color4 = true, ... }, body = {...}, arms = {...} }`. Ask again after each change, because a switcher changes what is active.

To show the same options as the game's creator:

- keep `not option.hidden`, `option.applied` and `active[option.part][option.name]`;
- skip followers (`option.link and not option.linkController`);
- group them by `uiSlot`: the hair colour slot then holds the colour of the worn hairstyle only;
- show `label` and the choices' `label` or `color`.

Use `editTags` to restrict a shop to what the game allows there: `HairDresser` for a barber, `Ripperdoc` for a ripperdoc, `NewGame` for a full creator.

```lua
local function menuEntries(catalog, choices)
    local active = assert(Open77.body.active(catalog.family, choices))
    local entries = {}
    for _, option in ipairs(catalog.options) do
        local follower = option.link ~= nil and not option.linkController
        if not option.hidden and option.applied and not follower and active[option.part][option.name] then
            entries[#entries + 1] = {
                part = option.part, name = option.name, kind = option.kind,
                slot = option.uiSlot or option.name, label = option.label or option.name,
                choices = option.choices,
            }
        end
    end
    return entries
end
```

## Compose and decompose

- `compose(family, choices)` returns the body for the choices. An option you leave out takes its catalogue default, so `compose(family)` alone gives the creator's default character. The body holds only the groups an OPEN//77 body uses (first person for its owner, third person for the others): about ten groups, small enough to send in one network event. An unknown option fails with `unknown_option:<part>.<name>`. An index the option does not offer fails with `invalid_choice:<part>.<name>`.
- `decompose(body)` reads the choices back. It is exact for any body `compose` made: the creator's presets go through `compose`, `decompose` and `compose` again without losing anything. On a save's own body, every option is read back except, on some saves, the eyes, eyebrows and eyelashes, which are matched by colour name only.

Keep **your choices table as the source of truth** of your creator. Store it with the body: it is smaller, readable, and survives game updates better than the body's hashes.

### Presets

`catalog.presets` holds the creator's starting looks (for example `nomad` and `corpo`) as ready-to-use choices:

```lua
local catalog = assert(loadCatalog("female"))
for _, preset in ipairs(catalog.presets) do
    print(preset.name)
end
local body = Open77.body.compose("female", catalog.presets[1].choices)
```

### Randomize

```lua
local function randomChoices(catalog)
    local choices = { head = {}, body = {}, arms = {} }
    for _, option in ipairs(catalog.options) do
        local follower = option.link ~= nil and not option.linkController
        if not option.hidden and option.applied and not follower and #option.choices > 0 then
            choices[option.part][option.name] = option.choices[math.random(#option.choices)].index
        end
    end
    return choices
end
```

## Save the look on the server

`compose` runs on the client: the catalogue is game data. To make the look the player's own, send the body to your server resource and let `open77_appearance` apply, replicate and store it:

```lua
-- client.lua
local function save(family, choices)
    local body, reason = Open77.body.compose(family, choices)
    if not body then return false, reason end
    TriggerServerEvent("mycreator:save", family, body, choices)
    return true
end
```

```lua
-- server.lua
RegisterNetEvent("mycreator:save", function(family, body, choices)
    local player = source
    if not isAllowedToEdit(player) then return end -- your rules: creation, a barber, a ripperdoc...
    local ok, reason = exports.open77_appearance:setBodyFamily(player, family, body, true)
    if not ok then
        print(("creator save refused for %d: %s"):format(player, reason))
        return
    end
    saveChoices(player, family, choices) -- optional: keep the choices for the next edit
end)
```

`setBodyFamily` validates the body and puts the player in it, re-dressed in place when the body type does not change. The other players see the new look. The body is stored for the character and the body type, so the player gets it back at the next connection. Passing `true` also saves the body type on the character.

## Limits

- The genitals options have `applied = false`: OPEN//77 bodies are always dressed, and that group is never applied.
- On a save's own body, `decompose` matches the eyes, eyebrows and eyelashes by colour name.
- A network event carries at most 1024 values. Send the body `compose` returns as is: the full catalogue groups would not fit.

## A complete flow

1. On opening, `loadCatalog(family)` and `decompose(Open77.body.capture())` give the catalogue and the current values; `menuEntries(catalog, choices)` gives the menu.
2. On each change, `compose` and `switch` re-dress the player live: the preview is the player. Rebuild the menu when a switcher changed.
3. On cancel, `switch` back to the body captured at opening.
4. On confirm, send the body (and the choices) to the server, which calls `setBodyFamily(..., true)`.

## Lab commands

On a client with the debug bridge, `body.cc.status` shows the catalogues once read. `body.cc.get <filter>` prints the current choices. `body.cc.set head hairstyle 3` edits and re-dresses the player. `body.cc.preset female nomad` applies a preset. `body.cc.roundtrip` checks that body → choices → body loses nothing.
