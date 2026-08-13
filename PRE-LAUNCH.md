# What's left before this is worth putting on the App Store

Written 14 Aug 2026, at v436, after two adversarial sweeps (152 agents, 46 confirmed findings) and a
day of driving the real app. This is the honest version, not the encouraging one.

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

## Part 1 — The remaining findings (33 open of 46)

Fixed today: v427, v430–v436 closed 13, including every finding about crisis leakage and data destruction.

### Blockers — must be fixed before submitting

| # | What | Why it blocks |
|---|---|---|
| 1 | **Precise GPS sent to `api.aladhan.com`** (prayer times), undisclosed in both privacy policies, the App Privacy manifest and Info.plist | Undisclosed third-party data sharing. Apple compares the manifest against behaviour. |
| 2 | **`NSLocationWhenInUseUsageDescription` missing** while the app requests geolocation | iOS **terminates the app** on the call. Not a rejection — a crash, in front of a reviewer. |
| 3 | **The in-app privacy policy never mentions Apple Health** | v421 fixed `privacy.html` and Info.plist and left the in-app modal — the one most people actually read — still wrong. |

### High — fix before real users, not just before review

Grouped by the class they belong to, because the class matters more than the instance.

**Faith forced on the default (secular) user — 6 open**
- The morning-after card preaches: *"Same Lord. Same grace."*, Proverbs 24:16, Lamentations 3:23
- `showVerseToast()` fires Bible-verse modals with no gate — after an urge win, a gym PR, a fasting milestone
- The bridge to real help tells **every** tradition to see *"a priest"* for *"confession"*
- Terms of use tells non-Christians the app *"reflects a Christian worldview"* and that only the practical features work for them
- The fasting card is hidden from **exactly the three traditions it was written for** (Ramadan / Navratri / Uposatha copy can never render)
- The Feeling Door ends a secular or Buddhist person's win on a button labelled **"Amen"**

**Crisis detection quality — 2 open**
- Journal and evening reflection accept a disclosure, show nothing, then ship it to the LLM
- `detectCrisis` is simultaneously **over-inclusive** for a training app ("this workout is killing me") and **misses common phrasings**

**Promises the code doesn't keep — 3 open**
- Settings says *"Your personal data is stored on your own device"* — it is upserted to Supabase, as the policy two lines below admits
- *"Restored — N items loaded"* counts keys it **tried**, not ones that landed; a full device silently drops the biggest
- Append-only logs missing from the ARR union list are clobbered on the losing device (the mechanism is real; the fix as proposed is destructive for 3 of 6 keys — needs care)

**Numbers that lie — 2 open**
- Two plate calculators in the same session card give **contradictory answers for the same lift**
- A sleep **quality** tap is stored as **hours** and quoted back to the person and the AI as a measured number

**Day one — 1 open**
- First morning, first thing: *"You skipped your habits yesterday"* — about a day before the app existed for them

### Medium / low — 10 open
Ritual copy the faith pass never reaches ("then pray", "examens" ×4); every new user silently assigned a
"Prayer / scripture" habit and told that setup step is done; food edit shows per-serving numbers while
quantity says 2 (approve 202, save 404); "Reclaimed by staying clean" has three different values from the
same data; the rest timer's buzz is still `navigator.vibrate`, dead on iPhone; **Strava OAuth can't work
natively** (`redirect_uri` is `capacitor://localhost`); negative streak when the clock is behind; the
app-lock overlay covers the sign-in screen's crisis numbers; a wrong-*shaped* storage key takes out most
of Home; the Fight tab's craving panel is unreachable through every code path.

**Estimate: 2–3 focused weeks** to close all 33 properly, with tests.

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
**Estimate: 1 week. Highest leverage item on this page.**

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
