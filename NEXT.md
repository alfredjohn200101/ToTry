# NEXT — the build list

Where To Try stands at **v402**, and what's actually left. Every item below was **verified absent in
`index.html`** (not guessed). Ranked by impact × vision-fit ÷ effort.

Research behind each item is in `RESEARCH-BACKLOG.md`. Ready-to-apply specs live in `specs/`.

---

## 🟢 v401–v402: found by running the app natively for the first time

Two classes of problem that no amount of browser testing could have surfaced.

**PWA copy inside the App Store build.** The native app displayed *"Install To Try on your iPhone —
1. Tap the Share button ↗ at the bottom of Safari"*, in an app with no Safari and no Share button. The
reminder settings had the same trap. Root cause worth remembering: **a Capacitor WKWebView is not
"standalone"** — `display-mode` reports `browser` and `navigator.standalone` is a Safari-only property
that is `undefined` there — while `isIOSSafari()` *is* true, because the user agent really does say
iPhone + WebKit. So every check of the form "is this an installed app?" answered **false** in the one
place it most needed to answer true.

`isStandalone()` now returns true for a native build, with `isNativeApp()` kept separate for the cases
that genuinely mean "has native APIs" (HealthKit, local notifications). That also restored something
native users were silently missing: the daily "good to see you back" greeting was gated on the same
check. Guarded by a test that stubs a WKWebView-shaped `window`.

Already correct, checked while sweeping: `enablePushReminders()` and `renderPushSettings()` both branch
on native before the web-only paths, the Health card shows honest "arrives with the app" copy on web
instead of a dead button, and `#beta-web-note` is hidden natively.

**Typography.** The same idea — a number that matters — was drawn in three font families at weights
300–700 across eight sizes. Standardised on Outfit 500 (the body face) with **tabular figures**, so a
streak going 61 → 62 → 63 stops changing width between renders. The urge-surf countdown and the rest
timer stay monospace, because they tick every second and must not reflow.

The launch screen was still Capacitor's stock placeholder — white, with the Capacitor logo, on a
`systemBackgroundColor` that goes white in light mode. Replaced with the app's own `#0a0a0f` and the
wordmark.

Tests: 298 → **305**.

---

## 🟢 v397–v400: the soul, money, companion and data-custody sweep

Twenty findings confirmed by adversarial verification; twenty fixed across v397–v400, each re-verified
by reading the code and running it in the browser.

**Safety and privacy**

| Fixed | What it did to a person |
|---|---|
| The crisis gate held for **one turn** | The verbatim disclosure was stored in `_compHistory` six lines under a comment saying it must never reach the LLM — so the next thing they typed carried it to whichever provider answered. Redacted in history at both gates; they still see their own words |
| The gate cried wolf on leg day | A bare `'going to kill'` entry made *"this workout is going to kill me"* return `suicide`. It also missed `kms`, `unalive` and "isn't worth living". Both directions now tested |
| Struggle words were **published** | A research path wrote `'__protocol__' + <the person's own words>` into `shared_library`, readable by any signed-in user, filed as an *exercise*. It also made the App Store answer "nothing a user writes is visible to any other user" false |
| Sign out destroyed every progress photo | The confirm said "Your data is saved" then wiped photos (which by policy never leave the device) and cycle data. Now flushes first and names what cannot come back |
| "Account deleted" was unverified | supabase-js returns `{error}` on an RLS refusal instead of throwing, and it was discarded. Now checked; a refusal tells the person the truth |
| The photo purge was a permanent no-op | It queried a `data` column that does not exist (the table is one row per key), then set its "done" flag anyway so it never retried |

**Wrong numbers**

| Fixed | What it did |
|---|---|
| The debt-free date, a fencepost | `n` payments span `n-1` gaps but cover `n` periods. Six $500 payments read as $608/month; **two** payments read as double. The freedom date arrived before the money, and it muted the "interest is outrunning your payments" warning |
| Detected subscriptions | The detector emits `week`/`year`, the converter tested `weekly`/`annual` — a $10/week sub counted as $10/month (4.3× low), a $120/year one as $120/month (12× high) |
| Category budgets | Keyed to `Food`/`Entertainment` while the bank importer labels rows `Groceries`/`Eating out`/`Subscriptions`. A Food budget read **$0 spent** however much you spent on food |
| Zakat "cash & savings" | Read `usaS`/`indiaS`, whose inputs no longer exist in the markup and whose updater was never called — permanently $0 while the modal said it was filled in from tracked data. Now reads the savings goals |
| Journal win counts | `todayWins = lifetime − ls('totry_wins_yesterday')`, and that key has **zero write sites**. Every entry was stamped with the lifetime total as if it were that day's |

