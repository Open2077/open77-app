# Voice channels

Channels carry voice outside proximity: a police radio, a phone call, a party line, an admin
channel, or a spatial channel heard in the world. A server resource creates them and decides who
belongs to each one; players only choose, with their transmit intent, whether their microphone goes
to proximity, to their channels, or to both.

Every function on this page runs on the **server** and requires the `voice.manage` permission:

```lua
-- open77.lua
permission "voice.manage"
server_script "server/main.lua"
```

## A radio in ten lines

```lua
local radio = assert(Open77.voice.createChannel({ name = "NCPD dispatch", mode = "radio" }))

RegisterCommand("joinradio", function(source)
    assert(Open77.voice.addPlayer(radio.id, source, { canSpeak = true, canListen = true }))
end)

RegisterCommand("leaveradio", function(source)
    Open77.voice.removePlayer(radio.id, source)
end)
```

A member's microphone reaches the channel when its client transmits with an intent that includes
channels (`"channels"`, `"all"` or `"channel:<id>"`, see [client API](voice-client.md#transmit-intents)).
The reference `open77_voice` package transmits with `"all"`: proximity, every speakable channel
(up to four) and graph connections, from the same push-to-talk key.

## Modes

| `mode` | Default colouring | Typical use |
|---|---|---|
| `radio` (default) | 220–4800 Hz band, light distortion and radio noise | police, gangs, walkie-talkies |
| `phone` | 300–3400 Hz band, faint distortion and noise | calls |
| `party` | clean | group chat, squads |
| `admin` | clean | staff, broadcasts |
| `spatial` | clean, `spatialBlend = 1`: heard from the speaker's position with walls and rooms | in-world channels limited by `maxDistance` |

## Functions

| Function | Result |
|---|---|
| `createChannel(options)` | channel, or `nil, reason` |
| `updateChannel(id, patch)` | channel; changes `name`, `mode`, `maxDistance`, `effect`, `persistent` |
| `removeChannel(id)` | `ok, reason?` |
| `channels()`, `getChannel(id)` | every channel / one channel |
| `addPlayer(id, playerId, { canSpeak = true, canListen = true })` | `ok, reason?` |
| `removePlayer(id, playerId)` | `ok, reason?` |
| `setChannelPlayerPermissions(id, playerId, { canSpeak, canListen })` | `ok, reason?` |
| `setChannelPlayerMuted(id, playerId, muted)` | mute inside this channel only |
| `participants()`, `getParticipant(playerId)` | proximity, mute/deaf flags and memberships |
| `setPlayerMuted(playerId, muted)` | server-wide transmit mute |
| `setPlayerDeaf(playerId, deaf)` | server-wide receive mute |
| `setProximity(playerId, { enabled, distance })` | a player's proximity on/off and reach |

### `createChannel` options

| Field | Default | |
|---|---|---|
| `name` | | display name, sent to members |
| `mode` | `"radio"` | see above |
| `maxDistance` | `0` | metres; limits `spatial` channels |
| `persistent` | `false` | `false` removes the channel when the resource stops or reloads |
| `effect` | the mode's profile | the compatibility colouring below |

A channel table contains `kind = "channel"`, `id` (also `channelId`), `revision`, `name`,
`mode`, `persistent`, `maxDistance` and `effect`. Because it carries `kind` and `id`, it is also a
handle for the [audio graph](voice-graph.md) (`connect(channel, speaker)`) and the
[effect rack](voice-effects.md) (`setPreset(channel, "walkieTalkie")`).

### The channel's own colouring

The `effect` table is the channel's built-in colouring. Fields you omit keep the mode's defaults:

```lua
local dispatch = assert(Open77.voice.createChannel({
    name = "NCPD dispatch",
    mode = "radio",
    effect = {
        gain = 1.0,                -- 0..4
        highPassHz = 220,          -- 0..20000, below lowPassHz
        lowPassHz = 4800,          -- 20..24000
        distortion = 0.08,         -- 0..1 soft saturation
        radioNoise = 0.04,         -- 0..1 deterministic narrow-band noise
        spatialBlend = 0,          -- 0 direct .. 1 full position, walls and rooms
        reverbWet = 0.22,          -- 0..1, 0 disables the reverb
        reverbRoomSize = 0.7,      -- 0..1
        reverbDecay = 1.8,         -- 0.1..10 s
        reverbDamping = 0.55,      -- 0..1
        reverbPreDelayMs = 24,     -- 0..250 ms
    },
}))
```

On protocol 1.52 servers the full [effect rack](voice-effects.md) is available for channels too.
Binding a rack preset or effects to a channel replaces this compatibility colouring for the affected
listeners; start from the `radio` or `phone` preset when you want that sound and adjust it.

## Memberships and permissions

```lua
-- listen-only: a scanner
Open77.voice.addPlayer(dispatch.id, civilianId, { canSpeak = false, canListen = true })

-- promote to speaker
Open77.voice.setChannelPlayerPermissions(dispatch.id, civilianId, { canSpeak = true, canListen = true })

-- a dispatcher silences one officer on this channel only
Open77.voice.setChannelPlayerMuted(dispatch.id, officerId, true)

-- who is in it?
for _, p in ipairs(Open77.voice.participants()) do
    for _, m in ipairs(p.channels) do
        if m.channelId == dispatch.id then
            print(p.playerId, m.canSpeak, m.canListen, m.muted)
        end
    end
end
```

A participant snapshot has `playerId`, `revision`, `proximity = { enabled, distance }`, `muted`,
`deaf` and `channels = { { channelId, canSpeak, canListen, muted } }`. Channel metadata is sent
only to members, and a member sees other members only through channels they share.

## Mutes and proximity

```lua
Open77.voice.setPlayerMuted(playerId, true)    -- nobody hears this player, anywhere
Open77.voice.setPlayerDeaf(playerId, true)     -- this player hears nobody
Open77.voice.setProximity(playerId, { enabled = false })        -- radio only: a gagged prisoner
Open77.voice.setProximity(playerId, { enabled = true, distance = 8 })
```

Proximity is the permanent default route; a client can request another distance within the
server's limits, never turn it off. Disabling it from the server also silences the player's graph
inputs that use the `proximity` or `any` intent.

## Global policy

```lua
Open77.voice.setQuality("high")                   -- low | standard | high | ultra
Open77.voice.setEnabled(false)                     -- voice off for everyone (a cinematic)
Open77.voice.setDefaultProximityDistance(15, true) -- true: also apply to connected players
print(Open77.voice.status().statistics.activeTalkers)
```

## Ownership and lifecycle

A resource changes only the channels it created; the call returns
`voice_target_not_found_or_not_owned` for another resource's channel. Non-persistent channels are
removed when their resource stops or reloads. Errors are bare codes such as `channel_not_found`,
`invalid_name`, `permission_denied:voice.manage` or `voice_unavailable`.

While a resource stops, its `onResourceStop` handler may still read and undo (`removeChannel`,
`removePlayer`, `setPlayerMuted`, `setProximity`...). New claims (`createChannel`, `addPlayer`)
return `resource_stopping`. During a reload, the outgoing generation's stop handler may only read:
other calls return `resource_reloading`, so it cannot undo what the new generation set up.

To let other resources use your channels, wrap these calls in [server exports](server-exports.md):
the provider keeps ownership and authorises its callers.
