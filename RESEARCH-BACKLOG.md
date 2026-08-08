# To Try — Competitive Research Backlog (living doc)

> Built from studying the real category leaders (live app UIs + feature docs), filtered by our vision:
> *counsel not tracking · grace over shame · anti-engagement · points beyond itself · faith full-but-not-forced.*
> **Headline finding:** To Try is at or ABOVE feature-parity with the leader in every pillar — and it has
> the whole-life integration none of them do. The gaps below are a short, high-leverage list, not a rescue.

> **For men AND women both** — the "big sibling" (big brother to a man, big sister to a woman). Gender-aware
> voice + body-math already exist (`userSex()`); every feature and every line of copy must serve both.

Legend: ✅ have · ⚠️ partial · ❌ gap · 🚫 deliberately NOT doing (vision) · 🟢 native-only

---

## 🍎 NOURISH — vs MyFitnessPal / MacroFactor / Cronometer / Cal AI
Already have: 4-DB search, **per-item photo (beats Cal AI on correction)**, barcode, voice log, saved meals,
copy-yesterday, adaptive TDEE, water, fasting, micros, verified-DB signal, portion guide, fuel plan, coaching.
- ✅ **Calorie equation transparency** (ring: Base goal − Food = Remaining) — *shipped v325*
- ✅ **Three colored macro bars** (P/C/F eaten/target) — *shipped v325*
- ✅ **Quick Add** (cal/macros, no food search) — *shipped v325*
- ✅ Recents/frequents (`renderRecentFoods` already existed)
- ❌ **Day navigation** (‹ Today › — log/fix past days). *The one open Nourish item.*
- ⚠️ Food-quality / nutrient-completeness signal (Cronometer/Yuka) — have the micro data
- 🚫 Streak-shame, over-goal guilt, notification nags (MFP retention dark patterns)

