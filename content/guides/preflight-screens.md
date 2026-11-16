# Building preflight screens

A preflight screen is what your server shows in the OPEN//77 launcher before the game starts: the
welcome on your server's page, a rules or application form during the **Server check**, or a
refusal page. You write it in **NativeUI Lite**, a static subset of the RML and RCSS that
in-game [NativeUI](native-ui.md) documents use, and your preflight resource sends it from Lua.
The launcher draws it with its own renderer: there is no browser and no script.

This page is the markup reference. How a screen is sent, updated and answered is in
[Preflight in Lua](preflight-lua.md); what preflight is and how to configure it is in
[Connection preflight](connection-preflight.md).

## How a screen works

A screen (a *view*) is two parts:

- a **document**: RML markup with a `<style>` block, sent once;
- **data**: a Lua table sent as JSON, which the document binds with `{{ ... }}`, `data-if` and
  `data-for`. Change what the player sees by patching the data (`session:data`), without sending
  the document again.

```lua
session:show({ file = "ui/queue.rml", data = { position = 12, total = 40, progress = 0.7 } })
session:data({ position = 11, progress = 0.72 })   -- the launcher re-renders at once
```

```xml
<rml>
  <head>
    <title>Queue</title>
  </head>
  <body>
    <p>You are number {{ position }} of {{ total }}.</p>
    <progress data-value="progress"/>
  </body>
</rml>
```

Bindings read values but cannot compute them (there is no arithmetic): work numbers out in Lua and
send the result.

Where a screen appears:

| Screen | Sent with | Shown | Interactive |
|---|---|---|---|
| Welcome | `Open77.preflight.welcome(view)` | On your server's page in the launcher, under the banner, before Join. Full width of the page. | Links only. Buttons are drawn but unavailable: no player is known yet. |
| Check screen | `session:show(view)` | In the Server check dialog after Join. At most about 650 pixels wide, less in a small window; long content scrolls inside the dialog. | Yes: buttons, links, text fields, checkboxes. |
| Refusal page | `session:refuse(message, { view = view })` | Under your refusal message on the launcher's "The server refused the connection" screen, with Retry and Back. | Links only (the check is over). |

The launcher frames every screen as "From the server". The document's `<title>` becomes the
heading of the Server check dialog; without one, the dialog shows the server's name. Under a
screen with text fields the launcher adds a line telling the player never to type an OPEN//77 or
store password there.

## A first screen

```xml
<rml>
  <head>
    <title>Welcome</title>
    <style>
      .panel { padding: 14px; border: 1px var(--line); border-radius: 6px; background-color: var(--panel); }
    </style>
  </head>
  <body>
    <h1>{{ server }}</h1>
    <div class="panel">
      <p>Hello {{ name }}. Read the rules, then press the button.</p>
      <ul>
        <li data-for="rule : rules">{{ rule }}</li>
      </ul>
    </div>
    <div class="row gap-8">
      <button class="ghost" data-event-click="decline">Decline</button>
      <button data-event-click="accept">I accept</button>
    </div>
  </body>
</rml>
```

```lua
session:show({ file = "ui/first.rml", data = {
    server = "Night City RP",
    name = session.player.name,
    rules = { "Stay in character.", "No cheating." },
} })
session:hold()
session:on("accept", function() session:allow() end)
session:on("decline", function() session:refuse("You need to accept the rules.", { code = "rules_declined" }) end)
```

Unstyled elements already look like the launcher: headings, paragraphs, lists, buttons and fields
come from the launcher's own style sheet ([Default styles](#default-styles)).

## XML rules

The server checks every document before sending it. A document that fails is not sent, and the Lua
call returns `false, reason` (`document_invalid:line N, column M`, `document_root_must_be_rml`,
`document_too_large`, `document_empty`).

- The root element is `<rml>`, with `<head>` (optional) and `<body>`.
- Close every element: `<br/>`, `<hr/>`, `<img .../>`, `<input .../>`.
- Quote every attribute value.
- Escape `&` as `&amp;` and `<` as `&lt;`, in text **and** in attributes. A condition with
  `&&` is written `data-if="a &amp;&amp; b"`; a comparison with `<` is written
  `data-if="count &lt; 3"` (or turned around: `data-if="3 > count"`).
