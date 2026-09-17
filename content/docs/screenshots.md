# Screenshots and mugshots

Capture the rendered game frame, upload an image or create a player mugshot. Client and server entry points have separate permissions:

| Function | Runtime | Permission | What it does |
|---|---|---|---|
| `Open77.screen.capture(options)` | client | `screen.capture` | The frame (or a region of it) as JPEG or PNG bytes, through a promise |
| `Open77.screen.surface()` | client | `screen.capture` | The back buffer's size and format, so a region can be sized first |
| `Open77.screen.upload(capture, url, options)` | client | `screen.upload` | POSTs a capture to a URL, multipart or as a base64 JSON envelope |
| `Open77.screen.mugshot(target, options)` | client | `screen.capture` + `camera.script` + `world.transform` | A head-and-shoulders picture of a body through a scripted camera, view restored |
| `Open77.players.requestScreenshot(playerId, options)` | server | `players.screenshot` | Asks one client for a picture, delivered by that client to a URL; resolves with the receipt |

---

## What is captured, and where the pixels come from

Open77's developer-console overlay already hooks the game's `IDXGISwapChain::Present`
and holds the swap chain, the D3D12 device, the direct queue and a fence. A capture is one
more command list on that same queue: the back buffer about to be presented is transitioned
`PRESENT -> COPY_SOURCE`, one `CopyTextureRegion` copies the requested region into a
`READBACK` heap buffer, the buffer is transitioned back, the list is executed and a fence is
signalled. **The render thread never waits.** A worker thread waits on the fence, maps the
buffer, converts the rows to 24-bit BGR and encodes them with Windows Imaging Component
(JPEG with the quality option, or PNG). Every result carries what that cost: `copyMicros` is
the render-thread cost of recording and submitting the copy, `encodeMicros` the worker's
readback and encode, `totalMicros` request to promise.

Two copy points exist, and `includeOverlay` picks one:

- **`false` (default): the game alone** -- the copy is submitted BEFORE the overlay's own
  command list, so it holds what the engine rendered: world, HUD, vanilla menus, photo mode.
  Open77's nameplates, WebUI pages, world markers and the console are not in it.
- **`true`: the game plus Open77's UI** -- the copy is submitted AFTER the overlay pass. On a
  frame where the overlay drew nothing the two are the same picture.

**Never the desktop, never another window.** The bytes come from the swap chain the game
presents, inside the game's own Present. There is no `PrintWindow`, no screen grab, no window
enumeration; an overlay that belongs to another process cannot be in the picture.

### The surface format is read, not assumed

The swap chain's format is read from the buffer's description on every Present.
`Open77.screen.surface()` reports it (`format`, e.g. `R8G8B8A8_UNORM`) together with the
conversion family (`pixel`) and whether captures are possible (`supported`):

| DXGI format | `pixel` | Conversion |
|---|---|---|
| `R8G8B8A8_*` | `rgba8` | exact, swizzled to BGR |
| `B8G8R8A8_*`, `B8G8R8X8_*` | `bgra8` | exact |
| `R10G10B10A2_*` | `rgb10a2` | top eight bits of each channel. Under an SDR output this is exact; under an HDR10 output the values are PQ-encoded and the picture comes out dim and desaturated -- it is still the frame, not a conversion error |
| `R16G16B16A16_FLOAT` | `rgba16f` | linear scRGB clamped to 0..1 and sRGB-encoded: midtones right, highlights clipped |
| anything else | `unsupported` | every capture refuses with `format_unsupported` |

The active format depends on the game's HDR setting. The client logs `Screenshot surface: WxH FORMAT (pixel)` once per format at the first Present.

### Ceilings and the in-flight rule

- **One capture in flight per resource.** A second `capture` before the first settled is
  `capture_in_flight`, never a queue; await each one. Eight captures across the whole client
  (`capture_limit`): each pins a readback buffer of its region's size until the encoder is
  done with it.
- A region past an edge is `region_invalid`, never clamped -- a caller that asked for 64x64
  and silently got 40x64 would have to notice on its own.
- The encoded picture is capped at `maxBytes` (8 MiB by default, 16 MiB at most):
  `capture_too_large`.
- Nothing can be captured while the overlay is not initialised (no swap chain hooked, or the
  window is mid-resize): `device_unavailable`. `surface().ready` says so beforehand.
- `settleFrames` (0..30) skips that many Presents before the copy. A cut camera needs the
  engine to have rendered a frame *through* it before the pixels mean anything; `mugshot`
  uses 3.
