# Cyberware styles and colors

Choose a native cyberarm model and two independent colors from client Lua with `Open77.cyberware`. Build a cosmetic selection menu, read the current style and restore a saved selection without opening the game's customization menu. These functions do not install an implant or unlock its abilities.

Requires Cyberpunk 2077 **2.5** and OPEN//77 client **2.50.0+op77.152** or later. The public functions target the **local player**. Automatic multiplayer RGB synchronization and a Lua color setter targeting another player or NPC are not available in this version.

## Apply a style

Declare the permissions in `open77.lua`:

```lua
permissions { "player.cyberware.read", "player.cyberware.project" }
client_script "client.lua"
```

Call the following from an event or thread after the character has entered the world. Select a family matching the cyberarms your character system has already equipped:

```lua
-- client.lua
local function applyCyberarmStyle(family)
    local styles, reason = Open77.cyberware.customizationCatalog()
    if not styles then print(reason); return end

    local selected
    for _, style in ipairs(styles) do
        if style.type == family then
            selected = style -- In a menu, let the player choose this record.
            break
        end
    end
    if not selected then print("No installed style for", family); return end

    local ok, error = Open77.cyberware.setCustomization({
        record = selected.record,
        primary = 0, -- First color in this brand's palette.
        secondary = { r = 30, g = 180, b = 240 },
    })
    if not ok then print(error) end
end

-- After loading a character equipped with Gorilla Arms:
-- applyCyberarmStyle("strongarms")
```

`setCustomization` returns `true`, or `nil, reason` on failure. It does not return an asynchronous request ID. A successful call accepts the native customization; it does not mean that the replacement model has finished streaming.

Colors update immediately on an already customized model. Changing or restoring the model waits until the native cyberarms/fists are holstered and their attachment is ready. The API does not force holstering. Repeated pending model changes are combined into the latest selection, preventing first-person arm deformation while the arms are drawn.

## Discover models and palettes

`Open77.cyberware.customizationCatalog()` returns an array sorted by record ID, or `nil, reason`. It discovers usable installed native customization records, including valid modded records. Do not hard-code its size or use an array position as a saved style ID.

| Field | Meaning |
|---|---|
| `record` | TweakDB ID string accepted by `setCustomization`; save this identifier. |
| `type` | Cyberarm family: `strongarms`, `mantis`, `monowire` or `launcher`. |
| `brand` | Brand/palette record ID. |
| `index` | Authored native model selector. |
| `longSleevesIndex` | Sleeve variant selector; `-1` means none. |
| `defaultPrimary`, `defaultSecondary` | Default palette indices for the style. |
| `colors` | Five `{r, g, b}` palette colors. Lua positions 1–5 correspond to setter indices 0–4. |

Use `style.colors[index + 1]` to draw a palette swatch for an API palette index. Selecting a different family does not equip that family's implant; manage functional implants through the [cyberware system](cyberware.md).

## Setter options

```lua
Open77.cyberware.setCustomization({
    schemaVersion = 1,
    enabled = true,
    record = selectedRecord,
    primary = { r = 220, g = 50, b = 40 },
    secondary = 2,
})
```

| Option | Default | Contract |
|---|---|---|
| `schemaVersion` | `1` | Only schema 1 is supported. |
| `enabled` | `true` | Boolean. `false` disables customization and resets its model selector. |
| `record` | Required when enabled | Catalog record string, TweakDB record name or hexadecimal `0x…` ID. |
| `primary` | Style's primary default | Palette index 0–4, or `{r, g, b}` with all three integer channels in 0–255. |
| `secondary` | Style's secondary default | Same format, independent of `primary`. |

RGB channels are **sRGB bytes**, not normalized floats; the adapter converts them to native linear values. Omitted colors use the selected style's defaults, not the previous call's colors. To edit one color while preserving the other, read a snapshot, replace the desired field and pass the whole snapshot back.

`Open77.cyberware.setCustomization({ enabled = false })` needs no record. Disabling the style and releasing your resource's ownership are separate actions: use `resetCustomization()` when closing a temporary preview and restoring its previous native state.

