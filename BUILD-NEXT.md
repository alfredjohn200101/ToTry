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
2. Move the fast-season card to Soul and render `mercy` and `ask` (the two fields no competitor has, currently never rendered).
3. Giving into `getLifeState()` — the coach does not currently know whether this person gives or owes zakat.
4. A fourth `brotherSpeaks` kind for a crossed budget line (threshold already computed, currently answered with a CSS class).
5. The impulse-hold pot onto the balance sheet.
6. `toLocaleString` on null — 10 real occurrences, Sep.
7. Verify `URL.revokeObjectURL is not a function` is actually fixed — 5 occurrences Sep incl. **`capacitor://localhost`, the native build**; 9 unguarded call sites remain; no `URL` shadow in current source, so it looks resolved. Confirm, do not assume.
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
