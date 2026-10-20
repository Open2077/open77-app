# Custom clothing

Register clothing supplied by your resources so it appears in the normal equipment and wardrobe catalogues. The same declarations run on the server and clients, allowing the appearance service to validate, save and replicate the items without modifying Open77's built-in catalogue.

Use matching client/server **2.31.21+op77.145 or later** and the complete **`open77_appearance` 0.3.2 or later** resource. Updating a player's client does not update the server's resources.

Registration supplies metadata. Your mod must also create the actual TweakDB item and provide compatible assets for each declared body family.

## Quick start: register a clothing pack

This example defines two item identities using installed game visuals. Replace the item definitions and assets with your own clothing when building a pack.

```text
my_clothes/
  open77.lua
  clothes.lua
  dist/
    my-clothes.zip
```

Declare registration in a **shared script**, so the server and every client load the same catalogue:

```lua
-- open77.lua
resource "my_clothes"
version "1.0.0"

shared_script "clothes.lua"
permission "clothing.register"

dependency "open77_appearance >=0.3.2"
dependency "tweakxl >=1.11.4"
preload_mod "dist/my-clothes.zip"
```

```lua
-- clothes.lua
local ok, reason = Open77.clothing.register({
    ["Items.MyClothes_Coat_Male"] = {
        slot = "OuterChest",
        body = "male",
        label = "City coat · male",
    },
    ["Items.MyClothes_Coat_Female"] = {
        slot = "OuterChest",
        body = "female",
        label = "City coat · female",
        selectable = true,
    },
})

assert(ok, "Clothing registration failed: " .. tostring(reason))
```

For this minimal example, the ZIP contains `r6/tweaks/my-clothes.yaml`:

```yaml
Items.MyClothes_Coat_Male:
  $base: Items.Coat_01_basic_01
Items.MyClothes_Coat_Female:
  $base: Items.Coat_02_basic_01
```

Enable the provider, `open77_appearance` and the required loader in the server's resource configuration. Enable `open77_wardrobe_ui` to browse the items in the standard wardrobe. Start the resources, connect through the launcher, then open the wardrobe and search for **City coat**; the catalogue filters items for the player's body family.

The record names in Lua must exactly match those defined by the mod. A successful `register` call does not create the TweakDB records or establish that their visuals are installed.

## Package your own meshes and appearances

Preload ZIP paths are relative to the game directory. A pack using ArchiveXL and TweakXL can contain:

```text
archive/pc/mod/my-clothes.archive
archive/pc/mod/my-clothes.archive.xl
r6/tweaks/my-clothes.yaml
```

Include the files your mod actually needs. Add `dependency "archivexl >=1.27.1"` when using ArchiveXL; a pack that only derives records from existing visuals may only need TweakXL.

The server's `requiredMods.enabled` setting enables required-mod distribution. Executable loaders also require `requiredMods.unsecured`. See [Mods and custom assets](mods.md) for the full configuration and [Server resources](server-resources.md) for resource selection and startup.

**Adding or changing native mod files requires clients to restart through the launcher.** Restarting Lua alone cannot mount a new archive or reload a native loader.

For new meshes, configure the native item slot, body compatibility, entity and appearance mappings in the mod itself. `body = "both"` declares compatibility; it does not convert or retarget a mesh. Use separate records when male and female assets need different definitions.

## Registration API

These four functions are available on **both client and server**:

| Function | Permission | Result |
| --- | --- | --- |
| `Open77.clothing.register(definitions)` | `clothing.register` | `true`, or `nil, reason` |
| `Open77.clothing.unregister()` | `clothing.register` | `true`, or `nil, reason` |
| `Open77.clothing.info(recordOrHash)` | None | Custom definition, or `nil, "unknown_record"` |
| `Open77.clothing.list()` | None | Array of custom definitions, sorted by record |

### Definition fields

`definitions` is a map of canonical TweakDB record names to metadata:

| Field | Type / default | Meaning |
| --- | --- | --- |
| `slot` | Required string | `Head`, `Face`, `InnerChest`, `OuterChest`, `Legs`, `Feet`, `Outfit`, `UnderwearTop` or `UnderwearBottom`. Must match the native item. |
| `body` | String, `"both"` | `"male"`, `"female"` or `"both"`. Declares which body families the assets support. |
| `label` | Optional string | Wardrobe display/search label, at most 160 UTF-8 bytes. When omitted, the UI can derive a name from the record. |
| `selectable` | Boolean, `true` | `false` keeps the definition discoverable but excludes ordinary wardrobe selection and persistent appearance requests. |

Record names must contain a dot, be 1–160 UTF-8 bytes, contain no control characters and use the canonical name rather than a `0x` hash. There is no predefined list of permitted custom item names. Unknown fields and incorrect field types are rejected.

Register **1–4,096 records per call**, up to **32,768 custom records** in a runtime's registry. Split a larger catalogue into batches. Each call is atomic: a failing batch leaves none of its new declarations registered.

### Inspect registered items

