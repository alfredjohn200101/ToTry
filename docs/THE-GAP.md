# The gap between what you planned and what you did

> *"do u see how this as a feature fills a gap that other apps still haven't thought of? do you see
> what else we can do that would benefit people in ways yet to come to light?"*

Yes — and it is not the meal planner. It is the thing the meal planner accidentally produces.

---

## What every other app has half of

| | the plan | the record | the cost | the rest of the person |
|---|---|---|---|---|
| Mealime, Paprika, Whisk | ✅ | — | partial | — |
| MyFitnessPal, Cronometer, MacroFactor | — | ✅ | — | — |
| Instacart, Ocado | — | — | ✅ | — |
| **ToTry** | ✅ | ✅ | ✅ | ✅ |

A planner never finds out what you cooked. A tracker never knew what you meant to cook. A shop knows
what you bought and nothing about whether you ate it.

**So nobody measures the distance between them — because nobody holds both ends.** That distance is
now written on every row this app logs from a plan (`fromPlan`: what it said, beside what you had).
Nothing reads it yet. It cannot be recovered later, which is why it is being written now.

---

## Why the distance is worth more than either half

A plan is what someone believes about their future self. A diary is what happened. The gap between
them is the most honest thing a person owns about themselves, and almost nobody ever sees it.

Two people eat 1,900 calories on Wednesday. One planned 1,900 and ate it. One planned 2,400, skipped
dinner, and had toast at 11pm. **Every tracker on earth records those two as identical.** They are
not remotely the same day, and the difference is the entire story.

---

## What becomes possible, in order of how sure I am

### 1. A planner that learns — high confidence, cheap
Adherence measured **per meal**, not per day. *"You have kept every breakfast for six weeks. You have
never once made the Thursday dinner."*

Then stop planning the Thursday dinner. **No meal planner improves by being used**, because none of
them ever find out. This one would.

*Constraint:* silent until there is enough. Three weeks minimum, and it must say "I don't know yet"
rather than guess — the same rule `detectPlateau` already keeps.

### 2. The cost of what didn't happen — high confidence, medium build
The ask was *"aware of the cost of what's to come"*. The sharper number is the cost of what didn't
come:

> You shopped for seven dinners. You cooked three. The four you didn't: about £18 of food you already
> paid for, and £34 you spent on something else instead.

Nowhere else on earth does a normal person get that arithmetic, because it needs the plan, the
prices, the diary and the spending in one place. **This app has all four.**

*Constraint:* the waste half is an **inference**, not an observation — say so. The takeaway half only
exists if they logged it. A number this pointed must never be stated harder than the evidence behind
it.

### 3. The thread a food app cannot reach — high confidence, cheap, most on-thesis
The app already models `riskWindow` and the fight. So:

> The three dinners you didn't cook were all on nights inside your hard hour.

A nutrition app calls that a discipline problem and is **wrong**. It is the fight wearing different
clothes, and this app is the only one that can see it. *"Cook Thursday's dinner on Wednesday"* is
then real counsel, not a platitude.

This is the single most "only we could do this" item on the list, and both datasets are already local.

### 4. Leftovers — genuinely novel, medium build
A recipe makes four servings. One was logged. **Three exist.** Nobody models the fridge.

> You have three servings of Tuesday's pasta. Want tomorrow's lunch to be that instead of something
> new?

This is the actual mechanism by which meal plans fail: people plan seven dinners, cook three, and the
fridge fills up with the evidence. It cuts cost, cuts waste, and cuts the number of decisions — which
is the real scarce resource at 6pm.

### 5. Plan from what they actually eat — high confidence, cheap
The planner reads targets and saved recipes. It does not read the **diary**.

> You've eaten oats forty of the last fifty mornings. I'm not going to suggest a different breakfast.

A plan built from evidence rather than from a model's idea of a good diet. The data is sitting there.

### 6. The prediction-error profile — speculative, and the biggest idea here
The gap between intention and act is not a food signal. It is a **self-knowledge** signal — and this
app holds it across every front: planned sessions vs trained, planned bedtime vs slept, planned spend
vs spent, planned prayer vs prayed.

> You keep what you plan in the morning. You do not keep what you plan for after 8pm. That is not
> willpower — it is when you are making the promise.

**That is something a common person would never otherwise get.** Not from a coach, not from a
therapist in six sessions, not from any app. It requires someone to hold months of both halves of
your life at once, and nobody does that.

*Constraint, and it is the whole thing:* this must never become a shame instrument. The soul document
is explicit — grace over shame, a lapse is feedback not failure. The framing is **"plan for the
person you actually are"**, never *"you failed four of seven"*. If it cannot be said that way, it
should not be said.

---

## What not to build

- **Streaks on plan-adherence.** That is engagement farming with a nutritional hat on, and this app
  refuses it by name.
- **Auto-logging.** Already corrected: a plan may never become the diary on its own.
- **Waste stated as fact.** We infer it from absence. Absence has other causes.
- **A number that shames.** If the honest version of a finding cannot be said kindly, the finding is
  not ready.

---

## The order I would build it

1. **(3)** the fight↔food thread — cheapest, most on-thesis, and true the first week it has data.
2. **(5)** plan from the diary — no new data needed at all, it is already there.
3. **(1)** the learning planner — needs three weeks of `fromPlan` to accumulate.
4. **(4)** leftovers — needs a fridge model, which is new but small.
5. **(2)** the cost of the gap — needs the spending side to be honest first.
6. **(6)** the prediction-error profile — last, because it is the one that can do harm if the voice
   is wrong, and it should be built when the app has earned the right to say it.

---

## The honest caveat

Every one of these needs `fromPlan` data that starts accumulating **today**. None of them can be
demonstrated on existing data, and I would rather say that than build something that looks clever
against a fixture and says nothing true to a real person in March.

The one thing that was urgent was writing the gap down before it was lost. That is done.
