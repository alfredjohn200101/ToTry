# Reels — the feature inventory, ranked for camera

> What to film, in what order, and why each one earns a viewer's attention.
> Scripts for the top items are in `REELS-SCRIPTS.md`.

<!-- Generated from a research pass over index.html and verified against the live app at v369.
     Spot-checked: the ten Feeling Door chips, 'Lock in my plan', 'The plan you set for this',
     'Restless energy', 'Go outside and look up', and the dynamic '🔒 Make my plan for next time'
     label all exist in the code exactly as written here. If you change a label, fix it here too. -->

## TUTORIAL REEL INVENTORY — To Try v367

**Source of truth:** `/Users/alfredjohn/Desktop/ToTry/index.html` (38,985 lines, v367), `/Users/alfredjohn/Desktop/ToTry/SOUL-ARCHITECTURE.md`, `/Users/alfredjohn/Desktop/ToTry/NEXT.md`. Every path below was read in the code, not guessed.

**How this sits inside CREATOR-PLAYBOOK.md (it does not replace it):** the playbook says the app is 1 of 5 pillars and that you *report reps, not resolutions*. A tutorial is the purest possible form of a rep — it is past tense by construction ("here's the thing I built and how I use it"), it can't hand you a false finish, and it teaches rather than announces. Every reel below is shootable in one take on a phone, and the ones ranked highest end by pointing *away* from the screen, which is the one thing no other app's tutorial can do.

**Ranking rule applied:** (a) readable in under 5 seconds with sound off, (b) names a felt problem, (c) structurally impossible in a single-purpose app. Penalised: needs data seeded first, needs explaining before showing, or resolves into a paragraph you have to read.

**Nav spine:** bottom bar is **Today · Fight · Grow · Money · Soul**. The **orb** is a gold/purple circle fixed bottom-right above the nav, present on every screen.

---

## THE RANKED INVENTORY

