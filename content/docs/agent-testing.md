# Autonomous agent testing

Open77 ships a testing toolkit that lets an AI agent — or any harness without a human at the
screen — drive the actual game: launch the full stack, log into a server through the exact path a
player clicks, act in the world, and read the result. It is the game's equivalent of the web
developer's edit–reload–look cycle: every step is a command, every result is readable from outside
the process.

Two pieces, both versioned in the platform repository:

| Piece | Path | Role |
|---|---|---|
| MCP server | `scripts/agent-mcp.ps1` | exposes the whole loop as typed `open77_*` tools over MCP (stdio) |
| Claude Code skill | `.claude/skills/open77-testing/SKILL.md` | teaches an agent *when* and *how* to use them |

The MCP server is a plain PowerShell 7 script with no dependencies and no build step; it starts
with the agent session and ends with it. Screenshots come back as real images in the conversation,
so a multimodal agent sees what the player sees.

## What this means for server owners

Open77 development is validated in the running game, not only in unit tests. The loop has been
proven end to end: stack launch, enrolment with the master, connection, pristine character load,
crossing the "press any key to continue" screen, a server teleport confirmed by reading the
player's position, and screenshots at every step — including two clients connected to the same
server under two distinct accounts, each seeing the other's puppet and nameplate on screen.

The same toolkit applies to your own RP server and resources. `open77_client_connect` takes the
server endpoint, `open77_chat` speaks through the real chat pipeline — the thing RP servers are
built on — and `open77_scenario` turns a validation that passed once into a repeatable regression
test with assertions and automatic failure screenshots. An agent asked to implement or validate a
feature is expected to run this loop itself rather than ask a human to launch the game and report
what they see.

## The loop

```text
open77_status          # always first: what is already up, and how much VRAM is left
open77_build           # only after changing C++ — stops clients, builds, verifies deploy (~4 min)
open77_stack_up        # master (8090) + dev server (UDP 11778) + one client + debug bridge
open77_client_connect  # full human login path; returns only when the player is alive in-world
   … act and observe …
open77_down            # stop_game / stop_server to tear down
```

Changed only Lua? Skip `open77_build`: `open77_resource_sync` copies the resource and reloads it.
Server-only resources are served live from the repository — nothing to copy.

## The tools

The authoritative list is the `$script:Tools` table in `scripts/agent-mcp.ps1`, which also carries
the full input schema of every tool.

| Tool | Role |
|---|---|
| `open77_status` | Stack state: master (8090), dev server (UDP 11778), free VRAM, and every game instance with its bridge, session phase, and position. Always start here. |
| `open77_build` | Rebuilds and redeploys the client through the repository's `build-all` script (`-Target client` by default). Stops all games first — a mapped DLL cannot be replaced. Takes ~3–4 minutes; tests are skipped by default for fast iteration. |
| `open77_stack_up` | Brings up the stack: local master, dev server, one game client with a reachable debug bridge. Idempotent. |
| `open77_client_launch` | Adds a game instance without touching the others, with a VRAM-margin guard (`force` to override). `identity_profile` gives the instance its own account; `player_name` names a freshly created one. |
| `open77_client_connect` | Connects an instance through the complete human login path — master enrolment, connection, resource download, pristine load, continue screen — and returns only on proof of life (`char.state alive=yes`). Takes 1–3 minutes. |
| `open77_resource_sync` | Copies and reloads a client-side Lua resource without rebuilding the DLL, and returns the resource generation to prove the reload. Explicit reload is refused during an active session — sync before connecting, or disconnect first. |
| `open77_cmd` | The main verb: a text command to the instance's debug bridge (one-line OK/ERR reply). Unknown bridge commands are forwarded to the server as slash commands (`tpc`, `goto`, `spawn`, `car`, `revive`, …), subject to the same ACL a player faces. `open77_cmd help` lists the whole bridge table. |
| `open77_snapshot` | The **data** photograph, as structured JSON: network session, character (position, health, weapon, vehicle, locomotion states), camera, vehicles, and optionally nearby entities. The source of truth for what is happening in-game. |
| `open77_nettrace` | Packet-level telemetry: sent/received counters plus recent packets as `direction:kind:sequence:bytes:reliable`. The channel for replication desyncs, which a screenshot cannot show. |
| `open77_chat` | Sends a chat message as this client through the real chat pipeline (a text starting with `/` is treated by the server as a command). |
| `open77_screenshot` | Captures the game window and returns it as a PNG image — the eye of the loop, for UI, rendering, and catching a modal panel that has swallowed input. |
| `open77_input` | Keyboard and mouse injection (SendInput): walk with `keys=["forward"]` and a long `hold_ms`, turn the camera with relative `mouse_move_x/y`, use or enter a vehicle with `f`, jump with `space`, fire with `click=left`, aim with `click=right`. Movement keys are physical scan codes, valid on any keyboard layout. |
| `open77_scenario` | Runs a declarative list of steps — each a tool call with an optional regex `assert` on the result text — stopping at the first failure (unless `continue_on_error`) and screenshotting failures. Returns a per-step pass/fail report. |
| `open77_logs` | Tail of the client, dev server, or master log, with an optional regex filter. Useful client filters: `shell-transition` (connection), `error`. |
| `open77_crashinfo` | Crash triage: the most recent `CrashInfo.json`, the client log tail, and the list of still-alive instances — the moment a client dies. |
| `open77_down` | Cleanly disconnects an instance; `stop_game` also stops the process, `stop_server` stops the dev server and master. |

