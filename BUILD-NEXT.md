# BUILD-NEXT — the list, to App Store submission

> Written 26 Oct 2026 at v655. Every item is either **MEASURED** (I ran it today and name the
> evidence) or **CLAIMED** (from the 35-agent competitive sweep, not yet verified by hand).
> Do not treat a CLAIMED item as true until it is driven — this repo's own record is that most
> "missing" features are already built.

---

## 0 · First, the thing that changes what this list is for

**There is no user feedback. All 169 rows are the test gate's own strings.** MEASURED:
169 = 44 empty + 125 matching the crisis suite's cried-wolf panel verbatim
("better off deadlifting twice a week" ×30, "i'm tired of living paycheck to paycheck" ×49,
"better off without medication" ×28, "i had to give up on life drawing" ×15,
"i want to kill myself" ×1, "my quads are going to hurt" ×1, "take my life and let it be" ×1).
`user_id` is NULL on all 169.

**And `app_events` is ~86% gate noise.** MEASURED: `boot_offline` = 48,527 events across
**47,409 distinct `anon_id`s** — 1.02 events each. That is panels' network-cut check opening a
fresh browser context per run, not a population. It is 48,527 of 56,750 total events.

So two of the three things the competitive document called decisive are unanswerable:
the feedback is ours, and the retention curve is drowned. **This is the top item on the list.**

---

## 1 · BLOCKERS — in the binary, or do not submit

| # | Item | Evidence | Est |
|---|---|---|---|
| **1.1** | **Stop the gate writing to production.** `npm run crisis` / `panels` INSERT into `feedback` and `app_events` on the live project — including suicide-disclosure test strings. Point the suites at a local/stub endpoint or gate every write on a test flag, then purge the 169 rows and the `boot_offline` noise. | MEASURED above | 2–3h |
| **1.2** | **13YARN + Suicide Call Back onto all four static crisis surfaces.** `grep -c "13YARN\|139276\|13 92 76" src/shell-head.html` → **0**, while `CRISIS_LINES` carries it. Sign-in screen dials `131114`, `1300224636`, `988`, `116123` only. An Aboriginal or Torres Strait Islander person who opens this app at their worst moment and does not sign in is shown four numbers and none is theirs. Add a coverage assertion of those blocks against `CRISIS_LINES`. | MEASURED | 1–2h |
| **1.3** | **Faith-swap `bridgeToRealHelp`.** `04-fight.js:1783`–`1800` hardcodes *"A priest — confession and a real conversation"* with **zero** `curFaith`/`faithOn`/`tr` in the whole function body. Its sibling `openRecoveryBridge` (`:1688`) **is** faith-aware. Half-applied: the fix reached one bridge and not the other, and the unfixed one has 7 callers (3 Feeling Door paths, the eating-disorder card, 3 fuel-plan fallbacks). | MEASURED | 1h |
| **1.4** | **Decide the streak/score question, then make the code match the copy.** `sc-total`/`sc-streak` ship in `shell-head.html`; `10-habits.js:33,36` ship trophies **"Unstoppable — 70%+ win rate"** and **"Faithful — 7 days clean"**; `14-nourish.js:5004` renders a flame + "N-day streak · keep it" with **no `nutGentle()` gate**, so the person who turned numbers off because counting hurt them still gets a flame. Ten-plus strings promise no streak/score/badge. A reviewer catches this in one screenshot, and it gates the listing copy. | MEASURED | 1h decide + 2h |
| **1.5** | **`_SHRINK[lv] is not a function`** — 4 distinct real users, 1 Oct 2026. `05-moment.js:971` declares `const _SHRINK = [`; `:979` indexes it. In one shared top-level scope with order-dependent `const`, this is the TDZ/ordering family (cf. the `ic()` calendar crash). Drive it, do not read it. | MEASURED (crash log) | 1–2h |
| **1.6** | **`Cannot set properties of null (setting 'value')`** — 5 **distinct** users on 25 Oct, the most recent live crash. NOT a dead id: the current bundle has 12 dead ids (baseline 40) and **0 dereferenced unguarded**. So the element exists in source and is absent from the DOM at call time — the `#feelingnow-why-input` class, which the id scan structurally cannot see. Find it, and add a check that can. | MEASURED (crash log) | 2–3h |
| **1.7** | **The inline-handler SyntaxError family** — ~10 real occurrences: *"Failed to read the 'onclick' property … missing ) after argument list"*, *"'onchange' … Unexpected token '<'"*, *"Failed to execute 'click' … Invalid or unexpected token"* at `#nourish`, `#money`, `#today`, `#home`. This is the documented *"the app never prints its own source"* class — interpolated content terminating its own attribute. `npm run panels` checks two shapes of it; these got through. | MEASURED (crash log) | 2–4h |
| **1.8** | **`d0` / `d2` / `g20` / `demo_f0_0 is not defined`** @ `#money` and `#nourish` — 16 occurrences, 4 Sep, real users. Inline handlers referencing generated identifiers that do not exist at click time. | MEASURED (crash log) | 1–2h |
| **1.9** | **Archive at v655, export, verify the IPA, upload, and START REVIEW.** App Store Connect holds builds 4, 5, 6, 8 (build 8 = v597, uploaded 9 Sep). **There is no record in this repo of a build ever being submitted for review.** Do NOT upload `ToTry-v643-build10.ipa` — 12 versions stale, predates the share-card fix. Verify the IPA not the archive: distribution cert, `get-task-allow=false`, arm64, `PrivacyInfo.xcprivacy`, bundle sha. | MEASURED (`preflight` = ready; CLAUDE.md) | 1h + gate |

