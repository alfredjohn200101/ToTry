---
name: totry-ship-bar
description: The stopping rule for ToTry — what blocks a build and what does not, how many review rounds a release candidate gets, and what a status message to the owner must lead with. Use this skill BEFORE starting any review sweep or audit, WHENEVER a sweep or reviewer returns findings, before deciding to fix something "first", before re-cutting an archive, before adding anything to CLAUDE.md, and whenever asked what is left before the App Store.
---

# The ship bar

## Why this exists

CLAUDE.md said "only the upload click is left" on **10 October 2026**. By 18 November six more
archives were sitting on disk, the ship docs named three others, and the app had still never been
submitted. Nothing was broken in
that time that the live PWA did not already carry. The process had no exit: every sweep finds more
(11, 23, 37, 25 findings — the yield has never fallen off), and every finding became fix → bump →
re-archive → re-verify. A loop whose only exit is "zero findings" does not terminate.

The launch world has a name for this: **Stealth Mode — "procrastination in a fancy suit."** If you
are polishing past the bar, stop and ship.

## 1. What blocks a build — three classes, and nothing else

A finding holds a build back only when **the build itself** is the problem:

1. **Regression** — it is worse than what is already live on the PWA.
2. **Rejection** — Apple will bounce it: a crash or dead core flow, a false statement inside the
   binary (privacy manifest, usage strings, HealthKit data), no working path for the reviewer.
3. **A crisis path that is broken** — a door with no gate, a helpline that cannot be reached or
   dialled, a wrong number, a card that does not render. Rule 6 of CLAUDE.md.

Everything else does **not** block — including a detector phrase that should fire and does not, or
fires and should not, when the live PWA already behaves the same way. Holding the iOS build
protects nobody: those people are using the PWA today. **Fix it on the web the same day and let it
ride the next build.** The honest sentence is "this is live now and fixed on the web tonight", not
"we cannot ship until it is fixed".

When unsure which class a finding is in, compare bundle hashes. If the candidate's sha equals the
live PWA's, class 1 is impossible by construction.

## 2. The review loop is bounded

- **One adversarial sweep per release candidate.** Not one per fix, not one per day.
- Triage every finding into exactly one bucket, and write the bucket down:
  - **BLOCKER** — one of the three classes above. Fix, re-cut.
  - **NEXT** — valid and pre-existing. Web today, next build.
  - **TRADE-OFF** — valid, but fixing costs more than accepting. Name it and its cost. This bucket
    was empty for a month, which is how the loop ran away.
  - **NOISE** — correct under context the reviewer lacked.
- No blocker → **the candidate ships.** Fixes for NEXT items get fault injection and the suite;
  they do not get their own sweep. The next candidate's sweep covers them.
- **Three rounds without convergence is information about the artifact**, not a reason for a fourth.
  Take it to the owner.
- Hand a reviewer the artifact and the contract, never your conclusion. A reviewer given the claim
  returns the claim.

## 3. Fixed time, variable scope

Set the appetite **before** the work: how much time is this build worth? When it runs out, what is
done ships and the rest moves to NEXT. Never extend a cycle to finish — an extended deadline
teaches everyone that deadlines are not real. Name the no-gos at the start.

## 4. Spend verification where it is cheap

- Reproduce a finding by hand with one probe command before any agent is asked to verify it.
- Keep a workflow under about a dozen agents. Two larger ones each lost a third to half of their
  verifiers to a session limit, and an unverified finding then reads as a confirmed one.
- The full browser gate runs **once per candidate**, and "green" means *run against this bundle
  sha*. A previous run is not evidence (see `verification-before-completion`).

## 5. The record does not live in CLAUDE.md

CLAUDE.md measured 3,285 lines and ~76,000 tokens on 18 Nov 2026 and is loaded every session and
again after every compaction. A finding's story goes in the **commit message**. CLAUDE.md earns a
new line only when it changes what somebody does next time, and then it is one or two lines.

## 6. Lead with the owner's next click

Every status message starts with what the owner can do **right now** to move the launch, in one
line. Findings, caveats and what was learned come after. If a message would leave them with
nothing to do but wait, say why in the first sentence.

---

Distilled 18 Nov 2026 from three skills that were read in full and deliberately not installed
verbatim — `wondelai/skills` 37signals-way (fix time, flex scope; the circuit breaker),
`addyosmani/agent-skills` doubt-driven-development (the three-round bound; the trade-off bucket;
artifact and contract, not claim) and `coreyhaines31/marketingskills` launch (the readiness gate).
The installed companions live in `~/.claude/skills/`.
