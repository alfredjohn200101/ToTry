# CLAUDE.md — To Try

> Read this first. It tells you what this project is, its soul, how it's built, the rules, and what
> to do next. Then read SOUL-ARCHITECTURE.md and NATIVE-WRAPPER-GUIDE.md.

## What To Try is
A free, faith-rooted, whole-life self-improvement PWA — "the big sibling I never had." It is the
one home where every part of a person's life lives together (body, mind, money, spirit) so that
tracking becomes **counsel**. It meets a person at the moment they feel something — the entry point
is emotion, not data (see the Feeling Door, below). Built by Alfy (Alfred John), a practicing
Catholic, for anyone — men and women — silently suffering and seeking purpose in a world of impulse
and dopamine. Live: https://alfredjohn200101.github.io/ToTry/

## The soul (do not drift from this)
- **A presence, not a tracker.** It speaks at thresholds (about to cross a line), meets you in the
  moment, and guides when asked. Quiet by default, there and ever-present, never overbearing.
- **Integration IS the product.** Every other app is one feature of a person; this sees the whole,
  so its counsel is true in a way no single-feature app can be. Protect the cross-front threads.
- **Grace over shame. Presence over measurement.** A lapse is feedback, not failure.
- **It points beyond itself** — to real people, a priest, a counsellor, the sacraments. It is NOT a
  replacement for real help; when something is serious, it hands the person to a human. It must
  never foster dependence or farm engagement (anti-engagement is a feature, not a bug).
- **Faith is full but never forced.** Built honestly from a Christian heart; a person of any belief
  or none is fully served (Settings → Faith dials scripture intensity).
- **Gender-aware.** Knows biological sex (Settings → About you); calorie/protein math and the
  sibling's voice adapt. The founder's story stays "big brother"; the app's voice is universal.

