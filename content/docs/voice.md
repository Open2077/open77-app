# Voice chat

Open77 voice is a native, server-authoritative VOIP stack built into the client and the server.
Players talk in proximity with real acoustics (walls, rooms, direction), on radio and phone
channels, and through an audio graph that places loudspeakers, microphones and music in the world.
Every route can be coloured by a shared effect rack: 36 parameters and 12 built-in presets, from a
walkie-talkie to a cave.

The client captures one 48 kHz mono stream and encodes it as 20 ms Opus frames. One frame is sent
once and can reach proximity listeners and up to four channels at the same time, so a radio call
does not double the microphone bandwidth. The server alone decides who receives a frame: it checks
the authenticated speaker, routing bucket, distance, channel membership and permissions, mutes,
sequence, packet rate and size. Lua never sees PCM or Opus data.

## What is in this section

| Page | |
|---|---|
| Voice chat (this page) | setup, server configuration, the built-in packages, acoustics, diagnostics |
| [Radio, phone and party channels](voice-channels.md) | server channels, memberships, mutes, proximity control |
| [Audio graph: speakers, microphones, music](voice-graph.md) | loudspeakers, pickups, direct listeners, synchronised music, connections |
| [Voice effects and presets](voice-effects.md) | the 36-parameter rack, the 12 presets, custom presets, per-listener effects |
| [Client voice API](voice-client.md) | devices, push-to-talk, transmit intents, talkers, local music and generated PCM |
| [Voice recipes](voice-recipes.md) | complete radio, phone, megaphone, intercom, club and disguise examples |
| [Voice lipsync](voice-lipsync.md) | mouths that move with the voice |
| [Guided voice setup](guided-voice-setup.md) | a microphone onboarding screen in your resource |

## Versions

| Feature | Client and server |
|---|---|
| Proximity voice, channels, devices, push-to-talk, lipsync | every current release |
| Audio graph, effect rack and presets, local broadcasters and PCM sources | **2.50.0-unstable+op77.211** or later on both sides (network protocol 1.52) |

Protocol 1.52 and 1.51 builds do not connect to each other: a server using the graph or effect API
needs players on the matching client channel.

## Turning it on

Voice is configured in the server's `server.jsonc`:

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

| Setting | |
|---|---|
| `enabled` | voice on or off for the session |
| `quality` | `low`, `standard`, `high` or `ultra`: Opus bitrate, complexity, loss recovery, DTX and payload limits. Clients cannot override it. |
| `proximityDistance` | default reach in metres |
| `minimumClientProximityDistance`, `maximumClientProximityDistance` | the range a client may request (whisper/shout modes) |
| `maximumChannelAudience` | listeners one channel frame may reach |
| `maximumSimultaneousTalkers`, `maximumTalkersPerRecipient` | fan-out limits |
| `globalEgressKbps`, `recipientEgressKbps` | outgoing bandwidth budgets; `0` derives them from quality and capacity |
| `ingressRejectLimit`, `ingressRejectWindowSeconds`, `ingressBackoffMilliseconds` | backoff, then disconnection, of a sender of sustained invalid media |

