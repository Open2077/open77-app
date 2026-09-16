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

Slash commands are resolved **on the client first**, then on the server. A line beginning with `/`
is tokenised, offered to the client command registry through `ExecuteCommand`, and only forwarded to
the server's `RegisterCommand` and ACL path when no client resource claims it. Either way it is not
a chat message and is never broadcast to other players.

That ordering is what makes a client `RegisterCommand` useful: a HUD toggle answers locally in the
same frame instead of making a round trip to ask the server about a setting the server does not own.
`unknown_command` from the client half is not an error — it is the signal to forward — while any
other refusal (`command_restricted`, an unterminated quote) is shown in chat and the line stops
there rather than being sent to a server that would only answer `unknown_command` a second time.

Completions merge both halves. The composer asks the server for its suggestion list on open and adds
every non-restricted client command from `GetRegisteredCommands()`; a command registered with a
`{ help, parameters }` descriptor shows that text, and one registered without shows which resource
owns it.

Built-in utility commands include:

```text
/id    show the temporary session player ID
/pos   copy the current world position as Lua
/rot   copy the current quaternion and yaw as Lua
```

`/pos` and `/rot` write only on the requesting client and display their result in chat and through
the shared notification UI. See the [clipboard guide](clipboard.md) for the API, permission, output
formats, limits, and failure reasons.

## Server API: `Open77.chat`

A server resource does not have to know the event names or the message shape to talk in chat.
`Open77.chat` is the convenience layer over what `open77_chat` already listens to.

```lua
Open77.chat.send(playerId, message)          -- one player; -1 or nil = everyone
Open77.chat.broadcast(message)               -- same as send(-1, message)
Open77.chat.onMessage(function(playerId, playerName, text) end)
Open77.chat.addSuggestion(target, command, help, parameters)
Open77.chat.addSuggestions(target, list)
Open77.chat.removeSuggestion(target, command)
Open77.chat.clear(target)
```

`message` is a plain string, or the full table the chat UI renders:

```lua
Open77.chat.broadcast({
    type = "system",                -- "player" | "system"
    author = "DISPATCH",
    text = "Heat on the docks.",
    color = { 0, 229, 255 },
})
```

`send`, `broadcast`, `addSuggestion`, `addSuggestions`, `removeSuggestion` and `clear` return
`true`, or `false, reason`. `onMessage` returns the handler id, so it can be passed to
`RemoveEventHandler`; it returns `nil, "invalid_chat_handler"` for a non-function. Other reasons:
`invalid_chat_target`, `invalid_chat_message`, `invalid_chat_command`, `invalid_chat_suggestion`,
and the host bus's own `resource_preparing` (the call ran at the top level of the script, before
the chunk had loaded -- move it into `onResourceStart`, a command or an event handler) and
`event_queue_limit`.

`playerId` and `target` are **numbers**: an integer id, `-1` for everyone (`send` also takes
`nil`). A player id that arrived through a host event -- `onPlayerReady`, `onPlayerDisconnected`,
`onPlayerEnteredVehicle` -- is a string, and the facade refuses it with `invalid_chat_target`:
pass `tonumber(playerId)`. `source` inside a `RegisterNetEvent` or `RegisterCommand` handler is
already a number.

### The events the chat raises for the server

| Event | Payload | Raised |
|---|---|---|
| `chat:ready` | `()` | By the `open77_chat` client, through `TriggerServerEvent`, once its UI is up and again whenever it re-requests suggestions. Handle it with `RegisterNetEvent`: `source` is the player, there are no arguments. The usual place to `addSuggestions(source, ...)`; players already connected when a resource starts had their `chat:ready` earlier, so also publish once with `-1` from `onResourceStart`. |
| `chat:message` | `(playerId, playerName, text)` | Every message the authority accepted, after the `chatMessage` veto ran; what `Open77.chat.onMessage` subscribes to. |
| `chatMessage` | `(playerId, playerName, text)` | Cancellable, raised before a message is shown: a handler that calls `CancelEvent()` drops it. |

### It is transport, not a second authority

Every call above is one `TriggerEvent` on the host-wide bus, and `open77_chat` remains the only
resource that decides anything. Three consequences worth knowing before you build on it:

- **It grants nothing.** The facade never reaches a client itself, so it needs no
  `network.events`; the authority does that, with its own permissions. Any resource could already
  publish these events by hand — this only saves it from knowing their names.
- **It cannot tell you nobody listened.** If no chat authority is running, the calls still return
  `true`: `TriggerEvent` publishes to the bus, and the bus does not know who cares.
- **To refuse a message, do not use `onMessage`.** Observation happens *after* the verdict. The
  veto point is the existing cancellable `chatMessage` event:

  ```lua
  AddEventHandler("chatMessage", function(playerId, playerName, text)
      if isMuted(playerId) then CancelEvent() end
  end)
  ```

### Ordering

Delivery is asynchronous: a `send` reaches clients on the next tick boundary, not inside your call.

**Two sends in the same tick arrive in the opposite order.** That is the resource scheduler, not
the chat layer — `__open77_tick` collects ready tasks back to front, so the last one scheduled runs
first, and it has always behaved this way for every callback on the server. It only becomes visible
here because chat is the one surface where line order is meaningful. If you are printing a block
that must read in order, put the lines in different ticks:

```lua
CreateThread(function()
    for _, line in ipairs(report) do
        Open77.chat.send(playerId, line)
        Wait(0)
    end
end)
```
