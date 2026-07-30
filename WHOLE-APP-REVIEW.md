# To Try — Cohesion Master Plan (beta-farm → one everyday app)

> The founder's directive: everything built so far was **beta idea-farming**. Now we make it ONE
> cohesive, all-day, functional app where **every feature advances a person through a form of
> stewardship** — body, mind, money, spirit, time, relationships — the way we're called to tend what
> we've been given (faith-rooted, but true for anyone). It was built for one man; to give it to
> everyone it must be cohesive, understandable, and flowing from the first second. It isn't yet.
> This is the whole-app list, not one floor at a time.

## 0. The unifying thesis — STEWARDSHIP of the whole self
One idea ties every feature together: **you've been given a life to steward well.** The app is the
companion that helps you tend all of it, daily. Every screen answers "am I stewarding this well, and
what's the next faithful small work?" (Luke 16:10 — faithful in little; James 2 — faith shows in
works.) Money is already literally named **"Stewardship"** — the whole app should wear that frame.

**The domains (this becomes the app's spine AND its mental model):**
| Domain | Steward your… | Current features |
|---|---|---|
| **Body** | temple — food, training, rest, the result | Nourish, Train, Track |
| **Mind** | attention, peace, the moment | Feeling Door, Companion, SOS, Breath, natural highs |
| **The Fight** | freedom / the will (not enslaved) | Vices, streaks, the plan, urge support |
| **Money** | provision / resources | Debts, reclaimed, payoff strategy |
| **Spirit** | the root beneath it all | Morning, Reflect, Bible, Rosary, Liturgy, Prayer |
| **Time & people** | the day, and who you're with | (weak — the anti-doomscroll ethos, bridge-to-help) |

## 1. First-second flow — onboarding & the opening
- **Problem:** 10-step onboarding front-loads *setup* (name, apps, identity, why, vices) but never
  lands the *thesis* ("this is your steward's companion") or teaches how a day works. New user
  finishes and drops into a dense home with no orientation.
- **Fix:** open with ONE line of thesis; keep setup but trim/merge steps; **end by teaching the daily
  rhythm** (morning intention → the fight when it pulls → evening reflect → I adapt around you), then
  land on the daily spine, pre-filled. First 30 seconds must say *what this is* and *how a day feels*.

## 2. The daily spine + all-day rhythm — Home
- **Problem:** Home is a ~4-screen card wall. No "today + the one thing + the whole self at a glance."
  No morning/midday/evening arc — so no reason to return through the day.
- **Fix:** Home = the steward's day. Time-of-day aware: **morning** → set intention; **through the
  day** → the ONE next thing + the Feeling Door ever-present; **evening** → reflect. Above it, a
  single **"your life, woven"** glance-strip (Body · Mind · Fight · Money · Spirit — one line each,
  tap for depth). Kill the scroll; depth moves on-demand.

## 3. Navigation & mental model — make it match the thesis
- **Problem:** 5 tabs + ~15 sub-views; grouping isn't learnable. The **Fight** (the heart for a man in
  need) is buried as a Grow sub-tab. Spirit has 6 stacked prayer views. You can't predict where things
  live.
- **Fix:** reorganize the map around the **stewardship domains** so the nav teaches the thesis: a
  clear Home + domain hubs (Body, Mind/Fight, Money, Spirit). Surface the Fight at top level. Collapse
  the prayer views behind one **Prayer** hub. Fewer, clearer, predictable doors.

## 4. Cohesion of voice, visual & interaction (the "flowing" ask)
- **Problem:** built over many iterations, so patterns drift — multiple modal styles, card styles,
  button treatments; dismiss/navigation behaviours differ screen to screen; copy voice is strong but
  not uniformly applied.
- **Fix:** one card system, one bottom-sheet/modal pattern, one set of buttons, one dismiss behaviour,
  one voice guide. A consistency pass so every screen feels like the same hand made it.

## 5. Functional & reliable (the "functional" ask — table stakes)
- **Problem:** real bugs erode trust. Meal double-scale (**fixed v281**). Target-save "doesn't stick"
  — persistence is sound but a **sync race** is suspected (needs the real test account to reproduce).
  No automated tests over the critical math, so fixes regress.
- **Fix:** reproduce + kill the sync race with the test login; add a **Node test harness** over the
  core calcs (nutrition scaling, TDEE, streaks, sync-merge) so bugs can't come back; end-to-end
  verify each daily loop.

## 6. The adaptive / "living" layer (stop feeling one-time)
- **Problem:** the app DOES adapt (TDEE recalibration, pattern learning, learned hard hour) but rarely
  *says so* — reads as static setup. (Started fixing for TDEE, v283.)
- **Fix:** make adaptation *speak* in every domain — the coach references last week, the plan shows it
  evolved, the target shows it recalibrated, the fight shows the pattern it learned. The app should
  feel like it's stewarding *with* you.

## 7. Focus — every feature earns its daily place
- **Problem:** feature-dense (beta-farmed). Not everything belongs in the daily core; some overwhelms.
- **Fix:** classify every feature as **daily-core** (in the spine) vs **depth-on-demand** (there when
  needed) vs **cut/merge**. Ruthless about the everyday surface; generous with depth underneath.

## 8. Structural — the monolith (enables all the above safely)
- **Problem:** ~30k lines in one index.html, zero tests → bugs hide, regressions recur, changes are slow.
- **Fix:** begin an **incremental** split (state, UI, domains, AI, sync) with a tiny build step,
  parse-checking constantly. Never a big-bang (per CLAUDE.md).

## The sequenced plan (cohesion, not more floors)
1. **Reliability first** — reproduce/kill the sync race (test login), add the test harness. Trust is the floor.
2. **The daily spine + all-day rhythm** (Home) — the everyday app made real.
3. **Onboarding → thesis + teaches-the-loop** handoff.
4. **Navigation reorg** around the stewardship domains (Fight up top; Prayer hub).
5. **Consistency pass** (voice/visual/interaction) + **adaptation-speaks** pass.
6. **Focus pass** (core vs depth) and, in parallel, the **incremental monolith split**.

## The test that decides it (CLAUDE.md)
Would a man open this the moment he feels something — and instantly know where he is, what today asks
of him, and the one next faithful thing — instead of doom-scrolling? When yes, it's an everyday app.
