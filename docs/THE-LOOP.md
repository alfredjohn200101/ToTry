# Reel to real — the loop, layer by layer

> *"we are trying to build out the recipe and meal plan builder and grocery thing in a way that is
> meant to close the loop between reel to real and have users be able to not only plan their diet,
> but have it be to their needs and have them build a shopping list with real prices so that they can
> also be aware of the cost of whats to come with their meal plan. There are layers to this."*

One chain, eight links. A break in any one of them and the rest is decoration — which is what most of
this was before 30 Sep 2026: every link existed, none of them were joined.

```
  a recipe comes in  →  it carries real nutrition  →  the planner builds a week around it
        →  its ingredients reach ONE shopping list  →  routed by the shops they actually use
        →  priced, really  →  the cost of the week is honest  →  what they cook lands in the diary
```

---

## 1. A recipe comes in — ✅ text, link, screenshot, barcode, search

`openPasteRecipe` / `parsePastedRecipe` take typed lines **or a URL**; the model reads the page
through the same `web_search` grounding the live-price pass uses. Barcode and the food search both
land ingredients directly.

**The framing was decided before the feature** (`REELS-TO-PLAN.md` §1): `instagram`, `tiktok` and
`youtube` are literal strings in this app's own vice classifier, mapping to the `scrolling` fight. So
nothing here names a platform or offers to open one — a test asserts it. The app takes *a recipe from
anywhere*.

**The screenshot is the reel-to-real door that touches no platform:** someone screenshots what they
saw, the way they already do, and the app never goes near the feed. Built on the vision call that
already reads a workout summary and a plate of food, with its own file input — one input cannot mean
two things, and a shared one sends a recipe screenshot to the meal estimator.

**All three doors now share one path** — `_recipeFromParsed` → `_recipeDraftGuard` → `_recipeDraft` —
so a fourth cannot quietly normalise its numbers differently, and all of them land in an **editable
draft** rather than a saved fact.

**And every intake is a crisis door, including one that cannot be gated on the way IN.** A screenshot
carries no typed words for `detectCrisis` to read, so the check moves to the only text that door ever
produces: what the model read out of the image.

## 2. It carries real nutrition — ✅

`_recipeAddFromFood` is the one landing, built on `nutPick`: every one of the 28 NUTRIENTS keys,
scaled, with an absent nutrient left **absent** rather than becoming a confident zero. Before this,
every writer of an ingredient hand-built four macros, so **no recipe had ever carried a
micronutrient** — including the barcode path, whose Open Food Facts parse works out fiber, sodium,
calcium, iron and vitamin C forty lines above the push that threw them away.

**A recipe from any of the three model-parsed doors can now be resolved against USDA** —
`lookupRecipeNutrition()` on the editor — but only for lines that state a weight the app can read
**without guessing**. "500g chicken breast" becomes USDA's real figures with its micronutrients; "1
tbsp olive oil" and "1 onion" keep the model's estimate and are not claimed as real. The research's
own warning is the constraint: *a wrong match is worse than no match*, and an assumed density or an
average onion is exactly the confident wrong number this side of the app refuses to write. The row
says which is which, because an estimate and a USDA figure look identical once they are both just a
number.

**Open:** `searchUSDA` asks for `Foundation`, measured at **17.6/28** micro coverage against SR
Legacy's 23.2 and Survey (FNDDS)'s 27.0 — but Survey's names are prepared dishes ("Fried broccoli",
"Lomi salmon"), so that is a real trade-off, deliberately un-made. And the un-weighed lines are still
estimates; resolving those needs a volume-to-weight table someone has to be willing to stand behind.

## 3. The planner builds a week around it — ✅

`grep -ci recipe src/app/17-fuelplan.js` returned **1** — a passing mention in a dislikes string. The
collectors stopped at collecting and the planner invented every meal. `_fuelRecipeLines` now puts the
shelf into the prompt: the name exactly as they wrote it, macros **per serving**, ingredient
**names**, capped at 8. A meal built from one is marked `mine` and says **"one of yours"** on screen.

## 4. Its ingredients reach ONE shopping list — ✅

`_fuelMergeRecipeShopping` is the half that does not depend on the model: any ingredient of a named
recipe missing from the list is added, or the plan tells someone to cook a thing the list cannot buy.

## 5. Routed by the shops they actually use — ✅ and now set once

**"Where you shop" is a row in Settings → Display & locale**, beside Currency — both are "where I am
and what things cost here". It used to exist only as a step at the end of the setup flow whose
confirm button went straight to a generate, so changing one shop meant walking the whole elicitation
again. `_fuelShopSave(andGenerate)` split saving from generating.

And **a set-up person's plan is one tap**: `openFuelPlan()` goes straight to the generate when
`_fuelReady()`. The setup is a road *back* ("Change my setup"), not the only road forward.

## 6. Priced, really — ✅ for what the pricer can match

`_fuelLivePrices` web-searches current prices at their stores and writes back a price *and* a shop
per row — including the recipe-sourced ones, which is how the "From your recipes" group dissolves
into real stores once priced.

## 7. The cost of the week is honest — ✅

Both places that set `plan.total` preferred the **model's** own total. At generation that figure
covers only the rows the model itself listed, so every ingredient the merge added — precisely the
food from their own recipes — was excluded from the number they were shown.

`_fuelTotals(plan)` returns `{ sum, unpriced, complete }` and both write sites use it, generation
**after** the merge. The verdict is withheld while the list has holes: **over** budget is certain
(the missing rows can only add), **under** is not, and claiming it is how someone plans a week they
cannot afford. So it reads *"at least $11.70 / $40.00"* in neutral ink, with one line saying what is
missing and that live prices make it real.

## 8. What they cook lands in the diary — ✅

`_fuelLogPlan` wrote the model's four estimated numbers even for a meal that **was** their recipe. It
now logs the recipe's own total at one serving, with its micronutrients, marked "Your recipe" —
summed exactly the way `logRecipeAsMeal` sums it, so the two paths cannot drift. A recipe whose
ingredients carry no numbers keeps the plan's estimate rather than being zeroed: **unknown never
becomes none.**

---

## What is still open, in order of what the loop would gain

1. **Pricing the rows the pricer cannot match** (link 6). Today they stay unpriced and the total says
   so, which is honest but not finished.
2. **The un-weighed ingredient lines** (link 2). "1 tbsp olive oil" and "1 onion" are still the
   model's estimate. Closing this needs a volume-and-count-to-weight table, and the only honest
   version of it shows the person the assumed weight so they can correct it.
3. **The USDA data-type trade-off** (link 2). Measured, not decided: better micros against worse
   names.

## The rule this chain keeps

Every link refuses to invent. An absent nutrient stays absent, an unpriced row shows no price, an
incomplete total says "at least", a page that cannot be read does not become a recipe, and a model
that guesses is not allowed to overwrite something the person actually built. **The loop is only
worth closing if what comes out the other end is true.**
