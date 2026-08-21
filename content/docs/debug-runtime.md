# Privileged in-game Lua laboratory

CyberM includes an ACL-controlled development path for testing client Lua, native laboratory
commands, and the existing REDscript polling bridge without rebuilding the plugin after every
experiment.

This is intentionally not a public gameplay API. It is available only inside the bundled local
`cyberm_debug` resource. A downloaded server resource cannot enable it by adding a permission to
its manifest.

## Admin command

Run this from the in-game CyberM terminal or chat:

```text
client.exec <playerId> <lua source>
```

The command is registered as restricted. The server checks the authenticated caller against ACL
permission `command.client.exec`, sends the source to the one requested session ID, and correlates
the reply with the original admin. The bundled owner ACL using `"permissions": ["*"]` already has
access.

Examples:

```text
client.exec 1 return 6 * 7
client.exec 1 return CyberM.character.state()
client.exec 1 return CyberM.debug.command('vehicle.list')
client.exec 1 return CyberM.debug.command('vehicle.status 4294967297')
client.exec 1 return CyberM.debug.command('vehicle.glass 4294967297 windows_front_left')
client.exec 1 return CyberM.debug.redscript('debug.trace:hello')
```

Use single quotes inside the Lua expression because the server command tokenizer reconstructs the
source from the remaining whitespace-separated arguments.

## Position and rotation clipboard commands

Any authenticated player can copy their own live transform from chat:

```text
/pos
/rot
```

`/pos` writes a reusable Lua field such as
`position = { x = -1442.200000, y = 127.400000, z = 18.000000 }`. `/rot` writes the complete
quaternion plus horizontal yaw. The server command targets the authenticated caller, while the
downloaded `cyberm_chat` client reads the transform and writes the clipboard. The server receives a
bounded success result but never sees prior clipboard contents. The result appears in chat and in a
middle-left WebUI notification.

Ordinary client resources can use the same write-only API after declaring the permission:

```lua
permission "clipboard.write"

local ok, reason = CyberM.clipboard.setText("text copied by my resource")
```

See the [clipboard guide](clipboard.md) for limits, failure reasons, complete output formats, and
the client/server routing model.

## Client debug namespace

Only `cyberm_debug`, on the trusted local host, can successfully call these functions:

```lua
local ok, result = CyberM.debug.eval("return CyberM.camera.view()", "camera-probe")
local ok, result = CyberM.debug.command("vehicle.list")
local ok, result = CyberM.debug.redscript("debug.trace:glass-probe")
```

- `eval(source, label?)` compiles a text-only Lua chunk in the existing `cyberm_debug` VM. Returned
  primitives and serializable tables are converted to bounded text.
- `command(commandLine)` calls the registered native laboratory table directly on the game thread.
  It does not forward unknown commands to the server. The vehicle laboratory is registered here,
  including `vehicle.glass`, `vehicle.tire`, `vehicle.body`, `vehicle.part`, and repair operations.
- `redscript(command)` queues an opaque command through `CyberMScriptBridge.reds`. REDscript polls
  and executes it from a genuine script frame. `debug.trace:<text>` is the initial observable probe;
  further `debug.*` handlers can be added on the REDscript side without changing the C++ bridge.

## Safety and limits

- ACL authorization happens before Lua source is dispatched.
- Execution is targeted, never broadcast.
- Source is limited to 32 KiB, result text to 8 KiB, and replies time out after 10 seconds.
- Lua runs with the resource host's 32 MiB memory quota, 500,000-instruction resume quota, and 2 ms
  frame budget. Infinite loops fail with `CyberM script execution budget exceeded`.
- The normal sandbox remains intact: no `io`, `os`, `debug`, `package`, `load`, bytecode, filesystem
  escape, raw REDengine pointer, or foreign resource global is exposed.
- The server-distributed copy of `cyberm_debug` is excluded from the downloaded client host. Its
  server script still registers `client.exec`; only the trusted bundled client copy evaluates it.

Keep `debug.runtime` out of ordinary resource manifests. If a deployment should not expose this
laboratory at all, remove `cyberm_debug` from the server resource set or remove
`command.client.exec` from every ACL principal.
