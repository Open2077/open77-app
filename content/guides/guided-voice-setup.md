# Guided voice setup API

Use `Open77.voice.setup(operation, payload?)` from **client Lua** to build a microphone setup step inside your server's onboarding or settings interface. It shares device selection, volumes, activation settings and the keyboard/mouse push-to-talk binding with the pause menu.

Use client **2.31.21+op77.141 or later**, a configured [voice service](voice.md) and the `voice.client` permission. The trusted `open77_pause` bootstrap package owns the saved preferences. Do not declare it as a server resource dependency or call its exports directly; `Open77.voice.setup` provides the supported bridge.

## Design the setup flow

| Step | Interface behavior | API |
| --- | --- | --- |
| Welcome | Explain what will be configured. Offer **Skip** and, when already configured, **Keep my settings**. | `begin`; read `configured`. |
| Devices | Select microphone and output device. Offer Windows communications defaults and a refresh button. | `set`, `refresh` |
| Microphone | Enable capture, show a live meter and adjust input gain. Ask the player to speak. | `set`, periodic `status` |
| Activation | Choose push-to-talk or voice activation. Capture a keyboard key or mouse button; expose the activation threshold when needed. | `set` |
| Playback | Let the player start/stop local microphone playback and confirm they can hear themselves. | `test` |
| Finish | Save the completion flag, or leave the guide without marking it complete. | `complete` or `end` |

Keep Skip available throughout. A player who does not want voice should still be able to continue onboarding. Store skipped/completed tutorial progress separately from voice preferences.

`configured` is a saved preference for the authenticated server endpoint. It does not prove that the current microphone works, that the player spoke, or that a new device was tested. Offer reconfiguration even when it is true.

## Open and maintain a setup session

```lua
-- open77.lua
resource 'my_voice_guide'
client_script 'client.lua'
permissions { 'voice.client' }
```

`begin` acquires a session owned by the calling resource. Only one resource can hold it at a time. It temporarily disables voice activation and stops current transmission. The player's chosen activation mode and threshold are restored when the session ends.

The session expires after **three seconds without a call**. Poll `status` every 250–1000 ms while the guide is open to update the meter and renew it. When the interface closes, stop polling and call `end`; expiry is a fallback for interrupted consumers.

This client helper keeps the session alive and exposes snapshots to your UI bindings:

```lua
-- client.lua
VoiceGuide = { active = false, snapshot = nil, error = nil }

function VoiceGuide.begin()
    if not (Open77.voice and type(Open77.voice.setup) == 'function') then
        return nil, 'voice_setup_unavailable'
    end
    local snapshot, reason = Open77.voice.setup('begin')
    if not snapshot then
        Open77.voice.setup('end')
        return nil, reason
    end
    VoiceGuide.active = true
    VoiceGuide.snapshot, VoiceGuide.error = snapshot, nil
    return snapshot
end

function VoiceGuide.update(operation, payload)
    if not VoiceGuide.active then return nil, 'voice_setup_closed' end
    if operation ~= 'set' and operation ~= 'test' and operation ~= 'refresh'
        and operation ~= 'status' then
        return nil, 'unknown_voice_operation'
    end
    local snapshot, reason = Open77.voice.setup(operation, payload)
    VoiceGuide.error = reason
    if snapshot then VoiceGuide.snapshot = snapshot end
    return snapshot, reason
end

function VoiceGuide.close(completed)
    if not VoiceGuide.active then return true end
    local operation = completed and 'complete' or 'end'
    local ok, reason = Open77.voice.setup(operation)
    if not ok and completed then
        VoiceGuide.error = reason
        return nil, reason -- Keep the session alive so the UI can retry or skip.
    end
    VoiceGuide.active, VoiceGuide.snapshot = false, nil
    VoiceGuide.error = reason
    return ok, reason
end

CreateThread(function()
    while true do
        Wait(500)
        if VoiceGuide.active then
            local snapshot, reason = VoiceGuide.update('status')
            if not snapshot then
                VoiceGuide.close(false)
                VoiceGuide.error = reason
            end
        end
    end
end)

AddEventHandler('onClientResourceStop', function(name)
    if name == GetCurrentResourceName() then VoiceGuide.close(false) end
end)
```

