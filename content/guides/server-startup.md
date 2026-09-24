# Server startup arguments and logging

Configure an OPEN//77 dedicated server from a hosting panel, service definition or
shell without rewriting `server.jsonc`. Startup overrides and configurable log
levels require server **2.31.13+op77.91 or newer**.

Complete the [server setup](/docs/host-a-server) and configure your
[license](/docs/server-licensing) first. Run commands from the unpacked server
directory. Startup options are read when the process starts; restart the server
after changing them.

## Choose a log level

Linux:

```bash
./Open77.Server --config server.jsonc --log-level debug
```

Windows PowerShell:

```powershell
.\Open77.Server.exe --config server.jsonc --log-level debug
```

The level is a minimum severity, not a numbered verbosity setting:

| Level | Open77 log entries retained |
| --- | --- |
| `trace` | All levels, including available trace diagnostics. |
| `debug` | Debug, information, warnings and errors. |
| `info` | Information, warnings and errors. This is the default. |
| `warn` | Warnings and errors. |
| `error` | Errors only. |

Use `info` for normal operation and `debug` when investigating a problem.
Debug and trace include runtime/simulation details and successful resource-download
requests as well as failures. Detailed logging can produce substantial output on
a busy server; return to `info` after collecting the relevant evidence.

You can also add a top-level section to `server.jsonc`:

```jsonc
"logging": {
  "level": "info"
}
```

Or use `--set logging.level=debug` or the environment variable
`OP77_CONFIG__LOGGING__LEVEL=debug`.

Filtering applies to Open77's structured console output, retained log buffer and
Warden's live console. Open77 resource `print`/information messages are hidden at
`warn` and `error`; filtered messages cannot be recovered from Warden afterwards.
Startup errors and mandatory setup instructions remain visible independently of
the filter. Framework, third-party and native diagnostics can have separate logging
controls; this is not a blanket filter over everything written to standard output.
Low-level native transport diagnostics use the separate `OP77_GNS_DEBUG` option.

### Legacy verbose switch

`--verbose` or `logging.verbose=true` selects `trace`.
`--no-verbose` or `--verbose=false` selects `info`.

An explicit, non-null `logging.level` always takes priority over `logging.verbose`,
even when `--verbose` appears later on the command line. For example, a file with
`"level": "warn"` remains at `warn` when you add only `--verbose`. Use
`--log-level debug` to change the level explicitly, or clear it to use the legacy
switch again:

```bash
./Open77.Server --config server.jsonc --set logging.level=null --verbose
```

## Override any configuration field

The following forms are equivalent:

```bash
./Open77.Server --set network.maximumPlayers=64
./Open77.Server --network.maximumPlayers 64
./Open77.Server --network.maximumPlayers=64
./Open77.Server --set=network.maximumPlayers=64
```

Field names are case-insensitive. These options correspond to configuration
fields, not Lua API names. Download settings are under `resources.download`,
not a top-level `download` section.

Precedence, from lowest to highest:

1. Built-in defaults.
2. The selected JSONC configuration file.
3. `OP77_CONFIG__...` environment variables.
4. Command-line overrides.

When the same field occurs repeatedly on the command line, the last value wins,
including when mixing shorthand and dotted options. Semantic validation runs
after overrides, so a hosting panel can complete an unset public endpoint in a
template. The file must still have valid JSONC syntax and field types.

Strings are plain text; quote values containing spaces for your shell. Booleans
use `true` or `false`. Arrays and objects use JSON. `null` clears a nullable value;
the JSON string `"null"` is a literal string. Arrays can be replaced as a whole or
an existing element changed using a numeric dotted index.

For example, in Bash:

```bash
./Open77.Server --config server.jsonc \
  --name "My community server" \
  --set 'identity.tags=["roleplay","english"]' \
  --set 'convars.server_region=eu' \
  --log-level info
```

Overrides affect the running process only: they do not rewrite `server.jsonc` or
its comments. Save the arguments/environment in your hosting panel or service
definition to keep them across restarts. Warden edits the underlying file; an
override of the same field will still win at the next boot.

### Common startup options

| Option | Purpose |
| --- | --- |
| `--config PATH` | Select the configuration file; `--config=PATH` also works. Default: `server.jsonc`. |
| `--set section.field=value` | Override any configuration field; repeat as needed. |
| `--public-ip IP` | Fill advertised game/download addresses from a provider-supplied IP. |
| `--port NUMBER` | `network.port`: game UDP port. |
| `--public-endpoint HOST:PORT` | `network.publicEndpoint`: externally reachable game address. |
| `--max-players NUMBER` | `network.maximumPlayers`. |
| `--name TEXT`, `--description TEXT` | `identity.name` and `identity.description`. |
| `--visibility Public\|Unlisted\|Private` | `identity.visibility`: server directory visibility. |
| `--tick-rate NUMBER`, `--snapshot-rate NUMBER` | `simulation.tickRate` and `simulation.snapshotRate`. |
| `--log-level LEVEL` | `logging.level`: minimum Open77 log severity. |
| `--verbose`, `--no-verbose` | Legacy logging switch; an explicit level takes priority. |
| `--no-setup` | Skip the interactive first-run wizard for an already provisioned server. |
| `--setup`, `--reconfigure` | Open the setup wizard. |
| `--setup-listen URL` | Set the first-run setup listener address. |
| `--check-config` | Validate the effective configuration without starting the server. |
| `--help`, `-h` | Show usage without starting first-run setup. |

## VPS and hosting-panel example

