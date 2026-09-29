# Screen time, and micronutrients from ingredients

> Researched 28–29 Sep 2026, then refuted by three independent reviewers — all three returned
> `refuted: true`, and one of them found a live privacy leak that is now fixed (`f37877b`).
> Nothing else here is built.

## 1. Screen time: you can show it, you can never read it

`DeviceActivityReport` is a SwiftUI view the host app embeds, but the data is rendered by a **separate
extension**, and Apple's documentation says verbatim:

> "To protect the user's privacy, your extension runs in a sandbox. This sandbox prevents your
> extension from making network requests or moving sensitive content outside the extension's address
> space."

On developer forum 818174 an Apple DTS engineer was asked whether the report extension is
intentionally sandboxed so Screen Time data cannot be exported to the containing app, and answered
**"Yes."** App Groups, shared `UserDefaults`, a shared container file, `CFPreferences` — none work on
device.

**So the app can embed Apple's chart (the pixels are Apple's) and can never put those minutes in
`getLifeState()`, in `lifeStateBrief()`, in the brother's voice, or in the cloud.**

**The trap that would have caught us:** the sandbox is **not enforced in the Simulator**. An App Group
write appears to work in testing and silently fails on a real phone — this repo's named failure class,
"the fallback ran instead of the real path and never errored".

### What does work

| Route | Verdict | What it gives |
|---|---|---|
| `DeviceActivityReport` | **Not possible** | A chart. Pixels only. Never a number. |
| `DeviceActivityMonitor` **threshold ladder** | Buildable **with Apple's approval** | The system calls your extension at "30 minutes elapsed". Quantised — *"crossed 30 min at 21:14"*, never *"47 minutes"*. Max **20** activities, 15-minute minimum window, one week maximum. **No history and no backfill**: nothing before the day it is switched on. |
| `ManagedSettings` shielding | Buildable **with Apple's approval** | The app puts its own view in front of a chosen app — the Feeling Door arriving *at* the threshold instead of after it. Same entitlement. |
| **Shortcuts automation** | **Buildable now, no entitlement** | iOS 17 "Is Opened" / "Is Closed" app triggers that Run Immediately, giving real per-app **durations**. Costs: the person builds two automations per app by hand, and the app declares no `CFBundleURLTypes` to receive the callback. |
| The app's **own** session time | **Buildable now, zero permission** | How long a person spends in ToTry, and whether that is falling. The only number that can tell a tool from a feed. |
| Self-report | **Buildable now, zero permission** | The person reads Settings and types it in — the person collecting their own evidence rather than the app surveilling them, which is the owner's own sentence. |

### The entitlement, precisely

`com.apple.developer.family-controls` is a **managed capability**, not a checkbox. Development works
locally without it; **distribution — including TestFlight — does not**, so it cannot quietly ride
along on the next build. It is requested **once per bundle ID, and again per extension target**
(2–4 forms for this app). A solo developer is eligible: `requestAuthorization(for:)` explicitly
supports the individual case, which is ToTry's. Reported turnaround runs four business days to
several months. There is no Screen Time clause in the App Store Review Guidelines — shipping the
frameworks without the entitlement is a 2.5.1 rejection.

### Android is strictly better

`UsageStatsManager` with `PACKAGE_USAGE_STATS` gives **actual per-app foreground milliseconds**, and
there is a maintained Capacitor 8 plugin matching this repo's version. Two traps its own docs name:
`queryAndAggregateUsageStats` sums whole daily buckets that merely intersect the window, so totals
bleed; and on API 30+ the OS returns **nothing while the device is locked**, which arrives as an empty
array that must not be read as zero. Play treats the permission as Restricted — the feature must
appear in the store listing — and `QUERY_ALL_PACKAGES` is restricted harder still.

### What the refuters corrected

1. **It is iOS 15, not 16.** Every API actually recommended — `DeviceActivityMonitor`,
   `DeviceActivityCenter`, `ManagedSettingsStore`, `FamilyActivityPicker`, `eventDidReachThreshold` —
   is iOS 15.0. Only `DeviceActivityReport` (which we are not using) and `requestAuthorization(for:)`
   are 16. `IPHONEOS_DEPLOYMENT_TARGET = 15.0` appears at four sites in `project.pbxproj`; nobody
   should bump it believing the frameworks require it.
2. **Screen time must never sync.** It is a statement about a **device**, not a person, and the app
   already excludes four keys for exactly that reason — `totry_push_prefs`, `totry_lock_on`,
   `totry_health_write`, `totry_progress_photos`. A phone's usage log merged with a laptop PWA's is
   both meaningless and the most surveillant row in the database. And a key added to `SYNC_KEYS` but
   not to `01-sync.js`'s `ARR` list falls to scalar last-write-wins — the shape that has already
   destroyed data here.