- Named HTML entities are not XML. Write `&#160;` for a non-breaking space, never `&nbsp;`.
- No `<!DOCTYPE>`. Comments `<!-- ... -->` are fine.
- In `<style>`, avoid `<` and `&` (wrap the sheet in `<![CDATA[ ... ]]>` if you must).
- 64 KiB at most, UTF-8.

## Elements

| Element | Rendered as |
|---|---|
| `rml`, `head`, `title`, `style`, `body` | Document structure. `<title>` names the dialog; `<style>` holds the sheet. |
| `div`, `p`, `h1`, `h2`, `h3`, `ul`, `li`, `form`, `section`, `header`, `footer`, `nav`, `main`, `article` | Block boxes. `li` gets a square marker; `form` is a plain container (it does not submit by itself). |
| `span`, `a`, `b`, `strong`, `i`, `em`, `small`, `code`, `label` | Inline text. `b`/`strong` bold, `i`/`em` italic, `small` 0.85em, `code` monospace. |
| `br` | Line break. |
| `hr` | A 1 px divider line. |
| `button` | A button. Without `data-event-click` it does nothing. |
| `a` | A link (`href="https://..."`) or, with `data-event-click`, a clickable text. |
| `img` | An image (`src`, optional `width`/`height` in pixels). |
| `input` | `type="text"` (the default), `type="password"` or `type="checkbox"`. Needs an `id`. |
| `progress` | A bar: `value` from 0 to 1, or `value` and `max`, or `data-value`. |

Any other element is skipped and its children are drawn in its place. `script`, `link`, `svg`,
`select`, `textarea`, `template`, `scene3d`, `path` and `shape` are dropped with their content.

Inline elements (`span`, `a`, ...) that get a background, a border, padding or a width become
boxes. Every child of a `display: flex` container is a box. Text written directly in a block is
drawn; wrapping it in a `<span>` or `<p>` keeps the document valid for in-game NativeUI as well.

## Attributes