```lua
local definition, reason = Open77.clothing.info("Items.MyClothes_Coat_Female")
if definition then
    print(definition.record, definition.slot, definition.body, definition.label)
    print(definition.tweakDbId, definition.catalogScope)
else
    print(reason)
end

for _, item in ipairs(Open77.clothing.list()) do
    print(item.record, item.supportsMale, item.supportsFemale, item.selectable)
end
```

`info` also accepts a TweakDBID formatted as `0x` followed by exactly 16 hexadecimal digits. Read results contain `record`, `slot`, `body`, `label`, `selectable`, `tweakDbId`, `supportsMale`, `supportsFemale`, `defaultSelectable` and `catalogScope = "custom"`.

These reads describe the custom registry. Use `Open77.equipment.records` and `Open77.equipment.info` on the client to browse the combined equipment catalogue.

## Equip, preview and save

Declare `player.equipment.edit` for local mutations and `player.equipment.read` for catalogue, family and visual-settling queries:

```lua
-- In the manifest of your wardrobe/shop resource.
permissions { "player.equipment.edit", "player.equipment.read" }
dependency "my_clothes"
```

```lua
-- Client code; call after the player and the clothing provider are ready.
local record = "Items.MyClothes_Coat_Female"
local ok, reason = Open77.equipment.equip(record)
if not ok then
    print("Cannot equip coat: " .. tostring(reason))
    return
end

-- Acceptance and rendered completion are separate.
local visible = Open77.equipment.visualSettled("OuterChest", record)
print("Coat visuals settled:", visible)
```

Use a record compatible with the current family. `visualSettled` can initially be false while native visuals load; use a bounded wait if a screenshot or another action depends on completion. An active wardrobe overlay can also hide worn equipment.

For your own shop UI, page through matching records:

```lua
local family = Open77.equipment.family()
local offset, limit = 0, 256
repeat
    local rows, reason = Open77.equipment.records({
        family = family, slot = "OuterChest", limit = limit, offset = offset,
    })
    if not rows then print(reason) break end
    for _, item in ipairs(rows) do
        print(item.record, item.label)
    end
    offset = offset + #rows
until #rows < limit
```

`offset` counts matching rows after filtering. The default page limit is 200 and the maximum is 2,000. Negative or non-integer offsets return `invalid_offset`.

Registration does not grant inventory ownership, charge currency or implement purchase authorization. Keep those decisions in your server's existing shop flow. The appearance resource validates saved items against the **server catalogue**, normalizes identities, stores equipment/outfits and projects them to in-scope observers. A local preview is not a persistent purchase or save.

The existing server `Open77.clothing.equip`, `unequip`, `set`, `clear` and `requestSnapshot` relay methods remain available; registration extends the same namespace.

## Ownership, reloads and persistence

Declarations belong to the calling resource generation. Identical metadata from multiple resources can share an item; conflicting metadata for the same identity returns `clothing_registration_conflict`.

`Open77.clothing.unregister()` releases **all registrations owned by the caller**. Resource stop, failed startup and generation replacement also release their registrations. Another resource's ownership is preserved.

Keep declarations in a shared script. A server-only registration does not broadcast the catalogue to clients, and a client-only registration does not make an item valid for server-side saves.

Keep record names stable between pack versions: saved characters reference those identities. If a provider temporarily disappears, stored custom items and outfits remain in storage while unavailable visuals are hidden. Re-registering the provider restores the saved projection. Incompatible body-family items are hidden without deleting them; explicit player edits can still replace saved slots. Underwear belongs to worn equipment, not the seven wardrobe overlays.

## Troubleshooting

| Error or symptom | Check |
| --- | --- |
| `permission_denied:clothing.register` | Add the permission to the resource making the mutation. |
| `unknown_record` | Verify shared-script registration and resource startup on both runtimes. |
| `clothing_registration_conflict` | Give every active declaration of the same identity identical metadata, or use a different record name. |
| `invalid_clothing_registration` | Use a nonempty record-to-definition map with only the supported fields and types. |
| `invalid_record`, `invalid_slot`, `invalid_body`, `invalid_label` | Check record format, case-sensitive slot/body values and UTF-8 limits. |
| `clothing_registration_limit` | Reduce active records; the runtime limit is 32,768. |
| `restricted_record`, `incompatible_body_family` | Check selectability and the character's body family. |
| Item is registered but invisible | Check TweakXL logs, mounted archives, the native slot, entity/appearance mappings and wardrobe overlays. |
| Item appears locally but will not save | Verify that the server loads the same declarations and `open77_appearance` 0.3.2 or later. |

When using ArchiveXL dynamic appearances, configure the corresponding `DynamicAppearance` entity and appearance mappings in the asset pack. Open77 registration cannot repair an incorrect native appearance; `visualSettled` accepts ArchiveXL's resolved dynamic names.

Create your own uniquely named item records. Do not replace shared empty/template records such as `Items.GenericInnerChestClothing`, `Items.InnerChestClothingBase`, `Items.TShirt` or `Items.EmptySlotsTShirt` to bypass registration.

Before distributing a pack, check each supported body family, local and remote appearance, save/reconnect, wardrobe overlays and provider stop/restart.