3. `totry_usage_log` counts **AI calls, not time**, is dev-only, and is keyed by the broken day key
   (`docs/DAY-KEY.md`). It is not a foundation to build on.

## 2. Micronutrients from a recipe's ingredients: BUILT, 30 Sep 2026

> **What shipped, and where the gap actually was.** The research below said "the gap is one function:
> `parsePastedRecipe`". That was the wrong function. The gap was the **landing** — every writer of an
> ingredient built `{name, cal, pro, carb, fat}` by hand, so even the paths that already HAD micros
> threw them away. The barcode path is the proof: the Open Food Facts parse forty lines above it
> works out fiber, sodium, calcium, iron and vitamin C per 100g, and the push kept four numbers.
>
> `_recipeAddFromFood(food, grams)` is now the one landing, built on the existing `nutPick` — every
> NUTRIENTS key scaled, and an absent nutrient left **absent** rather than becoming a confident zero.
> The barcode path goes through it, and the FOOD SEARCH now can too: `_recipeFromSearch()` arms a
> flag and `addFoodToLog` routes the finished entry into the open recipe instead of the diary, which
> means the recipe inherits the gramsEquiv scaling that fixed the 100x-sodium bug rather than a
> second implementation of it. That matters because the search reaches **USDA**, and USDA is where
> the micros actually are.
>
> Driven end to end, which the research had asserted but not done: two ingredients summed the way
> `logRecipeAsMeal` sums them, at one serving of two, reach the diary carrying fiber, sodium, vit_c,
> calcium, iron, magnesium and zinc — including two only the second ingredient knew.
>
> **Still true and still unbuilt:** `parsePastedRecipe` asks the model for four estimated numbers and
> never touches USDA, and `searchUSDA` still asks for `Foundation,SR Legacy` when SR Legacy and
> Survey (FNDDS) are the ones that resolve 28/28. Both remain worth doing; neither was the thing
> stopping a recipe from carrying a micronutrient.

### The original research, kept because it explains the downstream that made this cheap


The owner asked: *"wouldn't getting the ingredients of that recipe provide the micros and macros?"*

**Yes — and everything downstream is already built.**

- `nutMicroKeys()` (`14-nourish.js:458`) — 19 micros: vitamins A, C, D, E, K, B1, B2, B3, B6, B9,
  B12, calcium, iron, magnesium, phosphorus, potassium, zinc, selenium, copper.
- `NUTRIENTS` (`:3403`) — those 19 plus 9 macro/extended keys. **28 in all.**
- `nutPick(src, mult)` copies the whole set with a multiplier and deliberately keeps an absent
  nutrient **absent** rather than zero — "unknown" must never become "none".
- **`logRecipeAsMeal()` already sums ingredients across the full `NUTRIENTS` list and needs zero
  changes.** The moment an ingredient object carries micros, they land in the diary and the panel.
- The USDA adapter already maps USDA's nutrient names into these keys (`:201` onward) — live today
  for food search.

**The gap is one function:** `parsePastedRecipe` asks the model for four estimated numbers
(`{cal, pro, carb, fat}`) and never touches USDA.

### What the research found about doing it well

- **Data type decides micro coverage.** SR Legacy and Survey (FNDDS) resolved **28/28** of the app's
  nutrient keys; **Foundation** — which `searchUSDA` names first — resolved **3–17/28**, and Branded
  7–12. We are asking for the worst source for micros.
- **The hard part is the parse, not the lookup.** "1 tbsp olive oil" → a food id *and* a gram weight.
  A wrong match is worse than no match. This is exactly the repo's own rule: the model does the fuzzy
  matching, deterministic code does the numbers.
- An auditor reported the top "chicken breast" result returning 0 cal / 0 P / 0 C / 0 F, one `+` tap
  from the diary. **Unverified** — DEMO_KEY returned HTTP 429, which that code's own comment warns
  about. Needs reproducing against a real key before it is treated as a bug.

### The leak this work would have opened — fixed first

`applyNutGentle`'s HIDE list did not contain `micro-panel` or `micro-panel-toggle`, and in the markup
they are **siblings** of `nut-extended` rather than children, so hiding the parent never reached them.
"Numbers off" left nineteen rows of milligrams and four red "max" bars one tap away — for the person
`_renderNourishCare` routes to the Butterfly Foundation two cards above. Dormant only because
`_microKnown` stays false until a row carries a micronutrient, **which is precisely what the resolver
would change.** Fixed in `f37877b`, with the reason pinned in the test so the two ids are not deleted
by someone who believes the parent covers them.
