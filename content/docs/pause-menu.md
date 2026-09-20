# Pause menu customization

Use `Open77.pauseMenu` from a **client resource** to give the OPEN//77 Escape menu your server's accent color and logo. The server logo appears **beside the OPEN//77 logo**, never instead of it. Menu actions remain unchanged.

Requires client **2.31.13+op77.85** or later. No server binary update is required. These settings do not change the native map, HUD, launcher or website branding.

## Quick start

Create a resource with this structure, then enable it in your [server resources](server-resources.md):

```text
server_branding/
  open77.lua
  client.lua
  assets/
    server-logo.png
```

In `open77.lua`, declare the permission, logo and downloadable asset:

```lua
resource "server_branding"
version "1.0.0"
auto_start true

client_script "client.lua"
permissions { "pause_menu.customize" }

pause_menu_logo "assets/server-logo.png"
files { "assets/server-logo.png" }
```

In `client.lua`, set the accent:

```lua
local ok, reason = Open77.pauseMenu.setAccentColor("#FFCC00")
if not ok then
    print("Pause menu branding: " .. tostring(reason))
end
```

The manifest supplies the logo without a `setLogo()` call. The accent applies to menu highlights, keyboard focus and settings controls. Updates appear on the next menu refresh, within one second while the menu is open.

## Logo sources

### Resource asset

`pause_menu_logo` accepts a path relative to its own resource. Declare that file in `files` or `web_files` so the server includes it in the client download.

Local images support **PNG, JPEG and WebP**, up to **1 MiB**. SVG is not supported for local assets. Use a transparent PNG or WebP for a logo without a rectangular background. Wide logos work well; the menu preserves the image's proportions.

Absolute filesystem paths, traversal such as `../`, and paths into another resource are refused.

### Image URL

Replace the local logo directive with a direct HTTP(S) image URL:

```lua
pause_menu_logo "https://cdn.example.com/server-logo.png"
```

The resource still needs `pause_menu.customize`, but the remote image needs no `files` entry. The URL must return an image, not a website or sharing page. HTTPS is recommended. TLS, browser mixed-content restrictions and the player's WebUI blocklist still apply; no referrer is sent.

If an image cannot load, its logo slot is hidden and a diagnostic is logged. The OPEN//77 logo and menu remain available. A successful `setLogo()` validates the reference; it does not guarantee that a remote image will finish downloading.

## Lua functions

All functions below belong to `Open77.pauseMenu` and run on the client.

| Function | Behavior |
| --- | --- |
| `setAccentColor("#RRGGBB")` | Assign this resource's accent. Use exactly six hexadecimal digits; short hex and CSS color names are not accepted. |
| `setLogo(pathOrUrl)` | Assign or override this resource's logo using the same path and URL rules as the manifest. |
| `setAccentColor(nil)` | Release this resource's accent only. An empty string also releases it. |
| `setLogo(nil)` | Release this resource's logo only. An empty string also releases it. |
| `resetAppearance()` | Release both settings owned by this resource, including its manifest logo. |
| `getAppearance([knownRevision])` | Read the effective `{ revision, accentColor, logo }`. If the revision is unchanged, return `nil` without an error. |

Setters return `true`, or `nil, reason` on failure. Changing or resetting the appearance requires `pause_menu.customize`. The read-only `getAppearance()` does not require this permission.

### Change branding while running

```lua
local ok, reason = Open77.pauseMenu.setLogo("assets/server-logo.png")
if not ok then
    print("Logo: " .. tostring(reason))
end

-- Or use a remote image.
-- Open77.pauseMenu.setLogo("https://cdn.example.com/event-logo.png")

Open77.pauseMenu.setAccentColor("#A855F7")
```

### Release your customization

```lua
-- Release both fields owned by this resource.
Open77.pauseMenu.resetAppearance()

-- Or release one field, retaining the other.
-- Open77.pauseMenu.setLogo(nil)
-- Open77.pauseMenu.setAccentColor(nil)
```

Resetting your resource does not delete another resource's branding. The effective appearance falls back to the previous active owner, or the default cyan (`#22D8E2`) and no server logo if there is no other owner.

### Read the current appearance

```lua
local appearance, reason = Open77.pauseMenu.getAppearance()
if appearance then
    print("Accent: " .. appearance.accentColor)
    local revision = appearance.revision

    -- A later read can skip an unchanged result.
    local changed, readError = Open77.pauseMenu.getAppearance(revision)
    if readError then
        print(readError)
    elseif changed then
        print("New accent: " .. changed.accentColor)
    end
elseif reason then
    print(reason)
end
```

`logo` is an empty string when no server logo is selected, an HTTP(S) URL for a remote image, or a potentially large image data URI for a local asset. Avoid logging or repeatedly forwarding the whole value.

## Ownership and lifecycle

The most recent active assignment wins **per field**: one resource can own the accent while another owns the logo. Keep both in one branding resource when they should change together.

Top-level customization calls are staged until the resource starts successfully. A failed start or reload cannot replace the active appearance. Stopping or reloading a resource, or disconnecting, releases its claims. A successful restart reapplies `pause_menu_logo`; `resetAppearance()` is not a permanent edit to the manifest.

## Troubleshooting

| Error or symptom | What to check |
| --- | --- |
| `permission_denied:pause_menu.customize` | Add the permission to the resource manifest. It is required for the manifest logo too. |
| `invalid_accent` | Use a string such as `#FFCC00`, not `#FC0`, `yellow` or an RGB table. |
| `invalid_branding_value` | Pass a string, `nil` or an empty string, not a table or number. |
| `logo_not_declared` | Add the local file to `files` or `web_files`. |
| `invalid_logo_url_or_path` / `invalid_logo_path` | Use a valid HTTP(S) URL or a safe path inside the owning resource. |
| `invalid_logo_image_use_png_jpeg_webp` | Check the local image's format, extension and contents. |
| `pause_menu_unavailable` | Use a client resource with the supported client, not a server script. |
| Lua reports success but the logo is hidden | Check the client log, remote URL, image response and WebUI blocklist. |
| A different color or logo appears | Another active resource may have made a more recent assignment. |

A malformed manifest logo or missing permission can prevent the resource from activating. Correct the manifest or declared asset before retrying.

## Related guides

- [Server branding](server-branding.md): launcher and website icon/banner.
- [Native map](native-map.md): map title, accent and custom tabs.
- [WebUI keyboard input](webui-input.md): consume Escape in your own UI.
- [Resource runtime](resource-runtime.md): manifests, permissions and lifecycle.
