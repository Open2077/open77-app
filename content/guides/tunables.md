# Operator tunables

Every number in a resource's config is a decision its author made once. Some of
them the owner of a server running that resource will want to make differently,
and will want to make *tonight* — between rounds, without a restart and without
editing Lua over SSH.

A resource **declares** which of its numbers are tunable, with bounds and a
description written for an operator. Warden's Tuning tab renders that
declaration as a form, and the owner moves the values live. The panel can only
move a value inside the declaration, and it never edits Lua.

`Open77.tunables` is **server-side only**. It does not exist in the client
runtime.

## The API

| Function | Signature | Result |
|---|---|---|
| `Open77.tunables.declare` | `(table)` | Declare this resource's tunables and return a live proxy. Raises if the declaration is malformed. |
| `Open77.tunables.get` | `(key)` | The current value, or `nil, reason` for an undeclared key. |
| `Open77.tunables.set` | `(key, value)` | Write one. Returns `ok, message, pending`. Same validation and persistence as a panel write. |
| `Open77.tunables.capture` | `()` | A frozen plain table of every current value, to pin onto one match. |
| `Open77.tunables.pending` | `()` | Key → value for changes waiting on a boundary. |
| `Open77.tunables.promote` | `()` | Adopt everything waiting; returns the list of keys that moved. |

The owning resource — and no other — receives
`onTunableChanged(key, value, pending)` after every accepted write.

## Declaring

```lua
-- shared/config.lua — data, beside everything else you tune
Config.tunables = {
    bustRadius = { value = 15.0, min = 5.0, max = 50.0, unit = "m", apply = "next_match",
                   label = "Bust radius", group = "Chase",
                   description = "How close the cop must be for the pursuit meter to fill." },
    meterFill  = { value = 3.0, min = 0.5, max = 30.0, unit = "s", apply = "live",
                   label = "Meter fill", group = "Chase" },
}
```

```lua
-- server/main.lua — the call is server-only
Tune = Open77.tunables.declare(Config.tunables)
```

**That split is not cosmetic.** The table is data and belongs with the rest of
your configuration; the `declare` call must be server-side, because
`Open77.tunables` does not exist on the client. Put `declare` in a
`shared_script` and every connecting player fails the resource set. The
declaration table itself *is* downloaded to clients, so keep its prose
publishable.

| Field | Meaning |
|---|---|
| `value` | The default. Required. |
| `type` | `number`, `integer`, `boolean`, `string`, `enum`. |
| `min`, `max` | Enforced on every write. |
| `choices` | For `enum`. Enforced. At most 32. |
| `step`, `unit` | Presentation only — never enforced. |
| `apply` | `live`, `next_round` or `next_match`. See below. |
| `label`, `description`, `group`, `order` | How the panel renders it. |

Limits: 128 tunables per resource, 64 KiB of declaration, 32 choices,
256-character strings.

The declaration is a contract, not a hint. `min`/`max`, the type and the choice
list are enforced on **every** write — from the panel, from the console, and
from your own `Open77.tunables.set`. Pick bounds inside which your resource is
still doing something sensible; anything outside them is not a setting, it is a
bug report.

Write the `description` for someone who has never read your code. It is the only
thing standing between an owner and a number they will change by feel.

## Read at the point of use

The proxy returned by `declare` **reads through to the host on every access**.
`Tune.bustRadius` is a call, not a field.

```lua
-- correct
if distance <= Tune.bustRadius then bust(playerId) end
```

```lua
-- wrong, and quietly so
local radius = Tune.bustRadius              -- file scope: frozen at load
CreateThread(function()
    while true do
        Wait(200)
        if distance <= radius then bust(playerId) end
    end
end)
```

The second reads its value once, at load, and never again. The panel goes on
reporting the new number, so the symptom is "live tuning does nothing" and the
cause is three files away.

**A local inside a function is fine** — it lives for one call. A local at file
scope is the bug.

A misspelled key **raises** rather than returning `nil`, which is the one thing
that makes this catchable at all.

## When a change is allowed to land

Three tools, in increasing strength.

| `apply` | What the host does | Use it for |
|---|---|---|
| `live` | The next read sees the new value. | Anything no rule in flight depends on: a HUD colour, a lobby radius, an announcement interval. |
| `next_round` / `next_match` | Stores and persists the value immediately, but `Tune.key` keeps returning the old one until you call `promote()`. | A rule that decides an outcome, in a resource that runs **one** round at a time. |
| `capture()` | You freeze the whole set onto a match, and that match's rules read the capture. | A resource where **several rounds run at once** — the only correct answer there. |

The middle row has a limit that is easy to miss: **`promote()` is per-resource,
not per-match.** If match A can be in flight while match B is created — one
routing bucket each — promoting at B's creation moves A's finish line too.
Capture instead:

```lua
-- creating a match
match.tune = Open77.tunables.capture()

-- every rule inside that match, for its whole life
if distance <= match.tune.bustRadius then ... end
```

A resource that captures does not need `promote()` at all: declare those keys
`live` and let the capture do the holding.

## Where the values live

Values are owned by the host, so they survive a **reload** *and* a **stop**, and
come back after a restart from `tunables.json` next to `server.jsonc`.

Stopping a resource for an evening must not quietly undo an afternoon of tuning,
so the reset lever for a tunable is an explicit reset — not a restart. (This is
deliberately unlike [`Open77.state`](resource-runtime.md#carrying-state-across-a-reload),
whose bag a stop *does* drop, so an operator keeps a "come up as at boot"
lever.)

A key declared `next_round` or `next_match` is stored and persisted immediately
but does not reach `Open77.tunables.get` until the resource calls `promote()`.

## See also

- [Writing a gamemode](writing-a-gamemode.md) — choosing what to expose.
- [The join-time readiness gate](readiness-gate.md) — the other host-owned
  cross-resource mechanism.
- [The Lua resource runtime](resource-runtime.md) — manifests, permissions and
  the sandbox.
