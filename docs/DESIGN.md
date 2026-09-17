# ToTry × Liquid Glass — the design brief

**The correction (16 Sep 2026).** The first pass read "Apple quality" as "look like Apple" and stripped
the brand out — system fonts everywhere, the ToTry face reduced to a logo. The owner's words:

> "you went too far with the apple conditioning I liked it where the to try logo font was being used
> i meant in fact of liquid glass, what the phones are capable of but like we have a style dna sure
> but where there are little text and things it looks vibe coded instead of apple like."

So the target is not Apple's *identity*. It is Apple's **material and craft**, carrying **our voice**:

1. **The system is Apple's.** Dynamic Type scale, 44pt targets, inset grouped lists, standard controls,
   the light/dark system palette, the tint on anything actionable.
2. **The voice is ours.** `--font-display` IS the ToTry face (Cormorant Garamond): every headline —
   the greeting, large titles, ritual and sheet titles — speaks in the wordmark's own serif. Gold
   (`--brand`) signs the name. San Francisco carries everything a person *operates*.
3. **Liquid Glass is what the phone can do.** The bars are a translucent material with content moving
   under them, a hairline edge and a specular highlight — not painted panels.
4. **The craft is in the small text.** "Vibe coded" is not the big layout; it is the 11px label nobody
   sized, the third grey, the title that wraps under its own value, the caps with no tracking.

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

The app has **two faces and one job each.** The serif SPEAKS (it is the app talking to the person);
San Francisco WORKS (everything the person reads to act, scan or operate). If you cannot say which of
those a piece of text is doing, it is San Francisco.

- **Large title** 40 / weight 500, the ToTry serif — `class="page-title"`. First thing on a screen,
  left-aligned. `--font-display` already resolves to the serif: never name a family at a call site.
- **Sheet title** 26 serif (`.modal h3`). **Greeting / ritual / feeling titles** 34–40 serif.
- **Headline** 17 semibold SF — `.card-hd`, row titles that need weight.
- **Body** 17 regular SF — the default for sentences.
- **Subheadline** 15 SF — secondary lines under a title (`--tx2`).
- **Footnote** 13 SF — fine print, section headers (`.ios-header`), footers (`.ios-footnote`).
- Scripture and prayer stay **New York** (`--font-serif`) — a reading face, not the display face.
- Numbers stay **SF Rounded** (`.ios-stat-value`, `.stat-num`). A serif numeral in a metric reads as
  decoration; the number is data.
- **Never bold the serif.** It ships one roman weight; `font-synthesis` is off globally so a `700`
  renders as 500 rather than a smeared fake bold. Use 400/500 and size for emphasis.
- **Left-align** content. Centre only: an empty state, a single hero number, a sheet's one-line
  confirmation. Never centre a paragraph or a card that also has left-aligned content.

## Liquid Glass — and where it is NOT allowed

Glass is the **navigation layer**: the nav bar, the floating tab capsule, sheets, the banner, the FAB.
Those float over a scroller that runs the full height of the screen, so real content passes under them
and the blur has something to refract. Tokens: `--glass` (thin, the bars), `--glass-2` (thick, sheets),
`--glass-line` (hairline edge), `--glass-hi` (specular top edge), `--glass-shadow`.

**Content never sits on glass.** A card, a row, a paragraph, a number — those are opaque (`--bg2`) so
they stay legible over whatever scrolls beneath. A screen that puts text on a blur is the failure mode
of this material, not the point of it. Do not add `backdrop-filter` at a call site; the chrome already
has it.

Motion is part of it: controls answer the finger with a spring (`transform:scale(.97)` on `:active`),
never a colour flash. That is already on `.btn`, the capsules, the tab bar and the FAB.

## The small text — where "vibe coded" actually shows

This is the part the owner is pointing at, and it is invisible in a wireframe. Rules:

- **Three text greys, no fourth**: `--tx` (label), `--tx2` (secondary), `--tx3` (tertiary — chevrons,
  placeholders, disabled). If a value looks "a bit dimmer", it is one of the three, not a new rgba.
- **Section headers** are 13px, uppercase, `letter-spacing:.045em`, `--tx2` — that tracking is what
  makes caps look set rather than typed. Use `.ios-header` / `.lbl` / `.eyebrow`; never roll your own.
- **A row title is one line.** It truncates; it never wraps under its value. Use `iosRow` and it is
  handled — the hand-rolled version of Today's spine gave the label a fixed 66px and "The fight"
  broke in half on every phone.
- **Footnotes are 13**, never 11 or 11.5. The only 10px in the app is the tab bar label, which is what
  iOS uses. Two neighbouring sizes that differ by a pixel are a defect (`npm run panels` fails it).
- **No naked micro-copy.** A line under a control is either a `.ios-row-sub` (15) or an
  `.ios-footnote` (13, outside the list). Nothing floats at an improvised size and colour.
- **A section header is a LABEL, not a sentence** — one to three words, and it must fit one line.
  Soul shipped "DRAW NEAR — SCRIPTURE & STILLNESS, ALL IN ONE PLACE" wrapping across two lines of
  caps; iOS would say "Draw near" and put the rest in the section's footnote, or drop it. Caps
  wrapping is one of the loudest generated-looking shapes in the app.
