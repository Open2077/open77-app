# Lua resources loaded by the server

Package server and client Lua scripts, permissions, dependencies and web assets in an Open77 resource. The server loads the declared resources and distributes their client files to joining players.

Use this guide to write a resource, understand what reaches the player, and publish a change to a
running session.

## Layout of the resources folder

The library is grouped in category folders. A folder without an `open77.lua` is a category, not a
resource; the server's load rules, the wizard and the tooling look through categories, so a
`resources.load` written as bare names (`"open77_shell"`, `"freeroam"`) or as `"*"` keeps working.

```text
resources/
  system/       official platform resources: open77_shell, open77_chat, open77_props, open-voice, ...
  gamemodes/    playable modes and their HUDs: freeroam, race, pursuit, open77_deathmatch, open77_cordon, ...
  dev/          examples and harnesses: open77_example, open77_dbtest
  assets/
    loaders/    archivexl, tweakxl (tracked: the platform redistributes them)
    maps/       world packages such as kujira_world (ignored by git)
    vehicles/   vehicle packages (ignored by git)
    mods/       other third-party packages (ignored by git)
```

Rules: the last segment of a load rule (`*`, `open77_*`, a bare name) matches through up to two
levels of category folders; earlier segments stay literal, so `gamemodes/race` is exact and
`assets/**` is the explicit recursive form. Third-party content under `assets/maps`, `assets/vehicles`
and `assets/mods` is never committed; only its manifests are yours to write. `scripts/new-resource.ps1`
takes `-Category` (default `gamemodes`), and `scripts/check-lua.ps1` resolves a bare name in any
category.

## Connection flow

1. The GNS handshake announces a generation, a SHA-256 digest, an Ed25519 key, and an HTTPS URL.
2. The shell shows a full-screen loading WebUI.
3. The client verifies the signed set, the CBOR manifests, each chunk, then each file.
4. The complete generation is committed under
   `red4ext/plugins/Open77/cache/server-resources/sets/<digest>/resources`.
5. Only then does Open77 load the pristine save.
6. The local Lua runtime is replaced by the server's client image.

The screen reports `manifest`, `downloading`, `verifying`, `ready`, or `failed`, along with the
resource, the byte count, and the number of files. A signature, hash, or path error blocks entry and
disconnects the client.

## Writing a resource

The resource lives in a directory selected by the server's `resources.load` rules. Bare names and
relative paths use `resources.root` as their base:

```lua
resource "garage"
version "1.0.0"
auto_start true

shared_script "shared/config.lua"
server_script "server/main.lua"
client_script "client/main.lua"

web_ui_page "web/index.html"
web_files { "web/**" }
files { "assets/blips/*.png", "assets/audio/*.wav" }
preload_mod "dist/world-assets.zip"
permissions { "network.events" }
```

The server runs `server_script` and `shared_script`. The downloaded package contains `open77.lua`,
the `client` and `shared` files, and the declared assets — never the `server/` files. The client and
server Lua APIs are documented in the wiki's main reference. The authoritative subsystem for ground
items is covered in [loot.md](loot.md). The reference time/weather package and its protocol are
covered in [weather.md](weather.md).

`files` / `file` declare generic client assets. Globs are expanded by the server, included in the
signed resource set, downloaded before Lua starts, and recorded in the client allowlist. Use
`web_files` only for files served to that resource's WebUI. For example,
`Open77.assets.texture("assets/blips/job-center.png")` only succeeds when the exact file matched a
`files` entry. Empty globs, traversal paths, oversized files, and undeclared texture reads fail the
resource instead of falling back to arbitrary disk access.

### Declarative exports and ported manifests

A resource may list its exports in the manifest instead of calling `exports(name, fn)`:

```lua
exports { "GetClosestDoor", "IsDoorOpen" }      -- client exports
server_exports { "GetBalance", "AddMoney" }      -- server exports
```

Each side pre-registers its own list from the **global function of that name** after the last
script has run and before the resource is `Running`, through exactly the registration a scripted
`exports()` call performs -- so a sibling calling `exports.bank:GetBalance()` from its own start
handler finds it, and a function defined in any file counts. The manifest is the later word: a
name registered by `exports()` and listed here ends up bound to the global. A listed name with no
global function refuses the start by name (`manifest_export_missing:<name>`), never starts a
resource whose manifest promises what its code does not provide; a name that is not a Lua
identifier of at most 64 characters fails the manifest at discovery
(`invalid_manifest_export:<directive>:<name>`). `Open77.resource.metadata(name, "exports")` and
`"serverExports"` read the lists back.

`ui_page` is accepted as an alias of `web_ui_page`, with the same rules (a safe relative path that
must also be declared in `web_files`). When a manifest carries **both**, the one written last in
the file wins -- what a Lua-executed manifest would do -- so a ported manifest that kept its
`ui_page` line above a new `web_ui_page` line gets the Open77 one, and vice versa.

