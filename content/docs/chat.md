# Chat, slash commands, and completion

The official `open77_chat` package is documented in
[`docs/chat.md`](../docs/chat.md). It provides English-only UI text, authenticated slash-command
dispatch, automatic suggestion discovery, history, and keyboard completion.

Quick usage:

```text
T                 open chat
Enter             send or execute
Escape            close
Arrow Up/Down     select a suggestion while typing /
Tab               complete the selected command
```

Slash commands use the same server-side `RegisterCommand` and ACL path as the Open77 terminal;
they are not chat messages and are never broadcast to other players.

Built-in utility commands include:

```text
/id    show the temporary session player ID
/pos   copy the current world position as Lua
/rot   copy the current quaternion and yaw as Lua
```

`/pos` and `/rot` write only on the requesting client and display their result in chat and through
the shared notification UI. See the [clipboard guide](clipboard.md) for the API, permission, output
formats, limits, and failure reasons.
