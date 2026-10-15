# Shared WebUI assets with open77://

Use `open77://RESOURCE/PATH` inside an Open77 WebUI to load files from another running resource. An inventory, an admin panel and a clothing shop can use one image library without duplicating the files or passing base64 strings through Lua events.

```js
const itemName = String(item.name ?? item.id);
img.src = `open77://item_assets/html/img/items/${encodeURIComponent(itemName)}.png`;
```

The protocol reads declared files from the player's downloaded resource cache. It supports images, stylesheets, JavaScript, fonts, JSON and browser-supported audio/video. It is a client WebUI feature, not a public HTTP endpoint or a Lua file-reading API.

## Requirements

- Run a client that implements the `open77://` asset protocol. Older clients do not recognize the scheme; a manifest change alone cannot add support.
- Include the provider and its consumers in the server's resource selection. The provider must be running on the client before its files can be requested.
- Declare shared files in the provider's `files` or `web_files` list. Add a consumer `dependency` when its interface needs that provider to start first.

No extra permission or Lua export is needed to read shared assets. Normal WebUI layer and input permissions still apply. A provider can contain only a manifest and assets, with no client script, server script or page.

## Build a shared image library

This complete example shows one item image in a consumer page. Create these two resources under your configured resource root:

```text
resources/
  item_assets/
    open77.lua
    html/img/items/water.svg
  inventory/
    open77.lua
    web/index.html
```

### 1. Declare the provider

`item_assets/open77.lua`:

```lua
resource "item_assets"
version "1.0.0"
auto_start true

files { "html/img/items/**" }
```

`files` makes the server include the matching assets in the signed client download and exposes them through `open77://`. Using `web_files` also exposes its matched files. Only the provider declares these paths; consumers do not copy them into their own manifests.

For a self-contained sample, save this as `item_assets/html/img/items/water.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect x="24" y="4" width="16" height="10" rx="2" fill="#f5df59"/>
  <rect x="18" y="14" width="28" height="46" rx="8" fill="#3fc9c5"/>
  <path d="M32 24C26 32 24 35 24 39a8 8 0 0 0 16 0c0-4-2-7-8-15Z" fill="#e5ffff"/>
</svg>
```

Replace it with your own PNG, WebP or other supported image when integrating an existing catalogue. Keep the URL extension consistent with the actual file.

### 2. Declare the consumer

`inventory/open77.lua`:

```lua
resource "inventory"
version "1.0.0"
auto_start true

dependency "item_assets >=1.0.0"
web_ui_page "web/index.html"
web_files { "web/**" }
```

The dependency establishes startup order. It is not an access-control list: any permitted WebUI page can request a declared asset from a running provider.

### 3. Load the shared file

`inventory/web/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Shared inventory image</title>
    <style>
      body { margin: 0; padding: 32px; font: 18px sans-serif; color: #edf6ef; }
      article { width: 260px; padding: 24px; background: #101c1c; border: 1px solid #3fc9c5; }
      img { width: 64px; height: 64px; }
    </style>
  </head>
  <body>
    <article>
      <img src="open77://item_assets/html/img/items/water.svg" alt="Water bottle">
      <h1>Water</h1>
      <p>One library, shared by every interface.</p>
    </article>
  </body>
</html>
```

Enable both resources in the server's resource selection and join normally so the client downloads them. The manifest creates the inventory page automatically. An admin panel or clothing shop can declare the same dependency and use exactly the same image URL.

## URL format and dynamic paths

```text
open77://item_assets/html/img/items/water.png
         └ provider  └ path relative to the provider's root
```

| Part | Contract |
| --- | --- |
| Scheme | `open77://`. `nui://` is not an alias. |
| Provider | The manifest's resource name, not the consumer name, server hostname or a filesystem path. Use ASCII letters, digits, `_` or `-`, up to 64 characters. |
| Path | A declared file relative to the provider root. Use `/` separators and include the filename extension. |
| Encoding | Percent-encode each dynamic path segment once. Spaces and UTF-8 filenames are supported. Do not encode the `/` separators. |
| Query and fragment | They do not change which declared file is selected. A query string does not invoke a script or API. |

Use a fixed provider and directory when constructing item URLs:

```js
function itemImage(item) {
  const name = item.name ?? item.id;
  if (name == null || String(name) === '') return null;
  return `open77://item_assets/html/img/items/${encodeURIComponent(String(name))}.png`;
}

