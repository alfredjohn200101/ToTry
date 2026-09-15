# Apple-native design brief — ToTry

The owner's decision (15 Sep 2026): **fully Apple-native**. The app must read as a first-party iPhone
app. Two rounds of consistency work on the old dark-gold look still read as "vibe coded"; the look was
the problem. This document is the single source of truth for every screen.

## The one rule

Build screens from the components below. **Do not hand-paint.** A new inline colour, font, size,
border, shadow or gradient is the exact thing that made the old design look generated.

## Tokens (defined in `src/shell-head.html` `:root`, light + dark)

| token | meaning |
|---|---|
| `--bg` | grouped background (screen ground) — black / #F2F2F7 |
| `--bg2` | cell / card surface — #1C1C1E / white |
| `--bg3` | tertiary surface |
| `--bg4` | recess: progress track, grabber, pressed row |
| `--fill`, `--fill2` | translucent fills for gray buttons, fields, capsules |
| `--tx` / `--tx2` / `--tx3` | label / secondary / tertiary (all AA) |
| `--bd` | hairline separator |
| `--go` | **the tint** (iOS blue). `--go-bg` tinted fill, `--go-bd` tinted line. `--on-tint` ink on tint |
| `--re` `--gr` `--bl` `--pu` (+ `-bg`, `-bd`) | system red / green / teal / purple |
| `--font-text` `--font-display` | San Francisco |
| `--font-serif` | New York — **scripture and prayer text only** |
| `--font-rounded` | SF Rounded — big numbers only |
| `--t-micro 11` `--t-mini 12` `--t-cap 13` `--t-sm 15` `--t-md 16` `--t-base 17` `--t-hd 20` `--t-xl 22` `--t-title1 28` `--t-2xl 34` | the iOS Dynamic Type scale |

## Type roles

- **Large title** 34 bold — `class="page-title"`. The first thing on every screen, left-aligned.
- **Title 2** 22 bold — sheet titles (`.modal h3`).
- **Headline** 17 semibold — `.card-hd`, row titles that need weight.
- **Body** 17 regular — the default for sentences.
- **Subheadline** 15 — secondary lines under a title (`--tx2`).
- **Footnote** 13 — fine print, section headers (`.ios-header`, caps), footers (`.ios-footnote`).
- Nothing below 11. No letter-spaced caps. No monospace for labels. No serif outside scripture.
- **Left-align** content. Centre only: an empty state, a single hero number, a sheet's one-line
  confirmation. Never centre a paragraph or a card that also has left-aligned content.

## Components

- **Screen**: `.page-title` → sections. Sections are separated by space (28px), not boxes.
- **Inset grouped list** — the default for anything that is a list, a menu, settings or a set of
  destinations:
  ```js
  iosList([
    iosRow({ icon:'wallet', tone:'green', title:'Money', sub:'2 debts · $6,350 left', onclick:"go('money')" }),
    iosRow({ title:'Theme', value:'System', onclick:'openTheme()' }),
  ], { header:'Your life', footer:'Optional footnote.' })
  ```
  `iosRow` escapes `title`/`sub`/`value`; pass plain text. Tones: blue green red orange yellow purple
  indigo pink teal gray mint brown (each a white glyph on a system-colour tile, like Settings.app).
- **Card** `.card` — for rich content that is not a list (a chart, a hero number with context, a
  scripture passage). No borders. No nested cards: inside a card, group with space or a hairline.
- **Stat tiles** — `<div class="ios-stats"><div class="ios-stat"><div class="ios-stat-label">Paid off</div><div class="ios-stat-value">$3,300</div></div>…</div>`
- **Buttons** — `.btn.primary` (filled tint, the ONE main action on a screen), `.btn` (gray fill,
  tint label), `.btn.quiet` (plain tint text), `.btn.danger` / `.btn.success` (tinted). Full-width
  buttons are 50pt. A screen has at most one `.btn.primary` in view.
- **Segmented control** — existing `.fight-sub-tabs` + `.fst` (and `.bst`, `.rst`).
- **Capsules** (choices) — `.qb` / `.meal-chip`; selected = tint fill.
- **Fields** — plain `input`/`textarea`/`select`; they are already styled. Label with `.ios-header`
  above or a row.
- **Switch** — `<input type="checkbox" class="ios-switch">` inside an `.ios-row` (`trailing:`).
- **Empty state** — `<div class="ios-empty">svgIcon(name,44)<div class="ios-empty-title">…</div><div class="ios-empty-body">…</div></div>` + one button.
- **Icons** — `svgIcon(name, size)` only. Never emoji for chrome (moods, the traditions' marks and
  third-party brand tiles are content and stay).

## What does NOT change

- Every behaviour, handler, id, data key and word of copy that carries meaning. This is a visual and
  structural rebuild, not a rewrite of what the app does or says.
- **Crisis and helpline paths.** `tel:` / `sms:` links, helpline text, `detectCrisis` gating. They must
  stay prominent. If a change touches a crisis surface, run `npm run crisis`.
- The soul: warmth, grace, faith fully present. Apple-native is the *look*, not a colder voice.

## Verifying a screen

```
npm run build:index
node scripts/ios-shot.mjs <tab> both /tmp/out        # light + dark PNGs of the real screen
node scripts/ios-shot.mjs <tab> both /tmp/out --open "openSomeSheet()"   # a sheet
npm test
```
Look at both PNGs. The bar: would this pass as a screen Apple shipped?
