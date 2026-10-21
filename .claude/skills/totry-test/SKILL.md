---
name: totry-test
description: How to write an assertion in ToTry's test/core.test.js that can actually fail, and how to fault-inject it to prove it. Use this skill whenever adding or changing a check in test/core.test.js, test/crisis.js or test/panels.js, whenever a test goes red on code you believe is correct, and whenever reviewing a guard somebody (including you) wrote recently. A check that cannot fail is worse than no check, and this repo has shipped several.
---

# An assertion you have never seen fail is not yet a test

This gate has 4,400 assertions and has repeatedly been green over real defects. A six-lens review
of checks written three hours earlier found **seven** ways they were weaker than their own
messages. Every one of the shapes below is a real bug that shipped here, usually written by
somebody who had already written the rule down.

## Fault-inject, and inject the right thing

Deleting the call is the one mutation a name-match is guaranteed to catch, so it proves nothing.
**Corrupt the ARGUMENT, or the value, or the order.** The shipped bug behind `tombstoneRevoke` was
that it passed `x.id` where tombstones are keyed `'i'+x.id` — a check greping the call name passed
the whole time.

**Corrupt the text; never delete a line.** Removing a line from a `+` concatenation chain is a
syntax error, so the suite **crashes instead of failing** and you learn nothing. Same for poking a
hole in a negative lookahead: replace the whole `(?!…)` with `(?:)` rather than leaving a dangling
tail.

**Reproduce the DEFECT, not a neutered version of it.** Four injections here neutered bounds with
`(?!)` and made the patterns *more* restrictive, so they stopped firing on everything and reported
"0 of 2 fire again". If the defect is a bare phrase, replace the whole line with the bare form.

**An injection that stays green means the test is not testing what you think.** That is a result,
not an inconvenience.

## Prefer executing to grepping

`H.load(['syncIdOf'])` then asserting `'i222' !== 222` is worth more than any regex over the
source. A grep passes on a wrong argument, a wrong receiver, a template literal, a renamed
function and a comment.

When you must read source:

- **Strip comments first.** The fix's own explanation names the thing it removed, so a presence
  check passes on deleted code and an absence check fails on correct code. Use `H.code()`, and
  `(?<!:)//` if you write your own so `https://` survives.
- **Bracket-match; never slice a fixed window.** A 2600-character slice ran past the end of
  `CRISIS_LINES` into `MEDICAL_LINES` and absorbed a planted wrong number as verified — on the one
  check whose entire subject was a wrong number.
- **Assert your anchor is unique.** An anchor present in two arrays compared an array with itself
  and reported a gap of zero. An ambiguous anchor can relocate a hash window a thousand lines.
- **Scope the window to what decides.** An ordering check that compared `indexOf()` over a whole
  function found a declaration above both branches, so swapping the branches left it green. Anchor
  on the BRANCH. Another isolated a "ladder" with `[\s\S]*?\n  \}` and stopped at the first closing
  brace, which was a different branch entirely.

## Assert the fact, not the phrasing

Tests pinned to copy go red when the copy improves, and this repo has had that three times in a
week — a check about *gentle mode* pinned the caption string `'avg cal/day'` and failed when the
caption was shortened to fit. Ask what the check is *for*. If it is "the numbers-on branch still
prints the average and its arrow", match `stat(… arrow(…), '[^']+')` and let the caption be
anything.

The same trap arrives as **escaping**: a needle spelled `go('grow')` never matches source that
writes `go(\'grow\')` inside a JS string. Match the destination, not the spelling.

## Make sure the check can see the whole subject

- A **whole-bundle union** ("every family drawn somewhere is awaited somewhere") passes with one
  renderer's await deleted outright. Assert **per renderer**, as explicit pairs.
- A **whole-bundle grep** is satisfied by an unrelated legitimate caller — three moderation
  invariants passed because the admin queue uses the same calls. Anchor to the function by name.
- A check on a **function as a whole** passes when the defect is one branch of one object: the
  light branch's literals sat beside the dark branch's two leaks. Assert both branches.
- **Quote style and value shape**: a regex hardcoding `'` misses the same defect written with `"`;
  one requiring a quoted value skips a template literal silently. Count the sites you resolved
  against the sites that exist, so a shape you cannot parse FAILS rather than being skipped.
- **A tautology**: `!hasNet('_notNetted(')` is true for any string at all, including a surface that
  never had the thing.

## Never let a rename abort the run

`H.extractFn` **throws** when a name moves. A block sitting just above `H.report()` turned an
ordinary refactor into a stack trace that hid every other result and read like a syntax error.
Wrap it, and fail a named assertion instead:

```js
let src = '';
try { src = H.code(H.extractFn('theFunction')); } catch (e) { src = ''; }
H.ok(src.length > 200, 'theFunction was found by name — a rename must update this check, not silently drop it');
if (!src) return;   // or guard the rest
```

Related: a stray top-level `return` in `core.test.js` is legal (node wraps the module) and simply
**ends the run at exit 0 with no summary** — nothing says "aborted". Use `H.defer(promise)` for
async sections so their failures are counted rather than skipped.

## Seed what you assert

Nothing in this gate can see a surface its seed never renders. Before adding a check for a card,
confirm the seeded person actually has the data that card needs — otherwise you have written an
assertion about an empty element. See `totry-probe` for seeding from the app's own write sites.

## When you add a free-text field

Anything where a person types a sentence needs a crisis gate, and the gate must sit **above every
validation** — a "pick one first" toast must never be able to outrank a disclosure. Judge each
**field**, never `[a,b,c].join(' ')`: joining destroys the clause end every bounded pattern needs,
and it silenced 42 of 60 real disclosures. Add its door to `npm run crisis` the same day; a gate
nobody drives is a gate that may not run.
