# "Still not one app" — the depth audit

> Five auditors drove the real bundle with six-month people (104 training sessions, a 93-day demo
> person, a deliberate 13-week bench stall), not read it. Three refuters then went at the findings,
> and all three returned `refuted: true` — correcting the diagnosis in ways that matter more than the
> original. Nothing here is built yet.

## The headline: the fronts are deep. The brain is shallow, and the record is filed in Settings.

Train is the **deepest front in the app**, and almost everything expected to be missing is built and
works on six months of data: e1RM, an all-time PR store, live mid-set PR detection, a per-exercise
1RM chart over the whole history, progressive-overload suggestions per exercise, plateau detection, a
muscle heat-map with weekly sets against a 10–20 target, cardio and strength in one timeline, rest
timer, supersets, RPE, plate math, a mobility-driven warm-up.

**Almost none of it leaves the Train tab.**

```
getLifeState().training   →   { sessions7, sessions14, daysTrained7, lastTitle }
lifeStateBrief()          →   "Training: 4 sessions in 7 days (4 days), last: Upper"
```

That is the entire training picture handed to every AI surface in the app, for a person with 104
logged sessions and fifteen PRs. Meanwhile `_ptIntel()` (`src/app/02-native.js`) computes, correctly,
on the same data: *"Estimated 1RMs: Leg Press ~327kg, Deadlift ~263kg, Squat ~166kg… Weekly sets per
muscle: chest 9, back 18… Plateau detected: Bench Press has stalled."* It has **three** call sites —
the PT coach, the morning, the weekly read. It is not in `getLifeState()` and not in the brief.

**And the Companion — the 11pm door, which SOUL-ARCHITECTURE calls "the whole reason the app exists"
and says "knows everything (sleep, training, vices, faith)" — receives no training context at all.**
`_companionSay()` never calls `getLifeState()`, never reads `.brief`, never calls `_ptIntel()`. The
surface a person actually reaches in the feeling has no idea they have trained 104 times.

That is the gap between "one stop app for it all" and four tabs that share a bundle.

## The second half, found by a refuter, and cheaper than the first

**The long record is not missing. It is filed next to where you change your units.**

Four surfaces already read months of a person's life:

| Surface | What it shows |
|---|---|
| `renderActivityHeatmap` | the show-up heatmap across the year |
| `showSynthesisHistory` | every past weekly synthesis |
| `openUniversalSearch` | search across everything they have ever written |
| `showYearInReview` | the year in review |

Each has **exactly one entry point**, and all four sit inside **one closed `<details>` labelled
"History & insights"** in the Settings stack (`src/shell-head.html:7326–7353`). A person 93 days in
meets the same app as a person on day nine — not because the record was never kept, but because it is
three taps into Settings between "Connected apps" and "Your data & account".

## What the refuters killed — do not build these

1. **The flagship insight does not exist in the data.** The synthesis proposed "eleven of your
   fourteen slips came after a night under six hours" as the sentence only this app could say. Driven
   against the app's own richest dataset: `totry_fight_log` holds 14 slips, sleep exists for the prior
   night of **6** of them, and **1** was under six hours — against a base rate of 1 in 14. **The
   conditional equals the base rate exactly: zero signal**, on the most flattering data in the repo.
   Building a correlation engine on that would have the app inventing a mechanism, which its own rule
   forbids.
2. **Six of fifteen "missing" claims are already built.** `renderWeeklyCheckin()` already renders on
   Home and already reads the week — measured: *"Trained 5× · protein 130g/day · weight −1.3kg ·
   Protein ran 50g/day under target. One extra serve at lunch closes it."* And
   `generateWeeklySynthesis()` already opens its prompt with `getLifeState().brief`.
3. **"Keeps nothing" was wrong.** Ten stores accumulate and four surfaces already read them across
   months. Only the habit ring genuinely destroys history.

## The cheap, high-value work

1. **Widen the brain, once.** `getLifeState().training` carries what `_ptIntel()` already computes —
   top e1RMs, any live plateau, the week's tonnage and its direction, sets per muscle against target,
   today's planned focus, the most recent PR — and `lifeStateBrief()` says it once. Every AI surface
   inherits it, which is exactly how the units bug was fixed once in that function rather than
   card by card. The data is already computed; nothing new has to be measured.
2. **Give the Companion the two or three facts it can honestly speak into a hard moment** — not the
   whole brief, which would bloat a 2am prompt.
3. **Take the record out of Settings.** The heatmap, the syntheses, the search and the year in review
   are the person's own "collection of evidence" — the owner's words — and they are behind a closed
   disclosure. Where they belong is a product decision, not an engineering one.

## Also found, worth fixing on their own

- The **"Prev" column is index-aligned**, so set 1 shows the warm-up — and the tap-to-fill affordance
  loads that warm-up into a working set.
- A **routine assigned to a day is silently ignored** when the day also has a focus.
- Two surfaces of the same tab say, on the same day, that bench has **stalled** and that you are
  **ready to add 2.5kg**.
- The Train "today" card shows `"Today: Push"` and a static catalogue string identical for a beginner
  and a six-month lifter, while the app's own deterministic answer exists and is better.