The FiveM keys that describe the FiveM runtime or metadata nothing here reads are **accepted and
ignored**: `fx_version`, `game`, `games`, `lua54`, `use_experimental_fxv2_oal`, `author`,
`description`, `provide`, `provides`, `escrow`, `escrow_ignore`. A ported manifest loads without
editing them out, and so that the acceptance never passes for something done, each side names the
ones it saw once per start, in one `INF` line:

```text
INF|my_resource|manifest_ignored_keys=fx_version,lua54
```

`@other_resource/file.lua` in a script list -- FiveM's cross-resource include -- is refused **by
name** on both sides, `cross_resource_include_refused:@other_resource/file.lua`, at manifest
parsing. It is a design decision, not a limitation: a resource's scripts run in its own VM, and
sharing code across resources is `dependency` plus [`require('@resource/module')`](lua-modules.md)
over declared `files` on the client, and [exports](resource-exports.md) on both sides. Before this
the include matched nothing and either failed as "Resource contains no scripts." or, when the
manifest listed other scripts too, was dropped without a word.

### Pre-boot REDengine assets

`preload_mod` / `preload_mods` attach inert game assets to a selected resource when REDengine must
see those files before Lua starts. Typical examples are `.archive` packages containing XBM texture
replacers or custom world data:

```lua
resource "open77_sky_ads"
version "1.0.0"

server_script "server/main.lua"
preload_mod "dist/Open77SkyAds.zip"
```

The ZIP or 7z is inspected at dedicated-server startup, staged in the server's content-addressed
mod store, and promoted to the required-mod set announced to the master. The launcher downloads
and projects it before it starts Cyberpunk. A preload is deliberately excluded from the signed Lua
resource package, including when a broad `files { "dist/**" }` pattern also matches it.

This is a boot contract, not a hot-reload API:

- the resource must be selected by `resources.load`;
- `requiredMods.enabled` must be `true`, or server startup fails with the responsible directive;
- only inert packages are accepted automatically; executable DLL/REDscript/CET content still goes
  through Warden review;
- a resource may declare at most eight `.zip`/`.7z` packages, each from 1 byte through 64 MiB;
- every declared path or glob must match an existing package;
- rebuilding or changing one requires a dedicated-server restart, then a fresh launcher boot of
  the game; restarting only the Lua resource cannot remount the REDengine depot.

See [Sky hologram advertisements](sky-advertising.md) for the complete PNG/DDS-to-XBM example and
[Server-required mods](server-mods.md) for storage, consent, trust, and removal semantics.

A server script can register a command reachable from the Open77 developer terminal or from the
dedicated console:

```lua
RegisterCommand("garage.list", function(source, args, rawCommand)
    -- source = authenticated playerId from the Open77 terminal, 0 from the dedicated console.
    print("garages: " .. tostring(#args))
end, false) -- true puts the command behind the `command.garage.list` ACL
```

In the in-game terminal, Open77 runs local native commands first. If no local handler matches, the
tokenised line is sent reliably to the server under the session's identity. The server never trusts
a `source` supplied by the client. Commands are removed automatically along with their VM when a
resource stops or reloads.

Commands declared with `restricted=true` require the ACL permission
`command.<lowercase-name>`. The `*` permission and namespace wildcards such as `command.garage.*`
are accepted. See [server-acl.md](server-acl.md).

A resource may also run a command, list what commands exist, and control the resource lifecycle,
behind two capabilities that are deliberately not the same one:

```lua
permissions { "runtime.commands" }    -- invoke a SIBLING's ordinary command, and nothing else
permissions { "resources.control" }   -- start/stop/restart, and the operator's authority for a line
```

