# Test RTTI calls in the running game

Use `agent-play.ps1` and the debug bridge to exercise `Open77.rtti` in a real
client, inspect hook activity, and check that resource stop and reload release
native state. This guide uses the opt-in `open77_rtti_test` resource included in
the platform source checkout.

For the Lua signatures, supported values and hook semantics, see
[RTTI calls and hooks](/docs/rtti). For MCP installation and the full game
automation loop, see [autonomous agent testing](/docs/agent-testing).

## Prepare a test client

You need PowerShell 7, a platform source checkout, and a deployed Open77 client
that exposes `Open77.rtti` and the `rtti.state` bridge command. The fixture's
manifest declares `rtti.native` and `auto_start false`; installing it does not
start its probes automatically.

Run the commands below from the platform repository root. Set `OP77_GAME_DIR`
to an isolated test installation with its own mutable plugin, bootstrap and
configuration files. Stop games before deploying a replacement DLL. A Lua-only
fixture change does not require a client rebuild.

```powershell
$env:OP77_GAME_DIR = 'E:\Open77-Test\game'
pwsh -NoProfile -File scripts/agent-play.ps1 status
```

With the test client stopped, copy `resources/tests/open77_rtti_test` into
`red4ext/plugins/Open77/bootstrap/open77_rtti_test` under that installation.
Keep the resource directory intact, including `open77.lua` and `client.lua`.
Launch the client with a separate test identity:

```powershell
pwsh -NoProfile -File scripts/launch-extra-client.ps1 `
  -GameDirectory $env:OP77_GAME_DIR `
  -IdentityProfile rtti-test -PlayerName RttiTest
pwsh -NoProfile -File scripts/agent-play.ps1 status
```

Use the Windows process ID reported for this client in every subsequent command.
The examples use `12345`; replace it with the actual ID. A Windows process ID is
different from the multiplayer server's player ID. A separate identity does not
separate the game's shared save folder.

## Inspect the bridge

```powershell
$gameProcessId = 12345
pwsh -NoProfile -File scripts/agent-play.ps1 cmd `
  -ProcessId $gameProcessId -Command 'help'
pwsh -NoProfile -File scripts/debug-bridge.ps1 `
  -ProcessId $gameProcessId -Command 'rtti.state'
```

`agent-play cmd` uses the same process-specific bridge as `debug-bridge.ps1`.
The latter sends one command to the `Open77.Debug.<processId>` named pipe and
returns its response. Neither script turns a Lua expression into an RTTI call:
put the expression in a running client resource, then trigger its event.

Record the initial `rtti.state` counters before starting a fixture. Counts cover
the whole client process, including both the trusted bootstrap and downloaded
resource hosts.

| Counter | Meaning |
| --- | --- |
| `refs` | Pinned object references currently held by the bridge. |
| `sites` | Reflected functions with installed Lua hook subscriptions. |
| `subscribers` | Host subscriptions across those function sites. Several hooks in one host can share a subscription. |
| `active` | Hook dispatches currently in progress. |
| `calls`, `dispatches`, `fallbacks` | Cumulative activity counters; they do not reset when a resource stops. |
| `detours` | Whether the SDK entry-point detours are installed. They may remain installed with no subscribers. |

## Run the fixture outside a multiplayer session

Start the installed resource and emit its test event:

```powershell
pwsh -NoProfile -File scripts/agent-play.ps1 cmd `
  -ProcessId $gameProcessId -Command 'resource.start open77_rtti_test'
pwsh -NoProfile -File scripts/agent-play.ps1 cmd `
  -ProcessId $gameProcessId -Command 'resource.emit rtti:test:run all'
pwsh -NoProfile -File scripts/agent-play.ps1 logs `
  -ProcessId $gameProcessId -Tail 2000 -Match '\[rtti-test\]'
pwsh -NoProfile -File scripts/agent-play.ps1 cmd `
  -ProcessId $gameProcessId -Command 'rtti.state'
```

