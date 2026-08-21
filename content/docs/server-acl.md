# Public identity, server commands, and ACL

Server-side Lua commands are typed straight into the CyberM developer terminal in game (`²`). A
command the client knows stays local; anything else is forwarded to the server over the
authenticated network session, then looked up among the `RegisterCommand` registrations of the Lua
resources.

Use this guide to whitelist a player, restrict a command to specific people, and understand what
identity the server actually trusts.

## Exporting your public identity

In the CyberM terminal:

```text
identity.dump
```

The reply gives the absolute path and the SHA-256 fingerprint:

```text
OK identity_public_dumped path=".../red4ext/plugins/CyberM/exports/identity-<uuid>.json" fingerprint=sha256:...
```

The file holds the `userId`, the P-256 public key, its fingerprint, and a ready-to-copy
`aclPrincipal` object. It never holds the private key, the DPAPI blob, the session proof, or the
`%LOCALAPPDATA%/CyberM/identity-v1.dat` file. Do not copy that last one to the server.

## Whitelisting a player

The server loads the relative file configured in `server.jsonc`:

```json
"accessControl": {
  "file": "acl.jsonc"
}
```

Copy the exported `aclPrincipal` value into `principals`:

```json
{
  "version": 1,
  "principals": [
    {
      "name": "owner",
      "userId": "00000000-0000-0000-0000-000000000000",
      "publicKey": "base64...",
      "permissions": [
        "command.loot.*"
      ]
    }
  ]
}
```

Restart the server, or type `acl.reload` in its administration console. `acl.list` reports the path
actually loaded; `acl.check <playerId> <permission>` is there for diagnosis.

The comparison is made on the 64 bytes of public key certified during the handshake. If the entry
also carries a `userId`, that must match too. The displayed nickname and the temporary `playerId`
never take part in authorisation.

## Declaring a restricted command

```lua
RegisterCommand("garage.delete", function(source, args, rawCommand)
    -- source is the playerId of the authenticated session, or 0 for the server console.
end, true)
```

From a client, this command requires `command.garage.delete`. An exact permission, `*`, or a
trailing wildcard such as `command.garage.*` will grant it. The dedicated console uses `source=0`
and stays authorised for local administration.

The transport caps a line at 32 tokens and each token at 256 UTF-8 bytes, validates the command
name, and reuses the network limit of 32 events per second. Refusals and results come back to the
CyberM terminal through `cyberm:command:result`.
