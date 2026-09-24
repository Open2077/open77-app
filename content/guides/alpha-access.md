# Alpha access: play, host and build

Everyone with Alpha access can download the OPEN//77 dedicated server and start building a custom Cyberpunk 2077 gamemode. Roleplay, PvP, Battle Royale, Racing, Survival or something entirely your own: use the Lua APIs and resources to create your experience in Night City.

No separate developer application, project review or special developer access is required. Alpha remains an early-access release, not a stable release or unrestricted public access. Expect bugs, crashes, incomplete features and breaking API changes.

## Get access

**Already have Alpha access?** Sign into your [OPEN//77 account](/account), [download the server](/host) and start building. You do not need to apply again.

If you do not have Alpha access yet:

1. Join the [official Discord](https://discord.open2077.net).
2. Use the bot command `/alpha apply` in any channel and follow its instructions.
3. Once Alpha access is enabled on your account, use that account on the site and in the launcher.

Creating an account or downloading the launcher alone does not grant Alpha access. Alpha members also have access to the Discord changelog channel for release updates.

Approval is checked when joining a world. The live directory and launcher download
are available before approval; `/host` enables server downloads for Alpha
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

Use the official master-backed setup during Alpha. The private/offline startup
path remains experimental; do not disable authentication to work around setup errors.
For Linux service wrappers, use `SIGINT` for a graceful shutdown: `SIGTERM` shutdown
of the game loop is a known limitation.

## Build with Lua and WebUI

Start with [server resources](/docs/server-resources), then use the
[API reference](/docs/api) filtered by server/client runtime and category.
Server and client runtimes support resource exports within their own side;
cross-resource calls do not turn a client export into a server export.

For character actions, read the [RP animation guide](/docs/rp-animations) and its
linked client/server API entries. For a working gamemode example, browse the
[Freeroam source](https://github.com/Open2077/freeroam).

## Alpha expectations

- APIs, network protocols and resource formats may change. Back up configuration, persistent data and custom resources before updating.
- Check each system's limitations, including supported models, bodies and animations.
- Repeated reconnects can leave stale RP animation proxies or a camera hold. Restart the game and report reproduction steps if this occurs.
- Capacity depends on hardware, resources and workload; no universal player-count target is guaranteed.
- Launcher and client/server builds have separate version numbers. Use compatible releases from the official downloads.

## Report a problem

Use the [official Discord](https://discord.open2077.net) with your launcher and
client/server versions, operating system, steps to reproduce, expected result and
actual result. Mention whether it happens after reconnecting, with a specific body
type, animation, vehicle or custom resource.

Attach the relevant logs or launcher diagnostics when requested. Review files before
sharing: never post license keys, passwords, account tokens or server identity/signing
files. For a possible security issue, contact the maintainers privately instead of
posting credentials or exploit details in a public channel.
