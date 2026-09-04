# Integrated voice chat

Open77 voice is a native, server-authoritative VOIP stack. The client captures one 48 kHz mono
stream, encodes it as 20 ms Opus frames, and can route that same frame through proximity and up to
four selected channels at once. Radio and phone calls therefore do not duplicate microphone
bandwidth. PCM and Opus payloads are never exposed to Lua.

The server is the only component that decides who may receive a frame. It checks the authenticated
speaker, routing bucket, proximity, channel membership, per-channel permissions, mute/deaf state,
sequence, quality, packet rate, and payload size before forwarding anything. A client transmit
scope is only a request.

## Enable the reference resource

`open77_voice` is an auto-start reference package. Its manifest requests `voice.manage` on the
server and `voice.client`, `input.actions`, and `ui.nameplates` on the client. The default PTT key is
`N`. The pause menu has a dedicated **VOICE** tab for:

- microphone and output endpoint selection, including the Windows communications defaults;
- independent 0–200% microphone and voice gains;
- capture enable/disable;
- the current proximity reach as read-only server policy;
- a persistent, per-server push-to-talk key binding;
- PTT or voice activation and its threshold;
- local microphone loopback plus a live input meter.

Preferences use endpoint- and resource-isolated client KVP storage. Device IDs may disappear after
a Windows device change; an empty ID always selects the current communications default. Microphone
test is forcibly stopped when the settings pane or pause menu closes. Because that KVP namespace is
keyed by the authenticated server endpoint, the pause package restores it only after the session is
active and the native audio endpoint catalogue is ready. A missing saved endpoint is retained and
reported rather than silently overwritten with the Windows default.

The activation threshold and input meter intentionally share the exact same normalized RMS scale
(`-60..-10 dBFS` mapped to `0..100%`). A threshold of 40% therefore opens transmission only when
the visible input meter reaches 40%; a short 250 ms hangover prevents clipped word endings. The
white marker on the meter shows the configured threshold.

Server configuration owns the codec quality for the whole session:

```jsonc
{
  "voice": {
    "enabled": true,
    "quality": "standard",
    "proximityDistance": 20.0,
    "minimumClientProximityDistance": 1.0,
    "maximumClientProximityDistance": 100.0,
    "maximumChannelAudience": 128,
    "maximumSimultaneousTalkers": 32,
    "maximumTalkersPerRecipient": 8,
    "globalEgressKbps": 0,
    "recipientEgressKbps": 0,
    "ingressRejectLimit": 200,
    "ingressRejectWindowSeconds": 10,
    "ingressBackoffMilliseconds": 250
  }
}
```

Quality values are `low`, `standard`, `high`, and `ultra`. They select bounded Opus bitrate,
complexity, packet-loss recovery, DTX, and maximum payload/rate limits. Clients cannot override the
negotiated quality.

The two bandwidth values use `0` for conservative automatic budgets derived from quality and
server capacity. The remaining limits bound fan-out amplification and sustained invalid media;
the server applies backoff before disconnecting an abusive voice sender.

`Open77.voice.status()` exposes those effective audience/talker/egress limits
and the metadata-only rejection counters (`egressPacketsDroppedGlobal`,
`egressPacketsDroppedRecipient`, `egressBytesDropped`,
`channelAudienceRejected`, `talkerLimitRejected`,
`recipientTalkerLimitRejected`, `ingressBackoffDrops`,
`ingressDisconnects`, and `activeTalkers`) under `statistics`. It never exposes
PCM or Opus payloads.

## `open-voice` gameplay package

`open-voice` is the pma-voice-style gameplay layer and auto-starts after
`open77_voice`. The native resource remains the only capture/PTT/VAD/codec
driver. `open-voice` adds a retained bottom-right HUD and an authoritative reach-mode policy. The
CyberM/Open77 panel renders the real normalized native input level, encoder transmission state,
canonical distance, server-defined presets, cycle key, PTT/VAD policy and active remote-talker
count. Its five states are `LISTENING`, `SIGNAL DETECTED`, `TRANSMITTING`, `MIC DISABLED`, and
`VOICE OFFLINE`; it never fabricates audio activity in JavaScript:

- `WHISPER` — 3 m;
- `NORMAL` — 20 m;
- `SHOUT` — 40 m;
- `F11` cycles to the next mode by sending a request to the server.

All values are configured in `resources/system/open-voice/server/config.lua`. The
client request contains no distance or target mode: the server rate-limits the
request, advances its own stored mode, calls `Open77.voice.setProximity`, then
returns the canonical state. A player therefore cannot select an arbitrary
reach from the pause menu or by forging the cycle event.

Trusted server resources may emit `open-voice:setPlayerMode(playerId, mode)` or
`open-voice:cyclePlayerMode(playerId)` and observe
`open-voice:modeApplied(playerId, mode, distance, label, color)`. These remain
local server events and are deliberately not registered as client network
events.

