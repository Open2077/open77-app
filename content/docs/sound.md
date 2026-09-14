# Resource audio

`open77_sound` plays **an audio file your resource ships**. A phone ringing, a
siren on a parked car, a boombox on a street corner, a doorbell, a shop jingle,
a radio behind a counter — the sounds an RP server makes constantly and that the
game itself has no event for.

It is a different thing from [`Open77.sfx.*`](effects.md), and both stay. `sfx`
plays **the game's own Wwise events** through the game's own mixer; it is the
right tool for a gunshot, a door, a vehicle, a menu blip
([`Open77.sfx.play2d`](effects.md#two-dimensional-sfx) for that last one, since a
UI click has no position). `open77_sound` plays **your file**, which Wwise has
never heard of. Neither replaces the other, and nothing about `Open77.sfx.*`
changed when this arrived.

One asymmetry is worth knowing before you choose: `open77_sound` has `volume` and
`pitch`; `Open77.sfx` does not, and cannot. The engine's audio events carry no
gain and no pitch field at all — the measurement is in
[effects.md](effects.md#there-is-no-volume-and-no-pitch-and-that-is-the-engine).
If you need to fade something or bend its pitch, it has to be your file.

Read [What this is not](#what-this-is-not) before you build on it. It is a short
list and every item on it is load-bearing.

## The model

One hidden CEF surface, owned by the bundled `open77_sound` resource, runs the
Web Audio graph for the whole session: decode, gain, pitch, looping and an HRTF
panner per spatial sound. Your resource never sees it. You call an export, the
service ships your file's bytes to that surface once, and it plays them.

```text
your resource --exports--> open77_sound --page:send--> hidden CEF surface
   ships the file            owns the ids,             AudioContext
   names the sound           the caps, the             PannerNode (HRTF)
                             lifetime                  system audio out
```

Three consequences worth knowing up front:

- The surface is created **invisible, 16x16, at 1 fps** — the lowest frame rate
  the WebUI host allows. `visible = false` parks the compositor entirely
  (`WasHidden(true)`), and the audio thread is clocked independently of it, so
  the page costs a browser process at idle and no composited frame.
- Only the **listener** is per-frame-ish, and it is not per-frame: the camera
  transform is pushed at 20 Hz and only while something spatial is playing.
- Everything is **client-local and owned**. A sound belongs to the resource that
  started it, on the client it started on. The server twins below are a wire that
  asks each client to play it, not a replicated audio entity.

## Ship a file

Declare it in your manifest's `files` entry. That declaration is the permission:
a file merely sitting in your resource directory cannot be played.

```lua
resource "cops"
version "1.0.0"
auto_start true

client_script "client/main.lua"
server_script "server/main.lua"

files { "sfx/*.ogg", "sfx/siren.mp3" }
```

Playable extensions: `mp3`, `ogg`, `oga`, `opus`, `wav`, `flac`, `m4a`, `aac`,
`webm`. Anything else is refused with `unsupported_audio_format` rather than
handed to a decoder that will not take it.

## Play it

```lua
-- Flat, everywhere, no position: a UI beep or a phone in your own hand.
exports.open77_sound:play("phone", "sfx/ring.ogg", { volume = 0.7, loop = true })

-- In the world. This is the feature.
exports.open77_sound:play("boombox", "sfx/street.ogg", {
    position    = { x = -1590.0, y = 390.0, z = 25.0 },
    loop        = true,
    maxDistance = 35.0,
})

-- Following a body or a vehicle.
exports.open77_sound:play("siren", "sfx/siren.ogg", {
    entity      = vehicleEntityId,
    loop        = true,
    maxDistance = 80.0,
})

exports.open77_sound:setVolume("boombox", 0.3)
exports.open77_sound:setPosition("boombox", { x = -1600.0, y = 395.0, z = 25.0 })
exports.open77_sound:stop("phone")
```

| Option | Default | Meaning |
|---|---|---|
| `position` | — | A world point. Its presence is what makes a sound spatial. |
| `entity` | — | An entity the sound follows. Mutually exclusive with `position`. |
| `volume` | `1.0` | 0..1, your resource's own gain. |
| `loop` | `false` | Repeats until stopped, or until your resource stops. |
| `pitch` | `1.0` | 0.25..4. Playback rate, so it changes speed and pitch together. |
| `offset` | `0` | Seconds into the clip to start at. |
| `maxDistance` | `40` | Silent at and beyond this distance. |
| `refDistance` | `1` | Full volume within this distance. Must be below `maxDistance`. |

Playing an `id` that is already playing **restarts** it. A doorbell rung twice is
one doorbell, not two overlapping ones. Use different ids when you want both.

The full export list is in [Official resource exports](resource-exports.md).

## The spatial behaviour

A spatial sound is a `PannerNode` with `panningModel = "HRTF"` — a head-related
transfer function, not a left/right pan. That distinction is the whole point: an
equal-power pan can only tell you a sound is to your left, while HRTF is what
makes a boombox on the street *behind* you audibly behind you rather than merely
quiet.

**The listener is your camera**, not your body. `Open77.camera.view()` is read at
20 Hz — and only while at least one spatial sound is playing, which is what keeps
that read off the idle path; it costs six RTTI lookups and up to six
`ExecuteFunction` calls on the game thread. Both the listener transform and the
panner positions are ramped over 60 ms, so the image slides rather than stepping
five times a second when you whip the camera.

The game is Z-up (X east, Y north, Z up) and Web Audio is Y-up with the listener
facing −Z, so every position and direction crosses through one mapping:

```text
audio.x =  game.x      right stays right
audio.y =  game.z      up stays up
audio.z = -game.y      north becomes "away"
```

Its determinant is +1, so handedness is preserved — which matters, because a
mapping that flips it would put sounds behind you in front of you and nothing
else would look wrong.

**Distance uses the linear model**, not the inverse one: gain falls from full at
`refDistance` to exactly zero at `maxDistance`. "Audible within 35 m" therefore
means what it says. The inverse model never quite reaches zero, which is more
physical and less useful for a script.

Two things the listener does **not** carry. There is no roll: the client API
gives position and forward, not the camera's up vector, so up is taken as the
world's +Z. And there is no velocity, so there is no Doppler.

## Server twins

A server resource names a file **it** ships and an audience. The audience is
resolved on the server and the event goes to the players who could hear it —
never broadcast for every client to receive and discard.

```lua
-- One player.
Open77.sound.play(source, "sfx/phone.ogg")

-- Everyone. One event, not one per player.
Open77.sound.broadcast("sfx/curfew.ogg", { volume = 0.4 })

-- Everyone within 40 m of a point, in routing bucket 3.
Open77.sound.play(
    { near = { x = -1590.0, y = 390.0, z = 25.0 }, radius = 40.0, bucket = 3 },
    "sfx/street.ogg",
    { id = "boombox", loop = true, position = { x = -1590.0, y = 390.0, z = 25.0 } })

-- Everyone within 25 m of a player, in that player's own bucket.
Open77.sound.play({ near = source, radius = 25.0 }, "sfx/shout.ogg")

Open77.sound.stop(source, "phone")
Open77.sound.setVolume(-1, "boombox", 0.2)
Open77.sound.stopAll()
```

`{ near = ..., radius = ... }` is handed straight to
[`Open77.players.nearby`](server-api.md), so its options are the same ones —
`bucket`, `limit`, `maxAgeMs`, `includeSelf` — and so is its bucket rule: the
anchor player's own bucket by default, `bucket = <n>` to name one, and
`bucket = false` for every bucket. **Two players in different routing buckets are
not in the same world and never hear each other's boombox.**

`radius` is required in that form. A `near` with no radius would silently reach
the whole bucket, which is the mistake the shape exists to prevent.

`id` defaults to the file path, so the common case — one sound, one file — needs
no id at all.

### The client half must exist

The file is read out of the session's **client** resource image, so the resource
that ships it needs at least one `client_script`. A server-only resource is never
downloaded, and its audio is unreachable; the client says so on the local
`open77:soundFailed` event and in the log rather than failing silently.

## Ownership, limits and lifetime

| Limit | Value | Why that number |
|---|---|---|
| Simultaneous sounds, per resource | 8 | So one resource cannot spend the session budget. |
| Simultaneous sounds, per session | 24 | 24 concurrent HRTF panners is already a heavy mix. |
| File size | 1 MiB | The host's own cross-resource read ceiling. Base64 of 1 MiB is 1.37 MiB, which still clears the 2 MiB JSON ceiling a `page:send` rides — raising it breaks the transport before it breaks the mixer. |
| Decoded cache | 64 MiB, LRU | Decoded audio is 32-bit float per channel: a one-minute stereo clip is ~21 MiB no matter how small its file was. |
| Clip transport | once per file | A clip crosses on its first play and is replayed from the cache afterwards. `preload(file)` moves that cost off the moment the sound has to be heard. |

Over a cap, `play` returns `nil, "owner_sound_limit"` or `nil, "sound_limit"`. It
refuses; it does not evict somebody else's sound to make room.

**A sound cannot outlive the resource that started it.** That is the failure mode
this whole design is aimed at — a looping siren still wailing after its resource
is gone, with nothing left that knows how to stop it. Three things catch it:

- a **reload** is caught by a generation check, on the owner's very next call;
- a **stop** is caught by a 250 ms owner sweep. It has to be the sweep: the client
  host dispatches `onClientResourceStop` to the stopping instance only, so
  `open77_sound` never hears about anyone else's stop. A quarter second of siren
  is the bounded worst case;
- **`open77_sound` itself stopping** takes the surface with it, and the
  `AudioContext` and every source node hanging off it go with the surface.

A server resource stopping sends `stopOwner` to every client automatically.

## Cross-resource files: no

**A resource can only play a file it ships itself.** This is not a policy choice;
it is the shape of the host, in two independent places:

- `Open77.resource.readFile` / `LoadResourceFile` resolve under the **calling**
  resource's root and refuse a different resource by name
  (`cross_resource_read_denied`);
- a WebUI surface is created with exactly one root and one allowed-file list,
  both taken from the resource that created it, behind a per-surface origin and
  `default-src 'self'`.

Those two together mean the bundled service could not serve `cops/sfx/siren.mp3`
to its own page at all. The one door that makes the service possible is a native
`Open77.resource.readPackedFile(resource, path)` gated by the
`resources.files.read` permission — which only `open77_sound` holds, and which
reads **declared** files only. `open77_sound` never takes the owner from an
argument: on the export path it is `GetInvokingResource()`, and on the server
path it is stamped by the host from the calling server resource's name, with
`open77:sound:` reserved as a client-event prefix so no resource can write that
field itself.

The alternative — letting any resource read any other's assets — buys nothing a
resource cannot get by shipping its own copy, and costs the guarantee that a
resource's files are its own.

## What this is not

Plainly, because each of these will otherwise be discovered the hard way:

- **It is not Wwise, and it is not in the game's mix.** It is a second, parallel
  audio path that ends at the same speakers. Nothing it plays ducks gunfire,
  dialogue or music, and nothing the game plays ducks it.
- **It does not follow the player's in-game audio sliders.** The game's master,
  music, SFX and dialogue volumes do not reach it. If your server should respect
  them, wire that yourself: read a setting and call `setVolume`.
- **It does not occlude.** A sound inside a building is heard through the wall at
  full distance-attenuated volume. There is no raycast, no material, no
  reverb — distance and direction, and nothing else.
- **There is no Doppler and no roll.** No velocity is fed to the listener or the
  sources, and the camera's up vector is not available to the client API, so the
  world's +Z is used instead.
- **It is not replicated.** Two clients told to play the same sound are two
  independent playbacks that will drift. Anything that must be sample-accurate
  across clients is out of scope.
- **It is one shared surface.** Every resource's audio runs in one `AudioContext`;
  a resource cannot be given its own device, its own master gain or its own
  output.
- **Latency is a browser's latency, not an engine's.** A clip's first play pays
  transport and decode; `preload` exists precisely because that is real.

A native Wwise external-source path would fix most of this list. It is a later
upgrade and it is not what this is.

## Reasons

Every refusal is a stable snake_case token.

| Token | Meaning |
|---|---|
| `invalid_sound_id` | Empty, over 240 characters, or outside `[%w_:-./]`. |
| `invalid_file` | Empty, over 240 characters, or containing `..`, a leading `/` or a `:`. |
| `unsupported_audio_format` | The extension is not one the browser will decode. |
| `file_not_declared` | The file is not in that resource's `files` manifest entry. |
| `clip_too_large` | Over 1 MiB. |
| `file_unreadable` | Declared, but the file could not be read from disk. |
| `resource_not_found` | The named resource is not in this client's resource set. |
| `owner_sound_limit` / `sound_limit` | Caps above. |
| `sound_not_found` | No live sound of yours holds that id. |
| `sound_not_spatial` | `setPosition` on a sound started with neither `position` nor `entity`. |
| `position_and_entity` | Both were given; pick one. |
| `entity_not_found` | The entity has no readable position on this client. |
| `surface_unavailable` | The page is not up yet, or `open77_sound` is not running. |
| `audio_blocked` | The browser refused to start audio. See below. |
| `export_call_required` | Called other than through an export, so there is no owner. |
| `invalid_sound_target` / `invalid_sound_radius` | Server side: a bad audience. |
| `no_audience` | Server side: the audience resolved to nobody. |
| `reserved_sound_event` | Server side: `open77:sound:` is not yours to emit. |

`audio_blocked` deserves a note. Chromium gates unattended audio behind a user
gesture, per document, and this surface is invisible and receives no input — so
it can never earn one. The WebUI host therefore runs with
`autoplay-policy=no-user-gesture-required`: every document in it is a file a
resource declared, served from disk over a per-surface origin under
`default-src 'self'` with `connect-src 'none'`, so there is no drive-by web
content the gate was protecting anyone from. The page still calls `resume()` and
still reports `audio_blocked` if that ever changes, so the failure stays named
instead of going silent.
