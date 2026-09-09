# Developer Preview is live

The OPEN//77 **Developer Preview is active**. Server owners and resource developers
can start building and testing multiplayer experiences in Night City with the
published launcher, dedicated server and Lua APIs.

This is an early-access developer release, not a stable release or unrestricted
public access. Expect bugs, crashes, incomplete features and breaking API changes.

## Get access

1. [Apply for Developer Preview access](/create#developer-alpha) with your project
   and the work you want to test.
2. Create or sign into your [OPEN//77 account](/account). Applications are reviewed;
   creating an account or downloading the launcher does not automatically grant access.
3. Once your account is approved, sign into that same account in the launcher.

Approval is checked when joining a world. The live directory and launcher download
are available before approval; `/host` enables server downloads for approved preview
accounts and staff. A server license identifies a hosted server;
it does not grant player access to the account using it. Individual servers can
also enforce their own admission rules.

## Install and connect

Use the [official launcher download](/download). Playing requires your own legal
copy of **Cyberpunk 2077 2.31 with Phantom Liberty**, on 64-bit Windows 10 or 11.
Let the launcher verify your installation and apply the current multiplayer update.

Select a world in the [live server directory](/servers), or use **Direct Connect**
in the launcher with a hostname/IP and port. **History** keeps confirmed connections,
including local development servers. Local/private addresses are hidden from the
launcher's normal server list, not from History or Direct Connect.

Direct Connect does not bypass account approval, connection tickets or server rules.
An address absent from the master directory can have an unknown availability status;
that is not proof that the server is offline.

See [the launcher guide](/docs/launcher) for installation, updates and diagnostics.

## Host your first server

Download the current [Windows x64 or Linux x64 server package](/host). Both include
their .NET runtime, native dependencies, the Freeroam template and its system
resources. Cyberpunk 2077 and a separate .NET installation are not required on the host.

1. Extract into a new directory. Run `Start.cmd` on Windows or `./start.sh` on Linux.
2. Complete the first-run Warden setup with your server name, visibility, public
   game/resource endpoints and a [server license key](/account/keys).
3. Follow the [hosting guide](/docs/host-a-server) for network/firewall configuration.
   Internet players must be able to reach both the game endpoint and resource downloads.
4. Leave the master URL at **`https://master.open2077.net/`**. The loopback URL
   printed for Warden is your local administration panel, not the master directory.

The included Freeroam combines racing, PvP, wardrobe and an animation menu, with
system packages such as chat, voice, weather and administration. You still need to
configure your server and access rules; the download does not include a license or
anyone else's player data.

Use the official master-backed setup for this preview. The private/offline startup
path remains experimental; do not disable authentication to work around setup errors.
For Linux service wrappers, use `SIGINT` for a graceful shutdown: `SIGTERM` shutdown
of the game loop is a known preview limitation.

## Build with Lua and WebUI

Start with [server resources](/docs/server-resources), then use the
[API reference](/docs/api) filtered by server/client runtime and category.
Server and client runtimes support resource exports within their own side;
cross-resource calls do not turn a client export into a server export.

For character actions, read the [RP animation guide](/docs/rp-animations) and its
linked client/server API entries. For a working gamemode example, browse the
[Freeroam source](https://github.com/Open2077/freeroam).

## Preview expectations

- APIs, networking and resource formats can change. Keep backups of configuration,
  persistence data and custom resources before updating.
- Read the limitations on each system's guide. Availability in the API reference
  is not a guarantee that every animation, body type or multiplayer scenario has
  passed in-game validation.
- RP animation playback after repeated disconnect/reconnect cycles has a known
  proxy/camera lifecycle issue. If it occurs, close and relaunch the game, and report
  the reproduction steps. Female and remote presentation need broader validation.
- There is no supported player-count or all-hardware performance guarantee yet.
  Test your own workload before depending on a server capacity target.
- Launcher and client/server build numbers can differ: they have separate release
  channels. Use the versions offered by the official downloads, not a guessed match.

## Report a problem

Use the [official Discord](https://discord.open2077.net) with your launcher and
client/server versions, operating system, steps to reproduce, expected result and
actual result. Mention whether it happens after reconnecting, with a specific body
type, animation, vehicle or custom resource.

Attach the relevant logs or launcher diagnostics when requested. Review files before
sharing: never post license keys, passwords, account tokens or server identity/signing
files. For a possible security issue, contact the maintainers privately instead of
posting credentials or exploit details in a public channel.
