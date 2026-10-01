# Custom loading screens

Client Lua can observe Cyberpunk's native loading-screen lifecycle, including the
screen sometimes opened by a long-distance teleport. Use the state to show your
own WebUI or temporarily hide your resource's HUD. The API is **read-only**:
it does not force a loading screen, skip it, finish streaming or teleport anyone.

This API requires an updated Open77 client. Feature-detect it on older clients;
no network protocol or dedicated-server update is required.

| What you want to change | Use |
| --- | --- |
| Artwork, logo, tips or progress shown during a native load | A resource WebUI driven by the events on this page. |
| Your gamemode HUD during a teleport load | Hide its WebUI while `active` is true; restore its normal visibility policy afterwards. |
| A scripted fade before a teleport or cinematic | [Native screen transitions](screen-transitions.md). |
| Open77's initial connection or resource download screen | The [launcher and connection flow](launcher.md); this API does not replace it. |

Customization adds your own cover over the native screen. It does not replace
Cyberpunk's loading assets or change how long the engine needs to load.

```lua
-- open77.lua
client_script 'client.lua'
permissions { 'screen.read' }
```

| Client function | Result |
| --- | --- |
| `Open77.screen.isLoading()` | `true`/`false`, or `nil, reason` if unavailable. |
| `Open77.screen.loadingState()` | State table, or `nil, reason` if unavailable. |

Both observe the same process-wide state, regardless of which resource caused
the transition. A resource reload does not reset that state.

| State field | Meaning |
| --- | --- |
| `active` | The native loading lifecycle is active, including opening and delayed closing. |
| `id` | Opaque string identifying this loading cycle within this client process. `"0"` before its first observed cycle. |
| `revision` | Increasing change number; useful for discarding older snapshots. |
| `kind` | Native screen type: `"unknown"`, `"splash"`, `"initial"` or `"fastTravel"`. It can become known after the start event. |
| `progressKnown` | Whether the native progress bar has reported a value during this cycle. |
| `progress` | Number from 0 to 1 when known; otherwise `nil`. This is the engine's value and may move backwards between native stages. |
| `elapsedMs` | Real elapsed milliseconds since the cycle began. Frozen after it ends. |

At idle, the table retains the most recent cycle's ID, kind and progress. A new
cycle clears its progress. **100% is not a finished event**: wait for `active`
to become false. No estimated timer is used to close the screen.

`kind` describes a native screen, **not the cause**. A teleport may use
`"unknown"`; `"fastTravel"` is also used during Open77's initial world load.
`active` is not a pixel-level visibility test: a brief loading transition may
complete before a full-screen illustration is drawn. Background streaming,
quest fades, your WebUI and Open77's connection/download screen are separate.
For quest fades use [`isFaded` / `nativeState`](screen-transitions.md).

## Events

These local client events each receive **one state table** and require
`screen.read` on the receiving resource:

| Event | Payload | When |
| --- | --- | --- |
| `open77:loadingScreen:started` | `(state)` | Once when a new native loading cycle starts. |
| `open77:loadingScreen:changed` | `(state)` | After an observed active/kind/progress change. Intermediate progress updates are coalesced. |
| `open77:loadingScreen:finished` | `(state)` | Once when the native delayed-hide callback completes the cycle. |

Start and finish are each followed by `changed`. A short cycle can produce both
edges in one Lua tick. Payloads describe the event's instant; a state query can
already be newer. Do not assume callbacks execute during a blocked engine
frame: they are delivered on the next client scripting tick. These events are
not network events and cannot be generated through `TriggerEvent` or a server
message. The legacy shell-only `open77:loading:progress` remains unchanged.

## Hide your own WebUI while loading

Integrate this in the resource that owns `hudPage`. Recompute visibility from
your resource's normal policy so a closed menu is not accidentally reopened.

```lua
if Open77.screen and Open77.screen.loadingState then
    local loading, revision = false, -1

    local function renderHudVisibility()
        if hudEnabled and not loading then hudPage:show()
        else hudPage:hide() end
    end

    local function apply(state)
        if not state or state.revision < revision then return end
        revision = state.revision
        loading = state.active
        -- Also call renderHudVisibility when hudEnabled changes.
        renderHudVisibility()
    end

    AddEventHandler('open77:loadingScreen:changed', apply)
    -- Essential: the resource can start after the started event.
    local state, err = Open77.screen.loadingState()
    if state then apply(state) else print(err) end
end
```

Do not make gameplay authority depend on a client's report of loading state.
It is presentation information, not proof that a player or destination is ready.

## Cover the native screen and hide the vanilla HUD

Create `resources/my_loading_screen/` with these three files. The HTML is kept
ready and transparent between loads, so Chromium does not need to start when
the engine begins loading. The page takes no keyboard or mouse focus.

### 1. Declare the resource

```lua
-- open77.lua
resource 'my_loading_screen'
version '1.0.0'
auto_start true
reload_policy 'reconnect'
client_script 'client.lua'
web_ui_page 'web/index.html'
web_ui_auto_create false
files { 'web/index.html' }
permissions { 'screen.read', 'webui.modal', 'ui.vanilla.hud' }
```

### 2. Forward the loading state to your page

