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
- **Single file: `index.html`** (~29k lines, ~1.8MB) — all HTML/CSS/JS inline. This is intentional
  for the PWA today but is the #1 refactor target (see below).
- `sw.js` — service worker (cache-first shell). Bump `const CACHE` with every release.
- Supabase backend (URL: oklvalcgxeoudgpldzkk.supabase.co). AI via an `ai-proxy` edge function with
  a free-first chain (Gemini → Groq → OpenRouter → Anthropic Haiku) + web search. See AI-PROXY-DEPLOY.md.
- Hevy + Strava integrations. GitHub Pages hosting, manual deploy.
- `APP_VERSION` in index.html — currently **v180**. Bump it AND `CACHE` in sw.js together, always.

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
1. **Parse-check after EVERY edit.** Extract the big inline `<script>` and run `node --check`. Also
   check div balance (count `<div` vs `</div>` outside scripts == 0). A syntax error ships a white
   screen to a real person. This has caught many bugs; never skip it.
2. **Bump `APP_VERSION` (index.html) and `CACHE` (sw.js) together** on every release.
3. **Quality over speed. Honest assessment** — never claim done when it isn't.
4. **Hold the soul.** Before adding anything, ask: does this serve the person (what's next / what's
   wrong / what can they do better)? If it only reports, it isn't done. Removing can be intention.
5. **Child safety, medical, crisis:** keep the bridge-to-real-help and crisis paths intact and
   prominent. Never weaken them.

## WHAT TO DO NEXT (in priority order)
1. **Run it live.** Serve index.html, open it, click through: the Feeling Door (tap the orb), the
   companion sheet, every tab. Screenshot. Fix what's visibly broken that parse-checks can't catch.
2. **Native wrapper (Capacitor).** Follow NATIVE-WRAPPER-GUIDE.md. The `Notify` layer is already
   wrapper-aware — wrapping unlocks background push so the sibling can reach out first at a person's
   known risk window (the craving-pattern data already identifies it). This is the biggest unlock.
3. **Split the monolith.** Carefully extract index.html into modules (state, UI, companion, nutrition,
   train, money, soul, AI) with a tiny build step. Do this incrementally, parse-checking constantly —
   never a big-bang rewrite. The single file works; don't break it to make it pretty.
4. **Live-test the Feeling Door with real use** — it's the newest, most important entry point. Make
   sure each feeling path genuinely moves a person, not just shows a modal.
5. **Then:** the deeper secondary panels, the "reach out first" scheduled nudges (post-wrapper).

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
