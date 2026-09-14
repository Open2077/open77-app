# Public identity, server commands, and ACL

Server-side Lua commands are typed straight into the Open77 developer terminal in game (`²`). A
command the client knows stays local; anything else is forwarded to the server over the
authenticated network session, then looked up among the `RegisterCommand` registrations of the Lua
resources.

Use this guide to whitelist a player, restrict a command to specific people, and understand what
identity the server actually trusts.

## Exporting your public identity

In the Open77 terminal:

```text
identity.dump
```

The reply gives the absolute path and the SHA-256 fingerprint:

```text
OK identity_public_dumped path=".../red4ext/plugins/Open77/exports/identity-<uuid>.json" fingerprint=sha256:...
```

The file holds the `userId`, the P-256 public key, its fingerprint, and a ready-to-copy
`aclPrincipal` object. It never holds the private key, the DPAPI blob, the session proof, or the
`%LOCALAPPDATA%/Open77/identity-v1.dat` file. Do not copy that last one to the server.

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

## Changing the ACL from a resource, at runtime

The read half above is the whole story for a server whose rights are decided once
and edited by hand. A job or gang model is not that server: "this player is on
shift as police dispatch" is a fact that changes ten times an evening, and an
operator should not be in the loop for any of them.

`Open77.acl` therefore has a write half — native-parity row A12, FiveM's
`add_ace`, `add_principal` and `remove_ace`.

```lua
permissions {
    "acl.read",                -- the existing read half
    "acl.grant:job.police.*",  -- may hand out rights under this prefix
    "acl.define:job.police.*", -- may define roles whose rights are under it
}
```

```lua
local userId = Open77.players.identity(source).userId

assert(Open77.acl.definePermission("dispatcher", { "job.police.dispatch" }))
assert(Open77.acl.addRole(userId, "dispatcher"))
assert(Open77.acl.grant(userId, "job.police.impound"))

-- Off shift.
assert(Open77.acl.removeRole(userId, "dispatcher"))
assert(Open77.acl.revoke(userId, "job.police.impound"))
```

| Function | Capability | Meaning |
|---|---|---|
| `Open77.acl.grant(userId, permission)` | `acl.grant:` | Add one permission. |
| `Open77.acl.revoke(userId, permission)` | `acl.grant:` | Take it back. |
| `Open77.acl.addRole(userId, role)` | `acl.grant:` | Put the user in a role. |
| `Open77.acl.removeRole(userId, role)` | `acl.grant:` | Take them out of it. |
| `Open77.acl.definePermission(role, permissions)` | `acl.define:` | Define, retune, or (with `nil`) delete a runtime role. |
| `Open77.acl.grants(userId)` | `acl.read` | What the runtime layer holds for one user. |

Every writer answers `true`, or `nil, reason`. A grant takes effect on the very
next `isAllowed` — there is no reload and no restart, because the swap is
in-process.

### The subject is a userId, never a playerId

The read half takes a `playerId` because it asks a question about a seat that is
occupied right now. The write half takes the **master-issued `userId`**, the
string `Open77.players.identity(playerId).userId` answers, because a grant
outlives the session that earned it and a seat number does not. It also means you
can promote somebody who is offline.

### The delegation scope is the security model

There is no bare `acl.grant` or `acl.define`. The capability *is* the pattern,
and a resource may hand out exactly what is inside it:

```text
permission "acl.grant:job.police.*"

Open77.acl.grant(user, "job.police.dispatch")  -- true
Open77.acl.grant(user, "command.kick")         -- nil, "permission_not_delegable"
Open77.acl.grant(user, "*")                    -- nil, "permission_not_delegable"
```

This is the answer to the question A12 exists to raise: *may a resource grant a
permission it does not itself hold?* It may grant whatever the operator wrote into
its manifest, and nothing else — and the operator reads that delegation off the
manifest before installing the resource, the same way `runtime.commands` and
`resources.control` are readable there.

**`acl.grant:*` is not a wildcard scope.** It is dropped, and a resource whose
every entry was `*` is answered `scope_not_delegable`. Owner-equivalence comes
from `acl.jsonc` or it does not come at all.

Four more refusals close the escalations that follow from the first:

