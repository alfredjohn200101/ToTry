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
| `detectCrisis` missing *"I can't go on"*, *"I want to end it"* — 5 of 12 real phrasings | v444 |

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
