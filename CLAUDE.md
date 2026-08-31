# CLAUDE.md — To Try

> Read this first. It tells you what this project is, its soul, how it's built, the rules, and what
> to do next. Then read SOUL-ARCHITECTURE.md and NATIVE-WRAPPER-GUIDE.md.

## What To Try is
A free, faith-rooted, whole-life self-improvement PWA — "the big sibling I never had." It is the
one home where every part of a person's life lives together (body, mind, money, spirit) so that
tracking becomes **counsel**. It meets a person at the moment they feel something — the entry point
is emotion, not data (see the Feeling Door, below). Built by Alfy (Alfred John), a practicing
Catholic, for anyone — men and women — silently suffering and seeking purpose in a world of impulse
and dopamine. Live: https://alfredjohn200101.github.io/ToTry/

## The soul (do not drift from this)
- **A presence, not a tracker.** It speaks at thresholds (about to cross a line), meets you in the
  moment, and guides when asked. Quiet by default, there and ever-present, never overbearing.
- **Integration IS the product.** Every other app is one feature of a person; this sees the whole,
  so its counsel is true in a way no single-feature app can be. Protect the cross-front threads.
- **Grace over shame. Presence over measurement.** A lapse is feedback, not failure.
- **It points beyond itself** — to real people, a priest, a counsellor, the sacraments. It is NOT a
  replacement for real help; when something is serious, it hands the person to a human. It must
  never foster dependence or farm engagement (anti-engagement is a feature, not a bug).
- **Faith is full but never forced.** Built honestly from a Christian heart; a person of any belief
  or none is fully served (Settings → Faith dials scripture intensity).
- **Gender-aware.** Knows biological sex (Settings → About you); calorie/protein math and the
  sibling's voice adapt. The founder's story stays "big brother"; the app's voice is universal.