## Save and restore a character's choice

`Open77.cyberware.getCustomization()` returns a serializable table:

```lua
{
    schemaVersion = 1,
    enabled = true,
    record = "<record returned by customizationCatalog>",
    primary = { r = 220, g = 50, b = 40 },
    secondary = { r = 30, g = 180, b = 240 },
}
```

Both colors are explicit RGB values even when the setter used palette indices. The same table can be restored:

```lua
-- Capture this table when the player confirms their selection.
local snapshot, reason = Open77.cyberware.getCustomization()
if not snapshot then print(reason); return end
-- Send snapshot to your character service and store it with that character.

-- Later, after the owner's character has loaded:
local function restoreCyberware(savedSnapshot)
    local ok, error = Open77.cyberware.setCustomization(savedSnapshot)
    if not ok then print("Cyberware style restore failed:", error) end
end
```

Storage belongs to your character system. Validate records, colors and any purchase rules on the server, then deliver the saved style to its owner. Reapply it after reconnecting or loading a new body. A saved record may become unavailable if the mod supplying it is removed; offer another catalog entry rather than silently substituting a different saved identifier.

## Ownership and cleanup

One resource owns the customization override at a time. A second writer receives `customization_owned`. Keep preview, confirmation and restoration in the same resource, or explicitly release the first owner before handing control to another.

```lua
local ok, reason = Open77.cyberware.resetCustomization()
if not ok then print(reason) end
```

Reset restores the native model and colors that existed before the owning resource first applied a style, then releases ownership. Resource stop performs the same cleanup. Model restoration follows the holstering rule above; it may finish after the reset call returns.

## Third-person and multiplayer scope

The selected arm appearance can be used by the local third-person puppet. Capture it after the model has settled: `Open77.cyberware.captureArms()` can still return the old model while cyberarms are drawn and replacement is deferred.

An arm appearance profile carries model information, **not its owner's RGB colors**. Sending it through your appearance replication does not synchronize the color snapshot. The public customization setter has no entity target and writes local native customization state; calling it once for each remote player can overwrite the viewer's own colors and affect puppets sharing native materials.

Independent per-character material rendering exists internally, but this release does not expose it as a remote-player/NPC Lua API or connect it to automatic RGB replication. Do not use `setCustomization` as a remote projection function. Custom skin, multilayer, decal and ray-traced material variants are outside the currently validated native metallic-arm rendering path.

## Failure reasons

Read calls return their value or `nil, reason`; mutation calls return `true` or `nil, reason`.

| Reason | What to check |
|---|---|
| `permission_denied:player.cyberware.read` / `permission_denied:player.cyberware.project` | Declare the permission required by the call. |
| `body_not_ready` | Wait for the local character and appearance restoration to finish before reading or changing its style. |
| `resource_not_running` | Invoke mutations from a running event/thread, not resource preparation. |
| `invalid_customization_request` | Reads/reset take no arguments; the setter takes one options table. |
| `unsupported_customization_schema` | Use integer `schemaVersion = 1` or omit it. |
| `invalid_enabled` | Pass a boolean. |
| `invalid_customization_record` | Choose an installed catalog record when enabled. |
| `invalid_customization_color` | Use index 0–4 or all three integer RGB channels in 0–255. |
| `appearance_editor_open` | Close the native appearance editor before applying a style. |
| `customization_owned` | The other owning resource must reset or stop first. |
| `customization_backend_unavailable` / `customization_adapter_missing` | Check that the client and its bundled scripts are from a compatible release. |
| `customization_unavailable` | The native style database is unavailable. |
| `invalid_customization_state` | Native readback could not produce a valid snapshot. |
| `customization_apply_failed` / `customization_reset_failed` | Check character readiness and the native adapter; retain the previous saved selection. |

For functional implants and their server authority, see [Cyberware overview](cyberware.md) and [Gorilla Arms](gorilla-arms.md). The [Lua API reference](/docs/api/client/open77-cyberware) lists the individual functions and permissions.