The event queues a coroutine; an `OK ... queued` response does not mean the suite
has finished. Read the matching client's log until a new
`[rtti-test] DONE stage=all passed=... failed=0` line appears. Check that the
expected cases ran and that no `FAIL` line belongs to that run. An unknown stage
can produce a zero-case completion, which is not a passing suite.

Use `native` or `scripted` in place of `all` to narrow a failure. The cases cover
scalar conversion and rejection, names and strings, object methods and reference
lifetimes, hook ordering and replacement, error fallback, continuation misuse,
self-removal, repeated object creation, and scripted calls and hooks.

Some cases deliberately throw Lua errors to test fallback behavior. Assess their
corresponding `PASS` or `FAIL` result and the final completion line. A `BUSY` line
means the previous run is still active; wait for its completion before retrying.
If the log tail no longer includes the beginning of a run, read the full log
path printed by `agent-play logs`.

## Check stop and reload cleanup

After the suite completes, `refs`, `sites`, `subscribers` and `active` should return
to their initial baseline. The fixture also provides an event that deliberately
retains one object reference and one `AbsF` hook without explicitly releasing
them. Run this outside a multiplayer session:

```powershell
pwsh -NoProfile -File scripts/agent-play.ps1 cmd `
  -ProcessId $gameProcessId -Command 'resource.emit rtti:test:retain'
pwsh -NoProfile -File scripts/agent-play.ps1 logs `
  -ProcessId $gameProcessId -Tail 200 -Match '\[rtti-test\]'
pwsh -NoProfile -File scripts/agent-play.ps1 cmd `
  -ProcessId $gameProcessId -Command 'rtti.state'
pwsh -NoProfile -File scripts/agent-play.ps1 cmd `
  -ProcessId $gameProcessId -Command 'resource.reload open77_rtti_test'
pwsh -NoProfile -File scripts/agent-play.ps1 cmd `
  -ProcessId $gameProcessId -Command 'rtti.state'
```

Wait for a fresh `[rtti-test] RETAINED` before reading the first state. With only
this fixture using RTTI and a zero baseline, the retained state is
`refs=1 sites=1 subscribers=1 active=0`. A successful reload reports a new resource
generation and returns the four live counters to zero. `detours=yes` can remain;
it is not a leaked Lua hook.

Repeat retain/reload cycles, checking each transition, to detect accumulation.
To exercise stop cleanup independently, emit `rtti:test:retain` again, wait for
`RETAINED`, then run `resource.stop open77_rtti_test` and compare counters with
the baseline. Use `resource.start open77_rtti_test` before running it again.

## Run in a multiplayer session

Prepare and start the bootstrap fixture before connecting. For a running
loopback development server configured for masterless local authentication:

```powershell
pwsh -NoProfile -File scripts/agent-play.ps1 connect `
  -DevLocal -Endpoint '127.0.0.1:11778' -ProcessId $gameProcessId
pwsh -NoProfile -File scripts/agent-play.ps1 cmd `
  -ProcessId $gameProcessId -Command 'net.state'
pwsh -NoProfile -File scripts/agent-play.ps1 cmd `
  -ProcessId $gameProcessId -Command 'char.state'
pwsh -NoProfile -File scripts/agent-play.ps1 cmd `
  -ProcessId $gameProcessId -Command 'position'
```

Before sending gameplay actions, require all three world-entry signals: a
matching `worldReady matched pristine transition` log entry, a readable position,
and `char.state` reporting `alive=yes`. `phase=active` alone is insufficient.
Use the server's normal master enrollment for a server that does not use
`-DevLocal`.

During an active session, the external bridge allows read-only diagnostics such
as `rtti.state`, but direct resource mutation is restricted. Send the test event
through the [privileged debug laboratory](/docs/debug-runtime). The authenticated
caller needs `command.client.exec` in the [server ACL](/docs/server-acl), and the
target client needs the trusted bundled `open77_debug` resource.

Replace `1` below with the target server player ID from `net.state`; keep the
Windows process ID in `-ProcessId`:

```powershell
pwsh -NoProfile -File scripts/agent-play.ps1 cmd `
  -ProcessId $gameProcessId `
  -Command "client.exec 1 return Open77.debug.command('resource.emit rtti:test:run all')"
