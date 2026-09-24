# Your server in the launcher

Make your server available through the launcher directory, History or Direct Connect. Direct Connect accepts hostnames and IP addresses, including local development endpoints.

This page is the operator's half of that contract. The player's half is
[The OPEN//77 launcher](launcher.md).

Everyone with Alpha access can download the server and start building without a separate developer application. Joining requires an Alpha account. Local/private endpoints are excluded from the public directory but remain available through History and Direct Connect. See [Alpha access](/docs/alpha-access) for setup and the Discord `/alpha apply` command.

## How a world reaches a player

There is no registration form and no submission queue. Your server publishes
itself:

1. Your server boots with a license key and registers with the master
   (see [Server licensing](/docs/server-licensing)).
2. The master's public directory, `GET /api/v1/servers`, starts returning it.
3. The launcher fetches that directory and draws a row per server.
4. The player presses connect on a row.

The launcher does not discover servers on the local network, does not accept a
hand-typed endpoint from the browser screen, and does not read a favourites file
you can seed. Being in the master's directory is the only way in.

That is also why a branding mistake can remove you entirely rather than degrade
you: if your registration is refused, you are not a badly-drawn row, you are an
absent one. [Branding your server](server-branding.md) covers the one budget
that catches people.

## What one row is made of

The catalogue entry the master publishes for you carries exactly these fields:

| Field | What it is |
|---|---|
| `id` | The master's server id — the portable public identifier, and the thing a deep link carries |
| `name`, `description` | What the row and its detail panel say |
| `locale` | A BCP-47 tag. The website projects it onto a language chip and a region bucket |
| `tags` | Free-form. The first tag naming a known mode is what the browser files you under; anything else reads as "Custom" |
| `website`, `discord` | Your links, or null |
| `connectEndpoint` | `host:port` — the address a client actually dials |
| `connectedPlayers`, `maximumPlayers` | The population counter |
| `expectedGameBuild` | The game build your server expects a client to be on |
| `serverVersion`, `protocol` | Your build, and the wire protocol major/minor |
| `iconUrl`, `bannerUrl` | Content-addressed image URLs the master serves; both may be null |
| `startedAtUtc`, `lastHeartbeatAtUtc` | Uptime, and proof you are still there |

Use the stable public `id` in server links; `connectEndpoint` can change when the server moves. Directory metadata provides the server name, description, branding, locale, tags, player counts and compatibility fields.

Listing status depends on heartbeats received by the master, not a ping probe from the launcher. The master does not publish client-to-server latency.

**The launcher does not enforce your `expectedGameBuild` or `protocol`.** It
carries them and does not check a joining player against them. Version matching
is settled between the client and your server, not filtered in the browser — so
do not expect the launcher to hide you from a player on the wrong build.

## Deep links: the one contract you can rely on

A link that boots a player straight into your world is a single URL shape:

```text
open77://connect?server=<serverId>
```

with an optional `&endpoint=<host:port>` fallback. `<serverId>` is the master's
`id` for your server — not your endpoint, not your name, not a slug you chose.

This is the same URL the OPEN//77 website's own Join buttons emit, so a link you
put in your Discord behaves identically to one on
[the server browser](/servers). Put it behind a button, in a pinned message, on
your own site — the contract does not care where it came from.

The launcher also accepts `open77:connect?…` with no double slash, and takes the
`endpoint` parameter as a fallback when the id cannot be resolved — a target
reached that way is labelled as a direct connect rather than by your server's
name. If neither resolves, the launcher reports that the server is not in the
catalogue instead of dialling something.

**Both values are sanitised before anything is done with them.** A value longer
than 128 characters is rejected, and only letters, digits and `. : - _ [ ]` are
allowed. Anything outside that alphabet causes the whole value to be **dropped,
not cleaned up** — deliberately, because a partly-stripped id would connect
someone to the wrong world in silence. Real ids and `host:port` endpoints fit
inside that alphabet; a link that has been through a URL shortener's tracking
parameters or a chat client's rewriting may not.

### What happens when someone clicks it

The launcher registers the `open77` scheme per-user under
`HKCU\Software\Classes\open77`, idempotently and self-healing on every start, so
the OS routes the URL to it. From there:

- **If the launcher is closed**, it opens and holds the target.
- **If the launcher is already open**, the URL is forwarded to the running window
  over a named pipe and that window comes to the foreground. A second window is
  never opened.
- **If the player is signed out**, or the game is not yet verified, or the mod
  set is not up to date, the target is *queued*. They sign in and get set up, and
  the connect fires on its own once the launcher reaches its ready state. They do
  not have to click your link twice.
- **If the player has no launcher installed**, the browser shows its usual
  "no handler for this scheme" prompt and nothing happens. Navigating to an
  unhandled scheme never unloads the page they were on, so a Join button is safe
  to offer unconditionally — but it is also silent, which is worth a line of copy
  next to the button.

### How the id becomes a connection

The launcher resolves your `id` against the master directory it already holds,
takes your `connectEndpoint`, and sets `OP77_CONNECT=<host:port>` (alongside
`OP77_CONNECT_MASTER=<masterId>`) in the game process environment before starting
Cyberpunk 2077. The client plugin reads `OP77_CONNECT` at init and, once the
shell is eligible, drives **the same authenticated autoconnect a manual click
takes** — resolve, ticket, dial.

That last clause is the important one for you: **a deep link does not bypass
ticketing**. It is a shortcut through the launcher's own UI, not through the
platform's authentication. A player arriving via a link is authenticated exactly
as one who browsed to you, and your ACL and ban list see no difference.

If a client is already running, it is joined in place rather than relaunched.

Resolution happens launcher-side because the client dials by endpoint and learns
your server's GUID from the handshake in order to fetch its ticket — there is no
id-to-endpoint resolver inside the game. That is why the endpoint, not the id, is
what crosses into the game process.

On any failure the shell falls back to the normal server browser carrying the
error. It does not hang, and it does not sit on a black screen.

## What a connecting player must have

Nothing you can relax, and nothing you have to distribute:

- **Their own legal copy of Cyberpunk 2077**, at the exact game build the
  platform targets, with the Phantom Liberty expansion. The client hooks the
  engine at addresses fixed for that build and refuses to load on a mismatch, so
  this is an equality, not a floor. See
  [How the platform works](/docs/platform) for the current build.
- **The OPEN//77 client mod**, which the launcher installs and keeps current on
  its own. You do not ship it, host it, or version it.
- **A platform account**, signed in through the launcher.
- **Windows.** The launcher is a Windows desktop application.

Your server needs none of this. It never loads game content and never needs the
game installed — see [Host your own server](/docs/host-a-server).

The launcher also checks the player's game hash against the master's build
manifest before launching, and warns on an unknown, deprecated or revoked build.
That check is **advisory**: it is a warning at the launcher, and the real
enforcement happens at ticket time. Do not treat a launcher warning as the thing
keeping wrong builds off your server; the ticket is.

## Required mods and your server

The launcher manages a signed index of packages,
a mandatory floor a player cannot untick, optional packages, declared
dependencies, path-conflict refusal, declared overrides, and a redscript
preflight that refuses to launch a set that does not compile.
[The OPEN//77 launcher](launcher.md#the-mod-menu) documents it from the player's
side.

**What your server can add to it:** a `requiredMods` list. A world declares the packages
every player must load, **hosts those bytes itself**, and the launcher resolves the whole set
on the Connect click — before the game process exists, so a normal join needs no restart.
OPEN//77 never holds a third-party mod: the master vouches for a SHA-256, not for a file.

Required mods follow these rules:

- **Verified / unverified / blocked.** An unreviewed package is not blocked — the player is
  told plainly that your world supplied it and OPEN//77 has not checked it, and they decide.
- **The capability cap.** An unverified package may carry inert data only (`.archive`,
  `.tweak`, `.xl`, `engine/config` INIs). Anything the game or the OS would execute —
  `.dll`, `.reds`, CET Lua, `.asi` — is refused until those exact bytes are reviewed. There
  is no player toggle that lifts this.
- **Redistribution is a separate question from safety.** A mod can be perfectly sound and
  still be one its author never licensed you to hand out. Where that is the case the
  launcher asks the player to fetch it from the author's own page instead.

[Mods your server requires](/docs/server-mods) is the full guide: importing from the Warden
panel, who hosts what, bandwidth, and removing a mod without stranding players.

For content the base game can already render — props, markers, zones, a course built from
existing assets — **[server resources](/docs/server-resources)** remain the better route:
signed Lua and assets your server hands to clients on connect, no download of anything else
and no restart. Reach for a required mod only when the content genuinely is not in the game.

## Things that will bite you

| Symptom | Cause |
|---|---|
| Your world never appears in the launcher | You are not in the master directory. Check registration and your license key before looking anywhere else |
| It appeared, then vanished after you changed images | An over-budget icon/banner pair fails the whole registration, not just the picture — see [Branding your server](server-branding.md) |
| Your Join link does nothing on some players' machines | They have no launcher installed; the OS silently drops the scheme |
| A player says the link "went to the browser, not my server" | The target was queued behind sign-in or a mod update and fired once the launcher was ready — or it failed and fell back to the browser with an error they clicked past |
| You filed yourself under a mode nobody browses | The mode chip comes from the **first** of your `tags` that names a known mode; order matters |
| You publish your endpoint and it stops working | Publish the `id`. The endpoint is not the public identifier |

## See also

- [The OPEN//77 launcher](launcher.md) — the same machinery from the player's side.
- [Host your own server](/docs/host-a-server) — getting a server running at all.
- [Server licensing](/docs/server-licensing) — the key that lets you register.
- [Branding your server](server-branding.md) — the icon and banner on your row.
- [Server resources](/docs/server-resources) — how to actually ship content to
  your players.
