# Launcher colors & text styles

Give your server name a color, emphasize part of a description, or combine styles using short `$` codes. Supported in **OPEN//77 Launcher 2.50.0+op77.178 and later**.

Use the live editor above to choose colors, insert styles and copy the result. It is a local preview: it does not save anything to your server.

## Put the codes in your server identity

In **Warden → Config → Identity**, paste the formatted text into the **name** or **description** field, apply your changes, then restart the server to publish the updated identity. The launcher picks it up when its directory refreshes.

If you edit `server.jsonc` yourself, place the codes directly in the identity strings:

```jsonc
"identity": {
  "name": "$o$ff0Night City$z $i$0ffRoleplay$z",
  "description": "$ff0Welcome to Night City.$g Your story starts here."
}
```

The `$` character needs no extra escaping in JSON. Use `$$` when you want a visible dollar sign. Normal JSON escaping still applies to quotes and newlines.

## The color palette

A color is `$` followed by **exactly three hexadecimal digits**: one for red, one for green, one for blue. Each digit goes from `0` to `f`. `$f80`, for example, means full red, medium green and no blue.

| Code | Color | Expanded RGB |
| --- | --- | --- |
| `$ff0` | Yellow | `#ffff00` |
| `$f80` | Orange | `#ff8800` |
| `$f00` | Red | `#ff0000` |
| `$f0f` | Pink | `#ff00ff` |
| `$a6f` | Purple | `#aa66ff` |
| `$08f` | Blue | `#0088ff` |
| `$0ff` | Cyan | `#00ffff` |
| `$0f0` | Green | `#00ff00` |
| `$6fa` | Mint | `#66ffaa` |
| `$fff` | White | `#ffffff` |
| `$888` | Grey | `#888888` |
| `$000` | Black | `#000000` |

There are **4,096 possible colors**. The custom picker rounds to that palette and shows the exact three-digit code it will insert. Colors are case-insensitive: `$08F` and `$08f` are identical. Dark colors such as black can disappear against the launcher's dark background; use the preview to check readability.

Do not paste six-digit CSS colors after `$`: `$ff8800` is read as the color `$ff8` followed by the visible text `800`. Use `$f80` instead.

## Style reference

| Code | Effect | Example |
| --- | --- | --- |
| `$o` | Bold | `$oNight City$z` |
| `$i` | Italic | `$iRoleplay$z` |
| `$n` | Narrow letters | `$nNight City$z` |
| `$w` | Wide letters | `$wNight City$z` |
| `$t` | Uppercase | `$tNight City$z` → `NIGHT CITY` |
| `$s` | Drop shadow | `$sNight City$z` |
| `$g` | Restore the default color | `$f00Red$g Default color` |
| `$z` | Restore all default styles | `$o$i$f00Styled$z Default text` |
| `$$` | Show a literal dollar sign | `Entry: $$0` → `Entry: $0` |

Narrow and wide change the width of the actual letters using the Saira variable font included in the launcher. `$n` selects 75% width; `$w` selects 125%. Applying one replaces the other.

## Combine styles, then reset

Codes apply to the text that follows them. They stay active until another code changes that property or a reset clears it. They are not opening and closing tags: writing `$i` twice does not turn italics off.

```text
$o$ff0Night City$z $i$0ffRoleplay$z
```

This displays **Night City** in bold yellow, followed by *Roleplay* in cyan italics. Each `$z` returns to the field's default appearance.

```text
$o$f00RED$g STILL BOLD$z Normal
```

`$g` changes only the color back to its default. Bold stays active until `$z`. For ordinary unformatted text after a styled segment, use `$z`.

## Examples to copy

### A roleplay server

```text
$o$ff0Night City$z $i$0ffRoleplay$z
```

### A racing server

```text
$w$f80NIGHT RUN$z $fff// $iStreet racing$z
```

### A freeroam server

```text
$o$6faFREE$fffROAM$z $nExplore Night City$z
```

### A description with a literal dollar sign

```text
$o$ff0Welcome to Night City.$z
$0ffRoleplay$g, racing and late-night sessions.
Entry: $$0.
```

## Where formatting appears

Formatted names appear in the launcher's server list, Featured cards, Play cards, resume tile, Favorites, History, server details and connection title. Descriptions are formatted in server details.

Search and name sorting use the readable text without control codes. For example, `$f00Ni$ff0ght City` is still found by searching for `Night City`. Accessibility labels and fallback icon initials also use readable text.

These codes style **launcher text**. They do not change the server's identity, grant Featured or Official status, format in-game chat, or guarantee formatted names in the website server browser or other clients. See [Branding your server](/docs/server-branding) for icons and banners.

## Troubleshooting

| What you see | What to check |
| --- | --- |
| Literal `$ff0` in the launcher | Update to Launcher 178 or later. Check that you did not write `$$ff0`, which deliberately escapes the dollar sign. |
| A style continues further than expected | Insert `$z` where it should stop. `$g` resets color only. |
| A code appears as text | Unknown and incomplete codes remain literal. Check the reference above. |
| Text is hard to read | Choose a brighter color and check the preview against its dark background. |
| The old name is still shown | Apply the identity changes, restart the server, then refresh the directory. |

HTML is displayed as text; it cannot create links or run scripts. Only the codes listed here are supported. The syntax follows [ManiaPlanet text formatting](https://doc.maniaplanet.com/client/text-formatting).
