# NEXT — the build list

Where To Try stands at **v352**, and what's actually left. Every item below was **verified absent in
`index.html`** (not guessed). Ranked by impact × vision-fit ÷ effort.

Research behind each item is in `RESEARCH-BACKLOG.md`. Ready-to-apply specs live in `specs/`.

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
| 0.1 | **Re-archive as build 3 + upload** | The build sitting in App Store Connect predates *everything* — multi-faith, cycle, the crisis-gate fix. `npm run build:www && npx cap sync ios`, then archive. | ~1h + your GUI |
| 0.2 | **App Privacy nutrition label** | Must now declare cycle data and the usage counters. `privacy.html` is the accurate source. | GUI only |
| 0.3 | **Use it for a week yourself** | Every bug this project has shipped survived because nobody set the value and looked at it (the water goal collapsed to 8ml for exactly that reason). | — |

---

## 🟠 TIER 1 — highest value, small builds

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

**Tier 0.3 before Tier 1.** The highest-value thing right now is not another feature — it's a week of
real use. Six defects this project shipped were found only by someone actually looking, and the app
has grown enormously in a short time. Build from what *your own use* surfaces, and the tutorials will
be truer for it.
