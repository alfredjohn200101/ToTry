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

## 👩 WOMEN'S HEALTH / CYCLE — vs Flo / Clue / Natural Cycles  *(✅ BUILT — v486 · readiness closed v509)*
`cyclePhase()` estimates the phase from her own logged starts (learned length, "I've lost the thread"
when it runs long); `_renderCycleNote()` places one line in Nourish, Train and Fight; storage is
device-only unless she opts in, and the AI sees it only behind a *second* explicit opt-in
(`cycleGet().aiOK`). v509 closed the last gap: `computeReadiness()` was blind to it, so the Train card
said "chase a PR" on day 2 of her period while the note below it said "drop the load without guilt".
**Note the honesty constraint** — the phase/performance research is genuinely mixed, so the nudge is
deliberately small (menstrual and late-luteal only), the phase is NAMED as the reason, and the advice
says her experience outranks the estimate. Do not let it grow into a verdict on her body.
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

## 😴 SLEEP AS THE FOUNDATION — not a 6th pillar, the SOIL the other five grow in  *(round-8, subagent)*
*(a short night pre-loads the day against EVERY pillar at once — and the fix is counsel, not a tracker. The
build is a signal that biases the sibling's voice, never a sleep score.)*
- **🧠 Feed a `sleep` signal INTO `getLifeState()` that modulates counsel across all pillars** *(highest impact,
  purest integration).* One rough number (last night's hours + a rolling short-sleep flag), zero scores. Then the
  flagship line no standalone can say: **"You slept ~5h — your cravings will lie to you today; go gentle, don't
  trust the 9pm urge."** The science is hard: short sleep collapses prefrontal impulse-control + relapse risk
  (the Fight), spikes ghrelin ~18% / junk-craving reward response (Nourish), runs the amygdala ~60% hotter
  (the Feeling Door), and shifts choices toward risk-seeking (Money) — *all at once.*
- **📵 The phone-down thesis IS a first-line sleep treatment.** Each extra hour of in-bed screen time = **59%
  higher insomnia odds** (~40k-person study); pre-bed screen users lost ~50 min/week. So The Release / a wind-down
  that ends *off the phone, out of the bedroom* isn't adjacent to sleep — it's the intervention. Faith-native
  fit: night examen / Compline / "commend the day."
- **🌅 Two cheap, best-evidenced levers:** a consistent **wake time** (anchor the clock even after a bad night)
  and **morning light** (10–50× more circadian impact than avoiding evening screens). Gentle nudges, not metrics.
  🚫 **NO sleep score / nightly grade** (measurably worsens anxious sleepers — "orthosomnia"), sleep streaks,
  guilt over a bad night, precision sleep-stage theater (consumer staging is κ≈0.2–0.53 — confident-wrong AND
  anxiety-farming), farming bedtime audio that keeps the phone in bed, scare-stats (the "Why We Sleep" overstatement lane — use mechanisms, never the doom register).

## 💸 MONEY-AS-EMOTION — the psychological layer budgeting apps ignore  *(round-8, subagent)*
*(the killer fit: an NHS-piloted CBT program for money worries — "Space From Money Worries" — uses the EXACT
toolkit our companion already runs [urge-surf, ACT defusion, cognitive restructuring, behavioral activation],
and hit d=1.07 on depression. We're not missing the engine; we're missing the DOOR into it.)*
- **🛑 Impulse-spend "pause" that reuses the Feeling Door / companion** *(highest priority — engine already
  exists & is clinically validated for money).* A spending urge is a threshold moment identical to a vice craving:
  route it into the *same* before-it-takes-over door → name the feeling + urge-surf + a **24-hour hold** with a
  gentle return check-in ("still want it?"). ~70% of impulse urges fade within a day. Dopamine spikes on buying
  then crashes → guilt → more spend; BNPL amplifies it. Nobody on the market treats spending this way.
- **🤍 Money-shame → self-compassion path.** Shame drives *avoidance* and empirically *intensifies* hardship
  (the "ostrich effect" — not opening bills); **guilt can motivate, shame makes people hide.** Financial
  self-compassion predicts *better* money behavior. So our grace-over-shame stance literally *is* the treatment:
  a graduated way to open the avoided thing (a bill, the balance) + celebrate the small win ("you looked — that's the hard part").
- **🧭 Values-based spending + "enough" as counsel** ("does this serve the life you want?"; hedonic-treadmill
  reframe; wire in the already-researched generosity return) and a **one-time friction setup** (un-save cards,
  kill BNPL defaults, unsubscribe from retail email — structural, willpower-free). Money is more taboo than
  politics/religion; ~40% of men say money worries isolated them from friends — our "silently suffering" audience exactly.
  🚫 shame/guilt budgeting (backfires), scarcity-anxiety triggers ("you're running out!" — money stress already
  imposes a ~13-IQ-point bandwidth tax), rigid over-restriction (→ binge, like diet culture), gamified/streak-shamed
  saving, selling/mining financial data or affiliate-pushing products, **personalized investment advice (out of bounds — not a licensed advisor).**

## 🚪 ONBOARDING / TIME-TO-VALUE — our ethics and our growth strategy are the SAME strategy  *(round-8, subagent)*
*(the science [lead with felt value, defer commitment] and the soul [be a presence, not a wall] point to one
change. This is launch-critical AND the founder's on-camera demo.)*
- **✨ Move the Feeling Door aha IN FRONT of the auth wall** *(single highest-impact change).* A first-time
  visitor should tap the orb, name a feeling, and get one real companion move **without an account** (guest/local
  state; sync on signup). A signup wall before the first value moment leaks **20–40%** of users *and* hides the
  actual magic; TTV under ~5 min ≈ 3× activation. Defer email-OTP to the natural "keep this / come back" moment *after* felt relief.
- **🎯 Pick ONE first win, not five pillars.** The aha is *emotional relief via the Feeling Door*, not configuring
  Nourish+Train+Fight+Money+Soul. Let the existing `applyHomeProgressiveDisclosure()` keep all five collapsed until
  the one felt win lands — integration is the *retention* story, not the *first-60-seconds* story. Keep only setup
  questions that change the very next screen (sex → voice/math; faith can default to universal + refine later).
- **📣 State the anti-engagement promise out loud** ("this app helps you put the phone *down*; it points to real
  people, and won't farm your attention") — a *conversion asset* precisely because every competitor does the opposite, and it's true.
- **🎬 On-camera first 60s arc** (demo = conversion moment): 0–5s opens straight to the orb (no login) → 5–25s
  names a real feeling → 25–50s does one move + narrates the shift + The Release "put the phone down" → 50–60s
  *only now* whisper the integration promise + soft "keep this" save. Lands magic → shows ethics → teases the moat, in that order.
  🚫 forced signup before any value (current OTP-first flow is the biggest offender), confirmshaming opt-outs, the
  wall-of-setup, first-run streak/guilt pressure (the Duolingo failure mode), fake urgency/countdowns, roach-motel retention, fake progress bars.

## 🌄 AWE, NATURE & THE OUTDOORS — the positive opposite of doomscrolling  *(round-8, subagent)*
*(awe is measurably the INVERSE of the phone loop: it quiets the same default-mode-network self-referential
circuit that rumination and scrolling run on. Free, off-phone, points beyond the self by design. Success is
measured by the phone going AWAY — which is why it's uniquely un-gimmicky for us.)*
- **👀 The "Look Up" Release off-ramp** *(highest fit, low effort, genuinely uncharted).* A first-class Release
  variant: "phone in your pocket → step outside → find one thing bigger than you (sky, tree, horizon) → just
  look." Then it *ends* — returns nothing to log. The awe-walk study proved the single outward-attention
  instruction IS the whole intervention (8×15-min walks → more gratitude/compassion/joy, less distress).
- **🌀 Awe as the self-transcendent EXIT from a craving/rumination loop** (Fight + Feeling Door). When the state
  is self-referential, route to a micro-awe move — awe down-regulates the exact DMN circuitry the loop runs on
  (van Elk fMRI; Piff/Keltner "small self" → prosociality). Mechanism-matched, not generic "go for a walk."
- **🕊 Cross-faith Creation/Awe Shared-Thread** — "the heavens declare" (Christian) · *ayat*/signs in nature
  (Islam — same word as Qur'an verses) · sacred rivers & the divine in elements (Hindu) · impermanence under the
  trees (Buddhist) · awe at the cosmos & deep time (secular). One theme, five echoes of "look up at creation" — slots into the FAITHS registry.
- **🌳 Honest dosing as gentle counsel, never surveillance** — the clean line is **"~20 min at a time, ~120
  min/week"** (White 2019, ~20k people); even **5 min** of green exercise lifts mood (biggest gains in the young
  & those already struggling). Say it as presence, with zero targets/streaks/GPS-tracking.
  🚫 a photo-for-likes awe feed (inverts the "self shrinking in the frame" mechanism — the deepest betrayal),
  gamified awe streaks/XP, GPS-surveillance of outdoor time, over-claiming ("nature cures depression" — the
  flagship study found *no* clinical anxiety/depression change; effects are small & correlational), another logging chore, sky-map/AR that keeps eyes ON the screen.

## 🙏 GRATITUDE & POSITIVE-PSYCHOLOGY — Soul depth, and it's RELATIONAL  *(round-8, inline)*
*(the design steer: the evidence-STRONGEST gratitude is EXPRESSED/relational — the "gratitude visit," pointing
OUTWARD to a person — not a solo journaling streak. Another convergence with the loved-ones reframe.)*
- **💌 Make gratitude relational** — the "gratitude visit" IS the reach-out + gratitude micro-door (round-7):
  frame it as *thank a person*, not journal a list (expressed gratitude g≈0.22 > a private list; effects small
  but robust & **cross-cultural** across 28 countries → fits multi-faith).
- **🌙 Three Good Things → folds into the cross-faith evening review** (end the day naming three, one of them a
  person to thank). **Best Possible Self** (d≈.33 wellbeing/optimism) as an occasional journey reflection — but
  **always paired with one concrete next step**, or it's the empty positive-fantasy WOOP research warns against.
  🚫 gratitude journaling *streaks* (already an AVOID; solo-list form is the weakest), overclaiming (effects are small), forced daily gratitude-as-chore, toxic positivity that denies real pain.

## 🧔 REACHING MEN + THE ACCOMPANIMENT VOICE — the app's core identity  *(round-9, subagent)*
*(what actually reaches men who won't seek help is almost exactly what "accompaniment" IS — walk alongside,
don't fix or preach — so the app's whole DNA is validated. The opportunities are voice calibration + a
load-bearing bridge to real people. Serves women fully too: same posture, `userSex()` tunes entry-point & emphasis.)*
- **🫆 An alexithymia-aware, ACTION-FIRST Feeling Door lane** *(highest impact — reaches the men a feeling-door
  filters out).* "How do you feel?" is a dead end for many men — alexithymia (can't name the inner state) is
  ~2× as common in men (and men are ~3 in 4 suicides; 76.5% in AU 2024). Add a **body/behaviour entry** ("what's
  going on in your body / what do you want to *do* right now") and let regulation happen *through* an action —
  shoulder-to-shoulder, not face-to-face (the Men's Sheds principle). Small change, outsized reach.
- **🗣 An MI / spiritual-direction "voice audit" of `brotherSpeaks`/`brotherGuidance`/Companion** — strip the
  "righting reflex" (rushing to fix/advise); favour offered choices + evocative questions over instruction. The
  accompaniment posture is validated from BOTH sides: clinical (therapeutic alliance = #1 outcome predictor;
  Rogers' unconditional positive regard = our "grace over shame"; Motivational Interviewing's non-confrontational
  spirit) AND pastoral (Christian spiritual direction "listens and asks, offers little direction"; Islamic *suhbah*
  companionship + *naseeha*). Cheap, high-leverage, protects the soul.
- **🌉 A concrete, warm bridge-to-real-help flow** — named human options (priest, counsellor, a mate, a line),
  help drafting the first message, and *celebrating the reach-out as the success metric*. This makes "points
  beyond itself" a feature, and is the antidote to the parasocial-dependence risk (heavy AI-companion use is
  associated with *more* loneliness). Lead the male-facing voice with **strength / mental-fitness / responsibility-
  to-the-people-you-love** framing (not "therapy/healing"), surfacing concrete wins — while keeping the reflective front door intact for women.
  🚫 reinforcing toxic self-reliance ("tough it out"), preachiness/lecturing, fostering app-dependence, a one-size-male
  stereotype that alienates women OR the many men who aren't stoic "fixers," over-promising ("we're your therapist").

## ⛔ CRISIS & SAFETY — evidence-based, and partly LAUNCH-BLOCKING  *(round-9, subagent)*
*(a CLAUDE.md non-negotiable. The shape the evidence converges on: help build a plan when calm, meet warmly in
the moment, route to a human FAST when risk is real — never let the app [esp. the AI] counsel a suicidal person.)*
- **⛔ AI crisis guardrail IN OUR OWN CODE, not the model layer** *(safety-critical + legally live — verify in the
  CURRENT build).* The free-first chain (Gemini→Groq→OpenRouter→Haiku) makes consistent crisis behaviour
  *impossible to guarantee* at the model level. On crisis-keyword/pattern detection: **bypass the LLM** and drop
  into a fixed crisis card — no free-form generation about suicide/self-harm, no "are you sure?" loops, no delay.
  The Character.AI + OpenAI wrongful-death suits (settled Jan 2026) and **California SB 243** (in force Jan 1 2026,
  requiring AI-companion crisis-referral protocols) make this legal, not hypothetical.
- **🛟 A Stanley-Brown Safety Plan feature** — the highest-evidence thing a non-clinical app can own (SPI +
  follow-up cut suicidal behaviour **~45%**, JAMA Psychiatry 2018). Six steps (warning signs → internal coping →
  people/settings for distraction → people to ask → professionals/lines → make the environment safer). Built
  *while calm*, stored offline, shareable with a trusted person/priest/clinician. AU model: Beyond Blue's "Beyond Now."
- **📣 A safe-messaging audit + a prominent, one-tap, offline, logged-out, un-paywalled resource set.** Run all
  copy (SOS, brotherSpeaks, Companion, Feeling Door, AI) against Samaritans/WHO: never a method, always pair any
  mention of suicide with hope + help, "died by suicide" not "committed." Ship **AU-first** (Lifeline 13 11 14,
  Beyond Blue 1300 22 4636, 13YARN 13 92 76, 000) **+ international** (988, Samaritans 116 123, **findahelpline.com** — 175+ countries).
  🚫 (unsafe) AI talking a suicidal person down instead of handing off; any method detail; shame/moralizing ("think
  of your family"); burying resources; gating crisis help behind login/paywall; over-detection that feels surveillant; sycophancy that validates hopelessness.

## 🔐 PRIVACY & TRUST AS THE MOAT — partly LAUNCH-BLOCKING  *(round-9, subagent)*
*(To Try holds THREE GDPR "special categories" at once — health, sexuality, religion — plus money & cycle. Every
app that betrayed users in this exact category got publicly punished, so credibly out-trusting them is a real,
defensible moat. But we route to cloud AI + Supabase, so we must be able to KEEP every promise.)*
- **⛔ SDK/pixel audit + kill-list — verify BEFORE App Store submission.** The single most-punished failure:
  third-party ad SDKs / analytics pixels leaking sensitive data. BetterHelp (FTC $7.8M), Cerebral (~$7M, Meta/
  Google/TikTok pixels leaked PHI), Flo (cycle data → Facebook; Meta found liable 2025) were all fined for exactly
  this. Confirm **zero** ad/analytics trackers touch vice, porn-recovery, faith, money, or cycle data.
- **⛔ In-app data export + true delete** (Apple-mandatory since 2022 — deletion must purge Supabase rows, not
  soft-flag; `deleteAccount()` exists — verify it fully purges + add export) + an **accurate Privacy Nutrition Label.**
- **🕊 A plain-language Trust page** (not a legal policy): what's collected, what never leaves the device, what the
  AI sees, what's stored where, "we will never sell/share your data or show ads," and a clear stance on
  law-enforcement/subpoena requests. Our incentives are *already* aligned (free, no ads, no broker) — the Proton/
  Signal moat competitors who monetize attention structurally can't tell. Make the promise **verifiable**, not just stated.
- **🤖 Honest AI-data handling** — minimize what leaves the device (send the AI only the minimum fuzzy text, never
  the full raw relapse/journal log), **strip PII before the prompt** (`[the person]`, not a name/id), pin per-provider
  no-training/retention terms, and say plainly at the AI touchpoint what leaves & to whom. A kept modest promise
  out-trusts a grand "100% private" one we can't keep. **The cycle feature must ship with a Flo-test stance** (anonymous/local-first + Clue-style law-enforcement pledge) or it's a liability, not a feature.
  🚫 any ad SDK/pixel/broker near sensitive screens, "we take privacy seriously" boilerplate, dark-pattern/bundled
  consent, "data first then consent," collecting "just in case," email-only deletion, claiming "fully on-device" while routing to cloud LLMs.

## ⚔️ RECOVERY-SCIENCE DEPTH — the map AROUND the moment (Fight pillar)  *(round-10, subagent)*
*(the Fight already has the in-the-moment toolkit + the lapse-as-feedback reframe; what's missing is the map
around it — where the person is in the arc of change, what set the moment up, and where to send them. The
evidence itself says grace-over-shame + autonomy-over-control are what work.)*
- **🧭 A stage-of-change mode for the whole pillar** *(highest leverage).* A one-tap "where are you with this
  right now?" (curious / torn / ready / rebuilding / steady-but-shaky) that *changes what the pillar offers* —
  Prochaska: pushing action-stage tactics (goals/plans/streaks) onto a *contemplator* backfires. Makes "meets
  you where you are" literal; drives `brotherSpeaks` tone. The spiral (relapse is a built-in stage) hardens the anti-shame stance.
- **🍎 A HALT check wired into the Feeling Door / companion open** — Hungry→fuel, Angry→grounding, Lonely→reach
  out (your few), Tired→the sleep signal. Best cohesion-fit of anything: HALT resolves the *real need* across the
  body/soul/connection pillars you already have, before the urge tools even fire.
- **🏦 Reframe the lifetime counter as "urges survived / coping deposits," not just clean-days** *(near-free,
  high-impact).* Marlatt's coping→self-efficacy loop: each survived urge raises mastery. Structurally defeats the
  abstinence-violation "back to zero" trap — a lapse can't zero your *skill*.
- **🤝 A respectful "find real support" bridge menu** — SMART Recovery · AA/NA · Celebrate Recovery (surface when
  faith dial is high) · therapy · harm-reduction — faith- and goal-aware, never ranked or pushed ("some people
  find one of these fits"). The *choice itself* is the SDT autonomy that predicts success; points beyond itself.
- **🔎 Calm-moment tools:** an **AIDs "how did I get here?" walk-back** + a personal high-risk-situation list
  (negative emotion & conflict cause >half of relapses) — feeds the "reach out first" risk-window data. Plus a
  saved **Cost-Benefit Analysis** (self-owned reasons the sibling mirrors back), an **ABC** belief tool, and a **DEADS/DENTS** menu inside the urge companion.
  🚫 relapse-as-moral-failure/shame (the AVE — shame *causes* the next lapse), all-or-nothing "back to zero,"
  one-model dogma (forcing 12-step OR secular), pushing action on a contemplator, controlling "you must" language (SDT: it kills motivation).

## 🧠 ADHD / EXECUTIVE FUNCTION — a curb-cut that helps everyone  *(round-10, subagent)*
*(To Try is already, almost accidentally, one of the most ADHD-friendly designs in the category — emotion-entry,
minimum-viable-work, grace, no shame-clock, progressive disclosure. The move is to NAME & SHARPEN what's there,
not bolt on an "ADHD mode." Designing for the hardest executive-function day makes the app better on every ordinary one.)*
- **🔧 A "make it tinier" task-breakdown primitive on the minimum-viable-work spine** *(highest ADHD unlock).*
  Any next-action can be broken smaller on demand (Goblin Tools' superpower — turn "a threat into a sequence"),
  grace-framed spiciness. Big/vague = unstartable; the fix is a concrete first step small enough to survive a low-dopamine day.
- **🧊 An explicit "can't start / frozen / overwhelmed" Feeling Door path** — route task-initiation paralysis (the
  "Wall of Awful") to: pick one thing → shrink it → start a *visible* 2-minute timer → immediate "you started"
  reward. Names the Wall without naming ADHD (serve the *experience*, never diagnose).
- **📊 Streak audit → heatmap + "never miss twice" everywhere** — "streak counters are RSD delivery devices":
  build to day 23, life explodes on 24, the app says "Streak: 0" = proof of failure → delete. Convert any
  broken-chain mechanic to cumulative, reward-only visuals. (Reinforces round-6 item C.)
- **🫂 Body-doubling as first-class presence** — a "start alongside me" companion mode (2-min timer + gentle
  check-in); post-wrapper, a scheduled "start-with-me" at the person's low-activation windows (uses the risk-window
  data; points beyond itself). Plus **externalize now/next/one-thing from `getLifeState()`** — make time & the plan *visible*, not remembered.
  🚫 any streak-zero/broken-chain moment (most RSD-harmful pattern there is), willpower/shame framing ("just do
  it, no excuses"), walls of text / long option menus (overwhelm IS the barrier), sensory-hostile busy design, diagnosing/medicalizing/quizzes, a visible "ADHD mode" that singles people out.

## 🎯 THE CANDID VERDICT — are we actually a game-changer?  *(round-10, subagent — read this one)*
*(a deliberately un-flattering stress-test. Headline: To Try's PHILOSOPHY is more aligned with what actually
changes a life than almost anything in the category. Its RISK is not its values but their execution.)*
- **What actually changes a life (evidence):** intrinsic motivation via **autonomy + competence + relatedness**
  (SDT — and expected/tangible rewards like points/streaks *corrode* it, well-replicated); **identity + self-
  efficacy** close the large intention-behaviour gap (willpower isn't the bottleneck); **human "supportive
  accountability"** (Mohr) is the single biggest amplifier of any digital tool; **flourishing** ≠ symptom-removal
  (Keyes — only ~17% flourish); **growth-through-adversity** via meaning-making (PTG).
- **The humbling limits (what software can't do):** ~**95%+ of wellness-app users are gone within 30 days**
  (Baumel: 3.3% retained at day 30); app effect sizes shrink to **g≈0.18** once publication bias is corrected
  (some is "digital placebo"); only **~2%** of wellness apps have *any* research; **software cannot BE the
  relationship** — it works as a supplement that points to real help + real-world action.
- **Where To Try IS aligned (the rare correct bets):** anti-engagement / release-off-the-phone (the industry
  optimizes the opposite); grace-over-shame (= SDT autonomy + PTG meaning-making); *refusing streaks/points* (the
  one place the science is on our side against nearly everyone); **integration = the honest moat** (meaning is
  whole-life, not per-feature); points-beyond-itself = the supplement-not-substitute posture the evidence demands; Feeling Door ≈ JITAI (where the small-but-real effects concentrate).
- **⚠️ Where we RISK being just-another-app:** (1) **relatedness is the biggest MISSING lever** — the "big
  sibling" is an AI *voice*, not a relationship that *notices whether you showed up*; the reach-out / supportive-
  accountability roadmap is therefore the most important thing we can build. (2) "**Change humanity**" is fine as
  private fuel but must **never leak into product claims** — over-claiming is the tell of apps that don't deliver.
  (3) Don't drift back to **measurement** ("if it only reports, it isn't done" — make it true on every screen).
  (4) Personalization must be **real adaptation** to *this* person, not the category's emptiest claim. (5) No
  outcome proof yet → posture is "**we believe and we're testing**," never "this changes lives."
- **★ The 3–5 highest-leverage moves toward genuine impact:** **(a) build real relatedness** — a genuinely-
  *noticing* follow-up presence ("you told me Thursdays are hard — how did tonight go?"), a human, or a small
  circle that actually notices; **(b) instrument for the RIGHT outcome** — lapses-recovered, real-world actions,
  successful *releases* — and be proud of *low* time-in-app; **(c)** every core loop must pass "does this *move* a
  person?" (cut report-only surfaces); **(d)** engineer self-efficacy + identity (implementation intentions, tiny
  wins, a felt future self); **(e)** discipline the language of transformation — change lives internally, never claim it externally. *That honesty isn't a weakness in the mission; per the meaning/PTG science, it IS the mechanism.*

---

## Recommended build order (impact × vision-fit × effort)
*Revised after rounds 6–10. The research converged hard on a small cluster at the top — the **Feeling Door /
Release is the highest-leverage surface in the whole app** (if-then capture, the "next real thing" landing, the
impulse-spend door, the "look up" off-ramp all live there), the loved-ones reframe is backed clinically from
four independent angles (reach-out cognition, loving-kindness, contribution, relational gratitude), and the
round-10 verdict names the #1 missing lever: **real relatedness / supportive accountability** (a presence that
*notices whether you showed up*) — which is exactly what item B + the native "reach out first" push become.*

**✅ LAUNCH GATE — AUDITED v327 (was: verify before submission). Code side substantially PASSES:**
- **G1. AI crisis guardrail — ✅ VERIFIED.** `detectCrisis()` runs *before* the AI call and bypasses the LLM to a
  fixed crisis card, on all THREE chat surfaces (coach ~6456, PT coach ~6724, companion `companionReply` ~11144).
  v327 added 13YARN + widened suicide-phrase detection. (Legally live: SB 243, Character.AI/OpenAI settlements.)
- **G2. SDK/pixel audit — ✅ NO AD SDK, but the wording here was wrong (corrected 19 Aug 2026).** There is
  no advertising, profiling or data-broker SDK, and no cross-app tracking — that part holds. But this
  bullet said "no analytics trackers anywhere", and that is not true: **GoatCounter** (`gc.zgo.at/count.js`)
  is injected on every launch, native included, and `logEvent()` writes feature counts to an `app_events`
  table against a persistent anonymous id (`totry_anon`). Both are honest, aggregate, opt-out-able and
  **correctly disclosed in `privacy.html` §4** — privacy.html was always right; this audit note was not.
  It matters because it is the note someone would trust when filling Apple's App Privacy form, and it
  would lead them to omit **Usage Data → Product Interaction** and **Identifiers → User ID**.
  See the corrected table in `APP-STORE-LISTING.md`; `PrivacyInfo.xcprivacy` is the ground truth.
  (Supabase JS is now vendored at `vendor/supabase-js.js`, not the CDN — that hardening is done.)
- **G3. Export + true delete — ✅ PRESENT.** `exportAllData()` (full backup) + `deleteAccount()` purges the
  `user_data` row, signs out, wipes local. *Remaining (GUI/your side): fill the App Store Connect Privacy Nutrition Label accurately (privacy.html is an accurate basis).*
- **G4. Safe-messaging — ✅ LARGELY DONE.** Copy uses "not a substitute," pairs any mention with hope+help, AU-first
  + international resources, prominent + honest disclaimer. *Optional: a periodic language re-check as copy grows.*
- **Verdict: no launch-blockers hiding in the code.** Remaining is GUI (the nutrition label) + the re-archive of build 3.

**★ Converged top tier (small builds, highest evidence × soul-fit — do these first):**
- **A. If-then + "Next Small Real Thing" at the close of the Feeling Door / Release** — two agents landed on this
  independently; d≈0.65; turns every rescued moment into a values-aligned real act. The single best ROI in the doc.
- **B. "Your few" + the appreciation-gap reach-out** — a tiny private who-you-love list (any title) + the
  Companion line that dissolves "they won't care," fired off the life-state. Completes the relationships front + the native "reach out first" push payload.
- **C. Grace-based streak reframe — "never miss twice"** — teach the real 66-day curve; a lapse never resets to
  zero (Lally; abstinence-violation research). Reframes existing streaks; pure soul; shame-reducer.
- **D. Numbers-off "gentle mode" + obsession guardrail in Nourish** — the antidote to the MFP-parity harm; turns the round-6 risk into the moat.
- **E. Feeling Door AHA before the auth wall** *(launch-critical + the founder's recording).* Guest/local state so
  a newcomer feels one real companion move before signup; defer email-OTP to a soft "keep this." Fixes a 20–40% leak; ethics = growth strategy.

**Then:**
1. **Nourish day-navigation** — finishes tracker credibility (Tier 1 last piece)
2. **Impulse-spend "pause" → the Feeling Door** — reuses the existing clinically-validated companion engine for money; + money-shame→self-compassion
3. **Daily pledge** (Fight) — tiny, powerful, pure on-soul
3b. **"Make it tinier" task-breakdown + a "can't start / frozen" Feeling Door path** — the ADHD curb-cut that helps everyone; on the minimum-viable-work spine
3c. ✅ **Stage-of-change mode + HALT check** (Fight) — both built. HALT is `openHALT()`, reached from the
   urge doors. Stage-of-change landed v510 as a third vice mode, `watch`: no streak, no line, no pledge,
   no relapse, no verdict — it logs and reflects, and offers a goal ONCE after six logs across three
   days. `viceIsAbstinence(v)` is the predicate; the twenty-two `mode !== 'moderate'` call sites that
   assumed "not moderate = abstinence" all go through it now.
4. **Sleep signal in `getLifeState()`** — "you slept ~5h, go gentle today" biasing counsel across all pillars; + the phone-down wind-down (a first-line sleep treatment). No sleep score.
5. **The "Look Up" awe Release off-ramp** — low effort, deeply on-thesis (phone goes *away*); + awe as the exit from a rumination/craving loop
6. **Loving-kindness (metta) from "your few"** + relational **gratitude visit** — most evidence-backed contemplative practice + literal reframe expression
7. **Nightly Examen fusion → cross-faith evening review** (Three Good Things + devotional + the Fight, "why/my role," Ignatian/Stoic/muhasaba/secular)
8. **Shareable verse/quote cards** (Soul) — serves the founder's recording + growth
9. ✅ **Cycle tracking + phase-aware coaching** — built; see the Women's Health section above.
10. **Habit anchoring** (after-I-___-I-will-___) + a state-matched action menu from `getLifeState()`
11. **Seasonal Fasting Companion** (Ramadan/Lent/Navratri) + **faith-aware Giving/zakat tracker** — body+money×soul, the integration nobody else can do
12. **Read-aloud + timed (Release-first) sessions** + one **breath-prayer engine** phrase-swapped per tradition · cross-faith **Creation/Awe Shared-Thread**
13. **Subscription auto-detection** (Money) · **contribution/service exit** from the craving loop · one-time impulse **friction setup**
14. 🟢 **iOS Screen Time blocking** + deeper HealthKit + **receptivity-gated background push** — native, biggest thesis unlock, post-wrapper

## Deliberately NOT building (protect the soul)
Streak-shame · over-goal guilt · notification nagging · leaderboards/gamification · in-app social feeds ·
parasocial dependence · paywalling prayer · selling data. Our moat is that we refuse these.
