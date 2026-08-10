# NEXT — the build list

Where To Try stands at **v374**, and what's actually left. Every item below was **verified absent in
`index.html`** (not guessed). Ranked by impact × vision-fit ÷ effort.

Research behind each item is in `RESEARCH-BACKLOG.md`. Ready-to-apply specs live in `specs/`.

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