**Multi-faith** — the load-bearing surface

The `ECHO_OK` rule governed only what the AI was *told*. A static hub section, "Common ground — the same
struggle, across every path", was shown to every tradition, so a Muslim user was offered a card about how
Lent and Navratri hold the same struggle. The fasting card listed all four seasons to everyone, including
someone who had chosen no religion.

The daily-verse cache was keyed by date but **not tradition**, and the banks differ in size (Christianity
44 → Hindu 14). Choosing a faith path mid-day handed the smaller bank an index from the larger one;
`showV()` dereferenced `undefined`, and at boot that call is not inside a `try`, so `initApp()` died there
— the sobriety clock, milestones and the front-door check-in silently never ran for the rest of that day.

**Interventions are now per tradition, not a swapped phrase.** The "I'm feeling it right now" screen used
to hand everyone the Jesus Prayer. Each tradition now gets its own real in-the-moment practice — the
name, the words, the posture, the count — with an honest `why` (a real mechanism where the claim is
clinical, named as the tradition's own teaching where it is not):

- **Christianity** the Jesus Prayer on the out-breath, hand on heart, three times
- **Islam** taʿawwudh then istighfār ×3, then change posture (standing → sit → lie), wuḍūʾ if you can
- **Hinduism** japa eleven times on the breath, then watching as the witness (sākṣī)
- **Buddhism** note it aloud, three breaths, watch it as anicca
- **Secular** urge surfing with the double-inhale long-exhale — no religious framing at all

The examen's closing screen and toast were Psalm 139 and "God walked with you today" for everyone; both
are per-tradition now. `_researchProtocol`'s prompt hardcoded "AND Christian faith"; it uses the person's
tradition.

**One week definition.** Two separate bugs came from week stamps disagreeing with the app's Monday→Sunday
week: habit auto-tick wrote last week's activity into *this* week's future slots, and one-off calendar
events vanished every Saturday and Sunday because that stamp rolled on Saturday. There is now a single
Monday-anchored stamp, and days before Monday render as "no record" rather than as misses.

Also: the coach never received the morning ritual (`completeMorning` writes `"Tue, 11 Aug"`,
`buildCtx` compared `"11/08/2026"`); a finished rosary re-armed its own resume pointer, so a second
rosary the same day started at the closing prayer; prayer times never read the saved city, so a Muslim
without geolocation retyped it every visit.

**⚠️ ACTION FOR YOU (Supabase dashboard, not code):** `feedback` and `push_subscriptions` need `DELETE`
policies. Account deletion now verifies its deletes, so without those policies it will correctly tell the
person their data is still on the server.

Tests: 215 → **298**.

---

## 🟢 v375–v396: data-loss and dead-path sweep (all verified live, not just parse-checked)

Two systemic bug classes, each found by asking a class question rather than checking one instance.

**Caps that disagreed with themselves.** Five keys were capped at different lengths at different write
sites, so the smallest cap won the moment its path ran and the difference was gone forever. The two that
would have bitten: importing a year from Hevy (1000 sessions) then finishing one workout destroyed 636 of
them; importing a bank CSV then logging one coffee deleted 500 transactions and the subscription
detector's evidence with it. Now one `_capWorkouts()` plus a ratchet test that fails the build if any key
ever disagrees with itself again — it caught `totry_transactions` on its first run, after my own grep
missed it.

**Dead and lying paths** (v396, from an adversarial sweep of the flows never driven end to end):

| Fixed | What it did to a person |
|---|---|
| Hevy routine "Start →" | Inert for every Hevy user — `JSON.stringify` broke the onclick attribute. It also matched on the wrong id field, so it would have started the *first* routine, not the tapped one |
| Onboarding vices had no `startDate` | "0 days clean" forever, no live clock, no Recovery Timeline — doing *more* setup left you worse off than the quick route. Backfilled, so anyone stuck is healed on next open |
| In-app sessions branded HEVY | Your own workout was credited to Hevy and the modal told you to go edit it there — a claim the app cannot keep |
| (+) on a food search result | Logged per-100g as "1 serving": ~535 cal for a 25g bar where tapping the row logged ~134 |
| Repeat-a-day | Previewed the viewed day, committed the day before *today* — wrong food, extra items silently dropped |
| Reach-out tap payload | Dropped, so the knock before someone's hardest hour opened the last tab instead of the Feeling Door, and the strongest receptivity signal was unreachable |
| Cancelled reach-outs | Stayed in the log, burned the 3-a-week ceiling, then stood the channel down 14 days blaming the user for messages never sent |
| Habit ring never cleared | The home "last 7 days" grid became a loop of old ticks — a fortnight's absence still showed a full green week |
| 8 durable keys never synced | Including `totry_releases`, the anti-engagement metric the app *shows* — reset to zero on a new phone |

One fix was written and thrown away: stamping the habit ring with the existing `_currentWeekStamp()` is a
**Sunday**-start week number while the ring runs Monday→Sunday, so it would have wiped Mon–Sat's real
ticks every Sunday morning. `_habitWeekStamp()` identifies a week by its Monday; tested at the boundary.

`getStreak()` still cannot see past Monday — the store is seven weekday slots, so a real multi-week streak
needs a date-keyed history (not attempted this close to submission). Its two live consumers now say "this
week" and the AI is told plainly it is not an all-time streak. Both home call sites were already dead ids.

Tests: 58 → **215**.

---

## 🟢 PRE-BUILD AUDIT: 9 blockers + 26 polish findings closed (v358–v374)

The audit found nine things that had to be fixed before an App Store build, because an App Store build
can't be hot-fixed the way a Pages deploy can. All nine are closed and each was verified live, not just
parse-checked. In rough order of how much harm they'd have done:

| Fixed | What it actually did to a person | v |
|---|---|---|
| Stale native bundles | `www/` and the iOS shell were still **v326** — an archive would have shipped a build predating multi-faith, cycle, and every crisis-gate fix | v365 |
| Cycle delete resurrection | She typed DELETE; if the purge couldn't reach the server the next sync wrote her period log back. Now tombstoned and retried until confirmed | v364 |
| Check-in sent to the wrong table | The progress check-in put her free text **and email** in the anonymous counters — and if she'd turned counting off it was silently binned while the UI said "you're in the raffle" | v363 |
| Per-person fight telemetry | `relapse_logged` / `fight_won` traced individual slips and wins against a persistent id — the surveillance our own refusal list rules out. Removed | v363 |
| Gentle mode leaked | "Numbers off" hid calories in the diary, then handed the coach the exact figures to say back | v362 |
| The honest ledger discarded everything | Both columns typed, "Kept" shown, nothing saved — a stale object captured before the form opened | v360 |
| Food prune could delete today | Lexicographic sort on d/m/yyyy keys meant `keys[0]` could be **today**, and history was capped at 30 days while day-nav promises 120 | v360 |
| Money's lower half never rendered | For a debt-free user — i.e. every new user — Giving, subscriptions, bills, budgets and net worth all sat behind an early return | v360 |
| Receptivity gate unreachable | Quiet hours could never be set, and on web it logged sends that never happened, then stood the channel down for "ignoring" them | v361 |
| Crisis gate on the Home free-text door | A seventh free-text→LLM path with no gate | v358 |

**The pattern, again:** every one of these parsed cleanly and passed the tests. Nine written-but-never-called
features were found across v357–v365 (`_reachOutRowHTML`, `_reachOutResponded`, `verseCardEyebrow`,
`_verseToolsHTML`, `_verseCardOverride`, `viceStageTone`, `nutDayWord`, the walk-back, the Toolkit's
post-slip rule). `try/catch` everywhere makes failure silent. **A green test suite is not evidence a
feature exists** — the call-site coverage test added in v357 is the only guard against this class, and it
should grow every time a new surface is added.

---

## 🧹 Known dead code — prune or revive, deliberately

A mechanical sweep (now guarded by a ratchet test) found **42 element ids referenced from JS that do not
exist in the markup**, plus a few orphaned functions. None of them crash: the seven *unguarded* ones all
live inside `previewBodyPhoto()` and `updateSavings()`, which are themselves never called. The rest are
guarded silent no-ops. They are listed here rather than "fixed", because re-adding a surface the design
dropped would be guessing at intent — this is a decision, not a side effect.

| Cluster | Ids | What it was |
|---|---|---|
| Season badge | `season-emoji`, `season-name` | `renderSeasonBadge()` runs every boot and does nothing; `.season-badge` CSS still present. Season data is still used by the coach brief. |
| Legacy body photos | `bod-photo`, `bod-photo-img`, `bod-photo-preview`, `bod-photo-info` | Superseded by the working progress-photos feature. `previewBodyPhoto()` + `renderBodyCollage()` are orphaned with it. |
| Old header counters | `h-streak`, `h-habits`, `h-score`, `h-wins`, `h-debt` | An earlier home header; the current home renders these differently. |
| Legacy cardio log | `cardio-*`, `edit-cardio-*` (11 ids) | An older cardio-logging modal. |
| Legacy reminders | `notif-morning`, `notif-evening`, `notif-setting-status` | Superseded by `push-time-morning`/`push-time-evening`. |
| Legacy savings | `usa-in`, `india-in`, `f-usa`, `f-india` | `updateSavings()` — never called. |
| Misc | `strava-link-status`, `settings-cal-goal`, `settings-pro-goal`, `pt-coach-welcome`, `steps-count`, `pt-history-list`, `pt-split-*`, `bible-results`, `br-search-results` | Each a small surface that silently never renders. `steps-count` is the only one a user might notice: steps never display on Track. |

**The ratchet:** `npm test` now fails if a new dead id appears, or if an unguarded dead reference ends up
inside a function anything calls. That is the guard this project actually needed — the suite could not
previously tell the difference between "built" and "built and wired".

---

## ✅ Done (so the list below is honest about what it isn't)

The seven specs are all applied — day-navigation, women's cycle + phase coaching, daily pledge /
stage-of-change / habit anchors, verse cards + read-aloud, faith-aware giving + seasonal fasting,
the receptivity gate, the blessing + values card sort — plus the onboarding aha, three good things,
gentle mode, your few, HALT, the frozen door, the impulse door, "Look Up", sleep in `getLifeState()`,
the crisis-gate hardening and the honest privacy rewrite.

---

## 🔴 TIER 0 — ship-blocking ops (not features)

| # | Item | Why | Effort |
|---|---|---|---|
| 0.1 | **Archive build 3 + upload** | Code side is done: `www/` and `ios/App/App/public/` are both synced to v374 and `PrivacyInfo.xcprivacy` now declares all nine data types (was only Health + Email). What's left is Xcode + App Store Connect, which needs your hands. | your GUI |
| 0.2 | **App Privacy nutrition label** | Answer it from `ios/App/App/PrivacyInfo.xcprivacy` — it and `privacy.html` are now in step, and the label must match both or review flags it. Declare: email, user id, health & fitness, sensitive info (faith), other user content, financial info, name, product interaction (not linked, analytics), crash data. | GUI only |
| 0.3 | **Age rating** | Not started. | GUI only |
| 0.4 | **Use it for a week yourself** | Every bug this project has shipped survived because nobody set the value and looked at it (the water goal collapsed to 8ml for exactly that reason). Six of the nine blockers above were only visible to someone actually using it as a new, debt-free, numbers-off, non-Christian user — not to a parse-check. | — |

---

## ✅ TIER 1 — DONE (v353–v355, all verified live)

| Item | Version |
|---|---|
| Sleep wind-down ("Land the day") + morning light *(merged into the short-sleep nudge — a standalone rule could never fire)* | v353 |
| Recovery bridge — SMART · AA/NA · Celebrate Recovery *(faith-gated)* · GP · someone who knows | v353 |
| Contribution / service exit from the craving loop | v353 |
| HALT on the vice card *(it only existed mid-craving)* | v353 |
| Cross-faith Creation / Awe shared thread | v354 |

## ✅ TIER 2 — DONE (7 of 7, v354–v357)

| Item | Version |
|---|---|
| AIDs walk-back + the link to break | v354 |
| Cost–benefit "honest ledger" — **mirrored back in their own words at the threshold** | v354 |
| DEADS — five ways through | v354 |
| Subscription auto-detection *(3+ hits, stable amount, real rhythm; verified it ignores groceries, one-offs and irregular coffees)* | v355 |
| On This Day — pull, never push *(and its "Read it" button now reads instead of destroying the entry)* | v355, fixed v362 |
| Guided reading plans | v356 |
| CBT/ACT micro-lessons — the Toolkit *(post-slip rule now actually fires)* | v357, fixed v362 |

**TIER 2 COMPLETE.** All seven shipped and verified live.

**Dead code caught while building these** — all three parsed fine and would have looked "built" forever:
the morning-light nudge could never fire (the short-sleep rule claimed the same condition first); the
ledger referenced `vices[i]` inside `playTheTape()`, which has no index in scope, and failed silently
inside its own try/catch; `sub-detect` mounted twice.

## 🟠 TIER 1 — (original list, kept for reference)

| # | Item | Why it matters | Effort |
|---|---|---|---|
| 1.1 | **Sleep wind-down ritual + morning light anchor** | Sleep is already in `getLifeState()` and already *speaks*, but nothing yet *helps*. The wind-down is a first-line insomnia treatment that ends off the phone — the anti-scroll thesis as an actual sleep intervention. Morning light is the cheapest circadian lever there is (10–50× evening screen avoidance). | S |
| 1.2 | **Recovery bridge menu** (SMART · AA/NA · Celebrate Recovery · therapy · harm-reduction) | "Points beyond itself" is a stated non-negotiable, and the Fight currently has no warm hand-off to a real recovery community. Faith-aware, never ranked, never "the app failed you". | S |
| 1.3 | **Contribution / service exit from the craving loop** | Self-transcendence is the fastest documented exit from a self-referential loop, is faith-congruent (James 2), and works secularly. Currently absent as an explicit move. | S |
| 1.4 | **HALT → the Fight card** (it exists only at the moment-stakes door) | Cheap reuse: surface the same 4-tap check on the vice card itself, not just mid-craving. | XS |
| 1.5 | **Cross-faith Creation / Awe shared thread** | Completes the "Look Up" work: *the heavens declare* · *ayat* · sacred rivers · under the trees · deep time. One theme, five echoes, slots straight into `SHARED_THREADS`. | S |

---

## 🟡 TIER 2 — real depth, medium builds

| # | Item | Why it matters | Effort |
|---|---|---|---|
| 2.1 | **AIDs walk-back + personal high-risk list** | Marlatt's "seemingly irrelevant decisions" — the upstream awareness a mid-urge companion structurally cannot give. Also feeds the risk-window data the push already wants. | M |
| 2.2 | **Cost–benefit analysis (saved, self-owned)** | SMART Recovery's core tool: *their own* reasons in *their own* words, mirrored back at a threshold. Autonomy is what predicts follow-through (SDT). | M |
| 2.3 | **DEADS/DENTS urge menu** inside the companion | Named alternatives (Delay · Escape · Accept · Distract · Substitute) so the person *chooses* their response instead of being handed one. | S |
| 2.4 | **Subscription auto-detection** from statement import | The one genuine Money gap vs Rocket Money. The importer already exists — this is pattern-matching recurring charges on top of it. | M |
| 2.5 | **"On This Day"** — resurfacing as witness | Surface last season's entry when they open the door: *"a year ago you wrote this about the same struggle — hear how you speak of it now."* Pull, never push. Needs ~a year of data to shine. | S |
| 2.6 | **Guided reading plans** (faith-aware, topical) | YouVersion's killer feature. Multi-faith by construction via the FAITHS registry. | M |
| 2.7 | **Bite-sized CBT/ACT lessons** | A calm place to learn the tool *before* the moment — complements the in-the-moment companion. Free where everyone else paywalls it. | M |

---

## 🟢 TIER 3 — native-gated (post-wrapper)

| # | Item | Why |
|---|---|---|
| 3.1 | **iOS Screen Time / Family Controls blocking** | The biggest single unlock of the whole dopamine thesis: actually block the app someone is quitting. Impossible in a PWA. |
| 3.2 | **Background push, live** | The receptivity gate (v349) is built and waiting. This is what makes the app a presence that *notices*, which the research named the #1 missing lever. |
| 3.3 | **Deeper HealthKit** (sleep especially) | Would make the sleep signal automatic instead of self-reported. |
| 3.4 | **Body-doubling — "start alongside me"** | Near-term: a 2-min timer + check-in. Post-wrapper: scheduled at low-activation windows. Points toward real people, on-thesis. |
| 3.5 | **Android** | Tracked launch target. Capacitor covers most of it. |

---

## ⚫ Still deliberately NOT building

Streak-shame · over-goal guilt · notification nagging · leaderboards · points/XP for virtue ·
in-app social feeds · parasocial dependence · paywalled prayer · selling or brokering data ·
surveillance monitoring · venting/catharsis · relationship streaks · sleep scores · fertility or
contraception guidance · personalised investment advice.

**These refusals are the moat.** A 187-item audit found the industry's dark patterns are exactly what
the evidence says backfires — and that our refusals are the most consistently kept part of the whole
backlog. Don't trade one away for a growth number.

---

## A note on sequencing

**Tier 0 is all that stands between here and the App Store.** Tier 1 and Tier 2 are complete, the nine
pre-build blockers are closed, and the native bundle is synced. Everything left in Tier 0 is Xcode and
App Store Connect — GUI work that needs your hands, not more code.

**Then 0.4 before Tier 3.** The highest-value thing after submitting is not another feature — it's a
week of real use. Six of the nine blockers above were invisible to parse-checks and tests: they only
showed up when the app was driven as a *new* user (debt-free, numbers-off, non-Christian, no data). The
tutorials will be truer for a week of that, and so will the next build.

**One caveat now that it's an App Store app.** A Pages deploy is instant and silent; a store build is
neither. Batch small fixes into fewer releases rather than shipping an update a day at people — and keep
the PWA as the fast channel while the store build stays the stable one.