## Tech stack
- **`index.html` is GENERATED. Do not edit it.** Edit the module under `src/app/` and run
  `npm run build:index`. The app is still one file when it ships (~44k lines, ~3.0MB, all inline —
  that's deliberate for the PWA), but the source of truth is now `src/`:
  `src/shell-head.html` + **42 modules** (`00-boot.js` → `01-sync.js` → `02-native.js` →
  `03-person.js` → … → `40-identity-seasons.js` → `app.js`) + `src/shell-tail.html`, concatenated
  in exactly that order. `app.js` is now just the undo system — 33 lines, down from ~31k.
  **Order is semantics** — one script, one shared top-level scope, no module system: a `function`
  hoists, a `const` does not. Never reorder modules; only ever slice a new one off the FRONT of
  `app.js` (`scripts/extract-prefix.js` does this and refuses if it doesn't round-trip).
  `npm run verify:index` must print `identical` — it compares byte-for-byte by sha256, and
  `npm run preflight` fails if it doesn't. If you edited `index.html` by hand, that check tells you
  the exact line; move the change into the module and rebuild.
- `sw.js` — service worker (cache-first shell). Bump `const CACHE` with every release.
- Supabase backend (URL: oklvalcgxeoudgpldzkk.supabase.co). AI via an `ai-proxy` edge function with
  a free-first chain (Gemini → Groq → OpenRouter → Anthropic Haiku) + web search. See AI-PROXY-DEPLOY.md.
- Hevy + Strava integrations. GitHub Pages hosting, manual deploy.
- `APP_VERSION` in `src/app/00-boot.js` — currently **v611**. Bump it AND `CACHE` in sw.js together, always.

## The design system — ToTry × Liquid Glass (16 Sep 2026, branch `ios-native`)
Read `docs/DESIGN.md` before touching any UI. It was `docs/APPLE-NATIVE.md` for one day, and the rename
is the lesson: the first pass read "Apple quality" as "look like Apple", stripped the brand out, and the
owner corrected it — *"you went too far with the apple conditioning ... i meant in fact of liquid glass,
what the phones are capable of ... we have a style dna sure but where there are little text and things
it looks vibe coded"*. Apple's **system and craft**; ToTry's **voice**. In short:
- **iOS system colours**, light and dark, in `:root` + two light blocks (the phone's appearance, and an
  explicit choice). Default appearance is **System**; `applyTheme()` only sets/removes `data-theme`.
  The tint is iOS blue in ONE token, `--go` (the name is historical). Native side follows too:
  `ViewController.applyAppearance()`, the privacy cover, and a light/dark launch image.
- **BOTH FACES ARE THE APP'S OWN.** `--font-text` is **Outfit** (one variable woff2, real weights
  300–700) — rows, labels, buttons, values, the tab bar, and the data numbers (`--font-rounded`), with
  the system stack only as a fallback. `--font-display` is **Cormorant Garamond** — headlines and the
  counts a person EARNS. **New York** (`--font-serif`) stays for scripture. San Francisco renders
  nowhere: the owner's words were *"the fonts look too much apple coded ... u ripped too much"*, and with
  SF on ~95% of visible text the app read as Apple whatever the headlines said. `font-synthesis` is off
  globally, so every weight must be real — which is why Outfit's variable file matters. Tracking moved
  with the face (SF's -0.022em → -0.006em; caps keep +.045em).
- **Liquid Glass is the NAVIGATION layer only.** `.hdr` and `.nav` are absolutely positioned over a
  full-height scroller (they were flex siblings of it, so nothing ever passed behind them and the blur
  had nothing to refract); the tab bar is a floating capsule. `--glass`/`--glass-2`/`--glass-line`/
  `--glass-hi`/`--glass-shadow`. **Content is never on glass** — cards and rows stay opaque.
- **Build from components, never paint inline**: `.page-title` (large title), `iosList([iosRow({...})])`
  (inset grouped rows — they escape their text), `.card`, `.ios-stats`, `.btn.primary/.btn/.btn.quiet`,
  segmented controls (`.fst`), `.ios-switch`, `.ios-empty`, `svgIcon()`. The back button lives in the
  nav bar (`updateHubBackBar` → `#ios-nav-lead`); `iosNavSync()` fades the title into the bar on scroll.
- **The small text is the tell**: three greys and no fourth, 13px section headers with .045em tracking,
  a row title that truncates instead of wrapping, footnotes at 13 not 11.
- **THE SCREENSHOT CAN OMIT THE APP.** `ios-shot` renders in Chromium and injected the phone's
  safe-area insets with `addStyleTag()` AFTER boot. That rule moves the tab bar up 34px, and Chromium
  then composites the moved element over a backdrop snapshot it never re-samples — so **every
  screenshot this project had ever taken of the new chrome was missing the glass**, and the owner and
  six independent reviewers all read the same true thing about a false render ("that clear glass at
  the bottom don't look clear glassy to me"). Four high-severity findings were artifacts of it.
  Settled by measurement, after every cheaper method lied: a calibrated stripe probe (2px stripes
  behind the bar; blur destroys high-frequency energy) reading 53.8 sharp / 2.7 blurred. Playwright's
  **WebKit draws no `backdrop-filter` at all, on any page**, so it can neither confirm nor deny. Four
  structural hypotheses were each built as a live repro on the booted simulator and every one blurred.
  So: `node scripts/sim-shot.mjs <tab[,tab]> [light|dark|both] [out] [--scroll N] [--css '…']`
  screenshots from **WebKit on the booted simulator** — use it for anything about glass, blur or a web
  face, and for `--css` to put a deliberate worst case behind the chrome and measure it. `ios-shot` is
  still the faster read for layout and now PROVES the glass is in the picture before handing one over,
  saying "THE MEASUREMENT IS WRONG, NOT THE APP" when its own references fail to separate. Both seed
  from `scripts/seed-person.mjs` — one person, one source; an invented key renders an empty screen.
  When many reviewers agree about a rendered image, that is evidence about the IMAGE, not the app.
- **AND SAFARI IS NOT THE APP EITHER.** `sim-shot` fixed Chromium by serving the bundle to the
  simulator's Safari, and it is what caught the missing glass — but it is still a web page in a
  browser, with Safari's toolbar along the bottom, its URL bar, "◀ Safari" in the status bar and a
  page inset below a status bar it does not own. Every screenshot shown to the owner looked like a
  PWA because it WAS one, and they said so: *"still looking like pwa where dynamic island isn't
  accounted for"*. The renderer had been fixed one step short of the thing that ships.
  `node scripts/app-shot.mjs install | launch [light|dark] | capture <name> [out]` drives the real
  Capacitor build. Measured on it, and invisible in any Safari capture: the safe area IS honoured
  (the wordmark sits 13pt below the 59pt inset), the glass bar DOES materialise on scroll and extend
  behind the status bar and the Dynamic Island, and the large title DOES collapse into the bar with a
  back button on a sub-screen. `viewport-fit=cover`, `contentInset: "never"` and `black-translucent`
  are all set, and the status bar style reads the app's own theme rather than the device's.
  It deliberately does NOT navigate: the app declares no `CFBundleURLTypes`, so there is no
  `totry://` to open a screen with, `simctl` cannot synthesise touches, and `idb` will not install on
  this machine. Taps come from the simulator control tool. `capture` hashes the frame BELOW the top
  180px and says when a capture is identical to the last one, so a tap that missed is visible instead
  of silent — the first version hashed the whole file and was useless, because the status bar's
  minute changes between any two captures and every screen therefore looked "different".
- **A MATERIAL THAT REPEATS ITS BACKDROP IS A WINDOW.** The capsule was a 30%-opaque tint under
  `saturate(220%) brightness(1.38)` — it amplified whatever scrolled beneath it, so wherever the app's
  own blue passed under the bar every tab label fell under AA (measured on the phone: 1.56–2.36:1 in
  dark). Three separate causes, three separate fixes: the tint is 0.60–0.68 opaque at saturate(135%);
  the bar's ink is `--tx2`, not the footnote grey `--tx3`; and the selected tab has a SEAT
  (`--nb-sel`) plus the ink that seat can carry (`--nb-sel-ink`) — tint on near-white in light, white
  on a lifted neutral in dark. Tint ink on a tint-coloured ground is the one pairing a material cannot
  rescue: it was still 2.03:1 after the material was fixed. Now 4.63–5.64:1 everywhere. The rim is one
  masked gradient ring (`--glass-rim`), not a border plus an inset highlight — two strokes on the top
  edge is the giveaway of a painted pill, and a white rim on a white material is no rim at all.
- **A FILL IS NOT A LABEL.** `--go` / `--re` are tuned to be READ on the ground, which made them pale
  things to fill a button with: white on the dark tint measured **2.83:1** on Today's primary action and
  on "I'm feeling it". Filled controls take `--go-fill` / `--re-fill`; a test holds white on those to AA
  in both appearances. The contrast matrix had passed because every pair it checked was ink on a
  BACKGROUND token — nothing had ever asked about ink on an ACCENT.
- **`node scripts/craft-audit.mjs`** measures the thing the owner actually complains about: it walks the
  screens and asks the BROWSER for every visible text run under the footnote size, the census of greys
  and families, caps labels that WRAP, and same-styled neighbours a pixel apart. It calibrates on planted
  defects first and refuses to report if it cannot find them. 16 Sep → 21 Sep, ten screens, dark:
  under-13px 126 → 0, wrapping caps 9 → 0, neighbours 2 → 0, greys 5 → 3, DM Mono 38 → 0.

## The nervous system (key functions — grep these)
- `getLifeState()` — returns the whole person {training, nutrition, body, soul, fight, readiness,
  money, sex, activity, brief}. The brain everything reads.
- `lifeStateBrief()` — compact text of the whole person fed to the AI.
- `brotherSpeaks(moment)` — the threshold voice (viceOver | calorieOver | trainTired). One voice,
  all thresholds. Throttled, never blocks, choice-first.
- `brotherGuidance()` — proactive counsel ("what should I do right now?").
- `openFeelingDoor()` / `_feelMove()` — THE FEELING DOOR: the orb's primary action. Meets a person
  in their feeling and moves them through it. This is the entry point through emotion.
- `Notify` (object) — wrapper-aware notification layer; native push when wrapped, web fallback now.
- `svgIcon(name, size)` (`src/app/00-boot.js`) — **the app has ONE icon language.** 66 icons on the
  same 24x24 grid, weight and round caps as the 25 tab-bar icons, drawn `stroke:currentColor` so an
  icon in a gold card is gold. It is NOT called `ic()`: it was, for an hour, and `renderCalendarWeek`
  already had `const ic = document.getElementById(...)` one line below an inserted call, so the call
  hit that const's temporal dead zone and the whole calendar threw — with `npm test` green, because a
  TDZ error is a runtime fact. In one shared top-level scope a two-letter global is a loaded gun.
  The static shell cannot call a function, so its icons are **inlined literals**; a test asserts every
  literal is byte-identical to `svgIcon()`'s own path, which is what makes that duplication safe.
  What stays emoji is content, not chrome, and is named in the test: the mood and sleep faces (a
  person in a bad moment reads a face faster than a line drawing) and the traditions' own marks.
- `applyHomeProgressiveDisclosure()` — hides depth for new users, unlocks as they establish.
- Companion = the in-the-moment bottom-sheet (clinical mechanisms: urge-surf, ACT defusion, CBT
  cognitive restructuring, grounding). `_companionSay()` builds its prompt.

## NON-NEGOTIABLE WORKFLOW RULES
1. **Parse-check after EVERY edit.** `npm test` now does it for you — it extracts every inline
   `<script>`, runs `node --check`, and asserts div balance. Added at v483 after a stray string
   terminator shipped: index.html would not parse — a white screen for everyone — and the suite
   reported 1032 PASSED, because the harness extracts functions by name and never parsed the whole
   script. A suite that stays green while the app cannot boot is worse than no suite.
2. **Run the whole gate before you ship**, not just `npm test`:
   - `npm test` — 2367 assertions over the real bundle (core math, dead code, privacy promises,
     the voice gates, the parse check). Four classes were added on 6 Sep 2026 after an audit of the
     PREVIOUS round's own fixes, each of which had been fixed only where it was reported:
     **(a) a person's own typing as live HTML** — the v579 sweep found five doors by looking for typed
     fields reaching shared sinks. `addRecipeIngredient()` reads a free-text input and
     `renderRecipeIngredients()` writes it with `innerHTML`, with no shared sink in between, so the
     scan walked past it. **A model's reply is the same class**: the scripture search hands the person's
     own words to the AI and printed `v.text`/`v.reference`/`v.relevance`/`v.verse`/`v.reflection` as
     markup — `data.reading` two lines above used `textContent`. Third-party scripture endpoints too.
     After every `api()` + `JSON.parse`, grep the next ~45 lines for `innerHTML`.
     **(b) the app's VOICE never converted its units.** Screens were converted card by card from v529;
     nothing ever told the MODEL, so the coach, the companion and the brother all answered a
     pounds-and-miles person in kilograms. Fixed once in `lifeStateBrief()`, which every AI surface
     reads, and only for non-metric people. When a preference changes what a person SEES, ask
     separately what the app SAYS.
     **(c) `plural(n, singular)`** — "1 days clean" is the sentence this app says most, and day one is
     where everybody starts and where anybody who slips returns. Takes the SINGULAR: the first cut took
     the plural and stripped `/e?s$/`, which produced "2 battls" and "2 tims".
     **(d) every button calls a function that exists** — the id sweep asked this of elements; nothing
     asked it of behaviour. Strip string literals from the handler body first (and unescape `&apos;`),
     or "Suscipe (Take Lord, Receive)" reports a missing `Suscipe()` and the check gets ignored.
     Two more were added 8 Sep 2026, both out of ONE bug: `--bg4` was the only colour token
     `applyTheme()` never re-set, so in the light theme the unfilled half of every progress bar, the
     check-in slider groove, the sheet grab handle and the onboarding dots stayed **#222228** — a goal
     bar reading 20% green then 80% BLACK, which a person reads as nearly full.
     **(e) every colour token declared in `:root` gets a light-theme value.** The check that existed
     asked only the other direction — that what light SETS is removed again on the way back — and it
     passed the whole time.
     **(f) no new hardcoded ink.** The coach's purple was `color:#8C6BB6` written out nine times while
     `--pu` sat unused; being a literal it never followed the theme, and it turned out to fail AA in
     BOTH — 3.38:1 on a light input and **4.04:1 on an ordinary dark card** — which the contrast
     matrix could not see because it only ever looked at tokens. The nine literals that remain are ink
     on a KNOWN coloured fill (dark text on gold, Strava's orange on Strava's chip, the boot splash,
     which is painted before a theme exists); source cannot know their background, so each is named in
     an allowlist with its reason rather than guessed at. A tenth fails the build.
     **(g) ONE ICON LANGUAGE, added 14 Sep 2026.** The app had two: 25 hand-drawn stroke icons in the
     tab bar and the header, and Apple's emoji art everywhere else — over 400 of them, 62 rendered on
     an ordinary walk of 13 tabs, 34 inside a tappable control. Nothing in the gate could see it,
     because an emoji is just a character: every id, handler, contrast and tap-target check passed it.
     It is the loudest "prototype" signal an app can send and it is invisible to any check that reads
     source as code rather than as a picture. Four assertions now hold it: `svgIcon()` executes (a
     grep of the definition passes on a set that cannot render); every icon inlined in the static
     shell is byte-identical to `svgIcon()`'s own path; no emoji LEADS an element's text; and no chip
     or row **label** opens with one — that last shape is the one that hid, because a data field never
     reaches the page as a tag, and two coach chips survived the whole sweep, one written
     `\ud83e\udded` so that no search for the character could find it either. The KEEP set is named
     in the test on purpose, so what stays emoji is a decision on the record rather than whatever the
     sweep happened to miss.
     **(h) `button{color:inherit}`.** The same trap as the `font-family` rule beside it, dormant for
     seven versions because emoji paint themselves: the day icons became `stroke:currentColor`, seven
     visible buttons computed to rgb(0,0,0) and Train drew a black icon on a translucent gold fill.
     A defect can sit invisible for years because another defect was masking it.
     **(i) the radius scale is honoured.** `--r:14px` and `--rs:8px` were declared and then ignored:
     328 literal radii ran 6, 7, 8, 9, 10, 11, 12, 14, 15, 16px, and a walk found SEVEN distinct radii
     on card surfaces. Nobody can name that, everybody feels it. Collapsed onto `--rs`/`--rm`/`--r`
     (8/12/14) plus the pill — seven distinct down to four, max shift 2px.
     **(j) THE SYSTEM EXISTED AND WAS OVERRIDDEN, added 15 Sep 2026.** A six-lens audit (55 findings,
     68 of 69 verdicts real) found one cause under almost every "vibe coded" symptom: components the
     app already HAS, re-painted by hand at the call site. `.btn` has primary/danger/success/blue and
     712 buttons carried an inline style anyway, 524 overriding the class's own paint — 190 distinct
     recipes. `.eyebrow` and `.lbl` drew one label two ways. Fourteen tab titles were fourteen copies
     of one inline style, the fourteenth ("Your coach") 2px smaller. So the fixes are mostly NAMING:
     `.btn.quiet` / `.subtle` / `.outline` (181 call sites folded), `.page-title`, `.btn.stack`, and a
     type scale that finally has consumers (806 in the shell, 200 half-pixel sizes folded in the
     modules, serif headlines six sizes down to two). Honest caveat, measured: folding an inline
     recipe into a class that paints the same thing does NOT change what a person sees — the
     rendered button-treatment count only moved 33 to 32. The visible wins were the ones that
     changed pixels: the half-pixels, the headline sizes, and two layout bugs below.
     **A FLEX BUTTON IGNORES `text-align`.** `.btn` is `display:flex;justify-content:center`, so
     `text-align:left` on one does nothing — it positions children, and text-align only reaches text
     inside each child. Onboarding's identity and "why" chips said left and started 43–120px in, each
     at a different offset, and the faith picker put "Christianity" BESIDE its description instead of
     over it. Those are the first things anyone taps. The fourth member of one family, after
     `<button>` not inheriting `font-family` and not inheriting `color`: a declaration the element
     silently cannot honour. Guarded; measured 14 and 5 before, 0 and 0 after.
     **AN ENTITY IS A NUMBER NOBODY SEES.** The icon sweep read literals and `\u` escapes and missed
     `&#128564;`, so 101 emoji survived a check that reported one icon language — including the
     sleeping face BETWEEN two stroke icons in the Track list. Worse, two entities on the SOS path had
     codepoint typos: a KAABA at 44px beside "Stand up, walk to a different room", and a ZEBRA beside
     "Put your feet on the floor. Get out of the bed." Shown to someone mid-urge, invisible in source.
     Four encodings are now checked: literal, `\uXXXX`, `\u{...}`, `&#NNN;`/`&#xHH;`. And three
     injection doors on lines the sweep touched, each DRIVEN with a payload before and after (both
     executed on the old build; one destroyed its own textarea): the food web-search query, an
     exercise note in its textarea and toggle, and a content clip name.
     **(k) THE FIX REACHED ONE FIELD AND NOT THE ONE FOUR LINES ABOVE IT, added 29 Sep 2026.**
     `editSplitDay()` escapes every routine name into its `<option>` — with a comment explaining
     exactly why — and wrote `day.focus` into the `value="…"` of the input above it RAW. A person
     types that field themselves ("Push, Pull, Legs, Rest..." is its own placeholder) and
     `saveSplitDay` stores it verbatim, so it comes back as an attribute the next time they open the
     day. Driven on the real function in the real app: `Push" onfocus="…" autofocus x="` closed the
     attribute, landed onfocus/autofocus/x as REAL attributes, and FIRED. Swept the class afterwards
     — every `value="`+ concatenation in `src/app` — and it was the only free-text one left raw.
     Two more things came out of it. **It was found while measuring something else entirely** (the orb
     over that row's Edit button), which is the argument for looking at a region rather than a list.
     And **the first test asserted the string, not the parse**: ` autofocus` is INSIDE the escaped
     payload, so the assertion failed on correct code. Ask the TAG with its one real `value="…"`
     stripped — escaped, the value swallows the payload; raw, it terminates at the person's quote and
     the rest becomes attributes.
     **(l) THE GATE ONLY SEES WHAT IT SEEDS, added 29 Sep 2026.** An adversarial review of the day's
     own work (44 agents, six lenses, every finding sent to two refuters told to default to refuted;
     19 survived, and every one of them was CORRECTED rather than merely confirmed) found
     `renderDayCounter()` using a `ti` that is **never declared** — every other `split[ti]` in the
     bundle sits under its own `const ti = tIdx()`. It threw ReferenceError whenever
     `totry_tomorrow_tasks` was dated today or yesterday, which `saveEvening()` stamps the moment ANY
     "tomorrow" field is non-empty — and both callers are unguarded, so one typed task took the rest
     of `initApp()` with it. **2548 assertions, personas, panels and crisis were all green over a
     front-screen crash, because nothing in the gate had ever seeded that key.** Coverage is bounded
     by the seed, not by the assertion count. The same review found `scripts/seed-person.mjs` keying
     `totry_trackers` by an ISO slice no reader uses, so `getLifeState().sleep` was null and every
     screenshot, craft audit and orb audit this repo has taken was of a person with **no sleep data**.
     **(m) AN ESCAPE IS CHOSEN BY CONTEXT, NOT BY HABIT.** `_escFew()` does not close an `onclick`
     hole: the HTML parser decodes `&#39;` back to `'` **before** the JS is compiled, so the string
     still terminates. Measured by clicking the button and counting the side effect — raw fired,
     `_escFew` fired, `.replace(/[\\'"]/g,'')` inert. Text positions and plain `value="…"` take the
     escape; a JS string inside an attribute takes the strip (as `22-train-deep.js:494` already did,
     in a comment saying so). Four sites were found at once, so the rule has a check now: it scans
     every `api()` + `JSON.parse` in `src/app` for an unescaped interpolation into `innerHTML`, and
     **plants one of the four real defects back and requires itself to find it** before reporting.
     **And a probe that returns zero against BROKEN code is blind, not clean.** `clip-audit.mjs`
     reported "0 of 7 clipped" with the clipping bug in place, twice, for two different reasons — it
     measured seven short "Rest day" rows, and then measured elements inside a closed `<details>` on
     a hidden tab, where every dimension is 0 and `scrollWidth > clientWidth` is false. Break the code
     on purpose and require the probe to FAIL before trusting the pass.
     **(n) A `return` AT MODULE LEVEL ENDS THE RUN SILENTLY, added 30 Sep 2026.** `core.test.js` is a
     plain script, and Node wraps a module in a function — so a stray top-level `return` is legal and
     simply stops execution. It stopped before `H.report()`, and the suite exited **0 with no summary
     at all**. Nothing said "aborted"; the section header had already printed. It happened because
     "the suite is synchronous" had become a reason to grep an async function's source instead of
     driving it. **`H.defer(promise)` exists now** — `report()` waits on deferred promises, so an
     async section (`searchUSDA`, anything behind `api()`) reads like a sync one and its failures are
     counted. Fault-inject the mechanism as well as the code: a deliberately wrong async assertion
     must come back as a failure, not a skip.
     **(o) AND A FOOD WITH NO CALORIE FIGURE WAS LOGGABLE.** An auditor reported USDA's top "chicken
     breast" result at 0 cal and could not verify it (DEMO_KEY was 429ing). Measured through the
     app's own key-proxy with the public anon key, it reproduces: Foundation's top match is
     "Lunchmeat, chicken breast, sliced", whose `foodNutrients` hold **no energy nutrient of any
     kind**, and one tap put 0 calories into the diary under a name anyone would believe. The guard
     has to be a FLAG — `n` is pre-initialised with every key at 0, so a *value* of 0 cannot tell
     "USDA said zero" from "USDA said nothing", and the first cut dropped nothing. Water still logs,
     because a genuinely calorie-free food carries an energy nutrient whose value IS 0; a kJ-only
     record is converted at 4.184 rather than dropped. **And the first measurement was wrong, not the
     app**: it matched `nutrientName === 'energy'` while USDA says "Energy (Atwater General
     Factors)". Micro coverage by data type, measured over five foods: Foundation 17.6/28, SR Legacy
     23.2, Survey (FNDDS) 27.0 — Survey is tempting and its names are prepared dishes ("Fried
     broccoli", "Lomi salmon"), so that is a real trade-off, left un-made on purpose.
     **(p) THE AI WAS TOLD AND THE SCREENS WERE NOT, added 30 Sep 2026.** `lifeStateBrief()` has long
     instructed the model that a fasting season is **"a sacred/chosen discipline, NOT a diet — do
     not nag about an empty daytime food diary"**. `fastSeasonNow()` had exactly TWO consumers: that
     brief, and its own card in another tab. So `_nourishConcern()` — which flags 3+ days under
     1200/1500 kcal in seven as possible disordered eating and offers the Butterfly Foundation —
     never asked. **Navratri is nine days of fruit, milk and nuts; Uposatha is no solid food after
     midday; Ramadan logged honestly is a ~500 kcal suhoor and a ~900 kcal iftar.** Each produces
     exactly that pattern, so a person keeping their own tradition's fast, logging honestly, was told
     that counting may have become something they cannot put down. Same half-applied shape as the
     units in (b), inverted: there the screens converted and the voice did not.
     **The fix may never be to silence it** — a fast is a documented cover for a restricting eating
     disorder, and rule 6 holds. What a fast changes is what the evidence MEANS: when most of the low
     days fall inside a declared season the clinical reading is confounded, so the card still appears
     and still carries both doors to a human, and speaks through a new `mercy` field in the
     tradition's own voice about who that tradition has never bound. Four seasons name a real person
     to ask; the two a person sets themselves name nobody, because there is nobody. Every line
     REPORTS what a tradition holds; none of them rules. A minority of fasted days does not reframe
     the rest (`fasted*2 >= low`). `fastSeasonNow(whenTs)` now answers about a PAST day — asking
     only "is a season live now" would have tripped the card the morning after Eid, on evidence the
     fast had already explained.
     **And the ordering test could not fail.** It compared `indexOf('fastSeasonNow')` to prove the
     fast branch is asked before the cycle branch, but that finds the `let _fsn = …` DECLARATION,
     which sits above both branches in either order; swapping them for real left the suite green.
     Anchor on the BRANCH, not the call. Of seven injections two first came back as a CRASH rather
     than a failure — one invalid, one a test dereferencing a null instead of reporting, which is
     (n) again.
   - **AND SEVEN MORE BARE SUBSTRINGS MET THEIR WORST COMPLETION (1 Oct 2026).** Measured, each
     against a real sentence from a NAMED front of this app — which is what makes a false positive
     here different from anywhere else. `'nothing left'` fired on *"nothing left in the tank"*
     (training), *"nothing left on the report"* (work) and *"i have nothing left this month"*
     (money), and it was REDUNDANT: `'nothing left to live for'` sits four lines above it.
     `'tired of living'` fired on *"i'm tired of living paycheck to paycheck"* — in an app with a
     money front. `'sick of living'` on *"i'm sick of living with my parents"*. `'give up on life'`
     on *"i had to give up on life drawing"*. `'want it to stop'` on *"i want it to stop raining"*.
     `'make it stop'` on *"make it stop itching"*. And `/take my life/`, whose lookahead excluded
     only "back", fired on **"take my life and let it be"** — a HYMN, in an app with a prayer
     surface across five traditions. That is the third time the app's own devotional vocabulary has
     tripped its own suicide detector; assume there is a fourth.
     All six phrases are KEPT as disclosures — they moved to `SUICIDE_RE` and must now end the
     clause, the bound `/can'?t go on/` has carried since v568 for exactly this reason. The hymn is
     excluded by completion, the way `take my life BACK` already was. **One phrasing was closed as
     a side effect:** *"i want it all to stop"* used to return null.
     Six fault injections, each caught, and the panel asserts BOTH directions — thirteen disclosures
     that must survive the bounds and fourteen ordinary sentences, one per front.
   - **AND THE GATE CRIED WOLF AT THE ONE DOOR WHERE THAT IS A TAKEOVER (1 Oct 2026).** Two false
     positives, WITNESSED on screen and not merely measured: `"my quads are going to hurt"` returned
     **harmothers** and rendered a card reading *"If you're thinking about hurting someone, please
     step away from the situation right now"* with 000, 911 and 999 on it — in an app whose entire
     job is reporting soreness. `"i want to die to my old self"` raised the full suicide card with
     six helplines; **the Soul tab teaches that idiom**, so the app invites the words and then treats
     them as a disclosure. At the Can't-start door a non-null REPLACES the two-minute help-me-start
     flow with no route back, so "false positives are acceptable on an additive surface" does not
     cover it. Cause: `'going to hurt'` and `'plan to hurt'` were in HARMOTHERS_PHRASES with **no
     object**, and `'want to die'` is a substring of the devotional phrase.
     Fixed with the detector's own innocent-completion mechanism plus an object-ful phrase list, and
     **coverage went UP**: `"i'm scared i'll hurt someone"` was previously caught by nothing, because
     the bare entry had no object and `'hurt them'` does not match "someone". Removing `'plan to
     hurt'` cost nothing — `"i have a plan to hurt myself"` is still selfharm via `'hurt myself'`.
     **TWO OF MY OWN SUPPRESSION REGEXES WERE MEASURED AND DELETED.** An earlier draft added
     body-part and time-of-day suppressions; with the object-less phrase gone they could never
     match, and the suite stayed green without them. A regex that cannot fire, under a comment
     claiming it does, is worse than no regex. The possessive one is kept because it IS reachable:
     it is the only thing between `'hurt somebody'` and *"it could hurt somebody's chances"*.
     Six fault injections, each caught — and the one that first PASSED is why `'plan to hurt'` has
     its own benign case (*"a plan to hurt less tomorrow"*) rather than a claim in a comment.
     **PLAN, MEANS AND TIMING IS NOW BUILT (1 Oct 2026): 4 of 58 disclosures → 58 of 58.** The
     highest-acuity register in the gate scored almost nothing, and a person who has moved from
     ideation to a plan is the one this detector most needs to catch. 16 entries: 15 bounded regexes
     plus `'noose'`, the one phrase with no ordinary completion in any front. Specified by a
     ten-agent pass (grounder + adversary + assembler per register, plus an audit of the existing
     lists) and recorded in full, panels and refusals, in **`docs/CRISIS-REGISTERS.md`**.
     Every bound was chosen against a MEASURED ordinary sentence from one of this app's own fronts,
     and that list is the reason to read the doc: a gun SAFE/CABINET/LICENCE, a dead hang off the
     bar, an Orthodox PRAYER rope, "enough painkillers to kill the pain in my quads", "die of
     boredom in this meeting", caffeine LD50, a carbon monoxide DETECTOR.
     **NINE OF THE ELEVEN SEED PHRASINGS ARE DELIBERATELY NOT MATCHED**, and that is the honest half:
     "i've written a note", "tonight is the night", "i've picked the day", "i have it all worked
     out", "i bought a rope" — the app has a letters-to-your-future-self feature, it TELLS people to
     pick a start day, and battle ropes are equipment. Their benign and their disclosing form are
     the same string, so no bound separates them. They belong on the AI surfaces, which read the
     whole message and can ask a second question; the keyword floor's job is the sentence that
     cannot be read any other way. `shotgun|rifle` was dropped from the firearm entry for the same
     reason — an Australian hunting family's Saturday — and the doc says plainly that this is a
     named cost on the most lethal means in the house, not safety.
     **Two false positives were found while landing it**, both the shape the burden register named:
     A SUFFIX BOUND CANNOT SEE A PREFIX. "i read about carbon monoxide poisoning after the news
     story" fired, and the first suppression I wrote for it immediately cost a real disclosure —
     "i've been reading about carbon monoxide in the car" — because reading ABOUT something is what
     the bystander and the planner both do; only the bystander names a SOURCE. And the hyperbolic
     frame takes a comma as readily as a preposition ("i'd blow my brains out, this meeting is
     endless"). One residual is named and kept: "this meeting makes me want to blow my brains out"
     still fires, because there the intent marker and the hyperbole marker are the same words.
     **One guard, both inflections.** Bare `'hang myself'` had no guard at all and fired on "i hang
     myself out to dry every week". It moved INTO the regex rather than gaining a suppression,
     because a suppression would have made the lookahead's own `out to dry` branch unreachable —
     the dead-guard shape this file fails builds over.
     Six bounds fault-injected by DELETION, each producing a real false positive unbounded.
     **BURDENSOMENESS IS BUILT TOO (1 Oct 2026): 4 of 43 disclosures → 43 of 43.** The strongest
     single predictor in the literature, and the lists held nothing for it. 13 entries, and **NOT ONE
     BARE PHRASE IN THE WHOLE REGISTER** — which is the finding rather than an implementation detail:
     `burden` is taught by this app's faith layer five ways over and its commonest English completion
     is "has been lifted"; `relieved` is what somebody writes the day they tell their wife; `better
     off` is how the app's own coaching speaks; `dead weight` is gym slang; `drained` is what a leg
     day does to you. 0 false positives over 90 of the app's own sentences, scripture included.
     **"I don't want to be a burden" is REFUSED ENTIRELY**, including the `anymore` form, and that is
     the most important line in the register: it is the commonest motivational WHY in all of health
     and fitness — "…on my kids when i'm older" — typed into onboarding's "why does this matter?",
     which is crisis door #18, where a non-null REPLACES the help. "Anymore" does not separate
     resolve from withdrawal, because the difference is not in the string.
     Three more PRE-EXISTING defects fell out of landing it, all word-level rather than semantic:
     bare `'better off dead'` fired on **"better off deadlifting twice a week"**; bare `'better off
     without me'` matched inside **"better off without ME-dication"** and "…ME-ds", a WORD-PREFIX
     collision of the same shape this file records for "plan" inside "planet"; and
     **"i am going to end it tonight" returned null** — a GAP, because the list carries
     `'i'm going to end'` and the apostrophe-strip pass turns "i'm" into "im", never into "i am".
     Seven bounds fault-injected. One of them first stayed GREEN and that is worth keeping: deleting
     the deadlift lookahead changes nothing for the CLOSED compound, because `\b` already handles
     "deadlifting" — it is load-bearing only for the SPACED spelling, "better off dead lifts in the
     split", which is how half the world writes the exercise. The test now pins all four forms.
     **EVERY APOSTROPHE IN THESE REGISTERS IS WRITTEN `'?`** on purpose: `_hitRe` tests t, tNo, tc and
     tcNo, and the stripped pass turns "they'd" into "theyd", so a literal apostrophe matches in only
     two of the four passes. And no pattern uses a lookbehind — it would be the first in the bundle
     and a new engine-divergence surface.
     **ALL THREE REGISTERS ARE NOW BUILT (1 Oct 2026). The seed phrasings went 0 of 27 → 16 of 27**,
     and the eleven still null are exactly the ones named as unmatchable by a substring gate.
     Hopelessness/passive ideation is 22 entries, and **the comma bound was the owner's call**, taken
     on measured numbers over a 146-sentence benign corpus: clause end `[.!?,\n\r]` = 42 false
     positives / 0 lost; sentence end `[.!?\n\r]` = 0 false positives / **10 of 10 comma-continued
     disclosures lost**, including "i can't cope anymore, i don't know what to do"; the one chosen
     asks what FOLLOWS the comma — a new first-person clause is continued disclosure, an explanatory
     noun phrase ("the cramps", "my knee") is not — and measures 2 false positives / 0 lost. **Both
     residuals are ASSERTED BY NAME in the test** rather than dropped from the corpus: a known cost
     on the record beats a clean-looking panel.
     One suppression came with it and neither review agent could have found it: **the surrender idiom
     written as TWO SENTENCES.** A full stop is a genuine sentence end, so no bound on an entry can
     reach "nothing matters anymore. only christ." — both agents only ever tested continuations
     WITHIN a sentence. Six such sentences returned suicide before it; 0 after, while a real
     disclosure later in the same entry still fires.
     **THREE CROSS-REGISTER COLLISIONS were found landing it, and none was visible to the agents**,
     because each measured against its own panel only. Two were MY OWN morning entries —
     `want it all to stop` and `tired|sick of being alive` carried a CLAUSE end and kept firing
     straight through the register's tighter versions. **A superseded pattern does not stop mattering
     because a better one sits beside it: the looser one wins.** The third was the burdensomeness
     entry's `gone|dead|died|disappeared` branch, which had no terminator while its own sibling
     branch did, so "nobody would notice if i was gone from that group chat" fired. Run every
     register's corpus against the WHOLE tree, not just its own.
     **THE LAST THREE ARE FIXED, AND ONE WAS ABOUT WHICH CARD RATHER THAN WHETHER (1 Oct 2026).**
     `'took all my pills'` returned **'medical' — a call-an-ambulance card — for "i took all my pills
     this morning"**, every morning, for anybody with a pill organiser; its three siblings
     ('took a bunch of', 'took a bottle of', 'swallowed a bunch of') are unambiguous and this one is
     a daily sentence. **Bounding it was not enough on its own:** put the bounded version in
     SUICIDE_RE and "i took all my pills to end it" comes back 'suicide', whose card lists helplines,
     when an acute overdose needs the ambulance the MEDICAL card carries. So it stays medical and
     gains a bound — which is why `MEDICAL_RE` now exists for exactly one entry. Both shapes kept:
     a clause end for the bare admission, the intent completion beside it.
     `'want to end it'` fired on "i'm on a deficit and i want to end it" and needed a SPAN REMOVAL
     rather than a bound, because the disqualifying context sits in FRONT of the match — ending a
     cut, a streak, a vice or a fast is a core act this app asks for. Bare `'can't keep going'` took
     the clause end, with the `any ?more` tail the register entries carry (a clause end alone would
     have lost "i cant keep going anymore"). Six injections, each caught.
     **AND `npm run crisis` NOW ASSERTS THE NEGATIVE DIRECTION, which it never had.** Every check in
     it asked whether a disclosure REACHES a helpline; nothing anywhere asked whether an ORDINARY
     sentence is left alone — and that is exactly how "my quads are going to hurt" rendered a
     step-away-from-them card with 000, 911 and 999 on it, for months, with 35 green doors and three
     thousand assertions. It drives 18 real sentences from the app's own fronts, rotating across the
     doors, and every one of them returned a crisis kind at some point on 1 Oct 2026 before being
     fixed: the DOMS one, "nothing left in the tank", a hymn, the devotional idiom, a pill organiser,
     "tired of living paycheck to paycheck", "better off deadlifting", the onboarding why, the
     dopamine-detox thesis, scripture. **Its calibration is structural** — the positive pass has
     already shown a card at every one of those doors, so a door that shows none here cannot be a
     door that shows none ever. Fault-injected by restoring the DOMS false positive: two doors
     reported CRIED WOLF. The summary prints the two numbers separately on purpose, because the first
     version conflated them into "66 crisis doors".
     `docs/CRISIS-REGISTERS.md` carries both specs, measured and ready — burdensomeness (13 bounded
     entries, 0 new false positives over 120 of the app's own sentences, and NO bare phrase at all,
     because `'burden'` is taught by the faith layer five ways over and its commonest English
     completion is "has been lifted") and hopelessness/passive ideation (22 entries, where **the
     comma decision is the whole change and it is the owner's call**: the clause end `[.!?,\n\r]`
     produces 42 false positives over a 146-sentence benign corpus, the sentence end `[.!?\n\r]`
     produces 0 but misses 10 of 10 comma-continued genuine disclosures including "i can't cope
     anymore, i don't know what to do", and the doc carries a third bound that asks what FOLLOWS the
     comma, measured at 2 false positives and 0 lost). The assembler says out loud that it chose the
     wrong way round for a high-acuity disclosure. Read that before landing it.
     The register work also surfaced FIVE more pre-existing false positives not yet fixed, all
     measured: `'took all my pills'` → 'medical' for "i took all my pills this morning"; the
     object-less `"i'm going to end"` → "i'm going to end this cut tonight"; `'want to end it'` →
     "i'm on a deficit and i want to end it"; and bare `'can't keep going'` → "i can't keep going on
     this deficit". They need the clause-bound treatment the other ten got.
     The ORIGINAL note, kept because it is still true of the two remaining registers: the register
     this app's population actually types is thin. Measured — plan/means/timing scores **0 of 6** ("i've written a note", "i've got
     the pills ready", "tonight is the night"), burdensomeness 0 of 3, and ~15 hopelessness and
     passive-ideation phrasings return null, with near-miss pairs one synonym apart ("i don't want
     to wake up" fires, "i'd rather not wake up" does not). Negation also inverts the gate ("i am not
     suicidal" fires) and bereavement reads as crisis. That is a bucket-at-a-time job with a
     false-positive panel per bucket, NOT a bulk list append — the blanket-sweep lesson applies
     directly, and bare substrings are exactly how `'going to hurt'` got in.
     **And `npm run crisis` types ONE phrase** — "i want to kill myself", the single most explicit
     sentence in the list, at all 35 doors — so 35 green doors prove the WIRING, never the detector.
     It should drive one sentence per register, and it asserts nothing in the negative direction at
     all, which is how a police-and-ambulance card for DOMS survived every check in the gate.
   - **`_jsAttr` DID NOT ESCAPE `&`, SO A CHARACTER REFERENCE REACHED COMPILED CODE (1 Oct 2026).**
     It escaped `\`, `'`, `"`→`&quot;` and newline. The HTML parser decodes character references
     BEFORE the JavaScript is compiled, so a typed `&#39;` / `&apos;` / `&#x27;` survived every
     replacement, became a bare apostrophe, terminated the string literal and the remainder of the
     attribute ran as statements. The sibling helper immediately above it escapes `&` FIRST, for
     exactly this reason, on a value that only ever reaches a text position — the one that reaches
     COMPILED CODE did not. Fixed in the helper; three call sites inherit it.
     **Two of the three are self-XSS. The third is not:** an exercise name arrives from the Hevy
     integration and from AI-parsed routine text, and it is PERSISTED, so it re-fires on every later
     render as script in the app's own origin, with the whole journal readable from localStorage.
     Driven, not grepped — the button is clicked and the side effect counted, the payload's first
     statement is a VALID call (an earlier one was malformed, threw before the injected statement,
     and read as a clean pass against broken code), and a literal-apostrophe control stays inert.
     `npm run panels` now carries that drive with its own calibration: a deliberately unescaped
     `onclick` must fire when clicked, or the check reports "THE MEASUREMENT IS WRONG, NOT THE APP".
     **`&` MUST BE FIRST, and the reason is fidelity, not security.** Escaping it last behind a
     `(?!quot;)` lookahead is security-equivalent for every payload — fault-injected, suite stayed
     green, correctly — but a person who types the six characters `&quot;` should read them back,
     and with `&`-last they decode to a bare `"`. One assertion pins the order.
   - **AND THE DETECTOR UNDER ALL 35 DOORS DID NOT COLLAPSE WHITESPACE (1 Oct 2026).**
     `detectCrisis()` matches its phrase lists with `String.includes`, so ONE extra space, a newline
     or a non-breaking space anywhere INSIDE a matched phrase made it miss. Measured over five real
     disclosures × nine spacings: **21 of 35 variants MISSED**, 0 after the fix. `"i can't\ngo on"`
     missed — somebody pressing Enter mid-sentence in a textarea. `"i want to kill  myself"` missed
     on one doubled space while `"i want to  kill myself"` matched, because that space fell OUTSIDE
     the matched substring: the same sentence, caught or not depending on which word the thumb
     stuttered after. `\s` covers tab, newline, U+00A0, U+202F, U+3000, U+2028 and U+FEFF — measured,
     not assumed — but NOT the zero-width family U+200B–U+200D, which arrives by paste.
     **COLLAPSING ALONE MOVES THE BUG, and the existing suite caught it in one run.** `SUICIDE_RE`
     reads a NEWLINE AS A CLAUSE END (`can'?t go on\s*(?:[.!?,\n\r]|$)`) precisely so it does not
     fire on "can't go on this cut" — so turning that newline into a space stopped
     "I can't go on\nI don't know what else to say" matching. One form cannot serve both: a newline
     is a sentence boundary in one sentence and a line wrap in the next. So BOTH are kept (`t`
     preserves it, `tc` collapses it) and a hit in either fires. Fault-injected five ways, including
     one that deletes the clause-end form, so the test proves the old behaviour was preserved rather
     than replaced.
     **A STUB FOR A DAY PRIMITIVE WAS SILENTLY IGNORED, AND IT SET A DATE BOMB.** `H.load` prepends
     `dayKeyNorm`, `dayKeyOf` and `_dayKeyEnginePads` as real `function` DECLARATIONS, and a
     declaration shadows the same-named parameter — so three call sites passing
     `dayKeyOf: () => '30/09/2026'` passed a stub that never ran once. Two were harmless; the third
     asserted against that literal, so the whole gate was green all day on 30 Sep and **went red at
     midnight on code nobody had touched**. `H.load` now REFUSES a stub it would shadow, with the
     reason in the error, and a test asserts the refusal — otherwise the guard is a line nobody has
     ever seen fail. A suite that turns red overnight is one people learn to ignore.
   - **AND THEN ONE ENTER UNDID ALL OF IT (9 Oct 2026). 118 of 357 → 0.** The whitespace fix above
     kept two matched forms for a real reason, and then nobody asked what `t` does to a sentence that
     is NOT a disclosure. The bounds read `\n` as an unconditional sentence end, and every innocent
     completion in the detector — the `_suppress` spans AND the lookaheads inside the patterns — is
     written with literal spaces, which a line break breaks. Measured with one newline at each word
     boundary over the 357 benign sentences this gate already owns: **118 returned a crisis card.**
     "i've been hoarding the pills\nfor my mum" and "i'm a waste of space\non the leaderboard" raised
     six helplines; "i took all my pills\nthis morning" called an ambulance. **"i want to die\nto my
     old self" and "take my life and\nlet it be" are the third and fourth time this app's own
     devotional vocabulary has tripped its own suicide detector — and both had already been fixed
     once, for a single line of text.** The doors that invite Enter are real textareas, and
     `openCBA` and `openWalkBack` both `return true` out of the save callback on a crisis hit, so the
     ledger or the chain the person just typed is DISCARDED, not merely accompanied by a card.
     **`tc` already computed the right answer for all 118 and the `||` in `_hit`/`_hitRe` threw it
     away** — an opportunity created and not taken, not a regression.
     Four candidate fixes were measured before one was chosen, and the cheap one is wrong: stripping
     `\n` from every bound gets 118 → 10 but **loses "i can't go on\ni don't know what else to say"**,
     the one shape the two-form design exists for. What shipped gives the newline **the comma's own
     what-follows test** (118 → 10, 0 lost), then makes every exclusion whitespace-tolerant through
     one `_wsTol` helper used by BOTH mechanisms (→ 4), then closes the last shape — a subordinating
     clause, an Enter, then the statement ("if i stop gambling\nmy family would be better off"), which
     hits the `[\n\r]\s*` PREFIX anchor and so needed a span removal, because **a sentence start
     cannot see what precedes it** (→ 0).
     **A newline is stronger evidence than a comma, so it has its own extra branch.** The first draft
     reused the comma's list exactly and lost "nothing left\nand i mean it" and "i am tired of
     living\nreally" — the suite caught both. `and i` and `really` were added on measurement: `i`
     after a newline has ZERO false positives over the 357, `really` none, and the single benign
     `and` is the idiom "alive\nand well", which `and i` cannot reach.
     The gate now sweeps **every** benign sentence any ORDINARY array owns, read out of
     `core.test.js` itself, so coverage grows with the panels instead of going stale beside them.
     Fault-injected per mechanism, and proven on the real source as well as in memory.
   - **AND THE CARD COULD ONLY EVER NAME ONE NEED (9 Oct 2026).** `detectCrisis` was a precedence
     chain returning the FIRST of four kinds. Over 3317 sentences from this gate's own panels only
     **eight** co-occur — and they are the eight that matter most.
     **"i took all my pills. nothing matters anymore." returned 'suicide', a card of seven helplines
     with no 000, no 911, no 999 and no "get to a hospital" anywhere on it.** That is what somebody
     types in the minutes after an overdose, and "nothing matters anymore" is what they type beside
     it. "i overdosed and i want to kill myself" did the same, and had since v479 — the hopelessness
     register did not open this hole, it widened it from "needs an explicit suicide statement" to
     "needs any of 22 ordinary hopelessness clauses".
     The return is a `'+'`-joined SET in acuity order now and the card renders every route in it.
     **Only FOUR places in the whole bundle ever compared this value to a kind, and all four are the
     one if/else chain in `showCrisisResponse`** — every other call site asks whether it is truthy,
     which is what made the change small. Physical acuity leads, because minutes matter for an
     overdose in a way they do not for the rest, and the helplines are on the same card. Driven in a
     real browser, six kinds, one fresh page each: `medical+suicide` renders 12 rows carrying 000 ·
     healthdirect · 911 · 999 · 111 · Lifeline · Beyond Blue · Suicide Call Back · 13YARN · 988 ·
     Samaritans, deduped, and **plain 'suicide' still carries NO emergency number**, because 000 for
     somebody who typed "i can't cope anymore" is the takeover this file keeps having to undo. The
     documented "i took all my pills to end it → medical" decision is untouched.
     That probe lied twice before it worked, both times in the direction of "the app is broken":
     it rendered into a slot one viewport down and `_crisisMustBeSeen` correctly LIFTED the card out
     of it; then it read `document.body.textContent` and reported the medical copy present on the
     plain suicide card, because "emergency services" appears elsewhere in the shell. **Plain
     'suicide' is the calibration** — 35 doors already prove that card renders, so an empty result
     there is the instrument, not the app.
   - **FOUR REGISTER ENTRIES WERE BARE IN ALL BUT NAME (9 Oct 2026). 15 ordinary sentences → 0.**
     `detectCrisis("carbon monoxide")` alone returned 'suicide': the entry excluded six equipment
     nouns and fired on every other mention, so "is carbon monoxide dangerous in a closed garage",
     "we had a carbon monoxide scare at work today", "carbon monoxide safety week at the school" and
     "the landlord never checked for carbon monoxide" all raised six helplines. A tenant, a parent, a
     tradesperson and a school newsletter. It takes a DEFINITE enclosure now or a stated intent, and
     **the article is the signal** — the enclosure somebody HAS is "the car", a generic one is "a
     closed garage", which is how a safety question separates from a disclosure.
     `a burden` took ANY object while both of its siblings in the same register are object-bounded,
     so the app's own benign panel and the entry disagreed ("i'm just a burden on the roster at
     church"). The POSSESSIVE suppression was written with a literal apostrophe while `_hitRe` tests
     an apostrophe-STRIPPED pass, so "it could hurt somebody's chances" was suppressed and **"it
     could hurt somebodys chances" was 'harmothers'** — the same sentence, and the difference is
     whether the person bothered with the key. And the hopelessness register bounded THREE wake-up
     phrasings and left the fourth and commonest one bare, so one family was gated two ways and the
     loose member decided every sentence: **a superseded pattern does not stop mattering.**
     Two fixes cost a documented disclosure first and the suite caught both: the burden bound lost
     "i felt like a burden all day" (a self-ascription can end in an adverbial) and the CO enclosure
     lost "carbon monoxide poisoning is how i would do it" (which has no enclosure at all).
     **My first four fault injections pointed the WRONG WAY.** Neutering each bound in place with
     `(?!)` and `(?:)` made three of the four patterns MORE restrictive, so they stopped firing on
     everything and the injections reported "0 of 2 fire again". A fault injection has to reproduce
     the DEFECT, and here the defect is the bare entry — so it replaces the whole LINE with the bare
     form, and refuses rather than guesses when the marker is not on exactly one line.
   - **AND THE NET RE-IMPLEMENTED THE REGISTERS AND LEFT EVERY BOUND BEHIND (9 Oct 2026). 144 → 0.**
     `_RISK_REASON` and `_RISK_PLAN` were written as bare phrases — the exact shape
     `docs/CRISIS-REGISTERS.md` exists to refuse — and nothing had ever run the gate's own benign
     corpus through them, because the net's panel is seven hand-written rows. **The net reads a whole
     MESSAGE, not a sentence**, and a journal entry or a coach message is several clauses. Measured
     over the 357: 24 matched a REASON pattern, 6 matched a PLAN pattern, and **all 144 pairings
     appended a crisis line to an ordinary reply.** "nobody would miss me if i skipped tonight's
     session. i've picked the day, monday is day one." is two Train sentences.
     Two guards the registers already HAD were missing from this copy of them — `a burden` needs the
     `bearer` lookahead ("i'm a burden bearer for my family") and `worth more dead` needs a
     first-person subject ("the old bike is worth more dead than alive as scrap").
     **The disclosing completion is not a clause end.** Bounding alone broke the thing the net exists
     for: "they'd all be relieved IF I WAS GONE" has no clause end, and the probe's own calibration
     caught it in one run. `nobody needs me here` likewise needed `here` as a disclosing completion
     rather than a bound, and `all worked out` kept a loose form with a named TRAINING-plan guard,
     because a clause end there bought nothing (0 benign matches) and cost a real must-net row.
   - **AND THE NET WAS WIRED AT THREE SITES AND NEEDED NINE (9 Oct 2026).** All three were the
     SUCCESS path. The coach replies to the person on three paths that never reach `api()` — offline,
     Supabase not ready, and the model failing — each with a canned string naming no human, so
     somebody who stacked a reason and a plan got "You're offline right now. Your coach needs a
     connection to think" and nothing else. And **`_feelingNowGo` was a fourth free-text AI surface
     with no net at all**, on all three of its branches — the app's MOST-invited disclosure surface,
     whose own comment calls its prompt "deliberately fierce (you refuse to let them lose)", which is
     the worst voice to answer somebody who has stacked a reason and a plan. One `_netted()` helper
     now, nine call sites, and an `html` variant for the one surface that writes into `innerHTML`.
     **The check that was supposed to hold this could not.** It was three greps for a call SHAPE plus
     a global count: the companion one stays green when the companion's call is DELETED outright,
     because the same text sits in the comment above it and in the helper's declaration; a count
     cannot say WHICH surface went missing; and it only ever knew about three surfaces. It asserts
     PER SURFACE by name now, executes the helper, and fault-injects each surface in turn.
   - **AND THE NET WAS ONE SYNONYM WIDE, AND FIRED ON THE ABSENCE OF A PLAN (9 Oct 2026).**
     Fifteen agents over the net's two lists — five grounders, ten adversaries told to default to
     refuted — and the headline is not the coverage. **HEAD had SIX live false positives.** The
     shipped `picked (?:the|a|my) (?:day|date|night)` entry had no subject guard, so
     *"they'd all be relieved. i haven't picked the day."* NETTED, and so did the
     apostrophe-stripped and unabbreviated forms. "they'd all be relieved." is in this gate's own
     ORDINARY list, so the pair was reachable straight from the corpus. Measured over 395 benign
     sentences: **6 firing pairs → 0, and must-net 7 of 14 → 14 of 14.**
     **THREE REFUSALS ARE AS LOAD-BEARING AS THE ADDITIONS**, each because the benign and the
     disclosing form are the same string. The obvious gap was the PASSIVE voice — "the letters are
     written/done/sealed" — and **it fires on THE APP'S OWN PRINTED STRING**: `25-soul.js` shows the
     toast "Letter sealed" and renders "N letters sealed, waiting for delivery", because the
     letters-to-your-future-self feature SEALS what a person writes. 9 of 14 ordinary sentences.
     "i've set the date" is the canonical engagement sentence and the app's own copy prints
     *"Yours — you set the dates."* and *"Pick the day(s), set a time, done."* "it's happening
     saturday" is a plumber, a party, a comp.
     **THE LAYER CHOICE IS THE WHOLE JUDGEMENT, AND THE TWO LENSES DISAGREED.** One measured the
     worthlessness family (`a weight on`, `worthless to`, `deserve better than me`, `millstone`)
     clean in SUICIDE_RE — 0 corpus false positives, 0 verdicts changed — and it STILL fired on
     *"i'm a weight on my family. that changes today."* and *"i'm a weight on my kids. that's my
     why."* That is onboarding's "why does this matter?", crisis door #18, where a non-null REPLACES
     the help. The repo's own `be relieved` entry already settles it: only the
     disclosing-completion form sits in SUICIDE_RE, the bare clause-ended form is additive. So the
     whole family is additive, one rule, no dead duplicate — and the layers are **mutually
     exclusive**, because every AI surface calls `detectCrisis` and returns before `api()`, so an
     entry in both is unreachable in the second.
     **AND I CORRECTED A REFUTER WITH MEASUREMENT.** It recommended DROPPING
     `/don'?t want to be a burden any ?more/` as "the sole cause of all three false positives".
     Measured: every HEAD firing pair ends in *"i haven't picked the day"* — the PLAN negation was
     the cause. Keeping the entry and fixing the guard gives 0 false positives AND 14 of 14;
     dropping it costs the one real disclosure whose plan half ("written a note for each") has no
     benign reading at all.
     `millstone`'s one dangerous collision is **Matthew 18:6, live on this app's scripture surface**:
     a bare `/\bmillstone\b/` fires on 11 of 11 benign sentences, the verse included.
   - **AND TWELVE OF THE NINETEEN NET PATTERNS CARRIED A BRANCH THAT COULD NOT FIRE (9 Oct 2026).**
     `_needsHumanNet` collapsed every whitespace run to a single space before testing, so the
     `[,\n\r]` and `[\n\r]` branches in the bounds I had landed that morning were unreachable — a
     dead guard under a comment claiming it works, which is the shape this file fails builds over.
     Collapsing also LOST a real shape: a newline is not a clause end once it is a space, so
     *"nobody needs me\ni've picked the day."* did not net. Non-newline whitespace is still
     collapsed, exactly as `detectCrisis`'s own `t` form does it. Measured: cross-line disclosures
     3 of 5 → 4 of 5, benign cross-line false positives 0 → 0. The residual is by design —
     *"i'm a weight on my family\ntonight is the night."* still misses, because the bound asks what
     FOLLOWS the break and `tonight` is not a new first-person clause.
   - **AND NINE NET CALL SITES WAS STILL ONLY FOUR OF TEN SURFACES (9 Oct 2026).** A census of all
     **12** `brotherSys()` call sites (not 14 — counted by script) found four more that put the
     person's own words in the prompt and showed a reply back, ungated: the Sunday check-in's
     win/struggle/focus boxes, the weekly synthesis (three journal rows verbatim, persisted and
     modal-shown), the morning sentence (cached on the Today card), and the weekly reflection.
     All four DRIVEN in a browser with a reply naming no human: each nets a disclosure and leaves an
     ordinary field alone.
     **THE OBVIOUS FIX HAD ITS OWN DEFECT: joining a prompt's free-text fields manufactures false
     positives no single field produces.** *"i don't want to be a burden anymore"* is a real
     motivational why and *"i've picked the day."* is something this app ASKS for; neither nets
     alone and joined they do. So the fields are chosen PER SURFACE — the check-in's three boxes
     ARE one message (one form, one submit), the morning sentence reads the JOURNAL only and must
     not reach for `totry_why` or `totry_identity`, which are long-lived profile stores rather than
     a message somebody just typed. `generateWeeklyContent` is refused on its OUTPUT, not its input:
     it builds a CAPTION the person publishes, and "please talk to someone tonight" belongs in a
     reply to them, never in content they post. The three `20-morning` explainers are refused
     because their prompts carry no typed field at all.
   - **AND THE VOICE FINGERPRINT WAS A SHA WITH NO EVIDENCE BEHIND PART OF IT (9 Oct 2026).**
     It went 5 parts to 13. Corrupting `faithVoiceNote`'s prose, its LIGHT branch, `sexNote`'s
     female branch, or **planting "tell them to call 111" into the faith note every prompt carries**
     all left the sha unchanged. **And the decisive finding neither I nor the review had:
     `scripts/voice-probe.mjs` STUBBED `faithVoiceNote`** with a 75-character string against the
     shipped 152 — driven, `SYS.includes(the shipped note)` was FALSE and `SYS.includes(the stub)`
     was TRUE. So stamping that declaration would have produced a hash whose supporting measurement
     never executed the code. The probe runs it for real now and REFUSES to stamp unless both notes
     are in the assembled prompt; the stamp records `notes_in_prompt` and the gate checks it.
     **The faith words live in FAITHS, not in the function** — `faithVoiceNote()` only emits
     `curFaith().voice`, so corrupting christianity's `voice:` moved nothing even with the function
     stamped. Hashing FAITHS wholesale is REFUSED on measurement (~3kB of which only label+voice
     reaches a prompt, so three quarters would be reading-plan titles invalidating the stamp on
     ordinary content work); each tradition gets a narrow WINDOW from its own `prayTo`/`prayWord`
     token to its `verses:` line. **And the biggest unstamped piece was not a `brotherSys` note at
     all:** `sharedWisdomNote()` is appended after it by the companion and the coach, is ~12x the
     faith note, carries its own *"If they are in acute distress, drop it entirely and just be
     present"*, and takes the real unstamped share of the companion prompt from ~7% to **26%**.
     **My reason for leaving this alone yesterday was wrong, and measured so.** I argued it would
     cry wolf on faith-copy edits. Over the src-era commits that touched their files, none of these
     declarations has changed once, while the already-stamped `safetyNote` changed twice. "Faith
     copy changes more often than safety copy" is true of faith CONTENT and false of these
     declarations. Re-measured live afterwards with the real note in the prompt for the first time:
     band A **0 of 7 flinched, unchanged**, band C 3 of 3 with verified numbers.
     A fingerprint still cannot cover PROSE, so the two notes are also EXECUTED across the whole
     5x2x3 matrix and asked whether any of them carries a phone-shaped number (`safetyNote`'s whole
     point is that the model uses only the lines it is GIVEN) or suppresses the hand-off vocabulary.
     The chapter:verse strip runs BEFORE the phone test, which is the only reason the scripture
     controls pass — this app's own examen renders "Qur'an 6:60". And the guard builds its subject
     INSIDE itself: pointed at `safetyNote()` it reports a violation on correct code, because that
     note legitimately carries the verified helplines.
   - **AND THE SCRIPTURE AND PRAYER SURFACES HAD NEITHER HALF (9 Oct 2026).** `findVerse`,
     `searchBible` and `generateIntentionPrayer` build their prompts from **`BIBLE_SYS`, not
     `brotherSys`** — so the census of brotherSys call sites structurally could not see them, and
     measured, `BIBLE_SYS` carries **no safety instruction of any kind**. Its only "counsellor" is
     its own role line, *"You are a Bible scholar and pastoral counsellor"*, which is precisely why
     a marker grep on that word reports a false pass on this prompt.
     They cannot take `safetyNote` either: `BIBLE_SYS` demands *"Return ONLY a raw JSON array"*, and
     an instruction to put a human in the message fights that contract on a working feature. And the
     model's output is verse DATA, so there is no prose reply for `_netted` to append to. So the net
     goes on the **RENDERED surface** — `_netNoteInto(el, userText)` asks the same reason-AND-plan
     question with an empty reply (verse JSON names no human by construction) and appends the line
     UNDER the content. Additive: the verses they asked for are still there.
     **I PASSED THE WRONG ARGUMENT AND ONLY DRIVING IT FOUND THAT.**
     `generateIntentionPrayer(pfx)` takes an element-id PREFIX and reads the typed text out of
     `pfx + '-intention'`; the first wiring passed `pfx`, so the net was asked about the string
     "probe" and could never fire — and a grep for `_netNoteInto(` passed. The test now asserts the
     ARGUMENT at each of the three sites, not the call.
     **The prayer line goes UNDERNEATH, not inside.** The reply there IS prose, but it is a PRAYER:
     appending a helpline inside it would put it in the person's own words to God.
     **AND THREE OF MY OWN PROBES LIED FIRST, ALL TOWARDS "THE APP IS BROKEN."** One fell back to
     `document.body`, which carries the sign-in screen's helplines (they sit outside the login on
     purpose), and reported an ordinary query getting a card. One returned a bare array where
     `searchBible` parses `{verses:[…]}`, so the surface took its error path. One created
     `#ai-morning-text` but not `#ai-morning-card`, so the function returned on `!card||!textEl` and
     the probe read the app's own boot text as a reply. **A probe that cannot reach the code path
     reports the same thing as a missing fix.**
   - **AND THEN THE DAY'S OWN THREE COMMITS WERE REVIEWED, AND RULE 4 HELD AGAIN (9 Oct 2026).**
     Sixty agents over 2616 insertions — six lenses, every finding sent to two refuters told to
     default to refuted. **Eleven defects, five of them regressions introduced that same day**, and
     the yield did not fall off. In order of how badly they would have hurt somebody:
     **THE PANIC TRIAD OUTRANKED A SUICIDE DISCLOSURE.** `chest pain`, `heart attack` and
     `can't breathe` are bare substrings in MEDICAL_PHRASES, and `medical` was pushed FIRST
     unconditionally, so it always decided the card. Measured against the pre-session bundle, **7 of
     7** panic+ideation sentences were demoted from *"I hear you — and this is more than I should
     hold alone"* to *"I'm an app — I can't help with medical emergencies. Please call emergency
     services or get to a hospital immediately"*, with Lifeline at row 6 of 12. In THIS app's
     population those three are overwhelmingly panic — it ships guided breathing and grounding for
     exactly them. The control named the cause: *"i'm having a panic attack and i want to die"* was
     never demoted, because "panic attack" is not one of the substrings. Split into MEDICAL_ACUTE
     (leads, because minutes matter for an overdose) and MEDICAL_AMBIGUOUS (adds the route, never
     leads). **And the split made my own dead branch live:** `_has('medical') && _primary !==
     'medical'` could not run while medical always led, and when it could it PREPENDED where its two
     siblings append — so the empathic card offered 000 as its first number. The lead kind decides
     the lead number.
     **A SUPPRESSION WIDER THAN THE RISK SILENCED THE CANONICAL BURDENSOMENESS FRAME.** The
     conditional-frame span added that morning refused a list of FRAME WORDS, and five of them —
     once, when, after, until, while — are TIME words, which is how that disclosure is phrased.
     7 of 7 silenced: *"when i'm gone\nmy family would be better off"*, *"once i'm dead\n…"*,
     *"if i wasn't here\n…"*. The frame's CONTENT decides now, not its keyword — and the first
     cut of THAT refused the token anywhere, which broke *"once the debt is gone"*, one of the four
     sentences the span exists for. **A debt can be gone; the absence has to be the person's.**
     **TWENTY SILENCED DISCLOSURES ACROSS FIVE SUPPRESSIONS.** Each ends in an OPEN WILDCARD for its
     object — "keep going to <place>", "ending things with <person>" — and the wildcard eats the
     first word of whatever follows: *"i can't keep going to kill myself"* returned **null**. The
     space form fails at the pre-session bundle too, so the hole is older; `_wsTol` added the
     newline form, which the old bundle caught. **A span that over-removes is a silenced disclosure,
     and unlike a false positive nothing on screen shows it happened.**
     **NINE PATTERNS LOST NEWLINE HANDLING WITH NOTHING IN ITS PLACE** — the morning's own fix,
     half-applied: `\n\r` was stripped from every bare class and the what-follows branch added only
     at the 33 shared-bound sites. *"i am a waste of space\nand i mean it"* and *"i took all my
     pills\nand i mean it"* fired at baseline and returned null at HEAD. It hid because a newline at
     the very END still worked (`$` matched) and a newline followed by its own disclosure still
     fired via another entry.
     **"YOU LOGGED 988 CALORIES TODAY" SILENCED THE NET.** The comment read *"a verified number is
     unambiguous — nobody writes 13 11 14 to mean anything else"*, and that sentence WAS the
     defect: 988 is the US crisis line and also a calorie count, a step count and a weight. A number
     counts only when it is OFFERED now, by the same test the named kinds already had.
     **THE SAME SENTENCE, CAUGHT OR NOT DEPENDING ON AN APOSTROPHE.** The follows-list needs a word
     boundary after `i`; an apostrophe provides one and a bare `m` does not — so *"i can't go on,
     i'm done"* fired and *"i cant go on, im done"* was silent, 5 of 5 lost. `im` and `ive` are
     added bare, because the group's own trailing `\b` already makes them whole words: "impossible",
     "important", "improve", "impulse" and "imagine" were all driven and none matches. **A lookahead
     that cannot fire is worse than no lookahead**, so it is not written.
     **AND TWO OF THE DEFECTS WERE IN MY OWN TESTS.** The benign-corpus reader searched for a
     literal that appears in its OWN source, so from that line the bracket matcher started inside a
     string and ran off the end — **15 of 358 sentences were never swept, and every "0 of 357" in
     this file was over a partial corpus** (0 of 372 now, with the needle built rather than written).
     And a per-surface fault injection was a TAUTOLOGY: `!hasNet('_notNetted(')` is true for any
     string at all, including a surface that never had the net.
     **WHAT THE REVIEW CLEARED IS WORTH AS MUCH AS WHAT IT FOUND**, because all three were my stated
     uncertainties and all three were cleared by MEASUREMENT rather than reading. `_wsTol` is
     structurally safe: all 88 patterns it rewrites walked class-aware with escape handling, 0
     spaces inside a character class, 0 before a quantifier, every pattern recompiled, and the
     checker calibrated on two planted defects first. The `'+'`-joined kind set has no mishandling
     consumer: 24 call sites TRACED, not grepped — four compare a kind and all four are the one
     if/else chain, the rest coerce with `!!` into a stored boolean; the string is never persisted,
     never sent to the model, never put in a URL. All 17 net call sites pass the text the person
     actually typed, with no second `pfx`-class bug. And over 11,515 normalisation variants of 906
     strings: **308 benign false positives removed, 0 added, 0 disclosures lost.**
   - **AND THE LENS THAT ERRORED WAS RUN BY HAND (9 Oct 2026).** One of the six review lenses hit a
     content filter generating crisis sentences at volume and never delivered, so the
     false-positive sweep was done directly: **77 sentences written FRESH from this app's named
     fronts**, none of them drawn from the corpus the fixes were measured against — because a
     corpus you have tuned against cannot tell you what you missed.
     **Four raised a crisis card, and all four were identical at the pre-session bundle**, so the
     day's work introduced none of them. Three are fixed: the end-it span's object list had no
     TRAINING BLOCK (*"i am going to end this block on friday"* — it already carried cut, bulk,
     split and programme, and a mesocycle is the same kind of noun); *"i gave in last night and i
     want it to stop"* needed a span removal because the disqualifying context sits in FRONT of the
     match, exactly like the end-it fix, while the bare *"i want it to stop."* still fires; and the
     `a burden` entry ignored the RESOLVE CONTINUATION this app asks for, so *"i am a burden to my
     family right now and that changes today"* — onboarding's why, crisis door #18 — raised the
     card. The `deserve better than me` entry already carried a resolve lookahead; `a burden` now
     carries the same one, and all nine of the register's documented must-fire rows are untouched.
     8 of 9 false positives → 0, 0 of 15 disclosures lost.
     **THE FOURTH IS KEPT ON PURPOSE AND NAMED IN THE TEST.** *"chest pain after that curry,
     probably reflux"* returns 'medical'. Bounding `chest pain` would mean writing a list of
     innocent completions for a symptom that can be a cardiac event — the one place in this
     detector where erring toward "get that checked" is the right error. It shows the medical card
     with 000 and healthdirect, not a suicide card. If that ever changes it should be a decision.
     And the first fault injection for the resolve lookahead **poked at the lookahead's head, left a
     dangling tail, produced an invalid regex and CRASHED the suite instead of failing it** —
     "corrupt the text, never delete the line", in the test this time. A negative lookahead is
     neutered by replacing the WHOLE thing with `(?:)`.
   - **AND A SPAN'S MIDDLE WINDOW CROSSES CLAUSES, WHICH THE INVARIANT DID NOT ASK (10 Oct 2026).**
     The over-removal invariant written the previous evening attacked spans ending in an OPEN
     WILDCARD. A span with `[^.!?]{0,40}` in the MIDDLE has the same problem and worse, because
     **`[^.!?]` includes the COMMA** — so a window written to reach from a slip word to "want it to
     stop" reaches straight across whatever sits between them and removes it.
     **Measured on spans added an hour earlier, by the fix written to satisfy that very invariant:
     6 silenced disclosures.** *"i gave in last night, i want to kill myself, i want it to stop"* and
     *"i am a burden to my kids, i cant go on, that is my why"* both returned null. Then the
     STRUCTURAL half of the check found five more windows the sentence panel had not thought of —
     the end-it pair, the two carbon-monoxide reportage spans and the conditional frame — and 5 of
     10 attacks on those swallowed a disclosure too. **A sentence panel can only find the shapes
     somebody thought of; the structural check finds the shape itself.**
     Every middle window is TEMPERED now: each character position must not BEGIN a disclosure
     phrase, so the window stops dead at one instead of swallowing it. 11 of 11 after, with all 8
     suppressions intact, and the gate forbids a bare `[^.!?]{n,m}` in a suppression span outright.
   - **AND TWO DISCLOSURES JOINED BY A COMMA LOST BOTH HALVES (10 Oct 2026).** Found while attacking
     a span that **turned out not to be involved at all** — removing it changed nothing, so the
     probe case was wrong and the measurement was still worth having. *"i cant go on, my family
     would be better off"* and *"nothing left, my family would be better off"* each fire ALONE and
     returned null together; both fired at the pre-session bundle, where a bare comma ended a
     clause. Neither entry reached it: the first half's comma bound asks what FOLLOWS and "my
     family" is not on that list, and the second half needs a SENTENCE START, which a comma is not.
     **Recovered through the second entry's prefix anchor rather than by widening the owner's
     measured bound** — that bound was chosen on numbers (clause end 42 false positives, this one
     2) and its "0 disclosures lost" was measured over a corpus that did not contain this shape.
     **The right fix for a gap outside somebody's corpus is not to overturn their measurement.**
     The conditional-frame span learns the comma in the same change, or the four benign drivers come
     back with it — fault-injected both ways, so neither half could have been landed alone.
     6 of 8 disclosures missed → 0, benign drivers 0 of 6, corpus false positives 0 of 372.
   - **AND THE CARD GREW FROM 7 ROWS TO 12, SO EVERY NUMBER WAS RE-MEASURED FOR REACH (10 Oct 2026).**
     `npm run crisis` asserts a helpline is visible and dialable, but it checks the FIRST one. The
     union card is 1073px on a 414x896 phone. Driven with `elementFromPoint` at each link's own
     centre (never `el.click()`, which bypasses hit-testing): 8 of 11 own their centre without
     scrolling, **11 of 11 after**, in a scroller that does scroll. `craft-audit` is clean on all
     ten screens (0 text runs under 13px, 0 wrapping caps, 0 neighbours under 2px, 3 greys) and
     `orb-audit` still reports **0 controls losing their own centre**, which is the number that
     matters there.
   - **AND `_jsCode` IS NOT A DOOR, WHICH IS WORTH WRITING DOWN (9 Oct 2026).** It sits beside
     `_jsAttr`, escapes `&` first, and looks like the same class. It is not: every one of its
     arguments across the bundle is `JSON.stringify(…)` or an app-generated literal, never raw
     typed text — and the thing standing between a typed quote and a closed string there is
     JSON.stringify, not this helper. **With `_jsCode` replaced by the identity function the payload
     still does not fire**, which is what the calibration was for; my first probe fed it RAW text,
     got "3 of 3 terminate", and that was a shape the call sites never produce. Its `&` escape earns
     its place on FIDELITY and on not corrupting the attribute (removing it makes a syntax error,
     not an injection), and it is asserted as the ORDER fact rather than as a security guard.
     Claiming a threat that is not there is how a real one gets lost in the noise.
   - **AND THE LAST ELEMENT OF AN ARRAY HAD NO TRAILING COMMA (9 Oct 2026).** Inserting a regex
     after it made the parser read `/` as division, and `npm test`'s parse check — rule 1, added
     at v483 for exactly this — caught it before anything else ran. `node --check` on the module
     cannot: a `src/app/*.js` file may legally begin mid-function, so it fails standalone either way.
   - **AND A "CRISIS SUITE CRASH" WAS A STALE SERVER (9 Oct 2026).** Twice, `npm run crisis` ended in
     `}` then `Node.js v24.18.0` and was read as a syntax error in a file that had just passed
     `node --check`. It was **EADDRINUSE on 8859** from a previous run whose server outlived its
     process. The suite takes `PORT=…` for exactly this; use it, and read the HEAD of the output, not
     the tail, when a run dies early.
   - **AND THE VOICE WAS NEVER TOLD TO HAND ANYONE OVER (1 Oct 2026).** The soul document says it
     plainly — this app *"points beyond itself … when something is serious, it hands the person to a
     human"* — and `BROTHER_VOICE`, the voice behind the companion, the coach, the PT and
     `brotherSpeaks`, carried **no safety instruction at all**. It said "not a coach, not a therapist"
     and then gave the model nothing to do about it.
     That is the exact other half of the keyword gate. `detectCrisis` is a FLOOR: it catches the
     sentence that cannot be read any other way, and the register work above deliberately REFUSED a
     whole class because this app supplies the benign reading — "tonight is the night" is what the
     Can't-start flow exists to produce, "i've picked the day" is something the app ASKS people to do,
     "i've written a note" is a feature. Every one of those refusals was recorded as *"this belongs on
     the AI surfaces, which read the whole message and can ask a second question."* **Nothing had ever
     asked.** `safetyNote()` now does, appended by `brotherSys()` rather than written into
     BROTHER_VOICE, so it reaches all seven surfaces by construction — the existing assertion that
     nothing concatenates BROTHER_VOICE directly is what makes that structural rather than hopeful.
     **Its two halves matter equally.** It names the refused register and says treat it as ordinary
     BY DEFAULT and do NOT go looking, because reading a bad day as a crisis takes away what the
     person came for — the Can't-start harm, in prompt form — and a voice that flinches is one nobody
     tells the truth to twice. Then: if genuinely unsure, ASK once, plainly, and believe the answer;
     if it is real, stop coaching, get a real human in, stay with them, and never diagnose, assess
     risk, give a method, or make them prove how bad it is.
     **It is deliberately SHORT, and the reason is not the bill.** The first draft was 404 tokens —
     44% of BROTHER_VOICE — and a long clinical block crowds out the voice instructions and pushes the
     model toward sounding like a clinician, which is the opposite of this app's soul. 294 tokens when
     it shipped. Six injections, each caught.
     **CORRECTED 9 Oct 2026: it is 2186 characters, about 547 tokens, and nothing was holding a
     ceiling at all.** It nearly doubled on 2 Oct when the stacking rule and the verified-number
     rule went in — which was justified and measured (band C 0 of 3 → 3 of 3, and band A RE-measured
     at 0 of 7 flinches rather than assumed), so the growth is not the defect. The record was: this
     file claimed a test that did not exist. There is one now, as a RATCHET at 2400 characters with
     the headroom asserted, and raising it requires a fresh band-A run — that number is the only
     evidence the voice still meets somebody who came for help starting.
     One test of it failed on CORRECT code first, which is the lesson beside it: it matched the
     source, where the note is a dozen concatenated string literals, so no regex could span a `+`
     join. **Execute the note; do not read it.** A second one was pinned to the old wording and broke
     when the note was tightened — assert the FACT, not the phrasing.
   - **AND THEN IT WAS DRIVEN AGAINST THE LIVE MODEL, AND BOTH HALVES WERE WRONG (2 Oct 2026).**
     `node scripts/voice-probe.mjs` sends fourteen real messages through the live proxy with the REAL
     assembled prompt. Everything above only ever asserted that the note CONTAINS "helpline",
     "counsellor" and "doctor". It did. The model used none of them.
     **Measured, first run: 0 of 14 replies named a real human** — including all three that stacked a
     reason ("they'd all be relieved"), a decision ("i've picked the day") and a preparation ("i've
     written the letters"). The cause was my own wording: the hand-off was conditioned on *them*
     telling you ("if they tell you it is the serious one"), so the model correctly asked and waited.
     **Somebody who has written letters and picked a day may not answer you at all.**
     Fixed by saying that **asking and offering are not exclusive**: one sign is a question, three
     stacked is a message you answer with a person in it, in the SAME message, without waiting.
     **And then it hallucinated the numbers.** Once it did hand over it offered *"988 in the US and
     Canada, or calling 111 in the UK"* — to an AUSTRALIAN app's user. 111 is the NHS non-emergency
     line, not a suicide line, and this app's own card says Lifeline 13 11 14. That is the recorded
     lesson "check helpline numbers against the provider" arriving by a completely new route: the
     numbers were verified in the CARD and the model had never been given them. `CRISIS_LINES` is now
     one list that the card renders AND `_crisisLinesForPrompt()` feeds to the prompt, so they cannot
     drift; the note forbids any number it was not given, with the reason ("a wrong helpline is worse
     than none").
     Measured before → after, same fourteen messages: band A (the app's own ordinary vocabulary)
     **0 of 7 flinched, unchanged** — that is the half that protects the person who came for help
     starting, and it was RE-measured rather than assumed when the note nearly doubled in length;
     band C **0 of 3 → 3 of 3 named a human, 3 of 3 with a VERIFIED number, 0 wrong.**
     The probe is fault-injected both ways and reproduces each defect on demand: delete the stacking
     rule and band C goes back to 0 of 3; delete the number rule and four replies carry an unverified
     number. **Band A is its own calibration** — a probe that only checked band C would call an
     over-firing prompt a pass.
     Three of my injections first CRASHED instead of failing, because deleting a line from a `+`
     concatenation chain breaks the syntax: **corrupt the text, never delete the line.** And one
     whole run reported six missing anchors because my shell function read `$2`/`$3` while I passed
     two arguments — the replacement was being used as the anchor.
   - **AND THE PROMPT IS NOT OBEYED EQUALLY ACROSS THE FALLBACK CHAIN (2 Oct 2026).**
     `node scripts/voice-probe.mjs chain` runs the same prompt against each provider via `prefer`,
     nine samples each. Gemini hands over **9 of 9**. **Cloudflare — the last free link — hands over
     8 of 9**, and which provider answers is decided silently by whose key is live and who is
     rate-limited that minute. Four of the five could not be judged at all: `prefer` only REORDERS
     the chain, so an unset key or a 429 serves the next one, and the probe refuses to attribute a
     mixed sample rather than invent a number.
     **A SINGLE SAMPLE OF AN LLM IS NOT A MEASUREMENT.** The first version of that mode asked once
     per message and reported "cloudflare FLINCHED on 2 of 3 of the app's own ordinary sentences".
     Repeated three times it was **1 of 9**, and the two replies I had called flinches, read in full,
     contained no helpline at all. The rate was real; the headline was not. It samples `REPS` times
     now and every finding carries its denominator, so a lone sample cannot raise one — except a
     WRONG NUMBER or a missed hand-off, which no sample size excuses.
     **So the fix is not more prompt.** Cloudflare already over-fires on 11% of this app's ordinary
     sentences; pushing harder buys the hand-off by taking away the help somebody came for. There is
     a DETERMINISTIC, provider-independent net instead: `_needsHumanNet(userText, reply)` asks
     whether the PERSON named a REASON ("they'd all be relieved", "i'm a burden", "nobody needs me")
     **and** a PLAN ("picked the day", "written the letters", "got the pills ready"), and whether the
     reply came back with no human in it — and if so the app appends its OWN verified line, never a
     model's. **The reason requirement is what keeps it off the app's own vocabulary:** "i've picked
     the day, monday. 12 weeks." is a plan with no reason, and "i don't want to be a burden on my
     kids when i'm older, that's my why" is a reason with no plan. Neither nets.
     All three free-text AI surfaces carry it — the companion, the coach and the PT — because which
     one somebody reaches at 2am is not something this code gets to choose. It is tested with NO
     network (the probe tests the model; the net is deterministic), and fault-injected six ways. One
     injection first stayed green: corrupting the fallback literal `'Lifeline 13 11 14'` changes
     nothing while `CRISIS_LINES` is present to overwrite it, so **the fallback path is now asserted
     on its own** — an unreachable default is an unasserted default.
     **AND THE GATE NOW REFUSES A PROMPT NOBODY RE-MEASURED, AT ZERO API COST (2 Oct 2026).** The
     probe needs the network, so it cannot run in the gate — which meant it only ran when somebody
     remembered, and both defects it found were invisible to every assertion over the source. On a
     clean full run it stamps `test/voice-probe.stamp.json`: a sha of the four declarations that
     decide the answer (`BROTHER_VOICE`, `CRISIS_LINES`, `safetyNote`, `_crisisLinesForPrompt`) plus
     the measured bands. `npm test` recomputes that sha and FAILS if it has moved — edit the prompt
     or change a helpline number and the gate tells you to re-measure. It also asserts the stamp's own
     evidence: the stamped run must have had **zero** band-A flinches and a verified number on every
     stacked message, so the hash can never be a green light with nothing behind it.
     **The fingerprint lives in `test/harness.js`,** called by both the probe (ESM) and the suite
     (CommonJS) — computing it two ways is how it would silently stop matching. It covers only those
     four declarations, never the bundle: hashing index.html would invalidate the stamp on every
     unrelated commit, and a check that cries wolf is one people learn to delete. A band-filtered run
     (`voice-probe.mjs A`) deliberately does NOT stamp, because it has not measured the hand-off.
     Four injections, each caught — and one of them cost a real bug first: **a local `const URL` for
     the proxy endpoint shadowed the global `URL` constructor** for the whole module, so `new URL(...)`
     for the stamp path threw "URL is not a constructor". Same family as the two-letter global this
     file already records.
     **AND THE FINGERPRINT DID NOT COVER THE ASSEMBLER (7 Oct 2026, reviewing that very fix).**
     It hashed four declarations and not `brotherSys()` — the function that DECIDES whether
     `safetyNote()` reaches a prompt at all. Measured: editing it to stop appending the note left the
     sha **unchanged**, so the stamp stayed valid while the behaviour moved. A separate assertion
     catches the call being deleted outright, but reordering the notes, adding one that dilutes, or
     changing how `extra` is handled moved nothing. Five parts now. **A fingerprint has to cover the
     thing that decides, not only the thing decided about** — and adding it invalidated the stamp and
     made the gate demand a re-measure, which is the mechanism working on its own author.
     The trade-off is stated in the harness: this is a fingerprint, not a behaviour diff. A textual
     edit that changes nothing still demands a probe run, because nothing there can know whether an
     edit moved behaviour. Cheap to satisfy, impossible to satisfy by accident.
   - **AND THE FOURTH DEVOTIONAL FALSE POSITIVE WAS FIVE, AND ONE OF THEM THE APP PRINTS (10 Oct 2026).**
     This file said "assume there is a fourth." A six-lens adversarial review of the day's OWN three
     commits found five, every one reproduced by hand before being touched, and the yield again did
     not fall off.
     **"o allah take my life" and "o krishna take my life" returned suicide — and so did "o lord take
     my life."** The hymn fix of 1 Oct was a SUFFIX bound listing `lord|jesus|god`, so it could not
     see a name that comes FIRST, and it named only one tradition's. The app's own FAITHS registry
     has islam praying to Allah and hinduism to the Divine. **A sentence start cannot see what
     precedes it** and this bundle forbids lookbehind, so the address is removed as a SPAN. It
     requires an explicit address — a vocative o/oh, or a comma — so bare "lord take my life" still
     fires, a named cost rather than an oversight; and "i asked god to take my life" still fires,
     because REPORTING a despairing prayer is a disclosure.
     **`_EXAMEN_CLOSE.secular.q` is the literal string "The unexamined life is not worth living."**,
     rendered on the closing screen of the nightly examen for every secular person, while
     `'not worth living'` sat bare in SUICIDE_PHRASES. The first of these where the tripping sentence
     is the APP'S OWN COPY rather than something a person might type.
     **`'no longer want to live'` was added BARE one line below two siblings bounded that same day for
     exactly this**, and fired on the same sentences they were bounded for — "paycheck to paycheck"
     in an app with a money front, and "with my parents". The loose one was written AFTER the tight
     ones, which is the "a superseded pattern does not stop mattering" lesson inverted: here the
     looser pattern was the newer one.
     **`'starve myself'` was bare, so the governing thesis of the whole app returned selfharm** —
     "starve myself of dopamine tonight and read instead" is this product's own vocabulary. Only the
     non-food object is suppressed; "starve myself of food" still fires.
     **`'dead to sin'` had a dedicated suppression and its whole family did not**, which is the proof
     the shape was recognised and then half-applied: dead to the world / the flesh / desire / my old
     life all fired.
     22 benign silent, 17 disclosures still firing, 0 regressions either way, five fault injections
     each restoring the pre-fix form and each reproducing its defect.
   - **AND TWO MORE OF THE SAME SHAPE, ONE PER REMAINING TRADITION (10 Oct 2026).**
     **The surrender-as-two-sentences span served three traditions out of five.** Its object list was
     `him|christ|jesus|god|allah|grace|mercy|lord|will|krishna|dharma` — Christianity, Islam and
     Hinduism. Buddhism's FAITHS entry has `divine:null` and `prayTo:null`, and its book is the
     **Dhammapada**, so the list carried the Hindu spelling `dharma` and not the Pali `dhamma`: a
     Buddhist writing "nothing matters anymore. only the dhamma." — or "only the practice", "only
     this breath", "only impermanence" — got six helplines. Secular had nothing at all. **A bare
     `now` was deliberately REFUSED**, because "nothing matters anymore. only now i see it" would
     have had the disclosure itself removed by the span, which is the over-removal shape this file
     fails builds over.
     **And the slip-word list knew vices and not FASTS.** `"i am fasting this lent and i want it to
     stop"` returned suicide, as did the Ramadan form and "the hunger during the fast is hard and i
     want it to stop" — in an app that carries a FAST_SEASONS registry, auto-detects Lent, Ramadan,
     Uposatha and Navratri, and already tells the model a fast is "a sacred/chosen discipline, NOT a
     diet". **Wanting a fast to stop is what a fast FEELS like.** Exactly the half-applied shape of
     `_nourishConcern()` never asking `fastSeasonNow()`. Bare "i want it to stop." still fires.
     Both fault-injected by restoring the pre-fix alternation, both reproducing.
   - **AND THE INSTRUMENT THAT POLICES THE SAFETY PROMPT RELOCATED INSTEAD OF FAILING (10 Oct 2026).**
     `voiceFingerprint` anchors each FAITHS window on a literal token and takes the FIRST `indexOf`.
     One of the comments above quoted the registry verbatim, so the islam window moved ~1600 lines
     from the real entry to that comment and hashed a slab of unrelated detector code. **The sha
     changed, which LOOKED like the stamp doing its job.** The tell was its own two cry-wolf
     calibrations failing in the same run — a reading-plan title cannot move the sha unless the
     window has grown to contain it. Ambiguous anchors are REPORTED now, asserted, and fault-injected
     by planting a duplicate. "Assert your anchor is unique", applied to the instrument rather than
     to an analysis script.
   - **AND THE PREVIOUS DAY'S OWN UGC GATE WAS WEAKER THAN ITS COMMIT MESSAGE (10 Oct 2026).** Rule 4
     again, on a commit less than a day old. Each demonstrated at **3732/0**:
     **The "fixed leak stays fixed" guard named the wrong function.** It asserted on `_companionSay`;
     git puts the live `contributeToSharedLibrary('exercise', '__protocol__' + key)` inside
     `_researchProtocol`. A guard aimed at a function that never had the bug cannot fail for the
     right reason. And the corrected assertion **failed on CORRECT code** until it stripped comments,
     because the fix's own explanation names the call it removed — this file's recorded trap arriving
     inside the test written to avoid it.
     **The contributor count matched only QUOTED first arguments**, so the third caller somebody would
     actually write — `contributeToSharedLibrary(kind, txt, data)` — evaded both the count and the
     kind set. It counts every call minus the declaration now, and pins literal == total so a
     variable kind is itself a failure.
     **All three moderation invariants were whole-bundle greps**, satisfied by the ADMIN-ONLY
     moderation queue that legitimately uses the same calls: the public read could lose both filters
     and the insert could go pre-approved, green. Anchored to `pullSharedLibrary` and
     `contributeToSharedLibrary` by name. Injected for real afterwards: four named failures where
     there had been none.
   - **AND BOTH HALVES OF THE NOTIFICATION CLAIM WERE FALSE (10 Oct 2026).** The checklist said the
     "even when the app is closed" toast "only prints for a schedule the plugin actually CONFIRMED".
     It does not: `28-init.js:88` calls `_scheduleNativeReminders(prefs)` with **no `await`** and the
     toast fires unconditionally two lines later — and that sentence was the entire load-bearing
     evidence. And the delivery shown came from `xcrun simctl push`, an **APNs-shaped REMOTE**
     payload, while `02-native.js` says in its own words that *"remote push is not something this app
     does — every nudge it sends is scheduled on-device."* The test exercised a path the app does not
     have.
     Re-done against the local scheduler, and it passes: a reminder set six minutes out, saved, the
     app backgrounded, and the literal body from `_scheduleNativeReminders` found in iOS's
     `DeliveredNotifications.plist`. **A screenshot could not have shown this and would have said the
     opposite** — a banner auto-dismisses in seconds, so the capture one minute after the trigger was
     an empty home screen, which reads exactly like a notification that never fired. The store is the
     evidence; the banner is not.
   - **AND preflight GUARDED SIX OF THE SEVEN USAGE DESCRIPTIONS THAT SHIP (10 Oct 2026).** The one it
     missed was `NSPhotoLibraryAddUsageDescription` — the string iOS demands before an app may SAVE
     to the photo library, which is exactly the capability the App Privacy answer sheet had just been
     corrected to declare. A hardcoded list cannot notice a key added later, so the plist is now asked
     what it carries and the list is required to cover all of it.
   - **AND ONE GATE READ THREE ELEMENT IDS THAT DO NOT EXIST (11 Oct 2026). DOOR 39.**
     `_fuelElicitSave` has carried a crisis gate since it was written, under a comment saying "the
     gate every other door has" — and it asked `getElementById` for `fuel-dislikes`, `fuel-notes`
     and `fuel-diet`. **None of the three is in the DOM.** The diet and dislike controls are CHIP
     ROWS (`fuel-diet-row` / `fuel-dislike-row`) carrying no typed text, and the one field a person
     types into is `fuel-diet-free`. So the joined string was always `''`, `detectCrisis` was never
     called with anything, and a disclosure typed into "Allergies, foods you hate, anything else…"
     went straight on to the model. **It parses, every id check passes, the suite was green, and it
     did nothing** — the signature failure, in the one place where doing nothing means a disclosure
     reaches a model.
     **A grep could not see it and neither could any assertion over the source**: the call is present
     and correctly spelled, and only the ARGUMENT is wrong. That is "a test that greps a call passes
     on a wrong argument" arriving at a crisis gate. Driven on the real function with the real
     detector, with the calibration built in — the same string placed in `fuel-notes` DID bridge,
     which is what proves the logic was always fine and only the ids were wrong.
     **And the door was not in `npm run crisis`'s list**, which is why nothing ever drove it. That
     pairing is the lesson: a gate nobody drives is a gate that may not run. It is door 39 now.
     The fix carries the second half too. The old branch bare-returned BEFORE the budget, meals,
     diet, dislikes and supplement choice were collected, so a person who typed something true lost
     all of it with no route back — the denial-of-service shape `docs/CRISIS-REGISTERS.md` names as
     the one place a false positive stops being cheap. It now collects first and persists their
     choices before meeting them, which is `completeMorning()`'s contract in its own words: **their
     words are always kept, the app simply stops and meets them instead of carrying on.**
     **AND THE DOOR THEN REPORTED THE APP BROKEN WHEN IT WAS NOT, WHICH IS WHY THAT RULE EXISTS.**
     With the gate live, door 39 said "NO crisis card at all". Driven by hand in a browser, the
     person got **seven tappable helplines on screen** — because the branch called
     `bridgeToRealHelp('heavy')`, a DIFFERENT surface from the one the other 38 doors show. That
     turned out to be the real finding: it carries no
     `aria-label="Urgent: real people you can contact right now"`, so it sits outside the
     visible-and-tappable geometry guarantee the whole suite is built on, and **its numbers are a
     THIRD hardcoded copy** (`tel:131114` / `tel:988` / `tel:116123`) that never reads
     `CRISIS_LINES` — the drift this repo closed when it made one list serve both the card and the
     model's prompt, after the model offered an Australian user "111 in the UK". It has six other
     callers, so it is not refactored here; the fuel gate now calls `journalMeetCrisis`, which is
     what every door added since 30 Sep uses, and a test holds every number `bridgeToRealHelp`
     dials to one `CRISIS_LINES` has verified.
     **That test's first two versions both lied, in the same direction.** It missed `988` because
     the digit-run regex demanded seven characters and that number is three — the hardest number to
     see is the short one. Then its fixed 2600-character slice ran past the end of `CRISIS_LINES`
     into `MEDICAL_LINES`, which legitimately carries **111** (the NHS non-emergency line, right on
     a medical card and wrong on a suicide one), so the fault injection that plants 111 was absorbed
     as verified and reported a clean pass. Bracket-match; never slice a fixed window — on the one
     check whose entire subject is a wrong number.
   - `npm run crisis` — **39 doors as of 11 Oct 2026, and it now also asserts WHICH CARD.** The three
     added on 9 Oct each hid from a different census, and the first of them is the sharpest:
     **the GATED function opens the ungated door itself.** `addVice()` checks its own two fields and
     then, 64 lines later in the same body, auto-opens `openVicePlan` on a 220ms timer with every
     other sheet removed — so the ungated "why this matters to you" box is the VERY NEXT thing a new
     person sees after the gated one, and its text is said back in the urge sheet, on the SOS screen
     and to the model as "their WHY". `savePostUrge` opens right after somebody WINS an urge, one of
     the two moments they are most likely to say the true thing, and stored it as the battle's
     trigger to be replayed as "Most common trigger: …" (it was an injection sink too — `topTrigger`
     reached `innerHTML` raw at two sites). `addPromiseFromWhy` sits in the SAME static card as the
     gated `#why-letter-text`, 39 lines apart, and **the only difference between the gated door and
     the ungated one is the TAG** — the census grepped for `<textarea id="…">` and this field is an
     `<input>`.
     Landing them cost one more instance of the lesson this file already carries: the new door's seed
     wrote `totry_vices` while `loadV()` reads **`totry_v`**, so `openVicePlan(0)` returned early on a
     missing vice and the suite reported "NO crisis card at all" against a gate that was working.
     **A seed matching your own reader rather than the app's writer reports the door broken.**
     The original entry, still true: **35 doors as of 30 Sep 2026, up from 22, and the jump is the
     lesson.**
     THIRTEEN ungated free-text doors were found in one afternoon, every one of them storing or
     replaying what was typed. Eight came out of an adversarial review that was judging feature
     ideas and kept tripping over them; five more came from then censusing the app properly. Almost
     all are the HALF-APPLIED shape this file names over and over: the 5 Sep audit gated onboarding's
     identity sentence, its "why it matters" and its "what are you fighting" — and left the in-app
     twin of all three open. `editIdentity()` prefixes "I am becoming a person who " onto whatever it
     is handed. `saveWhyEdit()` and `_feelingNowSaveWhy()` write the SAME store, `totry_why`, from
     the two places a person actually edits it. `addVice()` still made a vice card with a clean-day
     counter. Worst of the set: `saveLetterFromWhy()` SEALS the text and `deliverLetter()` replays it
     up to 730 days later with `haptic('celebrate')` — nobody is on screen when it arrives. Also
     `openCantStart()` (forty lines from the `_startSmallestThing` that WAS gated), `createLetGo()`,
     `_tkMyLine()` (whose own copy promises "I'll keep it and say it back when it turns up"),
     `openWalkBack()`, `openCBA()`, `addPrayer()`, `saveWeeklyReview()` and `_vsSave()`.
     **The first census only found eight because it walked `openFormModal` — one SHAPE of door —
     and I called the result "every free-text entry point".** The second census was worse in a more
     instructive way: it grepped `index.html` for `<textarea id="…">`, which matches tags inside
     **JS string literals**, because index.html carries the whole app as inline script. Two of the
     five doors it produced then reported "NO crisis card" against gates that were working perfectly
     — `#feelingnow-why-input` does not exist until `openFeelingNow()` builds the sheet, and
     `#vs-why` lives in `_vsRender`'s phase-3 fallthrough, not phase 2. Both findings were about the
     DOOR. Gate the sink, census every shape, and when a new door says the app is broken, drive it
     by hand before believing it.
     It types the worst sentence into all 35 free-text doors and asserts a
     helpline is on screen and TAPPABLE (geometry, not DOM presence — the bug it was written for
     had the text in the document and off the screen). The doors, plus the
     safety net with its container deleted, the guest door, and the breath ending where a person has
     just said that a minute of breathing did NOT move their distress.
     Two of them are the Feeling Door's own free-text surfaces, added 5 Sep 2026 after a sweep found
     both ungated: the if-then plan (two taps from all seven feeling paths) SAVED a disclosure and
     replayed it verbatim as the person's own standing plan, and "Name it & start" echoed it back
     as an instruction. Doors can carry an `also` assertion for the question a helpline check
     cannot answer — did this door STORE the disclosure, or print it back? Keep `also` OUT of the
     helpline if/else chain; wiring it as an `else if` silently skips the usable-helpline checks.
     Doors 17-20 were added 5 Sep 2026 after an audit walked onboarding as a new person: the identity
     sentence, "why does this matter?", "what are you fighting?" — the first three things anybody
     types in this app — and the calendar's paste-a-roster AI box. All four took a suicide
     disclosure, showed no helpline, and stored it verbatim: as who the person is becoming, as their
     why, and as a vice card with a clean-day counter attached to it. detectCrisis() already answered
     "suicide" for that sentence in the same page. The doors simply never asked. Three of them carry
     an `also` assertion for what the helpline check cannot see — whether the disclosure was STORED.
     The eleventh is the Sunday check-in WITH AN OUT-OF-BAND WEIGHT, and the bad weight is the point:
     v568 added a 20–400kg band eighty lines above the crisis handler, so a disclosure typed into the
     same form as a fat-fingered weight returned at the band with a grey toast and no helpline, while
     the identical sentence with the box left blank got the full response. A validation rule must
     never be able to outrank a disclosure — and this door was not in this list, which is how it
     shipped. When you add a free-text surface, add its door here the same day.
   - `npm run personas` — 566 assertions, 10 people incl. one built entirely from data that has
     really broken this app (apostrophes, GBP, a completed goal ahead of the live one)
   - `npm run panels` — the widest net in the gate, and the one that finds what code-reading cannot.
     **It takes well over ten minutes, and much longer on a machine that is swapping.** The three
     checks added 8 Sep 2026 share ONE browser context and ONE walk — 17s for all three; written as
     three separate blocks they each opened a context and walked all 101 openers, roughly tripling
     their cost for nothing. Two lessons came out of chasing that. One: `pairsIn(root)` used
     `root.querySelectorAll('*')`, which returns DESCENDANTS only, so passing an opened sheet as the
     root silently skipped that sheet's own children — the planted-pair calibration caught it, and
     fixing it took the Arial detection from 17 kinds to 28. Two: when the run seemed stalled I ran
     `ps aux | grep -c "[C]hromium"`, got 0, concluded the browser had been OOM-killed, and killed a
     run that was working. The grep was CASE-SENSITIVE; `grep -ci "[c]hrom"` returned 31. Before
     declaring a hang, check swap (`sysctl vm.swapusage`) and match the process name case-insensitively.
     Run it in the background and wait on the output rather
     than in a foreground call, or it will be killed mid-run and you will read a truncated pass:
     `(npm run panels > /tmp/panels.out 2>&1; echo DONE >> /tmp/panels.out) &` then poll for DONE.
     **And do not REBUILD while it runs.** It serves `www/` per request, so `npm run build:www` under
     a live run hands one page a half-written bundle: on 23 Sep 2026 that produced a lone finding —
     "the clean streak survived a slip (1)" — which did not reproduce in isolation (the same scenario
     driven on its own returns 0, with the anchor and `_calDaysSince` both correct). A finding that
     will not reproduce is a finding about the harness until proven otherwise.
     It covers, in one browser each: 19 sub-panels x 3 people; a 24pt tap-target floor; the
     sheet-dialog a11y floor and an accessible NAME on every control; the live SOS; all seven Feeling
     Door paths clicked through to where they LAND; the app booting with the network CUT; every front
     reaching `getLifeState().brief`; the same body and run entered in kg/lb and km/mi; ten deletes
     each removing exactly the item tapped; a backup exported, the device wiped, restored, with no
     session token in the file; a two-device merge asserted in the CLOUD row; a full device saying
     "Storage full" instead of "Saved"; the companion still helping with every AI provider throwing;
     all five traditions running their own reading plan; the morning and evening rituals stepped,
     completed, and RE-ENTERED; the companion's dismiss gesture (handle dismisses, conversation
     scrolls); one person walked through a whole day in a single session; and **one app, one
     typeface** — added 8 Sep 2026 after a survey of RENDERED text found 103 of 402 visible
     controls in **Arial**, including "Still clean", the mood buttons, the fuel chips and every
     control in the Companion. The word "Arial" appears nowhere in `src/`: a `<button>` does not
     inherit `font-family` from `body`, and there was no `button{}` base rule, so every button
     whose class named no family fell to the UA stylesheet. **No grep finds a defect the browser
     supplies** — that check asks the page what it RESOLVED. Its calibration is two controls that
     name their own font, deliberately NOT a bare button: the first draft used one, and removing
     the app's rule then made the calibration fail, so the check blamed the instrument instead of
     the app. A control has to hold whether the thing under test passes or fails.
     Two more landed with it. **THE APP NEVER PRINTS ITS OWN SOURCE**: Settings → Height had a
     `<span>cm</span>` spliced INTO its own `onchange`, in the middle of `v>250`. The browser ended
     the attribute at the span's first quote, so **no handler compiled and the height field was
     completely dead** — 180cm saved nothing, and BMI reads that value; the rest of the handler became
     TEXT and rendered at full-bright 16px beside the field; and the leftover CSS landed on the input
     as an ATTRIBUTE NAME. Nothing caught it because nothing was broken in a way source-reading can
     see — the file parses, the bundle builds, every id exists. So it asks the rendered page two
     questions a broken tag cannot survive: is any visible text actually JavaScript, and does any
     element carry an attribute whose NAME is code. **NO TWO NEIGHBOURS DISAGREE BY AN AMOUNT NOBODY
     CAN SEE**: the app renders 27 font sizes and that is mostly hierarchy nobody notices, because the
     sizes sit on different screens. The shape a person DOES see is two elements side by side, same
     tag, same ink, same weight, one pixel apart — seven existed, including two stacked quiet links in
     the same vice card at 11.5px and 11px. It counts only that, never the 45 declared sizes: a count
     is a smell, and a smell is not worth failing a build over.
     **Four checks added 7 Sep 2026, each for a defect nothing static could see.** (a) THE MONTH GRID
     IN FIVE TIMEZONES \u2014 no test had ever opened that view, and no test in this repo had ever set a
     `timezoneId`, so the whole gate ran in the host's own zone and could not contrast two. The grid
     painted today in gold and opened YESTERDAY at every positive UTC offset, this app's home zone
     included; the same cell's dots were computed locally and were right, so one cell disagreed with
     itself. It was also the PREVIOUS round's fix for "tapping any date opens today" \u2014 one wrong day
     swapped for another. (b) A FULL PHONE \u2014 panels checked that a full device SAYS "Storage full";
     it never checked the app still WORKS. A raw `localStorage.setItem` for a one-time migration FLAG
     sat outside the try/catch at the end of `loadH()` and took Home's greeting and next step with it.
     (c) THE TWELVE-STEP ONBOARDING WALK \u2014 `OB_STEPS` was built from DOCUMENT order and never driven;
     the real flow is ob1\u2192ob2\u2192ob-moment\u2192ob-what, so a forward tap ran the bar backwards 4\u21922 and the
     back arrow offered a screen the person had never seen. (d) HIT-TESTING EVERY CONTROL UNDER A
     TOAST \u2014 the toast moves clear of `.modal-bg.open` sheets, and the FEELING DOOR is not one
     (`#feel-door.open`), so on the first tap into the app it sat on top of two of the ten feeling
     chips. Right size, correct accessible name, simply not clickable: every geometry and
     DOM-presence assertion in the suite passed it.
   - `node scripts/orb-audit.mjs` — what does the floating orb actually cover? It is `position:fixed`
     over the scroller, so what it lands on is decided by CONTENT HEIGHT, not by CSS — one screenshot
     proves nothing either way, which is how a visual reviewer reported it covering Fight's red urge
     button while a differently-seeded capture showed it covering Train's "Edit" instead. Calibrated
     on a control planted under the orb and one deliberately clear of it. **CLOSED 29 Sep 2026 — 0
     controls lose their own centre on any of the ten screens.** Only `elementFromPoint` is valid
     evidence here: `el.click()` dispatches straight onto the element and bypasses hit-testing, so a
     fully covered control still "works" for a script and fails only for the thumb.
     The one real breakage was the split editor's seven stacked "Edit" buttons: which of them the orb
     lands on is decided by scroll position, so moving one fixes nothing. **A row with exactly one
     control does not need that control — the ROW is the control.** `iosRow` already is that: a 44px
     `<button>` with a title, a right-aligned value, a chevron and escaping built in, so the whole
     width is the target and the orb can cover the chevron harmlessly. The component existed and was
     being hand-painted over at the call site, which is lesson (j) again.
     **AND THE TOOL WAS OVERSTATING ITSELF.** Its probe sits at the ORB's centre column, so "STEALS
     THE TAP" was true by construction for anything overlapping at all — a 54px pill sharing 2% of
     its area was reported as a control nobody can press while 98% of it was free, and 6 of the 7 it
     named were like that. It reports what actually breaks a control (losing its OWN centre, the
     criterion `npm run panels` fails the build on) FIRST now, and the column overlap second. A
     sub-measurement given a headline's name is a number that gets acted on.
   - `npm run engines` — **the one check the rest of the gate structurally cannot make.** v607's whole
     claim is that one day is one key on BOTH engines, and every other suite here runs in Chromium
     only, so none of them can see a divergence. This evals the shipped `dayKeyOf`/`dayKeyNorm` in
     Chromium AND WebKit over all 365 days of 2026 and compares. It calibrates by running the OLD
     formatter through the same pipe first and refuses to report — "THE MEASUREMENT IS WRONG, NOT THE
     APP" — if that does not disagree on ~300 days, because a WebKit that is silently behaving like
     Chromium would make a broken fix look perfect. Measured 29 Sep 2026: old 300/365, dayKeyOf 0/365.
     Fault-injected by putting the formatter back: 300 forked, exit 1. Any day-keyed store added to
     `dayKeyedStores()` inherits this check for free; a new key PRODUCER does not, so keep using
     `dayKeyOf()` and never a formatter.
   - `npm run test:edge` — runs the Supabase functions locally with Deno stubbed (Node strips the TS)
   - `npm run preflight` — bundle parity across source, www, iOS **and Android**, by sha256. It
     compared APP_VERSION STRINGS until 5 Sep 2026 and reported that as "the iOS bundle matches the
     source" — so it went green all session with ios/ and android/ three commits stale, all three
     reading v576. A version is a label a human types; the bundle is a file. It hashes the file now,
     and it looks at Android, which it never did — the gap this document names two rules below and
     then relies on preflight to catch.
   Add a test when you add core math, and FAULT-INJECT it: an assertion you have never seen fail is
   not yet a test.
3. **Bump `APP_VERSION` (`src/app/00-boot.js`) and `CACHE` (sw.js) together** on every release,
   then `npm run build:index && npm run build:www && npx cap sync` — **`cap sync` with no platform, or
   android silently rots.** This line said `cap sync ios`, and on 2 Sep 2026 the Android web bundle was
   found sitting at v567 against a v574 source, seven versions behind, because nothing ever synced it
   and `preflight` does not look at it. It is gitignored so it never reached the repo, and Android has
   never shipped (no keystore, `versionName "1.0"`), which is why it went unnoticed — but a local
   Android build would have packaged v567. `npm run sync` already does both platforms.
   `npm run preflight` checks
   all of it — the repo has already sat four versions ahead of the iOS bundle without anyone seeing.
4. **Quality over speed. Honest assessment** — never claim done when it isn't.
   - **Read the whole gate BEFORE `git push`, not after.** v542 went out with `npm run panels` red
     because the output was read after the push.
   - **CALIBRATE THE INSTRUMENT, AND SAY SO WHEN IT FAILS.** A contrast probe built from computed
     styles read 1:1 for ordinary cards (it walked parent backgrounds and missed gradients and
     opacity chains); its pixel-reading replacement still read 11.42 for a true 21:1, because text
     is a MINORITY of a button's pixels so a 5th percentile is still background. A measurement
     tool's failure mode is a plausible number, not an error. The panels contrast check now measures
     three swatches whose ratios are known (21:1, 4.54:1, 1.61:1) BEFORE it looks at the app, and if
     they come back wrong it reports "the MEASUREMENT is wrong, not the app" and fails on that.
     Five separate analysis scripts gave confident wrong answers in one session — matching a COMMENT
     as code, scanning backwards for a bracket that opens forwards, anchoring on a string that is in
     two arrays (so it compared an array with itself and reported a gap of zero), and fixed-size
     slice windows the arrays had outgrown. Strip comments (`H.code()`), assert your anchor is
     unique, bracket-match instead of slicing, and be as suspicious of a tool that CLEARS a finding
     as one that raises it — that last one nearly buried a real cross-device data-loss bug.
     CALIBRATION ALONE IS NOT ENOUGH EITHER: after the swatches came back exact, the same tool called
     two ordinary buttons AA failures. Both were artifacts — one captured THROUGH a
     `#companion-backdrop` scrim (`element.screenshot()` grabs the box from the page, overlay
     included), the other captured near-uniform because it was not painting its text, which reads as
     ~1:1 and looks exactly like a real failure. Three hypotheses were wrong first (mid-animation,
     ancestor opacity, glyph antialiasing) and the answer only came from LOOKING at the captured PNG.
     So: calibrate; REFUSE to report when the subject is covered or the capture is uniform (say that,
     not a number); and never act on one instrument — the single contrast fix that was kept had CSS
     evidence (an explicit opacity multiplier), a measurement, and the number moving as predicted.
   - **A TEST THAT GREPS A CALL PASSES ON A WRONG ARGUMENT.** v581's undo asserted
     `/tombstoneRevoke\('totry_nutlog'/` and was fault-injected by DELETING the call — which is the
     one mutation a name-match is guaranteed to catch. The shipped bug was the argument: tombstones
     are keyed `syncIdOf(x)` = `'i'+x.id` and the code passed the raw `x.id`, so the restored meal
     was silently deleted again by the next pull, on every device, for 180 days. Fault-inject by
     CORRUPTING the argument, and prefer an assertion that EXECUTES (`H.load(['syncIdOf'])`, then
     assert `'i222' !== 222`). Two other v582 tests matched their own explanatory COMMENT and failed
     on correct code — strip comments before any ordering or absence check.
   - **Review the FIXES, not only the original code.** Measured again over v581 (7 Sep 2026): of 31
     findings that survived three diverse-lens refuters, **nine were introduced by v581 itself** —
     the commit whose entire subject was auditing the previous round. The yield does not fall off.
     Three adversarial rounds ran over v533–v544:
     round 1 (the rebuild) found 11 defects, round 2 (the fixes for round 1) found 9 — and one of
     those fixes had caused harm worse than the bug it repaired. A fix fails in four recognisable
     ways: it covers only the reported case, it moves the bug, it is gated in the wrong place, or its
     blast radius was never measured. Ask those four questions of every batch.
5. **Hold the soul.** Before adding anything, ask: does this serve the person (what's next / what's
   wrong / what can they do better)? If it only reports, it isn't done. Removing can be intention.
6. **Child safety, medical, crisis:** keep the bridge-to-real-help and crisis paths intact and
   prominent. Never weaken them.

## WHAT TO DO NEXT (in priority order)
0. **THE DAY KEY — FIXED AND MERGED (v607, 29 Sep 2026). Read `docs/DAY-KEY.md` before you touch a
   date.** `dayKeyOf()` is now the only way to spell a day: it builds from date PARTS, never a
   formatter, and `npm run engines` proves it in Chromium AND WebKit across all 365 days of 2026
   (old formatter 300/365 forked, dayKeyOf 0/365). Round 3 was reviewed before merging by DRIVING the
   migration on seven cases it had not chosen, on both engines — the round-2 refutation shape (two
   objects with different fields, where `sleep:7.5` on the LOSING side must survive `sleep:0` on the
   winner) now unions correctly, arrays dedupe by id, non-day keys are untouched, and every case is
   idempotent. **One deliberate loss remains and is not a bug:** when both spellings hold a real
   SCALAR, the device's own spelling wins and the other is discarded — "keep the copy the person is
   looking at". `Math.max` is refused for every store, and that generalises further than the commit
   argued: `setWaterCount()` ASSIGNS, so water can go down, and a max would restore water somebody
   removed. **The second divergence, re-measured 29 Sep 2026, is smaller than this file
   said and BIGGER than it said, in different ways.** Bigger: `{month:'short'}` differs on **three**
   months, not one — Chromium spells June, July and Sept where WebKit spells Jun, Jul and Sep
   (`npm run engines` reports it). Smaller: it is **display only**. The line about "38 sites compared
   by string equality" described the tree BEFORE v607; the day-key work moved every live comparison
   to `ts` first (`e.ts ? dayKeyOf(e.ts) === todayFull : e.date === todayStr`), and `13-body.js` even
   carries a `dayKeyNorm(e.date)` fallback behind that. What actually remains is (a) the same session
   reading "5 Sept 2026" on the PWA and "5 Sep 2026" in the App Store build, and (b) a bounded legacy
   path for entries written before `ts` existed. Not data loss.
   Two things that cost time and are written down so they do not cost it again. **The eight raw
   `toLocaleDateString('en-AU')===today` comparisons in `autoTickHabits` are DEAD** — there is a bare
   `return;` above them and `today` is never bound in that block, so it would throw if it ever ran.
   Any day-key sweep will surface them; they are not a finding. And **`toDateString()` is
   engine-stable** (0 of 12), which is what makes `36-google-health.js:143` safe — `npm run engines`
   now asserts that rather than assuming it, because it would be a silent defect if it changed.
   The original entry, kept because it explains what the fix is for:
   **THE DAY KEY WAS A LOCALE FORMATTER.**
   `new Date().toLocaleDateString('en-AU')` is a PERSISTED object key and is not a stable string:
   Chromium pads both fields, WebKit/iOS pads neither, and **300 of the 365 days of 2026 disagree**
   (only the 10th–31st of Oct/Nov/Dec match, which is why it reads as irreproducible). Nine
   cloud-synced stores are keyed by it. `totry_nutlog` doubles the day forever — each device reads
   only its own half, so a person sees "Nothing logged then" over food they logged, re-logs it, and
   every aggregate counts it twice, the AI brief included. `totry_trackers`, `totry_water` and the
   burn ledgers have no union branch at all and fall to last-write-wins: one device's whole map
   replaces the other's. It begins on the FIRST sync of a new device, not in an edge case. A second
   divergence rides with it — `{month:'short'}` is "Sept" in Chromium and "Sep" in WebKit, persisted
   into `.date` fields compared by string equality at 38 sites. Two rounds have been designed and
   implemented; round 2 was gate-green and REFUTED on data loss (it erased 2000ml of logged water and
   a whole tracker day, demonstrated by executing the real functions). The doc holds the census of all
   433 call sites bucketed, the design that survived, and the three corrections. **This is the
   biggest known defect in the app.**
1. **The App Store. "Cannot be automated" was doing a lot of work in this line, and most of it was
   wrong (10 Oct 2026).** It used to say the archive, the age rating, the App Privacy form and all
   four hardware tests were yours. Four of those had parts that were not:
   - **The archive is done and de-risked.** Build 9 (v611) archives AND exports to a
     distribution-signed `.ipa` locally with **no Apple credentials** — both App Store provisioning
     profiles are installed, so manual signing works offline. Verified out of the binary, never the
     log: `Apple Distribution: Alfred John (L4BD53PLVF)`, `get-task-allow = false`, 1.0 build 9,
     `PrivacyInfo.xcprivacy` present, **arm64 only**, web bundle v611 byte-identical to the repo. **There is no `.xcworkspace` to OPEN**
     (Capacitor SPM, not CocoaPods; `find` does return Xcode's own internal
     `App.xcodeproj/project.xcworkspace`, which is not what `-workspace` wants) — it is `-project`. The ARCHIVE is
     Development-signed with `get-task-allow = true`, which is normal because the export re-signs:
     **check the IPA, never the archive.** Only the upload click is left.
   - **Face ID and notification delivery are NOT hardware-only**, and were driven end to end on the
     real Capacitor build on a booted simulator — including the lock covering the journal on return
     and the off-switch demanding the same proof. Only **barcode scanning** (no camera) and
     **haptics** (no Taptic engine) genuinely need a phone. Two, not four.
     **The first notification run proved the wrong thing and is worth not repeating:** it leaned on a
     toast that is not gated on anything (`_scheduleNativeReminders` is called with no `await`) and on
     `simctl push`, which is a REMOTE payload this app has no path for. The real proof is the app's
     own scheduled LOCAL notification found in iOS's `DeliveredNotifications.plist` — a banner
     auto-dismisses, so a screenshot taken a minute later shows an empty home screen and reads exactly
     like a failure.
   - The build-9 archive in `~/Library/Developer/Xcode/Archives/2026-10-10/` is cut at **v611**,
     after the seven devotional false positives were closed. A v610 one briefly sat there and was
     moved out: **an archive that is merely stale becomes a hazard when the staleness is a crisis
     detector**, because nothing in Organizer tells you which build you are about to upload.
   - **The age rating and App Privacy answer sheets were stale**, and both docs claimed they needed
     no re-audit "because they describe behaviour, which has not changed". Behaviour changes
     underneath a doc that only describes it. Both are re-derived from the code and now gated.
   `SUBMIT-CHECKLIST.md` carries all of it, including the three ways the simulator test LIES (an
   enrollment that does not survive a reboot against a capability read at launch; a 2.5s grace
   window that makes a correct lock look broken; and `simctl push` showing nothing to a foreground
   app). `npm run preflight` checks the rest before you archive.
2. **DONE (31 Aug 2026) — both edge functions are deployed and verified live.** The food camera works:
   a meal estimate at `max_tokens: 700` now returns complete JSON in 2.75s, and the vision path in
   2.26s. FatSecret issues a token (the residual `invalid_client` was NOT our substring bug — this
   proxy speaks OAuth 2.0 and FatSecret's console offers you the OAuth 1.0 Consumer pair; you need the
   Client ID + Client Secret, and the secret is shown once at creation). ESV and USDA are live, and the
   `push_subscriptions` boolean migration turned out never to have been needed — the columns were
   already `text`/`jsonb`. **The AI chain is no longer one provider deep — five of six are VERIFIED
   LIVE (2 Sep 2026).** `body.prefer` now exists, so each link is probeable without touching any env
   var — that is what "make the four links behind gemini actually checkable" bought. Measured:
   gemini (gemini-2.5-flash), groq (openai/gpt-oss-120b), openrouter (nvidia/nemotron-3-super-120b),
   mistral (mistral-small-2603) and cloudflare (@cf/google/gemma-4-26b-a4b-it) each answered when
   preferred. `prefer:anthropic` fell through to gemini, which is correct — ANTHROPIC_API_KEY is unset
   and a missing key skips silently; it is the paid last resort behind five free ones. A Gemini outage
   no longer takes the food camera, the companion and the coach with it.
   See AI-PROXY-DEPLOY.md, which now opens with the measured results.

   <details><summary>The original entry, kept because its measurements explain the fix</summary>

   **Two edge functions needed redeploying — and this is what broke the food camera.** Measured
   against the LIVE proxy on 28 Aug 2026: the deployed `ai-proxy` does not set Gemini's
   `thinkingConfig.thinkingBudget: 0`, and 2.5 Flash spends the token budget reasoning before it
   writes anything — so at `max_tokens: 700` a meal estimate returned 74 characters ending mid-number
   and `JSON.parse` threw, every time, on a perfect connection. The app now compensates client-side
   (`api()` floors at 2000, the meal estimate sends 4000, the retry caps at 6000; the vision call went
   500 → 4000) and the local edge source has the cap on BOTH the text and vision paths. Groq is 404ing
   on a retired model id; OpenRouter is 429 on free-tier quota with all three ids still live. **Gemini
   is currently the only working link in the chain.** See AI-PROXY-DEPLOY.md, which now opens with all
   of this.
   The other fixes waiting in `supabase/functions/` and NOT live:
   `key-proxy` — the FatSecret `invalid_client` was our own substring bug (FATSECRET contains
   SECRET); `ai-proxy` — identity came from a client-supplied field, so the public anon key could
   spend someone else's quota. Also the `push_subscriptions` column types in AI-PROXY-DEPLOY.md
   (they were `boolean`; the app writes a time string and an array), with the migration written out.
   </details>
3. **The monolith split is FINISHED** — 42 modules, largest 4.9k lines (`03-person.js`), and
   `src/app/app.js` is down to 33 lines. Nothing is left to slice off the front. If you ever split
   a large module further, use `scripts/extract-prefix.js` and run `node scripts/build-index.js
   --verify` after each; it must print `identical`.
4. **The Feeling Door is live-tested and guarded.** All seven paths were clicked through to where
   they land — Train, a real-high sheet, guided breathing, the bridge to real help, the "name the
   thing you're avoiding" form, and brotherGuidance. `npm run panels` now fails if any path's primary
   button leads nowhere, which is how a path would rot: it still reads well and hands the person
   back to their phone.
5. **Units are real now (v529–v530).** Storage stays canonical — kilograms and metres — and only
   the two edges convert: `wFmt`/`wDelta`/`dispToKg` for body weight, `dFmt`/`mToDisp`/`dispToM` for
   distance, plus `syncWeightUnitLabels()` for the static labels. If you add a screen that shows a
   weight or a distance, go through those; a hardcoded `+'kg'` is how a lb user ends up reading
   someone else's body. Lifted load is deliberately still kg, and the timezone select is a deliberate
   no-op that says so in its own copy — do not "fix" either silently.
6. **SOUL-ARCHITECTURE.md has no TODOs left (v533–v540).** All eight are built and each is guarded by
   `npm run panels`, so the soul of a screen can no longer drift quietly:
   - GROW hands off card to card — "3 sessions, about 1,260 cal earned → fuel it" → "5 of 7 days
     fuelled → see what it did" → "-0.8kg — that is what the training and the fuel did"
   - THE COMPANION is a sheet, not a takeover: 549px for a short question with 347px of app behind it
   - THE FIGHT leads with what has been WON, and withholds "your longest run yet" from someone who
     has not actually beaten their previous run
   - MORNING is five steps under a dawn skin instead of 1913px of form; EVENING is seven under a dusk
     skin, grace-first, examen last
   - SOUL opens with stillness — a word from the person's own tradition, and none at all for someone
     secular
   - MONEY leads with what staying clean bought, once there is something to lead with
   - CALENDAR was a question, and the code answered it: the view is already in Today, the screen is
     only the editor
7. **The "reach out first" scheduled nudges are BUILT** — this entry said "then", and the code was
   already there. `scheduleReachOut()` (`src/app/02-native.js`) is called from five sites including
   boot, and it is not a sketch: it separates web from native (web cannot background-fire, so it shows
   the plan and deliberately logs nothing), only records a nudge that Notify.schedule actually
   confirmed, and serialises the confirmations on one chain so two of them cannot lose an entry.
   `reachOutSuggestion()` feeds the moment and the evening; `totry_reachouts` holds the history.
   **What is actually left is only the App Store** (1), and whatever its feedback turns up.

## Files in this handoff
- `index.html`, `sw.js` — the app.
- `SOUL-ARCHITECTURE.md` — the intention behind every page; the north star. READ THIS.
- `NATIVE-WRAPPER-GUIDE.md` — exact Capacitor steps.
- `PREMORTEM-WORLDCLASS.md` — evidence-grounded refinement criteria (clinical + product).
- `AI-PROXY-DEPLOY.md` — the edge function setup.
- `GO-LIVE.md`, `BUILD-BACKLOG.md`, `DEEP-PLANNING.md`, `RESTRUCTURE-PLAN.md` — history/context.

## The one test that matters
Not "is the code good." It's: **would the person open this when they feel something, instead of
doom-scrolling?** Build toward that. Everything else serves it.
