# NativeUI motion

NativeUI animates elements natively, on the render thread, without a layout pass per frame for
transform and opacity channels. Three tools cover most needs:

- `ui:animate` — springs or tweens toward a target value;
- `ui:keyframes` — a timeline of stops, optionally looping;
- `ui:layout` — automatic transitions when siblings move (FLIP).

RCSS `transition` and `@keyframes` animations also work, as in CSS; use them for simple hover
states and loops declared in the stylesheet.

## Springs

A spring is described by how long it takes to settle and how much it overshoots:

- `duration` — seconds until it settles;
- `bounce` — `0` is critically damped (no overshoot), `0.3` lively, negative values are slower than
  critical.

Interrupting an animation retargets it from its **current value and velocity**: a panel that is
sliding in and is asked to slide out turns around smoothly instead of jumping.

```lua
ui:animate("#panel", { from = { y = 40, opacity = 0 }, to = { y = 0, opacity = 1 }, preset = "snappy" })
ui:animate("#panel", { to = { scale = 1.04 }, spring = { duration = 0.45, bounce = 0.25 } })
ui:animate("#panel", { to = { x = -320 }, duration = 0.5, bounce = 0 })   -- spring fields at top level
```

| Preset | `duration` | `bounce` |
|---|---|---|
| `snappy` | 0.25 | 0 |
| `default` | 0.3 | 0 |
| `calm` | 0.4 | 0 |
| `lead` | 0.2 | 0 |
| `growth`, `reflow` | 0.32 | 0 |
| `bouncy` | 0.45 | 0.3 |
| `wobbly` | 0.6 | 0.45 |

## Tweens

Give `duration` **and** `easing` (or a `tween` table) to use a curve instead of a spring:

```lua
ui:animate("#bar", { to = { width = "62%" }, duration = 0.3, easing = "emphasized" })
ui:animate("#bar", { to = { opacity = 0 }, tween = { duration = 0.2, easing = "ease-in" } })
ui:animate("#bar", { to = { opacity = 1 }, instant = true })               -- no transition
```

Easings: `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, `out`, `snap`, `emphasized`,
`back-out`, `elastic`, `bounce`, `cubic-bezier(a,b,c,d)`, `steps(n)`.

## `ui:animate(selector, spec, onDone?)`

| Field | |
|---|---|
| `to` | target values per channel |
| `from` | start values; without it the animation starts from the channel's current animated value. A channel that was never animated on that element has no history and lands on `to` at once: give `from` for the first animation |
| `preset`, `spring`, `duration`, `bounce` | spring transition (default `default`) |
| `easing` + `duration`, or `tween = { duration, easing }` | tween transition |
| `instant` | apply immediately |
| `delay` | seconds before it starts |
| `stagger` | extra delay per matched element, in seconds: a list that cascades in |

`onDone(detail)` runs once, when every element matched by the selector has finished.

**Channels**

| Channel | Unit |
|---|---|
| `x`, `y`, `z` | dp (translation) |
| `scale`, `scaleX`, `scaleY` | factor |
| `rotate` (= `rotateZ`), `rotateX`, `rotateY`, `skewX`, `skewY` | degrees |
| `perspective` | dp; give it a `from` so it does not grow from 0 |
| `opacity` | 0..1 |
| `color`, `background-color`, `border-color` | colours, mixed in OKLab (no grey midpoint) |
| any length property | `width`, `height`, `left`, `top`, `padding-top`, `margin-left`... with a unit: `"62%"`, `"240dp"` |

Transform channels compose into one `transform` and never trigger a layout. Length properties do;
prefer `x`, `y` and `scale` for anything that moves every frame.

```lua
-- a list that cascades in
ui:animate(".card", { from = { y = 24, opacity = 0 }, to = { y = 0, opacity = 1 },
                      preset = "calm", stagger = 0.04 })

-- a colour pulse when health is low
ui:animate("#hp", { to = { color = "#ff4d5e" }, preset = "snappy" })

-- chain: when the first animation ends, start the next
ui:animate("#banner", { from = { x = -600 }, to = { x = 0 }, preset = "bouncy" }, function()
    ui:animate("#banner", { to = { opacity = 0 }, duration = 0.4, easing = "ease-in", delay = 2 })
end)
```

## `ui:keyframes(selector, spec, onDone?)`

One channel, several stops:

```lua
-- a loading ring that turns forever
ui:keyframes("#ring", { channel = "rotate", duration = 2, iterations = -1,
    stops = { { offset = 0, value = 0 }, { offset = 1, value = 360 } } })

-- a heartbeat, back and forth
ui:keyframes("#heart", { channel = "scale", duration = 0.35, iterations = -1, alternate = true,
    stops = { { offset = 0, value = 1 }, { offset = 1, value = 1.12, easing = "ease-out" } } })

-- a red flash on the background
ui:keyframes("#vitals", { channel = "background-color", duration = 0.6,
    stops = { { offset = 0, value = "#ff4d5e88" }, { offset = 1, value = "#0b0e14b8" } } })
```

| Field | Default | |
|---|---|---|
| `channel` | | one channel from the table above (required) |
| `stops` | | `{ offset = 0..1, value, easing? }` (required) |
| `duration` | 1 | seconds per iteration |
| `iterations` | 1 | `-1` repeats forever |
| `alternate` | `false` | play every other iteration backwards |
| `delay` | 0 | seconds |

A missing channel or stop list fails with `keyframes_need_channel_and_stops`.

## Stopping

```lua
ui:stop("#ring")              -- every channel stops where it is
ui:stop("#ring", "rotate")    -- one channel
ui:settle("#panel")           -- jump to the end values now
```

## Removing with an exit animation

`ui:remove(selector, exit, onDone)` animates the element out with an `animate` spec, then removes it:

```lua
ui:remove("#toast", { to = { opacity = 0, y = -12 }, preset = "calm" }, function() print("gone") end)
```

Elements created with `ui:create` take an `enter` spec for the opposite direction.

## Layout transitions

Turn on `ui:layout` on a container and its children slide to their new place whenever the layout
changes: an item added, removed, reordered, or a sibling growing.

```lua
ui:layout("#list", { preset = "growth" })
ui:layout("#list", { spring = { duration = 0.4, bounce = 0.15 }, lead = 1 })
ui:layout("#list", false)     -- off
```

Combined with `ui:create(..., { enter = ... })` and `ui:remove(..., exit)`, a list of notifications
animates fully: the new one fades in, the others make room, a dismissed one leaves and the gap
closes.

## Accessibility and debugging

`nui.reducedmotion on` makes movement, scale and rotation land at once, and turns opacity and
colour changes into a short linear fade. `nui.timescale 0.2` slows every animation down for
inspection. Both apply to all documents.
