# Voice recipes

Complete server-side patterns for roleplay and gamemodes. Each one is a server script in a resource
whose manifest declares `permission "voice.manage"`. Recipes that use the audio graph or the effect
rack need protocol 1.52 (client and server **2.50.0-unstable+op77.211** or later); the radio and the
admin channel work on every release.

Player ids come from your own gameplay code (commands, jobs, phone numbers). Membership and graph
state disappear by themselves when a player leaves or the resource stops.

## Radio frequencies

`/radio 101.5` joins a frequency, `/radio off` leaves. One channel per frequency, created on demand
and removed when empty. Members transmit on it with the reference push-to-talk (intent `"all"`).

```lua
local v = Open77.voice
local frequencies = {}   -- "101.5" -> { channel = table, members = { [playerId] = true } }
local current = {}       -- playerId -> "101.5"

local function leave(playerId)
    local name = current[playerId]
    if not name then return end
    local f = frequencies[name]
    v.removePlayer(f.channel.id, playerId)
    f.members[playerId] = nil
    current[playerId] = nil
    if next(f.members) == nil then
        v.removeChannel(f.channel.id)
        frequencies[name] = nil
    end
end

local function join(playerId, name)
    leave(playerId)
    local f = frequencies[name]
    if not f then
        local channel = assert(v.createChannel({ name = "Radio " .. name, mode = "radio" }))
        v.setPreset(channel, "walkieTalkie")       -- protocol 1.52; older servers keep the radio colouring
        f = { channel = channel, members = {} }
        frequencies[name] = f
    end
    assert(v.addPlayer(f.channel.id, playerId, { canSpeak = true, canListen = true }))
    f.members[playerId] = true
    current[playerId] = name
end

RegisterCommand("radio", function(source, args)
    local arg = args[1]
    if arg == "off" or not arg then leave(source) return end
    local value = tonumber(arg)
    if not value or value < 1 or value > 999 then return end
    join(source, ("%.1f"):format(value))
end)

AddEventHandler("playerDropped", function() leave(source) end)
```

Encrypted police frequencies are the same channel with a job check before `join`. A scanner is a
membership with `canSpeak = false`.

## Phone calls

A call is two direct listeners and two connections; the `phone` preset gives the line its sound.
`crossBucket` lets a call cross instances (an apartment and the street).

```lua
local v = Open77.voice
local calls = {}   -- playerId -> { peer, nodes = {...} }

local function hangUp(playerId)
    local call = calls[playerId]
    if not call then return end
    for _, node in ipairs(call.nodes) do v.destroy(node) end   -- connections go with their nodes
    calls[call.peer] = nil
    calls[playerId] = nil
end

local function startCall(a, b)
    hangUp(a); hangUp(b)
    local earA = assert(v.createListener({ player = a }))
    local earB = assert(v.createListener({ player = b }))
    local ab = assert(v.connect(v.player(a), earB, { intent = "any", crossBucket = true }))
    local ba = assert(v.connect(v.player(b), earA, { intent = "any", crossBucket = true }))
    v.setPreset(ab, "phone")
    v.setPreset(ba, "phone")
    local call = { nodes = { earA, earB } }
    calls[a] = { peer = b, nodes = call.nodes }
    calls[b] = { peer = a, nodes = call.nodes }
end

RegisterCommand("call", function(source, args)
    local target = tonumber(args[1])
    if target then startCall(source, target) end
end)
RegisterCommand("hangup", function(source) hangUp(source) end)
```

