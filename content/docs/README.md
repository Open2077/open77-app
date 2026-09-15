# Open77 resource documentation

Open77 turns Cyberpunk 2077 into a server-driven multiplayer platform. Gameplay and UI features are
packaged as **resources**: self-contained directories with a manifest, Lua scripts, declared
permissions, dependencies, and optional web interfaces.

Developers familiar with FiveM will recognize the client/server split, events, exports, commands,
and manifest-driven lifecycle. Open77 APIs remain independent and reflect REDengine constraints.

## Session model

New building blocks: [player checks and controls](player-utilities.md) and
[package audio, local and networked](package-audio.md).

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

New client utilities: [screen picking](screen-picking.md) and the reusable
[ALT/click context menu](context-menu.md).

| Guide | Subject |
|---|---|
| [Hacking and counterplay](hacking.md) | Short Circuit, Self-ICE, active/ally purge, server authority, public definitions and an optional lab. |
| [Ground Slam / Quake](ground-slam.md) | Native grounded/airborne slam, server-owned impact validation and permission-controlled session grants. |
| [Server resources](server-resources.md) | Manifests, runtime separation, signing, download, and reload. |
| [Hub resources in Warden](community-hub-warden.md) | Reviewed installation, updates, uninstall, rollback, preload restarts and retained backups. |
| [Mods: the complete guide](mods.md) | The three layers (stack, world, own), the life of a world mod from server to game folder, declaring packages, a Nexus vehicle walkthrough, verification and troubleshooting. |
| [Mods your server requires](server-mods.md) | The operator's reference for the same feature: trust, hosting the bytes, the master's hash vouching, Warden and review. |
| [Sky hologram advertisements](sky-advertising.md) | Build PNG/DDS art into Towers-of-Light XBM replacers and preload it from a resource. |
| [Complete server Lua API](server-api.md) | Every server global, `Open77.*` method, permission, constant, and low-level alias. |
| [FiveM compatibility aliases](fivem-compatibility.md) | The `Citizen` table, `SetTick`, `promise.new`, and the shared-script helpers a copied FiveM resource calls -- plus the three places Open77 deliberately answers differently. |
| [Dash / Air Dash](dash.md) | Native ground and air dash as a session grant: define, grant, the key, charges, stamina, cooldown and the optional parkour example. |
| [Connection control](connection-control.md) | Connect events and deferrals, refusing a player with a message, rejection and disconnect reasons, the built-in whitelist and ban list (Warden, console, `Open77.access`), and worked custom resources. |
| [World queries](world-queries.md) | Client raycast, aim ray, ground height and the object search around the player (`world.query`), plus an entity's own axes, offsets and slots (`world.transform`). |
| [Replicated state bags](state-bags.md) | `Open77.state.global` / `.player(id)` / `.entity(kind, id)` and the `Player(id).state` / `Entity(id).state` / `GlobalState` / `LocalPlayer.state` shims: keyed state that replicates itself, change handlers, the caps, and why a client submits instead of writing. |
| [Players around you (client)](client-players.md) | Client enumeration: who this client can see, the player id <-> body mapping, proximity and closest -- and why this roster is not the server's. |
| [Travel](travel.md) | Moving the local player and knowing when the body has really arrived: the settle watch, why a plain teleport can silently land somebody kilometres away, noclip and the map pick. |
| [Vectors and quaternions](vectors.md) | `vector2`/`vector3`/`vector4`/`vec`/`quat` on both runtimes: arithmetic, `#(a - b)`, swizzles, distance and lerp, the "plain tables still work" guarantee, and what crosses the network. |
| [Official resource exports](resource-exports.md) | Every client export exposed by the official Lua packages and how to call it safely. |
| [Cross-resource server exports](server-exports.md) | Publish and call asynchronous server services with caller identity, isolated data, permissions and safe reload behavior. |
| [Network callbacks](callbacks.md) | Ask the other side a question and await the answer: `Open77.net.call` / `callClient`, per-resource namespacing, timeouts, limits, failure reasons, and why a callback is still only a request. |
| [Game data reference](data-reference.md) | NPC templates, vehicle records, seats, flags, weapons, appearances, VFX, SFX, animations, and sprite catalogues. |
| [Identity and ACL](server-acl.md) | Authentication, restricted commands, and access control. |
| [Player identity](identity.md) | Durable identifiers, display names, and rename flow. |
| [Equipment Lua API](../docs/equipment.md) | Validated wardrobe catalogue, local/server APIs, permissions, errors, and appearance replication. |
| [Perspective](../docs/perspective.md) | First and third person: the ownership arbiter, the server policy, the player's key and persisted preference. |
| [Photo mode](photo-mode.md) | Exclusive client-resource control of the native photo mode; stock shortcuts are disabled. |
| [Weapon Lua API](weapons-api.md) | Assign standard weapons by TweakDB template, select slots, holster, clear every slot, snapshot, and read the server's synchronous weapon cache. |
| [Game data catalogues](data-catalogues.md) | `Open77.data.vehicle/weapon/item/npc/localize` on both runtimes: display names, classes, seats and qualities from a record string -- live TweakDB on the client, a shipped catalogue on the server, and the measurement behind that split. |
| [Player health and stamina](player-stats.md) | Shared client/server reads, server-only setters, maximums, regeneration, and synchronization semantics. |
| [Freezing a player](player-freeze.md) | Server-authoritative and client-local holds on the player's body: the engine restriction used, exactly what a freeze does and does not stop, cooperative claims, and every release path. |
| [Blue holocall eyes](holocall-eyes.md) | Native blue eye glow, server-owned Lua leases, duration, lifecycle and multiplayer presentation. |
| [Cyberware framework](cyberware.md) | Persistent implants, permissions, transactions, temporary loadouts and native projection. |
| [Gorilla Arms](gorilla-arms.md) | Build native arm grades, self-service installation, charge effects, clinics and practice arenas. |
| [Loot](loot.md) | Authoritative ground drops and pickup integration. |
| [Weather](weather.md) | Session time, weather presets, synchronization, and events. |
| [Vehicles](vehicles.md) | Identity, streaming, authority leases, seats, and Lua APIs. |
| [Vehicle AI](vehicle-ai.md) | Autonomous driving, routes, entity following, NPC drivers and authoritative task events. |
| [Native map](native-map.md) | Player waypoints, map lifecycle, marker selection and non-travel point picking. |
| [Armed vehicle spawn catalogue](armed-vehicles.md) | Exact spawn IDs, mounted-weapon profiles, verified examples, and the complete 2.31 record inventory. |
| [Vehicle weapon Lua API](vehicle-weapons.md) | Client armament queries: mounted/selected weapons, native ammo, heat, trigger mode and turret aim. |
| [Vehicle paint](vehicle-paint.md) | Server-authoritative RGB paint, cross-resource controls, replication, events, and native limitations. |
| [NPCs](npcs.md) | Implemented server-owned NPCs, templates, streaming, task queues, authority leases, life, events, and Lua APIs. |
| [NPC AI, combat and voice](npc-behavior.md) | Server control of one spawned NPC's behavior policy: AI, combat, perception and voice, and what it deliberately does not reach. |
| [NPC record catalogue](npc-catalogue.md) | The 6,582 `Character.*` records of 2.31, searchable. A discovery index, not a spawn allowlist. |
| [Contextual interactions](interactions.md) | Custom world/NPC prompts, action keys, projection, ownership, and server-safe integration. |
| [Synchronized attachments](attachments.md) | Props on player bones or vehicles, local transforms, ownership, streaming and lifecycle cleanup. |
| [Player interactions](player-interactions.md) | Reserved two-player actions, consent, synchronized presentation and server-owned completion. |
| [Key mappings and device input](keybindings.md) | The `RegisterKeyMapping` engine primitive: named rebindable actions, press/hold callbacks, the pause KEY BINDINGS tab, and machine-global persistence -- plus reading the mouse, the wheel, a gamepad and the cursor directly. |
| [Proximity zones](zones.md) | Client-side enter/exit hysteresis and the server-side re-validation every caller must apply. |
| [World-anchored POIs](worldui.md) | The marker-plus-prompt facade: one owned handle, transactional creation and cleanup. |
| [The gamemode kernel](gamemode-kernel.md) | Shared server services through exports, local state-machine conventions, and why the scaffolder remains useful. |
| [Deathmatch](deathmatch.md) | The shipped free-for-all and arena mode: instances, loadouts, bots, scoring and the operator surface. |
| [Cordon](cordon.md) | The 64-player battle royale: the closing block cordon, squads and revive at the body, ground loot, bots as contestants, the tunables and what is measured versus designed. |
| [The UI kit](ui-kit.md) | Progress bars, text hints, alerts, input forms, context menus, keyboard menus and radials: the promise shape, the cancellation contract, the focus release matrix, the styling tokens a resource may override, the server twins -- and asking whether any menu, Open77's or the game's, is on screen. |
| [Notifications](notifications.md) | Reusable WebUI toasts, client/server exports, queues, positions, progress, and ownership. |
| [Elevators](elevators.md) | Implemented server-authoritative native lifts, bucket/chunk streaming, late join, ACL commands, and Lua APIs. |
| [Networked doors](doors.md) | Dynamic discovery, automatic and elevator landing doors, server authority, access rules, and Lua exports. |
| [Blips](blips.md) | Vanilla map markers, entity attachment, sprites, and the range gate. |
| [Vanilla device prompts](device-interactions.md) | Turning a vending machine's, ATM's or terminal's own prompt off so a resource can put its own there: the one scripted choke point every device passes through, why `GetActions` is the wrong gate, naming a device by id or by class, the ownership rule, `open77:deviceUsed`, and the server-declared policy. |
| [Blips](blips.md) | Vanilla map markers, entity attachment, and sprites. |
| [Vanilla HUD visibility](hud-visibility.md) | Client API for minimap, compass, clock, health, stamina, weapons/ammo, speed, and custom-HUD replacement. |
| [Blocking player input](input-blocking.md) | Taking a named input away from the player and giving it back: the curated vocabulary, the five mechanisms behind it, what this engine cannot block and why, per-resource ownership and the release rule. |
| [Scripted cameras](cameras.md) | Put the view where a resource wants it: world position, look-at, attachment, blended activation, shake and `unproject` -- plus the ownership rule, every path that gives the view back, and exactly what this engine will not give a camera. |
| [Third person](perspective.md) | The playable third-person view: the player's key, server policy, the states that hand the view back, reading the player's aim and what it is on, and the measured limitations. |
| [RP animations](rp-animations.md) | Synchronized actions, forced local TPP, client/server Lua APIs, commands, ownership and cancellation. |
| [RP animation catalogue](rp-animation-catalogue.md) | All 12 profiles and 70 selectable clips, prop/placement requirements and validation status. |
| [The role-play kit](rp-kit.md) | `open77_rp_basics`: cuff, escort and search as server exports, the leash an escort really is, the authority that stops a griefer, the twelve ways a hold ends -- and why carry refuses on this build. |
| [World props](props.md) | Server-authoritative props and lights: models, streaming, buckets, ownership, and the client projection. |
| [Visual and audio effects](effects.md) | Client-local world/entity VFX and spatialised SFX, and the server-replicated effect registry. |
| [Resource audio](sound.md) | Playing an audio file your resource ships: 2D and world-spatial with HRTF falloff, the client exports and server twins, the caps and lifetime rules, and the honest list of what it is not. |
| [Native screen transitions](screen-transitions.md) | Client Lua fades to black/color, native completion events, resource ownership, cancellation and recovery. |
| [Privileged debug runtime](debug-runtime.md) | ACL-targeted client Lua execution, native lab commands, and REDscript bridge probes. |
| [Autonomous agent testing](agent-testing.md) | The MCP server and skill that let an AI agent drive the real game: stack, connection, tools, scenarios, and safety rules. |
| [Chat](chat.md) | Messages, slash commands, completion, and resource integration. |
| [Clipboard](clipboard.md) | Write-only client clipboard API and the `/pos` and `/rot` transform commands. |
| [Client persistent KVP](client-kvp.md) | Endpoint- and resource-isolated local key/value persistence, search, atomic operations, and quotas. |
| [Integrated voice chat](voice.md) | Native Opus VOIP, proximity/radio/phone channels, Lua APIs, pause settings, lipsync state, and speaker nameplates. |
| [Voice lipsync](voice-lipsync.md) | Voice-driven male/female mouths, local/F7 and remote players, client Lua controls, resource ownership and diagnostics. |

