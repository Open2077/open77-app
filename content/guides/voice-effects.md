# Voice effects and presets

Every voice route can run through one shared effect rack: proximity speech, channels, the
[audio graph](voice-graph.md) and local music. The rack has 36 parameters (filters, EQ, gate,
compressor, distortion, pitch, tremolo, flanger, bit crusher, delay, reverb, radio noise) and 12
built-in presets. Effects can apply to everyone who hears a target, or differ per listener: the
same radio can sound clean to the dispatcher and broken up to a scanner.

Requirements: client and server **2.50.0-unstable+op77.211** or later (protocol 1.52). Server calls
require `voice.manage`; the local [client API](voice-client.md#local-music-and-generated-sound)
uses the same schema.

## Quick start

```lua
local v = Open77.voice
-- a helmet on one player's proximity voice
assert(v.setPreset(v.spatial(playerId), "helmet"))

-- a walkie-talkie sound on a channel, a bit noisier for one listener
assert(v.setPreset(v.channel(radio.id), "walkieTalkie"))
assert(v.setEffects(v.channel(radio.id), { lowPassHz = 1400, radioNoise = 0.2 }, listenerId))

-- back to normal
v.resetEffects(v.spatial(playerId))
```

## Targets

| Target | What it colours |
|---|---|
| `spatial(playerId)` | the player's proximity voice (and their voice on spatial channels and pickups) |
| `direct(playerId)` | the player's voice on radio, phone and other non-spatial channels, before the channel's own colour |
| `channel(id)` or a channel table | everything heard on a channel this resource owns |
| speaker, listener, broadcaster, connection handles | the graph nodes and connections this resource owns |

The optional `listenerId` argument restricts a call to what one connected player hears.

## Functions

| Function | |
|---|---|
| `setPreset(target, preset?, listenerId?)` | bind a built-in preset by name, or a custom preset (table, name or id); omit it to remove the binding |
| `setEffects(target, patch, listenerId?)` | override parameters on top of the preset |
| `clearEffects(target, names?, listenerId?)` | remove named overrides (`{ "pitchSemitones" }`), or all of them when `names` is omitted; an empty table removes nothing |
| `getEffects(target, listenerId?)` | `{ preset, parameters, resolved, overridden }` |
| `resetEffects(target, listenerId?)` | remove one listener's layer, or every layer of the target |
| `releaseEffects(target)` | give up this resource's claim on the target |
| `createPreset(name, parameters?)` | a resource-local named preset (`voice_preset_exists` if the name is taken) |
| `updatePreset(presetOrId, patch)`, `removePreset(presetOrId)` | edit or delete it; every target using it follows |
| `presets()`, `getPreset(presetOrId)` | this resource's custom presets |
| `effectSchema()` | `version`, the 36 `parameters` with `minimum`, `maximum`, `neutral`, `unit`, `integer`, and the 12 built-in `presets` |

## How layers combine

The rack starts from neutral values, applies the target's preset, then the target's explicit
parameters, then the listener's preset, then the listener's explicit parameters. A preset sets only
the parameters it defines; the others inherit. `clearEffects` returns a parameter to inheritance.
Editing a custom preset updates every target bound to it, listener variants included.

In a graph route the stages run in this order: source effects, the source-to-microphone path (for a
pickup), pickup or channel effects, connection effects, output effects, then the
speaker-to-listener path.

## Ownership

A target's rack has exactly one owner. The first resource that writes effects on a player target
(`spatial` or `direct`) owns it until it calls `resetEffects` or `releaseEffects`, stops, or the
player leaves. Other resources then get `voice_effect_target_claimed:<owner>` (also from
`getEffects`), naming the resource to coordinate with; effects from several resources are not
stacked. Channels, nodes and connections can only be given effects by the resource that owns them.

## Parameters

| Parameter | Range | Neutral | Unit |
|---|---|---|---|
| `gainDb` | −96 .. 12 | 0 | dB |
| `highPassHz` | 0 .. 20000 | 0 | Hz |
| `lowPassHz` | 20 .. 24000 | 24000 | Hz |
| `eqFrequencyHz` | 20 .. 20000 | 1000 | Hz (peaking EQ centre) |
| `eqGainDb` | −24 .. 24 | 0 | dB |
| `eqQ` | 0.1 .. 20 | 1 | Q |
| `distortionDrive` | 0 .. 1 | 0 | ratio |
| `distortionType` | 0 .. 4 (integer) | 1 | 0 off, 1 soft clip, 2 tanh, 3 exponential, 4 hard clip |
| `distortionTone` | 0 .. 1 | 0.5 | ratio (low-pass of the distorted signal) |
| `distortionMix` | 0 .. 1 | 0 | ratio (0 = no distortion) |
| `compressorThresholdDb` | −60 .. 0 | 0 | dB |
| `compressorRatio` | 1 .. 50 | 1 | ratio (1 = off) |
| `compressorAttackMs` | 0.1 .. 2000 | 10 | ms |
| `compressorReleaseMs` | 1 .. 2000 | 100 | ms |
| `compressorMakeupDb` | −24 .. 24 | 0 | dB |
| `gateThresholdDb` | −96 .. 0 | −96 | dB (−96 = open) |
| `gateAttackMs` | 0.1 .. 200 | 5 | ms |
| `gateReleaseMs` | 1 .. 2000 | 100 | ms |
| `pitchSemitones` | −24 .. 24 | 0 | semitones (does not preserve formants) |
| `tremoloDepth` | 0 .. 1 | 0 | ratio |
| `tremoloRateHz` | 0.02 .. 2000 | 5 | Hz (high rates give a ring-modulated, robotic sound) |
| `flangerMix` | 0 .. 1 | 0 | ratio |
| `flangerRateHz` | 0.002 .. 20 | 0.5 | Hz |
| `flangerDepthMs` | 0 .. 10 | 2 | ms |
| `flangerFeedback` | −0.95 .. 0.95 | 0 | ratio |
| `bitCrushBits` | 4 .. 24 (integer) | 24 | bits (24 = off) |
| `sampleHold` | 1 .. 64 (integer) | 1 | samples (sample-rate reduction) |
| `delayMix` | 0 .. 1 | 0 | ratio |
| `delayMs` | 1 .. 2000 | 300 | ms |
| `delayFeedback` | 0 .. 0.95 | 0 | ratio |
| `reverbMix` | 0 .. 1 | 0 | ratio |
| `reverbDecay` | 0.1 .. 10 | 1.5 | s |
| `reverbRoomSize` | 0 .. 1 | 0.5 | ratio |
| `reverbDamping` | 0 .. 1 | 0.5 | ratio |
| `reverbPreDelayMs` | 0 .. 500 | 20 | ms |
| `radioNoise` | 0 .. 1 | 0 | ratio |

An unknown name fails with `unknown_voice_effect:<name>`; a value outside its range, or a fraction
for an integer parameter, with `invalid_voice_effect:<name>`; a resulting `highPassHz` at or above
`lowPassHz` with `voice_effect_highpass_must_be_below_lowpass`. A rejected call changes nothing.

## Built-in presets

Each preset lists only what differs from neutral.

| Preset | Parameters |
|---|---|
| `clean` | neutral: removes a channel's compatibility colouring |
| `radio` | `highPassHz` 350, `lowPassHz` 3500, `eqFrequencyHz` 1600, `eqGainDb` 3, `distortionDrive` 0.25, `distortionMix` 0.2, `compressorThresholdDb` −22, `compressorRatio` 6, `compressorAttackMs` 4, `compressorMakeupDb` 3, `radioNoise` 0.025 |
| `walkieTalkie` | `highPassHz` 650, `lowPassHz` 2700, `distortionType` 3, `distortionDrive` 0.45, `distortionMix` 0.35, `compressorThresholdDb` −26, `compressorRatio` 8, `compressorMakeupDb` 4, `bitCrushBits` 10, `radioNoise` 0.05 |
| `phone` | `highPassHz` 300, `lowPassHz` 3400, `compressorThresholdDb` −20, `compressorRatio` 3, `compressorMakeupDb` 2 |
| `megaphone` | `highPassHz` 500, `lowPassHz` 4800, `eqFrequencyHz` 2300, `eqGainDb` 5, `eqQ` 1.5, `distortionType` 2, `distortionDrive` 0.5, `distortionMix` 0.4, `compressorThresholdDb` −18, `compressorRatio` 6, `reverbMix` 0.08 |
| `robot` | `pitchSemitones` −3, `tremoloDepth` 0.9, `tremoloRateHz` 55, `flangerMix` 0.25, `flangerRateHz` 0.3, `flangerFeedback` 0.4 |
| `helmet` | `highPassHz` 140, `lowPassHz` 5000, `eqFrequencyHz` 650, `eqGainDb` 4, `eqQ` 2, `compressorThresholdDb` −16, `compressorRatio` 3, `delayMix` 0.08, `delayMs` 18 |
| `underwater` | `lowPassHz` 750, `pitchSemitones` −2, `flangerMix` 0.18, `flangerRateHz` 1.2, `reverbMix` 0.15, `reverbDamping` 0.9 |
| `cave` | `reverbMix` 0.45, `reverbRoomSize` 0.9, `reverbDecay` 4, `reverbPreDelayMs` 40, `delayMix` 0.12, `delayMs` 240, `delayFeedback` 0.25 |
| `intercom` | `highPassHz` 250, `lowPassHz` 4200, `distortionDrive` 0.2, `distortionMix` 0.12, `compressorThresholdDb` −24, `compressorRatio` 5, `radioNoise` 0.015 |
| `disguise` | `pitchSemitones` −5, `eqFrequencyHz` 1100, `eqGainDb` −4, `flangerMix` 0.08 |
| `lofi` | `highPassHz` 100, `lowPassHz` 6500, `bitCrushBits` 10, `sampleHold` 3, `distortionDrive` 0.15, `distortionMix` 0.1 |

## Custom presets for Night City

Starting points to copy into `createPreset`. Tune them by ear: combine a preset with
`setEffects` while players talk, then save the values you like.

```lua
local v = Open77.voice
local PRESETS = {
    -- a cheap street-vendor speaker: narrow, crunchy, loud
    streetSpeaker = { highPassHz = 700, lowPassHz = 3800, distortionType = 4, distortionDrive = 0.6,
                      distortionMix = 0.5, compressorThresholdDb = -24, compressorRatio = 10, compressorMakeupDb = 4 },
    -- an Arasaka corporate PA: clean, compressed, a large lobby
    corpoPA = { highPassHz = 120, lowPassHz = 9000, compressorThresholdDb = -20, compressorRatio = 4,
                reverbMix = 0.25, reverbRoomSize = 0.85, reverbDecay = 2.6, reverbPreDelayMs = 35 },
    -- a netrunner's voice through a cyberdeck: digital, slightly pitched up
    netrunner = { pitchSemitones = 2, bitCrushBits = 12, sampleHold = 2, flangerMix = 0.15, flangerRateHz = 0.8 },
    -- a Maelstrom ganger with a voice modulator
    maelstrom = { pitchSemitones = -4, distortionType = 2, distortionDrive = 0.35, distortionMix = 0.3,
                  tremoloDepth = 0.35, tremoloRateHz = 70 },
    -- a gas mask: muffled, close and boxy
    gasMask = { highPassHz = 200, lowPassHz = 2600, eqFrequencyHz = 900, eqGainDb = 6, eqQ = 2.5,
                delayMix = 0.1, delayMs = 12 },
    -- a long-distance call on a bad line
    badLine = { highPassHz = 400, lowPassHz = 2800, bitCrushBits = 8, radioNoise = 0.08,
                gateThresholdDb = -48, compressorThresholdDb = -24, compressorRatio = 6 },
    -- a stadium announcer: echo off the stands
    stadium = { highPassHz = 150, compressorThresholdDb = -18, compressorRatio = 4,
                delayMix = 0.25, delayMs = 420, delayFeedback = 0.35, reverbMix = 0.3, reverbDecay = 3.5 },
}

local created = {}
for name, parameters in pairs(PRESETS) do
    created[name] = assert(v.createPreset(name, parameters))
end

assert(v.setPreset(v.spatial(playerId), created.gasMask))
assert(v.updatePreset(created.gasMask, { lowPassHz = 2200 }))   -- every user of gasMask follows
```

Custom presets belong to the resource that created them (64 at most) and disappear when it stops.

## Inspecting and resetting

```lua
local e = assert(v.getEffects(v.spatial(playerId)))
print(e.preset, e.overridden)              -- preset name or id, whether explicit parameters exist
for name, value in pairs(e.parameters) do print("override", name, value) end
print("final low-pass", e.resolved.lowPassHz)

v.clearEffects(v.spatial(playerId), { "pitchSemitones" })   -- drop one override, keep the preset
v.resetEffects(v.spatial(playerId), listenerId)             -- what one listener hears
v.resetEffects(v.spatial(playerId))                         -- every layer
v.releaseEffects(v.spatial(playerId))                       -- let another resource take it
```

## Channels and their compatibility colouring

A channel created with `createChannel({ effect = ... })` has a simple built-in colouring (band-pass,
distortion, noise, reverb; see [channels](voice-channels.md#the-channels-own-colouring)). Binding a
preset or effects to that channel replaces this colouring for the affected listeners. Start from
`"radio"` or `"phone"` when you want that sound, use `"clean"` to remove it, and `resetEffects` to
restore it. A listener-only override leaves the other listeners' colouring untouched.
