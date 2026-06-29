# To Try v152 — Go-Live Guide

Everything you need to put the revamp on your phone and test it. In order.

---

## STEP 1 — Deploy (2 min, on your iPhone)

1. Open the GitHub repo (alfredjohn200101.github.io/ToTry).
2. Replace **`index.html`** with the new one.
3. Replace **`sw.js`** with the new one. ← don't skip this; it's what forces the update through.
4. Commit. GitHub Pages redeploys in ~1 min.
5. On your phone: fully close the app (swipe it away), reopen. You should see v152.
   - If you still see the old version: close it again, or pull-to-refresh in Safari once. The new
     service worker is network-first, so it updates on next open.

---

## STEP 2 — Test the heart of it first: THE COMPANION

This is the keystone — the thing the whole revamp is built around. Test its *feel*, not just that
it works.

- **Open the app a few times during the day.** Outside your morning window, you should get the
  check-in: "How are you, really?" with "I'm okay" / "Something's pulling at me."
- **Tap "I'm okay"** → it should dismiss in one tap. (That's the reflex-forming path.)
- **Tap "Something's pulling at me"** → you'll see your vices as chips + a free-text box.
  - Pick a vice chip → the companion should meet you in that struggle's voice.
  - Type something NOT in your list (e.g. "I keep overthinking everything") → it should still meet
    you, using the right approach (for overthinking, a step-back/defusion tone, not urge-surfing).
  - Type something unusual (e.g. "I can't stop checking my ex's profile") → it should research a
    real approach live and still help.
- **Have a short back-and-forth.** Does it feel like a present friend, or like an app? This is the
  ONE thing only you can judge. Note anything that feels off in tone.
- **Tap "I'm through it 🌿"** → it should celebrate, and if it matched a tracked vice, offer to show
  what your streak is earning.
- **The floating "I'm feeling it" button** (manual entry) → should open the companion straight to
  "what's pulling at you."

**What to watch for:** Does the check-in ever feel naggy or badly-timed? Does the voice ever preach
or feel generic? Does anything render broken on your screen?

---

## STEP 3 — Test the body loop (the trust-critical fix)

- **Macro accuracy:** search a few foods that were WRONG before (YoPRO, the Dairy Farmers smoothie,
  anything that showed zeros or inflated numbers). They should now show correct macros.
- **Barcode scan** a packaged product → correct values, a real serving option.
- **Strava:** after your next cardio, open the synced activity in To Try → it should now show HR,
  calories, effort (once the Strava edge fn is updated — see Step 5; until then it shows what the
  summary provides).
- **Session proof:** open any workout → "📎 Add proof" → attach a photo or video. (Video stays in
  your camera roll; To Try just references it.)

---

## STEP 4 — Test the rest quickly

- **Recovery timeline:** on a vice card, tap "🌿 What this streak is earning you" → milestone science,
  faith line each, reached/unreached states.
- **Money stewardship:** on a vice card, "Track money saved" → set a cost → check the Money hub shows
  the reclaimed total.
- **Morning sleep:** open the morning ritual → rate your sleep (one tap) → it feeds readiness + coach.
- **Weekly content engine:** the weekly card → "🎬 Make this week's content" → a storyboard + caption
  you can copy into CapCut/Reels.
- **Milestone share:** (when you hit a day milestone) the celebration is tappable → share card.

---

## STEP 5 — Supabase (turns on the backend pieces) — do when you have 15 min at a computer

These aren't in the app file; they live in your Supabase project. The app already works without
them, but they unlock the full power.

1. **Run the SQL:** open Supabase → SQL Editor → paste all of `supabase-setup.sql` → Run. (Creates
   the community library, AI quota/credits, etc. Safe to re-run.)
2. **Deploy the AI proxy:** follow `AI-PROXY-DEPLOY.md` exactly. Key point: deploy `ai-proxy.ts` as
   the `ai-proxy` edge function with **Verify JWT = OFF** (`--no-verify-jwt`). This is what powers the
   companion's live research, the food web-lookup, and the recovery-timeline science.
3. **Strava detail-fetch (optional but high-value):** your deployed `strava-oauth` edge function
   currently returns Strava's *summary* activity data. To get calories + HR + the Hevy-via-Strava
   per-set detail flowing, it needs to also call Strava's per-activity detail endpoint
   (`/activities/{id}`) and include `description`, `calories`, `average_heartrate`, `suffer_score`.
   The app already reads these the moment they appear — it's forward-compatible. (I can't edit that
   function from here since it's not in the repo; happy to help you write the change.)

---

## What's genuinely done vs. what needs you

DONE (in-app, tested, hardened at v152):
- The companion front-door, all 7 pillars, the premortem hardening.

NEEDS YOU:
- This device test (especially the companion's *feel*).
- The Supabase steps above (backend power-on).

ONLY YOU CAN JUDGE:
- Does the companion feel like the presence you envisioned? That's the whole game. Tell me what's
  off and we tune it.
