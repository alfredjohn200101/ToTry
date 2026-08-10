# Reels — the production system

> Decisions already made, so you never start the day choosing.
> Principles live in `CREATOR-PLAYBOOK.md`; this is the mechanics.

<!-- Generated from a research pass over index.html and verified against the live app at v369.
     Spot-checked: the ten Feeling Door chips, 'Lock in my plan', 'The plan you set for this',
     'Restless energy', 'Go outside and look up', and the dynamic '🔒 Make my plan for next time'
     label all exist in the code exactly as written here. If you change a label, fix it here too. -->

## THE PRODUCTION SYSTEM — To Try / Alfy
### A build-order for someone who feels behind. Every decision is already made. Read once, then just follow the days.

> This sits **under** `/Users/alfredjohn/Desktop/ToTry/CREATOR-PLAYBOOK.md`, not beside it. The playbook is the *law* (document the living; report reps not resolutions; scars not wounds; capture daily, publish weekly; the app is 1 of 5). This is the *machine* that executes it. Where they seem to disagree, the playbook wins.

**The honest read on "we are so behind":** you are not behind on content. You are behind on *having a machine*. People who post for 3 years without one still have nothing. You will have one by Sunday. Ten days of stock footage is worth more than ten posts of panic.

---

## 0. PRE-FLIGHT — two 10-minute code jobs before you shoot a single frame

You already built the thing that solves the privacy problem: **demo mode**. It snapshots your real data, downloads a backup, hard-disables cloud sync, and restores in one tap. That is the whole answer to "my real vices and money are in there." Two small changes make it filmable.

**Job 1 — let a separate studio account load demo data.**
`/Users/alfredjohn/Desktop/ToTry/index.html`, line **32914**:
```js
const DEV_EMAILS = ['alfredjohn200101@gmail.com','alfredjohn200101@yahoo.com'];
```
Add `'alfredjohn200101+studio@gmail.com'`. Gmail plus-addressing delivers to your normal inbox, so signup and confirmation just work, but it is a **different To Try account with zero real data in it**. Now the demo panel appears there.

**Job 2 — move the demo banner off the nav bar.**
Line **32990**: the banner is `position:fixed; bottom:0` — it **covers your tab bar**, so any tutorial that taps Today/Fight/Grow/Money/Soul is unfilmable. Change `bottom:0` to `top:0` and drop the font to 9px. Do **not** remove it. A small red "DEMO DATA" strip in your videos is on-brand honesty — it tells viewers this is not a real person's confession, which is exactly the integrity your app is built on.

Then: `node --check` the extracted script, bump `APP_VERSION` + `CACHE`, ship. Standard rules apply.

---

## 1. THE DAILY CAPTURE HABIT — 7 minutes, one slot, no editing, no naming, no decisions

### The trigger (this is the whole reason it survives)
**You already have a daily habit inside your own app: the Evening check-in.** Chain to it. The moment you tap save on the evening check-in, you pick up the camera. No new alarm, no new willpower, no new slot in the day. If the check-in didn't happen, the capture didn't happen — and that's allowed (see §6).

### The three things, always in this order

**① THE LEDGER — 60 seconds, Voice Memos app, never published.**
Three prompts, out loud, past tense only:
1. What did I actually **do** today?
2. What did I **feel**?
3. One thing I **learned**.

This is the raw ore. 95% of it never sees daylight. Its job is to make writing captions on Sunday take four minutes instead of forty, and to keep the habit alive without the pressure of performing daily. **Past tense is the rule** — future tense hands your brain a false finish line (Gollwitzer). No "I'm going to." Only "I did."

**② THE PIECE TO CAMERA — 90 seconds max, front camera, vertical, ONE take.**
You are not allowed a second take. Not a rule for quality — a rule for *survival*. Retakes are where 7 minutes becomes 40 and the habit dies in week two.

Answer **one** question. You don't choose it; the day chooses it:
| Day | The one question |
|---|---|
| Mon | What did I build, fix or break today? |
| Tue | What did I do today that I didn't feel like doing? |
| Wed | What does someone using this app get wrong at first? |
| Thu | Where was God in today — including if He felt absent? |
| Fri | What did my family cost, give, or teach this week? |
| Sat | One idea from a book, in one minute. |
| Sun | — (batch day, no PTC) |