| Reason | What it stops |
|---|---|
| `role_exceeds_scope` | `addRole` is checked against the role's **entire reach**, not its name. Without it a resource scoped to `job.police.*` would collect `command.*` by adding your `moderator` role — the same escalation one indirection later. |
| `operator_principal` | No runtime call may name a subject your document binds to `*` or to the `owner` role, in either direction. |
| `role_defined_by_operator` | A role you defined in `acl.jsonc` is yours. A resource cannot retune what it means. |
| `role_reserved` | `owner` and `admin` are the server's, under any scope. |

The capability that gates granting is a *manifest* permission, and manifest
permissions are not in the ACL. So there is no string a resource can grant to
anyone, itself included, that yields `acl.grant`. That one is structural rather
than a check.

### Runtime grants live in a sibling, not in your file

Writes go to **`acl.runtime.jsonc`**, next to `acl.jsonc`, written atomically
through a temporary so a crash mid-write cannot truncate it. Your document is
never touched.

That is a security property, not tidiness. The overlay is **additive only** — it
has no subtractive form at all — so no sequence of calls a resource can make, not
even a compromised one holding the widest scope you can write, takes a right away
from your document. A revoke that names one of your grants answers
`operator_grant` instead of appearing to work. Had runtime grants been merged into
`acl.jsonc`, a resource able to write that file would also be able to rewrite the
owner's principal, and the whole model would rest on the refusals above being
exhaustive rather than on the layout making the attack unrepresentable.

Three consequences worth knowing:

- **Effective rights are the union.** `isAllowed` checks your document first and
  the overlay second, and the overlay can only ever say yes.
- **A complete reset is `rm acl.runtime.jsonc`.** One file, machine-owned, with a
  header saying so. Nothing of yours is caught in it.
- **The overlay cannot bind a public key.** A runtime grant binds the
  master-issued user id only — the same strength as a userId-only principal in
  your document, which it already permits, and it keeps anything key-shaped out
  of a machine-managed file. A runtime role that collides with one you later
  define in `acl.jsonc` is dropped rather than merged: yours wins.

### `onAclChanged`

Every accepted mutation publishes one host-wide event, on a reserved name a
resource cannot forge.

```lua
AddEventHandler("onAclChanged", function(revision, by, operation)
    -- revision: a counter, 1 per accepted mutation
    -- by:       the resource that caused it
    -- operation: "grant" | "revoke" | "addRole" | "removeRole" | "definePermission"
end)
```

It names **neither the subject nor the permission**, and that is deliberate: the
event reaches every running resource, so a payload carrying either would tell the
whole server what the ACL says while bypassing `acl.read`. A listener that only
needs to drop a cache has everything it needs in the revision; one that is
entitled to the detail calls `Open77.acl.isAllowed`, which is gated.

One boundary to know: the event is published by the resource's own VM, so a grant
made in a resource's **top-level chunk** — before the host has activated that VM
on the event bus — persists and takes effect, but publishes nothing. Grant from a
thread or an event handler if a listener has to see it. The same rule governs
`Open77.environment.publishChange`.

The Warden panel and the `acl.reload` console command write and reload
`acl.jsonc` itself and do **not** publish `onAclChanged`; the event is about the
runtime layer.

## Declaring a restricted command

### Reading effective rights from a server resource

Declare `permission "acl.read"` in the resource manifest, then use:

```lua
local allowed, error = Open77.acl.isAllowed(source, "command.admin.moderate.kick")
local roles, error = Open77.acl.roles(source)
```

These APIs are server-only and read the compiled ACL for an authenticated active
session. `isAllowed` accepts a concrete permission, not a wildcard; it returns
false for an absent resolver/session. Invalid IDs (including 0), invalid names
and missing manifest capability return `false, reason`. `roles` returns the
matching role labels, or an empty array for an unknown session. Neither writes
roles or grants rights. Continue registering privileged commands as restricted.

The standalone `open77_admin` resource uses these bindings for `/admin` and
rechecks commands at execution. See its README and role examples for deployment.
Its `/pos` and `/rot` utilities intentionally require no admin ACL.

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
Open77 terminal through `open77:command:result`.
