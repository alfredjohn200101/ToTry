---
name: totry-crisis-door
description: How to add or change any ToTry surface where a person types free text — deciding whether it is a crisis door at all, where the gate goes relative to validation, judging fields rather than the joined string, what of their work survives a hit, and adding the door to npm run crisis the same day. Use this skill whenever adding or editing a textarea, text input, oninput handler, onblur handler, or anything whose typed value is persisted, replayed, sent to a model, or written to a server — and whenever touching detectCrisis, the phrase registers, the safety net, or any existing crisis gate.
---

# Adding a free-text surface

This is the highest-stakes recurring procedure in the repo. Six separate censuses have each found
doors the previous five structurally could not see — 16 → 20 → 35 → 49 → 57 — and the defects were
never exotic. They were a field nobody thought of as a door, a gate in the wrong place, or a gate
that ran and did nothing.

Rule 6 of CLAUDE.md governs everything here: **keep the bridge-to-real-help and crisis paths
intact and prominent, never weaken them.**

## 1. Is it a door? The criterion, not a list

The output of a census is a **criterion**, not a count. The question is what the field's own copy
invites:

> **Does it invite a SENTENCE, or does it name a THING?**

The app answers this itself. `bill-name` says *"e.g. Car rego, electricity, rent"*; `ev-title`
says *"e.g. Work shift, Lecture, Gym, Mass"*. Those are labels. A label is not an invitation.
Against that, `search-input` says *"Try a word, a name, a FEELING…"* and is door 48, while
`pt-ex-search` says *"Search exercises…"* and is a lookup. **A field that names a feeling is a
door; a field that names a thing to look up is not.**

Gating everything would be the blanket sweep this repo fails builds over — a false positive at a
crisis door is not cheap, because a non-null **replaces** the help somebody came for.

Two things make a non-obvious field a door: the text is **persisted and replayed** later, or it
**reaches a model or a server**. A disclosure sitting in a Supabase table answered by nobody is
the sealed-letter shape; so is text that arrives in a notification body when nobody is on screen.

**And ask where the text a surface DISPLAYS comes from, not only what it does with it.** The worst
miss here was a gratitude field that was cleared as "not a door" because the person was writing to
a real human — the app *composes* that message from the field and pre-fills it. A cleared
candidate is more dangerous than a confirmed one, because nothing revisits it.

## 2. The gate goes ABOVE every validation

A validation rule must never be able to outrank a disclosure. This defect has been rebuilt **three
times**, twice in one afternoon by someone who had just written the rule down:

- a 20–400 kg weight band returned before the crisis handler, so a disclosure typed beside a
  fat-fingered weight got a grey toast and no helpline;
- `if(_qlOutcome === null) return` — "Pick one" — above the gate;
- `if(!shops.length) return` — "Pick at least one shop" — above the gate, in a **first-time
  person's** state.

A same-field **empty** check above the gate is safe (a disclosure is non-empty). A *different*
field's guard is a defect. When you add a gate, read the whole function and list every `return`
and `showToast` above it.

## 3. Judge the FIELDS, never the join

```js
const kind = crisisInAny([a, b, c]);   // judges each, returns the first hit
// NOT: detectCrisis([a,b,c].filter(Boolean).join(' '))
```

Every clause-bounded pattern in `detectCrisis` needs a clause end or `$`, and **joining a second
field onto the first destroys that `$`**. Measured: the field alone fires 10 of 10; the join fires
18 of 60. `"i cant go on"` + `"walked the dog"` returned **null**.

This is the exact mirror of the net lesson — *joining a prompt's free-text fields manufactures
false positives no single field produces* — and both say the same thing. A false positive is
visible on screen; **a silenced disclosure is not**, which is why this direction is worse.

## 4. Keep their work, then meet them

A bare `return` on a hit throws away everything they typed with no route back — the
denial-of-service shape. `completeMorning()` states the contract: **their words are always kept,
the app simply stops and carries on no further.**

So collect and persist their *choices* first, then gate. Decide per surface what survives:
the hold and the amount are theirs (they stopped before spending); a prayer stays marked answered;
but where the typed text **is** the data there is nothing to keep beside the sentence. And do not
let the app talk over them — no celebratory toast, no haptic, no "that's the whole move" landing
on top of what they just said.

