# Recipes from links and reels, feeding the plan and its shopping list

> Status: **specified, not built.** Researched 28 Sep 2026, then refuted by three independent
> reviewers — all three returned `refuted: true`, and one of them found something that changes the
> shape of the feature rather than its details. Read §1 before anything else.

## The idea, in the owner's words

> "I want fuel plan building to increase its capabilities in the terms of when setting, I want the
> user to be able to also enter links or recipes from reels. I know there is an app that collects
> such recipes from reels and keeps it in one place and maybe we can use that in here to allow for
> meal plan to be created from these ideas people have. Like as much as we can build a plan and have
> its groceries accounted for, the reels-to-recipe apps don't do that and also don't build itself
> into a plan. We have a real gap we can use to make our app ahead in the life tool sense... and more
> within nourish to get closer as a macrofactor, mfp, cronometer replacement than we were at too."

Two asks, deliberately kept apart: **(A)** recipes from links/reels → saved → into the plan and its
shopping list. **(B)** Nourish closer to a MacroFactor / MyFitnessPal / Cronometer replacement.

---

## 1. The thing that has to be decided first

**In this app's own data model, the place those reels live is a vice.**

```
src/app/04-fight.js:884   scrolling: { label: 'doomscrolling / social media',
                            firstMove: 'Put the phone down and walk to another room without it.' }
src/app/04-fight.js:987   ['scrolling', ['scroll','social media','instagram','tiktok','youtube', …]]
```

`instagram`, `tiktok` and `youtube` are literal strings in the classifier that maps what a person
types to the `scrolling` vice. Its science line calls the scroll "boredom or avoidance in disguise".
`_letGoSurf` (`05-moment.js`) closes with *"You felt the urge to look — and let it pass instead of
feeding it."* Settings seeds a demo person carrying a Doomscrolling vice with a 38-day clean counter.

So a feature whose copy says *"paste a reel"* would have the app that counts someone's clean days
telling them that opening Instagram is now productive meal planning. Two surfaces of one app, giving
opposite instructions, and nothing checking which person it is talking to.

A second, quieter version of the same problem: a saved reel is four seconds of impulse, often at
11pm, inside the risk window this app already models (`analyzeUrgePatterns → riskWindow`,
`02-native.js`). Telling the planner "they saved these and want to eat them this week" asks it to
treat an impulse as a settled intention.

**This does not kill the idea. It decides the framing.** The version that survives never mentions a
platform: the app accepts *a recipe from anywhere* — a photo, a link, typed text — and the seam it
actually sells is the one below, which needs no social network at all. If the reel path ships, it
must be gated on the person's own vices: no reel-shaped prompt, ever, for someone with an active
`scrolling` fight, and no "open Instagram" call to action for anyone.

---

## 2. What already exists — verified, not remembered

**The recipes** (`src/app/14-nourish.js`): `openRecipeBuilder:2478`, `newRecipe:2517`,
`openPasteRecipe:2526`, `parsePastedRecipe:2539`, `editRecipe:2565`, `saveCurrentRecipe:2655`,
`logRecipeAsMeal:2683`. `totry_recipes` is synced. Paste is **text only** — no URL path anywhere.
`parsePastedRecipe` always produces an **editable draft**, never a saved fact, which is the right
shape for anything a model guessed at.

**The plan and the groceries** (`src/app/17-fuelplan.js`): `_fuelGenerate:212` builds an N-meal day
against calorie and protein targets, with pre-workout carb timing, a shopping list **routed store by
store**, **live prices**, and `_fuelLogPlan` to push the day into the diary. The owner's "we can
build a plan and have its groceries accounted for" is already true.

**The seam, and it is one grep:**

```
grep -c recipe src/app/17-fuelplan.js   →   0
```

The planner has never heard of the person's saved recipes. It invents every meal. **That is the
whole opportunity and it has no external dependency:** the collectors stop at collecting, the
planners never start from what the person chose, and this app already owns both ends plus the store
routing, the prices, the diary and the whole-person context the model reads.

---

## 3. Can a reel actually be read? — measured, not assumed

| Path | Verdict | What was measured |
|---|---|---|
| **Instagram oEmbed** | **Dead** | Tokenless since Jun 2026 and returns six keys — no title, no author, no thumbnail. Tag-stripped, the entire visible text is *"View this post on Instagram"*. |
| **Instagram page fetch** | **Dead, technically** | A real URL with an iPhone Safari UA from a residential IP: HTTP 200, 622KB, `<title>Instagram</title>`, **zero `og:` tags, no caption**. The caption arrives by authenticated GraphQL after hydration. There is nothing to scrape without a logged-in headless browser. |
| **Instagram, permission** | **Not permissible** | `robots.txt` is `User-agent: * / Disallow: /`, with a header prohibiting automated collection. App Store Guideline 5.2.2 requires permission from the third-party service, "provided upon request". |
| **TikTok oEmbed** | **Works** | Documented, unauthenticated, and `title` **is the full caption**. Caveat: HTTP 429 on the first unauthenticated request from this machine. Call it **from the device**, never from an edge function — `key-proxy`'s own comment records that Supabase has no stable egress IP. |
| **YouTube Data API** | **Works, keyed** | `videos.list?part=snippet` returns the full description for 1 quota unit of 10,000/day. `key-proxy` already holds keys. Transcripts are **not** available — `captions.download` needs OAuth as the video's owner. |
| **schema.org/Recipe JSON-LD** | **Parsing solved, fetching is not** | BBC Good Food returned a complete Recipe: 15 ingredients, 5 instructions, yield, and a full nutrition block — free, deterministic, no AI. But **four of five sites refused the fetch** (402/403) even with a full Chrome UA. It is IP-reputation bot management, which inverts the obvious architecture: fetch from the **device**, not the server. |
| **iOS share sheet** | **Capture, not extraction** | It hands over a `public.url`, sometimes a plain string — **not the caption**. Everything the commercial apps do happens after that, from the URL. Reading "they use the share sheet" as "the share sheet gives you the recipe" builds the easy half and leaves the hard half untouched. |
| **Screenshot + the vision path** | **Works, and it is already built** | Nourish's meal-photo vision call is verified live at 2.26s. The person screenshots what they can already see; the app reads it. Legal, durable, platform-agnostic, and it covers Instagram — the one platform nothing else can. |
| **Paste the caption** | **Works, already shipped** | `openPasteRecipe` → `parsePastedRecipe`. |