The HUD keeps microphone activity and transmission distinct. The segmented
meter follows normalized native capture activity; the `TRANSMITTING` state is
shown only while the native encoder is inside a real authorized talkspurt.
This distinction provides useful feedback in both PTT and voice-activation
modes.

## Server Lua API

Every method below requires `voice.manage`. Channel mutations are resource-owned: a resource cannot
alter another resource's channel. Non-persistent channels are removed automatically on stop or
reload.

| Method | Result | Purpose |
|---|---|---|
| `Open77.voice.status()` | `table` | Enabled state, quality/profile, default distance, counters. |
| `channels()` / `getChannel(id)` | array / channel | Read canonical channel state. |
| `participants()` / `getParticipant(playerId)` | array / participant | Read proximity, mute/deaf and memberships. |
| `createChannel(options)` | channel | Create a `radio`, `phone`, `party`, `admin`, or `spatial` channel. |
| `updateChannel(id, patch)` | channel | Change name, mode, reach, effect, or persistence. |
| `removeChannel(id)` | `boolean, reason?` | Remove a channel owned by this resource. |
| `addPlayer(id, playerId, permissions?)` | `boolean, reason?` | Add membership with speak/listen flags. |
| `removePlayer(id, playerId)` | `boolean, reason?` | Remove membership. |
| `setChannelPlayerMuted(id, playerId, muted)` | `boolean, reason?` | Mute inside one channel only. |
| `setChannelPlayerPermissions(id, playerId, options)` | `boolean, reason?` | Change speak/listen independently. |
| `setPlayerMuted(playerId, muted)` | `boolean, reason?` | Server-wide transmit mute. |
| `setPlayerDeaf(playerId, deaf)` | `boolean, reason?` | Server-wide receive mute. |
| `setProximity(playerId, options)` | `boolean, reason?` | Enable/disable proximity and set its reach. |
| `setDefaultProximityDistance(distance, applyExisting?)` | `boolean, reason?` | Change the default reach. |
| `setQuality(quality)` / `setEnabled(enabled)` | `boolean, reason?` | Change global voice policy. |

Channel options and effect tuning:

```lua
local dispatch, reason = Open77.voice.createChannel({
  name = "NCPD dispatch",
  mode = "radio",
  persistent = false,
  effect = {
    gain = 1.0,
    highPassHz = 220.0,
    lowPassHz = 4800.0,
    distortion = 0.08,
    radioNoise = 0.04,
    spatialBlend = 0.0,
    reverbWet = 0.22,
    reverbRoomSize = 0.7,
    reverbDecay = 1.8,
    reverbDamping = 0.55,
    reverbPreDelayMs = 24.0,
  }
})
assert(dispatch, reason)

assert(Open77.voice.addPlayer(dispatch.id, officerId, {
  canSpeak = true,
  canListen = true,
}))
```

| Effect field | Range | Meaning |
|---|---:|---|
| `gain` | `0.0..4.0` | Channel gain before the local player/channel volume. |
| `highPassHz` | `0.0..20000.0` | Removes frequencies below the cutoff. Must be below `lowPassHz`. |
| `lowPassHz` | `20.0..24000.0` | Removes frequencies above the cutoff. |
| `distortion` | `0.0..1.0` | Soft saturation drive. |
| `radioNoise` | `0.0..1.0` | Deterministic narrow-band radio noise. |
| `spatialBlend` | `0.0..1.0` | `0` is non-spatial; `1` is fully positional. |
| `reverbWet` | `0.0..1.0` | Wet/dry mix. `0` disables the reverb and its DSP allocation. |
| `reverbRoomSize` | `0.0..1.0` | Scales the virtual reflection delays. |
| `reverbDecay` | `0.1..10.0` | Approximate RT60 tail duration in seconds. |
| `reverbDamping` | `0.0..1.0` | High-frequency absorption inside the tail. |
| `reverbPreDelayMs` | `0.0..250.0` | Delay before the first reflected sound. |

`maxDistance` additionally constrains `spatial` channels. Reverb is a lightweight stereo delay
network retained per talker/channel route, so its tail continues after the source stops speaking.
Effects are canonical channel metadata; a client only renders effects received from the server.

Server packages call these methods directly. This preserves resource ownership of channel handles;
the dedicated server does not expose the client-only `exports()` global.

## Client Lua API

Every method requires `voice.client`. Device/gain/block settings are local presentation policy;
they never grant reachability or channel membership.

