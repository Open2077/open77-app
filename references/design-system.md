# OPEN//77 — Design System

Launch landing page for the community platform bringing FiveM-style dedicated
servers to Cyberpunk 2077. Reads as serious multiplayer infrastructure
(fivem.net, vercel.com, tailscale.com), set at night (night-city / server-rack
mood), Cyberpunk-adjacent without cosplaying the game's yellow/cyan glitch
identity.

Every decision below is anchored in `references/` — see `references.json` for
the per-reference takeaways.

## 1. Palette

Nocturnal blue-teal darkness as the field (night-city mood shot: #02131a
blacks), neon strictly as punctuation (FiveM's single accent, cfx.re's
restraint). Never pure #000 (Discord ref: deep blue reads as a place, black
reads as a void).

| Token | Hex | Usage |
| --- | --- | --- |
| `--bg` | `#080D18` | Page background. The night. Sections separate by density, not color bands (fivem-full ref). |
| `--surface` | `#111928` | Cards, nav bar, code blocks, inputs. Raised panels over the night. |
| `--text` | `#EEF2F5` | Headings and body. Muted copy = same hex at 62% opacity; hairlines at 8% (see Shapes). |
| `--accent` | `#20D5E5` | Signal cyan (server-LED mood shot #01a9e7). The ONE brand accent: primary CTA, the `//` mark, links, live counters/status dots. Budget: if a viewport shows more than ~3 cyan elements, remove some. |
| `--accent-2` | `#20D5E5` | Alias of the brand cyan. UI is strictly monochrome + cyan — the game imagery supplies all other color ("The game is colorful. OPEN//77 is cyan."). |
| `--danger` | `#FF5C5C` | Errors, destructive actions, offline states only. |

On-accent text: use `--bg` (dark text on cyan button), never white.
Both accents pass contrast on `--bg` for text-sized use; body text stays `--text`.

```css
:root {
  --bg: #080D18;
  --surface: #111928;
  --text: #EEF2F5;
  --text-muted: rgba(234, 238, 246, 0.62);
  --accent: #20D5E5;
  --accent-2: #20D5E5; /* alias — UI stays cyan + monochrome */
  --danger: #FF5C5C;
  --border: rgba(234, 238, 246, 0.08);
  --border-strong: rgba(234, 238, 246, 0.16);
}
```

## 2. Typography

Three roles, all Google Fonts. The Plex family carries "engineered
infrastructure" (tailscale/vercel tone); Rajdhani's squared terminals give
the display voice its technical edge without glitch effects.

```css
/* fonts.google.com: Rajdhani (600,700), Saira (400,500,600), IBM Plex Mono (400,500) */
:root {
  --font-display: "Rajdhani", sans-serif;
  --font-body: "Saira", sans-serif;
  --font-mono: "IBM Plex Mono", monospace;
}
```

| Role | Font | Size / weight | Notes |
| --- | --- | --- | --- |
| H1 / hero | Rajdhani | `clamp(44px, 7vw, 84px)` / 700 | UPPERCASE, `letter-spacing: -0.01em`, `line-height: 1.02`. Vercel-scale: the headline IS the hero. |
| H2 / section | Rajdhani | `clamp(28px, 4vw, 44px)` / 600 | UPPERCASE, tight. |
| H3 / card title | Rajdhani | `20px` / 600 | Sentence case allowed. |
| Body | Saira | `16px` / 400, `line-height: 1.65` | Long-form max-width 68ch. Lede paragraph: 19px. |
| UI / buttons | Saira | `15px` / 600 | Buttons uppercase, `letter-spacing: 0.04em`. |
| Micro-label / eyebrow | IBM Plex Mono | `12.5px` / 500 | UPPERCASE, `letter-spacing: 0.12em`, color `--accent` or `--text-muted`. Always prefixed `// ` (see §6). |
| Data / stats / code | IBM Plex Mono | 14px (code), 32–48px (stat numbers) / 400–500 | Player counts, server counts, version tags: `tabular-nums`. |

## 3. Spacing

Base-4 scale, generous vertical rhythm (infrastructure sites breathe; density
lives inside cards, not between sections).

```css
:root {
  --space-1: 4px;  --space-2: 8px;   --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px;  --space-7: 48px; --space-8: 64px;
  --space-9: 96px; --space-10: 128px;
  --container: 1200px; /* content max-width, 24px side padding on mobile */
}
```

- Section padding: `var(--space-9)` to `var(--space-10)` top/bottom.
- Card padding: `var(--space-5)`; grid gaps: `var(--space-4)`–`var(--space-5)`.
- Eyebrow → H2 gap: `var(--space-3)`; H2 → body gap: `var(--space-4)`.

## 4. Shapes — radii, borders, shadows

Square-leaning and hairline-bordered (FiveM/cyberpunk zero-radius, tailscale
flat cards). Depth comes from borders and one reserved glow, not drop shadows.

```css
:root {
  --radius-sm: 2px;   /* buttons, inputs, tags */
  --radius-md: 6px;   /* cards, panels — maximum radius anywhere */
  --notch: 12px;      /* signature cut corner */
  --glow-accent: 0 0 24px rgba(43, 217, 229, 0.25);
}
```

- Borders: `1px solid var(--border)` on every surface; `--border-strong` on
  hover/focus. No box-shadows for elevation.
- Signature shape: the primary CTA and featured cards get ONE notched corner
  (cyberpunk.net study, used with restraint):
  `clip-path: polygon(0 0, calc(100% - var(--notch)) 0, 100% var(--notch), 100% 100%, 0 100%);`
  Use on at most one element class per section.
- `--glow-accent` is reserved for live things only: status dots, the live
  server/player counter, an active nav state. Never on static decoration.
- Buttons: primary = `--accent` fill, `--bg` text, `--radius-sm` + notch.
  Secondary = transparent, `1px solid var(--border-strong)`, mono uppercase
  label (FiveM's "CREATE YOUR OWN SERVER" pattern) — ideal for the
  server-owner/developer audience CTAs.
- Imagery: night-city/rack photography sits behind a `--bg` overlay at 55–75%
  opacity so text always reads (fivem hero pattern); circuit texture may be
  used as section background at <=6% opacity.

## 5. Motion

Functional and fast; the page must feel like a running system, not a demo reel.

- Hover/press: 150ms `cubic-bezier(0.2, 0, 0, 1)`; border brightens, accent
  elements gain `--glow-accent`.
- Scroll reveal: opacity 0.999→1 + 12px translate-up, 400ms, once. Content is
  ALWAYS visible by default — animation enhances, never gates (no
  opacity:0 initial states).
- Signature moves (pick max 2 site-wide): blinking terminal caret after the
  hero H1 or a mono eyebrow that "types" once; live counter digits ticking up;
  status dot pulse (2s ease-in-out loop).
- No glitch loops, no parallax, no continuous background animation.
  `prefers-reduced-motion`: disable reveals and pulses entirely.

## 6. The `//` device

The double-slash from OPEN//77 is the identity's core typographic device
(legitimized by cyberpunk.net's `///` module labels, executed with platform
restraint):

- Wordmark: `OPEN//77` set in Rajdhani 700 uppercase; the `//` in
  `--accent`, the rest in `--text`.
- Every section eyebrow: `// SERVERS`, `// FOR CREATORS`, `// FAQ` (mono
  micro-label spec above).
- List bullets and breadcrumb/nav separators use `//` in `--text-muted`.
- Do not stack it with other decoration; where `//` appears, nothing else
  glows.

Iconography: inline SVG line icons only (tailscale ref), 1.5px stroke,
`currentColor`, 20–24px grid. No emoji anywhere.

## 7. Tone

Sober and technical like a network product that happens to live in Night City:
deep blue-black field, mono labels, real numbers (servers, slots, tick rates),
neon used the way a status LED is used. Community-warm at the edges — magenta
only where people are — and honest about pre-alpha status with a plain mono
version tag, never marketing gloss.

## Addendum — OPEN SIGNAL (current system, supersedes section 1 values)

One chromatic family with depth, not a flat cyan. Coral is semantic, never brand.
"Cyberpunk supplies the chaos. OPEN//77 supplies the signal."

```css
:root {
  --void: #060A12;      /* deepest field */
  --bg: #080E19;
  --surface: #0D1624;
  --surface-2: #132032;
  --text: #F2F6F8;      /* cold white */
  --text-dim: #8D99A8;  /* steel */
  --accent-ice: #70F3F5;  /* brand-mark highlights only */
  --accent: #22D8E2;      /* OPEN Electric — CTAs, links, active */
  --accent-deep: #18C8D4; /* reserved depth step */
  --signal: #FF5964;      /* coral — full/new/live semantics, ~2-3% budget, never CTAs */
  --line: rgba(174, 211, 224, 0.10);  /* blue-gray hairlines, not cyan */
}
```

Rules:
- The `//` mark is DUAL SIGNAL: slash 1 = Ice #70F3F5 (in), slash 2 = Electric #22D8E2 (out) — controlled values. This
  treatment lives only on the wordmark/favicon — never on buttons or titles.
- Cyan = platform / active / connected. Coral = live / full / featured / new.
- Game imagery carries every other color; the UI never borrows the game's palette.
- Hero: "CYBERPUNK" is white; only "2077" takes the accent — cyan belongs to
  OPEN//77, not to the game.
