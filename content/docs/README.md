# CyberM resource documentation

CyberM turns Cyberpunk 2077 into a server-driven multiplayer platform. Gameplay and UI features are
packaged as **resources**: self-contained directories with a manifest, Lua scripts, declared
permissions, dependencies, and optional web interfaces.

Developers familiar with FiveM will recognize the client/server split, events, exports, commands,
and manifest-driven lifecycle. CyberM APIs remain independent and reflect REDengine constraints.

## Session model

The server selects the resource set for a session. A connecting client downloads that set, verifies
its signature and content hashes, and activates it before entering the world. Only CyberM's trusted
bootstrap resources load outside the server-provided generation.

The server is authoritative. Clients render approved state and submit bounded observations or
requests; they do not choose canonical loot, life, vehicle, time, weather, or routing state.

## Create a resource

A resource lives below the server's configured resource root and contains a `cyberm.lua` manifest:

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

    local state = CyberM.character.state()
    print(("spawned at %.1f, %.1f"):format(state.position.x, state.position.y))
end)
```

Server entry point:

```lua
RegisterCommand("hello", function(source, args)
    print(("player %d said hello"):format(source))
end, false)
```

Start the server, connect a client, and invoke `hello` from the CyberM developer console or chat.

## Guides

| Guide | Subject |
|---|---|
| [Server resources](server-resources.md) | Manifests, runtime separation, signing, download, and reload. |
| [Complete server Lua API](server-api.md) | Every server global, `CyberM.*` method, permission, constant, and low-level alias. |
| [Official resource exports](resource-exports.md) | Every client export exposed by the official Lua packages and how to call it safely. |
| [Game data reference](data-reference.md) | NPC templates, vehicle records, seats, flags, weapons, appearances, VFX, SFX, animations, and sprite catalogues. |
| [Identity and ACL](server-acl.md) | Authentication, restricted commands, and access control. |
| [Player identity](identity.md) | Durable identifiers, display names, and rename flow. |
| [Loot](loot.md) | Authoritative ground drops and pickup integration. |
| [Weather](weather.md) | Session time, weather presets, synchronization, and events. |
| [Vehicles](vehicles.md) | Identity, streaming, authority leases, seats, and Lua APIs. |
| [NPCs](npcs.md) | Implemented server-owned NPCs, templates, streaming, task queues, authority leases, life, events, and Lua APIs. |
| [Contextual interactions](interactions.md) | Custom world/NPC prompts, action keys, projection, ownership, and server-safe integration. |
| [Notifications](notifications.md) | Reusable WebUI toasts, client/server exports, queues, positions, progress, and ownership. |
| [Elevators](elevators.md) | Implemented server-authoritative native lifts, bucket/chunk streaming, late join, ACL commands, and Lua APIs. |
| [Blips](blips.md) | Vanilla map markers, entity attachment, and sprites. |
| [Visual and audio effects](effects.md) | Resource-owned world/entity VFX and spatialised SFX. |
| [Privileged debug runtime](debug-runtime.md) | ACL-targeted client Lua execution, native lab commands, and REDscript bridge probes. |
| [Chat](chat.md) | Messages, slash commands, completion, and resource integration. |
| [Clipboard](clipboard.md) | Write-only client clipboard API and the `/pos` and `/rot` transform commands. |
| [Client persistent KVP](client-kvp.md) | Endpoint- and resource-isolated local key/value persistence, search, atomic operations, and quotas. |

## API reference coverage

CyberM has three deliberately separate Lua surfaces. The wiki covers all three without implying
that a server method exists in a client VM or that a package export is a native:

| Surface | Reference | Coverage |
|---|---|---|
| Client native runtime | The **CLIENT** API reference cards in `index.html` | 215 registered functions across 37 namespaces; every signature is reviewed and every card has a detailed description. |
| Dedicated server runtime | The **SERVER · CyberM.vehicles** cards and [Complete server Lua API](server-api.md) | All 43 authoritative vehicle methods are individually searchable cards; the complete guide covers every server global, `CyberM.*` namespace, constant, permission, and result shape. |
| Official client packages | [Official resource exports](resource-exports.md) | Every literal export currently published by the official resource tree: 59 exports across 13 packages. |

Generated cards are separated by runtime, so identical names such as `CyberM.vehicles.get` cannot
confuse a client projection with server authority. They state whether a call is shared, needs a
live game instance, or uses the network backend, and document permissions, ownership, generation
lifetime, and failure values.

Run both documentation checks after changing a binding or export:

```powershell
python wiki/tools/extract-api.py --json
python wiki/tools/audit-api.py
```

The generator fails when a registered client function has no verifiable handler body or detailed
description. It also compares the 43 server vehicle cards with the real embedded Lua bootstrap, so
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

CyberM-owned documentation and code follow the repository [license](../LICENSE). Third-party names,
game data, and dependencies remain subject to their respective terms.
