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

The resource lives in the folder configured by the server's `resources.root`:

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
