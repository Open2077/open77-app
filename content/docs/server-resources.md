# Lua resources loaded by the server

The server picks the session's resources, builds their client image, and the game downloads them
before entering Night City — the same model FiveM uses. The local
`red4ext/plugins/Open77/bootstrap` folder holds only the five trusted bootstrap resources —
`open77_shell`, `open77_pause`, `open77_blips`, `open77_death` and `open77_debug` — which draw the
server browser, the connection flow, and the loading screen. These same five are excluded from the
server-supplied resource layer. Gameplay resources on the player's disk are never auto-discovered.

Use this guide to write a resource, understand what reaches the player, and publish a change to a
running session.

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
