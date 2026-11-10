# Client voice API

Client resources control the local side of voice: audio devices, gains, push-to-talk and voice
activation, which routes the microphone requests, per-talker volume, and the talking state used by
HUDs. Since protocol 1.52 they can also play local music and code-generated sound through the same
mixer, effects and acoustics as voice.

Every function requires the client permission `voice.client`. These settings are local
presentation: they never grant a recipient, a channel membership or a reach the server did not
authorise.

```lua
-- open77.lua
permission "voice.client"
client_script "client/main.lua"
```

## Devices and gains

| Function | |
|---|---|
| `Open77.voice.devices(flow?)` | `input`, `output` or `all` (default): `{ id, name, flow, default, selected, available }` |
| `selectDevice(flow, endpointId)` | `""` selects the Windows communications default |
| `setCaptureEnabled(enabled)` | microphone capture on or off |
| `setInputVolume(gain)`, `setOutputVolume(gain)` | 0.0 .. 2.0 |
| `setMicrophoneTest(enabled)` | local loopback, nothing is sent |
| `status()` | capture, render, device, level and packet snapshot |

```lua
for _, d in ipairs(Open77.voice.devices("input") or {}) do
    print(d.id, d.name, d.selected and "(selected)" or "")
end
Open77.voice.selectDevice("input", "")     -- back to the Windows default
Open77.voice.setInputVolume(1.2)
```

Device ids may disappear after a Windows device change; the client follows the communications
default and retries a lost device in the background.

## Push-to-talk and voice activation

| Function | |
|---|---|
| `setTransmitting(enabled, intent?)` | push-to-talk state and the requested routes |
| `setVoiceActivation(enabled, threshold?)` | voice activation with a 0.0 .. 1.0 threshold |

`open77_voice` already drives push-to-talk (key **N** by default, rebindable in the pause menu) and
voice activation. Call these only when you replace that package's input handling, for example for
a radio key:

```lua
-- hold B to talk on the radio only; N keeps talking in proximity and on the radio
CreateThread(function()
    local held = false
    while true do
        local down = not Open77.input.isCaptured() and Open77.input.isDown("B")
        if down ~= held then
            held = down
            -- release with the reference intent so N behaves as before
            Open77.voice.setTransmitting(down, down and "channels" or "all")
        end
        Wait(10)
    end
end)
```

The transmit state is shared by the whole client: the last call wins. `open77_voice` only calls
`setTransmitting` when its own key changes, so a second key works as long as the player does not
hold both.

### Transmit intents

| Intent | Requests |
|---|---|
| `proximity` | nearby players |
| `channels` | up to four speakable channels the player is a member of, in channel-id order |
| `channel:<id>` | one channel |
| `connections` | the [audio graph](voice-graph.md) connections the server authored for this player |
| `all` | proximity, channels and connections together, from one encoded frame |

The intent is a request: the server still computes every recipient. `connections` grants nothing
by itself, and channel selections are resolved locally and never sent as a wildcard.

## Reach

Proximity is always on; a client may only request another distance, which the server clamps to
`minimumClientProximityDistance`..`maximumClientProximityDistance` and republishes.

```lua
Open77.voice.setProximityDistance(3)              -- whisper
local s = Open77.voice.status()
print(s.proximityDistance, s.requestedProximityDistance, s.proximityRequestPending)
print(s.defaultProximityDistance, s.minimumProximityDistance, s.maximumProximityDistance)
```

A successful call means the request was queued (or was already in effect), not that the value was
accepted as is. The reference package maps `whisper = 3`, `normal = server default`, `shout = 40`
in `open77_voice/shared/config.lua`; its export cycles them:

```lua
Open77.exports.call("open77_voice", "cycleProximityMode", true)
Open77.exports.call("open77_voice", "setProximityMode", "shout")
```