Resources change the policy at runtime with `Open77.voice.setQuality`, `setEnabled` and
`setDefaultProximityDistance` (see [channels](voice-channels.md#global-policy)).

## The built-in packages

### `open77_voice`

The reference package starts automatically. It captures the microphone, drives push-to-talk
(default key **N**) or voice activation, mirrors talking state into the nameplate speaker icon, and
exposes a **VOICE** tab in the pause menu:

- microphone and output device, including the Windows communications defaults;
- microphone and voice volume, 0–200 % each;
- capture on/off;
- the current proximity reach (read-only server policy);
- a per-server push-to-talk binding, including `MOUSE1`–`MOUSE5`;
- push-to-talk or voice activation with its threshold;
- a local microphone loopback with a live input meter.

The activation threshold and the meter share one scale (−60..−10 dBFS mapped to 0..100 %): a
threshold of 40 % opens transmission when the meter reaches 40 %, with a 250 ms hangover so word
endings are not clipped. Preferences are stored per server in client KVP storage; a device that
disappears is kept and reported instead of being silently replaced.

The package exports `status`, `devices`, `getProximityDistance`, `setProximityDistance`,
`getProximityMode`, `setProximityMode`, `cycleProximityMode`, `setPlayerVolume`,
`setPlayerBlocked` and `setChannelVolume` to other client resources.

### `open-voice`

`open-voice` adds a pma-voice-style reach mode and HUD on top of `open77_voice`. **F11** cycles
the mode; the server owns the policy, so a player cannot pick an arbitrary reach:

| Mode | Reach |
|---|---|
| `WHISPER` | 3 m |
| `NORMAL` | 20 m |
| `SHOUT` | 40 m |

Modes, labels, colours, the cycle key and the request cooldown live in
`resources/system/open-voice/server/config.lua`:

```lua
OpenVoiceServerConfig = {
    defaultMode = "normal",
    cycleKey = "F11",
    requestCooldownSeconds = 0.25,
    modes = {
        { name = "whisper", label = "WHISPER", distance = 3.0,  color = "#7CE7EE" },
        { name = "normal",  label = "NORMAL",  distance = 20.0, color = "#22D8E2" },
        { name = "shout",   label = "SHOUT",   distance = 40.0, color = "#F5C95C" },
    },
}
```

The HUD shows `LISTENING`, `SIGNAL DETECTED`, `TRANSMITTING`, `MIC DISABLED` or `VOICE OFFLINE`
from the real native state: the meter follows the microphone level, and `TRANSMITTING` appears only
while the encoder is inside an authorised talkspurt.

Trusted server resources can drive it with local server events:

```lua
TriggerEvent("open-voice:setPlayerMode", playerId, "shout")
TriggerEvent("open-voice:cyclePlayerMode", playerId)
AddEventHandler("open-voice:modeApplied", function(playerId, mode, distance, label, color)
    print(("player %d now %s (%.0f m)"):format(playerId, mode, distance))
end)
```

## Environmental acoustics

Proximity voice reacts to the world without any setting or API call:

- walls and closed doors lower the volume and remove high frequencies; several rays give partial
  obstruction around openings, and collision materials and the thickness of a barrier change how
  much passes;
- interiors use the game's interior membership and nearby collision: room size, enclosure and
  absorption drive early reflections and a decaying stereo reverb tail;
- direction follows the listener's view, while distance and obstruction use head positions, so a
  third-person camera moving through a wall does not move the listener through it;
- ear delay, head shadow and front/back/elevation colouring place voices better than stereo
  panning; changes interpolate smoothly.

The filter is an analytic binaural approximation for stereo headphones. Reverb is simulated from
geometry, not from the game's Wwise presets, and custom interiors need suitable collision for
obstruction and room estimation. Radio and phone routes keep their own processing; the microphone
test stays dry.

## Reliability and bandwidth

- One 20 ms Opus stream per speaker, whatever the number of routes.
- Voice activation sends no silent talkspurts; held push-to-talk silence uses Opus DTX; congestion
  drops old media instead of playing it late.
- Media travels on a bounded unreliable queue; configuration, memberships and channels are
  reliable. A received frame waits for its route configuration rather than playing without its
  effects.
- A jitter buffer, packet-loss concealment and optional FEC run in the native engine.
- A late joiner first receives configuration, memberships and channels; media stays silent until an
  authorised route exists.
- Disconnects, reloads, bucket changes, mutes and device restarts clear stale routes and talking
  indicators.
- Channel metadata is visible only to members.
- The client follows Windows communication-device changes and retries a lost device without
  blocking the game.

## Diagnostics

`Open77.voice.status()` (server) returns the effective limits and metadata-only counters under
`statistics`: `egressPacketsDroppedGlobal`, `egressPacketsDroppedRecipient`, `egressBytesDropped`,
`channelAudienceRejected`, `talkerLimitRejected`, `recipientTalkerLimitRejected`,
`ingressBackoffDrops`, `ingressDisconnects` and `activeTalkers`.

Authenticated development sessions have console commands; none of them logs audio:

```text
voice.status                         capture, render, devices, routes, DSP reservations
voice.broadcasts                     network music sources: ids, resource, position, decode state
voice.devices [input|output]
voice.mictest on|off
voice.transmit on|off [proximity|channels|connections|all|channel:<id>]
voice.acoustics                      listener room and every active source path
voice.acoustics <x> <y> <z>          read-only acoustic probe toward a point (150 m)
voice.acoustics.play <x> <y> <z>     plays a 240 ms synthetic burst from that point, locally
voice.acoustics.stop
voice.lipsync <playerId> <0..1|off>  visual lipsync override
voice.lipsyncstate <playerId>
```

`voice.acoustics` reports obstruction, transmission gain, cutoff, direction, reflection amount,
observation age and sampling cost for each path.

Lua has no raw audio callback, recipient list or codec-packet API. This keeps the audio thread
isolated, prevents scripts from bypassing reachability, and keeps bandwidth limits enforceable.
