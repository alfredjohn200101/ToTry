# What's left before this is worth putting on the App Store

Written 14 Aug 2026. **Updated at v465.** Based on three adversarial sweeps (165 agents, 70 confirmed
findings), days of driving the real app, and a pass (v459–v465) that stopped auditing and started
making the half-built things work. This is the honest version, not the encouraging one.

## ⚠️ A correction to this document

An earlier version of this file listed *"`detectCrisis` missing **"I can't go on"**"* as **closed by
v444**. It was not. v444 added only the qualified forms — `can't go on like this / anymore / any
longer` — so the bare phrase returned `null` in all three apostrophe forms for months, on the app's
most important gate. Found in v463 by **running** the shipped function rather than reading it.

That matters more than the bug. This document is what a reader trusts about the app's safety, and it
was wrong in the direction that feels good. Treat every "closed" line here as a claim to re-test, not
a fact — and prefer running the code to reading it.

---

## v462–v465: the third sweep

Six dimensions never previously scanned — first-run/onboarding, data flows, crisis coverage, error
paths, money correctness, and forms — each with an adversarial verifier told to **refute** its own
dimension's findings and default to refuted when uncertain.

**24 of 34 candidate findings survived: 3 blockers, 10 high, 11 medium. All 24 are now closed.**

The refutation earned its place: **all six money findings were refuted.** The headline claim — that
the Money tab's `/mo` figures are exactly double — was a monthly *rate* misread as a total;
`spendingRead`'s `Math.max(0.5, spanDays/30.44)` floor is correct and deliberate. I had begun fixing
it when the verifier came back. Unverified findings are how a codebase acquires damage.

### The blocker: signing up was indistinguishable from signing back in

PostgREST resolves a `.select()` with no matching rows to an **empty array**, which is truthy. So
`pullFromCloud`'s `if(!data)` let a brand-new account fall through to `return true`, and
`proceedAfterAuth` reads that return as *"this is a returning user"*. On the app's **only** sign-in
path (email OTP — `authGoogle` is a disabled stub), a first-time person:

- had onboarding hidden and was greeted **"Welcome back — your journey continues"**
- never saw the name step, the first felt moment, the faith step or the apps step
- got `totry_onboarded`, `totry_name` and `totry_faith_tradition` left unwritten, so Home called them
  "Friend" and the faith registry silently defaulted to secular
- and on their **next** launch landed on the first-run welcome screen with `initApp()` never running

The correct `data.length === 0` check existed all along inside `_restoreFromCloud_legacy_unused` —
which nothing calls. Dead code held the fix for a live blocker.

### Safety: three of the four journal doors never met a disclosure

