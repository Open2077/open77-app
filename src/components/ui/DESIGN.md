# OPEN//77 design system

The site is built in one visual language: the home page concept by nuixw
(`src/app/page.tsx`, `src/components/home/*`). Every page reuses the primitives
in this folder. A page that needs something the primitives do not cover builds
it in the same language, in its own feature folder, from the same tokens.

See every primitive rendered at `/design-system` (development only).

## The language in one paragraph

Near-black navy page (`--body`), white text, three accent colours. Titles in
**Druk Text Wide Medium Italic**, uppercase, very tight tracking. Labels,
navigation and table heads in **Nippo**, small wide-tracked capitals. Body copy
in **Satoshi**. Code in **JetBrains Mono** at a light weight. Small interactive
shapes are **parallelograms** skewed at `-12deg` (`var(--skew)`): buttons,
chips, tags, inputs, list rows. Large surfaces are **hairline rectangles**,
optionally with skewed corner **brackets** in the accent colour. Thin 1px lines
everywhere, no rounded corners, no drop shadows, no gradients except dark
fades over key art. Motion is sparse: the hover text scramble (`Glitch`), the
magnetic pull on buttons, the speed lines on the primary button, the RGB split
on page titles.

## Tones

Each audience has a colour, and each page takes the colour of its audience.

| Tone | Audience | Pages |
|---|---|---|
| `yellow` | Players | home hero, servers, download, launcher, account, status, auth |
| `blue` | Server creators | create, host, workshop, map editor (ncwe), hosting docs |
| `red` | Developers | docs, Lua API, devblog, dev tracker, admin |

`src/lib/tone.ts` (`toneForPath`) is the source of truth; the header uses it,
and every page passes the same tone to `<Page tone>`. Inside a page, use
`var(--tone)` for accents; never hard-code `--yellow`/`--blue`/`--red` unless
the colour carries a meaning of its own (e.g. a red "danger" state).

## Tokens (src/styles/system.css)

- Colours: `--body`, `--text-primary`, `--text-dim` (secondary copy),
  `--text-faint` (placeholders, meta), `--text-secondary` (decorative slate,
  too dim for running text), `--yellow`, `--blue`, `--red`, `--tone`.
- Surfaces: `--surface-1` (panels, fields), `--surface-2` (hover, raised),
  `--surface-3`. Lines: `--line` (hairlines), `--line-strong`.
- Geometry: `--skew` (-12deg), `--skew-reverse`, `--header-height`,
  `--container-width`, `--container-max`, `--page-gutter`, `--margin-1`
  (section spacing).
- Motion: `--transition-link`, `--cubic`, `--ease-out-expo`.
- Fonts: `--font-main`, `--font-heading`, `--font-nippo`, `--font-mono`.

## Primitives

| Import | Use |
|---|---|
| `page` → `Page`, `PageHero`, `Section` | Every page is `<Page tone>`; most start with a `PageHero`; content blocks are `Section`s. |
| `typography` → `Eyebrow`, `Display`, `Lead` | Labels, display titles (`size` xl/lg/md/sm/xs, `lines` + `accent`), lead paragraphs. |
| `button` → `Button` | Every action. `lines` only on the single primary action of a view (`lines="none"` elsewhere, or the lines overlap neighbours). `border` for secondary, `color="neutral"` for tertiary, `size="sm"` in dense UI, `iconOnly` + `aria-label` for icon buttons, `busy` while saving, `href` for links. |
| `panel` → `Panel` | Grouped content. `brackets` for the main panel of a view, `interactive` for clickable cards, `shape="slant"` only for short cards. |
| `chip` → `Chip`, `Tag` | `Chip`: filter toggles with counts. `Tag`: static labels (mode, version, state). |
| `field` → `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch` | All form controls. Wrap each control in `Field` for its label, hint and error. |
| `tabs` → `Tabs` | Sub-navigation (links) or segmented choice (values). |
| `feedback` → `Notice`, `EmptyState`, `Loader`, `Stat`, `Meter` | States and numbers. |
| `data` → `Table`, `Breadcrumbs`, `Avatar`, `DefinitionList` | Tabular data, location, people, label/value facts. |
| `prose` → `Prose` | Rendered Markdown and articles (docs, devblog, readmes). |
| `code-block` → `CodeBlock`, `CopyButton` | Code samples with a file label and copy. |
| `dialog` → `Dialog` | Modals (confirmations, forms). |
| `icon` + `icons` → `Icon` | `<Icon glyph={search01} />`. Glyphs are named exports of `icons.ts` (Hugeicons stroke set). For a missing glyph, pass any 24×24 stroke SVG body. |
| `glitch` → `Glitch` | Hover scramble on link labels (`SmartLink glitch` does it for you). |
| `smart-link` → `SmartLink` | Links: external ones open in a new tab, `glitch` adds the scramble. |
| `logo`, `container`, `marquee`, `glitch-frame`, `video` | Brand mark, centred column, ticker, WebGL hover glitch on character art, background video. |

Site chrome (`src/components/site/*`: header, footer, grain) is rendered by the
root layout. Pages never render their own header or footer.

## Rules

1. **No legacy styles.** The old design (`src/styles/legacy`, `globals.css`
   and its imports, class names like `btn`, `page-hero`, `section-inner`) is no
   longer loaded. Replace every legacy class with primitives and CSS modules.
2. **CSS modules per component**, next to the component. No new global CSS.
   Use `:global()` only to style generated HTML (Markdown, Shiki).
3. **Overriding a primitive.** Pass a class through `className`: it always
   beats the primitive's root rule, because primitives write their root
   classes as `:where(.btn)` (zero specificity) and element resets live in the
   `op77-reset` cascade layer. Do not rely on stylesheet order: production
   chunking merges CSS across routes and does not keep import order, so a tie
   between two single-class rules can resolve one way in `next dev` and the
   other in `next build`. Variants and states (`.btn.blue`, `.btn:hover`) stay
   compound and still win over a plain override, as in development. A new
   primitive must follow the same pattern; a parent restyling a child inside
   its own module scopes the rule (`.cta .ctaIcon`) rather than counting on
   order. Still import child components first and your own `.module.css` last.
4. **Tokens only.** No raw hex colours, no new fonts, no border-radius, no box
   shadows. Spacing in `rem`/`em`, fluid sizes with `calc(vw + px)` like the
   existing modules.
5. **Accessibility is not optional.** Labels on every control (`Field`),
   `aria-label` on icon-only buttons, visible focus (the global
   `:focus-visible` outline), real headings in order, `aria-current` on the
   current navigation item, sufficient contrast (`--text-dim` minimum for
   copy).
6. **Responsive.** Check 1440, 1024 and 390 wide. Below 1084px, layouts stack.
7. **Keep behaviour.** A redesign changes markup and styles, never features:
   data loading, URL state, keyboard shortcuts, forms, validation, analytics
   and SEO metadata stay as they are.
8. Do not modify `src/components/ui/*`, `src/components/site/*`,
   `src/styles/system.css` or `src/lib/tone.ts` from a feature task; build
   what you need in your feature folder and report anything that belongs in
   the shared set.