| Method | Purpose |
|---|---|
| `Open77.voice.devices(flow?)` | Enumerate `input`, `output`, or `all` endpoints. |
| `status()` | Capture/render/device/level/packet snapshot. |
| `talkers()` | Remote talking state, level, local gain/block, and active routes. |
| `selectDevice(flow, endpointId)` | Select an endpoint; `""` means Windows default. |
| `setCaptureEnabled(enabled)` | Enable or disable microphone capture. |
| `setTransmitting(enabled, intent?)` | Change PTT state and requested route intent. |
| `setMicrophoneTest(enabled)` | Local loopback; no network transmission is implied. |
| `setInputVolume(gain)` / `setOutputVolume(gain)` | Set a finite gain from `0.0` to `2.0`. |
| `setVoiceActivation(enabled, threshold?)` | Enable VAD with normalized threshold `0.0..1.0`. |
| `setProximityDistance(distance)` | Request a personal reach; the server clamps and republishes it. |
| `setPlayerVolume(playerId, gain)` | Local per-talker gain. |
| `setPlayerBlocked(playerId, blocked)` | Local per-talker silence. |
| `setChannelVolume(channelId, gain)` | Local gain retained for current and future route streams. |

Transmit intents are `proximity`, `channels`, `channel:<id>`, or `all`. `channels` selects up to
four currently authorized speakable memberships; `all` selects the same channels plus proximity.
Both are resolved by the native client in deterministic channel-ID order and are never sent as a
wildcard on the wire.

Proximity is the permanent default voice route. A client can change only its
distance, never its enabled flag. `status()` exposes `proximityEnabled`, the
canonical `proximityDistance`, an in-flight `requestedProximityDistance` /
`proximityRequestPending`, and the server-advertised
`defaultProximityDistance`, `minimumProximityDistance`, and
`maximumProximityDistance`. A successful setter result means the reliable
request was queued (or was already canonical), not that the requested value was
accepted verbatim.

The reference package maps `whisper=3`, `normal=server default`, and
`shout=40`. All presets are configurable in `shared/config.lua`; setting a
cycle key is intentionally opt-in to avoid stealing a gameplay binding:

```lua
-- In another input-capable package, using a rising edge rather than every tick.
CreateThread(function()
  local held = false
  while true do
    local down = not Open77.input.isCaptured() and Open77.input.isDown("Z")
    if down and not held then
      Open77.exports.call("open77_voice", "cycleProximityMode", true)
    end
    held = down
    Wait(20)
  end
end)
```

```lua
-- One Opus frame, heard by nearby players and two authorized radio/call groups.
local ok, reason = Open77.voice.setTransmitting(
  true, "all")
assert(ok, reason)
```

The host publishes `open77:voice:talkingChanged(playerId, talking, level, detail)` on the Lua tick
thread. `open77_voice` mirrors it into `Open77.nameplates.setTalking`, which drives the native
speaker icon. A bounded talker snapshot loop is the recovery path for late join, stream-in, and a
dropped event. Puppet lip motion consumes the same native talking/level state; resources should not
attempt to infer speech by polling network packets.

For reach changes, the native host emits
`open77:voice:proximityChanged(localPlayerId, enabled, 0, distance)` after the
canonical participant revision arrives. The package additionally emits
`open77:voice:proximityRequested(distance, mode)` and
`open77:voice:proximityModeChanged(mode, canonicalDistance, enabled)`.

The package exports `status`, `devices`, `getProximityDistance`,
`setProximityDistance`, `getProximityMode`, `setProximityMode`,
`cycleProximityMode`, `setPlayerVolume`, `setPlayerBlocked`, and
`setChannelVolume` for convenience.

## Reliability and bandwidth

- Opus uses one 20 ms stream per speaker, not one stream per route.
- Native VAD does not emit silent talkspurts. Held PTT silence uses Opus DTX, while congestion
  drops old media instead of playing it late.
- Media uses a bounded unreliable queue while config, membership, and channel state are reliable.
- A jitter buffer, packet-loss concealment, and optional FEC live in the native audio engine.
- Late join first receives canonical voice config, participant memberships, and channels; media is
  buffered but silent until an authorized route exists.
- Disconnect, resource reload, bucket changes, mute/deaf changes, and device restarts clear stale
  routes and talking indicators.
- Channel metadata is visible only to members, and another participant's private membership list
  is projected only through channels shared with the viewer.
- The client follows Windows communication-default changes and automatically retries an invalidated
  input or output endpoint without blocking the game thread.

## Runtime diagnostics

Authenticated development sessions expose metadata-only commands; no PCM or Opus payload is logged:

```text
voice.status
voice.devices [input|output]
voice.mictest on|off
voice.transmit on|off [proximity|channels|all|channel:<id>]
voice.lipsync <playerId> <0..1|off>
```

`voice.lipsync` is a bounded visual laboratory override for validating a streamed proxy's facial
graph. It is not a network or Lua route and is cleared on stream-out and session teardown.

Lua intentionally has no raw audio callback, recipient list, or codec-packet API. This keeps the
audio thread isolated, prevents scripts from bypassing server reachability, and makes bandwidth
limits enforceable.