## 🛡 FIGHT — vs I Am Sober / Quittr
Already have: streaks, milestones, **recovery timeline** (AI "what body & soul gain"), pattern/trigger
detection, urge intervention (companion — deeper than any of them), money-saved, **lifetime journey**.
- ❌ **Daily pledge** — one-tap morning commitment per active vice (I Am Sober's signature; pure on-soul)
- ⚠️ **Accountability partner done right** — share streak w/ a real trusted person / sponsor; they're
  nudged if you slip (meets the "brotherhood" need WITHOUT in-app community). Extends existing partner feature.
- 🚫 Leaderboards, panic-button gamification, community-farming (Quittr) — violates grace + anti-engagement

## 💰 MONEY — vs YNAB / Rocket Money / Monarch
Already have: "allocate my money" (= zero-based), **subscriptions tracker**, bills, budgets, assets, debt
payoff (snowball/avalanche), statement import, net worth, family contributions.
- ❌ **Subscription auto-detection** from the statement import (surface forgotten recurring charges → reclaim)
- ⚠️ Deepen "give every dollar a job" allocation flow (YNAB's core discipline)
- 🚫 Bill-negotiation-as-a-service / data monetization (Rocket Money model)

## 🕊 SOUL — vs Hallow / YouVersion / Muslim Pro / Insight Timer
Already have: multi-faith readers (Bible/Qur'an/Gita/Dhammapada), today-anchors (prayer times/Hijri),
Rosary/Dhikr/Japa/99-Names, morning+evening rhythm, examen, breath, generated prayers, **Shared Threads**.
- ❌ **Read-aloud (audio)** — TTS-narrate the generated prayer/meditation (Hallow + YouVersion + Insight
  Timer all lead with audio; we can do a lightweight version with the device voice) + **timed sessions (5/10/15)**
- ❌ **Guided reading plans / journeys** — AI-generated, faith-aware, topical multi-day plans
  ("7 days on anxiety", "a week in the Gita on duty"). YouVersion's killer feature; mirrors our fuel-plan pattern.
- ❌ **Shareable verse/quote image cards** — beautiful per-tradition cards to share (YouVersion's viral engine;
  **directly serves the founder's TikTok/Insta recording + distribution**)
- 🟢 **Trust positioning** — ad-free, privacy-first, free vs Muslim Pro (sold data, betting ads). A real
  differentiator for Muslim/Hindu/Buddhist users who distrust the incumbents. (Marketing, not a build.)
- 🚫 Subscription paywall on prayer, engagement streak-pressure (Hallow model)

## 📵 SCREEN-TIME / DOPAMINE — vs Opal / one sec / ScreenZen / Brick  *(our core thesis)*
- ⚠️ **Friction pause before the vice** (one sec's "breathe before you open it") — we have the "before it
  takes over" door + The Release; sharpen it into an explicit pause-interrupt
- ✅ **One wellbeing score** fusing sleep/focus/rest (Opal Score) — `getLifeState`/readiness already does this
- ⚠️ **"Time reclaimed" off the phone** — complement the existing "money reclaimed" metric
- 🟢🟢 **NATIVE HEADLINE: iOS Screen Time / Family Controls (DeviceActivity) blocking** — once wrapped,
  actually restrict the apps someone's quitting (doomscroll, an ex's profile). The "get off the phone"
  thesis enforced at the OS level. NONE of the faith/recovery competitors do this. Biggest post-wrapper unlock.

## 🤖 AI COMPANION — vs Woebot / Replika / Youper / Rosebud
Already have: CBT restructuring + ACT defusion + urge-surfing + grounding, whole-life context, bridge-to-help.
- ⚠️ **Rosebud-style reflective follow-up** — the journal asks ONE gentle follow-up question (process, not perform)
- 🚫 **Parasocial dependence** (Replika "AI friend to do life with") — the OPPOSITE of our soul. Our
  companion moves you THROUGH the moment and OFF the phone toward real people. **Lean into this contrast on camera.**

## 👩 WOMEN'S HEALTH / CYCLE — vs Flo / Clue / Natural Cycles  *(half the audience; currently ❌ none)*
`userSex()` already knows male/female — the foundation exists; there is NO cycle awareness yet.
- ❌ **Cycle tracking + phase awareness** — log period start + length → predict phase (menstrual / follicular /
  ovulatory / luteal). Flo has 460M+ users; this is table-stakes for serving women.
- ❌❌ **Cross-pillar cycle integration (THE moat — no cycle app does this):**
  - **Nourish:** luteal → appetite/cravings rise (~100–300 cal). Frame as *hormonal, not failure* (grace). Optional phase-aware target nudge.
  - **Train:** follicular/ovulatory = strength peak (push); luteal/menstrual = honor lower energy, no forced PRs.
  - **Fight:** PMS week → "this is a harder week hormonally, be extra gentle" — grace for slips.
  - **Readiness/life-state:** factor the phase in.
- 🟢 **Privacy-first framing** — cycle data on-device, never sold (a top-3 concern for women post-Roe; Flo has a data-history problem). Genuine trust differentiator, like the Muslim Pro angle.
- 🚫 Fertility/pregnancy-optimization funnels, data monetization (Flo's model)

## 💤 TRACK / READINESS — vs Whoop / Oura / Rise
Already have: `computeReadiness` (honest self-report + available HealthKit data — NOT faking HRV), check-ins, HealthKit reads.
- ⚠️ 🟢 **Deeper native HealthKit sync** (sleep stages, resting HR, HRV) → a truer morning readiness verdict, post-wrapper
- ✅ Single morning readiness score (Oura/Whoop's core) — already have it, honestly framed
- 🚫 Faking HRV/precision we can't measure (we already refuse this — keep it)

## 🚀 ONBOARDING / ACTIVATION — best-practice study (Calm/Noom/Headspace/Wysa)
- ⚠️ **Get to the "aha moment" FAST.** Our aha = the **Feeling Door → companion actually helping in the moment**
  (or "it sees my whole life"). Current onboarding front-loads a lot of setup (name/identity/why/faith/season/
  vices) before value — consider letting them *feel* one real moment of help earlier.
- 🎥 **This is also the recording demo** — the clip that converts viewers is the app meeting a real feeling and
  moving them through it, not a settings tour.

## 🙏 GRATITUDE · FOCUS · HABITS · DEVOTIONAL · RELATIONSHIPS  *(round-3 research)*
- **❤️ "Reach out" presence (vs SoonCall/Garden/Catchup) — HIGHEST vision fit.** Pick the few who matter
  (parent, old friend, sibling) + a cadence; **log what mattered last time** ("she mentioned the surgery —
  ask how it went"); the reminder ends with **the phone down, a real person called**. Completes the
  time/relationships front; it IS "points beyond itself" + anti-engagement in one feature; natural payload
  for the roadmapped "reach out first" native push. *(Loved-ones copy reframe already shipped as groundwork.)*
  🚫 social-scraping (Cloze), friendship streaks (Snapchat), "relationship scores."
- **🌙 Nightly Examen = "Three Good Things" + drift-review + resolve (fuses gratitude+devotional+the Fight).**
  Evidence-backed gratitude works only with the **"why / my role" line** (benefits persist 6mo); do it
  **3–4×/week, NOT daily** (habituation — science AND anti-engagement agree). Multi-faith via FAITHS
  (Examen / muhasabah / secular review). Highest integration payoff for lowest build. 🚫 mood-charting
  dashboards (Reflectly), gratitude streaks.
- **🧱 Habit stacking / implementation intentions (Atomic Habits).** "After [existing habit], I will [new]" —
  anchor a new habit to an existing **To Try front** ("after I log dinner, I pray one line") = cross-front
  moat. One habit at a time (reuse `applyHomeProgressiveDisclosure`). 🚫 Habitica RPG/XP, Streaks broken-chain shame.
- **🎯 Intention-set single-task focus → The Release (Forest/Flown/Llama Life).** "What's the one thing I'm
  protecting this time for?" + one timer + hand off **off the phone** into the existing Release off-ramp.
  Stewardship of attention. 🚫 Forest's dying-tree loss-aversion, focus streaks/leaderboards.
- **📿 P.R.A.Y. four-beat devotional spine (Lectio 365): Pause → Reflect(text) → Ask → Yield.** A universal
  skeleton that maps onto the FAITHS registry (swap text, keep structure) — a clean fix for "rituals still
  Christian-hardcoded." Morning/midday/night rhythm; night = the Examen above. 🚫 content-library autoplay
  farming (Pray.com/Abide), "you missed your quiet time" guilt push.
- **Steal across all:** Fabulous's **signed intention / commitment contract** — a quiet threshold the
  Brother/Sister voice can hold you to later, no streak, no shame.

## 📊 INTEGRATION & GENEROSITY  *(round-4, inline)*
- **🔗 Cross-front correlations as COUNSEL (vs Exist.io / Bearable / Gyroscope).** Their core is finding
  "when you do X, Y improves." We already have `getLifeState`, `detectVicePatterns`, and the AI weekly
  reflection that connects fronts causally. Make it concrete: surface a FEW honest, high-confidence
  cross-front patterns ("on the days you train, your urges are weaker"; "your worst money days follow poor
  sleep") — framed as counsel + one action, only when the data supports it. THIS is the integration moat
  made visible. 🚫 spurious correlations from thin data, obsessive self-quantification, a chart dashboard
  (measurement over presence — we do counsel, not tracking).
- **🎁 Generosity / giving as stewardship (Money × Soul — vs Zakat+/tithe apps).** Every tradition commands
  it (Christian **tithe** ~10%, Islamic **zakat** ~2.5%, Hindu/Buddhist **dāna**, secular "give back"). On
  vision three ways: stewardship (giving is the antidote to hoarding), faith (multi-faith giving guidance —
  a zakat calculator, a tithe suggestion), and **points beyond the self**. Tie to the existing money engine:
  "redirect some of what you reclaimed from a vice to someone in need." Track your own giving, privately.
  🚫 taking a cut, guilt-driven asks, pushing charities for profit.

## 💪 BODY & REST — Train / Track / Stillness  *(round-5, subagent)*
- **🏋️ Readiness- & RPE-gated "what to train today"** (Fitbod/Juggernaut) — feed the EXISTING readiness score
  + Hevy RPE into the coach: muscle-freshness advice, auto-suggested next-set load, **proactive deloads**
  ("your legs are still cooked — go upper, or go easy; backing off is wisdom, not weakness"). Turns tracking
  into counsel + grace. Low effort, almost no new data. 🚫 1RM-chasing/"faster gains" dopamine framing, paywalls, streak nudges.
- **🎯 State-matched breathwork routing** (Othership + Stanford/Huberman) — route the breath engine BY the
  felt emotion from the Feeling Door, with honest mechanisms: **physiological sigh** (double inhale/long
  exhale — fastest acute stress-down, Stanford 2022) for anxious; **box breathing** for focus; **coherent
  breathing** (~5–6/min) for resilience. Matches the intervention-engine ("matched-to-state, no false
  mechanisms"). Low effort, high fit. 🚫 breathing streaks/challenges.
- **🏃 Walk-run beginner on-ramp + free audio-guided run (a REAL GAP — no run on-ramp today).** Couch-to-5K
  style walk/run intervals assuming ZERO fitness (meets the sedentary sufferer NRC/Runna ignore) + audio-
  guided run (phone in pocket, outside — anti-engagement) that can open/close with prayer-on-breath. Weave
  run+lift+rest in one plan (integration NRC can't match). 🚫 race-goal-only entry, post-run share cards/feed.
- **😴 Sleep debt (forgivable balance) + wind-down ritual → "put the phone down"** (Rise/Sleep Cycle) —
  reframe existing sleep logging as a *forgivable running balance*, not a nightly grade (grace, less anxiety);
  a pre-sleep wind-down that reuses the breath engine + a short reading and ENDS by sending you off the phone
  (The Release). 🚫 smart-alarm-by-mic (phone in bed all night), endless sleep-sound libraries, nightly sleep grades.
- **🧭 Pre-session state check before stillness** (Balance) — ask mood/energy → assemble a matched session.
  It's the Feeling Door philosophy applied to meditation. Cheap, on-vision.
- **Synthesis:** take the competitors' MECHANICS (recovery-gating, RPE auto-regulation, walk-run on-ramp,
  sleep-debt, state-matched breath); refuse their ENGINE (streaks, score-grading, content-hoarding, phone-in-bed, paywalls).

## 🌊 IN-THE-MOMENT STRUGGLES — the Feeling Door doors  *(round-5, subagent)*
*(porn/lust recovery, anxiety/panic, anger, grief — every category independently converged on: shame-based
tracking backfires; presence + acceptance + getting off the phone toward a real human is what works.)*
- **🩹 Grace-based counters everywhere — log a lapse, keep the full history, NEVER reset to zero** (NoFap.io
  "streak freezes"). Reset-to-zero is *documented to backfire* (day-zero reads as "I'm broken" → more use).
  We already have the lifetime journey; extend the same grace to the per-vice streak. Highest impact, total fit.
- **🌋 The Anger Iceberg** — for the "fired up" door: name the hurt/fear/shame *underneath* the anger. The
  Feeling Door thesis applied to rage. Small build, pure soul. 🚫 venting/smash-screen (research: venting *raises* anger).
- **🌊 "Ride the wave" urge-surf with a timer + OFF-PHONE physical tasks** (Calm Harm/DBT) + **DARE's
  accept → run-toward** track — for craving/anxious doors. Anti-engagement by construction (into the body, off screen).
- **✉️ Unsent-letter vault + "write the risky text, then hold it"** — for heartache & the Fight. Extends The
  Release + the brotherSpeaks threshold pause; evidence-backed expressive writing; native to the founder's story.
- **🤝 "Ally, not accountability partner" — share patterns, NOT content** + predictive risk-window prep (Fortify
  JITAI) — the human bridge without surveillance; powers the "reach out first" push. 🚫 screenshot-surveillance, leaderboards, fear-marketing, in-app soothing games.

## 🧭 MIND, MEANING & DISCIPLINE — identity/"why" + the Secular-Stoic track  *(round-5, subagent)*
*(the valuable ideas are all in the STRUCTURE of reflection, not the retention mechanics — borrow the
scaffolding, refuse the engagement engine. Items 1+2+6 compound into a self-authored standard to counsel against.)*
- **🎴 Values Card Sort → top-5 values fed into `getLifeState` & counsel** (ACT/MI, clinically validated). Turns
  ALL counsel into the person's OWN values, not the app's rules: "you said family was #1 — does tonight move
  toward it?" Grace-based accountability; makes the Fight about *something*. Highest fit. 🚫 values-as-a-score/leaderboard.
- **⚖️ Dichotomy of control as an evening-examen module** (Epictetus: what's mine / what's not → ends in
  RELEASE = the letting-go thesis in Stoic language). Deepens the examen; low build; anchors the Secular track.
- **📜 Quote-with-application for the Secular track** — Stoic wisdom + one line on living it + a question, in
  the SAME slot a Christian gets a verse. Makes "faith full, never forced" real.
- **🕰 "On This Day" resurfacing as witness of growth** — surface last season's entry when they open the door
  (pull, never push): "a year ago you wrote this about the same struggle — hear how you speak of it now." Grace, integration-only.
- **🌅 Premeditatio malorum as a morning rehearsal of the hard hour** — pre-arm before the craving (maps to
  the risk-window work); gentle, no notification. Plus a **"word of the season"** (anti-goal — can't be broken).
- **📚 Bite-sized CBT/ACT skill lessons tied to the person's fight** (Intellect model, RCT-validated) — a calm
  place to learn the tool BEFORE the moment (complements the in-the-moment companion). Free, pick-up/put-down.
  🚫 journaling/practice streaks, chip/badge virtue economies, paywalled CBT, conversation-farming AI personas, ikigai quiz funnels.

## 🔁 HABIT FORMATION — the connective layer under every pillar  *(round-6, subagent)*
*(To Try has streaks + a lifetime journey but no habit-formation LAYER — the mechanic that turns a felt
moment into a repeatable pattern. The strongest evidence-based mechanics aren't gamified streaks — they're
planning, anchoring, and identity, which deepen COUNSEL, not add a chore.)*
- **🎯 If-then implementation intentions → capture the plan on the way OUT of the Feeling Door** (Gollwitzer:
  94 studies, d≈0.65, roughly *doubles* follow-through — the single highest-evidence mechanic in the field).
  "When I feel [the 4pm dip / the craving], I will [the move that just worked]." Build a personal if-then
  library; the sibling surfaces the right one at the known risk window. **The Door is the natural host. Biggest single gap.**
- **🌱 Anchored micro-starts + the 2-minute rule** — "after I [existing routine], I will [tiny first rep]."
  Stop asking people to *log/pray/train*; help them *start* (Fogg B=MAP: shrink the Ability barrier). One honest diary line after morning coffee.
- **🪪 Identity-based habits ("cast a vote for who you're becoming")** — reframe the lifetime journey from
  COUNTS to CHARACTER: "you're becoming someone who keeps their word / who is present." Clear's mechanic IS
  our soul (presence over measurement); make it the journey's spine, not points.
- **🕊 The 66-day truth + "never miss twice"** (Lally 2010: median 66 days, range 18–254; *one missed day
  did NOT derail formation*). This is the *scientific license for grace* — teach the real curve, make "never
  miss twice" the rule instead of "never miss." No app teaches this; doing so is a differentiator AND a shame-reducer.
- **🌅 Fresh-Start Effect for re-entry after a lapse** (Dai/Milkman: motivation spikes at temporal landmarks)
  — offer "new week starts tomorrow, begin then" instead of a broken-streak red mark. Ties straight into the
  already-built `restartJourney()`. Plus a gentle **WOOP** script (wish→outcome→obstacle→if-then-plan) for the Door's move-through.
  🚫 reset-to-zero streaks (abstinence-violation effect: perfect-adherence dieters were *47% more likely to binge* after one slip),
  Habitica-style HP-loss/party-damage punishment, gamified virtue points/coins, leaderboards, notification nagging.

## 🌙 FASTING & GIVING ACROSS FAITHS — body + money × soul  *(round-6, subagent)*
*(two ancient disciplines no single-feature app can hold: a fasting app can't tie the fast to your real
energy/nutrition; a tithe app can't tie giving to your real budget. To Try owns the whole person, so it can.
Both are twinned in the traditions themselves — Ramadan pairs sawm with zakat; Lent pairs fasting with almsgiving.)*
- **🌗 Seasonal Fasting Companion — Ramadan / Lent / Navratri / Uposatha** *(highest impact — the integration
  moat).* Auto-lights for the user's tradition and adapts ACROSS PILLARS at once: **Nourish** (suhoor/iftar
  windows from real sunset/dawn; shift calorie/protein/hydration *timing* instead of nagging an empty daytime
  diary; neutral 16:8 window for secular), **Train** (lighter/post-iftar sessions, protect against training
  depleted — ties to `readiness`), **Soul** (the day's reading on *why* we fast), **Fight** (the fast reframed as self-mastery reps).
- **🤲 Faith-aware Giving tracker in Money** *(high impact, clean build — tradition-swapped math on one
  backbone).* **Zakat calculator** (2.5% above nisab, lunar-year aware — a genuine unmet need), **tithe** (~10%
  as a *suggestion, never a debt*), **dāna / sadaqah / secular 10%-Pledge**. Tie it to the ACTUAL budget (only
  To Try knows what they can give) and frame as **stewardship + wellbeing**, surfacing the Dunn/Norton prosocial-spending evidence *honestly* (real but modest), un-gamified, private.
- **🧵 Two Shared-Threads entries — "Fasting" and "Giving"** (echoes-not-equivalence, secular included; low build, pure soul).
- **🍞 The solidarity bridge** — during a fast: "the hunger you feel today, some feel every day — give what a
  meal costs?" Links the Nourish/Fight fast to a Money micro-gift. Only an app holding *both* the fast and the budget can make this move. **Invitation, never guilt.**
  🚫 sacred fast → diet-culture weight-loss streak ("you burned X fasting"); gamified giving / virtue-score /
  public badge (traditions explicitly prize giving *without* show or expectation); overclaiming science (no
  "unlock autophagy," no "giving *makes* you happy"); flattening/equating traditions (zakat ≠ tithe ≠ dāna);
  pushing gendered fasts (Karva Chauth) on women; preaching at secular users; push-guilt on a missed fast/ungiven money.

## ⚠️ THE OVER-TRACKING EVIDENCE — why our REFUSALS are the moat  *(round-6, inline)*
*(a meta-finding that lands directly on the v324–325 MFP-parity Nourish work: the very polish we copied is
what HARMS vulnerable people — so we must ship the guardrails MFP refuses to, or we import its harm with its UI.)*
- **Self-tracking backfires when it tips into obsession** — "the tracking was in control of me"; tracking
  *happiness* makes the most-struggling worse; intense body-focus breeds "failure and self-hatred" ([JMIR review](https://www.jmir.org/2021/9/e25171), [adolescent affordances study](https://www.tandfonline.com/doi/full/10.1080/02673843.2025.2590907)).
- **Calorie apps specifically drive disordered eating** — a U. Louisville study: **~73%** of MyFitnessPal users
  surveyed felt it *contributed to their eating disorder*; a Flinders 38-study review tied regular diet/fitness
  app use to obsessive food/exercise habits; calorie counting elicits the exact **perfectionist, all-or-nothing
  thinking** that is a known ED risk factor ([Flinders/EurekAlert](https://www.eurekalert.org/news-releases/1074348), [BJPsych Open](https://www.cambridge.org/core/journals/bjpsych-open/article/effects-of-diet-and-fitness-apps-on-eating-disorder-behaviours-qualitative-study/2D1EE739D97AB3EFC6573835E4C527BD)).
- **➜ The design implication (turns the risk into the moat):** To Try can have MFP's polish AND the antidote MFP
  won't build — an optional **numbers-off / gentle mode** (log food, don't see calories); **never** a red "over
  budget" shame state (already a NOT-build — reinforced); **detect obsessive patterns** (logging every bite,
  extreme restriction) and have the sibling step in with grace / bridge to real ED help when it looks clinical;
  a first-of-its-kind **"step back from tracking for a while"** affordance; and food framed as *fuel for a life,
  not a math test to win.* The app that tells you to stop tracking is unheard-of — and pure soul.

## 🫂 LONELINESS & THE ETHICAL REACH-OUT — the founder's #1 reframe, now clinically grounded  *(round-7, subagent)*
*(the strongest finding of the whole hunt: the single most-effective loneliness intervention is CORRECTING
the false belief that reaching out is unwelcome — not managing contacts. That's a Companion/CBT job we already
own, and NO relationship app touches it. This is the moat.)*
- **🧠 The appreciation-gap reframe, built into the Companion** *(highest impact × fit — clinically the top lever).*
  Across 13 preregistered studies (~6,000 people) we *systematically* underestimate how much a check-in is
  appreciated — and the gap is **largest exactly when contact has lapsed** ([Liu/Kumar/Epley JPSP 2023](https://pubmed.ncbi.nlm.nih.gov/35816566/)).
  Masi/Cacioppo: fixing this social-threat bias beat social-skills, support, and opportunity ([meta-analysis](https://journals.sagepub.com/doi/10.1177/1088868310377394)).
  So every reach-out nudge carries a line that dissolves "they won't care / it'll be awkward" — *presence applied to connection.*
- **📡 Fire the nudge off the LIFE-STATE, not a calendar** — "you've been heads-down grinding 5 days — who
  haven't you spoken to?" A detected lapse beats an arbitrary timer, and a lapse is *when reaching out lands
  hardest* (surprise). Whole-life integration made concrete; no CRM app can do it.
- **💛 "Your few" — a tiny, private who-you-love list, ANY title** (parent/friend/sibling/partner). No cadence
  pressure, no scores; surfaced at threshold moments as the WHY: "you're fighting this for her — talked to her
  this week?" The emotional spine of the reframe. Gender-aware (already knows sex): men bond *shoulder-to-shoulder*
  → name the **activity** ("see if James wants to train Saturday"), not "call and share your feelings."
- **🙏 A gratitude micro-door** ("tell them the one specific reason") — separately evidenced ([Kumar/Epley 2018](https://journals.sagepub.com/doi/10.1177/0956797618772506)), faith-resonant.
  And **reconnection as a Release off-ramp** (Waldinger: swap screen-time for people-time; revive a stale bond by doing something *new* together).
  *Why this matters here: men with **no close friends rose 3%→15%** (1990→2021); men over-rely on a romantic
  partner for support, so a breakup collapses the whole structure at once — literally the founder's situation.
  "The people you love, any title" is not just kinder framing; the research says it's more honest than "partner."*
  🚫 relationship streaks/scores (Snapchat-streak studies: ~70% feel *obligated* to maintain them), guilt/deficit
  counters ("you haven't contacted X in 30 days"), parasocial dependence, contact-harvesting/growth-loops/feeds, CRM-ifying loved ones into database rows.

## 🎯 THE LANDING — meaningful work as the second half of the detox  *(round-7, subagent)*
*(we already regulate the emotion and get the person off the phone; what's underbuilt is the LANDING — the
concrete, values-aligned act they take with the attention just reclaimed. Behavioral Activation is "minimum
viable work" with a clinical evidence base.)*
- **➡️ A "Next Small Real Thing" hand-off at EVERY exit** *(biggest gap, small build).* The Release / Feeling
  Door must never end on a blank screen — Behavioral Activation (evidence-based, effect ~ antidepressants; *action
  precedes motivation*) says hand over **one small, pre-chosen, values-aligned, phone-OFF act** tied to a pillar.
- **✍️ Close `_feelMove()` with a co-written if-then micro-commit** — "when I close this, I will [smallest act]
  in [room] now" (Gollwitzer d≈0.65). **NOTE THE CONVERGENCE:** two independent agents (habit-formation *and*
  meaningful-work) landed on *if-then-in-the-Feeling-Door* as the single highest-leverage build. Treat that as a signal.
- **🧭 A state-matched action menu from `getLifeState()`** — 3–5 smallest-real-things per pillar, surfaced by
  current emotion + readiness + risk-window. The *doing engine* no single-feature app can build — our integration as action, not a dashboard.
- **🤲 A "smallest act of service / contribution" exit from the craving loop** — self-transcendence research says
  doing something for someone else is the fastest way out of a self-referential loop; clinically supported AND
  faith-congruent (James 2), works secularly as "contribution." Plus a quiet **"clean close"** line (Leroy's
  attention-residue: "where I stopped / next step" frees the mind, cuts the rumination that pulls back to scrolling).
  🚫 Forest-style dying-tree/streak-shame on focus, focus-points/XP/leaderboards, hustle-guilt / "rest is laziness,"
  rigid time-blocking as doctrine, the ikigai-four-circle quiz funnel (a Western invention + lead-gen), Pomodoro-as-doctrine, in-app focus feed, "you were unproductive today" reports.

## 🕯 CONTEMPLATIVE DEPTH ACROSS FAITHS — the Soul pillar's deep layer  *(round-7, subagent)*
*(every tradition independently discovered that training attention quiets the reactive mind — each with a
different anchor: a sacred word, a divine name, the breath, a loved one, bare sensation. "Echoes, not
equivalence" in its purest form — the same human move, five vocabularies.)*
- **💗 Loving-kindness (metta) that STARTS from the people you love** *(highest fit — build first).* Auto-seed
  from the loved ones the user already named, then radiate self → loved → neutral → difficult → all, and *end by
  naming one to actually reach out to* (contemplation into connection). The rare feature that is simultaneously
  the most evidence-backed contemplative practice (Fredrickson broaden-and-build; Zeng meta g≈0.39) AND a literal
  expression of the reframe. Ties straight into "your few" above.
- **🧘 The receptive half of what we already have** — To Try has the *active* repetition side (Dhikr, Japa); add
  the *watching* side per tradition: **muraqaba** (Islam), **dhyana/vipassana** (Hindu/Buddhist), **centering
  prayer / the Jesus Prayer** (Christian), a **secular anchor**. Makes each faith's practice whole.
- **🌬 One breath-prayer engine, phrase swapped per tradition** (Jesus Prayer / *La ilaha illa Allah* / *So'ham*
  / neutral secular) over the state-matched breath animation — cheap on the existing FAITHS registry. Plus a
  **cross-faith evening review** generalizing the examen (Ignatian ↔ Stoic ↔ Islamic *muhasaba* ↔ secular), ending in one tomorrow-intention, not rumination.
- **🛟 An HONEST efficacy-and-safety layer (non-negotiable) + a Release-first timer.** Say it plainly: modest
  effects, *not* superior to other active practices, and meditation **can destabilize a minority** (Britton's
  "dark night"). A HARD crisis gate: acute-distress language → **bridge to a human, NOT a body-scan.** The timer
  is short, *ends*, and off-ramps ("now go do the small thing") — the anti-Calm, retention-inverting on purpose.
  🚫 meditation streaks/gamified charts, farming in-app minutes (the opposite of Release), **paywalling prayer**
  (Hallow/Calm/Headspace/Waking Up/Sabr all gate the sacred — our free access IS the moat), guru/celebrity-narrator
  parasocial dependence, over-claiming clinical benefit, one-size "just breathe" that flattens traditions, pushing meditation on someone in acute crisis.

## 🔔 ETHICAL NOTIFICATIONS / JITAI — how the reach-out & risk-window presence actually land  *(round-7, inline)*
*(the delivery mechanic under the reach-out feature AND the native-wrapper background-push unlock.)*
- **The core principle: intervene only when the person is BOTH _vulnerable_ AND _receptive_** — not just
  vulnerable. A nudge at a known risk window still fails (and *burns the channel* — the user disables notifications)
  if fired when they're not willing/able to receive it. Read receptivity (active vs mid-task vs asleep vs in-app)
  and HOLD otherwise — "presence, not pestering" made rigorous. The literature admits most JITAIs are built with
  "minimal empirical evidence"; our life-state reads both vulnerability *and* receptivity, so we can be the rare
  theory-grounded one ([JITAI design principles](https://academic.oup.com/abm/article-abstract/52/6/446/4733473), [Time2Stop](https://arxiv.org/pdf/2403.05584)).

---

## Recommended build order (impact × vision-fit × effort)
*Revised after rounds 6–7. The research converged hard on a small cluster at the top — the Feeling Door / Release
is the highest-leverage surface in the whole app, and the loved-ones reframe is now backed clinically from three
independent angles (reach-out cognition, loving-kindness, contribution).*

**★ Converged top tier (small builds, highest evidence × soul-fit — do these first):**
- **A. If-then + "Next Small Real Thing" at the close of the Feeling Door / Release** — two agents landed on this
  independently; d≈0.65; turns every rescued moment into a values-aligned real act. The single best ROI in the doc.
- **B. "Your few" + the appreciation-gap reach-out** — a tiny private who-you-love list (any title) + the
  Companion line that dissolves "they won't care," fired off the life-state. Completes the relationships front + the native "reach out first" push payload.
- **C. Grace-based streak reframe — "never miss twice"** — teach the real 66-day curve; a lapse never resets to
  zero (Lally; abstinence-violation research). Reframes existing streaks; pure soul; shame-reducer.
- **D. Numbers-off "gentle mode" + obsession guardrail in Nourish** — the antidote to the MFP-parity harm; turns the round-6 risk into the moat.

**Then:**
1. **Nourish day-navigation** — finishes tracker credibility (Tier 1 last piece)
2. **Daily pledge** (Fight) — tiny, powerful, pure on-soul
3. **Loving-kindness (metta) from "your few"** — most evidence-backed contemplative practice + literal reframe expression
4. **Nightly Examen fusion → cross-faith evening review** (gratitude + devotional + the Fight, "why/my role," Ignatian/Stoic/muhasaba/secular)
5. **Shareable verse/quote cards** (Soul) — serves the founder's recording + growth
6. **Cycle tracking + phase-aware coaching** (Women's health) — serves half the audience; integration moat
7. **Habit anchoring** (after-I-___-I-will-___) + a state-matched action menu from `getLifeState()`
8. **Seasonal Fasting Companion** (Ramadan/Lent/Navratri) + **faith-aware Giving/zakat tracker** — body+money×soul, the integration nobody else can do
9. **Read-aloud + timed (Release-first) sessions** + one **breath-prayer engine** phrase-swapped per tradition
10. **Subscription auto-detection** (Money) · **contribution/service exit** from the craving loop · **gratitude micro-door**
11. 🟢 **iOS Screen Time blocking** + deeper HealthKit + **receptivity-gated background push** — native, biggest thesis unlock, post-wrapper

## Deliberately NOT building (protect the soul)
Streak-shame · over-goal guilt · notification nagging · leaderboards/gamification · in-app social feeds ·
parasocial dependence · paywalling prayer · selling data. Our moat is that we refuse these.