**What the existing apps actually do** (ReciMe's own help pages): share sheet → caption → *audio
transcription* if there is no caption → hunt for the original website. For Instagram, step one has no
permissible implementation. They are operating without Meta's permission and have not been enforced
against; Apple's 5.2.2 enforcement is complaint-driven. For a free app under a named individual with
a nearly-finished build in review, that is a bad trade.

---

## 4. What the refuters broke

All three returned `refuted: true`.

1. **The vice conflict** — §1. Structural, not cosmetic.
2. **A shipped bug in the file the spec proposed to rewrite**, found while reading it: `_fuelLogPlan`
   wrote diary rows with no `meal` field, and the diary groups on `(e.meal || 'snack')` — so logging
   a plan filed **the whole day under Snacks**. *Fixed in `607e18e`, with a test that drives the real
   writer; the first version of that test greped the call and passed on a swapped argument.*
3. **Micros would be downgraded by the very seam the spec sells.** `logRecipeAsMeal` writes the full
   28-key nutrient sum; `_fuelLogPlan` writes four macros. Route a recipe through the planner and its
   micronutrients vanish — while §B below asks for *more* micronutrient coverage. Any recipe→plan
   path must carry the nutrient spread, not flatten it.
4. **The spec's own lead correction was stale by one commit** — it claimed the paste-recipe crisis
   door was uncommitted; it had been committed an hour earlier. The repo's named failure mode caught
   the document written to avoid it.
5. **Enabling `CapacitorHttp` to get around CORS was refuted twice**, including on grounds that it
   does not even cure what it was proposed for.

---

## 5. The shape that survives

**Phase 1 — the seam, and nothing else. BUILT, 30 Sep 2026.** No platform, no URL, no new intake.
Saved recipes become something `_fuelGenerate` can build a week around, and their ingredients merge
into the one store-routed shopping list. Every dependency already existed. This is the part that is
genuinely ahead of both categories, and it shipped without touching a single third-party service.

> `_fuelRecipeLines()` puts the shelf into the prompt — the name exactly as they wrote it, macros
> **per serving** (what a meal slot is sized by) and the ingredient **names** (what a shopping list is
> made of), capped at 8 so it cannot crowd out the rest of the brief. Nothing at all for someone with
> no recipes.
>
> `_fuelMergeRecipeShopping()` is the half that does not depend on the model: a meal naming one of
> their recipes is marked `mine`, and any ingredient of it missing from the list is added — otherwise
> the plan tells them to cook something the list cannot buy. Those rows carry `fromRecipe` and **no
> price** (we do not know what it costs at their store, and a 0 reads as free), show the recipe name
> where the price would be, group under "From your recipes", and that group prints no subtotal.
>
> 18 assertions, fault-injected five ways. The `mine` flag is set and nothing reads it yet — that is
> the obvious next half-hour: the plan should SAY which meals are theirs.

**Phase 2 — intake, ranked by what is both legal and durable.** A pasted **recipe-site URL** parsed
from JSON-LD, fetched **from the device**; the **screenshot** path through the vision call that
already works. Both are platform-agnostic; neither asks anyone to open a feed.

**Phase 3 — the platforms that permit it, if wanted.** TikTok oEmbed and the YouTube Data API, called
from the device, gated on the person's vices per §1. **Instagram is not on this list** and cannot be
until Meta permits it.

**Never:** a browsable recipe feed inside the app. A feed is a scroll surface, and this app refuses
engagement farming and ships a "Hide numbers" mode for people whose relationship with food is not
casual.

**Every new intake surface is a crisis door the same day** — `openPasteRecipe` was the third
free-text box in Nourish and the only one that was not, until `8b606ea`.

---

## 6. (B) The Nourish parity work — a separate ask, ranked

Not tangled with the above. The previous round already found Nourish carries the MyFitnessPal
grammar; these are the genuine gaps, and the ranking is by what a switcher notices first. To be
filled in from the parity research before this section is acted on.

- **Micronutrients** are the Cronometer draw, and item 3 above shows the app can already lose the
  ones it has. Start by not losing them.
- **The barcode affordance is buried** in "More ways to log" while every competitor puts it on the
  logging surface.
- **Adaptive TDEE / the coached target that moves with the data** is MacroFactor's whole product;
  what exists here and where it is behind needs measuring, not guessing.