- **Numbers align**: `font-variant-numeric:tabular-nums` is already on values and stats. Anything in a
  column of numbers uses it.

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
  `chevron:false` for a row that already ends in a control; `tag:'div'` for the one shape a
  `<button>` cannot hold — a tappable row that also carries its own button (the calendar's delete).
  A `<button>` inside a `<button>` is not parseable HTML: the parser closes the outer one.
- **Screen subtitle** `.page-sub` — the sentence under a `.page-title`. 17px, `--tx2`.
- **Section header with an action** — `<div class="ios-header home-section-hd"><span>Today's
  habits</span><button class="hd-action" onclick="…">Add or edit</button></div>`. That is Settings'
  "Edit": the label at 13 caps, the verb at 15 in the tint. Not an 11px caps micro-link.
- **Card** `.card` — for rich content that is not a list (a chart, a hero number with context, a
  scripture passage). No borders. No nested cards: inside a card, group with space or a hairline.
  Inside one, use the three roles rather than sizing anything by hand — Today's hand-painted cards
  re-invented them eleven times between them, at 11px, 12px, 15px and 17px, half of them italic:
  - `.card-say` — **the app SPEAKING**: the coach's sentence, the welcome, the hand after a slip.
    22px in the ToTry face, upright, weight 500. Never bold it and never set italic on it.
  - `.card-body` — the sentence that supports it. 15px, `--tx2`.
  - `.card-foot` — the footnote under it. 13px, `--tx2`; `.card-foot.tint` when it is an action.
  - `.home-card-top` (title row with a `.card-x` dismiss) and `.btn-row` (two choices side by side;
    stack them instead when either label is a phrase, or the longer one wraps inside its button).
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

### Roles named while rebuilding Grow and Track

Each of these replaced an inline recipe that was written out two to nine times. Use them; do not
re-paint them at a call site.

- `.page-intro` — a screen's opening sentence under the large title. 15/secondary.
- `.card-display` / `.card-sub` / `.card-note` — inside a `.card`: the headline in the ToTry face
  (26), the line under it (15 secondary), fine print (13 secondary). The last two replaced centred
  italics.
- `.btn.row-btn` — the small capsule control on a row's trailing edge (Connect, Turn on). `.btn` is
  the 50pt full-width button; this is the other one.
- `.ios-stepper` holding two `.tr-btn`s — a − / + stepper as one capsule, not two bordered boxes.
- `input.row-field` — a value field on a row whose label is the row's. Right-aligned, no fill.
  Its selector deliberately matches the base field rule's specificity, or the field's `!important`
  fill wins and the row grows a grey pill.
- `.ios-stats.trio` — three stats across. Plain `.ios-stats` is auto-fit at 140px, which on a 393pt
  phone gives two columns and a widow, and clipped the third label.
- `.ios-row.has-del` — a row carrying a `.fli-del`; the row gives way so the 34px control fits a
  44pt row. Never shrink `.fli-del` or pull it with a negative margin (it has overlapped twice).
- `.footnote-link` — a footnote a thumb can land on (44pt), for the one that is really a control.
- `.disclosure` — a `<summary>` as an iOS row with a chevron, instead of caps with an icon.

### Roles named while rebuilding first run and sign-in

- `.ios-list.wrap` — a list whose rows are SENTENCES (identity suggestions, what's-new items). A row
  title is one line because a value sits at its end; a row with no value may wrap rather than hide the
  words it is offering.
- `.ob-features` / `.ob-feature` (`-t`, `-s`) — the iOS welcome-screen list: a tinted 30px glyph, a 17
  semibold headline, a 15 secondary line. For "here is what this is", not for destinations (those are
  rows).
- `.ob-actions` — a step's one `.btn.primary` and the `.btn.quiet` way past it, stacked. `.ob-foot` is
  the footnote under them.
- `.ob-mark` — a tradition's own mark where a row would carry an icon tile. Content, not chrome.
- A pick-one list is rows with `.ios-row-check`, shown on the chosen row — the seasons, like Money's.
- A yes/no or a tier choice inside a card is `.seg` + `.fst` with `.active` on the chosen half, not two
  `.btn`s toggled to `.primary` (that put three filled buttons in one screenful).
- `text-wrap:balance` on a headline or a centred footnote that would otherwise end on one word.
- A `tel:` link that IS a row: `a.ios-row` under `.auth-help`, which restores the row box the global
  inline-number rule (`a[href^="tel:"]`) would otherwise shrink to 30px.

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

Look at both PNGs. The bar: **would this pass as a screen Apple shipped — with our name on it?**

`ios-shot` renders in Chromium, which is not what ships. For anything that depends on the MATERIAL or
the display face (glass, blur, the serif), confirm it in WebKit on the simulator:

```
node scripts/sim-serve.mjs            # serves the real bundle, seeded, and opens it on the booted sim
```

Both that harness and `ios-shot` seed from `scripts/seed-person.mjs` — one person, one source. Never
inline a seed of your own: a key the app does not write renders an empty screen, and a review of empty
states reads exactly like a review of the app.