const source = itemImage(item);
if (source) img.src = source;
else img.hidden = true;
```

Here, `item.name` or `item.id` is a filename stem, such as `water`, not an arbitrary path. If your catalogue stores a complete filename, do not append the extension a second time. For known nested directories, encode each filename or directory segment separately.

Relative URLs in the consumer still resolve inside the consumer. Writing `html/img/items/water.png` in the inventory page does not select `item_assets`; use the complete `open77://` URL.

## Stylesheets, modules, fonts and data

The same protocol can serve a shared UI library. For example, declare `files { "shared/**" }` in a resource named `shared_ui`, then reference its files:

```html
<link rel="stylesheet" href="open77://shared_ui/shared/theme.css">
<script src="open77://shared_ui/shared/widgets.js" defer></script>
<script type="module" src="open77://shared_ui/shared/main.mjs"></script>
```

Relative references inside those files resolve from the shared file's URL. A stylesheet at `open77://shared_ui/shared/theme.css` can load a neighbouring font or image:

```css
@font-face {
  font-family: SharedUI;
  src: url('./fonts/interface.woff2') format('woff2');
}

.item-water {
  background-image: url('open77://item_assets/html/img/items/water.png');
}
```

JavaScript modules support relative imports within the provider:

```js
// shared_ui/shared/main.mjs
import { renderItem } from './render-item.mjs';

const response = await fetch('open77://shared_ui/shared/items.json');
if (!response.ok) throw new Error(`Cannot load catalogue: HTTP ${response.status}`);
const items = await response.json();
items.forEach(renderItem);
```

Declare the imported module, JSON, font and image files too. The protocol does not perform module resolution for npm package names or transform TypeScript/JSX; ship the browser-ready output of your build.

Shared scripts run in the consuming page and can use that page's JavaScript bridge. They do not acquire the provider's Lua state or permissions. Load code from resources you intend to trust in that interface.

Audio and video use ordinary media elements:

```html
<audio controls src="open77://shared_ui/shared/audio/notification.ogg"></audio>
<video controls src="open77://shared_ui/shared/video/intro.webm"></video>
```

Playback depends on the codecs available in the embedded browser and its autoplay rules. The per-file size limit still applies. For larger audio packages and the sound API, see [Packaged audio](package-audio.md).

## Page policies, origins and access

The `strict`, `images`, `media` and `remote` WebUI policies allow declared `open77://` subresources. Loading them does not require enabling Internet access. Each policy retains its separate restrictions on external HTTP(S) content.

The request must originate from the surface's configured page origin. This also supports a configured HTTP(S) entry, such as a development server. An unrelated cross-origin iframe cannot use the shared catalogue. Browser CORS support enables fetch, module and font loads; it does not bypass the origin check or manifest allowlist.

If your page adds its own Content Security Policy, allow `open77:` in each directive it uses:

| Asset | CSP directive |
| --- | --- |
| Images | `img-src` |
| CSS | `style-src` |
| Classic scripts and modules | `script-src` |
| Fonts | `font-src` |
| Audio and video | `media-src` |
| Fetch/XHR | `connect-src` |

Add the scheme to your existing policy; do not replace the other sources your page needs. A custom policy cannot broaden the restrictions imposed by the client.

Use a normal declared HTML file or HTTP(S) URL as the WebUI entry. `open77://` serves subresources; it is not supported for a top-level page, iframe document, worker or desktop browser navigation. It does not provide filesystem access, directory listings, uploads or writes. It also does not change APIs that accept resource-relative paths rather than browser URLs.

The provider's declared files are client-visible. Do not put secrets in an asset library. Undeclared files, absolute disk paths, traversal, encoded separators and paths escaping the resource root through a symlink or junction are refused.

## Lifecycle and caching

| Event | Behavior |
| --- | --- |
| Provider starts | Its declared asset catalogue becomes available independently of whether it creates a WebUI. |
| Consumer starts | Its page can request the provider's files. A dependency ensures the provider starts first. |
| Provider stops | New requests return `404`. Images already displayed and scripts already executed are not removed from existing pages. |
| Provider reloads | The current catalogue and cache validators are replaced. A new request to a stable URL resolves against the updated provider. |
| WebHost restarts | The client republishes active catalogues before restoring WebUI surfaces. |
| Session disconnects | Server-resource registrations are removed. |

