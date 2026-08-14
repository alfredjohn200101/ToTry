# What's left before this is worth putting on the App Store

Written 14 Aug 2026. **Updated at v443** — every blocker is closed and four whole defect CLASSES are
shut, not four bugs. Based on two adversarial sweeps (152 agents, 46 confirmed findings) plus a day of
driving the real app. This is the honest version, not the encouraging one.

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

### Still open

**Day one** — first morning, first thing: *"You skipped your habits yesterday"*, about a day before the
app existed for them.

**Data integrity** — *"Restored — N items loaded"* counts keys it **tried**, not ones that landed;
append-only logs missing from the ARR union list are clobbered on the losing device (the mechanism is
real; the proposed fix is destructive for 3 of 6 keys and needs care).

**Crisis detection quality** — `detectCrisis` is simultaneously over-inclusive for a training app
("this workout is killing me") and misses common phrasings. This is the one remaining item I would not
ship without: the gates are all in place now, but the detector behind them is blunt.

### Accessibility — measured properly on 14 Aug, and worse than v429/v430 claimed

Those two commits said "zero controls below HIG across all five tabs" and "no small text below AA". Both
measured **only the Home tab**, because they called a `showTab()` that does not exist — inside a
`try/catch` that swallowed the ReferenceError. The real navigator is `go()`. Re-measured with it:

| | v429/v430 claimed | actually |
|---|---|---|
| Tap targets under 44pt | 0 | **29** — Money 19, Home 5, Fight 5 |
| Text below WCAG AA | 0 | **10**, all `--tx3` on the lighter *card* backgrounds |

- **Contrast: fixed** (v438). `--tx3` was tuned against the page background only, so every card sat at
  4.28:1. Now `#85827B` — 4.52 on the lightest card, 5.10 on the page. Re-measured: **0 below AA**.
- **Tap targets: 24 still open.** Five are fixed (two in v429, three × buttons in v438) with padding
  cancelled by an equal negative margin — the technique that measurably works. Worst remaining:
  "Hide amounts" 68×**12**, "Set a monthly target" 107×**14**, "↑ Import CSV" 88×28. Mostly the Money
  tab's text-style controls. **Half a day.**

> A `::after` pseudo-element was tried first as a systemic fix and **reverted**: a Playwright click 14px
> outside the visual box did not fire the handler, so it enlarged nothing. Worth recording — it is the
> obvious solution, it is widely recommended, and here it does nothing.

### Medium / low — 10 open
Ritual copy the faith pass never reaches ("then pray", "examens" ×4); every new user silently assigned a
"Prayer / scripture" habit and told that setup step is done; food edit shows per-serving numbers while
quantity says 2 (approve 202, save 404); "Reclaimed by staying clean" has three different values from the
same data; the rest timer's buzz is still `navigator.vibrate`, dead on iPhone; **Strava OAuth can't work
natively** (`redirect_uri` is `capacitor://localhost`); negative streak when the clock is behind; the
app-lock overlay covers the sign-in screen's crisis numbers; a wrong-*shaped* storage key takes out most
of Home; the Fight tab's craving panel is unreachable through every code path.

**Estimate: 1 week** for what remains here — down from 2–3, because the four classes above are shut.

### The one I would not ship without

`detectCrisis` quality. Every AI surface is now gated and every disclosure is kept out of the model's
context — but the detector deciding what counts as a disclosure is blunt in both directions. It has
previously failed OPEN on iOS smart apostrophes, and it fires on "this workout is killing me". Both
failure modes are bad in different ways: one misses someone, the other teaches people the app
overreacts, which is how a real disclosure gets dismissed later. **2–3 days, and it needs real phrasings,
not invented ones.**

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