Four surfaces write to `totry_journal`; only `saveEntry` gated. The quick "get it out" note, the grief
door (placeholder *"I miss…"*) and a reading-plan answer (*"However it comes out. Nobody reads this but
you."*) each saved a crisis disclosure with a cheerful toast, left it **unflagged** so `safeJournal()`
handed it to the model on the next request, and never showed anyone the bridge to real help. **The two
likeliest places for a first disclosure were the two least guarded.**

`completeMorning` was worse than ungated: its crisis branch `return`ed **before** the write. The one
moment a person disclosed was the one moment their words were discarded — under a comment promising
*"their words are always kept"*.

`detectCrisis` missed eight phrasings, including the v444 miss above, `"ending my life"` (the list had
`end my life`, which is not a substring of it), `"off myself"` and `"taking my life"`. Added as a regex
pass, since each needs an inflection or a negative completion a substring list cannot express — and
`"take my life back"` is a **recovery** phrase people write here, so it must never read as its opposite.

### The rest, by shape

| shape | instances |
|---|---|
| **A store read but never written** — a feature that can never fire | 4: the water habit's auto-tick, the per-vice cost override, share-card wins counted from the *money* log (so porn/scrolling/gaming showed 0 wins), and a calorie throttle written and never read (so one weekly decision compounded to ±450 cal) |
| **An input that feeds a defaulted save, never prefilled** | 2: "Save targets" silently reset a 12,000-step goal to 8,000; the TDEE Sex dropdown silently flipped a woman's stated sex to male, changing her calorie targets and hiding her cycle card |
| **A failure the person is promised the opposite of** | 4: the storage-full warning deleted before it painted by the caller's "Saved"; an unreadable photo producing nothing at all; an expired Google token returning in silence right after "Refreshing…"; add-a-debt doing nothing and saying nothing |
| **A setting that changes less than it implies** | 2: weight unit "lb" relabelled one line while every figure stayed kg; timezone stored a value nothing reads |
| **Faith on a default path** | instance **six** — "Prayer / scripture" seeded as a default habit for every new person, secular included. The first one to reach a person's own data rather than a screen they could walk away from. |

### iOS submission state (verified 17 Aug, v465)

Debug **and** Release build clean on Xcode 26.6, all four Capacitor plugins resolving via SPM. Seven
usage strings present, launch storyboard, privacy manifest, `ITSAppUsesNonExemptEncryption` set,
version 1.0 (build 3). The native notification path uses **LocalNotifications** and never calls
`register()`, so the absent `aps-environment` entitlement is correct rather than a gap — reach-out-first
works on device without it.

Two process fixes came out of this: `npm run preflight` (the iOS bundle had silently drifted four
versions behind the repo — an archive would have shipped v458) and `APP-PRIVACY.md` (the App Privacy
questionnaire answered from what the code actually does, every claim checked).

**One thing only the account owner can do:** `ESV_API_KEY` ships in the public bundle and is readable
by anyone viewing source. api.esv.org issues keys per person; someone else's use can rate-limit or
revoke it and take the ESV reader down for everyone. Proxy it through the edge function and rotate it.

---

## v459–v461: the seventh class — *built, complete, and unreachable*

The most useful thing found since v443, because it is not a bug list — it is one shape that kept
recurring, in three different forms. In every case the code was finished, correct, and could not be
reached, so it parsed, tested green, and did nothing.

| form | instance | what the person lost |
|---|---|---|
| a renderer with no container | `renderWorkoutHistory` → `#pt-history-list` never existed | a workout logged in the app could **never be reopened**; PRs sat under a permanently empty heading after a "New PR!" toast |
| a renderer with no container | `searchBible` → `#br-search-results` never existed, and it **threw** on the null node | you could not search scripture at all in a faith-rooted app — only browse book by chapter |
| a panel with no control | `setPTTab` handled `'routines'`, no button ever passed it | the whole routine feature: build one, save it, assign it to a day, starter templates |
| two functions never connected | `logLoss()` accepts a backdate, `promptLossDate()` collects one | a slip admitted today restarted the clock **from today** — the record quietly lied |
| a read of an element that moved | `saveAllTargets` read `#settings-cal-goal` | it saved nothing for calories/protein while toasting *"All daily targets updated."* |

**All five are fixed and verified in a real browser**, not just by test.

### What the class teaches

`npm test` was green at 732 while every tap on the Fight tab threw — a `const` I deleted with its user
left behind. Source-pattern tests cannot see this. What catches it is **driving the app**: a walk of
all 19 sub-panels as two different people found it in one run, and found a defect in v459's own work
(imported Hevy/Strava sessions render `undefined — Day undefined`, because only the in-app logger
writes `date`/`day`/`completedSets` — and imported rows are the ones most people have).

New ratchets encode the class itself, not just its instances: every value of every sub-tab switcher
must have a control that passes it (14 panels), and the containers must exist.

### Dead code was deleted, for a reason (v461)

Ten complete unreachable functions and ~40 lines of markup, ~11KB. Not tidying — each was a **closed
defect class sitting pre-built, one caller away from reopening**:

- `showContextualScripture()` — hardcoded Christian verses keyed by context, **no tradition check
  anywhere in it**. That is the v431/v440 bug fully built and waiting, in a codebase that produced
  three instances of that same mistake on three separate passes.
- `requestNotifications` / `scheduleReminders` / `saveReminderTimes` — a **second reminder system**
  writing different keys than the live one. Two sources of truth for when the app may speak to someone.
- `saveMealPlan()` — wrote a store nothing has ever read, and toasted *"Find it in your saved meal
  plans"*, a place that does not exist.
- the craving panel — five functions behind a panel `setFightTab` went out of its way to keep hidden.

### The Feeling Door is healthy — and now covered

Roadmap item 4 asked for it to be live-tested. All ten paths were driven as a secular person with
nothing set up and as a Muslim with one vice: **every one opens a real surface with a real next
action**, and none leaks Christian vocabulary. Persona assertions went 122 → 484.

Both "failures" seen while writing that test were the measurement, not the app — the door is
`#feel-door`/`.feel-chip`, not a `.modal-bg`, and "the pull" with no vice hands off to
`#companion-overlay`. This is the fifth time in this project the broken thing was the ruler. The suite
was then **proved able to fail** by injecting a throw into `openFeelingDoor` (4 clean failures naming
the persona) — and the first injection attempt silently didn't apply, which would have recorded a
false pass.

### Two accessibility leads were stale, and one is real

Re-measured across all seven tabs with money and list data seeded (the omission that hid the worst
controls from two earlier audits):

- **"VoiceOver names eight destructive buttons 'Close'" — not reproducible.** Zero unnamed controls.
- **"The Soul tab has no focusable elements" — not reproducible.** It has 12; no tab has zero.
- **Tap targets are real**: 107 under 44pt, but only 6 under 24pt. The two worst were fixed by
  measurement (the migrate-card × at **9.3×16**, and the "numbers on" toggle at 59×12 — which is how
  someone in recovery from disordered eating turns calorie numbers off, a poor thing to hide behind a
  12px target). Four remain: three are inline text links with other routes to the same place, one is a
  bill ✓ sitting beside a delete ×, which needs the row laid out taller rather than a padding trick.

### One thing only the account owner can fix

`ESV_API_KEY` is hardcoded in the bundle, so it is readable by anyone viewing source on the live site.
api.esv.org issues keys per person; someone else's use can rate-limit or revoke it and take the ESV
reader down for everyone. The fix is to proxy it through the Supabase edge function the way AI calls
already are, and rotate the key. Documented at the constant. A duplicate unused copy was deleted.

## The headline

**The submission-blocking list is nearly empty. The "worth shipping" list is not.**

Nothing here is a reason to be discouraged. The architecture is sound, the soul is intact and unusual,
and the core mechanisms (getLifeState, the Feeling Door, the crisis bridge, the faith registry) are
genuinely well built. What's missing is not invention — it's **finishing, and proving**.

The single most useful number from today: **every substantive look found something real, including in
code written hours earlier and already called verified.** Three separate instances of the same faith-gate
bug, found on three separate passes. An eighth ungated AI surface after seven were gated. A crisis gate
that stopped the reply and let the sentence through on the next message. That is not a bug count — it's a
**defect class that keeps producing new instances**, which is exactly the signature of a codebase that
grew faster than its verification.

---

## Part 1 — The findings

**Blockers: 0.** All three closed in v437 — the location usage string (its absence *terminates* the app on
iOS, so it would have died in a reviewer's hand), the undisclosed GPS to `api.aladhan.com` (now coarsened
to ~1km **before** it leaves the device, and disclosed in both policies and the privacy manifest), and the
in-app privacy modal that had never mentioned Apple Health.

### Four classes closed — not four bugs

The point of this section is that each of these produced *repeat instances*. Closing the class is what
stops the next one.

| class | instances | closed by |
|---|---|---|
| **Crisis-gate leaks** | 4 surfaces + history redaction | v434, v439 |
| **Faith forced on the secular default** | 5 | v427, v431, v435, v440 |
| **Numbers stated as fact, never measured** | 3 | v432, v441, v442 |
| **Promises the code doesn't keep** | 3 | v421, v430, v443 |

Worth understanding rather than skimming:
- The crisis gate stopped the *reply* and left the raw sentence in the coach history, so the **next**
  message shipped it to the model anyway — and `totry_coach_history` is a synced key, so it went to the
  database too. Disclosures are now redacted from history and flagged entries are excluded from AI
  context permanently, while the person's words are always kept exactly as written.
- `showVerseToast()` fired Bible verses on **wins** — an urge beaten, a PR. The moments the app exists to
  honour were the moments it handed a Muslim someone else's scripture.
- Tapping "Rough" on the sleep card recorded **three hours of sleep**, which was then averaged, turned
  into a sleep debt, and quoted to both the person and the AI as measured.
- Two plate calculators disagreed about the same lift — and **one of them I added in v426 without
  checking the app already had one**.

### Part 1 is closed (v437–v445)

| was | closed by |
|---|---|
| 3 submission blockers (location usage string / undisclosed GPS / in-app policy silent on Health) | v437 |
| Day one opening with *"You skipped your habits yesterday"* | v445 |
| Restore reporting keys **tried**, not landed — losing the journal first on a full device | v445 |
| Food edit showing per-serving while saving double | v445 |
| Rest-timer buzz still on `navigator.vibrate`, dead on iPhone | v445 |
| Negative streak, wrong-shaped storage key taking out Home, app-lock over crisis numbers | v445 |
| Tap targets — including **"×" delete glyphs at 8.2×16**, ten per screen, three deleting with no confirm | v445 |
| Contrast below WCAG AA on every card | v438 |
| `detectCrisis` missing *"I want to end it"* — 4 of 12 real phrasings | v444 (**"I can't go on" was NOT closed — see the correction at the top; fixed v463**) |

**Six defect classes shut, not six bugs:** crisis-gate leaks, faith forced on the secular default, numbers
stated as fact that were never measured, promises the code doesn't keep, crisis-detector recall, and
duplicate implementations that drift apart.

The accessibility numbers are worth keeping as a caution. v429/v430 claimed "zero below HIG across all
five tabs" and "no text below AA". Both had measured **only Home**, via a `showTab()` that does not exist,
inside a `try/catch` that swallowed the error. Re-measured with `go()`: 29 tap targets and 10 text runs.
Then a specced re-measurement found the *worst* controls had been invisible to that too, because the run
had no money data seeded so the list rows never rendered. **Three successive measurements, each one
wrong in a different way.**

> A `::after` pseudo-element was tried as the systemic tap-target fix and **reverted** — a Playwright
> click 14px outside the box did not fire the handler. It is the obvious solution, it is widely
> recommended, and here it does nothing. Padding cancelled by an equal negative margin is what works, and
> is measurable.

**Remaining in Part 1: nothing blocking.** What is left is small and known — 17 bordered pill buttons and
the `.fst` sub-tabs are 28–37px and cannot be padded without repainting them taller (a design decision,
not a bug fix); four delete glyphs in Grow/Soul carry inline padding so they need per-site edits rather
than the shared rule; the Fight craving panel is still unreachable; ~10 medium/low copy and vocabulary
items remain.

---

### Deferred with a reason (not forgotten)

**Currency symbols — a real retrofit, ~250 sites.** `totry_currency` drives conversion rates and nothing
else; the app hardcodes `$` in roughly 250 places (43 mechanical string concats, ~169 inside longer
strings, ~42 in markup). Sweeping only the mechanical ones would show euros in some figures and dollars
in others on the same screen — worse than being consistently wrong, and much harder to notice. v458 makes
the setting *say* what it does. The real fix is one money formatter plus an all-or-nothing sweep —
**half a day.**

**Tap targets — 24 still under 44pt.** 17 bordered pill buttons and the `.fst` sub-tabs sit at 28–37px and
cannot be padded without repainting them visibly taller; that is a design decision, not a bug fix. Four
delete glyphs in Grow/Soul carry *inline* padding, which beats a stylesheet rule, so they need per-site
edits rather than the shared selector.

---

## Part 2 — What isn't a bug, and is the actual gap

This is the part that makes "several months" the honest number rather than "a fortnight".

### 1. Multi-faith is a **gate**, not a **home**
Today's fixes route a Muslim *away* from Christian surfaces. That is correct and it is not the same as
serving them. A Christian has: a 66-book reader, saints' prayers, liturgy, the Rosary, sacrament
tracking, prayer-intention generation, answered-prayer marking. A Muslim has a Qur'an reader and dhikr.
Hindu, Buddhist and secular have less.

The registry (`FAITHS`, `VS_*`, `faithPrayer()`) is the right architecture and it is already built. What's
missing is **content and surfaces per tradition** — the equivalent of "your day, woven", a prayer/reflection
home, rituals that belong to them. Until then the app is honest with non-Christians rather than useful to
them, and the README promise ("a person of any belief or none is fully served") isn't true yet.
**Estimate: 3–5 weeks, and it needs people of those traditions to read it.**

### 2. The monolith is now the defect generator
41,000 lines in one file is why a 13px CSS rule sat 845 lines from its 16px override; why three faith
gates drifted apart; why `SYNC_KEYS` could be read from the wrong array by a comment; why a `const`
reassignment parsed fine and threw only in a rare branch. It's item 3 on your own roadmap and it has
graduated from "tidy-up" to **root cause**.

Split it incrementally, parse-checking constantly — state, UI, companion, nutrition, train, money, soul,
AI. Never a big-bang rewrite. **Estimate: 2–3 weeks, and it pays for itself immediately.**

### 3. Verification is manual and expensive
Today's classes were found by two multi-agent sweeps costing ~12M tokens. That doesn't scale and it isn't
repeatable by you alone. What's missing:
- a **call-site lint**: every `api()` preceded by `detectCrisis`, every tradition-branching entry point
  gated, every `SaveFile.save` result bound (some of this now exists as ratchets — 570 tests)
- a **persona smoke test** that boots as secular / Muslim / female / debt-free / offline and asserts what
  is on screen, run on every change
**DONE 14 Aug (v438):** `npm run personas` boots the real built bundle in headless Chromium as five
people — secular, Muslim, Buddhist, Christian (control), female — walks all five tabs and asserts what is
on screen: no Christian-only vocabulary for non-Christians, no NaN/undefined, crisis numbers reachable,
zero page errors. **82 assertions.** It found its own first bug immediately: the `showTab()` mistake above.
Still to add: an offline/expired-token persona, and a debt-free/no-numbers persona.

### 4. Nothing has run on real hardware
Barcode scanning, Face ID lock, haptics and push notifications have **never executed on a phone**. All
four compile, are registered, and fail closed — that's all I can prove from a simulator.
**Estimate: 2 days once a device is registered, plus whatever it finds.**

### 5. No one else has used it
No TestFlight, no beta, nobody of another faith has opened it, nobody has used it for a week from a wiped
install. Every judgement about whether this *works* — not whether it runs — is currently untested.
**Estimate: 3–4 weeks of calendar time, mostly waiting and listening.**

---

## Part 3 — Honest sequencing

1. **Week 1** — the 3 blockers + the persona smoke test (so regressions stop reappearing)
2. **Weeks 2–3** — the 33 findings, by class not by list
3. **Weeks 3–5** — split the monolith (in parallel with 2; it makes 2 safer)
4. **Weeks 4–6** — multi-faith surfaces, with readers from those traditions
5. **Week 6** — device testing; register the phone, run all four native features
6. **Weeks 7–10** — TestFlight with 5–10 real people, at least two non-Christian
7. **Then** submit

**Realistic: 8–10 weeks.** Compressible to ~5 by cutting multi-faith parity and shipping honestly as
Christian-first with the others explicitly marked "coming" — a legitimate choice, but it must be *said*,
not implied by omission.

---

## What is genuinely strong

Worth stating, because the list above is long and the app is better than it reads here.

- **The soul is intact and rare.** Grace over shame, anti-engagement, points beyond itself — and these
  aren't slogans, they're enforced in code and in tests.
- **The crisis machinery** is more careful than most shipped health apps: 8 gated surfaces, hardcoded
  offline resources, a redaction placeholder so a disclosure never rides along to a model.
- **The integration thesis works.** `getLifeState()` really does let counsel account for the whole person.
- **The honesty discipline** — the app tells people when a save failed, when a backup excluded something,
  when it can't reach a helpline. Most apps don't.
- **570 tests** that encode real, previously-shipped bugs rather than coverage theatre.

The gap is not vision or architecture. It's the distance between *built* and *finished*, and that distance
is measured in weeks of unglamorous work, not months of invention.