## Tech stack
- **`index.html` is GENERATED. Do not edit it.** Edit the module under `src/app/` and run
  `npm run build:index`. The app is still one file when it ships (~44k lines, ~3.0MB, all inline —
  that's deliberate for the PWA), but the source of truth is now `src/`:
  `src/shell-head.html` + **42 modules** (`00-boot.js` → `01-sync.js` → `02-native.js` →
  `03-person.js` → … → `40-identity-seasons.js` → `app.js`) + `src/shell-tail.html`, concatenated
  in exactly that order. `app.js` is now just the undo system — 33 lines, down from ~31k.
  **Order is semantics** — one script, one shared top-level scope, no module system: a `function`
  hoists, a `const` does not. Never reorder modules; only ever slice a new one off the FRONT of
  `app.js` (`scripts/extract-prefix.js` does this and refuses if it doesn't round-trip).
  `npm run verify:index` must print `identical` — it compares byte-for-byte by sha256, and
  `npm run preflight` fails if it doesn't. If you edited `index.html` by hand, that check tells you
  the exact line; move the change into the module and rebuild.
- `sw.js` — service worker (cache-first shell). Bump `const CACHE` with every release.
- Supabase backend (URL: oklvalcgxeoudgpldzkk.supabase.co). AI via an `ai-proxy` edge function with
  a free-first chain (Gemini → Groq → OpenRouter → Anthropic Haiku) + web search. See AI-PROXY-DEPLOY.md.
- Hevy + Strava integrations. GitHub Pages hosting, manual deploy.
- `APP_VERSION` in `src/app/00-boot.js` — currently **v571**. Bump it AND `CACHE` in sw.js together, always.

## The nervous system (key functions — grep these)
- `getLifeState()` — returns the whole person {training, nutrition, body, soul, fight, readiness,
  money, sex, activity, brief}. The brain everything reads.
- `lifeStateBrief()` — compact text of the whole person fed to the AI.
- `brotherSpeaks(moment)` — the threshold voice (viceOver | calorieOver | trainTired). One voice,
  all thresholds. Throttled, never blocks, choice-first.
- `brotherGuidance()` — proactive counsel ("what should I do right now?").
- `openFeelingDoor()` / `_feelMove()` — THE FEELING DOOR: the orb's primary action. Meets a person
  in their feeling and moves them through it. This is the entry point through emotion.
- `Notify` (object) — wrapper-aware notification layer; native push when wrapped, web fallback now.
- `applyHomeProgressiveDisclosure()` — hides depth for new users, unlocks as they establish.
- Companion = the in-the-moment bottom-sheet (clinical mechanisms: urge-surf, ACT defusion, CBT
  cognitive restructuring, grounding). `_companionSay()` builds its prompt.

## NON-NEGOTIABLE WORKFLOW RULES
1. **Parse-check after EVERY edit.** `npm test` now does it for you — it extracts every inline
   `<script>`, runs `node --check`, and asserts div balance. Added at v483 after a stray string
   terminator shipped: index.html would not parse — a white screen for everyone — and the suite
   reported 1032 PASSED, because the harness extracts functions by name and never parsed the whole
   script. A suite that stays green while the app cannot boot is worse than no suite.
2. **Run the whole gate before you ship**, not just `npm test`:
   - `npm test` — 1651 assertions over the real bundle (core math, dead code, privacy promises,
     the voice gates, the parse check)
   - `npm run crisis` — types the worst sentence into all ELEVEN free-text doors and asserts a
     helpline is on screen and TAPPABLE (geometry, not DOM presence — the bug it was written for
     had the text in the document and off the screen). Fourteen checks in all: the eleven doors, the
     safety net with its container deleted, the guest door, and the breath ending where a person has
     just said that a minute of breathing did NOT move their distress.
     The eleventh is the Sunday check-in WITH AN OUT-OF-BAND WEIGHT, and the bad weight is the point:
     v568 added a 20–400kg band eighty lines above the crisis handler, so a disclosure typed into the
     same form as a fat-fingered weight returned at the band with a grey toast and no helpline, while
     the identical sentence with the box left blank got the full response. A validation rule must
     never be able to outrank a disclosure — and this door was not in this list, which is how it
     shipped. When you add a free-text surface, add its door here the same day.
   - `npm run personas` — 551 assertions, 10 people incl. one built entirely from data that has
     really broken this app (apostrophes, GBP, a completed goal ahead of the live one)
   - `npm run panels` — the widest net in the gate, and the one that finds what code-reading cannot.
     **It now takes well over ten minutes.** Run it in the background and wait on the output rather
     than in a foreground call, or it will be killed mid-run and you will read a truncated pass:
     `(npm run panels > /tmp/panels.out 2>&1; echo DONE >> /tmp/panels.out) &` then poll for DONE.
     It covers, in one browser each: 19 sub-panels x 3 people; a 24pt tap-target floor; the
     sheet-dialog a11y floor and an accessible NAME on every control; the live SOS; all seven Feeling
     Door paths clicked through to where they LAND; the app booting with the network CUT; every front
     reaching `getLifeState().brief`; the same body and run entered in kg/lb and km/mi; ten deletes
     each removing exactly the item tapped; a backup exported, the device wiped, restored, with no
     session token in the file; a two-device merge asserted in the CLOUD row; a full device saying
     "Storage full" instead of "Saved"; the companion still helping with every AI provider throwing;
     all five traditions running their own reading plan; the morning and evening rituals stepped,
     completed, and RE-ENTERED; the companion's dismiss gesture (handle dismisses, conversation
     scrolls); and one person walked through a whole day in a single session.
   - `npm run test:edge` — runs the Supabase functions locally with Deno stubbed (Node strips the TS)
   - `npm run preflight` — version/cache/bundle parity across source, www and the iOS build
   Add a test when you add core math, and FAULT-INJECT it: an assertion you have never seen fail is
   not yet a test.
3. **Bump `APP_VERSION` (`src/app/00-boot.js`) and `CACHE` (sw.js) together** on every release,
   then `npm run build:index && npm run build:www && npx cap sync ios`. `npm run preflight` checks
   all of it — the repo has already sat four versions ahead of the iOS bundle without anyone seeing.
4. **Quality over speed. Honest assessment** — never claim done when it isn't.
   - **Read the whole gate BEFORE `git push`, not after.** v542 went out with `npm run panels` red
     because the output was read after the push.
   - **Review the FIXES, not only the original code.** Three adversarial rounds ran over v533–v544:
     round 1 (the rebuild) found 11 defects, round 2 (the fixes for round 1) found 9 — and one of
     those fixes had caused harm worse than the bug it repaired. A fix fails in four recognisable
     ways: it covers only the reported case, it moves the bug, it is gated in the wrong place, or its
     blast radius was never measured. Ask those four questions of every batch.
5. **Hold the soul.** Before adding anything, ask: does this serve the person (what's next / what's
   wrong / what can they do better)? If it only reports, it isn't done. Removing can be intention.
6. **Child safety, medical, crisis:** keep the bridge-to-real-help and crisis paths intact and
   prominent. Never weaken them.

## WHAT TO DO NEXT (in priority order)
1. **The App Store.** The wrapper builds, launches and runs (Xcode 26.6, Release, iPhone 17 sim:
   ~2.8s to first paint, branded splash, crisis gate verified ON DEVICE with iOS smart quotes, `tel:`
   links hand off correctly). What is left is yours and cannot be automated: archive → TestFlight,
   the age rating, the App Privacy form, and testing barcode / Face ID / haptics / notifications on
   real hardware. `npm run preflight` checks the rest before you archive.
2. **Two edge functions need redeploying — and this is what breaks the food camera.** Measured
   against the LIVE proxy on 28 Aug 2026: the deployed `ai-proxy` does not set Gemini's
   `thinkingConfig.thinkingBudget: 0`, and 2.5 Flash spends the token budget reasoning before it
   writes anything — so at `max_tokens: 700` a meal estimate returned 74 characters ending mid-number
   and `JSON.parse` threw, every time, on a perfect connection. The app now compensates client-side
   (`api()` floors at 2000, the meal estimate sends 4000, the retry caps at 6000; the vision call went
   500 → 4000) and the local edge source has the cap on BOTH the text and vision paths. Groq is 404ing
   on a retired model id; OpenRouter is 429 on free-tier quota with all three ids still live. **Gemini
   is currently the only working link in the chain.** See AI-PROXY-DEPLOY.md, which now opens with all
   of this.
   The other fixes waiting in `supabase/functions/` and NOT live:
   `key-proxy` — the FatSecret `invalid_client` was our own substring bug (FATSECRET contains
   SECRET); `ai-proxy` — identity came from a client-supplied field, so the public anon key could
   spend someone else's quota. Also the `push_subscriptions` column types in AI-PROXY-DEPLOY.md
   (they were `boolean`; the app writes a time string and an array), with the migration written out.
3. **The monolith split is FINISHED** — 42 modules, largest 4.9k lines (`03-person.js`), and
   `src/app/app.js` is down to 33 lines. Nothing is left to slice off the front. If you ever split
   a large module further, use `scripts/extract-prefix.js` and run `node scripts/build-index.js
   --verify` after each; it must print `identical`.
4. **The Feeling Door is live-tested and guarded.** All seven paths were clicked through to where
   they land — Train, a real-high sheet, guided breathing, the bridge to real help, the "name the
   thing you're avoiding" form, and brotherGuidance. `npm run panels` now fails if any path's primary
   button leads nowhere, which is how a path would rot: it still reads well and hands the person
   back to their phone.
5. **Units are real now (v529–v530).** Storage stays canonical — kilograms and metres — and only
   the two edges convert: `wFmt`/`wDelta`/`dispToKg` for body weight, `dFmt`/`mToDisp`/`dispToM` for
   distance, plus `syncWeightUnitLabels()` for the static labels. If you add a screen that shows a
   weight or a distance, go through those; a hardcoded `+'kg'` is how a lb user ends up reading
   someone else's body. Lifted load is deliberately still kg, and the timezone select is a deliberate
   no-op that says so in its own copy — do not "fix" either silently.
6. **SOUL-ARCHITECTURE.md has no TODOs left (v533–v540).** All eight are built and each is guarded by
   `npm run panels`, so the soul of a screen can no longer drift quietly:
   - GROW hands off card to card — "3 sessions, about 1,260 cal earned → fuel it" → "5 of 7 days
     fuelled → see what it did" → "-0.8kg — that is what the training and the fuel did"
   - THE COMPANION is a sheet, not a takeover: 549px for a short question with 347px of app behind it
   - THE FIGHT leads with what has been WON, and withholds "your longest run yet" from someone who
     has not actually beaten their previous run
   - MORNING is five steps under a dawn skin instead of 1913px of form; EVENING is seven under a dusk
     skin, grace-first, examen last
   - SOUL opens with stillness — a word from the person's own tradition, and none at all for someone
     secular
   - MONEY leads with what staying clean bought, once there is something to lead with
   - CALENDAR was a question, and the code answered it: the view is already in Today, the screen is
     only the editor
7. **Then:** the "reach out first" scheduled nudges (post-wrapper), and whatever the App Store
   feedback turns up.

## Files in this handoff
- `index.html`, `sw.js` — the app.
- `SOUL-ARCHITECTURE.md` — the intention behind every page; the north star. READ THIS.
- `NATIVE-WRAPPER-GUIDE.md` — exact Capacitor steps.
- `PREMORTEM-WORLDCLASS.md` — evidence-grounded refinement criteria (clinical + product).
- `AI-PROXY-DEPLOY.md` — the edge function setup.
- `GO-LIVE.md`, `BUILD-BACKLOG.md`, `DEEP-PLANNING.md`, `RESTRUCTURE-PLAN.md` — history/context.

## The one test that matters
Not "is the code good." It's: **would the person open this when they feel something, instead of
doom-scrolling?** Build toward that. Everything else serves it.