**③ THE B-ROLL TAX — 3 clips × 8 seconds, silent, no talking.**
Hands doing the thing. Pull three from this list, different ones each day, never think about it:
shoes going on · water filling a glass · the kettle · phone going face-down on the table · phone plugged in *in the kitchen* · a page turning · the keyboard from over the shoulder · plates being made · weights being loaded · the walk out the door · rosary on the desk · the drive · the empty gym at the start · the laptop closing.

Total: **~7 minutes.**

### The bad-day floor — this is what makes it a system and not a mood
**20 seconds of voice memo. Say the date, say one sentence. Done. That counts as a full capture.** No PTC, no b-roll, no guilt, no make-up day. A system that needs motivation is not a system; it's a hobby with a schedule. The floor is never zero, and the floor is never hard.

### Where it goes, and how it's findable — the trick is you do NO admin daily

Daily you shoot into the phone camera roll and **slate it**: before you talk, hold the phone and say out loud, flat, two seconds:

> *"August eleven. Faith. Piece to camera. Why I still go when I don't feel it."*

That's it. That's the filename, spoken. You will hear it when you scrub, so nothing is ever lost, and you never rename a file on a phone keyboard at 10pm. **Slating replaces daily file admin entirely.**

Renaming happens **once a week, in the batch**, dragging from Photos into Files/iCloud Drive:

```
/Content
  00_INBOX/              ← this week's dump, unnamed. Emptied every Sunday.
  01_CLIPS/2026-08/      ← named, ready to use
  02_SCREEN/             ← screen recordings (demo account only)
  03_PUBLISHED/          ← anything that has gone out. Never re-post from 01.
  04_LEDGER/             ← the voice notes. PRIVATE. Never published. Ever.
  05_HOOKS.txt           ← one line per unused idea. Your blank-page insurance.
```

**Naming format** (one format, forever):
```
YYYY-MM-DD_pillar_type_slug.mov

2026-08-11_faith_ptc_why-i-still-go-when-i-dont-feel-it.mov
2026-08-11_app_screen_feeling-door.mov
2026-08-11_disc_broll_shoes.mov
```
`pillar` = `faith` `disc` `build` `fam` `health` `app`
`type` = `ptc` `screen` `broll` `vo`

Sorted chronologically by default, greppable by pillar, and you can see at a glance which pillar you've been starving.

---

## 2. THE WEEKLY BATCH — Sunday, 90 minutes, produces 6 posts

**Sunday 4:00pm–5:30pm.** After Mass, before dinner. Locked. This is the only appointment the whole system has.

### The interchangeability rule (this is the actual craft secret)
**Same spot. Same chest-height framing. Same plain dark crew-neck tee, no logo, no text.** Buy three identical ones. Because everything looks the same, a clip you shot in August can be cut into a video in November and nobody can tell. That's how one hour a week produces a year of posts. Variety comes from the b-roll and the screen recordings, never from your shirt.

### The run of show

