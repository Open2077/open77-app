# Local player visibility

Client Lua can hide the avatar seen on the player's own screen, including the
third-person double, with `Open77.players.setLocalPuppetVisible(visible)`.
Requires a client exposing both local-puppet visibility functions. Treat the API
as experimental and check that the functions exist on older clients. The
server visibility API is separate; no new server visibility call is required.

```lua
-- open77.lua
permissions { "players.local.visibility", "network.events" }

-- client.lua
RegisterNetEvent("disguise:visible", function(visible)
    local setVisible = Open77.players.setLocalPuppetVisible
    if not setVisible then
        print("Local avatar visibility is unavailable on this client")
        return
    end
    local ok, reason = setVisible(visible)
    if not ok then print(reason) end
end)
-- Your server sends false when the disguise starts and true when it ends.
```

The setter requires one strict boolean and returns `true` for an accepted
policy, or `false, reason`. Rendering follows on the game tick. The getter takes
no arguments and returns the combined resource policy, or `nil, reason`.
`true` means that no resource holds a hide; it does not force the camera into
third person or guarantee that a body is currently on screen.

Each resource instance owns its request. Calling `true`, stopping or reloading
a resource releases only its own hide. If another resource still requests
`false`, the avatar stays hidden. Death, player replacement and disconnect
release the local lifecycle's requests; reapply the disguise from your spawn
logic if appropriate. Initial script loading cannot mutate this state; use a
running callback or thread.

The native body, its held weapon and the third-person presentation are hidden
locally. The camera keeps its selected view and can switch FPP/TPP while the
hide is held. Movement and collision remain unchanged. This does not remove
gameplay effects or separately spawned props. It does not change what other
players see: server `Open77.players.setVisible(playerId, visible)` controls
that independently.

## Prop Hunt example

```lua
-- server.lua: add permission "players.life.visibility" to the manifest.
-- Call only after the server has validated and applied the disguise.
local function setDisguised(playerId, disguised)
    local ok, reason = Open77.players.setVisible(playerId, not disguised)
    if not ok then return false, reason end
    TriggerClientEvent("prophunt:localDisguise", playerId, disguised)
    return true
end

-- client.lua
RegisterNetEvent("prophunt:localDisguise", function(disguised)
    local setVisible = Open77.players.setLocalPuppetVisible
    if not setVisible then
        print("This client needs the local-puppet visibility update")
        return
    end
    local ok, reason = setVisible(not disguised)
    if not ok then print("Local disguise refused: " .. tostring(reason)) end
end)
```

Use the server's own disguise state to attach/show the prop. The local call
does not replicate a disguise or grant invisibility to other clients. A
successful server visibility change does not guarantee that an outdated client
supports the local call; enforce your minimum client version for the mode.

Errors include `expected_boolean`, `unexpected_arguments`,
`permission_denied:players.local.visibility`, `resource_not_running`,
`player_not_ready`, `visibility_owner_quota` and `game_unavailable_on_this_host`.
An owner may always release its existing request even while no player is ready.

## Function reference

See [setLocalPuppetVisible](/docs/api/client/open77-players#setlocalpuppetvisible)
and [isLocalPuppetVisible](/docs/api/client/open77-players#islocalpuppetvisible).
Custom bodies and vehicle cameras may require additional mode-specific checks.