Prefer commands over input: they are deterministic and do not need window focus.

## How the connection works

The path is **exactly the one a human clicks**; nothing is bypassed.

1. The connect step emits `open77:shell:autoconnect <endpoint> <master-id>` through the debug
   bridge.
2. The shell resource receives the event and refreshes the given master's catalogue, which
   **enrols the identity** with that authority — a certificate is issued by a single authority, so
   a client enrolled elsewhere is rejected by the local server.
3. The same `startConnection` the interface runs then executes: character bootstrap reset,
   `Open77.network.connect`, signed resource download, character resolution, pristine load, world
   handoff.
4. Progress is followed on two channels: `net.state` on the bridge (network phase, playerId,
   error) and the `[shell-transition]` log lines (bootstrap, pristine load, handoff).
5. The game then shows "press any key to continue" — sometimes tens of seconds after the handoff.
   The connect step presses Enter **until proof of life**: `char.state` reads `alive=no health=0`
   while the screen holds and `alive=yes health=100` once in-game.

## Observing — data first, pictures second

Raw state comes before the image. Position, health, network phase, and entities are read through
the bridge; the screenshot only verifies what the player *sees*.

| Question | Source |
|---|---|
| Everything essential, structured | `open77_snapshot` (JSON: network, character, camera, vehicles) |
| Are packets flowing, in which direction? | `open77_nettrace` |
| Does chat work end to end? | `open77_chat`, then a screenshot (the message fades after a few seconds) |
| Why did this client die? | `open77_crashinfo` |
| Which network phase is the client in? | `open77_cmd` with `net.state` — `offline/resolving/connecting/handshaking/active/failed/rejected` |
| Is the player incarnated, and where? | `open77_cmd` with `position` (`ERR player_unavailable` otherwise) |
| What happened during the connection? | `open77_logs` with `match=shell-transition` |
| Are the server resources active? | `open77_cmd` with `resource.distribution` |
| What is on screen? | `open77_screenshot` |

During an active session the bridge is deliberately restricted to read-only diagnostics and safety
hatches. **Acting** in the world goes through server commands — forwarded automatically by
`open77_cmd` for any unknown command name — under the server's ACL, the same authority path a
player follows.

## Repeatable scenarios

`open77_scenario` turns a manual validation into a regression test the moment it passes:

```json
{"steps": [
  {"name": "session is active", "tool": "open77_cmd",
   "args": {"command": "net.state"}, "assert": "phase=active"},
  {"name": "player is alive", "tool": "open77_cmd",
   "args": {"command": "char.state"}, "assert": "alive=yes"},
  {"name": "chat delivered", "tool": "open77_chat",
   "args": {"text": "regression check"}, "assert": "chat_sent"}
]}
```

Each step is an `open77_*` tool call; a failed assertion is reported with the actual output and a
PNG of the screen at the moment of failure.

## Several players at once