Connect your interface's open action to `VoiceGuide.begin()`. Render its returned snapshot, then forward updated `VoiceGuide.snapshot` values through your existing UI bridge. Display returned errors instead of assuming a setting was accepted. Closing the interface, skipping the step or leaving onboarding must call `VoiceGuide.close(false)`; **Finish** calls `VoiceGuide.close(true)` and advances only on success.

## Operations

| Operation | Payload | Result |
| --- | --- | --- |
| `begin` | None | Acquire or renew this resource's session, refresh devices, return a snapshot. |
| `status` | None | Renew the session and return a fresh snapshot. |
| `refresh` | None | Refresh the device catalog and return a snapshot. |
| `set` | `{ name = settingName, value = value }` | Apply and persist a setting; return a snapshot. |
| `test` | Boolean | Start (`true`) or stop (`false`) local microphone playback; return a snapshot. |
| `complete` | None | Persist `voice.setupComplete=true`, stop playback, release the session; return `true`. |
| `end` | None | Stop playback and release this resource's session; return `true`. Safe to repeat. |

Failures return `nil, reason`. Call `begin` before `status`, `refresh`, `set`, `test` or `complete`. Calling `end` without owning a session does not close another resource's session.

Settings are persisted as they change. **Skip and `end` keep those changes**; they are not a rollback. They do not mark setup complete or clear an existing completion flag. If saving completion fails, the session stays open so the interface can retry or skip.

## Editable settings

Use the exact setting names and value types below:

| `name` | `value` | Meaning |
| --- | --- | --- |
| `InputDevice` | String endpoint ID | Microphone; `""` selects the Windows communications default. |
| `OutputDevice` | String endpoint ID | Playback device; `""` selects the Windows communications default. |
| `InputVolume` | Number `0..200` | Microphone gain in percent. |
| `OutputVolume` | Number `0..200` | Voice playback gain in percent. |
| `CaptureEnabled` | Number `0` or `1` | Disable or enable microphone capture. |
| `VoiceActivation` | Number `0` or `1` | Use push-to-talk or voice activation after setup ends. |
| `VoiceActivationThreshold` | Number `0..100` | Activation threshold in percent. |
| `PushToTalkKey` | Supported key name string | Shared keyboard or mouse push-to-talk binding. |

`CaptureEnabled` and `VoiceActivation` take numeric `0`/`1`, not Lua booleans. Device selection takes an endpoint `id` from the snapshot, not its display name or array index.

For example, after opening the session, a user selecting the default microphone would call:

```lua
local snapshot, reason = VoiceGuide.update('set', {
    name = 'InputDevice', value = '',
})
if not snapshot then print('Microphone selection failed: ' .. tostring(reason)) end
```

The setter uses percentage units while the snapshot uses normalized gains and thresholds: `InputVolume=100` is returned as `inputVolume=1.0`; `VoiceActivationThreshold=40` is returned as `threshold=0.4`. Multiply snapshot values by 100 when displaying percentage controls.

### Keyboard and mouse push-to-talk

```lua
local snapshot, reason = VoiceGuide.update('set', {
    name = 'PushToTalkKey', value = 'MOUSE4',
})
if not snapshot then print('Binding failed: ' .. tostring(reason)) end
```

Supported names are `A`–`Z`, `0`–`9`, `F1`–`F12`, `MOUSE1`–`MOUSE5`, and `SPACE`, `ENTER`, `RETURN`, `TAB`, `SHIFT`, `CTRL`, `CONTROL`, `ALT`, `CAPSLOCK`, `BACKSPACE`, `INSERT`, `DELETE`, `HOME`, `END`, `PAGEUP`, `PAGEDOWN`, `UP`, `DOWN`, `LEFT`, `RIGHT`. Names are trimmed and normalized to uppercase. Escape and mouse-wheel directions are not bindable through this API.

For a WebUI capture control, translate browser mouse buttons explicitly:

| `MouseEvent.button` | Binding |
| --- | --- |
| `0` — left | `MOUSE1` |
| `1` — middle | `MOUSE3` |
| `2` — right | `MOUSE2` |
| `3` — back | `MOUSE4` |
| `4` — forward | `MOUSE5` |

