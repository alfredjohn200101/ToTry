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

---

## Recommended build order (impact × vision-fit × effort)
1. **Nourish day-navigation** — finishes the tracker credibility (Tier 1 last piece)
2. **Daily pledge** (Fight) — tiny, powerful, pure on-soul
3. **"Reach out" presence for the people you love** — highest vision fit; completes the relationships front;
   subsumes the old "accountability partner." Copy reframe already shipped; next = the few + cadence +
   "log what mattered" + phone-down reminder. Payload for the native "reach out first" push.
4. **Nightly Examen fusion** (gratitude + devotional + the Fight, 3–4×/week, "why/my role" line, multi-faith)
5. **Shareable verse/quote cards** (Soul) — serves the founder's recording + growth directly
6. **Cycle tracking + phase-aware coaching** (Women's health) — serves half the audience; integration moat.
   Phase 1: track + phase prediction. Phase 2: weave into Nourish/Train/Fight.
7. **Habit stacking** anchored to existing fronts — evidence-based, cross-front, zero gamification
8. **Read-aloud + timed sessions** + **P.R.A.Y. devotional spine** (Soul) — audio + universal ritual structure
9. **Subscription auto-detection** (Money) · **Intention-set focus block → Release** · **reflective journaling follow-up**
10. 🟢 **iOS Screen Time blocking** + deeper HealthKit — native, biggest thesis unlock, post-wrapper

## Deliberately NOT building (protect the soul)
Streak-shame · over-goal guilt · notification nagging · leaderboards/gamification · in-app social feeds ·
parasocial dependence · paywalling prayer · selling data. Our moat is that we refuse these.
