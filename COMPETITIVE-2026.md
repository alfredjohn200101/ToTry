# Competitive read — October 2026

> Produced 26 Oct 2026 by a 35-agent sweep: 7 independent search angles, 98 candidate gaps,
> every one verified against `src/` rather than against a backlog. 77 survived verification.
> Soul / pace / adversary lenses ran over the survivors. Numbers marked UNVERIFIED could not
> be confirmed to a primary source — treat them as claims, not facts.

---

mmary": "Find 2026 competitors in ToTry's spaces, verify claimed gaps against the real source, and return a paced plan",
  "agentCount": 35,
  "logs": [
    "98 candidate gaps to verify against the real source",
    "77 gaps survived source verification"
  ],
  "result": {
    "plan": "# ToTry — competitive decision document
**26 October 2026 · repo at v655 · live PWA current · nothing on any store**

---

## The headline, honestly

**You are not behind on product. You are 7.5 weeks late on one button, and you have been losing ground to yourself while winning against the competitors.**

Three facts, measured in this repo today:

1. **42 of ~60 verified competitive gaps came back ALREADY BUILT or PARTIALLY BUILT.** Not "we could build that" — shipping code, often better than the competitor it was credited to. The daily pledge, moderation-as-a-dial plus a five-stage change model, type-aware withdrawal timelines, vice money crossing into a debt payoff date, database-grounded photo macros, adaptive TDEE, a five-provider vision chain, an eight-lesson toolkit with honest evidence limits. The felt deficit is largely a **knowledge deficit about your own codebase**.

2. **`npm run preflight` says "ready to archive."** Fourteen of fourteen green. Signing works offline (`Apple Distribution: Alfred John (L4BD53PLVF)`, both App Store profiles valid to Aug/Sep 2027). App Store Connect holds builds 4, 5, 6 and 8 — build 8 (v597) uploaded 9 Sep 2026. **There is no record anywhere in this repo of a build ever being submitted for review.** The pipeline has been exercised five times. The review has never been started once.

3. **The thing you would market as your differentiator cannot currently be said out loud.** Verified in the shipping build: `src/shell-head.html:5298` is a block literally commented `<!-- SCORE PANEL -->`, with `.score-big #sc-total` and a stat tile **labelled "Streak"** (`#sc-streak:5313`), rendered on every Fight-tab open. `src/app/10-habits.js:33,36` ships trophies named **"Unstoppable — 70%+ win rate"** and **"Faithful — 7 days clean"**. `src/app/14-nourish.js:5004` renders a **flame icon + "N-day streak · keep it"** on the Nourish date header — and it is **not gated by `nutGentle()`**, so the person who turned numbers off because counting was the thing that hurt them still gets a flame, a keep-it nudge and a success haptic. Ten-plus user-facing strings say "no streak, no score, no badge." Two tabs ship all three. A reviewer catches this in one screenshot.

**And the premise behind the question is unsound.** You have no monetisation path — no StoreKit, no RevenueCat, no billing dependency, and two shipping commitments saying so. LTV is $0 by design. Subscription apps paid ~$50 per trial user on Meta/Google in 2025; health-and-fitness paid CAC runs $8–20 with hidden costs to $60–120 *(Appetiser, Adapty, Semnexus — third-party benchmarks)*. Quittr charges $9.99/mo *(RecurDash, Sep 2026)*. **Those reel placements are an auction whose entry fee is a subscription price. It is not a race you are losing; it is a race you structurally cannot enter under your own stated principles.** Feeling behind because of an ad you could never have bought is reading a signal from a channel you are not in.

---

## The competitors that actually matter

**Google ate five of your eight fronts, in your home market, eight months ago.** Fitbit's Gemini health coach went to public preview Oct 2025; by **Feb 2026 it had rolled out to iOS and Android in Australia**, NZ, UK, Canada, Singapore. The Jan 2026 update added **cycle health, mental wellbeing, nutrition and water**. Public Preview is reachable **without Premium**. Google's own description: "fitness trainer, sleep coach and wellness advisor all in one," with memory of preferences and proactive check-ins *(TechRepublic; Google Store; Android Authority)*. That is body, training, sleep, nutrition, cycle and "mental wellbeing" — fed by a wearable you cannot read, with cross-session memory your Companion does not have. **Per-front depth on Body/Train/Nourish is now investment against Google at $0/mo.** Stop competing there.

**Crisis detection stopped being a differentiator and became a legal requirement — with a private right of action.** Eleven states enacted twelve chatbot laws in 2026; **ten of the twelve require self-harm detection with referral to crisis resources** *(Manatt tracker; ASTHO; MultiState)*. California **SB 243, effective 1 Jan 2026**, applies to companion chatbots whether or not they claim a mental-health purpose, reaches operators serving California users **regardless of where the operator sits**, requires published crisis protocols, and permits suit for the greater of actual damages or **$1,000 per violation plus fees** — "per violation" undefined, no small-operator or free-app exemption found *(NatLawReview; Fenwick; FPF)*. Illinois and Nevada bar AI-delivered therapy; New York's equivalent has been live since Nov 2025. **This is the most strategically important fact in the report and it was in neither prior research round.** Your crisis layer is simultaneously your only genuine moat, now mandatory for everyone else, and the one surface where a solo founder's breadth converts into unbounded statutory exposure. 57 doors maintained by one person is the liability as much as the feature.

**The category's flagship is shrinking.** Hallow's Lent downloads: **2M (2024) → 1.5M (2025) → ~1.2M tracking (2026)**, on ~$40M 2025 net revenue against $105–157M raised *(Appfigures; funding figures conflict across Tracxn and Appfigures — **UNVERIFIED**)*. Ash Wednesday 2026 was **263K downloads in one day against a ~10K baseline** *(Appfigures, 24 Feb 2026)* — the seasonal spike is real and it is the single highest-leverage date in this category. **Ash Wednesday 2027 is the one calendar deadline worth planning around.**

**The AI-therapy end is contracting, and it validates your posture.** Woebot left the US consumer market Jun 2025. Ash (Slingshot, $93M) **withdrew from the UK Jan 2026**, citing no regulatory pathway for a wellbeing product under medical-device rules. Youper reportedly shut 30 Sep 2026 *(single source — **UNVERIFIED**)*. No AI therapy chatbot holds FDA clearance as treatment. "Not a replacement for real help / never diagnose or assess risk" is not only ethics — it is the regulatory posture surviving 2026.

**The one that is genuinely taking your ground by distribution, not product:** Bible Chat ($14M Series A Feb 2025, True Ventures) ran **195 active Meta ads on 14 Sep 2026, 94% video, 108 running 30+ days**, and bids on **~2,000 US App Store keywords** *(Appfigures, Apr 2025)*. Its top user complaint is that **content stays in English despite language settings — 32% of complaints on one vendor page.** Its download claims conflict by two orders of magnitude (25M developer-claimed vs ~500k/month Sensor Tower estimate) — **both UNVERIFIED.**

**Worth knowing:** Finch earns ~$1M/month bootstrapped on 10M+ Play installs at 4.9/600k+ reviews *(Sensor Tower, Jun 2026)* — proof the grace posture sells without a pet. Quittr's Firebase exposed written confessions of 600k users including ~100k self-identified minors *(404 Media, Jan 2026; reported to the founder Sep 2025; headline figures **UNVERIFIED**)*. Covenant Eyes was written up by WIRED for capturing essentially everything on Android and reporting it to church leaders. **The two most-advertised products in this category have both had their data model investigated. Nobody is marketing privacy. You can.**

Mood-first entry is not novel any more — Soultime ships it *(no verifiable traction)*. And **The Firm Foundation** already married faith to WHOOP, and is also a PWA, and is also invisible. That is the clearest evidence available that **being a PWA has not cost you the lead; it has cost you the shelf.**

---

## Three categories

### 1 · WE LACK (and most of it should stay that way)

| Gap | Verdict |
|---|---|
| **A store listing** | The only one that gates everything. 65–70% of App Store downloads start with a search query *(Searchlab/Sensor Tower)*. You have zero index presence. |
| **A shareable link** | 7 meta tags, **0 og/twitter, 0 description**, `<title>ToTry</title>`. `shareCardNative` passes title/text/files and **no `url:` key**. Both share canvases end on a byline. The live URL appears **once** in all of `src/` — the Strava OAuth redirect. **The app is un-shareable at the HTML level while you pay for ads.** |
| Content blocker | 0 code, 0 entitlement, no extension target, separate Apple approval queue. **Refuse the shape** (see below); join the queue now if asking is free — it is the only unknown-duration item. |
| Widget / watch / Siri | One Xcode target. `wovenWeek()` already returns a widget payload. Worthless at zero installs. |
| Qibla | 0 hits. **Both hard inputs already ship** — `geoCoarse()` gives ±0.01°, the plist already has the location string. ~3–4h. |
| Voice entry at the Feeling Door | **REFUSE.** See below — it silences 10.6% of real disclosures. |
| Localisation, produced audio, recitation grading, on-device inference, HRV, Android | **Refuse or defer.** Each is a native project behind a native project behind an unclicked upload. |
| Pre-commitment, GLP-1/pregnancy state, human-readable export, self-experiment loop | Real, defensible, post-launch. |

### 2 · WE HAVE IT AND DO IT WORSE

The sharp ones, all verified:

- **`bridgeToRealHelp` offers a priest to a Muslim, a Hindu, a Buddhist and a secular person.** `04-fight.js:1800`, hardcoded, zero faith branching in the whole function body — on a surface with **seven callers** (three Feeling Door paths, the eating-disorder card, three fuel-plan fallbacks). You already fixed this exact shape twice and left the comment: *"the app offered a Muslim a Confession tracker as if it were his."*
- **`CRISIS_LINES` holds 13YARN and four static surfaces do not.** Measured: `13YARN|139276|13 92 76` returns **0 hits in `src/shell-head.html`**. The sign-in screen (`:4047`), the auth-error screen (`:4086`), the Settings crisis card (`:7165`, under its own footnote saying *"The numbers above are Australian"*) and the Face ID lock overlay (`07-platform.js:134`) each carry three or four hardcoded numbers. **An Aboriginal or Torres Strait Islander person who opens this app at their worst moment and does not sign in is shown four numbers, and none of them is the line built for them — on the screen that exists for exactly that person.** This is the "a list that cannot drift in its NUMBERS can still drift in its LENGTH" lesson, fixed at `bridgeToRealHelp` on 12 Oct and never swept.
- **`openRecoveryBridge`'s two universal rows have no URL.** Three of six carry a link; the two with `''` are *"A GP or counsellor"* — which your own copy calls **"the most underrated door"** — and *"Your community"*, the row shown to every non-Christian.
- **`applyRecommendedSplit` discards the exercises it just generated.** `04-fight.js:309` keeps `{focus, routine:null}`; the preview two screens earlier renders them; `importTemplate` persists them correctly into the same field. The person reads six named exercises, taps Apply, and gets a label — then is toasted *"Build routines to attach to each day."* On the path whose empty state promises *"no guesswork."* **One line.**
- **The AI chain is ordered by cost and `prefer` has zero call sites.** `ai-proxy/index.ts:43` is free-first. `03-person.js:1416` reads `if(opts.prefer) body.prefer = opts.prefer; // e.g. 'anthropic' for crisis SOS` — and **no surface in the app passes it.** A dead gate whose comment names the crisis path.
- **Voice logging apologises on iOS, and the gate is `navigator.userAgent`, not `isNative()`.** Shipping native will **not** fix it on its own.
- **Also:** Nutritionix is unreachable dead code (no UI writes the keys, and `_foodVerified` counts it as verified); the Bible translation picker has four real translations and is never persisted, and saved verses are stamped ESV regardless; zakat's gold nisab branch is dead and the silver basis is one school's, unnamed, on a screen computing an obligation; the Companion has no cross-session memory while the Coach does; three reading plans.

### 3 · WE ALREADY HAVE IT AND HID IT — biggest and cheapest

Every one of these is a **placement or copy** problem, not a build:

- **The whole-person read exists, on Home, unlabelled.** `renderLifeWoven()` renders four today-scoped rows plus a genuine cross-front sentence. **`wovenDays()` — "the one integer no single-feature app can compute" — renders only as `aria-hidden` SVG tie marks with no text inside the SVG.** Unreadable by a screen reader. Unscreenshottable as a claim.
- **The integration moat is implemented in three files, surfaced in one, announced in none.** `_fightFuelLink()` writes a finished sentence into `.line` and **`grep` returns zero consumers** — the brief rebuilds it by hand, for the model only. **Giving is absent from `getLifeState()` entirely**, so the coach does not know whether this person gives or owes zakat.
- **The fast seasons card is in the food tab, inside a `display:none` sub-panel, and omits the two fields no competitor has.** `renderFastSeason` never renders `mercy` or `ask` — the fields that name who each tradition has never bound, and a real human to ask.
- **Multi-faith giving — the one genuinely uncontested square — appears nowhere in `APP-STORE-LISTING.md`.** Zero occurrences of zakat, tithe, sadaqah, dāna, alms.
- **The anti-engagement promise is tour steps 12 and 13 of 13**, behind a first step reading "Skip anytime," in a tour whose own comment says it was built for screen-recording.
- **The privacy policy is the most honest document in the repo** — *"I can technically read this database — I have not, and I don't intend to, but it is not zero-knowledge encryption"* — three levels deep in Settings, behind a collapsed `<details>`, and `privacy.html` is linked from nowhere in the app.
- **The crisis layer is already public and pointed at by nothing.** 54 driven doors, a ~368-sentence benign corpus swept automatically, `docs/CRISIS-REGISTERS.md` on origin/main. There is **no README.** Nobody in this category publishes a false-positive number — Rosebud's CARE scores only the catch direction.
- **`getYourFew` is a better answer to community than any competitor's feed** — a private list of named humans, muted where someone has died, feeding proactive nudges — reachable only from inside the evening ritual, named in no marketing surface.
- **`onThisDay()` is long-horizon memory with a 150-day floor and pull-only delivery** — living in the *money* module, with one call site inside the evening ritual.
- **52 weeks of dated prose-plus-stats syntheses already persist**, in handover shape, whose only exit is a 4MB JSON dump.
- **The Feeling Door is already onboarding step 3**, and the guest button already carries the one sentence a stranger recognises as theirs: *"Something's pulling at me right now."*

---

## REFUSE, and why

1. **Any whole-person score, index or per-area rating.** You killed four such designs on measurement: a picture built on a streak erases a week for telling the truth. **And this refusal is not currently credible — `#sc-total`, the "Streak" tile, the trophy case and the ungated Nourish flame all ship.** Settle that first, or you cannot claim it.
2. **Any social graph** — feed, follow, groups, leaderboard, shared streaks, partner reports. `totry_v`, `totry_journal` and `totry_prayers` sit in the **same `SYNC_KEYS` set** as the budget. Any account-shaped share exposes the Fight tab with the finances. This is also why a **shared household money view is refused on safety, not effort.**
3. **A shared-season participant count.** The communal need is real; a denominator of strangers is the thinnest possible communion and reintroduces the number to compare yourself against. It is also structurally wrong for one tradition — Navratri is deliberately not auto-detected (*"I won't guess at yours"*), so Hindu users would see a count smaller than the truth. **Instead:** render `FAST_SEASONS[*].ask`, which already names a real human per tradition.
4. **Voice at the Feeling Door, the Companion or the journal — until the detector is measured against punctuation-free transcripts.** Independently reproduced against the shipped `detectCrisis`: **46 of 434 real disclosures (10.6%) return null** when transcribed as speech-to-text delivers them, because every clause-bounded pattern needs `.!?`, a comma, a newline or `$`. The losses are the highest-acuity rows — plan *and* means (*"i've saved up the tablets, i think it's time"*), an explicit ask for help, and **nine conditional-frame burdensomeness disclosures** (*"when i'm gone my family would be better off"*), the frame your own docs call the strongest single predictor in the literature. **A false positive is visible on screen; a silenced disclosure is not.** The plist has no `NSMicrophoneUsageDescription`, so the native build cannot even ask yet. Good.
5. **AI grading of devotional practice** (recitation checking). It would be the first surface where a model judges an act of devotion and returns a score. Refuse on principle now, so it is not revisited the moment the wrapper ships.
6. **Machine-translating the devotional prose.** `READING_PLANS` is 95 hand-authored day objects written five times in five registers under a header saying *"Not Christian plans with the deity swapped."* Translating it destroys the only thing that makes it good; translating the shell and leaving the prose reproduces Bible Chat's own 32% complaint.
7. **The warden-shaped blocker.** The incumbent's blocker is its own worst-reviewed component (unreliable VPN, Safari-only). **Instead build the pre-commitment the app already prescribes and cannot honour** — `04-fight.js:971` tells people *"pre-commitment + pacing + an exit are what actually hold a limit"* and nothing in the bundle can hold it. Self-set, time-bounded, exitable in ~90 seconds with a sentence, nobody notified. The 2am self must always get through; a commitment that cannot be unwound at 2am cannot be unwound in a real emergency either.
8. **Giving as a marketplace.** The person **already types the recipient** (`15-giving.js:264`, "Where it went (optional)") and the app discards it. Give *their own* named destination a link. The app never names a recipient the person did not name.
9. **Shame-as-retention in all four shipped forms** — relapse punishment, leaderboards, third-party reports, infinite community scroll. And delete your own: the Streak tile, the flame, *"Most people never make it here."* (To be accurate: the trophy case was already fixed so a logged slip cannot take a trophy back. The remaining problem is that trophies named "Faithful" and "Unstoppable" are gated on a clean count and a win rate at all.)

---

## Sequenced plan

### Pre-App-Store — one working day, three commits, **one** full gate run

| # | Item | Effort |
|---|---|---|
| **0** | **Archive at v655, export, upload, and SUBMIT FOR REVIEW.** `build:index && build:www && sync` → preflight → archive → **verify the IPA, never the archive** (distribution cert, `get-task-allow=false`, arm64, PrivacyInfo, bundle sha). Check `manageAppVersionAndBuildNumber: true` did not rewrite the build. **Do not upload `ToTry-v643-build10.ipa`** — it is 12 versions stale and predates the fix where every share card drew nothing on a fresh install. | ~1h + gate |
| **1** | **13YARN + Suicide Call Back into all four static crisis surfaces, plus a coverage assertion of those blocks against `CRISIS_LINES`.** Two literal rows × three shell blocks + the lock overlay. Pre-launch because App Review reads the un-signed-in screen first, and because a binary freezes this for the length of review. | ~1–2h |
| **2** | **Faith-swap `bridgeToRealHelp`** off `curFaith()`, and give the GP row and the community row their two missing URLs. | ~1h |
| **3** | **Open Graph + meta description + `url:` on `navigator.share` + the URL on both canvases + rewrite `manifest.json`'s description** away from the six-noun list toward the sentence already on the guest button. | ~1h |
| **3.5** | **Decide the streak/score question. One decision, no code.** It determines the listing copy, so it cannot wait. | ~1h thinking |

### Post-launch, in value/effort order

1. `applyRecommendedSplit` — **one line** + a test.
2. Say `wovenDays()` out loud, in text. (~1h)
3. Move the fast-season card to Soul; print `mercy` and `ask`. (~2h)
4. A fourth `brotherSpeaks` kind for a crossed budget line — the threshold is already computed and answered with a CSS class. (~2–3h)
5. Giving into `getLifeState()`, and a link on "Where it went." (~2h)
6. The impulse-hold pot onto the balance sheet — the code says this about itself. (~2h)
7. Qibla. (~3–4h)
8. GLP-1 / pregnancy / breastfeeding as a third branch on the existing sex fork, reaching **both** `_nourishConcern` and `_gentleCounsel`. Reframe, never silence. Fix the three-site `_calFloor` disagreement found alongside it. (~4h)
9. Print stylesheet over the last 12 weekly syntheses — the document markup already exists. (~3h)
10. **Refusal assertions in `core.test.js`**: no `totry_score`, release count stays gated at ≥3, `metricsOff()` gates all three analytics sites, `wovenWeek` stays per-day, `companionThreshold` keeps refusing readiness. (~1 afternoon) **Every soul mechanic in this codebase is held by a comment, not an assertion. They are the least defended code in the repo, exactly when pace pressure is highest.** That is how the score panel happened.
11. Nutrition-label scan on a barcode miss (4-file change: the `image_base64` ratchet + both privacy copies).
12. Widget. Android last — a signed Android build today ships an app whose journal cannot be locked, whose barcode scanner is dead and whose readiness has no sleep source, because five hand-written iOS plugins have no counterpart.

---

## Pace, honestly

**You are not slow.** 472 versions in 115 days. 1,039 commits in 161 days. ~6.5 commits a day sustained for five months by one person. Nothing about this founder's throughput is the problem.

**What is actually costing time, measured over the last 30 days (159 commits):**

| | |
|---|---|
| Lines written into `test/` | **10,761** |
| Lines written into `src/app/` | **6,129** |
| Share of written lines going to the gate | **64%** |
| Commits touching `18-money-deep.js` (1,595 lines) | **0** |
| Commits touching `16-money.js` / `15-giving.js` / `06-train.js` | 1 / 1 / 1 |

Gate coverage by front: **Soul/Give 27%, Body 34%, Moment 36%, Train 41%, Money 47%** against Voice/AI 88%. And read the commit subjects — almost every one is repair of something already shipped, most found by reviewing the previous repair. *"Four assertions that read the source instead of running it." "Five of my own assertions that could not fail."*

**The breadth is consuming the velocity.** Eight fronts is a permanent maintenance tax paid in the only currency you have, and the crisis layer prices every free-text field at a gate above validation, judged per field, with a driven door the same day. **That cost is correct and must not be optimised away** — but it means each additional front compounds, and with SB 243 it now compounds into statutory exposure.

**And you are on a treadmill that gets worse the harder you work.** Apple holds v597. The newest IPA is v643. The repo is v655. Every version of detector and register work since September widened the gap between your repo and the only artefact a stranger can install. **Building faster makes the staleness worse. The only exit is to cut the archive.**

**What would genuinely speed things up:**

1. **Submit for review today.** Review takes days to weeks and may reject; that is the argument for starting it in parallel, not after. It also gates six items in this report that are physically impossible as a PWA.
2. **Run the full gate once per batch, not once per commit.** 4.5 hours becomes 1.5. The single biggest available saving.
3. **Stop competing on health depth.** Google ships it free in Australia. Demote Nourish and Train to *inputs* that feed `_fightFuelLink` and the brief — a positioning decision, not a deletion. That is where the hours go back.
4. **Reduce the door count, not just harden it.** 57 doors maintained by one person is now a liability with a $1,000-per-violation price attached and no size exemption.

---

## Two things you own that beat this entire document

1. **Retention.** Your Supabase holds **132 profiles and 56,750 `app_events`**. The decisive query was blocked by the production-read classifier, so run it yourself:
   ```sql
   select days, count(*) from (
     select anon_id, count(distinct ts::date) days from app_events group by 1
   ) d group by 1 order by 1;
   ```
   **If almost nobody reaches day 2, not one item in this report is your problem and this whole exercise is pointed at the wrong thing.**

2. **`feedback` has 169 rows.** The field's own copy promises *"I read every note."* Nothing answers it. That is primary research on real users, already owned, unread — and it outranks every competitor teardown here. **Read it before building anything from this document.**

---

## What I actually think you should do

Narrow the **promise** and the **maintained surface**, not the data model. The integration moat is real where it is built — `_fightFuelLink`, `monthlyReclaimRate`, a fast season reframing an eating-disorder check — and no single-feature app can compute any of it. Deleting fronts deletes the moat.

But "the moat is soul and integration" has been functioning for two rounds as a reason to keep eight fronts near parity instead of finishing the two things that actually constitute it. The 11pm arrival is the product; the Feeling Door is already step 3; the crisis layer is the asset and has just become a regulated category.

So: **cut the archive and start review. Put 13YARN on the screen a person reaches without signing in. Stop offering a Muslim confession. Make the app shareable. Decide the streak question.** That is one day, and it is the day that has been available since 2 September.

Then write the refusals down as tests, because the mechanics that make this app different from the apps buying those reels are currently defended by nothing but prose — and the ad anxiety that commissioned this research is exactly the pressure under which somebody quietly adds a number.
