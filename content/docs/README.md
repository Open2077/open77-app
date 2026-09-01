# Open77 resource documentation

Open77 turns Cyberpunk 2077 into a server-driven multiplayer platform. Gameplay and UI features are
packaged as **resources**: self-contained directories with a manifest, Lua scripts, declared
permissions, dependencies, and optional web interfaces.

Developers familiar with FiveM will recognize the client/server split, events, exports, commands,
and manifest-driven lifecycle. Open77 APIs remain independent and reflect REDengine constraints.

## Session model

The server selects the resource set for a session. A connecting client downloads that set, verifies
its signature and content hashes, and activates it before entering the world. Only Open77's trusted
bootstrap resources load outside the server-provided generation.

The server is authoritative. Clients render approved state and submit bounded observations or
requests; they do not choose canonical loot, life, vehicle, time, weather, or routing state.

## Create a resource

A resource lives below the server's configured resource root and contains a `open77.lua` manifest:

```lua
resource "hello"
version "1.0.0"
auto_start true

client_script "client/main.lua"
server_script "server/main.lua"
```

Client entry point:

```lua
AddEventHandler("onClientResourceStart", function(name)
    if name ~= GetCurrentResourceName() then return end

    local state = Open77.character.state()
    print(("spawned at %.1f, %.1f"):format(state.position.x, state.position.y))
end)
```

Server entry point:

```lua
RegisterCommand("hello", function(source, args)
    print(("player %d said hello"):format(source))
end, false)
```

Start the server, connect a client, and invoke `hello` from the Open77 developer console or chat.

## Guides

| Guide | Subject |
|---|---|
| [Server resources](server-resources.md) | Manifests, runtime separation, signing, download, and reload. |
| [Complete server Lua API](server-api.md) | Every server global, `Open77.*` method, permission, constant, and low-level alias. |
| [Official resource exports](resource-exports.md) | Every client export exposed by the official Lua packages and how to call it safely. |
| [Game data reference](data-reference.md) | NPC templates, vehicle records, seats, flags, weapons, appearances, VFX, SFX, animations, and sprite catalogues. |
| [Identity and ACL](server-acl.md) | Authentication, restricted commands, and access control. |
| [Player identity](identity.md) | Durable identifiers, display names, and rename flow. |
| [Clothing Lua API](../docs/clothing.md) | Validated wardrobe catalogue, local/server APIs, permissions, errors, and appearance replication. |
| [Perspective](../docs/perspective.md) | First and third person: the ownership arbiter, the server policy, the player's key and persisted preference. |
| [Weapon Lua API](weapons-api.md) | Assign standard weapons by TweakDB template, select slots, holster, snapshot, and target a player from the server. |
| [Loot](loot.md) | Authoritative ground drops and pickup integration. |
| [Weather](weather.md) | Session time, weather presets, synchronization, and events. |
| [Vehicles](vehicles.md) | Identity, streaming, authority leases, seats, and Lua APIs. |
| [NPCs](npcs.md) | Implemented server-owned NPCs, templates, streaming, task queues, authority leases, life, events, and Lua APIs. |
| [Contextual interactions](interactions.md) | Custom world/NPC prompts, action keys, projection, ownership, and server-safe integration. |
| [Proximity zones](zones.md) | Client-side enter/exit hysteresis and the server-side re-validation every caller must apply. |
| [World-anchored POIs](worldui.md) | The marker-plus-prompt facade: one owned handle, transactional creation and cleanup. |
| [The gamemode kernel](gamemode-kernel.md) | Why there is no shared server-side gamemode resource, and the roster/state-machine conventions every mode's server implements instead. |
| [Notifications](notifications.md) | Reusable WebUI toasts, client/server exports, queues, positions, progress, and ownership. |
| [Elevators](elevators.md) | Implemented server-authoritative native lifts, bucket/chunk streaming, late join, ACL commands, and Lua APIs. |
| [Blips](blips.md) | Vanilla map markers, entity attachment, and sprites. |
| [Third person](perspective.md) | The playable third-person view: the player's key, server policy, the states that hand the view back, and the measured limitations. |
| [World props](props.md) | Server-authoritative props and lights: models, streaming, buckets, ownership, and the client projection. |
| [Visual and audio effects](effects.md) | Client-local world/entity VFX and spatialised SFX, and the server-replicated effect registry. |
| [Privileged debug runtime](debug-runtime.md) | ACL-targeted client Lua execution, native lab commands, and REDscript bridge probes. |
| [Autonomous agent testing](agent-testing.md) | The MCP server and skill that let an AI agent drive the real game: stack, connection, tools, scenarios, and safety rules. |
| [Chat](chat.md) | Messages, slash commands, completion, and resource integration. |
| [Clipboard](clipboard.md) | Write-only client clipboard API and the `/pos` and `/rot` transform commands. |
| [Client persistent KVP](client-kvp.md) | Endpoint- and resource-isolated local key/value persistence, search, atomic operations, and quotas. |
| [Integrated voice chat](voice.md) | Native Opus VOIP, proximity/radio/phone channels, Lua APIs, pause settings, lipsync state, and speaker nameplates. |

## API reference coverage

Open77 has three deliberately separate Lua surfaces. The wiki covers all three without implying
that a server method exists in a client VM or that a package export is a native:

| Surface | Reference | Coverage |
|---|---|---|
| Client native runtime | The **CLIENT** API reference cards in `index.html` | 266 registered functions across 41 namespaces; every signature is reviewed and every card has a detailed description. |
| Dedicated server runtime | The **SERVER · Open77.vehicles** cards and [Complete server Lua API](server-api.md) | All 48 authoritative vehicle methods are individually searchable cards, while the complete guide covers all 71 low-level globals plus every `Open77.*` namespace, including voice policy. |
| Official client packages | [Official resource exports](resource-exports.md) | Every literal client export currently published by the official resource tree: 105 exports across 20 packages. |

Generated cards are separated by runtime, so identical names such as `Open77.vehicles.get` cannot
confuse a client projection with server authority. They state whether a call is shared, needs a
live game instance, or uses the network backend, and document permissions, ownership, generation
lifetime, and failure values.

Run both documentation checks after changing a binding or export:

```powershell
python wiki/tools/extract-api.py --json
python wiki/tools/audit-api.py
```

The generator fails when a registered client function has no verifiable handler body or detailed
description. It also compares the 48 server vehicle cards with the real embedded Lua bootstrap, so
adding or removing a method cannot silently leave the searchable reference incomplete.

## API conventions

### Engine IDs are opaque

REDengine identifiers are 64-bit values and may not be exactly representable as Lua numbers. Store,
compare, and return them unchanged. Do not pass them through `tonumber`.

### Failures are values

Most APIs return `value` on success or `nil, reason` on failure. Callers can distinguish an invalid
request from a temporarily unavailable subsystem without wrapping every call in `pcall`.

### Permissions are explicit

Guarded APIs require manifest permissions:

```lua
permissions { "network.events", "world.loot" }
```

Request only the capabilities the resource needs.

### Client and server runtimes are separate

`server_script` files never reach a player's machine. `client_script` files are distributed in the
signed resource set, and `shared_script` files execute in both runtimes. Secrets and authoritative
decisions belong exclusively in server code.

## License

Open77-owned documentation and code follow the repository [license](../LICENSE). Third-party names,
game data, and dependencies remain subject to their respective terms.