Replace `203.0.113.10` with your VPS's actual public IP. The provider or
autoinstaller supplies it; the server does not discover the public IP itself.

```bash
./Open77.Server --no-setup --config server.jsonc \
  --public-ip 203.0.113.10 --port 11778 --max-players 32 \
  --log-level info
```

PowerShell equivalent:

```powershell
.\Open77.Server.exe --no-setup --config server.jsonc --public-ip 203.0.113.10 --port 11778 --max-players 32 --log-level info
```

With the default download port, `--public-ip` supplies these values unless the
corresponding fields are explicitly overridden at startup:

| Configuration field | Generated value |
| --- | --- |
| `network.publicEndpoint` | `203.0.113.10:11778` |
| `resources.download.enabled` | `true` |
| `resources.download.listenUrl` | `http://0.0.0.0:11779/` |
| `resources.download.publicBaseUrl` | `http://203.0.113.10:11779/` |

The game address uses the final game port. Download addresses use the configured
download-listener port, which defaults to `11779`. Binding to `0.0.0.0` listens
on all IPv4 interfaces; it is not an address players can connect to.

To specify every field yourself:

```bash
./Open77.Server --no-setup --config server.jsonc \
  --set network.port=11778 \
  --set network.publicEndpoint=203.0.113.10:11778 \
  --set network.maximumPlayers=32 \
  --set resources.download.enabled=true \
  --set resources.download.listenUrl=http://0.0.0.0:11779/ \
  --set resources.download.publicBaseUrl=http://203.0.113.10:11779/ \
  --log-level info
```

Specific environment or command-line overrides win over `--public-ip` regardless
of argument order, including children supplied in a whole JSON section. This lets
you retain an HTTPS public URL, a loopback listener behind a reverse proxy, or a
different external NAT port. A file value alone does not prevent `--public-ip`
from replacing an old loopback address.

`--public-ip` accepts an IPv4 or IPv6 literal without a port. IPv6 advertised
addresses are bracketed automatically; for an IPv6 download listener, explicitly
set `--resources.download.listenUrl=http://[::]:11779/`.

Allow game traffic on **UDP 11778** and resource downloads on **TCP 11779**, or your
chosen ports. Configure NAT/container port mappings separately. Startup arguments
do not change firewall rules. The download listener is separate from Warden and
the resource HTTP-handler listener; `--public-ip` does not configure those.
`--no-setup` does not create a license, install resources or bypass authentication.

## Environment variables

Use the prefix `OP77_CONFIG__` and replace each dot in a configuration path with
two underscores. For Linux, containers and hosting panels:

```bash
export OP77_PUBLIC_IP=203.0.113.10
export OP77_CONFIG__NETWORK__PORT=11778
export OP77_CONFIG__NETWORK__MAXIMUMPLAYERS=32
export OP77_CONFIG__RESOURCES__DOWNLOAD__LISTENURL=http://0.0.0.0:11779/
export OP77_CONFIG__LOGGING__LEVEL=debug
./Open77.Server --no-setup --config server.jsonc
```

Windows PowerShell:

```powershell
$env:OP77_PUBLIC_IP = "203.0.113.10"
$env:OP77_CONFIG__NETWORK__PORT = "11778"
$env:OP77_CONFIG__NETWORK__MAXIMUMPLAYERS = "32"
$env:OP77_CONFIG__LOGGING__LEVEL = "debug"
.\Open77.Server.exe --no-setup --config server.jsonc
```

`OP77_PUBLIC_IP` is the fallback for `--public-ip`; specific `OP77_CONFIG__...`
address fields still take priority over the generated values. These shell commands
set variables for that shell and its child processes, not permanently for a
Windows service or systemd unit. Configure the service/panel environment separately.

Keep secrets in protected environment variables rather than command-line
arguments, which process listings or panel logs can expose. Existing secret
variables remain available: `OP77_LICENSE_KEY` and `OP77_DATABASE_CONNECTION`.
See [SQL database setup](/docs/database) for database credentials and permissions.

## Validate and troubleshoot

Append `--check-config` to the same command and environment you intend to use:

```bash
./Open77.Server --no-setup --config server.jsonc \
  --public-ip 203.0.113.10 --port 11778 --max-players 32 \
  --log-level debug --check-config
```

Exit code `0` means configuration validation passed. Exit code `2` means a
configuration/argument error; the diagnostic identifies the affected field.
Check mode does not open listeners or setup, contact the Master, run resources,
or write state. It does not test firewall reachability, database credentials or
installed resource contents. Use `info` or `debug` to include the network summary;
at `warn`/`error`, the validation result remains visible but information-level
summary lines are filtered out.

| Symptom | What to check |
| --- | --- |
| Unknown option or field | Use `--help`; use `resources.download.*`, not `download.*`. |
| Invalid value or array index | Check the JSON type, range and existing array length. Fix JSONC syntax/type errors in the file before applying overrides. |
| `--verbose` appears to do nothing | A non-null `logging.level` is set in the file, environment or command line. Set `--log-level debug` explicitly. |
| Warden changes disappear after restart | A startup argument or environment variable still overrides that field. |
| No resource prints in Warden | `warn` and `error` suppress information-level messages. Restart with `info` or `debug`. |
| Server is listed but downloads fail | Check the advertised public download URL and TCP port from outside the VPS. A valid configuration does not prove network reachability. |

When requesting help, include the server version, exit code, relevant log lines
and startup arguments with secrets removed. Do not share an unredacted
environment dump or configuration file.