## 2 · SHOULD — cheap, high value, worth the same binary

| # | Item | Evidence | Est |
|---|---|---|---|
| 2.1 | **`applyRecommendedSplit` discards the exercises it just generated.** `04-fight.js:309` keeps `{focus, routine:null}` while the preview two screens earlier renders them and `importTemplate` persists them correctly. Person reads six named exercises, taps Apply, gets a label — on the path whose empty state promises *"no guesswork."* | CLAIMED — verify first | 1 line + test |
| 2.2 | **Open Graph + meta description + `url:` on `navigator.share` + the URL on both share canvases + rewrite `manifest.json`'s description.** 7 meta tags, 0 og/twitter, 0 description, `<title>ToTry</title>`; the live URL appears once in all of `src/` (the Strava redirect). The app is un-shareable at the HTML level. | CLAIMED — cheap to check | 1h |
| 2.3 | **The GP row and the community row in `openRecoveryBridge` have empty URLs** — and your own copy calls a GP *"the most underrated door."* | CLAIMED | 30m |
| 2.4 | **`prefer` has zero call sites.** `03-person.js:1416` reads `if(opts.prefer) body.prefer = opts.prefer; // e.g. 'anthropic' for crisis SOS` and no surface passes it. A dead gate whose own comment names the crisis path. Either wire the SOS path to it or delete the comment. | CLAIMED | 1h |
| 2.5 | **Tighten the dead-id ratchet 40 → 12.** MEASURED: actual is 12. Its own comment says *"Tighten this number whenever it drops — a ratchet that only ever holds is a ceiling."* 28 free slots is 28 dead ids nobody will notice. | MEASURED | 10m |
| 2.6 | **Say `wovenDays()` out loud.** It renders only as `aria-hidden` SVG tie marks with no text — unreadable by a screen reader, unscreenshottable as a claim, and it is the one integer no single-feature app can compute. | CLAIMED | 1h |

## 3 · POST-SUBMIT — build while review runs