`open77_client_launch` with `identity_profile` gives an instance **its own account**
(`player_name` names a freshly created one); without it, every instance shares the same identity
file, so the same account under the same name. Connect instances **one at a time** — crossing the
continue screen goes through the keyboard, hence the foreground — and pass `pid` to every
subsequent call. Two in-world clients is the practical ceiling on a 12 GB graphics card.

## Rules paid for by real failures

These rules come from measured crashes and dead ends, not from caution. They are what separates a
real verdict from a false positive.

- **World entry is proven by three things together**: the log line `worldReady matched pristine
  transition`, a readable `position`, and `char.state alive=yes`. An "active" session is not an
  incarnation, and `position` already answers in the menu scene.
- **Never send a server action (teleport, spawn, …) to a client whose `char.state` says
  `alive=no`.** That is the "press any key to continue" gate: a `tpc` received there crashed the
  client outright, with `CrashInfo.json` pointing at the teleport destination. This is why the
  connect tool refuses to return before proof of life.
- **A launched instance takes 60–150 seconds to appear.** A process shows up after roughly a
  minute and its window some ten seconds later. Do not conclude failure early.
- **VRAM is the real limit on concurrent clients** — roughly 2.7 GiB at the menu and up to
  4.2 GiB in-world per instance. Lowering graphics settings barely helps, because the streamer
  budgets against the card, not the settings. An instance without VRAM dies silently.
- **A stray keypress can open a modal panel** (the radio, for instance) that then eats all
  gameplay input. Screenshot to see it; `esc` or `c` closes it.
- **Deploying a DLL requires every game stopped**; Lua-only changes hot-reload.
- **Explicit resource reload is refused during an active session** — sync before connecting, or
  disconnect first.
- **All instances share one save folder**, and autosave starts on world entry. Keep a single
  client in-world when it matters, and back the folder up before a multi-client session.

## Installation

### 1. Declare the MCP server

Declare the server in the `.mcp.json` your MCP client reads (a complete template ships as
`.mcp.json.example` at the repository root):

```json
{
  "mcpServers": {
    "open77": {
      "type": "stdio",
      "command": "pwsh",
      "args": ["-NoProfile", "-ExecutionPolicy", "Bypass",
               "-File", "<path-to-repo>/scripts/agent-mcp.ps1"]
    }
  }
}
```

Under Claude Code, a project `.mcp.json` must be approved: add `"open77"` to
`enabledMcpjsonServers` in `.claude/settings.local.json`.

Prerequisites: PowerShell 7 (`pwsh`), the `OP77_GAME_DIR` environment variable pointing at the
game installation, and a deployed Open77 client (`./scripts/build-all.sh`).

### 2. Install the skill

`.claude/skills/open77-testing/SKILL.md` is versioned: a clone of the repository has it already.
Claude Code discovers project skills in `.claude/skills/` **at the session root**. If the session
is opened on the repository itself, nothing to do.

If the session is opened on a parent folder, make the folder visible from that root — a junction
avoids maintaining two copies:

```powershell
New-Item -ItemType Junction -Path '<session-root>\.claude\skills' `
         -Target '<path-to-repo>\.claude\skills'
```

To install machine-wide rather than per project, copy the `open77-testing` folder into
`~/.claude/skills/`.

**Skills are loaded at session start**: after installing, open a new session. Verify with
`/skills`, or simply ask for a testing task — the agent should load it on its own.

### 3. Verify

In a new session, on the repository:

```text
open77_status
```

The reply reports the master (8090), the dev server (11778), free VRAM, and any running game
instances. From there the whole loop is two calls: `open77_stack_up`, then
`open77_client_connect`.

## Extending the toolkit

The MCP server is a versioned script: adding a tool means adding an entry to the `$script:Tools`
table in `scripts/agent-mcp.ps1` — a description, an `inputSchema`, a `handler` — and restarting
the session. An agent blocked by a missing tool can therefore create it itself; that is
deliberate. Any durable addition deserves a line in the skill and in the reference guide.

## Where the details live

In the platform repository, `docs/agent-autonomous-testing.md` is the full reference — the
connection mechanism, the observability table, and every measured pitfall with its evidence — and
`docs/agent-setup.md` covers installation. The skill file is the short operating procedure an
agent loads into context. The equivalent standalone scripts (`agent-play.ps1`,
`capture-game.ps1`, `game-input.ps1`, `launch-extra-client.ps1`) remain usable as-is; the MCP
server wraps them.
