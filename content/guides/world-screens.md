# World screens

A world screen puts a **WebUI page** or a **NativeUI document** on a mesh in the world as the
texture of its own material: a television, a monitor, a billboard, a tablet, any mesh chunk.
It is not an overlay drawn over the frame. The mesh's material samples the picture, so it is
lit, fogged, depth tested, reflected and hidden by whatever stands in front of it, and it lights
the room around it like the game's own screens. A page's sound plays as a 3D source at the
screen, and a player can sit in front of it with a scripted camera and use it with the mouse and
the keyboard.

`Open77.screens` is a **client** API. It needs the `world.props` permission; the
scripted-camera mode also needs `camera.script`. Check that `Open77.screens` exists before
relying on it: older clients do not have it.

## A television in a few lines

```lua
-- open77.lua
-- client_script "client/main.lua"
-- web_files { "web/**" }
-- permissions { "world.props", "camera.script" }

-- client/main.lua
local page = assert(WebUI.create({
    entry = "web/tv.html", width = 1920, height = 1080, fps = 30,
    worldScreen = true,   -- exactly 1920x1080, never drawn across the player's view
    transparent = false,
}))
local screen = assert(Open77.screens.create({ width = 1920, height = 1080, page = page }))

-- The game's own television: a body and its screen panel.
local yaw = 90.0
Open77.props.create({ model = "electronics.tv.16x9", position = pos, yaw = yaw })
local panel = Open77.props.create({ model = "electronics.tv.screen.16x9", position = pos, yaw = yaw })

-- The panel's screen chunk is found by its material; the attachment waits for the prop to stream in.
Open77.screens.attach(screen, { localProp = panel })

-- E: sit in front of it with the cursor on the page; Escape or E again gives the view back.
RegisterKeyMapping("tv.use", "Use the television", "E", function()
    if Open77.screens.interacting() then
        Open77.screens.leave()
    else
        Open77.screens.interact(screen)
    end
end)
```

A page created before the resource has finished loading returns `resource_preparing`: retry
it a moment later (a `SetTimeout` loop is enough).

## YouTube and other videos

A page served under the `media` policy can play a YouTube embed, a Vimeo player or a direct
video. Its sound comes from the television, not from the player's speakers at full volume:

```lua
local page = assert(WebUI.create({
    entry = "web/player.html", width = 1920, height = 1080, fps = 30,
    worldScreen = true, transparent = false, policy = "media",
}))
Open77.screens.setSource(screen, { page = page })
```

The bundled `open77_media` resource contains a complete player page (`web/tv.html`) that takes
a URL, shows YouTube, Vimeo or a file, and reports playback; reuse it rather than writing your
own. Its `media:state` message takes `volume` from 0 to 100.

## Sources

| Source | How to make it | Notes |
|---|---|---|
| WebUI page | `WebUI.create({ ..., worldScreen = true })`, then `page = page` | `worldScreen` keeps the page at exactly `width` x `height` (never refit to the game window) and never draws it across the view. |
| NativeUI document | `Open77.ui.create({ ..., worldScreen = { width = 1280, height = 720 } })`, then `ui = doc` | Laid out at that size (`dp` scale = height / 1080) and rendered offscreen, never over the view. Models, events and `ui:set` work as usual. |

A screen with no source, or whose page is hidden or still loading, shows black.
`Open77.screens.setSource(id, { page = p })`, `{ ui = d }` or `nil` swaps it at any time.

## Reference

### `Open77.screens.create(options) -> id | nil, reason`

| Option | Default | Meaning |
|---|---|---|
| `width`, `height` | 1920, 1080 | The picture's size. |
| `page` / `ui` | none | The source. |
| `brightness` | 1.0 | Emissive strength, 0.05 to 16 (1 = the game's own screens). |
| `audio` | on | `false`, or `{ volume = 0..1, minDistance = 2, maxDistance = 30 }`: the page's sound as a 3D source at the screen. |

### `Open77.screens.attach(id, target) -> true | false, reason`

`target` names what carries the mesh, with one of `entity = <client entity id>`,
`prop = <server prop id>` or `localProp = <prop this resource created>`, and optionally which
part of it:

| Field | Meaning |
|---|---|
| `component` | One mesh component by name. All of them by default. |
| `chunks` | Omitted or `"auto"`: the chunks whose material is a screen material (every monitor and TV panel the game ships has one). `"all"`: every chunk. `{ 0, 2 }`: those chunk indices. |

The attachment waits for its entity: attach before a prop has streamed in and the screen shows
as soon as it does, and again every time it streams back. One screen can be attached to several
meshes, for example a wall of televisions showing one page. `Open77.screens.chunks({ entity |
prop | localProp })` lists `{ component, chunk, material, screen }` to choose from.

### Other functions

| Call | Meaning |
|---|---|
| `detach(id, target?)` | Gives the mesh its own material back; no target means everywhere. |
| `setSource(id, source)` | `{ page = p }`, `{ ui = d }` or `nil`. |
| `setBrightness(id, value)` | As `brightness` above. |
| `setAudio(id, false or { volume, minDistance, maxDistance })` | Volume changes in place; new distances restart the source. |
| `destroy(id)`, `clear()` | Removes one or all of this resource's screens. Stopping the resource does it too. |
| `list()` | `{ id, width, height, source, brightness, attachments, applied, state, detail, updates }`. `state` is `loading`, `idle` (shown nowhere), `waiting_texture` or `live`. |
| `frame(id, { fov = 40, margin = 1.08 })` | `{ position, target, fov, corners, width, height }`: a camera pose that shows the whole panel from the side the player stands on. |
| `focus(id)`, `blur()`, `focused()` | Gives the source the mouse and the keyboard without moving the camera. |
| `interact(id, { fov, margin, blendMs, returnBlendMs, onLeave })`, `leave()`, `interacting()` | The scripted-camera mode below. |

## Using a screen

`Open77.screens.interact(id)` creates a camera in front of the panel (`frame(id)`), blends to
it and gives the page or document the cursor and the keyboard. The cursor is the player's own
mouse. Every frame, Open77 projects the panel's four corners and maps the cursor through them
onto the page, exactly in perspective, so a click lands where the cursor is on the mesh, wherever
the camera is. A cursor off the panel leaves the page. Escape, or `leave()`, gives the view and
the input back, and `onLeave(id)` is called.

`focus(id)` does only the input part, with the current camera: use it for a screen the player is
already looking at, or with your own `Open77.camera` shot.

## Sound

A page shown on a screen hands its audio to the game instead of playing it itself. The client
plays it as a 3D source at the panel's centre, with distance, panning and walls like a voice.
`audio = false` keeps the page silent; `setAudio(id, { volume = 0.5 })` turns it down. A NativeUI
document has no sound of its own.

## Limits

- 32 screens at once on a client, 32 per resource, 64 attachments in all.
- A page costs what any WebUI page costs at its `fps`. Writing it into the material is one GPU
  pass, and only when the page drew a new frame. A NativeUI document is redrawn every frame it is
  shown.
- The screen uses the game's own screen material (emissive, with the panel's scanline layers);
  it replaces the chunk's material while attached.
- Entities only: props (server or local), spawned entities, vehicles and devices, anything with a
  mesh component. The city's static meshes are not entities; replace one with a prop to put a
  screen on it.
- Clicks are mapped through the panel's bounding box: on a curved display they land approximately.
- Each player renders their own screens. To show the same page to everyone, create it on every
  client from a server event.