On servers running [`open-voice`](voice.md#open-voice), the server owns the mode: use its F11
cycle or its server events instead.

## Other players

| Function | |
|---|---|
| `talkers()` | remote players: talking state, level, local gain/block and active routes |
| `setPlayerVolume(playerId, gain)` | local gain for one talker |
| `setPlayerBlocked(playerId, blocked)` | silence one talker locally |
| `setChannelVolume(channelId, gain)` | local gain for a channel, kept for future routes |

## Events

| Event | Arguments |
|---|---|
| `open77:voice:talkingChanged` | `playerId, talking, level, detail` |
| `open77:voice:proximityChanged` | `localPlayerId, enabled, 0, distance` (after the server confirmed) |
| `open77:voice:proximityRequested` | `distance, mode` (from `open77_voice`) |
| `open77:voice:proximityModeChanged` | `mode, canonicalDistance, enabled` (from `open77_voice`) |
| `open77:voice:sourceChanged` | `id, status, error` for a local source of this resource |

```lua
AddEventHandler("open77:voice:talkingChanged", function(playerId, talking, level)
    if talking then print(("player %d talks (%.2f)"):format(playerId, level)) end
end)
```

`talkingChanged` is published on the Lua tick thread; `open77_voice` forwards it to
`Open77.nameplates.setTalking`, which drives the speaker icon. Use `talkers()` periodically as a
recovery path after a stream-in or a missed event, rather than inferring speech from packets.

## Local music and generated sound

These functions create sound **on this client only**. For a shared audience with synchronised
playback, use the server's [audio graph](voice-graph.md). They require **both `voice.client` and
`audio.play`**, and protocol 1.52.

| Function | |
|---|---|
| `createBroadcaster(asset, options?)` | load a declared WAV/MP3 asynchronously; returns a local source snapshot |
| `createPcmSource(options?)` | a 48 kHz PCM producer you feed from Lua |
| `broadcasters()`, `get(source)` | this resource's sources / one snapshot |
| `update(source, options)` | change rendering options, keeping the position |
| `attach(source, entityId, offset?)`, `attach(source, false)` | follow a local entity (world-axis offset); detach at the last position |
| `play`, `pause`, `stop`, `seek(source, seconds)`, `setLoop(source, enabled)` | playback; `stop` clears queued PCM and effect history |
| `setPreset(source, name)`, `setEffects(source, parameters)`, `getEffects(source)`, `resetEffects(source)` | the [effect rack](voice-effects.md) (built-in presets only) |
| `submitPcm(source, samples, channels?)` | queue samples; returns `ok, reason?` |
| `destroy(source)` | retire the source now |
| `effectSchema()`, `presets()` | the schema and built-in presets (need only `voice.client`) |

Creation options: `gain = 1` (0–4), `spatial = false`, `position`, `minDistance = 1`,
`maxDistance = 30` (at most 1,000), `loop = false`, `paused = false`, `offset = 0`, `preset`,
`effects`, `entity`, `attachmentOffset`. A `position` or an `entity` makes the source spatial, with
walls and room processing; non-spatial files and PCM stay stereo.

Snapshots (`{ kind = "localBroadcaster", id = ... }`) are copies: pass them, or the id, back to the
functions. They report `status`, `error`, `position`, `duration`, `worldPosition`, the attachment,
the resolved effects, `queuedFrames`, `droppedFrames` and `rejectedRoutes`.

```lua
-- Manifest: permission "voice.client"; permission "audio.play"; files { "audio/club.mp3" }
local voice = Open77.voice
local music = assert(voice.createBroadcaster("audio/club.mp3", {
    position = vector3(10, 20, 3), maxDistance = 35, loop = true, gain = 0.7, preset = "lofi",
}))
assert(voice.setEffects(music, { lowPassHz = 4500, delayMix = 0.08 }))

AddEventHandler("open77:voice:sourceChanged", function(id, status, err)
    print("source", id, status, err)
end)
```

### Feeding PCM

`submitPcm` takes 1–4,096 frames per call, every sample finite and within −1..1; stereo is
interleaved left/right. At most 24,000 frames (500 ms) wait in the queue: a submission that does not
fit is refused whole. Per host tick, a resource may submit about twice the tick's real-time length
for each PCM source (at least 4,096 frames, at most 24,000); beyond that the call returns
`false, "voice_pcm_rate_limited"`. Keep a target amount queued instead of submitting a fixed block
per frame:

```lua
local tone = assert(voice.createPcmSource({ position = vector3(12, 20, 3), gain = 0.2, preset = "phone" }))
CreateThread(function()
    local target = 4800                       -- keep 100 ms queued
    local step = 2 * math.pi * 440 / 48000    -- a 440 Hz sine
    local written = 0
    while true do
        local state = voice.get(tone)
        if not state then break end           -- destroyed, or the resource is stopping
        local missing = target - state.queuedFrames
        while missing > 0 do
            local count = math.min(missing, 4096)
            local samples = {}
            for i = 1, count do samples[i] = math.sin(step * (written + i - 1)) end
            if not voice.submitPcm(tone, samples) then break end   -- e.g. rate limited: next frame
            written = (written + count) % 48000
            missing = missing - count
        end
        Wait(0)
    end
end)
```

Limits: 16 local sources per resource generation; 64 package-audio sources in total, shared with
file and network playback; the file and DSP limits of the [graph](voice-graph.md#limits). Sources
are released when their resource stops or is replaced; an error in one event handler does not stop
them.

## Guided setup

`Open77.voice.setup(operation, payload)` lets a resource build its own microphone onboarding on top
of the pause menu's saved preferences. See [Guided voice setup](guided-voice-setup.md).