New doors call `journalMeetCrisis(kind, back, opts)`. Pass `saved:false` when the surface stores
nothing — one door toasted *"Saved · I read what you wrote"* on a surface that keeps nothing.

## 5. Debounced and per-keystroke surfaces

An `oninput` gate judges **every intermediate prefix**, and every innocent completion in this
detector is a **suffix** test — so a suffix nobody has typed yet cannot suppress anything.
Measured at the search door: **19 of 25** ordinary sentences raised a card mid-typing while the
full sentence returns null. "take my life" fires before "and let it be"; "better off dead" before
"deadlifting".

Wait for the typing to stop (500 ms there, under the suite's own waits), and carry a route back.
Same for `onblur`-with-the-value-as-an-argument: that class has no id and no selector on the path,
which is why four censuses were blind to it.

## 6. Add its door to `npm run crisis` the same day

**A gate nobody drives is a gate that may not run.** One gate asked `getElementById` for three ids
that do not exist, so it read `''`, decided "no crisis", and waved every disclosure through — with
the call present and correctly spelled, every id check passing and the suite green. A grep cannot
see a wrong *argument*.

In `test/crisis.js`, add an entry that types the worst sentence into the real field and asserts a
helpline is **visible and tappable by geometry**, not merely present in the DOM. Add an `also`
assertion for what the helpline check cannot see — *did this door STORE the disclosure, or print
it back?* Keep `also` **out** of the helpline if/else chain; wiring it as an `else if` silently
skips the usable-helpline checks. Have `also` read raw `localStorage`, not an app reader that may
scrub on the way past.

Seed the door's precondition the way the **app** writes it. A seed writing `totry_vices` where
`loadV()` reads `totry_v` reported a working gate broken. And when a new door says the app is
broken, drive it by hand before believing it — a probe that cannot reach the code path reports the
same thing as a missing fix.

## 7. Changing the detector or the registers

Read `docs/CRISIS-REGISTERS.md` first — it carries the measured specs and, more importantly, the
**refusals**: phrasings deliberately not matched because their benign and disclosing forms are the
same string, in an app that supplies the benign reading.

- **Never add a bare substring.** Every bound was chosen against a measured ordinary sentence from
  one of this app's own fronts. `'going to hurt'` with no object rendered a police-and-ambulance
  card for *"my quads are going to hurt"*.
- **Assume the app trips its own detector.** It has happened eleven times — a hymn, the Soul tab's
  own idiom, Matthew 18:6, the secular examen's own printed string, the dopamine-detox thesis,
  Lent and Ramadan fasting. Harvest candidates from the app's own copy, per tradition, before
  bounding anything.
- **A superseded pattern does not stop mattering**: the looser one wins. Run every register's
  corpus against the whole tree, not just its own.
- **A suppression silences invisibly.** Over-removal is a lost disclosure and nothing on screen
  shows it happened. An open wildcard eats the next word; a middle window `[^.!?]{0,40}` includes
  the comma and reaches across clauses.
- `detectCrisis` returns a `'+'`-joined **set** in acuity order, so a card can name more than one
  need. Physical acuity leads because minutes matter for an overdose — but `chest pain` and
  `can't breathe` are overwhelmingly panic in this population and must add a route, never lead.

Both directions always: `npm run crisis` asserts that disclosures reach a helpline **and** that
ordinary sentences are left alone. Only the second half catches crying wolf, and it was added
after a DOMS complaint rendered 000, 911 and 999 for months behind 35 green doors.

## 8. AI surfaces

Every surface that puts the person's words in a prompt calls `detectCrisis` and returns before
`api()`. Beyond that floor, free-text AI surfaces carry `_netted()` — a deterministic,
provider-independent net that appends the app's own verified line when the person named a
**reason** and a **plan** and the reply came back with no human in it. Wire it per surface by
name, including the offline, no-Supabase and model-failure paths, which reply with canned strings
naming nobody. Choose the fields **per surface**: a form's three boxes are one message; a
long-lived profile store is not something somebody just typed.