With `intent = "any"` the caller is heard on the phone whenever they talk; people standing next to
them still hear them in proximity. Use `"connections"` instead for a phone the player must key with
a dedicated button (see [transmit intents](voice-client.md#transmit-intents)). Swap the preset for
`badLine` from the [custom presets](voice-effects.md#custom-presets-for-night-city) when a call comes
from the Badlands.

## A police megaphone on a car

The officer's voice comes out of a loudspeaker attached to the vehicle, much louder than proximity,
and the `megaphone` preset gives it the horn sound.

```lua
local v = Open77.voice
local megaphones = {}   -- playerId -> { speaker, connection }

RegisterCommand("megaphone", function(source)
    local m = megaphones[source]
    if m then
        v.destroy(m.speaker)
        megaphones[source] = nil
        return
    end
    local seat = Open77.vehicles.getPlayerSeat(source)
    if not seat then return Open77.chat.send(source, "Get in your cruiser first.") end
    local vehicleId = seat.vehicleId
    local speaker = assert(v.createSpeaker({
        anchor = { kind = "vehicle", id = vehicleId, x = 0, y = 0, z = 1.5 },
        distance = 80, minDistance = 5, gain = 1.5,
    }))
    assert(v.setPreset(speaker, "megaphone"))
    local connection = assert(v.connect(v.player(source), speaker, { intent = "proximity", exclusive = true }))
    megaphones[source] = { speaker = speaker, connection = connection }
end)
```

`exclusive = true` stops the officer from being heard twice (once in proximity, once through the
speaker) by the same listeners. The speaker follows the car and is removed with it
(`open77:voice:nodeRemoved` with `vehicle_removed`).

## A club with music and a DJ

```lua
local v = Open77.voice
local CLUB = { x = -1450, y = 1060, z = 16, bucket = 0 }

local pa = assert(v.createPreset("clubPA", {
    highPassHz = 90, lowPassHz = 12000, compressorThresholdDb = -18, compressorRatio = 3,
    reverbMix = 0.12, reverbDecay = 1.2,
}))
local speakers = {}
for _, offset in ipairs({ { -8, 0 }, { 8, 0 }, { 0, 10 } }) do
    local s = assert(v.createSpeaker({
        anchor = { x = CLUB.x + offset[1], y = CLUB.y + offset[2], z = CLUB.z + 3, bucket = CLUB.bucket },
        distance = 30, minDistance = 3,
    }))
    v.setPreset(s, pa)
    speakers[#speakers + 1] = s
end

-- declared in files { "audio/set1.mp3" }; MP3 needs its real duration
local music = assert(v.createBroadcaster("audio/set1.mp3", { duration = 3540, loop = true, gain = 0.5 }))
for _, s in ipairs(speakers) do assert(v.connect(music, s)) end

local djLines = {}
RegisterCommand("dj", function(source)
    if djLines[source] then
        for _, c in ipairs(djLines[source]) do v.disconnect(c) end
        djLines[source] = nil
        return
    end
    djLines[source] = {}
    for _, s in ipairs(speakers) do
        djLines[source][#djLines[source] + 1] = assert(v.connect(v.player(source), s,
            { intent = "proximity", exclusive = true, gain = 1.4 }))
    end
end)

RegisterCommand("track", function(source, args)
    if args[1] == "pause" then v.pause(music) elseif args[1] == "play" then v.play(music)
    elseif args[1] == "seek" then v.seek(music, tonumber(args[2]) or 0) end
end)
```

Every player hears the same moment of the set; someone who arrives late joins it mid-track. A
player near a wall of the club hears the bass through it, muffled.

## A door intercom

A microphone outside the door, a speaker inside, and the reverse for the answer.

```lua
local v = Open77.voice
local OUTSIDE = { x = 312.4, y = -201.8, z = 22.1, bucket = 0 }
local INSIDE  = { x = 309.0, y = -205.0, z = 22.6, bucket = 0 }

local outsideMic = assert(v.createListener({ anchor = OUTSIDE, range = 2.5, broadcasts = false }))
local insideSpeaker = assert(v.createSpeaker({ anchor = INSIDE, distance = 12, minDistance = 1 }))
local line = assert(v.connect(outsideMic, insideSpeaker, { enabled = false }))
v.setPreset(line, "intercom")

-- the buzzer opens the line for 20 seconds
RegisterCommand("buzz", function()
    v.update(line, { enabled = true })
    SetTimeout(20000, function() v.update(line, { enabled = false }) end)
end)
```

The pickup hears what is said within 2.5 m of the door, with the walls and room of the street side;
the speaker plays it inside with the walls of the apartment.

## A disguised voice

An item that changes how everyone hears a player, until it is removed. Another resource that
already claimed the player's rack gets a clear error naming the owner.

```lua
local v = Open77.voice

local function wearModulator(playerId, on)
    if on then
        local ok, reason = v.setPreset(v.spatial(playerId), "disguise")
        if not ok then print("modulator refused: " .. reason) return end
        v.setPreset(v.direct(playerId), "disguise")       -- radio and phone too
    else
        v.resetEffects(v.spatial(playerId))
        v.resetEffects(v.direct(playerId))
    end
end
```

The same pattern gives a `helmet` to an NCPD officer in armour, `underwater` to a swimmer, or
`robot` to a player with a full-borg conversion.

## Hearing a player differently per listener

A netrunner who hacked a target's agent hears the target's radio clearly, while everyone else on the
frequency hears the usual walkie-talkie:

```lua
v.setPreset(v.channel(radio.id), "walkieTalkie")
v.setPreset(v.channel(radio.id), "clean", netrunnerId)        -- this listener only
-- undo for that listener
v.resetEffects(v.channel(radio.id), netrunnerId)
```

## An admin broadcast

A staff channel everyone listens to, but only staff can speak on:

```lua
local v = Open77.voice
local announce = assert(v.createChannel({ name = "City announcement", mode = "admin" }))

local function listen(playerId, attempt)
    local ok = v.addPlayer(announce.id, playerId, { canSpeak = false, canListen = true })
    attempt = (attempt or 0) + 1
    if not ok and attempt < 10 then                    -- the voice session may not be ready yet
        SetTimeout(2000, function() listen(playerId, attempt) end)
    end
end

AddEventHandler("playerJoining", function() listen(source) end)

RegisterCommand("staffvoice", function(source, args)
    -- check your own staff permission first
    v.setChannelPlayerPermissions(announce.id, source, { canSpeak = args[1] ~= "off", canListen = true })
end)
```

On protocol 1.52 add `v.setPreset(announce, "megaphone")` for a city-wide PA sound.