Everything on that surface is queued for the next tick boundary and reports acceptance rather than
completion, because Lua runs inside the server's tick and a resource stopping itself synchronously
would free the Lua state doing the stopping. See
[Runtime and resource control](server-api.md#runtime-and-resource-control).

## Selecting which resources load

The dedicated server does not have to load every directory below `resources.root`. The
`resources.load` array is an ordered set of directory rules:

```jsonc
"resources": {
  "enabled": true,
  "root": "../resources",
  "load": [
    "open77_shell",
    "open77_chat",
    "open77_vehicles",
    "freeroam",
    "open77_freeroam"
  ],
  "autoStart": true
}
```

An exact list is recommended for production and gamemode profiles. Adding a new development
resource to the library then cannot silently add it to a live server.

The list is read at startup, and the first-run wizard writes an exact list (the template's
resources, by name). To add a resource to such a server: create its directory, add its name to
`resources.load` in `server.jsonc`, then either restart the server or -- on a running server
-- run `refresh` (rescans the manifests on disk; only names the load rules admit are
discovered) followed by `ensure <name>`. `refresh` does not re-read `server.jsonc`: a name that
was not in the list when the server started needs the restart. `ensure` on an unknown name
answers `Resource '<name>' was not found`, which is this case, not a broken manifest.

### Rule syntax

| Rule | Result |
|---|---|
| `"freeroam"` | Selects `<root>/freeroam`. |
| `"open77_*"` | Selects matching immediate child directories. |
| `"packs/*"` | Selects matching resources one level below `<root>/packs`. |
| `"packs/**"` | Recursively selects resources anywhere below `<root>/packs`. `**` must be a complete path segment. |
| `"garage/open77.lua"` | Selects the resource containing that exact manifest; the final `open77.lua` is optional. |
| `"D:/Open77/shared/**"` | Selects from an absolute path outside `resources.root`. Forward slashes avoid JSON escaping on Windows. |
| `"!open77_debug"` | Removes matches selected by an earlier rule. |

Relative names and paths are resolved from `resources.root`. The root itself is resolved from the
directory containing `server.jsonc`, not from the shell's current directory. `*` and `?` never cross
a directory separator. A complete `**` segment crosses any number of directories.

Rules run from left to right, so later rules can remove or re-add a resource:

```jsonc
"load": [
  "open77_*",          // add every immediate open77_ resource
  "!open77_debug",     // remove debug
  "!open77_example",   // remove the example package
  "open77_debug"       // re-add debug deliberately
]
```

Useful special cases:

- Omitting `load` is equivalent to `"load": ["*"]` and preserves the old load-everything behavior.
- `"load": []` selects no resources.
- A rule matching no current directory selects nothing; the watcher will pick it up if a matching
  resource appears later.
- Two selected directories declaring the same resource name are both rejected as ambiguous.

### Selection, startup, dependencies, and client delivery

Selection and startup are separate gates. `load` decides which resources the host knows about.
`resources.autoStart` decides whether the host starts selected manifests whose own `auto_start` is
true. A selected manifest with `auto_start false` remains available to `ensure <resource>`; an
unselected resource is unknown to `ensure`.

Manifest dependencies are not silently added. Every dependency must also match `load`, otherwise
starting the dependent resource fails and names the missing dependency. This keeps the configured
set authoritative: an excluded gamemode cannot return indirectly through another manifest.

Only selected resources that reach `Running` are packaged and signed for clients. Removing a
resource from `load` therefore stops it server-side and removes its client scripts, WebUI, and
declared files from the next resource generation.

Selected `preload_mod` declarations are resolved earlier, during dedicated-server boot, because
the launcher needs their digest before it can start the game. They are not silently pulled in from
an excluded resource and they are not added by a dependency that `load` omitted.

Filesystem matches are recalculated at every `watchIntervalMilliseconds` scan. Editing a resource,
creating a matching directory, or deleting one is noticed automatically. Editing `server.jsonc`
itself is not hot-reloaded: restart the dedicated server after changing `root` or `load`. Run
`resources` at the server console or in Warden to verify the final discovered set.

## Publishing and reloading

With `autoStart=true`, the server notices any valid change. It prepares a new server VM, publishes a
new signed set, then sends `ResourceSetChanged` to the players. The client downloads only the
missing chunks and switches generation once verification completes. An invalid Lua candidate keeps
the previous generation.

Useful server commands:

```text
resources
refresh
ensure <resource>
start <resource>
stop <resource>
restart <resource>
reload <resource>
```

Client diagnostic commands:

```text
resource.root
resource.distribution
resource.list
resource.status <resource>
```

`resource.root` shows `source=bootstrap` before the session and `source=server` once active.
`resource.distribution` exposes phase, generation, progress, digest, and current resource.

Every one of the server commands above is visible to the running resources as events.
`start`, `ensure` and `restart` announce the resource **before** it starts with
`onResourceStarting(name)` — delivered inline, while `GetResourceState(name)` still reads
`starting`; it is a notification, not a veto — then `onResourceStart(name)` once it runs; `stop`
and `restart` announce `onResourceStop(name, reason)`; `reload` is a stop and a start to every
other resource; and `refresh` ends with `onResourceListRefresh()` once the tree has been re-read
and the new package set published. The Open77 spellings (`open77:resource:starting`, `started`,
`stopped`, `refreshed`) carry a lifecycle revision beside each. See
[Resource lifecycle events](server-api.md#resource-lifecycle-events).

## Security and operations

- HTTPS is mandatory for a public URL; HTTP is limited to loopback.
- HTTP redirects and absolute or traversal paths are refused.
- The server must keep its signing key file across a migration.
- The private key and the `.open77` cache must never be committed.
- A server resource is code chosen by the operator: only grant sensitive permissions to resources
  you audit.

Minimum configuration:

```json
"resources": {
  "enabled": true,
  "root": "../resources",
  "load": ["open77_*", "garage", "!open77_debug", "../shared/**"],
  "autoStart": true,
  "download": {
    "enabled": true,
    "listenUrl": "http://0.0.0.0:11779",
    "publicBaseUrl": "https://cdn.example.net/",
    "cacheDirectory": ".open77/resource-cache",
    "signingKeyFile": ".open77/resource-signing-key.json",
    "chunkSizeBytes": 1048576
  }
}
```

See [Selecting which resources load](#selecting-which-resources-load) for exact names, wildcard and
exclusion semantics, absolute path examples, dependencies, and restart behavior.