To distribute changed files, use the normal resource publication/reload flow described in [Server resources](server-resources.md). Editing server files does not directly edit an already downloaded client copy. If a page should immediately display changed content, request it again or reload the page; a provider reload does not rerun an already imported JavaScript module in every consumer.

Responses use `Cache-Control: no-cache` and ETags, allowing browser cache validation. Shared URLs avoid duplicating resources and transporting bytes through Lua, but they do not promise a single decoded image or JavaScript module instance across all WebUI surfaces. Each page still has its own browser context.

### Methods and response codes

| Request or response | Behavior |
| --- | --- |
| `GET` | Read the file. |
| `HEAD` | Read response headers and the representation length without a body. |
| `OPTIONS` | CORS preflight; `204` for an allowed, available file. |
| `If-None-Match` | A matching ETag returns `304 Not Modified`. |
| `Range: bytes=…` | A valid single range returns `206 Partial Content`; bounded, open-ended and suffix ranges are supported. Multipart ranges are not. |
| `If-Range` | A matching ETag permits the range. A stale value returns the full file. |
| `403` | The requesting origin or document request is not allowed. |
| `404` | The provider/file is unavailable, undeclared, invalid or outside the permitted file boundary. |
| `405` | Unsupported method, such as `POST` or `PUT`. |
| `416` | Invalid or unsatisfiable range. |

File extensions determine the response MIME type. Unknown extensions use `application/octet-stream`; give scripts, stylesheets and fonts their correct extensions.

## Large image libraries

A library containing 6,000 item images fits in one `files` declaration. The expanded manifest lists and file sizes have these limits:

| Limit | Maximum |
| --- | --- |
| Expanded `files` list | 6,144 files |
| Expanded `web_files` list | 6,144 files |
| Combined shared catalogue | 12,288 entries before duplicate paths are removed |
| Individual file | 16 MiB |
| Combined declared-path text | 4 MiB |

Other resource-package and download limits still apply. Include only assets you need and partition larger libraries into separate resources when required.

The catalogue is indexed once per running provider, and WebHost streams files directly from disk. Rendering 6,000 images at once can still consume substantial memory and rendering time. Use appropriately sized thumbnails, lazy loading or a virtualized item grid; share identifiers and URLs through the UI bridge instead of image bytes.

## Migrating a FiveM or RedM interface

Replace the resource URL scheme and declare the provider's assets in an Open77 manifest:

```js
// FiveM / RedM
img.src = `nui://vorp_inventory/html/img/items/${item.name || item.id}.png`;

// Open77, with an active resource named vorp_inventory
const name = encodeURIComponent(String(item.name ?? item.id));
img.src = `open77://vorp_inventory/html/img/items/${name}.png`;
```

Preserve the directory structure or adjust the path to match it. Add a dependency in each consumer. This replaces asset loading only; events, callbacks and game APIs still need their Open77 equivalents. See [FiveM compatibility](fivem-compatibility.md).

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Unknown URL scheme | The running client must implement `open77://`. It is not available in a normal desktop browser. |
| Missing image or `404` | Verify the provider's manifest name, running state, declared path, downloaded file and extension. Check that the file fits the size limit. |
| Works in one resource but not another | Use an absolute `open77://` URL and declare the provider dependency. A relative URL stays in the consumer. |
| `403` or a failed fetch in an embed | Make the request from the surface's configured page origin. Cross-origin embedded pages and document navigation are refused. |
| CSP refusal | Add `open77:` to the relevant directive in the page's own policy. Read the browser console for the exact directive. |
| Module, CSS or font refused | Check its extension, the provider's declarations and any relative imports. A page must also allow the corresponding CSP source. |
| Image remains old after a provider update | Confirm the client received the new resource, then request the image again or reload the consuming page. |
| Resources fail to start | Check dependency names/versions, empty glob patterns and expanded manifest limits in resource logs. |
| Images load but scrolling is slow | Reduce decoded image dimensions and the number of visible DOM elements; URL sharing does not remove rendering costs. |

For a failed fetch, inspect its response status and the WebHost browser console. A network or CSP failure may reject `fetch()` before it returns a response; handle that exception separately from `response.ok`.

Continue with [Resource runtime and WebUI](resource-runtime.md#webui), [Server resources](server-resources.md) or [WebUI keyboard input](webui-input.md).