**0:00–0:10 — SETUP (do not skip, do not improvise)**
Phone vertical, propped at chest height on a stack of books, ~60cm from your face (arm's length). Window at 45° in front of you. Airplane mode ON. Do Not Disturb ON. Auto-Lock: Never. Front camera, 1080p 30. Fan/AC off. Say one test sentence, play it back, check face is bright and voice is clear. Then don't touch the setup again for 80 minutes.

**0:10–0:40 — SIX TALKING HEADS (30 min, 5 min each)**
From the week's ledger you already have the lines. Write **one sentence** per video on paper first — that's your whole script. 45–60 seconds each. **Two takes maximum, then move on.** Shoot in this order (easiest first, so momentum is built before the hard one):
1. The teach (an idea from a book) — lowest exposure, warms you up
2. The build (what you shipped this week)
3. The rep (a concrete thing you did)
4. Health
5. Faith
6. The one that matters most — the scar, family, the honest one. Shot last, when your voice has stopped being self-conscious.

**0:40–1:00 — THREE SCREEN RECORDINGS (20 min)**
Studio account, demo data loaded, checklist in §3. 40 seconds each, mic OFF, voiceover later. Three features from the tutorial queue (§7). Slow taps, 1-second pause before each tap.

**1:00–1:15 — B-ROLL TOP-UP (10 clips, 15 min)**
Silent. Walk around the house and film hands, objects, light, the desk, the door, the street. This bank is what makes every future edit possible. Ten clips a week = 500 a year = you never have a hole to fill again.

**1:15–1:30 — PACKAGE & SCHEDULE (15 min)**
Captions written straight out of the ledger voice notes. Load all six into the scheduler (Meta Business Suite is free and does Instagram + Facebook; Buffer's free tier covers the rest). **Schedule for 7:30am each weekday.** Then rename this week's clips into `01_CLIPS/` and empty `00_INBOX/`.

**Output: 6 posts, and you don't open a camera again until Monday evening's 7-minute capture.**

### The fixed weekly posting grid — so you never choose
**Month 1** (tutorials front-loaded, because that's the near-term unlock):
Mon = tutorial · Tue = discipline · Wed = tutorial · Thu = faith · Fri = build · **Sat & Sun = nothing.**

**Month 2 onward:**
Mon = build · Tue = discipline · Wed = tutorial · Thu = faith · Fri = family / health (alternate weekly) · **Sat & Sun = nothing.**

Five a week. Weekends genuinely off. That is not laziness, it's the anti-engagement soul of your own app applied to yourself — you cannot sell "put the phone down" while posting seven days a week.

---

## 3. MINIMUM VIABLE KIT — phone only, and the data-safety protocol

### Kit: your iPhone. That's the list.
Buy nothing for 90 days. If you're still doing this at day 90, buy a £15 phone tripod and a £20 wired lav mic — nothing else, ever.

### Light — one rule
**Face a window. Never have a window behind you.** Sit 2–3 feet back from it, angled 45° so the light wraps rather than flattens. Shoot between 9am and 4pm. That's it — that's the entire lighting course.
**At night:** face a lamp with a white wall behind the lamp (bounce, not glare). Or face your open MacBook with a blank white document full-screen at max brightness — a free, genuinely good key light. Never rely on the ceiling light alone; it puts shadows under your eyes and makes you look tired, which undermines everything you're saying.

### Audio for free — the room matters more than the mic
Bad audio loses people faster than bad picture. Free fixes, in order:
1. **Film in the bedroom, door closed, wardrobe doors open behind the camera.** Fabric kills echo. A bedroom beats a living room every time.
2. **Kill the hum:** AC off, fan off, fridge not in the room, window shut against traffic.
3. **Get close:** phone at arm's length, 60cm. Distance is the #1 cause of thin, roomy audio.
4. **Free lav:** if you own any wired earbuds with an inline mic, plug them in and tuck the mic under your collar. Instantly better than the phone mic.

### iPhone screen recording — the truth about taps, and how to make it read

**The honest fact: iOS screen recording does not show touch indicators.** Any tutorial that promises "visible taps" from a native screen recording is wrong. So there are two modes, and you use Mode A for 95% of everything.

**MODE A (default — screen recording + voiceover)**
The tap is invisible, so you *make the tap legible by rhythm*:
- **Pause a full second before every tap.** The stillness reads as intent.
- **Tap once, deliberately.** No double-taps, no hesitation-taps, no fidgeting.
- **Never scroll-fling.** Slow, short scrolls only — a flung scroll is unreadable on a 30fps recording.
- **Voiceover afterwards in CapCut**, saying what you're tapping ("I open Today, and I tap the orb"). The words carry what the finger can't.

**MODE B (occasional, for real-hands texture — you already own the gear)**
Prop your **MacBook** facing down over the desk, open **QuickTime → File → New Movie Recording → FaceTime camera**, and film your hands using the phone on the desk. Free, no second phone needed. Use this for one hero shot a month, not for tutorials.

### THE RECORDING-MODE CHECKLIST — 8 taps, every single time, no exceptions
1. **Airplane Mode ON** (this is the one that stops a real notification banner with a real person's name leaking into a published video)
2. **Do Not Disturb ON**
3. **Battery above 50%** (no red battery in the status bar)
4. **Brightness 80%, Auto-Brightness OFF**
5. **Auto-Lock → Never** (Settings → Display & Brightness)
6. **Control Centre → long-press Screen Recording → Microphone OFF**
7. **Sign in as the studio account, load demo data** (below)
8. **Confirm the red DEMO strip is at the top, not over the nav**

### THE DATA-SAFETY PROTOCOL — three layers, and one absolute rule

> **THE ABSOLUTE RULE: you never film your own signed-in account. Not once. Not "just this one screen." Not "I'll crop it."**
> Your real vices, real relapse dates, real debt figures, real journal, real Examen and real prayers are in there. A single frame is permanent and un-deletable once it's on someone else's screen recording. There is no version of this where filming your real account is worth it.

**Layer 1 — two containers on one phone.** iOS gives home-screen web apps and the App Store build storage containers that are *isolated from Safari*. Use that:
- **Your real life** = the installed To Try app (home screen / App Store build). Never filmed.
- **Studio** = To Try opened in **Safari**, permanently signed in as `alfredjohn200101+studio@gmail.com`.

No sign-out/sign-in dance before every shoot, no chance of muscle-memory error. Two icons, two lives.

**Layer 2 — demo mode, which you already built.** Studio account → Settings → **Load demo data**. It seeds a genuinely content-grade persona: **"Alex,"** 92 days in, two vices (a 54-day clean streak with 7 honest early slips; doomscrolling recovering), weight visibly down over the journey, 14 days of real meals so the food diary films *alive*, debt shrinking, 40 logged fight-moments clustered at 9–11pm so the risk-window and pattern surfaces actually fire on camera. It snapshots your real keys, downloads a backup file, and **hard-disables cloud sync** so nothing fake can ever reach your account. One tap restores.

This dataset is better for video than your real life would be, because it's *designed* to be relatable-and-winning rather than just true.

**Layer 3 — the 60-second pre-publish scrub.** Before every upload, scrub the clip at 2× hunting for six things:
1. A real name in the greeting/header
2. A notification banner (Airplane mode should have prevented it)
3. Contact or real names in Shared Threads
4. Real money figures
5. Real journal / Examen / prayer text
6. Your email in Settings

**If any of them appear: delete the clip. Do not crop it, do not blur it, do not "it's fine, it's small."** Reshoot. It's 40 seconds of work.

### Three screens that never get filmed — even in demo mode
- **Settings → Account** (nothing to gain, everything to lose)
- **Track → progress photos** (even fake ones read as real bodies and invite the exact comparison culture your app exists against)
- **Journal / Examen / Prayer entries** — even Alex's. Viewers will assume they're yours. Filming a confession, real or invented, breaks the app's most sacred promise. Show the *feature exists and is private*; never show the text.

---

## 4. FIRST 30 DAYS — day by day. Zero followers, zero footage.

**Design principle:** Week 1 has **no face and no voice**, because the thing most likely to kill this is you deciding on day 3 that you don't like how you look or sound. By the time your face appears (day 15) you already have a shipping habit and something to lose.

**First post goes out on Day 3.** Days 1–2 are stock-building. Resist posting on day 1; posting into an empty tank is how people burn out by day 12.

### WEEK 1 — Build the machine. 3 posts. No face, no voice.
| Day | CAPTURE | POST |
|---|---|---|
| **1 Mon** | Do the two code jobs (§0). Set up the studio account + demo data. Build the `/Content` folders. Then **3 screen recordings**: the Feeling Door, the Fight streak, logging a meal. (60 min total — the only long day) | — |
| **2 Tue** | The b-roll bank: **10 clips × 8s**. Start the daily ledger tonight. | — |
| **3 Wed** | Daily capture (7 min) | **POST 1 — "The button I built for the 11pm version of me."** 25s. Screen recording of the Feeling Door: tap the orb, pick *Restless*, show what it actually does. Text on screen, no voice, trending-quiet audio. |
| **4 Thu** | Daily capture | **POST 2 — "How to log a meal in 9 seconds."** Silent screen recording, on-screen captions. Pure utility. |
| **5 Fri** | Daily capture | **POST 3 — text only** (X / Threads / LinkedIn): *"I built an app that tries to get you off your phone. That created one design rule I couldn't get around:"* + 100 words. No link. |
| **6 Sat** | **Nothing.** No capture, no post. This day exists on purpose — to prove the system permits it. | — |
| **7 Sun** | **FIRST WEEKLY BATCH, 90 min** (§2) | — |

**Day 7 win condition:** 3 posts live, ~20 clips banked, 6 more posts scheduled. You are no longer behind.

### WEEK 2 — Your voice enters. 5 posts, all scheduled Sunday.
| Day | POST |
|---|---|
| 8 Mon | Tutorial: **The Fight** — start a streak without shame. *Voiceover over screen recording.* Your voice, not your face. |
| 9 Tue | Discipline: **"My phone charges in the kitchen. 14 days of what that actually did."** B-roll + voiceover. Past tense. |
| 10 Wed | Tutorial: **Walk it back** — what the app does *after* a slip. Voiceover. |
| 11 Thu | Faith: **The Examen in 5 minutes** — teach the 400-year-old practice. No app mentioned at all. |
| 12 Fri | Build: **"29,000 lines in one HTML file. Why I haven't split it up yet."** Screen recording of the code + voiceover. |
| 13–14 | Off. Batch on Sunday. |

**Day 12 is the statistical quit day.** It's in this table on purpose. Read §6 that morning.

### WEEK 3 — Your face enters.
| Day | POST |
|---|---|
| 15 Mon | Tutorial: **The hard hour** — how it learns your risk window. **First face-to-camera intro (5s), then screen.** |
| 16 Tue | Discipline, face to camera: **"I logged every urge for 40 nights. The pattern was 9pm to 11pm, every single time."** Data, no confession. |
| 17 Wed | Tutorial: **The honest ledger** — what a habit actually costs in money. |
| 18 Thu | Faith, face to camera: **"I go when I don't feel it."** 45s. |
| 19 Fri | Build: **the bug that almost shipped** — smart apostrophes made the crisis gate fail *open*. Specific, technical, and it proves you take safety seriously. |
| 20–21 | Off. Batch Sunday. |

### WEEK 4 — The arc, and the first scar.
| Day | POST |
|---|---|
| 22 Mon | Tutorial: **The Toolkit** — learn the tool before the moment you need it. |
| 23 Tue | Health: **"The only rule I kept."** Your real number, your real four repeat meals. |
| 24 Wed | Tutorial: **Settings → Faith dial.** *"I built a faith app that serves Muslims, Hindus, Buddhists and people with no faith at all. Here's why that isn't a compromise."* — your single most differentiated piece of content. |
| 25 Thu | **THE FIRST WEEKLY VIDEO, 2–4 min**, using the playbook's five-beat arc: hook → where I actually am → what happened including what failed → the turn → the invitation that points past you. |
| 26 Fri | Family: **"What my parents gave up so I could sit here and build this."** With their explicit spoken consent. |
| 27–28 | Off. Batch. |
| 29 Mon | Tutorial: **The Release** — the off-ramp that ends with putting the phone down. Most on-brand thing you own. |
| 30 Tue | **Review day, 30 minutes, once:** how many posts shipped? Did the Sunday batch happen 4 times? Which pillar is starved? Then set the next 30 days. |

---

## 5. ONE PIECE OF FOOTAGE → FIVE POSTS

Volume must come from **repurposing**, not shooting. Take one 90-second screen recording — say, *Walk it back*. It becomes:

**① THE REEL (30s)** — 3s hook card (text only, the *moment* not the feature: "You slipped at 11pm. Now what?") + the best 20 seconds of the recording + 7s payoff. Voiceover from the recording day's ledger. One idea only; cut everything else.

**② THE CAROUSEL (6 slides)** — pause the same recording and screenshot it. Slide 1 = the hook text on a plain background. Slides 2–5 = the four steps, one screenshot each with one line of text. Slide 6 = a question, not a CTA. Zero new footage. Carousels reach the people who won't turn sound on.

**③ THE CAPTION (80 words)** — pulled almost verbatim from that day's voice ledger. Structure: the moment → what you did → what you learned → a question. The app gets **one plain factual line at the end**, never in the video: *"It's free, no ads, no subscription. To Try — link in bio."*

**④ THE WRITTEN POST (120 words, X / Threads / LinkedIn)** — the caption expanded, past tense, no link, no video. This is the highest-leverage, lowest-effort output you have and beginners always skip it.

**⑤ THE STORY (3 frames)** — behind-the-shot photo · the unedited take · a poll ("does your slip happen at night too? yes / no"). Stories are where you're allowed to be rough.

**Then, the hook swap:** the *same clip*, re-cut with a *different hook*, posted **three weeks later**, is a new post. Nobody remembers. Your best-performing video will almost always be a re-hook of something you already made. Keep `05_HOOKS.txt` and write every hook you think of into it — three hooks per clip means one shoot equals three posts.

**The arithmetic:** one 40-second screen recording → 5 outputs. Sunday's batch (6 talking heads + 3 screen recordings) → 45 possible outputs. **You are not short of footage. You have never been short of footage.**

---

## 6. THE ANTI-BURNOUT RULES

### Explicit permissions — these are granted in advance, use them without asking
- **Two skipped captures a week are free.** No make-up, no note, no guilt.
- **Weekends are off.** No posting, no capture, no scrolling your own analytics.
- **One full week off per quarter.** Put the four weeks in your calendar *today*, before you need them. Pre-scheduled rest isn't quitting; unscheduled rest feels like quitting.
- **Never film on a bad day.** The 20-second voice-memo floor is a complete capture. A bad day is exactly when the living has to beat the reporting.
- **If a batch is missed, post 3 times that week, not 5.** Never make it up. Debt is what kills systems.
- **You may quietly delete any post at any time**, for any reason, without explaining it.

### The hard rules — what NEVER goes online
1. **An active lapse.** If you slip, **nothing about it goes public for at least 30 days.** Not vague, not coded, not "a hard week." Scars, not wounds — a public recovery clock is fragile, and a slip on a public clock becomes a *public* slip. Grace over shame applies to you first, and grace needs privacy to work.
2. **Anyone who hasn't said yes in words.** Not implied consent, not "they won't mind." Family included. Especially family.
3. **Your real numbers** — debt, income, net worth, weight if it makes you flinch.
4. **Your real journal, Examen or prayer text.** Ever. Not paraphrased.
5. **Anyone else's struggle** — a family member's, a friend's, a user's. Not even anonymised.
6. **Location-identifying detail** — street, gym name, workplace, parish, your building.
7. **Any wound less than 90 days healed.**
8. **The readiness test that overrides all of the above:** *could you read a cruel, careless comment about this without it moving you?* If no — it goes in `04_LEDGER/`, not online. Vulnerability minus boundaries is not vulnerability.

### More things not to do
- **No posting or metric-checking between 9pm and 7am.** Your app knows the late-night window is where things go wrong; you don't get an exemption. Schedule at 4pm, not at 11pm.
- **Metrics once a week, Friday, five minutes.** Not daily. Never in bed.
- **Never reply to a hateful comment.** Delete, block, move on. Do not screenshot it for content — that's monetising your own wound.
- **No "no days off" content.** Grind-glorification directly contradicts what your app is for.
- **No "90 days to a new life" promises.** You'd be setting up a public failure and calling it marketing.
- **Never say "I'm becoming…"** Say "here's what I did." (Announce the identity and your brain banks the reward for free — Gollwitzer. This is the single most important sentence in the playbook.)
- **The man is not the channel.** 78% of creators report burnout, most of it from identity fusion. Keep something in your life you'd never film.

### The honest numbers for month one — read this on day 12
Twenty posts in your first 30 days, from zero, will realistically give you:
- **Reels: 100–400 views each.** A couple under 80. Maybe one over 2,000.
- **Followers: 5 to 40.** Total. Not per post.
- **Comments: two or three.** One will be from someone you know.
- **App downloads attributable to it: likely zero, possibly one or two.**

**That is not failure. That is the correct output of month one.** It is what it looks like for everybody who later has an audience. Real traction typically arrives somewhere between month **6 and 9**, after **100+ posts**, and it arrives suddenly and from a post you didn't think was good. The algorithm cannot evaluate you on 20 posts; there's nothing to evaluate.

**So the day-30 scorecard has no view counts on it. It has exactly two questions:**
1. Did I publish 15 or more times?
2. Is the Sunday batch still standing?

Two yeses = month one was a total success, whatever the numbers said. Judge by reps, not results — the same rule you built into the Fight.

### The one rule above all others
**If recording is degrading the living, the camera goes down.** Not paused for a week — down, until the life is right again. The app you built exists to say a lapse is feedback, not failure. You are not exempt from your own product.

---

## 7. THE FIVE PILLARS BEYOND THE APP

You said it yourself: *"I am more than who I am today and we need to be able to bring it out."* So the app is **not a pillar** — it's a *setting* that appears inside the Build pillar, and a tutorial format that runs on Wednesdays. That keeps the playbook's rule (the app is at most a quarter of the story) structurally true rather than a good intention.

Running through **all** of these is one format: **"one idea from a book, one minute."** Teaching what you're learning is the most durable and least self-exposing content that exists, and it makes you a *student*, not a guru. **Whenever the tank is empty, that's the post.** You now cannot face a blank page.

---

### PILLAR 1 — FAITH (full, never forced)
1. **"I go when I don't feel it."** The rep, not the feeling. What changed when you stopped waiting for the feeling to arrive first. 45s, face to camera, past tense.
2. **The Examen in 5 minutes.** Teach the actual 400-year-old practice, properly, with no mention of the app at all. Anyone of any belief can use it. This is your best pure-value post.
3. **"I built a faith app that serves Muslims, Hindus, Buddhists and atheists. Here's why that isn't a compromise."** The honest reasoning of a practising Catholic who chose to build the wide door. Nobody else can make this video. This is your differentiator.

### PILLAR 2 — DISCIPLINE / THE REPS
1. **"My phone charges in the kitchen."** One concrete action, 14 days, what it actually did — including what it didn't fix.
2. **The two-minute floor.** The version of the workout, the prayer, the read that you do on your *worst* day. Then show the actual worst-day version.
3. **"I logged every urge for 40 nights. The pattern was 9pm to 11pm, every time."** Data about yourself with no confession in it — which is exactly how you talk about a hard thing without opening a wound.

### PILLAR 3 — THE BUILD (coding in public)
1. **"29,000 lines in one HTML file. Why I haven't split it up yet."** The honest engineering trade-off. Developers respect the honesty; non-developers hear a person who finishes things.
2. **The bug that almost shipped.** iOS smart apostrophes made the crisis gate fail **open** — the safety check silently stopped working. Show the character, the test, the fix. It's a great story *and* it demonstrates you take a vulnerable person's safety seriously.
3. **"I deleted a feature I spent a week building."** Removing as intention. Directly contradicts everything hustle culture teaches, which is why it lands.

### PILLAR 4 — FAMILY & THE IMMIGRANT THREAD
1. **"What my parents gave up so I could sit here and build this."** With their spoken consent. Their story stays theirs — you tell only your side of it.
2. **The transfer home.** The monthly money that goes back, that no budgeting app has a category for, and that a whole diaspora feels and never sees named. Talk about the human thing, not the feature.
3. **"I grew up translating for my parents — it's why I'm obsessive about plain language in software."** The bridge between the two halves of your life. This is the kind of post that makes people follow the *person* and not the product.

### PILLAR 5 — HEALTH / THE BODY
1. **"I lost [your real number] without a single day of hating myself. One rule."** The rule is the post; the number is just the proof.
2. **Protein for someone who hates cooking.** The four meals you genuinely eat on repeat, filmed once, useful forever.
3. **"Walking is the most underrated training there is."** Your real Strava/Hevy pace over three weeks. Same distance, less time, no drama — the most honest progress graph there is.

---

## THE ONE PAGE, IF YOU READ NOTHING ELSE

**Tonight:** finish the evening check-in, then 7 minutes — voice ledger (60s), one take to camera (90s), three 8-second b-roll clips. Slate each one out loud. Don't edit anything.
**Tomorrow:** the two code jobs, the studio account, demo data, three screen recordings.
**Wednesday 7:30am:** your first post goes live — 25 seconds, no face, no voice, the Feeling Door.
**Sunday 4:00pm:** 90 minutes, dark tee, and you walk out with next week finished.

**Report reps, not resolutions. Scars, not wounds. Document the living — and if it ever starts eating the living, put the camera down. The life wins.**

---

### Files referenced
- `/Users/alfredjohn/Desktop/ToTry/CREATOR-PLAYBOOK.md` — the law this system executes
- `/Users/alfredjohn/Desktop/ToTry/index.html` line **32914** — `DEV_EMAILS`, add the `+studio` address so the recording account can load demo data
- `/Users/alfredjohn/Desktop/ToTry/index.html` line **32990** — demo banner `bottom:0` → `top:0`, so it stops covering the nav bar in every tutorial
- `/Users/alfredjohn/Desktop/ToTry/index.html` line **3836** — `demo-mode-card`, the "Load demo data" panel (dev-gated)