```lua
-- client.lua
if not Open77.screen or not Open77.screen.loadingState then
    print('[my_loading_screen] Native loading observation is unavailable.')
    return
end

AddEventHandler('onClientResourceStart', function(name)
    if name ~= GetCurrentResourceName() then return end

    local page, reason = Open77.webui.create({
        entry = 'web/index.html', layer = 'modal', zIndex = 100,
        visible = true, transparent = true, fps = 30,
    })
    if not page then print(reason); return end

    local ready, active, revision = false, false, -1
    local function apply(state)
        if not state or state.revision < revision then return end
        revision = state.revision
        if state.active ~= active then
            active = state.active
            -- Releases only this resource's HUD claims when loading ends.
            Open77.hud.setVisible('all', not active)
        end
        if ready then page:send('loading:state', state) end
    end
    local function refresh()
        local state, err = Open77.screen.loadingState()
        if state then apply(state) else print(err) end
    end

    AddEventHandler('open77:loadingScreen:changed', apply)
    page:on('ui:ready', function()
        ready = true
        refresh()
    end)
    -- Also handles a resource activated after the loading cycle started.
    refresh()
end)
```

Create the page from `onClientResourceStart`, when presentation effects are
permitted. Register the listener before the initial state query. Wait for
`ui:ready` before sending to JavaScript; this avoids losing the first update.

### 3. Design the cover

```html
<!-- web/index.html -->
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>My server loading screen</title>
<style>
  :root { --accent: #00d7e6; --background: #071017; }
  html, body { margin: 0; background: transparent; color: #e9f1f5;
               font-family: system-ui, sans-serif; }
  #cover { position: fixed; inset: 0; display: none; place-content: center;
           text-align: center; background: var(--background); }
  #cover.active { display: grid; }
  .brand { color: var(--accent); letter-spacing: .2em; }
  progress { width: min(420px, 75vw); height: 8px; accent-color: var(--accent); }
  .tip { color: #b0c1cc; }
</style>
<section id="cover" aria-live="polite">
  <p class="brand">MY SERVER</p>
  <h1>Loading your destination</h1>
  <progress id="bar" max="1" aria-label="Loading progress"></progress>
  <p id="status">Loading…</p>
  <p class="tip">Explore Night City with your crew.</p>
</section>
<script>
  Open77.on('loading:state', state => {
    document.querySelector('#cover').classList.toggle('active', state.active);
    const bar = document.querySelector('#bar');
    if (state.progressKnown) bar.value = state.progress;
    else bar.removeAttribute('value'); // Native progress is not available yet.
    document.querySelector('#status').textContent = state.progressKnown
      ? `${Math.round(state.progress * 100)}%` : 'Loading…';
  });
  Open77.ready();
</script>
</html>
```

Change `MY SERVER`, the heading, the tip and the CSS variables to match your
server. To add artwork, ship `web/background.webp` and `web/logo.png`, include
both in the manifest's `files` list, then use `url('./background.webp')` in the
cover's background and `<img src="./logo.png" alt="My server">` in its markup.
Asset paths are relative to `web/index.html`.

Use a CSS spinner or an indeterminate `<progress>` while `progressKnown` is
false. Keep the cover visible at 100% until `active` becomes false. Never use
a fixed timeout or the progress percentage to decide that the load has ended.

### 4. Enable it on the server

Add `my_loading_screen` to the server configuration's `resources.load` array,
then reconnect a client to receive the resource and its files. Keep any other
configured resources in that array. Use a long-distance teleport that actually
triggers Cyberpunk's loading screen to check the cover and HUD restoration;
short teleports may not open one.

The repository also includes the optional
`resources/examples/open77_loading_screen` resource. Enable it using
`examples/open77_loading_screen` in `resources.load`; its resource name is
`open77_loading_screen`. Run only one loading cover at a time.

Stopping or reloading the resource destroys its page and releases its HUD
claims automatically. It does not alter other resources' WebUIs; those should
use the loading events in their own visibility policy.

Use a separate resource for temporary vanilla HUD claims if your existing
resource already keeps components hidden: releasing `all` releases every HUD
claim owned by that resource. See [HUD ownership](hud-visibility.md).

Server WebUIs remain subject to normal session presentation gates: this does
not allow a downloaded resource to replace Open77's initial connection screen.
Avoid `setCinematic(true)` for this use: it also suppresses unfocused WebUIs,
including your own loading overlay. See [WebUI configuration](/docs/resource-runtime#webui).

## Errors and diagnostics

| Symptom | Check |
| --- | --- |
| No overlay appears | Confirm the resource is loaded, the client supports `loadingState`, and the teleport opens a native loading cycle. Check Lua/WebUI creation errors and the `ui:ready` handshake. |
| Your HUD is still over the loading artwork | Hide that resource's WebUI with `changed`; `Open77.hud` only controls native HUD claims. |
| Cover stays at 100% | Wait for `finished` / `active == false`; progress is not a completion signal. |
| Cover vanishes in cinematic mode | Release the cinematic claim or coordinate with its owner; cinematic mode can hide an unfocused WebUI. |

- `permission_denied:screen.read`: declare the read permission.
- `loading_screen_unavailable`: the guarded native observer is unavailable or
  has not observed the loading layer yet. Do not interpret `nil` as `false`.
- `loading_screen_unavailable_on_this_host`: no client backend on this host.

The local debug command `session.loading` returns the same state as the Lua
query. There is no arbitrary engine pointer or native-call API exposed to Lua.