- `scale` (0.05..1, default 1) shrinks the encoded picture to that fraction of the region,
  through the encoder's own Fant scaler after the conversion -- the one place a downscale is
  free. `width`/`height` in the result are the scaled size; `regionWidth`/`regionHeight`
  what was copied. A 540 px mugshot at `scale = 0.25` leaves as a 135 px, ~4 KiB thumbnail.

---

## `Open77.screen.capture(options) -> Promise | nil, reason`

```lua
CreateThread(function()
    local shot, reason = Open77.screen.capture({
        format = "jpeg",        -- or "png"
        quality = 85,           -- 1..100, jpeg only
        region = { x = 0, y = 0, w = 640, h = 360 },  -- pixels; omit for the whole frame
        includeOverlay = false, -- true: nameplates, pages and the console too
        settleFrames = 0,       -- Presents to skip first
        maxBytes = 4 * 1024 * 1024,
        scale = 1,              -- 0.05..1: shrink the output through the encoder's scaler
    })
    if not shot then return print("refused: " .. tostring(reason)) end
    local picture, why = shot:await()
    if not picture then return print("failed: " .. tostring(why)) end
    print(("%dx%d %s, %d bytes, copy %d us, encode %d us, source %s"):format(
        picture.width, picture.height, picture.format, picture.sizeBytes,
        picture.copyMicros, picture.encodeMicros, picture.sourceFormat))
end)
```

The promise is the same `Open77.Promise` every other awaitable hands out (`:await()`,
`:next()`, `:status()`); it resolves with:

| Field | Meaning |
|---|---|
| `bytes` | the encoded picture, a binary string |
| `sizeBytes` | `#bytes` |
| `width`, `height` | of the picture (the region, or the whole frame, times `scale`) |
| `regionWidth`, `regionHeight` | of the region copied, before scaling |
| `format` | `jpeg` or `png` |
| `screenWidth`, `screenHeight` | the back buffer's size |
| `sourceFormat` | the DXGI format the frame was read in |
| `includeOverlay` | which copy point was used |
| `copyMicros`, `encodeMicros`, `totalMicros` | the measured costs |

A resource that stops, reloads or errors has its pending captures cancelled and every promise
rejected with `resource_stopped` / `resource_error`; nothing is left waiting on a picture
that will never come.

**Refusals**, all by name: `permission_denied:screen.capture`,
`screenshot_unavailable_on_this_host`, `device_unavailable`, `format_unsupported`,
`region_invalid`, `invalid_quality`, `invalid_settle_frames`, `invalid_max_bytes`, `invalid_scale`,
`invalid_capture_option:<key>` (an unknown key -- a typo is visible the first time it runs),
`capture_in_flight`, `capture_limit`. **Rejections**: `capture_too_large`,
`encode_failed:<stage>`, `gpu_timeout`, `cancelled`, `resource_stopped`.

---

## `Open77.screen.upload(capture | bytes, url, options) -> Promise | nil, reason`

The bytes have to go somewhere, and the client is the party that has them. `upload` POSTs a
capture result (its `bytes`, `format`, `width` and `height` travel along) or a bare string
of image bytes to an absolute `http://` or `https://` URL over WinHTTP, on a thread of its
own, and resolves with the receipt.

```lua
local upload = Open77.screen.upload(picture, "https://rp.example.net/mdt/evidence", {
    encoding = "multipart",          -- default; or "json"
    field = "files[]",               -- multipart file field (screenshot-basic's default)
    filename = "evidence.jpg",
    fields = { reportId = "4711" },  -- extra text parts / JSON fields (up to 16)
    headers = { Authorization = "Bearer token" },  -- up to 16, no CR/LF
    timeoutMs = 15000,               -- 1000..60000
})
local receipt, why = upload:await()
-- receipt = { status = 200, body = "...", bodyTruncated = false, sentBytes = 20481, elapsedMs = 130 }
```

Two encodings:

- **`multipart`** -- `multipart/form-data` with every `fields` entry as a text part and the
  picture as one file part under `field` with its `image/jpeg` / `image/png` content type.
  This is what image hosts, Discord webhooks and `screenshot-basic` targets expect.