1. **Refusal assertions in `core.test.js`**: no `totry_score`; release count stays gated at ≥3; `metricsOff()` gates all three analytics sites; `wovenWeek` stays per-day; `companionThreshold` keeps refusing readiness. **Every soul mechanic in this codebase is held by a comment, not an assertion — the least defended code in the repo, exactly where pace pressure is highest. That is how the score panel happened.**
2. ~~Move the fast-season card to Soul and render `mercy` and `ask` (currently never rendered)~~ —
   **DONE v661, and the claim was WRONG.** They were already rendered: one consumer,
   `_renderNourishCare`, which only appears when `_nourishConcern()` has flagged 3+ low days. So the
   line naming who a tradition has never bound reached only somebody the app had already decided to
   worry about, never the person deciding whether to fast. Now a `row()` on the season card itself,
   after The fight. All six seasons carry `mercy`; only four carry an `ask`, and the hand-off is gated
   on `s.ask` rather than a tradition list. Driven over all six; six fault injections.
3. ~~Giving into `getLifeState()`~~ — **DONE v661.** Measured: 0 of 7 giving words in either
   `getLifeState()` or `lifeStateBrief()`. Now one `givingState()` on both. The quiet flag is the
   whole design — `p.quiet` hides amounts on the person's own screen and each tradition's reason is
   in the registry (Qur'an 2:271 for islam), so the brief carries the COUNT, never a sum, and tells
   the model it does not have the figures and must not ask. Zakat hawl dates stay, `due` goes. Their
   own word per tradition (sadaqah/alms/dāna/gift); zakat only for islam. Eight fault injections.
4. A fourth `brotherSpeaks` kind for a crossed budget line (threshold already computed, currently answered with a CSS class).
5. The impulse-hold pot onto the balance sheet.
6. ~~`toLocaleString` on null — 10 real occurrences, Sep~~ — **TRIAGED AND DELIBERATELY NOT SWEPT
   (27 Oct).** Measured against the live table: 2 distinct people, both on 7 Sep, at two adjacent
   lines, 5 times in 2 seconds (a repeated render) — and **not once in the 7 weeks since**, across
   ~90 version bumps. v586–v596 landed on 7–8 Sep. The bundle has **121** `toLocaleString` sites and
   almost all are already behind a truthiness check (`if(s.steps)`, `saved>0`, `if(t.tonnage7)`),
   which is what catches null; no specific unguarded site reproduces. Guarding all 121 is the blanket
   sweep this repo fails builds over. Re-open it if it recurs — every event now carries its build
   (v660), so the next occurrence will say which bundle it came from, which is what made the previous
   three families cost line-number archaeology.

   **Crash-family status, all dated against the live `app_events` table (27 Oct):**
   `Notification` (~148 distinct people, the largest by far) last seen **17 Aug**;
   `reading 'field'` (7 people) **19 Aug only**, and `examenStepFor`'s falsy pass-through —
   `if(!step) return step` — landed **20 Aug in v521**, which is why it is one day wide;
   `undefined is not iterable` (3 people) **30 Aug only**, v567–v571 landed 30–31 Aug;
   `toLocaleString` (2 people) **7 Sep only**; `d0`/`d2`/`demo_f0_0` **4 Sep only**;
   `_SHRINK[lv]` (4 people) **1 Oct only**, fixed v660; the inline-handler SyntaxError family
   Aug–Sep, fixed v659; `setting 'value'` (5 people) **25 Oct**, fixed v659 — shipped 27 Oct, so not
   yet confirmable by elapsed time. **No family has recurred after its fix.**
7. ~~Verify `URL.revokeObjectURL is not a function`~~ — **CONFIRMED NOT FIXED, AND FIXED v661.** The
   assumed cause was wrong: `git log -S"const URL"` shows no source shadow has ever existed. The real
   cause is that an inline handler is compiled with a scope chain of element → form → **document** →
   window, and `document.URL` is a STRING — every reported occurrence is at `:1`, an inline attribute.
   Driven in both engines; WebKit's message is byte-identical to production. **And it was a DEAD
   FEATURE, not a leak**: the throw killed the rest of `closeModal(this);URL.revoke…;setShareTheme(…);
   createShareCard(…)`, so the share card's "Switch to light background" closed the sheet and did
   nothing. 3 inline sites prefixed with `window.`; the other 6 are ordinary scope and stay bare.
   Whole class censused (22 document-owned names over every `on*=` attribute) and asserted at 0.
8. Qibla (~3–4h; both hard inputs already ship — `geoCoarse()` ±0.01°, plist string present).
9. GLP-1 / pregnancy / breastfeeding as a third branch on the existing sex fork, reaching **both** `_nourishConcern` and `_gentleCounsel`. Reframe, never silence.
10. Print stylesheet over the last 12 weekly syntheses.
11. Nutrition-label scan on a barcode miss (4-file change incl. the `image_base64` ratchet + both privacy copies).

## 4 · REFUSE — and write the refusal down as a test

1. **Any whole-person score, index or per-area rating.** Four such designs were already killed on measurement. This refusal is **not currently credible** (see 1.4).
2. **Any social graph** — feed, follow, leaderboard, partner reports. `totry_v`, `totry_journal` and `totry_prayers` sit in the same `SYNC_KEYS` set as the budget; any account-shaped share exposes the Fight tab with the finances. Shared household money is refused on **safety**, not effort.
3. **Voice input at the Feeling Door / Companion / journal** until the detector is measured against punctuation-free transcripts. CLAIMED but independently reproduced in the sweep: **46 of 434 real disclosures (10.6%) return null** as speech-to-text delivers them, because every clause-bounded pattern needs `.!?`, a comma, a newline or `$`. Losses are the highest-acuity rows — plan+means, an explicit ask for help, and nine conditional-frame burdensomeness disclosures. The plist has no `NSMicrophoneUsageDescription`, so the native build cannot even ask yet. **Good.**
4. **AI grading of devotional practice.** It would be the first surface where a model scores an act of devotion.
5. **Machine-translating the devotional prose.** `READING_PLANS` is 95 hand-authored day objects in five registers under a header saying *"Not Christian plans with the deity swapped."*
6. **The warden-shaped blocker.** Build the pre-commitment the app already prescribes and cannot honour (`04-fight.js:971`) — self-set, time-bounded, exitable in ~90 seconds, nobody notified. The 2am self must always get through.
7. **Giving as a marketplace.** The person already types the recipient (`15-giving.js:264`) and the app discards it. Link *their* named destination; never name one they did not.

---

## 5 · Two strategic facts that should shape the listing

- **Google ate five of eight fronts in Australia in Feb 2026.** Fitbit's Gemini coach: body, training, sleep, nutrition, cycle, "mental wellbeing", reachable without Premium, with cross-session memory the Companion lacks. **Stop competing on health depth; demote Nourish and Train to inputs that feed `_fightFuelLink` and the brief.** Positioning, not deletion.
- **Crisis handling became regulated.** Eleven states, twelve laws in 2026. California **SB 243** (live 1 Jan 2026) covers companion chatbots regardless of mental-health claims, reaches operators serving California users wherever they sit, requires published crisis protocols, and permits suit for **$1,000 per violation**; no small-operator or free-app exemption found. CLAIMED — **get this checked by a person, not by me or an agent.** It makes the crisis layer an asset *and* prices 57 doors maintained by one person as a liability.

---

## Order of attack

**Day 1** — 1.1 (stop the pollution, purge), then 1.2, 1.3 (safety; these go first because App Review reads the un-signed-in screen and a binary freezes them for the length of review).
**Day 2** — 1.5, 1.6, 1.7, 1.8 (the four real crash families, driven in a browser, not read).
**Day 3** — 1.4 decision + implementation, then 2.1–2.6.
**Day 4** — one full gate run (`build:index && build:www && sync` FIRST — three of five suites read `../www`), archive, verify the IPA, upload, **submit for review**.

Then section 3 while review runs.

---

## SUBMISSION BLOCKER, found 28 Oct 2026 at v667 — THE RELEASE SCREEN IS UNREADABLE IN LIGHT MODE

**MEASURED, calibrated, on the real functions in a real browser.** Three overlays paint their own
hardcoded dark gradient and then take their ink from the theme. The default appearance is **System**,
so every person whose phone is in Light mode has been getting near-blank screens:

| overlay | `--tx` resolves to | worst visible text | |
|---|---|---|---|
| `theRelease` (`05-moment.js:490`, `.totry-release-ov`) | `#000000` | **1.17:1** | **FAIL** |
| `_startTwoMin` (`05-moment.js:1024`, `.tm-overlay`) | `#000000` | **1.17:1** (the 2:00 clock) | **FAIL** |
| `openBreath` (`05-moment.js:1602`, `.breath-overlay`) | `#F0EDE6` | 5.05:1 | PASS |

In dark the same Release headline measures **17.99:1**. The breath overlay passing is the
CALIBRATION — it proves the probe reads the cascade rather than the inline styles, so the two
failures are real.

**Reach.** `theRelease` is the terminal frame of every Feeling Door path, the SOS, every one of the
eight toolkit lessons, the letting-go flow, the two-minute timer and the spend hold. The sentence
that goes invisible is *"You came here instead."* — and then *"Go well."* `_startTwoMin` is the
body-doubling timer, where the thing that disappears is the countdown it exists to show.

**THE FIX ALREADY EXISTS AND WAS HALF-APPLIED.** `src/shell-head.html:1538` re-declares the dark
tokens for exactly this reason — `#rosary-overlay,.breath-overlay{--tx:#F0EDE6;--tx2:#C9C4BA;…}` —
and the two overlays added later were never added to the selector. One line:

```css
#rosary-overlay,.breath-overlay,.totry-release-ov,.tm-overlay{ … }
```

**And that existing rule carries a latent bug of its own:** `--go:var(--go)` is a self-reference, so
per spec it is invalid at computed-value time and the property falls back to the INHERITED value —
the light-theme `#0062CC`. Same for `--go-bg` and `--go-bd`. Nothing in the breath overlay paints
text with `--go`, which is why it has never shown; `.tm-overlay`'s eyebrow ("Starting together")
does, so it must be given the real dark values (`#409CFF`, `rgba(64,156,255,0.16)`,
`rgba(64,156,255,0.42)`) in the same change.

**Needs:** the selector fix, the `--go` self-reference fix, a test that measures ink-on-a-self-dark-
overlay in the LIGHT appearance (the contrast matrix has never asked this — its recorded blind spot
is ink on an ACCENT, and this is the third kind: ink on a surface that supplies its own ground),
fault-injected by removing a class from the selector. Then bump, build, sync, full gate.

**Why no check caught it:** `craft-audit` and the contrast matrix both read tokens against
BACKGROUND tokens. These overlays have no background token — they have a literal gradient in an
inline style, so there was nothing for either instrument to pair the ink with.

---

## SECOND BLOCKER, found 28 Oct 2026 at v667 — "HIDE NUMBERS" LEAKS CALORIES IN FOOD SEARCH

**MEASURED on the local typeahead, no network, calibrated.** With gentle mode ON
(`nutGentle() === true`, `applyNutGentle()` called), searching "chicken" renders:

```
281 cal · P: 52.7g · C: 0g · F: 6.1g     1 breast (170g)
188 cal · P: 23.4g · C: 0g · F: 9.8g     1 thigh (90g)
```

Byte-identical to the rows with gentle mode OFF. 2 of 2 rows print calories in both states. The
gentle-OFF pass is the calibration: rows do render, so the probe is sound.

**Cause:** `_makeFoodResultRow(food)` (`src/app/14-nourish.js:763`) is the SHARED SINK for every
search hit and contains **zero** references to `nutGentle`. `applyNutGentle()` hides a fixed list of
static element ids and `#nut-search-results` is not one of them.

**It is the half-applied shape, and the app already says so in its own words.** `_renderPhotoMeal`
(`14-nourish.js:1438`), two functions away, renders into the SAME container, DOES gate on
`const _pmG = nutGentle()`, and carries a comment explaining exactly this: *"a numbers off promise
that leaks a red over-budget figure two cards down is worse than no promise at all."* The camera
path was fixed; the search path — the one anybody logging food uses first — was not.

**Why it matters more than it looks.** The switch's own copy is *"Turn the numbers off — log food
without seeing calories"*, and the reason it exists is the person who cannot see a calorie figure
without losing the day to it. Searching for a food is the first thing they do.

**Fix:** gate the macro line in `_makeFoodResultRow` the way `_renderPhotoMeal` gates its own, keep
the food name, the serving and the "✓ Common" badge (the row must still do its job). Then sweep the
other renderers into `#nut-search-results` rather than fixing this one — `nutSearchTypeahead`,
`searchFood`'s own result path, Recent foods and My meals all need asking, because a sink fixed in
one place is how this defect was created.

**Needs a test that asserts the ABSENCE of a digit-plus-cal pattern in the rendered rows with gentle
on**, fault-injected by removing the guard. The existing v660 gentle-mode assertions hold the
refusals (no streak) and never asked whether the numbers actually stay hidden.

---

## FOURTH DEFECT, found 28 Oct 2026 at v667 — THE LONELY PATH SHOWED A TEMPLATE PLACEHOLDER

**FIXED.** All three `_REACH_ACTIVITY` prompts carry a literal `{name}`. `renderReachOutCard`
substituted it; **`_reachOneNow` did not** — it wrote `_escFew(s.prompt)` straight into the markup,
and `_escFew` escapes only `&<>"'`, so the braces survived. Driven on the real renderer, the sheet
read:

> send **{name}** something that made you think of them — a clip, a track, a memory.

**Reach.** `leansActivity` is `day % 2 === 0` for a male user and `day % 3 === 0` for everyone else,
so this was **half of all days for half the population**. And the surface is the one reached from the
LONELY branch of the HALT check *mid-urge* — the single screen whose whole job is handing somebody
the sentence to send a real person. It showed them the template instead.

**MY FIRST FIX WAS WORSE THAN THE DEFECT, AND ONLY DRIVING IT FOUND THAT.** I put the helper
immediately above the card's own use of it — which is **inside** `renderReachOutCard`'s body, because
a `src/app` module may begin mid-function and an insert is nested unless its brace depth is checked.
That made it function-scoped, so the cross-module caller threw `ReferenceError` and the sheet did not
render **at all**. The probe said `ReferenceError: reachFillName is not defined`; a source read would
have said the fix was in. It is declared at verified brace depth 0 now, and a test asserts that
depth, because it is the trap rather than a style preference.

**And `www/` was stale for the first probe run** — `build:index` without `build:www`, the documented
trap. The tell was the calibration and the shipped run returning *identical* output.

One `reachFillName()` serves all three render paths now (both card branches and the sheet), the test
forbids any bare `_escFew(s.prompt)` outright rather than listing exceptions, and five fault
injections each reproduce a real failure: the bare-escape bypass, the nesting, a dropped `/g`, a
neutered substitution, and the token being removed from the prompts so the filler guards nothing.


---

# ▶▶ STATUS AFTER THE 29 Oct 2026 AUDIT — v669

**Everything in sections 1 and 2 above was re-verified against v668 by fifteen agents, each with an
adversarial refuter on any DONE verdict.** The headline is the one this repo keeps re-learning:
**most of the list was already built.** Seven items came back DONE; two of those were then REFUTED
by their own refuter, which is exactly why they ran.

## Closed — verified, not assumed

| # | Was | Verified |
|---|---|---|
| 1.1 | gate writes to production | **DONE** — 373 writes intercepted in today's run; 0 new `feedback` rows since 26 Oct |
| 1.2 | 13YARN missing from static crisis surfaces | **DONE at v656** — all four surfaces dial AND name it, driven on both engines at three phone sizes, held by a test fault-injected six ways |
| 1.5 | `_SHRINK[lv] is not a function` | **DONE at v658** — 22 of 22 adversarial levels render, 0 crash |
| 1.8 | `d0` / `demo_f0_0` | **DONE at v576 + v659** |
| 1.9 | archive, verify, upload | **DONE except the two clicks**, which are the owner's |
| 2.4 | `prefer` has no call sites | **DONE at v660** — the comment WAS the defect; deleted and replaced with a measured refusal |
| 2.6 | `wovenDays()` never said out loud | **STALE CLAIM** — it has rendered as 52px real text since v646, *ten versions before this list was written* |

## Fixed in this pass (v669)

| # | What | Measured |
|---|---|---|
| 1.6 | the gate check **could not fail** — `left === 0` against a bundle holding 8 sites, both `\'` and `&apos;` defeating its regex | 8 sites routed through `closeOpenSheets()`; the check builds its quote class from all five escapings and calibrates on three spellings |
| 1.7 | the inline-handler family was **not closed** — 4 sites hand-escaping typed text into `on*` attributes | a vice named `porn "just once"` broke the tag open and killed the button; `savePostUrge` is a crisis door, so its gate never ran |
| 1.3 | `safetyNote()` named "their priest or imam" to **all five traditions** | FAITHS gained `guide`; re-measured live — band A 0 of 7 flinches, band C 3 of 3 with verified numbers |
| 1.4 | a **Streak tile reading 0** to everyone promised "no streak, no line" | routed through `viceIsAbstinence()`; driven across all three modes |
| 2.1 | the split save never repainted the card above it | its sibling already did, under a comment saying why |
| 2.2 | the share **image** carried no URL | both 1080x1080 canvases now draw it, from one shared constant; meta tags + manifest now gated |
| 2.3 | two of three GP rows led nowhere | one `HEALTH_FINDER` serves all three; the test asks about EVERY GP row |
| X.1 | faith level **"light" ignored by the live SOS** and the Feeling Door practice | light reads as secular, not as nothing; driven 5 traditions x 2 levels |
| X.3 | a comment claiming a call site that does not exist | corrected; the comment is now an artefact the gate compares |
| X.2 | the type scale **never scaled** | 0.9% -> **51.7%** of rendered text; layout re-measured at the 1.4 clamp |

## Still open, named rather than swept

- **THE BMI LABEL USES ADULT BANDS AND THE APP NEVER ASKS AGE.** `13-body.js:1043` renders
  `'BMI ' + bmi + ' · ' + (bmi<18.5?'Underweight':bmi<25?'Healthy':bmi<30?'Overweight':'Obese')`.
  Measured: there is no `totry_age`, `totry_dob` or birth year anywhere in the bundle, so the app
  cannot know it is talking to a fifteen-year-old — for whom those cutoffs are simply the wrong
  instrument (children are read on percentiles) — or to somebody muscular, for whom "Obese" is
  arithmetic rather than information. The line already refuses to guess a HEIGHT, under a comment
  explaining that a categorical judgement computed from an invented number "is exactly the kind of
  number a person believes". The same argument reaches age, and the fix is not obvious: a caveat in
  the footnote, an age question in Settings → About you, or dropping the categorical word and
  keeping the number. **Left to the owner on purpose** — how this app speaks about a person's body
  is a soul decision, and the one surface where a well-meant label does the most harm. (1.4.1
  adjacent; two refuters put it at medium and low, and four "not medical advice" disclaimers ship.)
- **NOTHING ASKS ABOUT PREGNANCY BEFORE A 500-CALORIE DEFICIT.** Same family, same reason for not
  patching it blind: the guard would have to be a question, and where that question is asked is a
  product decision.

- **THERE IS NO AI OFF-SWITCH, AND THE APP SENDS WITHOUT BEING ASKED. This is the one real product
  decision the 30 Oct audit surfaced, and it is the owner's.** Measured by driving the shipping
  bundle in chromium AND webkit with every outbound request captured and fulfilled locally, 20s idle,
  zero interaction, three calibrations passing: **two unprompted `ai-proxy` POSTs fire on launch**
  (`showAIMorningSentence` at `25-soul.js:621` and `generateWeeklySynthesis` at `24-review.js:140`,
  both reached unconditionally from `go('home')`). Between them, with no tap, they send `totry_why`
  verbatim, the identity sentence, every vice name with its clean-day count, body weight, calories
  and protein, debt remaining, money in and out, average day rating, sleep (HealthKit-sourced
  included) and **up to four journal entries word for word**. The `messages` array of each holds one
  app-authored entry — there is no message from the person at all.
  v670 made the POLICY true about this, in all three copies plus the Info.plist string. What it did
  not do is give anybody a way to decline: greps for `totry_ai_off`, `aiDisabled`, `totry_no_ai` and
  `disableAI` all return zero, so the only way out is not opening the app.
  Three options, in the order I would take them:
  1. **An off-switch**, modelled on `metricsOff()` — one key, one Settings row, asked at every
     `api()` call site. Additive, removes nothing from anyone who wants it, and it is the answer
     most consistent with "grace over shame, presence over measurement".
  2. **Move both calls behind a tap.** `showAIMorningSentence` already has a deliberate control
     (`refreshAIMorning`, `25-soul.js:703`), so the card could offer "write today's sentence"
     instead of firing on render; `generateWeeklySynthesis` already gates its MODAL on Sunday and
     could gate its GENERATION the same way. This is the strictest reading of the soul document's
     "quiet by default... never overbearing" and it costs the thing the owner likes most about the
     Today card.
  3. **Leave it, now that the copy is honest.** Defensible — it is disclosed, and it is what makes
     the morning sentence possible at all — but it means a person who reads the policy and objects
     has no lever.
  Not taken unilaterally: 1 and 2 both change the product, and this close to a submission that is
  the owner's call, not mine.

- **~48% of rendered text is still raw px literals**, mostly inline styles in `src/app/*.js`. Bucket
  at a time, with a reach measurement per bucket. Not a sweep.
- **Per-tradition context pools for the verse toast.** The four non-Christian banks are flat
  `{t, r}` with no context tags, so the `context` argument is accepted and discarded. Giving them
  real per-moment pools is content work across four scriptures — it belongs to somebody who can
  judge the lines.
- **The slip verse.** `loss` is a declared pool of twelve grace-first verses with no caller. The app
  speaks scripture at a win, a PR, a fast and an answered prayer and says nothing at the one moment
  grace is the whole point. That asymmetry is a DECISION, and a verse arriving unbidden on the worst
  tap of somebody's week could as easily be an interruption as a presence.
- **The purge.** 169 junk `feedback` rows and 49,097 `boot_offline` rows still sit on the live
  project. All 169 are verified gate strings — nine distinct, zero with a real `user_id` — so **no
  real person's disclosure is sitting unanswered**. Destructive, production, and the owner's call.
- **The orb's breathing halo**, hidden globally by the 16 Sep flat pass. The flat FILL is correct
  and load-bearing (a gradient to `--pu` would fail AA on the glyph); the halo is a brand decision.

## And the crash log says something the old list did not

Measured against `app_events`, not recalled. **`Can't find variable: Notification` hit 163 devices**
— the top variant arriving at `?utm_source=ig&utm_medium=social`, i.e. Instagram traffic — and was
**fixed on 18-19 Aug**, which is the date of the last such error. Two more large ones
(`reading 'field'`, 10 devices; `toLocaleString`, 3) are likewise long gone. Of the four crash
"blockers" on the list, only **1.6's `setting 'value'`** was still occurring at all (5 devices in 45
days), and its live cause was already fixed at v659.

**There ARE real people using this app.** 32 devices with 5+ events across 3+ kinds, 26 of them on
two or more separate days, across 43 event kinds including `morning_done`, `evening_done`,
`fight_won`, `two_min_done`, `release` and `letgo_named`, most recently 27 Oct. Section 0's "there
is no user feedback" is true of the `feedback` TABLE and false of `app_events`. Some of those
devices are certainly the owner's own; the behaviour is real either way.
