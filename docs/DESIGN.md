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
| `--font-text` | San Francisco — everything a person operates |
| `--font-display` | **the ToTry face (Cormorant Garamond)** — headlines only; resolves through `--font-brand` |
| `--font-serif` | New York — **scripture and prayer text only** |
| `--font-rounded` | SF Rounded — big numbers only |
| `--glass` `--glass-2` `--glass-line` `--glass-hi` `--glass-shadow` | the navigation material (bars, capsule, banner, FAB) |
| `--sheet` `--cell` | a sheet that carries content and the cells inside it — iOS's elevated pair, opaque |
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
  **A tone is a MEANING, and one concept gets one tone.** In Settings.app the tile colour IS the
  category; here it had stopped being anything. The same dumbbell drawing sat on orange (Grow →
  Train), the tint blue (Train → Strength workout) and green (the calendar's gym rows), while that
  same green also meant Nourish, Cardio and the whole Body front on Today — one glyph in four
  colours and one colour with four meanings, across screens a person walks in a single session.
  Settled for the body fronts, so the next screen does not invent its own: **training and the gym =
  orange, cardio = mint, food = green, body data = teal.** Before you pick a tone, grep for the
  icon name and take the tone the same concept already carries. The rest of the app has not been
  audited this way yet — Today's `flame` for Spirit is also orange, and whether that collides with
  training or reads as its own thing on its own list is an open question, not a decided one.
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

### Roles named while rebuilding the Coach, the Companion and the Feeling Door

- **A conversation** — `.msgs` holding `.msg.coach` / `.msg.user` (and the Companion's `.comp-msg-them` /
  `.comp-msg-me`, which are the same two bubbles): 17pt, 18pt radius, tail toward the speaker, the
  received one on `--fill`, the sent one in the tint. The PT chat uses the same classes and gets the same.
- **A composer** — `.irow` (or `.comp-reply-row`) is ONE capsule with a hairline; the field inside it is
  transparent and `.sbtn` is the round up-arrow at its trailing end, grey until there is text.
- **A sheet that carries content** — `.modal.moment-sheet` is opaque in the elevated pair (dark: `--bg2`
  sheet, `--bg3` cells; light: `--bg` sheet, `--bg2` cells), exposed as `--sheet` / `--cell`. The Feeling
  Door and the Companion use the same pair. Inside: `<h3>` title, `.moment-body` (17, the message),
  `.moment-note` (15 secondary, with `<b>` for the one word that matters), `.card.moment-plan` with an
  `.eyebrow` for a quoted plan or fact, ONE `.btn.primary`, the alternatives as `iosList` inside
  `.moment-list`, and `.btn.quiet` last.
- `.comp-link` — a quiet way onward inside a sheet: tint, 15pt, 44pt tall, left edge, optional icon.
- **The crisis card** — `.msg.crisis-msg`, built only by `showCrisisResponse()`. `.card-title`, `.card-lede`,
  `.eyebrow`, then `.crisis-row`s where the WHOLE ROW is the `tel:` link (56pt), and `.card-foot`. A
  contact naming several numbers renders each as its own `a.crisis-num`.
- `.feel-chip` — a feeling tile: the face and the word on one line, what it feels like under the word.
  Shared by the Feeling Door and onboarding's first moment.

### Roles named while rebuilding the Soul rooms (Threads, the day's anchor, Practice, Liturgy, Why)

- `.ios-list.in-card` — rows that belong to a `.card` (people, promises, seasons, values). The list gives
  up its own surface and runs to the card's edges, hairlines inset 16 on both sides, and carries the
  14pt gap *under* itself so nothing that follows needs a margin. Not a card in a card.
- `.passage` (+ `.lg`) and `.passage-ref` — scripture and the traditions' words in New York, upright,
  left-aligned, with the reference as a 13pt footnote. Never italic, never the tint.
- `.field-label` — a sentence stem over a field ("I am becoming a person who…"), 15 secondary.
  `.field-tall` — a textarea's height. `.btn.field-btn` — the button on one row beside a field.
- `.row-rank` — a number that ranks a row (values, the 99 Names), SF Rounded.
- `.ios-row-title.wrap` — the one exception to "a row title truncates": words the person wrote.
- `.ios-row.label-first` — what a value IS above the value (a reading's name over its reference).
- `.ios-row.is-next` / `.is-dim` / `.is-done` / `.is-broken` — one row in a set called out, dimmed,
  finished, or not kept.

### Roles named while rebuilding Soul, the Word, Read and Plans

- **Scripture on a surface** is the Soul rooms' `.passage` / `.passage.lg` / `.passage-ref`, used as they
  are. The same verse was drawn eleven ways across these four screens — italic 20, italic 16, SF 17 in
  `--tx2`, an 11px tint reference above it. A written or generated prayer is the same role
  (`.prayer-words` adds only its own line breaks). A chapter's verses (`.bvt`), a search result
  (`.bsr-text`) and the saved shelf (`.sv-v`) are that role at the same size.
- `.card-text` — a sentence that IS the content of a card (a prayer, the model's reading of what a person
  typed): 17, label ink. `.card-body.flush` is `.card-body` as a card's last line.
- `.card-toggle` — a label with an `.ios-switch` on its trailing edge, inside a card or a sheet.
- `.sv-list` / `.sv-item` — the saved-passages shelf as one inset list with a 44pt `.ios-row-x`.
- `svgIcon('beads')` — the practice row (rosary, misbaha, mala). Same grid as the other icons.
- **A hub is rows.** Soul is `.ios-section`s like Grow; a header is one to three words ("Daily rhythm",
  "Draw near"). A row whose subtitle is long keeps it all — never line-clamp a row that ends in "…go to
  one real person": that clause is the soul of the row.
- **A screen whose title changes with its state** (Plans: the list, then the plan) writes its own
  `.page-title` and calls `iosNavSync(tab)` after rendering, so the bar's title follows.
- **A caps label never holds a person's own words** — "2 verses for: tired and alone" is a
  `.card-foot`, because their words are not a label and will wrap.

### Roles named while rebuilding the Morning and Evening rituals

- **A stepped flow** (`.mstep-nav` / `.mstep-foot`, built by `renderMorningFlow` / `renderEveningFlow`):
  a page control; the step's name as the step's title in the ToTry face (34, hidden on step 0, where
  the ritual's own 40pt title stands); ONE filled `Continue`; under it `‹ Back` and "Show the whole …"
  as `.btn.quiet` on one line. Not a bordered box around a "‹", not an underlined 13px link.
- **The ritual title** — `.ritual-hero` is no longer a panel: eyebrow, `.ritual-title` (40), `.ritual-line`
  (17 secondary), on the grouped background like Today's greeting.
- `.card-text` — Body (17, label ink) inside a card, for a card whose sentence IS the content ("your day
  ahead", a person's own words). `.card-body` stays the 15 secondary line that supports something.
- `.face-scale` — a row of opaque tiles, a face over its word (`.face-l`, 13), the choice filled with the
  tint via `.on`. The morning's sleep answer and the evening's day rating are one control.
- `input.list-field` — a whole row of free text (the evening's priorities, three good things, a win).
  The other half of `input.row-field`, which is a value on a row's trailing edge.
- `.tick` — the circle Reminders uses for done, on a row with `role="checkbox"` / `aria-checked`, or
  `.tick.is-on` for a statement (a pledge already made).
- `.ritual-field` — the ritual's textareas: one height, one gap.
- `.prayer-box` / `.prayer-text` — an opaque surface, New York upright at 17 in the label ink.
- `.ritual-done` — the end of a ritual: centred like an empty state, the title in the ToTry face.
- `.sheet-steps` — a sheet's own progress (the examen's five segments).
- `.selectable` — on anything that prints a person's own words back to them. `body` is not selectable;
  this class (and inline `white-space:pre-wrap`) is the exemption, so a class-styled read-back of their
  journal needs it or they cannot copy what they wrote.

### Roles named while rebuilding Settings

- `.settings-stack` holding `<details>` whose `<summary class="ios-row has-icon">` is an ordinary row —
  consecutive closed groups draw as ONE inset list (Settings.app), an open group ends the run and its
  sections follow it, the chevron turns 90°. Same row markup as Train's `.tr-disclose`; the stack only
  adds the chaining. The group row's trailing `.ios-row-value` says the choice made inside it.
- `select.row-field` + `<span class="ios-row-chevron menu">` — a `<select>` as a row's value: no fill,
  right-aligned (`text-align-last`, never `direction:rtl`, which flips brackets), a turned-down chevron.
- `input.row-field[type="time"]` — iOS's compact time picker: the value in a grey capsule. `.row-unit` —
  the unit after a numeric row field, same size, secondary ink.
- `<label class="ios-row">` + `.ios-switch` — every on/off. The renderer sets `.checked` from storage,
  never a label. A switch whose handler **asks first** (a confirm, Face ID, a permission, sign-in) is
  written `onclick="this.checked=!this.checked;fn()"`: the tap puts it back and the renderer moves it once
  the answer is saved, so a cancel cannot leave it lying.
- A pick-one list is `button.ios-row` + `.ios-row-check`, selected by `.active` (+ `aria-pressed`), never
  by an inline border colour. `.ios-row-mark` puts a text mark (a tradition's sign) in the icon slot.
- `.crisis-card` rows: `.crisis-line` > `.crisis-name` (+ `.crisis-how` under it) and the number as the
  link on the trailing edge, 44pt tall; `.crisis-note` is its footnote.
- Sheets: `p.modal-sub` (note `.modal p` out-ranks a bare `.modal-sub`, which is why it is spelt with
  the element), `.sheet-note` (a field's explanation, 15), `.sheet-block` (a hairline-topped second part),
  `.btn.sheet-alt` (the second button's gap), `.legal` (a long document with its own scroll),
  `.sheet-section` / `.sheet-list` (grouped rows inside a sheet), `.sheet-confirm` (the one centred sheet).

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
