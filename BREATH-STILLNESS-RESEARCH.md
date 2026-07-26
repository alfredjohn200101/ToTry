# Breath, Stillness & Contemplative Prayer — Research Brief

> Commissioned before building. The question isn't "should we add breathwork" (everyone has it).
> It's "what does the evidence actually support, what's honest, and where is To Try's unfair
> advantage?" Answer: the practices are real and proven; the game-changer is **timing** — delivering
> the right one at the moment of craving, using the whole-person state only this app has.

## 0. The spine — "faith without works is dead" (James 2:26)

The deepest purpose here isn't calm, or even sobriety in the abstract. It's to ensure a person is
always **doing something — one concrete work — instead of nothing.** The vice wins in the gap: the
moment willpower is gone and there's nothing left but to surrender or scroll. The breath is the
**minimum viable work** — the single act a person can *always* perform, at their absolute weakest,
with no equipment, no willpower, no setup. "You can always take one breath" means there is always a
work available, which means faith stays alive *through action*. Every small work — a breath, a
prayer, an honest log — is faith made real, and small works compound into a person remade. The app's
one job, in the hardest minute: make sure the answer to "what can I do right now?" is never "nothing."
Everything below serves that.

## 1. What the evidence actually supports (with the caveats)

**Long exhale / slow breathing — the mechanism is real and understood.**
A longer exhale restores vagal outflow; slow, deep breaths make blood-pressure oscillations rhythmic,
engaging the **baroreflex**, which raises parasympathetic ("rest") activity. Resonance sits at ~5–7
breaths/min. This isn't wellness folklore — it's cardiovascular physiology (respiratory sinus
arrhythmia + baroreflex). *So: exhale-weighted, ~6/min breathing has a genuine calming mechanism.*

