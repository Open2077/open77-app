# Layered outfits

A layered outfit dresses a character in up to **54 clothing layers** worn on top of each other:
a bra under a t-shirt under a shirt under a jacket under a harness, a scarf, a choker, two
earrings, rings on each hand, gloves, a belt, leggings under shorts. Each layer is its own
attachment slot, drawn in a fixed order. The whole look is saved with the character and
replicated to every player in multiplayer.

The layers are **[Equipment-EX](https://github.com/psiberx/cp2077-equipment-ex)**'s clothing
slots (MIT): the same names, the same TweakDB records and the same draw order. A clothing mod
written for Equipment-EX works on Open77 unchanged, and a game that also runs Equipment-EX
shares the records with it.

Layers are an overlay on top of the nine base clothing slots (`Head`, `Face`, `InnerChest`,
`OuterChest`, `Legs`, `Feet`, `Outfit`, `UnderwearTop`, `UnderwearBottom`). The base slots do not
change: every existing equipment API, resource, wardrobe outfit and saved character keeps
working. The server side ships with `open77_appearance` **0.6.0** or later.

## For players: the fitting room

Open the fitting room with `/wardrobe` and go to the **LAYERS** tab:

1. Pick a body area, then a layer, then any clothing item. Any item fits any layer
   (Equipment-EX lets you remap items the same way); the items whose own slot matches the layer
   are listed first.
2. **COPY WORN** turns what you are wearing into layers, so you can build on your current look.
3. **LAYERED LOOK: ON/OFF** switches between the layered look and your normal equipment.
   **CLEAR LAYERS** empties every layer.

Saving an outfit (**OUTFITS > COPY WORN**) also saves its layers, and **WEAR OUTFIT** puts them
back on.

## How it looks in game

- **Layered look off** (the default): the character shows its equipment and wardrobe exactly as
  before.
- **Layered look on**: the seven visual clothing slots (`Head`, `Face`, `InnerChest`,
  `OuterChest`, `Legs`, `Feet`, `Outfit`) show nothing and every layer is attached to its own
  slot. **Underwear stays**: a layered look never strips a body bare.
- **Draw order**: with ArchiveXL, layers draw by garment offset, inner to outer: `TorsoUnder`,
  `TorsoInner`, `TorsoMiddle`, `TorsoOuter`, `TorsoAux`, and so on for each area. Without ArchiveXL
  the game's own order applies.
- **When a layer cannot be drawn** (a slot the engine refuses, a player on an older client):
  - On **your own character**, the garment you wear in that area's base slot stays visible in
    its place.
  - On **other players**, the layer is drawn in its base slot instead (`TorsoInner` goes to
    `InnerChest`, `BodyMiddle` to `Outfit`). When several layers fall back to the same base slot,
    the outermost one wins. A layer without a base slot (rings, earrings, toes) is simply not
    drawn.
  - A client that predates layers ignores them and shows the base equipment.

## The slots

Every slot name is prefixed with `OutfitSlots.`, for example `OutfitSlots.TorsoOuter`.

| Area | Slots (inner to outer where it matters) | Falls back to |
| --- | --- | --- |
| Head | `Balaclava`, `Head` | `Head` |
| Face | `Eyes`, `EyeLeft`, `EyeRight`, `Mask`, `Wreath`, `Glasses` | `Face` |
| Ears | `EarLeft`, `EarRight` | None |
| Neck | `NecklaceTight`, `NecklaceShort`, `NecklaceLong`, `Neckwear` | None |
| Torso | `TorsoUnder`, `TorsoInner`, `TorsoMiddle`, `TorsoOuter`, `TorsoAux` | `InnerChest` / `OuterChest` |
| Back, waist | `Back`, `Waist` | None |
| Arms | `ShoulderLeft/Right`, `ElbowLeft/Right`, `WristLeft/Right` | None |
| Hands | `Hands`, `HandLeft`, `HandRight`, `HandPropLeft`, `HandPropRight` | None |
| Fingers | `FingersLeft/Right`, `FingernailsLeft/Right` | None |
| Legs | `LegsInner`, `LegsMiddle`, `LegsOuter`, `ThighLeft/Right`, `KneeLeft/Right`, `AnkleLeft/Right` | `Legs` |
| Feet, toes | `Feet`, `ToesLeft/Right`, `ToenailsLeft/Right` | `Feet` |
| Body | `BodyUnder`, `BodyInner`, `BodyMiddle`, `BodyOuter` | `Outfit` |

`Left/Right` stands for two slots (`ShoulderLeft` and `ShoulderRight`). `Open77.layers.slots()`
returns the full table on the client, with each slot's area, offset and fallback.

## For server creators

### Configuration

| Convar | Default | Effect |
| --- | --- | --- |
| `open77_layers_strict` | `0` | `1`: a registered clothing item that declares an `OutfitSlots.*` slot may only go in that slot. |
| `open77_layers_uncatalogued` | `0` | `1`: also accept `Items.*` records the catalogue does not know (mod items you did not register). This trusts the clients; prefer registering your mods. |

Otherwise layer items are validated like equipment: the item must be in the audited catalogue
or registered with `Open77.clothing.register`, selectable, and compatible with the character's
body family.

### Server exports (`open77_appearance`)

```lua
-- Read the layered look other players see (unknown or incompatible items are left out).
local layers = exports.open77_appearance:getLayers(player)
-- { active = true, slots = { ["OutfitSlots.TorsoOuter"] = "Items.Cop_01_Set_Jacket", ... } }

-- Set it: validated, saved with the character, replicated, applied on the owner.
local ok, reason = exports.open77_appearance:setLayers(player, {
    active = true,
    slots = {
        ["OutfitSlots.TorsoUnder"] = "Items.TShirt_01_basic_01",
        ["OutfitSlots.TorsoOuter"] = "Items.Cop_01_Set_Jacket",
        ["OutfitSlots.Neckwear"] = "Items.Scarf_01_basic_01",
    },
})
```

`setLayers` replaces the whole set: a slot you leave out is emptied. A temporary gamemode
costume (`setTemporaryOutfit`) switches layers off while it lasts, without losing them.

The `open77_layers_demo` resource (in `resources/dev` of the platform repository) is a working
example: `/layers` puts a stacked outfit on you and `/layers off` takes it off.

### Equipment-EX clothing mods

Declare the outfit slot after the item's base slot, exactly as for Equipment-EX:

```yaml
Items.MyNecklace:
  $base: Items.GenericHeadClothing
  placementSlots:
    - !append OutfitSlots.NecklaceShort
```

Then register the item so the server accepts it, as described in
[Custom clothing](custom-clothing.md). `slot` may be a base slot, or an `OutfitSlots.*` name for
an accessory that has no base slot:

```lua
Open77.clothing.register({
    ["Items.MyNecklace"] = { slot = "OutfitSlots.NecklaceShort", body = "both", label = "Silver necklace" },
})
```

A layer-only item cannot be equipped in a base slot; it is worn through layers only.

## Client API: `Open77.layers`

Reads need the `player.equipment.read` permission, writes need `player.equipment.edit`.

```lua
Open77.layers.slots()                  -- { { name, area, offset, fallback = "Head" | false }, ... }
Open77.layers.get()                    -- { active = bool, slots = { [slot] = record } }
Open77.layers.apply({ active = true, slots = { ["OutfitSlots.Mask"] = "Items.X" } } [, { replace = true }])
Open77.layers.set("OutfitSlots.Glasses", "Items.Cop_01_Set_Glasses")   -- or false to empty it
Open77.layers.activate(true)
Open77.layers.defaultSlot("Items.Shirt_03_basic_01")                   -- "OutfitSlots.TorsoMiddle"
Open77.layers.settled()                -- every stated layer is attached (or fell back)
Open77.layers.hidesBase()              -- the base clothing slots are hidden right now
Open77.layers.state()                  -- one diagnostic line
Open77.puppets.setLayers(player, { active = true, slots = { ... } })  -- a remote player's puppet (puppets.present)
```

These functions change only the local body. To change what the server saves and other players
see, go through the server: `TriggerEvent("open77:layers:request", layers)` on the client (handled
by `open77_equipment`), the fitting room, or the `setLayers` export.

`defaultSlot` follows Equipment-EX: the record's last `OutfitSlots.*` placement slot, otherwise
its rules by record, appearance name, price tag, equipment area and entity. A t-shirt goes to
`TorsoInner`, a jacket to `TorsoOuter`, a jumpsuit to `BodyMiddle`.

## Events

| Event | Direction | Payload |
| --- | --- | --- |
| `open77:layers:self` | Server to the owner | `layers` |
| `open77:layers:record` | Server to observers | `player, layers` |
| `open77:layers:set` | Client to server | `layers`, the whole set. A refused change re-sends the saved set. |

The fitting room's `open77:presentation:commit` patch accepts `layers` and `outfitLayers`
(`{ ["0".."6"] = layers | false }`). `open77:presentation:uiState` carries `layers`,
`outfitLayers`, `layerSlots` and `incompatible.layers`.

## How it works

- **TweakDB**: at startup the client creates the 54 `OutfitSlots.*` attachment slot records
  natively, like Equipment-EX does (name, parent slot, dependency slots), and appends them to
  every player character record and the proxy records. Codeware and TweakXL are not needed.
  Records that already exist, for example from Equipment-EX, are kept. An item is prepared the
  first time it is worn in a layer: the slot is appended to its `placementSlots`, and a zero
  `garmentOffset` takes the slot's offset.
- **Your own character**: each layer is a preview copy attached to its slot. It never goes into
  the inventory or the equipment registry. While layers are on, the wardrobe hides the base
  clothing, so equipment, the inventory paperdoll and the underwear rules work as before.
- **Other players and the third-person view**: the puppet attaches layers to its own slots, with
  the fallback described above.
- **Storage**: layers are saved in the character's wardrobe data (`layers`, `outfitLayers`), with
  no database schema change. An older server ignores them.