## API reference coverage

Open77 has three deliberately separate Lua surfaces. The wiki covers all three without implying
that a server method exists in a client VM or that a package export is a native:

| Surface | Reference | Coverage |
|---|---|---|
| Client native runtime | The **CLIENT** API reference cards in `index.html` | 443 functions across 59 namespaces, host registrations and the globals the client's Lua preludes define alike; every signature is reviewed and every card has a detailed description. |
| Dedicated server runtime | The **SERVER** cards in `index.html` and [Complete server Lua API](server-api.md) | 413 functions across 43 namespaces, read from the Lua prelude the server executes: the 64 authoritative vehicle methods and 12 vehicle-AI methods as individually reviewed cards, plus every other `Open77.*` namespace, the `Open77.Promise` and `Open77.EventVerdict` handle types, and the scheduler, event and JSON globals. The guide adds the narrative, the permission tables and the 119 low-level host globals. |
| Official client packages | [Official resource exports](resource-exports.md) | 129 of the 151 literal client exports the official resource tree publishes, across 25 of its 30 packages. The automated gate reaches the packages directly below `resources/`; the nested trees are not yet gated. |

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
description. It also compares the 64 server vehicle cards with the real embedded Lua bootstrap, so
adding or removing a method cannot silently leave the searchable reference incomplete. Both
runtimes are read twice over: the host registrations, and the Lua preludes each runtime executes.
A global a prelude defines -- `vector3`, `TriggerLocalEvent`, `Open77.net.callAwait` -- is
therefore a card like any other, and cannot go missing without the build saying so.

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
