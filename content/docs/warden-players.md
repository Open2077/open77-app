# The Players tab in Warden

Warden is your server's in-process admin console. Its **Players** tab (subtitle
"Online sessions") is the live roster of everyone connected, with the actions an
operator takes on a row: warn, kick, ban, grant in-game rights, heal, freeze and
move. It refreshes every few seconds on its own.

This page covers the roster columns and the per-row actions. The whitelist and ban
door list has its own tab and its own page — see
[Connection control](connection-control.md). Managing operator accounts and roles is
in [Identity and ACL](server-acl.md).

## Permissions

Every action is gated separately, so a role can hold one without the others. A role
holding `players.view` sees the tab; each button appears only when the session's role
holds its permission, and the server enforces it again on every call.

| Permission | Allows |
| --- | --- |
| `players.view` | See the tab and the roster. |
| `players.warn` | Send an admin message to one player. |
| `players.kick` | Disconnect a player (they can rejoin). |
| `players.ban` | Ban a player's identity and disconnect them. |
| `players.heal` | Restore a player to full health, or revive them where they fell. |
| `players.freeze` | Hold a player's body still, and release it again. |
| `players.teleport` | Move a player to coordinates or to another player, and bring a player to another. |
| `acl.edit` | Grant or revoke in-game rights from a row (the *Rights* button). |
| `access.edit` | Add a player to the whitelist from a row (the *Allow* button). |

`players.heal`, `players.freeze` and `players.teleport` sit beside the moderation
four rather than inside them on purpose. Removing tonight's troublemaker and pinning
a player in place during a match are different authorities: a server can hand a
greeter role the whitelist *Allow* button and a game designer the freeze and move
buttons without either becoming a full moderator. The owner role (`*`) holds them all.

## The roster columns

| Column | What it shows |
| --- | --- |
| **ID** | The player's numeric session id. Every action is keyed on it. |
| **Name** | The display name, with how long ago they connected. |
| **Identity** | The account GUID, shortened; click to copy the full value. |
| **Ping** | Round-trip time in milliseconds, coloured by health. A dash means the transport has no sample yet — never a misleading `0 ms`. |
| **Health** | Current health as a percentage of their maximum, with armour beside it. A dash means the server holds no health record for this player. |
| **State** | `alive` is the quiet default and shows nothing; `dead`, `loading`, `frozen`, `god`, `ghost`, `hidden`, `in vehicle`, `watching #N` and `not ready` each show a chip. |
| **Match** | The routing bucket: `lobby` (bucket 0, the shared world) or `#N` (an isolated match — a Pursuit round, say). Two players in different buckets cannot see each other. |
| **Rights** | Their in-game role or grant count, from the ACL, and a *listed* chip when they are on an enabled whitelist. |
| **Position** | Their last known X, Y, Z. Past two seconds it is shown greyed with its age, because "one late tick" and "never reported" are different facts an operator must be able to tell apart. |

The roster deliberately carries **no IP address**. The server knows one, and the
`Open77.players.endpoint` read puts it behind the `players.identity.sensitive` manifest
capability precisely because an endpoint is the one field that can follow a player home.
A browser panel on a box an operator may share is not a stronger place to keep it than a
resource manifest, so it is not published here at all.

## Heal

The **Heal** button restores a living player to full health and tells them an
administrator did it. On a **dead** player the button reads **Revive** instead and
brings them back where they fell at full health with a short grace window — a dead body
cannot be topped up, so the one action does the right one of the two and the toast says
which. Health writes go through the same stats authority `Open77.players.setHealth`
uses, so god mode and the life-phase interlocks still apply.

Every panel heal — and only a panel heal — raises the host-wide event
`open77:admin:playerHealed(playerId, author)`. A resource calling `Open77.players.heal`
does **not** raise it: `open77:admin:` means "the operator's own surface did this", and
announcing every gameplay heal under that name would be a firehose and a lie. See
[Admin events](server-api.md#admin-events).

## Freeze

**Freeze** holds a player's body still; the button then reads **Thaw**. A frozen player
keeps their camera, chat, voice, menus and interaction prompts, and still takes damage —
it is a primitive, not a policy. See [Player freeze](player-freeze.md) for exactly which
inputs it blocks.

The hold is **cooperative and keyed to the panel**. A gamemode script may hold the same
player at the same time, and *Thaw* drops only the panel's claim: if a script still holds
them, they stay frozen and the toast says so, rather than letting an operator think they
released somebody they did not. The panel's claim is released automatically on the
player's death, respawn, bucket change and disconnect, the same as any other holder — a
player can never be stranded frozen.

## Move

**Move** opens a dialog with three modes:

- **To coordinates** — prefilled with the player's own position, so a small nudge is a
  small edit. Their routing bucket is left alone.
- **To another player** — the player is placed beside that player (offset to the side so
  two bodies never resolve inside each other) and into that player's routing bucket.
- **Bring another player here** — the inverse: pick somebody else, and they are moved
  beside this player, into this player's bucket.

The dialog warns before you click when the player to be moved is dead, still behind the
readiness gate, or in a vehicle (a move is refused unless you tick *Take them out of a
vehicle first*).

A move is the one admin action that is **not** instant. The server does not move the
body; it asks the owning client to, and the client fades the screen, teleports, then
watches the body settle on solid ground for three frames before answering — because a
direct write over any real distance can drop a player through world that has not streamed
in, whereupon the engine's fall-under-world failsafe silently returns them to the save's
spawn point kilometres away. So the panel waits for the client's answer and reports what
the **body** did: `arrived`, or a named refusal (`player_in_vehicle`,
`player_not_alive`, `settle_timeout`). A move whose client never answers in time is
reported as *pending*, not as a success — it may still land, and the panel does not
guess.

Bucket changes happen before the body moves, so an observer left behind never glimpses
the destination; if the move is refused, the bucket is rolled back so the player is never
left alone in a world nobody meant them to see.

## Spectate is not available

txAdmin's player panel has a spectate button. Warden's does not, and it is not an
oversight. The platform *has* a spectate primitive (`Open77.players.spectate`), but it
needs a spectator who is a connected player: it ghosts that player, hides their body and
puts *their client's camera* on the target. A Warden session is a browser with no body to
ghost and no renderer to receive frames, and Cyberpunk 2.31 exposes no server-side view of
the world to stream to one. The Players tab therefore *reports* who a player is watching
(the `watching #N` chip) but offers no way to start one. An operator who wants to watch a
player joins the server and uses `Open77.players.spectate` from an in-game admin resource,
with a body.

## Everything is audited

Every action writes one line to the audit trail (the **Audit** tab, permission
`audit.view`): the operator's panel username, the action (`players.heal`,
`players.freeze`, `players.unfreeze`, `players.teleport`, `players.bring`), the target and
the outcome. A refused action is recorded as failed with its reason, so the trail is a
true record of what an operator did and what actually happened — not only what they tried.