**Cyclic sighing / physiological sigh — the strongest recent single study.**
Balban et al. 2023 (Stanford, *Cell Reports Medicine*), ~110 adults, 5 min/day for a month: brief
breathwork — **especially exhale-focused cyclic sighing — beat mindfulness meditation** on mood
improvement and reduced resting respiratory rate. *Caveats:* one modest trial, self-reported mood,
no HRV change found. Read it as strong evidence for a real, fast effect — not proof breathing
"beats" contemplation (whose deeper gains — attention, decentering — this study didn't measure).

**HRV biofeedback / resonance breathing (~6/min) — meta-analytic support.**
14 RCTs / 794 people: medium effect on depressive symptoms (d ≈ 0.38, p = .0006). Largest effect
sizes reported for **anxiety**. Emerging proof-of-concept that resonance-paced breathing alters
neural response to addiction cues.

**Mindfulness-Based Relapse Prevention (MBRP) + urge surfing — the addiction backbone.**
Bowen et al. RCTs (168, then 286 participants; *JAMA Psychiatry* 2014): MBRP cut substance-use days
and lowered relapse vs. treatment-as-usual out to 12 months. **Urge surfing** — riding the craving
wave without acting, because it crests and passes — is the exact mechanism already in the app's
"You came here first." *This validates what To Try already does; breath is the body-side lever that
pairs with it.*

**Compulsive sexual behaviour / problematic porn — promising but early.**
8-week MBRP pilot (n = 13): less time on problematic use, plus drops in anxiety, depression, and
OCD symptoms. Broader mindfulness-for-addiction reviews show small-to-large effects on craving.
*Caveat:* pilot-level; no large RCT yet for this specific condition. Honest framing required.

**Contemplative Christian prayer — real, younger evidence base.**
Knabb & Vazquez 2018 RCT: daily **Jesus Prayer** significantly reduced stress (large effect) in
Christian students. Centering-prayer studies show large stress reductions (one d ≈ 1.40, small n);
a large online RCT (N = 702) tested centering prayer for flourishing. *Caveat:* some studies show
trends but non-significant anxiety/depression change; the literature is smaller than secular
mindfulness. But for a believer, the meaning itself drives adherence and depth — an advantage, not
a footnote.

## 2. The honest part — "pineal activation" and "Christ consciousness"

**No credible science supports "pineal gland activation / decalcification / third-eye."** The pineal
is a real endocrine gland (it makes melatonin, governs circadian rhythm). It contains trace enzymes
for DMT synthesis but **not** psychoactive levels — and the brain makes DMT elsewhere too. Fluoride/
Wi-Fi "calcification" claims are nonsense. Building any feature on a pineal mechanism would be a
credibility risk and, for a health app, an App-Store-1.4.1 misinformation risk.

**But the longing underneath it is real and reachable.** The states people chase there — deep
stillness, presence, transcendence, nearness to God — are genuinely produced by meditation, slow
breathing, and contemplative prayer. For this app's Catholic soul, the honest and *deeper* rendering
of "Christ consciousness" is the tradition's own: **the mind of Christ (1 Cor 2:16), theosis, and
contemplative union through breath prayer (Hesychasm / the Jesus Prayer).** That's what we build —
and it serves a person of any belief, who simply gets the breathing.

## 3. The game-changer is NOT the practice — it's the timing (JITAI)

Calm, Headspace, and Othership already own "a library of guided breathwork/meditation." Competing on
library size is a loss. The differentiator with its own evidence base is the **Just-In-Time Adaptive
Intervention (JITAI)**: the right micro-intervention, at the right moment, adapted to the person's
current state. Meta-analysis: JITAIs improve mental health (small but real, g ≈ 0.15), with benefits
sustained to 6 months even after <6 weeks of use. Microrandomized addiction trials show CBT/ACT
prompts **cut craving and negative mood within 20-minute windows**.

**To Try is built for exactly this, and no competitor is.** It already has:
- `getLifeState()` — the whole-person state (fight, readiness, mood, money, activity).
- The fight's **learned hard hour** and pattern ("usually hits: late nights, alone, phone in hand").
- Threshold detection (`brotherSpeaks`) and the Feeling Door (entry through emotion).

A breathwork library is something you *remember to visit*. To Try can make the breath and the prayer
**come to you** — at your known risk window, inside the feeling you just named, matched to context
(alone at home vs. in public; midnight vs. midday). That is the difference between content and a
presence — and it's the whole soul of the app applied to the body.

## 4. Proposed design (evidence-grounded — not yet built)

**Engine:** a deterministic animated breath-pacer (orb expands on inhale, contracts on exhale),
protocols mapped to *purpose*, each honestly evidence-tagged:

| Moment | Protocol | Evidence |
|---|---|---|
| Acute urge / panic | Physiological sigh (double inhale, long exhale) | Balban 2023 — fastest down-regulation |
| Anxious / spinning | Resonance, long-exhale ~6/min (in 4 / out 6) | Baroreflex + HRV meta-analysis |
| Can't sleep / racing | 4-7-8 | Long-exhale mechanism |
| Steady / centering | Box 4·4·4·4 | Arousal regulation |
| Faith on | **Breath prayer** (Jesus Prayer on the breath) | Knabb & Vazquez 2018 |
| Faith light | Presence (receive / release, wordless) | Secular equivalent |

**Deployment — the JITAI layer (the actual moat):**
- **Urge/SOS** ("You came here first"): offer *Breathe with me* (sigh) **before** willpower is asked —
  urge-surfing + physiological down-regulation together.
- **Feeling Door:** anxious → resonance, restless → sigh, wired so the anxious path *does* the
  breathing instead of merely telling the person to (it currently just tells).
- **Known hard hour** (reach-out-first data): proactively offer 2 minutes *before* the craving peaks.
- **Soul (formation):** breath prayer / stillness as a daily contemplative practice — the slow build
  of the "mind of Christ," Morning/Reflect integration.

**The anti-gimmick loop (honesty + efficacy):** one-tap 0–10 before/after ("how strong is the pull? /
how tense?"), logged. Over time, show the person **their own proof it works** (the proximal effect
the JITAI trials measure), and feed it to the pattern engine. Earns trust with their own data.

**Dose & soul:** 1–3 minutes, then it hands you back to life (anti-engagement). **No streaks on
breathing** — don't gamify calm. Keep the bridge-to-real-help intact.

**Safety/honesty:** physiological claims only ("this calms your nervous system"), never cures. One
quiet caution: skip breath-holds/rapid breathing while driving, if pregnant, or with cardiac/
respiratory conditions. Never a pineal/third-eye claim.

## 4A. The differentiated technique library — matched to state, NOT generic calm

Two layers, both evidenced:
- **Rescue (state / acute):** the right breath the moment a wave hits — matched to the exact feeling.
- **Formation (trait / chronic):** small daily practice that raises the baseline over weeks, so the
  waves move the person less. This is the "small works → larger, better person" — and it's measurable.

Crucially, **not everything is calming.** A flat, numb, no-drive day needs *activation*, not sedation.
Anger needs *cooling*. The choice-moment needs *focus*. Matching the tool to the state is the point.

### Rescue matrix (mapped to the Feeling Door states the app already has)

| State (Feeling Door) | Technique | What it does | Register | Evidence tier |
|---|---|---|---|---|
| **The pull** (craving) | Physiological sigh → then a light breath-hold | Drops the peak fast, then *practises tolerating discomfort* — same muscle as urge-surfing | Down | Strong (Balban) + emerging (Buteyko) |
| **About to act** (the choice) | Box / tactical 4·4·4·4 | Steadies the decision under pressure — self-control in the split second | Focus | Moderate (military/attention) |
| **Anxious / spinning** | Resonance, long exhale ~6/min (in 4 / out 6) | Baroreflex → parasympathetic | Down | Strong (HRV meta-analysis) |
| **Angry / fired up** | Cooling breath (Sitali) + long exhale | Cools the heat, drops agitation | Down | Moderate/soft |
| **Flat / numb / no drive** | Gentle energizing (bellows / breath of fire) | **Raises** energy, breaks sluggishness, lifts mood | **Up — activating** | Soft (safety-gated) |
| **Restless** | Physiological sigh | Discharges the buzz | Down | Strong (Balban) |
| **Avoiding / scattered** | Nadi Shodhana or box | Focus, then engage the task | Focus | Moderate (44-RCT review, mixed) |
| **Can't sleep** | 4-7-8 | Long exhale + hold → wind down | Down | Mechanistic |
| **Any / spiritual** | Breath prayer (Jesus Prayer) or Presence | Meaning + calm; formation | Down | Moderate (Knabb & Vazquez) |

### The signature insight — CO₂ tolerance IS urge tolerance
Buteyko treats panic by having people sit with *light air hunger* — a small, controlled dose of
discomfort that "works like a vaccine," lowering CO₂ sensitivity over time. **Learning to stay calm
through "I need air" trains the exact capacity needed to stay calm through "I need the vice."** No
calm-app makes this bridge. A gentle, safety-gated air-hunger practice could be To Try's *signature
sobriety mechanic*: the breath becomes a **training ground for riding cravings**, not a sedative you
hide in. (Gate carefully — not for panic-prone beginners, cardiac, or pregnancy.)

### "Small works" is literally measurable (the formation layer)
- Daily **resonance breathing** (~6/min, 20 min × 4 wk) **raises resting HRV / vagal tone** — a trait
  marker of resilience; the control group didn't change.
- **Box breathing**, 8 wk → better sustained attention + lower cortisol.
- **Buteyko** → lower CO₂ sensitivity (a trait shift).
- **MBRP** → higher trait mindfulness, fewer relapses at 12 months.
So "small works that build a better person" isn't a slogan: daily practice compounds into a
measurably calmer, more tolerant, more attentive baseline. The rescues get easier because the person
is *becoming someone the waves move less*. In the app's language — the body learning theosis.

### Safety — must gate per technique
- **Gentle by default** (sigh, resonance, box, 4-7-8, breath prayer, cooling): safe for nearly everyone.
- **Intense** (energizing bellows/breath of fire; breath-holds / air hunger): one-time safety
  acknowledgment — skip if pregnant, cardiac/respiratory, high blood pressure, or panic-prone; never
  while driving or in water; stop if dizzy. New users default to gentle; intense ones unlock
  deliberately, never flashed.

## 4B. Natural highs & the weed-recovery engine — the honest answer to "even if pseudo"

**You don't need the pseudoscience.** The natural-high space is scientifically loaded, and — the
beautiful part — the best natural highs hit the *exact systems weed depletes*. That's a stronger,
truer story than any third-eye claim.

**The honest line isn't "only proven things." It's "never lie about the mechanism."** A traditional
or ritual practice can be offered honestly — as something people find meaningful, framed truthfully
("traditional; people report this; the evidence is thin") — and the ritual/meaning/expectancy effect
is itself real and can be harnessed *without deception*. What we never do is assert a false mechanism
(decalcifying a gland, "detoxing toxins," activating a third eye) as fact. Pseudo *practices*, framed
honestly, are fine. Pseudo *claims* are what break trust — and trust is what makes the app work.

### The natural-high catalog (honest, tiered) — for the flat / anhedonic recovery phase

| Natural high | What it does | Evidence | Note |
|---|---|---|---|
| **Exercise** (aerobic + resistance) | Runner's high = **anandamide on the same CB1 receptor THC hits**; also *reduces cannabis craving & use* | Strong | The natural high *on weed's own system*. Already in Train. |
| **Cold exposure** | Dopamine **+250% for ~2 hrs**, norepinephrine +530%, mood lift — no crash | Good | Safety-gate: heart conditions, blood pressure |
| **Breath-induced altered state** (cyclic hyperventilation) | Real euphoria via hypocapnia + transient hypofrontality — *same mechanism family as the runner's high* | Real but risky | **Most safety-critical**: fainting/seizure, panic-trigger sensations; NEVER near water or driving; never a default |
| **Morning light / sunlight** | Dopamine + serotonin, circadian repair | Good | Trivial, safe, daily |
| **Awe / music-chills / flow / connection** | Dopamine & mood | Varies | The natural-high bouquet |

### The weed-specific engine (what no one else does)
Quitting downregulates the reward system: **anhedonia peaks ~week 2** ("nothing generates
enthusiasm" — dopamine recalibrating), **cravings peak weeks 2–3 in habitual contexts** (after work,
before bed, social), **CB1 receptors normalize ~day 28**, real stability by month 6. The natural
highs don't just distract — **exercise refills the very endocannabinoid receptors weed emptied**,
healing the system that's causing both the flatness and the cravings. So To Try can:
1. **Name the flatness** so it isn't frightening ("this is week 2 — your dopamine is recalibrating; it
   lifts around day 28"). Psychoeducation is itself protective.
2. **Predict the hard windows** (JITAI: the weeks-2–3 craving peaks, in the person's *own* habitual
   contexts — which the app already learns).
3. **Prescribe receptor-informed natural highs in the moment** — exercise for the endocannabinoid
   refill + craving cut; cold for the dopamine; a breath for the acute wave.

### The recovery nuance (honest balance — don't become another dopamine loop)
Two schools: chase natural highs (replace the dopamine) vs. "dopamine detox" (reduce stimulation to
reset). The honest answer is **both, sequenced**: in the anhedonic early phase, natural highs
(exercise, cold, light, connection) genuinely *repair and bridge* — therapeutic, not indulgent.
Alongside, the **stillness / formation layer builds tolerance for baseline** so the person isn't
dependent on peaks. Natural highs to heal the system; stillness to build the floor. The guard against
becoming a new dopamine chase is the soul itself — anti-engagement, small works, points beyond itself.

## 5. Phased build (when approved)
- **Phase 1 — Engine + prove it.** Breath-pacer + 3 protocols (sigh, resonance, breath prayer);
  wire into the anxious feeling and the urge/SOS moment; 0–10 before/after. Ship, measure.
- **Phase 2 — The JITAI layer.** Proactive offer at the learned hard hour; context adaptation; the
  personal "it worked N of your last M waves" proof.
- **Phase 3 — Formation.** Breath prayer as a daily Soul practice; a stillness/contemplative track;
  examen integration.

## 6. The thesis, in one line
> Every breathwork app is a library you visit. To Try is the only one that knows your whole life and
> your hardest minute — so the breath, and the prayer, arrive exactly when the wave rises. That's not
> a feature. It's the difference between content and a presence.

## Sources
- Balban et al. 2023, *Cell Reports Medicine* — brief structured respiration vs. meditation: https://www.cell.com/cell-reports-medicine/fulltext/S2666-3791(22)00474-8
- HRV biofeedback & depression meta-analysis (14 RCTs): https://pmc.ncbi.nlm.nih.gov/articles/PMC7988005/
- Slow breathing / extending exhale (mechanism): https://www.sciencedirect.com/science/article/pii/S0965229923000249
- Slow breathing & HRV review 2025: https://pubmed.ncbi.nlm.nih.gov/40252198/
- Bowen et al. — MBRP for substance craving: https://pmc.ncbi.nlm.nih.gov/articles/PMC3408809/
- MBRP pilot for compulsive sexual behaviour disorder: https://pubmed.ncbi.nlm.nih.gov/33216012/
- Knabb & Vazquez / centering prayer flourishing RCT (N=702): https://bmcpsychology.biomedcentral.com/articles/10.1186/s40359-024-01836-0
- JITAI for mental health — systematic review & meta-analysis: https://pmc.ncbi.nlm.nih.gov/articles/PMC12481328/
- JITAI for addictive behaviors (CBT/ACT proximal craving effects): https://clinicaltrials.gov/ct2/show/NCT03538652
- Nichols 2018 — DMT & the pineal gland, fact vs. myth: https://journals.sagepub.com/doi/abs/10.1177/0269881117736919
- Cleveland Clinic — pineal gland (actual function): https://my.clevelandclinic.org/health/body/23334-pineal-gland
- Runner's high depends on endocannabinoids, not endorphins (PNAS): https://www.pnas.org/doi/10.1073/pnas.1514996112
- Aerobic exercise reduces cannabis craving & use: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3050879/
- Cold-water immersion — positive affect & brain-network changes: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9953392/
- Cannabis craving treatments — evidence review (exercise + rTMS top non-pharm): https://pubmed.ncbi.nlm.nih.gov/38299652/
- High-ventilation breathwork — effects, mechanisms, clinical considerations: https://www.sciencedirect.com/science/article/pii/S0149763423004220
- Decreased CO₂ during circular breathwork → altered states (Nature Comms Psych): https://www.nature.com/articles/s44271-025-00247-0
- Resonance breathing RCT — HRV & cognition (trait change): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8924557/
- Alternate-nostril breathing — systematic review of clinical trials: https://www.msjonline.org/index.php/ijrms/article/view/3581
- Slow breathing & extended exhale — mechanism: https://www.sciencedirect.com/science/article/pii/S0965229923000249

## Evidence tiering (honest labels for the app)
- **Strong** (RCTs / meta-analyses): slow/resonance breathing for anxiety; cyclic sighing for mood;
  MBRP + urge surfing for craving; exercise → endocannabinoid high + reduced cannabis craving.
- **Good / emerging**: HRV-biofeedback trait gains; cold exposure for dopamine/mood; box breathing
  for focus; Jesus Prayer for stress.
- **Real mechanism, high caution**: cyclic-hyperventilation "natural high" (fainting/panic/water risk).
- **Traditional / thin evidence** (offer honestly, never as fact): cooling breath, alternate-nostril,
  bellows/breath-of-fire, "regulate sexual energy" claims.
- **Rejected** (no credible science; never claim): pineal "activation"/decalcification, third-eye.