### 1. The Feeling Door
- **Says:** "The button for when you feel something."
- **Lives:** the orb — every screen, always.
- **Taps:** orb → grid of ten feelings (*The pull · Restless · Flat · Anxious · Heavy · Heartache · Avoiding · Can't start · Fired up · Actually good*) → tap one → a card that names the feeling, gives ONE move, plus "Take a breath first", "Just talk", "Write it down", "Go outside and look up", "Make my plan for next time".
- **Moat:** the entry point is emotion, not data. Every competitor's front door is a log screen or a chat box; this asks what you feel and then routes to the mechanism matched to that state (`_feelMove`, `BREATH_FOR` map). "The pull" with one named vice skips straight to the threshold door already holding your streak, your money and your hour — a chat box cannot do that.
- **For:** everyone, day one, no setup, no account.

### 2. The Release — the app tells you to put it down
- **Says:** "The app that ends by asking you to leave."
- **Lives:** the end of every win path (`theRelease`).
- **Taps:** orb → The pull → "The wave's passing — I'm good" → full-screen 🕊️ *"You came here instead… Now put me down. Go live the next hour."* → "I'm putting it down" → *"Go well."* → the screen clears itself.
- **Moat:** anti-engagement made literal, and the one number the app is proud of is on the Home card — *"N times, you came here and walked back into your life"* (`releaseCount`, shown only at 3+). No VC-funded app will ever ship this shot.
- **For:** anyone who has ever felt used by an app. The single most brand-defining 15 seconds available to you.

### 3. A luteal craving read as physiology, not weakness
- **Says:** "Why your app should know your cycle *and* your cravings."
- **Lives:** Settings → About you (sex) → Settings → Your cycle (on, opt-in) → Track → Cycle row → log day one. Phase then appears across Track, Nourish, Train and Fight.
- **Taps:** log day one → Track shows *"Luteal. Everything costs a little more."* → same phase, retold per pillar: Nourish (*"your body genuinely wants ~100–300 more calories a day… that's hormones, not a failure of willpower"*), Train (*"deload, keep the movement, skip the max"*), Fight (*"willpower is genuinely thinner premenstrually — if you slip, read it as a hard week and not a broken person"*).
- **Moat:** the flagship. Flo can name the phase. Only this app can tell her tonight's craving, today's heavier bar and this week's thinner willpower are *the same physiology, not three separate failures of character* — because the food, the barbell and the fight live in one place. Cycle data is local-only and never leaves the device unless she switches it on.
- **For:** women — and it is the answer to "why not just use Flo?". Corrects the assumption that this is a men's app.

### 4. "I'm feeling it — come here first" (the threshold door)
- **Says:** "What happens when you're about to break your streak."
- **Lives:** Fight → the vice card's red button.
- **Taps:** Fight → red "⚠ I'm feeling it right now" → one screen holding: *N days clean · $X already reclaimed by not buying · you don't need to buy for another N days · what's this really about?* → four ways out (I'm good / breathe 1 min / HALT / full SOS).
- **Moat:** four different apps' data arguing for you in one card, at the second it matters (`openMomentStakes`). A sobriety counter has the streak and not the money; a budget app has the money and not the moment. It also states the honest thing — *"the urge is lying about how much you need it"* — because it can check the real purchase rhythm.
- **For:** anyone quitting anything. The 11pm person.

### 5. The honest ledger, handed back at 11pm
- **Says:** "I wrote down why I quit. The app said it back to me when I was about to fall."
- **Lives:** authored in Fight → vice ⋯ → "Your plan" → "⚖ The honest ledger". Surfaces inside the threshold door (`_reframeHTML`).
- **Taps:** shot A (calm) — type both columns, including *what it actually gives you*; shot B (11pm) — hit the red button and your own words are on the screen.
- **Moat:** SMART Recovery's core tool, autonomy-preserving by design — *your* reasons in *your* words, mirrored back at the threshold by the app that also knows it's 11pm and you slept badly. Requires the two-shot, which is why it isn't #1, but it is the most persuasive single idea in the app.
- **For:** anyone whose motivation goes missing exactly when it's needed.

### 6. The life balance sheet — what the bank says vs. what the streak claims
- **Says:** "I imported my bank statement. It caught me."
- **Lives:** Money → Import CSV → the read opens itself.
- **Taps:** import → *"Here's how it looks"* → in/out/left over per month → where it goes (top 5 with bars) → **WHERE TO LOCK IN** (*"…put half of that at your debt and you're free 7 months sooner"*) → **"[VICE] · WHAT THE BANK SAYS"** in red: *"this card says you've been clean 14 days — and $340 of that spending falls inside it. One of the two isn't true. No judgement either way; I'd just rather you had the real number."* → "Set it straight".
- **Moat:** the balance-sheet enforcer (`viceLedgerHTML`). Rocket Money can't see your streak; a sobriety app can't see your card. And it says the honest thing no fintech says: *"a bank export can't see cash."*
- **For:** gamblers, drinkers, smokers, anyone quietly lying to themselves. Needs a pre-loaded CSV — seed it before you shoot.

### 7. Go outside and look up
- **Says:** "Don't photograph it. Don't post it. Nothing to log."
- **Lives:** offered from the Feeling Door on flat / restless / heavy / fired up.
- **Taps:** orb → Flat → "🌄 Go outside and look up" → *"Find [a tree older than you] — and actually look at it for a minute. Don't photograph it. Don't post it. Nothing to log — I won't even ask how it went."* → "I'm going out" → The Release.
- **Moat:** an app instructing you not to make content out of your own life. Self-transcendence as the exit from a self-referential loop. Shoots as one 12-second walk out of a door.
- **For:** everyone. The most quotable line in the whole codebase.

### 8. HALT — is it hungry, angry, lonely or tired?
- **Says:** "The urge is usually a different need wearing a disguise."
- **Lives:** the threshold door, and the vice card itself.
- **Taps:** red button → "🍽 Wait — am I hungry, angry, lonely or tired?" → pick one → a single matched line and one action → or "Do something for someone else instead".
- **Moat:** because the app holds nutrition, sleep and Your Few, "lonely" can route to a named real person and "tired" can be checked against last night's actual sleep. Elsewhere HALT is a poster on a wall.
- **For:** everyone. Zero setup, four taps, instantly understood.

### 9. The walk-back — "how did I get there?"
- **Says:** "The slip started three hours before the slip."
- **Lives:** Fight → vice ⋯ → "Your plan" → "🔎 How did I get there?"
- **Taps:** type the chain (*stayed up past midnight → took my phone to bed → told myself I'd just check one thing*) → name the one link you'd break → later, that link appears inside the threshold door under **"The link you said you'd break"** with *"You worked that out when you were clear-headed. It is still true now."*
- **Moat:** Marlatt's seemingly-irrelevant-decisions, done in the calm — *"an urge cannot see its own runway."* Upstream awareness a mid-urge chatbot structurally cannot give.
- **For:** anyone who says "it just happened."

### 10. Breath that matches the state, not generic calm
- **Says:** "Eight breaths. The app picks the right one."
- **Lives:** Soul → "Stillness & breath"; also offered inside every Feeling Door path.
- **Taps:** Soul → Stillness & breath → *Settle* (long exhale) · *Reset* (fastest way to drop a spike) · *Steady* · *Cool it* (anger) · *Wind down* · *breath prayer* · *Lift* (flat day) · *Ride the wave*. Orb expands and contracts on the phases.
- **Moat:** matched-to-state, not one box-breathing loop for every emotion — anger gets a cooling breath, a numb day gets an energising one, a craving gets the physiological sigh. The breath prayer swaps words per tradition (Jesus Prayer / dhikr / So'ham / ānāpānasati / wordless), and the intense protocols gate behind a real safety warning.
- **For:** everyone. The animation carries the reel with no narration.

### 11. The coach that already knows the whole week
- **Says:** "Ask it anything. It's read your whole life."
- **Lives:** Grow → Train → Coach, or the "Today for you" card.
- **Taps:** ask something ordinary ("should I train today?") → the answer references training load, sleep, the streak, reclaimed money and, if enabled, cycle phase — `getLifeState()` feeds it all.
- **Moat:** the entire thesis in one answer. Shoot it as a frozen screenshot with one line highlighted; don't ask the viewer to read a paragraph.
- **For:** the sceptic who asks what makes this different from ChatGPT.

### 12. Readiness — "today's a walk, not a PR"
- **Says:** "It told me not to train hard, before I did."
- **Lives:** Home → Readiness card. Also fires unprompted when you open Train with a score under 40.
- **Taps:** open Train after a bad night → the brother speaks once: *trainTired*. Or Home → the ring (score + level + reasons) → tap for the full picture.
- **Moat:** built from sleep, check-ins, load and (if on) cycle phase — four pillars into one verdict. Whoop tells you a number; this changes what the *training* screen offers you.
- **For:** anyone who trains. Visually complete in one card.

### 13. Your body as one system — the energy-balance verdict
- **Says:** "Is it actually working? One sentence."
- **Lives:** Grow → "Your body, one system" (appears once two of Train/Nourish/Track have data).
- **Taps:** Grow → the card: *"Eating ~+180 cal/day vs your real burn → expect +0.16kg/wk; the scale says +0.2kg — your data agrees ✓. Goal build (+0.25kg/wk): off pace."*
- **Moat:** MacroFactor's deepest idea (adaptive TDEE judged against the real scale trend), free, and it says *"low confidence — only 2 days logged"* instead of bluffing. Train→Nourish→Track handing off as one loop.
- **For:** the lifter/dieter. Honest self-doubt on screen is the trust-builder.

### 14. Snap the plate — and correct the app
- **Says:** "Photo food logging where you get the last word."
- **Lives:** Grow → Nourish → Log food → camera.
- **Taps:** snap → itemised draft with portions → ± each portion, edit any item, "add hidden fat / cooking oil", pick the meal slot → log.
- **Moat:** the AI produces an **editable draft**, never a silent number — and the hidden-fat button is the honest touch no calorie app ships. Feeds straight into #13's verdict.
- **For:** the MyFitnessPal switcher. The most conventional reel here, and the easiest to shoot.

### 15. Chase a real high
- **Says:** "Clean dopamine, with the mechanism named."
- **Lives:** orb → Flat → "Chase a real high".
- **Taps:** five options with their reasons — Move (*"the runner's high hits the same receptor the vice did"*), Cold water (*"~2.5× dopamine for hours, no crash"*), Morning light, Reach out to someone, A charged breath. If you're quitting something, it prefixes the recovery-arc note: *"feeling flat after quitting is the reward system healing — not you failing."*
- **Moat:** the framing only exists because the app knows you're quitting something and how many days in you are — and it deliberately does *not* mis-frame a moderator's planned use as withdrawal.
- **For:** anyone in the grey stretch of week two or three.

### 16. Letting go of a person
- **Says:** "For when it's not a vice — it's someone."
- **Lives:** orb → Heartache.
- **Taps:** orb → 💔 Heartache → *"Missing them isn't weakness — it's love that hasn't found its new shape yet. You don't have to stop feeling it. You just don't have to feed it."* → one honest thing (*"watching them isn't reaching them. It's reaching the wound."*) → ride out the urge to look / put it here, not in their feed / one real thing instead / "I keep going back".
- **Moat:** a whole intervention path for grief-of-a-person, with its own voice — healing, no reset-to-zero, *going back is part of letting go*. Gender-neutral throughout. Nothing else in the market has a door for this.
- **For:** post-breakup, bereavement, anyone stuck checking someone's feed. Emotionally the highest-reach reel on the list.

### 17. The Toolkit — learn the tool before the moment
- **Says:** "Free CBT and ACT skills. Two minutes each. No streak."
- **Lives:** Fight → "The toolkit / Learn the tool before you need it" → "Learn the tools — 2 min each".
- **Taps:** open → the app suggests one based on where you are → a lesson gives the idea, *"what it looks like"*, and **"what it's honestly evidenced for"** → and a standing exit: *"🤝 This is bigger than a skill — point me to real help."*
- **Moat:** paywalled everywhere else; here it's free, it names the limits of the evidence, it repeats *"nothing to finish here — no streak, no score. Pick one up and put me down"*, and it's the same vocabulary the in-the-moment companion uses, so the tool is recognised at 11pm.
- **For:** anyone who can't afford therapy. The strongest "this is free" reel.

### 18. Five ways through (DEADS)
- **Says:** "Enduring it is only one of five options, and usually the hardest."
- **Lives:** the SOS path → "🗺 Five ways through — pick one".
- **Taps:** open → five named moves → "Doing one now" → The Release. Plus *"learn these properly when it's quiet →"* into the Toolkit.
- **Moat:** you choose your response instead of being handed one (autonomy predicts follow-through), and it hands off between the in-the-moment door and the calm classroom.
- **For:** the person who's been told to "just resist."

### 19. Can't start — shrink it until it's startable
- **Says:** "Frozen isn't laziness."
- **Lives:** orb → Can't start (deliberately separate from "Avoiding" — a frozen person doesn't recognise themselves in the word *avoiding*).
- **Taps:** name the thing → the app shrinks it → *"Do the smallest visible piece of it — just enough that it's started"* → a visible two minutes.
- **Moat:** names exactly how an executive-function block works without diagnosing anyone, and it's the same door a person reaches from an emotion rather than a to-do list.
- **For:** students, ADHD-shaped brains, anyone staring at a task. Very high relatability per second.

### 20. Lock in the plan for next time
- **Says:** "It hands me back my own words."
- **Lives:** the bottom of every Feeling Door move: "🔒 Make my plan for next time".
- **Taps:** the move that just worked is **pre-filled** → edit or accept → next time you tap that same feeling, your own sentence is at the top of the card under *"The plan you set for this"*.
- **Moat:** implementation intentions (the highest-evidence habit mechanic there is) written from a rescued moment rather than an empty text box — so counsel *compounds* instead of restarting from zero.
- **For:** anyone who's tried and failed to build a habit from a blank slate.

### 21. Every clean day becomes real money
- **Says:** "Fourteen days clean bought me $340."
- **Lives:** Fight → vice ⋯ → "Track the money it costs" → then Money → "Reclaimed by staying clean".
- **Taps:** set the amount + rhythm (per buy / day / week / use, with "one buy lasts N days" for lumpy buying) → the reclaimed figure then shows on the Money tab *and* inside the threshold door.
- **Moat:** the vice→money pipe. A sobriety app has no ledger; a budget app has no streak. And the honest per-purchase model refuses the fake-precision most quit apps use.
- **For:** debt, smoking, gambling, vaping, takeaway.

### 22. The subscriptions you stopped noticing
- **Says:** "It found $1,140 a year I'd forgotten about."
- **Lives:** Money → after a CSV import, the "Found in your statements" card.
- **Taps:** import → *"6 charges that repeat like subscriptions — about $1,140/year between them. Not an accusation, just the ones you may have stopped noticing."* → Track / Not one → *"Now it is a decision again."*
- **Moat:** the one genuine Rocket Money gap, closed — and it ignores groceries, one-offs and irregular coffees (3+ hits, stable amount, real rhythm). Rocket Money charges for this.
- **For:** everyone with a card. Instant, universal, satisfying.

### 23. Your debt-free date moves when you cut one thing
- **Says:** "One category, seven months."
- **Lives:** Money → spending read → **WHERE TO LOCK IN**.
- **Taps:** the read names your biggest *movable* cost, then: *"Put half of that at your debt and you're free 7 months sooner"* — computed against your real debts and your chosen payoff strategy.
- **Moat:** it deliberately refuses to nudge rent or power (*"not a discipline problem"*) or a vice (*"confronted by the ledger, not softened into a nudge"*). Consequence, not a vibe.
- **For:** anyone in debt.

### 24. Bless the people you carry
- **Says:** "The oldest practice, seeded from your own list of people."
- **Lives:** Soul → "Bless the people you carry".
- **Taps:** open → yourself → someone you love (**pre-filled from Your Few**) → someone neutral → someone difficult (*"if someone hurt you badly, skip them — skipping is the correct instruction, not a failure"*) → everyone → then name ONE person to actually go to → The Release.
- **Moat:** loving-kindness reframed as contemplation-into-*contact*, and it changes name and words per tradition — intercession / du'a / maitri / metta / well-wishing. It ends by sending you to a human being.
- **For:** every tradition and none. Visually serene, great slow reel.

### 25. One app, five traditions
- **Says:** "Watch the whole app change."
- **Lives:** Settings → Faith tradition (Christianity / Islam / Hinduism / Buddhism / Secular) + a separate intensity dial.
- **Taps:** switch tradition → the reader, the giving maths (tithe / zakat & nisab / dāna / pledge), the fasting season, the breath prayer, the blessing and the cycle-week line all swap; the backbone doesn't move.
- **Moat:** faith full but never forced, and structurally rather than cosmetically — the codebase refuses to hand a Muslim user the Jesus Prayer while calling it dhikr. Secular users get the same care in non-borrowed language.
- **For:** the person who assumed a faith app wasn't for them. High-value, slight risk of reading as an "app update" — shoot it as *why* you built it that way.

### 26. Shared threads — the same struggle, across every path
- **Says:** "Five traditions, one problem."
- **Lives:** Soul → "Common ground — the same struggle, across every path" → Shared threads.
- **Taps:** open → pick a thread (e.g. creation/awe) → swipe through the five echoes.
- **Moat:** it points *beyond itself* by design and can't be reduced to one tradition's content library.
- **For:** the interfaith household, the doubter, the curious.

### 27. Guided reading plans
- **Says:** "YouVersion's best feature, in every tradition."
- **Lives:** Soul → Reading plans.
- **Taps:** pick a plan → today's passage → done → carry / restart. Read-aloud available on verse surfaces.
- **Moat:** multi-faith by construction, and the plan sits in the same app as the fight it's meant to steady.
- **For:** the daily-reading habit. Familiar, competent, low ceiling as a reel.

### 28. Your Few, and the thing you said you'd remember
- **Says:** "Ask her how the surgery went."
- **Lives:** Soul → Your Why → Your few.
- **Taps:** add up to 12 people → against each, a note: *"what to remember — e.g. ask about her surgery"* → the reach-out card later says the specific thing back → 🔕 marks someone you carry *without* reminders (someone you've lost, or who it isn't right to contact) — *"they stay part of your why."*
- **Moat:** relationships as part of the same life-state, and the mute flag is a piece of grace no CRM-style "keep in touch" app has. It is also the person The Release sends you to.
- **For:** anyone drifting from the people who matter. The 🔕 detail is the whole reel.

### 29. Sort your values — then get asked about them
- **Says:** "It argues from my standard, not its own."
- **Lives:** Soul → Your Why → "What actually matters to you" → Sort my values.
- **Taps:** sort five → write one line of why → afterwards, every Feeling Door card asks *"You said [family] matters most to you. Does the next hour move toward it?"* — and it is **deliberately suppressed when you're heavy**, because holding a person's own standard up to them when they're low is shame, not counsel.
- **Moat:** the suppression rule is the moat. Only an app that knows your emotional state can know when to stay quiet.
- **For:** anyone tired of being motivated at. Needs setup, so mid-rank.

### 30. Numbers off
- **Says:** "Log food without seeing a single calorie."
- **Lives:** Grow → Nourish → the tiny "numbers on / numbers off" toggle above the totals.
- **Taps:** tap it → calories vanish from the diary, the trends, the coach's mouth and the log confirmations. Nourishment is still counted; nothing is said back to you.
- **Moat:** it's honest all the way down — a v362 fix stopped gentle mode hiding the numbers in the diary while still handing the coach the exact figures. Disordered-eating safety as a first-class feature.
- **For:** anyone with a history with numbers. One-tap, instantly legible, quietly the kindest thing in the app.

### 31. "This is usually your hardest stretch"
- **Says:** "It was waiting for me at 11pm."
- **Lives:** fires on app-open inside your learned risk window, once per window per day.
- **Taps:** open the app in your hard hour → *"I'm here. [Name], this is usually the hardest stretch for you with [X]. It's often boredom that starts it. Nothing has to be happening — I just wanted to be here before it does."* → walk me through it / I'm steady tonight.
- **Moat:** the pattern engine learned that hour from your own logged moments — and "I'm steady tonight" is itself recorded as a win. Cannot be demoed on command, so it's a talking-head-plus-screenshot reel rather than a live one.
- **For:** everyone in the fight. Enormous emotionally, awkward to film.

### 32. It points you to real people
- **Says:** "The app tells you when it isn't enough."
- **Lives:** orb → Heavy → "I might need real help"; also from the Toolkit and the craving loop.
- **Taps:** open → SMART · AA/NA · Celebrate Recovery (faith-gated) · your GP · someone who knows — never ranked, never framed as the app failing you.
- **Moat:** the stated non-negotiable, shipped. Every engagement-optimised competitor is structurally incapable of this screen.
- **For:** the person past what an app should handle. Ethically the most important reel; visually plain.

### 33. It bends when you've been away
- **Says:** "No 'you missed 5 days.'"
- **Lives:** Home → "Today for you"; plus the "Low day?" toggle on the same card.
- **Taps:** return after 3+ days → *"It's good to see you. 5 days away is nothing — we don't pick up the whole plan today, just one honest step."* → or tap "Low day?" → the whole card strips to one gentle step: *"Some days, showing up is the whole victory."*
- **Moat:** streak-shame is on the permanent do-not-build list, and progressive disclosure hides depth from new users entirely. Requires a lapse to demo.
- **For:** everyone who's quit an app out of guilt.

### 34. Search everything you've ever written / Year in review
- **Says:** "One bar over every journal, win, verse, examen and prayer."
- **Lives:** Settings → "🔍 Search your history"; Settings → "📅 Year in review".
- **Taps:** open search → one query across all of it. Year in review renders the full year of trying, any time.
- **Moat:** only possible because one app holds all of it. Utility rather than soul — a good "did you know" filler reel.
- **For:** long-term users. Weakest of the list for a cold audience.

---

## SHOOT THESE FIRST — the ten

1. **The Feeling Door (#1)** — two taps from anywhere, no setup, no account, and it teaches your entire thesis in five seconds: the door is an emotion, not a log screen.
2. **The Release (#2)** — an app that says "now put me down" is the most stop-scrolling sentence you own, and it's a single unbroken shot.
3. **The luteal read (#3)** — the clearest "impossible anywhere else" in the app, it corrects the assumption that To Try is for men, and it reframes a felt weekly experience for half your audience as physiology instead of failure.
4. **"I'm feeling it — come here first" (#4)** — one screen where four apps' worth of data argue for you, at the exact second it counts; this is the reel that makes people understand what integration *buys* them.
5. **Go outside and look up (#7)** — twelve seconds, contrarian, endlessly quotable ("don't photograph it, don't post it"), and it lets you make content about not making content.
6. **HALT (#8)** — four taps, zero setup, and everyone recognises themselves in "the urge is a different need wearing a disguise" immediately.
7. **The life balance sheet (#6)** — pre-load a statement and the "one of the two isn't true" reveal is the most dramatic frame in the whole app; it also proves the app will tell you the truth about yourself.
8. **The honest ledger mirrored back (#5)** — a two-shot (calm, then 11pm) that lands the single most persuasive mechanism you built: your own words, returned when your motivation has left the building.
9. **The Toolkit (#17)** — the strongest "this is genuinely free" reel, and the *"what it's honestly evidenced for"* panel plus the "this is bigger than a skill" exit shows integrity better than any claim you could make about yourself.
10. **Snap the plate (#14)** — the easiest shoot on the list and the one that converts the MyFitnessPal crowd; put it in the first batch specifically because it's low-effort and broadens the funnel while the deeper reels do the brand work.

---

## Two production notes

**You already built your own producer.** Home → "Your week" → **"🎬 Make this week's content"** (`generateWeeklyContent`) takes the week's real strands plus any proof clips attached to your sessions and returns a numbered shot list and a copyable caption, with the honest line *"To Try produces — you finish it in CapCut, Reels or TikTok. Your videos stay in your camera roll."* Use it for the weekly playbook video. Attach proof clips inside workouts and they show up there next week.

**What not to shoot first, and why.** #25 (multi-faith), #27 (reading plans), #34 (search / year in review) and #31 (the risk-window greeting) are all real and all strong, but they either read as an app changelog — which your stated intent rules out — or can't be triggered on demand. Hold #31 until you can film it happening to you for real; that's a scar-not-wound story, and per the playbook it's only publishable once you can hear a careless comment about it without it costing you anything.