pwsh -NoProfile -File scripts/agent-play.ps1 cmd `
  -ProcessId $gameProcessId -Command 'net.commands 10'
pwsh -NoProfile -File scripts/agent-play.ps1 logs `
  -ProcessId $gameProcessId -Tail 2000 -Match '\[rtti-test\]'
pwsh -NoProfile -File scripts/agent-play.ps1 cmd `
  -ProcessId $gameProcessId -Command 'rtti.state'
```

`server_command_sent` confirms submission only. Inspect the correlated
`result_request` entry in `net.commands`, then the fixture's new `DONE` line and
the native counters. Even a successful laboratory reply can mean only that the
resource event was queued.

To test both resource hosts, also distribute and start the fixture through the
test server's normal resource configuration. `resource.list` distinguishes
`system/open77_rtti_test` and `server/open77_rtti_test`.
`resource.emit` sends the event to both hosts, so expect one completion per
running copy. Named `resource.start`, `resource.stop` and `resource.reload`
commands prefer the downloaded copy when the same name exists in both hosts.

With one retained fixture in each host and no other RTTI users, the counters are
`refs=2 sites=1 subscribers=2`. Stopping the downloaded copy should leave
`refs=1 sites=1 subscribers=1`. The surviving bootstrap hook can be checked with
`resource.emit rtti:test:probe 4`: `AbsF(-3)` is then `4`. With both hooks still
installed, use `rtti:test:probe 5`. Disconnect before reloading or stopping the
remaining bootstrap fixture directly, and check that all live counts return to
baseline.

## Diagnose a function that does not work

| Observation | Next check |
| --- | --- |
| `function_not_found` or `ambiguous_function` | Check the class and exact decorated name. Global functions require their RTTI name; methods accept a full name or an unambiguous short name. |
| `resolve` succeeds but `call` or `hook` fails | Metadata lookup does not prove that the bridge supports the signature. Check for unsupported types, `out` parameters, argument count and instance type. |
| `resource_not_active` | Move calls and hook registration into a running resource callback or thread, outside candidate loading and stop handlers. |
| `ref_released` | Do not keep borrowed hook references after dispatch. Release persistent call results before stop or let the resource cleanup release them. |
| A hook installs but its callback never runs naturally | First call the function through `Open77.rtti.call`. Hooks cover game-thread SDK `ExecuteScripted` / `ExecuteNative` calls with supported `CStack` layout; other VM entry points, direct native calls and worker threads bypass them. |
| `permission_denied:rtti.native` | Declare `rtti.native` in the resource that owns the call or hook. The debug laboratory does not lend its privileges to that resource. |
| Counters stay above baseline | Check both hosts for running resources, pending dispatches and retained call results. A successful API reply alone does not establish cleanup. |

An arbitrary engine function may depend on a live player, world state or a
specific object even when its signature is supported. Start with the fixture's
bounded probes, then add one resource-owned call at a time. Use the dedicated
server's authority path for gameplay changes.

## Keep the validation evidence

Record the client revision and deployed DLL hash, the target process and resource
generation, the matching fixture completion lines, and before/after lifetime
counters. For multiplayer behavior, also retain the world-entry evidence and
correlated laboratory results. A screenshot records the visible outcome; it does
not replace those state checks.

The host and client regression suites complement the game probes. From an agent
shell, the platform build entry point is:

```powershell
pwsh -NoProfile -File scripts/build-all.ps1 -Target client -AgentShell -NoDeploy
```

`-NoDeploy` leaves the game installation unchanged. Run the live campaign against
the resulting DLL after deploying it to the stopped test installation; tests of
another DLL do not validate that artifact. End the campaign by stopping the
fixture, checking the counters, and closing only the test processes you started.
