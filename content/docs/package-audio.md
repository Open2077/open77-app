# Package audio: 2D and spatial sounds

Play a resource's own `.mp3` or PCM `.wav` assets without creating a WebUI. Audio
decoding is asynchronous and does not run on the game thread. Engine/Wwise named
events remain a separate feature: see [effects](effects.md).

Available in client/server **2.31.13+op77.62**, protocol **1.25**. Local playback
needs the updated client; network playback needs both the updated client and server.
Sharing protocol 1.25 with an older build does not make these Lua APIs available there.

## Manifest and first sound

```lua
files { 'audio/lock.mp3', 'audio/click.wav' }
permissions { 'audio.play', 'audio.network' }
```

`audio.play` is the client capability; `audio.network` is the server capability.
Include only those your scripts need. Paths must be declared in `files`, relative
to the resource, and remain inside it. URLs, absolute paths and traversal are rejected.

```lua
-- Client: private UI sound.
local id, reason = Play2DSound('audio/click.wav', {volume=0.5})
if not id then print(reason); return end

-- Client: sound at a fixed world location, heard only by this client.
local lock = Play3DSound('audio/lock.mp3', {x=10,y=20,z=30},
    {volume=0.7, minDistance=1, maxDistance=15})
```

Both return a resource-owned numeric handle, or `nil, reason`. Allocation success
does not mean decoding finished: use `GetSoundState(id)` to inspect loading/errors.

## Networked playback

```lua
-- Server: every ready player in bucket 0 can hear it within 15 metres.
local id = assert(Play3DSound('audio/lock.mp3', {x=10,y=20,z=30},
    {network=true, bucket=0, volume=0.7, maxDistance=15, duration=1.2}))

-- Server: private non-spatial notification for one player in their current bucket.
local notice = Play2DSound('audio/click.wav', {
    network=true, target=playerId, bucket=GetPlayerRoutingBucket(playerId), duration=0.3
})
```

Server playback is networked by default; `network=false` is rejected there.
Client playback is local by default; `network=true` on the client returns
`nil, 'network_audio_requires_server'`. A client cannot authorize a broadcast by
adding an option. For a lock action, request the gameplay action on the server;
after validating ownership/distance/permissions, the server creates the sound.

The server owns the sound handle, timeline and audience. Late joiners receive the
current timeline rather than restarting from zero; players leaving the bucket lose
the sound. Pauses and seeks are included in the next reliable snapshot. Starting a
sound may be delayed by asset decoding; the client catches up when decoding completes.
This is game-event synchronization, **not sample-accurate music synchronization**.
Repeated changes are coalesced into snapshots at up to 20 Hz; a new resource that
was not ready for the first snapshot is retried by the periodic snapshot (up to 5s).

## Playback options

| Option | Default | Contract |
| --- | --- | --- |
| `volume` | 1 | 0–1 |
| `loop` | false | Loop entire clip |
| `paused` | false | Allocate without starting playback |
| `offset` | 0 | Initial seconds, finite and nonnegative |
| `minDistance` | 1 | Full-gain radius, metres |
| `maxDistance` | 30 | Silence radius, greater than minDistance, up to 1000m |
| `network` | client false / server true | Runtime authority described above |
| `bucket` | 0 | Server audience routing bucket |
| `target` | 0 | Server-only optional player ID; bucket still applies |
| `duration` | 600 | Server timeline length in seconds, greater than 0 and at most 600; **required for loops** |

Use the actual clip duration for server loops to keep late-join phase consistent.
For non-looped sounds, supplying the actual duration also makes the server's ended
state meaningful; without it, the server cannot know the decoder's media length.
Client `getState().duration` is the actual decoded duration.

Spatial sounds use distance attenuation and camera-relative stereo panning. Stereo
assets are downmixed to a point source. No automatic wall occlusion, HRTF, Doppler,
vehicle attachment or environmental reverb is implied. Update the position through
`SetSoundPosition` when a source moves; that does not restart the sound.

## Handles and playback control

| Global | `Open77.audio` method | Arguments |
| --- | --- | --- |
| `Play2DSound` | `play2D` | asset, options? |
| `Play3DSound` | `play3D` | asset, position, options? |
| `PlaySound` | `play` | id — resume; restart an ended local clip |
| `PauseSound` | `pause` | id — preserve cursor |
| `StopSound` | `stop` | id — stop and rewind |
| `SeekSound` | `seek` | id, seconds |
| `SetSoundVolume` | `setVolume` | id, volume |
| `SetSoundPosition` | `setPosition` | id, `{x,y,z}` — spatial only |
| `GetSoundState` | `getState` | id |
| `DestroySound` | `destroy` | id — release permanently |

Controls return `true` on success, or a failure plus reason. Local and server handles
belong to different runtimes; never pass a local handle to a server expecting it to
identify a network sound. Other resources cannot mutate a handle they do not own.

```lua
local state, why = GetSoundState(id)
if state then
    print(state.status, state.position, state.duration, state.error)
end
assert(PauseSound(id))
assert(SeekSound(id, 0.2))
assert(PlaySound(id))
-- Release after use. Do not allocate a new sound every frame.
assert(DestroySound(id))
```

Client states: `loading`, `playing`, `paused`, `ended`, `error`. `cached` indicates
reuse of decoded PCM; `error` contains a stable diagnostic code, not a filesystem
path. Server state describes desired playback, not an acknowledgement that every
client has working speakers or decoded the asset.

## Limits and lifecycle

- 16 handles per resource/owner and 64 overall, local and network sharing the client
  budget. Finished local handles remain reusable until destroyed or resource stop.
- 16 MiB encoded file, 32 MiB decoded PCM per clip, up to 600 seconds; mono/stereo
  PCM16 at 8–96 kHz. Windows Media Foundation must support the decoder.
- Bounded decoded cache and active-voice memory budget. Decode failures are visible;
  invalid audio cannot hold a Lua VM or the game thread waiting.
- Resource stop, disconnect and game-world teardown release owned playback. Server
  non-looping sounds are collected 30 seconds after their configured duration ends.

## Validation status

Eight server tests, client Lua validation and real MP3/WAV device smoke tests pass.
Two live clients verified late-join playback, pause/seek at the same cursor, resume,
and destruction on both clients. Distance attenuation was observed in the live mixer.
Bucket transitions are covered by automated service tests, not a completed live
bucket-change trial. Output-device removal/recovery and every Windows codec/device
combination are not certified; automatic device recreation after an output failure
is not implemented.