Ignore the click that opens the binding control, suppress default mouse actions while capturing and let Escape cancel capture. Convert keyboard events to supported names (`N`, not the browser code `KeyN`). Show the returned `key` after success; the setter synchronizes the same binding used by the voice resource and pause menu.

## Read the snapshot

| Fields | Type / units | Use |
| --- | --- | --- |
| `available`, `captureEnabled` | Boolean | Voice availability and capture toggle. |
| `inputs`, `outputs` | Arrays of `{ id, name }` | Available endpoints, including a default entry with `id=""`. |
| `inputDevice`, `outputDevice` | String | Selected endpoint IDs. |
| `inputVolume`, `outputVolume` | Number `0..2` | Gains; multiply by 100 for percent. |
| `level` | Number `0..1` | Live input meter. |
| `activation` | Boolean | Selected activation mode to restore after setup. |
| `threshold` | Number `0..1` | Activation threshold on the same scale as the meter. |
| `testing`, `transmitting` | Boolean | Local playback and current transmission state. |
| `captureState` | Native status value | Capture diagnostics. |
| `key` | String | Normalized push-to-talk binding. |
| `configured` | Boolean | Completion preference saved for this server endpoint. |
| `distance` | Number, metres | Current proximity range; read-only server policy. |

During setup, `activation` represents the user's chosen mode even though activation is temporarily disabled. Voice routing, proximity policy, radio and phone membership remain controlled by the server; setup does not modify them.

## Test playback and handle exit

Microphone capture must be enabled before `test(true)`. Show meter activity and let the player explicitly start playback. Ask them to confirm they hear their voice before completing the step; the API does not perform an automatic sound-quality assessment.

```lua
-- Run on the matching UI actions while the setup session is open.
local started, reason = VoiceGuide.update('test', true)
if not started then print('Playback failed: ' .. tostring(reason)) end

-- On Stop playback:
VoiceGuide.update('test', false)

-- On Finish: check the result before advancing onboarding.
local completed, completionReason = VoiceGuide.close(true)
if not completed then print('Setup could not finish: ' .. tostring(completionReason)) end
```

These calls belong to separate button handlers, not one sequential playback routine. Local testing uses `test`; do not start network transmission to hear the microphone. Changing `InputDevice` stops playback, so reset any previous listening confirmation when the player changes microphones.

Always end setup on UI close, skip, chapter change or resource stop. Stop the heartbeat too: continuing to poll after hiding the interface keeps its session alive. Without a heartbeat, the three-second expiry and periodic watchdog stop playback and restore activation settings.

## Errors and fallback

| Reason | Interface behavior |
| --- | --- |
| `permission_denied:voice.client` | Fix the calling resource's manifest permission. |
| `voice_setup_unavailable`, `voice_unavailable` | Offer Skip and the normal pause-menu voice settings; retry once the voice service is ready. |
| `voice_setup_busy` | Another resource owns setup. Let it finish or offer to retry later. |
| `voice_setup_closed` | The session expired or was closed. Stop the current flow and begin again when the player requests it. |
| `invalid_voice_setting`, `invalid_voice_value`, `invalid_voice_device`, `invalid_voice_key` | Check the payload shape, type and range. |
| `unknown_voice_setting`, `unknown_voice_operation` | Use the documented, case-sensitive names. |
| `unsupported_push_to_talk_key` | Ask for a supported keyboard key or mouse button. |
| `push_to_talk_sync_failed` | Keep the existing binding visible and allow retry once the voice resource/connection is ready. |
| `preference_not_saved:<reason>` | Show the save failure; do not report completion. |

Device and playback failures can also return readable text, such as “Device unavailable. Refresh the device list.” or “Enable your microphone before testing.” Display the reason and provide the appropriate retry, refresh or capture control. On older clients where `Open77.voice.setup` is absent, keep onboarding usable with Skip and a link or instruction to open **Settings → Voice**.

For lower-level capture, channels and server policy, see [Voice chat](voice.md). For character mouth animation, see [Voice lipsync](voice-lipsync.md).
