# To Try — Honest Competitive Teardown (is each function actually on par?)

> The founder's question, asked in earnest: is this still a *vibe-coded personal project*, or is each
> function genuinely on par with the category leader it's meant to rival — and is the combined whole
> worthy of the public? This is the prosecutorial answer, grounded in what's actually in the code
> (not marketing, not vibes). Verdicts are deliberately harsh where earned and fair where earned.

## The one-line finding
**It is NOT "still vibe-coded" on features — most domains are near or at par on the feature *checklist*.
What keeps it feeling like a personal project is TRUST, not features:** core loops that occasionally
produce a wrong number, no automated test net, AI used where determinism belongs, and one domain
(Track) that claims a bar it doesn't hit. Fix trust, and it crosses the line. More features won't.

---

## The scorecard (each function vs its main competitor)

| Domain | Competitor(s) | What's actually built | The real gap | Verdict |
|---|---|---|---|---|
| **Nourish** | MyFitnessPal, MacroFactor | Real multi-source food DB (OpenFoodFacts + USDA + FatSecret + Nutritionix), **native barcode scan** (BarcodeDetector), recent/frequent/saved/**custom** foods, meal grouping, some micros, recipes, **adaptive TDEE** (MacroFactor's crown jewel), weekly digest, weight trend | AI web-lookup fallback = the *same food can log different numbers* depending on source; micros partial; a real logging-math bug already shipped (404→1290) | **Feature-par with MFP; TRUST is the gap.** Architecturally there. Not yet "log the same food identically every time." |
| **Train** | Hevy | `EXERCISE_DB` (curated dozens + community-shared/extensible), per-set logging **with RPE**, **auto rest timer**, routines/templates, per-exercise progress charts, history, plate math, volume/tonnage, warmup, 1RM | Library is ~dozens vs Hevy's 400+ (with animations/instructions/muscle maps); per-set UX polish (ghost "last time", PR celebration, superset UX) needs tightening | **Closer to Hevy than it looks — a real logger.** Gap is library breadth + per-set finish, not missing core. |
| **Track** | Bevel, Whoop, Oura | Reads weight, sleep, steps, active-cal, **resting HR**, mindful minutes from Health; readiness score, strain, body metrics, photos, measurements | **Readiness is self-report + training-load driven — no HRV.** Bevel/Whoop's entire value is objective HRV-based recovery. | **Furthest from its competitor.** Reads real data, but the readiness isn't HRV-objective. Either add HRV + a real recovery model, or *position honestly* as a lighter check-in readiness — don't imply Whoop-grade. |
| **Fight** | I Am Sober, Fortify, Quittr, Brainbuddy | Per-vice streaks, quit/moderate/watch modes, in-the-moment urge door, plan (why+move), breath engine matched to state, natural highs, recovery timelines, now **letting-go + The Release** | Nothing material — this is the strongest domain and the *integration* (vice→money→readiness→soul) is a moat none of them have | **At or above par.** The clinical in-the-moment toolkit + integration beats the single-purpose quit apps. |
| **Money** | YNAB, undebt.it, Copilot | Debts (snowball/avalanche), payments, bills, budgets, assets, reclaimed-from-vice, payday allocation, debt-free date | **No bank sync (Plaid) — manual entry only**; display bugs shipped ($undefined/$NaN, now fixed) | **Real breadth, not YNAB-tier.** Manual entry is friction; but defensible for a free stewardship tool if the manual UX is frictionless and the math is bulletproof. |
| **Soul** | Hallow, Pray.com, YouVersion | Bible reader + verse-for-your-situation, liturgy (Mass + saint), guided rosary, morning/evening rituals, breath prayer, examen, AI prayers | Text-first; Hallow is **audio-first** with a huge professionally-narrated catalog | **Broad but text-first.** Can't out-catalog Hallow; wins on integration + being free + not a content silo. |
| **Coach / integration** | (none — this is the moat) | One AI over `getLifeState` seeing body+mind+fight+money+soul as one life | Depends entirely on the data underneath being *correct* | **The actual differentiator.** Only as trustworthy as the numbers it reads. |

---

## The cross-cutting "vibe tells" (what actually makes it feel personal-project), ranked by impact

1. **Core loops that occasionally produce a wrong number.** The meal double-scale bug, the money
   display leaks, the "targets don't save" complaint. *This is #1.* Enterprise = the core loop never
   fails. Every wrong number burns trust faster than ten good features build it. **Fix:** a Node test
   harness over the core math (nutrition scaling, TDEE, streak/clean-days, sync-merge, money) so these
   classes of bug **cannot ship again**, plus killing the known save/sync race with a real account.
2. **AI where determinism belongs.** Food macros via AI web-lookup, any coached *number*. When AI
   produces a value a user trusts, its inconsistency reads as "broken." **Fix:** AI for *language*,
   deterministic code + real DBs for *numbers*. Cache a resolved food so it's identical next time.
3. **Zero automated tests over 30k lines in one file.** The structural enterprise gap. Every change
   risks a silent regression (that's *how* the double-scale bug shipped). **Fix:** the test harness
   above is the highest-leverage single investment; then the incremental monolith split.
4. **Data-source roulette.** 4 food DBs + AI fallback → the same food can resolve to different numbers.
   **Fix:** a canonical resolution order + a verified/cached layer so a food is one truth.
5. **Depth vs breadth honesty.** It does 6 domains at ~75–90% each. That's the thesis (integration is
   the product) — but each domain must still clear its category's *table stakes*, and Track-vs-Bevel
   doesn't. **Fix:** either raise the laggard to table stakes or position it honestly; never imply a
   bar you don't hit.

---

## What actually crosses the line (the reliability-first path, not more features)
1. **Test harness over the core math** — nutrition scaling, adaptive TDEE, streaks, sync-merge, money.
   Trust is the floor; this is the single highest-leverage move.
2. **Kill AI-produced numbers** — deterministic food resolution + caching; AI stays on language.
3. **Reproduce + kill the save/sync race** (needs the real test account's login).
4. **Raise or re-frame Track** — add HRV + a real recovery model, or stop implying Whoop-grade.
5. **Per-set + food-log UX polish** — the last 10% that separates "works" from "feels like Hevy/MFP".
6. **Then** the monolith split, so none of the above can regress.

## The honest bottom line for the founder
You have not built a vibe-coded toy. On features, several domains genuinely rival their category
leaders, and **Fight + the whole-life integration are things the incumbents can't do at all.** What's
missing isn't ambition or breadth — it's the boring, unglamorous *reliability engineering* that makes
software trustworthy: tests, deterministic numbers, one source of truth, and honesty where a domain is
lighter than its rival. That's the difference between "impressive for two people" and "worthy of the
public." It's very fixable — and it's a smaller job than everything already built.