| Attribute | On | Meaning |
|---|---|---|
| `id`, `class` | any | Selectors. `class` takes up to 32 names. |
| `style` | any | Inline declarations. `{{ }}` bindings work inside. |
| `href` | `a` | An `https://` address, opened in the player's browser. Anything else is not a link. |
| `src`, `width`, `height` | `img` | See [Images](#images). |
| `type`, `placeholder`, `value`, `maxlength`, `checked` | `input` | See [Inputs](#inputs). |
| `value`, `max` | `progress` | Fill ratio `value / max` (`max` defaults to 1). |
| `data-if`, `data-for`, `data-class-*`, `data-attr-*`, `data-style-*`, `data-value`, `data-checked` | any / inputs | [Data binding](#data-binding). |
| `data-event-click`, `data-event-submit` | any / containers | [Events](#events). |

Every attribute value can contain `{{ expression }}`: `class="tier-{{ tier }}"`,
`href="{{ discord }}"`, `placeholder="{{ hint }}"`.

## Styles

Put a `<style>` block in `<head>` and use inline `style=""` where convenient.

### Selectors and cascade

- Selectors: tag (`p`), class (`.panel`), id (`#rules`), the universal `*`, compounds
  (`button.ghost`), the descendant combinator (`.panel p`), comma lists, and `:hover`. A `>` is
  read as a descendant combinator. Inputs also match their type as a class, as in RmlUi:
  `input.text`, `input.password`, `input.checkbox`.
- `:hover` applies to buttons, links and any element with `data-event-click`.
- A selector with any other pseudo-class (`:focus`, `:checked`, `:nth-child`...) or an attribute
  selector is ignored; the other selectors of the same comma list still apply. `@media`,
  `@keyframes` and other at-rules are ignored.
- Order: the launcher's default sheet, then your sheet (your rules always win over the defaults),
  sorted by specificity (id, then class, then tag) and source order; then the `style` attribute;
  then `data-style-*`. `!important` is accepted and has no extra effect.
- Text properties are inherited (colour, font, alignment, case, spacing, line height,
  underline); box properties are not.
- Limits: 768 rules, 64 declarations per rule, 8 compounds per selector.

### Properties

| Group | Property | Values |
|---|---|---|
| Layout | `display` | `flex` (`inline-flex`), `block` (`inline-block`), `inline`, `none` |
| | `flex-direction` | `row`, `column` |
| | `flex-wrap` | `wrap`, `nowrap` |
| | `flex-grow`, `flex-shrink` | number |
| | `flex` | `none`, `auto`, or `<grow> [<shrink>]` |
| | `justify-content` | `flex-start`/`start`, `center`, `flex-end`/`end`, `space-between`, `space-around`, `space-evenly` |
| | `align-items`, `align-self` | `flex-start`/`start`, `center`, `flex-end`/`end`, `stretch` |
| | `gap` | one or two lengths (row, column); also `row-gap`, `column-gap` |
| | `overflow`, `overflow-y` | `visible`, `hidden`, `auto`/`scroll` (scrolls vertically) |
| Size | `width`, `height`, `min-width`, `min-height`, `max-width`, `max-height` | length, `%`, `auto`, `none` |
| Spacing | `margin`, `margin-top/right/bottom/left` | lengths (1 to 4 values); `auto` on the left and right |
| | `padding`, `padding-top/right/bottom/left` | lengths (1 to 4 values) |
| Colour | `color`, `background-color` | colour |
| | `background` | colour, `linear-gradient(...)` or `none` |
| | `decorator` | `linear-gradient(...)` (RCSS spelling); other decorators are skipped |
| | `opacity` | 0 to 1 |
| Borders | `border`, `border-top/right/bottom/left` | width and colour in any order (`1px #1f4258`, `1px solid var(--line)`); style keywords are ignored |
| | `border-width`, `border-*-width` | lengths |
| | `border-color` | one colour for all sides |
| | `border-radius` | 1 to 4 lengths |
| Text | `font-size` | length (4 to 200 px) |
| | `font-weight` | `normal`, `bold`, 100 to 1000 |
| | `font-style` | `normal`, `italic`, `oblique` |
| | `font-family` | see [Fonts](#fonts) |
| | `text-align` | `left`/`start`, `center`, `right`/`end` |
| | `text-transform` | `uppercase`, `lowercase`, `none` |
| | `text-decoration` | `underline`, `none` |
| | `letter-spacing` | length or `normal` |
| | `line-height` | a number (times the font size), a length, or `normal` |

A value that does not parse leaves the property as it was. An unknown property is skipped.

**Units.** `px`; `dp` (a pixel at scale 1, so the same as `px` here); `em` (the element's font
size; for `font-size`, the parent's); `%` for widths and heights; a bare number means pixels.
`%` is not accepted for margins and padding.

**Colours.** `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb(r, g, b)`, `rgba(r, g, b, a)` (alpha
0 to 1 as in CSS, or 0 to 255 as in RCSS), `transparent` and the basic names: `black`, `white`,
`red`, `green`, `lime`, `blue`, `yellow`, `orange`, `purple`, `fuchsia`, `magenta`, `aqua`,
`cyan`, `teal`, `navy`, `maroon`, `olive`, `gray`, `grey`, `silver`.

**Gradients.** `linear-gradient(<angle>deg | to top | to right | to bottom | to left, c1, c2, ...)`
with 2 to 8 colours and optional `%` stop positions: `background: linear-gradient(90deg,
var(--panel), #0b2a3a 70%, transparent)`.

### Design tokens

`var(--name)` takes the launcher's colour, so your screen follows its theme. `var(--name,
fallback)` uses the fallback for an unknown name.

| Token | Value | Use |
|---|---|---|
| `--text` | `#ffffff` | Headings, strong text |
| `--copy` | `#cdd9e4` | Body text |
| `--muted` | `#a5b9cf` | Secondary text, labels |
| `--accent` | `#fcee0a` | Primary buttons, highlights |
| `--accent-hover` | `#fff88a` | Primary button hover |
| `--link` | `#08dfec` | Links, list markers |
| `--panel` | `#071826` | Panel backgrounds |
| `--raised` | `#112935` | Hovered panels |
| `--line` | `#1f4258` | Borders, dividers |
| `--edge` | `#315a74` | Stronger borders |
| `--bg` | `#03111d` | Field backgrounds |
| `--ink` | `#050c16` | Text on the accent colour |
| `--ok` | `#5be3a6` | Success |
| `--warn` | `#ff9f1c` | Warnings |
| `--danger` | `#ff6b7a` | Errors, refusals |

### Fonts

`font-family` picks one of the launcher's faces from the first family named:

| You write | Face |
|---|---|
| `display`, `heading`, `"Chakra Petch"`, `druk` | The display face of the launcher's titles (bold italic capitals look best) |
| `label`, `nippo` | The label face of buttons and small capitals |
| `mono`, `monospace`, `"Roboto Mono"`, `"JetBrains Mono"` | Monospace, for ids and codes |
| anything else | The body face |

Web fonts cannot be loaded.

### Default styles

The launcher applies its own sheet first, so an unstyled document already matches the launcher:

- `body`: 14 px text, line height 1.5, colour `--text`.
- `h1` (26 px) and `h2` (18 px): display face, bold italic capitals. `h3`: small accent-coloured
  label capitals.
- `p` and `li`: colour `--copy`, 10 px and 5 px bottom margins.
- `a`: `--link`, underlined. `hr`: a `--line` divider.
- `button`: accent background, dark label capitals, 40 px minimum height. `button.ghost` and
  `button.secondary`: panel background with a border. `button.danger`: dark red.
- `input.text` and `input.password`: 320 px wide (never wider than their container), 42 px high,
  `--bg` background with a `--line` border. `input.checkbox`: 18 px square.
- `progress`: 6 px track in `--line`, filled with `color` (`--accent`).

The same helper classes as the in-game `open77.rcss` exist:

| Class | Effect |
|---|---|
| `.row`, `.col` | Flex row (items centred) or column |
| `.grow`, `.wrap`, `.center` | `flex: 1 1 auto`, `flex-wrap: wrap`, centred flex |
| `.gap-4`, `.gap-8`, `.gap-12`, `.gap-16`, `.gap-24` | Gaps |
| `.hidden` | `display: none` |
| `.panel`, `.glass` | Padded panel with a border |
| `.eyebrow`, `.ui` | Small label capitals (accent colour for `.eyebrow`) |
| `.muted`, `.accent`, `.ok`, `.warn`, `.danger` | Text colours |
| `.mono` | Monospace |
| `.button` | Button look on any element |
| `.meter` + `.fill` | A bar whose fill width you set |

## Data binding

The launcher evaluates bindings against the view's data every time the data changes.

| Syntax | Effect |
|---|---|
| `{{ expression }}` | Text, in content and in any attribute value. |
| `data-if="expression"` | The element is drawn only when the value is truthy. |
| `data-for="item : list"` | Repeat the element for each entry of an array. |
| `data-for="item, i : list"` | Also bind the index `i`, counted from 0. |
| `data-class-name="expression"` | Add the class `name` when truthy. |
| `data-attr-name="expression"` | Set the attribute `name` from the value (wins over a literal `name`). |
| `data-style-property="expression"` | Set one style property from the value: `data-style-width="barWidth"` with `barWidth = "40%"`. |
| `data-value="expression"` | Initial value of an input, or the fill of a `progress`. |
| `data-checked="expression"` | Initial state of a checkbox. |

**Expressions.**

- Paths: `name`, `player.name`, `rules[0]`, `stats['kills']`, `item.tags.size` (`.size` is the
  length of an array). Inside `data-for`, the loop variable shadows the data.
- Literals: `'text'`, `"text"`, numbers, `true`, `false`, `null` (or `nil`).
- Operators: `!`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `&&`, `||`, parentheses. No arithmetic.
- `data-if="kind == 'banned'"`, `data-if="!pending"`,
  `data-if="players &gt;= maxPlayers &amp;&amp; !vip"`.
- Truthy: everything except `null`, `false`, `0`, `""` and an empty array. A whole number prints
  without decimals (`12`, not `12.0`); a table or array prints nothing.
- A path that does not exist is `null`, and a malformed expression is `null`: nothing here can make
  a screen fail.

**Data from Lua.** The data table becomes JSON. Keys at the top level must be strings, and the
whole table is at most 64 KiB once encoded. Two Lua details matter:

- An **empty Lua table encodes as an object**, not an array: `data-for` then draws nothing, and
  `.size` is `null`. Send a flag next to each list (`hasRules = #rules > 0`) and test the flag.
- `session:data(patch)` replaces the top-level keys you give and keeps the others. To clear a
  value, set it to `""` or `false`: `nil` in a Lua table is no key at all.

`data-if` is evaluated for each `data-for` iteration, so a filter can sit on the repeated element:

```xml
<li data-for="rule, i : rules" data-if="rule.visible">
  <span class="accent">{{ rule.number }}</span> {{ rule.text }}
</li>
```

## Events

| Syntax | Sends |
|---|---|
| `data-event-click="accept"` | Event `accept`, `data = nil`. |
| `data-event-click="pick('car', item.id)"` | Event `pick`, `data = { args = { "car", <item.id> } }`. Up to 8 arguments, evaluated like bindings. |
| `data-event-submit="apply"` on a container | Event `apply` when the player presses Enter in an input inside it (the nearest enclosing container wins). |

`data-event-click` works on any element: a `div`, an `img` or an `a` becomes clickable, focusable
and answers Enter. On an `a` with an `href`, the event wins over the link.

Every event carries **all inputs of the screen** that have an `id`: a text or password field as a
string, a checkbox as a boolean. In Lua:

```lua
session:on("apply", function(data, inputs)
    local text = tostring(inputs.application or "")
    local agreed = inputs.agree == true
end)
```

Rules for events:

- Names match `[A-Za-z0-9_.:-]`, 1 to 64 characters. `launcher:*` names are reserved and never
  sent from a document.
- The server accepts 10 events per 5 seconds per check, 8 KiB each; more are refused.
- An event for a check that is already decided is ignored.
- A welcome screen and a refusal page send no events.
- Events come from the player's machine. A modified client can send any name with any inputs, so
  check everything on the server ([Security notes](connection-preflight.md#security-notes)).

## Inputs

```xml
<input id="name" type="text" placeholder="First and last name" maxlength="40"/>
<input id="code" type="password" maxlength="16"/>
<input id="agree" type="checkbox"/>
<input id="city" type="text" data-value="lastCity"/>
```

- `id` is required (64 characters at most): an input without one is not drawn, because its value
  could not be sent back.
- `type`: `text` (also when absent), `password` (drawn masked), `checkbox`. Other types are
  skipped. There is no `select`, `textarea` or radio button: use buttons with arguments for a
  choice (`data-event-click="pick('nomad')"`).
- `maxlength`: 1 to 1024, default 256.
- The initial value comes from `data-value`, else `value`; for a checkbox from `data-checked`,
  `data-value` or the `checked` attribute. Once the player has typed or ticked, their value is
  kept across data updates.
- Put a label next to a checkbox in a flex row: `<div class="row gap-8"><input id="agree"
  type="checkbox"/><span>I accept the rules.</span></div>`.
- Preflight goes over plain HTTP. Never ask for a password or a secret; an invite code is fine.

## Links

`<a href="https://discord.gg/your-invite">Discord</a>` opens the player's browser. Only `https://`
addresses (2048 characters at most) become links: `http:`, `file:`, `mailto:`, `steam:` and other
schemes are drawn as plain text. Bind an address from data with `href="{{ discord }}"`, and hide
the link when you have none: `<a data-if="discord" href="{{ discord }}">Discord</a>`. Links work on
every kind of screen, the welcome included.

## Images

| `src` | Loads |
|---|---|
| `asset:ui/logo.png` | A file of your resource listed in `preflight_files` (served at `/preflight/v1/assets/ui/logo.png`). |
| `https://...` | An image on the web, 2048 characters at most. |
| `data:image/png;base64,...` | Inline PNG, JPEG or WebP. |

```lua
-- open77.lua of the owning resource
preflight_files { "ui/logo.png", "ui/banners/*.webp" }
```

- Formats: PNG, JPEG, WebP. No GIF or SVG.
- `preflight_files`: 2 MiB per file, 64 files, 16 MiB in total. Asset paths use letters, digits,
  `.`, `_` and `-` per folder. These files are **public**: anybody can fetch them without an
  account.
- Size an image with `width`/`height` attributes (pixels) or CSS. A wide image is scaled down to
  the space available; set both dimensions to keep its proportions predictable.
- An inline `data:` image counts against the 64 KiB document limit; use `asset:` for anything but
  a small icon.

## Limits

| What | Limit | Past it |
|---|---|---|
| Document | 64 KiB, well-formed XML, `rml` root | The Lua call returns `false, reason`; nothing is sent. |
| Data | 64 KiB of JSON, string keys at the top level | `false, "data_too_large"` or `false, "data_must_be_a_table_with_string_keys"`. |
| Elements and text nodes | 2000 | The launcher does not show the screen (the check goes on). |
| Nesting depth | 32 | The launcher does not show the screen. |
| `data-for` iterations per render | 1000, nested loops included | The launcher does not show the screen. |
| Boxes and text runs per render | 4000 | The launcher does not show the screen. |
| Bound text per render | 256 KiB | The launcher does not show the screen. |
| Attributes per element | 48 | The launcher does not show the screen. |
| Style rules | 768, 64 declarations each | Extra rules are ignored. |
| Expression | 512 characters | Evaluates to `null`. |

When the launcher cannot show a screen it logs why and keeps the check running with only your
status line. A screen that never appears while the session waits for a button leaves the player
stuck until `sessionSeconds`: keep well inside these numbers.

## Lite and full NativeUI

The same markup language, a much smaller engine. What a launcher screen cannot do:

| Full NativeUI (in game) | NativeUI Lite (launcher) |
|---|---|
| Lua on the client: `ui:on`, DOM methods, data models | Data from the server; events go to the server. |
| `<link>` style sheets, `nui://open77/open77.rcss`, files listed in `files` | One inline `<style>` block; the launcher's default sheet stands in for `open77.rcss`. Images only through `preflight_files`, `https` or `data:`. |
| `position: absolute`, transforms, `z-index` | Flex and block flow only. |
| Transitions, animations, `@keyframes` | Skipped. |
| `fx()` decorators, filters, `backdrop-filter`, `box-shadow`, image decorators | Skipped; `linear-gradient` works. |
| `scene3d`, `path`, `shape`, world anchors | Dropped. |
| `select`, `textarea`, sliders, radio buttons | Text, password and checkbox inputs only. |
| Pseudo-classes such as `:focus`, `:active`, `:checked` | `:hover` only. |
| Custom fonts | The launcher's four faces. |
| Per-side border colours | One border colour per element. |
| `vw`, `vh` units | `px`, `dp`, `em`, `%`. |

Anything outside the subset is skipped, never an error. The reverse holds too: a Lite document is
valid RML, so the same file can serve as a starting point for an in-game NativeUI page.

## Layout tips

- **Design for 320 to 650 pixels** on the Server check dialog. It is at most about 650 pixels wide
  and narrower in a small launcher window. The welcome on the server's page is much wider: let it
  stretch rather than fixing its width.
- **Build with flex and wrapping.** `display: flex; flex-wrap: wrap; gap: 8px` for chips, links and
  buttons; `max-width: 100%` and `%` widths instead of fixed widths over 300 pixels. There are no
  media queries.
- **Put buttons in an actions row** aligned to the end: `display: flex; justify-content: flex-end;
  gap: 10px`. Primary action last, a `ghost` button for the secondary one.
- **Keep it short.** The dialog scrolls, but a player should see the question and the buttons
  without scrolling. Put long rules on your website and link them.
- **Use the tokens** (`var(--panel)`, `var(--line)`, `var(--accent)`) so your screen sits well in
  the launcher, and reserve literal colours for meaning (red for refusals).
- **Give the dialog a `<title>`** ("Server rules", "Whitelist application"): it becomes the dialog
  heading, so the document itself can start with your server's name.
- **Show errors in the screen.** Keep an `error` key in the data and a `<p class="danger"
  data-if="error">{{ error }}</p>`; set it from Lua when an input is wrong, clear it with `""`.
- **Test both sizes**: resize the launcher window to its smallest and to full screen.

## Worked example: welcome and rules

A complete resource: a welcome on the server's page with a logo, the rules, a live player count
and a Discord link; after Join, a rules screen with an invite-code field and a checkbox. It is the
example resource shipped with the server, `resources/dev/open77_preflight_demo`, slightly trimmed.

![The worked example's welcome screen on the server page: a logo, the server name, how many players are online, the rules that will be asked and a Join our Discord link](/assets/docs/preflight/demo-welcome.webp)

![The worked example's rules screen in the launcher's Server check: the server name, a greeting, three rules, an invite code field, an I have read the rules checkbox and Decline and I accept buttons](/assets/docs/preflight/demo-rules.webp)

```text
resources/my_welcome/
  open77.lua
  server/main.lua
  ui/welcome.rml
  ui/rules.rml
  ui/logo.png
```

`server.jsonc`, then restart the server once:

```jsonc
"preflight": { "resource": "my_welcome" }
```

`open77.lua`:

```lua
resource "my_welcome"
version "1.0.0"
server_script "server/main.lua"

-- players.preflight: own the launcher's server check.
-- players.access:    read the server's whitelist (Open77.access.isAllowed).
permissions { "players.preflight", "players.access" }

-- Public images for the launcher. Documents (.rml) are not listed: they travel inline.
preflight_files { "ui/logo.png" }
```

`ui/welcome.rml`:

```xml
<rml>
  <head>
    <title>Welcome</title>
    <style>
      body { display: flex; flex-direction: column; gap: 12px; padding: 16px; color: var(--text); font-size: 14px; }
      .row { display: flex; flex-direction: row; align-items: center; gap: 12px; }
      .logo { width: 48px; height: 48px; border-radius: 6px; }
      h2 { font-size: 18px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }
      .muted { color: var(--muted); }
      .panel { background-color: var(--panel); border-width: 1px; border-color: var(--line); border-radius: 6px; padding: 12px; }
      li { margin-bottom: 4px; }
      a { color: var(--accent); }
      a:hover { opacity: 0.8; }
    </style>
  </head>
  <body>
    <div class="row">
      <img class="logo" src="asset:ui/logo.png"/>
      <div>
        <h2>{{ server }}</h2>
        <span class="muted">{{ online }} online now</span>
      </div>
    </div>
    <div class="panel">
      <p>Before you join, you will be asked to accept these rules:</p>
      <ul>
        <li data-for="rule : rules">{{ rule }}</li>
      </ul>
      <p class="muted" data-if="inviteOnly">An invite code is required for new players.</p>
    </div>
    <a href="{{ discord }}">Join our Discord</a>
  </body>
</rml>
```

`ui/rules.rml`:

```xml
<rml>
  <head>
    <title>Server rules</title>
    <style>
      body { display: flex; flex-direction: column; gap: 14px; padding: 20px; color: var(--text); font-size: 14px; line-height: 1.4em; }
      h1 { font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
      .muted { color: var(--muted); }
      .panel { background-color: var(--panel); border-width: 1px; border-color: var(--line); border-radius: 6px; padding: 14px; }
      .notice { color: var(--accent); font-weight: bold; }
      .error { color: #ff5a5a; }
      .field { display: flex; flex-direction: column; gap: 6px; }
      .check { display: flex; flex-direction: row; align-items: center; gap: 8px; }
      .actions { display: flex; flex-direction: row; justify-content: flex-end; gap: 10px; }
      input { padding: 8px; border-width: 1px; border-color: var(--line); border-radius: 4px; background-color: #0c0e14; color: var(--text); }
      button { padding: 10px 18px; border-radius: 4px; font-weight: bold; text-transform: uppercase; }
      .primary { background-color: var(--accent); color: #0c0e14; }
      .primary:hover { opacity: 0.85; }
      .secondary { background-color: var(--panel); color: var(--muted); border-width: 1px; border-color: var(--line); }
      .secondary:hover { color: var(--text); }
    </style>
  </head>
  <body>
    <h1>{{ server }}</h1>
    <p>Hello {{ name }}. Read and accept the rules to join.</p>
    <p class="notice" data-if="notice">{{ notice }}</p>
    <div class="panel">
      <ul>
        <li data-for="rule : rules">{{ rule }}</li>
      </ul>
    </div>
    <div class="field" data-if="needInvite" data-event-submit="accept_rules">
      <span class="muted">Invite code</span>
      <input id="invite" type="text" placeholder="XX-0000" maxlength="16"/>
    </div>
    <div class="check">
      <input id="agree" type="checkbox"/>
      <span>I have read the rules and I accept them.</span>
    </div>
    <p class="error" data-if="error">{{ error }}</p>
    <div class="actions">
      <button class="secondary" data-event-click="decline_rules">Decline</button>
      <button class="primary" data-event-click="accept_rules">I accept</button>
    </div>
  </body>
</rml>
```

`server/main.lua`:

```lua
local CONFIG = {
    serverName = "Night City Roleplay",
    inviteCode = "NC-2077",          -- "" to ask for no code
    discordInvite = "https://discord.gg/example",
    rulesVersion = "1",              -- change it to ask everybody again
    rules = {
        "Stay in character in public places.",
        "No cheating, no exploits.",
        "Respect the other players and the staff.",
    },
}

local preflight = Open77.preflight

-- One key per player who accepted this version of the rules (the store holds 4,096 keys).
local function accepted(userId)
    return Open77.kvp.get("rules:" .. CONFIG.rulesVersion .. ":" .. userId) == true
end

-- The anonymous screen on the server's page, with the live player count.
local published = nil
local function publishWelcome()
    local info = preflight.server()
    local online = type(info) == "table" and info.players or 0
    if online == published then return end
    local ok, reason = preflight.welcome({ file = "ui/welcome.rml", data = {
        server = CONFIG.serverName,
        online = online,
        rules = CONFIG.rules,
        discord = CONFIG.discordInvite,
        inviteOnly = CONFIG.inviteCode ~= "",
    } })
    if ok then published = online else print("welcome not published: " .. tostring(reason)) end
end

local function showRules(session)
    local ok, reason = session:show({ file = "ui/rules.rml", data = {
        server = CONFIG.serverName,
        name = session.player.name,
        rules = CONFIG.rules,
        needInvite = CONFIG.inviteCode ~= "",
        error = "",
    } })
    if not ok then
        -- A screen that cannot be shown must not strand the player.
        print("rules screen not shown (" .. tostring(reason) .. "); allowing " .. session.player.name)
        session:allow()
        return
    end
    session:status(nil)   -- the screen speaks for itself
    session:hold()        -- wait for the player: no decision deadline

    session:on("accept_rules", function(_, inputs)
        if inputs.agree ~= true then
            session:data({ error = "Tick the box to accept the rules." })
            return
        end
        local code = tostring(inputs.invite or ""):upper()
        if CONFIG.inviteCode ~= "" and code ~= CONFIG.inviteCode then
            session:data({ error = "That invite code is not valid. Ask for one on our Discord." })
            return
        end
        Open77.kvp.set("rules:" .. CONFIG.rulesVersion .. ":" .. session.player.userId, true)
        session:hide()
        session:allow("Welcome to " .. CONFIG.serverName .. ", " .. session.player.name .. ".")
    end)

    session:on("decline_rules", function()
        session:refuse("You need to accept the rules to play on this server.", { code = "rules_declined" })
    end)
end

AddEventHandler("onPreflight", function(session)
    local player = session.player
    session:status("Checking your access...", 0.3)
    -- Whitelisted members and players who already accepted these rules go straight in.
    if Open77.access.isAllowed(player.userId) == true or accepted(player.userId) then
        session:allow("Welcome back, " .. player.name .. ".")
        return
    end
    showRules(session)
end)

-- notice <text>: a line on every rules screen that is open right now.
RegisterCommand("notice", function(_, args)
    local count = preflight.broadcast({ notice = table.concat(args, " ") })
    print("notice sent to " .. tostring(count) .. " screen(s)")
end, true)

publishWelcome()
CreateThread(function()
    while true do
        Wait(15000)       -- launchers keep a hello for a minute anyway
        publishWelcome()  -- republishes only when the count changed
    end
end)
```

Run `ensure my_welcome` at the console after each edit of the Lua or the `.rml` files. Files are
read again each time they are shown, and the welcome is published again when the resource starts.

## Debugging a screen

- `session:show` and `Open77.preflight.welcome` return `false, reason`: print it. A
  `document_invalid:line N, column M` points at the XML error.
- A welcome change appears in the launcher within a minute (the launcher keeps a server's hello for
  60 seconds). Close and reopen the server page.
- A check screen updates at once. Press Join again after `ensure` to see a new document.
- The launcher writes `server check:` lines to its log, including screens it could not show.
- When something is not drawn, check it against [Elements](#elements) and the property table:
  unsupported markup is skipped silently.
