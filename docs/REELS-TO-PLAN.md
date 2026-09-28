# Recipes from links and reels, feeding the plan and its shopping list

> Status: **captured, being fleshed out.** Nothing here is built. The owner asked for this to be
> specified properly before implementation, after the in-flight instrument work. A research round is
> running; this file holds the idea and the ground truth found so far, so neither is lost.

## The idea, in the owner's words

> "I want fuel plan building to increase its capabilities in the terms of when setting, I want the
> user to be able to also enter links or recipes from reels. I know there is an app that collects such
> recipes from reels and keeps it in one place and maybe we can use that in here to allow for meal
> plan to be created from these ideas people have. Like as much as we can build a plan and have its
> groceries accounted for, the reels-to-recipe apps don't do that and also don't build itself into a
> plan. We have a real gap we can use to make our app ahead in the life tool sense... and more within
> nourish to get closer as a macrofactor, mfp, cronometer replacement than we were at too."

Two asks, deliberately kept apart:
- **(A)** Recipes from links/reels → saved → fed into the **meal plan** and its **shopping list**.
- **(B)** Nourish closer to a MacroFactor / MyFitnessPal / Cronometer replacement.

## Ground truth — what is already built

Checked in the code, not remembered. This repo's most repeated research failure is a backlog
describing things that already exist.

**The recipe system exists** (`src/app/14-nourish.js`): `openRecipeBuilder`, `newRecipe`,
`openPasteRecipe`, `parsePastedRecipe`, `editRecipe`, `renderRecipeIngredients`,
`addRecipeIngredient`, `saveCurrentRecipe`, `deleteRecipe`, `logRecipeAsMeal`. `totry_recipes` is a
synced store. **Paste-a-recipe is TEXT ONLY** — it takes pasted ingredient lines and asks the AI for
per-ingredient macros and a serving count. There is no URL path.

**The planner exists, and so do the groceries** (`src/app/17-fuelplan.js`): meal preferences, diet
chips, `_fuelGenerate` (the AI builds an N-meal day against calorie and protein targets), pre-workout
carb timing, `_fuelRenderPlan`, `_fuelSwapMeal`, `_fuelAddSnack`, a **shopping list routed store by
store** (`_fuelShopGenerate` / `_fuelShopChains`), **live prices** (`_fuelLivePrices`), and
`_fuelLogPlan` which writes the plan into the diary. The owner's "as much as we can build a plan and
have its groceries accounted for" is already true.

## The seam — and it is small

```
grep -c recipe src/app/17-fuelplan.js   →   0
```

**The planner has never heard of the person's saved recipes.** It invents every meal from scratch.
That single fact is the whole opportunity: the collectors stop at collecting, the planners never start
from what the person already chose, and ToTry already owns both ends plus the store routing, the
prices, the diary and the whole-person context the AI reads. The missing piece is the join.

## A safety gap found while looking — fix before anything is added

`test/crisis.js` carries 16 named doors, two of them in Nourish ("the meal describer", "food search
online"). **`openPasteRecipe`'s textarea is a third free-text box that reaches the AI and is not a
door.** CLAUDE.md's rule is explicit: *"When you add a free-text surface, add its door here the same
day."* Every intake path this feature adds — a pasted URL, a pasted caption, a shared payload —
inherits that rule and must land with its door in the same commit.

## The question that decides whether this is buildable

Can a reel actually be read? Instagram, TikTok and YouTube Shorts do not hand captions to an
unauthenticated fetch, and the existing reel-collector apps are reported to use the **iOS share
sheet** rather than a pasted URL. The honest paths, in likely order of yield and durability, are the
share sheet, ordinary recipe sites via schema.org/Recipe JSON-LD, and pasting the caption — which
already works today. Research in flight; the spec will state a verdict per path rather than assume.

## Open

The full spec — intake paths with verdicts, the data model, the planner seam, the doors, the phases,
the soul constraints, and the ranked Nourish parity work — lands here when the research round
finishes and its three refuters have been through it.