- **`json`** -- `application/json`: `{ "format", "width", "height", "sizeBytes", ...fields,
  "data": "<base64>" }`. For a target that cannot take a binary body -- the server's own
  [`Open77.http.listen`](server-api.md#serving-http) route decodes UTF-8 text and caps bodies
  at 16 KiB, so a thumbnail travels there this way. A JPEG's first four base64 characters are
  always `/9j/`, a PNG's first five `iVBOR`, which is a cheap sanity check on the receiving
  side.

Rules: the URL carries no credentials (`user:pass@host` is `invalid_url`); redirects are never
followed, so the host named is the only host reached; `Content-Type`, `Content-Length` and
`Host` are the client's and cannot be set; the response body is kept up to 64 KiB
(`bodyTruncated` says when it was cut). Two uploads in flight per resource
(`upload_in_flight`), eight per client (`upload_limit`), 16 MiB per upload (`bytes_too_large`).

**Refusals**: `permission_denied:screen.upload`, `screenshot_unavailable_on_this_host`,
`bytes_empty`, `bytes_too_large`, `invalid_url`, `invalid_upload_option:<key>`,
`invalid_header`, `invalid_field`, `too_many_headers`, `too_many_fields`, `upload_in_flight`,
`upload_limit`. **Rejections**: `request_failed:<stage>:<winhttp code>` (`connect`, `send`,
`status`, `read` -- `12029` is "cannot connect", `12007` "name not resolved"), `timeout`,
`cancelled`.

There is no host allow-list on the client, and that is deliberate: a client resource is
server-authored code, and the server that wrote it already chose where its pictures go. The
permission string in the manifest is the consent an operator sees.

---

## `Open77.players.requestScreenshot(playerId, options) -> Promise | nil, reason` (server)

The server half. **The picture never travels over the game transport**: a net event carries
48 KiB of JSON and there is no client-to-server latent path (`TriggerLatentClientEvent` runs
one way), so a JPEG cannot ride the callback envelope. The request does: it goes to the
player's client *host* under the reserved name `open77:screen:capture` -- answered without any
client resource or client permission, like `Open77.world.groundZ` -- and the client captures,
POSTs the bytes to `options.url` itself, and answers with the upload's receipt. The promise
resolves with that receipt.

```lua
-- open77.lua: permissions { "players.screenshot" }
RegisterCommand("report", function(source, args)
    local accused = tonumber(args[1])
    local shot, reason = Open77.players.requestScreenshot(accused, {
        url = "https://mdt.example.net/api/evidence",   -- REQUIRED: where the client POSTs
        quality = 80,
        region = { x = 0, y = 0, w = 1280, h = 720 },
        fields = { reporter = tostring(source), accused = tostring(accused) },
        headers = { Authorization = "Bearer " .. GetConvar("mdt_token", "") },
        timeoutMs = 15000,   -- the client's HTTP timeout
        timeout = 20000,     -- this promise's own deadline
    })
    if not shot then return print("refused: " .. tostring(reason)) end
    local receipt, why = shot:await()
    if not receipt then return print("failed: " .. tostring(why)) end
    print(("evidence: HTTP %d, %dx%d, %d bytes, %d ms"):format(
        receipt.status, receipt.width, receipt.height, receipt.sizeBytes, receipt.elapsedMs))
end, true)
```

`options` is the union of the client's `capture` and `upload` options plus `url`; the client
validates every one of them again and rejects with the same names, so a server never has to
guess what a client accepts. The receipt is
`{ status, body, bodyTruncated, sentBytes, elapsedMs, width, height, sizeBytes, format }`.
`await` runs from a scheduler coroutine (a command, an event handler, `CreateThread`); at
file scope it answers `await_requires_scheduler_coroutine` rather than blocking the server.

Where the picture goes is the operator's decision:

- **An image host or a webhook** -- the `screenshot-basic` model. `multipart`, the target's
  own field name, an `Authorization` header.
- **This server's own `Open77.http.listen` route** -- self-contained, no third party, but
  the listener decodes text and caps bodies at 16 KiB, so it takes **thumbnails only, as
  `encoding = "json"`** (a 96x96 JPEG at quality 80 is ~4 KiB, ~6 KiB as base64; a full
  mugshot at `scale = 0.25` lands in the same budget). A route that stores the `data` field
  decoded is an MDT mugshot backend with no external service.
- One capture in flight *per asking server resource* on each client, kept apart from that
  client's own resources' captures: a server that asks twice gets `capture_in_flight`, a
  client resource capturing at the same moment does not.

**Refusals before the wire**: `permission_denied:players.screenshot`, `invalid_player_id`,
`player_not_found`, `invalid_options`, `invalid_url`, `invalid_capture_option:<key>`,
`invalid_quality`, `region_invalid`, `format_unsupported`, `invalid_scale`, `invalid_upload_option:<key>`,
`invalid_header`, `invalid_field`, `invalid_callback_timeout`, `network_unavailable`,
`resource_stopping`, `callback_request_limit`. **Rejections**, the client's own names:
`capture_in_flight`, `device_unavailable`, `format_unsupported`, `capture_too_large`,
`encode_failed:<stage>`, `request_failed:<stage>:<code>`, `timeout`, `capture_timeout`,
`callback_timeout`, `callback_resource_unavailable`.

---

## `Open77.screen.mugshot(target, options) -> Promise | nil, reason`

FiveM's `RegisterPedheadshot`, composed from the [scripted cameras](cameras.md) and
`capture`: a camera is created `distance` metres in front of the target's head, looking at
it with `fov`; it takes the view with a cut (`blendMs = 0`); after `settleFrames` Presents one
frame is captured through it; then the camera is deactivated and destroyed **whatever
happened** -- a failed capture still hands the view back. The centre of the frame is cropped
to a square (`crop` of the shorter screen edge, default 0.5) unless a `region` is given.

```lua
-- open77.lua: permissions { "screen.capture", "camera.script", "world.transform" }
CreateThread(function()
    local shot, reason = Open77.screen.mugshot(0, {   -- 0 = the local player; or an entity id
        fov = 35, distance = 0.7, headHeight = 1.62,   -- the framing
        crop = 0.5, quality = 85, settleFrames = 3,
        scale = 0.25,                                  -- a thumbnail: 135 px at 1080p
    })
    if not shot then return print("refused: " .. tostring(reason)) end
    local picture, why = shot:await()
    if picture then
        print(("mugshot %dx%d, %d bytes, camera at %.2f,%.2f,%.2f"):format(
            picture.width, picture.height, picture.sizeBytes,
            picture.camera.position.x, picture.camera.position.y, picture.camera.position.z))
    end
end)
```

`target` is what `Open77.character.frame` accepts: an Open77 entity id (`0` or `nil` = the
local player) or `{ engineEntity = ... }`. The head is the body's own head slot
(`Open77.character.bonePosition(target, "head")`) when it publishes one, else `headHeight`
up the body's own up axis. The result is the capture table plus
`camera = { position, lookAt, fov }`.

Three refusals of its own: **`camera_busy`** while anybody holds the view or a blend is
running -- a mugshot never steals a camera; **`target_not_streamed`** for a body this client
cannot see; **`not_incarnated`** before the player has a body. Everything `capture` and
`Open77.camera.create` refuse (`camera_out_of_range` past 250 m, for one) passes through.

What the picture *shows* depends on the body the engine renders through that camera. Another
player's puppet and an NPC are full bodies with heads. For the **local player** the
perspective arbiter stands down while a scripted camera holds the view and leaves the engine's
own body in place -- so the picture is whatever body the player's current perspective renders,
which in first person may be a body without a rendered head. The acceptance probe measures
this on the local player and reports the picture; a mugshot for an MDT is of *someone else*
anyway, which is the case that is clean.

---

## Cost

The render-thread cost is one command allocator, one command list, one readback buffer and
one fence created per capture, the barrier pair, the copy and a signal: `copyMicros` in
every result, expected in the hundreds of microseconds at most. The encode runs off the game
thread; a full-frame JPEG at 85 takes tens of milliseconds, a full-frame PNG a few hundred.
Between captures nothing runs but one mutex acquisition per Present.

Use `copyMicros` and `encodeMicros` from capture results to profile cost on the target hardware. Resolution, output format and image quality affect capture latency.

---

## Reference

| Client function | Returns | Permission |
|---|---|---|
| `Open77.screen.capture(options)` | `Promise` | `screen.capture` |
| `Open77.screen.surface()` | `{ ready, width, height, format, pixel, supported }` | `screen.capture` |
| `Open77.screen.upload(capture, url, options)` | `Promise` | `screen.upload` |
| `Open77.screen.mugshot(target, options)` | `Promise` | `screen.capture`, `camera.script`, `world.transform` |

| Server function | Returns | Permission |
|---|---|---|
| `Open77.players.requestScreenshot(playerId, options)` | `Promise` | `players.screenshot` |

Related: [Scripted cameras](cameras.md), [Photo mode](photo-mode.md),
[Network callbacks](callbacks.md), [Serving HTTP](server-api.md#serving-http).
